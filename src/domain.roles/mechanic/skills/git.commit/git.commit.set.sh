#!/usr/bin/env bash
######################################################################
# .what = create git commit as seaturtle[bot] with human co-author
#
# .why  = mechanics commit under their own identity while credit
#         goes to the human who delegated the work
#
# usage:
#   echo "fix(api): validate input\n\n- added input schema" | git.commit.set -m @stdin
#   git.commit.set -m @stdin --mode apply
#   git.commit.set -m @stdin --mode apply --push
#   git.commit.set -m @stdin --unstaged ignore
#
# message format:
#   first line = commit header (required)
#   blank line + rest of lines = commit body (required)
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
  exit 2
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
METER_DIR="$REPO_ROOT/.meter"
STATE_FILE="$METER_DIR/git.commit.uses.jsonc"

######################################################################
# helper: infer level from branch name (same logic as git.commit.bind)
######################################################################
infer_level_from_branch() {
  local branch="$1"

  local has_fix=false
  if [[ "$branch" =~ ^fix/ ]] || [[ "$branch" =~ /fix/ ]] || [[ "$branch" =~ /fix- ]] || \
     [[ "$branch" =~ ^hotfix/ ]] || [[ "$branch" =~ ^bugfix/ ]]; then
    has_fix=true
  fi

  local has_feat=false
  if [[ "$branch" =~ ^feat/ ]] || [[ "$branch" =~ /feat/ ]] || [[ "$branch" =~ /feat- ]] || \
     [[ "$branch" =~ ^feature/ ]]; then
    has_feat=true
  fi

  if $has_fix && $has_feat; then
    echo "none"
  elif $has_fix; then
    echo "fix"
  elif $has_feat; then
    echo "feat"
  else
    echo "none"
  fi
}

######################################################################
# helper: check if HEAD is a merge commit (2+ parents)
######################################################################
is_merge_commit() {
  local parents
  parents=$(git cat-file -p HEAD 2>/dev/null | grep -c "^parent " || echo "0")
  [[ "$parents" -gt 1 ]]
}

######################################################################
# helper: extract commit prefix (fix, feat, chore, etc.) from header
######################################################################
get_commit_prefix() {
  local header="$1"
  if [[ "$header" =~ ^([a-z]+)[\(:] ]]; then
    echo "${BASH_REMATCH[1]}"
  else
    echo ""
  fi
}

# parse arguments
MESSAGE=""
DO_PUSH=false
UNSTAGED=""
MODE="plan"
PROMISE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --message|-m)
      if [[ "$2" == "@stdin" ]]; then
        # read message from stdin
        MESSAGE=$(cat)
      else
        MESSAGE="$2"
      fi
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
    --promise)
      PROMISE="$2"
      shift 2
      ;;
    --help|-h)
      echo "usage: echo 'header\n\n- body' | git.commit.set -m @stdin [--mode plan|apply] [--push]"
      echo ""
      echo "options:"
      echo "  --message, -m @stdin   read multiline commit message from stdin (required)"
      echo "                         first line = header, after blank line = body"
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
      echo "usage: echo 'header\n\n- body' | git.commit.set -m @stdin [--mode plan|apply] [--push]"
      exit 2
      ;;
    *)
      shift
      ;;
  esac
done

# validate --message
if [[ -z "$MESSAGE" ]]; then
  echo "error: --message is required"
  echo "usage: echo 'header\n\n- body' | git.commit.set -m @stdin [--mode plan|apply] [--push]"
  exit 2
fi

# parse header and body from multiline message
HEADER=$(echo "$MESSAGE" | head -n1)
BODY=$(echo "$MESSAGE" | tail -n +3)

# validate message has body (header + blank line + body)
if [[ -z "$BODY" ]]; then
  echo "error: --message must be multiline (header + blank line + body)"
  echo "usage: echo 'header\n\n- body line 1' | git.commit.set -m @stdin"
  exit 2
fi

