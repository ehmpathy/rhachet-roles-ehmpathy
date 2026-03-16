import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = integration tests for git.stage.add.sh
 * .why = verify stage permission gate and file stage works correctly
 */
describe('git.stage.add.sh', () => {
  const scriptPath = path.join(__dirname, 'git.stage.add.sh');

  const runInTempGitRepo = (args: {
    args: string[];
    files?: Record<string, string>;
    meterState?: { uses: number | string; push: string; stage?: string };
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'git-stage-add-test', git: true });

    // configure git user
    spawnSync('git', ['config', 'user.name', 'Test Human'], { cwd: tempDir });
    spawnSync('git', ['config', 'user.email', 'human@test.com'], {
      cwd: tempDir,
    });

    // create .meter state
    if (args.meterState) {
      const meterDir = path.join(tempDir, '.meter');
      fs.mkdirSync(meterDir, { recursive: true });
      fs.writeFileSync(
        path.join(meterDir, 'git.commit.uses.jsonc'),
        JSON.stringify(args.meterState, null, 2),
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

    const result = spawnSync('bash', [scriptPath, ...args.args], {
      cwd: tempDir,
      encoding: 'utf-8' as const,
      stdio: ['pipe', 'pipe', 'pipe'],
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
    meterState?: { uses: number | string; push: string; stage?: string };
    globalBlocker?: boolean;
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
    spawnSync('git', ['config', 'user.name', 'Test Human'], { cwd: tempDir });
    spawnSync('git', ['config', 'user.email', 'human@test.com'], {
      cwd: tempDir,
    });

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
    if (args.globalBlocker) {
      fs.mkdirSync(globalMeterDir, { recursive: true });
      fs.writeFileSync(
        path.join(globalMeterDir, 'git.commit.uses.jsonc'),
        JSON.stringify({ blocked: true }, null, 2),
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
          meterState: { uses: 5, push: 'allow', stage: 'allow' },
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
          meterState: { uses: 5, push: 'allow', stage: 'allow' },
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
          meterState: { uses: 5, push: 'allow', stage: 'allow' },
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

  given('[case3] stage without permission', () => {
    when('[t0] stage is blocked', () => {
      then('error: stage not allowed', () => {
        const result = runInTempGitRepo({
          args: ['test.txt'],
          files: { 'test.txt': 'content' },
          meterState: { uses: 5, push: 'allow', stage: 'block' },
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('hold up dude');
        expect(result.stdout).toContain('error: stage not allowed');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] no stage field (legacy state)', () => {
      then('error: stage not allowed (defaults to block)', () => {
        const result = runInTempGitRepo({
          args: ['test.txt'],
          files: { 'test.txt': 'content' },
          meterState: { uses: 5, push: 'allow' },
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('error: stage not allowed');
      });
    });

    when('[t2] no quota file', () => {
      then('error: stage not allowed', () => {
        const result = runInTempGitRepo({
          args: ['test.txt'],
          files: { 'test.txt': 'content' },
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('error: stage not allowed');
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
          meterState: { uses: 5, push: 'allow', stage: 'allow' },
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('error: file not found: absent.ts');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] second file does not exist (atomic failure)', () => {
      then('error and first file not staged', () => {
        const result = runInTempGitRepo({
          args: ['file1.ts', 'absent.ts'],
          files: { 'file1.ts': 'content' },
          meterState: { uses: 5, push: 'allow', stage: 'allow' },
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('error: file not found: absent.ts');

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
        spawnSync('git', ['config', 'user.name', 'Test Human'], {
          cwd: tempDir,
        });
        spawnSync('git', ['config', 'user.email', 'human@test.com'], {
          cwd: tempDir,
        });

        // create meter
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 5, push: 'allow', stage: 'allow' }, null, 2),
        );

        // create and stage file
        fs.writeFileSync(path.join(tempDir, 'test.txt'), 'content');
        spawnSync('git', ['add', 'test.txt'], { cwd: tempDir });

        // run stage again
        const result = spawnSync('bash', [scriptPath, 'test.txt'], {
          cwd: tempDir,
          encoding: 'utf-8' as const,
          stdio: ['pipe', 'pipe', 'pipe'],
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
          meterState: { uses: 5, push: 'allow', stage: 'allow' },
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('error: path must be within repo');
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
          meterState: { uses: 5, push: 'allow', stage: 'allow' },
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('error: no files specified');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  // ========================================
  // global blocked
  // ========================================

  given('[case8] global blocker', () => {
    when('[t0] global blocker is active', () => {
      then('error: globally blocked', () => {
        const result = runWithGlobalStorage({
          args: ['test.txt'],
          files: { 'test.txt': 'content' },
          meterState: { uses: 5, push: 'allow', stage: 'allow' },
          globalBlocker: true,
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('error: globally blocked');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });
});
