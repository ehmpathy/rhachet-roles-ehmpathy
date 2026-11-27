# catalog.of=pattern.transaction.bound=storage.trait=atomicity.pattern=operation-per-transaction

a member of `catalog.of=pattern.transaction._` · bound `storage` · trait `atomicity` · verdict `require` · tier `root`.

## .keeps

one business transaction, one domain operation: it commits whole, and it changes one resource and the parts it owns.

## .the move

the domain operation that names the business act is the unit of one transaction. it changes one resource and the parts that resource owns. a rule across resources converges after the commit, through a fact and a reaction (`pattern=async-task`), never through a transaction that sprawls across them.

a transaction wider than one aggregate is a smell for a lack of idempotency: make each reaction safe to run twice (`pattern=idempotent-consumer`, `pattern=idempotency-key`), and the wide transaction has no work left to do.

## .in our tools

`LessonReservation` and its one write path `setLessonReservation` (`catalog.of=tactic.abstraction.kind=_.verb=set.tactic=gather`). the operation is an orchestrator (`define.domain-operation-grains`); its leaf operations join its transaction, never open their own.

## .the failure it prevents

a transaction that sprawls across many resources: wide locks, deadlocks, and a rule no single resource owns.

## .source

> "Transactions should not cross aggregate boundaries." — fowler, bliki "DDD_Aggregate" ✅

> "Guarantees of transactional atomicity come only within an entity identified by a unique key." — helland 2016, acm queue 14(5), doi:10.1145/3012426.3025012 ✅

## .see also

- `rule.require.operation-per-transaction` — the rule that enforces this member
