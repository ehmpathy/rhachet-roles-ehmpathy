#!/usr/bin/env bash
######################################################################
# .what = the one rule for which settings files hold the Bash allowlist
#
# .why  = claude merges permissions across several settings files. the
#         permission hooks (check, decide, notify) must read the same
#         files claude reads, or a hook blocks a command claude allows.
#         one rule here, sourced by all three, so they cannot drift.
#
# .the layers =
#   walk-up dir = first <ancestor>/.claude above $PWD
#   config dir  = $CLAUDE_CONFIG_DIR, else the walk-up dir
#   user dir    = $CLAUDE_CONFIG_DIR, else $HOME/.claude
#
#   split layout (rhachet spawns each clone with --setting-sources user
#   --settings <config dir>/settings.of.repo.json, so claude loads two files):
#     actor : <config dir>/settings.of.repo.json
#     user  : <user dir>/settings.json   (a link, via settings.of.grove.json, to the home file)
#
#   old layout (an unmigrated repo; claude also loads project + local):
#     actor   : <config dir>/settings.of.repo.json + <config dir>/settings.local.json
#     user    : <user dir>/settings.json
#     project : <walk-up dir>/settings.json     + <walk-up dir>/settings.local.json
#
#   another actor's settings.of.repo.json never counts.
#
# usage:
#   source "$(dirname "${BASH_SOURCE[0]}")/permissions.layers.operations.sh"
#   set_permissions_layers allow    # fills PERMISSIONS_LAYER_PATTERNS + PERMISSIONS_LAYER_STATES
#
# guarantee:
#   - a broken link or an absent file reads as absent, never a crash
#   - invalid json reads as unreadable; the other layers still count
#   - defines functions only; no side effects on source
######################################################################

# .what = find the three dirs of the layer rule, once, in-shell
# .why  = the one home of the dir rule; every getter and every hook reads these globals
# .outputs = globals:
#   PERMISSIONS_WALKUP_DIR = the first <ancestor>/.claude above $PWD, or ""
#                            (claude's project scope lives there, regardless of $CLAUDE_CONFIG_DIR)
#   PERMISSIONS_CONFIG_DIR = $CLAUDE_CONFIG_DIR, else the walk-up dir, or ""
#                            (a clone of a hash actor is checked against its own actor's allowlist)
#   PERMISSIONS_USER_DIR   = $CLAUDE_CONFIG_DIR, else $HOME/.claude, or ""
#                            (claude honors a home allow; the hooks must too)
# .note = ${dir%/*} strips the last segment in-shell, as the forbid-terms hooks do;
#         dirname would fork once per parent dir, on every hook call.
#         ${dir%/*} yields "" where dirname yields "/", hence the -z guard.
#         no $( ) subshell forks, since a PreToolUse hook pays this cost on every Bash call
set_permissions_dirs() {
  local dir="$PWD"

  # the walk-up dir: the first <ancestor>/.claude above $PWD
  PERMISSIONS_WALKUP_DIR=""
  while [[ "$dir" != "/" ]]; do
    if [[ -d "$dir/.claude" ]]; then
      PERMISSIONS_WALKUP_DIR="$dir/.claude"
      break
    fi
    dir="${dir%/*}"
    [[ -z "$dir" ]] && dir="/"
  done

  # the config dir and the user dir: $CLAUDE_CONFIG_DIR wins for both
  PERMISSIONS_CONFIG_DIR="$PERMISSIONS_WALKUP_DIR"
  PERMISSIONS_USER_DIR=""
  [[ -n "${HOME:-}" ]] && PERMISSIONS_USER_DIR="$HOME/.claude"
  if [[ -n "${CLAUDE_CONFIG_DIR:-}" ]]; then
    PERMISSIONS_CONFIG_DIR="${CLAUDE_CONFIG_DIR%/}"
    PERMISSIONS_USER_DIR="${CLAUDE_CONFIG_DIR%/}"
  fi

  # a config dir that IS the walk-up dir by identity (a link) takes the walk-up path, so
  # every caller can compare the two by string and never sees two actors where there is one
  [[ -n "$PERMISSIONS_WALKUP_DIR" && "$PERMISSIONS_CONFIG_DIR" -ef "$PERMISSIONS_WALKUP_DIR" ]] \
    && PERMISSIONS_CONFIG_DIR="$PERMISSIONS_WALKUP_DIR"
  return 0
}

