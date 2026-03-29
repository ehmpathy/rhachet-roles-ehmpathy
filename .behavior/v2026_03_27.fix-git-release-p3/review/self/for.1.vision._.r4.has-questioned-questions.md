# self-review (r4): has-questioned-questions

final verification after all fixes applied.

## artifacts reviewed

1. `.behavior/v2026_03_27.fix-git-release-p3/0.wish.md` — the source of truth
2. `.behavior/v2026_03_27.fix-git-release-p3/1.vision.md` — specifically the "open questions & assumptions" section
3. extant snapshots at `src/domain.roles/mechanic/skills/git.release/__snapshots__/`

---

## the three questions — all [answered]

### question 1: other workflows besides release-please?

| aspect | content |
|--------|---------|
| question | should we support other workflows besides "release-please" for timeout diagnostics? |
| evidence | wish line 50: "lookup release-please workflow status on timeout" |
| logic | ehmpathy repos use release-please; no evidence of other workflows |
| tradeoff | support others = complexity; no use case |
| resolution | [answered] release-please is sufficient |
| vision status | correctly marked [answered] in "questions — resolved" |

### question 2: 90s configurable?

| aspect | content |
|--------|---------|
| question | is 90s timeout appropriate, or should it be configurable? |
| evidence | wish lines 33, 44: "release pr did not appear in 90s" |
| logic | wish explicitly uses 90s; no request for configurability |
| tradeoff | configurable = env vars, edge cases; YAGNI |
| resolution | [answered] 90s per wish; configurability deferred |
| vision status | correctly marked [answered] in "questions — resolved" |

### question 3: cumulative or interval time?

| aspect | content |
|--------|---------|
| question | show elapsed time as cumulative (5s, 10s) or interval (5s, 5s)? |
| evidence | wish lines 31-32, 54-55: `├─ 💤 5s` then `├─ 💤 10s` — increments |
| logic | wish examples are unambiguous — cumulative pattern |
| tradeoff | n/a — wish is explicit |
| resolution | [answered] cumulative (5s, 10s, 15s) |
| vision status | correctly marked [answered] in "questions — resolved" |

---

## the two research items — both [research]

### research 1: extant --watch patterns

| aspect | content |
|--------|---------|
| what | read extant `--watch` output to align with shapes and vibes |
| why | wisher said "align stdouts with extant --watch shapes" |
| can answer now? | no — requires code exploration |
| resolution | [research] deferred to implementation |
| vision status | correctly listed in "research — deferred to implementation" |

### research 2: verify mergeCommit API

| aspect | content |
|--------|---------|
| what | verify `gh pr view --json mergeCommit` returns squash commit on main |
| why | freshness check depends on correct commit SHA |
| can answer now? | no — requires API verification |
| resolution | [research] deferred to implementation |
| vision status | correctly listed in "research — deferred to implementation" |

---

## verification: vision section structure

re-read lines 210-227 of vision:

```
## open questions & assumptions

### assumptions

1. **release-please is the only workflow...** — with rationale
2. **squash merge is used** — with rationale
3. **90s timeout is sufficient** — per wish examples; configurability deferred (YAGNI)

### questions — resolved

1. **other workflows?** — [answered] release-please is sufficient for ehmpathy repos
2. **90s configurable?** — [answered] 90s per wish examples; configurability deferred (YAGNI)
3. **cumulative or interval?** — [answered] cumulative per wish examples (5s, 10s, 15s)

### research — deferred to implementation

1. **extant --watch patterns** — read extant `--watch` output to align with shapes and vibes
2. **mergeCommit API** — verify `gh pr view --json mergeCommit` returns the squash commit on main
```

all items properly categorized. no [wisher] items needed — all answerable via wish.

---

## issues found and fixed this round

| issue | what was wrong | fix applied |
|-------|---------------|-------------|
| incorrect "before" output | vision described nonexistent "broken" output | rewrote to match actual snapshots |
| timestamp terminology | wish said "timestamp-based"; function used `prior_merged_at` | changed to commit-based; `prior_merge_commit` |
| core requirement buried | commit-based freshness wasn't prominent | added MANDATORY section at top |
| inconsistent assumption | #3 said "raised as open question" but it was [answered] | aligned with resolved question |

---

## final state

| category | count | status |
|----------|-------|--------|
| questions | 3 | all [answered] with evidence from wish |
| research | 2 | all [research] with clear scope |
| assumptions | 3 | all with rationale |
| wisher items | 0 | none needed |

the vision's "open questions & assumptions" section is complete and consistent.
