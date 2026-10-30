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
# usage:
#   source "$SCRIPT_DIR/git.commit.director.sh"
#   TREE_DIRECTOR=$(get_one_tree_director_state repo_root="$REPO_ROOT")
#   print_quota_grant_fix director="$TREE_DIRECTOR" tree="$(basename "$REPO_ROOT")" \
#     ask="grant more" \
#     human_lead="ask your human to grant more:" \
#     human_cmd="  \$ git.commit.uses set --quant N --push allow|block"
#
# guarantee:
#   - director state `none` renders the extant human fix, byte for byte
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
# .what = the fix block under a quota refusal, by the tree's director state
#
# .why  = one voice for every surface that refuses on the quota meter
#         (git.commit.set, git.commit.push, git.branch.rebase, git.release)
#
# .note = `indent` lets a surface whose block sits indented (git.release)
#         keep its frame; human_lead and human_cmd carry their own indent,
#         so the `none` render stays byte-identical to the extant one
#
# usage: print_quota_grant_fix director=none|charter|unreadable tree=<slug> \
#          ask="grant more" human_lead="..." human_cmd="..." [indent="   "]
######################################################################
print_quota_grant_fix() {
  local director="" tree="" ask="" human_lead="" human_cmd="" indent=""
  for arg in "$@"; do
    case "$arg" in
      director=*) director="${arg#director=}" ;;
      tree=*) tree="${arg#tree=}" ;;
      ask=*) ask="${arg#ask=}" ;;
      human_lead=*) human_lead="${arg#human_lead=}" ;;
      human_cmd=*) human_cmd="${arg#human_cmd=}" ;;
      indent=*) indent="${arg#indent=}" ;;
    esac
  done

  local grant_cmd
  grant_cmd="$(get_one_director_grant_command tree="$tree")"

  # a director governs this tree: the driver asks its director, never a human
  if [[ "$director" == "charter" ]]; then
    echo ""
    echo "${indent}a director governs this tree; ask your director to ${ask}. the director runs:"
    echo "${indent}  \$ $grant_cmd"
    return 0
  fi

  # a director marker that cannot be read: name both granters, never hide the fix
  if [[ "$director" == "unreadable" ]]; then
    local human_lead_bare="${human_lead#"${human_lead%%[! ]*}"}"
    echo ""
    echo "${indent}a director marker is in this tree but cannot be read; ask your director, else your human."
    echo "${indent}the director runs:"
    echo "${indent}  \$ $grant_cmd"
    echo "${indent}else, ${human_lead_bare}"
    echo "$human_cmd"
    return 0
  fi

  # no director governs this tree: the extant human fix, unchanged
  # .note = the same three lines print_instruction (git.commit/output.sh) emits,
  #         written here so a surface that does not source output.sh can call it
  echo ""
  echo "$human_lead"
  echo "$human_cmd"
}
