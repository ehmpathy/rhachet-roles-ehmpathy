#!/usr/bin/env bash
######################################################################
# .what = continue a rebase after conflicts are settled
#
# .why  = mechanics can continue rebase after they fix conflicts
#         and stage the settled files
#
# usage:
#   rhx git.branch.rebase continue
#   rhx git.branch.rebase continue --unstaged ignore   # set a fresh
#                                                      # unstaged edit aside too
#
# guarantee:
#   - requires a rebase in progress
#   - requires all conflicts to be settled (staged)
#   - preserves original commit authors
#   - sets committer to seaturtle[bot]
#   - a fresh edit at a held path is superseded by the held copy, and named
#   - a fresh edit at a path not held is refused (exit 2) unless
#     --unstaged ignore, which sets it aside too
#   - on completion, puts every held path back byte for byte
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMIT_SKILL_DIR="$(cd "$SKILL_DIR/../git.commit" && pwd)"

# source shared utils
source "$COMMIT_SKILL_DIR/output.sh"
source "$SKILL_DIR/git.branch.rebase.operations.sh"
source "$SKILL_DIR/git.branch.rebase.aside.operations.sh"

######################################################################
# parse arguments
######################################################################
UNSTAGED=""

while [[ $# -gt 0 ]]; do
  case $1 in
    # rhachet passes these - ignore them
    --skill|--repo|--role)
      shift 2
      ;;
    --unstaged)
      UNSTAGED="${2:-}"
      validate_enum_arg "$UNSTAGED" "--unstaged" \
        "usage: git.branch.rebase continue [--unstaged ignore]" \
        ignore
      shift 2
      ;;
    --help|-h)
      print_turtle_header "heres the wave..."
      print_tree_start "git.branch.rebase continue"
      echo "   ├─ what"
      echo "   │  ├─ continue a rebase once its conflicts are settled"
      echo "   │  └─ once the rebase completes, puts back any paths set aside"
      echo "   ├─ usage"
      echo "   │  └─ rhx git.branch.rebase continue [--unstaged ignore]"
      echo "   ├─ args"
      echo "   │  └─ --unstaged ignore    set a fresh unstaged edit aside too; put back after"
      echo "   └─ examples"
      echo "      ├─ rhx git.branch.rebase continue"
      echo "      └─ rhx git.branch.rebase continue --unstaged ignore"
      exit 0
      ;;
    *)
      emit_both "$(
        print_turtle_header "hold up dude..."
        print_tree_start "git.branch.rebase continue"
        echo "   └─ ✋ ConstraintError: unknown argument: $1"
        echo "      └─ usage: rhx git.branch.rebase continue [--unstaged ignore]"
        print_coconut_hint "see each arg it takes" "rhx git.branch.rebase continue --help"
      )"
      exit 2
      ;;
  esac
done

######################################################################
# guards
######################################################################

# guard: must be in a rebase
if ! is_rebase_in_progress; then
  # a held store with no rebase is put back by abort, not continue
  if is_aside_held; then
    emit_both "$(
      print_turtle_header "hold up dude..."
      print_tree_start "git.branch.rebase continue"
      print_aside_held_refusal \
        when_held="no rebase in progress, but paths are still set aside" \
        when_empty="no rebase in progress, but an empty set-aside store remains"
    )"
    exit 2
  fi
  emit_both "$(
    print_turtle_header "hold up dude..."
    print_tree_start "git.branch.rebase continue"
    print_no_rebase_error
    # a cutover in flight already names its own moves; else, point to begin
    [[ -f "$(get_git_dir)/cutover/state.json" ]] || print_coconut_hint "start one first" \
      "rhx git.branch.rebase begin --mode apply"
  )"
  exit 2
fi

# guard: conflicts must be settled
CONFLICT_FILES=$(get_conflict_files)
if [[ -n "$CONFLICT_FILES" ]]; then
  CONFLICT_COMMIT=$(get_conflict_commit)
  emit_both "$(
    print_turtle_header "hang tight..."
    print_tree_start "git.branch.rebase continue"
    echo "   ├─ rebase"
    echo "   │  └─ status: conflict"
    echo "   ├─ conflict"
    if [[ -n "$CONFLICT_COMMIT" ]]; then
      echo "   │  ├─ commit: $CONFLICT_COMMIT"
    fi
    echo "   └─ files"
    print_files_tree "      " "$CONFLICT_FILES"
    print_coconut_hint "settle the conflicts in the files above, stage them, then continue" \
      "rhx git.stage.add <files>" \
      "rhx git.branch.rebase continue"
  )"
  exit 1
fi

# guard: a fresh edit at a path not held needs an explicit choice
NOT_HELD_FILES=$(get_unstaged_files_not_held)
if [[ -n "$NOT_HELD_FILES" && -z "$UNSTAGED" ]]; then
  emit_both "$(
    print_turtle_header "hold up dude..."
    print_tree_start "git.branch.rebase continue"
    echo "   └─ ✋ ConstraintError: unstaged changes found at paths not set aside"
    print_files_tree "      " "$NOT_HELD_FILES"
    print_coconut_hint "stage them if they are resolution work; or set them aside too, put back after (a set-aside edit stays out of the commit)" \
      "rhx git.stage.add $(as_shell_words "$NOT_HELD_FILES")" \
      "rhx git.branch.rebase continue --unstaged ignore"
  )"
  exit 2
