#!/usr/bin/env bash
######################################################################
# .what = shared operations for git.branch.cutover begin | continue | abort
#
# .why  = the three verbs share one state machine: a state file, a
#         private park for tracked edits, a pick loop, and a carry.
#         one copy here keeps begin and continue from a drift in how
#         a pick lands, and abort from a drift in how a park restores
#
# usage:
#   source "$SKILL_DIR/git.branch.cutover.operations.sh"
#
# guarantee:
#   - untracked files are never written, moved, or deleted (inv-0)
#   - tracked edits are parked and verified before any reset (inv-10)
#   - the source branch ref is never moved (inv-9)
#   - pure at source time: constants + functions, no top-level command
######################################################################

CUTOVER_SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# .why = the meter gate, the turtle output leaves, and the commit level
#        inference all ride in through the branch meter's operations
source "$CUTOVER_SKILL_DIR/../git.branch.uses/git.branch.uses.operations.sh"

# .why = the trees, refusals, report, and halt render apart from the state machine
source "$CUTOVER_SKILL_DIR/git.branch.cutover.output.sh"

CUTOVER_BOT_NAME="seaturtle[bot]"
CUTOVER_BOT_EMAIL="seaturtle@ehmpath.com"

######################################################################
# state file — one per worktree, inside the worktree's own git dir
######################################################################
get_cutover_dir() {
  echo "$(git rev-parse --absolute-git-dir)/cutover"
}

get_cutover_state_file() {
  echo "$(get_cutover_dir)/state.json"
}

is_cutover_in_flight() {
  [[ -f "$(get_cutover_state_file)" ]]
}

# read one field: get_state '.into'
# .note = an absent path reads as empty, never as the string "null", so a
#         `-n` guard on a read means what it says
get_state() {
  jq -r "($1) | select(. != null)" "$(get_cutover_state_file)"
}

######################################################################
# position facts — the phase literals live here alone, so a misspelled
# literal at a call site cannot fail silent
#
# phases, in order: claim → cut → picks → carry
#   claim = state written, naught moved
#   cut   = the new branch exists; HEAD still on the source
#   picks = HEAD switched to the new branch; the unit is spent
#   carry = picks done; the park is laid back down
######################################################################

# move the cutover to a phase; a literal outside the four refuses loud
set_state_phase() {
  local phase="$1"
  case "$phase" in
    claim | cut | picks | carry) ;;
    *)
      echo "💥 MalfunctionError: set_state_phase got an unknown phase: $phase" >&2
      return 1
      ;;
  esac
  set_state_via_jq '.phase = $p' --arg p "$phase"
}

# has any file or branch moved? (past phase "claim")
is_cutover_past_claim() {
  [[ "$(get_state '.phase')" != "claim" ]]
}

# did the cutover stop before its switch? (phase "claim" or "cut")
is_cutover_before_switch() {
  local phase
  phase=$(get_state '.phase') || return 1
  [[ "$phase" == "claim" || "$phase" == "cut" ]]
}

# are the picks done and the park laid back down? (phase "carry")
is_cutover_in_carry() {
  [[ "$(get_state '.phase')" == "carry" ]]
}

# may continue run, past an abort guard? not before the switch unless a
# halt stands. continue's guard and begin's in-flight steer both read this
# one leaf, so begin never names a verb continue refuses
# .note = an abort cut short is refused first, by each caller, with its own
#         message: is_cutover_abort_begun
is_continue_legal() {
  [[ -n "$(get_state '.halt')" ]] && return 0
  ! is_cutover_before_switch
}

# is this a cutover with an empty carry? cut from a base other than this tree, no pick
# landed, no tracked edit rode along: the new branch is the base itself
is_cutover_empty_carry() {
  [[ "$(get_state '.base_kind')" != "@tree" ]] \
    && [[ "$(get_state '[.picks[] | select(.status == "landed")] | length')" -eq 0 ]] \
    && [[ "$(get_state '.tracked | length')" -eq 0 ]]
}

# is the cutover unit spent? begin spends it once the switch lands
is_unit_spent() {
  local phase
  phase=$(get_state '.phase') || return 1
  [[ "$phase" == "picks" || "$phase" == "carry" ]]
}

######################################################################
# .what = refuse a state written under another schema
#
# .why  = a halt can outlive a role upgrade by days. a field the new code
#         reads but the old state lacks comes back empty, and a verb that
#         acts on an absent fact acts on a lie. so the shape is versioned,
#         and a mismatch stops loud before any read acts on it
######################################################################
CUTOVER_STATE_SCHEMA=3

guard_state_schema() {
  local schema
  schema=$(get_state '.schema // "absent"')
  [[ "$schema" == "$CUTOVER_STATE_SCHEMA" ]] && return 0
  emit_cutover_malfunction "the cutover state was written under another schema" "$(printf '%s\n' \
    "state: $(get_cutover_state_file)" \
    "schema: $schema (this role reads $CUTOVER_STATE_SCHEMA)" \
    "fix: finish or undo it by hand (git status, git reflog), then remove $(get_cutover_dir)" | as_tree_children)"
}

######################################################################
# .what = write the first state, only if no state exists; else return 1
#
# .why  = inv-6: one cutover per worktree. the in-flight check at the top
#         of begin is a read; two begins could both pass it. this write is
#         the claim: a hard link onto the state path fails when the path
#         exists, so of two racers exactly one claims, and the claimed file
#         is whole the instant it appears (written to a temp first)
######################################################################
set_state_json_exclusive() {
  local json="$1"
  local dir file temp
  dir=$(get_cutover_dir)
  file=$(get_cutover_state_file)
  temp="$file.tmp.$$"
  mkdir -p "$dir"
  printf '%s\n' "$json" > "$temp"
  local ln_error
  if ! ln_error=$(ln "$temp" "$file" 2>&1); then
    rm -f "$temp"

    # a state that now exists is a peer's claim; no state at all is a
    # failure of the write itself (no hard links, no space, no access)
    if [[ ! -e "$file" ]]; then
      emit_cutover_malfunction "the cutover state could not be written; naught changed" "$(printf '%s\n' \
        "state: $file" \
        "detail: $(as_git_error_detail "$ln_error")" \
        "fix: read the detail, clear its cause, then rerun" | as_tree_children)"
    fi
    return 1
  fi
  rm -f "$temp"
}

######################################################################
# worktree lock — one live cutover verb per worktree, at a time
#
# .why  = inv-6: the state claim stops a second cutover, but begin, continue,
#         and abort all read the state, then mutate it and the worktree. two
#         live verbs (a continue beside an abort, or an abort beside a begin
#         mid-pick) would interleave those writes. each verb holds this lock
#         for its whole run, so the read and the writes it drives are one act
#
# .note = the lock sits beside the cutover dir, not in it: del_state removes
#         the dir, and the lock must outlive that until the process exits
######################################################################
get_cutover_lock_file() {
  echo "$(git rev-parse --absolute-git-dir)/cutover.lock"
}

# the pid that holds the lock, or "" when none
get_cutover_lock_holder() {
  get_pid_lock_holder "$(get_cutover_lock_file)"
}

######################################################################
# .what = take this worktree's cutover lock for the life of this process;
#         return 1 when a live peer holds it
#
# .note = the pid lock (`set_pid_lock`) reclaims a dead holder's lock. this
#         lock registers its own exit release, as the meter lock does
######################################################################
set_cutover_lock() {
  local rc=0
  set_pid_lock "$(get_cutover_lock_file)" || rc=$?
  [[ "$rc" -eq 0 ]] || return "$rc"
  add_pid_lock_exit_release del_cutover_lock
}

# release the lock, only if this process holds it
del_cutover_lock() {
  del_pid_lock "$(get_cutover_lock_file)"
}

######################################################################
# .what = take the lock, or refuse: a peer verb runs in this worktree now
######################################################################
guard_cutover_lock() {
  local rc=0
  set_cutover_lock || rc=$?
  [[ "$rc" -ne 0 ]] || return 0

  # the lock file cannot be made at all: a fault, never a peer
  if [[ "$rc" -eq 3 ]]; then
    emit_cutover_malfunction "the cutover lock file could not be made; naught changed" "$(printf '%s\n' \
      "lock: $(get_cutover_lock_file)" \
      "detail: $(as_git_error_detail "${PID_LOCK_ERROR:-}")" \
      "fix: read the detail, clear its cause, then rerun" | as_tree_children)"
  fi
  emit_cutover_refusal "another cutover verb runs in this worktree right now" "$(printf '%s\n' \
    "held by: pid $(get_cutover_lock_holder)" \
    "lock: $(get_cutover_lock_file)" \
    "fix: let it finish, then rerun; if no cutover verb runs, remove the lock file above" | as_tree_children)"
}

# set state fields via a jq filter: set_state_via_jq '.phase = $p' --arg p picks
set_state_via_jq() {
  local filter="$1"
  shift
  local file
  file=$(get_cutover_state_file)
  # the move rides on jq: a failed filter must never replace the state
  jq "$@" "$filter" "$file" > "$file.tmp.$$" && mv -f "$file.tmp.$$" "$file" \
    || { rm -f "$file.tmp.$$"; return 1; }
}

del_state() {
  rm -rf "$(get_cutover_dir)"
}

######################################################################
# state leaves — every write to the state goes through a named leaf
# below; a test pins that no set_state_via_jq sits outside a set_state_*
# leaf, so a transition is written in one place and can't half-land
######################################################################

# move the pick cursor: set_state_pick_index 3
set_state_pick_index() {
  set_state_via_jq '.pick_index = ($i | tonumber)' --arg i "$1"
}

# move the pick cursor and clear every halt field in one write, so no kill
# can leave a cursor past a halt it never cleared
set_state_resume_at_pick() {
  set_state_via_jq '.pick_index = ($i | tonumber) | .halt = "" | .halt_snapshot = "" | .conflicts = []' --arg i "$1"
}

# is the cursor at or past the pick count? every pick before it is settled,
# so a resume there owes the carry alone, never a pick
is_pick_cursor_past_last() {
  [[ "$1" -ge "$(get_state '.picks | length')" ]]
}

# refuse a pick write past the last pick: jq would grow the array
guard_pick_index_in_range() {
  [[ "$1" =~ ^[0-9]+$ ]] && ! is_pick_cursor_past_last "$1" && return 0
  echo "💥 MalfunctionError: a pick write got a cursor past the last pick: ${1:-<none>}" >&2
  return 1
}

# note where a pick begins, so a resume can tell landed from empty
set_state_pick_began() {
  guard_pick_index_in_range "$1" || return 1
  set_state_via_jq '.picks[($i | tonumber)].head_before = $h' --arg i "$1" --arg h "$2"
}

# a pick landed as a new commit: set_state_pick_landed <index> <new sha>
set_state_pick_landed() {
  guard_pick_index_in_range "$1" || return 1
  set_state_via_jq '.picks[($i | tonumber)] |= (.status = "landed" | .new = $n)' --arg i "$1" --arg n "$2"
}

# a pick dropped, with its reason: set_state_pick_dropped <index> <reason>
set_state_pick_dropped() {
  guard_pick_index_in_range "$1" || return 1
  set_state_via_jq '.picks[($i | tonumber)] |= (.status = "dropped" | .reason = $r)' --arg i "$1" --arg r "$2"
}

# begin's reset is underway; written just before it
set_state_reset_begun() {
  set_state_via_jq '.reset_begun = true'
}

# an abort is underway; a rerun of abort finishes it
set_state_abort_begun() {
  set_state_via_jq '.abort_begun = true'
}

# the tracked edits begin will park, as display lines
set_state_tracked() {
  set_state_lines_via_jq tracked "$1"
}

# add NUL-framed names to .unstaged, exact, deduped
set_state_unstaged_add_from_nul() {
  set_state_via_jq '.unstaged = ((.unstaged // []) + $v[0] | unique)' \
    --slurpfile v <(as_json_array_from_nul)
}

# one state path list, NUL-framed, the exact names
get_state_paths_nul() {
  jq -j "(.$1 // [])[] | ., \"\\u0000\"" "$(get_cutover_state_file)"
}

# did this pick's replay begin? (its start HEAD is recorded before the replay)
has_pick_begun() {
  [[ -n "$(get_state ".picks[$1].head_before")" ]]
}

