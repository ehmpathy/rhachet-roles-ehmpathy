# catalog.of=pattern.transaction.bound=contract.trait=atomicity.pattern=async-task

a member of `catalog.of=pattern.transaction._` · bound `contract` · trait `atomicity` · verdict `require` · tier `root`.

## .keeps

a follow-on step commits with its cause, runs to done, and makes its irreversible decision only once every light is green.

## .require when

a change in this storage owes work across a contract: charge the card, email the parent the waiver link — this service's own act, at a vendor. a peer service's act is never the task's to order: publish the fact, and the peer decides (`rule.forbid.command-messages`).

## .the move

1. **commit the intent with its cause.** the task is a domain entity with a unique key; its enqueue is a findsert by that key, in the same transaction as the change that caused it. a repeat cause finds the extant task and queues none
2. **run forward, never backward.** an execute pass moves the task `QUEUED → ATTEMPTED → FULFILLED · FAILED · CANCELED`, a guarded lifecycle (`pattern=guarded-status-transitions`). a pass that throws, or ends still `ATTEMPTED`, marks the task `FAILED`; a retrigger runs it again. a `FULFILLED` or `CANCELED` task is skipped
3. **orchestrate from the task.** a task that needs other work waits on its dependency tasks and on its peers' facts. each pass re-checks them; while any is unfulfilled, the pass requeues itself and decides naught
4. **decide once every light is green.** the irreversible act — the charge, the release, the send — runs only after every dependency has fulfilled. it commits with the fact of it, in one transaction (`pattern=transactional-outbox`)
5. **a domain failure is a fact, not a fault.** a declined card is `PaymentDeclinedEvent`: the task records it, and the reservation moves `TENTATIVE → CANCELED` by its own guarded edge. naught is undone

every record stays consistent at rest throughout: the task is a record of its own, `QUEUED` or `ATTEMPTED`, never a half-done change.

## .in our tools

`ehmpathy/simple-async-tasks`: the task class extends `AsyncTask` as a `DomainEntity` with `static unique`; `withAsyncTaskExecutionLifecycleQueue` wraps the findsert enqueue; `withAsyncTaskExecutionLifecycleExecute` wraps the guarded execute. each pass is idempotent (`rule.require.idempotent-operations`), so a retrigger converges.

## .the failure it prevents

a change commits and its follow-on is lost to a crash; a follow-on runs twice; an irreversible charge lands before the board it pays for is confirmed. and it is the cure for every case a saga would claim (`pattern=saga`, forbid).

## .source

> "easily create and use async-tasks within a pit-of-success" — ehmpathy, simple-async-tasks readme ✅ (`refs/ref.nd.simple-async-tasks`)

> "you must change the status of the task away from attempted by the time the execute function resolves to some non-attempted , otherwise it will be considered a failure" — same ✅

## .see also

- `rule.require.async-tasks` — the rule that enforces this member
