#!/usr/bin/env bash
######################################################################
# .what = tests for pretooluse.forbid-stderr-redirect.sh hook
#
# .why  = verify the hook correctly blocks commands with 2>&1
#
# .how  = runs the hook with various stdin JSON inputs and checks
#         exit codes and output
######################################################################

set -euo pipefail
trap 'echo "ERROR: Script failed at line $LINENO" >&2' ERR

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_SCRIPT="$SCRIPT_DIR/pretooluse.forbid-stderr-redirect.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

# Build stdin JSON for hook (Claude Code format)
build_stdin_json() {
  local command="$1"
  jq -n --arg cmd "$command" '{tool_name: "Bash", tool_input: {command: $cmd}}'
}

# Run the hook with a given command
run_hook() {
  local command="$1"
  local stdin_json
  stdin_json=$(build_stdin_json "$command")
  local result
  result=$(echo "$stdin_json" | bash "$HOOK_SCRIPT" 2>&1) || true
  echo "$result"
}

# Run hook and capture exit code
run_hook_get_exit_code() {
  local command="$1"
  local stdin_json
  stdin_json=$(build_stdin_json "$command")
  local exit_code
  echo "$stdin_json" | bash "$HOOK_SCRIPT" >/dev/null 2>&1 && exit_code=0 || exit_code=$?
  echo "$exit_code"
}

# Test helpers
assert_exit_code() {
  local command="$1"
  local expected_code="$2"
  local test_name="$3"

  local actual_code
  actual_code=$(run_hook_get_exit_code "$command")

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

assert_output_contains() {
  local command="$1"
  local expected="$2"
  local test_name="$3"

  local output
  output=$(run_hook "$command")

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
  local command="$1"
  local test_name="$2"

  local output
  output=$(run_hook "$command")

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

# ============================================================
# Tests
# ============================================================

echo ""
echo "========================================"
echo "Testing pretooluse.forbid-stderr-redirect.sh"
echo "========================================"
echo ""

# --- Commands with 2>&1 (should be blocked) ---

echo -e "${YELLOW}Testing commands with 2>&1 (should block):${NC}"

assert_exit_code "ls 2>&1" 2 "ls 2>&1 is blocked"
assert_exit_code "npm test 2>&1" 2 "npm test 2>&1 is blocked"
assert_exit_code "cat file.txt 2>&1 | grep foo" 2 "cat 2>&1 | grep is blocked"
assert_exit_code "some-cmd 2>&1 > output.txt" 2 "2>&1 with redirect is blocked"
assert_exit_code "bash -c 'echo test 2>&1'" 2 "nested 2>&1 is blocked"

assert_output_contains "ls 2>&1" "BLOCKED" "2>&1 shows BLOCKED message"
assert_output_contains "npm test 2>&1" "stderr redirect" "shows stderr redirect explanation"

echo ""

# --- Commands without 2>&1 (should be allowed) ---

echo -e "${YELLOW}Testing commands without 2>&1 (should allow):${NC}"

assert_exit_code "ls" 0 "ls is allowed"
assert_exit_code "npm test" 0 "npm test is allowed"
assert_exit_code "cat file.txt" 0 "cat is allowed"
assert_exit_code "echo hello > file.txt" 0 "stdout redirect is allowed"
assert_exit_code "cmd 2> error.log" 0 "stderr to file is allowed"
assert_exit_code "cmd > out.txt 2> err.txt" 0 "separate redirects are allowed"

assert_output_empty "ls" "ls produces no output"
assert_output_empty "npm test" "npm test produces no output"

echo ""

# --- Edge cases ---

echo -e "${YELLOW}Testing edge cases:${NC}"

# Empty command
exit_code=$(
  echo '{"tool_name": "Bash", "tool_input": {"command": ""}}' | bash "$HOOK_SCRIPT" >/dev/null 2>&1
) && exit_code=0 || exit_code=$?
if [[ "$exit_code" -eq 0 ]]; then
  echo -e "${GREEN}✔ PASS${NC}: empty command exits 0"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✘ FAIL${NC}: empty command should exit 0, got $exit_code"
  FAILED=$((FAILED + 1))
fi

# No command field
exit_code=$(
  echo '{"tool_name": "Bash", "tool_input": {}}' | bash "$HOOK_SCRIPT" >/dev/null 2>&1
) && exit_code=0 || exit_code=$?
if [[ "$exit_code" -eq 0 ]]; then
  echo -e "${GREEN}✔ PASS${NC}: missing command field exits 0"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✘ FAIL${NC}: missing command should exit 0, got $exit_code"
  FAILED=$((FAILED + 1))
fi

# No stdin input - should error
exit_code=$(
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

# --- Summary ---

echo "========================================"
echo -e "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo "========================================"
echo ""

if [[ $FAILED -gt 0 ]]; then
  exit 1
fi
exit 0
