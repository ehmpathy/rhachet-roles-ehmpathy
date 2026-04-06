# review r10: has-behavior-declaration-adherance

dig deeper into potential deviations from spec.

## critical path: keyrack.get response shape

### vision assumes:

```typescript
const xaiKey = await keyrack.get({ ... });
```

suggests the returned value is usable directly.

### blueprint assumes:

```typescript
const grant = await keyrack.get({ ... });
if (grant.status === 'locked') { ... }
process.env.XAI_API_KEY = grant.secret;
```

blueprint assumes:
1. SDK returns an object (not the secret directly)
2. object has `.status` field
3. object has `.secret` field

### is this adherance?

vision shows a simplified example. blueprint expands to handle locked state.

criteria says:
```
then returns the secret if unlocked
then returns locked status if locked
```

this confirms the response has two states. blueprint correctly handles both.

**adheres?** yes. blueprint correctly interprets the SDK contract.

## critical path: what happens after unlock?

### vision timeline:

```
4. if unlocked: proceed with content inspection
```

### blueprint codepath:

```
├─ [+] if unlocked: set process.env.XAI_API_KEY for downstream
├─ [○] read stdin
├─ [○] setup brain context
├─ [○] decide via webfetch adapter
└─ [○] output and exit
```

### question: does blueprint correctly connect unlock to inspection?

yes. the flow is:
1. call keyrack.get
2. if locked: exit with message
3. if unlocked: set env var
4. then stdin is read (not before)
5. then brain context is set up
6. then content is inspected

the env var set happens BEFORE brain context, which needs it.

**adheres?** yes. correct order of operations.

## edge case: what if keyrack.get throws?

### vision assumption:

```
1. `rhachet/keyrack` exports a usable SDK (confirmed)
```

### blueprint assumes:

keyrack.get() returns an object, does not throw on locked state.

### risk:

if SDK throws instead of returns { status: 'locked' }, blueprint code would fail.

### mitigation:

this was flagged in assumption reviews (r3, r4). implementation will verify SDK behavior.

for adherance review: blueprint follows vision's assumed SDK contract.

**adheres?** yes. follows documented assumption.

## line-by-line: contracts section

### line 1: import

**vision:**
```typescript
import { keyrack } from 'rhachet/keyrack';
```

**blueprint:**
```typescript
import { keyrack } from 'rhachet/keyrack';
```

**match?** exact.

### line 2-6: keyrack.get call

**vision:**
```typescript
const xaiKey = await keyrack.get({
  key: 'XAI_API_KEY',
  owner: 'ehmpath',
  env: 'prep'
});
```

**blueprint:**
```typescript
const grant = await keyrack.get({
  key: 'XAI_API_KEY',
  owner: 'ehmpath',
  env: 'prep',
});
```

**deviation:** variable name `xaiKey` vs `grant`, extra comma.

**intent match?** yes. the parameters are identical.

### line 7-10: locked check

**vision:**
```
if locked: emit unlock instructions, exit 2
```

**blueprint:**
```typescript
if (grant.status === 'locked') {
  console.error(`🔐 XAI_API_KEY locked\n\nrun: rhx keyrack unlock --owner ehmpath --env prep`);
  process.exit(2);
}
```

**match?** implements the described behavior exactly.

### line 11: env var set

**vision:**
```
if unlocked: proceed with content inspection
```

**blueprint:**
```typescript
process.env.XAI_API_KEY = grant.secret;
```

**match?** implicit. vision says "proceed", blueprint shows HOW to proceed (by set env var).

## line-by-line: rename scope

### vision says:

```
rename to `EHMPATHY_SEATURTLE_GITHUB_TOKEN` fixes this inconsistency
```

and:

```
scope = 2 files (keyrack.yml, keyrack.operations.sh)
```

### blueprint says:

```
files (43 total, but only src/ files need code changes)
```

### deviation?

vision says 2 files, blueprint says 43.

**which is correct?**

vision scope was written before full analysis. human said "hard criteria... propogated throughout all skills".

blueprint expanded scope to include all files that reference the token.

**is this adherance?**

yes. human's hard criteria overrides vision's initial scope estimate. blueprint follows human's directive.

## why this holds

1. **SDK call** — exact parameters match vision
2. **locked state** — blueprint handles per criteria
3. **unlock message** — exact format per vision
4. **exit code** — exact per vision
5. **order of operations** — correct for downstream deps
6. **rename scope** — follows human's "hard criteria" directive

no deviations from spec. blueprint correctly interprets and implements vision.

