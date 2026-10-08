#!/usr/bin/env bash
######################################################################
# .what = the HARDNUDGE mechanism shared by the forbid-terms hooks
#
# .why  = the blocklist and gerunds hooks hold the same payload read,
#         the same nudge-record window, and the same stamp. two copies
#         drift: a fix landed in one stays absent from the other. one
#         sourced lib makes each fix land once.
#
# .how  = a hook sources this file, then calls:
#           set_hardnudge_payload            # sets TOOL_NAME FILE_PATH CONTENT
#           run_hardnudge_gate nudge_name=<name> -- <terms...>
#
# guarantee:
#   - a payload jq cannot parse blocks, loud (exit 2)
#   - a first attempt is stamped and the caller blocks
#   - a retry within the window exits 0 (permit)
#   - a clock that stepped back counts as outside the window (block)
#   - the nudge record read-modify-write holds a lock, taken over only
#     from a dead holder, so two live hooks cannot drop each other's stamp
#   - a lost stamp warns on stderr with its cause; the verdict stays a block
#
# .note = sourced, never run. it sets no shell options; the hook owns
#         `set -euo pipefail` and its fail-closed EXIT trap.
######################################################################

HARDNUDGE_WINDOW_SECONDS=300  # 5 minutes
HARDNUDGE_STALE_SECONDS=3600  # 1 hour
HARDNUDGE_LOCK_TRIES=40       # × 0.05s = ~2s wait on a LIVE holder; the hook timeout is 10s
HARDNUDGE_NOPID_TRIES=20      # × 0.05s = ~1s with no holder pid = the holder died pre-mark

######################################################################
# .what = read the PreToolUse payload of a Write or Edit
# .why  = both hooks scan the same field of the same two tools
#
# sets: STDIN_INPUT TOOL_NAME FILE_PATH CONTENT
# exits: 2 on empty stdin or a payload jq cannot parse · 0 when the tool is not
#        Write/Edit, or the content is empty
######################################################################
set_hardnudge_payload() {
  STDIN_INPUT=$(cat)

  # failfast: if no input, error
  if [[ -z "$STDIN_INPUT" ]]; then
    {
      echo "✋ ConstraintError: PreToolUse hook received no input via stdin"
      echo "  why: claude code pipes {tool_name, tool_input} as json on stdin"
      echo "  fix: pipe a payload, e.g."
      echo "       echo '{\"tool_name\":\"Write\",\"tool_input\":{\"content\":\"…\"}}' | $0"
    } >&2
    exit 2
  fi

  # tool name and file path in ONE jq pass; a payload jq cannot parse blocks, loud
  # .why = a parse failure once left TOOL_NAME empty, so the tool gate below exited 0 —
  #        a permit on input the hook never read. check-permissions blocks the same way
  # .note = -j drops the final newline, so a tab split yields exact values
  local payload_fields
  if ! payload_fields=$(echo "$STDIN_INPUT" | jq -rj '[(.tool_name // ""), (.tool_input.file_path // "")] | @tsv' 2>&1); then
    echo "💥 MalfunctionError: PreToolUse payload is not valid json (${payload_fields%%$'\n'*}); the write stays blocked" >&2
    exit 2
  fi
  IFS=$'\t' read -r TOOL_NAME FILE_PATH <<< "$payload_fields" || true

  # skip if not Write or Edit
  if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
    exit 0
  fi

  # content to scan: an Edit is scanned on new_string only, so a term REMOVED never blocks
  # .why = content holds tabs and newlines, so it cannot ride the tsv above
  # .note = the payload parsed above, so this read cannot fail on parse; any other failure
  #         exits under `set -e`, and the hook's EXIT trap turns it into a loud exit 2
  local content_field='.tool_input.content'
  [[ "$TOOL_NAME" == "Edit" ]] && content_field='.tool_input.new_string'
  CONTENT=$(echo "$STDIN_INPUT" | jq -r "$content_field // empty")

  # skip if no content
  if [[ -z "$CONTENT" ]]; then
    exit 0
  fi
}

######################################################################
# .what = the nearest .claude dir at or above $PWD
# .note = ${dir%/*} strips one segment in-shell, at zero forks. the walk stops at "/",
#         so "/.claude" is never consulted; ${dir%/*} yields "" where dirname yields "/".
######################################################################
get_claude_dir() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -d "$dir/.claude" ]]; then
      echo "$dir/.claude"
      return 0
    fi
    dir="${dir%/*}"
    [[ -z "$dir" ]] && dir="/"
  done
  return 1
}

