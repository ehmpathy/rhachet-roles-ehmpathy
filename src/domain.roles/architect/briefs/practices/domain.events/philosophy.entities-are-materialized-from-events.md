# philosophy.entities-are-materialized-from-events

## .the claim

every entity is materialized from the events seen. a `Lesson`, a `Surfer`, a balance — each is the conclusion of the facts that reached the system, never a record apart from them.

## .the claim reaches past software

a mind works the same way. no one perceives a wave directly. a stream of sensory events arrives — light on the eye, the roar in the ear, the pull of the water on the legs — and the mind concludes from them the concept *wave*. the concept is a conclusion, revised as new events arrive. every interpretation of the world is a materialized view over the events that streamed in.

software only makes the materialization explicit.

## .what follows

1. **the facts are the record; the entity is the conclusion.** collect the facts first, and keep them: a lost fact cannot be concluded again, a lost entity can be materialized again (`pattern=replayable-fact-stream`)
2. **a conclusion still earns its place.** a mind that re-derived *wave* from raw light on each glance could never surf. so too a system: materialize the conclusion, and read it in one step (`pattern=materialized-entity`, `rule.forbid.replay-on-read`)
3. **a conclusion acts; the facts answer.** the entity is the truth you act on — every live read, every write-time check. the facts are the truth you answer to — when the two disagree, the facts win and the entity is materialized again
4. **a report can be wrong; the world can change.** a truer report overrules an older one (`pattern=corrected-version`); a changed world arrives as a new fact (`pattern=correction-event`). neither erases what was once reported
5. **order of arrival is not order of the world.** the thunder arrives after the flash, and the mind still knows they were one strike. a consumer applies facts by what they say, not by when they arrived (`pattern=latest-version-wins`, `pattern=two-time-points`)
6. **the database is the same materialization, one level down.** its write-ahead log is the record; its tables are the conclusion (`pattern=replay-on-read`, § the database already is one)
7. **a request is an act, not yet a fact.** a surfer's tap on "cancel" asks; the service may refuse. only the accepted outcome is a fact — a version record, a domain event, or both in one transaction. where only versions are kept, they are the record: each says what the entity became, never why, and a defect is fixed forward with a newer version, since no deeper record remains to materialize from

## .the test

> **for any value a system keeps: which facts is it the conclusion of?**

name them → the value is grounded · none → it is a guess dressed as a fact; record the fact it came from.

## .source

### converge

> "The log is the record of what happened, and each table or index is a projection of this history into some useful data structure or index." — kreps, "the log", linkedin engineering, 2013 ✅

> "The truth is the log. The database is a cache of a subset of the log." — helland, "immutability changes everything", cidr 2015 ✅

> "even if you use your database in the traditional way, overwriting old state with new state, the database's internal replication mechanism may still be translating those imperative statements into a stream of immutable events." — kleppmann, "turning the database inside-out", 2015 ✅

### extend

the canon makes the claim for databases. we make it for every entity a system keeps, and for the mind that reads the system.

## .see also

- `catalog.of=pattern.event._` — the law this grounds
- `pattern=materialized-entity` — the invariant: each entity equals the conclusion of the latest version of every fact about it
- `philosophy.invariants-are-the-source` (domain.constraints) — the invariants an entity keeps are what make its conclusion correct
- ahbode `philosophy.events-are-facts` — the same ground, from the ledger's side: an event is a reported claim, and an entity a belief concluded from the claims. we name the belief a conclusion, and bind it: committed with each fact, guarded by storage
