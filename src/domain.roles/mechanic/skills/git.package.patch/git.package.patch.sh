#!/usr/bin/env bash
######################################################################
# .what = dispatch git.package.patch subcommands to their handlers
#
# .why  = one paved verb for the pnpm patch lifecycle:
#         - one permission rule covers every subcommand, so a crew
#           patches a dependency with no harness prompt
#         - raw `pnpm patch` / `pnpm patch-commit` redirect here
#
# usage:
#   rhx git.package.patch begin  --package rhachet --mode apply
#   rhx git.package.patch commit --package rhachet --why '<why>' --upstream '<issue-url>' --mode apply
#   rhx git.package.patch get
#   rhx git.package.patch check [--when hook.onStop]
#   rhx git.package.patch del    --package rhachet --mode apply
#   rhx git.package.patch help
#
# guarantee:
#   - dispatches to the subskill via exec (single process)
#   - passes all rest args to the subskill
#   - an unknown subcommand is refused with the valid ones named
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SKILL_DIR/output.sh"
trap 'on_exit_render_crash "git.package.patch"' EXIT

######################################################################
# show usage
######################################################################
show_usage() {
  print_turtle_header "heres the wave..."
  print_tree_start "git.package.patch"
  print_tree_branch "subcommands"
  print_tree_child "begin    open an edit dir for a dependency, inside the tree"
  print_tree_child "commit   seal the edits into a patch + a LOCAL PATCH note"
  print_tree_child "get      list each patch: package, why, upstream, apply state"
  print_tree_child "check    name each patch that no longer applies, and its repair"
  print_tree_child "del      retire a patch: its entry, its file, and its note"
  print_tree_child "help     show this usage" false true
  print_tree_branch "examples" true
  print_tree_child "rhx git.package.patch begin --package rhachet --mode apply" true false
  print_tree_child "rhx git.package.patch commit --package rhachet --why 'keep the stop hook quiet on a clean tree' --upstream https://github.com/ehmpathy/rhachet/issues/580 --mode apply" true false
  print_tree_child "rhx git.package.patch check" true false
  print_tree_child "rhx git.package.patch del --package rhachet --mode apply" true true
}

######################################################################
# parse arguments
######################################################################
SUBCMD=""
ARGS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --skill|--repo|--role)
      shift $(( $# > 1 ? 2 : 1 ))
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
# dispatch
######################################################################
case "$SUBCMD" in
  help)
    show_usage
    exit 0
    ;;
  begin|commit|get|check|del)
    # forward every rest arg; the `+` form keeps an empty list legal under set -u
    # .note = the subskills need bash >= 4.3 (mapfile, a nameref), as other mechanic skills do
    exec "$SKILL_DIR/git.package.patch.$SUBCMD.sh" "${ARGS[@]+"${ARGS[@]}"}"
    ;;
  "")
    refuse_constraint "git.package.patch" "subcommand required" \
      "rhx git.package.patch begin --package <name>  (or: commit, get, check, del, help)"
    ;;
  *)
    refuse_constraint "git.package.patch" "unknown subcommand: $SUBCMD" \
      "use one of: begin, commit, get, check, del, help"$'\n'"rhx git.package.patch help"
    ;;
esac
