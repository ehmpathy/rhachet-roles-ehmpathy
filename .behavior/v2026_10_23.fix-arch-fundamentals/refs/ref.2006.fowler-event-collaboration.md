# ref.2006.fowler-event-collaboration

grade: ✅ — the author's own page (a draft, by his own note). his 2017 note says this page "conflates the patterns" of event notification and event-carried state transfer (`ref.2017.fowler-event-driven`)
cite: Martin Fowler (19 June 2006). "Event Collaboration." martinfowler.com, eaaDev. https://martinfowler.com/eaaDev/EventCollaboration.html
seen: `.raw/page.fowler-event-collaboration.json` → `.json.txt` — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`; url taken from `.raw/links.fowler-event-narrative.json`

## .quotes

> "Just raising an event is not for a command, you have to know something's going to act."

> "You can still control changes to the data to ensure there's only one source for each bit of data. However instead of doing this by saying only one component stores data, you do it by allowing one component to post update events about that bit of data."

> "This example brings out the point that if you want central management of data, you'll need two kinds of event - requests to update data, which should be ignored by everything but the managing application, and confirmed updates which everyone acts on."

> "An event cascade is what happens when you get a sequence of events triggering other events."

> "Event cascades are good because something happens and as a result of a string of local logical event connections something indirect happens. Event cascades are bad because something happens and as a result of a string of local logical event connections something indirect happens."

> "A component may continue operating, but it will be working on out of date information if it's not receiving events as things change. It may therefore initiate actions based on out of date information."

> "But the risk tracker will now start giving out incorrect information, without any more obvious signs of failure, since it isn't properly capturing the data changes."

> "This, of course, is the inherent weakness of any system with implicit behavior - since you can't see it, you don't see what changes need to be made when you modify it."

## .supports

- `pattern=command-message` (forbid) — **contrast**: fowler routes each request to update to the "managing application"; we **narrow** it — a request from an actor at the owner's own entrypoint stays, a request from a peer service does not
- `pattern=one-writer-per-resource` — "allowing one component to post update events about that bit of data"
- `pattern=command-message` (forbid), its disguised form — "you have to know something's going to act"
- `pattern=choreographed-flow` (forbid) — the cascade, and the hospital case: a room released by one reaction, rebooked before the clinician's review lands
- `pattern=self-contained-fact` — the contrast it carries: a copy goes stale while events stop, and a change to an event's shape breaks a listener silently
