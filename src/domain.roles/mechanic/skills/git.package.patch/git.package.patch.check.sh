#!/usr/bin/env bash
######################################################################
# .what = check each local patch against the installed tree, and name
#         the repair for each one that no longer applies
#
# .why  = an upgrade past a patched version leaves the patch stale: pnpm
#         skips it (allowUnusedPatches) or warns on it (ignorePatchFailures),
#         so the install lands and the fork quietly drops. check is how the
#         stale patch surfaces, with the command that repairs it
#
# usage:
#   rhx git.package.patch check                       # exit 2 if any patch needs repair
#   rhx git.package.patch check --when hook.onStop    # a nudge; never blocks the stop
#
# guarantee:
#   - reads only; trial-applies each patch via git apply --check, writes naught
#   - names each patch that is not applied, its reason, and its repair commands
#   - names an absent upgrade-safe config as a repair too
#   - plain: exit 0 = all applied, 2 = a repair is owed, 1 = malfunction
#   - --when hook.onStop: silent when naught is owed; a nudge on stdout when
#     aught is; always exit 0, so it never blocks a stop
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SKILL_DIR/git.package.patch.operations.sh"
source "$SKILL_DIR/output.sh"

ROOT_LABEL="git.package.patch check"

######################################################################
# show usage
######################################################################
show_usage() {
  print_turtle_header "heres the wave..."
  print_tree_start "$ROOT_LABEL"
  print_tree_branch "usage"
  print_tree_child "rhx git.package.patch check [--when hook.onStop]" false true
  print_tree_branch "flags"
  print_tree_child "--when   (optional) hook.onStop: nudge only, always exit 0, silent when naught is owed" false true
  print_tree_branch "examples" true
  print_tree_child "rhx git.package.patch check" true false
  print_tree_child "rhx git.package.patch check --when hook.onStop" true true
}

