import { spawnSync } from 'child_process';
import * as path from 'path';
import { given, then, when } from 'test-fns';

/**
 * .what = integration tests for pretooluse.forbid-test-background.sh
 * .why = verify the hook blocks background test execution and allows foreground
 */
describe('pretooluse.forbid-test-background.sh', () => {
  const scriptPath = path.join(
    __dirname,
    'pretooluse.forbid-test-background.sh',
  );

  /**
   * .what = helper to run the hook with tool input
   * .why = simplifies test assertions
   */
  const runHook = (input: {
    tool_name: string;
    tool_input: {
      command?: string;
      run_in_background?: boolean;
    };
  }): {
    stdout: string;
    stderr: string;
    exitCode: number;
  } => {
    const stdinJson = JSON.stringify(input);

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

  given('[case1] foreground test execution', () => {
    when('[t0] rhx git.repo.test without run_in_background', () => {
      then('rhx git.repo.test is allowed', () => {
        const result = runHook({
          tool_name: 'Bash',
          tool_input: { command: 'rhx git.repo.test --what unit' },
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
        expect(result.stderr).toBe('');
      });

      then('rhx git.repo.test with explicit false is allowed', () => {
        const result = runHook({
          tool_name: 'Bash',
          tool_input: {
            command: 'rhx git.repo.test --what unit',
            run_in_background: false,
          },
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
        expect(result.stderr).toBe('');
      });

      then('npx rhachet run --skill git.repo.test is allowed', () => {
        const result = runHook({
          tool_name: 'Bash',
          tool_input: {
            command: 'npx rhachet run --skill git.repo.test --what unit',
          },
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
        expect(result.stderr).toBe('');
      });
    });
  });

  given('[case2] background test execution', () => {
    when('[t0] rhx git.repo.test with run_in_background: true', () => {
      then('rhx git.repo.test is blocked', () => {
        const result = runHook({
          tool_name: 'Bash',
          tool_input: {
            command: 'rhx git.repo.test --what unit',
            run_in_background: true,
          },
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
        expect(result.stderr).toContain('foreground');
      });

      then('rhx git.repo.test --what integration is blocked', () => {
        const result = runHook({
          tool_name: 'Bash',
          tool_input: {
            command: 'rhx git.repo.test --what integration --scope foo',
            run_in_background: true,
          },
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });

      then('npx rhachet run --skill git.repo.test is blocked', () => {
        const result = runHook({
          tool_name: 'Bash',
          tool_input: {
            command: 'npx rhachet run --skill git.repo.test --what unit',
            run_in_background: true,
          },
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });

      then('./node_modules/.bin/rhx git.repo.test is blocked', () => {
        const result = runHook({
          tool_name: 'Bash',
          tool_input: {
            command: './node_modules/.bin/rhx git.repo.test --what unit',
            run_in_background: true,
          },
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });
    });
  });

  given('[case3] other commands in background', () => {
    when('[t0] non-test commands with run_in_background: true', () => {
      then('npm run build is allowed in background', () => {
        const result = runHook({
          tool_name: 'Bash',
          tool_input: {
            command: 'npm run build',
            run_in_background: true,
          },
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
        expect(result.stderr).toBe('');
      });

      then('git status is allowed in background', () => {
        const result = runHook({
          tool_name: 'Bash',
          tool_input: {
            command: 'git status',
            run_in_background: true,
          },
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
        expect(result.stderr).toBe('');
      });

      then('other rhx skills are allowed in background', () => {
        const result = runHook({
          tool_name: 'Bash',
          tool_input: {
            command: 'rhx git.commit.set -m "test"',
            run_in_background: true,
          },
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
        expect(result.stderr).toBe('');
      });
    });
  });

  given('[case4] non-Bash tools', () => {
    when('[t0] other tool types', () => {
      then('Read tool is allowed', () => {
        const result = runHook({
          tool_name: 'Read',
          tool_input: { command: 'rhx git.repo.test' },
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
        expect(result.stderr).toBe('');
      });

      then('Write tool is allowed', () => {
        const result = runHook({
          tool_name: 'Write',
          tool_input: { command: 'rhx git.repo.test' },
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
        expect(result.stderr).toBe('');
      });
    });
  });

  given('[case5] edge cases', () => {
    when('[t0] empty or absent inputs', () => {
      then('empty stdin exits 2', () => {
        const result = spawnSync('bash', [scriptPath], {
          encoding: 'utf-8',
          input: '',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        expect(result.status).toBe(2);
        expect(result.stderr).toContain('ERROR');
      });

      then('empty command exits 0', () => {
        const result = runHook({
          tool_name: 'Bash',
          tool_input: { command: '', run_in_background: true },
        });
        expect(result.exitCode).toBe(0);
      });

      then('absent command field exits 0', () => {
        const result = runHook({
          tool_name: 'Bash',
          tool_input: { run_in_background: true },
        });
        expect(result.exitCode).toBe(0);
      });
    });
  });

  given('[case6] block message content', () => {
    when('[t0] block message is actionable', () => {
      then('block message includes guidance', () => {
        const result = runHook({
          tool_name: 'Bash',
          tool_input: {
            command: 'rhx git.repo.test --what unit',
            run_in_background: true,
          },
        });
        expect(result.stderr).toContain('fix:');
        expect(result.stderr).toContain('run_in_background');
      });

      then('block message matches snapshot', () => {
        const result = runHook({
          tool_name: 'Bash',
          tool_input: {
            command: 'rhx git.repo.test --what unit',
            run_in_background: true,
          },
        });
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });
});
