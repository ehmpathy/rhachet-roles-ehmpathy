#!/usr/bin/env bash
######################################################################
# .what = tests for check.pretooluse.permissions.sh hook
#
# .why  = verify the hook correctly identifies allowed vs disallowed
#         commands and provides appropriate guidance
#
# .how  = creates a temporary settings file, runs the hook with
#         various stdin JSON inputs, and checks output
######################################################################

set -euo pipefail
trap 'echo "ERROR: Script failed at line $LINENO" >&2' ERR

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_SCRIPT="$SCRIPT_DIR/check.pretooluse.permissions.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Test counters (start at 0, use || true to avoid set -e issues)
PASSED=0
FAILED=0

# Create temporary test directory with settings file
setup_test_env() {
  TEST_DIR=$(mktemp -d)
  mkdir -p "$TEST_DIR/.claude"
  cat > "$TEST_DIR/.claude/settings.local.json" << 'EOF'
{
  "permissions": {
    "allow": [
      "Bash(npm run test:*)",
      "Bash(npm run fix:*)",
      "Bash(THOROUGH=true npm run test:*)",
      "Bash(npx jest *)",
      "Bash(cat *)"
    ],
    "deny": [],
    "ask": []
  }
}
EOF
  echo "$TEST_DIR"
}

# Cleanup test environment
cleanup_test_env() {
  rm -rf "$1"
}

# Build stdin JSON for hook (Claude Code format)
build_stdin_json() {
  local command="$1"
  jq -n --arg cmd "$command" '{tool_name: "Bash", tool_input: {command: $cmd}}'
}

# Run the hook with a given command (and optional flags)
run_hook() {
  local test_dir="$1"
  local command="$2"
  local flags="${3:-}"

  local stdin_json
  stdin_json=$(build_stdin_json "$command")

  echo "  [DEBUG] Running hook with command: $command, flags: $flags" >&2
  local result
  result=$(
    cd "$test_dir"
    echo "$stdin_json" | bash "$HOOK_SCRIPT" $flags 2>&1
  ) || {
    echo "  [DEBUG] Hook exited with code: $?" >&2
  }
  echo "  [DEBUG] Hook output: ${result:-<empty>}" >&2
  echo "$result"
}

# Run hook and capture exit code
run_hook_get_exit_code() {
  local test_dir="$1"
  local command="$2"
  local flags="${3:-}"

  local stdin_json
  stdin_json=$(build_stdin_json "$command")

  local exit_code
  (
    cd "$test_dir"
    echo "$stdin_json" | bash "$HOOK_SCRIPT" $flags >/dev/null 2>&1
  ) && exit_code=0 || exit_code=$?

  echo "$exit_code"
}

# Test helper
assert_output_contains() {
  local output="$1"
  local expected="$2"
  local test_name="$3"

  if echo "$output" | grep -q "$expected"; then
    echo -e "${GREEN}✔ PASS${NC}: $test_name"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✘ FAIL${NC}: $test_name"
    echo "  Expected output to contain: $expected"
    echo "  Actual output: $output"
    FAILED=$((FAILED + 1))
  fi
}

assert_output_empty() {
  local output="$1"
  local test_name="$2"

  if [[ -z "$output" ]]; then
    echo -e "${GREEN}✔ PASS${NC}: $test_name"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✘ FAIL${NC}: $test_name"
    echo "  Expected empty output"
    echo "  Actual output: $output"
    FAILED=$((FAILED + 1))
  fi
}

assert_exit_code() {
  local test_dir="$1"
  local command="$2"
  local expected_code="$3"
  local test_name="$4"
  local flags="${5:-}"

  local actual_code
  actual_code=$(run_hook_get_exit_code "$test_dir" "$command" "$flags")

  if [[ "$actual_code" -eq "$expected_code" ]]; then
    echo -e "${GREEN}✔ PASS${NC}: $test_name"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✘ FAIL${NC}: $test_name"
    echo "  Expected exit code: $expected_code"
    echo "  Actual exit code: $actual_code"
    FAILED=$((FAILED + 1))
  fi
}

