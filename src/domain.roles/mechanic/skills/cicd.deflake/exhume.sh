#!/usr/bin/env bash
######################################################################
# .what = exhume subcommand for cicd.deflake skill
#
# .why  = fetches failed attempt logs for a flaky run:
#         - runs gh run view with --log-failed --attempt N
#         - shows the actual failure, not the successful retry
#         - convenience wrapper for diagnose commands from detect output
#
# prereqs:
#   - gh cli authenticated
#
# guarantee:
#   ✔ fetches logs from specified attempt
#   ✔ caches to .cache/ for context protection
#   ✔ outputs file path only (brain reads when needed)
#   ✔ fail-fast on any error
######################################################################

# note: this file is sourced by cicd.deflake.sh
# SKILL_DIR and output fns are already available

######################################################################
# parse arguments
######################################################################

RUN_ID=""
ATTEMPT=""
HELP=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --run)
      RUN_ID="$2"
      shift 2
      ;;
    --attempt)
      ATTEMPT="$2"
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
  echo "usage: cicd.deflake exhume [options]"
  echo ""
  echo "fetch failed attempt logs for a flaky run"
  echo ""
  echo "options:"
  echo "  --run <id>       workflow run id (required)"
  echo "  --attempt <n>    attempt number (required)"
  echo "  --help, -h       show this help"
  echo ""
  echo "examples:"
  echo "  rhx cicd.deflake exhume --run 24289601579 --attempt 1"
  exit 0
fi

######################################################################
# validate prerequisites
######################################################################

# require --run
if [[ -z "$RUN_ID" ]]; then
  print_error "--run is required" "cicd.deflake exhume"
  echo ""
  echo "   usage: rhx cicd.deflake exhume --run <id> --attempt <n>"
  exit 2
fi

# require --attempt
if [[ -z "$ATTEMPT" ]]; then
  print_error "--attempt is required" "cicd.deflake exhume"
  echo ""
  echo "   usage: rhx cicd.deflake exhume --run <id> --attempt <n>"
  echo ""
  echo "   note: each attempt must be fetched explicitly"
  echo "         attempt 1 = first try (usually the failure)"
  echo "         attempt 2+ = retries"
  exit 2
fi

# validate --run is numeric
if ! [[ "$RUN_ID" =~ ^[0-9]+$ ]]; then
  print_error "--run must be a numeric run id" "cicd.deflake exhume"
  echo ""
  echo "   got: $RUN_ID"
  echo "   usage: rhx cicd.deflake exhume --run 24289601579 --attempt 1"
  exit 2
fi

# validate --attempt is numeric
if ! [[ "$ATTEMPT" =~ ^[0-9]+$ ]]; then
  print_error "--attempt must be a positive integer" "cicd.deflake exhume"
  echo ""
  echo "   got: $ATTEMPT"
  exit 2
fi

# ensure gh cli is available
if ! command -v gh &> /dev/null; then
  print_error "gh cli is not installed" "cicd.deflake exhume"
  echo ""
  echo "   install: https://cli.github.com/"
  exit 2
fi

# ensure we're authenticated
if ! gh auth status &> /dev/null; then
  print_error "not authenticated with gh cli" "cicd.deflake exhume"
  echo ""
  echo "   run: gh auth login"
  exit 2
fi

######################################################################
# setup cache directory
######################################################################

CACHE_DIR=".cache/repo=ehmpathy/role=mechanic/skill=cicd.deflake.exhume"
LOG_FILE="$CACHE_DIR/run=$RUN_ID.attempt=$ATTEMPT.log"

# ensure cache directory exists
mkdir -p "$CACHE_DIR"

# ensure .gitignore exists in cache dir
if [[ ! -f "$CACHE_DIR/.gitignore" ]]; then
  echo "*" > "$CACHE_DIR/.gitignore"
fi

######################################################################
# fetch logs
######################################################################

print_turtle_header "let's see what we find..."

print_tree_start "cicd.deflake exhume"
print_tree_branch "run" "$RUN_ID"
print_tree_branch "attempt" "$ATTEMPT"

# fetch logs and write to cache file
if ! gh run view "$RUN_ID" --log-failed --attempt "$ATTEMPT" > "$LOG_FILE" 2>&1; then
  print_tree_branch "status" "failed" "true"
  echo ""
  print_error "failed to fetch logs" "cicd.deflake exhume"
  echo ""
  echo "   try: gh run view $RUN_ID --log-failed --attempt $ATTEMPT"
  echo "   web: https://github.com/$(gh repo view --json nameWithOwner -q '.nameWithOwner')/actions/runs/$RUN_ID/attempts/$ATTEMPT"
  exit 1
fi

# count lines for summary
LINE_COUNT=$(wc -l < "$LOG_FILE")

print_tree_branch "status" "cached"
print_tree_branch "lines" "$LINE_COUNT"
print_tree_branch "into" "$LOG_FILE" "true"

# success message
echo ""
echo "⚓ wreck exhumed"
echo "   └─ read $LOG_FILE for details"
