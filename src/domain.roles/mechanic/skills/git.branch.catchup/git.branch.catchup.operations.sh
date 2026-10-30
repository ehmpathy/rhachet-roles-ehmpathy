#!/usr/bin/env bash
######################################################################
# .what = shared domain operations for git.branch.catchup subcommands
#
# .why  = one source for merge state, tree state, and the merge commit,
#         so begin, take, lock, continue, and abort read the same truth
#
# usage:
#   source "$SKILL_DIR/git.branch.catchup.operations.sh"
#   if is_merge_in_progress; then ...
######################################################################

# the one source the verb catches up from
CATCHUP_SOURCE_REMOTE="origin"
CATCHUP_SOURCE_BRANCH="main"
CATCHUP_SOURCE_REF="$CATCHUP_SOURCE_REMOTE/$CATCHUP_SOURCE_BRANCH"

# the line that names how and from what, on --help and every plan
CATCHUP_HOW_LINE="catch up via merge (no rewrite) from $CATCHUP_SOURCE_REF"

# the most behind-commits a plan lists before it summarizes the rest
CATCHUP_PLAN_COMMITS_SHOWN=10

######################################################################
# .what = is a merge in flight?
# .why  = MERGE_HEAD is git's own record; a rev-parse reads it in a
#         worktree too, where `.git` is a file and no `.git/` path exists
######################################################################
is_merge_in_progress() {
  git rev-parse -q --verify MERGE_HEAD >/dev/null 2>&1
}

######################################################################
# .what = is a rebase in flight?
# .why  = `--git-path` resolves the per-worktree state dir
######################################################################
is_rebase_in_progress() {
  [[ -d "$(git rev-parse --git-path rebase-merge)" ]] && return 0
  [[ -d "$(git rev-parse --git-path rebase-apply)" ]] && return 0
  return 1
}

######################################################################
# .what = the files git holds in conflict, one per line
######################################################################
get_conflict_files() {
  git diff --name-only --diff-filter=U 2>/dev/null
}

######################################################################
# .what = the tracked files with work not yet committed, staged OR unstaged
# .why  = a merge commit would fold either kind into a commit no one
#         reviews. the rebase guard reads only unstaged; this reads both
######################################################################
get_uncommitted_files() {
  { git diff --name-only; git diff --cached --name-only; } 2>/dev/null | sort -u
}

######################################################################
# .what = the current branch name ("HEAD" when detached)
######################################################################
get_current_branch() {
  git rev-parse --abbrev-ref HEAD 2>/dev/null
}

######################################################################
# .what = may the verb write to this branch?
# .why  = it never writes to main or master, and a detached HEAD has no
#         branch to catch up
######################################################################
is_branch_catchup_target() {
  local branch="$1"
  [[ "$branch" == "main" || "$branch" == "master" || "$branch" == "HEAD" ]] && return 1
  return 0
}

######################################################################
# .what = commit counts between HEAD and the source
######################################################################
get_behind_count() {
  git rev-list --count "HEAD..$CATCHUP_SOURCE_REF" 2>/dev/null
}
get_ahead_count() {
  git rev-list --count "$CATCHUP_SOURCE_REF..HEAD" 2>/dev/null
}

######################################################################
# .what = the newest commits the source holds that HEAD lacks, as
#         "sha subject", at most `limit` of them
# .why  = git applies the limit, never a `| head`: under pipefail a reader
#         that closes early kills the writer with SIGPIPE
######################################################################
get_commits_behind() {
  local limit="$1"
  git log --oneline -n "$limit" "HEAD..$CATCHUP_SOURCE_REF" 2>/dev/null
}

######################################################################
# .what = a PURE transformer: the merge commit header for a branch
# .why  = `cont` is commitlint's type for progress within a pr; a scope
#         is required by rule.require.commit-scopes
######################################################################
as_catchup_commit_header() {
  local branch="$1"
  echo "cont(branch): merge $CATCHUP_SOURCE_REF into $branch"
}

######################################################################
# .what = a PURE transformer: a commit count as words ("1 commit", "3 commits")
######################################################################
as_commit_count_phrase() {
  local count="$1"
  if [[ "$count" -eq 1 ]]; then
    echo "1 commit"
    return 0
  fi
  echo "$count commits"
}

######################################################################
# .what = a PURE transformer: the meter line a plan or result shows
######################################################################
as_catchup_meter_line() {
  local uses="$1"
  local after="$2"
  if [[ "$uses" == "infinite" ]]; then
    echo "left: unlimited"
    return 0
  fi
  if [[ -z "$after" ]]; then
    echo "left: $uses"
    return 0
  fi
  echo "left: $uses → $after"
}

