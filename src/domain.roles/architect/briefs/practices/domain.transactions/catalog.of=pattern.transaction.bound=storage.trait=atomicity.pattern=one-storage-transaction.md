# catalog.of=pattern.transaction.bound=storage.trait=atomicity.pattern=one-storage-transaction

a member of `catalog.of=pattern.transaction._` · bound `storage` · trait `atomicity` · verdict `require` · tier `root`.

## .keeps

no half-written aggregate.

## .the move

wrap the write of one aggregate's records in one transaction: it commits whole or rolls back whole. the transaction reaches no wider than that aggregate (`pattern=operation-per-transaction`).

## .in our tools

the entrypoint opens the transaction and passes the connection down via context (`pattern=transaction-at-the-entrypoint`); one business transaction is one domain operation (`pattern=operation-per-transaction`).

## .the failure it prevents

a crash between two writes leaves a parent with no children, or a debit with no credit.

## .source

> "The essential point of a transaction is that it bundles multiple steps into a single, all-or-nothing operation." — postgresql 19 docs, §3.4 "Transactions" ✅

## .see also

- `rule.require.one-storage-transaction` — the rule that enforces this member
