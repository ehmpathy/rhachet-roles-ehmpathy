# rule.require.transactional-outbox

## .what

when a write must emit an event that other services act on, write the event record in the same transaction as the change. a relay reads the outbox and publishes. no change without its event; no event without its change.

## .the smell

```ts
// 👎 the commit and the publish are two acts: a crash between them drops the event
await setLessonReservation({ reservation }, context);
await sdkSqs.emit({ event: new LessonConfirmedEvent({ reservation }) });
```

the tells:

- a publish to a queue or bus right after a commit, outside the transaction
- a publish before the commit, so a rollback leaves an event for a change that never landed
- a "republish missed events" job

## .the cure

- write the event record in the outbox table, in the same transaction as the change
- a relay reads the outbox and publishes
- the relay can publish twice, so every consumer is idempotent (`rule.require.idempotent-consumers`)
- an async task is the same move, with the follow-on work in place of the event (`rule.require.async-tasks`)

> "Messages are guaranteed to be sent if and only if the database transaction commits" — richardson, microservices.io, "pattern: transactional outbox" ✅

## .enforcement

- an event that peers act on, published outside the transaction of its change = **blocker**. harm: a crash after commit drops the event, so peers never react; or a rollback after publish leaves peers to act on a change that never happened

## .see also

- `catalog.of=pattern.transaction.bound=contract.trait=atomicity.pattern=transactional-outbox` — the member, in full
- `rule.require.idempotent-consumers` — what each consumer of the outbox owes
- `catalog.of=pattern.event._` — what the event says and carries
