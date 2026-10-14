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
        expect(result.stderr).toContain('✋ ConstraintError:');
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
        expect(result.stderr).toContain('✋ ConstraintError:');
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
        expect(result.stderr).toContain('✋ ConstraintError:');
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
        expect(result.stderr).toContain('✋ ConstraintError:');
        expect(result.stderr).toContain('@stdin');
      });
    });
  });

  given('[case7] the suggested command must run as printed', () => {
    // .note = the guard once wrapped each pattern in single quotes with no escape, and joined
    //         two patterns with `\n`; a pattern that held a `'` broke the suggestion mid-word
    /**
     * .what = the suggested command line, from the guard's stderr
     */
    const asSuggestion = (input: { stderr: string }): string =>
      input.stderr
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.includes('| rhx sedreplace')) ?? '';

    /**
     * .what = run the producer half of the suggestion (the part before `| rhx`), return its bytes
     */
    const runProducer = (input: { suggestion: string }): string =>
      spawnSync(
        'bash',
        ['-c', input.suggestion.split(' | rhx sedreplace')[0] ?? ''],
        {
          encoding: 'utf-8',
        },
      ).stdout;

    when('[t0] both patterns hold a single quote and a paren', () => {
      const result = runHook({
        tool_name: 'Bash',
        tool_input: {
          command: `rhx sedreplace --old "toContain('✋ ConstraintError:')" --new "toContain('ConstraintError')" --glob 'src/**/*.ts'`,
        },
      });
      const suggestion = asSuggestion({ stderr: result.stderr });

      then('it blocks, and the suggestion parses as bash', () => {
        expect(result.status).toBe(2);
        expect(suggestion).not.toBe('');
        expect(spawnSync('bash', ['-n', '-c', suggestion]).status).toBe(0);
      });

      then('the producer emits both patterns, split by a NUL byte', () => {
        expect(runProducer({ suggestion })).toBe(
          "toContain('✋ ConstraintError:')\0toContain('ConstraintError')",
        );
      });

      then('the glob the bot chose is carried over', () => {
        expect(suggestion).toContain("--glob 'src/**/*.ts'");
      });
    });

    when('[t1] only the old pattern holds a single quote and a paren', () => {
      const result = runHook({
        tool_name: 'Bash',
        tool_input: {
          command: `rhx sedreplace --old "wave('pipeline')" --new 'swell' --glob 'src/**/*.ts'`,
        },
      });
      const suggestion = asSuggestion({ stderr: result.stderr });

      then(
        'the producer emits the old pattern exactly, with no trailed newline',
        () => {
          expect(result.status).toBe(2);
          expect(spawnSync('bash', ['-n', '-c', suggestion]).status).toBe(0);
          expect(runProducer({ suggestion })).toBe("wave('pipeline')");
          expect(suggestion).toContain("--new 'swell'");
        },
      );
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

  given('[case8] a PreToolUse payload jq cannot parse', () => {
    // 🔴 `|| echo ""` once read a parse failure as "not a Bash call" and permitted it
    when('[t0] the payload is not json', () => {
      then("the hook blocks, and names the class and jq's cause", () => {
        const result = spawnSync('bash', [hookPath], {
          input: `{ "tool_name": "Bash", "tool_input": { "command": "rhx sedreplace --old '{ x }'" `,
          encoding: 'utf-8',
        });
        expect(result.status).toBe(2);
        // jq 1.6/1.7 lead the cause with `jq: `; later builds drop it
        expect(result.stderr).toMatch(
          /💥 MalfunctionError: PreToolUse payload is not valid json \((jq: )?(parse )?error/,
        );
      });
    });
  });
});