######################################################################
# .what = the first state of a cutover, as json
#
# .why  = begin records every fact abort and continue need before its
#         first mutation; one named shape, so the orchestrator reads as
#         "claim the state", not as a jq program
#
# usage: as_cutover_state_json into=<b> source_name=<b> source_sha=<sha> \
#          base_kind=<k> base_label=<l> base_sha=<sha> \
#          tracked=<lines> untracked=<lines> left_behind=<lines> -- <pick sha>...
######################################################################
as_cutover_state_json() {
  local into="" source_name="" source_sha="" base_kind="" base_label="" base_sha=""
  local tracked="" untracked="" left_behind=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      into=*) into="${1#*=}" ;;
      source_name=*) source_name="${1#*=}" ;;
      source_sha=*) source_sha="${1#*=}" ;;
      base_kind=*) base_kind="${1#*=}" ;;
      base_label=*) base_label="${1#*=}" ;;
      base_sha=*) base_sha="${1#*=}" ;;
      tracked=*) tracked="${1#*=}" ;;
      untracked=*) untracked="${1#*=}" ;;
      left_behind=*) left_behind="${1#*=}" ;;
      --)
        shift
        break
        ;;
    esac
    shift
  done
  # the lists ride a file descriptor, never argv: one argv entry caps at
  # 128 KiB, and a large tree's path list passes that
  jq -n \
    --arg into "$into" \
    --arg source_name "$source_name" \
    --arg source_sha "$source_sha" \
    --arg base_kind "$base_kind" \
    --arg base_label "$base_label" \
    --arg base_sha "$base_sha" \
    --slurpfile picks <(as_picks_state_json "$@") \
    --slurpfile tracked <(printf '%s\n' "$tracked" | as_json_array) \
    --slurpfile untracked <(printf '%s\n' "$untracked" | as_json_array) \
    --slurpfile left_behind <(printf '%s\n' "$left_behind" | as_json_array) \
    --argjson schema "$CUTOVER_STATE_SCHEMA" \
    '{
      schema: $schema,
      into: $into, source_name: $source_name, source_sha: $source_sha, base_kind: $base_kind,
      base_label: $base_label, base_sha: $base_sha,
      phase: "claim", halt: "", halt_snapshot: "", pick_index: 0, picks: $picks[0],
      tracked: $tracked[0], untracked: $untracked[0], left_behind: $left_behind[0],
      carry: "", conflicts: [], abort_begun: false, rescue_refs: [], reset_begun: false,
      unstaged: []
    }'
}

# set one state field to a list of lines, as a json array, off argv:
# set_state_lines_via_jq <field> <lines>
set_state_lines_via_jq() {
  local field="$1" lines="$2"
  set_state_via_jq ".$field = \$v[0]" --slurpfile v <(printf '%s\n' "$lines" | as_json_array)
}

# pick shas → the queued picks array; head_before is set as each replays
as_picks_state_json() {
  printf '%s\n' "$@" | as_json_array \
    | jq 'map({ sha: ., status: "queued", new: "", reason: "", head_before: "" })'
}

######################################################################
# park refs — private, outside refs/heads, so no branch can collide
#
# .why  = refs/worktree/* is per worktree in git, as the state file is. a
#         repo-wide namespace would let a begin in a peer worktree, into the
#         same name, overwrite or delete this worktree's park
#
# .note = one cutover per worktree, so one fixed slot suffices. a slot
#         keyed by the branch name would let an orphan under `a` block a
#         later park under `a/tree` (a ref path cannot be file and dir)
######################################################################
get_park_ref() {
  echo "refs/worktree/cutover/tree"
}

get_park_index_ref() {
  echo "refs/worktree/cutover/index"
}

has_park() {
  git rev-parse -q --verify "$(get_park_ref)" > /dev/null
}

######################################################################
# .what = does the state say tracked edits were parked?
#
# .why  = the state is the record; the park ref is only the copy. a park
#         that the state expects but git lacks is a loss, never "naught to
#         carry". in phase "claim" the reset has not run, so no park is owed
#         yet; under @tree no file moves, so no park is ever made
######################################################################
is_park_expected() {
  is_cutover_past_claim \
    && [[ "$(get_state '.base_kind')" != "@tree" ]] \
    && [[ "$(get_state '.tracked | length')" -gt 0 ]]
}

# drop both park refs; a ref already absent is a no-op
# .note = each delete returns on fail: under `||` errexit is off, and a
#         later step's success must not hide an earlier failure
del_park_refs() {
  if git rev-parse -q --verify "$(get_park_ref)" > /dev/null; then
    git update-ref -d "$(get_park_ref)" || return 1
  fi
  if git rev-parse -q --verify "$(get_park_index_ref)" > /dev/null; then
    git update-ref -d "$(get_park_index_ref)" || return 1
  fi
  return 0
}

######################################################################
# .what = a temp index at <path> that holds every tracked file as the
#         worktree has it now, staged adds included
#
# .why  = the park and the rescue each read the worktree through one
#         index; a reader blind to some edit lets a reset erase it. one
#         leaf, so both see the same set:
#         - a copy of the real index, so a file staged new stays in
#         - no assume-unchanged flag, so `add -u` reads a hidden edit
#         - no skip-worktree flag on a path present on disk; a path absent
#           (a sparse checkout) keeps its flag and reads as no change
#         - `add -u` stages each tracked file and settles a conflict entry
#           to what the worktree holds, so write-tree accepts the index
#
# .note = the flags clear in one batch per kind, never one fork per path
# .note = each step returns on fail: a caller in $(...) runs with errexit off
######################################################################
gen_snapshot_index() {
  local index_temp="$1" entry tag path
  local -a hidden=() unsparse=()
  rm -f "$index_temp"
  cp "$(git rev-parse --git-path index)" "$index_temp" || return 1
  while IFS= read -r -d '' entry; do
    tag="${entry:0:1}"
    path="${entry:2}"
    if [[ "$tag" =~ [a-z] ]]; then
      hidden+=("$path")
    fi
    if [[ "$tag" == "S" || "$tag" == "s" ]] && [[ -e "$path" ]]; then
      unsparse+=("$path")
    fi
  done < <(get_flagged_index_entries)
  if [[ ${#hidden[@]} -gt 0 ]]; then
    printf '%s\0' "${hidden[@]}" \
      | GIT_INDEX_FILE="$index_temp" git update-index -z --no-assume-unchanged --stdin || return 1
  fi
  if [[ ${#unsparse[@]} -gt 0 ]]; then
    printf '%s\0' "${unsparse[@]}" \
      | GIT_INDEX_FILE="$index_temp" git update-index -z --no-skip-worktree --stdin || return 1
  fi
  GIT_INDEX_FILE="$index_temp" git -c core.fsmonitor=false add -u -- . || return 1
}

# the tree a snapshot of the live worktree holds (gen_snapshot_index); return 1 on fail
# .note = the temp index sits in the cutover dir, so del_state sweeps a kill's leftover
get_worktree_snapshot_tree() {
  local index tree
  mkdir -p "$(get_cutover_dir)" || return 1
  index="$(get_cutover_dir)/snapshot.index"
  gen_snapshot_index "$index" || { rm -f "$index"; return 1; }
  tree=$(GIT_INDEX_FILE="$index" git write-tree) || { rm -f "$index"; return 1; }
  rm -f "$index"
  [[ -n "$tree" ]] || return 1
  echo "$tree"
}

######################################################################
# .what = record a halt: its kind, its snapshot, its conflicts, and the
#         pick's status, in one write
#
# .why  = the halt is three facts that hold together. the snapshot and
#         the conflicts are computed first, then one write lands them all,
#         so no kill can leave a halt with no snapshot or no conflicts.
#         at a halt the worktree holds the cutover's own replay; abort
#         rescues only a worktree that has moved since, so a rescue ref
#         means a human edit, never noise
#
# usage: set_state_halted kind=<pick-conflict|carry-conflict> [index=<n>]
######################################################################
set_state_halted() {
  local kind="" index="" arg tree
  for arg in "$@"; do
    case "$arg" in
      kind=*) kind="${arg#kind=}" ;;
      index=*) index="${arg#index=}" ;;
    esac
  done
  case "$kind" in
    pick-conflict) guard_pick_index_in_range "$index" || return 1 ;;
    carry-conflict) index="" ;;
    *)
      echo "💥 MalfunctionError: set_state_halted got an unknown kind: $kind" >&2
      return 1
      ;;
  esac
  tree=$(get_worktree_snapshot_tree) || return 1
  set_state_via_jq '
    .halt = $k | .halt_snapshot = $t | .conflicts = $c[0]
    | if $i == "" then . else .picks[($i | tonumber)] |= (.status = "conflict" | .replayed = $r[0]) end' \
    --arg k "$kind" --arg t "$tree" --arg i "$index" \
    --slurpfile c <(get_conflict_paths_nul | as_json_array_from_nul) \
    --slurpfile r <(get_replayed_paths_nul | as_json_array_from_nul)
}

######################################################################
# .what = record the paths a clean replay staged for the pick
#
# .why  = the merge can stage paths outside the pick's own diff (a change
#         that follows a base rename, a directory rename). right after the
#         replay the index holds the cutover's work alone, so this is the
#         one moment the pick's true file set can be read
#
# usage: set_state_pick_replayed <index>
######################################################################
set_state_pick_replayed() {
  guard_pick_index_in_range "$1" || return 1
  set_state_via_jq '.picks[($i | tonumber)].replayed = $r[0]' --arg i "$1" \
    --slurpfile r <(get_replayed_paths_nul | as_json_array_from_nul)
}

# the paths the index holds beyond HEAD (unmerged ones included), NUL-framed
get_replayed_paths_nul() {
  get_git_paths_nul diff --cached --name-only HEAD
}

# clear every halt field in one write
set_state_halt_cleared() {
  set_state_via_jq '.halt = "" | .halt_snapshot = "" | .conflicts = []'
}

# mark the carry landed and clear the halt, in one write
set_state_carry_landed() {
  set_state_via_jq '.carry = "landed" | .halt = "" | .halt_snapshot = "" | .conflicts = []'
}

######################################################################
# .what = is a rescue owed for this snapshot? (a transformer on trees)
#
# .why  = no rescue when the worktree matches HEAD, or matches the snapshot
#         the last halt left: naught a human made would be lost
#
# usage: is_rescue_owed snapshot=<tree> head=<tree> halt=<tree or empty>
######################################################################
is_rescue_owed() {
  local snapshot="" head="" halt=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      snapshot=*) snapshot="${1#*=}" ;;
      head=*) head="${1#*=}" ;;
      halt=*) halt="${1#*=}" ;;
    esac
    shift
  done
  [[ "$snapshot" != "$head" && "$snapshot" != "$halt" ]]
}

######################################################################
# .what = find or create the rescue ref that holds <tree>; echo the ref
#
# .why  = the ref is named by the tree it holds: a rerun over the same
#         worktree finds its rescue and writes no twin
#
# .note = the name keeps the raw tree sha: it is the snapshot's identity,
#         and a sha is what `git show <ref>` and for-each-ref print
# .note = the read-back must name the very commit: a failed write must
#         stop abort before its reset
######################################################################
gen_rescue_ref() {
  local tree="$1" commit ref
  ref="refs/cutover/rescue/$tree"
  if [[ "$(git rev-parse -q --verify "$ref^{tree}" || true)" != "$tree" ]]; then
    commit=$(GIT_AUTHOR_NAME="$CUTOVER_BOT_NAME" GIT_AUTHOR_EMAIL="$CUTOVER_BOT_EMAIL" \
      git commit-tree --no-gpg-sign "$tree" -p HEAD -m "cutover rescue: the worktree before abort's reset") || return 1
    [[ -n "$commit" ]] || return 1
    git update-ref "$ref" "$commit" || return 1
    [[ "$(git rev-parse -q --verify "$ref" || true)" == "$commit" ]] || return 1
  fi
  echo "$ref"
}

# add one rescue ref to .rescue_refs, once: set_state_rescue_ref <ref>
set_state_rescue_ref() {
  set_state_via_jq '.rescue_refs = (.rescue_refs + [$r] | unique)' --arg r "$1"
}

######################################################################
# .what = save the live worktree's tracked files to a rescue ref, and
#         add the ref to the state's .rescue_refs
#
# .why  = abort's reset erases each tracked edit the park does not hold:
#         one saved mid-halt, a file staged new, a half-settled conflict
#         the rescue keeps a copy outside del_park_refs, so the undo stays
#         the way out and loses naught
#
# .note = the refs live in the state, never in a shell variable: an abort
#         killed after its reset reruns over a clean tree, and only the
#         state still knows where the edits went
# .note = a list, never one slot: a second abort over a fresh edit must not
#         erase the name of the first rescue
# .note = untracked files are never reset, so they stay out
######################################################################
gen_worktree_rescue() {
  local tree head halt ref
  tree=$(get_worktree_snapshot_tree) || return 1
  head=$(git rev-parse 'HEAD^{tree}') || return 1
  halt=$(get_state '.halt_snapshot') || return 1
  is_rescue_owed snapshot="$tree" head="$head" halt="$halt" || return 0
  ref=$(gen_rescue_ref "$tree") || return 1
  set_state_rescue_ref "$ref"
}

