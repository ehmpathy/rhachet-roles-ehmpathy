#!/usr/bin/env bash
######################################################################
# git.repo.get — search and browse repos without permission prompts
#
# .what
#   access any repo you can reach (local clones or github)
#   local-first, cloud fallback, no permission prompts
#
# .when
#   - "how did another repo implement this pattern?"
#   - "what repos/files exist in this org?"
#   - "show me that file from another repo"
#
# .how
#   repos  — list repos
#     rhx git.repo.get repos --repos 'ehmpathy/*'
#     rhx git.repo.get repos --repos 'sql-*'
#
#   files  — list files in repo
#     rhx git.repo.get files --in ehmpathy/domain-objects
#     rhx git.repo.get files --in ehmpathy/domain-objects --paths '**/*.test.ts'
#
#   lines  — search or read file contents
#     search repo:  rhx git.repo.get lines --in ehmpathy/domain-objects --words 'DomainEntity'
#     search org:   rhx git.repo.get lines --repos 'ehmpathy/*' --words 'DomainEntity'
#     read file:    rhx git.repo.get lines --in ehmpathy/domain-objects --paths 'src/index.ts'
#
#   --words triggers search mode (21 lines radius by default)
#   no --words triggers read mode (full file)
#   --ref specifies branch/tag/sha (default: origin/main)
#
#   --tree peeks at a local worktree's INFLIGHT state (uncommitted edits
#          included) instead of the committed origin/main:
#     rhx git.repo.get lines --in ehmpathy/domain-objects --tree feat/x --paths 'src/index.ts'
#     rhx git.repo.get files --in ehmpathy/domain-objects --tree feat/x
#
#   .note = --tree composes with the normal repo selector (--in). output
#           labels it `tree: <name> (inflight)` so inflight state is never
#           mistaken for latest. worktrees are local-only.
#
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../git.commit/output.sh"
source "$SCRIPT_DIR/git.repo.get.operations.sh"

######################################################################
# arg parse
######################################################################
SUBCOMMAND=""
REPOS_GLOB=""
REPO_SLUG=""
PATHS_GLOB=""
WORDS_PATTERN=""
RADIUS="21"
REF=""
TREE_NAME=""
REFRESH="on"

while [[ $# -gt 0 ]]; do
  case $1 in
    # rhachet passes these - ignore them
    --skill|--repo|--role)
      shift 2
      ;;
    # subcommands
    repos|files|lines)
      SUBCOMMAND="$1"
      shift
      ;;
    # flags
    --repos)
      REPOS_GLOB="$2"
      shift 2
      ;;
    --in)
      REPO_SLUG="$2"
      shift 2
      ;;
    --paths)
      PATHS_GLOB="$2"
      shift 2
      ;;
    --words)
      WORDS_PATTERN="$2"
      shift 2
      ;;
    --radius)
      RADIUS="$2"
      shift 2
      ;;
    --ref)
      REF="$2"
      shift 2
      ;;
    --tree)
      TREE_NAME="$2"
      shift 2
      ;;
    --refresh)
      REFRESH="$2"
      shift 2
      ;;
    --help|-h)
      echo "usage: rhx git.repo.get <subcommand> [options]"
      echo ""
      echo "subcommands:"
      echo "  repos   list repos that match a glob"
      echo "  files   list files in a repo"
      echo "  lines   search or read file contents"
      echo ""
      echo "options:"
      echo "  --repos <glob>     glob pattern for repos (e.g., 'ehmpathy/*')"
      echo "  --in <slug>        single repo (e.g., 'ehmpathy/domain-objects')"
      echo "  --paths <glob>     filter files by path glob"
      echo "  --words <pattern>  search for pattern (triggers search mode)"
      echo "  --radius <N>       context lines around matches (default: 21)"
      echo "  --ref <ref>        git ref to use (default: origin/main)"
      echo "  --tree <name>      read a local tree's inflight state instead of"
      echo "                     origin/main (uncommitted edits included)."
      echo "                     names a branch or a tree dir; the repo's own"
      echo "                     main clone counts as a tree too, so its branch"
      echo "                     reads that clone's live disk state."
      echo "                     applies to the files and lines subcommands."
      echo "  --refresh <on|off> fetch latest before query (default: on)"
      echo ""
      echo "examples:"
      echo "  # latest committed state (the default)"
      echo "  rhx git.repo.get lines --in ehmpathy/domain-objects --paths 'src/index.ts'"
      echo ""
      echo "  # peek at inflight work in a linked worktree"
      echo "  rhx git.repo.get lines --in ehmpathy/domain-objects --tree feat/new-refs --paths 'src/index.ts'"
      echo ""
      echo "  # peek at the main clone's own live state (dirty edits included)"
      echo "  rhx git.repo.get lines --in ehmpathy/domain-objects --tree main --paths 'src/index.ts'"
      exit 0
      ;;
    *)
      echo "error: unknown argument: $1"
      echo "run with --help for usage"
      exit 2
      ;;
  esac
