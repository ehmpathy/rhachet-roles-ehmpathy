# F8 · review comments are tracked by the ids seen, not by the max id

## .the fork
- (a) keep the cursor `reviewCommentIdMax`: a comment raises once its id exceeds the max seen
- (b) a set `reviewCommentIdsSeen`, the shape `checkRunIdsSeen` already has (`git.pull.watch.daemon.sh:192,217`); a comment raises the first read its id is absent from the set. the prime tick's freshness gate reads the review's `submitted_at`, not the comment's `created_at`

## .taken
(b). a comment in a draft review (github's "start a review") gets its id and its `created_at` when drafted, and reaches the api only when the review is submitted. on #1143 the commander drafted 8 comments over 12 minutes in review `5646610469` and submitted it 6 minutes after the last. under (a), any newer comment read in that gap — a crew reply on another thread, a bot — moves the max past all 8, and none ever raises. under (a), a watch set mid-draft also drops the drafts at prime, since their `created_at` sits before `setAt`.

## .rework
clean. one cursor field and one gate in `WATCH_DIFF_JQ`; a record that holds only the old max reads it as "every id at or below the max is seen" on its first tick, then carries the set.

## .confidence
80%. the set grows with the pr; on #1222 it would hold 30 ids. a pr of thousands of comments costs a larger record, not a wrong alert.

## .where
`1.vision.experience.case=8.draft-review-lands-late.md` · `1.vision.yield.md` § the contract · § pushback footnote

## .verdict
open — for the wisher at vision review.
