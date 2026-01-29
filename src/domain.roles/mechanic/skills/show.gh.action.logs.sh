#!/usr/bin/env bash
######################################################################
# .what = fetch logs from github actions workflow runs
#
# .why  = enables quick access to CI logs without leaving the terminal
#         - diagnose failing tests faster
#         - review workflow output during development
#         - avoid context-switching to browser
#
# usage:
#   show.gh.action.logs.sh --flow "test"                # failed logs from latest test run
#   show.gh.action.logs.sh --flow "ci" --full           # show full logs (not just failed)
#   show.gh.action.logs.sh --flow "test" --scope "unit" # filter to jobs matching "unit"
#   show.gh.action.logs.sh --run-id 12345678            # view specific run by id
#   show.gh.action.logs.sh --flow "test" --watch        # watch in-progress run
#   show.gh.action.logs.sh --flow "test" --web          # open in browser instead
#
# guarantee:
#   - uses gh cli (must be authenticated)
#   - defaults to current branch
#   - shows most recent run if no run-id specified
#   - fail-fast on errors
######################################################################
set -euo pipefail

# disable pager for gh commands
export GH_PAGER=""

# parse named arguments
FLOW=""
RUN_ID=""
SCOPE=""
FULL_LOGS=false
WATCH_MODE=false
WEB_MODE=false
BRANCH=""

while [[ $# -gt 0 ]]; do
  case $1 in
    # rhachet passes these - ignore them
    --skill|--repo|--role)
      shift 2
      ;;
    --flow|-f)
      FLOW="$2"
      shift 2
      ;;
    --run-id|-r)
      RUN_ID="$2"
      shift 2
      ;;
    --scope|-s)
      SCOPE="$2"
      shift 2
      ;;
    --full)
      FULL_LOGS=true
      shift
      ;;
    --watch)
      WATCH_MODE=true
      shift
      ;;
    --web)
      WEB_MODE=true
      shift
      ;;
    --branch|-b)
      BRANCH="$2"
      shift 2
      ;;
    --help|-h)
      echo "usage: show.gh.action.logs.sh --flow <name> [options]"
      echo ""
      echo "required:"
      echo "  --flow, -f <name>       workflow name (e.g., 'test', 'ci')"
      echo ""
      echo "options:"
      echo "  --run-id, -r <id>       view specific run by id (skips workflow lookup)"
      echo "  --scope, -s <pattern>   filter to jobs matching pattern (e.g., 'unit', 'lint')"
      echo "  --full                  show full logs (default: failed only)"
      echo "  --watch                 watch in-progress run"
      echo "  --web                   open in browser instead of terminal"
      echo "  --branch, -b <name>     use specific branch (default: current)"
      echo "  --help, -h              show this help"
      exit 0
      ;;
    *)
      echo "unknown argument: $1"
      echo "run with --help for usage"
      exit 1
      ;;
  esac
done

# require flow unless run-id specified
if [[ -z "$FLOW" && -z "$RUN_ID" ]]; then
  echo "⛈️  error: --flow is required"
  echo "   usage: show.gh.action.logs.sh --flow <name> [options]"
  echo "   run with --help for more info"
  exit 1
fi

# ensure gh cli is available
if ! command -v gh &> /dev/null; then
  echo "⛈️  error: gh cli is not installed"
  echo "   install: https://cli.github.com/"
  exit 1
fi

# ensure we're authenticated
if ! gh auth status &> /dev/null; then
  echo "⛈️  error: not authenticated with gh cli"
  echo "   run: gh auth login"
  exit 1
fi

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "⛈️  error: not in a git repository"
  exit 1
fi

# get current branch if not specified
if [[ -z "$BRANCH" ]]; then
  BRANCH=$(git branch --show-current)
  if [[ -z "$BRANCH" ]]; then
    echo "⛈️  error: could not determine current branch (detached HEAD?)"
    exit 1
  fi
fi

echo "🐢 let's see!"
echo ""

# if run-id specified, use it directly
if [[ -n "$RUN_ID" ]]; then
  echo "🌴 branch"
  echo "   └─ $BRANCH"
  echo ""
  echo "🐚 run"
  echo "   └─ $RUN_ID"
