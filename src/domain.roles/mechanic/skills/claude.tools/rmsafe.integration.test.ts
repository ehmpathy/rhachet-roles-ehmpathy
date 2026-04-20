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

  /**
   * .what = sanitize stdout for snapshot stability
   * .why = temp dir paths change between runs
   */
  const sanitizeOutput = (stdout: string): string =>
    stdout.replace(/\/tmp\/[^\s]+/g, '/tmp/TEMP_DIR');

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
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });

      then('output shows relative path', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content' },
          rmsafeArgs: ['./target.txt'],
        });

        expect(result.stdout).toContain('removed');
        expect(result.stdout).toContain('target.txt');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
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
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
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
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
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
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case3] argument validation', () => {
    when('[t0] no arguments provided', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          rmsafeArgs: [],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('path is required');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });

      then('shows usage', () => {
        const result = runInTempGitRepo({
          rmsafeArgs: [],
        });

        expect(result.stdout).toContain('usage:');
        expect(result.stdout).toContain('rmsafe.sh');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] unknown option provided', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content' },
          rmsafeArgs: ['--unknown', 'value'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('unknown option');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] --help flag', () => {
      then('shows usage info and exits 0', () => {
        const result = runInTempGitRepo({
          rmsafeArgs: ['--help'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('rmsafe.sh - safe file removal');
        expect(result.stdout).toContain('usage:');
        expect(result.stdout).toContain('options:');
        expect(result.stdout).toContain('--literal');
        expect(result.stdout).toContain('trash');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case4] target validation', () => {
    when('[t0] target does not exist', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          rmsafeArgs: ['./nonexistent.txt'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('path does not exist');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] target is directory without -r', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          files: { 'targetdir/file.txt': 'content' },
          rmsafeArgs: ['./targetdir'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('target is a directory');
        expect(result.stdout).toContain('--recursive');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] target is repo root', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          files: { 'file.txt': 'content' },
          rmsafeArgs: ['-r', '.'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('cannot delete the repository root');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
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

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            'path must be within the git repository',
          );
          expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
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
            expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
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

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            'path must be within the git repository',
          );
          expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
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

          expect(result.status).toBe(2);
          expect(result.stdout).toContain(
            'path must be within the git repository',
          );
          expect(sanitizeOutput(result.stdout ?? '')).toMatchSnapshot();
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
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] empty directory', () => {
      then('directory is removed', () => {
        const tempDir = genTempDir({
          slug: 'rmsafe-empty-dir',
          git: true,
        });
        fs.mkdirSync(path.join(tempDir, 'emptydir'));

        const result = spawnSync('bash', [scriptPath, '-r', './emptydir'], {
          cwd: tempDir,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        expect(result.status).toBe(0);
        expect(fs.existsSync(path.join(tempDir, 'emptydir'))).toBe(false);
        expect(sanitizeOutput(result.stdout ?? '')).toMatchSnapshot();
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

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('not in a git repository');
        expect(sanitizeOutput(result.stdout ?? '')).toMatchSnapshot();
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

          expect(result.exitCode).toBe(2);
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
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
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
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
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
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
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
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case11] glob patterns', () => {
    when('[t0] glob matches multiple files', () => {
      then('all files are removed', () => {
        const result = runInTempGitRepo({
          files: {
            'build/a.tmp': 'temp a',
            'build/b.tmp': 'temp b',
            'build/c.tmp': 'temp c',
            'build/keep.txt': 'keep this',
          },
          rmsafeArgs: ['--path', 'build/*.tmp'],
        });

        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(path.join(result.tempDir, 'build/a.tmp'))).toBe(
          false,
        );
        expect(fs.existsSync(path.join(result.tempDir, 'build/b.tmp'))).toBe(
          false,
        );
        expect(fs.existsSync(path.join(result.tempDir, 'build/c.tmp'))).toBe(
          false,
        );
        expect(fs.existsSync(path.join(result.tempDir, 'build/keep.txt'))).toBe(
          true,
        );
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('output shows each file removed', () => {
        const result = runInTempGitRepo({
          files: {
            'build/a.tmp': 'temp a',
            'build/b.tmp': 'temp b',
          },
          rmsafeArgs: ['--path', 'build/*.tmp'],
        });

        expect(result.stdout).toContain('files: 2');
        expect(result.stdout).toContain('a.tmp');
        expect(result.stdout).toContain('b.tmp');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('output shows turtle sweet header', () => {
        const result = runInTempGitRepo({
          files: { 'build/a.tmp': 'temp' },
          rmsafeArgs: ['--path', 'build/*.tmp'],
        });

        expect(result.stdout).toContain('sweet');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] glob matches zero files', () => {
      then('output shows crickets header', () => {
        const result = runInTempGitRepo({
          files: { 'build/a.txt': 'not a match' },
          rmsafeArgs: ['--path', 'build/*.xyz'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('crickets');
        expect(result.stdout).toContain('files: 0');
        expect(result.stdout).toContain('(none)');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] recursive glob **/*.bak', () => {
      then('matches files in nested directories', () => {
        const result = runInTempGitRepo({
          files: {
            'src/utils/foo.bak': 'backup',
            'src/core/bar.bak': 'backup',
            'src/deep/nested/baz.bak': 'backup',
            'src/keep.ts': 'keep',
          },
          rmsafeArgs: ['--path', 'src/**/*.bak'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          fs.existsSync(path.join(result.tempDir, 'src/utils/foo.bak')),
        ).toBe(false);
        expect(
          fs.existsSync(path.join(result.tempDir, 'src/core/bar.bak')),
        ).toBe(false);
        expect(
          fs.existsSync(path.join(result.tempDir, 'src/deep/nested/baz.bak')),
        ).toBe(false);
        expect(fs.existsSync(path.join(result.tempDir, 'src/keep.ts'))).toBe(
          true,
        );
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case12] tree output format', () => {
    when('[t0] single file removal', () => {
      then('output has turtle, shell, and tree structure', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content' },
          rmsafeArgs: ['--path', './target.txt'],
        });

        expect(result.stdout).toContain('🐢');
        expect(result.stdout).toContain('🐚 rmsafe');
        expect(result.stdout).toContain('path:');
        expect(result.stdout).toContain('files:');
        expect(result.stdout).toContain('removed');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case13] bracket characters with --literal flag', () => {
    when('[t0] file with brackets exists and --literal used', () => {
      then('file is removed successfully', () => {
        const result = runInTempGitRepo({
          files: { 'doc.[ref].md': 'bracket content' },
          rmsafeArgs: ['--literal', './doc.[ref].md'],
        });

        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(path.join(result.tempDir, 'doc.[ref].md'))).toBe(
          false,
        );
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] file with brackets absent and --literal used', () => {
      then('exits with error for absent file', () => {
        const result = runInTempGitRepo({
          rmsafeArgs: ['--literal', './absent.[ref].md'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).not.toContain('did you know');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] file with brackets exists and escape syntax used', () => {
      then('file is removed successfully', () => {
        const result = runInTempGitRepo({
          files: { 'doc.[ref].md': 'bracket content' },
          rmsafeArgs: ['./doc.\\[ref\\].md'],
        });

        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(path.join(result.tempDir, 'doc.[ref].md'))).toBe(
          false,
        );
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] brackets used without --literal and no match', () => {
      then('shows did-you-know hint', () => {
        const result = runInTempGitRepo({
          files: { 'other.md': 'other content' },
          rmsafeArgs: ['./doc.[ref].md'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('files: 0');
        expect(result.stdout).toContain('did you know');
        expect(result.stdout).toContain('--literal');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t4] brackets used without --literal but file matches', () => {
      then('bracket hint does not appear on success', () => {
        const result = runInTempGitRepo({
          files: { 'doc.r.md': 'matches [ref] as r' },
          rmsafeArgs: ['./doc.[ref].md'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).not.toContain('--literal');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case14] trash feature', () => {
    const TRASH_REL =
      '.agent/.cache/repo=ehmpathy/role=mechanic/skill=rmsafe/trash';

    when('[t0] single file deleted', () => {
      then('file extant in trash at mirrored path', () => {
        const result = runInTempGitRepo({
          files: { 'src/target.txt': 'content to trash' },
          rmsafeArgs: ['./src/target.txt'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          fs.existsSync(path.join(result.tempDir, 'src/target.txt')),
        ).toBe(false);
        expect(
          fs.existsSync(
            path.join(result.tempDir, TRASH_REL, 'src/target.txt'),
          ),
        ).toBe(true);
        expect(
          fs.readFileSync(
            path.join(result.tempDir, TRASH_REL, 'src/target.txt'),
            'utf-8',
          ),
        ).toBe('content to trash');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('trash dir has .gitignore', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content' },
          rmsafeArgs: ['./target.txt'],
        });

        expect(result.exitCode).toBe(0);
        const gitignorePath = path.join(result.tempDir, TRASH_REL, '.gitignore');
        expect(fs.existsSync(gitignorePath)).toBe(true);
        expect(fs.readFileSync(gitignorePath, 'utf-8')).toBe('*\n!.gitignore\n');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('output includes coconut restore hint', () => {
        const result = runInTempGitRepo({
          files: { 'target.txt': 'content' },
          rmsafeArgs: ['./target.txt'],
        });

        expect(result.stdout).toContain('🥥 did you know?');
        expect(result.stdout).toContain('you can restore from trash');
        expect(result.stdout).toContain('rhx cpsafe');
        expect(result.stdout).toContain(TRASH_REL);
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] directory deleted with -r', () => {
      then('directory structure preserved in trash', () => {
        const result = runInTempGitRepo({
          files: {
            'mydir/file1.txt': 'content 1',
            'mydir/subdir/file2.txt': 'content 2',
          },
          rmsafeArgs: ['-r', './mydir'],
        });

        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(path.join(result.tempDir, 'mydir'))).toBe(false);
        expect(
          fs.existsSync(path.join(result.tempDir, TRASH_REL, 'mydir/file1.txt')),
        ).toBe(true);
        expect(
          fs.existsSync(
            path.join(result.tempDir, TRASH_REL, 'mydir/subdir/file2.txt'),
          ),
        ).toBe(true);
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('output includes coconut restore hint', () => {
        const result = runInTempGitRepo({
          files: { 'mydir/file.txt': 'content' },
          rmsafeArgs: ['-r', './mydir'],
        });

        expect(result.stdout).toContain('🥥 did you know?');
        expect(result.stdout).toContain('rhx cpsafe');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] same file deleted twice', () => {
      then('second version overwrites first in trash', () => {
        const tempDir = genTempDir({ slug: 'rmsafe-overwrite', git: true });
        const filePath = path.join(tempDir, 'target.txt');
        const trashPath = path.join(tempDir, TRASH_REL, 'target.txt');

        // first delete
        fs.writeFileSync(filePath, 'version 1');
        const result1 = spawnSync('bash', [scriptPath, './target.txt'], {
          cwd: tempDir,
          encoding: 'utf-8',
        });
        expect(fs.readFileSync(trashPath, 'utf-8')).toBe('version 1');
        expect(sanitizeOutput(result1.stdout ?? '')).toMatchSnapshot();

        // second delete with different content
        fs.writeFileSync(filePath, 'version 2');
        const result2 = spawnSync('bash', [scriptPath, './target.txt'], {
          cwd: tempDir,
          encoding: 'utf-8',
        });
        expect(fs.readFileSync(trashPath, 'utf-8')).toBe('version 2');
        expect(sanitizeOutput(result2.stdout ?? '')).toMatchSnapshot();
      });
    });

    when('[t3] symlink deleted', () => {
      then('symlink in trash, not target', () => {
        const result = runInTempGitRepo({
          files: { 'real-file.txt': 'real content' },
          symlinks: { 'link-to-file.txt': './real-file.txt' },
          rmsafeArgs: ['./link-to-file.txt'],
        });

        expect(result.exitCode).toBe(0);
        // original symlink removed
        expect(
          fs.existsSync(path.join(result.tempDir, 'link-to-file.txt')),
        ).toBe(false);
        // target file unchanged
        expect(fs.existsSync(path.join(result.tempDir, 'real-file.txt'))).toBe(
          true,
        );
        expect(
          fs.readFileSync(path.join(result.tempDir, 'real-file.txt'), 'utf-8'),
        ).toBe('real content');
        // symlink in trash (as symlink, not dereferenced)
        const trashLink = path.join(result.tempDir, TRASH_REL, 'link-to-file.txt');
        expect(fs.lstatSync(trashLink).isSymbolicLink()).toBe(true);
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t4] glob matches zero files', () => {
      then('no coconut hint (crickets output)', () => {
        const result = runInTempGitRepo({
          files: { 'keep.txt': 'content' },
          rmsafeArgs: ['--path', '*.xyz'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('crickets');
        expect(result.stdout).not.toContain('🥥');
        expect(result.stdout).not.toContain('did you know');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });
});
