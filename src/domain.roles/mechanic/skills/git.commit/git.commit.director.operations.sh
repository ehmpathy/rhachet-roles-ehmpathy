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
# .note = the fix contract of the git.commit.uses meter, which git.commit
#         owns; every skill that refuses on that meter sources it.
#
# usage:
#   source "$SCRIPT_DIR/git.commit.director.operations.sh"
#   print_quota_grant_fix repo_root="$REPO_ROOT" refusal=uses-out \
#     meter_file="$STATE_FILE" wants_push="$DO_PUSH" \
#     human_lead="ask your human to grant more:" \
#     human_cmd="  \$ git.commit.uses set --quant N --push allow|block"
#
# guarantee:
#   - no director in the tree: the extant human fix, byte for byte
#   - the director state is read only when a refusal renders, never at load
#   - a fault in the read never aborts the skill and never hides the fix
#   - the director never runs from the driver: the line is for the director
#   - the grant line never widens a permission the refusal is not about:
#     the renderer, not the caller, picks every flag from the refusal kind
######################################################################

######################################################################
# .what = whether a director governs this tree: none | charter | unreadable
#
# .why  = the quota refusals branch on it
#
# .note = detection reads no marker: every tree answers `none`, so every
#         refusal keeps its human fix. a body that reads a director marker
#         turns on the director line at every call site at once.
######################################################################
get_one_tree_director_state() {
  echo "none"
}

######################################################################
# .what = one field of the quota meter, or empty where it cannot be read
#
# .why  = the grant line keeps the meter's push and stage; a meter that is
#         absent or unreadable is an unknown state, which the line renders
#         as a choice for the director (`<allow|block>`), never as a grant
#
# .note = a jq failure here is allowlisted on purpose: the refusal already
#         names its own fault, and an unknown state must still render a fix
######################################################################
get_one_meter_field() {
  local meter_file="" field="" arg
  for arg in "$@"; do
    case "$arg" in
      meter_file=*) meter_file="${arg#meter_file=}" ;;
      field=*) field="${arg#field=}" ;;
    esac
  done
  if [[ -z "$meter_file" || ! -f "$meter_file" ]]; then
    return 0
  fi
  jq -r --arg field "$field" '.[$field] // ""' "$meter_file" 2>/dev/null || true
}

######################################################################
# .what = the --push flag for a grant line that must not change push
#
# .why  = a commit-only tree (push block) stays commit-only unless the
#         director chooses otherwise: the meter's push state is kept where
#         known; where unknown, `<allow|block>` makes the director choose
#
# usage: get_one_push_grant_flag push=allow|block|<other>
######################################################################
get_one_push_grant_flag() {
  local push="" arg
  for arg in "$@"; do
    case "$arg" in
      push=*) push="${arg#push=}" ;;
    esac
  done
  if [[ "$push" == "allow" || "$push" == "block" ]]; then
    echo "--push $push"
    return 0
  fi
  echo "--push <allow|block>"
}

######################################################################
# .what = the permission flags on a director's grant line, by refusal kind
#
# .why  = the grant must lift the refusal and change no other permission:
#         - push: `allow` where the refusal is about push or the driver's
#           own command needs it (wants_push); else the meter's push, kept
#         - stage: `allow` where the refusal is about stage, or the meter
#           already allows it (so a grant never revokes it); else omitted
#
# .note = refusal kinds: quota-absent | uses-out | push-blocked | stage-blocked.
#         an unknown kind lifts no push and no stage, so it never widens
#
# usage: get_one_director_grant_flags refusal=<kind> meter_file=<path> \
#          [wants_push=true|false]
######################################################################
get_one_director_grant_flags() {
  local refusal="" meter_file="" wants_push="false" arg
  for arg in "$@"; do
    case "$arg" in
      refusal=*) refusal="${arg#refusal=}" ;;
      meter_file=*) meter_file="${arg#meter_file=}" ;;
      wants_push=*) wants_push="${arg#wants_push=}" ;;
    esac
  done

  # push: lift it only where the refusal or the driver's command needs it
  local push_flag
  push_flag="$(get_one_push_grant_flag \
    push="$(get_one_meter_field meter_file="$meter_file" field=push)")"
  if [[ "$refusal" == "push-blocked" || "$wants_push" == "true" ]]; then
    push_flag="--push allow"
  fi

  # stage: lift it for a stage refusal; keep it where the meter allows it
  local stage_flag=""
  if [[ "$refusal" == "stage-blocked" ]]; then
    stage_flag=" --stage allow"
  fi
  if [[ "$(get_one_meter_field meter_file="$meter_file" field=stage)" == "allow" ]]; then
    stage_flag=" --stage allow"
  fi

  echo "${push_flag}${stage_flag}"
}

