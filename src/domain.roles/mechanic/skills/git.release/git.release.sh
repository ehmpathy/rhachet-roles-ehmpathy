#!/usr/bin/env bash
######################################################################
# .what = release to main or prod with plan/apply pattern
#
# .why  = automates the release workflow:
#         - merge feature branch pr to main
#         - full release cycle: merge → watch CI → tag → deploy
#         - wraps extant git release alias with turtle vibes
#
# usage:
#   git.release --to main                           # plan: show pr status
#   git.release --to main --mode apply              # apply: enable automerge, watch
#   git.release --to prod                           # plan: show release pr status
#   git.release --to prod --mode apply              # apply: full release cycle
#   git.release --to main --mode apply --retry      # retry failed workflows
#
# guarantee:
#   - plan mode is default (safe preview)
#   - apply mode requires explicit flag
#   - watches CI until complete or timeout (5 min)
#   - surfaces errors with links and retry hints
######################################################################
set -euo pipefail

# get skill directory
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# source dependencies
source "$SKILL_DIR/output.sh"
source "$SKILL_DIR/git.release.operations.sh"

######################################################################
# argument parse
######################################################################
TO=""
MODE="plan"
RETRY="false"

while [[ $# -gt 0 ]]; do
  case $1 in
    --to)
      TO="$2"
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --retry)
      RETRY="true"
      shift
      ;;
    # rhachet passes these - ignore them
    --skill|--repo|--role)
      shift 2
      ;;
    --help|-h)
      echo "usage: git.release --to main|prod [--mode plan|apply] [--retry]"
      echo ""
      echo "  --to main     merge branch to main"
      echo "  --to prod     merge branch to main, merge release to main, watch release to prod"
      echo "  --mode plan   watch the branch or release (default)"
      echo "  --mode apply  enable automerge and watch the branch or release"
      echo "  --retry       rerun failed workflows before watch"
      exit 0
      ;;
    *)
      echo "error: unknown argument: $1" >&2
      echo "usage: git.release --to main|prod [--mode plan|apply] [--retry]" >&2
      exit 2
      ;;
  esac
done

######################################################################
# guards
######################################################################

# validate --to (required)
if [[ -z "$TO" ]]; then
  echo "error: --to is required (main or prod)" >&2
  exit 2
fi

# validate --to value
if [[ "$TO" != "main" && "$TO" != "prod" ]]; then
  echo "error: --to must be 'main' or 'prod', got '$TO'" >&2
  exit 2
fi

# validate --mode value
if [[ "$MODE" != "plan" && "$MODE" != "apply" ]]; then
  echo "error: --mode must be 'plan' or 'apply', got '$MODE'" >&2
  exit 2
fi

# ensure in git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository" >&2
  exit 2
fi

# detect tty for output mode (exported for output.sh)
export IS_TTY="false"
if [ -t 1 ]; then
  export IS_TTY="true"
fi

######################################################################
# keyrack token fetch (apply mode only)
######################################################################
GH_TOKEN=""

fetch_token_if_needed() {
  if [[ "$MODE" == "apply" ]]; then
    GH_TOKEN=$(fetch_github_token)
    if [[ -z "$GH_TOKEN" ]]; then
      print_turtle_header "bummer dude..."
      echo "🔐 github token not found"
      echo "   ├─ run: rhx keyrack unlock --owner ehmpath --prikey ~/.ssh/ehmpath --env all"
      echo "   └─ then retry this command"
      exit 1
    fi
    export GH_TOKEN
  fi
}

