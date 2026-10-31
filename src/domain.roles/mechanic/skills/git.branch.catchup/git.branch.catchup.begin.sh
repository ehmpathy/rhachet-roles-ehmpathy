#!/usr/bin/env bash
######################################################################
# .what = catch the current feature branch up with origin/main, via one
#         merge commit (no rewrite)
#
# .why  = a branch behind main, or CONFLICTING with it, needs main's
#         commits. a rebase rewrites history and its push needs force; a
#         merge commit adds one commit on top, so the push is plain
#
# usage:
#   rhx git.branch.catchup begin                 # plan (default): preview
#   rhx git.branch.catchup begin --mode apply    # merge + commit
#
# guarantee:
#   - never merges into main or master (refuses in both modes)
#   - the git.commit.set gates, in its order: human halts, a corrupt quota
#     file, sponsor; then uses left (apply refuses, plan flags)
#   - never merges over uncommitted work, staged or unstaged
#   - always --no-ff: the result is a 2-parent commit authored by the
#     robot, with the sponsor Co-authored-by trailer; meter −1
#   - a conflict stops loud (exit 2), names each file, leaves the merge
#     in flight for take / continue / abort
#   - already level: no commit, no meter spend (exit 0)
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMIT_SKILL_DIR="$(cd "$SKILL_DIR/../git.commit" && pwd)"

source "$COMMIT_SKILL_DIR/output.sh"
source "$COMMIT_SKILL_DIR/git.commit.operations.sh"
source "$SKILL_DIR/git.branch.catchup.operations.sh"

######################################################################
# parse arguments
######################################################################
MODE="plan"

show_usage() {
  print_turtle_header "heres the wave..."
  print_tree_start "git.branch.catchup begin"
  echo "   ├─ $CATCHUP_HOW_LINE"
  echo "   ├─ usage"
  echo "   │  └─ rhx git.branch.catchup begin [--mode plan|apply]"
  echo "   ├─ options"
  echo "   │  ├─ --mode plan    preview the merge (default)"
  echo "   │  └─ --mode apply   merge and commit"
  echo "   └─ examples"
  echo "      ├─ rhx git.branch.catchup begin"
  echo "      └─ rhx git.branch.catchup begin --mode apply"
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --skill|--repo|--role)
      shift
      [[ $# -gt 0 && "$1" != --* ]] && shift
      ;;
    --mode)
      shift
      MODE=""
      if [[ $# -gt 0 && "$1" != --* ]]; then
        MODE="$1"
        shift
      fi
      ;;
    --help|-h)
      show_usage
      exit 0
      ;;
    *)
      emit_catchup_constraint message="unknown argument: $1" tree="$(
        print_tree_start "git.branch.catchup begin"
        echo "   └─ usage: rhx git.branch.catchup begin [--mode plan|apply]"
      )"
      exit 2
      ;;
  esac
done

validate_enum_arg "$MODE" "--mode" \
  "usage: rhx git.branch.catchup begin [--mode plan|apply]" \
  plan apply

LABEL="git.branch.catchup begin --mode $MODE"

# guard: inside a git repo
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  emit_catchup_constraint message="not in a git repository" tree="$(
    print_tree_start "$LABEL"
    echo "   └─ fix: run it from the worktree of your feature branch"
  )"
  exit 2
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"  # git lists paths from the root; read and act on them from there
METER_DIR="$REPO_ROOT/.meter"
STATE_FILE="$METER_DIR/$COMMIT_STATE_FILENAME"
BRANCH=$(get_current_branch)

######################################################################
# gates that refuse in both modes: intent, then a human's halt
######################################################################

# guard: a rebase in flight. it detaches HEAD, so no branch is there to
# plan against; refuse in both modes and name the rebase's own exits
if is_rebase_in_flight; then
  emit_catchup_constraint message="a rebase is in flight" tree="$(
    print_tree_start "$LABEL"
    echo "   ├─ why: a rebase detaches HEAD; there is no branch to catch up until it ends"
    echo "   └─ next"
    echo "      ├─ finish it:   rhx git.branch.rebase continue"
    echo "      └─ or back out: rhx git.branch.rebase abort"
  )"
  exit 2
fi

