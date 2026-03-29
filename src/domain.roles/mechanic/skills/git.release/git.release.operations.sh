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
# find release PR (semantic-release format: "chore(release): vX.Y.Z")
# searches open first, then merged as fallback (similar to get_pr_for_branch)
#
# usage: get_release_pr
# returns: PR number or empty if not found
# exits: 1 if multiple release PRs found (ambiguous)
######################################################################
get_release_pr() {
  local result

  # check open PRs first
  result=$(_gh_with_retry gh pr list --state open --json number,title --jq '.[] | select(.title | startswith("chore(release):")) | .number')

  # fail fast if ambiguous (multiple open release PRs)
  local count
  # note: grep -c outputs count AND exits 1 when count is 0; use || true to avoid set -e exit
  count=$(echo "$result" | grep -c . 2>/dev/null) || true
  if [[ $count -gt 1 ]]; then
    echo "error: multiple release PRs found ($count), expected at most one" >&2
    return 1
  fi

  # fallback to merged PRs (most recent)
  if [[ -z "$result" ]]; then
    result=$(_gh_with_retry gh pr list --state merged --limit 1 --json number,title --jq '.[] | select(.title | startswith("chore(release):")) | .number')
  fi

  echo "$result"
}

######################################################################
# extract_tag_from_release_title
# extract version tag from release PR title
#
# usage: extract_tag_from_release_title "chore(release): v1.2.3 🎉"
# returns: "v1.2.3"
######################################################################
extract_tag_from_release_title() {
  local title="$1"
  # extract vX.Y.Z from "chore(release): vX.Y.Z ..." or "chore(release): vX.Y.Z"
  echo "$title" | sed -n 's/.*chore(release): \(v[0-9]*\.[0-9]*\.[0-9]*\).*/\1/p'
}

######################################################################
# get_release_pr_title
# get the title of the release PR
# searches open first, then merged as fallback (similar to get_pr_for_branch)
#
# usage: get_release_pr_title
# returns: PR title or empty if not found
# exits: 1 if multiple release PRs found (ambiguous)
######################################################################
get_release_pr_title() {
  local result

  # check open PRs first
  result=$(_gh_with_retry gh pr list --state open --json number,title --jq '.[] | select(.title | startswith("chore(release):")) | .title')

  # fail fast if ambiguous (multiple open release PRs)
  local count
  # note: grep -c outputs count AND exits 1 when count is 0; use || true to avoid set -e exit
  count=$(echo "$result" | grep -c . 2>/dev/null) || true
  if [[ $count -gt 1 ]]; then
    echo "error: multiple release PRs found ($count), expected at most one" >&2
    return 1
  fi

  # fallback to merged PRs (most recent)
  if [[ -z "$result" ]]; then
    result=$(_gh_with_retry gh pr list --state merged --limit 1 --json number,title --jq '.[] | select(.title | startswith("chore(release):")) | .title')
  fi

  echo "$result"
}

######################################################################
# get_latest_merged_release_pr_info
# get the title of the most recent merged release PR
#
# usage: get_latest_merged_release_pr_info
# returns: "title=<title>" or empty if not found
######################################################################
get_latest_merged_release_pr_info() {
  local result

  # get recent merged PRs and find the first release PR
  # note: limit 21 to find release PR even if other PRs merged after it
  result=$(_gh_with_retry gh pr list --state merged --limit 21 --json title --jq '[.[] | select(.title | startswith("chore(release):"))] | first | "title=\(.title)"')

  # jq returns "title=null" if no match found
  if [[ "$result" == *"title=null"* ]]; then
    echo ""
    return
  fi

  echo "$result"
}

