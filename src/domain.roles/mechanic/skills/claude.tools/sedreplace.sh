#!/usr/bin/env bash
######################################################################
# .what = safe find-and-replace across git-tracked files only
#
# .why  = enables bulk text replacement without:
#         - touching files outside the repo
#         - modifying untracked files
#         - accidental command chaining attacks
#
#         this is a controlled alternative to raw sed, which is
#         denied in permissions due to security risks.
#
# usage:
#   sedreplace.sh --old "pattern" --new "replacement"                        # plan (default)
#   sedreplace.sh --old "pattern" --new "replacement" --mode plan            # plan (explicit)
#   sedreplace.sh --old "pattern" --new "replacement" --mode apply           # apply
#   sedreplace.sh --old "pattern" --new "replacement" --glob "*.ts"          # filter
#
# guarantee:
#   - only operates on git-tracked files (git ls-files)
#   - plan mode by default (shows diff, no changes)
#   - requires --mode apply to apply changes
#   - fail-fast on errors
######################################################################
set -euo pipefail

# parse named arguments
OLD_PATTERN=""
NEW_PATTERN=""
NEW_PROVIDED=false
GLOB_FILTER=""
MODE="plan"

while [[ $# -gt 0 ]]; do
  case $1 in
    --old)
      OLD_PATTERN="$2"
      shift 2
      ;;
    --new)
      NEW_PATTERN="$2"
      NEW_PROVIDED=true
      shift 2
      ;;
    --glob)
      GLOB_FILTER="$2"
      shift 2
      ;;
    --mode)
      MODE="$2"
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
    *)
      echo "unknown argument: $1" >&2
      echo "usage: sedreplace.sh --old 'pattern' --new 'replacement' [--glob '*.ts'] [--mode plan|apply]" >&2
      exit 1
      ;;
  esac
done

# validate required args
if [[ -z "$OLD_PATTERN" ]]; then
  echo "error: --old pattern is required" >&2
  exit 1
fi

if [[ "$NEW_PROVIDED" == "false" ]]; then
  echo "error: --new replacement is required (use --new \"\" for empty replacement)" >&2
  exit 1
fi

# validate mode
if [[ "$MODE" != "plan" && "$MODE" != "apply" ]]; then
  echo "error: --mode must be 'plan' or 'apply' (got '$MODE')" >&2
  exit 1
fi

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository" >&2
  exit 1
fi

# escape special characters for sed pattern (BRE)
# special chars to escape: . * [ ] ^ $ \
# also escape the delimiter (#)
escape_sed_pattern() {
  printf '%s' "$1" | sed 's/[.[\*^$\]/\\&/g; s/#/\\#/g'
}

# escape special characters for sed replacement
# special chars to escape: & \ and the delimiter (#)
escape_sed_replacement() {
  printf '%s' "$1" | sed 's/[&\]/\\&/g; s/#/\\#/g'
}

# display glob for output
GLOB_DISPLAY="${GLOB_FILTER:-(all)}"

# get git-tracked files, optionally filtered by glob
# note: use :(glob) magic pathspec for proper shell-like glob behavior
# without this, git ls-files uses pathspec matching where * matches /
if [[ -n "$GLOB_FILTER" ]]; then
  FILES=$(git ls-files ":(glob)$GLOB_FILTER")
else
  FILES=$(git ls-files)
fi

if [[ -z "$FILES" ]]; then
  echo "🐢 lets see..."
  echo ""
  echo "🐚 sedreplace"
  echo "   ├─ old: $OLD_PATTERN"
  echo "   ├─ new: $NEW_PATTERN"
  echo "   ├─ glob: $GLOB_DISPLAY"
  echo "   └─ result: no files match the criteria"
  exit 0
fi

# find files that contain the pattern (use -F for fixed-string match, no regex)
FILES_MATCHED=$(echo "$FILES" | xargs grep -F -l "$OLD_PATTERN" 2>/dev/null || true)

if [[ -z "$FILES_MATCHED" ]]; then
  echo "🐢 lets see..."
  echo ""
  echo "🐚 sedreplace"
  echo "   ├─ old: $OLD_PATTERN"
  echo "   ├─ new: $NEW_PATTERN"
  echo "   ├─ glob: $GLOB_DISPLAY"
  echo "   └─ result: no files contain pattern"
  exit 0
fi

# count files and lines (pre-pass for tree header)
MATCH_COUNT=$(echo "$FILES_MATCHED" | wc -l)
TOTAL_LINES=0
for file in $FILES_MATCHED; do
  LINE_COUNT=$(grep -F -c "$OLD_PATTERN" "$file")
  TOTAL_LINES=$((TOTAL_LINES + LINE_COUNT))
done

# prepare escaped patterns for sed
OLD_ESCAPED=$(escape_sed_pattern "$OLD_PATTERN")
NEW_ESCAPED=$(escape_sed_replacement "$NEW_PATTERN")

# output turtle header + tree
if [[ "$MODE" == "plan" ]]; then
  echo "🐢 lets see..."
else
  echo "🐢 cool"
fi
echo ""
echo "🐚 sedreplace"
echo "   ├─ mode: $MODE"
echo "   ├─ old: $OLD_PATTERN"
echo "   ├─ new: $NEW_PATTERN"
echo "   ├─ glob: $GLOB_DISPLAY"
echo "   └─ result"
echo "      ├─ files: $MATCH_COUNT"
echo "      └─ lines: $TOTAL_LINES"

if [[ "$MODE" == "plan" ]]; then
  # plan mode: show what would change (no modifications)
  echo ""

  for file in $FILES_MATCHED; do
    LINE_COUNT=$(grep -F -c "$OLD_PATTERN" "$file")
    echo "--- $file ($LINE_COUNT lines) ---"
    # show the diff that would result (use # as delimiter to avoid conflicts)
    sed "s#$OLD_ESCAPED#$NEW_ESCAPED#g" "$file" | diff -u "$file" - || true
    echo ""
  done

  echo "note: this was a plan. to apply, re-run with --mode apply"
else
  # apply mode: apply changes
  echo ""

  for file in $FILES_MATCHED; do
    LINE_COUNT=$(grep -F -c "$OLD_PATTERN" "$file")
    # use sed -i for in-place edit (use # as delimiter to avoid conflicts)
    # note: macOS sed requires -i '' but linux sed uses -i
    if [[ "$(uname)" == "Darwin" ]]; then
      sed -i '' "s#$OLD_ESCAPED#$NEW_ESCAPED#g" "$file"
    else
      sed -i "s#$OLD_ESCAPED#$NEW_ESCAPED#g" "$file"
    fi
    echo "   updated: $file ($LINE_COUNT lines)"
  done

  echo ""
  echo "   to undo: git checkout ."
fi