# ============================================================
# Tests
# ============================================================

echo ""
echo "========================================"
echo "Testing check.pretooluse.permissions.sh"
echo "========================================"
echo ""

# Setup
TEST_DIR=$(setup_test_env)
echo -e "${YELLOW}Test environment:${NC} $TEST_DIR"
echo ""

# --- Allowed commands (should produce no output) ---

echo -e "${YELLOW}Testing allowed commands (should be silent):${NC}"

output=$(run_hook "$TEST_DIR" "npm run test:unit")
assert_output_empty "$output" "npm run test:unit matches 'npm run test:*'"

output=$(run_hook "$TEST_DIR" "npm run test:integration")
assert_output_empty "$output" "npm run test:integration matches 'npm run test:*'"

output=$(run_hook "$TEST_DIR" "npm run fix:lint")
assert_output_empty "$output" "npm run fix:lint matches 'npm run fix:*'"

output=$(run_hook "$TEST_DIR" "THOROUGH=true npm run test:unit")
assert_output_empty "$output" "THOROUGH=true npm run test:unit matches pattern"

output=$(run_hook "$TEST_DIR" "npx jest src/foo.test.ts")
assert_output_empty "$output" "npx jest src/foo.test.ts matches 'npx jest *'"

output=$(run_hook "$TEST_DIR" "cat package.json")
assert_output_empty "$output" "cat package.json matches 'cat *'"

echo ""

# --- Test :* suffix matcher (Claude Code special pattern) ---

echo -e "${YELLOW}Testing :* suffix matcher (Claude Code special pattern):${NC}"

# :* should match with colon and suffix
output=$(run_hook "$TEST_DIR" "npm run test:unit")
assert_output_empty "$output" ":* matches 'npm run test:unit' (colon + suffix)"

# :* should match with just colon
output=$(run_hook "$TEST_DIR" "npm run test:")
assert_output_empty "$output" ":* matches 'npm run test:' (colon only)"

# :* should match without colon at all (the colon is optional in :*)
output=$(run_hook "$TEST_DIR" "npm run test")
assert_output_empty "$output" ":* matches 'npm run test' (no colon - colon is optional)"

# :* should match long suffixes
output=$(run_hook "$TEST_DIR" "npm run test:integration:slow:verbose")
assert_output_empty "$output" ":* matches 'npm run test:integration:slow:verbose' (long suffix)"

# Verify * still works as glob (not :* pattern)
output=$(run_hook "$TEST_DIR" "cat /path/to/file.txt")
assert_output_empty "$output" "* glob still works: 'cat /path/to/file.txt'"

output=$(run_hook "$TEST_DIR" "npx jest anything/here")
assert_output_empty "$output" "* glob still works: 'npx jest anything/here'"

echo ""

# --- Disallowed commands (HARDNUDGE default - should block with exit 2) ---

echo -e "${YELLOW}Testing disallowed commands (HARDNUDGE - should block with exit 2):${NC}"

rm -f "$TEST_DIR/.claude/permission.nudges.local.json"
output=$(run_hook "$TEST_DIR" "rm -rf /")
assert_output_contains "$output" "BLOCKED" "rm -rf / shows BLOCKED message"

rm -f "$TEST_DIR/.claude/permission.nudges.local.json"
output=$(run_hook "$TEST_DIR" "npx prettier --write .")
assert_output_contains "$output" "npm run test:" "npx prettier shows available patterns"

rm -f "$TEST_DIR/.claude/permission.nudges.local.json"
output=$(run_hook "$TEST_DIR" "git status")
assert_output_contains "$output" "pre-approved permissions" "git status shows guidance"

rm -f "$TEST_DIR/.claude/permission.nudges.local.json"
output=$(run_hook "$TEST_DIR" "curl https://example.com")
assert_output_contains "$output" "npm run fix:" "curl shows npm run fix pattern"

