# self-review r2: has-questioned-questions

## triage of open questions

the guide asks: for each question, triage as [answered], [research], or [wisher].

### questions that remain unanswered (from vision)

#### 1. how far back do we look? — 30 days? 90 days? configurable?

**can this be answered via logic?** yes, partially.

- 30 days is a reasonable default — matches typical sprint cycles
- should be configurable for teams with different needs
- gh actions retains logs for 90 days by default, so that's the upper bound without archival

**verdict: [answered]** — default to 30 days, make configurable. note gh's 90-day retention limit.

#### 2. how do we detect flakes vs legitimate failures?

**can this be answered via logic?** partially.

- classic flake pattern: same commit, same test, different outcomes across runs
- but needs operational threshold: how many contradictions before it's a flake?
- could use heuristic: if test has passed and failed on same commit, it's a flake

**can this be answered via extant docs?** yes — flake detection tools exist.

**verdict: [research]** — research extant flake detection approaches (jest --detectOpenHandles, flaky test tools, etc.)

#### 3. what if a flake requires environment changes?

**can this be answered via logic?** yes.

- environment changes are just another type of fix
- vision already says execution includes "code or infra"
- environment change would be documented in the plan and executed accordingly

**verdict: [answered]** — environment changes are valid fixes. already covered by "code or infra" language.

#### 4. how do we handle flakes that only reproduce under load?

**can this be answered via logic?** partially.

- these are parallelism-induced flakes
- may require ci run with higher parallelism to reproduce
- diagnosis phase should include "run under load" as a hypothesis test

**should this be answered via external research?** yes — patterns for parallelism flakes.

**verdict: [research]** — research common parallelism flake patterns and diagnosis approaches.

#### 5. how do we surface relevant past reflections?

**can this be answered via logic?** yes.

options:
1. an index file that lists all reflection docs with summaries
2. route reads past reflections at start and surfaces relevant ones
3. extract repeated patterns into briefs that are always loaded

**verdict: [answered]** — for v1, option 1 (index file) is simplest. future enhancement could auto-surface relevant reflections.

### what must we validate with the wisher? (from vision)

#### 1. scope of "flake" — is it strictly "passed on retry"? or also "sometimes fails, sometimes passes across prs"?

**verdict: [wisher]** — this is a definitional question only the wisher can answer. both interpretations are valid.

#### 2. verification threshold — is 3x sufficient? should it be configurable?

**can this be answered via logic?** the wisher said 3x explicitly in the wish.

**verdict: [answered]** — wisher specified 3x. make it configurable is reasonable enhancement but 3x is the baseline.

#### 3. reflection format — what structure makes reflection docs most useful?

**can this be answered via logic?** yes, with reasonable defaults.

- follow incident post-mortem format: what happened, root cause, action items
- the wisher already specified: root causes, why introduced, how to prevent
- structured template with sections is pit-of-success

**verdict: [answered]** — use standard post-mortem format with wisher-specified sections.

#### 4. compound flakes — should diagnosis support multiple root causes per flake?

**verdict: [wisher]** — this changes the complexity of the route. wisher should confirm whether to support multiple causes or treat each as separate.

### what must we research externally? (from vision)

#### 1. gh api for workflow runs

**verdict: [research]** — straightforward API docs research. needed for evidence-gather implementation.

#### 2. extant flake detection tools

**verdict: [research]** — see what's out there. jest --detectOpenHandles, quarantine patterns, flaky-test-quarantine libraries.

#### 3. common flake patterns

**verdict: [research]** — time-based, parallelism, snapshot, environment drift. documented patterns help diagnosis.

---

## summary of triage

| question | verdict | reason |
|----------|---------|--------|
| how far back | [answered] | 30 days default, configurable, 90-day gh limit |
| detect flakes vs failures | [research] | needs tool research |
| environment changes | [answered] | covered by "code or infra" |
| parallelism flakes | [research] | needs pattern research |
| surface past reflections | [answered] | index file for v1 |
| scope of "flake" | [wisher] | definitional, only wisher knows |
| verification threshold | [answered] | wisher said 3x, make configurable |
| reflection format | [answered] | post-mortem structure |
| compound flakes | [wisher] | changes complexity |
| gh api | [research] | implementation detail |
| flake detection tools | [research] | tool research |
| common flake patterns | [research] | diagnosis patterns |

**totals:**
- [answered]: 5
- [research]: 5
- [wisher]: 2

## updates needed to vision

the "open questions & assumptions" section should be updated to reflect this triage. each question should be tagged.

### proposed edits

1. under "questions that remain unanswered":
   - add triage tags to each question
   - move answered questions to "assumptions we've made" with their answers

2. under "what must we validate with the wisher":
   - keep only the 2 [wisher] items
   - remove items now [answered]

3. under "what must we research externally":
   - enumerate all [research] items clearly

## no issues found

all questions are triaged. the vision already contains the questions; they just needed classification.

---

## re-review: 2026-04-11

vision was updated to add expected stdout for `cicd.deflake init` with bind confirmation.

**impact on question triage:** none. the update concerns init/bind UX, not any of the 12 questions triaged above. the questions concern flake detection, diagnosis patterns, verification thresholds, and scope definitions — none related to route initialization.

**verdict:** all triage decisions still hold. no new questions surfaced.
