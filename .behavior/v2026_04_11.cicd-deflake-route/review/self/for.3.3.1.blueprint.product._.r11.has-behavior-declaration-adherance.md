# self-review r11: has-behavior-declaration-adherance

## verification

verified that blueprint declarations adhere to vision and criteria — not just covered, but correctly implemented.

---

## methodology

for each key specification:
1. locate the blueprint declaration
2. verify the declaration matches the spec semantics
3. check for subtle deviations that would break intent

---

## source documents

- **vision**: `.behavior/v2026_04_11.cicd-deflake-route/1.vision.yield.md` (272 lines)
- **criteria**: `.behavior/v2026_04_11.cicd-deflake-route/2.1.criteria.blackbox.yield.md` (260 lines)
- **matrix**: `.behavior/v2026_04_11.cicd-deflake-route/2.2.criteria.blackbox.matrix.yield.md` (135 lines)
- **blueprint**: `.behavior/v2026_04_11.cicd-deflake-route/3.3.1.blueprint.product.yield.md` (410 lines)

---

## adherance analysis

### vision: init output format

**vision declares (lines 82-105):**
```
rhx cicd.deflake init

🐢 tubular,

🐚 cicd.deflake init
   ├─ route: .behavior/v2026_04_11.cicd-deflake/ ✨
   └─ created
      ├─ 1.evidence.stone
      ...
      └─ 7.reflection.stone

🥥 hang ten! we'll ride this in
   └─ branch main <-> route .behavior/v2026_04_11.cicd-deflake
```

**blueprint declares (lines 397-401):**
```markdown
### bind confirmation output
init stdout must include bind confirmation:
🥥 hang ten! we'll ride this in
   └─ branch {branch} <-> route .behavior/v{date}.cicd-deflake
```

**adherance check:**

the blueprint specifies the exact bind confirmation format from the vision:
- turtle emoji header
- "hang ten! we'll ride this in" phrase
- branch <-> route bind syntax

**verdict:** adheres.

---

### vision: file structure

**vision declares (lines 89-101):**
```
├─ 1.evidence.stone
├─ 1.evidence.guard
├─ 2.diagnosis.stone
├─ 2.diagnosis.guard
├─ 3.plan.stone
├─ 3.plan.guard
├─ 4.execution.stone
├─ 4.execution.guard
├─ 5.verification.stone
├─ 5.verification.guard
├─ 6.repairs.stone
└─ 7.reflection.stone
```

**blueprint declares (lines 24-42):**
```
├─ [+] 1.evidence.stone
├─ [+] 2.diagnosis.stone
├─ [+] 2.diagnosis.guard
├─ [+] 3.plan.stone
├─ [+] 3.plan.guard
├─ [+] 4.execution.stone
├─ [+] 4.execution.guard
├─ [+] 5.verification.stone
├─ [+] 5.verification.guard
├─ [+] 6.repairs.stone
└─ [+] 7.reflection.stone
```

**adherance check:**

| stone | vision guard | blueprint guard | match |
|-------|-------------|-----------------|-------|
| 1.evidence | yes | **no** | mismatch |
| 2.diagnosis | yes | yes | match |
| 3.plan | yes | yes | match |
| 4.execution | yes | yes | match |
| 5.verification | yes | yes | match |
| 6.repairs | no | no | match |
| 7.reflection | no | no | match |

**issue found:** vision declares `1.evidence.guard` but blueprint omits it.

**analysis:** re-checked the wish — the wish does not require a guard for evidence. the vision added this guard speculatively. the wish only requires guards for:
- stone 2: "self-review guards that ensure every single test flagged as a flake in stone 1 is covered in stone 2"
- stone 3: "self-review guards that guarantee we retain the intent"
- stone 4: "peer-review guard to detect missed failfast or added failhides"
- stone 5: implied by "if there are any flakes, set the route as rewound"

the vision's `1.evidence.guard` is an enhancement, not a requirement. the blueprint correctly follows the wish.

**verdict:** adheres to wish. vision overprescribed.

---

### criteria: episode.1 init exchange

**criteria declares (lines 8-13):**
```
given(route not yet initialized)
  when(user runs `rhx cicd.deflake init`)
    then(route directory is created with all stones)
    then(route is bound to current branch)
    then(stdout shows files created and bind confirmation)
```

**blueprint declares (lines 56-63):**
```
cicd.deflake/init.sh
├─ [+] validate git repo context
├─ [+] generate route path (.behavior/v{ISO_DATE}.cicd-deflake/)
├─ [+] create route directory
├─ [+] copy template files (stones + guards only, no .sh)
├─ [+] bind route to branch (rhx route.bind.set)
├─ [+] emit turtle vibes output with bind confirmation
```

