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
#   - refuses an npm, yarn, or bun repo; refuses a package not installed
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
  print_tree_branch "examples"
  print_tree_child "rhx git.package.patch begin --package rhachet --mode apply"
  print_tree_child "rhx git.package.patch begin --package rhachet@1.48.1 --mode apply" false true
  print_tree_branch "next" true
  print_tree_child "edit the files in the dir, then: rhx git.package.patch commit --package <name> --why '<why>' --upstream '<issue-url>' --mode apply" true true
}

######################################################################
# gate 2: flags
# .note = each flag shifts its value only if one is there, so a flag with
#         no value falls through to its own "is required" refusal
######################################################################
PACKAGE_SPEC=""
EDIT_DIR_ARG=""
MODE="plan"
FLAG_UNKNOWN=""

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
      # held to the end of the parse, so the hint can carry a --package given after it
      [[ -n "$FLAG_UNKNOWN" ]] || FLAG_UNKNOWN="$1"
      shift
      ;;
  esac
done

# an unknown flag (a global -g among them) is refused before any other gate
[[ -z "$FLAG_UNKNOWN" ]] || refuse_constraint "$ROOT_LABEL" "unknown flag $FLAG_UNKNOWN" \
  "drop $FLAG_UNKNOWN; this verb patches the current tree only (flags: --package, --edit-dir, --mode)"$'\n'"$(as_begin_cmd "${PACKAGE_SPEC:-<name>}" "")"

# --package is required
[[ -n "$PACKAGE_SPEC" ]] || refuse_constraint "$ROOT_LABEL" "--package is required" \
  "$(as_begin_cmd "<name>" "")"

# --mode is plan or apply
[[ "$MODE" == "plan" || "$MODE" == "apply" ]] || refuse_constraint "$ROOT_LABEL" \
  "--mode must be plan or apply" \
  "use --mode plan to preview, --mode apply to open"$'\n'"$(as_begin_cmd "$PACKAGE_SPEC" "$EDIT_DIR_ARG")"

######################################################################
# gate 3: repo shape
######################################################################
REPO_ROOT=$(get_repo_root 2>&1) || refuse_malfunction "$ROOT_LABEL" "git could not read the repo root" "$REPO_ROOT"

# the verb patches a git tree; the git root holds the package.json
[[ -n "$REPO_ROOT" ]] || refuse_constraint "$ROOT_LABEL" "not inside a git repo" \
  "run from inside the repo whose dependency you patch"
has_package_json "$REPO_ROOT" || refuse_constraint "$ROOT_LABEL" \
  "the git root holds no package.json" \
  "a workspace rooted below the git root is out of scope; patch from a repo whose root holds package.json"

# pnpm patch is pnpm-only
FOREIGN_LOCKFILE=$(get_foreign_lockfile "$REPO_ROOT")
[[ -z "$FOREIGN_LOCKFILE" ]] || refuse_constraint "$ROOT_LABEL" \
  "this repo locks with $FOREIGN_LOCKFILE; pnpm patch is pnpm-only" \
  "patch only pnpm repos with this verb"

# pnpm cannot apply a patch under the hoisted node-linker
! is_hoisted_repo "$REPO_ROOT" || refuse_constraint "$ROOT_LABEL" \
  "this repo installs with node-linker=hoisted; pnpm cannot apply a patch there" \
  "a hoisted repo is out of scope for this verb; its patch would never apply"$'\n'"the hoisted path is tracked at https://github.com/ehmpathy/rhachet-roles-ehmpathy/issues/772"

