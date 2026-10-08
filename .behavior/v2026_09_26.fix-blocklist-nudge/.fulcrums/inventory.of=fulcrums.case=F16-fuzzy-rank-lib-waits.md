# F16 — the fuzzy rank stays inside the hook until a second consumer

- **fork:** lift `get_osa_distance`, `is_subsequence`, `get_max_edits`, and the scorer into a
  sourced `lib.fuzzy-rank.sh` now, vs wait.
- **taken:** wait. no second consumer exists today (`rule.prefer.wet-over-dry`), and a sourced
  seam in a gate needs its own fail-closed guard plus a case23 re-measure.
- **dream:** `.dream/v2026_09_27.feat.lift-the-fuzzy-rank-into-a-sourced-lib.md`
- **rework:** clean — a move plus a `source` line.
- **confidence:** 85%.
- **where:** `pretooluse.check-permissions.sh`, the rank procedures.
- **verdict:** —
