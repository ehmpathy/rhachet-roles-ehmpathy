# F09 — the transactional stance

- **the fork**: which patterns the brief teaches, and at what depth.
- **taken**: judge each pattern by whether a common invariant in our repos (postgres or dynamodb, queues, third-party apis) breaks without it. **core (8)**: one-store transaction, unique key, check constraints + foreign keys, version check, guarded state transitions, idempotent consumer, caller-supplied id, aggregate as transaction boundary. **situational (5)**, one line each with its case: row lock, orchestrated saga + compensation, outbox, double-entry ledger, read-your-writes. **drop (14)**: among them lease + fence token, cdc, dead-letter queue, sequence order, two-phase commit, choreographed saga, event source, cqrs, unit of work.
- **why at the time**: the wisher, on the first cut of 19 adopted patterns: *"some of them look like overkill"*. the core rows are the ones a mechanic meets in an ordinary feature; the situational rows each need a named case to earn their cost.
- **rework**: clean.
- **confidence**: 70%. the line between core and situational is a judgment of our repo mix; saga and outbox (T10, T11) are the rows most likely to move up, and T08 (aggregate boundary) the row most likely to move down.
- **where**: `1.vision.inventory.transactional-patterns.md`
- **verdict**: **skepticized (2026-11-23), confident** — the stance holds. evidence: `rhx git.repo.get lines --repos 'ehmpathy/*' --words 'outbox'` finds no transactional outbox in code (prose, an emoji table, and one daemon's file outbox only); a search for saga compensation reached prose only before the skill crashed on a binary match (dream caught). saga and outbox stay situational. 85%
