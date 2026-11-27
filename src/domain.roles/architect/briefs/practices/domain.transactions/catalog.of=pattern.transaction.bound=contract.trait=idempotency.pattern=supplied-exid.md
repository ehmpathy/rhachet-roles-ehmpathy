# catalog.of=pattern.transaction.bound=contract.trait=idempotency.pattern=supplied-exid

a member of `catalog.of=pattern.transaction._` · bound `contract` · trait `idempotency` · verdict `require` · tier `root`.

## .keeps

a create retried across a contract lands on one record.

## .the move

the caller supplies the exid — the id the entity carries in the world outside this storage — before it calls; the create becomes a findsert by that exid.

## .in our tools

the exid is a unique key on the domain object (`static unique = ['exid']`), so the dao's findsert dedupes on it (`pattern=unique-constraint-on-natural-key`). where no natural exid exists, the caller mints one and keeps it across retries: then it is an idempotency key (`pattern=idempotency-key`).

## .the failure it prevents

a timeout after a successful create, then a retry, then two records.

## .source

> "Each entity has a unique identifier or key … Somehow, it must uniquely identify exactly one entity and the data it contains." — helland 2016, "life beyond distributed transactions", acm queue 14(5), doi:10.1145/3012426.3025012 ✅

## .see also

- `rule.require.supplied-exids` — the rule that enforces this member
