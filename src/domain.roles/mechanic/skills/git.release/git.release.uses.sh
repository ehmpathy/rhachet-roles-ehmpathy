#!/usr/bin/env bash
######################################################################
# .what = manage the release meter: may this tree ship?
#
# .why  = a release (a merge to main, a publish, a tag that ships) is the
#         costly act, so it owns its own meter apart from git.commit.uses.
#         a director grants commit + push freely; only this meter lets a
#         crew run `git.release --mode apply`
#
# usage:
#   git.release.uses set --quant 1              # grant one release
#   git.release.uses allow                      # unlimited releases
#   git.release.uses block                      # revoke (alias for del)
#   git.release.uses del                        # revoke
#   git.release.uses get                        # check this tree
#   git.release.uses block --global             # block releases globally
#   git.release.uses allow --global             # lift the global release blocker
#   git.release.uses allow --org ehmpathy       # allow releases for ehmpathy
#   git.release.uses block --org @all           # block releases for every org
#
#   rhx git.commit.uses allow && rhx git.release.uses block   # push all day; never ship
#
# guarantee:
#   - levels compose by AND: global ∧ org ∧ local; unset at any level blocks
#   - local state stored in .meter/git.release.uses.jsonc
#   - global + org state stored at ~/.rhachet/storage/repo=ehmpathy/role=mechanic/.meter/
#   - every write needs a human at a tty; any actor may get
######################################################################
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMIT_SKILL_DIR="$(cd "$SKILL_DIR/../git.commit" && pwd)"

# split out --global and --org
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

# dispatch: the global + org levels share the commit meter's hardened readers,
# scoped to the release meter; the local level holds only a quota
if [[ "$GLOBAL_MODE" == "true" ]]; then
  exec "$COMMIT_SKILL_DIR/git.commit.uses.global.sh" --meter release "${ARGS[@]}"
fi
if [[ "$ORG_MODE" == "true" ]]; then
  exec "$COMMIT_SKILL_DIR/git.commit.uses.org.sh" --meter release "${ARGS[@]}"
fi
exec bash "$SKILL_DIR/git.release.uses.local.sh" "${ARGS[@]}"
