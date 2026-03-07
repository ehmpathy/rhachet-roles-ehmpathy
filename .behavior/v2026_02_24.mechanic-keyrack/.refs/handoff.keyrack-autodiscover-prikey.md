# handoff: keyrack should autodiscover prikey from recipient

## the problem

when using keyrack with a non-default owner (e.g., `--owner ehmpath`), every operation requires `--prikey`:

```sh
# fails: doesn't know which key to use
npx rhachet keyrack list --owner ehmpath

# works: but tedious
npx rhachet keyrack list --owner ehmpath --prikey ~/.ssh/ehmpath
```

the keyrack was initialized with `--pubkey ~/.ssh/ehmpath.pub`, so it knows the recipient's public key. it should be able to find the matching private key automatically.


## current behavior

1. `keyrack init --owner ehmpath --pubkey ~/.ssh/ehmpath.pub` stores the public key in the host manifest
2. subsequent operations try default SSH identities (`~/.ssh/id_rsa`, `~/.ssh/id_ed25519`)
3. if none match, error: "failed to decrypt host manifest with any available identity"
4. user must specify `--prikey ~/.ssh/ehmpath` on every operation


## desired behavior

1. `keyrack init --owner ehmpath --pubkey ~/.ssh/ehmpath.pub` stores both:
   - the public key (for encryption)
   - the private key path hint (for decryption discovery)

2. subsequent operations:
   - read the private key path hint from the host manifest
   - if hint exists and file exists, use it
   - fallback to default SSH identity discovery if hint absent


## implementation options

### option A: store prikey path in host manifest (recommended)

when `keyrack init` is called with `--pubkey /path/to/key.pub`:
1. derive the private key path: strip `.pub` suffix → `/path/to/key`
2. store in host manifest metadata: `{ recipient: { label, pubkey, prikey_path } }`

on decrypt operations:
1. read `prikey_path` from manifest metadata (unencrypted section)
2. if found, try that key first
3. fallback to default discovery


### option B: scan ~/.ssh/ for matching pubkey

on decrypt operations:
1. extract the public key from the manifest
2. scan `~/.ssh/*.pub` files for a match
3. use the corresponding private key

cons: slower, may have false matches if same key exists multiple times


### option C: use ssh-agent

leverage ssh-agent's key management.

cons: requires agent to be active, adds complexity


## recommended approach

option A is simplest and most explicit:

```yaml
# keyrack.host.ehmpath.age (unencrypted metadata section)
recipients:
  - label: default
    pubkey: age1...
    prikey_path: /home/vlad/.ssh/ehmpath  # new field
```

the path is stored at init time, and used for autodiscovery at decrypt time. no scanning, no agent dependency.


## migration

extant host manifests without `prikey_path`:
- continue to use default SSH identity discovery
- `--prikey` flag remains available as override
- users can re-init to add the path hint


## test cases

1. `keyrack init --owner foo --pubkey ~/.ssh/foo.pub` → stores prikey_path
2. `keyrack list --owner foo` → autodiscovers ~/.ssh/foo, succeeds
3. `keyrack list --owner foo --prikey ~/.ssh/other` → override works
4. `keyrack list --owner bar` (old manifest, no prikey_path) → falls back to default discovery


## context

this came up while implementing passwordless ehmpath keyrack for git.commit.push fallback. the init creates `~/.ssh/ehmpath` but every operation needs `--prikey ~/.ssh/ehmpath` which defeats the "invisible infrastructure" goal.

see: `.behavior/v2026_02_24.mechanic-keyrack/1.vision.md` for the vision of keyrack being invisible to mechanics.
