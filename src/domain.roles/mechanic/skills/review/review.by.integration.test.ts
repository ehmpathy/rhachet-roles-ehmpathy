import { spawnSync } from 'child_process';
import * as path from 'path';
import { given, then, useThen, when } from 'test-fns';

/**
 * .what = acceptance tests for review.by skill
 * .why  = ensure review.by aggregator works correctly:
 *         - accepts --role argument
 *         - accepts --for argument for single rubric
 *         - outputs turtle vibes format
 *         - outputs guard-compatible summary
 */

const SKILL_PATH = path.join(__dirname, 'review.by.sh');

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const runSkill = (args: string[]): RunResult => {
  // encoding is a Node.js api requirement
  const result = spawnSync('bash', [SKILL_PATH, ...args], {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 1,
  };
};

describe('review.by', () => {
  given('[case1] --help flag', () => {
    when('[t0] invoked with --help', () => {
      const result = useThen('help is shown', () => runSkill(['--help']));

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('shows usage', () => {
        expect(result.stdout).toContain('usage');
      });

      then('shows --role option', () => {
        expect(result.stdout).toContain('--role');
      });

      then('shows --for option', () => {
        expect(result.stdout).toContain('--for');
      });

      then('output matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case2] no --role argument', () => {
    when('[t0] invoked without --role', () => {
      const result = useThen('error is returned', () => runSkill([]));

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('shows turtle header', () => {
        expect(result.stdout).toContain('🐢');
      });

      then('shows error about role', () => {
        expect(result.stdout).toContain('--role is required');
      });

      then('output matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case3] invalid role', () => {
    when('[t0] invoked with unknown role', () => {
      const result = useThen('error is returned', () =>
        runSkill(['--role', 'nonexistent']),
      );

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('shows error about role not found', () => {
        expect(result.stdout).toContain('unknown role');
        expect(result.stdout).toContain('valid roles');
      });

      then('output matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case4] valid role with --for invalid rubric', () => {
    when('[t0] invoked with unknown rubric slug', () => {
      const result = useThen('error is returned', () =>
        runSkill(['--role', 'mechanic', '--for', 'nonexistent-rubric']),
      );

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('shows error about rubric not found', () => {
        expect(result.stdout).toContain('rubric not found');
      });

      then('output matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case5] valid role with clean fixture path', () => {
    when('[t0] invoked with mechanic role and clean fixture', () => {
      // runs review against clean fixture file to test success output
      const result = useThen('review completes', () =>
        runSkill([
          '--role',
          'mechanic',
          '--paths',
          'src/domain.roles/mechanic/skills/review/.test/fixture/clean.fixture.ts',
        ]),
      );

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('shows cowabunga header', () => {
        expect(result.stdout).toContain('cowabunga');
      });

      then('output matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case6] valid role without paths', () => {
    when('[t0] invoked with mechanic role but no target paths', () => {
      // verify the shell route works with full bhrain review execution
      const result = useThen('some output is produced', () =>
        runSkill(['--role', 'mechanic']),
      );

      then('shows shell root', () => {
        expect(result.stdout).toContain('🐚');
      });

      then('shows review.by', () => {
        expect(result.stdout).toContain('review.by');
      });

      then('output matches snapshot', () => {
        // .note = output varies with repo state, but snapshot enables:
        //         - vibecheck of success format in PRs
        //         - drift detection when format changes
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });
});
