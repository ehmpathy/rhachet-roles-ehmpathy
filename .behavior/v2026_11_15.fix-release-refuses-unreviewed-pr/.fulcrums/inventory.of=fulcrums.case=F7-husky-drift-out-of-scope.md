# F7 — husky drift is out of scope for this pr

## .the fork

peer review i001 on 5.1 raised four blockers against `.husky/check.secrets.sh` and
`.husky/check.timestamps.lock.sh` (r2.b2, r6.b1, r6.b2, r7.b1). the reviewers read them because
the guard scope is `since-main` over the worktree, and those two files sit untracked in it.

- fix them here: edit hooks this pr does not ship
- dispute them: they are not in the pr; leave them to whoever owns the drift
- narrow the guard: `--paths-wout '.husky/**'` — needs `rhx route.mutate grant allow`, not held

## .taken

dispute. evidence:

- `git log origin/main..HEAD -- .husky` → empty: no commit of this branch touches `.husky`
- `git status -- .husky` → `?? .husky/check.secrets.sh`, `?? .husky/check.timestamps.lock.sh`,
  plus ` M` on three tracked hooks: an upstream husky practice rollout landed in the worktree,
  not by this route
- every commit of this route writes the HEAD versions of the hooks back first, so the drift
  never enters the pr

## .rework

clean. if the commander wants those hooks fixed, it is a separate pr against the husky practice
(declapract), with no ripple into the review gate.

## .confidence

92%. the residual doubt: a reviewer may hold that every file in the worktree is in scope. the
guard edit (`--paths-wout '.husky/**'`) would settle it for good; it waits on the mutate grant.

## .where

`.husky/check.secrets.sh`, `.husky/check.timestamps.lock.sh` (untracked, local)

## .verdict

awaits the commander.
