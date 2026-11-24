# F9 · a human's edit raises a reply task

## .the fork
- (a) edits raise naught: ids key the diff, and the url opens the current text
- (b) the seen state holds a body hash per comment; a human comment whose hash moved raises one reply task, labeled `edited`, with the current text
- (c) as (b), but only where the edit lands after the crew's last answer in that thread

## .taken
(b). under (a), an edit that adds an ask after the crew answered is a silent drop: the thread reads answered and the id is old. the peer review of this vision named that cell a blocker, and it is right. (c) misses an edit made after the task went out but before the crew answered: the crew would then answer the stale text the alert carried. (b) covers both. the cost is one read per typo fix on a human comment.

## .rework
clean. the hash rides the same seen state F8 adds; the label is one more value beside `new` and `follow-up`.

## .confidence
70%. no read on hand shows how often the commander edits rather than replies; all 30 review comment rows on #1222 show `updated_at` within 1 s of `created_at`, so no edits there.

## .where
`1.vision.experience.case=9.edit-adds-an-ask.md` · `1.vision.experience.case=_.md` rows E1, E3

## .verdict
open — for the wisher at vision review.
