# catalog.of=pattern.event.facet=intent.pattern=domain-event

a member of `catalog.of=pattern.event._` · facet `intent` · verdict `require` · tier `root` · rule `rule.require.domain-events`.

## .keeps

a message names what happened, in the past tense, in domain words; what it records of the world never changes.

## .require when

a change in one resource matters to another part of the domain: a refund, a confirmed lesson, a waiver signed.

## .the move

1. **name the fact, past tense.** `PaymentRefundedEvent`, `LessonConfirmedEvent`, `WaiverSignedEvent` — a verb that happened, on the noun it happened to. never `RefundPayment` (an order) or `PaymentUpdate` (a vague change)
2. **declare it as a domain object.** `class PaymentRefundedEvent extends DomainEvent<PaymentRefundedEvent>`, with the refs and values that describe the fact
3. **keep its source data immutable.** what the event records of the world is set once. what a peer does in response lives in that peer's own records, never on the event
4. **commit it with its change.** the fact and the change it describes land in one transaction (`pattern=transactional-outbox`)

## .the failure it prevents

a message no reader can parse without the sender's code in hand; an event edited after a peer acted on it; a change that commits with no fact, or a fact for a change that rolled back.

## .source

### converge

> "In essence a Domain Event signals something that has happened in the outside world that is of interest to the application." — fowler, "focusing on events", 2006 ✅

> "I characterize the data on a Domain Event as immutable source data that captures what the event is about and mutable processing data that records what the system does in response to it." — fowler, "domain event", 2005 ✅

where we part: fowler keeps the mutable processing data on the event. we keep it on the peer, so the event stays one immutable fact and each peer owns what it did.
