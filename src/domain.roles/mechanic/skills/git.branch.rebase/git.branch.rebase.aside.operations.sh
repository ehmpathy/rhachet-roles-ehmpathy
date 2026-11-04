#!/usr/bin/env bash
######################################################################
# .what = the set-aside store: unstaged paths held out of a rebase,
#         put back after
#
# .why  = a clone tree always holds unstaged ambient files it must never
#         commit; the git stash stack is shared across worktrees, so a
#         stash could pop another session's entry. the store lives in this
#         worktree's own git dir, which no other worktree reads.
#
# usage:
#   source "$SKILL_DIR/git.branch.rebase.aside.operations.sh"
#   set_aside_store_claimed label="..." rerun="..."
#   set_paths_aside label="..." paths="$UNSTAGED_FILES"
#   set_held_paths_put_back label="..." rebase="..."   # sets ASIDE_HELD_PATHS, ASIDE_MAIN_CHANGED
#
# layout:
#   $store/paths   one held path per line (repo-root relative)
#   $store/absent  held paths that were absent (an unstaged deletion)
#   $store/bases   "<HEAD blob or none>\t<path>" at set-aside time
#   $store/tree/   a link-safe copy of each present held path
#   $store/done    held paths already put back (a retry skips them)
#   $store/failed  "<path>\t<error>" per path a put-back could not write
#   $kept/         a link-safe copy of each fresh edit a held copy superseded
#                  (outside the store, so it outlives the put-back)
#
# .note = this module looks up the git dir once, when sourced: the dir is
#         fixed for the process, and the lookup's error is kept for the one
#         caller that must name it
######################################################################

# this module renders its own errors, so it names its render deps here
ASIDE_SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$ASIDE_SKILL_DIR/../git.commit/output.sh"
source "$ASIDE_SKILL_DIR/git.branch.rebase.operations.sh"

# look up this worktree's git dir once (see header .note)
ASIDE_GIT_DIR_ERROR=""
ASIDE_GIT_DIR=$(git rev-parse --absolute-git-dir 2>&1) \
  || { ASIDE_GIT_DIR_ERROR="$ASIDE_GIT_DIR"; ASIDE_GIT_DIR=""; }

######################################################################
# get the store path for this worktree
# returns: absolute path (the dir may or may not exist); status 1 if the
#          git dir cannot be read (its error is in ASIDE_GIT_DIR_ERROR)
######################################################################
get_aside_dir() {
  [[ -n "$ASIDE_GIT_DIR" ]] || return 1
  echo "$ASIDE_GIT_DIR/git.branch.rebase.aside"
}

######################################################################
# get the dir that keeps each superseded fresh edit
# returns: absolute path (the dir may or may not exist)
######################################################################
get_aside_kept_dir() {
  [[ -n "$ASIDE_GIT_DIR" ]] || return 1
  echo "$ASIDE_GIT_DIR/git.branch.rebase.superseded"
}

######################################################################
# check if a store is held
# returns: 0 if held, 1 if not
# .note = with no readable git dir, no store can exist: the caller's own
#         guards (no rebase in progress, not a repo) render that state
######################################################################
is_aside_held() {
  [[ -n "$ASIDE_GIT_DIR" ]] || return 1
  [[ -d "$ASIDE_GIT_DIR/git.branch.rebase.aside" ]]
}

######################################################################
# get held paths
# returns: newline-separated list (empty if no store)
######################################################################
get_held_paths() {
  local store
  store=$(get_aside_dir)
  [[ -f "$store/paths" ]] && cat "$store/paths"
  return 0
}

######################################################################
# get held paths not yet put back (a prior put-back that failed partway
# records each path it did put back in $store/done)
# returns: newline-separated list (empty if no store)
######################################################################
get_held_paths_left() {
  local store
  store=$(get_aside_dir)
  [[ -f "$store/done" ]] || { get_held_paths; return 0; }
  get_held_paths | grep -vxF -f "$store/done" || true
}

