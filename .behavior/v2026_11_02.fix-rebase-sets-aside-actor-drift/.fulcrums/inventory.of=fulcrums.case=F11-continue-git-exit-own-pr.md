# F11 — continue prints success over a git error: fix here, or in its own pr

## .the fork
- (a) fix it in this pr: read git's exit code, render a stop with no conflict, exit 1
- (b) catch a dream; fix it in its own pr

## .taken
(b). the defect predates this route (`|| true` on `git rebase --continue`). the fix flips four extant tests in `git.branch.rebase.continue.integration.test.ts` (case2 to case5), which simulate a rebase that git rejects and pin the success render. a change to extant test expectations outside the wish is the scope leak a peer flagged in the same round. the dream holds the shape of the fix and its clamp: `.dream/v2026_11_02.fix.rebase-continue-reads-git-exit.md`.

## .rework
clean: the fix was written and reverted in this round; it is ~12 lines plus the four tests rebuilt on a real rebase. the `--unstaged` suite's case12 t1 also pins the render (with the held paths named), so the fix resnaps it too.

## .confidence
85%. the held-path state now sits beside that render, which raises its cost; the extant tests are the reason to split it.

## .where
`git.branch.rebase.continue.sh`, the fall-through after `git rebase --continue`.
