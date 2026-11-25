# F5: the repo's prior test skips stay as they are in this pr

- **fork**: 5.3 asks zero skips. the full integration run reports 143 skipped. a scan of `src` and `blackbox` (`\b(it|test|describe|given|when|then)\.(skip|only|todo)\b|\.skipIf\(|\.runIf\(`) finds them all on main, none in a file this route touched:
  - `describe.skip` / `when.skip` on paid llm runs: `brief.compress` (`brief.compress`, `extractKernels` ×2, `compress.via.llmlingua`, `compress.via.bhrain.perfeval`, `compress.via.bhrain.contract`), `brief.condense` (`condense`, its `[t1]`, `restoreKernels`), `cluster`, `kernelize/clusterKernels`, `.evals` (`runReviewEval`, `compareBrains`)
  - env gates: `git.repo.test.play [case18]` and its peer (`skipIf(CI)`, real npm), `cicd.deflake/detect` (`runIf(isGhAuthenticated)`), `git.pull.watch.github.real` ×3 (`runIf(isLiveTargeted)`)
  unskip and make each pass here, or leave them to their owners
- **taken**: leave them. the `describe.skip` blocks are paid llm evals and perf evals; to run them costs money each ci run, and the `test` env lacks `OPENROUTER_API_KEY` (handoff §1). the env gates are deliberate: a real-npm play case, a gh-auth case, and live-github cases that ci targets on purpose. none touch push's `--help`; to unskip them is a change to the librarian role, the evals, and three mechanic suites, outside the wish
- **rework**: dirty for this pr (paid runs, a key the driver lacks, five owners), clean as its own pr
- **confidence**: 85% — the skips are deliberate cost gates by their shape; the 15% is that some may be stale and owed a delete instead
- **where**: 5.3 self review `has-zero-test-skips`
- **follow-up**: `dreams/2026_11_24.audit-prior-test-skips-for-stale-or-owed.dream.md`
- **verdict**: settled by the driver (S2 handed it over): stands as taken. the skips stay; the audit rides its dream
