#!/usr/bin/env bash
######################################################################
# .what = PreToolUse hook to block rhx git.repo.test in background mode
#
# .why  = clones run tests in background then poll the output file,
#         which wastes tokens (2500+ vs 50 from curated output).
#         the skill is designed to minimize token consumption via
#         curated output - background + poll bypasses this entirely.
#
#         this hook blocks background execution with clear guidance,
#         so the clone runs tests in foreground as intended.
#
# .how  = reads JSON from stdin, checks:
#         1. tool_name is "Bash"
#         2. tool_input.run_in_background is true
#         3. tool_input.command matches rhx git.repo.test patterns
#         blocks with guidance if all three match.
#
# usage:
#   configure in .claude/settings.json under hooks.PreToolUse
#
# guarantee:
#   - blocks background execution of git.repo.test skill
#   - provides clear guidance to run foreground
#   - prevents token waste from poll pattern
#   - fast: simple JSON check
######################################################################

set -euo pipefail

# read JSON from stdin (Claude Code passes input via stdin)
STDIN_INPUT=$(cat)

# failfast: if no input received, exit with error
if [[ -z "$STDIN_INPUT" ]]; then
  echo "ERROR: PreToolUse hook received no input via stdin" >&2
  exit 2
fi

# extract tool name
TOOL_NAME=$(echo "$STDIN_INPUT" | jq -r '.tool_name // empty' 2>/dev/null || echo "")

# skip if not Bash tool
if [[ "$TOOL_NAME" != "Bash" ]]; then
  exit 0
fi

# extract run_in_background flag
RUN_IN_BACKGROUND=$(echo "$STDIN_INPUT" | jq -r '.tool_input.run_in_background // false' 2>/dev/null || echo "false")

# skip if not in background mode
if [[ "$RUN_IN_BACKGROUND" != "true" ]]; then
  exit 0
fi

# extract command
COMMAND=$(echo "$STDIN_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || echo "")

# skip if empty command
if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# check if command is rhx git.repo.test or npx rhachet run --skill git.repo.test
IS_TEST_SKILL=false

# pattern 1: rhx git.repo.test
if [[ "$COMMAND" =~ (^|[[:space:]])(rhx[[:space:]]+git\.repo\.test|rhx[[:space:]]git\.repo\.test) ]]; then
  IS_TEST_SKILL=true
fi

# pattern 2: npx rhachet run --skill git.repo.test
if [[ "$COMMAND" =~ npx[[:space:]]+rhachet[[:space:]]+run[[:space:]].*--skill[[:space:]]+git\.repo\.test ]]; then
  IS_TEST_SKILL=true
fi

# pattern 3: ./node_modules/.bin/rhx git.repo.test
if [[ "$COMMAND" =~ \.bin/rhx[[:space:]]+git\.repo\.test ]]; then
  IS_TEST_SKILL=true
fi

# skip if not a test skill command
if [[ "$IS_TEST_SKILL" != "true" ]]; then
  exit 0
fi

# block: test skill in background mode
{
  echo ""
  echo "🛑 BLOCKED: git.repo.test must run in foreground"
  echo ""
  echo "background + poll wastes tokens (2500+ vs 50 from curated output)."
  echo "the skill is designed to minimize token consumption - foreground is required."
  echo ""
  echo "fix: remove run_in_background from your Bash tool call"
  echo ""
  echo "instead of:"
  echo "  Bash(command: 'rhx git.repo.test ...', run_in_background: true)"
  echo ""
  echo "use:"
  echo "  Bash(command: 'rhx git.repo.test ...')"
  echo ""
} >&2
exit 2
