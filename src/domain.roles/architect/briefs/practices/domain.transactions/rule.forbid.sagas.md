# rule.forbid.sagas

## .what

never coordinate one change across contracts with a saga, a two-phase commit, or a lock across a release boundary. each fakes a transaction no storage can hold, and each signals a boundary drawn through an invariant.

## .why

a transaction covers one storage, never more (`catalog.of=pattern.transaction._`). a change that must land whole across contracts has no transaction, so these three hire a coordinator to fake one:

| member | fakes | how |
|---|---|---|
| `pattern=saga` | atomicity | a chain of local steps, each with an undo command fired in reverse on failure |
| `pattern=two-phase-commit` | atomicity | a prepare round that locks every participant until the coordinator speaks |
| `pattern=distributed-lock` | isolation | a lock taken across a release boundary, before a write on the far side (allowed inside one) |

each breaks the laws the catalog holds:

- **idempotency** — an undo reverses rather than converge; a retry after a partial undo has no safe answer
- **concern boundaries** — the coordinator commands inside every service; each service answers to an outsider for its own data
- **consistency at rest** — between a step and its undo, or while a lock or prepare round stays open, persisted records hold a half-done change that readers act on
- **atomic facts** — it sends commands ("undo the charge") where a decomposed domain publishes facts (`PaymentRefundedEvent`)

## .the tell — a pattern that ships its own countermeasures

the saga's proponents document its defects, then bolt on a patch for each: a "semantic lock" for dirty reads and "commutative updates" for lost updates (microsoft), "countermeasures" that "a saga developer must" add (richardson). a pattern that needs a catalog of patches to survive its own anomalies should never have been adopted. the cure removes the anomalies at the root: no half-done record exists, since a change in progress is a whole record of its own (`TENTATIVE`), and no undo is ever owed.

## .the smell

- a coordinator with one undo handler per step; an operation named `compensate*`, `rollback*`, or `undo*` that a remote caller invokes
- a service api that exposes an undo, a `prepare*`, or a lock for another service to call
- a lock key that names a resource two services write; a lease ttl tuned until the races go quiet

## .what the smell reveals

one invariant split across two contracts — "a charge exists only for a reserved board" kept half in payments, half in reservations. neither can keep it alone. the boundary sits in the wrong place, or the contracts speak in commands where facts belong.

## .the cure

1. **redraw the bound** so the change that must land whole touches one storage, in one transaction
2. **orchestrate with an async task** (`pattern=async-task`) — it waits on its dependency tasks and on its peers' facts, and may be retriggered any number of times
3. **decide once every light is green** — the irreversible act runs only after every dependency has fulfilled; until then, each pass re-checks and requeues itself
4. **publish atomic facts** — the decision commits with its fact, in one transaction (`pattern=transactional-outbox`); each peer reacts idempotently (`pattern=idempotent-consumer`, `pattern=guarded-status-transitions`)
5. **a reversal fixes forward — an apology, never a revert** — a refund, a rebook, a credit, a task for a human: a new act with its own fact (`PaymentRefundedEvent`) that each peer reacts to on its own terms, never a compensation command that rolls stored values back
6. **one owner per resource** — where two services race for one resource, give it one owner; the owner keeps isolation in its own storage (`pattern=optimistic-lock`, `pattern=pessimistic-lock`)

## .examples

### 👎 bad — a saga

```ts
// reserve a board, then charge the card; on decline, undo the reservation
await svcReservations.reserveBoard({ slot });
const charge = await svcPayments.chargeCard({ surfer, price }).catch(async (error) => {
  await svcReservations.compensateReserveBoard({ slot }); // undo command into another service
  throw error;
});
```

### 👍 good — an async task that decides once every light is green

```ts
// the reservation commits TENTATIVE, with its task, in one transaction
await setLessonReservation({ reservation: { ...reservation, status: 'TENTATIVE' } }, context);
await queueTaskConfirmReservation({ reservation }, context);

// each pass of the task re-checks its dependencies, and decides only when all are green
const executeTaskConfirmReservation = withAsyncTaskExecutionLifecycleExecute(async ({ task }) => {
  const payment = await getOnePaymentForReservation({ reservation: task.reservation }, context);
  if (payment.status === 'PENDING') return requeue({ task }); // a light is not green yet
  if (payment.status === 'DECLINED') return setReservationCanceled({ reservation: task.reservation }, context); // a fact, not an undo
  return setReservationConfirmed({ reservation: task.reservation }, context); // every light green
}, { dao: daoTaskConfirmReservation });
```

## .enforcement

- a saga or two-phase commit across contracts, or a lock across a release boundary = **blocker** (a mutex inside one release boundary is allowed: `rule.forbid.locks-across-release-boundaries`)
- an api that exposes an undo, prepare, or lock of its own act for another service to call = **blocker**
- a half-done change persisted between two steps of one business act = **blocker** (consistency at rest)

## .see also

- `catalog.of=pattern.transaction._` — the walk, and the three forbid members in it
- `rule.forbid.two-phase-commits` · `rule.forbid.locks-across-release-boundaries` — the other two forbid members, each with this cure
- `pattern=async-task` — the orchestrator that displaces the saga
- `rule.forbid.command-messages` — the same law, between services: a command message is a saga by another name
- `rule.forbid.check-then-write` — the same root, inside one storage
- `rule.require.idempotent-operations` — what a compensation abandons
