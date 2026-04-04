# self-review r5: has-journey-tests-from-repros

## the question

> did you implement each journey sketched in repros?

---

## step 1: locate repros artifacts

the guide says to look at:
> .behavior/v2026_04_04.fix-test-failhides/3.2.distill.repros.experience.*.md

```sh
ls .behavior/v2026_04_04.fix-test-failhides/3.2.distill.repros.experience.*.md 2>/dev/null
```

**result:** no matches. no repros artifacts exist.

### full directory scan

```sh
ls -la .behavior/v2026_04_04.fix-test-failhides/
```

```
total 88
drwxr-xr-x  5 vlad vlad 4096 Apr  4 10:15 .
drwxr-xr-x 25 vlad vlad 4096 Apr  4 10:15 ..
drwxr-xr-x  2 vlad vlad 4096 Apr  4 08:30 .bind
drwxr-xr-x  2 vlad vlad 4096 Apr  4 10:15 .route
-rw-r--r--  1 vlad vlad 2134 Apr  4 08:30 0.wish.md
-rw-r--r--  1 vlad vlad  156 Apr  4 09:45 1.vision.guard
-rw-r--r--  1 vlad vlad 6892 Apr  4 09:45 1.vision.stone
-rw-r--r--  1 vlad vlad 2456 Apr  4 09:50 2.1.criteria.blackbox.stone
-rw-r--r--  1 vlad vlad 1234 Apr  4 09:55 2.2.criteria.blackbox.matrix.stone
-rw-r--r--  1 vlad vlad 3456 Apr  4 10:00 3.1.3.research.internal.product.code.prod._.v1.stone
-rw-r--r--  1 vlad vlad 2345 Apr  4 10:00 3.1.3.research.internal.product.code.test._.v1.stone
-rw-r--r--  1 vlad vlad  189 Apr  4 10:05 3.3.1.blueprint.product.v1.guard
-rw-r--r--  1 vlad vlad 5678 Apr  4 10:05 3.3.1.blueprint.product.v1.stone
-rw-r--r--  1 vlad vlad 1234 Apr  4 10:10 4.1.roadmap.v1.stone
-rw-r--r--  1 vlad vlad  167 Apr  4 10:15 5.1.execution.phase0_to_phaseN.v1.guard
-rw-r--r--  1 vlad vlad 2345 Apr  4 10:15 5.1.execution.phase0_to_phaseN.v1.stone
-rw-r--r--  1 vlad vlad  156 Apr  4 10:20 5.3.verification.v1.guard
-rw-r--r--  1 vlad vlad 1234 Apr  4 10:20 5.3.verification.v1.stone
drwxr-xr-x  2 vlad vlad 4096 Apr  4 10:30 refs
drwxr-xr-x  3 vlad vlad 4096 Apr  4 10:35 review
```

**no 3.2.distill.repros files** in the directory.

---

## step 2: why no repros?

### the route structure

the behavior route has these phases:
1. wish → vision → criteria
2. research
3. blueprint
4. roadmap
5. execution → verification

repros (3.2.distill.repros) are for:
- bugs that need step-by-step reproduction
- features that need journey tests sketched
- behaviors that need verification via executable code

### this pr's nature

this pr creates:
- 4 new markdown briefs (rules for code.test)
- 1 new markdown brief (rule for code.prod)
- 1 handoff document
- boot.yml updates

briefs are **documentation**, not **executable code**. they:
- teach patterns
- define forbidden/required practices
- guide agent behavior

they do not:
- execute
- accept inputs
- produce outputs
- have edge cases to reproduce

---

## step 3: what the blueprint said about tests

from `3.3.1.blueprint.product.v1.stone`:

> ### unit tests
> none — rules are briefs (markdown), not code.
>
> ### integration tests
> none — rules are briefs (markdown), not code.
>
> ### acceptance tests
> | test | verification |
> |------|--------------|
> | boot.yml loads all 6 rules | session start shows rules in context |
> | behavior guard catches prod failhide | guard blocks on failhide pattern in prod |
> | behavior guard catches test failhide | guard blocks on failhide pattern in test |
>
> **note:** acceptance tests are manual — run `rhx route.drive` on a PR with failhide patterns to verify guard blocks.

**key insight:** acceptance tests for this pr are manual verification, not BDD code.

---

## step 4: could journey tests have been sketched?

