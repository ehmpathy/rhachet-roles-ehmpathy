# catalog.of=pattern.transaction.bound=storage.trait=isolation.pattern=pessimistic-lock

a member of `catalog.of=pattern.transaction._` · bound `storage` · trait `isolation` · verdict `require` · tier `leaf`.

## .keeps

no interleave inside a read-modify-write.

## .require when

a hot record under real contention — the last board in stock on a swell day — where `pattern=optimistic-lock` retries would thrash. it also guards an invariant over many records: lock the parent record (the slot) before a write to any child (a reservation).

## .the move

inside the transaction, use the database's lock capacity to lock the current record, then insert the next version; the second writer waits instead of retries. a relational database's `select … for update` is one shape. where the database lacks the capacity, pave one.

where no record in this storage can carry the lock, a unique key comes first; otherwise the database's advisory lock, on a key the application picks, transaction-scoped, in the one write path. the database enforces it on no write, so only code that asks for the same key waits.

pessimistic and optimistic are strategies (lock before use, or check at the write); shared and exclusive are modes (who may be inside at once). a pessimistic lock can take either mode.

## .the failure it prevents

a retry storm: every writer conflicts, retries, and conflicts again.

## .the cost

writers queue on the lock; a long transaction stalls all of them. keep the locked span short.

## .source

one database's docs, on its shape of the capacity and its cost:

> "FOR UPDATE causes the rows retrieved by the SELECT statement to be locked as though for update. This prevents them from being locked, modified or deleted by other transactions until the current transaction ends." — postgresql 19 docs, §13.3.2 ✅

> "The use of explicit locking can increase the likelihood of deadlocks" — §13.3.4 ✅ (the cost above)

> "These are called advisory locks, because the system does not enforce their use — it is up to the application to use them correctly." — §13.3.5 ✅

the two axes:

> "The semantics of exclusive mode is that the grantee may read and modify the resource and no other transaction may read or modify the resource while the exclusive lock is set." — gray, lorie, putzolu, traiger 1976, "granularity of locks and degrees of consistency in a shared data base", ibm research report rj 1654 ✅

> "In a locking approach, transactions are controlled by having them wait at certain points, while in an optimistic approach, transactions are controlled by backing them up." — kung & robinson 1981, acm tods 6(2), doi:10.1145/319566.319567, §7 ✅

## .see also

- `rule.require.pessimistic-locks` — the rule that enforces this member
- `pattern=optimistic-lock` — the default for one record
