import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

/**
 * .what = integration tests for git.branch.rebase.lock skill
 * .why = verify lock refresh regenerates lock file with correct output per criteria
 */

const SKILL_PATH = path.join(__dirname, 'git.branch.rebase.lock.sh');

/**
 * .what = prepare output for deterministic snapshots
 * .why = npm error output contains timestamps and temp paths that vary per run
 */
const asSnapshotReady = (input: string): string => {
  return (
    input
      // replace npm log timestamps (e.g., 2026-03-24T19_00_42_330Z)
      .replace(
        /\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}_\d{3}Z/g,
        'YYYY-MM-DDTHH_mm_ss_SSSZ',
      )
      // replace temp directory paths (e.g., /tmp/git-rebase-lock-test-nGQXp0/)
      .replace(
        /\/tmp\/git-rebase-lock-test-[A-Za-z0-9]+\//g,
        '/tmp/git-rebase-lock-test-XXXXX/',
      )
  );
};

/**
 * .what = setup a git repo with rebase in progress and lock file
 * .why = test lock refresh against actual rebase state
 */
const setupRebaseWithLockFile = (options: {
  lockFile: 'pnpm-lock.yaml' | 'package-lock.json' | 'yarn.lock';
  includePackageJson?: boolean;
}): string => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'git-rebase-lock-test-'),
  );

  // init git repo
  spawnSync('git', ['init'], { cwd: tempDir });
  configureTestGitUser({ cwd: tempDir });

  // create package.json for install to work
  if (options.includePackageJson !== false) {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(
        {
          name: 'test-package',
          version: '1.0.0',
          dependencies: {},
        },
        null,
        2,
      ),
    );
    spawnSync('git', ['add', 'package.json'], { cwd: tempDir });
    spawnSync('git', ['commit', '-m', 'init: add package.json'], {
      cwd: tempDir,
    });
  } else {
    // create initial commit
    fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test Repo\n');
    spawnSync('git', ['add', 'README.md'], { cwd: tempDir });
    spawnSync('git', ['commit', '-m', 'init: initial commit'], {
      cwd: tempDir,
    });
  }

  spawnSync('git', ['branch', '-M', 'main'], { cwd: tempDir });

  // add lock file on main
  fs.writeFileSync(path.join(tempDir, options.lockFile), 'main lock content\n');
  spawnSync('git', ['add', options.lockFile], { cwd: tempDir });
  spawnSync('git', ['commit', '-m', 'fix: add lock file on main'], {
    cwd: tempDir,
  });

  // create origin/main ref
  spawnSync('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD'], {
    cwd: tempDir,
  });

  // create feature branch from commit before lock file
  spawnSync('git', ['checkout', '-b', 'feature/test-branch', 'HEAD~1'], {
    cwd: tempDir,
  });

  // add same lock file on feature with different content (creates conflict)
  fs.writeFileSync(
    path.join(tempDir, options.lockFile),
    'feature lock content\n',
  );
  spawnSync('git', ['add', options.lockFile], { cwd: tempDir });
  spawnSync('git', ['commit', '-m', 'fix: add lock file on feature'], {
    cwd: tempDir,
  });

  // start rebase to create conflict
  spawnSync('git', ['rebase', 'refs/remotes/origin/main'], {
    cwd: tempDir,
    encoding: 'utf-8',
  });

  // settle conflict by taking theirs (to simulate post-take state)
  spawnSync('git', ['checkout', '--theirs', options.lockFile], {
    cwd: tempDir,
  });
  spawnSync('git', ['add', options.lockFile], { cwd: tempDir });

  return tempDir;
};

/**
 * .what = setup a git repo with simulated rebase state (no lock file)
 * .why = test guards and error cases
 */
const setupRebaseWithoutLockFile = (): string => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'git-rebase-lock-test-'),
  );

  // init git repo
  spawnSync('git', ['init'], { cwd: tempDir });
  configureTestGitUser({ cwd: tempDir });

  // create initial commit
  fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test Repo\n');
  spawnSync('git', ['add', 'README.md'], { cwd: tempDir });
  spawnSync('git', ['commit', '-m', 'init: initial commit'], { cwd: tempDir });

  // simulate rebase in progress (without lock file)
  const rebaseMergeDir = path.join(tempDir, '.git', 'rebase-merge');
  fs.mkdirSync(rebaseMergeDir, { recursive: true });
  fs.writeFileSync(
    path.join(rebaseMergeDir, 'head-name'),
    'refs/heads/feature/test-branch',
  );
  fs.writeFileSync(path.join(rebaseMergeDir, 'onto'), 'abc123def456');
  fs.writeFileSync(path.join(rebaseMergeDir, 'msgnum'), '1');
  fs.writeFileSync(path.join(rebaseMergeDir, 'end'), '2');

  return tempDir;
};

