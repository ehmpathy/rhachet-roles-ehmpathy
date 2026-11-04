# F1 — what `--unstaged include` does on a rebase

## .the fork
the wish asks for `--unstaged ignore|include`, the shape `git.commit.set` has. there, `include` stages the edits into the commit. a rebase replays commits that already exist; it has no commit of its own to fold edits into. options:
- (a) `include` refuses, with the cure: `rhx git.commit.set --unstaged include`, then rebase
- (b) `include` commits the edits atop the branch, then rebases (needs a message; spends a use)
- (c) `include` carries the edits forward as a 3-way patch onto the new base, where `ignore` puts back raw bytes

## .taken
(a). the flag parses and validates as `ignore|include`, so the shape matches `git.commit.set`; `include` then fails fast and names the paved path. (b) hides a commit inside a rebase. (c) is real work with no stated need.

## .rework
clean: one branch in `begin`; no caller hardened against it.

## .confidence
60%. the wish names `include` without a stated behavior; the wisher may want (c).

## .where
`git.branch.rebase.begin.sh`, the `--unstaged` parse + guard.
