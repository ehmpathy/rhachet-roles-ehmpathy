# self-review r3: has-questioned-questions (deeper pass)

## found issue: misclassified a question as [wisher]

### what i got wrong

in r2, i classified this as [wisher]:
> should the hook fire on every session start or only on compaction resume?

### what the wish actually says

the wish explicitly states:
> on resume from compaction, emit: ...

the wisher has already decided: compaction-only. this is not a [wisher] question — it's [answered].

### fix

update the vision to reflect that the hook scope is compaction-only (per wish).

---

## deeper analysis: the [research] question

### the question

> how do we detect "resumed from compaction" vs "fresh session"?

### can i answer via logic now?

let me reason through this:

1. **hooks run at session start** — before the agent sees context
2. **hooks can't read session content** — they run as shell scripts with stdin from the tool input, not the session
3. **compaction is internal to Claude Code** — no documented external signal

therefore, detection of compaction from a sessionstart hook is **not possible with current architecture**.

### alternatives

| approach | feasibility |
|----------|-------------|
| detect via hook | not possible — hooks can't see session content |
| fire on every session start | possible — simpler, broader |
| external state file | possible — track session continuations |
| ask wisher to reconsider scope | possible — maybe every-session is acceptable |

### verdict

the research question has a partial answer: **detection via hook is not feasible** with current architecture.

this surfaces a design tension:
- wisher wants compaction-only
- but compaction-only requires detection
- detection is not feasible from a hook

the wisher should be asked: is every-session-start acceptable as an approximation?

---

## changes made

### issue 1: misclassified hook scope as [wisher]

**how fixed:**
- r2 had: `**[wisher]** — should the hook fire on every session start or only on compaction resume?`
- r3 fix: moved to `**[answered]** — hook scope is compaction-only (wish says "on resume from compaction, emit:")`
- lesson: re-read the wish before you classify a question as open

### issue 2: [research] question had no logical analysis

**how fixed:**
- r2 had: `**[research]** — how do we detect "resumed from compaction" vs "fresh session"?`
- r3 fix: answered via logic — hooks run before session content is visible, so detection is not possible from a hook. added alternatives: fire on every session, or use external state file.
- lesson: "can i answer via logic now" includes architectural reasoning, not just code lookup

### issue 3: surfaced new [wisher] question from research

**how fixed:**
- research revealed that wisher's scope (compaction-only) conflicts with feasibility (can't detect compaction from hook)
- added new [wisher] question: is every-session-start acceptable as an approximation?
- lesson: when research reveals a conflict with the wish, surface it explicitly

---

### issue 4: vision had internal inconsistency (found on slow re-read)

**what was wrong:**
- line 56 said "emits a nudge on session resume"
- but [answered] section said "hook scope is compaction-only (wish says...)"
- these were inconsistent

**how fixed:**
- updated line 56 to say "emits a nudge on compaction resume (per wish); note: detection is non-trivial, see [wisher] question"
- now the contract section matches the [answered] section

### issue 5: suggested mitigation was not feasible (found on slow re-read)

**what was wrong:**
- "hook noise" tradeoff suggested: "only fire if summary contains diagnosis-like language"
- but hooks can't read session content — so this mitigation is not feasible

**how fixed:**
- updated to note that this approach is not feasible due to architectural constraint

---

## why the triaged questions hold

### [wisher] question: is every-session-start acceptable?

**why this requires wisher input:**
- the wisher explicitly asked for compaction-only
- but we discovered compaction detection is not feasible from a hook
- this is a tradeoff decision only the wisher can make
- we can't assume they'd accept the approximation

### [research] question: how to detect compaction?

**why this is answered:**
- reasoned through the architecture: hooks run before session content is visible
- hooks receive stdin from tool input, not session context
- compaction is internal to Claude Code with no external signal
- conclusion: not possible from current hook architecture
- alternatives surfaced for wisher consideration

### [answered] questions (why each holds)

**hook is optional:**
- wish says "(optional)" explicitly at line 48
- no ambiguity — direct quote from source

**hook scope is compaction-only:**
- wish says "on resume from compaction, emit:" at line 52
- this is the wisher's stated intent, even if implementation is non-trivial

**brief applies to all inherited state:**
- wish says "don't even trust yourself" — broader than compaction
- the mantra applies to any inherited claim, not just compaction summaries

**brief location:**
- wish specifies `.agent/repo=ehmpathy/role=mechanic/briefs/practices/work.flow/`
- this repo structure means source is `src/domain.roles/mechanic/briefs/...`
- confirmed by repo structure brief in .agent/repo=.this/role=any/briefs/repo.structure.md

**observability out of scope:**
- wish doesn't mention track verification events
- wish focuses on institutionalize lesson, not measure it
- can add later if brief alone doesn't work

---

## what i'll remember

- re-read the wish when a question seems open — the answer might already be there
- "can i answer via logic now" includes reason through architectural constraints
- when research reveals an answer that conflicts with the wish, surface it as a new [wisher] question
- slow down and read line by line — inconsistencies hide in plain sight
- suggested mitigations should be checked for feasibility, not just noted
