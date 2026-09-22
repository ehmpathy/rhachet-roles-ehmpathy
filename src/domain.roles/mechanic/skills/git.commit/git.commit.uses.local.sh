#!/usr/bin/env bash
######################################################################
# .what = manage local git commit quota for mechanics
#
# .why  = humans control how many commits a mechanic can make
#         and whether push is allowed in this repo
#
# usage:
#   git.commit.uses.local set --quant 3 --push block --stage block
#   git.commit.uses.local set --quant 1 --push allow --stage allow
#   git.commit.uses.local set --quant 0               # revoke (--push/--stage default to block)
#   git.commit.uses.local del                         # same as set --quant 0
#   git.commit.uses.local block                       # alias for del
#   git.commit.uses.local allow                       # shorthand for unlimited with push+stage allowed
#   git.commit.uses.local get
#
# guarantee:
#   - --push is required on set (except --quant 0 which defaults to block)
#   - --stage defaults to block if not specified
#   - state stored in .meter/git.commit.uses.jsonc
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/output.sh"

# .why = for `read_sponsor_state`. the sponsor nudge below must ask the SAME
#        question `git.commit.set` asks before it refuses, and one shared
#        reader is what keeps the two from a drift in the answer.
source "$SCRIPT_DIR/git.commit.operations.sh"

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  emit_both "error: not in a git repository"
  exit 2
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
METER_DIR="$REPO_ROOT/.meter"
STATE_FILE="$METER_DIR/git.commit.uses.jsonc"

# .note = GLOBAL_METER_FILE (and ROLE_REPO / ROLE_SLUG) come from the sourced
#         git.commit.operations.sh. this file declared them a SECOND time until
#         the source above landed, which left two constructions of one path —
#         and `F2` named this exact path fabrication-risk-sensitive, since it
#         scopes to a unix ACCOUNT rather than a person.

# parse command (set or get)
COMMAND=""
QUANT=""
PUSH=""
STAGE=""
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
      # 🔴 shift ONE, then take a value only if one is really there — a bare
      #    `shift 2` crashes raw (bash's own `shift: shift count out of
      #    range`, exit 1) when the flag is the last arg. a bare flag here
      #    leaves QUANT empty, which the extant `-z "$QUANT"` checks below
      #    already turn into a curated constraint.
      shift
      if [[ $# -gt 0 && "$1" != --* ]]; then
        QUANT="$1"
        shift
      fi
      ;;
    --push)
      shift
      if [[ $# -gt 0 && "$1" != --* ]]; then
        PUSH="$1"
        shift
      fi
      ;;
    --stage)
      shift
      if [[ $# -gt 0 && "$1" != --* ]]; then
        STAGE="$1"
        shift
      fi
      ;;
    --help|-h)
      echo "usage: git.commit.uses set --quant N --push allow|block [--stage allow|block]"
      echo "       git.commit.uses del"
      echo "       git.commit.uses block         (alias for del)"
      echo "       git.commit.uses allow         (shorthand for unlimited)"
      echo "       git.commit.uses get"
      echo ""
      echo "commands:"
      echo "  set    grant commit quota (human only)"
      echo "  del    revoke quota (shortcut for set --quant 0 --push block --stage block)"
      echo "  block  alias for del"
      echo "  allow  grant unlimited quota with push and stage allowed"
      echo "  get    check quota left"
      echo ""
      echo "options (set):"
      echo "  --quant N             number of commits to allow (or 'infinite')"
      echo "  --push allow|block    whether push is permitted (required)"
      echo "  --stage allow|block   whether stage is permitted (default: block)"
      echo ""
      echo "options:"
      echo "  --help, -h            show this help"
      exit 0
      ;;
    --repo|--role|--skill)
      # rhachet passthrough args, value-taking - ignore flag + its value
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
      emit_both "error: unknown option: $1
usage: git.commit.uses set --quant N --push allow|block
       git.commit.uses del
       git.commit.uses get"
      exit 2
      ;;
    *)
      shift
      ;;
  esac
done

# validate command
if [[ -z "$COMMAND" ]]; then
  emit_both "error: command required (set, del, block, allow, or get)
usage: git.commit.uses set --quant N --push allow|block
       git.commit.uses del
       git.commit.uses get"
  exit 2
fi

######################################################################
# guard: mutation commands require TTY (human only)
# note: __I_AM_HUMAN=true allows integration tests to run mutations
######################################################################
case "$COMMAND" in
  set|del|block|allow)
    guard_actor_is_human_via_stdin "git.commit.uses $COMMAND"
    ;;
esac

case "$COMMAND" in
  block)
    # block = alias for del (quant=0, push=block, stage=block)
    QUANT=0
    PUSH="block"
    STAGE="block"
    VIA_DEL=true
    ;& # fall through to set logic

  del)
    # del = revoke shortcut (quant=0, push=block, stage=block)
    if [[ -z "$QUANT" ]]; then
      QUANT=0
    fi
    if [[ -z "$PUSH" ]]; then
      PUSH="block"
    fi
    if [[ -z "$STAGE" ]]; then
      STAGE="block"
    fi
    VIA_DEL=true
    ;& # fall through to set logic

  allow)
    # allow = unlimited quota with push and stage allowed
    if [[ "$COMMAND" == "allow" ]]; then
      QUANT="infinite"
      PUSH="allow"
      STAGE="allow"
    fi
    ;& # fall through to set logic

  set)
    # validate --quant
    if [[ -z "$QUANT" ]]; then
      emit_both "error: --quant N is required
