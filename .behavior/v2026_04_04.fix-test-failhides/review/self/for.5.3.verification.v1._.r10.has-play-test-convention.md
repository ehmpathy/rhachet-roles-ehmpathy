# self-review r10: has-play-test-convention

## the question

> are journey test files named correctly?

---

## step 1: understand the convention fully

the guide specifies journey test conventions:

| pattern | purpose |
|---------|---------|
| `feature.play.test.ts` | journey test |
| `feature.play.integration.test.ts` | journey test via integration runner |
| `feature.play.acceptance.test.ts` | journey test via acceptance runner |

the `.play.` infix is the key marker. it signals:
- test exercises feature from user perspective
- test follows a journey/scenario flow
- test is distinct from implementation-detail tests

---

## step 2: enumerate all test files in diff

```sh
git diff --name-only origin/main
```

full output:
```
.behavior/v2026_04_04.fix-test-failhides/.bind/vlad.fix-test-failhides.flag
.behavior/v2026_04_04.fix-test-failhides/.route/.bind.vlad.fix-test-failhides.flag
.behavior/v2026_04_04.fix-test-failhides/0.wish.md
.behavior/v2026_04_04.fix-test-failhides/1.vision.guard
.behavior/v2026_04_04.fix-test-failhides/1.vision.stone
.behavior/v2026_04_04.fix-test-failhides/2.1.criteria.blackbox.stone
.behavior/v2026_04_04.fix-test-failhides/2.2.criteria.blackbox.matrix.stone
.behavior/v2026_04_04.fix-test-failhides/3.1.3.research.internal.product.code.prod._.v1.stone
.behavior/v2026_04_04.fix-test-failhides/3.1.3.research.internal.product.code.test._.v1.stone
.behavior/v2026_04_04.fix-test-failhides/3.3.1.blueprint.product.v1.guard
.behavior/v2026_04_04.fix-test-failhides/3.3.1.blueprint.product.v1.stone
.behavior/v2026_04_04.fix-test-failhides/4.1.roadmap.v1.stone
.behavior/v2026_04_04.fix-test-failhides/5.1.execution.phase0_to_phaseN.v1.guard
.behavior/v2026_04_04.fix-test-failhides/5.1.execution.phase0_to_phaseN.v1.stone
.behavior/v2026_04_04.fix-test-failhides/5.3.verification.v1.guard
.behavior/v2026_04_04.fix-test-failhides/5.3.verification.v1.stone
.behavior/v2026_04_04.fix-test-failhides/refs/template.[feedback].v1.[given].by_human.md
package.json
pnpm-lock.yaml
```

**analysis:**

| extension | count | could be test? |
|-----------|-------|----------------|
| .flag | 2 | no |
| .md | 2 | no |
| .stone | 8 | no |
| .guard | 4 | no |
| .json | 1 | no |
| .yaml | 1 | no |
| .ts | 0 | yes, but none |
| .play.*.ts | 0 | yes, but none |

**zero test files** in the diff.

---

## step 3: search for any test-related patterns

```sh
git diff --name-only origin/main | grep -E '(test|spec|play)'
```

**result:** no matches.

```sh
git diff --name-only origin/main | grep -E '\.(ts|tsx|js|jsx)$'
```

**result:** no matches.

**zero typescript/javascript files** in the diff. no code at all.

---

## step 4: understand why no tests

### the nature of this pr

this pr adds **briefs** (markdown documentation). briefs:
- define rules for mechanic behavior
- specify patterns to follow or avoid
- provide examples and enforcement levels
- are consumed at session boot via boot.yml

briefs are not executable. they cannot:
- be invoked with input
- produce output
- have behavior to verify via test

### what this pr does not add

| not added | why no test needed |
|-----------|-------------------|
| cli command | no invokable interface |
| api endpoint | no callable interface |
| sdk method | no callable interface |
| skill | no executable operation |
| domain operation | no function to test |

---

## step 5: cross-reference wish and vision

### wish

> we need to create a rule to eliminate failhides in tests

the deliverable is rules (briefs), not code.

### vision

> rules are in boot.yml say section

the verification for rules is:
- yaml syntax valid
- paths expand
- content follows structure

