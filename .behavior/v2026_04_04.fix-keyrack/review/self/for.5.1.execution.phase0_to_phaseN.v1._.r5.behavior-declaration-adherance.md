# self-review: behavior-declaration-adherance

## code vs spec comparison

### guardBorder.onWebfetch.ts

**blueprint contract:**
```typescript
import { keyrack } from 'rhachet/keyrack';

const result = await keyrack.get({
  for: { key: 'XAI_API_KEY' },
  owner: 'ehmpath',
  env: 'prep',
});

if (result.attempt.status !== 'granted') {
  console.error(result.emit.stdout);
  process.exit(2);
}

process.env.XAI_API_KEY = result.attempt.grant.key.secret;
```

**actual code (lines 29-42):**
```typescript
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

| aspect | spec | actual | match? |
|--------|------|--------|--------|
| import | `from 'rhachet/keyrack'` | `from 'rhachet/keyrack'` | ✅ |
| key | `XAI_API_KEY` | `XAI_API_KEY` | ✅ |
| owner | `ehmpath` | `ehmpath` | ✅ |
| env | `prep` | `prep` | ✅ |
| status check | `!== 'granted'` | `!== 'granted'` | ✅ |
| error output | `result.emit.stdout` | `keyGrant.emit.stdout` | ✅ |
| exit code | `2` | `2` | ✅ |
| secret path | `result.attempt.grant.key.secret` | `keyGrant.attempt.grant.key.secret` | ✅ |

variable name `keyGrant` vs `result` is acceptable — clearer name.

### keyrack.yml

**spec:**
```yaml
env.prep:
├─ EHMPATHY_SEATURTLE_GITHUB_TOKEN (renamed)
└─ XAI_API_KEY
```

**actual:**
```yaml
env.prep:
  - EHMPATHY_SEATURTLE_GITHUB_TOKEN
  - XAI_API_KEY
```

| aspect | spec | actual | match? |
|--------|------|--------|--------|
| token name | `EHMPATHY_SEATURTLE_GITHUB_TOKEN` | `EHMPATHY_SEATURTLE_GITHUB_TOKEN` | ✅ |
| XAI key | present | present | ✅ |
| env | `env.prep` | `env.prep` | ✅ |

### posttooluse.guardBorder.onWebfetch.sh

**spec:**
```
├─ [-] source ~/.config/rhachet/apikeys.env
└─ [○] exec node ... guardBorderOnWebfetch()
```

**actual:**
- apikeys.env source block removed ✅
- exec node delegation retained ✅

### keyrack.ehmpath.sh

**spec:**
```
└─ [~] step 3: configure required keys
      ├─ [-] REQUIRED_KEYS array + manual iteration
      └─ [+] keyrack fill --owner ehmpath --env prep
```

**actual (excerpt):**
```bash
echo "   ├─ fill keys from keyrack.yml..."
./node_modules/.bin/rhachet keyrack fill "${FILL_ARGS[@]}"
```

| aspect | spec | actual | match? |
|--------|------|--------|--------|
| REQUIRED_KEYS removed | yes | ✅ |
| keyrack fill used | yes | ✅ |
| owner | ehmpath | in FILL_ARGS | ✅ |
| env | prep | in FILL_ARGS | ✅ |

## deviations found

**none.**

implementation matches spec exactly. only variance is variable name `keyGrant` vs `result` which improves clarity.

## conclusion

implementation adheres to behavior declaration. no misinterpretations or deviations.
