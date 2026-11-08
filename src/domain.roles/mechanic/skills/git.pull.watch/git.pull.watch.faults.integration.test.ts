import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import {
  genWatchTestScene,
  SKILL_DIR,
  type WatchScene,
} from './__test_utils__/genWatchTestScene';
import { waitForWatch } from './__test_utils__/waitForWatch';

/**
 * .what = the faults a daemon meets on a real box: a repo root whose keyrack
 *         cannot grant, a queue write that does not land, an outage clock that
 *         will not read, a record that will not parse, a pause a `set` must name,
 *         and a PATH with no gh
 * .why  = each fault once blinded a watch in silence, or dropped an alert; each
 *         clamp here fails with its fix reverted
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

/**
 * .what = an open pr in the store, with no checks yet
 */
const setPrOpen = (input: {
  scene: WatchScene;
  repo: string;
  pr: string;
}): void =>
  input.scene.setStore((store) => {
    store.github.prs[`${input.repo}#${input.pr}`] = {
      state: 'open',
      merged: false,
      headSha: `sha-${input.pr}`,
      closedBy: null,
    };
    store.github.checks[`sha-${input.pr}`] = [];
  });

/**
 * .what = a failed check run on a pr's head
 */
const setCheckFailed = (input: {
  scene: WatchScene;
  pr: string;
  id: number;
  name: string;
}): void =>
  input.scene.setStore((store) => {
    store.github.checks[`sha-${input.pr}`]!.push({
      id: input.id,
      name: input.name,
      status: 'completed',
      conclusion: 'failure',
      html_url: `https://github.com/ehmpathy/surf-demo/runs/${input.id}`,
    });
  });

/**
 * .what = the key dir that holds the scene's one watch
 */
const getKeyDir = (scene: WatchScene): string =>
  path.dirname(path.dirname(scene.getAllWatchRecords()[0]!.path));

