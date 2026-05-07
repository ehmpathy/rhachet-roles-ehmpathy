import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = verify git.repo.test.sh always runs tests via nice
 * .why = nice -n 5 prevents test suites from CPU starvation on the host.
 *        this test proves nice is called on every execution path.
 */
describe('git.repo.test.sh nice', () => {
  const scriptPath = path.join(__dirname, 'git.repo.test.sh');

  /**
   * .what = create a fixture that captures the nice level of the test process
   */
  const runAndCapture = (args: {
    what: 'unit' | 'integration';
    scope?: string;
    timeout?: string;
  }): {
    stdout: string;
    stderr: string;
    exitCode: number;
    capturedNice: string;
  } => {
    const tempDir = genTempDir({ slug: 'nice-test', git: true });
    const what = args.what;

    // create package.json
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(
        {
          name: 'test-repo',
          devDependencies: { jest: '30.2.0' },
          scripts: {
            'test:unit': 'jest --config jest.unit.config.js',
            'test:integration': 'jest --config jest.integration.config.js',
          },
        },
        null,
        2,
      ),
    );

    // create jest configs
    for (const configType of ['unit', 'integration']) {
      fs.writeFileSync(
        path.join(tempDir, `jest.${configType}.config.ts`),
        `module.exports = { testMatch: ['**/*.${configType}.test.js'] };`,
      );
      fs.writeFileSync(
        path.join(tempDir, `jest.${configType}.config.js`),
        `module.exports = { testMatch: ['**/*.${configType}.test.js'], transform: {}, testEnvironment: 'node' };`,
      );
    }

    // create a test file
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'src', `example.${what}.test.js`),
      `describe('example', () => { it('passes', () => {}); });`,
    );

    // mock jest --listTests
    const jestBinDir = path.join(tempDir, 'node_modules', '.bin');
    fs.mkdirSync(jestBinDir, { recursive: true });
    fs.writeFileSync(
      path.join(jestBinDir, 'jest'),
      `#!/bin/bash
if [[ "$*" == *"--listTests"* ]]; then
  echo "${tempDir}/src/example.${what}.test.js"
  exit 0
fi
exit 1
`,
    );
    fs.chmodSync(path.join(jestBinDir, 'jest'), '755');

    // mock npm/pnpm to capture nice level
    const captureFile = path.join(tempDir, '.nice-capture.txt');
    const fakeBinDir = path.join(tempDir, '.fakebin');
    fs.mkdirSync(fakeBinDir, { recursive: true });

    const mockScript = `#!/bin/bash
# capture nice level of this process
NICE_LEVEL=$(nice)
echo "nice_level=\${NICE_LEVEL}" > "${captureFile}"
# emit fake jest output
echo "Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        0.1 s" >&2
exit 0
`;

    for (const bin of ['npm', 'pnpm']) {
      fs.writeFileSync(path.join(fakeBinDir, bin), mockScript);
      fs.chmodSync(path.join(fakeBinDir, bin), '755');
    }

    // mock keyrack for integration tests
    const realRhxPath = spawnSync('which', ['rhx'], {
      encoding: 'utf-8' as const, // node api requires this exact string
    }).stdout.trim();
    fs.writeFileSync(
      path.join(fakeBinDir, 'rhx'),
      `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "unlock" ]]; then
  echo "unlocked ehmpath/test"
  exit 0
fi
if [[ "$1" == "keyrack" && "$2" == "source" ]]; then
  echo "# mock keyrack source"
  exit 0
fi
exec "${realRhxPath}" "$@"
`,
    );
    fs.chmodSync(path.join(fakeBinDir, 'rhx'), '755');

    const env = {
      ...process.env,
      PATH: `${fakeBinDir}:${process.env.PATH}`,
    };

    // commit to establish git history
    spawnSync('git', ['add', '.'], { cwd: tempDir });
    spawnSync('git', ['commit', '-m', 'initial'], { cwd: tempDir });

    // build skill args
    const skillArgs = ['--what', what, '--mode', 'apply', '--thorough'];
    if (args.scope) skillArgs.push('--scope', args.scope);
    if (args.timeout) skillArgs.push('--timeout', args.timeout);

    const result = spawnSync('bash', [scriptPath, ...skillArgs], {
      cwd: tempDir,
      encoding: 'utf-8' as const, // node api requires this exact string
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
      timeout: 30_000,
    });

    // read captured nice level
    const captured = fs.existsSync(captureFile)
      ? fs.readFileSync(captureFile, 'utf-8').trim()
      : 'NOT_CAPTURED';
    const niceMatch = captured.match(/nice_level=(.+)/);

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      capturedNice: niceMatch?.[1] ?? 'NOT_FOUND',
    };
  };

  given('[case1] unit tests without timeout', () => {
    when('[t0] --what unit --mode apply is called', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({ what: 'unit' }),
      );

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('test process ran at nice level 5 or higher', () => {
        const level = parseInt(result.capturedNice, 10);
        expect(level).toBeGreaterThanOrEqual(5);
      });
    });
  });

  given('[case2] unit tests with timeout', () => {
    when('[t0] --what unit --timeout 30 --mode apply is called', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({ what: 'unit', timeout: '30' }),
      );

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('test process ran at nice level 5 or higher', () => {
        const level = parseInt(result.capturedNice, 10);
        expect(level).toBeGreaterThanOrEqual(5);
      });
    });
  });

  given('[case3] integration tests without timeout', () => {
    when('[t0] --what integration --mode apply is called', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({ what: 'integration' }),
      );

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('test process ran at nice level 5 or higher', () => {
        const level = parseInt(result.capturedNice, 10);
        expect(level).toBeGreaterThanOrEqual(5);
      });
    });
  });

  given('[case4] unit tests with scope, without timeout', () => {
    when('[t0] --what unit --scope example --mode apply is called', () => {
      const result = useThen('skill executes', () =>
        runAndCapture({ what: 'unit', scope: 'example' }),
      );

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('test process ran at nice level 5 or higher', () => {
        const level = parseInt(result.capturedNice, 10);
        expect(level).toBeGreaterThanOrEqual(5);
      });
    });
  });

  given('[case5] unit tests with scope and timeout', () => {
    when(
      '[t0] --what unit --scope example --timeout 30 --mode apply is called',
      () => {
        const result = useThen('skill executes', () =>
          runAndCapture({ what: 'unit', scope: 'example', timeout: '30' }),
        );

        then('exit code is 0', () => {
          expect(result.exitCode).toBe(0);
        });

        then('test process ran at nice level 5 or higher', () => {
          const level = parseInt(result.capturedNice, 10);
          expect(level).toBeGreaterThanOrEqual(5);
        });
      },
    );
  });
});
