# catalog.of=pattern.transaction.bound=storage.trait=atomicity.pattern=transaction-at-the-entrypoint

a member of `catalog.of=pattern.transaction._` · bound `storage` · trait `atomicity` · verdict `require` · tier `root`.

## .keeps

one transaction per business act: the entrypoint opens it, and every nested call joins it.

## .the move

the entrypoint — the contract handler, the task execute — opens the transaction and passes its connection down through context. inner operations and daos read the connection from context; none opens its own. one scope, one commit, one rollback.

## .in our tools

`(input, context)` with the connection in `context` (`rule.require.input-context-pattern`, `rule.require.dependency-injection`, mechanic). dependencies point inward, so no inner layer can reach out to open a scope of its own (`rule.require.directional-deps`, mechanic).

## .the failure it prevents

an inner dao opens its own transaction and commits early: the outer act then fails, and half of it is already on disk.

## .source

none cited: this member is our practice. the all-or-none unit it scopes is `pattern=one-storage-transaction`, whose source backs the mechanism

## .see also

- `rule.require.transaction-at-the-entrypoint` — the rule that enforces this member
