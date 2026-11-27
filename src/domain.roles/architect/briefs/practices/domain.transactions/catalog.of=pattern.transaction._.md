# catalog.of=pattern.transaction._

the patterns that keep a write correct against its environment — other writers, faults, retries, late messages, copies — for information logistics: postgres or dynamodb, queues, third-party apis, behind serverless handlers.

each pattern keeps one trait of a write. pick by two questions: **what does the write touch, and which trait must it keep?**

```
catalog.of=pattern.transaction._.md                                             # this catalog brief
catalog.of=pattern.transaction.bound=$bound.trait=$trait.pattern=$pattern.md    # one member per pattern
rule.require.$pattern.md                                                        # one rule per require member
rule.forbid.$pattern.md                                                         # one rule per forbid member
```

each member has its own rule, so a reviewer that loads only rules still holds every verdict. the rule names the move and its harm; the member holds the full detail and sources.

## .the law — consistency at rest

every commit leaves every invariant true (`define.constraint.kind=invariant`). no persisted record ever holds a half-done change, not even for a moment between two steps.

a change in progress is not a half-done record: it is a record of its own, consistent at rest — a task `QUEUED`, a reservation `TENTATIVE` — helland's tentative operation, which "eventually confirms or cancels".

consistency is the c of acid. as the law, every pattern below serves it. as a trait, the `consistency` line guards it head-on: a declared constraint, a forward-only status, a read of the latest write.

## .what this catalog holds, and what it does not

the catalog holds moves at the write: in the storage, the queue, the external call. moves in code — a domain object that refuses construction, one write path per resource — sit on the enforcement ladder (`define.constraint.grain=enforcement`, `rule.forbid.scattered-invariant-guards`).

## .the noun tree

```
transaction pattern
└── keeps a write correct, so consistency holds at rest
    ├── bound   — what the write touches
    ├── trait   — what the write must keep against its environment
    ├── pattern — the move that keeps it
    └── verdict — use or forbid
```

## .the dimensions — bound × trait

- **bound** — what the write touches. one transaction covers one storage, never more
  - `storage` — the write stays in one storage, so one transaction covers it: one record, a resource and its parts, or many resources at once. the storage keeps each trait — a constraint checked at commit, a conditional write, a lock, the transaction itself
  - `contract` — the write crosses a contract — another service's api, a queue, stripe — reached only by a call or a message (`abstraction.kind=contract`). no transaction covers it: each side keeps its own traits in its own storage, and the pattern makes the cross safe
  - the line between the two is the one fundamental bound: past a contract, the storage keeps naught for you
- **trait** — what the write must keep, and the threat that would break it
  - `atomicity` — a crash, timeout, or transient fault partway lands all of it or none (the a of acid)
  - `consistency` — the write and every read of it obey the declared rules: a constraint is refused at commit, a message out of order cannot move a status backward, a read never sees an older copy (the c of acid)
  - `isolation` — another writer that acts at the same time cannot interleave with it (the i of acid)
  - `idempotency` — a retry or redelivery that runs it twice acts once

durability, the d of acid, is the storage's own job: no pattern here is owed for it. idempotency takes its place on the axis: past one storage, every cross is delivered at least once.

## .the walk

| trait \ bound | storage | contract |
|---|---|---|
| atomicity | `one-storage-transaction` · `operation-per-transaction` · `transaction-at-the-entrypoint` | `async-task` · `transactional-outbox` · `retry-with-backoff` · `saga` (forbid) · `two-phase-commit` (forbid) |
| consistency | `check-constraint` · `foreign-key` · `unique-constraint-on-natural-key` · `read-your-writes` | `guarded-status-transitions` · covered by `optimistic-lock`, on apply · covered by `async-task`: wait for the fact to land, never trust a copy kept across a contract · parse what enters (`tactic=standardize`) |
| isolation | `optimistic-lock` · `pessimistic-lock` · `double-entry-ledger` | `distributed-lock` (forbid across a release boundary) |
| idempotency | `upsert-on-natural-key` · covered by `unique-constraint-on-natural-key` | `supplied-exid` · `idempotency-key` · `idempotent-consumer` |

each cell holds two kinds of answer:

- a pattern — the move for that cell; its verdict is `require`, or `forbid` where marked
- **covered by** — a pattern from another cell already keeps it

## 🔴 .why the forbid members are forbidden

all three forbid members share one cause: a change that must land whole across contracts. no transaction covers more than one storage, so each fakes one with a coordinator: a saga's undo commands, a two-phase commit's prepare round, a lock no single storage owns.

