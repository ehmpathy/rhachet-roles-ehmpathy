# rule.require.replayable-fact-streams

## .what

every published fact is kept, append-only, forever, as a formal data product: trusted, versioned, replayable. a consumer whose reaction had a defect fixes its code, replays the stream, and repairs its own records, forward.

## .the smell

```ts
// 👎 the relay deletes each fact once it is sent
await sdkQueue.emit({ event });
await context.daoOutbox.del({ event });
```

three weeks later, payments finds its refund policy rounded wrong. the facts it misread are gone, so the defect cannot be repaired.

the tells:

- a published fact with no permanent copy: outbox records deleted on relay, and the only other copy expires
- a published fact edited in place
- a reaction with no key derived from the fact, so a replay sends the email or the charge again
- a replay that writes another service's records, or rewinds the stream

## .the cure

1. **keep a permanent copy of every published fact, and never edit one in place** — an archive the stream can be replayed from, such as s3 or an eventbridge archive; the mechanism is the implementer's choice. a transport's own retention — a queue's window — is no violation while the permanent copy exists. a wrong report is overruled by a newer version (`rule.require.corrected-versions`); a world that moved on is answered by a new fact (`rule.require.correction-events`)
2. **facts carry their own values** — a replay reads the amount as it was at the moment, never as it reads now (`rule.require.self-contained-facts`)
3. **a replay applies the latest version of each fact, in any order** — keyed on the unique key and `observedAt`, so the order cannot change the result (`rule.require.latest-version-wins`)
4. **a replay converges** — each reaction is idempotent and keyed on the fact (`pattern=idempotent-consumer`); each external act carries a key derived from the fact and the act, so a replay re-sends no email it already sent (`pattern=idempotency-key`)
5. **a replay repairs only the consumer's own records, forward** — payments replays `LessonCanceledEvent` to fix its refunds; it never rewrites the lesson service's record, and never rewinds the stream (`rule.forbid.retroactive-replay`)

> "Bug fixes occur when you look at past processing and realize it was incorrect. For internal stuff this is really easy to fix, all you need to do is make the fix and reprocess the events." — fowler, "event sourcing", 2005 ✅

## .enforcement

- a published fact with no permanent copy, or edited in place = **blocker** — a consumer defect can never be repaired, since the facts it misread are gone
- a reaction that a replay repeats — a second email, a second charge = **blocker** — the surfer is charged or messaged twice
- a replay that writes another service's records = **blocker** (`rule.forbid.multiple-writers-per-resource`)

## .see also

- `catalog.of=pattern.event.facet=record.pattern=replayable-fact-stream` — the full member, with its sources
- `rule.require.materialized-entities` — the entity the stream concludes
- `rule.forbid.replay-on-read` — a replay is a repair, never a read
- `rule.forbid.retroactive-replay` — a replay never rewinds the stream