######################################################################
# get_pr_status
# get PR status details (checks, automerge, merge state, title)
#
# usage: get_pr_status "42"
# returns: JSON with statusCheckRollup, autoMergeRequest, mergeStateStatus, state, title
######################################################################
get_pr_status() {
  local pr_number="$1"
  local result

  result=$(_gh_with_retry gh pr view "$pr_number" --json statusCheckRollup,autoMergeRequest,mergeStateStatus,state,title)
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
# get_latest_completed_at
# get the latest completedAt timestamp from statusCheckRollup
# (for accurate "in action" duration when checks finish)
#
# usage: get_latest_completed_at "$status_json"
# returns: epoch timestamp (seconds) or empty if not available
######################################################################
get_latest_completed_at() {
  local status_json="$1"
  local latest_iso

  # get the latest (maximum) completedAt from all completed checks
  latest_iso=$(echo "$status_json" | jq -r '[.statusCheckRollup[]? | .completedAt // empty] | map(select(. != null and . != "")) | sort | .[-1] // empty')

  if [[ -z "$latest_iso" || "$latest_iso" == "null" ]]; then
    return 0
  fi

  # convert ISO timestamp to epoch seconds
  date -d "$latest_iso" +%s 2>/dev/null || return 0
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
# get_pr_title
# get PR title from status JSON
#
# usage: get_pr_title "$status_json"
# returns: PR title string
######################################################################
get_pr_title() {
  local status_json="$1"

  echo "$status_json" | jq -r '.title // empty'
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
# returns: JSON array of runs with name, conclusion, status, url, startedAt
######################################################################
get_tag_runs() {
  local tag="$1"

  _gh_with_retry gh run list --branch "$tag" --json name,conclusion,status,url,startedAt,updatedAt
}

######################################################################
# get_oldest_tag_run_started_at
# get the oldest startedAt timestamp from tag workflow runs
# (for accurate "in action" time calculation)
#
# usage: get_oldest_tag_run_started_at "$runs_json"
# returns: epoch timestamp (seconds) or empty if not available
######################################################################
get_oldest_tag_run_started_at() {
  local runs_json="$1"
  local oldest_iso

  # get the oldest (minimum) startedAt from all runs
  oldest_iso=$(echo "$runs_json" | jq -r '[.[] | .startedAt // empty] | map(select(. != null and . != "")) | sort | .[0] // empty')

  if [[ -z "$oldest_iso" || "$oldest_iso" == "null" ]]; then
    return 0
  fi

  # convert ISO timestamp to epoch seconds
  date -d "$oldest_iso" +%s 2>/dev/null || return 0
}

######################################################################
# get_latest_tag_run_completed_at
# get the latest updatedAt timestamp from completed tag workflow runs
# (for accurate "in action" duration when workflows finish)
#
# usage: get_latest_tag_run_completed_at "$runs_json"
# returns: epoch timestamp (seconds) or empty if not available
######################################################################
get_latest_tag_run_completed_at() {
  local runs_json="$1"
  local latest_iso

  # get the latest (maximum) updatedAt from completed runs
  latest_iso=$(echo "$runs_json" | jq -r '[.[] | select(.status == "completed") | .updatedAt // empty] | map(select(. != null and . != "")) | sort | .[-1] // empty')

  if [[ -z "$latest_iso" || "$latest_iso" == "null" ]]; then
    return 0
  fi

  # convert ISO timestamp to epoch seconds
  date -d "$latest_iso" +%s 2>/dev/null || return 0
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

# source shared keyrack operations (fetch_github_token, require_github_token)
source "$SKILL_DIR/../git.commit/keyrack.operations.sh"

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

######################################################################
# show failed checks with links in watch context
# same as show_failed_checks but uses watch-level indentation
######################################################################
show_failed_checks_in_watch() {
  local status_json="$1"
  local in_progress_count="${2:-0}"
  local failed_json
  failed_json=$(get_failed_checks "$status_json")

  local count
  count=$(echo "$failed_json" | jq 'length')

  local i=0
  while IFS= read -r check; do
    local name url conclusion
    name=$(echo "$check" | jq -r '.name')
    url=$(echo "$check" | jq -r '.url')
    conclusion=$(echo "$check" | jq -r '.conclusion | ascii_downcase')

    i=$((i + 1))
    local is_last="false"
    # only mark as last if this is the last check AND no in-progress items follow
    if [[ $i -eq $count && "$in_progress_count" -eq 0 ]]; then
      is_last="true"
    fi

    # extract run_id from url
    local run_id
    run_id=$(echo "$url" | grep -oP 'runs/\K\d+' || true)

    # get step name and duration for message
    local message="$conclusion"
    if [[ -n "$run_id" ]]; then
      local step_name duration_secs
      step_name=$(get_failed_step_name "$run_id")
      duration_secs=$(get_run_duration "$run_id")

      if [[ -n "$duration_secs" && "$duration_secs" -gt 0 ]]; then
        local duration_str
        duration_str=$(format_duration "$duration_secs")
        message="failed after $duration_str"
      elif [[ -n "$step_name" ]]; then
        message="$step_name"
      fi
    fi

    print_watch_failed_check "$name" "$url" "$message" "$is_last"
  done < <(echo "$failed_json" | jq -c '.[]')

  # show in-progress count if any
  if [[ "$in_progress_count" -gt 0 ]]; then
    print_watch_progress_in_failure "$in_progress_count"
  fi
}

######################################################################
# show failed tag runs with links (watch context)
# matches structure of show_failed_checks but for tag workflow runs
# and uses watch-level indentation
######################################################################
show_failed_tag_runs() {
  local runs_json="$1"
  local in_progress_count="${2:-0}"

  # get failed runs
  local failed_runs
  failed_runs=$(echo "$runs_json" | jq -c '[.[] | select(.conclusion == "failure" or .conclusion == "cancelled")]')

  local failed_count
  failed_count=$(echo "$failed_runs" | jq 'length')

  # print header
  print_watch_check_status "failed" "$failed_count"

  # print each failed run
  local i=0
  while IFS= read -r run; do
    local name url conclusion run_id
    name=$(echo "$run" | jq -r '.name')
    url=$(echo "$run" | jq -r '.url')
    conclusion=$(echo "$run" | jq -r '.conclusion | ascii_downcase')

    # extract run_id from url
    run_id=$(echo "$url" | grep -oP 'runs/\K\d+' || true)

    # get duration for message
    local message="$conclusion"
    if [[ -n "$run_id" ]]; then
      local duration_secs
      duration_secs=$(get_run_duration "$run_id")

      if [[ -n "$duration_secs" && "$duration_secs" -gt 0 ]]; then
        local duration_str
        duration_str=$(format_duration "$duration_secs")
        message="failed after $duration_str"
      fi
    fi

    i=$((i + 1))
    local is_last="false"
    # only mark as last if this is the last check AND no in-progress items follow
    if [[ $i -eq $failed_count && "$in_progress_count" -eq 0 ]]; then
      is_last="true"
    fi

    print_watch_failed_check "$name" "$url" "$message" "$is_last"
  done < <(echo "$failed_runs" | jq -c '.[]')

  # show in-progress count if any
  if [[ "$in_progress_count" -gt 0 ]]; then
    print_watch_progress_in_failure "$in_progress_count"
  fi
}

######################################################################
# freshness-check operations for and_then_await
# these operations check that artifacts come AFTER a prior merge
######################################################################

######################################################################
# .what = get fresh release PR (commit-based freshness)
# .why  = ensures release PR comes AFTER the squash merge just performed,
#         prevents stale PRs from prior runs from pickup
#
# usage: get_fresh_release_pr prior_merge_commit
# returns: PR JSON (number, title, headRefOid) if fresh, empty if stale/not found
######################################################################
get_fresh_release_pr() {
  local prior_merge_commit="$1"
  local pr_json

  # try open PRs first
  pr_json=$(_gh_with_retry gh pr list --state open --json number,title,headRefOid --jq '.[] | select(.title | startswith("chore(release):"))')

  if [[ -n "$pr_json" ]]; then
    # check freshness via head commit
    local head_commit
    head_commit=$(echo "$pr_json" | jq -r '.headRefOid')

    # fetch the head commit so git merge-base can check ancestry locally
    git fetch origin "$head_commit" --quiet 2>/dev/null || true

    if git merge-base --is-ancestor "$prior_merge_commit" "$head_commit" 2>/dev/null; then
      echo "$pr_json"
      return 0
    fi
    # stale open PR - continue to check merged
  fi

  # try merged PRs (release PR might already be merged)
  pr_json=$(_gh_with_retry gh pr list --state merged --json number,title,mergeCommit --jq '.[] | select(.title | startswith("chore(release):"))' | head -n 1)

  if [[ -n "$pr_json" ]]; then
    # check freshness via merge commit (the squash commit on main)
    local merge_commit
    merge_commit=$(echo "$pr_json" | jq -r '.mergeCommit.oid')

    if git merge-base --is-ancestor "$prior_merge_commit" "$merge_commit" 2>/dev/null; then
      echo "$pr_json"
      return 0
    fi
    # stale merged PR
  fi

  # no fresh release PR found
  echo ""
}

######################################################################
# .what = get fresh release tag (commit-based freshness)
# .why  = ensures tag comes AFTER the squash merge just performed,
#         prevents stale tags from prior runs from pickup
#
# usage: get_fresh_release_tag expected_tag prior_merge_commit
# returns: tag commit sha if fresh, empty if stale/not found
######################################################################
get_fresh_release_tag() {
  local expected_tag="$1"
  local prior_merge_commit="$2"
  local tag_commit

  # fetch tags to ensure we have latest
  git fetch --tags --quiet 2>/dev/null || true

  # check if tag exists
  tag_commit=$(git rev-parse "refs/tags/$expected_tag" 2>/dev/null) || true

  # if tag not found, return empty
  if [[ -z "$tag_commit" ]]; then
    echo ""
    return 0
  fi

  # fetch the tag commit so git merge-base can check ancestry locally
  git fetch origin "$tag_commit" --quiet 2>/dev/null || true

  # check freshness: prior_merge_commit must be ancestor of tag_commit
  if git merge-base --is-ancestor "$prior_merge_commit" "$tag_commit" 2>/dev/null; then
    echo "$tag_commit"
  else
    # stale: tag_commit is not descended from prior_merge_commit
    echo ""
  fi
}

######################################################################
# .what = get release-please workflow status
# .why  = provides diagnostic info on timeout (why artifact did not appear)
#
# usage: get_release_please_status
# returns: JSON with status, conclusion, url; or "not_found"
######################################################################
get_release_please_status() {
  local run_json
  local default_branch

  # get default branch name
  default_branch=$(get_default_branch)

  # query release workflow runs on default branch
  # note: workflow name varies by repo (release.yml, release-please.yml, etc.)
  run_json=$(_gh_with_retry gh run list --workflow release.yml --branch "$default_branch" --limit 1 --json status,conclusion,url 2>/dev/null) || true

  # check if we got results
  if [[ -z "$run_json" || "$run_json" == "[]" ]]; then
    echo "not_found"
    return 0
  fi

  # extract first run
  echo "$run_json" | jq -c '.[0]'
}