# guard: a detached HEAD has no branch to catch up
if [[ "$BRANCH" == "HEAD" ]]; then
  emit_catchup_constraint message="no branch checked out (detached HEAD)" tree="$(
    print_tree_start "$LABEL"
    echo "   ├─ HEAD: $(git rev-parse --short HEAD)"
    echo "   ├─ why: a catch-up merge commits onto a feature branch; a detached HEAD has none"
    echo "   └─ fix: check out your feature branch, then begin again"
  )"
  exit 2
fi

# guard: never write to main or master
if ! is_branch_catchup_target branch="$BRANCH"; then
  emit_catchup_constraint message="will not merge into $BRANCH" tree="$(
    print_tree_start "$LABEL"
    echo "   ├─ branch: $BRANCH"
    echo "   ├─ why: this verb levels a feature branch with main; it never writes to main or master"
    echo "   └─ fix: run it from the worktree of your feature branch"
  )"
  exit 2
fi

# the commit gates, in their one order: human halts, quota read, sponsor.
# a damaged quota refuses in both modes; absent or spent is flagged by plan
# and refused by apply after the level check, so a level branch never asks
# for a grant it would not spend
refuse_if_commit_gates_fail skill="$LABEL" \
  state_file="$STATE_FILE" sponsor_file="$METER_DIR/$SPONSOR_STATE_FILENAME" \
  repo_root="$REPO_ROOT" refuse="corrupt"

######################################################################
# fetch the source, then the level check (free in both modes)
######################################################################
FETCH_ERR_FILE=$(mktemp)
if ! git fetch "$CATCHUP_SOURCE_REMOTE" "$CATCHUP_SOURCE_BRANCH" >/dev/null 2>"$FETCH_ERR_FILE"; then
  FETCH_ERR=$(cat "$FETCH_ERR_FILE")
  rm -f "$FETCH_ERR_FILE"
  emit_catchup_malfunction message="could not fetch $CATCHUP_SOURCE_REF" tree="$(
    print_tree_start "$LABEL"
    echo "   ├─ cause"
    print_catchup_lines_tree prefix="   │  " files="$FETCH_ERR"
    echo "   └─ fix: check the network and the remote, then begin again"
  )"
  exit 1
fi
rm -f "$FETCH_ERR_FILE"

BEHIND_COUNT=$(get_behind_count)
AHEAD_COUNT=$(get_ahead_count)

# already level: naught to merge, naught to spend
if [[ "$BEHIND_COUNT" -eq 0 ]]; then
  print_turtle_header "already level"
  print_tree_start "$LABEL"
  echo "   ├─ from: $CATCHUP_SOURCE_REF"
  echo "   ├─ behind: 0"
  echo "   └─ no merge needed; meter untouched"
  exit 0
fi

######################################################################
# gates that guard only the mutation: plan flags, apply refuses
######################################################################
MERGE_IN_FLIGHT=false
is_merge_in_flight && MERGE_IN_FLIGHT=true
UNCOMMITTED=$(get_uncommitted_files)
COLLISIONS=$(get_untracked_collision_files)

# robot identity, after the sponsor gate (its fetch can unlock a keyrack)
get_commit_robot_identity auth="$AUTH_DEFAULT"

HEADER=$(as_catchup_commit_header branch="$BRANCH")