######################################################################
# .what = run one command; on failure set HARDNUDGE_ERR to the first line of its stderr
# .why  = every lock and file operation names its cause through this ONE capture site.
#         each `$( )` is a fork the fork budget holds (forkbudget `[case7]`), so the lib
#         pays for its causes once, not once per operation
# .note = stdout goes to $HARDNUDGE_OUT when set (a `VAR=… try_hardnudge_op …` prefix),
#         else it is dropped
######################################################################
try_hardnudge_op() {
  local out=""
  out=$("$@" 2>&1 >"${HARDNUDGE_OUT:-/dev/null}") && return 0
  HARDNUDGE_ERR="${out%%$'\n'*}"
  return 1
}

######################################################################
# .what = write `{}` to a path that must not exist yet (noclobber)
# .note = run through `try_hardnudge_op`, so it runs in that runner's `$( )`: the noclobber
#         stays inside it, and the create costs no exec
######################################################################
gen_hardnudge_empty_record() {
  set -o noclobber
  echo '{}' > "$1"
}

######################################################################
# .what = create the nudge record as `{}` when absent; sets HARDNUDGE_CAUSE when it cannot
# .note = named arg `file=`. noclobber makes the create atomic: two hooks that race to create
#         it cannot erase each other. "already there" (made by a racer) is the one benign
#         failure; the same shape as check-permissions' `gen_attempt_record`
######################################################################
set_hardnudge_record_file() {
  local file="${1#file=}"
  [[ -f "$file" ]] && return 0
  try_hardnudge_op gen_hardnudge_empty_record "$file" && return 0
  [[ -f "$file" ]] && return 0
  HARDNUDGE_CAUSE="the nudge record could not be created ($HARDNUDGE_ERR)"
  HARDNUDGE_FIX="make the dir that holds '$file' writable"
  return 0
}

######################################################################
# .what = the record key for a file path
# .note = named arg `path=`; sets the global HARDNUDGE_KEY
######################################################################
set_hardnudge_key() {
  local path="${1#path=}"
  HARDNUDGE_KEY=$(echo -n "$path" | sha256sum)
  HARDNUDGE_KEY="${HARDNUDGE_KEY%% *}"
  return 0
}

######################################################################
# .what = the last attempt stamped for a key, or 0 when there is none
# .note = named args `file=` `key=`; sets HARDNUDGE_LAST_ATTEMPT, and HARDNUDGE_CAUSE when
#         the record cannot be read. an unreadable record counts as no attempt (the gate
#         blocks), and its cause is named in the warn
######################################################################
set_hardnudge_last_attempt() {
  local file="" key=""
  local "$@"
  local read_out=""
  HARDNUDGE_LAST_ATTEMPT=0
  # .note = a cause already named (the dir or the file could not be made) is the truer one
  read_out=$(jq -r --arg key "$key" '.[$key].time // 0' "$file" 2>&1) \
    || HARDNUDGE_CAUSE="${HARDNUDGE_CAUSE:-the nudge record is unreadable (${read_out%%$'\n'*})}"
  [[ "$read_out" =~ ^[0-9]+$ ]] && HARDNUDGE_LAST_ATTEMPT=$read_out
  return 0
}

######################################################################
# .what = is this attempt a deliberate retry, inside the window?
# .note = named args `now=` `last=`. a NEGATIVE elapsed means the wall clock stepped
#         back (ntp, `date -s`, a snapshot restore). it is no proof of a recent attempt,
#         so it counts as outside the window
######################################################################
is_hardnudge_retry() {
  local now="" last=""
  local "$@"
  local elapsed=$(( now - last ))
  [[ $elapsed -lt 0 ]] && return 1
  [[ $elapsed -lt $HARDNUDGE_WINDOW_SECONDS ]]
}

