import { spawnSync } from 'child_process';
import path from 'path';
import { given, then, when } from 'test-fns';

describe('pretooluse.forbid-sedreplace-special-chars.sh', () => {
  const hookPath = path.resolve(
    __dirname,
    'pretooluse.forbid-sedreplace-special-chars.sh',
  );

  const runHook = (input: {
    tool_name: string;
    tool_input: { command?: string };
  }) => {
    const result = spawnSync('bash', [hookPath], {
      input: JSON.stringify(input),
      encoding: 'utf-8',
    });
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      status: result.status,
    };
  };

  given('[case1] sedreplace with special chars in --old', () => {
    when('[t0] curly braces in old pattern', () => {
      then('it should block with guidance', () => {
        const result = runHook({
          tool_name: 'Bash',
          tool_input: {
            command: `rhx sedreplace --old '{ test }' --new 'y' --glob 'src/**/*.ts'`,
          },
        });
        expect(result.status).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
        expect(result.stderr).toContain('@stdin');
      });
    });

    when('[t1] parentheses in old pattern', () => {
      then('it should block with guidance', () => {
        const result = runHook({
          tool_name: 'Bash',
          tool_input: {
            command: `rhx sedreplace --old 'foo(bar)' --new 'y' --glob 'src/**/*.ts'`,
          },
        });
        expect(result.status).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
        expect(result.stderr).toContain('@stdin');
      });
    });

    when('[t2] square brackets in old pattern', () => {
      then('it should block with guidance', () => {
        const result = runHook({
          tool_name: 'Bash',
          tool_input: {
            command: `rhx sedreplace --old 'arr[0]' --new 'y' --glob 'src/**/*.ts'`,
          },
        });
        expect(result.status).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
        expect(result.stderr).toContain('@stdin');
      });
    });
  });

  given('[case2] sedreplace with special chars in --new', () => {
    when('[t0] curly braces in new pattern', () => {
      then('it should block with guidance', () => {
        const result = runHook({
          tool_name: 'Bash',
          tool_input: {
            command: `rhx sedreplace --old 'x' --new '{ y }' --glob 'src/**/*.ts'`,
          },
        });
        expect(result.status).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
        expect(result.stderr).toContain('@stdin');
      });
    });
  });

  given('[case3] sedreplace without special chars', () => {
    when('[t0] simple pattern', () => {
      then('it should allow', () => {
        const result = runHook({
          tool_name: 'Bash',
          tool_input: {
            command: `rhx sedreplace --old 'oldName' --new 'newName' --glob 'src/**/*.ts'`,
          },
        });
        expect(result.status).toBe(0);
        expect(result.stderr).toBe('');
      });
    });
  });

  given('[case4] sedreplace with @stdin pattern', () => {
    when('[t0] @stdin in old', () => {
      then('it should allow (already the solution)', () => {
        const result = runHook({
          tool_name: 'Bash',
          tool_input: {
            command: `echo '{ x }' | rhx sedreplace --old @stdin --new 'y' --glob 'src/**/*.ts'`,
          },
        });
        expect(result.status).toBe(0);
        expect(result.stderr).toBe('');
      });
    });
  });

  given('[case5] non-sedreplace commands', () => {
    when('[t0] different command with special chars', () => {
      then('it should allow (not sedreplace)', () => {
        const result = runHook({
          tool_name: 'Bash',
          tool_input: {
            command: `echo '{ test }'`,
          },
        });
        expect(result.status).toBe(0);
        expect(result.stderr).toBe('');
      });
    });
  });

  given('[case6] non-Bash tools', () => {
    when('[t0] Write tool', () => {
      then('it should allow (not Bash)', () => {
        const result = runHook({
          tool_name: 'Write',
          tool_input: {
            command: `rhx sedreplace --old '{ x }' --new 'y'`,
          },
        });
        expect(result.status).toBe(0);
        expect(result.stderr).toBe('');
      });
    });
  });
});
