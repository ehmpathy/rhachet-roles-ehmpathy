#!/usr/bin/env bash
######################################################################
# .what = seal an open edit dir into a patch via pnpm patch-commit,
#         and write the LOCAL PATCH note beside it
#
# .why  = a patch with no why and no upstream ref is a fork nobody
#         knows to retire; the note keeps who, when, why, and where
#         the upstream fix waits, right beside the patch it explains
#
# usage:
#   rhx git.package.patch commit --package rhachet --why '<why>' --upstream <url>               # plan
#   rhx git.package.patch commit --package rhachet --why '<why>' --upstream <url> --mode apply  # seal
#
# guarantee:
#   - refuses an absent --why, an absent --upstream, or an --upstream that is not a link
#   - refuses when git identity is absent (the note needs a who)
#   - refuses an --edit-dir outside the tree (literal, .., or symlink)
#   - refuses an edit dir that holds another package or version than --package names
#   - writes patches/<name>@<version>.patch + .patch.note.md; removes the edit dir
#   - a re-run after seal with the same note is a no-op
#   - plan by default; --mode apply writes
#   - exit 0 = ok, 1 = malfunction, 2 = constraint
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SKILL_DIR/git.package.patch.operations.sh"
source "$SKILL_DIR/output.sh"

ROOT_LABEL="git.package.patch commit"
trap 'on_exit_render_crash "$ROOT_LABEL"' EXIT

######################################################################
# show usage
######################################################################
show_usage() {
  print_turtle_header "heres the wave..."
  print_tree_start "$ROOT_LABEL"
  print_tree_branch "usage"
  print_tree_child "rhx git.package.patch commit --package <name>[@<version>] --why '<why>' --upstream <url> [--edit-dir <dir>] [--mode plan|apply]" false true
  print_tree_branch "flags" true
  print_tree_child "--package    (required) the dependency whose edit dir to seal" true false
  print_tree_child "--why        (required) why the patch is needed" true false
  print_tree_child "--upstream   (required) the issue or pr where the real fix is queued; an http(s) link" true false
  print_tree_child "--edit-dir   (optional) the dir begin opened; default $EDIT_DIR_BASE_REL/<name>@<version>; must sit inside the tree" true false
  print_tree_child "--mode       (optional) plan (default) previews; apply seals" true true
}

