# rule.require.unique-constraints-on-natural-keys

## .what

declare a unique constraint in the storage on every entity's natural key. the storage checks it inside the commit, so no concurrent writer slips past it.

## .the smell

```ts
// 👎 a findsert with no constraint: two callers find none, both insert
const found = await daoSurfer.getOne({ by: { unique: { email } } }, context);
if (found) return found;
return daoSurfer.set({ surfer }, context);
```

the tells:

- a `static unique = [...]` on the domain object, with no matched constraint in the schema
- a findsert or upsert whose table has no unique index on the natural key
- a dedupe job that merges duplicate records

## .the cure

```sql
-- 👍 the second insert fails loud; its retry finds the winner's record
create unique index surfer_ux on surfer (email);
```

`DomainEntity.unique` declares the natural key; the storage constraint enforces it. `findsert` and `upsert` lean on it (`rule.forbid.nonidempotent-mutations`, mechanic).

> "Unique constraints ensure that the data contained in a column, or a group of columns, is unique among all the rows in the table." — postgresql 19 docs, §5.5.3 ✅

## .enforcement

- an entity with a declared natural key and no unique constraint on it in the storage = **blocker**. harm: two records for one real-world entity, born in the same 300ms — two surfer accounts, two reservations for one seat — and every reader must guess which is true

## .see also

- `catalog.of=pattern.transaction.bound=storage.trait=consistency.pattern=unique-constraint-on-natural-key` — the member, in full
- `rule.forbid.check-then-write` — the race this closes; its core case
- `rule.require.upsert-on-natural-key` — the idempotent write that leans on it
