#!/usr/bin/env bash
######################################################################
# .what = manage local git commit quota for mechanics
#
# .why  = humans control how many commits a mechanic can make
#         and whether push is allowed in this repo
#
# usage:
#   git.commit.uses.local set --quant 3 --push block
#   git.commit.uses.local set --quant 1 --push allow
#   git.commit.uses.local set --quant 0               # revoke (--push defaults to block)
#   git.commit.uses.local del                         # same as set --quant 0
#   git.commit.uses.local block                       # alias for del
#   git.commit.uses.local allow                       # shorthand for set --quant 999999 --push allow
#   git.commit.uses.local get
#
# guarantee:
#   - --push is required on set (except --quant 0 which defaults to block)
#   - state stored in .meter/git.commit.uses.jsonc
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/output.sh"

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository"
  exit 2
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
METER_DIR="$REPO_ROOT/.meter"
STATE_FILE="$METER_DIR/git.commit.uses.jsonc"

# global blocker path (for get display)
ROLE_REPO="ehmpathy"
ROLE_SLUG="mechanic"
GLOBAL_METER_FILE="$HOME/.rhachet/storage/repo=$ROLE_REPO/role=$ROLE_SLUG/.meter/git.commit.uses.jsonc"

# parse command (set or get)
COMMAND=""
QUANT=""
PUSH=""
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
      QUANT="$2"
      shift 2
      ;;
    --push)
      PUSH="$2"
      shift 2
      ;;
    --help|-h)
      echo "usage: git.commit.uses set --quant N --push allow|block"
      echo "       git.commit.uses del"
      echo "       git.commit.uses block         (alias for del)"
      echo "       git.commit.uses allow         (shorthand for unlimited)"
      echo "       git.commit.uses get"
      echo ""
      echo "commands:"
      echo "  set    grant commit quota (human only)"
      echo "  del    revoke quota (shortcut for set --quant 0 --push block)"
      echo "  block  alias for del"
      echo "  allow  grant unlimited quota with push allowed"
      echo "  get    check quota left"
      echo ""
      echo "options (set):"
      echo "  --quant N             number of commits to allow"
      echo "  --push allow|block    whether push is permitted (required)"
      echo ""
      echo "options:"
      echo "  --help, -h            show this help"
      exit 0
      ;;
    --repo|--role|--skill|--local|--global)
      # rhachet passthrough args - ignore
      shift
      # if next arg exists and is not a flag, skip it too
      if [[ $# -gt 0 && "$1" != --* && "$1" != -* ]]; then
        shift
      fi
      ;;
    --)
      shift
      ;;
    --*)
      echo "error: unknown option: $1"
      echo "usage: git.commit.uses set --quant N --push allow|block"
      echo "       git.commit.uses del"
      echo "       git.commit.uses get"
      exit 2
      ;;
    *)
      shift
      ;;
  esac
done

# validate command
if [[ -z "$COMMAND" ]]; then
  echo "error: command required (set, del, block, allow, or get)"
  echo "usage: git.commit.uses set --quant N --push allow|block"
  echo "       git.commit.uses del"
  echo "       git.commit.uses get"
  exit 2
fi

