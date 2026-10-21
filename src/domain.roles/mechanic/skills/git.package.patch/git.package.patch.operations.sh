#!/usr/bin/env bash
######################################################################
# .what = shared operations for git.package.patch begin + commit
#
# .why  = the phase scripts read as narrative; every step that needs
#         decode lives here under a name:
#         - transformers (as_*, is_*): pure, no i/o
#         - communicators (get_*, set_*, del_*, *_via_pnpm): git, fs, jq, pnpm
#
# usage:
#   source "$SKILL_DIR/git.package.patch.operations.sh"
#
# .note = a communicator that fails for an unexpected reason prints the
#         cause to stderr and returns 2; callers route that to a
#         MalfunctionError, never to a constraint
######################################################################

# reuse the repo boundary's one producer, is_path_within_repo_root
# .note = it also defines print_* functions; callers source this file BEFORE
#         their own output.sh, so their output functions win
# shellcheck source=../claude.tools/output.sh
source "$(dirname "${BASH_SOURCE[0]}")/../claude.tools/output.sh"

# the dir, relative to the repo root, where pnpm writes patch files
PATCHES_DIR_REL="patches"

# the dir, relative to the repo root, where edit dirs open by default
EDIT_DIR_BASE_REL="node_modules/.pnpm_patches"

######################################################################
# transformers
######################################################################

######################################################################
# .what = the name half of a "name@version" spec; scoped names keep their @
# .why  = "@org/pkg@1.0.0" holds two @; only the last after the scope splits
######################################################################
as_package_name() {
  local spec="$1"
  local bare="${spec#@}"
  [[ "$bare" == *@* ]] || { echo "$spec"; return 0; }
  echo "${spec:0:$((${#spec} - ${#bare}))}${bare%@*}"
}

######################################################################
# .what = the version half of a "name@version" spec, or naught if unnamed
######################################################################
as_package_version() {
  local bare="${1#@}"
  [[ "$bare" == *@* ]] || return 0
  echo "${bare##*@}"
}

######################################################################
# .what = the flat file stem pnpm gives a package's patch: "@org/pkg" → "@org__pkg"
# .why  = the note must sit beside the patch pnpm writes, so it follows
#         pnpm's own name rule for <stem>@<version>.patch
######################################################################
as_patch_file_stem() {
  echo "${1//\//__}"
}

######################################################################
# .what = the patch file and note file paths, relative to the repo root
######################################################################
as_patch_rel_path() {
  echo "$PATCHES_DIR_REL/$(as_patch_file_stem "$1")@$2.patch"
}
as_note_rel_path() {
  echo "$(as_patch_rel_path "$1" "$2").note.md"
}

######################################################################
# .what = the default edit dir for a package@version, relative to root
# .why  = the verb names the dir itself, inside the tree, so the bound
#         holds whatever default a pnpm version picks
######################################################################
as_edit_dir_rel_default() {
  echo "$EDIT_DIR_BASE_REL/$1@$2"
}

######################################################################
# .what = a path shown relative to the repo root, for human output
######################################################################
as_rel_to_root() {
  local abs="$1"
  local root="$2"
  echo "${abs#"$root"/}"
}

######################################################################
# .what = decide whether a version is in a list of versions
######################################################################
is_version_listed() {
  local version="$1"
  shift
  local each
  for each in "$@"; do
    [[ "$each" == "$version" ]] && return 0
  done
  return 1
}

######################################################################
# .what = one "<label>: name@version" line per version, for a refusal
######################################################################
as_version_lines() {
  local label="$1"
  local name="$2"
  shift 2
  local each
  for each in "$@"; do
    echo "$label: $name@$each"
  done
}

