#!/usr/bin/env bash
######################################################################
# .what = symlink keyrack.yml from dist to .agent
#
# .why  = the mechanic role needs access to keyrack.yml for skills
#         like git.commit.push that require github tokens.
#
#         rhachet roles link creates symlinks for briefs, skills,
#         inits, and readme.md — but not keyrack.yml.
#
#         this init hook fills that gap.
#
# guarantee:
#   ✔ creates symlink if absent
#   ✔ updates symlink if target changed
#   ✔ idempotent: safe to rerun
#   ✔ fail-fast on errors
######################################################################

set -euo pipefail

# fail loud: print what failed
trap 'echo "❌ link.role.keyrack.sh failed at line $LINENO" >&2' ERR

PROJECT_ROOT="$PWD"

# derive the keyrack.yml source (relative to this init's role)
INIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROLE_DIR="$(dirname "$INIT_DIR")"
ROLE_NAME="$(basename "$ROLE_DIR")"

# source is in dist (built from src)
KEYRACK_SOURCE="$PROJECT_ROOT/dist/domain.roles/$ROLE_NAME/keyrack.yml"

# target is in .agent
KEYRACK_TARGET="$PROJECT_ROOT/.agent/repo=ehmpathy/role=$ROLE_NAME/keyrack.yml"

# verify source exists
if [[ ! -f "$KEYRACK_SOURCE" ]]; then
  echo "⚠️  keyrack.yml not found in dist — skipping" >&2
  echo "   run 'npm run build' first" >&2
  exit 0
fi

# ensure target directory exists
mkdir -p "$(dirname "$KEYRACK_TARGET")"

# compute relative path from target to source
TARGET_DIR="$(dirname "$KEYRACK_TARGET")"
RELATIVE_PATH=$(realpath --relative-to="$TARGET_DIR" "$KEYRACK_SOURCE")

# check if symlink already exists and points to the right place
if [[ -L "$KEYRACK_TARGET" ]]; then
  CURRENT_TARGET=$(readlink "$KEYRACK_TARGET")
  if [[ "$CURRENT_TARGET" == "$RELATIVE_PATH" ]]; then
    echo "👌 keyrack.yml already linked"
    echo "   ${KEYRACK_TARGET#"$PROJECT_ROOT/"}"
    exit 0
  fi
  # remove stale symlink
  rm "$KEYRACK_TARGET"
fi

# remove regular file if extant (edge case, but be safe)
if [[ -f "$KEYRACK_TARGET" ]]; then
  echo "⚠️  removing extant file: ${KEYRACK_TARGET#"$PROJECT_ROOT/"}" >&2
  rm "$KEYRACK_TARGET"
fi

# create symlink
ln -s "$RELATIVE_PATH" "$KEYRACK_TARGET"

echo "🔗 keyrack.yml linked"
echo "   ${KEYRACK_TARGET#"$PROJECT_ROOT/"} -> $RELATIVE_PATH"