a saga breaks four laws at once:

- **idempotency** — a compensation reverses a step rather than converge to an end; a re-run after a partial undo has no safe answer
- **concern boundaries** — the coordinator commands inside every service; each service now answers to an outsider for its own data
- **consistency at rest** — between a step and its undo, persisted records hold a half-done change, and readers act on it
- **atomic facts** — it sends commands ("undo the charge") where a decomposed domain publishes facts (`PaymentRefundedEvent`)

the cure is a decomposition, not another pattern:

1. **redraw the bound** so each change that must land whole touches one storage, in one transaction
2. **orchestrate with an async task** — it waits on its dependency tasks and on its peers' facts, and it may be retriggered any number of times
3. **decide once every light is green** — the task makes the irreversible decision only after every dependency has fulfilled; until then, each pass re-checks and requeues itself
4. **publish atomic facts** — the decision commits with the fact of it, in one transaction (`async-task`, `transactional-outbox`); each peer reacts idempotently (`idempotent-consumer`, `guarded-status-transitions`)
5. **a reversal fixes forward — an apology, never a revert** — a refund, a rebook, a credit, a task for a human: a new act with its own fact (`PaymentRefundedEvent`) that each peer reacts to, never a compensation command that rolls stored values back

`rule.forbid.sagas` boots the ban, with this cure; `rule.forbid.two-phase-commits` and `rule.forbid.locks-across-release-boundaries` ban the other two.

## .the dimensions pass three tests

- **disjoint** — each pattern has one home cell; a **covered by** cell reuses it, never repeats it
- **exhaustive** — every trait at every bound holds at least one pattern or **covered by**
- **independent** — bound names what the write touches, trait names what it must keep; neither value set depends on the other

## .the members

verdict sorts what to reach for: **require** · **forbid**, the two peer poles. tier sorts the `require` members by how widely they apply: **root** — a common write breaks without it, in most repos; reach for these first · **leaf** — it breaks in one kind of repo or one kind of load.

| bound | trait | pattern | verdict | tier | keeps | rule | also cites |
|---|---|---|---|---|---|---|---|
| storage | atomicity | `one-storage-transaction` | require | root | no half-written resource | `rule.require.one-storage-transaction` | — |
| storage | atomicity | `operation-per-transaction` | require | root | one business transaction, one domain operation | `rule.require.operation-per-transaction` | `define.domain-operation-grains` |
| storage | atomicity | `transaction-at-the-entrypoint` | require | root | the entrypoint opens the transaction; nested calls join it | `rule.require.transaction-at-the-entrypoint` | `rule.require.directional-deps` (mechanic) |
| contract | atomicity | `async-task` | require | root | a follow-on step commits with its cause, runs to done, and decides only when every light is green | `rule.require.async-tasks` | — |
| contract | atomicity | `transactional-outbox` | require | root | no change without its event, nor event without its change | `rule.require.transactional-outbox` | — |
| contract | atomicity | `retry-with-backoff` | require | root | a transient fault retries, bounded; it never storms | `rule.require.retry-with-backoff` | `rule.forbid.time-assumptions` (mechanic) |
| contract | atomicity | `saga` | forbid | — | (fakes atomicity across contracts with undo commands) | `rule.forbid.sagas` | — |
| contract | atomicity | `two-phase-commit` | forbid | — | (fakes atomicity across contracts with a prepare round) | `rule.forbid.two-phase-commits` | `rule.forbid.sagas` |
| storage | consistency | `check-constraint` | require | root | a value stays in its legal range | `rule.require.check-constraints` | — |
| storage | consistency | `foreign-key` | require | root | a reference names a record that exists, even under a concurrent delete | `rule.require.foreign-keys` | — |
| storage | consistency | `unique-constraint-on-natural-key` | require | root | no duplicate resource, even under a concurrent findsert | `rule.require.unique-constraints-on-natural-keys` | `rule.forbid.check-then-write` |
| storage | consistency | `read-your-writes` | require | leaf | a caller sees its own write, never an older copy | `rule.require.read-your-writes` | — |
| contract | consistency | `guarded-status-transitions` | require | root | a late or repeated message cannot move a status backward or twice | `rule.require.guarded-status-transitions` | — |
| storage | isolation | `optimistic-lock` | require | root | no lost update between two writers; no older version applied over a newer | `rule.require.optimistic-locks` | — |
| storage | isolation | `pessimistic-lock` | require | leaf | no interleave in a hot read-modify-write | `rule.require.pessimistic-locks` | — |
| storage | isolation | `double-entry-ledger` | require | leaf | every balance equals the sum of its entries; appends never collide | `rule.require.double-entry-ledger` | — |
| contract | isolation | `distributed-lock` | forbid across a release boundary | — | (fakes isolation across owners; allowed inside one release boundary) | `rule.forbid.locks-across-release-boundaries` | `rule.forbid.sagas` |
| storage | idempotency | `upsert-on-natural-key` | require | root | a re-run converges; insert only — it never duplicates, never overwrites the past | `rule.require.upsert-on-natural-key` | `rule.require.idempotent-operations`; `rule.forbid.nonidempotent-mutations` (mechanic) |
| contract | idempotency | `supplied-exid` | require | root | a create retried across a contract lands on one record | `rule.require.supplied-exids` | — |
| contract | idempotency | `idempotent-consumer` | require | root | a redelivered message acts once | `rule.require.idempotent-consumers` | — |
| contract | idempotency | `idempotency-key` | require | root | a retried external call charges or emits once | `rule.require.idempotency-keys` | `rule.require.idempotent-operations`; `rule.prefer.declastruct` (mechanic) |

