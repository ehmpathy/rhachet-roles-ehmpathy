# F19 — skips that predate this route stay, dreamed

- **fork:** 5.3 says "zero skips — remove each and make it pass". the repo holds ~20 prior skips.
  remove them in this route, vs catch them as a dream.
- **taken:** dream. `git diff origin/main -G'\.skip\(|\.only\(|skipIf|runIf' -- src blackbox`
  is empty — this route adds and edits no skip. the skips live in suites this route does not touch:
  - `describe.skip` on the librarian compress/condense/cluster evals, `.evals/eval/*`,
    `kernelize/clusterKernels`, and `mechanic/boot.yml.integration.test.ts`. most are paid llm
    evals or depend on a python llmlingua install
  - `runIf`/`skipIf` gates in `git.branch.rebase.lock`/`.take` (pnpm/yarn present?),
    `cicd.deflake/detect` (gh auth?), and `git.repo.test.play` (`!CI`)
  every one needs a per-suite decision (fix vs delete vs move to a paid eval lane). none is a
  one-line removal.
- **dream:** `.dream/v2026_09_27.fix.prior-skips-hide-suites-that-never-run.md`
- **rework:** dirty — each suite needs its own credentials, tools, or a verdict on its value.
  a sweep through them in this diff would bury the nudge change under unrelated suites.
- **confidence:** 70% — the stone's own words say "fix it anyway"; the wisher may want some done here.
- **where:** the paths above.
- **verdict:** 2026-09-28, wisher: defer as dreamed.
