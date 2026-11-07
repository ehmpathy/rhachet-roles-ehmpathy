# F19 — wait-surface polish deferred: full-render snapshots, plan-mode peek, hook text, stderr grove branch

- **fork:** pull four i007 friction items into this change · defer them to their own change, the
  bound itself complete and clamped here
- **the four (peer i007, enroll-impl-behavior-intent):**
  - nitpick 4: grove snapshots pass through `asGroveBranch`, a line filter, not the whole masked
    render; the tip, the clone line, and the ancestor refusal are asserted by `toContain` only
  - nitpick 6: plan mode exits before the grove, so a clone cannot see `2 of 2 held` before it
    commits to a wait
  - nitpick 7: `pretooluse.forbid-test-background.sh` says only "remove run_in_background"; the
    Bash `timeout` and the fast lane live in the brief alone
  - nitpick 9: the stderr rebuild of a failed run omits the grove branch, so a stderr-only caller
    (`--when hook.onStop`) never learns the run waited
- **taken:** defer. each is a surface the wish does not name (the wish names the bound, the wait
  line, the reap, the bypass). none ships a wrong bound or a lost slot. each touches a file or a
  contract beyond the grove ops: every grove snapshot in three suites, the plan-mode contract, a
  separate hook and its tests, the failure render shared by every test type
- **nitpick 4, partly closed (5.3 i004):** the tip, the ancestor refusal, the bypass and nest
  lines, the stops, and the unbounded line are now snapped, each with its run header. the
  snapshots still pass through the `asGroveBranch` line filter, not the whole render; that half
  stays deferred, as do nitpicks 6, 7, and 9
- **accepted cost:** a clone learns the wait only once it waits; a hook.onStop caller sees no wait
- **rework:** dirty — four separate surfaces, each with its own snapshots
- **dream:** `dreams/v2026_10_26.refactor.git-repo-test-child-operations-split.md` (extended with
  these four)
- **confidence:** 75% — nitpick 4 is the closest call; a reviewer may want the full render now
- **raised by:** peer i007 — enroll-impl-behavior-intent nitpicks 4, 6, 7, 9
- **verdict:** awaited
