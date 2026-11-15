# F5 — on refusal, disable an automerge an earlier run left on

## .the fork
- (a) refuse and exit 2; leave any extant automerge as is
- (b) refuse, and if the pr already has automerge on, disable it (`gh pr merge --disable-auto`)
  before exit 2

## .taken
(b). a pr whose automerge an earlier run enabled will merge server-side the moment checks pass,
on a repo with no review rule (sdk-aws-lambda #79 had none: `reviewDecision: ""`). (a) would print
a refusal while the merge still lands — the refusal would lie, and "naught merged" would fail.
(b) is idempotent: disable on a pr with no automerge is skipped.

## .rework
clean: one guarded call inside the refusal path.

## .confidence
85%. it mutates the pr from a path whose job is to refuse; a reviewer may prefer a loud notice
over the mutation. frequency is low (prs open before this change ships).

## .where
the refusal branch of the review gate.

## .verdict
awaits the commander.
