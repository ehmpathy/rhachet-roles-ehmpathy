# F2 — where set-aside copies live

## .the fork
- (a) `$(git rev-parse --git-dir)/git.branch.rebase.aside/` — per worktree, outside the tree, survives between `begin` and `continue`
- (b) a dir under the repo tree (e.g. `.temp/`) — visible to `git status` unless ignored; shared by worktrees only if absolute
- (c) os temp dir — lost on reboot mid-conflict; forbidden by the tmp-write hook

## .taken
(a). `git rev-parse --git-dir` resolves to `.git/worktrees/<name>` inside a worktree, so no two worktrees share a store. git ignores unknown dirs in the git dir. copies use `cp -a`-equivalent semantics, so a symlink stays a symlink (never followed).

## .rework
clean: one path constant in `git.branch.rebase.operations.sh`.

## .confidence
90%.
