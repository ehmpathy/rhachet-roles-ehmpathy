import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = integration tests for git.repo.test --against and --env flags
 * .why = verify --against local|cloud and --env requirements for acceptance tests
 */
describe('git.repo.test --against', () => {
  const skillPath = path.join(__dirname, 'git.repo.test.sh');

  // lookup real rhx path BEFORE any tests modify PATH (to avoid mock recursion)
  const realRhxPath = spawnSync('which', ['rhx'], {
    encoding: 'utf-8',
  }).stdout.trim();

  /**
   * .what = run git.repo.test.sh in a temp git repo with --against support
   */
  const runInTempGitRepo = (args: {
    acceptanceCmd?: string;
    acceptanceLocallyCmd?: string;
    unitCmd?: string;
    jestConfigs?: Array<'unit' | 'integration' | 'acceptance'>;
    mockRhxKeyrack?: boolean;
    gitRepoTestArgs: string[];
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'git-repo-test-against', git: true });

    // create mock rhx for keyrack commands (acceptance tests require keyrack)
    let envPath = process.env.PATH ?? '';
    if (args.mockRhxKeyrack) {
      const fakeBinDir = path.join(tempDir, '.fakebin');
      fs.mkdirSync(fakeBinDir, { recursive: true });
      const mockRhx = `#!/bin/bash
# mock rhx for keyrack commands in tests
if [[ "$1" == "keyrack" && "$2" == "unlock" ]]; then
  # extract --env value from args
  env_val="test"
  for arg in "$@"; do
    if [[ "$prev" == "--env" ]]; then
      env_val="$arg"
    fi
    prev="$arg"
  done
  echo "unlocked ehmpath/$env_val"
  exit 0
fi
if [[ "$1" == "keyrack" && "$2" == "source" ]]; then
  # emit no-op env vars (skill expects eval-able output)
  echo "# mock keyrack source"
  exit 0
fi
# pass through to real rhx for other commands (use absolute path to avoid recursion)
exec "${realRhxPath}" "$@"
`;
      fs.writeFileSync(path.join(fakeBinDir, 'rhx'), mockRhx);
      fs.chmodSync(path.join(fakeBinDir, 'rhx'), '755');
      envPath = `${fakeBinDir}:${envPath}`;
    }

    // create package.json with test commands
    const pkgJson = {
      name: 'test-repo',
      scripts: {
        ...(args.unitCmd && { 'test:unit': args.unitCmd }),
        ...(args.acceptanceCmd && {
          'test:acceptance': args.acceptanceCmd,
        }),
        ...(args.acceptanceLocallyCmd && {
          'test:acceptance:locally': args.acceptanceLocallyCmd,
        }),
      },
    };
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(pkgJson, null, 2),
    );

    // create jest config files
    if (args.jestConfigs) {
      for (const configType of args.jestConfigs) {
        const testMatch =
          configType === 'unit' ? '**/*.test.js' : `**/*.${configType}.test.js`;
        const testPathIgnorePatterns =
          configType === 'unit'
            ? `testPathIgnorePatterns: ['.integration.test.js', '.acceptance.test.js'],`
            : '';
        const configContent = `
module.exports = {
  testMatch: ['${testMatch}'],
  ${testPathIgnorePatterns}
  transform: {},
  testEnvironment: 'node',
};
`;
        fs.writeFileSync(
          path.join(tempDir, `jest.${configType}.config.js`),
          configContent,
        );
      }
    }

    // commit all files on main to establish git history
    spawnSync('git', ['add', '.'], { cwd: tempDir });
    spawnSync('git', ['commit', '-m', 'initial'], { cwd: tempDir });

    // run git.repo.test.sh
    const result = spawnSync('bash', [skillPath, ...args.gitRepoTestArgs], {
      cwd: tempDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PATH: envPath,
      },
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      tempDir,
    };
  };

  /**
   * .what = sanitize stdout for snapshot stability
   */
  const sanitizeOutput = (stdout: string): string =>
    stdout
      .replace(/\/tmp\/[^\s]+/g, '/tmp/TEMP_DIR')
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z/g, 'ISOTIME')
      .replace(/\((\d+)s\)/g, '(Xs)')
      .replace(/time: \d+s/g, 'time: Xs');

  given('[case1] --against local with test:acceptance:locally present', () => {
    when('[t0] --what acceptance --against local --env test is run', () => {
      const result = useThen('skill executes', () =>
        runInTempGitRepo({
          acceptanceLocallyCmd: 'echo "acceptance locally passed"',
          jestConfigs: ['acceptance'],
          mockRhxKeyrack: true,
          gitRepoTestArgs: [
            '--what',
            'acceptance',
            '--against',
            'local',
            '--env',
            'test',
            '--mode',
            'apply',
          ],
        }),
      );

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows passed', () => {
        expect(result.stdout).toContain('passed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case1b] --against local --env prep', () => {
    when('[t0] --what acceptance --against local --env prep is run', () => {
      const result = useThen('skill executes', () =>
        runInTempGitRepo({
          acceptanceLocallyCmd: 'echo "acceptance locally passed"',
          jestConfigs: ['acceptance'],
          mockRhxKeyrack: true,
          gitRepoTestArgs: [
            '--what',
            'acceptance',
            '--against',
            'local',
            '--env',
            'prep',
            '--mode',
            'apply',
          ],
        }),
      );

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows keyrack unlocked prep', () => {
        expect(result.stdout).toContain('unlocked ehmpath/prep');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case1c] --against local --env prod', () => {
    when('[t0] --what acceptance --against local --env prod is run', () => {
      const result = useThen('skill executes', () =>
        runInTempGitRepo({
          acceptanceLocallyCmd: 'echo "acceptance locally passed"',
          jestConfigs: ['acceptance'],
          mockRhxKeyrack: true,
          gitRepoTestArgs: [
            '--what',
            'acceptance',
            '--against',
            'local',
            '--env',
            'prod',
            '--mode',
            'apply',
          ],
        }),
      );

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows keyrack unlocked prod', () => {
        expect(result.stdout).toContain('unlocked ehmpath/prod');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case2] --against cloud with test:acceptance present', () => {
    when('[t0] --what acceptance --against cloud --env prep is run', () => {
      const result = useThen('skill executes', () =>
        runInTempGitRepo({
          acceptanceCmd: 'echo "acceptance cloud passed"',
          jestConfigs: ['acceptance'],
          mockRhxKeyrack: true,
          gitRepoTestArgs: [
            '--what',
            'acceptance',
            '--against',
            'cloud',
            '--env',
            'prep',
            '--mode',
            'apply',
          ],
        }),
      );

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows passed', () => {
        expect(result.stdout).toContain('passed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case2b] --against cloud --env prod', () => {
    when('[t0] --what acceptance --against cloud --env prod is run', () => {
      const result = useThen('skill executes', () =>
        runInTempGitRepo({
          acceptanceCmd: 'echo "acceptance cloud passed"',
          jestConfigs: ['acceptance'],
          mockRhxKeyrack: true,
          gitRepoTestArgs: [
            '--what',
            'acceptance',
            '--against',
            'cloud',
            '--env',
            'prod',
            '--mode',
            'apply',
          ],
        }),
      );

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows keyrack unlocked prod', () => {
        expect(result.stdout).toContain('unlocked ehmpath/prod');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case3] --against absent for acceptance test', () => {
    when('[t0] --what acceptance without --against is run', () => {
      const result = useThen('skill executes', () =>
        runInTempGitRepo({
          acceptanceCmd: 'echo "acceptance passed"',
          jestConfigs: ['acceptance'],
          mockRhxKeyrack: true,
          gitRepoTestArgs: ['--what', 'acceptance', '--env', 'prep'],
        }),
      );

      then('exit code is 2 (constraint error)', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output mentions --against required', () => {
        expect(result.stdout).toContain(
          '--against local|cloud required for acceptance',
        );
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case4] --env absent for acceptance test', () => {
    when('[t0] --what acceptance --against local without --env is run', () => {
      const result = useThen('skill executes', () =>
        runInTempGitRepo({
          acceptanceLocallyCmd: 'echo "acceptance locally passed"',
          jestConfigs: ['acceptance'],
          mockRhxKeyrack: true,
          gitRepoTestArgs: ['--what', 'acceptance', '--against', 'local'],
        }),
      );

      then('exit code is 2 (constraint error)', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output mentions --env required', () => {
        expect(result.stdout).toContain(
          '--env test|prep|prod required for acceptance',
        );
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case5] --env test --against cloud is invalid', () => {
    when('[t0] --what acceptance --against cloud --env test is run', () => {
      const result = useThen('skill executes', () =>
        runInTempGitRepo({
          acceptanceCmd: 'echo "acceptance passed"',
          jestConfigs: ['acceptance'],
          mockRhxKeyrack: true,
          gitRepoTestArgs: [
            '--what',
            'acceptance',
            '--against',
            'cloud',
            '--env',
            'test',
          ],
        }),
      );

      then('exit code is 2 (constraint error)', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output mentions test not deployed to cloud', () => {
        expect(result.stdout).toContain('--env test is not deployed to cloud');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case6] --against used with non-acceptance test type', () => {
    when('[t0] --what unit --against local is run', () => {
      const result = useThen('skill executes', () =>
        runInTempGitRepo({
          unitCmd: 'echo "unit passed"',
          jestConfigs: ['unit'],
          gitRepoTestArgs: ['--what', 'unit', '--against', 'local'],
        }),
      );

      then('exit code is 2 (constraint error)', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output shows --against only valid with acceptance', () => {
        expect(result.stdout).toContain(
          '--against only valid with --what acceptance',
        );
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case7] deprecated --locally flag', () => {
    when('[t0] --what acceptance --locally is run', () => {
      const result = useThen('skill executes', () =>
        runInTempGitRepo({
          acceptanceLocallyCmd: 'echo "acceptance locally passed"',
          jestConfigs: ['acceptance'],
          mockRhxKeyrack: true,
          gitRepoTestArgs: ['--what', 'acceptance', '--locally'],
        }),
      );

      then('exit code is 2 (constraint error)', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output shows deprecation message', () => {
        expect(result.stdout).toContain('--locally is deprecated');
      });

      then('output suggests --against instead', () => {
        expect(result.stdout).toContain('use --against local|cloud instead');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case8] invalid --against value', () => {
    when('[t0] --what acceptance --against foo is run', () => {
      const result = useThen('skill executes', () =>
        runInTempGitRepo({
          acceptanceCmd: 'echo "acceptance passed"',
          jestConfigs: ['acceptance'],
          mockRhxKeyrack: true,
          gitRepoTestArgs: [
            '--what',
            'acceptance',
            '--against',
            'foo',
            '--env',
            'prep',
          ],
        }),
      );

      then('exit code is 2 (constraint error)', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output shows invalid --against value', () => {
        expect(result.stdout).toContain("--against must be 'local' or 'cloud'");
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });
});
