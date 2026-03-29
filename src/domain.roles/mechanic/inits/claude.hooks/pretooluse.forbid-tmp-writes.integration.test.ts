import { spawnSync } from 'child_process';
import * as path from 'path';
import { given, then, when } from 'test-fns';

/**
 * .what = integration tests for pretooluse.forbid-tmp-writes.sh
 * .why = verify the hook correctly blocks access to /tmp/* except
 *        reads from /tmp/claude*, with correct guidance
 */
describe('pretooluse.forbid-tmp-writes.sh', () => {
  const scriptPath = path.join(__dirname, 'pretooluse.forbid-tmp-writes.sh');

  /**
   * .what = helper to run hook with Write tool input
   */
  const runHookWrite = (
    filePath: string,
  ): { stdout: string; stderr: string; exitCode: number } => {
    const stdinJson = JSON.stringify({
      tool_name: 'Write',
      tool_input: { file_path: filePath, content: 'test content' },
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

  /**
   * .what = helper to run hook with Edit tool input
   */
  const runHookEdit = (
    filePath: string,
  ): { stdout: string; stderr: string; exitCode: number } => {
    const stdinJson = JSON.stringify({
      tool_name: 'Edit',
      tool_input: { file_path: filePath, old_string: 'old', new_string: 'new' },
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

  /**
   * .what = helper to run hook with Read tool input
   */
  const runHookRead = (
    filePath: string,
  ): { stdout: string; stderr: string; exitCode: number } => {
    const stdinJson = JSON.stringify({
      tool_name: 'Read',
      tool_input: { file_path: filePath },
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

  /**
   * .what = helper to run hook with Bash tool input
   */
  const runHookBash = (
    command: string,
  ): { stdout: string; stderr: string; exitCode: number } => {
    const stdinJson = JSON.stringify({
      tool_name: 'Bash',
      tool_input: { command },
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

  // --- Write tool tests ---

  given('[case1] Write tool operations', () => {
    when('[t0] Write to /tmp paths', () => {
      then('Write to /tmp/foo.txt is blocked', () => {
        const result = runHookWrite('/tmp/foo.txt');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });

      then('Write to /tmp/claude-1000/task.out is blocked', () => {
        const result = runHookWrite('/tmp/claude-1000/task.out');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });
    });

    when('[t1] Write to allowed paths', () => {
      then('Write to .temp/foo.txt is allowed', () => {
        const result = runHookWrite('.temp/foo.txt');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
        expect(result.stderr).toBe('');
      });

      then('Write to src/foo.txt is allowed', () => {
        const result = runHookWrite('src/foo.txt');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  // --- Edit tool tests ---

  given('[case2] Edit tool operations', () => {
    when('[t0] Edit to /tmp paths', () => {
      then('Edit to /tmp/foo.txt is blocked', () => {
        const result = runHookEdit('/tmp/foo.txt');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });
    });

    when('[t1] Edit to allowed paths', () => {
      then('Edit to .temp/foo.txt is allowed', () => {
        const result = runHookEdit('.temp/foo.txt');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('Edit to src/foo.txt is allowed', () => {
        const result = runHookEdit('src/foo.txt');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  // --- Bash redirect write tests ---

  given('[case3] Bash redirect writes', () => {
    when('[t0] redirect to /tmp', () => {
      then('echo x > /tmp/foo is blocked', () => {
        const result = runHookBash('echo x > /tmp/foo');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });

      then('echo x >> /tmp/foo is blocked', () => {
        const result = runHookBash('echo x >> /tmp/foo');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });

      then('cat file > /tmp/foo is blocked', () => {
        const result = runHookBash('cat file > /tmp/foo');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });
    });

    when('[t1] redirect to allowed paths', () => {
      then('echo x > .temp/foo is allowed', () => {
        const result = runHookBash('echo x > .temp/foo');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('echo x > src/foo is allowed', () => {
        const result = runHookBash('echo x > src/foo');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  // --- Bash tee write tests ---

  given('[case4] Bash tee writes', () => {
    when('[t0] tee to /tmp', () => {
      then('echo x | tee /tmp/foo is blocked', () => {
        const result = runHookBash('echo x | tee /tmp/foo');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });

      then('echo x | tee -a /tmp/foo is blocked', () => {
        const result = runHookBash('echo x | tee -a /tmp/foo');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });
    });

    when('[t1] tee to allowed paths', () => {
      then('echo x | tee .temp/foo is allowed', () => {
        const result = runHookBash('echo x | tee .temp/foo');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  // --- Bash cp write tests ---

  given('[case5] Bash cp writes', () => {
    when('[t0] cp to /tmp', () => {
      then('cp src/file /tmp/dest is blocked', () => {
        const result = runHookBash('cp src/file /tmp/dest');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });

      then('cp src/file /tmp/claude-1000/dest is blocked', () => {
        const result = runHookBash('cp src/file /tmp/claude-1000/dest');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });
    });

    when('[t1] cp to allowed paths', () => {
      then('cp src/file .temp/dest is allowed', () => {
        const result = runHookBash('cp src/file .temp/dest');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  // --- Bash mv write tests ---

  given('[case6] Bash mv writes', () => {
    when('[t0] mv to /tmp', () => {
      then('mv src/file /tmp/dest is blocked', () => {
        const result = runHookBash('mv src/file /tmp/dest');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });
    });

    when('[t1] mv to allowed paths', () => {
      then('mv src/file .temp/dest is allowed', () => {
        const result = runHookBash('mv src/file .temp/dest');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  // --- Bash read operations ---

  given('[case7] Bash read operations', () => {
    when('[t0] read from /tmp/claude* (should allow)', () => {
      then('cat /tmp/claude-1000/task.out is allowed', () => {
        const result = runHookBash('cat /tmp/claude-1000/task.out');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('head /tmp/claude-1000/task.out is allowed', () => {
        const result = runHookBash('head /tmp/claude-1000/task.out');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('tail /tmp/claude-1000/task.out is allowed', () => {
        const result = runHookBash('tail /tmp/claude-1000/task.out');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });

    when('[t1] read from /tmp/other (should block)', () => {
      then('cat /tmp/other/file is blocked', () => {
        const result = runHookBash('cat /tmp/other/file');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });

      then('grep pattern /tmp/other/file is blocked', () => {
        const result = runHookBash('grep pattern /tmp/other/file');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });

      then('head /tmp/foo.txt is blocked', () => {
        const result = runHookBash('head /tmp/foo.txt');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });
    });
  });

  // --- Path edge cases ---

  given('[case8] path edge cases', () => {
    when('[t0] paths that should not match /tmp/', () => {
      then('Write to /tmpfoo is allowed (not /tmp/)', () => {
        const result = runHookWrite('/tmpfoo');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('Write to /var/tmp/foo is allowed (not /tmp/)', () => {
        const result = runHookWrite('/var/tmp/foo');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });

    when('[t1] bare /tmp paths', () => {
      then('echo x > /tmp is blocked (bare /tmp)', () => {
        const result = runHookBash('echo x > /tmp');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });

      then('echo x > /tmp/ is blocked (with slash)', () => {
        const result = runHookBash('echo x > /tmp/');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });

      then('cp /tmp/a /tmp/b is blocked (dest in /tmp)', () => {
        const result = runHookBash('cp /tmp/a /tmp/b');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });
    });
  });

  // --- Read tool tests ---

  given('[case9] Read tool operations', () => {
    when('[t0] Read from /tmp paths', () => {
      then('Read from /tmp/foo.txt is blocked', () => {
        const result = runHookRead('/tmp/foo.txt');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });

      then('Read from /tmp/other/file is blocked', () => {
        const result = runHookRead('/tmp/other/file');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });
    });

    when('[t1] Read from /tmp/claude* (should allow)', () => {
      then('Read from /tmp/claude-1000/task.out is allowed', () => {
        const result = runHookRead('/tmp/claude-1000/task.out');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('Read from /tmp/claude/session.json is allowed', () => {
        const result = runHookRead('/tmp/claude/session.json');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });

    when('[t2] Read from non-/tmp paths', () => {
      then('Read from .temp/foo.txt is allowed', () => {
        const result = runHookRead('.temp/foo.txt');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('Read from src/foo.txt is allowed', () => {
        const result = runHookRead('src/foo.txt');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  // --- Error cases ---

  given('[case10] error cases', () => {
    when('[t0] empty or absent input', () => {
      then('empty stdin exits 2', () => {
        const result = spawnSync('bash', [scriptPath], {
          encoding: 'utf-8',
          input: '',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        expect(result.status).toBe(2);
      });
    });

    when('[t1] other tools', () => {
      then('Agent tool passthrough (exit 0)', () => {
        const stdinJson = JSON.stringify({
          tool_name: 'Agent',
          tool_input: { prompt: 'test' },
        });
        const result = spawnSync('bash', [scriptPath], {
          encoding: 'utf-8',
          input: stdinJson,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        expect(result.status).toBe(0);
      });
    });
  });

  // --- Guidance message verification ---

  given('[case11] guidance message verification', () => {
    when('[t0] Write to /tmp/foo.txt', () => {
      const result = runHookWrite('/tmp/foo.txt');

      then('stderr contains BLOCKED', () => {
        expect(result.stderr).toContain('BLOCKED');
      });

      then('stderr contains .temp/', () => {
        expect(result.stderr).toContain('.temp/');
      });

      then('stderr contains /tmp is not temporary', () => {
        expect(result.stderr).toContain('/tmp is not temporary');
      });

      then('stderr contains example command', () => {
        expect(result.stderr).toContain('echo');
      });

      then('stdout is empty (guidance to stderr only)', () => {
        expect(result.stdout).toBe('');
      });
    });
  });

  // --- Block message snapshot ---

  given('[case12] block message snapshot', () => {
    when('[t0] Write to /tmp produces expected output', () => {
      then('Write block message matches snapshot', () => {
        const result = runHookWrite('/tmp/foo.txt');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t1] Read from /tmp produces expected output', () => {
      then('Read block message matches snapshot', () => {
        const result = runHookRead('/tmp/foo.txt');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t2] Bash read from /tmp produces expected output', () => {
      then('Bash read block message matches snapshot', () => {
        const result = runHookBash('cat /tmp/other/file');
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });
});
