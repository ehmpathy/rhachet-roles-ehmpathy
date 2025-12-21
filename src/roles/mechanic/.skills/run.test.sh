#!/usr/bin/env bash
######################################################################
# # tldr
#
# .what: run tests with proper setup, logs, and context preservation
# .why:  preserve test output for review without rerun, auto-configure AWS and testdb
# .how:  ./run.test.sh unit
#        ./run.test.sh integration "pattern"
#        ./run.test.sh acceptance
#
######################################################################
# # full
#
# .what
#
# run tests with proper setup, logs, and context preservation
#
# supports unit, integration, and acceptance tests with automatic:
# - output logs to .log/test/ for repeated review
# - scope filter and THOROUGH mode
# - AWS profile configuration (for repos with AWS resources)
# - test database provision (when start:testdb is available)
#
#
# .why
#
# tests require different setup depending on their type:
#
# unit tests:
#   - isolated, no external dependencies
#   - fast execution
#   - use --changedSince by default for speed
#
# integration tests:
#   - interact with databases and remote resources
#   - require AWS credentials (if repo uses AWS)
#   - require test databases (if repo uses a testdb)
#   - test interactions between components
#
# acceptance tests:
#   - end-to-end testing
#   - require AWS credentials (if repo uses AWS)
#   - require test database provisioning
#   - verify complete user workflows
#
# all tests benefit from:
#   - output logs via tee to .log/test/{type}/run.{timestamp}.out
#   - preserved context for review without rerun
#   - comparison of results across test runs
#
#
# .howto.use
#
# ## unit tests
#
# run all unit tests (uses --changedSince for speed):
#   ./run.test.sh unit
#
# run unit tests that match a pattern (automatically THOROUGH):
#   ./run.test.sh unit "syncPhone"
#   ./run.test.sh unit "relate.*Path"
#
# run all unit tests thoroughly (no --changedSince):
#   THOROUGH=true ./run.test.sh unit
#
# behavior:
#   - no AWS_PROFILE configuration
#   - no test database provision
#   - uses --changedSince by default (unless scope provided or THOROUGH=true)
#   - logs to .log/test/unit/run.{timestamp}.out
#
#
# ## integration tests
#
# run all integration tests:
#   ./run.test.sh integration
#
# run integration tests that match a pattern:
#   ./run.test.sh integration "database.*sync"
#   ./run.test.sh integration "whodis"
#
# behavior:
#   - sets AWS_PROFILE=$org.dev (if awsAccountId in declapract.use.yml)
#   - runs start:testdb (if available in package.json)
#   - uses --changedSince by default (unless scope provided or THOROUGH=true)
#   - logs to .log/test/integration/run.{timestamp}.out
#
#
# ## acceptance tests
#
# run all acceptance tests locally:
#   ./run.test.sh acceptance
#
# run acceptance tests that match a pattern:
#   ./run.test.sh acceptance "user.*flow"
#
# behavior:
#   - sets AWS_PROFILE=$org.dev (if awsAccountId in declapract.use.yml)
#   - runs start:testdb (if available in package.json)
#   - uses test:acceptance:locally (local execution only for now)
#   - logs to .log/test/acceptance/run.{timestamp}.out
#
#
# ## review test output
#
# all test output is logged via tee to .log/test/{type}/run.{timestamp}.out
#
# review the latest test run:
#   cat .log/test/unit/run.*.out | tail -n 1 | xargs cat
#
# compare test results across runs:
#   ls -t .log/test/unit/
#   diff .log/test/unit/run.2025-11-23T15-00-00Z.out \
#        .log/test/unit/run.2025-11-23T15-10-00Z.out
#
# search for failures in logs:
#   grep -r "FAIL" .log/test/unit/
#
#
# .guarantee
#
#   ✔ configure AWS_PROFILE only if awsAccountId in declapract.use.yml
#   ✔ provision test database only if start:testdb in package.json
#   ✔ log output to .log/test/{type}/run.{timestamp}.out via tee
#   ✔ preserve context for repeated review without rerun
#   ✔ support jest pattern/scope filter
#   ✔ automatically set THOROUGH=true when scope is provided
#   ✔ fail-fast on test failures
#   ✔ show relative paths for easy navigation
######################################################################

set -euo pipefail

# Parse arguments
TEST_TYPE="${1:-}"
SCOPE="${2:-}"

