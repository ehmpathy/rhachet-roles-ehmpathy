# F19 — three conditional skips outside this pr's diff stay out of it

## .the fork

the 5.3 zero-skips scan, run repo-wide, found three conditional skips in suites this pr never
touches:

- `git.repo.test/git.repo.test.play.integration.test.ts:2316, 2376` — `given.skipIf(!!process.env.CI)`
  (real npm and keyrack calls that can hang ci on an npx prompt)
- `cicd.deflake/detect.integration.test.ts:157` — `then.runIf(isGhAuthenticated)`

options:
- remove them here: run real npm in ci, and throw `ConstraintError` with the unlock hint where gh is
  unauthenticated
- leave them to their own pr, under the dream that already itemizes them

## .taken

leave them. neither fix is safe or clean inside a release-gate pr: the first changes what ci runs
and can hang it; the second turns the deflake suite red in ci, which has no gh login, until the
token is provisioned there. both change suites no reviewer of #1345 would look at. the five test
files this pr touches carry zero skips and zero bypasses. the work is caught:
`.dream/2026_11_04.fix-conditional-skips-in-integration-tests.dream.md` (linked from `dreams/`).

## .rework

dirty for this pr: each needs a ci change (a provisioned tool or token), not only a test edit.

## .confidence

85%. the stone's text asks for zero skips repo-wide; this reads its scope as the deliverable.

## .where

the two files above; the dream file

## .verdict

awaits the commander.
