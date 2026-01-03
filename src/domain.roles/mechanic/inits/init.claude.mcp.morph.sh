#!/usr/bin/env bash
######################################################################
# .what = configure morph mcp server for fast code edits
#
# .why  = morph fast-apply provides 12x faster code edits at 98% accuracy.
#         this script configures morph-mcp via:
#           1. .mcp.json — server definition
#           2. settings.json enabledMcpjsonServers — allowlist server
#           3. settings.json permissions.allow — auto-approve tools
#
# .how  = called by init.claude.mcp.sh to configure morph specifically
#
# guarantee:
#   ✔ creates .mcp.json if missing
#   ✔ idempotent: no-op if already configured
#   ✔ tracks author for safe cleanup
#   ✔ non-blocking on missing api key (just warns)
#   ✔ fail-fast on errors
######################################################################

set -euo pipefail

trap 'echo "❌ init.claude.mcp.morph.sh failed at line $LINENO" >&2' ERR

PROJECT_ROOT="$PWD"
MCP_FILE="$PROJECT_ROOT/.mcp.json"
SETTINGS_FILE="$PROJECT_ROOT/.claude/settings.json"
AUTHOR="repo=ehmpathy/role=mechanic"

# collect results for output (passed back via stdout parsing or global)
MCP_BOUND=()
MCP_EXISTING=()
MCP_WARNED=()

# check for api key (non-blocking warning)
if [[ -z "${MORPH_API_KEY:-}" ]]; then
  MCP_WARNED+=("MORPH_API_KEY not set - morph fast-apply disabled")
  MCP_WARNED+=("  get key: https://morphllm.com")
  MCP_WARNED+=("  then: export MORPH_API_KEY=your-key")
fi

#----------------------------------------------------------------------
# step 1: create .mcp.json with server definition
#----------------------------------------------------------------------

if [[ ! -f "$MCP_FILE" ]]; then
  jq -n --arg author "$AUTHOR" '{
    "mcpServers": {
      "morph-mcp": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@morphllm/morphmcp"],
        "env": {
          "MORPH_API_KEY": "${MORPH_API_KEY}",
          "ENABLED_TOOLS": "edit_file,warpgrep_codebase_search"
        },
        "author": $author
      }
    }
  }' > "$MCP_FILE"
  MCP_BOUND+=("morph-mcp → .mcp.json")
elif jq -e '.mcpServers["morph-mcp"]' "$MCP_FILE" >/dev/null 2>&1; then
  MCP_EXISTING+=("morph-mcp → .mcp.json")
else
  jq --arg author "$AUTHOR" '.mcpServers["morph-mcp"] = {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@morphllm/morphmcp"],
    "env": {
      "MORPH_API_KEY": "${MORPH_API_KEY}",
      "ENABLED_TOOLS": "edit_file,warpgrep_codebase_search"
    },
    "author": $author
  }' "$MCP_FILE" > "$MCP_FILE.tmp"
  mv "$MCP_FILE.tmp" "$MCP_FILE"
  MCP_BOUND+=("morph-mcp → .mcp.json")
fi

#----------------------------------------------------------------------
# step 2: enable server in settings.json via enabledMcpjsonServers
#----------------------------------------------------------------------

if jq -e '.enabledMcpjsonServers | index("morph-mcp")' "$SETTINGS_FILE" >/dev/null 2>&1; then
  MCP_EXISTING+=("morph-mcp → enabledMcpjsonServers")
else
  jq '.enabledMcpjsonServers = ((.enabledMcpjsonServers // []) + ["morph-mcp"])' \
    "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp"
  mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
  MCP_BOUND+=("morph-mcp → enabledMcpjsonServers")
fi

#----------------------------------------------------------------------
# step 3: allow mcp tools in permissions.allow
#----------------------------------------------------------------------

MCP_TOOLS=(
  "mcp__morph-mcp__edit_file"
)

for tool in "${MCP_TOOLS[@]}"; do
  if jq -e --arg tool "$tool" '.permissions.allow | index($tool)' "$SETTINGS_FILE" >/dev/null 2>&1; then
    MCP_EXISTING+=("$tool → permissions.allow")
  else
    jq --arg tool "$tool" '
      .permissions //= {} |
      .permissions.allow = ((.permissions.allow // []) + [$tool])
    ' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp"
    mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
    MCP_BOUND+=("$tool → permissions.allow")
  fi
done

#----------------------------------------------------------------------
# output results
#----------------------------------------------------------------------

# print warnings first
if [[ ${#MCP_WARNED[@]} -gt 0 ]]; then
  echo "⚠️  warnings"
  for warn in "${MCP_WARNED[@]}"; do
    echo "   $warn"
  done
  echo ""
fi

# print newly bound
if [[ ${#MCP_BOUND[@]} -gt 0 ]]; then
  echo "🔗 bind morph-mcp"
  for i in "${!MCP_BOUND[@]}"; do
    if [[ $((i + 1)) -eq ${#MCP_BOUND[@]} ]]; then
      echo "   └── ${MCP_BOUND[$i]}"
    else
      echo "   ├── ${MCP_BOUND[$i]}"
    fi
  done
  echo ""
fi

# print existing
if [[ ${#MCP_EXISTING[@]} -gt 0 ]]; then
  echo "👌 morph-mcp already bound"
  for i in "${!MCP_EXISTING[@]}"; do
    if [[ $((i + 1)) -eq ${#MCP_EXISTING[@]} ]]; then
      echo "   └── ${MCP_EXISTING[$i]}"
    else
      echo "   ├── ${MCP_EXISTING[$i]}"
    fi
  done
  echo ""
fi
