import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = integration tests for grepsafe.sh skill
 * .why = verify safe content search works correctly with regex, filters, and edge cases
 */
describe('grepsafe.sh', () => {
  const scriptPath = path.join(__dirname, 'grepsafe.sh');

  /**
   * .what = run grepsafe.sh in a temp git repo
   * .why = isolates tests from real repo state
   */
  const runInTempGitRepo = (args: {
    files?: Record<string, string>;
    grepsafeArgs: string[];
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'grepsafe-test', git: true });

    // create files
    if (args.files) {
      for (const [filePath, content] of Object.entries(args.files)) {
        const fullPath = path.join(tempDir, filePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
      }
    }

    // run grepsafe.sh
    const result = spawnSync('bash', [scriptPath, ...args.grepsafeArgs], {
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

  given('[case1] basic pattern search', () => {
    when('[t0] pattern matches content in files', () => {
      then('matched lines are returned', () => {
        const result = runInTempGitRepo({
          files: {
            'src/foo.ts': 'const foo = 1;\nconst bar = 2;\n',
            'src/bar.ts': 'const baz = 3;\n',
          },
          grepsafeArgs: ['--pattern', 'foo'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('foo');
        expect(result.stdout).toContain('sweet');
      });

      then('output shows turtle header and tree structure', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': 'hello world\n' },
          grepsafeArgs: ['--pattern', 'hello'],
        });

        expect(result.stdout).toContain('🐢');
        expect(result.stdout).toContain('🐚 grepsafe');
        expect(result.stdout).toContain('pattern: hello');
        expect(result.stdout).toContain('results');
      });
    });

    when('[t1] pattern matches zero files', () => {
      then('output shows crickets', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': 'hello world\n' },
          grepsafeArgs: ['--pattern', 'nonexistent_xyz'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('crickets');
        expect(result.stdout).toContain('matches: 0');
      });
    });
  });

  given('[case2] regex with pipe character (primary use case)', () => {
    when('[t0] alternation pattern like (foo|bar)', () => {
      then('both alternatives are matched', () => {
        const result = runInTempGitRepo({
          files: {
            'src/a.ts': 'const foo = 1;\n',
            'src/b.ts': 'const bar = 2;\n',
            'src/c.ts': 'const baz = 3;\n',
          },
          grepsafeArgs: ['--pattern', 'foo|bar'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('foo');
        expect(result.stdout).toContain('bar');
        expect(result.stdout).not.toContain('baz');
      });
    });

    when('[t1] complex regex with groups and pipes', () => {
      then('regex is interpreted correctly', () => {
        const result = runInTempGitRepo({
          files: {
            'log.txt': 'ERROR: disk full\nWARN: low memory\nINFO: all good\n',
          },
          grepsafeArgs: ['--pattern', '(ERROR|WARN):'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('ERROR');
        expect(result.stdout).toContain('WARN');
        expect(result.stdout).not.toContain('INFO');
      });
    });
  });

  given('[case3] --glob file filter', () => {
    when('[t0] glob restricts to specific file type', () => {
      then('only matched file types appear', () => {
        const result = runInTempGitRepo({
          files: {
            'src/foo.ts': 'const target = true;\n',
            'src/foo.md': '# target header\n',
            'src/foo.json': '{"target": true}\n',
          },
          grepsafeArgs: ['--pattern', 'target', '--glob', '*.ts'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('foo.ts');
        expect(result.stdout).not.toContain('foo.md');
        expect(result.stdout).not.toContain('foo.json');
      });
    });

    when('[t1] glob shows in output tree', () => {
      then('glob value appears in output', () => {
        const result = runInTempGitRepo({
          files: { 'src/a.ts': 'match\n' },
          grepsafeArgs: ['--pattern', 'match', '--glob', '*.ts'],
        });

        expect(result.stdout).toContain('glob: *.ts');
      });
    });
  });

  given('[case4] --context lines', () => {
    when('[t0] context is specified', () => {
      then('adjacent lines are included', () => {
        const result = runInTempGitRepo({
          files: {
            'src/code.ts': 'line1\nline2\nTARGET\nline4\nline5\n',
          },
          grepsafeArgs: ['--pattern', 'TARGET', '--context', '1'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('line2');
        expect(result.stdout).toContain('TARGET');
        expect(result.stdout).toContain('line4');
      });
    });
  });

  given('[case5] --files-only mode', () => {
    when('[t0] files-only flag is set', () => {
      then('only file paths are returned', () => {
        const result = runInTempGitRepo({
          files: {
            'src/a.ts': 'match here\n',
            'src/b.ts': 'match here too\n',
            'src/c.ts': 'unrelated content\n',
          },
          grepsafeArgs: ['--pattern', 'match', '--files-only'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('a.ts');
        expect(result.stdout).toContain('b.ts');
        expect(result.stdout).not.toContain('c.ts');
        // should not contain line content
        expect(result.stdout).not.toContain('match here');
      });
    });
  });

  given('[case6] --count mode', () => {
    when('[t0] count flag is set', () => {
      then('match counts per file are returned', () => {
        const result = runInTempGitRepo({
          files: {
            'src/a.ts': 'foo\nfoo\nfoo\n',
            'src/b.ts': 'foo\n',
          },
          grepsafeArgs: ['--pattern', 'foo', '--count'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('a.ts');
        expect(result.stdout).toContain('3');
        expect(result.stdout).toContain('b.ts');
        expect(result.stdout).toContain('1');
      });
    });
  });

  given('[case7] case insensitive search', () => {
    when('[t0] -i flag is set', () => {
      then('case is ignored in matches', () => {
        const result = runInTempGitRepo({
          files: {
            'a.txt': 'Hello\nhello\nHELLO\nworld\n',
          },
          grepsafeArgs: ['--pattern', 'hello', '-i'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Hello');
        expect(result.stdout).toContain('hello');
        expect(result.stdout).toContain('HELLO');
        expect(result.stdout).not.toContain('world');
      });
    });
  });

  given('[case8] --head limit', () => {
    when('[t0] head limit restricts output', () => {
      then('output is truncated to N lines', () => {
        const result = runInTempGitRepo({
          files: {
            'a.txt': 'match1\nmatch2\nmatch3\nmatch4\nmatch5\n',
          },
          grepsafeArgs: ['--pattern', 'match', '--head', '2'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('lines: 2');
      });
    });
  });

  given('[case9] --path scoped search', () => {
    when('[t0] path restricts search to subdirectory', () => {
      then('only files in path are searched', () => {
        const result = runInTempGitRepo({
          files: {
            'src/a.ts': 'target\n',
            'test/b.ts': 'target\n',
          },
          grepsafeArgs: ['--pattern', 'target', '--path', 'src'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('a.ts');
        expect(result.stdout).not.toContain('b.ts');
      });
    });
  });

  given('[case10] argument validation', () => {
    when('[t0] no pattern provided', () => {
      then('exits with constraint error', () => {
        const result = runInTempGitRepo({
          grepsafeArgs: [],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('--pattern is required');
      });
    });

    when('[t1] unknown option provided', () => {
      then('exits with constraint error', () => {
        const result = runInTempGitRepo({
          grepsafeArgs: ['--unknown', 'value'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('unknown option');
      });
    });

    when('[t2] --help flag', () => {
      then('shows usage info and exits 0', () => {
        const result = runInTempGitRepo({
          grepsafeArgs: ['--help'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('usage:');
        expect(result.stdout).toContain('--pattern');
      });
    });
  });

  given('[case11] safety boundary - path outside repo', () => {
    when('[t0] search path is absolute outside repo', () => {
      then('exits with constraint error', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': 'content\n' },
          grepsafeArgs: ['--pattern', 'content', '--path', '/tmp'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'search path must be within the git repository',
        );
      });
    });

    when('[t1] search path does not exist', () => {
      then('exits with constraint error', () => {
        const result = runInTempGitRepo({
          grepsafeArgs: ['--pattern', 'x', '--path', 'nonexistent_dir'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('search path does not exist');
      });
    });
  });

  given('[case12] not in git repo', () => {
    when('[t0] run outside any git repo', () => {
      then('exits with constraint error', () => {
        const tempDir = genTempDir({ slug: 'grepsafe-no-git' });
        fs.writeFileSync(path.join(tempDir, 'a.txt'), 'content\n');

        const result = spawnSync('bash', [scriptPath, '--pattern', 'content'], {
          cwd: tempDir,
          encoding: 'utf-8', // node api param name
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('not in a git repository');
      });
    });
  });

  given('[case13] output format snapshots', () => {
    when('[t0] match found', () => {
      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          files: { 'src/example.ts': 'const hello = "world";\n' },
          grepsafeArgs: ['--pattern', 'hello'],
        });

        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] no match found', () => {
      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          files: { 'src/example.ts': 'const x = 1;\n' },
          grepsafeArgs: ['--pattern', 'nonexistent'],
        });

        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] regex with pipe alternation', () => {
      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          files: {
            'src/a.ts': 'const foo = 1;\n',
            'src/b.ts': 'const bar = 2;\n',
          },
          grepsafeArgs: ['--pattern', 'foo|bar', '--glob', '*.ts'],
        });

        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case14] --output direct mode', () => {
    when('[t0] match found with direct output', () => {
      then('output is plain results without vibes', () => {
        const result = runInTempGitRepo({
          files: { 'src/example.ts': 'const hello = "world";\n' },
          grepsafeArgs: ['--pattern', 'hello', '--output', 'direct'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).not.toContain('🐢');
        expect(result.stdout).not.toContain('🐚');
        expect(result.stdout).toContain('hello');
      });
    });

    when('[t1] no match found with direct output', () => {
      then('output is empty', () => {
        const result = runInTempGitRepo({
          files: { 'src/example.ts': 'const x = 1;\n' },
          grepsafeArgs: ['--pattern', 'nonexistent', '--output', 'direct'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });

    when('[t2] direct output snapshot', () => {
      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          files: {
            'src/a.ts': 'const foo = 1;\n',
            'src/b.ts': 'const bar = 2;\n',
          },
          grepsafeArgs: [
            '--pattern',
            'foo|bar',
            '--glob',
            '*.ts',
            '--output',
            'direct',
          ],
        });

        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] invalid output mode', () => {
      then('exits with constraint error', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': 'content\n' },
          grepsafeArgs: ['--pattern', 'content', '--output', 'invalid'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('--output must be one of');
      });
    });
  });

  given('[case15] positional args', () => {
    when('[t0] pattern as first positional arg', () => {
      then('pattern is used for search', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': 'findme\n' },
          grepsafeArgs: ['findme'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('findme');
      });
    });
  });
});
