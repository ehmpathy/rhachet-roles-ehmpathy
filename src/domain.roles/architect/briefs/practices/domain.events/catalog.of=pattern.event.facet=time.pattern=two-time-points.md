# catalog.of=pattern.event.facet=time.pattern=two-time-points

a member of `catalog.of=pattern.event._` · facet `time` · verdict `require` · tier `root` · rule `rule.require.two-time-points` · forbid twin `rule.forbid.ambiguous-time-points`.

## .keeps

a fact names when it occurred in the world and when the system observed it, as two named stamps; no reader confuses the two.

## .require when

every fact. most have both stamps equal; the ones that differ are the ones that matter — a card swiped tuesday, settled friday.

## .the move

1. **two fields, one pair.** `occurredAt` — when it happened in the world. `observedAt` — when this system learned of it. never a bare `timestamp`, `date`, or `createdAt` (`rule.prefer.occurred-observed`, mechanic)
2. **both are `IsoTimeStamp`.** utc, cast at the boundary (`rule.forbid.any-time`)
3. **order by the one the question asks.** a statement of the month asks `occurredAt`; an audit of what we knew, and when, asks `observedAt`
4. **`observedAt` is the version; there is no third stamp.** a corrected version keeps the unique key and `occurredAt`, and carries a newer `observedAt`: the system learned a truer report, later (`pattern=corrected-version`). a consumer applies the newest `observedAt` per unique key (`pattern=latest-version-wins`). an `updatedAt` on an event would name the same instant twice — a synonym, so never declare one. the pair is bitemporal: `occurredAt` is valid time, `observedAt` is transaction time

## .the failure it prevents

a late fact sorted as if it happened when it arrived; a report that disagrees with itself across a month end; a field named `time` that two readers read two ways.

## .source

### converge

> "When doing this it's important to consider two Time Point that could be stored with the event: the time the event occurred in the world and the time the event was noticed ." … "The danger is picking one Time Point, and not being clear which Time Point you picked, either at the time or later. So I also suggest you name the Time Point clearly to indicate which one it is." — fowler, "domain event", 2005 ✅

where we part: fowler's second word is "noticed". ours is "observed" — the peer of "occurred" in prefix and length, and free of the "notice" a notification sends.
