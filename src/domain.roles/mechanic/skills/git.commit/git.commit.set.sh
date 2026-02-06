#!/usr/bin/env bash
######################################################################
# .what = create git commit as seaturtle[bot] with human co-author
#
# .why  = mechanics commit under their own identity while crediting
#         the human who delegated the work
#
# usage:
#   git.commit.set --message "fix(api): validate input"
#   git.commit.set --message "fix(api): validate input" --mode apply
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
#   - defaults to plan mode (preview only); use --mode apply to execute
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
MODE="plan"

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
    --mode)
      MODE="$2"
      shift 2
      ;;
    --help|-h)
      echo "usage: git.commit.set --message \"...\" [--mode plan|apply] [--push] [--unstaged ignore|include]"
      echo ""
      echo "options:"
      echo "  --message, -m          commit message (required)"
      echo "  --mode plan|apply      plan shows preview, apply executes (default: plan)"
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
  echo "usage: git.commit.set --message \"...\" [--mode plan|apply] [--push] [--unstaged ignore|include]"
  exit 1
fi

# validate --mode value
if [[ "$MODE" != "plan" && "$MODE" != "apply" ]]; then
  echo "error: --mode must be 'plan' or 'apply'"
  echo "usage: git.commit.set --message \"...\" [--mode plan|apply] [--push] [--unstaged ignore|include]"
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

# check uses > 0 (plan mode is allowed without uses)
if [[ "$USES" -le 0 && "$MODE" != "plan" ]]; then
  print_turtle_header "bummer dude..."
  print_tree_start "git.commit.set"
  print_tree_error "no commit uses left"
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

# guard: cannot push to main/master
if [[ "$DO_PUSH" == true ]]; then
  EARLY_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  if [[ "$EARLY_BRANCH" == "main" || "$EARLY_BRANCH" == "master" ]]; then
    print_turtle_header "bummer dude..."
    print_tree_start "git.commit.set"
    print_tree_error "cannot push directly to $EARLY_BRANCH"
    echo ""
    echo "create a feature branch first:"
    echo "  \$ git checkout -b turtle/your-branch-name"
    exit 1
  fi

  # guard: token required for PR findsert on feature branches
  if [[ -z "${EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN:-}" ]]; then
    print_turtle_header "bummer dude..."
    print_tree_start "git.commit.set"
    print_tree_error "EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN not set"
    echo ""
    echo "push requires this token for PR findsert."
    echo "set the token in your environment first."
    exit 1
  fi
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
WILL_INCLUDE_UNSTAGED=false
if [[ "$HAS_UNSTAGED_MODS" == true || "$HAS_UNTRACKED" == true ]]; then
  if [[ "$UNSTAGED" == "include" ]]; then
    WILL_INCLUDE_UNSTAGED=true
    # only actually add in apply mode
    if [[ "$MODE" == "apply" ]]; then
      git add -A
    fi
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

# check staged changes (account for --unstaged include in plan mode)
if [[ "$WILL_INCLUDE_UNSTAGED" == false ]]; then
  if git diff --cached --quiet; then
    echo "error: no changes to commit (no staged changes)"
    exit 1
  fi
else
  # in plan mode with --unstaged include, check that there ARE changes to include
  if git diff --cached --quiet && git diff --quiet && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then
    echo "error: no changes to commit"
    exit 1
  fi
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

# get current branch for output
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# compute PR title (first unique commit on branch vs closest ancestor)
if git rev-parse --verify origin/HEAD >/dev/null 2>&1; then
  BASE_BRANCH=$(git rev-parse --abbrev-ref origin/HEAD | sed 's|origin/||')
else
  BASE_BRANCH="main"
fi

# find the closest ancestor branch (handles stacked branches)
PR_BASE="$BASE_BRANCH"
PR_BASE_DISTANCE=999999
MAIN_MB=$(git merge-base HEAD "$BASE_BRANCH" 2>/dev/null || echo "")
if [[ -n "$MAIN_MB" ]]; then
  PR_BASE_DISTANCE=$(git rev-list --count "$MAIN_MB"..HEAD 2>/dev/null || echo "999999")
fi
while IFS= read -r branch; do
  [[ "$branch" == "$CURRENT_BRANCH" ]] && continue
  [[ "$branch" == "$BASE_BRANCH" ]] && continue
  MB=$(git merge-base HEAD "$branch" 2>/dev/null || echo "")
  [[ -z "$MB" ]] && continue
  DIST=$(git rev-list --count "$MB"..HEAD 2>/dev/null || echo "999999")
  if [[ $DIST -gt 0 && $DIST -lt $PR_BASE_DISTANCE ]]; then
    PR_BASE_DISTANCE=$DIST
    PR_BASE="$branch"
  fi
