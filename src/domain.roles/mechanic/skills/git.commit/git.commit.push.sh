#!/usr/bin/env bash
######################################################################
# .what = push HEAD commit to origin and findsert pr
#
# .why  = mechanics can push after a commit was already made,
#         or git.commit.set can compose with this for --push
#
# usage:
#   git.commit.push                                         # plan mode, tree output
#   git.commit.push --mode apply                            # execute push
#   git.commit.push --mode apply --output json              # json output (for composition)
#   git.commit.push --mode plan --output json --pr-title-fallback "feat: cool feature"
#
# guarantee:
#   - only pushes if HEAD commit was authored by seaturtle[bot]
#   - only pushes if push permission granted in .meter/git.commit.uses.jsonc
#   - never pushes to main/master
#   - requires EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN for pr findsert
#   - does NOT decrement uses (that is git.commit.set's job)
#   - defaults to plan mode (preview only); use --mode apply to execute
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/output.sh"

# robot identity
ROBOT_NAME="seaturtle[bot]"

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository"
  exit 2
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
METER_DIR="$REPO_ROOT/.meter"
STATE_FILE="$METER_DIR/git.commit.uses.jsonc"

# parse arguments
MODE="plan"
OUTPUT="tree"
PR_TITLE_FALLBACK=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --mode)
      MODE="$2"
      shift 2
      ;;
    --output)
      OUTPUT="$2"
      shift 2
      ;;
    --pr-title-fallback)
      PR_TITLE_FALLBACK="$2"
      shift 2
      ;;
    --help|-h)
      echo "usage: git.commit.push [--mode plan|apply] [--output tree|json] [--pr-title-fallback \"...\"]"
      echo ""
      echo "options:"
      echo "  --mode plan|apply            plan shows preview, apply executes (default: plan)"
      echo "  --output tree|json           tree for standalone, json for composition (default: tree)"
      echo "  --pr-title-fallback \"...\"    fallback pr title when no commits on branch yet"
      echo "  --help, -h                   show this help"
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
      echo "usage: git.commit.push [--mode plan|apply] [--output tree|json]"
      exit 2
      ;;
    *)
      shift
      ;;
  esac
done

# validate --mode value
if [[ "$MODE" != "plan" && "$MODE" != "apply" ]]; then
  echo "error: --mode must be 'plan' or 'apply'"
  exit 2
fi

# validate --output value
if [[ "$OUTPUT" != "tree" && "$OUTPUT" != "json" ]]; then
  echo "error: --output must be 'tree' or 'json'"
  exit 2
fi

######################################################################
# helper: emit error in the chosen output format
######################################################################
emit_error() {
  local message="$1"
  if [[ "$OUTPUT" == "json" ]]; then
    printf '{"status":"error","error":"%s"}\n' "$message"
  else
    print_turtle_header "bummer dude..."
    print_tree_start "git.commit.push"
    print_tree_error "$message"
  fi
}

######################################################################
# GUARDS
######################################################################

# guard: push must be allowed
PUSH_ALLOWED=""
USES=0
if [[ -f "$STATE_FILE" ]]; then
  PUSH_ALLOWED=$(jq -r '.push' "$STATE_FILE")
  USES=$(jq -r '.uses' "$STATE_FILE")
fi
if [[ "$PUSH_ALLOWED" != "allow" ]]; then
  emit_error "push not allowed"
  if [[ "$OUTPUT" == "tree" ]]; then
    print_instruction "ask your human to grant with --push allow:" "  \$ git.commit.uses set --quant N --push allow"
  fi
  exit 2  # blocked by constraints
fi

# guard: author check (apply mode only — plan mode skips since commit may not exist yet)
if [[ "$MODE" == "apply" ]]; then
  HEAD_AUTHOR=$(git log -1 --format='%an')
  if [[ "$HEAD_AUTHOR" != "$ROBOT_NAME" ]]; then
    emit_error "HEAD commit not authored by $ROBOT_NAME"
    if [[ "$OUTPUT" == "tree" ]]; then
      echo ""
      echo "push only works for commits made by $ROBOT_NAME."
      echo "use git.commit.set to create a proper commit first."
    fi
    exit 2  # blocked by constraints
  fi
fi

# guard: cannot push to main/master
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" ]]; then
  emit_error "cannot push directly to $CURRENT_BRANCH"
  if [[ "$OUTPUT" == "tree" ]]; then
    echo ""
    echo "create a feature branch first:"
    echo "  \$ git checkout -b turtle/your-branch-name"
  fi
  exit 2  # blocked by constraints
fi

