import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = integration tests for mkdirsafe.sh skill
 * .why = verify safe directory creation works correctly with validation and edge cases
 */
describe('mkdirsafe.sh', () => {
  const scriptPath = path.join(__dirname, 'mkdirsafe.sh');

  /**
   * .what = run mkdirsafe.sh in a temp git repo
   * .why = isolates tests from real repo state
   */
  const runInTempGitRepo = (args: {
    files?: Record<string, string>;
    dirs?: string[];
    mkdirsafeArgs: string[];
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'mkdirsafe-test', git: true });

    // create directories
    if (args.dirs) {
      for (const dir of args.dirs) {
        fs.mkdirSync(path.join(tempDir, dir), { recursive: true });
      }
    }

    // create files
    if (args.files) {
      for (const [filePath, content] of Object.entries(args.files)) {
        const fullPath = path.join(tempDir, filePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
      }
    }

    // run mkdirsafe.sh
    const result = spawnSync('bash', [scriptPath, ...args.mkdirsafeArgs], {
      cwd: tempDir,
      encoding: 'utf-8', // node api param name
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
   * .what = sanitize stdout for snapshot stability
   * .why = temp dir paths change between runs
   */
  const sanitizeOutput = (stdout: string): string =>
    stdout.replace(/\/tmp\/[^\s]+/g, '/tmp/TEMP_DIR');

  given('[case1] basic directory creation', () => {
    when('[t0] single directory with --path', () => {
      then('directory is created', () => {
        const result = runInTempGitRepo({
          mkdirsafeArgs: ['--path', 'src'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('sweet');
        expect(result.stdout).toContain('directories: 1');
        expect(fs.existsSync(path.join(result.tempDir, 'src'))).toBe(true);
      });
    });

    when('[t1] single directory as positional arg', () => {
      then('directory is created', () => {
        const result = runInTempGitRepo({
          mkdirsafeArgs: ['src'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('sweet');
        expect(fs.existsSync(path.join(result.tempDir, 'src'))).toBe(true);
      });
    });

    when('[t2] output shows turtle header and tree structure', () => {
      then('turtle vibes present', () => {
        const result = runInTempGitRepo({
          mkdirsafeArgs: ['--path', 'newdir'],
        });

        expect(result.stdout).toContain('🐢');
        expect(result.stdout).toContain('🐚 mkdirsafe');
        expect(result.stdout).toContain('path: newdir');
      });
    });
  });

  given('[case2] parent directory creation with -p', () => {
    when('[t0] nested path with --parents', () => {
      then('all parent directories are created', () => {
        const result = runInTempGitRepo({
          mkdirsafeArgs: ['--path', 'a/b/c/d', '--parents'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('sweet');
        expect(result.stdout).toContain('parents: true');
        expect(fs.existsSync(path.join(result.tempDir, 'a/b/c/d'))).toBe(true);
      });
    });

    when('[t1] nested path with -p shorthand', () => {
      then('all parent directories are created', () => {
        const result = runInTempGitRepo({
          mkdirsafeArgs: ['-p', '--path', 'x/y/z'],
        });

        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(path.join(result.tempDir, 'x/y/z'))).toBe(true);
      });
    });

    when('[t2] nested path without -p', () => {
      then('exits with constraint error', () => {
        const result = runInTempGitRepo({
          mkdirsafeArgs: ['--path', 'a/b/c'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('parent directory does not exist');
        expect(result.stdout).toContain('--parents');
      });
    });
  });

  given('[case3] directory already present', () => {
    when('[t0] target directory already present', () => {
      then('reports zero created', () => {
        const result = runInTempGitRepo({
          dirs: ['src'],
          mkdirsafeArgs: ['--path', 'src'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('already here');
        expect(result.stdout).toContain('directories: 0');
      });
    });
  });

  given('[case4] multiple directories', () => {
    when('[t0] multiple --path args', () => {
      then('all directories are created', () => {
        const result = runInTempGitRepo({
          mkdirsafeArgs: ['--path', 'src', '--path', 'test', '--path', 'docs'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('sweet');
        expect(result.stdout).toContain('paths: 3');
        expect(fs.existsSync(path.join(result.tempDir, 'src'))).toBe(true);
        expect(fs.existsSync(path.join(result.tempDir, 'test'))).toBe(true);
        expect(fs.existsSync(path.join(result.tempDir, 'docs'))).toBe(true);
      });
    });

    when('[t1] multiple positional args', () => {
      then('all directories are created', () => {
        const result = runInTempGitRepo({
          mkdirsafeArgs: ['src', 'test'],
        });

        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(path.join(result.tempDir, 'src'))).toBe(true);
        expect(fs.existsSync(path.join(result.tempDir, 'test'))).toBe(true);
      });
    });
  });

  given('[case5] argument validation', () => {
    when('[t0] no path provided', () => {
      then('exits with constraint error', () => {
        const result = runInTempGitRepo({
          mkdirsafeArgs: [],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('--path is required');
      });
    });

    when('[t1] unknown option provided', () => {
      then('exits with constraint error', () => {
        const result = runInTempGitRepo({
          mkdirsafeArgs: ['--unknown', 'value'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('unknown option');
      });
    });

    when('[t2] --help flag', () => {
      then('shows usage info and exits 0', () => {
        const result = runInTempGitRepo({
          mkdirsafeArgs: ['--help'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('usage:');
        expect(result.stdout).toContain('--path');
        expect(result.stdout).toContain('--parents');
      });
    });
  });

  given('[case6] safety boundary - path outside repo', () => {
    when('[t0] absolute path outside repo', () => {
      then('exits with constraint error', () => {
        const result = runInTempGitRepo({
          mkdirsafeArgs: ['--path', '/tmp/outside-repo', '-p'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'path must be within the git repository',
        );
      });
    });

    when('[t1] relative path that traverses outside repo', () => {
      then('exits with constraint error', () => {
        const result = runInTempGitRepo({
          mkdirsafeArgs: ['--path', '../../outside', '-p'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'path must be within the git repository',
        );
      });
    });
  });

  given('[case7] not in git repo', () => {
    when('[t0] run outside any git repo', () => {
      then('exits with constraint error', () => {
        const tempDir = genTempDir({ slug: 'mkdirsafe-no-git' });

        const result = spawnSync('bash', [scriptPath, '--path', 'somedir'], {
          cwd: tempDir,
          encoding: 'utf-8', // node api param name
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('not in a git repository');
      });
    });
  });

  given('[case8] special characters in paths', () => {
    when('[t0] directory name has spaces', () => {
      then('directory is created correctly', () => {
        const result = runInTempGitRepo({
          mkdirsafeArgs: ['--path', 'my dir'],
        });

        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(path.join(result.tempDir, 'my dir'))).toBe(true);
      });
    });

    when('[t1] directory name has unicode', () => {
      then('directory is created correctly', () => {
        const result = runInTempGitRepo({
          mkdirsafeArgs: ['--path', '日本語'],
        });

        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(path.join(result.tempDir, '日本語'))).toBe(true);
      });
    });
  });

  given('[case9] output format snapshots', () => {
    when('[t0] directory created', () => {
      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          mkdirsafeArgs: ['--path', 'src'],
        });

        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] directory already present', () => {
      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          dirs: ['src'],
          mkdirsafeArgs: ['--path', 'src'],
        });

        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] nested with parents', () => {
      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          mkdirsafeArgs: ['--path', 'a/b/c', '-p'],
        });

        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });
});
