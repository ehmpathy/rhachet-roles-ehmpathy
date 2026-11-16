#!/usr/bin/env bash
######################################################################
# .what = dispatch `rhx git.pull.watch <verb>` to its verb skill
#
# .why  = once a pr is watched, a pr-watch daemon (one per machine per
#         version) alerts the clone of ci failures, new comments, approval,
#         and the pr's end. git.commit.push watches each pr it opens
#
# usage:
#   rhx git.pull.watch get                              # daemons + watches
#   rhx git.pull.watch set --which 1220 --mode apply       # watch a pr
#   rhx git.pull.watch del --which 1220 --mode apply       # stop a watch
#   rhx git.pull.watch --help
#
# guarantee:
#   - each verb is also its own skill (rhx git.pull.watch.get), so both forms run one code
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=git.pull.watch.operations.sh
source "$SKILL_DIR/git.pull.watch.operations.sh"

VERBS=(get set del)

# .what = is this one of the verbs?
is_watch_verb() {
  local verb
  for verb in "${VERBS[@]}"; do
    [[ "$verb" == "$1" ]] && return 0
  done
  return 1
}

# .what = print the verbs and how to see each one's flags
help() {
  echo "usage: git.pull.watch <get | set | del> [flags]"
  echo ""
  echo "verbs:"
  echo "  get                          the daemons on this machine and their watches"
  echo "  set --which <n>              watch a pr from this clone (plan by default)"
  echo "  del --which <n>              stop this clone's watch on a pr (plan by default)"
  echo ""
  echo "options:"
  echo "  --help, -h                   show this help; rhx git.pull.watch <verb> --help for a verb's flags"
  echo ""
  echo "example:"
  echo "  rhx git.pull.watch set --which 1220 --mode apply"
}

VERB=""
REST=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill|--repo|--role) check_watch_flag_value git.pull.watch "$@"; shift 2 ;;
    *)
      if [[ -z "$VERB" ]]; then
        VERB="$1"
        shift
        continue
      fi
      REST+=("$1")
      shift ;;
  esac
done

[[ -n "$VERB" ]] || fail_watch_constraint git.pull.watch "a verb is required; the verbs are get | set | del" "rhx git.pull.watch get"
if [[ "$VERB" == "help" || "$VERB" == "--help" || "$VERB" == "-h" ]]; then
  help
  exit 0
fi
is_watch_verb "$VERB" || fail_watch_constraint git.pull.watch "unknown verb '$VERB'; the verbs are get | set | del" "rhx git.pull.watch --help"

# via bash, so the route never rests on a file's execute bit
exec bash "$SKILL_DIR/git.pull.watch.$VERB.sh" "${REST[@]+"${REST[@]}"}"
