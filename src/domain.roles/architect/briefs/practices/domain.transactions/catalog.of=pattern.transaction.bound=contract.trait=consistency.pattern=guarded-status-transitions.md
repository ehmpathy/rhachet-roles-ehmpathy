# catalog.of=pattern.transaction.bound=contract.trait=consistency.pattern=guarded-status-transitions

a member of `catalog.of=pattern.transaction._` · bound `contract` · trait `consistency` · verdict `require` · tier `root`.

## .keeps

a late or repeated message cannot move a status backward or twice; no move skips a legal edge.

## .the move

declare the legal edges. a write moves the status only along one, and only from the status it read: check the from-status of the version read, then write the next version under the database's expected-version guard, so a racer that moved it first is refused (`pattern=optimistic-lock`). a message that arrives out of order finds the status already past its `from`, writes no version, and is skipped.

## .in our tools

the edges are an inventory (`howto.itemize-constraints._`); each forbidden edge holds its invariant. the guarded write is the one path that changes the status. an async task's own lifecycle is the same pattern (`QUEUED → ATTEMPTED → FULFILLED · FAILED · CANCELED`, `pattern=async-task`).

## .the failure it prevents

a late `PaymentAuthorizedEvent` message moves a canceled reservation back to `TENTATIVE`; a lesson confirmed twice; a refund on an uncharged order.

## .source

none cited: this member is our practice. its write is `pattern=optimistic-lock` behind a from-status check, so that member's source backs the mechanism

## .see also

- `rule.require.guarded-status-transitions` — the rule that enforces this member
