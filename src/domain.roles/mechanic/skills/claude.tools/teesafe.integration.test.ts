import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = integration tests for teesafe.sh skill
 * .why = verify safe tee works correctly in all modes and edge cases
 */
describe('teesafe.sh', () => {
  const scriptPath = path.join(__dirname, 'teesafe.sh');

  /**
   * .what = helper to run teesafe.sh in a temp git repo
   * .why = isolates tests from real repo state
   */
  const runInTempGitRepo = (args: {
    stdin?: string;
    files?: Record<string, string>;
    teesafeArgs: string;
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'teesafe-test', git: true });

    // create files
    if (args.files) {
      for (const [filePath, content] of Object.entries(args.files)) {
        const fullPath = path.join(tempDir, filePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
      }
    }

    // run teesafe.sh
    const result = spawnSync(
      'bash',
      [scriptPath, ...args.teesafeArgs.split(' ').filter(Boolean)],
      {
        cwd: tempDir,
        encoding: 'utf-8',
        input: args.stdin ?? '',
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

  given('[case1] basic write', () => {
    when('[t0] stdin is provided', () => {
      then('content is written to file', () => {
        const result = runInTempGitRepo({
          stdin: 'hello world',
          teesafeArgs: 'output.txt',
        });

        expect(result.exitCode).toBe(0);
        const content = fs.readFileSync(
          path.join(result.tempDir, 'output.txt'),
          'utf-8',
        );
        expect(content).toBe('hello world');
      });

      then('content is echoed to stdout', () => {
        const result = runInTempGitRepo({
          stdin: 'hello world',
          teesafeArgs: 'output.txt',
        });

        expect(result.stdout).toBe('hello world');
      });
    });

    when('[t1] named arg --into is used', () => {
      then('content is written to file', () => {
        const result = runInTempGitRepo({
          stdin: 'named arg test',
          teesafeArgs: '--into output.txt',
        });

        expect(result.exitCode).toBe(0);
        const content = fs.readFileSync(
          path.join(result.tempDir, 'output.txt'),
          'utf-8',
        );
        expect(content).toBe('named arg test');
      });
    });

    when('[t2] multiline content', () => {
      then('all lines are written', () => {
        const result = runInTempGitRepo({
          stdin: 'line1\nline2\nline3',
          teesafeArgs: 'output.txt',
        });

        expect(result.exitCode).toBe(0);
        const content = fs.readFileSync(
          path.join(result.tempDir, 'output.txt'),
          'utf-8',
        );
        expect(content).toBe('line1\nline2\nline3');
      });
    });
  });

  given('[case2] append mode', () => {
    when('[t0] --append is specified', () => {
      then('content is appended to file', () => {
        const result = runInTempGitRepo({
          stdin: ' appended',
          files: { 'output.txt': 'original' },
          teesafeArgs: '--into output.txt --append',
        });

        expect(result.exitCode).toBe(0);
        const content = fs.readFileSync(
          path.join(result.tempDir, 'output.txt'),
          'utf-8',
        );
        expect(content).toBe('original appended');
      });
    });

    when('[t1] -a shorthand is used', () => {
      then('content is appended to file', () => {
        const result = runInTempGitRepo({
          stdin: ' appended',
          files: { 'output.txt': 'original' },
          teesafeArgs: '-a output.txt',
        });

        expect(result.exitCode).toBe(0);
        const content = fs.readFileSync(
          path.join(result.tempDir, 'output.txt'),
          'utf-8',
        );
        expect(content).toBe('original appended');
      });
    });

    when('[t2] file does not exist', () => {
      then('file is created', () => {
        const result = runInTempGitRepo({
          stdin: 'new content',
          teesafeArgs: '--into newfile.txt --append',
        });

        expect(result.exitCode).toBe(0);
        const content = fs.readFileSync(
          path.join(result.tempDir, 'newfile.txt'),
          'utf-8',
        );
        expect(content).toBe('new content');
      });
    });
  });

  given('[case3] overwrite mode (default)', () => {
    when('[t0] file already exists', () => {
      then('content is overwritten', () => {
        const result = runInTempGitRepo({
          stdin: 'new content',
          files: { 'output.txt': 'old content' },
          teesafeArgs: 'output.txt',
        });

        expect(result.exitCode).toBe(0);
        const content = fs.readFileSync(
          path.join(result.tempDir, 'output.txt'),
          'utf-8',
        );
        expect(content).toBe('new content');
      });
    });
  });

  given('[case4] parent directory creation', () => {
    when('[t0] parent of output file does not exist', () => {
      then('parent directories are created', () => {
        const result = runInTempGitRepo({
          stdin: 'nested content',
          teesafeArgs: 'deep/nested/dir/output.txt',
        });

        expect(result.exitCode).toBe(0);
        expect(
          fs.existsSync(path.join(result.tempDir, 'deep/nested/dir')),
        ).toBe(true);
      });

      then('file is created', () => {
        const result = runInTempGitRepo({
          stdin: 'nested content',
          teesafeArgs: 'deep/nested/dir/output.txt',
        });

        const content = fs.readFileSync(
          path.join(result.tempDir, 'deep/nested/dir/output.txt'),
          'utf-8',
        );
        expect(content).toBe('nested content');
      });
    });
  });

  given('[case5] safety boundary', () => {
    when('[t0] output file would be outside git repo', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          stdin: 'malicious content',
          teesafeArgs: '/tmp/outside-repo.txt',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('must be within the git repository');
      });

      then('file is not created', () => {
        runInTempGitRepo({
          stdin: 'malicious content',
          teesafeArgs: '/tmp/teesafe-test-outside.txt',
        });

        expect(fs.existsSync('/tmp/teesafe-test-outside.txt')).toBe(false);
      });
    });

    when('[t1] path traversal attempt', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          stdin: 'malicious content',
          teesafeArgs: '../../../tmp/outside.txt',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('must be within the git repository');
      });
    });

    when('[t2] output is in adjacent directory with repo-prefix name', () => {
      then('exits with error (prevents /repo from match of /repo-evil)', () => {
        const tempDir = genTempDir({ slug: 'teesafe-test', git: true });
        const adjacentDir = `${tempDir}-evil`;
        fs.mkdirSync(adjacentDir, { recursive: true });
        const outsideFile = path.join(adjacentDir, 'output.txt');

        try {
          const result = spawnSync('bash', [scriptPath, outsideFile], {
            cwd: tempDir,
            encoding: 'utf-8',
            input: 'malicious content',
            stdio: ['pipe', 'pipe', 'pipe'],
          });

          expect(result.status).toBe(2);
          expect(result.stderr).toContain('must be within the git repository');
          expect(fs.existsSync(outsideFile)).toBe(false);
        } finally {
          fs.rmSync(adjacentDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case6] empty stdin', () => {
    when('[t0] stdin is empty', () => {
      then('empty file is created', () => {
        const result = runInTempGitRepo({
          stdin: '',
          teesafeArgs: 'output.txt',
        });

        expect(result.exitCode).toBe(0);
        const content = fs.readFileSync(
          path.join(result.tempDir, 'output.txt'),
          'utf-8',
        );
        expect(content).toBe('');
      });
    });
  });

  given('[case7] error cases', () => {
    when('[t0] no file argument provided', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          stdin: 'content',
          teesafeArgs: '',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('destination file is required');
      });
    });

    when('[t1] unknown option provided', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          stdin: 'content',
          teesafeArgs: '--unknown output.txt',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('unknown option');
      });
    });
  });

  given('[case8] not in git repo', () => {
    when('[t0] run outside git repo', () => {
      then('exits with error', () => {
        const tempDir = fs.mkdtempSync('/tmp/teesafe-no-git-');

        try {
          const result = spawnSync('bash', [scriptPath, 'output.txt'], {
            cwd: tempDir,
            encoding: 'utf-8',
            input: 'content',
            stdio: ['pipe', 'pipe', 'pipe'],
          });

          expect(result.status).toBe(2);
          expect(result.stderr).toContain('not in a git repository');
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case9] --idem findsert mode', () => {
    when('[t0] file does not exist', () => {
      then('file is created', () => {
        const result = runInTempGitRepo({
          stdin: 'new content',
          teesafeArgs: '--into output.txt --idem findsert',
        });

        expect(result.exitCode).toBe(0);
        const content = fs.readFileSync(
          path.join(result.tempDir, 'output.txt'),
          'utf-8',
        );
        expect(content).toBe('new content');
      });

      then('content is echoed to stdout', () => {
        const result = runInTempGitRepo({
          stdin: 'new content',
          teesafeArgs: '--into output.txt --idem findsert',
        });

        expect(result.stdout).toBe('new content');
      });
    });

    when('[t1] file exists with same content', () => {
      then('exits successfully (no-op)', () => {
        const result = runInTempGitRepo({
          stdin: 'same content',
          files: { 'output.txt': 'same content' },
          teesafeArgs: '--into output.txt --idem findsert',
        });

        expect(result.exitCode).toBe(0);
      });

      then('file content is unchanged', () => {
        const result = runInTempGitRepo({
          stdin: 'same content',
          files: { 'output.txt': 'same content' },
          teesafeArgs: '--into output.txt --idem findsert',
        });

        const content = fs.readFileSync(
          path.join(result.tempDir, 'output.txt'),
          'utf-8',
        );
        expect(content).toBe('same content');
      });

      then('content is still echoed to stdout', () => {
        const result = runInTempGitRepo({
          stdin: 'same content',
          files: { 'output.txt': 'same content' },
          teesafeArgs: '--into output.txt --idem findsert',
        });

        expect(result.stdout).toBe('same content');
      });
    });

    when('[t2] file exists with different content', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          stdin: 'new content',
          files: { 'output.txt': 'old content' },
          teesafeArgs: '--into output.txt --idem findsert',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('file exists with different content');
      });

      then('file content is unchanged', () => {
        const result = runInTempGitRepo({
          stdin: 'new content',
          files: { 'output.txt': 'old content' },
          teesafeArgs: '--into output.txt --idem findsert',
        });

        const content = fs.readFileSync(
          path.join(result.tempDir, 'output.txt'),
          'utf-8',
        );
        expect(content).toBe('old content');
      });
    });
  });

  given('[case10] --idem upsert mode', () => {
    when('[t0] file does not exist', () => {
      then('file is created', () => {
        const result = runInTempGitRepo({
          stdin: 'new content',
          teesafeArgs: '--into output.txt --idem upsert',
        });

        expect(result.exitCode).toBe(0);
        const content = fs.readFileSync(
          path.join(result.tempDir, 'output.txt'),
          'utf-8',
        );
        expect(content).toBe('new content');
      });
    });

    when('[t1] file exists', () => {
      then('content is overwritten', () => {
        const result = runInTempGitRepo({
          stdin: 'new content',
          files: { 'output.txt': 'old content' },
          teesafeArgs: '--into output.txt --idem upsert',
        });

        expect(result.exitCode).toBe(0);
        const content = fs.readFileSync(
          path.join(result.tempDir, 'output.txt'),
          'utf-8',
        );
        expect(content).toBe('new content');
      });
    });
  });

  given('[case11] --idem append mode', () => {
    when('[t0] used via --idem append', () => {
      then('content is appended', () => {
        const result = runInTempGitRepo({
          stdin: ' appended',
          files: { 'output.txt': 'original' },
          teesafeArgs: '--into output.txt --idem append',
        });

        expect(result.exitCode).toBe(0);
        const content = fs.readFileSync(
          path.join(result.tempDir, 'output.txt'),
          'utf-8',
        );
        expect(content).toBe('original appended');
      });
    });
  });

  given('[case12] invalid --idem value', () => {
    when('[t0] invalid mode is specified', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          stdin: 'content',
          teesafeArgs: '--into output.txt --idem invalid',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain(
          "--idem must be 'findsert', 'upsert', or 'append'",
        );
      });
    });
  });
});
