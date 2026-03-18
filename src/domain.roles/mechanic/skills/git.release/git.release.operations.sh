#!/usr/bin/env bash
######################################################################
# .what = shared domain operations for git.release skill
#
# .why  = single source of truth for gh operations with retry logic
#         avoids duplication between --to main and --to prod flows
#
# usage:
#   source "$SKILL_DIR/git.release.operations.sh"
#   PR_NUMBER=$(get_pr_for_branch "$branch")
#   STATUS=$(get_pr_status "$pr_number")
######################################################################

######################################################################
# _gh_with_retry
# retry gh commands on transient network errors (3x, 5s delay)
# reimplements extant alias logic from ~/.bash_aliases
#
# usage: _gh_with_retry gh pr list ...
# returns: gh command output, exits on failure after 3 retries
######################################################################
_gh_with_retry() {
  local max_retries=3
  local delay=5
  local attempt=1
  local output
  local exit_code

  while [[ $attempt -le $max_retries ]]; do
    # capture output and exit code; avoid set -e exit on failure
    output=$("$@" 2>&1) && exit_code=0 || exit_code=$?

    if [[ $exit_code -eq 0 ]]; then
      echo "$output"
      return 0
    fi

    # check for transient errors (rate limit, network)
    if echo "$output" | grep -qiE "(rate limit|timeout|connection|network|temporary)"; then
      if [[ $attempt -lt $max_retries ]]; then
        sleep "$delay"
        ((attempt++))
        continue
      fi
    fi

    # non-transient error or retries exhausted - failloud to stderr
    if [[ -n "$output" ]]; then
      echo "$output" >&2
    else
      echo "gh command failed with exit code $exit_code" >&2
    fi
    return $exit_code
  done

  echo "$output" >&2
  return 1
}

######################################################################
# get_pr_for_branch
# find PR number for a branch (open first, then merged as fallback)
#
# usage: get_pr_for_branch "turtle/feature-x"
# returns: PR number or empty if not found
######################################################################
get_pr_for_branch() {
  local branch="$1"
  local result

  # check open PRs first
  result=$(_gh_with_retry gh pr list --head "$branch" --state open --json number --jq '.[0].number // empty')

  # fallback to merged PRs
  if [[ -z "$result" ]]; then
    result=$(_gh_with_retry gh pr list --head "$branch" --state merged --json number --jq '.[0].number // empty')
  fi

  echo "$result"
}

######################################################################
# get_release_pr
# find open release PR (semantic-release format: "chore(release): vX.Y.Z")
#
# usage: get_release_pr
# returns: PR number or empty if not found
######################################################################
get_release_pr() {
  local result

  result=$(_gh_with_retry gh pr list --state open --json number,title --jq '.[] | select(.title | startswith("chore(release):")) | .number' | head -1)
  echo "$result"
}

######################################################################
# get_pr_status
# get PR status details (checks, automerge, merge state)
#
# usage: get_pr_status "42"
# returns: JSON with statusCheckRollup, autoMergeRequest, mergeStateStatus
######################################################################
get_pr_status() {
  local pr_number="$1"
  local result

  result=$(_gh_with_retry gh pr view "$pr_number" --json statusCheckRollup,autoMergeRequest,mergeStateStatus,state)
  echo "$result"
}

######################################################################
# parse_check_counts
# parse check status JSON and return counts
#
# usage: parse_check_counts "$status_json"
# returns: "passed:N failed:N progress:N"
######################################################################
parse_check_counts() {
  local status_json="$1"
  local passed=0
  local failed=0
  local progress=0

  # parse statusCheckRollup array
  while IFS= read -r check; do
    local conclusion
    local status
    conclusion=$(echo "$check" | jq -r '.conclusion // empty')
    status=$(echo "$check" | jq -r '.status // empty')

    if [[ "$conclusion" == "SUCCESS" ]]; then
      ((passed++))
    elif [[ "$conclusion" == "FAILURE" || "$conclusion" == "CANCELLED" || "$conclusion" == "TIMED_OUT" ]]; then
      ((failed++))
    elif [[ "$status" != "COMPLETED" ]]; then
      ((progress++))
    fi
  done < <(echo "$status_json" | jq -c '.statusCheckRollup[]? // empty')

  echo "passed:$passed failed:$failed progress:$progress"
}

