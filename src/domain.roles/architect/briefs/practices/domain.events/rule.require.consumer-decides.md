# rule.require.consumer-decides

## .what

no service orders another to change its resources on a path the owner cannot refuse. each publishes what happened in its own domain; each consumer reads the facts and decides, by its own policy, what to do to its own resources. a peer may still call an endpoint that exposes one of the owner's domain operations: the owner's guards run, and its refusal returns at once.

## .the smell

```ts
// 👎 in cancelLesson — the lesson service owns the refund policy and orders payments, on the bus, to act
const amount = isCanceledDayAhead({ lesson })
  ? lesson.price
  : priceDivide({ of: lesson.price, by: 2 });
await bus.emit({ type: 'RefundPayment', payment: lesson.payment, amount });
```

the refund rule now lives in the lesson service, but the payment it changes lives in another. no refusal from payments reaches the lesson service, and a half-landed refund is the lesson service's to undo.

the tells:

- one service's policy decides a change to another service's resource, on a path where the owner cannot refuse
- a message on the bus that tells a peer what to do (`RefundPayment`, `ReleaseBoard`), or a write past the peer's domain operations
- a sender with an undo path for a peer's half-landed act

## .the cure

1. **publish what happened, in your own domain** — `LessonCanceledEvent`: past tense, self-contained (`rule.require.domain-events`, `rule.require.self-contained-facts`)
2. **the consumer owns the policy** — payments subscribes to `LessonCanceledEvent`; its refund policy turns the fact into an act: canceled a day ahead → refund in full; less → refund half
3. **the consumer acts on its own resources only, then publishes its outcome** — `PaymentRefundedEvent` or `RefundDeclinedEvent`; the outcome is a fact too
4. **a publisher that needs the outcome waits on the fact** — an async task re-checks for `PaymentRefundedEvent`, never for a reply (`pattern=async-task`)

> "Instead of components making requests when they need something, components raise events when things change. Other components then listen to events and react appropriately." — fowler, "event collaboration", 2006 ✅

**bound**: request/response stays for reads, for an actor at the owner's own entrypoint, and for a peer's call to an endpoint that exposes one of the owner's domain operations — the owner's guards run, and its refusal returns at once. between our services, an asynchronous change moves only by fact.

## .enforcement

- one service's policy that decides a change to another service's resource, on a path where the owner cannot refuse (an order on the bus, a write past its domain operations) = **blocker** — the rule splits across two services, and neither can keep it
- a publisher that blocks on a reply in place of the outcome fact = **nitpick**

## .see also

- `catalog.of=pattern.event.facet=intent.pattern=consumer-decides` — the full member, with its sources
- `rule.forbid.command-messages` — the forbid twin: an order between services, overt or dressed as a fact
- `rule.require.one-writer-per-resource` — the owner writes; peers publish and let it decide
- `rule.forbid.sagas` — the cure for a flow that spans services
