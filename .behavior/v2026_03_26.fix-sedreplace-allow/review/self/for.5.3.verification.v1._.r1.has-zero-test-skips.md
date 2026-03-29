# self-review round 1: has-zero-test-skips

## objective

verify no .skip() or .only() in tests created for this behavior.

## scope check

this behavior introduced:
- `pretooluse.allow-rhx-skills.integration.test.ts`

## verification

```
grep -E '\.skip\(|\.only\(' src/domain.roles/mechanic/inits/claude.hooks/*.test.ts
```

result: no matches found.

## pre-extant skips (not from this behavior)

there are skips in other test files:
- cluster.integration.test.ts
- compress.via.bhrain.perfeval.integration.test.ts
- compress.via.llmlingua.integration.test.ts
- etc.

these are pre-extant and unrelated to this behavior.

## why this holds

- no .skip() in pretooluse.allow-rhx-skills.integration.test.ts
- no .only() in pretooluse.allow-rhx-skills.integration.test.ts
- no silent credential bypasses (hook reads stdin, no credentials needed)
- no prior failures carried forward (all 41 tests pass)

## no issues found

zero skips in the new test file.