# validate --unstaged value
if [[ -n "$UNSTAGED" && "$UNSTAGED" != "ignore" && "$UNSTAGED" != "include" ]]; then
  echo "error: --unstaged must be 'ignore' or 'include'"
  echo "usage: echo 'header\n\n- body' | git.commit.set -m @stdin [--unstaged ignore|include]"
  exit 2
fi

# validate --mode value
if [[ "$MODE" != "plan" && "$MODE" != "apply" ]]; then
  echo "error: --mode must be 'plan' or 'apply'"
  echo "usage: echo 'header\n\n- body' | git.commit.set -m @stdin [--mode plan|apply]"
  exit 2
fi

# guard: bound level constraint with inference + hard-nudge
LEVEL_FILE="$REPO_ROOT/.branch/.bind/git.commit.level"
EFFECTIVE_LEVEL=""
LEVEL_SOURCE=""

# 1. check explicit bind first
if [[ -f "$LEVEL_FILE" ]]; then
  EXPLICIT_LEVEL=$(cat "$LEVEL_FILE" 2>/dev/null || echo "")
  if [[ -n "$EXPLICIT_LEVEL" ]]; then
    EFFECTIVE_LEVEL="$EXPLICIT_LEVEL"
    LEVEL_SOURCE="explicit"
  fi
fi

# 2. if no explicit bind, infer from branch name
if [[ -z "$EFFECTIVE_LEVEL" ]]; then
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  if [[ -n "$CURRENT_BRANCH" && "$CURRENT_BRANCH" != "HEAD" ]]; then
    INFERRED_LEVEL=$(infer_level_from_branch "$CURRENT_BRANCH")
    if [[ "$INFERRED_LEVEL" != "none" ]]; then
      EFFECTIVE_LEVEL="$INFERRED_LEVEL"
      LEVEL_SOURCE="inferred"
    fi
  fi
fi

# extract commit prefix from header
COMMIT_PREFIX=$(get_commit_prefix "$HEADER")

# skip validation for chore, docs, refactor, test, ci, build, perf, style prefixes
case "$COMMIT_PREFIX" in
  chore|docs|refactor|test|ci|build|perf|style)
    # no fix/feat validation for these types
    ;;
  *)
    # validate fix/feat based on effective level
    if [[ "$EFFECTIVE_LEVEL" == "fix" ]]; then
      # fix branch/bind: block feat commits
      if [[ "$COMMIT_PREFIX" == "feat" ]]; then
        print_turtle_header "bummer dude..."
        print_tree_start "git.commit.set"
        print_tree_error "commit prefix mismatch"
        echo ""
        echo "   header: $HEADER"
        echo "   level.bound = $EFFECTIVE_LEVEL ($LEVEL_SOURCE)"
        echo "   level.found = $COMMIT_PREFIX"
        echo ""
        echo "   the level is bound to 'fix' but the commit prefix is 'feat'."
        echo "   either change your commit header to fix(...): or unbind the level."
        exit 2  # blocked by constraints
      fi
    elif [[ "$EFFECTIVE_LEVEL" == "feat" ]]; then
      # feat branch/bind: block fix commits
      if [[ "$COMMIT_PREFIX" == "fix" ]]; then
        print_turtle_header "bummer dude..."
        print_tree_start "git.commit.set"
        print_tree_error "commit prefix mismatch"
        echo ""
        echo "   header: $HEADER"
        echo "   level.bound = $EFFECTIVE_LEVEL ($LEVEL_SOURCE)"
        echo "   level.found = $COMMIT_PREFIX"
        echo ""
        echo "   the level is bound to 'feat' but the commit prefix is 'fix'."
        echo "   either change your commit header to feat(...): or unbind the level."
        exit 2  # blocked by constraints
      fi
    else
      # no level (none): hard-nudge on feat, allow fix
      if [[ "$COMMIT_PREFIX" == "feat" ]]; then
        # check for --promise is-netnew-behavior
        if [[ "$PROMISE" != "is-netnew-behavior" ]]; then
          print_turtle_header "hold up, dude..."
          print_tree_start "git.commit.set"
          echo "   └─ ✋ nudge: feat requires confirmation"
          echo ""
          echo "   your branch ($CURRENT_BRANCH) doesn't signal fix or feat."
          echo ""
          echo "   are you certain this is a feat?"
          echo "   - feat = net-new behavior that did not exist before"
          echo "   - fix = covers a gap, tunes implementation, or corrects a defect"
          echo ""
          echo "   if this is truly a feat, retry with:"
          echo "     --promise is-netnew-behavior"
          echo ""
          echo "   if this is a fix, change your commit header to fix(...):"
          exit 2  # blocked by constraints
        fi
      fi
      # fix commits on no-level branches are allowed (safe default)
    fi
    ;;
