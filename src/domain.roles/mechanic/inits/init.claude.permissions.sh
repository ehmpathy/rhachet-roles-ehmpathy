#!/usr/bin/env bash
######################################################################
# .what = bind mechanic permissions to Claude settings
#
# .why  = the mechanic role needs conservative permissions to operate
#         safely while still being productive.
#
#         this script manages permissions in .claude/settings.json:
#           • replaces existing allows entirely (conservative)
#           • extends denies by appending new entries (conservative)
#           • extends asks by appending new entries (conservative)
#           • idempotent: safe to rerun
#
# .how  = loads permissions from init.claude.permissions.jsonc
#         and uses jq to merge them into .claude/settings.json
#
# guarantee:
#   ✔ creates .claude/settings.json if missing
#   ✔ preserves existing settings (hooks, other configs)
#   ✔ replaces allow list entirely
#   ✔ appends to deny list (no duplicates)
#   ✔ appends to ask list (no duplicates)
#   ✔ drops Write(<path>) rules from deny + ask (claude code never matches them)
#   ✔ idempotent: safe to rerun
#   ✔ fail-fast on errors
######################################################################

set -euo pipefail

# fail loud: print what failed
trap 'echo "❌ init.claude.permissions.sh failed at line $LINENO" >&2' ERR

PROJECT_ROOT="$PWD"
SETTINGS_FILE="$PROJECT_ROOT/.claude/settings.json"

# resolve the permissions config file (relative to this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PERMISSIONS_FILE="$SCRIPT_DIR/init.claude.permissions.jsonc"

# verify permissions file exists
if [[ ! -f "$PERMISSIONS_FILE" ]]; then
  echo "❌ permissions config not found: $PERMISSIONS_FILE" >&2
  exit 2
fi

# load and parse JSONC (strip comments before jq parse)
# - grep removes standalone // comment lines
# - sed removes // comments only when preceded by whitespace
#   this preserves :// in strings like 'name://foo' or 'path://bar'
PERMISSIONS_CONFIG=$(grep -v '^\s*//' "$PERMISSIONS_FILE" | sed 's|[[:space:]]//.*||' | jq -c '.')

# ensure .claude directory exists
mkdir -p "$(dirname "$SETTINGS_FILE")"

# initialize settings file if it doesn't exist
if [[ ! -f "$SETTINGS_FILE" ]]; then
  echo "{}" > "$SETTINGS_FILE"
fi

# apply permissions:
# - replace allow entirely
# - drop Write(<path>) entries from deny + ask, then append (unique)
#
# .why = claude code matches file paths only against Edit(<path>) rules; a
#        Write(<path>) rule matches naught and prints a notice at every boot.
#        allow is replaced whole, so its stale Write rules leave on reinit;
#        deny + ask only append, so without this drop a Write rule an older
#        release shipped would stay forever. the drop changes no enforcement —
#        the rule it removes never matched. a bare `Write` tool rule stays.
jq --argjson perms "$PERMISSIONS_CONFIG" '
  # drop path-scoped Write rules, which claude code never matches
  def without_write_path_rules: map(select(startswith("Write(") | not));

  # ensure .permissions exists
  .permissions //= {} |

  # replace allow entirely with our config
  .permissions.allow = $perms.permissions.allow |

  # append to deny (unique entries only)
  .permissions.deny = ((.permissions.deny // [] | without_write_path_rules) + $perms.permissions.deny | unique) |

  # append to ask (unique entries only)
  .permissions.ask = ((.permissions.ask // [] | without_write_path_rules) + $perms.permissions.ask | unique)
' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
BACKUP_FILE="${SETTINGS_FILE%.json}.${TIMESTAMP}.bak.json"

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
