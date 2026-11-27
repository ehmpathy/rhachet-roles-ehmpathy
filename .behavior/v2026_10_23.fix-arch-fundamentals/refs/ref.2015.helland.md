# ref.2015.helland

grade: ✅ — the published paper, from the conference's own site
cite: Pat Helland (2015). "Immutability Changes Everything." *7th Biennial Conference on Innovative Data Systems Research (CIDR '15)*, January 4–7, 2015, Asilomar, California, USA. http://www.cidrdb.org/cidr2015/Papers/CIDR15_Paper16.pdf
seen: `.raw/pdf.helland2015-immutability.pdf` → `.pdf.txt` (pdftotext -layout) — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`; url taken from `.raw/links.kleppmann2015-database-inside-out.json`

## .quotes

> "Transaction logs record all the changes made to the database. High-speed appends are the only way to change the log. From this perspective, the contents of the database hold a caching of the latest record values in the logs. The truth is the log. The database is a cache of a subset of the log. That cached subset happens to be the latest value of each record and index value from the log."

> "Accountants don't use erasers or they go to jail. All entries in a ledger remain in the ledger. Corrections can be made but only by making new entries in the ledger."

> "Some entries describe observed facts. For example, receiving a debit or credit against a checking account is an observed fact. Some entries describe derived facts."

> "Changes are layered over their predecessors. New values supersede old ones."

## .supports

- `philosophy.entities-are-materialized-from-events` — **converge**: "the truth is the log"; the database is the latest value of each record, drawn from the log
- `pattern=materialized-entity` — **converge**: the entity is "the latest value of each record", kept as a cache of its facts. we name the two truths apart: the facts are the record, the entity is their conclusion
- `pattern=corrected-version`, `pattern=correction-event` — **converge**: a correction is a new entry, never an erasure; "new values supersede old ones"
- `pattern=retroactive-replay` (forbid) — **converge**: the ledger keeps every entry; a rewind that rewrites the record is the eraser
- the ahbode ledger's root vs derived facts — **converge**: "observed facts" vs "derived facts"
