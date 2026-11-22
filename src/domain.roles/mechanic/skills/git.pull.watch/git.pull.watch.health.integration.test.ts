import { given, then, useThen, when } from 'test-fns';

import { genWatchTestScene } from './__test_utils__/genWatchTestScene';
import { waitForWatch } from './__test_utils__/waitForWatch';

/**
 * .what = each pr keeps its own read health, so one dark pr cannot hide behind
 *         a pr that reads fine
 * .why  = a box-wide outage clock that any good read clears would leave the
 *         watchers of a pr that fails each tick to wait in silence
 */
/**
 * .mock = github (`gh api`), the clone registry (`rhachet`), and the keyrack token
 *         read answer from genWatchTestScene stub bins on PATH; the skill, the
 *         daemon, and the filesystem run for real
 * .why  = one pr dark while another reads cannot be forced on the real github
 * .real = git.pull.watch.github.real.integration.test.ts (TEST_LIVE=github)
 */
jest.setTimeout(300_000);

const SERIAL_A = 'a1a1a1a1-0000-4000-8000-00000000000a';
const SERIAL_B = 'b2b2b2b2-0000-4000-8000-00000000000b';
const REPO = 'ehmpathy/surf-demo';

describe('git.pull.watch read health', () => {
  given('[case1] two clones, each on its own pr, one pr goes dark', () => {
    const scene = genWatchTestScene({
      slug: 'watch-health',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
        { serial: SERIAL_B, slug: 'mechanic-b', reachState: 'LIVE' },
      ];
      ['1220', '1221'].forEach((pr) => {
        store.github.prs[`${REPO}#${pr}`] = {
          state: 'open',
          merged: false,
          headSha: `sha-${pr}`,
          closedBy: null,
        };
      });
    });
    afterAll(() => scene.stopAllDaemons());
    const getSaysOutage = () =>
      scene.getSays().filter((say) => say.text.includes('cannot reach github'));

    when(
      '[t0] #1220 gets no reply past the note bound; #1221 reads fine',
      () => {
        const result = useThen(
          'the dark pr speaks to its own clone',
          async () => {
            scene.runSkill({
              verb: 'set',
              args: ['--which', '1220', '--mode', 'apply'],
              root: scene.roots['surf-demo']!,
              serial: SERIAL_A,
            });
            scene.runSkill({
              verb: 'set',
              args: ['--which', '1221', '--mode', 'apply'],
              root: scene.roots['surf-demo']!,
              serial: SERIAL_B,
            });
            await scene.waitForPrimed();
            scene.setStore((store) => {
              store.github.faultByPr = { [`${REPO}#1220`]: 'down' };
            });
            await waitForWatch({
              label: 'per-pr outage note',
              check: () => getSaysOutage().length > 0,
              scene,
            });
            await scene.waitForDaemonTicks({ ticks: 2 });
            const listed = scene.runSkill({
              verb: 'get',
              args: [],
              root: scene.roots['surf-demo']!,
              serial: null,
            });
            const listedJson = JSON.parse(
              scene.runSkill({
                verb: 'get',
                args: ['--output', 'json'],
                root: scene.roots['surf-demo']!,
                serial: null,
              }).stdout,
            );
            return { says: getSaysOutage(), listed, listedJson };
          },
        );
        then('one note goes, to the clone of the dark pr alone', () => {
          expect(result.says).toHaveLength(1);
          expect(result.says[0]!.serial).toEqual(SERIAL_A);
          expect(result.says[0]!.text).toContain('watches held: #1220');
        });
        then('no box-wide outage mark stands, since #1221 reads', () => {
          expect(result.listedJson.daemons[0].marks).toEqual([]);
        });
        then('get names the read fault on the row of #1220 alone', () => {
          const rows = result.listedJson.daemons[0].watches;
          const dark = rows.find((row: { pr: number }) => row.pr === 1220);
          const fine = rows.find((row: { pr: number }) => row.pr === 1221);
          expect(dark.readFault.rc).toEqual(5);
          expect(dark.readFault.cause).toContain('github unreachable');
          expect(fine.readFault).toEqual(null);
          expect(result.listed.stdout).toContain(`${REPO}#1220 → @:mechanic`);
          expect(result.listed.stdout).toContain('· read fault ');
          expect(result.listed.stdout).toContain(
            'a read fault holds the cursors of that pr',
          );
          expect(scene.asMasked(result.listed.stdout)).toMatchSnapshot();
        });
      },
    );

    when('[t1] #1220 reads again', () => {
      const result = useThen('its fault clears', async () => {
        scene.setStore((store) => {
          store.github.faultByPr = {};
        });
        await scene.waitForDaemonTicks({ ticks: 2 });
        return JSON.parse(
          scene.runSkill({
            verb: 'get',
            args: ['--output', 'json'],
            root: scene.roots['surf-demo']!,
            serial: null,
          }).stdout,
        );
      });
      then('no row holds a read fault', () => {
        const rows = result.daemons[0].watches;
        expect(
          rows.filter((row: { readFault: unknown }) => row.readFault !== null),
        ).toEqual([]);
      });
    });

    when('[t2] #1221 answers 404', () => {
      const result = useThen('its watch ends', async () => {
        const saysBefore = scene.getSays().length;
        scene.setStore((store) => {
          store.github.faultByPr = { [`${REPO}#1221`]: 'notfound' };
        });
        await waitForWatch({
          label: 'the #1221 watch leaves',
          check: () =>
            !scene.getAllWatchRecords().some((one) => one.record.pr === 1221),
          scene,
        });
        const saysAtEnd = scene.getSays().slice(saysBefore);
        const readsAtEnd = scene
          .getGhCalls()
          .filter((call) => call.argv.some((a) => a.includes('/1221'))).length;
        await scene.waitForDaemonTicks({ ticks: 4 });
        const readsAfter = scene
          .getGhCalls()
          .filter((call) => call.argv.some((a) => a.includes('/1221'))).length;
        scene.setStore((store) => {
          store.github.faultByPr = {};
        });
        return {
          saysGone: saysAtEnd.filter((say) => say.text.includes('404')),
          saysNewAfter: scene.getSays().length - saysBefore - saysAtEnd.length,
          readsAtEnd,
          readsAfter,
        };
      });
      then('one note reaches the clone of #1221, with the rewatch', () => {
        expect(result.saysGone).toHaveLength(1);
        expect(result.saysGone[0]!.serial).toEqual(SERIAL_B);
        expect(result.saysGone[0]!.text).toContain(
          '#1221 answers 404 to the seaturtle token (gone, or out of its reach); watch ended',
        );
        expect(result.saysGone[0]!.text).toContain(
          'rewatch: rhx git.pull.watch set --which 1221 --mode apply',
        );
        expect(scene.asMasked(result.saysGone[0]!.text)).toMatchSnapshot();
      });
      then('the watch stays ended: no read of #1221 and no note after', () => {
        expect(result.readsAfter).toEqual(result.readsAtEnd);
        expect(result.saysNewAfter).toEqual(0);
      });
    });
  });

  given('[case3] a pr whose every read faults, from the first', () => {
    const scene = genWatchTestScene({
      slug: 'watch-health-dark',
      repos: ['surf-demo'],
      store: {},
      // a short idle ttl, and a gap that can grow, so the end and the wait are both seen
      env: {
        GIT_PULL_WATCH_IDLE_TTL_SECONDS: '8',
        GIT_PULL_WATCH_POLL_MAX_SECONDS: '4',
      },
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
      store.github.prs[`${REPO}#1240`] = {
        state: 'open',
        merged: false,
        headSha: 'sha-1240',
        closedBy: null,
      };
      store.github.faultByPr = { [`${REPO}#1240`]: 'forbidden' };
    });
    afterAll(() => scene.stopAllDaemons());

    when('[t0] the watch is set and the idle ttl passes', () => {
      const result = useThen('its watch ends', async () => {
        scene.runSkill({
          verb: 'set',
          args: ['--which', '1240', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        });
        await waitForWatch({
          label: 'the dark watch leaves',
          check: () => scene.getAllWatchRecords().length === 0,
          timeoutMs: 120_000,
          scene,
        });
        return {
          says: scene.getSays().filter((say) => say.text.includes('#1240')),
          reads: scene
            .getGhCalls()
            .filter((call) => call.argv.some((a) => a.endsWith('/pulls/1240')))
            .length,
        };
      });
      then('one idle note names the rewatch', () => {
        expect(result.says).toHaveLength(1);
        expect(result.says[0]!.text).toContain('#1240 unreadable for');
        expect(result.says[0]!.text).toContain(
          'rewatch: rhx git.pull.watch set --which 1240 --mode apply',
        );
        expect(scene.asMasked(result.says[0]!.text)).toMatchSnapshot();
      });
      then(
        'the gap grew on each failed read: far fewer reads than the ttl has ticks',
        () => {
          expect(result.reads).toBeLessThanOrEqual(5);
        },
      );
    });
  });

  given('[case3b] a pr whose every read gets no reply, from the first', () => {
    const scene = genWatchTestScene({
      slug: 'watch-health-dark-down',
      repos: ['surf-demo'],
      store: {},
      env: {
        GIT_PULL_WATCH_IDLE_TTL_SECONDS: '8',
        GIT_PULL_WATCH_POLL_MAX_SECONDS: '4',
      },
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
      store.github.prs[`${REPO}#1241`] = {
        state: 'open',
        merged: false,
        headSha: 'sha-1241',
        closedBy: null,
      };
      store.github.faultByPr = { [`${REPO}#1241`]: 'down' };
    });
    afterAll(() => scene.stopAllDaemons());

    when('[t0] the watch is set and the idle ttl passes', () => {
      const result = useThen('its watch ends', async () => {
        scene.runSkill({
          verb: 'set',
          args: ['--which', '1241', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        });
        await waitForWatch({
          label: 'the unreachable watch leaves',
          check: () => scene.getAllWatchRecords().length === 0,
          timeoutMs: 120_000,
          scene,
        });
        return {
          idle: scene
            .getSays()
            .filter((say) => say.text.includes('#1241 unreadable for')),
          reads: scene
            .getGhCalls()
            .filter((call) => call.argv.some((a) => a.endsWith('/pulls/1241')))
            .length,
        };
      });
      then('one idle note names the rewatch', () => {
        expect(result.idle).toHaveLength(1);
        expect(result.idle[0]!.text).toContain(
          'rewatch: rhx git.pull.watch set --which 1241 --mode apply',
        );
        expect(scene.asMasked(result.idle[0]!.text)).toMatchSnapshot();
      });
      then(
        'the gap grew on each read with no reply: far fewer reads than the ttl has ticks',
        () => {
          expect(result.reads).toBeLessThanOrEqual(5);
        },
      );
    });
  });

  given('[case3c] a second set on a pr whose every read faults', () => {
    const scene = genWatchTestScene({
      slug: 'watch-health-dark-reset',
      repos: ['surf-demo'],
      store: {},
      env: {
        GIT_PULL_WATCH_IDLE_TTL_SECONDS: '10',
        GIT_PULL_WATCH_POLL_MAX_SECONDS: '2',
      },
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
      store.github.prs[`${REPO}#1242`] = {
        state: 'open',
        merged: false,
        headSha: 'sha-1242',
        closedBy: null,
      };
      store.github.faultByPr = { [`${REPO}#1242`]: 'forbidden' };
    });
    afterAll(() => scene.stopAllDaemons());
    const setWatch = () =>
      scene.runSkill({
        verb: 'set',
        args: ['--which', '1242', '--mode', 'apply'],
        root: scene.roots['surf-demo']!,
        serial: SERIAL_A,
      });
    const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

    when(
      '[t0] the watch is set, faults for 6s, is set again, and the first ttl passes',
      () => {
        const result = useThen('the first deadline passes', async () => {
          // fixed waits hold under load: `set` clears the idle clock before it returns,
          // so a slow daemon tick can only push the deadline later, never pull it earlier
          setWatch();
          await sleep(6_000);
          setWatch();
          // the first set's idle deadline sits at ~10s; wait well past it
          await sleep(7_000);
          return { records: scene.getAllWatchRecords() };
        });
        then(
          'the watch still stands: the second set restarted its idle clock',
          () => {
            expect(result.records).toHaveLength(1);
            expect(result.records[0]!.record.ended ?? null).toEqual(null);
          },
        );
      },
    );

    when('[t1] the restarted ttl passes', () => {
      const result = useThen('its watch ends', async () => {
        await waitForWatch({
          label: 'the dark watch leaves',
          check: () => scene.getAllWatchRecords().length === 0,
          timeoutMs: 60_000,
          scene,
        });
        return {
          idle: scene
            .getSays()
            .filter((say) => say.text.includes('#1242 unreadable for')),
        };
      });
      then('one idle note, once', () => {
        expect(result.idle).toHaveLength(1);
        expect(scene.asMasked(result.idle[0]!.text)).toMatchSnapshot();
      });
    });
  });

  given(
    '[case4] a live pr whose head is gone: its pull reads fine, its check-runs answer 404',
    () => {
      const scene = genWatchTestScene({
        slug: 'watch-health-subread',
        repos: ['surf-demo'],
        store: {},
      });
      scene.setStore((store) => {
        store.clones[scene.roots['surf-demo']!] = [
          { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
        ];
        store.github.prs[`${REPO}#1250`] = {
          state: 'open',
          merged: false,
          headSha: 'sha-1250-forcepushed',
          closedBy: null,
        };
        store.github.headsNotFound = ['sha-1250-forcepushed'];
      });
      afterAll(() => scene.stopAllDaemons());

      when('[t0] the watch is set and ticks pass', () => {
        const result = useThen('the ticks pass', async () => {
          scene.runSkill({
            verb: 'set',
            args: ['--which', '1250', '--mode', 'apply'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL_A,
          });
          await waitForWatch({
            label: 'a check-runs 404',
            check: () =>
              scene
                .getGhCalls()
                .some(
                  (call) =>
                    call.status === 404 &&
                    call.argv.some((a) => a.includes('/check-runs')),
                ),
            scene,
          });
          await scene.waitForDaemonTicks({ ticks: 3 });
          return {
            records: scene.getAllWatchRecords(),
            gone: scene.getSays().filter((say) => say.text.includes('404')),
            listed: JSON.parse(
              scene.runSkill({
                verb: 'get',
                args: ['--output', 'json'],
                root: scene.roots['surf-demo']!,
                serial: null,
              }).stdout,
            ),
            tree: scene.runSkill({
              verb: 'get',
              args: [],
              root: scene.roots['surf-demo']!,
              serial: null,
            }).stdout,
          };
        });
        then('the get tree names the 404 on the row of #1250', () => {
          expect(result.tree).toContain(`${REPO}#1250 → @:mechanic`);
          expect(result.tree).toContain('· read fault ');
          expect(result.tree).toContain('(status: 404)');
          expect(
            scene
              .asMasked(result.tree)
              .replace(/read fault \d+ min/g, 'read fault <n> min'),
          ).toMatchSnapshot();
        });
        then(
          'the watch stays: only the pull itself can say a pr is gone',
          () => {
            expect(result.records).toHaveLength(1);
            expect(result.records[0]!.record.ended ?? null).toEqual(null);
          },
        );
        then('no 404 note is sent', () => {
          expect(result.gone).toHaveLength(0);
        });
        then('get shows the 404 as a read fault on the row', () => {
          const row = result.listed.daemons[0].watches[0];
          expect(row.readFault.rc).toEqual(1);
          expect(row.readFault.cause).toContain('404');
        });
      });
    },
  );

  given(
    '[case2] a pr that answers 404 to the grove token, the seaturtle token not granted',
    () => {
      const scene = genWatchTestScene({
        slug: 'watch-health-grove',
        repos: ['surf-demo'],
        store: { keyrack: 'locked', keyrackAmbient: 'granted' },
      });
      scene.setStore((store) => {
        store.clones[scene.roots['surf-demo']!] = [
          { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
        ];
        store.github.prs[`${REPO}#1230`] = {
          state: 'open',
          merged: false,
          headSha: 'sha-1230',
          closedBy: null,
        };
        store.github.faultByPr = { [`${REPO}#1230`]: 'notfound' };
      });
      afterAll(() => scene.stopAllDaemons());

      when('[t0] the first due read', () => {
        const result = useThen('its watch ends', async () => {
          scene.runSkill({
            verb: 'set',
            args: ['--which', '1230', '--mode', 'apply'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL_A,
          });
          await waitForWatch({
            label: 'the #1230 watch leaves',
            check: () => scene.getAllWatchRecords().length === 0,
            scene,
          });
          return {
            says: scene.getSays().filter((say) => say.text.includes('404')),
          };
        });
        then(
          'the note names the grove token and puts the seaturtle unlock before the rewatch',
          () => {
            expect(result.says).toHaveLength(1);
            const text = result.says[0]!.text;
            expect(text).toContain(
              '#1230 answers 404 to the grove token (@all.prep.GITHUB_TOKEN); watch ended',
            );
            expect(text).toContain(
              "the pr may be gone, or out of the grove token's reach; the seaturtle token was not granted",
            );
            expect(text).toContain(
              'rewatch, once the seaturtle token is unlocked: rhx git.pull.watch set --which 1230 --mode apply',
            );
            expect(scene.asMasked(text)).toMatchSnapshot();
          },
        );
      });
    },
  );
});
