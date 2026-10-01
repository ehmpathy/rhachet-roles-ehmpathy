# F9 — `git.commit.operations.sh` sources the seaturtle roster from `keyrack.operations.sh`

- fork: source the roster leaf where it lives · lift the roster into its own file first
- raised by: peer `arch-smell-scopeleaks` round 1, blocker.1 ("reach-in to keyrack internals")
- taken: source it where it lives. the roster (`SEATURTLE_*` constants + the
  `is_one_seaturtle_identity_*` predicates) is already the declared shared contract of the
  git.commit skill family — `git.commit.set.sh`, `git.commit.sponsor.sh`, and `git.commit.push.sh`
  sourced it before this change. the operations file becomes one more consumer of that contract; it
  reaches into no private helper. the file name, `keyrack.operations.sh`, is the misfit: it holds
  more than keyrack.
- why not lift now: a rename/move of the roster file touches every consumer and its tests, and
  answers a name that predates this change — a refactor this wish did not ask for
  (`rule.require.review-test-changes`). the defect a lift would prevent — a roster change that
  reaches git.commit — is the intended behavior: the roster DEFINES the clone's machine (F6).
- rework: clean (a later lift is a rename + four `source` lines)
- confidence: 80% — the reviewer is right that the file name misleads
- where: `git.commit.operations.sh` top `source` line
- verdict: held by the architect lane (enroll-impl-arch-defects, i005): real, hold at nitpick, do
  not move now. the roster now decides the sponsor gate and earned a name of its own — the rename
  (`git.commit.identity.sh`, or a split from `keyrack.operations.sh`) rides the same follow-up as
  F11: `.dream/v2026_09_27.fix.git-commit-operations-out-of-role-dir.md` step 1.
