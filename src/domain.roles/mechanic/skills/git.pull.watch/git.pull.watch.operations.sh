#!/usr/bin/env bash
######################################################################
# .what = shared operations for git.pull.watch: key, state paths, lock,
#         pid probe, watch records, ledger, and the daemon findsert
#
# .why  = the verbs, git.commit.push, the boot hook, and the daemon itself
#         read one key and one state layout. each is held once here, so
#         they cannot drift apart
#
# usage:
#   source "$SKILL_DIR/git.pull.watch.operations.sh"
#
# guarantee:
#   - sources naught; the daemon's own copy (v=$key/bin/) needs only its peers
#   - every record write lands via a temp file + mv, so a reader never sees half
#   - every probe of a pid checks its command line, so a stranger is never killed
######################################################################

WATCH_SKILL_DIR="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# the tick interval; a test sets it low
WATCH_TICK_SECONDS="${GIT_PULL_WATCH_TICK_SECONDS:-60}"

# an outage this long earns one note to each watcher; a test sets it low
WATCH_UNREACHABLE_NOTE_SECONDS="${GIT_PULL_WATCH_UNREACHABLE_NOTE_SECONDS:-1800}"

# a spawned daemon has this long to boot and claim its pid record; a loaded box
# that sources three files and shells out to jq stays well inside it
WATCH_BOOT_SECONDS="${GIT_PULL_WATCH_BOOT_SECONDS:-20}"

# a TERM'd daemon has this long to finish its current write before a KILL
WATCH_TERM_GRACE_SECONDS=5

# a lock held longer than this is reaped: the longest real hold (a wedged daemon's
# TERM grace, then a spawn) sits well inside it; a test sets it low
WATCH_LOCK_HOLD_MAX_SECONDS="${GIT_PULL_WATCH_LOCK_HOLD_MAX_SECONDS:-20}"

# the longest a take waits on a live lock before it gives up; well inside the
# hold bound, so a waiter never outlasts a live hold and reaps it
WATCH_LOCK_WAIT_SECONDS=10

# a daemon whose heartbeat is older than this many ticks (plus one minute of
# slack for a slow tick) reads as wedged
WATCH_WEDGED_TICKS=3

# the file name every daemon runs as; the pid probe reads it in the command line
WATCH_DAEMON_FILE="git.pull.watch.daemon.sh"

######################################################################
# output leaves
######################################################################

# .what = print the turtle header and the tree root
# .why  = one shape across the family, as the peer skills print it
print_watch_header() {
  local phrase="$1" root="$2"
  echo "🐢 $phrase"
  echo ""
  echo "🐚 $root"
}

# .what = emit a block to stdout AND stderr
# .why  = a refusal must land on both streams (rule.require.skill-output-streams)
emit_watch_both() {
  echo "$1"
  echo "$1" >&2
}

# the caller's --output; a refusal speaks it too
WATCH_OUTPUT="tree"

# .what = in json mode, print one error object to stdout and the tree to stderr
# .why  = a composer (git.commit.push) parses stdout; a human reads stderr
emit_watch_refusal() {
  local class="$1" message="$2" block="$3"
  shift 3
  if [[ "$WATCH_OUTPUT" == "json" ]]; then
    jq -n --arg class "$class" --arg message "$message" '{ error: { class: $class, message: $message, lines: $ARGS.positional } }' \
      --args "$@"
    echo "$block" >&2
    return 0
  fi
  emit_watch_both "$block"
}