######################################################################
# git communicators — each names one git act, so the verbs read as prose
#
# .why  = the orchestrators compose these; the raw git verb and its flags
#         live here alone
######################################################################

# is the cwd inside a git repo?
is_in_git_repo() {
  git rev-parse --git-dir > /dev/null 2>&1
}

# does git accept this as a branch name?
is_valid_branch_name() {
  git check-ref-format --branch "$1" > /dev/null 2>&1
}

# the sha HEAD points at; return 1 when the repo has no commit
get_head_sha() {
  git rev-parse -q --verify HEAD
}

# the branch HEAD names; return 1 when HEAD is detached
get_head_branch() {
  git symbolic-ref -q --short HEAD
}

has_origin_remote() {
  git remote get-url origin > /dev/null 2>&1
}

# every head on origin, as `sha<TAB>refs/heads/<name>` lines (stderr on fail)
get_origin_heads() {
  git ls-remote --heads origin 2>&1
}

# refresh origin/<branch> from origin (its output on fail)
set_origin_branch_fetched() {
  git fetch -q origin "+refs/heads/$1:refs/remotes/origin/$1" 2>&1
}

# the sha of the local copy of origin/<branch>
get_origin_branch_sha() {
  git rev-parse "refs/remotes/origin/$1"
}

# the sha of a local branch, or "" when absent
get_local_branch_sha() {
  if git show-ref -q --verify "refs/heads/$1"; then
    git rev-parse "refs/heads/$1"
  fi
}

# the commit a name resolves to; return 1 when this repo holds none
get_commit_sha() {
  git rev-parse -q --verify "$1^{commit}"
}

# make <into> at <base>, with no upstream (its output on fail)
set_branch_cut() {
  git branch -q --no-track "$1" "$2" 2>&1 && del_branch_upstream_config "$1"
}

# make <into> at HEAD, with no upstream, and check it out (its output on fail)
set_branch_cut_here() {
  git checkout -q --no-track -b "$1" 2>&1 && del_branch_upstream_config "$1"
}

######################################################################
# .what = drop a branch's upstream config: branch.<name>.remote and .merge
#
# .why  = `--no-track` sets no upstream, but it leaves a stale
#         [branch "<name>"] section from a branch of that name deleted
#         earlier. git reads that section as the upstream, so a plain push
#         under push.default=upstream would aim at whatever it names
#
# .note = an absent key is exit 5 from git config, and is no fault
######################################################################
del_branch_upstream_config() {
  local key rc
  for key in remote merge; do
    rc=0
    git config --unset-all "branch.$1.$key" 2>&1 || rc=$?
    [[ "$rc" -eq 0 || "$rc" -eq 5 ]] || return "$rc"
  done
}

# does <branch> resolve an upstream? has_branch_upstream <branch>
has_branch_upstream() {
  git rev-parse --abbrev-ref --symbolic-full-name "$1@{upstream}" > /dev/null 2>&1
}

# check out a branch by name (its output on fail)
# .note = a post-checkout hook's failure is the checkout's exit code, though
#         the switch already ran: HEAD on <branch> means the switch stands
set_head_branch() {
  local out rc=0
  out=$(git checkout -q "$1" 2>&1) || rc=$?
  [[ "$rc" -eq 0 ]] && return 0
  [[ "$(get_head_branch || true)" == "$1" ]] && return 0
  printf '%s\n' "$out"
  return "$rc"
}

# the path of a peer worktree that has <branch> checked out, or naught
get_branch_peer_worktree() {
  local branch="$1" here line path=""
  here=$(git rev-parse --show-toplevel) || return 1
  while IFS= read -r line; do
    [[ "$line" == "worktree "* ]] && path="${line#worktree }"
    if [[ "$line" == "branch refs/heads/$branch" && "$path" != "$here" ]]; then
      echo "$path"
      return 0
    fi
  done < <(git worktree list --porcelain)
}

# check out a sha, detached
set_head_detached() {
  git checkout -q --detach "$1"
}

# remove a local branch; a branch already absent is no-op
del_local_branch() {
  if git show-ref -q --verify "refs/heads/$1"; then
    git branch -q -D "$1"
  fi
}

# discard tracked edits in the worktree and index; untracked files stay
del_worktree_tracked_edits() {
  git reset -q --hard
}

# lay a commit's change into the index and worktree, no commit (its output on fail)
set_index_from_pick() {
  git cherry-pick --no-commit "$1" 2>&1
}

# does the index hold no change beside HEAD?
is_index_clean() {
  git diff --cached --quiet HEAD
}

# commit the index with a pick's own message and author
# .note = never signed: the replay is the bot's commit, and the bot holds no
#         key of the human's. a human's commit.gpgsign would fail every pick
set_commit_from_pick() {
  git commit -q --no-verify --no-gpg-sign -C "$1"
}

######################################################################
# .what = the git operation in flight in this worktree, if any
#
# .why  = inv-6: one git operation per worktree. a cutover over a halted
#         rebase or merge would tangle two settle flows in one index
#
# usage: op=$(get_foreign_op_in_flight)   # rebase|merge|cherry-pick|revert|bisect|""
######################################################################
get_foreign_op_in_flight() {
  local git_dir
  git_dir=$(git rev-parse --absolute-git-dir)
  if [[ -d "$git_dir/rebase-merge" || -d "$git_dir/rebase-apply" ]]; then
    echo "rebase"
    return 0
  fi
  if [[ -f "$git_dir/MERGE_HEAD" ]]; then
    echo "merge"
    return 0
  fi
  if [[ -f "$git_dir/CHERRY_PICK_HEAD" || -d "$git_dir/sequencer" ]]; then
    echo "cherry-pick"
    return 0
  fi
  if [[ -f "$git_dir/REVERT_HEAD" ]]; then
    echo "revert"
    return 0
  fi
  if [[ -f "$git_dir/BISECT_LOG" ]]; then
    echo "bisect"
    return 0
  fi
  echo ""
}

######################################################################
# .what = the settle commands for a foreign op, as glyph-ready lines
#
# .why  = a refusal names its fix; a rebase gets the paved rhx verbs,
#         every other op its own git settle pair
######################################################################
get_foreign_op_settle_lines() {
  local op="$1"
  if [[ "$op" == "rebase" ]]; then
    printf '%s\n' "rhx git.branch.rebase continue" "rhx git.branch.rebase abort"
    return 0
  fi
  # a bisect has no continue or abort; reset is its one settle verb
  if [[ "$op" == "bisect" ]]; then
    printf '%s\n' "git bisect reset"
    return 0
  fi
  printf '%s\n' "git $op --continue" "git $op --abort"
}

######################################################################
# .what = refuse a continue or abort with no cutover in flight, and name
#         the settle verbs of the op that IS in flight, if any
#
# .why  = a mechanic mid-halt reaches for the wrong verb; the refusal
#         points at the one that owns the halt
#
# usage: emit_no_cutover_refusal <verb>    # continue|abort
######################################################################
emit_no_cutover_refusal() {
  local verb="$1"
  local op
  op=$(get_foreign_op_in_flight)
  if [[ -n "$op" ]]; then
    emit_cutover_refusal "no cutover is in flight to $verb; a $op is in flight instead" "$(
      echo "└─ fix: settle the $op with its own verb"
      get_foreign_op_settle_lines "$op" | as_tree_children | sed 's/^/   /'
    )"
  fi
  # an abort after a finished cutover wants an undo, not a second cutover
  if [[ "$verb" == "abort" ]]; then
    emit_cutover_refusal "no cutover is in flight to abort" "$(printf '%s\n' \
      "no cutover state remains: it finished, or an abort already ran" \
      "a finished cutover left its source branch untouched; to go back, switch to it" \
      "to start one: rhx git.branch.cutover begin --from @main --into <branch>" | as_tree_children)"
  fi
  emit_cutover_refusal "no cutover is in flight to $verb" \
    "└─ start one: rhx git.branch.cutover begin --from @main --into <branch>"
}

######################################################################
# .what = clear the sequencer marks a no-commit pick may leave
#
# .why  = a landed or dropped pick must leave no CHERRY_PICK_HEAD, or
#         peer skills read a raw cherry-pick in flight
######################################################################
del_pick_marks() {
  local git_dir
  git_dir=$(git rev-parse --absolute-git-dir)
  if [[ -f "$git_dir/CHERRY_PICK_HEAD" || -d "$git_dir/sequencer" ]]; then
    git cherry-pick --quit
  fi
}

######################################################################
# .what = tracked edits as one line each: "M path", "A path", "D path"
#
# .why  = the staged and unstaged split collapses to one letter; the
#         carry lands every file unstaged, and the report says so
######################################################################
get_tracked_edit_lines() {
  local line x y code
  while IFS= read -r -d '' line; do
    [[ -z "$line" ]] && continue
    x="${line:0:1}"
    y="${line:1:1}"
    code="$x"
    if [[ "$code" == " " ]]; then
      code="$y"
    fi
    printf '%s %s\0' "$code" "${line:3}"
  done < <(get_git_paths_nul status --porcelain=v1 --untracked-files=no) | as_display_lines_from_nul
}

######################################################################
# .what = edits git status cannot see, one line each: "h path" for an
#         assume-unchanged path, "S path" for a skip-worktree path
#
# .why  = status and diff skip a flagged path, so `.tracked` (read from
#         status) never lists its edit, and begin refuses it rather
#         than carry an edit the report would not name. the park itself
#         sees it (gen_snapshot_index clears the flags). a flagged path
#         with no edit, or absent from disk (a sparse checkout), is left
#         alone: the reset keeps it as is
######################################################################
get_hidden_edit_lines() {
  local entry tag path
  while IFS= read -r -d '' entry; do
    tag="${entry:0:1}"
    path="${entry:2}"
    [[ "$tag" =~ ^[a-z]$ || "$tag" == "S" ]] || continue
    [[ -f "$path" ]] || continue
    [[ "$(git hash-object -- "$path")" == "$(git rev-parse ":$path" 2> /dev/null)" ]] && continue
    [[ "$tag" == "S" ]] || tag="h"
    printf '%s %s\0' "$tag" "$path"
  done < <(get_flagged_index_entries) | as_display_lines_from_nul
}

# the index entries that carry an assume-unchanged (lowercase tag) or a
# skip-worktree (S) flag, NUL-separated; grep filters, so the bash loops
# that read them walk the few flagged entries, never every tracked file
get_flagged_index_entries() {
  get_git_paths_nul ls-files -v | { grep -z -E '^[a-zS] ' || true; }
}

# the untracked files, as display lines
get_untracked_files() {
  get_git_paths_nul ls-files --others --exclude-standard | as_display_lines_from_nul
}

######################################################################
# .what = one path list from git, NUL-framed end to end
#
# .why  = a newline-framed read quotes a name that holds a quote, a
#         backslash, or a control byte, and splits a rename into two
#         names; the quoted form matches no path. every path read in the
#         cutover runs through this leaf, so no reader can forget a flag
#
# usage: get_git_paths_nul <diff|diff-tree|status|ls-files> [args...]
#
# .note = --no-renames goes ahead of the caller's args, so a caller that
#         reads renames on purpose (-M) still can
# .note = --literal-pathspecs: a path arg is a name, never a glob
######################################################################
get_git_paths_nul() {
  local verb="$1"
  shift
  case "$verb" in
    diff | diff-tree | status) git --literal-pathspecs "$verb" -z --no-renames "$@" ;;
    ls-files) git --literal-pathspecs ls-files -z "$@" ;;
    *)
      echo "💥 MalfunctionError: get_git_paths_nul got an unknown verb: $verb" >&2
      return 1
      ;;
  esac
}

# one name → its display form; a newline or tab shows as an escape
as_display_name() {
  local name="${1//$'\n'/\\n}"
  printf '%s' "${name//$'\t'/\\t}"
}

# NUL-framed names → display lines; a control byte in a name shows as an
# escape (\n, \t), so one name is always one line and one count
as_display_lines_from_nul() {
  jq -Rrs 'split("\u0000") | map(select(length > 0)) | .[] | gsub("\n"; "\\n") | gsub("\t"; "\\t")'
}

# NUL-framed names → a json array of the exact names
as_json_array_from_nul() {
  jq -Rs 'split("\u0000") | map(select(length > 0))'
}

