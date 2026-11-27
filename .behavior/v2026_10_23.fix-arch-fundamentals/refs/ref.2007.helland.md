# ref.2007.helland

grade: ✅ — the conference's own pdf (cidr), text extracted from the bytes the browser received
cite: Pat Helland (2007). "Life beyond Distributed Transactions: an Apostate's Opinion." Position paper, *CIDR 2007*. https://www.cidrdb.org/cidr2007/papers/cidr07p15.pdf
seen: `.raw/pdf.helland2007-life-beyond.pdf` → `.raw/pdf.helland2007-life-beyond.pdf.txt` (`rhx pdf.text`) — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`. the venue is read from the url; the text prints pages 138 and 140, but the full range is not in the capture, so none is cited. the 2016 acm queue reprint is `ref.2016.helland`

## .quotes

> "Personally, I have invested a non-trivial portion of my career as a strong advocate for the implementation and use of platforms providing guarantees of global serializability. My experience over the last decade has led me to liken these platforms to the Maginot Line"

> "Real world almost-infinite scale applications would love the luxury of a global scope of serializability as is promised by two phase commit and other related algorithms. Unfortunately, the fragility of these leads to unacceptable pressure on availability."

> "They do this because attempts to use distributed transactions are too fragile and perform poorly."

> "In a system which cannot count on distributed transactions, the management of uncertainty must be implemented in the business logic. The uncertainty of the outcome is held in the business semantics rather than in the record lock. This is simply workflow."

> "This is done by sending a message which requests a commitment but leaves open the possibility of cancellation. This is called a tentative operation"

> "Essential to a tentative operation, is the right to cancel. … When the right to cancel is released, that is a confirming operation. Every tentative operation eventually confirms or cancels."

> "Entities are collections of named (keyed) data which may be atomically updated within the entity but never atomically updated across entities."

## .supports

- `pattern=two-phase-commit` (forbid) — **converge**: a former advocate of global serializability calls it a maginot line; fragile, poor availability
- `pattern=saga` (forbid) — **converge, in substance**: he never prescribes a compensation of a committed step. he prescribes a tentative operation — a change the domain records, then confirms or cancels. that is our cure, and its name: the change in progress is its own record (`TENTATIVE`), and the irreversible act waits for every light (`pattern=async-task`)
- `catalog.of=pattern.transaction._` — the law above the walk: uncertainty lives "in the business semantics rather than in the record lock", which is consistency at rest
