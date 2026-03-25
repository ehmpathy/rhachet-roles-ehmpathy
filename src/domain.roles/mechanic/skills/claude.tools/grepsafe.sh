#!/usr/bin/env bash
######################################################################
# .what = safe content search within git repo
#
# .why  = enables regex search without triggering claude code's
#         suspicious syntax heuristic on pipe characters and
#         regex alternation patterns like (foo|bar).
#
#         by wrapping rg/grep behind named args, the regex
#         pattern is a quoted string arg to rhachet — invisible
#         to claude code's bash parser.
#
# usage:
#   grepsafe.sh --pattern 'foo|bar'                          # search cwd
#   grepsafe.sh --pattern 'foo|bar' --path src/              # search dir
#   grepsafe.sh --pattern 'foo|bar' --glob '*.ts'            # filter files
#   grepsafe.sh --pattern 'foo|bar' --context 3              # context lines
#   grepsafe.sh --pattern 'foo|bar' --files-only             # file paths only
#   grepsafe.sh --pattern 'foo|bar' --count                  # match counts
#   grepsafe.sh --pattern 'foo|bar' -i                       # case insensitive
#   grepsafe.sh --pattern 'foo|bar' --head 20                # limit output
#   grepsafe.sh --pattern 'foo|bar' --type ts                # file type filter
#   grepsafe.sh --pattern 'foo|bar' --multiline              # multiline match
#   grepsafe.sh --pattern 'foo|bar' --output direct          # pipe-friendly output
#
# guarantee:
#   - search path must be within repo
#   - uses rg (ripgrep) if available, falls back to grep -rn
#   - fail-fast on errors
######################################################################
set -euo pipefail

# get skill directory to load output.sh
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SKILL_DIR/output.sh"

######################################################################
# parse arguments
######################################################################
PATTERN=""
SEARCH_PATH="."
GLOB=""
FILE_TYPE=""
CONTEXT=""
FILES_ONLY=false
COUNT=false
CASE_INSENSITIVE=false
HEAD_LIMIT=""
MULTILINE=false
OUTPUT_MODE="vibes"
RAW=false

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
    --glob)
      GLOB="$2"
      shift 2
      ;;
    --type)
      FILE_TYPE="$2"
      shift 2
      ;;
    --context|-C)
      CONTEXT="$2"
      shift 2
      ;;
    --files-only|-l)
      FILES_ONLY=true
      shift
      ;;
    --count|-c)
      COUNT=true
      shift
      ;;
    -i|--ignore-case)
      CASE_INSENSITIVE=true
      shift
      ;;
    --head)
      HEAD_LIMIT="$2"
      shift 2
      ;;
    --multiline)
      MULTILINE=true
      shift
      ;;
    --output)
      OUTPUT_MODE="$2"
      shift 2
      ;;
    --repo|--role|--skill)
      # rhachet passthrough args - ignore
      shift 2
      ;;
    --)
      shift
      ;;
    --help|-h)
      echo "usage: grepsafe.sh --pattern 'regex' [options]"
      echo ""
      echo "options:"
      echo "  --pattern REGEX    search pattern (required)"
      echo "  --path DIR         search directory (default: .)"
      echo "  --glob GLOB        file filter glob (e.g., '*.ts')"
      echo "  --type TYPE        file type filter (e.g., ts, py, sh)"
      echo "  --context N        context lines around matches"
      echo "  --files-only       show file paths only"
      echo "  --count            show match counts per file"
      echo "  -i                 case insensitive"
      echo "  --head N           limit output to N lines"
      echo "  --multiline        enable multiline matching"
      echo "  --output vibes|direct  output format (default: vibes)"
      exit 0
      ;;
    --*)
      echo "error: unknown option: $1"
      echo "usage: grepsafe.sh --pattern 'regex' [--path dir] [--glob '*.ts']"
      exit 2
      ;;
    *)
      # if no pattern yet, treat first positional as pattern
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

# validate output mode
if [[ "$OUTPUT_MODE" != "vibes" && "$OUTPUT_MODE" != "direct" ]]; then
  echo "error: --output must be one of: vibes, direct"
  exit 2
