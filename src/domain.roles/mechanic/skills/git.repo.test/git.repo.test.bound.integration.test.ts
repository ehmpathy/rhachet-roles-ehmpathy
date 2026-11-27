import { spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import { ConstraintError } from 'helpful-errors';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import { maskSpinnerTicks } from '../../../../.test/maskSpinnerTicks';

/**
 * .what = integration tests for the git.repo.test time bound: the 420s default,
 *         the "too slow" cut, the explicit --timeout, and the bound on every host
 * .why  = a suite past its bound holds a seat and a core; the cut must fire,
 *         say who owns the fix, free every process, and let an explicit bound win
 * .mock = a PATH shim named `timeout` that records its argv, then delegates to
 *         the real gnu timeout (optionally with a shorter duration); and, at one
 *         case, a `ps` shim that reports a foreign process group
 * .why  = the default bound is 420s; a test cannot wait 7 minutes. the timeout
 *         shim proves what the skill asks of the fuse; the real fuse still cuts the
 *         run. a host whose bash cannot give a job its own group cannot be summoned
 *         on demand, so the ps shim stands in for it
 * .real = the [case22] --timeout cases in git.repo.test.integration.test.ts run
 *         with no shim; [case5] and [case7] run the real fuse and real watchdog
 */
describe('git.repo.test.sh bound', () => {
  const scriptPath = path.join(__dirname, 'git.repo.test.sh');
  const opsPath = path.join(__dirname, 'git.repo.test.operations.sh');

  /**
   * .what = the path of a host tool, as this box finds it
   */
  const getToolPath = (input: { tool: string }): string =>
    spawnSync('bash', ['-c', `command -v ${input.tool}`], {
      encoding: 'utf-8',
    }).stdout.trim();

  /**
   * .what = a dir with a `timeout` shim that logs its argv to $SHIM_LOG
   * .note = when SHIM_BOUND is set, the shim swaps the duration for it, so a
   *         420s default can be made to fire in 1s with the real fuse
   */
  const genTimeoutShim = (): { bin: string; log: string } => {
    const bin = genTempDir({ slug: 'git-repo-test-bound-shim' });
    const log = path.join(bin, 'timeout.argv.log');
    const realTimeout = getToolPath({ tool: 'timeout' });

    // the shim delegates to the host's gnu timeout; a host with none cannot run it
    if (!realTimeout)
      throw new ConstraintError('these tests need gnu timeout on the host', {
        hint: 'on macos: brew install coreutils (then `timeout` is on PATH)',
      });
    fs.writeFileSync(
      path.join(bin, 'timeout'),
      [
        '#!/usr/bin/env bash',
        'echo "$*" >> "$SHIM_LOG"',
        'args=("$@")',
        'if [[ -n "${SHIM_BOUND:-}" ]]; then',
        '  for i in "${!args[@]}"; do',
        '    if [[ "${args[$i]}" =~ ^[0-9]+s$ ]]; then args[$i]="$SHIM_BOUND"; break; fi',
        '  done',
        'fi',
        `exec "${realTimeout}" "\${args[@]}"`,
        '',
      ].join('\n'),
    );
    fs.chmodSync(path.join(bin, 'timeout'), 0o755);
    return { bin, log };
  };

  /**
   * .what = a temp git repo on `main`, whose package.json holds these scripts,
   *         plus any other files the case needs (e.g. a jest config)
   */
  const genTempRepo = (input: {
    scripts: Record<string, string>;
    files?: Record<string, string>;
  }): string => {
    const tempDir = genTempDir({ slug: 'git-repo-test-bound', git: true });
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'test-repo', scripts: input.scripts }, null, 2),
    );
    Object.entries(input.files ?? {}).forEach(([name, content]) => {
      fs.mkdirSync(path.dirname(path.join(tempDir, name)), { recursive: true });
      fs.writeFileSync(path.join(tempDir, name), content);
    });

    // a fixture file under node_modules/.bin/ is a tool: make it executable
    Object.keys(input.files ?? {})
      .filter((name) => name.startsWith('node_modules/.bin/'))
      .forEach((name) => fs.chmodSync(path.join(tempDir, name), 0o755));
    spawnSync('git', ['add', '.'], { cwd: tempDir });
    spawnSync('git', ['commit', '-m', 'initial'], { cwd: tempDir });
    spawnSync('git', ['branch', '-M', 'main'], { cwd: tempDir });
    return tempDir;
  };

  /**
   * .what = run git.repo.test.sh in a temp git repo, optionally behind a shim
   */
  const runInTempGitRepo = (args: {
    scripts: Record<string, string>;
    files?: Record<string, string>;
    gitRepoTestArgs: string[];
    shim?: { bin: string; log: string; bound?: string };
    path?: string;
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempRepo({ scripts: args.scripts, files: args.files });

    const result = spawnSync('bash', [scriptPath, ...args.gitRepoTestArgs], {
      cwd: tempDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ...(args.shim
          ? {
              PATH: `${args.shim.bin}:${process.env.PATH}`,
              SHIM_LOG: args.shim.log,
              ...(args.shim.bound ? { SHIM_BOUND: args.shim.bound } : {}),
            }
          : {}),
        ...(args.path ? { PATH: args.path } : {}),
      },
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      tempDir,
    };
  };

  /**
   * .what = a bin dir that holds every tool on this box's PATH except the
   *         fuse tools (`timeout`, `gtimeout`), as a stock macos host would
   * .why  = the skill needs git, npm, node, and the rest; only the fuse is absent
   */
  const genPathWithoutFuseTools = (): string => {
    const bin = genTempDir({ slug: 'git-repo-test-bound-sans-fuse' });
    (process.env.PATH ?? '')
      .split(':')
      .filter((dir) => dir && fs.existsSync(dir))
      .forEach((dir) =>
        fs.readdirSync(dir).forEach((tool) => {
          if (tool === 'timeout' || tool === 'gtimeout') return;
          const target = path.join(bin, tool);
          if (fs.existsSync(target)) return;
          fs.symlinkSync(path.join(dir, tool), target);
        }),
      );
    return bin;
  };

  /**
   * .what = the argv lines the shim recorded, one per bounded run
   * .note = drops the fuse's capability probe (`--kill-after=1s 1s bash -c :`),
   *         which precedes each run and bounds no suite
   */
  const getShimCalls = (input: { log: string }): string[] =>
    fs.existsSync(input.log)
      ? fs
          .readFileSync(input.log, 'utf-8')
          .split('\n')
          .filter(Boolean)
          .filter((line) => line !== '--kill-after=1s 1s bash -c :')
      : [];

  /**
   * .what = the bound, in seconds, one recorded fuse call asked for
   */
  const getShimBound = (input: { call: string }): number =>
    Number(input.call.match(/(?:^| )(\d+)s /)?.[1] ?? 'NaN');

  /**
   * .what = whether any process on this box runs with these exact args
   */
  const isProcessAlive = (input: { args: string }): boolean =>
    spawnSync('ps', ['-eo', 'args'], { encoding: 'utf-8' })
      .stdout.split('\n')
      .some((line) => line.trim() === input.args);

  /**
   * .what = whether a process still runs once the box has had up to 3s to reap it
   * .why  = a killed child can linger an instant before the kernel reaps it; one
   *         read right after the cut would flake on a loaded box
   */
  const isProcessAliveAfterSettle = async (input: {
    args: string;
  }): Promise<boolean> => {
    const reads = Array.from({ length: 30 });
    for (const _read of reads) {
      if (!isProcessAlive(input)) return false;
      await new Promise((done) => setTimeout(done, 100));
    }
    return isProcessAlive(input);
  };

  /**
   * .what = sanitize output for snapshot stability
   */
  const sanitizeOutput = (input: { output: string }): string =>
    maskSpinnerTicks(input.output)
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z/g, 'ISOTIME')
      .replace(/\((\d+)s\)/g, '(Xs)')
      .replace(/\((\d{2,})\)/g, '(PID)') // a live process id, as in the watchdog fault
      .replace(/(^[^\n]*💤 inflight \(Xs\)\n)+/gm, '$1');

  given('[case1] a fast suite, no --timeout', () => {
    when('[t0] `rhx git.repo.test --what lint --mode apply` is run', () => {
      const result = useThen('it runs', async () => {
        const shim = genTimeoutShim();
        const run = runInTempGitRepo({
          scripts: { 'test:lint': 'echo "lint passed"' },
          gitRepoTestArgs: ['--what', 'lint', '--mode', 'apply'],
          shim,
        });
        return { run, calls: getShimCalls({ log: shim.log }) };
      });

      then('the fuse is asked for the 420s default bound', () => {
        expect(result.calls).toHaveLength(1);
        expect(result.calls[0]).toMatch(/(^| )420s /);
      });

      then('the bound shows before the run', () => {
        expect(result.run.stdout).toContain('bound: 420s (default)');
        expect(result.run.stdout.indexOf('bound: 420s (default)')).toBeLessThan(
          result.run.stdout.indexOf('inflight'),
        );
      });

      then('it passes as before: exit 0, no cut', () => {
        expect(result.run.exitCode).toBe(0);
        expect(result.run.stdout).toContain('🎉 passed');
        expect(result.run.stdout).not.toContain('too slow');
      });

      then('output matches snapshot', () => {
        expect(sanitizeOutput({ output: result.run.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case2] a slow suite, no --timeout', () => {
    when(
      '[t0] the 420s default fires (shim shortens it to 1s for the test)',
      () => {
        const result = useThen('it runs', async () => {
          const shim = genTimeoutShim();
          const run = runInTempGitRepo({
            scripts: { 'test:lint': 'sleep 20' },
            gitRepoTestArgs: ['--what', 'lint', '--mode', 'apply'],
            shim: { ...shim, bound: '1s' },
          });
          return { run, calls: getShimCalls({ log: shim.log }) };
        });

        then('the skill asked for 420s', () => {
          expect(result.calls[0]).toMatch(/(^| )420s /);
        });

        then("exit 2: the slow suite is the caller's to fix", () => {
          expect(result.run.exitCode).toBe(2);
        });

        then('stdout says woah, too slow, and names the default bound', () => {
          expect(result.run.stdout).toContain('⏱️ too slow');
          expect(result.run.stdout).toContain(
            'woah, too slow — past the 420s bound (default)',
          );
        });

        then('stdout names the owner and the next moves', () => {
          expect(result.run.stdout).toContain(
            'this speed defect is yours to root cause',
          );
          expect(result.run.stdout).toContain('🥥 did you know?');
          expect(result.run.stdout).toContain('find why the lint tool is slow');
          expect(result.run.stdout).toContain(
            'time the tool alone: npm run test:lint',
          );
          expect(result.run.stdout).not.toContain('bisect it');
          expect(result.run.stdout).toContain(
            'no call may run past 420s: make the suite fast, never the bound wide',
          );
        });

        then('stderr carries the cut too, with its header', () => {
          expect(result.run.stderr).toContain('🐢 woah, too slow...');
          expect(result.run.stderr).toContain(
            'this speed defect is yours to root cause',
          );
        });

        then('the logs are persisted', () => {
          const logDir = path.join(
            result.run.tempDir,
            '.log/role=mechanic/skill=git.repo.test/what=lint',
          );
          const logs = fs
            .readdirSync(logDir)
            .filter((file) => file.endsWith('.log'));
          expect(logs.length).toBe(2);
        });

        then('stdout matches snapshot', () => {
          expect(
            sanitizeOutput({ output: result.run.stdout }),
          ).toMatchSnapshot();
        });

        then('stderr matches snapshot', () => {
          expect(
            sanitizeOutput({ output: result.run.stderr }),
          ).toMatchSnapshot();
        });
      },
    );
  });

  given('[case3] an explicit --timeout', () => {
    when('[t0] --timeout 7 on a single type', () => {
      const result = useThen('it runs', async () => {
        const shim = genTimeoutShim();
        const run = runInTempGitRepo({
          scripts: { 'test:lint': 'echo ok' },
          gitRepoTestArgs: [
            '--what',
            'lint',
            '--mode',
            'apply',
            '--timeout',
            '7',
          ],
          shim,
        });
        return { run, calls: getShimCalls({ log: shim.log }) };
      });

      then('the explicit bound replaces the default', () => {
        expect(result.calls[0]).toMatch(/(^| )7s /);
        expect(result.calls[0]).not.toMatch(/(^| )420s /);
        expect(result.run.stdout).toContain('bound: 7s (--timeout)');
      });

      then('the tree header echoes the explicit bound', () => {
        expect(result.run.stdout).toContain(
          'git.repo.test --what lint --mode apply --timeout 7',
        );
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput({ output: result.run.stdout })).toMatchSnapshot();
      });
    });

    when('[t1] --timeout=7, the attached form', () => {
      const result = useThen('it runs', async () => {
        const shim = genTimeoutShim();
        const run = runInTempGitRepo({
          scripts: { 'test:lint': 'echo ok' },
          gitRepoTestArgs: ['--what', 'lint', '--timeout=7'],
          shim,
        });
        return { run, calls: getShimCalls({ log: shim.log }) };
      });

      then('it reads as --timeout 7', () => {
        expect(result.run.exitCode).toBe(0);
        expect(result.calls[0]).toMatch(/(^| )7s /);
        expect(result.run.stdout).toContain('bound: 7s (--timeout)');
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput({ output: result.run.stdout })).toMatchSnapshot();
      });
    });

    when('[t2] --timeout 7 with --what lint,format (multi-mode)', () => {
      const result = useThen('it runs', async () => {
        const shim = genTimeoutShim();
        const run = runInTempGitRepo({
          scripts: { 'test:lint': 'echo ok', 'test:format': 'echo ok' },
          gitRepoTestArgs: ['--what', 'lint,format', '--timeout', '7'],
          shim,
        });
        return { run, calls: getShimCalls({ log: shim.log }) };
      });

      then(
        'each child runs under what is left of the explicit bound, never more',
        () => {
          expect(result.run.exitCode).toBe(0);
          expect(result.calls).toHaveLength(2);
          expect(result.calls[0]).toMatch(/(^| )7s /);
          const second = getShimBound({ call: result.calls[1]! });
          expect(second).toBeGreaterThan(0);
          expect(second).toBeLessThanOrEqual(7);
        },
      );

      then('the bound reads as one for the whole call', () => {
        expect(result.run.stdout).toContain(
          'bound: 7s (--timeout), for the whole call, 2 of 2 types run',
        );
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput({ output: result.run.stdout })).toMatchSnapshot();
      });
    });

    when('[t3] no --timeout with --what lint,format (multi-mode)', () => {
      const result = useThen('it runs', async () => {
        const shim = genTimeoutShim();
        const run = runInTempGitRepo({
          scripts: { 'test:lint': 'echo ok', 'test:format': 'echo ok' },
          gitRepoTestArgs: ['--what', 'lint,format'],
          shim,
        });
        return { run, calls: getShimCalls({ log: shim.log }) };
      });

      then('the two children share the one 420s default', () => {
        expect(result.calls).toHaveLength(2);
        result.calls.forEach((call) => {
          const bound = getShimBound({ call });
          expect(bound).toBeGreaterThan(400);
          expect(bound).toBeLessThanOrEqual(420);
        });
      });

      then(
        'the caller is told the run-wide clock: the bound, plus slack per type',
        () => {
          expect(result.run.stdout).toContain(
            'bound: 420s (default), for the whole call, 2 of 2 types run',
          );
          expect(result.run.stdout).toContain(
            'let your shell call run past 480s, or its own clock ends this run first',
          );
          expect(result.run.stdout).not.toContain('run past 900s');
        },
      );

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput({ output: result.run.stdout })).toMatchSnapshot();
      });
    });

    when('[t4] multi-mode where the first type is cut short', () => {
      const result = useThen('it runs', async () => {
        const shim = genTimeoutShim();
        const run = runInTempGitRepo({
          scripts: { 'test:lint': 'sleep 20', 'test:format': 'echo ok' },
          gitRepoTestArgs: ['--what', 'lint,format', '--timeout', '1'],
          shim,
        });
        return { run, calls: getShimCalls({ log: shim.log }) };
      });

      then('the parent stops at the cut and returns its exit 2', () => {
        expect(result.run.exitCode).toBe(2);
        expect(result.run.stdout).toContain(
          'woah, too slow — past the 1s bound (--timeout)',
        );
        expect(result.calls).toHaveLength(1);
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput({ output: result.run.stdout })).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput({ output: result.run.stderr })).toMatchSnapshot();
      });
    });

    when(
      '[t5] multi-mode in plan mode, where a jest type only previews',
      () => {
        const result = useThen('it runs', async () =>
          runInTempGitRepo({
            scripts: { 'test:lint': 'echo ok', 'test:unit': 'echo ran' },
            files: {
              'jest.unit.config.js':
                "module.exports = { testMatch: ['**/*.test.js'] };\n",
              // the preview lists files through jest; a stub stands in for it
              'node_modules/.bin/jest':
                '#!/usr/bin/env bash\necho "$PWD/src/a.test.js"\n',
            },
            gitRepoTestArgs: ['--what', 'lint,unit'],
          }),
        );

        then('the clock figure counts only the type that runs a suite', () => {
          expect(result.stdout).toContain(
            'bound: 420s (default), for the whole call, 1 of 2 types run',
          );
          expect(result.stdout).toContain(
            'let your shell call run past 450s, or its own clock ends this run first',
          );
          expect(result.stdout).not.toContain('run past 480s');
        });

        then('stdout matches snapshot', () => {
          expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
        });
      },
    );

    when(
      '[t6] multi-mode with no --timeout, where the first type outlasts the default (c5)',
      () => {
        const result = useThen('it runs', async () => {
          const shim = genTimeoutShim();
          const run = runInTempGitRepo({
            scripts: { 'test:lint': 'sleep 20', 'test:format': 'echo ok' },
            gitRepoTestArgs: ['--what', 'lint,format'],
            shim: { ...shim, bound: '1s' },
          });
          return { run, calls: getShimCalls({ log: shim.log }) };
        });

        then('the child runs under the 420s default and is cut there', () => {
          expect(result.calls).toHaveLength(1);
          expect(getShimBound({ call: result.calls[0]! })).toBeGreaterThan(400);
          expect(result.run.exitCode).toBe(2);
          expect(result.run.stdout).toContain(
            'woah, too slow — past the 420s bound (default), for the whole call',
          );
        });

        then('the parent stops there: the second type never runs', () => {
          expect(result.run.stdout).not.toContain('--what format');
        });

        then('stdout matches snapshot', () => {
          expect(
            sanitizeOutput({ output: result.run.stdout }),
          ).toMatchSnapshot();
        });
      },
    );
  });

  given('[case4] a --timeout the skill cannot read', () => {
    const cases: Array<{ label: string; mode: string; timeoutArgs: string[] }> =
      [
        { label: '5m', mode: 'apply', timeoutArgs: ['--timeout', '5m'] },
        { label: '0', mode: 'apply', timeoutArgs: ['--timeout', '0'] },
        { label: 'abc', mode: 'apply', timeoutArgs: ['--timeout', 'abc'] },
        { label: '5m', mode: 'plan', timeoutArgs: ['--timeout', '5m'] },
        { label: '(no value)', mode: 'apply', timeoutArgs: ['--timeout'] },
        {
          label: '(followed by another flag)',
          mode: 'apply',
          timeoutArgs: ['--timeout', '--resnap'],
        },
        { label: '420s', mode: 'apply', timeoutArgs: ['--timeout', '420s'] },
        { label: '1.5', mode: 'apply', timeoutArgs: ['--timeout', '1.5'] },
        { label: '007', mode: 'apply', timeoutArgs: ['--timeout', '007'] },
        { label: '-5', mode: 'apply', timeoutArgs: ['--timeout', '-5'] },
        { label: '=-5', mode: 'apply', timeoutArgs: ['--timeout=-5'] },
      ];
    cases.forEach(({ label, mode, timeoutArgs }, index) => {
      when(`[t${index}] --timeout ${label} --mode ${mode}`, () => {
        const result = useThen('it runs', async () => {
          const shim = genTimeoutShim();
          const run = runInTempGitRepo({
            scripts: { 'test:lint': 'echo ran > ran.marker' },
            gitRepoTestArgs: ['--what', 'lint', '--mode', mode, ...timeoutArgs],
            shim,
          });
          return { run, calls: getShimCalls({ log: shim.log }) };
        });

        then('it stops at parse with exit 2 and names the valid shape', () => {
          expect(result.run.exitCode).toBe(2);
          expect(result.run.stdout).toContain(
            '✋ ConstraintError: --timeout must be whole seconds, e.g. --timeout 120',
          );
          expect(result.run.stderr).toContain(
            '--timeout must be whole seconds',
          );
        });

        then('no suite runs', () => {
          expect(result.calls).toHaveLength(0);
          expect(
            fs.existsSync(path.join(result.run.tempDir, 'ran.marker')),
          ).toBe(false);
        });

        then('stdout matches snapshot', () => {
          expect(result.run.stdout).toMatchSnapshot();
        });

        then('stderr matches snapshot', () => {
          expect(result.run.stderr).toMatchSnapshot();
        });
      });
    });

    when('[t11] --timeout 5m with --what lint,format (multi-mode)', () => {
      const result = useThen('it runs', async () => {
        const shim = genTimeoutShim();
        const run = runInTempGitRepo({
          scripts: {
            'test:lint': 'echo ran > lint.marker',
            'test:format': 'echo ran > format.marker',
          },
          gitRepoTestArgs: ['--what', 'lint,format', '--timeout', '5m'],
          shim,
        });
        return { run, calls: getShimCalls({ log: shim.log }) };
      });

      then('the parent stops at parse with exit 2, before any child', () => {
        expect(result.run.exitCode).toBe(2);
        expect(result.run.stdout).toContain(
          '✋ ConstraintError: --timeout must be whole seconds',
        );
        expect(result.run.stdout).not.toContain('lets ride');
      });

      then('no child suite runs', () => {
        expect(result.calls).toHaveLength(0);
        ['lint.marker', 'format.marker'].forEach((marker) =>
          expect(fs.existsSync(path.join(result.run.tempDir, marker))).toBe(
            false,
          ),
        );
      });

      then('stdout matches snapshot', () => {
        expect(result.run.stdout).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(result.run.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case17] a --timeout past the 420s max', () => {
    const cases: Array<{ label: string; what: string }> = [
      { label: '421', what: 'lint' },
      { label: '480', what: 'lint' },
      { label: '900', what: 'lint,format' },
    ];
    cases.forEach(({ label, what }, index) => {
      when(`[t${index}] --timeout ${label} --what ${what}`, () => {
        const result = useThen('it runs', async () => {
          const shim = genTimeoutShim();
          const run = runInTempGitRepo({
            scripts: {
              'test:lint': 'echo ran > lint.marker',
              'test:format': 'echo ran > format.marker',
            },
            gitRepoTestArgs: [
              '--what',
              what,
              '--mode',
              'apply',
              '--timeout',
              label,
            ],
            shim,
          });
          return { run, calls: getShimCalls({ log: shim.log }) };
        });

        then(
          'it is refused at parse with exit 2, and told to fix its speed',
          () => {
            expect(result.run.exitCode).toBe(2);
            expect(result.run.stdout).toContain(
              `✋ ConstraintError: --timeout ${label} is past the 420s max for any call`,
            );
            expect(result.run.stdout).toContain(
              'a suite that needs more is too slow: fix its speed, never its bound',
            );
            expect(result.run.stderr).toContain('past the 420s max');
            expect(result.run.stdout).not.toContain('lets ride');
          },
        );

        then('no suite runs', () => {
          expect(result.calls).toHaveLength(0);
          ['lint.marker', 'format.marker'].forEach((marker) =>
            expect(fs.existsSync(path.join(result.run.tempDir, marker))).toBe(
              false,
            ),
          );
        });

        then('stdout matches snapshot', () => {
          expect(result.run.stdout).toMatchSnapshot();
        });
      });
    });

    when('[t3] --timeout 420, the max itself', () => {
      const result = useThen('it runs', async () => {
        const shim = genTimeoutShim();
        const run = runInTempGitRepo({
          scripts: { 'test:lint': 'echo ok' },
          gitRepoTestArgs: ['--what', 'lint', '--timeout', '420'],
          shim,
        });
        return { run, calls: getShimCalls({ log: shim.log }) };
      });

      then('it runs under the 420s bound', () => {
        expect(result.run.exitCode).toBe(0);
        expect(result.calls[0]).toMatch(/(^| )420s /);
      });
    });
  });

  given(
    '[case18] a multi-mode call whose first type spends part of the bound',
    () => {
      when('[t0] --what lint,format --timeout 6, lint takes 3s', () => {
        const result = useThen('it runs', async () => {
          const shim = genTimeoutShim();
          const run = runInTempGitRepo({
            scripts: { 'test:lint': 'sleep 3', 'test:format': 'echo ok' },
            gitRepoTestArgs: ['--what', 'lint,format', '--timeout', '6'],
            shim,
          });
          return { run, calls: getShimCalls({ log: shim.log }) };
        });

        then('the second type runs under only what the first left', () => {
          expect(result.run.exitCode).toBe(0);
          expect(result.calls).toHaveLength(2);
          expect(result.calls[0]).toMatch(/(^| )6s /);
          const second = getShimBound({ call: result.calls[1]! });
          expect(second).toBeGreaterThan(0);
          expect(second).toBeLessThanOrEqual(3);
        });
      });
    },
  );

  given('[case5] a slow suite that spawns its own children', () => {
    when('[t0] the bound fires under gnu timeout', () => {
      const result = useThen('it runs', async () => {
        const marker = 'sleep 47.31';
        const run = runInTempGitRepo({
          scripts: { 'test:lint': `${marker} & ${marker}` },
          gitRepoTestArgs: ['--what', 'lint', '--timeout', '1'],
        });
        return {
          run,
          alive: await isProcessAliveAfterSettle({ args: marker }),
        };
      });

      then('it is cut short with exit 2', () => {
        expect(result.run.exitCode).toBe(2);
      });

      then('no process of the suite outlives the cut', () => {
        expect(result.alive).toBe(false);
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput({ output: result.run.stdout })).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput({ output: result.run.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case6] a slow jest suite under --resnap, cut mid-output', () => {
    when(
      '[t0] the bound fires after the suite printed partial jest output',
      () => {
        const result = useThen('it runs', async () => {
          // a unit suite that has printed one file and a "No tests found" line, then
          // hangs: the cut must read as "too slow", never as "no tests" (exit 0)
          const tempDir = genTempDir({
            slug: 'git-repo-test-bound-jest',
            git: true,
          });
          fs.writeFileSync(
            path.join(tempDir, 'package.json'),
            JSON.stringify(
              {
                name: 'test-repo',
                scripts: {
                  // .note = the phrase is built, not written whole: a failed test's
                  //         code frame would print it, and the outer skill run that
                  //         hosts this suite greps its own output for that phrase
                  'test:unit': `echo "PASS src/a.test.js"; echo "${['No', 'tests', 'found'].join(' ')}"; sleep 20`,
                },
              },
              null,
              2,
            ),
          );
          fs.writeFileSync(
            path.join(tempDir, 'jest.unit.config.js'),
            "module.exports = { testMatch: ['**/*.test.js'] };\n",
          );
          spawnSync('git', ['add', '.'], { cwd: tempDir });
          spawnSync('git', ['commit', '-m', 'initial'], { cwd: tempDir });
          spawnSync('git', ['branch', '-M', 'main'], { cwd: tempDir });
          const run = spawnSync(
            'bash',
            [
              scriptPath,
              '--what',
              'unit',
              '--mode',
              'apply',
              '--timeout',
              '1',
              '--resnap',
            ],
            { cwd: tempDir, encoding: 'utf-8' },
          );
          return {
            exitCode: run.status ?? 1,
            stdout: run.stdout ?? '',
            stderr: run.stderr ?? '',
          };
        });

        then('the cut wins over the partial "No tests found": exit 2', () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('⏱️ too slow');
          expect(result.stdout).not.toContain('no tests to run');
        });

        then(
          'the jest lessons show: bisect with --scope, partial snapshots',
          () => {
            expect(result.stdout).toContain(
              'or bisect it: rerun with --scope over half the files',
            );
            expect(result.stdout).toContain(
              'snapshots may be partly written: rerun --resnap once the suite is fast',
            );
          },
        );

        then('stdout matches snapshot', () => {
          expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
        });

        then('stderr matches snapshot', () => {
          expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
        });
      },
    );
  });

  given('[case7] a host with no gnu timeout (as stock macos)', () => {
    /**
     * .what = a PATH with the base tools a mac has, and no timeout or gtimeout
     */
    const genPathWithoutFuse = (): string => {
      const bin = genTempDir({ slug: 'git-repo-test-bound-no-fuse' });
      ['bash', 'sleep', 'date', 'mktemp', 'touch', 'rm', 'ps', 'tr'].forEach(
        (tool) => {
          fs.symlinkSync(getToolPath({ tool }), path.join(bin, tool));
        },
      );
      return bin;
    };

    /**
     * .what = run a bash snippet with the bound operations sourced
     */
    const runOps = (input: {
      snippet: string;
      path: string | null;
    }): { stdout: string; stderr: string; status: number; ms: number } => {
      const began = Date.now();
      const result = spawnSync(
        '/bin/bash',
        ['-c', `source "${opsPath}"\n${input.snippet}`],
        {
          encoding: 'utf-8',
          env: {
            ...process.env,
            ...(input.path ? { PATH: input.path } : {}),
          },
        },
      );
      return {
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
        status: result.status ?? 1,
        ms: Date.now() - began,
      };
    };

    when('[t0] the fuse lookup runs', () => {
      then('it falls back to the watchdog', () => {
        const result = runOps({
          path: genPathWithoutFuse(),
          snippet: 'get_bound_fuse',
        });
        expect(result.stdout.trim()).toEqual('watchdog');
      });
    });

    when('[t1] a run that spawns children outlasts its bound', () => {
      const result = useThen('it runs', async () => {
        const marker = 'sleep 47.32';
        const run = runOps({
          path: genPathWithoutFuse(),
          snippet: `command -v timeout && exit 9; run_bounded 1 bash -c '${marker} & ${marker}'; echo "rc=$? outcome=$BOUND_OUTCOME"`,
        });
        return {
          run,
          alive: await isProcessAliveAfterSettle({ args: marker }),
        };
      });

      then('the watchdog cuts it at the bound: 124, fired', () => {
        expect(result.run.stdout).toContain('rc=124 outcome=fired');
      });

      then(
        'it returns soon after the 1s bound, not after the 47s sleep',
        () => {
          expect(result.run.ms).toBeLessThan(20_000);
        },
      );

      then('no child outlives the cut', () => {
        expect(result.alive).toBe(false);
      });
    });

    when('[t2] a run ends inside its bound', () => {
      const result = useThen('it runs', async () =>
        runOps({
          path: genPathWithoutFuse(),
          snippet:
            'run_bounded 60 bash -c "exit 3"; echo "rc=$? outcome=$BOUND_OUTCOME"',
        }),
      );

      then('its own exit code passes through, not fired', () => {
        expect(result.stdout).toContain('rc=3 outcome=ended');
      });

      then('it returns once the run ends, not at the 60s bound', () => {
        expect(result.ms).toBeLessThan(30_000);
      });
    });

    when('[t3] a suite that exits 124 by itself, inside its bound', () => {
      then('it is not read as a cut', () => {
        const result = runOps({
          path: genPathWithoutFuse(),
          snippet:
            'run_bounded 60 bash -c "exit 124"; echo "rc=$? outcome=$BOUND_OUTCOME"',
        });
        expect(result.stdout).toContain('rc=124 outcome=ended');
      });
    });

    when('[t4] the run does not get its own process group', () => {
      const result = useThen('it runs', async () => {
        const bin = genPathWithoutFuse();
        // the ps shim reports a foreign group, as a host whose bash ignored set -m
        fs.rmSync(path.join(bin, 'ps'));
        fs.writeFileSync(path.join(bin, 'ps'), '#!/bin/sh\necho 1\n');
        fs.chmodSync(path.join(bin, 'ps'), 0o755);
        const marker = 'sleep 47.34';
        const run = runOps({
          path: bin,
          snippet: `run_bounded 60 ${marker}; echo "rc=$? outcome=$BOUND_OUTCOME"`,
        });
        return {
          run,
          alive: await isProcessAliveAfterSettle({ args: marker }),
        };
      });

      then('it fails loud as a malfunction, never a false cut', () => {
        expect(result.run.stdout).toContain('rc=1 outcome=broken');
        expect(result.run.stderr).toContain(
          '💥 MalfunctionError: the bound could not take hold of the run',
        );
      });

      then('the run it could not bound is stopped, not left to run', () => {
        expect(result.alive).toBe(false);
      });
    });
  });

  given('[case8] a suite that exits 124 by itself, inside its bound', () => {
    when('[t0] under gnu timeout', () => {
      then('it is not read as a cut', () => {
        const result = spawnSync(
          '/bin/bash',
          [
            '-c',
            `source "${opsPath}"\nrun_bounded 30 bash -c "exit 124"; echo "rc=$? outcome=$BOUND_OUTCOME"`,
          ],
          { encoding: 'utf-8' },
        );
        expect(result.stdout).toContain('rc=124 outcome=ended');
      });
    });
  });

  given('[case9] a slow suite run by a stop hook', () => {
    when('[t0] --when hook.onStop with a 1s bound', () => {
      const result = useThen('it runs', async () =>
        runInTempGitRepo({
          scripts: { 'test:lint': 'sleep 20' },
          gitRepoTestArgs: [
            '--what',
            'lint',
            '--when',
            'hook.onStop',
            '--timeout',
            '1',
          ],
        }),
      );

      then('it is cut short with exit 2, which blocks the stop', () => {
        expect(result.exitCode).toBe(2);
      });

      then('the stop hook sees the same too-slow lesson', () => {
        expect(result.stdout).toContain(
          'woah, too slow — past the 1s bound (--timeout)',
        );
        expect(result.stderr).toContain(
          'this speed defect is yours to root cause',
        );
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
      });
    });
  });

  given(
    '[case10] a host with gtimeout and no timeout (macos + coreutils)',
    () => {
      /**
       * .what = a PATH whose only fuse is `gtimeout` (the real gnu binary, renamed)
       */
      const genPathWithGtimeout = (): string => {
        const bin = genTempDir({ slug: 'git-repo-test-bound-gtimeout' });
        ['bash', 'sleep', 'date', 'mktemp', 'touch', 'rm', 'cat'].forEach(
          (tool) => {
            fs.symlinkSync(getToolPath({ tool }), path.join(bin, tool));
          },
        );
        fs.symlinkSync(
          getToolPath({ tool: 'timeout' }),
          path.join(bin, 'gtimeout'),
        );
        return bin;
      };

      when('[t0] a run outlasts its bound', () => {
        const result = useThen('it runs', async () => {
          const bin = genPathWithGtimeout();
          return spawnSync(
            '/bin/bash',
            [
              '-c',
              `source "${opsPath}"\necho "fuse=$(get_bound_fuse)"; run_bounded 1 sleep 20; echo "rc=$? outcome=$BOUND_OUTCOME"`,
            ],
            { encoding: 'utf-8', env: { ...process.env, PATH: bin } },
          );
        });

        then('the lookup picks gtimeout', () => {
          expect(result.stdout).toContain('fuse=gtimeout');
        });

        then('gtimeout cuts it at the bound: 124, fired', () => {
          expect(result.stdout).toContain('rc=124 outcome=fired');
        });
      });
    },
  );

  given('[case11] a fuse that cannot run the suite', () => {
    /**
     * .what = a `timeout` shim that passes the capability probe, then fails
     *         before it runs aught, as a fuse that cannot exec its command
     */
    const genBrokenTimeoutShim = (): { bin: string; log: string } => {
      const bin = genTempDir({ slug: 'git-repo-test-bound-broken' });
      const log = path.join(bin, 'timeout.argv.log');
      fs.writeFileSync(
        path.join(bin, 'timeout'),
        [
          '#!/usr/bin/env bash',
          'echo "$*" >> "$SHIM_LOG"',
          '[[ "$*" == "--kill-after=1s 1s bash -c :" ]] && exit 0',
          'exit 125',
          '',
        ].join('\n'),
      );
      fs.chmodSync(path.join(bin, 'timeout'), 0o755);
      return { bin, log };
    };

    when('[t0] the skill runs a suite through it', () => {
      const result = useThen('it runs', async () =>
        runInTempGitRepo({
          scripts: { 'test:lint': 'echo ran > ran.marker' },
          gitRepoTestArgs: ['--what', 'lint'],
          shim: genBrokenTimeoutShim(),
        }),
      );

      then('it exits 1: a malfunction, never a red suite', () => {
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('💥 malfunction');
        expect(result.stdout).not.toContain('too slow');
      });

      then('it names the fuse as the fault', () => {
        expect(result.stdout).toContain(
          '💥 MalfunctionError: the bound could not run the suite',
        );
      });

      then('the suite never ran', () => {
        expect(fs.existsSync(path.join(result.tempDir, 'ran.marker'))).toBe(
          false,
        );
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case12] the skill is stopped mid-run', () => {
    /**
     * .what = start the skill on a slow suite, stop it with a signal once the
     *         suite runs, and report how it ended and whether the suite survived
     */
    const runAndStop = async (input: {
      signal: 'SIGINT' | 'SIGTERM' | 'SIGHUP';
      marker: string;
      what: string;
      timeout: string;
      path: string | null;
      files?: Record<string, string>;
      args?: string[];
    }): Promise<{
      exitCode: number | null;
      alive: boolean;
      stdout: string;
      stderr: string;
    }> => {
      const tempDir = genTempRepo({
        scripts: {
          'test:lint': `${input.marker} & ${input.marker}`,
          'test:format': 'echo ok',
          'test:unit': 'echo ok',
        },
        files: input.files,
      });
      const child = spawn(
        'bash',
        [
          scriptPath,
          '--what',
          input.what,
          '--timeout',
          input.timeout,
          ...(input.args ?? []),
        ],
        {
          cwd: tempDir,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: {
            ...process.env,
            ...(input.path ? { PATH: input.path } : {}),
          },
        },
      );
      const chunks: string[] = [];
      child.stdout?.on('data', (chunk) => chunks.push(String(chunk)));
      const chunksErr: string[] = [];
      child.stderr?.on('data', (chunk) => chunksErr.push(String(chunk)));

      // wait until the suite runs, then stop the skill alone (not its group)
      const reads = Array.from({ length: 100 });
      for (const _read of reads) {
        if (isProcessAlive({ args: input.marker })) break;
        await new Promise((done) => setTimeout(done, 100));
      }
      const ended = new Promise<number | null>((done) =>
        child.on('close', (code) => done(code)),
      );
      child.kill(input.signal);
      const exitCode = await ended;
      return {
        exitCode,
        alive: await isProcessAliveAfterSettle({ args: input.marker }),
        stdout: chunks.join(''),
        stderr: chunksErr.join(''),
      };
    };

    when('[t0] SIGINT, as a ctrl-c', () => {
      const result = useThen('it runs', async () =>
        runAndStop({
          signal: 'SIGINT',
          marker: 'sleep 47.36',
          what: 'lint',
          timeout: '60',
          path: null,
        }),
      );

      then('the skill exits 130', () => {
        expect(result.exitCode).toBe(130);
      });

      then('the suite stops with it, not at the 60s bound', () => {
        expect(result.alive).toBe(false);
      });

      then('the partial log is kept, and its path named', () => {
        expect(result.stdout).toContain('│  └─ 🌙 stopped by the caller');
        expect(result.stdout).toMatch(
          /🌙 stopped by the caller\n {3}└─ log\n {6}├─ stdout: /,
        );
        expect(result.stdout).toContain(
          'stdout: .log/role=mechanic/skill=git.repo.test/what=lint/',
        );
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });

      then('stderr carries the whole frame, header first', () => {
        expect(result.stderr).toContain('🐢 bummer dude...');
        expect(result.stderr).toContain('│  └─ 🌙 stopped by the caller');
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
      });
    });

    when('[t1] SIGTERM, as a harness kill', () => {
      const result = useThen('it runs', async () =>
        runAndStop({
          signal: 'SIGTERM',
          marker: 'sleep 47.37',
          what: 'lint',
          timeout: '60',
          path: null,
        }),
      );

      then('the skill exits 143', () => {
        expect(result.exitCode).toBe(143);
      });

      then('the suite stops with it, not at the 60s bound', () => {
        expect(result.alive).toBe(false);
      });
    });

    when('[t2] SIGTERM to a multi-type run (--what lint,format)', () => {
      const result = useThen('it runs', async () =>
        runAndStop({
          signal: 'SIGTERM',
          marker: 'sleep 47.38',
          what: 'lint,format',
          timeout: '60',
          path: null,
        }),
      );

      then('the parent forwards the abort: exit 143', () => {
        expect(result.exitCode).toBe(143);
      });

      then("the child's suite stops too, not at the 60s bound", () => {
        expect(result.alive).toBe(false);
      });

      then('the in-flight child closes its status tree on the stop', () => {
        expect(result.stdout).toContain('│  └─ 🌙 stopped by the caller');
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
      });
    });

    when('[t3] SIGTERM on a host with no fuse tool (the watchdog path)', () => {
      const result = useThen('it runs', async () => {
        const run = await runAndStop({
          signal: 'SIGTERM',
          marker: 'sleep 47.39',
          what: 'lint',
          timeout: '61',
          path: genPathWithoutFuseTools(),
        });
        return {
          ...run,
          watchdogAlive: await isProcessAliveAfterSettle({ args: 'sleep 61' }),
        };
      });

      then('the suite stops with the skill', () => {
        expect(result.exitCode).toBe(143);
        expect(result.alive).toBe(false);
      });

      then(
        'the watchdog stops too, so it can never signal a stale group',
        () => {
          expect(result.watchdogAlive).toBe(false);
        },
      );
    });

    when(
      '[t4] SIGTERM in the scope preview, before the status tree opens',
      () => {
        // .note = the preview's `jest --listTests` is a slow shim; bash runs the
        //         trap once that call returns, so the stop lands before the run
        const result = useThen('it runs', async () =>
          runAndStop({
            signal: 'SIGTERM',
            marker: 'sleep 3.21',
            what: 'unit',
            timeout: '60',
            path: null,
            files: {
              'jest.unit.config.js':
                "module.exports = { testMatch: ['**/*.test.js'] };\n",
              'node_modules/.bin/jest':
                '#!/usr/bin/env bash\nsleep 3.21\necho "$PWD/src/a.test.js"\n',
            },
            args: ['--scope', 'a', '--mode', 'apply'],
          }),
        );

        then('the skill exits 143', () => {
          expect(result.exitCode).toBe(143);
        });

        then('the stop closes the open tree, with the log paths', () => {
          expect(result.stdout).toContain(
            '└─ 🌙 stopped by the caller, before the run began',
          );
          expect(result.stdout).not.toContain('├─ status');
        });

        then('stdout matches snapshot', () => {
          expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
        });

        then('stderr matches snapshot', () => {
          expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
        });
      },
    );
  });

  given(
    '[case16] a fuse that cannot take hold of or mark the run, through the skill',
    () => {
      when('[t0] the watchdog run does not get its own process group', () => {
        const result = useThen('it runs', async () => {
          // a host with no fuse tool, whose `ps` reports a foreign group
          const bin = genPathWithoutFuseTools();
          fs.rmSync(path.join(bin, 'ps'));
          fs.writeFileSync(path.join(bin, 'ps'), '#!/bin/sh\necho 1\n');
          fs.chmodSync(path.join(bin, 'ps'), 0o755);
          return runInTempGitRepo({
            scripts: { 'test:lint': 'echo ran' },
            gitRepoTestArgs: ['--what', 'lint'],
            path: bin,
          });
        });

        then('it exits 1: a malfunction, never a cut', () => {
          expect(result.exitCode).toBe(1);
          expect(result.stdout).not.toContain('too slow');
        });

        then('both streams name the fault', () => {
          expect(result.stdout).toContain(
            '💥 MalfunctionError: the bound could not take hold of the run',
          );
          expect(result.stderr).toContain(
            '💥 MalfunctionError: the bound could not take hold of the run',
          );
        });

        then('stdout matches snapshot', () => {
          expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
        });

        then('stderr matches snapshot', () => {
          expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
        });
      });

      when('[t1] the bound cannot make its marker dir', () => {
        const result = useThen('it runs', async () => {
          // a `mktemp` that makes files but refuses `-d`, the marker dir's form
          const bin = genTempDir({ slug: 'git-repo-test-bound-mktemp' });
          fs.writeFileSync(
            path.join(bin, 'mktemp'),
            `#!/usr/bin/env bash\n[[ "$1" == "-d" ]] && exit 1\nexec "${getToolPath({ tool: 'mktemp' })}" "$@"\n`,
          );
          fs.chmodSync(path.join(bin, 'mktemp'), 0o755);
          return runInTempGitRepo({
            scripts: { 'test:lint': 'echo ran > ran.marker' },
            gitRepoTestArgs: ['--what', 'lint'],
            path: `${bin}:${process.env.PATH}`,
          });
        });

        then('it exits 1 and the suite never ran', () => {
          expect(result.exitCode).toBe(1);
          expect(fs.existsSync(path.join(result.tempDir, 'ran.marker'))).toBe(
            false,
          );
        });

        then('both streams name the fault', () => {
          expect(result.stdout).toContain(
            '💥 MalfunctionError: the bound could not make its marker dir',
          );
          expect(result.stderr).toContain(
            '💥 MalfunctionError: the bound could not make its marker dir',
          );
        });

        then('stdout matches snapshot', () => {
          expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
        });

        then('stderr matches snapshot', () => {
          expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
        });
      });
    },
  );

  given('[case13] the skill on a host with no fuse tool (c14, c15)', () => {
    when('[t0] a slow suite runs past its bound', () => {
      const result = useThen('it runs', async () =>
        runInTempGitRepo({
          scripts: { 'test:lint': 'sleep 20' },
          gitRepoTestArgs: ['--what', 'lint', '--timeout', '1'],
          path: genPathWithoutFuseTools(),
        }),
      );

      then('the watchdog cuts it: exit 2, too slow', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'woah, too slow — past the 1s bound (--timeout)',
        );
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });
    });

    when('[t1] a fast suite ends inside its bound', () => {
      const result = useThen('it runs', async () =>
        runInTempGitRepo({
          scripts: { 'test:lint': 'echo "lint passed"' },
          gitRepoTestArgs: ['--what', 'lint'],
          path: genPathWithoutFuseTools(),
        }),
      );

      then('it passes as on any host: exit 0, the bound shown', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('bound: 420s (default)');
        expect(result.stdout).toContain('🎉 passed');
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });
    });
  });

  given(
    '[case14] a host whose `timeout` is not gnu (busybox, as on alpine)',
    () => {
      /**
       * .what = a PATH with no gnu fuse, where `timeout` rejects --kill-after as
       *         busybox's does
       */
      const genPathWithBusyboxTimeout = (): string => {
        const bin = genTempDir({ slug: 'git-repo-test-bound-busybox' });
        fs.writeFileSync(
          path.join(bin, 'timeout'),
          '#!/usr/bin/env bash\necho "timeout: unrecognized option: kill-after" >&2\nexit 1\n',
        );
        fs.chmodSync(path.join(bin, 'timeout'), 0o755);
        return `${bin}:${genPathWithoutFuseTools()}`;
      };

      when('[t0] a fast suite ends inside its bound', () => {
        const result = useThen('it runs', async () =>
          runInTempGitRepo({
            scripts: { 'test:lint': 'echo "lint passed"' },
            gitRepoTestArgs: ['--what', 'lint'],
            path: genPathWithBusyboxTimeout(),
          }),
        );

        then(
          'it passes: the skill falls through to the watchdog, no malfunction',
          () => {
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('🎉 passed');
            expect(result.stdout).not.toContain('💥');
          },
        );
      });

      when('[t1] a slow suite runs past its bound', () => {
        const result = useThen('it runs', async () =>
          runInTempGitRepo({
            scripts: { 'test:lint': 'sleep 20' },
            gitRepoTestArgs: ['--what', 'lint', '--timeout', '1'],
            path: genPathWithBusyboxTimeout(),
          }),
        );

        then('the watchdog cuts it: exit 2, too slow', () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            'woah, too slow — past the 1s bound (--timeout)',
          );
        });
      });
    },
  );

  /**
   * .what = a suite child that leaves the group survives the cut; the caller's
   *         pipe must still close when the skill exits
   * .note = a guard, not a revert clamp: `npm run` hands its command only fds
   *         0-2, so no skill fd past stderr can reach a suite through npm
   */
  given('[case15] a suite process that detaches and outlives the cut', () => {
    when(
      '[t0] the bound cuts the suite while a detached child still runs',
      () => {
        const result = useThen('it runs', async () => {
          // the clamp needs a way to leave the suite's process group
          if (!getToolPath({ tool: 'setsid' }))
            throw new ConstraintError('this case needs setsid on the host', {
              hint: 'setsid ships with util-linux; on macos, run this suite on linux',
            });

          const marker = 'sleep 47.42';
          const tempDir = genTempRepo({
            scripts: { 'test:lint': `setsid ${marker} & sleep 30` },
          });
          const startedAt = Date.now();
          const child = spawn(
            'bash',
            [scriptPath, '--what', 'lint', '--timeout', '1'],
            { cwd: tempDir, stdio: ['ignore', 'pipe', 'pipe'] },
          );
          child.stdout?.on('data', () => undefined);
          child.stderr?.on('data', () => undefined);

          // 'close' fires once every holder of the skill's stdout pipe lets go
          const closed = await new Promise<{ code: number | null }>((done) =>
            child.on('close', (code) => done({ code })),
          );
          const secondsToClose = (Date.now() - startedAt) / 1000;

          // the detached child is the clamp's own leftover; take it down
          spawnSync('pkill', ['-f', `^${marker}$`]);
          return { exitCode: closed.code, secondsToClose };
        });

        then('the skill exits 2 at the cut', () => {
          expect(result.exitCode).toBe(2);
        });

        then(
          "the caller's pipe closes with the skill, not with the survivor",
          () => {
            expect(result.secondsToClose).toBeLessThan(15);
          },
        );
      },
    );
  });
});
