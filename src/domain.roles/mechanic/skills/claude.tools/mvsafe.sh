#!/usr/bin/env bash
######################################################################
# .what = safe file move within git repo
#
# .why  = enables file move without:
#         - access to files outside the repo
#         - accidental path traversal attacks
#
#         this is a controlled alternative to raw mv, which is
#         denied in permissions due to security risks.
#
# usage:
#   mvsafe.sh "path/to/source" "path/to/dest"                # positional (like mv)
#   mvsafe.sh --from "path/to/source" --into "path/to/dest"  # named args
#
# guarantee:
#   - source must be within repo
#   - dest must be within repo
#   - creates parent directories if needed
#   - fail-fast on errors
######################################################################
set -euo pipefail

# parse arguments (supports both positional and named)
FROM=""
INTO=""
NAMED_ARG_USED=false
POSITIONAL_ARGS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --from)
      FROM="$2"
      NAMED_ARG_USED=true
      shift 2
      ;;
    --into)
      INTO="$2"
      NAMED_ARG_USED=true
      shift 2
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
      echo "usage: mvsafe.sh <from> <into>"
      echo "       mvsafe.sh --from <source> --into <destination>"
      exit 2
      ;;
    *)
      # positional argument
      POSITIONAL_ARGS+=("$1")
      shift
      ;;
  esac
done

# if named args used, both must be provided (no mixing with positional)
if [[ "$NAMED_ARG_USED" == true ]]; then
  if [[ -z "$FROM" ]]; then
    echo "error: --from is required when --into is specified"
    exit 2
  fi
  if [[ -z "$INTO" ]]; then
    echo "error: --into is required when --from is specified"
    exit 2
  fi
else
  # handle positional args
  if [[ ${#POSITIONAL_ARGS[@]} -ge 1 ]]; then
    FROM="${POSITIONAL_ARGS[0]}"
  fi
  if [[ ${#POSITIONAL_ARGS[@]} -ge 2 ]]; then
    INTO="${POSITIONAL_ARGS[1]}"
  fi
fi

# validate required args
if [[ -z "$FROM" ]]; then
  echo "error: source path is required"
  echo "usage: mvsafe.sh <from> <into>"
  echo "       mvsafe.sh --from <source> --into <destination>"
  exit 2
fi

if [[ -z "$INTO" ]]; then
  echo "error: destination path is required"
  echo "usage: mvsafe.sh <from> <into>"
  echo "       mvsafe.sh --from <source> --into <destination>"
  exit 2
fi

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository"
  exit 2
fi

# get repo root (resolve symlinks fully)
REPO_ROOT=$(realpath "$(git rev-parse --show-toplevel)")

# validate source exists first
if [[ ! -e "$FROM" ]]; then
  echo "error: source does not exist: $FROM"
  exit 2
fi

# resolve source path (exists, so realpath fully resolves symlinks)
FROM_ABS=$(realpath "$FROM")

# resolve dest path: parent must exist for safe symlink resolution
INTO_DIR=$(dirname "$INTO")
INTO_BASE=$(basename "$INTO")
if [[ -e "$INTO_DIR" ]]; then
  # parent exists - resolve it fully, then append basename
  INTO_ABS="$(realpath "$INTO_DIR")/$INTO_BASE"
else
  # parent doesn't exist - use -m but warn if it looks suspicious
  INTO_ABS=$(realpath -m "$INTO")
fi

# validate source is within repo (exact match OR slash-prefixed; prevents /repo from match of /repo-evil)
if [[ "$FROM_ABS" != "$REPO_ROOT" && "$FROM_ABS" != "$REPO_ROOT/"* ]]; then
  echo "error: source must be within the git repository"
  echo "  repo root: $REPO_ROOT"
  echo "  source:    $FROM_ABS"
  exit 2
fi

# validate dest is within repo (exact match OR slash-prefixed; prevents /repo from match of /repo-evil)
if [[ "$INTO_ABS" != "$REPO_ROOT" && "$INTO_ABS" != "$REPO_ROOT/"* ]]; then
  echo "error: destination must be within the git repository"
  echo "  repo root: $REPO_ROOT"
  echo "  dest:      $INTO_ABS"
  exit 2
fi

# create parent directories if needed
INTO_ABS_DIR=$(dirname "$INTO_ABS")
if [[ ! -d "$INTO_ABS_DIR" ]]; then
  echo "create directory: $INTO_ABS_DIR"
  mkdir -p "$INTO_ABS_DIR"
fi

# perform the move
mv "$FROM_ABS" "$INTO_ABS"

FROM_REL="${FROM_ABS#$REPO_ROOT/}"
INTO_REL="${INTO_ABS#$REPO_ROOT/}"
echo "moved: $FROM_REL -> $INTO_REL"