echo ""

# --- Exit codes ---

echo -e "${YELLOW}Testing exit codes:${NC}"

assert_exit_code "$TEST_DIR" "npm run test:unit" 0 "allowed command exits 0"

rm -f "$TEST_DIR/.claude/permission.nudges.local.json"
assert_exit_code "$TEST_DIR" "rm -rf /" 2 "HARDNUDGE first attempt exits 2 (blocked)"
assert_exit_code "$TEST_DIR" "rm -rf /" 0 "HARDNUDGE retry exits 0 (normal permission flow)"

assert_exit_code "$TEST_DIR" "npm run fix:lint" 0 "allowed command exits 0 (SOFTNUDGE)" "--mode SOFTNUDGE"
assert_exit_code "$TEST_DIR" "unknown-cmd" 0 "disallowed command exits 0 (SOFTNUDGE)" "--mode SOFTNUDGE"

echo ""

# --- Edge cases ---

echo -e "${YELLOW}Testing edge cases:${NC}"

# Empty command in JSON
output=$(
  cd "$TEST_DIR"
  echo '{"tool_name": "Bash", "tool_input": {"command": ""}}' | bash "$HOOK_SCRIPT" 2>&1
)
assert_output_empty "$output" "empty command produces no output"

# No command field
output=$(
  cd "$TEST_DIR"
  echo '{"tool_name": "Bash", "tool_input": {}}' | bash "$HOOK_SCRIPT" 2>&1
)
assert_output_empty "$output" "missing command field produces no output"

# No stdin input - should error
exit_code=$(
  cd "$TEST_DIR"
  echo "" | bash "$HOOK_SCRIPT" >/dev/null 2>&1
) && exit_code=0 || exit_code=$?
if [[ "$exit_code" -eq 2 ]]; then
  echo -e "${GREEN}✔ PASS${NC}: empty stdin exits 2 (error)"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✘ FAIL${NC}: empty stdin should exit 2, got $exit_code"
  FAILED=$((FAILED + 1))
fi

echo ""

# --- HARDNUDGE mode (default) ---

echo -e "${YELLOW}Testing HARDNUDGE mode (default):${NC}"

# Clean up any existing attempted file
rm -f "$TEST_DIR/.claude/permission.nudges.local.json"

# First attempt with HARDNUDGE should block (exit 2)
output=$(run_hook "$TEST_DIR" "dangerous-cmd-1")
assert_output_contains "$output" "BLOCKED" "HARDNUDGE: first attempt shows BLOCKED message"

# Verify the attempted file was created
if [[ -f "$TEST_DIR/.claude/permission.nudges.local.json" ]]; then
  echo -e "${GREEN}✔ PASS${NC}: HARDNUDGE: permission.nudges.local.json was created"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✘ FAIL${NC}: HARDNUDGE: permission.nudges.local.json was not created"
  FAILED=$((FAILED + 1))
fi

# Verify the command was recorded
recorded=$(jq -r '."dangerous-cmd-1"' "$TEST_DIR/.claude/permission.nudges.local.json" 2>/dev/null || echo "null")
if [[ "$recorded" != "null" && "$recorded" != "0" ]]; then
  echo -e "${GREEN}✔ PASS${NC}: HARDNUDGE: command was recorded in attempted file"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✘ FAIL${NC}: HARDNUDGE: command was not recorded (got: $recorded)"
  FAILED=$((FAILED + 1))
fi

# Second attempt (immediate retry) should be silent - no output, normal permission flow
output=$(run_hook "$TEST_DIR" "dangerous-cmd-1")
assert_output_empty "$output" "HARDNUDGE: second attempt is silent (normal permission flow)"

# Allowed commands should still exit 0 silently even in HARDNUDGE mode
output=$(run_hook "$TEST_DIR" "npm run test:unit")
assert_output_empty "$output" "HARDNUDGE: allowed command still silent"

