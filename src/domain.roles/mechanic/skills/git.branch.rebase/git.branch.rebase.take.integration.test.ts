import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

/**
 * .what = integration tests for git.branch.rebase.take skill
 * .why = verify take settles conflicts with correct output per criteria
 */

const SKILL_PATH = path.join(__dirname, 'git.branch.rebase.take.sh');

/**
 * .what = check if yarn is installed
 * .why = yarn test should skip when yarn is installed (behavior differs)
 */
const isYarnInstalled = (() => {
  const result = spawnSync('which', ['yarn'], { encoding: 'utf-8' });
  return result.status === 0;
})();

/**
 * .what = setup a git repo with real rebase conflict
 * .why = test take against actual unmerged files, not simulated state
 */
const setupRebaseWithConflict = (options: {
  conflictFiles?: string[];
  featureContent?: Record<string, string>;
  mainContent?: Record<string, string>;
  /** extra files to add before conflict (no conflict on these) */
  extraFiles?: Record<string, string>;
}): string => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'git-rebase-take-test-'),
  );

  // init git repo
  spawnSync('git', ['init'], { cwd: tempDir });
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: tempDir });
  spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: tempDir });

  // create initial commit on main
  fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test Repo\n');
  spawnSync('git', ['add', 'README.md'], { cwd: tempDir });

  // add extra files if specified (not in conflict, shared by both branches)
  const extraFiles = options.extraFiles ?? {};
  for (const [file, content] of Object.entries(extraFiles)) {
    const filePath = path.join(tempDir, file);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    spawnSync('git', ['add', file], { cwd: tempDir });
  }

  spawnSync('git', ['commit', '-m', 'init: initial commit'], { cwd: tempDir });
  spawnSync('git', ['branch', '-M', 'main'], { cwd: tempDir });

  // add conflict files on main with main content
  const conflictFiles = options.conflictFiles ?? ['conflict.txt'];
  const mainContent = options.mainContent ?? {};
  for (const file of conflictFiles) {
    const content = mainContent[file] ?? `main version of ${file}\n`;
    const filePath = path.join(tempDir, file);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    spawnSync('git', ['add', file], { cwd: tempDir });
  }
  spawnSync('git', ['commit', '-m', 'fix: add files on main'], {
    cwd: tempDir,
  });

  // create origin/main ref
  spawnSync('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD'], {
    cwd: tempDir,
  });

  // create feature branch from initial commit
  spawnSync('git', ['checkout', '-b', 'feature/test-branch', 'HEAD~1'], {
    cwd: tempDir,
  });

  // add same files on feature with feature content (creates conflict)
  const featureContent = options.featureContent ?? {};
  for (const file of conflictFiles) {
    const content = featureContent[file] ?? `feature version of ${file}\n`;
    const filePath = path.join(tempDir, file);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    spawnSync('git', ['add', file], { cwd: tempDir });
  }
  spawnSync('git', ['commit', '-m', 'fix: add files on feature'], {
    cwd: tempDir,
  });

  // start rebase to create actual conflict
  const rebaseResult = spawnSync(
    'git',
    ['rebase', 'refs/remotes/origin/main'],
    {
      cwd: tempDir,
      encoding: 'utf-8',
    },
  );

  // verify we have conflicts
  const conflictCheck = spawnSync(
    'git',
    ['diff', '--name-only', '--diff-filter=U'],
    { cwd: tempDir, encoding: 'utf-8' },
  );

  if (!conflictCheck.stdout || conflictCheck.stdout.trim() === '') {
    // if no conflicts, cleanup and throw
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw new Error('test setup failed: no conflicts created');
  }

  return tempDir;
};

/**
 * .what = setup a git repo with simulated rebase state (no real conflicts)
 * .why = test guards and error cases
 */
const setupSimulatedRebase = (): string => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'git-rebase-take-test-'),
  );

  // init git repo
  spawnSync('git', ['init'], { cwd: tempDir });
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: tempDir });
  spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: tempDir });

  // create initial commit
  fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test Repo\n');
  spawnSync('git', ['add', 'README.md'], { cwd: tempDir });
  spawnSync('git', ['commit', '-m', 'init: initial commit'], { cwd: tempDir });

  // simulate rebase in progress (without real conflicts)
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
 * .why = test guard against take when idle
 */
const setupNoRebase = (): string => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'git-rebase-take-test-'),
  );

  // init git repo
  spawnSync('git', ['init'], { cwd: tempDir });
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: tempDir });
  spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: tempDir });

  // create initial commit
  fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test Repo\n');
  spawnSync('git', ['add', 'README.md'], { cwd: tempDir });
  spawnSync('git', ['commit', '-m', 'init: initial commit'], { cwd: tempDir });

  return tempDir;
};

