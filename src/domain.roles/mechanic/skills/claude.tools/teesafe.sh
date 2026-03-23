#!/usr/bin/env bash
######################################################################
# .what = safe tee within git repo
#
# .when = you have content in a pipeline that needs to go to a file.
#         for direct file writes, use Write/Edit tools instead —
#         teesafe is specifically an alternative to the `tee` command,
#         not a replacement for Write/Edit.
#
# .why  = enables piped content to reach a file without:
#         - access to files outside the repo
#         - accidental path traversal attacks
#
#         this is a controlled alternative to raw tee, which could
#         write to arbitrary files outside the repo.
#
# usage:
#   cmd | teesafe.sh 'path/to/file'                         # write (default)
#   cmd | teesafe.sh --into 'path/to/file'                  # named arg
#   cmd | teesafe.sh --into 'path/to/file' --idem append    # append mode
#   cmd | teesafe.sh --into 'path/to/file' --idem findsert  # skip if same
#   cmd | teesafe.sh --into 'path/to/file' --idem upsert    # always overwrite
#
# --idem modes:
#   findsert  if file exists with same content, no-op; different content = error
#   upsert    always overwrite (default behavior)
#   append    always append to file
#
# guarantee:
#   - dest must be within repo
#   - creates parent directories if needed
#   - fail-fast on errors
#   - outputs to stdout (like tee)
######################################################################
set -euo pipefail

# get skill directory to load output.sh
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SKILL_DIR/output.sh"

# parse arguments
INTO=""
IDEM=""
POSITIONAL_ARGS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --into)
      INTO="$2"
      shift 2
      ;;
    --idem)
      IDEM="$2"
      shift 2
      ;;
    --append|-a)
      # backwards compat: treat as --idem append
      IDEM="append"
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
      echo "error: unknown option: $1" >&2
      echo "usage: cmd | teesafe.sh <file>" >&2
      echo "       cmd | teesafe.sh --into <file> [--idem findsert|upsert|append]" >&2
      exit 2
      ;;
    *)
      # positional argument
      POSITIONAL_ARGS+=("$1")
      shift
      ;;
  esac
done

# handle positional args
if [[ -z "$INTO" && ${#POSITIONAL_ARGS[@]} -ge 1 ]]; then
  INTO="${POSITIONAL_ARGS[0]}"
fi

# validate required args
if [[ -z "$INTO" ]]; then
  echo "error: destination file is required" >&2
  echo "usage: cmd | teesafe.sh <file>" >&2
  echo "       cmd | teesafe.sh --into <file> [--idem findsert|upsert|append]" >&2
  exit 2
fi

# validate --idem if provided
if [[ -n "$IDEM" && "$IDEM" != "findsert" && "$IDEM" != "upsert" && "$IDEM" != "append" ]]; then
  echo "error: --idem must be 'findsert', 'upsert', or 'append'" >&2
  exit 2
fi

# ensure we're in a git repo
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "error: not in a git repository" >&2
  exit 2
fi

# get repo root (expand symlinks fully)
REPO_ROOT=$(realpath "$(git rev-parse --show-toplevel)")

# determine destination absolute path
INTO_DIR=$(dirname "$INTO")
INTO_BASE=$(basename "$INTO")
if [[ -e "$INTO_DIR" ]]; then
  INTO_ABS="$(realpath "$INTO_DIR")/$INTO_BASE"
else
  INTO_ABS=$(realpath -m "$INTO")
fi

# validate dest is within repo
if [[ "$INTO_ABS" != "$REPO_ROOT" && "$INTO_ABS" != "$REPO_ROOT/"* ]]; then
  echo "error: destination must be within the git repository" >&2
  echo "  repo root: $REPO_ROOT" >&2
  echo "  dest:      $INTO_ABS" >&2
  exit 2
fi

# create parent directories if needed
INTO_ABS_DIR=$(dirname "$INTO_ABS")
if [[ ! -d "$INTO_ABS_DIR" ]]; then
  mkdir -p "$INTO_ABS_DIR"
fi

# read stdin into variable (must do this before any tee/comparison)
STDIN_CONTENT=$(cat)

# handle --idem modes
case "$IDEM" in
  findsert)
    # if file exists with same content, no-op; different content = error
    if [[ -f "$INTO_ABS" ]]; then
      CONTENT_EXTANT=$(cat "$INTO_ABS")
      if [[ "$STDIN_CONTENT" == "$CONTENT_EXTANT" ]]; then
        # same content, echo to stdout and exit (no-op for file)
        printf '%s' "$STDIN_CONTENT"
        exit 0
      else
        # different content, error
        echo "error: file exists with different content (findsert mode)" >&2
        echo "  dest: $INTO_ABS" >&2
        exit 2
      fi
    fi
    # file does not exist, write it
    printf '%s' "$STDIN_CONTENT" | tee "$INTO_ABS"
    ;;
  append)
    # always append to file
    printf '%s' "$STDIN_CONTENT" | tee -a "$INTO_ABS"
    ;;
  upsert|"")
    # always overwrite (default behavior)
    printf '%s' "$STDIN_CONTENT" | tee "$INTO_ABS"
    ;;
esac
