######################################################################
# .what = emit uniform status output for a release transport
#
# .why  = consistent output shape across all transport types:
#         🌊 release: {title}
#            ├─ {check_status}
#            ├─ {comment_status}     (pr transports)
#            ├─ {rebase_status}      (if needed)
#            ├─ {automerge_status}
#            └─ {hint | refusal}
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
#   - if a comment waits on an answer in apply or watch → disables automerge
#     (emit_comment_gate), and refuses with exit 2
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
#   1 = malfunction (e.g. the comment read failed)
#   2 = constraint (needs action, cannot continue)
#   3 = already merged (caller should skip watch)
#
# exits:
#   2 = refused: a comment waits on an answer. terminal by design, so no
#       caller can carry a refusal on into a watch or a retry
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

  # run the comment gate on a pr: it prints each unanswered comment, and in
  # apply or watch turns off an automerge that would merge past one
  local comment_unanswered="0"
  local automerge_removed="false"
  if [[ "$transport_type" == "pr" ]]; then
    local automerge_on="false" may_mutate="false"
    if [[ "$automerge_status" == "found" ]]; then automerge_on="true"; fi
    if [[ "$flag_apply" == "true" || "$flag_watch" == "true" ]]; then may_mutate="true"; fi
    emit_comment_gate "$transport_ref" "   " "$automerge_on" "$may_mutate" "always" || return 1
    comment_unanswered="$COMMENT_GATE_UNANSWERED"
    if [[ "$COMMENT_GATE_AUTOMERGE" == "removed" ]]; then
      automerge_status="unfound"
      automerge_removed="true"
    fi
  fi

  # one verdict: refuse while a comment waits, in apply or after the gate turned automerge off
  local comment_refusal
  comment_refusal=$(is_comment_gate_refusal "$comment_unanswered" "$flag_apply" "$automerge_removed")

  # emit rebase status (if needed): a constraint error; the automerge line is
  # last, unless the comment refusal follows it
  if [[ "$rebase_status" == "behind" || "$rebase_status" == "dirty" ]]; then
    local has_conflicts="false" rebase_automerge_is_last="true"
    if [[ "$rebase_status" == "dirty" ]]; then has_conflicts="true"; fi
    if [[ "$comment_refusal" == "true" ]]; then rebase_automerge_is_last="false"; fi
    print_rebase_status "$has_conflicts"
    _emit_automerge_line "$(as_automerge_display "$automerge_status" "false" "$automerge_removed" "$comment_unanswered")" "$rebase_automerge_is_last" "$comment_unanswered" || return 1
    if [[ "$comment_refusal" == "true" ]]; then
      _exit_on_comment_refusal "$transport_ref"
    fi
    return 2
  fi

  # a refusal, or failed checks: neither adds automerge. the check hints come
  # first, the comment refusal last; no flag skips the refusal
  if [[ "$comment_refusal" == "true" || "$check_status" == "failed" ]]; then
    _emit_automerge_line "$(as_automerge_display "$automerge_status" "false" "$automerge_removed" "$comment_unanswered")" "false" "$comment_unanswered" || return 1
    if [[ "$check_status" == "failed" ]]; then
      _emit_check_failure_hints "$flag_retry" "$flag_watch" "$flag_apply" "$comment_refusal" "$comment_unanswered"
    fi
    if [[ "$comment_refusal" == "true" ]]; then
      _exit_on_comment_refusal "$transport_ref"
    fi
    return 2
  fi

  # handle apply mode: enable automerge if unfound
  local automerge_added="false"
  if [[ "$flag_apply" == "true" && "$automerge_status" == "unfound" && "$transport_type" == "pr" ]]; then
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
  # - if not (watch or apply) and not tag, apply hint follows → not last
  # - if watch or apply is true, watch section follows (emitted by caller) → not last
  # - for tags with no watch/apply, automerge is n/a so doesn't apply
  # - otherwise → last (only case: tag in plan mode with no hint)
  local automerge_is_last="false"
  if [[ "$flag_watch" != "true" && "$flag_apply" != "true" && "$transport_type" == "tag" ]]; then
    automerge_is_last="true"
  fi
  _emit_automerge_line "$(as_automerge_display "$automerge_status" "$automerge_added" "$automerge_removed" "$comment_unanswered")" "$automerge_is_last" "$comment_unanswered" || return 1

  # success path hints (skip for tags - they don't have automerge)
  if [[ "$flag_watch" != "true" && "$flag_apply" != "true" && "$transport_type" != "tag" ]]; then
    # automerge on with a comment unanswered: github will merge past it unless turned off
    if [[ "$comment_unanswered" != "0" && "$automerge_status" == "found" ]]; then
      print_hint "--watch or --apply turns automerge off; --apply refuses until each comment has an answer"
      return 0
    fi
    # an unanswered comment outranks every other hint: apply would refuse
    if [[ "$comment_unanswered" != "0" ]]; then
      print_hint "--apply will refuse until each comment has an answer"
      return 0
    fi
    if [[ "$automerge_status" == "found" || "$automerge_added" == "true" ]]; then
      print_hint "use --apply to watch"
      return 0
    fi
    print_apply_hint
  fi

  return 0
}

