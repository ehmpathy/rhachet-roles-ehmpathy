#!/usr/bin/env bash
######################################################################
# .what = safe find-and-replace across all files within repo
#
# .why  = enables bulk text replacement without:
#         - access to files outside the repo
#         - accidental command chain attacks
#
#         this is a controlled alternative to raw sed, which is
#         denied in permissions due to security risks.
#
# usage:
#   sedreplace.sh --old "pattern" --new "replacement"                        # plan (default)
#   sedreplace.sh --old "pattern" --new "replacement" --mode plan            # plan (explicit)
#   sedreplace.sh --old "pattern" --new "replacement" --mode apply           # apply
#   sedreplace.sh --old "pattern" --new "replacement" --glob 'src/**/*.ts'   # filter (quoted)
#   sedreplace.sh --old "pattern" --new "replacement" --include-ignored      # include gitignored
#
# guarantee:
#   - operates on all files within repo (tracked and untracked, gitignored excluded)
#   - excludes gitignored files by default (e.g., node_modules)
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
INCLUDE_IGNORED=false

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
    --include-ignored)
      INCLUDE_IGNORED=true
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
    *)
      echo "unknown argument: $1" >&2
      echo "usage: sedreplace.sh --old 'pattern' --new 'replacement' [--glob '*.ts'] [--mode plan|apply]" >&2
      exit 2
      ;;
  esac
done

# validate required args
if [[ -z "$OLD_PATTERN" ]]; then
  echo "error: --old pattern is required" >&2
  exit 2
fi

if [[ "$NEW_PROVIDED" == "false" ]]; then
  echo "error: --new replacement is required (use --new \"\" for empty replacement)" >&2
  exit 2
fi

# validate mode
if [[ "$MODE" != "plan" && "$MODE" != "apply" ]]; then
  echo "error: --mode must be 'plan' or 'apply' (got '$MODE')" >&2
  exit 2
fi

# validate glob pattern (block unbound globs)
if [[ -n "$GLOB_FILTER" && "$GLOB_FILTER" == \*\*/* ]]; then
  {
    echo "🐢 bummer dude..."
    echo ""
    echo "🐚 sedreplace"
    echo "   └─ ✋ blocked: unbound glob"
    echo ""
    echo "glob patterns that start with **/ are too broad and can cause unexpected changes."
    echo ""
    echo "use a bounded glob instead:"
    echo "  --glob 'src/**/*.ts'      (files in src/)"
    echo "  --glob 'src/**/*.test.ts' (test files in src/)"
    echo "  --glob '*.ts'             (files in root only)"
  } >&2
  exit 2
fi

# plan tracker functions
# note: follows HARDNUDGE pattern - track plans, block applies without prior plan

find_claude_dir() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -d "$dir/.claude" ]]; then
      echo "$dir/.claude"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  # create .claude in git root if not found
  local git_root
  git_root=$(git rev-parse --show-toplevel 2>/dev/null) || return 1
  mkdir -p "$git_root/.claude"
  echo "$git_root/.claude"
}

NUDGE_FILE=""
init_nudge_file() {
  local claude_dir
  claude_dir=$(find_claude_dir) || return 1
  NUDGE_FILE="$claude_dir/sedreplace.nudges.local.json"
  if [[ ! -f "$NUDGE_FILE" ]]; then
    echo '{}' > "$NUDGE_FILE"
  fi
}

compute_plan_key() {
  echo -n "${OLD_PATTERN}|${NEW_PATTERN}|${GLOB_FILTER}" | sha256sum | cut -d' ' -f1
}

cleanup_stale_nudges() {
  [[ -z "$NUDGE_FILE" || ! -f "$NUDGE_FILE" ]] && return
  local now
  now=$(date +%s)
  local one_hour_ago=$((now - 3600))
  # remove entries older than 1 hour
  local tmp_file
  tmp_file=$(mktemp)
  jq --argjson cutoff "$one_hour_ago" 'with_entries(select(.value.time > $cutoff))' "$NUDGE_FILE" > "$tmp_file" 2>/dev/null && mv "$tmp_file" "$NUDGE_FILE" || rm -f "$tmp_file"
}

