# ref.2005.fowler-event-sourcing

grade: ✅ — the author's own page (a draft, by his own note)
cite: Martin Fowler (12 December 2005). "Event Sourcing." martinfowler.com, eaaDev. https://martinfowler.com/eaaDev/EventSourcing.html
seen: `.raw/page.fowler-event-sourcing.json` → `.json.txt` — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`; url taken from `.raw/links.fowler-event-narrative.json`

## .quotes

> "Capture all changes to an application state as a sequence of events."

> "The key to Event Sourcing is that we guarantee that all changes to the domain objects are initiated by the event objects."

> "The official system of record can either be the event logs or the current application state. If the current application state is held in a database, then the event logs may only be there for audit and special processing."

> "Many of the advantages of Event Sourcing stem from the ability to replay events at will, but if these events cause update messages to be sent to external systems, then things will go wrong because those external systems don't know the difference between real processing and replays."

> "If I ask for an exchange rate on December 5th and replay that event on December 20th, I will need the exchange rate on Dec 5 not the later one."

> "Both queries and updates to external systems cause a lot of complication with Event Sourcing."

> "Reversal is the most straightforward when the event is cast in the form of a difference. An example of this would be “add $10 to Martin's account” as opposed to “set Martin's account to $110”."

## .supports

- `pattern=replay-on-read` (forbid) — the definition, and its cost: every external call and query must be replay-safe
- `pattern=replayable-fact-stream` — **converge**: a defect fix is "make the fix and reprocess the events"; we keep the replay as a repair, never as the read path
- `pattern=materialized-entity` — the alternative he names first: the current application value kept in a database, the event logs beside it. **narrow**: we bind the two, committed in one transaction (`pattern=transactional-outbox`)
