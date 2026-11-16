#!/usr/bin/env bash
######################################################################
# .what = UserPromptSubmit hook: print each pr-watch alert the daemon
#         holds for this clone, oldest first, then clear it
#
# .why  = `clone say` refuses some clones for good (a screen it cannot
#         read: a 0x0 pty, a detached host with no tty); the daemon
#         holds their alerts and retries each tick, so with no other
#         door the clone never hears them. at its next prompt it does
#
# guarantee:
#   ✔ never halts the prompt: always exits 0
#   ✔ silent when naught is held for this clone
#   ✔ prints only alerts the daemon tried and was refused (tries > 0),
#     so it never races a say the daemon has not yet made
#   ✔ prints and clears each under its key's lock, so an alert prints once;
#     a say in flight as the hook runs may land too: a repeat, never a drop
######################################################################

set -uo pipefail

HOOK_DIR="${BASH_SOURCE[0]%/*}"
[[ "$HOOK_DIR" == "${BASH_SOURCE[0]}" ]] && HOOK_DIR="."
WATCH_DIR="$HOOK_DIR/../../skills/git.pull.watch"

# only an enrolled clone holds watches
[[ -n "${RHACHET_CLONE_SERIAL:-}" ]] || exit 0

# .note = a hook never fails the prompt: a skill that will not load is named, then exit 0
# shellcheck source=../../skills/git.pull.watch/git.pull.watch.operations.sh
source "$WATCH_DIR/git.pull.watch.operations.sh" 2>/dev/null || {
  echo "💥 MalfunctionError: ${0##*/} could not load $WATCH_DIR/git.pull.watch.operations.sh; held pr-watch alerts stay held"
  echo "   └─ fix: repair the cause, or reinstall the mechanic role"
  exit 0
}

# .what = this clone's held alerts in one key dir: the daemon tried each and was refused
get_all_watch_outbox_entries_held_of_clone() {
  local key_dir="$1" entry
  for entry in "$(as_watch_outbox_dir "$key_dir")"/*".clone=$RHACHET_CLONE_SERIAL".*.json; do
    [[ -f "$entry" ]] || continue
    [[ "$(jq -r '.tries // 0' "$entry" 2>/dev/null || echo 0)" != "0" ]] && echo "$entry"
  done
  return 0
}

# .what = print and clear this clone's held alerts in one key dir, under its lock
# .note = a lock that will not come leaves the alerts held; the next prompt tries again
set_watch_outbox_printed_of_key() {
  local key_dir="$1" entry text tries cause
  [[ -n "$(get_all_watch_outbox_entries_held_of_clone "$key_dir")" ]] || return 0
  take_watch_lock "$key_dir" || {
    echo "🐢 pr watch: alerts wait for you under v$(as_watch_key_from_dir "$key_dir"); its lock is busy, so the next prompt brings them"
    return 0
  }
  while IFS= read -r entry; do
    [[ -n "$entry" ]] || continue
    IFS=$'\t' read -r tries cause < <(jq -r '[(.tries // 0), (.cause // "no cause given")] | @tsv' "$entry")
    text="$(jq -r '.text' "$entry")"
    printf '%s\n' "$text" | awk -v mark=" (held $tries ticks; clone say refused: $cause)" \
      '!done && /^🐚 / { print $0 mark; done = 1; next } { print }'
    echo ""
    rm -f "$entry"
  done < <(get_all_watch_outbox_entries_held_of_clone "$key_dir")
  drop_watch_lock "$key_dir"
}

# every key: an older daemon may still hold an alert for this clone
while IFS= read -r KEY_DIR; do
  [[ -n "$KEY_DIR" ]] && set_watch_outbox_printed_of_key "$KEY_DIR"
done < <(get_all_watch_key_dirs 2>/dev/null)
exit 0
