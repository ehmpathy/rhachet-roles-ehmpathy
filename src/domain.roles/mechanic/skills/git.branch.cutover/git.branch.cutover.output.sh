#!/usr/bin/env bash
######################################################################
# .what = render leaves for git.branch.cutover begin | continue | abort
#
# .why  = the verbs share one shape for every tree, refusal, report, and
#         halt; the render lives apart from the state machine it reads, as
#         each skill's own output.sh does
#
# usage:
#   source "$CUTOVER_SKILL_DIR/git.branch.cutover.output.sh"
#
# guarantee:
#   - pure at source time: functions only, no top-level command
#   - reads state via get_state at call time; sourced by the operations
######################################################################

######################################################################
# .what = stdin lines → lines with ├─ / └─ glyphs
#
# .why  = every list in every render (picks, left behind, files, fixes)
#         feeds through one pipe, so the last child always gets └─
######################################################################
as_tree_children() {
  local lines=()
  local line
  while IFS= read -r line; do
    [[ -n "$line" ]] && lines+=("$line")
  done
  local n=${#lines[@]}
  local i
  for ((i = 0; i < n; i++)); do
    if [[ $i -eq $((n - 1)) ]]; then
      echo "└─ ${lines[$i]}"
      continue
    fi
    echo "├─ ${lines[$i]}"
  done
}

# one word, quoted for a copy-paste hint: a ref name may hold ; $ ( and the like
as_shell_word() {
  printf '%q' "$1"
}

######################################################################
# .what = print root sections; each arg is a block: line 1 = head,
#         rest = glyph'd children
#
# .why  = a section's trunk glyph depends on whether it is last; callers
#         build sections as data and let this decide ├─ vs └─ and │ vs gap
######################################################################
print_tree_sections() {
  local total=$#
  local i=0
  local block head rest line
  for block in "$@"; do
    i=$((i + 1))
    head="${block%%$'\n'*}"
    if [[ $i -eq $total ]]; then
      echo "   └─ $head"
    fi
    if [[ $i -ne $total ]]; then
      echo "   ├─ $head"
    fi
    if [[ "$block" != *$'\n'* ]]; then
      continue
    fi
    rest="${block#*$'\n'}"
    while IFS= read -r line; do
      if [[ $i -eq $total ]]; then
        echo "      $line"
        continue
      fi
      echo "   │  $line"
    done <<< "$rest"
  done
}

######################################################################
# .what = a refusal: header, one ConstraintError leaf, glyph'd children;
#         both streams, exit 2
#
# .why  = the caller must fix the input; exit 2 says so, and stdout +
#         stderr both carry it (rule.require.skill-output-streams)
######################################################################
emit_cutover_refusal() {
  local message="$1"
  local children="${2:-}"
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.branch.cutover"
    print_tree_constraint "$message"
    if [[ -n "$children" ]]; then
      while IFS= read -r line; do
        echo "      $line"
      done <<< "$children"
    fi
  )"
  exit 2
}

######################################################################
# .what = the refusal for an edit hidden from git status by an index flag
#
# .why  = one render for both checks in begin: the preflight, and the
#         re-read under the claim
#
# usage: emit_hidden_edit_refusal "<h|S path lines>"
######################################################################
emit_hidden_edit_refusal() {
  emit_cutover_refusal "edits hidden from git status would be erased by the cut" "$(
    echo "├─ untouched, still on disk"
    printf '%s\n' "$1" | sed -e 's/^h /assume-unchanged: /' -e 's/^S /skip-worktree: /' | as_tree_children | sed 's/^/│  /'
    echo "└─ fix: clear the flag on each file above, then rerun the same command"
    echo "   ├─ git update-index --no-assume-unchanged <path>"
    echo "   └─ git update-index --no-skip-worktree <path>"
  )"
}

######################################################################
# .what = a malfunction: header, one MalfunctionError leaf, glyph'd
#         children; both streams, exit 1
#
# .why  = the system failed, not the input; exit 1 says a retry may help,
#         and each caller names where the work is held safe
######################################################################
emit_cutover_malfunction() {
  local message="$1"
  local children="${2:-}"
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.branch.cutover"
    print_tree_malfunction "$message"
    if [[ -n "$children" ]]; then
      while IFS= read -r line; do
        echo "      $line"
      done <<< "$children"
    fi
  )"
  exit 1
}

