#!/usr/bin/env bash
######################################################################
# .what = PreToolUse hook to block suspicious shell syntax patterns
#
# .why  = harnesses like claude-code-cli parse shell commands to detect
#         potentially dangerous operations. when they see suspicious
#         syntax, they prompt the user for permission — even for safe
#         commands that just look suspicious.
#
#         these prompts interrupt the delegate (agent) mid-task, break
#         flow, and waste human attention on false positives.
#
#         this hook blocks suspicious patterns early with clear guidance,
#         so the delegate can fix the command before it triggers a
#         permission prompt.
#
#         patterns blocked:
#         - =() process substitution (zsh)
#         - <() and >() process substitution (bash)
#         - consecutive quotes at word start (parser confusion)
#
# .how  = reads JSON from stdin, extracts tool_input.command,
#         loads syntax.suspicious.jsonc, checks patterns, blocks with guidance.
#
# usage:
#   configure in .claude/settings.json under hooks.PreToolUse
#
# guarantee:
#   - blocks commands with suspicious shell metacharacters
#   - provides actionable alternatives from config
#   - prevents permission prompt interruptions to delegate
#   - fast: simple pattern match
######################################################################

set -euo pipefail

# read JSON from stdin (Claude Code passes input via stdin)
STDIN_INPUT=$(cat)

# failfast: if no input received, exit with error
if [[ -z "$STDIN_INPUT" ]]; then
  echo "ERROR: PreToolUse hook received no input via stdin" >&2
  exit 2
fi

# extract command from stdin JSON
# Claude passes: {"tool_name": "Bash", "tool_input": {"command": "..."}}
COMMAND=$(echo "$STDIN_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || echo "")

# skip if not a Bash command or empty
if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# find hook directory for config
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$HOOK_DIR/syntax.suspicious.jsonc"

# skip if no config
if [[ ! -f "$CONFIG_FILE" ]]; then
  exit 0
fi

# load config (strip comments, parse JSON)
PATTERNS_JSON=$(sed 's|//.*||' "$CONFIG_FILE" | jq -c '.patterns // []' 2>/dev/null || echo "[]")

# skip if no patterns
if [[ "$PATTERNS_JSON" == "[]" ]]; then
  exit 0
fi

# helper: check if pattern appears unquoted in command
appears_unquoted() {
  local cmd="$1"
  local pattern="$2"
  local in_single=false
  local in_double=false
  local i=0
  local len=${#cmd}
  local plen=${#pattern}

  while [[ $i -lt $len ]]; do
    local char="${cmd:$i:1}"

    # toggle quote state
    if [[ "$char" == "'" && "$in_double" == false ]]; then
      in_single=$([[ "$in_single" == true ]] && echo false || echo true)
      ((i++))
      continue
    fi
    if [[ "$char" == '"' && "$in_single" == false ]]; then
      in_double=$([[ "$in_double" == true ]] && echo false || echo true)
      ((i++))
      continue
    fi

    # check for pattern match outside quotes
    if [[ "$in_single" == false && "$in_double" == false ]]; then
      if [[ "${cmd:$i:$plen}" == "$pattern" ]]; then
        return 0  # found unquoted
      fi
    fi

    ((i++))
  done

  return 1  # not found unquoted
}

# iterate over patterns and check each
pattern_count=$(echo "$PATTERNS_JSON" | jq 'length')
for ((i=0; i<pattern_count; i++)); do
  MATCH=$(echo "$PATTERNS_JSON" | jq -r ".[$i].match")
  TYPE=$(echo "$PATTERNS_JSON" | jq -r ".[$i].type")
  MESSAGE=$(echo "$PATTERNS_JSON" | jq -r ".[$i].message")
  WHY=$(echo "$PATTERNS_JSON" | jq -r ".[$i].why")

  # check based on type
  DETECTED=false
  if [[ "$TYPE" == "unquoted" ]]; then
    if appears_unquoted "$COMMAND" "$MATCH"; then
      DETECTED=true
    fi
  elif [[ "$TYPE" == "regex_word_start" ]]; then
    # check for pattern at word start: space+pattern or start+pattern
    if [[ "$COMMAND" =~ (^|[[:space:]])($MATCH) ]]; then
      DETECTED=true
    fi
  fi

  if [[ "$DETECTED" == true ]]; then
    # build alternatives list
    ALT_LIST=$(echo "$PATTERNS_JSON" | jq -r ".[$i].alt[]" | sed 's/^/  - /')

    # output block message
    {
      echo ""
      echo "🛑 BLOCKED: ${MESSAGE}."
      echo ""
      echo "${WHY^}; harness asks for permission, which interrupts the delegation."
      echo ""
      echo "Alternatives:"
      echo "$ALT_LIST"
      echo ""
    } >&2
    exit 2
  fi
done

# command is allowed
exit 0