# Default to THOROUGH mode when scope is provided (unless explicitly set)
if [[ -n "$SCOPE" ]] && [[ -z "${THOROUGH:-}" ]]; then
  export THOROUGH=true
fi

# Validate test type
if [[ -z "$TEST_TYPE" ]]; then
  echo "✗ test type required"
  echo ""
  echo "usage: $0 <type> [pattern]"
  echo ""
  echo "types:"
  echo "  unit         - run unit tests"
  echo "  integration  - run integration tests"
  echo "  acceptance   - run acceptance tests"
  echo ""
  echo "examples:"
  echo "  $0 unit"
  echo "  $0 integration 'database.*sync'"
  echo "  THOROUGH=true $0 unit"
  exit 1
fi

if [[ ! "$TEST_TYPE" =~ ^(unit|integration|acceptance)$ ]]; then
  echo "✗ invalid test type: $TEST_TYPE"
  echo "   valid types: unit, integration, acceptance"
  exit 1
fi

PROJECT_ROOT="$PWD"
LOG_DIR="$PROJECT_ROOT/.log/test/$TEST_TYPE"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
LOG_FILE="$LOG_DIR/run.$TIMESTAMP.out"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

echo "→ run $TEST_TYPE tests"
echo "→ log to: ${LOG_FILE#$PROJECT_ROOT/}"
echo ""

# Configure AWS profile and provision test database for integration/acceptance tests
if [[ "$TEST_TYPE" == "integration" ]] || [[ "$TEST_TYPE" == "acceptance" ]]; then
  # Check if awsAccountId is specified in declapract.use.yml
  if [[ -f "declapract.use.yml" ]] && grep -q "awsAccountId:" declapract.use.yml; then
    # Extract organization from declapract.use.yml
    ORGANIZATION=$(grep -E '^\s*organizationName:' declapract.use.yml | sed "s/.*organizationName:[[:space:]]*['\"]*//" | sed "s/['\"].*//")

    if [[ -n "$ORGANIZATION" ]]; then
      # Configure AWS profile for dev resources
      export AWS_PROFILE="$ORGANIZATION.dev"
      echo "→ AWS_PROFILE=$AWS_PROFILE"
    fi
  fi

  # Start test database if available in package.json
  if npm run | grep -q "start:testdb"; then
    echo "→ start:testdb"
    echo ""
    npm run start:testdb 2>&1 | tee -a "$LOG_FILE"
  fi
fi

# Build the test command
case "$TEST_TYPE" in
  unit)
    TEST_COMMAND="npm run test:unit"
    ;;
  integration)
    TEST_COMMAND="npm run test:integration"
    ;;
  acceptance)
    # only support local acceptance tests for now
    TEST_COMMAND="npm run test:acceptance:locally"
    ;;
esac

# Add scope filter if provided
if [[ -n "$SCOPE" ]]; then
  echo "→ scope filter: $SCOPE"
  echo ""
  TEST_COMMAND="$TEST_COMMAND -- '$SCOPE'"
else
  echo "→ scope: all tests"
  echo ""
fi

# Run tests with output logged via tee
echo "> $TEST_COMMAND" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# For unit tests, strip color codes from log file while preserving them in terminal output
if [[ "$TEST_TYPE" == "unit" ]]; then
  eval "$TEST_COMMAND" 2>&1 | tee >(sed 's/\x1B\[[0-9;]*[JKmsu]//g' >> "$LOG_FILE")
  TEST_EXIT_CODE=${PIPESTATUS[0]}
else
  eval "$TEST_COMMAND" 2>&1 | tee -a "$LOG_FILE"
  TEST_EXIT_CODE=${PIPESTATUS[0]}
fi

echo "" | tee -a "$LOG_FILE"

if [[ $TEST_EXIT_CODE -eq 0 ]]; then
  echo "✓ $TEST_TYPE tests complete!" | tee -a "$LOG_FILE"
  echo "→ log saved: ${LOG_FILE#$PROJECT_ROOT/}"
  exit 0
else
  echo "✗ $TEST_TYPE tests failed" | tee -a "$LOG_FILE"
  echo "→ log saved: ${LOG_FILE#$PROJECT_ROOT/}"
  echo ""
  echo "→ review the log file for details:"
  echo "   cat ${LOG_FILE#$PROJECT_ROOT/}"
  exit $TEST_EXIT_CODE
fi
