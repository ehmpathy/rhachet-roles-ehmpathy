import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = integration tests for grepsafe.sh skill
 * .why = verify safe content search works correctly with regex, filters, and edge cases
 */
describe('grepsafe.sh', () => {
  const scriptPath = path.join(__dirname, 'grepsafe.sh');

  /**
   * .what = make a temp dir, and register it for teardown
   * .why  = each run makes a temp repo, plus `rg` stubs, out-of-repo peers,
   *         and chmod-000 dirs. left behind, they pile up in /tmp and break
   *         later cleanups
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
        // warn loud, never swallow; but don't throw, which would mask the verdict
        // eslint-disable-next-line no-console
        console.warn(`teardown could not remove ${dir}:`, error);
      }
    }
  });

  /**
   * .what = run grepsafe.sh in a temp git repo
   * .why = isolates tests from real repo state
   */
  const runInTempGitRepo = (args: {
    files?: Record<string, string>;
    symlinks?: Record<string, string>; // linkRelPath -> target (relative to link dir)
    env?: NodeJS.ProcessEnv;
    // a hang guard, never a speed assertion: a hang is infinite, so any
    // finite bound tells it from a slow box
    timeoutMs?: number;
    // text piped to stdin; absent = an empty pipe, as a harness gives
    input?: string;
    // 'ignore' = stdin is /dev/null, a char device, never a pipe
    stdin?: 'pipe' | 'ignore';
    // how `input` reaches the skill: node hands a child a socket, so a shell
    // pipe (a FIFO) and a `<` redirect (a regular file) each need a shell
    stdinVia?: 'fifo' | 'file';
    grepsafeArgs: string[];
  }): {
    stdout: string;
    stderr: string;
    exitCode: number;
    // null unless the run was KILLED — the one field that parts a hang
    // from an honest slow return
    signal: NodeJS.Signals | null;
    tempDir: string;
  } => {
    const tempDir = genTempDirTracked({ slug: 'grepsafe-test', git: true });

    // create files
    if (args.files) {
      for (const [filePath, content] of Object.entries(args.files)) {
        const fullPath = path.join(tempDir, filePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
      }
    }

    // create symlinks (dir or file links, as their target dictates)
    if (args.symlinks) {
      for (const [linkPath, target] of Object.entries(args.symlinks)) {
        const fullLink = path.join(tempDir, linkPath);
        fs.mkdirSync(path.dirname(fullLink), { recursive: true });
        fs.symlinkSync(target, fullLink);
      }
    }

    // write the input to a file outside the repo, for the shell-fed shapes
    const inputFile = args.stdinVia
      ? path.join(genTempDirTracked({ slug: 'grepsafe-input' }), 'input.txt')
      : '';
    if (args.stdinVia) fs.writeFileSync(inputFile, args.input ?? '');

    // pick the spawn: direct (stdin a socket), or via a shell pipe or redirect
    const shellLines = {
      fifo: 'cat "$GREPSAFE_INPUT" | bash "$0" "$@"',
      file: 'bash "$0" "$@" < "$GREPSAFE_INPUT"',
    };
    const spawnArgs = args.stdinVia
      ? ['-c', shellLines[args.stdinVia], scriptPath, ...args.grepsafeArgs]
      : [scriptPath, ...args.grepsafeArgs];

    // run grepsafe.sh
    const result = spawnSync('bash', spawnArgs, {
      cwd: tempDir,
      encoding: 'utf-8', // node api param name
      stdio: [args.stdin ?? 'pipe', 'pipe', 'pipe'],
      env: { ...(args.env ?? process.env), GREPSAFE_INPUT: inputFile },
      timeout: args.timeoutMs, // node api param name; undefined = no bound
      input: args.stdinVia ? undefined : args.input, // node api param name
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      signal: result.signal ?? null,
      tempDir,
    };
  };

  /**
   * .what = compare two strings by byte order, never by locale
   * .why  = the skill sorts with `LC_ALL=C`; `localeCompare` reads the host
   *         locale and could disagree with it
   */
  const byteOrder = (a: string, b: string): number =>
    a < b ? -1 : a > b ? 1 : 0;

  /**
   * .what = sanitize stdout for snapshot stability
   * .why = temp dir paths change between runs, grep result order varies
   */
  const sanitizeOutput = (stdout: string): string => {
    // replace temp paths
    const output = stdout.replace(/\/tmp\/[^\s]+/g, '/tmp/TEMP_DIR');

    // sort grep result lines for deterministic order
    // matches lines like "src/a.ts:1:content" or "│  src/a.ts:1:content"
    const lines = output.split('\n');
    const resultLinePattern = /^(\s*│?\s*)(\S+:\d+:.*)$/;

    // find contiguous blocks of result lines and sort them
    let i = 0;
    while (i < lines.length) {
      const blockStart = i;
      const resultLines: Array<{ prefix: string; content: string }> = [];

      // collect contiguous result lines
      while (i < lines.length) {
        const match = lines[i]?.match(resultLinePattern);
        if (match) {
          resultLines.push({ prefix: match[1] ?? '', content: match[2] ?? '' });
          i++;
        } else {
          break;
        }
      }

      // sort and replace if we found results
      if (resultLines.length > 1) {
        resultLines.sort((a, b) => byteOrder(a.content, b.content));
        for (let j = 0; j < resultLines.length; j++) {
          const item = resultLines[j];
          if (item) {
            lines[blockStart + j] = item.prefix + item.content;
          }
        }
      }

      i++;
    }

    return lines.join('\n');
  };

  /**
   * .what = sort the body lines inside a rendered tree block
   * .why  = rg names unreadable paths in parallel-walk order, which varies
   *         between runs. `sanitizeOutput` sorts result lines only
   * .note = each contiguous run sorts alone, so separators, frame glyphs,
   *         and the `fix:` line keep their places
   */
  const sortBlockBodyLines = (text: string): string => {
    const lines = text.split('\n');
    // an optional continuation column, and content that is never a frame
    // glyph — else a nested block's frame lines would sort into the body
    const bodyLinePattern = /^(\s*(?:│\s\s)?│\s\s)([^\s│├└].*)$/;

    let i = 0;
    while (i < lines.length) {
      const run: Array<{ prefix: string; content: string }> = [];
      while (i < lines.length) {
        const match = lines[i]?.match(bodyLinePattern);
        if (!match) break;
        run.push({ prefix: match[1] ?? '', content: match[2] ?? '' });
        i++;
      }

      if (run.length > 1) {
        run.sort((a, b) => byteOrder(a.content, b.content));
        const runStart = i - run.length;
        for (let j = 0; j < run.length; j++) {
          const item = run[j];
          if (item) lines[runStart + j] = item.prefix + item.content;
        }
      }

      // step past a line that matched no run, or the loop never advances
      if (run.length === 0) i++;
    }

    return lines.join('\n');
  };

  given('[case1] basic pattern search', () => {
    when('[t0] pattern matches content in files', () => {
      then('matched lines are returned', () => {
        const result = runInTempGitRepo({
          files: {
            'src/reef.ts': 'const paddleOut = 1;\nconst wipeout = 2;\n',
            'src/shore.ts': 'const driftwood = 3;\n',
          },
          grepsafeArgs: ['--pattern', 'paddleOut'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('paddleOut');
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
    when('[t0] alternation pattern like (paddleOut|wipeout)', () => {
      then('both alternatives are matched', () => {
        const result = runInTempGitRepo({
          files: {
            'src/a.ts': 'const paddleOut = 1;\n',
            'src/b.ts': 'const wipeout = 2;\n',
            'src/c.ts': 'const driftwood = 3;\n',
          },
          grepsafeArgs: ['--pattern', 'paddleOut|wipeout'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('paddleOut');
        expect(result.stdout).toContain('wipeout');
        expect(result.stdout).not.toContain('driftwood');
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
            'src/reef.ts': 'const target = true;\n',
            'src/reef.md': '# target header\n',
            'src/reef.json': '{"target": true}\n',
          },
          grepsafeArgs: ['--pattern', 'target', '--glob', '*.ts'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('reef.ts');
        expect(result.stdout).not.toContain('reef.md');
        expect(result.stdout).not.toContain('reef.json');
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

      // one file: a multi-file frame's order varies with rg's parallel walk.
      // [case36] holds the `files:` label to the mode
      then('the files-only vibes frame matches snapshot', () => {
        const result = runInTempGitRepo({
          files: { 'src/a.ts': 'match here\n' },
          grepsafeArgs: ['--pattern', 'match', '--files-only'],
        });
        // explicit claims beside the snapshot, which accepts any resnap
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('files: 1');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case6] --count mode', () => {
    when('[t0] count flag is set', () => {
      then('match counts per file are returned', () => {
        const result = runInTempGitRepo({
          files: {
            'src/a.ts': 'paddleOut\npaddleOut\npaddleOut\n',
            'src/b.ts': 'paddleOut\n',
          },
          grepsafeArgs: ['--pattern', 'paddleOut', '--count'],
        });

        expect(result.exitCode).toBe(0);
        // each file paired with its count, so swapped counts fail
        expect(result.stdout).toContain('a.ts:3');
        expect(result.stdout).toContain('b.ts:1');
      });

      // one file: rg's parallel walk orders per-file counts at random.
      // the multi-file case is asserted above
      then('the count vibes frame matches snapshot', () => {
        const result = runInTempGitRepo({
          files: { 'src/a.ts': 'paddleOut\npaddleOut\npaddleOut\n' },
          grepsafeArgs: ['--pattern', 'paddleOut', '--count'],
        });
        // explicit claims beside the snapshot, which accepts any resnap
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('a.ts:3');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
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
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case8] --head limit names the cut it made', () => {
    // .why = `lines: 2` must never read as complete when 5 matched.
    //        [t1] is the control: the marker appears only on a real cut
    const FIVE_MATCHES = {
      'a.txt': 'match1\nmatch2\nmatch3\nmatch4\nmatch5\n',
    };

    when('[t0] the limit is BELOW the match count', () => {
      then(
        'the tally names the total and the cut, and the body holds N',
        () => {
          const result = runInTempGitRepo({
            files: FIVE_MATCHES,
            grepsafeArgs: ['--pattern', 'match', '--head', '2'],
          });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('lines: 5 (first 2)');
          expect(result.stdout).toContain('match1');
          expect(result.stdout).toContain('match2');
          expect(result.stdout).not.toContain('match3');
          expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        },
      );
    });

    when('[t1] the limit is ABOVE the match count (the control)', () => {
      then('the tally is plain — no cut was made, so none is named', () => {
        const result = runInTempGitRepo({
          files: FIVE_MATCHES,
          grepsafeArgs: ['--pattern', 'match', '--head', '50'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('lines: 5');
        expect(result.stdout).not.toContain('(first');
        expect(result.stdout).toContain('match5');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] the cut is made under --files-only', () => {
      // --help promises `<files|rows|lines>: <total> (first N)`. [t0] pins
      // `lines`, this pins `files`, [case36][t3] pins `rows`
      then(
        'the tally names FILES, never lines, and still marks the cut',
        () => {
          const result = runInTempGitRepo({
            files: {
              'a.txt': `${KNOWN}\n`,
              'b.txt': `${KNOWN}\n`,
              'c.txt': `${KNOWN}\n`,
            },
            grepsafeArgs: ['--pattern', KNOWN, '--files-only', '--head', '1'],
          });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('files: 3 (first 1)');
          // the label MOVED — a hardcoded `lines:` would fail here and pass [t0]
          expect(result.stdout).not.toContain('lines:');

          // the cut keeps the first file by path, never an arbitrary one
          expect(result.stdout).toContain('a.txt');
          expect(result.stdout).not.toContain('b.txt');
          expect(result.stdout).not.toContain('c.txt');

          expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        },
      );
    });

    // .what = the cut is stable across runs
    // .why  = one run cannot detect nondeterminism. [t2] pins which file;
    //         this pins that it does not move
    when('[t3] the same cut is taken twice', () => {
      then('both runs return the identical file — the cut is stable', () => {
        const files = Object.fromEntries(
          // enough files that a parallel walk has real freedom to reorder
          Array.from({ length: 12 }, (_, n) => [
            `f${String(n).padStart(2, '0')}.txt`,
            `${KNOWN}\n`,
          ]),
        );
        const run = () =>
          runInTempGitRepo({
            files,
            grepsafeArgs: [
              '--pattern',
              KNOWN,
              '--files-only',
              '--head',
              '3',
              '--output',
              'pipeable',
            ],
          }).stdout;

        const first = run();
        const second = run();

        expect({
          stable: first === second,
          // and the order is the declared one
          takesTheLexicalFirstThree: first
            .trim()
            .split('\n')
            .map((line) => line.trim()),
        }).toEqual({
          stable: true,
          takesTheLexicalFirstThree: ['f00.txt', 'f01.txt', 'f02.txt'],
        });
      });
    });

    when('[t4] the cut is made on a result LARGER than the pipe buffer', () => {
      // a pipe into `head` breaks only past 64 KiB: head closes early, the
      // producer exits 141, and `pipefail` + `set -e` kill the render.
      // the fixtures above are too small to reach it
      const LINE = 'paddleOut into the lineup at dawn';
      const BIG_LINE_COUNT = 5000; // ~170 KiB rendered — well past 64 KiB
      const BIG = {
        'big.txt': `${`${LINE}\n`.repeat(BIG_LINE_COUNT)}`,
      };

      then('it returns the first N and exits 0 — never SIGPIPE', () => {
        const result = runInTempGitRepo({
          files: BIG,
          grepsafeArgs: ['--pattern', 'paddleOut', '--head', '3'],
        });

        // under the pipe form this is 141, with empty stdout
        expect(result.exitCode).toBe(0);
        expect(result.exitCode).not.toBe(141);
        // the tally still names the pre-cut total, so the cut is not silent
        expect(result.stdout).toContain(`lines: ${BIG_LINE_COUNT} (first 3)`);
        expect(result.stdout).toContain(LINE);
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

      // --help makes claims about behavior: the snapshot shows any edit in a
      // pr diff, and the explicit claims below hold its two key promises
      then('the --help notes block matches snapshot', () => {
        const result = runInTempGitRepo({
          grepsafeArgs: ['--help'],
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('notes:');
        expect(result.stdout).toContain('to name a path opts into');
        expect(result.stdout).toContain('rg (ripgrep) is required');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      // and the two claims the branches actually enforce, asserted
      // explicitly — so a snapshot update cannot silently drop them
      then('it states the negative case a prefix-less glob meets', () => {
        const result = runInTempGitRepo({
          grepsafeArgs: ['--help'],
        });
        expect(result.stdout).toContain('names no path');
        expect(result.stdout).toContain('rg (ripgrep) is required');
        expect(result.stdout).toContain('within the repo');
      });

      // [case14][t4] pins the behavior (two zero-kinds read alike under
      // pipeable); this pins that --help tells the caller so
      then(
        'it warns that --output pipeable renders two zero-kinds alike',
        () => {
          const result = runInTempGitRepo({
            grepsafeArgs: ['--help'],
          });
          const out = result.stdout;
          expect({
            namesTheMode: out.includes('--output pipeable renders an empty'),
            namesBothKinds:
              out.includes('no file matched the glob') &&
              out.includes('no line matched the'),
            namesTheWayOut: out.includes('vibes default'),
          }).toEqual({
            namesTheMode: true,
            namesBothKinds: true,
            namesTheWayOut: true,
          });
        },
      );
    });
  });

  given('[case11] safety boundary - path outside repo', () => {
    // the security-critical refusal. both arms are snapped: `named by:`
    // differs between this and the --glob variant (case28 [t0]/[t4])
    const scrubBoundaryRoots = (text: string): string => {
      const repoRoot = /repo root:\s+(\S+)/.exec(text)?.[1] ?? '';
      const searchPath = /search path:\s+(\S+)/.exec(text)?.[1] ?? '';
      // an empty token would scrub naught, so assert both are found
      expect(repoRoot).not.toBe('');
      expect(searchPath).not.toBe('');
      return sanitizeOutput(
        text.split(repoRoot).join('<repo>').split(searchPath).join('<outside>'),
      );
    };

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
        // the line that parts this frame from its --glob twin
        expect(result.stdout).toContain('named by:    --path');
        expect(scrubBoundaryRoots(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] the same boundary is crossed under --output pipeable', () => {
      // a refusal must leave pipeable stdout clean (--glob twin: case28 [t4])
      then('stdout stays pipe-clean and stderr names the fix', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': 'content\n' },
          grepsafeArgs: [
            '--pattern',
            'content',
            '--path',
            '/tmp',
            '--output',
            'pipeable',
          ],
        });

        expect(result.exitCode).toBe(2);
        // the harm first: a refusal frame on the data stream
        expect(result.stdout.trim()).toBe('');
        expect(result.stderr).toContain(
          'search path must be within the git repository',
        );
        expect(result.stderr).toContain('named by:    --path');
        expect(scrubBoundaryRoots(result.stderr)).toMatchSnapshot();
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

    // the refusal must blame the flag that crossed: --path did, the glob only
    // went deeper. a single gate at the end would blame --glob, which is why
    // each root is gated when it becomes the root
    when(
      '[t3] --path crosses the boundary while --glob names a subpath',
      () => {
        then('the refusal names --path, the flag that actually crossed', () => {
          const result = runInTempGitRepo({
            files: { 'a.txt': 'content\n' },
            grepsafeArgs: [
              '--pattern',
              'content',
              '--path',
              '/tmp',
              '--glob',
              'sub/*.ts',
            ],
          });

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            'search path must be within the git repository',
          );
          // the attribution is the point, not the refusal
          expect(result.stdout).toContain('named by:    --path');
          expect(result.stdout).not.toContain('named by:    --glob');
        });
      },
    );
  });

  given('[case12] not in git repo', () => {
    when('[t0] run outside any git repo', () => {
      then('exits with constraint error', () => {
        const tempDir = genTempDirTracked({ slug: 'grepsafe-no-git' });
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

  // every step pairs its snapshot with explicit claims (rule.forbid.failhide)
  given('[case13] output format snapshots', () => {
    when('[t0] match found', () => {
      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          files: { 'src/example.ts': 'const hello = "world";\n' },
          grepsafeArgs: ['--pattern', 'hello'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('example.ts:1:const hello');
        expect(result.stdout).toContain('lines: 1');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] no match found', () => {
      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          files: { 'src/example.ts': 'const x = 1;\n' },
          grepsafeArgs: ['--pattern', 'nonexistent'],
        });

        // a true zero: exit 0, and the kind names the pattern
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          'matches: 0 — no line matched the pattern',
        );
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] regex with pipe alternation', () => {
      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          files: {
            'src/a.ts': 'const paddleOut = 1;\n',
            'src/b.ts': 'const wipeout = 2;\n',
          },
          grepsafeArgs: ['--pattern', 'paddleOut|wipeout', '--glob', '*.ts'],
        });

        expect(result.exitCode).toBe(0);
        // both alternates hit
        expect(result.stdout).toContain('a.ts:1:const paddleOut');
        expect(result.stdout).toContain('b.ts:1:const wipeout');
        expect(result.stdout).toContain('lines: 2');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case14] --output pipeable mode', () => {
    when('[t0] match found with pipeable output', () => {
      then('output is plain results without vibes', () => {
        const result = runInTempGitRepo({
          files: { 'src/example.ts': 'const hello = "world";\n' },
          grepsafeArgs: ['--pattern', 'hello', '--output', 'pipeable'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).not.toContain('🐢');
        expect(result.stdout).not.toContain('🐚');
        expect(result.stdout).toContain('hello');
      });
    });

    when('[t1] no match found with pipeable output', () => {
      then('output is empty', () => {
        const result = runInTempGitRepo({
          files: { 'src/example.ts': 'const x = 1;\n' },
          grepsafeArgs: ['--pattern', 'nonexistent', '--output', 'pipeable'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });

    when('[t2] pipeable output snapshot', () => {
      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          files: {
            'src/a.ts': 'const paddleOut = 1;\n',
            'src/b.ts': 'const wipeout = 2;\n',
          },
          grepsafeArgs: [
            '--pattern',
            'paddleOut|wipeout',
            '--glob',
            '*.ts',
            '--output',
            'pipeable',
          ],
        });

        // pipeable's contract is a clean stdout, so assert it outright
        expect(result.exitCode).toBe(0);
        expect(result.stdout).not.toContain('🐢');
        expect(result.stdout).toContain('a.ts:1:const paddleOut');
        expect(result.stdout).toContain('b.ts:1:const wipeout');
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

    when('[t4] the pipeable x zero-kind cell, walked', () => {
      // under pipeable, two clean zero-kinds render alike (empty, exit 0), by
      // decision: vibes renders a claim (`matches: 0`) and owes its kind;
      // pipeable renders an absence, which asserts naught, as grep does. a
      // kind on stderr would print a line for every benign empty search
      const PIPEABLE_ZERO = { 'src/a.ts': 'const x = 1;\n' };

      then(
        'the two clean zero-kinds are indistinguishable, by decision',
        () => {
          // kind 1 — the glob selected no file
          const globEmpty = runInTempGitRepo({
            files: PIPEABLE_ZERO,
            grepsafeArgs: [
              '--pattern',
              'x',
              '--glob',
              'nosuchdir/**/*.ts',
              '--output',
              'pipeable',
            ],
          });
          // kind 2 — files were searched, no line matched
          const patternMiss = runInTempGitRepo({
            files: PIPEABLE_ZERO,
            grepsafeArgs: ['--pattern', 'paddleOut', '--output', 'pipeable'],
          });

          for (const zero of [globEmpty, patternMiss]) {
            expect(zero.exitCode).toBe(0);
            expect(zero.stdout).toBe('');
            expect(zero.stderr.trim()).toBe('');
          }
          // the decision, stated as an equality rather than left implied
          expect(globEmpty.stdout).toBe(patternMiss.stdout);
          expect(globEmpty.stderr).toBe(patternMiss.stderr);
        },
      );

      then('the THIRD kind does read apart, even here (the control)', () => {
        // pipeable is not silent about every zero: an unread path still
        // reaches stderr
        const repoDir = genTempDirTracked({
          slug: 'grepsafe-pipeable-zero-control',
          git: true,
        });
        const deniedDir = path.join(repoDir, 'reachable', 'denied');
        fs.mkdirSync(deniedDir, { recursive: true });
        fs.writeFileSync(path.join(deniedDir, 'hit.txt'), `${KNOWN}\n`);
        fs.chmodSync(deniedDir, 0o000);

        try {
          const result = spawnSync(
            'bash',
            [
              scriptPath,
              '--pattern',
              KNOWN,
              '--glob',
              'reachable/**/*.txt',
              '--output',
              'pipeable',
            ],
            {
              cwd: repoDir,
              encoding: 'utf-8', // node api param name
              stdio: ['pipe', 'pipe', 'pipe'],
            },
          );

          // stdout stays DATA — the mode's contract holds
          expect(result.stdout.trim()).toBe('');
          // and the gap reaches the caller anyway
          expect(result.stderr).toContain('could not be searched');
          expect(result.stderr).toContain('Permission denied');
        } finally {
          fs.chmodSync(deniedDir, 0o755);
        }
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

  // the string every skip-lift fixture shares, so a zero is never a fixture typo
  const KNOWN = 'paddleOut on the reef break';

  given('[case16] a slashed glob finds a HIDDEN path (D5, case=8)', () => {
    // the named prefix becomes the explicit root, with --hidden
    when('[t0] the dot-directory is named by the glob', () => {
      const result = useThen('grepsafe runs', () =>
        runInTempGitRepo({
          files: {
            '.hidden/deep/nested/brief.md': `# brief\n${KNOWN}\n`,
            'visible/deep/nested/brief.md': `# brief\n${KNOWN}\n`,
          },
          grepsafeArgs: [
            '--pattern',
            KNOWN,
            '--glob',
            '.hidden/**/*.md',
            '--files-only',
          ],
        }),
      );

      then('the hidden file is returned', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('brief.md');
        expect(result.stdout).not.toContain('crickets');
      });

      then('the output names the engine that answered', () => {
        expect(result.stdout).toContain('engine: rg');
      });
    });
  });

  given(
    '[case17] a slashed glob finds a GITIGNORED named path (D7, case=9 [t1])',
    () => {
      // to name a gitignored path opts into a search of it
      const files = {
        '.gitignore': 'ignored/\n',
        'ignored/deep/x.sh': `#!/bin/sh\n${KNOWN}\n`,
        'tracked/deep/x.sh': `#!/bin/sh\n${KNOWN}\n`,
      };

      when('[t0] the tracked twin is named (the control)', () => {
        then('it is found', () => {
          const result = runInTempGitRepo({
            files,
            grepsafeArgs: [
              '--pattern',
              KNOWN,
              '--glob',
              'tracked/**/*.sh',
              '--files-only',
            ],
          });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('x.sh');
        });
      });

      when('[t1] the gitignored path is named', () => {
        then('it is found too', () => {
          const result = runInTempGitRepo({
            files,
            grepsafeArgs: [
              '--pattern',
              KNOWN,
              '--glob',
              'ignored/**/*.sh',
              '--files-only',
            ],
          });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('x.sh');
          expect(result.stdout).not.toContain('crickets');
        });
      });
    },
  );

  given(
    '[case18] a MET (unnamed) ignored tree keeps its skip (case=9 [t3])',
    () => {
      // an unslashed glob names no path, so an ignored tree met on the walk
      // stays skipped — else every search crawls node_modules
      when('[t0] an unslashed glob names no path', () => {
        then('the ignored tree is absent from results', () => {
          const result = runInTempGitRepo({
            files: {
              '.gitignore': 'ignored/\n',
              'ignored/x.sh': `#!/bin/sh\n${KNOWN}\n`,
              'tracked/x.sh': `#!/bin/sh\n${KNOWN}\n`,
            },
            grepsafeArgs: [
              '--pattern',
              KNOWN,
              '--glob',
              '*.sh',
              '--files-only',
            ],
          });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('tracked/x.sh');
          expect(result.stdout).not.toContain('ignored/x.sh');
        });
      });
    },
  );

  given(
    '[case19] a slashed glob finds a LINKED named dir (D6, case=8 [t5])',
    () => {
      // a named symlink is followed via realpath (not -L)
      when('[t0] the glob names a visible symlinked directory', () => {
        const result = useThen('grepsafe runs', () =>
          runInTempGitRepo({
            files: { 'real/deep/brief.md': `# brief\n${KNOWN}\n` },
            symlinks: { link: 'real' },
            grepsafeArgs: [
              '--pattern',
              KNOWN,
              '--glob',
              'link/**/*.md',
              '--files-only',
            ],
          }),
        );

        then('the file behind the link is returned', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('brief.md');
          expect(result.stdout).not.toContain('crickets');
        });

        then('the control on the real twin agrees', () => {
          const control = runInTempGitRepo({
            files: { 'real/deep/brief.md': `# brief\n${KNOWN}\n` },
            symlinks: { link: 'real' },
            grepsafeArgs: [
              '--pattern',
              KNOWN,
              '--glob',
              'real/**/*.md',
              '--files-only',
            ],
          });
          expect(control.stdout).toContain('brief.md');
        });
      });
    },
  );

  given(
    '[case20] --path names a NESTED-ignored tree, contents searched (case=9 [t6])',
    () => {
      // rg's explicit-root override covers the root, never a rule NESTED
      // beneath it. --path must reach the CONTENTS of the named path.
      when(
        '[t0] --path names a dir whose contents a nested .gitignore hides',
        () => {
          then('the files under it are found', () => {
            const result = runInTempGitRepo({
              files: {
                'nested/.gitignore': '*\n',
                'nested/x.sh': `#!/bin/sh\n${KNOWN}\n`,
              },
              grepsafeArgs: [
                '--pattern',
                KNOWN,
                '--path',
                'nested',
                '--files-only',
              ],
            });
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('x.sh');
            expect(result.stdout).not.toContain('crickets');
          });
        },
      );
    },
  );

  given(
    '[case21] the TRIPLE stack — hidden + linked + ignored (case=9 [t4])',
    () => {
      // all three barriers on one glob; a repair that clears two still returns 0
      const files = {
        '.gitignore': 'realtarget/\n',
        'realtarget/deep/brief.md': `# brief\n${KNOWN}\n`,
      };
      // '.hidden' is a dot dir; its 'briefs' entry links out to the
      // gitignored realtarget — hidden AND linked AND ignored at once
      const symlinks = { '.hidden/briefs': '../realtarget' };

      when('[t0] the glob names a hidden, linked, gitignored path', () => {
        const result = useThen('grepsafe runs', () =>
          runInTempGitRepo({
            files,
            symlinks,
            grepsafeArgs: [
              '--pattern',
              KNOWN,
              '--glob',
              '.hidden/briefs/**/*.md',
              '--files-only',
            ],
          }),
        );

        then('the file behind all three barriers is returned', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('brief.md');
          expect(result.stdout).not.toContain('crickets');
        });

        then('the --path control on the same directory agrees', () => {
          const control = runInTempGitRepo({
            files,
            symlinks,
            grepsafeArgs: [
              '--pattern',
              KNOWN,
              '--path',
              '.hidden/briefs',
              '--files-only',
            ],
          });
          expect(control.stdout).toContain('brief.md');
        });
      });
    },
  );

  given(
    '[case22] an empty glob returns 0 at once, never a hang (case=2, acceptance 3)',
    () => {
      // an empty operand list must never reach a stdin read (a hang)
      when('[t0] the glob selects no file', () => {
        then('it returns 0 under a kill-timeout, never a stdin read', () => {
          // spawnSync kills a hang, so the verdict holds on any box. a clean
          // run is sub-second, so 120s leaves a 100x margin.
          // .note = on a SIGTERM red: empty stdout is the hang defect; a
          //         rendered tree means the host stalled, not the skill
          const result = runInTempGitRepo({
            files: { 'a.txt': `${KNOWN}\n` },
            timeoutMs: 120_000,
            grepsafeArgs: [
              '--pattern',
              KNOWN,
              '--glob',
              'nosuchdir/**/*.md',
              '--files-only',
            ],
          });

          // the hang first: an exit-code assertion alone could misread a kill
          expect(result.signal).toBe(null);
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('matches: 0');
        });
      });
    },
  );

  given('[case23] the three honest zeros read apart (acceptance 7)', () => {
    // a caller can tell WHICH kind of zero they got, from the answer alone.
    when('[t0] a glob selects no file', () => {
      then('the zero says the glob came back empty', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': `${KNOWN}\n` },
          grepsafeArgs: ['--pattern', KNOWN, '--glob', 'nosuchdir/**/*.md'],
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('no file matched the glob');
      });
    });

    when('[t1] files are searched but no line matches', () => {
      then('the zero says the pattern matched no line', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': `${KNOWN}\n` },
          grepsafeArgs: [
            '--pattern',
            'zzz_absent_string_xyz',
            '--glob',
            '*.txt',
          ],
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('no line matched the pattern');
      });
    });
  });

  given('[case24] failfast when rg is absent (acceptance 5)', () => {
    // a stub rg that fails --version reads as absent; grepsafe must failfast
    // with a fix, never report 0
    when('[t0] rg is shadowed to look absent', () => {
      const setupShadow = (): NodeJS.ProcessEnv => {
        // a scratch bin, prepended to PATH, whose 'rg' always exits 1
        const shadowDir = genTempDirTracked({ slug: 'grepsafe-rg-shadow' });
        const stub = path.join(shadowDir, 'rg');
        fs.writeFileSync(stub, '#!/usr/bin/env bash\nexit 1\n');
        fs.chmodSync(stub, 0o755);
        return {
          ...process.env,
          PATH: `${shadowDir}:${process.env.PATH ?? ''}`,
        };
      };

      const result = useThen('grepsafe runs with rg shadowed', () =>
        runInTempGitRepo({
          files: { 'a.txt': `${KNOWN}\n` },
          env: setupShadow(),
          grepsafeArgs: ['--pattern', KNOWN, '--glob', '*.txt'],
        }),
      );

      // `.toBe(2)`, never `.not.toBe(0)`: pin the exact contract
      then('it failfasts at exit 2 — a constraint the caller can fix', () => {
        expect(result.exitCode).toBe(2);
      });

      then('the error names the fix, not a false zero', () => {
        const out = result.stdout + result.stderr;
        expect(out).toContain('ripgrep');
        expect(out).toContain('install');
        expect(out).not.toContain('matches: 0');
      });
    });

    // a broken rg on PATH must not read as "not found": its fix differs
    // (repair, not install). this stub speaks, unlike [t0]'s
    when('[t0.5] rg is on PATH but broken, and says why', () => {
      const setupBroken = (): NodeJS.ProcessEnv => {
        const shadowDir = genTempDirTracked({ slug: 'grepsafe-rg-broken' });
        const stub = path.join(shadowDir, 'rg');
        fs.writeFileSync(
          stub,
          '#!/usr/bin/env bash\necho "rg: symbol lookup error: undefined symbol pcre2_compile_8" >&2\nexit 127\n',
        );
        fs.chmodSync(stub, 0o755);
        return {
          ...process.env,
          PATH: `${shadowDir}:${process.env.PATH ?? ''}`,
        };
      };

      const result = useThen('grepsafe runs with rg broken', () =>
        runInTempGitRepo({
          files: { 'a.txt': `${KNOWN}\n` },
          env: setupBroken(),
          grepsafeArgs: ['--pattern', KNOWN, '--glob', '*.txt'],
        }),
      );

      then('it still failfasts, never a false zero', () => {
        expect({
          exitCode: result.exitCode,
          falseZero: (result.stdout + result.stderr).includes('matches: 0'),
        }).toEqual({ exitCode: 2, falseZero: false });
      });

      then("it relays rg's own reason, and says it is ON PATH", () => {
        const out = result.stdout + result.stderr;

        expect({
          // the reason rg gave
          relaysTheReason: out.includes('pcre2_compile_8'),
          // and the two cases read apart: this one is NOT "not found"
          namesTheRealState: out.includes('on PATH but could not run'),
          claimsNotFound: out.includes('was not found'),
          // the remedy differs too — repair, never install
          namesTheRightFix: out.includes('repair or reinstall'),
          // the keys above read both streams joined; this one checks each
          onBothStreams:
            result.stdout.includes('on PATH but could not run') &&
            result.stderr.includes('on PATH but could not run'),
        }).toEqual({
          relaysTheReason: true,
          namesTheRealState: true,
          claimsNotFound: false,
          namesTheRightFix: true,
          onBothStreams: true,
        });
      });

      // pins the vibes broken-rg frame; its peers are [t2] and [case29][t1]
      then('the broken-rg vibes frame reads as a caller reads it', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    // rg absent × --output pipeable
    when('[t1] --output pipeable meets the same absent rg', () => {
      then('stdout stays pipe-clean; the failfast goes to stderr', () => {
        const shadowDir = genTempDirTracked({
          slug: 'grepsafe-rg-shadow-pipeable',
        });
        const stub = path.join(shadowDir, 'rg');
        fs.writeFileSync(stub, '#!/usr/bin/env bash\nexit 1\n');
        fs.chmodSync(stub, 0o755);

        const result = runInTempGitRepo({
          files: { 'a.txt': `${KNOWN}\n` },
          env: {
            ...process.env,
            PATH: `${shadowDir}:${process.env.PATH ?? ''}`,
          },
          grepsafeArgs: [
            '--pattern',
            KNOWN,
            '--glob',
            '*.txt',
            '--output',
            'pipeable',
          ],
        });

        expect(result.stdout.trim()).toBe('');
        expect(result.stderr).toContain('ripgrep');
        expect(result.exitCode).toBe(2);
        // stderr is the caller's whole view here, so snap it
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    // rg broken × --output pipeable: the corner [t0.5] and [t1] each miss
    when(
      '[t2] --output pipeable meets an rg that is broken, never absent',
      () => {
        then(
          'the plain line names the real state too, never "was not found"',
          () => {
            const shadowDir = genTempDirTracked({
              slug: 'grepsafe-rg-broken-pipeable',
            });
            const stub = path.join(shadowDir, 'rg');
            fs.writeFileSync(
              stub,
              '#!/usr/bin/env bash\necho "rg: symbol lookup error: undefined symbol pcre2_compile_8" >&2\nexit 127\n',
            );
            fs.chmodSync(stub, 0o755);

            const result = runInTempGitRepo({
              files: { 'a.txt': `${KNOWN}\n` },
              env: {
                ...process.env,
                PATH: `${shadowDir}:${process.env.PATH ?? ''}`,
              },
              grepsafeArgs: [
                '--pattern',
                KNOWN,
                '--glob',
                '*.txt',
                '--output',
                'pipeable',
              ],
            });

            expect({
              exitCode: result.exitCode,
              pipeCleanStdout: result.stdout.trim() === '',
              claimsNotFound: result.stderr.includes('was not found'),
              namesTheRealState: result.stderr.includes(
                'on PATH but could not run',
              ),
              relaysTheReason: result.stderr.includes('pcre2_compile_8'),
            }).toEqual({
              exitCode: 2,
              pipeCleanStdout: true,
              claimsNotFound: false,
              namesTheRealState: true,
              relaysTheReason: true,
            });

            expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
          },
        );
      },
    );
  });

  given(
    '[case25] .git internals never appear in results (forbidden invariant)',
    () => {
      // --hidden --no-ignore must not un-exclude .git. a hidden path search
      // must not leak repo internals.
      when('[t0] a hidden glob is named while a .git tree exists', () => {
        then('no .git path is returned', () => {
          const result = runInTempGitRepo({
            files: { '.hidden/brief.md': `# brief\nHEADpointer ref\n` },
            grepsafeArgs: [
              '--pattern',
              'ref',
              '--glob',
              '.hidden/**/*.md',
              '--files-only',
            ],
          });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).not.toContain('.git/');
        });
      });
    },
  );

  given(
    '[case26] the breadth guard — a MET symlink is not descended (case=8 [t4])',
    () => {
      // a named dir lifts its skips, but a symlink met deeper on the walk is
      // not followed — else a search crawls node_modules
      const files = {
        '.gitignore': 'offlimits/\n',
        '.hidden/direct.md': `# direct\n${KNOWN}\n`,
        'offlimits/secret.md': `# secret\ndo not crawl me\n`,
      };
      // the link sits DEEPER than the named prefix ('.hidden'); it is met on
      // the walk, never named, so it must not be followed
      const symlinks = { '.hidden/portal': '../offlimits' };

      when(
        '[t0] a named hidden dir holds a link into a gitignored tree',
        () => {
          const result = useThen('grepsafe runs', () =>
            runInTempGitRepo({
              files,
              symlinks,
              grepsafeArgs: [
                '--pattern',
                'do not crawl me',
                '--glob',
                '.hidden/**/*.md',
                '--files-only',
              ],
            }),
          );

          then('the file behind the MET link is not found', () => {
            expect(result.exitCode).toBe(0);
            expect(result.stdout).not.toContain('secret.md');
          });

          then(
            'a direct file under the named dir IS found (the walk still runs)',
            () => {
              const direct = runInTempGitRepo({
                files,
                symlinks,
                grepsafeArgs: [
                  '--pattern',
                  KNOWN,
                  '--glob',
                  '.hidden/**/*.md',
                  '--files-only',
                ],
              });
              expect(direct.stdout).toContain('direct.md');
            },
          );
        },
      );
    },
  );

  given(
    '[case27] the PAIRWISE 2-of-3 compositions are searched (case=9 [t5])',
    () => {
      // other cases prove one lift and three; each 2-of-3 pair is clamped too
      when('[t0] hidden AND ignored, no link', () => {
        then('the doubly-barred path is found', () => {
          const result = runInTempGitRepo({
            files: {
              '.gitignore': '.buried/\n',
              '.buried/deep/x.sh': `#!/bin/sh\n${KNOWN}\n`,
            },
            grepsafeArgs: [
              '--pattern',
              KNOWN,
              '--glob',
              '.buried/**/*.sh',
              '--files-only',
            ],
          });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('x.sh');
          expect(result.stdout).not.toContain('crickets');
        });
      });

      when('[t1] linked AND ignored, no dot', () => {
        then('the doubly-barred path is found', () => {
          const result = runInTempGitRepo({
            files: {
              '.gitignore': 'realtarget/\n',
              'realtarget/deep/x.sh': `#!/bin/sh\n${KNOWN}\n`,
            },
            // 'portal' is a visible (non-dot) link into the gitignored tree
            symlinks: { portal: 'realtarget' },
            grepsafeArgs: [
              '--pattern',
              KNOWN,
              '--glob',
              'portal/**/*.sh',
              '--files-only',
            ],
          });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('x.sh');
          expect(result.stdout).not.toContain('crickets');
        });
      });
    },
  );

  given(
    '[case28] a `..` glob prefix cannot escape the repo (forbidden invariant)',
    () => {
      // a glob's literal prefix becomes a search root, and '..' holds no
      // metacharacter, so that root needs its own repo-boundary gate
      const OUTSIDE_LINE = 'paddleOut at the forbidden reef';

      // .what = scrub repo root and search path to DISTINCT tokens
      // .why  = sanitizeOutput maps both to one token, so the snap would
      //         hide the difference that is the refusal's reason. read the
      //         values from the frame: grepsafe prints a realpath, which
      //         need not equal the temp dir path
      // .note = scrub repo root first; the search path is its prefix
      const scrubRoots = (text: string): string => {
        const repoRoot = /repo root:\s+(\S+)/.exec(text)?.[1] ?? '';
        const searchPath = /search path:\s+(\S+)/.exec(text)?.[1] ?? '';
        // an empty token would scrub naught, so assert both are found
        expect(repoRoot).not.toBe('');
        expect(searchPath).not.toBe('');
        return sanitizeOutput(
          text
            .split(repoRoot)
            .join('<repo>')
            .split(searchPath)
            .join('<repo-parent>'),
        );
      };

      when('[t0] a glob names a path above the repo root', () => {
        then('it refuses with a constraint error, and names --glob', () => {
          const result = runInTempGitRepo({
            files: { 'inside.conf': 'ordinary\n' },
            grepsafeArgs: ['--pattern', 'paddleOut', '--glob', '../*/*.conf'],
          });
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            'search path must be within the git repository',
          );
          expect(result.stdout).toContain('--glob');
          // snap the security refusal so a reviewer sees what the caller reads
          const frame = scrubRoots(result.stdout);
          // the two roots must read apart in the snap
          expect(frame).toContain('repo root:   <repo>');
          expect(frame).toContain('search path: <repo-parent>');
          expect(frame).toMatchSnapshot();
        });
      });

      when('[t1] a real file outside the repo would match', () => {
        then('its content never reaches the caller', () => {
          // a peer dir beside the repo, so `../<peer>` reaches it
          const repoDir = genTempDirTracked({
            slug: 'grepsafe-escape',
            git: true,
          });
          const peerName = `outside-${path.basename(repoDir)}`;
          const outsideDir = path.join(path.dirname(repoDir), peerName);
          fs.mkdirSync(outsideDir, { recursive: true });
          // a peer dir, not a child, so register it for teardown by hand
          tempDirsMade.push(outsideDir);
          fs.writeFileSync(
            path.join(outsideDir, 'secret.conf'),
            `${OUTSIDE_LINE}\n`,
          );
          fs.writeFileSync(path.join(repoDir, 'inside.conf'), 'ordinary\n');

          const result = spawnSync(
            'bash',
            [
              scriptPath,
              '--pattern',
              'paddleOut',
              '--glob',
              `../${peerName}/*.conf`,
            ],
            {
              cwd: repoDir,
              encoding: 'utf-8', // node api param name
              stdio: ['pipe', 'pipe', 'pipe'],
            },
          );
          const out = (result.stdout ?? '') + (result.stderr ?? '');

          // the harm first: only the gate keeps the real bait out
          expect(out).not.toContain('forbidden reef');
          expect(out).not.toContain('secret.conf');
          expect(result.status).toBe(2);
          expect(out).toContain(
            'search path must be within the git repository',
          );
        });
      });

      when('[t2] the refusal is loud on BOTH streams', () => {
        then('stdout and stderr each carry it', () => {
          const result = runInTempGitRepo({
            files: { 'inside.conf': 'ordinary\n' },
            grepsafeArgs: ['--pattern', 'paddleOut', '--glob', '../*/*.conf'],
          });
          expect(result.stdout).toContain('must be within');
          expect(result.stderr).toContain('must be within');
        });
      });

      when('[t3] an ABSOLUTE glob names a path outside the repo', () => {
        then('it is refused, never re-anchored to a peer inside', () => {
          // re-anchored, '/etc/*.conf' becomes './etc' inside the repo; the
          // decoy is what that wrong answer would hold
          const result = runInTempGitRepo({
            files: { 'etc/decoy.conf': 'paddleOut on the decoy reef\n' },
            grepsafeArgs: ['--pattern', 'paddleOut', '--glob', '/etc/*.conf'],
          });
          // the wrong answer first
          expect(result.stdout).not.toContain('decoy reef');
          expect(result.stdout).not.toContain('decoy.conf');
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            'search path must be within the git repository',
          );
        });
      });

      // under --output pipeable, stdout is data: the refusal goes to stderr only
      when('[t4] the boundary refusal runs under --output pipeable', () => {
        then('stdout is pipe-clean, and stderr carries the refusal', () => {
          const result = runInTempGitRepo({
            files: { 'inside.conf': 'ordinary\n' },
            grepsafeArgs: [
              '--pattern',
              'paddleOut',
              '--glob',
              '../*/*.conf',
              '--output',
              'pipeable',
            ],
          });
          expect(result.exitCode).toBe(2);
          // the harm first: a glyph on the data stream is the defect
          expect(result.stdout.trim()).toBe('');
          expect(result.stderr).toContain('must be within');
          // stderr is the caller's whole view here, so snap it
          const frame = scrubRoots(result.stderr);
          expect(frame).toContain('repo root:   <repo>');
          expect(frame).toContain('search path: <repo-parent>');
          expect(frame).toMatchSnapshot();
        });
      });

      when('[t5] a nonexistent --path runs under --output pipeable', () => {
        then('stdout is pipe-clean, and stderr names the fix', () => {
          const result = runInTempGitRepo({
            files: { 'inside.conf': 'ordinary\n' },
            grepsafeArgs: [
              '--pattern',
              'paddleOut',
              '--path',
              'no/such/dir',
              '--output',
              'pipeable',
            ],
          });
          expect(result.exitCode).toBe(2);
          expect(result.stdout.trim()).toBe('');
          expect(result.stderr).toContain('search path does not exist');
          // rule.require.errors-name-the-fix
          expect(result.stderr).toContain('fix:');
          // .note = sanitizeOutput, not scrubRoots: no root pair prints here
          expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
        });
      });

      when('[t6] a nonexistent --path under vibes mode', () => {
        then('both streams carry it, as every vibes refusal does', () => {
          const result = runInTempGitRepo({
            files: { 'inside.conf': 'ordinary\n' },
            grepsafeArgs: ['--pattern', 'paddleOut', '--path', 'no/such/dir'],
          });
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('search path does not exist');
          expect(result.stderr).toContain('search path does not exist');
          expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        });
      });
    },
  );

  given('[case29] the new output shapes are snapped, not only asserted', () => {
    // snap the engine line, zero-kind strings, and failfast refusal whole
    when('[t0] a glob selects no file', () => {
      then('the glob-empty zero matches snapshot', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': `${KNOWN}\n` },
          grepsafeArgs: ['--pattern', KNOWN, '--glob', '*.nomatch'],
        });
        expect(result.exitCode).toBe(0);
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] rg is shadowed to look absent', () => {
      then('the failfast refusal matches snapshot', () => {
        const shadowDir = genTempDirTracked({
          slug: 'grepsafe-rg-shadow-snap',
        });
        const stub = path.join(shadowDir, 'rg');
        fs.writeFileSync(stub, '#!/usr/bin/env bash\nexit 1\n');
        fs.chmodSync(stub, 0o755);

        const result = runInTempGitRepo({
          files: { 'a.txt': `${KNOWN}\n` },
          env: {
            ...process.env,
            PATH: `${shadowDir}:${process.env.PATH ?? ''}`,
          },
          grepsafeArgs: ['--pattern', KNOWN, '--glob', '*.txt'],
        });
        // same contract as [case24][t0]
        expect(result.exitCode).toBe(2);
        // an explicit claim beside the snap (rule.forbid.failhide)
        expect(result.stdout).toContain('ripgrep');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] a named slashed glob finds its matches', () => {
      then('the engine-named match frame matches snapshot', () => {
        const result = runInTempGitRepo({
          files: { '.buried/deep/x.sh': `#!/bin/sh\n${KNOWN}\n` },
          grepsafeArgs: [
            '--pattern',
            KNOWN,
            '--glob',
            '.buried/**/*.sh',
            '--files-only',
          ],
        });
        expect(result.exitCode).toBe(0);
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      // the header fields that say what the search did; asserted so a
      // resnap cannot drop them
      then('the header names the DERIVED root, not the raw --path', () => {
        const result = runInTempGitRepo({
          files: { '.buried/deep/x.sh': `#!/bin/sh\n${KNOWN}\n` },
          grepsafeArgs: [
            '--pattern',
            KNOWN,
            '--glob',
            '.buried/**/*.sh',
            '--files-only',
          ],
        });
        // the glob prefix moved the root to `.buried`; `path:` said `.`
        expect(result.stdout).toContain('├─ path: .buried');
        expect(result.stdout).not.toContain('├─ path: .\n');
      });

      // a lift of .gitignore must be visible, else a caller may paste
      // ignored content somewhere shared
      then('the header says the hidden + ignore lifts fired', () => {
        const result = runInTempGitRepo({
          files: { '.buried/deep/x.sh': `#!/bin/sh\n${KNOWN}\n` },
          grepsafeArgs: [
            '--pattern',
            KNOWN,
            '--glob',
            '.buried/**/*.sh',
            '--files-only',
          ],
        });
        expect(result.stdout).toContain(
          '├─ scope: hidden + ignored included (a named path)',
        );
      });

      // the control: no literal prefix, no lift, no scope line
      then('a prefix-less glob renders no scope line at all', () => {
        const result = runInTempGitRepo({
          files: { 'deep/x.sh': `#!/bin/sh\n${KNOWN}\n` },
          grepsafeArgs: [
            '--pattern',
            KNOWN,
            '--glob',
            '**/*.sh',
            '--files-only',
          ],
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('├─ path: .');
        expect(result.stdout).not.toContain('scope:');
      });
    });
  });

  given(
    '[case30] a SLASH is not a named path — only a resolved prefix is',
    () => {
      // '**/*.md' holds a slash but no literal prefix, so it names no path.
      // a lift latched on the slash would widen the skips repo-wide
      when('[t0] a prefix-less slashed glob meets an ignored tree', () => {
        then('the ignored tree keeps its skip', () => {
          const result = runInTempGitRepo({
            files: {
              '.gitignore': 'ignored/\n',
              'ignored/deep/x.sh': `#!/bin/sh\n${KNOWN}\n`,
              'tracked/deep/x.sh': `#!/bin/sh\n${KNOWN}\n`,
            },
            grepsafeArgs: [
              '--pattern',
              KNOWN,
              '--glob',
              '**/*.sh',
              '--files-only',
            ],
          });
          expect(result.exitCode).toBe(0);
          // the harm first: a widened lift returns the ignored file
          expect(result.stdout).not.toContain('ignored/deep/x.sh');
          expect(result.stdout).toContain('tracked/deep/x.sh');
        });
      });

      when('[t1] a prefix-less slashed glob meets a hidden tree', () => {
        then('the hidden tree keeps its skip', () => {
          const result = runInTempGitRepo({
            files: {
              '.buried/deep/x.sh': `#!/bin/sh\n${KNOWN}\n`,
              'shown/deep/x.sh': `#!/bin/sh\n${KNOWN}\n`,
            },
            grepsafeArgs: [
              '--pattern',
              KNOWN,
              '--glob',
              '**/*.sh',
              '--files-only',
            ],
          });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).not.toContain('.buried/deep/x.sh');
          expect(result.stdout).toContain('shown/deep/x.sh');
        });
      });

      when('[t2] the named prefix does not exist on disk', () => {
        then('no lift is granted, and the zero is honest', () => {
          // 'absent/' cannot be a root, so no lift fires
          const result = runInTempGitRepo({
            files: {
              '.gitignore': 'ignored/\n',
              'ignored/x.sh': `#!/bin/sh\n${KNOWN}\n`,
            },
            grepsafeArgs: [
              '--pattern',
              KNOWN,
              '--glob',
              'absent/**/*.sh',
              '--files-only',
            ],
          });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).not.toContain('ignored/x.sh');
          expect(result.stdout).toContain('matches: 0');
        });
      });

      when('[t3] a resolved prefix DOES name a path (the control)', () => {
        then('the same ignored tree is searched when named', () => {
          // the control for [t0]: a named tree does lift
          const result = runInTempGitRepo({
            files: {
              '.gitignore': 'ignored/\n',
              'ignored/deep/x.sh': `#!/bin/sh\n${KNOWN}\n`,
            },
            grepsafeArgs: [
              '--pattern',
              KNOWN,
              '--glob',
              'ignored/**/*.sh',
              '--files-only',
            ],
          });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('deep/x.sh');
        });
      });
    },
  );

  given('[case32] --type carries its own zero-kind (acceptance 7)', () => {
    // a --type that selects no file says so, never "no line matched the pattern"
    when('[t0] a --type selects no file', () => {
      then('the zero names the type, not the pattern', () => {
        const result = runInTempGitRepo({
          files: { 'a.sh': `#!/bin/sh\n${KNOWN}\n` },
          grepsafeArgs: ['--pattern', KNOWN, '--type', 'py'],
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('no file matched the type');
        expect(result.stdout).not.toContain('no line matched the pattern');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] a --type and a --glob both select no file', () => {
      then('the zero names both filters', () => {
        const result = runInTempGitRepo({
          files: { 'a.sh': `#!/bin/sh\n${KNOWN}\n` },
          grepsafeArgs: [
            '--pattern',
            KNOWN,
            '--glob',
            '*.nomatch',
            '--type',
            'py',
          ],
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('no file matched the glob and type');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] a --type selects a file that holds the pattern', () => {
      then('the filter works at all (the control)', () => {
        // without this, a green [t0] could mean --type rejects everything
        const result = runInTempGitRepo({
          files: { 'a.sh': `#!/bin/sh\n${KNOWN}\n` },
          grepsafeArgs: ['--pattern', KNOWN, '--type', 'sh', '--files-only'],
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('a.sh');
      });
    });

    when('[t3] a --type selects files, but no line matches', () => {
      then('the zero names the PATTERN, not the type', () => {
        const result = runInTempGitRepo({
          files: { 'a.sh': '#!/bin/sh\necho hi\n' },
          grepsafeArgs: ['--pattern', KNOWN, '--type', 'sh'],
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('no line matched the pattern');
      });
    });

    // the success header names each narrow applied, as the zero path does
    when('[t4] a --type selects a file AND a line matches', () => {
      then('the header echoes the type, beside the glob', () => {
        const result = runInTempGitRepo({
          files: {
            'a.sh': `#!/bin/sh\n${KNOWN}\n`,
            'b.py': `# ${KNOWN}\n`,
          },
          grepsafeArgs: ['--pattern', KNOWN, '--type', 'sh'],
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('a.sh');
        // the control: the type did narrow
        expect(result.stdout).not.toContain('b.py');
        expect(result.stdout).toContain('type: sh');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t5] no --type is given', () => {
      then('no type field is emitted', () => {
        // the other half of [t4]: the field prints only when it applies
        const result = runInTempGitRepo({
          files: { 'a.sh': `#!/bin/sh\n${KNOWN}\n` },
          grepsafeArgs: ['--pattern', KNOWN],
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('a.sh');
        expect(result.stdout).not.toContain('type:');
      });
    });
  });

  given('[case33] --path and --glob compose (the anchor)', () => {
    // a relative glob prefix anchors onto $SEARCH_PATH, not the default '.'
    when('[t0] a --path is given AND the glob carries a prefix', () => {
      then('the prefix anchors under the named path', () => {
        const result = runInTempGitRepo({
          files: {
            'src/nested/deep/x.sh': `#!/bin/sh\n${KNOWN}\n`,
            'other/nested/deep/x.sh': `#!/bin/sh\n${KNOWN}\n`,
          },
          grepsafeArgs: [
            '--pattern',
            KNOWN,
            '--path',
            'src',
            '--glob',
            'nested/**/*.sh',
            '--files-only',
          ],
        });
        expect(result.exitCode).toBe(0);
        // the peer tree outside --path must NOT be reached
        expect(result.stdout).not.toContain('other/');
        expect(result.stdout).toContain('x.sh');
      });
    });

    when('[t1] the same glob prefix under a DIFFERENT --path', () => {
      // .why = both twins hold the pattern, so a cwd-anchored search cannot
      //        read green by accident
      then('it anchors there instead, never at cwd', () => {
        const result = runInTempGitRepo({
          files: {
            'src/nested/deep/x.sh': `#!/bin/sh\n${KNOWN}\n`,
            'other/nested/deep/x.sh': `#!/bin/sh\n${KNOWN}\n`,
          },
          grepsafeArgs: [
            '--pattern',
            KNOWN,
            '--path',
            'other',
            '--glob',
            'nested/**/*.sh',
            '--files-only',
          ],
        });
        expect(result.exitCode).toBe(0);
        // the twin outside --path must NOT be reached — the mirror of [t0]
        expect(result.stdout).not.toContain('src/');
        expect(result.stdout).toContain('other/');
      });
    });

    // a derived join (--path + glob prefix) that misses is silent, never an
    // unread block about a path the caller never typed — a false alarm
    // beside a correct answer. a TYPED prefix still reports (case38[t0]).
    // the glob reads under --path (case34), so `src/nested/**` names
    // `src/src/nested` — absent, an honest "no file matched"
    when(
      '[t2] a --path is given AND the glob prefix cannot join under it',
      () => {
        then('the zero is honest, and no unread block is invented', () => {
          const result = runInTempGitRepo({
            files: {
              'src/nested/deep/x.sh': `#!/bin/sh\n${KNOWN}\n`,
            },
            grepsafeArgs: [
              '--pattern',
              KNOWN,
              '--path',
              'src',
              // the join `src/src/nested` misses at an intermediate parent
              '--glob',
              'src/nested/**/*.sh',
              '--files-only',
            ],
          });

          expect({
            exitCode: result.exitCode,
            // anchored under --path, never read from cwd (case34)
            findsTheFile: result.stdout.includes('x.sh'),
            namesTheZero: result.stdout.includes(
              'matches: 0 — no file matched the glob',
            ),
            // `realpath` appears nowhere else in the output
            claimsUnread: result.stdout.includes('unread'),
            namesAJoinArtifact: result.stdout.includes('realpath'),
          }).toEqual({
            exitCode: 0,
            findsTheFile: false,
            namesTheZero: true,
            claimsUnread: false,
            namesAJoinArtifact: false,
          });

          expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        });
      },
    );

    // the control: [t2]'s silence must not swallow a TYPED path's reason
    when('[t3] the same broken prefix, TYPED (no --path) — the control', () => {
      then('the reason is reported, exactly as case38[t0] requires', () => {
        const repoDir = genTempDirTracked({
          slug: 'grepsafe-join-typed-control',
          git: true,
        });
        const deniedDir = path.join(repoDir, 'denied');
        fs.mkdirSync(path.join(deniedDir, 'sub'), { recursive: true });
        fs.writeFileSync(path.join(deniedDir, 'sub', 'x.txt'), `${KNOWN}\n`);
        fs.chmodSync(deniedDir, 0o000);

        try {
          const result = spawnSync(
            'bash',
            [scriptPath, '--pattern', KNOWN, '--glob', 'denied/sub/**/*.txt'],
            {
              cwd: repoDir,
              encoding: 'utf-8', // node api param name
              stdio: ['pipe', 'pipe', 'pipe'],
            },
          );
          const out = result.stdout ?? '';

          expect({
            namesTheReason: out.includes('realpath'),
            namesTheCause: out.includes('Permission denied'),
          }).toEqual({
            namesTheReason: true,
            namesTheCause: true,
          });
        } finally {
          fs.chmodSync(deniedDir, 0o755);
        }
      });
    });
  });

  given('[case31] an engine diagnostic is never counted as a match', () => {
    // merged streams would count each rg diagnostic as a match line; a robot
    // caller cannot tell those lines from file content
    when('[t0] an unreadable directory is met on the walk', () => {
      then('the error is not a match, and the gap is surfaced', () => {
        const repoDir = genTempDirTracked({
          slug: 'grepsafe-denied',
          git: true,
        });
        const deniedDir = path.join(repoDir, 'denied');
        fs.mkdirSync(deniedDir, { recursive: true });
        fs.writeFileSync(path.join(deniedDir, 'x.txt'), `${KNOWN}\n`);
        fs.chmodSync(deniedDir, 0o000);

        try {
          const result = spawnSync(
            'bash',
            [scriptPath, '--pattern', KNOWN, '--glob', 'denied/**/*.txt'],
            {
              cwd: repoDir,
              encoding: 'utf-8', // node api param name
              stdio: ['pipe', 'pipe', 'pipe'],
            },
          );
          const out = result.stdout ?? '';

          // the harm first: the denial must not be counted
          expect(out).not.toContain('lines: 1');
          expect(out).not.toContain('results');
          expect(out).toContain('matches: 0');
          // the denial shows under its own label
          expect(out).toContain('could not be searched');
          expect(out).toContain('Permission denied');
          // and it reaches stderr too, never swallowed
          expect(result.stderr ?? '').toContain('could not be searched');
        } finally {
          // restore, so the temp dir stays removable
          fs.chmodSync(deniedDir, 0o755);
        }
      });
    });

    when('[t1] --output pipeable meets the same unreadable path', () => {
      then('stdout stays pipe-clean; the gap goes to stderr', () => {
        const repoDir = genTempDirTracked({
          slug: 'grepsafe-denied-pipeable',
          git: true,
        });
        const deniedDir = path.join(repoDir, 'denied');
        fs.mkdirSync(deniedDir, { recursive: true });
        fs.writeFileSync(path.join(deniedDir, 'x.txt'), `${KNOWN}\n`);
        fs.chmodSync(deniedDir, 0o000);

        try {
          const result = spawnSync(
            'bash',
            [
              scriptPath,
              '--pattern',
              KNOWN,
              '--glob',
              'denied/**/*.txt',
              '--output',
              'pipeable',
            ],
            {
              cwd: repoDir,
              encoding: 'utf-8', // node api param name
              stdio: ['pipe', 'pipe', 'pipe'],
            },
          );
          // a diagnostic on a piped stdout would be read as data
          expect(result.stdout ?? '').not.toContain('Permission denied');
          expect(result.stderr ?? '').toContain('could not be searched');

          // stderr is the caller's whole view here, so snap it
          const err = sortBlockBodyLines(
            (result.stderr ?? '').split(repoDir).join('<repo>'),
          );
          expect(err).toMatchSnapshot();
          // and the fix line must survive the mode switch
          expect(err).toContain('fix: grant read access');
        } finally {
          fs.chmodSync(deniedDir, 0o755);
        }
      });
    });

    when('[t2] the unread frame is rendered', () => {
      // a partial answer beside a caveat: snap the whole frame
      then('the whole frame is snapped, and it names the fix', () => {
        const repoDir = genTempDirTracked({
          slug: 'grepsafe-unread-snap',
          git: true,
        });
        const deniedDir = path.join(repoDir, 'denied');
        fs.mkdirSync(deniedDir, { recursive: true });
        fs.writeFileSync(path.join(deniedDir, 'x.txt'), `${KNOWN}\n`);
        fs.chmodSync(deniedDir, 0o000);

        try {
          const result = spawnSync(
            'bash',
            [scriptPath, '--pattern', KNOWN, '--glob', 'denied/**/*.txt'],
            {
              cwd: repoDir,
              encoding: 'utf-8', // node api param name
              stdio: ['pipe', 'pipe', 'pipe'],
            },
          );
          // scrub the temp root, then sort the block body: rg's parallel
          // walk emits in no fixed order
          const out = sortBlockBodyLines(
            (result.stdout ?? '').split(repoDir).join('<repo>'),
          );
          expect(out).toMatchSnapshot();

          // rule.require.errors-name-the-fix
          expect(out).toContain('fix: grant read access');
        } finally {
          fs.chmodSync(deniedDir, 0o755);
        }
      });
    });
  });

  given('[case35] a fatal engine error is never reported as a zero', () => {
    // rg exits 0 = matched, 1 = clean no-match, 2 = fatal. a fatal exit is a
    // refusal, never `matches: 0`
    // .note = [case31] covers a per-path skip; this covers a whole-search failure
    when('[t0] the engine refuses the input outright', () => {
      then('it reports a refusal, not a count, and exits 2', () => {
        const repoDir = genTempDirTracked({
          slug: 'grepsafe-fatal',
          git: true,
        });
        fs.writeFileSync(path.join(repoDir, 'a.txt'), `${KNOWN}\n`);

        const result = spawnSync(
          'bash',
          [scriptPath, '--pattern', KNOWN, '--type', 'nosuchtype'],
          {
            cwd: repoDir,
            encoding: 'utf-8', // node api param name
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );
        const out = result.stdout ?? '';

        // the harm first: a zero at exit 0 is the false report
        expect(result.status).toBe(2); // rule.require.exit-code-semantics
        expect(out).not.toContain('matches: 0'); // no count exists; none ran
        // nor may it borrow the per-path label, which names the wrong cause
        expect(out).not.toContain('could not be searched');

        // the refusal is surfaced honestly, in the engine's own words
        expect(out).toContain('refused');
        expect(out).toContain('nosuchtype');

        // the fix line names the flags to check, never a bare "look above"
        expect(out).toContain('fix: correct the input named above');
        expect(out).toContain('--glob');
        expect(out).toContain('--type');

        expect(out.split(repoDir).join('<repo>')).toMatchSnapshot();
      });
    });

    // pipeable stdout is data, so the human render goes to stderr
    when('[t2] --output pipeable meets the same refusal', () => {
      then('stdout stays pipe-clean; the refusal goes to stderr', () => {
        const repoDir = genTempDirTracked({
          slug: 'grepsafe-fatal-pipeable',
          git: true,
        });
        fs.writeFileSync(path.join(repoDir, 'a.txt'), `${KNOWN}\n`);

        const result = spawnSync(
          'bash',
          [
            scriptPath,
            '--pattern',
            KNOWN,
            '--type',
            'nosuchtype',
            '--output',
            'pipeable',
          ],
          {
            cwd: repoDir,
            encoding: 'utf-8', // node api param name
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );
        const out = result.stdout ?? '';
        const err = result.stderr ?? '';

        // stdout carries NO render — not the frame, not a count, not a glyph
        expect(out).not.toContain('🐢');
        expect(out).not.toContain('🐚');
        expect(out).not.toContain('refused');
        expect(out).not.toContain('matches:');
        expect(out.trim()).toBe('');

        // stderr carries it, exit 2 holds
        expect(err).toContain('the search never ran');
        expect(err).toContain('nosuchtype');
        expect(err).toContain('fix: correct the input named above');
        expect(result.status).toBe(2);
        // a distinct shape from [t0]'s vibes frame, so its own snap
        expect(err.split(repoDir).join('<repo>')).toMatchSnapshot();
      });
    });

    // some rg builds (e.g. debian's 14.1.0) prefix each diagnostic with `rg: `
    // and some do not. the rendered frame must not depend on which one is on
    // PATH, or the snapshots above pass on one host and fail on the next
    when('[t3] an rg build that prefixes its diagnostics with `rg: `', () => {
      then('the refusal renders identically to an unprefixed rg', () => {
        // a scratch bin whose 'rg' runs the real rg and prefixes its stderr.
        // .note = only where absent: a host rg that already prefixes must not
        //         gain a second `rg: `, which no real build emits
        const realRg = spawnSync('bash', ['-c', 'command -v rg'], {
          encoding: 'utf-8',
        }).stdout.trim();
        const shadowDir = genTempDirTracked({ slug: 'grepsafe-rg-prefixed' });
        const wrapper = path.join(shadowDir, 'rg');
        fs.writeFileSync(
          wrapper,
          [
            '#!/usr/bin/env bash',
            'errf=$(mktemp)',
            `"${realRg}" "$@" 2>"$errf"`,
            'status=$?',
            'sed \'/^rg: /!s/^/rg: /\' "$errf" >&2',
            'rm -f "$errf"',
            'exit $status',
            '',
          ].join('\n'),
        );
        fs.chmodSync(wrapper, 0o755);

        const repoDir = genTempDirTracked({
          slug: 'grepsafe-fatal-prefixed',
          git: true,
        });
        fs.writeFileSync(path.join(repoDir, 'a.txt'), `${KNOWN}\n`);
        const runWith = (env: NodeJS.ProcessEnv): string =>
          (
            spawnSync(
              'bash',
              [scriptPath, '--pattern', KNOWN, '--type', 'nosuchtype'],
              {
                cwd: repoDir,
                encoding: 'utf-8', // node api param name
                stdio: ['pipe', 'pipe', 'pipe'],
                env,
              },
            ).stdout ?? ''
          )
            .split(repoDir)
            .join('<repo>');

        const outPrefixed = runWith({
          ...process.env,
          PATH: `${shadowDir}:${process.env.PATH ?? ''}`,
        });
        const outBare = runWith(process.env);

        // the control: the wrapper really did prefix, or this proves naught
        expect(
          spawnSync(wrapper, ['--type', 'nosuchtype', 'x'], {
            encoding: 'utf-8',
          }).stderr,
        ).toMatch(/^rg: /);

        expect(outPrefixed).not.toContain('rg: unrecognized');
        expect(outPrefixed).toEqual(outBare);
      });
    });

    when('[t1] the engine runs cleanly and matches naught', () => {
      // the control: a skill that exits 2 on every zero would pass [t0]
      then('a true zero still reports a count and exits 0', () => {
        const repoDir = genTempDirTracked({
          slug: 'grepsafe-clean-zero',
          git: true,
        });
        fs.writeFileSync(path.join(repoDir, 'a.txt'), 'no match here\n');

        const result = spawnSync('bash', [scriptPath, '--pattern', KNOWN], {
          cwd: repoDir,
          encoding: 'utf-8', // node api param name
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        const out = result.stdout ?? '';

        expect(result.status).toBe(0);
        expect(out).toContain('matches: 0');
        expect(out).not.toContain('refused');
      });
    });
  });

  given('[case34] --glob anchors to the search root, never to cwd', () => {
    // grepsafe anchors --glob at the --path root; globsafe anchors at cwd.
    // this pins grepsafe's half, so a change must be deliberate
    when('[t0] a --glob prefix repeats a name that also sits at cwd', () => {
      then(
        'the glob resolves under --path, so the cwd twin is unreached',
        () => {
          const repoDir = genTempDirTracked({
            slug: 'grepsafe-anchor',
            git: true,
          });

          // the twin trees: one under the named root, one at cwd
          fs.mkdirSync(path.join(repoDir, 'inner', 'src'), { recursive: true });
          fs.mkdirSync(path.join(repoDir, 'src'), { recursive: true });
          fs.writeFileSync(
            path.join(repoDir, 'inner', 'src', 'deep.txt'),
            `${KNOWN}\n`,
          );
          fs.writeFileSync(path.join(repoDir, 'src', 'top.txt'), `${KNOWN}\n`);

          const result = spawnSync(
            'bash',
            [
              scriptPath,
              '--pattern',
              KNOWN,
              '--path',
              'inner',
              '--glob',
              'src/**',
            ],
            {
              cwd: repoDir,
              encoding: 'utf-8', // node api param name
              stdio: ['pipe', 'pipe', 'pipe'],
            },
          );
          const out = result.stdout ?? '';

          // anchored at the search root: the deep twin is found
          expect(out).toContain('deep.txt');
          // and the cwd twin is NOT — the control that gives this teeth
          expect(out).not.toContain('top.txt');
        },
      );
    });
  });

  // the tally is `wc -l` over the engine's stdout, and each mode puts a
  // different noun on a line, so the label names that noun.
  // .note = the fixture holds 4 lines across 2 files, so a label right by
  //         accident cannot pass
  given('[case36] the result tally is labeled by its mode', () => {
    const TALLY_FILES = {
      'src/a.ts': `${KNOWN}\n${KNOWN}\n${KNOWN}\n`,
      'src/b.ts': `${KNOWN}\n`,
    };

    when('[t0] no output mode is given', () => {
      then('the tally counts LINES and says so', () => {
        const result = runInTempGitRepo({
          files: TALLY_FILES,
          grepsafeArgs: ['--pattern', KNOWN],
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('lines: 4');
        expect(result.stdout).not.toContain('files:');
      });
    });

    when('[t1] --files-only is given', () => {
      then('the tally counts FILES and says so', () => {
        const result = runInTempGitRepo({
          files: TALLY_FILES,
          grepsafeArgs: ['--pattern', KNOWN, '--files-only'],
        });
        expect(result.exitCode).toBe(0);
        // 2 files, never the 4 lines within them
        expect(result.stdout).toContain('files: 2');
        expect(result.stdout).not.toContain('lines:');
      });
    });

    when('[t2] --count is given', () => {
      then('the tally counts FILES-WITH-MATCHES and says so', () => {
        // rg --count emits one `path:N` line per file, so `wc -l` counts files
        const result = runInTempGitRepo({
          files: TALLY_FILES,
          grepsafeArgs: ['--pattern', KNOWN, '--count'],
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('files: 2');
        expect(result.stdout).not.toContain('lines:');
        // the per-file counts are still the payload, unchanged
        expect(result.stdout).toContain('a.ts:3');
        expect(result.stdout).toContain('b.ts:1');
      });
    });

    when('[t3] --context is given', () => {
      then('the tally counts ROWS and says so', () => {
        // under --context rg emits matches, context lines, and `--`
        // separators, so the tally counts rendered rows
        const result = runInTempGitRepo({
          files: {
            'src/a.ts': `before\n${KNOWN}\nafter\n`,
          },
          grepsafeArgs: ['--pattern', KNOWN, '--context', '1'],
        });
        expect(result.exitCode).toBe(0);
        // 3 rendered rows — the match plus one line either side
        expect(result.stdout).toContain('rows: 3');
        expect(result.stdout).toMatchSnapshot();
        // `lines: 3` would be untrue of a search that matched one line
        expect(result.stdout).not.toContain('lines:');
        // the context rows are still the payload
        expect(result.stdout).toContain('before');
        expect(result.stdout).toContain('after');
      });
    });

    when(
      '[t4] --context rides WITH --files-only (the precedence control)',
      () => {
        then('the tally says FILES — rg renders no context rows here', () => {
          // rg ignores -C under --files-with-matches and --count, so `files` wins
          const result = runInTempGitRepo({
            files: TALLY_FILES,
            grepsafeArgs: [
              '--pattern',
              KNOWN,
              '--context',
              '1',
              '--files-only',
            ],
          });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('files: 2');
          expect(result.stdout).not.toContain('rows:');
          expect(result.stdout).not.toContain('lines:');
        });
      },
    );
  });

  // usage refusals honor the stream contract: both streams under vibes,
  // stderr only under --output pipeable. each step asserts both streams
  given('[case37] every usage refusal honors the stream contract', () => {
    // each step snaps the stream the caller reads: stdout under vibes,
    // stderr under pipeable
    // .note = sanitizeOutput, not scrubRoots: no root pair prints here
    when('[t0] an unknown flag, under vibes', () => {
      then('both streams carry it', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': `${KNOWN}\n` },
          grepsafeArgs: ['--pattern', KNOWN, '--nosuchflag'],
        });
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('unknown option: --nosuchflag');
        expect(result.stderr).toContain('unknown option: --nosuchflag');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] an unknown flag, under --output pipeable', () => {
      then('stdout is pipe-clean and stderr names the fix', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': `${KNOWN}\n` },
          grepsafeArgs: [
            '--pattern',
            KNOWN,
            '--output',
            'pipeable',
            '--nosuchflag',
          ],
        });
        expect(result.exitCode).toBe(2);
        // the harm first: an error string on the data stream
        expect(result.stdout.trim()).toBe('');
        expect(result.stderr).toContain('unknown option: --nosuchflag');
        expect(result.stderr).toContain('--help');
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] --pattern is absent, under --output pipeable', () => {
      then('stdout is pipe-clean and stderr carries the usage', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': `${KNOWN}\n` },
          grepsafeArgs: ['--output', 'pipeable'],
        });
        expect(result.exitCode).toBe(2);
        expect(result.stdout.trim()).toBe('');
        expect(result.stderr).toContain('--pattern is required');
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t3] --pattern is absent, under vibes (the control)', () => {
      // the control: [t2]'s refusal moved streams, it did not vanish
      then('both streams carry it', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': `${KNOWN}\n` },
          grepsafeArgs: [],
        });
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('--pattern is required');
        expect(result.stderr).toContain('--pattern is required');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t4] the --output value itself is unrecognized', () => {
      // the mode itself is the error, so no data contract holds: both streams
      then('both streams carry it, and it names the valid set', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': `${KNOWN}\n` },
          grepsafeArgs: ['--pattern', KNOWN, '--output', 'drect'],
        });
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('must be one of: vibes, pipeable');
        expect(result.stderr).toContain('must be one of: vibes, pipeable');
        // rule.require.errors-name-the-fix: echo what was got, name the fix
        expect(result.stdout).toContain('got: drect');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t6] the unknown flag comes BEFORE --output pipeable', () => {
      // [t1] with argv order swapped: the stream choice must not depend on
      // whether --output was parsed before the unknown flag
      then('stdout stays pipe-clean, exactly as in [t1]', () => {
        const result = runInTempGitRepo({
          files: { 'a.txt': `${KNOWN}\n` },
          grepsafeArgs: [
            '--nosuchflag',
            '--output',
            'pipeable',
            '--pattern',
            KNOWN,
          ],
        });
        expect(result.exitCode).toBe(2);
        // the harm first: an error frame on the data stream
        expect(result.stdout.trim()).toBe('');
        expect(result.stderr).toContain('unknown option: --nosuchflag');
        // and no turtle frame anywhere — pipeable mode renders none
        expect(result.stderr).not.toContain('🐢');
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t5] there is no git repo, under --output pipeable', () => {
      then('stdout is pipe-clean and stderr names the fix', () => {
        const tempDir = genTempDirTracked({ slug: 'grepsafe-no-git-pipeable' });
        fs.writeFileSync(path.join(tempDir, 'a.txt'), `${KNOWN}\n`);

        const result = spawnSync(
          'bash',
          [scriptPath, '--pattern', KNOWN, '--output', 'pipeable'],
          {
            cwd: tempDir,
            encoding: 'utf-8', // node api param name
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );
        expect(result.status).toBe(2);
        expect((result.stdout ?? '').trim()).toBe('');
        expect(result.stderr ?? '').toContain('not in a git repository');
        // rule.require.errors-name-the-fix
        expect(result.stderr ?? '').toContain('git init');
        expect(sanitizeOutput(result.stderr ?? '')).toMatchSnapshot();
      });
    });

    // every pipeable stderr headline carries one prefix, `grepsafe:`.
    // graded as a set, since a per-refusal check cannot see a parity drift.
    // the prefix lives in emit_refusal_with_hint's default, so a new gate
    // inherits it
    when('[t7] every pipeable refusal, as a set', () => {
      then('each stderr headline carries the one grepsafe: prefix', () => {
        const refusals: { why: string; args: string[] }[] = [
          {
            why: 'unknown flag',
            args: ['--output', 'pipeable', '--nosuchflag', '--pattern', KNOWN],
          },
          { why: 'absent --pattern', args: ['--output', 'pipeable'] },
          {
            why: 'bad --head',
            args: ['--output', 'pipeable', '--pattern', KNOWN, '--head', '-5'],
          },
          {
            why: 'root named twice',
            args: [
              '--output',
              'pipeable',
              '--pattern',
              KNOWN,
              '--path',
              '.',
              'alsohere',
            ],
          },
          {
            why: 'path outside the repo',
            args: [
              '--output',
              'pipeable',
              '--pattern',
              KNOWN,
              '--path',
              '/etc',
            ],
          },
        ];

        const seen = refusals.map(({ why, args }) => {
          const result = runInTempGitRepo({
            files: { 'a.txt': `${KNOWN}\n` },
            grepsafeArgs: args,
          });
          const headline = (result.stderr ?? '')
            .split('\n')
            .find((line) => line.trim() !== '')
            ?.trim();
          return {
            why,
            exitCode: result.exitCode,
            // the negative key rejects a headline that carries both
            saysGrepsafe: headline?.startsWith('grepsafe:') ?? false,
            saysError: headline?.startsWith('error:') ?? false,
            frame: sanitizeOutput(result.stderr ?? ''),
          };
        });

        expect(seen.map(({ frame, ...claims }) => claims)).toEqual(
          refusals.map(({ why }) => ({
            why,
            exitCode: 2,
            saysGrepsafe: true,
            saysError: false,
          })),
        );

        // snap the five frames beside the claims
        expect(
          seen.map(({ why, frame }) => `── ${why} ──\n${frame}`).join('\n'),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case38] a root that will not expand states WHY', () => {
    // realpath refuses for distinct reasons (ENOENT, EACCES, ELOOP, ENOTDIR);
    // the skill keeps its status and its sentence, so an unreadable prefix
    // is never reported as "no file matched the glob"

    when('[t0] a --glob prefix sits under an unreadable parent', () => {
      then('the zero names the reason, never a bare no-file-matched', () => {
        const repoDir = genTempDirTracked({
          slug: 'grepsafe-expand-eacces',
          git: true,
        });
        const deniedDir = path.join(repoDir, 'denied');
        fs.mkdirSync(path.join(deniedDir, 'sub'), { recursive: true });
        fs.writeFileSync(path.join(deniedDir, 'sub', 'x.txt'), `${KNOWN}\n`);
        fs.chmodSync(deniedDir, 0o000);

        try {
          const result = spawnSync(
            'bash',
            [scriptPath, '--pattern', KNOWN, '--glob', 'denied/sub/**/*.txt'],
            {
              cwd: repoDir,
              encoding: 'utf-8', // node api param name
              stdio: ['pipe', 'pipe', 'pipe'],
            },
          );
          const out = result.stdout ?? '';

          // the harm first: the walk never reached the glob's files
          expect(out).not.toContain('matches: 0 — no file matched the glob');
          // the kind names the cause class
          expect(out).toContain('could not be read');
          // realpath's own sentence names the instance
          expect(out).toContain('realpath');
          expect(out).toContain('Permission denied');
          // sorted: rg emits unreadable paths in parallel-walk order
          expect(sortBlockBodyLines(sanitizeOutput(out))).toMatchSnapshot();
        } finally {
          // restore, so the temp dir stays removable
          fs.chmodSync(deniedDir, 0o755);
        }
      });
    });

    when('[t1] a --glob prefix is merely absent under a real parent', () => {
      // the control: a plain miss stays a plain zero, with no invented reason
      then('the zero stays plain, with no reason attached', () => {
        const repoDir = genTempDirTracked({
          slug: 'grepsafe-expand-enoent',
          git: true,
        });
        fs.mkdirSync(path.join(repoDir, 'src'), { recursive: true });
        fs.writeFileSync(path.join(repoDir, 'src', 'a.ts'), `${KNOWN}\n`);

        const result = spawnSync(
          'bash',
          [scriptPath, '--pattern', KNOWN, '--glob', 'src/nope/**/*.ts'],
          {
            cwd: repoDir,
            encoding: 'utf-8', // node api param name
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );
        const out = result.stdout ?? '';

        expect(result.status).toBe(0);
        expect(out).toContain('matches: 0 — no file matched the glob');
        expect(out).not.toContain('realpath');
        expect(out).not.toContain('could not be read');
        expect(sanitizeOutput(out)).toMatchSnapshot();
      });
    });

    when('[t2] --path names a symlink loop', () => {
      // a loop is not an absence, so the headline says "could not be opened"
      then('the refusal says it could not be opened, and why', () => {
        const repoDir = genTempDirTracked({
          slug: 'grepsafe-expand-eloop',
          git: true,
        });
        fs.writeFileSync(path.join(repoDir, 'a.txt'), `${KNOWN}\n`);
        fs.symlinkSync('loop', path.join(repoDir, 'loop'));

        const result = spawnSync(
          'bash',
          [scriptPath, '--pattern', KNOWN, '--path', 'loop'],
          {
            cwd: repoDir,
            encoding: 'utf-8', // node api param name
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );
        const out = result.stdout ?? '';

        expect(result.status).toBe(2);
        expect(out).not.toContain('search path does not exist');
        expect(out).toContain('search path could not be opened');
        expect(out).toContain('realpath');
        // and a vibes refusal owes both streams
        expect(result.stderr ?? '').toContain(
          'search path could not be opened',
        );
        expect(sanitizeOutput(out)).toMatchSnapshot();
      });
    });
  });

  given('[case39] a SKIP inside a reachable root is its own zero', () => {
    // a root that opens, with an unreadable subtree; the two steps differ in
    // whether a readable file also matches. an empty list here is evidence
    // of the skip, never proof of absence
    const genRootWithDeniedSubtree = (args: {
      slug: string;
      alsoVisible: boolean;
    }): { repoDir: string; deniedDir: string } => {
      const repoDir = genTempDirTracked({ slug: args.slug, git: true });
      const deniedDir = path.join(repoDir, 'reachable', 'denied');
      fs.mkdirSync(deniedDir, { recursive: true });
      fs.writeFileSync(path.join(deniedDir, 'hidden-match.txt'), `${KNOWN}\n`);
      if (args.alsoVisible) {
        fs.writeFileSync(
          path.join(repoDir, 'reachable', 'seen-match.txt'),
          `${KNOWN}\n`,
        );
      }
      fs.chmodSync(deniedDir, 0o000);
      return { repoDir, deniedDir };
    };

    when(
      '[t0] every file that matches sits under the unreadable subtree',
      () => {
        // diagnose_zero_kind re-runs the scope as `rg --files`, so the same
        // denial fails the probe too. the measured skip must outrank the
        // probe: `could not tell which zero` is the less informative of two
        // true answers
        then(
          'the zero names the unreadable skip, and the skip is surfaced',
          () => {
            const { repoDir, deniedDir } = genRootWithDeniedSubtree({
              slug: 'grepsafe-skip-zero',
              alsoVisible: false,
            });

            try {
              const result = spawnSync(
                'bash',
                [
                  scriptPath,
                  '--pattern',
                  KNOWN,
                  '--glob',
                  'reachable/**/*.txt',
                ],
                {
                  cwd: repoDir,
                  encoding: 'utf-8', // node api param name
                  stdio: ['pipe', 'pipe', 'pipe'],
                },
              );
              const out = result.stdout ?? '';

              // the harm first: the filter did select a file
              expect(out).not.toContain(
                'matches: 0 — no file matched the glob',
              );
              expect(out).toContain(
                'matches: 0 — no readable file matched the glob',
              );
              expect(out).not.toContain('could not tell which zero');
              // and the root DID open, so this is not case38's kind
              expect(out).not.toContain('realpath');
              // the skip is named
              expect(out).toContain('Permission denied');
              expect(out).toContain('could not be searched');
              expect(sortBlockBodyLines(sanitizeOutput(out))).toMatchSnapshot();
            } finally {
              fs.chmodSync(deniedDir, 0o755);
            }
          },
        );
      },
    );

    when('[t1] a readable file matches BESIDE the unreadable subtree', () => {
      // results and a caveat in one render: a real answer that is incomplete
      then('the results and the unread caveat are rendered together', () => {
        const { repoDir, deniedDir } = genRootWithDeniedSubtree({
          slug: 'grepsafe-skip-partial',
          alsoVisible: true,
        });

        try {
          const result = spawnSync(
            'bash',
            [scriptPath, '--pattern', KNOWN, '--glob', 'reachable/**/*.txt'],
            {
              cwd: repoDir,
              encoding: 'utf-8', // node api param name
              stdio: ['pipe', 'pipe', 'pipe'],
            },
          );
          const out = result.stdout ?? '';

          // a real answer...
          expect(result.status).toBe(0);
          expect(out).toContain('seen-match.txt');
          expect(out).toContain('lines: 1');
          // ...that is ALSO incomplete, and says so in the same frame
          expect(out).toContain('could not be searched');
          expect(out).toContain('Permission denied');
          // the denial is not counted as a match
          expect(out).not.toContain('lines: 2');
          // the unread block sits beneath results, so results is `├─`.
          // asserted, so a resnap cannot cement a wrong glyph
          expect(out).toContain('├─ results');
          expect(out).not.toContain('└─ results');
          expect(sortBlockBodyLines(sanitizeOutput(out))).toMatchSnapshot();
        } finally {
          fs.chmodSync(deniedDir, 0o755);
        }
      });
    });

    when('[t2] the SAME tree is readable throughout (the control)', () => {
      // the control: a hardcoded `├─` would pass [t1]. one variable differs
      // from [t1], the subtree is readable, so the glyph must track it
      then('the results node claims last-ness, and no caveat is shown', () => {
        const { repoDir, deniedDir } = genRootWithDeniedSubtree({
          slug: 'grepsafe-skip-control',
          alsoVisible: true,
        });
        // lift the denial
        fs.chmodSync(deniedDir, 0o755);

        const result = spawnSync(
          'bash',
          [scriptPath, '--pattern', KNOWN, '--glob', 'reachable/**/*.txt'],
          {
            cwd: repoDir,
            encoding: 'utf-8', // node api param name
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );
        const out = result.stdout ?? '';

        // the walk is complete, so there is no peer beneath `results`
        expect(result.status).toBe(0);
        expect(out).not.toContain('could not be searched');
        expect(out).toContain('└─ results');
        expect(out).not.toContain('├─ results');
        // and both files are read now — the denial was the only barrier
        expect(out).toContain('seen-match.txt');
        expect(out).toContain('hidden-match.txt');
      });
    });

    // all three rg stderr sources feed DIAGNOSTICS, and each is sorted, so
    // the rendered denials form at most two sorted runs (main run, probe)
    // .note = teeth are partial: the defect is a race, so a revert reddens
    //         only when rg's threads finish out of order
    when('[t3] two distinct paths are unreadable under one glob', () => {
      then('the rendered denials never form a third unsorted run', () => {
        const repoDir = genTempDirTracked({
          slug: 'grepsafe-skip-order',
          git: true,
        });
        // created out of sorted order, so creation order cannot pass by accident
        const denied = ['zeta', 'alpha', 'mid'].map((name) => {
          const dir = path.join(repoDir, 'reachable', name);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, 'hidden-match.txt'), `${KNOWN}\n`);
          return dir;
        });
        for (const dir of denied) fs.chmodSync(dir, 0o000);

        try {
          const result = spawnSync(
            'bash',
            [scriptPath, '--pattern', KNOWN, '--glob', 'reachable/**/*.txt'],
            {
              cwd: repoDir,
              encoding: 'utf-8', // node api param name
              stdio: ['pipe', 'pipe', 'pipe'],
            },
          );
          const out = result.stdout ?? '';

          // all three denials reach the caller
          expect(out).toContain('alpha');
          expect(out).toContain('mid');
          expect(out).toContain('zeta');

          // the order invariant: at most two sorted runs
          const denials = out
            .split('\n')
            .filter((line) => line.includes('Permission denied'))
            .map((line) => line.trim());
          expect(denials.length).toBeGreaterThan(1);

          const restarts = denials.filter(
            (line, i) => i > 0 && line < (denials[i - 1] ?? ''),
          ).length;
          expect({ atMostTwoRuns: restarts <= 1 }).toEqual({
            atMostTwoRuns: true,
          });
        } finally {
          for (const dir of denied) fs.chmodSync(dir, 0o755);
        }
      });
    });
  });

  // every refusal surface, in both modes, names a next move: the 🥥 block
  // under vibes, a `fix:` line under pipeable (rule.require.coconut-hints)
  given('[case40] every refusal names a next move', () => {
    // each surface, named by what a caller did wrong; all refuse before
    // any search runs.
    // `modeFixed` = the defect is the --output value itself, so a second
    // --output would win the parse and no refusal would fire
    const refusals: { why: string; args: string[]; modeFixed?: true }[] = [
      { why: 'no --pattern at all', args: [] },
      { why: 'an unknown flag', args: ['--pattern', 'x', '--nosuchflag'] },
      {
        why: 'an --output mode that does not exist',
        args: ['--pattern', 'x', '--output', 'nosuchmode'],
        modeFixed: true,
      },
      {
        why: 'a --path outside the repo',
        args: ['--pattern', 'x', '--path', '/tmp'],
      },
      {
        why: 'a --path that does not exist',
        args: ['--pattern', 'x', '--path', 'nosuchdir_xyz'],
      },
      {
        why: 'a --glob prefix that escapes the repo',
        args: ['--pattern', 'x', '--glob', '../**/*.md'],
      },
      // .note = this list is built from the flag list, not from the
      //         emit_refusal call sites: a surface that never reaches the
      //         gate is invisible to a walk of the gate
      {
        why: 'a --head that is not a number',
        args: ['--pattern', 'x', '--head', 'abc'],
      },
      // GNU `head -n -5` means "all but the last 5", a silent truncation
      {
        why: 'a --head that is negative',
        args: ['--pattern', 'x', '--head', '-5'],
      },
      // a second search root, silently kept, would answer about the wrong path
      {
        why: 'a third positional, after pattern and path',
        args: ['findme', '.', 'strayarg'],
      },
      {
        why: 'a positional that would overwrite an explicit --path',
        args: ['--pattern', 'x', '--path', '.', 'strayarg'],
      },
      // the same refusal in either argv order
      {
        why: 'an explicit --path that would overwrite a positional root',
        args: ['--pattern', 'x', '.', '--path', 'nosuchdir_xyz'],
      },
      // `direct` is renamed `pipeable`; the refusal names the rename
      {
        why: 'the retired --output value, which has a replacement',
        args: ['--pattern', 'x', '--output', 'direct'],
        modeFixed: true,
      },
    ];

    when('[t0] the refusal renders in vibes mode', () => {
      // the full anatomy of rule.require.coconut-hints: blank line,
      // header, treestruct body, command last
      then('each one wears the full coconut block', () => {
        for (const refusal of refusals) {
          const result = runInTempGitRepo({
            files: { 'a.txt': 'content\n' },
            grepsafeArgs: refusal.args,
          });

          // a refusal, not a zero — the two must not be confused
          expect(result.exitCode).toBe(2);

          // one object, so a red names the surface and every part it lacks
          const out = result.stdout;
          expect({
            surface: refusal.why,
            blankLineThenHeader: out.includes('\n\n🥥 did you know?'),
            affordance: out.includes('\n   ├─ '),
            commandLast: out.includes('\n   └─ '),
          }).toEqual({
            surface: refusal.why,
            blankLineThenHeader: true,
            affordance: true,
            commandLast: true,
          });
        }
      });
    });

    when('[t1] the same refusals render under --output pipeable', () => {
      // every pipeable remedy renders through one helper, so `fix:` is
      // the one marker word
      then('each one carries a fix: line on stderr', () => {
        const walkable = refusals.filter((one) => !one.modeFixed);
        // refuse a vacuous walk (rule.forbid.failhide)
        expect(walkable.length).toBeGreaterThan(0);

        for (const refusal of walkable) {
          const result = runInTempGitRepo({
            files: { 'a.txt': 'content\n' },
            grepsafeArgs: [...refusal.args, '--output', 'pipeable'],
          });

          expect(result.exitCode).toBe(2);
          // the data stream stays clean
          expect(result.stdout.trim()).toBe('');

          const err = result.stderr;
          expect({
            surface: refusal.why,
            hasFix: err.includes('fix:'),
            // the human landmark stays off a machine's stream
            noCoconut: !err.includes('🥥'),
          }).toEqual({
            surface: refusal.why,
            hasFix: true,
            noCoconut: true,
          });
        }
      });
    });

    // --head: a bad value is a constraint (exit 2) with no raw `head`
    // text, and each boundary has a control that a valid value still works
    when('[t2] --head refuses bad input and accepts good', () => {
      const FILES = {
        'a.md': 'wick\n',
        'b.md': 'wick\n',
        'c.md': 'wick\n',
      };

      then('a non-numeric --head is a CONSTRAINT, not a malfunction', () => {
        const result = runInTempGitRepo({
          files: FILES,
          grepsafeArgs: ['--pattern', 'wick', '--head', 'abc'],
        });

        expect({
          exitCode: result.exitCode,
          leaksRawHeadError: result.stderr.includes('invalid number of lines'),
          namesTheFlag: result.stdout.includes('--head must be a positive'),
          echoesTheBadValue: result.stdout.includes('abc'),
        }).toEqual({
          exitCode: 2,
          leaksRawHeadError: false,
          namesTheFlag: true,
          echoesTheBadValue: true,
        });

        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('a negative --head refuses instead of silently truncating', () => {
        const result = runInTempGitRepo({
          files: FILES,
          grepsafeArgs: ['--pattern', 'wick', '--head', '-5', '--files-only'],
        });

        expect({
          exitCode: result.exitCode,
          // `(first -5)` would be untrue about the rows shown
          noNonsenseTally: !result.stdout.includes('(first -5)'),
        }).toEqual({ exitCode: 2, noNonsenseTally: true });
        // the key above is an absence check, so snap the frame too
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('🟢 CONTROL — a valid --head still limits and still tallies', () => {
        const result = runInTempGitRepo({
          files: FILES,
          grepsafeArgs: ['--pattern', 'wick', '--head', '2', '--files-only'],
        });

        expect({
          exitCode: result.exitCode,
          tallied: result.stdout.includes('(first 2)'),
        }).toEqual({ exitCode: 0, tallied: true });
      });

      // `08` means 8. it is invalid octal, so bash arithmetic dies on it
      // unless the value is recast to decimal; `(first 8)` pins the recast
      then('🟢 CONTROL — a zero in front is still a valid limit', () => {
        // nine files, so a limit of 8 truncates and the tally renders
        const NINE = Object.fromEntries(
          Array.from({ length: 9 }, (_, i) => [`f${i}.md`, 'wick\n']),
        );

        const result = runInTempGitRepo({
          files: NINE,
          grepsafeArgs: ['--pattern', 'wick', '--head', '08', '--files-only'],
        });

        expect({
          exitCode: result.exitCode,
          // a base error can follow a partial render, so check stderr too
          leaksBaseError: result.stderr.includes('value too great for base'),
          tallied: result.stdout.includes('(first 8)'),
        }).toEqual({ exitCode: 0, leaksBaseError: false, tallied: true });
      });

      // the upper bound: bash arithmetic is fixed width, so a 20-digit
      // value wraps negative, and `head -n -N` would render a false zero
      then(
        'an oversized --head is refused, never wrapped to a false zero',
        () => {
          const NINE = Object.fromEntries(
            Array.from({ length: 9 }, (_, i) => [`f${i}.md`, 'wick\n']),
          );

          const result = runInTempGitRepo({
            files: NINE,
            grepsafeArgs: [
              '--pattern',
              'wick',
              '--head',
              '10000000000000000000',
              '--files-only',
            ],
          });

          expect({
            exitCode: result.exitCode,
            // the harm first: a false zero
            claimsZero: result.stdout.includes('matches: 0'),
            namesTheBound: result.stdout.includes('at most 18 digits'),
            echoesTheBadValue: result.stdout.includes(
              'got: 10000000000000000000',
            ),
            // grepsafe's remedy is the 🥥 block, not globsafe's `fix:` line
            namesTheRemedy: result.stdout.includes(
              'pass a whole number above zero',
            ),
          }).toEqual({
            exitCode: 2,
            claimsZero: false,
            namesTheBound: true,
            echoesTheBadValue: true,
            namesTheRemedy: true,
          });
          expect(result.stdout).toMatchSnapshot();
        },
      );

      // `--head 0` is refused: zero rendered rows would read like zero matches
      then('--head 0 is refused, and the refusal is deliberate', () => {
        const result = runInTempGitRepo({
          files: FILES,
          grepsafeArgs: ['--pattern', 'wick', '--head', '0', '--files-only'],
        });

        expect({
          exitCode: result.exitCode,
          claimsZero: result.stdout.includes('matches: 0'),
          namesTheFlag: result.stdout.includes('--head must be a positive'),
        }).toEqual({ exitCode: 2, claimsZero: false, namesTheFlag: true });
        expect(result.stdout).toMatchSnapshot();
      });

      // the control for the upper bound: 18 digits cannot overflow
      then('🟢 CONTROL — an 18-digit --head is still accepted', () => {
        const NINE = Object.fromEntries(
          Array.from({ length: 9 }, (_, i) => [`f${i}.md`, 'wick\n']),
        );

        const result = runInTempGitRepo({
          files: NINE,
          grepsafeArgs: [
            '--pattern',
            'wick',
            '--head',
            '100000000000000000',
            '--files-only',
          ],
        });

        // no truncation, so no `(first N)` tally; it ran and found all nine
        expect({
          exitCode: result.exitCode,
          refused: result.stdout.includes('at most 18 digits'),
          foundThem: result.stdout.includes('files: 9'),
        }).toEqual({ exitCode: 0, refused: false, foundThem: true });
      });
    });

    // --files-only wins over --count from either position, and --help
    // states it. documented, not refused: both flags describe one result set
    when('[t3] --count and --files-only are passed together', () => {
      const FILES = { 'a.md': 'wick\nwick\n', 'b.md': 'wick\n' };

      then('--files-only wins, from EITHER position', () => {
        const countFirst = runInTempGitRepo({
          files: FILES,
          grepsafeArgs: ['--pattern', 'wick', '--count', '--files-only'],
        });
        const filesFirst = runInTempGitRepo({
          files: FILES,
          grepsafeArgs: ['--pattern', 'wick', '--files-only', '--count'],
        });

        // the tally label tells the two modes apart
        expect({
          countFirstLabel: countFirst.stdout.includes('files:'),
          filesFirstLabel: filesFirst.stdout.includes('files:'),
          neitherSaysLines:
            !countFirst.stdout.includes('lines:') &&
            !filesFirst.stdout.includes('lines:'),
        }).toEqual({
          countFirstLabel: true,
          filesFirstLabel: true,
          neitherSaysLines: true,
        });
      });

      then('--help states the precedence, so it is not silent', () => {
        const result = runInTempGitRepo({
          files: FILES,
          grepsafeArgs: ['--help'],
        });

        expect(result.stdout).toContain('wins over --count');
      });
    });

    // a second search root is refused, unlike [t3]: two roots are two
    // result sets, so any precedence would guess at the question.
    // the control first: the documented two-positional form still works
    when('[t4] positional args beyond pattern and path', () => {
      const FILES = {
        'a.md': 'wick\n',
        'sub/b.md': 'wick\n',
      };

      then('🟢 CONTROL — pattern + path as two positionals still works', () => {
        const result = runInTempGitRepo({
          files: FILES,
          grepsafeArgs: ['wick', 'sub', '--files-only'],
        });

        expect({
          exitCode: result.exitCode,
          scopedToTheNamedRoot:
            result.stdout.includes('sub/b.md') &&
            !result.stdout.includes('│  a.md'),
        }).toEqual({ exitCode: 0, scopedToTheNamedRoot: true });
      });

      then('a THIRD positional is refused, and names BOTH roots', () => {
        const result = runInTempGitRepo({
          files: FILES,
          grepsafeArgs: ['wick', 'sub', 'strayarg', '--files-only'],
        });

        expect({
          exitCode: result.exitCode,
          // the load-bearing half: the caller's defect is that they typed
          // two roots, so the report that helps is the PAIR — never the one
          // that happened to win
          namesTheFirst: result.stdout.includes('first: sub'),
          namesTheSecond: result.stdout.includes('then:  strayarg'),
        }).toEqual({
          exitCode: 2,
          namesTheFirst: true,
          namesTheSecond: true,
        });

        // the snap shows the `first:`/`then:` pair reads as a pair
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      // the two steps below are one invariant in both argv orders
      then('--path AFTER a positional root is refused', () => {
        const result = runInTempGitRepo({
          files: FILES,
          grepsafeArgs: [
            '--pattern',
            'wick',
            '--path',
            'sub',
            'strayarg',
            '--files-only',
          ],
        });

        expect({
          exitCode: result.exitCode,
          didNotSilentlySucceed: result.exitCode !== 0,
          namesBothRoots:
            result.stdout.includes('first: sub') &&
            result.stdout.includes('then:  strayarg'),
        }).toEqual({
          exitCode: 2,
          didNotSilentlySucceed: true,
          namesBothRoots: true,
        });
        // .why = a distinct render a caller meets, apart from the
        //        bare-positional twin above, so it owes its own visual pin
        //        (rule.require.contract-snapshot-exhaustiveness). an
        //        `.includes` key cannot show a reviewer a reflow, a dropped
        //        line, or a reworded remedy
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('the REVERSE order refuses identically', () => {
        const result = runInTempGitRepo({
          files: FILES,
          grepsafeArgs: [
            '--pattern',
            'wick',
            'sub',
            '--path',
            'strayarg',
            '--files-only',
          ],
        });

        expect({
          exitCode: result.exitCode,
          // the positional settled the root first, so it is `first:` here —
          // the roles swap with the argv, and the refusal follows
          namesBothRoots:
            result.stdout.includes('first: sub') &&
            result.stdout.includes('then:  strayarg'),
        }).toEqual({ exitCode: 2, namesBothRoots: true });
        // .note = the gate reports argv position, not which flag supplied
        //         each root, so this frame matches its twin's bytes
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    // `direct` is renamed `pipeable`: the refusal names the old value, the
    // new one, and the rename, so a caller does not hunt a typo
    when('[t5] the retired --output value is passed', () => {
      const FILES = { 'a.md': 'wick\n' };

      then('the refusal names the rename AND the replacement', () => {
        const result = runInTempGitRepo({
          files: FILES,
          grepsafeArgs: ['--pattern', 'wick', '--output', 'direct'],
        });

        expect({
          exitCode: result.exitCode,
          namesTheRename: result.stdout.includes(
            '--output direct was renamed to pipeable',
          ),
          echoesTheBadValue: result.stdout.includes('got: direct'),
          namesTheReplacement: result.stdout.includes('--output pipeable'),
        }).toEqual({
          exitCode: 2,
          namesTheRename: true,
          echoesTheBadValue: true,
          namesTheReplacement: true,
        });

        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      // the control: a never-valid value takes the generic arm
      then('🟢 CONTROL — a never-valid mode keeps the generic refusal', () => {
        const result = runInTempGitRepo({
          files: FILES,
          grepsafeArgs: ['--pattern', 'wick', '--output', 'nosuchmode'],
        });

        expect({
          exitCode: result.exitCode,
          claimsARename: result.stdout.includes('was renamed'),
          namesTheSet: result.stdout.includes('must be one of: vibes,'),
        }).toEqual({
          exitCode: 2,
          claimsARename: false,
          namesTheSet: true,
        });

        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      // --help documents the three gated rules, as globsafe's does ([case15][t4])
      when(
        '[t6] a grepsafe caller reads --help before they meet a gate',
        () => {
          then('all three new rules are documented there', () => {
            const result = runInTempGitRepo({
              files: { 'a.md': 'wick\n' },
              grepsafeArgs: ['--help'],
            });

            expect({
              exitCode: result.exitCode,
              documentsTheRename: result.stdout.includes(
                "--output 'direct' is renamed 'pipeable'",
              ),
              documentsHead: result.stdout.includes(
                '--head and --tail take a positive integer of at most 18 digits',
              ),
              documentsRootOnce: result.stdout.includes(
                'a bare positional root stands alone',
              ),
            }).toEqual({
              exitCode: 0,
              documentsTheRename: true,
              documentsHead: true,
              documentsRootOnce: true,
            });
          });
        },
      );
    });
  });

  // every glob shape reads as gitignore reads it, relative to the root it
  // names: a glob with a slash is anchored there, a brace alternative names
  // its own root, and a match behind a skipped dot dir is never a plain zero.
  // .note = one fixture, four files; each case can only pass by the exact set
  given('[case41] every glob shape answers from the root it names', () => {
    const SHAPES = {
      'docs/a.md': `${KNOWN} top\n`,
      'docs/sub/b.md': `${KNOWN} nested\n`,
      '.hid/c.md': `${KNOWN} hidden\n`,
      'src/d.ts': `${KNOWN} ts\n`,
    };

    // the sorted file set a pipeable --files-only run returns
    const filesFound = (glob: string, extra: string[] = []): string[] =>
      runInTempGitRepo({
        files: SHAPES,
        grepsafeArgs: [
          '--pattern',
          KNOWN,
          '--glob',
          glob,
          '--files-only',
          '--output',
          'pipeable',
          ...extra,
        ],
      })
        .stdout.split('\n')
        .filter(Boolean)
        .sort(byteOrder);

    when('[t0] a slashed glob with no slash in its tail', () => {
      then('docs/*.md is anchored, so docs/sub/b.md is out (D1)', () => {
        expect(filesFound('docs/*.md')).toEqual(['docs/a.md']);
      });
      then('--path with docs/*.md is anchored the same way (D1)', () => {
        expect(filesFound('docs/*.md', ['--path', '.'])).toEqual(['docs/a.md']);
      });
    });

    when('[t1] a glob whose tail holds a slash', () => {
      then('*/a.md under a named root finds docs/a.md (D2)', () => {
        const repo = runInTempGitRepo({
          files: { 'p/docs/a.md': `${KNOWN}\n`, 'p/docs/sub/a.md': 'x\n' },
          grepsafeArgs: [
            '--pattern',
            KNOWN,
            '--glob',
            'p/*/a.md',
            '--files-only',
            '--output',
            'pipeable',
          ],
        });
        expect(repo.stdout.trim()).toEqual('p/docs/a.md');
      });
    });

    when('[t2] a brace group that names more than one root', () => {
      then('{docs/*.md,.hid/*.md} finds both, dot dir included (D3)', () => {
        expect(filesFound('{docs/*.md,.hid/*.md}')).toEqual([
          '.hid/c.md',
          'docs/a.md',
        ]);
      });
      then('{docs,.hid}/*.md finds both, dot dir included (D2)', () => {
        expect(filesFound('{docs,.hid}/*.md')).toEqual([
          '.hid/c.md',
          'docs/a.md',
        ]);
      });
      then('overlapped roots report each file once', () => {
        expect(filesFound('{docs/**,docs/sub/**}')).toEqual([
          'docs/a.md',
          'docs/sub/b.md',
        ]);
      });
      then('the header names every root the legs walked', () => {
        const result = runInTempGitRepo({
          files: SHAPES,
          grepsafeArgs: ['--pattern', KNOWN, '--glob', '{docs/*.md,src/*.ts}'],
        });
        expect(result.stdout).toContain('├─ paths: docs, src');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] a pattern that opens with a dash', () => {
      then('it is read as the pattern, never as an rg flag', () => {
        const result = runInTempGitRepo({
          files: { 'a.md': '-v marks the reef\n' },
          grepsafeArgs: ['--pattern', '-v marks', '--output', 'pipeable'],
        });
        expect({
          exitCode: result.exitCode,
          stdout: result.stdout.trim(),
        }).toEqual({ exitCode: 0, stdout: 'a.md:1:-v marks the reef' });
      });
    });

    when('[t4] the only match sits behind a dot dir the walk skipped', () => {
      const result = useThen('the search runs', () =>
        runInTempGitRepo({
          files: { '.behavior/wish.md': `${KNOWN}\n`, 'docs/x.md': 'x\n' },
          grepsafeArgs: ['--pattern', KNOWN, '--glob', '*.md'],
        }),
      );
      then('the zero says where the match hides (#780)', () => {
        expect({
          exitCode: result.exitCode,
          readsAsPlainZero: result.stdout.includes(
            'matches: 0 — no line matched the pattern',
          ),
          namesTheDotDir: result.stdout.includes(
            'matches: 0 — none in the walked trees, but 1 hidden file(s) hold a match',
          ),
          namesTheFix: result.stdout.includes(
            `grepsafe.sh --pattern '${KNOWN}' --path .behavior --glob '*.md'`,
          ),
        }).toEqual({
          exitCode: 0,
          readsAsPlainZero: false,
          namesTheDotDir: true,
          namesTheFix: true,
        });
      });
      then('the pruned zero is snapped', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t5] 🟢 CONTROL — no match exists anywhere', () => {
      then('the zero stays a plain zero, with no dot-dir hint', () => {
        const result = runInTempGitRepo({
          files: { '.behavior/wish.md': 'x\n', 'docs/x.md': 'x\n' },
          grepsafeArgs: ['--pattern', KNOWN, '--glob', '*.md'],
        });
        expect({
          plainZero: result.stdout.includes(
            'matches: 0 — no line matched the pattern',
          ),
          hint: result.stdout.includes('did you know?'),
        }).toEqual({ plainZero: true, hint: false });
      });
    });
  });

  // the radio reports this branch closes beyond the glob roots: every --path
  // is searched (#657, #726, #781), piped text is the subject (#598, #622),
  // --tail exists (#785), and a hidden match the walk skipped is named beside
  // results as well as beside a zero (#724, #725, #780)
  given('[case42] every root, the pipe, the tail, and the hidden skip', () => {
    const TREE = {
      'a/one.md': `${KNOWN} alpha\n`,
      'b/two.md': `${KNOWN} beta\n`,
      'c/three.md': `${KNOWN} gamma\n`,
    };

    when('[t0] --path is repeated', () => {
      const result = useThen('the search runs', () =>
        runInTempGitRepo({
          files: TREE,
          grepsafeArgs: [
            '--pattern',
            KNOWN,
            '--path',
            'a',
            '--path',
            'b',
            '--files-only',
          ],
        }),
      );
      then('every root is searched, and no other', () => {
        expect({
          exitCode: result.exitCode,
          a: result.stdout.includes('a/one.md'),
          b: result.stdout.includes('b/two.md'),
          c: result.stdout.includes('c/three.md'),
          header: result.stdout.includes('├─ paths: a, b'),
        }).toEqual({ exitCode: 0, a: true, b: true, c: false, header: true });
      });
      then('the two-root answer is snapped', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] a positional root sits beside --path', () => {
      then('it is refused: a shell-expanded glob lands there too', () => {
        const result = runInTempGitRepo({
          files: TREE,
          grepsafeArgs: ['--pattern', KNOWN, '--path', 'a', 'b'],
        });
        expect({
          exitCode: result.exitCode,
          refused: result.stdout.includes('the search root was named twice'),
          namesTheFix: result.stdout.includes('--path src --path test'),
        }).toEqual({ exitCode: 2, refused: true, namesTheFix: true });
      });
    });

    when('[t2] text is piped in', () => {
      const result = useThen('the search runs', () =>
        runInTempGitRepo({
          files: TREE,
          input: `reef\n${KNOWN} piped\nshore\n`,
          grepsafeArgs: ['--pattern', KNOWN],
        }),
      );
      then('the pipe is the subject, never the repo', () => {
        expect({
          exitCode: result.exitCode,
          hitsThePipe: result.stdout.includes(`2:${KNOWN} piped`),
          hitsTheRepo: result.stdout.includes('a/one.md'),
          namesTheSubject: result.stdout.includes('├─ input: stdin'),
        }).toEqual({
          exitCode: 0,
          hitsThePipe: true,
          hitsTheRepo: false,
          namesTheSubject: true,
        });
      });
      then('the piped answer is snapped', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] piped text holds no match', () => {
      then('the zero is about the pipe, and the repo is not searched', () => {
        const result = runInTempGitRepo({
          files: TREE,
          input: 'reef\nshore\n',
          grepsafeArgs: ['--pattern', KNOWN],
        });
        expect({
          exitCode: result.exitCode,
          zero: result.stdout.includes(
            'matches: 0 — no line matched the pattern',
          ),
          namesTheSubject: result.stdout.includes('├─ input: stdin'),
        }).toEqual({ exitCode: 0, zero: true, namesTheSubject: true });
      });
    });

    when('[t4] piped text sits beside a named file set', () => {
      then('each of --path, --glob, --type is refused as two subjects', () => {
        const seen = [
          ['--path', 'a'],
          ['--glob', '*.md'],
          ['--type', 'md'],
        ].map((extra) => {
          const result = runInTempGitRepo({
            files: TREE,
            input: `${KNOWN}\n`,
            grepsafeArgs: ['--pattern', KNOWN, ...extra],
          });
          return {
            exitCode: result.exitCode,
            refused: result.stdout.includes(
              'piped text and a file set were both named',
            ),
          };
        });
        expect(seen).toEqual([
          { exitCode: 2, refused: true },
          { exitCode: 2, refused: true },
          { exitCode: 2, refused: true },
        ]);
      });
    });

    when('[t5] --from @stdin is named with naught piped', () => {
      then('an empty pipe is searched, never the repo', () => {
        const result = runInTempGitRepo({
          files: TREE,
          grepsafeArgs: ['--pattern', KNOWN, '--from', '@stdin'],
        });
        expect({
          exitCode: result.exitCode,
          hitsTheRepo: result.stdout.includes('a/one.md'),
          namesTheSubject: result.stdout.includes('├─ input: stdin'),
        }).toEqual({ exitCode: 0, hitsTheRepo: false, namesTheSubject: true });
      });
      then('with stdin not a pipe at all, it is refused', () => {
        const result = runInTempGitRepo({
          files: TREE,
          stdin: 'ignore',
          grepsafeArgs: ['--pattern', KNOWN, '--from', '@stdin'],
        });
        expect({
          exitCode: result.exitCode,
          refused: result.stdout.includes(
            '--from @stdin was named, but no text was piped in',
          ),
        }).toEqual({ exitCode: 2, refused: true });
      });
      then('with stdin /dev/null and no --from, the files are searched', () => {
        const result = runInTempGitRepo({
          files: TREE,
          stdin: 'ignore',
          grepsafeArgs: ['--pattern', KNOWN, '--files-only'],
        });
        expect(result.stdout).toContain('a/one.md');
      });
      then('--from with any other value is refused', () => {
        const result = runInTempGitRepo({
          files: TREE,
          grepsafeArgs: ['--pattern', KNOWN, '--from', 'a/one.md'],
        });
        expect({
          exitCode: result.exitCode,
          refused: result.stdout.includes('--from takes @stdin only'),
        }).toEqual({ exitCode: 2, refused: true });
      });
    });

    when('[t6] 🟢 CONTROL — an empty pipe, no --from', () => {
      then(
        'the files are searched, as a harness that closes stdin needs',
        () => {
          const result = runInTempGitRepo({
            files: TREE,
            input: '',
            grepsafeArgs: ['--pattern', KNOWN, '--files-only'],
          });
          expect({
            exitCode: result.exitCode,
            hitsTheRepo: result.stdout.includes('a/one.md'),
            namesTheSubject: result.stdout.includes('input: stdin'),
          }).toEqual({
            exitCode: 0,
            hitsTheRepo: true,
            namesTheSubject: false,
          });
        },
      );
    });

    when('[t7] --tail keeps the last rows', () => {
      const result = useThen('the search runs', () =>
        runInTempGitRepo({
          files: TREE,
          grepsafeArgs: ['--pattern', KNOWN, '--files-only', '--tail', '1'],
        }),
      );
      then('the last file in path order, and the cut is named', () => {
        expect({
          exitCode: result.exitCode,
          last: result.stdout.includes('c/three.md'),
          first: result.stdout.includes('a/one.md'),
          tally: result.stdout.includes('├─ files: 3 (last 1)'),
        }).toEqual({ exitCode: 0, last: true, first: false, tally: true });
      });
      then('the tail cut is snapped', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t8] --tail meets a bad value, or --head', () => {
      then('each is refused, never reinterpreted', () => {
        const seen = [
          ['--tail', '0'],
          ['--tail', '-3'],
          ['--tail', '2', '--head', '2'],
        ].map((extra) => {
          const result = runInTempGitRepo({
            files: TREE,
            grepsafeArgs: ['--pattern', KNOWN, ...extra],
          });
          return {
            exitCode: result.exitCode,
            refused: /--tail must be|cannot be combined/.test(result.stdout),
          };
        });
        expect(seen).toEqual([
          { exitCode: 2, refused: true },
          { exitCode: 2, refused: true },
          { exitCode: 2, refused: true },
        ]);
      });
    });

    when('[t9] results come back, and a hidden file also holds a match', () => {
      const result = useThen('the search runs', () =>
        runInTempGitRepo({
          // one walked match, so the snapped rows hold no rg thread order
          files: {
            'a/one.md': `${KNOWN} one\n`,
            'b/.env.example': `${KNOWN} dotfile\n`,
            '.behavior/wish.md': `${KNOWN} dotdir\n`,
          },
          grepsafeArgs: ['--pattern', KNOWN, '--files-only'],
        }),
      );
      then('the partial answer says so beside its count', () => {
        expect({
          exitCode: result.exitCode,
          walked: result.stdout.includes('├─ files: 1'),
          skipped: result.stdout.includes(
            '├─ skipped: 2 hidden file(s) also hold a match',
          ),
          namesTheFix: result.stdout.includes(
            `grepsafe.sh --pattern '${KNOWN}' --path .behavior --path b/.env.example`,
          ),
        }).toEqual({
          exitCode: 0,
          walked: true,
          skipped: true,
          namesTheFix: true,
        });
      });
      then('the partial answer is snapped', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t10] the only match is a dot FILE in a visible dir', () => {
      then('the zero names the file itself as the path to reach', () => {
        const result = runInTempGitRepo({
          files: { 'b/.env.example': `${KNOWN}\n`, 'b/x.md': 'x\n' },
          grepsafeArgs: ['--pattern', KNOWN],
        });
        expect({
          zero: result.stdout.includes(
            'matches: 0 — none in the walked trees, but 1 hidden file(s) hold a match',
          ),
          namesTheFix: result.stdout.includes(
            `grepsafe.sh --pattern '${KNOWN}' --path b/.env.example`,
          ),
        }).toEqual({ zero: true, namesTheFix: true });
      });
    });

    when('[t11] a hidden root is also named as --path', () => {
      then('its matches were searched, so none reads as skipped', () => {
        const result = runInTempGitRepo({
          files: { ...TREE, '.hid/c.md': `${KNOWN}\n` },
          grepsafeArgs: [
            '--pattern',
            KNOWN,
            '--path',
            '.',
            '--path',
            '.hid',
            '--files-only',
          ],
        });
        expect({
          found: result.stdout.includes('.hid/c.md'),
          skipped: result.stdout.includes('skipped:'),
        }).toEqual({ found: true, skipped: false });
      });
    });

    when('[t12] 🟢 CONTROL — no hidden file holds a match', () => {
      then('results carry no skipped branch and no hint', () => {
        const result = runInTempGitRepo({
          files: { ...TREE, '.hid/c.md': 'x\n' },
          grepsafeArgs: ['--pattern', KNOWN, '--files-only'],
        });
        expect({
          skipped: result.stdout.includes('skipped:'),
          hint: result.stdout.includes('did you know?'),
        }).toEqual({ skipped: false, hint: false });
      });
    });

    // [t2] reaches the skill as a socket; a terminal caller hands a FIFO or a file
    const PIPED = `reef\n${KNOWN} piped\nshore\n`;
    const isPipeAnswer = (stdout: string) => ({
      hitsThePipe: stdout.includes(`2:${KNOWN} piped`),
      hitsTheRepo: stdout.includes('a/one.md'),
      namesTheSubject: stdout.includes('├─ input: stdin'),
    });

    when('[t13] text arrives through a shell pipe (a FIFO)', () => {
      then('the pipe is the subject, never the repo', () => {
        const result = runInTempGitRepo({
          files: TREE,
          input: PIPED,
          stdinVia: 'fifo',
          grepsafeArgs: ['--pattern', KNOWN],
        });
        expect({
          exitCode: result.exitCode,
          ...isPipeAnswer(result.stdout),
        }).toEqual({
          exitCode: 0,
          hitsThePipe: true,
          hitsTheRepo: false,
          namesTheSubject: true,
        });
      });
    });

    when('[t14] text arrives through a `<` redirect (a regular file)', () => {
      then('the file content is the subject, never the repo', () => {
        const result = runInTempGitRepo({
          files: TREE,
          input: PIPED,
          stdinVia: 'file',
          grepsafeArgs: ['--pattern', KNOWN],
        });
        expect({
          exitCode: result.exitCode,
          ...isPipeAnswer(result.stdout),
        }).toEqual({
          exitCode: 0,
          hitsThePipe: true,
          hitsTheRepo: false,
          namesTheSubject: true,
        });
      });
    });

    when('[t15] 🟢 CONTROL — an empty shell pipe', () => {
      then('the files are searched', () => {
        const result = runInTempGitRepo({
          files: TREE,
          input: '',
          stdinVia: 'fifo',
          grepsafeArgs: ['--pattern', KNOWN, '--files-only'],
        });
        expect({
          exitCode: result.exitCode,
          ...isPipeAnswer(result.stdout),
        }).toEqual({
          exitCode: 0,
          hitsThePipe: false,
          hitsTheRepo: true,
          namesTheSubject: false,
        });
      });
    });
  });
});