# the "source:" value: "<branch> @ sha7", or the sha alone when detached
get_source_label() {
  local source_name="$1"
  local source_sha="$2"
  local base_kind="$3"
  local label
  label="$(get_short_sha "$source_sha")"
  if [[ -n "$source_name" ]]; then
    label="$source_name @ $label"
  fi
  if [[ "$base_kind" == "@tree" ]]; then
    label="@tree → $label"
  fi
  echo "$label"
}

# the "base:" value
get_base_label_line() {
  local base_label="$1"
  local base_sha="$2"
  local base_kind="$3"
  if [[ "$base_kind" == "@tree" ]]; then
    echo "$(get_short_sha "$base_sha") (HEAD; stacked, all history kept)"
    return 0
  fi
  echo "$base_label @ $(get_short_sha "$base_sha")"
}

######################################################################
# .what = the picks block from state, one line per pick
#
# .why  = the report and the halt both show each pick's fate (landed,
#         dropped, conflict, waits); one renderer keeps them in step
######################################################################
get_picks_block_from_state() {
  local total i sha status new reason line
  total=$(get_state '.picks | length')
  if [[ "$total" -eq 0 ]]; then
    return 0
  fi
  echo "picks ($total, in order)"
  for ((i = 0; i < total; i++)); do
    sha=$(get_state ".picks[$i].sha")
    status=$(get_state ".picks[$i].status")
    new=$(get_state ".picks[$i].new")
    reason=$(get_state ".picks[$i].reason")
    line="$((i + 1)). $(get_short_sha "$sha")"
    case "$status" in
      landed)
        line="$line → $(get_short_sha "$new") $(get_commit_subject "$sha") ✓"
        ;;
      dropped)
        line="$line $(get_commit_subject "$sha") — dropped, $reason"
        ;;
      conflict)
        line="$line ✋ conflict"
        ;;
      *)
        line="$line (waits)"
        ;;
    esac
    echo "$line"
  done | as_tree_children
}