######################################################################
# try to claim the store for this run
# returns: 0 if claimed (store now present, empty); 1 if a store is
#          already present (a concurrent run won); 2 if the store cannot
#          be created, with the cause in ASIDE_CLAIM_ERROR
# .note = mkdir is atomic: two concurrent callers cannot both claim it,
#         so the store's existence is the lock. deliberately not a gen
#         (findsert): a second claim must fail here, not reuse the store
######################################################################
try_aside_store_claim() {
  local store
  ASIDE_CLAIM_ERROR=""
  store=$(get_aside_dir) || { ASIDE_CLAIM_ERROR="$ASIDE_GIT_DIR_ERROR"; return 2; }

  # claim it; a store present means another run holds it
  if ! ASIDE_CLAIM_ERROR=$(mkdir "$store" 2>&1); then
    [[ -d "$store" ]] && return 1
    return 2
  fi

  # fill it; a failure here clears the claim, so no half-built store lingers
  if ! ASIDE_CLAIM_ERROR=$( { mkdir "$store/tree" && : > "$store/paths" && : > "$store/absent" && : > "$store/bases"; } 2>&1 ); then
    rm -rf -- "$store"
    return 2
  fi
}

######################################################################
# claim the store, or render why not and exit
# args: label= (the command tree root), rerun= (the command to rerun)
# .note = a commander: the store ends claimed, or the run ends. a lost
#         race is a ✋ ConstraintError (exit 2); a store that cannot be
#         created is a 💥 MalfunctionError (exit 1)
######################################################################
set_aside_store_claimed() {
  local label rerun status=0
  read_named_args "$@"
  try_aside_store_claim || status=$?
  [[ $status -eq 0 ]] && return 0

  # a concurrent run created the store first
  if [[ $status -eq 1 ]]; then
    emit_both "$(
      print_turtle_header "hold up dude..."
      print_tree_start "$label"
      echo "   └─ ✋ ConstraintError: another run holds paths aside in this worktree"
      print_coconut_hint "let that run finish; or, once it has ended, put its paths back" \
        "rhx git.branch.rebase abort"
    )"
    exit 2
  fi

  # any other failure (permission, full disk) is no claim race: fail loud
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "$label"
    echo "   └─ 💥 MalfunctionError: cannot create the set-aside store"
    echo "      ├─ store: $(get_aside_dir)"
    echo "      └─ error: $ASIDE_CLAIM_ERROR"
    print_coconut_hint "the store lives in this worktree's git dir; once that dir is writable, rerun" \
      "$rerun"
  )"
  exit 1
}

######################################################################
# print the refusal body for a store still held, under the caller's tree root
# args: when_held= (the error when paths are held),
#       when_empty= (the error when the store holds no path: a claim died unfilled)
######################################################################
print_aside_held_refusal() {
  local when_held when_empty held
  read_named_args "$@"
  held=$(get_held_paths)
  if [[ -z "$held" ]]; then
    echo "   └─ ✋ ConstraintError: $when_empty"
    print_coconut_hint "abort clears it, with no rebase in progress too" \
      "rhx git.branch.rebase abort"
    return 0
  fi
  echo "   └─ ✋ ConstraintError: $when_held"
  print_files_tree "      " "$held"
  print_coconut_hint "abort puts them back, with no rebase in progress too" \
    "rhx git.branch.rebase abort"
}

######################################################################
# print a set-aside malfunction (store kept; abort puts back) to both streams
# args: label= (the command tree root), what= (what failed), error= (the cause)
# .note = the caller owns the exit
######################################################################
print_aside_set_failure() {
  local label what error
  read_named_args "$@"
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "$label"
    echo "   └─ 💥 MalfunctionError: $what"
    echo "      ├─ store kept: $(get_aside_dir)"
    echo "      └─ error"
    print_git_output_tree "$error" | sed 's/^/   /'
    print_coconut_hint "each path the store records is whole; abort puts them back" \
      "rhx git.branch.rebase abort"
  )"
}

