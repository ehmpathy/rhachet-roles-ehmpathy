# F18 · extant daemon paths carry unchanged: the read cadence and the hold on a fault

## .the fork
- (a) reshape the extant cadence and fault paths in this pr: test review-comment latency on a quiet pr; on a render fault, queue a plain fallback alert and advance the cursors
- (b) keep both as the daemon already runs them, and state how the reply task rides them

## .taken
(b).
- cadence: a new or edited review comment changes the cadence print (`[.id, body length, updated_at]`), the same mechanism a new issue comment rides, which the extant lifecycle suite clamps for the quiet gap. the vision states the bound: "one tick (60s) while the pr moves, at most 30 min once quiet"
- fault: a render fault holds the cursors and logs, exactly as the extant `diff failed` path does; a hold re-tries each tick and loses no task. a fallback that advances the cursors would trade a stall for a lost task text
- no input the diff can produce makes the render fault (both knobs that reach `jq --argjson` fall back to a whole number), so a clamp needs a stub `jq` that breaks every other read

## .the counter-argument, stated fairly
the l3 lanes (5.1, round 4): a deterministic render fault would silence every alert on its pr with only `daemon.log` as the trace; and the quiet-pr latency for a review thread has no test of its own.

## .applies to
enroll-impl-behavior-intent blocker.8, blocker.11 · enroll-impl-arch-defects nitpick (render fault)

## .rework
clean. a fallback alert is one branch in `set_watch_alert_for_record`.

## .confidence
80%.

## .verdict
open — for the council.
