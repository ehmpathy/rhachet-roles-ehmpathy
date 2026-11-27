# ref.2005.fowler-event-poster

grade: ✅ — the author's own page
cite: Martin Fowler (30 December 2005). "Event Poster" (bliki). martinfowler.com. https://martinfowler.com/bliki/EventPoster.html
seen: `.raw/page.fowler-event-poster.json` → `.json.txt` — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`; url taken from `.raw/links.fowler-tag-event-architectures.json`

## .quotes

> "To do an update the poster just captures the information and sends it to the back-end application that is the source of the events. It doesn't update its own data directly, instead it waits for the appropriate event to come through the stream from the source application. This ensures that multiple posters show the same data and that the source application can do any processing it needs to do on the changes."

## .supports

- `pattern=one-writer-per-resource` — a copy never writes itself; it asks the owner, then waits for the owner's fact
- `pattern=command-message` (forbid), its bound — the poster's update is a human's request at the source's own entrypoint, which the ban permits; the copy never writes itself
