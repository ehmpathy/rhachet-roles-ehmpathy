# rule.forbid.thin-notifications

## .what

never publish an event that carries only an id and a link back. a fact carries the data its reaction needs, as of the moment it happened. a peer never calls the publisher back to learn what the fact was.

## .why

- **the callback reads now, not then** — the record may have moved on since the fact; the peer acts on the wrong values
- **the publisher serves every peer** — one read per listener per fact; its outage stalls every reaction
- **a replay gives a different answer** — the same fact, read back tomorrow, yields other values
- **the stream stops to be evidence** — a message with no fact in it proves naught of what happened

## .not an exception

- **pii** — a peer that would need raw pii to react never fetches it. the pii's owner reacts to the fact and acts through its quarantine (`rule.require.pii-quarantine`); the fact carries a ref or a concept (`consentRequired: 'PARENT'`)
- **size** — a large payload rides as a ref to an immutable copy of that version, written with the fact; never to the live record

## .the smell

- an event whose payload is `{ id }` or `{ uuid, href }`
- a handler whose first line reads the publisher's dao or api for the resource the fact names
- a peer-service client called from an event handler to "hydrate" the fact

## .the cure

```ts
// 👎 thin: the peer must call back, and reads the payment as it is now
new PaymentRefundedEvent({ payment: { uuid } });

// 👍 self-contained: the fact as it happened
new PaymentRefundedEvent({ payment: { uuid }, amount: 'USD 50.00', occurredAt, observedAt });
```

carry the fact whole (`pattern=self-contained-fact`).

## .enforcement

- an event that carries an id and a link in place of the fact = **blocker**
- an event handler that calls the publisher back to learn what the fact was = **blocker**
- raw pii fetched by a peer to react to a fact = **blocker**

## .see also

- `rule.require.self-contained-facts` — the require twin
- `catalog.of=pattern.event._` — `pattern=thin-notification` (forbid), `pattern=self-contained-fact` (the cure)
- `rule.forbid.pii-egress` — what a fact may never carry
