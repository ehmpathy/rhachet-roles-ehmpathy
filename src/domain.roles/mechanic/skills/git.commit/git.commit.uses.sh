#!/usr/bin/env bash
######################################################################
# .what = manage git commit quota for mechanics
#
# .why  = humans control how many commits a mechanic can make
#         and whether push is allowed
#
# usage:
#   git.commit.uses set --quant 3 --push block
#   git.commit.uses set --quant 1 --push allow
#   git.commit.uses set --quant 0               # revoke (--push defaults to block)
#   git.commit.uses get
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

# parse command (set or get)
COMMAND=""
QUANT=""
PUSH=""

# first positional arg is command
if [[ $# -ge 1 && "$1" != --* ]]; then
  COMMAND="$1"
  shift
fi

while [[ $# -gt 0 ]]; do
  case $1 in
    set|get)
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
      echo "       git.commit.uses get"
      echo ""
      echo "commands:"
      echo "  set    grant commit quota (human only)"
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
    --repo|--role|--skill)
      # rhachet passthrough args - ignore
      shift 2
      ;;
    --)
      shift
      ;;
    --*)
      echo "error: unknown option: $1"
      echo "usage: git.commit.uses set --quant N --push allow|block"
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
  echo "error: command required (set or get)"
  echo "usage: git.commit.uses set --quant N --push allow|block"
  echo "       git.commit.uses get"
  exit 2
fi

case "$COMMAND" in
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

    # ensure .meter directory exists with .gitignore
    mkdir -p "$METER_DIR"
    if [[ ! -f "$METER_DIR/.gitignore" ]]; then
      cat > "$METER_DIR/.gitignore" << 'GITIGNORE'
# .meter state files are local-only
# they track per-session mechanic quotas (commit uses, push permissions, etc.)
# and must not be committed to the repo

# ignore all state files
*.jsonc
*.json

# but keep the gitignore
!.gitignore
GITIGNORE
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
      print_tree_start "git.commit.uses set"
      echo "   └─ revoked"
    elif [[ "$QUANT" == "0" && "$PUSH" == "allow" ]]; then
      print_turtle_header "sweet, let it ride"
      print_tree_start "git.commit.uses set"
      echo "   ├─ commits: 0"
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
    # check state file exists
    if [[ ! -f "$STATE_FILE" ]]; then
      print_turtle_header "lets check the meter..."
      print_tree_start "git.commit.uses"
      echo "   └─ no quota set"
      echo ""
      echo "ask your human to grant:"
      echo "  \$ git.commit.uses set --quant N --push allow|block"
      exit 0
    fi

    # read state
    USES=$(jq -r '.uses' "$STATE_FILE")
    PUSH_STATE=$(jq -r '.push' "$STATE_FILE")

    # format push state
    if [[ "$PUSH_STATE" == "allow" ]]; then
      PUSH_DISPLAY="allowed"
    else
      PUSH_DISPLAY="blocked"
    fi

    print_turtle_header "lets check the meter..."
    print_tree_start "git.commit.uses"
    echo "   └─ meter"
    echo "      ├─ left: $USES"
    echo "      └─ push: $PUSH_DISPLAY"
    ;;

  *)
    echo "error: unknown command: $COMMAND"
    echo "usage: git.commit.uses set --quant N --push allow|block"
    echo "       git.commit.uses get"
    exit 2
    ;;
esac
