#!/usr/bin/env bash
######################################################################
# .what = safe mv wrapper that constrains moves to within the repo
#
# .why  = mv can move/overwrite files anywhere on the filesystem.
#         this wrapper ensures both source and destination resolve
#         to paths within the current working directory (repo root).
#
# .how  = uses realpath to resolve absolute paths, then validates
#         both are prefixed by $PWD before executing mv.
#
# usage:
#   bash mvsafe.sh <source> <destination>
#
# guarantee:
#   ✔ fails if source is outside repo
#   ✔ fails if destination is outside repo
#   ✔ fails if source doesn't exist
#   ✔ passes all arguments to mv if validation passes
######################################################################

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "error: mvsafe requires at least 2 arguments" >&2
  echo "usage: mvsafe.sh <source> <destination>" >&2
  exit 1
fi

REPO_ROOT="$PWD"

# get the last argument (destination)
DEST="${*: -1}"

# get all arguments except the last (sources, could be multiple)
SOURCES=("${@:1:$#-1}")

# resolve destination path
# if dest doesn't exist yet, resolve its parent directory
if [[ -e "$DEST" ]]; then
  DEST_RESOLVED="$(realpath "$DEST")"
else
  DEST_PARENT="$(dirname "$DEST")"
  if [[ ! -d "$DEST_PARENT" ]]; then
    echo "error: destination parent directory does not exist: $DEST_PARENT" >&2
    exit 1
  fi
  DEST_RESOLVED="$(realpath "$DEST_PARENT")/$(basename "$DEST")"
fi

# validate destination is within repo
if [[ "$DEST_RESOLVED" != "$REPO_ROOT"* ]]; then
  echo "error: destination is outside repo: $DEST_RESOLVED" >&2
  echo "       repo root: $REPO_ROOT" >&2
  exit 1
fi

# validate each source is within repo
for SRC in "${SOURCES[@]}"; do
  if [[ ! -e "$SRC" ]]; then
    echo "error: source does not exist: $SRC" >&2
    exit 1
  fi

  SRC_RESOLVED="$(realpath "$SRC")"

  if [[ "$SRC_RESOLVED" != "$REPO_ROOT"* ]]; then
    echo "error: source is outside repo: $SRC_RESOLVED" >&2
    echo "       repo root: $REPO_ROOT" >&2
    exit 1
  fi
done

# all validations passed, execute mv
exec mv "$@"
