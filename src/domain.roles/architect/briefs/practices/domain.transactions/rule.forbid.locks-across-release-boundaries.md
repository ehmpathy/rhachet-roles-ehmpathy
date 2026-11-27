# rule.forbid.locks-across-release-boundaries

## .what

never share a lock across a release boundary. a lock inside one is allowed: one service, one owner — or one organization's shared infra, where the whole organization is the release boundary. a lock is forbidden where the parties that take it release apart under separate owners: a vendor, a partner, an outside consumer of a published contract.

| the lock | verdict |
|---|---|
| a mutex one service takes around its own work (`with-simple-mutex`) | allowed — one owner |
| a mutex on the organization's shared infra, taken by several of its services | allowed — the organization is the release boundary |
| a lock that another organization's code must take, or that a published contract exposes to outside consumers | **forbidden** |

## .why across is forbidden

- **no one owns it** — each side releases on its own schedule. a change to the key, the lease, or the semantics on one side breaks the other, and no shared release catches it
- **it leaks into the contract** — the lock becomes a promise no one declared, which outside consumers lean on (`rule.forbid.implicit-contracts`)
- **no one can repair both sides** — a taker can pause (a gc, a cold start, a network partition) past its lease, and a second taker proceeds. inside one boundary, one commit fixes both sides; across it, none can

## .inside the boundary — a lease can lapse

a lock inside the boundary is allowed, and a lease-based lock can still lapse: the pause that outlives a lease does not care who owns it (kleppmann 2016). so a database write it guards keeps the database's own check too — a unique key, an optimistic or a pessimistic lock (`rule.require.optimistic-locks`, `rule.require.pessimistic-locks`). the mutex saves duplicate work; the database keeps the write correct.

> "there are two reasons why you might want a lock in a distributed application: for efficiency or for correctness." … "if you need locks for correctness … please enforce use of fencing tokens on all resource accesses under the lock." — kleppmann 2016 ✅

our expected-version guard is that fence: the write lands only if the record still carries the version the taker read.

## .the smell

```ts
// 👎 a published endpoint hands an outside consumer a lock on our slot
// POST /slots/{slotUuid}/lock   → { leaseToken, expiresAt }
// POST /slots/{slotUuid}/unlock
await partnerClient.acquireSlotLock({ slotUuid, ttl: 'PT5S' }); // their code, our lock
```

the tells:

- a published contract that exposes acquire / release
- a lock key that another organization's code must know
- a lease ttl tuned by hand on both sides of a release boundary

## .the cure

the owner of the resource keeps its isolation behind its own contract. outside callers ask through that contract; the owner runs the guard inside its own storage (`rule.require.optimistic-locks`, `rule.require.pessimistic-locks`). a request that must not run twice carries an idempotency key (`rule.require.idempotency-keys`); a reaction to a fact is idempotent (`rule.require.idempotent-consumers`).

> "Unfortunately, even if you have a perfect lock service, the code above is broken." — kleppmann 2016, "how to do distributed locking" ✅

## .enforcement

- a lock taken across a release boundary = **blocker**. harm: a change on one side breaks the other with no shared release to catch it, and a paused taker outlives its lease while a second writes — the last board reserved twice
- a published contract that exposes a lock to outside consumers = **blocker**
- inside the boundary, a lease-based lock as the only guard of a database write that must be correct = **blocker**. harm: a taker stalls past its lease, a second taker writes, the first wakes and writes too — two surfers, one board. cure: the write carries the database's own check (an expected-version guard, a unique key, a pessimistic lock). a lock that only saves duplicate work, where a double run harms no data, needs no such check

## .see also

- `catalog.of=pattern.transaction.bound=contract.trait=isolation.pattern=distributed-lock` — the member, in full
- `rule.forbid.sagas` — two services that write one resource is the saga's smell, whatever lock sits between them
- `rule.require.optimistic-locks` — the check the storage itself runs
- `rule.forbid.two-phase-commits` — the same fake, for atomicity
- `define.constraint.kind=guarantee` — what a release boundary is
