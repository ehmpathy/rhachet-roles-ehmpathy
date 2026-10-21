#!/usr/bin/env bash
######################################################################
# .what = open an edit dir for a dependency, inside the tree, via pnpm patch
#
# .why  = a crew patches a dependency through one paved verb, with no
#         interactive version picker and no path outside its own tree
#
# usage:
#   rhx git.package.patch begin --package rhachet                     # plan (default)
#   rhx git.package.patch begin --package rhachet --mode apply        # open the edit dir
#   rhx git.package.patch begin --package rhachet@1.48.1 --mode apply # name the version
#
# guarantee:
#   - refuses an --edit-dir outside the tree (literal, .., or symlink)
#   - refuses an npm repo; refuses a package not installed
#   - refuses a bare name when several versions are installed, and lists them
#   - reuses an open edit dir; never re-runs pnpm over it
#   - plan by default; --mode apply writes
#   - exit 0 = ok, 1 = malfunction, 2 = constraint
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SKILL_DIR/git.package.patch.operations.sh"
source "$SKILL_DIR/output.sh"

ROOT_LABEL="git.package.patch begin"
trap 'on_exit_render_crash "$ROOT_LABEL"' EXIT

######################################################################
# show usage
######################################################################
show_usage() {
  print_turtle_header "heres the wave..."
  print_tree_start "$ROOT_LABEL"
  print_tree_branch "usage"
  print_tree_child "rhx git.package.patch begin --package <name>[@<version>] [--edit-dir <dir>] [--mode plan|apply]" false true
  print_tree_branch "flags"
  print_tree_child "--package    (required) the dependency to patch; add @<version> when several are installed"
  print_tree_child "--edit-dir   (optional) where to open it; default $EDIT_DIR_BASE_REL/<name>@<version>; must sit inside the tree"
  print_tree_child "--mode       (optional) plan (default) previews; apply opens the dir" false true
  print_tree_branch "next" true
  print_tree_child "edit the files in the dir, then: rhx git.package.patch commit --package <name> --why '<why>' --upstream <url>" true true
}

######################################################################
# gate 2: flags
# .note = each flag shifts its value only if one is there, so a flag with
#         no value falls through to its own "is required" refusal
######################################################################
PACKAGE_SPEC=""
EDIT_DIR_ARG=""
MODE="plan"

