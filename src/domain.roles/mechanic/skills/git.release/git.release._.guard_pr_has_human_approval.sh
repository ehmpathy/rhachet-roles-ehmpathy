######################################################################
# .what = refuse to merge a pr that holds no approval from a human
#
# .why  = a commit quota grants commits and pushes, never a merge.
#         ehmpathy/sdk-aws-lambda#79 merged with zero reviews via
#         `git.release --into prod --apply --dirty allow`; this guard stops
#         that path. no flag lifts it, and no caller (clone or human) is
#         exempt. it gates the feature pr; the release pr is ungated by
#         design (F1), and its merge is explicitly unpinned.
#
# .note = source-only file, defines function for git.release.sh to call
#
# usage:
#   source git.release._.guard_pr_has_human_approval.sh
#   guard_pr_has_human_approval \
#     pr_number="$pr_number" head_sha="$head_sha" status_json="$status_json" \
#     command_line="$command_line" || exit $?
#
# guarantee:
#   - approved                          → return 0, prints naught
#   - not approved                      → disable any extant automerge, print refusal, return 2
#   - reviews unreadable or undecidable → disable any extant automerge, print malfunction, return 1
#   - disable fails                     → print malfunction that says automerge is still on, return 1
#   - every refusal goes to stdout and stderr
######################################################################

######################################################################
# guard_pr_has_human_approval
#
# args (named):
#   pr_number=     the feature pr
#   head_sha=      the pr head, read once by the caller; the same sha pins
#                  the merge. empty = unread → malfunction
#   status_json=   from get_pr_status; carries autoMergeRequest, title, url
#   command_line=  the 🐚 line to echo in the header
#
# returns:
#   0 = approved by a human with repo authority
#   1 = malfunction (reviews unreadable or undecidable, or automerge could not be disabled)
#   2 = constraint (no human approval)
######################################################################
guard_pr_has_human_approval() {
  local pr_number="" head_sha="" status_json="" command_line="" arg
  for arg in "$@"; do
    case "$arg" in
      pr_number=*) pr_number="${arg#pr_number=}" ;;
      head_sha=*) head_sha="${arg#head_sha=}" ;;
      status_json=*) status_json="${arg#status_json=}" ;;
      command_line=*) command_line="${arg#command_line=}" ;;
    esac
  done

  # read and decide; reviews or head unread, or undecidable, are no approval, and no false "no approval" either
  local reviews_json="" verdict="" read_state="ok"
  reviews_json=$(get_pr_reviews pr_number="$pr_number") || read_state="failed"
  if [[ "$read_state" == "ok" && -z "$head_sha" ]]; then
    read_state="head-failed"
  fi
  if [[ "$read_state" == "ok" ]]; then
    verdict=$(is_pr_approved_by_human reviews_json="$reviews_json" head_sha="$head_sha") || read_state="failed"
  fi

  # approved → pass
  if [[ "$read_state" == "ok" && "$verdict" == "true" ]]; then
    return 0
  fi

  # not approved: an automerge an earlier run left on must go, or github merges anyway
  local automerge_state="off"
  if [[ $(has_automerge "$status_json") == "true" ]]; then
    automerge_state="still-on"
    disable_automerge pr_number="$pr_number" && automerge_state="disabled"
  fi

  # read failed, or automerge could not be disabled → malfunction, exit 1
  local msg
  if [[ "$read_state" != "ok" || "$automerge_state" == "still-on" ]]; then
    msg=$(_render_review_gate_malfunction \
      pr_number="$pr_number" status_json="$status_json" command_line="$command_line" \
      read_state="$read_state" automerge_state="$automerge_state")
    _emit_to_both_streams msg="$msg"
    return 1
  fi

  # no human approval → constraint, exit 2, with the cause named
  local cause
  cause=$(get_review_gate_cause reviews_json="$reviews_json" head_sha="$head_sha") || cause="no review from a human with repo authority approved it"
  msg=$(_render_review_gate_refusal \
    pr_number="$pr_number" status_json="$status_json" command_line="$command_line" \
    cause="$cause" automerge_state="$automerge_state")
  _emit_to_both_streams msg="$msg"
  return 2
}

######################################################################
# _render_review_gate_refusal
# .what = the exit-2 tree: no human approval on the pr
# .why  = the caller must ask a human; the tree names the pr and links it
######################################################################
_render_review_gate_refusal() {
  local pr_number="" status_json="" command_line="" cause="" automerge_state="" arg
  for arg in "$@"; do
    case "$arg" in
      pr_number=*) pr_number="${arg#pr_number=}" ;;
      status_json=*) status_json="${arg#status_json=}" ;;
      command_line=*) command_line="${arg#command_line=}" ;;
      cause=*) cause="${arg#cause=}" ;;
      automerge_state=*) automerge_state="${arg#automerge_state=}" ;;
    esac
  done

  local url
  url=$(get_pr_url status_json="$status_json")

  print_turtle_header "hold up dude..."
  echo "$command_line"
  echo ""
  print_release_header "$(get_pr_title "$status_json")"
  echo "   ├─ ✋ ConstraintError: pr #$pr_number has no approval from a human"
  echo "   ├─ why: $cause"
  echo "   ├─ rule: a merge needs a human's approval review; a commit quota grants commits, never a merge"
  _render_failed_checks_line status_json="$status_json"
  _render_automerge_line pr_number="$pr_number" automerge_state="$automerge_state"

  # one order: red checks are fixed first, so the human reviews code that passes
  if [[ "$(_count_failed_checks status_json="$status_json")" -gt 0 ]]; then
    echo "   └─ fix the failed checks (rhx show.gh.test.errors), then ask your human to review: ${url:-pr #$pr_number}"
    return 0
  fi
  echo "   └─ ask your human to review: ${url:-pr #$pr_number}"
}

