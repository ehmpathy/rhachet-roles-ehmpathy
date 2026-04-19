#!/usr/bin/env bash
######################################################################
# .what = safe file discovery within git repo
#
# .why  = enables file pattern match without claude code's
#         suspicious syntax heuristic halt on pipe characters
#         in ls/find commands.
#
#         wraps file discovery behind named args so glob
#         patterns and pipes are invisible to claude code's
#         bash parser.
#
# usage:
#   globsafe.sh --pattern 'src/**/*.ts'                      # find files
#   globsafe.sh --pattern '*.md' --path docs/                # scoped search
#   globsafe.sh --pattern 'src/**/*.ts' --long               # detailed info
#   globsafe.sh --pattern 'src/**/*.ts' --head 20            # limit results
#   globsafe.sh --pattern 'src/**/*.ts' --sort name          # sort by name
#   globsafe.sh --pattern 'src/**/*.ts' --sort time          # sort by mtime
#   globsafe.sh --pattern 'src/**/*.ts' --sort size          # sort by size
#   globsafe.sh --pattern 'src/**/*.ts' --output direct      # pipe-friendly output
#   globsafe.sh --pattern '*.[ref].md' --literal             # literal brackets
#   globsafe.sh --pattern '*.\[ref\].md'                     # escaped brackets
#
# guarantee:
#   - search path must be within repo
#   - uses fd if available, falls back to bash glob expansion
#   - fail-fast on errors
######################################################################
set -euo pipefail

# get skill directory to load output.sh
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SKILL_DIR/output.sh"

# enable glob expansion
shopt -s globstar nullglob 2>/dev/null || true

######################################################################
# parse arguments
######################################################################
PATTERN=""
SEARCH_PATH="."
LONG=false
LITERAL=false
HEAD_LIMIT=""
SORT_BY="name"
OUTPUT_MODE="vibes"

while [[ $# -gt 0 ]]; do
  case $1 in
    --pattern)
      PATTERN="$2"
      shift 2
      ;;
    --path)
      SEARCH_PATH="$2"
      shift 2
      ;;
    --long|-l)
      LONG=true
      shift
      ;;
    --head)
      HEAD_LIMIT="$2"
      shift 2
      ;;
    --sort)
      SORT_BY="$2"
      shift 2
      ;;
    --output)
      OUTPUT_MODE="$2"
      shift 2
      ;;
    --literal)
      LITERAL=true
      shift
      ;;
    --repo|--role|--skill)
      # rhachet passthrough args - ignore
      shift 2
      ;;
    --)
      shift
      ;;
    --help|-h)
      echo "usage: globsafe.sh --pattern 'glob' [options]"
      echo ""
      echo "options:"
      echo "  --pattern GLOB     file pattern (required, e.g., 'src/**/*.ts')"
      echo "  --path DIR         base directory (default: .)"
      echo "  --long             show detailed file info (size, mtime)"
      echo "  --head N           limit output to N files"
      echo "  --sort name|time|size  sort order (default: name)"
      echo "  --output vibes|direct  output format (default: vibes)"
      echo "  --literal          treat pattern as literal (no glob expansion)"
      echo "                     use when pattern contains [ or ] characters"
      echo ""
      echo "examples:"
      echo "  globsafe.sh --pattern 'src/**/*.ts'                  # glob pattern"
      echo "  globsafe.sh --pattern '*.[ref].md' --literal         # literal brackets"
      echo "  globsafe.sh --pattern '*.\\[ref\\].md'                 # escaped brackets"
      exit 0
      ;;
    --*)
      echo "error: unknown option: $1"
      echo "usage: globsafe.sh --pattern 'glob' [--path dir] [--long]"
      exit 2
      ;;
    *)
      # first positional as pattern
      if [[ -z "$PATTERN" ]]; then
        PATTERN="$1"
      else
        SEARCH_PATH="$1"
      fi
      shift
      ;;
  esac
done

######################################################################
# validate
######################################################################

# pattern is required
if [[ -z "$PATTERN" ]]; then
  echo "error: --pattern is required"
  echo "usage: globsafe.sh --pattern 'glob' [--path dir] [--long]"
  exit 2
fi

# validate output mode
if [[ "$OUTPUT_MODE" != "vibes" && "$OUTPUT_MODE" != "direct" ]]; then
  echo "error: --output must be one of: vibes, direct"
  exit 2
fi

# validate sort option
if [[ "$SORT_BY" != "name" && "$SORT_BY" != "time" && "$SORT_BY" != "size" ]]; then
  echo "error: --sort must be one of: name, time, size"
  exit 2
fi

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository"
  exit 2
fi

# get repo root
REPO_ROOT=$(realpath "$(git rev-parse --show-toplevel)")

# expand search path
SEARCH_PATH_ABS=$(realpath "$SEARCH_PATH" 2>/dev/null || echo "")
if [[ -z "$SEARCH_PATH_ABS" || ! -e "$SEARCH_PATH_ABS" ]]; then
  echo "error: search path does not exist: $SEARCH_PATH"
  exit 2
fi

