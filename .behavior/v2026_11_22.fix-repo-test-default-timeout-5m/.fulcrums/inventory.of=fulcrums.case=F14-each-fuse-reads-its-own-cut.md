# F14: each fuse backend reads its own cut; no shared outcome transformer

- fork: each backend decides `ended|fired|broken` itself, or each backend returns facts and one `get_bound_outcome` decides
- taken: each backend decides. the two observe a cut by different means: the gnu path infers it from a foreign tool's exit code plus `started`/`ended` markers; the watchdog is the cut, so it knows it fired (`fired` marker). a shared fact shape would carry fields one backend never fills (the watchdog has no fuse code; the gnu path has no `fired`), so the transformer would branch on the backend anyway
- the two graces are two policies, each a named constant with its why: `GIT_REPO_TEST_BOUND_GRACE` (10s, a cut suite may clean up) and `GIT_REPO_TEST_ABORT_GRACE` (1s, an abort frees the seat at once)
- the self-124 invariant holds on both, each with its own clamp (`[case7][t3]`, `[case8]`); two clamps for two code paths is the proof, not a cost
- rework: clean. a third backend, if one arrives, is the moment to extract a shared decision; the outcome vocabulary (`BOUND_OUTCOME`) is already one
- confidence: 80%. a reviewer who weighs one decision site over two short ones would choose the other side, and it is a defensible choice
- where: `get_bound_outcome_after_fuse` and the tail of `run_bounded_via_watchdog` in `git.repo.test.operations.sh`
- verdict: disputed at execution review
