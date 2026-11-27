# catalog.of=pattern.transaction.bound=contract.trait=idempotency.pattern=idempotent-consumer

a member of `catalog.of=pattern.transaction._` · bound `contract` · trait `idempotency` · verdict `require` · tier `root`.

## .keeps

a redelivered message acts once.

## .the move

record each handled message id, in the same transaction as the effect; skip a repeat. queues deliver at least once, so every consumer meets a repeat.

## .in our tools

the handler's effect is itself idempotent where it can be (`rule.require.idempotent-operations`); the message-id record covers the effects that cannot be.

## .the failure it prevents

a retried sqs message charges a card twice, or sends a second confirmation.

## .source

> "To ensure idempotence (i.e., guarantee that the processing of retried messages is harmless), the recipient entity is typically designed to remember that the message has been processed." — helland 2016, "life beyond distributed transactions", acm queue 14(5), doi:10.1145/3012426.3025012 ✅

> "Make a consumer idempotent by having it record the IDs of processed messages in the database." — richardson, microservices.io, "pattern: idempotent consumer" ✅

## .see also

- `rule.require.idempotent-consumers` — the rule that enforces this member
