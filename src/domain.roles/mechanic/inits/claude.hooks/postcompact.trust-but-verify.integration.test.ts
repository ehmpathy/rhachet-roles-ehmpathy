import { spawnSync } from 'child_process';
import * as path from 'path';
import { given, then, when } from 'test-fns';

/**
 * .what = integration tests for postcompact.trust-but-verify.sh hook
 * .why = verify the hook emits the reminder and exits 0
 */
describe('postcompact.trust-but-verify.sh', () => {
  const scriptPath = path.join(__dirname, 'postcompact.trust-but-verify.sh');

  /**
   * .what = helper to run the hook
   * .why = encapsulates the spawnSync call
   */
  const runHook = (args?: {
    stdin?: string;
  }): { stdout: string; stderr: string; exitCode: number } => {
    // build stdin JSON (Claude Code PostCompact format)
    const stdinJson =
      args?.stdin ??
      JSON.stringify({
        trigger: 'auto',
        compact_summary: 'session summary here',
      });

    const result = spawnSync('bash', [scriptPath], {
      encoding: 'utf-8',
      input: stdinJson,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  given('[case1] PostCompact event fires', () => {
    when('[t0] hook executes', () => {
      then('emits reminder to stdout', () => {
        const result = runHook();
        expect(result.stdout).toMatchSnapshot();
        expect(result.stdout).toContain('compaction occurred');
        expect(result.stdout).toContain('inherited claims may be stale');
        expect(result.stdout).toContain('diagnoses');
        expect(result.stdout).toContain('assumptions');
        expect(result.stdout).toContain('objectives');
        expect(result.stdout).toContain('observations');
        expect(result.stdout).toContain('conclusions');
        expect(result.stdout).toContain('verify before you act');
        expect(result.stdout).toContain('rule.require.trust-but-verify');
      });

      then('exits 0 to allow continuation', () => {
        const result = runHook();
        expect(result.exitCode).toBe(0);
      });

      then('produces no stderr', () => {
        const result = runHook();
        expect(result.stderr).toBe('');
      });
    });
  });

  given('[case2] auto-triggered compaction', () => {
    when('[t0] trigger is auto', () => {
      then('emits reminder', () => {
        const result = runHook({
          stdin: JSON.stringify({
            trigger: 'auto',
            compact_summary: 'auto compaction summary',
          }),
        });
        expect(result.stdout).toContain('compaction occurred');
        expect(result.exitCode).toBe(0);
      });
    });
  });

  given('[case3] manual-triggered compaction', () => {
    when('[t0] trigger is manual', () => {
      then('emits reminder', () => {
        const result = runHook({
          stdin: JSON.stringify({
            trigger: 'manual',
            compact_summary: 'manual compaction summary',
          }),
        });
        expect(result.stdout).toContain('compaction occurred');
        expect(result.exitCode).toBe(0);
      });
    });
  });
});
