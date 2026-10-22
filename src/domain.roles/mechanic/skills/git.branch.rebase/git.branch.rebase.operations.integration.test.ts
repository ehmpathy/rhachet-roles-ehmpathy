import { spawnSync } from 'child_process';
import * as path from 'path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

/**
 * .what = integration tests for the count leaves in git.branch.rebase.operations.sh
 * .why  = a count that cannot be read must fail closed, never pass as zero;
 *         a zero would read as "already up to date" and skip the rebase
 */

const OPERATIONS_PATH = path.join(__dirname, 'git.branch.rebase.operations.sh');

/**
 * .what = run one function from the operations file inside a repo
 * .why  = the leaves are sourced, not executed; this calls one directly
 */
const runOperation = (input: {
  cwd: string;
  call: string;
}): { stdout: string; exitCode: number } => {
  const result = spawnSync(
    'bash',
    ['-c', `source "${OPERATIONS_PATH}" && ${input.call}`],
    { cwd: input.cwd, encoding: 'utf-8' },
  );
  return { stdout: result.stdout ?? '', exitCode: result.status ?? 1 };
};

describe('git.branch.rebase.operations', () => {
  given('[case1] a repo where main sits two commits ahead of HEAD', () => {
    const scene = useBeforeAll(async () => {
      const repo = genTempDir({ slug: 'rebase-ops-behind', git: true });
      configureTestGitUser({ cwd: repo });
      spawnSync('git', ['branch', '-M', 'main'], { cwd: repo });
      spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], { cwd: repo });
      spawnSync('git', ['checkout', 'main'], { cwd: repo });
      spawnSync('git', ['commit', '--allow-empty', '-m', 'reef one'], {
        cwd: repo,
      });
      spawnSync('git', ['commit', '--allow-empty', '-m', 'reef two'], {
        cwd: repo,
      });
      spawnSync('git', ['update-ref', 'refs/remotes/origin/main', 'main'], {
        cwd: repo,
      });
      spawnSync('git', ['checkout', 'turtle/feature-x'], { cwd: repo });
      return { repo };
    });

    when('[t0] get_behind_count reads a ref that exists', () => {
      then('it prints the count and exits 0', () => {
        const result = runOperation({
          cwd: scene.repo,
          call: 'get_behind_count origin/main',
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe('2');
      });
    });

    when('[t1] get_behind_count reads a ref that is absent', () => {
      then('it exits 1 and prints no count', () => {
        const result = runOperation({
          cwd: scene.repo,
          call: 'get_behind_count origin/absent-branch',
        });
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toBe('');
      });
    });
  });
});
