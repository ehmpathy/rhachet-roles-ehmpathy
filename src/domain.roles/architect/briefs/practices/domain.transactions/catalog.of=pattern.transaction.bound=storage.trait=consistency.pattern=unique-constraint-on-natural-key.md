# catalog.of=pattern.transaction.bound=storage.trait=consistency.pattern=unique-constraint-on-natural-key

a member of `catalog.of=pattern.transaction._` · bound `storage` · trait `consistency` · verdict `require` · tier `root`.

## .keeps

no duplicate entity, even under a concurrent findsert.

## .the move

add a unique constraint on the entity's natural key, in the storage. the storage checks it inside the commit, so no concurrent writer slips past it. a findsert with none races: two callers find none, both insert.

## .in our tools

`DomainEntity.unique` declares the natural key; the storage constraint enforces it. `findsert` and `upsert` lean on it (`rule.forbid.nonidempotent-mutations`, mechanic).

## .the failure it prevents

two records for one real-world entity, born in the same 300ms — the core case of `rule.forbid.check-then-write`.

## .source

> "Unique constraints ensure that the data contained in a column, or a group of columns, is unique among all the rows in the table." — postgresql 19 docs, §5.5.3 ✅

## .see also

- `rule.require.unique-constraints-on-natural-keys` — the rule that enforces this member
