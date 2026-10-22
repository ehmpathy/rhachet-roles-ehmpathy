#!/usr/bin/env bash
######################################################################
# .what = begin a rebase onto origin/main
#
# .why  = mechanics can rebase their feature branch onto main
#         on the commit grant alone — the push that follows rides it too
#
# usage:
#   rhx git.branch.rebase begin                    # plan mode (preview)
#   rhx git.branch.rebase begin --mode apply       # execute rebase
#
# guarantee:
#   - apply requires a held commit grant (.meter/git.commit.uses.jsonc),
#     even at 0 left; checked before any other guard, even on a
#     fast-forward (F9)
#   - spends no use: a rebase writes no commit of its own
#   - cannot rebase main/master
#   - cannot rebase with dirty work tree
#   - plan mode shows preview (default)
#   - apply mode executes rebase
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMIT_SKILL_DIR="$(cd "$SKILL_DIR/../git.commit" && pwd)"

# source shared utils
source "$COMMIT_SKILL_DIR/output.sh"
source "$COMMIT_SKILL_DIR/git.commit.operations.sh"
source "$SKILL_DIR/git.branch.rebase.operations.sh"
set_meter_scope commit

######################################################################
# meter state
######################################################################
REPO_ROOT=$(git rev-parse --show-toplevel)
METER_DIR="$REPO_ROOT/.meter"
STATE_FILE="$METER_DIR/git.commit.uses.jsonc"

######################################################################
# parse arguments
######################################################################
MODE="plan"  # default to plan mode

while [[ $# -gt 0 ]]; do
  case $1 in
    # rhachet passes these - ignore them
    --skill|--repo|--role)
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --help|-h)
      echo "usage: git.branch.rebase begin [--mode plan|apply]"
      echo ""
      echo "options:"
      echo "  --mode plan    preview what will be rebased (default)"
      echo "  --mode apply   execute the rebase"
      exit 0
      ;;
    *)
      emit_usage_refusal --skill "git.branch.rebase begin" --message "unknown argument: $1"
      exit 2
      ;;
  esac
done

# guard: refuse an unknown mode before any guard or fetch runs
if [[ "$MODE" != "plan" && "$MODE" != "apply" ]]; then
  emit_usage_refusal --skill "git.branch.rebase begin" --message "unknown mode '$MODE' (valid modes: plan, apply)"
  exit 2
fi

######################################################################
# guards
######################################################################

# guard: the global commit kill switch halts a rebase too, via the shared
# hardened reader (a damaged blocker file blocks; it never reads as clear)
GLOBAL_BLOCK_STATUS=0
GLOBAL_BLOCK_CORRUPT=false
check_global_blocker || GLOBAL_BLOCK_STATUS=$?
if is_blocker_corrupt status="$GLOBAL_BLOCK_STATUS" corrupt="$GLOBAL_BLOCK_CORRUPT"; then
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.branch.rebase begin"
    print_tree_malfunction "global blocker file corrupt"
    print_global_corrupt_note
  )"
  exit 1
fi
if is_blocker_set status="$GLOBAL_BLOCK_STATUS"; then
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.branch.rebase begin"
    print_tree_constraint "globally blocked"
    print_coconut_hint "a human has blocked all mechanic operations; ask them to lift it" \
      "git.commit.uses allow --global"
  )"
  exit 2
fi

# read the commit grant via the shared reader
LOCAL_GRANT_STATUS=0
get_one_commit_local_grant file="$STATE_FILE" || LOCAL_GRANT_STATUS=$?

# guard: a damaged quota file is refused by name
if [[ "$LOCAL_GRANT_STATUS" -eq 1 ]]; then
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.branch.rebase begin"
    print_tree_malfunction "commit quota file corrupt"
    print_local_meter_damaged_fix file="${STATE_FILE#"$REPO_ROOT/"}"
  )"
  exit 1
fi

# guard: a commit grant must exist and be held
if [[ "$LOCAL_GRANT_STATUS" -eq 2 || "$COMMIT_HELD" != "true" ]]; then
  emit_both "$(
    print_turtle_header "hold up dude..."
    print_tree_start "git.branch.rebase begin"
    print_tree_constraint "no commit grant on this tree"
    print_coconut_hint "a rebase rides the commit grant; ask your human to grant one" \
      "rhx git.commit.uses set --quant N"
  )"
  exit 2
fi

# .note = a held grant suffices, even at 0 left: the rebase spends no use and
#         makes no new commit, the same as a push (F9, F16). so a crew that spent
#         its last use can still rebase onto main with no second grant

# guard: cannot rebase main/master
if is_base_branch; then
  emit_both "$(
    print_turtle_header "hold up dude..."
    print_tree_start "git.branch.rebase begin"
    print_tree_constraint "cannot rebase main/master"
    print_coconut_hint "a rebase moves a feature branch onto main; check one out first" \
      "git checkout <feature-branch>"
  )"
  exit 2
fi

