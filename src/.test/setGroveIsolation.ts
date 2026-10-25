import { genTempDir } from 'test-fns';

/**
 * .what = isolate git.repo.test's grove for one test file: a private slot
 *         pool, a fixed bound, and no nest marker from an outer run
 * .why = skill runs under test must never queue on the box's real pool, and
 *        their grove output must read the same on any box (12 cores or 4)
 */
export const setGroveIsolation = (): void => {
  process.env.GIT_REPO_TEST_SLOTS = '4';
  process.env.GIT_REPO_TEST_SLOTS_DIR = genTempDir({ slug: 'grove-pool' });
  delete process.env.GIT_REPO_TEST_GROVE_HELD;
};
