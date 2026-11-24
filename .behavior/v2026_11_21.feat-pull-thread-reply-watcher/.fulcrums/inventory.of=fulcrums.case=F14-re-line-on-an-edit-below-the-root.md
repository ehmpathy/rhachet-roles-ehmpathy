# F14 · an edit below the root carries `re:` too

## .the fork
- (a) `re:` on a follow-up only, as the approved vision line read
- (b) `re:` on any task whose raised comment is not the root: a follow-up, or an edit of a comment below the root

## .taken
(b). the vision line widens to match; the code already did (b).
- `re:` exists so the crew knows which ask a reply belongs to without a click; an edited reply deep in a thread needs that as much as a fresh follow-up
- an edit of the root needs none: its own text is the root line
- found by behavior-intent-coverage (5.1, round 3), which asked for one or the other plus a clamp

## .where
- `WATCH_DIFF_JQ`, `thread_task`: `re:` when `$label != "new"` and the first raised comment is not the root
- clamp: replies case15 (a human edits a follow-up inside an answered thread → `edited`, `re: why a 30 min cap?`, `--key answer-6403`)
- vision: `1.vision.yield.md`, contract line "each section holds"

## .rework
clean. to take (a), the condition becomes `$label == "follow-up"`, and case15 drops one assertion.

## .confidence
90%. a contract line edited after approval; the change narrows no promise, it adds context to one label.

## .verdict
best-guessed; for the foreman at the end.
