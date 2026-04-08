# self-review r9: has-play-test-convention

## the question

are journey test files named correctly with `.play.test.ts` suffix?

---

## convention reference

| suffix | purpose | when to use |
|--------|---------|-------------|
| `.test.ts` | unit tests | pure logic, no i/o |
| `.integration.test.ts` | integration tests | touches fs, db, network |
| `.acceptance.test.ts` | acceptance tests | black box via contract |
| `.play.test.ts` | journey tests | end-to-end user journeys |

---

## test files in this behavior

### found test files

```
src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.integration.test.ts
```

### classification

| file | type | suffix correct? |
|------|------|-----------------|
| git.repo.test.integration.test.ts | integration | yes |

---

## analysis: is this a journey test?

### what is a journey test?

journey tests verify complete user journeys that span multiple skills or systems. they answer: "can a user complete this end-to-end flow?"

examples of journey tests:
- user commits, pushes, creates PR, merges to main
- user runs declapract upgrade through all phases
- user authenticates, performs action, logs out

### what is an integration test?

integration tests verify a single skill or component works correctly with real dependencies. they answer: "does this skill work as contracted?"

examples of integration tests:
- skill runs npm command and captures output
- skill creates log files in correct location
- skill emits correct exit codes

### this behavior's test

`git.repo.test.integration.test.ts` tests the `git.repo.test` skill:
- creates temp repo with package.json
- runs the skill with various inputs
- verifies exit codes, output, log files

this is an integration test, not a journey test. it tests one skill with real file system operations.

---

## why no journey test needed

the wish for this behavior is narrow:

> "we should create a new skill that's run, e.g., `rhx git.repo.test --what lint`"

this is a single skill. the integration tests verify its contract. a journey test would be appropriate for a flow like:

> "mechanic runs lint check, sees failure, runs fix, reruns check, passes"

but that's a future enhancement, not the scope of this wish.

---

## conclusion

| check | result |
|-------|--------|
| journey tests use `.play.test.ts` | n/a (no journey tests) |
| integration tests use `.integration.test.ts` | yes |
| test type matches test purpose | yes |

no convention violation. the test file is correctly named for its purpose.

