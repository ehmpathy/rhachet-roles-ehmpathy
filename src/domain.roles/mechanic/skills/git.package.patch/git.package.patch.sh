#!/usr/bin/env bash
######################################################################
# .what = dispatch git.package.patch subcommands to their handlers
#
# .why  = one paved verb for the pnpm patch lifecycle, on the get/set/del
#         vocabulary every mechanic verb shares:
#         - one permission rule covers every subcommand, so a crew
#           patches a dependency with no harness prompt
#         - raw `pnpm patch` / `pnpm patch-commit` redirect here
#
# usage:
#   rhx git.package.patch set --package rhachet --mode apply              # open an edit dir
#   rhx git.package.patch set --package rhachet --why '<why>' --upstream '<issue-url>' --mode apply   # seal it
#   rhx git.package.patch get [--when hook.onStop]
#   rhx git.package.patch del --package rhachet --mode apply
#   rhx git.package.patch help
#
# guarantee:
#   - dispatches to the subskill via exec (single process)
#   - passes all rest args to the subskill
#   - an unknown subcommand is refused with the valid ones named
#   - the grant meter for a gated package is its own skill, git.package.patch.uses
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
  print_tree_child "set    open an edit dir; with --why + --upstream, seal it into a patch + note"
  print_tree_child "get    each patch: apply state, why, upstream, and the repair if stale"
  print_tree_child "del    retire a patch: its entry, its file, and its note"
  print_tree_child "help   show this usage" false true
  print_tree_branch "examples" true
  print_tree_child "rhx git.package.patch set --package rhachet --mode apply" true false
  print_tree_child "rhx git.package.patch set --package rhachet --why 'keep the stop hook quiet on a clean tree' --upstream https://github.com/ehmpathy/rhachet/issues/580 --mode apply" true false
  print_tree_child "rhx git.package.patch get" true false
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
  set|get|del)
    # forward every rest arg; the `+` form keeps an empty list legal under set -u
    # .note = the subskills need bash >= 4.3 (mapfile, a nameref), as other mechanic skills do
    exec "$SKILL_DIR/git.package.patch.$SUBCMD.sh" "${ARGS[@]+"${ARGS[@]}"}"
    ;;
  "")
    refuse_constraint "git.package.patch" "subcommand required" \
      "use one of: set, get, del, help"$'\n'"rhx git.package.patch set --package <name> --mode apply"
    ;;
  *)
    refuse_constraint "git.package.patch" "unknown subcommand: $SUBCMD" \
      "use one of: set, get, del, help"$'\n'"rhx git.package.patch help"
    ;;
esac
