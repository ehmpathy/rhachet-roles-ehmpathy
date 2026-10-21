#!/usr/bin/env bash
######################################################################
# .what = show the pre-approved commands, on demand: all of them, one
#         head's worth, or every option ranked for one command
#
# .why  = the session-start notice scrolls out of context; a blocked bot
#         must still be able to look up its paved options before it
#         paves a duplicate skill or interrupts the human with a retry
#
# usage:
#   permissions.get.sh                       # every pre-approved command, grouped by head
#   permissions.get.sh --head git            # one head: pre-approved + paved alternatives
#   permissions.get.sh --for 'ls src'        # one command: verdict + every candidate, ranked
#
# guarantee:
#   - reads the same allowlist union the check-permissions hook enforces
#     (the layer rule, permissions.layers.operations.sh: settings.of.repo.json
#     + the user layer on the split layout; the old layout adds the local and
#     project files)
#   - --for asks the hook itself (--mode LOOKUP), so the two never disagree
#   - read-only: never writes the nudge record or the ledger
#   - exit 0 = answered, 1 = malfunction, 2 = bad input
######################################################################
set -euo pipefail

# a write to a reader that has gone away must fail as an error, never kill the skill
# .why = SIGPIPE would end the shell with 141, which is none of the documented exit codes
trap '' PIPE

# the dir that holds a path
# .note = named arg `path=`; sets the global PARENT_DIR
as_parent_dir() {
  local path=""
  local "$@"
  # .note = ${x%/*} at zero forks, as the hook's own as_parent_dir; a bare name yields "."
  PARENT_DIR="${path%/*}"
  [[ "$PARENT_DIR" == "$path" ]] && PARENT_DIR="."
  return 0
}

# the hook and its inventory, beside this skill in the role dir
as_parent_dir path="${BASH_SOURCE[0]}"
SKILL_DIR="$PARENT_DIR"
HOOK_FILE="$SKILL_DIR/../inits/claude.hooks/pretooluse.check-permissions.sh"
INVENTORY_FILE="$SKILL_DIR/../inits/claude.hooks/commands.alternatives.jsonc"
RENDER_LIB="$SKILL_DIR/../inits/claude.hooks/_permissions.render.lib.sh"

# load the render + read operations the hook uses too (frame, tree, .claude walk, allowlist
# filter, marker key), so the lookup renders exactly what the gate renders
# .note = an absent lib is a malfunction: named on both streams, exit 1
# shellcheck source=../inits/claude.hooks/_permissions.render.lib.sh
source "$RENDER_LIB" 2>/dev/null || {
  render_lib_crash="💥 MalfunctionError: permissions.get could not load $RENDER_LIB — reinstall the mechanic role"
  printf '%s\n' "$render_lib_crash" || true
  printf '%s\n' "$render_lib_crash" >&2 || true
  exit 1
}

# load the layer rule the three permission hooks share, so the lookup reads the files they read
# .note = an absent lib is a malfunction: named on both streams, exit 1
LAYERS_LIB="$SKILL_DIR/../inits/claude.hooks/permissions.layers.operations.sh"
# shellcheck source=../inits/claude.hooks/permissions.layers.operations.sh
source "$LAYERS_LIB" 2>/dev/null || {
  print_to_both "💥 MalfunctionError: permissions.get could not load $LAYERS_LIB — reinstall the mechanic role"
  exit 1
}

# how many patterns one head shows in the grouped view before it folds
FOLD_AT=5

# the usage, for --help and bad input
print_usage() {
  echo "🐚 permissions.get — show the pre-approved commands, on demand"
  echo "   ├─ usage"
  echo "   │  ├─ rhx permissions.get                     every pre-approved command, grouped by head"
  echo "   │  ├─ rhx permissions.get --head <head>       one head: pre-approved + paved alternatives"
  echo "   │  └─ rhx permissions.get --for '<command>'   one command: verdict + every candidate, ranked"
  echo "   └─ example"
  echo "      └─ rhx permissions.get --for 'grep -rn reef src/'"
  return 0
}

