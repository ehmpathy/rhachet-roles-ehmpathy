#!/usr/bin/env bash
######################################################################
# .what = findsert a git worktree for a branch
#
# .why  = enable parallel work on same repo without nested worktrees
#         worktrees are placed outside repo so git diff stays clean
#
# .how  = creates worktree at @gitroot/../_worktrees/$reponame/$branch
#
# usage:
#   git.worktree.set.sh <branch>            # findsert worktree
#   git.worktree.set.sh <branch> --open     # findsert + open in codium
#   git.worktree.set.sh <branch> --main     # create from origin/main
#
# guarantee:
#   - idempotent: [KEEP] if exists, [CREATE] if not
#   - works from root repo or from within a worktree
#   - worktree placed outside repo (not nested)
######################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# source shared helpers
source "$SCRIPT_DIR/git.worktree.common.sh"

# parse arguments
BRANCH=""
FLAG_OPEN=false
FLAG_MAIN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --open)
      FLAG_OPEN=true
      shift
      ;;
    --main)
      FLAG_MAIN=true
      shift
      ;;
    -*)
      echo "error: unknown flag '$1'"
      echo "usage: git.worktree.set.sh <branch> [--open] [--main]"
      exit 1
      ;;
    *)
      if [[ -z "$BRANCH" ]]; then
        BRANCH="$1"
      else
        echo "error: unexpected argument '$1'"
        exit 1
      fi
      shift
      ;;
  esac
done

# validate branch argument
if [[ -z "$BRANCH" ]]; then
  echo "error: branch name required"
  echo "usage: git.worktree.set.sh <branch> [--open] [--main]"
  exit 1
fi

# resolve paths
REPO_WORKTREES_DIR="$(resolve_worktrees_dir)"
WORKTREE_NAME="$(sanitize_branch_name "$BRANCH")"
WORKTREE_PATH="$REPO_WORKTREES_DIR/$WORKTREE_NAME"

# ensure parent directory exists
mkdir -p "$REPO_WORKTREES_DIR"

# findsert logic
if [[ -d "$WORKTREE_PATH" ]]; then
  echo "[KEEP] $WORKTREE_NAME => $WORKTREE_PATH"
else
  # create worktree
  if [[ "$FLAG_MAIN" == true ]]; then
    # fetch latest main first
    git fetch origin main 2>/dev/null || git fetch origin master 2>/dev/null || true

    # create new branch from origin/main
    git worktree add -b "$BRANCH" "$WORKTREE_PATH" origin/main 2>/dev/null || \
      git worktree add -b "$BRANCH" "$WORKTREE_PATH" origin/master
  else
    # check if branch exists
    if git show-ref --verify --quiet "refs/heads/$BRANCH" 2>/dev/null; then
      # branch exists locally, checkout existing
      git worktree add "$WORKTREE_PATH" "$BRANCH"
    elif git show-ref --verify --quiet "refs/remotes/origin/$BRANCH" 2>/dev/null; then
      # branch exists on remote, track it
      git worktree add --track -b "$BRANCH" "$WORKTREE_PATH" "origin/$BRANCH"
    else
      # create new branch from current HEAD
      git worktree add -b "$BRANCH" "$WORKTREE_PATH"
    fi
  fi

  echo "[CREATE] $WORKTREE_NAME => $WORKTREE_PATH"
fi

# open in codium if requested
if [[ "$FLAG_OPEN" == true ]]; then
  echo "opening in codium..."
  codium "$WORKTREE_PATH"
fi
