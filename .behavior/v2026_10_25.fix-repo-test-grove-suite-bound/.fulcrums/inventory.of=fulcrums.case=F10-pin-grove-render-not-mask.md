# F10 — snapshots pin the grove render; they do not mask it

- **fork:** mask `bound: N slots` and `slot.N` in each suite's sanitizer · or pin both by
  construction and keep the bytes in the snapshot
- **taken:** pin. `src/.test/setGroveIsolation.ts` sets `GIT_REPO_TEST_SLOTS=4` and a fresh
  private `GIT_REPO_TEST_SLOTS_DIR` at module load; all six skill suites that snapshot a run call
  it (`git.repo.test.integration`, `.scope`, `.play`, `.nice`, `._.env`, `._.against`). so the
  count is 4 on a 4-core box and a 96-core box alike, and the pool is empty, so the claim is
  `slot.0`. the grove suite sets its own pool and bound per scenario
- **why not mask:** a mask hides the very render these snapshots exist to show. a regression that
  printed the wrong bound, the wrong source, or claimed `slot.3` from an empty pool would pass a
  masked snapshot green. the pin removes host state at the cause (`rule.require.hermetic-tests`)
  and keeps the render reviewable
- **the default derivation** (`max(1, cores ÷ 6)`, source `N cores ÷ 6`) is asserted where it
  belongs, against `nproc`, in `[case6] [t0]` of the grove suite
- **rework:** clean — a mask is two regex lines per sanitizer, if the council prefers it
- **confidence:** 90%
- **raised by:** peer i001 — repo-rules blocker.1, arch-hazards-behavior nitpick.3,
  behavior-intent-coverage nitpick.2, ergo-friction-hazards nitpick.1
- **verdict:** —
