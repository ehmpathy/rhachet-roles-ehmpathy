# self-review: has-ergonomics-validated (round 9)

## the question

does the actual input/output match what felt right at repros/wish?

## deep comparison: wish vs stone content

read both 0.wish.md and 1.evidence.stone to verify ergonomics alignment.

### wish for evidence (step 1)

**wish said:**
> 1. gather evidence of what tests had flaked, how often, from the source of truth
>    - only consider cicd runs that ran on main, since those are ones that were merged with flakes
>    - gather evidence thoroughly, enumerate the full timeline
>        - which test
>        - how often
>        - what error

**stone says:**
> gather evidence of flaky tests from main-branch CI runs.
> ...
> 1. fetch workflow runs from main branch (last 30 days)
> 2. identify tests that passed on retry (flake signal)
> 3. group by test name with frequency and error patterns
> 4. write structured JSON to `1.evidence.yield._.detected.json`

**alignment check:**

| wish requirement | stone implementation | match? |
|------------------|---------------------|--------|
| "runs that ran on main" | "main-branch CI runs" | yes |
| "which test" | "group by test name" | yes |
| "how often" | "with frequency" | yes |
| "what error" | "and error patterns" | yes |

### cli ergonomics

**detect command:**
```sh
rhx cicd.deflake detect --days 30 --into $route/1.evidence.yield._.detected.json
```

**ergonomic qualities:**
- `--days 30` — configurable lookback period
- `--into $route/...` — explicit output path to route
- output is JSON (structured, machine-readable)

### stone template ergonomics

the 1.evidence.stone provides:
1. clear step-by-step instructions
2. exact commands to run
3. table format for manual enrichment
4. section template for each flake

this guides the user through the evidence-gather process with minimal friction.

### output format alignment

**wish implied:** structured evidence for each flake with test name, frequency, error

**stone provides:**
```
### flake: {test name}

**frequency:** {count} in last {days} days
**error pattern:** {error message}
**test file:** {path to test}

**ci log excerpt:**
{relevant error output from CI}
```

this matches the wish — test name, frequency, and error are all captured.

## what could have drifted (but didn't)

| potential drift | status |
|-----------------|--------|
| main-only filter | aligned — "main-branch CI runs" |
| full timeline | aligned — "last 30 days" with --days config |
| test identification | aligned — groups by test name |
| error capture | aligned — error patterns in JSON |
| structured output | aligned — JSON file + markdown yield |

## why the ergonomics hold

the implementation follows the wish precisely:
1. **main branch focus** — explicit in both wish and stone
2. **evidence dimensions** — test, frequency, error all captured
3. **cli tools** — detect command automates the scan
4. **output** — structured JSON + human-readable markdown

no drift between vision and implementation because:
- stone was written from wish
- detect command was built to fill stone requirements
- test coverage validates the interface

## deeper reflection: all 8 stones vs wish

the wish outlined 8 workflow steps. let me verify each stone matches:

| step | wish requirement | stone content | match? |
|------|------------------|---------------|--------|
| 1 | gather evidence of flaky tests | 1.evidence.stone: fetch runs, identify flakes, group by test | yes |
| 2 | diagnose rootcause | 2.1.diagnose.research + 2.2.diagnose.rootcause | yes |
| 3 | propose plan to deflake | 3.plan.stone | yes |
| 4 | execute the plan | 4.execution.stone | yes |
| 5 | verify zero flakes | 5.verification.stone | yes |
| 6 | itemize repairs | 6.repairs.stone | yes |
| 7 | emit reflection | 7.reflection.stone | yes |
| 8 | institutionalize | 8.institutionalize.stone | yes |

### special requirements from wish

**wish said for step 2:**
> we should have self-review guards that ensure that every single test that was flagged as a flake in stone 1 is covered with the full articulation in the yield of stone 2

**implementation:** 2.1.diagnose.research.guard and 2.2.diagnose.rootcause.guard exist to enforce this

**wish said for step 3:**
> we should have self-review guards here that guarantee that we retain the intent of the test

**implementation:** 3.plan.guard exists with self-review requirements

**wish said for step 4:**
> we should apply a peer-review guard to detect missed failfast or added failhides

**implementation:** 4.execution.guard exists with peer-review requirements

**wish said for step 7:**
> note, zero human approval required along the route

**implementation:** no human approval guards in any stone. all guards are self-review or peer-review (automated).

## what i learned

the ergonomics validation showed that the implementation is faithful to the wish:
1. every workflow step has a stone
2. every quality gate has a guard
3. cli commands match the planned interface
4. output formats capture the required dimensions

the wish was detailed enough that there was no room for drift.

## verdict

holds. the ergonomics match the wish exactly:
- all 8 workflow steps represented as stones
- guards enforce quality at key checkpoints
- cli commands match planned interface
- zero human approval in the route (as specified)

no drift detected. implementation delivers what was envisioned.
