# rule.require.operation-per-transaction

## .what

one business transaction is one domain operation. it commits whole, and it changes one resource and the parts that resource owns. a rule across resources converges after the commit, through a fact and a reaction — never through a transaction that sprawls across them.

## .the smell

```ts
// 👎 one transaction reaches across three resources: the reservation, the surfer, the instructor roster
await daoLessonReservation.set({ reservation }, context);
await daoSurfer.set({ surfer: { ...surfer, lessonsBooked: surfer.lessonsBooked + 1 } }, context);
await daoInstructorRoster.set({ roster: { ...roster, seatsLeft: roster.seatsLeft - 1 } }, context);
```

the tells:

- one transaction writes two or more resources that each have their own owner
- a leaf operation opens a transaction of its own inside an orchestrator's
- wide locks, or deadlocks between two operations that touch the same resources in a different order

## .the cure

- the domain operation that names the business act is the unit of one transaction: `setLessonReservation` writes `LessonReservation` and the parts it owns
- its leaf operations join its transaction, never open their own (`define.domain-operation-grains`)
- a rule across resources converges after the commit: the operation publishes its fact, and each other resource reacts in its own transaction (`rule.require.async-tasks`)

a transaction wider than one aggregate is a smell for a lack of idempotency. a step that reaches past the aggregate needs the transaction only because it is unsafe to run twice; make each reaction idempotent (`rule.require.idempotent-consumers`, `rule.require.idempotency-keys`), and the wide transaction has no work left to do.

> "Transactions should not cross aggregate boundaries." — fowler, bliki "DDD_Aggregate" ✅

> "Guarantees of transactional atomicity come only within an entity identified by a unique key." — helland 2016, acm queue 14(5), doi:10.1145/3012426.3025012 ✅

## .enforcement

- one transaction that writes two or more resources with separate owners = **blocker**. harm: wide locks and deadlocks under load, and a rule that no single resource owns, so no single write path can keep it
- a leaf operation that opens its own transaction inside an orchestrator = **blocker** (`rule.require.transaction-at-the-entrypoint`)

## .see also

- `catalog.of=pattern.transaction.bound=storage.trait=atomicity.pattern=operation-per-transaction` — the member, in full
- `catalog.of=tactic.abstraction.kind=_.verb=set.tactic=gather` — the resource and the parts it owns
- `rule.require.one-storage-transaction` — the all-or-none unit this scopes
- `rule.forbid.sagas` — what a transaction that sprawls across contracts becomes