# guard: dirty work tree
if is_worktree_dirty; then
  emit_both "$(
    print_turtle_header "hold up dude..."
    print_tree_start "git.branch.rebase begin"
    print_tree_constraint "unstaged changes found"
    print_coconut_hint "commit your changes first, so the rebase moves them too" \
      "rhx git.commit.set -m @stdin --unstaged include --mode apply"
  )"
  exit 2
fi

# guard: rebase already in progress
if is_rebase_in_progress; then
  emit_both "$(
    print_turtle_header "hold up dude..."
    print_tree_start "git.branch.rebase begin"
    print_tree_constraint "rebase already in progress"
    print_coconut_hint "finish the rebase underway, or abandon it" \
      "rhx git.branch.rebase continue" \
      "rhx git.branch.rebase abort"
  )"
  exit 2
fi

######################################################################
# detect default branch (main, master, or trunk)
######################################################################
if git rev-parse --verify origin/main &>/dev/null; then
  DEFAULT_BRANCH="main"
elif git rev-parse --verify origin/master &>/dev/null; then
  DEFAULT_BRANCH="master"
else
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.branch.rebase begin"
    print_tree_malfunction "no main or master branch found on origin"
  )"
  exit 1
fi

######################################################################
# fetch latest from origin
######################################################################
git fetch origin "$DEFAULT_BRANCH" 2>/dev/null || {
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.branch.rebase begin"
    print_tree_malfunction "failed to fetch origin/$DEFAULT_BRANCH"
    print_coconut_hint "check the network connection, then try again" \
      "rhx git.branch.rebase begin"
  )"
  exit 1
}

######################################################################
# get rebase info
######################################################################
COMMITS_TO_REBASE=$(get_commits_to_rebase "origin/$DEFAULT_BRANCH")
# grep -c prints 0 and exits 1 on no match: `|| true` keeps that one 0
COMMIT_COUNT=$(echo "$COMMITS_TO_REBASE" | grep -c . || true)
if ! BEHIND_COUNT=$(get_behind_count "origin/$DEFAULT_BRANCH"); then
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.branch.rebase begin"
    print_tree_malfunction "could not count commits behind origin/$DEFAULT_BRANCH"
    print_coconut_hint "the count reads origin/$DEFAULT_BRANCH; fetch it, then retry" \
      "git fetch origin $DEFAULT_BRANCH"
  )"
  exit 1
fi
COMMITS_BEHIND=$(get_commits_behind "origin/$DEFAULT_BRANCH")

# guard: already up to date. a branch with zero commits of its own that sits
# behind main still moves: the rebase fast-forwards it on the commit grant
if [[ "$COMMIT_COUNT" -eq 0 && "$BEHIND_COUNT" -eq 0 ]]; then
  print_turtle_header "already up to date"
  print_tree_start "git.branch.rebase begin"
  echo "   └─ no commits to rebase"
  exit 0
fi

# guard: already up to date (no commits behind)
if [[ "$BEHIND_COUNT" -eq 0 ]]; then
  print_turtle_header "already up to date"
  print_tree_start "git.branch.rebase begin"
  echo "   ├─ commits: $COMMIT_COUNT (ahead)"
  echo "   └─ behind: 0"
  echo ""
  echo "no rebase needed, ready to push"
  exit 0
fi

# guard: a 0-ahead fast-forward must not orphan commits that sit only on the
# branch's remote; the push after it would drop them (F7)
if [[ "$COMMIT_COUNT" -eq 0 ]]; then
  CURRENT_BRANCH=$(get_current_branch)

  # a remote we cannot read is no proof of zero: fail closed
  REMOTE_AHEAD_COUNT=""
  if ! REMOTE_AHEAD_COUNT=$(get_remote_branch_ahead_count_after_fetch); then
    emit_both "$(
      print_turtle_header "bummer dude..."
      print_tree_start "git.branch.rebase begin"
      print_tree_malfunction "could not read origin/$CURRENT_BRANCH"
      print_coconut_hint "a fast-forward needs proof it orphans no remote commit; check the remote, then retry" \
        "git fetch origin $CURRENT_BRANCH"
    )"
    exit 1
  fi

  if [[ "$REMOTE_AHEAD_COUNT" -gt 0 ]]; then
    emit_both "$(
      print_turtle_header "hold up dude..."
      print_tree_start "git.branch.rebase begin"
      print_tree_constraint "origin/$CURRENT_BRANCH holds commits this tree lacks: $REMOTE_AHEAD_COUNT"
      print_coconut_hint "a fast-forward onto main would orphan them; pull them in first" \
        "git pull --ff-only origin $CURRENT_BRANCH"
    )"
    exit 2
  fi
fi

