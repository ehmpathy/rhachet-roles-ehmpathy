# rule.require.two-time-points

## .what

every fact names when it occurred in the world and when the system observed it: `occurredAt` · `observedAt`, both `IsoTimeStamp`. `observedAt` versions the report; no third stamp.

## .the smell

```ts
// 👎 one stamp, under a name two readers read two ways
class PaymentSettledEvent extends DomainEvent<PaymentSettledEvent> {
  public payment!: RefByUnique<typeof Payment>;
  public timestamp!: IsoTimeStamp;
}
```

a card swiped tuesday and settled friday: is `timestamp` tuesday or friday? a month-end statement and an audit each pick one, and the two disagree.

## .the cure

1. **two fields, one pair** — `occurredAt`: when it happened in the world. `observedAt`: when this system learned of it. never a bare `timestamp`, `date`, or `createdAt` (`rule.prefer.occurred-observed`, mechanic)
2. **both are `IsoTimeStamp`** — utc, cast at the boundary (`rule.forbid.any-time`, mechanic)
3. **order by the one the question asks** — a statement of the month asks `occurredAt`; an audit of what we knew, and when, asks `observedAt`
4. **`observedAt` is the version** — a corrected version keeps the unique key and `occurredAt`, and carries a newer `observedAt` (`rule.require.corrected-versions`). a consumer applies the newest `observedAt` per unique key (`rule.require.latest-version-wins`). an `updatedAt` on a fact would name that instant twice, so never declare one

> "The danger is picking one Time Point, and not being clear which Time Point you picked, either at the time or later. So I also suggest you name the Time Point clearly to indicate which one it is." — fowler, "domain event", 2005 ✅

## .enforcement

- a fact with no `observedAt`, or with one time point only = **blocker** — a corrected version has no stamp to win by, and a late fact sorts as if it happened when it arrived
- a time point named `timestamp`, `date`, `time`, or `createdAt` on a fact = graded by `rule.prefer.occurred-observed` (mechanic)
- a third stamp, `updatedAt`, on a fact = **nitpick**

## .see also

- `catalog.of=pattern.event.facet=time.pattern=two-time-points` — the full member, with its sources
- `rule.forbid.ambiguous-time-points` — the forbid twin
- `rule.prefer.occurred-observed` (mechanic) — the two field names
- `rule.forbid.any-time` (mechanic) — both are `IsoTimeStamp`
