#!/usr/bin/env bash
######################################################################
# .what = manage this tree's release quota
#
# .why  = the human's release stamp: how many times this tree may run
#         `git.release --mode apply`. it holds a quota and naught else —
#         commit, stage, rebase, and push ride git.commit.uses
#
# usage:
#   git.release.uses set --quant 1     # grant one release
#   git.release.uses set --quant 0     # revoke
#   git.release.uses allow             # unlimited
#   git.release.uses block             # revoke (alias for del)
#   git.release.uses del               # revoke
#   git.release.uses get               # check
#
# guarantee:
#   - state stored in .meter/git.release.uses.jsonc as { "uses": N | "infinite" }
#   - set / allow / block / del need a human at a tty; get does not
#   - a damaged file is named, never read as a grant (exit 1)
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMIT_SKILL_DIR="$(cd "$SKILL_DIR/../git.commit" && pwd)"
source "$COMMIT_SKILL_DIR/output.sh"
source "$COMMIT_SKILL_DIR/git.commit.operations.sh"
set_meter_scope release

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  emit_both "✋ ConstraintError: not in a git repository"
  exit 2
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
METER_DIR="$REPO_ROOT/.meter"
STATE_FILE="$METER_DIR/$RELEASE_LOCAL_METER_FILENAME"
STATE_FILE_SHOWN=".meter/$RELEASE_LOCAL_METER_FILENAME"

######################################################################
# .what = the levels that block a release, as "local + org + global"
# .why  = set and get each name what still blocks; one leaf keeps the two
#         renders word for word alike. empty = every level allows
# .note = the gate (git.release._.guard_release_meter.sh) refuses with a
#         reason, a hint, and a command per level, so it keeps its own list
# usage: get_one_release_blocked_levels local=0|2 org=$ORG_STATUS global=$GLOBAL_STATUS
######################################################################
get_one_release_blocked_levels() {
  local local_status="" org_status="" global_status="" levels=""
  local arg
  for arg in "$@"; do
    case "$arg" in
      local=*) local_status="${arg#local=}" ;;
      org=*) org_status="${arg#org=}" ;;
      global=*) global_status="${arg#global=}" ;;
    esac
  done
  [[ "$local_status" -ne 0 ]] && levels="local"
  [[ "$org_status" -ne 0 ]] && levels="${levels:+$levels + }org"
  [[ "$global_status" -ne 0 ]] && levels="${levels:+$levels + }global"
  echo "$levels"
}

USAGE="usage: git.release.uses set --quant N
       git.release.uses allow | block | del | get
       git.release.uses allow|block|get --global
       git.release.uses allow|block|del|get --org <org>"

# parse args
COMMAND=""
QUANT=""

while [[ $# -gt 0 ]]; do
  case $1 in
    set|get|del|block|allow)
      COMMAND="$1"
      shift
      ;;
    --quant)
      # shift one, then take a value only if one is really there
      shift
      if [[ $# -gt 0 && "$1" != --* ]]; then
        QUANT="$1"
        shift
      fi
      ;;
    --push|--stage)
      emit_both "$(
        print_turtle_header "bummer dude..."
        print_tree_start "git.release.uses"
        print_tree_constraint "$1 is not a release field"
        print_coconut_hint "push and stage ride the commit meter; ask your human for a commit grant" \
          "git.commit.uses set --quant N"
      )"
      exit 2
      ;;
    --help|-h)
      echo "$USAGE"
      echo ""
      echo "commands:"
      echo "  set    grant N releases on this tree (human only)"
      echo "  allow  grant unlimited releases on this tree (human only)"
      echo "  block  revoke (alias for del)"
      echo "  del    revoke"
      echo "  get    check this tree's release grant, all three levels"
      echo ""
      echo "options:"
      echo "  --quant N      number of releases to allow (or 'infinite')"
      echo "  --global       the host-wide release blocker"
      echo "  --org <org>    the per-org release permission"
      echo "  --help, -h     show this help"
      echo ""
      echo "examples:"
      echo "  git.release.uses set --quant 1                               # stamp one release on this tree"
      echo "  git.release.uses allow --org ehmpathy                        # allow releases for one org"
      echo "  git.commit.uses allow && git.release.uses block              # push all day; never ship"
      echo ""
      echo "a release = git.release --mode apply. commit, stage, rebase, and push"
      echo "ride git.commit.uses; no commit grant can ship."
      exit 0
      ;;
    --repo|--role|--skill)
      # rhachet passthrough args with a value - ignore flag + its value
      shift
      if [[ $# -gt 0 && "$1" != --* && "$1" != -* ]]; then
        shift
      fi
      ;;
    --local)
      shift
      ;;
    --)
      shift
      ;;
    --*)
      emit_both "✋ ConstraintError: unknown option: $1
$USAGE"
      exit 2
      ;;
    *)
      shift
      ;;
  esac
done

if [[ -z "$COMMAND" ]]; then
  emit_both "✋ ConstraintError: command required (set, allow, block, del, or get)
$USAGE"
  exit 2
fi

######################################################################
# guard: every write needs a human at a tty
# note: __I_AM_HUMAN=true allows integration tests to run mutations
######################################################################
case "$COMMAND" in
  set|del|block|allow)
    guard_actor_is_human_via_stdin "git.release.uses $COMMAND"
    ;;
esac

# the revoke + unlimited shorthands fix the quota
case "$COMMAND" in
  block|del)
    QUANT=0
    ;;
  allow)
    QUANT="infinite"
    ;;
esac

case "$COMMAND" in
  set|del|block|allow)
    if [[ -z "$QUANT" ]]; then
      emit_both "✋ ConstraintError: --quant N is required
