# F15: the worktree's husky practice upgrade rides this commit

## .the fork
- **a.** stage the five `.husky` files of the worktree's practice upgrade (`check.timestamps.sh`, `check.timestamps.lock.sh`, `check.secrets.sh`, `pre-commit`, `check.nvm.sh`) with this route's commit
- **b.** leave them out (F6), and ask the human to commit or revert the upgrade first

## .taken
**a.** The upgrade predates this route, but its own lock (`check.timestamps.lock.sh`) refuses every commit from this worktree until the upgraded `check.timestamps.sh` sits in the index. The lock names a practice upgrade as the only sanctioned change, so a revert of a human's uncommitted work is no option for a driver. The five files are self-contained shell hooks: no dependency on the `package.json` drift, which stays out. They run only on a local commit. The commit body and the PR name them apart from the cap.

## .rework
clean: `git revert` the husky hunks, or move them to their own PR. Unstage is not paved here, so a split commit was not reachable.

## .confidence
80%.

## .where
`.husky/`.

## .verdict
awaits wisher review.
