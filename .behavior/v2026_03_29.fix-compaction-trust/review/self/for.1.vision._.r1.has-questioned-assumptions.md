# self-review: has-questioned-assumptions

## assumption 1: mechanics read and internalize briefs

### what do we assume?

we assume that if we put the "trust but verify" pattern in a brief, mechanics will:
1. read it (or have it in context)
2. internalize the pattern
3. apply it in the moment

### what evidence supports this?

weak evidence. briefs are in context, so mechanics see them. but "see" ≠ "internalize" ≠ "apply."

### what if the opposite were true?

if mechanics don't internalize briefs, then the brief alone won't change behavior. the hook becomes more important — or we need a different intervention entirely.

### verdict

**this assumption is risky.** the vision acknowledges this in "cons" section: "requires mechanic discipline (brief is guidance, not enforcement)."

**mitigation:** keep the hook as an option. if the brief alone doesn't work, revisit.

---

## assumption 2: compaction summaries are the primary source of inherited claims

### what do we assume?

we assume the main danger is compaction summaries. the mechanic reads a stale summary and acts on it.

### what if the opposite were true?

other sources of inherited claims:
- your own conclusions from 5 minutes ago
- prior session notes
- code comments that are out of date
- documentation that's stale
- user instructions based on outdated state

### did the wisher say this?

no. the wisher said "don't even trust yourself" — which is broader than just compaction. the compaction incident was the trigger, but the principle applies to all inherited claims.

### verdict

**the vision already handles this.** the brief scope is broad ("all inherited claims, not just compaction"). the compaction story is just the origin example.

---

## assumption 3: verification is cheap relative to action on wrong claims

### what do we assume?

we assume it's always worth the time to verify before you act.

### what if the opposite were true?

sometimes verification is expensive:
- run a 30-minute test suite to verify a diagnosis
- wait for CI to complete before you know if a claim is true
- query a slow database to check state

### verdict

**partially valid.** verification is usually cheaper than wasted effort, but not always. the brief should acknowledge this and suggest cheap verification methods first.

**action:** update the vision's "edgecases" table to note: "verification can be expensive → suggest cheap checks first (error logs, quick queries, simple file reads)."

---

## assumption 4: one incident is sufficient evidence

### what do we assume?

we assume the 3-hour, 20-commit incident justifies a systematic intervention.

### what evidence supports this?

the incident is real and costly. but one incident could be an outlier.

### what if the opposite were true?

if this is rare, the intervention is overhead for little benefit. however — the failure mode (trust stale claim → wasted effort) is recognizable and likely common, even if not always documented.

### verdict

**acceptable risk.** the intervention is low-cost (one brief). even if the incident is rare, the brief adds value for all inherited claims, not just compaction.

---

## assumption 5: the problem is "blind trust"

### what do we assume?

we assume the mechanic failed because they trusted the summary blindly.

### what if the opposite were true?

alternative root causes:
- **lack of verification skills:** didn't know how to check the actual error
- **over-confidence:** assumed prior self was competent
- **sunk cost fallacy:** kept on the same path after initial investment
- **time pressure:** felt rushed to fix quickly

### did the wisher say this?

yes. the wisher explicitly said: "mechanic acted on inherited diagnosis without verification." the root cause is clearly stated.

### verdict

**holds.** the wisher diagnosed the root cause as blind trust. the brief addresses this directly.

---

## summary

| assumption | holds? | notes |
|------------|--------|-------|
| mechanics internalize briefs | risky | acknowledged in cons; hook as backup |
| compaction is primary source | no, but handled | vision already scopes broadly |
| verification is cheap | usually | add note about cheap checks first |
| one incident is enough | acceptable | low-cost intervention |
| problem is blind trust | yes | wisher's explicit diagnosis |

## changes made

1. **vision update:** add to edgecases table that when verification is expensive, suggest cheap checks first (error logs, quick file reads) before expensive verification (full test suite).

## what i'll remember

- assumptions about human behavior (internalize briefs, change habits) are risky and should be explicitly surfaced
- even if the trigger is narrow (compaction), check if the principle applies more broadly
- low-cost interventions can proceed with weaker evidence than high-cost ones
