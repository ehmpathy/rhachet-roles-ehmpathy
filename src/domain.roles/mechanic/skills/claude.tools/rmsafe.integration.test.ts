import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = integration tests for rmsafe.sh skill
 * .why = verify safe file removal works correctly in all modes and edge cases
 */
describe('rmsafe.sh', () => {
  const scriptPath = path.join(__dirname, 'rmsafe.sh');

  /**
   * .what = helper to run rmsafe.sh in a temp git repo
   * .why = isolates tests from real repo state
   */
  const runInTempGitRepo = (args: {
    files?: Record<string, string>;
    symlinks?: Record<string, string>;
    rmsafeArgs: string[];
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'rmsafe-test', git: true });

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

    // run rmsafe.sh
    const result = spawnSync('bash', [scriptPath, ...args.rmsafeArgs], {
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

  given('[case1] positional args (like rm)', () => {
    when('[t0] single positional arg provided', () => {
      then('file is removed', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content' },
          rmsafeArgs: ['./target.txt'],
        });

        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(path.join(result.tempDir, 'target.txt'))).toBe(
          false,
        );
      });

      then('output shows relative path', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content' },
          rmsafeArgs: ['./target.txt'],
        });

        expect(result.stdout).toContain('removed:');
        expect(result.stdout).toContain('target.txt');
      });
    });

    when('[t1] -r flag with directory', () => {
      then('directory is removed recursively', () => {
        const result = runInTempGitRepo({
          files: {
            'targetdir/file1.txt': 'content 1',
            'targetdir/subdir/file2.txt': 'content 2',
          },
          rmsafeArgs: ['-r', './targetdir'],
        });

        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(path.join(result.tempDir, 'targetdir'))).toBe(
          false,
        );
      });
    });
  });

  given('[case2] named args (--path)', () => {
    when('[t0] --path provided', () => {
      then('file is removed', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content' },
          rmsafeArgs: ['--path', './target.txt'],
        });

        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(path.join(result.tempDir, 'target.txt'))).toBe(
          false,
        );
      });
    });

    when('[t1] --path with --recursive', () => {
      then('directory is removed', () => {
        const result = runInTempGitRepo({
          files: { 'targetdir/file.txt': 'content' },
          rmsafeArgs: ['--path', './targetdir', '--recursive'],
        });

        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(path.join(result.tempDir, 'targetdir'))).toBe(
          false,
        );
      });
    });
  });

  given('[case3] argument validation', () => {
    when('[t0] no arguments provided', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          rmsafeArgs: [],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('path is required');
      });

      then('shows usage', () => {
        const result = runInTempGitRepo({
          rmsafeArgs: [],
        });

        expect(result.stdout).toContain('usage:');
        expect(result.stdout).toContain('rmsafe.sh');
      });
    });

    when('[t1] unknown option provided', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content' },
          rmsafeArgs: ['--unknown', 'value'],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('unknown option');
      });
    });
  });

  given('[case4] target validation', () => {
    when('[t0] target does not exist', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          rmsafeArgs: ['./nonexistent.txt'],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('path does not exist');
      });
    });

    when('[t1] target is directory without -r', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          files: { 'targetdir/file.txt': 'content' },
          rmsafeArgs: ['./targetdir'],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('target is a directory');
        expect(result.stdout).toContain('--recursive');
      });
    });

    when('[t2] target is repo root', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          files: { 'file.txt': 'content' },
          rmsafeArgs: ['-r', '.'],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('cannot delete the repository root');
      });
    });
  });

  given('[case5] safety boundary - target outside repo', () => {
    when('[t0] target path is absolute outside repo', () => {
      then('exits with error', () => {
        const outsideFile = path.join('/tmp', `rmsafe-test-${Date.now()}.txt`);
        fs.writeFileSync(outsideFile, 'outside content');

        try {
          const result = runInTempGitRepo({
            rmsafeArgs: [outsideFile],
          });

          expect(result.exitCode).toBe(1);
          expect(result.stdout).toContain(
            'path must be within the git repository',
          );
          // verify file was NOT deleted
          expect(fs.existsSync(outsideFile)).toBe(true);
        } finally {
          fs.unlinkSync(outsideFile);
        }
      });
    });

    when(
      '[t1] target is symlink inside repo (even if it points outside)',
      () => {
        then('symlink is removed but external target is preserved', () => {
          // symlink INSIDE repo pointing OUTSIDE is safe to delete
          // we're just removing the link, not the external target
          const outsideFile = path.join(
            '/tmp',
            `rmsafe-test-${Date.now()}.txt`,
          );
          fs.writeFileSync(outsideFile, 'outside content');

          try {
            const result = runInTempGitRepo({
              symlinks: { 'link-to-outside.txt': outsideFile },
              rmsafeArgs: ['./link-to-outside.txt'],
            });

            expect(result.exitCode).toBe(0);
            // symlink removed
            expect(
              fs.existsSync(path.join(result.tempDir, 'link-to-outside.txt')),
            ).toBe(false);
            // external target preserved
            expect(fs.existsSync(outsideFile)).toBe(true);
          } finally {
            fs.unlinkSync(outsideFile);
          }
        });
      },
    );

    when('[t2] target uses .. to escape repo', () => {
      then('exits with error', () => {
        // create the file outside repo so we test the boundary check, not just "not found"
        const outsideFile = path.join(
          '/tmp',
          `rmsafe-escape-${Date.now()}.txt`,
        );
        fs.writeFileSync(outsideFile, 'outside content');

        try {
          const result = runInTempGitRepo({
            files: { 'file.txt': 'content' },
            rmsafeArgs: [outsideFile],
          });

          expect(result.exitCode).toBe(1);
          expect(result.stdout).toContain(
            'path must be within the git repository',
          );
          // verify file was NOT deleted
          expect(fs.existsSync(outsideFile)).toBe(true);
        } finally {
          fs.unlinkSync(outsideFile);
        }
      });
    });

    when('[t3] target is in sibling directory with repo-prefix name', () => {
      then('exits with error (prevents /repo from match of /repo-evil)', () => {
        // this tests the critical vulnerability: /tmp/myrepo should not match /tmp/myrepo-evil
        const tempDir = genTempDir({ slug: 'rmsafe-test', git: true });
        const siblingDir = `${tempDir}-evil`;
        fs.mkdirSync(siblingDir, { recursive: true });
        const outsideFile = path.join(siblingDir, 'malicious.txt');
        fs.writeFileSync(outsideFile, 'should not be deleted');

        try {
          const result = spawnSync('bash', [scriptPath, outsideFile], {
            cwd: tempDir,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
          });

          expect(result.status).toBe(1);
          expect(result.stdout).toContain(
            'path must be within the git repository',
          );
          // verify file was NOT deleted
          expect(fs.existsSync(outsideFile)).toBe(true);
        } finally {
          fs.rmSync(siblingDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case6] recursive removal', () => {
    when('[t0] directory with nested content', () => {
      then('all content is removed', () => {
        const result = runInTempGitRepo({
          files: {
            'targetdir/file1.txt': 'content 1',
            'targetdir/file2.txt': 'content 2',
            'targetdir/subdir/file3.txt': 'content 3',
            'targetdir/subdir/deep/file4.txt': 'content 4',
          },
          rmsafeArgs: ['-r', './targetdir'],
        });

        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(path.join(result.tempDir, 'targetdir'))).toBe(
          false,
        );
      });
    });

    when('[t1] empty directory', () => {
      then('directory is removed', () => {
        const tempDir = genTempDir({ slug: 'rmsafe-empty-dir', git: true });
        fs.mkdirSync(path.join(tempDir, 'emptydir'));

        const result = spawnSync('bash', [scriptPath, '-r', './emptydir'], {
          cwd: tempDir,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        expect(result.status).toBe(0);
        expect(fs.existsSync(path.join(tempDir, 'emptydir'))).toBe(false);
      });
    });
  });

  given('[case7] not in git repo', () => {
    when('[t0] run outside any git repo', () => {
      then('exits with error', () => {
        const tempDir = genTempDir({ slug: 'rmsafe-no-git' });

        fs.writeFileSync(path.join(tempDir, 'target.txt'), 'content');

        const result = spawnSync('bash', [scriptPath, './target.txt'], {
          cwd: tempDir,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        expect(result.status).toBe(1);
        expect(result.stdout).toContain('not in a git repository');
      });
    });
  });

  given('[case8] symlink chain resolution', () => {
    when('[t0] target path contains symlink that escapes repo', () => {
      then('symlink is resolved for boundary check', () => {
        const outsideDir = path.join('/tmp', `rmsafe-chain-${Date.now()}`);
        fs.mkdirSync(outsideDir, { recursive: true });
        fs.writeFileSync(path.join(outsideDir, 'file.txt'), 'outside content');

        try {
          const result = runInTempGitRepo({
            symlinks: { 'link-to-outside': outsideDir },
            rmsafeArgs: ['./link-to-outside/file.txt'],
          });

          expect(result.exitCode).toBe(1);
          expect(result.stdout).toContain(
            'path must be within the git repository',
          );
          // verify outside file was NOT deleted
          expect(fs.existsSync(path.join(outsideDir, 'file.txt'))).toBe(true);
        } finally {
          fs.rmSync(outsideDir, { recursive: true });
        }
      });
    });

    when('[t1] target is symlink within repo', () => {
      then('symlink itself is removed (not target)', () => {
        const result = runInTempGitRepo({
          files: { 'real-file.txt': 'content' },
          symlinks: { 'link-to-file.txt': 'real-file.txt' },
          rmsafeArgs: ['./link-to-file.txt'],
        });

        expect(result.exitCode).toBe(0);
        // symlink removed
        expect(
          fs.existsSync(path.join(result.tempDir, 'link-to-file.txt')),
        ).toBe(false);
        // target still exists
        expect(fs.existsSync(path.join(result.tempDir, 'real-file.txt'))).toBe(
          true,
        );
      });
    });
  });

  given('[case9] special characters in paths', () => {
    when('[t0] filename has spaces', () => {
      then('file is removed correctly', () => {
        const result = runInTempGitRepo({
          files: { 'target file.txt': 'content with spaces' },
          rmsafeArgs: ['./target file.txt'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          fs.existsSync(path.join(result.tempDir, 'target file.txt')),
        ).toBe(false);
      });
    });

    when('[t1] filename has unicode', () => {
      then('file is removed correctly', () => {
        // 目标文件 = "target file"
        const result = runInTempGitRepo({
          files: { '目标文件.txt': 'unicode content' },
          rmsafeArgs: ['./目标文件.txt'],
        });

        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(path.join(result.tempDir, '目标文件.txt'))).toBe(
          false,
        );
      });
    });
  });

  given('[case10] other files remain', () => {
    when('[t0] multiple files exist', () => {
      then('only target is removed', () => {
        const result = runInTempGitRepo({
          files: {
            'target.txt': 'to be removed',
            'keep1.txt': 'keep me',
            'keep2.txt': 'keep me too',
          },
          rmsafeArgs: ['./target.txt'],
        });

        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(path.join(result.tempDir, 'target.txt'))).toBe(
          false,
        );
        expect(fs.existsSync(path.join(result.tempDir, 'keep1.txt'))).toBe(
          true,
        );
        expect(fs.existsSync(path.join(result.tempDir, 'keep2.txt'))).toBe(
          true,
        );
      });
    });
  });
});