$USAGE"
      exit 2
    fi
    if [[ "$QUANT" != "infinite" ]] && ! [[ "$QUANT" =~ ^[0-9]+$ ]]; then
      emit_both "✋ ConstraintError: --quant must be a non-negative integer or 'infinite'"
      exit 2
    fi

    # write the quota atomically; a directory at the meter path is damage,
    # refused before any write
    findsert_gitignored_dir "$METER_DIR"
    WRITE_STATUS=0
    set_one_release_local_uses file="$STATE_FILE" uses="$(as_meter_uses_json quant="$QUANT")" || WRITE_STATUS=$?
    if [[ "$WRITE_STATUS" -eq 1 ]]; then
      emit_both "$(
        print_turtle_header "bummer dude..."
        print_tree_start "git.release.uses $COMMAND"
        print_tree_malfunction "release quota file corrupt"
        print_local_meter_damaged_fix file="$STATE_FILE_SHOWN"
      )"
      exit 1
    fi
    if [[ "$WRITE_STATUS" -ne 0 ]]; then
      emit_both "$(
        print_turtle_header "bummer dude..."
        print_tree_start "git.release.uses $COMMAND"
        print_tree_malfunction "could not write $STATE_FILE_SHOWN; the prior grant stands"
      )"
      exit 1
    fi

    # render a revoke
    if [[ "$QUANT" == "0" ]]; then
      print_turtle_header "groovy, no ships today"
      print_tree_start "git.release.uses $COMMAND"
      echo "   └─ releases: revoked"
      exit 0
    fi

    # a stamp ships only where org and global allow it too; name the level
    # that still blocks, so a grant never reads as usable when it is not
    ORG_STATUS=0
    check_org_blocker || ORG_STATUS=$?
    GLOBAL_STATUS=0
    check_global_blocker || GLOBAL_STATUS=$?
    BLOCKED_LEVELS="$(get_one_release_blocked_levels local=0 org="$ORG_STATUS" global="$GLOBAL_STATUS")"

    # render a grant that can ship now
    if [[ -z "$BLOCKED_LEVELS" ]]; then
      print_turtle_header "radical! ship it when ready"
      print_tree_start "git.release.uses $COMMAND"
      echo "   └─ releases: $(as_meter_uses_display uses="$QUANT")"
      # a finite stamp: each apply spends one, so a ship to prod should ride one apply
      if [[ "$QUANT" != "infinite" ]]; then
        print_coconut_hint "each apply spends one use; to reach prod on one use, ship feat → main → prod in one apply" \
          "rhx git.release --into prod --mode apply"
      fi
      exit 0
    fi

    # render a grant that waits on another level
    print_turtle_header "righteous, the stamp is set"
    print_tree_start "git.release.uses $COMMAND"
    echo "   ├─ releases: $(as_meter_uses_display uses="$QUANT")"
    echo "   └─ still blocked: $BLOCKED_LEVELS"
    print_coconut_hint "a release needs every level to allow it; see all three" \
      "git.release.uses get"
    ;;

  get)
    # local level: damage refuses by name, before any render
    LOCAL_STATUS=0
    get_one_release_local_uses file="$STATE_FILE" || LOCAL_STATUS=$?
    if [[ "$LOCAL_STATUS" -eq 1 ]]; then
      emit_both "$(
        print_turtle_header "bummer dude..."
        print_tree_start "git.release.uses"
        print_tree_malfunction "release quota file corrupt"
        print_local_meter_damaged_fix file="$STATE_FILE_SHOWN"
      )"
      exit 1
    fi
    LOCAL_LABEL="unset (blocked)"
    if [[ "$LOCAL_STATUS" -eq 0 ]]; then
      LOCAL_LABEL="$(as_meter_uses_display uses="$RELEASE_USES")"
    fi

    # org level: the shared hardened reader decides
    ORG_LABEL="allowed"
    ORG_STATUS=0
    check_org_blocker || ORG_STATUS=$?
    if [[ "$ORG_STATUS" -eq 2 ]]; then
      ORG_LABEL="blocked — $ORG_BLOCK_REASON"
    fi

    # global level: the shared hardened reader decides
    GLOBAL_STATUS=0
    check_global_blocker || GLOBAL_STATUS=$?
    GLOBAL_LABEL="$(as_global_block_display status="$GLOBAL_STATUS" corrupt="${GLOBAL_BLOCK_CORRUPT:-false}")"

    # the verdict: can this tree ship now, and if not, which levels block it
    VERDICT_LOCAL=0
    if [[ "$LOCAL_STATUS" -ne 0 ]] || [[ "$RELEASE_USES" != "infinite" && "$RELEASE_USES" -le 0 ]]; then
      VERDICT_LOCAL=2
    fi
    VERDICT_BLOCKED="$(get_one_release_blocked_levels local="$VERDICT_LOCAL" org="$ORG_STATUS" global="$GLOBAL_STATUS")"
    VERDICT_LABEL="can ship now"
    [[ -n "$VERDICT_BLOCKED" ]] && VERDICT_LABEL="blocked by $VERDICT_BLOCKED"

    print_turtle_header "lets check the release meter..."
    print_tree_start "git.release.uses"
    echo "   ├─ left: $LOCAL_LABEL"
    echo "   ├─ org: $ORG_LABEL"
    echo "   ├─ global: $GLOBAL_LABEL"
    echo "   └─ verdict: $VERDICT_LABEL"
    print_global_corrupt_note
    print_org_corrupt_note
    ;;

  *)
    emit_both "✋ ConstraintError: unknown command: $COMMAND
$USAGE"
    exit 2
    ;;
esac
