# review r10: has-role-standards-adherance

check blueprint against mechanic role standards.

## relevant rule categories

from mechanic briefs loaded at session boot:

1. **code.prod** — production code standards
2. **code.test** — test standards
3. **lang.terms** — term conventions
4. **lang.tones** — tone and style
5. **work.flow** — workflow standards

## code.prod standards check

### rule.require.input-context-pattern

**standard:** functions accept (input, context?) pattern

**blueprint contracts section:**
```typescript
const grant = await keyrack.get({
  key: 'XAI_API_KEY',
  owner: 'ehmpath',
  env: 'prep',
});
```

**analysis:** keyrack.get() is SDK API, not our code. we don't control its signature.

**applies?** no. this is external API usage.

### rule.require.failfast

**standard:** exit immediately on error with clear message

**blueprint contracts section:**
```typescript
if (grant.status === 'locked') {
  console.error(`🔐 XAI_API_KEY locked\n\nrun: rhx keyrack unlock --owner ehmpath --env prep`);
  process.exit(2);
}
```

**analysis:** immediately checks locked state, emits message, exits.

**follows?** yes.

### rule.require.exit-code-semantics

**standard:** exit 2 = constraint error (user must fix)

**blueprint:** uses `process.exit(2)` for locked keyrack.

**follows?** yes. locked keyrack is a constraint the user must fix by unlock.

### rule.forbid.else-branches

**standard:** use early returns, not else branches

**blueprint contracts section:**
```typescript
if (grant.status === 'locked') {
  console.error(...);
  process.exit(2);
}
process.env.XAI_API_KEY = grant.secret;
```

**analysis:** early exit on locked, then continue. no else.

**follows?** yes.

## code.test standards check

### rule.require.given-when-then

**standard:** tests use given/when/then pattern

**blueprint test coverage section:**
- keyrack.ehmpath.integration.test.ts
- git.commit.push.integration.test.ts
- etc.

**analysis:** blueprint lists tests to UPDATE, not new tests. extant tests follow pattern.

**applies?** extant tests follow pattern. no new patterns introduced.

### rule.require.snapshots.[lesson]

**standard:** use snapshots for output verification

**blueprint lists:**
```
- `__snapshots__/git.commit.push.integration.test.ts.snap` — regenerate
```

**follows?** yes. acknowledges snapshots need regeneration after changes.

## lang.terms standards check

### rule.forbid.gerunds

**standard:** no gerunds in names, comments, docs

**blueprint examined:** all terms in contracts section:
- `keyrack.get` — verb, not gerund
- `grant.status` — noun
- `grant.secret` — noun
- `locked` — past participle (adjective), not gerund

**follows?** yes. no gerunds in blueprint code.

### rule.require.ubiqlang

**standard:** use consistent domain terms

**blueprint terms:**
- `grant` — SDK response object
- `keyrack` — credential management system
- `unlock` — action to enable access

**follows?** yes. consistent with keyrack domain language.

## lang.tones standards check

### rule.prefer.lowercase

**standard:** lowercase for comments and docs

**blueprint:** uses lowercase in all text sections except:
- Token names (SCREAMING_SNAKE_CASE) — correct for env vars
- Section headers (markdown)

**follows?** yes.

### rule.im_an.ehmpathy_seaturtle

**standard:** seaturtle personality in human comms

**blueprint:** technical artifact, not human comms.

**applies?** no.

## work.flow standards check

### rule.prefer.sedreplace-for-renames

**standard:** use sedreplace for bulk find-and-replace

**blueprint rename scope section:**
```
sedreplace pattern: `EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN` → `EHMPATHY_SEATURTLE_GITHUB_TOKEN`
```

**follows?** yes. explicitly specifies sedreplace.

### rule.require.test-covered-repairs

**standard:** fixes must include tests

**blueprint test coverage section:** lists all tests to update.

**follows?** yes. tests acknowledged.

## standards summary

| category | standards checked | violations |
|----------|------------------|------------|
| code.prod | failfast, exit-codes, no-else | none |
| code.test | given-when-then, snapshots | none |
| lang.terms | no-gerunds, ubiqlang | none |
| lang.tones | lowercase | none |
| work.flow | sedreplace, test-coverage | none |

## issues found

none.

## why this holds

blueprint follows all relevant mechanic standards:
1. **failfast** — immediate exit on locked state
2. **exit code 2** — correct semantics for constraint
3. **no else** — early return pattern
4. **sedreplace** — specified for bulk rename
5. **test coverage** — acknowledged in test section
6. **snapshots** — regeneration noted
7. **lowercase** — used throughout
8. **no gerunds** — none in contracts code

no anti-patterns or bad practices introduced.

