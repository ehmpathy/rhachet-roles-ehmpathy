#!/usr/bin/env bash
######################################################################
# .what = set a local patch on a dependency: open its edit dir, then
#         seal the edits into a patch + a LOCAL PATCH note
#
# .why  = one verb for the write half of the lifecycle; the motive flags
#         tell the two phases apart, so a crew never picks a phase name:
#         - no --why, no --upstream → open the edit dir (set.open)
#         - --why or --upstream     → seal the open edit dir (set.seal)
#
# usage:
#   rhx git.package.patch set --package rhachet                                  # plan the open
#   rhx git.package.patch set --package rhachet --mode apply                     # open the edit dir
#   rhx git.package.patch set --package rhachet --why '<why>' --upstream '<issue-url>' --mode apply   # seal
#
# guarantee:
#   - routes by the motive flags alone; every other gate is the phase's own
#   - a seal with --why or --upstream absent is refused by the seal, named
#   - plan by default in both phases; --mode apply writes
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SKILL_DIR/output.sh"
trap 'on_exit_render_crash "git.package.patch set"' EXIT

######################################################################
# show usage
######################################################################
show_usage() {
  print_turtle_header "heres the wave..."
  print_tree_start "git.package.patch set"
  print_tree_branch "usage"
  print_tree_child "rhx git.package.patch set --package <name>[@<version>] [--edit-dir <dir>] [--mode plan|apply]"
  print_tree_child "rhx git.package.patch set --package <name>[@<version>] --why '<why>' --upstream '<issue-url>' [--edit-dir <dir>] [--mode plan|apply]" false true
  print_tree_branch "phases"
  print_tree_child "open   no --why, no --upstream: open an in-tree edit dir, with any committed patch laid on it"
  print_tree_child "seal   --why + --upstream: seal the edit dir into patches/<name>@<version>.patch + its note" false true
  print_tree_branch "flags"
  print_tree_child "--package    (required) the dependency, bare or @<version>"
  print_tree_child "--why        (seal) why the patch exists; @stdin reads it from a pipe"
  print_tree_child "--upstream   (seal) the http(s) link where the upstream fix is queued"
  print_tree_child "--edit-dir   (optional) an in-tree dir; default node_modules/.pnpm_patches/<name>@<version>"
  print_tree_child "--mode       (optional) plan (default) or apply" false true
  print_tree_branch "examples" true
  print_tree_child "rhx git.package.patch set --package rhachet --mode apply" true false
  print_tree_child "rhx git.package.patch set --package rhachet --why 'keep the stop hook quiet on a clean tree' --upstream https://github.com/ehmpathy/rhachet/issues/580 --mode apply" true false
  print_tree_child "printf 'keep the stop hook quiet' | rhx git.package.patch set --package rhachet --why @stdin --upstream https://github.com/ehmpathy/rhachet/issues/580 --mode apply" true true
}

######################################################################
# route by the motive flags
######################################################################
PHASE="open"
for ARG in "$@"; do
  case "$ARG" in
    --help|-h)
      show_usage
      exit 0
      ;;
    --why|--upstream)
      PHASE="seal"
      ;;
  esac
done

exec "$SKILL_DIR/git.package.patch.set.$PHASE.sh" "$@"
