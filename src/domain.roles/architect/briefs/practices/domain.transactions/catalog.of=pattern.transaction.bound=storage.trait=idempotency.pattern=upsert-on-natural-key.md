# catalog.of=pattern.transaction.bound=storage.trait=idempotency.pattern=upsert-on-natural-key

a member of `catalog.of=pattern.transaction._` · bound `storage` · trait `idempotency` · verdict `require` · tier `root`.

## .keeps

a re-run converges; it never duplicates, and it never overwrites the past.

## .the move — insert only

the upsert never runs an `update` on domain data. it splits the resource in two, and appends:

1. **find or insert the identity** — the static record holds the natural key and every attribute that never changes. find it by the natural key; insert it only if absent. a unique constraint on the natural key refuses a second insert from a concurrent writer (`pattern=unique-constraint-on-natural-key`), so the loser fails loud and its retry finds the winner's record
2. **append a version, only on change** — the version record holds the attributes that may change, stamped `effective_at`. read the latest version; append a new one only if the desired attributes differ. a re-run with the same attributes appends naught
3. **move the current-version pointer forward only** — a pointer record caches the latest version for fast reads; it updates only to a version newer than the one it holds, so a late write never moves it back (the forward-only rule of `pattern=guarded-status-transitions`)

a re-run lands on the same static record and the same version, every time. the history of every change stays in the version records.

## .in our tools

`sql-schema-generator` generates the whole move from a declared entity: the static table with its `_ux` unique constraint, the `_version` table, the `_cvp` pointer table, the `upsert_<entity>` function, and a `_current` view that reads it back as one record. `DomainEntity.unique` declares the natural key; the dao's `upsert` and `findsert` call the function. the verbs are the idempotent set (`rule.forbid.nonidempotent-mutations`, `rule.require.get-set-gen-verbs`, mechanic).

## .the contrast — the overwrite upsert

postgres offers a one-statement upsert: `insert … on conflict (natural key) do update`. it is atomic and idempotent, yet it overwrites: the prior value is gone, and two writers that race leave only the last. reach for it only where no reader ever needs the history and the resource has no updatable attributes worth a version.

## .the failure it prevents

a retried `create` inserts a second record; an overwrite erases the value a reader acted on, with no record that it changed.

## .source

ours: `ehmpathy/sql-schema-generator`, readme and `generateEntityUpsert` — "insert only (using temporal database design to maintain normalized tables and uniqueness constraints)"; the generated `upsert_<entity>` finds or inserts the static record, appends a version "if dynamic data has changed", and updates the pointer "only if the version we just inserted is "newer" than the currently cached version" ✅

contrast: "ON CONFLICT DO UPDATE guarantees an atomic INSERT or UPDATE outcome; provided there is no independent error, one of those two outcomes is guaranteed, even under high concurrency. This is also known as UPSERT — "UPDATE or INSERT"." — postgresql documentation, "INSERT", https://www.postgresql.org/docs/current/sql-insert.html ✅

## .see also

- `rule.require.upsert-on-natural-key` — the rule that enforces this member
