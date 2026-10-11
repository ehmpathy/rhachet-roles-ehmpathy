# F1 — accrue now, or dream both?

- **fork:** the wish says *"catch a dream to begin to accrue and report upstream the commands which
  were nudged without a good alternative AND especially the ones that were asked twice"*. read (a):
  the accrual AND the report are both future work, held in one dream. read (b): build the local
  accrual now; dream the upstream report.
- **taken:** (b). the hook already writes a nudge record on each block; one append-only jsonl row
  costs little, and without it the dream has no data to start from ("begin to accrue").
- **rework:** clean — drop the ledger rows and case=4/case=5 then-clauses; the nudge render is
  independent of them.
- **confidence:** 60% — the sentence opens with "catch a dream", which leans toward (a).
- **where:** `1.vision.yield.md` §contract (ledger), `case=4`, `case=5`.
- **verdict:** —
