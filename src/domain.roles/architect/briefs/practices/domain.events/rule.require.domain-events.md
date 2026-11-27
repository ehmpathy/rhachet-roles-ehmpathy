# rule.require.domain-events

## .what

a change that matters beyond its owner travels as a domain event: a fact, named in the past tense, in domain words. its source data never changes.

## .the smell

```ts
// 👎 an order dressed as a message, and a vague change
await sdkQueue.emit({ type: 'RefundPayment', paymentUuid });
await sdkQueue.emit({ type: 'LessonUpdate', lesson });

// 👎 a peer writes its reaction onto the event
event.receiptSentAt = asIsoTimeStamp(new Date());
```

the tells:

- a message name in the imperative, or with no verb (`RefundPayment`, `LessonUpdate`)
- a message no reader can parse without the sender's code in hand
- an event edited after a peer acted on it
- an event emitted outside the transaction of the change it describes

## .the cure

1. **name the fact, past tense** — `PaymentRefundedEvent`, `LessonConfirmedEvent`, `WaiverSignedEvent`: a verb that happened, on the noun it happened to. the name form is `rule.require.domain-event-suffix` (mechanic)
2. **declare it as a domain object** — `class PaymentRefundedEvent extends DomainEvent<PaymentRefundedEvent>`, with the refs and values that describe the fact
3. **keep its source data immutable** — what the event records of the world is set once. what a peer does in response lives in that peer's own records, never on the event
4. **commit it with its change** — the fact and the change land in one transaction (`pattern=transactional-outbox`)

> "I characterize the data on a Domain Event as immutable source data that captures what the event is about and mutable processing data that records what the system does in response to it." — fowler, "domain event", 2005 ✅

where we part: what the system does in response lives on the peer, so the event stays one immutable fact and each peer owns what it did.

## .enforcement

- a message between services that names an order or a vague change, not a past-tense fact = **blocker** — the receiver cannot tell what happened, so it cannot decide for itself
- an event mutated after it was published = **blocker** — peers that acted on the first version disagree with the record
- an event committed outside the transaction of its change = **blocker** — a fact ships for a change that rolled back, or a change ships with no fact
- the event's name form is graded by `rule.require.domain-event-suffix` (mechanic)

## .see also

- `catalog.of=pattern.event.facet=intent.pattern=domain-event` — the full member, with its sources
- `rule.forbid.command-messages` — the forbid twin: an order between services
- `rule.require.domain-event-suffix` (mechanic) — `[Noun][PastVerb]Event`
- `rule.require.self-contained-facts` — what the fact carries