else
  # build gh run list command
  LIST_CMD="gh run list --branch $BRANCH --limit 1 --json databaseId,workflowName,status,conclusion,createdAt"

  if [[ -n "$FLOW" ]]; then
    LIST_CMD="$LIST_CMD --workflow $FLOW"
  fi

  # get latest run
  RUNS_JSON=$(eval "$LIST_CMD")

  if [[ "$RUNS_JSON" == "[]" ]]; then
    echo ""
    echo "🌴 branch"
    echo "   └─ $BRANCH"
    echo ""
    echo "🌊 flow"
    if [[ -n "$SCOPE" ]]; then
      echo "   ├─ $FLOW"
      echo "   └─ scope: $SCOPE"
    else
      echo "   └─ $FLOW"
    fi
    echo ""
    echo "⛈️  no runs found"

    # show most recent run of this workflow on any branch
    if [[ -n "$FLOW" ]]; then
      RECENT_RUN=$(gh run list --workflow "$FLOW" --limit 1 --json headBranch,conclusion,createdAt 2>/dev/null || echo "[]")
      if [[ "$RECENT_RUN" != "[]" ]]; then
        RECENT_BRANCH=$(echo "$RECENT_RUN" | jq -r '.[0].headBranch')
        RECENT_CONCLUSION=$(echo "$RECENT_RUN" | jq -r '.[0].conclusion')
        RECENT_DATE=$(echo "$RECENT_RUN" | jq -r '.[0].createdAt')
        echo ""
        echo "🐢 most recent '$FLOW' run"
        echo "   ├─ branch: $RECENT_BRANCH"
        echo "   ├─ status: $RECENT_CONCLUSION"
        echo "   └─ date: $RECENT_DATE"
        echo ""
        echo "   try: --branch $RECENT_BRANCH"
      fi
    fi
    exit 1
  fi

  # extract run info
  RUN_ID=$(echo "$RUNS_JSON" | jq -r '.[0].databaseId')
  WORKFLOW_NAME=$(echo "$RUNS_JSON" | jq -r '.[0].workflowName')
  STATUS=$(echo "$RUNS_JSON" | jq -r '.[0].status')
  CONCLUSION=$(echo "$RUNS_JSON" | jq -r '.[0].conclusion')
  CREATED_AT=$(echo "$RUNS_JSON" | jq -r '.[0].createdAt')

  echo "🌴 branch"
  echo "   └─ $BRANCH"
  echo ""
  echo "🌊 flow"
  if [[ -n "$SCOPE" ]]; then
    echo "   ├─ $WORKFLOW_NAME"
    echo "   └─ scope: $SCOPE"
  else
    echo "   └─ $WORKFLOW_NAME"
  fi
  echo ""
  echo "🐚 run"
  echo "   ├─ id: $RUN_ID"
  echo "   ├─ status: $STATUS"
  if [[ "$CONCLUSION" != "null" ]]; then
    if [[ "$CONCLUSION" == "success" ]]; then
      echo "   ├─ result: ✨ $CONCLUSION"
    else
      echo "   ├─ result: ⛈️  $CONCLUSION"
    fi
  fi
  echo "   └─ created: $CREATED_AT"
fi

echo ""

# handle watch mode
if [[ "$WATCH_MODE" == "true" ]]; then
  echo "🐢 watch run $RUN_ID ..."
  gh run watch "$RUN_ID"
  exit 0
fi

# handle web mode
if [[ "$WEB_MODE" == "true" ]]; then
  echo "🌊 open in browser ..."
  gh run view "$RUN_ID" --web
  exit 0
fi

# get repo info for api calls
REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')

# get jobs for this run
JOBS_JSON=$(gh api --method GET "repos/$REPO/actions/runs/$RUN_ID/jobs" -q '.jobs')

# filter jobs by scope if specified
if [[ -n "$SCOPE" ]]; then
  JOBS_JSON=$(echo "$JOBS_JSON" | jq --arg scope "$SCOPE" '[.[] | select(.name | ascii_downcase | contains($scope | ascii_downcase))]')
fi

# get only failed job ids (or all if --full)
if [[ "$FULL_LOGS" == "true" ]]; then
  JOB_IDS=$(echo "$JOBS_JSON" | jq -r '.[].id')
else
  JOB_IDS=$(echo "$JOBS_JSON" | jq -r '.[] | select(.conclusion == "failure") | .id')
fi

if [[ -z "$JOB_IDS" ]]; then
  if [[ -n "$SCOPE" ]]; then
    echo "✨ no failed jobs for scope: $SCOPE"
  else
    echo "✨ no failed jobs"
  fi
  exit 0
fi

# count jobs
JOB_COUNT=$(echo "$JOB_IDS" | wc -l | tr -d ' ')
echo "⛈️  $JOB_COUNT failed job(s)"
echo ""

# view logs
FIRST_JOB=true
for JOB_ID in $JOB_IDS; do
  JOB_NAME=$(echo "$JOBS_JSON" | jq -r ".[] | select(.id == $JOB_ID) | .name")
  JOB_CONCLUSION=$(echo "$JOBS_JSON" | jq -r ".[] | select(.id == $JOB_ID) | .conclusion")

  # add separation between jobs
  if [[ "$FIRST_JOB" == "true" ]]; then
    FIRST_JOB=false
  else
    echo ""
    echo ""
    echo ""
    echo ""
    echo ""
  fi

  echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "┃ ⛈️  $JOB_NAME"
  echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  if [[ "$FULL_LOGS" == "true" ]]; then
    # show full logs for job
    gh api --method GET "repos/$REPO/actions/jobs/$JOB_ID/logs"
  else
    # capture error sections: from FAIL until next PASS or test summary
    gh api --method GET "repos/$REPO/actions/jobs/$JOB_ID/logs" | awk '
      /FAIL / { p=1 }
      /PASS |Ran all test suites/ { p=0 }
      p { print }
    '
  fi
done

echo ""
echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "┃ 🐢 for full logs: --full"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
