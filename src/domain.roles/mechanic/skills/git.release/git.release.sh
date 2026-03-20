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
#   git.release                                     # plan: show pr status (--to main default)
#   git.release --watch                             # watch CI without automerge
#   git.release --mode apply                        # enable automerge and watch
#   git.release --to prod                           # plan: show release pr status
#   git.release --to prod --watch                   # watch release CI without automerge
#   git.release --to prod --mode apply              # apply: full release cycle
#   git.release --retry                             # retry failed workflows
#
# guarantee:
#   - plan mode is default (safe preview)
#   - --watch watches without automerge
#   - apply mode enables automerge and watches
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
TO="main"
MODE="plan"
WATCH="false"
RETRY="false"
FROM_PROD="false"  # set by release_to_prod to suppress headers in release_to_main

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
    --watch)
      WATCH="true"
      shift
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
      echo "usage: git.release [--to main|prod] [--watch] [--mode plan|apply] [--retry]"
      echo ""
      echo "  --to main     merge branch to main (default)"
      echo "  --to prod     merge branch to main, merge release to main, watch release to prod"
      echo "  --watch       watch CI without automerge"
      echo "  --mode plan   show status only (default)"
      echo "  --mode apply  enable automerge and watch"
      echo "  --retry       rerun failed workflows before watch"
      exit 0
      ;;
    *)
      echo "error: unknown argument: $1" >&2
      echo "usage: git.release [--to main|prod] [--watch] [--mode plan|apply] [--retry]" >&2
      exit 2
      ;;
  esac
done

