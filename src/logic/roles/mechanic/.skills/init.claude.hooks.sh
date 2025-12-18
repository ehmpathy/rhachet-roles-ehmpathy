#!/usr/bin/env bash
######################################################################
# .what = bind all mechanic hooks to Claude settings
#
# .why  = the mechanic role uses multiple hooks:
#           • SessionStart: boot mechanic on every session
#           • SessionStart: notify Claude of allowed permissions upfront
#           • PreToolUse: forbid stderr redirects (2>&1)
#           • PreToolUse: check existing permissions before new requests
#
#         this script manages hook registration via findsert utility.
#
# .how  = 1. runs cleanup to remove stale hooks (deleted scripts)
#         2. calls findsert for each hook in desired order
#
# guarantee:
#   ✔ idempotent: safe to rerun
#   ✔ fail-fast on errors
######################################################################

set -euo pipefail

# fail loud: print what failed
trap 'echo "❌ init.claude.hooks.sh failed at line $LINENO" >&2' ERR

SKILLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FINDSERT="$SKILLS_DIR/init.claude.hooks.findsert.sh"
CLEANUP="$SKILLS_DIR/init.claude.hooks.cleanup.sh"

# Path to hook scripts (relative to this script)
HOOKS_DIR="$SKILLS_DIR/claude.hooks"

# First, cleanup any stale hooks (referencing removed scripts)
"$CLEANUP"

# SessionStart hooks (order matters - boot first, then notify permissions)

"$FINDSERT" \
  --hook-type SessionStart \
  --matcher "*" \
  --command "npx rhachet roles boot --repo ehmpathy --role mechanic" \
  --name "sessionstart.boot" \
  --timeout 60

"$FINDSERT" \
  --hook-type SessionStart \
  --matcher "*" \
  --command "$HOOKS_DIR/sessionstart.notify-permissions.sh" \
  --name "sessionstart.notify-permissions" \
  --timeout 5

# PreToolUse hooks (order matters - forbid-stderr-redirect first via prepend)

"$FINDSERT" \
  --hook-type PreToolUse \
  --matcher "Bash" \
  --command "$HOOKS_DIR/pretooluse.forbid-stderr-redirect.sh" \
  --name "pretooluse.forbid-stderr-redirect" \
  --timeout 5 \
  --position prepend

"$FINDSERT" \
  --hook-type PreToolUse \
  --matcher "Bash" \
  --command "$HOOKS_DIR/pretooluse.check-permissions.sh" \
  --name "pretooluse.check-permissions" \
  --timeout 5