# a bad input: named loud, on both streams, exit 2
# .note = named arg `reason=`
fail_constraint() {
  local reason=""
  local "$@"
  print_to_both "✋ ConstraintError: $reason" "" "$(print_usage)"
  exit 2
}

# parse flags
FOR=""
HEAD=""
HAS_FOR=0
HAS_HEAD=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --for)
      [[ $# -lt 2 ]] && fail_constraint reason="--for needs a command, e.g. --for 'ls src'"
      FOR="$2"
      HAS_FOR=1
      shift 2
      ;;
    --head)
      [[ $# -lt 2 ]] && fail_constraint reason="--head needs a command head, e.g. --head git"
      HEAD="$2"
      HAS_HEAD=1
      shift 2
      ;;
    --repo|--role|--skill)
      # rhachet passthrough args — ignore
      shift 2
      ;;
    --help|-h)
      print_framed "$(print_usage)"
      exit 0
      ;;
    --)
      shift
      ;;
    *)
      fail_constraint reason="unknown argument: $1"
      ;;
  esac
done

# one question at a time
[[ $HAS_FOR -eq 1 && -n "$HEAD" ]] && fail_constraint reason="pass --for or --head, not both"
[[ $HAS_FOR -eq 1 && -z "$FOR" ]] && fail_constraint reason="--for needs a command, e.g. --for 'ls src'"
[[ $HAS_HEAD -eq 1 && -z "$HEAD" ]] && fail_constraint reason="--head needs a command head, e.g. --head git"

# --for: ask the hook itself, so the answer is the one the hook would give
# .note = a hook absent beside the skill is a broken build or link, named with its remedy
if [[ $HAS_FOR -eq 1 && ! -f "$HOOK_FILE" ]]; then
  print_to_both "💥 MalfunctionError: check-permissions hook absent beside the skill (../inits/claude.hooks/pretooluse.check-permissions.sh) — the lookup cannot run; rebuild and relink the role"
  exit 1
fi

# the PreToolUse payload claude code would send for one Bash command
# .note = named arg `command=`; sets the global HOOK_PAYLOAD
as_hook_payload() {
  local command=""
  local "$@"
  HOOK_PAYLOAD=$(jq -nc --arg command "$command" '{tool_name: "Bash", tool_input: {command: $command}}')
  return 0
}

# the hook names its own malfunction on both streams; any nonzero exit from a LOOKUP is one,
# so the skill reports it under its own malfunction code (1), never as bad input (2)
if [[ $HAS_FOR -eq 1 ]]; then
  echo "🐢 heres the wave..."
  as_hook_payload command="$FOR"
  printf '%s' "$HOOK_PAYLOAD" | bash "$HOOK_FILE" --mode LOOKUP || exit 1
  exit 0
fi

# no .claude dir: no allowlist applies, and that is the answer
if ! CLAUDE_DIR=$(get_claude_dir); then
  echo "🐢 heres the wave..."
  print_framed "🐚 permissions.get" "   └─ no .claude/ dir found from $PWD upward — no allowlist applies here"
  exit 0
fi

# the Bash patterns of one settings file, one per line
# .note = named arg `file=`; an absent file yields none; an unparseable one is a malfunction
get_bash_patterns() {
  local file=""
  local "$@"
  [[ -f "$file" ]] || return 0
  jq -r "$BASH_PATTERNS_FILTER" "$file"
}

# how many lines a newline-joined list holds (an empty list holds none)
# .note = named arg `text=`; sets the global LINE_COUNT
get_line_count() {
  local text=""
  local "$@"
  LINE_COUNT=0
  [[ -n "$text" ]] && LINE_COUNT=$(printf '%s\n' "$text" | wc -l)
  return 0
}