######################################################################
# .what = print files as tree leaves under a prefix; the last closes
# usage: print_catchup_files_tree "   │  " "$FILES"
######################################################################
print_catchup_files_tree() {
  local prefix="$1"
  local files="$2"
  local lines=()
  local line
  while IFS= read -r line; do
    [[ -n "$line" ]] && lines+=("$line")
  done <<< "$files"

  local count=${#lines[@]}
  local i
  for i in "${!lines[@]}"; do
    local glyph='├─'
    [[ $((i + 1)) -eq $count ]] && glyph='└─'
    echo "${prefix}${glyph} ${lines[$i]}"
  done
}

######################################################################
# .what = print a header-first constraint refusal to both streams
#
# .why  = the verb's own refusals open with their class
#         (rule.require.qualified-error-headers), then the tree
#
# usage: emit_catchup_constraint "uncommitted changes in the tree" "$TREE"
######################################################################
emit_catchup_constraint() {
  local message="$1"
  local tree="$2"
  emit_both "✋ ConstraintError: $message

$tree"
}

######################################################################
# .what = print a header-first malfunction to both streams
######################################################################
emit_catchup_malfunction() {
  local message="$1"
  local tree="$2"
  emit_both "💥 MalfunctionError: $message

$tree"
}

######################################################################
# .what = make the merge commit for a settled merge in flight, and spend
#         one commit use
#
# .why  = begin (clean merge) and continue (settled merge) share this one
#         path, so the two cannot drift on author, trailer, or meter
#
# .note = `git merge` takes no `--author`, so the merge runs with
#         `--no-commit` and this step commits it. with MERGE_HEAD set, a
#         plain `git commit` records both parents
#
# .reads = ROBOT_NAME, ROBOT_EMAIL, SPONSOR_NAME, SPONSOR_EMAIL, USES,
#          PUSH_ALLOWED, STAGE_ALLOWED, STATE_FILE
# .sets  = CATCHUP_COMMIT_SHA, CATCHUP_USES_AFTER, CATCHUP_COMMIT_ERR
#
# returns: 0 on commit, 1 if git commit failed (merge stays in flight)
######################################################################
set_catchup_merge_commit() {
  local branch="$1"
  local header
  header=$(as_catchup_commit_header "$branch")

  local message="$header

Co-authored-by: $SPONSOR_NAME <$SPONSOR_EMAIL>"

  local err_file
  err_file=$(mktemp)
  if ! git commit \
    --author="$ROBOT_NAME <$ROBOT_EMAIL>" \
    --message="$message" \
    > /dev/null 2>"$err_file"; then
    CATCHUP_COMMIT_ERR=$(cat "$err_file")
    rm -f "$err_file"
    return 1
  fi
  rm -f "$err_file"

  CATCHUP_COMMIT_SHA=$(git rev-parse --short HEAD)
  CATCHUP_USES_AFTER=$(as_commit_uses_after_spend uses="$USES")
  set_commit_meter_state file="$STATE_FILE" uses="$CATCHUP_USES_AFTER" \
    push="$PUSH_ALLOWED" stage="$STAGE_ALLOWED"
  return 0
}

######################################################################
# .what = print the result tree of a committed merge, then the push nudge
######################################################################
print_catchup_committed() {
  local label="$1"
  local merge_line="$2"
  local branch="$3"

  print_turtle_header "righteous!"
  print_tree_start "$label"
  echo "   ├─ merge"
  echo "   │  ├─ from: $CATCHUP_SOURCE_REF"
  echo "   │  ├─ $merge_line"
  echo "   │  └─ status: committed"
  echo "   ├─ commit: $CATCHUP_COMMIT_SHA $(as_catchup_commit_header "$branch")"
  echo "   └─ meter"
  echo "      └─ $(as_catchup_meter_line "$CATCHUP_USES_AFTER" "")"
  echo ""
  echo "🌊 ready to push"
  echo "   └─ rhx git.commit.push --mode apply"
}

######################################################################
# .what = refuse a step that needs a merge in flight, when none is
# .why  = a step with no merge in flight refuses loud, never no-ops silent,
#         so a confused clone learns its state
######################################################################
refuse_if_no_merge_in_flight() {
  local label="$1"
  is_merge_in_progress && return 0

  emit_catchup_constraint "no merge in flight" "$(
    print_tree_start "$label"
    echo "   ├─ state: no catch-up merge is in flight"
    echo "   └─ fix: start one with rhx git.branch.catchup begin"
  )"
  exit 2
}

######################################################################
# .what = the meter grant command a human runs, with stage when asked
######################################################################
CATCHUP_GRANT_COMMAND="rhx git.commit.uses set --quant N --push allow"
CATCHUP_GRANT_STAGE_COMMAND="rhx git.commit.uses set --quant N --push allow --stage allow"
