#!/usr/bin/env bash
######################################################################
# .what = SessionStart hook: findsert the pr-watch daemon of this key,
#         if this clone holds a watch under it or under an older key
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
# the physical path of the package root, so a fault names the skill dir with no `../../`
# segment, even where the skill dir itself is absent
PKG_DIR="$(cd -P "$HOOK_DIR/../.." 2>/dev/null && pwd || echo "$HOOK_DIR/../..")"
WATCH_DIR="$PKG_DIR/skills/git.pull.watch"

# .what = say one block on both streams; a fault to say it never fails the hook
say_both() {
  printf '%s\n' "$1" || true
  printf '%s\n' "$1" >&2 || true
}

# .what = the fault block of this hook, in the shape every git.pull.watch verb uses:
#         the 🐢 vibe, the 🐚 root, the 💥 header, then its details nested below
# .why  = one skill family reads one way; the header is built here, not in the
#         operations file, so it prints even when that file is the one that would not load
# usage: as_hook_fault_block <message> <detail...>
as_hook_fault_block() {
  local message="$1" i=0 n detail
  shift
  n=$#
  echo "🐢 bummer dude..."
  echo ""
  echo "🐚 sessionstart.git-pull-watch"
  echo "   └─ 💥 MalfunctionError: $message"
  for detail in "$@"; do
    i=$((i + 1))
    [[ $i -lt $n ]] && echo "      ├─ $detail"
    [[ $i -eq $n ]] && echo "      └─ $detail"
  done
  return 0
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
  say_both "$(as_hook_fault_block "could not load $WATCH_DIR/git.pull.watch.operations.sh; pr watches are unserved" \
    "cause: ${CAUSE:-<no fault text>}" \
    "fix: repair the cause, or reinstall the mechanic role")"
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
  say_both "$(as_hook_fault_block "$UNREADABLE pr-watch record(s) of v$KEY are unreadable; a watch of this clone may be unserved" \
    "records: $(as_watch_record_path "$KEY_DIR" "")"
    print_watch_coconut "to find the watch" "see each watch: rhx git.pull.watch get" "rewatch a pr: rhx git.pull.watch set --which <n> --mode apply")"
fi

# watches this clone holds under an older key: after an upgrade and a reboot no
# daemon serves them; this key's daemon takes each one whose root runs it now, at
# its first tick (the steal), so they count toward the findsert below
OLDER=0
while IFS= read -r OTHER_DIR; do
  [[ -n "$OTHER_DIR" && "$OTHER_DIR" != "$KEY_DIR" ]] || continue
  read -r ONE _ < <(get_watch_record_counts_of_clone "$OTHER_DIR" "$RHACHET_CLONE_SERIAL")
  OLDER=$((OLDER + ONE))
done < <(get_all_watch_key_dirs 2>/dev/null)
TOTAL=$((COUNT + OLDER))
[[ $TOTAL -gt 0 ]] || exit 0

# findsert its daemon
# .note = the findsert's own returns name the cause: 2 = its lock timed out (no
#         daemon was spawned, so the log holds naught); 1 = the daemon died at boot
RC=0
gen_watch_daemon "$KEY" >/dev/null 2>&1 || RC=$?
if [[ $RC -eq 2 ]]; then
  say_both "$(as_hook_fault_block "pr-watch daemon v$KEY could not start: its lock timed out; $TOTAL watch(es) unserved" \
    "lock: $KEY_DIR/daemon.lock"
    print_watch_coconut "to fix it" "rerun once the holder is done: rhx git.pull.watch get")"
  exit 0
fi
if [[ $RC -ne 0 ]]; then
  say_both "$(as_hook_fault_block "pr-watch daemon v$KEY could not start: it died at boot; $TOTAL watch(es) unserved" \
    "cause: $(as_watch_last_text_line <"$KEY_DIR/daemon.log" 2>/dev/null || echo "<the log is empty>")" \
    "log: $KEY_DIR/daemon.log"
    print_watch_coconut "to fix it" "fix the cause, then rerun: rhx git.pull.watch get")"
  exit 0
fi
[[ "$WATCH_DAEMON_VERDICT" == "found" && $OLDER -eq 0 ]] && exit 0
TAIL=""
[[ $OLDER -gt 0 ]] && TAIL=", $OLDER under an older key, taken at its first tick"
echo "🐢 pr watch: $(as_watch_daemon_clause "$KEY" "$WATCH_DAEMON_PID" "$WATCH_DAEMON_VERDICT" "$WATCH_DAEMON_PRIOR"), for $TOTAL watch(es)$TAIL"
exit 0