# guard: token required for pr findsert
if [[ -z "${EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN:-}" ]]; then
  emit_error "EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN not set"
  if [[ "$OUTPUT" == "tree" ]]; then
    echo ""
    echo "push requires this token for pr findsert."
    echo "set the token in your environment first."
  fi
  exit 2  # blocked by constraints
fi

######################################################################
# COMPUTE PR TITLE (first unique commit on branch vs closest ancestor)
######################################################################
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
PR_BODY=$(git log "$PR_BASE"..HEAD --reverse --format=%B 2>/dev/null | head -50)

# fallback: use provided fallback, or HEAD commit message
if [[ -z "$PR_TITLE" && -n "$PR_TITLE_FALLBACK" ]]; then
  PR_TITLE="$PR_TITLE_FALLBACK"
fi
if [[ -z "$PR_TITLE" ]]; then
  PR_TITLE=$(git log -1 --format=%s 2>/dev/null || echo "")
fi
if [[ -z "$PR_BODY" ]]; then
  PR_BODY=$(git log -1 --format=%B 2>/dev/null || echo "")
fi

PUSH_TARGET="origin/$CURRENT_BRANCH"

######################################################################
# PLAN MODE: show what would happen, then exit
######################################################################
if [[ "$MODE" == "plan" ]]; then
  if [[ "$OUTPUT" == "json" ]]; then
    # escape quotes in pr title for valid json
    PR_TITLE_ESCAPED=$(echo "$PR_TITLE" | sed 's/"/\\"/g')
    printf '{"status":"planned","push_target":"%s","pr_title":"%s","pr_action":"findsert"}\n' \
      "$PUSH_TARGET" "$PR_TITLE_ESCAPED"
  else
    print_turtle_header "heres the wave..."
    print_tree_start "git.commit.push --mode plan"
    echo "   ├─ push: $PUSH_TARGET"
    echo "   ├─ pr"
    echo "   │  ├─ title: $PR_TITLE"
    echo "   │  └─ action: findsert"
    echo "   └─ meter"
    if [[ "$USES" -le 0 ]]; then
      echo "      └─ push: allowed → blocked (revoked)"
    else
      echo "      └─ push: allowed"
    fi
    echo ""
    echo "run with --mode apply to execute"
  fi
  exit 0
fi

######################################################################
# APPLY MODE: execute the push + pr findsert
######################################################################

# push to origin
git push -u origin HEAD > /dev/null 2>&1
PUSH_STATUS="$PUSH_TARGET ✓"

# findsert draft pr
PR_STATUS=""
PR_FOUND=$(GH_TOKEN="$EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN" gh pr list --head "$CURRENT_BRANCH" --json number --jq '.[0].number' 2>/dev/null || echo "")

if [[ -n "$PR_FOUND" ]]; then
  PR_STATUS="pr #$PR_FOUND (found)"
else
  # create pr with first commit message as body
  PR_BODY_FULL="$PR_BODY

---
🐢 opened by seaturtle[bot]"
  NEW_PR=$(GH_TOKEN="$EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN" gh pr create \
    --title "$PR_TITLE" \
    --body "$PR_BODY_FULL" \
    2>/dev/null | grep -oE '[0-9]+$' || echo "")

  if [[ -n "$NEW_PR" ]]; then
    PR_STATUS="pr #$NEW_PR (created)"
  else
    PR_STATUS="pr creation failed"
  fi
fi

# auto-revoke push if uses depleted
PUSH_REVOKED=false
if [[ "$USES" -le 0 ]]; then
  cat > "$STATE_FILE" << EOF
{
  "uses": $USES,
  "push": "block"
}
EOF
  PUSH_REVOKED=true
fi

# output results
if [[ "$OUTPUT" == "json" ]]; then
  PR_STATUS_ESCAPED=$(echo "$PR_STATUS" | sed 's/"/\\"/g')
  printf '{"status":"pushed","push_target":"%s","pr_status":"%s","push_revoked":%s}\n' \
    "$PUSH_TARGET" "$PR_STATUS_ESCAPED" "$PUSH_REVOKED"
else
  print_turtle_header "cowabunga!"
  print_tree_start "git.commit.push"
  echo "   ├─ push: $PUSH_STATUS"
  if [[ -n "$PR_STATUS" ]]; then
    echo "   ├─ pr: $PR_STATUS"
  fi
  echo "   └─ meter"
  if [[ "$PUSH_REVOKED" == true ]]; then
    echo "      └─ push: allowed → blocked (revoked)"
  else
    echo "      └─ push: allowed"
  fi
fi
