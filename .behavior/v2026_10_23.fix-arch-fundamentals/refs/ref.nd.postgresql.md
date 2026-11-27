# ref.nd.postgresql

grade: ✅ — the publisher's own docs (postgresql global development group), current version 19
cite: PostgreSQL 19 Documentation. §3.4 "Transactions"; §5.5 "Constraints"; §13.1 "Introduction" (concurrency control); §13.3 "Explicit Locking" (§13.3.1 table-level locks, §13.3.2 Row-Level Locks, §13.3.5 advisory locks); §9.29.10 "Advisory Lock Functions"; "LOCK"; "SELECT" (The Locking Clause). postgresql.org/docs/current/.
seen: `.raw/page.postgres-tutorial-transactions.json` · `.raw/page.postgres-ddl-constraints.json` · `.raw/page.postgres-explicit-locking.json` — fetched 2026-11-24 by `.playbooks/fetch-sources.play.ts`. the lock quotes below come from `.raw/page.postgres-explicit-locking-advisory.json.txt` · `.raw/page.postgres-functions-advisory.json.txt` · `.raw/page.postgres-mvcc-intro.json.txt` · `.raw/page.postgres-sql-lock.json.txt` — fetched 2026-11-27. the 2026-11-24 capture of §13.3 lacks §13.3.5; the 2026-11-27 capture contains it whole

## .quotes

> "The essential point of a transaction is that it bundles multiple steps into a single, all-or-nothing operation. The intermediate states between the steps are not visible to other concurrent transactions, and if an error occurs that prevents the transaction from completing, then none of the steps affect the database at all." (§3.4)

> "Unique constraints ensure that the data contained in a column, or a group of columns, is unique among all the rows in the table." (§5.5.3)

> "A check constraint is the most generic constraint type. It allows you to specify that the value in a certain column must satisfy a Boolean (truth-value) expression." (§5.5.1)

> "A foreign key constraint specifies that the values in a column (or a group of columns) must match the values appearing in some row of another table. We say this maintains the referential integrity between two related tables." (§5.5.5)

> "FOR UPDATE causes the rows retrieved by the SELECT statement to be locked as though for update. This prevents them from being locked, modified or deleted by other transactions until the current transaction ends." (§13.3.2)

> "The use of explicit locking can increase the likelihood of deadlocks, wherein two (or more) transactions each hold locks that the other wants." (§13.3.4)

### advisory lock (§13.3.5, §9.29.10) — added 2026-11-27

> "PostgreSQL provides a means for creating locks that have application-defined meanings. These are called advisory locks, because the system does not enforce their use — it is up to the application to use them correctly. Advisory locks can be useful for locking strategies that are an awkward fit for the MVCC model. For example, a common use of advisory locks is to emulate pessimistic locking strategies typical of so-called “flat file” data management systems. While a flag stored in a table could be used for the same purpose, advisory locks are faster, avoid table bloat, and are automatically cleaned up by the server at the end of the session." (§13.3.5)

> "There are two ways to acquire an advisory lock in PostgreSQL: at session level or at transaction level. Once acquired at session level, an advisory lock is held until explicitly released or the session ends. Unlike standard lock requests, session-level advisory lock requests do not honor transaction semantics: a lock acquired during a transaction that is later rolled back will still be held following the rollback, and likewise an unlock is effective even if the calling transaction fails later." (§13.3.5)

> "Transaction-level lock requests, on the other hand, behave more like regular lock requests: they are automatically released at the end of the transaction, and there is no explicit unlock operation. This behavior is often more convenient than the session-level behavior for short-term usage of an advisory lock." (§13.3.5)

> "All these functions are intended to be used to lock application-defined resources, which can be identified either by a single 64-bit key value or two 32-bit key values (note that these two key spaces do not overlap). If another session already holds a conflicting lock on the same resource identifier, the functions will either wait until the resource becomes available, or return a false result, as appropriate for the function. Locks can be either shared or exclusive: a shared lock does not conflict with other shared locks on the same resource, only with exclusive locks." (§9.29.10)

