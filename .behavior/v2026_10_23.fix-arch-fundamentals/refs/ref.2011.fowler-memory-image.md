# ref.2011.fowler-memory-image

grade: ✅ — the author's own page
cite: Martin Fowler (31 August 2011). "Memory Image" (bliki). martinfowler.com. https://martinfowler.com/bliki/MemoryImage.html
seen: `.raw/page.fowler-memory-image.json` → `.json.txt` — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`; url taken from `.raw/links.fowler-tag-event-architectures.json`

## .quotes

> "Against that you do have to ensure you can reliably store the events and process them. You also need to write the code to save and load snapshots and figure out how to restore the system quickly enough to keep your quality of service up. Databases also provide transactional concurrency as well as persistence, so you have to figure out what you are going to do about concurrency."

> "One trap here is to use a serialization structure for the event log that doesn't handle evolution gracefully should you want to change the structure of events."

> "Like many of these kinds of ideas, it's an approach that's been used and reinvented many times 3, but never got mainstream traction."

## .supports

- `pattern=replay-on-read` (forbid) — the costs a log as the record takes on: snapshots, restore time, concurrency the database gave for free, and event shapes that must evolve
