# git.repo.test invariants

## scope + zero tests = constraint error

any `--scope` pattern that matches zero tests is a domain invariant constraint error (exit 2).

### .why

- no one willingly goes through the effort to `--scope` target tests that don't exist
- zero tests matched indicates: typo in pattern, tests were deleted, or wrong file/name scope
- silent pass with zero tests creates false confidence

### .rule

| scenario | behavior |
|----------|----------|
| `--scope path://foo` matches 0 files | exit 2, constraint |
| `--scope name://bar` matches 0 tests | exit 2, constraint |
| no `--scope` + `--changedSince` finds 0 files | exit 0, success (normal) |

### .best practice: stack path + name for fastest feedback

1. start narrow: `--scope path://myfeature --scope name://case3`
2. widen path: `--scope path://myfeature` (all tests in file)
3. widen name: `--scope name://case3` (all files, one test)
4. full suite: (no `--scope`) only to verify no regressions

## a run past its bound is cut short, as the caller's constraint

every call is bounded as a whole: 420s by default, which is also the max, or a lower `--timeout <secs>`. past the bound, the whole suite process group dies, the run says "woah, too slow", and the exit is 2. no call may run past 420s.

### .why

- a suite past 7 minutes holds a crew seat and a box core, and an unbounded run teaches no one it is slow
- a wider bound only hides a slow suite; the fix is its speed, so `--timeout` may narrow the bound, never widen it
- the slow suite is the caller's code: a retry reruns just as slow, so the exit is 2 (caller fixes), never 1 (retry may help)
- a cut that frees no process frees no core, so the bound signals the whole group

### .rule

| scenario | behavior |
|----------|----------|
| no `--timeout`, run past 420s | cut short, exit 2, `bound: 420s (default)` |
| `--timeout N` (N ≤ 420), run past N | cut short, exit 2, `bound: Ns (--timeout)` |
| `--timeout N`, N > 420 | exit 2 at parse; no suite runs; "fix its speed, never its bound" |
| `--what all` | one bound for the whole call; each type runs under what the types before it left |
| `--timeout` not whole seconds (`5m`, `0`) | exit 2 at parse, in plan and apply; no suite runs |
| host with no gnu `timeout` | `gtimeout`, else a bash watchdog; the bound still holds |
| suite exits 124 by itself, inside its bound | not cut short; its own exit stands |
| host where the watchdog cannot give the run its own group | `💥 MalfunctionError`, exit 1; never a false "too slow" |
| the fuse fails before the suite starts | `💥 MalfunctionError`, exit 1; "npm never started" |
| the skill is stopped mid-run (INT, TERM, HUP) | the suite's process group stops at once; no suite outlives the skill; the partial log is kept and named. in multi-mode the parent forwards the stop to the child in flight |
| the skill is SIGKILLed (no trap can run) | the suite runs on in its own group until the fuse fires: at most the bound plus its 10s grace. bounded, not stopped; a caller that must free the seat at once sends TERM first |
| host whose `timeout` is not gnu (busybox) | a probe (`--kill-after=1s 1s bash -c :`) rejects it; `gtimeout`, else the watchdog, takes over |
| a suite child that detaches into its own session | it outlives the cut (the suite's own cleanup defect); the suite's stdout and stderr are files, so the caller's pipe still closes with the skill |

### .the caller's own clock

the skill's bound is not the only clock. a clone runs the skill inside its harness's shell call, which has its own limit (claude code's Bash tool: 2 min by default, 10 min max), and this skill may not run in the background. give the shell call a limit above the figure the skill prints (450000 ms for a single type under the 420s default; the bound plus 30s per type for `--what all`), or the harness kills the run first and the "too slow" lesson never shows. the 420s max sits inside claude code's 600s shell cap, so every legal call has a path through a clone's shell call.

when the skill itself is stopped (ctrl-c, a harness kill), its INT/TERM/HUP trap stops the suite's process group at once; the fuse runs the suite in its own group, so without the trap the suite would run on to the bound.

### .enforcement

`git.repo.test.bound.integration.test.ts` clamps each row.
