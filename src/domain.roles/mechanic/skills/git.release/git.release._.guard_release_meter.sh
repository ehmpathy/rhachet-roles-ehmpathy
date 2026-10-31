#!/usr/bin/env bash
######################################################################
# .what = the release gate: may this tree ship now? if so, spend one use
#
# .why  = `git.release --mode apply` is the one act the release meter
#         guards. it reads ONLY git.release.uses — global ∧ org ∧ local —
#         and never the commit meter, so no commit grant can ship and a
#         release needs no commit grant (1.vision X1-X3)
#
# .note = a child process, never sourced: it loads the commit family's
#         hardened meter readers, whose render names overlap
#         git.release's own output.sh. a child keeps the two apart
#
# usage:
#   bash git.release._.guard_release_meter.sh --mode check || exit $?   # read only
#   bash git.release._.guard_release_meter.sh --mode spend --spent-nonce "$N" || exit $?   # read, then spend
#
# .note = no mode raises the stamp. a refund is the apply's own act, made
#         in-process (git.release.operations.sh) and only while the file
#         still bears the nonce its spend wrote; an entry that raised the
#         stamp would let any caller mint release uses
#
# .why two modes = apply checks the stamp first, so a stampless crew meets
#         the stamp refusal before any other; it spends only at the arm of the
#         merge, so a refusal for a behind, dirty, or red pr spends naught
#
# guarantee:
#   - exit 0 = allowed; under spend, one local use spent (none for "infinite"),
#     and stdout holds only the uses left, for the caller to announce
#   - exit 2 = blocked at one or more levels; one refusal names each level
#     and each human command
#   - exit 1 = a meter file is damaged; names the file
#   - unset at any level blocks; damage at any level blocks
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMIT_SKILL_DIR="$(cd "$SKILL_DIR/../git.commit" && pwd)"
source "$COMMIT_SKILL_DIR/output.sh"
source "$COMMIT_SKILL_DIR/git.commit.operations.sh"
set_meter_scope release

# the mode: check reads only; spend reads, then spends. no default, so a
# caller that forgets the mode fails closed rather than spends by surprise
GATE_MODE=""
SPENT_NONCE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode) GATE_MODE="${2:-}"; shift 2 ;;
    --spent-nonce) SPENT_NONCE="${2:-}"; shift 2 ;;
    *) shift ;;
  esac
done
if [[ "$GATE_MODE" != "check" && "$GATE_MODE" != "spend" && "$GATE_MODE" != "preview" ]]; then
  echo "💥 MalfunctionError: guard_release_meter needs --mode check|spend|preview"
  echo "💥 MalfunctionError: guard_release_meter needs --mode check|spend|preview" >&2
  exit 1
fi
if [[ "$GATE_MODE" == "spend" && -z "$SPENT_NONCE" ]]; then
  echo "💥 MalfunctionError: guard_release_meter --mode spend needs --spent-nonce"
  echo "💥 MalfunctionError: guard_release_meter --mode spend needs --spent-nonce" >&2
  exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
LOCAL_FILE="$REPO_ROOT/.meter/$RELEASE_LOCAL_METER_FILENAME"
LOCAL_FILE_SHOWN=".meter/$RELEASE_LOCAL_METER_FILENAME"

######################################################################
# .what = render a release refusal on both streams, then exit with its code
# .why  = one shape for every refusal of the gate: the class follows the
#         exit code (✋ 2 / 💥 1), and the body carries the remedy
# usage: refuse_release code=1|2 headline="..." body="..."
######################################################################
refuse_release() {
  local code="" headline="" body=""
  local arg
  for arg in "$@"; do
    case "$arg" in
      code=*) code="${arg#code=}" ;;
      headline=*) headline="${arg#headline=}" ;;
      body=*) body="${arg#body=}" ;;
    esac
  done

  local leaf="print_tree_constraint"
  [[ "$code" -eq 1 ]] && leaf="print_tree_malfunction"
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.release --mode apply"
    "$leaf" "$headline"
    echo "$body"
  )"
  exit "$code"
}

