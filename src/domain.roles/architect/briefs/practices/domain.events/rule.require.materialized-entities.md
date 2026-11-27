# rule.require.materialized-entities

## .what

every owner that publishes facts keeps the entity they conclude: the latest version of every fact about it, materialized as one record, committed in the same transaction as each fact. every live read and every write-time check reads the entity. when facts and entity disagree, the facts win and the entity is rebuilt.

## .the smell

```ts
// 👎 the fact and its entity change commit apart
await context.daoOutbox.set({ event: new LessonCanceledEvent({ lesson }) });
await context.daoLesson.upsert({ lesson: lesson.clone({ status: 'CANCELED' }) });
// two transactions: a crash between them leaves a fact whose change never landed
```

the tells:

- the fact write and the entity write in two transactions, or two services
- an entity value that traces to no fact
- a live read or a write-time check against a copy that lags
- a read that replays facts to learn what is (`rule.forbid.replay-on-read`)

## .the cure

the invariant: **each entity equals the conclusion of the latest version of every fact about it.** enforce it by structure, never by a guard in a caller (`rule.forbid.scattered-invariant-guards`):

1. **one write path** — the operation that commits a fact commits the entity change it implies, in one transaction (`pattern=transactional-outbox`)
2. **constraints in storage** — a unique natural key, a check, a guarded status edge, an optimistic lock refuse a commit that breaks the entity (`pattern=unique-constraint-on-natural-key`, `pattern=guarded-status-transitions`, `pattern=optimistic-lock`)
3. **a pure materialization** — the transform from facts to entity has no side effect, so a defect in it is repaired by a fresh materialization from the stream (`rule.require.replayable-fact-streams`)
4. **a test that proves it** — materialize the stream from empty, compare to the entity; any difference is a defect

**an endpoint mutation** — a request at the owner's entrypoint, from an actor or from a peer through one of the owner's domain operations, is an act, not yet a fact. the service may refuse it; only the accepted outcome is a fact: a version record, a domain event, or both in one transaction. where only versions are kept, they are the record, and a defect is fixed forward with a newer version.

> "The truth is the log. The database is a cache of a subset of the log. That cached subset happens to be the latest value of each record and index value from the log." — helland, "immutability changes everything", cidr 2015 ✅

## .enforcement

- a fact and its entity change committed in two transactions = **blocker** — a fact ships for a change that never landed, or a change ships that no fact records
- a live read or a write-time check against a copy that lags = **blocker** — an invariant is checked against a past the entity already left (`rule.forbid.cqrs`)
- an owner with no test that materializes its stream from empty and compares to the entity = **nitpick**

## .see also

- `catalog.of=pattern.event.facet=record.pattern=materialized-entity` — the full member: the endpoint flow, the two truths, the sources
- `rule.forbid.replay-on-read` — the forbid twin: no entity, a replay on each read
- `philosophy.entities-are-materialized-from-events` — the why
- `rule.require.replayable-fact-streams` — the record the entity is rebuilt from
