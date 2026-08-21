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
echo "🐢 shell yeah, your guardrails are set 🌊"
echo ""
echo "🐚 pre-approved bash permissions"
echo "   │"
echo "   │  these bash commands run without a permission prompt."
echo "   │  ([e] = exact match · [p] = prefix match — any command that starts with it)"
echo "   │"
for pattern in "${ALLOWED_PATTERNS[@]}"; do
  echo "   ├─ $(format_pattern "$pattern")"
done
echo "   │"
echo "   └─ a bash command NOT on this list blocks and asks you to reconsider —"
echo "      check this list first, to minimize interruptions."
echo ""
echo "🐚 auto-decided permission prompts (PermissionRequest hook)"
echo "   │"
echo "   │  suspicious-classified prompts are auto-decided in-hook, per-segment:"
echo "   │"
echo "   ├─ a single clean-rhx-or-allowlisted call, not deny-listed -> auto-approved"
echo "   ├─ an all-safe-segments compound (| && || ;), no segment"
echo "   │  deny-listed: each producer is clean-rhx-or-allowlisted,"
echo "   │  each pipe sink is clean-rhx or a read-only reader"
echo "   │  (jq/tail/head/wc/cat)                                   -> auto-approved"
echo "   ├─ a background (&) or newline-joined command              -> auto-denied"
echo "   ├─ an unquoted chain with an un-vetted segment             -> auto-denied"
echo "   ├─ a deny-listed segment (piped/standalone)                -> lifted"
echo "   ├─ a deny-listed segment (chained)                         -> auto-denied"
echo "   └─ an otherwise-unprovable segment                         -> lifted to the human"
echo ""
echo "🐚 every auto allow/deny is recorded to a G3 audit trail"
echo "   └─ to review why a command was auto-decided (verdict + reason + command):"
echo "         jq . .claude/permission.decisions.local.log"
echo ""

exit 0
