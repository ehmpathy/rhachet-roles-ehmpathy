#!/usr/bin/env bash
######################################################################
# .what = initialize Claude settings for mechanic role
#
# .why  = mechanic needs both hooks and permissions configured to
#         operate effectively. this script dispatches to both:
#           • init.claude.hooks.sh - binds SessionStart hook
#           • init.claude.permissions.sh - configures permissions
#
#         single entry point for full Claude configuration.
#
# .how  = runs both init scripts in sequence from the same directory.
#
# guarantee:
#   ✔ backs up settings.local.json before changes (if exists)
#   ✔ runs both hooks and permissions initialization
#   ✔ fail-fast on any error
#   ✔ idempotent: safe to rerun
######################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GITROOT="$(git rev-parse --show-toplevel)"
SETTINGS_FILE="$GITROOT/.claude/settings.local.json"

echo "🔧 init claude config for mechanic role..."
echo ""

# backup existing settings before changes
if [[ -f "$SETTINGS_FILE" ]]; then
  ISODATETIME="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
  BACKUP_FILE="$GITROOT/.claude/settings.$ISODATETIME.bak.local.json"
  cp "$SETTINGS_FILE" "$BACKUP_FILE"
  echo "📦 backed up settings to: ${BACKUP_FILE#$GITROOT/}"
  echo ""
fi

# initialize hooks
"$SCRIPT_DIR/init.claude.hooks.sh"
echo ""

# initialize permissions
"$SCRIPT_DIR/init.claude.permissions.sh"
echo ""

echo "👌 claude config ready"
