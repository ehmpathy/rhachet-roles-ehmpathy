#!/usr/bin/env bash
######################################################################
# .what = shared operations for the git.branch.uses meter
#
# .why  = the cutover verb and the meter's own local handler ask one
#         question — may this tree cut a branch? — so they share one
#         reader, one gate, and one spend
#
# usage:
#   source "$SCRIPT_DIR/../git.branch.uses/git.branch.uses.operations.sh"
#   guard_branch_uses_granted cmd="git.branch.cutover begin"
#   spend_branch_use
#
# guarantee:
#   - the global + org readers are the commit meter's own, pointed at the
#     branch meter's files via METER_SLUG / METER_NOUN (fulcrum F11)
#   - pure at source time: constants + functions, no top-level command
######################################################################

BRANCH_USES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# .why NOT exported = these name the meter for THIS process alone. an
#      exported slug would leak into any git.commit.* child and point it at
#      the branch meter's files
METER_SLUG="git.branch.uses"
METER_NOUN="cutover"

source "$BRANCH_USES_DIR/../git.commit/output.sh"
source "$BRANCH_USES_DIR/../git.commit/git.commit.operations.sh"

######################################################################
# pid locks — one live holder per lock file
#
# .why  = a read-modify-write on shared state (the meter, the cutover state)
#         needs one writer at a time. the claim is a hard link of a file that
#         already holds the pid, so a peer never reads a lock with no holder;
#         a lock whose holder is dead (a kill -9, a reboot) is reclaimed under
#         a mkdir gate, after a re-read, so two reclaimers cannot both remove
#         a fresh lock. the holder is its pid plus its start time, so a
#         recycled pid never reads as live. the caller releases it (del_pid_lock), or sets a trap to
######################################################################

# the pid that holds a lock, or "" when none: get_pid_lock_holder <file>
get_pid_lock_holder() {
  [[ -f "$1" ]] || return 0
  head -n 1 "$1" | cut -d ' ' -f 1
}

# the start time of a live process, or "" when it is gone: get_pid_start_time <pid>
get_pid_start_time() {
  ps -o lstart= -p "$1" 2> /dev/null | tr -s ' ' || true
}

# the record a lock holds: "<pid> <start time>", so a recycled pid reads as a new process
as_pid_lock_record() {
  printf '%s %s\n' "$1" "$(get_pid_start_time "$1")"
}

# is the process that took this lock still alive? a pid alone can lie: after
# a crash or a reboot the kernel may hand that pid to a stranger. so the start
# time recorded at the take must match the start time of that pid now
is_pid_lock_holder_live() {
  local lock="$1" record pid start_recorded
  [[ -f "$lock" ]] || return 1
  record=$(head -n 1 "$lock")
  pid="${record%% *}"
  start_recorded="${record#"$pid"}"
  start_recorded="${start_recorded# }"
  [[ -n "$pid" ]] || return 1
  kill -0 "$pid" 2> /dev/null || return 1

  # a record with no start time predates this check: the pid is all it has
  [[ -n "$start_recorded" ]] || return 0
  [[ "$(get_pid_start_time "$pid")" == "$start_recorded" ]]
}

# a reclaim gate stranded by a kill between its mkdir and its rmdir goes stale after a minute
del_pid_lock_reclaim_if_stale() {
  local gate="$1"
  if [[ -n "$(find "$gate" -maxdepth 0 -type d -mmin +1 2> /dev/null)" ]]; then
    rmdir "$gate" 2> /dev/null || true
  fi
}

# take a lock for this process; return 1 when a live peer holds it, and
# 3 when the lock file cannot be made at all (PID_LOCK_ERROR names why)
set_pid_lock() {
  local lock="$1"
  local temp="$lock.tmp.$$"
  local holder ln_error
  PID_LOCK_ERROR=""
  as_pid_lock_record "$$" > "$temp"

  # the fast path: no lock held
  if ln_error=$(ln "$temp" "$lock" 2>&1); then
    rm -f "$temp"
    return 0
  fi

  # no lock exists, yet the link failed: the filesystem refused the write
  # (no hard links, no space, no access), which no wait will fix
  if [[ ! -e "$lock" ]] && ! ln_error=$(ln "$temp" "$lock" 2>&1) && [[ ! -e "$lock" ]]; then
    rm -f "$temp"
    PID_LOCK_ERROR="$ln_error"
    return 3
  fi
  # this process already holds it: a nested take is a no-op
  holder=$(get_pid_lock_holder "$lock")
  if [[ "$holder" == "$$" ]]; then
    rm -f "$temp"
    return 0
  fi

  # a live holder keeps it
  if is_pid_lock_holder_live "$lock"; then
    rm -f "$temp"
    return 1
  fi

  # a dead holder: reclaim under the gate, after a re-read of the holder
  del_pid_lock_reclaim_if_stale "$lock.reclaim"
  if ! mkdir "$lock.reclaim" 2> /dev/null; then
    rm -f "$temp"
    return 1
  fi
  if [[ "$(get_pid_lock_holder "$lock")" == "$holder" ]]; then
    rm -f "$lock"
  fi
  if ! ln "$temp" "$lock" 2> /dev/null; then
    rmdir "$lock.reclaim"
    rm -f "$temp"
    return 1
  fi
  rmdir "$lock.reclaim"
  rm -f "$temp"
  return 0
}

