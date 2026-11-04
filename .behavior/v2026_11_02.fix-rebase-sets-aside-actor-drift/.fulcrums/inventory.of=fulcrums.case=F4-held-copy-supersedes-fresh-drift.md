# F4 — drift returns at a held path while a conflict waits

## .the fork
- (a) `continue` resets the held path to HEAD; the held copy wins at put-back; output names the path
- (b) `continue` refuses, as today, and the clone needs a new flag (`continue --unstaged ignore`)
- (c) the fresh drift wins; the held copy is dropped

## .taken
(a). the clone asked, at `begin`, to keep the pre-rebase state of those paths; the held copy IS that state. (b) re-blocks the clone on the very drift the wish targets. (c) breaks the byte-for-byte promise made at `begin`. an edit at a path NOT held stays a refusal: it is new work, never drift the clone opted to set aside.

## .rework
clean: one branch in `continue`, gated on the held-path list.

## .confidence
75%. the fresh edit is discarded; for the ambient files it regenerates next session, but for a hand-edited held path the human loses that edit. the output names it so the loss is never silent.

## .where
`git.branch.rebase.continue.sh`, ahead of `git rebase --continue`.
