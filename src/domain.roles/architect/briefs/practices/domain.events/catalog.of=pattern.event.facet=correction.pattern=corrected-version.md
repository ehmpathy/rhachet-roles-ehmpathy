# catalog.of=pattern.event.facet=correction.pattern=corrected-version

a member of `catalog.of=pattern.event._` · facet `correction` · verdict `require` · tier `root` · rule `rule.require.corrected-versions`.

## .keeps

a fact whose report was wrong is published again under the same unique key and `occurredAt`, with a newer `observedAt`. the newer version overrules the older; both stay in the stream.

## .require when

our report of a fact was wrong, and the world did not move on: the amount was misread, the lesson date mistyped, the surfer ref swapped. the occurrence is the same, so `occurredAt` stays; the system learned a truer report later, so `observedAt` moves forward.

## .the test — which correction?

> **was our report wrong, or did the world change?**

- the report was wrong → a corrected version, here
- the world changed — the surfer canceled, the card was refunded → a new fact (`pattern=correction-event`)

## .the move

1. **same unique key.** the fact's natural key: what happened, to which resource. a payment is captured once, so `PaymentCapturedEvent` is unique on its payment
2. **same `occurredAt`, newer `observedAt`.** `observedAt` is when the system learned what this version reports, so it is the version: it strictly increases per unique key, and an optimistic lock at the write refuses a stale one (`pattern=optimistic-lock`). no third stamp — an `updatedAt` on an event would be a synonym of `observedAt` (`pattern=two-time-points`)
3. **the newer overrules the older.** every consumer applies the latest version it has seen, and skips any older one (`pattern=latest-version-wins`). the older stays in the stream: the record of what we once said
4. **the entity moves with it.** the owner's entity and the new version commit in one transaction (`pattern=transactional-outbox`), so the corrected entity and the corrected fact land together
5. **each consumer corrects forward.** it compares the new version with the one it applied, and acts on the difference in its own records: a refund of the overcharge, never a reversal of the charge

## .the failure it prevents

a wrong report that no consumer can ever fix; a "fix" that edits the old version in place, so no one can tell what was said and when; a correction declared as a new kind of fact, so every consumer must learn to pair it with the one it overrules.

## .source

### converge — the kind

> "A incorrect event is an event where you received incorrect information about the event." — fowler, "retroactive event", 2005 ✅

> "Although the source data can never change, it may be that the system needs to handle a change - typically because the original event was incorrect." — fowler, "domain event", 2005 ✅

### contrast — the fix

fowler rewinds the log to the wrong event, rejects it, inserts the replacement, and replays forward (`pattern=retroactive-replay`, forbid). ours never rewinds: the newer version lands at the head of the stream, and each consumer applies it when it arrives. the older version's source data never changes; it is overruled, not rewritten.
