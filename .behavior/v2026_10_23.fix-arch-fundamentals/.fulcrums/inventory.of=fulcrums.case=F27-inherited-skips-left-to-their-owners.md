# F27 — the skips this branch inherits from main stay with their owners

- **the fork**: the verification stone asks for zero skips. `src/` holds skips this branch never touched (`git diff origin/main --name-only` lists none of them):
  - `describe.skip` on the librarian kernelize, compress, condense, and cluster suites, and on `src/domain.operations/kernelize/clusterKernels`; main moved them out by `ff1acc9d` and `19df13c4` ("skip the kernelize suites, which move to rhachet-roles-bhrain"), and its jest config excludes `src/domain.operations/kernelize/**` in `testMatch`
  - `describe.skip` on `.evals/eval/compareBrains` and `runReviewEval` (paid llm runs)
  - `given.skipIf(CI)` in `git.repo.test.play` `[case18]` (real npm), `then.runIf` in `cicd.deflake/detect` (gh auth) and `git.branch.rebase.lock` (pnpm, yarn present)

  (a) un-skip and make each pass in this route; (b) delete the suites main already moved out; (c) leave each with its owner and record it here.
- **taken**: (c).
- **why**:
  - (a) reverses a decision main made two commits before this branch: the kernelize suites now live in rhachet-roles-bhrain. to run them here re-adds the paid llm calls main removed
  - (b) deletes another domain's code from a route about architect and mechanic briefs: a ripple well past this diff (CLEAN: no)
  - none of the skips guards a behavior this route adds; every suite this route touched runs with no skip (`boot.budget`, `briefs.twins`, `pretooluse.forbid-terms.*`)
- **rework**: dirty for (a) — it reverses main's move and costs paid llm runs each ci pass; clean for (b) once the bhrain copies are confirmed.
- **evidence, 2026-11-24**:
  - the full integration run's 134 skips all trace to `describe.skip` / `when.skip` in the librarian and `.evals` suites; gh, pnpm, yarn are present and `CI` is unset, so no `runIf` / `skipIf` skipped here
  - the bhrain copies are not there: `rhx git.repo.get files --in ehmpathy/rhachet-roles-bhrain --paths '**/{kernelize,brief.compress,brief.condense,cluster}*/**'` → `found: 0 files`. so (b) is not yet clean — it would delete the only copy
  - the work is caught: `dreams/v2026_11_24.fix.skipped-suites-left-in-place-while-the-librarian-move-waits.md`
- **confidence**: 70%. the residual: the stone's text says to fix prior skips regardless of origin.
- **where**: the files above; `5.3.verification`, zero-skips step
- **verdict**: **ruled by the wisher (chat, 2026-11-24)**: zero skips binds only the suites this route touched — *"yeah, only the ones this route touched"*. the inherited skips stay with their owners
