#!/usr/bin/env bash
######################################################################
# .what = auto-approve rhx skill commands to bypass safety heuristics
#
# .why  = claude code's safety heuristics trigger prompts for shell
#         metacharacters like { } ( ) even in quoted strings.
#         rhx skills are trusted — this hook auto-approves them.
#
# .source = community workaround from GitHub Issue #30435
#           https://github.com/anthropics/claude-code/issues/30435#issuecomment-4114670342
#
# usage:
#   registered as PreToolUse hook for Bash tool
#   outputs JSON with permissionDecision: "allow" for rhx commands
#
# guarantee:
#   - only matches rhx / npx rhachet commands
#   - REJECTS commands with chained operators: | ; & && || $() ` <() >() > >>
#   - operators inside quoted strings are allowed (they're arguments)
#   - unmatched commands pass through (exit 0, no output)
#   - fail-safe: on error, falls back to normal prompt
######################################################################
set -euo pipefail

# read stdin (claude code passes tool info as JSON)
INPUT=$(cat)

# extract tool name
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || true

# only process Bash tool
if [[ "$TOOL_NAME" != "Bash" ]]; then
  exit 0
fi

# extract command
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null) || true

# if no command, pass through
if [[ -z "$CMD" ]]; then
  exit 0
fi

# match rhx or npx rhachet commands
if echo "$CMD" | grep -qE '^\s*(rhx|npx rhachet run --skill|npx rhx|./node_modules/.bin/rhx|./node_modules/.bin/rhachet)'; then
  # security: reject chained commands (operators outside quotes)
  # this regex strips quoted strings then checks for dangerous operators
  CMD_STRIPPED=$(echo "$CMD" | sed "s/'[^']*'//g" | sed 's/"[^"]*"//g')

  # check for shell operators that enable command chains
  if echo "$CMD_STRIPPED" | grep -qE '[|;&]|&&|\|\||`|\$\(|<\(|>\(|[^<]>|>>'; then
    # dangerous operator found outside quotes — do not auto-approve
    exit 0
  fi

  # check for newlines (command separator)
  if echo "$CMD" | grep -qP '\n'; then
    exit 0
  fi

  # safe rhx command — return permissionDecision: allow
  jq -n '{
    "hookSpecificOutput": {
      "hookEventName": "PreToolUse",
      "permissionDecision": "allow",
      "permissionDecisionReason": "rhx skill auto-approved"
    }
  }'
  exit 0
fi

# unmatched commands: pass through to normal permission flow
exit 0