esac

# check state file exists
if [[ ! -f "$STATE_FILE" ]]; then
  print_turtle_header "bummer dude..."
  print_tree_start "git.commit.set"
  print_tree_error "no commit quota set"
  print_instruction "ask your human to grant:" "  \$ git.commit.uses set --quant N --push allow|block"
  exit 2  # blocked by constraints
fi

# read state
USES=$(jq -r '.uses' "$STATE_FILE")
PUSH_ALLOWED=$(jq -r '.push' "$STATE_FILE")

# check uses > 0 (plan mode is allowed without uses)
if [[ "$USES" -le 0 && "$MODE" != "plan" ]]; then
  print_turtle_header "bummer dude..."
  print_tree_start "git.commit.set"
  print_tree_error "no commit uses left"
  print_instruction "ask your human to grant more:" "  \$ git.commit.uses set --quant N --push allow|block"
  exit 2  # blocked by constraints
fi

# check push permission
if [[ "$DO_PUSH" == true && "$PUSH_ALLOWED" != "allow" ]]; then
  print_turtle_header "bummer dude..."
  print_tree_start "git.commit.set"
  print_tree_error "push not allowed in current grant"
  print_instruction "ask your human to grant with --push allow" ""
  exit 2  # blocked by constraints
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
    exit 2  # blocked by constraints
  fi
fi

# check staged changes (account for --unstaged include in plan mode)
if [[ "$WILL_INCLUDE_UNSTAGED" == false ]]; then
  if git diff --cached --quiet; then
    echo "error: no changes to commit (no staged changes)"
    exit 2  # blocked by constraints
  fi
else
  # in plan mode with --unstaged include, check that there ARE changes to include
  if git diff --cached --quiet && git diff --quiet && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then
    echo "error: no changes to commit"
    exit 2  # blocked by constraints
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
  exit 2  # blocked by constraints
fi