# .what = which layout the repo is on: split | old
# .why  = the layout decides which files claude loads, so it decides which files the hooks read
# .outputs = globals:
#   PERMISSIONS_LAYOUT = split | old; call after set_permissions_dirs
# .note = the one signal: a settings.of.repo.json in the config dir or the walk-up dir. rhachet
#         creates it ({}) for every actor at each layout sync, before role inits run, and
#         never overwrites it; so a migrated repo always shows it, even with no home file.
#         the old layout keeps a real settings.json and no settings.of.repo.json anywhere.
#         a linked <repo>/.claude is NOT a signal: rhachet 1.48 links it on the old layout too
set_permissions_layout() {
  PERMISSIONS_LAYOUT=old
  [[ -n "$PERMISSIONS_CONFIG_DIR" && -f "$PERMISSIONS_CONFIG_DIR/settings.of.repo.json" ]] && PERMISSIONS_LAYOUT=split
  [[ -n "$PERMISSIONS_WALKUP_DIR" && -f "$PERMISSIONS_WALKUP_DIR/settings.of.repo.json" ]] && PERMISSIONS_LAYOUT=split
  return 0
}

# .what = the next move for a clone whose actor allowlist is empty or absent
# .why  = `rhx enroll` re-derives the actor's settings.of.repo.json before each spawn, and
#         `rhx init --hooks` or `rhx upgrade` (run at the repo root, never in an actor's dir)
#         re-derive it for every actor on disk; so the fix for a clone is re-enroll, or init at the root
# .outputs = globals:
#   PERMISSIONS_FIX_HINT = one line; call after set_permissions_dirs (or any layer read)
set_permissions_fix_hint() {
  PERMISSIONS_FIX_HINT="to write the repo's allowlist, ask your human to run rhx init at the repo root, in their own shell"
  [[ -z "$PERMISSIONS_CONFIG_DIR" || "$PERMISSIONS_CONFIG_DIR" == "$PERMISSIONS_WALKUP_DIR" ]] && return 0
  set_permissions_enroll_cmd
  PERMISSIONS_FIX_HINT="this clone reads its actor allowlist from $PERMISSIONS_CONFIG_DIR/settings.of.repo.json, which rhx enroll derives; re-enroll this clone ($PERMISSIONS_ENROLL_CMD), or ask your human to run rhx init at the repo root"
}

