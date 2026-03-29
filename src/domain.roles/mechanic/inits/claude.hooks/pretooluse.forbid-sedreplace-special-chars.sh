#!/usr/bin/env bash
######################################################################
# .what = PreToolUse hook to forbid special chars in sedreplace args
#
# .why  = special chars like { } ( ) [ ] trigger Claude Code's bash
#         safety heuristics and cause permission prompts. this hook
#         blocks direct args with these chars and guides the user to
#         use the @stdin pattern which bypasses heuristics.
#
# .how  = reads JSON from stdin, extracts tool_input.command,
#         checks if it's a sedreplace command with special chars
#         in --old or --new, and blocks if found.
#
# usage:
#   configure in .claude/settings.json under hooks.PreToolUse
#
# guarantee:
#   ✔ blocks sedreplace commands with special chars in args
#   ✔ guides user to @stdin pattern
#   ✔ allows simple patterns without special chars
#   ✔ allows @stdin patterns (they're already the solution)
######################################################################

set -euo pipefail

# Read JSON from stdin (Claude Code passes input via stdin)
STDIN_INPUT=$(cat)

# failfast: if no input received, stdin is empty
if [[ -z "$STDIN_INPUT" ]]; then
  echo "ERROR: PreToolUse hook received no input via stdin" >&2
  exit 2
fi

# Extract tool_name from stdin JSON
TOOL_NAME=$(echo "$STDIN_INPUT" | jq -r '.tool_name // empty' 2>/dev/null || echo "")

# Skip if not a Bash tool
if [[ "$TOOL_NAME" != "Bash" ]]; then
  exit 0
fi

# Extract command from stdin JSON
# Claude passes: {"tool_name": "Bash", "tool_input": {"command": "..."}}
COMMAND=$(echo "$STDIN_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || echo "")

# Skip if command is empty
if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# Skip if not a sedreplace command
if [[ "$COMMAND" != *"sedreplace"* ]]; then
  exit 0
fi

# Skip if already via @stdin pattern (that's the solution)
if [[ "$COMMAND" == *"@stdin"* ]]; then
  exit 0
fi

# Extract --old value (handle both single and double quotes)
# Pattern: --old followed by optional whitespace, then quoted string
OLD_VAL=""
if [[ "$COMMAND" =~ --old[[:space:]]+\'([^\']*)\' ]]; then
  OLD_VAL="${BASH_REMATCH[1]}"
elif [[ "$COMMAND" =~ --old[[:space:]]+\"([^\"]*)\" ]]; then
  OLD_VAL="${BASH_REMATCH[1]}"
fi

# Extract --new value
NEW_VAL=""
if [[ "$COMMAND" =~ --new[[:space:]]+\'([^\']*)\' ]]; then
  NEW_VAL="${BASH_REMATCH[1]}"
elif [[ "$COMMAND" =~ --new[[:space:]]+\"([^\"]*)\" ]]; then
  NEW_VAL="${BASH_REMATCH[1]}"
fi

# Check for special chars that trigger bash heuristics
# These chars cause permission prompts: { } ( ) [ ]

OLD_HAS_SPECIAL=false
NEW_HAS_SPECIAL=false

if [[ -n "$OLD_VAL" ]]; then
  if [[ "$OLD_VAL" == *'{'* ]] || [[ "$OLD_VAL" == *'}'* ]] || \
     [[ "$OLD_VAL" == *'('* ]] || [[ "$OLD_VAL" == *')'* ]] || \
     [[ "$OLD_VAL" == *'['* ]] || [[ "$OLD_VAL" == *']'* ]]; then
    OLD_HAS_SPECIAL=true
  fi
fi

if [[ -n "$NEW_VAL" ]]; then
  if [[ "$NEW_VAL" == *'{'* ]] || [[ "$NEW_VAL" == *'}'* ]] || \
     [[ "$NEW_VAL" == *'('* ]] || [[ "$NEW_VAL" == *')'* ]] || \
     [[ "$NEW_VAL" == *'['* ]] || [[ "$NEW_VAL" == *']'* ]]; then
    NEW_HAS_SPECIAL=true
  fi
fi

# If special chars found, block and guide to @stdin
if [[ "$OLD_HAS_SPECIAL" == "true" || "$NEW_HAS_SPECIAL" == "true" ]]; then
  {
    echo ""
    echo "🛑 BLOCKED: special chars in sedreplace args"
    echo ""
    echo "the pattern contains { } ( ) or [ ] which trigger bash safety prompts."
    echo ""
    echo "use @stdin pattern instead to bypass heuristics:"
    echo ""
    if [[ "$OLD_HAS_SPECIAL" == "true" && "$NEW_HAS_SPECIAL" == "true" ]]; then
      # both have special chars
      echo "  printf '%s\\n%s' '$OLD_VAL' '$NEW_VAL' | rhx sedreplace --old @stdin --new @stdin --glob '...'"
    elif [[ "$OLD_HAS_SPECIAL" == "true" ]]; then
      # only old has special chars
      echo "  echo '$OLD_VAL' | rhx sedreplace --old @stdin --new '$NEW_VAL' --glob '...'"
    else
      # only new has special chars
      echo "  echo '$NEW_VAL' | rhx sedreplace --old '$OLD_VAL' --new @stdin --glob '...'"
    fi
    echo ""
  } >&2
  exit 2
fi

# Command is allowed
exit 0
