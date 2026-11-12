#!/usr/bin/env bash
######################################################################
# .what = manage git commit quota for mechanics
#
# .why  = humans control how many commits a mechanic can make. the grant
#         covers commit, stage, rebase, and push to the tree's own branch;
#         a release rides git.release.uses alone
#
# usage:
#   git.commit.uses set --quant 3               # grant three commits
#   git.commit.uses set --quant 0               # commit no more; push stays held
#   git.commit.uses del                         # revoke (commit + push)
#   git.commit.uses block                       # alias for del
#   git.commit.uses allow                       # shorthand for unlimited
#   git.commit.uses get
#   git.commit.uses block --global              # block commits globally
#   git.commit.uses allow --global              # lift global blocker
#   git.commit.uses get --global                # check global state
#   git.commit.uses allow --org ehmpathy        # allow commits for ehmpathy org
#   git.commit.uses block --org @all            # block commits for all orgs by default
#   git.commit.uses get --org                   # show all org configs
#
# guarantee:
#   - --push and --stage are retired; each refuses and names the split
#   - a push spends no use, and works at 0 left until a human revokes
#   - state stored in .meter/git.commit.uses.jsonc
#   - global blocker stored at ~/.rhachet/storage/repo=ehmpathy/role=mechanic/.meter/
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# check for --global and --org flags
GLOBAL_MODE=false
ORG_MODE=false
ARGS=()

for arg in "$@"; do
  if [[ "$arg" == "--global" ]]; then
    GLOBAL_MODE=true
  elif [[ "$arg" == "--org" ]]; then
    ORG_MODE=true
  else
    ARGS+=("$arg")
  fi
done

# dispatch to appropriate handler
# precedence: --global > --org > local
if [[ "$GLOBAL_MODE" == "true" ]]; then
  exec "$SCRIPT_DIR/git.commit.uses.global.sh" --meter commit "${ARGS[@]}"
elif [[ "$ORG_MODE" == "true" ]]; then
  exec "$SCRIPT_DIR/git.commit.uses.org.sh" --meter commit "${ARGS[@]}"
else
  exec "$SCRIPT_DIR/git.commit.uses.local.sh" "${ARGS[@]}"
fi
