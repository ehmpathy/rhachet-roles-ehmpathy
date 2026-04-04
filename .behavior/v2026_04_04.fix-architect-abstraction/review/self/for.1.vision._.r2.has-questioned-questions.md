# self-review r2: has-questioned-questions

triage of open questions from 1.vision.md

---

## questions from "questions that remain unanswered"

### q1: "where's the line? is `input.foo` machine code? is `arr.length`?"

**triage:**
- can this be answered via logic now? **yes**
- `input.foo` = property access = no decode needed = allowed
- `arr.length` = property access = no decode needed = allowed
- the "forbidden" table addresses this

**verdict:** [answered] — already addressed in vision's "what IS allowed" table

---

### q2: "performance concern? do extra function calls matter?"

**triage:**
- can this be answered via logic now? **yes**
- domain operations are called once per business action, not in tight loops
- function call overhead is negligible vs i/o costs
- if performance matters, the leaf operation can be inlined later

**verdict:** [answered] — performance concern is negligible for domain operations

---

### q3: "how does this interact with extant rules? specifically rule.prefer.wet-over-dry"

**triage:**
- can this be answered via logic now? **yes**
- the vision proposes reconciliation: readability = immediate, reuse = wait for 3+
- this is a proposed resolution, not an open question

**verdict:** [answered] — resolved via "two types of abstraction" proposal

---

## questions from "what must we validate with the wisher"

### q4: "the terminology: 'leaf operations' vs 'transformers' — which resonates?"

**triage:**
- does only the wisher know the answer? **yes** — this is preference
- the wish uses "transformers" but "leaf operations" provides contrast with "orchestrators"

**verdict:** [wisher] — ask wisher which term to use

---

### q5: "the scope: does this apply to all orchestrators, or specific layers?"

**triage:**
- does only the wisher know the answer? **partially**
- logic suggests: domain.operations are the primary target
- contract/ layer may have different constraints (e.g., sdk boundaries)
- the wish says "orchestration layer codepaths" — plural, general

**verdict:** [wisher] — ask wisher to confirm scope

---

### q6: "the exceptions: what IS allowed inline?"

**triage:**
- can this be answered via logic now? **yes**
- the vision's "what IS allowed" table addresses this
- exceptions: property access, operation calls, await, const, return, simple guards

**verdict:** [answered] — resolved via "what IS allowed" table

---

### q7: "relationship to wet-over-dry: readability abstraction happens immediately, reuse abstraction waits for 3+ usages?"

**triage:**
- can this be answered via logic now? **yes**
- this is the core proposal of the vision

**verdict:** [answered] — this is the proposed resolution

---

## questions from "what must we research externally"

### q8: "prior art: does clean code / clean architecture have prior art here?"

**triage:**
- should this be answered via external research? **yes**
- robert martin's clean code discusses extraction for clarity
- clean architecture discusses boundaries
- worth a web search to cite prior art

**verdict:** [research] — search for prior art in clean code / clean architecture

---

### q9: "token studies: any research on llm comprehension of named vs inline operations?"

**triage:**
- should this be answered via external research? **yes**
- this would strengthen the "robots benefit" argument
- may not find direct research, but worth a search

**verdict:** [research] — search for llm comprehension studies

---

## new questions surfaced in r2

### q10: "should this rule be in architect or mechanic?"

**triage:**
- does only the wisher know the answer? **yes** — they assigned it to architect
- the content feels mechanic-level, but wisher's assignment is the scope

**verdict:** [wisher] — note tension but accept wisher's assignment

---

## summary: question triage

| question | verdict | action |
|----------|---------|--------|
| q1: is property access allowed? | [answered] | see "what IS allowed" table |
| q2: performance concern? | [answered] | negligible for domain ops |
| q3: interaction with wet-over-dry? | [answered] | "two types of abstraction" |
| q4: terminology choice? | [wisher] | ask wisher |
| q5: scope of rule? | [wisher] | ask wisher |
| q6: inline exceptions? | [answered] | see "what IS allowed" table |
| q7: readability=immediate? | [answered] | this is the proposal |
| q8: clean code prior art? | [research] | web search |
| q9: llm comprehension studies? | [research] | web search |
| q10: architect vs mechanic? | [wisher] | note tension |

---

## update to vision needed?

the vision already has:
- "questions that remain unanswered" — now mostly resolved
- "what must we validate with wisher" — still valid
- "what must we research externally" — still valid

**action:** update vision to mark resolved questions as resolved, and add q10.

---

## vision update

marked questions as triaged. added note about architect vs mechanic scope.
