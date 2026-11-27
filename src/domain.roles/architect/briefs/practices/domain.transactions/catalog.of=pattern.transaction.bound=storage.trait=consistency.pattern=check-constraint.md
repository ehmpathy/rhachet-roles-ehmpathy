# catalog.of=pattern.transaction.bound=storage.trait=consistency.pattern=check-constraint

a member of `catalog.of=pattern.transaction._` · bound `storage` · trait `consistency` · verdict `require` · tier `root`.

## .keeps

a value stays in its legal range.

## .the move

declare a check constraint in the schema, so the storage refuses the illegal record at commit when code forgets.

## .in our tools

the domain object validates the shape in code; the schema holds the same rule as a last line. both hold, since a migration, a backfill, or a second service can write past the code.

## .the failure it prevents

a negative stock count, written by a path that skipped the domain object.

## .source

> "A check constraint … allows you to specify that the value in a certain column must satisfy a Boolean (truth-value) expression." — postgresql 19 docs, §5.5.1 ✅

## .see also

- `rule.require.check-constraints` — the rule that enforces this member
