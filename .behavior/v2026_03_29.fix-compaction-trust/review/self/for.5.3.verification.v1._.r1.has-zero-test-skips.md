# self-review r1: has-zero-test-skips

## question

did you verify zero skips?

## verification

### .skip() or .only() search

```
grep -r "\.skip\(|\.only\(" src/domain.roles/mechanic/inits/claude.hooks/*.test.ts
```

**result:** no matches found

### silent credential bypasses

reviewed test file: `postcompact.trust-but-verify.integration.test.ts`

- test uses `spawnSync` to execute hook directly
- no credentials required (hook is informational only)
- no auth tokens or api keys involved

**result:** no credential bypasses (none needed)

### prior failures carried forward

- all tests pass (verified via `npm run test`)
- no `RESNAP=true` overrides used
- no `@ts-ignore` or `@ts-expect-error` added

**result:** no prior failures carried forward

## why it holds

the hook tests are straightforward integration tests that:
1. execute the hook executable via `spawnSync`
2. verify stdout content and exit code
3. require no external services or credentials

no skips were needed because the tests are self-contained and deterministic.