######################################################################
# .what = the phrase a driver relays, by refusal kind
#
# .why  = "ask your director to <phrase>" names what the grant lifts
######################################################################
get_one_quota_grant_ask() {
  local refusal="" arg
  for arg in "$@"; do
    case "$arg" in
      refusal=*) refusal="${arg#refusal=}" ;;
    esac
  done
  case "$refusal" in
    quota-absent) echo "grant a quota" ;;
    uses-out) echo "grant more" ;;
    push-blocked) echo "grant push" ;;
    stage-blocked) echo "grant stage" ;;
    *) echo "grant a quota" ;;
  esac
}

######################################################################
# .what = the director's grant line for a tree
#
# .why  = `git.crew.grant` is a director skill (uladkasach/nheuron,
#         role=director); it requires --why, and the director sizes the
#         quota, so both stay placeholders the director fills
######################################################################
get_one_director_grant_command() {
  local tree="" grant_flags="" arg
  for arg in "$@"; do
    case "$arg" in
      tree=*) tree="${arg#tree=}" ;;
      grant_flags=*) grant_flags="${arg#grant_flags=}" ;;
    esac
  done
  echo "rhx git.crew.grant --tree $tree --quota <n> $grant_flags --why '<why>'"
}

######################################################################
# .what = a text line without its lead spaces
#
# .why  = the unreadable render sets both command lines at one depth, so
#         each surface's own indent on its human lines must come off first
######################################################################
as_text_without_lead_spaces() {
  local text="" arg
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
  local repo_root="" arg
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
#         (git.commit.set, git.commit.push, git.branch.rebase, git.release,
#         git.stage.add)
#
# .note = the renderer owns the frame indent: callers pass unindented
#         human_lead and human_cmd (human_cmd keeps only its offset under
#         its lead), and `indent` sets the frame for every line
#
# .note = the renderer owns the director line: the caller names the refusal
#         kind and the meter, and the phrase and flags follow from them
#
# .note = `director` is read from the tree when absent; a caller passes it
#         only to render a known state (the render's own test does)
#
# usage: print_quota_grant_fix repo_root=<path> refusal=<kind> \
#          meter_file=<path> [wants_push=true|false] \
#          human_lead="..." human_cmd="..." [indent="   "] \
#          [director=none|charter|unreadable]
#        (any other director value renders as unreadable)
######################################################################
print_quota_grant_fix() {
  local repo_root="" director="" refusal="" meter_file="" wants_push="false"
  local human_lead="" human_cmd="" indent="" arg
  for arg in "$@"; do
    case "$arg" in
      repo_root=*) repo_root="${arg#repo_root=}" ;;
      director=*) director="${arg#director=}" ;;
      refusal=*) refusal="${arg#refusal=}" ;;
      meter_file=*) meter_file="${arg#meter_file=}" ;;
      wants_push=*) wants_push="${arg#wants_push=}" ;;
      human_lead=*) human_lead="${arg#human_lead=}" ;;
      human_cmd=*) human_cmd="${arg#human_cmd=}" ;;
      indent=*) indent="${arg#indent=}" ;;
    esac
  done

  # read the tree's director state now, only because a refusal renders
  if [[ -z "$director" ]]; then
    director="$(get_one_tree_director_state_for_render repo_root="$repo_root")"
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

  # the director line: the tree slug is the worktree dir name, as the
  # git.crew verbs take it; the phrase and flags follow from the refusal
  local tree ask grant_flags grant_cmd
  tree="$(basename "$repo_root")"
  ask="$(get_one_quota_grant_ask refusal="$refusal")"
  grant_flags="$(get_one_director_grant_flags refusal="$refusal" \
    meter_file="$meter_file" wants_push="$wants_push")"
  grant_cmd="$(get_one_director_grant_command tree="$tree" grant_flags="$grant_flags")"

  # a director governs this tree: the driver asks its director, never a human
  if [[ "$director" == "charter" ]]; then
    echo ""
    echo "${indent}a director governs this tree; ask your director to ${ask}. the director runs:"
    echo "${indent}  \$ $grant_cmd"
    return 0
  fi

  # the director state cannot be read: name both granters, never hide the fix
  # .note = the text claims no marker: a detector fault and an unreadable marker
  #         read alike, so it states only what is known
  # .note = any state other than none or charter lands here too, so a detector
  #         fault shows as "cannot be read", never as a silent "ask your human"
  # .note = both commands sit at one depth under the frame indent, so the two
  #         `$` lines align; a surface with no human command prints none
  local human_cmd_bare
  human_cmd_bare="$(as_text_without_lead_spaces text="$human_cmd")"
  echo ""
  echo "${indent}whether a director governs this tree cannot be read; ask your director, else your human."
  echo "${indent}the director runs:"
  echo "${indent}  \$ $grant_cmd"
  echo "${indent}else, ${human_lead}"
  if [[ -n "$human_cmd_bare" ]]; then echo "${indent}  ${human_cmd_bare}"; fi
  return 0
}