######################################################################
# .what = decide whether a string is an http(s) link with no whitespace
# .why  = the upstream must be a place a reviewer can open
######################################################################
is_upstream_link() {
  [[ "$1" =~ ^https?://[^[:space:]]+$ ]]
}

######################################################################
# .what = decide whether a raw path has a ".." segment
# .why  = a ".." over a dir that does not exist yet cannot be resolved
#         by the os, so it is refused outright rather than guessed at
######################################################################
is_path_with_parent_segment() {
  [[ "/$1/" == *"/../"* ]]
}

######################################################################
# .what = the commit command a crew runs after begin, ready to paste
######################################################################
as_commit_cmd() {
  local spec="$1"
  local edit_dir_arg="$2"
  local cmd="rhx git.package.patch commit --package $spec --why '<why>' --upstream <issue-url>"
  [[ -n "$edit_dir_arg" ]] && cmd="$cmd --edit-dir $edit_dir_arg"
  echo "$cmd"
}

######################################################################
# .what = the begin command that opens an edit dir, ready to paste
######################################################################
as_begin_cmd() {
  local spec="$1"
  local edit_dir_arg="$2"
  local cmd="rhx git.package.patch begin --package $spec --mode apply"
  [[ -n "$edit_dir_arg" ]] && cmd="$cmd --edit-dir $edit_dir_arg"
  echo "$cmd"
}

######################################################################
# .what = decide whether a note's text records exactly this why + upstream
# .why  = a re-run with the same motive is a no-op; any other motive
#         must go through begin, so no note records a why no seal backs
######################################################################
is_note_of() {
  local note="$1"
  local why="$2"
  local upstream="$3"
  local line
  local has_why=1
  local has_upstream=1
  while IFS= read -r line; do
    [[ "$line" == "- why: $why" ]] && has_why=0
    [[ "$line" == "- upstream: $upstream" ]] && has_upstream=0
  done <<<"$note"
  [[ $has_why -eq 0 && $has_upstream -eq 0 ]]
}

######################################################################
# .what = the last line of a block of text
######################################################################
as_last_line() {
  printf '%s\n' "$1" | tail -n 1
}

######################################################################
# .what = render the LOCAL PATCH note
# .why  = who, when, why, and upstream are the signal a later reviewer
#         needs to retire the patch once the real fix ships
#
# usage: as_patch_note --package <name@version> --who <who> --when <date> \
#          --why <why> --upstream <url> --patch <rel path>
######################################################################
as_patch_note() {
  local spec="" who="" when="" why="" upstream="" patch=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --package) spec="$2" ;;
      --who) who="$2" ;;
      --when) when="$2" ;;
      --why) why="$2" ;;
      --upstream) upstream="$2" ;;
      --patch) patch="$2" ;;
      *) echo "as_patch_note: unknown arg $1" >&2; return 2 ;;
    esac
    shift $(( $# > 1 ? 2 : 1 ))
  done
  cat <<EOF
# local patch: $spec

- who: $who
- when: $when
- why: $why
- upstream: $upstream
- patch: $patch

retire this patch once the upstream fix ships: upgrade past it, then delete
both this note and the patch, and drop its patchedDependencies entry.
EOF
}

######################################################################
# communicators
######################################################################

######################################################################
# .what = print the real path of the git root, or naught outside a repo
# .why  = the in-tree bound compares real paths; a logical root would
#         let a symlinked cwd step past it
# .note = "not a git repository" is the one expected failure; any other
#         git failure prints its cause and returns 2
######################################################################
get_repo_root() {
  local out
  if ! out=$(git rev-parse --show-toplevel 2>&1); then
    [[ "$out" == *"not a git repository"* ]] && return 0
    echo "$out" >&2
    return 2
  fi
  (cd "$out" && pwd -P)
}

######################################################################
# .what = print one git config value, or naught when the key is unset
# .note = git exits 1 for an unset key, the one expected failure; any
#         other exit prints git's cause and returns 2
######################################################################
get_git_config_value() {
  local root="$1"
  local key="$2"
  local out
  local status=0
  out=$(git -C "$root" config "$key" 2>&1) || status=$?
  [[ $status -eq 0 ]] && { echo "$out"; return 0; }
  [[ $status -eq 1 ]] && return 0
  echo "$out" >&2
  return 2
}

######################################################################
# .what = read one field of a package.json, or naught if the field is unset
# .note = a malformed file prints jq's cause and returns 2
######################################################################
get_package_json_field() {
  local file="$1"
  local field="$2"
  jq -r --arg field "$field" '.[$field] // empty' "$file" || return 2
}

######################################################################
# .what = list every distinct version of a package installed in the tree
# .why  = never let pnpm open its interactive version picker; read the
#         package.json files on disk instead. works for both linkers:
#         isolated (node_modules/.pnpm/*/node_modules/<name>) and
#         hoisted (node_modules/<name> only)
# .note = a malformed package.json returns 2, never a short list
######################################################################
get_all_installed_versions() {
  local root="$1"
  local name="$2"
  local pkg_json
  local found=""
  local version
  for pkg_json in "$root/node_modules/$name/package.json" \
    "$root"/node_modules/.pnpm/*/node_modules/"$name"/package.json; do
    [[ -f "$pkg_json" ]] || continue
    version=$(jq -r --arg name "$name" 'select(.name == $name) | .version // empty' "$pkg_json") || return 2
    [[ -n "$version" ]] && found+="$version"$'\n'
  done
  printf '%s' "$found" | sort -uV
}

######################################################################
# .what = list the versions whose default edit dir is open for a package
######################################################################
get_all_open_edit_dir_versions() {
  local root="$1"
  local name="$2"
  local dir
  local state
  for dir in "$root/$EDIT_DIR_BASE_REL/$name"@*; do
    state=$(get_edit_dir_state "$dir") || return 2
    [[ "$state" == "open" ]] || continue
    echo "${dir##*@}"
  done
}

######################################################################
# .what = print the real absolute form of a path, even if it does not exist
# .why  = an escape via a symlink is caught only on the real path; the
#         deepest extant ancestor is resolved by the os, the tail appended
#
# usage: get_real_path --path <path> --from <dir a relative path starts at>
######################################################################
get_real_path() {
  local target=""
  local base=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --path) target="$2"; shift $(( $# > 1 ? 2 : 1 )) ;;
      --from) base="$2"; shift $(( $# > 1 ? 2 : 1 )) ;;
      *) echo "get_real_path: unknown arg $1" >&2; return 2 ;;
    esac
  done
  [[ "$target" != /* ]] && target="$base/$target"
  local head="$target"
  local tail=""
  while [[ ! -e "$head" ]]; do
    tail="/$(basename "$head")$tail"
    head="$(dirname "$head")"
  done
  if [[ -d "$head" ]]; then
    echo "$(cd "$head" && pwd -P)$tail"
    return 0
  fi
  echo "$(cd "$(dirname "$head")" && pwd -P)/$(basename "$head")$tail"
}

######################################################################
# .what = decide whether a path sits strictly inside the tree, off .git
# .why  = the verb's license to run unprompted rests on this bound; the
#         repo boundary itself comes from its one producer, and this adds
#         two refusals an edit dir needs: the root itself, and .git
#
# usage: is_inside_tree --path <real path> --root <real repo root>
#        (named, as its producer is_path_within_repo_root: two paths swapped
#        would invert the bound in silence; an unknown arg refuses)
######################################################################
is_inside_tree() {
  local real=""
  local root=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --path) real="$2"; shift $(( $# > 1 ? 2 : 1 )) ;;
      --root) root="$2"; shift $(( $# > 1 ? 2 : 1 )) ;;
      *) return 1 ;;
    esac
  done
  [[ -n "$real" && -n "$root" ]] || return 1
  is_path_within_repo_root --path "$real" --root "$root" || return 1
  [[ "$real" == "$root" ]] && return 1
  [[ "$real" == "$root/.git" || "$real" == "$root/.git/"* ]] && return 1
  return 0
}

######################################################################
# .what = decide whether an edit dir is open (present and non-empty)
# .why  = an open dir holds the crew's edits; begin reuses it rather than
#         re-run pnpm over it, and commit seals only an open one
# .note = a dir that exists but cannot be read prints the cause and
#         returns 2, never "not open"
######################################################################
is_edit_dir_open() {
  local dir="$1"
  [[ -d "$dir" ]] || return 1
  [[ -r "$dir" && -x "$dir" ]] || { echo "edit dir cannot be read: $dir" >&2; return 2; }
  local entry
  for entry in "$dir"/* "$dir"/.[!.]* "$dir"/..?*; do
    [[ -e "$entry" || -L "$entry" ]] && return 0
  done
  return 1
}

######################################################################
# .what = print "open" or "closed" for an edit dir; return 2 if unreadable
# .why  = a phase must tell "closed" apart from "cannot read", so the
#         second is a malfunction and never read as the first
######################################################################
get_edit_dir_state() {
  local status=0
  is_edit_dir_open "$1" || status=$?
  [[ $status -eq 0 ]] && { echo "open"; return 0; }
  [[ $status -eq 1 ]] && { echo "closed"; return 0; }
  return 2
}

######################################################################
# .what = open an edit dir for name@version via pnpm patch
# .why  = stdin closed, so no pnpm prompt can ever wait; the dir is passed
#         explicitly, so pnpm writes only where the bound allowed
# .note = prints pnpm's output; returns pnpm's status
######################################################################
set_edit_dir_via_pnpm() {
  local root="$1"
  local spec="$2"
  local dir="$3"
  mkdir -p "$(dirname "$dir")" 2>&1 || return 2
  if [[ -d "$dir" ]]; then rmdir "$dir" 2>&1 || return 2; fi
  (cd "$root" && pnpm patch "$spec" --edit-dir "$dir" </dev/null 2>&1)
}

######################################################################
# .what = seal an edit dir into a patch via pnpm patch-commit
# .note = prints pnpm's output; returns pnpm's status
######################################################################
set_patch_via_pnpm() {
  local root="$1"
  local dir="$2"
  (cd "$root" && pnpm patch-commit "$dir" --patches-dir "$PATCHES_DIR_REL" </dev/null 2>&1)
}

######################################################################
# .what = write the note file beside the patch
######################################################################
set_patch_note() {
  local file="$1"
  local content="$2"
  printf '%s\n' "$content" >"$file"
}

######################################################################
# .what = remove a sealed edit dir
######################################################################
del_edit_dir() {
  rm -rf "$1"
}
