#!/usr/bin/env bash
######################################################################
# .what = cleanup stale mcp config from settings.json and .mcp.json
#
# .why  = mcp servers used to be configured directly in settings.json
#         under .mcpServers. this is deprecated in favor of .mcp.json.
#         this script:
#           • removes deprecated .mcpServers from settings.json
#           • removes stale servers from .mcp.json not in desired list
#           • removes stale enabledMcpjsonServers entries
#           • removes stale permissions.allow mcp entries
#
# .how  = only removes mechanic-authored entries (leaves user entries alone)
#
# guarantee:
#   ✔ only removes mechanic-authored servers
#   ✔ preserves user-added mcp servers
#   ✔ idempotent: safe to rerun
#   ✔ no-op if no stale servers found
######################################################################

set -euo pipefail

trap 'echo "❌ init.claude.mcp.cleanup.sh failed at line $LINENO" >&2' ERR

PROJECT_ROOT="$PWD"
SETTINGS_FILE="$PROJECT_ROOT/.claude/settings.json"
MCP_FILE="$PROJECT_ROOT/.mcp.json"
AUTHOR="repo=ehmpathy/role=mechanic"

# current desired mcp servers managed by mechanic
DESIRED_SERVERS=("morph-mcp")
DESIRED_TOOLS=("mcp__morph-mcp__edit_file")

CLEANED=()

#----------------------------------------------------------------------
# cleanup 1: remove deprecated .mcpServers from settings.json
#----------------------------------------------------------------------

if [[ -f "$SETTINGS_FILE" ]] && jq -e '.mcpServers' "$SETTINGS_FILE" >/dev/null 2>&1; then
  # find mechanic-authored servers to remove
  STALE=$(jq -r --arg author "$AUTHOR" '
    .mcpServers // {} | to_entries[]
    | select(.value.author == $author)
    | .key
  ' "$SETTINGS_FILE")

  if [[ -n "$STALE" ]]; then
    jq --arg author "$AUTHOR" '
      .mcpServers |= with_entries(select(.value.author != $author))
      | if .mcpServers == {} then del(.mcpServers) else . end
    ' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp"
    mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"

    while IFS= read -r server; do
      [[ -n "$server" ]] && CLEANED+=("$server → .mcpServers (deprecated)")
    done <<< "$STALE"
  fi
fi

#----------------------------------------------------------------------
# cleanup 2: remove stale servers from .mcp.json
#----------------------------------------------------------------------

if [[ -f "$MCP_FILE" ]]; then
  # find mechanic-authored servers not in desired list
  DESIRED_JSON=$(printf '%s\n' "${DESIRED_SERVERS[@]}" | jq -R . | jq -s .)

  STALE=$(jq -r --arg author "$AUTHOR" --argjson desired "$DESIRED_JSON" '
    .mcpServers // {} | to_entries[]
    | select(.value.author == $author)
    | select(.key | IN($desired[]) | not)
    | .key
  ' "$MCP_FILE" 2>/dev/null || echo "")

  if [[ -n "$STALE" ]]; then
    jq --arg author "$AUTHOR" --argjson desired "$DESIRED_JSON" '
      .mcpServers |= with_entries(
        select(.value.author != $author or (.key | IN($desired[])))
      )
    ' "$MCP_FILE" > "$MCP_FILE.tmp"
    mv "$MCP_FILE.tmp" "$MCP_FILE"

    while IFS= read -r server; do
      [[ -n "$server" ]] && CLEANED+=("$server → .mcp.json")
    done <<< "$STALE"
  fi
fi

#----------------------------------------------------------------------
# cleanup 3: remove stale enabledMcpjsonServers entries
#----------------------------------------------------------------------

if [[ -f "$SETTINGS_FILE" ]] && jq -e '.enabledMcpjsonServers' "$SETTINGS_FILE" >/dev/null 2>&1; then
  # remove any mechanic servers not in desired list
  # note: we can only remove servers we know about (the desired list from before)
  OLD_MECHANIC_SERVERS=("filesystem-with-morph")  # legacy names to clean up

  for old_server in "${OLD_MECHANIC_SERVERS[@]}"; do
    if jq -e --arg s "$old_server" '.enabledMcpjsonServers | index($s)' "$SETTINGS_FILE" >/dev/null 2>&1; then
      jq --arg s "$old_server" '.enabledMcpjsonServers |= map(select(. != $s))' \
        "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp"
      mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
      CLEANED+=("$old_server → enabledMcpjsonServers")
    fi
  done
fi

#----------------------------------------------------------------------
# cleanup 4: remove stale mcp tool permissions
#----------------------------------------------------------------------

if [[ -f "$SETTINGS_FILE" ]] && jq -e '.permissions.allow' "$SETTINGS_FILE" >/dev/null 2>&1; then
  # legacy tool names to clean up
  OLD_MECHANIC_TOOLS=("mcp__filesystem-with-morph__edit_file")

  for old_tool in "${OLD_MECHANIC_TOOLS[@]}"; do
    if jq -e --arg t "$old_tool" '.permissions.allow | index($t)' "$SETTINGS_FILE" >/dev/null 2>&1; then
      jq --arg t "$old_tool" '.permissions.allow |= map(select(. != $t))' \
        "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp"
      mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
      CLEANED+=("$old_tool → permissions.allow")
    fi
  done
fi

#----------------------------------------------------------------------
# output results
#----------------------------------------------------------------------

if [[ ${#CLEANED[@]} -gt 0 ]]; then
  echo "🧹 cleanup stale mcp config"
  for i in "${!CLEANED[@]}"; do
    if [[ $((i + 1)) -eq ${#CLEANED[@]} ]]; then
      echo "   └── ${CLEANED[$i]}"
    else
      echo "   ├── ${CLEANED[$i]}"
    fi
  done
  echo ""
fi
