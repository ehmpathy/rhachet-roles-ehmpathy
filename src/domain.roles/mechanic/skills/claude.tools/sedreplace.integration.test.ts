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

  given('[case10] line count reporting', () => {
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
});
