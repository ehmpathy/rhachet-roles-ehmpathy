#!/usr/bin/env bash
######################################################################
# .what = begin a cutover: move this tree's work onto a fresh branch
#
# .why  = a stale branch needs no repair; leave it. name what to keep —
#         these commits, this tree — and step onto clean ground
#
# usage:
#   rhx git.branch.cutover begin --from @main --into <branch>                    # plan
#   rhx git.branch.cutover begin --from @main --into <branch> --pick <sha>...    # plan, with picks
#   rhx git.branch.cutover begin --from @main --into <branch> --mode apply       # apply
#   rhx git.branch.cutover begin --from release/v2 --into <branch> --mode apply  # cut from origin/release/v2
#   rhx git.branch.cutover begin --from @tree --into <branch> --mode apply       # stack on HEAD
#
# guarantee:
#   - plan is the default; its one write is the fetch
#   - untracked files are never written, moved, or deleted
#   - tracked edits are parked + verified before any reset
#   - the new branch has no upstream; the source branch never moves
#   - never pushes; apply spends one git.branch.uses unit
#   - a conflict halts with exit 2 and names continue + abort
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SKILL_DIR/git.branch.cutover.operations.sh"

USAGE="usage: git.branch.cutover begin --from <@main|@tree|branch> --into <branch> [--pick <sha>]... [--mode plan|apply]"

######################################################################
# guard: within a git repo
######################################################################
if ! is_in_git_repo; then
  emit_cutover_refusal "not in a git repository" "└─ fix: run it from inside the repo whose work you cut over"
fi
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

######################################################################
# parse arguments
######################################################################
FROM=""
INTO=""
MODE="plan"
PICKS_RAW=()

# refuse a flag whose value is absent or is the next flag
guard_flag_value() {
  local flag="$1"
  local value="${2:-}"
  if [[ -z "$value" || "$value" == --* ]]; then
    emit_cutover_refusal "$flag needs a value" "└─ $USAGE"
  fi
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --skill|--repo|--role)
      # rhachet passthrough args with a value - ignore flag + value
      shift
      if [[ $# -gt 0 && "$1" != --* ]]; then
        shift
      fi
      ;;
    --from)
      guard_flag_value "--from" "${2:-}"
      FROM="$2"
      shift 2
      ;;
    --into)
      guard_flag_value "--into" "${2:-}"
      INTO="$2"
      shift 2
      ;;
    --pick)
      guard_flag_value "--pick" "${2:-}"
      PICKS_RAW+=("$2")
      shift 2
      ;;
    --mode)
      guard_flag_value "--mode" "${2:-}"
      MODE="$2"
      shift 2
      ;;
    --help|-h)
      echo "$USAGE"
      echo ""
      echo "move this tree's work onto a fresh branch: the commits you pick,"
      echo "and the uncommitted edits. the source branch stays as it was"
      echo ""
      echo "options:"
      echo "  --from @main      cut from fresh origin/main (else origin/master), after a fetch"
      echo "  --from <branch>   cut from fresh origin/<branch>, after a fetch"
      echo "  --from @tree      stack on this tree's HEAD; every commit is kept"
      echo "  --into <branch>   the new branch to cut over into (must not exist)"
      echo "  --pick <sha>      a commit to replay onto the new branch; repeat, in order"
      echo "  --mode plan       preview the cutover (default)"
      echo "  --mode apply      execute the cutover"
      echo ""
      echo "examples:"
      echo "  rhx git.branch.cutover begin --from @main --into turtle/wave-report-v2 --pick a1b2c3d"
      echo "  rhx git.branch.cutover begin --from @tree --into turtle/reef-shoals --mode apply"
      exit 0
      ;;
    *)
      emit_cutover_refusal "unknown argument: $1" "└─ $USAGE"
      ;;
  esac
done

validate_enum_arg "$MODE" "--mode" "$USAGE" plan apply

######################################################################
# preflight: the contract of the call (inv-15, inv-13)
######################################################################

# --from is required; there is no default base
if [[ -z "$FROM" ]]; then
  emit_cutover_refusal "--from is required; there is no default base" "$(printf '%s\n' \
    "--from @main      cut from fresh origin/main: rhx git.branch.cutover begin --from @main --into <branch>" \
    "--from @tree      stack on this tree's HEAD:  rhx git.branch.cutover begin --from @tree --into <branch>" \
    "--from <branch>   cut from origin/<branch>:   rhx git.branch.cutover begin --from release/v2 --into <branch>" \
    | as_tree_children)"
