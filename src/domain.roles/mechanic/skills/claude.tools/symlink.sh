#!/usr/bin/env bash
######################################################################
# .what = safe symlink creation within git repo
#
# .why  = enables symlink creation without:
#         - confusion about relative vs absolute paths
#         - forgetting to cd into directories
#         - accidental path traversal attacks
#
#         this is a controlled alternative to raw ln -s, which
#         requires mental gymnastics about path resolution.
#
# usage:
#   symlink.sh --at "path/to/link" --to "path/to/target" --mode relative
#   symlink.sh --at "path/to/link" --to "path/to/target" --mode absolute
#   symlink.sh --at "path/to/link" --to "path/to/target" --mode relative --idem findsert
#   symlink.sh --at "path/to/link" --to "path/to/target" --mode relative --idem upsert
#
# args:
#   --at     where to create the symlink
#   --to     what the symlink points to
#   --mode   relative | absolute (required)
#   --idem   findsert | upsert (optional, for idempotent operations)
#
# guarantee:
#   - --at must be within git repo
#   - --to must be within git repo
#   - creates parent directories if needed
#   - fail-fast on errors
#   - --idem never deletes regular files
######################################################################
set -euo pipefail

# parse named arguments
AT=""
TO=""
MODE=""
IDEM=""

show_help() {
  cat << 'EOF'
usage: symlink.sh --at <path> --to <target> --mode <relative|absolute> [--idem <findsert|upsert>]

args:
  --at     where to create the symlink (required)
  --to     what the symlink points to (required)
  --mode   relative | absolute (required)
           - relative: symlink stores relative path (portable if both move together)
           - absolute: symlink stores absolute path (always points to same location)
  --idem   findsert | upsert (optional)
           - findsert: succeed if symlink exists with same target, error if different
           - upsert: overwrite existing symlink to match desired state

examples:
  # create relative symlink
  symlink.sh --at ./link --to ./target --mode relative

  # create absolute symlink
  symlink.sh --at ./link --to ./target --mode absolute

  # idempotent: succeed if already correct
  symlink.sh --at ./link --to ./target --mode relative --idem findsert

  # idempotent: always update to match
  symlink.sh --at ./link --to ./target --mode relative --idem upsert
EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --at)
      AT="$2"
      shift 2
      ;;
    --to)
      TO="$2"
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --idem)
      IDEM="$2"
      shift 2
      ;;
    --help|-h)
      show_help
      exit 0
      ;;
    --repo|--role|--skill)
      # rhachet passthrough args - ignore
      shift 2
      ;;
    --)
      # args separator - ignore
      shift
      ;;
    *)
      echo "error: unknown argument: $1" >&2
      echo "usage: symlink.sh --at <path> --to <target> --mode <relative|absolute>" >&2
      exit 1
      ;;
  esac
done

# validate required args
if [[ -z "$AT" ]]; then
  echo "error: --at is required" >&2
  exit 1
fi

if [[ -z "$TO" ]]; then
  echo "error: --to is required" >&2
  exit 1
fi

if [[ -z "$MODE" ]]; then
  echo "error: --mode is required (relative | absolute)" >&2
  exit 1
fi

if [[ "$MODE" != "relative" && "$MODE" != "absolute" ]]; then
  echo "error: --mode must be 'relative' or 'absolute', got '$MODE'" >&2
  exit 1
fi

if [[ -n "$IDEM" && "$IDEM" != "findsert" && "$IDEM" != "upsert" ]]; then
  echo "error: --idem must be 'findsert' or 'upsert', got '$IDEM'" >&2
  exit 1
fi

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository" >&2
  exit 1
fi

# get repo root
REPO_ROOT=$(git rev-parse --show-toplevel)

# resolve --at to absolute path (without following symlinks if it exists)
# -m: allow missing components, -s: don't follow symlinks in final component
AT_ABS=$(realpath -m -s "$AT")

# validate --at is within repo
if [[ "$AT_ABS" != "$REPO_ROOT"* ]]; then
  echo "error: --at must be within the git repository" >&2
  echo "  repo root: $REPO_ROOT" >&2
  echo "  --at:      $AT_ABS" >&2
  exit 1
fi

# resolve --to to absolute path (for comparison and absolute mode)
TO_ABS=$(realpath -m "$TO")

# validate --to is within repo
if [[ "$TO_ABS" != "$REPO_ROOT"* ]]; then
  echo "error: --to must be within the git repository" >&2
  echo "  repo root: $REPO_ROOT" >&2
  echo "  --to:      $TO_ABS" >&2
  exit 1
fi

# compute target path based on mode
AT_DIR=$(dirname "$AT_ABS")
if [[ "$MODE" == "relative" ]]; then
  TARGET_PATH=$(realpath -m --relative-to="$AT_DIR" "$TO_ABS")
else
  TARGET_PATH="$TO_ABS"
fi

# handle existing path at --at
if [[ -e "$AT_ABS" || -L "$AT_ABS" ]]; then
  # check if it's a symlink or regular file
  if [[ -L "$AT_ABS" ]]; then
    # it's a symlink
    EXISTING_TARGET=$(readlink "$AT_ABS")

    # resolve existing target to absolute for comparison
    if [[ "$EXISTING_TARGET" == /* ]]; then
      EXISTING_RESOLVED="$EXISTING_TARGET"
    else
      EXISTING_RESOLVED=$(realpath -m "$AT_DIR/$EXISTING_TARGET")
    fi

    if [[ -z "$IDEM" ]]; then
      # no --idem: error with hint
      echo "error: symlink already exists at $AT" >&2
      echo "  points to: $EXISTING_TARGET" >&2
      echo "" >&2
      echo "hint: use --idem findsert to succeed if target matches" >&2
      echo "hint: use --idem upsert to overwrite regardless" >&2
      exit 1
    elif [[ "$IDEM" == "findsert" ]]; then
      # findsert: compare targets
      if [[ "$EXISTING_RESOLVED" == "$TO_ABS" ]]; then
        echo "symlink already exists with correct target"
        exit 0
      else
        echo "error: symlink exists but points to different target" >&2
        echo "  existing:  $EXISTING_TARGET (resolves to $EXISTING_RESOLVED)" >&2
        echo "  requested: $TARGET_PATH (resolves to $TO_ABS)" >&2
        exit 1
      fi
    elif [[ "$IDEM" == "upsert" ]]; then
      # upsert: remove existing symlink
      rm "$AT_ABS"
    fi
  else
    # it's a regular file (or directory)
    echo "error: non-symlink file exists at $AT" >&2
    echo "  type: $(file -b "$AT_ABS")" >&2
    echo "" >&2
    echo "refusing to delete non-symlink files" >&2
    exit 1
  fi
fi

# create parent directories if needed
if [[ ! -d "$AT_DIR" ]]; then
  mkdir -p "$AT_DIR"
fi

# check if target exists, warn if not
if [[ ! -e "$TO_ABS" ]]; then
  echo "warning: target does not exist: $TO" >&2
fi

# create the symlink
ln -s "$TARGET_PATH" "$AT_ABS"

# emit success message
AT_REL="${AT_ABS#$REPO_ROOT/}"
echo "created symlink: $AT_REL -> $TARGET_PATH (mode: $MODE)"
