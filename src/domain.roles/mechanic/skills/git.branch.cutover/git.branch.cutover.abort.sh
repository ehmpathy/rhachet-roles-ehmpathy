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
#   - a tracked edit made since the halt is saved to a rescue ref before
#     the reset, and the report names it; a failed save stops the abort
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
      echo "usage: rhx git.branch.cutover abort"
      echo ""
      echo "undo the whole cutover: back to the source branch, edits restored,"
      echo "the new branch removed. an edit made since the halt is saved to a"
      echo "rescue ref first, and the report names it"
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

# HEAD must sit where this cutover left it, and abort may delete or
# reverse only what this cutover made: it resets and deletes
guard_head_at_cutover_position verb=abort
guard_abort_deletes_only_own_work

TRACKED_COUNT=$(get_state '.tracked | length')

# the state expects a park that git lacks: stop before any reset, or the
# reset would destroy what may be the last copy of the edits
if is_park_expected && ! has_park; then
  emit_cutover_malfunction "the park of tracked edits is absent; abort stops before any reset" "$(printf '%s\n' \
    "expected: $(get_park_ref)" \
    "tracked edits it should hold: $TRACKED_COUNT" \
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
set_state_abort_begun

# the rescue commit is the bot's, as begin's and continue's are: a machine
# with no git identity must still write it
export GIT_COMMITTER_NAME="$CUTOVER_BOT_NAME"
export GIT_COMMITTER_EMAIL="$CUTOVER_BOT_EMAIL"

######################################################################
# undo: back to the source, then lay the park back down
#
# .note = each step is a no-op where a prior run already did it, so a
#         rerun after a kill converges
# .note = in phase "claim" no reset has run yet, so the worktree still
#         holds the edits; the undo is only to drop the refs
# .note = under @tree no file ever moved and no park exists: the edits
#         live only in the worktree, so no reset is owed. the switch back
#         alone suffices — both branches sit at one commit
######################################################################
if is_cutover_past_claim; then
  undo_cutover
fi

# the report names each rescue; it is rendered before the state goes. an
# assignment, so a failed render trips errexit before any clear
REPORT=$(print_cutover_abort_report)
close_cutover_with_report "$REPORT"
