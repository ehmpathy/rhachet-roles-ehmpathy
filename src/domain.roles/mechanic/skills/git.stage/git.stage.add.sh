#!/usr/bin/env bash
######################################################################
# .what = stage files for commit with permission check
#
# .why  = mechanics can stage files without human intervention
#         when stage permission is granted
#
# usage:
#   rhx git.stage.add src/file1.ts src/file2.ts    # stage specific files
#   rhx git.stage.add src/**/*.ts                  # stage via shell glob
#   rhx git.stage.add .                            # stage all in current dir
#
# guarantee:
#   - requires stage permission via .meter/git.commit.uses.jsonc
#   - does NOT decrement uses (uses counts commits only)
#   - paths must be within repo
#   - idempotent: re-stage of staged file is no-op
#   - fail-fast: if any file not found, entire operation fails
######################################################################

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMIT_SKILL_DIR="$(cd "$SKILL_DIR/../git.commit" && pwd)"

# source shared utils
source "$COMMIT_SKILL_DIR/output.sh"

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository"
  exit 2
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
METER_DIR="$REPO_ROOT/.meter"
STATE_FILE="$METER_DIR/git.commit.uses.jsonc"

# global blocker path
ROLE_REPO="ehmpathy"
ROLE_SLUG="mechanic"
GLOBAL_METER_FILE="$HOME/.rhachet/storage/repo=$ROLE_REPO/role=$ROLE_SLUG/.meter/git.commit.uses.jsonc"

######################################################################
# parse arguments
######################################################################
FILES=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --help|-h)
      echo "usage: git.stage.add path1 path2 ...    # stage specific files"
      echo "       git.stage.add src/**/*.ts        # stage via shell glob"
      echo "       git.stage.add .                  # stage all in current dir"
      echo ""
      echo "options:"
      echo "  --help, -h    show this help"
      echo ""
      echo "constraints:"
      echo "  - requires stage permission (--stage allow)"
      echo "  - paths must be within repo"
      exit 0
      ;;
    --repo|--role|--skill)
      # rhachet passthrough args - ignore
      shift
      if [[ $# -gt 0 && "$1" != --* && "$1" != -* ]]; then
        shift
      fi
      ;;
    --)
      shift
      ;;
    --*)
      echo "error: unknown option: $1"
      exit 2
      ;;
    *)
      # file path
      FILES+=("$1")
      shift
      ;;
  esac
done

######################################################################
# guards
######################################################################

# guard: at least one path required
if [[ ${#FILES[@]} -eq 0 ]]; then
  print_turtle_header "hold up dude..."
  print_tree_start "git.stage.add"
  print_tree_error "no files specified"
  echo ""
  echo "usage: git.stage.add path1 path2 ..."
  echo "       git.stage.add .                  # stage all"
  exit 2
fi

# guard: global blocker check
if [[ -f "$GLOBAL_METER_FILE" ]]; then
  if BLOCKED_VAL=$(jq -r '.blocked // false' "$GLOBAL_METER_FILE" 2>/dev/null); then
    if [[ "$BLOCKED_VAL" == "true" ]]; then
      print_turtle_header "bummer dude..."
      print_tree_start "git.stage.add"
      print_tree_error "globally blocked"
      echo ""
      echo "a human has blocked all mechanic operations"
      echo "ask your human to lift the blocker:"
      echo "  \$ git.commit.uses allow --global"
      exit 2
    fi
  fi
fi

# guard: stage permission check
if [[ ! -f "$STATE_FILE" ]]; then
  print_turtle_header "hold up dude..."
  print_tree_start "git.stage.add"
  print_tree_error "stage not allowed"
  echo ""
  echo "ask your human to grant stage permission:"
  echo "  \$ git.commit.uses set --quant N --push allow|block --stage allow"
  exit 2
fi

STAGE_ALLOWED=$(jq -r '.stage // "block"' "$STATE_FILE")
if [[ "$STAGE_ALLOWED" != "allow" ]]; then
  print_turtle_header "hold up dude..."
  print_tree_start "git.stage.add"
  print_tree_error "stage not allowed"
  echo ""
  echo "ask your human to grant stage permission:"
  echo "  \$ git.commit.uses set --quant N --push allow|block --stage allow"
  exit 2
fi

######################################################################
# validate paths
######################################################################
for file in "${FILES[@]}"; do
  # convert to absolute path
  if [[ "$file" = /* ]]; then
    abs_path="$file"
  else
    abs_path="$REPO_ROOT/$file"
  fi

  # expand path (via realpath-like expansion)
  abs_path=$(cd "$(dirname "$abs_path")" 2>/dev/null && pwd)/$(basename "$abs_path") || abs_path="$file"

  # guard: path must be within repo
  if [[ "$abs_path" != "$REPO_ROOT"* ]]; then
    print_turtle_header "hold up dude..."
    print_tree_start "git.stage.add"
    print_tree_error "path must be within repo"
    echo ""
    echo "path: $file"
    exit 2
  fi

  # guard: file must exist
  if [[ ! -e "$abs_path" ]]; then
    print_turtle_header "hold up dude..."
    print_tree_start "git.stage.add"
    print_tree_error "file not found: $file"
    exit 2
  fi
done

######################################################################
# stage files
######################################################################
cd "$REPO_ROOT"

STAGED_FILES=()
for file in "${FILES[@]}"; do
  git add "$file"
  STAGED_FILES+=("$file")
done

######################################################################
# output
######################################################################
print_turtle_header "gnarly!"
print_tree_start "git.stage.add"

if [[ ${#STAGED_FILES[@]} -eq 1 ]]; then
  echo "   └─ staged: ${STAGED_FILES[0]}"
else
  echo "   └─ staged"
  LAST_IDX=$((${#STAGED_FILES[@]} - 1))
  for i in "${!STAGED_FILES[@]}"; do
    if [[ $i -eq $LAST_IDX ]]; then
      echo "      └─ ${STAGED_FILES[$i]}"
    else
      echo "      ├─ ${STAGED_FILES[$i]}"
    fi
  done
fi
