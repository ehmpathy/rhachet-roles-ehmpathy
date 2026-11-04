# F14: shared render polish is left to its own pr

## .the fork
At 5.3, round i004 raised render nitpicks: stacked coconut hints, the `superseded` block at two depths, guard headers without the mode, path order, long hints, and the case16 shape. Each could be fixed here, or deferred to a render-only pr.

## .taken, why
Deferred to `.dream/v2026_11_04.fix.rebase-aside-failure-snaps-and-hint-merge.md`. Each item rewrites a render that many sites share, the extant guards included, plus every snapshot of those sites. So none is a clean fix for this diff. None ships a harm, because every render today names its paths, its store, and its commands. The small items in reach were fixed this round: git text in the `git.output` frame, and the unknown-argument refusals drawn as trees.

## .rework, why
Clean. A later render pr touches only output text and snapshots, with no behavior or caller change.

## .confidence, why low
85%. A reviewer may hold that the new sites (superseded, set-aside order) belong to this pr. They share their render with extant sites, though, so a split would leave the skill with two shapes.

## .where
`git.branch.rebase.aside.operations.sh` (print_aside_hint, print_aside_superseded), begin.sh guard headers, and the unstaged, begin and acceptance snapshots.

## .verdict
Open, for the commander.
