# catalog.of=pattern.event.facet=intent.pattern=command-message

a member of `catalog.of=pattern.event._` · facet `intent` · verdict **`forbid`**. `rule.forbid.command-messages` boots the ban.

## .what it is

one of our services changes another's resources by a path that skips the owner's domain operations, or that hides the order. three forms:

- **past the contract** — a write to a peer's dao or tables, or an endpoint that exposes dao access (`svcPayments.upsertPayment`) rather than a domain operation
- **overt, asynchronous** — an imperative on the bus, `RefundPayment`, or a task enqueued into the payments queue. no refusal reaches the sender
- **disguised** — an order dressed as a fact: `RefundRequiredEvent`, `BoardReleaseNeededEvent`. fowler's "passive-aggressive command"

a peer's call to an endpoint that exposes one of the owner's domain operations is not one: the owner's guards run, and a refusal returns to the caller at once.

## .why it is an antipattern

it is a saga by another name:

- **concern boundaries** — the sender decides what the receiver does to its own data. the receiver now answers to an outsider, often one it cannot name
- **the sender owns a plan for the receiver's failure** — a command that fails, half lands, or lands late leaves the sender to undo or retry another service's act. that is a compensation
- **the policy lives in the wrong place** — "a lesson canceled a day ahead refunds in full" is a payments rule. a command writes it into the lesson service
- **a disguised command lies** — `RefundRequiredEvent` declares naught that happened; the log now holds a wish as history

## .what is not a command message

- an actor's request at a service's own entrypoint, about that service's own resources — a human clicks "refund" in the payments console. the actor owns the intent; the service owns the decision
- a peer's call to an endpoint that exposes one of the owner's domain operations — `svcPayments.refundPayment` runs payments' own refund operation, with its guards. the owner can refuse, and the caller hears it at once
- a service's call to a vendor, about the service's own resource there — `sdkStripe.setRefund` from payments is payments' own act (`define.domain-operation-grains`, communicator)
- a task a service enqueues for itself (`pattern=async-task`)
- a read of another service's contract. a query orders no one

## .the smell

- an imperative message name: `Refund*`, `Release*`, `Send*`, `Create*` on the bus
- a client for a peer service with a dao method in it: `svcPayments.upsertPayment`, `svcInventory.setBoardRecord`
- an event named for a need: `*RequiredEvent`, `*NeededEvent`, `*RequestedEvent`, `Should*Event`
- a sender that waits for a reply from the service it told to act

## .the cure

publish what happened in your own domain (`LessonCanceledEvent`). the owner of each other resource subscribes, decides by its own policy, acts on its own resources, and publishes its own fact (`PaymentRefundedEvent` or `RefundDeclinedEvent`). a sender that needs the outcome waits on that fact (`pattern=consumer-decides`).

## .source

### converge

> "Events, however, just communicate that something happened - with an event you let a system know that Y has happened." — fowler, "focusing on events", 2006 ✅

> "A simple example of this trap is when an event is used as a passive-aggressive command." — fowler, "what do you mean by 'event-driven'?", 2017 ✅

### contrast — and our response

> "This happens when the source system expects the recipient to carry out an action, and ought to use a command message to show that intention, but styles the message as an event instead." — same ✅

fowler's cure for the disguised form is the overt form. **rebut**: the intent to act is the receiver's, never the sender's. a sender with a real need publishes the fact that creates the need; the receiver decides.

> "if you want central management of data, you'll need two kinds of event - requests to update data, which should be ignored by everything but the managing application, and confirmed updates which everyone acts on." — fowler, "event collaboration", 2006 ✅

**narrow**: a request at the owner's own entrypoint stays — from an actor, or from a peer through an endpoint that exposes one of the owner's domain operations. a request past those operations, or an order sent on the bus, does not.
