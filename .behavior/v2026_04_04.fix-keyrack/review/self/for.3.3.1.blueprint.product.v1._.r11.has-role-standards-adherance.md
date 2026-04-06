# review r11: has-role-standards-adherance

deeper review of mechanic standards adherance.

## additional standards to check

### rule.require.dependency-injection (input, context)

**standard:** pass dependencies via context argument

**blueprint:** SDK import, not procedure definition

**applies?** the blueprint shows what to ADD to extant code. the extant guardBorderOnWebfetch() does not use (input, context) pattern because it's a CLI entry point that reads from stdin.

**question:** should we refactor to (input, context)?

**answer:** no. CLI entry points build their own context from environment. the pattern applies to domain operations, not CLI wrappers.

**follows?** yes. correctly scoped.

### rule.forbid.failhide

**standard:** never hide errors silently

**blueprint:**
```typescript
if (grant.status === 'locked') {
  console.error(`🔐 XAI_API_KEY locked\n\nrun: rhx keyrack unlock --owner ehmpath --env prep`);
  process.exit(2);
}
```

**analysis:** error is emitted to stderr AND exits. not hidden.

**follows?** yes.

### rule.require.failloud

**standard:** errors must include actionable context

**blueprint error message:**
```
🔐 XAI_API_KEY locked

run: rhx keyrack unlock --owner ehmpath --env prep
```

**analysis:** includes:
- what failed: XAI_API_KEY locked
- how to fix: specific command to run

**follows?** yes. actionable error.

### rule.require.idempotent-procedures

**standard:** procedures should be safe to retry

**analysis:** keyrack.get() is idempotent:
- does not mutate state
- same input = same output
- safe to call multiple times

**follows?** yes.

### rule.forbid.nullable-without-reason

**standard:** nullable fields need domain reason

**blueprint:** `grant.secret` — could be null if locked?

**analysis:** blueprint handles locked state separately. if we reach `grant.secret`, state is unlocked, so secret is present.

**follows?** yes. locked state handled before access.

### rule.require.bounded-contexts

**standard:** domains own their logic

**blueprint changes:**
- keyrack.yml — keyrack config (keyrack context)
- guardBorder.onWebfetch.ts — border guard (guard context)

**analysis:** border guard fetches credentials via keyrack SDK. each domain maintains its own responsibility.

**follows?** yes.

## code patterns deep dive

### pattern: async/await

**standard:** use async/await for promises

**blueprint:**
```typescript
const grant = await keyrack.get({ ... });
```

**follows?** yes.

### pattern: const over let

**standard:** immutable variables preferred

**blueprint:**
```typescript
const grant = await keyrack.get({ ... });
```

**follows?** yes. uses const.

### pattern: arrow functions

**standard:** prefer arrow syntax

**blueprint:** shows code to add inside extant function, not new function definition.

**applies?** to new function definitions only. this is code addition.

## shell procedure standards

### posttooluse.guardBorder.onWebfetch.sh changes

**blueprint:**
```
├─ [-] source ~/.config/rhachet/apikeys.env
└─ [○] exec node ... guardBorderOnWebfetch()
```

**standards check:**
- removes hardcoded path (good)
- keeps exec delegation (correct pattern)
- no new shell logic added

**follows?** yes. removal only.

## test standards deep dive

### rule.forbid.redundant-expensive-operations

**standard:** avoid duplicate expensive calls in tests

**blueprint:** lists tests to UPDATE for rename, not new test logic.

**applies?** extant tests follow this. no new patterns.

### rule.require.given-when-then

**standard:** BDD test structure

**blueprint test files listed:**
- keyrack.ehmpath.integration.test.ts
- git.commit.push.integration.test.ts
- etc.

**analysis:** these are extant tests that already follow given-when-then. blueprint just renames token references.

**follows?** yes.

## standards that could but don't apply

| standard | why it doesn't apply |
|----------|---------------------|
| rule.require.clear-contracts | CLI entry point, not domain op |
| rule.require.domain-driven-design | no new domain objects |
| rule.prefer.wet-over-dry | no abstraction decisions |
| rule.forbid.barrel-exports | no new exports |
| rule.require.directional-deps | no new cross-layer imports |

## issues found

none.

## why this holds

all applicable mechanic standards are followed:

1. **failfast + failloud** — immediate exit with actionable error
2. **exit code 2** — constraint semantics correct
3. **idempotent** — keyrack.get() is read-only
4. **bounded contexts** — each domain owns its responsibility
5. **const over let** — immutable variable
6. **async/await** — correct promise pattern
7. **shell removal** — simplifies, adds no new code

the blueprint adds minimal code that follows all patterns.

