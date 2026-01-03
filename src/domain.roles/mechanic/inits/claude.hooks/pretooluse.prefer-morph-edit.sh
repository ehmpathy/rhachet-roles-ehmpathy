#!/usr/bin/env bash
######################################################################
# .what = PreToolUse hook that nudges preference for morph's edit_file
#
# .why  = morph's edit_file tool is 12x faster than Claude's native
#         Edit (str_replace) with 98% accuracy and 50% fewer tokens.
#         this hook reminds Claude to prefer edit_file when morph
#         mcp server is available.
#
# .how  = reads JSON from stdin, hashes the input, blocks once per
#         unique hash to show reminder, then allows on retry.
#
# usage:
#   configure in .claude/settings.json under hooks.PreToolUse
#
# guarantee:
#   ✔ blocks once per unique edit to show reminder
#   ✔ allows on retry (same input hash)
#   ✔ conditional: only nudges if morph mcp is configured
######################################################################

set -euo pipefail

trap 'echo "❌ pretooluse.prefer-morph-edit.sh failed at line $LINENO" >&2; exit 0' ERR

# /tmp for hash storage: OS auto garbage-collects on reboot
HASH_DIR="/tmp/morph-edit-nudges"
mkdir -p "$HASH_DIR" || { echo "❌ failed to create hash dir" >&2; exit 0; }

# fail fast if stdin is a terminal (no pipe)
if [[ -t 0 ]]; then
  echo "❌ UnexpectedCodePathError: stdin is a terminal, expected piped input" >&2
  exit 0
fi

# read JSON from stdin (Claude Code passes input via stdin)
STDIN_INPUT=$(cat)

# failfast: if no input received, unexpected code path
if [[ -z "$STDIN_INPUT" ]]; then
  echo "❌ UnexpectedCodePathError: no stdin input received" >&2
  exit 0
fi

# extract tool name from stdin JSON
TOOL_NAME=$(echo "$STDIN_INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
if [[ -z "$TOOL_NAME" ]]; then
  echo "❌ UnexpectedCodePathError: could not extract tool_name from stdin" >&2
  exit 0
fi

# only interested in Edit tool (Write is for new files, edit_file is for edits)
if [[ "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

# check if morph mcp is configured via .mcp.json
GITROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "$PWD")"
MCP_FILE="$GITROOT/.mcp.json"

if [[ ! -f "$MCP_FILE" ]]; then
  exit 0
fi

if ! jq -e '.mcpServers["morph-mcp"]' "$MCP_FILE" >/dev/null 2>&1; then
  exit 0
fi

# hash filepath + 5min interval (one nudge per file per 5 minutes max)
FILE_PATH=$(echo "$STDIN_INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
TIME_BUCKET=$(( $(date +%s) / 300 ))  # 300 seconds = 5 minutes
INPUT_HASH=$(echo "${FILE_PATH}:${TIME_BUCKET}" | sha256sum | cut -d' ' -f1)
HASH_FILE="$HASH_DIR/$INPUT_HASH"

# if already nudged for this hash, allow
if [[ -f "$HASH_FILE" ]]; then
  exit 0
fi

# record the nudge
touch "$HASH_FILE"

# block with reminder (exit 2 = block, stderr shown to user)
{
  echo ""
  echo "💡 morph fast-apply available"
  echo "   prefer \`edit_file\` over \`Edit\` for 12x faster edits"
  echo "   edit_file works with partial code snippets—no need for full file content"
  echo ""
  echo "   (retry to proceed with Edit anyway)"
  echo ""
} >&2

exit 2
