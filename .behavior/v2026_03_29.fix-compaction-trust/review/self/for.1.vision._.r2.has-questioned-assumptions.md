# self-review r2: has-questioned-assumptions (deeper pass)

## missed assumption 1: we trust the wisher's characterization

### what do we assume?

we assume the handoff accurately describes what happened:
- the summary said "orphan processes"
- the mechanic "blindly trusted" and "never verified"
- 20+ commits were wasted on the wrong problem

### what evidence supports this?

we have only the handoff. we haven't verified:
- what the actual compaction summary said
- whether the mechanic attempted verification (and failed)
- what those 20+ commits actually did

### verdict

**ironic.** we're about to implement "trust but verify" — yet we trust the wisher's handoff without verification.

**but acceptable.** the wisher experienced the incident firsthand. this is a direct account, not an inherited summary. the lesson stands even if details are fuzzy.

**action:** no change needed, but note the irony: we trust the wisher's claim because they were the source, not an intermediary.

---

## missed assumption 2: the brief will surface at the right moment

### what do we assume?

we assume that when a mechanic resumes from compaction, the brief will:
1. be in context
2. come to mind when relevant
3. override the impulse to act immediately

### what if the opposite were true?

- the brief is in context but not salient
- the mechanic is focused on the summary, not on their briefs
- the impulse to "dive in" overrides the pattern

### verdict

**this is why the hook was suggested.** the hook surfaces the reminder at the critical moment — when the mechanic resumes. the brief alone relies on recall; the hook is active intervention.

**action:** strengthen the vision's case for the hook. currently marked "optional" but it's the mechanism that solves the moment problem.

---

## missed assumption 3: "trust but verify" is the right abstraction

### what do we assume?

we assume the principle should apply to all claims. but maybe:
- too broad: "verify all things" is paralysis
- too vague: what counts as "verification"?

### alternatives considered

| abstraction | scope | clarity |
|-------------|-------|---------|
| trust but verify | all claims | vague |
| verify diagnoses before action | diagnoses only | narrower |
| verify before destructive action | destructive actions | different axis |
| assume stale, prove fresh | inherited state | flipped frame |

### verdict

**"trust but verify" is the right level.** it's memorable, applies broadly, and has cultural resonance (cold war diplomacy). the brief can give specific examples without narrow the principle.

**no change needed.**

---

## missed assumption 4: the hook must detect compaction

### what do we assume?

we assume the hook should only fire on compaction resume. but the wish says "don't even trust yourself" — which applies to fresh sessions too.

### what if we scoped differently?

options:
1. hook on compaction resume only → requires detection logic
2. hook on every session start → simpler, broader
3. hook on long idle (>1hr) → time-based heuristic

### verdict

**option 2 is simpler and broader.** if the principle is "don't trust inherited claims, and your own," then every session start is a valid moment to remind.

**action:** add this as an alternative in the vision. the wisher can decide.

---

## missed assumption 5: a brief alone is sufficient

### what do we assume?

we assume a brief + optional hook is enough. but what if we built a pit of success?

### alternatives

| intervention | enforcement |
|--------------|-------------|
| brief | guidance (no enforcement) |
| hook | reminder (no enforcement) |
| skill gate | blocks action until verification step |
| tooluse validator | warns if action taken without prior verify step |

### verdict

**the brief is the right start.** a skill gate or validator would add complexity and friction. the wish doesn't ask for enforcement — it asks to institutionalize the lesson. a brief does that.

**if the brief fails, escalate.** but don't over-engineer upfront.

---

## found issues

### issue 1: hook purpose not emphasized

the r1 review noted the hook is optional, but didn't emphasize why it's valuable: it solves the moment problem. mechanics may have the brief in context but not recall it at the right moment. the hook surfaces the reminder actively.

**fix:** update vision to clarify the hook's purpose is moment-of-need, not just reminder.

### issue 2: alternative hook scopes not surfaced

the vision assumes the hook fires on compaction. but session-start-always or idle-threshold are simpler options.

**fix:** add to "open questions" section: "should the hook fire on every session start (simpler) or only on compaction resume (narrower)?"

---

## what holds

| assumption | why it holds |
|------------|--------------|
| the incident happened | wisher is firsthand source |
| brief is right intervention | low cost, durable, applies broadly |
| "trust but verify" is right abstraction | memorable, culturally resonant, right scope |
| enforcement is premature | wish asks for lesson, not gate |

---

## changes made

### 1. updated "contract" section

**before:**
> the optional hook reminds:
> - emits a nudge on compaction resume

**after:**
> the optional hook reminds:
> - emits a nudge on session resume (solves the moment-of-need problem — brief may be in context but not salient)

this clarifies the hook's value: it's not just a reminder, it's active intervention at the moment when the brief might not be salient.

### 2. updated "open questions" section

**added:**
> - should the hook fire on every session start (simpler, broader) or only on compaction resume (narrower, requires detection)?
> - if compaction-only, how do we detect "resumed from compaction" vs "fresh session"?

this surfaces the scope decision for the wisher.

### 3. updated "what feels off" section

**before:** framed hook detection as unsolved problem
**after:** framed it as design choice with simpler alternative

---

## what i'll remember

- "changes to make" is not "changes made" — execute fixes, don't just list them
- the hook's value is moment-of-need intervention, not just reminder content
- scope decisions should be surfaced as explicit choices for the wisher