fi

######################################################################
# set fresh edits aside
######################################################################
set_fresh_edits_aside label="git.branch.rebase continue" rerun="rhx git.branch.rebase continue --unstaged ignore" not_held="$NOT_HELD_FILES"
SUPERSEDED="$ASIDE_SUPERSEDED"

######################################################################
# set seaturtle identity (committer only - preserve original author)
######################################################################
export GIT_COMMITTER_NAME="seaturtle[bot]"
export GIT_COMMITTER_EMAIL="seaturtle@ehmpath.com"

######################################################################
# get progress info before continue
######################################################################
TOTAL_COMMITS=$(get_total_commits)

######################################################################
# execute continue
######################################################################
# note: git rebase --continue may prompt for commit message
# use GIT_EDITOR=true to auto-accept default message
export GIT_EDITOR="true"

# capture git output
GIT_OUTPUT=$(git rebase --continue 2>&1) || true

# check if still in progress (more commits to process) or complete
if ! is_rebase_in_progress; then
  # put held paths back
  set_held_paths_put_back label="git.branch.rebase continue" rebase="complete ✓, the branch is rebased" superseded="$SUPERSEDED"
  HELD_PATHS="$ASIDE_HELD_PATHS"
  MAIN_CHANGED="$ASIDE_MAIN_CHANGED"
  SUPERSEDED="$ASIDE_SUPERSEDED"

  # rebase complete!
  print_turtle_header "righteous!"
  print_tree_start "git.branch.rebase continue"
  echo "   ├─ rebase"
  echo "   │  ├─ commits: $TOTAL_COMMITS ✓"
  echo "   │  └─ status: complete"
  [[ -n "$HELD_PATHS" ]] && print_aside_report held="$HELD_PATHS" main_changed="$MAIN_CHANGED" superseded="$SUPERSEDED"
  echo "   ├─ meter"
  echo "   │  └─ push: held"
  echo "   └─ git.output"
  print_git_output_tree "$GIT_OUTPUT"
  print_aside_hint main_changed="$MAIN_CHANGED" superseded="$SUPERSEDED"
  echo ""
  echo "🌊 ready to push"
  echo "   └─ rhx git.commit.push"
  exit 0
fi

# still in progress - check for conflicts
NEW_CONFLICTS=$(get_conflict_files)
if [[ -n "$NEW_CONFLICTS" ]]; then
  CONFLICT_COMMIT=$(get_conflict_commit)
  emit_both "$(
    print_turtle_header "hang tight..."
    print_tree_start "git.branch.rebase continue"
    echo "   ├─ rebase"
    echo "   │  └─ status: conflict"
    echo "   ├─ conflict"
    if [[ -n "$CONFLICT_COMMIT" ]]; then
      echo "   │  ├─ commit: $CONFLICT_COMMIT"
    fi
    echo "   │  └─ files"
    print_files_tree "   │     " "$NEW_CONFLICTS"
    print_aside_held_branch superseded="$SUPERSEDED"
    print_rebase_next_steps settle_step="settle conflicts in files above"
    echo "   └─ git.output"
    print_git_output_tree "$GIT_OUTPUT"
  )"
  exit 1
fi

# unstaged edits after the continue: the guards above clear them before
# git runs, so only a hook or a concurrent writer could leave them here
UNSTAGED_FILES=$(get_unstaged_files)
if [[ -n "$UNSTAGED_FILES" ]]; then
  emit_both "$(
    print_turtle_header "hold up dude..."
    print_tree_start "git.branch.rebase continue"
    echo "   ├─ ✋ ConstraintError: unstaged changes block continue"
    print_files_tree "   │  " "$UNSTAGED_FILES"
    print_aside_superseded superseded="$SUPERSEDED"
    echo "   └─ git.output"
    print_git_output_tree "$GIT_OUTPUT"
    print_coconut_hint "stage them as resolution work, or set them aside, then continue" \
      "rhx git.stage.add $(as_shell_words "$UNSTAGED_FILES")" \
      "rhx git.branch.rebase continue --unstaged ignore"
  )"
  exit 2
fi

# in progress but no conflicts or unstaged - show progress
NEW_COMMITS_LEFT=$(get_commits_left)
print_turtle_header "righteous!"
print_tree_start "git.branch.rebase continue"
echo "   ├─ rebase"
echo "   │  └─ status: in progress"
echo "   ├─ left: $(as_commit_count count="$NEW_COMMITS_LEFT")"
print_aside_held_branch superseded="$SUPERSEDED"
echo "   └─ git.output"
print_git_output_tree "$GIT_OUTPUT"
exit 0
