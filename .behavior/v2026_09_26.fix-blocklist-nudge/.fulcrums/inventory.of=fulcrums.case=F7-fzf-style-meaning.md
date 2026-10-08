# F7 — what "typo fzf search style" means

- **fork:** (a) fzf's own algorithm — subsequence match, so `grs` ranks `grepsafe`; (b) a ranked,
  typo-tolerant list — edit distance, so `gti` ranks `git`; (c) both.
- **taken:** (b). the wish says *typo* first, and a transposition like `gti` is not a subsequence of
  `git`, so (a) alone misses the commonest typo. subsequence match was in the first draft and cut in
  the requirements review as a knob no observed block needed.
- **rework:** clean — a fourth tier in one rank function.
- **confidence:** 70% — "fzf" names a specific algorithm, and (a) is its literal sense.
- **where:** yield §contract (fuzzy score), case=2.
- **verdict:** —
