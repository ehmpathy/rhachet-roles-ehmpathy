import * as fs from 'fs';
import * as path from 'path';
import { given, then, useThen, when } from 'test-fns';

import { genWatchTestScene } from './.test.utils/genWatchTestScene';
import { getAllWatchDaemonPids } from './.test.utils/getAllWatchDaemonPids';
import { isPidAlive } from './.test.utils/isPidAlive';
import { waitForWatch } from './.test.utils/waitForWatch';

/**
 * .what = the pr-watch state a watch or a daemon leaves behind is reaped
 * .why  = a pr cache, a bin copy, and a log that grows each tick would else stay on
 *         the box for the life of the key
 */
/**
 * .mock = github (`gh api`), the clone registry (`rhachet`), and the keyrack token
 *         read answer from genWatchTestScene stub bins on PATH; the skill, the
 *         daemon, and the filesystem run for real
 * .why  = an outage and a stale log cannot be forced on the real services on demand
 * .real = git.pull.watch.github.real.integration.test.ts (TEST_LIVE=github) and
 *         git.pull.watch.rhachet.real.integration.test.ts
 */
jest.setTimeout(300_000);

const SERIAL = 'a1a1a1a1-0000-4000-8000-00000000000a';
const REPO = 'ehmpathy/surf-demo';

/**
 * .what = an open pr in the stub store, with no checks
 */
const setPrOpen = (input: {
  scene: ReturnType<typeof genWatchTestScene>;
  pr: string;
}): void => {
  input.scene.setStore((store) => {
    store.github.prs[`${REPO}#${input.pr}`] = {
      state: 'open',
      merged: false,
      headSha: `sha-${input.pr}`,
      closedBy: null,
    };
  });
};

/**
 * .what = the key dir that holds one watch record
 */
const asKeyDir = (recordPath: string): string =>
  path.dirname(path.dirname(recordPath));

