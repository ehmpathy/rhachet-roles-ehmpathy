# ref.2013.kreps

grade: ✅ — the author's post on the publisher's blog, read through the wayback machine's capture of the original url (the live url now 404s: `.raw/page.kreps2013-the-log.json`)
cite: Jay Kreps (2013, 16 December). "The Log: What every software engineer should know about real-time data's unifying abstraction." *LinkedIn Engineering*. http://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying (capture: https://web.archive.org/web/20150203061524/http://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying)
seen: `.raw/page.kreps2013-the-log.wayback.json` → `.json.txt` — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`; url taken from `.raw/links.kleppmann2015-database-inside-out.json`

## .quotes

> "The log is the record of what happened, and each table or index is a projection of this history into some useful data structure or index. Since the log is immediately persisted it is used as the authoritative source in restoring all other persistent structures in the event of a crash."

> "It turns out that the sequence of changes that happened on the database is exactly what is needed to keep a remote replica database in sync."

> "There is a facinating duality between a log of changes and a table. The log is similar to the list of all credits and debits and bank processes; a table is all the current account balances."

> "So in this sense you can see tables and events as dual: tables support data at rest and logs capture change."

> "if we re-order two updates to the same record in our processing we may produce the wrong final output."

> "Event Sourcing—As far as I can tell this is basically the enterprise software engineer's way of saying "state machine replication"."

## .supports

- `philosophy.entities-are-materialized-from-events` — **converge**: the log is the record; each table is its projection; the duality runs both ways
- `pattern=replay-on-read` (forbid), `.the database already is one` — **converge**: the write-ahead log is the record, the replica replays it, the crash recovery restores from it. the engine already owns the log; the forbid targets a hand-rolled copy
- `pattern=materialized-entity` — **converge**: "a table is all the current account balances" — the conclusion kept beside the record
- `pattern=latest-version-wins` — **converge**: reorder two updates to one record and the output goes wrong; the consumer keys on the version, never on arrival
