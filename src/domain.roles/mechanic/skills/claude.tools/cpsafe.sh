#!/usr/bin/env bash
######################################################################
# .what = safe file copy within git repo
#
# .why  = enables file copy without:
#         - access to files outside the repo
#         - accidental path traversal attacks
#
#         this is a controlled alternative to raw cp, which is
#         denied in permissions due to security risks.
#
# usage:
#   cpsafe.sh 'path/to/source' 'path/to/dest'                # positional (like cp)
#   cpsafe.sh --from 'path/to/source' --into 'path/to/dest'  # named args
#   cpsafe.sh --from 'src/*.md' --into 'dest/'               # glob pattern
#   cpsafe.sh --from 'src/**/*.ts' --into 'archive/'         # recursive glob
#
# guarantee:
#   - source must be within repo
#   - dest must be within repo
#   - creates parent directories if needed
#   - fail-fast on errors
#   - glob patterns copy all matches
######################################################################
set -euo pipefail

# get skill directory to load output.sh
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SKILL_DIR/output.sh"

# enable glob expansion
shopt -s globstar nullglob

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
      echo "usage: cpsafe.sh <from> <into>"
      echo "       cpsafe.sh --from <source> --into <destination>"
      exit 2
      ;;
    *)
      # positional argument
      POSITIONAL_ARGS+=("$1")
      shift
      ;;
  esac
done

# if named args used, both must be provided (no mix with positional)
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
  echo "usage: cpsafe.sh <from> <into>"
  echo "       cpsafe.sh --from <source> --into <destination>"
  exit 2
fi

if [[ -z "$INTO" ]]; then
  echo "error: destination path is required"
  echo "usage: cpsafe.sh <from> <into>"
  echo "       cpsafe.sh --from <source> --into <destination>"
  exit 2
fi

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository"
  exit 2
fi

# get repo root (expand symlinks fully)
REPO_ROOT=$(realpath "$(git rev-parse --show-toplevel)")

# detect if FROM is a glob pattern or literal path
is_glob_pattern() {
  local pattern="$1"
  [[ "$pattern" == *"*"* || "$pattern" == *"?"* || "$pattern" == *"["* ]]
}

IS_GLOB=$(is_glob_pattern "$FROM" && echo "true" || echo "false")

# expand glob pattern to array of files
FILES=()
if [[ "$IS_GLOB" == "true" ]]; then
  # glob pattern: use eval to expand (preserves spaces in paths)
  eval "for f in $FROM; do [[ -f \"\$f\" ]] && FILES+=(\"\$f\"); done"
else
  # literal path: validate directly
  if [[ ! -e "$FROM" ]]; then
    echo "error: source does not exist: $FROM"
    exit 2
  fi
  if [[ -d "$FROM" ]]; then
    echo "error: source must be a file, not a directory: $FROM"
    exit 2
  fi
  if [[ -f "$FROM" ]]; then
    FILES+=("$FROM")
  fi
fi

# determine header and output based on file count
FILE_COUNT=${#FILES[@]}

if [[ $FILE_COUNT -eq 0 ]]; then
  # no matches - crickets
  print_turtle_header "crickets..."
  print_tree_start "cpsafe"
  print_tree_branch "from" "$FROM"
  print_tree_branch "into" "$INTO"
  print_tree_branch "files" "0"
  print_tree_leaf "copied"
  print_tree_file_line "(none)" true
  exit 0
fi

# if multiple files, dest must be a directory
if [[ $FILE_COUNT -gt 1 ]]; then
  if [[ -e "$INTO" && ! -d "$INTO" ]]; then
    echo "error: destination must be a directory when copying multiple files"
    exit 2
  fi
  # ensure dest exists as directory
  mkdir -p "$INTO"
fi

# print header
print_turtle_header "sweet"
print_tree_start "cpsafe"
print_tree_branch "from" "$FROM"
print_tree_branch "into" "$INTO"
print_tree_branch "files" "$FILE_COUNT"
print_tree_leaf "copied"

# copy each file with incremental output
COPIED_COUNT=0
for i in "${!FILES[@]}"; do
  FILE="${FILES[$i]}"
  IS_LAST=$([[ $((i + 1)) -eq $FILE_COUNT ]] && echo "true" || echo "false")

  # get absolute source path
  FROM_ABS=$(realpath "$FILE")

  # validate source is within repo
  if [[ "$FROM_ABS" != "$REPO_ROOT" && "$FROM_ABS" != "$REPO_ROOT/"* ]]; then
    echo "error: source must be within the git repository"
    echo "  repo root: $REPO_ROOT"
    echo "  source:    $FROM_ABS"
    exit 2
  fi

  # determine destination path
  if [[ $FILE_COUNT -gt 1 ]] || [[ -d "$INTO" ]]; then
    # multiple files or dest is directory: copy into directory
    INTO_ABS="$(realpath "$INTO")/$(basename "$FILE")"
  else
    # single file to single dest
    INTO_DIR=$(dirname "$INTO")
    INTO_BASE=$(basename "$INTO")
    if [[ -e "$INTO_DIR" ]]; then
      INTO_ABS="$(realpath "$INTO_DIR")/$INTO_BASE"
    else
      INTO_ABS=$(realpath -m "$INTO")
    fi
  fi

  # validate dest is within repo
  if [[ "$INTO_ABS" != "$REPO_ROOT" && "$INTO_ABS" != "$REPO_ROOT/"* ]]; then
    echo "error: destination must be within the git repository"
    echo "  repo root: $REPO_ROOT"
    echo "  dest:      $INTO_ABS"
    exit 2
  fi

  # create parent directories if needed
  INTO_ABS_DIR=$(dirname "$INTO_ABS")
  if [[ ! -d "$INTO_ABS_DIR" ]]; then
    mkdir -p "$INTO_ABS_DIR"
  fi

  # perform the copy
  cp -P "$FROM_ABS" "$INTO_ABS"

  # output relative paths
  FROM_REL="${FROM_ABS#$REPO_ROOT/}"
  INTO_REL="${INTO_ABS#$REPO_ROOT/}"
  print_tree_file_line "$FROM_REL -> $INTO_REL" "$IS_LAST"

  COPIED_COUNT=$((COPIED_COUNT + 1))
done
