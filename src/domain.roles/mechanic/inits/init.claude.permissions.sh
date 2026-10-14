#!/usr/bin/env bash
######################################################################
# .what = bind mechanic permissions to Claude settings
#
# .why  = the mechanic role needs conservative permissions to operate
#         safely while still being productive.
#
#         this init manages the repo's permissions file:
#           • split layout -> .claude/settings.of.repo.json (loaded via --settings)
#           • old layout   -> .claude/settings.json
#         and in that file:
#           • replaces prior allows entirely (conservative)
#           • extends denies with new entries (conservative)
#           • extends asks with new entries (conservative)
#           • idempotent: safe to rerun
#
# .how  = loads permissions from init.claude.permissions.jsonc
#         and uses jq to merge them into the target file, via a
#         temp file in the same dir and a rename
#
# guarantee:
#   ✔ creates the target file if absent
#   ✔ never writes through, nor replaces, a settings.json link
#   ✔ refuses a settings.of.repo.json link (exit 2), so no write goes through it
#   ✔ at most one backup per run, and only of a prior file that changed
#   ✔ preserves prior settings (hooks, other configs)
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
CLAUDE_DIR="$PROJECT_ROOT/.claude"

# pick the file that holds the repo's permissions, by layout:
# - split layout (settings.of.repo.json exists; rhachet creates it before role inits run)
#   -> settings.of.repo.json, which claude loads via --settings; the link is never touched
# - old layout -> a real settings.json
# .note = a settings.json link also routes here, as a guard: a write to settings.json would
#         replace rhachet's link with a real file, which rhachet then drops. it never fires
#         on the old layout, where settings.json is real
# .note = a linked .claude dir is NOT a split signal: rhachet 1.48 already links .claude to
#         the repo actor's dir on the old layout, where claude loads settings.json
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
if [[ -L "$CLAUDE_DIR/settings.json" || -e "$CLAUDE_DIR/settings.of.repo.json" ]]; then
  SETTINGS_FILE="$CLAUDE_DIR/settings.of.repo.json"
fi

# refuse a target that is itself a link: the seed write would land in the link's target
if [[ -L "$SETTINGS_FILE" ]]; then
  LINK_REFUSAL="✋ ConstraintError: ${SETTINGS_FILE#"$PROJECT_ROOT/"} is a link; this init writes only a real file

fix: replace the link with a real file (or remove it), then rerun the init."
  echo "$LINK_REFUSAL"
  echo "$LINK_REFUSAL" >&2
  exit 2
fi

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

# seed the target file if absent; a seed is not a prior file, so it earns no backup
PRIOR_FILE_FOUND=false
if [[ -f "$SETTINGS_FILE" ]]; then
  PRIOR_FILE_FOUND=true
fi
if [[ "$PRIOR_FILE_FOUND" == false ]]; then
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

# .what = name the clone's own config dir when this init did not write it
# .why  = a clone of another actor checks its own <config dir>/settings.of.repo.json, which
#         rhx enroll derives from the repo's file; this init writes only the repo's file
print_config_dir_note() {
  local config_dir="${CLAUDE_CONFIG_DIR:-}"
  config_dir="${config_dir%/}"
  [[ -z "$config_dir" || "$config_dir" -ef "$CLAUDE_DIR" ]] && return 0
  echo "   note: this clone's config dir is $config_dir; its settings.of.repo.json is derived from this file. every actor picks up new allows at the next rhx init --hooks, rhx upgrade, or its own next rhx enroll. a delta actor also picks them up in the same rhx init --roles, when that init changed its roles"
}

TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
BACKUP_FILE="${SETTINGS_FILE%.json}.${TIMESTAMP}.bak.json"

# check if any changes were made (use jq for semantic JSON comparison)
if jq -e --slurpfile before "$SETTINGS_FILE" --slurpfile after "$SETTINGS_FILE.tmp" -n '$before[0].permissions == $after[0].permissions' >/dev/null 2>&1; then
  rm "$SETTINGS_FILE.tmp"
  echo "👌 mechanic permissions already configured"
  echo "   ${SETTINGS_FILE#"$PROJECT_ROOT/"}"
  print_config_dir_note
  exit 0
fi

# back up the prior file before the replace (the one backup per init; guards against
# partial failures). a freshly seeded file has no prior content to keep.
if [[ "$PRIOR_FILE_FOUND" == true ]]; then
  cp "$SETTINGS_FILE" "$BACKUP_FILE"
fi

# atomic replace: a rename within the same dir, onto a real file, never onto a link
mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"

echo "🔐 mechanic permissions configured successfully!"
echo "   ${SETTINGS_FILE#"$PROJECT_ROOT/"}"
if [[ "$PRIOR_FILE_FOUND" == true ]]; then
  echo "   ${BACKUP_FILE#"$PROJECT_ROOT/"}"
fi
print_config_dir_note
echo ""
echo "✨ permissions applied:"
echo "   • allow: replaced entirely"
echo "   • deny: extended (no duplicates)"
echo "   • ask: extended (no duplicates)"
