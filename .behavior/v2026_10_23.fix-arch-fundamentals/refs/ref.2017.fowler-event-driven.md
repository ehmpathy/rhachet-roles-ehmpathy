# ref.2017.fowler-event-driven

grade: ✅ — the author's own page
cite: Martin Fowler (07 February 2017). "What do you mean by “Event-Driven”?" martinfowler.com. https://martinfowler.com/articles/201701-event-driven.html
seen: `.raw/page.fowler2017-event-driven.json` → `.json.txt` — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`; url taken from `.raw/links.fowler-tag-event-architectures.json`

## .quotes

> "The biggest outcome of the summit was recognizing that when people talk about “events”, they actually mean some quite different things."

> "This happens when a system sends event messages to notify other systems of a change in its domain. A key element of event notification is that the source system doesn't really care much about the response."

> "It can become problematic, however, if there really is a logical flow that runs over various event notifications. The problem is that it can be hard to see such a flow as it's not explicit in any program text. Often the only way to figure out this flow is from monitoring a live system."

> "A simple example of this trap is when an event is used as a passive-aggressive command. This happens when the source system expects the recipient to carry out an action, and ought to use a command message to show that intention, but styles the message as an event instead."

> "An event need not carry much data on it, often just some id information and a link back to the sender that can be queried for more information."

> "A recipient can then update it's own copy of customer data with the changes, so that it never needs to talk to the main customer system in order to do its work in the future."

> "What we gain is greater resilience, since the recipient systems can function if the customer system is becomes unavailable. We reduce latency, as there's no remote call required to access customer information."

> "The event store becomes the principal source of truth, and the system state is purely derived from it."

> "There's no need for event processing to be asynchronous"

> "Event sourcing does have its problems. Replaying events becomes problematic when results depend on interactions with outside systems. We have to figure out how to deal with changes in the schema of events over time."

> "I find many of my colleagues are deeply wary of using CQRS, finding it often misused."

> "The tech lead on the project claimed the main problem was lots of asynchronous communications, certainly a known complexity-booster, but not one that's a necessary part of either event-sourcing or CQRS."

## .supports

- `catalog.of=pattern.event._` — the thesis: "event" names four patterns, and their confusion is the defect. the catalog's facets keep them apart
- `pattern=thin-notification` (forbid), `pattern=self-contained-fact`, `pattern=replay-on-read` (forbid) beside `pattern=materialized-entity`, `pattern=cqrs` (forbid) — the four, in his words
- `pattern=command-message` (forbid) — **converge** on the trap, named; **contrast** on its cure: fowler says the sender "ought to use a command message", and we **rebut** — the intent to act is the receiver's
- `pattern=replayable-fact-stream` — "the event log provides a strong audit capability"
- `pattern=choreographed-flow` (forbid) — a flow "not explicit in any program text"
- the caveat: async delivery is orthogonal to all four, and "a known complexity-booster"
