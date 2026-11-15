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
#   $3 = lease_head_sha (optional; the feature pr in apply mode): the head the
#        review gate judged. the watch then holds an automerge lease on it:
#        the head is compared each poll, and automerge is disarmed on drift
#        or on any exit short of a merge, so no unreviewed push can merge
#
# output:
#   stdout: watch tree with poll cycles
#
# returns:
#   0 = success
#   1 = malfunction (the lease could not disarm automerge, or the head is unread)
#   2 = constraint (failed, timeout, head moved)
######################################################################
emit_transport_watch() {
  local transport_type="$1"
  local transport_ref="$2"
  local lease_head_sha="${3:-}"

  # check if already merged before watch loop
  if [[ "$transport_type" == "pr" ]]; then
    local status_json
    status_json=$(get_pr_status "$transport_ref") || status_json=""
    if [[ -z "$status_json" ]]; then
      print_watch_header
      echo "      └─ 💥 MalfunctionError: could not read the status of pr #$transport_ref; the watch stops here"
      return 1
    fi
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
      _watch_pr_transport "$transport_ref" "$lease_head_sha"
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
#   $2 = lease_head_sha (optional; see emit_transport_watch)
######################################################################
_watch_pr_transport() {
  local pr_number="$1"
  local lease_head_sha="${2:-}"
  local lease_result=0
  local start_time
  local ci_start_time
  local ci_start_time_set="false"
  local first_iteration="true"
  local elapsed
  local in_action
  local poll_interval
  local test_iterations=0
  local now_seconds

  start_time=$(date +%s)
  ci_start_time="$start_time"

  while true; do
    # in test mode, "now" is virtual (+5s per poll), so rendered durations
    # never depend on host speed. same clock as _.and_then_await.sh
    if [[ "${GIT_RELEASE_TEST_MODE:-}" == "true" ]]; then
      now_seconds=$(( start_time + test_iterations * 5 ))
    else
      now_seconds=$(date +%s)
    fi
    elapsed=$(( now_seconds - start_time ))

    # test mode: safety limit
    if [[ "${GIT_RELEASE_TEST_MODE:-}" == "true" ]]; then
      test_iterations=$((test_iterations + 1))
      if [[ $test_iterations -gt 100 ]]; then
        return 1
      fi
    fi

    # timeout after 15 minutes
    if [[ $elapsed -ge 900 ]]; then
      _release_automerge_lease pr_number="$pr_number" lease_head_sha="$lease_head_sha" || lease_result=1
      print_watch_result "timeout"
      if [[ $lease_result -ne 0 ]]; then return 1; fi
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
    # .note = an explicit check, not set -e: callers run this under `||`, which
    #          suspends errexit, so an unread status would read as "done"
    local status_json
    status_json=$(get_pr_status "$pr_number") || status_json=""
    if [[ -z "$status_json" ]]; then
      echo "      └─ 💥 MalfunctionError: could not read the status of pr #$pr_number; the watch stops here"
      return 1
    fi

    # lease: the head must still be the one the gate judged, unless merged
    if [[ -n "$lease_head_sha" && $(is_pr_merged "$status_json") != "true" ]]; then
      local lease_check=0
      _check_automerge_lease pr_number="$pr_number" lease_head_sha="$lease_head_sha" || lease_check=$?
      if [[ $lease_check -ne 0 ]]; then return $lease_check; fi
    fi

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
        ci_end_time="$now_seconds"
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
      _release_automerge_lease pr_number="$pr_number" lease_head_sha="$lease_head_sha" || lease_result=1
      print_watch_retry_hint
      print_watch_errors_hint
      if [[ $lease_result -ne 0 ]]; then return 1; fi
      return 2
    fi

    # check if rebase needed
    if [[ $(needs_rebase "$status_json") == "true" ]]; then
      # use actual completion time, not current time
      local ci_end_time
      ci_end_time=$(get_latest_completed_at "$status_json")
      if [[ -z "$ci_end_time" || "$ci_end_time" -eq 0 ]]; then
        ci_end_time="$now_seconds"
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
      _release_automerge_lease pr_number="$pr_number" lease_head_sha="$lease_head_sha" || lease_result=1
      echo -e "      └─ \033[2mhint: rhx git.branch.rebase begin\033[0m"
      if [[ $lease_result -ne 0 ]]; then return 1; fi
      return 2
    fi

    # emit poll line
    in_action=$(( now_seconds - ci_start_time ))
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
          ci_end_time="$now_seconds"
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
# hold_automerge_lease / drop_automerge_lease
# .what = bind the automerge lease to the process: from the gate's approval
#         until a merge is seen, any exit (error, set -e abort, ctrl-c,
#         SIGTERM, SIGHUP) disarms an automerge still armed on the pr
# .why  = github keeps automerge on across a write-access push; a lease held
#         only by a list of watch exits fails open on every exit not listed
# .note = the bound: each poll (5-15s) re-checks the head and the verdict, so
#         a drift or a revoked approval is disarmed within one poll interval.
#         a repo with no required checks can merge a push inside that window,
#         and SIGKILL cannot be trapped; only the org ruleset closes those
#
# usage:
#   hold_automerge_lease pr_number="42"   # after the gate approves
#   drop_automerge_lease                  # once the merge is seen
######################################################################
AUTOMERGE_LEASE_PR=""
hold_automerge_lease() {
  local arg
  for arg in "$@"; do
    case "$arg" in
      pr_number=*) AUTOMERGE_LEASE_PR="${arg#pr_number=}" ;;
    esac
  done
  trap '_on_exit_release_automerge_lease' EXIT
  trap '_on_signal_release_automerge_lease 130' INT
  trap '_on_signal_release_automerge_lease 143' TERM
  trap '_on_signal_release_automerge_lease 129' HUP
}
drop_automerge_lease() {
  AUTOMERGE_LEASE_PR=""
}

######################################################################
# _on_exit_release_automerge_lease
# .what = the exit trap: disarm an automerge still armed on an unmerged pr
# .why  = keeps the exit code; raises 0 to 1 only when the disarm fails
######################################################################
_on_exit_release_automerge_lease() {
  local exit_code=$?
  if [[ -z "$AUTOMERGE_LEASE_PR" ]]; then return 0; fi
  local pr_number="$AUTOMERGE_LEASE_PR"
  AUTOMERGE_LEASE_PR=""

  # merged, or naught armed: naught to release; an unread status disarms anyway
  local status_now=""
  status_now=$(get_pr_status "$pr_number") || status_now=""
  if [[ -n "$status_now" ]]; then
    if [[ $(is_pr_merged "$status_now") == "true" ]]; then return 0; fi
    if [[ $(has_automerge "$status_now") != "true" ]]; then return 0; fi
  fi

  # disarm; a failed disarm says so, names the hand fix, and fails the run
  local msg
  if disable_automerge pr_number="$pr_number"; then
    echo ""
    echo "🌴 automerge disarmed on pr #$pr_number, so a later push cannot merge unreviewed (--apply re-arms it)"
    return 0
  fi
  msg="⚠️ automerge is still on for pr #$pr_number and could not be disabled; disable it by hand now: gh pr merge $pr_number --disable-auto"
  echo ""
  echo "$msg"
  echo "$msg" >&2
  if [[ $exit_code -eq 0 ]]; then exit 1; fi
  exit "$exit_code"
}

######################################################################
# _on_signal_release_automerge_lease
# .what = the signal trap: release the lease, then exit with the signal's code
######################################################################
_on_signal_release_automerge_lease() {
  local signal_exit_code="$1"

  # a second ctrl-c mid-disarm must not abandon it
  trap '' INT TERM HUP
  if [[ -n "$AUTOMERGE_LEASE_PR" ]]; then
    echo ""
    echo "🌴 disarm automerge on pr #$AUTOMERGE_LEASE_PR before exit..."
  fi
  _on_exit_release_automerge_lease || true
  exit "$signal_exit_code"
}

######################################################################
# _release_automerge_lease
# .what = on a watch exit short of a merge, disarm the automerge the apply armed
# .why  = github keeps automerge on across a push with write access; left
#         armed, a fix pushed after a red exit merges with no review
#
# args (named): pr_number=, lease_head_sha= (empty = no lease, a no-op)
# returns: 0 = disarmed, or naught armed; 1 = automerge still on
######################################################################
_release_automerge_lease() {
  local pr_number="" lease_head_sha="" arg
  for arg in "$@"; do
    case "$arg" in
      pr_number=*) pr_number="${arg#pr_number=}" ;;
      lease_head_sha=*) lease_head_sha="${arg#lease_head_sha=}" ;;
    esac
  done

  # no lease, or naught armed: naught to release
  if [[ -z "$lease_head_sha" ]]; then return 0; fi
  local status_now
  status_now=$(get_pr_status "$pr_number") || status_now=""
  if [[ -n "$status_now" && $(has_automerge "$status_now") != "true" ]]; then
    drop_automerge_lease
    return 0
  fi

  # disarm, then settle the lease; a failed disarm keeps it, so the exit trap retries
  if disable_automerge pr_number="$pr_number"; then
    drop_automerge_lease
    echo "      ├─ 🌴 automerge disarmed, so a later push cannot merge unreviewed (--apply re-arms it)"
    return 0
  fi
  echo "      ├─ ⚠️ automerge is still on and could not be disabled; disable it by hand now: gh pr merge $pr_number --disable-auto"
  return 1
}