######################################################################
# .what = the fix text for a json-mode quota refusal, by the tree's director state
#
# .why  = a json caller reads the refusal too; where a director state is
#         known, it must name the director grant as the tree render does
#
# .note = no director: empty, so the json refusal keeps main's bytes (no fix
#         field). else: the tree render's lines, with no lead blank line
#
# usage: get_one_quota_grant_fix_for_json repo_root=<path> refusal=<kind> \
#          meter_file=<path> [wants_push=true|false] \
#          human_lead="..." human_cmd="..." [director=none|charter|unreadable]
######################################################################
get_one_quota_grant_fix_for_json() {
  local repo_root="" director="" refusal="" meter_file="" wants_push="false"
  local human_lead="" human_cmd="" arg
  for arg in "$@"; do
    case "$arg" in
      repo_root=*) repo_root="${arg#repo_root=}" ;;
      director=*) director="${arg#director=}" ;;
      refusal=*) refusal="${arg#refusal=}" ;;
      meter_file=*) meter_file="${arg#meter_file=}" ;;
      wants_push=*) wants_push="${arg#wants_push=}" ;;
      human_lead=*) human_lead="${arg#human_lead=}" ;;
      human_cmd=*) human_cmd="${arg#human_cmd=}" ;;
    esac
  done

  # read the tree's director state now, only because a refusal renders
  if [[ -z "$director" ]]; then
    director="$(get_one_tree_director_state_for_render repo_root="$repo_root")"
  fi

  # no director governs this tree: no fix field, as on main
  if [[ "$director" == "none" ]]; then
    return 0
  fi

  # a director state is known: the tree render's lines, lead blank line dropped
  local fix
  fix="$(print_quota_grant_fix repo_root="$repo_root" director="$director" \
    refusal="$refusal" meter_file="$meter_file" wants_push="$wants_push" \
    human_lead="$human_lead" human_cmd="$human_cmd")"
  echo "${fix#$'\n'}"
}