each member cites its rule, and the rule cites the member back: the rule enforces the move; the member holds it in full.

## .why async tasks displace sagas

a saga moves backward on failure: it undoes each step it took. an async task moves forward: it retries until done.

- the intent commits with its cause, in one transaction — the follow-on cannot be lost
- a findsert on the task's unique key dedupes the enqueue — a repeat cause queues one task
- a guarded status (`QUEUED → ATTEMPTED → FULFILLED · FAILED · CANCELED`) refuses a double run and a run of a done task
- each pass is idempotent, so a retrigger converges
- the task is the orchestrator: it waits on its dependency tasks and on its peers' facts, and it makes the irreversible decision only when all of them have fulfilled

a real domain failure — the card is declined — is not a fault to undo. it is a fact: `PaymentDeclinedEvent`, and the reservation moves `TENTATIVE → CANCELED` by its own guarded edge. every record stays consistent at rest throughout. ⇒ `pattern=async-task` holds the move; `ehmpathy/simple-async-tasks` holds the tool.

## .the caveat

- most writes need only `one-storage-transaction` and the `storage` column
- a pattern earns its cost by a named invariant that breaks without it. a pattern with no invariant to name is overhead
- the tier line follows our repo mix: many services lean harder on the `contract` column
- not in the catalog, on purpose: lease + fence token, change data capture, dead-letter queue, unit of work. look each up when a case demands one
- a log of events as the only record, and separate read schemas, are event patterns: `catalog.of=pattern.event._` holds them, both forbid (`rule.forbid.replay-on-read`, `rule.forbid.cqrs`)

## .see also

- `rule.forbid.sagas` — the booted ban, with the cure shared by all three forbid members
- `rule.require.*` · `rule.forbid.two-phase-commits` · `rule.forbid.locks-across-release-boundaries` — one rule per member (the table above)
- `catalog.of=pattern.event._` — what a fact says, carries, and owns; the event-side face of the law above
- `rule.forbid.check-then-write` — the antipattern the `consistency` and `isolation` lines cure
- `rule.require.invariant-before-operation` — name the invariant, then walk its break paths
- `define.constraint.grain=enforcement` — the ladder; the code-level enforcements (domain object, one write path per resource) live there
- `define.software-domain-taxonomy` — which kind of system needs which members
- `catalog.of=tactic.abstraction._` — the resource and the parts it owns, as an abstraction
- `rule.prefer.root-leaf` (mechanic) — why `root` and `leaf`
- sources: each `require` member quotes a fetched primary page under `.source`, graded ✅ — postgresql docs, fowler, helland, richardson, jepsen, brooker 2015, stripe, the ietf idempotency-key draft; `pattern=double-entry-ledger` rests on a secondary page (☑️); `pattern=guarded-status-transitions` and `pattern=async-task` cite our own practice and package. the forbid members cite their origins by title (garcia-molina & salem 1987, gray 1978 ☑️) and the canon that converges (helland 2016, kleppmann 2016 ✅). the read half of `consistency` rests on the session guarantees of terry et al. 1994 (doi:10.1109/pdis.1994.331722, by title ☑️) and jepsen's definitions ✅; the acid traits cite härder & reuter 1983, *acm computing surveys* 15(4), 287–317, doi:10.1145/289.291 (by title ☑️)
