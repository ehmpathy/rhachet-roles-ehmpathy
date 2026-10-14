#!/usr/bin/env bash
######################################################################
# .what = SessionStart hook to notify Claude of allowed permissions
#
# .why  = to name the pre-approved Bash commands at session start cuts
#         permission prompts: claude reaches for allowed patterns first.
#
#         this complements the PreToolUse hook, which blocks/nudges when
#         claude attempts an unapproved command; this hook names the paved
#         set before any attempt.
#
# .how  = reads the union of Bash allows across every layer claude
#         loads (permissions.layers.operations.sh) — the same set the
#         PreToolUse hook checks — and outputs the heads that are
#         pre-approved with a count each, plus where to see every command
#         on demand (`rhx permissions.get`) — the full list scrolls out of
#         context, the lookup does not.
#
# usage:
#   configure in .claude/settings.json under hooks.SessionStart
#
# guarantee:
#   ✔ never halts the session: always exits 0
#   ✔ informational only: no side effects
#   ✔ graceful fallback: exits silently if no config dir is found
#   ✔ an empty allowlist is named, with each file sought, never silent
######################################################################

set -euo pipefail

# load the permission surfaces' shared ops: the render helpers (pattern heads) and the layer
# rule (which settings files claude loads), so the notice counts exactly what the gate allows
# .note = a notice never fails the session: an absent lib is named on both streams, exit 0
HOOK_DIR="${BASH_SOURCE[0]%/*}"
[[ "$HOOK_DIR" == "${BASH_SOURCE[0]}" ]] && HOOK_DIR="."
# shellcheck source=_permissions.render.lib.sh
source "$HOOK_DIR/_permissions.render.lib.sh" 2>/dev/null || {
  render_lib_crash="💥 MalfunctionError: ${0##*/} could not load $HOOK_DIR/_permissions.render.lib.sh; the permission notice is skipped — reinstall the mechanic role"
  printf '%s\n' "$render_lib_crash" || true
  printf '%s\n' "$render_lib_crash" >&2 || true
  exit 0
}
# shellcheck source=permissions.layers.operations.sh
source "$HOOK_DIR/permissions.layers.operations.sh" 2>/dev/null || {
  layers_lib_crash="💥 MalfunctionError: ${0##*/} could not load $HOOK_DIR/permissions.layers.operations.sh; the permission notice is skipped — ask your human to run rhx init at the repo root, in their own shell, then restart the session"
  printf '%s\n' "$layers_lib_crash" || true
  printf '%s\n' "$layers_lib_crash" >&2 || true
  exit 0
}

# union the Bash allows across every layer
# patterns look like: "Bash(npm run test:*)" -> "npm run test:*"
set_permissions_layers allow

# the dirs, as the layer read found them; with neither a config dir nor a walk-up dir, exit silently
WALKUP_DIR="$PERMISSIONS_WALKUP_DIR"
CONFIG_DIR="$PERMISSIONS_CONFIG_DIR"
[[ -z "$CONFIG_DIR" ]] && exit 0

# the allowlist union as the gate reads it: deduped, in byte order (the layer read sorts it)
ALLOWED_PATTERNS=("${PERMISSIONS_LAYER_PATTERNS[@]}")

# each layer file jq could not parse, named with its cause, never dropped in silence: the gate
# blocks every command it would have allowed, and the bot must know why
# .note = sets the global SETTINGS_MALFUNCTION (empty when every layer parses)
set_settings_malfunction() {
  SETTINGS_MALFUNCTION=""
  local i
  for i in "${!PERMISSIONS_LAYER_FAULT_FILES[@]}"; do
    as_permissions_display_path "${PERMISSIONS_LAYER_FAULT_FILES[i]}"
    SETTINGS_MALFUNCTION+="${SETTINGS_MALFUNCTION:+; }$PERMISSIONS_DISPLAY_PATH is not valid json (${PERMISSIONS_LAYER_FAULT_CAUSES[i]%%$'\n'*})"
  done
  return 0
}
set_settings_malfunction

