#!/usr/bin/env bash
######################################################################
# .what = safe file move within git repo
#
# .why  = enables file moving without:
#         - touching files outside the repo
#         - accidental path traversal attacks
#
#         this is a controlled alternative to raw mv, which is
#         denied in permissions due to security risks.
#
# usage:
#   mvsafe.sh --src "path/to/source" --dest "path/to/dest"
#
# guarantee:
#   - source must be within repo
#   - dest must be within repo
#   - creates parent directories if needed
#   - fail-fast on errors
######################################################################
set -euo pipefail

# parse named arguments
SRC=""
DEST=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --src)
      SRC="$2"
      shift 2
      ;;
    --dest)
      DEST="$2"
      shift 2
      ;;
    *)
      echo "unknown argument: $1"
      echo "usage: mvsafe.sh --src 'source' --dest 'destination'"
      exit 1
      ;;
  esac
done

# validate required args
if [[ -z "$SRC" ]]; then
  echo "error: --src is required"
  exit 1
fi

if [[ -z "$DEST" ]]; then
  echo "error: --dest is required"
  exit 1
fi

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository"
  exit 1
fi

# get repo root
REPO_ROOT=$(git rev-parse --show-toplevel)

# resolve absolute paths
SRC_ABS=$(realpath -m "$SRC")
DEST_ABS=$(realpath -m "$DEST")

# validate source is within repo
if [[ "$SRC_ABS" != "$REPO_ROOT"* ]]; then
  echo "error: source must be within the git repository"
  echo "  repo root: $REPO_ROOT"
  echo "  source:    $SRC_ABS"
  exit 1
fi

# validate dest is within repo
if [[ "$DEST_ABS" != "$REPO_ROOT"* ]]; then
  echo "error: destination must be within the git repository"
  echo "  repo root: $REPO_ROOT"
  echo "  dest:      $DEST_ABS"
  exit 1
fi

# validate source exists
if [[ ! -e "$SRC_ABS" ]]; then
  echo "error: source does not exist: $SRC"
  exit 1
fi

# create parent directories if needed
DEST_DIR=$(dirname "$DEST_ABS")
if [[ ! -d "$DEST_DIR" ]]; then
  echo "creating directory: $DEST_DIR"
  mkdir -p "$DEST_DIR"
fi

# perform the move
mv "$SRC_ABS" "$DEST_ABS"

SRC_REL="${SRC_ABS#$REPO_ROOT/}"
DEST_REL="${DEST_ABS#$REPO_ROOT/}"
echo "moved: $SRC_REL -> $DEST_REL"
