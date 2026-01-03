#!/usr/bin/env bash
######################################################################
# .what = tests for pretooluse.forbid-gerunds.sh hook
#
# .why  = verify the hook correctly blocks gerunds and respects
#         the HARDNUDGE retry window and allowlist
#
# .how  = runs the hook with various stdin JSON inputs and checks
#         exit codes and output
######################################################################

set -euo pipefail
trap 'echo "ERROR: Script failed at line $LINENO" >&2' ERR

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_SCRIPT="$SCRIPT_DIR/pretooluse.forbid-gerunds.sh"

# colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

# test counters
PASSED=0
FAILED=0

# setup: ensure .claude dir exists and clean nudge file
setup() {
  mkdir -p "$PWD/.claude"
  rm -f "$PWD/.claude/gerund.nudges.local.json"
  echo '{}' > "$PWD/.claude/gerund.nudges.local.json"
}

# build stdin JSON for Write tool
build_write_json() {
  local file_path="$1"
  local content="$2"
  jq -n --arg path "$file_path" --arg content "$content" \
    '{tool_name: "Write", tool_input: {file_path: $path, content: $content}}'
}

# build stdin JSON for Edit tool
build_edit_json() {
  local file_path="$1"
  local old_string="$2"
  local new_string="$3"
  jq -n --arg path "$file_path" --arg old "$old_string" --arg new "$new_string" \
    '{tool_name: "Edit", tool_input: {file_path: $path, old_string: $old, new_string: $new}}'
}

# build stdin JSON for Bash tool
build_bash_json() {
  local command="$1"
  jq -n --arg cmd "$command" '{tool_name: "Bash", tool_input: {command: $cmd}}'
}

# run hook and get exit code
run_hook_get_exit_code() {
  local stdin_json="$1"
  local exit_code
  echo "$stdin_json" | bash "$HOOK_SCRIPT" >/dev/null 2>&1 && exit_code=0 || exit_code=$?
  echo "$exit_code"
}

# run hook and get output
run_hook_get_output() {
  local stdin_json="$1"
  echo "$stdin_json" | bash "$HOOK_SCRIPT" 2>&1 || true
}

# assert exit code
assert_exit_code() {
  local stdin_json="$1"
  local expected_code="$2"
  local test_name="$3"

  local actual_code
  actual_code=$(run_hook_get_exit_code "$stdin_json")

  if [[ "$actual_code" -eq "$expected_code" ]]; then
    echo -e "${GREEN}✔ PASS${NC}: $test_name"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✘ FAIL${NC}: $test_name"
    echo "  expected exit code: $expected_code"
    echo "  actual exit code: $actual_code"
    FAILED=$((FAILED + 1))
  fi
}

# assert output contains
assert_output_contains() {
  local stdin_json="$1"
  local expected="$2"
  local test_name="$3"

  local output
  output=$(run_hook_get_output "$stdin_json")

  if echo "$output" | grep -q "$expected"; then
    echo -e "${GREEN}✔ PASS${NC}: $test_name"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✘ FAIL${NC}: $test_name"
    echo "  expected output to contain: $expected"
    echo "  actual output: $output"
    FAILED=$((FAILED + 1))
  fi
}

# run hook and store result in global vars (avoids subshell issues)
LAST_EXIT_CODE=""
LAST_OUTPUT=""
run_hook_capture_both() {
  local stdin_json="$1"
  LAST_OUTPUT=$(echo "$stdin_json" | bash "$HOOK_SCRIPT" 2>&1) && LAST_EXIT_CODE=0 || LAST_EXIT_CODE=$?
}

# assert exit code and output patterns in one run (avoids re-run issue)
assert_blocks_with_output() {
  local stdin_json="$1"
  local expected_code="$2"
  local expected_pattern="$3"
  local test_name_code="$4"
  local test_name_output="$5"

  run_hook_capture_both "$stdin_json"

  if [[ "$LAST_EXIT_CODE" -eq "$expected_code" ]]; then
    echo -e "${GREEN}✔ PASS${NC}: $test_name_code"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✘ FAIL${NC}: $test_name_code"
    echo "  expected exit code: $expected_code"
    echo "  actual exit code: $LAST_EXIT_CODE"
    FAILED=$((FAILED + 1))
  fi

  if echo "$LAST_OUTPUT" | grep -q "$expected_pattern"; then
    echo -e "${GREEN}✔ PASS${NC}: $test_name_output"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✘ FAIL${NC}: $test_name_output"
    echo "  expected output to contain: $expected_pattern"
    echo "  actual output: $LAST_OUTPUT"
    FAILED=$((FAILED + 1))
  fi
}

# ============================================================
# Tests
# ============================================================

