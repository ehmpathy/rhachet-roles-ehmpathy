#!/usr/bin/env bash
######################################################################
# .what = shared domain operations for git.branch.rebase skills
#
# .why  = single source of truth for rebase state detection
#         avoids duplication between git.branch.rebase.begin/continue/abort
#
# usage:
#   source "$SKILL_DIR/git.branch.rebase.operations.sh"
#   if is_rebase_in_progress; then ...
#   CONFLICT_FILES=$(get_conflict_files)
######################################################################

######################################################################
# get git directory (works in both regular repos and worktrees)
# returns: path to .git or worktree git dir
######################################################################
get_git_dir() {
  git rev-parse --git-dir 2>/dev/null
}

######################################################################
# detect if a rebase is currently in progress
# returns: 0 if in progress, 1 if idle
######################################################################
is_rebase_in_progress() {
  local git_dir
  git_dir=$(get_git_dir)
  if [[ -d "$git_dir/rebase-merge" ]] || [[ -d "$git_dir/rebase-apply" ]]; then
    return 0  # true
  fi
  return 1  # false
}

######################################################################
# get list of files with unresolved conflicts
# returns: newline-separated list of file paths
######################################################################
get_conflict_files() {
  git diff --name-only --diff-filter=U 2>/dev/null
}

######################################################################
# get count of commits left to rebase
# returns: number (0 if not in rebase or done)
######################################################################
get_commits_left() {
  local git_dir
  git_dir=$(get_git_dir)
  local total=0
  local done=0

  if [[ -f "$git_dir/rebase-merge/end" ]]; then
    total=$(cat "$git_dir/rebase-merge/end")
  elif [[ -f "$git_dir/rebase-apply/last" ]]; then
    total=$(cat "$git_dir/rebase-apply/last")
  fi

  if [[ -f "$git_dir/rebase-merge/msgnum" ]]; then
    done=$(cat "$git_dir/rebase-merge/msgnum")
  elif [[ -f "$git_dir/rebase-apply/next" ]]; then
    done=$(($(cat "$git_dir/rebase-apply/next") - 1))
  fi

  echo $((total - done))
}

######################################################################
# get current commit number in rebase (1-indexed)
# returns: number (0 if not in rebase)
######################################################################
get_current_commit_num() {
  local git_dir
  git_dir=$(get_git_dir)
  if [[ -f "$git_dir/rebase-merge/msgnum" ]]; then
    cat "$git_dir/rebase-merge/msgnum"
  elif [[ -f "$git_dir/rebase-apply/next" ]]; then
    cat "$git_dir/rebase-apply/next"
  else
    echo "0"
  fi
}

######################################################################
# get total commits in rebase
# returns: number (0 if not in rebase)
######################################################################
get_total_commits() {
  local git_dir
  git_dir=$(get_git_dir)
  if [[ -f "$git_dir/rebase-merge/end" ]]; then
    cat "$git_dir/rebase-merge/end"
  elif [[ -f "$git_dir/rebase-apply/last" ]]; then
    cat "$git_dir/rebase-apply/last"
  else
    echo "0"
  fi
}

######################################################################
# get the commit hash and subject that caused the conflict
# returns: "hash subject" or empty if not in conflict
######################################################################
get_conflict_commit() {
  local git_dir
  git_dir=$(get_git_dir)
  if [[ -f "$git_dir/rebase-merge/stopped-sha" ]]; then
    local sha
    sha=$(cat "$git_dir/rebase-merge/stopped-sha")
    local subject
    subject=$(git log -1 --format=%s "$sha" 2>/dev/null)
    echo "${sha:0:7} $subject"
  fi
}

######################################################################
# get commits that will be rebased (ahead of target)
# returns: newline-separated "hash subject" lines
######################################################################
get_commits_to_rebase() {
  local target="${1:-origin/main}"
  git log --oneline "${target}..HEAD" 2>/dev/null
}

######################################################################
# get count of commits behind target
# returns: number
######################################################################
get_behind_count() {
  local target="${1:-origin/main}"
  git rev-list --count "HEAD..${target}" 2>/dev/null || echo "0"
}

######################################################################
# get commits behind target (what main has that we don't)
# returns: newline-separated "hash subject" lines
######################################################################
get_commits_behind() {
  local target="${1:-origin/main}"
  git log --oneline "HEAD..${target}" 2>/dev/null
}

######################################################################
# get current branch name
# returns: branch name or HEAD if detached
######################################################################
get_current_branch() {
  git rev-parse --abbrev-ref HEAD 2>/dev/null
}

######################################################################
# check if current branch is main/master/trunk
# returns: 0 if main/master/trunk, 1 otherwise
######################################################################
is_base_branch() {
  local branch
  branch=$(get_current_branch)
  if [[ "$branch" == "main" || "$branch" == "master" ]]; then
    return 0
  fi
  return 1
}

######################################################################
# check if work tree has unstaged changes
# returns: 0 if dirty, 1 if clean
######################################################################
is_worktree_dirty() {
  local changes
  changes=$(git diff --name-only 2>/dev/null)
  if [[ -n "$changes" ]]; then
    return 0  # dirty
  fi
  return 1  # clean
}

######################################################################
# get list of files with unstaged modifications
# returns: newline-separated list of file paths
######################################################################
get_unstaged_files() {
  git diff --name-only 2>/dev/null
}

######################################################################
# check if push is allowed in meter
# returns: 0 if allowed, 1 if blocked
######################################################################
is_push_allowed() {
  local meter_file=".meter/git.commit.uses.jsonc"
  if [[ ! -f "$meter_file" ]]; then
    return 1  # no meter = no permission
  fi

  local push_status
  push_status=$(jq -r '.push // "block"' "$meter_file" 2>/dev/null)
  if [[ "$push_status" == "allow" ]]; then
    return 0
  fi
  return 1
}

######################################################################
# print git output as sub.bucket with proper format
# opens with ├─, content with │, closes with └─
# args: git_output (raw output from git command)
######################################################################
print_git_output_tree() {
  local git_output="$1"

  # clean and split on both newlines and carriage returns
  # remove ANSI escape sequences and control chars
  local cleaned
  cleaned=$(echo "$git_output" | \
    sed 's/\x1b\[[0-9;]*[A-Za-z]//g' | \
    tr '\r' '\n' | \
    sed 's/[[:cntrl:]]//g')

  # collect non-empty lines
  local lines=()
  while IFS= read -r line; do
    if [[ -n "$line" ]]; then
      lines+=("$line")
    fi
  done <<< "$cleaned"

  # print sub.bucket format: open, blank, content, blank, close
  if [[ ${#lines[@]} -gt 0 ]]; then
    echo "      ├─"
    echo "      │"
    for line in "${lines[@]}"; do
      echo "      │  $line"
    done
    echo "      │"
    echo "      └─"
  fi
}

######################################################################
# print files in tree format with proper termination
# args: prefix (e.g., "   │  │  "), files (newline-separated)
# last item with └─ instead of ├─
######################################################################
print_files_tree() {
  local prefix="$1"
  local files="$2"
  local count
  local i=0

  # count non-empty lines
  count=$(echo "$files" | grep -c . || echo "0")

  # print with proper termination
  while IFS= read -r file; do
    if [[ -n "$file" ]]; then
      ((i++)) || true
      if [[ $i -eq $count ]]; then
        echo "${prefix}└─ $file"
      else
        echo "${prefix}├─ $file"
      fi
    fi
  done <<< "$files"
}
