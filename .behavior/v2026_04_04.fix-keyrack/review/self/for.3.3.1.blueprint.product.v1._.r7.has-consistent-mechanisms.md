# review r7: has-consistent-mechanisms

deeper review of mechanism consistency. question whether mechanisms could be simpler or more aligned.

## mechanism simplicity check

### SDK vs CLI: could SDK be simpler?

**blueprint uses:**
```typescript
const grant = await keyrack.get({ key: 'XAI_API_KEY', owner: 'ehmpath', env: 'prep' });
if (grant.status === 'locked') { ... }
process.env.XAI_API_KEY = grant.secret;
```

**could we use CLI instead?**

no. CLI would require:
1. spawn child process
2. pass output via jq to extract secret
3. handle exit codes separately

SDK is simpler: one async call, object response, direct property access.

**verdict:** SDK is the minimal mechanism for TypeScript.

### locked error: could format be simpler?

**blueprint uses:**
```typescript
console.error(`🔐 XAI_API_KEY locked\n\nrun: rhx keyrack unlock --owner ehmpath --env prep`);
process.exit(2);
```

**could we omit the emoji?**

yes, but emoji matches extant git.commit.push output style.

**could we use HelpfulError?**

HelpfulError is for thrown errors in orchestrators. this is CLI output to stderr.
console.error + exit(2) is the correct pattern for CLI constraint errors.

**verdict:** format matches extant patterns. no simpler alternative.

### env var set: could we skip it?

**blueprint uses:**
```typescript
process.env.XAI_API_KEY = grant.secret;
```

**could we pass secret directly to downstream?**

no. the brain context expects `process.env.XAI_API_KEY` to be set.
border guard must set it before brain context creation.

**verdict:** env var set is required by downstream. cannot skip.

## mechanism alignment check

### alignment with shell keyrack pattern

shell (keyrack.operations.sh):
```bash
keyrack_output=$(rhachet keyrack get --key X --json)
secret=$(echo "$keyrack_output" | jq -r '.grant.key.secret // empty')
export VAR="$secret"
```

typescript (blueprint):
```typescript
const grant = await keyrack.get({ key: 'X', owner: 'Y', env: 'Z' });
process.env.VAR = grant.secret;
```

**alignment:**
- both fetch via keyrack
- both extract secret
- both set env var
- typescript skips JSON text — SDK returns object directly

**verdict:** aligned. typescript version is more direct due to SDK.

### alignment with unlock message pattern

shell (git.commit.push.sh):
```
fallback to ehmpath owner unlock
```

typescript (blueprint):
```
🔐 XAI_API_KEY locked

run: rhx keyrack unlock --owner ehmpath --env prep
```

**alignment:**
- both mention unlock command
- both specify owner
- typescript adds emoji and formatted output

**verdict:** aligned. typescript adds polish appropriate for CLI.

## questioned: over-engineer risk

**question:** does SDK call add complexity vs direct env check?

**before (apikeys.env):**
```bash
source ~/.config/rhachet/apikeys.env
```
```typescript
if (!process.env.XAI_API_KEY) { exit(2); }
```

**after (keyrack SDK):**
```typescript
const grant = await keyrack.get({ ... });
if (grant.status === 'locked') { emit unlock message; exit(2); }
process.env.XAI_API_KEY = grant.secret;
```

**analysis:**
- before: simpler code, but hardcoded path, no actionable error
- after: slightly more code, but consistent pattern, actionable error

**verdict:** not excessive complexity. adds value via:
1. consistent credential source (keyrack, not file)
2. actionable error message (tells user what to run)
3. alignment with other skills (git.commit.push uses keyrack)

## summary

| mechanism | simplest possible? | aligned with extant? |
|-----------|-------------------|---------------------|
| keyrack SDK | yes (vs CLI) | yes (language-appropriate) |
| locked error | yes (console.error) | yes (matches git.commit.push) |
| env var set | required by downstream | yes (standard pattern) |

## issues found

none. all mechanisms are:
1. the simplest option for the context
2. aligned with extant patterns
3. not excessive for the requirement

## why this holds

the blueprint avoids over-complexity:
- uses SDK (simpler than CLI spawn + jq)
- uses console.error (simpler than HelpfulError for CLI)
- uses direct env set (required by downstream)

every mechanism can trace to a requirement or extant pattern.

