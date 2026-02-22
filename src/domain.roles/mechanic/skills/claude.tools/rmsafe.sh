#!/usr/bin/env bash
######################################################################
# .what = safe file removal within git repo
#
# .why  = enables file deletion without:
#         - access to files outside the repo
#         - accidental path traversal attacks
#
#         this is a controlled alternative to raw rm, which is
#         denied in permissions due to security risks.
#
# usage:
#   rmsafe.sh "path/to/file"                    # positional (like rm)
#   rmsafe.sh -r "path/to/dir"                  # recursive (like rm -r)
#   rmsafe.sh --path "path/to/file"             # named arg
#   rmsafe.sh --path "path/to/dir" --recursive  # named + recursive
#
# guarantee:
#   - path must be within repo
#   - requires -r/--recursive for directories
#   - fail-fast on errors
######################################################################
set -euo pipefail

# parse arguments (supports both positional and named)
TARGET=""
RECURSIVE=false
POSITIONAL_ARGS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --path)
      TARGET="$2"
      shift 2
      ;;
    --recursive|-r)
      RECURSIVE=true
      shift
      ;;
    --repo|--role|--skill)
      # rhachet passthrough args - ignore
      shift 2
      ;;
    --)
      # args separator - ignore
      shift
      ;;
    --*)
      echo "error: unknown option: $1"
      echo "usage: rmsafe.sh <path>"
      echo "       rmsafe.sh -r <path>"
      echo "       rmsafe.sh --path <path> [--recursive]"
      exit 2
      ;;
    *)
      # positional argument
      POSITIONAL_ARGS+=("$1")
      shift
      ;;
  esac
done

# handle positional args if --path not provided
if [[ -z "$TARGET" && ${#POSITIONAL_ARGS[@]} -ge 1 ]]; then
  TARGET="${POSITIONAL_ARGS[0]}"
fi

# validate required args
if [[ -z "$TARGET" ]]; then
  echo "error: path is required"
  echo "usage: rmsafe.sh <path>"
  echo "       rmsafe.sh -r <path>"
  echo "       rmsafe.sh --path <path> [--recursive]"
  exit 2
fi

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository"
  exit 2
fi

# get repo root (resolve symlinks fully)
REPO_ROOT=$(realpath "$(git rev-parse --show-toplevel)")

# validate target exists (check symlink OR regular file/dir)
if [[ ! -e "$TARGET" && ! -L "$TARGET" ]]; then
  echo "error: path does not exist: $TARGET"
  exit 2
fi

# resolve target path for boundary check
# for symlinks: resolve parent dir + basename (so we check the symlink location, not target)
# for regular files/dirs: resolve fully
if [[ -L "$TARGET" ]]; then
  # symlink: check the symlink's location, not where it points
  TARGET_DIR=$(dirname "$TARGET")
  TARGET_BASE=$(basename "$TARGET")
  if [[ -e "$TARGET_DIR" ]]; then
    TARGET_ABS="$(realpath "$TARGET_DIR")/$TARGET_BASE"
  else
    TARGET_ABS=$(realpath -m "$TARGET")
  fi
else
  # regular file/dir: resolve fully
  TARGET_ABS=$(realpath "$TARGET")
fi

# validate target is within repo (exact match OR slash-prefixed; prevents /repo from match of /repo-evil)
if [[ "$TARGET_ABS" != "$REPO_ROOT" && "$TARGET_ABS" != "$REPO_ROOT/"* ]]; then
  echo "error: path must be within the git repository"
  echo "  repo root: $REPO_ROOT"
  echo "  path:      $TARGET_ABS"
  exit 2
fi

# prevent delete of repo root itself
if [[ "$TARGET_ABS" == "$REPO_ROOT" ]]; then
  echo "error: cannot delete the repository root"
  exit 2
fi

# check if directory and require --recursive
if [[ -d "$TARGET_ABS" ]] && [[ "$RECURSIVE" != true ]]; then
  echo "error: target is a directory, use -r or --recursive to delete"
  exit 2
fi

# perform the removal
if [[ "$RECURSIVE" == true ]]; then
  rm -rf "$TARGET_ABS"
else
  rm "$TARGET_ABS"
fi

TARGET_REL="${TARGET_ABS#$REPO_ROOT/}"
echo "removed: $TARGET_REL"