######################################################################
# watch loop
# poll CI status until complete or timeout (5 min)
# first 60s: poll every 5s
# after 60s: poll every 15s
######################################################################
watch_pr_checks() {
  local pr_number="$1"
  local start_time
  local ci_start_time
  local ci_start_time_set="false"
  local elapsed
  local in_action
  local poll_interval

  start_time=$(date +%s)
  ci_start_time="$start_time"  # fallback: CI started when we started the watch

  while true; do
    elapsed=$(( $(date +%s) - start_time ))

    # timeout after 5 minutes
    if [[ $elapsed -ge 300 ]]; then
      echo ""
      echo "   └─ ⏱️  timeout after 5 minutes"
      return 1
    fi

    # determine poll interval (allow override for tests)
    if [[ -n "${GIT_RELEASE_POLL_INTERVAL:-}" ]]; then
      poll_interval="$GIT_RELEASE_POLL_INTERVAL"
    elif [[ $elapsed -lt 60 ]]; then
      poll_interval=5
    else
      poll_interval=15
    fi

    # get current status
    local status_json
    status_json=$(get_pr_status "$pr_number")

    # set ci_start_time from oldest check startedAt (Gap 10)
    if [[ "$ci_start_time_set" == "false" ]]; then
      local oldest_started
      oldest_started=$(get_oldest_started_at "$status_json")
      if [[ -n "$oldest_started" && "$oldest_started" -gt 0 ]]; then
        ci_start_time="$oldest_started"
      fi
      ci_start_time_set="true"
    fi

    local counts
    counts=$(parse_check_counts "$status_json")

    local passed failed progress
    passed=$(echo "$counts" | grep -oP 'passed:\K\d+')
    failed=$(echo "$counts" | grep -oP 'failed:\K\d+')
    progress=$(echo "$counts" | grep -oP 'progress:\K\d+')

    # check if merged
    if [[ $(is_pr_merged "$status_json") == "true" ]]; then
      local elapsed_str in_action_str
      in_action=$(( $(date +%s) - ci_start_time ))
      in_action_str=$(format_elapsed "$in_action")
      elapsed_str=$(format_elapsed "$elapsed")
      echo "      └─ ✨ done! $in_action_str in action, $elapsed_str watched"
      return 0
    fi

    # check for failures
    if [[ $failed -gt 0 ]]; then
      echo ""
      print_check_status "failed" "$failed"
      show_failed_checks "$status_json"
      print_retry_hint
      return 1
    fi

    # check if rebase now needed (race: another PR merged while we watched)
    if [[ $(needs_rebase "$status_json") == "true" ]]; then
      echo ""
      if [[ $(has_conflicts "$status_json") == "true" ]]; then
        echo "   └─ 🐚 needs rebase, has conflicts (another PR merged while we watched)"
      else
        echo "   └─ 🐚 needs rebase (another PR merged while we watched)"
      fi
      echo ""
      echo "hint: rebase onto main and retry"
      return 2
    fi

    # show watch progress (stack lines for observability)
    local elapsed_str in_action_str
    in_action=$(( $(date +%s) - ci_start_time ))
    in_action_str=$(format_elapsed "$in_action")
    elapsed_str=$(format_elapsed "$elapsed")

    if [[ $progress -gt 0 ]]; then
      echo "      ├─ 💤 $progress left, $in_action_str in action, $elapsed_str watched"
    else
      echo "      ├─ 💤 await merge, $in_action_str in action, $elapsed_str watched"
    fi

    sleep "$poll_interval"
  done
}

