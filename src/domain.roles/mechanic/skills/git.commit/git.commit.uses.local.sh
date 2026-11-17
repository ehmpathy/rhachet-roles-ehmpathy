#!/usr/bin/env bash
######################################################################
# .what = manage local git commit quota for mechanics
#
# .why  = humans control how many commits a mechanic can make in this
#         repo. the grant covers commit, stage, rebase, and push to the
#         tree's own feature branch. it never ships — a release rides
#         git.release.uses alone
#
# usage:
#   git.commit.uses.local set --quant 3               # grant three commits
#   git.commit.uses.local set --quant 0               # commit no more; push stays held
#   git.commit.uses.local del                         # revoke (commit + push)
#   git.commit.uses.local block                       # alias for del
#   git.commit.uses.local allow                       # unlimited
#   git.commit.uses.local get
#
# guarantee:
#   - state stored in .meter/git.commit.uses.jsonc as { "uses": N|"infinite", "held": bool }
#   - a depletion lowers uses and keeps the grant held, so a crew can push
#     the commit that spent its last use; only block / del revoke (F16)
#   - --push and --stage are retired; each refuses and names the split
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/output.sh"

# .why = for `read_sponsor_state` and `get_one_commit_local_grant`. one shared
#        reader per fact keeps every surface from a drift in the answer
source "$SCRIPT_DIR/git.commit.operations.sh"
set_meter_scope commit

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  emit_usage_refusal --skill git.commit.uses --message "not in a git repository"
  exit 2
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
METER_DIR="$REPO_ROOT/.meter"
STATE_FILE="$METER_DIR/git.commit.uses.jsonc"

USAGE="usage: git.commit.uses set --quant N
       git.commit.uses allow | block | del | get
       git.commit.uses allow | block | get --global
       git.commit.uses allow | block | del | get --org <org>"

# parse command (set or get)
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
      # shift ONE, then take a value only if one is really there; a bare flag
      # leaves QUANT empty, which the `-z "$QUANT"` check turns into a constraint
      shift
      if [[ $# -gt 0 && "$1" != --* ]]; then
        QUANT="$1"
        shift
      fi
      ;;
    --push|--stage)
      # the retired fields refuse loudly: a habit that typed them must learn
      # the split, never meet a silent no-op (F8)
      emit_both "$(
        print_turtle_header "bummer dude..."
        print_tree_start "git.commit.uses"
        print_tree_constraint "$1 is retired"
        print_coconut_hint "the commit grant covers commit, stage, rebase, and push; a release rides its own meter" \
          "git.commit.uses set --quant N     # commit + push" \
          "git.release.uses set --quant 1    # ship"
      )"
      exit 2
      ;;
    --help|-h)
      echo "$USAGE"
      echo ""
      echo "commands:"
      echo "  set    grant N commits (human only)"
      echo "  del    revoke the grant; push stops too"
      echo "  block  alias for del"
      echo "  allow  grant unlimited commits"
      echo "  get    check the grant"
      echo ""
      echo "options (set):"
      echo "  --quant N             number of commits to allow (or 'infinite')"
      echo ""
      echo "options:"
      echo "  --global              the host-wide commit blocker"
      echo "  --org <org>           the per-org commit permission"
      echo "  --help, -h            show this help"
      echo ""
      echo "examples:"
      echo "  git.commit.uses set --quant 3                          # three commits; push rides them"
      echo "  git.commit.uses allow && git.release.uses block        # push all day; never ship"
      echo "  git.commit.uses set --quant 0                          # commit no more; push stays"
      echo "  git.commit.uses block                                  # revoke; push stops too"
      echo ""
      echo "the grant covers commit, stage, rebase, and push to this tree's branch."
      echo "a push spends no use, and works at 0 left until a human revokes."
      echo "no commit grant can ship: a release needs git.release.uses."
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
      # rhachet passthrough args, boolean - ignore flag only, no value to eat
      shift
      ;;
    --)
      shift
      ;;
    --*)
      emit_usage_refusal --skill git.commit.uses --message "unknown option: $1"
      exit 2
      ;;
    *)
      shift
      ;;
  esac
done

# validate command
if [[ -z "$COMMAND" ]]; then
  emit_usage_refusal --skill git.commit.uses --message "command required (set, del, block, allow, or get)"
  exit 2
fi

######################################################################
# guard: mutation commands require TTY (human only)
# note: __I_AM_HUMAN=true allows integration tests to run mutations
######################################################################
case "$COMMAND" in
  set|del|block|allow)
    guard_actor_is_human_via_stdin "git.commit.uses $COMMAND${QUANT:+ --quant $QUANT}"
    ;;
esac

# the revoke + unlimited shorthands fix the quota
case "$COMMAND" in
  block|del)
    QUANT=0
    VIA_DEL=true
    ;;
  allow)
    QUANT="infinite"
    ;;
esac