######################################################################
# .what = the success report, from state (begin apply + continue)
#
# .why  = step 5: what landed, what was left behind, what rode along, and
#         the commit level — read from state, so continue reports as begin
######################################################################
print_cutover_report() {
  local header_cmd="$1"
  local into source_name source_sha base_kind base_label base_sha
  into=$(get_state '.into')
  source_name=$(get_state '.source_name')
  source_sha=$(get_state '.source_sha')
  base_kind=$(get_state '.base_kind')
  base_label=$(get_state '.base_label')
  base_sha=$(get_state '.base_sha')

  local sections=()
  sections+=("source: $(get_source_label "$source_name" "$source_sha" "$base_kind") (untouched)")
  sections+=("base: $(get_base_label_line "$base_label" "$base_sha" "$base_kind")")
  sections+=("into: $into (checked out, no upstream)")

  local picks_block
  picks_block=$(get_picks_block_from_state)
  [[ -n "$picks_block" ]] && sections+=("$picks_block")

  local left_count left_lines
  left_count=$(get_state '.left_behind | length')
  if [[ "$left_count" -gt 0 ]]; then
    left_lines=$(get_state '.left_behind[]' | as_bounded_lines 20 "git log --oneline $(get_short_sha "$base_sha")..$(get_short_sha "$source_sha")" | as_tree_children)
    sections+=("left behind on ${source_name:-$(get_short_sha "$source_sha")} ($left_count, not picked)"$'\n'"$left_lines")
  fi

  local tracked_count tracked_lines tracked_note
  tracked_count=$(get_state '.tracked | length')
  if [[ "$tracked_count" -gt 0 ]]; then
    tracked_lines=$(get_state '.tracked[]' | as_bounded_lines 20 "git status --short" | as_tree_children)
    tracked_note="parked, verified, carried, unstaged"
    if [[ "$base_kind" == "@tree" ]]; then
      tracked_note="in place, still uncommitted"
    fi
    sections+=("tracked edits ($tracked_count) ✓ $tracked_note"$'\n'"$tracked_lines")
  fi

  local untracked_count untracked_lines
  untracked_count=$(get_state '.untracked | length')
  if [[ "$untracked_count" -gt 0 ]]; then
    untracked_lines=$(get_state '.untracked[] | "? " + .' | as_bounded_lines 20 "git status --short" | as_tree_children)
    sections+=("untracked ($untracked_count) ✓ untouched, still on disk"$'\n'"$untracked_lines")
  fi

  # a path staged past a pick stayed out of its commit; name each
  local unstaged_section
  unstaged_section=$(get_unstaged_section)
  [[ -z "$unstaged_section" ]] || sections+=("$unstaged_section")

  # a tracked edit made mid-halt rode the drive; its copy is named here
  local section
  while IFS= read -r -d '' section; do
    sections+=("$section")
  done < <(get_rescue_sections_from_state note="a copy of an edit made mid-halt, still on disk")

  # the plan named the spend; the report names what landed
  local quota_line
  quota_line=$(get_report_quota_line)
  [[ -z "$quota_line" ]] || sections+=("$quota_line")
  sections+=("$(get_commit_level_line "$into")")

  print_turtle_header "righteous!"
  print_tree_start "$header_cmd"
  print_tree_sections "${sections[@]}"
  print_rescue_coconut_hint

  # next moves: a commit when edits rode along, then the paved push
  local next_moves=()
  if [[ "$tracked_count" -gt 0 ]]; then
    next_moves+=("printf '$(get_commit_lead_type "$into")(scope): ...' | rhx git.commit.set -m @stdin --mode apply")
    next_moves+=("rhx git.commit.push --mode apply")
    print_coconut_hint "the new branch lives here alone; commit, then push it when ready" "${next_moves[@]}"
    return 0
  fi

  # a cutover with an empty carry: the branch sits on the base with no work carried, so
  # there is no push owed yet
  if is_cutover_empty_carry; then
    print_coconut_hint "no work carried; commit new work, then push it" \
      "printf '$(get_commit_lead_type "$into")(scope): ...' | rhx git.commit.set -m @stdin --mode apply"
    return 0
  fi

  # no commit of ours will sit on top: git.commit.push pushes only a HEAD the
  # seaturtle authored, so a human-authored pick at HEAD needs a human push
  local head_author
  head_author=$(git log -1 --format='%an')
  if ! is_one_seaturtle_identity_name "$head_author"; then
    print_coconut_hint "the new branch lives here alone; HEAD is authored by $head_author, so rhx git.commit.push will refuse it — ask your human to push" \
      "git push -u origin $(as_shell_word "$into")"
    return 0
  fi
  print_coconut_hint "the new branch lives here alone; push it when ready" "rhx git.commit.push --mode apply"
}

# one rescue's report section: the ref and what it holds; its moves ride the 🥥 hint
get_rescue_section() {
  local ref="$1" note="$2"
  echo "rescue: $ref — $note"
}

######################################################################
# .what = the 🥥 hint that names the way back to each rescue, or naught
#
# .why  = a recovery path is a next move, not a state line: the tree names
#         which ref holds the copy, the hint names how to restore and drop it
######################################################################
print_rescue_coconut_hint() {
  local ref moves=()
  while IFS= read -r ref; do
    [[ -n "$ref" ]] || continue
    moves+=("git checkout $ref -- <path>")
    moves+=("git update-ref -d $ref")
  done < <(get_state '.rescue_refs[]')
  [[ "${#moves[@]}" -gt 0 ]] || return 0
  print_coconut_hint "restore a file from its rescue, then drop the rescue once done" "${moves[@]}"
}

######################################################################
# .what = the section that names each path continue unstaged, or naught
#
# .why  = a path staged past a pick stays out of the pick's commit; the
#         human staged it, so the report says where it went
######################################################################
get_unstaged_section() {
  local count
  count=$(get_state '(.unstaged // []) | length')
  [[ "$count" -gt 0 ]] || return 0
  echo "unstaged ($count) — staged past the pick, kept out of its commit; still on disk"
  get_state_paths_nul unstaged | as_display_lines_from_nul | as_tree_children
}

