# self-review: has-questioned-requirements

## requirements examined

### 1. seven-stone structure (gather → diagnose → plan → execute → verify → itemize → reflect)

**who said this was needed?** the wisher, in 0.wish.md

**what evidence supports this?** the wish explicitly lists 7 phases. each serves a distinct purpose:
- gather: establishes ground truth
- diagnose: forces grasp of the problem before the fix
- plan: documents approach before action
- execute: the actual work
- verify: proves stability
- itemize: connects repairs to evidence
- reflect: captures systemic lessons

**what if we didn't do this?** without structure, deflake work becomes ad-hoc. the value is in forced thoroughness.

**could we simplify?**
- itemize (6) and reflect (7) could potentially merge — both are post-repair documentation
- however, they serve different purposes: itemize is mechanical (what fixed what), reflect is systemic (why did we have these flakes)
- **verdict: keep separate** — the distinction matters for institutional memory

### 2. main branch only

**who said this was needed?** the wisher: "only consider cicd runs that ran on main, since those are ones that were merged with flakes"

**what evidence supports this?** feature branches break all the time legitimately. main-branch flakes are the ones that erode trust because they passed review but still fail.

**what if we didn't do this?** we'd waste time on legitimate failures in feature branches.

**could we simplify?** potentially allow an option to include protected branches (main, prod, etc.) but main-only is a sensible default.

**verdict: holds** — the requirement is well-justified

### 3. 3x verification

**who said this was needed?** the wisher: "run the build 3x in a row"

**what evidence supports this?** 3x catches most flakes. it's a balance between confidence and time.

**what if we didn't do this?** a single pass might miss rare flakes. no verification at all defeats the purpose.

**is 3x the right number?**
- 3x is reasonable for most cases
- some flakes only appear 1-in-100 runs
- **verdict: keep as default, make configurable** — noted in vision as open question

### 4. zero human approval

**who said this was needed?** the wisher: "note, zero human approval required along the route"

**what evidence supports this?** autonomy enables the route to be driven without wait for humans. most deflake work is mechanical.

**what if we didn't do this?** the route would stall for approvals, which defeats the purpose of automation.

**is this safe?**
- the guards enforce correctness (no skips, no failhides)
- the reflection phase provides human-readable documentation
- **verdict: holds** — guards provide safety; human review happens via reflection docs

### 5. guards that ensure every flake from step 1 appears in step 2

**who said this was needed?** the wisher: "self-review guards that ensure that every single test that was flagged as a flake in stone 1 is covered with the full articulation"

**what evidence supports this?** completeness matters — if we identify a flake, we must diagnose it.

**could we simplify?** no — partial diagnosis would leave flakes unaddressed.

**verdict: holds** — essential for completeness

### 6. guards that forbid skips and accepted failures

**who said this was needed?** the wisher: "skip the test under certain conditions is not okay; accept that it may fail under certain conditions is not okay"

**what evidence supports this?** skip or accept failures removes test coverage. the goal is to fix flakes, not hide them.

**is this too rigid?**
- some tests may be obsolete — but that's a different concern (test cleanup, not deflake)
- **verdict: holds** — if a test should be deleted, that's a separate workflow

### 7. rewind to plan on verification failure

**who said this was needed?** the wisher: "if there are any flakes, set the route as rewound to stone 3"

**what evidence supports this?** if verification fails, the plan was wrong. return to plan forces reconsideration.

**is this the right rewind point?**
- could be execution (typo in fix)
- could be diagnosis (wrong root cause)
- **verdict: plan is reasonable** — it's the decision point; from there you can adjust execution or revisit diagnosis

## issues found

none — all requirements hold under scrutiny.

## non-issues confirmed

| requirement | why it holds |
|-------------|-------------|
| 7 stones | each serves distinct purpose; separation aids clarity |
| main only | feature branch failures are expected; main flakes erode trust |
| 3x verification | reasonable default; configurable for paranoid teams |
| zero human approval | guards enforce safety; reflection provides oversight |
| completeness guards | partial diagnosis defeats purpose |
| no-skip guards | skip removes coverage; not a valid fix |
| rewind to plan | correct decision point for reconsideration |

## adjustments made

none — requirements are sound as stated.
