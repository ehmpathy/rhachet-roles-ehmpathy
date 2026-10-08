# F20 — host-bound integration failures outside this route stay, dreamed

- **fork:** 5.3 says "a test that fails for reasons unrelated to your changes — fix it anyway".
  the thorough run on this host red-lit 8 suites this route never touched. deflake them here,
  vs record them and catch a dream.
- **taken:** dream. the evidence says each is bound to this host, and green where the repo gates:
  - `main` CI is green on its last runs (`gh run list --branch main`: release + provision, success)
  - the host holds a sustained load average of ~34 (`/proc/loadavg`: `33.84 34.76 34.90`)
  - `git.release` p1/p2/p3 ×3/p4 (group C): 41 of 448 fail even when run alone
    (`--scope path://git.release`, 632s). the one case isolated (`p1 case4b`) failed once
    (53s) and passed on the next run (38s) — a clock-race flake on mocked poll loops, not a defect
  - `git.repo.test` case19 (group D): a wall-clock bound, `5202ms` vs `< 5000` alone under load
  - `git.commit.sponsor` case9 `[t2]` (group B): the test calls the real `gh` and asserts the
    session is a robot ("the real session on every runner this repo owns belongs to a clone").
    this host's `gh` is logged in as a human, so `@me` binds (exit 0, state written). the
    premise holds on CI; it does not hold on a human's dev host
  none of the eight imports or spawns a file this route changed (the hook, its test + snap,
  `commands.alternatives.jsonc`, the permission-examples brief, the jest configs' `.agent/.actors`
  exclusion).
- **dream:** `.dream/v2026_09_28.fix.integration-suites-bound-to-host-load-and-gh-login.md`
- **rework:** dirty — a real deflake of the release watch loops (poll by count, not by the clock)
  and a sponsor test that reads the host's `gh` identity are each their own change, in skills
  this route does not own.
- **confidence:** 75% — a green `main` CI is strong evidence, but no CI run of this branch exists
  yet (no commit was asked of this route).
- **where:** `skills/git.release/*.integration.test.ts`, `skills/git.repo.test/git.repo.test.integration.test.ts`
  (case19), `skills/git.commit/git.commit.sponsor.integration.test.ts` (case9 `[t2]`).
- **also:** `pressViaPipeline` `[t1]` hit its 90s jest timeout once on a two-step llm call, then
  passed 21/21 unchanged — added to the dream.
- **also, 2026-10-06 role sweep (`--scope path://domain.roles`, 3186 pass / 29 fail, 8 suites):**
  the same release + sponsor failures, plus four this route never touched:
  - `pressViaPipeline` and `checkRetention`: every failure is
    `412 Account vladatahbode is suspended` (the fireworks account), not code
  - `cicd.deflake detect` case4: the live github api answered with no `retried_runs_found` field
    (no retried runs in the 7-day window), a live-data dependence
  - `review.by` case5: both review lanes report `✗` (no lane ran clean), an environment effect of
    the review brain (the fireworks suspension, or the new openrouter default)
  the one failure that WAS this route's — `boot.yml` "account for every entry-point skill": the new
  `permissions.get.sh` was absent from the mechanic boot.yml — is fixed (`skills/permissions.get.sh`
  now listed under the always subject) and passes 9/9.
- **root cause of group C, proven 2026-10-08:** the release skill already polls by count in test
  mode (18 mocked polls); each suite's harness bounds the spawn at 10s and maps a kill
  (`status: null`) to exit `1`. under a loaded full suite the mocked forks outrun 10s, and the kill
  reads as a skill malfunction. **fixed in this route, all twelve suites:** a 60s hang guard, and
  a kill throws with its signal instead of an exit code. `--scope path://git.release --thorough`:
  448 passed, 0 failed (it was 41 failed alone, 2026-09-28). groups B and D stay dreamed
- **`detect` case4 was a real defect, not live data:** the no-retried-run exit omitted
  `retried_runs_found`. fixed in this route, asserted by stubbed `[case12]`
- **verdict:** 2026-09-28, wisher: defer as dreamed.