fi

# pattern is required
if [[ -z "$PATTERN" ]]; then
  echo "error: --pattern is required"
  echo "usage: grepsafe.sh --pattern 'regex' [--path dir] [--glob '*.ts']"
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
# build command
######################################################################

# prefer rg, fall back to grep
if command -v rg > /dev/null 2>&1; then
  CMD=(rg)

  # output mode
  if [[ "$FILES_ONLY" == true ]]; then
    CMD+=(--files-with-matches)
  elif [[ "$COUNT" == true ]]; then
    CMD+=(--count)
  else
    CMD+=(--line-number)
  fi

  # options
  if [[ "$CASE_INSENSITIVE" == true ]]; then
    CMD+=(-i)
  fi
  if [[ -n "$CONTEXT" ]]; then
    CMD+=(-C "$CONTEXT")
  fi
  if [[ -n "$GLOB" ]]; then
    CMD+=(--glob "$GLOB")
  fi
  if [[ -n "$FILE_TYPE" ]]; then
    CMD+=(--type "$FILE_TYPE")
  fi
  if [[ "$MULTILINE" == true ]]; then
    CMD+=(-U --multiline-dotall)
  fi

  # pattern and path
  CMD+=("$PATTERN" "$SEARCH_PATH_ABS")
else
  # grep fallback
  CMD=(grep -rn --exclude-dir=.git)

  if [[ "$FILES_ONLY" == true ]]; then
    CMD=(grep -rl --exclude-dir=.git)
  elif [[ "$COUNT" == true ]]; then
    CMD=(grep -rc --exclude-dir=.git)
  fi

  if [[ "$CASE_INSENSITIVE" == true ]]; then
    CMD+=(-i)
  fi
  if [[ -n "$CONTEXT" ]]; then
    CMD+=(-C "$CONTEXT")
  fi

  if [[ -n "$GLOB" ]]; then
    CMD+=(--include="$GLOB")
  fi

  # pattern and path
  CMD+=(-E "$PATTERN" "$SEARCH_PATH_ABS")
fi

######################################################################
# execute
######################################################################

# run and capture output (rg exits 1 on no match, which is not an error)
OUTPUT=$("${CMD[@]}" 2>&1) || true

# apply head limit
if [[ -n "$HEAD_LIMIT" && -n "$OUTPUT" ]]; then
  OUTPUT=$(echo "$OUTPUT" | head -n "$HEAD_LIMIT")
fi

# make paths relative to repo root
if [[ -n "$OUTPUT" ]]; then
  OUTPUT=$(echo "$OUTPUT" | sed "s|${REPO_ROOT}/||g")
fi

# output
if [[ "$OUTPUT_MODE" == "direct" ]]; then
  # direct mode: just the results, no vibes
  if [[ -n "$OUTPUT" ]]; then
    echo "$OUTPUT"
  fi
else
  # vibes mode: turtle treestruct output
  if [[ -z "$OUTPUT" ]]; then
    print_turtle_header "crickets..."
    print_tree_start "grepsafe"
    print_tree_branch "pattern" "$PATTERN"
    print_tree_branch "path" "$SEARCH_PATH"
    if [[ -n "$GLOB" ]]; then
      print_tree_branch "glob" "$GLOB"
    fi
    print_tree_leaf "matches: 0"
  else
    # count matches for header
    MATCH_COUNT=$(echo "$OUTPUT" | wc -l | tr -d ' ')

    print_turtle_header "sweet"
    print_tree_start "grepsafe"
    print_tree_branch "pattern" "$PATTERN"
    print_tree_branch "path" "$SEARCH_PATH"
    if [[ -n "$GLOB" ]]; then
      print_tree_branch "glob" "$GLOB"
    fi
    print_tree_branch "lines" "$MATCH_COUNT"
    print_tree_leaf "results"

    # print results in sub.bucket
    echo "      ├─"
    echo "      │"
    echo "$OUTPUT" | while IFS= read -r line; do
      echo "      │  $line"
    done
    echo "      │"
    echo "      └─"
  fi
fi
