#!/usr/bin/env bash
######################################################################
# .what = findsert passwordless ehmpath keyrack host + configure keys
#
# .why  = enables ehmpathy roles to auto-fetch tokens without
#         human intervention. the ehmpath keyrack is a shared,
#         passwordless host manifest for all ehmpath role operations
#         (e.g., mechanic, foreman, etc.).
#
# .how  = 1. findsert passwordless ssh key at ~/.ssh/ehmpath
#         2. findsert ehmpath host keyrack with that key
#         3. fill required keys from keyrack.yml via keyrack fill
#
# usage:
#   npx rhachet roles init --repo ehmpathy --role mechanic --init keyrack.ehmpath
#   npx rhachet roles init --repo ehmpathy --role mechanic --init keyrack.ehmpath --refresh EHMPATHY_SEATURTLE_GITHUB_TOKEN
#   npx rhachet roles init --repo ehmpathy --role mechanic --init keyrack.ehmpath --refresh @all
#
# options:
#   --refresh <key>   force re-prompt for this key (use when token expires)
#   --refresh @all    force re-prompt for all keys
#
# guarantee:
#   - idempotent (safe to rerun)
#   - passwordless key (no passphrase prompt)
#   - fail-fast on errors
######################################################################

set -euo pipefail

# fail loud: print what failed
trap 'echo "💥 keyrack.ehmpath.sh failed at line $LINENO" >&2' ERR

# parse arguments
REFRESH_KEY=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --refresh)
      REFRESH_KEY="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

EHMPATH_KEY="$HOME/.ssh/ehmpath"
EHMPATH_KEY_PUB="$HOME/.ssh/ehmpath.pub"

echo "🔑 findsert ehmpath keyrack host..."

######################################################################
# step 1: findsert passwordless ssh key
######################################################################
if [[ -f "$EHMPATH_KEY" ]]; then
  echo "   ├─ ssh key: found at $EHMPATH_KEY"
else
  echo "   ├─ ssh key: create passwordless key..."

  # ensure ~/.ssh exists with correct permissions
  mkdir -p "$HOME/.ssh"
  chmod 700 "$HOME/.ssh"

  # generate passwordless ed25519 key
  ssh-keygen -t ed25519 -f "$EHMPATH_KEY" -N "" -C "ehmpath@$(hostname)"

  echo "   ├─ ssh key: created at $EHMPATH_KEY"
fi

######################################################################
# step 2: findsert ehmpath host keyrack
######################################################################
KEYRACK_HOST_MANIFEST="$HOME/.rhachet/keyrack/keyrack.host.ehmpath.age"
MANIFEST_FRESH=false

if [[ -f "$KEYRACK_HOST_MANIFEST" ]]; then
  echo "   ├─ keyrack: found at $KEYRACK_HOST_MANIFEST"
else
  echo "   ├─ keyrack: init for owner ehmpath..."
  ./node_modules/.bin/rhachet keyrack init --owner ehmpath --pubkey "$EHMPATH_KEY_PUB"
  echo "   ├─ keyrack: initialized"
  MANIFEST_FRESH=true
fi

######################################################################
# step 3: fill required keys from keyrack.yml
######################################################################

# build fill args
FILL_ARGS=(
  "--owner" "ehmpath"
  "--prikey" "$EHMPATH_KEY"
  "--env" "prep"
  "--allow-dangerous"
)

# add refresh flag if requested
if [[ -n "$REFRESH_KEY" ]]; then
  if [[ "$REFRESH_KEY" == "@all" ]]; then
    FILL_ARGS+=("--refresh")
  else
    FILL_ARGS+=("--key" "$REFRESH_KEY" "--refresh")
  fi
fi

# fill keys from keyrack.yml
echo "   ├─ fill keys from keyrack.yml..."
./node_modules/.bin/rhachet keyrack fill "${FILL_ARGS[@]}"

echo "   └─ done"
echo ""
echo "👌 ehmpath keyrack ready"
