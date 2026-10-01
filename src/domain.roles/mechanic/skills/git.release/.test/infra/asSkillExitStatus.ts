import { MalfunctionError } from 'helpful-errors';

/**
 * .what = the exit status of a skill run — or a loud error if the run never exited
 *
 * .why = each suite spawns the skill with a `spawnSync` timeout as a hang guard. a
 *        run the guard kills leaves `status: null` and a `signal`. the runners once
 *        mapped that to `status ?? 1`, so a run killed for time on a loaded machine
 *        read as the skill's OWN malfunction (exit 1) — a flake that looked like a
 *        code defect, and one no snapshot or assert could tell apart. a killed run
 *        now fails loud, named as what it is
 */
export const asSkillExitStatus = (input: {
  result: { status: number | null; signal: NodeJS.Signals | null };
  timeoutMs: number;
}): number => {
  // the run was killed — by the spawn guard or otherwise; never a real exit code
  if (input.result.status === null)
    throw new MalfunctionError(
      'skill run never exited — killed before it finished, so no exit code exists',
      {
        signal: input.result.signal,
        timeoutMs: input.timeoutMs,
        hint: 'a SIGTERM here is the spawnSync hang guard; the run exceeded timeoutMs',
      },
    );

  return input.result.status;
};

/**
 * .what = the spawn hang guard for a git.release skill run
 *
 * .why = every run is fully mocked and bounded by the skill itself — in test mode a
 *        watch loop stops at 100 iterations (`GIT_RELEASE_TEST_MODE`). but each
 *        iteration shells out to the fake gh + jq, so a case that walks the whole
 *        bound (e.g. on_main.into_prod [row-2a] --apply) ran past 60s under a full
 *        parallel suite. the guard exists only to catch a true hang, so it sits well
 *        above the slowest legit run
 * .note = jest's per-test timeout cannot preempt a synchronous spawnSync, so this
 *         guard is the only hang bound a skill run has
 */
export const SKILL_SPAWN_TIMEOUT_MS = 180_000;
