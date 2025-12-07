#!/usr/bin/env bash
######################################################################
# .what = bind forbid.stderr.redirect hook to Claude settings
#
# .why  = when Claude uses 2>&1, error messages are hidden and
#         debugging becomes harder. this hook blocks such commands.
#
# .how  = uses jq to findsert the PreToolUse hook configuration
#         into .claude/settings.local.json
#
# guarantee:
#   ✔ creates .claude/settings.local.json if missing
#   ✔ preserves existing settings (permissions, other hooks)
#   ✔ idempotent: no-op if hook already present
#   ✔ prepends to hooks array (runs before other Bash hooks)
#   ✔ fail-fast on errors
######################################################################

set -euo pipefail

PROJECT_ROOT="$PWD"
SETTINGS_FILE="$PROJECT_ROOT/.claude/settings.local.json"
SKILLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_SCRIPT="$SKILLS_DIR/claude.hooks/forbid.stderr.redirect.sh"

# Verify hook script exists
if [[ ! -f "$HOOK_SCRIPT" ]]; then
  echo "❌ hook script not found: $HOOK_SCRIPT" >&2
  exit 1
fi

# Define the hook configuration to findsert
HOOK_CONFIG=$(cat <<EOF
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "$HOOK_SCRIPT",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
EOF
)

# Ensure .claude directory exists
mkdir -p "$(dirname "$SETTINGS_FILE")"

# Initialize settings file if it doesn't exist
if [[ ! -f "$SETTINGS_FILE" ]]; then
  echo "{}" > "$SETTINGS_FILE"
fi

# Findsert: ensure hook is at the front of the hooks array
jq --argjson hook "$HOOK_CONFIG" '
  # Define the target command for comparison
  def targetCmd: $hook.hooks.PreToolUse[0].hooks[0].command;

  # Check if hook is already first in the Bash matcher
  def hookIsFirst:
    (.hooks.PreToolUse // [])
    | map(select(.matcher == "Bash") | .hooks // [])
    | flatten
    | first
    | .command == targetCmd;

  # If hook is already first, return unchanged
  if hookIsFirst then
    .
  else
    # Ensure .hooks exists
    .hooks //= {} |

    # Ensure .hooks.PreToolUse exists
    .hooks.PreToolUse //= [] |

    # Check if our matcher already exists
    if (.hooks.PreToolUse | map(.matcher) | index("Bash")) then
      # Matcher exists - remove our hook if present, then prepend it
      .hooks.PreToolUse |= map(
        if .matcher == "Bash" then
          # Remove existing instance of our hook, then prepend
          .hooks = $hook.hooks.PreToolUse[0].hooks + (.hooks | map(select(.command != targetCmd)))
        else
          .
        end
      )
    else
      # Matcher does not exist, add the entire entry
      .hooks.PreToolUse += $hook.hooks.PreToolUse
    end
  end
' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp"

# Check if any changes were made
if diff -q "$SETTINGS_FILE" "$SETTINGS_FILE.tmp" >/dev/null 2>&1; then
  rm "$SETTINGS_FILE.tmp"
  echo "👌 forbid.stderr.redirect hook already bound"
  echo "   $SETTINGS_FILE"
  exit 0
fi

# Atomic replace
mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"

echo "🔗 forbid.stderr.redirect hook bound successfully!"
echo "   $SETTINGS_FILE"
echo ""
echo "✨ Claude will now be blocked from using 2>&1 in commands"
