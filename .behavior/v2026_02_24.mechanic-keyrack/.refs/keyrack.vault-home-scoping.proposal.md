# proposal: keyrack vault HOME-scoped storage

## primary use case: integration tests with isolated HOME

integration tests use isolated HOME directories via `genTempDir`. each test should have fully isolated keyrack state:
- host manifest (already HOME-scoped via `~/.rhachet/keyrack/keyrack.host.{owner}.age`)
- daemon cache (recently upgraded to be HOME-scoped)
- vault storage (currently NOT HOME-scoped — this proposal)

## problem observed

test flow:
1. create temp HOME with SSH keypair fixture
2. run `keyrack init` → creates host manifest in temp HOME ✓
3. run `keyrack set` with stdin "test-fixture-secret" → says "vault: os.secure" ✓
4. run `keyrack get` → blocked 🚫 "detected github classic pat (ghp_*)"

but stdin was "test-fixture-secret", not a `ghp_*` token.

## root cause hypothesis

the `os.secure` vault appears to read from the system secret store (e.g., gnome-keyring, kde-wallet, macOS keychain) rather than the HOME-scoped file vault. the "PERMANENT_VIA_REPLICA" mechanism seems to replicate from the system store.

when keyrack get runs:
1. checks file vault at `$HOME/.rhachet/keyrack/vault/os.secure/` — finds our test value
2. BUT also checks system secret store — finds real `ghp_*` token from user's actual keyrack
3. returns the system store value (which triggers the dangerous token block)

## proposal

keyrack vaults should be fully HOME-scoped. when HOME differs from the real user HOME:
1. file vault should be the ONLY source of truth
2. system secret store should NOT be checked (or should be keyed by HOME hash)
3. replication should only happen from HOME-scoped sources

### option A: scope system store by HOME hash

```
keyrack set → store at key "ehmpathy.all.KEY:hash(HOME)"
keyrack get → lookup at key "ehmpathy.all.KEY:hash(HOME)"
```

### option B: disable system store when HOME differs

```
if HOME != real_user_home:
  vault_sources = [file_vault_only]
else:
  vault_sources = [file_vault, system_store]
```

### option C: explicit vault isolation flag

```
keyrack set --vault os.secure --isolated
keyrack get --vault os.secure --isolated
```

## acceptance criteria

given HOME=/tmp/test-xyz
  when `keyrack set --key X` with stdin "test-value"
    then the value is stored in HOME-scoped vault
  when `keyrack get --key X`
    then the value returned is "test-value" (not from system store)
    then system store secrets for same key name are NOT accessed

## current workaround

tests fail because the vault reads from system store instead of the isolated file vault. no clean workaround without keyrack changes.

## summary

keyrack daemon was upgraded to scope by HOME. vaults need the same treatment. currently `os.secure` leaks state from the system secret store into HOME-isolated test environments.
