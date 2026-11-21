#!/usr/bin/env bash
######################################################################
# .what = Stop hook: nudge the clone to repair a local patch that no
#         longer applies, via `rhx git.package.patch get`
#
# .why  = an upgrade past a patched version lands (the patch tolerance
#         keys keep pnpm install from a fail), so the patch quietly drops;
#         the stop is the moment to name it, with the command that repairs it
#
# guarantee:
#   ✔ never blocks the stop: always exits 0
#   ✔ silent in a repo with no patch, and when every patch applies
#   ✔ a skill that will not load is named, never a crash
######################################################################

set -uo pipefail

HOOK_DIR="${BASH_SOURCE[0]%/*}"
[[ "$HOOK_DIR" == "${BASH_SOURCE[0]}" ]] && HOOK_DIR="."
GET_SH="$HOOK_DIR/../../skills/git.package.patch/git.package.patch.get.sh"

# .note = a hook never fails the stop: an absent skill is named, then exit 0
[[ -f "$GET_SH" ]] || {
  echo "💥 MalfunctionError: ${0##*/} could not find $GET_SH; local patches go unchecked"
  echo "   └─ fix: reinstall the mechanic role"
  exit 0
}

bash "$GET_SH" --when hook.onStop </dev/null
exit 0