describe('git.pull.watch faults', () => {
  given(
    '[case1] two watched repos; the first by sort has no keyrack manifest',
    () => {
      const scene = genWatchTestScene({
        slug: 'watch-faults-case1',
        repos: ['aa-reef', 'zz-reef'],
        store: {},
      });
      scene.setStore((store) => {
        store.clones[scene.roots['aa-reef']!] = [
          { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
        ];
        store.clones[scene.roots['zz-reef']!] = [
          { serial: SERIAL_B, slug: 'mechanic-two', reachState: 'LIVE' },
        ];
        // a root with no manifest reads absent; the other grants
        store.keyrackByRoot = { [scene.roots['aa-reef']!]: 'absent' };
      });
      setPrOpen({ scene, repo: 'ehmpathy/aa-reef', pr: '7' });
      setPrOpen({ scene, repo: 'ehmpathy/zz-reef', pr: '8' });
      afterAll(() => scene.stopAllDaemons());

      when('[t0] a check fails on the pr of the second repo', () => {
        const result = useThen('the daemon reads with the token', async () => {
          // the root that grants is watched first, so no tick ever sees the
          // manifest-less root alone (a pause then would be the honest answer)
          scene.runSkill({
            verb: 'set',
            args: ['--pull', '8', '--mode', 'apply'],
            root: scene.roots['zz-reef']!,
            serial: SERIAL_B,
          });
          await scene.waitForPrimed();
          scene.runSkill({
            verb: 'set',
            args: ['--pull', '7', '--mode', 'apply'],
            root: scene.roots['aa-reef']!,
            serial: SERIAL_A,
          });
          await scene.waitForPrimed();
          setCheckFailed({ scene, pr: '8', id: 91, name: 'test-unit' });
          await waitForWatch({
            label: 'the ci alert for #8',
            check: () =>
              scene.getSays().some((say) => say.text.includes('test-unit')),
            scene,
          });
          return { says: scene.getSays() };
        });
        then('the alert reaches the clone of the second repo', () => {
          const alert = result.says.find((say) =>
            say.text.includes('test-unit'),
          );
          expect(alert?.serial).toEqual(SERIAL_B);
        });
        then('no clone is told the token is not filled', () => {
          expect(
            result.says.filter((say) => say.text.includes('paused')),
          ).toEqual([]);
        });
      });
    },
  );

  given('[case2] a queue write that does not land', () => {
    const scene = genWatchTestScene({
      slug: 'watch-faults-case2',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
    });
    setPrOpen({ scene, repo: 'ehmpathy/surf-demo', pr: '1220' });
    afterAll(() => scene.stopAllDaemons());

    when(
      '[t0] a check fails while a file sits where the outbox dir belongs',
      () => {
        const result = useThen('the daemon ticks past it', async () => {
          scene.runSkill({
            verb: 'set',
            args: ['--pull', '1220', '--mode', 'apply'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL_A,
          });
          await scene.waitForPrimed();
          const outbox = path.join(getKeyDir(scene), 'outbox');
          fs.rmSync(outbox, { recursive: true, force: true });
          fs.writeFileSync(outbox, 'not a dir');
          setCheckFailed({ scene, pr: '1220', id: 81, name: 'test-unit' });
          await scene.waitForDaemonTicks({ ticks: 3 });
          const saysWhileBlocked = scene.getSays();
          const log = fs.readFileSync(
            path.join(getKeyDir(scene), 'daemon.log'),
            'utf-8',
          );

          // the outbox comes back; the held alert must still arrive
          fs.rmSync(outbox, { force: true });
          await waitForWatch({
            label: 'the ci alert after the outbox returns',
            check: () =>
              scene.getSays().some((say) => say.text.includes('test-unit')),
            scene,
          });
          return { saysWhileBlocked, log, says: scene.getSays() };
        });
        then('no alert goes out while the queue cannot be written', () => {
          expect(result.saysWhileBlocked).toEqual([]);
        });
        then('the log names the fault and that the cursors hold', () => {
          expect(result.log).toContain('outbox write failed');
        });
        then(
          'once the outbox can be written, the alert arrives: never dropped',
          () => {
            expect(
              result.says.filter((say) => say.text.includes('test-unit')),
            ).toHaveLength(1);
          },
        );
      },
    );
  });

  given('[case3] an outage clock that cannot be written', () => {
    const scene = genWatchTestScene({
      slug: 'watch-faults-case3',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
    });
    setPrOpen({ scene, repo: 'ehmpathy/surf-demo', pr: '1220' });
    afterAll(() => scene.stopAllDaemons());

    when('[t0] github goes down for a few ticks', () => {
      const result = useThen('the daemon ticks through it', async () => {
        scene.runSkill({
          verb: 'set',
          args: ['--pull', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        });
        await scene.waitForPrimed();
        // a dir where the clock file belongs: the write fails, the read finds no number
        fs.mkdirSync(path.join(getKeyDir(scene), 'daemon.unreachable'));
        scene.setStore((store) => {
          store.github.fault = 'down';
        });
        await scene.waitForDaemonTicks({ ticks: 3 });
        return {
          says: scene.getSays(),
          log: fs.readFileSync(
            path.join(getKeyDir(scene), 'daemon.log'),
            'utf-8',
          ),
        };
      });
      then('no outage note fires on a clock it could not start', () => {
        expect(
          result.says.filter((say) => say.text.includes('cannot reach github')),
        ).toEqual([]);
      });
      then('the log names the unreadable clock', () => {
        expect(result.log).toContain('unreachable clock unreadable');
      });
    });
  });

  given('[case4] a watch record that will not parse', () => {
    const scene = genWatchTestScene({
      slug: 'watch-faults-case4',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
    });
    setPrOpen({ scene, repo: 'ehmpathy/surf-demo', pr: '1220' });
    afterAll(() => scene.stopAllDaemons());

    when('[t0] a human reads the watches with get', () => {
      const result = useThen('get runs', async () => {
        scene.runSkill({
          verb: 'set',
          args: ['--pull', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        });
        await scene.waitForPrimed();
        // a half-written record that sorts after the good one
        const corrupt = path.join(
          path.dirname(scene.getAllWatchRecords()[0]!.path),
          'ehmpathy.surf-demo.pr=9.clone=c3.json',
        );
        fs.writeFileSync(corrupt, '{"repo": "ehmpathy/surf-de');
        const tree = scene.runSkill({
          verb: 'get',
          args: [],
          root: scene.roots['surf-demo']!,
          serial: null,
        });
        const json = scene.runSkill({
          verb: 'get',
          args: ['--output', 'json'],
          root: scene.roots['surf-demo']!,
          serial: null,
        });
        fs.rmSync(corrupt, { force: true });
        return { tree, json, corrupt };
      });
      then('get exits 0, never raw', () => {
        expect(result.tree.status).toEqual(0);
        expect(result.json.status).toEqual(0);
      });
      then('the unreadable record is a row of its own, named by path', () => {
        expect(result.tree.stdout).toContain('unreadable record:');
        expect(result.tree.stdout).toContain('pr=9.clone=c3.json');
        expect(scene.asMasked(result.tree.stdout)).toMatchSnapshot();
      });
      then('the good watch still shows', () => {
        expect(result.tree.stdout).toContain('ehmpathy/surf-demo#1220');
        const watches = JSON.parse(result.json.stdout).daemons[0].watches;
        expect(watches).toHaveLength(2);
        expect(
          watches.filter((w: { unreadable?: boolean }) => w.unreadable),
        ).toHaveLength(1);
        expect(scene.asMasked(result.json.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case5] a set while the daemon is paused', () => {
    const scene = genWatchTestScene({
      slug: 'watch-faults-case5',
      repos: ['surf-demo'],
      store: { keyrack: 'locked' },
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
    });
    setPrOpen({ scene, repo: 'ehmpathy/surf-demo', pr: '1220' });
    setPrOpen({ scene, repo: 'ehmpathy/surf-demo', pr: '1221' });
    afterAll(() => scene.stopAllDaemons());

    when('[t0] the clone, already told of the pause, sets a second pr', () => {
      const result = useThen('set runs', async () => {
        scene.runSkill({
          verb: 'set',
          args: ['--pull', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        });
        await waitForWatch({
          label: 'the paused alert',
          check: () =>
            scene.getSays().some((say) => say.text.includes('paused')),
          scene,
        });
        return scene.runSkill({
          verb: 'set',
          args: ['--pull', '1221', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        });
      });
      then('set names the pause on its own line', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('· paused: token locked');
        expect(scene.asMasked(result.stdout)).toMatchSnapshot();
      });
      then('set names the fix for the pause in place', () => {
        expect(result.stdout).toContain(
          'a paused daemon reads naught; the github token is locked',
        );
        expect(result.stdout).toContain(
          'rhx keyrack unlock --owner ehmpath --env prep --key EHMPATHY_SEATURTLE_GITHUB_TOKEN',
        );
      });
    });
  });

  given('[case7] a clone list of a shape the daemon does not know', () => {
    const scene = genWatchTestScene({
      slug: 'watch-faults-case7',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
    });
    setPrOpen({ scene, repo: 'ehmpathy/surf-demo', pr: '1220' });
    afterAll(() => scene.stopAllDaemons());

    when('[t0] a newer rhachet answers `clone list` with `{}`', () => {
      const result = useThen('the daemon ticks past it', async () => {
        scene.runSkill({
          verb: 'set',
          args: ['--pull', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        });
        await scene.waitForPrimed();
        scene.setStore((store) => {
          store.registryShapeOdd = [scene.roots['surf-demo']!];
        });
        await scene.waitForDaemonTicks({ ticks: 3 });
        const records = scene.getAllWatchRecords();
        const log = fs.readFileSync(
          path.join(getKeyDir(scene), 'daemon.log'),
          'utf-8',
        );
        return { records, log };
      });
      then('the watch stands: an odd shape proves no clone absent', () => {
        expect(result.records).toHaveLength(1);
        expect(result.log).not.toContain('is absent; drop');
      });
    });
  });

  given(
    '[case8] a check that fails while `set` still reads the registry',
    () => {
      const scene = genWatchTestScene({
        slug: 'watch-faults-case8',
        repos: ['surf-demo'],
        store: {},
      });
      scene.setStore((store) => {
        store.clones[scene.roots['surf-demo']!] = [
          { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
        ];
      });
      setPrOpen({ scene, repo: 'ehmpathy/surf-demo', pr: '1220' });
      afterAll(() => scene.stopAllDaemons());

      when(
        '[t0] a lint fails 2s into a `set` whose registry read takes 4s',
        () => {
          const result = useThen('the daemon primes', async () => {
            // second-grained, as setAt is, so the two compare as strings
            const failedAt = new Date(Date.now() + 2_000)
              .toISOString()
              .replace(/\.\d{3}Z$/, 'Z');
            scene.setStore((store) => {
              store.cloneListDelayMs = 4_000;
              store.github.checks['sha-1220']!.push({
                id: 71,
                name: 'test-lint',
                status: 'completed',
                conclusion: 'failure',
                completed_at: failedAt,
                html_url: 'https://github.com/ehmpathy/surf-demo/runs/71',
              });
            });
            const set = scene.runSkill({
              verb: 'set',
              args: ['--pull', '1220', '--mode', 'apply'],
              root: scene.roots['surf-demo']!,
              serial: SERIAL_A,
            });
            scene.setStore((store) => {
              store.cloneListDelayMs = 0;
            });
            await scene.waitForPrimed();
            await waitForWatch({
              label: 'the lint alert',
              check: () =>
                scene.getSays().some((say) => say.text.includes('test-lint')),
              scene,
            });
            return { set, failedAt, record: scene.getAllWatchRecords()[0]! };
          });
          then(
            'the watch began when the verb began, before the slow read',
            () => {
              expect(result.set.status).toEqual(0);
              expect(
                JSON.parse(fs.readFileSync(result.record.path, 'utf-8'))
                  .setAt <= result.failedAt,
              ).toEqual(true);
            },
          );
          then('the failure inside the read alerts, never swallowed', () => {
            expect(
              scene.getSays().filter((say) => say.text.includes('test-lint')),
            ).toHaveLength(1);
          });
        },
      );
    },
  );

  given('[case11] a daemon killed while a clone list read is in flight', () => {
    const scene = genWatchTestScene({
      slug: 'watch-faults-case11',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
    });
    setPrOpen({ scene, repo: 'ehmpathy/surf-demo', pr: '1220' });
    afterAll(() => scene.stopAllDaemons());

    // the pids of the stub clone list reads of this scene, in flight now
    const getAllCloneListReadPids = (): number[] =>
      spawnSync('ps', ['-eo', 'pid=,args='], { encoding: 'utf-8' })
        .stdout.split('\n')
        .filter(
          (row) =>
            row.includes(scene.roots['surf-demo']!) &&
            row.includes('rhachet clone list'),
        )
        .map((row) => Number(row.trim().split(/\s+/)[0]));

    // true while a pid still runs
    const isPidAlive = (pid: number): boolean => {
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        return false;
      }
    };

    when(
      '[t0] the read returns after the daemon is gone, and the tick on disk is old',
      () => {
        const result = useThen('the orphan read ends', async () => {
          scene.runSkill({
            verb: 'set',
            args: ['--pull', '1220', '--mode', 'apply'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL_A,
          });
          await scene.waitForPrimed();

          // slow each clone list read, then give the daemon an alert to deliver
          scene.setStore((store) => {
            store.cloneListDelayMs = 6_000;
          });
          setCheckFailed({ scene, pr: '1220', id: 91, name: 'test-unit' });
          await waitForWatch({
            label: 'a clone list read in flight',
            check: () => getAllCloneListReadPids().length > 0,
            scene,
          });
          const reads = getAllCloneListReadPids();

          // kill the daemon mid-read; plant a tick an hour old
          scene.stopAllDaemons();
          const tickOld = String(Math.floor(Date.now() / 1000) - 3600);
          const heartbeat = path.join(getKeyDir(scene), 'daemon.heartbeat');
          fs.writeFileSync(heartbeat, tickOld);
          await waitForWatch({
            label: 'the orphan reads exit',
            check: () => reads.every((pid) => !isPidAlive(pid)),
            scene,
          });
          // the orphan subshell's hook runs just after its read returns
          await new Promise((done) => setTimeout(done, 1_000));
          return { tickOld, tickNow: fs.readFileSync(heartbeat, 'utf-8') };
        });
        then('the tick on disk stays the old one, never forged fresh', () => {
          expect(result.tickNow.trim()).toEqual(result.tickOld);
        });
      },
    );
  });

  given('[case9] a set over the clone own watch record, gone corrupt', () => {
    const scene = genWatchTestScene({
      slug: 'watch-faults-case9',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
    });
    setPrOpen({ scene, repo: 'ehmpathy/surf-demo', pr: '1220' });
    afterAll(() => scene.stopAllDaemons());

    when('[t0] the clone sets the same pr again', () => {
      const result = useThen('set runs', async () => {
        scene.runSkill({
          verb: 'set',
          args: ['--pull', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        });
        await scene.waitForPrimed();
        const record = scene.getAllWatchRecords()[0]!.path;
        fs.writeFileSync(record, '{"repo": "ehmpathy/surf-de');
        const set = scene.runSkill({
          verb: 'set',
          args: ['--pull', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        });
        return { set, body: fs.readFileSync(record, 'utf-8') };
      });
      then('set rewrites it, never reports a corrupt watch as found', () => {
        expect(result.set.status).toEqual(0);
        expect(result.set.stdout).not.toContain('found →');
        expect(result.set.stdout).toContain('set →');
      });
      then('the record parses again', () => {
        expect(JSON.parse(result.body).pr).toEqual(1220);
      });
    });
  });

  given('[case10] a head with more check runs than one page holds', () => {
    const scene = genWatchTestScene({
      slug: 'watch-faults-case10',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
    });
    setPrOpen({ scene, repo: 'ehmpathy/surf-demo', pr: '1220' });
    // 100 green runs on page one, and the 101st still in flight on page two
    scene.setStore((store) => {
      store.github.checks['sha-1220'] = [
        ...Array.from({ length: 100 }, (_, i) => ({
          id: 1000 + i,
          name: `shard-${i}`,
          status: 'completed' as const,
          conclusion: 'success',
          html_url: `https://github.com/ehmpathy/surf-demo/runs/${1000 + i}`,
        })),
        {
          id: 1100,
          name: 'test-acceptance',
          status: 'in_progress' as const,
          conclusion: null,
          html_url: 'https://github.com/ehmpathy/surf-demo/runs/1100',
        },
      ];
    });
    afterAll(() => scene.stopAllDaemons());

    when('[t0] the run on page two fails', () => {
      const result = useThen('the daemon ticks', async () => {
        scene.runSkill({
          verb: 'set',
          args: ['--pull', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        });
        await scene.waitForPrimed();
        await scene.waitForDaemonTicks({ ticks: 1 });
        scene.setStore((store) => {
          const last = store.github.checks['sha-1220']![100]!;
          last.status = 'completed';
          last.conclusion = 'failure';
        });
        await waitForWatch({
          label: 'the page-two failure alert',
          check: () =>
            scene.getSays().some((say) => say.text.includes('test-acceptance')),
          scene,
        });
        return { says: scene.getSays() };
      });
      then('it alerts: page one etag never hides a later page', () => {
        expect(
          result.says.filter((say) => say.text.includes('test-acceptance')),
        ).toHaveLength(1);
      });
    });
  });

  given('[case6] a daemon spawned with no gh on its PATH', () => {
    when('[t0] the daemon boots', () => {
      const result = useThen('it runs', async () => {
        const home = genTempDir({ slug: 'watch-faults-case6' });
        // a PATH that holds jq and the base tools, and no gh
        const bin = genTempDir({ slug: 'watch-faults-case6-bin' });
        ['jq', 'date', 'mkdir', 'rm', 'cat', 'mv', 'mktemp'].forEach((tool) => {
          const found = spawnSync('bash', ['-c', `command -v ${tool}`], {
            encoding: 'utf-8',
          }).stdout.trim();
          fs.symlinkSync(found, path.join(bin, tool));
        });
        const bash = spawnSync('bash', ['-c', 'command -v bash'], {
          encoding: 'utf-8',
        }).stdout.trim();
        const out = spawnSync(
          bash,
          [path.join(SKILL_DIR, 'git.pull.watch.daemon.sh'), '1.0.0+abcd1234'],
          {
            encoding: 'utf-8',
            env: { HOME: home, PATH: bin },
            timeout: 30_000,
          },
        );
        return { out, home };
      });
      then('it exits 1 at boot and names the absent tool', () => {
        expect(result.out.status).toEqual(1);
        expect(result.out.stdout).toContain('boot defect: gh is not on PATH');
      });
      then('it claims no pid record', () => {
        const pidFile = path.join(
          result.home,
          '.rhachet/storage/repo=ehmpathy/role=mechanic/skill=git.pull.watch/v=1.0.0+abcd1234/daemon.pid',
        );
        expect(fs.existsSync(pidFile)).toEqual(false);
      });
    });
  });
});
