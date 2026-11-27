# rule.require.corrected-versions

## .what

when our report of a fact was wrong, and the world did not change, publish the fact again: same unique key, same `occurredAt`, a newer `observedAt`. the newer version overrules the older; both stay in the stream.

## .the test — which correction?

> **was our report wrong, or did the world change?**

- the report was wrong — the amount misread, the lesson date mistyped → a corrected version, here
- the world changed — the surfer canceled, the card was refunded → a new fact (`rule.require.correction-events`)

## .the smell

```ts
// 👎 edits the published fact in place
await context.daoOutbox.set({ event: { ...captured, amount: 'USD 45.00' } });

// 👎 or declares a new kind of fact for a misread amount
await emit(new PaymentAmountFixedEvent({ payment, amount: 'USD 45.00' }));
```

the first leaves no record of what was said, and when. the second makes every consumer learn to pair it with the fact it overrules.

## .the cure

1. **same unique key** — the fact's natural key: what happened, to which resource. a payment is captured once, so `PaymentCapturedEvent` is unique on its payment
2. **same `occurredAt`, newer `observedAt`** — `observedAt` is when the system learned what this version reports, so it is the version. it strictly increases per unique key, and an optimistic lock at the write refuses a stale one (`pattern=optimistic-lock`)
3. **the newer overrules the older** — every consumer applies the latest version it has seen (`rule.require.latest-version-wins`); the older stays, the record of what we once said
4. **the entity moves with it** — the owner's entity and the new version commit in one transaction (`rule.require.materialized-entities`)
5. **each consumer corrects forward** — it compares the new version with the one it applied, and acts on the difference in its own records: a refund of the overcharge, never a reversal of the charge

> "A incorrect event is an event where you received incorrect information about the event." — fowler, "retroactive event", 2005 ✅

## .enforcement

- a published fact edited in place, or deleted, to fix a wrong report = **blocker** — no one can tell what was said, and peers that acted on it disagree with the record
- a corrected version whose `observedAt` is not newer than the one it overrules = **blocker** — consumers skip it as stale, and the wrong report stands
- a wrong report fixed by a new kind of fact = **nitpick**

## .see also

- `catalog.of=pattern.event.facet=correction.pattern=corrected-version` — the full member, with its sources
- `rule.forbid.retroactive-replay` — the forbid twin: a rewind to fix the past
- `rule.require.correction-events` — the other correction, when the world moved on
- `rule.require.two-time-points` — why `observedAt` is the version
