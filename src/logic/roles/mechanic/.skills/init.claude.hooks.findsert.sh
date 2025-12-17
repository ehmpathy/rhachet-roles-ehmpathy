#!/usr/bin/env bash
######################################################################
# .what = generic findsert utility for Claude hooks
#
# .why  = centralizes the "find-or-insert" logic for binding hooks
#         to .claude/settings.local.json, avoiding duplication across
#         individual hook initializers.
#
# .how  = takes hook configuration as arguments and uses jq to merge
#         the hook into the settings file, creating structure if absent.
#
# usage:
#   init.claude.hooks.findsert.sh \
#     --hook-type SessionStart|PreToolUse \
#     --matcher "*"|"Bash"|... \
#     --command "command to run" \
#     --name "hookname" \
#     [--timeout 5] \
#     [--position append|prepend]
#
# guarantee:
#   ✔ creates .claude/settings.local.json if missing
#   ✔ preserves existing settings (permissions, other hooks)
#   ✔ idempotent: no-op if hook already present (at correct position)
#   ✔ fail-fast on errors
######################################################################

set -euo pipefail

# Defaults
HOOK_TYPE=""
MATCHER=""
HOOK_COMMAND=""
HOOK_NAME=""
TIMEOUT=5
POSITION="append"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --hook-type)
      HOOK_TYPE="$2"
      shift 2
      ;;
    --matcher)
      MATCHER="$2"
      shift 2
      ;;
    --command)
      HOOK_COMMAND="$2"
      shift 2
      ;;
    --name)
      HOOK_NAME="$2"
      shift 2
      ;;
    --timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    --position)
      POSITION="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

# Validate required arguments
if [[ -z "$HOOK_TYPE" || -z "$MATCHER" || -z "$HOOK_COMMAND" || -z "$HOOK_NAME" ]]; then
  echo "Usage: $0 --hook-type TYPE --matcher MATCHER --command CMD --name NAME [--timeout SECS] [--position append|prepend]" >&2
  exit 1
fi

PROJECT_ROOT="$PWD"
SETTINGS_FILE="$PROJECT_ROOT/.claude/settings.local.json"

# Ensure .claude directory exists
mkdir -p "$(dirname "$SETTINGS_FILE")"

# Initialize settings file if it doesn't exist
if [[ ! -f "$SETTINGS_FILE" ]]; then
  echo "{}" > "$SETTINGS_FILE"
fi

# Build the hook configuration JSON
HOOK_CONFIG=$(jq -n \
  --arg hookType "$HOOK_TYPE" \
  --arg matcher "$MATCHER" \
  --arg command "$HOOK_COMMAND" \
  --argjson timeout "$TIMEOUT" \
  '{
    hooks: {
      ($hookType): [
        {
          matcher: $matcher,
          hooks: [
            {
              type: "command",
              command: $command,
              timeout: $timeout
            }
          ]
        }
      ]
    }
  }'
)

# Generate jq script based on position (append vs prepend)
if [[ "$POSITION" == "prepend" ]]; then
  # Prepend: ensure hook is first in the array
  JQ_SCRIPT=$(cat <<'JQEOF'
    def hookType: $hookType;
    def matcher: $matcher;
    def targetCmd: $hook.hooks[hookType][0].hooks[0].command;

    # Check if hook is already first in the matcher
    def hookIsFirst:
      (.hooks[hookType] // [])
      | map(select(.matcher == matcher) | .hooks // [])
      | flatten
      | first
      | .command == targetCmd;

    # If hook is already first, return unchanged
    if hookIsFirst then
      .
    else
      # Ensure .hooks exists
      .hooks //= {} |

      # Ensure .hooks[hookType] exists
      .hooks[hookType] //= [] |

      # Check if our matcher already exists
      if (.hooks[hookType] | map(.matcher) | index(matcher)) then
        # Matcher exists - remove our hook if present, then prepend it
        .hooks[hookType] |= map(
          if .matcher == matcher then
            .hooks = $hook.hooks[hookType][0].hooks + (.hooks | map(select(.command != targetCmd)))
          else
            .
          end
        )
      else
        # Matcher does not exist, add the entire entry
        .hooks[hookType] += $hook.hooks[hookType]
      end
    end
JQEOF
  )
else
  # Append: add hook to end of array (default)
  JQ_SCRIPT=$(cat <<'JQEOF'
    def hookType: $hookType;
    def matcher: $matcher;
    def targetCmd: $hook.hooks[hookType][0].hooks[0].command;

    # Check if hook already exists anywhere
    def hookExists:
      (.hooks[hookType] // [])
      | map(select(.matcher == matcher) | .hooks // [])
      | flatten
      | map(.command)
      | any(. == targetCmd);

    # If hook already exists, return unchanged
    if hookExists then
      .
    else
      # Ensure .hooks exists
      .hooks //= {} |

      # Ensure .hooks[hookType] exists
      .hooks[hookType] //= [] |

      # Check if our matcher already exists
      if (.hooks[hookType] | map(.matcher) | index(matcher)) then
        # Matcher exists, add our hook to its hooks array
        .hooks[hookType] |= map(
          if .matcher == matcher then
            .hooks += $hook.hooks[hookType][0].hooks
          else
            .
          end
        )
      else
        # Matcher does not exist, add the entire entry
        .hooks[hookType] += $hook.hooks[hookType]
      end
    end
JQEOF
  )
fi

# Run jq with the appropriate script
jq --argjson hook "$HOOK_CONFIG" \
   --arg hookType "$HOOK_TYPE" \
   --arg matcher "$MATCHER" \
   "$JQ_SCRIPT" "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp"

# Check if any changes were made
if diff -q "$SETTINGS_FILE" "$SETTINGS_FILE.tmp" >/dev/null 2>&1; then
  rm "$SETTINGS_FILE.tmp"
  echo "👌 $HOOK_NAME hook already bound"
  exit 0
fi

# Atomic replace
mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"

echo "🔗 $HOOK_NAME hook bound successfully!"