######################################################################
# gate 4: location (the given --edit-dir, if any)
######################################################################
EDIT_DIR_FIX="omit --edit-dir to use the in-tree default, $EDIT_DIR_BASE_REL/<name>@<version>"$'\n'"$(as_begin_cmd "$PACKAGE_SPEC" "")"
if [[ -n "$EDIT_DIR_ARG" ]]; then
  is_path_with_parent_segment "$EDIT_DIR_ARG" && refuse_constraint "$ROOT_LABEL" \
    "--edit-dir must sit inside the tree" "$EDIT_DIR_FIX" "given: $EDIT_DIR_ARG"
  EDIT_DIR_REAL=$(get_real_path --path "$EDIT_DIR_ARG" --from "$PWD")
  is_inside_tree --path "$EDIT_DIR_REAL" --root "$REPO_ROOT" || refuse_constraint "$ROOT_LABEL" \
    "--edit-dir must sit inside the tree" "$EDIT_DIR_FIX" \
    "given: $EDIT_DIR_ARG" "real: $EDIT_DIR_REAL"
  is_edit_dir_allowed --given "$EDIT_DIR_ARG" --from "$PWD" --real "$EDIT_DIR_REAL" --root "$REPO_ROOT" \
    || refuse_constraint "$ROOT_LABEL" \
      "--edit-dir must be a scratch dir, never the live install, the patches dir, or a broken link" "$EDIT_DIR_FIX" \
      "given: $EDIT_DIR_ARG" "real: $EDIT_DIR_REAL"
fi

######################################################################
# gate 6: spec
######################################################################
PACKAGE_NAME=$(as_package_name "$PACKAGE_SPEC")
is_package_name "$PACKAGE_NAME" || refuse_constraint "$ROOT_LABEL" \
  "--package is not a valid package name" \
  "name a package as npm does: <name> or @<scope>/<name>"$'\n'"$(as_begin_cmd "<name>" "$EDIT_DIR_ARG")" \
  "given: $PACKAGE_NAME"
PACKAGE_VERSION=$(as_package_version "$PACKAGE_SPEC")
VERSIONS_RAW=$(get_all_installed_versions "$REPO_ROOT" "$PACKAGE_NAME" 2>&1) \
  || refuse_malfunction "$ROOT_LABEL" "could not read the installed versions of $PACKAGE_NAME" "$VERSIONS_RAW"
VERSIONS_FOUND=()
set_list_from_lines --into VERSIONS_FOUND --lines "$VERSIONS_RAW"

