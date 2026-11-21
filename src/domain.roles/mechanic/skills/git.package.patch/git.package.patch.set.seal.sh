#!/usr/bin/env bash
######################################################################
# .what = the seal phase of set: seal an open edit dir into a patch via
#         pnpm patch-commit, and write the LOCAL PATCH note beside it
# .note = reached via git.package.patch.set.sh, which routes here when the
#         call carries --why or --upstream
#
# .why  = a patch with no why and no upstream ref is a fork nobody
#         knows to retire; the note keeps who, when, why, and where
#         the upstream fix waits, right beside the patch it explains
#
# usage:
#   rhx git.package.patch set --package rhachet --why '<why>' --upstream '<issue-url>'               # plan
#   rhx git.package.patch set --package rhachet --why '<why>' --upstream '<issue-url>' --mode apply  # seal
#
# guarantee:
#   - refuses an absent --why, an absent --upstream, or an --upstream that is not a link
#   - refuses when git identity is absent (the note needs a who)
#   - refuses an --edit-dir outside the tree (literal, .., or symlink)
#   - refuses an edit dir that holds another package or version than --package names
#   - writes patches/<name>@<version>.patch + .patch.note.md; removes the edit dir
#   - pnpm patch-commit also records the patchedDependencies entry and reinstalls,
#     so the manifest and pnpm-lock.yaml change too; the output names each file
#   - sets allowUnusedPatches + ignorePatchFailures in pnpm-workspace.yaml, so a
#     later upgrade past the patched version never fails pnpm install
#   - a re-run after seal with the same note is a no-op
#   - plan by default; --mode apply writes
#   - exit 0 = ok, 1 = malfunction, 2 = constraint
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SKILL_DIR/git.package.patch.operations.sh"
source "$SKILL_DIR/output.sh"

ROOT_LABEL="git.package.patch set"
trap 'on_exit_render_crash "$ROOT_LABEL"' EXIT

