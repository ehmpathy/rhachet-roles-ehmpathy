import { given, then, when } from 'test-fns';

import { genGhMockExecutable } from './.test/infra/mockGh';
import { runOperation, setupTestEnv } from './.test/infra/setupTestEnv';
import { asSnapshotReady } from './.test/infra/snapshotOps';

/**
 * .what = integration tests for emit_transport_watch operation
 * .why = verify watch loop behavior across 6 scenarios with 3+ poll cycles
 * .spec.tree = git.release.spec.tree.md
 */

jest.setTimeout(15000);

describe('emit_transport_watch', () => {
  // ============================================================================
  // case 1: inflight → passed (3+ poll cycles)
  // ============================================================================
  given('[case1] inflight → passed', () => {
    when('[t0] emit_transport_watch is called', () => {
      then('shows at least 3 poll cycles before success', () => {
        const env = setupTestEnv();
        genGhMockExecutable({
          mockBinDir: env.mockBinDir,
          stateDir: env.stateDir,
          options: {
            priorReleaseTitle: 'chore(release): v1.2.0',
            featPr: 'inflight',
            watchSequence: [
              'inflight',
              'inflight',
              'inflight',
              'inflight',
              'passed:wout-automerge',
            ],
          },
        });

        const result = runOperation(env, {
          operation: 'emit_transport_watch',
          functionName: 'emit_transport_watch',
          args: ['pr', '42', ''],
        });

        const output = asSnapshotReady(result.stdout);
        // verify 3+ poll cycles
        const pollCount = (output.match(/💤/g) || []).length;
        expect(pollCount).toBeGreaterThanOrEqual(3);
        // watch ends with "done!" not check status (status shown by emit_transport_status)
        expect(output).toContain('done!');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // case 2: inflight → failed (3+ poll cycles)
  // ============================================================================
  given('[case2] inflight → failed', () => {
    when('[t0] emit_transport_watch is called', () => {
      then('shows at least 3 poll cycles before failure', () => {
        const env = setupTestEnv();
        genGhMockExecutable({
          mockBinDir: env.mockBinDir,
          stateDir: env.stateDir,
          options: {
            priorReleaseTitle: 'chore(release): v1.2.0',
            featPr: 'inflight',
            watchSequence: [
              'inflight',
              'inflight',
              'inflight',
              'inflight',
              'failed',
            ],
          },
        });

        const result = runOperation(env, {
          operation: 'emit_transport_watch',
          functionName: 'emit_transport_watch',
          args: ['pr', '42', ''],
        });

        const output = asSnapshotReady(result.stdout);
        // verify 3+ poll cycles
        const pollCount = (output.match(/💤/g) || []).length;
        expect(pollCount).toBeGreaterThanOrEqual(3);
        expect(output).toContain('check(s) failed');
        expect(result.status).toBe(2);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // case 3: inflight → merged (3+ poll cycles)
  // ============================================================================
  given('[case3] inflight → merged', () => {
    when('[t0] emit_transport_watch is called', () => {
      then('shows poll cycles then merge', () => {
        const env = setupTestEnv();
        genGhMockExecutable({
          mockBinDir: env.mockBinDir,
          stateDir: env.stateDir,
          options: {
            priorReleaseTitle: 'chore(release): v1.2.0',
            featPr: 'inflight',
            watchSequence: [
              'inflight',
              'inflight',
              'inflight',
              'inflight',
              'merged',
            ],
          },
        });

        const result = runOperation(env, {
          operation: 'emit_transport_watch',
          functionName: 'emit_transport_watch',
          args: ['pr', '42', ''],
        });

        const output = asSnapshotReady(result.stdout);
        const pollCount = (output.match(/💤/g) || []).length;
        expect(pollCount).toBeGreaterThanOrEqual(3);
        expect(output).toContain('done!');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // case 4: already passed (no poll)
  // ============================================================================
  given('[case4] already passed', () => {
    when('[t0] emit_transport_watch is called', () => {
      then('shows passed without poll cycles', () => {
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
          operation: 'emit_transport_watch',
          functionName: 'emit_transport_watch',
          args: ['pr', '42', ''],
        });

        // debug: show stderr if there's an error
        if (result.stderr) {
          console.log('stderr:', result.stderr);
        }

        const output = asSnapshotReady(result.stdout);
        // no poll cycles when already terminal
        const pollCount = (output.match(/💤/g) || []).length;
        expect(pollCount).toBe(0);
        // watch ends with "done!" (status shown by emit_transport_status)
        expect(output).toContain('done!');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // case 5: already merged (no poll, no output)
  // ============================================================================
  given('[case5] already merged', () => {
    when('[t0] emit_transport_watch is called', () => {
      then('returns immediately with no output', () => {
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
          operation: 'emit_transport_watch',
          functionName: 'emit_transport_watch',
          args: ['pr', '42', ''],
        });

        // already merged = emit watch header and done for tree consistency
        // (emit_transport_status may have used ├─ for automerge line)
        const output = asSnapshotReady(result.stdout);
        const pollCount = (output.match(/💤/g) || []).length;
        expect(pollCount).toBe(0);
        expect(output).toContain("🥥 let's watch");
        expect(output).toContain('done! merged!');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });

  // ============================================================================
  // case 6: tag workflows (inflight → passed)
  // ============================================================================
  given('[case6] tag workflows inflight → passed', () => {
    when('[t0] emit_transport_watch is called for tag', () => {
      then('shows poll cycles for tag workflows', () => {
        const env = setupTestEnv();
        genGhMockExecutable({
          mockBinDir: env.mockBinDir,
          stateDir: env.stateDir,
          options: {
            priorReleaseTitle: 'chore(release): v1.2.0',
            tagWorkflows: 'inflight',
            watchSequence: [
              'inflight',
              'inflight',
              'inflight',
              'inflight',
              'passed',
            ],
          },
        });

        const result = runOperation(env, {
          operation: 'emit_transport_watch',
          functionName: 'emit_transport_watch',
          args: ['tag', 'v1.2.3', ''],
        });

        const output = asSnapshotReady(result.stdout);
        const pollCount = (output.match(/💤/g) || []).length;
        expect(pollCount).toBeGreaterThanOrEqual(3);
        expect(output).toContain('done!');
        expect(result.status).toBe(0);

        env.cleanup();
      });
    });
  });
});
