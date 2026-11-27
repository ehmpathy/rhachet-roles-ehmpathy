# ref.2009.helland-campbell

grade: ✅ — the arxiv pdf, text extracted from the bytes the browser received (the cidr copy returned 404)
cite: Pat Helland & Dave Campbell (2009). "Building on Quicksand." *CIDR Perspectives 2009*. arXiv:0909.1788. https://arxiv.org/pdf/0909.1788
seen: `.raw/pdf.helland-campbell2009-quicksand.pdf` → `.raw/pdf.helland-campbell2009-quicksand.pdf.txt` (`rhx pdf.text`) — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`. helland's blog post "memories, guesses, and apologies" (cited by the paper as [16]) redirected to the msdn archive index on two fetches and is not cited

## .quotes

> "Distributed transactions (especially using the Two Phase Commit protocol [3]) result in fragile systems and reduced availability. For this reason, they are rarely used in production systems, particularly when the resource managers span trust and authority boundaries."

> "Apologies: When a mistake is made (either due to replication anomalies or because the FAA grounds your jets and you cannot honor your flight reservations), you apologize. Every business includes apologies. As mentioned above, these may be manual with the software enqueuing the problem for human work. Alternatively, application code may issue some apologies for which it has specially designed apology code while asking for human help for those apologies beyond its designed cases."

> "Even if the computer systems are perfect, business includes apologizing because stuff will go wrong!"

> "Both the Dynamo/Shopping-Cart example and the Banking example show the capture of the application's desires." … "operation-centric work can be made commutative (with the right operations and the right semantics) where a simple READ/WRITE semantic does not lend itself to commutativity."

> "So, even as we look at the topic of managing resources under asynchrony, we see the importance of having uniquely identified requests so we can create idempotent behavior."

## .supports

- `pattern=two-phase-commit` (forbid) — **converge**: fragile, reduced availability, "rarely used in production systems"
- `pattern=saga` (forbid), cure step 5 — **converge**: a reversal is an apology, a new business act the domain records and runs forward (a refund, a rebook, a human task), never a revert of stored values. the paper names the operation as the unit, not the read and write
- `pattern=supplied-exid`, `pattern=idempotency-key` — the "uniquifier" that makes a retry idempotent
