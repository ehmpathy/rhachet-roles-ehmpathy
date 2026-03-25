#!/usr/bin/env bash
######################################################################
# .what = safe directory creation within git repo
#
# .why  = enables directory creation without:
#         - access to paths outside the repo
#         - accidental path traversal attacks
#
#         this is a controlled alternative to raw mkdir, which is
#         denied in permissions due to security risks.
#
# usage:
#   mkdirsafe.sh 'path/to/dir'                              # positional
#   mkdirsafe.sh --path 'path/to/dir'                       # named arg
#   mkdirsafe.sh --path 'path/to/dir' -p                    # create parents
#   mkdirsafe.sh --path 'path/to/dir' --parents             # create parents
#   mkdirsafe.sh --path 'a/b' --path 'c/d'                  # multiple dirs
#   mkdirsafe.sh 'a/b' 'c/d' -p                             # multiple positional
#
# guarantee:
#   - path must be within repo
#   - requires -p/--parents for nested creation
#   - fail-fast on errors
######################################################################
set -euo pipefail

# get skill directory to load output.sh
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SKILL_DIR/output.sh"

######################################################################
# parse arguments
######################################################################
PATHS=()
PARENTS=false
POSITIONAL_ARGS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --path)
      PATHS+=("$2")
      shift 2
      ;;
    -p|--parents)
      PARENTS=true
      shift
      ;;
    --repo|--role|--skill)
      # rhachet passthrough args - ignore
      shift 2
      ;;
    --)
      shift
      ;;
    --help|-h)
      echo "usage: mkdirsafe.sh [options] [path ...]"
      echo ""
      echo "options:"
      echo "  --path DIR         directory to create (repeatable)"
      echo "  -p, --parents      create parent directories as needed"
      echo "  --help             show this help"
      exit 0
      ;;
    --*)
      echo "error: unknown option: $1"
      echo "usage: mkdirsafe.sh --path 'dir' [-p]"
      exit 2
      ;;
    *)
      POSITIONAL_ARGS+=("$1")
      shift
      ;;
  esac
done

# merge positional args into PATHS
for arg in "${POSITIONAL_ARGS[@]}"; do
  PATHS+=("$arg")
done

######################################################################
# validate
######################################################################

# at least one path is required
if [[ ${#PATHS[@]} -eq 0 ]]; then
  echo "error: --path is required"
  echo "usage: mkdirsafe.sh --path 'dir' [-p]"
  exit 2
fi

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository"
  exit 2
fi

# get repo root
REPO_ROOT=$(realpath "$(git rev-parse --show-toplevel)")

######################################################################
# create directories
######################################################################

DIR_COUNT=${#PATHS[@]}
CREATED_COUNT=0

# validate all paths before creation
for DIR_PATH in "${PATHS[@]}"; do
  # get absolute path (use -m to allow non-existent paths)
  DIR_ABS=$(realpath -m "$DIR_PATH" 2>/dev/null || echo "")
  if [[ -z "$DIR_ABS" ]]; then
    echo "error: cannot determine absolute path: $DIR_PATH"
    exit 2
  fi

  # validate path is within repo
  if [[ "$DIR_ABS" != "$REPO_ROOT" && "$DIR_ABS" != "$REPO_ROOT/"* ]]; then
    echo "error: path must be within the git repository"
    echo "  repo root: $REPO_ROOT"
    echo "  path:      $DIR_ABS"
    exit 2
  fi

  # check if directory already present
  if [[ -d "$DIR_ABS" ]]; then
    continue
  fi

  # check if parent present (unless -p)
  PARENT_DIR=$(dirname "$DIR_ABS")
  if [[ "$PARENTS" == false && ! -d "$PARENT_DIR" ]]; then
    echo "error: parent directory does not exist: $(dirname "$DIR_PATH")"
    echo "  use -p or --parents to create parent directories"
    exit 2
  fi
done

# perform creation
for DIR_PATH in "${PATHS[@]}"; do
  DIR_ABS=$(realpath -m "$DIR_PATH")

  # skip if already present
  if [[ -d "$DIR_ABS" ]]; then
    continue
  fi

  # create directory
  if [[ "$PARENTS" == true ]]; then
    mkdir -p "$DIR_ABS"
  else
    mkdir "$DIR_ABS"
  fi

  CREATED_COUNT=$((CREATED_COUNT + 1))
done

######################################################################
# output
######################################################################

if [[ $CREATED_COUNT -eq 0 ]]; then
  print_turtle_header "already here"
  print_tree_start "mkdirsafe"
  if [[ $DIR_COUNT -eq 1 ]]; then
    print_tree_branch "path" "${PATHS[0]}"
  else
    print_tree_branch "paths" "$DIR_COUNT"
  fi
  print_tree_leaf "directories: 0 (all present)"
else
  print_turtle_header "sweet"
  print_tree_start "mkdirsafe"
  if [[ $DIR_COUNT -eq 1 ]]; then
    print_tree_branch "path" "${PATHS[0]}"
  else
    print_tree_branch "paths" "$DIR_COUNT"
  fi
  if [[ "$PARENTS" == true ]]; then
    print_tree_branch "parents" "true"
  fi
  print_tree_leaf "directories: $CREATED_COUNT"

  # print created dirs
  for i in "${!PATHS[@]}"; do
    DIR_PATH="${PATHS[$i]}"
    DIR_ABS=$(realpath "$DIR_PATH")
    DIR_REL="${DIR_ABS#$REPO_ROOT/}"
    IS_LAST=$([[ $((i + 1)) -eq $DIR_COUNT ]] && echo "true" || echo "false")
    print_tree_file_line "$DIR_REL" "$IS_LAST"
  done
fi
