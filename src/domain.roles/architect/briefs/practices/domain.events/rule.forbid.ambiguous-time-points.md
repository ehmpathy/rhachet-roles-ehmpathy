# rule.forbid.ambiguous-time-points

## .what

never publish a fact with one time point, or with a time point whose name does not say which. every fact carries `occurredAt` and `observedAt`.

## .the smell

```ts
// 👎 one stamp: when the swipe happened, or when the settlement reached us?
await emit(new PaymentSettledEvent({ payment, createdAt: asIsoTimeStamp(new Date()) }));

// 👎 the occurrence alone: a corrected report has no version to win by
await emit(new LessonConfirmedEvent({ lesson, occurredAt }));
```

the tells:

- a fact with a bare `timestamp`, `date`, `time`, or `createdAt`
- a fact with `occurredAt` and no `observedAt`, or the reverse
- a consumer that versions a fact by arrival time, since the fact names none

## .why

- **a late fact sorts wrong** — a card swiped tuesday and settled friday lands in friday's statement
- **a correction cannot win** — a corrected version keeps `occurredAt` and moves `observedAt` forward; with no `observedAt`, a consumer has no stamp to keep the newest by (`rule.require.latest-version-wins`)
- **two readers read one field two ways** — the month-end report and the audit disagree with no error

## .the cure

carry both, as `IsoTimeStamp`: `occurredAt` (when it happened in the world) and `observedAt` (when this system learned of it, and the version of the report). order by the one the question asks (`rule.require.two-time-points`).

## .enforcement

- a fact with no `observedAt`, or with one time point only = **blocker** — a corrected report cannot overrule the wrong one, and a late fact sorts as if it happened when it arrived
- a time point whose name does not say which = graded by `rule.prefer.occurred-observed` (mechanic)

## .see also

- `rule.require.two-time-points` — the require twin
- `catalog.of=pattern.event.facet=time.pattern=two-time-points` — the full member, with its sources
- `rule.prefer.occurred-observed` (mechanic) — the two field names
