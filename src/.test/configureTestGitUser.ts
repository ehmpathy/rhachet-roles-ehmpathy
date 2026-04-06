import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * .what = configure git user.name and user.email for a test repo
 * .why = centralizes git config setup with explicit --local flag to prevent config pollution
 *
 * .note = uses --local explicitly to ensure config stays in the temp repo
 * .note = jest.integration.env.ts sets GIT_CONFIG_GLOBAL=/dev/null for additional isolation
 * .note = guards ensure this only runs in temp test repos, never the main repo
 */
export const configureTestGitUser = (input: {
  cwd: string;
  name?: string;
  email?: string;
}): void => {
  const { cwd, name = 'Test Human', email = 'human@test.com' } = input;

  // guard: cwd must be within a temp directory (.temp or /tmp/)
  if (!cwd.includes('.temp') && !cwd.startsWith('/tmp/')) {
    throw new Error(
      `configureTestGitUser: cwd must be within a temp directory (.temp or /tmp/) to prevent pollution. got: ${cwd}`,
    );
  }

  // guard: cwd must have its own .git directory (not inherit from parent)
  if (!existsSync(join(cwd, '.git'))) {
    throw new Error(
      `configureTestGitUser: cwd must be a git repo (no .git directory found). got: ${cwd}`,
    );
  }

  // guard: cwd must not be the main repo root
  const repoRoot = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: process.cwd(),
    encoding: 'utf-8',
  }).stdout.trim();
  const isInMainRepo = cwd === repoRoot || cwd.startsWith(repoRoot + '/');
  const isInTempDir = cwd.includes('.temp') || cwd.startsWith('/tmp/');
  if (isInMainRepo && !isInTempDir) {
    throw new Error(
      `configureTestGitUser: cwd must not be within the main repo. got: ${cwd}`,
    );
  }

  spawnSync('git', ['config', '--local', 'user.name', name], { cwd });
  spawnSync('git', ['config', '--local', 'user.email', email], { cwd });
};