echo ""
echo "========================================"
echo "test pretooluse.forbid-gerunds.sh"
echo "========================================"
echo ""

# --- Setup ---
setup

# --- Write with gerund (first attempt blocks) ---
echo -e "${YELLOW}test: Write with gerund - first attempt${NC}"

JSON=$(build_write_json "test.ts" "const existingUser = getUser();")
assert_blocks_with_output "$JSON" 2 "existing" \
  "Write with 'existingUser' blocks on first attempt" \
  "shows detected gerund 'existing'"

# --- Write with gerund (retry allows) ---
echo ""
echo -e "${YELLOW}test: Write with gerund - retry within window${NC}"

# reset nudge file, run once to record, then run again
setup
JSON=$(build_write_json "test.ts" "const existingUser = getUser();")
run_hook_get_exit_code "$JSON" >/dev/null  # first attempt (blocks)
assert_exit_code "$JSON" 0 "Write with 'existingUser' allows on retry"

# --- Write with allowlisted word ---
echo ""
echo -e "${YELLOW}test: Write with allowlisted 'string'${NC}"

setup
JSON=$(build_write_json "test.ts" "const myVar: string = 'hello';")
assert_exit_code "$JSON" 0 "Write with 'string' is allowed (in allowlist)"

# --- Write with gerund-as-noun like 'building' ---
echo ""
echo -e "${YELLOW}test: Write with gerund-as-noun 'building'${NC}"

setup
JSON=$(build_write_json "test.ts" "const building = new Building();")
assert_exit_code "$JSON" 2 "Write with 'building' blocks (no noun exceptions)"

# --- Edit with gerund in new_string ---
echo ""
echo -e "${YELLOW}test: Edit with gerund in new_string${NC}"

setup
JSON=$(build_edit_json "test.ts" "old code" "const processingQueue = [];")
assert_blocks_with_output "$JSON" 2 "processing" \
  "Edit with gerund in new_string blocks" \
  "shows detected gerund 'processing'"

# --- Edit with gerund only in old_string ---
echo ""
echo -e "${YELLOW}test: Edit with gerund only in old_string${NC}"

setup
JSON=$(build_edit_json "test.ts" "const loadingState = true;" "const stateLoaded = true;")
assert_exit_code "$JSON" 0 "Edit with gerund only in old_string allows (only scans additions)"

# --- Write without any -ing words ---
echo ""
echo -e "${YELLOW}test: Write without -ing words${NC}"

setup
JSON=$(build_write_json "test.ts" "const userFound = findUser();")
assert_exit_code "$JSON" 0 "Write without gerunds is allowed"

# --- Bash tool call ---
echo ""
echo -e "${YELLOW}test: Bash tool call${NC}"

setup
JSON=$(build_bash_json "npm run test")
assert_exit_code "$JSON" 0 "Bash tool call is allowed (not our concern)"

# --- Multiple gerunds in one write ---
echo ""
echo -e "${YELLOW}test: multiple gerunds${NC}"

setup
JSON=$(build_write_json "test.ts" "const existingUser = true; const loadingState = false;")
run_hook_capture_both "$JSON"

if [[ "$LAST_EXIT_CODE" -eq 2 ]]; then
  echo -e "${GREEN}✔ PASS${NC}: Write with multiple gerunds blocks"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✘ FAIL${NC}: Write with multiple gerunds blocks"
  echo "  expected exit code: 2"
  echo "  actual exit code: $LAST_EXIT_CODE"
  FAILED=$((FAILED + 1))
fi

if echo "$LAST_OUTPUT" | grep -q "existing" && echo "$LAST_OUTPUT" | grep -q "loading"; then
  echo -e "${GREEN}✔ PASS${NC}: shows both gerunds in message"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✘ FAIL${NC}: should show both gerunds"
  echo "  actual output: $LAST_OUTPUT"
  FAILED=$((FAILED + 1))
fi

# --- Empty stdin ---
echo ""
echo -e "${YELLOW}test: edge cases${NC}"

EXIT_CODE=$(echo "" | bash "$HOOK_SCRIPT" >/dev/null 2>&1 && echo 0 || echo $?)
if [[ "$EXIT_CODE" -eq 2 ]]; then
  echo -e "${GREEN}✔ PASS${NC}: empty stdin exits 2 (error)"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✘ FAIL${NC}: empty stdin should exit 2, got $EXIT_CODE"
  FAILED=$((FAILED + 1))
fi

# --- Summary ---
echo ""
echo "========================================"
echo -e "results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo "========================================"
echo ""

# cleanup
rm -f "$PWD/.claude/gerund.nudges.local.json"

if [[ $FAILED -gt 0 ]]; then
  exit 1
fi
exit 0
