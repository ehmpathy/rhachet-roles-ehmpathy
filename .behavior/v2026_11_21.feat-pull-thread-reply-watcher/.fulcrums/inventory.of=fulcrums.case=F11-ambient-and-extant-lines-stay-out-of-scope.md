# F11 · points on lines this route did not write stay out of its diff

## .the fork
- (a) fix each reviewer point where it lands, ambient `.husky/*` files and extant `genWatchTestScene.ts` lines included
- (b) fix points on lines this route wrote; leave ambient and extant lines until disturbed, and flag the ambient ones to the foreman

## .taken
(b).
- the foreman's commit scope: stage only this route and the src it changes; `.husky/*` must not ship in this pr
- a reviewer sees `.husky/*` edits because the guard diffs the worktree since `main`, and the worktree carries edits this route did not author (the verdict: "the worktree holds changes this wish did not make"). the commit leaves them out, so they never reach this pr
- `.husky/check.timestamps.sh` is pinned by `check.timestamps.lock.sh`; an edit there is a hook change no route stone asks for
- the `getDiagnostics`, `waitForDaemonTicks`, and `getAllWatchRecords` lines are on main as is (`git diff main` on `genWatchTestScene.ts` touches only the comment interface and the stub's stdout write)
- `rule.prefer.scouts-honor` bounds a cleanup to the change at hand; a refactor of test-scene internals rides no part of this one

## .applies to
i001: repo-rules nitpick.1 · mech-decode-friction nitpick.1–3 · ergo-friction-hazards nitpick.1
i002: mech-failhides nitpick.2 (`.husky/check.timestamps.lock.sh`)
i003: arch-hazards-maintenance nitpick.1 · ergo-friction-hazards nitpick.1

## .rework
clean. each fix is a local edit a later pr can make with no ripple here.

## .confidence
90%.

## .verdict
open — for the council.
