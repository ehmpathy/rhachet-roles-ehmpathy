# rule.require.idempotent-consumers

## .what

every message consumer acts once per message. record each handled message id in the same transaction as the effect, and skip a repeat. queues deliver at least once, so every consumer meets a repeat.

## .the smell

```ts
// 👎 a redelivered message charges the card a second time
const onLessonConfirmed = async ({ event }, context) => {
  await sdkStripe.chargeCard({ surfer: event.surfer, price: event.price });
};
```

the tells:

- a handler whose effect is not idempotent, with no record of handled message ids
- a handled-id record written in a separate transaction from the effect
- a handler that assumes exactly-once delivery

## .the cure

- make the handler's effect itself idempotent where it can be (`rule.require.idempotent-operations`)
- for the effects that cannot be, record the message id with the effect, in one transaction; skip an id already recorded

> "Make a consumer idempotent by having it record the IDs of processed messages in the database." — richardson, microservices.io, "pattern: idempotent consumer" ✅

## .enforcement

- a consumer whose effect is not idempotent, with no handled-id record = **blocker**. harm: a retried sqs message charges a card twice, or sends a second confirmation
- a handled-id record written outside the transaction of the effect = **blocker**. harm: a crash between the two acts once, then again

## .see also

- `catalog.of=pattern.transaction.bound=contract.trait=idempotency.pattern=idempotent-consumer` — the member, in full
- `rule.require.transactional-outbox` — the relay that may publish twice
- `rule.forbid.order-dependent-consumers` — the other half of a consumer's contract: no assumed order