# .what = print a coconut block: a label that owns the moves a human can paste
# .why  = one shape for every recovery path, as git.pull.comment prints it
#         (rule.require.coconut-hints); two or more moves name the choice
# usage: print_watch_coconut <label> <move> [move...]
print_watch_coconut() {
  local label="$1"
  shift
  local i=0 move
  [[ $# -gt 1 ]] && label="$label, pick one"
  echo ""
  echo "🥥 did you know?"
  echo "   └─ $label"
  for move in "$@"; do
    i=$((i + 1))
    [[ $i -lt $# ]] && echo "      ├─ $move"
    [[ $i -eq $# ]] && echo "      └─ $move"
  done
  return 0
}

# .what = refuse with a ConstraintError tree, both streams, exit 2
# .why  = a caller-fixable refusal names its fix, so the next move is a paste
# usage: fail_watch_constraint <skill> <message> [fix...]
fail_watch_constraint() {
  local skill="$1" message="$2"
  shift 2
  local block
  block="$(
    print_watch_header "bummer dude..." "$skill"
    echo "   └─ ✋ ConstraintError: $message"
    [[ $# -eq 0 ]] || print_watch_coconut "to fix it" "$@"
  )"
  emit_watch_refusal ConstraintError "$message" "$block" "$@"
  exit 2
}

# .what = refuse a value flag that ends the call or swallows a peer flag
# .why  = a bare `shift 2` crashes raw at exit 1; a caller slip must read as a
#         ConstraintError at exit 2 that names the flag
# .note = runs in the caller's shell (never in $(...)), so its exit ends the verb
# usage: check_watch_flag_value <skill> "$@" — call with the args from the flag on
check_watch_flag_value() {
  local skill="$1"
  shift
  [[ $# -ge 2 && "$2" != --* ]] || fail_watch_constraint "$skill" "$1 needs a value" "rhx $skill --help"
  return 0
}

# .what = refuse with a MalfunctionError tree, both streams, exit 1
# .why  = a system fault names where to look; exit 1 tells a caller a retry may help
# usage: fail_watch_malfunction <skill> <message> [detail...] [-- fix...]
# .note = details (cause, path) nest under the error; fixes render as a coconut block
fail_watch_malfunction() {
  local skill="$1" message="$2"
  shift 2
  local details=() fixes=() one seen=false
  for one in "$@"; do
    [[ "$one" == "--" ]] && { seen=true; continue; }
    [[ "$seen" == true ]] && fixes+=("$one")
    [[ "$seen" == true ]] || details+=("$one")
  done
  local block
  block="$(
    print_watch_header "bummer dude..." "$skill"
    echo "   └─ 💥 MalfunctionError: $message"
    local i=0 n=${#details[@]} detail
    for detail in "${details[@]+"${details[@]}"}"; do
      i=$((i + 1))
      [[ $i -lt $n ]] && echo "      ├─ $detail"
      [[ $i -eq $n ]] && echo "      └─ $detail"
    done
    [[ ${#fixes[@]} -eq 0 ]] || print_watch_coconut "to fix it" "${fixes[@]}"
  )"
  emit_watch_refusal MalfunctionError "$message" "$block" "${details[@]+"${details[@]}"}" "${fixes[@]+"${fixes[@]}"}"
  exit 1
}

# .what = whole minutes, rounded up, of a span in seconds
# .why  = a note that says "30 min" for 1801s must never read as less than the span
as_watch_minutes_ceil() {
  echo $(( ($1 + 59) / 60 ))
}

# .what = the physical path of a dir: symlinks resolved
# .why  = `clone say` reads the registry at the realpath of its cwd (R1)
as_watch_real_dir() {
  (cd -P "$1" && pwd)
}

######################################################################
# time
######################################################################

# .what = the current unix epoch, in seconds
get_watch_epoch_now() {
  date +%s
}

# .what = the current instant as an iso timestamp, utc
get_watch_iso_now() {
  date -u +%Y-%m-%dT%H:%M:%SZ
}

# .what = run a command, killed after n seconds; exit 124 on the bound, as gnu timeout
# .why  = gnu timeout is absent on macos; a bound that silently fails to run would
#         leave the daemon blind, so the fallback is a plain bash watchdog
# .note = a caller may name a hook in WATCH_ON_BOUND_DONE; it runs after every
#         bound returns, rc kept. the daemon sets it to its heartbeat, so its
#         wedged bound reads "no bound returned in time", with no touch to forget
# usage: run_watch_bounded <seconds> <cmd> [arg...]
run_watch_bounded() {
  local rc=0
  run_watch_bounded_bare "$@" || rc=$?
  [[ -n "${WATCH_ON_BOUND_DONE:-}" ]] && { "$WATCH_ON_BOUND_DONE" || true; }
  return $rc
}

# .what = the bound itself, with no hook
run_watch_bounded_bare() {
  local seconds="$1"
  shift
  command -v timeout >/dev/null 2>&1 && { timeout "$seconds" "$@"; return $?; }
  local pid watchdog fired rc=0
  # .note = the watchdog marks its own kill in `fired`, so a command that some
  #         other hand sent a TERM keeps its 143 and never reads as a stall
  fired="$(mktemp)"
  rm -f "$fired"
  # .note = `<&0` names the caller's stdin for the job outright, so a piped
  #         `clone say --what @stdin` arrives whole under any shell's rule for
  #         the stdin of a background job
  "$@" <&0 &
  pid=$!
  # .note = the watchdog holds no stdio, and takes its sleep down when stopped; else
  #         its orphan sleep would hold a caller's `$(...)` pipe open to the bound
  (
    nap=""
    trap '[[ -n "$nap" ]] && kill "$nap" 2>/dev/null; exit 0' TERM
    sleep "$seconds" &
    nap=$!
    wait "$nap" && { touch "$fired"; kill "$pid" 2>/dev/null; }
  ) </dev/null >/dev/null 2>&1 &
  watchdog=$!
  wait "$pid" || rc=$?
  kill "$watchdog" 2>/dev/null || true
  [[ $rc -eq 143 && -f "$fired" ]] && rc=124
  rm -f "$fired"
  return $rc
}

######################################################################
# the key: version + code hash
######################################################################

# .what = the version of the rhachet-roles-ehmpathy install that holds this skill
# .why  = one daemon per machine per version; the version is the package's own
# .note = walks up from the skill dir, realpath first, to the package.json that
#         names rhachet-roles-ehmpathy; empty when none is found
get_watch_version() {
  local dir="$WATCH_SKILL_DIR" name
  while [[ "$dir" != "/" && -n "$dir" ]]; do
    if [[ -f "$dir/package.json" ]]; then
      name="$(jq -r '.name // ""' "$dir/package.json" 2>/dev/null || echo "")"
      if [[ "$name" == "rhachet-roles-ehmpathy" ]]; then
        jq -r '.version // ""' "$dir/package.json"
        return 0
      fi
    fi
    dir="$(dirname "$dir")"
  done
  echo ""
}

# .what = sha256 of stdin, as hex
# .why  = linux ships sha256sum, macos ships shasum; either serves
as_watch_sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum | cut -d' ' -f1
    return 0
  fi
  shasum -a 256 | cut -d' ' -f1
}

# .what = the first 8 hex of sha256 over this skill's *.sh, sorted by name
# .why  = a dev worktree keeps one version across builds; the hash splits a
#         daemon only where the daemon code itself differs (Q8)
get_watch_code_hash() {
  local file
  for file in $(cd "$WATCH_SKILL_DIR" && printf '%s\n' *.sh | LC_ALL=C sort); do
    cat "$WATCH_SKILL_DIR/$file"
  done | as_watch_sha256 | cut -c1-8
}

# .what = the daemon key: $version+$hash
get_watch_key() {
  local version
  version="$(get_watch_version)"
  [[ -n "$version" ]] || version="0.0.0"
  echo "$version+$(get_watch_code_hash)"
}

######################################################################
# state paths
######################################################################

# .what = the machine-wide state root of this skill
get_watch_state_root() {
  echo "$HOME/.rhachet/storage/repo=ehmpathy/role=mechanic/skill=git.pull.watch"
}

# .what = the state dir of one key
get_watch_key_dir() {
  local key="$1"
  echo "$(get_watch_state_root)/v=$key"
}

# .what = the ledger file of one clone: ids of comments it posted
# .why  = key-free, so an upgrade keeps the ledger (F8)
get_watch_ledger_file() {
  local serial="$1"
  echo "$(get_watch_state_root)/ledger/clone=$serial.ids"
}

# .what = note one comment id in a clone's ledger
# .why  = the daemon skips every id in the ledger, so a clone is never alerted
#         of its own words (F5). git.pull.comment writes through this one
#         operation, so the writer and the reader can never disagree on the path
# returns: 0 on write, or when the id is already there; 1 with the cause on stdout
# .note = the ledger is a set: an edit of a keyed comment lands the same id
#         again, and finds it there, so a re-run never grows the file
set_watch_ledger_id() {
  local serial="$1" id="$2" file err
  file="$(get_watch_ledger_file "$serial")"
  grep -qxF "$id" "$file" 2>/dev/null && return 0
  err="$( { mkdir -p "$(dirname "$file")" && printf '%s\n' "$id" >>"$file"; } 2>&1 )" && return 0
  printf '%s' "${err:-the append to $file failed}"
  return 1
}

# .what = the ledger ids of one clone, as a json array
# .why  = the diff skips these ids, so a clone is never alerted of its own words (F5);
#         the reader sits beside its writer, so the one-id-per-line shape has one home
# returns: 0 = ids printed (`[]` when absent or empty) · 1 = the ledger is unreadable
# .note = grep exits 1 on a ledger with no ids; that is an empty ledger, not a fault
get_watch_ledger_json() {
  local serial="$1" file ids rc=0
  file="$(get_watch_ledger_file "$serial")"
  [[ -f "$file" ]] || { echo '[]'; return 0; }
  ids="$(grep -E '^[0-9]+$' "$file")" || rc=$?
  [[ $rc -le 1 ]] || return 1
  printf '%s' "$ids" | jq -R -s 'split("\n") | map(select(length > 0) | tonumber)'
}

# .what = the ledger ids of every clone on the box, as one json array
# .why  = a comment is labeled `(clone)` only on proof: its id sits in some
#         clone's ledger, or its author wrote one that does. a 🐢 alone is text
#         any stranger can type, so it never earns the peer label on its own
# .note = an unreadable ledger is skipped: fewer proofs label fewer peers, the
#         safe side, since a peer read as `human` costs a closer read, no more
get_all_watch_ledger_peer_json() {
  local dir file
  dir="$(get_watch_state_root)/ledger"
  {
    for file in "$dir"/clone=*.ids; do
      [[ -f "$file" ]] && grep -hE '^[0-9]+$' "$file" 2>/dev/null
    done
    true
  } | jq -R -s 'split("\n") | map(select(length > 0) | tonumber) | unique'
}

# .what = the file name of one watch record
# .note = a github owner holds no dot, so the first dot splits owner from name
as_watch_record_name() {
  local repo="$1" pr="$2" serial="$3"
  echo "${repo%%/*}.${repo#*/}.pr=$pr.clone=$serial.json"
}

# .what = the path of one watch record in a key dir
# .why  = the `watches/` layout lives here alone; every reader and writer asks
as_watch_record_path() {
  local key_dir="$1" name="$2"
  echo "$key_dir/watches/$name"
}

# .what = the outbox dir of a key dir
# .why  = the `outbox/` layout and its entry name live here alone: the writer,
#         the listers, and the stem parser each ask, so none can drift apart
as_watch_outbox_dir() {
  echo "$1/outbox"
}

# .what = a fresh outbox entry path for one watch: `<stem>.<epoch>.<pid>.<random>.json`
# .note = a byte sort of the names is a time sort; the stem parser below undoes the name
gen_watch_outbox_entry_path() {
  local key_dir="$1" stem="$2"
  echo "$(as_watch_outbox_dir "$key_dir")/$stem.$(get_watch_epoch_now).$$.$RANDOM.json"
}

# .what = the record stem an outbox entry belongs to
# .why  = the entry name is the stem plus the three suffixes gen_watch_outbox_entry_path adds
as_watch_record_stem_of_outbox_entry() {
  local stem
  stem="$(basename "$1" .json)"
  echo "${stem%.*.*.*}"
}

# .what = the held alerts of one watch, by its stem, in a key dir
get_all_watch_outbox_entries_of_stem() {
  local key_dir="$1" stem="$2" entry
  for entry in "$(as_watch_outbox_dir "$key_dir")/$stem."*.json; do
    [[ -f "$entry" ]] && echo "$entry"
  done
  return 0
}

# .what = how many watches of one clone a key dir holds, and how many records will not parse
# .why  = the record schema is read by field here, so a consumer counts, never parses
# usage: read -r count unreadable < <(get_watch_record_counts_of_clone <key_dir> <serial>)
get_watch_record_counts_of_clone() {
  local key_dir="$1" serial="$2" record found count=0 unreadable=0
  while IFS= read -r record; do
    [[ -n "$record" ]] || continue
    if ! found="$(jq -r '.cloneSerial' "$record" 2>/dev/null)"; then
      unreadable=$((unreadable + 1))
      continue
    fi
    [[ "$found" == "$serial" ]] && count=$((count + 1))
  done < <(get_all_watch_records "$key_dir" 2>/dev/null)
  echo "$count $unreadable"
}

# .what = write a file whole: temp file, then mv
# .why  = the daemon and the verbs read each other's records at any moment; mv
#         is atomic, so a reader sees the prior file or the next, never half
# usage: printf '%s' "$content" | set_watch_file_atomic <path>
# .note = empty input never lands: a producer that failed (a jq fault) leaves
#         the prior file whole rather than wipe it; returns 1
# .note = a fault stops at its first step, and says one line: which step, which path
set_watch_file_atomic() {
  local path="$1" dir tmp
  dir="$(dirname "$path")"
  mkdir -p "$dir" 2>/dev/null || { echo "set_watch_file_atomic: could not make dir $dir" >&2; return 1; }
  tmp="$path.tmp.$$.$RANDOM"
  cat 2>/dev/null >"$tmp" || { rm -f "$tmp"; echo "set_watch_file_atomic: could not write $tmp" >&2; return 1; }
  if [[ ! -s "$tmp" ]]; then
    rm -f "$tmp"
    echo "set_watch_file_atomic: empty input refused for $path" >&2
    return 1
  fi
  mv "$tmp" "$path"
}

######################################################################
# lock: a mkdir dir with an owner pid (F13)
######################################################################

# .what = take the lock of one key dir; wait up to 10s
# .why  = mkdir is atomic on every posix fs, so one taker wins a race
# .note = a lock whose owner pid died is reaped; a lock with no owner file
#         older than 10s is reaped too (its taker died between mkdir and write)
# .note = any lock older than WATCH_LOCK_HOLD_MAX_SECONDS is reaped: each hold is
#         a few file moves, so an old lock means its owner pid was reused by a
#         stranger after its taker died, and a bare pid probe would trust it forever
# returns: 0 on take, 1 on timeout
# .note = the wait is bound by the clock, not a count of tries: a loaded box makes
#         each try slow, and a count would stretch the wait past the hold bound,
#         so a waiter would reap a lock its live owner still holds
take_watch_lock() {
  local key_dir="$1" lock deadline
  lock="$key_dir/daemon.lock"
  mkdir -p "$key_dir"
  deadline=$(( $(get_watch_epoch_now) + WATCH_LOCK_WAIT_SECONDS ))
  while ! mkdir "$lock" 2>/dev/null; do
    # a stale lock is reaped, one reaper at a time; then the take is tried again
    if is_watch_lock_stale "$lock" && del_watch_lock_stale "$lock"; then
      continue
    fi
    [[ $(get_watch_epoch_now) -lt $deadline ]] || return 1
    sleep 0.1
  done
  echo "$$" >"$lock/owner"
  return 0
}

# .what = is this lock stale: its owner died, its taker died mid-take, or it is held past any real hold?
is_watch_lock_stale() {
  local lock="$1" owner age
  [[ -d "$lock" ]] || return 1
  owner="$(cat "$lock/owner" 2>/dev/null || echo "")"
  age=$(( $(get_watch_epoch_now) - $(get_watch_mtime "$lock") ))
  # the owner died
  [[ -n "$owner" ]] && ! kill -0 "$owner" 2>/dev/null && return 0
  # no owner after 10s: its taker died mid-take
  [[ -z "$owner" && $age -gt 10 ]] && return 0
  # held past any real hold: the owner pid is a stranger's
  [[ $age -gt $WATCH_LOCK_HOLD_MAX_SECONDS ]]
}

# .what = reap a stale lock, one reaper at a time, and only if it is still stale
# .why  = two waiters can each judge one dead lock stale; with no guard, the slower
#         deletes the lock the faster just took, and two takers hold it at once
# returns: 0 the guard was taken (the lock reaped, or found fresh) · 1 another reaper holds the guard
del_watch_lock_stale() {
  local lock="$1" guard="$1.reap"
  if ! mkdir "$guard" 2>/dev/null; then
    # a reaper that died mid-reap leaves its guard; past 10s the guard is stale too
    [[ $(( $(get_watch_epoch_now) - $(get_watch_mtime "$guard") )) -gt 10 ]] && rmdir "$guard" 2>/dev/null
    return 1
  fi
  is_watch_lock_stale "$lock" && rm -rf "$lock"
  rmdir "$guard"
  return 0
}

# .what = drop the lock of one key dir, only if this process holds it
# .why  = a process that lost its lock to a reap must never drop the next taker's
drop_watch_lock() {
  local key_dir="$1" lock owner
  lock="$key_dir/daemon.lock"
  owner="$(cat "$lock/owner" 2>/dev/null || echo "")"
  [[ "$owner" == "$$" ]] || return 0
  rm -rf "$lock"
}

# .what = the mtime of a path, in epoch seconds; 0 if absent or unreadable
# .why  = linux and macos stat take different flags
# .note = always a number: a lock can vanish between a check and its stat, and a
#         non-number in `$(( ))` aborts the caller's whole command, not one line
get_watch_mtime() {
  local path="$1" mtime
  mtime="$(stat -c %Y "$path" 2>/dev/null || stat -f %m "$path" 2>/dev/null || echo 0)"
  [[ "$mtime" =~ ^[0-9]+$ ]] || mtime=0
  echo "$mtime"
}

######################################################################
# pid probe (F11)
######################################################################

# .what = is this pid a live pr-watch daemon of this key?
# .why  = a pid may be reused by any program after a reboot; only a process
#         whose command line runs this key's daemon counts
# returns: 0 yes · 1 no · 2 the pid lives but `ps` could not say what it runs
# .note = a probe that cannot answer is never a no: a no would spawn a twin
#         beside a live daemon, and a yes could aim a kill at a stranger (F11)
is_watch_daemon_pid() {
  local pid="$1" key="$2" args
  [[ "$pid" =~ ^[0-9]+$ ]] || return 1
  kill -0 "$pid" 2>/dev/null || return 1
  args="$(ps -p "$pid" -o args= 2>/dev/null)" || {
    kill -0 "$pid" 2>/dev/null || return 1
    return 2
  }
  [[ "$args" == *"$WATCH_DAEMON_FILE"* && "$args" == *"$key"* ]]
}

# .what = the pid in a key's pid record, or empty
get_watch_daemon_pid() {
  local key_dir="$1"
  [[ -f "$key_dir/daemon.pid" ]] || { echo ""; return 0; }
  jq -r '.pid // ""' "$key_dir/daemon.pid" 2>/dev/null || echo ""
}

# .what = seconds since the daemon's last tick; empty if it never ticked
get_watch_heartbeat_age() {
  local key_dir="$1" beat
  [[ -f "$key_dir/daemon.heartbeat" ]] || { echo ""; return 0; }
  beat="$(cat "$key_dir/daemon.heartbeat" 2>/dev/null || echo "")"
  [[ "$beat" =~ ^[0-9]+$ ]] || { echo ""; return 0; }
  echo $(( $(get_watch_epoch_now) - beat ))
}

# .what = is the heartbeat older than the wedged bound?
is_watch_heartbeat_wedged() {
  local key_dir="$1" age
  age="$(get_watch_heartbeat_age "$key_dir")"
  [[ -n "$age" ]] || return 1
  [[ $age -gt $(( WATCH_WEDGED_TICKS * WATCH_TICK_SECONDS + 60 )) ]]
}

# .what = the state of one key's daemon: live | wedged | stale | absent
# .why  = the findsert branches on it: find a live one, replace a stale or wedged one
# .note = stale = a pid record whose pid is dead or a stranger (F11)
# .note = a live pid that `ps` cannot name reads live: the findsert holds, and
#         neither spawns a twin nor kills a pid it cannot prove its own
get_watch_daemon_state() {
  local key_dir="$1" key="$2" pid rc=0
  pid="$(get_watch_daemon_pid "$key_dir")"
  [[ -n "$pid" ]] || { echo "absent"; return 0; }
  is_watch_daemon_pid "$pid" "$key" || rc=$?
  [[ $rc -eq 2 ]] && { echo "live"; return 0; }
  [[ $rc -eq 0 ]] || { echo "stale"; return 0; }
  is_watch_heartbeat_wedged "$key_dir" && { echo "wedged"; return 0; }
  echo "live"
}

# .what = stop a verified own daemon: TERM, then KILL after the grace
# .why  = a wedged daemon may ignore TERM; each signal goes only to a pid the
#         probe still proves is this key's daemon, so a stranger is never hit (F11)
stop_watch_daemon_pid() {
  local pid="$1" key="$2" tries=0
  is_watch_daemon_pid "$pid" "$key" || return 0
  kill "$pid" 2>/dev/null || true
  while is_watch_daemon_pid "$pid" "$key" && [[ $tries -lt $(( WATCH_TERM_GRACE_SECONDS * 10 )) ]]; do
    sleep 0.1
    tries=$((tries + 1))
  done
  is_watch_daemon_pid "$pid" "$key" && kill -9 "$pid" 2>/dev/null || true
}

######################################################################
# the findsert (F1, F6, F10)
######################################################################

# result of the last findsert: WATCH_DAEMON_PID, WATCH_DAEMON_VERDICT,
# WATCH_DAEMON_PRIOR (the replaced pid, if any)
WATCH_DAEMON_PID=""
WATCH_DAEMON_VERDICT=""
WATCH_DAEMON_PRIOR=""

# .what = copy this skill's *.sh into the key's own bin/, once
# .why  = the daemon must outlive the spawner's worktree (F10); a bash loop
#         also re-reads its own file as it runs, so it must own that file
# .note = a complete bin is never replaced: the key holds the hash of these
#         files, so its bin cannot differ, and a swap would pull the files out
#         from under a daemon that still sources them at boot
# returns: 0 on a complete bin · 1 with the cause appended to daemon.log
set_watch_daemon_bin() {
  local key_dir="$1" bin tmp file complete=true err
  bin="$key_dir/bin"
  for file in "$WATCH_SKILL_DIR"/*.sh; do
    [[ -f "$bin/$(basename "$file")" ]] || complete=false
  done
  [[ "$complete" == true ]] && return 0
  tmp="$key_dir/bin.tmp.$$"
  err="$( { rm -rf "$tmp" && mkdir -p "$tmp" && cp "$WATCH_SKILL_DIR"/*.sh "$tmp/" && rm -rf "$bin" && mv "$tmp" "$bin"; } 2>&1 )" && return 0
  echo "$(get_watch_iso_now) boot: copy of the daemon files to $bin failed: ${err:-no cause given}" >>"$key_dir/daemon.log"
  return 1
}

# .what = findsert the daemon of one key: find a live one, else spawn one
# .why  = one daemon per machine per key; a second findsert finds the first
# .note = the daemon itself writes its pid record under the lock at boot, and
#         exits if another live daemon of its key already holds it — so even a
#         lost lock race leaves exactly one (F1)
# sets: WATCH_DAEMON_PID, WATCH_DAEMON_VERDICT (found|spawned|replaced), WATCH_DAEMON_PRIOR
# returns: 0 on success; 1 when the daemon died at boot; 2 when the lock timed out
gen_watch_daemon() {
  local key="$1" key_dir state pid child tries=0
  key_dir="$(get_watch_key_dir "$key")"
  WATCH_DAEMON_PID=""
  WATCH_DAEMON_VERDICT=""
  WATCH_DAEMON_PRIOR=""

  take_watch_lock "$key_dir" || return 2

  # found: a live daemon of this key
  state="$(get_watch_daemon_state "$key_dir" "$key")"
  pid="$(get_watch_daemon_pid "$key_dir")"
  if [[ "$state" == "live" ]]; then
    drop_watch_lock "$key_dir"
    WATCH_DAEMON_PID="$pid"
    WATCH_DAEMON_VERDICT="found"
    return 0
  fi

  # stale or wedged: clear the record; stop only a verified own daemon
  WATCH_DAEMON_VERDICT="spawned"
  if [[ "$state" == "stale" || "$state" == "wedged" ]]; then
    WATCH_DAEMON_VERDICT="replaced"
    WATCH_DAEMON_PRIOR="$state pid $pid"
  fi
  [[ "$state" == "wedged" ]] && stop_watch_daemon_pid "$pid" "$key"
  rm -f "$key_dir/daemon.pid"

  # spawn from the key's own copy, cwd in the state dir, detached
  set_watch_daemon_bin "$key_dir" || { drop_watch_lock "$key_dir"; return 1; }
  # .note = `setsid` puts the daemon in a session of its own, so a harness that
  #         kills the spawner's process group leaves it; a background job of a
  #         non-interactive shell is no group leader, so setsid execs in place
  #         and `$!` stays the daemon's pid. where setsid is absent, nohup alone
  # .note = the daemon serves every clone of the box, so the spawner's clone
  #         serial is dropped: no rhachet or gh child inherits one clone's identity
  child="$(
    cd "$key_dir" || exit 1
    lead=(env -u RHACHET_CLONE_SERIAL)
    command -v setsid >/dev/null 2>&1 && lead+=(setsid)
    "${lead[@]}" nohup bash "$key_dir/bin/$WATCH_DAEMON_FILE" "$key" >>"$key_dir/daemon.log" 2>&1 </dev/null &
    echo "$!"
  )"
  drop_watch_lock "$key_dir"

  # boot survival: the daemon writes its pid record once it boots; a child that
  # dies first is caught at once, so the bound only caps a slow, live boot
  while [[ $tries -lt $(( WATCH_BOOT_SECONDS * 10 )) ]]; do
    pid="$(get_watch_daemon_pid "$key_dir")"
    if [[ -n "$pid" ]] && is_watch_daemon_pid "$pid" "$key"; then
      WATCH_DAEMON_PID="$pid"
      # another findsert won the race: its daemon holds the record
      [[ "$pid" != "$child" && "$WATCH_DAEMON_VERDICT" == "spawned" ]] && WATCH_DAEMON_VERDICT="found"
      return 0
    fi
    # the child died before it wrote a record: a boot failure
    if ! kill -0 "$child" 2>/dev/null && [[ -z "$pid" ]]; then
      return 1
    fi
    sleep 0.1
    tries=$((tries + 1))
  done
  return 1
}

######################################################################
# watch records
######################################################################

# .what = all watch record paths of one key
get_all_watch_records() {
  local key_dir="$1" file
  [[ -d "$key_dir/watches" ]] || return 0
  for file in "$key_dir/watches"/*.json; do
    [[ -f "$file" ]] && echo "$file"
  done
  return 0
}

# .what = all key dirs on the machine
get_all_watch_key_dirs() {
  local root dir
  root="$(get_watch_state_root)"
  [[ -d "$root" ]] || return 0
  for dir in "$root"/v=*/; do
    [[ -d "$dir" ]] && echo "${dir%/}"
  done
  return 0
}

# .what = the key of a key dir (its name, less the v= prefix)
as_watch_key_from_dir() {
  local name
  name="$(basename "$1")"
  echo "${name#v=}"
}

# .what = the key dir that holds a watch record (records live at v=$key/watches/)
as_watch_key_dir_of_record() {
  dirname "$(dirname "$1")"
}

# .what = the key of the dir that holds a watch record
as_watch_key_of_record() {
  as_watch_key_from_dir "$(as_watch_key_dir_of_record "$1")"
}

# .what = the held alerts of one watch record
get_all_watch_outbox_entries_of_record() {
  local record="$1"
  get_all_watch_outbox_entries_of_stem "$(as_watch_key_dir_of_record "$record")" "$(basename "$record" .json)"
}

# .what = write a watch record back, only if it is still the watch that was read
# .why  = `del` or a `set` move may remove the record mid-tick; a blind write would
#         revive a stopped watch. under the key lock, which `del` and the `set`
#         move take for each removal, the write lands only where the record
#         still stands with the watchId it was read with
# .note = watchId is unique per watch life (epoch, pid, random), so a del + set
#         in one second still reads as a new watch; setAt is only second-grained
# usage: <new content> | set_watch_record_if_same <key_dir> <record> <watchId read>
# returns: 0 written, or skipped since the watch left · 1 the record is
#          unreadable or the write faulted (stderr names which) · 2 the lock timed out
set_watch_record_if_same() {
  local key_dir="$1" record="$2" watch_id="$3" content id_found rc=0
  content="$(cat)"
  take_watch_lock "$key_dir" || return 2

  # the watch left: a del or a set move removed its record; naught to write
  if [[ -z "$watch_id" || ! -f "$record" ]]; then
    drop_watch_lock "$key_dir"
    return 0
  fi

  # a record that stands yet will not parse is damage, never a departure
  if ! id_found="$(jq -r '.watchId // ""' "$record" 2>&1)"; then
    drop_watch_lock "$key_dir"
    echo "record unreadable: $record: $id_found" >&2
    return 1
  fi

  # a new watch life holds the record now; its cursors are its own
  if [[ "$id_found" != "$watch_id" ]]; then
    drop_watch_lock "$key_dir"
    return 0
  fi

  # write it, and surface a write that did not land
  printf '%s' "$content" | set_watch_file_atomic "$record" || rc=$?
  drop_watch_lock "$key_dir"
  [[ $rc -eq 0 ]] && return 0
  echo "record write failed: $record (exit $rc)" >&2
  return 1
}

# .what = delete one watch record and its held alerts, under its key's lock
# .why  = the daemon of that key writes each record back under the same lock, and
#         only where the record still stands, so a tick in flight cannot undo it
# usage: del_watch_record_locked <record> [watch_id]
#        a watch_id deletes only that watch life: a `set` that renewed the
#        record since the caller judged it leaves the new life in place
# returns: 0 deleted, or left to a new life · 1 the lock timed out (the record stands)
del_watch_record_locked() {
  local record="$1" watch_id="${2:-}" key_dir entry
  key_dir="$(as_watch_key_dir_of_record "$record")"
  take_watch_lock "$key_dir" || return 1
  if [[ -n "$watch_id" && "$(jq -r '.watchId // ""' "$record" 2>/dev/null)" != "$watch_id" ]]; then
    drop_watch_lock "$key_dir"
    return 0
  fi
  while IFS= read -r entry; do
    [[ -n "$entry" ]] && rm -f "$entry"
  done < <(get_all_watch_outbox_entries_of_record "$record")
  rm -f "$record"
  drop_watch_lock "$key_dir"
}

# .what = a token unique to one watch life: epoch, pid, random
# .why  = the tick's write-back guard compares it, so a watch stopped and set
#         again in one second never inherits the old life's cursors
gen_watch_id() {
  echo "$(get_watch_epoch_now).$$.$RANDOM$RANDOM"
}

# .what = a fresh watch record, as json
# .why  = cursors start unprimed; the first tick reads the current state and
#         alerts only what happened at or after setAt, so events before the
#         watch never alert (A3) and none between set and that tick is lost
# .note = setAt is the instant the verb began (6th arg), else now: the clone-list
#         read ahead of the write takes up to 30s, and a check that fails inside
#         it would else count as older than the watch and stay silent
as_watch_record_json() {
  local repo="$1" pr="$2" serial="$3" slug="$4" repo_root="$5" set_at="${6:-}"
  [[ -n "$set_at" ]] || set_at="$(get_watch_iso_now)"
  jq -n --arg repo "$repo" --argjson pr "$pr" --arg serial "$serial" \
    --arg slug "$slug" --arg root "$repo_root" --arg at "$set_at" --arg id "$(gen_watch_id)" '{
      repo: $repo, pr: $pr, cloneSerial: $serial, cloneSlug: $slug, repoRoot: $root,
      watchId: $id, setAt: $at, primed: false,
      cursors: { headSha: null, checkRunIdsSeen: [], issueCommentIdMax: 0, reviewCommentIdMax: 0, reviewIdMax: 0 }
    }'
}

# .what = a watch record carried to a new key: its repo root, slug, and life id renewed
# .why  = the cursors ride along, so no event re-alerts under the new key (case=14);
#         a new watchId tells a tick in flight on the old record it is not this life;
#         an ended mark stays behind, since a `set` asks for a live watch
as_watch_record_moved() {
  local record="$1" root="$2" slug="$3"
  jq --arg root "$root" --arg slug "$slug" --arg id "$(gen_watch_id)" \
    '.repoRoot = $root | .cloneSlug = $slug | .watchId = $id | del(.ended)' "$record"
}

######################################################################
# repo facts
######################################################################

# .what = owner/name from a github remote url, or empty
# .why  = ssh, ssh://, and https remotes all name one repo
as_watch_repo_from_remote_url() {
  local url="$1" repo=""
  [[ "$url" =~ ^git@github\.com:([^/]+/[^/]+)$ ]] && repo="${BASH_REMATCH[1]}"
  [[ "$url" =~ ^ssh://git@github\.com/([^/]+/[^/]+)$ ]] && repo="${BASH_REMATCH[1]}"
  [[ "$url" =~ ^https://([^@/]+@)?github\.com/([^/]+/[^/]+)$ ]] && repo="${BASH_REMATCH[2]}"
  echo "${repo%.git}"
}

# .what = the rhachet binary for a repo root: its own install, else PATH
# .why  = `clone say` reads the registry of its cwd's repo; the repo's own
#         rhachet is the version that wrote that registry
get_watch_rhachet_bin() {
  local repo_root="$1"
  if [[ -x "$repo_root/node_modules/.bin/rhachet" ]]; then
    echo "$repo_root/node_modules/.bin/rhachet"
    return 0
  fi
  echo "rhachet"
}

# .what = the longest a clone list read may take, in seconds
# .why  = a hung rhachet would stall the tick past its heartbeat; a bound turns
#         the stall into a fault, which holds the watch (reach `unknown`)
WATCH_CLONE_LIST_MAX_SECONDS="${GIT_PULL_WATCH_CLONE_LIST_MAX_SECONDS:-30}"

# .what = run the rhachet of a repo root, from that root, under a bound
# .why  = every rhachet call the watch makes (token, clone list, clone say) comes
#         through here, so none can run unbounded, or from the wrong cwd
# usage: run_watch_rhachet <repo_root> <seconds> <arg...>   # stdin passes through
# returns: the call's own exit · 124 at the bound · 1 where the root is gone (stderr names it)
# .note = a subshell body: the cd never leaks into the caller
run_watch_rhachet() (
  root="$1"
  seconds="$2"
  shift 2
  [[ -n "$root" ]] || { echo "no repo root named" >&2; exit 1; }
  cd "$root" 2>/dev/null || { echo "the repo root is gone: $root" >&2; exit 1; }
  run_watch_bounded "$seconds" "$(get_watch_rhachet_bin "$root")" "$@"
)

# .what = the clone list of a repo root, as json; empty on a fault or a stall
# .why  = empty reads as reach `unknown` downstream: `set` refuses it (F19), the
#         daemon holds the watch — neither mistakes a fault for a dead clone
get_watch_clone_list() {
  local repo_root="$1"
  run_watch_rhachet "$repo_root" "$WATCH_CLONE_LIST_MAX_SECONDS" clone list --output json 2>/dev/null || echo ""
}

# .what = why the clone list of a repo root is unreadable: the last line it said
# .why  = a refusal that names the cause spares the human a rerun to find it
# .note = runs only after a fault, so the happy path reads the registry once
get_watch_clone_list_fault() {
  local repo_root="$1" out rc=0
  out="$(run_watch_rhachet "$repo_root" "$WATCH_CLONE_LIST_MAX_SECONDS" clone list --output json 2>&1 >/dev/null)" || rc=$?
  [[ $rc -eq 0 ]] && { echo "the registry reads now; a transient fault"; return 0; }
  [[ $rc -eq 124 ]] && { echo "$(get_watch_rhachet_bin "$repo_root") clone list gave no answer in ${WATCH_CLONE_LIST_MAX_SECONDS}s"; return 0; }
  out="$(printf '%s\n' "$out" | as_watch_fault_cause)"
  echo "${out:-$(get_watch_rhachet_bin "$repo_root") clone list failed with no output}"
}

# .what = the last line of stdin with text on it, cut to 200 chars
# .why  = a tool's last stderr line is its cause; blank tails and long dumps are noise
as_watch_last_text_line() {
  grep -v '^[[:space:]]*$' | tail -n 1 | cut -c1-200 || true
}

# .what = the cause line of a tool's stderr: its first `…Error:` line, else its last text line
# .why  = a rhachet refusal trails its error with a `└─ ran: …` line; the error line
#         names the cause, the trailer only names the call
as_watch_fault_cause() {
  local text cause
  text="$(cat)"
  # the tree glyphs and spaces ahead of the class name are dropped
  cause="$(printf '%s\n' "$text" | grep -m 1 -E '[A-Za-z]*Error: ' | sed -E 's/^[^A-Za-z]*//' | cut -c1-200 || true)"
  [[ -n "$cause" ]] && { echo "$cause"; return 0; }
  printf '%s\n' "$text" | as_watch_last_text_line
}

# .what = the reach state of one clone in a clone list: LIVE | DEAD | DEAF | absent
# .note = an unreadable list reads `unknown`, so a fault never drops a watch; a list
#         of a shape not known (no `.actors` array) reads `unknown` too, since only
#         a list proven to be a registry may say a clone is absent
as_watch_clone_reach() {
  local list="$1" serial="$2" reach
  [[ -n "$list" ]] || { echo "unknown"; return 0; }
  reach="$(printf '%s' "$list" | jq -r --arg s "$serial" \
    'if (.actors | type) == "array" then ([.actors[]?.clones[]? | select(.serial == $s) | .reachState] | first // "absent") else "unknown" end' 2>/dev/null || echo "unknown")"
  echo "${reach:-unknown}"
}

# .what = the slug of one clone in a clone list, or empty
as_watch_clone_slug() {
  local list="$1" serial="$2"
  [[ -n "$list" ]] || { echo ""; return 0; }
  printf '%s' "$list" | jq -r --arg s "$serial" \
    '[.actors[]?.clones[]? | select(.serial == $s) | .slug] | first // ""' 2>/dev/null || echo ""
}

# .what = the slug of one clone in a clone list, else the first 8 of its serial
# .why  = an alert line names the clone; a registry with no slug still needs a name
as_watch_clone_slug_or_serial() {
  local slug
  slug="$(as_watch_clone_slug "$1" "$2")"
  echo "${slug:-${2:0:8}}"
}

######################################################################
# verb context: the clone, its repo, the key
######################################################################

# set by set_watch_verb_context
WATCH_REPO_ROOT=""
WATCH_REPO=""
WATCH_SERIAL=""
WATCH_SLUG=""
WATCH_KEY=""

# .what = check a flag value is one of a set; refuse otherwise
# .why  = a typo in --mode or --output is caught at parse, with the valid set named
check_watch_enum_arg() {
  local skill="$1" flag="$2" value="$3"
  shift 3
  local one
  for one in "$@"; do
    [[ "$value" == "$one" ]] && return 0
  done
  fail_watch_constraint "$skill" "$flag must be one of: $*; got '$value'" "rhx $skill --help"
}

# .what = check --pr is a positive integer
check_watch_pr_arg() {
  local skill="$1" pr="$2"
  [[ "$pr" =~ ^[1-9][0-9]*$ ]] && return 0
  fail_watch_constraint "$skill" "--pr <n> is required, a pr number; got '$pr'" "rhx $skill --pr 1220"
}

# .what = set the clone serial and the repo slug, or refuse with the fix
# .why  = every verb names the same two facts the same way; `del` needs them
#         with no registry check, since a dead clone may still drop its own watch
# usage: set_watch_clone_and_repo <skill> <repo_in> <pr> <fix for an absent serial>
set_watch_clone_and_repo() {
  local skill="$1" repo_in="$2" pr="$3" serial_fix="$4"

  # the clone: only an enrolled clone carries a serial
  WATCH_SERIAL="${RHACHET_CLONE_SERIAL:-}"
  [[ -n "$WATCH_SERIAL" ]] || fail_watch_constraint "$skill" "not an enrolled clone; no RHACHET_CLONE_SERIAL in this session" \
    "$serial_fix"

  # the repo: --in, else the origin of the cwd
  WATCH_REPO="$repo_in"
  [[ -n "$WATCH_REPO" ]] || WATCH_REPO="$(as_watch_repo_from_remote_url "$(git config --get remote.origin.url 2>/dev/null || echo "")")"
  [[ "$WATCH_REPO" =~ ^[A-Za-z0-9-]+/[A-Za-z0-9_.-]+$ ]] || fail_watch_constraint "$skill" "no repo: --in <owner/name> absent, and the cwd has no github origin" \
    "rhx $skill --pr $pr --in <owner/name>"
  return 0
}

# .what = set the verb context: repo root (realpath), repo slug, clone serial + slug, key
# .why  = `clone say` reads the registry at the realpath of its cwd (R1), so the
#         watch holds the realpath root; a clone outside that registry cannot be reached
set_watch_verb_context() {
  local skill="$1" repo_in="$2" pr="$3" toplevel list reach
  # the watch begins when the verb begins, before any slow read (A3)
  WATCH_SET_AT="$(get_watch_iso_now)"
  toplevel="$(git rev-parse --show-toplevel 2>/dev/null || echo "")"
  [[ -n "$toplevel" ]] || fail_watch_constraint "$skill" "not in a git repository" "cd into the repo whose pr you watch, then rerun"
  WATCH_REPO_ROOT="$(as_watch_real_dir "$toplevel")"
  set_watch_clone_and_repo "$skill" "$repo_in" "$pr" \
    "run this from an enrolled clone (rhx enroll), whose session carries its serial"

  # the clone must sit in the registry of this repo root, or no alert can reach it
  list="$(get_watch_clone_list "$WATCH_REPO_ROOT")"
  reach="$(as_watch_clone_reach "$list" "$WATCH_SERIAL")"
  if [[ "$reach" == "unknown" ]]; then
    fail_watch_malfunction "$skill" "the clone registry of $WATCH_REPO_ROOT is unreadable; no watch was set" \
      "cause: $(get_watch_clone_list_fault "$WATCH_REPO_ROOT")" \
      -- "check: cd $WATCH_REPO_ROOT && npx rhachet clone list --output json"
  fi
  if [[ "$reach" == "absent" || "$reach" == "DEAD" ]]; then
    fail_watch_constraint "$skill" "clone $WATCH_SERIAL is $reach in the registry of $WATCH_REPO_ROOT; an alert could not reach it" \
      "run this from the repo root where the clone was enrolled"
  fi
  WATCH_SLUG="$(as_watch_clone_slug_or_serial "$list" "$WATCH_SERIAL")"

  WATCH_KEY="$(get_watch_key)"
}

# .what = every watch record of one clone on one pr, under any key
get_all_watch_records_of_clone_pr() {
  local repo="$1" pr="$2" serial="$3" name dir record
  name="$(as_watch_record_name "$repo" "$pr" "$serial")"
  while IFS= read -r dir; do
    [[ -n "$dir" ]] || continue
    record="$(as_watch_record_path "$dir" "$name")"
    [[ -f "$record" ]] && echo "$record"
  done < <(get_all_watch_key_dirs)
  return 0
}

# .what = the daemon clause of a watch line: `daemon v<key> pid <n>, <verdict>`
as_watch_daemon_clause() {
  local key="$1" pid="$2" verdict="$3" prior="$4"
  local tail="$verdict"
  [[ "$verdict" == "replaced" && -n "$prior" ]] && tail="replaced $prior"
  echo "daemon v$key pid $pid, $tail"
}
