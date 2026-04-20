# self-review r2: has-questioned-assumptions

## deeper assumptions examined

the first review covered surface-level assumptions. this review digs deeper.

### 8. assumption: a mechanic can diagnose root causes without human domain knowledge

**what do we assume?** the route driver (mechanic or human) can identify why a test flakes without deep knowledge of the system under test.

**what evidence supports this?** many flakes have common patterns: race conditions, time-based issues, environment drift. these are diagnosable from error messages and test structure.

**what if the opposite were true?** some flakes require business logic grasp. e.g., "test fails when invoice total is exactly $100.00" — requires knowledge that $100.00 triggers a special code path.

**did the wisher actually say this?** no — the wisher assumed diagnosis is possible but didn't specify who does it or what knowledge they need.

**exceptions?** domain-specific flakes require domain experts. the mechanic may need to escalate or ask for context.

**verdict: assumption needs acknowledgment** — the route should allow for "diagnosis incomplete, need human input" as a valid state. added to vision's "what is awkward" section.

### 9. assumption: all flakes have a single root cause

**what do we assume?** each flake has one identifiable root cause that can be fixed.

**what evidence supports this?** in practice, most flakes trace to one issue.

**what if the opposite were true?** a test could flake for multiple independent reasons:
- sometimes it fails due to race condition A
- sometimes it fails due to network timeout B
- sometimes it fails due to snapshot drift C

**did the wisher actually say this?** no — the wisher said "diagnose root cause for each" which could mean "all root causes for each".

**exceptions?** compound flakes require multiple fixes. the route should support multiple hypotheses per flake.

**verdict: assumption needs nuance** — diagnosis should allow multiple root causes per flake. the plan must address all of them.

### 10. assumption: fixes are always code changes

**what do we assume?** the execution phase produces code changes that get committed and released.

**what evidence supports this?** the wisher says "make the updates, release".

**what if the opposite were true?** some fixes aren't code:
- increase ci timeout (ci config change)
- add test retry at ci level (workflow change)
- change test execution order (jest config)
- fix infrastructure (e.g., upgrade node version in ci)

**did the wisher actually say this?** "make the updates, release" is ambiguous — could be code or config.

**exceptions?** infra-only fixes may not have a traditional "commit" in the test codebase.

**verdict: assumption is too narrow** — execution should support both code changes and infrastructure changes. vision updated to clarify.

### 11. assumption: reflection docs accumulate and are discoverable

**what do we assume?** past reflection docs are findable and read before future deflake cycles.

**what evidence supports this?** the vision says "over time, these accumulate into a knowledge base".

**what if the opposite were true?** if reflection docs are just files in `.behavior/`, no one will find or read them. they become write-only documentation.

**did the wisher actually say this?** the wisher described emit of reflection docs but didn't specify how they're surfaced.

**exceptions?** repos with many deflake cycles will have many reflection docs. without an index or search, they're not useful.

**verdict: assumption needs mechanism** — we should consider: (1) an index of past reflections, (2) surface relevant past reflections at the start of new deflake routes, or (3) extract lessons into briefs.

### 12. assumption: the route is driven by one person

**what do we assume?** one mechanic or human drives the route from start to finish.

**what evidence supports this?** the route model assumes single-driver progression through stones.

**what if the opposite were true?** a team may collaborate on deflake:
- person A gathers evidence
- person B diagnoses flake 1
- person C diagnoses flake 2
- all review the plan together

**did the wisher actually say this?** no — collaboration wasn't mentioned.

**exceptions?** large deflake efforts may span multiple people or sessions.

**verdict: assumption is reasonable for v1** — the route model supports resume (you can stop and continue later). multi-person collaboration is out of scope for initial implementation.

### 13. assumption: "test intent" is knowable and verifiable

**what do we assume?** guards can detect when a repair removes test intent.

**what evidence supports this?** the wisher says guards should "guarantee that we retain the intent of the test".

**what if the opposite were true?** some tests have unclear intent:
- test written years ago, no context
- test that asserts implementation details, not behavior
- test name doesn't match what it tests

**did the wisher actually say this?** yes — explicitly.

**exceptions?** tests with unclear intent may need clarification before deflake. the fix may require first clarify what the test should do.

**verdict: assumption needs caveat** — if test intent is unclear, the route should pause for clarification rather than proceed with a potentially incorrect fix.

## issues found

### issue 1: domain knowledge gap not addressed

**what was the issue?** vision assumes diagnosis is always possible by the route driver.

**how it was fixed:** added to "what is awkward" — the route may need to allow "escalate to domain expert" as a valid diagnosis outcome.

### issue 2: single root cause assumption is too narrow

**what was the issue?** assumed one cause per flake, but compound flakes exist.

**how it was fixed:** diagnosis should support multiple hypotheses per flake. will update vision to clarify.

### issue 3: reflection discoverability not solved

**what was the issue?** reflection docs accumulate but may never be read.

