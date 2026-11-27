# rule.require.async-tasks

## .what

when a change in this storage owes work across a contract — charge the card, email the parent the waiver link — commit that work as an async task, in the same transaction as its cause. the task runs forward until done, and makes its irreversible decision only once every light is green.

a peer service's act is never the task's to order: publish the fact, and the peer decides (`rule.forbid.command-messages`).

## .the smell

```ts
// 👎 the reservation commits, then the charge is called inline: a crash between loses the charge
await setLessonReservation({ reservation }, context);
await sdkStripe.chargeCard({ surfer, price }); // a timeout here leaves a reservation never paid

// 👎 or the charge lands first, before the board it pays for is confirmed
```

the tells:

- an external call made inline, after the commit, with no record of the intent
- a follow-on step that a crash can lose, or a retry can run twice
- an irreversible act (charge, send, release) that runs before its dependencies have fulfilled
- an undo or `compensate*` call on failure (`rule.forbid.sagas`)

## .the cure

1. **commit the intent with its cause.** the task is a domain entity with a unique key; its enqueue is a findsert by that key, in the same transaction as the change. a repeat cause finds the extant task and queues none
2. **run forward, never backward.** each pass moves the task `QUEUED → ATTEMPTED → FULFILLED · FAILED · CANCELED` by a guarded edge (`rule.require.guarded-status-transitions`). a pass that throws, or ends still `ATTEMPTED`, marks it `FAILED`; a retrigger runs it again
3. **orchestrate from the task.** it waits on its dependency tasks and its peers' facts; while any is unfulfilled, the pass requeues itself and decides naught
4. **decide once every light is green.** the irreversible act commits with the fact of it, in one transaction (`rule.require.transactional-outbox`)
5. **a domain failure is a fact, not a fault.** a declined card is `PaymentDeclinedEvent`; the reservation moves `TENTATIVE → CANCELED` by its own guarded edge. naught is undone

```ts
// 👍 the intent commits with its cause; the task decides only when every light is green
await setLessonReservation({ reservation: { ...reservation, status: 'TENTATIVE' } }, context);
await queueTaskConfirmReservation({ reservation }, context);
```

tool: `ehmpathy/simple-async-tasks` — `withAsyncTaskExecutionLifecycleQueue` wraps the findsert enqueue; `withAsyncTaskExecutionLifecycleExecute` wraps the guarded execute.

> "you must change the status of the task away from attempted by the time the execute function resolves to some non-attempted , otherwise it will be considered a failure" — ehmpathy, simple-async-tasks readme ✅

## .enforcement

- work across a contract, owed by a change in this storage, with no task committed in the same transaction = **blocker**. harm: a crash loses the follow-on, or a retry runs it twice — a reservation never charged, or charged twice. where the follow-on is a peer's to decide, a fact committed to the outbox in the same transaction satisfies it (`rule.require.transactional-outbox`): the task orders our own work; the fact informs a peer of its
- an irreversible act that runs before every dependency has fulfilled = **blocker**. harm: a charge lands for a board never confirmed

## .see also

- `catalog.of=pattern.transaction.bound=contract.trait=atomicity.pattern=async-task` — the member, in full
- `rule.forbid.sagas` — the antipattern this displaces
- `rule.forbid.choreographed-flows` — a flow of many steps belongs to one task
- `rule.require.idempotent-operations` — each pass converges on a retrigger
