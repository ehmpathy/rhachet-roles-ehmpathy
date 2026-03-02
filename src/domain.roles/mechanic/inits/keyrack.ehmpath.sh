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
#         3. configure required keys (e.g., EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN)
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

if [[ -f "$KEYRACK_HOST_MANIFEST" ]]; then
  echo "   ├─ keyrack: found at $KEYRACK_HOST_MANIFEST"
else
  echo "   ├─ keyrack: init for owner ehmpath..."
  npx rhachet keyrack init --owner ehmpath --pubkey "$EHMPATH_KEY_PUB"
  echo "   ├─ keyrack: initialized"
fi

######################################################################
# step 3: configure required keys
######################################################################
REQUIRED_KEYS=(
  "EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN"
)

for KEY in "${REQUIRED_KEYS[@]}"; do
  # check if key is already configured
  # note: prikey required for list until autodiscovery is implemented (see handoff doc)
  LIST_OUTPUT=$(npx rhachet keyrack list --owner ehmpath --prikey "$EHMPATH_KEY" 2>&1) || {
    echo "   💥 keyrack list failed:"
    echo "$LIST_OUTPUT"
    exit 1
  }

  if echo "$LIST_OUTPUT" | grep -q "$KEY"; then
    echo "   ├─ key $KEY: configured ✓"
  else
    echo "   ├─ key $KEY: configure..."
    npx rhachet keyrack set \
      --owner ehmpath \
      --prikey "$EHMPATH_KEY" \
      --key "$KEY" \
      --vault os.secure
  fi
done

echo "   └─ done"
echo ""
echo "👌 ehmpath keyrack ready"
