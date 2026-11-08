# F24: the extant conditional skips defer to a dream

## the fork

the 5.3 zero-skips scan found conditional skips in three suites this pr does not touch:

- `git.branch.rebase/git.branch.rebase.lock.integration.test.ts` — five `then.runIf(isPnpmAvailable | isYarnAvailable)`
- `cicd.deflake/detect.integration.test.ts:157` — `then.runIf(isGhAuthenticated)`
- `git.repo.test/git.repo.test.play.integration.test.ts:2316,2376` — `given.skipIf(!!process.env.CI)`

and the full integration run (`what=integration/2026-11-04T09-09-01Z`) reported 5 suites, 105
tests skipped: unconditional `describe.skip` in the librarian's `brief.compress` and
`brief.condense` suites (paid brain calls, snapshots of brain prose, an xAI safety misfire).

(a) remove them in this pr · (b) defer to a dream, with this record

## taken: (b), and why at the time

- the stone's mandate is "gaps get fixed", and the safe/clean test grades the fix. it fails CLEAN
- this host has pnpm, yarn and gh, so every one of these runs here. in ci, `.github/workflows/.install.yml`
  sets up pnpm only on a cache miss in the install job, so the test job most likely lacks pnpm and
  yarn and the rebase.lock cases skip there
- the honest cure is a ci change: install pnpm and yarn in the test job, then turn each `runIf` into
  a fail-fast `ConstraintError`. a fake pnpm would fake the very tool the lock-regen test exercises.
  the workflow files are likely declapract-managed, and the change lands in three domains plus ci
- none of the three suites is in this pr's diff; the cutover and uses suites hold zero skips

- the librarian skips belong to another role, and each cure needs paid brain runs to prove

## rework: dirty

a workflow change plus suites in four domains, one owned by the librarian, outside the pr's bounded
scope.

## confidence: 75%, and why it is low

`.github/workflows/.test.yml`'s test jobs run `actions/setup-node` and a cache restore, with no
pnpm or yarn step. but the hosted runner image may ship both on its own, which I cannot see from
here. if it does, the rebase.lock cure is a plain swap of `runIf` for a fail-fast guard, a clean fix
this pr could carry; the first ci run's rebase.lock log tells which.

## where

`.dream/2026_11_04.fix-conditional-skips-in-integration-tests.dream.md` (linked from `dreams/`)

## verdict

open — for the council.