######################################################################
# _check_automerge_lease
# .what = refuse, and disarm, when the pr head moved off the head the gate judged
# .why  = a push after the gate is code no human approved; the pin on the
#         merge call covers only the moment automerge was armed
#
# args (named): pr_number=, lease_head_sha=
# returns: 0 = head unchanged; 2 = head moved (disarmed); 1 = head unread,
#          or automerge could not be disarmed
######################################################################
_check_automerge_lease() {
  local pr_number="" lease_head_sha="" arg
  for arg in "$@"; do
    case "$arg" in
      pr_number=*) pr_number="${arg#pr_number=}" ;;
      lease_head_sha=*) lease_head_sha="${arg#lease_head_sha=}" ;;
    esac
  done

  # read the head now; an unread head cannot be matched, so fail closed
  local head_now="" lease_result=0
  head_now=$(get_pr_head_sha pr_number="$pr_number") || head_now=""
  if [[ -z "$head_now" ]]; then
    echo "      ├─ 💥 MalfunctionError: could not read the head commit of pr #$pr_number"
    _release_automerge_lease pr_number="$pr_number" lease_head_sha="$lease_head_sha" || true
    echo "      └─ retry in a moment; if it persists, check the token can read pull requests"
    return 1
  fi

  # unchanged → the verdict must still hold: a review after the gate can revoke it
  if [[ "$head_now" == "$lease_head_sha" ]]; then
    _check_automerge_lease_verdict pr_number="$pr_number" lease_head_sha="$lease_head_sha" head_now="$head_now"
    return $?
  fi

  # moved → disarm, refuse
  echo "      ├─ ✋ ConstraintError: the head of pr #$pr_number moved after the review gate (approved ${lease_head_sha:0:7}, head now ${head_now:0:7})"
  _release_automerge_lease pr_number="$pr_number" lease_head_sha="$lease_head_sha" || lease_result=1
  echo "      └─ re-run --apply; the gate judges the new head"
  if [[ $lease_result -ne 0 ]]; then return 1; fi
  return 2
}

