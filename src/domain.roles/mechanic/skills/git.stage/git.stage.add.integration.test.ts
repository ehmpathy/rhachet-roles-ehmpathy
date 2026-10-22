import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

/**
 * .what = integration tests for git.stage.add.sh
 * .why = verify stage permission gate and file stage works correctly
 */
describe('git.stage.add.sh', () => {
  const scriptPath = path.join(__dirname, 'git.stage.add.sh');

  const runInTempGitRepo = (args: {
    args: string[];
    files?: Record<string, string>;
    meterState?: {
      uses: number | string;
      held?: boolean;
      push?: string;
      stage?: string;
    };
    meterRaw?: string;
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'git-stage-add-test', git: true });

    // configure git user
    configureTestGitUser({ cwd: tempDir });

    // create .meter state; raw bytes drive the damaged-file branch
    if (args.meterState || args.meterRaw !== undefined) {
      const meterDir = path.join(tempDir, '.meter');
      fs.mkdirSync(meterDir, { recursive: true });
      fs.writeFileSync(
        path.join(meterDir, 'git.commit.uses.jsonc'),
        args.meterRaw ?? JSON.stringify(args.meterState, null, 2),
      );
    }

    // create test files
    if (args.files) {
      for (const [filePath, content] of Object.entries(args.files)) {
        const fullPath = path.join(tempDir, filePath);
        const dir = path.dirname(fullPath);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fullPath, content);
      }
    }

    // isolate HOME to prevent host global blocker from test interference
    const tempHome = genTempDir({ slug: 'git-stage-home', git: false });

    const result = spawnSync('bash', [scriptPath, ...args.args], {
      cwd: tempDir,
      encoding: 'utf-8' as const, // node api requires this exact string
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, HOME: tempHome },
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      tempDir,
    };
  };

  /**
   * .what = run with isolated HOME for global storage tests
   */
  const runWithGlobalStorage = (args: {
    args: string[];
    files?: Record<string, string>;
    meterState?: {
      uses: number | string;
      held?: boolean;
      push?: string;
      stage?: string;
    };
    globalBlocker?: boolean;
    // raw bytes for the global blocker file, written INSTEAD of globalBlocker
    globalRaw?: string;
    rebaseInProgress?: boolean;
  }): {
    stdout: string;
    stderr: string;
    exitCode: number;
    tempDir: string;
    tempHome: string;
  } => {
    const tempDir = genTempDir({ slug: 'git-stage-add-test', git: true });
    const tempHome = genTempDir({ slug: 'git-stage-add-home', git: false });
    const globalMeterDir = path.join(
      tempHome,
      '.rhachet',
      'storage',
      'repo=ehmpathy',
      'role=mechanic',
      '.meter',
    );

    // configure git user
    configureTestGitUser({ cwd: tempDir });

    // create local .meter state
    if (args.meterState) {
      const meterDir = path.join(tempDir, '.meter');
      fs.mkdirSync(meterDir, { recursive: true });
      fs.writeFileSync(
        path.join(meterDir, 'git.commit.uses.jsonc'),
        JSON.stringify(args.meterState, null, 2),
      );
    }

    // create global blocker
    if (args.globalBlocker || args.globalRaw !== undefined) {
      fs.mkdirSync(globalMeterDir, { recursive: true });
      fs.writeFileSync(
        path.join(globalMeterDir, 'git.commit.uses.jsonc'),
        args.globalRaw ?? JSON.stringify({ blocked: true }, null, 2),
      );
    }

    // simulate a rebase in progress (the probe reads .git/rebase-merge)
    if (args.rebaseInProgress) {
      fs.mkdirSync(path.join(tempDir, '.git', 'rebase-merge'), {
        recursive: true,
      });
    }

    // create test files
    if (args.files) {
      for (const [filePath, content] of Object.entries(args.files)) {
        const fullPath = path.join(tempDir, filePath);
        const dir = path.dirname(fullPath);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fullPath, content);
      }
    }

    const result = spawnSync('bash', [scriptPath, ...args.args], {
      cwd: tempDir,
      encoding: 'utf-8' as const,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, HOME: tempHome },
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      tempDir,
      tempHome,
    };
  };

  // ========================================
  // stage specific files
  // ========================================

  given('[case1] stage specific files', () => {
    when('[t0] files exist and stage is allowed', () => {
      then('files are staged', () => {
        const result = runInTempGitRepo({
          args: ['src/file1.ts', 'src/file2.ts'],
          files: {
            'src/file1.ts': 'content1',
            'src/file2.ts': 'content2',
          },
          meterState: { uses: 5, held: true },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('gnarly');
        expect(result.stdout).toContain('staged');
        expect(result.stdout).toContain('src/file1.ts');
        expect(result.stdout).toContain('src/file2.ts');

        // verify files are staged
        const statusResult = spawnSync('git', ['status', '--porcelain'], {
          cwd: result.tempDir,
          encoding: 'utf-8' as const,
        });
        expect(statusResult.stdout).toContain('A  src/file1.ts');
        expect(statusResult.stdout).toContain('A  src/file2.ts');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] single file', () => {
      then('shows singular staged output', () => {
        const result = runInTempGitRepo({
          args: ['test.txt'],
          files: { 'test.txt': 'content' },
          meterState: { uses: 5, held: true },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('staged: test.txt');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  // ========================================
  // stage all with .
  // ========================================

  given('[case2] stage all with dot', () => {
    when('[t0] stage with . (current directory)', () => {
      then('all files in cwd are staged', () => {
        const result = runInTempGitRepo({
          args: ['.'],
          files: {
            'file1.ts': 'content1',
            'file2.ts': 'content2',
            'src/nested.ts': 'content3',
          },
          meterState: { uses: 5, held: true },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('gnarly');
        expect(result.stdout).toContain('staged: .');

        // verify all files are staged
        const statusResult = spawnSync('git', ['status', '--porcelain'], {
          cwd: result.tempDir,
          encoding: 'utf-8' as const,
        });
        expect(statusResult.stdout).toContain('A  file1.ts');
        expect(statusResult.stdout).toContain('A  file2.ts');
        expect(statusResult.stdout).toContain('A  src/nested.ts');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  // ========================================
  // no permission
  // ========================================

  given('[case3] stage without a live commit grant', () => {
    when('[t0] the commit grant was revoked', () => {
      then('ConstraintError: no live commit grant', () => {
        const result = runInTempGitRepo({
          args: ['test.txt'],
          files: { 'test.txt': 'content' },
          meterState: { uses: 0, held: false },
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('hold up dude');
        expect(result.stdout).toContain(
          'ConstraintError: no live commit grant',
        );
        expect(result.stdout).toContain('git.commit.uses set --quant N');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] the commit grant is held but depleted', () => {
      then('ConstraintError: no live commit grant', () => {
        const result = runInTempGitRepo({
          args: ['test.txt'],
          files: { 'test.txt': 'content' },
          meterState: { uses: 0, held: true },
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'ConstraintError: no live commit grant',
        );
      });
    });

    when('[t2] no quota file', () => {
      then('ConstraintError: no live commit grant', () => {
        const result = runInTempGitRepo({
          args: ['test.txt'],
          files: { 'test.txt': 'content' },
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'ConstraintError: no live commit grant',
        );
      });
    });

    when('[t3] a legacy grant with no stage field', () => {
      then('stage rides the commit grant and proceeds', () => {
        const result = runInTempGitRepo({
          args: ['test.txt'],
          files: { 'test.txt': 'content' },
          meterState: { uses: 5, push: 'allow' },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('staged: test.txt');
      });
    });

    when('[t3b] a legacy grant whose retired stage field reads block', () => {
      then(
        'stage rides the live commit grant; the retired field gates naught (F12)',
        () => {
          const result = runInTempGitRepo({
            args: ['test.txt'],
            files: { 'test.txt': 'content' },
            meterState: { uses: 5, push: 'allow', stage: 'block' },
          });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('staged: test.txt');
        },
      );

      then('the same file at 0 uses left still refuses', () => {
        const result = runInTempGitRepo({
          args: ['test.txt'],
          files: { 'test.txt': 'content' },
          meterState: { uses: 0, push: 'block', stage: 'block' },
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('ConstraintError');
      });
    });

    when('[t4] a release grant alone, no commit grant', () => {
      then('ConstraintError: a release stamp carries no commit auth', () => {
        const result = runInTempGitRepo({
          args: ['test.txt'],
          files: {
            'test.txt': 'content',
            '.meter/git.release.uses.jsonc': '{ "uses": "infinite" }',
          },
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'ConstraintError: no live commit grant',
        );
      });
    });
  });

  // ========================================
  // file not found
  // ========================================

  given('[case4] file not found', () => {
    when('[t0] file does not exist', () => {
      then('error: file not found', () => {
        const result = runInTempGitRepo({
          args: ['absent.ts'],
          meterState: { uses: 5, held: true },
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'ConstraintError: file not found: absent.ts',
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] second file does not exist (atomic failure)', () => {
      then('error and first file not staged', () => {
        const result = runInTempGitRepo({
          args: ['file1.ts', 'absent.ts'],
          files: { 'file1.ts': 'content' },
          meterState: { uses: 5, held: true },
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'ConstraintError: file not found: absent.ts',
        );

        // verify file1 is NOT staged (fail-fast)
        const statusResult = spawnSync('git', ['status', '--porcelain'], {
          cwd: result.tempDir,
          encoding: 'utf-8' as const,
        });
        expect(statusResult.stdout).not.toContain('A  file1.ts');
      });
    });
  });

  // ========================================
  // already staged (idempotent)
  // ========================================

  given('[case5] already staged', () => {
    when('[t0] file is already staged', () => {
      then('operation succeeds (no-op)', () => {
        const tempDir = genTempDir({ slug: 'git-stage-add-test', git: true });
        configureTestGitUser({ cwd: tempDir });

        // create meter
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 5, held: true }, null, 2),
        );

        // create and stage file
        fs.writeFileSync(path.join(tempDir, 'test.txt'), 'content');
        spawnSync('git', ['add', 'test.txt'], { cwd: tempDir });

        // run stage again (isolate HOME to prevent global blocker)
        const tempHome = genTempDir({ slug: 'git-stage-home', git: false });
        const result = spawnSync('bash', [scriptPath, 'test.txt'], {
          cwd: tempDir,
          encoding: 'utf-8' as const, // node api requires this exact string
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, HOME: tempHome },
        });

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('gnarly');
      });
    });
  });

  // ========================================
  // path outside repo
  // ========================================

  given('[case6] path outside repo', () => {
    when('[t0] absolute path outside repo', () => {
      then('error: path must be within repo', () => {
        const result = runInTempGitRepo({
          args: ['/etc/passwd'],
          meterState: { uses: 5, held: true },
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'ConstraintError: path must be within repo',
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  // ========================================
  // no files
  // ========================================

  given('[case7] no files specified', () => {
    when('[t0] no args', () => {
      then('error: no files specified', () => {
        const result = runInTempGitRepo({
          args: [],
          meterState: { uses: 5, held: true },
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('ConstraintError: no files specified');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  // ========================================
  // global blocked
  // ========================================

  given('[case8] global blocker', () => {
    when('[t0] global blocker is active', () => {
      then('ConstraintError: globally blocked', () => {
        const result = runWithGlobalStorage({
          args: ['test.txt'],
          files: { 'test.txt': 'content' },
          meterState: { uses: 5, held: true },
          globalBlocker: true,
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('ConstraintError: globally blocked');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] the global blocker file is damaged (0 bytes)', () => {
      then('malfunction: fails closed, exit 1, stages naught', () => {
        const result = runWithGlobalStorage({
          args: ['test.txt'],
          files: { 'test.txt': 'content' },
          meterState: { uses: 5, held: true },
          globalRaw: '',
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain(
          'MalfunctionError: global blocker file corrupt',
        );
        expect(result.stderr).toContain('global blocker file corrupt');
        const statusResult = spawnSync('git', ['status', '--porcelain'], {
          cwd: result.tempDir,
          encoding: 'utf-8' as const,
        });
        expect(statusResult.stdout).not.toContain('A  test.txt');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  // ========================================
  // damaged local quota
  // ========================================

  given('[case10] the local commit quota file is damaged', () => {
    when('[t0] stage reads a truncated quota file', () => {
      then('malfunction: names the file, fails closed, stages naught', () => {
        const result = runInTempGitRepo({
          args: ['test.txt'],
          files: { 'test.txt': 'content' },
          meterRaw: '{ "uses": 3, "pu',
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain(
          '💥 MalfunctionError: commit quota file corrupt',
        );
        expect(result.stderr).toContain(
          '💥 MalfunctionError: commit quota file corrupt',
        );
        const statusResult = spawnSync('git', ['status', '--porcelain'], {
          cwd: result.tempDir,
          encoding: 'utf-8' as const, // node api requires this exact string
        });
        expect(statusResult.stdout).not.toContain('A  test.txt');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  // ========================================
  // help
  // ========================================

  given('[case11] --help', () => {
    when('[t0] help is asked for', () => {
      then('names the grant constraints, matches snapshot', () => {
        const result = runInTempGitRepo({ args: ['--help'] });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          'out of a rebase, requires a live commit grant',
        );
        expect(result.stdout).toContain('mid-rebase, reads no meter');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  // ========================================
  // mid-rebase (F12)
  // ========================================

  given('[case9] a rebase is in progress', () => {
    when('[t0] no local grant and a global blocker', () => {
      then('stage reads no meter and marks the file done', () => {
        const result = runWithGlobalStorage({
          args: ['test.txt'],
          files: { 'test.txt': 'content' },
          globalBlocker: true,
          rebaseInProgress: true,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('staged: test.txt');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });
});