# .what = the enroll command that lands on this clone's actor
# .why  = the actor dir name holds a one-way hash, so the command comes from <actor dir>/actor.json:
#         brain + roles. rhachet stores a delta actor's +role/-role tokens as rolesDelta (a sorted
#         list, the tokens rhx enroll --roles takes); an absolute actor holds rolesDelta null, or no
#         key, and its set as roles. the repo actor (actor.via.repo=*) holds the ambient roles, so
#         its command is a bare rhx enroll <brain>
# .outputs = globals:
#   PERMISSIONS_ENROLL_CMD = e.g. "rhx enroll claude --roles mechanic,driver"; a generic form
#                            when actor.json is absent or unreadable
# .note = parsed with builtins (read + [[ =~ ]]), never jq: it runs on the block path of a hook
#         that runs before every Bash call
set_permissions_enroll_cmd() {
  PERMISSIONS_ENROLL_CMD="rhx enroll <brain> --roles <roles>"

  # the actor dir = the brain dir minus /brain/.claude; a path through the <repo>/.claude link
  # does not end that way, so take its real path first (cd -P in a subshell forks, never execs).
  # an absent dir has no real path: it reads as "", so the generic form stands. the final
  # `|| config_dir=""` keeps the failed $( ) from a caller's set -e, which in a PreToolUse
  # hook would exit 1 and so permit the command
  local config_dir="$PERMISSIONS_CONFIG_DIR"
  if [[ "$config_dir" != */brain/.claude ]]; then
    config_dir="$(cd -P "$config_dir" 2>/dev/null && pwd)" || config_dir=""
  fi
  local actor_dir="${config_dir%/brain/.claude}"
  [[ -n "$config_dir" && "$actor_dir" != "$config_dir" && -f "$actor_dir/actor.json" ]] || return 0

  # read the file whole, in-shell
  local json="" brain="" list="" roles=""
  IFS= read -r -d '' json < "$actor_dir/actor.json" || true

  # extract the brain; the repo actor re-enrolls bare, on the ambient roles
  [[ "$json" =~ \"brain\"[[:space:]]*:[[:space:]]*\"([^\"]+)\" ]] || return 0
  brain="${BASH_REMATCH[1]}"
  PERMISSIONS_ENROLL_CMD="rhx enroll $brain"
  [[ "${actor_dir##*/}" == actor.via.repo=* ]] && return 0

  # the role list: rolesDelta when a non-empty list, else roles
  [[ "$json" =~ \"rolesDelta\"[[:space:]]*:[[:space:]]*\[([^]]*)\] ]] && list="${BASH_REMATCH[1]}"
  [[ "${list//[[:space:]]/}" == "" && "$json" =~ \"roles\"[[:space:]]*:[[:space:]]*\[([^]]*)\] ]] \
    && list="${BASH_REMATCH[1]}"

  # join the quoted entries with commas: drop quotes and blanks
  roles="${list//\"/}"
  roles="${roles//[[:space:]]/}"
  [[ -n "$roles" ]] && PERMISSIONS_ENROLL_CMD+=" --roles $roles"
  return 0
}

# .what = whether the actor allowlist file is absent where the repo's layout expects one
# .why  = only a split layout keeps the repo's allows in settings.of.repo.json; on the old layout
#         the file is absent by design, so an alarm there is false, while on the split layout
#         its absence is the #895 symptom, for a clone of any actor
# .outputs = globals:
#   PERMISSIONS_ACTOR_FILE_ABSENT = true | false; call after set_permissions_layout
set_permissions_actor_file_absent() {
  PERMISSIONS_ACTOR_FILE_ABSENT=false
  [[ -z "$PERMISSIONS_CONFIG_DIR" || "$PERMISSIONS_LAYOUT" != split ]] && return 0

  # absent where the layout expects it
  [[ -f "$PERMISSIONS_CONFIG_DIR/settings.of.repo.json" ]] || PERMISSIONS_ACTOR_FILE_ABSENT=true
  return 0
}

# .what = print one dir of the layer rule; exit 1 when it is unknown
# .why  = a readable view of set_permissions_dirs, for tests
get_permissions_walkup_dir() {
  set_permissions_dirs
  [[ -n "$PERMISSIONS_WALKUP_DIR" ]] || return 1
  echo "$PERMISSIONS_WALKUP_DIR"
}
get_permissions_config_dir() {
  set_permissions_dirs
  [[ -n "$PERMISSIONS_CONFIG_DIR" ]] || return 1
  echo "$PERMISSIONS_CONFIG_DIR"
}
get_permissions_user_dir() {
  set_permissions_dirs
  [[ -n "$PERMISSIONS_USER_DIR" ]] || return 1
  echo "$PERMISSIONS_USER_DIR"
}

# .what = fill PERMISSIONS_LAYER_FILES with each settings file of the layer rule, in rank order, no duplicates
# .why  = callers read exactly this list, in this order
# .inputs = $1 = the purpose of the read (optional):
#   nudge   (default) = every file of the layer rule. a wide read only skips a nudge, since
#                       claude still prompts for a command it does not allow
#   approve           = the files claude loads, as best known: drops <config dir>/settings.local.json
#                       when the config dir is not the walk-up dir, since claude loads local
#                       settings only from the project. a wide read here would auto-approve a
#                       command claude would prompt for
#   on the split layout both purposes read the same two files: no local file is loaded there
# .outputs = globals:
#   PERMISSIONS_LAYER_FILES = the files, in rank order
#   PERMISSIONS_*_DIR       = as set_permissions_dirs, so a hook never finds the dirs twice
set_permissions_layer_files() {
  local purpose="${1:-nudge}"
  set_permissions_dirs
  set_permissions_layout

  # collect the files of this layout in rank order; skip a layer whose dir is unknown
  local -a files=()
  [[ -n "$PERMISSIONS_CONFIG_DIR" ]] && files+=("$PERMISSIONS_CONFIG_DIR/settings.of.repo.json")

  # split layout: claude loads only the actor file (--settings) and the user layer
  # (--setting-sources user), so neither local file nor the project layer counts
  if [[ "$PERMISSIONS_LAYOUT" == split ]]; then
    [[ -n "$PERMISSIONS_USER_DIR" ]] && files+=("$PERMISSIONS_USER_DIR/settings.json")
    set_permissions_layer_files_unique "${files[@]}"
    return 0
  fi

  # old layout: claude also loads the local files and the project layer
  [[ -n "$PERMISSIONS_CONFIG_DIR" && ( "$purpose" != approve || "$PERMISSIONS_CONFIG_DIR" == "$PERMISSIONS_WALKUP_DIR" ) ]] \
    && files+=("$PERMISSIONS_CONFIG_DIR/settings.local.json")
  [[ -n "$PERMISSIONS_USER_DIR" ]] && files+=("$PERMISSIONS_USER_DIR/settings.json")
  [[ -n "$PERMISSIONS_WALKUP_DIR" ]] && files+=("$PERMISSIONS_WALKUP_DIR/settings.json" "$PERMISSIONS_WALKUP_DIR/settings.local.json")
  set_permissions_layer_files_unique "${files[@]}"
}

# .what = fill PERMISSIONS_LAYER_FILES with the given files, in order, each one once
# .why  = drop a file already listed: by path (the dirs often coincide), or by identity, since
#         a link can lead two paths to one file. -ef is a builtin that follows links, and is
#         false for an absent file
set_permissions_layer_files_unique() {
  local -A seen=()
  local file prior dup
  PERMISSIONS_LAYER_FILES=()
  for file in "$@"; do
    [[ -n "${seen[$file]+x}" ]] && continue
    seen["$file"]=1
    dup=false
    for prior in "${PERMISSIONS_LAYER_FILES[@]}"; do
      [[ "$file" -ef "$prior" ]] && dup=true && break
    done
    [[ "$dup" == true ]] && continue
    PERMISSIONS_LAYER_FILES+=("$file")
  done
}

# .what = print each settings file of the layer rule, one per line, no duplicates
# .why  = a readable view of set_permissions_layer_files, for callers and tests
get_all_permissions_layer_files() {
  set_permissions_layer_files
  [[ ${#PERMISSIONS_LAYER_FILES[@]} -eq 0 ]] && return 0
  printf '%s\n' "${PERMISSIONS_LAYER_FILES[@]}"
}

# .what = read the Bash patterns of one permissions key across all layers
# .why  = one loop for every reader, with a per-file state for diagnostics
# .inputs = $1 = the permissions key ("allow" | "deny")
#           $2 = the purpose of the read, as set_permissions_layer_files (optional, default nudge)
# .outputs = globals:
#   PERMISSIONS_LAYER_PATTERNS = the union of patterns, sorted, no duplicates
#   PERMISSIONS_LAYER_STATES   = one "<path>: <state>" line per file read
#                                (state = absent | unreadable | N Bash <key> rules)
#   PERMISSIONS_LAYER_FAULT_FILES  = the path of each unreadable file
#   PERMISSIONS_FIX_HINT       = the next move for an empty or absent actor allowlist
#   PERMISSIONS_ACTOR_FILE_ABSENT = true when the split layout expects <config dir>/settings.of.repo.json and it is absent
#   PERMISSIONS_LAYER_FAULT_CAUSES = its jq cause, at the same index, so a caller
#                                    can name the real cause (two arrays, no delimiter
#                                    that a legal path char could collide with)
# .note = each call resets all four globals. a caller reads them before its next call;
#         decide calls once per key and consumes each result in place
set_permissions_layers() {
  local key="$1" purpose="${2:-nudge}"
  local -a patterns=() lines=()
  local file out count
  PERMISSIONS_LAYER_PATTERNS=()
  PERMISSIONS_LAYER_STATES=()
  PERMISSIONS_LAYER_FAULT_FILES=()
  PERMISSIONS_LAYER_FAULT_CAUSES=()

  set_permissions_layer_files "$purpose"
  set_permissions_fix_hint
  set_permissions_actor_file_absent

  for file in "${PERMISSIONS_LAYER_FILES[@]}"; do
    # absent file or broken link: claude cannot read it either
    if [[ ! -f "$file" ]]; then
      PERMISSIONS_LAYER_STATES+=("$file: absent")
      continue
    fi

    # invalid json: this layer yields no patterns; the rest still count
    if ! out="$(jq -r --arg key "$key" '.permissions[$key] // [] | .[] | select(type == "string" and startswith("Bash(")) | sub("^Bash\\("; "") | sub("\\)$"; "")' "$file" 2>&1)"; then
      PERMISSIONS_LAYER_STATES+=("$file: unreadable")
      PERMISSIONS_LAYER_FAULT_FILES+=("$file")
      PERMISSIONS_LAYER_FAULT_CAUSES+=("$out")
      continue
    fi

    # tally this layer, then add its patterns to the union
    count=0
    if [[ -n "$out" ]]; then
      mapfile -t lines <<< "$out"
      count=${#lines[@]}
    fi
    PERMISSIONS_LAYER_STATES+=("$file: $count Bash $key rules")
    [[ -n "$out" ]] && patterns+=("$out")
  done

  # union: one pattern per line, sorted, no duplicates
  # .note = LC_ALL=C pins byte order: the union's order breaks rank ties, and a locale
  #         collation would rank one allowlist two ways on two hosts
  if [[ ${#patterns[@]} -gt 0 ]]; then
    mapfile -t PERMISSIONS_LAYER_PATTERNS < <(printf '%s\n' "${patterns[@]}" | LC_ALL=C sort -u)
  fi
}

# .what = a layer file's path as a human reads it: relative to the repo root when the file
#         sits inside it (`.claude/settings.json`), else the full path (an actor's or user's file)
# .why  = the repo's own files read short, as the repo names them; a file elsewhere needs its
#         full path, or the reader cannot find it
# .inputs = $1 = the file path; reads PERMISSIONS_WALKUP_DIR (set by set_permissions_layers)
# .outputs = global PERMISSIONS_DISPLAY_PATH
as_permissions_display_path() {
  local file="$1"
  local repo_root="${PERMISSIONS_WALKUP_DIR%/.claude}"
  PERMISSIONS_DISPLAY_PATH="$file"

  # no repo walk-up, or a walk that landed on the user's own ~/.claude: keep the full path
  [[ -z "${PERMISSIONS_WALKUP_DIR:-}" || "$PERMISSIONS_WALKUP_DIR" -ef "${HOME:-/nonexistent}/.claude" ]] && return 0

  # a file inside the repo reads relative to its root
  [[ "$file" == "$repo_root/"* ]] && PERMISSIONS_DISPLAY_PATH="${file#"$repo_root/"}"
  return 0
}
