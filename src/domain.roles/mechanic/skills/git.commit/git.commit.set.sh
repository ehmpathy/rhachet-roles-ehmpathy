#!/usr/bin/env bash
######################################################################
# .what = create git commit as seaturtle[bot] with human co-author
#
# .why  = mechanics commit under their own identity while crediting
#         the human who delegated the work
#
# usage:
#   git.commit.set --message "fix(api): validate input"
#   git.commit.set --message "fix(api): validate input" --push
#   git.commit.set --message "fix(api): validate input" --unstaged ignore
#   git.commit.set --message "fix(api): validate input" --unstaged include
#
# guarantee:
#   - author is seaturtle[bot] <seaturtle@ehmpath.com>
#   - Co-authored-by trailer with human's git identity
#   - requires quota from git.commit.uses
#   - push only if allowed and requested
#   - fails fast if unstaged changes exist (unless --unstaged ignore|include)
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/output.sh"

# robot identity (currently seaturtle[bot])
ROBOT_NAME="seaturtle[bot]"
ROBOT_EMAIL="seaturtle@ehmpath.com"

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository"
  exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
METER_DIR="$REPO_ROOT/.meter"
STATE_FILE="$METER_DIR/git.commit.uses.jsonc"

# parse arguments
MESSAGE=""
DO_PUSH=false
UNSTAGED=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --message|-m)
      MESSAGE="$2"
      shift 2
      ;;
    --push)
      DO_PUSH=true
      shift
      ;;
    --unstaged)
      UNSTAGED="$2"
      shift 2
      ;;
    --help|-h)
      echo "usage: git.commit.set --message \"...\" [--push] [--unstaged ignore|include]"
      echo ""
      echo "options:"
      echo "  --message, -m          commit message (required)"
      echo "  --push                 push after commit (requires push permission)"
      echo "  --unstaged ignore      proceed despite unstaged changes (commit staged only)"
      echo "  --unstaged include     stage all unstaged changes before commit"
      echo "  --help, -h             show this help"
      exit 0
      ;;
    --repo|--role|--skill)
      # rhachet passthrough args - ignore
      shift 2
      ;;
    --)
      shift
      ;;
    --*)
      echo "error: unknown option: $1"
      echo "usage: git.commit.set --message \"...\" [--push]"
      exit 1
      ;;
    *)
      shift
      ;;
  esac
done

# validate --message
if [[ -z "$MESSAGE" ]]; then
  echo "error: --message is required"
  echo "usage: git.commit.set --message \"...\" [--push] [--unstaged ignore|include]"
  exit 1
fi

# validate --unstaged value
if [[ -n "$UNSTAGED" && "$UNSTAGED" != "ignore" && "$UNSTAGED" != "include" ]]; then
  echo "error: --unstaged must be 'ignore' or 'include'"
  echo "usage: git.commit.set --message \"...\" [--push] [--unstaged ignore|include]"
  exit 1
fi

# check state file exists
if [[ ! -f "$STATE_FILE" ]]; then
  print_turtle_header "bummer dude..."
  print_tree_start "git.commit.set"
  print_tree_error "no commit quota set"
  print_instruction "ask your human to grant:" "  \$ git.commit.uses set --allow N --push allow|block"
  exit 1
fi

# read state
USES=$(jq -r '.uses' "$STATE_FILE")
PUSH_ALLOWED=$(jq -r '.push' "$STATE_FILE")

# check uses > 0
if [[ "$USES" -le 0 ]]; then
  print_turtle_header "bummer dude..."
  print_tree_start "git.commit.set"
  print_tree_error "no commit uses remaining"
  print_instruction "ask your human to grant more:" "  \$ git.commit.uses set --allow N --push allow|block"
  exit 1
fi

# check push permission
if [[ "$DO_PUSH" == true && "$PUSH_ALLOWED" != "allow" ]]; then
  print_turtle_header "bummer dude..."
  print_tree_start "git.commit.set"
  print_tree_error "push not allowed in current grant"
  print_instruction "ask your human to grant with --push allow" ""
  exit 1
