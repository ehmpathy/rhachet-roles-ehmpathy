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
   * .what = a temp repo whose fake npm records each suite start and the live count
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

    // mock jest --listTests, for scoped runs
    const jestBinDir = path.join(tempDir, 'node_modules', '.bin');
    fs.mkdirSync(jestBinDir, { recursive: true });
    fs.writeFileSync(
      path.join(jestBinDir, 'jest'),
      `#!/bin/bash
if [[ "$*" == *"--listTests"* ]]; then echo "${tempDir}/src/example.test.js"; exit 0; fi
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
sleep "\${GROVE_FAKE_SUITE_SECONDS:-2}"
rm -f "${input.stage.liveDir}/$$"
echo "end ${input.slug} pid=$$" >> "${input.stage.logFile}"
echo "Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Time:        0.1 s"
exit 0
`,
    );
    fs.chmodSync(path.join(fakeBinDir, 'npm'), '755');

    spawnSync('git', ['add', '.'], { cwd: tempDir });
    spawnSync('git', ['commit', '-m', 'initial'], { cwd: tempDir });
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
    record: { tree: string; what: string; sinceAgo: number };
  }): Promise<ChildProcess> => {
    fs.mkdirSync(input.poolDir, { recursive: true });
    const lockFile = path.join(input.poolDir, `slot.${input.slot}.lock`);
    const holder = spawn('flock', [lockFile, 'sleep', String(input.seconds)], {
      stdio: 'ignore',
    });
    await waitFor({
      probe: () => spawnSync('flock', ['-n', lockFile, 'true']).status === 1,
      what: 'holder takes the lock',
      seconds: 10,
    });
    fs.writeFileSync(
      path.join(input.poolDir, `slot.${input.slot}.holder`),
      [
        `tree=${input.record.tree}`,
        `what=${input.record.what}`,
        `pid=${holder.pid}`,
        `since=${Math.floor(Date.now() / 1000) - input.record.sinceAgo}`,
      ].join('\n') + '\n',
    );
    return holder;
  };

  /**
   * .what = the grove branch lines of a run's stdout, with pids and ages masked
   */
  const asGroveBranch = (stdout: string): string =>
    stdout
      .split('\n')
      .filter((line) => /grove|bound:|slot|⏳|🎫|⚠️|kill /.test(line))
      .join('\n')
      .replace(/pid \d+/g, 'pid <pid>')
      .replace(/kill \d+/g, 'kill <pid>')
      .replace(/\d+m\d\ds|\b\d+s\b/g, '<age>');

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
        expect(result.stdout).toContain('⏳ still held (30s)');
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
      });

      then('the waiter never killed the holder itself', () => {
        expect(result.holderAlive).toBe(true);
      });
    });
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
          fs.mkdirSync(stage.poolDir, { recursive: true });
          fs.writeFileSync(
            path.join(stage.poolDir, 'slot.0.holder'),
            'tree=tree-gone\nwhat=unit\npid=999999\nsince=1\n',
          );
          const run = startRun({
            cwd: tree.tempDir,
            env: genEnv({ stage, fakeBinDir: tree.fakeBinDir, slots: '1' }),
            args: ['--what', 'unit', '--mode', 'apply'],
          });
          const outcome = await run.done;
          const record = fs.readFileSync(
            path.join(stage.poolDir, 'slot.0.holder'),
            'utf-8',
          );
          return { outcome, stdout: run.stdout(), record };
        });

        then('the run claims at once, with no wait', () => {
          expect(result.outcome.code).toBe(0);
          expect(result.stdout).toContain('🎫 slot.0 claimed');
          expect(result.stdout).not.toContain('wait for one');
        });

        then('the record is overwritten with the new holder', () => {
          expect(result.record).toContain('tree=');
          expect(result.record).not.toContain('tree-gone');
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
          await waitFor({
            probe: () => run.stdout().includes('wait for one'),
            what: 'waiter waits',
            seconds: 15,
          });
          run.child.kill('SIGINT');
          const outcome = await run.done;
          const record = fs.readFileSync(
            path.join(stage.poolDir, 'slot.0.holder'),
            'utf-8',
          );
          const holderAlive = isAlive(holder.pid!);
          holder.kill();
          return {
            outcome,
            record,
            holderAlive,
            suitesStarted: fs.readFileSync(stage.logFile, 'utf-8'),
          };
        });

        then('it exits 130, with no suite started', () => {
          expect(result.outcome.code).toBe(130);
          expect(result.suitesStarted).toBe('');
        });

        then('it wrote no holder record', () => {
          expect(result.record).toContain('tree=tree-holder');
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
            suiteAliveAfterHolder,
            outcome,
            stdout: waiter.stdout(),
          };
        });

        then('the holder exits 143', () => {
          expect(result.holderOutcome.code).toBe(143);
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
            return { outcome, parentExitMs, suiteAlive: isAlive(suitePid!) };
          });

          then('the parent exits 143 at once, not after the suite', () => {
            expect(result.outcome.code).toBe(143);
            expect(result.parentExitMs).toBeLessThan(10_000);
          });

          then('the child suite is stopped, not left to run on', () => {
            expect(result.suiteAlive).toBe(false);
          });
        },
      );
    },
  );

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
            env: { ...env, GIT_REPO_TEST_GROVE_HELD: 'slot.0' },
            args: ['--what', 'unit', '--mode', 'apply'],
          });
          const nestedOutcome = await nested.done;
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
          holder.kill();
          return {
            scoped: { outcome: scopedOutcome, stdout: scoped.stdout() },
            lint: { outcome: lintOutcome, stdout: lint.stdout() },
            nested: { outcome: nestedOutcome, stdout: nested.stdout() },
            thorough: { stdout: thorough.stdout() },
          };
        });

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

        then('a scoped run with --thorough is bounded, and waits', () => {
          expect(result.thorough.stdout).toContain(
            '1 of 1 slot held, wait for one',
          );
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
        return { outcome, stdout: run.stdout(), stderr: run.stderr() };
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
      }),
    );
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
          const cores = Number(String(spawnSync('nproc', []).stdout).trim());
          return { outcome, stdout: run.stdout(), cores };
        });

        then('the bound derives from the core count: max(1, cores ÷ 6)', () => {
          const bound = Math.max(1, Math.floor(result.cores / 6));
          const noun = bound === 1 ? 'slot' : 'slots';
          expect(result.outcome.code).toBe(0);
          expect(result.stdout).toContain(
            `bound: ${bound} ${noun} (${result.cores} cores ÷ 6)`,
          );
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
      });
    },
  );
});
