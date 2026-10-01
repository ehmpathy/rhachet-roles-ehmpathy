# F25 — `git.release` goes red under host load. repair it here, or defer?

- **rework**: clean — three test-scoped repairs, each reversible by deletion
- **status**: 🔴 settled — the repair landed. my deferral reversed, by me
- **confidence**: 80% → self-reversed
- **raised**: 2026-09-25, at the `5.3.verification` gate

## .the fork

a full-repo `--thorough` run turned 11 red, eight in `git.release`, none in grepsafe.

| option | shape |
|---|---|
| **A (taken)** | fix the cause here |
| B (my first call) | defer with a dream; land it later on a quiet box |

## .my first call, and why it lost

B rested on two claims:

- the cause is the watch loop's wall-clock read — named from source inspection and a diff's shape,
  never run. the dream said so itself: *"the virtual-clock repair is UNTESTED."*
- the proof is a snapshot, and a snapshot taken on a contended box records the contention. but the
  cure's job is to take the host out of the snapshotted value, so a frame taken after it is
  host-independent by construction.

every input to the SAFE/CLEAN test — ripple, churn, whether the proof can be taken — is a property of
the actual defect. B computed all three against a hypothesis.

## .what the measurement found

three stacked defects, each masked by the one above:

| # | defect | where |
|---|---|---|
| 1 | a 10–12s `spawnSync` bound SIGTERMed the skill mid-tree under load | 9 test files |
| 2 | `elapsed` / `in_action` read the wall clock in test mode | `_.emit_transport_watch.sh` |
| 3 | the poll-line collapse missed `Xm Ys` lines | `snapshotOps.ts` |

| repairs | reds |
|---|---|
| none | 33 of 448 |
| #1 | 2 |
| #1 + #2 | 2, deterministic frame |
| #1 + #2 + #3 | 0 of 448 |

at load ~16 on 4 CPUs — the class that produced the 33 — 448 passed, and
`git diff --stat -- …/git.release/__snapshots__/` shows no rows. zero churn: the suites pass against
the original frames. B's whole cost, "~17 suites of churn", was zero.

## .the lesson

a deferral is a decision about a cause, and an unverified cause cannot support one. this entry, like
F3, F8, F10, and F11, carried its own refutation and took the other option. those four misread a
scope bound; this one misread the world. the corrective: run it before you price the repair.

## .see also

- `.dream/2026_09_25.fix-git-release-watch-loop-reads-the-wall-clock-in-test-mode.dream.md` — pruned once discharged
- `rule.require.hermetic-tests`
- `rule.require.trust-but-verify`
