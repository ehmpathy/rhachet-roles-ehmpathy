# self-review: behavior-declaration-adherance (r6)

## methodology

read each changed source file line by line, compared against vision and blueprint spec.

## file-by-file verification

### 1. guardBorder.onWebfetch.ts

**blueprint contract (lines 106-121):**
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

**actual implementation (lines 1-42):**

| line | spec | actual | adherent? |
|------|------|--------|-----------|
| import | `import { keyrack } from 'rhachet/keyrack'` | `import { keyrack } from 'rhachet/keyrack'` | ✅ exact match |
| call | `keyrack.get({ for: { key: 'XAI_API_KEY' }, owner: 'ehmpath', env: 'prep' })` | same | ✅ exact match |
| status check | `result.attempt.status !== 'granted'` | `keyGrant.attempt.status !== 'granted'` | ✅ semantic match |
| error output | `console.error(result.emit.stdout)` | `console.error(keyGrant.emit.stdout)` | ✅ semantic match |
| exit code | `process.exit(2)` | `process.exit(2)` | ✅ exact match |
| secret access | `result.attempt.grant.key.secret` | `keyGrant.attempt.grant.key.secret` | ✅ semantic match |

**why `keyGrant` is acceptable:**
the blueprint uses `result` as a generic variable name. the implementation uses `keyGrant` which is more descriptive of what the variable holds. this improves readability without a semantic change.

### 2. keyrack.yml

**blueprint spec (lines 69-75):**
```
env.prep:
├─ [~] EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN → EHMPATHY_SEATURTLE_GITHUB_TOKEN
└─ [+] XAI_API_KEY
```

**actual implementation:**
```yaml
env.prep:
  - EHMPATHY_SEATURTLE_GITHUB_TOKEN
  - XAI_API_KEY
```

| requirement | actual | adherent? |
|-------------|--------|-----------|
| rename token | `EHMPATHY_SEATURTLE_GITHUB_TOKEN` (no `_PROD_`) | ✅ |
| add XAI_API_KEY | present under env.prep | ✅ |
| env is prep | `env.prep:` | ✅ |

### 3. keyrack.ehmpath.sh

**blueprint spec (lines 59-67):**
```
├─ [○] step 1: findsert passwordless ssh key
├─ [○] step 2: findsert ehmpath host keyrack
└─ [~] step 3: configure required keys
      ├─ [-] REQUIRED_KEYS array + manual iteration
      └─ [+] keyrack fill --owner ehmpath --env prep
```

**actual implementation verification:**

| requirement | actual (line) | adherent? |
|-------------|---------------|-----------|
| step 1 retained | lines 54-69: ssh key findsert | ✅ |
| step 2 retained | lines 72-84: keyrack init | ✅ |
| REQUIRED_KEYS removed | no REQUIRED_KEYS array present | ✅ |
| keyrack fill used | line 109: `./node_modules/.bin/rhachet keyrack fill "${FILL_ARGS[@]}"` | ✅ |
| --owner ehmpath | line 92: `"--owner" "ehmpath"` | ✅ |
| --env prep | line 94: `"--env" "prep"` | ✅ |

### 4. posttooluse.guardBorder.onWebfetch.sh

**blueprint spec (lines 77-82):**
```
├─ [-] source ~/.config/rhachet/apikeys.env
└─ [○] exec node ... guardBorderOnWebfetch()
```

**actual implementation:**
- no `source ~/.config/rhachet/apikeys.env` line — removed ✅
- exec node delegation present — line 22: `exec node -e "import('rhachet-roles-ehmpathy/cli').then(m => m.guardBorderOnWebfetch())" -- "$@"` ✅
- comment documents keyrack — line 21: `# note: TypeScript handles credentials via keyrack SDK` ✅

## vision alignment check

**vision describes (lines 20-29):**
> mechanic tries to use WebFetch. border guard checks keyrack:
> ```
> 🔐 XAI_API_KEY locked
> run: rhx keyrack unlock --owner ehmpath --env prep
> ```

**implementation approach:**
the code uses `console.error(keyGrant.emit.stdout)` — it emits the SDK-provided message rather than a hardcoded format. this is correct because:
1. the SDK knows the current state (locked, absent, blocked)
2. the SDK formats actionable instructions
3. future SDK improvements propagate without code changes

## deviations found

**none.**

all implementation matches the specification:
- keyrack SDK used (not CLI) as per vision decision
- env.prep used as per confirmed question
- token renamed as per confirmed question
- REQUIRED_KEYS replaced with keyrack fill as per blueprint
- apikeys.env source removed as per blueprint
- all codepath items implemented as specified

## why it holds

1. **import location correct** — `'rhachet/keyrack'` is the documented SDK path
2. **parameter structure correct** — `{ for: { key }, owner, env }` matches SDK contract
3. **error path correct** — uses SDK-provided stdout for unlock instructions
4. **exit code semantics preserved** — exit 2 for blocked/locked state
5. **secret access path correct** — `result.attempt.grant.key.secret` is the documented path
6. **keyrack fill simplification correct** — delegates key enumeration to keyrack.yml

## conclusion

implementation adheres to behavior declaration. no misinterpretations or deviations.