# release a lock, only if this process holds it
del_pid_lock() {
  if [[ "$(get_pid_lock_holder "$1")" == "$$" ]]; then
    rm -f "$1"
  fi
}

# does this process hold the lock now? is_pid_lock_held_by_self <file>
is_pid_lock_held_by_self() {
  [[ "$(get_pid_lock_holder "$1")" == "$$" ]]
}

######################################################################
# .what = register a lock's release to run at exit
#
# .why  = each lock helper owns its own release; one EXIT trap runs them
#         all, so no helper's trap overwrites another's, and no helper
#         releases a lock it never took
#
# usage: add_pid_lock_exit_release <release fn>
######################################################################
PID_LOCK_EXIT_RELEASES=()
add_pid_lock_exit_release() {
  local fn="$1" known
  for known in "${PID_LOCK_EXIT_RELEASES[@]+"${PID_LOCK_EXIT_RELEASES[@]}"}"; do
    [[ "$known" == "$fn" ]] && return 0
  done
  PID_LOCK_EXIT_RELEASES+=("$fn")
  trap 'run_pid_lock_exit_releases' EXIT
}
run_pid_lock_exit_releases() {
  local fn
  for fn in "${PID_LOCK_EXIT_RELEASES[@]+"${PID_LOCK_EXIT_RELEASES[@]}"}"; do
    "$fn" || true
  done
}

######################################################################
# .what = the meter lock: held by every writer of this tree's branch meter
#
# .why  = the spend reads the quota, then writes it less one; a human's
#         `set` beside it could be overwritten, or drive the spend below
#         zero. both writers hold this lock, so each sees the other's write
#
# .note = a writer holds it for one read and one write, so a peer waits
#         briefly (2s) before it gives up
######################################################################
get_branch_meter_lock_file() {
  echo "$(git rev-parse --show-toplevel)/.meter/git.branch.uses.lock"
}

set_branch_meter_lock() {
  local lock tries=0 rc
  lock=$(get_branch_meter_lock_file)
  mkdir -p "$(dirname "$lock")"
  while true; do
    rc=0
    set_pid_lock "$lock" || rc=$?
    if [[ "$rc" -eq 0 ]]; then
      add_pid_lock_exit_release del_branch_meter_lock
      return 0
    fi

    # the lock file cannot be made: a fault, never contention to wait out
    if [[ "$rc" -eq 3 ]]; then
      emit_branch_meter_malfunction cmd="git.branch.uses" reason="the quota lock file could not be made" \
        note=print_pid_lock_fault_note note_arg="file=$lock"
    fi
    tries=$((tries + 1))
    if [[ "$tries" -ge 20 ]]; then
      return 1
    fi
    sleep 0.1
  done
}

# the note under a lock-file fault: where it is and why the write failed
print_pid_lock_fault_note() {
  local file="${1#file=}"
  echo ""
  echo "   lock: $file"
  echo "   detail: ${PID_LOCK_ERROR:-unknown}"
  echo "   fix: clear the cause above (space, access, a filesystem without hard links), then rerun"
}

del_branch_meter_lock() {
  del_pid_lock "$(get_branch_meter_lock_file)"
}

######################################################################
# .what = the path of this tree's branch meter file
######################################################################
get_branch_meter_file() {
  echo "$(git rev-parse --show-toplevel)/.meter/git.branch.uses.jsonc"
}

######################################################################
# .what = is the local branch meter file readable?
#
# .why  = the gate and `get` must refuse a damaged file by name, never
#         read it as a count. absence is not damage
#
# usage: is_branch_meter_readable file="$BRANCH_METER_FILE"
######################################################################
is_branch_meter_readable() {
  local file=""
  for arg in "$@"; do
    case "$arg" in
      file=*) file="${arg#file=}" ;;
    esac
  done

  # absence is not damage
  [[ -e "$file" ]] || return 0

  # a non-file is damage
  [[ -f "$file" ]] || return 1
  is_branch_meter_content_readable "$(cat "$file")"
}

