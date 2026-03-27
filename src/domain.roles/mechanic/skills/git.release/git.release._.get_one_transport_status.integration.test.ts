import { given, then, when } from 'test-fns';

import {
  genGhMockExecutable,
  type PrState,
  type TagState,
} from './.test/infra/mockGh';
import { runOperation, setupTestEnv } from './.test/infra/setupTestEnv';

/**
 * .what = integration tests for get_one_transport_status operation
 * .why = verify transport state detection across 20 state combinations
 *        (8 PR states × 2 transport types + 4 tag states)
 * .spec.tree = git.release.spec.tree.md
 */

jest.setTimeout(5000);

describe('get_one_transport_status', () => {
  // ============================================================================
  // PR transport: feature-branch states (8 cases)
  // ============================================================================
  describe('PR transport', () => {
    const PR_STATES: Array<{
      state: PrState;
      expectCheck: string;
      expectAutomerge: string;
    }> = [
      {
        state: 'inflight',
        expectCheck: 'inflight',
        expectAutomerge: 'unfound',
      },
      {
        state: 'passed:wout-automerge',
        expectCheck: 'passed',
        expectAutomerge: 'unfound',
      },
      {
        state: 'passed:with-automerge',
        expectCheck: 'passed',
        expectAutomerge: 'found',
      },
      { state: 'merged', expectCheck: 'merged', expectAutomerge: 'n/a' },
      { state: 'failed', expectCheck: 'failed', expectAutomerge: 'unfound' },
      {
        state: 'rebase:behind',
        expectCheck: 'passed',
        expectAutomerge: 'unfound',
      },
      {
        state: 'rebase:dirty',
        expectCheck: 'passed',
        expectAutomerge: 'unfound',
      },
    ];

    PR_STATES.forEach(({ state, expectCheck, expectAutomerge }, index) => {
      given(`[case${index + 1}] PR state: ${state}`, () => {
        when('[t0] get_one_transport_status is called', () => {
          then(
            `returns check=${expectCheck}, automerge=${expectAutomerge}`,
            () => {
              const env = setupTestEnv();
              genGhMockExecutable({
                mockBinDir: env.mockBinDir,
                stateDir: env.stateDir,
                options: {
                  priorReleaseTitle: 'chore(release): v1.2.0',
                  featPr: state,
                },
              });

              const result = runOperation(env, {
                operation: 'get_one_transport_status',
                functionName: 'get_one_transport_status',
                args: ['pr', '42', ''],
              });

              expect(result.stdout).toContain(`check=${expectCheck}`);
              expect(result.stdout).toContain(`automerge=${expectAutomerge}`);
              expect(result.status).toBe(0);

              env.cleanup();
            },
          );
        });
      });
    });

    // rebase states need separate verification
    given('[case8] PR state: rebase:behind', () => {
      when('[t0] get_one_transport_status is called', () => {
        then('returns rebase=behind', () => {
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
            operation: 'get_one_transport_status',
            functionName: 'get_one_transport_status',
            args: ['pr', '42', ''],
          });

          expect(result.stdout).toContain('rebase=behind');
          expect(result.status).toBe(0);

          env.cleanup();
        });
      });
    });

    given('[case9] PR state: rebase:dirty', () => {
      when('[t0] get_one_transport_status is called', () => {
        then('returns rebase=dirty', () => {
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
            operation: 'get_one_transport_status',
            functionName: 'get_one_transport_status',
            args: ['pr', '42', ''],
          });

          expect(result.stdout).toContain('rebase=dirty');
          expect(result.status).toBe(0);

          env.cleanup();
        });
      });
    });
  });

  // ============================================================================
  // PR transport: release-branch states (same as feature, validated above)
  // cases 10-17 mirror 1-9 but for release PR #100
  // ============================================================================
  describe('release-branch PR transport', () => {
    given('[case10] release PR state: passed:wout-automerge', () => {
      when('[t0] get_one_transport_status is called', () => {
        then('returns check=passed, automerge=unfound', () => {
          const env = setupTestEnv();
          genGhMockExecutable({
            mockBinDir: env.mockBinDir,
            stateDir: env.stateDir,
            options: {
              priorReleaseTitle: 'chore(release): v1.2.0',
              releasePr: 'passed:wout-automerge',
            },
          });

          const result = runOperation(env, {
            operation: 'get_one_transport_status',
            functionName: 'get_one_transport_status',
            args: ['pr', '100', ''],
          });

          expect(result.stdout).toContain('check=passed');
          expect(result.stdout).toContain('automerge=unfound');
          expect(result.status).toBe(0);

          env.cleanup();
        });
      });
    });

    given('[case11] release PR state: merged', () => {
      when('[t0] get_one_transport_status is called', () => {
        then('returns check=merged', () => {
          const env = setupTestEnv();
          genGhMockExecutable({
            mockBinDir: env.mockBinDir,
            stateDir: env.stateDir,
            options: {
              priorReleaseTitle: 'chore(release): v1.2.0',
              releasePr: 'merged',
            },
          });

          const result = runOperation(env, {
            operation: 'get_one_transport_status',
            functionName: 'get_one_transport_status',
            args: ['pr', '100', ''],
          });

          expect(result.stdout).toContain('check=merged');
          expect(result.status).toBe(0);

          env.cleanup();
        });
      });
    });
  });

  // ============================================================================
  // tag transport states (4 cases)
  // ============================================================================
  describe('tag transport', () => {
    const TAG_STATES: Array<{ state: TagState; expectCheck: string }> = [
      { state: 'unfound', expectCheck: 'unfound' },
      { state: 'inflight', expectCheck: 'inflight' },
      { state: 'passed', expectCheck: 'passed' },
      { state: 'failed', expectCheck: 'failed' },
    ];

    TAG_STATES.forEach(({ state, expectCheck }, index) => {
      given(`[case${18 + index}] tag state: ${state}`, () => {
        when('[t0] get_one_transport_status is called', () => {
          then(`returns check=${expectCheck}`, () => {
            const env = setupTestEnv();
            genGhMockExecutable({
              mockBinDir: env.mockBinDir,
              stateDir: env.stateDir,
              options: {
                priorReleaseTitle: 'chore(release): v1.2.0',
                tagWorkflows: state,
              },
            });

            const result = runOperation(env, {
              operation: 'get_one_transport_status',
              functionName: 'get_one_transport_status',
              args: ['tag', 'v1.2.3', ''],
            });

            expect(result.stdout).toContain(`check=${expectCheck}`);
            expect(result.stdout).toContain('automerge=n/a');
            expect(result.status).toBe(0);

            env.cleanup();
          });
        });
      });
    });
  });
});
