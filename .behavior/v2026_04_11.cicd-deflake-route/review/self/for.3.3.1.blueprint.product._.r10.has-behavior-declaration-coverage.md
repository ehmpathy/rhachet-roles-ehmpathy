# self-review r10: has-behavior-declaration-coverage

## verification

compared each requirement from the wish against the blueprint line by line. for each requirement, identified the matched blueprint section and verified sub-requirements are covered.

---

## source documents

- **wish**: `.behavior/v2026_04_11.cicd-deflake-route/0.wish.md` (68 lines)
- **blueprint**: `.behavior/v2026_04_11.cicd-deflake-route/3.3.1.blueprint.product.yield.md` (410 lines)

---

## methodology

for each wish requirement:
1. extract exact text from wish
2. locate matched blueprint section
3. map each sub-requirement to blueprint content
4. verify guards enforce required constraints
5. articulate why coverage holds

---

## requirement coverage

### wish requirement 1: gather evidence

**wish says:**
```
1. gather evidence of what tests had flaked, how often, from the source of truth
    - only consider cicd runs that ran on main
    - gather evidence thoroughly, enumerate the full timeline
        - which test
        - how often
        - what error
```

**blueprint provides (1.evidence.stone):**
```markdown
gather evidence of flaky tests from main-branch CI runs.

## flake inventory
for each flake:
- test name                           ← covers "which test"
- frequency (N failures in M runs)    ← covers "how often"
- error messages                      ← covers "what error"
- first occurrence / last occurrence  ← covers "full timeline"

## evidence sources
- github actions workflow runs on main  ← covers "only main"
- lookback period: 30 days (default)
```

**why it holds:**

the wish requires 4 specific data points per flake:
1. "which test" → blueprint: "test name" field
2. "how often" → blueprint: "frequency (N failures in M runs)"
3. "what error" → blueprint: "error messages"
4. "full timeline" → blueprint: "first occurrence / last occurrence"

the wish requires "only main" filter → blueprint: "github actions workflow runs on main"

all 5 sub-requirements have explicit blueprint coverage.

**verdict:** covered.

---

### wish requirement 2: diagnose root cause

**wish says:**
```
2. diagnose rootcause for each
    - what makes it flake? how can we prove that was the root cause?
    - do we need to add observability to prove?
    - if we run the test now, does it still flake?
    - what are the various possible causes and probability of each?

    we should have self-review guards that ensure that every single test
    flagged as a flake in stone 1 is covered in stone 2
```

**blueprint provides (2.diagnosis.stone):**
```markdown
diagnose root cause for each flake in evidence.

## diagnosis per flake
for each flake from evidence:
- root cause hypotheses (ranked by probability)  ← covers probability
- verification approach for each hypothesis      ← covers how to prove
- observability additions if needed              ← covers observability
- does it still reproduce?                       ← covers "still flake?"
```

**blueprint provides (2.diagnosis.guard):**
```yaml
reviews:
  self:
    - slug: has-complete-coverage
      say: |
        does the diagnosis cover every flake from evidence?
        check: count flakes in 1.evidence.yield.md
        check: count diagnoses in 2.diagnosis.yield.md
        if any flake is absent from diagnosis, this is a BLOCKER.
```

**why it holds:**

the wish requires 4 questions answered per flake:
1. "what makes it flake?" → blueprint: "root cause hypotheses (ranked by probability)"
2. "how can we prove?" → blueprint: "verification approach for each hypothesis"
3. "add observability?" → blueprint: "observability additions if needed"
4. "still flake?" → blueprint: "does it still reproduce?"

the wish requires guard for 1:1 coverage → blueprint: 2.diagnosis.guard with has-complete-coverage self-review that counts flakes in evidence vs diagnoses in yield.

critical: the guard explicitly says "if any flake is absent from diagnosis, this is a BLOCKER" — this enforces the wish requirement that "every single test flagged as a flake in stone 1 is covered in stone 2."

**verdict:** covered.

---

### wish requirement 3: propose plan with tips

**wish says:**
```
3. propose a plan to deflake
    - what steps will we take for each test
    - what is our expectation and how can we verify it worked

    - tips for future travelers
        - is it inherently probabilistic? when.repeatedly
        - is there a race condition? consider xyz
        - is it a snapshot issue? mask the dynamic part

    we should have self-review guards that guarantee we retain test intent
    - no skip
    - no accepted failure
```

**blueprint provides (3.plan.stone):**
```markdown
propose a plan to deflake each test.

## plan per flake
for each diagnosed flake:
- repair steps                  ← covers "steps for each test"
- verification criteria         ← covers "how can we verify"
- tips for future travelers     ← covers tips requirement
```

