# ref.1981.kung-robinson

grade: ✅ — metadata from crossref; quotes from the paper's own text (the author's copy on his Harvard page; the acm library page sits behind a wall)
cite: H. T. Kung & John T. Robinson (1981). "On optimistic methods for concurrency control." *ACM Transactions on Database Systems* 6(2), 213–226. doi:10.1145/319566.319567.
seen: `.raw/kung-robinson1981.crossref.json` — fetched 2026-11-24 by `.playbooks/fetch-sources.play.ts`

### text read 2026-11-27

grade: ✅ for the quotes below — the paper's own text, the ACM TODS print scan that the author H. T. Kung hosts on his Harvard page
seen: `.raw/pdf.kung-robinson1981-harvard.pdf` (url `https://www.eecs.harvard.edu/~htk/publication/1981-tods-kung-robinson.pdf`, 1,009,216 bytes) · text via `rhx pdf.text` → `.raw/pdf.kung-robinson1981-harvard.pdf.txt` — fetched 2026-11-27 by `.playbooks/fetch-sources.play.ts`

> "Most current approaches to concurrency control in database systems rely on locking of data objects as a control mechanism. In this paper, two families of nonlocking concurrency controls are presented. The methods used are “optimistic” in the sense that they rely mainly on transaction backup as a control mechanism, “hoping” that conflicts between transactions will not occur." (abstract)

> "We propose two families of concurrency controls that do not use locking. These methods are “optimistic” in the sense that they rely for efficiency on the hope that conflicts between transactions will not occur." (§1)

> "It is required that any transaction consist of two or three phases: a read phase, a validation phase, and a possible write phase (see Figure 1). During the read phase, all writes take place on local copies of the nodes to be modified. Then, if it can be established during the validation phase that the changes the transaction made will not cause a loss of integrity, the local copies are made global in the write phase." (§1)

> "In a locking approach, transactions are controlled by having them wait at certain points, while in an optimistic approach, transactions are controlled by backing them up." (§7, conclusion (1))

> "The major difficulty in locking approaches is deadlock, which can be solved by using backup; in an optimistic approach, the major difficulty is starvation, which can be solved by using locking." (§7, conclusion (3))

> "These methods may well be superior to locking methods for systems where transaction conflict is highly unlikely." (§7)

note: the paper contrasts "locking" with "optimistic" (validate at commit, back up on a conflict). it does not use the word "pessimistic"; the name "pessimistic" for the lock-before-use strategy comes from the offline-lock catalog (`ref.2002.fowler`).

## .supports

- `catalog.of=pattern.transaction.bound=storage.trait=isolation.pattern=version-check` — the origin; the paper's words on a conflict met by backup; the entry-point quote the member carries also comes from `ref.2002.fowler`
- pessimistic vs optimistic: a lock makes a transaction wait before it acts; the optimistic method reads freely, validates at the end, and backs up on a conflict
