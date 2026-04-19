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
#   rmsafe.sh 'path/to/file'                    # positional (like rm)
#   rmsafe.sh -r 'path/to/dir'                  # recursive (like rm -r)
#   rmsafe.sh --path 'path/to/file'             # named arg
#   rmsafe.sh --path 'path/to/dir' --recursive  # named + recursive
#   rmsafe.sh --path 'build/*.tmp'              # glob pattern
#   rmsafe.sh --path 'src/**/*.bak'             # recursive glob
#   rmsafe.sh --literal 'file.[ref].md'         # literal brackets
#   rmsafe.sh 'file.\[ref\].md'                 # escaped brackets
#
# guarantee:
#   - path must be within repo
#   - requires -r/--recursive for directories
#   - fail-fast on errors
#   - glob patterns remove all matches
######################################################################
set -euo pipefail

# get skill directory to load output.sh
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SKILL_DIR/output.sh"

# enable glob expansion
shopt -s globstar nullglob

# parse arguments (supports both positional and named)
TARGET=""
RECURSIVE=false
LITERAL=false
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
      echo "usage: rmsafe.sh <path>"
      echo "       rmsafe.sh -r <path>"
      echo "       rmsafe.sh --path <path> [--recursive]"
      echo "       rmsafe.sh --literal <path>"
      echo ""
      echo "options:"
      echo "  --path <path>    file or glob pattern to remove"
      echo "  --recursive, -r  remove directories recursively"
      echo "  --literal, -l    treat path as literal (no glob expansion)"
      echo "                   use when path contains [ or ] characters"
      echo ""
      echo "examples:"
      echo "  rmsafe.sh 'build/*.tmp'                   # glob pattern"
      echo "  rmsafe.sh --literal 'file.[ref].md'       # literal brackets"
      echo "  rmsafe.sh 'file.\\[ref\\].md'               # escaped brackets"
      exit 0
      ;;
    --*)
      echo "error: unknown option: $1"
      echo "usage: rmsafe.sh <path>"
      echo "       rmsafe.sh -r <path>"
      echo "       rmsafe.sh --path <path> [--recursive]"
      echo "       rmsafe.sh --literal <path>"
      echo "see: rmsafe.sh --help"
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

# get repo root (expand symlinks fully)
REPO_ROOT=$(realpath "$(git rev-parse --show-toplevel)")

# detect if TARGET is a glob pattern or literal path
is_glob_pattern() {
  local pattern="$1"
  [[ "$pattern" == *"*"* || "$pattern" == *"?"* || "$pattern" == *"["* ]]
}

# --literal flag forces literal interpretation
if [[ "$LITERAL" == true ]]; then
  IS_GLOB=false
else
  IS_GLOB=$(is_glob_pattern "$TARGET" && echo "true" || echo "false")
fi

# expand glob pattern to array of files
FILES=()
IS_DIR_REMOVE=false
if [[ "$IS_GLOB" == "true" ]]; then
  # glob pattern: use eval to expand (preserves spaces in paths)
  eval "for f in $TARGET; do [[ -f \"\$f\" || -L \"\$f\" ]] && FILES+=(\"\$f\"); done"
else
  # literal path: validate directly
  if [[ ! -e "$TARGET" && ! -L "$TARGET" ]]; then
    echo "error: path does not exist: $TARGET"
    exit 2
  fi
  if [[ -d "$TARGET" ]]; then
    # directory removal: handle separately (backward compat)
    IS_DIR_REMOVE=true
  elif [[ -f "$TARGET" || -L "$TARGET" ]]; then
    FILES+=("$TARGET")
  fi
fi

# handle directory removal (backward compat for literal directory paths)
if [[ "$IS_DIR_REMOVE" == "true" ]]; then
  # check recursive flag
  if [[ "$RECURSIVE" != true ]]; then
    echo "error: target is a directory, use -r or --recursive to delete"
    exit 2
  fi

  # handle via symlink path for boundary check
  if [[ -L "$TARGET" ]]; then
    TARGET_DIR=$(dirname "$TARGET")
    TARGET_BASE=$(basename "$TARGET")
    if [[ -e "$TARGET_DIR" ]]; then
      TARGET_ABS="$(realpath "$TARGET_DIR")/$TARGET_BASE"
    else
      TARGET_ABS=$(realpath -m "$TARGET")
    fi
  else
    TARGET_ABS=$(realpath "$TARGET")
  fi

  # validate target is within repo
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

  # perform the removal
  rm -rf "$TARGET_ABS"

  # output
  TARGET_REL="${TARGET_ABS#$REPO_ROOT/}"
  print_turtle_header "sweet"
  print_tree_start "rmsafe"
  print_tree_branch "path" "$TARGET"
  print_tree_branch "type" "directory"
  print_tree_leaf "removed"
  print_tree_file_line "$TARGET_REL" true
  exit 0
fi

# determine header and output based on file count
FILE_COUNT=${#FILES[@]}

if [[ $FILE_COUNT -eq 0 ]]; then
  # no matches - crickets
  print_turtle_header "crickets..."
  print_tree_start "rmsafe"
  print_tree_branch "path" "$TARGET"
  print_tree_branch "files" "0"
  print_tree_leaf "removed"
  print_tree_file_line "(none)" true

  # hint if path contains [ and --literal was not used
  if [[ "$LITERAL" != true && "$TARGET" == *"["* ]]; then
    # escape brackets for display
    TARGET_ESCAPED="${TARGET//\[/\\[}"
    TARGET_ESCAPED="${TARGET_ESCAPED//\]/\\]}"
    echo ""
    echo "🥥 did you know?"
    echo "   ├─ path contains \`[\` which is a glob character"
    echo "   ├─ to treat \`[\` as literal, use either:"
    echo "   │  ├─ --literal flag: rhx rmsafe --literal '$TARGET'"
    echo "   │  └─ escape syntax: rhx rmsafe '$TARGET_ESCAPED'"
    echo "   └─ see: rhx rmsafe --help"
  fi
  exit 0
fi

# print header
print_turtle_header "sweet"
print_tree_start "rmsafe"
print_tree_branch "path" "$TARGET"
print_tree_branch "files" "$FILE_COUNT"
print_tree_leaf "removed"

# remove each file with incremental output
REMOVED_COUNT=0
for i in "${!FILES[@]}"; do
  FILE="${FILES[$i]}"
  IS_LAST=$([[ $((i + 1)) -eq $FILE_COUNT ]] && echo "true" || echo "false")

  # handle via symlink path for boundary check
  if [[ -L "$FILE" ]]; then
    FILE_DIR=$(dirname "$FILE")
    FILE_BASE=$(basename "$FILE")
    if [[ -e "$FILE_DIR" ]]; then
      TARGET_ABS="$(realpath "$FILE_DIR")/$FILE_BASE"
    else
      TARGET_ABS=$(realpath -m "$FILE")
    fi
  else
    TARGET_ABS=$(realpath "$FILE")
  fi

  # validate target is within repo
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

  # perform the removal
  rm "$TARGET_ABS"

  # output relative path
  TARGET_REL="${TARGET_ABS#$REPO_ROOT/}"
  print_tree_file_line "$TARGET_REL" "$IS_LAST"

  REMOVED_COUNT=$((REMOVED_COUNT + 1))
done
