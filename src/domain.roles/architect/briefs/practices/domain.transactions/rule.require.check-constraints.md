# rule.require.check-constraints

## .what

declare a check constraint in the schema for every value range a domain invariant fixes, so the storage refuses the illegal record at commit when code forgets.

## .the smell

```sql
-- 👎 stock can go negative: only the domain object guards it
create table board_slot (
  uuid uuid primary key,
  boards_in_stock int not null
);
```

the tells:

- a numeric or status column whose legal range lives only in code
- a migration, a backfill, or a second service that writes the table past the domain object
- a comment like "must be ≥ 0" with no constraint beside it

## .the cure

```sql
-- 👍 the storage refuses the illegal record at commit
boards_in_stock int not null check (boards_in_stock >= 0)
```

both hold: the domain object validates the shape in code; the schema holds the same rule as a last line.

> "A check constraint … allows you to specify that the value in a certain column must satisfy a Boolean (truth-value) expression." — postgresql 19 docs, §5.5.1 ✅

## .enforcement

- a value range a declared invariant fixes, with no check constraint in the schema = **blocker**. harm: a path that skips the domain object — a migration, a backfill, a second writer — persists an illegal value (a negative stock count) that every reader then trusts

## .see also

- `catalog.of=pattern.transaction.bound=storage.trait=consistency.pattern=check-constraint` — the member, in full
- `rule.forbid.scattered-invariant-guards` — the guard in one caller this backs up
- `rule.forbid.check-then-write` — the race a check in code cannot close
