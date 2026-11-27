# catalog.of=pattern.transaction.bound=contract.trait=atomicity.pattern=transactional-outbox

a member of `catalog.of=pattern.transaction._` · bound `contract` · trait `atomicity` · verdict `require` · tier `root`.

## .keeps

no change without its event; no event without its change.

## .require when

a write must emit an event that other services act on.

## .the move

write the event record in the same transaction as the change; a relay reads the outbox and publishes. consumers are `pattern=idempotent-consumer`, since the relay can publish twice.

an async task is the same move, with the follow-on work in place of the event (`pattern=async-task`).

## .the failure it prevents

a commit with no event (a crash after commit, before publish), or an event for a change that rolled back.

## .source

> "Messages are guaranteed to be sent if and only if the database transaction commits" — richardson, microservices.io, "pattern: transactional outbox" ✅

## .see also

- `rule.require.transactional-outbox` — the rule that enforces this member