/**
 * .what = setup git repo with no rebase in progress
 * .why = test guard against lock refresh when idle
 */
const setupNoRebase = (): string => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'git-rebase-lock-test-'),
  );

  // init git repo
  spawnSync('git', ['init'], { cwd: tempDir });
  configureTestGitUser({ cwd: tempDir });

  // create initial commit with lock file
  fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test Repo\n');
  fs.writeFileSync(path.join(tempDir, 'pnpm-lock.yaml'), 'lock content\n');
  spawnSync('git', ['add', '.'], { cwd: tempDir });
  spawnSync('git', ['commit', '-m', 'init: initial commit'], { cwd: tempDir });

  return tempDir;
};

/**
 * .what = run git.branch.rebase.lock skill
 * .why = execute skill and capture output
 */
const runSkill = (
  tempDir: string,
  args: string[] = [],
): { stdout: string; stderr: string; status: number | null } => {
  const result = spawnSync('bash', [SKILL_PATH, ...args], {
    cwd: tempDir,
    encoding: 'utf-8',
    env: {
      ...process.env,
      PATH: process.env.PATH,
    },
  });

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status,
  };
};

/**
 * .what = check if a command is available
 * .why = skip tests that require unavailable package managers
 */
const isCommandAvailable = (command: string): boolean => {
  const result = spawnSync('which', [command], { encoding: 'utf-8' });
  return result.status === 0;
};

