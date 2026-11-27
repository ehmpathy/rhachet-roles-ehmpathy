# rule.require.upsert-on-natural-key

## .what

write a resource with an insert-only upsert on its natural key: a re-run converges, it never duplicates, and it never overwrites the past. never run an `update` on domain data.

## .the smell

```ts
// 👎 a retried create inserts a second surfer
await dbConnection.query('insert into surfer (email, name) values ($1, $2)', [email, name]);

// 👎 an overwrite: the prior skill level is gone, and two racers leave only the last
await dbConnection.query('update surfer set skill_level = $1 where email = $2', [level, email]);
```

the tells:

- a `create*`, `insert*`, `add*`, or `save*` mutation (`rule.forbid.nonidempotent-mutations`, mechanic)
- an `update` that changes a domain attribute in place
- a table with no version records, where a reader may need to know what changed

## .the cure — insert only

1. **find or insert the identity** — the static record holds the natural key and every attribute that never changes. find it by the natural key; insert it only if absent. a unique constraint refuses a second insert from a concurrent writer (`rule.require.unique-constraints-on-natural-keys`); the loser fails loud, and its retry finds the winner's record
2. **append a version, only on change** — the version record holds the attributes that may change. append one only if the desired attributes differ from the latest; a re-run with the same attributes appends naught
3. **move the current-version pointer forward only** — the pointer updates only to a version newer than the one it holds, so a late write never moves it back

tool: `ehmpathy/sql-schema-generator` generates the static table, the `_version` table, the `_cvp` pointer, the `upsert_<entity>` function, and a `_current` view, from a declared entity. its readme names the move "insert only" ✅.

the contrast: postgres's `insert … on conflict do update` is atomic and idempotent, yet it overwrites. reach for it only where no reader ever needs the history and the resource has no attribute worth a version.

## .enforcement

- a mutation of domain data that duplicates on retry = **blocker**. harm: a retried create persists a second record for one surfer
- an `update` that overwrites a domain attribute with no version kept = **blocker**. harm: the value a reader acted on is erased, with no record that it changed
- an overwrite upsert where no reader needs the history = **nitpick**

## .see also

- `catalog.of=pattern.transaction.bound=storage.trait=idempotency.pattern=upsert-on-natural-key` — the member, in full
- `rule.forbid.nonidempotent-mutations` (mechanic) — the verbs this enforces
- `rule.require.idempotent-operations` — the contract this serves
