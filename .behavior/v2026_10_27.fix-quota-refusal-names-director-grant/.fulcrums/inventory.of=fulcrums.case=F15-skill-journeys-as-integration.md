# F15: a skill's journey proof is its blackbox integration test, not a new acceptance file

## .the fork
peer r004 (ergo-acceptance-journey-coverage, 5.3 i001, nitpick.1) asks for a
`git.branch.rebase.begin.acceptance.test.ts`, since a cli skill is a user-faced contract.

| option | what it does | cost |
|---|---|---|
| A, add an acceptance file per touched skill | rebase, set, push, release, stage each gain a `.acceptance.test.ts` | five new files that spawn the same shell skill the integration suites already spawn; duplicate proof, a rippled change outside the wish |
| B, keep the repo convention | each skill's `.integration.test.ts` spawns the real `.sh` against a real git repo and, for rebase, a real bare origin, with no mocks of git | the file suffix reads "integration" where the reviewer looks for "acceptance" |

## .taken, why
B. this repo's own brief, `rule.require.jest-tests-for-skills`, names `.integration.test.ts` or
`.acceptance.test.ts` for skills, with the integration form as its pattern. the git.commit,
git.branch.rebase, git.release and git.stage skills all prove themselves that way; the repo holds
skill acceptance files too (`blackbox/git.pull.comment.acceptance.test.ts`), so both forms are
in use, and neither is mandated over the other. the rebase suite is a blackbox run of the shell skill, which is what the
journey rule asks for. the repo's `.acceptance.test.ts` files cover the `rhx` contract, and passed
in this verification (267 tests).

## .rework
clean: a new acceptance file can be added later with no change to any skill or test here.

## .confidence
85%: the rule reads as one or the other; the 15% is whether a reviewer of the journey rule wants
the suffix itself.

## .where
`.reviews/peer/5.3.verification._.review.i001.138f94d7121983a101.r004._.taken.by_self.ergo-acceptance-journey-coverage.md`.

## .verdict
none yet; best-guess B.
