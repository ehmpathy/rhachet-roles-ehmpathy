# rule.forbid.command-messages

## .what

never let one of our services change another's resources by a path that skips the owner's domain operations, or that hides the order. a peer may call an endpoint that exposes one of the owner's domain operations: the owner keeps its invariants inside, and its refusal reaches the caller at once.

forbidden:

- **past the contract** — a write to a peer's storage: its dao, its tables; or an endpoint that exposes dao access (`svcPayments.upsertPayment`) rather than a domain operation
- **overt, asynchronous** — `RefundPayment` on the bus, a task enqueued into another service's queue. no refusal reaches the sender, so a failure leaves it to undo or retry another service's act
- **disguised** — an order dressed as a fact: `RefundRequiredEvent`, `BoardReleaseNeededEvent`

## .why

a command message is a saga by another name:

- **concern boundaries** — the sender decides what the receiver does to its own data; the receiver answers to an outsider it may not know
- **compensation creeps back** — a command that fails, half lands, or lands late leaves the sender to undo or retry another service's act
- **the policy lives in the wrong service** — "a lesson canceled a day ahead refunds in full" is a payments rule, and a command writes it into lessons
- **a disguised command lies** — it declares a fact that never happened

## .not a command message

- an actor's request at a service's own entrypoint, about that service's own resources (a human clicks "refund" in the payments console)
- a peer's call to an endpoint that exposes one of the owner's domain operations (`svcPayments.refundPayment`, which runs payments' own refund operation, guards and all)
- a service's call to a vendor about its own resource there (`sdkStripe.setRefund` from payments)
- a task a service enqueues for itself
- a read

## .the smell

- an imperative message name on the bus: `Refund*`, `Release*`, `Send*`, `Create*`
- a peer-service client that exposes a dao method (`svcPayments.upsertPayment`), or a query that writes into a peer's tables
- an event named for a need: `*RequiredEvent`, `*NeededEvent`, `*RequestedEvent`, `Should*Event`
- a sender that waits on a bus for a reply from the service it told to act

## .the cure

1. **publish what happened in your own domain** — `LessonCanceledEvent`, self-contained, committed with its change (`pattern=transactional-outbox`)
2. **the consumer owns the policy** — payments subscribes, and its refund policy turns the fact into an act on its own resources
3. **the outcome is a fact too** — `PaymentRefundedEvent` or `RefundDeclinedEvent`
4. **a publisher that needs the outcome waits on that fact** — an async task re-checks for it (`pattern=async-task`), never for a reply

```ts
// 👎 lessons writes past payments' domain operations
await svcPayments.upsertPayment({ payment: { ...lesson.payment, status: 'REFUNDED' } });

// 👎 lessons orders payments on the bus; a refusal never reaches lessons
await bus.emit({ type: 'RefundPayment', payment: lesson.payment });

// 👍 lessons calls payments' own domain operation; payments' guards run, and a refusal returns at once
await svcPayments.refundPayment({ payment: lesson.payment });

// 👍 or lessons publishes its own fact, and payments decides
await setLessonCanceled({ lesson }, context); // commits LessonCanceledEvent with the change
// in payments: onLessonCanceledEvent → refund policy → PaymentRefundedEvent | RefundDeclinedEvent
```

## .enforcement

- a write to a peer's storage, or an endpoint that exposes dao access to another of our services = **blocker**. harm: the owner's invariants run on no path the peer takes
- an imperative message, or a task enqueued into a peer's queue, that orders a peer to change its resources = **blocker**. harm: a failed or half-landed act leaves the sender to undo another service's change
- an event named for a need rather than a deed = **blocker**

## .see also

- `rule.require.consumer-decides` — the require twin
- `catalog.of=pattern.event._` — `pattern=command-message` (forbid), `pattern=consumer-decides` (the cure)
- `rule.forbid.sagas` — the same law, on the transaction side
- `pattern=one-writer-per-resource` — the owner is the only writer, and it writes by its own decision
