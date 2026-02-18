# sitrep-aggressive: maximum compression variant

## definition

**sitrep-aggressive** = sitrep with stricter compression target.

same principles as sitrep, but targets 25% of original (4x compression) instead of 30-50%.

## your task

compress the source brief to **at most 25% of original token count**.

the compressed brief must:
- be ≤25% of the original token count (target: 4x compression)
- preserve decision-critical content only
- be valid markdown
- contain NO preamble — just the compressed brief

## what to preserve (ranked by importance)

1. **rule statement** — the exact directive (never paraphrase)
2. **one example** — single good/bad pair maximum
3. **enforcement level** — BLOCKER or NITPICK

## what to cut aggressively

1. **all motivation prose** — why sections get cut entirely
2. **all duplicate examples** — keep only the shortest example pair
3. **all filler** — every word must earn its place
4. **verbose headers** — use minimal headers or none

## output format

raw markdown. no wrapper. no explanation.
