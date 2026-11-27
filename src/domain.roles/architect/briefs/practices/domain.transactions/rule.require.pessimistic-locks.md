# rule.require.pessimistic-locks

## .what

on a hot record under real contention, take a pessimistic lock inside the transaction: use the database's lock capacity to lock the current record, then insert the next version. the second writer waits instead of retries. to guard an invariant over many records, lock the parent record before a write to any child. where the database lacks the capacity, pave one.

two axes, never confused: pessimistic and optimistic are **strategies** — lock before use, or check at the write. shared and exclusive are **modes** — who may be inside at once. a pessimistic lock can be shared (`for share`) or exclusive (`for update`).

## .when

a leaf rule: it binds a hot record under real contention — the last board in stock on a swell day — where optimistic-lock retries would thrash, and an invariant over many records under one parent (a slot and its reservations). elsewhere, an optimistic lock serves (`rule.require.optimistic-locks`).

## .the smell

```ts
// 👎 every surfer on a swell day conflicts on the same slot, retries, and conflicts again
for (const attempt of attempts) {
  const slotRead = await daoBoardSlot.getOne({ by: { unique: { uuid } } }, context);
  const written = await daoBoardSlot.upsert(
    { slot: asSlotWithBoardReserved({ slot: slotRead }), expect: { versionHash: asVersionHash({ of: slotRead }) } },
    context,
  ).catch(asConflictOrThrow); // a version mismatch → null; any other error rethrows
  if (written) break;
}
```

the tells:

- optimistic-lock conflicts that climb with load
- a retry storm on one record
- an invariant over a parent's children ("reserved ≤ stock, per slot") with no lock on the parent

## .the cure

```ts
// 👍 inside one transaction: lock the current slot record, then write its next version; the second writer waits, it never retries
const slotLocked = await daoBoardSlot.getOne({ by: { unique: { uuid } }, lock: 'FOR_WRITE' }, context);
await daoBoardSlot.upsert({ slot: asSlotWithBoardReserved({ slot: slotLocked }) }, context);
```

the lock is the database's own capacity, and each database names it its own way: postgres, mysql, and oracle spell it `select … for update`; sql server, an `updlock` hint. keep the locked span short: writers queue on the lock, and a long transaction stalls all of them.

one example among them — postgres's docs, on its shape of the capacity and its cost:

> "FOR UPDATE causes the rows retrieved by the SELECT statement to be locked as though for update. This prevents them from being locked, modified or deleted by other transactions until the current transaction ends." — postgresql 19 docs, §13.3.2 ✅

> "The use of explicit locking can increase the likelihood of deadlocks" — §13.3.4 ✅

## .where there is no record to lock

sometimes no record in this storage can carry the lock: the parent lives in another service's storage, or the rule spans keys that no record owns.

1. **a constraint first.** where a unique key can express the rule, it refuses the second write on every path, with no cooperation (`rule.require.unique-constraints-on-natural-keys`)
2. **otherwise, the database's advisory lock** — a lock on a key the application picks, not on data. take it in the transaction, in the one write path, so commit releases it

```ts
// 👍 instructor records live in the roster service; the lesson service has no instructor record to lock
// inside one transaction: lock the instructor's key, check for an overlap, insert; commit releases the lock
await daoLesson.lockKey({ key: { instructorUuid } }, context); // postgres: pg_advisory_xact_lock
const overlaps = await daoLesson.getAll({ by: { instructorUuid, range: lesson.range } }, context);
if (overlaps.length) ConstraintError.throw('instructor already booked for that time', { instructorUuid });
await daoLesson.upsert({ lesson }, context);
```

the database does not enforce an advisory lock on any write: only code that asks for the same key waits. so it lives in the one write path, never in each caller (`rule.forbid.scattered-invariant-guards`).

each database names it its own way, and its scope:

| database | advisory lock | released by commit |
|---|---|---|
| postgres | `pg_advisory_xact_lock` | yes (the `_xact_` form) |
| sql server | `sp_getapplock`, `@LockOwner = 'Transaction'` | yes |
| oracle | `DBMS_LOCK.REQUEST`, `release_on_commit => TRUE` | yes |
| mysql | `GET_LOCK()` | no — session scope only; release it on every exit of the write path |

> "These are called advisory locks, because the system does not enforce their use — it is up to the application to use them correctly." — postgresql 19 docs, §13.3.5 ✅

> "Unlike standard lock requests, session-level advisory lock requests do not honor transaction semantics: a lock acquired during a transaction that is later rolled back will still be held following the rollback." — §13.3.5 ✅

> "This enables clients that agree on a given lock name to use the name to perform cooperative advisory locking. But be aware that it also enables a client that is not among the set of cooperating clients to lock a name … and thus prevent any of the cooperating clients from locking that name." — mysql 8.4 reference manual, §14.14 ✅

pgbouncer's feature table lists session-level advisory locks under transaction pool mode as "Never" (pgbouncer.org/features.html ✅): each transaction may run on a different server connection.

## .enforcement

- on a hot record or a many-record invariant under one parent: a read-modify-write with neither a pessimistic nor an optimistic lock = **blocker**. harm: a lost update, or a retry storm that stalls every writer on a swell day
- a pessimistic lock kept across an external call or a long span = **blocker**. harm: every writer queues behind it
- a session-scoped advisory lock where the database offers a transaction-scoped one = **blocker**. harm: it survives a rollback, and behind a transaction pooler it sits on one server connection while the unlock runs on another — the lock leaks, and every later writer on that key stalls or slips past it
- an advisory lock where a unique key could express the rule = **nitpick** — the key guards every path, with no cooperation
- a pessimistic lock where contention is low and an optimistic lock would serve = **nitpick**

## .see also

- `catalog.of=pattern.transaction.bound=storage.trait=isolation.pattern=pessimistic-lock` — the member, in full
- `rule.require.optimistic-locks` — the default for one record
- `rule.forbid.check-then-write` — the race this closes
- `rule.forbid.locks-across-release-boundaries` — a lock across a release boundary, forbidden; a mutex inside one, allowed
