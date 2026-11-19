#!/usr/bin/env bash
######################################################################
# .what = list each local patch the tree holds: package, patch file,
#         entry, apply state, and its LOCAL PATCH note
#
# .why  = a patch is a fork; a reviewer must see what is patched, why,
#         where the upstream fix waits, and whether it still applies
#
# usage:
#   rhx git.package.patch get
#
# guarantee:
#   - reads only: the manifests, the patch files, their notes, node_modules
#   - names each patch an entry records, and each patch file none records
#   - names whether pnpm-workspace.yaml keeps a stale patch from a failed install
#   - exit 0 = listed, 1 = malfunction, 2 = constraint
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SKILL_DIR/git.package.patch.operations.sh"
source "$SKILL_DIR/output.sh"

ROOT_LABEL="git.package.patch get"
trap 'on_exit_render_crash "$ROOT_LABEL"' EXIT

######################################################################
# show usage
######################################################################
show_usage() {
  print_turtle_header "heres the wave..."
  print_tree_start "$ROOT_LABEL"
  print_tree_branch "usage"
  print_tree_child "rhx git.package.patch get" false true
  print_tree_branch "states"
  print_tree_child "applied        the installed copy holds the patch"
  print_tree_child "unapplied      the entry is recorded, but pnpm has not applied it yet"
  print_tree_child "underapplied   the installed version moved, or a hunk no longer fits"
  print_tree_child "obsolete       the installed version already holds the change"
  print_tree_child "unused         the package is no longer installed"
  print_tree_child "unbacked       an entry names a patch file that is absent"
  print_tree_child "unrecorded     a patch file no entry records" false true
  print_tree_branch "examples" true
  print_tree_child "rhx git.package.patch get" true true
}

######################################################################
# gate 1: flags
######################################################################
while [[ $# -gt 0 ]]; do
  case $1 in
    --skill|--repo|--role)
      shift $(( $# > 1 ? 2 : 1 ))
      ;;
    --help|-h)
      show_usage
      exit 0
      ;;
    *)
      refuse_constraint "$ROOT_LABEL" "unknown flag $1" \
        "get takes no flags"$'\n'"rhx git.package.patch get"
      ;;
  esac
done

######################################################################
# gate 2: repo shape
######################################################################
REPO_ROOT=$(get_repo_root 2>&1) || refuse_malfunction "$ROOT_LABEL" "git could not read the repo root" "$REPO_ROOT"
[[ -n "$REPO_ROOT" ]] || refuse_constraint "$ROOT_LABEL" "not inside a git repo" \
  "run from inside the repo whose patches you list"
has_package_json "$REPO_ROOT" || refuse_constraint "$ROOT_LABEL" \
  "the git root holds no package.json" \
  "list patches from a repo whose root holds package.json"

######################################################################
# read every patch
######################################################################
ROWS=$(get_all_patch_rows "$REPO_ROOT" 2>&1) \
  || refuse_malfunction "$ROOT_LABEL" "the patch entries could not be read" "$ROWS"

# no patch at all: say so, and stop
if [[ -z "$ROWS" ]]; then
  print_turtle_header "crickets..."
  print_tree_start "$ROOT_LABEL"
  print_tree_leaf "patches" "none" true
  exit 0
fi

TOLERANCE="absent"
is_patch_failure_tolerated "$REPO_ROOT" && TOLERANCE="set"

print_turtle_header "heres the wave..."
print_tree_start "$ROOT_LABEL"
while IFS=$'\t' read -r SPEC PATCH_REL MANIFEST; do
  [[ -n "$SPEC" ]] || continue
  STATE_ROW=$(get_patch_state --root "$REPO_ROOT" --spec "$SPEC" --patch "$PATCH_REL" --manifest "$MANIFEST" 2>&1) \
    || refuse_malfunction "$ROOT_LABEL" "the state of $SPEC could not be read" "$STATE_ROW"
  IFS=$'\t' read -r STATE _TARGET REASON <<<"$STATE_ROW"
  NOTE=$(get_patch_note "$REPO_ROOT/$PATCH_REL.note.md" 2>&1) \
    || refuse_malfunction "$ROOT_LABEL" "the note of $SPEC could not be read" "$NOTE"
  print_tree_branch "$SPEC"
  print_tree_child "patch: $PATCH_REL"
  print_tree_child "entry: $MANIFEST"
  print_tree_child "state: $STATE ($REASON)"
  if [[ -z "$NOTE" ]]; then
    print_tree_child "note: absent" false true
    continue
  fi
  print_tree_child "why: $(as_note_field "$NOTE" why)"
  print_tree_child "upstream: $(as_note_field "$NOTE" upstream)"
  print_tree_child "who: $(as_note_field "$NOTE" who), $(as_note_field "$NOTE" when)" false true
done <<<"$ROWS"
print_tree_leaf "upgrade-safe" "$(as_tolerance_text "$TOLERANCE")" true
