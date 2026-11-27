# F33 — the event catalog decomposes by facet, with verdicts that go past the canon

## .the fork

how should a baseline catalog of event-driven design be cut, and what verdict does each pattern get?

- **one axis, facet** (taken) — the one question each choice answers: intent · payload · owner · flow · order · correction · time · record · read
- **bound × facet**, mirrored from the transaction catalog — rejected: most facets hold at both bounds, so the cells repeat
- **fowler's four as the members** (event notification · event-carried state transfer · event sourcing · cqrs) — rejected as the frame: they answer three different questions, which is his own point; kept as a section that names the confusion

## .taken, and why at the time

fowler 2017's thesis is that "event-driven" names patterns teams conflate. an axis of questions makes the conflation unwritable: each pattern sits under the one question it answers. delivery (outbox, idempotent consumer, guarded status, async task) stays in the transaction catalog and is cited as **covered by**, never repeated.

## .the law above the walk

the facts are the record of what happened; the entity is their conclusion, committed with each fact; when they disagree, the facts win and the entity is rebuilt. "source of truth" bare names both, so the briefs say which: the entity is the truth you act on, the facts the truth you answer to.

## .the verdicts

two peer poles, `require` and `forbid`; tier (root · leaf) sorts the `require` members. every `forbid` member has a booted `rule.forbid.*` that names its cure.

| facet | require | forbid | the canon |
|---|---|---|---|
| intent | `domain-event`, `consumer-decides` | `command-message` | converge on the disguised form; contrast on the overt form — fowler prescribes a command message as the cure |
| payload | `self-contained-fact` | `thin-notification` | fowler grades the notification "nice"; the forbid is ours: the callback races the record it reads, and pii or size is no exception |
| owner | `one-writer-per-resource` | — | converge (fowler) |
| flow | — | `choreographed-flow` | fowler warns ("hard to see such a flow"), never bans |
| order | `latest-version-wins` | `order-dependent-consumer` | converge (kreps: reorder two updates to one record and the output goes wrong) |
| correction | `corrected-version`, `correction-event` | `retroactive-replay` | converge on "never delete an event" (fowler, helland); the rewind and merge are fowler's, the forbid ours |
| time | `two-time-points` | — | converge (fowler); `observedAt` is the version of a fact, so no third stamp and no `updatedAt` on an event |
| record | `materialized-entity`, `replayable-fact-stream` | `replay-on-read` | converge (kreps, helland: the log is the record, the table its conclusion); contrast (kleppmann: views lag the log) — bound: a live write reads the entity |
| read | — | `cqrs` | converge — "for most systems CQRS adds risky complexity" |

## .the bound of the command ban

banned: one of our services orders another of ours to change that service's resources — a command on the bus, a mutation call on a peer client, a task enqueued into a peer's queue, or an event named for a need. permitted: an actor's request at a service's own entrypoint; a service's call to a vendor about its own resource there; a task a service enqueues for itself; any read.

## .the terms it bans

`held` (every sense; the status name never says what it awaits) and `fold` (a reduce, a conclusion, a blend, a collapse — always a clearer word). both live in `terms.blocklist.jsonc`, with a clamp case each.

## .rework

clean. one catalog brief, its members, one booted forbid rule per forbid member, one booted philosophy; no code depends on them. a verdict flip is one row, one header line, and one boot line.

## .confidence

85%. least sure:

- the bound of the command ban — a synchronous mutation call between two of our services is banned with the bus command; a repo with an internal admin service may push on that line
- the two correction kinds — "was our report wrong, or did the world change?" sorts the cases met so far; a domain where the two blur (a late price adjustment) may need a third row
- the proponents of event sourcing and cqrs (greg young, udi dahan), and hohpe & woolf's event message vs command message, are not captured. the verdicts stand on fowler, kreps, helland, kleppmann, and our own practice

## .where

`src/domain.roles/architect/briefs/practices/domain.events/catalog.of=pattern.event._.md` · `…/philosophy.entities-are-materialized-from-events.md` · `…/rule.forbid.*.md` (seven) · `src/domain.roles/mechanic/briefs/practices/code.prod/evolvable.domain.objects/rule.require.domain-event-suffix.md`

## .verdict

ruled by the wisher, 2026-11-26: `command-message` and `choreographed-flow` forbid; every avoid becomes a forbid with its rule; `require` and `forbid` are the peer poles; the record splits into `materialized-entity` (require) and `replay-on-read` (forbid), with no entity row forbidden; `observedAt` is the version; `held` and `fold` banned; an endpoint's request is an act, not yet a fact — the accepted outcome is the fact (a version row, a domain event, or both), and where only versions are kept they are the record and a defect is fixed forward. ruled by the wisher, 2026-11-27, the command-ban bound: a peer's call to an endpoint that exposes one of the owner's domain operations is permitted — the owner enforces its invariants inside. the line is the domain operation: a write past it (a peer's dao or tables, an endpoint that exposes dao access) is forbidden. an order on the bus, or a task enqueued into a peer's queue, stays forbidden per the 11-26 verdict, since no refusal reaches the sender (best guess, 80%: the wisher spoke of endpoint calls, not of the bus). open: the two correction kinds
