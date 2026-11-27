# catalog.of=pattern.transaction.bound=storage.trait=consistency.pattern=foreign-key

a member of `catalog.of=pattern.transaction._` · bound `storage` · trait `consistency` · verdict `require` · tier `root`.

## .keeps

a reference names a record that exists, even under a concurrent delete.

## .the move

declare a foreign key in the schema. the storage checks it inside the commit: an insert of an orphan fails, and a delete of a referenced parent fails or cascades as declared.

## .in our tools

a domain object holds a ref (`Ref<typeof Surfer>`); the foreign key holds the same rule in the storage. a check in code cannot hold it alone: a delete can land between the read and the insert (`rule.forbid.check-then-write`).

## .the failure it prevents

a lesson reservation for a surfer whose record was deleted a moment before.

## .source

> "A foreign key constraint specifies that the values in a column (or a group of columns) must match the values appearing in some row of another table." — postgresql 19 docs, §5.5.5 ✅

## .see also

- `rule.require.foreign-keys` — the rule that enforces this member
