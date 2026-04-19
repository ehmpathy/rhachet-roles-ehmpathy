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
#   mvsafe.sh 'path/to/source' 'path/to/dest'                # positional (like mv)
#   mvsafe.sh --from 'path/to/source' --into 'path/to/dest'  # named args
#   mvsafe.sh --from 'src/*.md' --into 'dest/'               # glob pattern
#   mvsafe.sh --from 'src/**/*.ts' --into 'archive/'         # recursive glob
#   mvsafe.sh --literal 'file.[ref].md' 'dest.[ref].md'      # literal brackets
#   mvsafe.sh 'file.\[ref\].md' 'dest.\[ref\].md'            # escaped brackets
#
# guarantee:
#   - source must be within repo
#   - dest must be within repo
#   - creates parent directories if needed
#   - fail-fast on errors
#   - glob patterns move all matches
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
LITERAL=false
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
    --literal|-l)
      LITERAL=true
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
    --help|-h)
      echo "usage: mvsafe.sh <from> <into>"
      echo "       mvsafe.sh --from <source> --into <destination>"
      echo "       mvsafe.sh --literal <from> <into>"
      echo ""
      echo "options:"
      echo "  --from <path>    source path or glob pattern"
      echo "  --into <path>    destination path"
      echo "  --literal, -l    treat path as literal (no glob expansion)"
      echo "                   use when path contains [ or ] characters"
      echo ""
      echo "examples:"
      echo "  mvsafe.sh 'src/*.ts' 'dest/'              # glob pattern"
      echo "  mvsafe.sh --literal 'file.[ref].md' 'new.[ref].md'  # literal brackets"
      echo "  mvsafe.sh 'file.\\[ref\\].md' 'new.\\[ref\\].md'      # escaped brackets"
      exit 0
      ;;
    --*)
      echo "error: unknown option: $1"
      echo "usage: mvsafe.sh <from> <into>"
      echo "       mvsafe.sh --from <source> --into <destination>"
      echo "       mvsafe.sh --literal <from> <into>"
      echo "see: mvsafe.sh --help"
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

# get repo root (expand symlinks fully)
REPO_ROOT=$(realpath "$(git rev-parse --show-toplevel)")

# detect if FROM is a glob pattern or literal path
is_glob_pattern() {
  local pattern="$1"
  [[ "$pattern" == *"*"* || "$pattern" == *"?"* || "$pattern" == *"["* ]]
}

# --literal flag forces literal interpretation
if [[ "$LITERAL" == true ]]; then
  IS_GLOB=false
else
  IS_GLOB=$(is_glob_pattern "$FROM" && echo "true" || echo "false")
fi

# expand glob pattern to array of files (directories handled separately)
FILES=()
IS_DIR_MOVE=false
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
    # directory move: use direct mv (backward compat)
    IS_DIR_MOVE=true
  elif [[ -f "$FROM" ]]; then
    FILES+=("$FROM")
  fi
fi

# handle directory move (backward compat for literal directory paths)
if [[ "$IS_DIR_MOVE" == "true" ]]; then
  FROM_ABS=$(realpath "$FROM")

  # validate source is within repo
  if [[ "$FROM_ABS" != "$REPO_ROOT" && "$FROM_ABS" != "$REPO_ROOT/"* ]]; then
    echo "error: source must be within the git repository"
    echo "  repo root: $REPO_ROOT"
    echo "  source:    $FROM_ABS"
    exit 2
  fi

  # determine dest path
  INTO_DIR=$(dirname "$INTO")
  INTO_BASE=$(basename "$INTO")
  if [[ -e "$INTO_DIR" ]]; then
    INTO_ABS="$(realpath "$INTO_DIR")/$INTO_BASE"
  else
    INTO_ABS=$(realpath -m "$INTO")
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

  # perform the directory move
  mv "$FROM_ABS" "$INTO_ABS"

  # output
  FROM_REL="${FROM_ABS#$REPO_ROOT/}"
  INTO_REL="${INTO_ABS#$REPO_ROOT/}"
  print_turtle_header "sweet"
  print_tree_start "mvsafe"
  print_tree_branch "from" "$FROM"
  print_tree_branch "into" "$INTO"
  print_tree_branch "type" "directory"
  print_tree_leaf "moved"
  print_tree_file_line "$FROM_REL -> $INTO_REL" true
  exit 0
fi

# determine header and output based on file count
FILE_COUNT=${#FILES[@]}

if [[ $FILE_COUNT -eq 0 ]]; then
  # no matches - crickets
  print_turtle_header "crickets..."
  print_tree_start "mvsafe"
  print_tree_branch "from" "$FROM"
  print_tree_branch "into" "$INTO"
  print_tree_branch "files" "0"
  print_tree_leaf "moved"
  print_tree_file_line "(none)" true

  # hint if path contains [ and --literal was not used
  if [[ "$LITERAL" != true && "$FROM" == *"["* ]]; then
    # escape brackets for display
    FROM_ESCAPED="${FROM//\[/\\[}"
    FROM_ESCAPED="${FROM_ESCAPED//\]/\\]}"
    echo ""
    echo "🥥 did you know?"
    echo "   ├─ path contains \`[\` which is a glob character"
    echo "   ├─ to treat \`[\` as literal, use either:"
    echo "   │  ├─ --literal flag: rhx mvsafe --literal '$FROM' '$INTO'"
    echo "   │  └─ escape syntax: rhx mvsafe '$FROM_ESCAPED' ..."
    echo "   └─ see: rhx mvsafe --help"
  fi
  exit 0
fi

# if multiple files, dest must be a directory
if [[ $FILE_COUNT -gt 1 ]]; then
  if [[ -e "$INTO" && ! -d "$INTO" ]]; then
    echo "error: destination must be a directory when moving multiple files"
    exit 2
  fi
  # ensure dest exists as directory
  mkdir -p "$INTO"
fi

# print header
print_turtle_header "sweet"
print_tree_start "mvsafe"
print_tree_branch "from" "$FROM"
print_tree_branch "into" "$INTO"
print_tree_branch "files" "$FILE_COUNT"
print_tree_leaf "moved"

# move each file with incremental output
MOVED_COUNT=0
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
    # multiple files or dest is directory: move into directory
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

  # perform the move
  mv "$FROM_ABS" "$INTO_ABS"

  # output relative paths
  FROM_REL="${FROM_ABS#$REPO_ROOT/}"
  INTO_REL="${INTO_ABS#$REPO_ROOT/}"
  print_tree_file_line "$FROM_REL -> $INTO_REL" "$IS_LAST"

  MOVED_COUNT=$((MOVED_COUNT + 1))
done
