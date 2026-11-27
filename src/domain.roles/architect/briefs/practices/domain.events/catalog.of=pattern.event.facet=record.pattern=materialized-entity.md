# catalog.of=pattern.event.facet=record.pattern=materialized-entity

a member of `catalog.of=pattern.event._` · facet `record` · verdict `require` · tier `root` · rule `rule.require.materialized-entities`.

## .keeps

the entity is the conclusion of its facts: the latest version of every fact about it, materialized as one record, committed in the same transaction as each fact. every live read and every write-time check reads the entity; no one replays to learn what is.

## .the invariant

> **each entity equals the conclusion of the latest version of every fact about it.**

declared on the entity, in domain words; enforced by structure, never by a guard in a caller (`rule.forbid.scattered-invariant-guards`):

- **one write path** — the operation that commits a fact commits the entity change it implies, in one transaction (`pattern=transactional-outbox`). no path writes one without the other
- **constraints in storage** — the entity's own invariants (a unique natural key, a check, a guarded status edge, an optimistic lock) refuse a commit that breaks them (`pattern=unique-constraint-on-natural-key`, `pattern=guarded-status-transitions`, `pattern=optimistic-lock`)
- **a pure materialization to rebuild** — the transform from facts to entity has no side effect, so a defect in it is repaired by a fresh materialization from the stream (`pattern=replayable-fact-stream`)
- **a test that proves it** — materialize the stream from empty, compare to the entity; any difference is a defect

the convergence lives upstream, in that one write. every reader downstream reads one record and trusts it.

## .require when

every owner of a resource that publishes facts about it.

## .the move

1. **declare the fact, then the entity it implies** — `LessonCanceledEvent` implies `lesson.status: CANCELED`
2. **commit both in one transaction** — the fact into the outbox, the entity by its upsert
3. **let storage refuse the break** — constraints and optimistic locks on the entity, so a racer's commit fails rather than slips by
4. **when the two disagree, the facts win** — fix the transform, materialize again from the stream, and the entity is rebuilt. the facts are the record of what happened; the entity is the conclusion of them

## .the failure it prevents

a live read that waits on a replay; an invariant checked against a stale projection; an entity whose value traces to no fact; a fact whose implied change never landed.

## .an endpoint mutation

an actor's request at a service's own entrypoint is an act, not yet a fact. the service decides; only the accepted outcome is a fact.

```
app → POST /lessons/:uuid/cancel   the request: an act; the service may refuse it
svc → checks policy and invariants
svc → appends a version record        lesson.status = CANCELED, as of observedAt
    → moves the current pointer    the entity, in the same transaction
    → commits LessonCanceledEvent  into the outbox, when a peer or a rebuild needs the deed
```

our upsert only inserts: it finds or inserts the static record, appends a version only on change, and moves the pointer forward only. so the two truths hold here too:

| kept | the record | the conclusion | a defect is repaired by |
|---|---|---|---|
| versions only | the version records — what the entity became, never why | the current pointer | a newer version, fixed forward; no deeper record remains to materialize from |
| versions and a domain event | the event — the deed, with the data to recompute | the pointer, over its versions | a fresh materialization from the events, written as a newer version |

the version history is never rewritten in either case: a repair appends.

## .two truths, named apart

"source of truth" names two things, and a brief that says it bare reads two ways. say which:

| the question | the authority | when they disagree |
|---|---|---|
| what happened? | the facts — append-only, kept forever | the facts win |
| what is, right now? | the entity — the conclusion, one read away | the entity is rebuilt from the facts |

the entity is the truth you act on; the facts are the truth you answer to.

## .source

### converge

> "The official system of record can either be the event logs or the current application state. If the current application state is held in a database, then the event logs may only be there for audit and special processing." — fowler, "event sourcing", 2005 ✅

> "The truth is the log. The database is a cache of a subset of the log. That cached subset happens to be the latest value of each record and index value from the log." — helland, "immutability changes everything", cidr 2015 ✅

> "There is a facinating duality between a log of changes and a table. The log is similar to the list of all credits and debits and bank processes; a table is all the current account balances." — kreps, "the log", linkedin engineering, 2013 ✅

### narrow

fowler offers the two as a choice. we keep both and bind them: the facts are the record of what happened, the entity their conclusion, committed together — never one without the other.

### contrast

> "A materialized view is just a cached subset of the log, and you could rebuild it from the log at any time." … "This separation of reads and writes is really the key idea here." — kleppmann, "turning the database inside-out", 2015 ✅

kleppmann writes to the log first and lets each view catch up in a separate job. **bound**: a live write checks its rules against what is, so the entity it reads cannot lag. his own caveat names the reason: "Going through a leader would still be useful if you want to validate that writes meet certain constraints before writing them to the log." we keep that leader, and call it the entity. a copy that lags serves only the analytical reads (`rule.forbid.cqrs`).
