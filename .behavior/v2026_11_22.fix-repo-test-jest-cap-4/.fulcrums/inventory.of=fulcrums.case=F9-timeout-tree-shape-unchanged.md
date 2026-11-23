# F9: the timeout tree keeps its two `status` rows

## .the fork
- **a.** leave the extant timeout tree as is: `├─ status` (inflight → `⏱️ timeout`), then a peer row `├─ status: malfunction`
- **b.** fold them into one `status` row, as a 5.3 peer lane (snapshot-visual-blemishes) asked

## .taken
**a.** the two-row shape is not this work's render. `git show HEAD:…/git.repo.test.sh` prints `status: malfunction` after the timer row at line 1588, and six extant snaps in three other suites (`scope`, `play`, `integration`) pin it on every failure kind, not only timeout. this work adds lines after the tree (the cap hint), never inside it. a fold would redesign every failure tree of the skill and resnap those six, outside the wish (a worker cap).

## .rework
clean in this branch (no code here depends on it); the redesign itself touches every failure branch and its snaps, so it is caught as a dream with its own clamp.

## .confidence
85%. the reviewer is right that it reads twice; the doubt is only where to fix it.

## .where
`git.repo.test.sh` timeout and failure branches; dream `dreams/v2026_11_22.fix.one-status-row-per-run-tree.md`.

## .verdict
awaits wisher review.
