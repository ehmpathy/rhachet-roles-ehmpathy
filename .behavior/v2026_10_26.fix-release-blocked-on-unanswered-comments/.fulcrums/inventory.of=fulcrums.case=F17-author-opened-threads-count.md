# F17 — a thread the pr author opened counts, same as a reviewer's

## the fork
- **a.** any human latest comment that is unsigned and not marked done waits, whoever opened the thread
- **b.** skip threads and issue comments the pr author opened (the wish: "a thread whose only comment is the reviewer's own")

## taken: a, and why at the time
the gate never learns who the pr author is today; b needs one more read (`gh pr view --json author`) and a rule input, and the driver who opens a self-note is usually the robot, whose comments are 🐢-signed and already pass. a human driver's own note on their own pr blocks until they sign it or mark it done — loud, cheap to clear, never a silent pass. b risks the opposite error: a co-author who opens a real ask on the author's behalf would slip through.

## rework: clean
one read and one jq clause in `as_rows_unanswered`; no caller builds on it.

## confidence: 70%, and why it is low
the wish's words ("the reviewer's own") lean toward b. the bot filter keys on the `[bot]` login suffix, not `user.type`, so a reviewer bot with a plain login also blocks — same family of call.

## where
`git.pull.comment.rows.sh` (`as_rows_unanswered`)

## verdict
open
