# F15 · the answer to an edited ask is a fresh comment

## .the fork
- (a) an `edited` task reuses `answer-<id>`, so the crew's answer edits its old one in place
- (b) an `edited` task keys `answer-<id>-e<print>`, so the answer lands as a fresh comment

## .taken
(b).
- a keyed `git.pull.comment set` edits a comment that holds the key; github sends no notice for an edit (community reports: github community discussion #44376, isaacs/github issue #310), so under (a) the human who added the ask never hears the answer
- the print is the edited body's print, so a second edit keys a second fresh answer, and a re-delivered task for the same edit keys the same answer (no twin)
- found by the l3 behavior-intent and arch-defects lanes (5.1, round 4)

## .where
- `WATCH_DIFF_JQ`: `answer_key($seen)` → `keyId`
- clamps: replies case9 [t1] and case15 [t1] assert `--key answer-<id>-e<digits>`
- vision: `1.vision.yield.md`, the reply command line

## .rework
clean. one def; two assertions.

## .the clone tail
every key ends `-c<first 8 of the clone serial>`. two clones that watch one pr each hear a task for one thread; under one app login and one key the second answer would edit the first in place, with no notice. a per-clone key lets each post; a twin reply is visible, a silent overwrite is not (l3 arch-defects, round 6; replies case19).

## .the known gap
three edits that flip a body A → B → A reuse the first key, so that answer edits in place with no notice. rare; a key from `updated_at` would cure it, at the cost of a key that moves on any edit stamp.

## .confidence
90%. the no-notice claim rests on community reports, not a github doc.

## .verdict
best-guessed; for the foreman at the end.
