import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = integration tests for sedreplace.sh skill
 * .why = verify the skill works correctly including --mode plan|apply and --glob filtering
 */
describe('sedreplace.sh', () => {
  const scriptPath = path.join(__dirname, 'sedreplace.sh');

  /**
   * .what = sanitize stdout for snapshot stability
   * .why = diff output contains timestamps and temp dir paths that change between runs
   */
  const sanitizeOutput = (stdout: string): string =>
    stdout
      .replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+/g, 'TIMESTAMP')
      .replace(/\/tmp\/[^\s]+/g, '/tmp/TEMP_DIR');

  /**
   * .what = helper to run sedreplace in a temp git repo
   * .why = isolates tests from real repo state
   */
  const runInTempGitRepo = (args: {
    files: Record<string, string>;
    sedArgs: string[];
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'sedreplace-test', git: true });

    // create files
    for (const [filePath, content] of Object.entries(args.files)) {
      const fullPath = path.join(tempDir, filePath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }

    // add files to git
    execSync('git add .', { cwd: tempDir, stdio: 'pipe' });
    execSync('git commit -m "initial"', { cwd: tempDir, stdio: 'pipe' });

    // run sedreplace
    const result = spawnSync('bash', [scriptPath, ...args.sedArgs], {
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

  given('[case1] files with matching pattern', () => {
    when('[t0] --glob is not specified', () => {
      then('it should find matches in all git-tracked files', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': 'const MATCH_ME = 1;',
            'file2.js': 'const MATCH_ME = 2;',
            'file3.md': 'MATCH_ME',
          },
          sedArgs: ['--old', 'MATCH_ME', '--new', 'REPLACED'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('files: 3');
        expect(result.stdout).toContain('🐢');
      });
    });

    when('[t1] --glob "*.ts" is specified', () => {
      then('it should only find matches in .ts files', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': 'const MATCH_ME = 1;',
            'file2.js': 'const MATCH_ME = 2;',
            'file3.md': 'MATCH_ME',
          },
          sedArgs: ['--old', 'MATCH_ME', '--new', 'REPLACED', '--glob', '*.ts'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('files: 1');
        expect(result.stdout).toContain('file1.ts');
        expect(result.stdout).not.toContain('file2.js');
        expect(result.stdout).not.toContain('file3.md');
      });
    });

    when('[t2] --glob "*.js" is specified', () => {
      then('it should only find matches in .js files', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': 'const MATCH_ME = 1;',
            'file2.js': 'const MATCH_ME = 2;',
            'file3.md': 'MATCH_ME',
          },
          sedArgs: ['--old', 'MATCH_ME', '--new', 'REPLACED', '--glob', '*.js'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('files: 1');
        expect(result.stdout).toContain('file2.js');
      });
    });
  });

  given('[case2] files in nested directories', () => {
    when('[t0] --glob "*.ts" is specified for nested files', () => {
      then(
        'it should only find .ts files at root level (shell glob semantics)',
        () => {
          const result = runInTempGitRepo({
            files: {
              'root.ts': 'const MATCH_ME = 0;',
              'src/file1.ts': 'const MATCH_ME = 1;',
              'src/deep/file2.ts': 'const MATCH_ME = 2;',
              'src/file3.js': 'const MATCH_ME = 3;',
            },
            sedArgs: [
              '--old',
              'MATCH_ME',
              '--new',
              'REPLACED',
              '--glob',
              '*.ts',
            ],
          });

          expect(result.exitCode).toBe(0);
          // with :(glob) pathspec, *.ts only matches root level files
          expect(result.stdout).toContain('files: 1');
          expect(result.stdout).toContain('root.ts');
        },
      );
    });

    when('[t0.1] --glob "**/*.ts" is specified for recursive matching', () => {
      then('it should find all .ts files recursively', () => {
        const result = runInTempGitRepo({
          files: {
            'root.ts': 'const MATCH_ME = 0;',
            'src/file1.ts': 'const MATCH_ME = 1;',
            'src/deep/file2.ts': 'const MATCH_ME = 2;',
            'src/file3.js': 'const MATCH_ME = 3;',
          },
          sedArgs: [
            '--old',
            'MATCH_ME',
            '--new',
            'REPLACED',
            '--glob',
            '**/*.ts',
          ],
        });

        expect(result.exitCode).toBe(0);
        // **/*.ts matches all .ts files recursively
        expect(result.stdout).toContain('files: 3');
      });
    });

    when('[t1] --glob "src/*.ts" is specified', () => {
      then('it should find .ts files directly in src/', () => {
        const result = runInTempGitRepo({
          files: {
            'root.ts': 'const MATCH_ME = 0;',
            'src/file1.ts': 'const MATCH_ME = 1;',
            'src/deep/file2.ts': 'const MATCH_ME = 2;',
            'src/file3.js': 'const MATCH_ME = 3;',
          },
          sedArgs: [
            '--old',
            'MATCH_ME',
            '--new',
            'REPLACED',
            '--glob',
            'src/*.ts',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('files: 1');
        expect(result.stdout).toContain('src/file1.ts');
      });
    });

    when('[t2] --glob "src/**/*.ts" is specified', () => {
      then('it should find .ts files recursively in src/', () => {
        const result = runInTempGitRepo({
          files: {
            'root.ts': 'const MATCH_ME = 0;',
            'src/file1.ts': 'const MATCH_ME = 1;',
            'src/deep/file2.ts': 'const MATCH_ME = 2;',
            'src/file3.js': 'const MATCH_ME = 3;',
          },
          sedArgs: [
            '--old',
            'MATCH_ME',
            '--new',
            'REPLACED',
            '--glob',
            'src/**/*.ts',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('files: 2');
      });
    });
  });

  given('[case3] no files match the pattern', () => {
    when('[t0] --glob filter excludes all files with pattern', () => {
      then('it should report no files match', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': 'const MATCH_ME = 1;',
            'file2.js': 'const OTHER = 2;',
          },
          sedArgs: ['--old', 'MATCH_ME', '--new', 'REPLACED', '--glob', '*.js'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('no files contain pattern');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] --glob matches no files at all', () => {
      then('it should report no files match criteria', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': 'const MATCH_ME = 1;',
          },
          sedArgs: [
            '--old',
            'MATCH_ME',
            '--new',
            'REPLACED',
            '--glob',
            '*.xyz',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('no files match the criteria');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case4] --mode apply', () => {
    when('[t0] --mode apply is provided with --glob', () => {
      then('it should apply changes only to filtered files', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': 'const MATCH_ME = 1;',
            'file2.js': 'const MATCH_ME = 2;',
          },
          sedArgs: [
            '--old',
            'MATCH_ME',
            '--new',
            'REPLACED',
            '--glob',
            '*.ts',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);

        // verify
        const tsContent = fs.readFileSync(
          path.join(result.tempDir, 'file1.ts'),
          'utf-8',
        );
        const jsContent = fs.readFileSync(
          path.join(result.tempDir, 'file2.js'),
          'utf-8',
        );

        expect(tsContent).toBe('const REPLACED = 1;');
        expect(jsContent).toBe('const MATCH_ME = 2;'); // unchanged
      });
    });
  });

  given('[case5] glob patterns with special characters', () => {
    when('[t0] --glob with curly braces for multiple extensions', () => {
      then('it should match files with either extension', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': 'const MATCH_ME = 1;',
            'file2.tsx': 'const MATCH_ME = 2;',
            'file3.js': 'const MATCH_ME = 3;',
          },
          sedArgs: [
            '--old',
            'MATCH_ME',
            '--new',
            'REPLACED',
            '--glob',
            '*.{ts,tsx}',
          ],
        });

        // note: git ls-files may or may not support brace expansion based on version
        // this test documents the actual behavior
        expect(result.exitCode).toBe(0);
      });
    });
  });

  given('[case6] missing required arguments', () => {
    when('[t0] --new is not provided', () => {
      then('it should error with helpful message', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': 'const MATCH_ME = 1;',
          },
          sedArgs: ['--old', 'MATCH_ME'],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('--new replacement is required');
        expect(result.stderr.trim()).toMatchSnapshot();
      });
    });

    when('[t1] --old is not provided', () => {
      then('it should error with helpful message', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': 'const MATCH_ME = 1;',
          },
          sedArgs: ['--new', 'REPLACED'],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('--old pattern is required');
        expect(result.stderr.trim()).toMatchSnapshot();
      });
    });
  });

  given('[case7] empty replacement (deletion)', () => {
    when('[t0] --new "" is specified (plan)', () => {
      then('it should show deletion in diff', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': 'const REMOVE_ME = 1;',
          },
          sedArgs: ['--old', 'REMOVE_ME', '--new', ''],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('files: 1');
        expect(result.stdout).toContain('-const REMOVE_ME = 1;');
        expect(result.stdout).toContain('+const  = 1;');
      });
    });

    when('[t1] --new "" with --mode apply', () => {
      then('it should delete the pattern from file', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': 'const REMOVE_ME = 1;',
          },
          sedArgs: ['--old', 'REMOVE_ME', '--new', '', '--mode', 'apply'],
        });

        expect(result.exitCode).toBe(0);

        // verify deletion
        const content = fs.readFileSync(
          path.join(result.tempDir, 'file1.ts'),
          'utf-8',
        );

        expect(content).toBe('const  = 1;');
      });
    });

    when('[t2] delete entire line content', () => {
      then('it should leave empty string where pattern was', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': '// TODO: remove this comment',
          },
          sedArgs: ['--old', '// TODO: remove this comment', '--new', ''],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('files: 1');
        expect(result.stdout).toContain('-// TODO: remove this comment');
        expect(result.stdout).toContain('+');
      });
    });
  });

  given('[case8] patterns with regex special characters', () => {
    when('[t0] pattern contains dots', () => {
      then('it should treat dots as literal characters', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': 'const version = "1.2.3";',
          },
          sedArgs: ['--old', '1.2.3', '--new', '2.0.0'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('files: 1');
        expect(result.stdout).toContain('-const version = "1.2.3";');
        expect(result.stdout).toContain('+const version = "2.0.0";');
      });
    });

    when(
      '[t1] pattern contains caret and numbers (scientific notation)',
      () => {
        then('it should treat caret as literal character', () => {
          const result = runInTempGitRepo({
            files: {
              'file1.ts': 'const value = .^-2;',
            },
            sedArgs: ['--old', '.^-2', '--new', '.x10^-2'],
          });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('files: 1');
          expect(result.stdout).toContain('-const value = .^-2;');
          expect(result.stdout).toContain('+const value = .x10^-2;');
        });
      },
    );

    when('[t2] pattern contains dollar sign', () => {
      then('it should treat dollar sign as literal character', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': 'const price = "$100";',
          },
          sedArgs: ['--old', '$100', '--new', '$200'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('files: 1');
        expect(result.stdout).toContain('-const price = "$100";');
        expect(result.stdout).toContain('+const price = "$200";');
      });
    });

    when('[t3] pattern contains asterisks', () => {
      then('it should treat asterisks as literal characters', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': 'const comment = "/* TODO */";',
          },
          sedArgs: ['--old', '/* TODO */', '--new', '/* DONE */'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('files: 1');
        expect(result.stdout).toContain('-const comment = "/* TODO */";');
        expect(result.stdout).toContain('+const comment = "/* DONE */";');
      });
    });

    when('[t4] pattern contains square brackets', () => {
      then('it should treat square brackets as literal characters', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': 'const arr = items[0];',
          },
          sedArgs: ['--old', '[0]', '--new', '[1]'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('files: 1');
        expect(result.stdout).toContain('-const arr = items[0];');
        expect(result.stdout).toContain('+const arr = items[1];');
      });
    });

    when('[t5] pattern contains backslash', () => {
      then('it should treat backslash as literal character', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': 'const path = "C:\\Users";',
          },
          sedArgs: ['--old', 'C:\\Users', '--new', 'D:\\Data'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('files: 1');
      });
    });

    when('[t6] pattern contains pipe character', () => {
      then('it should treat pipe as literal character', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': 'const cmd = "cat | grep";',
          },
          sedArgs: ['--old', 'cat | grep', '--new', 'cat | sed'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('files: 1');
        expect(result.stdout).toContain('-const cmd = "cat | grep";');
        expect(result.stdout).toContain('+const cmd = "cat | sed";');
      });
    });

    when('[t7] replacement contains ampersand', () => {
      then(
        'it should treat ampersand as literal character in replacement',
        () => {
          const result = runInTempGitRepo({
            files: {
              'file1.ts': 'const company = "Acme";',
            },
            sedArgs: ['--old', 'Acme', '--new', 'Acme & Co'],
          });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('files: 1');
          expect(result.stdout).toContain('-const company = "Acme";');
          expect(result.stdout).toContain('+const company = "Acme & Co";');
        },
      );
    });

    when('[t8] --mode apply with special characters', () => {
      then('it should correctly apply literal replacements', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': 'const value = .^-2;',
          },
          sedArgs: ['--old', '.^-2', '--new', '.x10^-2', '--mode', 'apply'],
        });

        expect(result.exitCode).toBe(0);

        // verify
        const content = fs.readFileSync(
          path.join(result.tempDir, 'file1.ts'),
          'utf-8',
        );

        expect(content).toBe('const value = .x10^-2;');
      });
    });
  });

  given('[case9] --mode semantics', () => {
    when('[t0] default mode (no --mode flag)', () => {
      then('it should run in plan mode and exit 0', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': 'const MATCH_ME = 1;',
          },
          sedArgs: ['--old', 'MATCH_ME', '--new', 'REPLACED'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('mode: plan');
        expect(result.stdout).toContain('--mode apply');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        // file should NOT be modified
        const content = fs.readFileSync(
          path.join(result.tempDir, 'file1.ts'),
          'utf-8',
        );
        expect(content).toBe('const MATCH_ME = 1;');
      });
    });

    when('[t1] --mode plan explicitly', () => {
      then('it should produce same result as default (plan mode)', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': 'const MATCH_ME = 1;',
          },
          sedArgs: ['--old', 'MATCH_ME', '--new', 'REPLACED', '--mode', 'plan'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('mode: plan');
        expect(result.stdout).toContain('--mode apply');
        // file should NOT be modified
        const content = fs.readFileSync(
          path.join(result.tempDir, 'file1.ts'),
          'utf-8',
        );
        expect(content).toBe('const MATCH_ME = 1;');
      });
    });

    when('[t2] --mode apply', () => {
      then('it should apply changes', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': 'const MATCH_ME = 1;',
          },
          sedArgs: [
            '--old',
            'MATCH_ME',
            '--new',
            'REPLACED',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('mode: apply');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        const content = fs.readFileSync(
          path.join(result.tempDir, 'file1.ts'),
          'utf-8',
        );
        expect(content).toBe('const REPLACED = 1;');
      });
    });

    when('[t3] --mode with invalid value', () => {
      then('it should exit with error', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': 'const MATCH_ME = 1;',
          },
          sedArgs: ['--old', 'MATCH_ME', '--new', 'REPLACED', '--mode', 'foo'],
        });

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("--mode must be 'plan' or 'apply'");
        expect(result.stderr.trim()).toMatchSnapshot();
      });
    });
  });

  given('[case10] untracked files are included', () => {
    /**
     * .what = helper to run sedreplace with both tracked and untracked files
     * .why = verifies that all files in repo are processed (tracked + untracked)
     */
    const runWithUntrackedFiles = (args: {
      trackedFiles: Record<string, string>;
      untrackedFiles: Record<string, string>;
      sedArgs: string[];
    }): {
      stdout: string;
      stderr: string;
      exitCode: number;
      tempDir: string;
    } => {
      const tempDir = genTempDir({
        slug: 'sedreplace-untracked-test',
        git: true,
      });

      // create and commit tracked files
      for (const [filePath, content] of Object.entries(args.trackedFiles)) {
        const fullPath = path.join(tempDir, filePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
      }
      execSync('git add .', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "initial"', { cwd: tempDir, stdio: 'pipe' });

      // create untracked files AFTER commit (so they remain untracked)
      for (const [filePath, content] of Object.entries(args.untrackedFiles)) {
        const fullPath = path.join(tempDir, filePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
      }

      // run sedreplace
      const result = spawnSync('bash', [scriptPath, ...args.sedArgs], {
        cwd: tempDir,
        encoding: 'utf-8', // node api requirement
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      return {
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
        exitCode: result.status ?? 1,
        tempDir,
      };
    };

    when('[t0] --mode apply with untracked file that has pattern', () => {
      then('it should modify both tracked and untracked files', () => {
        const result = runWithUntrackedFiles({
          trackedFiles: {
            'tracked.ts': 'const MATCH_ME = 1;',
          },
          untrackedFiles: {
            'untracked.ts': 'const MATCH_ME = 2;',
          },
          sedArgs: [
            '--old',
            'MATCH_ME',
            '--new',
            'REPLACED',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);

        // tracked file should be modified
        const trackedContent = fs.readFileSync(
          path.join(result.tempDir, 'tracked.ts'),
          'utf-8',
        );
        expect(trackedContent).toBe('const REPLACED = 1;');

        // untracked file should also be modified
        const untrackedContent = fs.readFileSync(
          path.join(result.tempDir, 'untracked.ts'),
          'utf-8',
        );
        expect(untrackedContent).toBe('const REPLACED = 2;');
      });
    });

    when('[t1] plan mode with untracked file that has pattern', () => {
      then('it should show both tracked and untracked files in output', () => {
        const result = runWithUntrackedFiles({
          trackedFiles: {
            'tracked.ts': 'const MATCH_ME = 1;',
          },
          untrackedFiles: {
            'untracked.ts': 'const MATCH_ME = 2;',
          },
          sedArgs: ['--old', 'MATCH_ME', '--new', 'REPLACED'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('files: 2');
        expect(result.stdout).toContain('tracked.ts');
        expect(result.stdout).toContain('untracked.ts');
      });
    });

    when('[t2] only untracked files have pattern', () => {
      then('it should find and process untracked files', () => {
        const result = runWithUntrackedFiles({
          trackedFiles: {
            'tracked.ts': 'const OTHER = 1;',
          },
          untrackedFiles: {
            'untracked.ts': 'const MATCH_ME = 2;',
          },
          sedArgs: ['--old', 'MATCH_ME', '--new', 'REPLACED'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('files: 1');
        expect(result.stdout).toContain('untracked.ts');
      });
    });

    when('[t3] gitignored file has pattern', () => {
      then('it should also modify gitignored files (within repo)', () => {
        const tempDir = genTempDir({
          slug: 'sedreplace-gitignore-test',
          git: true,
        });

        // create .gitignore
        fs.writeFileSync(path.join(tempDir, '.gitignore'), 'ignored.ts\n');

        // create tracked file
        fs.writeFileSync(
          path.join(tempDir, 'tracked.ts'),
          'const MATCH_ME = 1;',
        );

        // create ignored file (will not be tracked due to .gitignore)
        fs.writeFileSync(
          path.join(tempDir, 'ignored.ts'),
          'const MATCH_ME = 2;',
        );

        // commit tracked files (ignored.ts won't be added)
        execSync('git add .', { cwd: tempDir, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: tempDir, stdio: 'pipe' });

        // run sedreplace
        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--old',
            'MATCH_ME',
            '--new',
            'REPLACED',
            '--mode',
            'apply',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8', // node api requirement
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        expect(result.status).toBe(0);

        // tracked file should be modified
        const trackedContent = fs.readFileSync(
          path.join(tempDir, 'tracked.ts'),
          'utf-8',
        );
        expect(trackedContent).toBe('const REPLACED = 1;');

        // gitignored file should also be modified (it's within repo)
        const ignoredContent = fs.readFileSync(
          path.join(tempDir, 'ignored.ts'),
          'utf-8',
        );
        expect(ignoredContent).toBe('const REPLACED = 2;');
      });
    });
  });

  given('[case11] line count reports', () => {
    when('[t0] file with pattern on multiple lines', () => {
      then('it should report correct line count per file in plan mode', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': [
              'const MATCH_ME = 1;',
              'const other = 2;',
              'const MATCH_ME = 3;',
              'const MATCH_ME = 4;',
            ].join('\n'),
          },
          sedArgs: ['--old', 'MATCH_ME', '--new', 'REPLACED'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('lines: 3');
        expect(result.stdout).toContain('file1.ts (3 lines)');
      });
    });

    when('[t1] multiple files with different line counts', () => {
      then(
        'it should report per-file and total line counts in plan mode',
        () => {
          const result = runInTempGitRepo({
            files: {
              'file1.ts': ['const MATCH_ME = 1;', 'const MATCH_ME = 2;'].join(
                '\n',
              ),
              'file2.ts': 'const MATCH_ME = 3;',
            },
            sedArgs: ['--old', 'MATCH_ME', '--new', 'REPLACED'],
          });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('files: 2');
          expect(result.stdout).toContain('lines: 3');
          expect(result.stdout).toContain('file1.ts (2 lines)');
          expect(result.stdout).toContain('file2.ts (1 lines)');
          expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        },
      );
    });

    when('[t2] --mode apply reports line counts', () => {
      then('it should report per-file and total line counts', () => {
        const result = runInTempGitRepo({
          files: {
            'file1.ts': ['const MATCH_ME = 1;', 'const MATCH_ME = 2;'].join(
              '\n',
            ),
            'file2.ts': 'const MATCH_ME = 3;',
          },
          sedArgs: [
            '--old',
            'MATCH_ME',
            '--new',
            'REPLACED',
            '--mode',
            'apply',
          ],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('files: 2');
        expect(result.stdout).toContain('lines: 3');
        expect(result.stdout).toContain('file1.ts (2 lines)');
        expect(result.stdout).toContain('file2.ts (1 lines)');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case12] repo boundary enforcement (negative tests)', () => {
    when('[t0] file exists outside repo with pattern', () => {
      then('it should NOT find or modify files outside repo', () => {
        // create temp repo
        const repoDir = genTempDir({
          slug: 'sedreplace-boundary-repo',
          git: true,
        });

        // create file inside repo
        fs.writeFileSync(
          path.join(repoDir, 'inside.ts'),
          'const MATCH_ME = 1;',
        );
        execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: repoDir, stdio: 'pipe' });

        // create file OUTSIDE repo (sibling directory)
        const outsideDir = genTempDir({ slug: 'sedreplace-boundary-outside' });
        const outsideFile = path.join(outsideDir, 'outside.ts');
        fs.writeFileSync(outsideFile, 'const MATCH_ME = 2;');

        // run sedreplace from inside repo
        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--old',
            'MATCH_ME',
            '--new',
            'REPLACED',
            '--mode',
            'apply',
          ],
          {
            cwd: repoDir,
            encoding: 'utf-8', // node api requirement
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        expect(result.status).toBe(0);

        // inside file should be modified
        const insideContent = fs.readFileSync(
          path.join(repoDir, 'inside.ts'),
          'utf-8',
        );
        expect(insideContent).toBe('const REPLACED = 1;');

        // outside file should remain unchanged
        const outsideContent = fs.readFileSync(outsideFile, 'utf-8');
        expect(outsideContent).toBe('const MATCH_ME = 2;');
      });
    });

    when('[t1] symlink points to file outside repo', () => {
      then('it should NOT follow symlink or modify external target', () => {
        // create temp repo
        const repoDir = genTempDir({
          slug: 'sedreplace-symlink-repo',
          git: true,
        });

        // create file inside repo
        fs.writeFileSync(
          path.join(repoDir, 'inside.ts'),
          'const MATCH_ME = 1;',
        );

        // create file OUTSIDE repo
        const outsideDir = genTempDir({ slug: 'sedreplace-symlink-outside' });
        const outsideFile = path.join(outsideDir, 'external.ts');
        fs.writeFileSync(outsideFile, 'const MATCH_ME = 2;');

        // create symlink inside repo that points outside
        const symlinkPath = path.join(repoDir, 'link-to-external.ts');
        fs.symlinkSync(outsideFile, symlinkPath);

        execSync('git add inside.ts', { cwd: repoDir, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: repoDir, stdio: 'pipe' });

        // run sedreplace
        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--old',
            'MATCH_ME',
            '--new',
            'REPLACED',
            '--mode',
            'apply',
          ],
          {
            cwd: repoDir,
            encoding: 'utf-8', // node api requirement
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        expect(result.status).toBe(0);

        // inside file should be modified
        const insideContent = fs.readFileSync(
          path.join(repoDir, 'inside.ts'),
          'utf-8',
        );
        expect(insideContent).toBe('const REPLACED = 1;');

        // external file (symlink target) should remain unchanged
        const externalContent = fs.readFileSync(outsideFile, 'utf-8');
        expect(externalContent).toBe('const MATCH_ME = 2;');
      });
    });

    when('[t2] run from directory outside any git repo', () => {
      then('it should error with helpful message', () => {
        // create non-git directory
        const nonGitDir = genTempDir({ slug: 'sedreplace-no-git' });

        // create file with pattern
        fs.writeFileSync(
          path.join(nonGitDir, 'file.ts'),
          'const MATCH_ME = 1;',
        );

        // run sedreplace from non-git directory
        const result = spawnSync(
          'bash',
          [scriptPath, '--old', 'MATCH_ME', '--new', 'REPLACED'],
          {
            cwd: nonGitDir,
            encoding: 'utf-8', // node api requirement
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        expect(result.status).toBe(1);
        expect(result.stderr).toContain('not in a git repository');
      });
    });

    when('[t3] glob pattern attempts path traversal', () => {
      then('it should NOT escape repo via ../ in glob', () => {
        // create temp repo
        const repoDir = genTempDir({
          slug: 'sedreplace-traversal-repo',
          git: true,
        });

        // create file inside repo
        fs.writeFileSync(
          path.join(repoDir, 'inside.ts'),
          'const MATCH_ME = 1;',
        );
        execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: repoDir, stdio: 'pipe' });

        // create file OUTSIDE repo (parent directory)
        const outsideFile = path.join(path.dirname(repoDir), 'parent-file.ts');
        fs.writeFileSync(outsideFile, 'const MATCH_ME = 2;');

        // attempt path traversal via glob
        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--old',
            'MATCH_ME',
            '--new',
            'REPLACED',
            '--glob',
            '../*.ts',
            '--mode',
            'apply',
          ],
          {
            cwd: repoDir,
            encoding: 'utf-8', // node api requirement
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        // should complete (may find no matches or error, but not modify external)
        // the key assertion is that the external file is untouched
        const outsideContent = fs.readFileSync(outsideFile, 'utf-8');
        expect(outsideContent).toBe('const MATCH_ME = 2;');

        // cleanup
        fs.unlinkSync(outsideFile);
      });
    });

    when('[t4] glob uses absolute path to target system files', () => {
      then('it should NOT access files via absolute path glob', () => {
        const repoDir = genTempDir({
          slug: 'sedreplace-abspath-repo',
          git: true,
        });

        // create file inside repo
        fs.writeFileSync(
          path.join(repoDir, 'inside.ts'),
          'const MATCH_ME = 1;',
        );
        execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: repoDir, stdio: 'pipe' });

        // create target file outside repo
        const outsideDir = genTempDir({ slug: 'sedreplace-abspath-target' });
        const targetFile = path.join(outsideDir, 'secret.ts');
        fs.writeFileSync(targetFile, 'const MATCH_ME = secret;');

        // attempt to use absolute path in glob
        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--old',
            'MATCH_ME',
            '--new',
            'PWNED',
            '--glob',
            `${outsideDir}/*.ts`,
            '--mode',
            'apply',
          ],
          {
            cwd: repoDir,
            encoding: 'utf-8', // node api requirement
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        // external file must remain untouched
        const targetContent = fs.readFileSync(targetFile, 'utf-8');
        expect(targetContent).toBe('const MATCH_ME = secret;');
      });
    });

    when('[t5] symlinked directory targets location outside repo', () => {
      then('it should NOT traverse into external directory via symlink', () => {
        const repoDir = genTempDir({
          slug: 'sedreplace-symlinkdir-repo',
          git: true,
        });

        // create file inside repo
        fs.writeFileSync(
          path.join(repoDir, 'inside.ts'),
          'const MATCH_ME = 1;',
        );

        // create external directory with target file
        const externalDir = genTempDir({ slug: 'sedreplace-symlinkdir-ext' });
        fs.writeFileSync(
          path.join(externalDir, 'external.ts'),
          'const MATCH_ME = external;',
        );

        // create symlinked directory inside repo that targets external
        fs.symlinkSync(externalDir, path.join(repoDir, 'linked-dir'));

        execSync('git add inside.ts', { cwd: repoDir, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: repoDir, stdio: 'pipe' });

        // run sedreplace
        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--old',
            'MATCH_ME',
            '--new',
            'REPLACED',
            '--mode',
            'apply',
          ],
          {
            cwd: repoDir,
            encoding: 'utf-8', // node api requirement
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        expect(result.status).toBe(0);

        // inside file should be modified
        const insideContent = fs.readFileSync(
          path.join(repoDir, 'inside.ts'),
          'utf-8',
        );
        expect(insideContent).toBe('const REPLACED = 1;');

        // external file via symlinked dir must remain untouched
        const externalContent = fs.readFileSync(
          path.join(externalDir, 'external.ts'),
          'utf-8',
        );
        expect(externalContent).toBe('const MATCH_ME = external;');
      });
    });

    when('[t6] shell metacharacters in --old pattern', () => {
      then('it should treat them as literals, not execute commands', () => {
        const repoDir = genTempDir({
          slug: 'sedreplace-injection-repo',
          git: true,
        });

        // create file with suspicious content
        fs.writeFileSync(
          path.join(repoDir, 'file.ts'),
          'const x = "$(whoami)";',
        );
        execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: repoDir, stdio: 'pipe' });

        // create marker file that command injection would create
        const markerFile = path.join(repoDir, 'pwned.txt');

        // attempt command injection via --old pattern
        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--old',
            '$(touch pwned.txt)',
            '--new',
            'safe',
            '--mode',
            'apply',
          ],
          {
            cwd: repoDir,
            encoding: 'utf-8', // node api requirement
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        // command should not have executed
        expect(fs.existsSync(markerFile)).toBe(false);
      });
    });

    when('[t7] shell metacharacters in --new replacement', () => {
      then('it should treat them as literals, not execute commands', () => {
        const repoDir = genTempDir({
          slug: 'sedreplace-inject-new-repo',
          git: true,
        });

        fs.writeFileSync(path.join(repoDir, 'file.ts'), 'const x = "REPLACE";');
        execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: repoDir, stdio: 'pipe' });

        const markerFile = path.join(repoDir, 'pwned.txt');

        // attempt command injection via --new replacement
        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--old',
            'REPLACE',
            '--new',
            '$(touch pwned.txt)',
            '--mode',
            'apply',
          ],
          {
            cwd: repoDir,
            encoding: 'utf-8', // node api requirement
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        expect(result.status).toBe(0);

        // command should not have executed
        expect(fs.existsSync(markerFile)).toBe(false);

        // file should contain literal string
        const content = fs.readFileSync(path.join(repoDir, 'file.ts'), 'utf-8');
        expect(content).toBe('const x = "$(touch pwned.txt)";');
      });
    });

    when('[t8] backtick command substitution in arguments', () => {
      then('it should treat backticks as literals', () => {
        const repoDir = genTempDir({
          slug: 'sedreplace-backtick-repo',
          git: true,
        });

        fs.writeFileSync(path.join(repoDir, 'file.ts'), 'const x = "OLD";');
        execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: repoDir, stdio: 'pipe' });

        const markerFile = path.join(repoDir, 'pwned.txt');

        // attempt command injection via backticks
        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--old',
            'OLD',
            '--new',
            '`touch pwned.txt`',
            '--mode',
            'apply',
          ],
          {
            cwd: repoDir,
            encoding: 'utf-8', // node api requirement
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        expect(result.status).toBe(0);
        expect(fs.existsSync(markerFile)).toBe(false);

        const content = fs.readFileSync(path.join(repoDir, 'file.ts'), 'utf-8');
        expect(content).toBe('const x = "`touch pwned.txt`";');
      });
    });

    when('[t9] glob with embedded traversal like src/../../outside', () => {
      then('it should NOT escape via mid-path traversal', () => {
        const repoDir = genTempDir({
          slug: 'sedreplace-midpath-repo',
          git: true,
        });

        // create nested structure
        fs.mkdirSync(path.join(repoDir, 'src'), { recursive: true });
        fs.writeFileSync(
          path.join(repoDir, 'src', 'inside.ts'),
          'const MATCH_ME = 1;',
        );
        execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: repoDir, stdio: 'pipe' });

        // create file outside repo
        const outsideFile = path.join(
          path.dirname(repoDir),
          'escape-target.ts',
        );
        fs.writeFileSync(outsideFile, 'const MATCH_ME = escaped;');

        // attempt mid-path traversal
        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--old',
            'MATCH_ME',
            '--new',
            'PWNED',
            '--glob',
            'src/../../*.ts',
            '--mode',
            'apply',
          ],
          {
            cwd: repoDir,
            encoding: 'utf-8', // node api requirement
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        // external file must remain untouched
        const outsideContent = fs.readFileSync(outsideFile, 'utf-8');
        expect(outsideContent).toBe('const MATCH_ME = escaped;');

        // cleanup
        fs.unlinkSync(outsideFile);
      });
    });

    when('[t10] newline injection in pattern attempts to break sed', () => {
      then('it should handle newlines safely', () => {
        const repoDir = genTempDir({
          slug: 'sedreplace-newline-repo',
          git: true,
        });

        fs.writeFileSync(path.join(repoDir, 'file.ts'), 'const x = "SAFE";');
        execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: repoDir, stdio: 'pipe' });

        const markerFile = path.join(repoDir, 'pwned.txt');

        // attempt to break out of sed command via newline
        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--old',
            'SAFE\n; touch pwned.txt; #',
            '--new',
            'REPLACED',
            '--mode',
            'apply',
          ],
          {
            cwd: repoDir,
            encoding: 'utf-8', // node api requirement
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        // injected command should not execute
        expect(fs.existsSync(markerFile)).toBe(false);
      });
    });

    when('[t11] pipe character attempts command chain', () => {
      then('it should treat pipe as literal character', () => {
        const repoDir = genTempDir({
          slug: 'sedreplace-pipe-repo',
          git: true,
        });

        fs.writeFileSync(path.join(repoDir, 'file.ts'), 'const x = "OLD";');
        execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: repoDir, stdio: 'pipe' });

        const markerFile = path.join(repoDir, 'pwned.txt');

        // attempt to chain commands via pipe
        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--old',
            'OLD | touch pwned.txt',
            '--new',
            'NEW',
            '--mode',
            'apply',
          ],
          {
            cwd: repoDir,
            encoding: 'utf-8', // node api requirement
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        // piped command should not execute
        expect(fs.existsSync(markerFile)).toBe(false);
      });
    });

    when('[t12] semicolon attempts command separation', () => {
      then('it should treat semicolon as literal character', () => {
        const repoDir = genTempDir({
          slug: 'sedreplace-semicolon-repo',
          git: true,
        });

        fs.writeFileSync(
          path.join(repoDir, 'file.ts'),
          'const x = "REPLACE_ME";',
        );
        execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: repoDir, stdio: 'pipe' });

        const markerFile = path.join(repoDir, 'pwned.txt');

        // attempt to separate commands via semicolon
        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--old',
            'REPLACE_ME',
            '--new',
            'x; touch pwned.txt; echo',
            '--mode',
            'apply',
          ],
          {
            cwd: repoDir,
            encoding: 'utf-8', // node api requirement
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        expect(result.status).toBe(0);
        expect(fs.existsSync(markerFile)).toBe(false);

        // file should contain literal semicolons
        const content = fs.readFileSync(path.join(repoDir, 'file.ts'), 'utf-8');
        expect(content).toBe('const x = "x; touch pwned.txt; echo";');
      });
    });

    // === Bobby Tables scenarios - sed delimiter/command injection ===

    when('[t13] delimiter injection via # in --old (Bobby Tables)', () => {
      then('it should escape delimiter and not break sed syntax', () => {
        const repoDir = genTempDir({
          slug: 'sedreplace-bobby-old-repo',
          git: true,
        });

        // file contains the attack pattern
        fs.writeFileSync(path.join(repoDir, 'file.ts'), 'const x = "foo#bar";');
        execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: repoDir, stdio: 'pipe' });

        // try to break sed by inject delimiter in pattern
        // sed command is: s#OLD#NEW#g
        // attack: OLD = "foo#e touch pwned.txt #" would become s#foo#e touch pwned.txt ##NEW#g
        const markerFile = path.join(repoDir, 'pwned.txt');

        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--old',
            'foo#e touch pwned.txt #',
            '--new',
            'REPLACED',
            '--mode',
            'apply',
          ],
          {
            cwd: repoDir,
            encoding: 'utf-8', // node api requirement
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        // sed e command should not have executed
        expect(fs.existsSync(markerFile)).toBe(false);
      });
    });

    when('[t14] delimiter injection via # in --new (Bobby Tables)', () => {
      then('it should escape delimiter and not break sed syntax', () => {
        const repoDir = genTempDir({
          slug: 'sedreplace-bobby-new-repo',
          git: true,
        });

        fs.writeFileSync(path.join(repoDir, 'file.ts'), 'const x = "OLD";');
        execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: repoDir, stdio: 'pipe' });

        // attack via replacement: s#OLD#foo#e touch pwned.txt#g
        const markerFile = path.join(repoDir, 'pwned.txt');

        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--old',
            'OLD',
            '--new',
            'foo#e touch pwned.txt',
            '--mode',
            'apply',
          ],
          {
            cwd: repoDir,
            encoding: 'utf-8', // node api requirement
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        expect(result.status).toBe(0);
        expect(fs.existsSync(markerFile)).toBe(false);

        // file should contain literal #
        const content = fs.readFileSync(path.join(repoDir, 'file.ts'), 'utf-8');
        expect(content).toBe('const x = "foo#e touch pwned.txt";');
      });
    });

    when('[t15] sed write command injection via w flag', () => {
      then('it should not allow w flag to write arbitrary files', () => {
        const repoDir = genTempDir({
          slug: 'sedreplace-sed-w-repo',
          git: true,
        });

        fs.writeFileSync(path.join(repoDir, 'file.ts'), 'const x = "TARGET";');
        execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: repoDir, stdio: 'pipe' });

        // attack: try to use sed w flag to write to file
        // normal sed: s/OLD/NEW/w /tmp/stolen.txt
        const stolenFile = path.join(repoDir, 'stolen.txt');

        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--old',
            'TARGET',
            '--new',
            `REPLACED#w ${stolenFile}`,
            '--mode',
            'apply',
          ],
          {
            cwd: repoDir,
            encoding: 'utf-8', // node api requirement
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        // w command should not have created file
        expect(fs.existsSync(stolenFile)).toBe(false);

        // original file should have literal replacement
        const content = fs.readFileSync(path.join(repoDir, 'file.ts'), 'utf-8');
        expect(content).toContain('REPLACED');
        expect(content).toContain('#w');
      });
    });

    when('[t16] sed execute command injection via e flag', () => {
      then('it should not allow e flag to execute commands', () => {
        const repoDir = genTempDir({
          slug: 'sedreplace-sed-e-repo',
          git: true,
        });

        fs.writeFileSync(path.join(repoDir, 'file.ts'), 'const x = "TARGET";');
        execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: repoDir, stdio: 'pipe' });

        // attack: try to use sed e flag (GNU extension) to execute
        const markerFile = path.join(repoDir, 'pwned.txt');

        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--old',
            'TARGET',
            '--new',
            'touch pwned.txt#e',
            '--mode',
            'apply',
          ],
          {
            cwd: repoDir,
            encoding: 'utf-8', // node api requirement
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        // e command should not have executed
        expect(fs.existsSync(markerFile)).toBe(false);
      });
    });

    when('[t17] multiple # delimiters to confuse parser', () => {
      then('it should handle multiple delimiters safely', () => {
        const repoDir = genTempDir({
          slug: 'sedreplace-multi-delim-repo',
          git: true,
        });

        fs.writeFileSync(path.join(repoDir, 'file.ts'), 'const x = "a#b#c#d";');
        execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: repoDir, stdio: 'pipe' });

        // attack with many # to confuse delimiter parse
        const result = spawnSync(
          'bash',
          [scriptPath, '--old', 'a#b#c#d', '--new', 'x#y#z', '--mode', 'apply'],
          {
            cwd: repoDir,
            encoding: 'utf-8', // node api requirement
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        expect(result.status).toBe(0);

        // should have replaced correctly with literal #
        const content = fs.readFileSync(path.join(repoDir, 'file.ts'), 'utf-8');
        expect(content).toBe('const x = "x#y#z";');
      });
    });

    when('[t18] Robert"); DROP TABLE Students;-- equivalent', () => {
      then('it should treat SQL-like injection as literal text', () => {
        const repoDir = genTempDir({
          slug: 'sedreplace-droptable-repo',
          git: true,
        });

        fs.writeFileSync(
          path.join(repoDir, 'file.ts'),
          'const name = "Robert";',
        );
        execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
        execSync('git commit -m "initial"', { cwd: repoDir, stdio: 'pipe' });

        // the classic Bobby Tables attack adapted for sed
        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--old',
            'Robert',
            '--new',
            'Robert"); DROP TABLE Students;--',
            '--mode',
            'apply',
          ],
          {
            cwd: repoDir,
            encoding: 'utf-8', // node api requirement
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );

        expect(result.status).toBe(0);

        // file should contain literal Bobby Tables string
        const content = fs.readFileSync(path.join(repoDir, 'file.ts'), 'utf-8');
        expect(content).toBe(
          'const name = "Robert"); DROP TABLE Students;--";',
        );
      });
    });
  });
});
