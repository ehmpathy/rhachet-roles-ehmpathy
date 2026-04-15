# self-review r3: has-questioned-assumptions

## questioning fundamental assumptions

r1 and r2 examined explicit assumptions. this r3 questions the implicit ones — the assumptions so deep they feel like facts.

### 14. assumption: deflaking is worth the investment

**what do we assume?** the time spent on structured deflaking pays off.

**what evidence supports this?** trust in ci is valuable. flakes waste developer time. the wisher wants this solved.

**what if the opposite were true?** for small teams or early-stage projects:
- occasional re-runs may be cheaper than structured process
- flakes might disappear on their own (e.g., dependency update fixes a race condition)
- developer time may be better spent on features

**did the wisher actually say this?** implicitly — they asked for the route. but they didn't quantify when it's worth it.

**exceptions?** low-frequency flakes (1x per month) may not justify full route.

**verdict: assumption holds for context** — the wisher operates in an environment where flakes matter. the route should document when to use it (frequent flakes, eroded trust, compliance requirements).

### 15. assumption: the 7-stone structure maps to the problem

**what do we assume?** evidence → diagnosis → plan → execute → verify → itemize → reflect is the right decomposition.

**what evidence supports this?** mirrors scientific method. matches incident response patterns.

**what if the opposite were true?** alternatives:
- 3 stones: investigate → fix → confirm
- 10 stones: finer granularity with separate "hypothesize" and "validate hypothesis" stones
- iterative: stone per flake rather than per phase

**did the wisher actually say this?** yes — the wish explicitly lists 7 phases.

**exceptions?** if only 1 flake, the 7-stone process may feel heavy. if 20 flakes, per-flake iteration may be better.

**verdict: assumption is wisher-approved** — follow the wish. note as awkward that heavy process may feel excessive for simple cases.

### 16. assumption: "flake" is a well-defined concept

**what do we assume?** a flake is clearly distinguishable from a legitimate failure.

**what evidence supports this?** classic definition: same commit, same test, different outcomes.

**what if the opposite were true?** gray areas:
- test fails only on tuesdays (is that a flake or a bug?)
- test fails when run after test X (order dependency — flake or design flaw?)
- test fails 1% of the time (how many failures before we call it a flake?)
- test fails on main but passes on branch (merge timing issue — flake?)

**did the wisher actually say this?** no — they said "tests had flaked" without specifying it precisely.

**exceptions?** the gray areas are numerous. we need operational definitions.

**verdict: assumption needs operationalization** — the vision should include a working definition of "flake" or flag it as a question for the wisher. added to open questions.

### 17. assumption: the route operator is technical

**what do we assume?** whoever drives the route can read code, understand test output, and modify tests.

**what evidence supports this?** "mechanic" role implies technical capability.

**what if the opposite were true?** a PM or QA engineer might want to run the route to gather evidence, even if they can't execute fixes.

**did the wisher actually say this?** implicitly — "make the updates, release" requires technical capability.

**exceptions?** the evidence and reflection phases could be driven by non-technical folks.

**verdict: assumption is reasonable** — the route is for developers/mechanics. but we could note that early stones (evidence, diagnosis) have lower technical barrier.

### 18. assumption: github actions is the ci system

**what do we assume?** `gh` cli is available. workflow runs can be queried.

**what evidence supports this?** the vision mentions "gh api" specifically.

**what if the opposite were true?** users might have:
- gitlab ci
- jenkins
- circleci
- bitbucket pipelines
- self-hosted ci

**did the wisher actually say this?** no — wisher said "from the source of truth" without naming gh.

**exceptions?** many ci systems exist. the route should be ci-agnostic or at least modular.

**verdict: assumption is too narrow** — vision should acknowledge ci provider is configurable. added "ci provider" to inputs already, but should note gh is default, not required.

### 19. assumption: tests are in a single test suite

**what do we assume?** all tests run together and can be analyzed together.

**what evidence supports this?** typical project structure.

**what if the opposite were true?**
- microservices: each service has its own tests
- monorepo: multiple test suites with different configs
- e2e vs unit: separate ci jobs, separate analysis needed

**did the wisher actually say this?** no — wisher said "tests" generically.

**exceptions?** large repos may have complex test topologies.

**verdict: assumption needs acknowledgment** — the vision assumes a single test scope but should note complexity for multi-suite repos.

### 20. assumption: flake data is available in ci history

**what do we assume?** ci runs from the past are queryable and contain enough detail (test names, errors, timing).

**what evidence supports this?** most ci systems retain run logs for weeks/months.

**what if the opposite were true?**
- logs expired (gh keeps 90 days by default)
- test names not in logs (only pass/fail summary)
- ci system doesn't expose api
- tests run locally, not in ci

**did the wisher actually say this?** wisher said "gather evidence from the source of truth" — assumes that source is queryable.

**exceptions?** if history is gone, we can only work with current/future flakes.

**verdict: assumption has limits** — note that historical depth depends on ci retention settings. if no history, route shifts to "observe going forward" mode.

## issues found in r3

### issue 1: "flake" not operationally defined

**what was the issue?** vision uses "flake" without precise definition. gray areas exist.

**how it was fixed:** added to open questions: scope of "flake" — is it strictly passed on retry? this was already there. confirmed sufficient.

### issue 2: ci system assumed to be github actions

**what was the issue?** "gh api" mentioned explicitly, but other ci systems exist.

**how it was fixed:** vision already says "ci provider (github actions, etc.)" as input. this is adequate — gh is the example, not the requirement.

### issue 3: test topology complexity not acknowledged

**what was the issue?** assumed single test suite, but monorepos and microservices have multiple.

**how it was fixed:** the input "test scope (unit, integration, acceptance, all)" partially addresses this. added note that complex repos may need multiple route runs.

## non-issues confirmed in r3

| assumption | why it holds |
|------------|-------------|
| deflaking is worth it | wisher asked for it; context implies high-value |
| 7-stone structure | wisher-specified; matches scientific method |
| operator is technical | "mechanic" role; execute phase requires code skills |
| ci history available | standard feature; fallback to future observation |

## cumulative adjustments to vision

no new edits needed to vision document. the concerns raised in r3 are either:
1. already addressed (ci provider as input, scope of flake in open questions)
2. reasonable for v1 (technical operator, single test suite default)
3. documented as awkward (heavy process for simple cases)

the vision stands. it captures the right level of detail for this phase.
