import { given, then, when } from 'test-fns';

import { runOperation, setupTestEnv } from './.test/infra/setupTestEnv';

/**
 * .what = integration tests for get_all_flags_from_input operation
 * .why = verify flag parse logic across 8 mode combinations
 * .spec.tree = git.release.spec.tree.md
 */

jest.setTimeout(5000);

describe('get_all_flags_from_input', () => {
  // ============================================================================
  // case 1: no flags (defaults)
  // ============================================================================
  given('[case1] no flags', () => {
    when('[t0] get_all_flags_from_input is called', () => {
      then('returns default values', () => {
        const env = setupTestEnv();

        const result = runOperation(env, {
          operation: 'get_all_flags_from_input',
          functionName: 'get_all_flags_from_input',
          args: [],
        });

        expect(result.stdout).toContain('watch=false');
        expect(result.stdout).toContain('apply=false');
        expect(result.stdout).toContain('retry=false');
        expect(result.stdout).toContain('dirty=block');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // case 2: --watch only
  // ============================================================================
  given('[case2] --watch flag', () => {
    when('[t0] get_all_flags_from_input is called', () => {
      then('returns watch=true, others default', () => {
        const env = setupTestEnv();

        const result = runOperation(env, {
          operation: 'get_all_flags_from_input',
          functionName: 'get_all_flags_from_input',
          args: ['--watch'],
        });

        expect(result.stdout).toContain('watch=true');
        expect(result.stdout).toContain('apply=false');
        expect(result.stdout).toContain('retry=false');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // case 3: --apply alias
  // ============================================================================
  given('[case3] --apply flag', () => {
    when('[t0] get_all_flags_from_input is called', () => {
      then('returns apply=true and watch=true (implied)', () => {
        const env = setupTestEnv();

        const result = runOperation(env, {
          operation: 'get_all_flags_from_input',
          functionName: 'get_all_flags_from_input',
          args: ['--apply'],
        });

        expect(result.stdout).toContain('watch=true');
        expect(result.stdout).toContain('apply=true');
        expect(result.stdout).toContain('retry=false');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // case 4: --mode apply
  // ============================================================================
  given('[case4] --mode apply flag', () => {
    when('[t0] get_all_flags_from_input is called', () => {
      then('returns apply=true and watch=true (implied)', () => {
        const env = setupTestEnv();

        const result = runOperation(env, {
          operation: 'get_all_flags_from_input',
          functionName: 'get_all_flags_from_input',
          args: ['--mode', 'apply'],
        });

        expect(result.stdout).toContain('watch=true');
        expect(result.stdout).toContain('apply=true');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // case 5: --mode plan (explicit default)
  // ============================================================================
  given('[case5] --mode plan flag', () => {
    when('[t0] get_all_flags_from_input is called', () => {
      then('returns defaults (plan is default)', () => {
        const env = setupTestEnv();

        const result = runOperation(env, {
          operation: 'get_all_flags_from_input',
          functionName: 'get_all_flags_from_input',
          args: ['--mode', 'plan'],
        });

        expect(result.stdout).toContain('watch=false');
        expect(result.stdout).toContain('apply=false');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // case 6: --retry only
  // ============================================================================
  given('[case6] --retry flag', () => {
    when('[t0] get_all_flags_from_input is called', () => {
      then('returns retry=true, others default', () => {
        const env = setupTestEnv();

        const result = runOperation(env, {
          operation: 'get_all_flags_from_input',
          functionName: 'get_all_flags_from_input',
          args: ['--retry'],
        });

        expect(result.stdout).toContain('watch=false');
        expect(result.stdout).toContain('apply=false');
        expect(result.stdout).toContain('retry=true');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // case 7: --dirty allow
  // ============================================================================
  given('[case7] --dirty allow flag', () => {
    when('[t0] get_all_flags_from_input is called', () => {
      then('returns dirty=allow', () => {
        const env = setupTestEnv();

        const result = runOperation(env, {
          operation: 'get_all_flags_from_input',
          functionName: 'get_all_flags_from_input',
          args: ['--dirty', 'allow'],
        });

        expect(result.stdout).toContain('dirty=allow');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // case 8: combined flags
  // ============================================================================
  given('[case8] --apply --retry combined', () => {
    when('[t0] get_all_flags_from_input is called', () => {
      then('returns all flags set', () => {
        const env = setupTestEnv();

        const result = runOperation(env, {
          operation: 'get_all_flags_from_input',
          functionName: 'get_all_flags_from_input',
          args: ['--apply', '--retry', '--dirty', 'allow'],
        });

        expect(result.stdout).toContain('watch=true');
        expect(result.stdout).toContain('apply=true');
        expect(result.stdout).toContain('retry=true');
        expect(result.stdout).toContain('dirty=allow');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });
});