######################################################################
# .what = lines → a json array of strings
######################################################################
as_json_array() {
  jq -R . | jq -s 'map(select(length > 0))'
}

get_short_sha() {
  git rev-parse --short=7 "$1"
}

# a full sha as text → its 7-char form; for a sha this repo may not hold
as_short_sha() {
  echo "${1:0:7}"
}

get_commit_subject() {
  git log -1 --format=%s "$1"
}

# a merge commit has a second parent
is_merge_commit() {
  git rev-parse -q --verify "$1^2" > /dev/null
}

######################################################################
# .what = git's output → the one line that names the cause
#
# .why  = git ends a failure with advice ("remove the file manually to
#         continue."), so its last line hides the cause. the first error:
#         or fatal: line names it; paths inside the repo read relative
######################################################################
as_git_error_detail() {
  local out="$1"
  local line root
  line=$(printf '%s\n' "$out" | grep -m 1 -E '^(fatal|error):' || true)
  if [[ -z "$line" ]]; then
    line=$(printf '%s\n' "$out" | tail -1)
  fi
  root=$(git rev-parse --show-toplevel 2> /dev/null || true)
  if [[ -n "$root" ]]; then
    line="${line//"$root/"/}"
  fi
  echo "$line"
}

# the count of non-empty lines in a block
get_line_count() {
  printf '%s\n' "$1" | grep -c . || true
}

# untracked paths → "? path" lines, git status's own untracked mark
as_untracked_marker_lines() {
  printf '%s\n' "$1" | sed '/^$/d; s/^/? /'
}

# "path<TAB>source" collision lines → "path (source)" lines
as_collision_lines() {
  printf '%s\n' "$1" | awk -F'\t' 'NF { print $1 " (" $2 ")" }'
}

######################################################################
# .what = the sha of a head on origin, or "" when absent
#
# usage: sha=$(get_remote_head_sha "$(git ls-remote --heads origin)" main)
######################################################################
get_remote_head_sha() {
  local remote_heads="$1"
  local branch="$2"
  printf '%s\n' "$remote_heads" | awk -v ref="refs/heads/$branch" '$2 == ref { print $1 }'
}

######################################################################
# .what = branches whose name nests with <into>: one a path prefix of the
#         other. one "local: <name>" or "origin: <name>" line per hit
#
# .why  = git keeps refs as files, so `git branch feat/foo/v2` fails while
#         feat/foo stands (and the reverse); preflight names the clash as
#         a caller fix, before the claim, the meter, or the push
#
# usage: get_branch_name_nest_lines <into> "$(git ls-remote --heads origin)"
######################################################################
get_branch_name_nest_lines() {
  local into="$1"
  local remote_heads="$2"
  {
    git for-each-ref --format='local: %(refname:short)' "refs/heads/"
    printf '%s\n' "$remote_heads" | awk 'NF >= 2 && $2 ~ /^refs\/heads\// { sub(/^refs\/heads\//, "", $2); print "origin: " $2 }'
  } | awk -v into="$into" '
    {
      name = $0; sub(/^[a-z]+: /, "", name)
      if (name == into) next
      if (index(name, into "/") == 1 || index(into, name "/") == 1) print
    }'
}

######################################################################
# .what = is a commit's change already on the base? (ancestor or squash)
#
# .why  = q7: a pick whose change main already holds carries naught; it
#         drops and is reported, never halts as an empty pick
#
# .note = `git cherry <base> <sha> <sha>^` checks that one commit's
#         patch-id against the base; "-" means an equivalent is there
######################################################################
has_change_on_base() {
  local sha="$1"
  local base="$2"
  if git merge-base --is-ancestor "$sha" "$base"; then
    return 0
  fi
  local parent out
  parent=$(git rev-parse -q --verify "$sha^") || return 1
  out=$(git cherry "$base" "$sha" "$parent")
  [[ "$out" == "-"* ]]
}

######################################################################
# .what = why a pick will drop before replay, or "" if it will replay
#
# .why  = one rule for plan and apply: the plan marks "will drop" with the
#         same reason the apply records, so the preview never lies
#
# usage: reason=$(get_pick_drop_reason_preview "$index" "$base_sha" "$base_label" "${picks[@]}")
######################################################################
get_pick_drop_reason_preview() {
  local index="$1"
  local base_sha="$2"
  local base_label="$3"
  shift 3
  local picks=("$@")
  local sha="${picks[$index]}"
  local j

  # a repeat of an earlier pick carries naught
  for ((j = 0; j < index; j++)); do
    if [[ "${picks[$j]}" == "$sha" ]]; then
      echo "named twice"
      return 0
    fi
  done

  # a change already on the base carries naught
  if has_change_on_base "$sha" "$base_sha"; then
    echo "already on $base_label"
    return 0
  fi
  echo ""
}

######################################################################
# .what = the plan's pick lines: "N. sha7 subject[ — will drop, reason]"
#
# .why  = the plan previews each pick's fate by the same drop rule the
#         apply records; one named render, as the report's picks block is
#
# usage: get_plan_pick_lines "$base_sha" "$base_label" "${picks[@]}"
######################################################################
get_plan_pick_lines() {
  local base_sha="$1"
  local base_label="$2"
  shift 2
  local picks=("$@")
  local i line reason
  for i in "${!picks[@]}"; do
    line="$((i + 1)). $(get_short_sha "${picks[$i]}") $(get_commit_subject "${picks[$i]}")"
    reason=$(get_pick_drop_reason_preview "$i" "$base_sha" "$base_label" "${picks[@]}")
    if [[ -n "$reason" ]]; then
      line="$line — will drop, $reason"
    fi
    echo "$line"
  done
}

######################################################################
# .what = the plan's quota line: will apply pass the meter?
#
# .why  = a plan that hides an absent quota lets the caller walk into the
#         apply refusal; the plan asks the same gate the apply asks, and
#         names the outcome before the apply: the gate's own reason (a
#         global block, an org not allowed, no quota) and the lift for it
######################################################################
get_plan_quota_line() {
  local uses
  set_branch_uses_verdict
  if [[ "$BRANCH_USES_VERDICT" == "refused" ]]; then
    printf '%s\n' \
      "quota: ✋ apply will refuse: $BRANCH_USES_REASON" \
      "└─ $BRANCH_USES_ASK $BRANCH_USES_LIFT"
    return 0
  fi
  if [[ "$BRANCH_USES_VERDICT" == "damaged" ]]; then
    printf '%s\n' \
      "quota: 💥 apply will refuse: $BRANCH_USES_REASON" \
      "└─ see: rhx git.branch.uses get"
    return 0
  fi
  uses=$(jq -r '.uses' "$(get_branch_meter_file)")
  if [[ "$uses" == "infinite" ]]; then
    echo "quota: unlimited (apply spends none)"
    return 0
  fi
  echo "quota: $uses left (apply spends 1)"
}

######################################################################
# .what = the report's quota line: what this cutover spent, and what is left
#
# .why  = the plan said "apply spends 1"; the report closes that loop
#
# echoes: one line, or naught when the meter cannot be read
######################################################################
get_report_quota_line() {
  local meter uses
  meter=$(get_branch_meter_file)
  [[ -f "$meter" ]] || return 0
  uses=$(jq -r '.uses // empty' "$meter" 2> /dev/null) || return 0
  [[ -n "$uses" ]] || return 0
  if [[ "$uses" == "infinite" ]]; then
    echo "quota: unlimited (none spent)"
    return 0
  fi
  echo "quota: 1 spent, $uses left"
}

######################################################################
# .what = commits on the source, ahead of the base, that no pick names
#
# .why  = picks are an allowlist; a commit not named stays on the
#         source, and every report names it so none drops from sight
#         (inv-14). lines are "sha7 subject[ (note)]"
#
# .note = one `git cherry <base> <from>` lists every commit of base..from,
#         oldest first, each marked "-" when an equivalent patch is on the
#         base; one call, not one per commit, so a long-stale branch stays fast
######################################################################
get_left_behind_lines() {
  local base_sha="$1"
  local source_sha="$2"
  local base_label="$3"
  shift 3
  local picks=("$@")
  local mark sha pick named note
  while read -r mark sha; do
    [[ -z "$sha" ]] && continue
    named=false
    for pick in "${picks[@]+"${picks[@]}"}"; do
      if [[ "$pick" == "$sha" ]]; then
        named=true
      fi
    done
    if [[ "$named" == "true" ]]; then
      continue
    fi
    note=""
    if [[ "$mark" == "-" ]]; then
      note=" (already on $base_label via squash)"
    fi
    echo "$(get_short_sha "$sha") $(get_commit_subject "$sha")$note"
  done < <(git cherry "$base_sha" "$source_sha")
}

######################################################################
# .what = stdin lines → the first <max>, then one "… and N more" line
#
# .why  = a long-stale branch can leave hundreds of commits behind; the
#         report names the count and the command to see them all
#
# usage: printf '%s\n' "$lines" | as_bounded_lines 20 "git log --oneline a..b"
######################################################################
as_bounded_lines() {
  local max="$1"
  local more_hint="$2"
  local n=0 line
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    n=$((n + 1))
    [[ "$n" -le "$max" ]] && echo "$line"
  done
  if [[ "$n" -gt "$max" ]]; then
    echo "… and $((n - max)) more: $more_hint"
  fi
}

