#!/usr/bin/env bash
######################################################################
# .what = dispatcher for git worktree management
#
# .why  = single entry point for get|set|del subcommands
#         enables convenient `git.worktree.sh get|set|del` interface
#
# .how  = routes to git.worktree.{get,set,del}.sh based on subcommand
#
# usage:
#   git.worktree.sh get                     # list worktrees
#   git.worktree.sh set <branch>            # findsert worktree
#   git.worktree.sh set <branch> --open     # findsert + open in codium
#   git.worktree.sh set <branch> --main     # create from origin/main
#   git.worktree.sh del <branch>            # remove worktree
#
# guarantee:
#   - dispatches to correct subcommand script
#   - shows usage on invalid/missing subcommand
#   - fail-fast on errors
######################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUBCOMMAND="${1:-}"

case "$SUBCOMMAND" in
  get|set|del)
    shift
    exec "$SCRIPT_DIR/git.worktree.$SUBCOMMAND.sh" "$@"
    ;;
  *)
    echo "usage: git.worktree.sh <command> [args]"
    echo ""
    echo "commands:"
    echo "  get              list worktrees for this repo"
    echo "  set <branch>     findsert worktree for branch"
    echo "  del <branch>     remove worktree for branch"
    echo ""
    echo "options (for set):"
    echo "  --open           open worktree in codium after creation"
    echo "  --main           create branch from origin/main"
    exit 1
    ;;
esac
