import { type ChildProcess, spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = verify git.repo.test.sh bounds full suites per machine (the grove)
 * .why = many trees share one box; each full suite takes a flock slot from one
 *        pool, so the box never runs more suites than the bound, and a slot
 *        frees on exit, on a trapped signal, and on SIGKILL
 */
describe('git.repo.test.sh grove', () => {
  const scriptPath = path.join(__dirname, 'git.repo.test.sh');

  /**
   * .what = a shared stage for one scenario: a pool dir, a live-suite dir, a log
   */
  const genStage = () => {
    const root = genTempDir({ slug: 'grove-stage' });
    const poolDir = path.join(root, 'pool');
    const liveDir = path.join(root, 'live');
    const logFile = path.join(root, 'suites.log');
    fs.mkdirSync(liveDir, { recursive: true });
    fs.writeFileSync(logFile, '');
    return { root, poolDir, liveDir, logFile };
  };

  /**
   * .what = run one git command in a temp repo; fail loud on any nonzero exit
   * .why = a silent setup failure would surface later as an unrelated mismatch
   */
  const runGitOrFail = (input: { args: string[]; cwd: string }): void => {
    const result = spawnSync('git', input.args, { cwd: input.cwd });
    if (result.status === 0) return;
    throw new Error(
      `test setup failed: git ${input.args.join(' ')} (status ${result.status}, signal ${result.signal}): ${String(result.stdout)} ${String(result.stderr ?? result.error?.message)}`,
    );
  };

  /**
   * .what = a temp repo whose fake npm records each suite start and the live count
   * .mock = npm (the suite run) and jest --listTests (the scope list), via PATH
   *         and node_modules/.bin; flock, setsid, kill, and the pool are real
   * .why = the grove bounds how many suites run at once; a fake suite makes the
   *        live count, start order, and grandchild observable, and lets a test
   *        hold a slot for a set time — a real jest suite offers neither
   * .real = the dogfood run: this repo's own suites run bounded under the skill
   *         (`rhx git.repo.test --what integration --mode apply`, 5.3 yield)
   */
  const genTree = (input: {
    slug: string;
    stage: ReturnType<typeof genStage>;
  }): { tempDir: string; fakeBinDir: string } => {
    const tempDir = genTempDir({ slug: input.slug, git: true });

    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: input.slug,
        devDependencies: { jest: '30.2.0' },
        scripts: {
          'test:unit': 'jest --config jest.unit.config.js',
          'test:lint': 'eslint .',
        },
      }),
    );
    fs.writeFileSync(
      path.join(tempDir, 'jest.unit.config.js'),
      `module.exports = { testMatch: ['**/*.test.js'] };`,
    );
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'src', 'example.test.js'),
      `it('passes', () => {});`,
    );

    // mock jest --listTests, for scoped runs; it marks its start and may list slowly
    const jestBinDir = path.join(tempDir, 'node_modules', '.bin');
    fs.mkdirSync(jestBinDir, { recursive: true });
    fs.writeFileSync(
      path.join(jestBinDir, 'jest'),
      `#!/bin/bash
if [[ "$*" == *"--listTests"* ]]; then
  touch "${input.stage.root}/list.started"
  sleep "\${GROVE_FAKE_LIST_SECONDS:-0}"
  [[ "$*" == *"nomatch"* ]] || echo "${tempDir}/src/example.test.js"
  exit 0
fi
exit 1
`,
    );
    fs.chmodSync(path.join(jestBinDir, 'jest'), '755');

    // fake npm: mark itself live, log the live count, sleep, then pass
    const fakeBinDir = path.join(tempDir, '.fakebin');
    fs.mkdirSync(fakeBinDir, { recursive: true });
    fs.writeFileSync(
      path.join(fakeBinDir, 'npm'),
      `#!/bin/bash
touch "${input.stage.liveDir}/$$"
echo "start ${input.slug} pid=$$ live=$(ls "${input.stage.liveDir}" | wc -l)" >> "${input.stage.logFile}"
# the work runs in a grandchild, as jest workers do; a stop must reach it too
sleep "\${GROVE_FAKE_SUITE_SECONDS:-2}" &
echo "$!" > "${input.stage.root}/grandchild.$$.pid"
wait
rm -f "${input.stage.liveDir}/$$"
echo "end ${input.slug} pid=$$" >> "${input.stage.logFile}"
echo "Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Time:        0.1 s"
exit 0
`,
    );
    fs.chmodSync(path.join(fakeBinDir, 'npm'), '755');

    runGitOrFail({ args: ['add', '.'], cwd: tempDir });
    runGitOrFail({ args: ['commit', '-m', 'initial'], cwd: tempDir });
    return { tempDir, fakeBinDir };
  };

  /**
   * .what = the env for one run: private pool, fixed bound, no nest marker
   */
  const genEnv = (input: {
    stage: ReturnType<typeof genStage>;
    fakeBinDir: string;
    slots: string;
    suiteSeconds?: number;
  }): NodeJS.ProcessEnv => {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PATH: `${input.fakeBinDir}:${process.env.PATH}`,
      GIT_REPO_TEST_SLOTS: input.slots,
      GIT_REPO_TEST_SLOTS_DIR: input.stage.poolDir,
      GROVE_FAKE_SUITE_SECONDS: String(input.suiteSeconds ?? 2),
    };
    delete env.GIT_REPO_TEST_GROVE_HELD;
    return env;
  };

  /**
   * .what = a live skill run, with its stdout gathered as it streams
   */
  interface LiveRun {
    child: ChildProcess;
    stdout: () => string;
    stderr: () => string;
    done: Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
  }

  const startRun = (input: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    args: string[];
  }): LiveRun => {
    const child = spawn('bash', [scriptPath, ...input.args], {
      cwd: input.cwd,
      env: input.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const chunksOut: string[] = [];
    const chunksErr: string[] = [];
    child.stdout!.on('data', (chunk) => chunksOut.push(String(chunk)));
    child.stderr!.on('data', (chunk) => chunksErr.push(String(chunk)));
    const done = new Promise<{
      code: number | null;
      signal: NodeJS.Signals | null;
    }>((fulfil) =>
      child.on('close', (code, signal) => fulfil({ code, signal })),
    );
    return {
      child,
      stdout: () => chunksOut.join(''),
      stderr: () => chunksErr.join(''),
      done,
    };
  };

  /**
   * .what = wait until a probe holds true, or fail loud after a deadline
   */
  const waitFor = async (input: {
    probe: () => boolean;
    what: string;
    seconds: number;
  }): Promise<void> => {
    const deadline = Date.now() + input.seconds * 1000;
    while (Date.now() < deadline) {
      if (input.probe()) return;
      await new Promise((wake) => setTimeout(wake, 100));
    }
    throw new Error(`waitFor timed out: ${input.what}`);
  };

  /**
   * .what = await a run's exit, or kill it and fail loud after a deadline
   * .why = a run that never returns must not outlive the test as an orphan
   */
  const awaitExitOrKill = async (input: {
    run: LiveRun;
    seconds: number;
  }): Promise<{ code: number | null; signal: NodeJS.Signals | null }> => {
    const deadline = new Promise<never>((_, refuse) => {
      const timer = setTimeout(() => {
        input.run.child.kill('SIGKILL');
        refuse(new Error(`run did not exit within ${input.seconds}s`));
      }, input.seconds * 1000);
      void input.run.done.then(() => clearTimeout(timer));
    });
    return Promise.race([input.run.done, deadline]);
  };

  /**
   * .what = the max live suite count the fake npm ever logged
   */
  const getMaxLive = (logFile: string): number =>
    Math.max(
      0,
      ...[...fs.readFileSync(logFile, 'utf-8').matchAll(/live=\s*(\d+)/g)].map(
        (match) => Number(match[1]),
      ),
    );

  /**
   * .what = the pids of fake suites still live (orphans), from the live dir
   */
  const getLivePids = (liveDir: string): number[] =>
    fs.readdirSync(liveDir).map(Number);

  /**
   * .what = whether a pid is still alive
   */
  const isAlive = (pid: number): boolean => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };

  /**
   * .what = hold a slot from outside the skill, via a bare flock process
   * .note = returns only once the lock is held, so no run can claim it first
   */
  const holdSlot = async (input: {
    poolDir: string;
    slot: number;
    seconds: number;
    record: {
      tree: string;
      what: string;
      sinceAgo: number;
      pid?: number;
      /** write the record this long after the lock is held, as a real claim does */
      delaySeconds?: number;
    };
  }): Promise<ChildProcess> => {
    fs.mkdirSync(input.poolDir, { recursive: true });
    const lockFile = path.join(input.poolDir, `slot.${input.slot}.lock`);
    // -o: the lock stays with flock itself, never its sleep child, so a kill of flock frees it
    const holder = spawn(
      'flock',
      ['-o', lockFile, 'sleep', String(input.seconds)],
      { stdio: 'ignore' },
    );
    await waitFor({
      probe: () => spawnSync('flock', ['-n', lockFile, 'true']).status === 1,
      what: 'holder takes the lock',
      seconds: 10,
    });
    const writeRecord = () =>
      fs.writeFileSync(
        path.join(
          input.poolDir,
          `slot.${input.slot}.holder.${input.record.pid ?? holder.pid}`,
        ),
        [
          `tree=${input.record.tree}`,
          `what=${input.record.what}`,
          `since=${Math.floor(Date.now() / 1000) - input.record.sinceAgo}`,
        ].join('\n') + '\n',
      );
    if (input.record.delaySeconds)
      setTimeout(writeRecord, input.record.delaySeconds * 1000);
    if (!input.record.delaySeconds) writeRecord();
    return holder;
  };

  /**
   * .what = the holder record files of one slot in a pool
   */
  const getHolderRecords = (input: { poolDir: string; slot: number }) =>
    fs
      .readdirSync(input.poolDir)
      .filter((name) => name.startsWith(`slot.${input.slot}.holder.`));

  /**
   * .what = a pid that was alive a moment ago and is gone now
   * .why = a holder record left by a kill -9 names such a pid
   */
  const getDeadPid = (): number => {
    const gone = spawnSync('true');
    if (!gone.pid) throw new Error('test setup failed: no pid from spawnSync');
    return gone.pid;
  };

  /**
   * .what = the run header and grove branch lines of a run's stdout, pids and ages masked
   * .note = the waiter's age (`claimed after`) and a holder's age get distinct masks, so a
   *         swap of the two reads red; a beat (`still held (30s)`) names a fixed mark, unmasked
   */
  const asGroveBranch = (stdout: string): string =>
    stdout
      .split('\n')
      .filter((line) =>
        // `grove` as a word at a line's end or before a colon, so a temp path never matches
        /^🐚 git\.repo\.test|grove(:|$)|bound:|slot|⏳|🎫|⚠️|kill |pgrep|ask your human|🌙 stopped|tip:/.test(
          line,
        ),
      )
      .map((line) =>
        line.includes('still held')
          ? line
          : line
              .replace(/pid \d+/g, 'pid <pid>')
              .replace(/-lP \d+/g, '-lP <pid>')
              .replace(/kill \d+/g, 'kill <pid>')
              .replace(
                /claimed after (\d+m\d\ds|\d+s)/g,
                'claimed after <wait-age>',
              )
              .replace(/\d+m\d\ds|\b\d+s\b/g, '<holder-age>'),
      )
      .join('\n');

  /**
   * .what = a refusal's stdout with the stage temp dir masked, for snapshot
   */
  const asRefusalSnap = (input: { output: string; stageRoot: string }) =>
    input.output
      .split(input.stageRoot)
      .join('<stage>')
      .replace(/\(\d+s\)/g, '(Xs)');

  given('[case1] a grove with 2 slots, both free, pool dir absent', () => {
    when('[t0] a full unit suite runs', () => {
      const result = useThen('the run completes', async () => {
        const stage = genStage();
        const tree = genTree({ slug: 'tree-solo', stage });
        const run = startRun({
          cwd: tree.tempDir,
          env: genEnv({ stage, fakeBinDir: tree.fakeBinDir, slots: '2' }),
          args: ['--what', 'unit', '--mode', 'apply'],
        });
        const outcome = await run.done;
        return { stage, outcome, stdout: run.stdout() };
      });

      then('it exits 0', () => {
        expect(result.outcome.code).toBe(0);
      });

      then('stdout names the bound, its source, and the slot claimed', () => {
        expect(result.stdout).toContain('bound: 2 slots (GIT_REPO_TEST_SLOTS)');
        expect(result.stdout).toContain('🎫 slot.0 claimed');
        expect(result.stdout).not.toContain('wait for one');
      });

      then('the pool dir is created 1777 and the slot file 0666', () => {
        const dirMode = fs.statSync(result.stage.poolDir).mode & 0o7777;
        const fileMode =
          fs.statSync(path.join(result.stage.poolDir, 'slot.0.lock')).mode &
          0o777;
        expect(dirMode).toBe(0o1777);
        expect(fileMode).toBe(0o666);
      });

      then('the grove branch matches snapshot', () => {
        expect(asGroveBranch(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case2] N+1 suites against a bound of N (wish clamp 1)', () => {
    when('[t0] three trees start a full suite at once, bound 2', () => {
      const result = useThen('all three complete', async () => {
        const stage = genStage();
        const runs = ['tree-kai', 'tree-jo', 'tree-lu'].map((slug) => {
          const tree = genTree({ slug, stage });
          return startRun({
            cwd: tree.tempDir,
            env: genEnv({
              stage,
              fakeBinDir: tree.fakeBinDir,
              slots: '2',
              suiteSeconds: 3,
            }),
            args: ['--what', 'unit', '--mode', 'apply', '--thorough'],
          });
        });
        const outcomes = await Promise.all(runs.map((run) => run.done));
        const log = fs.readFileSync(stage.logFile, 'utf-8');
        return {
          outcomes,
          stdouts: runs.map((run) => run.stdout()),
          maxLive: getMaxLive(stage.logFile),
          starts: (log.match(/^start /gm) ?? []).length,
        };
      });

      then('every run exits 0; none fails for the wait', () => {
        expect(result.outcomes.map((outcome) => outcome.code)).toEqual([
          0, 0, 0,
        ]);
      });

      then('all three suites ran', () => {
        expect(result.starts).toBe(3);
      });

      then('the box never ran more than 2 suites at once', () => {
        expect(result.maxLive).toBeLessThanOrEqual(2);
      });

      then(
        'exactly one run waited, named the holders, and named its claim',
        () => {
          const waiters = result.stdouts.filter((stdout) =>
            stdout.includes('2 of 2 slots held, wait for one'),
          );
          expect(waiters).toHaveLength(1);
          expect(waiters[0]).toMatch(
            /slot\.0: \S*tree-\w+\S* · unit · pid \d+/,
          );
          expect(waiters[0]).toMatch(
            /slot\.1: \S*tree-\w+\S* · unit · pid \d+/,
          );
          expect(waiters[0]).toMatch(/🎫 slot\.\d claimed after \d+s/);
        },
      );
    });

    when('[t1] a holder lingers past 30s, then exits', () => {
      const result = useThen('the waiter completes', async () => {
        const stage = genStage();
        const tree = genTree({ slug: 'tree-waiter', stage });
        const holder = await holdSlot({
          poolDir: stage.poolDir,
          slot: 0,
          seconds: 33,
          record: { tree: 'tree-holder', what: 'integration', sinceAgo: 5 },
        });
        const run = startRun({
          cwd: tree.tempDir,
          env: genEnv({ stage, fakeBinDir: tree.fakeBinDir, slots: '1' }),
          args: ['--what', 'unit', '--mode', 'apply'],
        });
        const outcome = await run.done;
        holder.kill();
        return { outcome, stdout: run.stdout() };
      });

      then('the waiter exits 0', () => {
        expect(result.outcome.code).toBe(0);
      });

      then('it printed a heartbeat while it waited', () => {
        // the first beat names its own mark, 30s, whatever the poll adds
        expect(result.stdout).toContain('⏳ still held (30s)');
      });

      then('the heartbeat names the holders again, not only the start', () => {
        const beatAt = result.stdout.indexOf('⏳ still held (30s)');
        expect(beatAt).toBeGreaterThan(-1);
        expect(result.stdout.slice(beatAt)).toMatch(
          /slot\.0: tree-holder · integration · pid \d+/,
        );
      });

      then('it claimed the slot only after the holder exited', () => {
        expect(result.stdout).toMatch(/🎫 slot\.0 claimed after 3\ds/);
      });

      then('the grove branch matches snapshot', () => {
        expect(asGroveBranch(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] a holder has held its slot past 30m', () => {
      const result = useThen(
        'the waiter is observed, then stopped',
        async () => {
          const stage = genStage();
          const tree = genTree({ slug: 'tree-waiter', stage });
          const holder = await holdSlot({
            poolDir: stage.poolDir,
            slot: 0,
            seconds: 20,
            record: { tree: 'tree-hung', what: 'integration', sinceAgo: 2820 },
          });
          const run = startRun({
            cwd: tree.tempDir,
            env: genEnv({ stage, fakeBinDir: tree.fakeBinDir, slots: '1' }),
            args: ['--what', 'unit', '--mode', 'apply'],
          });
          await waitFor({
            probe: () => run.stdout().includes('to free it'),
            what: 'stale hint',
            seconds: 10,
          });
          run.child.kill('SIGINT');
          const outcome = await run.done;
          const holderAlive = isAlive(holder.pid!);
          holder.kill();
          return { outcome, stdout: run.stdout(), holderAlive };
        },
      );

      then('it names the stale holder and the command that frees it', () => {
        expect(result.stdout).toMatch(
          /⚠️ slot\.0 held 47m\d\ds — tree-hung · pid \d+ · may be hung/,
        );
        expect(result.stdout).toMatch(/to free it: kill \d+/);
        expect(result.stdout).toContain(
          'a clone may not run these; ask your human',
        );
      });

      then('it says to check the holder tree before the kill', () => {
        expect(result.stdout).toMatch(
          /check first: pgrep -lP \d+ \(a long suite may still be at work\)/,
        );
      });

      then('the waiter never killed the holder itself', () => {
        expect(result.holderAlive).toBe(true);
      });

      then('the grove branch matches snapshot', () => {
        expect(result.stdout).toContain('may be hung');
        expect(asGroveBranch(result.stdout)).toMatchSnapshot();
      });
    });

    when("[t6] a stale holder is another user's", () => {
      const result = useThen(
        'the waiter is observed, then stopped',
        async () => {
          const stage = genStage();
          const tree = genTree({ slug: 'tree-waiter', stage });

          /**
           * .mock = ps -o user=, via PATH; it names another user as the holder's owner
           * .why = a holder owned by another user needs a second account, which a
           *        test cannot make; all other ps calls pass through to the real ps
           * .real = the owner lookup is one ps call, read as is
           */
          const realPs = String(
            spawnSync('bash', ['-c', 'command -v ps']).stdout,
          ).trim();
          fs.writeFileSync(
            path.join(tree.fakeBinDir, 'ps'),
            `#!/bin/bash
if [[ "\${1:-}" == "-o" ]] && [[ "\${2:-}" == "user=" ]]; then
  echo "otherhuman"
  exit 0
fi
exec "${realPs}" "$@"
`,
          );
          fs.chmodSync(path.join(tree.fakeBinDir, 'ps'), '755');

          const holder = await holdSlot({
            poolDir: stage.poolDir,
            slot: 0,
            seconds: 20,
            record: { tree: 'tree-hung', what: 'integration', sinceAgo: 2820 },
          });
          const run = startRun({
            cwd: tree.tempDir,
            env: genEnv({ stage, fakeBinDir: tree.fakeBinDir, slots: '1' }),
            args: ['--what', 'unit', '--mode', 'apply'],
          });
          await waitFor({
            probe: () => run.stdout().includes('to free it'),
            what: 'stale hint',
            seconds: 10,
          });
          run.child.kill('SIGINT');
          await run.done;
          holder.kill();
          return { stdout: run.stdout() };
        },
      );

      then('the hint names the owner to run the kill as', () => {
        expect(result.stdout).toMatch(
          /to free it: kill \d+ \(as otherhuman, its owner\)/,
        );
      });

      then('the grove branch matches snapshot', () => {
        expect(result.stdout).toContain('its owner');
        expect(asGroveBranch(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t7] a waiter meets both slots held, bound 2', () => {
      const result = useThen(
        'the waiter is observed, then stopped',
        async () => {
          const stage = genStage();
          const tree = genTree({ slug: 'tree-waiter', stage });
          const holderKai = await holdSlot({
            poolDir: stage.poolDir,
            slot: 0,
            seconds: 20,
            record: { tree: 'tree-kai', what: 'integration', sinceAgo: 5 },
          });
          const holderJo = await holdSlot({
            poolDir: stage.poolDir,
            slot: 1,
            seconds: 20,
            record: { tree: 'tree-jo', what: 'unit', sinceAgo: 5 },
          });
          const run = startRun({
            cwd: tree.tempDir,
            env: genEnv({ stage, fakeBinDir: tree.fakeBinDir, slots: '2' }),
            args: ['--what', 'unit', '--mode', 'apply'],
          });
          await waitFor({
            probe: () => run.stdout().includes('tip:'),
            what: 'the wait lists both holders',
            seconds: 10,
          });
          run.child.kill('SIGINT');
          await run.done;
          holderKai.kill();
          holderJo.kill();
          return { stdout: run.stdout() };
        },
      );

      then('the wait names both holders, one row per slot', () => {
        expect(result.stdout).toContain('⏳ 2 of 2 slots held, wait for one');
        expect(result.stdout).toMatch(/├─ slot\.0: tree-kai · integration/);
        expect(result.stdout).toMatch(/└─ slot\.1: tree-jo · unit/);
      });

      then('the grove branch matches snapshot', () => {
        expect(result.stdout).toContain('tree-jo');
        expect(asGroveBranch(result.stdout)).toMatchSnapshot();
      });
    });

    when(
      '[t3] the lock is held, but its record names a pid that is gone',
      () => {
        const result = useThen(
          'the waiter is observed, then stopped',
          async () => {
            const stage = genStage();
            const tree = genTree({ slug: 'tree-waiter', stage });
            const holder = await holdSlot({
              poolDir: stage.poolDir,
              slot: 0,
              seconds: 20,
              record: {
                tree: 'tree-ghost',
                what: 'integration',
                sinceAgo: 2820,
                pid: getDeadPid(),
              },
            });
            const run = startRun({
              cwd: tree.tempDir,
              env: genEnv({ stage, fakeBinDir: tree.fakeBinDir, slots: '1' }),
              args: ['--what', 'unit', '--mode', 'apply'],
            });
            await waitFor({
              probe: () => run.stdout().includes('wait for one'),
              what: 'waiter waits',
              seconds: 15,
            });
            await new Promise((wake) => setTimeout(wake, 1500));
            run.child.kill('SIGINT');
            const outcome = await run.done;
            holder.kill();
            return { outcome, stdout: run.stdout() };
          },
        );

        then('the holder reads as unknown, never as the gone pid', () => {
          expect(result.outcome.code).toBe(130);
          expect(result.stdout).toContain('slot.0: ? · ? · pid ? · ?');
          expect(result.stdout).not.toContain('tree-ghost');
        });

        then('no kill hint aims at the gone pid', () => {
          expect(result.stdout).toContain('wait for one');
          expect(result.stdout).not.toContain('to free it');
          expect(result.stdout).not.toContain('may be hung');
        });
      },
    );

    when('[t4] two waiters race for one slot as it frees', () => {
      const result = useThen('both complete', async () => {
        const stage = genStage();
        const holder = await holdSlot({
          poolDir: stage.poolDir,
          slot: 0,
          seconds: 4,
          record: { tree: 'tree-holder', what: 'unit', sinceAgo: 5 },
        });
        const runs = ['tree-ann', 'tree-bo'].map((slug) => {
          const tree = genTree({ slug, stage });
          return startRun({
            cwd: tree.tempDir,
            env: genEnv({
              stage,
              fakeBinDir: tree.fakeBinDir,
              slots: '1',
              suiteSeconds: 2,
            }),
            args: ['--what', 'unit', '--mode', 'apply'],
          });
        });
        await waitFor({
          probe: () =>
            runs.every((run) => run.stdout().includes('wait for one')),
          what: 'both runs wait',
          seconds: 15,
        });
        const outcomes = await Promise.all(
          runs.map((run) => awaitExitOrKill({ run, seconds: 60 })),
        );
        holder.kill();
        const log = fs.readFileSync(stage.logFile, 'utf-8');
        return {
          outcomes,
          stdouts: runs.map((run) => run.stdout()),
          maxLive: getMaxLive(stage.logFile),
          starts: (log.match(/^start /gm) ?? []).length,
        };
      });

      then('both exit 0; neither fails for the wait', () => {
        expect(result.outcomes.map((outcome) => outcome.code)).toEqual([0, 0]);
      });

      then('both suites ran, never two at once', () => {
        expect(result.starts).toBe(2);
        expect(result.maxLive).toBe(1);
      });

      then('each names its claim after its wait', () => {
        result.stdouts.forEach((stdout) =>
          expect(stdout).toMatch(/🎫 slot\.0 claimed after \d+s/),
        );
      });
    });

    when(
      '[t5] a waiter starts in the gap between a claim and its record',
      () => {
        const result = useThen('the waiter completes', async () => {
          const stage = genStage();
          const holder = await holdSlot({
            poolDir: stage.poolDir,
            slot: 0,
            // outlasts the waiter's startup under load, so the waiter meets it held
            seconds: 8,
            record: {
              tree: 'tree-late',
              what: 'unit',
              sinceAgo: 0,
              delaySeconds: 1,
            },
          });
          const tree = genTree({ slug: 'tree-early', stage });
          const run = startRun({
            cwd: tree.tempDir,
            env: genEnv({ stage, fakeBinDir: tree.fakeBinDir, slots: '1' }),
            args: ['--what', 'unit', '--mode', 'apply'],
          });
          const outcome = await awaitExitOrKill({ run, seconds: 60 });
          holder.kill();
          return { outcome, stdout: run.stdout() };
        });

        then('the first holders list names the holder, never `?`', () => {
          expect(result.outcome.code).toBe(0);
          expect(result.stdout).toContain('wait for one');
          expect(result.stdout).toMatch(
            /slot\.0: tree-late · unit · pid \d+ · /,
          );
          expect(result.stdout).not.toContain('slot.0: ? · ?');
        });
      },
    );
  });

  given(
    '[case3] a grove with 1 slot, held by a skill run (wish clamp 2)',
    () => {
      when('[t0] the holder is sent SIGKILL mid-run', () => {
        const result = useThen('the waiter completes', async () => {
          const stage = genStage();
          const treeA = genTree({ slug: 'tree-a', stage });
          const treeB = genTree({ slug: 'tree-b', stage });
          const holder = startRun({
            cwd: treeA.tempDir,
            env: genEnv({
              stage,
              fakeBinDir: treeA.fakeBinDir,
              slots: '1',
              suiteSeconds: 60,
            }),
            args: ['--what', 'unit', '--mode', 'apply'],
          });
          await waitFor({
            probe: () =>
              /start tree-a/.test(fs.readFileSync(stage.logFile, 'utf-8')),
            what: 'holder suite start',
            seconds: 15,
          });
          const waiter = startRun({
            cwd: treeB.tempDir,
            env: genEnv({ stage, fakeBinDir: treeB.fakeBinDir, slots: '1' }),
            args: ['--what', 'unit', '--mode', 'apply'],
          });
          await waitFor({
            probe: () => waiter.stdout().includes('wait for one'),
            what: 'waiter waits',
            seconds: 15,
          });

          // kill -9 the holder: no trap can run
          const killedAt = Date.now();
          holder.child.kill('SIGKILL');
          await holder.done;
          await waitFor({
            probe: () => waiter.stdout().includes('🎫 slot.0 claimed after'),
            what: 'waiter claims',
            seconds: 10,
          });
          const claimLagMs = Date.now() - killedAt;
          const outcome = await waiter.done;

          // reap the orphaned fake suite the SIGKILL left behind (the F2 residual)
          getLivePids(stage.liveDir)
            .filter(isAlive)
            .forEach((pid) => process.kill(pid, 'SIGKILL'));
          return { outcome, stdout: waiter.stdout(), claimLagMs };
        });

        then('the waiter claims the freed slot within a few polls', () => {
          expect(result.claimLagMs).toBeLessThan(5000);
        });

        then('the waiter runs to completion and exits 0', () => {
          expect(result.outcome.code).toBe(0);
          expect(result.stdout).toContain('🎉 passed');
        });
      });

      when('[t1] a stale holder record sits beside a free lock', () => {
        const result = useThen('the run completes', async () => {
          const stage = genStage();
          const tree = genTree({ slug: 'tree-fresh', stage });
          const deadPid = getDeadPid();
          fs.mkdirSync(stage.poolDir, { recursive: true });
          fs.writeFileSync(
            path.join(stage.poolDir, `slot.0.holder.${deadPid}`),
            'tree=tree-gone\nwhat=unit\nsince=1\n',
          );
          const run = startRun({
            cwd: tree.tempDir,
            env: genEnv({ stage, fakeBinDir: tree.fakeBinDir, slots: '1' }),
            args: ['--what', 'unit', '--mode', 'apply'],
          });
          await waitFor({
            probe: () =>
              /start tree-fresh/.test(fs.readFileSync(stage.logFile, 'utf-8')),
            what: 'the suite starts',
            seconds: 15,
          });
          const recordsMidRun = getHolderRecords({
            poolDir: stage.poolDir,
            slot: 0,
          });
          const recordMidRun = fs.readFileSync(
            path.join(stage.poolDir, recordsMidRun[0]!),
            'utf-8',
          );
          const outcome = await run.done;
          return {
            outcome,
            stdout: run.stdout(),
            deadPid,
            recordsMidRun,
            recordMidRun,
            recordsAfter: getHolderRecords({ poolDir: stage.poolDir, slot: 0 }),
          };
        });

        then('the run claims at once, with no wait', () => {
          expect(result.outcome.code).toBe(0);
          expect(result.stdout).toContain('🎫 slot.0 claimed');
          expect(result.stdout).not.toContain('wait for one');
        });

        then(
          'the gone record is pruned; one record names the new holder',
          () => {
            expect(result.recordsMidRun).toHaveLength(1);
            expect(result.recordsMidRun[0]).not.toBe(
              `slot.0.holder.${result.deadPid}`,
            );
            expect(result.recordMidRun).toContain('tree=');
            expect(result.recordMidRun).not.toContain('tree-gone');
          },
        );

        then('the record is cleared once the run exits', () => {
          expect(result.recordsAfter).toEqual([]);
        });
      });

      when('[t2] a waiter is sent SIGINT mid-wait', () => {
        const result = useThen('the waiter exits', async () => {
          const stage = genStage();
          const tree = genTree({ slug: 'tree-waiter', stage });
          const holder = await holdSlot({
            poolDir: stage.poolDir,
            slot: 0,
            seconds: 20,
            record: { tree: 'tree-holder', what: 'unit', sinceAgo: 5 },
          });
          const run = startRun({
            cwd: tree.tempDir,
            env: genEnv({ stage, fakeBinDir: tree.fakeBinDir, slots: '1' }),
            args: ['--what', 'unit', '--mode', 'apply'],
          });
          // the holders print after the wait line; await them, so the snapshot is whole
          await waitFor({
            probe: () =>
              run.stdout().includes('wait for one') &&
              run.stdout().includes('slot.0: tree-holder'),
            what: 'waiter waits and names the holder',
            seconds: 15,
          });
          run.child.kill('SIGINT');
          const outcome = await run.done;
          const records = getHolderRecords({ poolDir: stage.poolDir, slot: 0 });
          const holderAlive = isAlive(holder.pid!);
          holder.kill();
          return {
            outcome,
            records,
            holderPid: holder.pid,
            holderAlive,
            stdout: run.stdout(),
            stderr: run.stderr(),
            suitesStarted: fs.readFileSync(stage.logFile, 'utf-8'),
          };
        });

        then('it exits 130, with no suite started', () => {
          expect(result.outcome.code).toBe(130);
          expect(result.suitesStarted).toBe('');
        });

        then('it says it stopped before any test tree, on both streams', () => {
          const line =
            '🌙 stopped by sigint; no test tree had started (exit 130)';
          expect(result.stdout).toContain(line);
          expect(result.stderr).toContain(line);
        });

        then('the grove branch matches snapshot', () => {
          expect(result.stdout).toContain('wait for one');
          expect(asGroveBranch(result.stdout)).toMatchSnapshot();
        });

        then('it wrote no holder record', () => {
          expect(result.records).toEqual([`slot.0.holder.${result.holderPid}`]);
        });

        then('the holder it waited on runs on, unaffected', () => {
          expect(result.holderAlive).toBe(true);
        });
      });

      when('[t3] the holder is sent SIGTERM mid-run', () => {
        const result = useThen('the waiter completes', async () => {
          const stage = genStage();
          const treeA = genTree({ slug: 'tree-a', stage });
          const treeB = genTree({ slug: 'tree-b', stage });
          const holder = startRun({
            cwd: treeA.tempDir,
            env: genEnv({
              stage,
              fakeBinDir: treeA.fakeBinDir,
              slots: '1',
              suiteSeconds: 60,
            }),
            args: ['--what', 'unit', '--mode', 'apply'],
          });
          await waitFor({
            probe: () => getLivePids(stage.liveDir).length === 1,
            what: 'holder suite start',
            seconds: 15,
          });
          const [suitePid] = getLivePids(stage.liveDir);
          const waiter = startRun({
            cwd: treeB.tempDir,
            env: genEnv({ stage, fakeBinDir: treeB.fakeBinDir, slots: '1' }),
            args: ['--what', 'unit', '--mode', 'apply'],
          });
          await waitFor({
            probe: () => waiter.stdout().includes('wait for one'),
            what: 'waiter waits',
            seconds: 15,
          });
          holder.child.kill('SIGTERM');
          const holderOutcome = await holder.done;
          const suiteAliveAfterHolder = isAlive(suitePid!);
          const outcome = await waiter.done;
          return {
            holderOutcome,
            holderStdout: holder.stdout(),
            holderStderr: holder.stderr(),
            suiteAliveAfterHolder,
            outcome,
            stdout: waiter.stdout(),
          };
        });

        then('the holder exits 143', () => {
          expect(result.holderOutcome.code).toBe(143);
        });

        then('the holder says it stopped, on stdout and stderr', () => {
          const line =
            '🌙 stopped by sigterm; the test tree is down (exit 143)';
          expect(result.holderStdout).toContain(line);
          expect(result.holderStderr).toContain(line);
        });

        then('the holder grove branch matches snapshot', () => {
          expect(result.holderStdout).toContain('stopped by sigterm');
          expect(asGroveBranch(result.holderStdout)).toMatchSnapshot();
        });

        then('no suite process of the holder survives it', () => {
          expect(result.suiteAliveAfterHolder).toBe(false);
        });

        then('the waiter claims the slot and runs', () => {
          expect(result.outcome.code).toBe(0);
          expect(result.stdout).toContain('🎫 slot.0 claimed after');
          expect(result.stdout).toContain('🎉 passed');
        });
      });

      when('[t6] the holder is sent SIGHUP mid-run (a closed session)', () => {
        const result = useThen('the next run claims', async () => {
          const stage = genStage();
          const treeA = genTree({ slug: 'tree-hup', stage });
          const treeB = genTree({ slug: 'tree-after', stage });
          const holder = startRun({
            cwd: treeA.tempDir,
            env: genEnv({
              stage,
              fakeBinDir: treeA.fakeBinDir,
              slots: '1',
              suiteSeconds: 60,
            }),
            args: ['--what', 'unit', '--mode', 'apply'],
          });
          await waitFor({
            probe: () => getLivePids(stage.liveDir).length === 1,
            what: 'holder suite start',
            seconds: 15,
          });
          const [suitePid] = getLivePids(stage.liveDir);
          holder.child.kill('SIGHUP');
          const holderOutcome = await awaitExitOrKill({
            run: holder,
            seconds: 15,
          });
          const suiteAliveAfterHolder = isAlive(suitePid!);
          const after = startRun({
            cwd: treeB.tempDir,
            env: genEnv({ stage, fakeBinDir: treeB.fakeBinDir, slots: '1' }),
            args: ['--what', 'unit', '--mode', 'apply'],
          });
          const afterOutcome = await awaitExitOrKill({
            run: after,
            seconds: 30,
          });
          return {
            holderOutcome,
            holderStdout: holder.stdout(),
            holderStderr: holder.stderr(),
            suiteAliveAfterHolder,
            afterOutcome,
            afterStdout: after.stdout(),
          };
        });

        then('the holder exits 129 and says so on both streams', () => {
          expect(result.holderOutcome.code).toBe(129);
          const line = '🌙 stopped by sighup; the test tree is down (exit 129)';
          expect(result.holderStdout).toContain(line);
          expect(result.holderStderr).toContain(line);
        });

        then('the holder grove branch matches snapshot', () => {
          expect(result.holderStdout).toContain('stopped by sighup');
          expect(asGroveBranch(result.holderStdout)).toMatchSnapshot();
        });

        then('no suite process of the holder survives it', () => {
          expect(result.suiteAliveAfterHolder).toBe(false);
        });

        then('the slot is free: the next run claims at once', () => {
          expect(result.afterOutcome.code).toBe(0);
          expect(result.afterStdout).toContain('🎫 slot.0 claimed');
          expect(result.afterStdout).not.toContain('wait for one');
        });
      });

      when('[t7] a run with --timeout waits longer than its timeout', () => {
        const result = useThen('the run completes', async () => {
          const stage = genStage();
          const holder = await holdSlot({
            poolDir: stage.poolDir,
            slot: 0,
            seconds: 5,
            record: { tree: 'tree-holder', what: 'unit', sinceAgo: 1 },
          });
          const tree = genTree({ slug: 'tree-patient', stage });
          const run = startRun({
            cwd: tree.tempDir,
            env: genEnv({
              stage,
              fakeBinDir: tree.fakeBinDir,
              slots: '1',
              suiteSeconds: 1,
            }),
            args: ['--what', 'unit', '--timeout', '3', '--mode', 'apply'],
          });
          const outcome = await awaitExitOrKill({ run, seconds: 60 });
          holder.kill();
          return { outcome, stdout: run.stdout() };
        });

        then('the wait trips no timeout: the clock starts at the claim', () => {
          expect(result.stdout).toContain('wait for one');
          expect(result.stdout).toMatch(/🎫 slot\.0 claimed after [3-9]s/);
          expect(result.outcome.code).toBe(0);
          expect(result.stdout).not.toContain('timeout');
        });
      });

      when(
        '[t4] a multi-type run is sent SIGTERM while a child suite runs',
        () => {
          const result = useThen('the parent exits', async () => {
            const stage = genStage();
            const tree = genTree({ slug: 'tree-multi', stage });
            const parent = startRun({
              cwd: tree.tempDir,
              env: genEnv({
                stage,
                fakeBinDir: tree.fakeBinDir,
                slots: '1',
                suiteSeconds: 60,
              }),
              args: ['--what', 'unit,unit', '--mode', 'apply'],
            });
            await waitFor({
              probe: () => getLivePids(stage.liveDir).length === 1,
              what: 'child suite start',
              seconds: 15,
            });
            const [suitePid] = getLivePids(stage.liveDir);
            const killedAt = Date.now();
            parent.child.kill('SIGTERM');
            const outcome = await parent.done;
            const parentExitMs = Date.now() - killedAt;
            await waitFor({
              probe: () => !isAlive(suitePid!),
              what: 'child suite stopped',
              seconds: 5,
            });
            return {
              outcome,
              parentExitMs,
              suiteAlive: isAlive(suitePid!),
              stdout: parent.stdout(),
              stderr: parent.stderr(),
            };
          });

          then('the parent exits 143 at once, not after the suite', () => {
            expect(result.outcome.code).toBe(143);
            expect(result.parentExitMs).toBeLessThan(10_000);
          });

          then('the child suite is stopped, not left to run on', () => {
            expect(result.suiteAlive).toBe(false);
          });

          then('one stop line reaches each stream, never two', () => {
            const line =
              '🌙 stopped by sigterm; the test tree is down (exit 143)';
            expect(result.stdout.split(line)).toHaveLength(2);
            expect(result.stderr.split(line)).toHaveLength(2);
          });

          then('the stop render matches snapshot, both streams', () => {
            expect(result.stdout).toContain('stopped by sigterm');
            expect({
              stdout: asGroveBranch(result.stdout),
              stderr: asGroveBranch(result.stderr),
            }).toMatchSnapshot();
          });
        },
      );

      when(
        '[t5] a thorough scoped run is sent SIGKILL as it lists its scope, before any claim',
        () => {
          const result = useThen('a waiter starts after the kill', async () => {
            const stage = genStage();
            const tree = genTree({ slug: 'tree-lister', stage });
            const holder = startRun({
              cwd: tree.tempDir,
              env: {
                ...genEnv({ stage, fakeBinDir: tree.fakeBinDir, slots: '1' }),
                GROVE_FAKE_LIST_SECONDS: '30',
              },
              args: [
                '--what',
                'unit',
                '--scope',
                'example',
                '--thorough',
                '--mode',
                'apply',
              ],
            });
            await waitFor({
              probe: () => fs.existsSync(path.join(stage.root, 'list.started')),
              what: 'the run lists its scope',
              seconds: 15,
            });
            const claimedBeforeList = holder.stdout().includes('🎫');
            // await the holder's own death, not its pipes: an orphan may keep those open
            const holderExited = new Promise((fulfil) =>
              holder.child.once('exit', fulfil),
            );
            holder.child.kill('SIGKILL');
            await holderExited;
            const waiter = startRun({
              cwd: tree.tempDir,
              env: genEnv({ stage, fakeBinDir: tree.fakeBinDir, slots: '1' }),
              args: ['--what', 'unit', '--mode', 'apply'],
            });
            await waitFor({
              probe: () => waiter.stdout().includes('🎫 slot.0 claimed'),
              what: 'waiter claims while the orphan --listTests still sleeps',
              seconds: 10,
            });
            const outcome = await waiter.done;
            return { outcome, stdout: waiter.stdout(), claimedBeforeList };
          });

          then('the run lists its scope before it claims a slot', () => {
            expect(result.claimedBeforeList).toBe(false);
          });

          then(
            'since the list precedes the claim, the kill leaves no slot held; the waiter claims at once',
            () => {
              expect(result.stdout).toContain('🎫 slot.0 claimed');
              expect(result.stdout).not.toContain('wait for one');
              expect(result.outcome.code).toBe(0);
            },
          );
        },
      );

      when(
        '[t8] the holder is sent SIGTERM and each kill of its tree is refused',
        () => {
          const result = useThen('the holder exits', async () => {
            const stage = genStage();
            const tree = genTree({ slug: 'tree-stuck', stage });

            /**
             * .mock = the bash kill builtin, via BASH_ENV; a stop of the tree is refused
             * .why = a real refusal (EPERM) needs a tree owned by another user,
             *        which a test cannot spawn; kill -0 probes pass through
             * .real = the refusal path is the kill builtin's own stderr, read as is
             */
            const bashEnv = path.join(stage.root, 'refuse-kill.bash');
            fs.writeFileSync(
              bashEnv,
              `kill() {
  if [[ "\${1:-}" =~ ^-(TERM|KILL)$ ]] && [[ "\${2:-}" == "--" ]]; then
    echo "bash: kill: (\${3:-}) - Operation not permitted" >&2
    return 1
  fi
  builtin kill "$@"
}
`,
            );
            const holder = startRun({
              cwd: tree.tempDir,
              env: {
                ...genEnv({
                  stage,
                  fakeBinDir: tree.fakeBinDir,
                  slots: '1',
                  suiteSeconds: 60,
                }),
                BASH_ENV: bashEnv,
              },
              args: ['--what', 'unit', '--mode', 'apply'],
            });
            await waitFor({
              probe: () => getLivePids(stage.liveDir).length === 1,
              what: 'holder suite start',
              seconds: 15,
            });
            const [suitePid] = getLivePids(stage.liveDir);
            // await the holder's own death, not its pipes: the live tree may keep those open
            const holderExited = new Promise<number | null>((fulfil) =>
              holder.child.once('exit', (code) => fulfil(code)),
            );
            holder.child.kill('SIGTERM');
            const code = await holderExited;
            const suiteAliveAfterHolder = isAlive(suitePid!);

            // free the tree the refused stop left behind
            const grandchildFile = path.join(
              stage.root,
              `grandchild.${suitePid}.pid`,
            );
            const grandchildPid = fs.existsSync(grandchildFile)
              ? Number(fs.readFileSync(grandchildFile, 'utf-8').trim())
              : null;
            [suitePid, grandchildPid].forEach((pid) => {
              if (pid && isAlive(pid)) process.kill(pid, 'SIGKILL');
            });
            return {
              code,
              stdout: holder.stdout(),
              stderr: holder.stderr(),
              suiteAliveAfterHolder,
            };
          });

          then('the holder exits 143', () => {
            expect(result.code).toBe(143);
          });

          then('it names the refused stop and its fix, on both streams', () => {
            const line = '💥 MalfunctionError: could not stop the test tree';
            expect(result.stdout).toContain(line);
            expect(result.stderr).toContain(line);
            expect(result.stdout).toContain('Operation not permitted');
          });

          then('it never claims the tree is down, since it is not', () => {
            expect(result.suiteAliveAfterHolder).toBe(true);
            expect(result.stdout).not.toContain('the test tree is down');
            expect(result.stdout).toContain(
              '🌙 stopped by sigterm; the test tree may still run, run the kill -KILL fix above (exit 143)',
            );
          });

          then('the stop render matches snapshot', () => {
            const render = result.stdout
              .split('\n')
              .filter((line) =>
                /^🐚 git\.repo\.test|💥|target:|cause:|fix: kill|🌙 stopped/.test(
                  line,
                ),
              )
              .join('\n')
              .replace(/-?\d+ \((TERM|KILL)\)/g, '<target> ($1)')
              .replace(/\(-?\d+\) - /g, '(<target>) - ')
              .replace(/-- -?\d+/g, '-- <target>');
            expect(render).toMatchSnapshot();
          });
        },
      );

      when('[t9] the holder is sent SIGINT (ctrl-c) mid-run', () => {
        const result = useThen('the holder exits', async () => {
          const stage = genStage();
          const tree = genTree({ slug: 'tree-ctrlc', stage });
          const holder = startRun({
            cwd: tree.tempDir,
            env: genEnv({
              stage,
              fakeBinDir: tree.fakeBinDir,
              slots: '1',
              suiteSeconds: 60,
            }),
            args: ['--what', 'unit', '--mode', 'apply'],
          });
          await waitFor({
            probe: () => getLivePids(stage.liveDir).length === 1,
            what: 'holder suite start',
            seconds: 15,
          });
          const [suitePid] = getLivePids(stage.liveDir);
          holder.child.kill('SIGINT');
          const outcome = await awaitExitOrKill({ run: holder, seconds: 15 });
          const suiteAlive = isAlive(suitePid!);
          return {
            outcome,
            suiteAlive,
            stdout: holder.stdout(),
            stderr: holder.stderr(),
          };
        });

        then('the holder exits 130 and says so on both streams', () => {
          const line = '🌙 stopped by sigint; the test tree is down (exit 130)';
          expect(result.outcome.code).toBe(130);
          expect(result.stdout).toContain(line);
          expect(result.stderr).toContain(line);
        });

        then('no suite process of the holder survives it', () => {
          expect(result.suiteAlive).toBe(false);
        });

        then('the stop render matches snapshot', () => {
          expect(result.stdout).toContain('stopped by sigint');
          expect(asGroveBranch(result.stdout)).toMatchSnapshot();
        });
      });

      when(
        '[t10] a multi-type run is sent SIGINT (ctrl-c) while a child suite runs',
        () => {
          const result = useThen('the parent exits', async () => {
            const stage = genStage();
            const tree = genTree({ slug: 'tree-multi-ctrlc', stage });
            const parent = startRun({
              cwd: tree.tempDir,
              env: genEnv({
                stage,
                fakeBinDir: tree.fakeBinDir,
                slots: '1',
                suiteSeconds: 60,
              }),
              args: ['--what', 'unit,unit', '--mode', 'apply'],
            });
            await waitFor({
              probe: () => getLivePids(stage.liveDir).length === 1,
              what: 'child suite start',
              seconds: 15,
            });
            const [suitePid] = getLivePids(stage.liveDir);
            parent.child.kill('SIGINT');
            const outcome = await awaitExitOrKill({ run: parent, seconds: 15 });
            await waitFor({
              probe: () => !isAlive(suitePid!),
              what: 'child suite stopped',
              seconds: 5,
            });
            return {
              outcome,
              stdout: parent.stdout(),
              stderr: parent.stderr(),
            };
          });

          then('the parent exits 130, the code ctrl-c implies', () => {
            expect(result.outcome.code).toBe(130);
          });

          then('one stop line per stream names sigint and exit 130', () => {
            const line =
              '🌙 stopped by sigint; the test tree is down (exit 130)';
            expect(result.stdout.split(line)).toHaveLength(2);
            expect(result.stderr.split(line)).toHaveLength(2);
            expect(result.stdout).not.toContain('sigterm');
          });
        },
      );
    },
  );

  given('[case4b] a grove with its only slot held, and a plan run', () => {
    when('[t0] a plan run starts', () => {
      const result = useThen('the plan run returns', async () => {
        const stage = genStage();
        const tree = genTree({ slug: 'tree-plan', stage });
        const holder = await holdSlot({
          poolDir: stage.poolDir,
          slot: 0,
          seconds: 30,
          record: { tree: 'tree-holder', what: 'integration', sinceAgo: 5 },
        });
        const poolBefore = fs.readdirSync(stage.poolDir).sort();
        const startedAt = Date.now();
        const run = startRun({
          cwd: tree.tempDir,
          env: genEnv({ stage, fakeBinDir: tree.fakeBinDir, slots: '1' }),
          args: ['--what', 'unit', '--mode', 'plan'],
        });
        const outcome = await awaitExitOrKill({ run, seconds: 20 });
        const elapsedMs = Date.now() - startedAt;
        const poolAfter = fs.readdirSync(stage.poolDir).sort();
        holder.kill();
        return {
          outcome,
          elapsedMs,
          stdout: run.stdout(),
          poolBefore,
          poolAfter,
          suitesStarted: fs.readFileSync(stage.logFile, 'utf-8'),
        };
      });

      then('it returns at once, exit 0, and never waits', () => {
        expect(result.outcome.code).toBe(0);
        expect(result.elapsedMs).toBeLessThan(15_000);
        expect(result.stdout).not.toContain('wait for one');
        expect(result.stdout).not.toContain('🎫');
      });

      then('it touches no pool file and starts no suite', () => {
        expect(result.poolAfter).toEqual(result.poolBefore);
        expect(result.suitesStarted).toBe('');
      });
    });
  });

  given('[case4] a grove with its only slot held', () => {
    when(
      '[t0] a scoped run, a lint, a nested run, and a thorough scoped run start',
      () => {
        const result = useThen('each is observed', async () => {
          const stage = genStage();
          const tree = genTree({ slug: 'tree-quick', stage });
          const holder = await holdSlot({
            poolDir: stage.poolDir,
            slot: 0,
            seconds: 30,
            record: { tree: 'tree-holder', what: 'integration', sinceAgo: 5 },
          });
          const env = genEnv({
            stage,
            fakeBinDir: tree.fakeBinDir,
            slots: '1',
          });
          const scoped = startRun({
            cwd: tree.tempDir,
            env,
            args: ['--what', 'unit', '--scope', 'example', '--mode', 'apply'],
          });
          const scopedOutcome = await scoped.done;
          const lint = startRun({
            cwd: tree.tempDir,
            env,
            args: ['--what', 'lint'],
          });
          const lintOutcome = await lint.done;
          const nested = startRun({
            cwd: tree.tempDir,
            env: { ...env, GIT_REPO_TEST_GROVE_HELD: `slot.0:${process.pid}` },
            args: ['--what', 'unit', '--mode', 'apply'],
          });
          const nestedOutcome = await nested.done;

          // a marker whose holder is gone (a daemon outlived its slot) earns no bypass
          const orphanMarkers = await Promise.all(
            [`slot.0:${getDeadPid()}`, 'slot.0'].map(async (marker) => {
              const orphan = startRun({
                cwd: tree.tempDir,
                env: { ...env, GIT_REPO_TEST_GROVE_HELD: marker },
                args: ['--what', 'unit', '--mode', 'apply'],
              });
              await waitFor({
                // an unscoped wait prints the tip after the holders; await it before the stop
                probe: () =>
                  orphan.stdout().includes('wait for one') &&
                  orphan.stdout().includes('tip:'),
                what: `run with marker ${marker} waits and names the fast lane`,
                seconds: 15,
              });
              orphan.child.kill('SIGINT');
              await orphan.done;
              return { marker, stdout: orphan.stdout() };
            }),
          );

          // a name:// scope alone loads every file, so it is bounded
          const named = startRun({
            cwd: tree.tempDir,
            env,
            args: [
              '--what',
              'unit',
              '--scope',
              'name://passes',
              '--mode',
              'apply',
            ],
          });
          await waitFor({
            // the tip prints after the holders, so await it before the stop
            probe: () =>
              named.stdout().includes('wait for one') &&
              named.stdout().includes('tip:'),
            what: 'name-scoped run waits and names the fast lane',
            seconds: 15,
          });
          named.child.kill('SIGINT');
          await named.done;
          const thorough = startRun({
            cwd: tree.tempDir,
            env,
            args: [
              '--what',
              'unit',
              '--scope',
              'example',
              '--thorough',
              '--mode',
              'apply',
            ],
          });
          await waitFor({
            probe: () => thorough.stdout().includes('wait for one'),
            what: 'thorough scoped run waits',
            seconds: 15,
          });
          thorough.child.kill('SIGINT');
          await thorough.done;
          const nomatch = startRun({
            cwd: tree.tempDir,
            env,
            args: [
              '--what',
              'unit',
              '--scope',
              'nomatch',
              '--thorough',
              '--mode',
              'apply',
            ],
          });
          const nomatchOutcome = await awaitExitOrKill({
            run: nomatch,
            seconds: 15,
          });
          holder.kill();
          return {
            scoped: { outcome: scopedOutcome, stdout: scoped.stdout() },
            lint: { outcome: lintOutcome, stdout: lint.stdout() },
            nested: { outcome: nestedOutcome, stdout: nested.stdout() },
            orphanMarkers,
            named: { stdout: named.stdout() },
            thorough: { stdout: thorough.stdout() },
            nomatch: { outcome: nomatchOutcome, stdout: nomatch.stdout() },
          };
        });

        then(
          'a thorough scoped run that matches 0 files fails fast, no wait',
          () => {
            expect(result.nomatch.outcome.code).toBe(2);
            expect(result.nomatch.stdout).toContain('matched: 0 files');
            expect(result.nomatch.stdout).not.toContain('wait for one');
          },
        );

        then('the scoped run bypasses at once and names why', () => {
          expect(result.scoped.outcome.code).toBe(0);
          expect(result.scoped.stdout).toContain('grove: bypass (scoped run)');
        });

        then('the lint bypasses at once: not a jest suite', () => {
          expect(result.lint.outcome.code).toBe(0);
          expect(result.lint.stdout).toContain(
            'grove: bypass (not a jest suite)',
          );
        });

        then('a run nested in a held slot bypasses', () => {
          expect(result.nested.outcome.code).toBe(0);
          expect(result.nested.stdout).toContain(
            'grove: bypass (nested in a held slot)',
          );
        });

        then(
          'a nest marker with a gone or absent holder pid is bounded',
          () => {
            expect(result.orphanMarkers).toHaveLength(2);
            expect(result.orphanMarkers[0]!.marker).toMatch(/^slot\.0:\d+$/);
            expect(result.orphanMarkers[1]!.marker).toBe('slot.0');
            result.orphanMarkers.forEach((orphan) => {
              expect(orphan.stdout).toContain('1 of 1 slot held, wait for one');
              expect(orphan.stdout).not.toContain('bypass');
            });
          },
        );

        then('a name:// scope alone is bounded, and waits', () => {
          expect(result.named.stdout).toContain(
            '1 of 1 slot held, wait for one',
          );
          expect(result.named.stdout).not.toContain('bypass');
        });

        then('an unscoped wait names the fast lane', () => {
          result.orphanMarkers.forEach((orphan) =>
            expect(orphan.stdout).toContain(
              'tip: a path --scope skips the wait (a name:// scope alone loads every file)',
            ),
          );
        });

        then('the name-only wait names the fast lane', () => {
          expect(result.named.stdout).toContain(
            'tip: a path --scope skips the wait (a name:// scope alone loads every file)',
          );
          expect(result.thorough.stdout).not.toContain('tip:');
        });

        then('a scoped run with --thorough is bounded, and waits', () => {
          expect(result.thorough.stdout).toContain(
            '1 of 1 slot held, wait for one',
          );
        });

        then('the bypass, nest, and fast-lane renders match snapshot', () => {
          expect(result.nested.stdout).toContain('nested in a held slot');
          expect(result.named.stdout).toContain('tip:');
          expect({
            scoped: asGroveBranch(result.scoped.stdout),
            lint: asGroveBranch(result.lint.stdout),
            nested: asGroveBranch(result.nested.stdout),
            named: asGroveBranch(result.named.stdout),
            thorough: asGroveBranch(result.thorough.stdout),
            // keyed by marker shape: a gone holder pid, and a marker with no pid
            orphans: {
              markerGonePid: asGroveBranch(result.orphanMarkers[0]!.stdout),
              markerNoPid: asGroveBranch(result.orphanMarkers[1]!.stdout),
            },
            nomatch: result.nomatch.stdout
              .split('\n')
              .filter((line) => /matched:|✋|error|grove/.test(line))
              .join('\n'),
          }).toMatchSnapshot();
        });
      },
    );
  });

  given('[case5] an invalid bound override', () => {
    when('[t0] GIT_REPO_TEST_SLOTS is 0', () => {
      const result = useThen('the run refuses', async () => {
        const stage = genStage();
        const tree = genTree({ slug: 'tree-typo', stage });
        const run = startRun({
          cwd: tree.tempDir,
          env: genEnv({ stage, fakeBinDir: tree.fakeBinDir, slots: '0' }),
          args: ['--what', 'unit', '--mode', 'apply'],
        });
        const outcome = await run.done;
        return { outcome, stdout: run.stdout(), stderr: run.stderr(), stage };
      });

      then('it exits 2 with ConstraintError on stdout and stderr', () => {
        expect(result.outcome.code).toBe(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: GIT_REPO_TEST_SLOTS must be a whole number ≥ 1',
        );
        expect(result.stderr).toContain('ConstraintError');
      });

      then('the error names the value and the fix', () => {
        expect(result.stdout).toContain('got: 0');
        expect(result.stdout).toContain('fix: export GIT_REPO_TEST_SLOTS=2');
      });

      then('the refusal matches snapshot', () => {
        expect(result.stdout).toContain('ConstraintError');
        expect(
          asRefusalSnap({
            output: result.stdout,
            stageRoot: result.stage.root,
          }),
        ).toMatchSnapshot();
      });
    });

    [
      { tn: '[t1]', slots: '-1' },
      { tn: '[t2]', slots: 'abc' },
    ].map((thisCase) =>
      when(`${thisCase.tn} GIT_REPO_TEST_SLOTS is ${thisCase.slots}`, () => {
        const result = useThen('the run refuses', async () => {
          const stage = genStage();
          const tree = genTree({ slug: 'tree-typo', stage });
          const run = startRun({
            cwd: tree.tempDir,
            env: genEnv({
              stage,
              fakeBinDir: tree.fakeBinDir,
              slots: thisCase.slots,
            }),
            args: ['--what', 'unit', '--mode', 'apply'],
          });
          const outcome = await run.done;
          return { outcome, stdout: run.stdout(), stage };
        });

        then('it exits 2 and names the value; no suite starts', () => {
          expect(result.outcome.code).toBe(2);
          expect(result.stdout).toContain(`got: ${thisCase.slots}`);
          expect(fs.readFileSync(result.stage.logFile, 'utf-8')).toBe('');
        });

        then('the refusal matches snapshot', () => {
          expect(result.stdout).toContain('ConstraintError');
          expect(
            asRefusalSnap({
              output: result.stdout,
              stageRoot: result.stage.root,
            }),
          ).toMatchSnapshot();
        });
      }),
    );

    when('[t3] GIT_REPO_TEST_SLOTS_DIR is a relative path', () => {
      const result = useThen('the run refuses', async () => {
        const stage = genStage();
        const tree = genTree({ slug: 'tree-reldir', stage });
        const run = startRun({
          cwd: tree.tempDir,
          env: {
            ...genEnv({ stage, fakeBinDir: tree.fakeBinDir, slots: '1' }),
            GIT_REPO_TEST_SLOTS_DIR: 'my-pool',
          },
          args: ['--what', 'unit', '--mode', 'apply'],
        });
        const outcome = await run.done;
        return {
          outcome,
          stdout: run.stdout(),
          stderr: run.stderr(),
          stage,
          poolMade: fs.existsSync(path.join(tree.tempDir, 'my-pool')),
        };
      });

      then('it exits 2 with ConstraintError on stdout and stderr', () => {
        expect(result.outcome.code).toBe(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: GIT_REPO_TEST_SLOTS_DIR must be an absolute path',
        );
        expect(result.stderr).toContain('ConstraintError');
      });

      then(
        'it names the value and the fix; no pool made, no suite started',
        () => {
          expect(result.stdout).toContain('got: my-pool');
          expect(result.stdout).toContain('$PWD/my-pool');
          expect(result.poolMade).toBe(false);
          expect(fs.readFileSync(result.stage.logFile, 'utf-8')).toBe('');
        },
      );

      then('the refusal matches snapshot', () => {
        expect(result.stdout).toContain('ConstraintError');
        expect(
          asRefusalSnap({
            output: result.stdout,
            stageRoot: result.stage.root,
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given(
    '[case6] the bound source, its reach, and a pool that cannot exist',
    () => {
      when('[t0] GIT_REPO_TEST_SLOTS is unset', () => {
        const result = useThen('the run completes', async () => {
          const stage = genStage();
          const tree = genTree({ slug: 'tree-cores', stage });
          const env = genEnv({ stage, fakeBinDir: tree.fakeBinDir, slots: '' });
          delete env.GIT_REPO_TEST_SLOTS;
          const run = startRun({
            cwd: tree.tempDir,
            env,
            args: ['--what', 'unit', '--mode', 'apply'],
          });
          const outcome = await run.done;

          // a caller's OpenMP thread hint must not shrink the box's bound
          const runOmp = startRun({
            cwd: tree.tempDir,
            env: { ...env, OMP_NUM_THREADS: '1', OMP_THREAD_LIMIT: '1' },
            args: ['--what', 'unit', '--mode', 'apply'],
          });
          const outcomeOmp = await runOmp.done;
          const cores = Number(
            String(
              spawnSync('env', [
                '-u',
                'OMP_NUM_THREADS',
                '-u',
                'OMP_THREAD_LIMIT',
                'nproc',
              ]).stdout,
            ).trim(),
          );
          return {
            outcome,
            stdout: run.stdout(),
            outcomeOmp,
            stdoutOmp: runOmp.stdout(),
            cores,
          };
        });

        then('the bound derives from the core count: max(1, cores ÷ 6)', () => {
          const quotient = Math.floor(result.cores / 6);
          const bound = Math.max(1, quotient);
          const noun = bound === 1 ? 'slot' : 'slots';
          // under 6 cores the quotient is 0; the label names the floor, so the sum reads true
          const floorNote = quotient < 1 ? ', min 1' : '';
          expect(result.outcome.code).toBe(0);
          expect(result.stdout).toContain(
            `bound: ${bound} ${noun} (${result.cores} cores ÷ 6${floorNote})`,
          );
        });

        then('OMP_NUM_THREADS=1 in the env leaves the bound unchanged', () => {
          expect(result.outcomeOmp.code).toBe(0);
          expect(result.stdoutOmp).toContain(`(${result.cores} cores ÷ 6`);
        });
      });

      when('[t13] the box reports 4, 6, and 24 cores', () => {
        const result = useThen('each run completes', async () => {
          const stage = genStage();
          const tree = genTree({ slug: 'tree-nproc', stage });

          /**
           * .mock = nproc, via PATH; it reports a set core count
           * .why = the floor (under 6 cores) and a large box are unseen on the
           *        host that runs the suite; [t0] proves the real nproc path
           * .real = [t0] above, against this host's real nproc
           */
          fs.writeFileSync(
            path.join(tree.fakeBinDir, 'nproc'),
            `#!/bin/bash\necho "$GROVE_FAKE_CORES"\n`,
          );
          fs.chmodSync(path.join(tree.fakeBinDir, 'nproc'), '755');

          // one run per core count, in turn, so no run waits on another
          const runWithCores = async (cores: string) => {
            const env: NodeJS.ProcessEnv = {
              ...genEnv({
                stage,
                fakeBinDir: tree.fakeBinDir,
                slots: '',
                suiteSeconds: 0,
              }),
              GROVE_FAKE_CORES: cores,
            };
            delete env.GIT_REPO_TEST_SLOTS;
            const run = startRun({
              cwd: tree.tempDir,
              env,
              args: ['--what', 'unit', '--mode', 'apply'],
            });
            const outcome = await awaitExitOrKill({ run, seconds: 30 });
            return { cores, code: outcome.code, stdout: run.stdout() };
          };
          const runs = [
            await runWithCores('4'),
            await runWithCores('6'),
            await runWithCores('24'),
          ];
          return { runs };
        });

        then('each run passes', () => {
          expect(result.runs.map((run) => run.code)).toEqual([0, 0, 0]);
        });

        then(
          'under 6 cores, the bound floors at 1 and the label says so',
          () => {
            expect(result.runs[0]!.stdout).toContain(
              'bound: 1 slot (4 cores ÷ 6, min 1)',
            );
          },
        );

        then('6 and 24 cores give 1 and 4 slots', () => {
          expect(result.runs[1]!.stdout).toContain(
            'bound: 1 slot (6 cores ÷ 6)',
          );
          expect(result.runs[2]!.stdout).toContain(
            'bound: 4 slots (24 cores ÷ 6)',
          );
        });

        then('the bound lines match snapshot', () => {
          expect(
            result.runs.map((run) => asGroveBranch(run.stdout)),
          ).toMatchSnapshot();
        });
      });

      when(
        '[t1] GIT_REPO_TEST_SLOTS=3 is set for a --what all style run',
        () => {
          const result = useThen('the run completes', async () => {
            const stage = genStage();
            const tree = genTree({ slug: 'tree-reach', stage });
            const run = startRun({
              cwd: tree.tempDir,
              env: genEnv({ stage, fakeBinDir: tree.fakeBinDir, slots: '3' }),
              args: ['--what', 'unit,unit', '--mode', 'apply'],
            });
            const outcome = await run.done;
            return { outcome, stdout: run.stdout() };
          });

          then(
            'each child reads the same bound, and the parent claims none',
            () => {
              expect(result.outcome.code).toBe(0);
              const boundLines = result.stdout.match(
                /bound: 3 slots \(GIT_REPO_TEST_SLOTS\)/g,
              );
              expect(boundLines).toHaveLength(2);
            },
          );
        },
      );

      when('[t2] the pool dir cannot be created', () => {
        const result = useThen('the run refuses', async () => {
          const stage = genStage();
          const tree = genTree({ slug: 'tree-nopool', stage });
          const blocker = path.join(stage.root, 'a-file');
          fs.writeFileSync(blocker, '');
          const env = genEnv({
            stage,
            fakeBinDir: tree.fakeBinDir,
            slots: '1',
          });
          env.GIT_REPO_TEST_SLOTS_DIR = path.join(blocker, 'pool');
          const run = startRun({
            cwd: tree.tempDir,
            env,
            args: ['--what', 'unit', '--mode', 'apply'],
          });
          const outcome = await run.done;
          return {
            outcome,
            stdout: run.stdout(),
            stderr: run.stderr(),
            stage,
          };
        });

        then('it exits 1 with MalfunctionError on stdout and stderr', () => {
          expect(result.outcome.code).toBe(1);
          expect(result.stdout).toContain(
            '💥 MalfunctionError: grove pool dir is not writable',
          );
          expect(result.stderr).toContain('MalfunctionError');
        });

        then('the error names the path and the fix; no suite starts', () => {
          expect(result.stdout).toContain('a-file/pool');
          expect(result.stdout).toContain('GIT_REPO_TEST_SLOTS_DIR');
          expect(fs.readFileSync(result.stage.logFile, 'utf-8')).toBe('');
        });

        then('the refusal matches snapshot', () => {
          expect(result.stdout).toContain('MalfunctionError');
          expect(
            asRefusalSnap({
              output: result.stdout,
              stageRoot: result.stage.root,
            }),
          ).toMatchSnapshot();
        });
      });

      when('[t3] a slot file exists that this user cannot read', () => {
        const result = useThen('the run refuses', async () => {
          const stage = genStage();
          const tree = genTree({ slug: 'tree-badslot', stage });
          const slotFile = path.join(stage.poolDir, 'slot.0.lock');
          fs.mkdirSync(stage.poolDir, { recursive: true });
          fs.writeFileSync(slotFile, '');
          fs.chmodSync(slotFile, 0o000);
          const run = startRun({
            cwd: tree.tempDir,
            env: genEnv({ stage, fakeBinDir: tree.fakeBinDir, slots: '1' }),
            args: ['--what', 'unit', '--mode', 'apply'],
          });
          const outcome = await awaitExitOrKill({ run, seconds: 15 });
          return {
            outcome,
            stdout: run.stdout(),
            stderr: run.stderr(),
            stage,
          };
        });

        then('it exits 1 with MalfunctionError, never a silent wait', () => {
          expect(result.outcome.code).toBe(1);
          expect(result.stdout).toContain(
            '💥 MalfunctionError: grove slot file is not readable',
          );
          expect(result.stderr).toContain('MalfunctionError');
        });

        then('the error names the file and the fix; no suite starts', () => {
          expect(result.stdout).toContain('slot.0.lock');
          expect(result.stdout).toContain('chmod 666');
          expect(fs.readFileSync(result.stage.logFile, 'utf-8')).toBe('');
        });

        then('the refusal matches snapshot', () => {
          expect(result.stdout).toContain('MalfunctionError');
          expect(
            asRefusalSnap({
              output: result.stdout,
              stageRoot: result.stage.root,
            }),
          ).toMatchSnapshot();
        });
      });

      when(
        '[t4] a slot file exists that this user may read but not write (as one another user made, under fs.protected_regular)',
        () => {
          const result = useThen('the run completes', async () => {
            const stage = genStage();
            const tree = genTree({ slug: 'tree-roslot', stage });
            const slotFile = path.join(stage.poolDir, 'slot.0.lock');
            fs.mkdirSync(stage.poolDir, { recursive: true });
            fs.writeFileSync(slotFile, '');
            fs.chmodSync(slotFile, 0o444);
            const run = startRun({
              cwd: tree.tempDir,
              env: genEnv({ stage, fakeBinDir: tree.fakeBinDir, slots: '1' }),
              args: ['--what', 'unit', '--mode', 'apply'],
            });
            const outcome = await awaitExitOrKill({ run, seconds: 30 });
            return { outcome, stdout: run.stdout() };
          });

          then('the run still locks it: the slot opens read-only', () => {
            expect(result.outcome.code).toBe(0);
            expect(result.stdout).toContain('🎫 slot.0 claimed');
            expect(result.stdout).not.toContain('MalfunctionError');
          });
        },
      );

      when('[t5] a --what all style run meets a busy grove', () => {
        const result = useThen('the run completes', async () => {
          const stage = genStage();
          const tree = genTree({ slug: 'tree-multiwait', stage });
          const holder = await holdSlot({
            poolDir: stage.poolDir,
            slot: 0,
            seconds: 3,
            record: { tree: 'tree-holder', what: 'integration', sinceAgo: 5 },
          });
          const run = startRun({
            cwd: tree.tempDir,
            env: genEnv({
              stage,
              fakeBinDir: tree.fakeBinDir,
              slots: '1',
              suiteSeconds: 1,
            }),
            args: ['--what', 'unit,unit', '--mode', 'apply'],
          });
          const outcome = await awaitExitOrKill({ run, seconds: 60 });
          holder.kill();
          const log = fs.readFileSync(stage.logFile, 'utf-8');
          return {
            outcome,
            stdout: run.stdout(),
            maxLive: getMaxLive(stage.logFile),
            starts: (log.match(/^start /gm) ?? []).length,
          };
        });

        then('the run exits 0, with both child suites run', () => {
          expect(result.outcome.code).toBe(0);
          expect(result.starts).toBe(2);
        });

        then('the first child waits, names the holder, then claims', () => {
          expect(result.stdout).toContain('1 of 1 slot held, wait for one');
          expect(result.stdout).toMatch(
            /slot\.0: tree-holder · integration · pid \d+/,
          );
          expect(result.stdout).toMatch(/🎫 slot\.0 claimed after \d+s/);
        });

        then('each child claims in turn; no two hold at once', () => {
          expect(result.stdout.match(/🎫 slot\.0 claimed/g)).toHaveLength(2);
          expect(result.maxLive).toBe(1);
        });

        then('the multi handoff matches snapshot', () => {
          expect(result.stdout).toContain('wait for one');
          expect(asGroveBranch(result.stdout)).toMatchSnapshot();
        });
      });

      when('[t6] a --what lint,unit --thorough run meets a busy grove', () => {
        const result = useThen('the run completes', async () => {
          const stage = genStage();
          const tree = genTree({ slug: 'tree-lintunit', stage });
          const holder = await holdSlot({
            poolDir: stage.poolDir,
            slot: 0,
            // outlasts the lint child under load, so the unit child must meet it held
            seconds: 8,
            record: { tree: 'tree-holder', what: 'integration', sinceAgo: 5 },
          });
          const run = startRun({
            cwd: tree.tempDir,
            env: genEnv({
              stage,
              fakeBinDir: tree.fakeBinDir,
              slots: '1',
              suiteSeconds: 1,
            }),
            args: ['--what', 'lint,unit', '--thorough', '--mode', 'apply'],
          });
          const outcome = await awaitExitOrKill({ run, seconds: 60 });
          holder.kill();
          return { outcome, stdout: run.stdout() };
        });

        then('the run exits 0', () => {
          expect(result.outcome.code).toBe(0);
        });

        then('the lint child bypasses at once, even with --thorough', () => {
          expect(result.stdout).toContain('grove: bypass (not a jest suite)');
        });

        then(
          'the thorough unit child is bounded: it waits, then claims',
          () => {
            expect(result.stdout).toContain('1 of 1 slot held, wait for one');
            expect(result.stdout).toMatch(/🎫 slot\.0 claimed after \d+s/);
          },
        );
      });

      when(
        '[t7] a multi run waits behind a holder that is sent SIGKILL',
        () => {
          const result = useThen('the run completes', async () => {
            const stage = genStage();
            const tree = genTree({ slug: 'tree-multikill', stage });
            const holder = await holdSlot({
              poolDir: stage.poolDir,
              slot: 0,
              seconds: 60,
              record: { tree: 'tree-holder', what: 'integration', sinceAgo: 5 },
            });
            const run = startRun({
              cwd: tree.tempDir,
              env: genEnv({
                stage,
                fakeBinDir: tree.fakeBinDir,
                slots: '1',
                suiteSeconds: 1,
              }),
              args: ['--what', 'unit,unit', '--mode', 'apply'],
            });
            await waitFor({
              probe: () => run.stdout().includes('wait for one'),
              what: 'the first child waits',
              seconds: 15,
            });
            const killedAt = Date.now();
            holder.kill('SIGKILL');
            await waitFor({
              probe: () => run.stdout().includes('🎫 slot.0 claimed after'),
              what: 'the child claims',
              seconds: 10,
            });
            const claimLagMs = Date.now() - killedAt;
            const outcome = await awaitExitOrKill({ run, seconds: 60 });
            return { outcome, stdout: run.stdout(), claimLagMs };
          });

          then(
            'the child that waits claims the freed slot within a few polls',
            () => {
              expect(result.claimLagMs).toBeLessThan(5000);
            },
          );

          then('both children run; the parent exits 0', () => {
            expect(result.outcome.code).toBe(0);
            expect(result.stdout.match(/🎫 slot\.0 claimed/g)).toHaveLength(2);
          });
        },
      );

      when('[t8] a multi run is sent SIGINT while its child waits', () => {
        const result = useThen('the run exits', async () => {
          const stage = genStage();
          const tree = genTree({ slug: 'tree-multistop', stage });
          const holder = await holdSlot({
            poolDir: stage.poolDir,
            slot: 0,
            seconds: 30,
            record: { tree: 'tree-holder', what: 'integration', sinceAgo: 5 },
          });
          const run = startRun({
            cwd: tree.tempDir,
            env: genEnv({ stage, fakeBinDir: tree.fakeBinDir, slots: '1' }),
            args: ['--what', 'unit,unit', '--mode', 'apply'],
          });
          await waitFor({
            probe: () => run.stdout().includes('wait for one'),
            what: 'the child waits',
            seconds: 15,
          });
          run.child.kill('SIGINT');
          const outcome = await awaitExitOrKill({ run, seconds: 15 });
          holder.kill();
          return {
            outcome,
            stdout: run.stdout(),
            stderr: run.stderr(),
            suitesStarted: fs.readFileSync(stage.logFile, 'utf-8'),
          };
        });

        then('it exits 130, with no suite started', () => {
          expect(result.outcome.code).toBe(130);
          expect(result.suitesStarted).toBe('');
        });

        then('one stop line, which says that no test tree had started', () => {
          [result.stdout, result.stderr].forEach((stream) => {
            expect(stream.match(/🌙 stopped by/g)).toHaveLength(1);
            expect(stream).toContain('no test tree had started');
            expect(stream).not.toContain('the test tree is down');
          });
        });

        then(
          'the stop line names the signal sent and the exit it returns',
          () => {
            const line =
              '🌙 stopped by sigint; no test tree had started (exit 130)';
            expect(result.stdout).toContain(line);
            expect(result.stderr).toContain(line);
          },
        );

        then('the stop render matches snapshot, both streams', () => {
          expect(result.stdout).toContain('no test tree had started');
          expect({
            stdout: asGroveBranch(result.stdout),
            stderr: asGroveBranch(result.stderr),
          }).toMatchSnapshot();
        });
      });

      when(
        '[t9] a nested run whose env lost the nest marker meets the slot its own parent holds',
        () => {
          const result = useThen('the run refuses', async () => {
            const stage = genStage();
            const tree = genTree({ slug: 'tree-orphanest', stage });
            fs.mkdirSync(stage.poolDir, { recursive: true });
            fs.writeFileSync(path.join(stage.poolDir, 'slot.0.lock'), '');

            // the parent holds slot.0, records itself, then spawns the skill with no marker
            const parentScript = [
              'exec 9<"$GROVE_TEST_LOCK"',
              'flock 9',
              'printf "tree=tree-parent\\nwhat=integration\\nsince=%s\\n" "$(date +%s)" > "$GROVE_TEST_POOL/slot.0.holder.$$"',
              'env -u GIT_REPO_TEST_GROVE_HELD bash "$GROVE_TEST_SKILL" --what unit --mode apply 9<&-',
              // a final command stops bash from exec of the skill line, so the parent stays the holder
              'exit $?',
            ].join('\n');
            const child = spawn('bash', ['-c', parentScript], {
              cwd: tree.tempDir,
              env: {
                ...genEnv({ stage, fakeBinDir: tree.fakeBinDir, slots: '1' }),
                GROVE_TEST_LOCK: path.join(stage.poolDir, 'slot.0.lock'),
                GROVE_TEST_POOL: stage.poolDir,
                GROVE_TEST_SKILL: scriptPath,
              },
              stdio: ['ignore', 'pipe', 'pipe'],
            });
            const chunksOut: string[] = [];
            const chunksErr: string[] = [];
            child.stdout!.on('data', (chunk) => chunksOut.push(String(chunk)));
            child.stderr!.on('data', (chunk) => chunksErr.push(String(chunk)));
            const run: LiveRun = {
              child,
              stdout: () => chunksOut.join(''),
              stderr: () => chunksErr.join(''),
              done: new Promise((fulfil) =>
                child.on('close', (code, signal) => fulfil({ code, signal })),
              ),
            };
            const outcome = await awaitExitOrKill({ run, seconds: 20 });
            return {
              outcome,
              stdout: run.stdout(),
              stderr: run.stderr(),
              stageRoot: stage.root,
              suitesStarted: fs.readFileSync(stage.logFile, 'utf-8'),
            };
          });

          then('the refusal matches snapshot', () => {
            expect(result.stdout).toContain('waits on its own ancestor');
            expect(
              asRefusalSnap({
                output: result.stdout,
                stageRoot: result.stageRoot,
              }).replace(/\b(pid|kill) \d+/g, '$1 <pid>'),
            ).toMatchSnapshot();
          });

          then('it exits 2 at once, never a wait for itself', () => {
            expect(result.outcome.code).toBe(2);
            expect(result.suitesStarted).toBe('');
          });

          then('it names the cause and the fix, on both streams', () => {
            const line =
              '✋ ConstraintError: this run waits on its own ancestor';
            expect(result.stdout).toContain(line);
            expect(result.stderr).toContain(line);
            expect(result.stdout).toContain('GIT_REPO_TEST_GROVE_HELD');
          });
        },
      );

      when('[t11] the bound was lowered while a higher slot is held', () => {
        const result = useThen('the run completes', async () => {
          const stage = genStage();
          const holder = await holdSlot({
            poolDir: stage.poolDir,
            slot: 1,
            seconds: 30,
            record: { tree: 'tree-wide', what: 'unit', sinceAgo: 2 },
          });
          const tree = genTree({ slug: 'tree-narrow', stage });
          const run = startRun({
            cwd: tree.tempDir,
            env: genEnv({ stage, fakeBinDir: tree.fakeBinDir, slots: '1' }),
            args: ['--what', 'unit', '--mode', 'apply'],
          });
          const outcome = await awaitExitOrKill({ run, seconds: 30 });
          const holderAlive = isAlive(holder.pid!);
          holder.kill();
          return { outcome, stdout: run.stdout(), holderAlive };
        });

        then('it tries only slot.0, claims it at once, and runs', () => {
          expect(result.outcome.code).toBe(0);
          expect(result.stdout).toContain('bound: 1 slot');
          expect(result.stdout).toContain('🎫 slot.0 claimed');
          expect(result.stdout).not.toContain('wait for one');
        });

        then('the holder of the higher slot runs on undisturbed', () => {
          expect(result.holderAlive).toBe(true);
        });
      });

      when('[t12] the bound was raised while slot.0 is held', () => {
        const result = useThen('the run completes', async () => {
          const stage = genStage();
          const holder = await holdSlot({
            poolDir: stage.poolDir,
            slot: 0,
            seconds: 30,
            record: { tree: 'tree-first', what: 'unit', sinceAgo: 2 },
          });
          const tree = genTree({ slug: 'tree-second', stage });
          const run = startRun({
            cwd: tree.tempDir,
            env: genEnv({ stage, fakeBinDir: tree.fakeBinDir, slots: '2' }),
            args: ['--what', 'unit', '--mode', 'apply'],
          });
          const outcome = await awaitExitOrKill({ run, seconds: 30 });
          holder.kill();
          return { outcome, stdout: run.stdout() };
        });

        then('it sees the new slot at once: claims slot.1, no wait', () => {
          expect(result.outcome.code).toBe(0);
          expect(result.stdout).toContain('bound: 2 slots');
          expect(result.stdout).toContain('🎫 slot.1 claimed');
          expect(result.stdout).not.toContain('wait for one');
        });
      });

      when('[t10] a --what unit,unit run passes --timeout', () => {
        const result = useThen('the run times out', async () => {
          const stage = genStage();
          const tree = genTree({ slug: 'tree-multitimeout', stage });
          const run = startRun({
            cwd: tree.tempDir,
            env: genEnv({
              stage,
              fakeBinDir: tree.fakeBinDir,
              slots: '1',
              suiteSeconds: 6,
            }),
            args: ['--what', 'unit,unit', '--timeout', '1', '--mode', 'apply'],
          });
          const outcome = await awaitExitOrKill({ run, seconds: 30 });
          return { outcome, stdout: run.stdout() };
        });

        then('the child honors it: the run stops at the timeout', () => {
          expect(result.outcome.code).not.toBe(0);
          expect(result.stdout).toContain('test exceeded 1s timeout');
        });
      });
    },
  );

  /**
   * .what = a PATH that holds every tool of the given PATH except the named ones
   * .why = proves a fallback path on a box that has the tool (setsid is absent on macos)
   */
  const genPathWithout = (input: {
    path: string;
    absent: string[];
    root: string;
  }): string => {
    const shimDir = path.join(input.root, 'shim-bin');
    fs.mkdirSync(shimDir, { recursive: true });
    const seen = new Set<string>(input.absent);
    input.path
      .split(':')
      .filter((dir) => fs.existsSync(dir) && fs.statSync(dir).isDirectory())
      .forEach((dir) =>
        fs.readdirSync(dir).forEach((name) => {
          if (seen.has(name)) return;
          seen.add(name);
          fs.symlinkSync(path.join(dir, name), path.join(shimDir, name));
        }),
      );
    return shimDir;
  };

  given(
    '[case8] the default pool dir, on a box with or without /run/lock',
    () => {
      const opsPath = path.join(__dirname, 'git.repo.test.grove.operations.sh');

      /**
       * .what = source the grove operations, set a few globals, run one command
       * .why = the default dir hangs on a host path no test may own; the seam is the global
       */
      const runOps = (input: { prelude: string; call: string }) =>
        spawnSync(
          'bash',
          [
            '-c',
            `emit_to_both() { tee /dev/stderr; }; source "$1"; ${input.prelude}; ${input.call}`,
            'grove-ops',
            opsPath,
          ],
          { encoding: 'utf-8', env: { PATH: process.env.PATH } },
        );

      when('[t0] /run/lock is open to all (1777)', () => {
        then('the default is the per-machine dir under it', () => {
          const stage = genStage();
          const runLock = path.join(stage.root, 'run-lock');
          fs.mkdirSync(runLock);
          fs.chmodSync(runLock, 0o1777);
          const result = runOps({
            prelude: `GROVE_RUN_LOCK="${runLock}"`,
            call: 'get_grove_dir_default',
          });
          expect(result.status).toBe(0);
          expect(result.stdout.trim()).toBe(
            path.join(runLock, 'rhachet', 'git.repo.test'),
          );
        });
      });

      when('[t1] /run/lock is absent (as macos)', () => {
        then('the default falls back to /tmp/rhachet/git.repo.test', () => {
          const stage = genStage();
          const result = runOps({
            prelude: `GROVE_RUN_LOCK="${path.join(stage.root, 'absent')}"`,
            call: 'get_grove_dir_default',
          });
          expect(result.status).toBe(0);
          expect(result.stdout.trim()).toBe('/tmp/rhachet/git.repo.test');
        });
      });

      when('[t2] /run/lock exists but this user may not write it', () => {
        then('the default falls back to /tmp/rhachet/git.repo.test', () => {
          const stage = genStage();
          const runLock = path.join(stage.root, 'run-lock-closed');
          fs.mkdirSync(runLock);
          fs.chmodSync(runLock, 0o555);
          const result = runOps({
            prelude: `GROVE_RUN_LOCK="${runLock}"`,
            call: 'get_grove_dir_default',
          });
          fs.chmodSync(runLock, 0o755);
          expect(result.status).toBe(0);
          expect(result.stdout.trim()).toBe('/tmp/rhachet/git.repo.test');
        });
      });

      when(
        '[t3] /run/lock is writable by this user alone, not by all (0755, as a group-only distro)',
        () => {
          then(
            'the default falls back to /tmp: the choice keys on the dir mode, not the caller',
            () => {
              const stage = genStage();
              const runLock = path.join(stage.root, 'run-lock-owner');
              fs.mkdirSync(runLock);
              fs.chmodSync(runLock, 0o755);
              const result = runOps({
                prelude: `GROVE_RUN_LOCK="${runLock}"`,
                call: 'get_grove_dir_default',
              });
              expect(result.status).toBe(0);
              expect(result.stdout.trim()).toBe('/tmp/rhachet/git.repo.test');
            },
          );
        },
      );

      when('[t4] the default pool and its parent are both absent', () => {
        then('both are created sticky and open to all (1777)', () => {
          const stage = genStage();
          const runLock = path.join(stage.root, 'run-lock');
          fs.mkdirSync(runLock);
          fs.chmodSync(runLock, 0o1777);
          const parent = path.join(runLock, 'rhachet');
          const pool = path.join(parent, 'git.repo.test');
          const result = runOps({
            prelude: `GROVE_RUN_LOCK="${runLock}"; unset GIT_REPO_TEST_SLOTS_DIR`,
            call: 'set_grove_dir && echo "dir=$GROVE_DIR"',
          });
          expect(result.status).toBe(0);
          expect(result.stdout.trim()).toBe(`dir=${pool}`);
          expect(fs.statSync(parent).mode & 0o7777).toBe(0o1777);
          expect(fs.statSync(pool).mode & 0o7777).toBe(0o1777);
        });
      });

      when(
        '[t6] a live holder record vanishes or cannot be read as a waiter reads it',
        () => {
          then(
            'the waiter skips it and lives on (set -e), the holder shown as unknown',
            () => {
              const stage = genStage();
              fs.mkdirSync(stage.poolDir, { recursive: true });
              const record = path.join(
                stage.poolDir,
                `slot.0.holder.${process.pid}`,
              );
              fs.writeFileSync(record, 'tree=tree-gone\nwhat=unit\nsince=1\n');
              fs.chmodSync(record, 0o000);
              const result = runOps({
                prelude: `set -euo pipefail; GROVE_DIR="${stage.poolDir}"`,
                call: 'set_grove_holder_vars 0; echo "holder=$GROVE_HOLDER_TREE/$GROVE_HOLDER_PID"',
              });
              fs.chmodSync(record, 0o644);
              expect(result.status).toBe(0);
              expect(result.stdout.trim()).toBe('holder=?/?');
            },
          );
        },
      );

      when('[t5] an override pool and its parent are both absent', () => {
        then(
          'the pool is shared (1777); its parent keeps the caller umask',
          () => {
            const stage = genStage();
            const parent = path.join(stage.root, 'mine');
            const pool = path.join(parent, 'pool');
            const result = runOps({
              prelude: `umask 022; export GIT_REPO_TEST_SLOTS_DIR="${pool}"`,
              call: 'set_grove_dir && echo "dir=$GROVE_DIR"',
            });
            expect(result.status).toBe(0);
            expect(result.stdout.trim()).toBe(`dir=${pool}`);
            expect(fs.statSync(parent).mode & 0o7777).toBe(0o755);
            expect(fs.statSync(pool).mode & 0o7777).toBe(0o1777);
          },
        );
      });
    },
  );

  given('[case7] a box with no setsid (as stock macos)', () => {
    when('[t0] a holder is sent SIGTERM mid-run', () => {
      const result = useThen('the holder exits', async () => {
        const stage = genStage();
        const tree = genTree({ slug: 'tree-nosetsid', stage });
        const env = genEnv({
          stage,
          fakeBinDir: tree.fakeBinDir,
          slots: '1',
          suiteSeconds: 60,
        });
        env.PATH = genPathWithout({
          path: env.PATH!,
          absent: ['setsid'],
          root: stage.root,
        });
        const shimHasSetsid = spawnSync('bash', ['-c', 'command -v setsid'], {
          env,
        }).status;
        const holder = startRun({
          cwd: tree.tempDir,
          env,
          args: ['--what', 'unit', '--mode', 'apply'],
        });
        await waitFor({
          probe: () => getLivePids(stage.liveDir).length === 1,
          what: 'holder suite start',
          seconds: 15,
        });
        const [suitePid] = getLivePids(stage.liveDir);
        const grandchildFile = path.join(
          stage.root,
          `grandchild.${suitePid}.pid`,
        );
        await waitFor({
          probe: () => fs.existsSync(grandchildFile),
          what: 'the suite starts its grandchild',
          seconds: 5,
        });
        const grandchildPid = Number(
          fs.readFileSync(grandchildFile, 'utf-8').trim(),
        );
        holder.child.kill('SIGTERM');
        const outcome = await awaitExitOrKill({ run: holder, seconds: 15 });
        const deadline = Date.now() + 5000;
        while (Date.now() < deadline && isAlive(grandchildPid)) {
          await new Promise((wake) => setTimeout(wake, 100));
        }
        const grandchildAlive = isAlive(grandchildPid);
        if (grandchildAlive) process.kill(grandchildPid, 'SIGKILL');
        return {
          outcome,
          grandchildAlive,
          shimHasSetsid,
          stdout: holder.stdout(),
          stderr: holder.stderr(),
        };
      });

      then('the shim PATH truly lacks setsid', () => {
        expect(result.shimHasSetsid).not.toBe(0);
      });

      then('the holder exits 143 and says it stopped, on both streams', () => {
        const line = '🌙 stopped by sigterm; the test tree is down (exit 143)';
        expect(result.outcome.code).toBe(143);
        expect(result.stdout).toContain(line);
        expect(result.stderr).toContain(line);
      });

      then('the stop render matches snapshot', () => {
        expect(result.stdout).toContain('stopped by sigterm');
        expect(asGroveBranch(result.stdout)).toMatchSnapshot();
      });

      then('no suite process survives it, grandchild included', () => {
        expect(result.grandchildAlive).toBe(false);
      });
    });

    when('[t1] a full suite runs on a box with no flock', () => {
      const result = useThen('the run completes', async () => {
        const stage = genStage();
        const tree = genTree({ slug: 'tree-noflock', stage });
        const env = genEnv({ stage, fakeBinDir: tree.fakeBinDir, slots: '1' });
        env.PATH = genPathWithout({
          path: env.PATH!,
          absent: ['flock'],
          root: stage.root,
        });
        const shimHasFlock = spawnSync('bash', ['-c', 'command -v flock'], {
          env,
        }).status;
        const run = startRun({
          cwd: tree.tempDir,
          env,
          args: ['--what', 'unit', '--mode', 'apply'],
        });
        const outcome = await awaitExitOrKill({ run, seconds: 30 });
        return {
          outcome,
          shimHasFlock,
          stdout: run.stdout(),
          poolMade: fs.existsSync(stage.poolDir),
          starts: (
            fs.readFileSync(stage.logFile, 'utf-8').match(/^start /gm) ?? []
          ).length,
        };
      });

      then('the shim PATH truly lacks flock', () => {
        expect(result.shimHasFlock).not.toBe(0);
      });

      then('the run still runs its suite and exits 0', () => {
        expect(result.outcome.code).toBe(0);
        expect(result.starts).toBe(1);
      });

      then('it says, loud, that it runs unbounded and how to fix that', () => {
        expect(result.stdout).toContain(
          'grove: ⚠️ unbounded (flock not found; install it to bound suites: util-linux on linux, brew install flock on macos)',
        );
        expect(result.stdout).not.toContain('🎫');
      });

      then('the grove branch matches snapshot', () => {
        expect(result.stdout).toContain('unbounded');
        expect(asGroveBranch(result.stdout)).toMatchSnapshot();
      });

      then('it makes no pool dir', () => {
        expect(result.poolMade).toBe(false);
      });
    });
  });
});
