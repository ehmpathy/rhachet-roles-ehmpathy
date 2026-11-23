import * as fs from 'fs';
import * as path from 'path';
import { given, then, useThen, when } from 'test-fns';

import { genWatchTestScene } from './__test_utils__/genWatchTestScene';
import { waitForWatch } from './__test_utils__/waitForWatch';

/**
 * .what = the daemon reads its github token once and holds it: keyrack is asked
 *         only at a due read with no token held, and again only when github says
 *         the one held is stale: a 401, or a 404 to the held grove token
 * .why  = a keyrack read births a node process; at one read per tick, an idle
 *         daemon births ~1,440 a day for a token that rarely changes (S1)
 */
/**
 * .mock = github (`gh api`), the clone registry and keyrack (`rhachet`) from
 *         genWatchTestScene stub bins on PATH; the skill, the daemon, and the
 *         filesystem run for real
 * .why  = a token rotation mid-life and a locked keyrack at boot cannot be forced
 *         on the real keyrack on demand, and each keyrack call must be counted
 * .real = git.pull.watch.rhachet.real.integration.test.ts (the real keyrack read)
 */
jest.setTimeout(300_000);

const SERIAL = 'a1a1a1a1-0000-4000-8000-00000000000a';
const REPO = 'ehmpathy/surf-demo';
const SLUG_SEATURTLE = 'ehmpathy.prep.EHMPATHY_SEATURTLE_GITHUB_TOKEN';

