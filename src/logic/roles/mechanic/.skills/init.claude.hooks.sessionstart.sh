#!/usr/bin/env bash
######################################################################
# .what = bind mechanic SessionStart hook to Claude settings
#
# .why  = the mechanic role needs to boot on every Claude session
#         to ensure project context and briefs are loaded.
#
#         this script "findserts" (find-or-insert) the SessionStart
#         hook into .claude/settings.local.json, ensuring:
#           • the hook is present after running this skill
#           • no duplication if already present
#           • idempotent: safe to rerun
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

# Define the hook configuration to findsert
HOOK_CONFIG=$(cat <<'EOF'
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "npx rhachet roles boot --repo ehmpathy --role mechanic",
            "timeout": 60
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
# Strategy: deep merge with existing hooks, creating structure if needed
jq --argjson hook "$HOOK_CONFIG" '
  # Define the target command for comparison
  def targetCmd: "npx rhachet roles boot --repo ehmpathy --role mechanic";

  # Check if hook already exists
  def hookExists:
    (.hooks.SessionStart // [])
    | map(select(.matcher == "*") | .hooks // [])
    | flatten
    | map(.command)
    | index(targetCmd) != null;

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
  echo "👌 mechanic SessionStart hook already bound"
  echo "   $SETTINGS_FILE"
  exit 0
fi

# Atomic replace
mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"

echo "🔗 mechanic SessionStart hook bound successfully!"
echo "   $SETTINGS_FILE"
echo ""
echo "✨ next time you start a Claude session, the mechanic will boot automatically"
