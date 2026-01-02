#!/usr/bin/env bash
######################################################################
# .what = configure mcp servers via .mcp.json and settings.json
#
# .why  = mcp servers extend claude code with external tool integrations.
#         this script orchestrates mcp configuration by:
#           • ensuring settings.json exists
#           • running cleanup to migrate deprecated .mcpServers
#
# .how  = mcp config requires three parts per server:
#           1. .mcp.json — defines server configurations
#           2. settings.json enabledMcpjsonServers — allowlists servers
#           3. settings.json permissions.allow — auto-approves tools
#
#         server-specific scripts (e.g., init.claude.mcp.morph.sh) are
#         opt-in and called separately.
#
# guarantee:
#   ✔ creates .claude/settings.json if missing
#   ✔ cleans up deprecated config
#   ✔ fail-fast on errors
######################################################################

set -euo pipefail

trap 'echo "❌ init.claude.mcp.sh failed at line $LINENO" >&2' ERR

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$PWD"
SETTINGS_FILE="$PROJECT_ROOT/.claude/settings.json"

# ensure .claude directory and settings file exist
mkdir -p "$(dirname "$SETTINGS_FILE")"
if [[ ! -f "$SETTINGS_FILE" ]]; then
  echo "{}" > "$SETTINGS_FILE"
fi

# cleanup any deprecated mcpServers from settings.json
"$SCRIPT_DIR/init.claude.mcp.cleanup.sh"

# todo: default optin morph when promoted
# "$SCRIPT_DIR/init.claude.mcp.morph.sh"
