######################################################################
# .what = refuse to merge a pr that holds no approval from a human
#
# .why  = a commit quota grants commits and pushes, never a merge.
#         ehmpathy/sdk-aws-lambda#79 merged with zero reviews via
#         `git.release --into prod --apply --dirty allow`; this guard stops
#         that path. no flag lifts it, and no caller is exempt.
#
# .note = source-only file, defines function for git.release.sh to call
#
# usage:
#   source git.release._.guard_pr_has_human_approval.sh
#   guard_pr_has_human_approval "$pr_number" "$status_json" "$command_line" || exit $?
#
# guarantee:
#   - approved            → return 0, prints naught
#   - not approved        → disable any extant automerge, print refusal, return 2
#   - reviews unreadable  → disable any extant automerge, print malfunction, return 1
#   - disable fails       → print malfunction that says automerge is still on, return 1
#   - every refusal goes to stdout and stderr
######################################################################

######################################################################
# guard_pr_has_human_approval
#
# args:
#   $1 = pr_number
#   $2 = status_json (from get_pr_status; carries autoMergeRequest, title, url)
#   $3 = command_line (the 🐚 line to echo in the refusal header)
#
# returns:
#   0 = approved by a human with repo authority
#   1 = malfunction (reviews unreadable, or automerge could not be disabled)
#   2 = constraint (no human approval)
######################################################################
guard_pr_has_human_approval() {
  local pr_number="$1"
  local status_json="$2"
  local command_line="$3"

  # read reviews; an unreadable review is no approval
  local reviews_json read_exit=0
  reviews_json=$(get_pr_reviews_json "$pr_number") || read_exit=$?

  # approved → pass
  if [[ $read_exit -eq 0 && $(is_pr_approved_by_human "$reviews_json") == "true" ]]; then
    return 0
  fi

  # not approved: an automerge an earlier run left on must go, or github merges anyway
  local automerge_line="" disable_failed="false"
  if [[ $(has_automerge "$status_json") == "true" ]]; then
    if disable_automerge "$pr_number"; then
      automerge_line="automerge was on; disabled, so github cannot merge it"
    else
      disable_failed="true"
      automerge_line="automerge is STILL ON and could not be disabled; github may merge it"
    fi
  fi

  # compose the message once, then emit to both streams
  local title url pr_ref
  title=$(get_pr_title "$status_json")
  url=$(echo "$status_json" | jq -r '.url // empty')
  pr_ref="pr #$pr_number"

  local msg exit_code
  if [[ $read_exit -ne 0 || "$disable_failed" == "true" ]]; then
    exit_code=1
    msg="$(
      print_turtle_header "bummer dude..."
      echo "$command_line"
      echo ""
      print_release_header "$title"
      if [[ $read_exit -ne 0 ]]; then
        echo "   ├─ 💥 MalfunctionError: could not read the reviews on $pr_ref"
        echo "   ├─ without them, no human approval can be confirmed; naught was merged"
      else
        echo "   ├─ 💥 MalfunctionError: $pr_ref has no approval from a human"
      fi
      if [[ -n "$automerge_line" ]]; then echo "   ├─ $automerge_line"; fi
      if [[ "$disable_failed" == "true" ]]; then
        echo "   └─ disable it by hand now: gh pr merge $pr_number --disable-auto"
      else
        echo "   └─ retry in a moment; if it persists, check the token can read pull requests"
      fi
    )"
  else
    exit_code=2
    msg="$(
      print_turtle_header "hold up dude..."
      echo "$command_line"
      echo ""
      print_release_header "$title"
      echo "   ├─ ✋ ConstraintError: $pr_ref has no approval from a human"
      echo "   ├─ a merge needs a human's APPROVED review; a commit quota grants commits, never a merge"
      if [[ -n "$automerge_line" ]]; then echo "   ├─ $automerge_line"; fi
      echo "   └─ ask your human to review: ${url:-$pr_ref}"
    )"
  fi

  # note: no `tee /dev/stderr` — in spawned (non-tty) contexts it may be unopenable
  echo "$msg"
  echo "$msg" >&2
  return $exit_code
}
