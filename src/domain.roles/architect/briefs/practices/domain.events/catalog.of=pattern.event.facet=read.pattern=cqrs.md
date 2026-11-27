# catalog.of=pattern.event.facet=read.pattern=cqrs

a member of `catalog.of=pattern.event._` · facet `read` · verdict **`forbid`**.

## .what it is

command query responsibility segregation: one schema takes the writes, a separate schema serves the reads, and a feed — often the write side's events — keeps the read side in step. a live screen reads the read side, never the entity.

## .why it is forbidden

- **two schemas for one domain** — every change to the domain lands twice
- **the read side lags the write side** — a caller writes, then reads the old value (`pattern=read-your-writes` breaks)
- **the feed is a second system** — it must be built, watched, replayed, and repaired
- **what is lives in two places** — the entity and the read side each claim the current value, and a reader must ask which one holds the answer (`pattern=materialized-entity`)

## .not cqrs

an analytical warehouse — redshift, athena — for a heavy read: a report, a trend over months (`rule.forbid.analytical-scans-on-live-storage`). it is fed one way from the transactional storage, which stays the source of truth. it serves no live read, so no caller writes and then reads it. fowler names this alternative himself.

## .the cure

one schema serves the live writes and reads. heavy reads over history run on the analytical warehouse.

## .source

### converge

> "For some situations, this separation can be valuable, but beware that for most systems CQRS adds risky complexity." — fowler, "cqrs", 2011 ✅

> "If your domain isn't suited to CQRS, but you have demanding queries that add complexity or performance problems, remember that you can still use a ReportingDatabase." — same ✅

> "I find many of my colleagues are deeply wary of using CQRS, finding it often misused." — fowler, "what do you mean by 'event-driven'?", 2017 ✅

### contrast — the verdict

> "In particular CQRS should only be used on specific portions of a system (a BoundedContext in DDD lingo) and not the system as a whole." — fowler, "cqrs", 2011 ✅

fowler allows it in one bounded context. we forbid it: the analytical copy serves the heavy reads, and the live schema serves the rest.

> "This separation of reads and writes is really the key idea here." — kleppmann, "turning the database inside-out", 2015 ✅

kleppmann builds every read as a view that lags the log. **narrow**: a lag is harmless only where no caller writes and then reads, and no write checks its rules — the analytical copy above. live reads and write-time checks read the entity. for history he names the same copy himself: "for those kinds of queries it's better to just keep all the raw events" — the analytical copy, again.