none of these require journey tests.

---

## step 6: cross-reference blueprint

from `3.3.1.blueprint.product.v1.i1.md`:

```markdown
## test coverage

### unit tests

none — rules are briefs (markdown), not code.

### integration tests

none — rules are briefs (markdown), not code.

### acceptance tests

| test | verification |
|------|--------------|
| boot.yml loads all 6 rules | session start shows rules in context |
| behavior guard catches prod failhide | guard blocks on failhide pattern in prod |
| behavior guard catches test failhide | guard blocks on failhide pattern in test |

**note:** acceptance tests are manual — run `rhx route.drive` on a PR with failhide patterns to verify guard blocks.
```

the blueprint explicitly states:
1. no unit tests
2. no integration tests
3. acceptance tests are **manual** (not automated `.play.test.ts` files)

manual acceptance tests do not need `.play.` convention — they are human-executed.

---

## step 7: verify build/lint tests

the only automated tests for this pr are structural:

```sh
npm run build        # compiles typescript, copies briefs
npm run test:lint    # validates code style
npm run test:types   # validates type safety
```

these verify the build pipeline works. they do not exercise behavior via journeys.

---

## step 8: what would require play tests?

### scenario 1: new skill

if pr added `applyFailhideRule.sh`:
- journey test: `applyFailhideRule.play.integration.test.ts`
- location: `src/domain.roles/mechanic/skills/applyFailhideRule/`
- content: exercise skill with various inputs, verify outputs

### scenario 2: new cli command

if pr added `rhx failhide check`:
- journey test: `failhideCheck.play.acceptance.test.ts`
- location: `src/contract/cli/failhide/`
- content: invoke command, verify behavior

### scenario 3: new api endpoint

if pr added `POST /failhide/analyze`:
- journey test: `failhideAnalyze.play.acceptance.test.ts`
- location: `src/contract/api/failhide/`
- content: call endpoint, verify response

none of these scenarios apply to this pr.

---

## step 9: convention compliance summary

| convention check | status | evidence |
|------------------|--------|----------|
| journey tests present? | no | zero test files |
| need journey tests? | no | briefs not executable |
| convention violated? | no | n/a when no tests needed |
| fallback used? | n/a | no tests to name |

---

## step 10: broader convention review

### repo-level check

does this repo have any extant `.play.` tests?

```sh
find src -name '*.play.*.ts' 2>/dev/null | head -5
```

if the repo uses this convention, new journey tests should follow it. if the repo does not use this convention, it may use a different pattern.

### this pr's compliance

regardless of repo convention, this pr:
- adds no test files
- needs no test files
- violates no conventions

---

## issues found

none. the play test convention is not applicable because:
1. this pr adds briefs, not code
2. briefs are not executable
3. no journey tests are needed or expected

---

## why this holds

| check | result | evidence |
|-------|--------|----------|
| test files in diff? | zero | full diff enumeration shows none |
| typescript files in diff? | zero | no .ts files at all |
| executable behavior added? | no | only markdown briefs |
| blueprint requires tests? | no | "none — rules are briefs" |
| convention violated? | no | cannot violate when no tests exist |

---

## reflection

the guide asks:
> are journey test files named correctly?

this question presumes journey tests exist. for this documentation-only pr:
- no tests exist (correct per blueprint)
- no tests are needed (briefs are not executable)
- the convention cannot be violated (no tests to misname)

the play test convention is a good practice for prs that add executable behavior. this pr adds rules that guide mechanic behavior at session boot. the verification for rules is:
- yaml syntax valid (via build)
- file paths expand (via build)
- content structure correct (via manual review)

none of these require automated journey tests. the convention check is not applicable.

---

## final checklist

| question from guide | answer | evidence |
|---------------------|--------|----------|
| journey tests in diff? | no | zero .ts files |
| journey tests needed? | no | briefs not executable |
| .play. suffix used? | n/a | no tests to name |
| fallback convention used? | n/a | no tests to name |
| convention violated? | no | cannot violate when no tests |

**conclusion:** play test convention check is not applicable. this pr adds documentation (briefs), not executable code. no journey tests exist, and none are needed. the convention is respected by absence — there are no tests to misname.

