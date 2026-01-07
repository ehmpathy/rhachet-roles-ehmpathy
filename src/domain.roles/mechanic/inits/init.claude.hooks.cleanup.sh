#!/usr/bin/env bash
######################################################################
# .what = cleanup stale hooks from Claude settings
#
# .why  = dispatches to grain-specific cleanup scripts:
#         - repograin: cleans .claude/settings.json
#         - localgrain: cleans .claude/settings.local.json
#
# usage:
#   init.claude.hooks.cleanup.sh
#
# guarantee:
#   ✔ runs both repograin and localgrain cleanup
#   ✔ idempotent: safe to rerun
######################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# cleanup repo-level settings.json
"$SCRIPT_DIR/init.claude.hooks.cleanup.repograin.sh"

# cleanup local-level settings.local.json
"$SCRIPT_DIR/init.claude.hooks.cleanup.localgrain.sh"
