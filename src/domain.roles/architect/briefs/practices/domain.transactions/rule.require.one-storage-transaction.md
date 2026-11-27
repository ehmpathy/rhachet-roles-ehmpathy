# rule.require.one-storage-transaction

## .what

wrap every write of one aggregate's records in one transaction. it commits whole, or rolls back whole. the transaction reaches no wider than that one aggregate (`rule.require.operation-per-transaction`).

## .the smell

```ts
// 👎 two writes, two commits: a crash between them leaves a lesson with no slot for its board
await daoLesson.set({ lesson }, context);
await daoLessonSlot.set({ slot }, context);
```

the tells:

- two or more writes in one operation with no transaction around them
- a parent and its children written in separate commits
- a debit and its credit written in separate commits

## .the cure

```ts
// 👍 the entrypoint opened one transaction; both writes join it through context
await daoLesson.set({ lesson }, context); // context.dbConnection = the open transaction
await daoLessonSlot.set({ slot }, context);
```

- the entrypoint opens the transaction and passes its connection down through context (`rule.require.transaction-at-the-entrypoint`)
- one business transaction is one domain operation (`rule.require.operation-per-transaction`)

> "The essential point of a transaction is that it bundles multiple steps into a single, all-or-nothing operation." — postgresql 19 docs, §3.4 "Transactions" ✅

## .enforcement

- a write of two or more records of one aggregate, outside one transaction = **blocker**. harm: a crash or timeout between the writes persists a half-written record — a parent with no children, a debit with no credit — and readers act on it

## .see also

- `catalog.of=pattern.transaction.bound=storage.trait=atomicity.pattern=one-storage-transaction` — the member, in full
- `rule.require.transaction-at-the-entrypoint` — who opens the transaction
- `rule.require.operation-per-transaction` — how wide one transaction reaches
- `rule.forbid.sagas` — the same law, consistency at rest, across contracts
