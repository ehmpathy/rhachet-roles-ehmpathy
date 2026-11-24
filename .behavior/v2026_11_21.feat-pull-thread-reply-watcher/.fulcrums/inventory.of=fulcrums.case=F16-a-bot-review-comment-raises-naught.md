# F16 · a bot's review comment raises naught, alert included

## .the fork
- (a) a bot's review comment raises no reply task and no alert: "raises naught" read whole
- (b) a bot's review comment raises no reply task, but keeps today's `comment.new … (bot)` alert

## .taken
(a), as the approved vision states it.
- the wish: "a thread already answered, or one by a bot, raises naught"
- the vision's before/after row, approved by the foreman: "a bot's review comment | alerts, labeled `(bot)` | naught"; vision case 3 demos it
- a bot's top-level comment keeps `comment.new`, since top-level is out of this pr's scope (F10); the two surfaces differ on purpose for now

## .the counter-argument, stated fairly
the l3 behavior-intent and arch-defects lanes (5.1, round 4) read "raises naught" as "raises no reply task". at 5.3, the test-intent and acceptance-journey lanes object to the flip of events case2 [t2] itself: an extant test that pinned the `(bot)` alert now asserts its absence, and its snap is gone, while F16 stands unruled. under (a) a lint or security bot's inline note no longer reaches the crew by alert; it still shows on github and in ci. a bot top-level comment still alerts, so the surfaces disagree.

## .where
- `WATCH_DIFF_JQ`: `$reviewCommentNew` keeps only `is_answerer` (a ledger-proven peer clone)
- clamps: replies case3 [t0]; events case2 [t2], whose seen map holds the bot comment's id, so "naught" is a choice the read made, not a read that never ran

## .rework
clean. to take (b), add `or is_bot` to the `$reviewCommentNew` select, restore events case2 [t2] from main, and flip replies case3 [t0] to assert a `(bot)` alert.

## .confidence
70%. the wish and the approved vision agree on (a); two reviewers read the wish as (b). the wisher's word settles it.

## .verdict
open — for the foreman at the end.
