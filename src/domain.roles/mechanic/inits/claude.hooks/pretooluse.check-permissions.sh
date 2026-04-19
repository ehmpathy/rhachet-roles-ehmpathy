#!/usr/bin/env bash
######################################################################
# .what = PreToolUse hook to encourage reuse of existing permissions
#
# .why  = when Claude attempts a command not covered by pre-approved
#         permissions, this hook asks it to reconsider whether an
#         existing permission could accomplish the same task.
#
#         this reduces permission prompts and encourages consistent
#         command patterns across the project.
#
# .how  = reads JSON from stdin (per Claude Code docs), extracts
#         tool_input.command, checks against allowed patterns from
#         both settings.json and settings.local.json (unioned).
#         if no match, behavior depends on mode.
#
# usage:
#   configure in .claude/settings.json under hooks.PreToolUse
#
# flags:
#   --mode HARDNUDGE  (default) blocks on first attempt, allows on retry
#                     tracks attempts in .claude/permissions.attempted.json
#                     forces Claude to consciously decide to request
#                     a new permission rather than doing so automatically
#
#   --mode SOFTNUDGE  outputs guidance but doesn't block (exit 0)
#                     Claude sees the message but can proceed immediately
#
# guarantee:
#   ✔ HARDNUDGE (default): blocks first attempt, allows retry
#   ✔ SOFTNUDGE: non-blocking, feedback only
#   ✔ fast: simple pattern matching
#   ✔ helpful: shows available alternatives
######################################################################

set -euo pipefail

# Failfast timeout (seconds) - exit with error if exceeded
FAILFAST_TIMEOUT=4

# Parse flags
MODE="HARDNUDGE"  # default
HARDNUDGE_WINDOW_SECONDS=60  # default: 60 seconds
while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE="${2:-HARDNUDGE}"
      shift 2
      ;;
    --window)
      HARDNUDGE_WINDOW_SECONDS="${2:-60}"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# Read JSON from stdin (Claude Code passes input via stdin, not env var)
STDIN_INPUT=$(cat)

# failfast: if no input received, something is wrong
if [[ -z "$STDIN_INPUT" ]]; then
  echo "ERROR: PreToolUse hook received no input via stdin" >&2
  exit 2  # exit 2 = blocking error per Claude Code docs
fi

# Extract command from stdin JSON
# Claude passes: {"tool_name": "Bash", "tool_input": {"command": "..."}}
COMMAND=$(echo "$STDIN_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || echo "")

# Skip if not a Bash command or empty
if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# Find the .claude directory (search upward from current directory)
find_claude_dir() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -d "$dir/.claude" ]]; then
      echo "$dir/.claude"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  return 1
}

# Find the .claude directory, then extract patterns from both settings files
CLAUDE_DIR=$(find_claude_dir) || {
  # no .claude directory found, allow command to proceed
  exit 0
}

# extract Bash permissions from a settings file
# patterns look like: "Bash(npm run test:*)" -> extract "npm run test:*"
extract_bash_patterns() {
  local file="$1"
  if [[ -f "$file" ]]; then
    jq -r '.permissions.allow // [] | .[] | select(startswith("Bash(")) | sub("^Bash\\("; "") | sub("\\)$"; "")' "$file" 2>/dev/null
  fi
}

# union allowlists from settings.json and settings.local.json
# note: we must union them because adhoc user-granted allows go into settings.local.json
mapfile -t ALLOWED_PATTERNS < <(
  {
    extract_bash_patterns "$CLAUDE_DIR/settings.json"
    extract_bash_patterns "$CLAUDE_DIR/settings.local.json"
  } | sort -u
)

# Build lookup structures at load time
declare -A EXACT_PATTERNS=()
declare -a PREFIX_PATTERNS=()

for pattern in "${ALLOWED_PATTERNS[@]}"; do
  if [[ "$pattern" == *":*" ]]; then
    # Prefix pattern - strip :* suffix and store
    PREFIX_PATTERNS+=("${pattern%:*}")
  else
    # Exact pattern - add to hash for O(1) lookup
    EXACT_PATTERNS["$pattern"]=1
  fi
