#!/usr/bin/env bash
######################################################################
# .what = the quota-refusal fix for a tree a director governs
#
# .why  = a driver under a director that reads "ask your human" halts
#         and pages a human, while its director holds the grant. so in
#         a director-governed tree, each quota refusal names the director
#         and the one line the director runs; elsewhere it keeps the
#         extant human fix, byte for byte.
#
# .note = this file is the published fix contract of the git.commit.uses
#         meter (`.meter/git.commit.uses.jsonc`), which git.commit owns.
#         every skill that refuses on that meter (git.commit.set,
#         git.commit.push, git.branch.rebase begin, git.release) sources
#         it, as they already read the meter and source git.commit's
#         output.sh. one owner, one voice for the meter's fix.
#
# usage:
#   source "$SCRIPT_DIR/git.commit.director.sh"
#   print_quota_grant_fix repo_root="$REPO_ROOT" ask="grant more" \
#     human_lead="ask your human to grant more:" \
#     human_cmd="  \$ git.commit.uses set --quant N --push allow|block"
#
# guarantee:
#   - no director in the tree: the extant human fix, byte for byte
#   - the director state is read only when a refusal renders, never at load
#   - a fault in the read never aborts the skill and never hides the fix
#   - the director never runs from the driver: the line is for the director
######################################################################

######################################################################
# .what = whether a director governs this tree: none | charter | unreadable
#
# .why  = the quota refusals branch on it
#
# .note = how a tree is known to have a director is the commander's call
#         (route fulcrum F1, unresolved). until it is ruled, every tree
#         answers `none`, so every refusal keeps its extant human fix.
######################################################################
get_one_tree_director_state() {
  echo "none"
}

######################################################################
# .what = the director's grant line for a tree
#
# .why  = `git.crew.grant` is a director skill (uladkasach/nheuron,
#         role=director); it requires --why, and the director sizes the
#         quota, so both stay placeholders the director fills
######################################################################
get_one_director_grant_command() {
  local tree=""
  for arg in "$@"; do
    case "$arg" in
      tree=*) tree="${arg#tree=}" ;;
    esac
  done
  echo "rhx git.crew.grant --tree $tree --quota <n> --push allow --why '<why>'"
}

######################################################################
# .what = a text line without its lead spaces
#
# .why  = the unreadable render sets both command lines at one depth, so
#         each surface's own indent on its human lines must come off first
######################################################################
as_text_without_lead_spaces() {
  local text=""
  for arg in "$@"; do
    case "$arg" in
      text=*) text="${arg#text=}" ;;
    esac
  done
  echo "${text#"${text%%[! ]*}"}"
}

######################################################################
# .what = the director state of a tree, read at the moment a refusal renders
#
# .why  = a read that fails must not abort the skill (set -e) nor hide the
#         fix: any failure reads as `unreadable`, which names both granters
######################################################################
get_one_tree_director_state_for_render() {
  local repo_root=""
  for arg in "$@"; do
    case "$arg" in
      repo_root=*) repo_root="${arg#repo_root=}" ;;
    esac
  done
  get_one_tree_director_state repo_root="$repo_root" || echo "unreadable"
}

######################################################################
# .what = the fix block under a quota refusal, by the tree's director state
#
# .why  = one voice for every surface that refuses on the quota meter
#         (git.commit.set, git.commit.push, git.branch.rebase, git.release)
#
# .note = the renderer owns the frame indent: callers pass unindented
#         human_lead and human_cmd (human_cmd keeps only its offset under
#         its lead), and `indent` sets the frame for every line
#
# .note = `director` is read from the tree when absent; a caller passes it
#         only to render a known state (the render's own test does)
#
# usage: print_quota_grant_fix repo_root=<path> ask="grant more" \
#          human_lead="..." human_cmd="..." [indent="   "] \
#          [director=none|charter|unreadable]
#        (any other director value renders as unreadable)
######################################################################
print_quota_grant_fix() {
  local repo_root="" director="" ask="" human_lead="" human_cmd="" indent=""
  for arg in "$@"; do
    case "$arg" in
      repo_root=*) repo_root="${arg#repo_root=}" ;;
      director=*) director="${arg#director=}" ;;
      ask=*) ask="${arg#ask=}" ;;
      human_lead=*) human_lead="${arg#human_lead=}" ;;
      human_cmd=*) human_cmd="${arg#human_cmd=}" ;;
      indent=*) indent="${arg#indent=}" ;;
    esac
  done

  # read the tree's director state now, only because a refusal renders
  if [[ -z "$director" ]]; then
    director="$(get_one_tree_director_state_for_render repo_root="$repo_root")"
  fi

  # the tree slug is the worktree dir name, as the git.crew verbs take it
  local tree grant_cmd
  tree="$(basename "$repo_root")"
  grant_cmd="$(get_one_director_grant_command tree="$tree")"

  # a director governs this tree: the driver asks its director, never a human
  if [[ "$director" == "charter" ]]; then
    echo ""
    echo "${indent}a director governs this tree; ask your director to ${ask}. the director runs:"
    echo "${indent}  \$ $grant_cmd"
    return 0
  fi

  # no director governs this tree: the extant human fix, unchanged
  # .note = the same three lines print_instruction (git.commit/output.sh) emits,
  #         written here so a surface that does not source output.sh can call it
  if [[ "$director" == "none" ]]; then
    echo ""
    echo "${indent}${human_lead}"
    echo "${indent}${human_cmd}"
    return 0
  fi

  # a director marker that cannot be read: name both granters, never hide the fix
  # .note = any state other than none or charter lands here too, so a detector
  #         fault shows as "cannot be read", never as a silent "ask your human"
  # .note = both commands sit at one depth under the frame indent, so the two
  #         `$` lines align; a surface with no human command prints none
  local human_cmd_bare
  human_cmd_bare="$(as_text_without_lead_spaces text="$human_cmd")"
  echo ""
  echo "${indent}a director marker is in this tree but cannot be read; ask your director, else your human."
  echo "${indent}the director runs:"
  echo "${indent}  \$ $grant_cmd"
  echo "${indent}else, ${human_lead}"
  if [[ -n "$human_cmd_bare" ]]; then echo "${indent}  ${human_cmd_bare}"; fi
  return 0
}