fi

# --into is required
if [[ -z "$INTO" ]]; then
  emit_cutover_refusal "--into is required: the new branch to cut over into" "└─ $USAGE"
fi

# --into must be a valid branch name
if ! is_valid_branch_name "$INTO"; then
  emit_cutover_refusal "--into $INTO is not a valid branch name" "└─ fix: choose a name git accepts, e.g. --into turtle/wave-report-v2"
fi

# --from names the branch origin holds: a remote-track spelling or HEAD
# gets the form it meant, before any network read
if [[ "$FROM" == origin/* ]]; then
  FROM_BARE="${FROM#origin/}"
  FROM_HINT="--from $FROM_BARE"
  if [[ "$FROM_BARE" == "main" || "$FROM_BARE" == "master" ]]; then
    FROM_HINT="--from @main (or --from $FROM_BARE)"
  fi
  emit_cutover_refusal "--from names the branch origin holds; drop the origin/ prefix" "$(printf '%s\n' \
    "why: the cutover reads origin itself, after a fetch" \
    "fix: $FROM_HINT" | as_tree_children)"
fi
if [[ "$FROM" == "HEAD" ]]; then
  emit_cutover_refusal "--from HEAD is spelled --from @tree" "$(printf '%s\n' \
    "why: @tree stacks on this tree's HEAD, with every commit kept" \
    "fix: --from @tree" | as_tree_children)"
fi

# --from must be @main, @tree, or a valid branch name
BASE_KIND="branch"
if [[ "$FROM" == "@main" || "$FROM" == "@tree" ]]; then
  BASE_KIND="$FROM"
fi
if [[ "$BASE_KIND" == "branch" ]] && ! is_valid_branch_name "$FROM"; then
  emit_cutover_refusal "--from $FROM is not @main, @tree, or a valid branch name" "└─ $USAGE"
fi

# --pick rides with @tree only to come back empty (inv-13)
if [[ "$BASE_KIND" == "@tree" && ${#PICKS_RAW[@]} -gt 0 ]]; then
  emit_cutover_refusal "--pick is refused with --from @tree" "$(printf '%s\n' \
    "why: @tree already holds every commit of this branch, so a pick would carry naught" \
    "fix: drop --pick, or cut --from @main and pick what to keep" \
    | as_tree_children)"
fi

# one sha per --pick; a range hides the order
for PICK in "${PICKS_RAW[@]+"${PICKS_RAW[@]}"}"; do
  if [[ "$PICK" == *..* ]]; then
    emit_cutover_refusal "--pick $PICK is a range; name one sha per --pick" "└─ fix: --pick <sha> --pick <sha>, in the order to replay"
  fi
done

######################################################################
# preflight: one git operation per worktree (inv-6)
######################################################################
if is_cutover_in_flight; then
  guard_state_schema
  HALTED_INTO=$(get_state '.into')
  HALTED_LINES=("into: $HALTED_INTO")
  if [[ "$(get_state '.halt')" == "pick-conflict" ]]; then
    HALTED_SHA=$(get_state ".picks[$(get_state '.pick_index')].sha")
    HALTED_LINES+=("halted on: $(get_short_sha "$HALTED_SHA") $(get_commit_subject "$HALTED_SHA")")
  fi
  if [[ "$(get_state '.halt')" == "carry-conflict" ]]; then
    HALTED_LINES+=("halted on: the carry of tracked edits")
  fi
  if has_park; then
    HALTED_LINES+=("tracked edits: held aside, safe")
  fi
  emit_cutover_refusal "a cutover is already in flight" "$(
    printf '%s\n' "${HALTED_LINES[@]}" "fix: finish or undo it first" | as_tree_children
    echo "   ├─ rhx git.branch.cutover continue"
    echo "   └─ rhx git.branch.cutover abort"
  )"
fi

FOREIGN_OP=$(get_foreign_op_in_flight)
if [[ -n "$FOREIGN_OP" ]]; then
  emit_cutover_refusal "a $FOREIGN_OP is already in flight" "$(
    echo "└─ fix: finish or undo it first"
    get_foreign_op_settle_lines "$FOREIGN_OP" | as_tree_children | sed 's/^/   /'
  )"
fi

UNMERGED=$(get_conflict_files)
if [[ -n "$UNMERGED" ]]; then
  emit_cutover_refusal "unmerged files sit in the index" "$(
    echo "├─ files"
    printf '%s\n' "$UNMERGED" | as_tree_children | sed 's/^/│  /'
    echo "└─ fix: settle and stage them, or reset them, then rerun"
  )"
fi

######################################################################
# preflight: the source
######################################################################
if ! SOURCE_SHA=$(get_head_sha); then
  emit_cutover_refusal "this tree has no commit to cut over from" "└─ fix: commit once, then rerun"
fi
SOURCE_NAME=""
if SYMBOLIC=$(get_head_branch); then
  SOURCE_NAME="$SYMBOLIC"
fi

######################################################################
# preflight: origin — the base, and the --into name check (inv-5, inv-1)
######################################################################
HAS_ORIGIN=false
if has_origin_remote; then
  HAS_ORIGIN=true
fi
if [[ "$HAS_ORIGIN" != "true" && "$BASE_KIND" != "@tree" ]]; then
  emit_cutover_refusal "no origin remote to cut --from $FROM" "└─ fix: add an origin remote, or cut --from @tree"
fi

REMOTE_HEADS=""
if [[ "$HAS_ORIGIN" == "true" ]]; then
  if ! REMOTE_HEADS=$(get_origin_heads); then
    # @tree needs no base; it reads origin only to prove --into is free there
    ORIGIN_NEED="no fresh base can be read"
    [[ "$BASE_KIND" == "@tree" ]] && ORIGIN_NEED="--into cannot be proven free on origin"
    emit_cutover_malfunction "could not reach origin, so $ORIGIN_NEED" "$(printf '%s\n' \
      "detail: $(as_git_error_detail "$REMOTE_HEADS")" \
      "fix: check the network and origin access, then rerun" | as_tree_children)"
  fi
fi

BASE_BRANCH=""
if [[ "$BASE_KIND" == "@main" ]]; then
  if [[ -n "$(get_remote_head_sha "$REMOTE_HEADS" main)" ]]; then
    BASE_BRANCH="main"
  fi
  if [[ -z "$BASE_BRANCH" && -n "$(get_remote_head_sha "$REMOTE_HEADS" master)" ]]; then
    BASE_BRANCH="master"
  fi
  if [[ -z "$BASE_BRANCH" ]]; then
    emit_cutover_refusal "origin has no main or master branch to cut --from @main" "└─ fix: name the base branch, e.g. --from <branch>"
  fi
fi
if [[ "$BASE_KIND" == "branch" ]]; then
  if [[ -z "$(get_remote_head_sha "$REMOTE_HEADS" "$FROM")" ]]; then
    emit_cutover_refusal "--from $FROM is not on origin" "$(printf '%s\n' \
      "checked: origin, after a fresh read of its heads" \
      "fix: push $FROM first, or name a branch origin has" | as_tree_children)"
  fi
  BASE_BRANCH="$FROM"
fi

# @tree cuts at the source's own HEAD; a named base below replaces it
BASE_SHA="$SOURCE_SHA"
BASE_LABEL="HEAD"
if [[ -n "$BASE_BRANCH" ]]; then
  if ! FETCH_OUT=$(set_origin_branch_fetched "$BASE_BRANCH"); then
    emit_cutover_malfunction "could not fetch origin/$BASE_BRANCH, so no fresh base can be cut" "$(printf '%s\n' \
      "detail: $(as_git_error_detail "$FETCH_OUT")" \
      "fix: check the network and origin access, then rerun" | as_tree_children)"
  fi
  BASE_SHA=$(get_origin_branch_sha "$BASE_BRANCH")
  BASE_LABEL="origin/$BASE_BRANCH"
fi

# --into must be free, locally and on origin
INTO_LOCAL_SHA=$(get_local_branch_sha "$INTO")
INTO_ORIGIN_SHA=$(get_remote_head_sha "$REMOTE_HEADS" "$INTO")
if [[ -n "$INTO_LOCAL_SHA" || -n "$INTO_ORIGIN_SHA" ]]; then
  LOCAL_LINE="local: no"
  [[ -n "$INTO_LOCAL_SHA" ]] && LOCAL_LINE="local: yes (@ $(get_short_sha "$INTO_LOCAL_SHA"))"
  ORIGIN_LINE="origin: no"
  [[ -n "$INTO_ORIGIN_SHA" ]] && ORIGIN_LINE="origin: yes (@ $(as_short_sha "$INTO_ORIGIN_SHA"))"
  # a rerun after a cutover that already finished lands here, on the very
  # branch it made: say so, so the retry does not cut a second branch
  INTO_FIX="fix: choose a fresh name, e.g. --into $INTO-v2"
  if [[ "$(get_head_branch || true)" == "$INTO" ]]; then
    INTO_FIX="HEAD is on $INTO already: a prior cutover may have finished (git log --oneline -5); else choose a fresh name"
  fi
  emit_cutover_refusal "--into $INTO already exists" "$(printf '%s\n' \
    "$LOCAL_LINE" "$ORIGIN_LINE" "$INTO_FIX" | as_tree_children)"
fi

# --into must not nest with a branch that stands: git keeps refs as paths,
# so feat/foo and feat/foo/v2 cannot both exist, locally or on origin
INTO_NEST_LINES=$(get_branch_name_nest_lines "$INTO" "$REMOTE_HEADS")
if [[ -n "$INTO_NEST_LINES" ]]; then
  # under a branch that stands (feat/foo/v2 under feat/foo): fold the last
  # slash into a dash, so it sits beside it. over one (feat over feat/foo): -v2
  INTO_BESIDE="$INTO-v2"
  if [[ "$INTO" == */* ]] && grep -qxF -e "local: ${INTO%/*}" -e "origin: ${INTO%/*}" <<< "$INTO_NEST_LINES"; then
    INTO_BESIDE="${INTO%/*}-${INTO##*/}"
  fi
  emit_cutover_refusal "--into $INTO nests with a branch that already stands" "$(
    printf '%s\n' "$INTO_NEST_LINES" "why: git stores a branch as a path, so one name cannot sit inside another" \
      "fix: choose a name beside it, e.g. --into $INTO_BESIDE" | as_tree_children)"
