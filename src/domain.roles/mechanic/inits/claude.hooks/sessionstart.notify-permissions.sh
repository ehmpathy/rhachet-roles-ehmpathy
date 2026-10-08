#!/usr/bin/env bash
######################################################################
# .what = SessionStart hook to notify Claude of allowed permissions
#
# .why  = proactively informing Claude of pre-approved Bash commands
#         at session start reduces interruptions from permission
#         prompts by guiding it to use allowed patterns upfront.
#
#         this complements the PreToolUse hook which blocks/nudges
#         when Claude attempts unapproved commands, by providing
#         the information before any attempts are made.
#
# .how  = reads .claude/settings.json + settings.local.json (unioned, as
#         the check-permissions hook does), and outputs the heads that are
#         pre-approved with a count each, plus where to see every command
#         on demand (`rhx permissions.get`) — the full list scrolls out of
#         context, the lookup does not.
#
# usage:
#   configure in .claude/settings.json under hooks.SessionStart
#
# guarantee:
#   ✔ non-blocking: always exits 0
#   ✔ informational only: no side effects
#   ✔ graceful fallback: exits silently if no settings found
######################################################################

set -euo pipefail

# load the permission surfaces' shared ops: the `.claude` walk and the allowlist filter, so the
# notice counts exactly what the gate allows
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

CLAUDE_DIR=$(get_claude_dir) || {
  # no .claude dir, exit silently
  exit 0
}

# the Bash patterns of settings.json + settings.local.json, as the check-permissions hook
# reads them: "Bash(npm run test:*)" -> "npm run test:*"
# .note = named arg `dir=` (the .claude dir); sets the globals ALL_PATTERNS (newline-joined,
#         both files) and SETTINGS_MALFUNCTION. a file jq cannot parse is named, never dropped
#         in silence: the gate blocks every command it would have allowed, and the bot must
#         know why. each broken file is appended, so a second never erases the first
set_settings_patterns() {
  local dir=""
  local "$@"
  SETTINGS_MALFUNCTION=""
  ALL_PATTERNS=""
  local name patterns
  for name in settings.json settings.local.json; do
    [[ -f "$dir/$name" ]] || continue
    if ! patterns=$(jq -r "$BASH_PATTERNS_FILTER" "$dir/$name" 2>&1); then
      SETTINGS_MALFUNCTION+="${SETTINGS_MALFUNCTION:+; }.claude/$name is not valid json (${patterns%%$'\n'*})"
      continue
    fi
    [[ -n "$patterns" ]] && ALL_PATTERNS+="$patterns"$'\n'
  done
  return 0
}

# the allowlist union as the hook reads it: blank lines dropped, deduped, sorted
# .note = named arg `patterns_raw=` (newline-joined); sets the global array ALLOWED_PATTERNS
set_pattern_union() {
  local patterns_raw=""
  local "$@"
  mapfile -t ALLOWED_PATTERNS < <(printf '%s' "$patterns_raw" | sed '/^$/d' | sort -u)
  return 0
}

set_settings_patterns dir="$CLAUDE_DIR"
set_pattern_union patterns_raw="$ALL_PATTERNS"

# no Bash permissions found and none lost to a broken file, exit silently
if [[ ${#ALLOWED_PATTERNS[@]} -eq 0 && -z "$SETTINGS_MALFUNCTION" ]]; then
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
echo ""
echo "🐢 shell yeah, your guardrails are set 🌊"
echo ""
echo "🐚 pre-approved bash permissions"
# a malfunction reaches stderr too (rule.require.skill-output-streams), apart from the tree
if [[ -n "$SETTINGS_MALFUNCTION" ]]; then
  echo "   ├─ 💥 MalfunctionError: $SETTINGS_MALFUNCTION — its commands are not pre-approved until it is repaired; repair the json in .claude/"
  echo "💥 MalfunctionError: $SETTINGS_MALFUNCTION — its commands are not pre-approved until it is repaired; repair the json in .claude/" >&2
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
echo "         jq . .claude/permission.decisions.local.log"
echo ""

exit 0
