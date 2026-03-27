######################################################################
# .what = flag parse from command line arguments
#
# .why  = extracts mode flags from argv:
#         - watch: observe CI without automerge
#         - apply: enable automerge and watch
#         - retry: rerun failed workflows
#         - dirty: allow/block release with uncommitted changes
#
# .note = source-only file, defines function for git.release.sh to call
#
# usage:
#   source git.release._.get_all_flags_from_input.sh
#   FLAGS=$(get_all_flags_from_input "$@")
#   FLAG_WATCH=$(echo "$FLAGS" | grep -oP '^watch=\K.*')
#   FLAG_APPLY=$(echo "$FLAGS" | grep -oP '^apply=\K.*')
#   FLAG_RETRY=$(echo "$FLAGS" | grep -oP '^retry=\K.*')
#   FLAG_DIRTY=$(echo "$FLAGS" | grep -oP '^dirty=\K.*')
#
# output:
#   stdout: "watch={true|false}\napply={true|false}\nretry={true|false}\ndirty={block|allow}"
######################################################################

######################################################################
# get_all_flags_from_input
# parse mode flags from command line arguments
#
# args:
#   $@ = command line arguments (passed through from caller)
#
# output:
#   stdout: "watch={value}\napply={value}\nretry={value}\ndirty={value}"
#
# notes:
#   - --apply implies watch=true
#   - --mode apply also implies watch=true
#   - defaults: watch=false, apply=false, retry=false, dirty=block
######################################################################
get_all_flags_from_input() {
  local flag_watch="false"
  local flag_apply="false"
  local flag_retry="false"
  local flag_dirty="block"

  while [[ $# -gt 0 ]]; do
    case $1 in
      --watch)
        flag_watch="true"
        shift
        ;;
      --apply)
        # alias for --mode apply (implies --watch)
        flag_apply="true"
        flag_watch="true"
        shift
        ;;
      --mode)
        if [[ "$2" == "apply" ]]; then
          flag_apply="true"
          flag_watch="true"
        fi
        shift 2
        ;;
      --retry)
        flag_retry="true"
        shift
        ;;
      --dirty)
        flag_dirty="$2"
        shift 2
        ;;
      # skip other flags (handled by goal inference or main skill)
      --into|--from)
        shift 2
        ;;
      # rhachet passes these - skip
      --skill|--repo|--role)
        shift 2
        ;;
      --help|-h)
        shift
        ;;
      *)
        shift
        ;;
    esac
  done

  # output as key=value pairs
  echo "watch=$flag_watch"
  echo "apply=$flag_apply"
  echo "retry=$flag_retry"
  echo "dirty=$flag_dirty"
}
