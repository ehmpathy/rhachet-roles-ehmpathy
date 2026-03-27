######################################################################
# .what = exit code semantics for transport status
#
# .why  = semantic exit codes per rule.require.exit-code-semantics:
#         - 0: success (passed, merged)
#         - 1: malfunction (gh failed, network error)
#         - 2: constraint (unfound, inflight, failed, needs action)
#
# .note = source-only file, defines function for git.release.sh to call
#
# usage:
#   source git.release._.emit_one_transport_status_exitcode.sh
#   emit_one_transport_status_exitcode "$check_status"
#   # never returns - always exits
######################################################################

######################################################################
# emit_one_transport_status_exitcode
# exit with semantic code based on transport check status
#
# args:
#   $1 = check_status ("unfound"|"inflight"|"passed"|"failed"|"merged")
#
# exits:
#   0 = passed, merged (success)
#   2 = unfound, inflight, failed (constraint - user must fix)
######################################################################
emit_one_transport_status_exitcode() {
  local check_status="$1"

  case "$check_status" in
    passed|merged)
      exit 0
      ;;
    unfound)
      # no PR = user must push
      exit 2
      ;;
    inflight)
      # checks in progress = user must wait
      exit 2
      ;;
    failed)
      # checks failed = user must fix
      exit 2
      ;;
    *)
      # unknown status = malfunction
      exit 1
      ;;
  esac
}

######################################################################
# get_exitcode_for_status
# get exit code for a status without exit (for composition)
#
# args:
#   $1 = check_status
#
# output:
#   stdout: exit code (0, 1, or 2)
######################################################################
get_exitcode_for_status() {
  local check_status="$1"

  case "$check_status" in
    passed|merged)
      echo "0"
      ;;
    unfound|inflight|failed)
      echo "2"
      ;;
    *)
      echo "1"
      ;;
  esac
}
