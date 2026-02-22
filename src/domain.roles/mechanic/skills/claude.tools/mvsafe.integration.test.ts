import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = integration tests for mvsafe.sh skill
 * .why = verify safe file move works correctly in all modes and edge cases
 */
describe('mvsafe.sh', () => {
  const scriptPath = path.join(__dirname, 'mvsafe.sh');

  /**
   * .what = helper to run mvsafe.sh in a temp git repo
   * .why = isolates tests from real repo state
   */
  const runInTempGitRepo = (args: {
    files?: Record<string, string>;
    symlinks?: Record<string, string>;
    mvsafeArgs: string[];
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'mvsafe-test', git: true });

    // create files
    if (args.files) {
      for (const [filePath, content] of Object.entries(args.files)) {
        const fullPath = path.join(tempDir, filePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
      }
    }

    // create symlinks
    if (args.symlinks) {
      for (const [linkPath, target] of Object.entries(args.symlinks)) {
        const fullPath = path.join(tempDir, linkPath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.symlinkSync(target, fullPath);
      }
    }

    // run mvsafe.sh
    const result = spawnSync('bash', [scriptPath, ...args.mvsafeArgs], {
      cwd: tempDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      tempDir,
    };
  };

  given('[case1] positional args (like mv)', () => {
    when('[t0] two positional args provided', () => {
      then('file is moved', () => {
        const result = runInTempGitRepo({
          files: { 'source.txt': 'hello world' },
          mvsafeArgs: ['./source.txt', './dest.txt'],
        });

        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(path.join(result.tempDir, 'source.txt'))).toBe(
          false,
        );
        expect(fs.existsSync(path.join(result.tempDir, 'dest.txt'))).toBe(true);
      });

      then('content is preserved', () => {
        const result = runInTempGitRepo({
          files: { 'source.txt': 'hello world' },
          mvsafeArgs: ['./source.txt', './dest.txt'],
        });

        const content = fs.readFileSync(
          path.join(result.tempDir, 'dest.txt'),
          'utf-8',
        );
        expect(content).toBe('hello world');
      });

      then('output shows relative paths', () => {
        const result = runInTempGitRepo({
          files: { 'source.txt': 'hello world' },
          mvsafeArgs: ['./source.txt', './dest.txt'],
        });

        expect(result.stdout).toContain('moved:');
        expect(result.stdout).toContain('source.txt');
        expect(result.stdout).toContain('dest.txt');
      });
    });
  });

  given('[case2] named args (--from, --into)', () => {
    when('[t0] both named args provided', () => {
      then('file is moved', () => {
        const result = runInTempGitRepo({
          files: { 'source.txt': 'named args test' },
          mvsafeArgs: ['--from', './source.txt', '--into', './dest.txt'],
        });

        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(path.join(result.tempDir, 'source.txt'))).toBe(
          false,
        );
        expect(fs.existsSync(path.join(result.tempDir, 'dest.txt'))).toBe(true);
      });
    });

    when('[t1] named args in reverse order', () => {
      then('file is moved correctly', () => {
        const result = runInTempGitRepo({
          files: { 'source.txt': 'reverse order test' },
          mvsafeArgs: ['--into', './dest.txt', '--from', './source.txt'],
        });

        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(path.join(result.tempDir, 'dest.txt'))).toBe(true);
        const content = fs.readFileSync(
          path.join(result.tempDir, 'dest.txt'),
          'utf-8',
        );
        expect(content).toBe('reverse order test');
      });
    });

    when('[t2] only --from provided', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          files: { 'source.txt': 'content' },
          mvsafeArgs: ['--from', './source.txt'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          '--into is required when --from is specified',
        );
      });
    });

    when('[t3] only --into provided', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          files: { 'source.txt': 'content' },
          mvsafeArgs: ['--into', './dest.txt'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          '--from is required when --into is specified',
        );
      });
    });
  });

  given('[case3] argument validation', () => {
    when('[t0] no arguments provided', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          mvsafeArgs: [],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('source path is required');
      });

      then('shows usage', () => {
        const result = runInTempGitRepo({
          mvsafeArgs: [],
        });

        expect(result.stdout).toContain('usage:');
        expect(result.stdout).toContain('mvsafe.sh');
      });
    });

    when('[t1] only source provided', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          files: { 'source.txt': 'content' },
          mvsafeArgs: ['./source.txt'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('destination path is required');
      });
    });

    when('[t2] unknown option provided', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          files: { 'source.txt': 'content' },
          mvsafeArgs: ['--unknown', 'value'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('unknown option');
      });
    });
  });

  given('[case4] source validation', () => {
    when('[t0] source does not exist', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          mvsafeArgs: ['./nonexistent.txt', './dest.txt'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('source does not exist');
      });
    });
  });

  given('[case5] safety boundary - source outside repo', () => {
    when('[t0] source path is absolute outside repo', () => {
      then('exits with error', () => {
        // create a temp file outside the test repo
        const outsideFile = path.join('/tmp', `mvsafe-test-${Date.now()}.txt`);
        fs.writeFileSync(outsideFile, 'outside content');

        try {
          const result = runInTempGitRepo({
            mvsafeArgs: [outsideFile, './dest.txt'],
          });

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            'source must be within the git repository',
          );
        } finally {
          fs.unlinkSync(outsideFile);
        }
      });
    });

    when('[t1] source is symlink that resolves outside repo', () => {
      then('exits with error', () => {
        // create a temp file outside the test repo
        const outsideFile = path.join('/tmp', `mvsafe-test-${Date.now()}.txt`);
        fs.writeFileSync(outsideFile, 'outside content');

        try {
          const result = runInTempGitRepo({
            symlinks: { 'sneaky-link.txt': outsideFile },
            mvsafeArgs: ['./sneaky-link.txt', './dest.txt'],
          });

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            'source must be within the git repository',
          );
        } finally {
          fs.unlinkSync(outsideFile);
        }
      });
    });

    when('[t2] source is in adjacent directory with repo-prefix name', () => {
      then('exits with error (prevents /repo from match of /repo-evil)', () => {
        // this tests the critical vulnerability: /tmp/myrepo should not match /tmp/myrepo-evil
        const tempDir = genTempDir({ slug: 'mvsafe-test', git: true });
        const adjacentDir = `${tempDir}-evil`;
        fs.mkdirSync(adjacentDir, { recursive: true });
        const outsideFile = path.join(adjacentDir, 'source.txt');
        fs.writeFileSync(outsideFile, 'should not be moved');

        try {
          const result = spawnSync(
            'bash',
            [scriptPath, outsideFile, './dest.txt'],
            {
              cwd: tempDir,
              encoding: 'utf-8',
              stdio: ['pipe', 'pipe', 'pipe'],
            },
          );

          expect(result.status).toBe(2);
          expect(result.stdout).toContain(
            'source must be within the git repository',
          );
          // verify file was NOT moved
          expect(fs.existsSync(outsideFile)).toBe(true);
        } finally {
          fs.rmSync(adjacentDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case6] safety boundary - dest outside repo', () => {
    when('[t0] dest path is absolute outside repo', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          files: { 'source.txt': 'content' },
          mvsafeArgs: ['./source.txt', '/tmp/outside-dest.txt'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'destination must be within the git repository',
        );
      });
    });

    when('[t1] dest parent is symlink that resolves outside repo', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          files: { 'source.txt': 'content' },
          symlinks: { 'sneaky-dir': '/tmp' },
          mvsafeArgs: ['./source.txt', './sneaky-dir/dest.txt'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'destination must be within the git repository',
        );
      });
    });

    when('[t2] dest uses .. to escape repo', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          files: { 'source.txt': 'content' },
          mvsafeArgs: ['./source.txt', '../../../tmp/escaped.txt'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'destination must be within the git repository',
        );
      });
    });

    when('[t3] dest is in adjacent directory with repo-prefix name', () => {
      then('exits with error (prevents /repo from match of /repo-evil)', () => {
        // this tests the critical vulnerability: /tmp/myrepo should not match /tmp/myrepo-evil
        const tempDir = genTempDir({ slug: 'mvsafe-test', git: true });
        fs.writeFileSync(path.join(tempDir, 'source.txt'), 'content');
        const adjacentDir = `${tempDir}-evil`;
        fs.mkdirSync(adjacentDir, { recursive: true });
        const outsideDest = path.join(adjacentDir, 'dest.txt');

        try {
          const result = spawnSync(
            'bash',
            [scriptPath, './source.txt', outsideDest],
            {
              cwd: tempDir,
              encoding: 'utf-8',
              stdio: ['pipe', 'pipe', 'pipe'],
            },
          );

          expect(result.status).toBe(2);
          expect(result.stdout).toContain(
            'destination must be within the git repository',
          );
          // verify file was NOT created in adjacent dir
          expect(fs.existsSync(outsideDest)).toBe(false);
        } finally {
          fs.rmSync(adjacentDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case7] parent directory creation', () => {
    when('[t0] dest parent does not exist', () => {
      then('parent directories are created', () => {
        const result = runInTempGitRepo({
          files: { 'source.txt': 'content' },
          mvsafeArgs: ['./source.txt', './deep/nested/dir/dest.txt'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          fs.existsSync(path.join(result.tempDir, 'deep/nested/dir')),
        ).toBe(true);
      });

      then('file is moved to nested location', () => {
        const result = runInTempGitRepo({
          files: { 'source.txt': 'nested content' },
          mvsafeArgs: ['./source.txt', './deep/nested/dir/dest.txt'],
        });

        const content = fs.readFileSync(
          path.join(result.tempDir, 'deep/nested/dir/dest.txt'),
          'utf-8',
        );
        expect(content).toBe('nested content');
      });

      then('output mentions directory creation', () => {
        const result = runInTempGitRepo({
          files: { 'source.txt': 'content' },
          mvsafeArgs: ['./source.txt', './deep/nested/dir/dest.txt'],
        });

        expect(result.stdout).toContain('create directory');
      });
    });
  });

  given('[case8] move directories', () => {
    when('[t0] source is a directory', () => {
      then('entire directory is moved', () => {
        const result = runInTempGitRepo({
          files: {
            'srcdir/file1.txt': 'content 1',
            'srcdir/file2.txt': 'content 2',
            'srcdir/subdir/file3.txt': 'content 3',
          },
          mvsafeArgs: ['./srcdir', './destdir'],
        });

        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(path.join(result.tempDir, 'srcdir'))).toBe(false);
        expect(fs.existsSync(path.join(result.tempDir, 'destdir'))).toBe(true);
        expect(
          fs.existsSync(path.join(result.tempDir, 'destdir/file1.txt')),
        ).toBe(true);
        expect(
          fs.existsSync(path.join(result.tempDir, 'destdir/subdir/file3.txt')),
        ).toBe(true);
      });
    });
  });

  given('[case9] move into directory', () => {
    when('[t0] dest is a directory that exists', () => {
      then('file is moved into directory', () => {
        const result = runInTempGitRepo({
          files: {
            'source.txt': 'content',
            'destdir/.gitkeep': '',
          },
          mvsafeArgs: ['./source.txt', './destdir/'],
        });

        expect(result.exitCode).toBe(0);
        // mv behavior: moves source.txt into destdir/
        expect(fs.existsSync(path.join(result.tempDir, 'source.txt'))).toBe(
          false,
        );
        expect(
          fs.existsSync(path.join(result.tempDir, 'destdir/source.txt')),
        ).toBe(true);
      });
    });
  });

  given('[case10] overwrite behavior', () => {
    when('[t0] dest file already exists', () => {
      then('dest is overwritten', () => {
        const result = runInTempGitRepo({
          files: {
            'source.txt': 'new content',
            'dest.txt': 'old content',
          },
          mvsafeArgs: ['./source.txt', './dest.txt'],
        });

        expect(result.exitCode).toBe(0);
        const content = fs.readFileSync(
          path.join(result.tempDir, 'dest.txt'),
          'utf-8',
        );
        expect(content).toBe('new content');
      });
    });
  });

  given('[case11] symlink as source (valid within repo)', () => {
    when('[t0] source is symlink to file within repo', () => {
      then('symlink itself is moved', () => {
        const result = runInTempGitRepo({
          files: { 'real-file.txt': 'real content' },
          symlinks: { 'link-to-file.txt': 'real-file.txt' },
          mvsafeArgs: ['./link-to-file.txt', './dest.txt'],
        });

        // symlink itself is moved (not the target)
        expect(result.exitCode).toBe(0);
        expect(
          fs.existsSync(path.join(result.tempDir, 'link-to-file.txt')),
        ).toBe(false);
      });
    });
  });

  given('[case12] not in git repo', () => {
    when('[t0] run outside any git repo', () => {
      then('exits with error', () => {
        const tempDir = genTempDir({ slug: 'mvsafe-no-git' });

        // create a file but no git init
        fs.writeFileSync(path.join(tempDir, 'source.txt'), 'content');

        const result = spawnSync(
          'bash',
          [scriptPath, './source.txt', './dest.txt'],
          {
            cwd: tempDir,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('not in a git repository');
      });
    });
  });

  given('[case13] symlink chain resolution', () => {
    when('[t0] source path contains symlink that escapes repo', () => {
      then('symlink is resolved for boundary check', () => {
        // create external target
        const outsideDir = path.join('/tmp', `mvsafe-chain-${Date.now()}`);
        fs.mkdirSync(outsideDir, { recursive: true });
        fs.writeFileSync(path.join(outsideDir, 'file.txt'), 'outside content');

        try {
          const result = runInTempGitRepo({
            symlinks: { 'link-to-outside': outsideDir },
            mvsafeArgs: ['./link-to-outside/file.txt', './dest.txt'],
          });

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            'source must be within the git repository',
          );
        } finally {
          fs.rmSync(outsideDir, { recursive: true });
        }
      });
    });

    when('[t1] dest path contains symlink that resolves within repo', () => {
      then('move succeeds', () => {
        const result = runInTempGitRepo({
          files: {
            'source.txt': 'content',
            'real-dir/.gitkeep': '',
          },
          symlinks: { 'link-to-dir': 'real-dir' },
          mvsafeArgs: ['./source.txt', './link-to-dir/dest.txt'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          fs.existsSync(path.join(result.tempDir, 'real-dir/dest.txt')),
        ).toBe(true);
      });
    });
  });

  given('[case14] repo root symlink resolution', () => {
    when('[t0] repo root itself contains symlinks', () => {
      then('paths are correctly resolved against canonical root', () => {
        // this tests that REPO_ROOT is resolved with realpath
        const result = runInTempGitRepo({
          files: { 'source.txt': 'content' },
          mvsafeArgs: ['./source.txt', './dest.txt'],
        });

        // basic sanity - if repo root resolution failed, move would fail
        expect(result.exitCode).toBe(0);
      });
    });
  });

  given('[case15] special characters in paths', () => {
    when('[t0] filename has spaces', () => {
      then('file is moved correctly', () => {
        const result = runInTempGitRepo({
          files: { 'source file.txt': 'content with spaces' },
          mvsafeArgs: ['./source file.txt', './dest file.txt'],
        });

        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(path.join(result.tempDir, 'dest file.txt'))).toBe(
          true,
        );
      });
    });

    when('[t1] filename has unicode', () => {
      then('file is moved correctly', () => {
        // 源文件 = "source file", 目标文件 = "target file"
        const result = runInTempGitRepo({
          files: { '源文件.txt': 'unicode content' },
          mvsafeArgs: ['./源文件.txt', './目标文件.txt'],
        });

        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(path.join(result.tempDir, '目标文件.txt'))).toBe(
          true,
        );
      });
    });
  });
});
