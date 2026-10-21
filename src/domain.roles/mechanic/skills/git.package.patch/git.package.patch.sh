#!/usr/bin/env bash
######################################################################
# .what = dispatch git.package.patch subcommands to their handlers
#
# .why  = one paved verb for the pnpm patch lifecycle:
#         - one permission rule covers begin + commit, so a crew
#           patches a dependency with no harness prompt
#         - raw `pnpm patch` / `pnpm patch-commit` redirect here
#
# usage:
#   rhx git.package.patch begin  --package rhachet --mode apply
#   rhx git.package.patch commit --package rhachet --why '<why>' --upstream <url> --mode apply
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

######################################################################
# show usage
######################################################################
show_usage() {
  print_turtle_header "heres the wave..."
  print_tree_start "git.package.patch"
  print_tree_branch "subcommands"
  print_tree_child "begin    open an edit dir for a dependency, inside the tree"
  print_tree_child "commit   seal the edits into a patch + a LOCAL PATCH note"
  print_tree_child "help     show this usage" false true
  print_tree_branch "examples" true
  print_tree_child "rhx git.package.patch begin --package rhachet --mode apply" true false
  print_tree_child "rhx git.package.patch commit --package rhachet --why '<why>' --upstream <url> --mode apply" true true
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
  begin|commit)
    # forward every rest arg; the `+` form keeps an empty list legal under set -u on bash 3.2 (macos)
    exec "$SKILL_DIR/git.package.patch.$SUBCMD.sh" "${ARGS[@]+"${ARGS[@]}"}"
    ;;
  "")
    refuse_constraint "git.package.patch" "subcommand required" \
      "rhx git.package.patch begin --package <name>  (or: commit, help)"
    ;;
  *)
    refuse_constraint "git.package.patch" "unknown subcommand: $SUBCMD" \
      "use one of: begin, commit, help"
    ;;
esac
