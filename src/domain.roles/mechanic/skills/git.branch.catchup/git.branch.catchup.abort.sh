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
      echo "   └─ backs out of the merge in flight; HEAD, index, and tree return to before the merge"
      exit 0
      ;;
    *)
      emit_catchup_constraint message="unknown argument: $1" tree="$(
        print_tree_start "$LABEL"
        echo "   └─ usage: rhx git.branch.catchup abort"
      )"
      exit 2
      ;;
  esac
done

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"  # git lists paths from the root; read and act on them from there
STATE_FILE="$REPO_ROOT/.meter/$COMMIT_STATE_FILENAME"

# guard: a merge in flight
refuse_if_no_merge_in_flight label="$LABEL"

# settlements staged but not yet committed are about to be discarded, all or some
SETTLED_FILES=$(get_settled_conflict_files)

# back out
ABORT_ERR_FILE=$(mktemp)
if ! git merge --abort 2>"$ABORT_ERR_FILE"; then
  ABORT_ERR=$(cat "$ABORT_ERR_FILE")
  rm -f "$ABORT_ERR_FILE"
  emit_catchup_malfunction message="git merge --abort failed" tree="$(
    print_tree_start "$LABEL"
    echo "   └─ cause"
    print_catchup_lines_tree prefix="      " files="$ABORT_ERR"
  )"
  exit 1
fi
rm -f "$ABORT_ERR_FILE"

# the meter line: unchanged, no spend
get_commit_quota_status file="$STATE_FILE"
METER_LINE="left: none granted"
[[ "$COMMIT_QUOTA_STATUS" == "ok" || "$COMMIT_QUOTA_STATUS" == "spent" ]] && \
  METER_LINE="$(as_catchup_meter_line uses="$USES" after="") (no spend)"

print_turtle_header "no worries dude"
print_tree_start "$LABEL"
echo "   ├─ merge: aborted"
if [[ -n "$SETTLED_FILES" ]]; then
  echo "   ├─ settlements discarded (staged, not committed)"
  print_catchup_lines_tree prefix="   │  " files="$SETTLED_FILES"
fi
echo "   ├─ HEAD: $(git rev-parse --short HEAD) (as before the merge)"
echo "   └─ meter"
echo "      └─ $METER_LINE"
