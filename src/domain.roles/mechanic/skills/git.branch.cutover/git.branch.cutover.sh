#!/usr/bin/env bash
######################################################################
# .what = dispatch git.branch.cutover subcommands to their handlers
#
# .why  = one entry point for the cutover verb:
#         - a single permission rule covers every subcommand
#         - the same begin | continue | abort words as git.branch.rebase
#
# usage:
#   rhx git.branch.cutover begin --from @main --into <branch> [--pick <sha>]... [--mode plan|apply]
#   rhx git.branch.cutover continue
#   rhx git.branch.cutover abort
#   rhx git.branch.cutover help
#
# --from forms (required; no default base):
#   @main       cut from origin/main, after a fetch
#   @tree       cut from the current tree as is; no --pick
#   <branch>    cut from a named branch
#
# quota:
#   plan (the default) spends naught. apply spends one unit of
#   git.branch.uses, which only a human grants:
#     rhx git.branch.uses set --quant 1
#
# guarantee:
#   - dispatches to the subcommand via exec (single process)
#   - passes every rest arg to the subcommand
#   - an absent or unknown subcommand refuses with exit 2
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SKILL_DIR/../git.commit/output.sh"

######################################################################
# show usage
######################################################################
show_usage() {
  print_turtle_header "heres the wave..."
  print_tree_start "git.branch.cutover"
  show_usage_branches
}

# the usage tree branches, with no header (a refusal supplies its own)
show_usage_branches() {
  echo "   ├─ subcommands"
  echo "   │  ├─ begin      cut a fresh branch here and carry the work onto it"
  echo "   │  ├─ continue   continue after a conflict is settled"
  echo "   │  ├─ abort      undo the whole cutover"
  echo "   │  └─ help       show this usage"
  echo "   └─ examples"
  echo "      ├─ rhx git.branch.cutover begin --from @main --into turtle/wave-report-v2 --pick a1b2c3d"
  echo "      ├─ rhx git.branch.cutover begin --from @main --into turtle/wave-report-v2 --pick a1b2c3d --mode apply"
  echo "      ├─ rhx git.branch.cutover begin --from @tree --into turtle/reef-shoals --mode apply"
  echo "      ├─ rhx git.branch.cutover continue"
  echo "      └─ rhx git.branch.cutover abort"
}

# the usage branches as children of a refusal's └─ leaf: one tree, not two
show_usage_branches_under_leaf() {
  local line
  while IFS= read -r line; do
    echo "   $line"
  done < <(show_usage_branches)
}

######################################################################
# .what = the begin command a caller meant, from flags typed with no
#         subcommand; first-draft names map to the shipped ones
#
# .why  = #528 and #504 spelled the verb `--to X --cherry-pick sha`; a
#         caller who copies them gets the exact paved command back
#
# usage: as_begin_command_from_flags --to x --cherry-pick a1b2c3d
#        → rhx git.branch.cutover begin --from @main --into x --pick a1b2c3d
######################################################################
as_begin_command_from_flags() {
  local words=() has_from=false word
  for word in "$@"; do
    case "$word" in
      --to) words+=("--into") ;;
      --cherry-pick) words+=("--pick") ;;
      --from) has_from=true; words+=("$word") ;;
      *) words+=("$(printf '%q' "$word")") ;;
    esac
  done
  if [[ "$has_from" == "false" ]]; then
    words=("--from" "@main" "${words[@]}")
  fi
  echo "rhx git.branch.cutover begin ${words[*]}"
}

######################################################################
# parse arguments
######################################################################
SUBCMD=""
ARGS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --skill|--repo|--role)
      # rhachet passthrough args with a value - ignore flag + value
      shift
      if [[ $# -gt 0 && "$1" != --* ]]; then
        shift
      fi
      ;;
    --help|-h)
      if [[ -z "$SUBCMD" ]]; then
        show_usage
        exit 0
      fi
      ARGS+=("$1")
      shift
      ;;
    *)
      if [[ -z "$SUBCMD" ]]; then
        SUBCMD="$1"
        shift
        continue
      fi
      ARGS+=("$1")
      shift
      ;;
  esac
done

######################################################################
# validate subcommand
######################################################################
if [[ "$SUBCMD" == "help" ]]; then
  show_usage
  exit 0
fi

case "$SUBCMD" in
  begin|continue|abort)
    ;;
  --*)
    # a flag before any subcommand: the caller meant begin. translate the
    # first-draft flags (--to, --cherry-pick, as #528 spelled them) and
    # hand back the exact command to run
    emit_both "$(
      print_turtle_header "bummer dude..."
      print_tree_start "git.branch.cutover"
      print_tree_constraint "a flag came before the subcommand: $SUBCMD"
      echo "      ├─ the flags ride after begin; --to is --into, --cherry-pick is --pick"
      echo "      └─ did you mean?"
      echo "         └─ $(as_begin_command_from_flags "$SUBCMD" "${ARGS[@]+"${ARGS[@]}"}")"
    )"
    exit 2
    ;;
  "")
    emit_both "$(
      print_turtle_header "bummer dude..."
      print_tree_start "git.branch.cutover"
      print_tree_constraint "subcommand required: begin, continue, or abort"
      show_usage_branches_under_leaf
    )"
    exit 2
    ;;
  *)
    emit_both "$(
      print_turtle_header "bummer dude..."
      print_tree_start "git.branch.cutover"
      print_tree_constraint "unknown subcommand: $SUBCMD"
      show_usage_branches_under_leaf
    )"
    exit 2
    ;;
esac

######################################################################
# dispatch to subcommand
######################################################################
exec "$SKILL_DIR/git.branch.cutover.$SUBCMD.sh" "${ARGS[@]+"${ARGS[@]}"}"
