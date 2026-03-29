######################################################################
# .what = emit watch loop for a release transport
#
# .why  = consistent watch output across all transport types:
#         🥥 let's watch
#            ├─ 💤 N left, Xs in action, Xs watched
#            ├─ 💤 N left, Xs in action, Xs watched
#            └─ ✨ done! | ⚓ failed | ⏰ timeout
#
# .note = source-only file, defines function for git.release.sh to call
#
# usage:
#   source git.release._.emit_transport_watch.sh
#   emit_transport_watch "pr" "$pr_number"
#   emit_transport_watch "tag" "$tag_name"
#
# returns:
#   0 = success (merged/passed)
#   2 = constraint (failed, timeout, needs rebase)
######################################################################

######################################################################
# emit_transport_watch
# watch a transport until terminal state
#
# args:
#   $1 = transport_type ("pr" or "tag")
#   $2 = transport_ref (PR number or tag name)
#
# output:
#   stdout: watch tree with poll cycles
#
# returns:
#   0 = success
#   2 = constraint (failed, timeout)
######################################################################
emit_transport_watch() {
  local transport_type="$1"
  local transport_ref="$2"

  # check if already merged before watch loop
  if [[ "$transport_type" == "pr" ]]; then
    local status_json
    status_json=$(get_pr_status "$transport_ref")
    if [[ $(is_pr_merged "$status_json") == "true" ]]; then
      # already merged - emit terminator for tree consistency
      # (emit_transport_status may have used ├─ for automerge)
      print_watch_header
      print_watch_result "done" "merged!"
      return 0
    fi
  fi

  # emit watch header
  print_watch_header

  case "$transport_type" in
    pr)
      _watch_pr_transport "$transport_ref"
      return $?
      ;;
    tag)
      _watch_tag_transport "$transport_ref"
      return $?
      ;;
    *)
      echo "      └─ ⚓ unknown transport type: $transport_type"
      return 2
      ;;
  esac
}