> "Both advisory locks and regular locks are stored in a shared memory pool whose size is defined by the configuration variables max_locks_per_transaction and max_connections. Care must be taken not to exhaust this memory or the server will be unable to grant any locks at all." (§13.3.5)

> "In the above queries, the second form is dangerous because the LIMIT is not guaranteed to be applied before the locking function is executed. This might cause some locks to be acquired that the application was not expecting, and hence would fail to release (until it ends the session). From the point of view of the application, such locks would be dangling, although still viewable in pg_locks." (§13.3.5, on `SELECT pg_advisory_lock(id) FROM foo WHERE id > 12345 LIMIT 100`)

### lock modes: shared vs exclusive (§13.3.1, §13.3.2)

> "Remember that all of these lock modes are table-level locks, even if the name contains the word “row”; the names of the lock modes are historical. To some extent the names reflect the typical usage of each lock mode — but the semantics are all the same. The only real difference between one lock mode and another is the set of lock modes with which each conflicts (see Table 13.2). Two transactions cannot hold locks of conflicting modes on the same table at the same time. [...] Notice in particular that some lock modes are self-conflicting (for example, an ACCESS EXCLUSIVE lock cannot be held by more than one transaction at a time) while others are not self-conflicting (for example, an ACCESS SHARE lock can be held by multiple transactions)." (§13.3.1)

> "FOR UPDATE causes the rows retrieved by the SELECT statement to be locked as though for update. This prevents them from being locked, modified or deleted by other transactions until the current transaction ends. That is, other transactions that attempt UPDATE, DELETE, SELECT FOR UPDATE, SELECT FOR NO KEY UPDATE, SELECT FOR SHARE or SELECT FOR KEY SHARE of these rows will be blocked until the current transaction ends" (§13.3.2, FOR UPDATE)

> "FOR SHARE: Behaves similarly to FOR NO KEY UPDATE, except that it acquires a shared lock rather than exclusive lock on each retrieved row. A shared lock blocks other transactions from performing UPDATE, DELETE, SELECT FOR UPDATE or SELECT FOR NO KEY UPDATE on these rows, but it does not prevent them from performing SELECT FOR SHARE or SELECT FOR KEY SHARE." (§13.3.2)

> "Row-level locks do not affect data querying; they block only writers and lockers to the same row. Row-level locks are released at transaction end or during savepoint rollback, just like table-level locks." (§13.3.2)

> "PostgreSQL provides various lock modes to control concurrent access to data in tables. These modes can be used for application-controlled locking in situations where MVCC does not give the desired behavior." (§13.3, opening)

> "The main advantage of using the MVCC model of concurrency control rather than locking is that in MVCC locks acquired for querying (reading) data do not conflict with locks acquired for writing data, and so reading never blocks writing and writing never blocks reading." (§13.1)

> "When acquiring locks automatically for commands that reference tables, PostgreSQL always uses the least restrictive lock mode possible. LOCK TABLE provides for cases when you might need more restrictive locking." (LOCK, Notes)

> "LOCK TABLE only deals with table-level locks, and so the mode names involving ROW are all misnomers." (LOCK, Notes)

## .supports

- `catalog.of=pattern.transaction`: one-store-transaction · unique-constraint-on-natural-key · check-constraints-and-foreign-keys · row-lock
- advisory lock vs pessimistic lock: an advisory lock locks a name the application picks, and "the system does not enforce" it; a `FOR UPDATE` lock blocks every other transaction's write to the records the select returned, with no cooperation needed from the other writer
- exclusive vs pessimistic: "exclusive" and "shared" are lock modes (the set of modes each conflicts with); "pessimistic" is the strategy of lock before use (see `ref.2002.fowler`). a pessimistic lock may be taken in shared mode (`FOR SHARE`) or exclusive mode (`FOR UPDATE`)