describe('git.pull.watch token', () => {
  given(
    '[case1] a daemon with one watch; keyrack grants the seaturtle token',
    () => {
      const scene = genWatchTestScene({
        slug: 'watch-token-held',
        repos: ['surf-demo'],
        store: { keyrackAmbient: 'granted' },
      });
      scene.setStore((store) => {
        store.clones[scene.roots['surf-demo']!] = [
          { serial: SERIAL, slug: 'mechanic', reachState: 'LIVE' },
        ];
        store.github.prs[`${REPO}#1220`] = {
          state: 'open',
          merged: false,
          headSha: 'sha-1220',
          closedBy: null,
        };
      });
      afterAll(() => scene.stopAllDaemons());
      const setWatch = () =>
        scene.runSkill({
          verb: 'set',
          args: ['--which', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL,
        });

      when('[t0] the watch primes, then many ticks pass', () => {
        const result = useThen('the ticks pass', async () => {
          setWatch();
          await scene.waitForPrimed();
          const keyrackAtPrime = scene.getKeyrackCalls().length;
          const ghAtPrime = scene.getGhCalls().length;
          await scene.waitForDaemonTicks({ ticks: 8 });
          return {
            keyrackAtPrime,
            keyrackAfter: scene.getKeyrackCalls().length,
            ghNew: scene.getGhCalls().length - ghAtPrime,
          };
        });
        then('keyrack was read once, for the first due read', () => {
          expect(result.keyrackAtPrime).toEqual(1);
        });
        then('keyrack is not read again while github accepts the token', () => {
          expect(result.keyrackAfter).toEqual(result.keyrackAtPrime);
        });
        then('github reads go on with the held token', () => {
          expect(result.ghNew).toBeGreaterThan(0);
        });
      });

      when(
        '[t1] the seaturtle token dies at its hour; keyrack now grants only the grove token',
        () => {
          const result = useThen('the next read', async () => {
            const keyrackBefore = scene.getKeyrackCalls().length;
            scene.setStore((store) => {
              store.github.token = 'ghs_fake_ehmpath_token_next_hour';
              store.keyrack = 'locked';
            });
            // a push: the pr is due at the next tick
            setWatch();
            await waitForWatch({
              label: 'a read with the grove token',
              check: () =>
                scene
                  .getGhCalls()
                  .some(
                    (call) =>
                      call.token === 'ghs_fake_grove_token' &&
                      (call.status === 200 || call.status === 304),
                  ),
              scene,
            });
            const keyrackAtSwap = scene.getKeyrackCalls().length;
            await scene.waitForDaemonTicks({ ticks: 6 });
            return {
              keyrackSwap: scene
                .getKeyrackCalls()
                .slice(keyrackBefore, keyrackAtSwap)
                .map((call) => call.argv[call.argv.indexOf('--key') + 1]),
              keyrackAfterSwap: scene.getKeyrackCalls().length - keyrackAtSwap,
              refused: scene
                .getGhCalls()
                .filter(
                  (call) =>
                    call.token === 'ghs_fake_ehmpath_token' &&
                    call.status === 401,
                ).length,
              paused: scene
                .getSays()
                .filter((say) => say.text.includes('paused')),
            };
          });
          then('github refused the held token once', () => {
            expect(result.refused).toEqual(1);
          });
          then(
            'one fresh read swaps to the grove token: the seaturtle key, then the grove key',
            () => {
              expect(result.keyrackSwap).toEqual([
                SLUG_SEATURTLE,
                '@all.prep.GITHUB_TOKEN',
              ]);
            },
          );
          then('no pause and no paused note', () => {
            expect(result.paused).toHaveLength(0);
          });
          then(
            'keyrack is not read again while github accepts the grove token',
            () => {
              expect(result.keyrackAfterSwap).toEqual(0);
            },
          );
        },
      );
    },
  );

  given('[case2] a daemon born while keyrack is locked', () => {
    const scene = genWatchTestScene({
      slug: 'watch-token-locked',
      repos: ['surf-demo'],
      store: { keyrack: 'locked' },
      // a gap that can grow, so a paused tick is seen to wait
      env: { GIT_PULL_WATCH_POLL_MAX_SECONDS: '16' },
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL, slug: 'mechanic', reachState: 'LIVE' },
      ];
      store.github.prs[`${REPO}#1220`] = {
        state: 'open',
        merged: false,
        headSha: 'sha-1220',
        closedBy: null,
      };
    });
    afterAll(() => scene.stopAllDaemons());
    const setWatch = () =>
      scene.runSkill({
        verb: 'set',
        args: ['--which', '1220', '--mode', 'apply'],
        root: scene.roots['surf-demo']!,
        serial: SERIAL,
      });
    const getSeaturtleReads = () =>
      scene
        .getKeyrackCalls()
        .filter((call) => call.argv.includes(SLUG_SEATURTLE)).length;

    when('[t0] the watch is set, and ten ticks pass in the pause', () => {
      const result = useThen('the ticks pass', async () => {
        setWatch();
        await waitForWatch({
          label: 'paused note',
          check: () =>
            scene
              .getSays()
              .some((say) => say.text.includes('github token locked')),
          scene,
        });
        await scene.waitForDaemonTicks({ ticks: 10 });
        return {
          reads: getSeaturtleReads(),
          paused: scene.getSays().filter((say) => say.text.includes('paused')),
          gh: scene.getGhCalls().length,
        };
      });
      then('one paused note names the unlock', () => {
        expect(result.paused).toHaveLength(1);
        expect(result.paused[0]!.text).toContain('fix: rhx keyrack unlock');
      });
      then(
        'keyrack is re-read on a doubled gap, not each tick: well under ten reads',
        () => {
          expect(result.reads).toBeLessThanOrEqual(6);
        },
      );
      then('no github read is made with no token', () => {
        expect(result.gh).toEqual(0);
      });
    });

    when('[t1] keyrack unlocks, and a push lands', () => {
      const result = useThen('the pause lifts', async () => {
        scene.setStore((store) => {
          store.keyrack = 'granted';
        });
        setWatch();
        await waitForWatch({
          label: 'a read with the seaturtle token',
          check: () =>
            scene
              .getGhCalls()
              .some((call) => call.token === 'ghs_fake_ehmpath_token'),
          scene,
        });
        await scene.waitForPrimed();
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
      then(
        'the push snaps the gap back: the next tick reads and primes',
        () => {
          expect(result.daemons[0].watches[0].primed).toEqual(true);
        },
      );
      then('the pause has lifted', () => {
        expect(result.daemons[0].paused ?? null).toEqual(null);
      });
    });
  });

  given(
    '[case3] a private pr the grove token cannot see; the seaturtle token lapses, then is unlocked again',
    () => {
      const scene = genWatchTestScene({
        slug: 'watch-token-grove-404',
        repos: ['surf-demo'],
        store: { keyrackAmbient: 'granted' },
      });
      scene.setStore((store) => {
        store.clones[scene.roots['surf-demo']!] = [
          { serial: SERIAL, slug: 'mechanic', reachState: 'LIVE' },
        ];
        store.github.prs[`${REPO}#1230`] = {
          state: 'open',
          merged: false,
          headSha: 'sha-1230',
          closedBy: null,
        };
        store.github.prsHiddenFromAmbient = [`${REPO}#1230`];
      });
      afterAll(() => scene.stopAllDaemons());
      const setWatch = () =>
        scene.runSkill({
          verb: 'set',
          args: ['--which', '1230', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL,
        });
      const getSaysGone = () =>
        scene.getSays().filter((say) => say.text.includes('#1230 answers 404'));

      when(
        '[t0] the seaturtle token lapses mid-life, and the grove token takes over',
        () => {
          const result = useThen('the watch ends', async () => {
            setWatch();
            await scene.waitForPrimed();
            scene.setStore((store) => {
              store.github.token = 'ghs_fake_ehmpath_token_next_hour';
              store.keyrack = 'locked';
            });
            // a push: the pr is due at the next tick
            setWatch();
            await waitForWatch({
              label: 'the #1230 watch leaves',
              check: () => scene.getAllWatchRecords().length === 0,
              scene,
            });
            return { gone: getSaysGone() };
          });
          then(
            'one note names the grove token and puts the seaturtle unlock before the rewatch',
            () => {
              expect(result.gone).toHaveLength(1);
              expect(result.gone[0]!.text).toContain(
                'answers 404 to the grove token',
              );
              expect(result.gone[0]!.text).toContain(
                '1. unlock: rhx keyrack unlock --owner ehmpath --env prep --key EHMPATHY_SEATURTLE_GITHUB_TOKEN',
              );
              expect(result.gone[0]!.text).toContain(
                '2. rewatch: rhx git.pull.watch set --which 1230 --mode apply',
              );
              expect(scene.asMasked(result.gone[0]!.text)).toMatchSnapshot();
            },
          );
        },
      );

      when(
        '[t1] the seaturtle token is unlocked, and the clone rewatches as the note says',
        () => {
          const result = useThen('the rewatch is served', async () => {
            const keyrackBefore = scene.getKeyrackCalls().length;
            scene.setStore((store) => {
              store.keyrack = 'granted';
            });
            setWatch();
            await waitForWatch({
              label: 'a seaturtle read of #1230',
              check: () =>
                scene
                  .getGhCalls()
                  .some(
                    (call) =>
                      call.token === 'ghs_fake_ehmpath_token_next_hour' &&
                      call.status === 200,
                  ),
              scene,
            });
            await scene.waitForPrimed();
            await scene.waitForDaemonTicks({ ticks: 4 });
            return {
              records: scene.getAllWatchRecords(),
              gone: getSaysGone(),
              keyrack: scene.getKeyrackCalls().length - keyrackBefore,
            };
          });
          then(
            'the watch stands and primes: the held grove token was dropped for the seaturtle token',
            () => {
              expect(result.records).toHaveLength(1);
              expect(result.records[0]!.record.ended ?? null).toEqual(null);
            },
          );
          then('no second 404 note', () => {
            expect(result.gone).toHaveLength(1);
          });
          then('one fresh keyrack read did it, and no read after', () => {
            expect(result.keyrack).toEqual(1);
          });
        },
      );
    },
  );

  given(
    '[case4] a paused daemon whose first read after the unlock answers 404',
    () => {
      const scene = genWatchTestScene({
        slug: 'watch-token-pause-404',
        repos: ['surf-demo'],
        store: { keyrack: 'locked' },
      });
      scene.setStore((store) => {
        store.clones[scene.roots['surf-demo']!] = [
          { serial: SERIAL, slug: 'mechanic', reachState: 'LIVE' },
        ];
        store.github.prs[`${REPO}#1240`] = {
          state: 'open',
          merged: false,
          headSha: 'sha-1240',
          closedBy: null,
        };
      });
      afterAll(() => scene.stopAllDaemons());
      const getPausedMarks = () =>
        fs
          .readdirSync(scene.getStateRoot())
          .filter((name) => name.startsWith('v='))
          .filter((name) =>
            fs.existsSync(
              path.join(scene.getStateRoot(), name, 'daemon.paused'),
            ),
          );

      when('[t0] the unlock lands, and the pr is gone', () => {
        const result = useThen('the watch ends', async () => {
          scene.runSkill({
            verb: 'set',
            args: ['--which', '1240', '--mode', 'apply'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL,
          });
          await waitForWatch({
            label: 'paused',
            check: () => getPausedMarks().length > 0,
            scene,
          });
          scene.setStore((store) => {
            store.keyrack = 'granted';
            store.github.faultByPr = { [`${REPO}#1240`]: 'notfound' };
          });
          // a push: the pr is due at the next tick
          scene.runSkill({
            verb: 'set',
            args: ['--which', '1240', '--mode', 'apply'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL,
          });
          await waitForWatch({
            label: 'the #1240 watch leaves',
            check: () => scene.getAllWatchRecords().length === 0,
            scene,
          });
          return { paused: getPausedMarks() };
        });
        then('the pause lifts: a 404 proves github accepts the token', () => {
          expect(result.paused).toEqual([]);
        });
      });
    },
  );
});