######################################################################
# .what = one section per rescue the state names, each NUL-terminated
#
# .why  = the report, the abort report, and the halt each name every
#         rescue; one leaf walks .rescue_refs[] for all three
#
# usage: get_rescue_sections_from_state note=<what the rescue holds>
######################################################################
get_rescue_sections_from_state() {
  local note="${1#note=}" ref
  while IFS= read -r ref; do
    [[ -n "$ref" ]] || continue
    printf '%s\0' "$(get_rescue_section "$ref" "$note")"
  done < <(get_state '.rescue_refs[]')
}

######################################################################
# .what = the abort report, from state, before the state is cleared
#
# .why  = abort renders, clears, then prints, as finish_cutover does: the
#         report is the one place that names each rescue, so it is built
#         while the state still holds them
######################################################################
print_cutover_abort_report() {
  local into source_name source_sha tracked_count head_sha back_on_note section
  into=$(get_state '.into')
  source_name=$(get_state '.source_name')
  source_sha=$(get_state '.source_sha')
  tracked_count=$(get_state '.tracked | length')
  head_sha=$(get_head_sha)

  local sections=()
  back_on_note="(untouched)"
  if [[ "$head_sha" != "$source_sha" ]]; then
    back_on_note="(moved since the cutover began: now @ $(get_short_sha "$head_sha"))"
  fi
  sections+=("back on: $(get_source_label "$source_name" "$source_sha" "") $back_on_note")
  # is_park_expected reads only the state, which the undo leaves as is
  if is_park_expected; then
    local tracked_lines
    tracked_lines=$(get_state '.tracked[]' | as_bounded_lines 20 "git status --short" | as_tree_children)
    sections+=("tracked edits ($tracked_count) ✓ restored from park"$'\n'"$tracked_lines")
  fi
  local untracked_count untracked_lines
  untracked_count=$(get_state '.untracked | length')
  # untracked files are never touched; name them in the shape apply uses
  if [[ "$untracked_count" -eq 0 ]]; then
    sections+=("untracked: untouched throughout")
  fi
  if [[ "$untracked_count" -gt 0 ]]; then
    untracked_lines=$(get_state '.untracked[] | "? " + .' | as_bounded_lines 20 "git status --short" | as_tree_children)
    sections+=("untracked ($untracked_count) ✓ untouched, still on disk"$'\n'"$untracked_lines")
  fi
  while IFS= read -r -d '' section; do
    sections+=("$section")
  done < <(get_rescue_sections_from_state note="the worktree before the reset")
  if is_cutover_past_claim; then
    sections+=("removed: $into (made by this cutover, never pushed)")
  fi
  if is_unit_spent; then
    sections+=("quota: the cutover unit stays spent; abort refunds none")
  fi
  if is_cutover_before_switch; then
    sections+=("quota: no unit was spent; the cutover stopped before its switch")
  fi

  print_turtle_header "all good, paddled back"
  print_tree_start "git.branch.cutover abort"
  print_tree_sections "${sections[@]}"
  print_rescue_coconut_hint
}

######################################################################
# .what = the halt's stage section, when this tree holds no live commit grant
#
# .why  = `rhx git.stage.add` rides the live commit grant (held, uses
#         left); with none, the settle step refuses and abort is the one exit
#
# echoes: a section block, or naught when the commit grant is live
######################################################################
get_halt_stage_block() {
  local global_file
  # the same two gates git.stage.add holds, in its order: the commit
  # meter's global blocker first, then this repo's commit grant. the global
  # path is named outright: this process is scoped to the branch meter
  global_file="$HOME/.rhachet/storage/repo=ehmpathy/role=mechanic/.meter/git.commit.uses.jsonc"
  if [[ -f "$global_file" ]] && [[ "$(jq -r '.blocked // false' "$global_file" 2> /dev/null)" == "true" ]]; then
    printf '%s\n' \
      "stage: ✋ mechanic ops are blocked globally, so rhx git.stage.add will refuse" \
      "└─ ask your human: rhx git.commit.uses allow --global"
    return 0
  fi

  # the one commit-grant reader git.stage.add itself reads (damage = not live)
  get_one_commit_local_grant file="$(git rev-parse --show-toplevel)/.meter/git.commit.uses.jsonc" || true
  [[ "$COMMIT_LIVE" != "true" ]] || return 0
  printf '%s\n' \
    "stage: ✋ no live commit grant, so rhx git.stage.add will refuse" \
    "└─ ask your human: rhx git.commit.uses set --quant N"
}

