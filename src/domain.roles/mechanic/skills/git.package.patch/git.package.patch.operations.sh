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
# .what = decide whether text has the shape of a package version
# .why  = an edit dir's package.json is untrusted text; its version is
#         checked before it may enter a refusal or a paste-ready hint
######################################################################
is_version_shape() {
  [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+([-+][0-9A-Za-z.+-]+)?$ ]]
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
# .what = render one argument of a paste-ready command, shell-safe
# .why  = a hint is the line a crew or agent copies; an argument that came
#         from a flag or a package.json must not carry a newline, a quote, or
#         a metachar into it. plain specs and paths stay as is; a whole
#         <placeholder> (letters, spaces, hyphens) stays literal, since the
#         crew replaces it; all else is quoted, < > and \ included
######################################################################
as_shell_arg() {
  if [[ "$1" =~ ^[A-Za-z0-9@/._:+-]+$ || "$1" =~ ^\<[a-z][a-z\ -]*\>$ ]]; then
    echo "$1"
    return 0
  fi
  # single quotes read as prose; only a value that holds a quote or a newline needs %q
  if [[ "$1" != *"'"* && "$1" != *$'\n'* ]]; then
    echo "'$1'"
    return 0
  fi
  printf '%q\n' "$1"
}

######################################################################
# .what = the commit command a crew runs after begin, ready to paste
# .note = why and upstream are optional: given, the hint carries the crew's own values, so a
#         rerun is one paste; absent, it shows the placeholders
######################################################################
as_commit_cmd() {
  local spec="$1"
  local edit_dir_arg="$2"
  local why="${3:-}"
  local upstream="${4:-}"
  local why_arg="'<why>'"
  local upstream_arg="'<issue-url>'"
  [[ -n "$why" ]] && why_arg=$(as_shell_arg "$why")
  [[ -n "$upstream" ]] && upstream_arg=$(as_shell_arg "$upstream")
  local cmd="rhx git.package.patch commit --package $(as_shell_arg "$spec") --why $why_arg --upstream $upstream_arg"
  [[ -n "$edit_dir_arg" ]] && cmd="$cmd --edit-dir $(as_shell_arg "$edit_dir_arg")"
  echo "$cmd"
}

######################################################################
# .what = the commit command that seals an edit dir, with --mode apply
######################################################################
as_commit_apply_cmd() {
  echo "$(as_commit_cmd "$1" "$2" "${3:-}" "${4:-}") --mode apply"
}

######################################################################
# .what = the install command for a package that is not installed
# .why  = a package the manifest already declares needs the tree
#         installed (a fresh worktree), not a new dependency added
######################################################################
as_install_cmd() {
  local root="$1" name="$2"
  if is_dependency_declared "$root" "$name"; then
    echo "pnpm install"
    return 0
  fi
  echo "rhx set.package.install --package $(as_shell_arg "$name") --at <version> --for prod --reason '<why>'"
}

######################################################################
# .what = whether package.json declares the package in any dependency map
######################################################################
is_dependency_declared() {
  local root="$1" name="$2"
  [[ -f "$root/package.json" ]] || return 1
  jq -e --arg name "$name" \
    '[.dependencies, .devDependencies, .optionalDependencies, .peerDependencies] | map(. // {} | has($name)) | any' \
    "$root/package.json" >/dev/null 2>&1
}

######################################################################
# .what = the begin command that opens an edit dir, ready to paste
# .note = --mode apply comes last, as in the commit hint, so both hints read alike
######################################################################
as_begin_cmd() {
  local spec="$1"
  local edit_dir_arg="$2"
  local cmd="rhx git.package.patch begin --package $(as_shell_arg "$spec")"
  [[ -n "$edit_dir_arg" ]] && cmd="$cmd --edit-dir $(as_shell_arg "$edit_dir_arg")"
  echo "$cmd --mode apply"
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
  echo "${1##*$'\n'}"
}

