# F37 — the rank, budget, and lock logic stays in bash

## .the fork

- **decompose now:** move the pure computation (edit distance, fzf subsequence, dot-segment
  score, per-part budget) into small `.ts` transformers with unit tests, called from the hook
- **hold:** keep it in the hook, held by integration and acceptance tests over the whole

raised by peer review i007 (enroll-impl-arch-defects, blocker.3, graded `better`).

## .taken — hold, and why at the time

- the hook is a PreToolUse gate on every Bash call; its clean path is held to a fork budget
  (forkbudget, case23's exec tally). a call out to node per blocked command adds a runtime start
  the block path does not pay today
- the ranker is covered at the integration grain per tier (cases 47, 51, 56; the `[e]`/`[p]`
  rows), and the acceptance suite now drives each tier through the built hook (`[case2][t0]` typo,
  `[case2][t1]` fzf, `[case14]` dot-segment, `[case10]` the cap)
- the reviewer graded it `better`: no shipped harm, a shape preference

## .rework

**dirty** — a new runtime boundary for the hook, and the rank tests move grain.

## .confidence — 75%

## .where

`.dream/v2026_10_07.feat.one-shared-parser-and-ranker-for-the-permission-gates.md`

## .verdict

open