# the allowlist union as the hook reads it: blank lines dropped, deduped, sorted
# .note = named arg `patterns_raw=` (newline-joined); sets the global array PATTERNS
set_pattern_union() {
  local patterns_raw=""
  local "$@"
  # LC_ALL=C pins byte order, so the list reads the same on every host's locale (as the hook's union)
  mapfile -t PATTERNS < <(printf '%s' "$patterns_raw" | sed '/^$/d' | LC_ALL=C sort -u)
  return 0
}

# each settings source: its patterns, and a `name (count)` line for the render
# .note = named arg `dir=` (the .claude dir); reads the files of the layer rule
#         (set_permissions_layer_files), the same files the hook reads, so the two never disagree
#         on either layout. a file in the repo's .claude dir reads as `.claude/<name>`, any other
#         by its full path. sets the globals SOURCE_LINES, ALL_PATTERNS (newline-joined), and
#         SETTINGS_MALFUNCTION. a broken file returns 1, never read as "no permissions"
set_settings_sources() {
  local dir=""
  local "$@"
  SOURCE_LINES=()
  ALL_PATTERNS=""
  SETTINGS_MALFUNCTION=""
  set_permissions_layer_files
  local file label patterns
  for file in "${PERMISSIONS_LAYER_FILES[@]}"; do
    [[ -f "$file" ]] || continue
    label="$file"
    [[ "$file" == "$dir/"* ]] && label=".claude/${file#"$dir/"}"
    if ! patterns=$(get_bash_patterns file="$file" 2>&1); then
      SETTINGS_MALFUNCTION="$label is not valid json (${patterns%%$'\n'*})"
      return 1
    fi
    get_line_count text="$patterns"
    SOURCE_LINES+=("$label ($((LINE_COUNT)))")
    [[ -n "$patterns" ]] && ALL_PATTERNS+="$patterns"$'\n'
  done
  return 0
}

# read each source; a broken file is named, never read as "no permissions"
if ! set_settings_sources dir="$CLAUDE_DIR"; then
  print_to_both "💥 MalfunctionError: $SETTINGS_MALFUNCTION — the allowlist could not be read; repair the json in .claude/"
  exit 1
fi

# the union, deduped and sorted, as the hook reads it
set_pattern_union patterns_raw="$ALL_PATTERNS"

# a pattern as the hook renders it: `cmd:*` is a prefix `[p] cmd`, all else exact `[e] cmd`
# .note = named arg `pattern=`; sets the global MARKED
as_marked_pattern() {
  local pattern=""
  local "$@"
  MARKED="[e] $pattern"
  [[ "$pattern" == *":*" ]] && MARKED="[p] ${pattern%:*}"
  return 0
}

# .note = as_pattern_command and as_pattern_head come from _permissions.render.lib.sh

# does a command belong to a head? its first word is the head (the whole command, or the head
# then a space)
# .note = named args `command=` and `head=`
is_command_for_head() {
  local command="" head=""
  local "$@"
  [[ "$command" == "$head" || "$command" == "$head "* ]]
}

# the patterns, grouped by head in sorted order, each group folded past FOLD_AT
# .note = reads the global array PATTERNS; sets the globals GROUP_ORDER (heads in order),
#         GROUP_COUNT (patterns per head), and GROUP_ITEMS (the first FOLD_AT marked patterns
#         per head, newline-led)
set_head_groups() {
  declare -gA GROUP_ITEMS=() GROUP_COUNT=()
  GROUP_ORDER=()
  local pattern head
  for pattern in "${PATTERNS[@]}"; do
    as_pattern_head pattern="$pattern"
    head="$PATTERN_HEAD"

    # first sight of a head opens its group
    if [[ -z "${GROUP_COUNT[$head]:-}" ]]; then
      GROUP_ORDER+=("$head")
      GROUP_COUNT[$head]=0
      GROUP_ITEMS[$head]=""
    fi

    # count every pattern; list only the first FOLD_AT
    GROUP_COUNT[$head]=$(( GROUP_COUNT[$head] + 1 ))
    [[ ${GROUP_COUNT[$head]} -gt $FOLD_AT ]] && continue
    as_marked_pattern pattern="$pattern"
    GROUP_ITEMS[$head]+=$'\n'"$MARKED"
  done
  return 0
}

