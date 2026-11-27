# rule.prefer.occurred-observed

## .what

when a record carries two clocks for one fact — when it happened in the world, and when this system learned of it — name the pair **occurred** / **observed**:

- `occurredAt` — when the fact happened in the world. set from the source: the card network's stamp, the instructor's clock-in
- `observedAt` — when this system first learned of the fact. set at the boundary where the fact enters

both are `IsoTimeStamp` (`rule.forbid.any-time`).

## .why

- **two clocks, one word each.** a bare `timestamp`, `date`, or `at` reads as either clock; the reader guesses, and a late fact sorts into the wrong month
- **the pair is symmetric**: one latin prefix (`ob-`; `oc-` is `ob-` before a `c`), one length (8 / 8), two past participles — the world's act and the system's act on one fact (`rule.prefer.symmetric-term-pairs`, architect)
- **the rival words overload:**
  - `noticed` — a notice is a message; it collides with a notification
  - `received` — names the transport, not the knowledge
  - `recorded`, `created` — name the write of a row, and collide with the noun `record` and the row stamp `createdAt`

## .how

| the clock | the field | set where |
|---|---|---|
| the world's | `occurredAt` | copied from the source, cast at the boundary |
| this system's | `observedAt` | stamped once, where the fact enters this system |

- a fact that arrives late keeps its true `occurredAt`; only its `observedAt` is late
- a peer that learns of the fact later keeps its own `observedAt`, on its own copy. one fact, one `occurredAt`; each observer, its own `observedAt`
- order by the clock the question asks: a statement of the month asks `occurredAt`; an audit of what we knew, and when, asks `observedAt`
- `observedAt` is the version of a fact. a truer report of the same fact keeps its unique key and its `occurredAt`, and carries a newer `observedAt`; the latest `observedAt` wins. a fact carries no `updatedAt` and no third stamp (`pattern=corrected-version`, architect)

## .examples

### 👍 good

```ts
class PaymentCapturedEvent extends DomainEvent<PaymentCapturedEvent> {
  // ...
  occurredAt: IsoTimeStamp; // the card network's stamp: tuesday 14:02
  observedAt: IsoTimeStamp; // when payments learned of it: friday 09:15
}
```

### 👎 bad

```ts
class PaymentCapturedEvent extends DomainEvent<PaymentCapturedEvent> {
  timestamp: string;  // which clock? the reader guesses
  noticedAt: string;  // a notice is a message; and not an IsoTimeStamp
}
```

## .scope

domain events, inbound webhooks, ledger entries, audit logs — any record of a fact from the world.

does not apply to a row's own stamps (`createdAt`, `updatedAt`): those name the row's life, not a fact. does not apply to compares of desired vs found values: that pair is `expected` / `detected` (architect).

## .enforcement

- a fact record with one bare stamp (`timestamp`, `date`, `at`, `time`) where two clocks exist = **nitpick**
- `noticedAt`, `receivedAt`, or `recordedAt` where `observedAt` fits = **nitpick**
- an `updatedAt` on a fact record, where a newer `observedAt` is the version = **nitpick**

## .etymology

- **occur**, latin *occurrere*: *ob-* (toward) + *currere* (to run). to run toward, to meet, to befall. the world's act: the fact befell
- **observe**, latin *observare*: *ob-* (toward) + *servare* (to watch, to keep). to watch over, to attend to. the system's act: it attended to the fact
- both carry *ob-*: two acts toward one event

## .evidence

### the dimensional walk

| axis | values |
|---|---|
| whose act does it name? | the world's (occurred, happened) · the system's (observed, noticed, received) · a row's (recorded, created) |
| does it name knowledge, transport, or storage? | knowledge (observed, noticed) · transport (received) · storage (recorded, created) |
| does it collide with an extant sense? | no (occurred, observed) · yes (noticed: a notice; recorded: the noun record; created: `createdAt`) |
| symmetric with `occurred`? | yes — 8 letters, prefix `ob-` (observed) · no (noticed 7; received, recorded 8 with no shared prefix; happened is the world's act, not the system's) |

the only partner with the clean value on every axis: **observed**.

### a timeline

1. tuesday 14:02 — kai pays for a surf lesson at the shop; the card network stamps the charge. `occurredAt = tue 14:02Z`
2. friday 09:15 — the shop's terminal settles its batch; our payments service learns of the charge. `observedAt = fri 09:15Z`
3. the monthly statement puts the charge on tuesday, by `occurredAt`
4. the audit "what did we know on thursday?" excludes it, by `observedAt` — on thursday we knew naught of it

### precedent

- fowler, "domain event" (2005): "the time the event occurred in the world and the time the event was noticed" — the two clocks, named; his second word is the one this pair replaces ✅ (route ref `ref.2005.fowler-domain-event`)
- fowler, "focusing on events" (2006): the two time points "correspond closely to the notions of actual and record" ✅ (route ref `ref.2006.fowler-event-narrative`)
- owed, not yet captured: the bitemporal pair (valid time · transaction time) and the stream pair (event time · process time)

## .rejected alternatives

| pair | why rejected |
|---|---|
| occurred / noticed | fowler's words; a notice is a message, and it collides with a notification |
| occurred / received | names the transport; a fact may arrive before this system can read it |
| occurred / recorded | names the row's write; collides with the noun `record` |
| happened / learned | no shared shape; `learned` names a brain, not a system |
| actual / record | fowler's temporal names; `record` collides, and neither is a stamp |
| valid / transaction | the bitemporal pair; `transaction` collides with a database transaction |
| event time / process time | the stream pair; both clocks concern the event, so `event time` reads two ways |

## .see also

- `rule.require.ubiqlang` — one canonical word per concept
- `rule.prefer.symmetric-term-pairs` (architect) — the shape this pair holds
- `rule.prefer.expected-detected` (architect) — a peer pair, for desired vs found values
- `rule.prefer.converge-contrast` — a peer pair, for sources weighed against a claim
- `rule.forbid.any-time` — both stamps are `IsoTimeStamp`
- `catalog.of=pattern.event.facet=time.pattern=two-time-points` (architect) — the event pattern this pair names
