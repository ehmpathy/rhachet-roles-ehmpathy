#!/usr/bin/env bash
######################################################################
# .what = SessionStart hook: findsert the pr-watch daemon of this key,
#         if this clone holds a watch under it
#
# .why  = a daemon that died with the box (a reboot, an oom kill) leaves
#         its watches unserved; the next session of a clone that holds
#         one brings the daemon back, so no alert waits on the next push
#
# guarantee:
#   ✔ never halts the session: always exits 0
#   ✔ silent when there is naught to do: no serial, no watch, daemon found
#   ✔ one line when it spawns or replaces a daemon, or cannot
######################################################################

set -uo pipefail

HOOK_DIR="${BASH_SOURCE[0]%/*}"
[[ "$HOOK_DIR" == "${BASH_SOURCE[0]}" ]] && HOOK_DIR="."
WATCH_DIR="$HOOK_DIR/../../skills/git.pull.watch"

# .what = say one line on both streams; a fault to say it never fails the hook
say_both() {
  printf '%s\n' "$1" || true
  printf '%s\n' "$1" >&2 || true
}

# only an enrolled clone holds watches
[[ -n "${RHACHET_CLONE_SERIAL:-}" ]] || exit 0

# .note = a hook never fails the session: a skill that will not load is named,
#         with the last line of its load fault as the cause, then exit 0
SOURCE_FAULT="$(mktemp 2>/dev/null || echo /dev/null)"
# shellcheck source=../../skills/git.pull.watch/git.pull.watch.operations.sh
source "$WATCH_DIR/git.pull.watch.operations.sh" 2>"$SOURCE_FAULT" || {
  # the tail of the line holds the reason (bash leads with the long path), so a
  # long line keeps its last 200 chars
  CAUSE="$(grep -v '^[[:space:]]*$' "$SOURCE_FAULT" 2>/dev/null | tail -n 1)"
  [[ ${#CAUSE} -gt 200 ]] && CAUSE="…${CAUSE: -200}"
  [[ "$SOURCE_FAULT" != /dev/null ]] && rm -f "$SOURCE_FAULT"
  say_both "💥 MalfunctionError: ${0##*/} could not load $WATCH_DIR/git.pull.watch.operations.sh; pr watches are unserved"
  say_both "   ├─ cause: ${CAUSE:-<no fault text>}"
  say_both "   └─ fix: repair the cause, or reinstall the mechanic role"
  exit 0
}
[[ "$SOURCE_FAULT" != /dev/null ]] && rm -f "$SOURCE_FAULT"

KEY="$(get_watch_key 2>/dev/null || echo "")"
[[ -n "$KEY" ]] || exit 0
KEY_DIR="$(get_watch_key_dir "$KEY")"

# does this clone hold a watch under this key? a record that cannot be read
# may be this clone's, so it is named rather than read as naught to do
read -r COUNT UNREADABLE < <(get_watch_record_counts_of_clone "$KEY_DIR" "$RHACHET_CLONE_SERIAL")
if [[ $UNREADABLE -gt 0 ]]; then
  say_both "💥 MalfunctionError: $UNREADABLE pr-watch record(s) of v$KEY are unreadable; a watch of this clone may be unserved"
  say_both "   └─ records: $(as_watch_record_path "$KEY_DIR" "")"
  say_both "$(print_watch_coconut "to find the watch" "see each watch: rhx git.pull.watch get" "rewatch a pr: rhx git.pull.watch set --which <n> --mode apply")"
fi
[[ $COUNT -gt 0 ]] || exit 0

# findsert its daemon
# .note = the findsert's own returns name the cause: 2 = its lock timed out (no
#         daemon was spawned, so the log holds naught); 1 = the daemon died at boot
RC=0
gen_watch_daemon "$KEY" >/dev/null 2>&1 || RC=$?
if [[ $RC -eq 2 ]]; then
  say_both "💥 MalfunctionError: pr-watch daemon v$KEY could not start: its lock timed out; $COUNT watch(es) unserved"
  say_both "   └─ lock: $KEY_DIR/daemon.lock"
  say_both "$(print_watch_coconut "to fix it" "rerun once the holder is done: rhx git.pull.watch get")"
  exit 0
fi
if [[ $RC -ne 0 ]]; then
  say_both "💥 MalfunctionError: pr-watch daemon v$KEY could not start: it died at boot; $COUNT watch(es) unserved"
  say_both "   ├─ cause: $(as_watch_last_text_line <"$KEY_DIR/daemon.log" 2>/dev/null || echo "<the log is empty>")"
  say_both "   └─ log: $KEY_DIR/daemon.log"
  say_both "$(print_watch_coconut "to fix it" "fix the cause, then rerun: rhx git.pull.watch get")"
  exit 0
fi
[[ "$WATCH_DAEMON_VERDICT" == "found" ]] && exit 0
echo "🐢 pr watch: $(as_watch_daemon_clause "$KEY" "$WATCH_DAEMON_PID" "$WATCH_DAEMON_VERDICT" "$WATCH_DAEMON_PRIOR"), for $COUNT watch(es)"
exit 0
