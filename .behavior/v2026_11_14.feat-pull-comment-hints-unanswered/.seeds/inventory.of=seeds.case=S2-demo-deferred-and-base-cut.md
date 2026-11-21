# S2 — the real-pr demo defers past the commander review; #1340 holds the base layer alone

## .said
director ruling on your 5.1 blocker: option 2. the real-pr demo is deferred to a follow-up, on the record: the commander review of #1340 is itself the real comment that demo needs, so the demo lands after his review, not before. amend your wish .done to say so (the clamp tests carry the proof today), answer the behavior-intent-coverage blocker with that ruling, and re-arrive; stone approval stays the commander own, never mine. second outcome, from the review-size bar: #1340 reads about 41 min of review (bar 30). cut it so #1340 holds the base layer alone, green, and the upper layer waits on its own branch, opened against main once the base merges. pr plus --watch green; no --apply.

## .settled
- the real-pr demo is deferred to a follow-up: it lands after the commander's review of #1340, whose comments are the real ones the demo needs
- the clamp tests carry the proof until then
- the wish `.done` is amended to say so
- stone approval belongs to the commander, never the director
- review-size bar: 30 min. #1340 read at ~41 min
- #1340 holds the base layer alone: the shared read plus the `get --unanswered` rule, green
- the upper layer (the `set` hint) waits on its own branch, and opens against main once the base merges
- release: pr plus `--watch` green; never `--apply`

## .landed
| where | what |
|---|---|
| `0.wish.md` | `.done` amended: demo deferred past the commander review; clamps carry the proof |
| `.reviews/peer/…i002…r008._.taken.by_self.behavior-intent-coverage.md` | answered with the director's call |
| pr #1340 | cut to the base layer |
| branch `beav/feat-pull-comment-hints-unanswered.upper` | holds the upper layer, unpushed until the base merges |
