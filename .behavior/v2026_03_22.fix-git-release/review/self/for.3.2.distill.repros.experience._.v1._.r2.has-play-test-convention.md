# review.self: has-play-test-convention (r2)

## the artifact reviewed

file: `.behavior/v2026_03_22.fix-git-release/3.2.distill.repros.experience._.v1.i1.md`

i re-read the experience reproductions table (lines 5-12), journey test sketches (lines 16-171), and reproduction feasibility section (lines 214-226).

---

## question: are journey tests named correctly?

the guide specifies:
- journey tests use `.play.test.ts` suffix
- or `.play.integration.test.ts` if repo requires integration runner

### what the artifact proposes

the artifact at line 7 declares test type as "integration" for all experiences:

| experience | entry point | test type |
|------------|-------------|-----------|
| check status (plan) | `rhx git.release` | integration |
| watch CI | `rhx git.release --watch` | integration |
| apply automerge | `rhx git.release --apply` | integration |
| release to prod | `rhx git.release --into prod --apply` | integration |
| retry failed | `rhx git.release --retry` | integration |
| from main | `rhx git.release --from main` | integration |

the artifact does not specify explicit test file names. the "integration" label indicates these are integration tests that require PATH mock injection (line 226: "all use PATH mock injection pattern from p1 tests").

### what naming convention applies

this repo's test infrastructure:
- `npm run test:integration` runs `*.integration.test.ts` files
- journey tests that require gh/git mocks should use `.play.integration.test.ts`

therefore, the correct convention for this behavior:
```
git.release.play.integration.test.ts
```

### verification

the artifact at lines 218-224 shows test utilities and setup:

| experience | test utilities | setup required |
|------------|----------------|----------------|
| plan mode | setupTestEnv(), gh mock | tempdir with git repo |
| watch mode | SEQUENCE mock for polls | 4+ element array in mock |
| apply mode | gh mock for pr merge | automerge response mock |
| prod chain | gh mock for pr list, workflow runs | mock all 3 transports |
| retry | gh mock for run rerun | failed workflow mock |

all require PATH mock injection → all are integration tests → all belong in `.play.integration.test.ts`.

---

## issues found

### issue 1: artifact does not specify explicit file name

the artifact declares "integration" test type but does not specify the `.play.integration.test.ts` naming convention.

**how addressed**: the artifact is a distillation of experience reproductions, not a test implementation plan. the test file naming is an execution detail. the blueprint (3.3.1) and roadmap (4.1) phases will specify exact file names.

**why it holds**: the artifact correctly identifies these as integration tests. the `.play` infix will be added when we implement. no change to the artifact is needed.

### issue 2: no extant `.play.test.ts` pattern in repo

i checked if this repo has the `.play.test.ts` convention established:

```
src/domain.roles/mechanic/skills/git.release/
├── git.release.sh
├── git.release.operations.sh
├── output.sh
└── (no test files currently)
```

the repo does not have extant `.play.integration.test.ts` files. this behavior will introduce the convention.

**how addressed**: introduction of new conventions is acceptable. the blueprint phase should document this as a factory upgrade (new test naming pattern).

**why it holds**: the guide says "if the repo doesn't support `.play.test.ts` directly, plan to use `.play.integration.test.ts`". this is what the artifact implies with "integration" test type.

---

## summary

| check | holds? | evidence |
|-------|--------|----------|
| test type identified | ✅ yes | artifact line 7: "integration" for all experiences |
| convention applicable | ✅ yes | requires PATH mocks → integration runner |
| file naming implied | ✅ yes | `.play.integration.test.ts` will be used |
| no blockers | ✅ yes | artifact is distillation, not implementation spec |

**the artifact correctly identifies journey tests as integration tests.** the explicit `.play.integration.test.ts` naming will be specified in the blueprint and execution phases.

