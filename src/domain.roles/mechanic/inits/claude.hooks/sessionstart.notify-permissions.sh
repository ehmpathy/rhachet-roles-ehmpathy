#!/usr/bin/env bash
######################################################################
# .what = SessionStart hook to notify Claude of allowed permissions
#
# .why  = proactively informing Claude of pre-approved Bash commands
#         at session start reduces interruptions from permission
#         prompts by guiding it to use allowed patterns upfront.
#
#         this complements the PreToolUse hook which blocks/nudges
#         when Claude attempts unapproved commands, by providing
#         the information before any attempts are made.
#
# .how  = reads .claude/settings.json, extracts Bash permissions,
#         outputs a formatted list of allowed commands for Claude
#         to reference throughout the session.
#
# usage:
#   configure in .claude/settings.json under hooks.SessionStart
#
# guarantee:
#   ✔ non-blocking: always exits 0
#   ✔ informational only: no side effects
#   ✔ graceful fallback: exits silently if no settings found
######################################################################

set -euo pipefail

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

# Find the settings file
find_settings_file() {
  local claude_dir
  claude_dir=$(find_claude_dir) || return 1
  local settings_file="$claude_dir/settings.json"
  if [[ -f "$settings_file" ]]; then
    echo "$settings_file"
    return 0
  fi
  return 1
}

SETTINGS_FILE=$(find_settings_file) || {
  # No settings file found, exit silently
  exit 0
}

# Extract Bash permissions from settings file
# Patterns look like: "Bash(npm run test:*)" -> extract "npm run test:*"
mapfile -t ALLOWED_PATTERNS < <(
  jq -r '.permissions.allow // [] | .[] | select(startswith("Bash(")) | sub("^Bash\\("; "") | sub("\\)$"; "")' "$SETTINGS_FILE" 2>/dev/null
)

# If no Bash permissions found, exit silently
if [[ ${#ALLOWED_PATTERNS[@]} -eq 0 ]]; then
  exit 0
fi

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

# Output the allowed permissions notification
echo ""
echo "=================================================="
echo "PRE-APPROVED BASH PERMISSIONS"
echo "=================================================="
echo ""
echo "The following Bash commands are pre-approved and can be used without"
echo "requesting permission from the user:"
echo ""
echo "([e] = exact match, [p] = prefix match - anything starting with this)"
echo ""
for pattern in "${ALLOWED_PATTERNS[@]}"; do
  echo "  $(format_pattern "$pattern")"
done
echo ""
echo "IMPORTANT: If you attempt a Bash command NOT on this list, you will be"
echo "blocked and asked to reconsider. Please check this list first before"
echo "using Bash commands to minimize interruptions to the user."
echo ""
echo "=================================================="
echo ""

exit 0