while [[ $# -gt 0 ]]; do
  case $1 in
    --skill|--repo|--role)
      shift $(( $# > 1 ? 2 : 1 ))
      ;;
    --package)
      PACKAGE_SPEC="${2:-}"
      shift $(( $# > 1 ? 2 : 1 ))
      ;;
    --edit-dir)
      EDIT_DIR_ARG="${2:-}"
      shift $(( $# > 1 ? 2 : 1 ))
      ;;
    --mode)
      MODE="${2:-}"
      shift $(( $# > 1 ? 2 : 1 ))
      ;;
    --help|-h)
      show_usage
      exit 0
      ;;
    *)
      refuse_constraint "$ROOT_LABEL" "unknown flag $1" \
        "drop $1; this verb patches the current tree only (flags: --package, --edit-dir, --mode)"
      ;;
  esac
done

# --package is required
[[ -n "$PACKAGE_SPEC" ]] || refuse_constraint "$ROOT_LABEL" "--package is required" \
  "rhx git.package.patch begin --package <name>"

# --mode is plan or apply
[[ "$MODE" == "plan" || "$MODE" == "apply" ]] || refuse_constraint "$ROOT_LABEL" \
  "--mode must be plan or apply" "use --mode plan to preview, --mode apply to open"

######################################################################
# gate 3: repo shape
######################################################################
REPO_ROOT=$(get_repo_root 2>&1) || refuse_malfunction "$ROOT_LABEL" "git could not read the repo root" "$REPO_ROOT"

# the verb patches a git tree; the git root holds the package.json
[[ -n "$REPO_ROOT" ]] || refuse_constraint "$ROOT_LABEL" "not inside a git repo" \
  "run from inside the repo whose dependency you patch"
[[ -f "$REPO_ROOT/package.json" ]] || refuse_constraint "$ROOT_LABEL" \
  "the git root holds no package.json" \
  "a workspace rooted below the git root is out of scope; patch from a repo whose root holds package.json"

# pnpm patch is pnpm-only
[[ ! -f "$REPO_ROOT/package-lock.json" ]] || refuse_constraint "$ROOT_LABEL" \
  "this repo uses npm (package-lock.json); pnpm patch is pnpm-only" \
  "patch only pnpm repos with this verb"

######################################################################
# gate 4: location (the given --edit-dir, if any)
######################################################################
EDIT_DIR_FIX="omit --edit-dir to use the in-tree default, $EDIT_DIR_BASE_REL/<name>@<version>"
if [[ -n "$EDIT_DIR_ARG" ]]; then
  is_path_with_parent_segment "$EDIT_DIR_ARG" && refuse_constraint "$ROOT_LABEL" \
    "--edit-dir must sit inside the tree" "$EDIT_DIR_FIX" "given: $EDIT_DIR_ARG"
  EDIT_DIR_REAL=$(get_real_path --path "$EDIT_DIR_ARG" --from "$PWD")
  is_inside_tree --path "$EDIT_DIR_REAL" --root "$REPO_ROOT" || refuse_constraint "$ROOT_LABEL" \
    "--edit-dir must sit inside the tree" "$EDIT_DIR_FIX" \
    "given: $EDIT_DIR_ARG" "real: $EDIT_DIR_REAL"
fi

######################################################################
# gate 6: spec
######################################################################
PACKAGE_NAME=$(as_package_name "$PACKAGE_SPEC")
PACKAGE_VERSION=$(as_package_version "$PACKAGE_SPEC")
VERSIONS_RAW=$(get_all_installed_versions "$REPO_ROOT" "$PACKAGE_NAME" 2>&1) \
  || refuse_malfunction "$ROOT_LABEL" "could not read the installed versions of $PACKAGE_NAME" "$VERSIONS_RAW"
mapfile -t VERSIONS_FOUND < <(printf '%s' "$VERSIONS_RAW")

# the package must be installed
[[ ${#VERSIONS_FOUND[@]} -gt 0 ]] || refuse_constraint "$ROOT_LABEL" \
  "$PACKAGE_NAME is not installed" \
  "install it first: rhx set.package.install --package $PACKAGE_NAME --at <version> --for prod --reason '<why>'"

# a bare name must name exactly one installed version
if [[ -z "$PACKAGE_VERSION" && ${#VERSIONS_FOUND[@]} -gt 1 ]]; then
  mapfile -t VERSION_LINES < <(as_version_lines "installed" "$PACKAGE_NAME" "${VERSIONS_FOUND[@]}")
  refuse_constraint "$ROOT_LABEL" "several versions of $PACKAGE_NAME are installed" \
    "name one: rhx git.package.patch begin --package $PACKAGE_NAME@${VERSIONS_FOUND[-1]}" \
    "${VERSION_LINES[@]}"
fi
[[ -n "$PACKAGE_VERSION" ]] || PACKAGE_VERSION="${VERSIONS_FOUND[0]}"

# a named version must be one that is installed
is_version_listed "$PACKAGE_VERSION" "${VERSIONS_FOUND[@]}" || refuse_constraint "$ROOT_LABEL" \
  "$PACKAGE_NAME@$PACKAGE_VERSION is not installed" \
  "name an installed version: ${VERSIONS_FOUND[*]}"

######################################################################
# gate 7: state
# .note = a given --edit-dir resolves from the cwd (gate 4); the default
#         resolves from the repo root
######################################################################
EDIT_DIR_ABS=$(get_real_path --path "$(as_edit_dir_rel_default "$PACKAGE_NAME" "$PACKAGE_VERSION")" --from "$REPO_ROOT")
[[ -n "$EDIT_DIR_ARG" ]] && EDIT_DIR_ABS="$EDIT_DIR_REAL"
EDIT_DIR_SHOW=$(as_rel_to_root "$EDIT_DIR_ABS" "$REPO_ROOT")
PATCH_REL=$(as_patch_rel_path "$PACKAGE_NAME" "$PACKAGE_VERSION")
COMMIT_CMD=$(as_commit_cmd "$PACKAGE_NAME@$PACKAGE_VERSION" "$EDIT_DIR_ARG")

EDIT_DIR_STATE=$(get_edit_dir_state "$EDIT_DIR_ABS" 2>&1) \
  || refuse_malfunction "$ROOT_LABEL" "the edit dir cannot be read" "$EDIT_DIR_STATE"
ACTION="open"
[[ "$EDIT_DIR_STATE" == "open" ]] && ACTION="reuse"
PRIOR="none"
[[ -f "$REPO_ROOT/$PATCH_REL" ]] && PRIOR="$PATCH_REL (opens with it applied)"

######################################################################
# gate 8: mode
######################################################################
if [[ "$MODE" == "plan" ]]; then
  print_turtle_header "heres the wave..."
  print_tree_start "$ROOT_LABEL"
  print_tree_leaf "package" "$PACKAGE_NAME@$PACKAGE_VERSION"
  print_tree_leaf "edit dir" "$EDIT_DIR_SHOW"
  print_tree_leaf "prior patch" "$PRIOR"
  print_tree_leaf "would" "$ACTION the edit dir"
  print_tree_leaf "mode" "plan (naught changed)" true
  print_coconut_hint "rerun with --mode apply to $ACTION it" "$(as_begin_cmd "$PACKAGE_NAME@$PACKAGE_VERSION" "$EDIT_DIR_ARG")"
  exit 0
fi

# reuse an open dir; pnpm is never run over it
if [[ "$ACTION" == "reuse" ]]; then
  print_turtle_header "righteous!"
  print_tree_start "$ROOT_LABEL"
  print_tree_leaf "package" "$PACKAGE_NAME@$PACKAGE_VERSION"
  print_tree_leaf "edit dir" "$EDIT_DIR_SHOW (already open, reused; edits untouched)" true
  print_coconut_hint "edit the files in the dir, then seal them" "$COMMIT_CMD"
  exit 0
fi

# open the dir via pnpm
PNPM_OUT=$(set_edit_dir_via_pnpm "$REPO_ROOT" "$PACKAGE_NAME@$PACKAGE_VERSION" "$EDIT_DIR_ABS") \
  || refuse_malfunction "$ROOT_LABEL" "pnpm patch failed" "$PNPM_OUT"
EDIT_DIR_STATE=$(get_edit_dir_state "$EDIT_DIR_ABS" 2>&1) \
  || refuse_malfunction "$ROOT_LABEL" "the edit dir cannot be read" "$EDIT_DIR_STATE"
[[ "$EDIT_DIR_STATE" == "open" ]] || refuse_malfunction "$ROOT_LABEL" \
  "pnpm patch left no edit dir at $EDIT_DIR_SHOW" "$PNPM_OUT"

print_turtle_header "shell yeah!"
print_tree_start "$ROOT_LABEL"
print_tree_leaf "package" "$PACKAGE_NAME@$PACKAGE_VERSION"
print_tree_leaf "edit dir" "$EDIT_DIR_SHOW"
print_tree_leaf "prior patch" "$PRIOR" true
print_coconut_hint "edit the files in the dir, then seal them" "$COMMIT_CMD"
