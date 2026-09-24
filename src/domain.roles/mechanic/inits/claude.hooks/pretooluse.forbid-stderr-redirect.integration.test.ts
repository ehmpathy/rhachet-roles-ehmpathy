import { spawnSync } from 'child_process';
import * as path from 'path';
import { given, then, useThen, when } from 'test-fns';

/**
 * .what = integration tests for pretooluse.forbid-stderr-redirect.sh
 * .why = `2>&1` merges the two streams, so a failure reads as ordinary output.
 *        the hook refuses it, and these cases pin both directions of that gate.
 *
 * .note = replaces pretooluse.forbid-stderr-redirect.test.sh, whose assertions
 *         are carried forward one for one (rule.require.jest-tests-for-skills)
 */
describe('pretooluse.forbid-stderr-redirect.sh', () => {
  const hookPath = path.join(__dirname, 'pretooluse.forbid-stderr-redirect.sh');

  /**
   * .what = run the hook against a raw stdin payload
   * .why = the empty-stdin case needs a payload that is not valid json, so the
   *        input is a string rather than an object this helper serializes
   */
  const runHook = (input: {
    stdin: string;
  }): { stdout: string; stderr: string; exitCode: number } => {
    const result = spawnSync('bash', [hookPath], {
      encoding: 'utf-8',
      input: input.stdin,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  /**
   * .what = build the stdin payload claude code hands a PreToolUse Bash hook
   * .why = `command` is optional on purpose — an absent key is a distinct case
   *        from an empty one, and both must pass
   */
  const genPayload = (input: { command?: string }): string =>
    JSON.stringify({
      tool_name: 'Bash',
      tool_input: input.command === undefined ? {} : { command: input.command },
    });

  given('[case1] a command that merges stderr into stdout', () => {
    when('[t0] the redirect is the whole tail of the command', () => {
      then('it blocks', () => {
        const result = runHook({ stdin: genPayload({ command: 'ls 2>&1' }) });
        expect(result.exitCode).toEqual(2);
      });
    });

    when('[t1] the redirect feeds a pipe', () => {
      then('it blocks', () => {
        const result = runHook({
          stdin: genPayload({ command: 'cat file.txt 2>&1 | grep foo' }),
        });
        expect(result.exitCode).toEqual(2);
      });
    });

    when('[t2] the redirect precedes a file redirect', () => {
      then('it blocks', () => {
        const result = runHook({
          stdin: genPayload({ command: 'some-cmd 2>&1 > output.txt' }),
        });
        expect(result.exitCode).toEqual(2);
      });
    });

    // .note = the hook is a literal-match test, so a quoted inner redirect
    //         trips it too. that is deliberate over-approximation: the shape
    //         is refused wherever it sits, since a nested one merges alike.
    when('[t3] the redirect sits inside a nested shell', () => {
      then('it blocks', () => {
        const result = runHook({
          stdin: genPayload({ command: "bash -c 'echo test 2>&1'" }),
        });
        expect(result.exitCode).toEqual(2);
      });
    });
  });

  given('[case2] the refusal message', () => {
    when('[t0] a command is refused', () => {
      then('it names the shape and the fix', () => {
        const result = runHook({
          stdin: genPayload({ command: 'npm test 2>&1' }),
        });
        expect(result.stderr).toContain('BLOCKED');
        expect(result.stderr).toContain('stderr redirect');
        expect(result.stderr).toContain('2>&1');
      });

      // .note = one spawn, shared by the two assertions below. each runHook is a
      //         full hook exec (4-25 forks, per the fork-budget suite), so the
      //         same payload run twice is a redundant expensive operation
      //         (rule.forbid.redundant-expensive-operations)
      const refusal = useThen('the hook refuses it', () =>
        runHook({ stdin: genPayload({ command: 'ls 2>&1' }) }),
      );

      then('it goes to stderr alone', () => {
        expect(refusal.stdout).toEqual('');
        expect(refusal.stderr).not.toEqual('');
      });

      then('the whole message matches its snapshot', () => {
        expect(refusal.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case3] a command that keeps the two streams apart', () => {
    when('[t0] it holds no redirect at all', () => {
      then('it passes, and says naught', () => {
        const result = runHook({ stdin: genPayload({ command: 'ls' }) });
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).toEqual('');
        expect(result.stderr).toEqual('');
      });
    });

    when('[t1] it redirects stdout to a file', () => {
      then('it passes', () => {
        const result = runHook({
          stdin: genPayload({ command: 'echo hello > file.txt' }),
        });
        expect(result.exitCode).toEqual(0);
        expect(result.stderr).toEqual('');
      });
    });

    // .note = the two sharpest allows. `2>` is one character short of `2>&1`,
    //         and a pair of separate redirects holds both `>` and `2>`. a hook
    //         that keyed on `2>` alone, or on "two redirects", would refuse
    //         these — so they are the positive controls for the literal test.
    when('[t2] it redirects stderr to its own file', () => {
      then('it passes', () => {
        const result = runHook({
          stdin: genPayload({ command: 'cmd 2> error.log' }),
        });
        expect(result.exitCode).toEqual(0);
        expect(result.stderr).toEqual('');
      });
    });

    when('[t3] it redirects each stream to a separate file', () => {
      then('it passes', () => {
        const result = runHook({
          stdin: genPayload({ command: 'cmd > out.txt 2> err.txt' }),
        });
        expect(result.exitCode).toEqual(0);
        expect(result.stderr).toEqual('');
      });
    });
  });

  given('[case4] a payload with no command to read', () => {
    when('[t0] the command is empty', () => {
      then('it passes', () => {
        const result = runHook({ stdin: genPayload({ command: '' }) });
        expect(result.exitCode).toEqual(0);
      });
    });

    when('[t1] the command key is absent', () => {
      then('it passes', () => {
        const result = runHook({ stdin: genPayload({}) });
        expect(result.exitCode).toEqual(0);
      });
    });

    when('[t2] stdin is empty', () => {
      then('it blocks, and names the cause', () => {
        const result = runHook({ stdin: '' });
        expect(result.exitCode).toEqual(2);
        expect(result.stderr).toContain('stdin');
      });
    });
  });
});
