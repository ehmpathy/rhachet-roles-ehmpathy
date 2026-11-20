# fulcrum F8: review scope is the pr diff, not the unstaged worktree

## .the fork
two peer reviewers (arch-hazards-maintenance blocker.1, ergo-friction-hazards blocker.1) graded a conflict between the route's seed files and edits to the `.husky` timestamp hook. either (a) treat both as part of this pr and fix them here, or (b) hold that neither ships with this pr and answer with evidence.

## .taken: (b)
- `git ls-files .behavior/v2026_11_16.fix-pull-text-public-repo-promise` lists 0 files: route artifacts are never committed
- `git diff origin/main...HEAD -- .husky` is empty: the hook edits are unstaged worktree state from another task, set aside at each commit
- so no shipped artifact meets any shipped hook

## .rework
clean: if the council rules (a), the fix is a separate pr against the husky hook; this pr's code does not change.

## .confidence
90%: the evidence is two git commands; the residual doubt is whether the council wants the route's own docs to pass the hook regardless.

## .where
- `.reviews/peer/5.1.execution.from_vision._.review.i001.9f059355acdc3824fb.r006._.taken.by_self.arch-hazards-maintenance.md`
- `.reviews/peer/5.1.execution.from_vision._.review.i001.9f059355acdc3824fb.r009._.taken.by_self.ergo-friction-hazards.md`

## .verdict
open
