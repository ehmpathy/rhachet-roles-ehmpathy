#!/usr/bin/env bash
######################################################################
# .what = bind mechanic permissions to Claude settings
#
# .why  = the mechanic role needs conservative permissions to operate
#         safely while still being productive.
#
#         this script manages permissions in .claude/settings.local.json:
#           • replaces existing allows entirely (conservative)
#           • extends denies by appending new entries (conservative)
#           • extends asks by appending new entries (conservative)
#           • idempotent: safe to rerun
#
# .how  = loads permissions from init.claude.permissions.jsonc
#         and uses jq to merge them into .claude/settings.local.json
#
# guarantee:
#   ✔ creates .claude/settings.local.json if missing
#   ✔ preserves existing settings (hooks, other configs)
#   ✔ replaces allow list entirely
#   ✔ appends to deny list (no duplicates)
#   ✔ appends to ask list (no duplicates)
#   ✔ idempotent: safe to rerun
#   ✔ fail-fast on errors
######################################################################

set -euo pipefail

# fail loud: print what failed
trap 'echo "❌ init.claude.permissions.sh failed at line $LINENO" >&2' ERR

PROJECT_ROOT="$PWD"
SETTINGS_FILE="$PROJECT_ROOT/.claude/settings.local.json"

# resolve the permissions config file (relative to this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PERMISSIONS_FILE="$SCRIPT_DIR/init.claude.permissions.jsonc"

# verify permissions file exists
if [[ ! -f "$PERMISSIONS_FILE" ]]; then
  echo "❌ permissions config not found: $PERMISSIONS_FILE" >&2
  exit 1
fi

# load and parse JSONC (strip comments before parsing)
# - removes // line comments (both standalone and trailing)
PERMISSIONS_CONFIG=$(grep -v '^\s*//' "$PERMISSIONS_FILE" | sed 's|//.*||' | jq -c '.')

# ensure .claude directory exists
mkdir -p "$(dirname "$SETTINGS_FILE")"

# initialize settings file if it doesn't exist
if [[ ! -f "$SETTINGS_FILE" ]]; then
  echo "{}" > "$SETTINGS_FILE"
fi

# apply permissions:
# - replace allow entirely
# - append to deny (unique)
# - append to ask (unique)
jq --argjson perms "$PERMISSIONS_CONFIG" '
  # ensure .permissions exists
  .permissions //= {} |

  # replace allow entirely with our config
  .permissions.allow = $perms.permissions.allow |

  # append to deny (unique entries only)
  .permissions.deny = ((.permissions.deny // []) + $perms.permissions.deny | unique) |

  # append to ask (unique entries only)
  .permissions.ask = ((.permissions.ask // []) + $perms.permissions.ask | unique)
' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
BACKUP_FILE="${SETTINGS_FILE%.local.json}.${TIMESTAMP}.bak.local.json"

# check if any changes were made (use jq for semantic JSON comparison)
if jq -e --slurpfile before "$SETTINGS_FILE" --slurpfile after "$SETTINGS_FILE.tmp" -n '$before[0].permissions == $after[0].permissions' >/dev/null 2>&1; then
  rm "$SETTINGS_FILE.tmp"
  echo "👌 mechanic permissions already configured"
  echo "   ${SETTINGS_FILE#"$PROJECT_ROOT/"}"
  exit 0
fi

# create backup before applying changes (guards against partial failures)
cp "$SETTINGS_FILE" "$BACKUP_FILE"

# atomic replace
mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"

echo "🔐 mechanic permissions configured successfully!"
echo "   ${SETTINGS_FILE#"$PROJECT_ROOT/"}"
echo "   ${BACKUP_FILE#"$PROJECT_ROOT/"}"
echo ""
echo "✨ permissions applied:"
echo "   • allow: replaced entirely"
echo "   • deny: extended (no duplicates)"
echo "   • ask: extended (no duplicates)"
