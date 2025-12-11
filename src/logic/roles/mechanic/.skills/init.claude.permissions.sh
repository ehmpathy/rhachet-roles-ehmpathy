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
# .how  = uses jq to merge the permissions configuration
#         into the existing settings structure, creating it if absent.
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

PROJECT_ROOT="$PWD"
SETTINGS_FILE="$PROJECT_ROOT/.claude/settings.local.json"

# define the permissions configuration to apply
PERMISSIONS_CONFIG=$(cat <<'EOF'
{
  "permissions": {
    "deny": [
      "Bash(git commit:*)",
      "Bash(sed:*)",
      "Bash(tee:*)",
      "Bash(find:*)",
      "Bash(echo:*)",
      "Bash(mv:*)",
      "Bash(npx biome:*)",
      "Bash(npx jest:*)",
    ],
    "ask": [
      "Bash(bash:*)",
      "Bash(chmod:*)",
      "Bash(npm install:*)",
      "Bash(pnpm install:*)",
      "Bash(pnpm add:*)"
    ],
    "allow": [
      "WebSearch",
      "WebFetch(domain:github.com)",
      "WebFetch(domain:www.npmjs.com)",
      "WebFetch(domain:hub.docker.com)",
      "WebFetch(domain:raw.githubusercontent.com)",
      "WebFetch(domain:biomejs.dev)",

      "Bash(ls:*)",
      "Bash(tree:*)",
      "Bash(cat:*)",
      "Bash(head:*)",
      "Bash(tail:*)",
      "Bash(grep:*)",
      "Bash(wc:*)",
      "Bash(diff:*)",
      "Bash(which:*)",
      "Bash(file:*)",
      "Bash(mkdir:*)",
      "Bash(pwd)",
      "Bash(bash src/logic/roles/mechanic/.skills/claude.tools/mvsafe.sh:*)",
      "Bash(npm view:*)",
      "Bash(npm list:*)",
      "Bash(npm remove:*)",

      "Bash(npx rhachet roles boot --repo ehmpathy --role mechanic)",
      "Bash(npx tsx ./bin/run:*)",

      "Bash(npm run build:*)",
      "Bash(npm run build:compile)",
      "Bash(npm run start:testdb:*)",


      "Bash(npm run test:*)",
      "Bash(npm run test:types:*)",
      "Bash(npm run test:format:*)",
      "Bash(npm run test:lint:*)",
      "Bash(npm run test:unit:*)",
      "Bash(npm run test:integration:*)",
      "Bash(npm run test:acceptance:*)",

      "Bash(THOROUGH=true npm run test:*)",
      "Bash(THOROUGH=true npm run test:types:*)",
      "Bash(THOROUGH=true npm run test:format:*)",
      "Bash(THOROUGH=true npm run test:lint:*)",
      "Bash(THOROUGH=true npm run test:unit:*)",
      "Bash(THOROUGH=true npm run test:integration:*)",
      "Bash(THOROUGH=true npm run test:acceptance:*)",

      "Bash(npm run fix:*)",
      "Bash(npm run fix:format:*)",
      "Bash(npm run fix:lint:*)",

      "Bash(gh pr checks:*)",
      "Bash(gh pr status:*)",

      "Bash(source .agent/repo=.this/skills/*)"
    ]
  }
}
EOF
)

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

# check if any changes were made
if diff -q "$SETTINGS_FILE" "$SETTINGS_FILE.tmp" >/dev/null 2>&1; then
  rm "$SETTINGS_FILE.tmp"
  echo "👌 mechanic permissions already configured"
  echo "   $SETTINGS_FILE"
  exit 0
fi

# atomic replace
mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"

echo "🔐 mechanic permissions configured successfully!"
echo "   $SETTINGS_FILE"
echo ""
echo "✨ permissions applied:"
echo "   • allow: replaced entirely"
echo "   • deny: extended (no duplicates)"
echo "   • ask: extended (no duplicates)"
