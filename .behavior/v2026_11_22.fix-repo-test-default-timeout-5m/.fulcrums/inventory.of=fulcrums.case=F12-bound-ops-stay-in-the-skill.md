# F12: the bound ops stay in the skill until a second caller adopts them

- fork: lift `run_bounded`, `get_bound_fuse`, the watchdog, and `stop_bounded_run` to `claude.tools/bound.operations.sh` now, or keep them in `git.repo.test.operations.sh` until a second skill uses them
- taken: keep. `rule.prefer.most-common-denominator` says create at the leaf and lift on proven reuse; a lift with zero reuses is that rule's own named nitpick. the peers that would adopt it (`git.pull.watch`'s pid-only watchdog; `git.commit/keyrack.operations.sh`'s bare `timeout`, which fails on stock macos) each change their own contracts when they adopt, and that adoption is the moment to lift. both are caught in `dreams/v2026_11_22.fixup.lift-group-kill-bound-helper.md`, now with the keyrack caller added
- rework: clean. a file move and a source path; the policy constants (`GIT_REPO_TEST_BOUND_*`, `is_bound_valid`) stay in the skill either way
- confidence: 85%
- where: `skills/git.repo.test/git.repo.test.operations.sh`
- verdict: open
