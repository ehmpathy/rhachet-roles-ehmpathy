# F21 — one decision: the hook's pure core stays in bash until one lift moves it all

- **fork:** lift the hook's pure operations out of the gate now, or defer. four earlier forks each
  held one slice of this as a local call: F9 (rank tiers stay inline), F16 (fuzzy rank → lib),
  F17 (trim loop stays wet), and the render + parse operations copied across three files. the
  i009 arch-defects review named them as one decision: does the pure core (edit distance,
  subsequence, scorer, tree render, settings parse) belong in bash at all, or behind a thin bash
  shim over a tested module? this fulcrum is that one decision.
- **taken:** defer, dreamed, as one lift. it is safe but dirty: it spans two role dirs plus the
  build copy, adds a sourced seam (or a module call) to a gate that runs on every Bash call, and
  that seam owes a fail-closed guard, malfunction clamps, and a case23 cost re-measure.
  `permissions.get --for` already shells out to the hook for the verdict and rank, so the two can
  never disagree on *what* is allowed; only render and parse shapes are copied.
- **in the meantime:** the copies stay in step by name and by guard. `get_claude_dir` and
  `get_bash_patterns` now name one operation each across the hook, the skill, and the notice, and
  the skill's print functions carry the hook's never-fail guard.
- **dream:** `.dream/v2026_10_04.feat.lift-the-permission-render-operations-into-a-sourced-lib.md`
  (it also folds in the F16 fuzzy-rank lift).
- **rework:** dirty — three callers, a new seam, a cost re-measure.
- **confidence:** 70% — the rule-of-three case is real; the open question is when.
- **where:** `pretooluse.check-permissions.sh`, `sessionstart.notify-permissions.sh`, `permissions.get.sh`.
- **verdict:** —