######################################################################
# gate 2: flags
# .note = each flag shifts its value only if one is there, so a flag with
#         no value falls through to its own "is required" refusal
######################################################################
PACKAGE_SPEC=""
WHY=""
UPSTREAM=""
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
    --why)
      WHY="${2:-}"
      shift $(( $# > 1 ? 2 : 1 ))
      ;;
    --upstream)
      UPSTREAM="${2:-}"
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
        "drop $1; this verb patches the current tree only (flags: --package, --why, --upstream, --edit-dir, --mode)"
      ;;
  esac
done

# --package is required
[[ -n "$PACKAGE_SPEC" ]] || refuse_constraint "$ROOT_LABEL" "--package is required" \
  "rhx git.package.patch commit --package <name> --why '<why>' --upstream <url>"

# --mode is plan or apply
[[ "$MODE" == "plan" || "$MODE" == "apply" ]] || refuse_constraint "$ROOT_LABEL" \
  "--mode must be plan or apply" "use --mode plan to preview, --mode apply to seal"

######################################################################
# gate 3: repo shape
######################################################################
REPO_ROOT=$(get_repo_root 2>&1) || refuse_malfunction "$ROOT_LABEL" "git could not read the repo root" "$REPO_ROOT"
[[ -n "$REPO_ROOT" ]] || refuse_constraint "$ROOT_LABEL" "not inside a git repo" \
  "run from inside the repo whose dependency you patch"
[[ -f "$REPO_ROOT/package.json" ]] || refuse_constraint "$ROOT_LABEL" \
  "the git root holds no package.json" \
  "a workspace rooted below the git root is out of scope; patch from a repo whose root holds package.json"
[[ ! -f "$REPO_ROOT/package-lock.json" ]] || refuse_constraint "$ROOT_LABEL" \
  "this repo uses npm (package-lock.json); pnpm patch is pnpm-only" \
  "patch only pnpm repos with this verb"

######################################################################
# gate 4: location
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
# gate 5: note inputs + git identity
######################################################################
[[ -n "$WHY" ]] || refuse_constraint "$ROOT_LABEL" "--why is required" \
  "add --why '<why this patch is needed>'"
[[ -n "$UPSTREAM" ]] || refuse_constraint "$ROOT_LABEL" "--upstream is required" \
  "add --upstream <url> — an issue or pr url where the real fix is queued"
is_upstream_link "$UPSTREAM" || refuse_constraint "$ROOT_LABEL" \
  "--upstream must be an http(s) link" \
  "add --upstream <url> — an issue or pr url where the real fix is queued" \
  "given: $UPSTREAM"

WHO_NAME=$(get_git_config_value "$REPO_ROOT" user.name 2>&1) \
  || refuse_malfunction "$ROOT_LABEL" "git could not read user.name" "$WHO_NAME"
WHO_EMAIL=$(get_git_config_value "$REPO_ROOT" user.email 2>&1) \
  || refuse_malfunction "$ROOT_LABEL" "git could not read user.email" "$WHO_EMAIL"
[[ -n "$WHO_NAME" && -n "$WHO_EMAIL" ]] || refuse_constraint "$ROOT_LABEL" \
  "git identity absent; the note needs a who" \
  "git config user.name '<name>' && git config user.email '<email>'"
WHO="$WHO_NAME <$WHO_EMAIL>"

######################################################################
# gate 6: spec
######################################################################
PACKAGE_NAME=$(as_package_name "$PACKAGE_SPEC")
PACKAGE_VERSION=$(as_package_version "$PACKAGE_SPEC")
VERSIONS_RAW=$(get_all_installed_versions "$REPO_ROOT" "$PACKAGE_NAME" 2>&1) \
  || refuse_malfunction "$ROOT_LABEL" "could not read the installed versions of $PACKAGE_NAME" "$VERSIONS_RAW"
mapfile -t VERSIONS_FOUND < <(printf '%s' "$VERSIONS_RAW")
[[ ${#VERSIONS_FOUND[@]} -gt 0 ]] || refuse_constraint "$ROOT_LABEL" \
  "$PACKAGE_NAME is not installed" \
  "install it first: rhx set.package.install --package $PACKAGE_NAME --at <version> --for prod --reason '<why>'"

# a bare name with no --edit-dir takes the one open default edit dir for that name
if [[ -z "$PACKAGE_VERSION" && -z "$EDIT_DIR_ARG" ]]; then
  OPEN_RAW=$(get_all_open_edit_dir_versions "$REPO_ROOT" "$PACKAGE_NAME" 2>&1) \
    || refuse_malfunction "$ROOT_LABEL" "an edit dir cannot be read" "$OPEN_RAW"
  mapfile -t OPEN_VERSIONS < <(printf '%s' "$OPEN_RAW")
  if [[ ${#OPEN_VERSIONS[@]} -gt 1 ]]; then
    mapfile -t OPEN_LINES < <(as_version_lines "open" "$EDIT_DIR_BASE_REL/$PACKAGE_NAME" "${OPEN_VERSIONS[@]}")
    refuse_constraint "$ROOT_LABEL" "several edit dirs are open for $PACKAGE_NAME" \
      "name one: rhx git.package.patch commit --package $PACKAGE_NAME@${OPEN_VERSIONS[0]} ..." \
      "${OPEN_LINES[@]}"
  fi
  [[ ${#OPEN_VERSIONS[@]} -eq 1 ]] && PACKAGE_VERSION="${OPEN_VERSIONS[0]}"
fi

# a bare name with no open dir must still name exactly one installed version
if [[ -z "$PACKAGE_VERSION" && -z "$EDIT_DIR_ARG" ]]; then
  [[ ${#VERSIONS_FOUND[@]} -eq 1 ]] || refuse_constraint "$ROOT_LABEL" \
    "several versions of $PACKAGE_NAME are installed, and none has an open edit dir" \
    "name one: rhx git.package.patch commit --package $PACKAGE_NAME@${VERSIONS_FOUND[-1]} ..."
  PACKAGE_VERSION="${VERSIONS_FOUND[0]}"
fi

######################################################################
# gate 7: state
# .note = a given --edit-dir resolves from the cwd (gate 4); the default
#         resolves from the repo root
######################################################################
if [[ -n "$EDIT_DIR_ARG" ]]; then
  EDIT_DIR_ABS="$EDIT_DIR_REAL"
fi
if [[ -z "$EDIT_DIR_ARG" ]]; then
  EDIT_DIR_ABS=$(get_real_path --path "$(as_edit_dir_rel_default "$PACKAGE_NAME" "$PACKAGE_VERSION")" --from "$REPO_ROOT")
fi
EDIT_DIR_SHOW=$(as_rel_to_root "$EDIT_DIR_ABS" "$REPO_ROOT")
EDIT_DIR_STATE=$(get_edit_dir_state "$EDIT_DIR_ABS" 2>&1) \
  || refuse_malfunction "$ROOT_LABEL" "the edit dir cannot be read" "$EDIT_DIR_STATE"

# an open dir names its own package; it must be the one --package names
if [[ "$EDIT_DIR_STATE" == "open" && -f "$EDIT_DIR_ABS/package.json" ]]; then
  DIR_NAME=$(get_package_json_field "$EDIT_DIR_ABS/package.json" name 2>&1) \
    || refuse_malfunction "$ROOT_LABEL" "the edit dir's package.json cannot be read" "$DIR_NAME"
  DIR_VERSION=$(get_package_json_field "$EDIT_DIR_ABS/package.json" version 2>&1) \
    || refuse_malfunction "$ROOT_LABEL" "the edit dir's package.json cannot be read" "$DIR_VERSION"
  [[ "$DIR_NAME" == "$PACKAGE_NAME" ]] || refuse_constraint "$ROOT_LABEL" \
    "the edit dir holds $DIR_NAME@$DIR_VERSION, not $PACKAGE_NAME" \
    "name the package the dir holds: --package $DIR_NAME@$DIR_VERSION" \
    "edit dir: $EDIT_DIR_SHOW"
  [[ -z "$PACKAGE_VERSION" || "$PACKAGE_VERSION" == "$DIR_VERSION" ]] || refuse_constraint "$ROOT_LABEL" \
    "the edit dir holds $PACKAGE_NAME@$DIR_VERSION, not @$PACKAGE_VERSION" \
    "name the version the dir holds: --package $PACKAGE_NAME@$DIR_VERSION" \
    "edit dir: $EDIT_DIR_SHOW"
  PACKAGE_VERSION="$DIR_VERSION"
fi
[[ -n "$PACKAGE_VERSION" ]] || refuse_constraint "$ROOT_LABEL" \
  "no open edit dir at $EDIT_DIR_SHOW" \
  "open one first: $(as_begin_cmd "$PACKAGE_NAME" "$EDIT_DIR_ARG")"

PATCH_REL=$(as_patch_rel_path "$PACKAGE_NAME" "$PACKAGE_VERSION")
NOTE_REL=$(as_note_rel_path "$PACKAGE_NAME" "$PACKAGE_VERSION")
WHEN=$(date -u +%Y-%m-%d)

# no open dir: a sealed patch with the same note is a no-op; else begin is owed
if [[ "$EDIT_DIR_STATE" != "open" ]]; then
  NOTE_NOW=""
  if [[ -f "$REPO_ROOT/$NOTE_REL" ]]; then
    NOTE_NOW=$(cat "$REPO_ROOT/$NOTE_REL" 2>&1) \
      || refuse_malfunction "$ROOT_LABEL" "the note at $NOTE_REL cannot be read" "$NOTE_NOW"
  fi
  if [[ -f "$REPO_ROOT/$PATCH_REL" ]] && is_note_of "$NOTE_NOW" "$WHY" "$UPSTREAM"; then
    print_turtle_header "righteous!"
    print_tree_start "$ROOT_LABEL"
    print_tree_leaf "package" "$PACKAGE_NAME@$PACKAGE_VERSION"
    print_tree_leaf "patch" "$PATCH_REL"
    print_tree_leaf "note" "$NOTE_REL"
    print_tree_leaf "state" "already sealed with this note; naught changed" true
    exit 0
  fi
  refuse_constraint "$ROOT_LABEL" "no open edit dir at $EDIT_DIR_SHOW" \
    "open one first: $(as_begin_cmd "$PACKAGE_NAME@$PACKAGE_VERSION" "$EDIT_DIR_ARG")"
fi

######################################################################
# gate 8: mode
######################################################################
PATCH_STATE="written"
[[ -f "$REPO_ROOT/$PATCH_REL" ]] && PATCH_STATE="re-sealed"
PRIOR="none"
[[ "$PATCH_STATE" == "re-sealed" ]] && PRIOR="$PATCH_REL (re-sealed)"

if [[ "$MODE" == "plan" ]]; then
  print_turtle_header "heres the wave..."
  print_tree_start "$ROOT_LABEL"
  print_tree_leaf "package" "$PACKAGE_NAME@$PACKAGE_VERSION"
  print_tree_leaf "edit dir" "$EDIT_DIR_SHOW"
  print_tree_leaf "prior patch" "$PRIOR"
  print_tree_leaf "would write patch" "$PATCH_REL"
  print_tree_leaf "would write note" "$NOTE_REL"
  print_tree_leaf "would record" "patchedDependencies[$PACKAGE_NAME@$PACKAGE_VERSION]"
  print_tree_leaf "mode" "plan (naught changed)" true
  print_coconut_hint "rerun this same commit with --mode apply to seal it"
  exit 0
fi

# seal via pnpm
PNPM_OUT=$(set_patch_via_pnpm "$REPO_ROOT" "$EDIT_DIR_ABS") \
  || refuse_malfunction "$ROOT_LABEL" "pnpm patch-commit failed" "$PNPM_OUT"

# no patch file means pnpm saw no edits; pnpm leaves the dir open and records naught
[[ -f "$REPO_ROOT/$PATCH_REL" ]] || refuse_constraint "$ROOT_LABEL" \
  "no edits to seal in $EDIT_DIR_SHOW" \
  "edit the files in $EDIT_DIR_SHOW, then rerun this commit" \
  "pnpm: $(as_last_line "$PNPM_OUT")"

# write the note beside the patch, then clear the sealed edit dir
NOTE_BODY=$(as_patch_note --package "$PACKAGE_NAME@$PACKAGE_VERSION" --who "$WHO" --when "$WHEN" \
  --why "$WHY" --upstream "$UPSTREAM" --patch "$PATCH_REL")
NOTE_ERR=$(set_patch_note "$REPO_ROOT/$NOTE_REL" "$NOTE_BODY" 2>&1) \
  || refuse_malfunction "$ROOT_LABEL" "the patch landed but its note could not be written; rerun this commit to write it" "$NOTE_ERR"
DEL_ERR=$(del_edit_dir "$EDIT_DIR_ABS" 2>&1) \
  || refuse_malfunction "$ROOT_LABEL" "the patch and note landed but the edit dir could not be removed" "$DEL_ERR"

print_turtle_header "shell yeah!"
print_tree_start "$ROOT_LABEL"
print_tree_leaf "package" "$PACKAGE_NAME@$PACKAGE_VERSION"
print_tree_leaf "patch" "$PATCH_REL ($PATCH_STATE)"
print_tree_branch "note: $NOTE_REL"
print_tree_child "who: $WHO"
print_tree_child "when: $WHEN"
print_tree_child "why: $WHY"
print_tree_child "upstream: $UPSTREAM" false true
print_tree_leaf "edit dir" "removed" true
