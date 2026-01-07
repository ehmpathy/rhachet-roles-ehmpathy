#!/usr/bin/env bash
######################################################################
# .what = cleanup stale hooks from .claude/settings.json
#
# .why  = when hook scripts are removed from claude.hooks/, the
#         corresponding entries in .claude/settings.json
#         become stale and should be cleaned up.
#
# .how  = reads settings.json, finds hooks referencing files
#         in claude.hooks/, checks if those files exist, and removes
#         any hooks whose scripts no longer exist or match deprecated
#         command patterns.
#
# usage:
#   init.claude.hooks.cleanup.repograin.sh
#
# guarantee:
#   ✔ removes hooks referencing missing claude.hooks/ files
#   ✔ removes hooks matching deprecated command patterns
#   ✔ preserves all other hooks and settings
#   ✔ idempotent: safe to rerun
#   ✔ no-op if no stale hooks found
######################################################################

set -euo pipefail

# fail loud: print what failed
trap 'echo "❌ init.claude.hooks.cleanup.repograin.sh failed at line $LINENO" >&2' ERR

SKILLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$SKILLS_DIR/claude.hooks"

PROJECT_ROOT="$PWD"
SETTINGS_FILE="$PROJECT_ROOT/.claude/settings.json"

# deprecated command patterns to remove (regex)
DEPRECATED_PATTERNS=(
  # old hardcoded absolute paths - match absolute paths starting with /home/ or /Users/
  # (not portable across machines, and different from relative .agent/ paths)
  "^/(home|Users)/.*repo=ehmpathy/"
  # npx with repo ehmpathy (use ./node_modules/.bin/rhachet instead)
  "npx rhachet.*--repo ehmpathy"
  # old rhachet roles init syntax (use rhachet run --init instead)
  "rhachet roles init.*--command claude\.hooks/"
  # direct .agent/ paths for hooks (was workaround for slow rhachet, now use run --init)
  "\.agent/repo=ehmpathy/role=mechanic/inits/claude\.hooks/"
)

# Exit if no settings file
if [[ ! -f "$SETTINGS_FILE" ]]; then
  exit 0
fi

# collect stale commands
STALE_COMMANDS=""

# find hooks referencing missing claude.hooks/ files
MISSING_FILES=$(jq -r '
  .hooks // {} | to_entries[] |
  .value[] | .hooks[] | .command // empty
' "$SETTINGS_FILE" | { grep -E "claude\.hooks/" || true; } | while read -r cmd; do
  # extract hook path from rhachet run --init commands
  if [[ "$cmd" == *"rhachet"*"--init"*"claude.hooks/"* ]]; then
    hook_path=$(echo "$cmd" | sed -n 's/.*--init[= ]*\([^ ]*\).*/\1/p')
    if [[ -n "$hook_path" && ! -f "$HOOKS_DIR/${hook_path#claude.hooks/}.sh" ]]; then
      echo "$cmd"
    fi
    continue
  fi

  # direct file path (e.g., .agent/.../claude.hooks/foo.sh)
  if [[ "$cmd" == *"claude.hooks/"* && "$cmd" != *"rhachet"* ]]; then
    if [[ "$cmd" == /* ]]; then
      # absolute path
      if [[ ! -f "$cmd" ]]; then
        echo "$cmd"
      fi
    else
      # relative path
      if [[ ! -f "$PROJECT_ROOT/$cmd" ]]; then
        echo "$cmd"
      fi
    fi
  fi
done)

if [[ -n "$MISSING_FILES" ]]; then
  STALE_COMMANDS="$MISSING_FILES"
fi

# find hooks matching deprecated patterns
DEPRECATED_COMMANDS=$(jq -r '
  .hooks // {} | to_entries[] |
  .value[] | .hooks[] | .command // empty
' "$SETTINGS_FILE" | while read -r cmd; do
  for pattern in "${DEPRECATED_PATTERNS[@]}"; do
    if [[ "$cmd" =~ $pattern ]]; then
      echo "$cmd"
      break
    fi
  done
done)

if [[ -n "$DEPRECATED_COMMANDS" ]]; then
  if [[ -n "$STALE_COMMANDS" ]]; then
    STALE_COMMANDS="$STALE_COMMANDS"$'\n'"$DEPRECATED_COMMANDS"
  else
    STALE_COMMANDS="$DEPRECATED_COMMANDS"
  fi
fi

# Exit if no stale commands found
if [[ -z "$STALE_COMMANDS" ]]; then
  echo "👌 no stale hooks in settings.json"
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
  echo "👌 no stale hooks in settings.json"
  exit 0
fi

# Report what's being removed with tree structure
echo "🧹 remove stale hooks from settings.json"
STALE_ARRAY=()
while IFS= read -r cmd; do
  [[ -n "$cmd" ]] && STALE_ARRAY+=("$cmd")
done <<< "$STALE_COMMANDS"

TOTAL=${#STALE_ARRAY[@]}
for i in "${!STALE_ARRAY[@]}"; do
  cmd="${STALE_ARRAY[$i]}"
  # convert to relative path
  relative_cmd="${cmd#"$PROJECT_ROOT/"}"
  # tree branch: └── for last item, ├── for others
  if [[ $((i + 1)) -eq $TOTAL ]]; then
    echo "   └── $relative_cmd"
  else
    echo "   ├── $relative_cmd"
  fi
done
echo ""

# Atomic replace
mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