usage: git.commit.uses set --quant N --push allow|block"
      exit 2
    fi

    # default --push to block when quant is 0 (revoke implies no push)
    if [[ -z "$PUSH" && "$QUANT" == "0" ]]; then
      PUSH="block"
    fi

    # default --stage to block when quant is 0 (revoke implies no stage)
    if [[ -z "$STAGE" && "$QUANT" == "0" ]]; then
      STAGE="block"
    fi

    # validate --push required
    if [[ -z "$PUSH" ]]; then
      emit_both "error: --push allow|block is required
usage: git.commit.uses set --quant N --push allow|block"
      exit 2
    fi

    # validate --push value
    if [[ "$PUSH" != "allow" && "$PUSH" != "block" ]]; then
      emit_both "error: --push must be 'allow' or 'block'
usage: git.commit.uses set --quant N --push allow|block"
      exit 2
    fi

    # default --stage to block if not specified
    if [[ -z "$STAGE" ]]; then
      STAGE="block"
    fi

    # validate --stage value
    if [[ "$STAGE" != "allow" && "$STAGE" != "block" ]]; then
      emit_both "error: --stage must be 'allow' or 'block'
usage: git.commit.uses set --quant N --push allow|block [--stage allow|block]"
      exit 2
    fi

    # validate --quant is a number or "infinite"
    if [[ "$QUANT" != "infinite" ]] && ! [[ "$QUANT" =~ ^[0-9]+$ ]]; then
      emit_both "error: --quant must be a non-negative integer or 'infinite'"
      exit 2
    fi

    # findsert .meter dir and .gitignore, via the shared leaf
    findsert_gitignored_dir "$METER_DIR"

    # write state file (uses is string for "infinite", number otherwise)
    if [[ "$QUANT" == "infinite" ]]; then
      cat > "$STATE_FILE" << EOF
{
  "uses": "infinite",
  "push": "$PUSH",
  "stage": "$STAGE"
}
EOF
    else
      cat > "$STATE_FILE" << EOF
{
  "uses": $QUANT,
  "push": "$PUSH",
  "stage": "$STAGE"
}
EOF
    fi

    # format stage display
    if [[ "$STAGE" == "allow" ]]; then
      STAGE_DISPLAY="allowed"
    else
      STAGE_DISPLAY="blocked"
    fi

    # output with turtle vibes
    if [[ "$QUANT" == "0" && "$PUSH" == "block" ]]; then
      print_turtle_header "groovy, break time"
      if [[ -n "$VIA_DEL" ]]; then
        print_tree_start "git.commit.uses del"
        echo "   └─ revoked"
      else
        print_tree_start "git.commit.uses set"
        echo "   ├─ revoked"
        print_tip "'rhx git.commit.uses del' does the same"
      fi
    elif [[ "$QUANT" == "0" && "$PUSH" == "allow" ]]; then
      print_turtle_header "sweet, let it ride"
      print_tree_start "git.commit.uses set"
      echo "   ├─ commits: 0"
      echo "   ├─ push: allowed"
      echo "   └─ stage: $STAGE_DISPLAY"
    elif [[ "$QUANT" == "infinite" && "$PUSH" == "allow" && "$STAGE" == "allow" ]]; then
      print_turtle_header "radical! let's ride!"
      print_tree_start "git.commit.uses set"
      echo "   ├─ granted: unlimited"
      echo "   ├─ push: allowed"
      echo "   └─ stage: allowed"
    elif [[ "$QUANT" == "infinite" ]]; then
      print_turtle_header "radical! let's ride!"
      print_tree_start "git.commit.uses set"
      echo "   ├─ granted: unlimited"
      echo "   ├─ push: $( [[ "$PUSH" == "allow" ]] && echo "allowed" || echo "blocked" )"
      echo "   └─ stage: $STAGE_DISPLAY"
    elif [[ "$PUSH" == "allow" ]]; then
      print_turtle_header "radical! let's ride!"
      print_tree_start "git.commit.uses set"
      echo "   ├─ granted: $QUANT"
      echo "   ├─ push: allowed"
      echo "   └─ stage: $STAGE_DISPLAY"
    else
      print_turtle_header "gnarly! thanks human!"
      print_tree_start "git.commit.uses set"
      echo "   ├─ granted: $QUANT"
      echo "   ├─ push: blocked"
      echo "   └─ stage: $STAGE_DISPLAY"
    fi

    ##################################################################
    # nudge: a quota with no sponsor bound buys no commits
    #
    # .why = a commit needs BOTH a quota and a sponsor, and this is the
    #        one act where a human is provably present. to leave the
    #        second step undiscoverable here would send the human away
    #        satisfied, and the clone would hit a wall the human is the
    #        only party who can take down.
    #
    # .why = `QUANT != "0"` gates it here rather than in the shared reader —
    #        a REVOKE (`--quant 0`) buys no commits either way, so a nudge
    #        there would tell a human to bind a sponsor for a tree that just
    #        lost its reason to commit at all.
    #
    # 🔴 .why the FUNCTION = this nudge and the two grant surfaces in
    #        `--global allow` / `--org allow` ask the identical question, so a
    #        shared reader is what keeps the three from a drift in the answer
    #        (rule.require.get-set-gen-verbs, git.commit.operations.sh).
    ##################################################################
    if [[ "$QUANT" != "0" ]]; then
      print_sponsor_bind_nudge_if_absent
    fi
    ;;

  get)
    # 🔴 the SHARED reader decides, and this render only asks it.
    #
    # 🔴 .why = this arm carried its own read — `jq -r '.blocked // false'`,
    #        keyed on jq's EXIT STATUS alone. that read a 0-BYTE file as
    #        healthy-and-permissive (jq exits 0 with an empty capture) and a
    #        DIRECTORY at the path as absent (`-f` is a regular-file test).
    #        ⇒ a human who runs `get` to learn whether commits are blocked was
    #        told "not blocked" while the blocker file was damaged
    #        (rule.forbid.failhide, rule.require.safe-by-default).
    #
    # ⇒ 🔴 .why it was DELETED rather than hardened = the gate
    #        `check_global_blocker` was hardened one round earlier and this
    #        surface was not, so the two began to disagree about one file. a
    #        second hardened copy would fix today's disagreement and keep the
    #        structure that produced it. **one reader, one decision point.**
    #
    # .note = the reader returns 0 = clear, 2 = blocked, and sets
    #         GLOBAL_BLOCK_CORRUPT to tell "a human blocked it" from "the file
    #         is damaged" — a FLAG, never a match on the reason prose
    #         (rule.forbid.magic-values).
    GLOBAL_BLOCK_STATUS=0
    check_global_blocker || GLOBAL_BLOCK_STATUS=$?

    GLOBAL_BLOCKED=false
    GLOBAL_BLOCK_LABEL="blocked"
    if [[ "$GLOBAL_BLOCK_STATUS" -eq 2 ]]; then
      GLOBAL_BLOCKED=true
      if [[ "$GLOBAL_BLOCK_CORRUPT" == "true" ]]; then
        GLOBAL_BLOCK_LABEL="blocked (file corrupt)"
      fi
    fi

    # .note = `print_global_corrupt_note` renders below, from
    #         `git.commit.operations.sh`. it was defined HERE, nested inside
    #         this `get)` arm — so it existed on no other command path, and a
    #         reader who scanned the top of this file for shared render leaves
    #         would not find it. ⇒ lifted to the file both surfaces already
    #         source for the constant it prints, which is also what removed
    #         `uses.global get`'s own copy of the same five lines
    #         (rule.forbid.maintenance-hazards).

    # check state file exists
    if [[ ! -f "$STATE_FILE" ]]; then
      print_turtle_header "lets check the meter..."
      print_tree_start "git.commit.uses"
      if [[ "$GLOBAL_BLOCKED" == "true" ]]; then
        echo "   ├─ no quota set"
        echo "   └─ global: $GLOBAL_BLOCK_LABEL"
      else
        echo "   └─ no quota set"
      fi
      print_global_corrupt_note
      print_coconut_hint \
        "no quota is granted on this tree, so commits will refuse" \
        "git.commit.uses set --quant N --push allow|block   # ask your human"
      exit 0
    fi

    # read state
    USES=$(jq -r '.uses' "$STATE_FILE")
    PUSH_STATE=$(jq -r '.push' "$STATE_FILE")
    STAGE_STATE=$(jq -r '.stage // "block"' "$STATE_FILE")

    # format uses display
    if [[ "$USES" == "infinite" || "$USES" == "999999" ]]; then
      USES_DISPLAY="unlimited"
    else
      USES_DISPLAY="$USES"
    fi

    # format push state
    if [[ "$PUSH_STATE" == "allow" ]]; then
      PUSH_DISPLAY="allowed"
    else
      PUSH_DISPLAY="blocked"
    fi

    # format stage state
    if [[ "$STAGE_STATE" == "allow" ]]; then
      STAGE_DISPLAY="allowed"
    else
      STAGE_DISPLAY="blocked"
    fi

    print_turtle_header "lets check the meter..."
    print_tree_start "git.commit.uses"
    echo "   └─ meter"
    echo "      ├─ left: $USES_DISPLAY"
    echo "      ├─ push: $PUSH_DISPLAY"
    if [[ "$GLOBAL_BLOCKED" == "true" ]]; then
      echo "      ├─ stage: $STAGE_DISPLAY"
      echo "      └─ global: $GLOBAL_BLOCK_LABEL"
    else
      echo "      └─ stage: $STAGE_DISPLAY"
    fi
    print_global_corrupt_note
    ;;

  *)
    emit_both "error: unknown command: $COMMAND
usage: git.commit.uses set --quant N --push allow|block
       git.commit.uses get"
    exit 2
    ;;
esac