**blueprint provides (3.plan.guard):**
```yaml
reviews:
  self:
    - slug: has-preserved-test-intent
      say: |
        does the plan preserve test intent?

        BLOCKERS:
        - plan includes test skip        ← covers no skip
        - plan includes accepted failure ← covers no accepted failure
        - plan removes assertions without replacement

        test intent must be preserved. repair the flake, not the test.
```

**why it holds:**

the wish requires 3 plan elements:
1. "steps for each test" → blueprint: "repair steps"
2. "how can we verify" → blueprint: "verification criteria"
3. "tips for future travelers" → blueprint: explicit "tips for future travelers" section

the wish requires guard to retain test intent with explicit blockers:
- "no skip" → blueprint guard: "plan includes test skip" is BLOCKER
- "no accepted failure" → blueprint guard: "plan includes accepted failure" is BLOCKER
- bonus: blueprint adds "plan removes assertions without replacement" as additional BLOCKER

the guard explicitly states: "test intent must be preserved. repair the flake, not the test." — this directly addresses the wish requirement.

**verdict:** covered.

---

### wish requirement 4: execute with peer-review

**wish says:**
```
4. execute the plan
    - make the updates
    - release

    - apply peer-review guard to detect missed failfast or added failhides
        - see how the behavior route does it, on 3.3.1 execution guard
```

**blueprint provides (4.execution.stone):**
```markdown
execute the repair plan.

## execution checklist
- [ ] repairs made (code or infra)   ← covers updates
- [ ] changes committed
- [ ] PR merged to main              ← covers release
- [ ] CI passed at least once
```

**blueprint provides (4.execution.guard):**
```yaml
protect:
  - src/**/*

reviews:
  peer:
    - npx rhachet run --repo bhrain --skill review --rules '.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.{prod,test}/pitofsuccess.errors/rule.*.md' --diffs since-main --paths-with 'src/**/*' --join intersect --output '$route/.reviews/$stone.peer-review.failhides.md' --mode hard

judges:
  - npx rhachet run --repo bhrain --skill route.stone.judge --mechanism reviewed? --stone $stone --route $route --allow-blockers 0 --allow-nitpicks 3
```

**why it holds:**

the wish requires 2 execution elements:
1. "make the updates" → blueprint: "repairs made (code or infra)" checklist item
2. "release" → blueprint: "PR merged to main" checklist item

the wish requires peer-review for failhide detection, referencing behavior route's 3.3.1 execution guard.

blueprint provides peer-review that:
- uses rules: `.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.{prod,test}/pitofsuccess.errors/rule.*.md`
- these rules include rule.forbid.failhide and rule.require.failfast
- outputs to: `$route/.reviews/$stone.peer-review.failhides.md`
- has judge: `--mechanism reviewed? --allow-blockers 0` — zero blockers allowed

the peer-review command structure matches the pattern from bhrain behavior routes.

**verdict:** covered.

---

### wish requirement 5: verify 3x pass with rewind

**wish says:**
```
5. verify zero flakes
    - run the build 3x in a row
    - ensure that it passes 3x in a row without any flakes
    - if there are any flakes, set the route as rewound to stone 3
```

**blueprint provides (5.verification.stone):**
```markdown
verify zero flakes with 3 consecutive CI runs.

## verification runs
| run | result | link |
|-----|--------|------|
| 1 | ? | |
| 2 | ? | |
| 3 | ? | |

## outcome
- [ ] all 3 runs passed → proceed to itemize
- [ ] any run failed → rewind to plan (rhx route.stone.set --stone 3.plan --as rewound)
```

**blueprint provides (5.verification.guard):**
```yaml
reviews:
  self:
    - slug: has-three-passes
      say: |
        did all 3 verification runs pass?
        check: 5.verification.yield.md shows 3 runs
        check: all 3 runs show "pass" result
        if any run failed, driver must run:
          rhx route.stone.set --stone 3.plan --as rewound
        this is a BLOCKER if any run failed.
```

**why it holds:**

the wish requires 3 verification elements:
1. "run the build 3x" → blueprint: stone has table with runs 1, 2, 3; guard checks "3 runs"
2. "passes 3x without flakes" → blueprint guard: "all 3 runs show 'pass' result"
3. "if any flakes, rewind to stone 3" → blueprint stone: "rhx route.stone.set --stone 3.plan --as rewound"; guard: "if any run failed, driver must run: [rewind command]"

