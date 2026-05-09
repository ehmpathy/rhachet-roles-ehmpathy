import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = integration tests for git.repo.test --locally flag
 * .why = verify --locally runs test:acceptance:locally instead of test:acceptance
 */
describe('git.repo.test --locally', () => {
  const skillPath = path.join(__dirname, 'git.repo.test.sh');

  // lookup real rhx path BEFORE any tests modify PATH (to avoid mock recursion)
  const realRhxPath = spawnSync('which', ['rhx'], {
    encoding: 'utf-8',
  }).stdout.trim();

  /**
   * .what = run git.repo.test.sh in a temp git repo with --locally support
   */
  const runInTempGitRepo = (args: {
    acceptanceCmd?: string;
    acceptanceLocallyCmd?: string;
    unitCmd?: string;
    jestConfigs?: Array<'unit' | 'integration' | 'acceptance'>;
    mockRhxKeyrack?: boolean;
    gitRepoTestArgs: string[];
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'git-repo-test-locally', git: true });

    // create mock rhx for keyrack commands (acceptance tests require keyrack)
    let envPath = process.env.PATH ?? '';
    if (args.mockRhxKeyrack) {
      const fakeBinDir = path.join(tempDir, '.fakebin');
      fs.mkdirSync(fakeBinDir, { recursive: true });
      const mockRhx = `#!/bin/bash
# mock rhx for keyrack commands in tests
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

  given('[case1] --locally with test:acceptance:locally present', () => {
    when('[t0] --what acceptance --locally is run', () => {
      const result = useThen('skill executes', () =>
        runInTempGitRepo({
          acceptanceLocallyCmd: 'echo "acceptance locally passed"',
          jestConfigs: ['acceptance'],
          mockRhxKeyrack: true,
          gitRepoTestArgs: [
            '--what',
            'acceptance',
            '--locally',
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

  given('[case2] --locally with test:acceptance:locally absent', () => {
    when('[t0] --what acceptance --locally is run but command absent', () => {
      const result = useThen('skill executes', () =>
        runInTempGitRepo({
          acceptanceCmd: 'echo "acceptance passed"',
          jestConfigs: ['acceptance'],
          mockRhxKeyrack: true,
          gitRepoTestArgs: ['--what', 'acceptance', '--locally'],
        }),
      );

      then('exit code is 2 (constraint error)', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output mentions test:acceptance:locally', () => {
        expect(result.stdout).toContain('test:acceptance:locally');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case3] --locally used with non-acceptance test type', () => {
    when('[t0] --what unit --locally is run', () => {
      const result = useThen('skill executes', () =>
        runInTempGitRepo({
          unitCmd: 'echo "unit passed"',
          jestConfigs: ['unit'],
          gitRepoTestArgs: ['--what', 'unit', '--locally'],
        }),
      );

      then('exit code is 2 (constraint error)', () => {
        expect(result.exitCode).toBe(2);
      });

      then('output shows --locally only valid with acceptance', () => {
        expect(result.stdout).toContain(
          '--locally only valid with --what acceptance',
        );
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });
});