######################################################################
# .what = do these bytes hold a readable branch meter?
#
# .why  = the gate judges one captured copy of the file, never a second read
######################################################################
is_branch_meter_content_readable() {
  local content="$1"

  # no bytes is damage. jq reads no input from it and `-e` exits 0
  [[ -n "$content" ]] || return 1

  # the shape: an object whose uses is a non-negative integer or "infinite"
  printf '%s' "$content" | jq -e '
    type == "object"
    and (
      ((.uses | type) == "number" and .uses >= 0 and (.uses | floor) == .uses)
      or .uses == "infinite"
    )
  ' > /dev/null 2>&1
}

######################################################################
# .what = the fix lines for a damaged branch meter file
#
# .why  = the gate and `get` render one fix for one fault; a grant is
#         human-only, so the fix names the human, not the mechanic
######################################################################
print_branch_meter_damaged_fix() {
  local file=""
  for arg in "$@"; do
    case "$arg" in
      file=*) file="${arg#file=}" ;;
    esac
  done

  echo ""
  echo "   the file that holds this tree's cutover quota cannot be read:"
  echo "     $file"
  print_instruction "ask your human to reset the quota, then grant again:" \
    "  \$ rhx git.branch.uses del
  \$ rhx git.branch.uses set --quant N"
}

######################################################################
# .what = refuse unless this tree may cut a branch: global → org → local
#
# .why  = one gate for every apply cut. it renders its own refusal on
#         both streams and exits: 2 = the caller must ask a human,
#         1 = a meter file is damaged
#
# usage: guard_branch_uses_granted cmd="git.branch.cutover begin"
######################################################################
guard_branch_uses_granted() {
  local cmd="git.branch.uses"
  for arg in "$@"; do
    case "$arg" in
      cmd=*) cmd="${arg#cmd=}" ;;
    esac
  done

  # ask the one verdict, then render it
  set_branch_uses_verdict
  [[ "$BRANCH_USES_VERDICT" != "granted" ]] || return 0
  if [[ "$BRANCH_USES_VERDICT" == "damaged" ]]; then
    emit_branch_meter_malfunction cmd="$cmd" reason="$BRANCH_USES_REASON" \
      note="$BRANCH_USES_NOTE" note_arg="$BRANCH_USES_NOTE_ARG"
  fi
  emit_branch_meter_constraint cmd="$cmd" reason="$BRANCH_USES_REASON" \
    ask="$BRANCH_USES_ASK" lift="$BRANCH_USES_LIFT"
}

######################################################################
# .what = may this tree cut a branch? global → org → local, no render
#
# .why  = the gate and every preview of it (the plan's quota line) read
#         one verdict, so a preview can never say less than the gate does
#
# sets: BRANCH_USES_VERDICT = granted | refused | damaged, and for a
#       refusal: BRANCH_USES_REASON, _ASK, _LIFT; for damage: _REASON,
#       _NOTE, _NOTE_ARG
#
# .note = the verdict rides variables and the return is 0, so a caller
#         runs it as a plain statement and errexit stays live
######################################################################
set_branch_uses_verdict() {
  BRANCH_USES_VERDICT="granted"
  BRANCH_USES_REASON=""
  BRANCH_USES_ASK=""
  BRANCH_USES_LIFT=""
  BRANCH_USES_NOTE=""
  BRANCH_USES_NOTE_ARG=""

  # global blocker first: it overrides every lower level
  if ! check_global_blocker; then
    BRANCH_USES_REASON="$GLOBAL_BLOCK_REASON"
    if [[ "$GLOBAL_BLOCK_CORRUPT" == "true" ]]; then
      BRANCH_USES_VERDICT="damaged"
      BRANCH_USES_NOTE="print_global_corrupt_note"
      return 0
    fi
    BRANCH_USES_VERDICT="refused"
    BRANCH_USES_ASK="ask your human to lift it:"
    BRANCH_USES_LIFT="rhx git.branch.uses allow --global"
    return 0
  fi

  # org gate next: an org must be allowed, by name or via @all
  if ! check_org_blocker; then
    BRANCH_USES_REASON="$ORG_BLOCK_REASON"
    if [[ "$ORG_BLOCK_CORRUPT" == "true" ]]; then
      BRANCH_USES_VERDICT="damaged"
      BRANCH_USES_NOTE="print_org_corrupt_note"
      return 0
    fi
    BRANCH_USES_VERDICT="refused"
    BRANCH_USES_ASK="ask your human to allow:"
    BRANCH_USES_LIFT="rhx git.branch.uses allow --org <org>"
    return 0
  fi

  # local quota last: read the bytes once, then judge and count from that one
  # copy, so a file that vanishes or changes mid-gate cannot blur absent vs damaged
  local file repo_root content
  file=$(get_branch_meter_file)
  repo_root=$(git rev-parse --show-toplevel)

  if [[ ! -e "$file" ]] || ! content=$(cat "$file" 2> /dev/null); then
    BRANCH_USES_VERDICT="refused"
    BRANCH_USES_REASON="no cutover quota set"
    BRANCH_USES_ASK="ask your human to grant:"
    BRANCH_USES_LIFT="rhx git.branch.uses set --quant N"
    return 0
  fi

  if [[ ! -f "$file" ]] || ! is_branch_meter_content_readable "$content"; then
    BRANCH_USES_VERDICT="damaged"
    BRANCH_USES_REASON="cutover quota file corrupt"
    BRANCH_USES_NOTE="print_branch_meter_damaged_fix"
    BRANCH_USES_NOTE_ARG="file=${file#"$repo_root/"}"
    return 0
  fi

  if [[ "$(printf '%s' "$content" | jq -r '.uses')" == "0" ]]; then
    BRANCH_USES_VERDICT="refused"
    BRANCH_USES_REASON="no cutover uses left"
    BRANCH_USES_ASK="ask your human to grant more:"
    BRANCH_USES_LIFT="rhx git.branch.uses set --quant N"
  fi
  return 0
}

