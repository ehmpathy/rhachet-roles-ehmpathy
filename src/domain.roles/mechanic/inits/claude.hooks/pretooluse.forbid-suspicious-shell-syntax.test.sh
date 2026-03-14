#!/usr/bin/env bash
######################################################################
# .what = tests for pretooluse.forbid-suspicious-shell-syntax.sh hook
#
# .why  = verify the hook correctly blocks unquoted shell metacharacters
#         while it allows quoted regex patterns and safe commands
#
# .how  = runs the hook with various stdin JSON inputs and checks
#         exit codes and output
######################################################################

set -euo pipefail
trap 'echo "ERROR: Test failed at line $LINENO" >&2' ERR

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK="$SCRIPT_DIR/pretooluse.forbid-suspicious-shell-syntax.sh"

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

# Run hook and capture exit code
run_hook_exit_code() {
  local command="$1"
  local stdin_json
  stdin_json=$(build_stdin_json "$command")
  local exit_code
  echo "$stdin_json" | bash "$HOOK" >/dev/null 2>&1 && exit_code=0 || exit_code=$?
  echo "$exit_code"
}

# Run the hook and capture output
run_hook_output() {
  local command="$1"
  local stdin_json
  stdin_json=$(build_stdin_json "$command")
  echo "$stdin_json" | bash "$HOOK" 2>&1 || true
}

# Test helpers
assert_blocked() {
  local command="$1"
  local test_name="$2"
  local actual_code
  actual_code=$(run_hook_exit_code "$command")

  if [[ "$actual_code" -eq 2 ]]; then
    echo -e "${GREEN}✔ PASS${NC}: $test_name"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✘ FAIL${NC}: $test_name"
    echo "  Expected: blocked (exit 2)"
    echo "  Actual: exit $actual_code"
    echo "  Command: $command"
    FAILED=$((FAILED + 1))
  fi
}

assert_allowed() {
  local command="$1"
  local test_name="$2"
  local actual_code
  actual_code=$(run_hook_exit_code "$command")

  if [[ "$actual_code" -eq 0 ]]; then
    echo -e "${GREEN}✔ PASS${NC}: $test_name"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✘ FAIL${NC}: $test_name"
    echo "  Expected: allowed (exit 0)"
    echo "  Actual: exit $actual_code"
    echo "  Command: $command"
    FAILED=$((FAILED + 1))
  fi
}

