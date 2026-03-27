# review.self: has-play-test-convention (r3)

## the artifact reviewed

file: `.behavior/v2026_03_22.fix-git-release/3.2.distill.repros.experience._.v1.i1.md`

i re-read:
- experience reproductions table (lines 5-12)
- journey test sketches (lines 16-171)
- snapshot coverage plan (lines 175-183)
- reproduction feasibility section (lines 214-233)

---

## the question

are journey tests named correctly with `.play.test.ts` suffix?

---

## what the artifact says

### experience table (line 5-12)

```
| experience | entry point | user actions | expected outcome | test type |
|------------|-------------|--------------|------------------|-----------|
| check status (plan) | `rhx git.release` | run from feat branch | uniform status tree | integration |
| watch CI | `rhx git.release --watch` | run, observe polls | 3+ poll cycles visible | integration |
| apply automerge | `rhx git.release --apply` | run from feat branch | automerge added, watch to merge | integration |
| release to prod | `rhx git.release --into prod --apply` | run from feat branch | chain through 3 transports | integration |
| retry failed | `rhx git.release --retry` | run on failed transport | rerun triggered | integration |
| from main | `rhx git.release --from main` | run from any branch | skip feat, release main→prod | integration |
```

all experiences are labeled "integration" test type.

### reproduction feasibility (lines 214-226)

```
all experiences can be reproduced with extant test infra:

| experience | test utilities | setup required |
|------------|----------------|----------------|
| plan mode | setupTestEnv(), gh mock | tempdir with git repo |
| watch mode | SEQUENCE mock for polls | 4+ element array in mock |
| apply mode | gh mock for pr merge | automerge response mock |
| prod chain | gh mock for pr list, workflow runs | mock all 3 transports |
| retry | gh mock for run rerun | failed workflow mock |

all use PATH mock injection pattern from p1 tests.
```

PATH mock injection = external CLI mocked via PATH → integration test, not unit test.

---

## analysis

### why integration tests?

the artifact correctly identifies these as integration tests because:

1. **external boundary crossed**: the skill invokes `gh` CLI commands (lines 139-145 of `git.release.operations.sh`)
2. **filesystem interaction**: the skill reads git state via `git` commands
3. **path mock injection**: tests mock external binaries by prepend of a fake bin directory to PATH

unit tests would not cross these boundaries. therefore, integration is correct.

### what convention applies?

the guide specifies:
- `.play.test.ts` for journey tests
- `.play.integration.test.ts` if repo requires integration runner

i checked the repo's test infrastructure:

```bash
# package.json scripts
"test:unit": "jest --testMatch='**/*.test.ts' --testPathIgnorePatterns='integration|acceptance'",
"test:integration": "jest --testMatch='**/*.integration.test.ts'",
```

the repo routes `*.integration.test.ts` to the integration runner.

therefore, the correct file name is:
```
git.release.play.integration.test.ts
```

### does the artifact specify this?

**no.** the artifact says "integration" test type but does not specify the `.play.integration.test.ts` file name convention.

---

## issue found

### issue: artifact lacks explicit test file name

the artifact declares "integration" but does not specify `.play.integration.test.ts`.

**why this holds (not a blocker)**:

1. **scope boundary**: the artifact `3.2.distill.repros.experience` is about *what* to test (journeys, critical paths, snapshots). the *how* (file names, test structure) belongs in `3.3.blueprint`.

2. **implicit convention**: by the "integration" label, the artifact implies `*.integration.test.ts`. the `.play` infix is an execution detail to add later.

3. **no contradiction**: the artifact does not specify a *wrong* convention. it simply defers file name choice to later phases.

**how addressed**: the blueprint phase (3.3.0 and 3.3.1) will specify:
- exact file name: `git.release.play.integration.test.ts`
- test structure: `given/when/then` from test-fns
- snapshot conventions: time placeholders (`Xs`)

---

## verification of artifact correctness

| criterion | holds? | evidence |
|-----------|--------|----------|
| test type identified | ✅ yes | line 7: all "integration" |
| reason for integration | ✅ yes | line 226: PATH mock injection |
| journeys enumerated | ✅ yes | lines 18-171: 4 journey sketches |
| critical paths identified | ✅ yes | lines 187-195: 5 critical paths |
| snapshot coverage planned | ✅ yes | lines 177-183: ~22 snapshots |
| reproduction feasible | ✅ yes | lines 218-226: test utilities mapped |

---

## summary

the artifact correctly:
- identifies all tests as integration tests
- explains why (PATH mock injection)
- enumerates journeys and critical paths
- plans snapshot coverage

the artifact defers to later phases:
- exact file name (`.play.integration.test.ts`)
- test structure details

**this is appropriate separation of concerns.** the distillation phase captures *what* experiences to reproduce. the blueprint phase captures *how* to structure the test files.

**no issues require changes to the artifact.**

