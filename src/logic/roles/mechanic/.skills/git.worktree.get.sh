#!/usr/bin/env bash
######################################################################
# .what = list git worktrees for this repo
#
# .why  = discover existing worktrees managed by git.worktree.sh
#
# .how  = lists worktrees at @gitroot/../_worktrees/$reponame/
#
# usage:
#   git.worktree.get.sh
#
# guarantee:
#   - works from root repo or from within a worktree
#   - shows "(no worktrees)" if none exist
######################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# source shared helpers
source "$SCRIPT_DIR/git.worktree.common.sh"

# resolve worktrees directory
REPO_WORKTREES_DIR="$(resolve_worktrees_dir)"
REPO_NAME="$(get_repo_name)"

# check if worktrees directory exists
if [[ ! -d "$REPO_WORKTREES_DIR" ]]; then
  echo "(no worktrees)"
  exit 0
fi

# list worktrees
WORKTREES=()
for dir in "$REPO_WORKTREES_DIR"/*/; do
  [[ -d "$dir" ]] && WORKTREES+=("$dir")
done

# handle empty
if [[ ${#WORKTREES[@]} -eq 0 ]]; then
  echo "(no worktrees)"
  exit 0
fi

# output worktree list
echo "worktrees for $REPO_NAME:"
for dir in "${WORKTREES[@]}"; do
  name="$(basename "$dir")"
  echo "  $name => $dir"
done
