# self-review r3: has-questioned-deletables

## verification

examined each feature and component for deletability. asked: "can this be removed? if we deleted it and had to add it back, would we?"

---

## features traceability

### 7 stones — questioned each

**1.evidence.stone**
- traces to: wish item 1 — "gather evidence of what tests had flaked"
- can we delete it? no
- why it holds: without evidence, diagnosis has no input. the wisher explicitly asked for enumeration of flakes with frequency and error messages. this is the foundation of the route.

**2.diagnosis.stone**
- traces to: wish item 2 — "diagnose rootcause for each"
- can we delete it? no
- why it holds: without diagnosis, the plan would be guesswork. the wisher specifically asked for ranked hypotheses and observability additions. to jump straight to plan without diagnosis would be the "whack-a-mole" approach the vision explicitly rejects.

**3.plan.stone**
- traces to: wish item 3 — "propose a plan to deflake"
- can we delete it? no
- why it holds: the plan separates "what we think will fix it" from "what we actually do". this separation enables self-review to catch failhide patterns before execution. the wisher explicitly asked for verification criteria per repair.

**4.execution.stone**
- traces to: wish item 4 — "execute the plan"
- can we delete it? no
- why it holds: execution is where changes happen. the wisher explicitly requires peer-review guard at this stage to catch failhides. without a dedicated stone, changes would be untracked.

**5.verification.stone**
- traces to: wish item 5 — "run the build 3x in a row"
- can we delete it? no
- why it holds: single CI pass could be luck. the wisher explicitly asked for 3 consecutive passes to "prove stability, not luck." this is the mechanism that proves the fix worked.

**6.repairs.stone**
- traces to: wish item 6 — "itemize the repairs"
- can we delete it? no
- why it holds: this creates the paper trail. the wisher explicitly asked for "true root cause", "true repair", "verification". without this, the knowledge would be lost after the fix.

**7.reflection.stone**
- traces to: wish item 7 — "emit reflection document"
- can we delete it? no
- why it holds: this is the institutional memory. the wisher explicitly asked for "how could we have systemically prevented them" and "propose new briefs". this is what turns a one-off fix into a pattern that prevents future flakes.

**all 7 stones trace to explicit wish items. each has a distinct purpose that cannot be merged or removed.**

### 4 guards — questioned each

**2.diagnosis.guard**
- traces to: wish — "we should have self-review guards that ensure that every single test that was flagged as a flake in stone 1 is covered"
- can we delete it? no
- why it holds: without this guard, a diagnosis could "forget" a flake. the wisher explicitly wants completeness — every flake must be diagnosed. the guard prevents escape.

**3.plan.guard**
- traces to: wish — "we should have self-review guards here that guarantee that we retain the intent of the test; to skip the test under certain conditions is not okay"
- can we delete it? no
- why it holds: this is the failhide prevention at plan stage. the wisher explicitly forbids test skips and accepted failures. without this guard, the "fix" could be to skip the flaky test — which defeats the purpose.

**4.execution.guard**
- traces to: wish — "apply a peer-review guard to detect missed failfast or added failhides"
- can we delete it? no
- why it holds: code changes can hide failures without intent. peer-review catches patterns the author might miss. the wisher explicitly asked for peer-review at this stage, not just self-review.

**5.verification.guard**
- traces to: wish — "if there are any flakes, set the route as rewound to stone 3"
- can we delete it? no
- why it holds: without this guard, a failed verification could be "accepted" and the route could proceed. the wisher explicitly requires rewind to plan on verification failure — not proceed with a known flake.

**all 4 guards trace to explicit wish requirements. each guards a different failure mode:**
- diagnosis guard → prevents incomplete coverage
- plan guard → prevents failhide in plan
- execution guard → prevents failhide in code
- verification guard → prevents false completion

---

## components traceability — questioned each

### cicd.deflake.sh (entry point)

