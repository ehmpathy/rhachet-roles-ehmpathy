# F14: the suite-level skips outside this diff, at verification

## .the fork
the full local integration run reads `134 skipped` (`Test Suites: 7 skipped`). verification says a
found skip gets removed and made to pass. every one sits outside this pr's four test files:

- `describe.skip` in 12 suites: `kernelize/clusterKernels`, `.evals/eval/compareBrains`,
  `.evals/eval/runReviewEval`, and nine under `librarian/skills/{brief.compress,brief.condense,cluster}`
  (brain evals, llmlingua, perf evals)
- `given.skipIf(!!process.env.CI)` twice in `git.repo.test.play` (`[case18]` real repo with real npm);
  these run locally, so they are not in the 134

| option | what it does | cost |
|---|---|---|
| A, remove the skips here | unskip 12 suites in other roles | runs paid brain evals and a python dependency (llmlingua) on every integration run; failures there are not this pr's; a rippled change across roles fails CLEAN |
| B, dream, with the inventory | the librarian/evals owner decides per suite: delete, gate on a declared cost lane, or fix | the skips stand until that owner acts |

## .taken, why
B. the skips are a cost decision in another role's evals, not a gap in this pr's coverage: this pr's
four test files carry no skip, and every touched suite ran with `0 skipped` on the final tree. to
unskip them here would smuggle a paid, cross-role change into a quota-refusal pr.

## .rework
clean: the decision touches no file in this diff.

## .confidence
80%: the stage text says remove any skip found; the counter is scope and cost, and that the stage's
own handoff criteria do not fit a skip this pr did not add.

## .where
`.dream/v2026_10_30.fix.suite-level-skips-in-evals.md`; `5.3.verification.yield.md`;
`review/self/for.5.3.verification._.has-zero-test-skips.md`.

## .verdict
none yet; best-guess B.
