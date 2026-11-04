# F5 — a fresh edit at a path not held, while a conflict waits

## .the fork
- (a) `continue` and `abort` refuse, name the path, and accept `--unstaged ignore` to add the fresh edit to the store
- (b) `continue` and `abort` silently add every fresh unstaged edit to the store
- (c) `continue` refuses as today with no cure; `abort` lets `git rebase --abort` do what it does

## .taken
(a). the skill cannot tell drift from deliberate work at a path it never held, so the clone decides, by a flag, as at `begin`. one flag shape across all three commands. (b) hides a decision the clone made nowhere. (c) strands the clone mid-conflict and may let abort discard a tracked edit.

## .rework
clean: one guard + one flag in `continue` and `abort`, both via the shared set-aside operation.

## .confidence
80%. it widens the wish's flag to two more commands; the wish names `begin` only, but also requires that `continue` and `abort` put back, and they cannot put back a path they never held.

## .where
`git.branch.rebase.continue.sh`, `git.branch.rebase.abort.sh`, ahead of the git call.
