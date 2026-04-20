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
      echo "rmsafe.sh - safe file removal within git repo"
      echo ""
      echo "usage:"
      echo "  rmsafe.sh <path>                      # delete file"
      echo "  rmsafe.sh -r <path>                   # delete directory"
      echo "  rmsafe.sh --path <path> [--recursive] # named args"
      echo "  rmsafe.sh --path 'build/*.tmp'        # glob pattern"
      echo "  rmsafe.sh --literal 'file.[ref].md'   # literal brackets"
      echo ""
      echo "options:"
      echo "  -r, --recursive  delete directories"
      echo "  -l, --literal    treat path as literal (no glob expansion)"
      echo "  -h, --help       show this help"
      echo ""
      echo "guarantee:"
      echo "  - path must be within repo"
      echo "  - deleted files go to trash for restore"
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

# compute trash directory path
TRASH_DIR="$REPO_ROOT/.agent/.cache/repo=ehmpathy/role=mechanic/skill=rmsafe/trash"

# findsert trash directory with gitignore
findsert_trash_dir() {
  if [[ ! -d "$TRASH_DIR" ]]; then
    mkdir -p "$TRASH_DIR"
  fi
  if [[ ! -f "$TRASH_DIR/.gitignore" ]]; then
    printf '*\n!.gitignore\n' > "$TRASH_DIR/.gitignore"
  fi
}

# compute absolute path, preserve symlink basename
compute_abs_path() {
  local path="$1"
  if [[ -L "$path" ]]; then
    local dir=$(dirname "$path")
    local base=$(basename "$path")
    if [[ -e "$dir" ]]; then
      echo "$(realpath "$dir")/$base"
    else
      realpath -m "$path"
    fi
  else
    realpath "$path"
  fi
}

# check if path is within repo boundary
is_path_within_repo() {
  local path="$1"
  [[ "$path" == "$REPO_ROOT" || "$path" == "$REPO_ROOT/"* ]]
}

# compute relative path from repo root
as_relative_path() {
  local abs_path="$1"
  echo "${abs_path#$REPO_ROOT/}"
}

# expand glob pattern to array of files
expand_glob_to_files() {
  local pattern="$1"
  local -n result_array=$2
  eval "for f in $pattern; do [[ -f \"\$f\" || -L \"\$f\" ]] && result_array+=(\"\$f\"); done"
}

# check if index is last in array
is_last_index() {
  local index="$1"
  local count="$2"
  [[ $((index + 1)) -eq $count ]]
}

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
  expand_glob_to_files "$TARGET" FILES
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

  TARGET_ABS=$(compute_abs_path "$TARGET")

  # validate target is within repo
  if ! is_path_within_repo "$TARGET_ABS"; then
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

  TARGET_REL=$(as_relative_path "$TARGET_ABS")

  # copy to trash before removal
  findsert_trash_dir
  mkdir -p "$TRASH_DIR/$(dirname "$TARGET_REL")"
  cp -rP "$TARGET_ABS" "$TRASH_DIR/$TARGET_REL"

  # perform the removal
  rm -rf "$TARGET_ABS"

  # output
  print_turtle_header "sweet"
  print_tree_start "rmsafe"
  print_tree_branch "path" "$TARGET"
  print_tree_branch "type" "directory"
  print_tree_leaf "removed"
  print_tree_file_line "$TARGET_REL" true
  print_coconut_hint ".agent/.cache/repo=ehmpathy/role=mechanic/skill=rmsafe/trash/$TARGET_REL" "./$TARGET_REL"
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
  IS_LAST=$(is_last_index "$i" "$FILE_COUNT" && echo "true" || echo "false")

  TARGET_ABS=$(compute_abs_path "$FILE")

  # validate target is within repo
  if ! is_path_within_repo "$TARGET_ABS"; then
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

  TARGET_REL=$(as_relative_path "$TARGET_ABS")

  # copy to trash before removal
  findsert_trash_dir
  mkdir -p "$TRASH_DIR/$(dirname "$TARGET_REL")"
  cp -P "$TARGET_ABS" "$TRASH_DIR/$TARGET_REL"

  # perform the removal
  rm "$TARGET_ABS"

  # output relative path
  print_tree_file_line "$TARGET_REL" "$IS_LAST"

  REMOVED_COUNT=$((REMOVED_COUNT + 1))
  LAST_TARGET_REL="$TARGET_REL"
done

# show coconut hint for restore (use first file if multiple)
if [[ $REMOVED_COUNT -gt 0 ]]; then
  FIRST_ABS=$(compute_abs_path "${FILES[0]}")
  FIRST_REL=$(as_relative_path "$FIRST_ABS")
  print_coconut_hint ".agent/.cache/repo=ehmpathy/role=mechanic/skill=rmsafe/trash/$FIRST_REL" "./$FIRST_REL"
fi