######################################################################
# plan: preview + flags, mutate naught
######################################################################
if [[ "$MODE" == "plan" ]]; then
  USES_AFTER=""
  [[ "$COMMIT_QUOTA_STATUS" == "ok" ]] && USES_AFTER=$(as_commit_uses_after_spend uses="$USES")

  print_turtle_header "heres the wave..."
  print_tree_start "$LABEL"
  echo "   ├─ $CATCHUP_HOW_LINE"
  echo "   ├─ merge"
  echo "   │  ├─ from: $CATCHUP_SOURCE_REF"
  echo "   │  ├─ into: $BRANCH"
  echo "   │  ├─ behind: $(as_count_phrase count="$BEHIND_COUNT" noun="commit")"
  print_catchup_lines_tree prefix="   │  │  " files="$(get_commits_behind_shown count="$BEHIND_COUNT")"
  echo "   │  └─ ahead: $(as_count_phrase count="$AHEAD_COUNT" noun="commit")"
  echo "   ├─ commit"
  echo "   │  ├─ header: $HEADER"
  echo "   │  ├─ author: $ROBOT_NAME <$ROBOT_EMAIL>"
  echo "   │  └─ sponsor: $SPONSOR_NAME <$SPONSOR_EMAIL>, from $SPONSOR_PROVENANCE"

  # flags: what apply will refuse
  if [[ "$MERGE_IN_FLIGHT" == true ]] && is_catchup_merge_in_flight; then
    echo "   ├─ ⚠️ apply will refuse: a merge is in flight"
    echo "   │  ├─ finish it:   rhx git.branch.catchup continue"
    echo "   │  └─ or back out: rhx git.branch.catchup abort"
  fi
  if [[ "$MERGE_IN_FLIGHT" == true ]] && ! is_catchup_merge_in_flight; then
    echo "   ├─ ⚠️ apply will refuse: a merge in flight is not a catch-up from $CATCHUP_SOURCE_REF"
    echo "   │  └─ back it out first: rhx git.branch.catchup abort"
  fi
  if [[ -n "$UNCOMMITTED" ]]; then
    echo "   ├─ ⚠️ apply will refuse: uncommitted changes"
    print_catchup_lines_tree prefix="   │  " files="$UNCOMMITTED"
  fi
  if [[ -n "$COLLISIONS" ]]; then
    echo "   ├─ ⚠️ apply will refuse: untracked files at paths $CATCHUP_SOURCE_REF adds"
    print_catchup_lines_tree prefix="   │  " files="$COLLISIONS"
  fi
  if [[ "$COMMIT_QUOTA_STATUS" == "ok" && "${PUSH_ALLOWED:-block}" != "allow" ]]; then
    echo "   ├─ ⚠️ apply will commit, but the push after needs a human grant"
    echo "   │  └─ a human runs: $CATCHUP_GRANT_COMMAND"
  fi
  if [[ "$COMMIT_QUOTA_STATUS" == "absent" ]]; then
    echo "   ├─ ⚠️ apply will refuse: no commit quota set"
    echo "   │  └─ a human runs: $CATCHUP_GRANT_COMMAND"
  fi
  if [[ "$COMMIT_QUOTA_STATUS" == "spent" ]]; then
    echo "   ├─ ⚠️ apply will refuse: no commit uses left"
    echo "   │  └─ a human runs: $CATCHUP_GRANT_COMMAND"
  fi

  echo "   └─ meter"
  if [[ "$COMMIT_QUOTA_STATUS" == "absent" ]]; then
    echo "      └─ left: none granted"
  fi
  if [[ "$COMMIT_QUOTA_STATUS" != "absent" ]]; then
    echo "      └─ $(as_catchup_meter_line uses="$USES" after="$USES_AFTER")"
  fi
  # a plan that flags a refusal asks for the fix first, never a bare apply
  APPLY_WILL_REFUSE=false
  [[ "$MERGE_IN_FLIGHT" == true || -n "$UNCOMMITTED" || -n "$COLLISIONS" ]] && APPLY_WILL_REFUSE=true
  [[ "$COMMIT_QUOTA_STATUS" == "absent" || "$COMMIT_QUOTA_STATUS" == "spent" ]] && APPLY_WILL_REFUSE=true
  echo ""
  if [[ "$APPLY_WILL_REFUSE" == true ]]; then
    echo "clear each ⚠️ apply will refuse above, then run with --mode apply"
    exit 0
  fi
  echo "run with --mode apply to execute"
  exit 0
fi

######################################################################
# apply: refuse what plan flagged
######################################################################

# guard: a merge already in flight
if [[ "$MERGE_IN_FLIGHT" == true ]]; then
  # a foreign merge: continue would refuse it, so name the one way out
  if ! is_catchup_merge_in_flight; then
    emit_catchup_constraint message="a merge is already in flight, and not a catch-up from $CATCHUP_SOURCE_REF" tree="$(
      print_tree_start "$LABEL"
      echo "   ├─ MERGE_HEAD: $(git rev-parse --short MERGE_HEAD) (not on $CATCHUP_SOURCE_REF)"
      echo "   └─ next"
      echo "      ├─ back it out:       rhx git.branch.catchup abort"
      echo "      └─ then:              rhx git.branch.catchup begin --mode apply"
    )"
    exit 2
  fi
  emit_catchup_constraint message="a merge is already in flight" tree="$(
    print_tree_start "$LABEL"
    echo "   └─ next"
    echo "      ├─ settle + finish it: rhx git.branch.catchup continue"
    echo "      └─ or back out:        rhx git.branch.catchup abort"
  )"
  exit 2
