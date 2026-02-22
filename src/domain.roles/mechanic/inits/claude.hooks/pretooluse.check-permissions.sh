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

# Check if a single command matches any allowed pattern
match_pattern() {
  local cmd="$1"
  local pattern="$2"

  # Handle Claude Code's :* suffix matcher
  # :* means "match anything after" (any suffix, including spaces)
  # e.g., "mkdir:*" matches "mkdir", "mkdir /path", "mkdir -p /foo/bar"
  # e.g., "npm run test:*" matches "npm run test", "npm run test:unit"

  # Collapse newlines to spaces for matching (bash regex . doesn't match newlines)
  local cmd_flat
  cmd_flat=$(printf '%s' "$cmd" | tr '\n' ' ')

  # DEBUG: trace matching
  if [[ -n "${DEBUG_MATCH:-}" ]]; then
    echo "DEBUG match_pattern: cmd_flat='$cmd_flat' pattern='$pattern'" >&2
  fi

  # First, escape regex special chars except * and :
  local escaped_pattern
  escaped_pattern=$(printf '%s' "$pattern" | sed 's/[.^$+?{}()[\]|\\]/\\&/g')

  # Convert :* to placeholder first (to avoid * -> .* conversion interfering)
  escaped_pattern="${escaped_pattern//:\*/__ANY_SUFFIX_PLACEHOLDER__}"

  # Convert remaining * to .* (glob-style wildcard)
  escaped_pattern="${escaped_pattern//\*/.*}"

  # Now replace placeholder with .* for "any suffix" matching
  escaped_pattern="${escaped_pattern//__ANY_SUFFIX_PLACEHOLDER__/.*}"

  # Build final regex
  local regex="^${escaped_pattern}$"

  if [[ -n "${DEBUG_MATCH:-}" ]]; then
    echo "DEBUG match_pattern: regex='$regex'" >&2
  fi

  if [[ "$cmd_flat" =~ $regex ]]; then
    return 0
  fi
  return 1
}

# Check if a single command matches ANY allowed pattern
command_is_allowed() {
  local cmd="$1"
  # Trim leading/trailing whitespace
  cmd=$(echo "$cmd" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

  # Empty commands are allowed (e.g., trailing &&)
  if [[ -z "$cmd" ]]; then
    return 0
  fi

  for pattern in "${ALLOWED_PATTERNS[@]}"; do
    if match_pattern "$cmd" "$pattern"; then
      return 0
    fi
  done
  return 1
}

# Split compound command on &&, ||, ; (respecting quotes)
# Returns newline-separated list of commands
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
  local failed_part=""

  # Collapse newlines to spaces FIRST, before splitting on &&/||/;
  # This prevents `while read` from splitting multiline content into separate parts
  cmd=$(printf '%s' "$cmd" | tr '\n' ' ')

  # Split command into parts
  parts=$(split_compound_command "$cmd")

  # Check each part
  while IFS= read -r part; do
    # Trim whitespace
    part=$(echo "$part" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    # Skip empty parts
    [[ -z "$part" ]] && continue

    if ! command_is_allowed "$part"; then
      # Store the failed part for error reporting
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