######################################################################
# .what = take the nudge record lock; returns 1 with HARDNUDGE_CAUSE and HARDNUDGE_FIX
#         set when it cannot
# .why  = parallel tool calls fire one hook several times at once. an unlocked
#         read-modify-write lets the later `mv` erase the earlier stamp, and that
#         path's retry then re-blocks.
# .how  = mkdir is atomic. the holder writes its pid into the lock. a waiter takes the
#         lock over only when that pid is gone (`kill -0`), or when no pid appears for
#         ~1s (a holder that died between mkdir and its pid write). a wait time alone
#         never proves a holder dead. a lock dir that cannot be made at all (read-only
#         fs, permissions) is named at once, never waited on. the same shape as
#         check-permissions' `set_attempt_record`
# .note = named arg `lock_dir=`
######################################################################
set_hardnudge_lock() {
  local lock_dir="${1#lock_dir=}"
  local tries=0 nopid=0 nodir=0 holder="" holder_now=""

  # take the lock: wait out a live holder, take over a dead one, name any other failure
  until try_hardnudge_op mkdir "$lock_dir"; do
    tries=$(( tries + 1 ))

    # no lock dir after a failed mkdir: a holder released in between (retry at once), or
    # mkdir cannot work here at all, which repeats — so name it after ten straight tries
    if [[ ! -d "$lock_dir" ]]; then
      nodir=$(( nodir + 1 ))
      [[ $nodir -lt 10 ]] && continue
      HARDNUDGE_CAUSE="the lock could not be made ($HARDNUDGE_ERR)"
      HARDNUDGE_FIX="make the dir that holds '$lock_dir' writable"
      return 1
    fi
    nodir=0

    # a live holder that outlasts the wait: give up the stamp, keep the block
    if [[ $tries -gt $HARDNUDGE_LOCK_TRIES ]]; then
      HARDNUDGE_CAUSE="its lock stayed held by a live hook past the wait"
      HARDNUDGE_FIX="retry once the other write lands"
      return 1
    fi

    # take over a lock whose holder is gone
    # .note = the pid file is absent between a holder's mkdir and its mark, and after its
    #         release; both read as no holder, which is the one allowlisted read failure
    holder=""
    { read -r holder < "$lock_dir/pid"; } 2>/dev/null || holder=""
    if [[ -n "$holder" ]] && ! kill -0 "$holder" 2>/dev/null; then
      # re-read: a holder that released normally removed its pid; only the same dead pid,
      # still in place, marks an orphaned lock
      holder_now=""
      { read -r holder_now < "$lock_dir/pid"; } 2>/dev/null || holder_now=""
      [[ "$holder_now" == "$holder" ]] && { set_hardnudge_lock_takeover lock_dir="$lock_dir" || return 1; }
      continue
    fi

    # no pid for ~1s straight = the holder died between mkdir and its pid write
    nopid=$(( nopid + 1 ))
    [[ -n "$holder" ]] && nopid=0
    if [[ $nopid -ge $HARDNUDGE_NOPID_TRIES ]]; then
      set_hardnudge_lock_takeover lock_dir="$lock_dir" || return 1
      nopid=0
      continue
    fi
    sleep 0.05
  done

  # mark the lock with this holder's pid
  # .note = the one benign failure: a take-over removed this lock between mkdir and here;
  #         the record write then runs unlocked (one lost stamp at worst). a redirect is a
  #         shell act, not a command, so it names its cause by the path it could not write
  if ! { echo "$$" > "$lock_dir/pid"; } 2>/dev/null && [[ -d "$lock_dir" ]]; then
    HARDNUDGE_CAUSE="the lock could not be marked ($lock_dir/pid is not writable)"
    HARDNUDGE_FIX="make the dir that holds '$lock_dir' writable"
  fi
  return 0
}

######################################################################
# .what = remove an orphaned lock dir, so the wait loop takes the lock on its next mkdir
# .note = named arg `lock_dir=`. two failures are a lost race and benign: the dir is
#         already gone, or a fresh holder made it again and marked its pid. any other
#         failure sets HARDNUDGE_CAUSE and returns 1
######################################################################
set_hardnudge_lock_takeover() {
  local lock_dir="${1#lock_dir=}"
  rm -f "$lock_dir/pid"
  try_hardnudge_op rmdir "$lock_dir" && return 0
  [[ ! -d "$lock_dir" ]] && return 0
  [[ -e "$lock_dir/pid" ]] && return 0
  HARDNUDGE_CAUSE="an orphaned lock could not be taken over ($HARDNUDGE_ERR)"
  HARDNUDGE_FIX="rm -r '$lock_dir'  — a local lock; it regenerates"
  return 1
}