######################################################################
# .what = a gate refusal a human lifts: one ConstraintError leaf and the
#         command that lifts it; both streams, exit 2
#
# .why  = the guard reads as its decision (global → org → local); each
#         level hands its reason and its lift here, so the shape is one
#
# usage: emit_branch_meter_constraint cmd=<c> reason=<r> ask=<lead-in> lift=<command>
######################################################################
emit_branch_meter_constraint() {
  local cmd="" reason="" ask="" lift="" arg
  for arg in "$@"; do
    case "$arg" in
      cmd=*) cmd="${arg#cmd=}" ;;
      reason=*) reason="${arg#reason=}" ;;
      ask=*) ask="${arg#ask=}" ;;
      lift=*) lift="${arg#lift=}" ;;
    esac
  done
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "$cmd"
    print_tree_constraint "$reason"
    print_instruction "$ask" "  \$ $lift"
  )"
  exit 2
}

######################################################################
# .what = a gate refusal from a damaged meter file: one MalfunctionError
#         leaf and the note that names the repair; both streams, exit 1
#
# .why  = a damaged file is the system's fault, not the caller's; each
#         level hands its own note leaf, so the shape is one
#
# usage: emit_branch_meter_malfunction cmd=<c> reason=<r> note=<fn> [note_arg=<arg>]
######################################################################
emit_branch_meter_malfunction() {
  local cmd="" reason="" note="" note_arg="" arg
  for arg in "$@"; do
    case "$arg" in
      cmd=*) cmd="${arg#cmd=}" ;;
      reason=*) reason="${arg#reason=}" ;;
      note=*) note="${arg#note=}" ;;
      note_arg=*) note_arg="${arg#note_arg=}" ;;
    esac
  done
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "$cmd"
    print_tree_malfunction "$reason"
    if [[ -n "$note_arg" ]]; then
      "$note" "$note_arg"
    fi
    if [[ -z "$note_arg" ]]; then
      "$note"
    fi
  )"
  exit 1
}

######################################################################
# .what = spend one cutover unit; "infinite" spends none
#
# .why  = one unit per apply cut. a temp file then `mv` keeps a reader
#         from a torn file
#
# .note = call only after guard_branch_uses_granted passed. it releases the
#         meter lock only if it took it here; a caller that held it from its
#         gate keeps it, and releases it itself
######################################################################
spend_branch_use() {
  local file file_temp held_before=false
  file=$(get_branch_meter_file)
  file_temp="${file}.tmp.$$"
  if is_pid_lock_held_by_self "$(get_branch_meter_lock_file)"; then
    held_before=true
  fi

  # one writer at a time: the human's `set` holds this lock too. a cutover
  # takes it before its gate, so here the take is a no-op
  if ! set_branch_meter_lock; then
    emit_branch_meter_constraint cmd="git.branch.uses" reason="the cutover quota is busy: another writer holds it" \
      ask="rerun once it finishes:" lift="rhx git.branch.uses get"
  fi

  # read fresh under the lock; unlimited spends none; a count never drops below zero
  jq 'if .uses == "infinite" then . elif .uses > 0 then .uses = (.uses - 1) else . end' \
    "$file" > "$file_temp"
  mv -f "$file_temp" "$file"
  [[ "$held_before" == "true" ]] || del_branch_meter_lock
}