done < <(git branch --format='%(refname:short)')

PR_TITLE=$(git log "$PR_BASE"..HEAD --reverse --format=%s 2>/dev/null | head -1)
if [[ -z "$PR_TITLE" ]]; then
  PR_TITLE="$MESSAGE"
fi

# compute what meter will show after
NEW_USES=$((USES - 1))
if [[ "$NEW_USES" -le 0 ]]; then
  PUSH_DISPLAY="blocked"
elif [[ "$PUSH_ALLOWED" == "allow" ]]; then
  PUSH_DISPLAY="allowed"
else
  PUSH_DISPLAY="blocked"
fi

# collect staged files for output
if [[ "$WILL_INCLUDE_UNSTAGED" == true ]]; then
  STAGED_FILES=$(git diff --cached --name-only; git diff --name-only; git ls-files --others --exclude-standard)
else
  STAGED_FILES=$(git diff --cached --name-only)
fi

######################################################################
# PLAN MODE: show what would happen, then exit
######################################################################
if [[ "$MODE" == "plan" ]]; then
  print_turtle_header "heres the wave..."
  print_tree_start "git.commit.set --mode plan"
  echo "   ├─ commit"
  echo "   │  ├─ header: $MESSAGE"
  echo "   │  ├─ author"
  echo "   │  │  ├─ name: $ROBOT_NAME"
  echo "   │  │  └─ email: $ROBOT_EMAIL"
  echo "   │  ├─ patron"
  echo "   │  │  ├─ name: $HUMAN_NAME"
  echo "   │  │  └─ email: $HUMAN_EMAIL"
  echo "   │  └─ files"
  # convert to array for proper tree ending
  readarray -t FILES_ARR <<< "$STAGED_FILES"
  FILES_COUNT=${#FILES_ARR[@]}
  for i in "${!FILES_ARR[@]}"; do
    f="${FILES_ARR[$i]}"
    if [[ -n "$f" ]]; then
      if [[ $((i + 1)) -eq $FILES_COUNT ]]; then
        echo "   │     └─ $f"
      else
        echo "   │     ├─ $f"
      fi
    fi
  done
  if [[ "$DO_PUSH" == true ]]; then
    echo "   ├─ push: origin/$CURRENT_BRANCH"
    echo "   ├─ pr"
    echo "   │  ├─ title: $PR_TITLE"
    echo "   │  └─ action: findsert draft"
  else
    echo "   ├─ push: skipped"
  fi
  echo "   └─ meter"
  echo "      ├─ left: $USES → $NEW_USES"
  echo "      └─ push: $PUSH_DISPLAY"
  echo ""
  echo "run with --mode apply to execute"
  exit 0
fi

######################################################################
# APPLY MODE: execute the actual mutations
######################################################################

# create commit
FULL_MESSAGE="$MESSAGE

Co-authored-by: $HUMAN_NAME <$HUMAN_EMAIL>"

git commit \
  --author="$ROBOT_NAME <$ROBOT_EMAIL>" \
  --message="$FULL_MESSAGE" \
  > /dev/null 2>&1

# push if requested
PUSH_STATUS="skipped"
PR_STATUS=""
if [[ "$DO_PUSH" == true ]]; then
  git push -u origin HEAD > /dev/null 2>&1
  PUSH_STATUS="origin/$CURRENT_BRANCH ✓"

  # findsert draft PR if not on main/master
  if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
    # check if PR already exists for this branch
    PR_FOUND=$(GH_TOKEN="$EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN" gh pr list --head "$CURRENT_BRANCH" --json number --jq '.[0].number' 2>/dev/null || echo "")

    if [[ -n "$PR_FOUND" ]]; then
      PR_STATUS="pr #$PR_FOUND (found)"
    else
      # create draft PR with first commit as title
      NEW_PR=$(GH_TOKEN="$EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN" gh pr create \
        --title "$PR_TITLE" \
        --body "🐢 opened by seaturtle[bot]" \
        --draft \
        2>/dev/null | grep -oE '[0-9]+$' || echo "")

      if [[ -n "$NEW_PR" ]]; then
        PR_STATUS="pr #$NEW_PR (created)"
      else
        PR_STATUS="pr creation failed"
      fi
    fi
  else
    PR_STATUS="skipped (on $CURRENT_BRANCH)"
  fi
fi

# decrement uses
cat > "$STATE_FILE" << EOF
{
  "uses": $NEW_USES,
  "push": "$PUSH_ALLOWED"
}
EOF

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
if [[ -n "$PR_STATUS" ]]; then
  echo "   ├─ pr: $PR_STATUS"
fi
echo "   └─ meter"
echo "      ├─ left: $NEW_USES"
echo "      └─ push: $PUSH_DISPLAY"
