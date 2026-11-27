# ref.2020.mihalcea

grade: 🟡 — the author's own blog, a practitioner's write-up, not a publisher's doc; the page shows "Last modified: Apr 30, 2020", and the first-publish date is not on the page. use for the use case, never for a guarantee
cite: Vlad Mihalcea (2020, last modified 30 April). "How do PostgreSQL advisory locks work." *vladmihalcea.com*. https://vladmihalcea.com/how-do-postgresql-advisory-locks-work/
seen: `.raw/page.vladmihalcea-advisory-locks.json.txt` — fetched 2026-11-27 by `.playbooks/fetch-sources.play.ts`

## .quotes

> "PostgreSQL, like many modern RDBMS, offers both MVCC (Multi-Version Concurrency Control) and explicit pessimistic locking for various use cases when you want a custom concurrency control mechanism. However, PostgreSQL also offers advisory locks which are very convenient to implement application-level concurrency control patterns."

> "Just like explicit pessimistic locks, advisory locks can be split into two categories: exclusive advisory locks; shared advisory locks" (the two are separate list items on the page)

> "An exclusive advisory lock will block any exclusive or shared advisory lock on the same lock key."

> "The Session-level locks are not bound to any database transaction and, once acquired, they need to be explicitly released by the application developer. Transaction-level advisory locks are bound to the currently executing transaction, and so the locks are released when the transaction ends, either with a commit or a rollback."

> "Session-level advisory locks need to be released explicitly. Even if advisory locks are reentrant, if you acquired the same lock twice, you need to release it twice as well."

> the mutex use case: "we need to coordinate access to a shared document storage. Since we have multiple nodes that can read and write these documents, we need a way to prevent both file corruption as well as reading intermediary results." and "whenever we want to write a document, we need to acquire an exclusive lock first. Once we acquired the exclusive lock, no other concurrent Session can acquire a shared or an exclusive lock for this document, so we block both reads and writes."

> why not a record lock: "Although PostgreSQL offers the possibility to acquire exclusive and shared locks on a per table row basis, this is not always convenient. What if we stored the document metadata in Apache Cassandra? To use row-level locks, we need to store a row for each document that we administer. But if we have billions of documents, we don’t want to end up with a billion-row table whose only purpose is to allow us to acquire a shared or an exclusive lock on a per-row basis."

## .supports

- advisory vs pessimistic: the author places an advisory lock beside "explicit pessimistic locking" as a second tool, and uses it where no record exists to lock (a document in file storage, whose metadata sits in another database). the lock is a name; only code that asks for the same key meets it
- exclusive vs pessimistic: the author writes "Just like explicit pessimistic locks, advisory locks can be split into" exclusive and shared — the mode splits both kinds
