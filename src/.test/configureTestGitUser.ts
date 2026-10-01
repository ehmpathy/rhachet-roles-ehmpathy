import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { join } from 'path';

/**
 * .what = the `git config` argv that writes a value, or unsets the key where
 *         the value is `null`
 */
const asGitConfigArgv = (input: {
  key: string;
  value: string | null;
}): string[] =>
  input.value === null
    ? ['config', '--local', '--unset-all', input.key]
    : ['config', '--local', input.key, input.value];

/**
 * .what = true where an unset found the key already absent — the goal state
 * .why = `git config --unset-all` exits 5 on an absent key
 */
const isGitConfigAbsentAlready = (input: {
  value: string | null;
  result: { status: number | null };
}): boolean => input.value === null && input.result.status === 5;

/**
 * .what = configure git user.name and user.email for a test repo
 * .why = centralizes git config setup with explicit --local flag to prevent config pollution
 *
 * .note = uses --local explicitly to ensure config stays in the temp repo
 * .note = jest.integration.env.ts sets GIT_CONFIG_GLOBAL=/dev/null for additional isolation
 * .note = guards ensure this only runs in temp test repos, never the main repo
 * .note = `null` UNSETS that half. the machine's git identity is the sponsor
 *         where no bind exists, so a test of "git config holds no identity"
 *         needs the absent state, not merely a different value.
 */
export const configureTestGitUser = (input: {
  cwd: string;
  name?: string | null;
  email?: string | null;
}): void => {
  const { cwd, name = 'Test Human', email = 'human@test.com' } = input;

  // guard: cwd must be within a temp directory (.temp or /tmp/)
  if (!cwd.includes('.temp') && !cwd.startsWith('/tmp/')) {
    throw new ConstraintError(
      'configureTestGitUser: cwd must be within a temp directory, to prevent pollution',
      { cwd, hint: 'pass a cwd from genTempDir (under .temp or /tmp/)' },
    );
  }

  // guard: cwd must have its own .git directory (not inherit from parent)
  if (!existsSync(join(cwd, '.git'))) {
    throw new ConstraintError(
      'configureTestGitUser: cwd must be a git repo (no .git directory found)',
      { cwd, hint: 'create the temp dir with genTempDir({ git: true })' },
    );
  }

  // guard: cwd must not be the main repo root itself
  // .why = the temp-path guard above lets a temp dir under the repo through (as
  //        it must — genTempDir puts `.temp/` there), so it cannot also catch a
  //        checkout that itself sits on a temp path. this names that one case
  const repoRoot = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: process.cwd(),
    encoding: 'utf-8',
  }).stdout.trim();
  if (cwd === repoRoot) {
    throw new ConstraintError(
      'configureTestGitUser: cwd must not be the main repo root',
      { cwd, repoRoot, hint: 'pass a cwd from genTempDir, never the repo itself' },
    );
  }

  // write or clear each half in the repo's own config
  for (const [key, value] of [
    ['user.name', name],
    ['user.email', email],
  ] as const) {
    const argv = asGitConfigArgv({ key, value });
    const result = spawnSync('git', argv, { cwd });

    // fail loud: a silent write failure would test the wrong identity
    if (result.status !== 0 && !isGitConfigAbsentAlready({ value, result }))
      throw new MalfunctionError('configureTestGitUser: git config failed', {
        argv,
        cwd,
        exit: result.status,
        stderr: result.stderr?.toString(),
        hint: 'check that git is on PATH and the temp repo is writable',
      });
  }
};
