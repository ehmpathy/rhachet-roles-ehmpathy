import { given, then, when } from 'test-fns';

import { genGitMockExecutable } from './.test/infra/mockGit';
import { runOperation, setupTestEnv } from './.test/infra/setupTestEnv';

/**
 * .what = integration tests for get_one_goal_from_input operation
 * .why = verify goal inference logic across 12 branch × flag combinations
 * .spec.tree = git.release.spec.tree.md
 */

jest.setTimeout(5000);

describe('get_one_goal_from_input', () => {
  // ============================================================================
  // scene 1: on feat branch, no flags
  // ============================================================================
  given('[case1] on feat branch, --from omit, --into omit', () => {
    when('[t0] get_one_goal_from_input is called', () => {
      then('infers from=feat, into=main', () => {
        const env = setupTestEnv({ branch: 'turtle/feature-x' });
        genGitMockExecutable({
          mockBinDir: env.mockBinDir,
          options: { branch: 'turtle/feature-x' },
        });

        const result = runOperation(env, {
          operation: 'get_one_goal_from_input',
          functionName: 'get_one_goal_from_input',
          args: ['turtle/feature-x', '', ''],
        });

        expect(result.stdout).toContain('from=feat');
        expect(result.stdout).toContain('into=main');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // scene 2: on feat branch, --into prod
  // ============================================================================
  given('[case2] on feat branch, --from omit, --into prod', () => {
    when('[t0] get_one_goal_from_input is called', () => {
      then('infers from=feat, into=prod', () => {
        const env = setupTestEnv({ branch: 'turtle/feature-x' });
        genGitMockExecutable({
          mockBinDir: env.mockBinDir,
          options: { branch: 'turtle/feature-x' },
        });

        const result = runOperation(env, {
          operation: 'get_one_goal_from_input',
          functionName: 'get_one_goal_from_input',
          args: ['turtle/feature-x', '', 'prod'],
        });

        expect(result.stdout).toContain('from=feat');
        expect(result.stdout).toContain('into=prod');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // scene 3: on feat branch, --from main
  // ============================================================================
  given('[case3] on feat branch, --from main, --into omit', () => {
    when('[t0] get_one_goal_from_input is called', () => {
      then('infers from=main, into=prod', () => {
        const env = setupTestEnv({ branch: 'turtle/feature-x' });
        genGitMockExecutable({
          mockBinDir: env.mockBinDir,
          options: { branch: 'turtle/feature-x' },
        });

        const result = runOperation(env, {
          operation: 'get_one_goal_from_input',
          functionName: 'get_one_goal_from_input',
          args: ['turtle/feature-x', 'main', ''],
        });

        expect(result.stdout).toContain('from=main');
        expect(result.stdout).toContain('into=prod');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // scene 4: --from main --into main (invalid)
  // ============================================================================
  given('[case4] any branch, --from main, --into main', () => {
    when('[t0] get_one_goal_from_input is called', () => {
      then('exits 2 with ConstraintError', () => {
        const env = setupTestEnv({ branch: 'turtle/feature-x' });
        genGitMockExecutable({
          mockBinDir: env.mockBinDir,
          options: { branch: 'turtle/feature-x' },
        });

        const result = runOperation(env, {
          operation: 'get_one_goal_from_input',
          functionName: 'get_one_goal_from_input',
          args: ['turtle/feature-x', 'main', 'main'],
        });

        expect(result.stderr).toContain('--from main --into main is invalid');
        expect(result.status).toBe(2);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // scene 5: on main branch, no flags
  // ============================================================================
  given('[case5] on main branch, --from omit, --into omit', () => {
    when('[t0] get_one_goal_from_input is called', () => {
      then('infers from=main, into=prod', () => {
        const env = setupTestEnv({ branch: 'main' });
        genGitMockExecutable({
          mockBinDir: env.mockBinDir,
          options: { branch: 'main' },
        });

        const result = runOperation(env, {
          operation: 'get_one_goal_from_input',
          functionName: 'get_one_goal_from_input',
          args: ['main', '', ''],
        });

        expect(result.stdout).toContain('from=main');
        expect(result.stdout).toContain('into=prod');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // scene 6: on main branch, --from main (redundant but valid)
  // ============================================================================
  given('[case6] on main branch, --from main, --into omit', () => {
    when('[t0] get_one_goal_from_input is called', () => {
      then('infers from=main, into=prod', () => {
        const env = setupTestEnv({ branch: 'main' });
        genGitMockExecutable({
          mockBinDir: env.mockBinDir,
          options: { branch: 'main' },
        });

        const result = runOperation(env, {
          operation: 'get_one_goal_from_input',
          functionName: 'get_one_goal_from_input',
          args: ['main', 'main', ''],
        });

        expect(result.stdout).toContain('from=main');
        expect(result.stdout).toContain('into=prod');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // scene 7: on main branch, --from feat-branch
  // ============================================================================
  given('[case7] on main branch, --from turtle/feature-x, --into omit', () => {
    when('[t0] get_one_goal_from_input is called', () => {
      then('infers from=turtle/feature-x, into=main', () => {
        const env = setupTestEnv({ branch: 'main' });
        genGitMockExecutable({
          mockBinDir: env.mockBinDir,
          options: { branch: 'main' },
        });

        const result = runOperation(env, {
          operation: 'get_one_goal_from_input',
          functionName: 'get_one_goal_from_input',
          args: ['main', 'turtle/feature-x', ''],
        });

        expect(result.stdout).toContain('from=turtle/feature-x');
        expect(result.stdout).toContain('into=main');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // scene 8: on feat branch, --into main (explicit, same as default)
  // ============================================================================
  given('[case8] on feat branch, --from omit, --into main', () => {
    when('[t0] get_one_goal_from_input is called', () => {
      then('infers from=feat, into=main', () => {
        const env = setupTestEnv({ branch: 'turtle/feature-x' });
        genGitMockExecutable({
          mockBinDir: env.mockBinDir,
          options: { branch: 'turtle/feature-x' },
        });

        const result = runOperation(env, {
          operation: 'get_one_goal_from_input',
          functionName: 'get_one_goal_from_input',
          args: ['turtle/feature-x', '', 'main'],
        });

        expect(result.stdout).toContain('from=feat');
        expect(result.stdout).toContain('into=main');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // scene 9: on main branch, --into prod (explicit, same as default)
  // ============================================================================
  given('[case9] on main branch, --from omit, --into prod', () => {
    when('[t0] get_one_goal_from_input is called', () => {
      then('infers from=main, into=prod', () => {
        const env = setupTestEnv({ branch: 'main' });
        genGitMockExecutable({
          mockBinDir: env.mockBinDir,
          options: { branch: 'main' },
        });

        const result = runOperation(env, {
          operation: 'get_one_goal_from_input',
          functionName: 'get_one_goal_from_input',
          args: ['main', '', 'prod'],
        });

        expect(result.stdout).toContain('from=main');
        expect(result.stdout).toContain('into=prod');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // scene 10: on feat branch, --from main, --into prod
  // ============================================================================
  given('[case10] on feat branch, --from main, --into prod', () => {
    when('[t0] get_one_goal_from_input is called', () => {
      then('from=main, into=prod (explicit)', () => {
        const env = setupTestEnv({ branch: 'turtle/feature-x' });
        genGitMockExecutable({
          mockBinDir: env.mockBinDir,
          options: { branch: 'turtle/feature-x' },
        });

        const result = runOperation(env, {
          operation: 'get_one_goal_from_input',
          functionName: 'get_one_goal_from_input',
          args: ['turtle/feature-x', 'main', 'prod'],
        });

        expect(result.stdout).toContain('from=main');
        expect(result.stdout).toContain('into=prod');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // scene 11: on main, --from main, --into main (error from main too)
  // ============================================================================
  given('[case11] on main, --from main, --into main', () => {
    when('[t0] get_one_goal_from_input is called', () => {
      then('exits 2 with ConstraintError', () => {
        const env = setupTestEnv({ branch: 'main' });
        genGitMockExecutable({
          mockBinDir: env.mockBinDir,
          options: { branch: 'main' },
        });

        const result = runOperation(env, {
          operation: 'get_one_goal_from_input',
          functionName: 'get_one_goal_from_input',
          args: ['main', 'main', 'main'],
        });

        expect(result.stderr).toContain('--from main --into main is invalid');
        expect(result.status).toBe(2);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // scene 12: on main, --into main (implicit --from main)
  // ============================================================================
  given('[case12] on main, --from omit, --into main', () => {
    when('[t0] get_one_goal_from_input is called', () => {
      then('exits 2 with ConstraintError (implicit from=main)', () => {
        const env = setupTestEnv({ branch: 'main' });
        genGitMockExecutable({
          mockBinDir: env.mockBinDir,
          options: { branch: 'main' },
        });

        const result = runOperation(env, {
          operation: 'get_one_goal_from_input',
          functionName: 'get_one_goal_from_input',
          args: ['main', '', 'main'],
        });

        expect(result.stderr).toContain('--from main --into main is invalid');
        expect(result.status).toBe(2);

        env.cleanup();
      });
    });
  });
});
