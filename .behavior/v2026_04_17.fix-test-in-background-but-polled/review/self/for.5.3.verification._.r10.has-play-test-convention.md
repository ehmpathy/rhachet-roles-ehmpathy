# self-review r10: has-play-test-convention (verified)

## searched for .play.test.ts files

```bash
glob: src/**/*.play.test.ts
result: no files found
```

## conclusion

this repo does not use the `.play.test.ts` convention. the convention in use is:

| test type | suffix | example |
|-----------|--------|---------|
| unit | `.test.ts` | getMechanicRole.test.ts |
| integration | `.integration.test.ts` | pretooluse.*.integration.test.ts |
| acceptance | `.acceptance.test.ts` | (none in this dir) |

## the test file added in this PR

```
pretooluse.forbid-test-background.integration.test.ts
```

this follows the extant `.integration.test.ts` convention for hook tests.

## why .play.test.ts is not applicable

1. **repo does not use this convention.** zero .play.test.ts files found.
2. **semantic mismatch.** "play" implies journey simulation. this test is component integration.
3. **extant pattern is clear.** all hook tests use `.integration.test.ts`.

## why it holds

the test file follows the established convention for this repo. no .play.test.ts files exist, so the fallback (`.integration.test.ts`) is correct.

## gaps found

none.