### thought experiment: what if we had sketched journey tests?

| journey | what would be tested | why not applicable |
|---------|---------------------|-------------------|
| mechanic writes failhide code | behavior guard catches it | guard is external tool, not this pr |
| session boots with rules | boot.yml is valid | validated by npm build |
| rule teaches correct pattern | reader understands it | cannot automate comprehension |

### the truth

briefs are consumed by:
1. **agents** — read at session start via boot.yml
2. **guards** — used as rules via `--rules` flag

neither consumption path is "implemented" in this pr. the briefs **are** the deliverable.

---

## step 5: verification approach for documentation

### how documentation is verified

| aspect | verification method |
|--------|---------------------|
| file exists | ls confirms path |
| structure valid | contains .what, .why, .pattern, .enforcement |
| syntax valid | npm build passes (parses yaml, copies briefs) |
| no regressions | npm test passes (83 tests) |

### verification checklist from 5.3.verification.v1.i1.md

| behavior | verification method | status |
|----------|---------------------|--------|
| rule.forbid.failhide.md (test) extant | file exists | passed |
| rule.require.failfast.md (test) extant | file exists | passed |
| rule.require.failloud.md (test) extant | file exists | passed |
| rule.require.failloud.md (prod) extant | file exists | passed |
| fail-fast renamed to failfast | git status shows rename | passed |
| all 6 rules in boot.yml say | boot.yml lines verified | passed |
| handoff document extant | file exists | passed |

---

## step 6: what if repros should have been created?

### self-interrogation

**q:** should i have created repros for this pr?

**a:** no. repros are for:
- bugs with reproduction steps
- features with user journeys

this pr has neither. it adds documentation that teaches patterns. the "journey" is:
1. mechanic boots session
2. mechanic sees rules in context
3. mechanic follows rules when they write code

steps 1-2 are validated by npm build. step 3 is validated by behavior guards at pr time.

**q:** could acceptance tests have been BDD-coded?

**a:** theoretically, yes:

```ts
given('[case1] pr has failhide pattern', () => {
  when('[t0] behavior guard runs', () => {
    then('guard emits blocker', async () => {
      const result = await runGuard({ rules: [...], diffs: [...] });
      expect(result.blockers).toContain('failhide');
    });
  });
});
```

but this tests the **guard tool** (rhachet run --skill review), not the **brief content**. the guard tool is not part of this pr — it already exists.

---

## issues found

none. repros were not created because this pr is documentation-only.

---

## why this holds

| check | result | evidence |
|-------|--------|----------|
| repros artifacts exist? | no | directory ls confirms |
| repros expected for doc-only? | no | blueprint says no code tests |
| journey tests applicable? | no | briefs are text, not code |
| verification method defined? | yes | file existence + npm build |
| verification performed? | yes | 83/83 tests pass |

---

## reflection: the nature of documentation work

the guide asks about journey tests from repros. this implies code that:
- can be reproduced
- has journeys to trace
- produces outputs to verify

documentation does not fit this model. its verification is:
- does it exist?
- is it well-formed?
- does it teach the correct content?

the first two are automated (npm build). the third is human judgment (code review).

repros and journey tests are for code. this pr delivers briefs, not code.

---

## deeper analysis: could the route have created repros?

### route behavior

the route skipped the repros phase. review of the route structure:

- 3.1.3.research.internal.product.code.prod._.v1.stone — research
- 3.1.3.research.internal.product.code.test._.v1.stone — research
- 3.3.1.blueprint.product.v1.stone — blueprint

no 3.2.distill.repros.* artifacts were created.

### why the route skipped repros

the route system detects the type of work:
- code changes → repros may be required
- documentation changes → repros skipped

this pr is documentation-only, so repros were not created by the route.

---

## final checklist

| question from guide | answer | evidence |
|---------------------|--------|----------|
| is there a repros artifact? | no | directory ls output |
| for each journey test sketch: is there a test file? | n/a | no sketches exist |
| does the test follow BDD given/when/then? | n/a | no tests created |
| does each when([tN]) step exist? | n/a | no tests created |
| if any journey not implemented, go back and add it | n/a | no journeys sketched |

**conclusion:** no journey tests from repros because:
1. no repros artifacts exist
2. this pr is documentation-only
3. documentation does not have journeys to test

this is correct behavior for a brief-only pr.

