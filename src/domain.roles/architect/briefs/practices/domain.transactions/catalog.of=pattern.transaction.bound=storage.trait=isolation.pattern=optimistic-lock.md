# catalog.of=pattern.transaction.bound=storage.trait=isolation.pattern=optimistic-lock

a member of `catalog.of=pattern.transaction._` · bound `storage` · trait `isolation` · verdict `require` · tier `root`.

## .keeps

no lost update between two writers of one record; no older version applied over a newer.

## .the move

1. **design the read-modify-write out, first.** a value its records could derive — a surfer's lesson count, an instructor's booked total — is derived from them, never kept and changed in place. a unique key refuses a double (`pattern=unique-constraint-on-natural-key`)
2. **where one is unavoidable, guard it** — the last-board capacity race on a slot. use the database's optimistic-lock capacity: an expected-version guard on the version read. the write lands only if the record still carries that version; a mismatch is the conflict — raised, re-read, retried. where the database lacks the capacity, pave one

across a contract, the same check guards an apply: a consumer applies a message only if its version is newer than the one on record (`pattern=guarded-status-transitions`).

## .in our tools

one example shape, never the required mechanism: an expected-version hash — the hash of the version's values, computed at read and again at write, never kept as a column. the caller passes the hash it read; the insert-only upsert writes the next version only if the current version still carries it (`pattern=upsert-on-natural-key`). other databases offer the same capacity as a conditional write, an etag, or a compare-and-set. a conflict is raised as an error, never swallowed (`rule.forbid.failhide`, mechanic).

## .the failure it prevents

two surfers reserve the last board: both read stock = 1, both write, one write erases the other.

## .source

> "Prevents conflicts between concurrent business transactions by detecting a conflict and rolling back the transaction." — fowler 2002, *patterns of enterprise application architecture*, "optimistic offline lock" ✅

origin: kung & robinson 1981, "on optimistic methods for concurrency control", acm tods 6(2), doi:10.1145/319566.319567 (title and metadata only)

## .see also

- `rule.require.optimistic-locks` — the rule that enforces this member
- `pattern=pessimistic-lock` — the alternative under hot contention
