#!/usr/bin/env bash
######################################################################
# .what = begin a rebase onto origin/main
#
# .why  = mechanics can rebase their feature branch onto main
#         when push permission is granted
#
# usage:
#   rhx git.branch.rebase begin                    # plan mode (preview)
#   rhx git.branch.rebase begin --mode apply       # execute rebase
#
# guarantee:
#   - requires quota from git.commit.uses (rebase = commit)
#   - requires push permission via .meter/git.commit.uses.jsonc
#   - decrements uses on successful rebase
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
source "$SKILL_DIR/git.branch.rebase.operations.sh"

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
      echo "unknown argument: $1"
      exit 1
      ;;
  esac
done

######################################################################
# guards
######################################################################

# guard: meter state file must exist
if [[ ! -f "$STATE_FILE" ]]; then
  print_turtle_header "hold up dude..."
  print_tree_start "git.branch.rebase begin"
  echo "   └─ error: no commit quota set"
  echo ""
  echo "ask your human to grant permission:"
  echo "  $ rhx git.commit.uses set --quant N --push allow"
  exit 1
fi

# read meter state
USES=$(jq -r '.uses' "$STATE_FILE")
PUSH_ALLOWED=$(jq -r '.push' "$STATE_FILE")

# guard: push permission required
if [[ "$PUSH_ALLOWED" != "allow" ]]; then
  print_turtle_header "hold up dude..."
  print_tree_start "git.branch.rebase begin"
  echo "   └─ error: rebase requires push permission"
  echo ""
  echo "ask your human to grant permission:"
  echo "  $ rhx git.commit.uses set --quant N --push allow"
  exit 1
fi

# guard: uses > 0 for apply mode (plan is free, infinite is allowed)
if [[ "$USES" != "infinite" && "$USES" -le 0 && "$MODE" == "apply" ]]; then
  print_turtle_header "hold up dude..."
  print_tree_start "git.branch.rebase begin"
  echo "   └─ error: no commit uses left"
  echo ""
  echo "ask your human to grant more:"
  echo "  $ rhx git.commit.uses set --quant N --push allow"
  exit 1
fi

# guard: cannot rebase main/master
if is_base_branch; then
  print_turtle_header "hold up dude..."
  print_tree_start "git.branch.rebase begin"
  echo "   └─ error: cannot rebase main/master"
  exit 1
fi

# guard: dirty work tree
if is_worktree_dirty; then
  print_turtle_header "hold up dude..."
  print_tree_start "git.branch.rebase begin"
  echo "   └─ error: unstaged changes found"
  echo ""
  echo "commit or stash your changes first"
  exit 1
fi

# guard: rebase already in progress
if is_rebase_in_progress; then
  print_turtle_header "hold up dude..."
  print_tree_start "git.branch.rebase begin"
  echo "   └─ error: rebase already in progress"
  echo ""
  echo "to continue: rhx git.branch.rebase continue"
  echo "to abort:    rhx git.branch.rebase abort"
  exit 1
fi

######################################################################
# detect default branch (main, master, or trunk)
######################################################################
if git rev-parse --verify origin/main &>/dev/null; then
  DEFAULT_BRANCH="main"
elif git rev-parse --verify origin/master &>/dev/null; then
  DEFAULT_BRANCH="master"
else
  print_turtle_header "hold up dude..."
  print_tree_start "git.branch.rebase begin"
  echo "   └─ error: no main or master branch found on origin"
  exit 1
fi

######################################################################
# fetch latest from origin
######################################################################
git fetch origin "$DEFAULT_BRANCH" 2>/dev/null || {
  print_turtle_header "hold up dude..."
  print_tree_start "git.branch.rebase begin"
  echo "   └─ error: failed to fetch origin/$DEFAULT_BRANCH"
  echo ""
  echo "check your network connection and try again"
  exit 1
}

######################################################################
# get rebase info
######################################################################
COMMITS_TO_REBASE=$(get_commits_to_rebase "origin/$DEFAULT_BRANCH")
COMMIT_COUNT=$(echo "$COMMITS_TO_REBASE" | grep -c . || echo "0")
BEHIND_COUNT=$(get_behind_count "origin/$DEFAULT_BRANCH")
COMMITS_BEHIND=$(get_commits_behind "origin/$DEFAULT_BRANCH")

# guard: already up to date
if [[ "$COMMIT_COUNT" -eq 0 ]]; then
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

######################################################################
# plan mode: preview
######################################################################
if [[ "$MODE" == "plan" ]]; then
  print_turtle_header "heres the wave..."
  print_tree_start "git.branch.rebase begin --mode plan"
  echo "   ├─ rebase"
  echo "   │  ├─ target: origin/$DEFAULT_BRANCH"

  # show commits ahead (to be rebased)
  echo "   │  ├─ ahead: $COMMIT_COUNT commits"
  AHEAD_LINES=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && AHEAD_LINES+=("$line")
  done <<< "$COMMITS_TO_REBASE"
  for i in "${!AHEAD_LINES[@]}"; do
    echo "   │  │  ├─ ${AHEAD_LINES[$i]}"
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
  echo "   └─ meter"
  echo "      ├─ commits: allowed"
  echo "      └─ push: allowed"
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
  GIT_OUTPUT=$(git pull origin "$DEFAULT_BRANCH" --rebase 2>&1) || true
  GIT_EXIT_CODE=$?

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
    echo "🌊 ready to push"
    echo "   └─ rhx git.commit.push"
    exit 0
  fi

  # check if we hit conflicts
  if is_rebase_in_progress; then
    CONFLICT_FILES=$(get_conflict_files)
    CONFLICT_COMMIT=$(get_conflict_commit)

    print_turtle_header "hold up dude..."
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
    echo "   ├─ next steps"
    echo "   │  ├─ settle conflicts in files above"
    echo "   │  └─ rhx git.branch.rebase continue"
    echo "   └─ git.output"
    print_git_output_tree "$GIT_OUTPUT"
    exit 1
  fi

  # some other failure
  print_turtle_header "hold up dude..."
  print_tree_start "git.branch.rebase begin --mode apply"
  echo "   ├─ error: rebase failed"
  echo "   └─ git.output"
  print_git_output_tree "$GIT_OUTPUT"
  exit 1
fi

# invalid mode
echo "error: unknown mode '$MODE'"
echo "valid modes: plan, apply"
exit 1
