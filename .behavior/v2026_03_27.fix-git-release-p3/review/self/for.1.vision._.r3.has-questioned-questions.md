# self-review (r3): has-questioned-questions

deeper reflection with concrete evidence.

## reviewed artifacts

- `.behavior/v2026_03_27.fix-git-release-p3/0.wish.md` — source of answers
- `.behavior/v2026_03_27.fix-git-release-p3/1.vision.md` — section "open questions & assumptions"

---

## question 1: support other workflows besides release-please?

**original question**: should we support other workflows besides "release-please" for timeout diagnostics?

**evidence from wish**: line 50 says "lookup release-please workflow status on timeout"

**logic**: ehmpathy repos use release-please. no evidence of other workflows.

**what if we did support others?**: adds complexity, configuration, maintenance burden — for no clear use case

**resolution**: [answered] release-please is sufficient for ehmpathy repos

**fix applied to vision**: updated "questions for wisher" to "questions — resolved" with [answered] tag

---

## question 2: is 90s timeout configurable?

**original question**: is 90s timeout appropriate, or should it be configurable?

**evidence from wish**: lines 33, 44 show `90s` in timeout messages: "release pr did not appear in 90s"

**logic**: wish explicitly uses 90s. no request for configurability.

**what if we made it configurable?**: adds complexity, env vars, edge cases — premature optimization

**resolution**: [answered] 90s per wish examples; configurability deferred (YAGNI)

**fix applied to vision**: updated with [answered] tag and YAGNI note

---

## question 3: cumulative or interval time?

**original question**: should we show elapsed time in `💤` lines as cumulative or interval?

**evidence from wish**:
- line 31-32: `├─ 💤 5s in await` then `├─ 💤 10s in await` — increments by 5
- line 54-55: same pattern
- this is cumulative (5, 10, 15...) not interval (5, 5, 5...)

**logic**: wish examples are unambiguous — cumulative.

**resolution**: [answered] cumulative per wish examples

**fix applied to vision**: updated with [answered] tag and explicit "5s, 10s, 15s" pattern

---

## research items — properly categorized

### research 1: extant --watch patterns

**what**: read extant `--watch` output to align with shapes and vibes

**why**: wisher said "align stdouts with extant --watch shapes"

**can answer now?**: no — requires code exploration

**resolution**: [research] deferred to implementation phase

**fix applied to vision**: added to "research — deferred to implementation" section

---

### research 2: verify mergeCommit API

**what**: verify `gh pr view --json mergeCommit` returns squash commit on main

**why**: freshness check depends on correct commit

**can answer now?**: no — requires API verification

**resolution**: [research] deferred to implementation

**fix applied to vision**: added to "research — deferred to implementation" section

---

## summary

all 3 original questions answered via wish evidence:

| question | evidence | resolution |
|----------|----------|------------|
| other workflows | wish line 50 | [answered] release-please only |
| 90s configurable | wish lines 33, 44 | [answered] 90s fixed |
| cumulative time | wish lines 31-32, 54-55 | [answered] cumulative |

2 research items properly categorized:

| item | why deferred | phase |
|------|--------------|-------|
| --watch patterns | needs code exploration | implementation |
| mergeCommit API | needs API verification | implementation |

## vision updates completed

the "open questions & assumptions" section now shows:
- questions answered with [answered] tags and evidence
- research items with [research] tags and phase

no questions remain for wisher — all were answerable via wish.

---

## additional issues found and fixed (this review round)

### issue: incorrect "before" output in vision

**what was wrong**: the vision described a "broken" output that doesn't exist in actual snapshots

**actual current state**: the "found immediately" case works correctly:
```
🫧 and then...

🌊 release: chore(release): v1.3.0
   ├─ 👌 all checks passed
   ...
```

**fix applied**: rewrote "current state" section to match actual snapshots

### issue: timestamp vs commit terminology in wish

**what was wrong**: wish line 5 said "timestamp-based" and function signature used `prior_merged_at`

**correct approach**: commit-based freshness via `git merge-base --is-ancestor`

**fix applied**:
- updated wish context to say "commit-based freshness"
- updated function signature to use `prior_merge_commit` (SHA)

### issue: commit-based freshness not prominent enough

**what was wrong**: the core behavioral requirement was buried in vision

**fix applied**: added "MANDATORY: commit-based freshness" section at top of vision with table and rationale

---

### issue: inconsistent assumption phrasing

**what was wrong**: assumption #3 said "configurability raised as open question" but question #2 marked it [answered]

**fix applied**: updated assumption #3 to say "configurability deferred (YAGNI)" to match the resolved question

---

## verification: questions section structure

re-read the vision's "open questions & assumptions" section:

| section | count | status |
|---------|-------|--------|
| assumptions | 3 | all with rationale |
| questions — resolved | 3 | all [answered] with evidence |
| research — deferred | 2 | both tagged with clear scope |

no open questions remain for wisher — all were answerable via wish.

---

## summary of r3 round

| issue | fix |
|-------|-----|
| incorrect "before" output | rewrote to match actual snapshots |
| timestamp terminology | changed to commit-based |
| core requirement buried | promoted to MANDATORY section at top |
| inconsistent assumption phrasing | aligned with resolved question |
| 3 open questions | all [answered] via wish evidence |
| 2 research items | properly tagged [research] |
