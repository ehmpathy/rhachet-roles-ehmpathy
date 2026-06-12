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
      if [[ -z "${2:-}" ]]; then
        emit_error "error: --path requires a value"
        emit_error "usage: rmsafe.sh --path <path> [--recursive]"
        exit 2
      fi
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
      echo "  - trackable files go to trash for restore"
      echo "  - not trackable files are direct-deleted (no trash)"
      exit 0
      ;;
    --*)
      emit_error "error: unknown option: $1"
      emit_error "hint: use a valid option from --help"
      emit_error "usage: rmsafe.sh <path>"
      emit_error "       rmsafe.sh -r <path>"
      emit_error "       rmsafe.sh --path <path> [--recursive]"
      emit_error "       rmsafe.sh --literal <path>"
      emit_error "see: rmsafe.sh --help"
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
  emit_error "error: path is required"
  emit_error "hint: provide a path to delete"
  emit_error "usage: rmsafe.sh <path>"
  emit_error "       rmsafe.sh -r <path>"
  emit_error "       rmsafe.sh --path <path> [--recursive]"
  emit_error "see: rmsafe.sh --help"
  exit 2
fi

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  emit_error "error: not in a git repository"
  emit_error "hint: cd into a git repository or run 'git init' first"
  exit 2
fi

# get repo root (expand symlinks fully)
REPO_ROOT=$(realpath "$(git rev-parse --show-toplevel)")

# compute trash directory path
TRASH_CACHE_REL=".agent/.cache/repo=ehmpathy/role=mechanic/skill=rmsafe/trash"
TRASH_DIR="$REPO_ROOT/$TRASH_CACHE_REL"

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

# get trackable paths from git
# .what = returns trackable paths for a file or directory
# .why  = git is the source of truth. git ls-files --cached --others --exclude-standard
#         returns all trackable files (tracked + untracked but not ignored).
# .note = -c core.quotePath=false outputs literal unicode instead of octal escapes
get_trackable_paths() {
  local path="$1"
  git -c core.quotePath=false ls-files --cached --others --exclude-standard -- "$path" 2>/dev/null || true
}

# copy trackable files to trash
# .what = backs up trackable files before deletion
# .why  = trackable files go to trash for recovery; not trackable files skip trash
# .note = git ls-files returns paths relative to repo root
cp_trackable_to_trash() {
  local path="$1"
  local trackable_paths
  trackable_paths=$(get_trackable_paths "$path")

  local count=0
  if [[ -n "$trackable_paths" ]]; then
    findsert_trash_dir
    while IFS= read -r file_rel; do
      [[ -z "$file_rel" ]] && continue
      # git ls-files returns relative paths; construct absolute for cp
      local file_abs="$REPO_ROOT/$file_rel"
      mkdir -p "$TRASH_DIR/$(dirname "$file_rel")"
      cp -P "$file_abs" "$TRASH_DIR/$file_rel"
      count=$((count + 1))
    done <<< "$trackable_paths"
  fi

  echo "$count"
}

# compute relative path from repo root
as_relative_path() {
  local abs_path="$1"
  echo "${abs_path#$REPO_ROOT/}"
}

# expand glob pattern to array of files
# .note = uses compgen -G for safe glob expansion (handles escape sequences, no eval)
# .note = sorts results for consistent output order
expand_glob_to_files() {
  local pattern="$1"
  local -n result_array=$2
  local file
  while IFS= read -r file; do
    [[ -f "$file" || -L "$file" ]] && result_array+=("$file")
  done < <(compgen -G "$pattern" 2>/dev/null | sort)
}

# check if index is last in array
is_last_index() {
  local index="$1"
  local count="$2"
  [[ $((index + 1)) -eq $count ]]
}

# validate target is within repo and not repo root — fail-fast on violation
validate_target_within_repo_or_fail() {
  local abs_path="$1"
  if ! is_path_within_repo "$abs_path"; then
    emit_error "error: path must be within the git repository"
    emit_error "  repo root: $REPO_ROOT"
    emit_error "  path:      $abs_path"
    emit_error "hint: use a relative path from within the repo"
    exit 2
  fi
  if [[ "$abs_path" == "$REPO_ROOT" ]]; then
    emit_error "error: cannot delete the repository root"
    emit_error "hint: specify a subdirectory or file within the repo"
    exit 2
  fi
}