fi

# detect work outside the index (unstaged mods + untracked files)
HAS_UNSTAGED_MODS=false
HAS_UNTRACKED=false
if ! git diff --quiet; then
  HAS_UNSTAGED_MODS=true
fi
if [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
  HAS_UNTRACKED=true
fi

# guard: unstaged changes must be explicitly handled (before staged check, since include adds them)
if [[ "$HAS_UNSTAGED_MODS" == true || "$HAS_UNTRACKED" == true ]]; then
  if [[ "$UNSTAGED" == "include" ]]; then
    # add all changes (unstaged mods + untracked files) to the index
    git add -A
  elif [[ "$UNSTAGED" == "ignore" ]]; then
    : # proceed with only staged changes
  else
    print_turtle_header "bummer dude..."
    print_tree_start "git.commit.set"
    print_tree_error "unstaged changes detected"
    echo ""
    echo "unstaged files:"
    git diff --name-only | while read -r f; do echo "  $f"; done
    git ls-files --others --exclude-standard | while read -r f; do echo "  $f (untracked)"; done
    echo ""
    echo "either:"
    echo "  1. stage the changes you want to commit"
    echo "  2. pass --unstaged ignore to commit only staged changes"
    echo "  3. pass --unstaged include to stage all changes before commit"
    exit 1
  fi
fi

# check staged changes
if git diff --cached --quiet; then
  echo "error: no changes to commit (no staged changes)"
  exit 1
fi

# get human identity for co-author
HUMAN_NAME=$(git config user.name || echo "")
HUMAN_EMAIL=$(git config user.email || echo "")

if [[ -z "$HUMAN_NAME" || -z "$HUMAN_EMAIL" ]]; then
  print_turtle_header "bummer dude..."
  print_tree_start "git.commit.set"
  print_tree_error "cannot determine patron"
  print_instruction "human must configure git identity:" "  \$ git config user.name \"Your Name\"\n  \$ git config user.email \"your@email.com\""
  exit 1
fi

# create commit
FULL_MESSAGE="$MESSAGE

Co-authored-by: $HUMAN_NAME <$HUMAN_EMAIL>"

git commit \
  --author="$ROBOT_NAME <$ROBOT_EMAIL>" \
  --message="$FULL_MESSAGE" \
  > /dev/null 2>&1

# get current branch for output
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# push if requested
PUSH_STATUS="skipped"
if [[ "$DO_PUSH" == true ]]; then
  git push -u origin HEAD > /dev/null 2>&1
  PUSH_STATUS="origin/$CURRENT_BRANCH ✓"
fi

# decrement uses
NEW_USES=$((USES - 1))
cat > "$STATE_FILE" << EOF
{
  "uses": $NEW_USES,
  "push": "$PUSH_ALLOWED"
}
EOF

# format push display (blocked when no uses left, since commit halts before push)
if [[ "$NEW_USES" -le 0 ]]; then
  PUSH_DISPLAY="blocked"
elif [[ "$PUSH_ALLOWED" == "allow" ]]; then
  PUSH_DISPLAY="allowed"
else
  PUSH_DISPLAY="blocked"
fi

# output with turtle vibes
if [[ "$DO_PUSH" == true ]]; then
  print_turtle_header "cowabunga!"
else
  print_turtle_header "righteous!"
fi

print_tree_start "git.commit.set"
echo "   ├─ commit"
echo "   │  ├─ header: $MESSAGE"
echo "   │  ├─ author"
echo "   │  │  ├─ name: $ROBOT_NAME"
echo "   │  │  └─ email: $ROBOT_EMAIL"
echo "   │  └─ patron"
echo "   │     ├─ name: $HUMAN_NAME"
echo "   │     └─ email: $HUMAN_EMAIL"
echo "   ├─ push: $PUSH_STATUS"
echo "   └─ meter"
echo "      ├─ left: $NEW_USES"
echo "      └─ push: $PUSH_DISPLAY"