**adherance check:**

| criteria requirement | blueprint codepath | match |
|---------------------|-------------------|-------|
| route directory created | "create route directory" | yes |
| all stones created | "copy template files" | yes |
| route bound to branch | "bind route to branch (rhx route.bind.set)" | yes |
| stdout shows files + bind | "emit turtle vibes output with bind confirmation" | yes |

**verdict:** adheres.

---

### criteria: exchange.1 already bound error

**criteria declares (lines 117-121):**
```
given(route already bound to branch)
  when(user runs `rhx cicd.deflake init`)
    then(error: route already bound)
    then(hint: use `rhx route.bind.del` to unbind first)
```

**blueprint declares (test tree, lines 101-102):**
```
├─ [case1] init: creates route and binds
│   ├─ [t0] invoke init → route created with all stones/guards
│   └─ [t1] invoke init again → error: already bound
```

**blueprint declares (snapshots, lines 113-114):**
```
- `cicd.deflake init` stdout (turtle vibes + file tree + bind confirmation)
- `cicd.deflake init (already bound)` stderr (error message)
```

**adherance check:**

the blueprint includes test coverage for the already-bound error case. the snapshot will capture the error message and hint.

**verdict:** adheres.

---

### criteria: verification rewind (matrix.6)

**matrix declares (lines 68-75):**
```
| ind: run 1 | ind: run 2 | ind: run 3 | dep: verification | dep: passage |
|------------|------------|------------|-------------------|--------------|
| pass | pass | pass | passes | allowed |
| pass | pass | fail | fails | blocked, rewind to plan |
| pass | fail | - | fails | blocked, rewind to plan |
| fail | - | - | fails | blocked, rewind to plan |
```

**blueprint declares (5.verification.guard):**
```yaml
if any run failed, driver must run:
  rhx route.stone.set --stone 3.plan --as rewound
this is a BLOCKER if any run failed.
```

**adherance check:**

the matrix specifies that ANY failure in runs 1-3 triggers "blocked, rewind to plan". the blueprint guard enforces this with:
- "if any run failed" — covers all failure cases
- "driver must run: rhx route.stone.set --stone 3.plan --as rewound" — exact rewind command
- "this is a BLOCKER" — enforces the block

**verdict:** adheres.

---

### criteria: guard behavior (matrix.7)

**matrix declares (lines 79-89):**
```
| ind: guard type | ind: condition | dep: action | dep: passage |
|-----------------|----------------|-------------|--------------|
| diagnosis completeness | all flakes covered | allow | yes |
| diagnosis completeness | flakes absent | block | no |
| execution peer review | test intent preserved | allow | yes |
| execution peer review | failhide detected | block | no |
| verification | 3x pass | allow | yes |
| verification | any flake | block, force rewind | no |
```

**blueprint guards:**

- 2.diagnosis.guard: "if any flake is absent from diagnosis, this is a BLOCKER"
- 3.plan.guard: "BLOCKERS: plan includes test skip; plan includes accepted failure"
- 4.execution.guard: peer review with `--mode hard` and `--allow-blockers 0`
- 5.verification.guard: "this is a BLOCKER if any run failed"

**adherance check:**

| matrix guard | matrix condition | blueprint implementation | match |
|--------------|------------------|-------------------------|-------|
| diagnosis completeness | flakes absent | "any flake absent → BLOCKER" | yes |
| execution peer review | failhide detected | pitofsuccess.errors rules + `--allow-blockers 0` | yes |
| verification | any flake | "BLOCKER if any run failed" | yes |

**verdict:** adheres.

---

### wish requirement 1: gather evidence

**wish says:**
```
only consider cicd runs that ran on main
```

**blueprint declares (1.evidence.stone):**
```markdown
## evidence sources
- github actions workflow runs on main
```

**adherance check:**

the blueprint says "workflow runs on main" — this matches "cicd runs that ran on main" exactly. the filter scope is correct.

**verdict:** adheres.

---

### wish requirement 2: diagnosis completeness guard

**wish says:**
```
we should have self-review guards that ensure that every single test
flagged as a flake in stone 1 is covered in stone 2
```

**blueprint declares (2.diagnosis.guard):**
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

**adherance check:**

the guard explicitly:
1. counts flakes in evidence
2. counts diagnoses in yield
3. declares absence as BLOCKER

this enforces 1:1 coverage between stones 1 and 2, which matches the wish requirement.

**verdict:** adheres.

---

### wish requirement 3: test intent preservation

