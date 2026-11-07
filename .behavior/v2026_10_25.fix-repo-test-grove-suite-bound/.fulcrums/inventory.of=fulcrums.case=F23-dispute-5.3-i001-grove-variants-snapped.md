# F23 — dispute 5.3 peer i001: "the wait, hung, bad-override, and signal variants are not snapped"

- **raised by:** `ergo-contract-snapshots` blocker.1, `ergo-acceptance-journey-coverage` blocker.2
- **fork:** concede and add snapshots that already exist · dispute with the cited snapshots
- **taken:** dispute. both reviews read the play and scope snapshots and conclude the grove has
  only the claim and bypass renders. the grove's own snapshot file, a target of both reviews
  (`__snapshots__/git.repo.test.grove.integration.test.ts.snap`, in `git diff origin/main`), pins:
  - the wait with holders, and its heartbeat: `[case2] [t1] the grove branch matches snapshot`
    (`⏳ 1 of 1 slot held, wait for one`, `slot.0: tree-holder · integration · pid <pid> · <age>`,
    `⏳ still held (<age>)`, `🎫 slot.0 claimed after <age>`)
  - the hung holder: `[case2] [t2]` (`⚠️ slot.0 held <age> — tree-hung · pid <pid> · may be hung`,
    `check first: pgrep -lP <pid>`, `to free it: kill <pid>`, `a clone may not run these; ask
    your human`)
  - a stop mid-wait: `[case3] [t2]` (`🌙 stopped by sigint; no test tree had started (exit 130)`)
  - the bad override: `[case5] [t0]` (`GIT_REPO_TEST_SLOTS must be a whole number ≥ 1`, `got: 0`,
    `fix:`) and `[case5] [t3]` (relative dir)
  - the pool and slot-file refusals: `[case6] [t2]`, `[case6] [t3]`; the `--what all` handoff:
    `[case6] [t5]`
- the volatile fields are masked (`<pid>`, `<age>`, `<stage>`), not carved out. the signal exits
  (129, 130, 143) are asserted exactly per signal (`[case3] [t2]`, `[t3]`, `[t6]`) and the stop
  line is snapped for sigint; each holder stop line is asserted on both streams
- **rework:** clean — no artifact change rides on it
- **confidence:** 95%
- **verdict:** —
