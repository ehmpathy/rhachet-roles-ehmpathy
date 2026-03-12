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
#   git.commit.uses del                         # same as set --quant 0
#   git.commit.uses block                       # alias for del
#   git.commit.uses allow                       # shorthand for unlimited
#   git.commit.uses get
#   git.commit.uses block --global              # block commits globally
#   git.commit.uses allow --global              # lift global blocker
#   git.commit.uses get --global                # check global state
#
# guarantee:
#   - --push is required on set (except --quant 0 which defaults to block)
#   - state stored in .meter/git.commit.uses.jsonc
#   - global blocker stored at ~/.rhachet/storage/repo=ehmpathy/role=mechanic/.meter/
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# check for --global flag
GLOBAL_MODE=false
ARGS=()

for arg in "$@"; do
  if [[ "$arg" == "--global" ]]; then
    GLOBAL_MODE=true
  else
    ARGS+=("$arg")
  fi
done

# dispatch to appropriate handler
if [[ "$GLOBAL_MODE" == "true" ]]; then
  exec "$SCRIPT_DIR/git.commit.uses.global.sh" "${ARGS[@]}"
else
  exec "$SCRIPT_DIR/git.commit.uses.local.sh" "${ARGS[@]}"
fi
