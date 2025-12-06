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
#         tool_input.command, checks against allowed patterns.
#         if no match, behavior depends on mode.
#
# usage:
#   configure in .claude/settings.local.json under hooks.PreToolUse
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

# Find the settings file (search upward from current directory)
find_settings_file() {
  local claude_dir
  claude_dir=$(find_claude_dir) || return 1
  local settings_file="$claude_dir/settings.local.json"
  if [[ -f "$settings_file" ]]; then
    echo "$settings_file"
    return 0
  fi
  return 1
}

SETTINGS_FILE=$(find_settings_file) || {
  # No settings file found, allow command to proceed
  exit 0
}

# Extract Bash permissions from settings file
# Patterns look like: "Bash(npm run test:*)" -> extract "npm run test:*"
mapfile -t ALLOWED_PATTERNS < <(
  jq -r '.permissions.allow // [] | .[] | select(startswith("Bash(")) | sub("^Bash\\("; "") | sub("\\)$"; "")' "$SETTINGS_FILE" 2>/dev/null
)

# Check if command matches any allowed pattern
match_pattern() {
  local cmd="$1"
  local pattern="$2"

  # Convert glob * to regex .*
  local regex="^${pattern//\*/.*}$"

  if [[ "$cmd" =~ $regex ]]; then
    return 0
  fi
  return 1
}

for pattern in "${ALLOWED_PATTERNS[@]}"; do
  if match_pattern "$COMMAND" "$pattern"; then
    exit 0  # Command matches an allowed pattern
  fi
done

# Command not matched - handle based on mode

# SOFTNUDGE mode: provide guidance but don't block (early return)
# Output plain text - no hookSpecificOutput so normal permission flow continues
if [[ "$MODE" == "SOFTNUDGE" ]]; then
  echo ""
  echo "⚠️  This command is not covered by existing pre-approved permissions."
  echo ""
  echo "Before requesting user approval, check if you can accomplish this task using one of these pre-approved patterns:"
  echo ""
  for pattern in "${ALLOWED_PATTERNS[@]}"; do
    echo "  • $pattern"
  done
  echo ""
  echo "If an existing permission pattern can solve your task, use that instead."
  echo "If not, proceed with requesting approval."
  echo ""
  exit 0
fi

# HARDNUDGE mode (default): block on first attempt, allow on retry
CLAUDE_DIR=$(find_claude_dir) || {
  echo "ERROR: No .claude directory found. This hook requires a .claude directory." >&2
  exit 1
}
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
  for pattern in "${ALLOWED_PATTERNS[@]}"; do
    echo "  • $pattern"
  done
  echo ""
  echo "If an existing permission pattern can solve your task, use that instead."
  echo "If you've considered the alternatives and still need this specific command, retry it."
  echo ""
} >&2
exit 2  # Exit 2 = block with error message
