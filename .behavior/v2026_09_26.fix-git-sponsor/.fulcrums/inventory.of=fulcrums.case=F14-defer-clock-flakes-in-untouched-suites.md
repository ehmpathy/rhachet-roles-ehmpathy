# F14 — fix the clock flakes in suites this branch never touched, in this branch

- fork: fix the git.release and git.repo.test clock flakes in this branch · catch them as a dream and defer
- raised by: 5.3 verification, full integration run
  (`rhx git.repo.test --what integration --env prep --mode apply --thorough` → 94 suites,
  3097 passed, 63 failed)
- taken: **fix both here.** the stone reads "if a test is flaky — fix it", with no carve-out for
  untouched suites, and both root causes sat in test infra, so the fix is clean
- git.release — two root causes, both fixed:
  1. **clock skew between fake run sets.** `genTagWorkflowJson` stamped each call with its own
     `new Date()`. the watch reads "in action" as the passed set's `updatedAt` minus the oldest
     `startedAt` it saw, so under load one set's stamp drifted and `1m 0s` rendered `59s`.
     fix: every call in `.test/infra/mockGh.ts` passes one shared `startedAt: nowIso`
  2. **a 10s `spawnSync` kill scored as a real exit.** `timeout: 10000` killed slow runs with
     SIGTERM, and `status: result.status ?? 1` turned the kill into a fake exit 1.
     fix: `.test/infra/asSkillExitStatus.ts` throws a `MalfunctionError` on a null status, and
     every p-file uses `SKILL_SPAWN_TIMEOUT_MS = 180_000` as a hang guard only
     - the loud error exposed a fake pass: `p3.scenes.on_main.into_prod` `[row-2a] --apply`
       asserts "exit 1 (poll timeout)" — the skill's test-mode 100-iteration watch bound. the
       10s kill ended the run long before that bound, and `?? 1` supplied the asserted exit.
       the case now walks its real bound, which took over 60s under full parallel load — so
       the guard sits at 180s. jest's per-test timeout cannot preempt a sync `spawnSync`, so
       this guard is the only hang bound a run has
  - proof: `--scope 'path://skills/git.release'` → 17 suites, 448 passed, 0 failed, 0 skipped
- git.repo.test `[case19][t1]` — root cause: a `< 5000ms` bound in plan mode, where the suite never
  runs, so the clock measured only `jest --listTests` start-up, which a busy machine slows.
  fix: the case now proves what "fails fast" means — in apply mode, 0 matches exits 2 before the
  suite command runs. the suite command drops a marker; the case asserts the marker is absent and
  no inflight timer started. no clock, so no load sensitivity
  - clamp proven: with the skill's failfast `exit 2` disabled, 2 of its thens went red; restored,
    10 passed. the skill itself is unchanged vs origin/main
- rework: clean — test infra and one case, no prod change
- confidence: 90% — the one open call is whether `[case19][t1]` still carries its intent; the
  marker proves the suite never ran, which is the failfast the old bound stood in for
- dream: none — the fix landed, so the dream once caught for it was removed