######################################################################
# _check_automerge_lease_verdict
# .what = re-run the gate's judge on the current head and reviews; refuse,
#         and disarm, once a human approval no longer holds
# .why  = the gate judged once; a CHANGES_REQUESTED or a dismissed approval
#         posted mid-watch, on the same head, must stop the merge too
#
# args (named): pr_number=, lease_head_sha=, head_now=
# returns: 0 = still approved; 2 = approval lost (disarmed); 1 = reviews
#          unread, or automerge could not be disarmed
######################################################################
_check_automerge_lease_verdict() {
  local pr_number="" lease_head_sha="" head_now="" arg
  for arg in "$@"; do
    case "$arg" in
      pr_number=*) pr_number="${arg#pr_number=}" ;;
      lease_head_sha=*) lease_head_sha="${arg#lease_head_sha=}" ;;
      head_now=*) head_now="${arg#head_now=}" ;;
    esac
  done

  # judge again; unread reviews cannot be judged, so fail closed
  local reviews_now="" verdict_now="" cause_now="" lease_result=0
  reviews_now=$(get_pr_reviews pr_number="$pr_number") || reviews_now=""
  if [[ -n "$reviews_now" ]]; then
    verdict_now=$(is_pr_approved_by_human reviews_json="$reviews_now" head_sha="$head_now") || verdict_now=""
  fi
  if [[ -z "$verdict_now" ]]; then
    echo "      ├─ 💥 MalfunctionError: could not re-read the reviews of pr #$pr_number"
    _release_automerge_lease pr_number="$pr_number" lease_head_sha="$lease_head_sha" || true
    echo "      └─ retry in a moment; if it persists, check the token can read pull requests"
    return 1
  fi

  # still approved → the lease holds
  if [[ "$verdict_now" == "true" ]]; then return 0; fi

  # approval lost → disarm, refuse, name the cause
  cause_now=$(get_review_gate_cause reviews_json="$reviews_now" head_sha="$head_now") || cause_now="no review from a human with repo authority approved it"
  echo "      ├─ ✋ ConstraintError: pr #$pr_number lost its human approval after the review gate"
  echo "      ├─ why: $cause_now"
  _release_automerge_lease pr_number="$pr_number" lease_head_sha="$lease_head_sha" || lease_result=1
  echo "      └─ ask your human to review again, then re-run --apply"
  if [[ $lease_result -ne 0 ]]; then return 1; fi
  return 2
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
  local now_seconds

  # grace period: if runs don't appear after this many seconds, assume no workflows
  # in test mode, use poll count instead (3 polls)
  local grace_threshold_seconds=30

  start_time=$(date +%s)
  ci_start_time="$start_time"

  while true; do
    # in test mode, "now" is virtual (+5s per poll); see _watch_pr_transport
    if [[ "${GIT_RELEASE_TEST_MODE:-}" == "true" ]]; then
      now_seconds=$(( start_time + test_iterations * 5 ))
    else
      now_seconds=$(date +%s)
    fi
    elapsed=$(( now_seconds - start_time ))

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
          ci_end_time="$now_seconds"
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
          in_action=$(( now_seconds - ci_start_time ))
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
        in_action=$(( now_seconds - ci_start_time ))
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
        ci_end_time="$now_seconds"
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
    in_action=$(( now_seconds - ci_start_time ))
    local in_action_str elapsed_str
    in_action_str=$(format_duration "$in_action")
    elapsed_str=$(format_duration "$elapsed")
    print_watch_poll "$target_name" "$in_action_str" "$elapsed_str"

    first_iteration="false"
    sleep "$poll_interval"
  done
}
