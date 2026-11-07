######################################################################
# .what = the comment gate of a pr transport: read the comments, judge
#         which wait on an answer, print them, and turn automerge off
#         where it would merge past one
#
# .why  = the status tree and each watch poll run one gate sequence. one
#         home means the fail-closed rule cannot drift between the two
#
# .note = source-only file, defines functions for git.release.sh to call
#
# usage:
#   source git.release._.emit_comment_gate.sh
#   emit_comment_gate "$pr_number" "$indent" "$automerge_on" "$may_mutate" "$print_when" || return 1
#   # then read COMMENT_GATE_UNANSWERED (a count) and COMMENT_GATE_AUTOMERGE (on|off|removed)
#
# guarantee:
#   - a failed read or judgment never reads as "0 unanswered"
#   - a blind gate fails closed: with automerge on and leave to mutate,
#     automerge is turned off before the malfunction returns
#   - plan never mutates; it reports what automerge will do instead
######################################################################

######################################################################
# emit_comment_gate
#
# args:
#   $1 = pr_number
#   $2 = indent ("   " in the status tree, "      " in a watch poll)
#   $3 = automerge_on ("true" when github reports automerge enabled)
#   $4 = may_mutate ("true" in apply or watch; "false" in plan)
#   $5 = print_when ("always" in the status tree; "unanswered" in a watch poll)
#
# sets:
#   COMMENT_GATE_UNANSWERED   = how many comments wait on an answer
#   COMMENT_GATE_REVIEW_WAITS = true | false (true = at least one review thread waits)
#   COMMENT_GATE_AUTOMERGE    = on | off | removed (removed = this gate turned it off)
#
# returns:
#   0 = judged
#   1 = malfunction, printed on both streams (automerge already turned off if it could be)
######################################################################
emit_comment_gate() {
  local pr_number="$1"
  local indent="$2"
  local automerge_on="$3"
  local may_mutate="$4"
  local print_when="$5"
  local rows judged count read_count err detail rc=0

  COMMENT_GATE_UNANSWERED=""
  COMMENT_GATE_REVIEW_WAITS="false"
  COMMENT_GATE_AUTOMERGE="off"
  if [[ "$automerge_on" == "true" ]]; then
    COMMENT_GATE_AUTOMERGE="on"
  fi

  # read every comment; gh's own words explain a failure
  err=$(mktemp)
  rows=$(get_all_pr_comment_rows "$pr_number" 2>"$err") || rc=$?
  detail=$(cat "$err")
  rm -f "$err"
  if [[ $rc -ne 0 ]]; then
    _emit_comment_gate_blind "$pr_number" "$indent" "$may_mutate" "$detail"
    return 1
  fi

  # judge the rows; errexit is off under `|| rc=$?`, so each step fails loud by hand
  judged=$(as_rows_unanswered "$rows") || { _emit_comment_gate_blind "$pr_number" "$indent" "$may_mutate" "the unanswered rule could not judge the rows"; return 1; }
  count=$(as_count_of_rows "$judged") || { _emit_comment_gate_blind "$pr_number" "$indent" "$may_mutate" "the unanswered rows could not be counted"; return 1; }
  COMMENT_GATE_UNANSWERED="$count"

  # only a review thread can be resolved, so only a review row offers that cure
  COMMENT_GATE_REVIEW_WAITS=$(is_any_review_row "$judged") || { _emit_comment_gate_blind "$pr_number" "$indent" "$may_mutate" "the unanswered rows could not be sorted by kind"; return 1; }

  # all answered, or none read: a watch poll stays quiet, the status tree says which
  read_count=$(as_count_of_rows "$rows") || { _emit_comment_gate_blind "$pr_number" "$indent" "$may_mutate" "the comments read could not be counted"; return 1; }
  if [[ "$count" == "0" ]]; then
    if [[ "$print_when" == "always" ]]; then
      print_comment_status "$indent" "$judged" "$pr_number" "$read_count"
    fi
    return 0
  fi

  # name each comment that waits, with the command that answers it
  print_comment_status "$indent" "$judged" "$pr_number" "$read_count" || { _emit_comment_gate_blind "$pr_number" "$indent" "$may_mutate" "the unanswered rows could not be printed"; return 1; }

  # automerge off, or plan: naught to turn off here
  if [[ "$COMMENT_GATE_AUTOMERGE" != "on" || "$may_mutate" != "true" ]]; then
    return 0
  fi

  # turn automerge off, so github cannot merge past the gate
  if ! disable_automerge "$pr_number"; then
    print_automerge_disable_failure "$indent" "$pr_number" "$count comment(s) unanswered"
    return 1
  fi
  COMMENT_GATE_AUTOMERGE="removed"
  return 0
}

######################################################################
# _emit_comment_gate_blind
# a gate that cannot see must not leave automerge on: turn it off where
# leave to mutate stands, then report the malfunction with automerge's state
#
# args:
#   $1 = pr_number
#   $2 = indent
#   $3 = may_mutate
#   $4 = detail (gh's words, or which step failed)
######################################################################
_emit_comment_gate_blind() {
  local pr_number="$1"
  local indent="$2"
  local may_mutate="$3"
  local detail="$4"

  # automerge off: the failure holds no merge risk
  if [[ "$COMMENT_GATE_AUTOMERGE" != "on" ]]; then
    print_comment_read_failure "$indent" "$detail" "off" "$pr_number"
    return 0
  fi

  # plan: never mutate; say what github will do
  if [[ "$may_mutate" != "true" ]]; then
    print_comment_read_failure "$indent" "$detail" "on" "$pr_number"
    return 0
  fi

  # fail closed: turn automerge off before the malfunction returns
  if disable_automerge "$pr_number"; then
    COMMENT_GATE_AUTOMERGE="removed"
    print_comment_read_failure "$indent" "$detail" "removed" "$pr_number"
    return 0
  fi
  print_comment_read_failure "$indent" "$detail" "stuck" "$pr_number"
}

######################################################################
# is_comment_gate_refusal
# .what = whether the release must refuse on the comments
# .why  = one verdict, read by every branch that might refuse
#
# args:
#   $1 = unanswered count
#   $2 = flag_apply
#   $3 = automerge_removed ("true" when the gate turned automerge off)
#
# output:
#   stdout: "true" | "false"
######################################################################
is_comment_gate_refusal() {
  local unanswered="$1"
  local flag_apply="$2"
  local automerge_removed="$3"

  # an unknown count refuses: a gate never reads "unseen" as "all answered"
  if [[ "$unanswered" == "0" ]]; then
    echo "false"
    return 0
  fi
  if [[ -z "$unanswered" ]]; then
    echo "true"
    return 0
  fi
  if [[ "$flag_apply" == "true" || "$automerge_removed" == "true" ]]; then
    echo "true"
    return 0
  fi
  echo "false"
}
