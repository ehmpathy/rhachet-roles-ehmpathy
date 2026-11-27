# ref.2005.fowler-retroactive-event

grade: ✅ — the author's own page (a draft, by his own note)
cite: Martin Fowler (12 December 2005). "Retroactive Event." martinfowler.com, eaaDev. https://martinfowler.com/eaaDev/RetroactiveEvent.html
seen: `.raw/page.fowler-retroactive-event.json` → `.json.txt` — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`; url taken from `.raw/links.fowler-event-narrative.json`

## .quotes

> "Automatically correct the consequences of a incorrect event that's already been processed."

> "There are three main kinds of retroactive event: Out of order events, rejected events, and incorrect events."

> "However the whole point of the event log is that we never delete an event. So what we can do is insert a rejection event to the log, processing that rejection does the changes that I've described."

> "Clearly this merge processing can get very involved, and the complexity of the merge processing is an important factor to bear in mind when you're deciding how to handle your retroactive events."

## .supports

- `pattern=correction-event`, `pattern=corrected-version` — **converge**: a published event is never deleted; a correction is a new event, or a newer version of the same fact. the correction as a new fact matches the cure's apology (`ref.2009.helland-campbell`)
- `pattern=retroactive-replay` (forbid) — the definition, and its cost: "this merge processing can get very involved". his automatic replay-and-merge rests on an entity derived by replay (`pattern=replay-on-read`, forbid); a materialized entity needs none of it