- **traces to**: required for skill to exist
- **can it be removed?**: no — skill needs an entry point to invoke
- **if deleted and re-added?**: yes, we would re-add it immediately
- **simplest version?**: already minimal — just parses subcommand and dispatches
- **did we optimize what shouldn't exist?**: no — this is not optimization, it's the skill contract

**why it holds**: without an entry point, there is no skill. the pattern follows declapract.upgrade exactly. we could not simplify it further and still have a functional skill.

### cicd.deflake/init.sh (route creation)

- **traces to**: vision "rhx cicd.deflake init" command
- **can it be removed?**: no — core functionality
- **if deleted and re-added?**: yes, we would re-add it immediately
- **simplest version?**: already minimal — create dir, copy templates, bind
- **did we optimize what shouldn't exist?**: no — these are the minimum steps to create a route

**why it holds**: the vision explicitly shows `rhx cicd.deflake init` as the entry command. the init must create the route, copy stones/guards, and bind. there is no simpler version that accomplishes the same goal.

### cicd.deflake/output.sh (turtle vibes)

- **traces to**: vision turtle vibes output, ergonomist treestruct pattern
- **can it be removed?**: technically could inline in init.sh
- **if deleted and re-added?**: yes — consistency matters
- **simplest version?**: could be inlined, but that would duplicate patterns
- **did we optimize what shouldn't exist?**: questioned this carefully

**why it holds**: output.sh separates output formatting from business logic. if we inlined it:
1. init.sh would mix concerns (route creation + output formatting)
2. we would duplicate the turtle vibes pattern instead of reuse from declapract.upgrade
3. consistency with other mechanic skills would be lost

the extra file adds clarity, not complexity.

### help subcommand

- **traces to**: standard CLI ergonomics
- **can it be removed?**: technically yes
- **if deleted and re-added?**: yes — users expect `--help`
- **simplest version?**: already minimal
- **did we optimize what shouldn't exist?**: no — this is not optimization, it's UX

**why it holds**: removing help would save maybe 10 lines but violate user expectations. when users type `rhx cicd.deflake --help`, they expect to see usage. this is a standard CLI contract, not a feature we invented.

---

## test coverage — questioned

### integration tests

- **can we delete them?**: no
- **why it holds**: mechanic rule.require.jest-tests-for-skills requires integration tests for all shell skills. without tests, we cannot verify the skill works. the test research phase confirmed this pattern is standard.

### snapshots

- **can we delete them?**: no
- **why it holds**: ergonomist treestruct pattern requires snapshots for visual review in PRs. snapshots catch unintended changes to output format. without them, output regressions would go unnoticed.

### could we have fewer test cases?

examined the test tree:
- [case1] init: creates route and binds — required to verify core functionality
- [case2] init: output format — required for snapshot verification
- [case3] help: shows usage — required for CLI contract
- [case4] unknown subcommand — required for error behavior

**each case tests a distinct codepath. none are redundant.**

---

## did we assume any features?

examined blueprint for features not traced to wish or vision:

| feature | source | could it be deleted? |
|---------|--------|---------------------|
| subcommand dispatch | follows declapract.upgrade pattern | no — standard skill structure |
| SKIP_ROUTE_BIND env flag | test research pattern | no — required for isolated tests |
| exit code semantics (0/1/2) | mechanic brief | no — standard contract |

**no assumed features found.** all trace to vision, wish, or established patterns.

---

## verdict

**examined every element. found none deletable.**

summary of what was questioned:
- 7 stones — all from explicit wish items 1-7; each serves distinct purpose
- 4 guards — all from explicit wish requirements; each guards different failure mode
- entry point — required for skill to exist
- init.sh — minimum operations to create route
- output.sh — separates concerns, provides consistency
- help subcommand — standard CLI contract
- integration tests — required by mechanic rules
- snapshots — required by ergonomist patterns

**the blueprint is already minimal. if we deleted any element, we would have to re-add it.**