######################################################################
# .what = untracked paths the new base or a pick would write over
#
# .why  = inv-0: a branch switch must never overwrite untracked work,
#         gitignored files included (inv-11). candidates are the paths
#         the base adds beside HEAD, the paths each pick adds, and the
#         staged deletions (a path HEAD tracks that the index dropped).
#         a candidate collides when aught sits on disk at it, or at one
#         of its parent dirs as a non-dir. lines are "path<TAB>source"
#
# .note = the disk test runs first and git only for paths that sit on
#         disk, so a base that adds many files costs no fork per path
######################################################################
get_untracked_collision_lines() {
  local base_sha="$1"
  local base_label="$2"
  shift 2
  local picks=("$@")
  local candidates=()
  local path sha

  # .note = every read runs through get_git_paths_nul: a quoted name
  #         ("caf\303\251.md") would miss the disk test below

  # paths the base tracks that HEAD does not
  while IFS= read -r -d '' path; do
    [[ -n "$path" ]] && candidates+=("$path"$'\t'"also tracked on $base_label @ $(get_short_sha "$base_sha")")
  done < <(get_git_paths_nul diff --name-only --diff-filter=A HEAD "$base_sha")

  # paths each pick adds
  for sha in "${picks[@]+"${picks[@]}"}"; do
    while IFS= read -r -d '' path; do
      [[ -n "$path" ]] && candidates+=("$path"$'\t'"added by pick $(get_short_sha "$sha")")
    done < <(get_git_paths_nul diff-tree --no-commit-id --name-only -r --diff-filter=A "$sha")
  done

  # paths HEAD tracks that the index has dropped
  while IFS= read -r -d '' path; do
    [[ -n "$path" ]] && candidates+=("$path"$'\t'"tracked on HEAD, dropped from the index")
  done < <(get_git_paths_nul diff --cached --name-only --diff-filter=D)

  local entry source prefix
  for entry in "${candidates[@]+"${candidates[@]}"}"; do
    path="${entry%%$'\t'*}"
    source="${entry#*$'\t'}"

    # aught on disk at the path itself; a tracked edit there is parked
    if [[ -e "$path" || -L "$path" ]]; then
      is_path_tracked "$path" && continue
      printf '%s\t%s\n' "$(as_display_name "$path")" "$source"
      continue
    fi

    # an untracked non-dir at one of its parent dirs. a tracked file there
    # is a file↔dir flip the reset clears, never untracked work
    prefix="$path"
    while [[ "$prefix" == */* ]]; do
      prefix="${prefix%/*}"
      if [[ (-e "$prefix" || -L "$prefix") && ! -d "$prefix" ]]; then
        is_path_tracked "$prefix" && break
        is_path_tracked "$path" && break
        printf '%s\t%s\n' "$(as_display_name "$prefix")" "$source"
        break
      fi
    done
  done | sort -u
}

# does the index track this exact path?
is_path_tracked() {
  git --literal-pathspecs ls-files --error-unmatch -- "$1" > /dev/null 2>&1
}

######################################################################
# .what = park tracked edits at refs/worktree/cutover/{tree,index}, then
#         verify the park against the worktree before any reset
#
# .why  = inv-10: uncommitted work has no commit to fall back on. the
#         tree park holds content; the index park holds the stage split,
#         so abort restores status exactly. the refs are written only
#         after the verify passes, so a ref that exists is a good park
#
# returns: 0 = parked and verified, 1 = verify failed (naught changed),
#          2 = the park refs did not take (naught changed)
#
# .note = callers test the outcome (`if ! park_tracked_edits`), which
#         suspends errexit for this whole call tree. so no step here may
#         rely on errexit: each write is proven by a read-back instead
######################################################################
park_tracked_edits() {
  local into="$1"
  local source_sha="$2"
  local index_temp park park_index

  index_temp=$(gen_park_index)
  park=$(gen_park_commit tree="$(get_index_tree index="$index_temp")" parent="$source_sha" \
    message="cutover park: tracked edits for $into")
  park_index=$(gen_park_commit tree="$(get_index_tree index="")" parent="$source_sha" \
    message="cutover park: index for $into")

  # verify: the parked tree must match the worktree byte for byte
  if ! is_park_match_worktree park="$park" index="$index_temp"; then
    rm -f "$index_temp"
    return 1
  fi

  rm -f "$index_temp"

  # write the refs, then read them back: a reset may run only over a park
  # git can name, never one that lives on as a dangle
  set_park_refs park="$park" park_index="$park_index"
  if ! is_park_refs_at park="$park" park_index="$park_index"; then
    del_park_refs
    return 2
  fi
  return 0
}

# do both park refs name the given commits?
is_park_refs_at() {
  local park="" park_index="" arg
  for arg in "$@"; do
    case "$arg" in
      park=*) park="${arg#park=}" ;;
      park_index=*) park_index="${arg#park_index=}" ;;
    esac
  done
  [[ -n "$park" && -n "$park_index" ]] || return 1
  [[ "$(git rev-parse -q --verify "$(get_park_ref)" || true)" == "$park" ]] || return 1
  [[ "$(git rev-parse -q --verify "$(get_park_index_ref)" || true)" == "$park_index" ]]
}

# a temp index beside the real one, with every tracked edit staged; echoes its path
gen_park_index() {
  local index_temp
  mkdir -p "$(get_cutover_dir)" || return 1
  index_temp="$(get_cutover_dir)/park.index"
  gen_snapshot_index "$index_temp" || return 1
  echo "$index_temp"
}

# the tree an index holds: get_index_tree index=<path> (index="" = the real one)
get_index_tree() {
  local index="${1#index=}"
  if [[ -z "$index" ]]; then
    git write-tree
    return 0
  fi
  GIT_INDEX_FILE="$index" git write-tree
}

# a park commit, the bot's own; it never lands on a branch
gen_park_commit() {
  local tree="" parent="" message="" arg
  for arg in "$@"; do
    case "$arg" in
      tree=*) tree="${arg#tree=}" ;;
      parent=*) parent="${arg#parent=}" ;;
      message=*) message="${arg#message=}" ;;
    esac
  done
  GIT_AUTHOR_NAME="$CUTOVER_BOT_NAME" GIT_AUTHOR_EMAIL="$CUTOVER_BOT_EMAIL" \
    git commit-tree --no-gpg-sign "$tree" -p "$parent" -m "$message"
}

# does the park hold the worktree byte for byte, per the temp index?
is_park_match_worktree() {
  local park="" index="" arg
  for arg in "$@"; do
    case "$arg" in
      park=*) park="${arg#park=}" ;;
      index=*) index="${arg#index=}" ;;
    esac
  done
  GIT_INDEX_FILE="$index" git diff --quiet --no-ext-diff "$park" --
}

######################################################################
# .what = does the park hold every tracked edit the worktree has now?
#
# .why  = the reset is the one step that can destroy work (inv-10). it
#         may run only when the park can lay back what it erases. an edit
#         saved after the park (a peer editor, an agent in this worktree)
#         makes this false, and the cut backs out rather than reset it
#
# .note = no park: the worktree must hold no tracked edit at all
# .note = returns 0 held, 1 not held, 2 the check itself failed: callers
#         run it under `if !`, where errexit is off, so a failed snapshot
#         must never read as a verdict
######################################################################
is_worktree_held_by_park() {
  local index_temp park rc=0
  if ! has_park; then
    [[ -z "$(get_tracked_edit_lines)" ]]
    return
  fi
  index_temp=$(gen_park_index) || return 2
  park=$(git rev-parse "$(get_park_ref)") || { rm -f "$index_temp"; return 2; }
  is_park_match_worktree park="$park" index="$index_temp" || rc=$?
  rm -f "$index_temp"
  [[ "$rc" -le 1 ]] || return 2
  return "$rc"
}

######################################################################
# .what = the tracked edits the carry will halt on: a file the source
#         holds and the edit changes, but the new branch lacks
#
# .why  = a carry conflict halts after the unit is spent; the plan can
#         foresee it, and name the left-behind commit that adds the file,
#         so the caller picks it or settles the edit before apply
#
# usage: printf '%s\n' "$TRACKED_LINES" | get_carry_halt_lines <base sha> <source sha> [<pick sha>...]
# echoes: "<path> (<cause>)" per file, cause from get_path_absence_cause
#
# .note = a staged-new file (A) the carry adds; a delete (D) of a file
#         both sides lack merges clean. only a change (M, T) can halt
# .note = a file the base renamed carries clean (the merge follows the
#         rename), so it is no halt
######################################################################
get_carry_halt_lines() {
  local base="$1" source="$2"
  shift 2
  local line code path cause
  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    code="${line:0:1}"
    path="${line:2}"
    [[ "$code" == "M" || "$code" == "T" ]] || continue
    git cat-file -e "$base:$path" 2> /dev/null && continue
    is_path_added_by_picks "$path" "$@" && continue
    cause=$(get_path_absence_cause "$path" "$base" "$source")
    [[ "$cause" == "renamed on the base"* ]] && continue
    echo "$path ($cause)"
  done
}

######################################################################
# .what = why <path> is absent from <base>, one phrase:
#         "added by <sha> <subject>, not picked" — a left-behind commit adds it
#         "renamed on the base to <path>"        — the base moved it
#         "removed on the base"                  — the base deleted it
#         "absent from the base, cause unknown"  — none of the above found
#
# .why  = the fix differs per cause: pick the commit, let the rename carry,
#         or keep or drop the edit. a halt that names the wrong cause sends
#         the human to the wrong fix
#
# usage: get_path_absence_cause <path> <base sha> <source sha>
######################################################################
get_path_absence_cause() {
  local path="$1" base="$2" source="$3" introducer fork status old new
  introducer=$(git --literal-pathspecs log --diff-filter=A --format='%h %s' -1 "$base..$source" -- "$path" 2> /dev/null || true)
  if [[ -n "$introducer" ]]; then
    echo "added by $introducer, not picked"
    return 0
  fi
  fork=$(git merge-base "$base" "$source" 2> /dev/null || true)
  if [[ -n "$fork" ]]; then
    while IFS= read -r -d '' status; do
      IFS= read -r -d '' old || break
      new=""
      if [[ "$status" == R* || "$status" == C* ]]; then
        IFS= read -r -d '' new || break
      fi
      [[ "$old" == "$path" ]] || continue
      if [[ "$status" == R* ]]; then
        echo "renamed on the base to $new"
        return 0
      fi
      if [[ "$status" == D ]]; then
        echo "removed on the base"
        return 0
      fi
    done < <(get_git_paths_nul diff --name-status -M --diff-filter=DR "$fork" "$base" 2> /dev/null || true)
  fi
  echo "absent from the base, cause unknown"
}

# does any of the picks add this path? is_path_added_by_picks <path> [<pick sha>...]
is_path_added_by_picks() {
  local path="$1" pick
  shift
  for pick in "$@"; do
    get_git_paths_nul diff-tree -r --no-commit-id --name-only --diff-filter=A "$pick" -- "$path" \
      | has_one_nul_entry && return 0
  done
  return 1
}

# point the park refs at a verified park
set_park_refs() {
  local park="" park_index="" arg
  for arg in "$@"; do
    case "$arg" in
      park=*) park="${arg#park=}" ;;
      park_index=*) park_index="${arg#park_index=}" ;;
    esac
  done
  git update-ref "$(get_park_ref)" "$park"
  git update-ref "$(get_park_index_ref)" "$park_index"
}

# the park's stage split, onto the index alone; the worktree is untouched,
# so a rerun may repeat it after a kill between set_park_laid_back's two reads
set_index_from_park() {
  git read-tree "$(get_park_index_ref)^{tree}"
}

######################################################################
# .what = abort's undo steps, each a no-op where a prior run already did it
#
# .why  = a killed abort reruns over a half-done undo. each step checks its
#         own end state, so abort reads as a straight list and converges
######################################################################

# does abort still owe the reset of the new branch's tree?
# under @tree no file ever moved, and back on the source a reset would
# erase the park's edits, so a reset is owed only while HEAD is the new branch
is_reset_owed() {
  [[ "$(get_state '.base_kind')" != "@tree" ]] \
    && [[ "$(get_head_branch || true)" == "$(get_state '.into')" ]]
}

# put HEAD back on the source: by name when it had one, else detached
set_head_at_source() {
  local source_name source_sha
  source_name=$(get_state '.source_name')
  source_sha=$(get_state '.source_sha')
  is_head_at_source "$source_name" "$source_sha" "$(get_head_branch || true)" && return 0
  if [[ -n "$source_name" ]]; then
    set_head_branch "$source_name" || return 1
    return 0
  fi
  set_head_detached "$source_sha"
}

# lay the park's files back unless the worktree already holds them, then
# always lay its stage split: a kill between the two reads leaves the
# files back and the split owed
# .note = a tracked edit made on the source since the reset (a peer write
#         mid back-out) is saved to a rescue ref and cleared first, so the
#         park lands over HEAD and a rerun never sticks on "not uptodate"
#         over a clean tree both steps are no-ops
set_park_laid_back() {
  is_park_expected || return 0
  local held_rc=0
  is_worktree_held_by_park || held_rc=$?
  [[ "$held_rc" -le 1 ]] || return 1
  if [[ "$held_rc" -eq 1 ]]; then
    gen_worktree_rescue || return 1
    del_worktree_tracked_edits || return 1
    git read-tree -m -u HEAD "$(get_park_ref)" || return 1
  fi
  set_index_from_park
}

######################################################################
# .what = undo a cutover past its claim: rescue, reset, back on the
#         source, the park laid back, the new branch gone
#
# .why  = abort and begin's back-out walk one ladder, so neither carries
#         a weaker copy. each step judges by the fact it produces (HEAD,
#         the snapshot), never by a proxy such as "the tree reads clean"
#
# .note = each step returns on fail: begin calls this under `if !`, where
#         errexit is off; abort calls it plain, where its trap catches it
# .note = the state and park stay; the caller drops them only on success
######################################################################
undo_cutover() {
  local into
  into=$(get_state '.into') || return 1
  del_pick_marks || return 1

  # save the worktree to a rescue ref, then clear the new branch's tree
  if is_reset_owed; then
    gen_worktree_rescue || return 1
    del_worktree_tracked_edits || return 1
  fi

  # back on the source, then the tracked edits with their stage split
  set_head_at_source || return 1
  set_park_laid_back || return 1

  # remove the branch this cutover made; it was never pushed
  del_local_branch "$into"
}

######################################################################
# .what = land the pick at the current index whose replay is settled
#
# .why  = after a clean replay, or after a human settled a conflict, the
#         index holds the pick's change. empty → drop; else commit with
#         the source message and author, seaturtle as committer
######################################################################
#
# usage: land_settled_pick <index> [<reason when empty>]
#        the default reason fits a clean replay; continue passes its own,
#        since a human who settled a conflict to the base side shipped naught
######################################################################
land_settled_pick() {
  local index="$1"
  local sha base_label new_sha empty_reason

  # a write past the last pick would grow the array with a phantom pick
  guard_pick_index_in_range "$index" || return 1
  sha=$(get_state ".picks[$index].sha")
  base_label=$(get_state '.base_label')
  empty_reason="${2:-its change is already on $base_label}"

  # HEAD moved past where this pick began: its commit already landed, and
  # a crash came before the state could say so. record it, never drop it
  local head_before
  head_before=$(get_state ".picks[$index].head_before")
  if [[ -n "$head_before" && "$(get_head_sha)" != "$head_before" ]]; then
    del_pick_marks
    set_state_pick_landed "$index" "$(get_head_sha)"
    return 0
  fi

  # an empty change carries naught: drop and report. a replay can also go
  # empty because an earlier pick already carried the same patch; say so,
  # never credit the base with a change it does not hold
  if is_index_clean; then
    if [[ -z "${2:-}" ]] && is_change_from_earlier_pick "$index"; then
      empty_reason="an earlier pick already carried its change"
    fi
    del_pick_marks
    set_state_pick_dropped "$index" "$empty_reason"
    return 0
  fi

  # commit with the pick's own message and author
  set_commit_from_pick "$sha"
  del_pick_marks
  new_sha=$(get_head_sha)
  set_state_pick_landed "$index" "$new_sha"
}

# did a pick before <index> land a patch equal to this pick's, one the base lacks?
is_change_from_earlier_pick() {
  local index="$1"
  local sha base_sha
  sha=$(get_state ".picks[$index].sha")
  base_sha=$(get_state '.base_sha')
  has_change_on_base "$sha" "$base_sha" && return 1
  local patch_id earlier
  patch_id=$(git show "$sha" | git patch-id --stable | awk '{ print $1 }')
  [[ -n "$patch_id" ]] || return 1
  while IFS= read -r earlier; do
    [[ -n "$earlier" ]] || continue
    [[ "$(git show "$earlier" | git patch-id --stable | awk '{ print $1 }')" == "$patch_id" ]] && return 0
  done < <(get_state "[.picks[:$index][] | select(.status == \"landed\") | .sha] | .[]")
  return 1
}

######################################################################
# .what = replay every pick from .pick_index on, in order
#
# .why  = q7: one loop serves begin and continue. it reads its cursor from
#         state, so a halt resumes at the very pick it stopped on
#
# sets PICK_OUTCOME: done = all picks settled, conflict = halted on a
#   conflict, failed = a replay failed for a cause other than a conflict
#
# .note = the outcome rides a variable and the return is 0, so a caller
#         runs this as a plain statement: errexit stays live for every
#         leaf (a failed commit or state write), never off under an `||`
######################################################################
run_pick_loop() {
  local total index sha base_sha base_label reason out
  PICK_OUTCOME=""
  total=$(get_state '.picks | length')
  base_sha=$(get_state '.base_sha')
  base_label=$(get_state '.base_label')
  index=$(get_state '.pick_index')

  local picks=()
  while IFS= read -r sha; do
    picks+=("$sha")
  done < <(get_state '.picks[].sha')

  while [[ "$index" -lt "$total" ]]; do
    sha="${picks[$index]}"

    # drop a pick that would carry naught, before any replay
    reason=$(get_pick_drop_reason_preview "$index" "$base_sha" "$base_label" "${picks[@]}")
    if [[ -n "$reason" ]]; then
      set_state_pick_dropped "$index" "$reason"
      index=$((index + 1))
      set_state_pick_index "$index"
      continue
    fi

    # note where this pick begins, so a resume can tell landed from empty
    set_state_pick_began "$index" "$(get_head_sha)"

    # replay without a commit; the loop owns the commit
    if ! out=$(set_index_from_pick "$sha"); then
      if has_conflict_files; then
        set_state_halted kind=pick-conflict index="$index"
        PICK_OUTCOME="conflict"
        return 0
      fi
      PICK_LOOP_ERROR="$out"
      PICK_OUTCOME="failed"
      return 0
    fi

    # the replay's own file set, so a resume after a kill keeps all of it
    set_state_pick_replayed "$index"
    land_settled_pick "$index"
    index=$((index + 1))
    set_state_pick_index "$index"
  done

  set_state_halt_cleared
  PICK_OUTCOME="done"
}

######################################################################
# .what = lay the parked tracked edits onto the new branch, unstaged
#
# .why  = a 3-way apply of the park's own diff (park vs its parent, the
#         source HEAD) onto the new HEAD; a clash leaves markers
#
# sets CARRY_OUTCOME: done = carried (or naught to carry), conflict =
#   halted on a carry conflict, park-absent = the state expects a park git
#   lacks, failed = the carry failed for another cause
#
# .note = as run_pick_loop: the outcome rides a variable, so errexit stays live
######################################################################
run_carry() {
  local out
  CARRY_OUTCOME=""
  set_state_phase carry

  # the state, not the ref, says whether edits await the carry
  if ! is_park_expected; then
    CARRY_OUTCOME="done"
    return 0
  fi

  # the state expects a park that git lacks: fail loud, never report a carry
  if ! has_park; then
    CARRY_ERROR="the state holds tracked edits ($(get_state '.tracked | length')), but the park $(get_park_ref) is absent"
    CARRY_OUTCOME="park-absent"
    return 0
  fi

  if ! out=$(set_index_from_pick "$(get_park_ref)"); then
    if has_conflict_files; then
      set_state_halted kind=carry-conflict
      CARRY_OUTCOME="conflict"
      return 0
    fi
    CARRY_ERROR="$out"
    CARRY_OUTCOME="failed"
    return 0
  fi

  finish_carry
  CARRY_OUTCOME="done"
}

######################################################################
# .what = refuse unless HEAD sits where this cutover left it
#
# .why  = the state can outlive the session by days. a continue that lands
#         picks onto some other branch, or an abort that resets some other
#         branch's edits, acts on work the cutover never touched
#
# .note = abort's own guards (pushed branch, unrecorded commit, moved
#         source) live in guard_abort_deletes_only_own_work
#
# usage: guard_head_at_cutover_position verb=continue|abort
######################################################################
guard_head_at_cutover_position() {
  local verb="${1#verb=}"
  local into source_name source_sha head_branch
  into=$(get_state '.into')
  source_name=$(get_state '.source_name')
  source_sha=$(get_state '.source_sha')
  head_branch=$(get_head_branch || true)

  # in phase "claim" no file or branch has moved, so there is naught to misplace
  is_cutover_past_claim || return 0

  # HEAD must be the new branch, or, in phase "cut", still the source.
  # an abort that began and was cut short may have switched back already:
  # its rerun accepts HEAD on the source, and finishes the undo
  if ! is_head_at_cutover_position "$into" "$source_name" "$source_sha" "$head_branch" \
    && ! { [[ "$verb" == "abort" ]] && is_cutover_abort_begun \
      && is_head_at_source "$source_name" "$source_sha" "$head_branch"; }; then
    emit_cutover_refusal "HEAD is not where this cutover left it, so $verb would act on other work" "$(printf '%s\n' \
      "expected: $into" \
      "found: ${head_branch:-detached at $(get_short_sha "$(get_head_sha)")}" \
      "fix: git switch $(as_shell_word "$into"), then rerun rhx git.branch.cutover $verb" | as_tree_children)"
  fi
}

######################################################################
# .what = refuse an abort that would delete or reverse work it did not make
#
# .why  = abort resets the worktree, deletes the new branch, and lays the
#         park over the source. each is safe only over what this cutover
#         made: an unpushed branch, recorded commits, an unmoved source
######################################################################
guard_abort_deletes_only_own_work() {
  local into source_name source_sha
  into=$(get_state '.into')
  source_name=$(get_state '.source_name')
  source_sha=$(get_state '.source_sha')

  # in phase "claim" no file or branch has moved, so there is naught to misplace
  is_cutover_past_claim || return 0

  # abort deletes only a branch that was never pushed
  local remote_refs
  remote_refs=$(get_remote_refs_of_branch "$into")
  if [[ -n "$remote_refs" ]]; then
    emit_cutover_refusal "$into is on a remote, and abort deletes only an unpushed branch" "$(printf '%s\n' \
      "found: $remote_refs" \
      "fix: keep it and finish by hand, or remove the cutover state: $(get_cutover_dir)" | as_tree_children)"
  fi

  # abort deletes only commits this cutover recorded
  local tip
  tip=$(get_local_branch_sha "$into")
  if [[ -n "$tip" ]] && ! is_cutover_recorded_sha "$tip"; then
    emit_cutover_refusal "$into holds a commit this cutover never recorded, so abort would drop it" "$(printf '%s\n' \
      "tip: $(get_short_sha "$tip") $(get_commit_subject "$tip")" \
      "fix: rhx git.branch.cutover continue, to record it" \
      "or: delete it by hand, if it is unwanted: git branch -D $(as_shell_word "$into")" | as_tree_children)"
  fi

  # abort lays the park back over the source as it stood: a source that
  # moved would take the park as a reversal of the move, and a source
  # that is gone leaves abort no branch to return to
  [[ -n "$source_name" ]] || return 0
  local source_tip
  source_tip=$(get_local_branch_sha "$source_name")
  if [[ -z "$source_tip" ]]; then
    emit_cutover_refusal "the source branch $source_name is gone, so abort has no branch to return to" "$(printf '%s\n' \
      "expected: $source_name @ $(get_short_sha "$source_sha")" \
      "fix: restore it, then rerun: git branch $(as_shell_word "$source_name") $source_sha" | as_tree_children)"
  fi
  if [[ "$source_tip" != "$source_sha" ]]; then
    emit_cutover_refusal "the source branch $source_name moved since the cutover began, so abort would undo that move" "$(printf '%s\n' \
      "expected: $source_name @ $(get_short_sha "$source_sha")" \
      "found: $source_name @ $(get_short_sha "$source_tip") $(get_commit_subject "$source_tip")" \
      "fix: keep the move on a side branch, point $source_name back, then rerun abort" \
      "run: git branch $(as_shell_word "$source_name.moved") $source_tip && git branch -f $(as_shell_word "$source_name") $source_sha" | as_tree_children)"
  fi

  # abort must switch back to the source after its reset: a source checked
  # out in a peer worktree would refuse that switch, and strand this tree
  # clean on the new branch. refuse before any reset
  local peer
  peer=$(get_branch_peer_worktree "$source_name") || return 1
  if [[ -n "$peer" ]]; then
    emit_cutover_refusal "the source branch $source_name is checked out in another worktree, so abort could not switch back" "$(printf '%s\n' \
      "held by: $peer" \
      "fix: switch that worktree off $source_name, then rerun abort" | as_tree_children)"
  fi
}

# has an abort of this cutover begun (and been cut short)?
is_cutover_abort_begun() {
  [[ "$(get_state '.abort_begun')" == "true" ]]
}

# is HEAD on the source: the branch by name, or detached at its sha?
is_head_at_source() {
  local source_name="$1" source_sha="$2" head_branch="$3"
  if [[ -n "$source_name" ]]; then
    [[ "$head_branch" == "$source_name" ]]
    return
  fi
  [[ -z "$head_branch" && "$(get_head_sha)" == "$source_sha" ]]
}

# is HEAD on the new branch, or (in phase "cut", before the switch) on the source?
is_head_at_cutover_position() {
  local into="$1" source_name="$2" source_sha="$3" head_branch="$4"
  [[ "$head_branch" == "$into" ]] && return 0
  is_cutover_before_switch || return 1
  is_head_at_source "$source_name" "$source_sha" "$head_branch"
}

# the remote-track refs of a branch name, one per line ("" when unpushed)
#
# .note = the glob's `*` matches one path segment, so `x` never matches
#         origin/feat/x (pinned by test case68)
get_remote_refs_of_branch() {
  git for-each-ref --format='%(refname:short)' "refs/remotes/*/$1"
}

# is this sha one the cutover recorded: the base, a landed pick, or a pick's start?
#
# .note = one jq predicate, no pipe: under pipefail a reader that exits on
#         its first match could fail the writer, and the guard refuse falsely
is_cutover_recorded_sha() {
  jq -e --arg sha "$1" \
    '$sha != "" and any(([.base_sha] + [.picks[] | .new, .head_before])[]; . == $sha)' \
    "$(get_cutover_state_file)" > /dev/null
}

######################################################################
# .what = save the worktree to a rescue ref when it differs from HEAD, as
#         the drive begins
#
# .why  = the drive starts from HEAD plus naught of its own: begin resets,
#         and continue commits the settled pick first. so any difference is
#         a tracked edit the human made mid-halt. a pick laid with
#         `--no-commit` carries that edit along, and the next halt snapshot
#         would then exempt it from abort's rescue. the copy is taken here,
#         while it is still plainly the human's
#
# .note = under @tree no reset ran and the human's edits stay in place by
#         design, so there is naught to tell apart; no rescue is taken
######################################################################
gen_rescue_before_drive() {
  local tree head ref
  [[ "$(get_state '.base_kind')" != "@tree" ]] || return 0
  tree=$(get_worktree_snapshot_tree) || return 1
  head=$(git rev-parse 'HEAD^{tree}') || return 1
  [[ "$tree" != "$head" ]] || return 0
  ref=$(gen_rescue_ref "$tree") || return 1
  set_state_rescue_ref "$ref"
}

######################################################################
# .what = drive a cutover from its pick cursor to the end: replay the
#         picks, carry the tracked edits, then report and clear
#
# .why  = begin and continue share one drive, so a halt, a failure, and a
#         finish render the same from either verb
#
# usage: drive_cutover "<header cmd>"
######################################################################
drive_cutover() {
  local header_cmd="$1"

  # save any tracked edit the cutover did not write, before a pick or the
  # carry folds it into what the next halt snapshot calls its own
  gen_rescue_before_drive

  # replay the picks, in order
  run_pick_loop
  if [[ "$PICK_OUTCOME" == "conflict" ]]; then
    print_cutover_halt "$header_cmd"
    exit 2
  fi
  if [[ "$PICK_OUTCOME" != "done" ]]; then
    emit_cutover_malfunction "a pick failed for a cause other than a conflict" "$(printf '%s\n' \
      "detail: $(as_git_error_detail "${PICK_LOOP_ERROR:-}")" \
      "resume, once the cause is cleared: rhx git.branch.cutover continue" \
      "or undo: rhx git.branch.cutover abort" | as_tree_children)"
  fi

  # carry the tracked edits back down, unstaged
  run_carry
  if [[ "$CARRY_OUTCOME" == "conflict" ]]; then
    print_cutover_halt "$header_cmd"
    exit 2
  fi
  # an absent park is named as such; any other failure names its class
  local carry_failure="the carry of tracked edits failed for a cause other than a conflict"
  [[ "$CARRY_OUTCOME" != "park-absent" ]] || carry_failure="the park of tracked edits is absent; the carry cannot run"
  if [[ "$CARRY_OUTCOME" != "done" ]]; then
    emit_cutover_malfunction "$carry_failure" "$(
      get_carry_failure_lines "${CARRY_ERROR:-}" | as_tree_children)"
  fi

  finish_cutover "$header_cmd"
}

######################################################################
# .what = report a finished cutover, clear its state, and exit 0
#
# .why  = render first, clear, then print: a closed pipe on the print can
#         no longer strand a finished cutover as in flight
######################################################################
finish_cutover() {
  local header_cmd="$1" report
  report=$(print_cutover_report "$header_cmd")
  close_cutover_with_report "$report"
}

######################################################################
# .what = close a cutover: clear its state and park, print its report,
#         exit 0
#
# .why  = the report is rendered by the caller, before the clear, so no
#         fault in the clear or the print can lose it; begin, continue,
#         and abort all close through this one leaf
#
# usage: report=$(print_..._report ...); close_cutover_with_report "$report"
# .note = render into an assignment first: a $(...) inside an argument
#         escapes errexit, so a failed render would clear behind no report
######################################################################
close_cutover_with_report() {
  local report="$1"
  del_state_then_park
  printf '%s\n' "$report"
  exit 0
}

######################################################################
# .what = turn any unexpected failure into a qualified malfunction
#
# .why  = once a verb starts to mutate, a failed leaf (a commit, a state
#         write, a checkout) must not exit with git's raw code and text.
#         the state is written first, so every such failure leaves a state
#         that abort can undo; the render says so
#
# .note = the handler acts only in the verb's own shell; inside a command
#         substitution it stays silent, and the caller judges the status
######################################################################
set_cutover_unexpected_trap() {
  local recover="$1"
  CUTOVER_RECOVER_HINT="$recover"
  set -E
  trap 'on_cutover_unexpected "$?" "$LINENO" "$BASH_COMMAND"' ERR
}

on_cutover_unexpected() {
  local status="$1" line="$2" command="$3"
  [[ "$BASH_SUBSHELL" -eq 0 ]] || return 0
  trap - ERR
  # the step reads as the leaf that failed, in words; the raw command is its detail
  local step
  step=$(as_cutover_step_label "${FUNCNAME[1]:-main}")
  # before the cut, naught moved: the exit release drops the claim
  if [[ "$CUTOVER_CLAIMED" == "1" ]] && is_cutover_in_flight && ! is_cutover_past_claim 2> /dev/null; then
    emit_cutover_malfunction "an unexpected step failed (exit $status) before the cut; naught changed" "$(printf '%s\n' \
      "step: $step (line $line)" \
      "detail: $command" \
      "fix: read the step, clear its cause, then rerun" | as_tree_children)"
  fi
  # an abort that saved rescues names each: the reset may already have run
  local rescue_refs ref
  rescue_refs=$(get_state '.rescue_refs[]' 2> /dev/null || true)
  emit_cutover_malfunction "an unexpected step failed (exit $status); the cutover state is kept" "$(
    {
      printf '%s\n' "step: $step (line $line)" "detail: $command"
      while IFS= read -r ref; do
        if [[ -n "$ref" ]]; then
          printf '%s\n' "rescue: $ref holds the worktree before the reset"
        fi
      done <<< "$rescue_refs"
      printf '%s\n' "$CUTOVER_RECOVER_HINT"
    } | as_tree_children
  )"
}

