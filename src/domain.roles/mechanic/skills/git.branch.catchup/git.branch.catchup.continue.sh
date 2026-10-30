#!/usr/bin/env bash
######################################################################
# .what = finish a catch-up merge once every conflict is settled
#
# .why  = a conflicted merge stays in flight; this makes its merge commit
#         through the same commit step as a clean begin
#
# usage:
#   rhx git.branch.catchup continue
#
# guarantee:
#   - refuses with no merge in flight (exit 2)
#   - refuses while any file is still in conflict, and names each (exit 2)
#   - then the git.commit.set gates: human halts, sponsor, quota
#   - a refused gate leaves the merge in flight, so no settled work is lost
#   - the commit: robot author, sponsor trailer, meter −1
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMIT_SKILL_DIR="$(cd "$SKILL_DIR/../git.commit" && pwd)"

source "$COMMIT_SKILL_DIR/output.sh"
source "$COMMIT_SKILL_DIR/git.commit.operations.sh"
source "$SKILL_DIR/git.branch.catchup.operations.sh"

LABEL="git.branch.catchup continue"

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
      echo "   ├─ $CATCHUP_HOW_LINE"
      echo "   ├─ usage"
      echo "   │  └─ rhx git.branch.catchup continue"
      echo "   └─ makes the merge commit once every conflict is settled and staged"
      exit 0
      ;;
    *)
      emit_catchup_constraint message="unknown argument: $1" tree="$(
        print_tree_start "$LABEL"
        echo "   └─ usage: rhx git.branch.catchup continue"
      )"
      exit 2
      ;;
  esac
done

REPO_ROOT=$(git rev-parse --show-toplevel)
METER_DIR="$REPO_ROOT/.meter"
STATE_FILE="$METER_DIR/git.commit.uses.jsonc"
BRANCH=$(get_current_branch)

# guard: a merge in flight
refuse_if_no_merge_in_flight label="$LABEL"

# guard: every conflict settled (this speaks before the commit gates)
CONFLICTS=$(get_conflict_files)
if [[ -n "$CONFLICTS" ]]; then
  CONFLICT_COUNT=$(grep -c . <<< "$CONFLICTS")
  NOUN="files"
  [[ "$CONFLICT_COUNT" -eq 1 ]] && NOUN="file"
  emit_catchup_constraint message="$CONFLICT_COUNT $NOUN still in conflict" tree="$(
    print_tree_start "$LABEL"
    echo "   ├─ conflicts"
    print_catchup_files_tree prefix="   │  " files="$CONFLICTS"
    echo "   └─ next"
    echo "      └─ settle it, rhx git.stage.add it, then continue again"
  )"
  exit 2
fi

# the commit gates, in the git.commit.set order; each refusal leaves the
# merge in flight, so a human's grant then continue finishes it
refuse_if_commit_blocked skill="$LABEL"
get_commit_sponsor skill="$LABEL" file="$METER_DIR/$SPONSOR_STATE_FILENAME"
get_commit_quota_status file="$STATE_FILE"
if [[ "$COMMIT_QUOTA_STATUS" != "ok" ]]; then
  refuse_commit_quota skill="$LABEL" status="$COMMIT_QUOTA_STATUS" \
    file_shown="${STATE_FILE#"$REPO_ROOT/"}"
fi
get_commit_robot_identity auth="$AUTH_DEFAULT"

# every file the merge commit carries (clean and settled alike), for the result
MERGED_COUNT=$(git diff --cached --name-only | grep -c . || true)

# commit the merge
if ! set_catchup_merge_commit branch="$BRANCH"; then
  emit_catchup_malfunction message="git commit failed; the merge stays in flight" tree="$(
    print_tree_start "$LABEL"
    echo "   ├─ cause"
    print_catchup_files_tree prefix="   │  " files="$CATCHUP_COMMIT_ERR"
    echo "   └─ next"
    echo "      ├─ retry:       rhx git.branch.catchup continue"
    echo "      └─ or back out: rhx git.branch.catchup abort"
  )"
  exit 1
fi

print_catchup_committed label="$LABEL" merge_line="files: $MERGED_COUNT merged" branch="$BRANCH"
