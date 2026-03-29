# self-review: has-questioned-questions

## reviewed artifacts

- `.behavior/v2026_03_27.fix-git-release-p3/1.vision.md` — section "open questions & assumptions"

---

## question triage

### question 1: support other workflows besides release-please?

**original**: should we support other workflows besides "release-please" for timeout diagnostics?

**can this be answered via logic?**: yes — the wish specifically mentions release-please. for ehmpathy repos, release-please is standard.

**verdict**: [answered] — release-please is sufficient for ehmpathy repos. other repos can extend later if needed.

---

### question 2: is 90s timeout configurable?

**original**: is 90s timeout appropriate, or should it be configurable?

**can this be answered via logic?**: yes — the wish shows 90s in examples (lines 33, 44). no need to add complexity for initial implementation.

**verdict**: [answered] — 90s per wish examples. configurability deferred — YAGNI.

---

### question 3: cumulative or interval time?

**original**: should we show elapsed time in `💤` lines as cumulative or interval?

**can this be answered via extant docs?**: yes — wish examples show 5s, 10s (lines 31-32, 54-55) which is cumulative.

**verdict**: [answered] — cumulative per wish examples (5s, 10s, 15s).

---

## research items

### research 1: extant --watch output patterns

**what**: read extant `--watch` output to understand the shapes and vibes

**why**: wisher said "align stdouts with extant --watch shapes"

**when**: before implementation starts

**verdict**: [research] — deferred to implementation phase

### research 2: verify mergeCommit API

**what**: verify `gh pr view --json mergeCommit` returns the squash commit on main

**why**: freshness check depends on this

**when**: at implementation time

**verdict**: [research] — quick verification at implementation

---

## summary

| question | status | resolution |
|----------|--------|------------|
| other workflows | [answered] | release-please is sufficient |
| 90s configurable | [answered] | 90s per wish; YAGNI |
| cumulative vs interval | [answered] | cumulative per wish examples |
| --watch patterns | [research] | deferred to implementation |
| mergeCommit API | [research] | verify at implementation |

## vision updates needed

update the "questions for wisher" section to show these are now [answered], and update "research needed" to include the deferred research items.