######################################################################
# .what = the failed leaf's function name, as words a human reads
#
# .why  = the ERR trap knows the raw command (`git commit -q ... -C "$1"`)
#         and the function it ran in (`set_pick_commit`). the function names
#         the intent; the command is the detail beneath it
######################################################################
as_cutover_step_label() {
  local fn="$1"
  if [[ "$fn" == "main" || "$fn" == "source" ]]; then
    echo "the verb's own flow"
    return 0
  fi
  echo "${fn//_/ }"
}

# the trap's claim "the cutover state is kept" holds only while it is; a
# verb disarms the trap the moment it clears the state
del_cutover_unexpected_trap() {
  trap - ERR
}

######################################################################
# .what = the lines a failed carry reports: detail, where the edits sit, undo
#
# .why  = "safe: parked" is a promise only a present park can keep. when
#         the park is absent, say so, and stop the human short of an abort
#         that would reset the worktree with no copy to lay back down
######################################################################
get_carry_failure_lines() {
  local detail="$1"
  echo "detail: $(as_git_error_detail "$detail")"
  if has_park; then
    echo "safe: the edits stay parked at $(get_park_ref)"
    echo "resume, once the cause is cleared: rhx git.branch.cutover continue"
    echo "or undo: rhx git.branch.cutover abort"
    return 0
  fi
  echo "lost: the park that held the edits is absent, so no verb can lay them back down"
  echo "fix: recover what you can by hand (git status, git reflog), then remove $(get_cutover_dir)"
}

