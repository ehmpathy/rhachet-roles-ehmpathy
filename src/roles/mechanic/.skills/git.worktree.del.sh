#!/usr/bin/env bash
######################################################################
# .what = remove a git worktree
#
# .why  = clean up worktrees no longer needed
#
# .how  = removes worktree at @gitroot/../_worktrees/$reponame/$branch
#
# usage:
#   git.worktree.del.sh <branch>
#
# guarantee:
#   - idempotent: [DELETE] if exists, [SKIP] if not found
#   - works from root repo or from within a worktree
######################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# source shared helpers
source "$SCRIPT_DIR/git.worktree.common.sh"

# parse arguments
BRANCH="${1:-}"

# validate branch argument
if [[ -z "$BRANCH" ]]; then
  echo "error: branch name required"
  echo "usage: git.worktree.del.sh <branch>"
  exit 1
fi

# resolve paths
REPO_WORKTREES_DIR="$(resolve_worktrees_dir)"
WORKTREE_NAME="$(sanitize_branch_name "$BRANCH")"
WORKTREE_PATH="$REPO_WORKTREES_DIR/$WORKTREE_NAME"

# delete logic
if [[ -d "$WORKTREE_PATH" ]]; then
  # remove worktree via git
  git worktree remove "$WORKTREE_PATH" --force 2>/dev/null || {
    # fallback: manual removal if git worktree remove fails
    rm -rf "$WORKTREE_PATH"
    git worktree prune
  }

  echo "[DELETE] $WORKTREE_NAME"
else
  echo "[SKIP] $WORKTREE_NAME (not found)"
fi
