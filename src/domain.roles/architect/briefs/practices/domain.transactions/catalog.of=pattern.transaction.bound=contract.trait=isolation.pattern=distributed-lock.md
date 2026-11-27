# catalog.of=pattern.transaction.bound=contract.trait=isolation.pattern=distributed-lock

a member of `catalog.of=pattern.transaction._` · bound `contract` · trait `isolation` · verdict **`forbid` across a release boundary**; allowed inside one.

## .what it is

a lock that lives outside any one storage — in redis, in a lock table, in a lease service — that a caller takes before it writes.

## .where it is allowed, and where not

| the lock | verdict |
|---|---|
| one service, around its own work (`with-simple-mutex`) | allowed — one owner |
| the organization's shared infra, taken by several of its services | allowed — the organization is the release boundary |
| taken by another organization's code, or exposed by a published contract to outside consumers | **forbidden** |

## .why across is an antipattern

- **no one owns it** — each side releases on its own schedule; a change to the key, the lease, or the semantics on one side breaks the other
- **it leaks into the contract** — the lock becomes an undeclared promise outside consumers lean on
- **no one can repair both sides** — a taker can pause past its lease and a second proceeds; across owners, no one commit fixes both

## .inside the boundary

a lease can lapse whoever owns it. so the mutex saves duplicate work, and a database write it guards that must be correct keeps the database's own check too — a lease as its only guard is a blocker (`pattern=optimistic-lock`, `pattern=pessimistic-lock`, `pattern=unique-constraint-on-natural-key`).

## .the smell

- a published contract that exposes acquire / release
- a lock key that another organization's code must know
- a lease ttl tuned by hand on both sides of a release boundary

## .the cure

the owner of the resource keeps its isolation behind its own contract; outside callers ask through it, with an idempotency key where a repeat must not land twice (`pattern=idempotency-key`, `pattern=idempotent-consumer`).

`rule.forbid.locks-across-release-boundaries` holds the ban.

## .source

converge — an author of the canon argues the same:

> "Unfortunately, even if you have a perfect lock service, the code above is broken." … "You simply cannot make any assumptions about timing, which is why the code above is fundamentally unsafe, no matter what lock service you use." — kleppmann 2016, "how to do distributed locking", https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html ✅

his fix — "include a fencing token with every write request to the storage service" — moves the check into the storage that takes the write. that is `pattern=optimistic-lock`, and it is why the database's own check stays beside any lock, inside the boundary or out.
