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
#   - refuses a staged file that still holds a conflict marker (exit 2)
#   - then the commit gates, in git.commit.set's order: human halts, quota, sponsor
#   - a refused gate leaves the merge in flight, so no settled work is lost
#   - a staged file main did not change stays out of the merge commit, its
#     edit kept in the tree and named in the result
#   - a marker-like line that HEAD or main already holds is the file's text
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
cd "$REPO_ROOT"  # git lists paths from the root; read and act on them from there
METER_DIR="$REPO_ROOT/.meter"
STATE_FILE="$METER_DIR/$COMMIT_STATE_FILENAME"
BRANCH=$(get_current_branch)

# guard: a merge in flight
refuse_if_no_catchup_merge_in_flight label="$LABEL"

# the stage grant, read pure, so the advice below names the right next step
get_commit_quota_status file="$STATE_FILE"

# guard: every conflict settled (this speaks before the commit gates)
CONFLICTS=$(get_conflict_files)
if [[ -n "$CONFLICTS" ]]; then
  CONFLICTS_SHOWN=$(get_conflict_files_shown)
  emit_catchup_constraint message="$(as_count_phrase count="$(grep -c . <<< "$CONFLICTS")" noun="file") still in conflict" tree="$(
    print_tree_start "$LABEL"
    echo "   ├─ conflicts"
    print_catchup_lines_tree prefix="   │  " files="$CONFLICTS_SHOWN"
    print_catchup_next_moves shown="$CONFLICTS_SHOWN" stage="${STAGE_ALLOWED:-block}"
  )"
  exit 2
fi

# guard: no staged file still holds a conflict marker
MARKED=$(get_staged_conflict_marker_files)
if [[ -n "$MARKED" ]]; then
  emit_catchup_constraint message="$(as_count_phrase count="$(grep -c . <<< "$MARKED")" noun="file") staged with conflict markers" tree="$(
    print_tree_start "$LABEL"
    echo "   ├─ marked"
    print_catchup_lines_tree prefix="   │  " files="$MARKED"
    echo "   └─ next"
    echo "      ├─ $CATCHUP_MARKERS_ADVICE"
    print_catchup_stage_advice stage="${STAGE_ALLOWED:-block}" label="restage each file:"
    echo "      └─ then:              rhx git.branch.catchup continue"
  )"
  exit 2
fi

# the commit gates, in their one order: human halts, quota read, sponsor.
# every quota status but ok refuses here. each refusal leaves the merge in
# flight, so a human's grant then continue finishes it
refuse_if_commit_gates_fail skill="$LABEL" \
  state_file="$STATE_FILE" sponsor_file="$METER_DIR/$SPONSOR_STATE_FILENAME" \
  repo_root="$REPO_ROOT" refuse="corrupt absent spent" grant="$CATCHUP_GRANT_COMMAND"
get_commit_robot_identity auth="$AUTH_DEFAULT"

# the merge commit carries only what the merge brought (vision invariant 2):
# a staged file main did not change leaves the stage, its edit kept in the
# tree. a lockfile that lock refresh rewrote is its own settle, so it stays
FOREIGN=$(get_staged_files_foreign_to_merge | { grep -vxE '(pnpm-lock\.yaml|package-lock\.json|yarn\.lock)' || true; })
if [[ -n "$FOREIGN" ]]; then
  while IFS= read -r file; do
    [[ -n "$file" ]] && GIT_LITERAL_PATHSPECS=1 git restore --staged -- "$file"
  done <<< "$FOREIGN"

  # named before the commit: a refused commit must not hide what left the stage
  echo "🌙 left out of the merge commit: $CATCHUP_SOURCE_REF did not change $(as_count_phrase count="$(grep -c . <<< "$FOREIGN")" noun="file")"
  echo "   ├─ still in your tree, unstaged"
  print_catchup_lines_tree prefix="   │  " files="$FOREIGN"
  echo "   └─ commit it apart, once this merge lands"
  echo "      ├─ rhx git.stage.add <files>"
  echo "      └─ printf '<message>' | rhx git.commit.set -m @stdin --mode apply"
  echo ""
fi

# every file the merge commit carries (clean and settled alike), for the result
MERGED_COUNT=$(git diff --cached --name-only -z | as_lines_from_nul | grep -c . || true)

# commit the merge
set_catchup_merge_commit label="$LABEL" branch="$BRANCH" \
  robot_name="$ROBOT_NAME" robot_email="$ROBOT_EMAIL" \
  sponsor_name="$SPONSOR_NAME" sponsor_email="$SPONSOR_EMAIL" \
  state_file="$STATE_FILE"

print_catchup_committed label="$LABEL" merge_line="files: $MERGED_COUNT merged" branch="$BRANCH" push="$PUSH_ALLOWED" \
  sha="$CATCHUP_COMMIT_SHA" uses_after="$CATCHUP_USES_AFTER"