######################################################################
# guards
######################################################################

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
# delay between merges
# shows "💤 Ns delay to await next runners" and waits (unless test mode)
######################################################################
delay_for_next_pr() {
  local seconds="$1"
  local reason="${2:-next runners}"

  echo "💤 ${seconds}s delay to await $reason"

  # skip actual sleep in test mode
  if [[ "${GIT_RELEASE_TEST_MODE:-}" == "true" ]]; then
    return 0
  fi

  # also skip if POLL_INTERVAL is set to 0 (test acceleration)
  if [[ "${GIT_RELEASE_POLL_INTERVAL:-}" == "0" ]]; then
    return 0
  fi

  sleep "$seconds"
}

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
  local first_iteration="true"
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

    # determine poll interval (skip sleep in test mode)
    if [[ "${GIT_RELEASE_TEST_MODE:-}" == "true" ]]; then
      poll_interval=0
    elif [[ -n "${GIT_RELEASE_POLL_INTERVAL:-}" ]]; then
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
      if [[ "$first_iteration" == "true" ]]; then
        echo "      ├─ 🫧 no checks inflight"
      fi
      echo "      └─ ✨ done! $in_action_str in action, $elapsed_str watched"
      return 0
    fi

    # check for failures
    if [[ $failed -gt 0 ]]; then
      # show failure tree in watch context (same structure as tag workflow failures)
      print_watch_check_status "failed" "$failed"
      show_failed_checks_in_watch "$status_json" "$progress"
      print_watch_retry_hint
      return 1
    fi

    # check if rebase now needed (race: another PR merged while we watched)
    if [[ $(needs_rebase "$status_json") == "true" ]]; then
      # show done line with time stats, then rebase status as peer
      local in_action_now elapsed_now
      in_action_now=$(( $(date +%s) - ci_start_time ))
      elapsed_now=$(( $(date +%s) - start_time ))
      echo "      ├─ ✨ done! $(format_elapsed "$in_action_now") in action, $(format_elapsed "$elapsed_now") watched"
      if [[ $(has_conflicts "$status_json") == "true" ]]; then
        echo "      └─ 🐚 but, needs rebase now, has conflicts"
        echo -e "         └─ \033[2mhint: rhx git.branch.rebase begin\033[0m"
      else
        echo "      └─ 🐚 but, needs rebase now"
        echo -e "         └─ \033[2mhint: rhx git.branch.rebase begin\033[0m"
      fi
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

    first_iteration="false"
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
  local first_iteration="true"
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

    # determine poll interval (skip sleep in test mode)
    if [[ "${GIT_RELEASE_TEST_MODE:-}" == "true" ]]; then
      poll_interval=0
    elif [[ -n "${GIT_RELEASE_POLL_INTERVAL:-}" ]]; then
      poll_interval="$GIT_RELEASE_POLL_INTERVAL"
    elif [[ $elapsed -lt 60 ]]; then
      poll_interval=5
    else
      poll_interval=15
    fi

    # get tag runs
    local runs_json
    runs_json=$(get_tag_runs "$tag")

    # check if there are no workflows at all
    local total_runs
    total_runs=$(echo "$runs_json" | jq 'length')
    if [[ "$total_runs" == "0" ]]; then
      local elapsed_str in_action_str
      in_action=$(( $(date +%s) - ci_start_time ))
      in_action_str=$(format_elapsed "$in_action")
      elapsed_str=$(format_elapsed "$elapsed")
      echo "      ├─ 🫧 no runs inflight"
      echo "      └─ ✨ done! $in_action_str in action, $elapsed_str watched"
      return 0
    fi

    # count failed and in-progress runs
    local failed_count in_progress_count
    failed_count=$(echo "$runs_json" | jq '[.[] | select(.conclusion == "failure" or .conclusion == "cancelled")] | length')
    in_progress_count=$(echo "$runs_json" | jq '[.[] | select(.status != "completed")] | length')

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
      if [[ "$first_iteration" == "true" ]]; then
        echo "      ├─ 🫧 no runs inflight"
      fi
      echo "      └─ ✨ done! $target_name, $in_action_str in action, $elapsed_str watched"
      return 0
    elif [[ "$target_status" == "failure" || "$target_status" == "cancelled" ]]; then
      # show failure tree (same structure as PR check failures)
      show_failed_tag_runs "$runs_json" "$in_progress_count"
      print_watch_retry_hint
      return 1
    fi

    # show watch progress (stack lines for observability)
    local elapsed_str in_action_str
    in_action=$(( $(date +%s) - ci_start_time ))
    in_action_str=$(format_elapsed "$in_action")
    elapsed_str=$(format_elapsed "$elapsed")
    echo "      ├─ 💤 $target_name, $in_action_str in action, $elapsed_str watched"

    first_iteration="false"
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
    if [[ "$FROM_PROD" != "true" ]]; then
      print_turtle_header "crickets..."
    fi
    print_no_pr_status "$branch" "$(get_unpushed_count)"
    return 2
  fi

  # get pr status
  local status_json
  status_json=$(get_pr_status "$pr_number")

  # extract pr title for display
  local pr_title
  pr_title=$(get_pr_title "$status_json")

  local counts
  counts=$(parse_check_counts "$status_json")

  local passed failed progress
  passed=$(echo "$counts" | grep -oP 'passed:\K\d+')
  failed=$(echo "$counts" | grep -oP 'failed:\K\d+')
  progress=$(echo "$counts" | grep -oP 'progress:\K\d+')

  # check for rebase needed - constraint error (user must rebase)
  if [[ $(needs_rebase "$status_json") == "true" ]]; then
    if [[ "$FROM_PROD" != "true" ]]; then
      print_turtle_header "hold up dude..."
      echo "🐚 git.release --to main"
    fi
    echo ""
    print_release_header "$pr_title"
    print_check_status "passed" "$passed"
    print_rebase_status "$(has_conflicts "$status_json")"
    echo "   └─ 🌴 automerge unfound (use --mode apply to add)"
    return 2
  fi

  # plan mode (or watch mode without apply)
  if [[ "$MODE" == "plan" ]]; then
    if [[ "$FROM_PROD" != "true" ]]; then
      print_turtle_header "heres the wave..."
      if [[ "$WATCH" == "true" ]]; then
        echo "🐚 git.release --to main --watch"
      else
        echo "🐚 git.release --to main --mode plan"
      fi
    fi
    echo ""
    print_release_header "$pr_title"

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

    # if --watch, run watch loop without automerge
    if [[ "$WATCH" == "true" ]]; then
      print_watch_status
      watch_pr_checks "$pr_number"
      return $?
    fi

    # hints (always last, only in pure plan mode)
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
    if [[ "$FROM_PROD" != "true" ]]; then
      print_turtle_header "bummer dude..."
      echo "🐚 git.release --to main --mode apply"
    fi
    echo ""
    print_release_header "$pr_title"
    print_check_status "failed" "$failed"
    show_failed_checks "$status_json" "$RETRY"
    print_retry_hint
    return 1
  fi

  if [[ "$FROM_PROD" != "true" ]]; then
    print_turtle_header "cowabunga!"
    echo "🐚 git.release --to main --mode apply"
  fi
  echo ""
  print_release_header "$pr_title"

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

  # look for release pr (fail fast if ambiguous)
  local release_pr
  release_pr=$(get_release_pr) || exit 1
  local release_pr_title
  release_pr_title=$(get_release_pr_title) || exit 1

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
    echo ""
    print_release_header "$release_pr_title"

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

    # print unified prod header
    if [[ "$MODE" == "plan" ]]; then
      print_turtle_header "lets see..."
    else
      print_turtle_header "radical!"
    fi
    echo "🐚 git.release --to prod --mode $MODE"

    # run --to main flow first (with headers suppressed)
    FROM_PROD="true"
    release_to_main

    # if plan mode without --watch, stop here (don't show prod stuff too)
    if [[ "$MODE" == "plan" && "$WATCH" != "true" ]]; then
      return 0
    fi

    # if plan mode with --watch, feature PR watch already ran in release_to_main
    # but we need to verify it merged before we can continue to release PR
    if [[ "$MODE" == "plan" && "$WATCH" == "true" ]]; then
      local post_status
      post_status=$(get_pr_status "$branch_pr")
      if [[ $(is_pr_merged "$post_status") != "true" ]]; then
        echo "✗ UnexpectedCodePathError: feature PR did not merge after watch" >&2
        echo "   pr: #$branch_pr" >&2
        echo "   state: $(echo "$post_status" | jq -r '.state // "unknown"')" >&2
        return 1
      fi
      # poll until release PR appears
      wait_for_target "release_pr"
    fi

    # apply mode: verify feature branch merged before next step
    local post_status
    post_status=$(get_pr_status "$branch_pr")
    if [[ $(is_pr_merged "$post_status") != "true" ]]; then
      echo "✗ UnexpectedCodePathError: feature PR did not merge after watch" >&2
      echo "   pr: #$branch_pr" >&2
      echo "   state: $(echo "$post_status" | jq -r '.state // "unknown"')" >&2
      return 1
    fi

    # poll until release PR appears
    wait_for_target "release_pr"
  fi

  # look for release pr (fail fast if ambiguous)
  local release_pr
  release_pr=$(get_release_pr) || exit 1
  local release_pr_title
  release_pr_title=$(get_release_pr_title) || exit 1

  # plan mode (with optional --watch)
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

      if [[ "$FROM_PROD" != "true" ]]; then
        print_turtle_header "heres the wave..."
        if [[ "$WATCH" == "true" ]]; then
          echo "🐚 git.release --to prod --watch"
        else
          echo "🐚 git.release --to prod --mode plan"
        fi
      fi
      echo ""
      print_release_header "$release_pr_title"

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

      # if --watch, watch release PR (no automerge) then tag workflows
      if [[ "$WATCH" == "true" ]]; then
        print_watch_status
        if ! watch_pr_checks "$release_pr"; then
          return 1
        fi

        # extract expected tag and poll until tag runs appear
        local expected_tag
        expected_tag=$(extract_tag_from_release_title "$release_pr_title")

        if [[ -z "$expected_tag" ]]; then
          echo "✗ UnexpectedCodePathError: could not extract tag from release PR title" >&2
          echo "   title: $release_pr_title" >&2
          return 1
        fi

        # poll until tag runs appear
        if ! wait_for_target "tag_run:$expected_tag"; then
          return 1
        fi

        echo ""
        echo "🌊 release: $expected_tag"
        print_watch_status
        watch_tag_workflows "$expected_tag"
        return $?
      fi

      echo -e "   └─ \033[2mhint: use --mode apply to merge and watch tag workflows\033[0m"
    else
      # no release pr
      local latest_tag
      latest_tag=$(get_latest_tag)

      if [[ "$FROM_PROD" != "true" ]]; then
        print_turtle_header "heres the wave..."
        if [[ "$WATCH" == "true" ]]; then
          echo "🐚 git.release --to prod --watch"
        else
          echo "🐚 git.release --to prod --mode plan"
        fi
      fi
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
          echo "   ├─ no publish/deploy runs found"
        fi

        # if --watch, watch tag workflows
        if [[ "$WATCH" == "true" ]]; then
          print_watch_status
          watch_tag_workflows "$latest_tag"
          return $?
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
      if [[ "$FROM_PROD" != "true" ]]; then
        print_turtle_header "bummer dude..."
        echo "🐚 git.release --to prod --mode apply"
      fi
      echo ""
      print_release_header "$release_pr_title"
      print_check_status "failed" "$failed"
      show_failed_checks "$status_json" "$RETRY"
      print_retry_hint
      return 1
    fi

    if [[ "$FROM_PROD" != "true" ]]; then
      print_turtle_header "radical!"
      echo "🐚 git.release --to prod --mode apply"
    fi
    echo ""
    print_release_header "$release_pr_title"

    if [[ $progress -gt 0 ]]; then
      print_check_status "progress" "$progress"
    else
      print_check_status "passed" "$passed"
    fi

    # enable automerge if not enabled
    if [[ $(has_automerge "$status_json") != "true" ]]; then
      # failloud: enable_automerge errors go direct to stderr, set -e exits on failure
      enable_automerge "$release_pr"

      # check if pr was instantly merged (all checks passed, no branch protection delay)
      local post_status
      post_status=$(get_pr_status "$release_pr")
      if [[ $(is_pr_merged "$post_status") == "true" ]]; then
        echo "   ├─ 🌴 automerge enabled [added] -> and merged already"
        print_watch_status
        echo "      └─ ✨ done! 0s in action, 0s watched"

        # extract expected tag and poll until tag runs appear
        local expected_tag
        expected_tag=$(extract_tag_from_release_title "$release_pr_title")

        if [[ -z "$expected_tag" ]]; then
          echo "✗ UnexpectedCodePathError: could not extract tag from release PR title" >&2
          echo "   title: $release_pr_title" >&2
          return 1
        fi

        # poll until tag runs appear
        if ! wait_for_target "tag_run:$expected_tag"; then
          return 1
        fi

        echo ""
        echo "🌊 release: $expected_tag"
        print_watch_status
        watch_tag_workflows "$expected_tag"
        return $?
      fi

      print_automerge_status "enabled" "just added"
    else
      print_automerge_status "enabled"
    fi

    # watch release pr merge
    print_watch_status
    if ! watch_pr_checks "$release_pr"; then
      return 1
    fi

    # extract expected tag from release pr title
    local expected_tag
    expected_tag=$(extract_tag_from_release_title "$release_pr_title")

    if [[ -z "$expected_tag" ]]; then
      echo "✗ UnexpectedCodePathError: could not extract tag from release PR title" >&2
      echo "   title: $release_pr_title" >&2
      return 1
    fi

    # poll until tag runs appear
    if ! wait_for_target "tag_run:$expected_tag"; then
      return 1
    fi

    echo ""
    echo "🌊 release: $expected_tag"
    print_watch_status
    watch_tag_workflows "$expected_tag"
  else
    # no release pr, watch latest tag workflows
    local latest_tag
    latest_tag=$(get_latest_tag)

    if [[ -z "$latest_tag" ]]; then
      if [[ "$FROM_PROD" != "true" ]]; then
        print_turtle_header "crickets..."
        echo "🐚 git.release --to prod --mode apply"
      fi
      echo "🫧 no tags or release pr found"
      return 1
    fi

    if [[ "$FROM_PROD" != "true" ]]; then
      print_turtle_header "radical!"
      echo "🐚 git.release --to prod --mode apply"
    fi
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