assert_output_contains() {
  local command="$1"
  local expected="$2"
  local test_name="$3"
  local output
  output=$(run_hook_output "$command")

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

# ============================================================
# Tests
# ============================================================

echo ""
echo "========================================"
echo "Test: pretooluse.forbid-suspicious-shell-syntax.sh"
echo "========================================"
echo ""

# --- Unquoted =( should be blocked ---

echo -e "${YELLOW}Unquoted =( (zsh process substitution) - should block:${NC}"

assert_blocked 'diff =(curl http://a) =(curl http://b)' "diff with =() process substitution"
assert_blocked 'cat =(echo hello)' "cat with =() process substitution"
assert_blocked 'vim =(git diff)' "vim with =() process substitution"
assert_blocked 'cmd =(other) more' "=() in middle of command"
assert_blocked 'echo test && cat =(foo)' "=() after &&"

assert_output_contains 'cat =(echo hello)' "BLOCKED" "=() shows BLOCKED message"
assert_output_contains 'cat =(echo hello)' "zsh process substitution" "=() explains zsh process substitution"

echo ""

# --- Quoted =( should be allowed (regex patterns) ---

echo -e "${YELLOW}Quoted =( in regex patterns - should allow:${NC}"

assert_allowed 'npm run test:unit -- --testPathPattern="(foo|bar)"' "double-quoted regex with ()"
assert_allowed "npm run test:unit -- --testPathPattern='(foo|bar)'" "single-quoted regex with ()"
assert_allowed 'grep -E "(foo|bar)" file.txt' "grep with quoted regex"
assert_allowed 'jest --testPathPattern="(setStone|getStone)"' "jest with quoted test pattern"
assert_allowed 'sed "s/(old)/new/g" file.txt' "sed with quoted pattern"
assert_allowed 'echo "=(not substitution)"' "=( inside double quotes"
assert_allowed "echo '=(not substitution)'" "=( inside single quotes"
assert_allowed 'npm test -- --grep="=(test)"' "=( in quoted argument"

echo ""

# --- Unquoted <( should be blocked ---

echo -e "${YELLOW}Unquoted <( (bash process substitution) - should block:${NC}"

assert_blocked 'diff <(ls dir1) <(ls dir2)' "diff with <() process substitution"
assert_blocked 'cat <(echo hello)' "cat with <() process substitution"
assert_blocked 'while read line; do echo $line; done < <(cmd)' "redirect from <()"
assert_blocked 'paste <(cut -f1 a) <(cut -f1 b)' "paste with two <()"

assert_output_contains 'diff <(ls a) <(ls b)' "BLOCKED" "<() shows BLOCKED message"
assert_output_contains 'diff <(ls a) <(ls b)' "process substitution" "<() explains process substitution"

echo ""

# --- Quoted <( should be allowed ---

echo -e "${YELLOW}Quoted <( - should allow:${NC}"

assert_allowed 'echo "<(not a substitution)"' "<( in double quotes"
assert_allowed "echo '<(not a substitution)'" "<( in single quotes"
assert_allowed 'grep "<(" file.txt' "search for <( literal"

echo ""

# --- Unquoted >( should be blocked ---

echo -e "${YELLOW}Unquoted >( (process substitution output) - should block:${NC}"

assert_blocked 'cmd | tee >(other)' "tee with >() process substitution"
assert_blocked 'echo test > >(cat)' "redirect to >()"
assert_blocked 'ls > >(grep foo)' "ls to >()"

assert_output_contains 'cmd | tee >(other)' "BLOCKED" ">() shows BLOCKED message"

echo ""

# --- Quoted >( should be allowed ---

echo -e "${YELLOW}Quoted >( - should allow:${NC}"

assert_allowed 'echo ">(not a substitution)"' ">( in double quotes"
assert_allowed "echo '>(not a substitution)'" ">( in single quotes"

echo ""

# --- Normal commands should be allowed ---

echo -e "${YELLOW}Normal commands - should allow:${NC}"

assert_allowed 'ls -la' "simple ls"
assert_allowed 'npm run test' "npm run"
assert_allowed 'git status' "git status"
assert_allowed 'echo hello | grep h' "pipe"
assert_allowed 'cat file.txt > output.txt' "stdout redirect"
assert_allowed 'cmd1 && cmd2' "compound &&"
assert_allowed 'cmd1 || cmd2' "compound ||"
assert_allowed 'for i in 1 2 3; do echo $i; done' "for loop"
assert_allowed 'if [ -f file ]; then cat file; fi' "if statement"
assert_allowed 'echo $(date)' "command substitution $()"
assert_allowed 'VAR=$(cmd)' "variable assignment with $()"
assert_allowed 'arr=(1 2 3)' "array assignment (not process substitution)"
assert_allowed 'echo ${arr[@]}' "array expansion"

echo ""

# --- Edge cases ---

echo -e "${YELLOW}Edge cases:${NC}"

# Empty command
exit_code=$(
  echo '{"tool_name": "Bash", "tool_input": {"command": ""}}' | bash "$HOOK" >/dev/null 2>&1
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
  echo '{"tool_name": "Bash", "tool_input": {}}' | bash "$HOOK" >/dev/null 2>&1
) && exit_code=0 || exit_code=$?
if [[ "$exit_code" -eq 0 ]]; then
  echo -e "${GREEN}✔ PASS${NC}: absent command field exits 0"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✘ FAIL${NC}: absent command should exit 0, got $exit_code"
  FAILED=$((FAILED + 1))
fi

# No stdin input - should error
exit_code=$(
  echo "" | bash "$HOOK" >/dev/null 2>&1
) && exit_code=0 || exit_code=$?
if [[ "$exit_code" -eq 2 ]]; then
  echo -e "${GREEN}✔ PASS${NC}: empty stdin exits 2 (error)"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✘ FAIL${NC}: empty stdin should exit 2, got $exit_code"
  FAILED=$((FAILED + 1))
fi

# Mixed quotes - =( after close quote should still be caught
assert_blocked 'echo "hello" =(cmd)' "=() after quoted string"
assert_blocked "echo 'hello' =(cmd)" "=() after single-quoted string"

# Nested quotes - inner =( should be allowed
assert_allowed 'bash -c "echo \"=(test)\""' "=() in nested double quotes"

# Escape sequences should not affect quote detection
assert_allowed 'echo "test \" still quoted =("' "escaped quote inside double quotes"

echo ""

# --- Consecutive quotes at word start (obfuscation) ---

echo -e "${YELLOW}Consecutive quotes at word start - should block:${NC}"

assert_blocked "grep '\"test:unit\"' file" "single-then-double quote at word start"
assert_blocked 'grep "'"'"'test'"'"'" file' "double-then-single at word start"
assert_blocked "echo '\"hello\"'" "consecutive quotes in echo"

assert_output_contains "grep '\"test\"' file" "BLOCKED" "consecutive quotes shows BLOCKED"
assert_output_contains "grep '\"test\"' file" "consecutive quotes" "explains consecutive quotes"

echo ""

echo -e "${YELLOW}Valid quote patterns - should allow:${NC}"

assert_allowed 'grep "test" file' "simple double quotes"
assert_allowed "grep 'test' file" "simple single quotes"
assert_allowed 'echo "hello world"' "double quoted string"
assert_allowed "echo 'hello world'" "single quoted string"
assert_allowed 'VAR="test" && echo $VAR' "variable assignment"

echo ""

# --- Complex real-world patterns ---

echo -e "${YELLOW}Real-world patterns:${NC}"

assert_allowed 'npm run test:unit -- --testPathPattern="(setStoneAsRewound|delStoneGuardArtifacts|getOneStoneGuardApproval|stepRouteStoneSet)" --verbose' "jest with multiple test patterns"
assert_allowed 'grep -E "(error|warn|fail)" log.txt | head -20' "grep with alternation"
assert_allowed 'find . -name "*.ts" -exec grep -l "(TODO|FIXME)" {} \;' "find with grep pattern"
assert_allowed 'sed -E "s/(old)(pattern)/\\1-new-\\2/g" file.txt' "sed with capture groups"

echo ""

# --- Summary ---

echo "========================================"
echo -e "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo "========================================"
echo ""

if [[ $FAILED -gt 0 ]]; then
  exit 2
fi
exit 0
