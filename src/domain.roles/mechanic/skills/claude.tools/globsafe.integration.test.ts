import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = integration tests for globsafe.sh skill
 * .why = verify safe file discovery works correctly with patterns, sort, and edge cases
 */
describe('globsafe.sh', () => {
  const scriptPath = path.join(__dirname, 'globsafe.sh');

  /**
   * .what = make a temp dir, and register it for teardown
   * .why  = each invocation makes a temp git repo; afterAll removes them all
   */
  const tempDirsMade: string[] = [];
  const genTempDirTracked = (
    args: Parameters<typeof genTempDir>[0],
  ): string => {
    const dir = genTempDir(args);
    tempDirsMade.push(dir);
    return dir;
  };

  afterAll(() => {
    for (const dir of tempDirsMade) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch (error) {
        // warn, never swallow or throw: a cleanup red would mask the verdict
        // eslint-disable-next-line no-console
        console.warn(`teardown could not remove ${dir}:`, error);
      }
    }
  });

  /**
   * .what = run globsafe.sh in a temp git repo
   * .why = isolates tests from real repo state
   */
  const runInTempGitRepo = (args: {
    files?: Record<string, string>;
    dirs?: string[];
    globsafeArgs: string[];
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDirTracked({ slug: 'globsafe-test', git: true });

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
        // tracked too — the teardown must cover EVERY temp this suite makes,
        // not only the ones the shared helper makes. a helper-scoped cleanup
        // leaves each direct call behind, and looks complete while it does.
        const tempDir = genTempDirTracked({ slug: 'globsafe-no-git' });
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

  // a bad --head is a constraint (exit 2), never a raw bash error
  // .note = case labels are unique, not in file order
  given('[case15] --head rejects input it cannot use', () => {
    const FILES = { 'a.md': 'x', 'b.md': 'x', 'c.md': 'x' };

    when('[t0] --head is not a number', () => {
      then('it is a CONSTRAINT, and no interpreter error leaks', () => {
        const result = runInTempGitRepo({
          files: FILES,
          globsafeArgs: ['--pattern', '*.md', '--head', 'abc'],
        });

        expect({
          exitCode: result.exitCode,
          leaksUnboundVariable: result.stderr.includes('unbound variable'),
          namesTheFlag: result.stdout.includes('--head must be a positive'),
          // rule.require.errors-name-the-fix
          echoesTheBadValue: result.stdout.includes('got: abc'),
          namesAFix: result.stdout.includes('├─ pass a whole number'),
          showsAnExample: result.stdout.includes('--head 20'),
        }).toEqual({
          exitCode: 2,
          leaksUnboundVariable: false,
          namesTheFlag: true,
          echoesTheBadValue: true,
          namesAFix: true,
          showsAnExample: true,
        });
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    // `08` means 8. it is invalid octal, so the array slice dies on it
    // unless the value is recast to decimal; `(first 8)` pins the recast
    when('[t3] --head carries a zero in front', () => {
      then('CONTROL — it is accepted, as it was before the guard', () => {
        // nine files, so a limit of 8 truncates and the tally renders
        const NINE = Object.fromEntries(
          Array.from({ length: 9 }, (_, i) => [`f${i}.md`, 'x']),
        );

        const result = runInTempGitRepo({
          files: NINE,
          globsafeArgs: ['--pattern', '*.md', '--head', '08'],
        });

        expect({
          exitCode: result.exitCode,
          leaksBaseError: result.stderr.includes('value too great for base'),
          tallied: result.stdout.includes('(first 8)'),
        }).toEqual({ exitCode: 0, leaksBaseError: false, tallied: true });

        // the one snap of the truncated-success frame
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] --head is negative', () => {
      then('it refuses rather than slice from the wrong end', () => {
        const result = runInTempGitRepo({
          files: FILES,
          globsafeArgs: ['--pattern', '*.md', '--head', '-2'],
        });

        expect(result.exitCode).toBe(2);
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    // the control: a guard too tight would refuse good input
    when('[t2] --head is valid', () => {
      then('CONTROL — it still limits and still exits 0', () => {
        const result = runInTempGitRepo({
          files: FILES,
          globsafeArgs: ['--pattern', '*.md', '--head', '2'],
        });

        expect({
          exitCode: result.exitCode,
          tallied: result.stdout.includes('(first 2)'),
        }).toEqual({ exitCode: 0, tallied: true });
      });
    });

    // the upper bound, clamped on both peers: bash arithmetic is fixed
    // width, so a 20-digit value wraps negative past the recast
    when('[t5] --head is too wide for bash arithmetic', () => {
      then('it is refused, never wrapped past the gate', () => {
        const result = runInTempGitRepo({
          files: FILES,
          globsafeArgs: ['--pattern', '*.md', '--head', '10000000000000000000'],
        });

        expect({
          exitCode: result.exitCode,
          namesTheBound: result.stdout.includes('at most 18 digits'),
          echoesTheBadValue: result.stdout.includes(
            'got: 10000000000000000000',
          ),
          namesAFix: result.stdout.includes('🥥 did you know?'),
        }).toEqual({
          exitCode: 2,
          namesTheBound: true,
          echoesTheBadValue: true,
          namesAFix: true,
        });
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      // the control for the bound: 18 digits cannot overflow
      then('🟢 CONTROL — an 18-digit --head is still accepted', () => {
        const result = runInTempGitRepo({
          files: FILES,
          globsafeArgs: ['--pattern', '*.md', '--head', '100000000000000000'],
        });

        expect({
          exitCode: result.exitCode,
          refused: result.stdout.includes('at most 18 digits'),
        }).toEqual({ exitCode: 0, refused: false });
      });
    });

    // `--head 0` is refused on both peers: zero rows would read like zero files
    when('[t6] --head 0 — a deliberate refusal, never an oversize', () => {
      then('--head 0 is refused, and the refusal is deliberate', () => {
        const result = runInTempGitRepo({
          files: FILES,
          globsafeArgs: ['--pattern', '*.md', '--head', '0'],
        });

        expect({
          exitCode: result.exitCode,
          namesTheFlag: result.stdout.includes('--head must be a positive'),
        }).toEqual({ exitCode: 2, namesTheFlag: true });
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    // --help documents each gate, so a caller learns it before an exit 2
    when('[t4] a caller reads --help before they meet a gate', () => {
      then('both new refusals are documented there', () => {
        const result = runInTempGitRepo({
          files: FILES,
          globsafeArgs: ['--help'],
        });

        expect({
          exitCode: result.exitCode,
          documentsHead: result.stdout.includes(
            '--head takes a positive integer',
          ),
          documentsRootOnce: result.stdout.includes(
            'a bare positional root stands alone',
          ),
          documentsTheRename: result.stdout.includes(
            "--output 'direct' is renamed 'pipeable'",
          ),
          documentsTheDigitCap: result.stdout.includes('at most 18 digits'),
          // the reason for the cap, so it reads as a refusal, not a whim
          documentsTheHazard: result.stdout.includes('false zero'),
        }).toEqual({
          exitCode: 0,
          documentsHead: true,
          documentsRootOnce: true,
          documentsTheRename: true,
          documentsTheDigitCap: true,
          documentsTheHazard: true,
        });

        // the keys prove each rule is present; the snap shows the page reads
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  // `direct` is renamed `pipeable`: the refusal names the rename, so a
  // caller does not hunt a typo
  given('[case16] --output names its own migration', () => {
    const FILES = { 'a.md': 'x' };

    when('[t0] the retired value is passed', () => {
      then('the refusal names the rename AND the replacement', () => {
        const result = runInTempGitRepo({
          files: FILES,
          globsafeArgs: ['--pattern', '*.md', '--output', 'direct'],
        });

        expect({
          exitCode: result.exitCode,
          namesTheRename: result.stdout.includes(
            '--output direct was renamed to pipeable',
          ),
          echoesTheBadValue: result.stdout.includes('got: direct'),
          namesAFix: result.stdout.includes('├─ pass --output pipeable'),
        }).toEqual({
          exitCode: 2,
          namesTheRename: true,
          echoesTheBadValue: true,
          namesAFix: true,
        });

        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    // the control: a never-valid value takes the generic arm
    when('[t1] a never-valid mode is passed', () => {
      then('CONTROL — the generic refusal holds, and gained a remedy', () => {
        const result = runInTempGitRepo({
          files: FILES,
          globsafeArgs: ['--pattern', '*.md', '--output', 'nosuchmode'],
        });

        expect({
          exitCode: result.exitCode,
          claimsARename: result.stdout.includes('was renamed'),
          namesTheSet: result.stdout.includes('must be one of: vibes,'),
          echoesTheBadValue: result.stdout.includes('got: nosuchmode'),
          namesAFix: result.stdout.includes('├─ name one of the two modes'),
        }).toEqual({
          exitCode: 2,
          claimsARename: false,
          namesTheSet: true,
          echoesTheBadValue: true,
          namesAFix: true,
        });

        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  // every refusal wears the house frame — turtle, shell tree, 🥥 fix — on
  // both streams, walked as a set so a new gate joins the check by default
  given('[case17] every refusal names a next move', () => {
    const FILES = { 'a.md': 'x' };

    const refusals: { why: string; args: string[] }[] = [
      { why: 'no --pattern at all', args: [] },
      { why: 'an unknown flag', args: ['--pattern', '*.md', '--nosuchflag'] },
      {
        why: 'a --sort order that does not exist',
        args: ['--pattern', '*.md', '--sort', 'nosuchorder'],
      },
      {
        why: 'an --output mode that does not exist',
        args: ['--pattern', '*.md', '--output', 'nosuchmode'],
      },
      {
        why: 'the retired --output value',
        args: ['--pattern', '*.md', '--output', 'direct'],
      },
      {
        why: 'a --head that is not a number',
        args: ['--pattern', '*.md', '--head', 'abc'],
      },
      {
        why: 'a search root named twice',
        args: ['--pattern', '*.md', '.', '--path', 'sub'],
      },
      {
        why: 'a --path that does not exist',
        args: ['--pattern', '*.md', '--path', 'nosuchdir_xyz'],
      },
      {
        why: 'a --path outside the repo',
        args: ['--pattern', '*.md', '--path', '/tmp'],
      },
    ];

    when('[t0] each refusal renders', () => {
      then('every one wears the frame, and reaches both streams', () => {
        // refuse a vacuous walk (rule.forbid.failhide)
        expect(refusals.length).toBeGreaterThan(0);

        const frames: string[] = [];

        for (const refusal of refusals) {
          const result = runInTempGitRepo({
            files: FILES,
            globsafeArgs: refusal.args,
          });

          expect({
            why: refusal.why,
            exitCode: result.exitCode,
            wearsTheTurtle: result.stdout.startsWith('🐢 bummer dude...'),
            wearsTheShell: result.stdout.includes('🐚 globsafe'),
            namesAFix: result.stdout.includes('🥥 did you know?'),
            // rule.require.skill-output-streams: a failure reaches stderr too
            reachesStderr: result.stderr === result.stdout,
          }).toEqual({
            why: refusal.why,
            exitCode: 2,
            wearsTheTurtle: true,
            wearsTheShell: true,
            namesAFix: true,
            reachesStderr: true,
          });

          frames.push(`── ${refusal.why} ──\n${sanitizeOutput(result.stdout)}`);
        }

        // one snap for the roster, so the set reads in one diff hunk.
        // one blank line between frames, same as grepsafe's case37[t7]
        expect(frames.join('\n')).toMatchSnapshot();
      });

      // the not-a-repo refusal needs a dir with no `git init`, so it runs here
      then('the not-a-repo refusal carries one too', () => {
        const tempDir = genTempDirTracked({ slug: 'globsafe-no-git-fix' });
        fs.writeFileSync(path.join(tempDir, 'a.md'), 'x');

        const result = spawnSync('bash', [scriptPath, '--pattern', '*.md'], {
          cwd: tempDir,
          encoding: 'utf-8',
        });

        expect({
          exitCode: result.status,
          namesAFix: result.stdout.includes('├─ cd into a git repo'),
        }).toEqual({ exitCode: 2, namesAFix: true });

        expect(sanitizeOutput(result.stdout ?? '')).toMatchSnapshot();
      });
    });
  });

  given('[case12] --output pipeable mode', () => {
    when('[t0] files found with pipeable output', () => {
      then('output is plain file paths without vibes', () => {
        const result = runInTempGitRepo({
          files: {
            'src/a.ts': 'content',
            'src/b.ts': 'content',
          },
          globsafeArgs: ['--pattern', 'src/*.ts', '--output', 'pipeable'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).not.toContain('🐢');
        expect(result.stdout).not.toContain('🐚');
        expect(result.stdout).toContain('a.ts');
        expect(result.stdout).toContain('b.ts');
      });
    });

    when('[t1] no files found with pipeable output', () => {
      then('output is empty', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': 'content' },
          globsafeArgs: ['--pattern', '*.xyz', '--output', 'pipeable'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });

    when('[t2] pipeable output snapshot', () => {
      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          files: {
            'src/a.ts': 'content',
            'src/b.ts': 'content',
          },
          globsafeArgs: ['--pattern', 'src/*.ts', '--output', 'pipeable'],
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

    // stdout is data under pipeable, so a refusal there would read as a
    // result. the refusal goes to stderr alone, glyph-free (F20)
    when('[t4] a refusal under pipeable output', () => {
      then('it reaches stderr only, with a greppable fix: line', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': 'content' },
          globsafeArgs: [
            '--pattern',
            '*.txt',
            '--head',
            'abc',
            '--output',
            'pipeable',
          ],
        });

        expect({
          exitCode: result.exitCode,
          stdout: result.stdout,
          headline: result.stderr.startsWith(
            'globsafe: --head must be a positive',
          ),
          namesAFix: result.stderr.includes('fix: pass a whole number'),
          glyphFree: !/[🐢🐚🥥]/u.test(result.stderr),
        }).toEqual({
          exitCode: 2,
          stdout: '',
          headline: true,
          namesAFix: true,
          glyphFree: true,
        });
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    // an unknown flag is refused after the parse, so a later --output holds
    when('[t5] an unknown flag before --output pipeable', () => {
      then('the refusal still honors the pipeable stream', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': 'content' },
          globsafeArgs: [
            '--nosuchflag',
            '--pattern',
            '*.txt',
            '--output',
            'pipeable',
          ],
        });

        expect({
          exitCode: result.exitCode,
          stdout: result.stdout,
          headline: result.stderr.startsWith(
            'globsafe: unknown option: --nosuchflag',
          ),
        }).toEqual({ exitCode: 2, stdout: '', headline: true });
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

    // a second search root is refused, never silently kept
    when('[t1] a third positional would overwrite the root', () => {
      const FILES = { 'a.txt': 'x', 'sub/b.txt': 'x' };

      then('🟢 CONTROL — pattern + path as two positionals still works', () => {
        const result = runInTempGitRepo({
          files: FILES,
          globsafeArgs: ['*.txt', 'sub'],
        });

        expect({
          exitCode: result.exitCode,
          scopedToTheNamedRoot:
            result.stdout.includes('b.txt') && !result.stdout.includes('a.txt'),
        }).toEqual({ exitCode: 0, scopedToTheNamedRoot: true });
      });

      then('a third positional is refused, and names BOTH roots', () => {
        const result = runInTempGitRepo({
          files: FILES,
          globsafeArgs: ['*.txt', 'sub', 'strayarg'],
        });

        expect({
          exitCode: result.exitCode,
          namesTheFirst: result.stdout.includes('first: sub'),
          namesTheSecond: result.stdout.includes('then:  strayarg'),
          namesAFix: result.stdout.includes('├─ name each root with --path'),
        }).toEqual({
          exitCode: 2,
          namesTheFirst: true,
          namesTheSecond: true,
          namesAFix: true,
        });
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      // the same invariant in both argv orders
      then('--path AFTER a positional root is refused', () => {
        const result = runInTempGitRepo({
          files: FILES,
          globsafeArgs: ['--pattern', '*.txt', '--path', 'sub', 'strayarg'],
        });

        expect({
          exitCode: result.exitCode,
          namesBothRoots:
            result.stdout.includes('first: sub') &&
            result.stdout.includes('then:  strayarg'),
        }).toEqual({ exitCode: 2, namesBothRoots: true });
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('the REVERSE order refuses identically', () => {
        const result = runInTempGitRepo({
          files: FILES,
          globsafeArgs: ['--pattern', '*.txt', 'sub', '--path', 'strayarg'],
        });

        expect({
          exitCode: result.exitCode,
          namesBothRoots:
            result.stdout.includes('first: sub') &&
            result.stdout.includes('then:  strayarg'),
        }).toEqual({ exitCode: 2, namesBothRoots: true });
        // .note = the gate reports argv position, not which flag supplied
        //         each root, so this frame matches its twin's bytes
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
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

  // the radio reports this closes in globsafe: every --pattern is matched
  // (#658), every --path is searched (#781), and a hidden path a wildcard
  // skipped is named beside a zero or beside results (#780)
  given('[case18] every pattern, every root, and the hidden skip', () => {
    const TREE = {
      'a/one.md': 'x',
      'b/two.md': 'x',
      'b/three.ts': 'x',
    };

    // the sorted file set a pipeable run returns
    const filesFound = (globsafeArgs: string[]): string[] =>
      runInTempGitRepo({
        files: TREE,
        globsafeArgs: [...globsafeArgs, '--output', 'pipeable'],
      })
        .stdout.split('\n')
        .filter(Boolean)
        .sort();

    when('[t0] --pattern is repeated', () => {
      then('the union is returned, never only the last', () => {
        expect(
          filesFound(['--pattern', 'a/*.md', '--pattern', 'b/*.ts']),
        ).toEqual(['a/one.md', 'b/three.ts']);
      });
      then('a file two patterns match is listed once', () => {
        expect(
          filesFound(['--pattern', 'b/*.md', '--pattern', 'b/two.*']),
        ).toEqual(['b/two.md']);
      });
    });

    when('[t1] --path is repeated', () => {
      const result = useThen('the search runs', () =>
        runInTempGitRepo({
          files: TREE,
          globsafeArgs: ['--pattern', '*.md', '--path', 'a', '--path', 'b'],
        }),
      );
      then('every root is searched, each path under its root', () => {
        expect({
          exitCode: result.exitCode,
          a: result.stdout.includes('a/one.md'),
          b: result.stdout.includes('b/two.md'),
          header: result.stdout.includes('├─ paths: a, b'),
        }).toEqual({ exitCode: 0, a: true, b: true, header: true });
      });
      then('the two-root answer is snapped', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] a wildcard skips a hidden path that would match', () => {
      const result = useThen('the search runs', () =>
        runInTempGitRepo({
          files: { ...TREE, '.hid/c.md': 'x' },
          globsafeArgs: ['--pattern', '**/*.md'],
        }),
      );
      then('the partial answer says so, and names --hidden', () => {
        expect({
          exitCode: result.exitCode,
          skipped: result.stdout.includes(
            '├─ skipped: 1 hidden path(s) also match',
          ),
          namesTheFix: result.stdout.includes(
            "globsafe.sh --pattern '**/*.md' --hidden",
          ),
        }).toEqual({ exitCode: 0, skipped: true, namesTheFix: true });
      });
      then('the partial answer is snapped', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] the only match sits in a hidden path', () => {
      then('the zero says where the match hides (#780)', () => {
        const result = runInTempGitRepo({
          files: { '.behavior/wish.md': 'x', 'b/two.ts': 'x' },
          globsafeArgs: ['--pattern', '**/*.md'],
        });
        expect(
          result.stdout.includes(
            'files: 0 — none in the walked trees, but 1 hidden path(s) match',
          ),
        ).toBe(true);
      });
    });

    when('[t4] --hidden is named', () => {
      then('the hidden path is returned, and .git never is', () => {
        expect(
          filesFound(['--pattern', '**/*', '--hidden']).filter(
            (file) => file.startsWith('.git/') || file === '.git',
          ),
        ).toEqual([]);
        const withHidden = runInTempGitRepo({
          files: { ...TREE, '.hid/c.md': 'x' },
          globsafeArgs: ['--pattern', '**/*.md', '--hidden'],
        });
        expect({
          found: withHidden.stdout.includes('.hid/c.md'),
          scope: withHidden.stdout.includes('dot paths included (--hidden)'),
          skipped: withHidden.stdout.includes('skipped:'),
        }).toEqual({ found: true, scope: true, skipped: false });
      });
    });

    when('[t5] 🟢 CONTROL — no hidden path would match', () => {
      then('results carry no skipped branch and no hint', () => {
        const result = runInTempGitRepo({
          files: { ...TREE, '.hid/c.ts': 'x' },
          globsafeArgs: ['--pattern', '**/*.md'],
        });
        expect({
          skipped: result.stdout.includes('skipped:'),
          hint: result.stdout.includes('did you know?'),
        }).toEqual({ skipped: false, hint: false });
      });
    });
  });
});