######################################################################
# get_failed_checks
# get details of failed checks
#
# usage: get_failed_checks "$status_json"
# returns: JSON array of failed checks with name, url, description
######################################################################
get_failed_checks() {
  local status_json="$1"

  echo "$status_json" | jq -c '[.statusCheckRollup[]? | select(.conclusion == "FAILURE" or .conclusion == "CANCELLED" or .conclusion == "TIMED_OUT") | {name: .name, url: .detailsUrl, conclusion: .conclusion}]'
}

######################################################################
# get_oldest_started_at
# get the oldest startedAt timestamp from statusCheckRollup
# (for accurate "in action" time calculation)
#
# usage: get_oldest_started_at "$status_json"
# returns: epoch timestamp (seconds) or empty if not available
######################################################################
get_oldest_started_at() {
  local status_json="$1"
  local oldest_iso

  # get the oldest (minimum) startedAt from all checks
  oldest_iso=$(echo "$status_json" | jq -r '[.statusCheckRollup[]? | .startedAt // empty] | map(select(. != null and . != "")) | sort | .[0] // empty')

  if [[ -z "$oldest_iso" || "$oldest_iso" == "null" ]]; then
    return 0
  fi

  # convert ISO timestamp to epoch seconds
  date -d "$oldest_iso" +%s 2>/dev/null || return 0
}

######################################################################
# has_automerge
# check if automerge is enabled on PR
#
# usage: has_automerge "$status_json"
# returns: "true" or "false"
######################################################################
has_automerge() {
  local status_json="$1"
  local automerge

  automerge=$(echo "$status_json" | jq -r '.autoMergeRequest // empty')
  if [[ -n "$automerge" && "$automerge" != "null" ]]; then
    echo "true"
  else
    echo "false"
  fi
}

######################################################################
# needs_rebase
# check if PR needs rebase
#
# usage: needs_rebase "$status_json"
# returns: "true" or "false"
######################################################################
needs_rebase() {
  local status_json="$1"
  local merge_state

  merge_state=$(echo "$status_json" | jq -r '.mergeStateStatus // empty')
  if [[ "$merge_state" == "BEHIND" || "$merge_state" == "DIRTY" ]]; then
    echo "true"
  else
    echo "false"
  fi
}

######################################################################
# get_merge_state
# get the merge state status (BEHIND, DIRTY, CLEAN, etc.)
#
# usage: get_merge_state "$status_json"
# returns: merge state string (BEHIND, DIRTY, CLEAN, BLOCKED, etc.)
######################################################################
get_merge_state() {
  local status_json="$1"

  echo "$status_json" | jq -r '.mergeStateStatus // empty'
}

######################################################################
# has_conflicts
# check if PR has merge conflicts (DIRTY state)
#
# usage: has_conflicts "$status_json"
# returns: "true" or "false"
######################################################################
has_conflicts() {
  local status_json="$1"
  local merge_state

  merge_state=$(echo "$status_json" | jq -r '.mergeStateStatus // empty')
  if [[ "$merge_state" == "DIRTY" ]]; then
    echo "true"
  else
    echo "false"
  fi
}

######################################################################
# is_pr_merged
# check if PR is merged
#
# usage: is_pr_merged "$status_json"
# returns: "true" or "false"
######################################################################
is_pr_merged() {
  local status_json="$1"
  local state

  state=$(echo "$status_json" | jq -r '.state // empty')
  if [[ "$state" == "MERGED" ]]; then
    echo "true"
  else
    echo "false"
  fi
}

######################################################################
# enable_automerge
# enable automerge on PR via gh pr merge --auto --squash
#
# handles "clean status" error: when PR is ready to merge now, gh returns
# "GraphQL: Pull request is in clean status (enablePullRequestAutoMerge)"
# this is NOT an error - it means the PR merged or can merge immediately.
# we suppress this specific error and let the caller check merge status.
#
# usage: enable_automerge "42"
# returns: 0 on success or "clean status", non-zero on actual errors
######################################################################
enable_automerge() {
  local pr_number="$1"
  local output
  local exit_code

  # capture output and exit code; avoid set -e exit on failure
  # output goes to /dev/null on success (matches extant alias)
  output=$(gh pr merge "$pr_number" --auto --squash 2>&1) && exit_code=0 || exit_code=$?

  if [[ $exit_code -eq 0 ]]; then
    # suppress success output (alias sends to /dev/null)
    return 0
  fi

  # check for "clean status" error - PR is ready to merge now, not an error
  if echo "$output" | grep -qi "clean status"; then
    # suppress error, let caller check if PR merged
    return 0
  fi

  # actual error - failloud
  echo "$output" >&2
  return $exit_code
}

