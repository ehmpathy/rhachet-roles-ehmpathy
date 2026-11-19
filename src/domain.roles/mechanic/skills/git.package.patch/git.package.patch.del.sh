#!/usr/bin/env bash
######################################################################
# .what = retire a local patch: its patchedDependencies entry, its patch
#         file, and its LOCAL PATCH note, then reinstall the pristine copy
#
# .why  = a patch whose upstream fix shipped, or whose version moved, must
#         leave the tree whole: an entry with no file, or a file with no
#         entry, is a fork nobody can trust or retire later
#
# usage:
#   rhx git.package.patch del --package is-number                # plan
#   rhx git.package.patch del --package is-number --mode apply   # retire
#
# guarantee:
#   - removes only what the named patch owns: its entry, file, and note
#   - a bare name with several patches is refused, each named; a version picks one
#   - reinstalls after it drops an entry, so pnpm-lock.yaml and the live copy follow
#   - when another patch remains, keeps pnpm-workspace.yaml upgrade-safe
#     (allowUnusedPatches + ignorePatchFailures)
#   - a rerun after the patch is gone is a no-op
#   - plan by default; --mode apply writes
#   - exit 0 = ok, 1 = malfunction, 2 = constraint
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SKILL_DIR/git.package.patch.operations.sh"
source "$SKILL_DIR/output.sh"

ROOT_LABEL="git.package.patch del"
trap 'on_exit_render_crash "$ROOT_LABEL"' EXIT

######################################################################
# show usage
######################################################################
show_usage() {
  print_turtle_header "heres the wave..."
  print_tree_start "$ROOT_LABEL"
  print_tree_branch "usage"
  print_tree_child "rhx git.package.patch del --package <name>[@<version>] [--mode plan|apply]" false true
  print_tree_branch "flags"
  print_tree_child "--package   (required) the dependency whose patch to retire; add @<version> when several are patched"
  print_tree_child "--mode      (optional) plan (default) previews; apply retires" false true
  print_tree_branch "examples" true
  print_tree_child "rhx git.package.patch del --package is-number --mode apply" true false
  print_tree_child "rhx git.package.patch del --package is-number@6.0.0 --mode apply" true true
}

######################################################################
# gate 1: flags
######################################################################
PACKAGE_SPEC=""
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
    --mode)
      MODE="${2:-}"
      shift $(( $# > 1 ? 2 : 1 ))
      ;;
    --help|-h)
      show_usage
      exit 0
      ;;
    *)
      [[ -n "$FLAG_UNKNOWN" ]] || FLAG_UNKNOWN="$1"
      shift
      ;;
  esac
done

[[ -z "$FLAG_UNKNOWN" ]] || refuse_constraint "$ROOT_LABEL" "unknown flag $FLAG_UNKNOWN" \
  "drop $FLAG_UNKNOWN; this verb retires a patch in the current tree only (flags: --package, --mode)"$'\n'"$(as_del_apply_cmd "${PACKAGE_SPEC:-<name>}")"
[[ -n "$PACKAGE_SPEC" ]] || refuse_constraint "$ROOT_LABEL" "--package is required" \
  "$(as_del_apply_cmd "<name>")"
[[ "$MODE" == "plan" || "$MODE" == "apply" ]] || refuse_constraint "$ROOT_LABEL" \
  "--mode must be plan or apply" \
  "use --mode plan to preview, --mode apply to retire"$'\n'"$(as_del_apply_cmd "$PACKAGE_SPEC")"

PACKAGE_NAME=$(as_package_name "$PACKAGE_SPEC")
PACKAGE_VERSION=$(as_package_version "$PACKAGE_SPEC")
is_package_name "$PACKAGE_NAME" || refuse_constraint "$ROOT_LABEL" \
  "--package is not a valid package name" \
  "name a package as npm does: <name> or @<scope>/<name>"$'\n'"$(as_del_apply_cmd "<name>")" \
  "given: $PACKAGE_NAME"

######################################################################
# gate 2: repo shape
######################################################################
REPO_ROOT=$(get_repo_root 2>&1) || refuse_malfunction "$ROOT_LABEL" "git could not read the repo root" "$REPO_ROOT"
[[ -n "$REPO_ROOT" ]] || refuse_constraint "$ROOT_LABEL" "not inside a git repo" \
  "run from inside the repo whose patch you retire"
has_package_json "$REPO_ROOT" || refuse_constraint "$ROOT_LABEL" \
  "the git root holds no package.json" \
  "retire a patch from a repo whose root holds package.json"
FOREIGN_LOCKFILE=$(get_foreign_lockfile "$REPO_ROOT")
[[ -z "$FOREIGN_LOCKFILE" ]] || refuse_constraint "$ROOT_LABEL" \
  "this repo locks with $FOREIGN_LOCKFILE; pnpm patch is pnpm-only" \
  "retire patches only in pnpm repos with this verb"

######################################################################
# gate 3: which patch
######################################################################
ROWS=$(get_all_patch_rows "$REPO_ROOT" 2>&1) \
  || refuse_malfunction "$ROOT_LABEL" "the patch entries could not be read" "$ROWS"
MATCH_SPECS=()
MATCH_PATCHES=()
MATCH_MANIFESTS=()
while IFS=$'\t' read -r SPEC PATCH_REL MANIFEST; do
  [[ -n "$SPEC" ]] || continue
  [[ "$(as_package_name "$SPEC")" == "$PACKAGE_NAME" ]] || continue
  [[ -z "$PACKAGE_VERSION" || "$(as_package_version "$SPEC")" == "$PACKAGE_VERSION" ]] || continue
  MATCH_SPECS+=("$SPEC")
  MATCH_PATCHES+=("$PATCH_REL")
  MATCH_MANIFESTS+=("$MANIFEST")
