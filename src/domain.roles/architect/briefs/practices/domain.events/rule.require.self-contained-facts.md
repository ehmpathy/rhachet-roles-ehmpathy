# rule.require.self-contained-facts

## .what

a fact carries the data its reaction needs, as of the moment it happened, so a peer reacts with no call back to the sender. never raw pii.

## .the smell

```ts
// 👎 a peer reacts to an id, then reads today's record
const payment = await sdkPayments.getOnePayment({ by: { ref: fact.payment } });
await sendRefundReceipt({ surfer: payment.surfer, amount: payment.amountRefunded });
// a second refund landed after the first fact; this receipt names the sum of both
```

the tells:

- a payload of only an id and a link back (`rule.forbid.thin-notifications`)
- a peer that calls the sender once per fact it receives
- a payload that copies the whole resource, where a few fields serve
- a birth date, an email, or a phone number in a payload

## .the cure

1. **carry what the fact is about, as of the moment** — `{ payment: { ref }, amount: 'USD 50.37', refundedAt }`: what was true when it happened, never a pointer to what is true now
2. **carry only that** — the fact, not the whole resource. a peer that needs more reads the owner's contract, at the version the fact names
3. **never raw pii** — a fact is an egress. carry a ref or a concept (`consentRequired: 'PARENT'`), never a birth date (`rule.forbid.pii-egress`)
4. **declare the shape as a contract** — peers parse it at the boundary; a change to its shape is a contract change, versioned as one

> "What we gain is greater resilience, since the recipient systems can function if the customer system is becomes unavailable." — fowler, "what do you mean by 'event-driven'?", 2017 ✅

where we part: fowler's pattern copies the whole customer into every peer. we carry the fact, not the customer, so each peer keeps only what it acts on, and pii never leaves the owner.

## .enforcement

- a fact whose reaction needs a call back to the sender = **blocker** — the peer reads values that moved on since the fact, and acts on the wrong amount
- raw pii in a fact = **blocker** (`rule.forbid.pii-egress`)
- a fact that copies the whole resource where a few fields serve = **nitpick**

## .see also

- `catalog.of=pattern.event.facet=payload.pattern=self-contained-fact` — the full member, with its sources
- `rule.forbid.thin-notifications` — the forbid twin: an id and a link back
- `rule.forbid.pii-egress` — what a fact may never carry
- `rule.require.domain-events` — the fact this payload belongs to