######################################################################
# .what = the newest stable version of a sorted list of versions
# .why  = get_all_installed_versions sorts low to high via sort -V, which
#         ranks 1.0.0-beta.1 above 1.0.0; a prerelease is named only when
#         no stable version is installed
######################################################################
as_latest_version() {
  local version latest="${*: -1}"
  for version in "$@"; do
    [[ "$version" == *-* ]] || latest="$version"
  done
  echo "$latest"
}

######################################################################
# .what = the oldest of a sorted list of versions
######################################################################
as_oldest_version() {
  echo "$1"
}

######################################################################
# .what = the one version of a list a caller already narrowed to one
######################################################################
as_sole_version() {
  echo "$1"
}

######################################################################
# .what = a list of versions as one line of text, for a refusal
######################################################################
as_version_list_text() {
  echo "$*"
}

######################################################################
# .what = the note's who, in git's own "Name <email>" form
#
# usage: as_git_identity --name <name> --email <email>
######################################################################
as_git_identity() {
  local name=""
  local email=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --name) name="$2"; shift $(( $# > 1 ? 2 : 1 )) ;;
      --email) email="$2"; shift $(( $# > 1 ? 2 : 1 )) ;;
      *) echo "as_git_identity: unknown arg $1" >&2; return 2 ;;
    esac
  done
  echo "$name <$email>"
}

######################################################################
# .what = what begin does to an edit dir in a given state
# .why  = an open dir holds edits; begin reuses it, never reopens it
######################################################################
as_begin_action() {
  [[ "$1" == "open" ]] && { echo "reuse"; return 0; }
  echo "open"
}

######################################################################
# .what = the prior patch line begin shows, given the patch presence
# .why  = pnpm opens an edit dir with an extant patch already applied
######################################################################
as_begin_prior() {
  local presence="$1"
  local patch_rel="$2"
  [[ "$presence" == "present" ]] && { echo "$patch_rel (opens with it applied)"; return 0; }
  echo "none"
}

######################################################################
# .what = what commit does to the patch file, given its presence
######################################################################
as_commit_patch_state() {
  [[ "$1" == "present" ]] && { echo "re-sealed"; return 0; }
  echo "written"
}

######################################################################
# .what = the prior patch line commit shows, given the patch presence
######################################################################
as_commit_prior() {
  local presence="$1"
  local patch_rel="$2"
  [[ "$presence" == "present" ]] && { echo "$patch_rel (re-sealed)"; return 0; }
  echo "none"
}

######################################################################
# .what = the prior patch line an empty seal shows, given the patch presence
# .why  = an empty seal must say the prior patch and its note stand untouched
######################################################################
as_kept_prior() {
  local presence="$1"
  local patch_rel="$2"
  [[ "$presence" == "present" ]] && { echo "$patch_rel, kept as it was, with its note"; return 0; }
  echo "none"
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
  printf '%s\n' \
    "# local patch: $spec" \
    "" \
    "- who: $who" \
    "- when: $when" \
    "- why: $why" \
    "- upstream: $upstream" \
    "- patch: $patch" \
    "" \
    "retire this patch once the upstream fix ships: first drop its patchedDependencies" \
    "entry and delete both this note and the patch, then upgrade past it. a patch that" \
    "no longer fits the new version aborts the install, so the drop must come first."
}

######################################################################
# caller-state setters
######################################################################

######################################################################
# .what = fill a caller's array with the lines of a block of text
# .why  = an empty block yields an empty array, never one empty element
# .note = no i/o; a set_* because it writes the caller's variable
#
# usage: set_list_from_lines --into <array name> --lines <text>
######################################################################
set_list_from_lines() {
  local into=""
  local lines=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --into) into="$2"; shift $(( $# > 1 ? 2 : 1 )) ;;
      --lines) lines="$2"; shift $(( $# > 1 ? 2 : 1 )) ;;
      *) echo "set_list_from_lines: unknown arg $1" >&2; return 2 ;;
    esac
  done
  local -n list_target="$into"
  list_target=()
  [[ -n "$lines" ]] || return 0
  mapfile -t list_target <<<"${lines%$'\n'}"
}

######################################################################
# communicators
######################################################################

######################################################################
# .what = print the real path of the git root, or naught outside a repo
# .why  = the in-tree bound compares real paths; a logical root would
#         let a symlinked cwd step past it
# .note = "not a git repository" is the one expected failure; any other
#         git failure prints its cause and returns 2. git runs under
#         LC_ALL=C, so its message reads the same under any locale
######################################################################
get_repo_root() {
  local out
  if ! out=$(LC_ALL=C git rev-parse --show-toplevel 2>&1); then
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
    # a package.json is third-party text; only a version-shaped value may reach output or a path
    is_version_shape "$version" && found+="$version"$'\n'
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
  # realpath -m follows every symlink, a broken one included, at every component
  realpath -m -- "$target"
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
# .what = decide whether a given --edit-dir may hold a scratch copy
# .why  = in-tree is not enough: the live install under node_modules is
#         hard-linked from the shared pnpm store on most hosts, so an edit
#         there writes through to every project on the machine, and the seal
#         would then delete the live copy. only the patch base is scratch.
#         a broken symlink leaf resolves lexically, so it is refused too.
#
# usage: is_edit_dir_allowed --given <arg> --from <cwd> --real <real path> \
#          --root <real repo root>
######################################################################
is_edit_dir_allowed() {
  local given="" from="" real="" root=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --given) given="$2"; shift $(( $# > 1 ? 2 : 1 )) ;;
      --from) from="$2"; shift $(( $# > 1 ? 2 : 1 )) ;;
      --real) real="$2"; shift $(( $# > 1 ? 2 : 1 )) ;;
      --root) root="$2"; shift $(( $# > 1 ? 2 : 1 )) ;;
      *) return 1 ;;
    esac
  done
  [[ -n "$given" && -n "$real" && -n "$root" ]] || return 1
  local lexical="$given"
  [[ "$lexical" != /* ]] && lexical="$from/$lexical"
  lexical="${lexical%/}"
  [[ -L "$lexical" && ! -e "$lexical" ]] && return 1
  [[ "$real" == "$root/$EDIT_DIR_BASE_REL/"* ]] && return 0
  [[ "$real" == "$root/node_modules" || "$real" == "$root/node_modules/"* ]] && return 1
  # the seal writes into the patches dir, then deletes the edit dir: never the same dir
  [[ "$real" == "$root/$PATCHES_DIR_REL" || "$real" == "$root/$PATCHES_DIR_REL/"* ]] && return 1
  [[ "$root/$PATCHES_DIR_REL" == "$real/"* ]] && return 1
  return 0
}

######################################################################
# .what = decide whether an edit dir is open (present and non-empty)
# .why  = an open dir holds the crew's edits; begin reuses it rather than
#         re-run pnpm over it, and commit seals only an open one
# .note = a dir that exists but cannot be read prints the cause and
#         returns 2, never "not open"
######################################################################
has_edit_dir_entries() {
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
  has_edit_dir_entries "$1" || status=$?
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
# .what = decide whether pnpm-lock.yaml records a patch file
# .why  = when patch-commit records the entry in package.json beside a prior
#         one, its own install can leave the lockfile without it; a frozen
#         install then fails on the mismatch, and the live copy is unpatched
######################################################################
has_lockfile_patch_entry() {
  local root="$1" patch_rel="$2"
  [[ -f "$root/pnpm-lock.yaml" ]] && grep -qF "path: $patch_rel" "$root/pnpm-lock.yaml"
}

######################################################################
# .what = settle the tree via pnpm install, so the lockfile and the live
#         copies match the manifest's patchedDependencies
# .note = --no-frozen-lockfile: under CI=true pnpm freezes a bare install, which
#         refuses the very lockfile update this settle exists to make
# .note = prints pnpm's output; returns pnpm's status
######################################################################
set_install_via_pnpm() {
  local root="$1"
  (cd "$root" && pnpm install --no-frozen-lockfile --config.confirmModulesPurge=false </dev/null 2>&1)
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

######################################################################
# .what = today's date in utc, as an iso date (YYYY-MM-DD)
# .why  = the note's when; a clock read is i/o, so it sits behind a name
######################################################################
get_today_iso_date() {
  date -u +%Y-%m-%d
}

######################################################################
# .what = print "present" or "absent" for a file
######################################################################
get_file_presence() {
  [[ -f "$1" ]] && { echo "present"; return 0; }
  echo "absent"
}

######################################################################
# .what = decide whether a repo root holds a package.json
######################################################################
has_package_json() {
  [[ -f "$1/package.json" ]]
}

######################################################################
# .what = name the lockfile of another package manager at a repo root, if any
# .why  = pnpm patch is pnpm-only; in an npm, yarn, or bun repo the seal's
#         install would relink the tree under pnpm and write a second lockfile
######################################################################
get_foreign_lockfile() {
  local root="$1" lockfile
  for lockfile in package-lock.json yarn.lock bun.lock bun.lockb; do
    [[ -f "$root/$lockfile" ]] && { echo "$lockfile"; return 0; }
  done
  return 0
}

######################################################################
# .what = decide whether a string is a valid npm package name
# .why  = the name becomes a path segment (edit dir, patch file); a name with
#         a "..", a slash outside a scope, or a space must never reach a path
######################################################################
is_package_name() {
  [[ "$1" =~ ^(@[A-Za-z0-9][A-Za-z0-9._~-]*/)?[A-Za-z0-9][A-Za-z0-9._~-]*$ ]] \
    && [[ "$1" != *..* ]]
}

######################################################################
# .what = decide whether a dir holds any file git tracks
# .why  = commit deletes the sealed edit dir; a dir that holds tracked files
#         is a real part of the tree, never a scratch copy, so it must survive
# .note = git failure prints the cause and returns 2, never "no tracked files"
######################################################################
has_tracked_files() {
  local root="$1" dir="$2" listed
  listed=$(git -C "$root" ls-files -- "$dir" 2>&1) || {
    echo "$listed" >&2
    return 2
  }
  [[ -n "$listed" ]]
}

######################################################################
# .what = print the manifest that holds the patchedDependencies entry for a
#         patch file, or naught if neither does
# .why  = pnpm records the entry in package.json or pnpm-workspace.yaml, by
#         version; the verb names which, and fails loud if neither holds it
# .note = only a key's value counts: the path after a colon, outside a
#         comment. a yaml comment or prose that names the path is no entry
######################################################################
get_patched_dependency_manifest() {
  local root="$1" patch_rel="$2" manifest
  local patch_re="${patch_rel//./\\.}"
  patch_re="${patch_re//+/\\+}"
  local entry_re="^[^#]*:[[:space:]]*[\"']?${patch_re}[\"']?[[:space:]]*,?[[:space:]]*(#.*)?$"
  for manifest in package.json pnpm-workspace.yaml; do
    [[ -f "$root/$manifest" ]] && grep -qE "$entry_re" "$root/$manifest" && {
      echo "$manifest"
      return 0
    }
  done
  return 0
}

######################################################################
# .what = name the record a present patch file lacks: entry | lockfile | naught
# .why  = a patch is sealed only when four facts hold: the file, its note, a
#         patchedDependencies entry, and a pnpm-lock.yaml record. a rebase that
#         takes "theirs" for the manifest or lockfile drops a record while the
#         file stays; pnpm then neither applies the patch nor opens it applied
# .note = prints "entry" first: without the entry, a lockfile record means naught
######################################################################
get_sealed_patch_gap() {
  local root="$1" patch_rel="$2"
  [[ -n "$(get_patched_dependency_manifest "$root" "$patch_rel")" ]] || { echo "entry"; return 0; }
  has_lockfile_patch_entry "$root" "$patch_rel" || { echo "lockfile"; return 0; }
  return 0
}

######################################################################
# .what = the refusal hint that restores a lost patch record
######################################################################
as_sealed_patch_gap_hint() {
  local gap="$1" spec="$2" patch_rel="$3"
  if [[ "$gap" == "entry" ]]; then
    echo "restore the patchedDependencies entry \"$spec\": \"$patch_rel\" in pnpm-workspace.yaml or package.json#pnpm (often a checkout of the file from before the rebase), then run pnpm install"
    return 0
  fi
  echo "run pnpm install, so pnpm-lock.yaml records $patch_rel"
}

######################################################################
# .what = decide whether a repo installs with pnpm's hoisted node-linker
# .why  = under node-linker=hoisted, pnpm cannot apply a patch: install fails
#         with ERR_PNPM_PATCH_FAILED and leaves a manifest entry that reads as
#         applied while the disk stays pristine. refuse before any write.
######################################################################
is_hoisted_repo() {
  local root="$1"
  [[ -f "$root/.npmrc" ]] \
    && grep -Eq '^[[:space:]]*node-linker[[:space:]]*=[[:space:]]*hoisted[[:space:]]*([#;].*)?$' "$root/.npmrc" \
    && return 0
  [[ -f "$root/pnpm-workspace.yaml" ]] \
    && grep -Eq '^[[:space:]]*nodeLinker[[:space:]]*:[[:space:]]*["'"'"']?hoisted["'"'"']?[[:space:]]*(#.*)?$' "$root/pnpm-workspace.yaml" \
    && return 0
  return 1
}

######################################################################
# .what = print the text of a patch note, or naught if there is none
# .note = a note that exists but cannot be read prints the cause, returns 2
######################################################################
get_patch_note() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  cat "$file" || return 2
}

######################################################################
# .what = print the real path of the edit dir a phase works on
# .why  = a given --edit-dir resolves from the cwd (its real form comes
#         from the location gate); the default resolves from the repo root
#
# usage: get_edit_dir_abs --given <arg> --given-real <real> --root <root> \
#          --package <name> --version <version>
######################################################################
get_edit_dir_abs() {
  local given="" given_real="" root="" name="" version=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --given) given="$2" ;;
      --given-real) given_real="$2" ;;
      --root) root="$2" ;;
      --package) name="$2" ;;
      --version) version="$2" ;;
      *) echo "get_edit_dir_abs: unknown arg $1" >&2; return 2 ;;
    esac
    shift $(( $# > 1 ? 2 : 1 ))
  done
  [[ -n "$given" ]] && { echo "$given_real"; return 0; }
  get_real_path --path "$(as_edit_dir_rel_default "$name" "$version")" --from "$root"
}

######################################################################
# .what = set an extant patch file aside before a re-seal, and put it back
# .why  = pnpm writes no patch when the edit dir holds no diff, and leaves
#         the prior patch in place; with the prior set aside, an absent
#         file after the seal proves this seal wrote naught
# .note = set aside first puts back any copy a crashed seal left aside,
#         so a re-run converges; each returns 2 with the cause on failure
######################################################################
set_patch_aside() {
  local file="$1"
  set_patch_restored "$file" || return 2
  [[ -f "$file" ]] || return 0
  mv "$file" "$file.aside" || return 2
}
set_patch_restored() {
  local file="$1"
  [[ -f "$file.aside" ]] || return 0
  [[ -f "$file" ]] && { rm -f "$file.aside" || return 2; return 0; }
  mv "$file.aside" "$file" || return 2
}
del_patch_aside() {
  rm -f "$1.aside" || return 2
}

######################################################################
# .what = decide whether a failed first seal must keep the patch pnpm wrote
# .why  = pnpm patch-commit records the patchedDependencies entry before its
#         install; if that install fails, to remove the new patch file would
#         leave an entry that points at naught, and every later install fails.
#         with no prior aside, a recorded entry means the file must stay.
######################################################################
is_patch_kept_after_failure() {
  local root="$1" patch_rel="$2"
  [[ ! -f "$root/$patch_rel.aside" ]] || return 1
  [[ -f "$root/$patch_rel" ]] || return 1
  [[ -n "$(get_patched_dependency_manifest "$root" "$patch_rel")" ]]
}

######################################################################
# .what = undo a seal: the prior patch back in place, or no patch at all
# .why  = a failed or empty seal must leave the tree as it found it,
#         whatever file pnpm left behind
######################################################################
set_patch_reverted() {
  local file="$1"
  [[ -f "$file.aside" ]] && { mv -f "$file.aside" "$file" || return 2; return 0; }
  [[ -f "$file" ]] || return 0
  rm -f "$file" || return 2
}
