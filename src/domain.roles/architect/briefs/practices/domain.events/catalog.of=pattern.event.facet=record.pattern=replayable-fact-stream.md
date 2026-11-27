# catalog.of=pattern.event.facet=record.pattern=replayable-fact-stream

a member of `catalog.of=pattern.event._` · facet `record` · verdict `require` · tier `root` · rule `rule.require.replayable-fact-streams`.

## .keeps

every published fact is kept, append-only, forever, as a formal data product: trusted, versioned, replayable. a consumer whose reaction had a defect fixes its code, replays the stream, and repairs its own records.

## .require when

every service that publishes facts. the day a consumer finds a defect in how it reacted — a refund policy that rounded wrong for three weeks — the stream is what it replays.

## .the move

1. **the facts are the record; the entity is their conclusion.** the stream holds what happened; the entity holds what is, one read away (`pattern=materialized-entity`). the fact and the change it implies commit in one transaction, so the two cannot disagree (`pattern=transactional-outbox`). when they do, the facts win and the entity is rebuilt
2. **keep a permanent copy of every published fact, and never edit one in place.** an archive the stream can be replayed from — s3, an eventbridge archive; the mechanism is the implementer's choice. a transport's own retention, such as a queue's window, is no violation while the permanent copy exists. a report that was wrong is overruled by a newer version (`pattern=corrected-version`); a world that moved on is answered by a new fact (`pattern=correction-event`)
3. **facts carry their own values.** a replay reads the amount as it was at the moment, never as it reads now (`pattern=self-contained-fact`)
4. **a replay applies the latest version of each fact, in any order.** keyed on the unique key and `observedAt` (`pattern=latest-version-wins`), so the order of the replay cannot change the result
5. **a replay converges.** each reaction is idempotent and keyed on the fact (`pattern=idempotent-consumer`); each external act it causes carries a key derived from the fact and the act, so a replay re-sends no email it already sent (`pattern=idempotency-key`)
6. **a replay repairs only the consumer's own records, forward.** payments replays `LessonCanceledEvent` to fix its refunds; it never rewrites the lesson service's record, and never rewinds the stream (`pattern=retroactive-replay`, forbid)

## .the failure it prevents

a consumer defect that cannot be repaired because the facts it misread are gone; a replay that charges twice; a repair that reads today's values for last month's facts; a stream no one trusts, so every consumer calls back to the owner.

## .source

### converge

> "Bug fixes occur when you look at past processing and realize it was incorrect. For internal stuff this is really easy to fix, all you need to do is make the fix and reprocess the events." — fowler, "event sourcing", 2005 ✅

> "The official system of record can either be the event logs or the current application state. If the current application state is held in a database, then the event logs may only be there for audit and special processing." — same ✅

> "The event log provides a strong audit capability" — fowler, "what do you mean by 'event-driven'?", 2017 ✅

### narrow

fowler's replay rebuilds the whole application from its log. ours replays the stream into a consumer, to repair what that consumer derived, or materializes it once more to rebuild an entity whose transform had a defect; no read path ever replays (`pattern=replay-on-read`, forbid).
