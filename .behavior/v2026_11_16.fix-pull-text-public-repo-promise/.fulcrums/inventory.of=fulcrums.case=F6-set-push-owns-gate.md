# fulcrum F6: git.commit.set --push owns its own gate

## .the fork
- (a) set delegates; push's gate fires inside the composed call
- (b) set gates first, before the commit, and passes `--promise` through to push

## .taken
(b). under (a), set apply makes the commit, then push halts; the caller's exact rerun of set then fails on an empty stage, so the nudge would have to name a different command. under (b), set halts before the commit, the nudge names set's own command plus the promise, and that exact rerun works. push keeps its own gate for a standalone call.

## .rework
clean: one gate call in set, one flag passthrough.

## .confidence
85%.

## .where
`git.commit.set.sh`, before the plan tree and before `git commit`, only when `--push`.

## .verdict
open.
