#!/usr/bin/env bash
######################################################################
# .what = PreToolUse hook to forbid 2>&1 (stderr redirection)
#
# .why  = redirecting stderr to stdout (2>&1) hides error messages
#         and makes debugging harder. Claude should see stderr
#         separately to understand when commands fail.
#
# .how  = reads JSON from stdin, extracts tool_input.command,
#         checks if it contains 2>&1 and blocks if found.
#
# usage:
#   configure in .claude/settings.json under hooks.PreToolUse
#
# guarantee:
#   ✔ blocks commands containing 2>&1
#   ✔ fast: simple string matching
#   ✔ helpful: explains why it's blocked
######################################################################

set -euo pipefail

# fail closed on a crash: claude code reads any PreToolUse exit but 2 as a permit, so an unbound
# var or a failed command would otherwise open this gate in silence
# .note = each write is guarded and SIGPIPE ignored, so a closed stream cannot stop the exit 2
trap '' PIPE
trap 'hook_exit=$?; if [[ $hook_exit -ne 0 && $hook_exit -ne 2 ]]; then hook_crash="💥 MalfunctionError: ${0##*/} crashed (exit $hook_exit); the tool call stays blocked — retry once; if it recurs, report the defect to the ehmpathy mechanic role repo"; printf "%s\n" "$hook_crash" || true; printf "%s\n" "$hook_crash" >&2 || true; exit 2; fi' EXIT

# Read JSON from stdin (Claude Code passes input via stdin)
STDIN_INPUT=$(cat)

# failfast: if no input received, something is wrong
if [[ -z "$STDIN_INPUT" ]]; then
  echo "✋ ConstraintError: PreToolUse hook received no input via stdin" >&2
  exit 2
fi

# Extract command from stdin JSON
# Claude passes: {"tool_name": "Bash", "tool_input": {"command": "..."}}
COMMAND=$(echo "$STDIN_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || echo "")

# Skip if not a Bash command or empty
if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# Check if command contains 2>&1
if [[ "$COMMAND" == *"2>&1"* ]]; then
  {
    echo ""
    echo "✋ ConstraintError: Command contains '2>&1' (stderr redirect to stdout)."
    echo ""
    echo "Redirecting stderr to stdout hides error messages and makes debugging harder."
    echo "Claude should see stderr separately to understand when commands fail."
    echo ""
    echo "Please remove '2>&1' from your command and try again."
    echo ""
  } >&2
  exit 2
fi

# Command is allowed
exit 0
