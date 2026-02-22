#!/usr/bin/env bash
######################################################################
# .what = tests for pretooluse.forbid-terms.blocklist.sh hook
#
# .why  = verify the hook correctly blocks terms from blocklist config
#         and respects HARDNUDGE retry window
#
# .how  = runs the hook with various stdin JSON inputs and checks
#         exit codes and output
######################################################################

set -euo pipefail
trap 'echo "ERROR: test failed at line $LINENO" >&2' ERR

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK="$HOOK_DIR/pretooluse.forbid-terms.blocklist.sh"

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
  rm -f "$PWD/.claude/terms.blocklist.nudges.local.json"
  echo '{}' > "$PWD/.claude/terms.blocklist.nudges.local.json"
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
  echo "$stdin_json" | bash "$HOOK" >/dev/null 2>&1 && exit_code=0 || exit_code=$?
  echo "$exit_code"
}

# run hook and store result in global vars
LAST_EXIT_CODE=""
LAST_OUTPUT=""
run_hook_capture_both() {
  local stdin_json="$1"
  LAST_OUTPUT=$(echo "$stdin_json" | bash "$HOOK" 2>&1) && LAST_EXIT_CODE=0 || LAST_EXIT_CODE=$?
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

# assert exit code and output patterns in one run
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
echo "test pretooluse.forbid-terms.blocklist.sh"
echo "========================================"
echo ""

# --- [case1] Write with blocklisted term "script" blocks ---
echo -e "${YELLOW}[case1] Write with blocklisted term 'script' - first attempt${NC}"
setup
JSON=$(build_write_json "deploy.sh" "run the deploy script here")
assert_blocks_with_output "$JSON" 2 "script" \
  "[case1] Write with 'script' blocks on first attempt" \
  "[case1] shows detected term 'script'"

# --- [case2] retry within window allows ---
echo ""
echo -e "${YELLOW}[case2] Write with blocklisted term - retry within window${NC}"
setup
JSON=$(build_write_json "deploy.sh" "run the deploy script here")
run_hook_get_exit_code "$JSON" >/dev/null  # first attempt (blocks)
assert_exit_code "$JSON" 0 "[case2] Write with 'script' allows on retry within 5 min"

# --- [case3] Write without blocklisted terms allows ---
echo ""
echo -e "${YELLOW}[case3] Write without blocklisted terms${NC}"
setup
JSON=$(build_write_json "deploy.sh" "run the deploy command here")
assert_exit_code "$JSON" 0 "[case3] Write without blocklisted terms is allowed"

# --- [case4] Edit with blocklisted term in new_string blocks ---
echo ""
echo -e "${YELLOW}[case4] Edit with blocklisted term in new_string${NC}"
setup
JSON=$(build_edit_json "readme.md" "old text" "run the script to deploy")
assert_blocks_with_output "$JSON" 2 "script" \
  "[case4] Edit with blocklisted term in new_string blocks" \
  "[case4] shows detected term 'script'"

# --- [case5] Edit with term only in old_string allows ---
echo ""
echo -e "${YELLOW}[case5] Edit with blocklisted term only in old_string${NC}"
setup
JSON=$(build_edit_json "readme.md" "run the script" "run the command")
assert_exit_code "$JSON" 0 "[case5] Edit with term only in old_string allows (only scans additions)"

# --- [case6] Bash tool call allows ---
echo ""
echo -e "${YELLOW}[case6] Bash tool call with blocklisted term${NC}"
setup
JSON=$(build_bash_json "npm run script")
assert_exit_code "$JSON" 0 "[case6] Bash tool call is allowed (not Write/Edit)"

# --- [case7] Word boundary prevents false positives ---
echo ""
echo -e "${YELLOW}[case7] Write with term as substring (typescript)${NC}"
setup
JSON=$(build_write_json "app.ts" "const x: typescript = 'hello';")
assert_exit_code "$JSON" 0 "[case7] 'typescript' does not match 'script' (word boundary)"

# --- [case8] Case-insensitive matching ---
echo ""
echo -e "${YELLOW}[case8] Write with term in uppercase (SCRIPT)${NC}"
setup
JSON=$(build_write_json "readme.md" "run the SCRIPT to deploy")
assert_blocks_with_output "$JSON" 2 "SCRIPT\|script" \
  "[case8] Write with 'SCRIPT' blocks (case-insensitive)" \
  "[case8] shows detected term in output"

# --- [case9] Empty blocklist config ---
echo ""
echo -e "${YELLOW}[case9] Empty blocklist config${NC}"
# temporarily replace blocklist with empty terms
ORIGINAL_BLOCKLIST=$(cat "$HOOK_DIR/terms.blocklist.jsonc")
echo '{"terms": []}' > "$HOOK_DIR/terms.blocklist.jsonc"
setup
JSON=$(build_write_json "test.sh" "run the script")
assert_exit_code "$JSON" 0 "[case9] Empty blocklist allows all content"
# restore blocklist
echo "$ORIGINAL_BLOCKLIST" > "$HOOK_DIR/terms.blocklist.jsonc"

# --- [case10] Empty stdin errors ---
echo ""
echo -e "${YELLOW}[case10] Empty stdin${NC}"
setup
EXIT_CODE=$(echo "" | bash "$HOOK" >/dev/null 2>&1 && echo 0 || echo $?)
if [[ "$EXIT_CODE" -eq 2 ]]; then
  echo -e "${GREEN}✔ PASS${NC}: [case10] empty stdin exits 2 (error)"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✘ FAIL${NC}: [case10] empty stdin should exit 2, got $EXIT_CODE"
  FAILED=$((FAILED + 1))
fi

# --- Verify block message includes why and alt ---
echo ""
echo -e "${YELLOW}[bonus] Verify block message includes why and alt${NC}"
setup
JSON=$(build_write_json "test.sh" "run the script")
run_hook_capture_both "$JSON"
if echo "$LAST_OUTPUT" | grep -q "why:" && echo "$LAST_OUTPUT" | grep -q "alt:"; then
  echo -e "${GREEN}✔ PASS${NC}: [bonus] block message includes why and alt"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✘ FAIL${NC}: [bonus] block message should include why and alt"
  echo "  actual output: $LAST_OUTPUT"
  FAILED=$((FAILED + 1))
fi

# --- Summary ---
echo ""
echo "========================================"
echo -e "results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo "========================================"
echo ""

# cleanup
rm -f "$PWD/.claude/terms.blocklist.nudges.local.json"

if [[ $FAILED -gt 0 ]]; then
  exit 2
fi
exit 0
