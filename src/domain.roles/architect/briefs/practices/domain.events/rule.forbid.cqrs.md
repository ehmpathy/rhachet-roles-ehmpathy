# rule.forbid.cqrs

## .what

never split one domain's live data into a write schema and a separate read schema, kept in step by a feed (command query responsibility segregation). one schema serves the live reads and writes. a heavy read — a report, a trend over months — runs on an analytical warehouse.

## .why

- **every change lands twice** — two schemas for one domain
- **the read side lags the write side** — a caller writes, then reads the old value (`pattern=read-your-writes` breaks)
- **the feed is a second system** — built, watched, replayed, and repaired by hand
- fowler: "for most systems CQRS adds risky complexity"

## .not cqrs

an analytical warehouse — redshift, athena — that serves reports and trends, fed one way from the transactional storage, while the live schema serves every live read, write, and write-time check (`rule.forbid.analytical-scans-on-live-storage`). the transactional storage stays the source of truth, and no live path reads the warehouse, so its lag harms no caller. fowler names it as the alternative: his "ReportingDatabase".

## .the smell

- a read-side table that a live screen reads instead of the entity
- a write path that returns before the read side it feeds has caught up, and a caller that reads that side next
- two schemas for one domain object, each with its own migrations

## .the cure

one schema for live reads and writes · an analytical warehouse for heavy reads over history.

## .enforcement

- live reads served from a separate schema fed by the write side = **blocker**

## .see also

- `catalog.of=pattern.event._` — `pattern=cqrs` (forbid)
- `rule.forbid.analytical-scans-on-live-storage` — the cure cqrs claims, at a fraction of its cost
