import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { given, then, useThen, when } from 'test-fns';

import { genWatchSkillCopy } from './__test_utils__/genWatchSkillCopy';
import {
  genWatchTestScene,
  type WatchScene,
} from './__test_utils__/genWatchTestScene';
import { getAllWatchDaemonPids } from './__test_utils__/getAllWatchDaemonPids';
import { isPidAlive } from './__test_utils__/isPidAlive';
import { waitForWatch } from './__test_utils__/waitForWatch';

/**
 * .what = the daemon lifecycle: one per key, shared, findserted, replaced when
 *         stale or wedged, gone at zero watches, never tied to its spawner
 * .why  = vision demo cases 4, 5, 6, 9, 10, 12, 14 and invariants F1, F3, F4, F9, F10, F11
 */
/**
 * .mock = github (`gh api`), the clone registry and `clone say` (`rhachet`), and
 *         the keyrack token read answer from genWatchTestScene stub bins on PATH;
 *         the skill, the daemon, and the filesystem run for real
 * .why  = a ci red, an outage, a rate limit, a token that expires, and a clone
 *         mid-turn cannot be forced on the real services on demand, nor billed per run
 * .real = git.pull.watch.github.real.integration.test.ts (TEST_LIVE=github) and
 *         git.pull.watch.rhachet.real.integration.test.ts
 */
jest.setTimeout(400_000);

const SERIAL_A = 'a1a1a1a1-0000-4000-8000-00000000000a';
const SERIAL_B = 'b2b2b2b2-0000-4000-8000-00000000000b';
const REPO = 'ehmpathy/surf-demo';

/**
 * .what = an open pr in the store, with no checks, comments, or reviews
 */
const setPrOpen = (input: { scene: WatchScene; pr: string }): void =>
  input.scene.setStore((store) => {
    const pr = input.pr;
    store.github.prs[`${REPO}#${pr}`] = {
      state: 'open',
      merged: false,
      headSha: `sha-${pr}`,
      closedBy: null,
    };
  });

/**
 * .what = the parsed json of one `set --output json` run
 */
const asSetJson = (
  stdout: string,
): {
  mode: 'plan' | 'apply';
  watch: { verdict: string; from: string | null };
  daemon: {
    key: string;
    pid: number | null;
    verdict: string | null;
    prior: string | null;
  };
  line: string;
} => JSON.parse(stdout);

