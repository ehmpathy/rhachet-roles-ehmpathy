#!/usr/bin/env bash
######################################################################
# .what = abort a cutover: undo the whole of it
#
# .why  = a cutover is atomic in intent. abort returns HEAD to the
#         source at its original sha, restores the tracked edits with
#         their stage split, and removes the branch this cutover made
#
# usage:
#   rhx git.branch.cutover abort
#
# guarantee:
#   - refuses when no cutover is in flight (inv-8)
#   - untracked files are never written, moved, or deleted
#   - the only branch it deletes is the one this cutover made, unpushed
#   - spends no git.branch.uses unit
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SKILL_DIR/git.branch.cutover.operations.sh"

######################################################################
# parse arguments
######################################################################
while [[ $# -gt 0 ]]; do
  case $1 in
    --skill|--repo|--role)
      # rhachet passthrough args with a value - ignore flag + value
      shift
      if [[ $# -gt 0 && "$1" != --* ]]; then
        shift
      fi
      ;;
    --help|-h)
      echo "usage: git.branch.cutover abort"
      echo ""
      echo "undo the whole cutover: back to the source branch, edits restored,"
      echo "the new branch removed"
      echo ""
      echo "example:"
      echo "  rhx git.branch.cutover abort"
      exit 0
      ;;
    *)
      emit_cutover_refusal "unknown argument: $1" "└─ usage: rhx git.branch.cutover abort"
      ;;
  esac
done

######################################################################
# guards
######################################################################
if ! is_in_git_repo; then
  emit_cutover_refusal "not in a git repository" "└─ fix: run it from inside the repo whose cutover you undo"
fi
cd "$(git rev-parse --show-toplevel)"

# one live cutover verb per worktree: no peer may act on the state mid-undo (inv-6)
guard_cutover_lock

# a cutover must be in flight (inv-8)
if ! is_cutover_in_flight; then
  emit_no_cutover_refusal abort
fi
guard_state_schema

# HEAD must sit where this cutover left it, on a branch never pushed and
# with no commit the cutover did not record: abort resets and deletes
guard_head_at_cutover_position verb=abort

INTO=$(get_state '.into')
SOURCE_NAME=$(get_state '.source_name')
SOURCE_SHA=$(get_state '.source_sha')
BASE_KIND=$(get_state '.base_kind')
PHASE=$(get_state '.phase')
TRACKED_COUNT=$(get_state '.tracked | length')
PARKED=false
if is_park_expected; then
  PARKED=true
fi

# the state expects a park that git lacks: stop before any reset, or the
# reset would destroy what may be the last copy of the edits
if [[ "$PARKED" == "true" ]] && ! has_park; then
  emit_cutover_malfunction "the park of tracked edits is absent; abort stops before any reset" "$(printf '%s\n' \
    "expected: $(get_park_ref), for $TRACKED_COUNT tracked edit(s)" \
    "fix: recover what you can by hand (git status, git reflog), then remove $(get_cutover_dir)" | as_tree_children)"
fi

# the switch back and the restore must not land on a file made since the
# cutover began (inv-0)
guard_untracked_safe verb=abort

# from here on the undo mutates: any unexpected failure renders as a
# malfunction that keeps the state, so a rerun can finish the undo
set_cutover_unexpected_trap "fix: read the step, clear its cause, then rerun rhx git.branch.cutover abort"

# mark the abort begun before its first write: a rerun after a kill reads
# the mark, accepts HEAD on the source, and skips each step already done
set_state_via_jq '.aborting = true'

######################################################################
# undo: back to the source, then lay the park back down
#
# .note = in phase "claim" no reset has run yet, so the worktree still
#         holds the edits; the undo is only to drop the refs
# .note = under @tree no file ever moved and no park exists: the edits
#         live only in the worktree, so a reset would destroy them. the
#         switch back alone suffices — both branches sit at one commit
######################################################################
if [[ "$PHASE" != "claim" ]]; then
  del_pick_marks

  # the reset clears the new branch's tree, and only while HEAD is on it:
  # once back on the source, a reset would erase the edits the park laid back
  if [[ "$BASE_KIND" != "@tree" && "$(get_head_branch || true)" == "$INTO" ]]; then
    del_worktree_tracked_edits
  fi

  # back on the source, by name when it had one, unless a prior run got there
  if ! is_head_at_source "$SOURCE_NAME" "$SOURCE_SHA" "$(get_head_branch || true)"; then
    if [[ -n "$SOURCE_NAME" ]]; then
      set_head_branch "$SOURCE_NAME"
    fi
    if [[ -z "$SOURCE_NAME" ]]; then
      set_head_detached "$SOURCE_SHA"
    fi
  fi

  # the tracked edits come back, with their stage split, unless a prior run
  # already laid them back
  if [[ "$PARKED" == "true" ]] && ! is_worktree_held_by_park; then
    restore_park
  fi

  # remove the branch this cutover made; it was never pushed
  del_local_branch "$INTO"
fi

# state first, park after: a kill between the two leaves orphan refs, never
# a state that sends a rerun of abort to reset the edits it just restored
del_state_then_park

######################################################################
# report
######################################################################
SECTIONS=()
BACK_ON_NOTE="(untouched)"
if [[ "$(get_head_sha)" != "$SOURCE_SHA" ]]; then
  BACK_ON_NOTE="(moved since the cutover began: now @ $(get_short_sha "$(get_head_sha)"))"
fi
SECTIONS+=("back on: $(get_source_label "$SOURCE_NAME" "$SOURCE_SHA" "") $BACK_ON_NOTE")
if [[ "$TRACKED_COUNT" -gt 0 && "$PARKED" == "true" ]]; then
  SECTIONS+=("tracked edits ($TRACKED_COUNT) ✓ restored from park")
fi
SECTIONS+=("untracked: untouched throughout")
if [[ "$PHASE" != "claim" ]]; then
  SECTIONS+=("removed: $INTO (made by this cutover, never pushed)")
fi
# begin spends its unit once the switch lands, as it enters phase "picks";
# an undo from before that point owes the meter naught
if [[ "$PHASE" == "picks" || "$PHASE" == "carry" ]]; then
  SECTIONS+=("quota: the cutover unit stays spent; abort refunds none")
fi
if [[ "$PHASE" == "claim" || "$PHASE" == "cut" ]]; then
  SECTIONS+=("quota: no unit was spent; the cutover stopped before its switch")
fi

print_turtle_header "all good, paddled back"
print_tree_start "git.branch.cutover abort"
print_tree_sections "${SECTIONS[@]}"
exit 0
