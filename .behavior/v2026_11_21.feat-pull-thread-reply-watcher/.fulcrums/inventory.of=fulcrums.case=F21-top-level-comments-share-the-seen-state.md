# F21 · top-level comments share the seen state

## .the fork
- (a) the top-level path keeps the max-id cursor, as on main; only review comments move to the seen state
- (b) both comment lists read through one seen-state rule (`seen_of`, `is_unseen`, the merge), top-level included

## .taken
(b).
- one rule for both lists: `seen_of`, the legacy fallback, the merge, and the upgrade fix (case11b) apply alike, with no second cursor path to keep in step
- a top-level comment that reaches the api after a newer one was read now raises where main dropped it; that is the F8 defect on the other list, cured for free
- the top-level prints are written and not yet read (no top-level edit alert); they cost a few bytes per comment and are what the Q9 dream needs to detect a top-level edit

## .the counter-argument, stated fairly
the l3 arch-defects lane (5.1, round 6): the wish and F8 name review threads only; the shift of the top-level path is scope the fulcrums did not record, and an unread print map is dead weight.

## .where
- `WATCH_DIFF_JQ`: `$seenIc`, `$issueNew`, `issueCommentsSeen`
- clamps: events case2c (a top-level comment past page one, once), replies case11b (no top-level re-raise on upgrade)

## .rework
clean. to take (a), restore `id > issueCommentIdMax` in `$issueNew` and drop `issueCommentsSeen`.

## .confidence
80%.

## .verdict
open — for the council.
