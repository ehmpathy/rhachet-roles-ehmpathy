# F15 — structural splits of the skill are deferred to their own change

- **fork:** in this change, split `git.repo.test.sh` further — a `launch_child` choke point for
  every post-claim launch, a `git.repo.test.child.operations.sh` for the process-tree control,
  pure grove transformers (`asGroveBound`, `asGroveBypassReason`, `asGroveHolder`), env seams for
  the poll/beat/stale constants, `setGroveIsolation` moved into jest `setupFilesAfterEnv` · keep
  the shape, and fix every behavior hazard the split would guard
- **taken:** keep the shape; fix the hazards. in this change:
  - the duplicated claim-success block is one `until` loop with one exit path
  - `run_test_child` takes `--grace` as a named flag, not a side-channel global
  - the ops header names every global it reads (`WHAT`, `PATH_PATTERNS`, `THOROUGH`,
    `REPO_ROOT`, `emit_to_both`)
  - every post-claim launch is one of two, each with `9>&-`, each clamped red-then-green
    (`[case3] [t0]`, `[case3] [t5]`)
- **why defer the rest:** each split moves a file every skill test reads, and re-snaps every
  suite; the ripple lands on seven suites and two shell files a reviewer has already read four
  rounds. a pure split adds no behavior the wish asked for, and the hazards it would guard are
  now clamped. the beat constant: a 30s heartbeat clamp costs 33s once per suite, and an env seam
  adds a knob no human asked for
- **rework:** dirty-ish — it ripples through the test harness, so it gets its own change
- **dream:** `.dream/v2026_10_26.refactor.git-repo-test-child-operations-split.md`
- **confidence:** 80%
- **raised by:** peer i004 — enroll-impl-arch-defects blockers on hazard 5, decomposition, test
  isolation by memory, hard-coded constants
- **verdict:** awaited
