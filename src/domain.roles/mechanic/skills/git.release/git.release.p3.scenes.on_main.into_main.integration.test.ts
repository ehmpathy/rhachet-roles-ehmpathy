/**
 * .spec.tree = git.release.spec.tree.md
 * .note = scene 6: on main, --into main (invalid)
 *
 * total snapshots: 1 (ConstraintError case)
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

// ============================================================================
// test infrastructure
// ============================================================================

const SKILL_PATH = path.join(
  __dirname,
  '../../../../../dist/domain.roles/mechanic/skills/git.release/git.release.sh',
);

const setupTempGitRepo = (slug: string): { tempDir: string } => {
  const tempDir = genTempDir({ slug, git: true });

  // configure git
  configureTestGitUser({ cwd: tempDir });
  spawnSync('git', ['checkout', '-b', 'main'], { cwd: tempDir });
  spawnSync('git', ['commit', '--allow-empty', '-m', 'initial'], {
    cwd: tempDir,
  });

  return { tempDir };
};

const runSkill = (
  args: string[],
  env: { tempDir: string },
): { stdout: string; stderr: string; status: number } => {
  const result = spawnSync('bash', [SKILL_PATH, ...args], {
    cwd: env.tempDir,
    env: {
      ...process.env,
      TERM: 'dumb',
      HOME: env.tempDir,
      GIT_RELEASE_TEST_MODE: 'true',
    },
    encoding: 'utf-8',
    timeout: 3000,
  });

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status ?? 1,
  };
};

// ============================================================================
// scene.6: on main, --into main (invalid)
// ============================================================================

describe('git.release.p3.scenes.on_main.into_main', () => {
  describe('scene.6: on main branch, --into main (invalid)', () => {
    given('[error] on main, --into main', () => {
      when('rhx git.release --into main', () => {
        then('ConstraintError: cannot merge main into main', () => {
          const { tempDir } = setupTempGitRepo('p3-s6-error');
          const result = runSkill(['--into', 'main'], { tempDir });
          expect(result.stderr).toContain('--from main --into main is invalid');
          expect(result.stderr).toContain("you're already on main");
          expect(result.status).toEqual(2);
          expect(result.stderr).toMatchSnapshot();
        });
      });
    });
  });
});
