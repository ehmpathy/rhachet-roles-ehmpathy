# self-review r9: has-play-test-convention

## test files added in this PR

| file | type | convention |
|------|------|------------|
| pretooluse.forbid-test-background.integration.test.ts | integration | `.integration.test.ts` |
| getMechanicRole.test.ts | unit | `.test.ts` (modified) |

## is `.play.test.ts` required?

the `.play.test.ts` convention is for **journey tests** - tests that simulate a full user journey through a feature.

this PR adds an **integration test** for a hook. the test:
- sends JSON to the hook
- checks exit codes and stderr
- verifies behavior in isolation

this is **component integration**, not journey simulation.

## extant convention in this repo

checked extant hook tests:

```
pretooluse.check-permissions.integration.test.ts
pretooluse.forbid-sedreplace-special-chars.integration.test.ts
pretooluse.forbid-suspicious-shell-syntax.integration.test.ts
pretooluse.forbid-tmp-writes.integration.test.ts
postcompact.trust-but-verify.integration.test.ts
```

all use `.integration.test.ts` suffix, not `.play.test.ts`.

## why `.integration.test.ts` is correct

1. **extant pattern.** all similar hook tests use this suffix.
2. **semantic accuracy.** these are integration tests, not journey simulations.
3. **test runner compatibility.** repo uses `test:integration` for these files.

## why it holds

the test file follows the extant convention for hook tests in this repo. no `.play.test.ts` is required because this is not a journey test.

## gaps found

none.