the guard explicitly makes failure a BLOCKER: "this is a BLOCKER if any run failed."

this enforces the wish requirement that verification failures trigger rewind, not just a warning.

**verdict:** covered.

---

### wish requirement 6: itemize repairs

**wish says:**
```
6. itemize the repairs
    - declare exactly how each flake detected in stone 1 has been fixed
        - what was the true root cause
        - what was the true root repair
        - how was it verified
        - does it make sense, fundamentally?
```

**blueprint provides (6.repairs.stone):**
```markdown
itemize each repair with traceability.

## repair inventory
for each flake from evidence:
- true root cause (confirmed)      ← covers root cause
- true repair (what changed)       ← covers root repair
- verification (which run proved it) ← covers how verified
- does it make sense fundamentally?  ← covers sense check
```

**why it holds:**

the wish requires 4 data points per repair:
1. "true root cause" → blueprint: "true root cause (confirmed)"
2. "true root repair" → blueprint: "true repair (what changed)"
3. "how was it verified" → blueprint: "verification (which run proved it)"
4. "does it make sense" → blueprint: "does it make sense fundamentally?"

blueprint explicitly states "for each flake from evidence" — this ensures traceability back to stone 1.

**verdict:** covered.

---

### wish requirement 7: reflect with prevention strategies

**wish says:**
```
7. emit reflection document
    - what have we learned the root causes to be
    - why were they introduced to begin with?
    - how could we have systemically prevented them?
        - peer-review rules?
        - self-review rules?
        - factory upgrades?
        - infrastructure upgrades?
```

**blueprint provides (7.reflection.stone):**
```markdown
reflect on systemic lessons.

## root cause patterns
what patterns caused these flakes?

## introduction vectors
why were these flakes introduced?

## prevention strategies
how could we systemically prevent these?
- peer-review rules?           ← explicit
- self-review rules?           ← explicit
- factory upgrades?            ← explicit
- infrastructure upgrades?     ← explicit

## proposed briefs
propose new briefs for `.agent/repo=.this/role=any/briefs/`:
```

**why it holds:**

the wish requires 3 questions answered:
1. "what root causes" → blueprint: "root cause patterns" section
2. "why introduced" → blueprint: "introduction vectors" section
3. "how prevent" → blueprint: "prevention strategies" section with exact sub-items:
   - "peer-review rules?" → explicit
   - "self-review rules?" → explicit
   - "factory upgrades?" → explicit
   - "infrastructure upgrades?" → explicit

blueprint adds bonus: "proposed briefs" section for institutional memory — this exceeds the wish requirement by crystallizing lessons into reusable briefs.

**verdict:** covered.

---

### wish requirement: zero human approval

**wish says:**
```
note, zero human approval required along the route
```

**blueprint provides:**

examined all guards:
- 2.diagnosis.guard: self-review only
- 3.plan.guard: self-review only
- 4.execution.guard: peer-review (automated), judge (automated)
- 5.verification.guard: self-review only

no `reviews.human:` sections. no `--mechanism approved?` judges.

**why it holds:**

examined all 4 guards for human review requirements:

| guard | reviews.self | reviews.peer | reviews.human | judges |
|-------|-------------|--------------|---------------|--------|
| 2.diagnosis.guard | has-complete-coverage | none | **none** | none |
| 3.plan.guard | has-preserved-test-intent | none | **none** | none |
| 4.execution.guard | none | pitofsuccess.errors review | **none** | reviewed? (automated) |
| 5.verification.guard | has-three-passes | none | **none** | none |

no guard has:
- `reviews.human:` section
- `--mechanism approved?` judge (which requires human approval)

all reviews are either self-reviews (automated by the driver) or peer-reviews (automated by rhachet review skill).

**verdict:** covered.

---

## summary

| wish requirement | blueprint coverage | verdict |
|-----------------|-------------------|---------|
| 1. gather evidence (main only, which/how often/error) | 1.evidence.stone | covered |
| 2. diagnose with completeness guard | 2.diagnosis.stone + guard | covered |
| 3. plan with tips + intent preservation guard | 3.plan.stone + guard | covered |
| 4. execute with failhide peer-review | 4.execution.stone + guard | covered |
| 5. verify 3x with rewind | 5.verification.stone + guard | covered |
| 6. itemize repairs traceably | 6.repairs.stone | covered |
| 7. reflect with prevention strategies | 7.reflection.stone | covered |
| zero human approval | no human reviews/approvals | covered |

---

## verdict

**all behavior declaration requirements are covered.**

each wish requirement maps to a stone with appropriate guards. no requirements were skipped or forgotten.
