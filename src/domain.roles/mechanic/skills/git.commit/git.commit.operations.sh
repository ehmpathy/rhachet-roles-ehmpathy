#!/usr/bin/env bash
######################################################################
# .what = shared domain operations for git.commit skills
#
# .why  = single source of truth for behavioral commit detection
#         avoids duplication between git.commit.set and git.commit.push
#
# usage:
#   source "$SCRIPT_DIR/git.commit.operations.sh"
#   COMMITS=$(get_behavioral_commits_on_branch)
#   FIRST_HASH=$(get_first_behavioral_commit_hash)
######################################################################

######################################################################
# global blocker constants (shared across git.commit skills)
######################################################################
ROLE_REPO="ehmpathy"
ROLE_SLUG="mechanic"
GLOBAL_METER_FILE="$HOME/.rhachet/storage/repo=$ROLE_REPO/role=$ROLE_SLUG/.meter/git.commit.uses.jsonc"

######################################################################
# helper: check if global blocker is active
# returns:
#   - 0 (success) if NOT blocked (continue)
#   - 2 if blocked (caller should exit 2)
#   - sets GLOBAL_BLOCK_REASON if blocked
######################################################################
check_global_blocker() {
  GLOBAL_BLOCK_REASON=""

  if [[ ! -f "$GLOBAL_METER_FILE" ]]; then
    return 0  # not blocked
  fi

  # check if file is valid json
  local blocked_val
  if ! blocked_val=$(jq -r '.blocked // false' "$GLOBAL_METER_FILE" 2>/dev/null); then
    GLOBAL_BLOCK_REASON="global blocker file corrupt"
    return 2
  fi

  if [[ "$blocked_val" == "true" ]]; then
    GLOBAL_BLOCK_REASON="commits blocked globally"
    return 2
  fi

  return 0  # not blocked
}

######################################################################
# helper: find the closest ancestor branch for current HEAD
# handles stacked branches (branch B created from branch A)
# returns:
#   - "NO_COMMITS" if repo has no commits
#   - "NO_BASE" if no base branch found
#   - "ON_BASE" if current branch is the base branch
#   - branch name (e.g., "origin/main" or "turtle/branch-a") otherwise
######################################################################
get_closest_ancestor_branch() {
  # fail fast: repo has no commits
  if ! git rev-parse HEAD >/dev/null 2>&1; then
    echo "NO_COMMITS"
    return 0
  fi

  # find base branch (prefer origin remote, fall back to local)
  local base_branch=""
  for candidate in origin/main origin/master origin/trunk main master trunk; do
    if git rev-parse --verify "$candidate" >/dev/null 2>&1; then
      base_branch="$candidate"
      break
    fi
  done

  # fail fast: no known default branch found
  if [[ -z "$base_branch" ]]; then
    echo "NO_BASE"
    return 0
  fi

  # fail fast: current branch IS the base branch
  local current_branch
  current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  local base_branch_name="${base_branch#origin/}"
  if [[ "$current_branch" == "$base_branch_name" ]]; then
    echo "ON_BASE"
    return 0
  fi

  # find closest ancestor branch (handles stacked branches)
  local closest_ancestor="$base_branch"
  local closest_distance=999999

  # compute distance to main
  local main_mb
  main_mb=$(git merge-base HEAD "$base_branch" 2>/dev/null || echo "")
  if [[ -n "$main_mb" ]]; then
    closest_distance=$(git rev-list --count "$main_mb"..HEAD 2>/dev/null || echo "999999")
  fi

  # check all local branches to find closer ancestor
  local branches
  branches=$(git branch --format='%(refname:short)' 2>/dev/null || echo "")
  while IFS= read -r branch; do
    [[ -z "$branch" ]] && continue
    [[ "$branch" == "$current_branch" ]] && continue
    [[ "$branch" == "$base_branch_name" ]] && continue

    local mb
    mb=$(git merge-base HEAD "$branch" 2>/dev/null || echo "")
    [[ -z "$mb" ]] && continue

    local dist
    dist=$(git rev-list --count "$mb"..HEAD 2>/dev/null || echo "999999")

    # closer ancestor found (must have commits unique to current branch)
    if [[ $dist -gt 0 && $dist -lt $closest_distance ]]; then
      closest_distance=$dist
      closest_ancestor="$branch"
    fi
  done <<< "$branches"

  echo "$closest_ancestor"
}

######################################################################
# helper: enumerate behavioral commits (fix/feat) on current branch
# accounts for stacked branches - only returns commits unique to THIS branch
# returns:
#   - "NO_COMMITS" if repo has no commits (fail fast)
#   - "NO_BASE" if no base branch found (fail fast)
#   - "ON_BASE" if current branch is the base branch (fail fast)
#   - commit subjects (one per line) if behavioral commits found
#   - empty string if no behavioral commits on branch
######################################################################
get_behavioral_commits_on_branch() {
  local ancestor
  ancestor=$(get_closest_ancestor_branch)

  # propagate fail-fast signals
  if [[ "$ancestor" == "NO_COMMITS" || "$ancestor" == "NO_BASE" || "$ancestor" == "ON_BASE" ]]; then
    echo "$ancestor"
    return 0
  fi

  # list commits on branch since closest ancestor (oldest first)
  # filter to fix: or feat: prefixed commits
  # note: grep returns exit 1 when no matches, || true prevents pipefail
  git log --reverse --format="%s" "$ancestor..HEAD" 2>/dev/null | \
    grep -E "^(fix|feat)(\([^)]+\))?:" || true
}

######################################################################
# helper: get HASH of first behavioral commit on branch
# accounts for stacked branches - only considers commits unique to THIS branch
# returns:
#   - "NO_COMMITS" if repo has no commits
#   - "NO_BASE" if no base branch found
#   - "ON_BASE" if current branch is the base branch
#   - commit hash if behavioral commit found
#   - empty string if no behavioral commits on branch
######################################################################
get_first_behavioral_commit_hash() {
  local ancestor
  ancestor=$(get_closest_ancestor_branch)

  # propagate fail-fast signals
  if [[ "$ancestor" == "NO_COMMITS" || "$ancestor" == "NO_BASE" || "$ancestor" == "ON_BASE" ]]; then
    echo "$ancestor"
    return 0
  fi

  # list commits on branch since closest ancestor (oldest first)
  # note: grep returns exit 1 when no matches, capture output to avoid pipefail
  local commits
  commits=$(git log --reverse --format="%H %s" "$ancestor..HEAD" 2>/dev/null || echo "")
  if [[ -z "$commits" ]]; then
    echo ""
    return 0
  fi

  # filter to behavioral commits and extract first hash
  local behavioral
  behavioral=$(echo "$commits" | grep -E "^[a-f0-9]+ (fix|feat)(\([^)]+\))?:" | head -n1 || echo "")
  if [[ -z "$behavioral" ]]; then
    echo ""
    return 0
  fi

  echo "$behavioral" | cut -d' ' -f1
}
