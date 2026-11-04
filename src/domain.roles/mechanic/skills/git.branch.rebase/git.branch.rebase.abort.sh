#!/usr/bin/env bash
######################################################################
# .what = abort a rebase and restore to pre-rebase state
#
# .why  = mechanics can escape from a stuck rebase and try again
#
# usage:
#   rhx git.branch.rebase abort
#   rhx git.branch.rebase abort --unstaged ignore   # set a fresh unstaged
#                                                   # edit aside too
#
# guarantee:
#   - with a rebase in progress: restores branch to state before rebase
#     started, then puts every held path back byte for byte
#   - with no rebase but paths still set aside (a prior run died, or a
#     put-back failed): puts every held path back (recovery)
#   - a fresh edit at a path not held, outside the conflict files, is
#     refused (exit 2) unless --unstaged ignore, which sets it aside too
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
        "usage: git.branch.rebase abort [--unstaged ignore]" \
        ignore
      shift 2
      ;;
    --help|-h)
      print_turtle_header "heres the wave..."
      print_tree_start "git.branch.rebase abort"
      echo "   ├─ what"
      echo "   │  ├─ abort a rebase and restore to pre-rebase state"
      echo "   │  └─ with no rebase in progress, puts back any paths still set aside"
      echo "   ├─ usage"
      echo "   │  └─ rhx git.branch.rebase abort [--unstaged ignore]"
      echo "   ├─ args"
      echo "   │  └─ --unstaged ignore    set a fresh unstaged edit aside too; put back after"
      echo "   └─ examples"
      echo "      ├─ rhx git.branch.rebase abort"
      echo "      └─ rhx git.branch.rebase abort --unstaged ignore"
      exit 0
      ;;
    *)
      emit_both "$(
        print_turtle_header "hold up dude..."
        print_tree_start "git.branch.rebase abort"
        echo "   └─ ✋ ConstraintError: unknown argument: $1"
        echo "      └─ usage: rhx git.branch.rebase abort [--unstaged ignore]"
        print_coconut_hint "see each arg it takes" "rhx git.branch.rebase abort --help"
      )"
      exit 2
      ;;
  esac
done

######################################################################
# recovery: no rebase, but paths still set aside
######################################################################
if ! is_rebase_in_progress && is_aside_held; then
  set_held_paths_put_back label="git.branch.rebase abort" rebase="none in progress; the branch is untouched"
  HELD_PATHS="$ASIDE_HELD_PATHS"
  SUPERSEDED="$ASIDE_SUPERSEDED"
  print_turtle_header "no worries dude"
  print_tree_start "git.branch.rebase abort"
  # a store claimed but never filled held no path: it is just cleared
  if [[ -z "$HELD_PATHS" ]]; then
    echo "   └─ status: no rebase in progress; an empty set-aside store cleared"
    exit 0
  fi
  print_aside_report held="$HELD_PATHS" main_changed="" superseded="$SUPERSEDED"
  echo "   └─ status: no rebase in progress; held paths put back"
  print_aside_hint main_changed="" superseded="$SUPERSEDED"
  exit 0
fi

######################################################################
# guards
######################################################################

# guard: must be in a rebase
if ! is_rebase_in_progress; then
  emit_both "$(
    print_turtle_header "hold up dude..."
    print_tree_start "git.branch.rebase abort"
    echo "   └─ ✋ ConstraintError: no rebase in progress"
  )"
  exit 2
fi

# guard: a fresh edit at a path not held needs an explicit choice
NOT_HELD_FILES=$(get_unstaged_files_not_held)
if [[ -n "$NOT_HELD_FILES" && -z "$UNSTAGED" ]]; then
  emit_both "$(
    print_turtle_header "hold up dude..."
    print_tree_start "git.branch.rebase abort"
    echo "   └─ ✋ ConstraintError: unstaged changes found at paths not set aside"
    print_files_tree "      " "$NOT_HELD_FILES"
    print_coconut_hint "set them aside too; each is put back after the abort" \
      "rhx git.branch.rebase abort --unstaged ignore"
  )"
  exit 2
fi

######################################################################
# set fresh edits aside
######################################################################
set_fresh_edits_aside label="git.branch.rebase abort" rerun="rhx git.branch.rebase abort --unstaged ignore" not_held="$NOT_HELD_FILES"
SUPERSEDED="$ASIDE_SUPERSEDED"

######################################################################
# execute abort
######################################################################
ABORT_OUTPUT=""
if ! ABORT_OUTPUT=$(git rebase --abort 2>&1); then
  # abort failed somehow; any held paths stay aside for a retry
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.branch.rebase abort"
    echo "   ├─ 💥 MalfunctionError: abort failed"
    if is_aside_held; then
      echo "   ├─ unstaged (set aside)"
      echo "   │  ├─ still held aside"
      print_files_tree "   │  │  " "$(get_held_paths)"
      echo "   │  └─ store kept: $(get_aside_dir)"
    fi
    print_aside_superseded superseded="$SUPERSEDED"
    echo "   └─ git.output"
    print_git_output_tree "$ABORT_OUTPUT"
    print_coconut_hint "once git.output's cause is cleared, retry" \
      "rhx git.branch.rebase abort"
  )"
  exit 1
fi

# put held paths back
# .note = no main-changed flag here: abort returns HEAD to the pre-rebase
#         head, so main changed no held path in the restored tree
set_held_paths_put_back label="git.branch.rebase abort" rebase="aborted; the branch is restored to its pre-rebase state" superseded="$SUPERSEDED"
HELD_PATHS="$ASIDE_HELD_PATHS"
SUPERSEDED="$ASIDE_SUPERSEDED"

print_turtle_header "no worries dude"
print_tree_start "git.branch.rebase abort"
[[ -n "$HELD_PATHS" ]] && print_aside_report held="$HELD_PATHS" main_changed="" superseded="$SUPERSEDED"
echo "   └─ status: restored to pre-rebase state"
print_aside_hint main_changed="" superseded="$SUPERSEDED"
exit 0
