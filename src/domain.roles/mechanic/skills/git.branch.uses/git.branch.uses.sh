#!/usr/bin/env bash
######################################################################
# .what = manage the branch cutover quota for mechanics
#
# .why  = humans control how many `git.branch.cutover` applies a
#         mechanic may run — a peer of git.commit.uses, at the same
#         three levels: global > org (and @all) > local
#
# usage:
#   git.branch.uses set --quant 2               # grant two cutovers here
#   git.branch.uses allow                       # unlimited here
#   git.branch.uses del                         # revoke here
#   git.branch.uses get                         # check quota left
#   git.branch.uses block --global              # block cutovers globally
#   git.branch.uses allow --global              # lift the global blocker
#   git.branch.uses allow --org ehmpathy        # allow cutovers for an org
#   git.branch.uses block --org @all            # block cutovers for all orgs by default
#   git.branch.uses get --org                   # show all org configs
#
# guarantee:
#   - local state in .meter/git.branch.uses.jsonc
#   - global + org state in ~/.rhachet/storage/repo=ehmpathy/role=mechanic/.meter/git.branch.uses*.jsonc
#   - the global + org handlers are the commit meter's own (fulcrum F11)
#   - mutations are human-only; get is open
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
    continue
  fi
  if [[ "$arg" == "--org" ]]; then
    ORG_MODE=true
    continue
  fi
  ARGS+=("$arg")
done

# point the shared handlers at the branch meter. exported, since exec
# hands them the environment and naught else
export METER_SLUG="git.branch.uses"
export METER_NOUN="cutover"

# dispatch: --global > --org > local
if [[ "$GLOBAL_MODE" == "true" ]]; then
  exec "$SCRIPT_DIR/../git.commit/git.commit.uses.global.sh" "${ARGS[@]+"${ARGS[@]}"}"
fi
if [[ "$ORG_MODE" == "true" ]]; then
  exec "$SCRIPT_DIR/../git.commit/git.commit.uses.org.sh" "${ARGS[@]+"${ARGS[@]}"}"
fi
exec "$SCRIPT_DIR/git.branch.uses.local.sh" "${ARGS[@]+"${ARGS[@]}"}"
