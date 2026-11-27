# ref.2016.kleppmann

grade: ✅ — the author's own page
cite: Martin Kleppmann (2016, 8 February). "How to do distributed locking." *Martin Kleppmann's blog*. https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html
seen: `.raw/page.kleppmann2016-distributed-locking.json` — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`

## .quotes

> "Unfortunately, even if you have a perfect lock service, the code above is broken."

> "However, if the GC pause lasts longer than the lease expiry period, and the client doesn't realise that it has expired, it may go ahead and make some unsafe change. This bug is not theoretical: HBase used to have this problem"

> "You simply cannot make any assumptions about timing, which is why the code above is fundamentally unsafe, no matter what lock service you use."

> "The fix for this problem is actually pretty simple: you need to include a fencing token with every write request to the storage service. In this context, a fencing token is simply a number that increases (e.g. incremented by the lock service) every time a client acquires the lock."

### lock for efficiency vs for correctness — added 2026-11-27 (`.raw/page.kleppmann2016-distributed-locking-full.json.txt`, fetched 2026-11-27)

> "The purpose of a lock is to ensure that among several nodes that might try to do the same piece of work, only one actually does it (at least only one at a time). [...] At a high level, there are two reasons why you might want a lock in a distributed application: for efficiency or for correctness. To distinguish these cases, you can ask what would happen if the lock failed:"

> "Efficiency: Taking a lock saves you from unnecessarily doing the same work twice (e.g. some expensive computation). If the lock fails and two nodes end up doing the same piece of work, the result is a minor increase in cost (you end up paying 5 cents more to AWS than you otherwise would have) or a minor inconvenience (e.g. a user ends up getting the same email notification twice)."

> "Correctness: Taking a lock prevents concurrent processes from stepping on each others’ toes and messing up the state of your system. If the lock fails and two nodes concurrently work on the same piece of data, the result is a corrupted file, data loss, permanent inconsistency, the wrong dose of a drug administered to a patient, or some other serious problem."

> "Both are valid cases for wanting a lock, but you need to be very clear about which one of the two you are dealing with."

> "The lock has a timeout (i.e. it is a lease), which is always a good idea (otherwise a crashed client could end up holding a lock forever and never releasing it). However, if the GC pause lasts longer than the lease expiry period, and the client doesn’t realise that it has expired, it may go ahead and make some unsafe change."

> "If you need locks only on a best-effort basis (as an efficiency optimization, not for correctness), I would recommend sticking with the straightforward single-node locking algorithm for Redis [...], and documenting very clearly in your code that the locks are only approximate and may occasionally fail."

> "On the other hand, if you need locks for correctness, please don’t use Redlock. Instead, please use a proper consensus system such as ZooKeeper [...]. (At the very least, use a database with reasonable transactional guarantees.) And please enforce use of fencing tokens on all resource accesses under the lock."

## .supports

- advisory lock as a mutex: a lock service is safe for efficiency (a duplicate is a minor cost) and unsafe alone for correctness (a pause past the lease lets two clients both act); a correctness need puts the check in the storage that takes the write, with a fencing token

- `catalog.of=pattern.transaction.bound=contract.trait=isolation.pattern=distributed-lock` (verdict forbid) — a lock kept across a contract is unsafe under any lock service; the fix moves the check into the storage that takes the write (a fencing token, which is `pattern=version-check` by another name)