# get current branch for output
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# compute what meter will show after
NEW_USES=$((USES - 1))
if [[ "$PUSH_ALLOWED" == "allow" ]]; then
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
  # preflight push plan before tree output (so errors show clean, not mid-tree)
  PUSH_PLAN_JSON=""
  if [[ "$DO_PUSH" == true ]]; then
    PUSH_PLAN_JSON=$("$SCRIPT_DIR/git.commit.push.sh" --mode plan --output json --pr-title-fallback "$HEADER" 2>/dev/null || echo '{"status":"error","error":"push plan failed"}')
    PUSH_PLAN_STATUS=$(echo "$PUSH_PLAN_JSON" | jq -r '.status')
    if [[ "$PUSH_PLAN_STATUS" != "planned" ]]; then
      # push plan failed — delegate to push tree output for user-friendly error
      "$SCRIPT_DIR/git.commit.push.sh" --mode plan --pr-title-fallback "$HEADER" || true
      exit 2
    fi
  fi

  print_turtle_header "heres the wave..."
  print_tree_start "git.commit.set --mode plan"
  echo "   ├─ commit"
  echo "   │  ├─ header: $HEADER"
  echo "   │  ├─ body"
  readarray -t BODY_LINES <<< "$BODY"
  BODY_LINE_COUNT=${#BODY_LINES[@]}
  for di in "${!BODY_LINES[@]}"; do
    bline="${BODY_LINES[$di]}"
    if [[ -n "$bline" ]]; then
      if [[ $((di + 1)) -eq $BODY_LINE_COUNT ]]; then
        echo "   │  │  └─ $bline"
      else
        echo "   │  │  ├─ $bline"
      fi
    fi
  done
  echo "   │  ├─ author"
  echo "   │  │  ├─ name: $ROBOT_NAME"
  echo "   │  │  └─ email: $ROBOT_EMAIL"
  echo "   │  ├─ patron"
  echo "   │  │  ├─ name: $HUMAN_NAME"
  echo "   │  │  └─ email: $HUMAN_EMAIL"
  echo "   │  └─ files"
  # convert to array for proper tree leaf
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
    PUSH_TARGET=$(echo "$PUSH_PLAN_JSON" | jq -r '.push_target')
    PUSH_PR_TITLE=$(echo "$PUSH_PLAN_JSON" | jq -r '.pr_title')
    echo "   ├─ push: $PUSH_TARGET"
    echo "   ├─ pr"
    echo "   │  ├─ title: $PUSH_PR_TITLE"
    echo "   │  └─ action: findsert draft"
  else
    echo "   ├─ push: skipped"
  fi
  echo "   └─ meter"
  echo "      ├─ left: $USES → $NEW_USES"
  if [[ "$DO_PUSH" == true && "$NEW_USES" -le 0 && "$PUSH_ALLOWED" == "allow" ]]; then
    echo "      └─ push: allowed → blocked (revoked)"
  else
    echo "      └─ push: $PUSH_DISPLAY"
  fi
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

# push if requested (delegate to git.commit.push)
PUSH_STATUS="skipped"
PR_STATUS=""
if [[ "$DO_PUSH" == true ]]; then
  PUSH_RESULT_JSON=$("$SCRIPT_DIR/git.commit.push.sh" --mode apply --output json 2>/dev/null || echo '{"status":"error","error":"push failed"}')
  PUSH_RESULT_STATUS=$(echo "$PUSH_RESULT_JSON" | jq -r '.status')
  if [[ "$PUSH_RESULT_STATUS" == "pushed" ]]; then
    PUSH_TARGET=$(echo "$PUSH_RESULT_JSON" | jq -r '.push_target')
    PUSH_STATUS="$PUSH_TARGET ✓"
    PR_STATUS=$(echo "$PUSH_RESULT_JSON" | jq -r '.pr_status')
  else
    PUSH_ERR=$(echo "$PUSH_RESULT_JSON" | jq -r '.error // "push failed"')
    PUSH_STATUS="error: $PUSH_ERR"
  fi
fi

# decrement uses
cat > "$STATE_FILE" << EOF
{
  "uses": $NEW_USES,
  "push": "$PUSH_ALLOWED"
}
EOF

# auto-revoke push if uses depleted and push was executed
if [[ "$DO_PUSH" == true && "$PUSH_RESULT_STATUS" == "pushed" && "$NEW_USES" -le 0 && "$PUSH_ALLOWED" == "allow" ]]; then
  PUSH_ALLOWED="block"
  cat > "$STATE_FILE" << EOF
{
  "uses": $NEW_USES,
  "push": "block"
}
EOF
  PUSH_DISPLAY="blocked (revoked)"
fi

# output with turtle vibes
if [[ "$DO_PUSH" == true ]]; then
  print_turtle_header "cowabunga!"
else
  print_turtle_header "righteous!"
fi

print_tree_start "git.commit.set"
echo "   ├─ commit"
echo "   │  ├─ header: $HEADER"
echo "   │  ├─ body"
readarray -t BODY_LINES <<< "$BODY"
BODY_LINE_COUNT=${#BODY_LINES[@]}
for di in "${!BODY_LINES[@]}"; do
  bline="${BODY_LINES[$di]}"
  if [[ -n "$bline" ]]; then
    if [[ $((di + 1)) -eq $BODY_LINE_COUNT ]]; then
      echo "   │  │  └─ $bline"
    else
      echo "   │  │  ├─ $bline"
    fi
  fi
done
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
