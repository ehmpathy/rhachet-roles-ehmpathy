import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = integration tests for globsafe.sh skill
 * .why = verify safe file discovery works correctly with patterns, sort, and edge cases
 */
describe('globsafe.sh', () => {
  const scriptPath = path.join(__dirname, 'globsafe.sh');

  /**
   * .what = run globsafe.sh in a temp git repo
   * .why = isolates tests from real repo state
   */
  const runInTempGitRepo = (args: {
    files?: Record<string, string>;
    dirs?: string[];
    globsafeArgs: string[];
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'globsafe-test', git: true });

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

    // run globsafe.sh
    const result = spawnSync('bash', [scriptPath, ...args.globsafeArgs], {
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
   * .why = temp dir paths and timestamps change between runs
   */
  const sanitizeOutput = (stdout: string): string =>
    stdout
      .replace(/\/tmp\/[^\s]+/g, '/tmp/TEMP_DIR')
      .replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g, 'YYYY-MM-DD HH:MM:SS');

  given('[case1] basic glob pattern', () => {
    when('[t0] pattern matches files', () => {
      then('matched files are listed', () => {
        const result = runInTempGitRepo({
          files: {
            'src/a.ts': 'content a',
            'src/b.ts': 'content b',
            'src/c.md': 'content c',
          },
          globsafeArgs: ['--pattern', 'src/*.ts'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('sweet');
        expect(result.stdout).toContain('a.ts');
        expect(result.stdout).toContain('b.ts');
        expect(result.stdout).not.toContain('c.md');
      });

      then('output shows turtle header and tree structure', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': 'content' },
          globsafeArgs: ['--pattern', '*.txt'],
        });

        expect(result.stdout).toContain('🐢');
        expect(result.stdout).toContain('🐚 globsafe');
        expect(result.stdout).toContain('pattern: *.txt');
        expect(result.stdout).toContain('found');
      });
    });

    when('[t1] pattern matches zero files', () => {
      then('output shows crickets', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': 'content' },
          globsafeArgs: ['--pattern', '*.xyz'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('crickets');
        expect(result.stdout).toContain('files: 0');
      });
    });
  });

  given('[case2] recursive glob **/', () => {
    when('[t0] recursive pattern matches nested files', () => {
      then('files at all depths are found', () => {
        const result = runInTempGitRepo({
          files: {
            'src/a.ts': 'content',
            'src/deep/b.ts': 'content',
            'src/deep/deeper/c.ts': 'content',
            'src/deep/deeper/d.md': 'content',
          },
          globsafeArgs: ['--pattern', 'src/**/*.ts'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('a.ts');
        expect(result.stdout).toContain('b.ts');
        expect(result.stdout).toContain('c.ts');
        expect(result.stdout).not.toContain('d.md');
        expect(result.stdout).toContain('files: 3');
      });
    });
  });

  given('[case3] --path scoped search', () => {
    when('[t0] pattern with path restricts to subdirectory', () => {
      then('only files under path are found', () => {
        const result = runInTempGitRepo({
          files: {
            'src/a.ts': 'content',
            'test/b.ts': 'content',
          },
          globsafeArgs: ['--pattern', '*.ts', '--path', 'src'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('a.ts');
        expect(result.stdout).not.toContain('b.ts');
      });
    });
  });

  given('[case4] --long detailed output', () => {
    when('[t0] long flag shows size and mtime', () => {
      then('output contains file metadata', () => {
        const result = runInTempGitRepo({
          files: {
            'src/small.ts': 'x',
            'src/big.ts': 'x'.repeat(2048),
          },
          globsafeArgs: ['--pattern', 'src/*.ts', '--long'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('small.ts');
        expect(result.stdout).toContain('big.ts');
        // big.ts should show K size
        expect(result.stdout).toContain('K');
      });
    });
  });

  given('[case5] --head limit', () => {
    when('[t0] head limit restricts file count', () => {
      then('output is truncated', () => {
        const result = runInTempGitRepo({
          files: {
            'a.txt': 'content',
            'b.txt': 'content',
            'c.txt': 'content',
            'd.txt': 'content',
            'e.txt': 'content',
          },
          globsafeArgs: ['--pattern', '*.txt', '--head', '2'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('first 2');
      });
    });
  });

  given('[case6] --sort options', () => {
    when('[t0] sort by name (default)', () => {
      then('files are alphabetically ordered', () => {
        const result = runInTempGitRepo({
          files: {
            'c.txt': 'content',
            'a.txt': 'content',
            'b.txt': 'content',
          },
          globsafeArgs: ['--pattern', '*.txt', '--sort', 'name'],
        });

        expect(result.exitCode).toBe(0);
        const lines = result.stdout.split('\n');
        const fileLines = lines.filter((l) => l.includes('.txt'));
        const firstIdx = fileLines.findIndex((l) => l.includes('a.txt'));
        const lastIdx = fileLines.findIndex((l) => l.includes('c.txt'));
        expect(firstIdx).toBeLessThan(lastIdx);
      });
    });

    when('[t1] invalid sort option', () => {
      then('exits with constraint error', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': 'content' },
          globsafeArgs: ['--pattern', '*.txt', '--sort', 'invalid'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('--sort must be one of');
      });
    });
  });

  given('[case7] argument validation', () => {
    when('[t0] no pattern provided', () => {
      then('exits with constraint error', () => {
        const result = runInTempGitRepo({
          globsafeArgs: [],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('--pattern is required');
      });
    });

    when('[t1] unknown option provided', () => {
      then('exits with constraint error', () => {
        const result = runInTempGitRepo({
          globsafeArgs: ['--unknown', 'value'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('unknown option');
      });
    });

    when('[t2] --help flag', () => {
      then('shows usage info and exits 0', () => {
        const result = runInTempGitRepo({
          globsafeArgs: ['--help'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('usage:');
        expect(result.stdout).toContain('--pattern');
      });
    });
  });

  given('[case8] safety boundary - path outside repo', () => {
    when('[t0] search path is absolute outside repo', () => {
      then('exits with constraint error', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': 'content' },
          globsafeArgs: ['--pattern', '*.txt', '--path', '/tmp'],
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
          globsafeArgs: ['--pattern', '*.txt', '--path', 'nonexistent_dir'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('search path does not exist');
      });
    });
  });

  given('[case9] not in git repo', () => {
    when('[t0] run outside any git repo', () => {
      then('exits with constraint error', () => {
        const tempDir = genTempDir({ slug: 'globsafe-no-git' });
        fs.writeFileSync(path.join(tempDir, 'a.txt'), 'content');

        const result = spawnSync('bash', [scriptPath, '--pattern', '*.txt'], {
          cwd: tempDir,
          encoding: 'utf-8', // node api param name
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('not in a git repository');
      });
    });
  });

  given('[case10] special characters in paths', () => {
    when('[t0] filename has spaces', () => {
      then('file is found correctly', () => {
        const result = runInTempGitRepo({
          files: { 'my file.txt': 'content' },
          globsafeArgs: ['--pattern', '*.txt'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('my file.txt');
      });
    });

    when('[t1] filename has unicode', () => {
      then('file is found correctly', () => {
        const result = runInTempGitRepo({
          files: { '目標.txt': 'content' },
          globsafeArgs: ['--pattern', '*.txt'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('目標.txt');
      });
    });
  });

  given('[case11] output format snapshots', () => {
    when('[t0] files found', () => {
      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          files: {
            'src/a.ts': 'content',
            'src/b.ts': 'content',
          },
          globsafeArgs: ['--pattern', 'src/*.ts'],
        });

        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] no files found', () => {
      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': 'content' },
          globsafeArgs: ['--pattern', '*.xyz'],
        });

        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] long output', () => {
      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': 'content' },
          globsafeArgs: ['--pattern', '*.txt', '--long'],
        });

        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case12] --output direct mode', () => {
    when('[t0] files found with direct output', () => {
      then('output is plain file paths without vibes', () => {
        const result = runInTempGitRepo({
          files: {
            'src/a.ts': 'content',
            'src/b.ts': 'content',
          },
          globsafeArgs: ['--pattern', 'src/*.ts', '--output', 'direct'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).not.toContain('🐢');
        expect(result.stdout).not.toContain('🐚');
        expect(result.stdout).toContain('a.ts');
        expect(result.stdout).toContain('b.ts');
      });
    });

    when('[t1] no files found with direct output', () => {
      then('output is empty', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': 'content' },
          globsafeArgs: ['--pattern', '*.xyz', '--output', 'direct'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });

    when('[t2] direct output snapshot', () => {
      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          files: {
            'src/a.ts': 'content',
            'src/b.ts': 'content',
          },
          globsafeArgs: ['--pattern', 'src/*.ts', '--output', 'direct'],
        });

        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] invalid output mode', () => {
      then('exits with constraint error', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': 'content' },
          globsafeArgs: ['--pattern', '*.txt', '--output', 'invalid'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('--output must be one of');
      });
    });
  });

  given('[case13] positional args', () => {
    when('[t0] pattern as first positional arg', () => {
      then('pattern is used for file discovery', () => {
        const result = runInTempGitRepo({
          files: { 'hello.txt': 'content' },
          globsafeArgs: ['*.txt'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('hello.txt');
      });
    });
  });

  given('[case14] bracket characters with --literal flag', () => {
    when('[t0] file with brackets exists and --literal used', () => {
      then('file is found successfully', () => {
        const result = runInTempGitRepo({
          files: { 'doc.[ref].md': 'bracket content' },
          globsafeArgs: ['--literal', '--pattern', 'doc.[ref].md'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('doc.[ref].md');
        expect(result.stdout).toContain('files: 1');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] file with brackets absent and --literal used', () => {
      then('shows zero files without hint', () => {
        const result = runInTempGitRepo({
          globsafeArgs: ['--literal', '--pattern', 'absent.[ref].md'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('files: 0');
        expect(result.stdout).not.toContain('did you know');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] file with brackets exists and escape syntax used', () => {
      then('file is found successfully', () => {
        const result = runInTempGitRepo({
          files: { 'doc.[ref].md': 'bracket content' },
          globsafeArgs: ['--pattern', 'doc.\\[ref\\].md'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('doc.[ref].md');
        expect(result.stdout).toContain('files: 1');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] brackets used without --literal and no match', () => {
      then('shows did-you-know hint', () => {
        const result = runInTempGitRepo({
          files: { 'other.md': 'other content' },
          globsafeArgs: ['--pattern', 'doc.[ref].md'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('files: 0');
        expect(result.stdout).toContain('did you know');
        expect(result.stdout).toContain('--literal');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t4] brackets used without --literal but file matches', () => {
      then('hint does not appear on success', () => {
        const result = runInTempGitRepo({
          files: { 'doc.r.md': 'matches [ref] as r' },
          globsafeArgs: ['--pattern', 'doc.[ref].md'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).not.toContain('did you know');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });
});
