#!/usr/bin/env bash
######################################################################
# .what = findsert passwordless ehmpath keyrack host
#
# .why  = enables ehmpathy roles to auto-fetch tokens without
#         human intervention. the ehmpath keyrack is a shared,
#         passwordless host manifest for all ehmpath role operations
#         (e.g., mechanic, foreman, etc.).
#
# .how  = 1. findsert passwordless ssh key at ~/.ssh/ehmpath
#         2. findsert ehmpath host keyrack with that key
#
# usage:
#   npx rhachet roles init --repo ehmpathy --role mechanic --init keyrack.ehmpath
#
# guarantee:
#   - idempotent (safe to rerun)
#   - passwordless key (no passphrase prompt)
#   - fail-fast on errors
######################################################################

set -euo pipefail

# fail loud: print what failed
trap 'echo "💥 keyrack.ehmpath.sh failed at line $LINENO" >&2' ERR

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
  echo "   │  ├─"
  echo "   │  │"

  # ensure ~/.ssh exists with correct permissions
  mkdir -p "$HOME/.ssh"
  chmod 700 "$HOME/.ssh"

  # generate passwordless ed25519 key
  ssh-keygen -t ed25519 -f "$EHMPATH_KEY" -N "" -C "ehmpath@$(hostname)" 2>&1 | sed 's/^/   │  │  /'

  echo "   │  │"
  echo "   │  └─"
  echo "   │  └─ created at $EHMPATH_KEY"
  echo ""
fi

######################################################################
# step 2: findsert ehmpath host keyrack
######################################################################
KEYRACK_HOST_MANIFEST="$HOME/.rhachet/keyrack/keyrack.host.ehmpath.age"

if [[ -f "$KEYRACK_HOST_MANIFEST" ]]; then
  echo "   └─ keyrack: found at $KEYRACK_HOST_MANIFEST"
else
  echo "   └─ keyrack: init for owner ehmpath..."
  echo "      ├─"
  echo "      │"
  ./node_modules/.bin/rhachet keyrack init --owner ehmpath --pubkey "$EHMPATH_KEY_PUB" 2>&1 | sed 's/^/      │  /'
  echo "      │"
  echo "      └─"
fi

echo ""
echo "👌 ehmpath keyrack ready"