# on the split layout, an absent actor file leaves only the other layers' allows
ACTOR_FILE_ABSENT="$PERMISSIONS_ACTOR_FILE_ABSENT"

######################################################################
# .what = print each line as a nested tree leaf; the last leaf closes with └─
# .why  = the sought-file list reads as one branch under "the hook looked in:"
# .args = $@ = each line to render as a leaf, in order
######################################################################
emit_nested_leaves() {
  local count=$#
  local index=0
  local line
  for line in "$@"; do
    index=$((index + 1))
    local glyph="├─"
    [[ $index -eq $count ]] && glyph="└─"
    echo "   │  $glyph $line"
  done
}

# no allows anywhere: say so, and name each file sought, so the clone can tell
# "no list" from "no hook"
if [[ ${#ALLOWED_PATTERNS[@]} -eq 0 ]]; then
  echo ""
  echo "🐢 bummer dude, no guardrails found 🌊"
  echo ""
  echo "🐚 no pre-approved bash permissions were found"
  echo "   │"
  [[ -n "$SETTINGS_MALFUNCTION" ]] && echo "   ├─ 💥 MalfunctionError: $SETTINGS_MALFUNCTION — repair the json in each file named"
  echo "   ├─ the hook looked in:"
  emit_nested_leaves "${PERMISSIONS_LAYER_STATES[@]}"
  echo "   │"
  echo "   ├─ if this clone should have pre-approved permissions,"
  echo "   │  check that these files exist and hold valid json."
  echo "   └─ fix: $PERMISSIONS_FIX_HINT, then restart the session."
  echo ""
  [[ -n "$SETTINGS_MALFUNCTION" ]] && echo "💥 MalfunctionError: $SETTINGS_MALFUNCTION — repair the json in each file named" >&2
  exit 0
fi

# the heads (first word of each pattern's command), with a count each, in sorted order
# .why = the full list is long and scrolls out of context; the heads say what is paved at a
#        glance, and `rhx permissions.get` shows the rest on demand
# .note = reads the global array ALLOWED_PATTERNS; sets the globals HEAD_ORDER (heads in
#         order) and HEAD_COUNT (patterns per head)
set_head_counts() {
  declare -gA HEAD_COUNT=()
  HEAD_ORDER=()
  local pattern head
  for pattern in "${ALLOWED_PATTERNS[@]}"; do
    as_pattern_head pattern="$pattern"
    head="$PATTERN_HEAD"

    # first sight of a head opens its count
    if [[ -z "${HEAD_COUNT[$head]:-}" ]]; then
      HEAD_ORDER+=("$head")
      HEAD_COUNT[$head]=0
    fi
    HEAD_COUNT[$head]=$(( HEAD_COUNT[$head] + 1 ))
  done
  return 0
}

# the heads list, one `head (count)` per line, as tree items under a `heads` branch
# .note = reads HEAD_ORDER and HEAD_COUNT; prints no branch when no head is pre-approved
print_head_list() {
  [[ ${#HEAD_ORDER[@]} -gt 0 ]] || return 0
  echo "   ├─ heads"
  local i head branch last_index=$(( ${#HEAD_ORDER[@]} - 1 ))
  for i in "${!HEAD_ORDER[@]}"; do
    head="${HEAD_ORDER[i]}"
    branch="├─"
    [[ $i -eq $last_index ]] && branch="└─"
    echo "   │  $branch $head (${HEAD_COUNT[$head]})"
  done
  return 0
}

# the summary line: how many commands are pre-approved, across how many heads, each noun
# singular or plural to match its count
# .note = reads ALLOWED_PATTERNS and HEAD_ORDER; sets the global SUMMARY_LINE
as_preapproved_summary() {
  local commands=${#ALLOWED_PATTERNS[@]} heads=${#HEAD_ORDER[@]}
  local command_noun="commands" head_noun="heads"
  [[ $commands -eq 1 ]] && command_noun="command"
  [[ $heads -eq 1 ]] && head_noun="head"
  SUMMARY_LINE="$commands $command_noun pre-approved, across $heads $head_noun — no permission prompt for any of them"
  return 0
}

set_head_counts
as_preapproved_summary

# the pre-approved summary: counts, heads, then where to see the rest
# .note = a corrupt layer or an absent actor file means the list is partial, so no cheer
LIST_PARTIAL=false
[[ -n "$SETTINGS_MALFUNCTION" || "$ACTOR_FILE_ABSENT" == true ]] && LIST_PARTIAL=true
echo ""
[[ "$LIST_PARTIAL" == true ]] && echo "🐢 heads up dude, your guardrails are set, but only in part 🌊"
[[ "$LIST_PARTIAL" == false ]] && echo "🐢 shell yeah, your guardrails are set 🌊"
echo ""
if [[ "$ACTOR_FILE_ABSENT" == true ]]; then
  echo "🐚 note: $CONFIG_DIR/settings.of.repo.json is absent"
  echo "   ├─ though this repo's layout keeps its allows there, so this list lacks them"
  echo "   └─ fix: $PERMISSIONS_FIX_HINT, then restart the session."
  echo ""
fi
echo "🐚 pre-approved bash permissions"
# a malfunction reaches stderr too (rule.require.skill-output-streams), apart from the tree
if [[ -n "$SETTINGS_MALFUNCTION" ]]; then
  echo "   ├─ 💥 MalfunctionError: $SETTINGS_MALFUNCTION — its commands are not pre-approved until it is repaired; repair the json in each file named"
  echo "💥 MalfunctionError: $SETTINGS_MALFUNCTION — its commands are not pre-approved until it is repaired; repair the json in each file named" >&2
fi
echo "   ├─ $SUMMARY_LINE"
print_head_list
echo "   ├─ see them all, on demand"
echo "   │  ├─ rhx permissions.get                     every pre-approved command, grouped by head"
echo "   │  ├─ rhx permissions.get --head <head>       one head: pre-approved + paved alternatives"
echo "   │  └─ rhx permissions.get --for '<command>'   one command: verdict + every candidate, ranked"
echo "   │"
echo "   └─ a bash command NOT pre-approved blocks and asks you to reconsider — check first, to minimize interruptions"
echo ""
echo "🐚 auto-decided permission prompts (PermissionRequest hook)"
echo "   │"
echo "   │  suspicious-classified prompts are auto-decided in-hook, per-segment:"
echo "   │"
echo "   ├─ a single clean-rhx-or-allowlisted call, not deny-listed -> auto-approved"
echo "   ├─ an all-safe-segments compound (| && || ;), no segment"
echo "   │  deny-listed: each producer is clean-rhx-or-allowlisted,"
echo "   │  each pipe sink is clean-rhx or a read-only reader"
echo "   │  (jq/tail/head/wc/cat)                                   -> auto-approved"
echo "   ├─ a background (&) or newline-joined command              -> auto-denied"
echo "   ├─ an unquoted chain with an un-vetted segment             -> auto-denied"
echo "   ├─ a deny-listed segment (piped/standalone)                -> lifted"
echo "   ├─ a deny-listed segment (chained)                         -> auto-denied"
echo "   └─ an otherwise-unprovable segment                         -> lifted to the human"
echo ""
echo "🐚 every auto allow/deny is recorded to a G3 audit trail"
echo "   └─ to review why a command was auto-decided (verdict + reason + command):"
# the audit log lives in the config dir; name it in full when it is not the walk-up dir
AUDIT_LOG_PATH=".claude/permission.decisions.local.log"
[[ "$CONFIG_DIR" != "$WALKUP_DIR" ]] && AUDIT_LOG_PATH="$CONFIG_DIR/permission.decisions.local.log"
echo "         jq . $AUDIT_LOG_PATH"
echo ""

exit 0
