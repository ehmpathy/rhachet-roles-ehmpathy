#!/usr/bin/env bash
######################################################################
# .what = a human meter that admits a gated package to an in-tree patch
#
# .why  = rhachet and its roles grade and gate this tree; a clone that
#         patched them could soften its own guards. so set refuses a
#         gated package until a human, at their own terminal, grants it
#         here with a why on record
#
# usage:
#   rhx git.package.patch.uses get
#   rhx git.package.patch.uses allow --package rhachet --why '<why>'   # human only
#   rhx git.package.patch.uses block --package rhachet                 # human only
#
# guarantee:
#   - state stored in .meter/git.package.patch.uses.jsonc as
#     { "packages": { "<name>": { "allowed": bool, "why": str, "at": iso } } }
#   - allow and block are human-only (a tty on stdin); get is open
#   - allow requires --why; a package is named bare, never with a version
#   - an ungated package needs no grant, so allow and block refuse it
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# the actor guard + the gitignored meter dir are the commit meter's own
source "$SKILL_DIR/../git.commit/output.sh"
source "$SKILL_DIR/../git.commit/git.commit.operations.sh"
# .note = output.sh sources LAST, as in set: the operations pull in other
#         render libs whose print_* shapes differ, and this verb renders with ours
source "$SKILL_DIR/git.package.patch.operations.sh"
source "$SKILL_DIR/output.sh"

ROOT_LABEL="git.package.patch.uses"
trap 'on_exit_render_crash "$ROOT_LABEL"' EXIT

######################################################################
# show usage
######################################################################
show_usage() {
  print_turtle_header "heres the wave..."
  print_tree_start "$ROOT_LABEL"
  print_tree_branch "subcommands"
  print_tree_child "get     list the gated packages and each grant"
  print_tree_child "allow   admit a gated package to an in-tree patch (human only)"
  print_tree_child "block   withdraw a grant (human only)" false true
  print_tree_branch "gated packages"
  print_tree_child "$(as_gated_list_text)" false true
  print_tree_branch "examples" true
  print_tree_child "rhx git.package.patch.uses get" true false
  print_tree_child "rhx git.package.patch.uses allow --package rhachet --why 'hold the stop hook quiet until rhachet#580 ships'" true false
  print_tree_child "rhx git.package.patch.uses block --package rhachet" true true
}

######################################################################
# parse arguments
######################################################################
COMMAND=""
PACKAGE=""
WHY=""
FLAG_UNKNOWN=""

