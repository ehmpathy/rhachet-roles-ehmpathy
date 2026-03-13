#!/usr/bin/env bash
######################################################################
# .what = abort a rebase and restore to pre-rebase state
#
# .why  = mechanics can escape from a stuck rebase and try again
#
# usage:
#   rhx git.rebase abort
#
# guarantee:
#   - requires a rebase in progress
#   - restores branch to state before rebase started
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
      echo "usage: git.rebase abort"
      echo ""
      echo "abort a rebase and restore to pre-rebase state"
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
  print_tree_start "git.rebase abort"
  echo "   └─ error: no rebase in progress"
  exit 1
fi

######################################################################
# execute abort
######################################################################
if git rebase --abort 2>&1; then
  print_turtle_header "no worries dude"
  print_tree_start "git.rebase abort"
  echo "   └─ status: restored to pre-rebase state"
  exit 0
fi

# abort failed somehow
print_turtle_header "hold up dude..."
print_tree_start "git.rebase abort"
echo "   └─ error: abort failed"
exit 1
