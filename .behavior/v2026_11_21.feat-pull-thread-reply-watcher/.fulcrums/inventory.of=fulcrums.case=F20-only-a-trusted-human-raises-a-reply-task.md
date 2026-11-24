# F20 · only a human the repo trusts raises a reply task

## .the fork
- (a) any human raises a reply task, as the vision first assumed
- (b) only a human whose `author_association` is OWNER, MEMBER, or COLLABORATOR raises one; any other human keeps today's one-line `comment.new … review comment`

## .taken
(b).
- a reply task hands up to 2000 chars of a comment, whole and multi-line, to the crew as work, framed "reply first, then resume". on a public repo a drive-by comment would become agent input; today it reaches the crew as a 120-char excerpt and a read command
- the commander the wish names is a repo member, so the wish is met in full. read live from `pulls/:n/comments`: on #1222 and #1143 every commander row reads `author_association: MEMBER`; the crew's shared login `ehm-seaturtle` reads `MEMBER`, and its app login `ehm-a-seaturtle[bot]` reads `CONTRIBUTOR` (an answerer by ledger, so the gate never judges it)
- github reports `CONTRIBUTOR` for an org member whose membership is private; that member would get the one-line alert, no task. not the commander's case today; the set is the foreman's to widen
- the gate fails closed: a row with no association reads as untrusted
- no extant alert is lost: an untrusted human keeps exactly the alert main gives
- found by the l3 behavior-intent lane (5.1, round 5), graded urgent

## .where
- `WATCH_DIFF_JQ`: `is_trusted`; `$asks` and `$edits` in `thread_task` require it; `$reviewCommentNew` takes the untrusted human
- clamp: replies case17 (a `NONE` author keeps `comment.new`, its second line absent); red with the gate removed, green restored
- vision: the "raised by" line, the assumptions, the mental-model table; inventory row T7

## .rework
clean. to take (a), drop `is_trusted` from two selects and one clause.

## .confidence
85%. a scope change after approval, toward safety; the wisher may want CONTRIBUTOR in the set.

## .verdict
best-guessed; for the foreman at the end.