######################################################################
# plan mode: preview
######################################################################
if [[ "$MODE" == "plan" ]]; then
  print_turtle_header "heres the wave..."
  print_tree_start "git.branch.rebase begin --mode plan"
  echo "   ├─ rebase"
  echo "   │  ├─ target: origin/$DEFAULT_BRANCH"
  REBASE_SHAPE="replay"
  [[ "$COMMIT_COUNT" -eq 0 ]] && REBASE_SHAPE="fast-forward"
  echo "   │  ├─ shape: $REBASE_SHAPE"

  # show commits ahead (to be rebased)
  echo "   │  ├─ ahead: $COMMIT_COUNT commits"
  AHEAD_LINES=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && AHEAD_LINES+=("$line")
  done <<< "$COMMITS_TO_REBASE"
  # the last ahead line closes its subtree, as the behind list below does
  AHEAD_LAST_IDX=$((${#AHEAD_LINES[@]} - 1))
  for i in "${!AHEAD_LINES[@]}"; do
    if [[ $i -eq $AHEAD_LAST_IDX ]]; then
      echo "   │  │  └─ ${AHEAD_LINES[$i]}"
    else
      echo "   │  │  ├─ ${AHEAD_LINES[$i]}"
    fi
  done

  # show commits behind (what main has)
  echo "   │  └─ behind: $BEHIND_COUNT commits"
  BEHIND_LINES=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && BEHIND_LINES+=("$line")
  done <<< "$COMMITS_BEHIND"
  LAST_IDX=$((${#BEHIND_LINES[@]} - 1))
  for i in "${!BEHIND_LINES[@]}"; do
    if [[ $i -eq $LAST_IDX ]]; then
      echo "   │     └─ ${BEHIND_LINES[$i]}"
    else
      echo "   │     ├─ ${BEHIND_LINES[$i]}"
    fi
  done
  # a rebase spends no use and writes no commit, so a held grant suffices even
  # at 0 left (F9); the plan must not ask for a grant apply never needs
  echo "   └─ meter"
  echo "      ├─ rebase: spends no use; the held grant suffices"
  echo "      └─ push: held"
  echo ""
  echo "run with --mode apply to execute"
  exit 0
fi

######################################################################
# apply mode: execute rebase
######################################################################
if [[ "$MODE" == "apply" ]]; then
  # set seaturtle identity (committer only - preserve original author)
  export GIT_COMMITTER_NAME="seaturtle[bot]"
  export GIT_COMMITTER_EMAIL="seaturtle@ehmpath.com"

  # capture git output
  # capture the real exit code: `$?` after `|| true` always reads 0
  GIT_EXIT_CODE=0
  GIT_OUTPUT=$(git pull origin "$DEFAULT_BRANCH" --rebase 2>&1) || GIT_EXIT_CODE=$?

  # check if rebase succeeded
  if [[ $GIT_EXIT_CODE -eq 0 ]] && ! is_rebase_in_progress; then
    # success!
    print_turtle_header "righteous!"
    print_tree_start "git.branch.rebase begin --mode apply"
    echo "   ├─ rebase"
    echo "   │  ├─ target: origin/$DEFAULT_BRANCH"
    echo "   │  ├─ commits: $COMMIT_COUNT ✓"
    echo "   │  └─ status: clean"
    echo "   └─ git.output"
    print_git_output_tree "$GIT_OUTPUT"
    echo ""

    # a fast-forward of a branch with no commits of its own leaves naught to push:
    # HEAD is main's tip, which the pr already holds
    if [[ "$COMMIT_COUNT" -eq 0 ]]; then
      echo "🌊 naught to push"
      echo "   └─ the branch now sits on origin/$DEFAULT_BRANCH, with no commits of its own"
      exit 0
    fi

    echo "🌊 ready to push"
    echo "   └─ rhx git.commit.push"
    exit 0
  fi

  # check if we hit conflicts
  if is_rebase_in_progress; then
    CONFLICT_FILES=$(get_conflict_files)
    CONFLICT_COMMIT=$(get_conflict_commit)

    # a halt on conflict exits non-zero, so it rides both streams, as every
    # other refusal in this file does (rule.require.skill-output-streams)
    emit_both "$(
      print_turtle_header "hang tight..."
      print_tree_start "git.branch.rebase begin --mode apply"
      echo "   ├─ rebase"
      echo "   │  ├─ target: origin/$DEFAULT_BRANCH"
      echo "   │  ├─ commits: $COMMIT_COUNT"
      echo "   │  └─ status: conflict"
      echo "   ├─ conflict"
      if [[ -n "$CONFLICT_COMMIT" ]]; then
        echo "   │  ├─ commit: $CONFLICT_COMMIT"
      fi
      echo "   │  └─ files"
      print_files_tree "   │     " "$CONFLICT_FILES"
      echo "   └─ git.output"
      print_git_output_tree "$GIT_OUTPUT"
      print_coconut_hint "settle the conflicts in the files above, stage them, then continue" \
        "rhx git.stage.add <files>" \
        "rhx git.branch.rebase continue"
    )"
    exit 1
  fi

  # some other failure
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.branch.rebase begin --mode apply"
    echo "   ├─ 💥 MalfunctionError: rebase failed"
    echo "   └─ git.output"
    print_git_output_tree "$GIT_OUTPUT"
  )"
  exit 1
fi
