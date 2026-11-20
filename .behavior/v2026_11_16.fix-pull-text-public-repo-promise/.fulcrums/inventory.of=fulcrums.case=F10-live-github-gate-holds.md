# fulcrum F10: skips in files outside this pr stay, named

## .the fork
the 5.3 zero-skips scan over all of `src` found skips in files this pr does not touch. either (a) remove them in this pr, or (b) keep them, name each, and catch the work as a followup.

the set, from `rhx grepsafe --pattern '\.(skip|only)\(|skipIf|runIf|it\.todo|test\.todo' --path src --glob '*.test.ts'`:
- ten `describe.skip` / `when.skip` suites: librarian `cluster`, `brief.condense` (+ `restoreKernels`), `brief.compress` (contract, llmlingua, perfeval, `extractKernels`, `compareKernels`, the `.sh` suite), `kernelize/clusterKernels`, `.evals` (`compareBrains`, `runReviewEval`)
- `git.repo.test.play` case18 and its peer: `given.skipIf(!!process.env.CI)`, a real npm install
- `cicd.deflake/detect`: `then.runIf(isGhAuthenticated)`
- `git.pull.watch.github.real`: three `given.runIf(isLiveTargeted({ mechanism: 'github' }))`

## .taken: (b)
- no file in the set is in this pr's diff; none tests a skill this behavior changes
- most call a paid brain or a live service (llm evals and compression, real npm, live github); to unskip them puts that cost and those credentials into every ci run, a policy change outside this behavior
- each needs its own owner call: delete as dead, move to a paved opt-in runner, or fix and enable
- the ten test files this pr touches hold none

## .rework
clean: each removal is local to its own file and owes naught to this pr's code.

## .confidence
75%: the stone's zero-skip rule reads as absolute; the doubt is whether it means to pull a repo-wide skip cleanup into a scoped behavior.

## .verdict
open
