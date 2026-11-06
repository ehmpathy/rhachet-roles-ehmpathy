# F5: close #504 in favor of #528

- **fork**: close `git.branch.sprout` (#504) as covered by cutover, or keep it as its own verb.
- **taken**: close. #504's `--from main` mode is cutover with no picks and a clean tree (cell C1).
  its `--from current` mode branches off HEAD for experiments — a different goal from a cutover
  (it keeps the stale history), and a plain branch cut, not yet a recurrent pain.
- **rework**: clean — a later verb can add `--from current` with no change to cutover.
- **confidence**: 80%.
- **where**: q4; inventory C1.
- **verdict**: approved by wisher, 2026-10-12 — "close for #528"