done

# Check if command starts with prefix (no subshells)
match_prefix() {
  local cmd="$1"
  local prefix="$2"
  [[ "$cmd" == "$prefix"* ]]
}

# Check if a single command matches ANY allowed pattern
command_is_allowed() {
  local cmd="$1"

  # Trim lead/trail whitespace (pure bash, no subshell)
  while [[ "$cmd" == [[:space:]]* ]]; do cmd="${cmd#?}"; done
  while [[ "$cmd" == *[[:space:]] ]]; do cmd="${cmd%?}"; done

  # Empty commands are allowed (e.g., post &&)
  if [[ -z "$cmd" ]]; then
    return 0
  fi

  # Collapse newlines to spaces for match
  cmd="${cmd//$'\n'/ }"

  # O(1) exact match via hash lookup
  if [[ -n "${EXACT_PATTERNS[$cmd]+x}" ]]; then
    return 0
  fi

  # O(n) prefix match but no subshells - fast enough
  for prefix in "${PREFIX_PATTERNS[@]}"; do
    if match_prefix "$cmd" "$prefix"; then
      return 0
    fi
  done

  return 1
}

# Split compound command on &&, ||, |, ; (quotes preserved)
# Returns newline-separated list of commands
# NOTE: single pipe | split to verify each segment is allowed
split_compound_command() {
  local input="$1"
  local result=""
  local current=""
  local in_single_quote=false
  local in_double_quote=false
  local i=0
  local len=${#input}

  while [[ $i -lt $len ]]; do
    local char="${input:$i:1}"
    local next_char="${input:$((i+1)):1}"

    # Handle quotes
    if [[ "$char" == "'" && "$in_double_quote" == false ]]; then
      in_single_quote=$([[ "$in_single_quote" == true ]] && echo false || echo true)
      current+="$char"
      ((i++))
      continue
    fi

    if [[ "$char" == '"' && "$in_single_quote" == false ]]; then
      in_double_quote=$([[ "$in_double_quote" == true ]] && echo false || echo true)
      current+="$char"
      ((i++))
      continue
    fi

    # Only split if not inside quotes
    if [[ "$in_single_quote" == false && "$in_double_quote" == false ]]; then
      # Check for && or ||
      if [[ "$char" == "&" && "$next_char" == "&" ]] || [[ "$char" == "|" && "$next_char" == "|" ]]; then
        if [[ -n "$result" ]]; then
          result+=$'\n'
        fi
        result+="$current"
        current=""
        ((i+=2))
        continue
      fi

      # Check for single pipe | (must come AFTER || check to avoid false match)
      if [[ "$char" == "|" && "$next_char" != "|" ]]; then
        if [[ -n "$result" ]]; then
          result+=$'\n'
        fi
        result+="$current"
        current=""
        ((i++))
        continue
      fi

      # Check for ;
      if [[ "$char" == ";" ]]; then
        if [[ -n "$result" ]]; then
          result+=$'\n'
        fi
        result+="$current"
        current=""
        ((i++))
        continue
      fi
    fi

    current+="$char"
    ((i++))
  done

  # Add final command
  if [[ -n "$result" ]]; then
    result+=$'\n'
  fi
  result+="$current"

  echo "$result"
}

# Check if ALL parts of a compound command are allowed
all_parts_allowed() {
  local cmd="$1"
  local parts
  local part

  # Collapse newlines to spaces (pure bash)
  cmd="${cmd//$'\n'/ }"

  # Split command into parts
  parts=$(split_compound_command "$cmd")

  # Check each part
  while IFS= read -r part; do
    # Trim whitespace (pure bash, no subshell)
    while [[ "$part" == [[:space:]]* ]]; do part="${part#?}"; done
    while [[ "$part" == *[[:space:]] ]]; do part="${part%?}"; done

    # Skip empty parts
    [[ -z "$part" ]] && continue

    # Failfast timeout check
    if [[ $SECONDS -ge $FAILFAST_TIMEOUT ]]; then
      echo "__FAILFAST_TIMEOUT__"
      return 1
    fi

    if ! command_is_allowed "$part"; then
      echo "$part"
      return 1
    fi
  done <<< "$parts"

  return 0
}

# Transform raw permission pattern to compact bracket notation for display
format_pattern() {
  local pattern="$1"

  # Check if pattern ends with :*
  if [[ "$pattern" == *":*" ]]; then
    # Remove :* suffix and format with [p]: label (prefix match)
    local prefix="${pattern%:*}"
    echo "[p]: $prefix"
  else
    # Exact match - format with [e]: label
    echo "[e]: $pattern"
  fi
}

# Check if all parts of the command (including compound commands) are allowed
FAILED_PART=$(all_parts_allowed "$COMMAND") && exit 0

# Handle failfast timeout
if [[ "$FAILED_PART" == "__FAILFAST_TIMEOUT__" ]]; then
  echo "🛑 BLOCKED: permission check exceeded ${FAILFAST_TIMEOUT}s timeout" >&2
  exit 2
fi

# Command not matched - handle based on mode
# FAILED_PART contains the first disallowed part of the command

# SOFTNUDGE mode: provide guidance but don't block (early return)
# Output plain text - no hookSpecificOutput so normal permission flow continues
if [[ "$MODE" == "SOFTNUDGE" ]]; then
  echo ""
  echo "⚠️  This command is not covered by existing pre-approved permissions."
  echo ""
  echo "Before requesting user approval, check if you can accomplish this task using one of these pre-approved patterns:"
  echo ""
  echo "([e] = exact match, [p] = prefix match)"
  echo ""
  for pattern in "${ALLOWED_PATTERNS[@]}"; do
    echo "  • $(format_pattern "$pattern")"
  done
  echo ""
  echo "([e] = exact match, [p] = prefix match)"
  echo ""
  echo "If an existing permission pattern can solve your task, use that instead."
  echo "If not, proceed with requesting approval."
  echo ""
  exit 0
fi

# HARDNUDGE mode (default): block on first attempt, allow on retry
ATTEMPTED_FILE="$CLAUDE_DIR/permission.nudges.local.json"

# Ensure the file exists with valid JSON
if [[ ! -f "$ATTEMPTED_FILE" ]]; then
  echo '{}' > "$ATTEMPTED_FILE"
fi

# Check if this command was recently attempted
now=$(date +%s)
last_attempt=$(jq -r --arg cmd "$COMMAND" '.[$cmd] // 0' "$ATTEMPTED_FILE" 2>/dev/null || echo "0")
elapsed=$((now - last_attempt))

if [[ $elapsed -lt $HARDNUDGE_WINDOW_SECONDS ]]; then
  # Claude already tried within the window - they've thought twice
  # Exit silently with 0 so normal permission flow continues (user gets prompted)
  exit 0
fi

# First attempt - record timestamp and block
# Use a temp file for atomic update
tmp_file=$(mktemp)
jq --arg cmd "$COMMAND" --argjson ts "$now" '. + {($cmd): $ts}' "$ATTEMPTED_FILE" > "$tmp_file" 2>/dev/null && mv "$tmp_file" "$ATTEMPTED_FILE"

# Output block message to stderr and exit 2 to deny
{
  echo ""
  echo "🛑 BLOCKED: This command is not covered by existing pre-approved permissions."
  echo ""
  echo "Before requesting user approval, check if you can accomplish this task using one of these pre-approved patterns:"
  echo ""
  echo "([e] = exact match, [p] = prefix match)"
  echo ""
  for pattern in "${ALLOWED_PATTERNS[@]}"; do
    echo "  • $(format_pattern "$pattern")"
  done
  echo ""
  echo "([e] = exact match, [p] = prefix match)"
  echo ""
  echo "If an existing permission pattern can solve your task, use that instead."
  echo "If you've considered the alternatives and still need this specific command, retry it."
  echo ""
} >&2
exit 2  # Exit 2 = block with error message