while [[ $# -gt 0 ]]; do
  case $1 in
    get|allow|block)
      [[ -z "$COMMAND" ]] && COMMAND="$1"
      shift
      ;;
    --package)
      PACKAGE="${2:-}"
      shift $(( $# > 1 ? 2 : 1 ))
      ;;
    --why)
      WHY="${2:-}"
      shift $(( $# > 1 ? 2 : 1 ))
      ;;
    --skill|--repo|--role)
      shift $(( $# > 1 ? 2 : 1 ))
      ;;
    --help|-h|help)
      show_usage
      exit 0
      ;;
    *)
      [[ -z "$FLAG_UNKNOWN" ]] && FLAG_UNKNOWN="$1"
      shift
      ;;
  esac
done

######################################################################
# gate 1: flags
######################################################################
[[ -z "$FLAG_UNKNOWN" ]] || refuse_constraint "$ROOT_LABEL" \
  "unknown argument: $FLAG_UNKNOWN" \
  "use one of: get, allow, block (flags: --package, --why)"$'\n'"rhx git.package.patch.uses help"
[[ -n "$COMMAND" ]] || refuse_constraint "$ROOT_LABEL" \
  "subcommand required" \
  "use one of: get, allow, block"$'\n'"rhx git.package.patch.uses get"

######################################################################
# gate 2: repo
######################################################################
REPO_ROOT=$(get_repo_root 2>&1) || refuse_malfunction "$ROOT_LABEL" "git could not read the repo root" "$REPO_ROOT"
METER_FILE=$(get_patch_uses_meter_file "$REPO_ROOT")
METER_REL=$(as_rel_to_root "$METER_FILE" "$REPO_ROOT")

######################################################################
# get: open to all
######################################################################
if [[ "$COMMAND" == "get" ]]; then
  [[ -n "$PACKAGE$WHY" ]] && refuse_constraint "$ROOT_LABEL" \
    "get takes no flags" "rhx git.package.patch.uses get"
  print_turtle_header "lets check the meter..."
  print_tree_start "$ROOT_LABEL"
  print_tree_leaf "meter" "$METER_REL"
  print_tree_branch "gated packages" true
  COUNT=${#GATED_PACKAGES[@]}
  INDEX=0
  for EACH in "${GATED_PACKAGES[@]}"; do
    INDEX=$((INDEX + 1))
    IS_LAST=false
    [[ $INDEX -eq $COUNT ]] && IS_LAST=true
    GRANT=$(get_patch_grant_why "$REPO_ROOT" "$EACH" 2>&1) \
      || refuse_malfunction "$ROOT_LABEL" "the grant meter $METER_REL cannot be read" "$GRANT"
    STATE="blocked (no grant)"
    [[ -n "$GRANT" ]] && STATE="granted: $GRANT"
    print_tree_child "$EACH: $STATE" true "$IS_LAST"
  done
  print_coconut_hint "a human admits a gated package at their own terminal" \
    "rhx git.package.patch.uses allow --package <name> --why '<why>'"
  exit 0
fi

######################################################################
# gate 3: actor — allow and block are a human's call
######################################################################
# .note = the guard renders its own refusal and exits 2, so the crash trap
#         must let that exit pass; it is re-armed once a human is proven
REFUSAL_RENDERED="true"
guard_actor_is_human_via_stdin "$ROOT_LABEL $COMMAND"
REFUSAL_RENDERED="false"

######################################################################
# gate 4: package
######################################################################
USES_FIX="rhx git.package.patch.uses $COMMAND --package <name>"
[[ "$COMMAND" == "allow" ]] && USES_FIX="$USES_FIX --why '<why>'"
[[ -n "$PACKAGE" ]] || refuse_constraint "$ROOT_LABEL" \
  "--package is required" "name one of the gated packages: $(as_gated_list_text)"$'\n'"$USES_FIX"
[[ "$(as_package_name "$PACKAGE")" == "$PACKAGE" ]] || refuse_constraint "$ROOT_LABEL" \
  "--package names a package bare; a grant covers every version" \
  "drop the version"$'\n'"rhx git.package.patch.uses $COMMAND --package $(as_package_name "$PACKAGE")" \
  "given: $PACKAGE"
is_package_gated "$PACKAGE" || refuse_constraint "$ROOT_LABEL" \
  "$PACKAGE is not gated, so it needs no grant" \
  "patch it direct"$'\n'"rhx git.package.patch set --package $PACKAGE" \
  "gated: $(as_gated_list_text)"
[[ "$COMMAND" == "block" || -n "$WHY" ]] || refuse_constraint "$ROOT_LABEL" \
  "--why is required; a grant carries its reason on record" \
  "rhx git.package.patch.uses allow --package $PACKAGE --why '<why>'"
[[ "$WHY" != *$'\n'* ]] || refuse_constraint "$ROOT_LABEL" \
  "--why spans several lines; a grant needs one" \
  "rhx git.package.patch.uses allow --package $PACKAGE --why '<one line>'"

######################################################################
# write the grant
######################################################################
GRANT_ERR=$(set_patch_grant "$REPO_ROOT" "$PACKAGE" "$COMMAND" "$WHY" 2>&1) \
  || refuse_malfunction "$ROOT_LABEL" "the grant meter $METER_REL could not be written" "$GRANT_ERR"

if [[ "$COMMAND" == "allow" ]]; then
  print_turtle_header "radical! let's ride!"
  print_tree_start "$ROOT_LABEL allow"
  print_tree_leaf "package" "$PACKAGE"
  print_tree_leaf "why" "$WHY"
  print_tree_leaf "grant" "a clone may set an in-tree patch of $PACKAGE" true
  print_coconut_hint "withdraw it once the upstream fix ships" "rhx git.package.patch.uses block --package $PACKAGE"
  exit 0
fi

print_turtle_header "groovy, break time"
print_tree_start "$ROOT_LABEL block"
print_tree_leaf "package" "$PACKAGE"
print_tree_leaf "grant" "withdrawn; set refuses $PACKAGE again" true
