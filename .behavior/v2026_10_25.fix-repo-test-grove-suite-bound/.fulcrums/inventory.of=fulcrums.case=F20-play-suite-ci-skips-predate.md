# F20 — the play suite's `[case19]` `given.skipIf(!!process.env.CI)` stays, out of this change

- **found:** 5.3 self review `has-zero-test-skips`. `git.repo.test.play.integration.test.ts` held two
  CI skips, both from `fb5d867` (#396, cicd-deflake), long before this branch
- **`[case18]` — fixed here.** its 0-match scope exits 2 before npm runs, so the stated hazard (an
  npx prompt hangs) cannot occur. skip removed; `--scope name://case18` → 6 passed, 0 failed
- **`[case19]` — the fork:** remove the skip here · fail fast with a ConstraintError · leave it,
  record it, dream the fix
- **why neither removal nor fail-fast lands green in CI:**
  - `[case19]` runs the real `rhx keyrack unlock --owner ehmpath --env test` with the real PATH.
    the CI runner holds no ehmpath keyrack host; the `keyrack firewall` step injects the secrets as
    env vars instead (`.test.yml:244`). so in CI the unlock render differs from the local one
  - the case snapshots that render (`output matches snapshot`). the local snap pins
    `keyrack: unlocked ehmpath/test`; CI would print a failure and the snapshot would mismatch → red
  - a ConstraintError on an absent keyrack host is red in CI by construction
  - ⇒ every option short of a redesign turns CI red, and CI green at the done gate is the outcome
- **taken:** leave `[case19]` skipped in CI. it runs in every local run (play suite 230/230 on this
  tree)
- **accepted cost:** CI does not run the real-keyrack journey; a regression there shows only locally
- **rework:** dirty — the redesign changes what the case proves (a hermetic fake `rhx` makes it a
  duplicate of the mocked keyrack cases; a CI keyrack host is a runner change)
- **what the runner lacks:** an ehmpath keyrack host for `rhx keyrack unlock --owner ehmpath`
  (or a keyrack mode that treats firewall-injected env as unlocked)
- **dream:** `.dream/v2026_10_26.fix.git-repo-test-play-ci-skips.md`
- **confidence:** 70% — the stone's zero-skips mandate argues against any kept skip; the director
  may rule otherwise
- **raised by:** self review, 5.3; flagged by the foreman as a likely peer blocker
- **director, 2026-10-27:** a CI skip with no failure is a failhide. `[case19]` either runs in CI,
  or fails loud with a ConstraintError that names the resource CI lacks and how to get it. if
  neither can land here, the exact skip line and the reason go back for a decision
- **what this round found:** neither lands green here.
  - run in CI: no keyrack mode reads the firewall's env (`rhx keyrack unlock --help` names none),
    and the snapshot pins `keyrack: unlocked ehmpath/test` — a render only a box with an unlocked
    ehmpath keyrack prints. the case is non-hermetic on any dev box too
  - fail loud in CI: a ConstraintError there is red on every CI run until the runner holds an
    ehmpath keyrack host, so the PR cannot go green
  - the skip line, sent to the director: play suite line 2497, `given.skipIf(!!process.env.CI)(`
- **verdict:** ✅ director, 2026-10-27 — path 1. `[case19]` uses the fake rhx (`mockKeyrack:
  'unlock'`, whose unlock prints the real render) and the `skipIf` is gone, so no case in the play
  suite skips in CI. renamed `[case19] integration test through a keyrack unlock`; snapshot render
  unchanged, key renamed. play suite 230 passed, 0 skipped. the real-keyrack proof (an ehmpath
  keyrack host on the CI runner, then a real case that fails loud) is its own task, dispatched by
  the director as #1191; the PR body names #1191 beside F20