case "$COMMAND" in
  block)
    # block = alias for del (quant=0, push=block)
    QUANT=0
    PUSH="block"
    VIA_DEL=true
    ;& # fall through to set logic

  del)
    # del = revoke shortcut (quant=0, push=block)
    if [[ -z "$QUANT" ]]; then
      QUANT=0
    fi
    if [[ -z "$PUSH" ]]; then
      PUSH="block"
    fi
    VIA_DEL=true
    ;& # fall through to set logic

  allow)
    # allow = unlimited quota with push allowed
    if [[ "$COMMAND" == "allow" ]]; then
      QUANT=999999
      PUSH="allow"
    fi
    ;& # fall through to set logic

  set)
    # validate --quant
    if [[ -z "$QUANT" ]]; then
      echo "error: --quant N is required"
      echo "usage: git.commit.uses set --quant N --push allow|block"
      exit 2
    fi

    # default --push to block when quant is 0 (revoke implies no push)
    if [[ -z "$PUSH" && "$QUANT" == "0" ]]; then
      PUSH="block"
    fi

    # validate --push required
    if [[ -z "$PUSH" ]]; then
      echo "error: --push allow|block is required"
      echo "usage: git.commit.uses set --quant N --push allow|block"
      exit 2
    fi

    # validate --push value
    if [[ "$PUSH" != "allow" && "$PUSH" != "block" ]]; then
      echo "error: --push must be 'allow' or 'block'"
      echo "usage: git.commit.uses set --quant N --push allow|block"
      exit 2
    fi

    # validate --quant is a number
    if ! [[ "$QUANT" =~ ^[0-9]+$ ]]; then
      echo "error: --quant must be a non-negative integer"
      exit 2
    fi

    # findsert .meter dir and .gitignore
    mkdir -p "$METER_DIR"
    if [[ ! -f "$METER_DIR/.gitignore" ]]; then
      echo "*" > "$METER_DIR/.gitignore"
    fi

    # write state file
    cat > "$STATE_FILE" << EOF
{
  "uses": $QUANT,
  "push": "$PUSH"
}
EOF

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
      echo "   └─ push: allowed"
    elif [[ "$QUANT" == "999999" && "$PUSH" == "allow" ]]; then
      print_turtle_header "radical! let's ride!"
      print_tree_start "git.commit.uses set"
      echo "   ├─ granted: unlimited"
      echo "   └─ push: allowed"
    elif [[ "$PUSH" == "allow" ]]; then
      print_turtle_header "radical! let's ride!"
      print_tree_start "git.commit.uses set"
      echo "   ├─ granted: $QUANT"
      echo "   └─ push: allowed"
    else
      print_turtle_header "gnarly! thanks human!"
      print_tree_start "git.commit.uses set"
      echo "   ├─ granted: $QUANT"
      echo "   └─ push: blocked"
    fi
    ;;

  get)
    # check global blocker state
    GLOBAL_BLOCKED=false
    if [[ -f "$GLOBAL_METER_FILE" ]]; then
      # check if file is valid json and has blocked: true
      if BLOCKED_VAL=$(jq -r '.blocked // false' "$GLOBAL_METER_FILE" 2>/dev/null); then
        if [[ "$BLOCKED_VAL" == "true" ]]; then
          GLOBAL_BLOCKED=true
        fi
      fi
    fi

    # check state file exists
    if [[ ! -f "$STATE_FILE" ]]; then
      print_turtle_header "lets check the meter..."
      print_tree_start "git.commit.uses"
      if [[ "$GLOBAL_BLOCKED" == "true" ]]; then
        echo "   ├─ no quota set"
        echo "   └─ global: blocked"
      else
        echo "   └─ no quota set"
      fi
      echo ""
      echo "ask your human to grant:"
      echo "  \$ git.commit.uses set --quant N --push allow|block"
      exit 0
    fi

    # read state
    USES=$(jq -r '.uses' "$STATE_FILE")
    PUSH_STATE=$(jq -r '.push' "$STATE_FILE")

    # format uses display
    if [[ "$USES" == "999999" ]]; then
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

    print_turtle_header "lets check the meter..."
    print_tree_start "git.commit.uses"
    echo "   └─ meter"
    echo "      ├─ left: $USES_DISPLAY"
    if [[ "$GLOBAL_BLOCKED" == "true" ]]; then
      echo "      ├─ push: $PUSH_DISPLAY"
      echo "      └─ global: blocked"
    else
      echo "      └─ push: $PUSH_DISPLAY"
    fi
    ;;

  *)
    echo "error: unknown command: $COMMAND"
    echo "usage: git.commit.uses set --quant N --push allow|block"
    echo "       git.commit.uses get"
    exit 2
    ;;
esac