######################################################################
# .what = the remedy for an org-level refusal, as a coconut hint
# .why  = an org refusal has two causes: no keyrack.yml to name the org
#         (the `allow --org` fix cannot run without one), or an org that
#         does not allow releases. each names its own fix
######################################################################
is_org_unnamed() {
  [[ "${ORG_BLOCK_REASON:-}" == *"keyrack.yml not found"* ]]
}

get_one_org_refusal_command() {
  if is_org_unnamed; then
    echo "echo 'org: <org>' > .agent/keyrack.yml"
    return 0
  fi
  echo "git.release.uses allow --org ${ORG_VALUE:-<org>}"
}

print_org_refusal_hint() {
  if is_org_unnamed; then
    print_coconut_hint "the org comes from .agent/keyrack.yml; ask a human to add it" \
      "$(get_one_org_refusal_command)"
    return 0
  fi
  print_coconut_hint "ask your human to allow releases for this org" \
    "$(get_one_org_refusal_command)"
}

######################################################################
# .what = spend one release use from the local quota
# .why  = the write is temp-then-`mv`, so a reader never sees a half file
# .note = a directory at the meter path would swallow the `mv` and report
#         success; the gate refuses it as damage instead
# .note = no lock spans the read and this write, so two concurrent applies on
#         one tree can both read 1 and both write 0. on one branch both merge
#         the same pr, so naught extra ships. but `--from <branch>` lets two
#         applies name two branches: then two prs merge on one granted use.
#         a concurrent `set` can also lose to the spend. the lock the meter
#         family owes covers all three:
#         `.dream/v2026_09_12.fix.org-state-mutations-are-an-unlocked-read-modify-write.md`
######################################################################
spend_one_release_use() {
  local uses_left=$((RELEASE_USES - 1))
  local write_status=0
  set_one_release_local_uses file="$LOCAL_FILE" uses="$uses_left" spent="$SPENT_NONCE" || write_status=$?
  if [[ "$write_status" -eq 1 ]]; then
    refuse_release code=1 headline="release quota file corrupt" \
      body="$(print_local_meter_damaged_fix file="$LOCAL_FILE_SHOWN")"
  fi
  if [[ "$write_status" -ne 0 ]]; then
    refuse_release code=1 headline="could not spend the release use; $LOCAL_FILE_SHOWN was not written" body=""
  fi
  RELEASE_USES_LEFT="$uses_left"
}

######################################################################
# .what = the one refusal for every level that blocks, at once
# .why  = a gate that stops at the first miss sends the human back once per
#         level. one refusal names each blocked level and each remedy, so a
#         first release on a fresh machine costs one grant trip, not three
# usage: refuse_blocked_levels (reads BLOCKED_REASONS, BLOCKED_COMMANDS)
######################################################################
refuse_blocked_levels() {
  local total=${#BLOCKED_REASONS[@]}
  if [[ "$total" -eq 1 ]]; then
    refuse_release code=2 headline="${BLOCKED_REASONS[0]}" body="${BLOCKED_HINTS[0]}"
  fi
  local index reason branch
  emit_both "$(
    print_turtle_header "bummer dude..."
    print_tree_start "git.release --mode apply"
    print_tree_constraint "releases blocked at $total levels"
    for index in "${!BLOCKED_REASONS[@]}"; do
      branch="├─"
      [[ $((index + 1)) -eq "$total" ]] && branch="└─"
      reason="${BLOCKED_REASONS[$index]}"
      echo "      $branch $reason"
    done
    print_coconut_hint "each level must allow a release; ask your human to grant each" \
      "${BLOCKED_COMMANDS[@]}"
  )"
  exit 2
}

# read all three levels first: damage at any level refuses as a malfunction;
# every block is collected, then refused once
BLOCKED_REASONS=()
BLOCKED_HINTS=()
BLOCKED_COMMANDS=()

