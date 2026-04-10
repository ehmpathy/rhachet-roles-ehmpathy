# review.self: has-play-test-convention (r9)

## review scope

ninth pass. verify journey test files follow the `.play.` convention.

---

## convention

journey tests use `.play.test.ts` suffix:
- `feature.play.test.ts` — journey test
- `feature.play.integration.test.ts` — if repo requires integration runner
- `feature.play.acceptance.test.ts` — if repo requires acceptance runner

---

## verification

### test file location

**expected:** journey tests in `src/domain.roles/mechanic/skills/git.repo.test/`

**actual:** `src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.play.integration.test.ts`

**verdict:** correct location. collocated with the skill it tests.

---

### test file name

**expected:** `git.repo.test.play.integration.test.ts`
- `git.repo.test` — skill name
- `.play.` — journey test marker
- `.integration.` — integration test marker (spawns processes, touches filesystem)
- `.test.ts` — test file suffix

**actual:** `git.repo.test.play.integration.test.ts`

**verdict:** correct name. follows all conventions.

---

### why `.integration.` not `.acceptance.`

| test type | uses | when to use |
|-----------|------|-------------|
| `.test.ts` | pure unit | no i/o, no mocks |
| `.integration.test.ts` | spawns processes, filesystem | this skill test |
| `.acceptance.test.ts` | blackbox via artifact | end-to-end |

the skill tests:
- spawn `bash` processes to run the skill
- create temp directories via `genTempDir`
- write fixture files via `fs.writeFileSync`

these are integration test characteristics, not acceptance test characteristics. acceptance tests would invoke via the actual CLI entry point.

**verdict:** `.integration.` is the correct test type.

---

## why it holds

1. **location correct**: test file collocated with skill
2. **name follows convention**: `{skill}.play.integration.test.ts`
3. **test type correct**: integration (not acceptance) because it tests the skill directly
4. **suffix present**: `.play.` marks this as a journey test

the play test convention is followed correctly.

**conclusion: has-play-test-convention = verified (ninth pass)**

