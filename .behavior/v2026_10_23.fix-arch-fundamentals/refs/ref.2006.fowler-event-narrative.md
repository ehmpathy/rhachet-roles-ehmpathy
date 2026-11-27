# ref.2006.fowler-event-narrative

grade: ✅ — the author's own page (a draft, by his own note: "very much in draft form")
cite: Martin Fowler (25 January 2006). "Focusing on Events." martinfowler.com, eaaDev. https://martinfowler.com/eaaDev/EventNarrative.html
seen: `.raw/page.fowler-event-narrative.json` → `.json.txt` — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`; url taken from `.raw/links.fowler-tag-event-architectures.json`

## .quotes

> "In essence a Domain Event signals something that has happened in the outside world that is of interest to the application."

> "There are two distinct Time Points that we should always consider: the time the event occurred and the time the system noticed the event."

> "In particular an event's source data is immutable - it's what we know of what happened, and we can't easily change it."

> "With request/response collaboration, we strive to have only one component store a particular peice of data, other components then ask that component for the data when it needs it. With event collaboration every component stores all the data it needs and listens to update events for that data."

> "The downside of Event Collaboration is that it's very hard to understand the collaboration. Request/response collaborations are specified in some form of code that shows the entire flow, Event Collaboration is much more implicit - which makes it much harder to debug when something unexpected happens."

> "But the real difficulty of Event Sourcing is hooking up to external systems that aren't centered on events. To replay events you need to be able to query external systems' past states. You have to avoid sending out duplicate updates to downstream systems."

> "Retrofitting Event Sourcing looks like it would be very messy"

> "Indeed mostly I've seen Event Sourcing where it's been used for part of a system - mostly the accounting side."

> "People think of a command as encapsulating a request - with a command you tell a system to do X. Events, however, just communicate that something happened - with an event you let a system know that Y has happened."

## .supports

- `pattern=domain-event` — a fact of what happened; its source data immutable
- `pattern=two-time-points` — occurred and noticed, both considered
- `pattern=command-message` (forbid) — **converge**: the command and the event differ in intent: "tell a system to do X" against "Y has happened"
- `pattern=consumer-decides` — **converge**: in event collaboration "you never have one component asking another to do anything"; the others "react however they wish to"
- `pattern=choreographed-flow` (forbid) — event collaboration "is much more implicit"
- `pattern=replay-on-read` (forbid) — external systems, duplicate updates, a messy retrofit; seen "mostly the accounting side"
