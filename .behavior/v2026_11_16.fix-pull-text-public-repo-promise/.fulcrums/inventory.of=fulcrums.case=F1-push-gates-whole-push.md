# fulcrum F1: git.commit.push gates the whole push

## .the fork
- (a) gate only the `pr create` step: the commit pushes, the pr waits for the promise
- (b) gate the whole apply, before `git push`: no commit and no pr reach a public repo without the promise

## .taken
(b). the pr title is the commit header and the pr body is the commit body (`git.commit.push.sh:437-441`). a push publishes that text before any pr opens. (a) would hold the pr while its own text already sits public in the commit log. the gate guards the first publication, so it sits before the push.

cost: every push into a public repo needs the promise, also a push onto a pr that already exists. that push still publishes new commit messages, so the cost buys the same guard.

second cost: push's "a keyrack outage never strands a commit" invariant weakens. an unpromised push must read visibility before `git push`, and under `as-ehmpath` that read needs the token; in an outage the read fails and holds as public, also for a private repo. the escape is one rerun with the promise (a private repo accepts it; it skips the read). (a) keeps the invariant whole.

## .rework
clean: move one call from before `git push` to before `pr create`. no caller, contract, or snapshot shape changes beyond where the nudge fires.

## .confidence
60%. the issue scopes "pr text"; (b) reads that scope through the commit, which the issue does not name. and (b) weakens push's outage invariant, where (a) keeps it whole.

## .where
`git.commit.push.sh` apply path, before `git push origin HEAD`.

## .verdict
ruled by the human, 2026-11-18: (b) holds. commit messages are public text too (seed S1).
