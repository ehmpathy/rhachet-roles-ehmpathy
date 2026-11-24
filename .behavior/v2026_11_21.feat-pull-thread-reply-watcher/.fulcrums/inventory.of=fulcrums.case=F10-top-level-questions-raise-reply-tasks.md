# F10 · does a human's top-level comment raise a reply task?

## .the fork
- (a) top-level comments keep today's `comment.new`; reply tasks cover review threads only
- (b) a human top-level comment newer than the crew's last top-level comment raises a reply task, as one thread whose answer is any later crew top-level comment (#1340's issue rule); the reply command is a keyed top-level comment, `--key answer-<id>`, with no `--reply-to`

## .taken
(a). the foreman ruled Q9 out of this pr's scope (`.foreman/verdict.1.vision.md`).
- the wish names review threads; tight scope ships the pr
- the cost of (a) is real and kept on record: 2 of 17 commander comments on #1222 were top-level questions, and the first waited 13.4 h for an answer
- (b)'s known hazard stays unproven: a crew status note reads as the answer to every earlier top-level question

## .where
- `WATCH_DIFF_JQ`: `$issueNew` keeps every non-own top-level comment as `comment.new`, a human's included
- clamp: replies case10 (a human top-level ask keeps `new comment`; beside a reply task it rides its own section)
- follow-up: `.dream/v2026_11_22.feat.top-level-questions-raise-reply-tasks.md`

## .rework
clean. (b) is one select in the diff and one section label; it was built, then backed out, with no caller hardened against either.

## .confidence
90%. the scope call is the foreman's; the 13.4 h stat argues for (b) in a later pr.

## .verdict
ruled — (a), out of scope; (b) caught as a dream.
