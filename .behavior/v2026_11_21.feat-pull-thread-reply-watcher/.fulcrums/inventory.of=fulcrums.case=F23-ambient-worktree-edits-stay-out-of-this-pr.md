# F23 · ambient worktree edits stay out of this pr, and out of its fixes

## .the fork
- (a) leave the ambient edits (`.husky/*`, `package.json`, the lockfile, `.agent/.actors/…/.claude/*`, `.agent/repo=.this/role=any/boot.yml`) as they are: unstaged, uncommitted, unfixed by this route
- (b) fix what a reviewer flags in them, since the lanes read the worktree diff since main

## .taken
(a). the foreman's commit scope names these files as never staged; they belong to the box, not to this wish. a fix to a file the pr does not ship ships naught, and edits a file another owner holds.

## .the counter-argument, stated fairly
the lanes read `--diffs since-main`, so a flag on an ambient file re-raises every round and spends the stone's nitpick allowance on work outside it. to leave the flag unanswered by a fix costs a dispute per round.

## .where
- 5.3 lane `repo-rules`: nitpick on `.husky/check.timestamps.sh`, `check.secrets.sh`, `check.timestamps.lock.sh` (stderr-only render)
- the clean cure is a guard scope edit, `--paths-wout '.husky/**'` (and the other ambient paths), which needs `rhx route.mutate grant allow` from a human

## .rework
clean. no code of this route touches these files.

## .confidence
90%. the commit scope is the foreman's word; only the review scope lags it.

## .verdict
open — for the foreman at the end, with the grant ask.
