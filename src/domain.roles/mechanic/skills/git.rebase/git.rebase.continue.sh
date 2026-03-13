#!/usr/bin/env bash
######################################################################
# .what = continue a rebase after conflicts are settled
#
# .why  = mechanics can continue rebase after they fix conflicts
#         and stage the settled files
#
# usage:
#   rhx git.rebase continue
#
# guarantee:
#   - requires a rebase in progress
#   - requires all conflicts to be settled (staged)
#   - preserves original commit authors
#   - sets committer to seaturtle[bot]
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMIT_SKILL_DIR="$(cd "$SKILL_DIR/../git.commit" && pwd)"

# source shared utils
source "$COMMIT_SKILL_DIR/output.sh"
source "$SKILL_DIR/git.rebase.operations.sh"

######################################################################
# parse arguments
######################################################################
while [[ $# -gt 0 ]]; do
  case $1 in
    # rhachet passes these - ignore them
    --skill|--repo|--role)
      shift 2
      ;;
    --help|-h)
      echo "usage: git.rebase continue"
      echo ""
      echo "continue a rebase after settle conflicts"
      exit 0
      ;;
    *)
      echo "unknown argument: $1"
      exit 1
      ;;
  esac
done

######################################################################
# guards
######################################################################

# guard: must be in a rebase
if ! is_rebase_in_progress; then
  print_turtle_header "hold up dude..."
  print_tree_start "git.rebase continue"
  echo "   └─ error: no rebase in progress"
  exit 1
fi

# guard: conflicts must be settled
CONFLICT_FILES=$(get_conflict_files)
if [[ -n "$CONFLICT_FILES" ]]; then
  CONFLICT_COMMIT=$(get_conflict_commit)
  print_turtle_header "hold up dude..."
  print_tree_start "git.rebase continue"
  echo "   ├─ rebase"
  echo "   │  └─ status: conflict"
  echo "   ├─ conflict"
  if [[ -n "$CONFLICT_COMMIT" ]]; then
    echo "   │  ├─ commit: $CONFLICT_COMMIT"
  fi
  echo "   │  └─ files"
  print_files_tree "   │     " "$CONFLICT_FILES"
  echo "   └─ next steps"
  echo "      ├─ settle conflicts in files above"
  echo "      └─ rhx git.rebase continue"
  exit 1
fi

######################################################################
# set seaturtle identity (committer only - preserve original author)
######################################################################
export GIT_COMMITTER_NAME="seaturtle[bot]"
export GIT_COMMITTER_EMAIL="seaturtle@ehmpath.com"

######################################################################
# get progress info before continue
######################################################################
COMMITS_LEFT=$(get_commits_left)
TOTAL_COMMITS=$(get_total_commits)
CURRENT_NUM=$(get_current_commit_num)

######################################################################
# execute continue
######################################################################
# note: git rebase --continue may prompt for commit message
# use GIT_EDITOR=true to auto-accept default message
export GIT_EDITOR="true"

# capture git output
GIT_OUTPUT=$(git rebase --continue 2>&1) || true
GIT_EXIT_CODE=$?

# check if still in progress (more commits to process) or complete
if ! is_rebase_in_progress; then
  # rebase complete!
  print_turtle_header "righteous!"
  print_tree_start "git.rebase continue"
  echo "   ├─ rebase"
  echo "   │  ├─ commits: $TOTAL_COMMITS ✓"
  echo "   │  └─ status: complete"
  echo "   ├─ meter"
  echo "   │  └─ push: allowed"
  echo "   └─ git.output"
  print_git_output_tree "$GIT_OUTPUT"
  echo ""
  echo "🌊 ready to push"
  echo "   └─ rhx git.commit.push"
  exit 0
fi

# still in progress - check for conflicts
NEW_CONFLICTS=$(get_conflict_files)
if [[ -n "$NEW_CONFLICTS" ]]; then
  CONFLICT_COMMIT=$(get_conflict_commit)
  print_turtle_header "hold up dude..."
  print_tree_start "git.rebase continue"
  echo "   ├─ rebase"
  echo "   │  └─ status: conflict"
  echo "   ├─ conflict"
  if [[ -n "$CONFLICT_COMMIT" ]]; then
    echo "   │  ├─ commit: $CONFLICT_COMMIT"
  fi
  echo "   │  └─ files"
  print_files_tree "   │     " "$NEW_CONFLICTS"
  echo "   ├─ next steps"
  echo "   │  ├─ settle conflicts in files above"
  echo "   │  └─ rhx git.rebase continue"
  echo "   └─ git.output"
  print_git_output_tree "$GIT_OUTPUT"
  exit 1
fi

# in progress but no conflicts - show progress
NEW_COMMITS_LEFT=$(get_commits_left)
print_turtle_header "righteous!"
print_tree_start "git.rebase continue"
echo "   ├─ rebase"
echo "   │  └─ status: in progress"
echo "   ├─ left: $NEW_COMMITS_LEFT commits"
echo "   └─ git.output"
print_git_output_tree "$GIT_OUTPUT"
exit 0