done <<<"$ROWS"

# naught to retire: a rerun after the patch is gone lands here
if [[ ${#MATCH_SPECS[@]} -eq 0 ]]; then
  print_turtle_header "righteous!"
  print_tree_start "$ROOT_LABEL"
  print_tree_leaf "package" "$PACKAGE_SPEC"
  print_tree_leaf "state" "no patch for $PACKAGE_SPEC; naught changed" true
  exit 0
fi

# several patches for one bare name: the version names which
if [[ ${#MATCH_SPECS[@]} -gt 1 ]]; then
  MATCH_LINES=()
  for SPEC in "${MATCH_SPECS[@]}"; do MATCH_LINES+=("patched: $SPEC"); done
  refuse_constraint "$ROOT_LABEL" "several patches are recorded for $PACKAGE_NAME" \
    "name one"$'\n'"$(as_del_apply_cmd "${MATCH_SPECS[0]}")" \
    "${MATCH_LINES[@]}"
fi

SPEC="${MATCH_SPECS[0]}"
PATCH_REL="${MATCH_PATCHES[0]}"
MANIFEST="${MATCH_MANIFESTS[0]}"
NOTE_REL="$PATCH_REL.note.md"
PATCH_PRESENCE=$(get_file_presence "$REPO_ROOT/$PATCH_REL")
NOTE_PRESENCE=$(get_file_presence "$REPO_ROOT/$NOTE_REL")

######################################################################
# gate 4: mode
######################################################################
if [[ "$MODE" == "plan" ]]; then
  print_turtle_header "heres the wave..."
  print_tree_start "$ROOT_LABEL"
  print_tree_leaf "package" "$SPEC"
  [[ "$MANIFEST" == "none" ]] || print_tree_leaf "would drop entry" "patchedDependencies[$SPEC] in $MANIFEST"
  [[ "$PATCH_PRESENCE" == "absent" ]] || print_tree_leaf "would delete patch" "$PATCH_REL"
  [[ "$NOTE_PRESENCE" == "absent" ]] || print_tree_leaf "would delete note" "$NOTE_REL"
  [[ "$MANIFEST" == "none" ]] || print_tree_leaf "would reinstall" "pnpm install; pnpm-lock.yaml changes, the live copy turns pristine"
  print_tree_leaf "mode" "plan (naught changed)" true
  print_coconut_hint "rerun with --mode apply to retire it" "$(as_del_apply_cmd "$SPEC")"
  exit 0
fi

# drop the entry first, so no install ever reads an entry whose file is gone
CHANGED=()
if [[ "$MANIFEST" != "none" ]]; then
  ENTRY_ERR=$(del_patch_entry "$REPO_ROOT" "$MANIFEST" "$PATCH_REL" 2>&1) \
    || refuse_malfunction "$ROOT_LABEL" "the patchedDependencies entry could not be dropped from $MANIFEST" "$ENTRY_ERR"
  CHANGED+=("$MANIFEST")
fi
FILES_ERR=$(del_patch_files "$REPO_ROOT" "$PATCH_REL" 2>&1) \
  || refuse_malfunction "$ROOT_LABEL" "the patch file or its note could not be deleted" "$FILES_ERR"
[[ "$PATCH_PRESENCE" == "absent" ]] || CHANGED+=("$PATCH_REL")
[[ "$NOTE_PRESENCE" == "absent" ]] || CHANGED+=("$NOTE_REL")

# keep the tree upgrade-safe for any patch that remains
if has_any_patch_trace "$REPO_ROOT" && ! is_patch_failure_tolerated "$REPO_ROOT"; then
  TOLERANCE_ERR=$(set_patch_failure_tolerated "$REPO_ROOT" 2>&1) \
    || refuse_malfunction "$ROOT_LABEL" "$SETTINGS_MANIFEST_REL could not be made upgrade-safe" "$TOLERANCE_ERR"
  [[ " ${CHANGED[*]} " == *" $SETTINGS_MANIFEST_REL "* ]] || CHANGED+=("$SETTINGS_MANIFEST_REL")
fi

# reinstall, so the lockfile and the live copy drop the patch too
if [[ "$MANIFEST" != "none" ]]; then
  INSTALL_OUT=$(set_install_via_pnpm "$REPO_ROOT") || refuse_malfunction "$ROOT_LABEL" \
    "the entry, patch, and note are gone, but the reinstall failed; pnpm-lock.yaml may still name $PATCH_REL" \
    "$INSTALL_OUT" "fix the cause, then run pnpm install"$'\n'"pnpm install"
  CHANGED+=("pnpm-lock.yaml")
fi

print_turtle_header "shell yeah!"
print_tree_start "$ROOT_LABEL"
print_tree_leaf "package" "$SPEC"
print_tree_leaf "state" "retired"
print_tree_branch "changed, stage all of these" true
CHANGED_COUNT=${#CHANGED[@]}
CHANGED_INDEX=0
for FILE in "${CHANGED[@]}"; do
  CHANGED_INDEX=$((CHANGED_INDEX + 1))
  print_tree_child "$FILE" true "$([[ $CHANGED_INDEX -eq $CHANGED_COUNT ]] && echo true || echo false)"
done
