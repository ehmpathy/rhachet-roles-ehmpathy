# rule.require.transaction-at-the-entrypoint

## .what

the entrypoint — the contract handler, the task execute — opens the one transaction of a business act and passes its connection down through context. every inner operation and dao joins it; none opens its own.

## .the smell

```ts
// 👎 the dao opens and commits its own transaction, deep inside the act
const setLessonSlot = async ({ slot }, context) =>
  context.dbPool.transaction(async (txn) => txn.query(sqlUpsertSlot, slot)); // commits early
```

the tells:

- a dao or leaf operation that calls `begin`, `commit`, or `transaction(...)` itself
- a connection pool reached from an inner layer, rather than a connection received in context
- two commits inside one business act

## .the cure

- the entrypoint opens the transaction; the connection rides in `context` (`rule.require.input-context-pattern`, `rule.require.dependency-injection`, mechanic)
- inner operations and daos read the connection from context; one scope, one commit, one rollback
- dependencies point inward, so no inner layer can reach out to open a scope of its own (`rule.require.directional-deps`, mechanic)

## .enforcement

- an inner operation or dao that opens or commits its own transaction = **blocker**. harm: the inner write commits early; the outer act then fails, and half of it is already on disk

## .see also

- `catalog.of=pattern.transaction.bound=storage.trait=atomicity.pattern=transaction-at-the-entrypoint` — the member, in full
- `rule.require.one-storage-transaction` — the all-or-none unit this scopes, and its source
- `rule.require.operation-per-transaction` — one business act, one transaction
