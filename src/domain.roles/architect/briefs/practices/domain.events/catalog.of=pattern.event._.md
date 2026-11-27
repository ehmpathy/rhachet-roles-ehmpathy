# catalog.of=pattern.event._

the patterns of event-driven design: what a message says, what it carries, who writes the data it describes, who owns a flow of many steps, how a consumer treats arrival order, how a wrong fact is set right, and how the entity relates to its facts.

"event-driven" names several patterns that teams conflate, and the confusion is the defect (fowler 2017). a team that adopts one inherits the cost of all of them. this catalog keeps them apart: each choice answers one question, and each question has its own verdict.

```
catalog.of=pattern.event._.md                                  # this catalog brief
catalog.of=pattern.event.facet=$facet.pattern=$pattern.md     # one member per pattern
rule.require.$pattern.md                                       # one rule per require member
rule.forbid.$pattern.md                                        # one rule per forbid member
philosophy.entities-are-materialized-from-events.md            # the why beneath the law
```

## .the law — the facts are the record; the entity is their conclusion

every entity is materialized from the events seen (`philosophy.entities-are-materialized-from-events`).

- **the facts are the record of what happened.** a fact stream is a formal data product: trusted, versioned, kept forever, replayable. each fact declares what happened, in the past tense, in domain words, and its name says so — `[Noun][PastVerb]Event` (`PaymentRefundedEvent`, `LessonConfirmedEvent`; `rule.require.domain-event-suffix`, mechanic)
- **the entity is their conclusion, committed with each fact.** the latest version of every fact about it, materialized as one record, written in the same transaction as each fact. every live read and every write-time check reads the entity
- **when they disagree, the facts win and the entity is rebuilt.** the materialization is pure, so a defect in it is repaired by a fresh materialization from the stream
- **an endpoint's request is an act, not yet a fact.** the service may refuse it; only the accepted outcome is a fact — a version record, a domain event, or both in one transaction. where only versions are kept, they are the record: each says what the entity became, never why, and a defect is fixed forward with a newer version, since no deeper record remains to materialize from (`pattern=materialized-entity`)

the entity is the truth you act on; the facts are the truth you answer to. "source of truth" bare names both — say which.

a fact is never edited in place and never deleted. when one turns out wrong, one of two answers lands at the head of the stream:

- **our report was wrong** → a newer version under the same unique key and `occurredAt`, with a newer `observedAt`. the newer overrules the older
- **the world moved on** → a new fact that answers the old

a consumer assumes no order: it applies the latest version of each fact it has seen, by unique key and `observedAt`.

this is the event-side face of consistency at rest (`catalog.of=pattern.transaction._`).

## .the four that teams conflate

| pattern | what it is | its own question | our verdict |
|---|---|---|---|
| event notification | a thin message: an id and a link back | what does the message carry? | forbid (`thin-notification`) |
| event-carried state transfer | a full message: the data a peer needs | what does the message carry? | require (`self-contained-fact`) |
| event sourcing | the log of events is the system of record | what is the record? | the stream as record — require (`replayable-fact-stream`, `materialized-entity`); no entity record — forbid (`replay-on-read`) |
| cqrs | reads and writes use separate schemas | do reads and writes share a schema? | forbid (`cqrs`) |

three facets, four patterns. a team can adopt any one without the others: a fact stream with its entity replays fine, with no read that waits on a replay; a separate read schema needs no event at all. and none of them needs async delivery — "a known complexity-booster", "not one that's a necessary part of either" (fowler 2017).

## .the noun tree

```
event pattern
└── keeps a fact true, delivered, and acted on once
    ├── facet   — the one question the choice answers
    ├── pattern — the answer
    └── verdict — require or forbid, the two peer poles
```

## .the dimension — facet

- `intent` — does the message declare a fact, or ask for an act?
- `payload` — what does the message carry?
- `owner` — who writes the data a peer reads?
- `flow` — who owns a business flow of many steps?
- `order` — does a consumer's result depend on the order facts arrive in?
- `correction` — how is a wrong or late fact set right?
- `time` — which times does a fact carry?
- `record` — how does the entity relate to its facts?
- `read` — do live reads and writes share one schema?

## .the walk

| facet | require | forbid | covered by |
|---|---|---|---|
| intent | `domain-event` · `consumer-decides` | `command-message` | — |
| payload | `self-contained-fact` | `thin-notification` | — |
| owner | `one-writer-per-resource` | `rule.forbid.multiple-writers-per-resource` | — |
| flow | — | `choreographed-flow` | `pattern=async-task` (transactions) |
| order | `latest-version-wins` | `order-dependent-consumer` | `pattern=guarded-status-transitions` · `pattern=idempotent-consumer` (transactions) |
| correction | `corrected-version` · `correction-event` | `retroactive-replay` | — |
| time | `two-time-points` | `rule.forbid.ambiguous-time-points` | — |
| record | `materialized-entity` · `replayable-fact-stream` | `replay-on-read` | `pattern=transactional-outbox` · `pattern=upsert-on-natural-key` (transactions) |
| read | — | `cqrs` | `rule.forbid.analytical-scans-on-live-storage` |

**covered by** — a pattern from another catalog already answers the facet. a `rule.forbid.*` in the forbid column is a ban with no member of its own: its require twin's member holds the detail.

## .what the transaction catalog already holds

delivery lives in `catalog.of=pattern.transaction._`, and this catalog never repeats it:

