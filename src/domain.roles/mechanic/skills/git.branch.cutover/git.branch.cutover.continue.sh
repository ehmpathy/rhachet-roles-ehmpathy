#!/usr/bin/env bash
######################################################################
# .what = drive a cutover to its end: after a halt, or after an
#         interruption (a kill, a full disk, a failed step)
#
# .why  = a halt on a pick or on the carry leaves the files for the
#         caller to settle; an interruption leaves the work where it
#         stopped. either way continue lands what the cursor's pick
#         holds, replays the rest, carries the tracked edits, and reports.
#         so a cutover that got past its switch never needs a second unit
#
# usage:
#   rhx git.branch.cutover continue
#
# guarantee:
#   - refuses when no cutover is in flight (inv-8)
#   - refuses while any file is still unmerged, and names each
#   - refuses while a settled file still holds conflict markers
#   - refuses before it writes over an untracked file (inv-0)
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
      echo "usage: git.branch.cutover continue"
      echo ""
      echo "settle the conflicted files, stage them via rhx git.stage.add,"
      echo "then continue to land the rest of the cutover. continue also"
      echo "resumes a cutover a kill or a failed step interrupted"
      echo ""
      echo "example:"
      echo "  rhx git.stage.add src/band.ts"
      echo "  rhx git.branch.cutover continue"
      exit 0
      ;;
    *)
      emit_cutover_refusal "unknown argument: $1" "└─ usage: rhx git.branch.cutover continue"
      ;;
  esac
done

######################################################################
# guards
######################################################################
if ! is_in_git_repo; then
  emit_cutover_refusal "not in a git repository" "└─ fix: run it from inside the repo whose cutover you continue"
fi
cd "$(git rev-parse --show-toplevel)"

# one live cutover verb per worktree: no peer may act on the state mid-land (inv-6)
guard_cutover_lock

# a cutover must be in flight (inv-8)
if ! is_cutover_in_flight; then
  emit_no_cutover_refusal continue
fi
guard_state_schema

# a cutover stopped before its switch landed naught and spent naught;
# abort is its whole undo. from the picks on, continue converges, halted
# or interrupted alike
PHASE=$(get_state '.phase')
HALT=$(get_state '.halt')
if [[ -z "$HALT" && ( "$PHASE" == "claim" || "$PHASE" == "cut" ) ]]; then
  emit_cutover_refusal "the cutover stopped before its switch (phase: $PHASE), so there is naught to continue" \
    "└─ undo it, then begin again: rhx git.branch.cutover abort"
fi

# every conflicted file must be settled and staged
UNMERGED=$(get_conflict_file_lines)
if [[ -n "$UNMERGED" ]]; then
  emit_cutover_refusal "files are still in conflict" "$(
    echo "├─ files"
    printf '%s\n' "$UNMERGED" | as_tree_children | sed 's/^/│  /'
    echo "└─ fix: settle each, then rhx git.stage.add <files>, then continue again"
  )"
fi

# a settled file must hold no conflict marker, or the commit lands it as is
if [[ -n "$HALT" ]]; then
  MARKED=$(get_conflict_marker_files)
  if [[ -n "$MARKED" ]]; then
    emit_cutover_refusal "staged files still hold conflict markers" "$(
      echo "├─ files"
      printf '%s\n' "$MARKED" | as_tree_children | sed 's/^/│  /'
      echo "└─ fix: remove each <<<<<<< / ======= / >>>>>>> block, stage again, then continue"
    )"
  fi
fi

# HEAD must sit on the new branch: a continue elsewhere would land the
# picks onto other work
guard_head_at_cutover_position verb=continue

# the writes ahead must not land on a file made since the cutover began
guard_untracked_safe verb=continue

export GIT_COMMITTER_NAME="$CUTOVER_BOT_NAME"
export GIT_COMMITTER_EMAIL="$CUTOVER_BOT_EMAIL"

# from here on, any unexpected failure renders as a malfunction that keeps
# the state, so abort can undo it
set_cutover_unexpected_trap "$(printf '%s\n' \
  "resume, once the cause is cleared: rhx git.branch.cutover continue" \
  "or undo: rhx git.branch.cutover abort")"

######################################################################
# the carry: a halt's settled edits stay, unstaged; an interrupted carry
# finishes once its edits lay down, else the drive lays them down again
######################################################################
if [[ "$HALT" == "carry-conflict" ]]; then
  finish_carry
  finish_cutover "git.branch.cutover continue"
fi
if [[ "$PHASE" == "carry" ]] && { is_carry_landed || ! is_index_clean; }; then
  finish_carry
  finish_cutover "git.branch.cutover continue"
fi

######################################################################
# the picks: land the work the cursor's pick holds, then drive the rest
######################################################################
INDEX=$(get_state '.pick_index')

# a pick that holds no work (never begun, or begun yet never laid down)
# is replayed by the drive rather than dropped as empty
if is_pick_landing_owed "$INDEX" "$HALT"; then
  land_settled_pick "$INDEX" "its settled change is empty"
  INDEX=$((INDEX + 1))
fi
set_state_resume_at_pick "$INDEX"

drive_cutover "git.branch.cutover continue"