######################################################################
# show usage
######################################################################
show_usage() {
  print_turtle_header "heres the wave..."
  print_tree_start "$ROOT_LABEL"
  print_tree_branch "usage"
  print_tree_child "rhx git.package.patch set --package <name>[@<version>] --why '<why>' --upstream '<issue-url>' [--edit-dir <dir>] [--mode plan|apply]" false true
  print_tree_branch "flags"
  print_tree_child "--package    (required) the dependency whose edit dir to seal"
  print_tree_child "--why        (required) why the patch is needed, one line; or @stdin to pipe it"
  print_tree_child "--upstream   (required) the issue or pr where the real fix is queued; an http(s) link"
  print_tree_child "--edit-dir   (optional) the dir begin opened; default $EDIT_DIR_BASE_REL/<name>@<version>; must sit inside the tree"
  print_tree_child "--mode       (optional) plan (default) previews; apply seals" false true
  print_tree_branch "examples" true
  print_tree_child "rhx git.package.patch set --package rhachet --why 'keep the stop hook quiet on a clean tree' --upstream https://github.com/ehmpathy/rhachet/issues/580 --mode apply" true false
  print_tree_child "printf 'keep the stop hook quiet' | rhx git.package.patch set --package rhachet --why @stdin --upstream https://github.com/ehmpathy/rhachet/issues/580 --mode apply" true true
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
      # held to the end of the parse, so the hint can carry the flags given after it
      [[ -n "$FLAG_UNKNOWN" ]] || FLAG_UNKNOWN="$1"
      shift
      ;;
  esac
done

# an unknown flag (a global -g among them) is refused before any other gate
# .note = a --why @stdin is not read yet, so its hint keeps the placeholder
WHY_HINT="$WHY"
[[ "$WHY" == "@stdin" ]] && WHY_HINT=""
[[ -z "$FLAG_UNKNOWN" ]] || refuse_constraint "$ROOT_LABEL" "unknown flag $FLAG_UNKNOWN" \
  "drop $FLAG_UNKNOWN; this verb patches the current tree only (flags: --package, --why, --upstream, --edit-dir, --mode)"$'\n'"$(as_seal_apply_cmd "${PACKAGE_SPEC:-<name>}" "" "$WHY_HINT" "$UPSTREAM")"

# --package is required
[[ -n "$PACKAGE_SPEC" ]] || refuse_constraint "$ROOT_LABEL" "--package is required" \
  "$(as_seal_apply_cmd "<name>" "")"

# --mode is plan or apply
[[ "$MODE" == "plan" || "$MODE" == "apply" ]] || refuse_constraint "$ROOT_LABEL" \
  "--mode must be plan or apply" \
  "use --mode plan to preview, --mode apply to seal"$'\n'"$(as_seal_apply_cmd "$PACKAGE_SPEC" "$EDIT_DIR_ARG")"

######################################################################
# gate 3: repo shape
######################################################################
REPO_ROOT=$(get_repo_root 2>&1) || refuse_malfunction "$ROOT_LABEL" "git could not read the repo root" "$REPO_ROOT"
[[ -n "$REPO_ROOT" ]] || refuse_constraint "$ROOT_LABEL" "not inside a git repo" \
  "run from inside the repo whose dependency you patch"
has_package_json "$REPO_ROOT" || refuse_constraint "$ROOT_LABEL" \
  "the git root holds no package.json" \
  "a workspace rooted below the git root is out of scope; patch from a repo whose root holds package.json"
FOREIGN_LOCKFILE=$(get_foreign_lockfile "$REPO_ROOT")
[[ -z "$FOREIGN_LOCKFILE" ]] || refuse_constraint "$ROOT_LABEL" \
  "this repo locks with $FOREIGN_LOCKFILE; pnpm patch is pnpm-only" \
  "patch only pnpm repos with this verb"

# pnpm cannot apply a patch under the hoisted node-linker
! is_hoisted_repo "$REPO_ROOT" || refuse_constraint "$ROOT_LABEL" \
  "this repo installs with node-linker=hoisted; pnpm cannot apply a patch there" \
  "a hoisted repo is out of scope for this verb; its patch would never apply"$'\n'"the hoisted path is tracked at https://github.com/ehmpathy/rhachet-roles-ehmpathy/issues/772"

######################################################################
# gate 4: location
######################################################################
EDIT_DIR_FIX="omit --edit-dir to use the in-tree default, $EDIT_DIR_BASE_REL/<name>@<version>"$'\n'"$(as_seal_apply_cmd "$PACKAGE_SPEC" "")"
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
# gate 5: note inputs + git identity
######################################################################
# --why @stdin reads the why from a pipe, so free prose never meets the shell
if [[ "$WHY" == "@stdin" ]]; then
  WHY=$(cat)
  WHY="${WHY%$'\n'}"
fi

# each refusal hint keeps the field the crew gave, and holds a placeholder for the one at fault
WHY_FIX_CMD=$(as_seal_apply_cmd "$PACKAGE_SPEC" "$EDIT_DIR_ARG" "" "$UPSTREAM")
[[ -n "$WHY" ]] || refuse_constraint "$ROOT_LABEL" "--why is required" \
  "add --why '<why this patch is needed>', or pipe it via --why @stdin"$'\n'"$WHY_FIX_CMD"

# a why still in its placeholder form says naught
[[ ! "$WHY" =~ ^\<.*\>$ ]] || refuse_constraint "$ROOT_LABEL" "--why is still a placeholder" \
  "replace it with the real reason the patch is needed"$'\n'"$WHY_FIX_CMD" \
  "given: $WHY"
# one line only: a newline would forge note lines and break the rerun no-op
[[ "$WHY" != *$'\n'* ]] || refuse_constraint "$ROOT_LABEL" "--why must be one line" \
  "put the why on one line"$'\n'"$WHY_FIX_CMD"

UPSTREAM_FIX_CMD=$(as_seal_apply_cmd "$PACKAGE_SPEC" "$EDIT_DIR_ARG" "$WHY" "")
[[ -n "$UPSTREAM" ]] || refuse_constraint "$ROOT_LABEL" "--upstream is required" \
  "add --upstream '<issue-url>' — an issue or pr url where the real fix is queued"$'\n'"$UPSTREAM_FIX_CMD"
is_upstream_link "$UPSTREAM" || refuse_constraint "$ROOT_LABEL" \
  "--upstream must be an http(s) link" \
  "add --upstream '<issue-url>' — an issue or pr url where the real fix is queued"$'\n'"$UPSTREAM_FIX_CMD" \
  "given: $UPSTREAM"

WHO_NAME=$(get_git_config_value "$REPO_ROOT" user.name 2>&1) \
  || refuse_malfunction "$ROOT_LABEL" "git could not read user.name" "$WHO_NAME"
WHO_EMAIL=$(get_git_config_value "$REPO_ROOT" user.email 2>&1) \
  || refuse_malfunction "$ROOT_LABEL" "git could not read user.email" "$WHO_EMAIL"
[[ -n "$WHO_NAME" && -n "$WHO_EMAIL" ]] || refuse_constraint "$ROOT_LABEL" \
  "git identity absent; the note needs a who" \
  "git config user.name '<name>' && git config user.email '<email>'"
[[ "$WHO_NAME$WHO_EMAIL" != *$'\n'* ]] || refuse_constraint "$ROOT_LABEL" \
  "git identity spans several lines; the note needs a one-line who" \
  "git config user.name '<name>' && git config user.email '<email>'"
WHO=$(as_git_identity --name "$WHO_NAME" --email "$WHO_EMAIL")

######################################################################
# gate 6: spec
######################################################################
PACKAGE_NAME=$(as_package_name "$PACKAGE_SPEC")
is_package_name "$PACKAGE_NAME" || refuse_constraint "$ROOT_LABEL" \
  "--package is not a valid package name" \
  "name a package as npm does: <name> or @<scope>/<name>"$'\n'"$(as_seal_apply_cmd "<name>" "$EDIT_DIR_ARG")" \
  "given: $PACKAGE_NAME"

# a package that grades or gates this tree seals only on a human's grant
GRANT_WHY=""
if is_package_gated "$PACKAGE_NAME"; then
  GRANT_WHY=$(get_patch_grant_why "$REPO_ROOT" "$PACKAGE_NAME" 2>&1) \
    || refuse_malfunction "$ROOT_LABEL" "the grant meter $(as_rel_to_root "$(get_patch_uses_meter_file "$REPO_ROOT")" "$REPO_ROOT") cannot be read" "$GRANT_WHY" \
      "a human repairs or removes the meter, then grants again"$'\n'"rhx git.package.patch.uses allow --package $PACKAGE_NAME --why '<why>'"
  [[ -n "$GRANT_WHY" ]] || refuse_constraint "$ROOT_LABEL" \
    "$PACKAGE_NAME grades or gates this tree; a clone never patches it here without a human's grant" \
    "$(as_gated_fix "$PACKAGE_NAME")"
fi
PACKAGE_VERSION=$(as_package_version "$PACKAGE_SPEC")
VERSIONS_RAW=$(get_all_installed_versions "$REPO_ROOT" "$PACKAGE_NAME" 2>&1) \
  || refuse_malfunction "$ROOT_LABEL" "could not read the installed versions of $PACKAGE_NAME" "$VERSIONS_RAW"
VERSIONS_FOUND=()
set_list_from_lines --into VERSIONS_FOUND --lines "$VERSIONS_RAW"
[[ ${#VERSIONS_FOUND[@]} -gt 0 ]] || refuse_constraint "$ROOT_LABEL" \
  "$PACKAGE_NAME is not installed" \
  "install it first"$'\n'"$(as_install_cmd "$REPO_ROOT" "$PACKAGE_NAME")"
VERSION_LATEST=$(as_latest_version "${VERSIONS_FOUND[@]}")

# a named version must be one that is installed
[[ -z "$PACKAGE_VERSION" ]] || is_version_listed "$PACKAGE_VERSION" "${VERSIONS_FOUND[@]}" || refuse_constraint "$ROOT_LABEL" \
  "$PACKAGE_NAME@$PACKAGE_VERSION is not installed" \
  "name an installed version: $(as_version_list_text "${VERSIONS_FOUND[@]}")"$'\n'"$(as_seal_apply_cmd "$PACKAGE_NAME@$VERSION_LATEST" "$EDIT_DIR_ARG")"

# a bare name with no --edit-dir takes the one open default edit dir for that name
if [[ -z "$PACKAGE_VERSION" && -z "$EDIT_DIR_ARG" ]]; then
  OPEN_RAW=$(get_all_open_edit_dir_versions "$REPO_ROOT" "$PACKAGE_NAME" 2>&1) \
    || refuse_malfunction "$ROOT_LABEL" "an edit dir cannot be read" "$OPEN_RAW"
  OPEN_VERSIONS=()
  set_list_from_lines --into OPEN_VERSIONS --lines "$OPEN_RAW"
  if [[ ${#OPEN_VERSIONS[@]} -gt 1 ]]; then
    OPEN_LINES=()
    set_list_from_lines --into OPEN_LINES --lines "$(as_version_lines "open" "$EDIT_DIR_BASE_REL/$PACKAGE_NAME" "${OPEN_VERSIONS[@]}")"
    refuse_constraint "$ROOT_LABEL" "several edit dirs are open for $PACKAGE_NAME" \
      "name one"$'\n'"$(as_seal_apply_cmd "$PACKAGE_NAME@$(as_oldest_version "${OPEN_VERSIONS[@]}")" "")" \
      "${OPEN_LINES[@]}"
  fi
  [[ ${#OPEN_VERSIONS[@]} -eq 1 ]] && PACKAGE_VERSION=$(as_sole_version "${OPEN_VERSIONS[@]}")
fi

# a bare name with no open dir: there is naught to seal yet, so begin is the move
if [[ -z "$PACKAGE_VERSION" && -z "$EDIT_DIR_ARG" && ${#VERSIONS_FOUND[@]} -gt 1 ]]; then
  VERSION_LINES=()
  set_list_from_lines --into VERSION_LINES --lines "$(as_version_lines "installed" "$PACKAGE_NAME" "${VERSIONS_FOUND[@]}")"
  refuse_constraint "$ROOT_LABEL" \
    "several versions of $PACKAGE_NAME are installed, and none has an open edit dir" \
    "open one first, for the version you mean"$'\n'"$(as_open_cmd "$PACKAGE_NAME@$VERSION_LATEST" "")" \
    "${VERSION_LINES[@]}"
fi
# one installed version names the target even with a custom --edit-dir, so a rerun after the seal
# finds the sealed patch; with several, an open custom dir names its own version below
[[ -n "$PACKAGE_VERSION" || ${#VERSIONS_FOUND[@]} -ne 1 ]] || PACKAGE_VERSION=$(as_sole_version "${VERSIONS_FOUND[@]}")

######################################################################
# gate 7: state
######################################################################
EDIT_DIR_ABS=$(get_edit_dir_abs --given "$EDIT_DIR_ARG" --given-real "${EDIT_DIR_REAL:-}" \
  --root "$REPO_ROOT" --package "$PACKAGE_NAME" --version "$PACKAGE_VERSION")

# the default edit dir is bound too: a symlinked base must not lead out of the tree
is_inside_tree --path "$EDIT_DIR_ABS" --root "$REPO_ROOT" || refuse_constraint "$ROOT_LABEL" \
  "the edit dir must sit inside the tree" \
  "replace the symlink at $EDIT_DIR_BASE_REL with a real dir, or name an in-tree dir"$'\n'"$(as_seal_apply_cmd "$PACKAGE_SPEC" "<in-tree dir>")" \
  "real: $EDIT_DIR_ABS"

EDIT_DIR_SHOW=$(as_rel_to_root "$EDIT_DIR_ABS" "$REPO_ROOT")
EDIT_DIR_STATE=$(get_edit_dir_state "$EDIT_DIR_ABS" 2>&1) \
  || refuse_malfunction "$ROOT_LABEL" "the edit dir cannot be read" "$EDIT_DIR_STATE"

# an open dir must be an edit dir: one that names its own package
[[ "$EDIT_DIR_STATE" != "open" ]] || has_package_json "$EDIT_DIR_ABS" || refuse_constraint "$ROOT_LABEL" \
  "$EDIT_DIR_SHOW holds files but no package.json; it is not an edit dir" \
  "open an edit dir first"$'\n'"$(as_open_cmd "$PACKAGE_SPEC" "$EDIT_DIR_ARG")"

# a dir that holds tracked files is part of the tree; the seal would delete it
TRACKED_STATUS=0
TRACKED_ERR=$(has_tracked_files "$REPO_ROOT" "$EDIT_DIR_ABS" 2>&1) || TRACKED_STATUS=$?
[[ $TRACKED_STATUS -ne 2 ]] || refuse_malfunction "$ROOT_LABEL" \
  "git could not list the files tracked under $EDIT_DIR_SHOW" "$TRACKED_ERR"
[[ $TRACKED_STATUS -ne 0 ]] || refuse_constraint "$ROOT_LABEL" \
  "$EDIT_DIR_SHOW holds files git tracks; the seal deletes its edit dir" \
  "$EDIT_DIR_FIX"

# an open dir names its own package; it must be the one --package names
if [[ "$EDIT_DIR_STATE" == "open" ]]; then
  DIR_NAME=$(get_package_json_field "$EDIT_DIR_ABS/package.json" name 2>&1) \
    || refuse_malfunction "$ROOT_LABEL" "the edit dir's package.json cannot be read" "$DIR_NAME"
  DIR_VERSION=$(get_package_json_field "$EDIT_DIR_ABS/package.json" version 2>&1) \
    || refuse_malfunction "$ROOT_LABEL" "the edit dir's package.json cannot be read" "$DIR_VERSION"
  # the dir's package.json is untrusted text: check its shape before any of it is printed
  is_package_name "$DIR_NAME" && is_version_shape "$DIR_VERSION" || refuse_constraint "$ROOT_LABEL" \
    "$EDIT_DIR_SHOW holds a package.json whose name or version is not a package spec" \
    "$EDIT_DIR_FIX"
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
  "open one first"$'\n'"$(as_open_cmd "$PACKAGE_NAME" "$EDIT_DIR_ARG")"

PATCH_REL=$(as_patch_rel_path "$PACKAGE_NAME" "$PACKAGE_VERSION")
NOTE_REL=$(as_note_rel_path "$PACKAGE_NAME" "$PACKAGE_VERSION")
PATCH_FILE="$REPO_ROOT/$PATCH_REL"
PATCH_PRESENCE=$(get_file_presence "$PATCH_FILE")
WHEN=$(get_today_iso_date)

# no open dir: a sealed patch with the same note is a no-op; else begin is owed
if [[ "$EDIT_DIR_STATE" != "open" ]]; then
  NOTE_NOW=$(get_patch_note "$REPO_ROOT/$NOTE_REL" 2>&1) \
    || refuse_malfunction "$ROOT_LABEL" "the note at $NOTE_REL cannot be read" "$NOTE_NOW"
  if [[ "$PATCH_PRESENCE" == "present" ]] && is_note_of "$NOTE_NOW" "$WHY" "$UPSTREAM"; then
    # sealed means the entry and the lockfile hold it too, not the file and note alone
    SEAL_GAP=$(get_sealed_patch_gap "$REPO_ROOT" "$PATCH_REL")
    [[ -z "$SEAL_GAP" ]] || refuse_constraint "$ROOT_LABEL" \
      "$PATCH_REL and its note are present, but the $SEAL_GAP record is absent, so pnpm does not apply it" \
      "$(as_sealed_patch_gap_hint "$SEAL_GAP" "$PACKAGE_NAME@$PACKAGE_VERSION" "$PATCH_REL"), then rerun this same set"$'\n'"$(as_seal_apply_cmd "$PACKAGE_NAME@$PACKAGE_VERSION" "$EDIT_DIR_ARG" "$WHY" "$UPSTREAM")"
    print_turtle_header "righteous!"
    print_tree_start "$ROOT_LABEL"
    print_tree_leaf "package" "$PACKAGE_NAME@$PACKAGE_VERSION"
    print_tree_leaf "patch" "$PATCH_REL"
    print_tree_leaf "note" "$NOTE_REL"
    print_tree_leaf "state" "already sealed with this note; naught changed" true
    exit 0
  fi

  # sealed with another note: the note alone is fixed by hand; a reseal needs fresh edits
  [[ "$PATCH_PRESENCE" != "present" ]] || refuse_constraint "$ROOT_LABEL" \
    "$PATCH_REL is sealed, and its note names another why or upstream" \
    "to correct the note alone, edit $NOTE_REL by hand; to change the patch itself, open it again"$'\n'"$(as_open_cmd "$PACKAGE_NAME@$PACKAGE_VERSION" "$EDIT_DIR_ARG")"
  refuse_constraint "$ROOT_LABEL" "no open edit dir at $EDIT_DIR_SHOW" \
    "open one first"$'\n'"$(as_open_cmd "$PACKAGE_NAME@$PACKAGE_VERSION" "$EDIT_DIR_ARG")"
fi

######################################################################
# gate 8: mode
######################################################################
PATCH_STATE=$(as_commit_patch_state "$PATCH_PRESENCE")
PRIOR=$(as_commit_prior "$PATCH_PRESENCE" "$PATCH_REL")
COMMIT_APPLY_CMD=$(as_seal_apply_cmd "$PACKAGE_NAME@$PACKAGE_VERSION" "$EDIT_DIR_ARG" "$WHY" "$UPSTREAM")

if [[ "$MODE" == "plan" ]]; then
  print_turtle_header "heres the wave..."
  print_tree_start "$ROOT_LABEL"
  print_tree_leaf "package" "$PACKAGE_NAME@$PACKAGE_VERSION"
  [[ -z "$GRANT_WHY" ]] || print_tree_leaf "grant" "a human admits this gated package: $GRANT_WHY"
  print_tree_leaf "edit dir" "$EDIT_DIR_SHOW"
  print_tree_leaf "prior patch" "$PRIOR"
  print_tree_leaf "would write patch" "$PATCH_REL"
  print_tree_leaf "would write note" "$NOTE_REL"
  print_tree_leaf "would record" "patchedDependencies[$PACKAGE_NAME@$PACKAGE_VERSION]"
  print_tree_leaf "would reinstall" "pnpm patch-commit runs an install; pnpm-lock.yaml changes"
  print_tree_leaf "would keep upgrade-safe" "$SETTINGS_MANIFEST_REL sets $(as_tolerance_keys_text)"
  print_tree_leaf "mode" "plan (naught changed)" true
  print_coconut_hint "rerun this same set with --mode apply to seal it" "$COMMIT_APPLY_CMD"
  exit 0
fi

# set any prior patch aside, so an absent file after the seal proves pnpm wrote naught
ASIDE_ERR=$(set_patch_aside "$PATCH_FILE" 2>&1) \
  || refuse_malfunction "$ROOT_LABEL" "the prior patch could not be set aside" "$ASIDE_ERR"

# seal via pnpm
PNPM_STATUS=0
PNPM_OUT=$(set_patch_via_pnpm "$REPO_ROOT" "$EDIT_DIR_ABS") || PNPM_STATUS=$?
PATCH_PRESENCE_AFTER=$(get_file_presence "$PATCH_FILE")

# the seal failed after pnpm recorded a first entry: keep the patch so the entry holds
if [[ $PNPM_STATUS -ne 0 ]] && is_patch_kept_after_failure "$REPO_ROOT" "$PATCH_REL"; then
  refuse_malfunction "$ROOT_LABEL" \
    "pnpm patch-commit failed after it recorded the entry; $PATCH_REL is kept so the entry holds" \
    "$PNPM_OUT" \
    "fix the cause pnpm names in the detail, then rerun this set"$'\n'"$COMMIT_APPLY_CMD"
fi
RERUN_HINT="fix the cause, then rerun this same set"$'\n'"$COMMIT_APPLY_CMD"

# the seal failed: put the prior patch back over whatever pnpm left, then report
if [[ $PNPM_STATUS -ne 0 ]]; then
  REVERT_ERR=$(set_patch_reverted "$PATCH_FILE" 2>&1) \
    || refuse_malfunction "$ROOT_LABEL" "pnpm patch-commit failed, and the prior patch could not be put back from $PATCH_REL.aside" "$REVERT_ERR"
  refuse_malfunction "$ROOT_LABEL" "pnpm patch-commit failed" "$PNPM_OUT"
fi

# this seal wrote no patch: put the prior one back, untouched
if [[ "$PATCH_PRESENCE_AFTER" == "absent" ]]; then
  REVERT_ERR=$(set_patch_reverted "$PATCH_FILE" 2>&1) \
    || refuse_malfunction "$ROOT_LABEL" "the prior patch could not be put back from $PATCH_REL.aside" "$REVERT_ERR"
  refuse_constraint "$ROOT_LABEL" \
    "no edits to seal in $EDIT_DIR_SHOW" \
    "edit the files in $EDIT_DIR_SHOW, then rerun this set"$'\n'"$COMMIT_APPLY_CMD" \
    "prior patch: $(as_kept_prior "$PATCH_PRESENCE" "$PATCH_REL")" \
    "pnpm: $(as_last_line "$PNPM_OUT")"
fi

# this seal wrote a patch: the prior copy is retired
DROP_ERR=$(del_patch_aside "$PATCH_FILE" 2>&1) \
  || refuse_malfunction "$ROOT_LABEL" "the prior patch copy at $PATCH_REL.aside could not be removed" "$DROP_ERR"

# the patch is only live once a manifest records it
ENTRY_MANIFEST=$(get_patched_dependency_manifest "$REPO_ROOT" "$PATCH_REL")
[[ -n "$ENTRY_MANIFEST" ]] || refuse_malfunction "$ROOT_LABEL" \
  "the patch landed at $PATCH_REL, but neither package.json nor pnpm-workspace.yaml records its patchedDependencies entry; the edit dir stays open" \
  "pnpm: $(as_last_line "$PNPM_OUT")" "$RERUN_HINT"

# the lockfile must record the patch too, or a frozen install fails and the live copy stays unpatched
if ! has_lockfile_patch_entry "$REPO_ROOT" "$PATCH_REL"; then
  INSTALL_OUT=$(set_install_via_pnpm "$REPO_ROOT") || refuse_malfunction "$ROOT_LABEL" \
    "the patch landed at $PATCH_REL, but the install to record it in pnpm-lock.yaml failed; the edit dir stays open" \
    "$INSTALL_OUT" "$RERUN_HINT"
  has_lockfile_patch_entry "$REPO_ROOT" "$PATCH_REL" || refuse_malfunction "$ROOT_LABEL" \
    "the patch landed at $PATCH_REL, but pnpm-lock.yaml does not record it after a reinstall; is lockfile=false set? the edit dir stays open" \
    "pnpm: $(as_last_line "$INSTALL_OUT")" "$RERUN_HINT"
fi

# keep the tree upgrade-safe: a later upgrade past this version must land, never fail the install
TOLERANCE_PRIOR="set"
is_patch_failure_tolerated "$REPO_ROOT" || TOLERANCE_PRIOR="absent"
if [[ "$TOLERANCE_PRIOR" == "absent" ]]; then
  TOLERANCE_ERR=$(set_patch_failure_tolerated "$REPO_ROOT" 2>&1) || refuse_malfunction "$ROOT_LABEL" \
    "the patch landed, but $SETTINGS_MANIFEST_REL could not be made upgrade-safe" "$TOLERANCE_ERR" "$RERUN_HINT"
fi

# write the note beside the patch, then clear the sealed edit dir
NOTE_BODY=$(as_patch_note --package "$PACKAGE_NAME@$PACKAGE_VERSION" --who "$WHO" --when "$WHEN" \
  --why "$WHY" --upstream "$UPSTREAM" --patch "$PATCH_REL")
NOTE_ERR=$(set_patch_note "$REPO_ROOT/$NOTE_REL" "$NOTE_BODY" 2>&1) \
  || refuse_malfunction "$ROOT_LABEL" "the patch landed but its note could not be written" "$NOTE_ERR" \
    "fix the cause, then rerun this set to write it"$'\n'"$COMMIT_APPLY_CMD"
DEL_ERR=$(del_edit_dir "$EDIT_DIR_ABS" 2>&1) \
  || refuse_malfunction "$ROOT_LABEL" "the patch and note landed but the edit dir could not be removed" "$DEL_ERR"

print_turtle_header "shell yeah!"
print_tree_start "$ROOT_LABEL"
print_tree_leaf "package" "$PACKAGE_NAME@$PACKAGE_VERSION"
[[ -z "$GRANT_WHY" ]] || print_tree_leaf "grant" "a human admits this gated package: $GRANT_WHY"
print_tree_leaf "patch" "$PATCH_REL ($PATCH_STATE)"
print_tree_leaf "entry" "patchedDependencies[$PACKAGE_NAME@$PACKAGE_VERSION] in $ENTRY_MANIFEST"
print_tree_branch "note: $NOTE_REL"
print_tree_child "who: $WHO"
print_tree_child "when: $WHEN"
print_tree_child "why: $WHY"
print_tree_child "upstream: $UPSTREAM" false true
print_tree_leaf "edit dir" "removed"
print_tree_leaf "upgrade-safe" "$(as_tolerance_text set)"
print_tree_branch "changed, stage all of these" true
print_tree_child "$PATCH_REL" true false
print_tree_child "$NOTE_REL" true false
print_tree_child "$ENTRY_MANIFEST" true false
[[ "$TOLERANCE_PRIOR" == "set" || "$ENTRY_MANIFEST" == "$SETTINGS_MANIFEST_REL" ]] \
  || print_tree_child "$SETTINGS_MANIFEST_REL" true false
print_tree_child "pnpm-lock.yaml" true true