fi

######################################################################
# preflight: picks — real commits, never merges (inv-2, inv-3)
######################################################################
PICKS=()
PICKS_UNKNOWN=()
PICKS_MERGE=()
for PICK in "${PICKS_RAW[@]+"${PICKS_RAW[@]}"}"; do
  if ! PICK_SHA=$(get_commit_sha "$PICK"); then
    PICKS_UNKNOWN+=("$PICK")
    continue
  fi
  if is_merge_commit "$PICK_SHA"; then
    PICKS_MERGE+=("$(get_short_sha "$PICK_SHA") $(get_commit_subject "$PICK_SHA")")
    continue
  fi
  PICKS+=("$PICK_SHA")
done
if [[ ${#PICKS_UNKNOWN[@]} -gt 0 ]]; then
  emit_cutover_refusal "--pick names a commit this repo does not hold" "$(
    echo "├─ unknown"
    printf '%s\n' "${PICKS_UNKNOWN[@]}" | as_tree_children | sed 's/^/│  /'
    echo "└─ fix: check each sha, or fetch the branch that holds it"
  )"
fi
if [[ ${#PICKS_MERGE[@]} -gt 0 ]]; then
  emit_cutover_refusal "--pick names a merge commit, which needs a mainline choice" "$(
    echo "├─ merge commits"
    printf '%s\n' "${PICKS_MERGE[@]}" | as_tree_children | sed 's/^/│  /'
    echo "└─ fix: pick the commits the merge brought in, one by one"
  )"
fi

######################################################################
# preflight: untracked work is never at risk (inv-0)
######################################################################
if [[ "$BASE_KIND" != "@tree" ]]; then
  COLLISIONS=$(get_untracked_collision_lines "$BASE_SHA" "$BASE_LABEL" "${PICKS[@]+"${PICKS[@]}"}")
  if [[ -n "$COLLISIONS" ]]; then
    emit_cutover_refusal "untracked files would be overwritten by the new base" "$(
      echo "├─ untouched, still on disk"
      as_collision_lines "$COLLISIONS" | as_tree_children | sed 's/^/│  /'
      echo "└─ fix: move or rename each file above, then rerun the same command"
    )"
  fi
fi

######################################################################
# the view: tracked edits, untracked files, left behind, pick previews
######################################################################
TRACKED_LINES=$(get_tracked_edit_lines)
UNTRACKED_LINES=$(get_untracked_files)
LEFT_BEHIND_LINES=""
if [[ "$BASE_KIND" != "@tree" ]]; then
  LEFT_BEHIND_LINES=$(get_left_behind_lines "$BASE_SHA" "$SOURCE_SHA" "$BASE_LABEL" "${PICKS[@]+"${PICKS[@]}"}")
fi
SOURCE_LABEL="${SOURCE_NAME:-$(get_short_sha "$SOURCE_SHA")}"

######################################################################
# plan: preview, then exit
######################################################################
if [[ "$MODE" == "plan" ]]; then
  SECTIONS=()
  SECTIONS+=("source: $(get_source_label "$SOURCE_NAME" "$SOURCE_SHA" "$BASE_KIND")")
  BASE_LINE="base: $(get_base_label_line "$BASE_LABEL" "$BASE_SHA" "$BASE_KIND")"
  [[ "$BASE_KIND" != "@tree" ]] && BASE_LINE="$BASE_LINE (fetched)"
  SECTIONS+=("$BASE_LINE")
  SECTIONS+=("into: $INTO (new, no upstream)")
  SECTIONS+=("$(get_plan_quota_line)")

  if [[ ${#PICKS[@]} -gt 0 ]]; then
    SECTIONS+=("picks (${#PICKS[@]}, in order)"$'\n'"$(get_plan_pick_lines "$BASE_SHA" "$BASE_LABEL" "${PICKS[@]}" | as_tree_children)")
  fi

  if [[ -n "$LEFT_BEHIND_LINES" ]]; then
    LEFT_COUNT=$(get_line_count "$LEFT_BEHIND_LINES")
    SECTIONS+=("left behind on $SOURCE_LABEL ($LEFT_COUNT, not picked)"$'\n'"$(printf '%s\n' "$LEFT_BEHIND_LINES" | as_bounded_lines 20 "git log --oneline $(get_short_sha "$BASE_SHA")..$(get_short_sha "$SOURCE_SHA")" | as_tree_children)")
  fi

  if [[ -n "$TRACKED_LINES" ]]; then
    TRACKED_COUNT=$(get_line_count "$TRACKED_LINES")
    TRACKED_NOTE="will park, verify, and carry, unstaged"
    [[ "$BASE_KIND" == "@tree" ]] && TRACKED_NOTE="stay in place, still uncommitted"
    SECTIONS+=("tracked edits ($TRACKED_COUNT) — $TRACKED_NOTE"$'\n'"$(printf '%s\n' "$TRACKED_LINES" | as_bounded_lines 20 "git status --short" | as_tree_children)")
  fi

  # foresee the carry halt: an edit to a file the new branch lacks
  CARRY_HALT_LINES=""
  if [[ -n "$TRACKED_LINES" && "$BASE_KIND" != "@tree" ]]; then
    CARRY_HALT_LINES=$(printf '%s\n' "$TRACKED_LINES" | get_carry_halt_lines "$BASE_SHA" "$SOURCE_SHA" "${PICKS[@]+"${PICKS[@]}"}")
  fi
  if [[ -n "$CARRY_HALT_LINES" ]]; then
    CARRY_HALT_COUNT=$(get_line_count "$CARRY_HALT_LINES")
    SECTIONS+=("carry will halt ($CARRY_HALT_COUNT) — edits to files the new branch lacks"$'\n'"$( {
      printf '%s\n' "$CARRY_HALT_LINES" | as_bounded_lines 20 "git status --short"
      echo "fix: --pick the commit named, or commit or drop the edit first"
    } | as_tree_children)")
  fi

  if [[ -n "$UNTRACKED_LINES" ]]; then
    UNTRACKED_COUNT=$(get_line_count "$UNTRACKED_LINES")
    SECTIONS+=("untracked ($UNTRACKED_COUNT) — untouched"$'\n'"$(as_untracked_marker_lines "$UNTRACKED_LINES" | as_bounded_lines 20 "git status --short" | as_tree_children)")
  fi

  print_turtle_header "heres the wave..."
  print_tree_start "git.branch.cutover begin --mode plan"
  print_tree_sections "${SECTIONS[@]}"
  echo ""
  # no picks named: this plan is where the caller learns the shas, so say
  # how to carry them
  if [[ ${#PICKS[@]} -eq 0 && -n "$LEFT_BEHIND_LINES" ]]; then
    echo "to carry a left-behind commit, name it: --pick <sha> (repeatable, applied in order)"
  fi
  echo "run with --mode apply to execute"
  exit 0
fi

######################################################################
# apply: record state first, so abort can always find its way back
######################################################################
export GIT_COMMITTER_NAME="$CUTOVER_BOT_NAME"
export GIT_COMMITTER_EMAIL="$CUTOVER_BOT_EMAIL"

# a claim that never cuts is dropped at any exit; registered before the
# worktree lock, so the state drops before the lock frees
add_pid_lock_exit_release del_state_if_claim_unspent

# hold the worktree lock for the whole apply, so no continue or abort
# can act on the state while this begin writes it (inv-6)
guard_cutover_lock

# claim this worktree's one cutover slot: of two begins that raced past
# the in-flight check, exactly one claims (inv-6)
STATE_JSON=$(as_cutover_state_json \
  into="$INTO" source_name="$SOURCE_NAME" source_sha="$SOURCE_SHA" base_kind="$BASE_KIND" \
  base_label="$BASE_LABEL" base_sha="$BASE_SHA" \
  tracked="$TRACKED_LINES" untracked="$UNTRACKED_LINES" left_behind="$LEFT_BEHIND_LINES" \
  -- "${PICKS[@]+"${PICKS[@]}"}")
if ! set_state_json_exclusive "$STATE_JSON"; then
  emit_cutover_refusal "a cutover is already in flight" "$(printf '%s\n' \
    "why: a peer begin claimed this worktree first" \
    "fix: let it finish, or undo it: rhx git.branch.cutover abort" | as_tree_children)"
fi
CUTOVER_CLAIMED="1"
# from here on the state exists: any unexpected failure renders as a
# malfunction that keeps the state, so abort can undo it
set_cutover_unexpected_trap "$(printf '%s\n' \
  "resume, once the cause is cleared: rhx git.branch.cutover continue" \
  "or undo: rhx git.branch.cutover abort")"

# an orphan park, left by a prior cutover killed after its state cleared,
# belongs to no cutover now; the claim makes it safe to drop
del_park_refs

# the meter gates under the claim and the meter lock (inv-12): the claim
# makes this begin the worktree's only spender, and the meter lock keeps a
# human's `set` from a write between the gate and the spend
if ! set_branch_meter_lock; then
  emit_cutover_refusal "the cutover quota is busy: a grant writes it right now" \
    "└─ fix: rerun once the grant finishes"
fi
METER_RC=0
METER_OUT=$(guard_branch_uses_granted cmd="git.branch.cutover begin" 2> /dev/null) || METER_RC=$?
if [[ "$METER_RC" -ne 0 ]]; then
  emit_both "$METER_OUT"
  exit "$METER_RC"
fi

# re-read tracked edits under the claim: the preflight view is stale by
# a fetch and a plan, and an edit saved since then must be parked too
TRACKED_LINES=$(get_tracked_edit_lines)
set_state_via_jq '.tracked = $t' --argjson t "$(printf '%s\n' "$TRACKED_LINES" | as_json_array)"

# park + verify tracked edits before any reset (inv-10); @tree moves no file
if [[ -n "$TRACKED_LINES" && "$BASE_KIND" != "@tree" ]]; then
  PARK_RC=0
  park_tracked_edits "$INTO" "$SOURCE_SHA" || PARK_RC=$?
  if [[ "$PARK_RC" -eq 1 ]]; then
    emit_cutover_malfunction "the park of tracked edits did not match the worktree; naught changed" \
      "└─ fix: rerun; if it recurs, commit or stash the edits by hand first"
  fi
  if [[ "$PARK_RC" -ne 0 ]]; then
    emit_cutover_malfunction "the park refs could not be written; naught changed, the edits stay in the worktree" "$(printf '%s\n' \
      "expected: $(get_park_ref) and $(get_park_index_ref)" \
      "fix: clear what blocks a ref write (a stale .lock, a full disk, a read-only refs dir), then rerun" | as_tree_children)"
  fi
fi

set_state_via_jq '.phase = "cut"'

######################################################################
# apply: cut — the new branch, no upstream, checked out here (inv-7)
######################################################################
# every back-out from here to the spend walks one ladder: back_out_cut
if [[ "$BASE_KIND" == "@tree" ]]; then
  if ! CUT_OUT=$(set_branch_cut_here "$INTO"); then
    back_out_cut "$INTO" "$SOURCE_NAME" "$SOURCE_SHA"
    emit_cutover_malfunction "the cut of $INTO failed; naught changed" "$(printf '%s\n' \
      "detail: $(as_git_error_detail "$CUT_OUT")" \
      "fix: read the detail, clear its cause, then rerun" | as_tree_children)"
  fi
fi
if [[ "$BASE_KIND" != "@tree" ]]; then
  if ! CUT_OUT=$(set_branch_cut "$INTO" "$BASE_SHA"); then
    back_out_cut "$INTO" "$SOURCE_NAME" "$SOURCE_SHA"
    emit_cutover_malfunction "the cut of $INTO failed; naught changed" "$(printf '%s\n' \
      "detail: $(as_git_error_detail "$CUT_OUT")" \
      "fix: read the detail, clear its cause, then rerun" | as_tree_children)"
  fi

  # the reset runs only over a worktree the park holds byte for byte; an
  # edit saved after the park backs the cut out, with naught reset
  if ! is_worktree_held_by_park; then
    back_out_cut "$INTO" "$SOURCE_NAME" "$SOURCE_SHA"
    emit_cutover_refusal "tracked edits changed while the cutover ran; naught changed" "$(printf '%s\n' \
      "why: an edit was saved after the park, so a reset would lose it" \
      "fix: let the other editor finish, then rerun the same command" | as_tree_children)"
  fi
  del_worktree_tracked_edits
  CHECKOUT_RC=0
  CHECKOUT_OUT=$(set_head_branch "$INTO") || CHECKOUT_RC=$?
  # a post-checkout hook's failure is the checkout's exit code, though the
  # switch already ran: HEAD on $INTO means the cut stands, so drive on
  if [[ "$CHECKOUT_RC" -ne 0 && "$(get_head_branch || true)" != "$INTO" ]]; then
    back_out_cut "$INTO" "$SOURCE_NAME" "$SOURCE_SHA"
    emit_cutover_malfunction "the switch to $INTO failed; the source and its edits are restored" "$(printf '%s\n' \
      "detail: $(as_git_error_detail "$CHECKOUT_OUT")" \
      "fix: read the detail, clear its cause, then rerun" | as_tree_children)"
  fi
fi

# the report says "no upstream": prove it before the unit is spent (inv-7)
if has_branch_upstream "$INTO"; then
  UPSTREAM_SEEN=$(git rev-parse --abbrev-ref "$INTO@{upstream}" 2> /dev/null || echo unknown)
  back_out_cut "$INTO" "$SOURCE_NAME" "$SOURCE_SHA"
  emit_cutover_malfunction "$INTO still resolved an upstream after the cut; naught changed" "$(printf '%s\n' \
    "upstream: $UPSTREAM_SEEN" \
    "fix: git config --remove-section branch.$INTO, then rerun" | as_tree_children)"
fi

# spend one unit: the branch now stands and is checked out. a cut that
# backed out spent none, as a failed commit spends no commit quota.
# this begin took the meter lock before its gate, so it frees it here,
# before the picks run, so a human's grant need not wait out the drive
# .note = the spend and the phase write are two steps. a kill between them
#         leaves phase "cut", so abort says no unit was spent when one was.
#         a `unit_spent` fact written with the spend closes it (dream:
#         2026_10_21.fix-cutover-position-table-and-shared-leaves, item 11)
spend_branch_use
del_branch_meter_lock
set_state_via_jq '.phase = "picks"'

######################################################################
# apply: replay the picks, carry the edits, report, clear
######################################################################
drive_cutover "git.branch.cutover begin --mode apply"