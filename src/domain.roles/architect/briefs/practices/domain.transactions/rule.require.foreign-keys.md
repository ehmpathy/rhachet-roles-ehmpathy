# rule.require.foreign-keys

## .what

declare a foreign key in the schema for every reference between records in one storage. the storage checks it inside the commit: an insert of an orphan fails, and a delete of a referenced parent fails or cascades as declared.

## .the smell

```ts
// 👎 a check in code: the surfer can be deleted between the read and the insert
const surfer = await daoSurfer.getOne({ by: { primary: { uuid: input.surferUuid } } }, context);
if (!surfer) throw new ConstraintError('surfer not found');
await daoLessonReservation.set({ reservation }, context);
```

the tells:

- a `*_uuid` or `*_id` column with no `references` clause
- a lookup in code that stands in for the reference check
- a cleanup job that deletes orphan records

## .the cure

```sql
-- 👍 the storage refuses an orphan, even under a concurrent delete
surfer_uuid uuid not null references surfer (uuid)
```

the domain object holds a ref (`Ref<typeof Surfer>`); the foreign key holds the same rule in the storage.

> "A foreign key constraint specifies that the values in a column (or a group of columns) must match the values appearing in some row of another table." — postgresql 19 docs, §5.5.5 ✅

## .enforcement

- a reference between records in one storage, with no foreign key = **blocker**. harm: a delete lands between the read and the insert, and a lesson reservation persists for a surfer who no longer exists

## .see also

- `catalog.of=pattern.transaction.bound=storage.trait=consistency.pattern=foreign-key` — the member, in full
- `rule.forbid.check-then-write` — the race this closes
