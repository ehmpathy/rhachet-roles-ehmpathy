# catalog.of=pattern.transaction.bound=storage.trait=isolation.pattern=double-entry-ledger

a member of `catalog.of=pattern.transaction._` · bound `storage` · trait `isolation` · verdict `require` · tier `leaf`.

## .keeps

every balance equals the sum of its entries; every entry has an equal and opposite twin.

## .require when

a repo moves or holds money.

## .the move

never update a balance in place. append entries in balanced pairs, in one transaction; a balance is a read over the entries. two writers append, so neither can erase the other: no read-modify-write is left to race. amounts are `IsoPrice` (`rule.forbid.any-price`, mechanic).

## .the failure it prevents

a balance that drifts from its history, with no trail to show where; a lost update on a hot balance.

## .source

> "every financial transaction is recorded with equal and opposite entries (debits and credits)" — wikipedia, "double-entry bookkeeping" ☑️ (secondary; it credits pacioli 1494 with the first published codification)

## .see also

- `rule.require.double-entry-ledger` — the rule that enforces this member