######################################################################
# get_tag_runs
# list workflow runs for a tag
#
# usage: get_tag_runs "v1.2.3"
# returns: JSON array of runs with name, conclusion, status, url
######################################################################
get_tag_runs() {
  local tag="$1"

  _gh_with_retry gh run list --branch "$tag" --json name,conclusion,status,url
}

######################################################################
# rerun_failed_workflows
# rerun failed workflows for a run ID
#
# usage: rerun_failed_workflows "12345678"
# returns: gh command output
######################################################################
rerun_failed_workflows() {
  local run_id="$1"

  _gh_with_retry gh run rerun "$run_id" --failed
}

######################################################################
# get_failed_step_name
# get the name of the failed step from a workflow run
#
# usage: get_failed_step_name "12345678"
# returns: step name or empty if unavailable
######################################################################
get_failed_step_name() {
  local run_id="$1"
  local result

  # query jobs and extract failed step name (matches extant alias pattern)
  result=$(_gh_with_retry gh run view "$run_id" --json jobs -q '.jobs[] | select(.conclusion == "failure") | (.steps[] | select(.conclusion == "failure") | .name) // .name' 2>/dev/null | head -1) || true

  echo "$result"
}

######################################################################
# get_run_duration
# get duration of a workflow run in seconds
#
# usage: get_run_duration "12345678"
# returns: duration in seconds, or empty if unavailable
######################################################################
get_run_duration() {
  local run_id="$1"
  local run_json
  local started_at updated_at
  local start_epoch end_epoch

  run_json=$(_gh_with_retry gh run view "$run_id" --json startedAt,updatedAt 2>/dev/null) || return 0

  started_at=$(echo "$run_json" | jq -r '.startedAt // empty')
  updated_at=$(echo "$run_json" | jq -r '.updatedAt // empty')

  if [[ -z "$started_at" || -z "$updated_at" ]]; then
    return 0
  fi

  # convert ISO timestamps to epoch seconds
  start_epoch=$(date -d "$started_at" +%s 2>/dev/null) || return 0
  end_epoch=$(date -d "$updated_at" +%s 2>/dev/null) || return 0

  echo $(( end_epoch - start_epoch ))
}

######################################################################
# format_duration
# format duration in seconds to human-readable "Xm Ys"
#
# usage: format_duration "154"
# returns: "2m 34s"
######################################################################
format_duration() {
  local seconds="$1"
  local mins=$(( seconds / 60 ))
  local secs=$(( seconds % 60 ))

  if [[ $mins -gt 0 ]]; then
    echo "${mins}m ${secs}s"
  else
    echo "${secs}s"
  fi
}

######################################################################
# get_latest_tag
# get the most recent semver tag (fetches from remote first)
#
# usage: get_latest_tag
# returns: tag name (e.g., "v1.2.3")
######################################################################
get_latest_tag() {
  # fetch tags from remote to ensure we have latest
  git fetch --tags --quiet 2>/dev/null || true
  git tag --sort=-v:refname | head -1
}

######################################################################
# fetch_github_token
# fetch GitHub token from keyrack (same pattern as git.commit.push)
#
# usage: fetch_github_token
# returns: token or empty if not available
######################################################################
fetch_github_token() {
  local token

  # try keyrack first
  token=$(rhachet keyrack get --key EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN 2>/dev/null || true)

  if [[ -z "$token" ]]; then
    # try fallback unlock
    if rhx keyrack unlock --owner ehmpath --prikey ~/.ssh/ehmpath --env all 2>/dev/null; then
      token=$(rhachet keyrack get --key EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN 2>/dev/null || true)
    fi
  fi

  echo "$token"
}

######################################################################
# get_default_branch
# get the default branch name for the repo
#
# usage: get_default_branch
# returns: branch name (e.g., "main" or "master")
######################################################################
get_default_branch() {
  git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main"
}

######################################################################
# get_current_branch
# get the current branch name
#
# usage: get_current_branch
# returns: branch name
######################################################################
get_current_branch() {
  git rev-parse --abbrev-ref HEAD
}

######################################################################
# get_unpushed_count
# count commits not pushed to origin
#
# usage: get_unpushed_count
# returns: count
######################################################################
get_unpushed_count() {
  local branch
  branch=$(get_current_branch)
  git rev-list --count "origin/$branch..HEAD" 2>/dev/null || echo "0"
}