case "$COMMAND" in
  set|del|block|allow)
    # validate --quant
    if [[ -z "$QUANT" ]]; then
      emit_usage_refusal --skill git.commit.uses --message "--quant N is required"
      exit 2
    fi
    if [[ "$QUANT" != "infinite" ]] && ! [[ "$QUANT" =~ ^[0-9]+$ ]]; then
      emit_usage_refusal --skill git.commit.uses --message "--quant must be a non-negative integer or 'infinite'"
      exit 2
    fi

    # a directory at the meter path would swallow the `mv` and report a false
    # grant: refuse it as damage before any write
    findsert_gitignored_dir "$METER_DIR"
    if [[ -e "$STATE_FILE" && ! -f "$STATE_FILE" ]]; then
      emit_both "$(
        print_turtle_header "bummer dude..."
        print_tree_start "git.commit.uses $COMMAND"
        print_tree_malfunction "commit quota file corrupt"
        print_local_meter_damaged_fix file="${STATE_FILE#"$REPO_ROOT/"}"
      )"
      exit 1
    fi

    # note a legacy prior grant before the write erases its retired fields;
    # a damaged or absent prior reads as not legacy, and the write replaces it
    get_one_commit_local_grant file="$STATE_FILE" || COMMIT_LEGACY="false"

    # write the grant atomically: a reader sees the prior or the new file, never half.
    # only del / block revoke; `set --quant 0` holds at 0 left, so push stays (F16)
    STATE_FILE_TEMP="${STATE_FILE}.tmp.$$"
    trap 'rm -f "${STATE_FILE_TEMP:-}"' EXIT
    printf '{\n  "uses": %s,\n  "held": %s\n}\n' \
      "$(as_meter_uses_json quant="$QUANT")" "$(as_commit_held command="$COMMAND")" > "$STATE_FILE_TEMP"
    mv -f "$STATE_FILE_TEMP" "$STATE_FILE"

    # render a revoke
    if [[ -n "$VIA_DEL" ]]; then
      print_turtle_header "groovy, break time"
      print_tree_start "git.commit.uses $COMMAND"
      echo "   └─ revoked (commit + push)"
      exit 0
    fi

    # render a push-only grant: commit no more, push what you have
    if [[ "$QUANT" == "0" ]]; then
      print_turtle_header "groovy, break time"
      print_tree_start "git.commit.uses set"
      echo "   ├─ granted: 0 commits"
      echo "   └─ push: held (push what you have, commit no more)"
      print_coconut_hint "to stop push too, revoke the grant" \
        "git.commit.uses del"
      print_commit_legacy_note
      exit 0
    fi

    # render a grant
    print_turtle_header "radical! let's ride!"
    print_tree_start "git.commit.uses $COMMAND"
    echo "   ├─ granted: $(as_meter_uses_display uses="$QUANT")"
    echo "   └─ covers: commit, stage, rebase, push"
    print_commit_legacy_note

    ##################################################################
    # nudge: a quota with no sponsor bound buys no commits
    #
    # .why = a commit needs BOTH a quota and a sponsor, and this is the
    #        one act where a human is provably present. the nudge and the
    #        `--global allow` / `--org allow` surfaces share one reader, so
    #        the three never drift in the answer
    ##################################################################
    print_sponsor_bind_nudge_if_absent
    ;;

  get)
    # the SHARED reader decides; this render only asks it. it returns
    # 0 = clear, 2 = blocked, and sets GLOBAL_BLOCK_CORRUPT to tell "a human
    # blocked it" from "the file is damaged"
    GLOBAL_BLOCK_STATUS=0
    check_global_blocker || GLOBAL_BLOCK_STATUS=$?

    GLOBAL_BLOCKED=false
    if is_blocker_set status="$GLOBAL_BLOCK_STATUS"; then
      GLOBAL_BLOCKED=true
    fi
    GLOBAL_BLOCK_LABEL="$(as_global_block_display status="$GLOBAL_BLOCK_STATUS" corrupt="$GLOBAL_BLOCK_CORRUPT")"

    # read the local grant via the shared reader
    LOCAL_STATUS=0
    get_one_commit_local_grant file="$STATE_FILE" || LOCAL_STATUS=$?

    # refuse a damaged quota file by name, before any render
    if [[ "$LOCAL_STATUS" -eq 1 ]]; then
      emit_both "$(
        print_turtle_header "bummer dude..."
        print_tree_start "git.commit.uses get"
        print_tree_malfunction "commit quota file corrupt"
        print_local_meter_damaged_fix file="${STATE_FILE#"$REPO_ROOT/"}"
      )"
      exit 1  # malfunction — the file is damaged, not the caller's input
    fi

    # no grant on this tree
    if [[ "$LOCAL_STATUS" -eq 2 ]]; then
      print_turtle_header "let's check the meter..."
      print_tree_start "git.commit.uses get"
      if [[ "$GLOBAL_BLOCKED" == "true" ]]; then
        echo "   ├─ no quota set"
        echo "   └─ global: $GLOBAL_BLOCK_LABEL"
      else
        echo "   └─ no quota set"
      fi
      print_global_corrupt_note
      print_coconut_hint \
        "no quota is granted on this tree, so commits will refuse" \
        "git.commit.uses set --quant N   # ask your human"
      exit 0
    fi

    # format the grant
    USES_DISPLAY="$(as_meter_uses_display uses="$COMMIT_USES")"
    PUSH_DISPLAY="$(as_commit_push_display held="$COMMIT_HELD")"

    print_turtle_header "let's check the meter..."
    print_tree_start "git.commit.uses get"
    echo "   └─ meter"
    echo "      ├─ left: $USES_DISPLAY"
    if [[ "$GLOBAL_BLOCKED" == "true" ]]; then
      echo "      ├─ push: $PUSH_DISPLAY"
      echo "      └─ global: $GLOBAL_BLOCK_LABEL"
    else
      echo "      └─ push: $PUSH_DISPLAY"
    fi
    print_global_corrupt_note

    # a legacy grant carries retired fields: say so once, with the split
    print_commit_legacy_note
    ;;

  *)
    emit_usage_refusal --skill git.commit.uses --message "unknown command: $COMMAND"
    exit 2
    ;;
esac
