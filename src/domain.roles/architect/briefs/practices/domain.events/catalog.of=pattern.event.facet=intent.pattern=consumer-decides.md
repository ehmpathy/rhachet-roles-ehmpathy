# catalog.of=pattern.event.facet=intent.pattern=consumer-decides

a member of `catalog.of=pattern.event._` · facet `intent` · verdict `require` · tier `root` · rule `rule.require.consumer-decides`.

## .keeps

no service orders another on a path the owner cannot refuse. each consumer reads facts and decides, by its own policy, what to do to its own resources. a peer's call to an endpoint that exposes one of the owner's domain operations stays: the owner's guards run, and its refusal returns at once.

## .require when

a change in one part of the domain should cause an act in another: a canceled lesson should refund its payment, free its board, and email the surfer.

## .the move

1. **publish what happened, in your own domain.** `LessonCanceledEvent`, past tense, self-contained (`pattern=domain-event`, `pattern=self-contained-fact`). never what another service should do
2. **the consumer owns the policy.** payments subscribes to `LessonCanceledEvent`; its refund policy turns the fact into an act: canceled a day ahead → refund in full; less → refund half. the rule lives with the service whose resource it changes
3. **the consumer acts on its own resources only, then publishes its own fact.** `PaymentRefundedEvent` or `RefundDeclinedEvent` — the outcome is a fact too
4. **a publisher that needs the outcome waits on the fact.** an async task re-checks for `PaymentRefundedEvent`, never for a reply (`pattern=async-task`)

## .the failure it prevents

a refund rule split across two services; a sender that must undo another service's half-landed act; a receiver that cannot refuse an order it never agreed to.

## .source

### converge

> "Another style of collaboration is Event Collaboration. In this style you never have one component asking another to do anything, instead each component signals an event when anything changes. Other components listen to that event and react however they wish to." — fowler, "focusing on events", 2006 ✅

> "Instead of components making requests when they need something, components raise events when things change. Other components then listen to events and react appropriately." — fowler, "event collaboration", 2006 ✅

### contrast

> "Commonly I see a mix of the two styles, with request/response usually dominating." — fowler, "focusing on events", 2006 ✅

**bound**: request/response stays for reads and for an actor at the owner's own entrypoint. between our services, a change moves only by fact (`rule.forbid.command-messages`).
