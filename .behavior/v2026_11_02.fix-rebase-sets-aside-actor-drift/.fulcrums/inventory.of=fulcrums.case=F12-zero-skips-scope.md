# F12 — the zero-skips sweep: this skill, or the whole repo

## .the fork
- (a) clear every skip in the `git.branch.rebase` skill (the code this pr touches); catch the rest of the repo as a dream
- (b) clear every skip in the repo

## .taken
(a). the rebase skill's five `then.runIf` guards are gone: each test runs and fails fast with a `ConstraintError` where its package manager is absent, and the ci integration job now installs pnpm (the ubuntu runner ships yarn, not pnpm, so the pnpm cases skipped in ci until now). the rest of the repo holds 16 skips in other skills: 13 are the kernelize, librarian, and evals suites, skipped by a merged decision (#1038) because they move to `rhachet-roles-bhrain`; 3 are `git.repo.test` (`skipIf(CI)`) and `cicd.deflake` (`runIf` on gh auth). each needs its own owner's call; a sweep here would ride an unrelated change. dream: `.dream/v2026_11_02.fix.repo-wide-test-skips.md`.

## .rework
clean: (b) is additive; no work here would be undone.

## .confidence
85%. the gate's text ("zero skips") reads repo-wide; the bound of "this pr" reads to the wish.

## .where
`src/domain.roles/mechanic/skills/git.branch.rebase/git.branch.rebase.lock.integration.test.ts`, `.github/workflows/.test.yml`.
