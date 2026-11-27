# F6 — peer concerns on worktree churn that predates the route: fix here, or leave to its owner

## .fork
the execution peer reviews read `diffs: since-main`, which spans the worktree. this worktree holds edits that predate the route:
- `.husky/*` (`check.timestamps.sh`, `check.nvm.sh`, `pre-commit` modified; `check.secrets.sh`, `check.timestamps.lock.sh` untracked)
- `package.json` (drops `rhachet-artifact-git`, rewrites `prepare:rhachet`), `pnpm-lock.yaml`
- `.gitattributes`, `.gitignore`, `.agent/keyrack.yml`, `.agent/repo=.this/role=any/boot.yml`, `.agent/.actors/*` settings
- deleted `.reviews` of `v2026_05_14.auth-github-app-seaturtle`

the options:
- (a) leave them: this pr never stages them; catch the `.husky` defects as a dream for their owner
- (b) fix or revert them here and ship that in this pr

## .taken
(a). the pr is the path allowlist the route stages: `src/domain.roles/mechanic/skills/git.commit/**`, `src/domain.roles/mechanic/skills/git.branch.uses/**`, `src/domain.roles/mechanic/skills/git.branch.cutover/**`, `src/domain.roles/package.modes.integration.test.ts`, this route dir, and its `.dream/*.dream.md` targets. the branch has no commit on any churn path. CI reads the committed `package.json`, so the dropped dependency and the rewritten `prepare` never reach the build. (b) would revert or ship work whose author is not this route.

## .rework
clean. the files are untouched by this route. the guard edit that ends the over-read (`--paths-wout` per churn path) needs `rhx route.mutate grant allow`, a human lever.

## .confidence 90%
a reviewer could hold that any file in the worktree is the driver's to fix. none of these files reaches the pr, so no defect ships through it.

## .verdict
best-guessed