######################################################################
# _watch_pr_transport
# watch PR checks until merge, failure, or timeout
#
# args:
#   $1 = pr_number
######################################################################
_watch_pr_transport() {
  local pr_number="$1"
  local start_time
  local ci_start_time
  local ci_start_time_set="false"
  local first_iteration="true"
  local elapsed
  local in_action
  local poll_interval
  local test_iterations=0

  start_time=$(date +%s)
  ci_start_time="$start_time"

  while true; do
    elapsed=$(( $(date +%s) - start_time ))

    # test mode: safety limit
    if [[ "${GIT_RELEASE_TEST_MODE:-}" == "true" ]]; then
      test_iterations=$((test_iterations + 1))
      if [[ $test_iterations -gt 100 ]]; then
        return 1
      fi
    fi

    # timeout after 15 minutes
    if [[ $elapsed -ge 900 ]]; then
      print_watch_result "timeout"
      return 2
    fi

    # determine poll interval
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

    # set ci_start_time from oldest check
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
      # use actual completion time, not current time
      local ci_end_time
      ci_end_time=$(get_latest_completed_at "$status_json")
      if [[ -z "$ci_end_time" || "$ci_end_time" -eq 0 ]]; then
        ci_end_time=$(date +%s)
      fi
      in_action=$(( ci_end_time - ci_start_time ))
      local in_action_str elapsed_str
      in_action_str=$(format_duration "$in_action")
      elapsed_str=$(format_duration "$elapsed")
      if [[ "$first_iteration" == "true" ]]; then
        echo "      ├─ 🫧 no runs inflight"
      fi
      print_watch_result "done" "$in_action_str in action, $elapsed_str watched"
      return 0
    fi

    # check for failures
    if [[ $failed -gt 0 ]]; then
      print_watch_check_status "failed" "$failed"
      show_failed_checks_in_watch "$status_json" "$progress"
      print_watch_retry_hint
      print_watch_errors_hint
      return 2
    fi

    # check if rebase needed
    if [[ $(needs_rebase "$status_json") == "true" ]]; then
      # use actual completion time, not current time
      local ci_end_time
      ci_end_time=$(get_latest_completed_at "$status_json")
      if [[ -z "$ci_end_time" || "$ci_end_time" -eq 0 ]]; then
        ci_end_time=$(date +%s)
      fi
      in_action=$(( ci_end_time - ci_start_time ))
      local in_action_str elapsed_str
      in_action_str=$(format_duration "$in_action")
      elapsed_str=$(format_duration "$elapsed")
      echo "      ├─ ✨ done! $in_action_str in action, $elapsed_str watched"
      if [[ $(has_conflicts "$status_json") == "true" ]]; then
        echo "      ├─ 🐚 but, needs rebase now, has conflicts"
      else
        echo "      ├─ 🐚 but, needs rebase now"
      fi
      echo -e "      └─ \033[2mhint: rhx git.branch.rebase begin\033[0m"
      return 2
    fi

    # emit poll line
    in_action=$(( $(date +%s) - ci_start_time ))
    local in_action_str elapsed_str
    in_action_str=$(format_duration "$in_action")
    elapsed_str=$(format_duration "$elapsed")

    if [[ $progress -gt 0 ]]; then
      print_watch_poll "$progress left" "$in_action_str" "$elapsed_str"
    else
      # checks done, check automerge state
      if [[ $(has_automerge "$status_json") != "true" ]]; then
        # no automerge = won't merge on its own
        # use actual completion time, not current time
        local ci_end_time
        ci_end_time=$(get_latest_completed_at "$status_json")
        if [[ -z "$ci_end_time" || "$ci_end_time" -eq 0 ]]; then
          ci_end_time=$(date +%s)
        fi
        in_action=$(( ci_end_time - ci_start_time ))
        in_action_str=$(format_duration "$in_action")
        if [[ "$first_iteration" == "true" ]]; then
          echo "      ├─ 🫧 no runs inflight"
        fi
        print_watch_result "done" "$in_action_str in action, $elapsed_str watched"
        return 0
      fi
      # automerge enabled, wait for GitHub to merge
      print_watch_poll "await automerge" "$in_action_str" "$elapsed_str"
    fi

    first_iteration="false"
    sleep "$poll_interval"
  done
}

