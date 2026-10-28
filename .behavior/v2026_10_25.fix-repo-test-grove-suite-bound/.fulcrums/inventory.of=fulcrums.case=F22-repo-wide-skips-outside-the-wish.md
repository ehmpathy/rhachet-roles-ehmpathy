# F22 — 134 repo-wide test skips outside this wish stay, for the director

- **found:** 5.3 verification. the full `--thorough` integration run reports `7 skipped` suites and
  `134 skipped` tests. a source search for skip markers in `*.integration.test.ts`:
  - 13 `describe.skip` — `clusterKernels` (x2), `condense`, `restoreKernels`,
    `compress.via.bhrain.contract`, `compress.via.llmlingua`, `extractKernels`, `compareKernels`,
    `brief.compress.sh`, `compress.via.bhrain.perfeval`, `compareBrains`, `runReviewEval`, plus a
    `when.skip` in `condense`
  - `then.runIf` gates on `gh` auth (`cicd.deflake/detect`) and on `pnpm` / `yarn` presence
    (`git.branch.rebase.lock`)
- **not this branch:** none sit in a file this branch's wish touches; all predate it
- **fork:** un-skip here (each needs a diagnosis of why it was disabled — most are LLM suites, cost
  and latency unknown) · leave them, name them, let the director decide
- **taken:** leave them in this PR; the director decides. the `runIf` tool gates likely want a
  ConstraintError (the same failhide verdict as F20); the `describe.skip` suites want a per-suite
  call: revive, move to a paid eval lane, or delete
- **rework:** dirty — 13 suites across two roles, each a separate diagnosis
- **confidence:** 60% — the director's F20 verdict (a CI skip with no failure is a failhide) argues
  these are in reach of the same rule
- **raised by:** self review 3/8, 5.3
- **verdict:** out of scope (director, 2026-10-28) — the skips stay out of this PR; caught as
  dream `.dream/v2026_10_28.fix.repo-wide-integration-test-skips.md`