# the package must be installed
[[ ${#VERSIONS_FOUND[@]} -gt 0 ]] || refuse_constraint "$ROOT_LABEL" \
  "$PACKAGE_NAME is not installed" \
  "install it first"$'\n'"$(as_install_cmd "$REPO_ROOT" "$PACKAGE_NAME")"
VERSION_LATEST=$(as_latest_version "${VERSIONS_FOUND[@]}")

# a bare name must name exactly one installed version
if [[ -z "$PACKAGE_VERSION" && ${#VERSIONS_FOUND[@]} -gt 1 ]]; then
  VERSION_LINES=()
  set_list_from_lines --into VERSION_LINES --lines "$(as_version_lines "installed" "$PACKAGE_NAME" "${VERSIONS_FOUND[@]}")"
  refuse_constraint "$ROOT_LABEL" "several versions of $PACKAGE_NAME are installed" \
    "name one"$'\n'"$(as_begin_cmd "$PACKAGE_NAME@$VERSION_LATEST" "$EDIT_DIR_ARG")" \
    "${VERSION_LINES[@]}"
fi
[[ -n "$PACKAGE_VERSION" ]] || PACKAGE_VERSION=$(as_sole_version "${VERSIONS_FOUND[@]}")

# a named version must be one that is installed
is_version_listed "$PACKAGE_VERSION" "${VERSIONS_FOUND[@]}" || refuse_constraint "$ROOT_LABEL" \
  "$PACKAGE_NAME@$PACKAGE_VERSION is not installed" \
  "name an installed version: $(as_version_list_text "${VERSIONS_FOUND[@]}")"$'\n'"$(as_begin_cmd "$PACKAGE_NAME@$VERSION_LATEST" "$EDIT_DIR_ARG")"

######################################################################
# gate 7: state
######################################################################
EDIT_DIR_ABS=$(get_edit_dir_abs --given "$EDIT_DIR_ARG" --given-real "${EDIT_DIR_REAL:-}" \
  --root "$REPO_ROOT" --package "$PACKAGE_NAME" --version "$PACKAGE_VERSION")

# the default edit dir is bound too: a symlinked base must not lead out of the tree
is_inside_tree --path "$EDIT_DIR_ABS" --root "$REPO_ROOT" || refuse_constraint "$ROOT_LABEL" \
  "the edit dir must sit inside the tree" \
  "replace the symlink at $EDIT_DIR_BASE_REL with a real dir, or name an in-tree dir"$'\n'"$(as_begin_cmd "$PACKAGE_NAME@$PACKAGE_VERSION" "<in-tree dir>")" \
  "real: $EDIT_DIR_ABS"

EDIT_DIR_SHOW=$(as_rel_to_root "$EDIT_DIR_ABS" "$REPO_ROOT")
PATCH_REL=$(as_patch_rel_path "$PACKAGE_NAME" "$PACKAGE_VERSION")
COMMIT_CMD=$(as_commit_apply_cmd "$PACKAGE_NAME@$PACKAGE_VERSION" "$EDIT_DIR_ARG")

EDIT_DIR_STATE=$(get_edit_dir_state "$EDIT_DIR_ABS" 2>&1) \
  || refuse_malfunction "$ROOT_LABEL" "the edit dir cannot be read" "$EDIT_DIR_STATE"
ACTION=$(as_begin_action "$EDIT_DIR_STATE")

# a dir to reuse must be an edit dir for this same package and version
if [[ "$ACTION" == "reuse" ]]; then
  has_package_json "$EDIT_DIR_ABS" || refuse_constraint "$ROOT_LABEL" \
    "$EDIT_DIR_SHOW holds files but no package.json; it is not an edit dir" \
    "$EDIT_DIR_FIX"
  DIR_NAME=$(get_package_json_field "$EDIT_DIR_ABS/package.json" name 2>&1) \
    || refuse_malfunction "$ROOT_LABEL" "the edit dir's package.json cannot be read" "$DIR_NAME"
  DIR_VERSION=$(get_package_json_field "$EDIT_DIR_ABS/package.json" version 2>&1) \
    || refuse_malfunction "$ROOT_LABEL" "the edit dir's package.json cannot be read" "$DIR_VERSION"
  # the dir's package.json is untrusted text: check its shape before any of it is printed
  is_package_name "$DIR_NAME" && is_version_shape "$DIR_VERSION" || refuse_constraint "$ROOT_LABEL" \
    "$EDIT_DIR_SHOW holds a package.json whose name or version is not a package spec" \
    "$EDIT_DIR_FIX"
  [[ "$DIR_NAME@$DIR_VERSION" == "$PACKAGE_NAME@$PACKAGE_VERSION" ]] || refuse_constraint "$ROOT_LABEL" \
    "the edit dir already holds $DIR_NAME@$DIR_VERSION, not $PACKAGE_NAME@$PACKAGE_VERSION" \
    "$EDIT_DIR_FIX" \
    "edit dir: $EDIT_DIR_SHOW"
fi
PRIOR_PRESENCE=$(get_file_presence "$REPO_ROOT/$PATCH_REL")

# a prior patch whose entry is lost would open pristine; a reseal would then drop its edits
if [[ "$PRIOR_PRESENCE" == "present" && "$ACTION" != "reuse" ]]; then
  SEAL_GAP=$(get_sealed_patch_gap "$REPO_ROOT" "$PATCH_REL")
  [[ "$SEAL_GAP" != "entry" ]] || refuse_constraint "$ROOT_LABEL" \
    "$PATCH_REL is present, but no patchedDependencies entry names it, so pnpm would open $PACKAGE_NAME@$PACKAGE_VERSION without it and a reseal would drop its edits" \
    "$(as_sealed_patch_gap_hint "$SEAL_GAP" "$PACKAGE_NAME@$PACKAGE_VERSION" "$PATCH_REL"), then rerun this begin"
fi
PRIOR=$(as_begin_prior "$PRIOR_PRESENCE" "$PATCH_REL")

######################################################################
# gate 8: mode
######################################################################
if [[ "$MODE" == "plan" ]]; then
  print_turtle_header "heres the wave..."
  print_tree_start "$ROOT_LABEL"
  print_tree_leaf "package" "$PACKAGE_NAME@$PACKAGE_VERSION"
  print_tree_leaf "prior patch" "$PRIOR"
  print_tree_leaf "would $ACTION edit dir" "$EDIT_DIR_SHOW"
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
print_tree_leaf "prior patch" "$PRIOR"
print_tree_leaf "edit dir" "$EDIT_DIR_SHOW" true
print_coconut_hint "edit the files in the dir, then seal them" "$COMMIT_CMD"
