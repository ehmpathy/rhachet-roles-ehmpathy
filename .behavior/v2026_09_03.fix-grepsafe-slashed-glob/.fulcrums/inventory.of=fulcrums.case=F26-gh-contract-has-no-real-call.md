# F26 — `git.release` has no real authenticated `gh` call

- **rework**: clean — deferred to a dream, no code owed here
- **status**: ✅ **out of scope.** the wish is grepsafe; `git.release` needs no GitHub token for it
- **raised**: `5.3.verification`, by `r003` (mech-external-contracts) and `r004`
  (ergo-acceptance-journey-coverage). the verification guard binds `src/**/*`, so those lanes graded
  the `git.release` test files this branch also touched
- **where**: the `git.release` corpus

## .the gap

every `gh` call in the `git.release` integration suites is mocked. three mock surfaces serve them:
the shared `mockGh.ts` (12 suites) and bespoke mocks in `p2` and `p4`. a field rename on `pr list`,
`pr view`, `run list`, or `run view` would ship green.

## .what landed on this branch

one real-boundary test for the **creds-absent** case, no credential needed:

- `git.release.p8.creds_absent.real_boundary.integration.test.ts` — a real `gh` on PATH, no mock, no
  credential. it proves a failed query fails loud and never reads as *"no open branch pr"*
- `get_pr_for_branch` (`git.release.operations.sh`) captures the `gh pr list` exit code. before, a
  dead credential rendered as *"no open branch pr"*
- `mockGh.ts` tells *"ran, no rows"* apart from *"failed"* via `jq 'has($key)'`

## .what is deferred

the shape-drift test needs an authenticated call. that needs a read-only token in the `test`
keyrack env and `GH_TOKEN` in `.github/workflows/.test.yml`. neither belongs to a grepsafe fix.

## .the caught dream

`.dream/2026_09_26.add-real-gh-contract-test-for-git-release.dream.md`

## .the verdict

✅ out of scope for this route, per the wisher on 2026-09-27: *"what does grepsafe have to do with gh
tokens? you dont need those for this route"*.
