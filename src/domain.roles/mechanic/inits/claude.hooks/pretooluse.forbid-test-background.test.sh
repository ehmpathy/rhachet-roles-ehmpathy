#!/usr/bin/env bash
######################################################################
# test: pretooluse.forbid-test-background.sh
######################################################################

set -euo pipefail

HOOK_PATH="$(dirname "$0")/pretooluse.forbid-test-background.sh"

# helper: run hook with input and check exit code
test_hook() {
  local description="$1"
  local input="$2"
  local expected_exit="$3"

  local actual_exit=0
  echo "$input" | bash "$HOOK_PATH" > /dev/null 2>&1 || actual_exit=$?

  if [[ "$actual_exit" -eq "$expected_exit" ]]; then
    echo "✓ $description"
  else
    echo "✗ $description (expected exit $expected_exit, got $actual_exit)"
    exit 1
  fi
}

echo "=== pretooluse.forbid-test-background.sh tests ==="
echo ""

# --- should block ---

test_hook "blocks rhx git.repo.test in background" \
  '{"tool_name": "Bash", "tool_input": {"command": "rhx git.repo.test --what unit", "run_in_background": true}}' \
  2

test_hook "blocks rhx git.repo.test --what integration in background" \
  '{"tool_name": "Bash", "tool_input": {"command": "rhx git.repo.test --what integration --scope foo", "run_in_background": true}}' \
  2

test_hook "blocks npx rhachet run --skill git.repo.test in background" \
  '{"tool_name": "Bash", "tool_input": {"command": "npx rhachet run --skill git.repo.test --what unit", "run_in_background": true}}' \
  2

test_hook "blocks ./node_modules/.bin/rhx git.repo.test in background" \
  '{"tool_name": "Bash", "tool_input": {"command": "./node_modules/.bin/rhx git.repo.test --what unit", "run_in_background": true}}' \
  2

# --- should allow ---

test_hook "allows rhx git.repo.test in foreground (no flag)" \
  '{"tool_name": "Bash", "tool_input": {"command": "rhx git.repo.test --what unit"}}' \
  0

test_hook "allows rhx git.repo.test in foreground (flag false)" \
  '{"tool_name": "Bash", "tool_input": {"command": "rhx git.repo.test --what unit", "run_in_background": false}}' \
  0

test_hook "allows other commands in background" \
  '{"tool_name": "Bash", "tool_input": {"command": "npm run build", "run_in_background": true}}' \
  0

test_hook "allows other rhx skills in background" \
  '{"tool_name": "Bash", "tool_input": {"command": "rhx git.commit.set -m test", "run_in_background": true}}' \
  0

test_hook "allows non-Bash tools" \
  '{"tool_name": "Read", "tool_input": {"file_path": "/tmp/test.txt"}}' \
  0

test_hook "blocks empty input with error" \
  '' \
  2

echo ""
echo "=== all tests passed ==="
