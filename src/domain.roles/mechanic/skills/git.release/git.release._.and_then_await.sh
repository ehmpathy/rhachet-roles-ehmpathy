######################################################################
# .what = await next transport artifact with commit-based freshness
#
# .why  = prevents stale artifacts from prior runs from pickup;
#         surfaces actionable diagnostics on timeout
#
# .note = source-only file, defines function for git.release.sh to call
#
# usage:
#   source git.release._.and_then_await.sh
#   and_then_await \
#     artifact_type="release-pr" \
#     artifact_display="release pr" \
#     prior_merge_commit="$merge_sha"
#
# returns:
#   0 = found (sets AWAIT_RESULT)
#   2 = timeout (constraint)
#
# output:
#   - found immediately: "🫧 and then..." + blank line
#   - found after wait: "🫧 and then..." + poll lines + "✨ found!"
#   - timeout: poll lines + "⚓ ... did not appear" + workflow status
######################################################################

# global for caller to access result
AWAIT_RESULT=""

######################################################################
# and_then_await
# await artifact with commit-based freshness check
#
# named args:
#   artifact_type=release-pr|tag
#   artifact_display="release pr" or "tag v1.2.3"
#   prior_merge_commit=<sha>
#   expected_tag=<tag> (only for artifact_type=tag)
#
# output:
#   stdout: await tree with poll cycles
#
# returns:
#   0 = success (AWAIT_RESULT set)
#   2 = constraint (timeout)
######################################################################
and_then_await() {
  # parse named args
  local artifact_type=""
  local artifact_display=""
  local prior_merge_commit=""
  local expected_tag=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      artifact_type=*)
        artifact_type="${1#artifact_type=}"
        ;;
      artifact_display=*)
        artifact_display="${1#artifact_display=}"
        ;;
      prior_merge_commit=*)
        prior_merge_commit="${1#prior_merge_commit=}"
        ;;
      expected_tag=*)
        expected_tag="${1#expected_tag=}"
        ;;
      *)
        echo "error: unknown arg: $1" >&2
        return 1
        ;;
    esac
    shift
  done

  # validate required args
  if [[ -z "$artifact_type" ]]; then
    echo "error: artifact_type required" >&2
    return 1
  fi
  if [[ -z "$artifact_display" ]]; then
    echo "error: artifact_display required" >&2
    return 1
  fi
  if [[ -z "$prior_merge_commit" ]]; then
    echo "error: prior_merge_commit required" >&2
    return 1
  fi
  if [[ "$artifact_type" == "tag" && -z "$expected_tag" ]]; then
    echo "error: expected_tag required for artifact_type=tag" >&2
    return 1
  fi

  # clear global result
  AWAIT_RESULT=""

  # check immediately (before poll loop)
  local result
  result=$(_check_artifact "$artifact_type" "$prior_merge_commit" "$expected_tag")

  if [[ -n "$result" ]]; then
    # found immediately - emit transition with trailing blank line
    print_transition "and then..."
    AWAIT_RESULT="$result"
    return 0
  fi

  # not found immediately - emit transition without trailing newline, then poll
  echo ""
  echo "🫧 and then..."
  _await_poll_loop "$artifact_type" "$artifact_display" "$prior_merge_commit" "$expected_tag"
  return $?
}

######################################################################
# _check_artifact
# check for fresh artifact (dispatch by type)
#
# args:
#   $1 = artifact_type
#   $2 = prior_merge_commit
#   $3 = expected_tag (only for tag type)
#
# returns: artifact data if found fresh, empty if not
######################################################################
_check_artifact() {
  local artifact_type="$1"
  local prior_merge_commit="$2"
  local expected_tag="$3"

  case "$artifact_type" in
    release-pr)
      get_fresh_release_pr "$prior_merge_commit"
      ;;
    tag)
      get_fresh_release_tag "$expected_tag" "$prior_merge_commit"
      ;;
    *)
      echo ""
      ;;
  esac
}

######################################################################
# _await_poll_loop
# poll for artifact until found or timeout
#
# args:
#   $1 = artifact_type
#   $2 = artifact_display
#   $3 = prior_merge_commit
#   $4 = expected_tag (only for tag type)
######################################################################
_await_poll_loop() {
  local artifact_type="$1"
  local artifact_display="$2"
  local prior_merge_commit="$3"
  local expected_tag="$4"

  local start_time
  local elapsed
  local poll_interval
  local timeout_seconds=90
  local poll_count=0
  local last_emit_time=0
  local emit_interval=5

  start_time=$(date +%s)

  while true; do
    # in test mode, simulate time via poll_count (each poll = 5s)
    if [[ "${GIT_RELEASE_TEST_MODE:-}" == "true" ]]; then
      elapsed=$((poll_count * emit_interval))
    else
      elapsed=$(( $(date +%s) - start_time ))
    fi

    # timeout check
    if [[ $elapsed -ge $timeout_seconds ]]; then
      _emit_timeout "$artifact_display" "$timeout_seconds"
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

    # sleep before check (except first iteration)
    if [[ $poll_count -gt 0 ]]; then
      sleep "$poll_interval"
      # update elapsed after sleep (real mode only)
      if [[ "${GIT_RELEASE_TEST_MODE:-}" != "true" ]]; then
        elapsed=$(( $(date +%s) - start_time ))
      fi
    fi

    poll_count=$((poll_count + 1))

    # emit poll line at intervals (every 5s, first emit at 5s)
    if [[ $elapsed -ge $emit_interval ]] && [[ $((elapsed - last_emit_time)) -ge $emit_interval ]]; then
      print_await_poll "$elapsed"
      last_emit_time=$elapsed
    fi

    # check for artifact
    local result
    result=$(_check_artifact "$artifact_type" "$prior_merge_commit" "$expected_tag")

    if [[ -n "$result" ]]; then
      # found after wait
      print_await_result "found" "$elapsed"
      echo ""
      AWAIT_RESULT="$result"
      return 0
    fi
  done
}

######################################################################
# _emit_timeout
# emit timeout diagnostics with workflow status
#
# args:
#   $1 = artifact_display
#   $2 = timeout_seconds
######################################################################
_emit_timeout() {
  local artifact_display="$1"
  local timeout_seconds="$2"

  # emit timeout anchor
  print_await_result "timeout" "$artifact_display" "$timeout_seconds"

  # lookup workflow status
  local workflow_status
  workflow_status=$(get_release_please_status)

  if [[ "$workflow_status" == "not_found" ]]; then
    print_workflow_status "release-please" "" "not found"
  else
    local url status conclusion
    url=$(echo "$workflow_status" | jq -r '.url // empty')
    status=$(echo "$workflow_status" | jq -r '.status // empty')
    conclusion=$(echo "$workflow_status" | jq -r '.conclusion // empty')

    # determine display status
    local display_status
    if [[ "$status" == "completed" ]]; then
      display_status="$conclusion"
    else
      display_status="$status"
    fi

    print_workflow_status "release-please" "$url" "$display_status"
  fi
}