describe('git.branch.rebase.lock', () => {
  given('[case1] rebase in progress with pnpm-lock.yaml', () => {
    when('[t0] lock refresh with pnpm', () => {
      then('lock regenerated, staged, exit 0', () => {
        if (!isCommandAvailable('pnpm')) {
          console.log('skipped: pnpm not available');
          return;
        }

        const tempDir = setupRebaseWithLockFile({
          lockFile: 'pnpm-lock.yaml',
        });

        try {
          const result = runSkill(tempDir, ['refresh']);

          expect(result.status).toBe(0);
          expect(result.stdout).toContain('shell yeah!');
          expect(result.stdout).toContain('detected: pnpm');
          expect(result.stdout).toContain('pnpm-lock.yaml');
          expect(result.stdout).toContain('done');
          expect(result.stdout).toMatchSnapshot();

          // verify lock file is staged
          const statusResult = spawnSync(
            'git',
            ['diff', '--cached', '--name-only'],
            { cwd: tempDir, encoding: 'utf-8' },
          );
          expect(statusResult.stdout).toContain('pnpm-lock.yaml');
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case2] rebase in progress with package-lock.json', () => {
    when('[t0] lock refresh with npm', () => {
      then('lock regenerated, staged, exit 0', () => {
        const tempDir = setupRebaseWithLockFile({
          lockFile: 'package-lock.json',
        });

        try {
          const result = runSkill(tempDir, ['refresh']);

          expect(result.status).toBe(0);
          expect(result.stdout).toContain('shell yeah!');
          expect(result.stdout).toContain('detected: npm');
          expect(result.stdout).toContain('package-lock.json');
          expect(result.stdout).toContain('done');
          expect(result.stdout).toMatchSnapshot();

          // verify lock file is staged
          const statusResult = spawnSync(
            'git',
            ['diff', '--cached', '--name-only'],
            { cwd: tempDir, encoding: 'utf-8' },
          );
          expect(statusResult.stdout).toContain('package-lock.json');
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case3] rebase in progress with yarn.lock', () => {
    when('[t0] lock refresh with yarn', () => {
      then('lock regenerated, staged, exit 0', () => {
        if (!isCommandAvailable('yarn')) {
          console.log('skipped: yarn not available');
          return;
        }

        const tempDir = setupRebaseWithLockFile({
          lockFile: 'yarn.lock',
        });

        try {
          const result = runSkill(tempDir, ['refresh']);

          expect(result.status).toBe(0);
          expect(result.stdout).toContain('shell yeah!');
          expect(result.stdout).toContain('detected: yarn');
          expect(result.stdout).toContain('yarn.lock');
          expect(result.stdout).toContain('done');
          expect(result.stdout).toMatchSnapshot();

          // verify lock file is staged
          const statusResult = spawnSync(
            'git',
            ['diff', '--cached', '--name-only'],
            { cwd: tempDir, encoding: 'utf-8' },
          );
          expect(statusResult.stdout).toContain('yarn.lock');
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case4] no rebase in progress', () => {
    when('[t0] attempt lock refresh', () => {
      then('shows error: no rebase in progress', () => {
        const tempDir = setupNoRebase();

        try {
          const result = runSkill(tempDir, ['refresh']);

          expect(result.status).not.toBe(0);
          expect(result.stdout).toContain('hold up dude');
          expect(result.stdout).toContain('no rebase in progress');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case5] rebase in progress but no lock file', () => {
    when('[t0] attempt lock refresh', () => {
      then('shows error: no lock file found', () => {
        const tempDir = setupRebaseWithoutLockFile();

        try {
          const result = runSkill(tempDir, ['refresh']);

          expect(result.status).not.toBe(0);
          expect(result.stdout).toContain('hold up dude');
          expect(result.stdout).toContain('no lock file found');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case6] pnpm-lock.yaml extant but pnpm not installed', () => {
    when('[t0] attempt lock refresh', () => {
      then('shows error: pnpm not found', () => {
        // this test requires mocking PATH to exclude pnpm
        // skip if pnpm not available (can't test the error case)
        if (!isCommandAvailable('pnpm')) {
          console.log('skipped: pnpm not available (cannot test error case)');
          return;
        }

        const tempDir = setupRebaseWithLockFile({
          lockFile: 'pnpm-lock.yaml',
        });

        try {
          // run with PATH that excludes pnpm
          const result = spawnSync('bash', [SKILL_PATH, 'refresh'], {
            cwd: tempDir,
            encoding: 'utf-8',
            env: {
              ...process.env,
              PATH: '/usr/bin:/bin', // minimal PATH without pnpm
            },
          });

          expect(result.status).not.toBe(0);
          expect(result.stdout).toContain('hold up dude');
          expect(result.stdout).toContain('pnpm not found');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case7] yarn.lock extant but yarn not installed', () => {
    when('[t0] attempt lock refresh', () => {
      then('shows error: yarn not found', () => {
        // this test requires mocking PATH to exclude yarn
        // skip if yarn not available (can't test the error case)
        if (!isCommandAvailable('yarn')) {
          console.log('skipped: yarn not available (cannot test error case)');
          return;
        }

        const tempDir = setupRebaseWithLockFile({
          lockFile: 'yarn.lock',
        });

        try {
          // run with PATH that excludes yarn
          const result = spawnSync('bash', [SKILL_PATH, 'refresh'], {
            cwd: tempDir,
            encoding: 'utf-8',
            env: {
              ...process.env,
              PATH: '/usr/bin:/bin', // minimal PATH without yarn
            },
          });

          expect(result.status).not.toBe(0);
          expect(result.stdout).toContain('hold up dude');
          expect(result.stdout).toContain('yarn not found');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case8] priority: pnpm > npm when both lock files extant', () => {
    when('[t0] lock refresh (pnpm available)', () => {
      then('uses pnpm (preferred)', () => {
        if (!isCommandAvailable('pnpm')) {
          console.log('skipped: pnpm not available');
          return;
        }

        const tempDir = setupRebaseWithLockFile({
          lockFile: 'pnpm-lock.yaml',
        });

        // also add package-lock.json
        fs.writeFileSync(
          path.join(tempDir, 'package-lock.json'),
          '{"lockfileVersion": 3}\n',
        );
        spawnSync('git', ['add', 'package-lock.json'], { cwd: tempDir });

        try {
          const result = runSkill(tempDir, ['refresh']);

          expect(result.status).toBe(0);
          expect(result.stdout).toContain('detected: pnpm');
          // not npm
          expect(result.stdout).not.toContain('detected: npm');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case9] install failure', () => {
    when('[t0] lock refresh with bad package.json', () => {
      then('shows install error', () => {
        const tempDir = setupRebaseWithLockFile({
          lockFile: 'package-lock.json',
          includePackageJson: false,
        });

        // create invalid package.json
        fs.writeFileSync(
          path.join(tempDir, 'package.json'),
          'invalid json content',
        );

        try {
          const result = runSkill(tempDir, ['refresh']);

          expect(result.status).not.toBe(0);
          expect(result.stdout).toContain('bummer dude');
          expect(result.stdout).toContain('install failed');
          expect(asSnapshotReady(result.stdout)).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case10] subcommand validation', () => {
    when('[t0] lock without subcommand', () => {
      then('shows error: subcommand required', () => {
        const tempDir = setupRebaseWithLockFile({
          lockFile: 'pnpm-lock.yaml',
        });

        try {
          const result = runSkill(tempDir, []);

          expect(result.status).not.toBe(0);
          expect(result.stdout).toContain('hold up dude');
          expect(result.stdout).toContain('subcommand required');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });

    when('[t1] lock with unknown subcommand', () => {
      then('shows error: unknown lock subcommand', () => {
        const tempDir = setupRebaseWithLockFile({
          lockFile: 'pnpm-lock.yaml',
        });

        try {
          const result = runSkill(tempDir, ['invalidcmd']);

          expect(result.status).not.toBe(0);
          expect(result.stdout).toContain('hold up dude');
          expect(result.stdout).toContain('unknown lock subcommand');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });
});
