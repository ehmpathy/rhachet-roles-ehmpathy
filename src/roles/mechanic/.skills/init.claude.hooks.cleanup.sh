#!/usr/bin/env bash
######################################################################
# .what = cleanup stale hooks from Claude settings
#
# .why  = when hook scripts are removed from claude.hooks/, the
#         corresponding entries in .claude/settings.local.json
#         become stale and should be cleaned up.
#
# .how  = reads settings.local.json, finds hooks referencing files
#         in claude.hooks/, checks if those files exist, and removes
#         any hooks whose scripts no longer exist.
#
# usage:
#   init.claude.hooks.cleanup.sh
#
# guarantee:
#   ✔ only removes hooks referencing missing claude.hooks/ files
#   ✔ preserves all other hooks and settings
#   ✔ idempotent: safe to rerun
#   ✔ no-op if no stale hooks found
######################################################################

set -euo pipefail

# fail loud: print what failed
trap 'echo "❌ init.claude.hooks.cleanup.sh failed at line $LINENO" >&2' ERR

SKILLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$SKILLS_DIR/claude.hooks"

PROJECT_ROOT="$PWD"
SETTINGS_FILE="$PROJECT_ROOT/.claude/settings.local.json"

# Exit if no settings file
if [[ ! -f "$SETTINGS_FILE" ]]; then
  exit 0
fi

# Extract all hook commands that reference claude.hooks/
# and check which ones point to missing files
STALE_COMMANDS=$(jq -r '
  .hooks // {} | to_entries[] |
  .value[] | .hooks[] | .command // empty
' "$SETTINGS_FILE" | { grep -E "claude\.hooks/" || true; } | while read -r cmd; do
  # Extract the path - it might be absolute or relative
  # Look for the claude.hooks/ part and check if the file exists
  if [[ "$cmd" == /* ]]; then
    # Absolute path
    if [[ ! -f "$cmd" ]]; then
      echo "$cmd"
    fi
  else
    # Relative path or command - check if it contains claude.hooks/
    # and if the file exists relative to PWD
    if [[ ! -f "$PROJECT_ROOT/$cmd" ]]; then
      echo "$cmd"
    fi
  fi
done)

# Exit if no stale commands found
if [[ -z "$STALE_COMMANDS" ]]; then
  echo "👌 no stale hooks found"
  exit 0
fi

# Build jq filter to remove stale hooks
# Convert stale commands to JSON array for jq
STALE_JSON=$(echo "$STALE_COMMANDS" | jq -R -s 'split("\n") | map(select(length > 0))')

jq --argjson stale "$STALE_JSON" '
  # Remove hooks whose command is in the stale list
  .hooks |= (
    if . then
      to_entries | map(
        .value |= map(
          .hooks |= map(select(.command as $cmd | ($stale | index($cmd)) == null))
        )
        # Remove matchers with empty hooks arrays
        | .value |= map(select(.hooks | length > 0))
      )
      # Remove hook types with empty arrays
      | map(select(.value | length > 0))
      | from_entries
    else
      .
    end
  )
' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp"

# Check if any changes were made
if diff -q "$SETTINGS_FILE" "$SETTINGS_FILE.tmp" >/dev/null 2>&1; then
  rm "$SETTINGS_FILE.tmp"
  echo "👌 no stale hooks found"
  exit 0
fi

# Report what's being removed
echo "🧹 removing stale hooks:"
echo "$STALE_COMMANDS" | while read -r cmd; do
  echo "   - $cmd"
done

# Atomic replace
mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"

echo "✨ cleanup complete"
