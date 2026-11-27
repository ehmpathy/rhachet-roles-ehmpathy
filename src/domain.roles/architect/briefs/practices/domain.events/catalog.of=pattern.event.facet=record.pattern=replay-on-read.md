# catalog.of=pattern.event.facet=record.pattern=replay-on-read

a member of `catalog.of=pattern.event._` · facet `record` · verdict **`forbid`**.

fowler's name is "event sourcing", in its form with no entity record. ours names the act: what is gets derived by a replay, at read time.

## .what it is

the owner keeps no materialized entity. to learn the current value of a resource — for a live read, or for a check before a write — it replays that resource's events, or reads a snapshot the replay produced and replays the rest.

## .what to keep from it

the facts as the record of what happened, append-only and kept forever (`pattern=replayable-fact-stream`). the forbid is narrower: only the absent entity, and the replay that stands in for it.

## .the database already is one

under the hood, a database is a log with a materialized view on top: each write lands first in its write-ahead log, each table is the conclusion of that log, a replica replays it, and point-in-time recovery rewinds it. the engine already owns what this design needs — checkpoints, compaction, concurrency, a replay safe by construction. the forbid targets the hand-rolled copy of that engine in application code, with domain events as its log. two logs, two grains:

| log | grain | kept | read by |
|---|---|---|---|
| the write-ahead log | physical: record and page changes, in the engine's format | until a checkpoint lets the engine compact it | the engine, its replicas, change-data capture |
| the fact stream | domain: what happened, in domain words | forever, as a formal data product | peers, and a consumer that repairs by replay |

## .why it is forbidden

- **slow for a live read** — each read pays for the materialization again; a snapshot only shortens the replay, it never removes it
- **harder to reason about** — what is lives nowhere; to read a value, a reader must simulate the replay in its head
- **invariants have no home** — with no entity record, storage cannot refuse a commit that breaks one; each check runs in code, on a value the code just replayed (`rule.forbid.check-then-write`)
- **every external call must be replay-safe** — a replay that re-sends a charge or an email is a second charge, a second email
- **every external read must be replayed as it was** — the exchange rate on the day of the fact, not today's
- **snapshots, restore, concurrency** — the database gave these for free; the replay owes each by hand
- **it invites the rewind** — a value derived by replay is set right by a replay (`pattern=retroactive-replay`, forbid)

## .the smell

- an aggregate with no table of its own, rebuilt from its events on each read
- a snapshot job with no entity behind it
- a write path that loads the event stream to check a rule before it appends

## .the cure

the materialized entity: the conclusion of the latest version of every fact, committed with each fact, guarded by storage constraints (`pattern=materialized-entity`).

## .the case fowler names, and why it is not ours

one processor, in memory, on one thread, at a volume no database could serve — a trade engine (lmax). that is a different kind of software than our repo mix; a repo that truly is one owes a decision record, not an exception to this forbid.

## .source

> "The core idea of event sourcing is that whenever we make a change to the state of a system, we record that state change as an event, and we can confidently rebuild the system state by reprocessing the events at any time in the future." — fowler, "what do you mean by 'event-driven'?", 2017 ✅

### converge — the costs he names

> "Event sourcing does have its problems. Replaying events becomes problematic when results depend on interactions with outside systems. We have to figure out how to deal with changes in the schema of events over time." — same ✅

> "But the real difficulty of Event Sourcing is hooking up to external systems that aren't centered on events." … "Retrofitting Event Sourcing looks like it would be very messy" … "mostly I've seen Event Sourcing where it's been used for part of a system - mostly the accounting side." — fowler, "focusing on events", 2006 ✅

> "Databases also provide transactional concurrency as well as persistence, so you have to figure out what you are going to do about concurrency." — fowler, "memory image", 2011 ✅

### contrast — the verdict

> "The Business Logic Processor runs entirely in-memory using event sourcing." — fowler, "the lmax architecture", 2011 ✅

fowler offers it as a choice that earns its cost in such a case. we forbid the form with no entity: the facts stay the record of what happened, and the materialized entity is their conclusion.
