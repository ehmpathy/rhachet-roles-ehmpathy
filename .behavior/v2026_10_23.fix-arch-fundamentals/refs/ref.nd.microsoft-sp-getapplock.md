# ref.nd.microsoft-sp-getapplock

grade: ✅ — the publisher's own docs (microsoft learn)
cite: Microsoft. "sys.sp_getapplock (Transact-SQL)." SQL Server, Azure SQL Database, Azure SQL Managed Instance documentation. Microsoft Learn. learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-getapplock-transact-sql
seen: `.raw/page.mssql-sp-getapplock.json.txt` — fetched 2026-11-27 by `.playbooks/fetch-sources.play.ts`

## .quotes

> "Places a lock on an application resource."

> "A string specifying a name that identifies the lock resource. [...] The application must ensure that the resource name is unique. The specified name is hashed internally into a value that can be stored in the SQL Server lock manager." (@Resource)

> "The owner of the lock, which is the @LockOwner value when the lock was requested. @LockOwner is varchar(32), with a default of Transaction. The value can also be Session. When the @LockOwner value is Transaction, by default or specified explicitly, sp_getapplock must be executed from within a transaction." (@LockOwner)

> "Locks placed on a resource are associated with either the current transaction or the current session. Locks associated with the current transaction are released when the transaction commits or rolls back. Locks associated with the session are released when the session is logged out. When the server shuts down for any reason, all locks are released." (Remarks)

> "When an application calls sp_getapplock multiple times for the same lock resource, sp_releaseapplock must be called the same number of times to release the lock." (Remarks)

> lock modes accepted by @LockMode: "Shared, Update, IntentShared, IntentExclusive, Exclusive" (the five values are separate list items on the page)

> "A lock timeout value in milliseconds. [...] A value of -1 (default) indicates no timeout period (that is, wait forever). To indicate that a lock request should return a return code of -1 instead of waiting for the lock when the request can't be granted immediately, specify 0." (@LockTimeout)

## .supports

- advisory lock as a mutex: the lock is on "an application resource" the application names, and "the application must ensure that the resource name is unique" — the server does not link the name to any data. the owner is the transaction (default) or the session
- exclusive vs pessimistic: the same shared/exclusive lock modes apply to an application lock as to a data lock — the mode is a separate axis from the object locked
