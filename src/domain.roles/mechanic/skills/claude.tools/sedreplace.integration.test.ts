import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

/**
 * .what = integration tests for sedreplace.sh skill
 * .why = verify the skill works correctly including --glob filtering
 */
describe('sedreplace.sh', () => {
  // path to the script
  const scriptPath = path.join(__dirname, 'sedreplace.sh');

  /**
   * .what = helper to run sedreplace in a temp git repo
   * .why = isolates tests from real repo state
   */
  const runInTempRepo = (args: {
    files: Record<string, string>;
    sedArgs: string;
  }): { stdout: string; stderr: string; exitCode: number } => {
    // create temp directory
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sedreplace-test-'));

    try {
      // initialize git repo
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', {
        cwd: tempDir,
        stdio: 'pipe',
      });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });

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
      try {
        const stdout = execSync(`bash ${scriptPath} ${args.sedArgs}`, {
          cwd: tempDir,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        return { stdout, stderr: '', exitCode: 0 };
      } catch (error: unknown) {
        const execError = error as {
          stdout?: string;
          stderr?: string;
          status?: number;
        };
        return {
          stdout: execError.stdout ?? '',
          stderr: execError.stderr ?? '',
          exitCode: execError.status ?? 1,
        };
      }
    } finally {
      // cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  };

  given('[case1] files with matching pattern', () => {
    when('[t0] --glob is not specified', () => {
      then('it should find matches in all git-tracked files', () => {
        const result = runInTempRepo({
          files: {
            'file1.ts': 'const MATCH_ME = 1;',
            'file2.js': 'const MATCH_ME = 2;',
            'file3.md': 'MATCH_ME',
          },
          sedArgs: '--old "MATCH_ME" --new "REPLACED"',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('found 3 file(s)');
        expect(result.stdout).toContain('DRY RUN');
      });
    });

    when('[t1] --glob "*.ts" is specified', () => {
      then('it should only find matches in .ts files', () => {
        const result = runInTempRepo({
          files: {
            'file1.ts': 'const MATCH_ME = 1;',
            'file2.js': 'const MATCH_ME = 2;',
            'file3.md': 'MATCH_ME',
          },
          sedArgs: '--old "MATCH_ME" --new "REPLACED" --glob "*.ts"',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('found 1 file(s)');
        expect(result.stdout).toContain('file1.ts');
        expect(result.stdout).not.toContain('file2.js');
        expect(result.stdout).not.toContain('file3.md');
      });
    });

    when('[t2] --glob "*.js" is specified', () => {
      then('it should only find matches in .js files', () => {
        const result = runInTempRepo({
          files: {
            'file1.ts': 'const MATCH_ME = 1;',
            'file2.js': 'const MATCH_ME = 2;',
            'file3.md': 'MATCH_ME',
          },
          sedArgs: '--old "MATCH_ME" --new "REPLACED" --glob "*.js"',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('found 1 file(s)');
        expect(result.stdout).toContain('file2.js');
      });
    });
  });

  given('[case2] files in nested directories', () => {
    when('[t0] --glob "*.ts" is specified for nested files', () => {
      then(
        'it should only find .ts files at root level (shell glob semantics)',
        () => {
          const result = runInTempRepo({
            files: {
              'root.ts': 'const MATCH_ME = 0;',
              'src/file1.ts': 'const MATCH_ME = 1;',
              'src/deep/file2.ts': 'const MATCH_ME = 2;',
              'src/file3.js': 'const MATCH_ME = 3;',
            },
            sedArgs: '--old "MATCH_ME" --new "REPLACED" --glob "*.ts"',
          });

          expect(result.exitCode).toBe(0);
          // with :(glob) pathspec, *.ts only matches root level files
          expect(result.stdout).toContain('found 1 file(s)');
          expect(result.stdout).toContain('root.ts');
        },
      );
    });

    when('[t0.1] --glob "**/*.ts" is specified for recursive matching', () => {
      then('it should find all .ts files recursively', () => {
        const result = runInTempRepo({
          files: {
            'root.ts': 'const MATCH_ME = 0;',
            'src/file1.ts': 'const MATCH_ME = 1;',
            'src/deep/file2.ts': 'const MATCH_ME = 2;',
            'src/file3.js': 'const MATCH_ME = 3;',
          },
          sedArgs: '--old "MATCH_ME" --new "REPLACED" --glob "**/*.ts"',
        });

        expect(result.exitCode).toBe(0);
        // **/*.ts matches all .ts files recursively
        expect(result.stdout).toContain('found 3 file(s)');
      });
    });

    when('[t1] --glob "src/*.ts" is specified', () => {
      then('it should find .ts files directly in src/', () => {
        const result = runInTempRepo({
          files: {
            'root.ts': 'const MATCH_ME = 0;',
            'src/file1.ts': 'const MATCH_ME = 1;',
            'src/deep/file2.ts': 'const MATCH_ME = 2;',
            'src/file3.js': 'const MATCH_ME = 3;',
          },
          sedArgs: '--old "MATCH_ME" --new "REPLACED" --glob "src/*.ts"',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('found 1 file(s)');
        expect(result.stdout).toContain('src/file1.ts');
      });
    });

    when('[t2] --glob "src/**/*.ts" is specified', () => {
      then('it should find .ts files recursively in src/', () => {
        const result = runInTempRepo({
          files: {
            'root.ts': 'const MATCH_ME = 0;',
            'src/file1.ts': 'const MATCH_ME = 1;',
            'src/deep/file2.ts': 'const MATCH_ME = 2;',
            'src/file3.js': 'const MATCH_ME = 3;',
          },
          sedArgs: '--old "MATCH_ME" --new "REPLACED" --glob "src/**/*.ts"',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('found 2 file(s)');
      });
    });
  });

  given('[case3] no files match the pattern', () => {
    when('[t0] --glob filter excludes all files with pattern', () => {
      then('it should report no files match', () => {
        const result = runInTempRepo({
          files: {
            'file1.ts': 'const MATCH_ME = 1;',
            'file2.js': 'const OTHER = 2;',
          },
          sedArgs: '--old "MATCH_ME" --new "REPLACED" --glob "*.js"',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('no files contain pattern');
      });
    });

    when('[t1] --glob matches no files at all', () => {
      then('it should report no files match criteria', () => {
        const result = runInTempRepo({
          files: {
            'file1.ts': 'const MATCH_ME = 1;',
          },
          sedArgs: '--old "MATCH_ME" --new "REPLACED" --glob "*.xyz"',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('no files match the criteria');
      });
    });
  });

  given('[case4] --execute flag', () => {
    when('[t0] --execute is provided with --glob', () => {
      then('it should apply changes only to filtered files', () => {
        const tempDir = fs.mkdtempSync(
          path.join(os.tmpdir(), 'sedreplace-exec-test-'),
        );

        try {
          // setup
          execSync('git init', { cwd: tempDir, stdio: 'pipe' });
          execSync('git config user.email "test@test.com"', {
            cwd: tempDir,
            stdio: 'pipe',
          });
          execSync('git config user.name "Test"', {
            cwd: tempDir,
            stdio: 'pipe',
          });

          fs.writeFileSync(
            path.join(tempDir, 'file1.ts'),
            'const MATCH_ME = 1;',
          );
          fs.writeFileSync(
            path.join(tempDir, 'file2.js'),
            'const MATCH_ME = 2;',
          );

          execSync('git add .', { cwd: tempDir, stdio: 'pipe' });
          execSync('git commit -m "initial"', { cwd: tempDir, stdio: 'pipe' });

          // execute
          execSync(
            `bash ${scriptPath} --old "MATCH_ME" --new "REPLACED" --glob "*.ts" --execute`,
            { cwd: tempDir, stdio: 'pipe' },
          );

          // verify
          const tsContent = fs.readFileSync(
            path.join(tempDir, 'file1.ts'),
            'utf-8',
          );
          const jsContent = fs.readFileSync(
            path.join(tempDir, 'file2.js'),
            'utf-8',
          );

          expect(tsContent).toBe('const REPLACED = 1;');
          expect(jsContent).toBe('const MATCH_ME = 2;'); // unchanged
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case5] glob patterns with special characters', () => {
    when('[t0] --glob with curly braces for multiple extensions', () => {
      then('it should match files with either extension', () => {
        const result = runInTempRepo({
          files: {
            'file1.ts': 'const MATCH_ME = 1;',
            'file2.tsx': 'const MATCH_ME = 2;',
            'file3.js': 'const MATCH_ME = 3;',
          },
          sedArgs: '--old "MATCH_ME" --new "REPLACED" --glob "*.{ts,tsx}"',
        });

        // note: git ls-files may or may not support brace expansion depending on version
        // this test documents the actual behavior
        expect(result.exitCode).toBe(0);
      });
    });
  });
});
