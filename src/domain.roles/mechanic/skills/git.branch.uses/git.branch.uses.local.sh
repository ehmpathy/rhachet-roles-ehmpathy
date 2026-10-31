#!/usr/bin/env bash
######################################################################
# .what = manage this tree's cutover quota for mechanics
#
# .why  = humans control how many branch cutovers a mechanic may apply
#         in this repo
#
# usage:
#   git.branch.uses.local set --quant 2     # grant two cutovers
#   git.branch.uses.local set --quant 0     # revoke
#   git.branch.uses.local del               # same as set --quant 0
#   git.branch.uses.local block             # alias for del
#   git.branch.uses.local allow             # unlimited
#   git.branch.uses.local get               # check quota left
#
# guarantee:
#   - state stored in .meter/git.branch.uses.jsonc as { "uses": N | "infinite" }
#   - set, del, block, allow are human-only; get is open
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/git.branch.uses.operations.sh"

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  emit_both "✋ ConstraintError: not in a git repository"
  exit 2
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
METER_DIR="$REPO_ROOT/.meter"
STATE_FILE="$(get_branch_meter_file)"
USAGE="usage: git.branch.uses set --quant N
       git.branch.uses del
       git.branch.uses allow
       git.branch.uses get"

# parse command
COMMAND=""
QUANT=""
VIA_DEL=""

# first positional arg is command
if [[ $# -ge 1 && "$1" != --* ]]; then
  COMMAND="$1"
  shift
fi

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
    --help|-h)
      echo "usage: git.branch.uses set --quant N"
      echo "       git.branch.uses del"
      echo "       git.branch.uses block         (alias for del)"
      echo "       git.branch.uses allow         (unlimited)"
      echo "       git.branch.uses get"
      echo "       git.branch.uses --global block|allow|get"
      echo "       git.branch.uses --org <org> allow|block|del|get"
      echo ""
      echo "commands:"
      echo "  set    grant cutover quota (human only)"
      echo "  del    revoke quota (shortcut for set --quant 0)"
      echo "  block  alias for del"
      echo "  allow  grant unlimited quota (human only)"
      echo "  get    check quota left"
      echo ""
      echo "options (set):"
      echo "  --quant N             cutovers to allow (or 'infinite')"
      echo ""
      echo "options:"
      echo "  --help, -h            show this help"
      echo ""
      echo "examples:"
      echo "  rhx git.branch.uses get                    # how many cutovers are left"
      echo "  rhx git.branch.uses set --quant 3          # grant 3 cutovers in this repo (human)"
      echo "  rhx git.branch.uses --global block         # pause cutovers in every repo"
      exit 0
      ;;
    --repo|--role|--skill)
      # rhachet passthrough args with a value - ignore flag + its value
      shift
      if [[ $# -gt 0 && "$1" != --* && "$1" != -* ]]; then
        shift
      fi
      ;;
    --local|--global)
      # rhachet passthrough args, boolean - ignore flag only
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

# validate command
if [[ -z "$COMMAND" ]]; then
  emit_both "✋ ConstraintError: command required (set, del, block, allow, or get)
$USAGE"
  exit 2
fi

######################################################################
# guard: mutation commands require a tty (human only)
# note: __I_AM_HUMAN=true allows integration tests to run mutations
######################################################################
case "$COMMAND" in
  set|del|block|allow)
    guard_actor_is_human_via_stdin "git.branch.uses $COMMAND"
    ;;
esac

case "$COMMAND" in
  block|del)
    # del and block = revoke shortcut
    QUANT=0
    VIA_DEL=true
    ;& # fall through to set logic

  allow)
    # allow = unlimited quota
    if [[ "$COMMAND" == "allow" ]]; then
      QUANT="infinite"
    fi
    ;& # fall through to set logic

  set)
    # validate --quant
    if [[ -z "$QUANT" ]]; then
      emit_both "✋ ConstraintError: --quant N is required
usage: git.branch.uses set --quant N"
      exit 2
    fi
    if [[ "$QUANT" != "infinite" ]] && ! [[ "$QUANT" =~ ^[0-9]+$ ]]; then
      emit_both "✋ ConstraintError: --quant must be a non-negative integer or 'infinite'
