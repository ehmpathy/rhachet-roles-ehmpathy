# rule.forbid.two-phase-commits

## .what

never coordinate one change across contracts with a two-phase commit. a coordinator asks every participant to prepare — hold its change, locked, ready to commit — then tells all to commit or all to abort. it fakes one transaction across many storages.

## .why

- **availability** — every participant keeps its locks until the coordinator speaks. one slow or dead participant, or a dead coordinator, stalls them all
- **concern boundaries** — each service hands control of its own commit to an outsider
- **third parties** — stripe, a queue, an email api offer no prepare phase; the pattern cannot span the contracts we actually cross
- **consistency at rest** — a participant that prepared, then lost the coordinator, keeps a change it can neither commit nor drop

it shares one cause with the saga: an invariant drawn across a contract (`rule.forbid.sagas`).

## .the smell

- an `xa` or distributed-transaction manager in the dependency list
- a `prepare*` / `commit*` pair exposed over an api
- a transaction context passed across a service call

## .the cure

redraw the bound so the rule lives in one storage, in one transaction (`rule.require.one-storage-transaction`). carry the rest across the contract as an async task and its facts (`rule.require.async-tasks`, `rule.require.transactional-outbox`, `rule.require.idempotent-consumers`). `rule.forbid.sagas` holds the full cure.

> "Real world almost-infinite scale applications would love the luxury of a global scope of serializability as is promised by two phase commit and other related algorithms. Unfortunately, the fragility of these leads to unacceptable pressure on availability." — helland 2007, "life beyond distributed transactions: an apostate's opinion", cidr 2007 ✅

> "Problem How to implement transactions that span services? Forces 2PC is not an option" — richardson, microservices.io, "pattern: saga" ✅

## .enforcement

- a two-phase commit across contracts = **blocker**. harm: one dead participant or coordinator stalls every service in the round, and a participant cut off after prepare keeps a change it can neither commit nor drop
- an api that exposes a `prepare*` for another service to call = **blocker**

## .see also

- `catalog.of=pattern.transaction.bound=contract.trait=atomicity.pattern=two-phase-commit` — the member, in full
- `rule.forbid.sagas` — the shared cause, and the full cure
- `rule.forbid.locks-across-release-boundaries` — the same fake, for isolation