######################################################################
# _watch_tag_transport
# watch tag workflows until success, failure, or timeout
#
# args:
#   $1 = tag_name
######################################################################
_watch_tag_transport() {
  local tag_name="$1"
  local start_time
  local ci_start_time
  local ci_start_time_set="false"
  local ci_end_time=0
  local first_iteration="true"
  local runs_ever_seen="false"
  local no_runs_polls=0
  local elapsed
  local in_action
  local poll_interval
  local test_iterations=0

  # grace period: if runs don't appear after this many seconds, assume no workflows
  # in test mode, use poll count instead (3 polls)
  local grace_threshold_seconds=30

  start_time=$(date +%s)
  ci_start_time="$start_time"

  while true; do
    elapsed=$(( $(date +%s) - start_time ))

    # test mode: safety limit
    if [[ "${GIT_RELEASE_TEST_MODE:-}" == "true" ]]; then
      test_iterations=$((test_iterations + 1))
      if [[ $test_iterations -gt 100 ]]; then
        return 1
      fi
    fi

    # timeout after 15 minutes
    if [[ $elapsed -ge 900 ]]; then
      print_watch_result "timeout"
      return 2
    fi

    # determine poll interval
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
    runs_json=$(get_tag_runs "$tag_name")

    # check if no workflows
    local total_runs
    total_runs=$(echo "$runs_json" | jq 'length')
    if [[ "$total_runs" == "0" ]]; then
      # no runs found - check if runs ever existed
      if [[ "$runs_ever_seen" == "true" ]]; then
        # runs existed before, now all finished
        # use last known completion time if available
        if [[ "$ci_end_time" -eq 0 ]]; then
          ci_end_time=$(date +%s)
        fi
        in_action=$(( ci_end_time - ci_start_time ))
        local in_action_str elapsed_str
        in_action_str=$(format_duration "$in_action")
        elapsed_str=$(format_duration "$elapsed")
        echo "      ├─ 🫧 no runs inflight"
        print_watch_result "done" "$in_action_str in action, $elapsed_str watched"
        return 0
      else
        # runs not yet started - check grace period
        no_runs_polls=$((no_runs_polls + 1))

        # grace period logic: exit if runs don't appear
        local grace_exceeded="false"
        if [[ "${GIT_RELEASE_TEST_MODE:-}" == "true" ]]; then
          # test mode: 3 polls grace period
          if [[ $no_runs_polls -ge 3 ]]; then
            grace_exceeded="true"
          fi
        else
          # real mode: 30 seconds grace period
          if [[ $elapsed -ge $grace_threshold_seconds ]]; then
            grace_exceeded="true"
          fi
        fi

        if [[ "$grace_exceeded" == "true" ]]; then
          # no workflows found after grace period - exit successfully
          in_action=$(( $(date +%s) - ci_start_time ))
          local in_action_str elapsed_str
          in_action_str=$(format_duration "$in_action")
          elapsed_str=$(format_duration "$elapsed")
          if [[ "$first_iteration" == "true" ]]; then
            echo "      ├─ 🫧 no runs inflight"
          fi
          print_watch_result "done" "$in_action_str in action, $elapsed_str watched"
          return 0
        fi

        # still within grace period - emit poll line and continue
        in_action=$(( $(date +%s) - ci_start_time ))
        local in_action_str elapsed_str
        in_action_str=$(format_duration "$in_action")
        elapsed_str=$(format_duration "$elapsed")
        print_watch_poll "await" "$in_action_str" "$elapsed_str"
        first_iteration="false"
        sleep "$poll_interval"
        continue
      fi
    fi

    # runs found - mark as seen
    runs_ever_seen="true"

    # set ci_start_time from oldest run (for accurate "in action" time)
    if [[ "$ci_start_time_set" == "false" ]]; then
      local oldest_started
      oldest_started=$(get_oldest_tag_run_started_at "$runs_json")
      if [[ -n "$oldest_started" && "$oldest_started" -gt 0 ]]; then
        ci_start_time="$oldest_started"
      fi
      ci_start_time_set="true"
    fi

    # track latest completion time (for accurate "in action" duration)
    local latest_completed
    latest_completed=$(get_latest_tag_run_completed_at "$runs_json")
    if [[ -n "$latest_completed" && "$latest_completed" -gt 0 ]]; then
      ci_end_time="$latest_completed"
    fi

    # count states
    local failed_count in_progress_count
    failed_count=$(echo "$runs_json" | jq '[.[] | select(.conclusion == "failure" or .conclusion == "cancelled")] | length')
    in_progress_count=$(echo "$runs_json" | jq '[.[] | select(.status != "completed")] | length')

    # check for target workflow
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
      # use actual completion time, not current time
      local ci_end_time
      ci_end_time=$(get_latest_tag_run_completed_at "$runs_json")
      if [[ -z "$ci_end_time" || "$ci_end_time" -eq 0 ]]; then
        ci_end_time=$(date +%s)
      fi
      in_action=$(( ci_end_time - ci_start_time ))
      local in_action_str elapsed_str
      in_action_str=$(format_duration "$in_action")
      elapsed_str=$(format_duration "$elapsed")
      if [[ "$first_iteration" == "true" ]]; then
        echo "      ├─ 🫧 no runs inflight"
      fi
      print_watch_result "done" "$target_name, $in_action_str in action, $elapsed_str watched"
      return 0
    elif [[ "$target_status" == "failure" || "$target_status" == "cancelled" ]]; then
      show_failed_tag_runs "$runs_json" "$in_progress_count"
      print_watch_retry_hint
      print_watch_errors_hint
      return 2
    fi

    # emit poll line
    in_action=$(( $(date +%s) - ci_start_time ))
    local in_action_str elapsed_str
    in_action_str=$(format_duration "$in_action")
    elapsed_str=$(format_duration "$elapsed")
    print_watch_poll "$target_name" "$in_action_str" "$elapsed_str"

    first_iteration="false"
    sleep "$poll_interval"
  done
}
