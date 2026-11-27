# ref.nd.sql-schema-generator

grade: ✅ — our own package, read from its repo
cite: ehmpathy. sql-schema-generator — readme.md and `src/domain.operations/generate/entityFunctions/generateEntityUpsert/` (its integration snapshot). https://github.com/ehmpathy/sql-schema-generator
seen: `rhx git.repo.get lines --in ehmpathy/sql-schema-generator --paths 'readme.md'` and `--paths '…/generateEntityUpsert.integration.test.ts.snap'` (local clone, ref origin/main) — fetched 2026-11-26

## .quotes

> "insert only (using temporal database design to maintain normalized tables and uniqueness constraints)"

> "entity version table (if updatable properties exist, for an insert-only / event-driven design, per temporal database design)"

> "upsert function (for idempotent inserts)"

from the generated `upsert_<entity>`:

> "-- find or create the static record"

> "-- insert new version record to ensure that latest dynamic data is effective, if dynamic data has changed"

> "-- update cached current version only if the version we just inserted is "newer" than the currently cached version"

and the generated static table carries the natural key as a constraint: `CONSTRAINT home_ux1 UNIQUE (name, host_ids_hash)`.

## .supports

- `catalog.of=pattern.transaction.bound=storage.trait=idempotency.pattern=upsert-on-natural-key` — the move itself: find or insert the static row, append a version only on change, move the pointer forward only. no `on conflict`, no update of domain data
- `catalog.of=pattern.transaction.bound=storage.trait=consistency.pattern=unique-constraint-on-natural-key` — the `_ux` constraint that refuses a concurrent second insert
