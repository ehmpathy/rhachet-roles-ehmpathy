#!/usr/bin/env bash
######################################################################
# .what = register the PermissionRequest decider in THIS repo's own
#         claude settings, and nowhere else
#
# .why  = rhachet's hook sync knows onBoot/onTool/onStop/onTalk only,
#         so no role can declare a PermissionRequest hook; and the split
#         layout (rhachet >= 1.49) derives settings.of.repo.json from the
#         roles alone, so a hand-written entry does not survive an init.
#         this repo-local init runs after `rhachet init` (prepare:rhachet)
#         and seats the decider for this repo only. a consumer repo never
#         receives it: a fleet-wide auto-approver is a behavior of its own.
#
# usage:
#   rhx init.claude.permissionrequest
#   bash .agent/repo=.this/role=any/skills/init.claude.permissionrequest.sh
#
# guarantee:
#   ✔ writes the repo's settings file, by layout:
#     split -> .claude/settings.of.repo.json · old -> .claude/settings.json
#   ✔ refuses a target that is a link (exit 2), so no write goes through it
#   ✔ upserts one decider entry, first, keyed on its command;
#     every other PermissionRequest entry is kept
#   ✔ leaves the matcher untagged (no `# author=`), so rhachet's hook
#     sync never claims nor prunes it
#   ✔ idempotent: a rerun with no change writes naught
#   ✔ fail-fast on errors
######################################################################

set -euo pipefail

PROJECT_ROOT="$PWD"
CLAUDE_DIR="$PROJECT_ROOT/.claude"
DECIDER_COMMAND="bash .agent/repo=ehmpathy/role=mechanic/inits/claude.hooks/permissionrequest.decide-permissions.sh"

# pick the file that holds the repo's settings, by layout (same signal as the mechanic init)
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
if [[ -L "$CLAUDE_DIR/settings.json" || -e "$CLAUDE_DIR/settings.of.repo.json" ]]; then
  SETTINGS_FILE="$CLAUDE_DIR/settings.of.repo.json"
fi
SETTINGS_REL="${SETTINGS_FILE#"$PROJECT_ROOT/"}"

# refuse a target that is itself a link: the write would land in the link's target
if [[ -L "$SETTINGS_FILE" ]]; then
  # .note = echo to each stream, not `tee /dev/stderr`: a socket stderr (node spawn) refuses the open
  # the fix is a next move, so it renders as a coconut (rule.require.coconut-hints)
  LINK_REFUSAL="✋ ConstraintError: $SETTINGS_REL is a link; this init writes only a real file

🥥 did you know?
   ├─ run rhachet init first, so the repo settings file is real, then rerun this init
   └─ npx rhachet init --hooks"
  echo "$LINK_REFUSAL"
  echo "$LINK_REFUSAL" >&2
  exit 2
fi

# seed the file if absent
mkdir -p "$CLAUDE_DIR"
if [[ ! -f "$SETTINGS_FILE" ]]; then
  echo "{}" > "$SETTINGS_FILE"
fi

# upsert the decider: drop any prior shape of it, then seat it first
FILE_TEMP="$SETTINGS_FILE.tmp.$$"
if ! jq --arg decider "$DECIDER_COMMAND" '
  def is_decider_entry: (.hooks // []) | any(.command // "" | contains("permissionrequest.decide-permissions"));
  .hooks //= {} |
  .hooks.PermissionRequest = (
    [{ matcher: "Bash", hooks: [{ type: "command", command: $decider, timeout: 5 }] }]
    + (.hooks.PermissionRequest // [] | map(select(is_decider_entry | not)))
  )
' "$SETTINGS_FILE" > "$FILE_TEMP"; then
  rm -f "$FILE_TEMP"
  PARSE_FAILURE="💥 MalfunctionError: could not parse $SETTINGS_REL as json"
  echo "$PARSE_FAILURE"
  echo "$PARSE_FAILURE" >&2
  exit 1
fi

# no change -> write naught
if jq -e --slurpfile before "$SETTINGS_FILE" --slurpfile after "$FILE_TEMP" -n '$before[0] == $after[0]' > /dev/null; then
  rm -f "$FILE_TEMP"
  echo "👌 PermissionRequest decider already registered"
  echo "   └─ $SETTINGS_REL"
  exit 0
fi

# apply via rename in the same dir
mv "$FILE_TEMP" "$SETTINGS_FILE"
echo "✨ PermissionRequest decider registered"
echo "   └─ $SETTINGS_REL"
