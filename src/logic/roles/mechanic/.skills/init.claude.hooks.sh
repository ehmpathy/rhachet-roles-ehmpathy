#!/usr/bin/env bash
######################################################################
# .what = bind all mechanic hooks to Claude settings
#
# .why  = the mechanic role uses multiple hooks:
#           • SessionStart: boot mechanic on every session
#           • PreToolUse: check existing permissions before new requests
#
#         this script dispatches to each hook initializer.
#
# .how  = runs each init.claude.hooks.*.sh script in sequence
#
# guarantee:
#   ✔ idempotent: safe to rerun
#   ✔ fail-fast on errors
######################################################################

set -euo pipefail

SKILLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Dispatch to each hook initializer
"$SKILLS_DIR/init.claude.hooks.sessionstart.sh"
"$SKILLS_DIR/init.claude.hooks.pretooluse.sh"
