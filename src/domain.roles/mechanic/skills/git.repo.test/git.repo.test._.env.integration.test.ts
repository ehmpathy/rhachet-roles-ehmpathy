import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = integration tests for git.repo.test --env flag
 * .why = verify --env passes through to keyrack unlock with correct environment
 */
describe('git.repo.test --env', () => {
  const skillPath = path.join(__dirname, 'git.repo.test.sh');

  // lookup real rhx path BEFORE any tests modify PATH (to avoid mock finding itself)
  const realRhxPath = spawnSync('which', ['rhx'], {
    encoding: 'utf-8',
  }).stdout.trim();

  /**
   * .what = run git.repo.test.sh in a temp git repo with --env support
   */
  const runInTempGitRepo = (args: {
    integrationCmd?: string;
    unitCmd?: string;
    jestConfigs?: Array<'unit' | 'integration' | 'acceptance'>;
    gitRepoTestArgs: string[];
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'git-repo-test-env', git: true });

    // create mock rhx for keyrack commands
    const fakeBinDir = path.join(tempDir, '.fakebin');
    fs.mkdirSync(fakeBinDir, { recursive: true });

    // mock rhx that succeeds for keyrack commands and echoes the correct env
    const mockRhx = `#!/bin/bash
# mock rhx for keyrack commands in tests
if [[ "$1" == "keyrack" && "$2" == "unlock" ]]; then
  # parse --env argument (defaults to test)
  env_name="test"
  shift 2
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --env) env_name="$2"; shift 2 ;;
      *) shift ;;
    esac
  done
  echo "unlocked ehmpath/\${env_name}"
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
    const envPath = `${fakeBinDir}:${process.env.PATH ?? ''}`;

    // create package.json with test commands
    const pkgJson = {
      name: 'test-repo',
      scripts: {
        ...(args.integrationCmd && { 'test:integration': args.integrationCmd }),
        ...(args.unitCmd && { 'test:unit': args.unitCmd }),
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

  given('[case1] default env (no --env flag)', () => {
    when('[t0] --what integration is run without --env', () => {
      const result = useThen('skill executes', () =>
        runInTempGitRepo({
          integrationCmd: 'echo "integration passed"',
          jestConfigs: ['integration'],
          gitRepoTestArgs: ['--what', 'integration', '--mode', 'apply'],
        }),
      );

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('output shows unlocked ehmpath/test (default)', () => {
        expect(result.stdout).toContain('unlocked ehmpath/test');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case2] explicit --env test', () => {
    when('[t0] --what integration --env test is run', () => {
      const result = useThen('skill executes', () =>
        runInTempGitRepo({
          integrationCmd: 'echo "integration passed"',
          jestConfigs: ['integration'],
          gitRepoTestArgs: [
            '--what',
            'integration',
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

      then('output shows unlocked ehmpath/test', () => {
        expect(result.stdout).toContain('unlocked ehmpath/test');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case3] --env prep', () => {
    when('[t0] --what integration --env prep is run', () => {
      const result = useThen('skill executes', () =>
        runInTempGitRepo({
          integrationCmd: 'echo "integration passed"',
          jestConfigs: ['integration'],
          gitRepoTestArgs: [
            '--what',
            'integration',
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

      then('output shows unlocked ehmpath/prep', () => {
        expect(result.stdout).toContain('unlocked ehmpath/prep');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case4] --env prod', () => {
    when('[t0] --what integration --env prod is run', () => {
      const result = useThen('skill executes', () =>
        runInTempGitRepo({
          integrationCmd: 'echo "integration passed"',
          jestConfigs: ['integration'],
          gitRepoTestArgs: [
            '--what',
            'integration',
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

      then('output shows unlocked ehmpath/prod', () => {
        expect(result.stdout).toContain('unlocked ehmpath/prod');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case5] --env with unit tests (no keyrack needed)', () => {
    when('[t0] --what unit --env prep is run', () => {
      const result = useThen('skill executes', () =>
        runInTempGitRepo({
          unitCmd: 'echo "unit passed"',
          jestConfigs: ['unit'],
          gitRepoTestArgs: [
            '--what',
            'unit',
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

      then('output does not mention keyrack (unit tests skip unlock)', () => {
        expect(result.stdout).not.toContain('unlocked ehmpath');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });
});
