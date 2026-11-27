# ref.nd.postgresql-insert

grade: ✅ — the publisher's own page (the postgresql global development group)
cite: PostgreSQL Global Development Group. "INSERT." *PostgreSQL Documentation*, version 19, SQL Commands. https://www.postgresql.org/docs/current/sql-insert.html
seen: `.raw/page.postgres-sql-insert.json` — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`

## .quotes

> "ON CONFLICT can be used to specify an alternative action to raising a unique constraint or exclusion constraint violation error."

> "ON CONFLICT DO UPDATE guarantees an atomic INSERT or UPDATE outcome; provided there is no independent error, one of those two outcomes is guaranteed, even under high concurrency. This is also known as UPSERT — "UPDATE or INSERT". ON CONFLICT DO SELECT similarly allows an atomic INSERT or SELECT outcome. This is also known as idempotent insert or get or create."

## .supports

- `catalog.of=pattern.transaction.bound=storage.trait=idempotency.pattern=upsert-on-natural-key` — **the contrast**: the overwrite upsert, one atomic statement arbitrated by a unique index. our practice is insert only (`ref.nd.sql-schema-generator`); this is the generic move it declines