######################################################################
# _render_review_gate_malfunction
# .what = the exit-1 tree: reviews unreadable, or automerge stuck on
# .why  = the system, not the caller, must be fixed; the header names the
#         fault that made it exit 1, and the tree names the next move
######################################################################
_render_review_gate_malfunction() {
  local pr_number="" status_json="" command_line="" read_state="" automerge_state="" arg
  for arg in "$@"; do
    case "$arg" in
      pr_number=*) pr_number="${arg#pr_number=}" ;;
      status_json=*) status_json="${arg#status_json=}" ;;
      command_line=*) command_line="${arg#command_line=}" ;;
      read_state=*) read_state="${arg#read_state=}" ;;
      automerge_state=*) automerge_state="${arg#automerge_state=}" ;;
    esac
  done

  # the cause: an unread review, else a refusal whose automerge would not turn off
  local cause="💥 MalfunctionError: could not disable automerge on pr #$pr_number"
  local consequence="pr #$pr_number has no approval from a human, so it must not merge"
  if [[ "$read_state" == "failed" ]]; then
    cause="💥 MalfunctionError: could not read the reviews on pr #$pr_number"
    consequence="without them, no human approval can be confirmed; naught was merged"
  fi
  if [[ "$read_state" == "head-failed" ]]; then
    cause="💥 MalfunctionError: could not read the head commit of pr #$pr_number"
    consequence="without it, no approval can be matched to the code that would merge; naught was merged"
  fi

  # the next move: a hand disable when automerge is stuck on, else a retry
  local hint="retry in a moment; if it persists, check the token can read pull requests"
  if [[ "$automerge_state" == "still-on" ]]; then
    hint="automerge is still on, so github may merge it; disable it by hand now: gh pr merge $pr_number --disable-auto"
  fi

  print_turtle_header "bummer dude..."
  echo "$command_line"
  echo ""
  print_release_header "$(get_pr_title "$status_json")"
  echo "   ├─ $cause"
  echo "   ├─ why: $consequence"
  # when the header already names the stuck automerge, say it once
  if [[ "$read_state" != "ok" ]]; then
    _render_automerge_line pr_number="$pr_number" automerge_state="$automerge_state"
  fi
  echo "   └─ $hint"
}

######################################################################
# _render_automerge_line
# .what = the one tree line that says what became of an earlier automerge
# .why  = a refusal must say whether github can still merge behind it;
#         an unknown state says so, never reads as "off"
######################################################################
_render_automerge_line() {
  local pr_number="" automerge_state="" arg
  for arg in "$@"; do
    case "$arg" in
      pr_number=*) pr_number="${arg#pr_number=}" ;;
      automerge_state=*) automerge_state="${arg#automerge_state=}" ;;
    esac
  done

  # the same words as the lease's line: one fact, one sentence
  case "$automerge_state" in
    off) ;;
    disabled) echo "   ├─ 🌴 automerge disabled on pr #$pr_number, so a later push cannot merge unreviewed (--apply enables it again)" ;;
    still-on) echo "   ├─ ⚠️ automerge is still on and could not be disabled; github may merge it" ;;
    *) echo "   ├─ ⚠️ automerge state unknown ($automerge_state); check the pr by hand" ;;
  esac
}

######################################################################
# _render_failed_checks_line
# .what = one tree line that names red checks on a refused pr, if any
# .why  = the gate fires before the failure tree; without this line the
#         human reviews a pr whose checks are red, and meets them a round late
######################################################################
_render_failed_checks_line() {
  local status_json="" arg
  for arg in "$@"; do
    case "$arg" in
      status_json=*) status_json="${arg#status_json=}" ;;
    esac
  done

  local failed
  failed=$(_count_failed_checks status_json="$status_json")
  if [[ "$failed" -gt 0 ]]; then
    echo "   ├─ ⚓ $failed check(s) failed too"
  fi
}

######################################################################
# _count_failed_checks
# .what = the number of failed checks on a pr status; 0 when unread
######################################################################
_count_failed_checks() {
  local status_json="" arg
  for arg in "$@"; do
    case "$arg" in
      status_json=*) status_json="${arg#status_json=}" ;;
    esac
  done

  local failed
  failed=$(parse_check_counts "$status_json" | grep -oP 'failed:\K\d+') || failed=0
  echo "${failed:-0}"
}

######################################################################
# _emit_to_both_streams
# .what = print a message to stdout and stderr
# .why  = a refusal is output (stdout) and an error (stderr); no
#         `tee /dev/stderr`, which may be unopenable in spawned, non-tty contexts
######################################################################
_emit_to_both_streams() {
  local msg="" arg
  for arg in "$@"; do
    case "$arg" in
      msg=*) msg="${arg#msg=}" ;;
    esac
  done

  echo "$msg"
  echo "$msg" >&2
}
