# self-review r3: has-questioned-questions

## deeper triage of open questions

r2 provided initial triage. this r3 validates each decision and ensures the vision reflects the triage accurately.

---

## questions originally marked unanswered

### 1. how far back do we look?

**triage process:**
- can this be answered via logic? yes
  - 30 days covers typical sprint cycles
  - 90 days is gh's retention limit
  - configurable addresses edge cases

**verdict: [answered]**

**how it was fixed in vision:**
- added to assumptions: "lookback period is 30 days — [answered] default to 30 days, configurable; gh retains logs 90 days"

**why this holds:** the answer is pragmatic. 30 days captures recent flakes without query overhead. configurability addresses teams with different needs. gh's 90-day limit is a known constraint.

---

### 2. how do we detect flakes vs legitimate failures?

**triage process:**
- can this be answered via logic? partially — but not fully
- can this be answered via extant docs? yes — flake detection tools exist
- should this be marked for research? yes

**verdict: [research]**

**how it was added to vision:**
- under "questions that require research": "how do we detect flakes vs legitimate failures? — [research] extant flake detection approaches needed"

**why this needs research:** the heuristic "same commit, different outcomes" is a start, but edge cases abound. tools like test-quarantine, jest's flaky test detection, and ci-level retry mechanisms have solved variants of this. research will surface best practices.

---

### 3. what if a flake requires environment changes?

**triage process:**
- can this be answered via logic? yes
- the vision already says "code or infra" in step 4

**verdict: [answered]**

**how it was fixed in vision:**
- added to assumptions: "environment changes are valid fixes — [answered] covered by 'code or infra' language"

**why this holds:** environment changes (ci config, node version, database mock vs real) are just infrastructure fixes. the vision's "code or infra" language already covers this case.

---

### 4. how do we handle flakes that only reproduce under load?

**triage process:**
- can this be answered via logic? partially
- should this be marked for research? yes — parallelism patterns are well-documented

**verdict: [research]**

**how it was added to vision:**
- under "questions that require research": "how do we handle flakes that only reproduce under load? — [research] parallelism flake patterns"

**why this needs research:** parallelism-induced flakes (race conditions, resource contention, port conflicts) have known patterns. research will document diagnosis approaches (run with higher parallelism, isolate test order, check for shared state).

---

### 5. how do we surface relevant past reflections?

**triage process:**
- can this be answered via logic? yes
- simplest solution: index file that lists past reflections

**verdict: [answered]**

**how it was fixed in vision:**
- added to assumptions: "past reflections via index file — [answered] for v1, an index file lists reflection docs with summaries"

**why this holds:** an index file is the minimal viable mechanism. it doesn't require new infrastructure. future enhancement could auto-surface relevant reflections based on error patterns, but that's v2.

---

## questions originally marked for wisher validation

### 1. scope of "flake"

**triage process:**
- can this be answered via logic? no — it's a definitional choice
- does only the wisher know the answer? yes

**verdict: [wisher]**

**why this needs wisher:** the vision could define "flake" operationally, but the wisher may have a specific definition in mind. "passed on retry" is strict. "sometimes fails across prs" is looser. both are valid; the wisher chooses.

---

### 2. verification threshold (3x)

**triage process:**
- can this be answered via logic? yes — wisher already said 3x
- is this a question or an assumption? the wisher specified 3x; it's an assumption, not a question

**verdict: [answered]**

**how it was fixed in vision:**
- updated assumption: "3x verification is sufficient — three consecutive passes proves stability (wisher-specified, configurable)"
- removed from wisher validation section

**why this holds:** the wisher explicitly said "run the build 3x in a row". the only question was configurability, which is a reasonable enhancement.

---

### 3. reflection format

**triage process:**
- can this be answered via logic? yes
- the wisher specified: root causes, why introduced, how to prevent
- this follows incident post-mortem structure

**verdict: [answered]**

**how it was fixed in vision:**
- added to assumptions: "reflection format is post-mortem style — [answered] root causes, why introduced, how to prevent"
- removed from wisher validation section

**why this holds:** the wisher gave explicit structure. post-mortem format is industry standard. no ambiguity remains.

---

### 4. compound flakes

**triage process:**
- can this be answered via logic? no — this changes route complexity
- does only the wisher know the answer? yes

**verdict: [wisher]**

**why this needs wisher:** support for multiple root causes per flake adds complexity to diagnosis and plan phases. the wisher should decide if this is worth the added complexity or if compound flakes should be treated as separate flakes.

---

## questions originally marked for external research

### 1. gh api for workflow runs

**verdict: [research]** — confirmed. this is implementation detail.

### 2. extant flake detection tools

**verdict: [research]** — confirmed. tools and patterns exist.

### 3. common flake patterns

**verdict: [research]** — confirmed. documented patterns help diagnosis.

---

## summary of changes to vision

| original section | change made |
|------------------|-------------|
| assumptions | added 4 new answered questions with [answered] tag |
| unanswered questions | renamed to "questions that require research" |
| wisher validation | reduced from 4 to 2 items |
| external research | consolidated into "questions that require research" |

---

## verification: vision reflects triage

re-read the vision document. confirmed:
- assumptions section has 8 items (4 original + 4 answered questions)
- research section has 5 items (all tagged [research])
- wisher section has 2 items (only true [wisher] questions remain)

no further edits needed. the triage is complete and the vision is updated.

---

## re-review: 2026-04-11

vision was updated with:
1. expected stdout for `cicd.deflake init` with bind confirmation
2. clarification that driver must explicitly run `--as rewound` when verification fails (self-review guard enforces this)

**impact on question triage:** none. updates concern init/bind UX and rewind mechanics — neither affects the 12 questions triaged above about flake detection, diagnosis, verification thresholds, and scope definitions.

**new question surfaced?** the rewind clarification raises: "how does the verification guard detect failure and enforce rewind?" — this is an implementation detail, not a vision-level question. the vision correctly states the guard ensures the driver runs the rewind command.

**verification pass:** re-read vision lines 216-240 (open questions section):
- assumptions: 8 items present (items 1-4 original, items 5-8 have [answered] tags) ✓
- research: 5 items present (items 1-5 all have [research] tags) ✓
- wisher: 2 items present (both have [wisher] tags) ✓
- all tags match the triage in r2

**verdict:** all triage decisions still hold. vision accurately reflects the triage.
