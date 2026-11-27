# rule.require.optimistic-locks

## .what

never let two writers lose each other's change to one record. two steps, in order:

1. **design the read-modify-write out — always first.** never keep a value on a record that its records could derive: a surfer's lesson count, an instructor's booked total. derive it from the records it summarizes, and let a unique key refuse a double (one reservation per `(slot, surfer)`). a write that only inserts a fact has no read-modify-write to race
2. **where one is unavoidable — a justified need, recorded — take an optimistic lock** — the last-board capacity race on a slot is one. use the database's optimistic-lock capacity: an expected-version guard on the version read. the write lands only if the record still carries the version the caller read; a mismatch is the conflict — raised, re-read, retried, never swallowed. where the database lacks the capacity, pave one

our storage is insert-only (`rule.require.upsert-on-natural-key`), so the guarded write inserts the next version only while the current version is still the one read.

across a contract, the same check guards an apply: apply a message only if its version is newer than the one on record.

## .the smell

```ts
// 👎 a total kept by read-modify-write: two writers read bookedTotal = 4, both write 5, one lesson goes uncounted
const instructor = await daoInstructor.getOne({ by: { unique: { uuid } } }, context);
await daoInstructor.set({ instructor: { ...instructor, bookedTotal: instructor.bookedTotal + 1 } }, context);
```

the tells:

- a counter, total, or flag on a record, changed by read-modify-write, where the records it summarizes could be counted instead
- a read, a change in code, then a blind write of the same record
- a version the code reads but the write never checks
- a consumer that applies a message with no check that it is newer than the record

## .the cure

step 1 — design it out. the total is a read over the records, so no write races it:

```ts
// 👍 no total to race: the booked count is derived from the reservations themselves
const reservations = await daoLessonReservation.getAll({ by: { instructor } }, context);
```

step 2 — where the read-modify-write stays, guard it with the database's optimistic-lock capacity. one example shape, an expected-version guard on a hash of the version's values, computed at read and again at write, never kept as a column:

```ts
// 👍 one example shape: the write lands only if the slot still carries the version read
const slotRead = await daoBoardSlot.getOne({ by: { unique: { uuid } } }, context);
await daoBoardSlot.upsert(
  { slot: asSlotWithBoardReserved({ slot: slotRead }), expect: { versionHash: asVersionHash({ of: slotRead }) } },
  context,
); // a mismatch throws a conflict: re-read, retry
```

other databases name the same capacity their own way: a conditional write, an etag, a compare-and-set. a conflict is raised as an error, never swallowed (`rule.forbid.failhide`, mechanic).

> "Prevents conflicts between concurrent business transactions by detecting a conflict and rolling back the transaction." — fowler 2002, *patterns of enterprise application architecture*, "optimistic offline lock" ✅

## .enforcement

- a read-modify-write of one record that two writers can reach, with neither an optimistic nor a pessimistic lock = **blocker**. harm: a lost update — the last board reserved twice
- a consumer that applies a message over a newer record = **blocker**. harm: an older version overwrites a newer one
- a conflict that the caller ignores = **blocker** (`rule.forbid.failhide`, mechanic)
- a read-modify-write of a value its records could derive, not designed out = **blocker** — unless a recorded, justified need keeps it, and the database's own check guards the write (an optimistic or a pessimistic lock). a mutex beside it may save duplicate work; it never stands in for the check (`rule.forbid.locks-across-release-boundaries`). harm: every such value is one more lost-update race to guard, and the first unguarded writer miscounts it

## .see also

- `catalog.of=pattern.transaction.bound=storage.trait=isolation.pattern=optimistic-lock` — the member, in full
- `rule.require.pessimistic-locks` — the alternative under hot contention
- `rule.require.unique-constraints-on-natural-keys` — the key that refuses a double, once the counter is designed out
- `rule.forbid.check-then-write` — the race this closes
- `rule.forbid.locks-across-release-boundaries` — no lock across a release boundary; the storage check stays beside any lock inside one
