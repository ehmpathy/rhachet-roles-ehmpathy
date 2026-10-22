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
#   rhx git.branch.rebase begin --mode apply --unstaged ignore
#                                                  # set unstaged paths aside,
#                                                  # rebase, put them back
#
# guarantee:
#   - apply requires a held commit grant (.meter/git.commit.uses.jsonc),
#     even at 0 left; checked before any other guard, even on a
#     fast-forward (F9)
#   - spends no use: a rebase writes no commit of its own
#   - cannot rebase main/master
#   - refuses staged content (exit 2); the index is never touched
#   - refuses unstaged edits unless --unstaged ignore (exit 2)
#   - --unstaged ignore sets each unstaged path aside in this worktree's
#     git dir (never the shared stash), and puts each back byte for byte
#     and link for link; on a stop, continue or abort puts them back
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
source "$SKILL_DIR/git.branch.rebase.aside.operations.sh"
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
UNSTAGED=""  # absent by default: unstaged edits are refused

while [[ $# -gt 0 ]]; do
  case $1 in
    # rhachet passes these - ignore them
    --skill|--repo|--role)
      shift 2
      ;;
    --mode)
      MODE="${2:-}"
      validate_enum_arg "$MODE" "--mode" \
        "usage: git.branch.rebase begin [--mode plan|apply] [--unstaged ignore|include]" \
        plan apply
      shift 2
      ;;
    --unstaged)
      UNSTAGED="${2:-}"
      validate_enum_arg "$UNSTAGED" "--unstaged" \
        "usage: git.branch.rebase begin [--mode plan|apply] [--unstaged ignore|include]" \
        ignore include
      shift 2
      ;;
    --help|-h)
      print_turtle_header "heres the wave..."
      print_tree_start "git.branch.rebase begin"
      echo "   ├─ what"
      echo "   │  └─ rebase this branch onto origin/main"
      echo "   ├─ usage"
      echo "   │  └─ rhx git.branch.rebase begin [--mode plan|apply] [--unstaged ignore|include]"
      echo "   ├─ args"
      echo "   │  ├─ --mode plan          preview what will be rebased (default)"
      echo "   │  ├─ --mode apply         execute the rebase"
      echo "   │  ├─ --unstaged ignore    set unstaged paths aside, rebase, put them back; continue or abort puts them back after a stop"
      echo "   │  └─ --unstaged include   refused when unstaged edits exist: a rebase has no commit to fold them into; commit them first via git.commit.set --unstaged include"
      echo "   ├─ note"
      echo "   │  └─ on a tree with no unstaged edits, either --unstaged value is a no-op"
      echo "   └─ examples"
      echo "      ├─ rhx git.branch.rebase begin --mode plan"
      echo "      └─ rhx git.branch.rebase begin --mode apply --unstaged ignore"
      exit 0
      ;;
    *)
      emit_both "$(
        print_turtle_header "hold up dude..."
        print_tree_start "git.branch.rebase begin"
        echo "   └─ ✋ ConstraintError: unknown argument: $1"
        echo "      └─ usage: rhx git.branch.rebase begin [--mode plan|apply] [--unstaged ignore|include]"
        print_coconut_hint "see each arg it takes" "rhx git.branch.rebase begin --help"
      )"
      exit 2
      ;;
  esac
done

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
    echo "   └─ ✋ ConstraintError: cannot rebase main/master"
  )"
  exit 2
fi

# guard: rebase already in progress
if is_rebase_in_progress; then
  emit_both "$(
    print_turtle_header "hold up dude..."
    print_tree_start "git.branch.rebase begin"
    echo "   └─ ✋ ConstraintError: rebase already in progress"
    print_coconut_hint "continue it, or abort it" \
      "rhx git.branch.rebase continue" \
      "rhx git.branch.rebase abort"
  )"
  exit 2
fi

# guard: a store held from a prior run must be put back first
if is_aside_held; then
  emit_both "$(
    print_turtle_header "hold up dude..."
    print_tree_start "git.branch.rebase begin"
    print_aside_held_refusal \
      when_held="paths are still set aside from a prior run" \
      when_empty="an empty set-aside store remains from a prior run"
  )"
  exit 2
fi

# guard: staged content (a reset would drop it, and a rebase cannot run over it)
STAGED_FILES=$(get_staged_files)
if [[ -n "$STAGED_FILES" ]]; then
  emit_both "$(
    print_turtle_header "hold up dude..."
    print_tree_start "git.branch.rebase begin"
    echo "   └─ ✋ ConstraintError: staged changes found"
    print_files_tree "      " "$STAGED_FILES"
    print_coconut_hint "commit them first; or unstage them, and they become unstaged edits" \
      "rhx git.commit.set -m @stdin --mode apply" \
      "git restore --staged -- $(as_shell_words "$STAGED_FILES")"
  )"
  exit 2
