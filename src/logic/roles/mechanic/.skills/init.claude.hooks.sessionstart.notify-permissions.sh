#!/usr/bin/env bash
######################################################################
# .what = bind sessionstart.notify-permissions hook to Claude settings
#
# .why  = proactively informing Claude of pre-approved Bash commands
#         at session start reduces interruptions from permission
#         prompts by guiding it to use allowed patterns upfront.
#
#         this script "findserts" (find-or-insert) the SessionStart
#         hook into .claude/settings.local.json, ensuring:
#           - the hook is present after running this skill
#           - no duplication if already present
#           - idempotent: safe to rerun
#
# .how  = uses jq to merge the SessionStart hook configuration
#         into the existing hooks structure, creating it if absent.
#
# guarantee:
#   ✔ creates .claude/settings.local.json if missing
#   ✔ preserves existing settings (permissions, other hooks)
#   ✔ idempotent: no-op if hook already present
#   ✔ fail-fast on errors
######################################################################

set -euo pipefail

PROJECT_ROOT="$PWD"
SETTINGS_FILE="$PROJECT_ROOT/.claude/settings.local.json"
SKILLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_SCRIPT="$SKILLS_DIR/claude.hooks/sessionstart.notify-permissions.sh"

# Verify hook script exists
if [[ ! -f "$HOOK_SCRIPT" ]]; then
  echo "❌ hook script not found: $HOOK_SCRIPT" >&2
  exit 1
fi

# Define the hook configuration to findsert
HOOK_CONFIG=$(cat <<EOF
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
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

# Findsert: merge the hook configuration if not already present
jq --argjson hook "$HOOK_CONFIG" '
  # Define the target command for comparison
  def targetCmd: $hook.hooks.SessionStart[0].hooks[0].command;

  # Check if hook already exists
  def hookExists:
    (.hooks.SessionStart // [])
    | map(select(.matcher == "*") | .hooks // [])
    | flatten
    | map(.command)
    | any(. == targetCmd);

  # If hook already exists, return unchanged
  if hookExists then
    .
  else
    # Ensure .hooks exists
    .hooks //= {} |

    # Ensure .hooks.SessionStart exists
    .hooks.SessionStart //= [] |

    # Check if our matcher already exists
    if (.hooks.SessionStart | map(.matcher) | index("*")) then
      # Matcher exists, add our hook to its hooks array
      .hooks.SessionStart |= map(
        if .matcher == "*" then
          .hooks += $hook.hooks.SessionStart[0].hooks
        else
          .
        end
      )
    else
      # Matcher does not exist, add the entire entry
      .hooks.SessionStart += $hook.hooks.SessionStart
    end
  end
' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp"

# Check if any changes were made
if diff -q "$SETTINGS_FILE" "$SETTINGS_FILE.tmp" >/dev/null 2>&1; then
  rm "$SETTINGS_FILE.tmp"
  echo "👌 sessionstart.notify-permissions hook already bound"
  echo "   $SETTINGS_FILE"
  exit 0
fi

# Atomic replace
mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"

echo "🔗 sessionstart.notify-permissions hook bound successfully!"
echo "   $SETTINGS_FILE"
echo ""
echo "✨ Claude will now see allowed permissions at the start of each session"
