# seed S1 — one task, one tree, one pr

## .said

> the commander ruled: no pr splits; one task, one tree, one pr. #1020 ships begin + commit and leaves #926 open for get / check / del, the onStop pester, and the upgrade-safe install. that remainder is #926, the task this tree serves: fold it into this branch and #1020, update the body so it closes #926, push, rhx git.release --watch, no --apply. #772 (the hoisted repo path) is its own task and stays apart.

## .settled

- a tree serves one task, and that task ships as one pr; a remainder is never split off to a later pr
- #1020 delivers all of #926: begin, commit, get, check, del, the onStop nudge, and the upgrade-safe install
- the pr body closes #926; #772 (the hoisted repo path) is a separate task and stays open

## .landed

- `src/domain.roles/mechanic/skills/git.package.patch/git.package.patch.get.sh`
- `src/domain.roles/mechanic/skills/git.package.patch/git.package.patch.check.sh`
- `src/domain.roles/mechanic/skills/git.package.patch/git.package.patch.del.sh`
- `src/domain.roles/mechanic/inits/claude.hooks/stop.git-package-patch.sh`
- `.behavior/v2026_10_20.feat-git-package-patch/appendix/pr.1020.body.md`
