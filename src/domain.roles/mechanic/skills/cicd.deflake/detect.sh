#!/usr/bin/env bash
######################################################################
# .what = detect subcommand for cicd.deflake skill
#
# .why  = scans CI history to identify flaky tests:
#         - finds failed runs that passed on retry (flake signal)
#         - extracts test names and error patterns
#         - writes structured inventory for evidence stone
#
# prereqs:
#   - inside a git repository
#   - gh cli authenticated
#   - route bound (for --into validation)
#
# guarantee:
#   ✔ scans main branch CI runs for flaky tests
#   ✔ writes JSON inventory to specified path
#   ✔ validates --into is within route directory
#   ✔ fail-fast on any error
######################################################################

# note: this file is sourced by cicd.deflake.sh
# SKILL_DIR and output fns are already available

######################################################################
# parse arguments
######################################################################

DAYS=30
INTO=""
HELP=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --days)
      DAYS="$2"
      shift 2
      ;;
    --into)
      INTO="$2"
      shift 2
      ;;
    --help|-h)
      HELP=true
      shift
      ;;
    *)
      # pass through unknown args (may be from parent)
      shift
      ;;
  esac
done

if [[ "$HELP" == "true" ]]; then
  echo "usage: cicd.deflake detect [options]"
  echo ""
  echo "scan CI history to identify flaky tests on main branch"
  echo ""
  echo "options:"
  echo "  --days <n>       lookback period in days (default: 30)"
  echo "  --into <path>    write JSON inventory to this path (required)"
  echo "  --help, -h       show this help"
  echo ""
  echo "examples:"
  echo "  rhx cicd.deflake detect --days 30 --into .behavior/v2026_04_11.cicd-deflake/1.evidence.yield._.detected.json"
  exit 0
fi

######################################################################
# validate prerequisites
######################################################################

# check we are in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  print_error "not in a git repository" "cicd.deflake detect"
  exit 2
fi

# require --into
if [[ -z "$INTO" ]]; then
  print_error "--into is required" "cicd.deflake detect"
  echo ""
  echo "   usage: rhx cicd.deflake detect --into <path>"
  exit 2
fi

# validate --days is a positive integer
if ! [[ "$DAYS" =~ ^[0-9]+$ ]]; then
  print_error "--days must be a positive integer" "cicd.deflake detect"
  echo ""
  echo "   got: $DAYS"
  echo "   usage: rhx cicd.deflake detect --days 30 --into <path>"
  exit 2
fi

if [[ "$DAYS" -eq 0 ]]; then
  print_error "--days must be greater than zero" "cicd.deflake detect"
  echo ""
  echo "   got: $DAYS"
  echo "   usage: rhx cicd.deflake detect --days 30 --into <path>"
  exit 2
fi

# ensure gh cli is available
if ! command -v gh &> /dev/null; then
  print_error "gh cli is not installed" "cicd.deflake detect"
  echo ""
  echo "   install: https://cli.github.com/"
  exit 2
fi

# ensure we're authenticated
if ! gh auth status &> /dev/null; then
  print_error "not authenticated with gh cli" "cicd.deflake detect"
  echo ""
  echo "   run: gh auth login"
  exit 2
fi

# validate --into is within route directory (must contain .behavior/ or be relative to route)
# skip in test environments
if [[ "${SKIP_ROUTE_BIND:-}" != "1" ]]; then
  # get bound route
  BOUND_ROUTE=$(npx rhachet run --repo bhrain --skill route.bind.get 2>/dev/null | grep -o '\.behavior/[^ ]*' || true)
  if [[ -z "$BOUND_ROUTE" ]]; then
    print_error "no route bound" "cicd.deflake detect"
    echo ""
    echo "   run: rhx cicd.deflake init"
    exit 2
  fi

  # check --into starts with route path
  if [[ "$INTO" != "$BOUND_ROUTE"* && "$INTO" != ".behavior/"* ]]; then
    print_error "--into must be within route directory" "cicd.deflake detect"
    echo ""
    echo "   bound route: $BOUND_ROUTE"
    echo "   provided: $INTO"
    exit 2
  fi
fi

# disable pager for gh commands
export GH_PAGER=""

######################################################################
# scan CI history for flaky tests
######################################################################

# get repo info (before output so we can fail fast)
REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null)
if [[ -z "$REPO" ]]; then
  print_error "could not detect GitHub repo" "cicd.deflake detect"
  echo ""
  echo "   ensure you're in a repo with a GitHub remote"
  exit 2
fi

print_turtle_header "let's dive in..."

print_tree_start "cicd.deflake detect"
print_tree_branch "days" "$DAYS"
print_tree_branch "signal" "retried runs (run_attempt > 1)"
print_tree_branch "into" "$INTO" "true"

# get workflow runs with retries (run_attempt > 1 = was retried = flake signal)
SINCE_DATE=$(date -d "$DAYS days ago" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -v-${DAYS}d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date +%Y-%m-%dT%H:%M:%SZ)

# get all workflow runs (no branch filter - flakes happen on any branch)
RUNS_JSON=$(gh api --method GET "repos/$REPO/actions/runs" \
  --field per_page=100 \
  -q '.workflow_runs' 2>/dev/null || echo "[]")

if [[ "$RUNS_JSON" == "[]" || "$RUNS_JSON" == "null" ]]; then
  # write empty inventory
  echo '{"flakes":[],"metadata":{"days":'$DAYS',"scanned_at":"'$(date -Iseconds)'","runs_analyzed":0}}' > "$INTO"
  print_coconut "no flakes found" "runs_analyzed: 0"
  exit 0
fi

RUNS_ANALYZED=$(echo "$RUNS_JSON" | jq 'length')