# the `pre-approved for <head>` tree entry: the label, then each matched pattern, marked
# .note = named arg `head=`; reads the global array PATTERNS; sets the globals APPROVED_ENTRY
#         and APPROVED_FOUND (1 when the head has a pattern, else 0)
set_approved_entry_for_head() {
  local head=""
  local "$@"
  APPROVED_ENTRY="pre-approved for \`$head\`"
  APPROVED_FOUND=0
  local pattern
  for pattern in "${PATTERNS[@]}"; do
    as_pattern_command pattern="$pattern"
    is_command_for_head command="$PATTERN_COMMAND" head="$head" || continue
    as_marked_pattern pattern="$pattern"
    APPROVED_ENTRY+=$'\n'"$MARKED"
    APPROVED_FOUND=1
  done
  [[ $APPROVED_FOUND -eq 0 ]] && APPROVED_ENTRY+=$'\n'"(none — \`$head\` is not on the allowlist)"
  return 0
}

# the `sources` tree entry: each settings file read, with its pattern count
# .note = reads the global array SOURCE_LINES; sets the global SOURCES_ENTRY
as_sources_entry() {
  SOURCES_ENTRY="sources"
  local line
  for line in "${SOURCE_LINES[@]}"; do SOURCES_ENTRY+=$'\n'"$line"; done
  [[ ${#SOURCE_LINES[@]} -eq 0 ]] && SOURCES_ENTRY+=$'\n'"(no settings file in .claude/)"
  return 0
}

# one head's tree entry: `head (count)`, its first FOLD_AT patterns, then a fold line if longer
# .note = named arg `head=`; reads GROUP_COUNT and GROUP_ITEMS; sets the global GROUP_ENTRY
as_head_group_entry() {
  local head=""
  local "$@"
  GROUP_ENTRY="$head (${GROUP_COUNT[$head]})${GROUP_ITEMS[$head]}"
  local folded=$(( GROUP_COUNT[$head] - FOLD_AT ))
  [[ $folded -gt 0 ]] && GROUP_ENTRY+=$'\n'"… $folded more: rhx permissions.get --head $head"
  return 0
}

# the `--head` view's tree entries: pre-approved, paved alternatives, advice, then the key
# .note = named arg `head=`; reads APPROVED_ENTRY, APPROVED_FOUND, and the INVENTORY_* globals;
#         sets the global array ENTRIES
set_head_view_entries() {
  local head=""
  local "$@"
  local alternatives="paved alternatives for \`$head\`"$'\n'"$INVENTORY_ALTERNATIVES"
  [[ $INVENTORY_ALT_COUNT -eq 0 ]] && alternatives="paved alternatives for \`$head\`"$'\n'"(none in the inventory)"
  ENTRIES=("$APPROVED_ENTRY" "$alternatives")
  [[ -n "$INVENTORY_ADVICE" ]] && ENTRIES+=("advice: $INVENTORY_ADVICE")
  [[ $APPROVED_FOUND -eq 1 ]] && ENTRIES+=("" "$MARKER_KEY")
  return 0
}

# the bare view's tree entries: sources, the total, one entry per head, then the key
# .note = reads SOURCES_ENTRY, PATTERNS, GROUP_ORDER, and the GROUP_* maps; sets the global
#         array ENTRIES
set_bare_view_entries() {
  ENTRIES=("$SOURCES_ENTRY" "total: ${#PATTERNS[@]} pre-approved (dupes removed)")
  local head
  for head in "${GROUP_ORDER[@]}"; do
    as_head_group_entry head="$head"
    ENTRIES+=("" "$GROUP_ENTRY")
  done
  [[ ${#PATTERNS[@]} -gt 0 ]] && ENTRIES+=("" "$MARKER_KEY")
  return 0
}

# the inventory entry for one head: its paved alternatives and its advice
# .what = strips the jsonc whole-line comments, selects the head's entry, and splits each
#         `<kind>\x1f<text>` row the jq program emits into alternatives or advice
# .note = named arg `head=`; sets the globals INVENTORY_ALTERNATIVES (one per line),
#         INVENTORY_ALT_COUNT, and INVENTORY_ADVICE (the list ends on its last item, no newline after). an absent or unparseable inventory sets
#         INVENTORY_MALFUNCTION and returns 1 — never read as "(none in the inventory)"
set_inventory_for_head() {
  local head=""
  local "$@"
  INVENTORY_ALTERNATIVES="" INVENTORY_ALT_COUNT=0 INVENTORY_ADVICE="" INVENTORY_MALFUNCTION=""

  # the file must exist
  if [[ ! -f "$INVENTORY_FILE" ]]; then
    INVENTORY_MALFUNCTION="inventory file absent: commands.alternatives.jsonc (beside the check-permissions hook) — paved alternatives cannot be listed; rebuild the role"
    return 1
  fi

  # the head's rows, as `<kind>\x1f<text>`
  local rows
  if ! rows=$(
    sed 's|^[[:space:]]*//.*$||' "$INVENTORY_FILE" \
      | jq -r --arg head "$head" '.entries[] | select(.heads | index($head)) |
               ((.alternatives // [])[] | "alt\u001f" + .), (select(.advice) | "advice\u001f" + .advice)' 2>&1
  ); then
    INVENTORY_MALFUNCTION="inventory file unparseable: commands.alternatives.jsonc (${rows%%$'\n'*}) — paved alternatives cannot be listed; repair the file beside the hook, then rebuild the role"
    return 1
  fi

  # split each row into an alternative or the advice
  # the alternatives are newline-joined; a newline only ever sits between two of them
  local kind text newline=$'\n'
  while IFS=$'\x1f' read -r kind text; do
    [[ -z "$kind" ]] && continue
    [[ "$kind" == "alt" ]] && INVENTORY_ALTERNATIVES+="${INVENTORY_ALTERNATIVES:+$newline}$text" && INVENTORY_ALT_COUNT=$(( INVENTORY_ALT_COUNT + 1 ))
    [[ "$kind" == "advice" ]] && INVENTORY_ADVICE="$text"
  done <<< "$rows"
  return 0
}

# the tree's lines; render_tree_entries (from the render lib) draws onto it
OUT=()

# --head: one head's pre-approved patterns, plus the hook's paved alternatives for it
if [[ -n "$HEAD" ]]; then
  # the patterns whose command is the head, or starts with the head and a space
  set_approved_entry_for_head head="$HEAD"

  # the inventory entry for the head (alternatives, or advice for a head with no command answer)
  # .note = an absent or unparseable inventory is a malfunction, never "(none in the inventory)":
  #         that false claim would send the bot to pave a duplicate skill
  if ! set_inventory_for_head head="$HEAD"; then
    print_to_both "💥 MalfunctionError: $INVENTORY_MALFUNCTION"
    exit 1
  fi
  set_head_view_entries head="$HEAD"
  OUT+=("🐚 permissions.get --head $HEAD")
  render_tree_entries "${ENTRIES[@]}"
  OUT+=("")
  OUT+=("🥥 did you know?")
  OUT+=("   └─ check one exact command: rhx permissions.get --for '<command>'")
  echo "🐢 heres the wave..."
  print_framed "${OUT[@]}"
  exit 0
fi

# bare: every pre-approved command, grouped by head (the first word), long groups folded
set_head_groups

# sources, then the total, then one entry per head
as_sources_entry
set_bare_view_entries

OUT+=("🐚 permissions.get")
render_tree_entries "${ENTRIES[@]}"
OUT+=("")
OUT+=("🥥 did you know?")
OUT+=("   ├─ narrow to one head: rhx permissions.get --head <head>")
OUT+=("   └─ check one exact command: rhx permissions.get --for '<command>'")
echo "🐢 heres the wave..."
print_framed "${OUT[@]}"
exit 0