done

######################################################################
# export for operations.sh
######################################################################
export REFRESH

######################################################################
# --tree has no sense on the `repos` subcommand
#
# .why = `repos` enumerates repos; a worktree is a tree OF one repo, so
#        there is no answer `--tree` could change. to accept and drop it
#        would hand back a repo list the caller believes was scoped to a
#        tree (rule.forbid.surprises).
######################################################################
if [[ -n "$TREE_NAME" && "$SUBCOMMAND" == "repos" ]]; then
  fail_tree_conflict "" "--tree has no sense on the repos subcommand" \
    "a worktree is a tree of one repo, so ask for its files or lines instead" \
    "rhx git.repo.get files --in <org>/<repo> --tree $TREE_NAME" \
    "rhx git.repo.get lines --in <org>/<repo> --tree $TREE_NAME --paths '<file>'"
fi

######################################################################
# --tree is a single-repo modifier
#
# .why = a worktree belongs to one specific repo, so it cannot be
#        applied across a --repos glob. fail loud rather than guess.
######################################################################
if [[ -n "$TREE_NAME" && -n "$REPOS_GLOB" ]]; then
  fail_tree_conflict "repos: $REPOS_GLOB" "--tree cannot be combined with --repos" \
    "a worktree belongs to one repo, so select that repo with --in" \
    "rhx git.repo.get ${SUBCOMMAND:-lines} --in <org>/<repo> --tree $TREE_NAME --paths '<file>'"
fi

######################################################################
# --tree and --ref are two different source selectors
#
# .why = --ref picks a committed state; --tree picks live inflight state.
#        to honor one and drop the other would hand back a source the
#        caller did not ask for, with a label they might not re-read.
#        fail loud rather than pick a winner (rule.forbid.surprises).
######################################################################
if [[ -n "$TREE_NAME" && -n "$REF" ]]; then
  fail_tree_conflict "ref: $REF" "--tree cannot be combined with --ref" \
    "they name two different sources, so pick one" \
    "rhx git.repo.get ${SUBCOMMAND:-lines} --in <org>/<repo> --ref $REF     # committed" \
    "rhx git.repo.get ${SUBCOMMAND:-lines} --in <org>/<repo> --tree $TREE_NAME  # inflight"
fi

######################################################################
# --tree needs --in to name the repo the tree belongs to
#
# .why = a worktree belongs to one repo, so --tree cannot stand alone.
#        the three checks above catch the conflicts a caller SPELLS; this
#        catches the one they never see. with --in absent and --words
#        present, cmd_lines/cmd_files each fill REPOS_GLOB="*/*" and route
#        into their multi-repo path — and no multi path reads TREE_NAME.
#        the inflight request would be dropped with no error and no label,
#        and an ordinary origin/main search rendered as though it were what
#        was asked for (rule.forbid.failhide, rule.forbid.surprises).
#
# .note = placed last of the four on purpose. --repos and the repos
#         subcommand each name a repo scope, so their own checks above give
#         the more precise message before this broader one is reached.
######################################################################
if [[ -n "$TREE_NAME" && -z "$REPO_SLUG" ]]; then
  fail_tree_conflict "" "--tree requires --in to name its repo" \
    "a worktree belongs to one repo, so name the repo the tree belongs to" \
    "rhx git.repo.get ${SUBCOMMAND:-lines} --in <org>/<repo> --tree $TREE_NAME"
fi

######################################################################
# subcommand dispatch
######################################################################
case "$SUBCOMMAND" in
  repos)
    cmd_repos
    ;;
  files)
    cmd_files
    ;;
  lines)
    cmd_lines
    ;;
  "")
    echo "error: no subcommand specified"
    echo "run with --help for usage"
    exit 2
    ;;
  *)
    echo "error: unknown subcommand: $SUBCOMMAND"
    echo "run with --help for usage"
    exit 2
    ;;
esac
