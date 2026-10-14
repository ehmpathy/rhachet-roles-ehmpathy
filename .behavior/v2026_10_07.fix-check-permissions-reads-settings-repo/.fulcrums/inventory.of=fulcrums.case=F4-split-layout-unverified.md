# F4 — rhachet split layout taken from issue text

- **fork**: (a) build to #895's described layout (`settings.repo.json` in the brain dir, passed via `--settings`) · (b) wait for the rhachet branch to verify
- **taken**: (a). the branch `vlad/fix-config-blend` is not on github (404) nor in any local worktree. the hook reads by file name, so a different name is a one-line change
- **rework**: clean
- **confidence**: 75%. low because the premise was not fetched
- **where**: `1.vision.yield.md` .groundwork
- **verdict**: confirmed by the wisher, 2026-10-07 — "yes, as #895 says". the wisher added a gate: build in anticipation, but `5.3.verification` completes only after the rhachet release is on main, and verifies directly against it