record_plan() {
  [[ -z "$NUDGE_FILE" ]] && return
  local key="$1"
  local now
  now=$(date +%s)
  local tmp_file
  tmp_file=$(mktemp)
  jq --arg key "$key" \
     --arg old "$OLD_PATTERN" \
     --arg new "$NEW_PATTERN" \
     --arg glob "$GLOB_FILTER" \
     --argjson time "$now" \
     '. + {($key): {time: $time, old: $old, new: $new, glob: $glob}}' \
     "$NUDGE_FILE" > "$tmp_file" && mv "$tmp_file" "$NUDGE_FILE"
}

plan_exists() {
  [[ -z "$NUDGE_FILE" || ! -f "$NUDGE_FILE" ]] && return 1
  local key="$1"
  jq -e --arg key "$key" '.[$key]' "$NUDGE_FILE" > /dev/null 2>&1
}

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository" >&2
  exit 2
fi

# initialize plan tracker and cleanup stale entries
init_nudge_file
cleanup_stale_nudges

# compute plan key for plan tracker
PLAN_KEY=$(compute_plan_key)

# if apply mode, check for prior plan first
if [[ "$MODE" == "apply" ]]; then
  if ! plan_exists "$PLAN_KEY"; then
    {
      echo "🐢 bummer dude..."
      echo ""
      echo "🐚 sedreplace"
      echo "   └─ ✋ blocked: cannot apply without plan"
      echo ""
      echo "to prevent unexpected consequences, sedreplace requires you to preview changes before apply."
      echo ""
      echo "run without --mode (or with --mode plan) first, then re-run with --mode apply."
    } >&2
    exit 2
  fi
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

# get all files in repo, optionally filtered by glob
# note: use :(glob) magic pathspec for proper shell-like glob behavior
# without this, git ls-files uses pathspec match where * matches /
# --cached = tracked files, --others = untracked files
# --exclude-standard = exclude gitignored (default), omit for --include-ignored
if [[ "$INCLUDE_IGNORED" == "true" ]]; then
  # include gitignored files (tracked + all untracked)
  if [[ -n "$GLOB_FILTER" ]]; then
    FILES=$(git ls-files --cached --others ":(glob)$GLOB_FILTER")
  else
    FILES=$(git ls-files --cached --others)
  fi
else
  # exclude gitignored files (default)
  if [[ -n "$GLOB_FILTER" ]]; then
    FILES=$(git ls-files --cached --others --exclude-standard ":(glob)$GLOB_FILTER")
  else
    FILES=$(git ls-files --cached --others --exclude-standard)
  fi
fi

if [[ -z "$FILES" ]]; then
  echo "🐢 crickets..."
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
  echo "🐢 crickets..."
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

# helper: print file diff in sub.bucket format
print_file_diff() {
  local file="$1"
  local match_count="$2"
  local is_last="$3"
  local prefix="      "

  # branch character for this file
  if [[ "$is_last" == "true" ]]; then
    echo "${prefix}└─ $file ($match_count)"
    prefix="         "
  else
    echo "${prefix}├─ $file ($match_count)"
    prefix="      │  "
  fi

  # open sub.bucket
  echo "${prefix}├─"

  # get diff lines (only the +/- lines, skip headers)
  local diff_output
  diff_output=$(sed "s#$OLD_ESCAPED#$NEW_ESCAPED#g" "$file" | diff -u "$file" - 2>/dev/null | grep -E '^[-+][^-+]' | head -6 || true)

  # print diff lines with proper prefix
  if [[ -n "$diff_output" ]]; then
    echo "$diff_output" | while IFS= read -r line; do
      echo "${prefix}│  $line"
    done
  fi

  # close sub.bucket
  echo "${prefix}└─"
}

