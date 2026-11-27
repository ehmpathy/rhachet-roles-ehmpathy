# F29 — `[case62]` bounds the lock wait against a no-lock run, not the wall clock

- **the fork**: `pretooluse.check-permissions.integration.test.ts` `[case62][t1]` failed in the full 5.3 run at `1609ms` against an absolute `< 1500` bound, on a loaded host. the case guards one invariant: a hook past its deadline never waits on the nudge lock (a wait costs ≈ 2s of sleeps). (a) keep `< 1500` and make the host quieter; (b) raise the absolute bound; (c) measure a no-lock run of the same aged hook copy, and bound the locked run's excess over it at `< 1000`.
- **taken**: (c).
- **why**:
  - the red was hook startup under load, not a lock wait: both runs pay startup alike, so their difference isolates the one cost the invariant names
  - (a) leaves the flake for the next loaded host or ci runner; (b) loosens the guard for every host
  - the invariant is named at the edit: `// .proof = a hook past its deadline never waits on the lock. a wait costs ≈ 2s of sleeps (ATTEMPT_LOCK_LIVE_TRIES × 0.05s), so the locked run is measured against a no-lock run of the same aged copy, never against the wall clock` (`rule.forbid.test-edit-without-named-proof`)
- **evidence, 2026-11-24**:
  - mutant: the hook altered to wait out the lock before its deadline check → red at this assertion (`Expected: < 1000`); restored → green; the file → 217/217
  - a slow baseline can only lower the difference when the locked run did not wait — the one case the bound must pass. a real wait adds ≈ 2s above any baseline, twice the bound
  - main still carries `expect(Date.now() - startedAt).toBeLessThan(1500)` (`git show origin/main:…` line 4465), so the flake waits there too
- **rework**: clean — one assertion and one baseline run; revert restores main's line.
- **confidence**: 85%. the residual: a reviewer reads any change to a numeric bound as a loosen, and a wisher may prefer the absolute form with a host fix.
- **where**: `src/domain.roles/mechanic/inits/claude.hooks/pretooluse.check-permissions.integration.test.ts` `[case62][t1]`; 5.3 i003 `enroll-verif-test-intent` blocker.1; i001 `mech-test-intent` nitpick.1
- **reversed, 2026-11-24 (5.3 i004)**: two review lanes read the relative bound as a criterion change this branch made and main never asked for. the test now carries main's bytes again: `expect(Date.now() - startedAt).toBeLessThan(1500)` with no baseline run (`git diff origin/main -- …check-permissions.integration.test.ts | rhx grepsafe --pattern 'baseline|1500|1000'` → 0 matches). the file passes as is: `rhx git.repo.test --what integration --scope 'path://pretooluse.check-permissions' --mode apply` → 3 suites, 369 passed, 0 failed, 0 skipped (log `2026-11-24T10-26-32Z`). the load flake stays main's, caught for main as `dreams/v2026_11_24.fix.case62-wall-clock-bound-flakes-under-load.md`
- **verdict**: reversed — main's bound restored; the relative form waits on the dream
