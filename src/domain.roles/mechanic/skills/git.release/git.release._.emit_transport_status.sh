######################################################################
# .what = emit uniform status output for a release transport
#
# .why  = consistent output shape across all transport types:
#         🌊 release: {title}
#            ├─ {check_status}
#            ├─ {rebase_status}      (if needed)
#            ├─ {automerge_status}
#            └─ {hint}
#
# .note = source-only file, defines function for git.release.sh to call
#
# usage:
#   source git.release._.emit_transport_status.sh
#   emit_transport_status "$transport_type" "$transport_ref" "$flag_apply" "$flag_retry"
#
# side effects:
#   - if flag_apply=true && automerge=unfound → enables automerge
#   - if flag_retry=true && check=failed → reruns failed workflows
######################################################################

######################################################################
# emit_transport_status
# emit uniform status tree for a transport
#
# args:
#   $1 = transport_type ("pr" or "tag")
#   $2 = transport_ref (PR number or tag name)
#   $3 = flag_apply ("true" or "false")
#   $4 = flag_retry ("true" or "false")
#   $5 = flag_watch ("true" or "false")
#   $6 = status_json (optional, pre-fetched for PR transports)
#
# output:
#   stdout: formatted status tree
#
# returns:
#   0 = success (can continue)
#   2 = constraint (needs action, cannot continue)
#   3 = already merged (caller should skip watch)
######################################################################
emit_transport_status() {
  local transport_type="$1"
  local transport_ref="$2"
  local flag_apply="${3:-false}"
  local flag_retry="${4:-false}"
  local flag_watch="${5:-false}"
  local status_json="${6:-}"

  # get transport status (pass pre-fetched status_json if available to avoid duplicate API calls)
  local status_output
  status_output=$(get_one_transport_status "$transport_type" "$transport_ref" "$status_json")

  local check_status automerge_status rebase_status title
  check_status=$(echo "$status_output" | grep -oP '^check=\K.*')
  automerge_status=$(echo "$status_output" | grep -oP '^automerge=\K.*')
  rebase_status=$(echo "$status_output" | grep -oP '^rebase=\K.*')
  title=$(echo "$status_output" | grep -oP '^title=\K.*')

  local passed failed progress
  passed=$(echo "$status_output" | grep -oP '^passed=\K.*' || echo "0")
  failed=$(echo "$status_output" | grep -oP '^failed=\K.*' || echo "0")
  progress=$(echo "$status_output" | grep -oP '^progress=\K.*' || echo "0")

  # emit header
  print_release_header "$title"

  # handle merged state (shortcut)
  if [[ "$check_status" == "merged" ]]; then
    print_check_status "passed"
    print_automerge_status "merged"
    return 3  # 3 = already merged, caller should skip watch
  fi

  # handle unfound state (no PR/no runs)
  if [[ "$check_status" == "unfound" ]]; then
    if [[ "$transport_type" == "tag" ]]; then
      # no tag workflows = no blockers = passed
      # for tags in plan mode (no watch), this is the last line
      local is_last_unfound="false"
      if [[ "$flag_watch" != "true" && "$flag_apply" != "true" ]]; then
        is_last_unfound="true"
      fi
      print_check_status "passed" "" "$is_last_unfound"
    else
      echo "   └─ 🫧 no pr found"
    fi
    return 0
  fi

  # determine if check status is the last line (for tags in plan mode)
  # tags don't have automerge, so passed/inflight in plan mode are terminal
  local is_last_check="false"
  if [[ "$transport_type" == "tag" && "$flag_watch" != "true" && "$flag_apply" != "true" ]]; then
    if [[ "$check_status" == "passed" || "$check_status" == "inflight" ]]; then
      is_last_check="true"
    fi
  fi

  # emit check status
  case "$check_status" in
    passed)
      print_check_status "passed" "" "$is_last_check"
      ;;
    inflight)
      print_check_status "progress" "$progress" "$is_last_check"
      ;;
    failed)
      print_check_status "failed" "$failed"
      # show failed checks with optional retry
      if [[ "$transport_type" == "pr" && -n "$status_json" ]]; then
        local has_more="false"
        if [[ "$progress" -gt 0 ]]; then
          has_more="true"
        fi
        show_failed_checks "$status_json" "$flag_retry" "$has_more"
        if [[ "$progress" -gt 0 ]]; then
          print_progress_in_failure "$progress"
        fi
      elif [[ "$transport_type" == "tag" ]]; then
        # show failed tag runs with optional retry
        local has_more="false"
        if [[ "$progress" -gt 0 ]]; then
          has_more="true"
        fi
        show_failed_tag_runs_in_status "$transport_ref" "$flag_retry" "$has_more"
        if [[ "$progress" -gt 0 ]]; then
          print_progress_in_failure "$progress"
        fi
      fi
      ;;
  esac

  # emit rebase status (if needed)
  if [[ "$rebase_status" == "behind" ]]; then
    print_rebase_status "false"
    # rebase needed is a constraint error - automerge line is last
    _emit_automerge_line "$automerge_status" "false" "$flag_apply" "true"
    return 2
  elif [[ "$rebase_status" == "dirty" ]]; then
    print_rebase_status "true"
    # rebase with conflicts is a constraint error - automerge line is last
    _emit_automerge_line "$automerge_status" "false" "$flag_apply" "true"
    return 2
  fi

  # handle apply mode: enable automerge if unfound and checks are not failed
  # note: skip if checks failed - can't enable automerge on PR with failed checks, and we want exit 2 not 1
  local automerge_added="false"
  if [[ "$flag_apply" == "true" && "$automerge_status" == "unfound" && "$transport_type" == "pr" && "$check_status" != "failed" ]]; then
    # enable automerge (failloud: errors propagate via explicit || return)
    # note: set -e doesn't reliably propagate function failures inside if blocks
    enable_automerge "$transport_ref" || return 1

    # check if instantly merged
    local post_status
    post_status=$(get_pr_status "$transport_ref")
    if [[ $(is_pr_merged "$post_status") == "true" ]]; then
      echo "   └─ 🌴 automerge enabled [added] -> and merged already"
      return 3  # 3 = already merged, caller should skip watch
    fi

    automerge_added="true"
  fi

  # emit automerge line
  # determine if automerge is the last line in THIS function:
  # - if check_status == "failed", hints follow → not last
  # - if not (watch or apply) and not tag, apply hint follows → not last
  # - if watch or apply is true, watch section follows (emitted by caller) → not last
  # - for tags with no watch/apply, automerge is n/a so doesn't apply
  # - otherwise → last (only case: tag in plan mode with no hint)
  local automerge_is_last="false"
  if [[ "$check_status" != "failed" ]]; then
    if [[ "$flag_watch" != "true" && "$flag_apply" != "true" ]]; then
      # no watch follows, check if hint follows
      if [[ "$transport_type" == "tag" ]]; then
        # tags don't emit automerge, but if they did, this would be last
        automerge_is_last="true"
      fi
      # for PRs in plan mode without watch/apply, hint follows → not last
    fi
    # when watch/apply is true, watch section follows → not last
  fi
  _emit_automerge_line "$automerge_status" "$automerge_added" "$flag_apply" "$automerge_is_last"

  # emit hints based on state
  if [[ "$check_status" == "failed" ]]; then
    if [[ "$flag_retry" == "true" ]]; then
      # only hint about --watch when user has not already enabled watch/apply
      if [[ "$flag_watch" != "true" && "$flag_apply" != "true" ]]; then
        print_hint "use --watch to monitor rerun progress"
      fi
    else
      print_retry_hint
      print_errors_hint
    fi
    return 2
  fi

  # success path hints (skip for tags - they don't have automerge)
  if [[ "$flag_watch" != "true" && "$flag_apply" != "true" && "$transport_type" != "tag" ]]; then
    if [[ "$automerge_status" == "found" || "$automerge_added" == "true" ]]; then
      print_hint "use --apply to watch"
    else
      print_apply_hint
    fi
  fi

  return 0
}

######################################################################
# _emit_automerge_line
# helper to emit the automerge status line
# args:
#   $1 = automerge_status
#   $2 = automerge_added
#   $3 = flag_apply
#   $4 = is_last (optional, default false)
######################################################################
_emit_automerge_line() {
  local automerge_status="$1"
  local automerge_added="$2"
  local flag_apply="$3"
  local is_last="${4:-false}"

  if [[ "$automerge_added" == "true" ]]; then
    print_automerge_status "enabled" "just added" "$is_last"
  elif [[ "$automerge_status" == "found" ]]; then
    print_automerge_status "enabled" "" "$is_last"
  elif [[ "$automerge_status" == "unfound" ]]; then
    print_automerge_status "unfound" "" "$is_last"
  fi
  # n/a = skip (tags don't have automerge)
}
