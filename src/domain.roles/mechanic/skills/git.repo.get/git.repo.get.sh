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
#     search: rhx git.repo.get lines --in ehmpathy/domain-objects --words 'DomainEntity'
#     read:   rhx git.repo.get lines --in ehmpathy/domain-objects --paths 'src/index.ts'
#
#   --words triggers search mode (21 lines radius by default)
#   no --words triggers read mode (full file)
#   --ref specifies branch/tag/sha (default: origin/main)
#
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/output.sh"
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
