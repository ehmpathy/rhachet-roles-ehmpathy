# S3: set the husky upgrade aside for the commit, then restore it

## .said
Set aside, then restore (Recommended)

## .settled
the uncommitted husky upgrade's pre-commit gate refuses any commit whose index lacks the upgraded `.husky/check.timestamps.sh`. the driver sets the upgrade's hooks aside (changed hooks back to main, new hooks moved out), commits this route's paths under main's hooks, then restores the upgrade into the worktree. the upgrade never rides this pr; F4 holds.

## .landed
- F4: the upgrade stays out of the commit