######################################################################
# watch tag workflows (for --to prod)
######################################################################
watch_tag_workflows() {
  local tag="$1"
  local start_time
  local ci_start_time
  local elapsed
  local in_action
  local poll_interval

  start_time=$(date +%s)
  ci_start_time="$start_time"  # approximation: tag workflows started when we began the watch

  while true; do
    elapsed=$(( $(date +%s) - start_time ))

    # timeout after 5 minutes
    if [[ $elapsed -ge 300 ]]; then
      echo ""
      echo "      └─ ⏱️  timeout after 5 minutes"
      return 1
    fi

    # determine poll interval (allow override for tests)
    if [[ -n "${GIT_RELEASE_POLL_INTERVAL:-}" ]]; then
      poll_interval="$GIT_RELEASE_POLL_INTERVAL"
    elif [[ $elapsed -lt 60 ]]; then
      poll_interval=5
    else
      poll_interval=15
    fi

    # get tag runs
    local runs_json
    runs_json=$(get_tag_runs "$tag")

    # check for publish.yml or deploy.yml
    local publish_status deploy_status
    publish_status=$(echo "$runs_json" | jq -r '.[] | select(.name | test("publish"; "i")) | .conclusion // .status' | head -1)
    deploy_status=$(echo "$runs_json" | jq -r '.[] | select(.name | test("deploy"; "i")) | .conclusion // .status' | head -1)

    local target_status="${publish_status:-$deploy_status}"
    local target_name
    if [[ -n "$publish_status" ]]; then
      target_name="publish.yml"
    elif [[ -n "$deploy_status" ]]; then
      target_name="deploy.yml"
    else
      target_name="workflow"
    fi

    # check completion
    if [[ "$target_status" == "success" ]]; then
      local elapsed_str in_action_str
      in_action=$(( $(date +%s) - ci_start_time ))
      in_action_str=$(format_elapsed "$in_action")
      elapsed_str=$(format_elapsed "$elapsed")
      echo "      └─ ✨ done! $target_name, $in_action_str in action, $elapsed_str watched"
      return 0
    elif [[ "$target_status" == "failure" || "$target_status" == "cancelled" ]]; then
      print_tag_status "$target_name" "failed"
      return 1
    fi

    # show watch progress (stack lines for observability)
    local elapsed_str in_action_str
    in_action=$(( $(date +%s) - ci_start_time ))
    in_action_str=$(format_elapsed "$in_action")
    elapsed_str=$(format_elapsed "$elapsed")
    echo "      ├─ 💤 $target_name, $in_action_str in action, $elapsed_str watched"

    sleep "$poll_interval"
  done
}