/**
 * .what = run git.branch.rebase.take skill
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

describe('git.branch.rebase.take', () => {
  given('[case1] rebase in progress with single non-lock conflict file', () => {
    when('[t0] take theirs for single file', () => {
      then('file is replaced with theirs, staged, exit 0', () => {
        const tempDir = setupRebaseWithConflict({
          conflictFiles: ['config.json'],
          mainContent: { 'config.json': '{"main": true}\n' },
          featureContent: { 'config.json': '{"feature": true}\n' },
        });

        try {
          const result = runSkill(tempDir, ['--whos', 'theirs', 'config.json']);

          expect(result.status).toBe(0);
          expect(result.stdout).toContain('righteous!');
          expect(result.stdout).toContain('whos: theirs');
          expect(result.stdout).toContain('config.json');
          expect(result.stdout).toContain('done');
          expect(result.stdout).toMatchSnapshot();

          // verify file has theirs content (feature branch = theirs in rebase)
          // in rebase: ours = base branch (origin/main), theirs = commit in replay
          const content = fs.readFileSync(
            path.join(tempDir, 'config.json'),
            'utf-8',
          );
          expect(content).toContain('feature');
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case2] rebase in progress with single conflict file', () => {
    when('[t0] take ours for single file', () => {
      then('file is replaced with ours, staged, exit 0', () => {
        const tempDir = setupRebaseWithConflict({
          conflictFiles: ['.eslintrc.json'],
          mainContent: { '.eslintrc.json': '{"main": true}\n' },
          featureContent: { '.eslintrc.json': '{"feature": true}\n' },
        });

        try {
          const result = runSkill(tempDir, [
            '--whos',
            'ours',
            '.eslintrc.json',
          ]);

          expect(result.status).toBe(0);
          expect(result.stdout).toContain('righteous!');
          expect(result.stdout).toContain('whos: ours');
          expect(result.stdout).toContain('.eslintrc.json');
          expect(result.stdout).toContain('done');
          expect(result.stdout).toMatchSnapshot();

          // verify file has ours content (main branch = ours in rebase)
          // in rebase: ours = base branch (origin/main), theirs = commit in replay
          const content = fs.readFileSync(
            path.join(tempDir, '.eslintrc.json'),
            'utf-8',
          );
          expect(content).toContain('main');
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case3] rebase in progress with multiple conflict files', () => {
    when('[t0] take theirs for all via .', () => {
      then('all conflict files settled, exit 0', () => {
        const tempDir = setupRebaseWithConflict({
          conflictFiles: ['a.ts', 'b.ts', 'c.ts'],
          mainContent: {
            'a.ts': 'main a\n',
            'b.ts': 'main b\n',
            'c.ts': 'main c\n',
          },
          featureContent: {
            'a.ts': 'feature a\n',
            'b.ts': 'feature b\n',
            'c.ts': 'feature c\n',
          },
        });

        try {
          const result = runSkill(tempDir, ['--whos', 'theirs', '.']);

          expect(result.status).toBe(0);
          expect(result.stdout).toContain('righteous!');
          expect(result.stdout).toContain('a.ts');
          expect(result.stdout).toContain('b.ts');
          expect(result.stdout).toContain('c.ts');
          expect(result.stdout).toContain('done');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case4] no rebase in progress', () => {
    when('[t0] attempt take', () => {
      then('shows error: no rebase in progress', () => {
        const tempDir = setupNoRebase();

        try {
          const result = runSkill(tempDir, [
            '--whos',
            'theirs',
            'pnpm-lock.yaml',
          ]);

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

  given('[case5] rebase in progress but file not in conflict', () => {
    when('[t0] attempt take on non-conflict file', () => {
      then('shows error: no files in conflict', () => {
        const tempDir = setupSimulatedRebase();

        try {
          const result = runSkill(tempDir, ['--whos', 'theirs', 'README.md']);

          expect(result.status).not.toBe(0);
          expect(result.stdout).toContain('hold up dude');
          // no conflict files at all in simulated rebase
          expect(result.stdout).toContain('no files in conflict');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case6] invalid --whos value', () => {
    when('[t0] attempt take with invalid whos', () => {
      then('shows error: whos must be ours or theirs', () => {
        const tempDir = setupSimulatedRebase();

        try {
          const result = runSkill(tempDir, [
            '--whos',
            'mine',
            'pnpm-lock.yaml',
          ]);

          expect(result.status).not.toBe(0);
          expect(result.stdout).toContain('hold up dude');
          expect(result.stdout).toContain('whos must be ours or theirs');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case7] no paths given', () => {
    when('[t0] attempt take without paths', () => {
      then('shows error: paths required', () => {
        const tempDir = setupSimulatedRebase();

        try {
          const result = runSkill(tempDir, ['--whos', 'theirs']);

          expect(result.status).not.toBe(0);
          expect(result.stdout).toContain('hold up dude');
          expect(result.stdout).toContain('paths required');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case8] absent --whos', () => {
    when('[t0] attempt take without --whos', () => {
      then('shows error: --whos required', () => {
        const tempDir = setupSimulatedRebase();

        try {
          const result = runSkill(tempDir, ['pnpm-lock.yaml']);

          expect(result.status).not.toBe(0);
          expect(result.stdout).toContain('hold up dude');
          expect(result.stdout).toContain('--whos required');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case9] output format verification', () => {
    when('[t0] successful take', () => {
      then('output includes turtle header, tree, and done', () => {
        const tempDir = setupRebaseWithConflict({
          conflictFiles: ['test.ts'],
        });

        try {
          const result = runSkill(tempDir, ['--whos', 'theirs', 'test.ts']);

          expect(result.status).toBe(0);
          // turtle header
          expect(result.stdout).toMatch(/🐢 (righteous|mostly righteous)/);
          // tree structure
          expect(result.stdout).toContain('git.branch.rebase take');
          expect(result.stdout).toContain('whos:');
          // ends with done
          expect(result.stdout).toContain('done');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case10] glob pattern support', () => {
    when('[t0] take theirs via glob pattern', () => {
      then('all matched conflict files settled', () => {
        const tempDir = setupRebaseWithConflict({
          conflictFiles: ['a.lock', 'b.lock', 'c.ts'],
          mainContent: {
            'a.lock': 'main a\n',
            'b.lock': 'main b\n',
            'c.ts': 'main c\n',
          },
          featureContent: {
            'a.lock': 'feature a\n',
            'b.lock': 'feature b\n',
            'c.ts': 'feature c\n',
          },
        });

        try {
          // take only .lock files via glob
          const result = runSkill(tempDir, ['--whos', 'theirs', '*.lock']);

          expect(result.status).toBe(0);
          expect(result.stdout).toContain('righteous');
          expect(result.stdout).toContain('a.lock');
          expect(result.stdout).toContain('b.lock');
          // c.ts should not be in settled (not matched by glob)
          expect(result.stdout).not.toContain('c.ts');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case11] file not found (fail-fast)', () => {
    when('[t0] take theirs with nonexistent file', () => {
      then('fails immediately with file not found error', () => {
        const tempDir = setupRebaseWithConflict({
          conflictFiles: ['a.ts', 'b.ts'],
          mainContent: { 'a.ts': 'main a\n', 'b.ts': 'main b\n' },
          featureContent: { 'a.ts': 'feature a\n', 'b.ts': 'feature b\n' },
        });

        try {
          const result = runSkill(tempDir, [
            '--whos',
            'theirs',
            'a.ts',
            'nonexistent.ts',
          ]);

          // fail-fast: exit non-zero immediately
          expect(result.status).not.toBe(0);
          // error message about not found
          expect(result.stdout).toContain('hold up dude');
          expect(result.stdout).toContain('file not found');
          expect(result.stdout).toContain('nonexistent.ts');
          // no "settled" section - we fail before any settle
          expect(result.stdout).not.toContain('settled');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given(
    '[case12] take lock file auto-runs lock refresh (negative - no package.json)',
    () => {
      when('[t0] take theirs pnpm-lock.yaml without package.json', () => {
        then('exit 2, shows failed with retry hint', () => {
          const tempDir = setupRebaseWithConflict({
            conflictFiles: ['pnpm-lock.yaml'],
            mainContent: { 'pnpm-lock.yaml': 'main lock content\n' },
            featureContent: { 'pnpm-lock.yaml': 'feature lock content\n' },
          });

          try {
            const result = runSkill(tempDir, [
              '--whos',
              'theirs',
              'pnpm-lock.yaml',
            ]);

            // exit 2 = constraint error (user must fix)
            expect(result.status).toBe(2);
            expect(result.stdout).toContain(
              'lock file detected, auto-run lock refresh',
            );
            expect(result.stdout).toContain('failed');
            expect(result.stdout).toContain(
              'try: rhx git.branch.rebase lock refresh',
            );
            expect(result.stdout).toContain('incomplete');
            expect(result.stdout).toMatchSnapshot();
          } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        });
      });

      when('[t1] take theirs package-lock.json without package.json', () => {
        then('exit 2, shows failed with retry hint', () => {
          const tempDir = setupRebaseWithConflict({
            conflictFiles: ['package-lock.json'],
            mainContent: { 'package-lock.json': '{"main": true}\n' },
            featureContent: { 'package-lock.json': '{"feature": true}\n' },
          });

          try {
            const result = runSkill(tempDir, [
              '--whos',
              'theirs',
              'package-lock.json',
            ]);

            // exit 2 = constraint error (user must fix)
            expect(result.status).toBe(2);
            expect(result.stdout).toContain(
              'lock file detected, auto-run lock refresh',
            );
            expect(result.stdout).toContain('failed');
            expect(result.stdout).toContain('try:');
            expect(result.stdout).toMatchSnapshot();
          } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        });
      });

      when('[t2] take theirs yarn.lock without package.json', () => {
        // .note = skip when yarn is installed: yarn install may succeed without package.json
        then.skipIf(isYarnInstalled)('exit 2, shows failed with retry hint', () => {
          const tempDir = setupRebaseWithConflict({
            conflictFiles: ['yarn.lock'],
            mainContent: { 'yarn.lock': 'main yarn lock\n' },
            featureContent: { 'yarn.lock': 'feature yarn lock\n' },
          });

          try {
            const result = runSkill(tempDir, ['--whos', 'theirs', 'yarn.lock']);

            // exit 2 = constraint error (user must fix)
            expect(result.status).toBe(2);
            expect(result.stdout).toContain(
              'lock file detected, auto-run lock refresh',
            );
            expect(result.stdout).toContain('failed');
            expect(result.stdout).toContain('try:');
            expect(result.stdout).toMatchSnapshot();
          } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        });
      });
    },
  );

  given(
    '[case13] take multiple files with lock (negative - no package.json)',
    () => {
      when('[t0] take theirs . (includes lock file)', () => {
        then('auto-run shown once, exit 2 on refresh failure', () => {
          const tempDir = setupRebaseWithConflict({
            conflictFiles: ['pnpm-lock.yaml', 'src/index.ts', 'README.md'],
            mainContent: {
              'pnpm-lock.yaml': 'main lock\n',
              'src/index.ts': 'main index\n',
              'README.md': 'main readme\n',
            },
            featureContent: {
              'pnpm-lock.yaml': 'feature lock\n',
              'src/index.ts': 'feature index\n',
              'README.md': 'feature readme\n',
            },
          });

          try {
            const result = runSkill(tempDir, ['--whos', 'theirs', '.']);

            // exit 2 because lock refresh fails
            expect(result.status).toBe(2);
            // auto-run message appears
            expect(result.stdout).toContain(
              'lock file detected, auto-run lock refresh',
            );
            // count occurrences - should be exactly one
            const autoRunCount = (
              result.stdout.match(
                /lock file detected, auto-run lock refresh/g,
              ) || []
            ).length;
            expect(autoRunCount).toBe(1);
            expect(result.stdout).toContain('try:');
            expect(result.stdout).toMatchSnapshot();
          } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        });
      });
    },
  );

  given('[case14] take non-lock file', () => {
    when('[t0] take theirs for .ts file only', () => {
      then('no lock refresh auto-run', () => {
        const tempDir = setupRebaseWithConflict({
          conflictFiles: ['src/index.ts'],
          mainContent: { 'src/index.ts': 'main code\n' },
          featureContent: { 'src/index.ts': 'feature code\n' },
        });

        try {
          const result = runSkill(tempDir, [
            '--whos',
            'theirs',
            'src/index.ts',
          ]);

          expect(result.status).toBe(0);
          expect(result.stdout).not.toContain('lock file detected');
          expect(result.stdout).not.toContain('auto-run lock refresh');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case15] take lock file with valid package.json (positive)', () => {
    when('[t0] take theirs pnpm-lock.yaml with package.json present', () => {
      then('lock refresh succeeds, exit 0', () => {
        // .note = use different placeholder content to create conflict
        // pnpm install will regenerate a valid lock file from package.json
        const tempDir = setupRebaseWithConflict({
          conflictFiles: ['pnpm-lock.yaml'],
          mainContent: { 'pnpm-lock.yaml': '# main lock\n' },
          featureContent: { 'pnpm-lock.yaml': '# feature lock\n' },
          // package.json with no deps - pnpm install will succeed and create valid lock
          extraFiles: {
            'package.json': JSON.stringify(
              { name: 'test-pkg', version: '1.0.0' },
              null,
              2,
            ),
          },
        });

        try {
          const result = runSkill(tempDir, [
            '--whos',
            'theirs',
            'pnpm-lock.yaml',
          ]);

          expect(result.status).toBe(0);
          expect(result.stdout).toContain(
            'lock file detected, auto-run lock refresh',
          );
          expect(result.stdout).toContain('done');
          expect(result.stdout).not.toContain('failed');
          expect(result.stdout).toMatchSnapshot();

          // verify lock file was regenerated and staged
          const gitStatus = spawnSync('git', ['status', '--porcelain'], {
            cwd: tempDir,
            encoding: 'utf-8',
          });
          // pnpm-lock.yaml should be staged (M = modified and staged)
          // node_modules/ will be untracked (??) which is expected
          expect(gitStatus.stdout).toContain('M  pnpm-lock.yaml');
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });
});
