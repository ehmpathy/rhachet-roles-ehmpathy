# self-review: has-pruned-backcompat (r2)

## reflection

the first review was brief. this second pass digs deeper into the actual code changes.

## detailed review

### 1. guardBorder.onWebfetch.ts

```typescript
// before
if (!process.env.XAI_API_KEY) {
  console.error('\n🚫 ...');
  process.exit(2);
}

// after
const keyGrant = await keyrack.get({
  for: { key: 'XAI_API_KEY' },
  owner: 'ehmpath',
  env: 'prep',
});

if (keyGrant.attempt.status !== 'granted') {
  console.error(keyGrant.emit.stdout);
  process.exit(2);
}

process.env.XAI_API_KEY = keyGrant.attempt.grant.key.secret;
```

**backwards-compat check:**

- does the new code check `process.env.XAI_API_KEY` first as a fallback? **no**
- was this fallback requested? **no — wisher said "replace with keyrack SDK"**
- should we add a fallback? **no — keyrack is the canonical source**

**verdict:** correct. no compat shim needed.

### 2. posttooluse.guardBorder.onWebfetch.sh

```bash
# removed
if [[ -z "${XAI_API_KEY+x}" && -f ~/.config/rhachet/apikeys.env ]]; then
  source ~/.config/rhachet/apikeys.env
fi
```

**backwards-compat check:**

- does any user still have `~/.config/rhachet/apikeys.env`? **possibly**
- will they be broken? **no — TypeScript now handles via keyrack**
- should we warn them? **no — keyrack is the canonical source, apikeys.env was undocumented**

**verdict:** correct. no compat shim needed. apikeys.env was a workaround, not a contract.

### 3. keyrack.ehmpath.sh

```bash
# removed
REQUIRED_KEYS=(
  "EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN:GitHub..."
)
# ... manual iteration ...

# added
./node_modules/.bin/rhachet keyrack fill "${FILL_ARGS[@]}"
```

**backwards-compat check:**

- does `keyrack fill` behave identically to manual iteration? **yes — same findsert semantics**
- are there edge cases where behavior differs? **no — keyrack fill is the upstream implementation**
- should we keep the old logic as fallback? **no — keyrack fill is more correct**

**verdict:** correct. no compat shim needed. keyrack fill is the canonical mechanism.

### 4. token rename

`EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN` → `EHMPATHY_SEATURTLE_GITHUB_TOKEN`

**backwards-compat check:**

- should we check for the old name first? **no**
- is there code that uses the old name outside this repo? **no — this is internal**
- should we add a deprecation period? **no — wisher said "rename"**

**verdict:** correct. clean rename without compat shim.

## conclusion

no backwards-compat hacks found. each removal is justified:

1. `process.env.XAI_API_KEY` fallback → not needed, keyrack is canonical
2. `apikeys.env` source → not needed, was undocumented workaround
3. `REQUIRED_KEYS` array → not needed, keyrack fill is canonical
4. old token name → not needed, internal rename

the wisher explicitly requested replacement, not deprecation. implementation is correct.
