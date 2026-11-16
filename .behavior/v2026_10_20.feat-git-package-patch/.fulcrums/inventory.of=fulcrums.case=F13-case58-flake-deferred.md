# F13 — the case58 wall-clock flake is deferred; case62 is fixed

## .the fork

two tests in `pretooluse.check-permissions.integration.test.ts` assert a wall-clock bound that host
load breaks: `[case62][t1]` (`< 1500` ms) and `[case58][t0]` (`< 9500` ms). fix both here, fix one,
or defer both.

## .taken, and why at the time

- **case62 fixed here.** its stderr message already names the deadline branch; the clock added
  naught. the fix is one assertion in a test file this pr already edits. proven: red with the
  deadline check disabled, green restored.
- **case58 deferred** to `.dream/v2026_11_11.flake.check-permissions-case62-wall-clock.md`. no
  test-only fix keeps its claim: the bound it guards (the 10s kill window) is real, and to time
  the search phase alone the hook must print phase stamps. that edits the hook executable, which
  this pr does not touch, and which main has moved three releases past this branch's base.

## .rework

dirty: the case58 fix changes the hook's output and its snapshots, on code main has since changed.

## .confidence, and why it is low

70%. the deferral leaves one red test on a loaded host (load 40 on 12 cpus at the time). CI runners
are not that loaded, so CI likely stays green, but that is a guess, not a measurement.

## .where

`src/domain.roles/mechanic/inits/claude.hooks/pretooluse.check-permissions.integration.test.ts`
`[case58]`, `[case62]`.
