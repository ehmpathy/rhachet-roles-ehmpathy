# self-review r9: has-play-test-convention

## test files added/modified

| file | type | convention |
|------|------|------------|
| mvsafe.integration.test.ts | integration | correct |
| rmsafe.integration.test.ts | integration | correct |
| cpsafe.integration.test.ts | integration | correct |

## play tests check

### were play tests added?

no. this PR modifies integration tests only.

### were play tests required?

no. this is a defect fix, not a new feature with user journeys.

### why integration tests are sufficient

1. **defect fix scope:** the fix adds `--literal` flag to bypass glob detection
2. **test coverage:** integration tests verify:
   - flag parse
   - glob bypass
   - file operations
   - hint output (implicit)
3. **no user journey:** the fix is a single flag, not a multi-step workflow

### convention check

| suffix | purpose | used correctly? |
|--------|---------|-----------------|
| `.integration.test.ts` | runs with jest.integration.config.ts | yes |
| `.play.test.ts` | journey/workflow tests | not applicable |

## extant play tests in repo

```bash
git ls-files '*play*test*'
```

```
src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.play.integration.test.ts
```

play tests in this repo use `.play.integration.test.ts` suffix (integration runner with play semantics).

## why it holds

1. **no play tests added:** this is a defect fix, not a journey
2. **integration tests follow convention:** `.integration.test.ts` suffix used correctly
3. **extant play tests unchanged:** git.repo.test.play files modified but not by this PR's scope

## conclusion

play test convention check passes. no play tests were required or added for this defect fix.
