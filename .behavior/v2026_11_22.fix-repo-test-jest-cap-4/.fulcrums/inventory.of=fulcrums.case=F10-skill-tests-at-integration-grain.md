# F10: the worker cap is proven at integration grain, with no new acceptance suite

## .the fork
- **a.** prove the cap in `git.repo.test.*.integration.test.ts`: a blackbox spawn of the skill in a temp repo, real jest where the claim needs it, snapshots of each output
- **b.** add a `git.repo.test.workers.acceptance.test.ts`

## .taken
**a.** the repo rule for skills (`rule.require.jest-tests-for-skills`) names `.integration.test.ts` or `.acceptance.test.ts` as equal homes, and every extant `git.repo.test` suite (8) is integration grain. the workers suite already runs the skill as a black box: fake `npm`/`jest` where the claim is the args, real jest where the claim is the worker pool ([case13], [case14]). an acceptance suite would re-run the same spawn under another name.

## .rework
clean: a rename of the file, or a copy of [case13]/[case14] into a `.acceptance.test.ts`.

## .confidence
85%.

## .where
`src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.workers.integration.test.ts`.

## .verdict
awaits wisher review.
