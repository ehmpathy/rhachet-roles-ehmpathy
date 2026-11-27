# ref.2015.kleppmann

grade: ✅ — the author's own page (the transcript of his strange loop 2014 talk)
cite: Martin Kleppmann (2015, 4 March). "Turning the database inside-out with Apache Samza." *Martin Kleppmann's blog*. https://martin.kleppmann.com/2015/03/04/turning-the-database-inside-out.html
seen: `.raw/page.kleppmann2015-database-inside-out.json` → `.json.txt` — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`; url taken from `.raw/links.kleppmann-home.json`

## .quotes

> "even if you use your database in the traditional way, overwriting old state with new state, the database's internal replication mechanism may still be translating those imperative statements into a stream of immutable events."

> "What if we turn the database inside-out, take the implementation detail that was previously hidden, and make it a top-level concern?"

> "A materialized view is just a cached subset of the log, and you could rebuild it from the log at any time."

> "(Going through a leader would still be useful if you want to validate that writes meet certain constraints before writing them to the log.)"

> "This separation of reads and writes is really the key idea here."

> "If you deploy some bad code that writes incorrect data to the database, or if a human enters some incorrect data, you can look at the log to see the exact history of what happened, and undo it."

> "when an analyst is running exploratory ad-hoc queries against a data warehouse of historical data, it doesn't make much sense to use materialized views — for those kinds of queries it's better to just keep all the raw events"

## .supports

- `pattern=replay-on-read` (forbid), `.the database already is one` — **converge**: under the hood the database already turns each write into an immutable event; replication, indexes, and caches are each derived from it
- `pattern=materialized-entity` — **converge**: the view is a cached subset of the log, rebuilt from it at will. **contrast**: his views lag the log and are maintained by a separate job; ours is committed in the same transaction as each fact, so a live read and a write-time check see one conclusion. **response — bound**: his own caveat names our reason — a leader that validates constraints before the write; we keep that leader, and call it the entity
- `pattern=cqrs` (forbid) — **contrast**: "this separation of reads and writes is really the key idea". **response — narrow**: a lag is harmless only where no caller writes and then reads, and no write checks its rules — the analytical copy; live reads and write-time checks read the entity
- `pattern=replayable-fact-stream` — **converge**: a defect in the code is repaired from the log, since the log keeps "the exact history of what happened"
- `rule.forbid.analytical-scans-on-live-storage` — **converge**: history queries go to a warehouse of raw events, not to the live views
