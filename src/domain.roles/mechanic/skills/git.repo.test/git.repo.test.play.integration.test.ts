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
    testFiles?: Record<string, string>;
    mockKeyrack?: boolean;
    mockNpm?: { exitCode: number; stdout?: string; stderr?: string };
  }): { tempDir: string; env: NodeJS.ProcessEnv } => {
    const tempDir = genTempDir({ slug: 'git-repo-test', git: true });

    // write package.json
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(config.packageJson, null, 2),
    );

    // write jest.config.js if provided
    if (config.jestConfig) {
      fs.writeFileSync(path.join(tempDir, 'jest.config.js'), config.jestConfig);
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
# pass through to real rhx for other commands
exec "$(which rhx)" "$@"
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
          mockNpm: {
            exitCode: 0,
            stdout: '> test-repo@1.0.0 test:unit',
            stderr: `PASS src/user.test.ts
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

      then('output shows cowabunga', () => {
        expect(result.stdout).toContain('cowabunga!');
      });

      then('output shows all test types completed', () => {
        expect(result.stdout).toContain('lint: passed');
        expect(result.stdout).toContain('unit: passed');
        expect(result.stdout).toContain('integration: passed');
        expect(result.stdout).toContain('acceptance: passed');
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
        expect(result.stderr).toContain('lint: failed');
      });

      then('output does not show unit or other types', () => {
        // fail-fast: should not run subsequent types
        expect(result.stderr).not.toContain('unit: passed');
        expect(result.stderr).not.toContain('unit: failed');
      });
    });
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
    });
  });
});
