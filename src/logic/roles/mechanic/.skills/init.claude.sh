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
#   ✔ runs both hooks and permissions initialization
#   ✔ fail-fast on any error
#   ✔ idempotent: safe to rerun
######################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔧 init claude config for mechanic role..."
echo ""

# initialize hooks
"$SCRIPT_DIR/init.claude.hooks.sh"
echo ""

# initialize permissions
"$SCRIPT_DIR/init.claude.permissions.sh"
echo ""

echo "👌 claude config ready"
