######################################################################
# .what = transport state detection for release transports
#
# .why  = unified state detection across transport types:
#         - feature-branch: PR checks and automerge status
#         - release-branch: PR checks and automerge status
#         - release-tag: workflow run status
#
# .note = source-only file, defines functions for git.release.sh to call
#
# usage:
#   source git.release._.get_one_transport_status.sh
#   STATUS=$(get_one_transport_status "pr" "$pr_number")
#   STATUS=$(get_one_transport_status "tag" "$tag_name")
#
# output:
#   stdout: "check={unfound|inflight|passed|failed|merged}"
#           "automerge={unfound|found|n/a}"
#           "rebase={clean|behind|dirty}"
#           "title={transport title}"
######################################################################

######################################################################
# get_one_transport_status
# get unified status for a release transport
#
# args:
#   $1 = transport_type ("pr" or "tag")
#   $2 = transport_ref (PR number or tag name)
#   $3 = status_json (optional, pre-fetched PR status to avoid duplicate API calls)
#
# output:
#   stdout: key=value pairs for check, automerge, rebase, title
######################################################################
get_one_transport_status() {
  local transport_type="$1"
  local transport_ref="$2"
  local status_json="${3:-}"

  case "$transport_type" in
    pr)
      _get_pr_transport_status "$transport_ref" "$status_json"
      ;;
    tag)
      _get_tag_transport_status "$transport_ref"
      ;;
    *)
      echo "check=unfound"
      echo "automerge=n/a"
      echo "rebase=clean"
      echo "title=unknown"
      ;;
  esac
}

######################################################################
# _get_pr_transport_status
# get status for PR-based transport (feature-branch, release-branch)
#
# args:
#   $1 = pr_number
#   $2 = status_json (optional, pre-fetched PR status to avoid duplicate API calls)
#
# output:
#   stdout: key=value pairs
######################################################################
_get_pr_transport_status() {
  local pr_number="$1"
  local status_json="${2:-}"

  # get PR status JSON if not provided (uses git.release.operations.sh)
  if [[ -z "$status_json" ]]; then
    status_json=$(get_pr_status "$pr_number")
  fi

  # extract title
  local title
  title=$(get_pr_title "$status_json")

  # check if merged first
  if [[ $(is_pr_merged "$status_json") == "true" ]]; then
    echo "check=merged"
    echo "automerge=n/a"
    echo "rebase=clean"
    echo "title=$title"
    return 0
  fi

  # check rebase status
  local rebase_status="clean"
  if [[ $(needs_rebase "$status_json") == "true" ]]; then
    if [[ $(has_conflicts "$status_json") == "true" ]]; then
      rebase_status="dirty"
    else
      rebase_status="behind"
    fi
  fi

  # parse check counts
  local counts
  counts=$(parse_check_counts "$status_json")

  local passed failed progress
  passed=$(echo "$counts" | grep -oP 'passed:\K\d+')
  failed=$(echo "$counts" | grep -oP 'failed:\K\d+')
  progress=$(echo "$counts" | grep -oP 'progress:\K\d+')

  # determine check status
  local check_status
  if [[ $failed -gt 0 ]]; then
    check_status="failed"
  elif [[ $progress -gt 0 ]]; then
    check_status="inflight"
  else
    check_status="passed"
  fi

  # determine automerge status
  local automerge_status
  if [[ $(has_automerge "$status_json") == "true" ]]; then
    automerge_status="found"
  else
    automerge_status="unfound"
  fi

  echo "check=$check_status"
  echo "automerge=$automerge_status"
  echo "rebase=$rebase_status"
  echo "title=$title"
  echo "passed=$passed"
  echo "failed=$failed"
  echo "progress=$progress"
}

######################################################################
# _get_tag_transport_status
# get status for tag-based transport (release-tag workflows)
#
# args:
#   $1 = tag_name
#
# output:
#   stdout: key=value pairs
######################################################################
_get_tag_transport_status() {
  local tag_name="$1"

  # get tag workflow runs (uses git.release.operations.sh)
  local runs_json
  runs_json=$(get_tag_runs "$tag_name")

  # check if any runs exist
  local total_runs
  total_runs=$(echo "$runs_json" | jq 'length')

  if [[ "$total_runs" == "0" ]]; then
    echo "check=unfound"
    echo "automerge=n/a"
    echo "rebase=clean"
    echo "title=$tag_name"
    return 0
  fi

  # count states
  local failed_count in_progress_count success_count
  failed_count=$(echo "$runs_json" | jq '[.[] | select(.conclusion == "failure" or .conclusion == "cancelled")] | length')
  in_progress_count=$(echo "$runs_json" | jq '[.[] | select(.status != "completed")] | length')
  success_count=$(echo "$runs_json" | jq '[.[] | select(.conclusion == "success")] | length')

  # check for publish.yml or deploy.yml target
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

  # determine check status
  local check_status
  if [[ "$target_status" == "success" ]]; then
    check_status="passed"
  elif [[ "$target_status" == "failure" || "$target_status" == "cancelled" ]]; then
    check_status="failed"
  elif [[ $in_progress_count -gt 0 ]]; then
    check_status="inflight"
  elif [[ $failed_count -gt 0 ]]; then
    check_status="failed"
  elif [[ $success_count -gt 0 ]]; then
    check_status="passed"
  else
    check_status="unfound"
  fi

  echo "check=$check_status"
  echo "automerge=n/a"
  echo "rebase=clean"
  echo "title=$tag_name"
  echo "target=$target_name"
  echo "failed=$failed_count"
  echo "progress=$in_progress_count"
}
