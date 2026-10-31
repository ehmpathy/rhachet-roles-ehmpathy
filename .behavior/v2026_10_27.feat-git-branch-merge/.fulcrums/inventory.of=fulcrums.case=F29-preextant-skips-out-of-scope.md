# F29 — skips that predate this route stay out of this PR

- **fork**: 5.3 says fix every skip, prior ones too. the repo holds 13 `describe.skip` / `when.skip` suites (librarian, kernelize, evals), two `given.skipIf(CI)` in `git.repo.test.play`, and `then.runIf` on gh auth and on pnpm/yarn presence (`cicd.deflake`, rebase lock). none is in this route's diff. (a) defer to a dream; (b) fix each in this PR
- **taken**: (a). the suites belong to other roles, several need paid brain calls, and the rebase lock `runIf` is rebase-twin debt the director ruled out (C4). this route's own suites (catchup, git.commit) hold zero skips
- **rework**: clean. each fix lands in its own PR with no tie to this one
- **risk**: low. the skips hide coverage of other skills, never of catchup or git.commit
- **confidence**: 80%
- **where**: 5.3 zero-skips scan; dream `.dream/v2026_10_30.fix.repo-wide-test-skips.md`
- **verdict**: ruled out of scope by the director (seed S8): the 134 skips are pre-extant, on main, in other roles' suites; they stay, the yield notes it, and a cheap unskip becomes a dream