describe('git.pull.watch reap', () => {
  given('[case1] a clone that watches two prs, then stops each', () => {
    const scene = genWatchTestScene({
      slug: 'watch-reap-cache',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL, slug: 'mechanic', reachState: 'LIVE' },
      ];
    });
    setPrOpen({ scene, pr: '1220' });
    setPrOpen({ scene, pr: '1221' });
    afterAll(() => scene.stopAllDaemons());
    const runVerb = (verb: 'set' | 'del', pr: string) =>
      scene.runSkill({
        verb,
        args: ['--which', pr, '--mode', 'apply'],
        root: scene.roots['surf-demo']!,
        serial: SERIAL,
      });

    when('[t0] both prs prime, then the clone stops #1220', () => {
      const result = useThen('the watch of #1220 is gone', async () => {
        runVerb('set', '1220');
        runVerb('set', '1221');
        await scene.waitForPrimed();
        await scene.waitForDaemonTicks({ ticks: 1 });
        const keyDir = asKeyDir(scene.getAllWatchRecords()[0]!.path);
        const cacheBefore = fs.readdirSync(path.join(keyDir, 'cache')).sort();
        const del = runVerb('del', '1220');
        return {
          keyDir,
          cacheBefore,
          del,
          cacheAfter: fs.readdirSync(path.join(keyDir, 'cache')).sort(),
        };
      });
      then('each pr held a cache dir before the stop', () => {
        expect(result.cacheBefore).toContain('ehmpathy.surf-demo.pr=1220');
        expect(result.cacheBefore).toContain('ehmpathy.surf-demo.pr=1221');
      });
      then('the cache of #1220 goes; the cache of #1221 stays', () => {
        expect(result.del.status).toEqual(0);
        expect(result.cacheAfter).not.toContain('ehmpathy.surf-demo.pr=1220');
        expect(result.cacheAfter).toContain('ehmpathy.surf-demo.pr=1221');
      });
    });

    when('[t1] the clone stops #1221, its last watch', () => {
      const result = useThen('the daemon exits', async () => {
        const keyDir = asKeyDir(scene.getAllWatchRecords()[0]!.path);
        const [pid] = getAllWatchDaemonPids({ home: scene.home });
        runVerb('del', '1221');
        await waitForWatch({
          label: 'daemon idle exit',
          check: () => !isPidAlive(pid!),
          scene,
        });
        return { keyDir };
      });
      then('the cache and the bin copy go with the daemon', () => {
        expect(fs.existsSync(path.join(result.keyDir, 'cache'))).toEqual(false);
        expect(fs.existsSync(path.join(result.keyDir, 'bin'))).toEqual(false);
      });
      then('the log stays, for a reader who asks why it left', () => {
        expect(
          fs.readFileSync(path.join(result.keyDir, 'daemon.log'), 'utf-8'),
        ).toContain('zero watches; exit');
      });
    });

    when('[t2] the clone watches #1220 again', () => {
      const result = useThen('a fresh daemon boots', async () => {
        const set = runVerb('set', '1220');
        await scene.waitForPrimed();
        return { set };
      });
      then('the set spawns a daemon from a fresh bin copy', () => {
        expect(result.set.status).toEqual(0);
        expect(result.set.stdout).toContain('spawned');
        expect(getAllWatchDaemonPids({ home: scene.home })).toHaveLength(1);
      });
    });
  });

  given('[case2] a daemon whose log outgrew its cap', () => {
    const scene = genWatchTestScene({
      slug: 'watch-reap-log',
      repos: ['surf-demo'],
      store: {},
      env: { GIT_PULL_WATCH_LOG_MAX_BYTES: '4096' },
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL, slug: 'mechanic', reachState: 'LIVE' },
      ];
    });
    setPrOpen({ scene, pr: '1220' });
    afterAll(() => scene.stopAllDaemons());

    when('[t0] a 64 KB log stands when the daemon boots', () => {
      const result = useThen('the daemon boots', async () => {
        scene.runSkill({
          verb: 'set',
          args: ['--which', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL,
        });
        await scene.waitForPrimed();
        const keyDir = asKeyDir(scene.getAllWatchRecords()[0]!.path);
        const log = path.join(keyDir, 'daemon.log');
        scene.stopAllDaemons();
        fs.appendFileSync(log, 'an old wave line\n'.repeat(4096));
        fs.rmSync(path.join(keyDir, 'daemon.pid'), { force: true });
        scene.runSkill({
          verb: 'set',
          args: ['--which', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL,
        });
        await scene.waitForDaemonTicks({ ticks: 1 });
        return { log: fs.readFileSync(log, 'utf-8') };
      });
      then('the log keeps its last 4 KB, plus what the new life wrote', () => {
        expect(result.log.length).toBeLessThan(4096 + 1024);
      });
      then('the boot line of the new life is in it', () => {
        expect(result.log).toMatch(/boot: daemon pid \d+ key /);
      });
    });
  });

  given('[case3] a fault that recurs each tick', () => {
    const scene = genWatchTestScene({
      slug: 'watch-reap-repeat',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL, slug: 'mechanic', reachState: 'LIVE' },
      ];
    });
    setPrOpen({ scene, pr: '1220' });
    afterAll(() => scene.stopAllDaemons());

    when('[t0] github stays down for many ticks', () => {
      const result = useThen('the ticks pass', async () => {
        scene.runSkill({
          verb: 'set',
          args: ['--which', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL,
        });
        await scene.waitForPrimed();
        scene.setStore((store) => {
          store.github.fault = 'down';
        });
        await scene.waitForDaemonTicks({ ticks: 5 });
        const keyDir = asKeyDir(scene.getAllWatchRecords()[0]!.path);
        return {
          log: fs.readFileSync(path.join(keyDir, 'daemon.log'), 'utf-8'),
        };
      });
      then('the fault logs once, not once per tick', () => {
        const lines = result.log
          .split('\n')
          .filter((line) =>
            line.includes(`github unreachable for ${REPO}#1220; cursors hold`),
          );
        expect(lines).toHaveLength(1);
      });
    });
  });
});
