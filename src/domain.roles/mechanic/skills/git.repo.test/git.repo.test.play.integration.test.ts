import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = journey tests for git.repo.test skill
 * .why  = verifies all test types, flags, and edge cases work correctly
 */
describe('git.repo.test', () => {
  const skillPath = path.join(__dirname, 'git.repo.test.sh');

  /**
   * .what = run git.repo.test skill in a temp directory
   */
  const runGitRepoTest = (args: {
    tempDir: string;
    gitRepoTestArgs: string[];
    env?: NodeJS.ProcessEnv;
  }): { stdout: string; stderr: string; exitCode: number } => {
    const result = spawnSync('bash', [skillPath, ...args.gitRepoTestArgs], {
      cwd: args.tempDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: args.env ?? process.env,
      timeout: 60_000, // 60s timeout to prevent indefinite hangs
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  /**
   * .what = create a fixture repo with test infrastructure
   */
  const setupFixture = (config: {
    packageJson: object;
    jestConfig?: string;
    jestConfigs?: Array<'unit' | 'integration' | 'acceptance'>;
    testFiles?: Record<string, string>;
    mockKeyrack?: boolean;
    mockKeyrackFail?: boolean;
    mockNpm?: { exitCode: number; stdout?: string; stderr?: string };
  }): { tempDir: string; env: NodeJS.ProcessEnv } => {
    const tempDir = genTempDir({ slug: 'git-repo-test', git: true });

    // write package.json
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(config.packageJson, null, 2),
    );

    // write jest.config.js if provided (legacy)
    if (config.jestConfig) {
      fs.writeFileSync(path.join(tempDir, 'jest.config.js'), config.jestConfig);
    }

    // write jest.{type}.config.ts files (required by skill validation)
    if (config.jestConfigs) {
      for (const configType of config.jestConfigs) {
        fs.writeFileSync(
          path.join(tempDir, `jest.${configType}.config.ts`),
          `module.exports = { testMatch: ['**/*.${configType}.test.ts'] };`,
        );
      }
    }

    // write test files if provided
    if (config.testFiles) {
      for (const [filePath, content] of Object.entries(config.testFiles)) {
        const fullPath = path.join(tempDir, filePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
      }
    }

    let env = { ...process.env };

    // lookup real rhx path BEFORE modifying PATH (to avoid mock finding itself)
    const realRhxPath = spawnSync('which', ['rhx'], {
      encoding: 'utf-8',
    }).stdout.trim();

    // mock keyrack for hermetic tests
    if (config.mockKeyrack) {
      const fakeBinDir = path.join(tempDir, '.fakebin');
      fs.mkdirSync(fakeBinDir, { recursive: true });
      fs.writeFileSync(
        path.join(fakeBinDir, 'rhx'),
        `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "unlock" ]]; then
  echo "unlocked ehmpath/test"
  exit 0
fi
if [[ "$1" == "keyrack" && "$2" == "source" ]]; then
  # emit no-op env vars (skill expects eval-able output)
  echo "# mock keyrack source"
  exit 0
fi
# pass through to real rhx for other commands (use absolute path to avoid recursion)
exec "${realRhxPath}" "$@"
`,
      );
      fs.chmodSync(path.join(fakeBinDir, 'rhx'), '755');
      env = { ...env, PATH: `${fakeBinDir}:${process.env.PATH}` };
    }

    // mock keyrack to fail for error path tests
    if (config.mockKeyrackFail) {
      const fakeBinDir = path.join(tempDir, '.fakebin');
      fs.mkdirSync(fakeBinDir, { recursive: true });
      fs.writeFileSync(
        path.join(fakeBinDir, 'rhx'),
        `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "unlock" ]]; then
  echo "keyrack unlock failed: vault locked" >&2
  exit 1
fi
if [[ "$1" == "keyrack" && "$2" == "source" ]]; then
  # emit no-op env vars (skill expects eval-able output)
  echo "# mock keyrack source"
  exit 0
fi
# pass through to real rhx for other commands (use absolute path to avoid recursion)
exec "${realRhxPath}" "$@"
`,
      );
      fs.chmodSync(path.join(fakeBinDir, 'rhx'), '755');
      env = { ...env, PATH: `${fakeBinDir}:${process.env.PATH}` };
    }

    // mock npm for controlled test output
    if (config.mockNpm) {
      const fakeBinDir = path.join(tempDir, '.fakebin');
      fs.mkdirSync(fakeBinDir, { recursive: true });

      const npmStdout = config.mockNpm.stdout ?? '';
      const npmStderr = config.mockNpm.stderr ?? '';
      const npmExitCode = config.mockNpm.exitCode;

      fs.writeFileSync(
        path.join(fakeBinDir, 'npm'),
        `#!/bin/bash
echo "${npmStdout.replace(/"/g, '\\"')}"
echo "${npmStderr.replace(/"/g, '\\"')}" >&2
exit ${npmExitCode}
`,
      );
      fs.chmodSync(path.join(fakeBinDir, 'npm'), '755');
      env = { ...env, PATH: `${fakeBinDir}:${process.env.PATH}` };
    }

    return { tempDir, env };
  };

  /**
   * .what = sanitize output for stable snapshots
   */
  const sanitizeOutput = (output: string): string => {
    return (
      output
        // sanitize timestamps: 2026-04-08T14-23-01Z -> TIMESTAMP
        .replace(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z/g, 'TIMESTAMP')
        // sanitize temp paths
        .replace(/\/tmp\/[^/\s]+/g, '/tmp/TEMP')
        // sanitize time values: 1.234s -> X.XXXs
        .replace(/\d+\.\d+s/g, 'X.XXXs')
    );
  };

  // ######################################################################
  // journey 1: unit tests pass
  // ######################################################################
  given('[case1] repo with tests that pass', () => {
    when('[t0] --what unit is called', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:unit': 'echo "run tests" && exit 0',
            },
          },
          jestConfigs: ['unit'],
          mockNpm: {
            exitCode: 0,
            stdout: '> test-repo@1.0.0 test:unit',
            stderr: `PASS src/example.test.ts
Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Snapshots:   0 total
Time:        0.5 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'unit'],
          env,
        });
      });

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows lets ride header', () => {
        expect(result.stdout).toContain('lets ride');
      });

      then('output shows passed status', () => {
        expect(result.stdout).toContain('🎉 passed');
      });

      then('output shows stats', () => {
        expect(result.stdout).toContain('suites:');
        expect(result.stdout).toContain('tests:');
        expect(result.stdout).toContain('time:');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  // ######################################################################
  // journey 2: unit tests fail
  // ######################################################################
  given('[case2] repo with tests that fail', () => {
    when('[t0] --what unit is called', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:unit': 'jest',
            },
          },
          jestConfigs: ['unit'],
          mockNpm: {
            exitCode: 1,
            stdout: '> test-repo@1.0.0 test:unit',
            stderr: `FAIL src/example.test.ts
  ● Test suite failed to run

Test Suites: 1 failed, 1 total
Tests:       0 passed, 1 failed, 1 total
Snapshots:   0 total
Time:        0.3 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'unit'],
          env,
        });
      });

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output shows bummer dude', () => {
        expect(result.stderr).toContain('bummer dude...');
      });

      then('output shows failed status', () => {
        expect(result.stderr).toContain('✋ failed');
      });

      then('output shows tip', () => {
        expect(result.stderr).toContain('tip:');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  // ######################################################################
  // journey 3: scoped tests
  // ######################################################################
  given('[case3] repo with multiple test files', () => {
    when('[t0] --what unit --scope is called', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:unit': 'jest',
            },
          },
          jestConfigs: ['unit'],
          testFiles: {
            'src/user.unit.test.ts': `test('user works', () => expect(true).toBe(true));`,
            'src/product.unit.test.ts': `test('product works', () => expect(true).toBe(true));`,
          },
          mockNpm: {
            exitCode: 0,
            stdout: '> test-repo@1.0.0 test:unit',
            stderr: `PASS src/user.unit.test.ts
Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
Snapshots:   0 total
Time:        0.2 s
Ran all test suites matched user.`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'unit', '--scope', 'user'],
          env,
        });
      });

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows passed', () => {
        expect(result.stdout).toContain('🎉 passed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  // ######################################################################
  // journey 4: resnap mode
  // ######################################################################
  given('[case4] repo with snapshot to update', () => {
    when('[t0] --what unit --resnap is called', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:unit':
                'echo "RESNAP=$RESNAP" && [ "$RESNAP" = "true" ] && exit 0',
            },
          },
          jestConfigs: ['unit'],
          mockNpm: {
            exitCode: 0,
            stdout: 'RESNAP=true',
            stderr: `PASS src/example.test.ts
Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   1 updated, 1 total
Time:        0.3 s`,
          },
        });
        // set RESNAP in env to simulate the skill set
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'unit', '--resnap'],
          env: { ...env, RESNAP: 'true' },
        });
      });

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows passed', () => {
        expect(result.stdout).toContain('🎉 passed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] --what unit --resnap fails', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:unit': 'jest',
            },
          },
          jestConfigs: ['unit'],
          mockNpm: {
            exitCode: 1,
            stdout: 'RESNAP=true',
            stderr: `FAIL src/example.test.ts
  ● snapshot test › should match

    expect(received).toMatchSnapshot()

    Snapshot name: \`snapshot test should match 1\`

    - Snapshot  - 1
    + Received  + 1

    - "expected"
    + "actual"

Test Suites: 1 failed, 1 total
Tests:       0 passed, 1 failed, 1 total
Snapshots:   1 failed, 1 total
Time:        0.4 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'unit', '--resnap'],
          env: { ...env, RESNAP: 'true' },
        });
      });

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output shows failed', () => {
        expect(result.stderr).toContain('failed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] --what integration --resnap is called', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:integration': 'jest --config jest.integration.config.js',
            },
          },
          jestConfigs: ['integration'],
          mockKeyrack: true,
          mockNpm: {
            exitCode: 0,
            stdout: 'RESNAP=true',
            stderr: `PASS src/api.integration.test.ts
Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
Snapshots:   3 updated, 3 total
Time:        1.2 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'integration', '--resnap'],
          env: { ...env, RESNAP: 'true' },
        });
      });

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows passed', () => {
        expect(result.stdout).toContain('🎉 passed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] --what integration --resnap fails', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:integration': 'jest --config jest.integration.config.js',
            },
          },
          jestConfigs: ['integration'],
          mockKeyrack: true,
          mockNpm: {
            exitCode: 1,
            stdout: 'RESNAP=true',
            stderr: `FAIL src/api.integration.test.ts
  ● API snapshot › should match response

    expect(received).toMatchSnapshot()

    - Snapshot  - 1
    + Received  + 1

    - {"status": 200}
    + {"status": 500}

Test Suites: 1 failed, 1 total
Tests:       1 failed, 1 total
Snapshots:   1 failed, 1 total
Time:        1.5 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'integration', '--resnap'],
          env: { ...env, RESNAP: 'true' },
        });
      });

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output shows failed', () => {
        expect(result.stderr).toContain('failed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t4] --what acceptance --resnap is called', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:acceptance': 'jest --config jest.acceptance.config.js',
            },
          },
          jestConfigs: ['acceptance'],
          mockKeyrack: true,
          mockNpm: {
            exitCode: 0,
            stdout: 'RESNAP=true',
            stderr: `PASS src/e2e.acceptance.test.ts
Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Snapshots:   2 updated, 2 total
Time:        2.5 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'acceptance', '--resnap'],
          env: { ...env, RESNAP: 'true' },
        });
      });

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows passed', () => {
        expect(result.stdout).toContain('🎉 passed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t5] --what acceptance --resnap fails', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:acceptance': 'jest --config jest.acceptance.config.js',
            },
          },
          jestConfigs: ['acceptance'],
          mockKeyrack: true,
          mockNpm: {
            exitCode: 1,
            stdout: 'RESNAP=true',
            stderr: `FAIL src/e2e.acceptance.test.ts
  ● E2E snapshot › should match page content

    expect(received).toMatchSnapshot()

    - Snapshot  - 1
    + Received  + 1

    - "Welcome to our site"
    + "Error: Page not found"

Test Suites: 1 failed, 1 total
Tests:       1 failed, 1 total
Snapshots:   1 failed, 1 total
Time:        3.1 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'acceptance', '--resnap'],
          env: { ...env, RESNAP: 'true' },
        });
      });

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output shows failed', () => {
        expect(result.stderr).toContain('failed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  // ######################################################################
  // journey 5: integration with keyrack (mocked)
  // ######################################################################
  given('[case5] repo with integration tests', () => {
    when('[t0] --what integration is called', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:integration': 'jest --config jest.integration.config.js',
            },
          },
          jestConfigs: ['integration'],
          mockKeyrack: true,
          mockNpm: {
            exitCode: 0,
            stdout: '> test-repo@1.0.0 test:integration',
            stderr: `PASS src/api.integration.test.ts
Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Snapshots:   0 total
Time:        2.1 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'integration'],
          env,
        });
      });

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows keyrack unlock', () => {
        expect(result.stdout).toContain('keyrack:');
      });

      then('output shows passed', () => {
        expect(result.stdout).toContain('🎉 passed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] --what integration fails', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:integration': 'jest --config jest.integration.config.js',
            },
          },
          jestConfigs: ['integration'],
          mockKeyrack: true,
          mockNpm: {
            exitCode: 1,
            stdout: '> test-repo@1.0.0 test:integration',
            stderr: `FAIL src/api.integration.test.ts
  ● API tests › should connect to database

    Connection refused

Test Suites: 1 failed, 1 total
Tests:       0 passed, 1 failed, 1 total
Snapshots:   0 total
Time:        1.8 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'integration'],
          env,
        });
      });

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output shows failed', () => {
        expect(result.stderr).toContain('failed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] --what integration keyrack unlock fails', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:integration': 'jest --config jest.integration.config.js',
            },
          },
          jestConfigs: ['integration'],
          mockKeyrackFail: true,
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'integration'],
          env,
        });
      });

      then('exit code is 1 (keyrack exit code pass-through)', () => {
        expect(result.exitCode).toBe(1);
      });

      then('output shows keyrack error', () => {
        expect(result.stderr).toMatch(/keyrack|unlock|failed|vault/i);
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  // ######################################################################
  // journey 6: no tests match scope
  // ######################################################################
  given('[case6] repo with no matched tests', () => {
    when('[t0] --what unit --scope with no matches is called', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:unit': 'jest',
            },
          },
          jestConfigs: ['unit'],
          mockNpm: {
            exitCode: 1,
            stdout: '',
            stderr: `No tests found, exit with code 1
Run with \`--passWithNoTests\` to exit with code 0
No tests found related to files changed since last commit.`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'unit', '--scope', 'nonexistent'],
          env,
        });
      });

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output shows constraint error', () => {
        expect(result.stderr).toContain('constraint');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  // ######################################################################
  // journey 7: absent command
  // ######################################################################
  given('[case7] repo without test command', () => {
    when('[t0] --what unit is called', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              build: 'tsc',
              // no test:unit command
            },
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'unit'],
          env,
        });
      });

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output shows constraint error', () => {
        expect(result.stderr).toContain('constraint');
      });

      then('output shows hint about test command', () => {
        expect(result.stderr).toContain('test:unit');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  // ######################################################################
  // journey 8: passthrough args
  // ######################################################################
  given('[case8] repo with tests that need extra args', () => {
    when('[t0] --what unit -- --verbose is called', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:unit': 'jest',
            },
          },
          jestConfigs: ['unit'],
          mockNpm: {
            exitCode: 0,
            stdout: '> test-repo@1.0.0 test:unit -- --verbose',
            stderr: `PASS src/example.test.ts
  example test
    ✓ should pass (1 ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        0.2 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'unit', '--', '--verbose'],
          env,
        });
      });

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows passed', () => {
        expect(result.stdout).toContain('🎉 passed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  // ######################################################################
  // journey 9: lint ignores scope/resnap flags
  // ######################################################################
  given('[case9] repo with lint command', () => {
    when('[t0] --what lint --scope --resnap is called', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:lint': 'eslint .',
            },
          },
          mockNpm: {
            exitCode: 0,
            stdout: '> test-repo@1.0.0 test:lint',
            stderr: '',
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'lint', '--scope', 'src', '--resnap'],
          env,
        });
      });

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows passed', () => {
        expect(result.stdout).toContain('🎉 passed');
      });

      then('output does not show stats', () => {
        // lint should not show jest stats
        expect(result.stderr).not.toContain('suites:');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] --what lint fails', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:lint': 'eslint .',
            },
          },
          mockNpm: {
            exitCode: 1,
            stdout: '> test-repo@1.0.0 test:lint',
            stderr: `
/src/index.ts
  1:1  error  Unexpected console statement  no-console
  5:3  error  'unused' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'lint'],
          env,
        });
      });

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output shows failed', () => {
        expect(result.stderr).toContain('failed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  // ######################################################################
  // journey 10: acceptance tests (with keyrack)
  // ######################################################################
  given('[case10] repo with acceptance tests', () => {
    when('[t0] --what acceptance is called', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:acceptance': 'jest --config=jest.acceptance.config.js',
            },
          },
          jestConfigs: ['acceptance'],
          mockKeyrack: true,
          mockNpm: {
            exitCode: 0,
            stdout: '> test-repo@1.0.0 test:acceptance',
            stderr: `PASS src/example.acceptance.test.ts
Test Suites: 2 passed, 2 total
Tests:       8 passed, 8 total
Snapshots:   0 total
Time:        4.5 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'acceptance'],
          env,
        });
      });

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows keyrack unlock', () => {
        expect(result.stdout).toContain('keyrack: unlocked ehmpath/test');
      });

      then('output shows passed', () => {
        expect(result.stdout).toContain('🎉 passed');
      });

      then('output shows stats', () => {
        expect(result.stdout).toContain('suites:');
        expect(result.stdout).toContain('tests:');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] --what acceptance fails', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:acceptance': 'jest --config=jest.acceptance.config.js',
            },
          },
          jestConfigs: ['acceptance'],
          mockKeyrack: true,
          mockNpm: {
            exitCode: 1,
            stdout: '> test-repo@1.0.0 test:acceptance',
            stderr: `FAIL src/e2e.acceptance.test.ts
  ● E2E tests › should complete checkout flow

    Timeout - Async callback was not invoked within 30000 ms

Test Suites: 1 failed, 1 total
Tests:       0 passed, 1 failed, 1 total
Snapshots:   0 total
Time:        32.1 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'acceptance'],
          env,
        });
      });

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output shows failed', () => {
        expect(result.stderr).toContain('failed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] --what acceptance keyrack unlock fails', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:acceptance': 'jest --config=jest.acceptance.config.js',
            },
          },
          jestConfigs: ['acceptance'],
          mockKeyrackFail: true,
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'acceptance'],
          env,
        });
      });

      then('exit code is 1 (keyrack exit code pass-through)', () => {
        expect(result.exitCode).toBe(1);
      });

      then('output shows keyrack error', () => {
        expect(result.stderr).toMatch(/keyrack|unlock|failed|vault/i);
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t3] --what acceptance --scope is called', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:acceptance': 'jest --config=jest.acceptance.config.js',
            },
          },
          jestConfigs: ['acceptance'],
          testFiles: {
            'src/checkout.acceptance.test.ts': `test('checkout works', () => expect(true).toBe(true));`,
            'src/login.acceptance.test.ts': `test('login works', () => expect(true).toBe(true));`,
          },
          mockKeyrack: true,
          mockNpm: {
            exitCode: 0,
            stdout: '> test-repo@1.0.0 test:acceptance',
            stderr: `PASS src/checkout.acceptance.test.ts
Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        2.3 s
Ran all test suites matched checkout.`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'acceptance', '--scope', 'checkout'],
          env,
        });
      });

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows passed', () => {
        expect(result.stdout).toContain('🎉 passed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  // ######################################################################
  // journey 11: --what all runs all test types
  // ######################################################################
  given('[case11] repo with all test commands', () => {
    when('[t0] --what all is called and all pass', () => {
      const result = useThen('skill executes', () => {
        const tempDir = genTempDir({ slug: 'git-repo-test', git: true });

        fs.writeFileSync(
          path.join(tempDir, 'package.json'),
          JSON.stringify(
            {
              name: 'test-repo',
              scripts: {
                'test:lint': 'eslint .',
                'test:unit': 'jest --config=jest.unit.config.js',
                'test:integration': 'jest --config=jest.integration.config.js',
                'test:acceptance': 'jest --config=jest.acceptance.config.js',
              },
            },
            null,
            2,
          ),
        );

        // create jest config files (required by skill validation)
        for (const configType of ['unit', 'integration', 'acceptance']) {
          fs.writeFileSync(
            path.join(tempDir, `jest.${configType}.config.ts`),
            `module.exports = { testMatch: ['**/*.${configType}.test.ts'] };`,
          );
        }

        // create mock npm that tracks calls and returns success for all
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });

        fs.writeFileSync(
          path.join(fakeBinDir, 'npm'),
          `#!/bin/bash
# track which test type was called
if [[ "$*" == *"test:lint"* ]]; then
  echo "lint passed" >&2
  exit 0
elif [[ "$*" == *"test:unit"* ]]; then
  echo "Test Suites: 3 passed, 3 total
Tests: 10 passed, 10 total
Time: 1.5 s" >&2
  exit 0
elif [[ "$*" == *"test:integration"* ]]; then
  echo "Test Suites: 2 passed, 2 total
Tests: 5 passed, 5 total
Time: 3.0 s" >&2
  exit 0
elif [[ "$*" == *"test:acceptance"* ]]; then
  echo "Test Suites: 1 passed, 1 total
Tests: 2 passed, 2 total
Time: 2.0 s" >&2
  exit 0
fi
exit 1
`,
        );
        fs.chmodSync(path.join(fakeBinDir, 'npm'), '755');

        // mock keyrack
        fs.writeFileSync(
          path.join(fakeBinDir, 'rhx'),
          `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "unlock" ]]; then
  echo "unlocked ehmpath/test"
  exit 0
fi
exec "$(which rhx)" "$@"
`,
        );
        fs.chmodSync(path.join(fakeBinDir, 'rhx'), '755');

        const env = {
          ...process.env,
          PATH: `${fakeBinDir}:${process.env.PATH}`,
        };

        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'all'],
          env,
        });
      });

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows lets ride header (multi-mode)', () => {
        // multi-mode shows "lets ride..." header, individual types show "passed"
        expect(result.stdout).toContain('lets ride...');
      });

      then('output shows all test types completed', () => {
        // each test type has its own shell header in multi-mode
        expect(result.stdout).toContain('--what lint');
        expect(result.stdout).toContain('--what unit');
        expect(result.stdout).toContain('--what integration');
        expect(result.stdout).toContain('--what acceptance');
        // all should show passed (emoji varies: 🎉)
        expect(result.stdout).toMatch(/passed/);
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] --what all is called and lint fails', () => {
      const result = useThen('skill executes', () => {
        const tempDir = genTempDir({ slug: 'git-repo-test', git: true });

        fs.writeFileSync(
          path.join(tempDir, 'package.json'),
          JSON.stringify(
            {
              name: 'test-repo',
              scripts: {
                'test:lint': 'eslint .',
                'test:unit': 'jest --config=jest.unit.config.js',
                'test:integration': 'jest --config=jest.integration.config.js',
                'test:acceptance': 'jest --config=jest.acceptance.config.js',
              },
            },
            null,
            2,
          ),
        );

        // create jest config files (required by skill validation)
        for (const configType of ['unit', 'integration', 'acceptance']) {
          fs.writeFileSync(
            path.join(tempDir, `jest.${configType}.config.ts`),
            `module.exports = { testMatch: ['**/*.${configType}.test.ts'] };`,
          );
        }

        // mock npm: lint fails
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });

        fs.writeFileSync(
          path.join(fakeBinDir, 'npm'),
          `#!/bin/bash
if [[ "$*" == *"test:lint"* ]]; then
  echo "5 problems (3 errors, 2 warnings)" >&2
  exit 1
fi
exit 0
`,
        );
        fs.chmodSync(path.join(fakeBinDir, 'npm'), '755');

        const env = {
          ...process.env,
          PATH: `${fakeBinDir}:${process.env.PATH}`,
        };

        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'all'],
          env,
        });
      });

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output shows lint failed', () => {
        // lint shell header should be in output
        expect(result.stderr).toContain('--what lint');
        // and it should show failed (emoji varies: ✋)
        expect(result.stderr).toMatch(/failed/);
      });

      then('output does not show unit or other types', () => {
        // fail-fast: should not run subsequent types
        expect(result.stderr).not.toContain('--what unit');
        expect(result.stderr).not.toContain('--what integration');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] --what all unit fails (after lint passes)', () => {
      const result = useThen('skill executes', () => {
        const tempDir = genTempDir({ slug: 'git-repo-test', git: true });

        fs.writeFileSync(
          path.join(tempDir, 'package.json'),
          JSON.stringify(
            {
              name: 'test-repo',
              scripts: {
                'test:lint': 'eslint .',
                'test:unit': 'jest --config=jest.unit.config.js',
                'test:integration': 'jest --config=jest.integration.config.js',
                'test:acceptance': 'jest --config=jest.acceptance.config.js',
              },
            },
            null,
            2,
          ),
        );

        for (const configType of ['unit', 'integration', 'acceptance']) {
          fs.writeFileSync(
            path.join(tempDir, `jest.${configType}.config.ts`),
            `module.exports = { testMatch: ['**/*.${configType}.test.ts'] };`,
          );
        }

        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });

        fs.writeFileSync(
          path.join(fakeBinDir, 'npm'),
          `#!/bin/bash
if [[ "$*" == *"test:lint"* ]]; then
  exit 0
elif [[ "$*" == *"test:unit"* ]]; then
  echo "Test Suites: 1 failed, 1 total" >&2
  exit 1
fi
exit 0
`,
        );
        fs.chmodSync(path.join(fakeBinDir, 'npm'), '755');

        fs.writeFileSync(
          path.join(fakeBinDir, 'rhx'),
          `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "unlock" ]]; then
  echo "unlocked ehmpath/test"
  exit 0
fi
exec "$(which rhx)" "$@"
`,
        );
        fs.chmodSync(path.join(fakeBinDir, 'rhx'), '755');

        const env = {
          ...process.env,
          PATH: `${fakeBinDir}:${process.env.PATH}`,
        };

        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'all'],
          env,
        });
      });

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output shows unit failed', () => {
        expect(result.stderr).toContain('--what unit');
        expect(result.stderr).toMatch(/failed/);
      });

      then('output does not show integration or acceptance', () => {
        expect(result.stderr).not.toContain('--what integration');
        expect(result.stderr).not.toContain('--what acceptance');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t3] --what all integration fails (after lint+unit pass)', () => {
      const result = useThen('skill executes', () => {
        const tempDir = genTempDir({ slug: 'git-repo-test', git: true });

        fs.writeFileSync(
          path.join(tempDir, 'package.json'),
          JSON.stringify(
            {
              name: 'test-repo',
              scripts: {
                'test:lint': 'eslint .',
                'test:unit': 'jest --config=jest.unit.config.js',
                'test:integration': 'jest --config=jest.integration.config.js',
                'test:acceptance': 'jest --config=jest.acceptance.config.js',
              },
            },
            null,
            2,
          ),
        );

        for (const configType of ['unit', 'integration', 'acceptance']) {
          fs.writeFileSync(
            path.join(tempDir, `jest.${configType}.config.ts`),
            `module.exports = { testMatch: ['**/*.${configType}.test.ts'] };`,
          );
        }

        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });

        fs.writeFileSync(
          path.join(fakeBinDir, 'npm'),
          `#!/bin/bash
if [[ "$*" == *"test:lint"* ]]; then
  exit 0
elif [[ "$*" == *"test:unit"* ]]; then
  echo "Test Suites: 1 passed, 1 total" >&2
  exit 0
elif [[ "$*" == *"test:integration"* ]]; then
  echo "Test Suites: 1 failed, 1 total" >&2
  exit 1
fi
exit 0
`,
        );
        fs.chmodSync(path.join(fakeBinDir, 'npm'), '755');

        fs.writeFileSync(
          path.join(fakeBinDir, 'rhx'),
          `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "unlock" ]]; then
  echo "unlocked ehmpath/test"
  exit 0
fi
exec "$(which rhx)" "$@"
`,
        );
        fs.chmodSync(path.join(fakeBinDir, 'rhx'), '755');

        const env = {
          ...process.env,
          PATH: `${fakeBinDir}:${process.env.PATH}`,
        };

        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'all'],
          env,
        });
      });

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output shows integration failed', () => {
        expect(result.stderr).toContain('--what integration');
        expect(result.stderr).toMatch(/failed/);
      });

      then('output does not show acceptance', () => {
        expect(result.stderr).not.toContain('--what acceptance');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when(
      '[t4] --what all acceptance fails (after lint+unit+integration pass)',
      () => {
        const result = useThen('skill executes', () => {
          const tempDir = genTempDir({ slug: 'git-repo-test', git: true });

          fs.writeFileSync(
            path.join(tempDir, 'package.json'),
            JSON.stringify(
              {
                name: 'test-repo',
                scripts: {
                  'test:lint': 'eslint .',
                  'test:unit': 'jest --config=jest.unit.config.js',
                  'test:integration':
                    'jest --config=jest.integration.config.js',
                  'test:acceptance': 'jest --config=jest.acceptance.config.js',
                },
              },
              null,
              2,
            ),
          );

          for (const configType of ['unit', 'integration', 'acceptance']) {
            fs.writeFileSync(
              path.join(tempDir, `jest.${configType}.config.ts`),
              `module.exports = { testMatch: ['**/*.${configType}.test.ts'] };`,
            );
          }

          const fakeBinDir = path.join(tempDir, '.fakebin');
          fs.mkdirSync(fakeBinDir, { recursive: true });

          fs.writeFileSync(
            path.join(fakeBinDir, 'npm'),
            `#!/bin/bash
if [[ "$*" == *"test:lint"* ]]; then
  exit 0
elif [[ "$*" == *"test:unit"* ]]; then
  echo "Test Suites: 1 passed, 1 total" >&2
  exit 0
elif [[ "$*" == *"test:integration"* ]]; then
  echo "Test Suites: 1 passed, 1 total" >&2
  exit 0
elif [[ "$*" == *"test:acceptance"* ]]; then
  echo "Test Suites: 1 failed, 1 total" >&2
  exit 1
fi
exit 0
`,
          );
          fs.chmodSync(path.join(fakeBinDir, 'npm'), '755');

          fs.writeFileSync(
            path.join(fakeBinDir, 'rhx'),
            `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "unlock" ]]; then
  echo "unlocked ehmpath/test"
  exit 0
fi
exec "$(which rhx)" "$@"
`,
          );
          fs.chmodSync(path.join(fakeBinDir, 'rhx'), '755');

          const env = {
            ...process.env,
            PATH: `${fakeBinDir}:${process.env.PATH}`,
          };

          return runGitRepoTest({
            tempDir,
            gitRepoTestArgs: ['--what', 'all'],
            env,
          });
        });

        then('exit code is 2', () => {
          expect(result.exitCode).toBe(2);
        });

        then('output shows acceptance failed', () => {
          expect(result.stderr).toContain('--what acceptance');
          expect(result.stderr).toMatch(/failed/);
        });

        then('output matches snapshot', () => {
          expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
        });
      },
    );
  });

  // ######################################################################
  // journey 12: thorough mode
  // ######################################################################
  given('[case12] repo with tests to run thorough', () => {
    when('[t0] --what unit --thorough is called', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:unit': 'jest',
            },
          },
          jestConfigs: ['unit'],
          mockNpm: {
            exitCode: 0,
            stdout: '> test-repo@1.0.0 test:unit',
            stderr: `PASS src/example.test.ts
Test Suites: 5 passed, 5 total
Tests:       20 passed, 20 total
Snapshots:   0 total
Time:        3.5 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'unit', '--thorough'],
          env: { ...env, THOROUGH: 'true' },
        });
      });

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows passed', () => {
        expect(result.stdout).toContain('🎉 passed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] --what unit --thorough fails', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:unit': 'jest',
            },
          },
          jestConfigs: ['unit'],
          mockNpm: {
            exitCode: 1,
            stdout: '> test-repo@1.0.0 test:unit',
            stderr: `FAIL src/thorough.test.ts
  ● thorough tests › should pass all cases

    expect(received).toBe(expected)

    Expected: true
    Received: false

Test Suites: 1 failed, 5 total
Tests:       1 failed, 19 passed, 20 total
Snapshots:   0 total
Time:        4.2 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'unit', '--thorough'],
          env: { ...env, THOROUGH: 'true' },
        });
      });

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output shows failed', () => {
        expect(result.stderr).toContain('failed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] --what integration --thorough is called', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:integration': 'jest --config jest.integration.config.js',
            },
          },
          jestConfigs: ['integration'],
          mockKeyrack: true,
          mockNpm: {
            exitCode: 0,
            stdout: '> test-repo@1.0.0 test:integration',
            stderr: `PASS src/api.integration.test.ts
Test Suites: 3 passed, 3 total
Tests:       15 passed, 15 total
Snapshots:   0 total
Time:        8.5 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'integration', '--thorough'],
          env: { ...env, THOROUGH: 'true' },
        });
      });

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows passed', () => {
        expect(result.stdout).toContain('🎉 passed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] --what integration --thorough fails', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:integration': 'jest --config jest.integration.config.js',
            },
          },
          jestConfigs: ['integration'],
          mockKeyrack: true,
          mockNpm: {
            exitCode: 1,
            stdout: '> test-repo@1.0.0 test:integration',
            stderr: `FAIL src/db.integration.test.ts
  ● DB tests › should handle thorough connection pool

    Connection pool exhausted

Test Suites: 1 failed, 3 total
Tests:       1 failed, 14 passed, 15 total
Snapshots:   0 total
Time:        9.2 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'integration', '--thorough'],
          env: { ...env, THOROUGH: 'true' },
        });
      });

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output shows failed', () => {
        expect(result.stderr).toContain('failed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t4] --what acceptance --thorough is called', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:acceptance': 'jest --config jest.acceptance.config.js',
            },
          },
          jestConfigs: ['acceptance'],
          mockKeyrack: true,
          mockNpm: {
            exitCode: 0,
            stdout: '> test-repo@1.0.0 test:acceptance',
            stderr: `PASS src/e2e.acceptance.test.ts
Test Suites: 2 passed, 2 total
Tests:       10 passed, 10 total
Snapshots:   0 total
Time:        12.5 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'acceptance', '--thorough'],
          env: { ...env, THOROUGH: 'true' },
        });
      });

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows passed', () => {
        expect(result.stdout).toContain('🎉 passed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t5] --what acceptance --thorough fails', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:acceptance': 'jest --config jest.acceptance.config.js',
            },
          },
          jestConfigs: ['acceptance'],
          mockKeyrack: true,
          mockNpm: {
            exitCode: 1,
            stdout: '> test-repo@1.0.0 test:acceptance',
            stderr: `FAIL src/checkout.acceptance.test.ts
  ● Checkout flow › should complete thorough payment

    Timeout: Payment gateway unreachable

Test Suites: 1 failed, 2 total
Tests:       1 failed, 9 passed, 10 total
Snapshots:   0 total
Time:        15.1 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'acceptance', '--thorough'],
          env: { ...env, THOROUGH: 'true' },
        });
      });

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output shows failed', () => {
        expect(result.stderr).toContain('failed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  // ######################################################################
  // journey 13: namespaced log paths
  // ######################################################################
  given('[case13] repo with unit tests', () => {
    when('[t0] --what unit --log always creates namespaced log', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:unit': 'jest',
            },
          },
          jestConfigs: ['unit'],
          mockNpm: {
            exitCode: 0,
            stdout: '> test-repo@1.0.0 test:unit',
            stderr: `Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Time:        0.1 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'unit', '--log', 'always'],
          env,
        });
      });

      then('log path contains what=unit', () => {
        expect(result.stdout).toContain('what=unit');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  // ######################################################################
  // journey 14: no tests found without scope (changedSince)
  // ######################################################################
  given('[case14] repo with no changed test files', () => {
    when('[t0] --what unit with no tests found (no scope)', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:unit': 'jest',
            },
          },
          jestConfigs: ['unit'],
          mockNpm: {
            exitCode: 0,
            stdout: 'No tests found, exit code 0',
            stderr: '',
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'unit'],
          env,
        });
      });

      then('exit code is 0 (success, not constraint)', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows skipped status', () => {
        expect(result.stdout).toContain('status: skipped');
      });

      then('output shows zero files message', () => {
        expect(result.stdout).toContain('files: 0');
      });

      then('output shows coconut tip', () => {
        expect(result.stdout).toContain('🥥 did you know?');
        expect(result.stdout).toContain('--scope and --thorough');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  // ######################################################################
  // journey 15: help output
  // ######################################################################
  given('[case15] user requests help', () => {
    when('[t0] --help is called', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {},
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--help'],
          env,
        });
      });

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows usage info', () => {
        expect(result.stdout).toContain('--what');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  // ######################################################################
  // journey 16: invalid --what value
  // ######################################################################
  given('[case16] user provides invalid test type', () => {
    when('[t0] --what invalid is called', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {},
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'invalid'],
          env,
        });
      });

      then('exit code is 2 (constraint)', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output shows error about invalid type', () => {
        expect(result.stderr).toMatch(/invalid|constraint|unsupported/i);
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  // ######################################################################
  // journey 17: absent --what argument
  // ######################################################################
  given('[case17] user omits required --what', () => {
    when('[t0] no arguments provided', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {},
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: [],
          env,
        });
      });

      then('exit code is 2 (constraint)', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output shows error about absent --what', () => {
        expect(result.stderr).toMatch(/--what|required/i);
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  // ######################################################################
  // journey 18: real npm call (no mocks)
  // ######################################################################
  // .note = skip in CI: real npm calls can hang due to npx install prompts
  given.skipIf(!!process.env.CI)('[case18] real repo with real npm', () => {
    when('[t0] --what unit --scope with real npm call', () => {
      const result = useThen('skill executes', () => {
        const { tempDir } = setupFixture({
          packageJson: {
            name: 'real-test-repo',
            scripts: {
              'test:unit': 'echo "no tests" && exit 0',
            },
          },
          jestConfigs: ['unit'],
          // no mockNpm - uses real npm
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'unit', '--scope', 'nonexistent'],
          // no env override - uses real PATH
        });
      });

      then('npm was called (exit code reflects real execution)', () => {
        // real npm will run the echo command and exit 0
        // skill interprets "no tests" output and exits appropriately
        expect([0, 2]).toContain(result.exitCode);
      });

      then('output reflects real npm execution', () => {
        // output should contain real npm/skill output, not mocked
        expect(result.stdout + result.stderr).toBeTruthy();
      });

      then('output has treestruct shape', () => {
        // validate output follows treestruct format
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/🐢|🐚|git\.repo\.test/);
        expect(output).toMatch(/├─|└─|--what/);
      });

      then('npm response has valid structure', () => {
        // validate npm output has expected shape
        const output = result.stdout + result.stderr;
        // skill output should show the test what type
        expect(output).toMatch(/--what\s+unit/);
        // output should have scope info
        expect(output).toMatch(/scope:/i);
        // output should have status info
        expect(output).toMatch(/status|passed|failed|skipped/i);
      });

      then('output matches snapshot', () => {
        expect(
          sanitizeOutput(result.stdout || result.stderr),
        ).toMatchSnapshot();
      });
    });
  });

  // ######################################################################
  // journey 19: real keyrack call (no mocks)
  // ######################################################################
  // .note = skip in CI: real npm/keyrack calls can hang due to npx install prompts
  given.skipIf(!!process.env.CI)(
    '[case19] real integration test with keyrack',
    () => {
      when('[t0] --what integration calls real keyrack', () => {
        const result = useThen('skill executes', () => {
          const { tempDir } = setupFixture({
            packageJson: {
              name: 'real-test-repo',
              scripts: {
                'test:integration': 'echo "integration test" && exit 0',
              },
            },
            jestConfigs: ['integration'],
            // no mockKeyrack - uses real keyrack
            // no mockNpm - uses real npm
          });
          return runGitRepoTest({
            tempDir,
            gitRepoTestArgs: ['--what', 'integration'],
            // no env override - uses real PATH with real rhx/keyrack
          });
        });

        then('keyrack was called (output contains keyrack info)', () => {
          // real keyrack will either unlock or show an error
          expect(result.stdout + result.stderr).toMatch(
            /keyrack|unlock|ehmpath/i,
          );
        });

        then('output has treestruct shape', () => {
          // validate output follows treestruct format
          const output = result.stdout + result.stderr;
          expect(output).toMatch(/🐢|🐚|git\.repo\.test/);
          expect(output).toMatch(/├─|└─|--what/);
        });

        then('keyrack response has valid structure', () => {
          // validate keyrack output has expected fields
          const output = result.stdout + result.stderr;
          // keyrack output shows either unlocked or error
          expect(output).toMatch(/keyrack:|unlocked|failed|vault|ehmpath/i);
        });

        then('skill output has expected fields', () => {
          // validate skill output structure
          const output = result.stdout + result.stderr;
          // output should show keyrack info (success or failure)
          expect(output).toMatch(/keyrack|unlock|malfunction/i);
          // output should have status
          expect(output).toMatch(/status|passed|failed|error/i);
          // output should be integration type
          expect(output).toMatch(/--what\s+integration|integration/i);
        });

        then('output matches snapshot', () => {
          expect(
            sanitizeOutput(result.stdout || result.stderr),
          ).toMatchSnapshot();
        });
      });
    },
  );

  // ######################################################################
  // journey 20: flag combinations
  // ######################################################################
  given('[case20] flag combinations', () => {
    when('[t0] --what unit --scope --resnap combined', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:unit': 'jest',
            },
          },
          jestConfigs: ['unit'],
          testFiles: {
            'src/user.unit.test.ts': `test('user works', () => expect(true).toBe(true));`,
          },
          mockNpm: {
            exitCode: 0,
            stdout: '> test-repo@1.0.0 test:unit',
            stderr: `PASS src/user.unit.test.ts
Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
Snapshots:   1 updated, 1 total
Time:        0.3 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'unit', '--scope', 'user', '--resnap'],
          env: { ...env, RESNAP: 'true' },
        });
      });

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows passed', () => {
        expect(result.stdout).toContain('🎉 passed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] --what unit --scope --thorough combined', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:unit': 'jest',
            },
          },
          jestConfigs: ['unit'],
          testFiles: {
            'src/user.unit.test.ts': `test('user works', () => expect(true).toBe(true));`,
          },
          mockNpm: {
            exitCode: 0,
            stdout: '> test-repo@1.0.0 test:unit',
            stderr: `PASS src/user.unit.test.ts
Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Snapshots:   0 total
Time:        1.2 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'unit', '--scope', 'user', '--thorough'],
          env: { ...env, THOROUGH: 'true' },
        });
      });

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows passed', () => {
        expect(result.stdout).toContain('🎉 passed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] --what unit --scope --resnap --thorough all combined', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:unit': 'jest',
            },
          },
          jestConfigs: ['unit'],
          testFiles: {
            'src/user.unit.test.ts': `test('user works', () => expect(true).toBe(true));`,
          },
          mockNpm: {
            exitCode: 0,
            stdout: '> test-repo@1.0.0 test:unit',
            stderr: `PASS src/user.unit.test.ts
Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
Snapshots:   2 updated, 2 total
Time:        2.1 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: [
            '--what',
            'unit',
            '--scope',
            'user',
            '--resnap',
            '--thorough',
          ],
          env: { ...env, RESNAP: 'true', THOROUGH: 'true' },
        });
      });

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows passed', () => {
        expect(result.stdout).toContain('🎉 passed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] --what integration --scope --thorough combined', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:integration': 'jest --config jest.integration.config.js',
            },
          },
          jestConfigs: ['integration'],
          testFiles: {
            'src/api.integration.test.ts': `test('api works', () => expect(true).toBe(true));`,
          },
          mockKeyrack: true,
          mockNpm: {
            exitCode: 0,
            stdout: '> test-repo@1.0.0 test:integration',
            stderr: `PASS src/api.integration.test.ts
Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
Snapshots:   0 total
Time:        3.5 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: [
            '--what',
            'integration',
            '--scope',
            'api',
            '--thorough',
          ],
          env: { ...env, THOROUGH: 'true' },
        });
      });

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows keyrack unlock', () => {
        expect(result.stdout).toContain('keyrack:');
      });

      then('output shows passed', () => {
        expect(result.stdout).toContain('🎉 passed');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t4] --what unit --log always --scope combined', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:unit': 'jest',
            },
          },
          jestConfigs: ['unit'],
          testFiles: {
            'src/user.unit.test.ts': `test('user works', () => expect(true).toBe(true));`,
          },
          mockNpm: {
            exitCode: 0,
            stdout: '> test-repo@1.0.0 test:unit',
            stderr: `PASS src/user.unit.test.ts
Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Snapshots:   0 total
Time:        0.5 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: [
            '--what',
            'unit',
            '--log',
            'always',
            '--scope',
            'user',
          ],
          env,
        });
      });

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('log path contains what=unit', () => {
        expect(result.stdout).toContain('what=unit');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  // ######################################################################
  // journey 21: edge cases
  // ######################################################################
  given('[case21] edge cases', () => {
    when('[t0] --scope with empty string (ignored)', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:unit': 'jest',
            },
          },
          jestConfigs: ['unit'],
          mockNpm: {
            exitCode: 0,
            stdout: '> test-repo@1.0.0 test:unit',
            stderr: `Test Suites: 0 total
Tests:       0 total
Time:        0.1 s`,
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'unit', '--scope', ''],
          env,
        });
      });

      then('exit code is 0 (empty scope treated as no filter)', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] --scope with special characters', () => {
      const result = useThen('skill executes', () => {
        const { tempDir, env } = setupFixture({
          packageJson: {
            name: 'test-repo',
            scripts: {
              'test:unit': 'jest',
            },
          },
          jestConfigs: ['unit'],
          mockNpm: {
            exitCode: 1,
            stdout: '',
            stderr: 'No tests found',
          },
        });
        return runGitRepoTest({
          tempDir,
          gitRepoTestArgs: ['--what', 'unit', '--scope', 'path(src/*)'],
          env,
        });
      });

      then('exit code reflects test result', () => {
        expect([0, 2]).toContain(result.exitCode);
      });

      then('output matches snapshot', () => {
        expect(
          sanitizeOutput(result.stdout || result.stderr),
        ).toMatchSnapshot();
      });
    });
  });
});