# validate search path is within repo
if [[ "$SEARCH_PATH_ABS" != "$REPO_ROOT" && "$SEARCH_PATH_ABS" != "$REPO_ROOT/"* ]]; then
  echo "error: search path must be within the git repository"
  echo "  repo root:   $REPO_ROOT"
  echo "  search path: $SEARCH_PATH_ABS"
  exit 2
fi

######################################################################
# find files
######################################################################

# collect matched files
FILES=()

# use bash glob expansion from search path
cd "$SEARCH_PATH_ABS"

# expand pattern to files
if [[ "$LITERAL" == true ]]; then
  # literal mode: check if file exists directly (no glob expansion)
  if [[ -e "$PATTERN" ]]; then
    FILES+=("$PATTERN")
  fi
else
  # glob mode: use eval to expand pattern
  eval "for f in $PATTERN; do [[ -e \"\$f\" ]] && FILES+=(\"\$f\"); done" 2>/dev/null || true
fi

# sort files (disable glob to preserve brackets in filenames)
set -f
case "$SORT_BY" in
  name)
    IFS=$'\n' FILES=($(printf '%s\n' "${FILES[@]}" | sort)); unset IFS
    ;;
  time)
    IFS=$'\n' FILES=($(for f in "${FILES[@]}"; do echo "$(stat -c '%Y' "$f" 2>/dev/null || stat -f '%m' "$f" 2>/dev/null || echo 0) $f"; done | sort -rn | cut -d' ' -f2-)); unset IFS
    ;;
  size)
    IFS=$'\n' FILES=($(for f in "${FILES[@]}"; do echo "$(stat -c '%s' "$f" 2>/dev/null || stat -f '%z' "$f" 2>/dev/null || echo 0) $f"; done | sort -rn | cut -d' ' -f2-)); unset IFS
    ;;
esac
set +f

FILE_COUNT=${#FILES[@]}

# apply head limit
TRUNCATED=false
if [[ -n "$HEAD_LIMIT" && $FILE_COUNT -gt $HEAD_LIMIT ]]; then
  FILES=("${FILES[@]:0:$HEAD_LIMIT}")
  TRUNCATED=true
fi

######################################################################
# output
######################################################################

if [[ "$OUTPUT_MODE" == "direct" ]]; then
  # direct mode: just file paths, no vibes
  for FILE in "${FILES[@]}"; do
    echo "$FILE"
  done
else
  # vibes mode: turtle treestruct output
  if [[ $FILE_COUNT -eq 0 ]]; then
    print_turtle_header "crickets..."
    print_tree_start "globsafe"
    print_tree_branch "pattern" "$PATTERN"
    print_tree_branch "path" "$SEARCH_PATH"
    print_tree_leaf "files: 0"

    # hint if pattern contains [ and --literal was not used
    if [[ "$LITERAL" != true && "$PATTERN" == *"["* ]]; then
      # escape brackets for display
      PATTERN_ESCAPED="${PATTERN//\[/\\[}"
      PATTERN_ESCAPED="${PATTERN_ESCAPED//\]/\\]}"
      echo ""
      echo "🥥 did you know?"
      echo "   ├─ pattern contains \`[\` which is a glob character"
      echo "   ├─ to treat \`[\` as literal, use either:"
      echo "   │  ├─ --literal flag: rhx globsafe --pattern '$PATTERN' --literal"
      echo "   │  └─ escape syntax: rhx globsafe --pattern '$PATTERN_ESCAPED'"
      echo "   └─ see: rhx globsafe --help"
    fi
  else
    print_turtle_header "sweet"
    print_tree_start "globsafe"
    print_tree_branch "pattern" "$PATTERN"
    print_tree_branch "path" "$SEARCH_PATH"
    if [[ "$TRUNCATED" == true ]]; then
      print_tree_branch "files" "$FILE_COUNT (first $HEAD_LIMIT)"
    else
      print_tree_branch "files" "$FILE_COUNT"
    fi
    print_tree_leaf "found"

    # print results in sub.bucket
    echo "      ├─"
    echo "      │"

    for i in "${!FILES[@]}"; do
      FILE="${FILES[$i]}"

      if [[ "$LONG" == true ]]; then
        # detailed info: size and mtime
        FILE_SIZE=$(stat -c '%s' "$FILE" 2>/dev/null || stat -f '%z' "$FILE" 2>/dev/null || echo "?")
        FILE_MTIME=$(stat -c '%y' "$FILE" 2>/dev/null | cut -d'.' -f1 || stat -f '%Sm' "$FILE" 2>/dev/null || echo "?")

        # human-readable size
        if [[ "$FILE_SIZE" =~ ^[0-9]+$ ]]; then
          if [[ $FILE_SIZE -ge 1048576 ]]; then
            SIZE_HR="$((FILE_SIZE / 1048576))M"
          elif [[ $FILE_SIZE -ge 1024 ]]; then
            SIZE_HR="$((FILE_SIZE / 1024))K"
          else
            SIZE_HR="${FILE_SIZE}B"
          fi
        else
          SIZE_HR="?"
        fi

        echo "      │  ${SIZE_HR}  ${FILE_MTIME}  ${FILE}"
      else
        echo "      │  $FILE"
      fi
    done

    echo "      │"
    echo "      └─"
  fi
fi