fi

# guard: uncommitted work, staged or unstaged
if [[ -n "$UNCOMMITTED" ]]; then
  emit_catchup_constraint message="uncommitted changes in the tree" tree="$(
    print_tree_start "$LABEL"
    echo "   ├─ dirty"
    print_catchup_lines_tree prefix="   │  " files="$UNCOMMITTED"
    echo "   ├─ why: a merge over uncommitted work folds it into a merge commit no one reviews"
    echo "   └─ fix: commit it first, then begin again"
    echo "      ├─ rhx git.stage.add <files>"
    echo "      └─ rhx git.commit.set -m @stdin --mode apply"
  )"
  exit 2
fi

# guard: no untracked file at a path the source adds (git would refuse the merge)
if [[ -n "$COLLISIONS" ]]; then
  emit_catchup_constraint message="untracked files at paths $CATCHUP_SOURCE_REF adds" tree="$(
    print_tree_start "$LABEL"
    echo "   ├─ collide"
    print_catchup_lines_tree prefix="   │  " files="$COLLISIONS"
    echo "   ├─ why: the merge would overwrite them, so git refuses it"
    echo "   └─ fix: move or remove each, then begin again"
  )"
  exit 2
fi

# guard: a commit use left
if [[ "$COMMIT_QUOTA_STATUS" == "absent" || "$COMMIT_QUOTA_STATUS" == "spent" ]]; then
  refuse_commit_quota skill="$LABEL" status="$COMMIT_QUOTA_STATUS" grant="$CATCHUP_GRANT_COMMAND"
fi

######################################################################
# merge, with no commit and no fast-forward
######################################################################
HEAD_BEFORE=$(git rev-parse --short HEAD)
MERGE_EXIT=0
MERGE_OUTPUT=$(git merge --no-ff --no-commit "$CATCHUP_SOURCE_REF" 2>&1) || MERGE_EXIT=$?

# git refused to start the merge: the tree is as it was
if ! is_merge_in_flight; then
  emit_catchup_malfunction message="git refused the merge; the tree is unchanged" tree="$(
    print_tree_start "$LABEL"
    echo "   ├─ HEAD: $HEAD_BEFORE (unchanged)"
    echo "   ├─ git exit: $MERGE_EXIT"
    echo "   └─ cause"
    print_catchup_lines_tree prefix="      " files="$MERGE_OUTPUT"
  )"
  exit 1
fi

# conflicts: stop loud, leave the merge in flight
CONFLICTS=$(get_conflict_files)
if [[ -n "$CONFLICTS" ]]; then
  CONFLICTS_SHOWN=$(get_conflict_files_shown)
  emit_catchup_constraint message="merge stopped on conflicts" tree="$(
    print_tree_start "$LABEL"
    echo "   ├─ merge"
    echo "   │  ├─ from: $CATCHUP_SOURCE_REF"
    echo "   │  └─ status: in flight, unsettled"
    echo "   ├─ conflicts"
    print_catchup_lines_tree prefix="   │  " files="$CONFLICTS_SHOWN"
    print_catchup_next_moves shown="$CONFLICTS_SHOWN" stage="$STAGE_ALLOWED"
  )"
  exit 2
fi

######################################################################
# clean merge: commit it
######################################################################
set_catchup_merge_commit label="$LABEL" branch="$BRANCH" \
  robot_name="$ROBOT_NAME" robot_email="$ROBOT_EMAIL" \
  sponsor_name="$SPONSOR_NAME" sponsor_email="$SPONSOR_EMAIL" \
  state_file="$STATE_FILE"

print_catchup_committed label="$LABEL" merge_line="behind: $BEHIND_COUNT → 0" branch="$BRANCH" push="$PUSH_ALLOWED" \
  sha="$CATCHUP_COMMIT_SHA" uses_after="$CATCHUP_USES_AFTER"
