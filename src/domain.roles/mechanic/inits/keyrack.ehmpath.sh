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
# step 3: configure required keys
######################################################################
REQUIRED_KEYS=(
  "EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN"
)

# relock then unlock to ensure fresh daemon state
# (daemon caches manifest, relock forces reload of any changes)
# note: redirect stdin from /dev/null so these don't consume piped input
./node_modules/.bin/rhachet keyrack relock \
  --owner ehmpath </dev/null >/dev/null 2>&1 || true

./node_modules/.bin/rhachet keyrack unlock \
  --owner ehmpath \
  --prikey "$EHMPATH_KEY" \
  --env all </dev/null >/dev/null 2>&1 || true

for KEY in "${REQUIRED_KEYS[@]}"; do
  # if manifest is fresh, we know keys need to be configured (skip get check)
  # this avoids stale values from system secret store
  if [[ "$MANIFEST_FRESH" == "true" ]]; then
    echo "   ├─ key $KEY: configure..."
    # keyrack set reads from stdin (interactive or piped)
    ./node_modules/.bin/rhachet keyrack set \
      --owner ehmpath \
      --prikey "$EHMPATH_KEY" \
      --key "$KEY" \
      --env all \
      --vault os.secure

    # reload just this key into daemon (daemon doesn't auto-refresh on vault changes)
    ./node_modules/.bin/rhachet keyrack relock \
      --owner ehmpath \
      --key "$KEY" </dev/null >/dev/null 2>&1 || true
    ./node_modules/.bin/rhachet keyrack unlock \
      --owner ehmpath \
      --prikey "$EHMPATH_KEY" \
      --key "$KEY" \
      --env all </dev/null >/dev/null 2>&1 || true

    # verify key can be fetched back (fail-fast)
    VERIFY_EXIT=0
    ./node_modules/.bin/rhachet keyrack get \
      --owner ehmpath \
      --key "$KEY" \
      --env all \
      --allow-dangerous </dev/null >/dev/null 2>&1 || VERIFY_EXIT=$?
    if [[ $VERIFY_EXIT -ne 0 ]]; then
      echo "   └─ key $KEY: FAILED to verify after set (exit $VERIFY_EXIT)" >&2
      exit 1
    fi
    echo "   ├─ key $KEY: configured ✓"
    continue
  fi

  # manifest exists, check if key is already configured
  # note: redirect stdin from /dev/null so get doesn't consume piped input
  # note: --allow-dangerous bypasses safety blocks for long-lived tokens
  GET_EXIT=0
  GET_OUTPUT=$(./node_modules/.bin/rhachet keyrack get \
    --owner ehmpath \
    --key "$KEY" \
    --env all \
    --allow-dangerous </dev/null 2>&1) || GET_EXIT=$?

  if [[ $GET_EXIT -eq 0 ]]; then
    echo "   ├─ key $KEY: configured ✓"
  else
    echo "   ├─ key $KEY: configure..."
    # keyrack set reads from stdin (interactive or piped)
    ./node_modules/.bin/rhachet keyrack set \
      --owner ehmpath \
      --prikey "$EHMPATH_KEY" \
      --key "$KEY" \
      --env all \
      --vault os.secure

    # reload just this key into daemon (daemon doesn't auto-refresh on vault changes)
    ./node_modules/.bin/rhachet keyrack relock \
      --owner ehmpath \
      --key "$KEY" </dev/null >/dev/null 2>&1 || true
    ./node_modules/.bin/rhachet keyrack unlock \
      --owner ehmpath \
      --prikey "$EHMPATH_KEY" \
      --key "$KEY" \
      --env all </dev/null >/dev/null 2>&1 || true

    # verify key can be fetched back (fail-fast)
    VERIFY_EXIT=0
    ./node_modules/.bin/rhachet keyrack get \
      --owner ehmpath \
      --key "$KEY" \
      --env all \
      --allow-dangerous </dev/null >/dev/null 2>&1 || VERIFY_EXIT=$?
    if [[ $VERIFY_EXIT -ne 0 ]]; then
      echo "   └─ key $KEY: FAILED to verify after set (exit $VERIFY_EXIT)" >&2
      exit 1
    fi
    echo "   ├─ key $KEY: configured ✓"
  fi
done

echo "   └─ done"
echo ""
echo "👌 ehmpath keyrack ready"