usage: git.branch.uses set --quant N"
      exit 2
    fi

    # findsert .meter dir and .gitignore, via the shared leaf
    findsert_gitignored_dir "$METER_DIR"

    # a non-file at the quota path (a stray dir) would swallow the mv and
    # leave the grant unwritten; refuse it by name, never claim the grant
    RETRY_CMD="rhx git.branch.uses $COMMAND"
    if [[ "$COMMAND" == "set" ]]; then
      RETRY_CMD="$RETRY_CMD --quant $QUANT"
    fi
    if [[ -e "$STATE_FILE" && ! -f "$STATE_FILE" ]]; then
      emit_both "$(
        print_turtle_header "bummer dude..."
        print_tree_start "git.branch.uses $COMMAND"
        print_tree_malfunction "the quota path is not a file, so no grant was written"
        echo ""
        echo "   the path that should hold this tree's cutover quota:"
        echo "     ${STATE_FILE#"$REPO_ROOT/"}"
        print_instruction "remove what sits there, then grant again:" \
          "  \$ rhx rmsafe -r ${STATE_FILE#"$REPO_ROOT/"}
  \$ $RETRY_CMD"
      )"
      exit 1
    fi

    # write state via temp + mv, so a reader never sees a torn file
    USES_JSON="$QUANT"
    if [[ "$QUANT" == "infinite" ]]; then
      USES_JSON='"infinite"'
    fi
    # one writer at a time: a cutover's gate and spend hold this lock too
    if ! set_branch_meter_lock; then
      emit_both "$(
        print_turtle_header "bummer dude..."
        print_tree_start "git.branch.uses $COMMAND"
        print_tree_constraint "the cutover quota is busy: a cutover gates or spends it right now"
        print_instruction "rerun once it finishes:" "  \$ $RETRY_CMD"
      )"
      exit 2
    fi
    # the temp file joins the exit registry beside the lock's own release;
    # a bare trap here would drop every release the registry holds
    STATE_FILE_TEMP="${STATE_FILE}.tmp.$$"
    del_state_file_temp() { rm -f "${STATE_FILE_TEMP:-}"; }
    add_pid_lock_exit_release del_state_file_temp
    printf '{\n  "uses": %s\n}\n' "$USES_JSON" > "$STATE_FILE_TEMP"
    mv -f "$STATE_FILE_TEMP" "$STATE_FILE"
    del_branch_meter_lock

    # revoke
    if [[ "$QUANT" == "0" ]]; then
      print_turtle_header "groovy, break time"
      if [[ -n "$VIA_DEL" ]]; then
        print_tree_start "git.branch.uses $COMMAND"
        echo "   └─ revoked"
        exit 0
      fi
      print_tree_start "git.branch.uses set"
      echo "   ├─ revoked"
      print_tip "'rhx git.branch.uses del' does the same"
      exit 0
    fi

    # grant
    GRANT_DISPLAY="$QUANT"
    if [[ "$QUANT" == "infinite" ]]; then
      GRANT_DISPLAY="unlimited"
    fi
    print_turtle_header "radical! let's ride!"
    print_tree_start "git.branch.uses $COMMAND"
    echo "   └─ granted: $GRANT_DISPLAY"
    ;;

  get)
    # the SHARED global reader decides; this render only asks it
    GLOBAL_BLOCK_STATUS=0
    check_global_blocker || GLOBAL_BLOCK_STATUS=$?
    GLOBAL_BLOCK_LABEL=""
    if [[ "$GLOBAL_BLOCK_STATUS" -eq 2 ]]; then
      GLOBAL_BLOCK_LABEL="blocked"
      if [[ "$GLOBAL_BLOCK_CORRUPT" == "true" ]]; then
        GLOBAL_BLOCK_LABEL="blocked (file corrupt)"
      fi
    fi

    # no quota on this tree
    if [[ ! -e "$STATE_FILE" ]]; then
      print_turtle_header "lets check the meter..."
      print_tree_start "git.branch.uses"
      if [[ -n "$GLOBAL_BLOCK_LABEL" ]]; then
        echo "   ├─ no quota set"
        echo "   └─ global: $GLOBAL_BLOCK_LABEL"
      fi
      if [[ -z "$GLOBAL_BLOCK_LABEL" ]]; then
        echo "   └─ no quota set"
      fi
      print_global_corrupt_note
      print_coconut_hint \
        "no quota is granted on this tree, so a cutover apply will refuse" \
        "rhx git.branch.uses set --quant N   # ask your human"
      exit 0
    fi

    # capture the bytes once: judge and read that one copy, as the gate does
    STATE_CONTENT=""
    [[ -f "$STATE_FILE" ]] && STATE_CONTENT=$(cat "$STATE_FILE" 2> /dev/null || true)

    # refuse a damaged quota file by name, before any read of its count
    if [[ ! -f "$STATE_FILE" ]] || ! is_branch_meter_content_readable "$STATE_CONTENT"; then
      emit_both "$(
        print_turtle_header "bummer dude..."
        print_tree_start "git.branch.uses"
        print_tree_malfunction "cutover quota file corrupt"
        print_branch_meter_damaged_fix file="${STATE_FILE#"$REPO_ROOT/"}"
      )"
      exit 1
    fi

    USES=$(printf '%s' "$STATE_CONTENT" | jq -r '.uses')
    USES_DISPLAY="$USES"
    if [[ "$USES" == "infinite" ]]; then
      USES_DISPLAY="unlimited"
    fi

    print_turtle_header "lets check the meter..."
    print_tree_start "git.branch.uses"
    echo "   └─ meter"
    if [[ -n "$GLOBAL_BLOCK_LABEL" ]]; then
      echo "      ├─ left: $USES_DISPLAY"
      echo "      └─ global: $GLOBAL_BLOCK_LABEL"
    fi
    if [[ -z "$GLOBAL_BLOCK_LABEL" ]]; then
      echo "      └─ left: $USES_DISPLAY"
    fi
    print_global_corrupt_note
    ;;

  *)
    emit_both "✋ ConstraintError: unknown command: $COMMAND
$USAGE"
    exit 2
    ;;
esac