######################################################################
# gate 1: flags
######################################################################
WHEN=""
FLAG_UNKNOWN=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --skill|--repo|--role)
      shift $(( $# > 1 ? 2 : 1 ))
      ;;
    --when)
      WHEN="${2:-}"
      shift $(( $# > 1 ? 2 : 1 ))
      ;;
    --help|-h)
      show_usage
      exit 0
      ;;
    *)
      [[ -n "$FLAG_UNKNOWN" ]] || FLAG_UNKNOWN="$1"
      shift
      ;;
  esac
done

# the hook never blocks a stop: any exit it would take turns into exit 0
IS_HOOK="false"
[[ "$WHEN" == "hook.onStop" ]] && IS_HOOK="true"
if [[ "$IS_HOOK" == "true" ]]; then
  trap 'exit 0' EXIT
else
  trap 'on_exit_render_crash "$ROOT_LABEL"' EXIT
fi

[[ -z "$FLAG_UNKNOWN" ]] || refuse_constraint "$ROOT_LABEL" "unknown flag $FLAG_UNKNOWN" \
  "check takes only --when hook.onStop"$'\n'"rhx git.package.patch check"
[[ -z "$WHEN" || "$IS_HOOK" == "true" ]] || refuse_constraint "$ROOT_LABEL" \
  "--when must be hook.onStop" "omit --when to check by hand"$'\n'"rhx git.package.patch check" \
  "given: $WHEN"

######################################################################
# gate 2: repo shape
# .note = the hook runs in every repo: one with no patch costs a few file tests
######################################################################
REPO_ROOT=$(get_repo_root 2>&1) || {
  [[ "$IS_HOOK" == "true" ]] && exit 0
  refuse_malfunction "$ROOT_LABEL" "git could not read the repo root" "$REPO_ROOT"
}
if [[ -z "$REPO_ROOT" ]]; then
  [[ "$IS_HOOK" == "true" ]] && exit 0
  refuse_constraint "$ROOT_LABEL" "not inside a git repo" \
    "run from inside the repo whose patches you check"
fi
if ! has_any_patch_trace "$REPO_ROOT"; then
  [[ "$IS_HOOK" == "true" ]] && exit 0
  print_turtle_header "crickets..."
  print_tree_start "$ROOT_LABEL"
  print_tree_leaf "patches" "none" true
  exit 0
fi

######################################################################
# check every patch
######################################################################
ROWS=$(get_all_patch_rows "$REPO_ROOT" 2>&1) || {
  [[ "$IS_HOOK" == "true" ]] && { echo "💥 MalfunctionError: $ROOT_LABEL could not read the patch entries; run rhx git.package.patch check"; exit 0; }
  refuse_malfunction "$ROOT_LABEL" "the patch entries could not be read" "$ROWS"
}

# one row per patch, held in parallel lists; a stale row carries its reason and repair
ROW_SPECS=()
ROW_STATES=()
ROW_REASONS=()
ROW_REPAIRS=()
STALE_COUNT=0
while IFS=$'\t' read -r SPEC PATCH_REL MANIFEST; do
  [[ -n "$SPEC" ]] || continue
  STATE_ROW=$(get_patch_state --root "$REPO_ROOT" --spec "$SPEC" --patch "$PATCH_REL" --manifest "$MANIFEST" 2>&1) || {
    [[ "$IS_HOOK" == "true" ]] && { echo "💥 MalfunctionError: $ROOT_LABEL could not read the state of $SPEC; run rhx git.package.patch check"; exit 0; }
    refuse_malfunction "$ROOT_LABEL" "the state of $SPEC could not be read" "$STATE_ROW"
  }
  IFS=$'\t' read -r STATE TARGET REASON <<<"$STATE_ROW"
  ROW_SPECS+=("$SPEC")
  ROW_STATES+=("$STATE")
  ROW_REASONS+=("$REASON")
  ROW_REPAIRS+=("$(as_patch_repair --state "$STATE" --spec "$SPEC" --target "$TARGET")")
  if is_patch_state_stale "$STATE"; then STALE_COUNT=$((STALE_COUNT + 1)); fi
done <<<"$ROWS"

TOLERANCE="absent"
is_patch_failure_tolerated "$REPO_ROOT" && TOLERANCE="set"
[[ "$TOLERANCE" == "set" ]] || STALE_COUNT=$((STALE_COUNT + 1))

######################################################################
# render the tree; the upgrade-safe line closes it
######################################################################
render_check_tree() {
  local index
  for index in "${!ROW_SPECS[@]}"; do
    if ! is_patch_state_stale "${ROW_STATES[$index]}"; then
      print_tree_leaf "${ROW_SPECS[$index]}" "${ROW_STATES[$index]}"
      continue
    fi
    print_tree_branch "${ROW_SPECS[$index]}: ${ROW_STATES[$index]}"
    print_tree_child "reason: ${ROW_REASONS[$index]}"
    print_tree_child "repair" false true
    local repair_lines=() each_index=0 each glyph
    mapfile -t repair_lines <<<"${ROW_REPAIRS[$index]}"
    for each in "${repair_lines[@]}"; do
      each_index=$((each_index + 1))
      glyph="├─"
      [[ $each_index -eq ${#repair_lines[@]} ]] && glyph="└─"
      echo "   │     $glyph $each"
    done
  done
  if [[ "$TOLERANCE" == "set" ]]; then
    print_tree_leaf "upgrade-safe" "$(as_tolerance_text "$TOLERANCE")" true
    return 0
  fi
  print_tree_branch "upgrade-safe: $(as_tolerance_text "$TOLERANCE")" true
  print_tree_child "repair: add $(as_tolerance_keys_text) to $SETTINGS_MANIFEST_REL" true true
}

# naught owed: the hook stays silent; by hand, a clean verdict
if [[ $STALE_COUNT -eq 0 ]]; then
  [[ "$IS_HOOK" == "true" ]] && exit 0
  print_turtle_header "righteous!"
  print_tree_start "$ROOT_LABEL"
  render_check_tree
  exit 0
fi

# a repair is owed: the hook nudges on stdout and lets the stop through
if [[ "$IS_HOOK" == "true" ]]; then
  print_turtle_header "heads up, a local patch needs repair"
  print_tree_start "$ROOT_LABEL"
  render_check_tree
  exit 0
fi

# by hand: a constraint, on both streams
BLOCK=$(
  print_turtle_header "bummer dude..."
  print_tree_start "$ROOT_LABEL"
  echo "   ├─ ✋ ConstraintError: $STALE_COUNT repair(s) owed; a stale patch no longer applies"
  render_check_tree
)
REFUSAL_RENDERED="true"
emit_to_both_streams "$BLOCK"
exit 2
