#!/usr/bin/env bash
######################################################################
# .what = manage global git commit blocker for mechanics
#
# .why  = humans can pause all mechanic commits across all repos
#         with a single global circuit breaker
#
# usage:
#   git.commit.uses.global block    # block commits globally
#   git.commit.uses.global allow    # lift global blocker
#   git.commit.uses.global get      # check global blocker state
#
# guarantee:
#   - global blocker stored at ~/.rhachet/storage/repo=ehmpathy/role=mechanic/.meter/
#   - global blocker overrides local quota
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/output.sh"

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository"
  exit 2
fi

# global blocker path
ROLE_REPO="ehmpathy"
ROLE_SLUG="mechanic"
GLOBAL_METER_DIR="$HOME/.rhachet/storage/repo=$ROLE_REPO/role=$ROLE_SLUG/.meter"
GLOBAL_METER_FILE="$GLOBAL_METER_DIR/git.commit.uses.jsonc"

# parse command
COMMAND=""

# first positional arg is command
if [[ $# -ge 1 && "$1" != --* ]]; then
  COMMAND="$1"
  shift
fi

while [[ $# -gt 0 ]]; do
  case $1 in
    block|allow|get)
      COMMAND="$1"
      shift
      ;;
    --help|-h)
      echo "usage: git.commit.uses --global block"
      echo "       git.commit.uses --global allow"
      echo "       git.commit.uses --global get"
      echo ""
      echo "commands:"
      echo "  block  pause all mechanic commits globally"
      echo "  allow  lift global blocker, resume local behavior"
      echo "  get    check global blocker state"
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
      echo "usage: git.commit.uses --global block|allow|get"
      exit 2
      ;;
    *)
      shift
      ;;
  esac
done

# validate command
if [[ -z "$COMMAND" ]]; then
  echo "error: command required (block, allow, or get)"
  echo "usage: git.commit.uses --global block|allow|get"
  exit 2
fi

######################################################################
# guard: mutation commands require TTY (human only)
# note: __I_AM_HUMAN=true allows integration tests to run mutations
######################################################################
case "$COMMAND" in
  block|allow)
    if [[ ! -t 0 && "${__I_AM_HUMAN:-}" != "true" ]]; then
      print_turtle_header "bummer dude..."
      print_tree_start "git.commit.uses $COMMAND --global"
      print_tree_error "only humans can run this command"
      exit 2
    fi
    ;;
esac

case "$COMMAND" in
  block)
    # create global blocker file
    mkdir -p "$GLOBAL_METER_DIR"
    cat > "$GLOBAL_METER_FILE" << EOF
{
  "blocked": true
}
EOF

    print_turtle_header "groovy, bond fire time"
    print_tree_start "git.commit.uses block --global"
    echo "   └─ commits blocked globally"
    ;;

  allow)
    # delete global blocker file (no-op if absent)
    if [[ -f "$GLOBAL_METER_FILE" ]]; then
      rm -f "$GLOBAL_METER_FILE"
    fi

    print_turtle_header "shell yeah, back in the water!"
    print_tree_start "git.commit.uses allow --global"
    echo "   └─ commits resumed globally"
    ;;

  get)
    print_turtle_header "lets check the global meter..."
    print_tree_start "git.commit.uses get --global"

    if [[ -f "$GLOBAL_METER_FILE" ]]; then
      # check if file is valid json and has blocked: true
      if BLOCKED_VAL=$(jq -r '.blocked // false' "$GLOBAL_METER_FILE" 2>/dev/null); then
        if [[ "$BLOCKED_VAL" == "true" ]]; then
          echo "   └─ global: blocked"
        else
          echo "   └─ global: not blocked"
        fi
      else
        # corrupt file - treat as blocked
        echo "   └─ global: blocked (file corrupt)"
      fi
    else
      echo "   └─ global: not blocked"
    fi
    ;;

  *)
    echo "error: unknown command: $COMMAND"
    echo "usage: git.commit.uses --global block|allow|get"
    exit 2
    ;;
esac
