# self-review: has-questioned-questions

## triage of open questions

### question 1: should the hook be mandatory or optional?

**triage:** [answered]

**answer:** optional. the wish explicitly says "(optional)" for the hook. the brief is the primary intervention; the hook is supplementary.

---

### question 2: should we track verification events for observability?

**triage:** [answered]

**answer:** out of scope for initial implementation. the wish doesn't ask for observability. this is a nice-to-have that can be added later if the brief alone doesn't change behavior.

---

### question 3: should the hook fire on every session start or only on compaction resume?

**triage:** [wisher]

**reason:** both are valid design choices:
- session-start-always: simpler to implement, broader applicability
- compaction-only: narrower scope, matches the origin incident

the wisher should decide based on whether they want the hook to be a general reminder or a targeted intervention.

---

### question 4: if compaction-only, how do we detect "resumed from compaction" vs "fresh session"?

**triage:** [research]

**reason:** only relevant if wisher chooses compaction-only. would need research into Claude Code's session mechanics to determine if compaction is detectable. possible approaches:
- check for presence of compaction markers in context
- check session duration/token count
- external state file

---

### question 5: is the brief location correct?

**triage:** [answered]

**answer:** yes, but clarify the path.

the wish says `.agent/repo=ehmpathy/role=mechanic/briefs/practices/work.flow/` — this is the *runtime* location (symlinked).

the *source* location is `src/domain.roles/mechanic/briefs/practices/work.flow/` in this repo.

when the brief is added to `src/domain.roles/mechanic/briefs/...` and built, it will appear at `.agent/repo=ehmpathy/...` at runtime.

---

### question 6: is the hook optional or required?

**triage:** [answered]

**answer:** same as question 1 — optional. duplicate question.

---

### question 7: should the brief apply only to compaction, or to all inherited state?

**triage:** [answered]

**answer:** all inherited state. the wish says "don't even trust yourself" — which applies beyond compaction to:
- your own conclusions from prior in this session
- notes from prior sessions
- documentation that may be stale
- any inherited claim

compaction is the origin example, but the principle is broader.

---

## summary

| question | triage |
|----------|--------|
| hook mandatory or optional? | [answered] optional |
| track verification events? | [answered] out of scope |
| session-start or compaction-only? | [wisher] needs decision |
| how to detect compaction? | [research] if needed |
| brief location correct? | [answered] yes (source: src/domain.roles/...) |
| hook optional or required? | [answered] optional (duplicate) |
| brief scope? | [answered] all inherited state |

---

## changes made

updated the vision's "open questions" section:

**before:** 7 questions scattered across "questions" and "validate with wisher" subsections

**after:** triaged into three categories:
- [wisher] — 1 question that requires wisher decision (hook scope)
- [research] — 1 question that requires research if compaction-only is chosen (detection mechanism)
- [answered] — 5 questions resolved via review (hook optional, brief scope, location, observability)

---

## what i'll remember

- triage questions early so the wisher knows what needs their input
- answered questions should be marked as answered, not left as open
- the source location (src/domain.roles/...) vs runtime location (.agent/repo=...) distinction matters
