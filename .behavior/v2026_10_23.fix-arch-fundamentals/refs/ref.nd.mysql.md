# ref.nd.mysql

grade: ✅ — the publisher's own docs (oracle corporation), MySQL 8.4 reference manual
cite: MySQL 8.4 Reference Manual. §14.14 "Locking Functions" (GET_LOCK, RELEASE_LOCK); §17.7.2.4 "Locking Reads" (SELECT … FOR SHARE, SELECT … FOR UPDATE). dev.mysql.com/doc/refman/8.4/en/locking-functions.html · dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html
seen: `.raw/page.mysql-locking-functions.json.txt` · `.raw/page.mysql-innodb-locking-reads.json.txt` — fetched 2026-11-27 by `.playbooks/fetch-sources.play.ts`

## .quotes

### user-level lock, GET_LOCK() (§14.14)

> "Tries to obtain a lock with a name given by the string str, using a timeout of timeout seconds. A negative timeout value means infinite timeout. The lock is exclusive. While held by one session, other sessions cannot obtain a lock of the same name."

> "A lock obtained with GET_LOCK() is released explicitly by executing RELEASE_LOCK() or implicitly when your session terminates (either normally or abnormally). Locks obtained with GET_LOCK() are not released when transactions commit or roll back."

> "GET_LOCK() can be used to implement application locks or to simulate record locks. Names are locked on a server-wide basis. If a name has been locked within one session, GET_LOCK() blocks any request by another session for a lock with the same name. This enables clients that agree on a given lock name to use the name to perform cooperative advisory locking. But be aware that it also enables a client that is not among the set of cooperating clients to lock a name, either inadvertently or deliberately, and thus prevent any of the cooperating clients from locking that name. One way to reduce the likelihood of this is to use lock names that are database-specific or application-specific."

> "Since GET_LOCK() establishes a lock only on a single mysqld, it is not suitable for use with NDB Cluster, which has no way of enforcing an SQL lock across multiple MySQL servers."

> "A different locking interface is available as either a plugin service or a set of loadable functions. This interface provides lock namespaces and distinct read and write locks, unlike the interface provided by GET_LOCK() and related functions."

### locking reads (§17.7.2.4)

> "If you query data and then insert or update related data within the same transaction, the regular SELECT statement does not give enough protection. Other transactions can update or delete the same rows you just queried. InnoDB supports two types of locking reads that offer extra safety:"

> "SELECT ... FOR SHARE: Sets a shared mode lock on any rows that are read. Other sessions can read the rows, but cannot modify them until your transaction commits."

> "SELECT ... FOR UPDATE: For index records the search encounters, locks the rows and any associated index entries, the same as if you issued an UPDATE statement for those rows. Other transactions are blocked from updating those rows, from doing SELECT ... FOR SHARE, or from reading the data in certain transaction isolation levels."

> "All locks set by FOR SHARE and FOR UPDATE queries are released when the transaction is committed or rolled back."

> "A SELECT ... FOR UPDATE reads the latest available data, setting exclusive locks on each row it reads. Thus, it sets the same locks a searched SQL UPDATE would set on the rows."

## .supports

- advisory lock as a mutex: a named lock any client may take; it protects only against clients that "agree on a given lock name" — the manual names a stranger who takes the name as a way to block all cooperators; the lock lasts for the session, never for a transaction
- advisory vs pessimistic: `GET_LOCK` locks a name, with no link to any record; `SELECT … FOR UPDATE` locks the records the search met, "the same as if you issued an UPDATE statement for those rows", so every writer is blocked with no agreement needed
- exclusive vs pessimistic: the manual names `FOR SHARE` a "shared mode lock" and `FOR UPDATE` an "exclusive lock" — both are locking reads taken before a write; the mode differs, the strategy (lock the records you read) is the same
