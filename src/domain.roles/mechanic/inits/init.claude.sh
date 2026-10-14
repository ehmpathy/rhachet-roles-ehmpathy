#!/usr/bin/env bash
######################################################################
# .what = initialize Claude settings for mechanic role
#
# .why  = mechanic needs permissions configured to operate
#         effectively. this init dispatches to:
#           • init.claude.permissions.sh - configures permissions
#
# .how  = runs all init executables in sequence from the same directory.
#
# guarantee:
#   ✔ runs permissions initialization
#   ✔ one backup per init, at most: the permissions init owns it,
#     since only it knows which file it writes and whether it changed
#   ✔ fail-fast on any error
#   ✔ idempotent: safe to rerun
######################################################################

set -euo pipefail

# fail loud: print what failed
trap 'echo "❌ init.claude.sh failed at line $LINENO" >&2' ERR

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔧 init claude config for mechanic role..."
echo ""

# initialize permissions (it backs up its own target file, when that file changes)
"$SCRIPT_DIR/init.claude.permissions.sh"
echo ""

echo "👌 claude config ready"
