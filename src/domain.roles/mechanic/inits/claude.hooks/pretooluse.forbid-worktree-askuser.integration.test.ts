import { spawnSync } from 'child_process';
import * as path from 'path';
import { given, then, when } from 'test-fns';

/**
 * .what = integration tests for pretooluse.forbid-worktree-askuser.sh
 * .why  = an unattended seat must neither move into another tree nor park on a
 *         modal that waits for a human; the hook fails closed on any other tool
 */
describe('pretooluse.forbid-worktree-askuser.sh', () => {
  const scriptPath = path.join(__dirname, 'pretooluse.forbid-worktree-askuser.sh');

  const runHook = (input: { stdin: string }) => {
    const result = spawnSync('bash', [scriptPath], {
      encoding: 'utf-8', // node api param name
      input: input.stdin,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  given('[case1] an EnterWorktree call', () => {
    when('[t0] the hook runs', () => {
      then('it blocks, exit 2, and names the fix', () => {
        const result = runHook({
          stdin: JSON.stringify({
            tool_name: 'EnterWorktree',
            tool_input: { name: 'wave-report' },
          }),
        });
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toBe('');
        expect(result.stderr).toContain(
          '✋ ConstraintError: EnterWorktree is forbidden to the mechanic',
        );
        expect(result.stderr).toContain('rhx clone --help');
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case2] an AskUserQuestion call', () => {
    when('[t0] the hook runs', () => {
      then('it blocks, exit 2, and names the fix', () => {
        const result = runHook({
          stdin: JSON.stringify({
            tool_name: 'AskUserQuestion',
            tool_input: { questions: [{ question: 'which spot?' }] },
          }),
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain(
          '✋ ConstraintError: AskUserQuestion is forbidden to the mechanic',
        );
        expect(result.stderr).toContain('ask in plain chat text');
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case3] a tool the hook was never registered for', () => {
    when('[t0] a Read call reaches it (a registration defect)', () => {
      then('it fails closed, exit 2, with a MalfunctionError', () => {
        const result = runHook({
          stdin: JSON.stringify({
            tool_name: 'Read',
            tool_input: { file_path: 'src/surfer.ts' },
          }),
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('💥 MalfunctionError');
        expect(result.stderr).toContain("tool: 'Read'");
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t1] stdin is empty', () => {
      then('it fails closed, exit 2', () => {
        const result = runHook({ stdin: '' });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('💥 MalfunctionError');
      });
    });
  });
});