######################################################################
# .what = unstage the carried edits
#
# .why  = the edits land uncommitted, as they left. the park stays until
#         the state clears (del_state_then_park), so a kill before the end
#         still leaves abort a park to restore
######################################################################
finish_carry() {
  # mark first, then unstage: a kill between the two leaves a state that
  # says the edits lay down, so continue reruns this (each step converges)
  # rather than replay the carry onto the edits it already laid
  set_state_carry_landed
  del_pick_marks
  set_index_to_head_with_park_intents
}

# did the carry lay the parked edits down? (an interrupted carry resumes from here)
is_carry_landed() {
  [[ "$(get_state '.carry')" == "landed" ]]
}

######################################################################
# .what = does the pick at the cursor hold work that continue must land?
#
# .why  = continue resumes a halt and an interruption alike. a halted pick
#         holds the settle. an interrupted pick that began holds work when
#         HEAD moved past its start (the commit landed, the state lagged) or
#         when the index holds its replay (the commit never ran). a pick that
#         began yet holds neither never laid its change down, so the drive
#         replays it rather than drop it as empty
#
# usage: is_pick_landing_owed <index> <halt>
######################################################################
is_pick_landing_owed() {
  local index="$1" halt="$2"
  is_pick_cursor_past_last "$index" && return 1
  has_pick_begun "$index" || return 1
  [[ -z "$halt" ]] || return 0
  [[ "$(get_head_sha)" != "$(get_state ".picks[$index].head_before")" ]] && return 0
  ! is_index_clean
}

######################################################################
# .what = refuse a continue or abort whose next writes would land on an
#         untracked file
#
# .why  = inv-0 holds past begin. a halt can last days; a file made in it at
#         a path a later pick adds, a path the park lays back down, or a path
#         the source tracks would fail the replay or the restore. git refuses
#         the overwrite, so naught is lost, but only the caller can move the
#         file: a refusal that names each, before any write
#
# usage: guard_untracked_safe verb=continue|abort
######################################################################
guard_untracked_safe() {
  local verb="${1#verb=}"
  local base_sha base_label sha park_short="" collisions
  local writers=()

  # before the reset no file has moved; under @tree no file ever moves
  is_cutover_past_claim || return 0
  [[ "$(get_state '.base_kind')" != "@tree" ]] || return 0

  # continue writes the picks still ahead; abort switches back to the source
  base_sha=$(get_head_sha)
  base_label="HEAD"
  if [[ "$verb" == "continue" ]]; then
    while IFS= read -r sha; do
      [[ -n "$sha" ]] && writers+=("$sha")
    done < <(get_state '.pick_index as $i | .picks[$i:][] | .sha')
  fi
  if [[ "$verb" == "abort" ]]; then
    base_sha=$(get_state '.source_sha')
    base_label="the source"
  fi

  # both lay the park back down, onto the new branch or onto the source
  if is_park_expected && has_park; then
    writers+=("$(get_park_ref)")
    park_short=$(get_short_sha "$(get_park_ref)")
  fi

  collisions=$(get_untracked_collision_lines "$base_sha" "$base_label" "${writers[@]+"${writers[@]}"}")
  [[ -n "$collisions" ]] || return 0
  if [[ -n "$park_short" ]]; then
    collisions=$(printf '%s\n' "$collisions" | sed "s/added by pick $park_short\$/a new file in the park/")
  fi
  emit_cutover_refusal "untracked files sit where $verb would write" "$(
    echo "├─ untouched, still on disk"
    as_collision_lines "$collisions" | as_tree_children | sed 's/^/│  /'
    echo "└─ fix: move or rename each file above, then rerun rhx git.branch.cutover $verb"
  )"
}

# the unmerged paths, NUL-framed, the exact names
get_conflict_paths_nul() {
  get_git_paths_nul diff --name-only --diff-filter=U 2> /dev/null
}

# does any path stand unmerged?
has_conflict_files() {
  get_conflict_paths_nul | has_one_nul_entry
}

# does stdin hold at least one NUL-framed entry? it drains the rest, so the
# writer never takes a SIGPIPE that pipefail would read as a miss
has_one_nul_entry() {
  local found=1
  IFS= read -r -d '' _ && found=0
  cat > /dev/null
  return "$found"
}

# the unmerged paths, as display lines
get_conflict_files() {
  get_conflict_paths_nul | as_display_lines_from_nul
}

######################################################################
# .what = the conflicted files, each with what each side did to it
#
# .why  = a file one side deletes is not settled by an edit; the halt says
#         which side deleted it, so the caller knows to keep it or remove it.
#         "the new branch" is HEAD; "the pick" is the replay (or the park)
######################################################################
get_conflict_file_lines() {
  local entry code path what base source
  base=$(get_state '.base_sha' 2> /dev/null || true)
  source=$(get_state '.source_sha' 2> /dev/null || true)
  while IFS= read -r -d '' entry; do
    code="${entry:0:2}"
    path="${entry:3}"
    case "$code" in
      UU) what="both changed it" ;;
      AA) what="both added it" ;;
      DD) what="both deleted it" ;;
      UD) what="the pick deletes it; keep it, or rhx rmsafe it" ;;
      DU) what="the new branch lacks it: $(get_path_absence_cause "$path" "$base" "$source"). keep it, or rhx rmsafe it" ;;
      AU) what="the new branch added it" ;;
      UA) what="the pick adds it" ;;
      *) continue ;;
    esac
    printf '%s (%s)\0' "$path" "$what"
  done < <(get_git_paths_nul status --porcelain=v1) | as_display_lines_from_nul
}

######################################################################
# .what = the files this halt conflicted on whose staged change still adds
#         a conflict marker line
#
# .why  = continue lands what is staged; a file staged with its markers
#         intact would commit as if settled, under the pick's own name
#
# .note = a bare ======= line is a setext title underline in markdown and
#         rst; an unsettled block always holds <<<<<<< and >>>>>>> too, so
#         those two alone find it
######################################################################
get_conflict_marker_files() {
  local path staged own src
  src=$(get_halt_source_ref)
  while IFS= read -r -d '' path; do
    [[ -n "$path" ]] || continue
    staged=$(git --literal-pathspecs diff --cached -U0 --no-color HEAD -- "$path")
    own=""
    [[ -z "$src" ]] || own=$(git show "$src:$path" 2> /dev/null || true)
    if is_marker_added_by_git staged="$staged" own="$own"; then
      printf '%s\0' "$path"
    fi
  done < <(get_state_paths_nul conflicts) | as_display_lines_from_nul
}

