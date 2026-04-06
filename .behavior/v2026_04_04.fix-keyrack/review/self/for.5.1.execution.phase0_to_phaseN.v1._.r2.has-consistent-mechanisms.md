# self-review: has-consistent-mechanisms

## summary

**verdict**: mechanisms are consistent with codebase patterns

## review

### keyrack access patterns in codebase

| context | interface used | example |
|---------|---------------|---------|
| bash skills | CLI (`rhachet keyrack get`) | `keyrack.operations.sh` |
| TypeScript | SDK (`keyrack.get()`) | `guardBorder.onWebfetch.ts` |

these are consistent — bash uses CLI, TypeScript uses SDK. same core mechanism, different interface appropriate to the language.

### comparison: keyrack.operations.sh vs guardBorder.onWebfetch.ts

**keyrack.operations.sh (bash CLI):**
```bash
keyrack_output=$("$repo_root/node_modules/.bin/rhachet" keyrack get \
  --key EHMPATHY_SEATURTLE_GITHUB_TOKEN \
  --owner ehmpath \
  --env prep \
  --allow-dangerous \
  --json 2>&1)
token=$(echo "$keyrack_output" | jq -r '.grant.key.secret // empty')
```

**guardBorder.onWebfetch.ts (TypeScript SDK):**
```typescript
const keyGrant = await keyrack.get({
  for: { key: 'XAI_API_KEY' },
  owner: 'ehmpath',
  env: 'prep',
});
process.env.XAI_API_KEY = keyGrant.attempt.grant.key.secret;
```

both follow the same pattern:
1. call keyrack with key, owner, env
2. extract secret from response
3. fail if not available

the TypeScript version uses SDK (as wisher requested), the bash version uses CLI. this is correct.

### no duplicated mechanisms

| new code | duplicates? | reuse? |
|----------|-------------|--------|
| `keyrack.get()` in TypeScript | no — first TypeScript keyrack usage | uses SDK (appropriate) |
| `keyrack fill` in init | no — replaces manual REQUIRED_KEYS | uses CLI (appropriate) |

### why not reuse keyrack.operations.sh?

`keyrack.operations.sh` is bash. `guardBorder.onWebfetch.ts` is TypeScript.

options considered:
1. call bash from TypeScript — adds shell dependency
2. call SDK from TypeScript — cleanest, language-native

option 2 is correct. SDK is the native interface for TypeScript.

## conclusion

no duplicated mechanisms. implementation uses appropriate interface for each context (SDK for TypeScript, CLI for bash). this is consistent with how other skills are structured.
