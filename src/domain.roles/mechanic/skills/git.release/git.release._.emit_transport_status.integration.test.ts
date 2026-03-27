import { given, then, when } from 'test-fns';

import { genGhMockExecutable } from './.test/infra/mockGh';
import { runOperation, setupTestEnv } from './.test/infra/setupTestEnv';
import { asSnapshotReady } from './.test/infra/snapshotOps';

/**
 * .what = integration tests for emit_transport_status operation
 * .why = verify uniform status output across 11 state × automerge combinations
 * .spec.tree = git.release.spec.tree.md
 */

jest.setTimeout(5000);

describe('emit_transport_status', () => {
  // ============================================================================
  // case 1: inflight, wout-automerge, plan mode
  // ============================================================================
  given('[case1] inflight, wout-automerge, plan', () => {
    when('[t0] emit_transport_status is called', () => {
      then('shows check in progress, automerge unfound', () => {
        const env = setupTestEnv();
        genGhMockExecutable({
          mockBinDir: env.mockBinDir,
          stateDir: env.stateDir,
          options: {
            priorReleaseTitle: 'chore(release): v1.2.0',
            featPr: 'inflight',
          },
        });

        const result = runOperation(env, {
          operation: 'emit_transport_status',
          functionName: 'emit_transport_status',
          args: ['pr', '42', 'false', 'false', 'false', ''],
        });

        const output = asSnapshotReady(result.stdout);
        expect(output).toContain('check(s) in progress');
        expect(output).toContain('automerge unfound');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // case 2: passed, wout-automerge, plan mode
  // ============================================================================
  given('[case2] passed, wout-automerge, plan', () => {
    when('[t0] emit_transport_status is called', () => {
      then('shows all checks passed, automerge unfound, hint to apply', () => {
        const env = setupTestEnv();
        genGhMockExecutable({
          mockBinDir: env.mockBinDir,
          stateDir: env.stateDir,
          options: {
            priorReleaseTitle: 'chore(release): v1.2.0',
            featPr: 'passed:wout-automerge',
          },
        });

        const result = runOperation(env, {
          operation: 'emit_transport_status',
          functionName: 'emit_transport_status',
          args: ['pr', '42', 'false', 'false', 'false', ''],
        });

        const output = asSnapshotReady(result.stdout);
        expect(output).toContain('all checks passed');
        expect(output).toContain('automerge unfound');
        expect(output).toContain('--apply');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // case 3: passed, with-automerge, plan mode
  // ============================================================================
  given('[case3] passed, with-automerge, plan', () => {
    when('[t0] emit_transport_status is called', () => {
      then('shows all checks passed, automerge enabled', () => {
        const env = setupTestEnv();
        genGhMockExecutable({
          mockBinDir: env.mockBinDir,
          stateDir: env.stateDir,
          options: {
            priorReleaseTitle: 'chore(release): v1.2.0',
            featPr: 'passed:with-automerge',
          },
        });

        const result = runOperation(env, {
          operation: 'emit_transport_status',
          functionName: 'emit_transport_status',
          args: ['pr', '42', 'false', 'false', 'false', ''],
        });

        const output = asSnapshotReady(result.stdout);
        expect(output).toContain('all checks passed');
        expect(output).toContain('automerge enabled');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // case 4: failed, wout-automerge, plan mode
  // ============================================================================
  given('[case4] failed, wout-automerge, plan', () => {
    when('[t0] emit_transport_status is called', () => {
      then('shows checks failed, hints for retry', () => {
        const env = setupTestEnv();
        genGhMockExecutable({
          mockBinDir: env.mockBinDir,
          stateDir: env.stateDir,
          options: {
            priorReleaseTitle: 'chore(release): v1.2.0',
            featPr: 'failed',
          },
        });

        const result = runOperation(env, {
          operation: 'emit_transport_status',
          functionName: 'emit_transport_status',
          args: ['pr', '42', 'false', 'false', 'false', ''],
        });

        const output = asSnapshotReady(result.stdout);
        expect(output).toContain('check(s) failed');
        expect(output).toContain('--retry');
        expect(result.status).toBe(2);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // case 5: merged
  // ============================================================================
  given('[case5] merged', () => {
    when('[t0] emit_transport_status is called', () => {
      then('shows already merged', () => {
        const env = setupTestEnv();
        genGhMockExecutable({
          mockBinDir: env.mockBinDir,
          stateDir: env.stateDir,
          options: {
            priorReleaseTitle: 'chore(release): v1.2.0',
            featPr: 'merged',
          },
        });

        const result = runOperation(env, {
          operation: 'emit_transport_status',
          functionName: 'emit_transport_status',
          args: ['pr', '42', 'false', 'false', 'false', ''],
        });

        const output = asSnapshotReady(result.stdout);
        expect(output).toContain('already merged');
        expect(result.status).toBe(3); // 3 = already merged, caller should skip watch

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // case 6: rebase:behind
  // ============================================================================
  given('[case6] rebase:behind', () => {
    when('[t0] emit_transport_status is called', () => {
      then('shows needs rebase, exit 2', () => {
        const env = setupTestEnv();
        genGhMockExecutable({
          mockBinDir: env.mockBinDir,
          stateDir: env.stateDir,
          options: {
            priorReleaseTitle: 'chore(release): v1.2.0',
            featPr: 'rebase:behind',
          },
        });

        const result = runOperation(env, {
          operation: 'emit_transport_status',
          functionName: 'emit_transport_status',
          args: ['pr', '42', 'false', 'false', 'false', ''],
        });

        const output = asSnapshotReady(result.stdout);
        expect(output).toContain('needs rebase');
        expect(result.status).toBe(2);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // case 7: rebase:dirty
  // ============================================================================
  given('[case7] rebase:dirty', () => {
    when('[t0] emit_transport_status is called', () => {
      then('shows needs rebase with conflicts, exit 2', () => {
        const env = setupTestEnv();
        genGhMockExecutable({
          mockBinDir: env.mockBinDir,
          stateDir: env.stateDir,
          options: {
            priorReleaseTitle: 'chore(release): v1.2.0',
            featPr: 'rebase:dirty',
          },
        });

        const result = runOperation(env, {
          operation: 'emit_transport_status',
          functionName: 'emit_transport_status',
          args: ['pr', '42', 'false', 'false', 'false', ''],
        });

        const output = asSnapshotReady(result.stdout);
        expect(output).toContain('conflicts');
        expect(result.status).toBe(2);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // case 8: passed, wout-automerge, apply mode
  // ============================================================================
  given('[case8] passed, wout-automerge, apply mode', () => {
    when('[t0] emit_transport_status is called with apply=true', () => {
      then('shows automerge enabled [added]', () => {
        const env = setupTestEnv();
        genGhMockExecutable({
          mockBinDir: env.mockBinDir,
          stateDir: env.stateDir,
          options: {
            priorReleaseTitle: 'chore(release): v1.2.0',
            featPr: 'passed:wout-automerge',
          },
        });

        const result = runOperation(env, {
          operation: 'emit_transport_status',
          functionName: 'emit_transport_status',
          args: ['pr', '42', 'true', 'false', 'false', ''],
        });

        const output = asSnapshotReady(result.stdout);
        expect(output).toMatch(/automerge enabled.*added/i);
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // case 9: failed, wout-automerge, retry mode
  // ============================================================================
  given('[case9] failed, wout-automerge, retry mode', () => {
    when('[t0] emit_transport_status is called with retry=true', () => {
      then('shows rerun triggered', () => {
        const env = setupTestEnv();
        genGhMockExecutable({
          mockBinDir: env.mockBinDir,
          stateDir: env.stateDir,
          options: {
            priorReleaseTitle: 'chore(release): v1.2.0',
            featPr: 'failed',
          },
        });

        const result = runOperation(env, {
          operation: 'emit_transport_status',
          functionName: 'emit_transport_status',
          args: ['pr', '42', 'false', 'true', 'false', ''],
        });

        const output = asSnapshotReady(result.stdout);
        expect(output).toContain('rerun');
        expect(result.status).toBe(2);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // case 10: tag transport unfound
  // ============================================================================
  given('[case10] tag transport unfound', () => {
    when('[t0] emit_transport_status is called', () => {
      then('shows passed (no tag workflows = no blockers)', () => {
        const env = setupTestEnv();
        genGhMockExecutable({
          mockBinDir: env.mockBinDir,
          stateDir: env.stateDir,
          options: {
            priorReleaseTitle: 'chore(release): v1.2.0',
            tagWorkflows: 'unfound',
          },
        });

        const result = runOperation(env, {
          operation: 'emit_transport_status',
          functionName: 'emit_transport_status',
          args: ['tag', 'v1.2.3', 'false', 'false', 'false', ''],
        });

        const output = asSnapshotReady(result.stdout);
        // no tag workflows = no blockers = passed
        expect(output).toContain('passed');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // case 11: tag transport passed
  // ============================================================================
  given('[case11] tag transport passed', () => {
    when('[t0] emit_transport_status is called', () => {
      then('shows check passed', () => {
        const env = setupTestEnv();
        genGhMockExecutable({
          mockBinDir: env.mockBinDir,
          stateDir: env.stateDir,
          options: {
            priorReleaseTitle: 'chore(release): v1.2.0',
            tagWorkflows: 'passed',
          },
        });

        const result = runOperation(env, {
          operation: 'emit_transport_status',
          functionName: 'emit_transport_status',
          args: ['tag', 'v1.2.3', 'false', 'false', 'false', ''],
        });

        const output = asSnapshotReady(result.stdout);
        expect(output).toContain('passed');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });
});