# detect if TARGET is a glob pattern or literal path
is_glob_pattern() {
  local pattern="$1"
  [[ "$pattern" == *"*"* || "$pattern" == *"?"* || "$pattern" == *"["* ]]
}

# default: check for glob pattern
IS_GLOB=$(is_glob_pattern "$TARGET" && echo "true" || echo "false")

# override: --literal flag forces literal interpretation
if [[ "$LITERAL" == true ]]; then
  IS_GLOB=false
fi

# expand glob pattern to array of files
FILES=()
IS_DIR_REMOVE=false
if [[ "$IS_GLOB" == "true" ]]; then
  expand_glob_to_files "$TARGET" FILES
else
  # literal path: validate directly
  if [[ ! -e "$TARGET" && ! -L "$TARGET" ]]; then
    emit_error "error: path does not exist: $TARGET"
    emit_error "hint: check the path and try again"
    emit_error "see: rmsafe.sh --help"
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
    emit_error "error: target is a directory, use -r or --recursive to delete"
    emit_error "hint: add -r flag to delete directories"
    emit_error "see: rmsafe.sh --help"
    exit 2
  fi

  TARGET_ABS=$(compute_abs_path "$TARGET")
  validate_target_within_repo_or_fail "$TARGET_ABS"
  TARGET_REL=$(as_relative_path "$TARGET_ABS")

  # copy trackable files to trash, then remove directory
  TRASHED_COUNT=$(cp_trackable_to_trash "$TARGET_ABS")
  rm -rf "$TARGET_ABS"

  # determine output type based on whether any trackable files existed
  DIR_TYPE="directory"
  if [[ $TRASHED_COUNT -eq 0 ]]; then
    DIR_TYPE="directory (not trackable)"
  fi

  # output
  print_turtle_header "sweet"
  print_tree_start "rmsafe"
  print_tree_branch "path" "$TARGET"
  print_tree_branch "type" "$DIR_TYPE"
  print_tree_leaf "removed"
  print_tree_file_line "$TARGET_REL/" true

  # only show coconut hint if trackable files were trashed
  if [[ $TRASHED_COUNT -gt 0 ]]; then
    print_coconut_hint "$TRASH_CACHE_REL/$TARGET_REL" "./$TARGET_REL"
  fi
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
TRASHED_COUNT=0
FIRST_TRASHED_REL=""
for i in "${!FILES[@]}"; do
  FILE="${FILES[$i]}"
  IS_LAST=$(is_last_index "$i" "$FILE_COUNT" && echo "true" || echo "false")

  TARGET_ABS=$(compute_abs_path "$FILE")
  validate_target_within_repo_or_fail "$TARGET_ABS"
  TARGET_REL=$(as_relative_path "$TARGET_ABS")

  # copy trackable file to trash, then remove
  FILE_TRASHED_COUNT=$(cp_trackable_to_trash "$TARGET_ABS")
  rm "$TARGET_ABS"

  # output based on whether file was trackable
  if [[ $FILE_TRASHED_COUNT -gt 0 ]]; then
    print_tree_file_line "$TARGET_REL" "$IS_LAST"
    TRASHED_COUNT=$((TRASHED_COUNT + 1))
    FIRST_TRASHED_REL="${FIRST_TRASHED_REL:-$TARGET_REL}"
  else
    print_tree_file_line "$TARGET_REL (not trackable)" "$IS_LAST"
  fi

  REMOVED_COUNT=$((REMOVED_COUNT + 1))
done

# show coconut hint for restore only if trackable files were trashed
if [[ $TRASHED_COUNT -gt 0 ]]; then
  print_coconut_hint "$TRASH_CACHE_REL/$FIRST_TRASHED_REL" "./$FIRST_TRASHED_REL"
fi
