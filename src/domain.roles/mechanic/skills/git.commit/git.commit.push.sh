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
source "$SCRIPT_DIR/git.commit.operations.sh"

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
DEBUG="false"

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
    --debug)
      DEBUG="true"
      shift
      ;;
    --help|-h)
      echo "usage: git.commit.push [--mode plan|apply] [--output tree|json] [--pr-title-fallback \"...\"] [--debug]"
      echo ""
      echo "options:"
      echo "  --mode plan|apply            plan shows preview, apply executes (default: plan)"
      echo "  --output tree|json           tree for standalone, json for composition (default: tree)"
      echo "  --pr-title-fallback \"...\"    fallback pr title when no commits on branch yet"
      echo "  --debug                      show verbose debug output"
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

######################################################################
# COMPUTE PR TITLE (from first behavioral commit on branch)
######################################################################
# find the first behavioral commit (fix/feat) - this is stable regardless
# of how many cont: commits are added later
BEHAVIORAL_COMMIT_HASH=$(get_first_behavioral_commit_hash)

# extract PR title and body from the behavioral commit
PR_TITLE=""
PR_BODY=""
if [[ -n "$BEHAVIORAL_COMMIT_HASH" && "$BEHAVIORAL_COMMIT_HASH" != "NO_COMMITS" && "$BEHAVIORAL_COMMIT_HASH" != "NO_BASE" && "$BEHAVIORAL_COMMIT_HASH" != "ON_BASE" ]]; then
  PR_TITLE=$(git log -1 --format=%s "$BEHAVIORAL_COMMIT_HASH" 2>/dev/null || echo "")
  PR_BODY=$(git log -1 --format=%B "$BEHAVIORAL_COMMIT_HASH" 2>/dev/null | head -50)
fi

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

# fetch token from keyrack (only needed in apply mode for gh commands)
# try default owner first, fallback to ehmpath (passwordless sshkey)
# if both fail, show only the first error (user's real issue, not fallback noise)
KEYRACK_ERROR_FILE=$(mktemp)
trap "rm -f '$KEYRACK_ERROR_FILE'" EXIT

[[ "$DEBUG" == "true" ]] && echo "[debug] fetch token from keyrack..." >&2

# capture output and exit code (use || to prevent set -e from early exit)
KEYRACK_EXIT=0
"$REPO_ROOT/node_modules/.bin/rhachet" keyrack get \
  --key EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN \
  --allow-dangerous \
  --json >"$KEYRACK_ERROR_FILE" 2>&1 || KEYRACK_EXIT=$?

[[ "$DEBUG" == "true" ]] && echo "[debug] keyrack get exit=$KEYRACK_EXIT" >&2
[[ "$DEBUG" == "true" ]] && echo "[debug] keyrack output: $(cat "$KEYRACK_ERROR_FILE")" >&2

if [[ $KEYRACK_EXIT -eq 0 ]]; then
  EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN=$(cat "$KEYRACK_ERROR_FILE" | jq -r '.grant.key.secret // empty')
  [[ "$DEBUG" == "true" ]] && echo "[debug] extracted token length: ${#EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN}" >&2
else
  # fallback: unlock and get from ehmpath (passwordless sshkey)
  [[ "$DEBUG" == "true" ]] && echo "[debug] primary failed, try ehmpath fallback..." >&2
  "$REPO_ROOT/node_modules/.bin/rhachet" keyrack unlock \
    --owner ehmpath --prikey "$HOME/.ssh/ehmpath" --env all >/dev/null 2>&1 || true
  FALLBACK_EXIT=0
  FALLBACK_OUTPUT=$("$REPO_ROOT/node_modules/.bin/rhachet" keyrack get \
    --key EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN \
    --owner ehmpath \
    --allow-dangerous \
    --json 2>&1) || FALLBACK_EXIT=$?
  [[ "$DEBUG" == "true" ]] && echo "[debug] fallback exit=$FALLBACK_EXIT" >&2
  [[ "$DEBUG" == "true" ]] && echo "[debug] fallback output: $FALLBACK_OUTPUT" >&2
  if [[ $FALLBACK_EXIT -eq 0 ]]; then
    EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN=$(echo "$FALLBACK_OUTPUT" | jq -r '.grant.key.secret // empty')
    [[ "$DEBUG" == "true" ]] && echo "[debug] extracted fallback token length: ${#EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN}" >&2
  else
    # both failed — show original error + guidance for human
    echo "" >&2
    echo "🐢 bummer dude, keyrack token fetch failed" >&2
    echo "" >&2
    cat "$KEYRACK_ERROR_FILE" >&2
    echo "" >&2
    echo "to fix this, ask a human to either:" >&2
    echo "  1. unlock their keyrack for this key:" >&2
    echo "     $ rhx keyrack unlock --key EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN" >&2
    echo "" >&2
    echo "  2. or add the ehmpath keyrack, so ehmpaths like us can unlock our own keys:" >&2
    echo "     $ npx rhachet roles init --repo ehmpathy --role mechanic --init keyrack.ehmpath" >&2
    echo "" >&2
    exit 1
  fi