######################################################################
# .what = does a staged diff add a marker line the author's file lacks?
#
# .why  = a brief or fixture can hold a `<<<<<<< demo` line of its own; a
#         marker git wrote is never in the author's version of the file
#
# usage: is_marker_added_by_git staged=<diff -U0 text> own=<author's file>
######################################################################
is_marker_added_by_git() {
  local staged="${1#staged=}" own="${2#own=}" markers foreign
  markers=$(grep -E '^\+(<<<<<<<|>>>>>>>)( |$)' <<< "$staged" | sed 's/^+//' || true)
  [[ -n "$markers" ]] || return 1
  foreign=$(grep -vxF -f <(printf '%s\n' "$own") <<< "$markers" || true)
  [[ -n "$foreign" ]]
}

# the commit a halt replays: the pick at the cursor, or the park on a carry
get_halt_source_ref() {
  if [[ "$(get_state '.halt')" == "carry-conflict" ]]; then
    get_park_ref
    return 0
  fi
  get_state ".picks[$(get_state '.pick_index')].sha"
}

######################################################################
# .what = the staged paths beyond the pick's own files and the halt's
#         conflicts, NUL-framed, the exact names
#
# .why  = continue commits the index under the pick's own author; a path
#         staged past the pick is the human's work, never the author's.
#         the pick's own files are what its replay staged (.replayed), read
#         when the index held the replay alone; a merge can stage paths its
#         source diff never names, so the diff is only the fallback for a
#         state an older run wrote
######################################################################
get_staged_paths_beyond_pick_nul() {
  local index="$1" sha
  sha=$(get_state ".picks[$index].sha")
  [[ -n "$sha" ]] || return 0
  jq -nj \
    --rawfile keep <({
      get_pick_replayed_paths_nul "$index" "$sha"
      get_state_paths_nul conflicts
    }) \
    --rawfile staged <(get_git_paths_nul diff --cached --name-only HEAD) \
    '(($staged | split("\u0000")) - ($keep | split("\u0000")))
      | map(select(length > 0)) | unique | .[] | ., "\u0000"'
}

# the paths the pick's replay staged; a state with no record falls back to
# the pick's source diff (--root, so a root-commit pick names its files)
get_pick_replayed_paths_nul() {
  local index="$1" sha="$2"
  if [[ "$(get_state ".picks[$index] | has(\"replayed\")")" == "true" ]]; then
    get_state_paths_nul "picks[$index].replayed"
    return 0
  fi
  get_git_paths_nul diff-tree --root --no-commit-id --name-only -r "$sha"
}

######################################################################
# .what = unstage each path staged beyond the pick; the file stays on disk
#
# .why  = the pick commit holds the pick alone. the unstaged edit stays
#         the human's own, and the drive rescues it before any pick
#
# .note = each path is recorded in .unstaged before the unstage, so a
#         rerun after a kill still names it in the report
######################################################################
del_staged_paths_beyond_pick() {
  local paths_file path
  paths_file="$(get_cutover_dir)/unstage.paths"
  get_staged_paths_beyond_pick_nul "$1" > "$paths_file" || { rm -f "$paths_file"; return 1; }
  if [[ ! -s "$paths_file" ]]; then
    rm -f "$paths_file"
    return 0
  fi
  set_state_unstaged_add_from_nul < "$paths_file" || { rm -f "$paths_file"; return 1; }
  while IFS= read -r -d '' path; do
    git --literal-pathspecs reset -q -- "$path" || { rm -f "$paths_file"; return 1; }
  done < "$paths_file"
  rm -f "$paths_file"
}

######################################################################
# .what = set the index to HEAD, with each file the park added marked
#         intent-to-add, in one swap
#
# .why  = an unstage alone leaves a new file untracked, so `git status`
#         reads it as `??` while the report lists it as carried, and a
#         later verb takes it for a stranger's file. the new index is built
#         in a temp file under the cutover dir, then renamed over the live
#         one: a kill or a failed step leaves the old index whole, never a
#         half with the park's adds untracked
#
# .note = --force: a park add the base's .gitignore matches was force-added
#         by the human, so the carry restores it as tracked, never refuses it
######################################################################
set_index_to_head_with_park_intents() {
  local index_live index_temp park
  index_live=$(git rev-parse --git-path index)
  index_temp="$(get_cutover_dir)/index.carry.$$"
  cp "$index_live" "$index_temp" || { rm -f "$index_temp"; return 1; }
  GIT_INDEX_FILE="$index_temp" git reset -q || { rm -f "$index_temp"; return 1; }
  if has_park; then
    park=$(get_park_ref)
    get_git_paths_nul diff --name-only --diff-filter=A "$park^" "$park" \
      | GIT_INDEX_FILE="$index_temp" xargs -0 -r git --literal-pathspecs add --force --intent-to-add -- \
      || { rm -f "$index_temp"; return 1; }
  fi
  mv -f "$index_temp" "$index_live"
}

######################################################################
# .what = does continue owe only the carry's close?
#
# .why  = a carry halt, a carry marked landed, or a carry whose edits sit
#         staged has laid every file down; its close touches the index
#         alone, and a rerun of it converges
#
# usage: is_carry_close_owed <halt>
######################################################################
is_carry_close_owed() {
  [[ "$1" == "carry-conflict" ]] && return 0
  is_cutover_in_carry || return 1
  is_carry_landed || ! is_index_clean
}

######################################################################
# .what = close a finished cutover: clear the state, then drop the park
#
# .why  = the order is the guarantee. while state exists, abort may run,
#         and abort resets the worktree; the park is what it lays back
#         down. drop the park first and a kill in between leaves abort
#         to reset the carried edits with no copy left. clear the state
#         first and a kill in between leaves only orphan park refs. an orphan
#         is inert: every read of the park asks the state first
#         (is_park_expected), and the next begin clears the slot
# .note = once the state is gone the trap's "state is kept" would lie, so
#         it is disarmed; a park drop that fails leaves an inert orphan,
#         named on stderr, and never costs the caller its report
######################################################################
del_state_then_park() {
  del_state
  del_cutover_unexpected_trap
  del_park_refs 2> /dev/null \
    || echo "note: the park refs under refs/worktree/cutover/ could not be dropped; they are inert, and the next begin clears them" >&2
}

# one line per rescue the state names, for a message; naught when none
get_rescue_lines() {
  local ref
  while IFS= read -r ref; do
    [[ -n "$ref" ]] || continue
    echo "rescue: $ref holds the worktree before the reset"
  done < <(get_state '.rescue_refs[]')
}

######################################################################
# .what = undo a cut that spent no unit, then report it: back on the
#         source, its edits in place, the new branch gone, the state and
#         park dropped, and the caller's message emitted with each rescue
#
# .why  = every back-out in phase "cut" walks this one ladder, so no site
#         can skip a rung (a branch left behind blocks the rerun as "target
#         extant"; a park left behind is an orphan)
#
# usage: back_out_cut kind=<malfunction|refusal> header=<text> [detail=<lines>] fix=<line>
#
# .note = whether the reset ran is a fact in the state, `.reset_begun`,
#         written just before the reset. the tree cannot tell it (a peer
#         write or an eol drift reads as "edits" after a reset), and a flag
#         held by each caller could be passed wrong at a new site. once the
#         reset began, the back-out is abort's own ladder, `undo_cutover`
# .note = a back-out that cannot finish keeps the state and the park, and
#         names abort; the park is dropped only after the edits are back
# .note = the message is emitted here, after the state is gone, so the
#         rescue lines it lists are read while the state still holds them
######################################################################
back_out_cut() {
  local kind="" header="" detail="" fix=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      kind=*) kind="${1#*=}" ;;
      header=*) header="${1#*=}" ;;
      detail=*) detail="${1#*=}" ;;
      fix=*) fix="${1#*=}" ;;
    esac
    shift
  done
  local into source_name source_sha reset_begun rescue_lines=""
  into=$(get_state '.into')
  source_name=$(get_state '.source_name')
  source_sha=$(get_state '.source_sha')
  reset_begun=$(get_state '.reset_begun')

  # after the reset: abort's ladder, so the edits come back by snapshot
  if [[ "$reset_begun" == "true" ]]; then
    if ! undo_cutover; then
      emit_cutover_malfunction "the back-out of the cut failed; the cutover state and the park of edits are kept" "$(
        {
          get_rescue_lines
          echo "safe: the edits stay parked at $(get_park_ref)"
          echo "fix: rhx git.branch.cutover abort"
        } | as_tree_children
      )"
    fi
    rescue_lines=$(get_rescue_lines)
  fi

  # before the reset no tracked file moved: off the new branch, if the cut
  # already switched to it, then drop the branch
  if [[ "$reset_begun" != "true" ]]; then
    if [[ "$(get_head_branch || true)" == "$into" && -n "$source_name" ]]; then
      set_head_branch "$source_name" > /dev/null
    fi
    if [[ "$(get_head_branch || true)" == "$into" && -z "$source_name" ]]; then
      set_head_detached "$source_sha" > /dev/null
    fi
    del_local_branch "$into"
  fi
  del_state_then_park

  # the caller's message, with each rescue the undo saved
  local children
  children=$(
    {
      [[ -z "$detail" ]] || echo "$detail"
      [[ -z "$rescue_lines" ]] || echo "$rescue_lines"
      echo "$fix"
    } | as_tree_children
  )
  "emit_cutover_$kind" "$header" "$children"
}

######################################################################
# .what = drop this process's claim at exit, if it never cut
#
# .why  = in phase "claim" no file has moved and no unit is spent. any
#         exit there (a refusal, a fault deep in a sourced helper that
#         calls exit) must free the slot, or the next begin reads "a
#         cutover is already in flight" and continue refuses the phase.
#         one exit release covers every path, so no site can escape
#
# .note = gated on CUTOVER_CLAIMED, set only once this process wins the
#         claim: a begin refused before that never drops a peer's state.
#         register it before the worktree lock, so the state drops first
######################################################################
CUTOVER_CLAIMED=""
del_state_if_claim_unspent() {
  [[ "$CUTOVER_CLAIMED" == "1" ]] || return 0
  is_cutover_in_flight || return 0
  is_cutover_past_claim && return 0
  del_state_then_park
}

######################################################################
# .what = the first behavioral (fix/feat) commit the new branch holds, if any
#
# .why  = git.commit.set refuses a second fix/feat on a branch; its own
#         oracle (`get_behavioral_commits_on_branch`) decides, so the hint
#         reads the same oracle rather than guess from the picks
#
# echoes: the subject of the first behavioral commit, or naught
######################################################################
get_first_behavioral_on_head() {
  local commits
  commits=$(get_behavioral_commits_on_branch)
  case "$commits" in
    NO_COMMITS | NO_BASE | ON_BASE) return 0 ;;
  esac
  head -n 1 <<< "$commits"
}

######################################################################
# .what = the type the next commit should lead with: fix, feat, or cont
#
# .why  = the report's next-step hint must name a type the new branch
#         accepts; a feat hint on a fix branch, or on a branch that already
#         holds a feat, walks into a refusal
#
# .note = the bind read, the name inference, and the behavioral-commit read
#         are the commit domain's own (`get_commit_level_bind`,
#         `infer_level_from_branch`, `get_behavioral_commits_on_branch`)
######################################################################
get_commit_lead_type() {
  local into="$1"
  local level
  if [[ -n "$(get_first_behavioral_on_head)" ]]; then
    echo "cont"
    return 0
  fi
  level=$(get_commit_level_bind)
  if [[ -z "$level" ]]; then
    level=$(infer_level_from_branch "$into")
  fi
  if [[ "$level" == "fix" ]]; then
    echo "fix"
    return 0
  fi
  echo "feat"
}

######################################################################
# .what = the commit level the new branch will enforce, and its source
#
# .why  = a4: a fix bind or a fix-shaped name refuses the next feat; the
#         caller must see that before the commit, not at it
######################################################################
get_commit_level_line() {
  local into="$1"
  local level inferred first
  first=$(get_first_behavioral_on_head)
  if [[ -n "$first" ]]; then
    echo "commit level: set by \"$first\" — the next commit leads with cont:"
    return 0
  fi
  level=$(get_commit_level_bind)
  if [[ -n "$level" ]]; then
    echo "commit level: $level (explicit bind) — $level leads"
    return 0
  fi
  inferred=$(infer_level_from_branch "$into")
  if [[ "$inferred" == "none" ]]; then
    echo "commit level: none set yet — the next commit may lead with feat or fix"
    return 0
  fi
  echo "commit level: $inferred (inferred from the name) — $inferred leads"
}