**how it was fixed:** added to open questions: "how do we surface relevant past reflections?"

## non-issues confirmed

| assumption | why it holds |
|------------|-------------|
| ci history accessible | reasonably true for most providers; fallback exists |
| 3x verification | wisher-approved; configurable |
| route model supports this | prior art validates |
| single-driver is sufficient | resume enables multi-session; multi-person is out of scope |

## adjustments made to vision

1. **acknowledged domain knowledge gap in "what is awkward"**
   - added: "domain knowledge gap — some flakes require domain expertise to diagnose; route may need escalate to expert as valid outcome"
   - added: "compound flakes — some tests flake for multiple independent reasons; diagnosis should support multiple root causes"

2. **added "reflection discoverability" to open questions**
   - added: "how do we surface relevant past reflections? — if reflection docs just accumulate in `.behavior/`, no one finds them"

3. **clarified that execution includes config/infra changes, not just code**
   - changed: "4. **execute** — make the repairs, release"
   - to: "4. **execute** — make the repairs (code or infra), release"

4. **added compound flakes to wisher validation questions**
   - added: "compound flakes — should diagnosis support multiple root causes per flake?"

all adjustments verified in vision document.

---

## deeper questioning: fundamental assumptions

the above questioned explicit assumptions. now questioning the implicit ones — assumptions so deep they feel like facts.

### 14. assumption: deflaking is worth the investment

**what do we assume?** the time spent on structured deflaking pays off.

**what evidence supports this?** trust in ci is valuable. flakes waste developer time. the wisher wants this solved.

**what if the opposite were true?** for small teams or early-stage projects:
- occasional re-runs may be cheaper than structured process
- flakes might disappear on their own (e.g., dependency update fixes a race condition)
- developer time may be better spent on features

**did the wisher actually say this?** implicitly — they asked for the route. but they didn't quantify when it's worth it.

**verdict: assumption holds for context** — the wisher operates in an environment where flakes matter.

### 15. assumption: the 7-stone structure maps to the problem

**what do we assume?** evidence → diagnosis → plan → execute → verify → itemize → reflect is the right decomposition.

**what evidence supports this?** mirrors scientific method. matches incident response patterns.

**what if the opposite were true?** alternatives exist:
- 3 stones: investigate → fix → confirm
- iterative: stone per flake rather than per phase

**did the wisher actually say this?** yes — the wish explicitly lists 7 phases.

**verdict: assumption is wisher-approved** — follow the wish.

### 16. assumption: "flake" is a well-defined concept

**what do we assume?** a flake is clearly distinguishable from a legitimate failure.

**what if the opposite were true?** gray areas:
- test fails only on tuesdays (flake or bug?)
- test fails when run after test X (order dependency — flake or design flaw?)
- test fails 1% of the time (threshold for "flake"?)

**did the wisher actually say this?** no — they said "tests had flaked" without precise definition.

**verdict: assumption needs operationalization** — flagged in open questions: scope of "flake".

### 17. assumption: github actions is the ci system

**what do we assume?** `gh` cli is available. workflow runs can be queried.

**what if the opposite were true?** users might have gitlab ci, jenkins, circleci, bitbucket pipelines.

**did the wisher actually say this?** no — wisher said "from the source of truth" without naming gh.

**verdict: assumption is too narrow** — but vision already says "ci provider (github actions, etc.)" as input. gh is the example, not the requirement.

### 18. assumption: tests are in a single test suite

**what do we assume?** all tests run together and can be analyzed together.

**what if the opposite were true?** monorepos and microservices have multiple test suites.

**verdict: assumption needs acknowledgment** — the input "test scope" partially addresses this.

### 19. assumption: flake data is available in ci history

**what do we assume?** ci runs from the past are queryable with enough detail.

**what if the opposite were true?** logs expired, test names not in logs, ci doesn't expose api.

**verdict: assumption has limits** — historical depth depends on ci retention. if no history, route shifts to "observe going forward" mode.

## final non-issues confirmed

| assumption | why it holds |
|------------|-------------|
| deflaking is worth it | wisher asked for it |
| 7-stone structure | wisher-specified |
| route operator is technical | "mechanic" role implies it |
| ci history available | standard feature with fallback |
| flake definition | flagged in open questions |

## summary

20 assumptions examined across r1 and r2. 3 issues found and addressed in vision. 17 confirmed as non-issues. the vision document is now thorough and accounts for edge cases, open questions, and awkward tradeoffs.

---

## re-review: 2026-04-11

vision was updated to add:
- expected stdout for `cicd.deflake init` with bind confirmation
- clarification that init auto-binds the route to the branch

**impact on assumptions:** none. the update clarifies user experience (how the skill communicates its actions) but does not affect any of the 20 assumptions examined above. the assumptions concern the deflake workflow itself (diagnosis, verification, reflection), not the init/bind mechanics.

**verdict:** all assumptions still hold. no new issues found.
