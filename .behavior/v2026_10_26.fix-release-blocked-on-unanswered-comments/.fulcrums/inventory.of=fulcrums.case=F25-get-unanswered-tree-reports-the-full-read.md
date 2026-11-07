# F25 — `get --unanswered`'s tree reports the full read

## the fork
- A: keep #1143's tree: target `unanswered by <login>`, `counts:` tallies the filtered rows, an empty list prints `(no comments)`
- B: the tree reports the full read: target `#<n>, unanswered`, `counts:` tallies every comment read, a new `unanswered: N` line, an empty list prints `(every comment has an answer)`

## taken: B, and why at the time
- a live walk of #1143 under A printed `(no comments)` and `counts: 0 …` on a pr with 18 comments: the label told the driver the pr had no comments, when each one had an answer. a false statement in the one output the gate's refusal sends the driver to (`read: rhx git.pull.comment get --pr N --unanswered`)
- the login left the target because F10 judges an answer by its signature, not the read login; `unanswered by <login>` named a login the rule no longer reads
- the json shape only gained fields (`path`, `line` on rows that lacked them; `thread`, `answered_before`, `answer_key` were already there); no field was lost
- clamp: pc case23 (each row answered via `set`, then the tree reads `unanswered: 0` / `(every comment has an answer)`), case21 [t1] (the tree), case21 [t0] (the json shape)

## rework: clean
A is a revert of `get.sh`'s count source and two labels, plus a resnap of case21 and case23.

## confidence: 80%, why not higher
it changes output #1143 shipped and a reviewer (r012 i003) reads it as a test-intent change. the intent case21 held — "list what is unanswered" — stands; its labels told a false count.

## where
`git.pull.comment.get.sh` (counts from `ROWS_READ`, the `unanswered:` line, the empty-state line) · r012 blocker.2 (5.3.verification i003)

## verdict
(awaits council)
