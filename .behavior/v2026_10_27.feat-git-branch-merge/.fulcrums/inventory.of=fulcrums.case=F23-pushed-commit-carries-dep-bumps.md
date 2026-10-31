# F23 — pushed commit 2259f19 carries routine dependency bumps

- **fork**: (a) split the bumps and the `settings.of.repo.json` regeneration out of 2259f19; (b) leave the pushed history whole and name the bumps in the PR body
- **taken**: (b). 2259f19 is pushed to #1205; a split rewrites pushed history and needs a force push, which the director ruled out (F1, seed S1). the bumps are the routine kind `rule.require.git-release-confidence` lets ride along
- **rework**: clean. the PR body names them; a squash merge at release folds them either way
- **risk**: low. a revert of the verb would also revert the bumps; the PR body names that
- **confidence**: 85%
- **where**: i005 r011 nitpick.7
- **verdict**: taken by the driver
