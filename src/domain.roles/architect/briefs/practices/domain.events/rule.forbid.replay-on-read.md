# rule.forbid.replay-on-read

## .what

never let an owner keep no entity and derive what is by a replay of its events, at read time (fowler's "event sourcing", in its form with no entity record). the facts are the record of what happened; the entity is their conclusion, materialized and committed with each fact; when they disagree, the facts win and the entity is rebuilt.

## .the database already is one

under the hood, a database is a log with a materialized view on top: each write lands first in its write-ahead log, each table is the conclusion of that log, a replica replays it, and point-in-time recovery rewinds it. the engine already owns what this design needs — checkpoints, compaction, concurrency, a replay safe by construction.

⇒ the forbid targets the hand-rolled copy of that engine in application code, with domain events as its log. use the engine's log through the engine: an entity for what is, the fact stream for the domain's record, change-data capture where a peer needs the raw changes.

> "Since the log is immediately persisted it is used as the authoritative source in restoring all other persistent structures in the event of a crash." … "the sequence of changes that happened on the database is exactly what is needed to keep a remote replica database in sync." — kreps, "the log", linkedin engineering, 2013 ✅

> "Event Sourcing—As far as I can tell this is basically the enterprise software engineer's way of saying "state machine replication"." — kreps, 2013 ✅

## .why

- **slow for a live read** — each read pays for the materialization again; a snapshot only shortens the replay
- **harder to reason about** — what is lives nowhere; a reader must simulate the replay to know a value
- **invariants have no home** — no entity record, so storage cannot refuse a commit that breaks one (`rule.forbid.check-then-write`)
- **every external call and read must be replay-safe** — or a replay charges twice, or reads today's rate for last month's fact
- **it invites the rewind** — a value derived by replay is set right by a replay (`rule.forbid.retroactive-replay`)

## .not a replay on read

- a fact stream kept beside the entity, which consumers replay to repair their own records (`pattern=replayable-fact-stream`)
- a pure materialization from the facts, run once to rebuild an entity after a defect in its transform — a repair, never the read path

## .the smell

- an aggregate with no table of its own, rebuilt from its events on each read
- a snapshot job with no entity behind it
- a write path that loads the event stream to check a rule before it appends

## .the cure

materialize the entity (`pattern=materialized-entity`):

1. **one write path** — the operation that commits a fact commits the entity change it implies, in one transaction (`pattern=transactional-outbox`)
2. **constraints in storage** — unique natural key, checks, guarded status edges, optimistic locks refuse a commit that breaks the entity's invariants
3. **a pure materialization** — the transform from facts to entity has no side effect, so a defect in it is repaired by a fresh materialization
4. **prove it** — a test materializes the stream from empty and compares the result to the entity

the invariant: each entity equals the conclusion of the latest version of every fact about it. the convergence lives upstream, in that one write; every reader downstream reads one record.

## .enforcement

- an owner whose only record of what is comes from a replay of its events = **blocker**
- a live read or a write-time check that replays the stream = **blocker**
- a fact committed without the entity change it implies, or the reverse = **blocker**

## .see also

- `rule.require.materialized-entities` — the require twin; `rule.require.replayable-fact-streams` — the stream a repair replays
- `catalog.of=pattern.event._` — `pattern=replay-on-read` (forbid), `pattern=materialized-entity` (the cure), `pattern=replayable-fact-stream` (require)
- `rule.forbid.retroactive-replay` — the correction this design invites
- `rule.forbid.cqrs` — the entity materialized after its fact, read by live writes