describe('git.pull.watch lifecycle', () => {
  given('[case4] two clones on one version share one daemon', () => {
    const scene = genWatchTestScene({
      slug: 'watch-case4',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
        { serial: SERIAL_B, slug: 'reviewer', reachState: 'LIVE' },
      ];
    });
    setPrOpen({ scene, pr: '1220' });
    setPrOpen({ scene, pr: '1221' });
    afterAll(() => scene.stopAllDaemons());

    when('[t0] clone A watches #1220, then clone B watches #1221', () => {
      const result = useThen('both succeed', async () => {
        // a plan first: it writes naught, so the apply below still spawns
        const plan = scene.runSkill({
          verb: 'set',
          args: ['--pull', '1220', '--output', 'json'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        });
        const first = scene.runSkill({
          verb: 'set',
          args: ['--pull', '1220', '--mode', 'apply', '--output', 'json'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        });
        const second = scene.runSkill({
          verb: 'set',
          args: ['--pull', '1221', '--mode', 'apply', '--output', 'json'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_B,
        });
        await scene.waitForPrimed();
        const listed = scene.runSkill({
          verb: 'get',
          args: [],
          root: scene.roots['surf-demo']!,
          serial: null,
        });
        const listedJson = scene.runSkill({
          verb: 'get',
          args: ['--output', 'json'],
          root: scene.roots['surf-demo']!,
          serial: null,
        });
        return { plan, first, second, listed, listedJson };
      });
      then('the plan in json names what would happen, with no pid', () => {
        const json = asSetJson(result.plan.stdout);
        expect(json.mode).toEqual('plan');
        expect(json.watch.verdict).toEqual('set');
        expect(json.daemon.pid).toEqual(null);
        expect(scene.asMasked(result.plan.stdout)).toMatchSnapshot();
      });
      then('set and get in json each speak their contract shape', () => {
        // the pid and the tick age vary per run; all else is the contract
        const asJsonMasked = (text: string): string =>
          scene
            .asMasked(text)
            .replace(/"pid": \d+/g, '"pid": "<pid>"')
            .replace(
              /"lastTickSecondsAgo": \d+/g,
              '"lastTickSecondsAgo": "<n>"',
            );
        expect(asJsonMasked(result.first.stdout)).toMatchSnapshot();
        expect(asJsonMasked(result.listedJson.stdout)).toMatchSnapshot();
      });
      then('the first spawns the daemon; the second finds it', () => {
        expect(asSetJson(result.first.stdout).daemon.verdict).toEqual(
          'spawned',
        );
        expect(asSetJson(result.second.stdout).daemon.verdict).toEqual('found');
        expect(scene.asMasked(result.second.stdout)).toMatchSnapshot();
      });
      then('both name the same daemon pid, and one daemon runs', () => {
        expect(asSetJson(result.second.stdout).daemon.pid).toEqual(
          asSetJson(result.first.stdout).daemon.pid,
        );
        expect(getAllWatchDaemonPids({ home: scene.home })).toHaveLength(1);
      });
      then('get shows one daemon with both watches', () => {
        expect(result.listed.status).toEqual(0);
        expect(result.listed.stdout).toContain('#1220 → @:mechanic');
        expect(result.listed.stdout).toContain('#1221 → @:reviewer');
        expect(scene.asMasked(result.listed.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] clone A watches #1220 again', () => {
      const result = useThen('it succeeds', async () =>
        scene.runSkill({
          verb: 'set',
          args: ['--pull', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        }),
      );
      then('the watch reads found; no twin record is written', () => {
        expect(result.stdout).toContain('watch: found → @:mechanic');
        expect(scene.getAllWatchRecords()).toHaveLength(2);
        expect(scene.asMasked(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] clone B watches #1220 too, and #1220 fails ci', () => {
      const result = useThen('each clone is alerted', async () => {
        const out = scene.runSkill({
          verb: 'set',
          args: ['--pull', '1220', '--mode', 'apply', '--output', 'json'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_B,
        });
        await scene.waitForPrimed();
        const ticksFile = path.join(
          scene.getStateRoot(),
          `v=${asSetJson(out.stdout).daemon.key}`,
          'daemon.ticks',
        );
        const asReadsOf1220 = (): number =>
          scene
            .getGhCalls()
            .filter((call) =>
              call.argv.includes('repos/ehmpathy/surf-demo/pulls/1220'),
            ).length;
        const readTicks = (): number =>
          Number(fs.readFileSync(ticksFile, 'utf-8').trim());
        const ticksBefore = readTicks();
        const readsBefore = asReadsOf1220();
        scene.setStore((store) => {
          store.github.checks['sha-1220'] = [
            {
              id: 61,
              name: 'test-unit',
              status: 'completed',
              conclusion: 'failure',
              html_url: 'https://github.com/ehmpathy/surf-demo/runs/61',
            },
          ];
        });
        await waitForWatch({
          label: 'alert to both clones',
          check: () =>
            scene.getSays().filter((say) => say.text.includes('ci failed'))
              .length >= 2,
          scene,
        });
        await scene.waitForDaemonTicks({ ticks: 3 });
        return {
          says: scene.getSays().filter((say) => say.text.includes('ci failed')),
          ticks: readTicks() - ticksBefore,
          reads: asReadsOf1220() - readsBefore,
        };
      });
      then('each clone gets one alert', () => {
        expect(result.says.map((say) => say.serial).sort()).toEqual(
          [SERIAL_A, SERIAL_B].sort(),
        );
      });
      then('the pr is read once per tick, not once per watcher', () => {
        expect(result.ticks).toBeGreaterThan(0);
        expect(result.reads).toBeLessThanOrEqual(result.ticks + 1);
      });
    });
  });

  given('[case5] a second version on the box gets its own daemon', () => {
    const scene = genWatchTestScene({
      slug: 'watch-case5',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
        { serial: SERIAL_B, slug: 'mechanic-two', reachState: 'LIVE' },
      ];
    });
    setPrOpen({ scene, pr: '1220' });
    setPrOpen({ scene, pr: '1221' });
    const copy = genWatchSkillCopy({ slug: 'watch-case5', version: '9.9.9' });
    afterAll(() => scene.stopAllDaemons());

    when('[t0] clone A watches from this version; clone B from v9.9.9', () => {
      const result = useThen('both succeed', async () => {
        const first = scene.runSkill({
          verb: 'set',
          args: ['--pull', '1220', '--mode', 'apply', '--output', 'json'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        });
        const second = scene.runSkill({
          verb: 'set',
          args: ['--pull', '1221', '--mode', 'apply', '--output', 'json'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_B,
          skillDir: copy.skillDir,
        });
        await scene.waitForPrimed();
        return {
          first: asSetJson(first.stdout),
          second: asSetJson(second.stdout),
        };
      });
      then('each version spawns its own daemon', () => {
        expect(result.first.daemon.verdict).toEqual('spawned');
        expect(result.second.daemon.verdict).toEqual('spawned');
        expect(result.second.daemon.key).toMatch(/^9\.9\.9\+[0-9a-f]{8}$/);
        expect(result.first.daemon.key).not.toEqual(result.second.daemon.key);
      });
      then('one daemon runs per key', () => {
        expect(
          getAllWatchDaemonPids({
            home: scene.home,
            key: result.first.daemon.key,
          }),
        ).toHaveLength(1);
        expect(
          getAllWatchDaemonPids({
            home: scene.home,
            key: result.second.daemon.key,
          }),
        ).toHaveLength(1);
      });
      then('each watch sits under its own key only', () => {
        const keys = scene
          .getAllWatchRecords()
          .map((found) => `${found.record.pr}:${found.key}`)
          .sort();
        expect(keys).toEqual([
          `1220:${result.first.daemon.key}`,
          `1221:${result.second.daemon.key}`,
        ]);
      });
    });
  });

  given('[case5b] one version, two builds of its code (entry E8)', () => {
    const scene = genWatchTestScene({
      slug: 'watch-case5b',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
        { serial: SERIAL_B, slug: 'mechanic-two', reachState: 'LIVE' },
      ];
    });
    setPrOpen({ scene, pr: '1220' });
    setPrOpen({ scene, pr: '1221' });
    setPrOpen({ scene, pr: '1222' });
    const release = genWatchSkillCopy({
      slug: 'watch-case5b-a',
      version: '7.7.7',
    });
    const releaseTwin = genWatchSkillCopy({
      slug: 'watch-case5b-b',
      version: '7.7.7',
    });
    const devBuild = genWatchSkillCopy({
      slug: 'watch-case5b-c',
      version: '7.7.7',
      daemonPrefix: '# a dev edit, same version',
    });
    afterAll(() => scene.stopAllDaemons());

    when(
      '[t0] two identical installs and one edited build each set a watch',
      () => {
        const result = useThen('all succeed', async () => {
          const run = (input: {
            pr: string;
            serial: string;
            skillDir: string;
          }) =>
            asSetJson(
              scene.runSkill({
                verb: 'set',
                args: [
                  '--pull',
                  input.pr,
                  '--mode',
                  'apply',
                  '--output',
                  'json',
                ],
                root: scene.roots['surf-demo']!,
                serial: input.serial,
                skillDir: input.skillDir,
              }).stdout,
            );
          const first = run({
            pr: '1220',
            serial: SERIAL_A,
            skillDir: release.skillDir,
          });
          const twin = run({
            pr: '1221',
            serial: SERIAL_B,
            skillDir: releaseTwin.skillDir,
          });
          const dev = run({
            pr: '1222',
            serial: SERIAL_A,
            skillDir: devBuild.skillDir,
          });
          await scene.waitForPrimed();
          return { first, twin, dev };
        });
        then(
          'identical code on one version shares one key and one daemon',
          () => {
            expect(result.twin.daemon.key).toEqual(result.first.daemon.key);
            expect(result.twin.daemon.verdict).toEqual('found');
          },
        );
        then('an edit to the code splits the key, on the same version', () => {
          expect(result.dev.daemon.key).toMatch(/^7\.7\.7\+[0-9a-f]{8}$/);
          expect(result.dev.daemon.key).not.toEqual(result.first.daemon.key);
          expect(result.dev.daemon.verdict).toEqual('spawned');
        });
      },
    );
  });

  given('[case6] parallel findserts never double the daemon', () => {
    const scene = genWatchTestScene({
      slug: 'watch-case6',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
    });
    ['1220', '1221', '1222', '1223'].forEach((pr) => setPrOpen({ scene, pr }));
    afterAll(() => scene.stopAllDaemons());

    when('[t0] four sets race at once', () => {
      const result = useThen('all succeed', async () => {
        const runs = await Promise.all(
          ['1220', '1221', '1222', '1223'].map((pr) =>
            scene.runSkillAsync({
              verb: 'set',
              args: ['--pull', pr, '--mode', 'apply', '--output', 'json'],
              root: scene.roots['surf-demo']!,
              serial: SERIAL_A,
            }),
          ),
        );
        await scene.waitForPrimed();
        await scene.waitForDaemonTicks({ ticks: 1 });
        return { runs, pids: getAllWatchDaemonPids({ home: scene.home }) };
      });
      then('each exits 0', () => {
        expect(result.runs.map((run) => run.status)).toEqual([0, 0, 0, 0]);
      });
      then('exactly one daemon runs, and every run names it', () => {
        expect(result.pids).toHaveLength(1);
        const named = new Set(
          result.runs.map((run) => asSetJson(run.stdout).daemon.pid),
        );
        expect([...named]).toEqual(result.pids);
      });
      then('one run spawned; the rest found', () => {
        const verdicts = result.runs
          .map((run) => asSetJson(run.stdout).daemon.verdict)
          .sort();
        expect(verdicts).toEqual(['found', 'found', 'found', 'spawned']);
      });
    });

    when('[t1] a second daemon of the key is started by hand', () => {
      const result = useThen('it returns', async () => {
        const [found] = scene.getAllWatchRecords();
        const pidsBefore = getAllWatchDaemonPids({ home: scene.home });
        const out = scene.runScript({
          path: path.join(
            scene.getStateRoot(),
            `v=${found!.key}`,
            'bin',
            'git.pull.watch.daemon.sh',
          ),
          args: [found!.key],
          root: scene.roots['surf-demo']!,
          serial: null,
          timeoutMs: 60_000,
        });
        return {
          out,
          pidsBefore,
          pidsAfter: getAllWatchDaemonPids({ home: scene.home }),
        };
      });
      then('it exits 0 at boot and names the live pid', () => {
        expect(result.out.status).toEqual(0);
        expect(result.out.stdout).toContain(
          `daemon pid ${result.pidsBefore[0]} already holds key`,
        );
      });
      then('the live daemon keeps its pid; still one runs', () => {
        expect(result.pidsAfter).toEqual(result.pidsBefore);
      });
    });
  });

  given('[case9] a stale, a wedged, and a reused pid record', () => {
    const scene = genWatchTestScene({
      slug: 'watch-case9',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
      store.github.issueComments[`${REPO}#1220`] = [];
    });
    setPrOpen({ scene, pr: '1220' });
    const strangers: number[] = [];
    afterAll(() => {
      scene.stopAllDaemons();
      strangers.forEach(
        (pid) => isPidAlive(pid) && process.kill(pid, 'SIGKILL'),
      );
    });

    // the key this skill runs as, read from a plan
    const getKey = (): string =>
      asSetJson(
        scene.runSkill({
          verb: 'set',
          args: ['--pull', '1220', '--output', 'json'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        }).stdout,
      ).daemon.key;

    // stop the live daemon, then plant a pid record that names `pid`
    const setPidRecord = (input: {
      pid: number;
      heartbeatAgeSeconds: number;
    }) => {
      scene.stopAllDaemons();
      const dir = path.join(scene.getStateRoot(), `v=${getKey()}`);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'daemon.pid'),
        JSON.stringify({ pid: input.pid, key: getKey() }),
      );
      fs.writeFileSync(
        path.join(dir, 'daemon.heartbeat'),
        String(Math.floor(Date.now() / 1000) - input.heartbeatAgeSeconds),
      );
    };

    // a detached process; its args name what the test asks
    const genStranger = (args: string[]): number => {
      const child = spawn(args[0]!, args.slice(1), {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      strangers.push(child.pid!);
      return child.pid!;
    };

    when(
      '[t0] the pid record names a dead process; a comment landed while down',
      () => {
        const result = useThen('a findsert replaces it', async () => {
          scene.runSkill({
            verb: 'set',
            args: ['--pull', '1220', '--mode', 'apply'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL_A,
          });
          await scene.waitForPrimed();
          const dead = genStranger(['true']);
          await waitForWatch({
            label: 'stranger exit',
            check: () => !isPidAlive(dead),
          });
          setPidRecord({ pid: dead, heartbeatAgeSeconds: 5 });
          scene.setStore((store) => {
            store.github.issueComments[`${REPO}#1220`]!.push({
              id: 501,
              body: 'a note while the daemon was down',
              user: { login: 'surfer-kai', type: 'User' },
              html_url:
                'https://github.com/ehmpathy/surf-demo/pull/1220#issuecomment-501',
            });
          });
          const out = scene.runSkill({
            verb: 'set',
            args: ['--pull', '1220', '--mode', 'apply'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL_A,
          });
          const says = await waitForWatch({
            label: 'catch-up alert',
            check: () => (scene.getSays().length > 0 ? scene.getSays() : null),
            scene,
          });
          return { out, dead, says };
        });
        then('the output names the replaced stale pid', () => {
          expect(result.out.stdout).toContain(
            `replaced stale pid ${result.dead}`,
          );
          expect(scene.asMasked(result.out.stdout)).toMatchSnapshot();
        });
        then('the event from the downtime alerts once', () => {
          expect(result.says).toHaveLength(1);
          expect(result.says[0]!.text).toContain(
            'a note while the daemon was down',
          );
        });
      },
    );

    when(
      '[t1] the pid record names a live own daemon whose heartbeat is an hour old',
      () => {
        const result = useThen('a findsert replaces it', async () => {
          const wedged = genStranger([
            // `; true` keeps bash from an exec of sleep, so its args stay
            'bash',
            '-c',
            'sleep 300; true',
            'git.pull.watch.daemon.sh',
            getKey(),
          ]);
          setPidRecord({ pid: wedged, heartbeatAgeSeconds: 3600 });
          const out = scene.runSkill({
            verb: 'set',
            args: ['--pull', '1220', '--mode', 'apply'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL_A,
          });
          await waitForWatch({
            label: 'wedged stop',
            check: () => !isPidAlive(wedged),
          });
          return { out, wedged };
        });
        then('the wedged daemon is stopped and replaced', () => {
          expect(result.out.stdout).toContain(
            `replaced wedged pid ${result.wedged}`,
          );
          expect(isPidAlive(result.wedged)).toEqual(false);
          expect(getAllWatchDaemonPids({ home: scene.home })).toHaveLength(1);
        });
      },
    );

    when('[t2] the pid record names a live stranger program', () => {
      const result = useThen(
        'a findsert replaces the record only',
        async () => {
          const stranger = genStranger(['sleep', '300']);
          setPidRecord({ pid: stranger, heartbeatAgeSeconds: 5 });
          const out = scene.runSkill({
            verb: 'set',
            args: ['--pull', '1220', '--mode', 'apply'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL_A,
          });
          return { out, stranger };
        },
      );
      then('the stranger is not killed; the record reads stale', () => {
        expect(result.out.stdout).toContain(
          `replaced stale pid ${result.stranger}`,
        );
        expect(isPidAlive(result.stranger)).toEqual(true);
      });
      then('a fresh daemon holds the record', () => {
        const pids = getAllWatchDaemonPids({ home: scene.home });
        expect(pids).toHaveLength(1);
        expect(pids).not.toContain(result.stranger);
      });
    });
  });

  given('[case9b] get shows a daemon that serves no watch', () => {
    const scene = genWatchTestScene({
      slug: 'watch-case9b',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
      store.github.issueComments[`${REPO}#1220`] = [];
    });
    setPrOpen({ scene, pr: '1220' });
    const strangers: number[] = [];
    afterAll(() => {
      scene.stopAllDaemons();
      strangers.forEach(
        (pid) => isPidAlive(pid) && process.kill(pid, 'SIGKILL'),
      );
    });

    // one watch, primed by a real daemon, whose daemon is then stopped
    const getKeyDirWithWatch = async (): Promise<string> => {
      const out = scene.runSkill({
        verb: 'set',
        args: ['--pull', '1220', '--mode', 'apply', '--output', 'json'],
        root: scene.roots['surf-demo']!,
        serial: SERIAL_A,
      });
      await scene.waitForPrimed();
      scene.stopAllDaemons();
      return path.join(
        scene.getStateRoot(),
        `v=${asSetJson(out.stdout).daemon.key}`,
      );
    };

    // what get says, in both shapes
    const runGet = () => ({
      tree: scene.runSkill({
        verb: 'get',
        args: [],
        root: scene.roots['surf-demo']!,
        serial: SERIAL_A,
      }),
      json: scene.runSkill({
        verb: 'get',
        args: ['--output', 'json'],
        root: scene.roots['surf-demo']!,
        serial: SERIAL_A,
      }),
    });

    // a detached process; its args name what the test asks
    const genStranger = (args: string[]): number => {
      const child = spawn(args[0]!, args.slice(1), {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      strangers.push(child.pid!);
      return child.pid!;
    };

    // the json, with the per-run pid and tick age masked
    const asMaskedJson = (text: string): string =>
      scene
        .asMasked(text)
        .replace(/"pid": \d+/g, '"pid": "<pid>"')
        .replace(/"lastTickSecondsAgo": \d+/g, '"lastTickSecondsAgo": "<n>"');

    when('[t0] the daemon is gone and its pid record with it (absent)', () => {
      const result = useThen('get runs', async () => {
        const dir = await getKeyDirWithWatch();
        fs.rmSync(path.join(dir, 'daemon.pid'), { force: true });
        return runGet();
      });
      then('the tree names the state and the cure', () => {
        expect(result.tree.status).toEqual(0);
        expect(result.tree.stdout).toContain(' · absent · ');
        expect(result.tree.stdout).toContain(
          'start a fresh one: rhx git.pull.watch set --pull <n> --mode apply',
        );
        expect(result.tree.stdout).toMatch(
          /read why it stopped: cat .*daemon\.log/,
        );
        // the read comes first: the cure is a list of numbered steps, not a choice
        expect(result.tree.stdout).toContain(
          'serves no watch\n      ├─ 1. read why it stopped',
        );
        expect(result.tree.stdout).toContain('└─ 2. start a fresh one: ');
        expect(scene.asMasked(result.tree.stdout)).toMatchSnapshot();
      });
      then('the json names the state', () => {
        const parsed = JSON.parse(result.json.stdout);
        expect(parsed.daemons[0].state).toEqual('absent');
        expect(parsed.daemons[0].watches).toHaveLength(1);
        expect(asMaskedJson(result.json.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] the pid record names a dead process (stale)', () => {
      const result = useThen('get runs', async () => {
        const dir = await getKeyDirWithWatch();
        const dead = genStranger(['true']);
        await waitForWatch({
          label: 'stranger exit',
          check: () => !isPidAlive(dead),
        });
        fs.writeFileSync(
          path.join(dir, 'daemon.pid'),
          JSON.stringify({ pid: dead, key: path.basename(dir).slice(2) }),
        );
        return runGet();
      });
      then('the tree names the state and the cure', () => {
        expect(result.tree.status).toEqual(0);
        expect(result.tree.stdout).toContain(' · stale · ');
        expect(result.tree.stdout).toContain('start a fresh one');
        expect(scene.asMasked(result.tree.stdout)).toMatchSnapshot();
      });
      then('the json names the state', () => {
        expect(JSON.parse(result.json.stdout).daemons[0].state).toEqual(
          'stale',
        );
        expect(asMaskedJson(result.json.stdout)).toMatchSnapshot();
      });
    });

    when(
      '[t2] the pid record names a live own daemon an hour past its tick (wedged)',
      () => {
        const result = useThen('get runs', async () => {
          const dir = await getKeyDirWithWatch();
          const key = path.basename(dir).slice(2);
          const wedged = genStranger([
            // `; true` keeps bash from an exec of sleep, so its args stay
            'bash',
            '-c',
            'sleep 300; true',
            'git.pull.watch.daemon.sh',
            key,
          ]);
          fs.writeFileSync(
            path.join(dir, 'daemon.pid'),
            JSON.stringify({ pid: wedged, key }),
          );
          fs.writeFileSync(
            path.join(dir, 'daemon.heartbeat'),
            String(Math.floor(Date.now() / 1000) - 3600),
          );
          return runGet();
        });
        then('the tree names the state and the cure', () => {
          expect(result.tree.status).toEqual(0);
          expect(result.tree.stdout).toContain(' · wedged · ');
          expect(result.tree.stdout).toContain('start a fresh one');
          expect(scene.asMasked(result.tree.stdout)).toMatchSnapshot();
        });
        then('the json names the state', () => {
          expect(JSON.parse(result.json.stdout).daemons[0].state).toEqual(
            'wedged',
          );
          expect(asMaskedJson(result.json.stdout)).toMatchSnapshot();
        });
      },
    );
  });

  given(
    '[case10] watches end on merge, on close, and on a dead clone; then the daemon exits',
    () => {
      const scene = genWatchTestScene({
        slug: 'watch-case10',
        repos: ['surf-demo'],
        store: {},
      });
      scene.setStore((store) => {
        store.clones[scene.roots['surf-demo']!] = [
          { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
          { serial: SERIAL_B, slug: 'reviewer', reachState: 'LIVE' },
        ];
      });
      ['1220', '1221', '1222'].forEach((pr) => setPrOpen({ scene, pr }));
      afterAll(() => scene.stopAllDaemons());

      when(
        '[t0] clone A watches #1220 and #1222; clone B watches #1221',
        () => {
          const result = useThen('all succeed', async () => {
            const runs = [
              { pr: '1220', serial: SERIAL_A },
              { pr: '1222', serial: SERIAL_A },
              { pr: '1221', serial: SERIAL_B },
            ].map((one) =>
              scene.runSkill({
                verb: 'set',
                args: ['--pull', one.pr, '--mode', 'apply'],
                root: scene.roots['surf-demo']!,
                serial: one.serial,
              }),
            );
            await scene.waitForPrimed();
            return { runs };
          });
          then('three watches stand', () => {
            expect(result.runs.map((run) => run.status)).toEqual([0, 0, 0]);
            expect(scene.getAllWatchRecords()).toHaveLength(3);
          });
        },
      );

      when('[t1] #1220 merges and #1222 is closed without merge', () => {
        const result = useThen('closure notes arrive', async () => {
          scene.setStore((store) => {
            store.github.prs[`${REPO}#1220`]!.state = 'closed';
            store.github.prs[`${REPO}#1220`]!.merged = true;
            store.github.prs[`${REPO}#1222`]!.state = 'closed';
            store.github.prs[`${REPO}#1222`]!.closedBy = 'surfer-mano';
          });
          const says = await waitForWatch({
            label: 'closure notes',
            check: () => (scene.getSays().length >= 2 ? scene.getSays() : null),
            scene,
          });
          await scene.waitForDaemonTicks({ ticks: 1 });
          return { says, records: scene.getAllWatchRecords() };
        });
        then(
          'the merge note says merged; the close note says who closed it',
          () => {
            const texts = result.says.map((say) => say.text).sort();
            expect(texts).toEqual([
              '🐢 bummer dude...\n\n🐚 git.pull.watch — #1222 closed without merge; watch ended\n   └─ by: @surfer-mano',
              '🐢 cowabunga!\n\n🐚 git.pull.watch — #1220 merged; watch ended',
            ]);
            texts.forEach((text) => expect(text).toMatchSnapshot());
          },
        );
        then('both watches are deleted; #1221 stands', () => {
          expect(result.records.map((found) => found.record.pr)).toEqual([
            1221,
          ]);
        });
      });

      when('[t2] clone B dies, with no event on #1221', () => {
        const result = useThen(
          'the daemon drops the watch, then exits',
          async () => {
            const [pid] = getAllWatchDaemonPids({ home: scene.home });
            scene.setStore((store) => {
              store.clones[scene.roots['surf-demo']!]![1]!.reachState = 'DEAD';
            });
            await waitForWatch({
              label: 'daemon exit',
              check: () => !isPidAlive(pid!),
              scene,
            });
            return { pid: pid!, records: scene.getAllWatchRecords() };
          },
        );
        then('the #1221 watch is deleted', () => {
          expect(result.records).toHaveLength(0);
        });
        then(
          'the daemon removed its pid record and exited; no daemon remains',
          () => {
            const pidFiles = fs
              .readdirSync(scene.getStateRoot())
              .filter((name) => name.startsWith('v='))
              .map((name) =>
                path.join(scene.getStateRoot(), name, 'daemon.pid'),
              )
              .filter((file) => fs.existsSync(file));
            expect(pidFiles).toEqual([]);
            expect(getAllWatchDaemonPids({ home: scene.home })).toEqual([]);
          },
        );
      });
    },
  );

  given(
    '[case10d] an approval and a merge land in one tick; a close has no known closer',
    () => {
      const scene = genWatchTestScene({
        slug: 'watch-case10d',
        repos: ['surf-demo'],
        store: {},
      });
      scene.setStore((store) => {
        store.clones[scene.roots['surf-demo']!] = [
          { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
        ];
      });
      ['1230', '1231'].forEach((pr) => setPrOpen({ scene, pr }));
      afterAll(() => scene.stopAllDaemons());

      when(
        '[t0] the clone watches both; then #1230 is approved and merged, #1231 closed by an unknown hand',
        () => {
          const result = useThen('two alerts arrive', async () => {
            ['1230', '1231'].forEach((pr) =>
              scene.runSkill({
                verb: 'set',
                args: ['--pull', pr, '--mode', 'apply'],
                root: scene.roots['surf-demo']!,
                serial: SERIAL_A,
              }),
            );
            await scene.waitForPrimed();
            // one store write: the next tick reads the approval and the merge together
            scene.setStore((store) => {
              store.github.reviews[`${REPO}#1230`] = [
                {
                  id: 7301,
                  body: 'shaka, ship it',
                  user: { login: 'surfer-kai', type: 'User' },
                  html_url: `https://github.com/${REPO}/pull/1230#pullrequestreview-7301`,
                  state: 'APPROVED',
                  submitted_at: new Date().toISOString(),
                },
              ];
              store.github.prs[`${REPO}#1230`]!.state = 'closed';
              store.github.prs[`${REPO}#1230`]!.merged = true;
              store.github.prs[`${REPO}#1231`]!.state = 'closed';
              store.github.prs[`${REPO}#1231`]!.closedBy = null;
            });
            const says = await waitForWatch({
              label: 'approval + closure alerts',
              check: () =>
                scene.getSays().length >= 2 ? scene.getSays() : null,
              scene,
            });
            await scene.waitForDaemonTicks({ ticks: 1 });
            return { says, records: scene.getAllWatchRecords() };
          });
          then(
            'the merged pr gets one alert: the approval, a blank line, then the merge note',
            () => {
              const merged = result.says.filter((say) =>
                say.text.includes('#1230'),
              );
              expect(merged).toHaveLength(1);
              expect(merged[0]!.text).toContain('surfer-kai');
              expect(merged[0]!.text).toContain(
                '\n\n🐢 cowabunga!\n\n🐚 git.pull.watch — #1230 merged; watch ended',
              );
              expect(
                merged[0]!.text.indexOf('surfer-kai') <
                  merged[0]!.text.indexOf('merged; watch ended'),
              ).toBe(true);
              expect(scene.asMasked(merged[0]!.text)).toMatchSnapshot();
            },
          );
          then('a close with no known closer names no one', () => {
            const closed = result.says.filter((say) =>
              say.text.includes('#1231'),
            );
            expect(closed).toHaveLength(1);
            expect(closed[0]!.text).toEqual(
              '🐢 bummer dude...\n\n🐚 git.pull.watch — #1231 closed without merge; watch ended',
            );
            expect(closed[0]!.text).toMatchSnapshot();
          });
          then('both watches are deleted', () => {
            expect(result.records).toHaveLength(0);
          });
        },
      );
    },
  );

  given('[case10b] a watched repo root is removed (a worktree deleted)', () => {
    const SERIAL_C = 'c3c3c3c3-0000-4000-8000-00000000000c';
    const scene = genWatchTestScene({
      slug: 'watch-case10b',
      repos: ['surf-demo', 'reef-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
      store.clones[scene.roots['reef-demo']!] = [
        { serial: SERIAL_C, slug: 'mechanic', reachState: 'LIVE' },
      ];
      store.github.prs['ehmpathy/reef-demo#1230'] = {
        state: 'open',
        merged: false,
        headSha: 'sha-1230',
        closedBy: null,
      };
      store.github.checks['sha-1230'] = [];
    });
    setPrOpen({ scene, pr: '1220' });
    afterAll(() => scene.stopAllDaemons());

    when(
      '[t0] each repo watches one pr; then the surf-demo worktree is removed',
      () => {
        const result = useThen('the gone root is dropped', async () => {
          scene.runSkill({
            verb: 'set',
            args: ['--pull', '1220', '--mode', 'apply'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL_A,
          });
          scene.runSkill({
            verb: 'set',
            args: ['--pull', '1230', '--mode', 'apply'],
            root: scene.roots['reef-demo']!,
            serial: SERIAL_C,
          });
          await scene.waitForPrimed();
          fs.rmSync(scene.roots['surf-demo']!, {
            recursive: true,
            force: true,
          });
          await waitForWatch({
            label: 'gone-root watch dropped',
            check: () => scene.getAllWatchRecords().length === 1,
            scene,
          });
          return { records: scene.getAllWatchRecords() };
        });
        then('only the watch whose root stands remains', () => {
          expect(result.records.map((found) => found.record.pr)).toEqual([
            1230,
          ]);
        });
      },
    );

    when('[t1] a check fails on the pr whose root stands', () => {
      const result = useThen('it alerts', async () => {
        scene.setStore((store) => {
          store.github.checks['sha-1230'] = [
            {
              id: 81,
              name: 'test-unit',
              status: 'completed',
              conclusion: 'failure',
              html_url: 'https://github.com/ehmpathy/reef-demo/runs/81',
            },
          ];
        });
        const says = await waitForWatch({
          label: 'alert after a root is gone',
          check: () => (scene.getSays().length > 0 ? scene.getSays() : null),
          scene,
        });
        return { says };
      });
      then('the daemon still reads github, and alerts the live clone', () => {
        expect(result.says[0]!.serial).toEqual(SERIAL_C);
        expect(result.says[0]!.text).toContain('check: test-unit (failure)');
      });
    });

    when('[t2] the last watched root is removed too', () => {
      const result = useThen('the daemon exits', async () => {
        const [pid] = getAllWatchDaemonPids({ home: scene.home });
        fs.rmSync(scene.roots['reef-demo']!, { recursive: true, force: true });
        await waitForWatch({
          label: 'daemon exit',
          check: () => !isPidAlive(pid!),
          scene,
        });
        return { records: scene.getAllWatchRecords() };
      });
      then('no watch remains, and no daemon remains (F3)', () => {
        expect(result.records).toHaveLength(0);
        expect(getAllWatchDaemonPids({ home: scene.home })).toEqual([]);
      });
    });
  });

  given('[case10c] a watch marked ended waits for its last alert', () => {
    const scene = genWatchTestScene({
      slug: 'watch-case10c',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
    });
    setPrOpen({ scene, pr: '1220' });
    afterAll(() => scene.stopAllDaemons());

    when('[t0] the pr reopens, and the clone asks to watch it', () => {
      const result = useThen('set plans', async () => {
        scene.runSkill({
          verb: 'set',
          args: ['--pull', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        });
        await scene.waitForPrimed();
        scene.stopAllDaemons();
        // the record as a tick leaves it once the pr closed, its closure note still held
        const [found] = scene.getAllWatchRecords();
        fs.writeFileSync(
          found!.path,
          JSON.stringify({ ...found!.record, ended: 'closed' }),
        );
        return scene.runSkill({
          verb: 'set',
          args: ['--pull', '1220', '--output', 'json'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        });
      });
      then(
        'the verdict is set, never found: the daemon reads it no more',
        () => {
          expect(result.status).toEqual(0);
          expect(asSetJson(result.stdout).watch.verdict).toEqual('set');
        },
      );
    });
  });

  given('[case12] the spawner worktree goes away', () => {
    const scene = genWatchTestScene({
      slug: 'watch-case12',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
      store.github.checks['sha-1220'] = [];
    });
    setPrOpen({ scene, pr: '1220' });
    const copy = genWatchSkillCopy({ slug: 'watch-case12', version: '7.7.7' });
    afterAll(() => scene.stopAllDaemons());

    when('[t0] a daemon spawned from a copy whose dir is then deleted', () => {
      const result = useThen('it still alerts', async () => {
        const out = scene.runSkill({
          verb: 'set',
          args: ['--pull', '1220', '--mode', 'apply', '--output', 'json'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
          skillDir: copy.skillDir,
        });
        await scene.waitForPrimed();
        const pidBefore = asSetJson(out.stdout).daemon.pid;
        fs.rmSync(copy.pkgDir, { recursive: true, force: true });
        scene.setStore((store) => {
          store.github.checks['sha-1220'] = [
            {
              id: 71,
              name: 'test-unit',
              status: 'completed',
              conclusion: 'failure',
              html_url: 'https://github.com/ehmpathy/surf-demo/runs/71',
            },
          ];
        });
        const says = await waitForWatch({
          label: 'alert after the spawner dir is gone',
          check: () => (scene.getSays().length > 0 ? scene.getSays() : null),
          scene,
        });
        return {
          pidBefore,
          says,
          pidsAfter: getAllWatchDaemonPids({ home: scene.home }),
        };
      });
      then('the daemon pid is unchanged, and it still ticks', () => {
        expect(result.pidsAfter).toEqual([result.pidBefore]);
      });
      then('the watch still alerts', () => {
        expect(result.says[0]!.text).toContain('check: test-unit (failure)');
      });
    });
  });

  given('[case12b] a daemon copy that cannot boot', () => {
    const scene = genWatchTestScene({
      slug: 'watch-case12b',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
    });
    setPrOpen({ scene, pr: '1220' });
    const copy = genWatchSkillCopy({
      slug: 'watch-case12b',
      version: '6.6.6',
      daemonPrefix: 'echo "boot defect: the copy is corrupt" >&2; exit 1',
    });
    afterAll(() => scene.stopAllDaemons());

    when('[t0] a set findserts the daemon', () => {
      const result = useThen('it fails loud', async () =>
        scene.runSkill({
          verb: 'set',
          args: ['--pull', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
          skillDir: copy.skillDir,
        }),
      );
      then('it exits 1, a malfunction', () => {
        expect(result.status).toEqual(1);
      });
      then(
        'it names the boot failure and the log path, on both streams',
        () => {
          expect(result.stdout).toContain(
            '💥 MalfunctionError: pr-watch daemon v',
          );
          expect(result.stdout).toContain('died at boot');
          expect(result.stdout).toContain('daemon.log');
          expect(result.stderr).toContain('died at boot');
          expect(scene.asMasked(result.stdout)).toMatchSnapshot();
        },
      );
    });
  });

  given('[case12c] a daemon copy that lacks a file it sources', () => {
    const scene = genWatchTestScene({
      slug: 'watch-case12c',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
    });
    setPrOpen({ scene, pr: '1220' });
    const copy = genWatchSkillCopy({ slug: 'watch-case12c', version: '6.6.7' });
    fs.rmSync(path.join(copy.skillDir, 'git.pull.watch.github.sh'));
    afterAll(() => scene.stopAllDaemons());

    when('[t0] a set findserts the daemon', () => {
      const result = useThen('it fails loud', async () =>
        scene.runSkill({
          verb: 'set',
          args: ['--pull', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
          skillDir: copy.skillDir,
        }),
      );
      then(
        'the daemon exits at boot, and the set names the absent file',
        () => {
          expect(result.status).toEqual(1);
          expect(result.stdout).toContain('died at boot');
          expect(result.stdout).toContain(
            'cause: boot defect: could not source git.pull.watch.github.sh',
          );
        },
      );
      then('no half-booted daemon is left to run', () => {
        expect(getAllWatchDaemonPids({ home: scene.home })).toEqual([]);
      });
    });
  });

  given('[case12d] a findsert that replaces a dead daemon', () => {
    const scene = genWatchTestScene({
      slug: 'watch-case12d',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
    });
    setPrOpen({ scene, pr: '1220' });
    afterAll(() => scene.stopAllDaemons());

    when('[t0] the daemon is killed, then a set findserts it again', () => {
      const result = useThen('the daemon is replaced', async () => {
        const set = () =>
          scene.runSkill({
            verb: 'set',
            args: ['--pull', '1220', '--mode', 'apply'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL_A,
          });
        set();
        const key = scene.getAllWatchRecords()[0]!.key;
        const bin = path.join(scene.getStateRoot(), `v=${key}`, 'bin');
        const inodeBefore = fs.statSync(bin).ino;
        const [killed] = getAllWatchDaemonPids({ home: scene.home });
        scene.stopAllDaemons();
        await waitForWatch({
          label: 'daemon killed',
          check: () => !isPidAlive(killed!),
        });
        const again = set();
        return { again, inodeBefore, inodeAfter: fs.statSync(bin).ino };
      });
      then('the replace succeeds', () => {
        expect(result.again.status).toEqual(0);
        expect(result.again.stdout).toContain('replaced stale pid');
      });
      then(
        'the key bin is kept, never swapped under a daemon that boots from it',
        () => {
          expect(result.inodeAfter).toEqual(result.inodeBefore);
        },
      );
    });
  });

  given('[case14] an upgrade moves the watch', () => {
    const scene = genWatchTestScene({
      slug: 'watch-case14',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
      store.github.issueComments[`${REPO}#1221`] = [
        {
          id: 601,
          body: 'a note the old daemon already alerted',
          user: { login: 'surfer-kai', type: 'User' },
          html_url:
            'https://github.com/ehmpathy/surf-demo/pull/1221#issuecomment-601',
        },
      ];
    });
    setPrOpen({ scene, pr: '1221' });
    const upgrade = genWatchSkillCopy({
      slug: 'watch-case14',
      version: '8.8.8',
    });
    afterAll(() => scene.stopAllDaemons());

    when('[t0] the clone watches #1221 on this version, then on v8.8.8', () => {
      const result = useThen('the watch moves', async () => {
        const before = asSetJson(
          scene.runSkill({
            verb: 'set',
            args: ['--pull', '1221', '--mode', 'apply', '--output', 'json'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL_A,
          }).stdout,
        );
        await scene.waitForPrimed();
        const oldPid = before.daemon.pid!;
        const moved = scene.runSkill({
          verb: 'set',
          args: ['--pull', '1221', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
          skillDir: upgrade.skillDir,
        });
        await waitForWatch({
          label: 'old daemon exit',
          check: () => !isPidAlive(oldPid),
          scene,
        });
        await scene.waitForDaemonTicks({ ticks: 2 });
        return { before, moved, oldPid, records: scene.getAllWatchRecords() };
      });
      then('the push says moved, from the old key to the new', () => {
        expect(result.moved.status).toEqual(0);
        expect(result.moved.stdout).toMatch(
          /watch: moved v\S+ → v8\.8\.8\+[0-9a-f]{8} \(daemon pid \d+, spawned\)/,
        );
        expect(scene.asMasked(result.moved.stdout)).toMatchSnapshot();
      });
      then('the watch exists under the new key only', () => {
        expect(result.records).toHaveLength(1);
        expect(result.records[0]!.key).toMatch(/^8\.8\.8\+/);
      });
      then(
        'its cursors carried over; the old comment is not re-alerted',
        () => {
          expect(result.records[0]!.record.cursors.issueCommentIdMax).toEqual(
            601,
          );
          expect(scene.getSays()).toHaveLength(0);
        },
      );
      then('the old daemon exited at zero watches', () => {
        expect(isPidAlive(result.oldPid)).toEqual(false);
      });
    });
  });

  given('[case15] a clone stops its watch (entry E5)', () => {
    const scene = genWatchTestScene({
      slug: 'watch-case15',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
    });
    setPrOpen({ scene, pr: '1220' });
    afterAll(() => scene.stopAllDaemons());

    when('[t0] the clone watches #1220, then deletes the watch', () => {
      const result = useThen('the watch and the daemon go', async () => {
        scene.runSkill({
          verb: 'set',
          args: ['--pull', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        });
        await scene.waitForPrimed();
        const [pid] = getAllWatchDaemonPids({ home: scene.home });
        // a stale twin under an old key, with a held alert, as an interrupted move leaves
        const [found] = scene.getAllWatchRecords();
        const oldKeyDir = path.join(
          path.dirname(path.dirname(path.dirname(found!.path))),
          'v=8.8.8+deadbeef',
        );
        const twin = path.join(
          oldKeyDir,
          'watches',
          path.basename(found!.path),
        );
        const twinHeld = path.join(
          oldKeyDir,
          'outbox',
          `${path.basename(found!.path, '.json')}.1700000000.42.7.json`,
        );
        fs.mkdirSync(path.dirname(twin), { recursive: true });
        fs.mkdirSync(path.dirname(twinHeld), { recursive: true });
        fs.copyFileSync(found!.path, twin);
        fs.writeFileSync(twinHeld, '{"text":"ci failed","tries":0}');
        const run = (args: string[]) =>
          scene.runSkill({
            verb: 'del',
            args,
            root: scene.roots['surf-demo']!,
            serial: SERIAL_A,
          });
        const plan = run(['--pull', '1220']);
        const planJson = run(['--pull', '1220', '--output', 'json']);
        const noPr = run(['--mode', 'apply']);
        const badMode = run(['--pull', '1220', '--mode', 'yolo']);
        const applied = run(['--pull', '1220', '--mode', 'apply']);
        await waitForWatch({
          label: 'daemon exit',
          check: () => !isPidAlive(pid!),
          scene,
        });
        const again = run(['--pull', '1220', '--mode', 'apply']);
        const againJson = run([
          '--pull',
          '1220',
          '--mode',
          'apply',
          '--output',
          'json',
        ]);
        const listed = scene.runSkill({
          verb: 'get',
          args: [],
          root: scene.roots['surf-demo']!,
          serial: null,
        });
        const listedJson = scene.runSkill({
          verb: 'get',
          args: ['--output', 'json'],
          root: scene.roots['surf-demo']!,
          serial: null,
        });
        return {
          plan,
          planJson,
          listedJson,
          noPr,
          badMode,
          applied,
          again,
          againJson,
          listed,
          twin: fs.existsSync(twin),
          twinHeld: fs.existsSync(twinHeld),
        };
      });
      then(
        'plan deletes naught, names each key, and names the apply command',
        () => {
          expect(result.plan.stdout).toContain('verdict: would delete');
          expect(result.plan.stdout).toContain('v8.8.8+deadbeef');
          expect(result.plan.stdout).toContain(
            'rhx git.pull.watch del --pull 1220 --in ehmpathy/surf-demo --mode apply',
          );
          expect(scene.asMasked(result.plan.stdout)).toMatchSnapshot();
        },
      );
      then('plan in json names the verdict and both keys', () => {
        const json = JSON.parse(result.planJson.stdout);
        expect(json.verdict).toEqual('would delete');
        expect(json.keys).toHaveLength(2);
        expect(json.keys).toContain('8.8.8+deadbeef');
        expect(scene.asMasked(result.planJson.stdout)).toMatchSnapshot();
      });
      then(
        'a call with no --pull or a bad --mode is refused with its fix',
        () => {
          expect(result.noPr.status).toEqual(2);
          expect(result.noPr.stdout).toContain('--pull <n> is required');
          expect(result.badMode.status).toEqual(2);
          expect(result.badMode.stdout).toContain(
            '--mode must be one of: plan | apply',
          );
          expect(scene.asMasked(result.noPr.stdout)).toMatchSnapshot();
          expect(scene.asMasked(result.badMode.stdout)).toMatchSnapshot();
        },
      );
      then(
        'apply deletes the watch under every key; the daemon exits on its own',
        () => {
          expect(result.applied.stdout).toContain('verdict: deleted');
          expect(scene.getAllWatchRecords()).toHaveLength(0);
          expect(result.twin).toEqual(false);
          expect(result.twinHeld).toEqual(false);
          expect(getAllWatchDaemonPids({ home: scene.home })).toEqual([]);
          expect(scene.asMasked(result.applied.stdout)).toMatchSnapshot();
        },
      );
      then('a second delete is a no-op, in tree and json', () => {
        expect(result.again.status).toEqual(0);
        expect(result.again.stdout).toContain('verdict: absent — no-op');
        expect(scene.asMasked(result.again.stdout)).toMatchSnapshot();
        expect(JSON.parse(result.againJson.stdout).verdict).toEqual(
          'absent — no-op',
        );
        expect(scene.asMasked(result.againJson.stdout)).toMatchSnapshot();
      });
      then('get then shows no daemons and no watches, with the hint', () => {
        expect(result.listed.stdout).toContain('no daemons, no watches');
        expect(scene.asMasked(result.listed.stdout)).toMatchSnapshot();
      });
      then('get in json then holds an empty daemons list', () => {
        expect(JSON.parse(result.listedJson.stdout)).toEqual({ daemons: [] });
        expect(scene.asMasked(result.listedJson.stdout)).toMatchSnapshot();
      });
    });

    when(
      '[t1] the clone watches #1220 again, then deletes it under --output json',
      () => {
        const result = useThen('the delete runs', async () => {
          scene.runSkill({
            verb: 'set',
            args: ['--pull', '1220', '--mode', 'apply'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL_A,
          });
          await scene.waitForPrimed();
          return scene.runSkill({
            verb: 'del',
            args: ['--pull', '1220', '--mode', 'apply', '--output', 'json'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL_A,
          });
        });
        then('the json names the delete and the key it left', () => {
          expect(result.status).toEqual(0);
          const parsed = JSON.parse(result.stdout);
          expect(parsed.verdict).toEqual('deleted');
          expect(parsed.keys).toHaveLength(1);
          expect(scene.getAllWatchRecords()).toEqual([]);
          expect(scene.asMasked(result.stdout)).toMatchSnapshot();
        });
      },
    );
  });
});
