#!/usr/bin/env bash
######################################################################
# .what = shared helpers for git worktree management
#
# .why  = centralizes path resolution and branch sanitization logic
#         used by git.worktree.{get,set,del}.sh scripts
#
# .how  = source this file to get access to:
#           - resolve_worktrees_dir: computes $REPO_WORKTREES_DIR
#           - sanitize_branch_name: converts branch to worktree name
#           - get_repo_name: extracts repo name from gitroot
#
# guarantee:
#   - works from root repo or from within a worktree
#   - consistent path resolution across all worktree scripts
######################################################################

# resolve the worktrees directory for this repo
# handles both root repo and worktree contexts
resolve_worktrees_dir() {
  local gitroot
  gitroot="$(git rev-parse --show-toplevel)"

  local reponame
  reponame="$(basename "$gitroot")"

  # detect if we're in a worktree (path contains _worktrees)
  if [[ "$gitroot" == *"_worktrees"* ]]; then
    # we're in a worktree - reuse same _worktrees/$reponame dir
    echo "${gitroot%/*}"
  else
    # root repo - compute sibling _worktrees dir
    echo "$(dirname "$gitroot")/_worktrees/$reponame"
  fi
}

# sanitize branch name for use as directory name
# vlad/practs => vlad.practs
sanitize_branch_name() {
  local branch="$1"
  echo "${branch//\//.}"
}

# get the repo name (works from root repo or worktree)
get_repo_name() {
  local gitroot
  gitroot="$(git rev-parse --show-toplevel)"

  # detect if we're in a worktree (path contains _worktrees)
  if [[ "$gitroot" == *"_worktrees"* ]]; then
    # extract repo name from _worktrees/$reponame/$worktree path
    # gitroot = /path/to/_worktrees/$reponame/$worktree
    local worktrees_parent="${gitroot%/*}"  # /path/to/_worktrees/$reponame
    basename "$worktrees_parent"
  else
    basename "$gitroot"
  fi
}