######################################################################
# as_automerge_display
# .what = the automerge line to show, from github's state and this run's acts
# .why  = the automerge status holds what github reports; what to show
#         depends also on what this run added, removed, or held
#
# args:
#   $1 = automerge_status (github: found | unfound | n/a)
#   $2 = automerge_added ("true" when this run enabled it)
#   $3 = automerge_removed ("true" when the comment gate turned it off)
#   $4 = comment_unanswered (a count)
#
# output:
#   stdout: enabled-added | enabled-found | exposed | disabled | held | unfound | (empty for n/a)
#
# .note = held shows in every mode: while a comment waits, --apply cannot add
#         automerge, so plan must never invite "use --apply to add"
######################################################################
as_automerge_display() {
  local automerge_status="$1"
  local automerge_added="$2"
  local automerge_removed="$3"
  local comment_unanswered="$4"

  if [[ "$automerge_added" == "true" ]]; then echo "enabled-added"; return 0; fi
  if [[ "$automerge_removed" == "true" ]]; then echo "disabled"; return 0; fi
  if [[ "$automerge_status" == "found" && "$comment_unanswered" != "0" ]]; then echo "exposed"; return 0; fi
  if [[ "$automerge_status" == "found" ]]; then echo "enabled-found"; return 0; fi
  if [[ "$automerge_status" == "unfound" && "$comment_unanswered" != "0" ]]; then echo "held"; return 0; fi
  if [[ "$automerge_status" == "unfound" ]]; then echo "unfound"; return 0; fi
  echo ""
}

######################################################################
# _emit_automerge_line
# helper to emit the automerge status line
# args:
#   $1 = display (as_automerge_display)
#   $2 = is_last (optional, default false)
#   $3 = comment_unanswered (a count; exposed and disabled name it)
######################################################################
_emit_automerge_line() {
  local display="$1"
  local is_last="${2:-false}"
  local comment_unanswered="${3:-0}"

  # empty = n/a, so skip (tags don't have automerge); an unknown display fails loud
  case "$display" in
    "") ;;
    enabled-added) print_automerge_status "enabled" "just added" "$is_last" ;;
    enabled-found) print_automerge_status "enabled" "" "$is_last" ;;
    exposed | disabled) print_automerge_status "$display" "$comment_unanswered" "$is_last" ;;
    held | unfound) print_automerge_status "$display" "" "$is_last" ;;
    *)
      emit_both "💥 MalfunctionError: unknown automerge display '$display'"
      return 1
      ;;
  esac
}

######################################################################
# _exit_on_comment_refusal
# print the refusal and exit 2. terminal by design: a refusal never returns
# to a caller that might watch or retry past it, so no call site can forget it
#
# args:
#   $1 = pr_number
######################################################################
_exit_on_comment_refusal() {
  local pr_number="$1"
  print_comment_refusal "   " "$pr_number" "$COMMENT_GATE_REVIEW_WAITS"
  exit 2
}

######################################################################
# _emit_check_failure_hints
# the retry and errors hints under failed checks
#
# args:
#   $1 = flag_retry
#   $2 = flag_watch
#   $3 = flag_apply
#   $4 = comment_refusal ("true" when the comment refusal follows, so no hint ends the tree)
#   $5 = comment_unanswered (a count; above 0 without a refusal, the apply warn ends the tree)
######################################################################
_emit_check_failure_hints() {
  local flag_retry="$1"
  local flag_watch="$2"
  local flag_apply="$3"
  local comment_refusal="$4"
  local comment_unanswered="${5:-0}"

  # a rerun was triggered above; only hint about --watch when watch/apply is not already on
  if [[ "$flag_retry" == "true" ]]; then
    if [[ "$flag_watch" != "true" && "$flag_apply" != "true" ]]; then
      print_hint "use --watch to monitor rerun progress"
    fi
    return 0
  fi

  # the errors hint ends the tree, unless the comment refusal follows it
  print_retry_hint
  if [[ "$comment_refusal" == "true" ]]; then
    print_hint_branch "use rhx show.gh.test.errors to see test output"
    return 0
  fi

  # a comment waits and no refusal prints here (plan): warn that apply will refuse
  if [[ -n "$comment_unanswered" && "$comment_unanswered" != "0" ]]; then
    print_hint_branch "use rhx show.gh.test.errors to see test output"
    print_hint "--apply will refuse until each comment has an answer"
    return 0
  fi
  print_errors_hint
}
