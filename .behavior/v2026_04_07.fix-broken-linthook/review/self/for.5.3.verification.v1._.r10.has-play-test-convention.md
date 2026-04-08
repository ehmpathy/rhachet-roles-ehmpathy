# self-review r10: has-play-test-convention

## the question

are journey test files named correctly with `.play.test.ts` suffix?

---

## a pause to reflect

this is the final review. let me verify my prior analysis with fresh eyes.

---

## test file inventory

### search for all test files in this behavior

```bash
find src/domain.roles/mechanic/skills/git.repo.test -name '*.test.ts'
```

### result

```
src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.integration.test.ts
```

one test file. an integration test.

---

## the convention

| suffix | purpose | example |
|--------|---------|---------|
| `.test.ts` | unit tests | `computeTotal.test.ts` |
| `.integration.test.ts` | integration tests | `sdkStripe.integration.test.ts` |
| `.acceptance.test.ts` | acceptance tests | `createInvoice.acceptance.test.ts` |
| `.play.test.ts` | journey tests | `checkout.play.test.ts` |

journey tests (`.play.`) verify complete user flows across multiple components.

---

## classification: is git.repo.test.integration.test.ts a journey test?

### what it tests

looking at the test structure:

```typescript
describe('git.repo.test.sh', () => {
  given('[case1] repo with lint that passes', () => {
    when('[t0] skill is run with --what lint', () => {
      then('exit code is 0', ...);
      then('stdout shows success summary', ...);
    });
  });
  given('[case2] repo with lint defects', () => {
    when('[t0] skill is run with --what lint', () => {
      then('exit code is 2', ...);
      then('stdout shows failure summary', ...);
    });
  });
  // ... more cases
});
```

### analysis

| characteristic | journey test | this test |
|----------------|-------------|-----------|
| spans multiple skills | yes | no - single skill |
| tests user flow | yes | no - tests contract |
| end-to-end scenario | yes | no - isolated scenarios |
| real fs/network | varies | yes - temp repos |

this is an **integration test**:
- tests one skill (`git.repo.test.sh`)
- verifies the skill's contract (exit codes, output format)
- uses real file system (temp dirs with package.json)
- does not span multiple skills or user journeys

### correct suffix?

| file | actual suffix | correct suffix | match? |
|------|---------------|----------------|--------|
| git.repo.test.integration.test.ts | `.integration.test.ts` | `.integration.test.ts` | yes |

---

## would a journey test be appropriate?

### the wish scope

> "we should create a new skill that's run, e.g., `rhx git.repo.test --what lint`"

the wish is for a single skill. the integration tests verify that skill works.

### a potential journey test

a journey test might verify:

```
given: mechanic starts work on feature branch
when: mechanic makes changes that break lint
and: mechanic runs `rhx git.repo.test --what lint`
and: mechanic sees failure with hint
and: mechanic runs `npm run fix`
and: mechanic reruns `rhx git.repo.test --what lint`
then: lint passes
and: mechanic can commit
```

but this is outside the wish scope. the wish asks for a skill, not a journey. journey tests can be added when the onStop hook integration is verified in production.

---

## conclusion

| check | result | reason |
|-------|--------|--------|
| journey tests use `.play.test.ts` | n/a | no journey tests in this behavior |
| integration tests use `.integration.test.ts` | yes | `git.repo.test.integration.test.ts` |
| test type matches purpose | yes | integration test for single skill |
| naming convention followed | yes | suffix matches test type |

**no issues found.** the test file is correctly named. no journey tests are required for this wish scope.

---

## 2026-04-07 final verification

verified via direct file check:

```bash
ls -la src/domain.roles/mechanic/skills/git.repo.test/*.test.ts
```

output:
```
git.repo.test.integration.test.ts
```

the file uses `.integration.test.ts` suffix, which is correct for a test that:
- spawns a real process (bash executable)
- creates real temp directories
- runs real npm commands
- verifies real file system output

the convention holds.

