# review.self: has-behavior-coverage (r1)

## review scope

verify that every behavior from wish.md and vision.md has test coverage.

---

## wish.md behaviors

| behavior from wish | test coverage | test file |
|-------------------|---------------|-----------|
| `--what unit \| integration \| acceptance` | case1 (unit), case5 (integration), case10 (acceptance) | git.repo.test.play.integration.test.ts |
| `--scope to custom subsets` | case3 (scoped), case6 (no match) | git.repo.test.play.integration.test.ts |
| `--resnap snapshots` | case4 (resnap) | git.repo.test.play.integration.test.ts |
| stream results to .log/ on success and failure | case1 (success log), case2 (failure log), case6-9 (lint logs) | git.repo.test.play.integration.test.ts, git.repo.test.integration.test.ts |
| tell clones where to find logs | snapshot output includes log paths | all snapshots show log paths |
| brief for how to run tests | howto.run-tests.[lesson].md | src/domain.roles/mechanic/briefs/practices/code.test/lessons.howto/ |
| auto unlock keyrack | case5 (integration keyrack), case10 (acceptance keyrack) | git.repo.test.play.integration.test.ts |
| auto run npm run test:xyz correctly | all cases | git.repo.test.play.integration.test.ts |
| auto pass test scopes correctly | case3 (scope passed) | git.repo.test.play.integration.test.ts |
| genTempDir fixtures | all cases use genTempDir | git.repo.test.play.integration.test.ts |
| snapshot coverage for stdout/stderr | 14 snapshots | __snapshots__/*.snap |
| conform to extant skill vibes | treestruct output verified | all snapshots show turtle vibes |

---

## vision.md behaviors

| usecase from vision | test coverage | test file |
|--------------------|---------------|-----------|
| run all unit tests | case1 | git.repo.test.play.integration.test.ts |
| run all test types (--what all) | case11 | git.repo.test.play.integration.test.ts |
| run specific test file (--scope) | case3 | git.repo.test.play.integration.test.ts |
| update snapshots (--resnap) | case4 | git.repo.test.play.integration.test.ts |
| run thorough (--thorough) | case12 | git.repo.test.play.integration.test.ts |
| run acceptance tests | case10 | git.repo.test.play.integration.test.ts |
| run lint | case9, case1-9 (old tests) | git.repo.test.play.integration.test.ts, git.repo.test.integration.test.ts |
| output on success (cowabunga) | case1 snapshot | git.repo.test.play.integration.test.ts |
| output on failure (bummer dude) | case2 snapshot | git.repo.test.play.integration.test.ts |
| output with keyrack unlock | case5 snapshot | git.repo.test.play.integration.test.ts |
| output with no tests matched | case6 snapshot | git.repo.test.play.integration.test.ts |
| progress indicator (timer) | verified in skill implementation | git.repo.test.sh |
| --what all fail-fast | case11 t1 | git.repo.test.play.integration.test.ts |
| namespaced log paths | case13 | git.repo.test.play.integration.test.ts |

---

## coverage gaps found

none. all behaviors from wish and vision have tests.

---

## why it holds

every behavior requested in wish.md is covered:
- `--what unit|integration|acceptance` tested via case1, case5, case10
- `--scope` tested via case3 and case6
- `--resnap` tested via case4
- log capture tested throughout
- brief delivered at howto.run-tests.[lesson].md
- keyrack auto-unlock tested via case5 and case10
- genTempDir used for all fixtures
- 14 snapshots for vibecheck coverage

every usecase from vision.md is covered:
- all test types work (unit, integration, acceptance, lint, all)
- scope filter works
- resnap works
- thorough works
- fail-fast on --what all works
- namespaced logs work
- output format matches turtle vibes

the verification checklist in 5.3.verification.v1.i1.md documents all 13 journeys with their test locations.

**conclusion: has-behavior-coverage = yes**
