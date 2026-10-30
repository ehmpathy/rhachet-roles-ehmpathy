#!/usr/bin/env bash
######################################################################
# .what = back out of a catch-up merge in flight
#
# .why  = a merge that is no catch-up (a redesign, too many conflicts)
#         needs a clean exit to the state before begin
#
# usage:
#   rhx git.branch.catchup abort
#
# guarantee:
#   - refuses with no merge in flight (exit 2), never a silent no-op
#   - restores HEAD, index, and tree to the pre-merge state
#   - spends no commit use
#   - says so when staged settlements are discarded
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMIT_SKILL_DIR="$(cd "$SKILL_DIR/../git.commit" && pwd)"

source "$COMMIT_SKILL_DIR/output.sh"
source "$COMMIT_SKILL_DIR/git.commit.operations.sh"
source "$SKILL_DIR/git.branch.catchup.operations.sh"

LABEL="git.branch.catchup abort"

######################################################################
# parse arguments
######################################################################
while [[ $# -gt 0 ]]; do
  case $1 in
    --skill|--repo|--role)
      shift
      [[ $# -gt 0 && "$1" != --* ]] && shift
      ;;
    --help|-h)
      print_turtle_header "heres the wave..."
      print_tree_start "$LABEL"
      echo "   ├─ usage"
      echo "   │  └─ rhx git.branch.catchup abort"
      echo "   └─ backs out of the merge in flight; HEAD, index, and tree return to before begin"
      exit 0
      ;;
    *)
      emit_catchup_constraint "unknown argument: $1" "$(
        print_tree_start "$LABEL"
        echo "   └─ usage: rhx git.branch.catchup abort"
      )"
      exit 2
      ;;
  esac
done

REPO_ROOT=$(git rev-parse --show-toplevel)
STATE_FILE="$REPO_ROOT/.meter/git.commit.uses.jsonc"

# guard: a merge in flight
refuse_if_no_merge_in_flight "$LABEL"

# settlements staged but not yet committed are about to be discarded
CONFLICTS=$(get_conflict_files)
SETTLED_DISCARDED=false
[[ -z "$CONFLICTS" ]] && SETTLED_DISCARDED=true

# back out
ABORT_ERR_FILE=$(mktemp)
if ! git merge --abort 2>"$ABORT_ERR_FILE"; then
  ABORT_ERR=$(cat "$ABORT_ERR_FILE")
  rm -f "$ABORT_ERR_FILE"
  emit_catchup_malfunction "git merge --abort failed" "$(
    print_tree_start "$LABEL"
    echo "   └─ cause: $ABORT_ERR"
  )"
  exit 1
fi
rm -f "$ABORT_ERR_FILE"

# the meter line: unchanged, no spend
get_commit_quota_status file="$STATE_FILE"
METER_LINE="left: none granted"
[[ "$COMMIT_QUOTA_STATUS" == "ok" || "$COMMIT_QUOTA_STATUS" == "spent" ]] && \
  METER_LINE="$(as_catchup_meter_line "$USES" "") (no spend)"

print_turtle_header "no worries dude"
print_tree_start "$LABEL"
echo "   ├─ merge: aborted"
if [[ "$SETTLED_DISCARDED" == true ]]; then
  echo "   ├─ settlements: discarded (they were staged, not committed)"
fi
echo "   ├─ HEAD: $(git rev-parse --short HEAD) (as before begin)"
echo "   └─ meter"
echo "      └─ $METER_LINE"
