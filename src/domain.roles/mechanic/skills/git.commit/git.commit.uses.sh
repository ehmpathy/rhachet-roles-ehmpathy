#!/usr/bin/env bash
######################################################################
# .what = manage git commit quota for mechanics
#
# .why  = humans control how many commits a mechanic can make
#         and whether push is allowed
#
# usage:
#   git.commit.uses set --allow 3 --push block
#   git.commit.uses set --allow 1 --push allow
#   git.commit.uses set --allow 0 --push block  # revoke
#   git.commit.uses get
#
# guarantee:
#   - --push is required on set (no silent defaults)
#   - state stored in .meter/git.commit.uses.jsonc
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/output.sh"

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository"
  exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
METER_DIR="$REPO_ROOT/.meter"
STATE_FILE="$METER_DIR/git.commit.uses.jsonc"

# parse command (set or get)
COMMAND=""
ALLOW=""
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
    --allow)
      ALLOW="$2"
      shift 2
      ;;
    --push)
      PUSH="$2"
      shift 2
      ;;
    --help|-h)
      echo "usage: git.commit.uses set --allow N --push allow|block"
      echo "       git.commit.uses get"
      echo ""
      echo "commands:"
      echo "  set    grant commit quota (human only)"
      echo "  get    check quota left"
      echo ""
      echo "options (set):"
      echo "  --allow N             number of commits to allow"
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
      echo "usage: git.commit.uses set --allow N --push allow|block"
      echo "       git.commit.uses get"
      exit 1
      ;;
    *)
      shift
      ;;
  esac
done

# validate command
if [[ -z "$COMMAND" ]]; then
  echo "error: command required (set or get)"
  echo "usage: git.commit.uses set --allow N --push allow|block"
  echo "       git.commit.uses get"
  exit 1
fi

case "$COMMAND" in
  set)
    # validate --allow
    if [[ -z "$ALLOW" ]]; then
      echo "error: --allow N is required"
      echo "usage: git.commit.uses set --allow N --push allow|block"
      exit 1
    fi

    # validate --push required
    if [[ -z "$PUSH" ]]; then
      echo "error: --push allow|block is required"
      echo "usage: git.commit.uses set --allow N --push allow|block"
      exit 1
    fi

    # validate --push value
    if [[ "$PUSH" != "allow" && "$PUSH" != "block" ]]; then
      echo "error: --push must be 'allow' or 'block'"
      echo "usage: git.commit.uses set --allow N --push allow|block"
      exit 1
    fi

    # validate --allow is a number
    if ! [[ "$ALLOW" =~ ^[0-9]+$ ]]; then
      echo "error: --allow must be a non-negative integer"
      exit 1
    fi

    # ensure .meter directory exists
    mkdir -p "$METER_DIR"

    # write state file
    cat > "$STATE_FILE" << EOF
{
  "uses": $ALLOW,
  "push": "$PUSH"
}
EOF

    # output with turtle vibes
    if [[ "$ALLOW" == "0" ]]; then
      print_turtle_header "groovy, break time"
      print_tree_start "git.commit.uses set"
      echo "   └─ revoked"
    elif [[ "$PUSH" == "allow" ]]; then
      print_turtle_header "radical! let's ride!"
      print_tree_start "git.commit.uses set"
      echo "   ├─ granted: $ALLOW"
      echo "   └─ push: allowed"
    else
      print_turtle_header "gnarly! thanks human!"
      print_tree_start "git.commit.uses set"
      echo "   ├─ granted: $ALLOW"
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
      echo "  \$ git.commit.uses set --allow N --push allow|block"
      exit 0
    fi

    # read state
    USES=$(jq -r '.uses' "$STATE_FILE")
    PUSH_STATE=$(jq -r '.push' "$STATE_FILE")

    # format push state (blocked when no uses left, since commit halts before push)
    if [[ "$USES" -le 0 ]]; then
      PUSH_DISPLAY="blocked"
    elif [[ "$PUSH_STATE" == "allow" ]]; then
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
    echo "usage: git.commit.uses set --allow N --push allow|block"
    echo "       git.commit.uses get"
    exit 1
    ;;
esac