- a fact commits with its change, in one transaction — `pattern=transactional-outbox`
- a fact arrives at least once, so a peer acts on it once — `pattern=idempotent-consumer`
- a late or repeated fact cannot move a status backward — `pattern=guarded-status-transitions`
- a flow of many steps is one task that waits on its dependencies — `pattern=async-task`

## .the members

verdict: **require** · **forbid**, the two peer poles. tier sorts the `require` members: **root** — every repo that publishes facts · **leaf** — one kind of repo or load. every member has its rule, so a reviewer that loads only rules still sees each verdict; each forbid rule names the cure.

| facet | pattern | verdict | tier | keeps | rule |
|---|---|---|---|---|---|
| intent | `domain-event` | require | root | a message names what happened, in the past tense, with immutable source data | `rule.require.domain-events`; `rule.require.domain-event-suffix` (mechanic) |
| intent | `consumer-decides` | require | root | no service orders another on a path the owner cannot refuse; each consumer reads facts and decides, by its own policy, what to do to its own resources; a call to the owner's domain operation through its endpoint stays | `rule.require.consumer-decides` |
| intent | `command-message` | forbid | — | (one service changes another's resources past its domain operations, by an order on the bus, or by an order dressed as a fact; a saga by another name) | `rule.forbid.command-messages` |
| payload | `self-contained-fact` | require | root | a fact carries the data its reaction needs, as of the moment it happened — never raw pii | `rule.require.self-contained-facts` |
| payload | `thin-notification` | forbid | — | (an id and a link back; the peer calls back and reads a record that moved on since the fact) | `rule.forbid.thin-notifications` |
| owner | `one-writer-per-resource` | require | root | one owner writes each resource; every peer keeps a read-only copy, fed by the owner's facts | `rule.require.one-writer-per-resource`; forbid twin `rule.forbid.multiple-writers-per-resource` |
| flow | `choreographed-flow` | forbid | — | (a business flow that lives only as a cascade of reactions, visible in no program text) | `rule.forbid.choreographed-flows` |
| order | `latest-version-wins` | require | root | a consumer applies each fact by unique key and `observedAt`, keeps the newest, skips the older — the same records for any order of arrival | `rule.require.latest-version-wins` |
| order | `order-dependent-consumer` | forbid | — | (a consumer whose result depends on the order its facts arrive in) | `rule.forbid.order-dependent-consumers` |
| correction | `corrected-version` | require | root | a wrong report is published again under the same unique key and `occurredAt`, with a newer `observedAt`; the newer overrules | `rule.require.corrected-versions` |
| correction | `correction-event` | require | root | when the world moves on past a fact, a new fact answers it — an apology, never an edit | `rule.require.correction-events` |
| correction | `retroactive-replay` | forbid | — | (a rewind to where a late or wrong fact should have landed, a replay forward, a merge into the live records) | `rule.forbid.retroactive-replay` |
| time | `two-time-points` | require | root | a fact names when it occurred and when it was observed: `occurredAt` · `observedAt`; `observedAt` versions the report | `rule.require.two-time-points`; forbid twin `rule.forbid.ambiguous-time-points` |
| record | `materialized-entity` | require | root | each entity equals the latest version of every fact about it, materialized, committed with each fact, guarded by storage | `rule.require.materialized-entities` |
| record | `replayable-fact-stream` | require | root | every published fact is kept forever as a formal data product; a consumer repairs a defect by replay | `rule.require.replayable-fact-streams` |
| record | `replay-on-read` | forbid | — | (the owner keeps no entity, and derives what is by a replay on each read) | `rule.forbid.replay-on-read` |
| read | `cqrs` | forbid | — | (separate live read and write schemas, kept in step by a feed) | `rule.forbid.cqrs` |

## .the caveat

- most repos need only the root members, plus the transaction catalog's delivery patterns
- fowler grades event notification, event sourcing with no entity record, and cqrs as choices with a cost; we forbid all three. the cases he names that earn them — a trade engine on one thread, one bounded context whose reads and writes diverge — sit outside our repo mix; a repo that truly is one owes a decision record, not an exception
- not in the catalog, on purpose: memory image, event poster, schema registries. look each up when a case demands one

## .see also

- `philosophy.entities-are-materialized-from-events` — the why: every entity, and every concept a mind holds, is materialized from the events seen
- `catalog.of=pattern.transaction._` — delivery, atomicity across contracts, the saga ban
- `rule.forbid.command-messages` — between services, only facts travel; each consumer decides
- `rule.forbid.sagas` — the cure: async task, every light green, atomic facts, a fix forward
- `rule.require.domain-event-suffix` (mechanic) — every event ends in `Event`
- `rule.prefer.occurred-observed` (mechanic) — the two clocks of a fact
- `rule.forbid.pii-egress` — no raw pii in an event
- `rule.forbid.any-time` (mechanic) — `occurredAt` and `observedAt` are `IsoTimeStamp`
- `rule.forbid.analytical-scans-on-live-storage` — the cure `cqrs` claims, at a fraction of its cost
- `ref.package.domain-objects` (mechanic) — `DomainEvent<T>` declares a fact; `DomainEntity<T>` holds its conclusion
- sources: martin fowler's own pages, fetched and quoted ✅ — "what do you mean by 'event-driven'?" (2017), "focusing on events" (2006), "domain event", "event sourcing", "retroactive event" (2005), "event collaboration" (2006), "cqrs" (2011), "event poster" (2005), "memory image" and "the lmax architecture" (2011). each member names where the canon converges with us, and where we part