######################################################################
# .what = sweep stale records and stamp this attempt, in ONE jq pass
# .note = named args `file=` `key=` `now=`, then `--` and the terms. sets HARDNUDGE_CAUSE
#         and HARDNUDGE_FIX on failure, with the first line jq or mv wrote
# .note = a record old enough to sweep was already outside the window, so the sweep
#         changes no verdict
######################################################################
set_hardnudge_stamp() {
  local file="" key="" now=""
  while [[ $# -gt 0 && "$1" != "--" ]]; do local "$1"; shift; done
  [[ "${1:-}" == "--" ]] && shift
  local tmp_file="$file.tmp.$$"

  # merge into a temp file beside the record, so the `mv` stays on one filesystem
  # .note = each step runs through the one capture site; a failure names its own cause
  if HARDNUDGE_OUT="$tmp_file" try_hardnudge_op jq --arg key "$key" --argjson now "$now" \
      --argjson threshold "$HARDNUDGE_STALE_SECONDS" --arg path "$FILE_PATH" \
      'to_entries | map(select(.value.time > ($now - $threshold))) | from_entries
       | . + {($key): {time: $now, path: $path, terms: $ARGS.positional}}' \
      "$file" --args "$@" \
    && try_hardnudge_op mv "$tmp_file" "$file"; then
    return 0
  fi

  # a lost write: drop the temp file, name the cause
  # .note = the drop is best effort: the cause that matters is the write's, named below
  rm -f "$tmp_file" 2>/dev/null || true
  HARDNUDGE_CAUSE="the nudge record could not be written ($HARDNUDGE_ERR)"
  HARDNUDGE_FIX="rm '$file'  — it is a local cache and regenerates"
  return 1
}

######################################################################
# .what = the HARDNUDGE window: permit a retry, or stamp a first attempt
#
# usage: run_hardnudge_gate nudge_name=terms.blocklist -- "${TERMS[@]}"
#
# exits: 0 when this path was stamped within the window (a deliberate retry)
# returns: 0 on a first attempt — the caller then renders its block and exits 2
# sets: WARNED=1 when a warn already closed stderr with a blank line
#
# 🔴 .note = every write is guarded (a named cause, or an `if` condition). under
#            `set -e` an unguarded failure exits non-2, and claude code reads a non-2
#            PreToolUse exit as NOT BLOCKED. the hook's EXIT trap turns a crash into
#            exit 2 as the backstop, but these guards keep the block message.
######################################################################
run_hardnudge_gate() {
  local nudge_name=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      nudge_name=*) nudge_name="${1#nudge_name=}"; shift ;;
      --) shift; break ;;
      *) break ;;
    esac
  done
  local terms=("$@")
  HARDNUDGE_CAUSE=""
  HARDNUDGE_FIX=""
  HARDNUDGE_ERR=""
  HARDNUDGE_LAST_ATTEMPT=0

  # locate the nudge file; create its dir and the file when absent
  # .note = only "already there" is benign; any other failure (a read-only fs, no space, no
  #         permission) is named as the cause, so the warn never blames the record for a dir
  #         that could not be made. an unwritable state dir costs the RETRY, never the gate
  local claude_dir
  claude_dir=$(get_claude_dir) || {
    claude_dir="$PWD/.claude"
    try_hardnudge_op mkdir -p "$claude_dir" \
      || HARDNUDGE_CAUSE="the state dir could not be made ($HARDNUDGE_ERR)"
  }
  local nudge_file="$claude_dir/${nudge_name}.nudges.local.json"
  local lock_dir="$nudge_file.lock"
  [[ -z "$HARDNUDGE_CAUSE" ]] && set_hardnudge_record_file file="$nudge_file"

  # this attempt: its key, its time, and the last attempt on record
  # .note = `printf -v … '%(%s)T'` reads the clock as a bash builtin, at zero forks
  local now
  printf -v now '%(%s)T' -1
  set_hardnudge_key path="$FILE_PATH"
  set_hardnudge_last_attempt file="$nudge_file" key="$HARDNUDGE_KEY"

  # a deliberate retry within the window permits
  # .note = a retry only reads, so it never pays for the lock
  is_hardnudge_retry now="$now" last="$HARDNUDGE_LAST_ATTEMPT" && exit 0

  # stamp this first attempt under the lock; a cause already named skips the write
  local locked=false
  [[ -z "$HARDNUDGE_CAUSE" ]] && set_hardnudge_lock lock_dir="$lock_dir" && locked=true
  [[ -z "$HARDNUDGE_CAUSE" ]] && { set_hardnudge_stamp file="$nudge_file" key="$HARDNUDGE_KEY" now="$now" -- "${terms[@]}" || true; }

  # release the lock: its pid, then its dir. a release whose dir is gone is benign
  if [[ "$locked" == "true" ]] \
    && ! { rm -f "$lock_dir/pid" && try_hardnudge_op rmdir "$lock_dir"; } \
    && [[ -d "$lock_dir" ]] && [[ -z "$HARDNUDGE_CAUSE" ]]; then
    HARDNUDGE_CAUSE="the lock could not be released ($HARDNUDGE_ERR); the next hook takes it over"
    HARDNUDGE_FIX="none needed — the next hook takes the lock over"
  fi

  # a lost stamp: name the cause; the block holds either way
  # .note = the corrupt-record fix stays `rm`, not `rhx rmsafe`: the walk may land on a
  #         .claude above the repo (e.g. ~/.claude), where rmsafe refuses
  [[ -z "$HARDNUDGE_CAUSE" ]] && return 0
  [[ -z "$HARDNUDGE_FIX" ]] && HARDNUDGE_FIX="rm '$nudge_file'  — it is a local cache and regenerates"
  {
    echo "💥 MalfunctionError: HARDNUDGE record NOT saved — could not update the nudge file"
    echo "    file:   $nudge_file"
    echo "    why:    $HARDNUDGE_CAUSE"
    echo "    effect: a deliberate retry will RE-BLOCK instead of pass"
    echo "    fix:    $HARDNUDGE_FIX"
    echo ""
  } >&2
  WARNED=1
  return 0
}
