# F19: the pre-extant CI skip on play [case19] stays this round

- fork: remove [case19]'s `given.skipIf(!!process.env.CI)` now, or keep it and catch a dream
- taken: keep, with the dream `dreams/v2026_11_22.fixup.git-repo-test-play-case19-ci-skip.md`. the case calls a real ehmpath keyrack; whether CI holds one cannot be learned from this box, and a hung CI job would block this wish's release. [case18]'s twin skip was obsolete (that case stops before npm runs) and is removed
- the case runs and passes on every local run (part of the dir's 714)
- rework: clean once CI's keyrack is known
- confidence: 75%
- where: `git.repo.test.play.integration.test.ts` [case19]
- verdict: open
