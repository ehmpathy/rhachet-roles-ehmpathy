#!/usr/bin/env bash
######################################################################
# .what = cleanup role=mechanic hooks from .claude/settings.local.json
#
# .why  = hooks that were previously in settings.local.json need to be
#         removed now that they've moved to settings.json.
#
# .how  = finds hooks with role=mechanic in command or author field
#         and removes them from settings.local.json.
#
# usage:
#   init.claude.hooks.cleanup.localgrain.sh
#
# guarantee:
#   ✔ removes hooks with role=mechanic in command
#   ✔ removes hooks with author "repo=ehmpathy/role=mechanic"
#   ✔ preserves all other hooks and settings
#   ✔ idempotent: safe to rerun
#   ✔ no-op if no mechanic hooks found
######################################################################

set -euo pipefail

# fail loud: print what failed
trap 'echo "❌ init.claude.hooks.cleanup.localgrain.sh failed at line $LINENO" >&2' ERR

PROJECT_ROOT="$PWD"
SETTINGS_LOCAL_FILE="$PROJECT_ROOT/.claude/settings.local.json"

# skip if no settings.local.json
if [[ ! -f "$SETTINGS_LOCAL_FILE" ]]; then
  exit 0
fi

# check if settings.local.json has any hooks
if ! jq -e '.hooks // empty' "$SETTINGS_LOCAL_FILE" >/dev/null 2>&1; then
  exit 0
fi

# find mechanic hooks in settings.local.json (by command pattern or author field)
MECHANIC_HOOKS=$(jq -r '
  .hooks // {} | to_entries[] |
  .value[] | .hooks[] |
  select(
    ((.command // "") | (contains("role=mechanic") or contains("--role mechanic")))
    or
    ((.author // "") | contains("repo=ehmpathy/role=mechanic"))
  ) |
  .command // .author
' "$SETTINGS_LOCAL_FILE")

# skip if no mechanic hooks found
if [[ -z "$MECHANIC_HOOKS" ]]; then
  echo "👌 no mechanic hooks in settings.local.json"
  exit 0
fi

# build jq filter to remove mechanic hooks
jq '
  .hooks |= (
    if . then
      to_entries | map(
        .value |= map(
          .hooks |= map(select(
            # keep hooks that do NOT match mechanic patterns
            ((.command // "") | (contains("role=mechanic") or contains("--role mechanic")) | not)
            and
            ((.author // "") | contains("repo=ehmpathy/role=mechanic") | not)
          ))
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
  # Remove hooks key entirely if empty
  | if .hooks == {} then del(.hooks) else . end
' "$SETTINGS_LOCAL_FILE" > "$SETTINGS_LOCAL_FILE.tmp"

# check if any changes were made
if diff -q "$SETTINGS_LOCAL_FILE" "$SETTINGS_LOCAL_FILE.tmp" >/dev/null 2>&1; then
  rm "$SETTINGS_LOCAL_FILE.tmp"
  echo "👌 no mechanic hooks in settings.local.json"
  exit 0
fi

# report what's being removed
echo "🧹 remove role=mechanic hooks from settings.local.json"
MECHANIC_ARRAY=()
while IFS= read -r item; do
  [[ -n "$item" ]] && MECHANIC_ARRAY+=("$item")
done <<< "$MECHANIC_HOOKS"

TOTAL=${#MECHANIC_ARRAY[@]}
for i in "${!MECHANIC_ARRAY[@]}"; do
  item="${MECHANIC_ARRAY[$i]}"
  if [[ $((i + 1)) -eq $TOTAL ]]; then
    echo "   └── $item"
  else
    echo "   ├── $item"
  fi
done
echo ""

# atomic replace
mv "$SETTINGS_LOCAL_FILE.tmp" "$SETTINGS_LOCAL_FILE"
