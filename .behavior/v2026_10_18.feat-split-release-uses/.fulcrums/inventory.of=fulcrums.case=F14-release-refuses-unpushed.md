# F14 — release refuses while the branch holds commits its pr lacks

- **fork** — release ships the pr as-is (today) · release pushes the commits first · release refuses and names them
- **taken** — refuse and name. today `git.release.sh:654-656` counts unpushed commits only when no pr exists (`get_unpushed_count`, `git.release.operations.sh:651-654`); with a pr it merges via `gh pr merge` and the local commits never ship, silently. a release that pushes would let a release grant write the branch — a commit-grant act — which breaks commit ⟂ release (X2)
- **rework** — clean. one check before the merge; to drop it later is one deletion
- **confidence** — 75%. low because no measured incident shows a crew that shipped a pr short of its branch; the guard is defensive
- **where** — `case=12` [t4], [t8] · inventory 5.3, 5.4, 5.6, 5.7
- **verdict** — open