fi

# fail-fast: verify we got a token
if [[ -z "$EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN" ]]; then
  echo "" >&2
  echo "🐢 bummer dude, keyrack returned empty token" >&2
  echo "" >&2
  echo "keyrack output:" >&2
  cat "$KEYRACK_ERROR_FILE" >&2
  echo "" >&2
  exit 1
fi

[[ "$DEBUG" == "true" ]] && echo "[debug] apply mode: push to origin..." >&2

# push to origin
PUSH_EXIT=0
PUSH_OUTPUT=$(git push origin HEAD --force-with-lease 2>&1) || PUSH_EXIT=$?
[[ "$DEBUG" == "true" ]] && echo "[debug] push exit=$PUSH_EXIT" >&2
[[ "$DEBUG" == "true" ]] && echo "[debug] push output: $PUSH_OUTPUT" >&2

if [[ $PUSH_EXIT -ne 0 ]]; then
  echo "" >&2
  echo "🐢 bummer dude, git push failed" >&2
  echo "" >&2
  echo "$PUSH_OUTPUT" >&2
  echo "" >&2
  exit 1
fi

PUSH_STATUS="$PUSH_TARGET ✓"

# findsert draft pr
[[ "$DEBUG" == "true" ]] && echo "[debug] findsert pr for branch $CURRENT_BRANCH..." >&2

PR_STATUS=""
PR_LIST_OUTPUT=""
PR_LIST_EXIT=0
PR_LIST_OUTPUT=$(GH_TOKEN="$EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN" gh pr list --head "$CURRENT_BRANCH" --json number --jq '.[0].number' 2>&1) || PR_LIST_EXIT=$?
[[ "$DEBUG" == "true" ]] && echo "[debug] pr list exit=$PR_LIST_EXIT, output: '$PR_LIST_OUTPUT'" >&2
PR_FOUND=""
if [[ $PR_LIST_EXIT -eq 0 && -n "$PR_LIST_OUTPUT" && "$PR_LIST_OUTPUT" != "null" ]]; then
  PR_FOUND="$PR_LIST_OUTPUT"
fi
[[ "$DEBUG" == "true" ]] && echo "[debug] pr found: '$PR_FOUND'" >&2

if [[ -n "$PR_FOUND" ]]; then
  PR_STATUS="pr #$PR_FOUND (found)"
else
  # strip Co-authored-by trailers from PR body (privacy: avoid email leak)
  # note: grep -v returns exit 1 if no lines match, so use || true
  PR_BODY_CLEAN=$(echo "$PR_BODY" | { grep -v '^Co-authored-by:' || true; } | sed -e :a -e '/^\n*$/{$d;N;ba;}')
  PR_BODY_FULL="$PR_BODY_CLEAN

---
🐢🌊 surfed in by seaturtle[bot]"
  [[ "$DEBUG" == "true" ]] && echo "[debug] token for pr create: ${EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN:0:10}... (len=${#EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN})" >&2
  PR_CREATE_OUTPUT=""
  PR_CREATE_EXIT=0
  PR_CREATE_OUTPUT=$(GH_TOKEN="$EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN" gh pr create \
    --title "$PR_TITLE" \
    --body "$PR_BODY_FULL" \
    2>&1) || PR_CREATE_EXIT=$?
  [[ "$DEBUG" == "true" ]] && echo "[debug] pr create exit=$PR_CREATE_EXIT" >&2
  [[ "$DEBUG" == "true" ]] && echo "[debug] pr create output: $PR_CREATE_OUTPUT" >&2

  if [[ $PR_CREATE_EXIT -eq 0 ]]; then
    NEW_PR=$(echo "$PR_CREATE_OUTPUT" | grep -oE '[0-9]+$' || echo "")
    if [[ -n "$NEW_PR" ]]; then
      PR_STATUS="pr #$NEW_PR (created)"
    else
      PR_STATUS="pr created (url: $PR_CREATE_OUTPUT)"
    fi
  else
    PR_STATUS="pr creation failed: $PR_CREATE_OUTPUT"
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
  echo ""
  echo "🌊 now lets ride the ci wave and catch any wipeouts"
  echo "   └─ git release --watch || npx rhachet run --skill show.gh.test.errors"
fi