# helper: print file diff with pre-computed content (for apply mode)
print_file_diff_with_content() {
  local file="$1"
  local match_count="$2"
  local is_last="$3"
  local diff_output="$4"
  local prefix="      "

  # branch character for this file
  if [[ "$is_last" == "true" ]]; then
    echo "${prefix}└─ $file ($match_count)"
    prefix="         "
  else
    echo "${prefix}├─ $file ($match_count)"
    prefix="      │  "
  fi

  # open sub.bucket
  echo "${prefix}├─"

  # print diff lines with proper prefix
  if [[ -n "$diff_output" ]]; then
    echo "$diff_output" | while IFS= read -r line; do
      echo "${prefix}│  $line"
    done
  fi

  # close sub.bucket
  echo "${prefix}└─"
}

# output turtle header + tree
if [[ "$MODE" == "plan" ]]; then
  echo "🐢 heres the wave..."
else
  echo "🐢 sweet"
fi
echo ""
echo "🐚 sedreplace --mode $MODE"
echo "   ├─ old: $OLD_PATTERN"
echo "   ├─ new: $NEW_PATTERN"
echo "   ├─ glob: $GLOB_DISPLAY"
echo "   ├─ files: $MATCH_COUNT"
echo "   ├─ matches: $TOTAL_LINES"

if [[ "$MODE" == "plan" ]]; then
  # plan mode: show what would change (no modifications)
  echo "   └─ preview"

  # show first few files with sub.bucket diffs
  file_index=0
  file_count=0
  file_count=$(echo "$FILES_MATCHED" | wc -l)

  for file in $FILES_MATCHED; do
    file_index=$((file_index + 1))
    LINE_COUNT=$(grep -F -c "$OLD_PATTERN" "$file")

    # only show first 3 files in detail
    if [[ $file_index -le 3 ]]; then
      is_last="false"
      if [[ $file_index -eq $file_count ]] || [[ $file_index -eq 3 && $file_count -gt 3 ]]; then
        is_last="true"
      fi
      print_file_diff "$file" "$LINE_COUNT" "$is_last"
    fi
  done

  # show "... (N more files)" if there are more
  if [[ $file_count -gt 3 ]]; then
    more_count=$((file_count - 3))
    echo "      └─ ... ($more_count more files)"
  fi

  echo ""
  echo "run with --mode apply to execute"

  # record the plan for later apply
  record_plan "$PLAN_KEY"
else
  # apply mode: apply changes
  echo "   └─ updated"

  file_index=0
  file_count=0
  file_count=$(echo "$FILES_MATCHED" | wc -l)

  for file in $FILES_MATCHED; do
    file_index=$((file_index + 1))
    LINE_COUNT=$(grep -F -c "$OLD_PATTERN" "$file")

    # capture diff BEFORE apply (so we can show before/after)
    local_diff=""
    if [[ $file_index -le 3 ]]; then
      local_diff=$(sed "s#$OLD_ESCAPED#$NEW_ESCAPED#g" "$file" | diff -u "$file" - 2>/dev/null | grep -E '^[-+][^-+]' | head -6 || true)
    fi

    # use sed -i for in-place edit (use # as delimiter to avoid conflicts)
    # note: macOS sed requires -i '' but linux sed uses -i
    if [[ "$(uname)" == "Darwin" ]]; then
      sed -i '' "s#$OLD_ESCAPED#$NEW_ESCAPED#g" "$file"
    else
      sed -i "s#$OLD_ESCAPED#$NEW_ESCAPED#g" "$file"
    fi

    # only show first 3 files in detail
    if [[ $file_index -le 3 ]]; then
      is_last="false"
      if [[ $file_index -eq $file_count ]] || [[ $file_index -eq 3 && $file_count -gt 3 ]]; then
        is_last="true"
      fi
      # print file with captured diff (not computed after apply)
      print_file_diff_with_content "$file" "$LINE_COUNT" "$is_last" "$local_diff"
    fi
  done

  # show "... (N more files)" if there are more
  if [[ $file_count -gt 3 ]]; then
    more_count=$((file_count - 3))
    echo "      └─ ... ($more_count more files)"
  fi
fi