######################################################################
# .what = the halt render for a pick conflict or a carry conflict
#
# .why  = a halt is a constraint the caller settles (exit 2): it names the
#         files, where the edits are held safe, and both settle verbs
######################################################################
print_cutover_halt() {
  local header_cmd="$1"
  local into halt conflict_files
  into=$(get_state '.into')
  halt=$(get_state '.halt')
  conflict_files=$(get_conflict_file_lines)

  local sections=()
  sections+=("into: $into (checked out, no upstream)")

  local picks_block
  picks_block=$(get_picks_block_from_state)
  [[ -n "$picks_block" ]] && sections+=("$picks_block")

  local file_lines tracked_count
  file_lines=$(printf '%s\n' "$conflict_files" | as_tree_children | sed 's/^/   /')
  tracked_count=$(get_state '.tracked | length')

  if [[ "$halt" == "pick-conflict" ]]; then
    local index sha
    index=$(get_state '.pick_index')
    sha=$(get_state ".picks[$index].sha")
    sections+=("conflict"$'\n'"├─ commit: $(get_short_sha "$sha") $(get_commit_subject "$sha")"$'\n'"└─ files"$'\n'"$file_lines")
    if [[ "$tracked_count" -gt 0 ]]; then
      sections+=("tracked edits ($tracked_count) held aside, safe at $(get_park_ref)")
    fi
  fi

  if [[ "$halt" == "carry-conflict" ]]; then
    sections+=("tracked edits ✋ conflict on carry"$'\n'"└─ files"$'\n'"$file_lines")
    sections+=("safe: original tracked edits held at $(get_park_ref)")
  fi

  # a path a continue unstaged, and its copy, are named at the next halt too
  local unstaged_section section
  unstaged_section=$(get_unstaged_section)
  [[ -z "$unstaged_section" ]] || sections+=("$unstaged_section")
  while IFS= read -r -d '' section; do
    sections+=("$section")
  done < <(get_rescue_sections_from_state note="a copy of an edit made mid-halt, still on disk")

  # the settle step stages through git.stage.add, which needs its own grant;
  # say so here, before a mechanic with only a cutover grant meets the wall
  local stage_block
  stage_block=$(get_halt_stage_block)
  [[ -z "$stage_block" ]] || sections+=("$stage_block")
  sections+=("quota: the cutover unit is spent; abort refunds none")

  # the halt is a constraint the caller settles, so its leaf names the class
  local halt_message="halted: the carry of tracked edits conflicts"
  if [[ "$halt" == "pick-conflict" ]]; then
    halt_message="halted: a pick conflicts"
  fi

  # where the stage will refuse, the hint names the grant first, before the stage step
  local hint_lead="settle the files above, stage them, then continue — or undo the whole cutover; a file you delete stages the same way"
  [[ -z "$stage_block" ]] || hint_lead="settle the files above; once your human grants a commit (see stage: above), stage them, then continue — or undo the whole cutover"

  # the sections nest under the constraint leaf; next moves ride the 🥥 hint
  emit_both "$(
    print_turtle_header "hang tight..."
    print_tree_start "$header_cmd"
    print_tree_constraint "$halt_message"
    print_tree_sections "${sections[@]}" | sed 's/^/   /'
    print_coconut_hint "$hint_lead" \
      "rhx git.stage.add <files>" \
      "rhx git.branch.cutover continue" \
      "rhx git.branch.cutover abort"
    print_rescue_coconut_hint
  )"
}