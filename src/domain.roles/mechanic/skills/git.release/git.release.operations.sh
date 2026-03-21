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
# wait_for_target
# poll until a release target (PR or tag run) appears
#
# usage:
#   wait_for_target "release_pr"           # wait for release PR to appear
#   wait_for_target "tag_run:v1.2.3"       # wait for tag run to appear
#
# returns:
#   0 if target found
#   1 if timeout (3 minutes)
#
# output format:
#   found immediately:
#     └─ ✨ found it! 0s in action, 0s watched
#
#   found after poll:
#     🫧 wait for it...
#        ├─ 💤 await release pr, 10s watched
#        ├─ 💤 await release pr, 20s watched
#        └─ ✨ found it! 25s in action, 23s watched
#
# exit codes:
#   0 = target found
#   1 = timeout on release_pr (error)
#   2 = timeout on tag_run (unfound, not error per spec)
######################################################################
wait_for_target() {
  local target="$1"
  local target_type="${target%%:*}"
  local target_value="${target#*:}"

  # determine poll interval
  local poll_interval
  if [[ "${GIT_RELEASE_TEST_MODE:-}" == "true" ]]; then
    poll_interval=0
  elif [[ -n "${GIT_RELEASE_POLL_INTERVAL:-}" ]]; then
    poll_interval="$GIT_RELEASE_POLL_INTERVAL"
  else
    poll_interval=10
  fi

  local start_time ci_start_time
  start_time=$(date +%s)
  ci_start_time="$start_time"

  local first_iteration="true"
  local found="false"
  local header_printed="false"
  local test_iterations=0

  while [[ "$found" == "false" ]]; do
    local elapsed
    elapsed=$(( $(date +%s) - start_time ))

    # timeout after 3 minutes
    if [[ $elapsed -ge 180 ]]; then
      if [[ "$header_printed" == "true" ]]; then
        echo "   └─ ⏱️  timeout after 3 minutes"
      else
        echo "   └─ ⏱️  timeout to await $target_type"
      fi
      # return 2 for tag_run (unfound per spec = exit 0), 1 for others (error)
      if [[ "$target_type" == "tag_run" ]]; then
        return 2
      fi
      return 1
    fi

    # check if target extant
    case "$target_type" in
      release_pr)
        local pr
        pr=$(get_release_pr 2>/dev/null) || true
        if [[ -n "$pr" ]]; then
          found="true"
        fi
        ;;
      tag_run)
        local runs
        runs=$(get_tag_runs "$target_value" 2>/dev/null) || true
        local run_count
        run_count=$(echo "$runs" | jq -r 'length // 0')
        if [[ "$run_count" -gt 0 ]]; then
          found="true"
          # update ci_start_time from the first run
          local first_started
          first_started=$(echo "$runs" | jq -r '.[0].startedAt // empty' 2>/dev/null) || true
          if [[ -n "$first_started" && "$first_started" != "null" ]]; then
            ci_start_time=$(date -d "$first_started" +%s 2>/dev/null || echo "$start_time")
          fi
        fi
        ;;
      *)
        echo "error: unknown target type: $target_type" >&2
        return 1
        ;;
    esac

    # print header on first iteration
    if [[ "$first_iteration" == "true" ]]; then
      echo ""
      echo "🫧 wait for it..."
      header_printed="true"
    fi

    # if found, show "found it!" and return
    if [[ "$found" == "true" ]]; then
      local in_action
      in_action=$(( $(date +%s) - ci_start_time ))
      echo "   └─ ✨ found it! $(format_duration "$in_action") in action, $(format_duration "$elapsed") watched"
      return 0
    fi

    # show await line
    local target_label
    case "$target_type" in
      release_pr) target_label="release pr" ;;
      tag_run) target_label="release run" ;;
    esac
    echo "   ├─ 💤 await $target_label, $(format_duration "$elapsed") watched"

    first_iteration="false"

    # skip actual sleep in test mode
    if [[ "$poll_interval" == "0" ]]; then
      # in test mode, exit after 2 iterations to prevent infinite loop
      # (elapsed time check fails because no wall-clock time passes without sleep)
      test_iterations=$((test_iterations + 1))
      if [[ $test_iterations -ge 3 ]]; then
        echo "   └─ ⏱️  timeout (test mode)"
        # return 2 for tag_run (unfound per spec = exit 0), 1 for others (error)
        if [[ "$target_type" == "tag_run" ]]; then
          return 2
        fi
        return 1
      fi
    else
      sleep "$poll_interval"
    fi
  done
}
