# F11: the route's tool-written records stay out of the commit

## .the fork
- **a.** commit the route's prose (wish, vision, catalog, yields, fulcrums, seeds, self reviews, takens) and leave the tool-written records (`.reviews/peer/*.given.*`, `.reviews/peer/*.report.md`, `.route/*`) uncommitted
- **b.** commit every route file, as 584 tracked files in other routes show was the habit
- **c.** mask the clock stamps inside the tool-written records, then commit all

## .taken
**a.** the worktree's `.husky/check.timestamps.sh` (pre-route drift, F6) now forbids a dash clock (`T<hh>-<mm>-<ss>Z`) in any staged non-`.ts`/`.sh` file, and `pre-commit` sources it. the reviewer tool writes such stamps into every given and report (its log paths), and the route engine writes them into `.route/approvals.jsonl`. so (b) cannot pass the hook this commit runs. (c) edits a peer's record and a sealed file (`.route/` refuses access) to pass a hook — a workaround of the cause, which is the tool's own output. the prose i author is masked (`[timestamp]`) and commits whole; each `.taken` cites its reviewer's points in its own words, so the record of what was raised and answered ships.

## .rework
clean: a later commit adds the records once the hook and the tool agree (the tool masks its log stamps, or the practice exempts tool records).

## .confidence
70%. the wisher may want the full audit trail in git; the block is the drifted hook, which F6 leaves to a human call.

## .where
`.behavior/v2026_11_22.fix-repo-test-jest-cap-4/.reviews/peer/`, `.route/`; dream `dreams/v2026_11_22.reseed.review-records-mask-log-stamps.md`.

## .verdict
awaits wisher review.
