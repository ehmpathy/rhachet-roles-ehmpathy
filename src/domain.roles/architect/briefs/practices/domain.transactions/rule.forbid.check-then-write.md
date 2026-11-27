# rule.forbid.check-then-write

## .what

never read a record, check an invariant in code, then write — with no structural enforcement between the read and the write. two callers read the same record, both pass the check, both write.

## .the smell

```ts
// 👎 two surfers in the same 300ms both read stock = 1, both pass, both reserve
const slot = await daoSlot.getOne({ by: { primary: { uuid } } });
if (slot.boardsReserved >= slot.boardsInStock) throw new ConstraintError('no board left');
await daoReservation.set({ reservation });
```

the tells: a `get`, an `if`, then a `set`, on one invariant, with no transaction, version, constraint, or lock in sight.

## .the cure

let the storage enforce it at the write:

| break | enforcement |
|---|---|
| the same caller retries, or double-clicks | a unique constraint on the natural key; the retry finds the prior write (`findsert`) |
| two callers race for one scarce resource | an optimistic lock on the record; the second write fails and retries |
| the invariant spans records in one storage | one transaction, or a check constraint |
| contention is high and a retry storm costs more than a wait | a pessimistic lock (`select … for update`) |

then prove it: one test fires two writes at once and asserts exactly one wins.

## .enforcement

- read → check in code → write on an invariant, with no structural enforcement at the write = **blocker**

## .see also

- `catalog.of=tactic.constraint.kind=invariant.grain=enforcement.tactic=refuse` (domain.constraints) — the member, in full
- `rule.require.invariant-before-operation` — the require twin
- `catalog.of=pattern.transaction._` — the full set of enforcements
- `pattern=unique-constraint-on-natural-key` · `pattern=foreign-key` · `pattern=optimistic-lock` · `pattern=pessimistic-lock` — the members that cure it, each a check the storage runs inside the commit
