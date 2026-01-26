import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = integration tests for symlink.sh skill
 * .why = verify symlink creation works correctly in all modes and edge cases
 */
describe('symlink.sh', () => {
  const scriptPath = path.join(__dirname, 'symlink.sh');

  /**
   * .what = helper to run symlink.sh in a temp git repo
   * .why = isolates tests from real repo state
   */
  const runInTempGitRepo = (args: {
    files?: Record<string, string>;
    symlinks?: Record<string, string>;
    symlinkArgs: string;
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'symlink-test' });

    // initialize git repo
    spawnSync('git', ['init'], { cwd: tempDir, stdio: 'pipe' });
    spawnSync('git', ['config', 'user.email', 'test@test.com'], {
      cwd: tempDir,
      stdio: 'pipe',
    });
    spawnSync('git', ['config', 'user.name', 'Test'], {
      cwd: tempDir,
      stdio: 'pipe',
    });

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

    // run symlink.sh (use spawnSync to capture stderr on success)
    const result = spawnSync(
      'bash',
      [scriptPath, ...args.symlinkArgs.split(' ').filter(Boolean)],
      {
        cwd: tempDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      tempDir,
    };
  };

  given('[case1] create relative symlink', () => {
    when('[t0] --mode relative is specified', () => {
      then('symlink is created', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content' },
          symlinkArgs: '--at ./link.txt --to ./target.txt --mode relative',
        });

        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(path.join(result.tempDir, 'link.txt'))).toBe(true);
      });

      then('readlink shows relative path', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content' },
          symlinkArgs: '--at ./link.txt --to ./target.txt --mode relative',
        });

        const linkTarget = fs.readlinkSync(
          path.join(result.tempDir, 'link.txt'),
        );
        expect(linkTarget).not.toMatch(/^\//); // not absolute
        expect(linkTarget).toBe('target.txt');
      });

      then('symlink resolves to correct target', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'hello world' },
          symlinkArgs: '--at ./link.txt --to ./target.txt --mode relative',
        });

        const content = fs.readFileSync(
          path.join(result.tempDir, 'link.txt'),
          'utf-8',
        );
        expect(content).toBe('hello world');
      });
    });

    when('[t1] target is in subdirectory', () => {
      then('relative path traverses correctly', () => {
        const result = runInTempGitRepo({
          files: { 'subdir/target.txt': 'content' },
          symlinkArgs:
            '--at ./link.txt --to ./subdir/target.txt --mode relative',
        });

        expect(result.exitCode).toBe(0);
        const linkTarget = fs.readlinkSync(
          path.join(result.tempDir, 'link.txt'),
        );
        expect(linkTarget).toBe('subdir/target.txt');
      });
    });

    when('[t2] symlink is in subdirectory', () => {
      then('relative path traverses up correctly', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content' },
          symlinkArgs:
            '--at ./subdir/link.txt --to ./target.txt --mode relative',
        });

        expect(result.exitCode).toBe(0);
        const linkTarget = fs.readlinkSync(
          path.join(result.tempDir, 'subdir/link.txt'),
        );
        expect(linkTarget).toBe('../target.txt');
      });
    });
  });

  given('[case2] create absolute symlink', () => {
    when('[t0] --mode absolute is specified', () => {
      then('symlink is created', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content' },
          symlinkArgs: '--at ./link.txt --to ./target.txt --mode absolute',
        });

        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(path.join(result.tempDir, 'link.txt'))).toBe(true);
      });

      then('readlink shows absolute path', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content' },
          symlinkArgs: '--at ./link.txt --to ./target.txt --mode absolute',
        });

        const linkTarget = fs.readlinkSync(
          path.join(result.tempDir, 'link.txt'),
        );
        expect(linkTarget).toMatch(/^\//); // absolute path
        expect(linkTarget).toContain('target.txt');
      });
    });
  });

  given('[case3] mode is required', () => {
    when('[t0] --mode is omitted', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content' },
          symlinkArgs: '--at ./link.txt --to ./target.txt',
        });

        expect(result.exitCode).toBe(1);
      });

      then('error mentions --mode is required', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content' },
          symlinkArgs: '--at ./link.txt --to ./target.txt',
        });

        expect(result.stderr).toContain('--mode is required');
      });
    });

    when('[t1] --mode has invalid value', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content' },
          symlinkArgs: '--at ./link.txt --to ./target.txt --mode invalid',
        });

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("must be 'relative' or 'absolute'");
      });
    });
  });

  given('[case4] --at already exists', () => {
    when('[t0] symlink exists, no --idem', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content', 'other.txt': 'other' },
          symlinks: { 'link.txt': 'other.txt' },
          symlinkArgs: '--at ./link.txt --to ./target.txt --mode relative',
        });

        expect(result.exitCode).toBe(1);
      });

      then('error mentions --idem options', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content', 'other.txt': 'other' },
          symlinks: { 'link.txt': 'other.txt' },
          symlinkArgs: '--at ./link.txt --to ./target.txt --mode relative',
        });

        expect(result.stderr).toContain('--idem findsert');
        expect(result.stderr).toContain('--idem upsert');
      });
    });

    when('[t1] symlink exists, --idem findsert, same target', () => {
      then('succeeds silently', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content' },
          symlinks: { 'link.txt': 'target.txt' },
          symlinkArgs:
            '--at ./link.txt --to ./target.txt --mode relative --idem findsert',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('already exists with correct target');
      });
    });

    when('[t2] symlink exists, --idem findsert, different target', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content', 'other.txt': 'other' },
          symlinks: { 'link.txt': 'other.txt' },
          symlinkArgs:
            '--at ./link.txt --to ./target.txt --mode relative --idem findsert',
        });

        expect(result.exitCode).toBe(1);
      });

      then('shows existing vs requested target', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content', 'other.txt': 'other' },
          symlinks: { 'link.txt': 'other.txt' },
          symlinkArgs:
            '--at ./link.txt --to ./target.txt --mode relative --idem findsert',
        });

        expect(result.stderr).toContain('existing:');
        expect(result.stderr).toContain('requested:');
      });
    });

    when('[t3] symlink exists, --idem upsert', () => {
      then('symlink is replaced', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'new content', 'other.txt': 'other' },
          symlinks: { 'link.txt': 'other.txt' },
          symlinkArgs:
            '--at ./link.txt --to ./target.txt --mode relative --idem upsert',
        });

        expect(result.exitCode).toBe(0);
        const linkTarget = fs.readlinkSync(
          path.join(result.tempDir, 'link.txt'),
        );
        expect(linkTarget).toBe('target.txt');
      });
    });

    when('[t4] regular file exists, --idem upsert', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          files: { 'link.txt': 'i am a file', 'target.txt': 'content' },
          symlinkArgs:
            '--at ./link.txt --to ./target.txt --mode relative --idem upsert',
        });

        expect(result.exitCode).toBe(1);
      });

      then('error mentions non-symlink file', () => {
        const result = runInTempGitRepo({
          files: { 'link.txt': 'i am a file', 'target.txt': 'content' },
          symlinkArgs:
            '--at ./link.txt --to ./target.txt --mode relative --idem upsert',
        });

        expect(result.stderr).toContain('non-symlink file exists');
      });
    });
  });

  given('[case5] --to target does not exist', () => {
    when('[t0] target path does not exist', () => {
      then('symlink is still created', () => {
        const result = runInTempGitRepo({
          symlinkArgs: '--at ./link.txt --to ./nonexistent.txt --mode relative',
        });

        expect(result.exitCode).toBe(0);
        expect(
          fs.lstatSync(path.join(result.tempDir, 'link.txt')).isSymbolicLink(),
        ).toBe(true);
      });

      then('warning is emitted', () => {
        const result = runInTempGitRepo({
          symlinkArgs: '--at ./link.txt --to ./nonexistent.txt --mode relative',
        });

        expect(result.stderr).toContain('warning: target does not exist');
      });
    });
  });

  given('[case6] parent directory creation', () => {
    when('[t0] parent of --at does not exist', () => {
      then('parent directories are created', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content' },
          symlinkArgs:
            '--at ./deep/nested/dir/link.txt --to ./target.txt --mode relative',
        });

        expect(result.exitCode).toBe(0);
        expect(
          fs.existsSync(path.join(result.tempDir, 'deep/nested/dir')),
        ).toBe(true);
      });

      then('symlink is created', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content' },
          symlinkArgs:
            '--at ./deep/nested/dir/link.txt --to ./target.txt --mode relative',
        });

        expect(
          fs
            .lstatSync(path.join(result.tempDir, 'deep/nested/dir/link.txt'))
            .isSymbolicLink(),
        ).toBe(true);
      });
    });
  });

  given('[case7] safety boundary', () => {
    when('[t0] --at would be outside git repo', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content' },
          symlinkArgs:
            '--at /tmp/outside-repo.txt --to ./target.txt --mode relative',
        });

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('must be within the git repository');
      });
    });

    when('[t1] --to would be outside git repo', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          symlinkArgs:
            '--at ./link.txt --to /tmp/outside-repo.txt --mode relative',
        });

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('must be within the git repository');
      });
    });
  });

  given('[case8] help', () => {
    when('[t0] --help is provided', () => {
      then('shows usage', () => {
        const result = runInTempGitRepo({
          symlinkArgs: '--help',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('usage:');
      });

      then('documents all args', () => {
        const result = runInTempGitRepo({
          symlinkArgs: '--help',
        });

        expect(result.stdout).toContain('--at');
        expect(result.stdout).toContain('--to');
        expect(result.stdout).toContain('--mode');
        expect(result.stdout).toContain('--idem');
        expect(result.stdout).toContain('relative');
        expect(result.stdout).toContain('absolute');
        expect(result.stdout).toContain('findsert');
        expect(result.stdout).toContain('upsert');
      });
    });
  });
});