# global level: one host-wide switch per meter
GLOBAL_STATUS=0
check_global_blocker || GLOBAL_STATUS=$?
if is_blocker_corrupt status="$GLOBAL_STATUS" corrupt="$GLOBAL_BLOCK_CORRUPT"; then
  refuse_release code=1 headline="release blocker file corrupt" \
    body="$(print_global_corrupt_note)"
fi
if is_blocker_set status="$GLOBAL_STATUS"; then
  BLOCKED_REASONS+=("releases blocked globally")
  BLOCKED_HINTS+=("$(print_coconut_hint "ask your human to lift the global release blocker" \
    "git.release.uses allow --global")")
  BLOCKED_COMMANDS+=("git.release.uses allow --global")
fi

# org level: the org named in .agent/keyrack.yml must allow releases
ORG_STATUS=0
check_org_blocker || ORG_STATUS=$?
if is_blocker_corrupt status="$ORG_STATUS" corrupt="$ORG_BLOCK_CORRUPT"; then
  refuse_release code=1 headline="$ORG_CORRUPT_HEADLINE" \
    body="$(print_org_corrupt_body)"
fi
if is_blocker_set status="$ORG_STATUS"; then
  BLOCKED_REASONS+=("$ORG_BLOCK_REASON")
  BLOCKED_HINTS+=("$(print_org_refusal_hint)")
  BLOCKED_COMMANDS+=("$(get_one_org_refusal_command)")
fi

# local level: this tree's release stamp
LOCAL_STATUS=0
get_one_release_local_uses file="$LOCAL_FILE" || LOCAL_STATUS=$?
if [[ "$LOCAL_STATUS" -eq 1 ]]; then
  refuse_release code=1 headline="release quota file corrupt" \
    body="$(print_local_meter_damaged_fix file="$LOCAL_FILE_SHOWN")"
fi
if [[ "$LOCAL_STATUS" -eq 2 ]]; then
  BLOCKED_REASONS+=("no release grant on this tree")
  BLOCKED_HINTS+=("$(print_coconut_hint "a commit grant never ships; a release needs its own stamp, which only your human can grant" \
    "git.release.uses set --quant 1")")
  BLOCKED_COMMANDS+=("git.release.uses set --quant 1")
fi
if [[ "$LOCAL_STATUS" -eq 0 && "$RELEASE_USES" != "infinite" && "$RELEASE_USES" -le 0 ]]; then
  BLOCKED_REASONS+=("no release uses left")
  BLOCKED_HINTS+=("$(print_coconut_hint "the stamp is spent; ask your human to grant another" \
    "git.release.uses set --quant 1")")
  BLOCKED_COMMANDS+=("git.release.uses set --quant 1")
fi

# preview: name each level that blocks on one line, for plan to show; never
# a refusal render, never a spend
if [[ "$GATE_MODE" == "preview" && ${#BLOCKED_REASONS[@]} -gt 0 ]]; then
  PREVIEW_LINE="${BLOCKED_REASONS[0]}"
  for PREVIEW_REASON in "${BLOCKED_REASONS[@]:1}"; do
    PREVIEW_LINE="$PREVIEW_LINE; $PREVIEW_REASON"
  done
  echo "$PREVIEW_LINE"
  exit 2
fi
if [[ "$GATE_MODE" == "preview" ]]; then
  exit 0
fi

# refuse once, with every level that blocks
if [[ ${#BLOCKED_REASONS[@]} -gt 0 ]]; then
  refuse_blocked_levels
fi

# a check spends naught
if [[ "$GATE_MODE" == "check" ]]; then
  exit 0
fi

# spend one use; an unlimited grant spends none. stdout holds only the uses
# left, which the caller announces once its own render is done
if [[ "$RELEASE_USES" == "infinite" ]]; then
  echo "infinite"
  exit 0
fi
spend_one_release_use
echo "$RELEASE_USES_LEFT"
exit 0
