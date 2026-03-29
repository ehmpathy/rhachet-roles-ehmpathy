# self-review: has-questioned-requirements

## requirement 1: the brief (rule.require.trust-but-verify)

### who said this was needed? when? why?

the wisher (human) requested this after they observed a mechanic waste 3+ hours and 20+ commits on the wrong root cause. the mechanic trusted a compaction summary that said "orphan processes are the issue" without verification. the actual issue was an obsolete snapshot file.

### what evidence supports this requirement?

strong evidence:
- real incident with measurable cost (3+ hours, 20+ commits)
- clear cause-effect: blind trust → wasted effort
- the pattern is generalizable: inherited conclusions can drift from reality

### what if we didn't do this?

without the brief, similar incidents would likely recur. however — is this a pattern or a one-off? unknown. the evidence is a single incident, though the failure mode feels recognizable.

### is the scope too large, too small, or misdirected?

**potential issue found:** the vision frames this as "compaction trust" but the principle applies more broadly. your own conclusions from 5 minutes ago can also be wrong. the scope might be too narrow if we only address compaction, but the brief in the wish already says "don't even trust yourself" — so the principle is already broad.

**verdict:** scope is appropriate. the brief applies broadly; compaction is just the origin example.

### could we achieve the goal in a simpler way?

considered alternatives:
- add a reminder to compaction summaries themselves → but we don't control the compaction process
- train mechanics to verify CI failures specifically → too narrow, misses other claim types

**verdict:** a brief is the right intervention. it's low-cost, durable, and applies broadly.

---

## requirement 2: the sessionstart hook (optional)

### who said this was needed? when? why?

the wisher suggested it as optional. purpose: nudge mechanics at the moment they resume from compaction.

### what evidence supports this requirement?

weak evidence:
- reinforces the brief at the critical moment
- but: is the moment of resume really the critical moment? the critical moment is when the mechanic is about to act on a claim — not when they first see the summary.

### what if we didn't do this?

the brief alone might be sufficient. mechanics who've internalized the pattern don't need a reminder. the hook adds value only for mechanics who haven't internalized the lesson yet — but those same mechanics might ignore the hook anyway.

### is the scope too large, too small, or misdirected?

**potential issue found:** how do we detect "resumed from compaction" vs "fresh session"? this is non-trivial. the hook has implementation complexity and the benefit is uncertain.

**verdict:** the hook is rightly marked optional. recommend we proceed without it initially. if the brief alone doesn't change behavior, reconsider.

---

## requirement 3: the mantra ("trust but verify — don't even trust yourself")

### is this the right frame?

**questioned:** "trust but verify" is a known phrase, but does it fit? the original phrase implies you do trust, then verify. the wish seems to say: don't trust at all without verification.

**reconsidered:** the phrase "trust but verify" captures the nuance well — you can provisionally accept claims, but you must verify before you act. it's not paranoid distrust; it's disciplined skepticism.

**verdict:** the mantra fits.

---

## summary

| requirement | holds? | notes |
|-------------|--------|-------|
| brief | yes | right intervention, right scope |
| hook | uncertain | marked optional, recommend defer |
| mantra | yes | captures the nuance |

## changes made

none. the vision holds under scrutiny. the open questions already capture the uncertainties (hook detection, scope).

## what i'll remember

- always question whether the evidence supports the solution, not just whether the solution sounds good
- a single incident is weak evidence for a systematic intervention, but the failure mode is recognizable enough to justify action
- optional requirements should be explicitly flagged as such (the vision does this)