######################################################################
# format elapsed time as human-readable
######################################################################
format_elapsed() {
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
# show failed checks with links (and optional retry)
# matches extant alias _git_release_report_failed_checks pattern
# has_more: if true, never mark last check as "is_last" (more items follow)
######################################################################
show_failed_checks() {
  local status_json="$1"
  local retry="${2:-false}"
  local has_more="${3:-false}"
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
    # only mark as last if this is the last check AND no more items follow
    if [[ $i -eq $count && "$has_more" != "true" ]]; then
      is_last="true"
    fi

    # extract run_id from url
    local run_id
    run_id=$(echo "$url" | grep -oP 'runs/\K\d+' || true)

    # get step name and duration for message (matches extant alias)
    local message="$conclusion"
    if [[ -n "$run_id" ]]; then
      # get failed step name
      local step_name
      step_name=$(get_failed_step_name "$run_id")

      # get duration
      local duration_secs
      duration_secs=$(get_run_duration "$run_id")

      # format message: "failed after Xm Ys" or step name
      if [[ -n "$duration_secs" && "$duration_secs" -gt 0 ]]; then
        local duration_str
        duration_str=$(format_duration "$duration_secs")
        message="failed after $duration_str"
      elif [[ -n "$step_name" ]]; then
        message="$step_name"
      fi
    fi

    # print check with optional retry
    if [[ "$retry" == "true" && -n "$run_id" ]]; then
      # failloud: let rerun errors propagate
      rerun_failed_workflows "$run_id"
      print_failed_check_with_retry "$name" "$url" "$message" "$is_last" "$run_id"
    else
      print_failed_check "$name" "$url" "$message" "$is_last"
    fi
  done < <(echo "$failed_json" | jq -c '.[]')
}

######################################################################
# dispatch: --to main
######################################################################
release_to_main() {
  local branch
  branch=$(get_current_branch)

  local default_branch
  default_branch=$(get_default_branch)

  # check if on default branch
  if [[ "$branch" == "$default_branch" ]]; then
    # show release pr or tag status
    release_from_main
    return
  fi

  # find pr for current branch
  local pr_number
  pr_number=$(get_pr_for_branch "$branch")

  if [[ -z "$pr_number" ]]; then
    # no pr found - constraint error (user must push)
    print_turtle_header "crickets..."
    print_no_pr_status "$branch" "$(get_unpushed_count)"
    return 2
  fi

  # get pr status
  local status_json
  status_json=$(get_pr_status "$pr_number")

  local counts
  counts=$(parse_check_counts "$status_json")

  local passed failed progress
  passed=$(echo "$counts" | grep -oP 'passed:\K\d+')
  failed=$(echo "$counts" | grep -oP 'failed:\K\d+')
  progress=$(echo "$counts" | grep -oP 'progress:\K\d+')

  # check for rebase needed - constraint error (user must rebase)
  if [[ $(needs_rebase "$status_json") == "true" ]]; then
    print_turtle_header "hold up dude..."
    echo "🐚 git.release --to main"
    print_release_header "$branch"
    print_check_status "passed" "$passed"
    print_rebase_status "$(has_conflicts "$status_json")"
    echo "   └─ 🌴 automerge unfound (use --mode apply to add)"
    return 2
  fi

  # plan mode
  if [[ "$MODE" == "plan" ]]; then
    print_turtle_header "heres the wave..."
    echo "🐚 git.release --to main --mode plan"
    print_release_header "$branch"

    # show failed with in-progress nested inside failure block (Gap 9)
    if [[ $failed -gt 0 ]]; then
      print_check_status "failed" "$failed"
      if [[ $progress -gt 0 ]]; then
        # has_more=true: in-progress line follows inside failure block
        show_failed_checks "$status_json" "false" "true"
        print_progress_in_failure "$progress"
      else
        show_failed_checks "$status_json"
      fi
    elif [[ $progress -gt 0 ]]; then
      print_check_status "progress" "$progress"
    else
      print_check_status "passed" "$passed"
    fi

    # check if already merged (fallback PR lookup case)
    if [[ $(is_pr_merged "$status_json") == "true" ]]; then
      echo "   └─ 🌴 already merged"
      return 0
    fi

    # automerge status (before hints)
    if [[ $(has_automerge "$status_json") == "true" ]]; then
      print_automerge_status "enabled"
    else
      print_automerge_status "unfound"
    fi

    # hints (always last)
    if [[ $failed -gt 0 ]]; then
      print_retry_hint
    else
      print_apply_hint
    fi
    return 0
  fi

  # apply mode
  fetch_token_if_needed

  if [[ $failed -gt 0 ]]; then
    print_turtle_header "bummer dude..."
    echo "🐚 git.release --to main --mode apply"
    print_release_header "$branch"
    print_check_status "failed" "$failed"
    show_failed_checks "$status_json" "$RETRY"
    print_retry_hint
    return 1
  fi

  print_turtle_header "cowabunga!"
  echo "🐚 git.release --to main --mode apply"
  print_release_header "$branch"

  if [[ $progress -gt 0 ]]; then
    print_check_status "progress" "$progress"
  else
    print_check_status "passed" "$passed"
  fi

  # enable automerge if not enabled
  local automerge_check
  automerge_check=$(has_automerge "$status_json")
  if [[ "$automerge_check" != "true" ]]; then
    # failloud: enable_automerge errors go direct to stderr, set -e exits on failure
    enable_automerge "$pr_number"

    # check if pr was instantly merged (all checks passed, no branch protection delay)
    local post_status
    post_status=$(get_pr_status "$pr_number")
    if [[ $(is_pr_merged "$post_status") == "true" ]]; then
      echo "   ├─ 🌴 automerge enabled [added] -> and merged already"
      print_watch_status
      echo "      └─ ✨ done! 0s in action, 0s watched"
      return 0
    fi

    print_automerge_status "enabled" "just added"
  else
    print_automerge_status "enabled"
  fi

  # start watch
  print_watch_status
  watch_pr_checks "$pr_number"
}

######################################################################
# dispatch: release from main (show release pr or tag status)
######################################################################
release_from_main() {
  local default_branch
  default_branch=$(get_default_branch)

  # look for release pr
  local release_pr
  release_pr=$(get_release_pr)

  if [[ -n "$release_pr" ]]; then
    # show release pr status
    local status_json
    status_json=$(get_pr_status "$release_pr")

    local counts
    counts=$(parse_check_counts "$status_json")

    local passed failed progress
    passed=$(echo "$counts" | grep -oP 'passed:\K\d+')
    failed=$(echo "$counts" | grep -oP 'failed:\K\d+')
    progress=$(echo "$counts" | grep -oP 'progress:\K\d+')

    print_turtle_header "heres the wave..."
    echo "🐚 git.release --to main"
    print_release_header "chore(release)"

    # show failed with in-progress nested inside failure block (Gap 9)
    if [[ $failed -gt 0 ]]; then
      print_check_status "failed" "$failed"
      if [[ $progress -gt 0 ]]; then
        show_failed_checks "$status_json" "false" "true"
        print_progress_in_failure "$progress"
      else
        show_failed_checks "$status_json"
      fi
    elif [[ $progress -gt 0 ]]; then
      print_check_status "progress" "$progress"
    else
      print_check_status "passed" "$passed"
    fi

    if [[ $(has_automerge "$status_json") == "true" ]]; then
      echo "   └─ 🌴 automerge enabled [found]"
    else
      echo "   └─ 🌴 automerge unfound (use --mode apply to add)"
    fi

    return 0
  fi

  # no release pr, show latest tag
  local latest_tag
  latest_tag=$(get_latest_tag)

  if [[ -n "$latest_tag" ]]; then
    print_turtle_header "heres the wave..."
    echo "🐚 git.release --to main"
    echo "🌊 release: $latest_tag"
    echo "   └─ no release pr open"
  else
    print_turtle_header "crickets..."
    echo "🐚 git.release --to main"
    echo "🫧 no tags or release pr found"
  fi
}

######################################################################
# dispatch: --to prod
######################################################################
release_to_prod() {
  local current_branch
  current_branch=$(get_current_branch)

  local default_branch
  default_branch=$(get_default_branch)

  # if on feature branch, must have open pr to proceed
  if [[ "$current_branch" != "$default_branch" ]]; then
    local branch_pr
    branch_pr=$(get_pr_for_branch "$current_branch")

    if [[ -z "$branch_pr" ]]; then
      # no pr for feature branch - constraint error (user must push)
      print_turtle_header "hold up dude..."
      echo "🐚 git.release --to prod"
      echo ""
      echo "🫧 no open pr for $current_branch"
      echo "   └─ did you git.commit.push to create the pr yet?"
      return 2
    fi

    # run --to main flow first
    release_to_main

    # if plan mode, stop here (don't show prod stuff too)
    if [[ "$MODE" == "plan" ]]; then
      return 0
    fi

    # apply mode: verify feature branch merged before next step
    local post_status
    post_status=$(get_pr_status "$branch_pr")
    if [[ $(is_pr_merged "$post_status") != "true" ]]; then
      # feature branch didn't merge - stop here
      return 1
    fi

    echo ""
  fi

  # look for release pr
  local release_pr
  release_pr=$(get_release_pr)

  # plan mode
  if [[ "$MODE" == "plan" ]]; then
    if [[ -n "$release_pr" ]]; then
      local status_json
      status_json=$(get_pr_status "$release_pr")

      local counts
      counts=$(parse_check_counts "$status_json")

      local passed failed progress
      passed=$(echo "$counts" | grep -oP 'passed:\K\d+')
      failed=$(echo "$counts" | grep -oP 'failed:\K\d+')
      progress=$(echo "$counts" | grep -oP 'progress:\K\d+')

      print_turtle_header "heres the wave..."
      echo "🐚 git.release --to prod --mode plan"
      print_release_header "chore(release)"

      # show failed with in-progress nested inside failure block (Gap 9)
      if [[ $failed -gt 0 ]]; then
        print_check_status "failed" "$failed"
        if [[ $progress -gt 0 ]]; then
          show_failed_checks "$status_json" "false" "true"
          print_progress_in_failure "$progress"
        else
          show_failed_checks "$status_json"
        fi
      elif [[ $progress -gt 0 ]]; then
        print_check_status "progress" "$progress"
      else
        print_check_status "passed" "$passed"
      fi

      echo "   └─ hint: use --mode apply to merge and watch tag workflows"
    else
      # no release pr
      local latest_tag
      latest_tag=$(get_latest_tag)

      print_turtle_header "heres the wave..."
      echo "🐚 git.release --to prod --mode plan"
      echo ""
      if [[ -n "$latest_tag" ]]; then
        echo "🌊 release: $latest_tag"

        # check tag workflows
        local runs_json
        runs_json=$(get_tag_runs "$latest_tag")

        local publish_status deploy_status
        publish_status=$(echo "$runs_json" | jq -r '.[] | select(.name | test("publish"; "i")) | .conclusion // .status' | head -1)
        deploy_status=$(echo "$runs_json" | jq -r '.[] | select(.name | test("deploy"; "i")) | .conclusion // .status' | head -1)

        if [[ -n "$publish_status" ]]; then
          echo "   ├─ publish.yml: $publish_status"
        elif [[ -n "$deploy_status" ]]; then
          echo "   ├─ deploy.yml: $deploy_status"
        else
          echo "   ├─ no publish/deploy workflows found"
        fi
        echo "   └─ no release pr open"
      else
        echo "🫧 no tags or release pr found"
      fi
    fi

    return 0
  fi

  # apply mode
  fetch_token_if_needed

  if [[ -n "$release_pr" ]]; then
    local status_json
    status_json=$(get_pr_status "$release_pr")

    local counts
    counts=$(parse_check_counts "$status_json")

    local passed failed progress
    passed=$(echo "$counts" | grep -oP 'passed:\K\d+')
    failed=$(echo "$counts" | grep -oP 'failed:\K\d+')
    progress=$(echo "$counts" | grep -oP 'progress:\K\d+')

    if [[ $failed -gt 0 ]]; then
      print_turtle_header "bummer dude..."
      echo "🐚 git.release --to prod --mode apply"
      print_release_header "chore(release)"
      print_check_status "failed" "$failed"
      show_failed_checks "$status_json" "$RETRY"
      print_retry_hint
      return 1
    fi

    print_turtle_header "radical!"
    echo "🐚 git.release --to prod --mode apply"
    print_release_header "chore(release)"

    if [[ $progress -gt 0 ]]; then
      print_check_status "progress" "$progress"
    else
      print_check_status "passed" "$passed"
    fi

    # enable automerge if not enabled
    if [[ $(has_automerge "$status_json") != "true" ]]; then
      # failloud: enable_automerge errors go direct to stderr, set -e exits on failure
      enable_automerge "$release_pr"

      print_automerge_status "enabled" "just added"
    else
      print_automerge_status "enabled"
    fi

    # watch release pr merge
    print_watch_status
    if ! watch_pr_checks "$release_pr"; then
      return 1
    fi

    # wait for tag creation
    sleep 10

    # get new tag
    local new_tag
    new_tag=$(get_latest_tag)

    if [[ -n "$new_tag" ]]; then
      echo ""
      echo "🌊 release: $new_tag"
      print_watch_status
      watch_tag_workflows "$new_tag"
    else
      echo ""
      echo "🫧 no new tag detected"
      return 1
    fi
  else
    # no release pr, watch latest tag workflows
    local latest_tag
    latest_tag=$(get_latest_tag)

    if [[ -z "$latest_tag" ]]; then
      print_turtle_header "crickets..."
      echo "🐚 git.release --to prod --mode apply"
      echo "🫧 no tags or release pr found"
      return 1
    fi

    print_turtle_header "radical!"
    echo "🐚 git.release --to prod --mode apply"
    echo ""
    echo "🌊 release: $latest_tag"

    # handle retry for tag workflows (silent, then watch will show status)
    if [[ "$RETRY" == "true" ]]; then
      local runs_json
      runs_json=$(get_tag_runs "$latest_tag")

      while IFS= read -r run; do
        local conclusion run_id url
        conclusion=$(echo "$run" | jq -r '.conclusion')
        url=$(echo "$run" | jq -r '.url')

        if [[ "$conclusion" == "failure" || "$conclusion" == "cancelled" ]]; then
          run_id=$(echo "$url" | grep -oP 'runs/\K\d+')
          if [[ -n "$run_id" ]]; then
            # failloud: let rerun errors propagate
            rerun_failed_workflows "$run_id"
          fi
        fi
      done < <(echo "$runs_json" | jq -c '.[]')
    fi

    print_watch_status
    watch_tag_workflows "$latest_tag"
  fi
}

######################################################################
# main dispatch
######################################################################
if [[ "$TO" == "main" ]]; then
  release_to_main
elif [[ "$TO" == "prod" ]]; then
  release_to_prod
fi