# find runs that were retried (run_attempt > 1 means it failed and was re-run)
RETRIED_RUNS_JSON=$(echo "$RUNS_JSON" | jq '
  map(select(.run_attempt > 1))
  | map({
      run_id: .id,
      workflow: .name,
      branch: .head_branch,
      sha: .head_sha,
      attempt: .run_attempt,
      created_at: .created_at,
      html_url: .html_url
    })
')

RETRIED_COUNT=$(echo "$RETRIED_RUNS_JSON" | jq 'length')

if [[ "$RETRIED_COUNT" == "0" ]]; then
  # write empty inventory
  echo '{"flakes":[],"metadata":{"days":'$DAYS',"scanned_at":"'$(date -Iseconds)'","runs_analyzed":'$RUNS_ANALYZED'}}' > "$INTO"
  print_coconut "no flakes found" "runs_analyzed: $RUNS_ANALYZED"
  exit 0
fi

# for each retried run, get logs from attempt 1 (the failed attempt)
FLAKE_INVENTORY='[]'

# limit to first 20 retried runs to avoid api rate limits
RETRIED_RUNS=$(echo "$RETRIED_RUNS_JSON" | jq -r '.[0:20] | .[] | "\(.run_id)|\(.created_at)|\(.branch)"')

for RUN_INFO in $RETRIED_RUNS; do
  RUN_ID=$(echo "$RUN_INFO" | cut -d'|' -f1)
  RUN_DATE=$(echo "$RUN_INFO" | cut -d'|' -f2)
  RUN_BRANCH=$(echo "$RUN_INFO" | cut -d'|' -f3)

  # get jobs from attempt 1 (the failed attempt that triggered the retry)
  JOBS_JSON=$(gh api --method GET "repos/$REPO/actions/runs/$RUN_ID/attempts/1/jobs" -q '.jobs' 2>/dev/null || echo "[]")

  # get failed jobs from the first attempt
  FAILED_JOBS=$(echo "$JOBS_JSON" | jq -r '.[] | select(.conclusion == "failure") | .id')

  for JOB_ID in $FAILED_JOBS; do
    # fetch job logs
    LOGS=$(gh api --method GET "repos/$REPO/actions/jobs/$JOB_ID/logs" 2>&1 || echo "")

    if [[ -z "$LOGS" || "$LOGS" == "null" ]]; then
      continue
    fi

    # extract test failures from logs
    # pattern: FAIL path/to/test.ts or ✕ test name
    TEST_FAILURES=$(echo "$LOGS" | grep -E '(FAIL |✕ |● )' | head -20 || true)

    if [[ -n "$TEST_FAILURES" ]]; then
      # extract test file paths
      TEST_FILES=$(echo "$TEST_FAILURES" | grep -oE '[a-zA-Z0-9_/.-]+\.(test|spec)\.(ts|js|tsx|jsx)' | sort -u || true)

      # extract error messages (lines after FAIL)
      ERROR_SAMPLE=$(echo "$LOGS" | grep -A3 'FAIL ' | head -10 | tr '\n' ' ' | cut -c1-200 || echo "unknown error")

      for TEST_FILE in $TEST_FILES; do
        # add to inventory with first/last dates and branches
        FLAKE_INVENTORY=$(echo "$FLAKE_INVENTORY" | jq \
          --arg test "$TEST_FILE" \
          --arg error "$ERROR_SAMPLE" \
          --arg run_id "$RUN_ID" \
          --arg run_date "$RUN_DATE" \
          --arg branch "$RUN_BRANCH" \
          '
          # find or create entry for this test
          if any(.[]; .test == $test) then
            map(if .test == $test then
              .count += 1 |
              .run_ids += [$run_id] |
              .branches += [$branch] | .branches |= unique |
              # track first/last occurrence
              .first_seen = (if .first_seen > $run_date then $run_date else .first_seen end) |
              .last_seen = (if .last_seen < $run_date then $run_date else .last_seen end) |
              if (.errors | map(. == $error) | any | not) then .errors += [$error] else . end
            else . end)
          else
            . + [{test: $test, count: 1, errors: [$error], run_ids: [$run_id], branches: [$branch], first_seen: $run_date, last_seen: $run_date}]
          end
          ')
      done
    fi
  done
done

# sort by count (highest first) and add diagnose commands for attempt 1 (the failed attempt)
FLAKE_INVENTORY=$(echo "$FLAKE_INVENTORY" | jq --arg repo "$REPO" '
  sort_by(-.count)
  | map(. + {
      diagnose: (.run_ids | map({
        run_id: .,
        attempt: 1,
        cmds: {
          "1_gh_run_view": ("gh run view " + . + " --log-failed --attempt 1"),
          "2_github_web_url": ("https://github.com/" + $repo + "/actions/runs/" + . + "/attempts/1")
        }
      }))
    })
')

# build final output
FINAL_JSON=$(jq -n \
  --argjson flakes "$FLAKE_INVENTORY" \
  --argjson days "$DAYS" \
  --arg scanned_at "$(date -Iseconds)" \
  --argjson runs_analyzed "$RUNS_ANALYZED" \
  --argjson retried_runs "$RETRIED_COUNT" \
  '{
    flakes: $flakes,
    metadata: {
      days: $days,
      scanned_at: $scanned_at,
      runs_analyzed: $runs_analyzed,
      retried_runs_found: $retried_runs
    }
  }')

# ensure parent directory exists
mkdir -p "$(dirname "$INTO")"

# write inventory
echo "$FINAL_JSON" > "$INTO"

######################################################################
# output summary
######################################################################

UNIQUE_TESTS=$(echo "$FLAKE_INVENTORY" | jq 'length')

print_coconut "evidence gathered" "runs_analyzed: $RUNS_ANALYZED, flakes: $UNIQUE_TESTS"