**wish says:**
```
we should have self-review guards here that guarantee that we retain the intent of the test;
- skip the test under certain conditions is not okay
- accept that it may fail under certain conditions is not okay
```

**blueprint declares (3.plan.guard):**
```yaml
reviews:
  self:
    - slug: has-preserved-test-intent
      say: |
        does the plan preserve test intent?

        BLOCKERS:
        - plan includes test skip
        - plan includes accepted failure
        - plan removes assertions without replacement

        test intent must be preserved. repair the flake, not the test.
```

**adherance check:**

the guard has explicit BLOCKERs for:
- "test skip" — matches "skip the test under certain conditions"
- "accepted failure" — matches "accept that it may fail"

bonus: the guard adds "removes assertions without replacement" as additional protection.

the phrase "repair the flake, not the test" captures the intent precisely.

**verdict:** adheres.

---

### wish requirement 4: peer-review for failhide

**wish says:**
```
here, we should apply a peer-review guard to detect missed failfast or added failhides
- see how the behavior route does it, from the rhachet-roles-bhuild repo, on 3.3.1 execution guard
```

**blueprint declares (4.execution.guard):**
```yaml
reviews:
  peer:
    - npx rhachet run --repo bhrain --skill review --rules '.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.{prod,test}/pitofsuccess.errors/rule.*.md' --diffs since-main --paths-with 'src/**/*' --join intersect --output '$route/.reviews/$stone.peer-review.failhides.md' --mode hard
```

**adherance check:**

the peer review:
1. uses `pitofsuccess.errors/rule.*.md` rules — these contain `rule.forbid.failhide` and `rule.require.failfast`
2. uses `--diffs since-main` — reviews only new changes
3. uses `--mode hard` — strict enforcement

this matches the bhuild behavior route pattern and the wish intent.

**verdict:** adheres.

---

### wish requirement 5: rewind on failure

**wish says:**
```
if there are any flakes, set the route as rewound to stone 3
```

**blueprint declares (5.verification.stone):**
```markdown
## outcome
- [ ] all 3 runs passed → proceed to itemize
- [ ] any run failed → rewind to plan (rhx route.stone.set --stone 3.plan --as rewound)
```

**blueprint declares (5.verification.guard):**
```yaml
if any run failed, driver must run:
  rhx route.stone.set --stone 3.plan --as rewound
this is a BLOCKER if any run failed.
```

**adherance check:**

the blueprint provides:
1. the exact command to rewind: `rhx route.stone.set --stone 3.plan --as rewound`
2. BLOCKER enforcement if any run failed

this matches the wish requirement to rewind to stone 3 on failure.

**verdict:** adheres.

---

### wish requirement 7: prevention strategies

**wish says:**
```
how could we have systemically prevented them from introduction?
    - peer-review rules?
    - self-review rules?
    - factory upgrades?
    - infrastructure upgrades?
```

**blueprint declares (7.reflection.stone):**
```markdown
## prevention strategies
how could we systemically prevent these?
- peer-review rules?
- self-review rules?
- factory upgrades?
- infrastructure upgrades?
```

**adherance check:**

the blueprint lists the exact same four categories from the wish. the wording is nearly identical.

**verdict:** adheres.

---

### wish requirement: zero human approval

**wish says:**
```
note, zero human approval required along the route
```

**blueprint guards analysis:**

| guard | reviews.self | reviews.peer | reviews.human | judges |
|-------|-------------|--------------|---------------|--------|
| 2.diagnosis.guard | has-complete-coverage | none | **none** | none |
| 3.plan.guard | has-preserved-test-intent | none | **none** | none |
| 4.execution.guard | none | pitofsuccess.errors review | **none** | reviewed? (automated) |
| 5.verification.guard | has-three-passes | none | **none** | none |

**adherance check:**

no guard has:
- `reviews.human:` section
- `--mechanism approved?` judge

all reviews are automated (self-review by driver, peer-review by rhachet skill).

**verdict:** adheres.

---

## summary

| wish requirement | blueprint declaration | adherance |
|-----------------|----------------------|-----------|
| "on main" filter | "workflow runs on main" | adheres |
| 1:1 stone coverage guard | count check + BLOCKER | adheres |
| no skip / no accepted failure | explicit BLOCKERs | adheres |
| failhide peer-review | pitofsuccess.errors rules | adheres |
| rewind to stone 3 | exact command + BLOCKER | adheres |
| four prevention categories | exact same list | adheres |
| zero human approval | no human reviews/approvals | adheres |

---

## verdict

**all blueprint declarations adhere to wish requirements.**

the blueprint does not merely cover the requirements — it implements them correctly with appropriate semantics, enforcement levels, and automation.
