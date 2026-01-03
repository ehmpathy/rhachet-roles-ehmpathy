#!/usr/bin/env bash
######################################################################
# .what = bind all mechanic hooks to Claude settings
#
# .why  = the mechanic role uses multiple hooks:
#           • SessionStart: boot mechanic on every session
#           • SessionStart: notify Claude of allowed permissions upfront
#           • PreToolUse: forbid stderr redirects (2>&1)
#           • PreToolUse: forbid gerunds in file writes (HARDNUDGE)
#           • PreToolUse: check existing permissions before new requests
#           • PreToolUse: nudge preference for morph edit_file
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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FINDSERT="$SCRIPT_DIR/init.claude.hooks.findsert.sh"
CLEANUP="$SCRIPT_DIR/init.claude.hooks.cleanup.sh"
RHACHET_CLI="./node_modules/.bin/rhachet"

# collect hook results for tree output
HOOKS_BOUND=()
HOOKS_EXISTING=()

# helper to run findsert and collect result
run_findsert() {
  local name="$1"
  shift
  local output
  output=$("$FINDSERT" "$@" 2>&1)
  if [[ "$output" == *"bound successfully"* ]]; then
    HOOKS_BOUND+=("$name")
  elif [[ "$output" == *"already bound"* ]]; then
    HOOKS_EXISTING+=("$name")
  fi
}

# First, cleanup any stale hooks (referencing removed scripts)
"$CLEANUP"

# SessionStart hooks (order matters - notify permissions first, then boot roles)

run_findsert "sessionstart.notify-permissions" \
  --hook-type SessionStart \
  --matcher "*" \
  --command "$RHACHET_CLI roles init --repo ehmpathy --role mechanic --command claude.hooks/sessionstart.notify-permissions" \
  --name "sessionstart.notify-permissions" \
  --timeout 5

run_findsert "sessionstart.boot.this" \
  --hook-type SessionStart \
  --matcher "*" \
  --command "$RHACHET_CLI roles boot --repo .this --role any --if-present" \
  --name "sessionstart.boot.this" \
  --timeout 60

run_findsert "sessionstart.boot.mechanic" \
  --hook-type SessionStart \
  --matcher "*" \
  --command "$RHACHET_CLI roles boot --repo ehmpathy --role mechanic" \
  --name "sessionstart.boot.mechanic" \
  --timeout 60

# PreToolUse hooks (order matters - forbid-stderr-redirect first via prepend)

run_findsert "pretooluse.forbid-stderr-redirect" \
  --hook-type PreToolUse \
  --matcher "Bash" \
  --command "$RHACHET_CLI roles init --repo ehmpathy --role mechanic --command claude.hooks/pretooluse.forbid-stderr-redirect" \
  --name "pretooluse.forbid-stderr-redirect" \
  --timeout 5 \
  --position prepend

run_findsert "pretooluse.forbid-gerunds.write" \
  --hook-type PreToolUse \
  --matcher "Write" \
  --command ".agent/repo=ehmpathy/role=mechanic/inits/claude.hooks/pretooluse.forbid-gerunds.sh" \
  --name "pretooluse.forbid-gerunds.write" \
  --timeout 5

run_findsert "pretooluse.forbid-gerunds.edit" \
  --hook-type PreToolUse \
  --matcher "Edit" \
  --command ".agent/repo=ehmpathy/role=mechanic/inits/claude.hooks/pretooluse.forbid-gerunds.sh" \
  --name "pretooluse.forbid-gerunds.edit" \
  --timeout 5

run_findsert "pretooluse.check-permissions" \
  --hook-type PreToolUse \
  --matcher "Bash" \
  --command "$RHACHET_CLI roles init --repo ehmpathy --role mechanic --command claude.hooks/pretooluse.check-permissions" \
  --name "pretooluse.check-permissions" \
  --timeout 5

run_findsert "pretooluse.prefer-morph-edit" \
  --hook-type PreToolUse \
  --matcher "Edit" \
  --command "$RHACHET_CLI roles init --repo ehmpathy --role mechanic --command claude.hooks/pretooluse.prefer-morph-edit" \
  --name "pretooluse.prefer-morph-edit" \
  --timeout 5

# print tree for newly bound hooks
if [[ ${#HOOKS_BOUND[@]} -gt 0 ]]; then
  echo "🔗 bind hooks"
  for i in "${!HOOKS_BOUND[@]}"; do
    if [[ $((i + 1)) -eq ${#HOOKS_BOUND[@]} ]]; then
      echo "   └── ${HOOKS_BOUND[$i]}"
    else
      echo "   ├── ${HOOKS_BOUND[$i]}"
    fi
  done
  echo ""
fi

# print tree for existing hooks
if [[ ${#HOOKS_EXISTING[@]} -gt 0 ]]; then
  echo "👌 hooks already bound"
  for i in "${!HOOKS_EXISTING[@]}"; do
    if [[ $((i + 1)) -eq ${#HOOKS_EXISTING[@]} ]]; then
      echo "   └── ${HOOKS_EXISTING[$i]}"
    else
      echo "   ├── ${HOOKS_EXISTING[$i]}"
    fi
  done
  echo ""
fi