# A different disallowed command should block on first attempt
rm -f "$TEST_DIR/.claude/permission.nudges.local.json"
assert_exit_code "$TEST_DIR" "curl https://evil.com" 2 "HARDNUDGE: different command blocks on first attempt"

echo ""

# --- HARDNUDGE window expiry (using --window flag) ---

echo -e "${YELLOW}Testing HARDNUDGE window expiry:${NC}"

# Record a command attempt now
rm -f "$TEST_DIR/.claude/permission.nudges.local.json"
assert_exit_code "$TEST_DIR" "wget http://example.com" 2 "HARDNUDGE: first attempt exits 2 (blocked)"

# With default 60s window, immediate retry should be silent (normal permission flow)
output=$(run_hook "$TEST_DIR" "wget http://example.com")
assert_output_empty "$output" "HARDNUDGE: retry within window is silent (normal permission flow)"

# With --window 0, even immediate retry should block (window expired)
assert_exit_code "$TEST_DIR" "wget http://example.com" 2 "HARDNUDGE: --window 0 forces block on every attempt" "--window 0"

echo ""

# --- Explicit --mode HARDNUDGE ---

echo -e "${YELLOW}Testing explicit --mode HARDNUDGE:${NC}"

rm -f "$TEST_DIR/.claude/permission.nudges.local.json"
assert_exit_code "$TEST_DIR" "explicit-hardnudge-test" 2 "explicit --mode HARDNUDGE blocks first attempt" "--mode HARDNUDGE"

output=$(run_hook "$TEST_DIR" "explicit-hardnudge-test" "--mode HARDNUDGE")
assert_output_empty "$output" "explicit --mode HARDNUDGE retry is silent (normal permission flow)"

echo ""

# --- SOFTNUDGE mode ---

echo -e "${YELLOW}Testing --mode SOFTNUDGE:${NC}"

rm -f "$TEST_DIR/.claude/permission.nudges.local.json"

# SOFTNUDGE outputs plain text warning (no JSON) so normal permission flow continues
output=$(run_hook "$TEST_DIR" "softnudge-test-cmd" "--mode SOFTNUDGE")
assert_output_contains "$output" "not covered by existing pre-approved permissions" "SOFTNUDGE: shows warning message"

# Verify it does NOT return hookSpecificOutput (would interfere with permission flow)
if echo "$output" | jq -e '.hookSpecificOutput' >/dev/null 2>&1; then
  echo -e "${RED}✘ FAIL${NC}: SOFTNUDGE: should NOT return hookSpecificOutput JSON"
  FAILED=$((FAILED + 1))
else
  echo -e "${GREEN}✔ PASS${NC}: SOFTNUDGE: does not return hookSpecificOutput (normal permission flow)"
  PASSED=$((PASSED + 1))
fi

# SOFTNUDGE should not create attempted file
if [[ ! -f "$TEST_DIR/.claude/permission.nudges.local.json" ]]; then
  echo -e "${GREEN}✔ PASS${NC}: SOFTNUDGE: does not create permission.nudges.local.json"
  PASSED=$((PASSED + 1))
else
  # File might exist from previous tests, check if our command was NOT added
  recorded=$(jq -r '."softnudge-test-cmd"' "$TEST_DIR/.claude/permission.nudges.local.json" 2>/dev/null || echo "null")
  if [[ "$recorded" == "null" || "$recorded" == "0" ]]; then
    echo -e "${GREEN}✔ PASS${NC}: SOFTNUDGE: does not record commands in attempted file"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✘ FAIL${NC}: SOFTNUDGE: should not record commands (got: $recorded)"
    FAILED=$((FAILED + 1))
  fi
fi

echo ""

# Cleanup
cleanup_test_env "$TEST_DIR"

# --- Summary ---

echo "========================================"
echo -e "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo "========================================"
echo ""

if [[ $FAILED -gt 0 ]]; then
  exit 1
fi
exit 0