fi

# guard: unstaged edits need an explicit --unstaged choice
UNSTAGED_FILES=$(get_unstaged_files)
if [[ -n "$UNSTAGED_FILES" && -z "$UNSTAGED" ]]; then
  emit_both "$(
    print_turtle_header "hold up dude..."
    print_tree_start "git.branch.rebase begin"
    echo "   └─ ✋ ConstraintError: unstaged changes found"
    print_files_tree "      " "$UNSTAGED_FILES"
    print_coconut_hint "you can set them aside for the rebase; each is put back after" \
      "rhx git.branch.rebase begin --mode $MODE --unstaged ignore"
  )"
  exit 2
fi

# guard: include has no commit to fold edits into
if [[ -n "$UNSTAGED_FILES" && "$UNSTAGED" == "include" ]]; then
  emit_both "$(
    print_turtle_header "hold up dude..."
    print_tree_start "git.branch.rebase begin"
    echo "   └─ ✋ ConstraintError: --unstaged include cannot apply to a rebase"
    echo "      ├─ why: a rebase replays commits; it has no commit of its own to fold edits into"
    echo "      └─ files"
    print_files_tree "         " "$UNSTAGED_FILES"
    print_coconut_hint "set them aside for the rebase, each put back after; or, only if every path above belongs in a commit, commit them first" \
      "rhx git.branch.rebase begin --mode $MODE --unstaged ignore" \
      "rhx git.commit.set -m @stdin --unstaged include --mode apply"
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
    echo "   └─ 💥 MalfunctionError: no main or master branch found on origin"
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
    echo "   └─ 💥 MalfunctionError: failed to fetch origin/$DEFAULT_BRANCH"
    print_coconut_hint "check your network connection, then retry" \
      "rhx git.branch.rebase begin --mode $MODE${UNSTAGED:+ --unstaged $UNSTAGED}"
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
  echo "   │  ├─ ahead: $(as_commit_count count="$COMMIT_COUNT")"
  AHEAD_LINES=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && AHEAD_LINES+=("$line")
  done <<< "$COMMITS_TO_REBASE"
  AHEAD_LAST_IDX=$((${#AHEAD_LINES[@]} - 1))
  for i in "${!AHEAD_LINES[@]}"; do
    # the last commit closes the branch
    if [[ $i -eq $AHEAD_LAST_IDX ]]; then
      echo "   │  │  └─ ${AHEAD_LINES[$i]}"
      continue
    fi
    echo "   │  │  ├─ ${AHEAD_LINES[$i]}"
  done

  # show commits behind (what main has)
  echo "   │  └─ behind: $(as_commit_count count="$BEHIND_COUNT")"
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
  if [[ -n "$UNSTAGED_FILES" ]]; then
    echo "   ├─ unstaged (to set aside)"
    echo "   │  └─ would set aside, then put back"
    print_files_tree "   │     " "$UNSTAGED_FILES"
  fi
  # a rebase spends no use and writes no commit, so a held grant suffices even
  # at 0 left (F9); the plan must not ask for a grant apply never needs
  echo "   └─ meter"
  echo "      ├─ rebase: spends no use; the held grant suffices"
  echo "      └─ push: held"
  print_coconut_hint "this is a plan; apply it to rebase" \
    "rhx git.branch.rebase begin --mode apply${UNSTAGED:+ --unstaged $UNSTAGED}"
  exit 0
fi

######################################################################
# apply mode: execute rebase
######################################################################
if [[ "$MODE" == "apply" ]]; then
  # set seaturtle identity (committer only - preserve original author)
  export GIT_COMMITTER_NAME="seaturtle[bot]"
  export GIT_COMMITTER_EMAIL="seaturtle@ehmpath.com"

  # set unstaged paths aside (--unstaged ignore); read them again, since an
  # edit may have landed while begin fetched
  [[ "$UNSTAGED" == "ignore" ]] && UNSTAGED_FILES=$(get_unstaged_files)
  if [[ -n "$UNSTAGED_FILES" ]]; then
    # a concurrent run that created the store first wins; this run refuses
    set_aside_store_claimed label="git.branch.rebase begin --mode apply" rerun="rhx git.branch.rebase begin --mode apply --unstaged ignore"
    set_paths_aside label="git.branch.rebase begin --mode apply" paths="$UNSTAGED_FILES"
  fi

  # capture git output and exit code
  GIT_EXIT_CODE=0
  # LC_ALL=C: git's prose stays in one locale, so the start-failure match below is deterministic
  GIT_OUTPUT=$(LC_ALL=C git pull origin "$DEFAULT_BRANCH" --rebase 2>&1) || GIT_EXIT_CODE=$?

  # check if rebase succeeded
  if [[ $GIT_EXIT_CODE -eq 0 ]] && ! is_rebase_in_progress; then
    # put held paths back
    set_held_paths_put_back label="git.branch.rebase begin --mode apply" rebase="complete ✓, the branch is rebased"
    HELD_PATHS="$ASIDE_HELD_PATHS"
    MAIN_CHANGED="$ASIDE_MAIN_CHANGED"
    SUPERSEDED="$ASIDE_SUPERSEDED"

    # success!
    print_turtle_header "righteous!"
    print_tree_start "git.branch.rebase begin --mode apply"
    echo "   ├─ rebase"
    echo "   │  ├─ target: origin/$DEFAULT_BRANCH"
    echo "   │  ├─ commits: $COMMIT_COUNT ✓"
    echo "   │  └─ status: clean"
    [[ -n "$HELD_PATHS" ]] && print_aside_report held="$HELD_PATHS" main_changed="$MAIN_CHANGED" superseded="$SUPERSEDED"
    echo "   └─ git.output"
    print_git_output_tree "$GIT_OUTPUT"
    print_aside_hint main_changed="$MAIN_CHANGED" superseded="$SUPERSEDED"
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

  # check if the rebase stopped (a conflict, or a stop with no conflict)
  if is_rebase_in_progress; then
    CONFLICT_FILES=$(get_conflict_files)
    CONFLICT_COMMIT=$(get_conflict_commit)

    # a stop with no conflict: git.output names what stopped it
    STOP_STATUS="conflict"
    SETTLE_STEP="settle conflicts in files above"
    if [[ -z "$CONFLICT_FILES" ]]; then
      STOP_STATUS="stopped (no conflict)"
      SETTLE_STEP="clear what stopped it, per git.output below"
    fi

    print_turtle_header "hang tight..."
    print_tree_start "git.branch.rebase begin --mode apply"
    echo "   ├─ rebase"
    echo "   │  ├─ target: origin/$DEFAULT_BRANCH"
    echo "   │  ├─ commits: $COMMIT_COUNT"
    echo "   │  └─ status: $STOP_STATUS"
    if [[ -n "$CONFLICT_FILES" ]]; then
      echo "   ├─ conflict"
      if [[ -n "$CONFLICT_COMMIT" ]]; then
        echo "   │  ├─ commit: $CONFLICT_COMMIT"
      fi
      echo "   │  └─ files"
      print_files_tree "   │     " "$CONFLICT_FILES"
    fi
    print_aside_held_branch superseded=""
    print_rebase_next_steps settle_step="$SETTLE_STEP"
    echo "   └─ git.output"
    print_git_output_tree "$GIT_OUTPUT"
    print_coconut_hint "settle the conflicts in the files above, stage them, then continue" \
      "rhx git.stage.add <files>" \
      "rhx git.branch.rebase continue"
    exit 1
  fi

  # the rebase failed to start: put held paths back at once
  set_held_paths_put_back label="git.branch.rebase begin --mode apply" rebase="never started; the branch is as it was"
  HELD_PATHS="$ASIDE_HELD_PATHS"
  SUPERSEDED="$ASIDE_SUPERSEDED"

  # a file in the way is the caller's to clear (constraint); all else is a malfunction
  # .note = git's prose is pinned to LC_ALL=C at the pull, so this match holds on any host locale
  START_HEADER="bummer dude..."
  START_ERROR="💥 MalfunctionError: rebase failed to start"
  START_EXIT=1
  if grep -q 'would be overwritten' <<< "$GIT_OUTPUT"; then
    START_HEADER="hold up dude..."
    START_ERROR="✋ ConstraintError: rebase blocked: a local file sits where main writes one"
    START_EXIT=2
  fi
  emit_both "$(
    print_turtle_header "$START_HEADER"
    print_tree_start "git.branch.rebase begin --mode apply"
    echo "   ├─ $START_ERROR"
    [[ -n "$HELD_PATHS" ]] && print_aside_report held="$HELD_PATHS" main_changed="" superseded="$SUPERSEDED"
    echo "   └─ git.output"
    print_git_output_tree "$GIT_OUTPUT"
    print_coconut_hint "git.output names the cause; once it is cleared, rerun (the tree is as it was)" \
      "rhx git.branch.rebase begin --mode apply${UNSTAGED:+ --unstaged $UNSTAGED}"
  )"
  exit "$START_EXIT"
fi

# unreachable: --mode is validated at parse
emit_both "💥 MalfunctionError: begin reached no mode branch (mode: $MODE)"
exit 1
