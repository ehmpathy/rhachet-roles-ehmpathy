#!/usr/bin/env bash
######################################################################
# .what = safe file removal within git repo
#
# .why  = enables file deletion without:
#         - touching files outside the repo
#         - accidental path traversal attacks
#
#         this is a controlled alternative to raw rm, which is
#         denied in permissions due to security risks.
#
# usage:
#   rmsafe.sh --path "path/to/file"
#   rmsafe.sh --path "path/to/dir" --recursive
#
# guarantee:
#   - path must be within repo
#   - requires --recursive for directories
#   - fail-fast on errors
######################################################################
set -euo pipefail

# parse named arguments
TARGET=""
RECURSIVE=false

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
    *)
      echo "unknown argument: $1"
      echo "usage: rmsafe.sh --path 'target' [--recursive]"
      exit 1
      ;;
  esac
done

# validate required args
if [[ -z "$TARGET" ]]; then
  echo "error: --path is required"
  exit 1
fi

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository"
  exit 1
fi

# get repo root
REPO_ROOT=$(git rev-parse --show-toplevel)

# resolve absolute path
TARGET_ABS=$(realpath -m "$TARGET")

# validate target is within repo
if [[ "$TARGET_ABS" != "$REPO_ROOT"* ]]; then
  echo "error: path must be within the git repository"
  echo "  repo root: $REPO_ROOT"
  echo "  path:      $TARGET_ABS"
  exit 1
fi

# prevent deleting repo root itself
if [[ "$TARGET_ABS" == "$REPO_ROOT" ]]; then
  echo "error: cannot delete the repository root"
  exit 1
fi

# validate target exists
if [[ ! -e "$TARGET_ABS" ]]; then
  echo "error: path does not exist: $TARGET"
  exit 1
fi

# check if directory and require --recursive
if [[ -d "$TARGET_ABS" ]] && [[ "$RECURSIVE" != true ]]; then
  echo "error: target is a directory, use --recursive to delete"
  exit 1
fi

# perform the removal
if [[ "$RECURSIVE" == true ]]; then
  rm -rf "$TARGET_ABS"
else
  rm "$TARGET_ABS"
fi

TARGET_REL="${TARGET_ABS#$REPO_ROOT/}"
echo "removed: $TARGET_REL"
