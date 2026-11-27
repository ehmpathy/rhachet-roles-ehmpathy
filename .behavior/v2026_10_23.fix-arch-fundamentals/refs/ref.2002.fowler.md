# ref.2002.fowler

grade: ✅ for the quote (the author's own catalog page); ☑️ for the metadata (the book's year from the catalog, not the publisher page)
cite: Martin Fowler (2002). *Patterns of Enterprise Application Architecture*, "Optimistic Offline Lock" (by David Rice). catalog entry: martinfowler.com/eaaCatalog/optimisticOfflineLock.html.
seen: `.raw/page.fowler-optimistic-offline-lock.json` — fetched 2026-11-24 by `.playbooks/fetch-sources.play.ts`

## .quotes

> "Prevents conflicts between concurrent business transactions by detecting a conflict and rolling back the transaction."

> "Optimistic Offline Lock solves this problem by validating that the changes about to be committed by one session don't conflict with the changes of another session."

### pessimistic offline lock — added 2026-11-27

cite: Martin Fowler (2002). *Patterns of Enterprise Application Architecture*, "Pessimistic Offline Lock" (by David Rice; the catalog page is dated 05 March 2003). catalog entry: martinfowler.com/eaaCatalog/pessimisticOfflineLock.html
seen: `.raw/page.fowler-pessimistic-offline-lock.json.txt` · `.raw/page.fowler-optimistic-offline-lock-2.json.txt` — fetched 2026-11-27

> "Prevents conflicts between concurrent business transactions by allowing only one business transaction at a time to access data."

> "Pessimistic Offline Lock prevents conflicts by avoiding them altogether. It forces a business transaction to acquire a lock on a piece of data before it starts to use it, so that, most of the time, once you begin a business transaction you can be pretty sure you'll complete it without being bounced by concurrency control."

> "The first approach to try is Optimistic Offline Lock. However, that pattern has its problems. If several people access the same data within a busi-ness transaction, one of them will commit easily but the others will conflict and fail. Since the conflict is only detected at the end of the business transac-tion, the victims will do all the transaction work only to find at the last minute that the whole thing will fail and their time will have been wasted." (the page text carries the hyphen breaks of the print edition)

> "Whereas Pessimistic Offline Lock assumes that the chance of session conflict is high and therefore limits the system's concurrency, Optimistic Offline Lock assumes that the chance of conflict is low." (optimistic offline lock page)

not found on the catalog pages: the terms "exclusive read lock" and "exclusive write lock". the pages say "for more details go to Chapter 16 of the online ebook at oreilly.com"; that chapter (`https://www.oreilly.com/library/view/patterns-of-enterprise/0321127420/ch16.html`) returned 403 "Access Denied" to the bhrowser on 2026-11-27 (`.raw/page.oreilly-poeaa-ch16.json`). the names of the lock types in the book are unverified here.

## .supports

- pessimistic is a strategy (lock before use, to prevent a conflict), named against optimistic (detect a conflict at commit, roll back); "exclusive" and "shared" name lock modes (see `ref.1976.gray-lorie-putzolu-traiger`, `ref.nd.postgresql`)

- `catalog.of=pattern.transaction.bound=storage.trait=isolation.pattern=version-check`