######################################################################
# set paths aside into the extant store, then reset each from the index
# args: label= (the command tree root), paths= (newline list, repo-root relative)
# .note = a path already held is skipped, and never reset: the held copy
#         is the state the caller asked to keep
# .note = presence is tested with -L || -e, since -e follows a link and
#         reads a link whose target is absent as absent
######################################################################
set_paths_aside() {
  local label paths
  read_named_args "$@"
  local list="$paths"
  local store root path base err
  store=$(get_aside_dir)
  root=$(git rev-parse --show-toplevel)
  local processed=()
  while IFS= read -r path; do
    [[ -z "$path" ]] && continue

    # skip a path already held
    grep -qxF -- "$path" "$store/paths" && continue

    # copy a present path, link as link; a path is recorded only once its copy is whole
    if [[ -L "$root/$path" || -e "$root/$path" ]]; then
      err=$( { mkdir -p "$(dirname "$store/tree/$path")" && cp -a -- "$root/$path" "$store/tree/$path"; } 2>&1 ) \
        || { print_aside_set_failure label="$label" what="cannot set aside $path" error="$err"; exit 1; }
    fi

    # record an absent path (a deletion), so the put-back keeps it absent
    [[ ! -L "$root/$path" && ! -e "$root/$path" ]] && echo "$path" >> "$store/absent"

    # record the HEAD blob, so a put-back can tell if main changed the path
    base=$(git rev-parse -q --verify "HEAD:$path" || echo "none")
    printf '%s\t%s\n' "$base" "$path" >> "$store/bases"
    echo "$path" >> "$store/paths"
    processed+=("$path")
  done <<< "$list"

  # reset only the paths set aside here, from the index (the index is never touched)
  [[ ${#processed[@]} -eq 0 ]] && return 0
  err=$(cd "$root" && git --literal-pathspecs checkout -- "${processed[@]}" 2>&1) \
    || { print_aside_set_failure label="$label" what="cannot reset the paths set aside" error="$err"; exit 1; }
}

######################################################################
# keep one fresh edit in the kept dir, link as link, or render why not and exit 1
# args: label= (the command tree root), root=, kept=, path=
# .note = the latest edit at a path replaces the last; an absent path
#         (a deletion) is kept as absent
######################################################################
set_one_edit_kept() {
  local label root kept path err
  read_named_args "$@"
  err=$( { rm -rf -- "${kept:?}/$path" && mkdir -p "$(dirname "$kept/$path")" && { [[ ! -L "$root/$path" && ! -e "$root/$path" ]] || cp -a -- "$root/$path" "$kept/$path"; }; } 2>&1 ) \
    || { print_aside_set_failure label="$label" what="cannot keep the fresh edit at $path" error="$err"; exit 1; }
}

######################################################################
# does the tree hold, at one path, exactly the held copy?
# args: store=, root=, path=
# returns: 0 if same (link target, bytes, or both absent); 1 otherwise
######################################################################
is_path_same_as_held() {
  local store root path
  read_named_args "$@"
  local now="$root/$path" held="$store/tree/$path"
  if grep -qxF -- "$path" "$store/absent" 2>/dev/null; then
    [[ ! -L "$now" && ! -e "$now" ]]
    return
  fi
  if [[ -L "$held" ]]; then
    [[ -L "$now" && "$(readlink -- "$now")" == "$(readlink -- "$held")" ]]
    return
  fi
  [[ ! -L "$now" && -f "$now" ]] && cmp -s -- "$now" "$held"
}

######################################################################
# keep each held path whose tree state is a fresh edit, before the
# put-back writes the held copy over it
# args: label= (the command tree root)
# sets: ASIDE_PUT_BACK_KEPT (newline list of the paths kept; empty if none)
# .note = a fresh edit differs from the index (or is untracked) and from
#         its held copy; a path that already reads as its held copy (a run
#         that died before its reset) is no edit, and is not kept
######################################################################
set_held_fresh_edits_kept() {
  local label store root kept held fresh path
  read_named_args "$@"
  ASIDE_PUT_BACK_KEPT=""
  store=$(get_aside_dir)
  root=$(git rev-parse --show-toplevel)
  held=$(get_held_paths_left)
  [[ -z "$held" ]] && return 0

  # the held paths whose tree state differs from the index
  local paths=()
  mapfile -t paths <<< "$held"
  fresh=$(cd "$root" && {
    git --literal-pathspecs -c core.quotepath=off diff --name-only -- "${paths[@]}"
    git --literal-pathspecs -c core.quotepath=off ls-files --others -- "${paths[@]}"
  } | grep -xF -f <(echo "$held") | awk 'length && !seen[$0]++' || true)
  [[ -z "$fresh" ]] && return 0

  # keep each that is not already the held copy
  kept=$(get_aside_kept_dir)
  while IFS= read -r path; do
    is_path_same_as_held store="$store" root="$root" path="$path" && continue
    set_one_edit_kept label="$label" root="$root" kept="$kept" path="$path"
    ASIDE_PUT_BACK_KEPT+="${ASIDE_PUT_BACK_KEPT:+$'\n'}$path"
  done <<< "$fresh"
  return 0
}

######################################################################
# reset held paths that hold a fresh unstaged edit; keep each edit first
# args: label= (the command tree root)
# sets: ASIDE_SUPERSEDED (newline list of the paths whose edit was kept; empty if none)
# .note = a global, not stdout: a failure here must render to the caller's
#         stdout, which a command substitution would swallow
# .note = each fresh edit is copied to the kept dir before the reset, so
#         the held copy supersedes it without loss
######################################################################
set_held_drift_reset() {
  local label root held drifted kept path err
  read_named_args "$@"
  ASIDE_SUPERSEDED=""
  root=$(git rev-parse --show-toplevel)
  held=$(get_held_paths)
  [[ -z "$held" ]] && return 0
  drifted=$(get_unstaged_files | grep -xF -f <(echo "$held") || true)
  [[ -z "$drifted" ]] && return 0

  # skip a held path in conflict: its content is resolution work, not drift
  local conflicts
  conflicts=$(get_conflict_files)
  if [[ -n "$conflicts" ]]; then
    drifted=$(echo "$drifted" | grep -vxF -f <(echo "$conflicts") || true)
    [[ -z "$drifted" ]] && return 0
  fi

  # keep each fresh edit, so the reset loses none; a path that reads as its
  # held copy (a regeneration to the same bytes) is no edit, and is not kept
  local store edited=""
  store=$(get_aside_dir)
  kept=$(get_aside_kept_dir)
  while IFS= read -r path; do
    is_path_same_as_held store="$store" root="$root" path="$path" && continue
    set_one_edit_kept label="$label" root="$root" kept="$kept" path="$path"
    edited+="${edited:+$'\n'}$path"
  done <<< "$drifted"

  # reset each to the index, so the held copy wins at put-back
  local paths=()
  mapfile -t paths <<< "$drifted"
  err=$(cd "$root" && git --literal-pathspecs checkout -- "${paths[@]}" 2>&1) \
    || { print_aside_set_failure label="$label" what="cannot reset the fresh edits at held paths" error="$err"; exit 1; }
  ASIDE_SUPERSEDED="$edited"
}

######################################################################
# get unstaged paths that are neither held nor in conflict
# returns: newline-separated list of file paths
######################################################################
get_unstaged_files_not_held() {
  local held conflicts exclude
  held=$(get_held_paths)
  conflicts=$(get_conflict_files)
  exclude=$(printf '%s\n%s\n' "$held" "$conflicts" | grep -v '^$' || true)
  if [[ -z "$exclude" ]]; then
    get_unstaged_files
    return 0
  fi
  get_unstaged_files | grep -vxF -f <(echo "$exclude") || true
}

######################################################################
# set a fresh edit aside mid-rebase: claim the store if none is held,
# supersede fresh edits at held paths, then set the not-held paths aside
# args: label=, rerun= (for a claim refusal), not_held= (newline list)
# sets: ASIDE_SUPERSEDED
# .note = the caller has already refused not_held when --unstaged was absent
######################################################################
set_fresh_edits_aside() {
  local label rerun not_held
  read_named_args "$@"

  # a concurrent run that created the store first wins, and this run refuses
  if [[ -n "$not_held" ]] && ! is_aside_held; then
    set_aside_store_claimed label="$label" rerun="$rerun"
  fi

  # a fresh edit at a held path: the held copy supersedes it
  set_held_drift_reset label="$label"

  # set the paths not held aside
  [[ -n "$not_held" ]] && set_paths_aside label="$label" paths="$not_held"
  return 0
}

######################################################################
# get held paths whose HEAD blob changed since set-aside (main changed them)
# returns: newline-separated list of file paths
######################################################################
get_held_paths_main_changed() {
  local store base path now
  store=$(get_aside_dir)
  [[ -f "$store/bases" ]] || return 0
  while IFS=$'\t' read -r base path; do
    [[ -z "$path" ]] && continue
    now=$(git rev-parse -q --verify "HEAD:$path" || echo "none")
    [[ "$now" != "$base" ]] && echo "$path"
  done < "$store/bases"
  return 0
}

######################################################################
# put one held path back
# args: store=, root=, path=
# returns: 0 on success; 1 on failure, with the error text on stdout
######################################################################
try_one_path_put_back() {
  local store root path err
  read_named_args "$@"

  # clear the path (a dir now in its place fails here, by design)
  if [[ -L "$root/$path" || -e "$root/$path" ]]; then
    err=$(rm -f -- "$root/$path" 2>&1) || { echo "$err"; return 1; }
  fi

  # an absent path stays absent
  grep -qxF -- "$path" "$store/absent" && return 0

  # copy back, link as link
  err=$(mkdir -p "$(dirname "$root/$path")" 2>&1) || { echo "$err"; return 1; }
  err=$(cp -a -- "$store/tree/$path" "$root/$path" 2>&1) || { echo "$err"; return 1; }
}

######################################################################
# put every held path back, then delete the store
# returns: 0 if all put back; 1 if any failed (store kept whole, and
#          each path not put back is written to $store/failed with its error)
# .note = a path put back is recorded in $store/done, so a retry skips it
#         and never reverts an edit made after the failed run
# .note = a store with no paths file was claimed and never filled (the
#         claim died before its first write); it holds no copy, so it is
#         deleted as is
######################################################################
try_held_paths_put_back() {
  local store root path err
  store=$(get_aside_dir)
  root=$(git rev-parse --show-toplevel)

  # a store claimed but never filled holds naught to put back
  if [[ ! -f "$store/paths" ]]; then
    rm -rf -- "$store"
    return 0
  fi

  touch "$store/done"
  : > "$store/failed"
  local failcount=0
  while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    grep -qxF -- "$path" "$store/done" && continue
    if err=$(try_one_path_put_back store="$store" root="$root" path="$path"); then
      echo "$path" >> "$store/done"
      continue
    fi
    printf '%s\t%s\n' "$path" "$(printf '%s' "$err" | tr '\n' ' ')" >> "$store/failed"
    failcount=$((failcount + 1))
  done < "$store/paths"

  # keep the store whole until every path reads back
  [[ $failcount -gt 0 ]] && return 1
  rm -rf -- "$store"
}

######################################################################
# put every held path back, or render why not and exit 1
# args: label= (the command tree root), rebase= (the rebase's state, for
#       the failure render), superseded= (newline list)
# sets: ASIDE_HELD_PATHS (the paths this call put back),
#       ASIDE_MAIN_CHANGED (those main changed since set-aside),
#       ASIDE_SUPERSEDED (superseded= plus each fresh edit kept here)
# .note = both lists are read before the put-back deletes the store, so
#         no caller can read them too late
# .note = a fresh edit at a held path is kept before the held copy goes
#         over it, so no put-back loses an edit, at any of its callers
# .note = no store held is a no-op; the lists are then empty, and
#         ASIDE_SUPERSEDED is superseded= as given
######################################################################
set_held_paths_put_back() {
  local label rebase superseded=""
  read_named_args "$@"
  ASIDE_HELD_PATHS=""
  ASIDE_MAIN_CHANGED=""
  ASIDE_SUPERSEDED="$superseded"
  is_aside_held || return 0
  ASIDE_HELD_PATHS=$(get_held_paths_left)
  ASIDE_MAIN_CHANGED=$(get_held_paths_main_changed)
  set_held_fresh_edits_kept label="$label"
  ASIDE_SUPERSEDED=$(printf '%s\n%s\n' "$superseded" "$ASIDE_PUT_BACK_KEPT" | awk 'length && !seen[$0]++')
  try_held_paths_put_back && return 0
  print_aside_put_back_failure failed="$(get_aside_failed)" store="$(get_aside_dir)" label="$label" rebase="$rebase" superseded="$ASIDE_SUPERSEDED"
  exit 1
}

######################################################################
# print superseded paths as tree items, then where each edit is kept
# args: prefix= (the tree prefix), superseded= (newline list)
######################################################################
print_aside_superseded_items() {
  local prefix superseded path
  read_named_args "$@"
  while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    echo "${prefix}├─ $path"
  done <<< "$superseded"
  echo "${prefix}└─ the latest fresh edit at each path kept in: $(get_aside_kept_dir)"
}

######################################################################
# print the held paths a fresh edit was superseded at, as a tree branch
# args: superseded= (newline list; empty prints naught)
######################################################################
print_aside_superseded() {
  local superseded
  read_named_args "$@"
  [[ -z "$superseded" ]] && return 0
  echo "   ├─ a fresh edit at these held paths was superseded by the held copy"
  print_aside_superseded_items prefix="   │  " superseded="$superseded"
}

######################################################################
# print the paths still held aside mid-rebase, as a tree branch (not last)
# args: superseded= (newline list; nested under the held branch)
# .note = prints naught when no path is held
######################################################################
print_aside_held_branch() {
  local superseded
  read_named_args "$@"
  is_aside_held || return 0
  echo "   ├─ unstaged (set aside)"
  echo "   │  ├─ held aside until continue or abort puts them back"
  print_files_tree "   │  │  " "$(get_held_paths)"
  if [[ -n "$superseded" ]]; then
    echo "   │  ├─ a fresh edit at these held paths was superseded by the held copy"
    print_aside_superseded_items prefix="   │  │  " superseded="$superseded"
  fi
  echo "   │  └─ status: held"
}

######################################################################
# print the next steps after a rebase stop, as a tree branch (not last)
# args: settle_step= (what the human settles first)
# .note = with paths held, abort is a second way out, so continue is not last
######################################################################
print_rebase_next_steps() {
  local settle_step glyph="└─"
  read_named_args "$@"
  is_aside_held && glyph="├─"
  echo "   ├─ next steps"
  echo "   │  ├─ $settle_step"
  echo "   │  $glyph rhx git.branch.rebase continue"
  is_aside_held && echo "   │  └─ rhx git.branch.rebase abort"
  return 0
}

######################################################################
# get the paths a put-back could not write, each with its error
# returns: "<path>\t<error>" lines (empty if none)
######################################################################
get_aside_failed() {
  local store
  store=$(get_aside_dir)
  [[ -f "$store/failed" ]] && cat "$store/failed"
  return 0
}

######################################################################
# print the put-back report as a tree branch (not last)
# args: held=, main_changed=, superseded= (newline lists)
######################################################################
print_aside_report() {
  local held main_changed superseded
  read_named_args "$@"

  echo "   ├─ unstaged (set aside)"
  echo "   │  ├─ set aside, put back"
  print_files_tree "   │  │  " "$held"
  if [[ -n "$superseded" ]]; then
    echo "   │  ├─ a fresh edit at these held paths was superseded by the held copy"
    print_aside_superseded_items prefix="   │  │  " superseded="$superseded"
  fi
  if [[ -n "$main_changed" ]]; then
    echo "   │  ├─ ⚠️ main also changed these paths; your held copy reverts main's change there"
    print_files_tree "   │  │  " "$main_changed"
  fi
  echo "   │  └─ status: all put back"
}

######################################################################
# print the optional next moves after a put-back report
# args: main_changed=, superseded= (newline lists; both empty prints naught)
######################################################################
print_aside_hint() {
  local main_changed superseded kept path
  read_named_args "$@"
  if [[ -n "$superseded" ]]; then
    kept=$(get_aside_kept_dir)
    local diffs=()
    while IFS= read -r path; do
      [[ -z "$path" ]] && continue
      diffs+=("diff $(printf '%q' "$kept/$path") $(printf '%q' "$path")")
    done <<< "$superseded"
    print_coconut_hint "to re-apply a superseded edit, compare the kept edit to the held copy" \
      "${diffs[@]}"
  fi
  [[ -z "$main_changed" ]] && return 0

  # main kept the path: take main's version from HEAD
  local main_kept main_deleted
  main_kept=$(get_paths_at_head paths="$main_changed")
  main_deleted=$(printf '%s\n' "$main_changed" | grep -vxF -f <(printf '%s\n' "$main_kept") || true)
  if [[ -n "$main_kept" ]]; then
    print_coconut_hint "to take main's version of a path main also changed, check it out from HEAD" \
      "git diff -- $(as_shell_words "$main_kept")" \
      "git checkout HEAD -- $(as_shell_words "$main_kept")"
  fi

  # main deleted the path: the put-back left it untracked; take main's deletion
  if [[ -n "$main_deleted" ]]; then
    local removes=()
    while IFS= read -r path; do
      [[ -z "$path" ]] && continue
      removes+=("rhx rmsafe --literal $(printf '%q' "$path")")
    done <<< "$main_deleted"
    print_coconut_hint "main deleted these paths; your held copy is untracked. to take main's deletion, remove it" \
      "${removes[@]}"
  fi
  return 0
}

######################################################################
# get the paths of a list that HEAD holds
# args: paths= (newline list)
# returns: newline-separated subset of paths, in order
######################################################################
get_paths_at_head() {
  local paths path
  read_named_args "$@"
  while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    git rev-parse -q --verify "HEAD:$path" &>/dev/null && echo "$path"
  done <<< "$paths"
  return 0
}

######################################################################
# print the put-back failure (💥 MalfunctionError) to both streams
# args: label= (e.g. "git.branch.rebase begin --mode apply"),
#       failed= ("<path>\t<error>" lines), store= (the store path),
#       rebase= (the rebase's state), superseded=
######################################################################
print_aside_put_back_failure() {
  local label failed store rebase superseded="" path err
  read_named_args "$@"
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "$label"
    echo "   ├─ 💥 MalfunctionError: put-back failed for these paths"
    while IFS=$'\t' read -r path err; do
      [[ -z "$path" ]] && continue
      echo "   │  ├─ $path"
      echo "   │  │  └─ error: $err"
    done <<< "$failed"
    echo "   │  └─ store kept whole: $store"
    print_aside_superseded superseded="$superseded"
    echo "   ├─ rebase: $rebase"
    echo "   └─ status: held paths not put back stay in the store"
    print_coconut_hint "once what blocks each path is cleared, put back what is left; with no rebase in progress, abort only puts paths back" \
      "rhx git.branch.rebase abort"
  )"
}
