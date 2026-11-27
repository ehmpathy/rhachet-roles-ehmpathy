# catalog.of=pattern.event.facet=order.pattern=order-dependent-consumer

a member of `catalog.of=pattern.event._` · facet `order` · verdict **`forbid`**.

## .what it is

a consumer whose result depends on the order its facts arrive in.

## .why it is forbidden

- **no order is promised** — delivery is at least once; a retry, a second partition, a replay, or a late publisher reorders the stream. a first-in-first-out queue orders one channel, never the facts of two services
- **it is correct only by luck** — the defect waits for the first busy day, then corrupts records with no error
- **it forces a rewind** — the only cure for a consumer that needs order is to put late facts back in their place and replay (`pattern=retroactive-replay`, forbid)

## .the smell

- last write wins by arrival: an upsert with no version guard
- a status copied from the fact (`lesson.status = fact.status`) with no guarded edge
- a handler that throws, or drops the fact, when the fact it expects first is absent
- correctness that rests on a first-in-first-out queue, a single partition, or a sequence number across streams
- a comment that says facts "arrive in order"

## .the cure

apply each fact by unique key and version; keep the newest; move each status by a guarded edge; let a fact that needs another wait for it (`pattern=latest-version-wins`).

## .source

> "A component may continue operating, but it will be working on out of date information if it's not receiving events as things change. It may therefore initiate actions based on out of date information." — fowler, "event collaboration", 2006 ✅

fowler names the hazard of a stale or late fact; his cure for a late one is the rewind (`pattern=retroactive-replay`). ours forbids the consumer that would need it.
