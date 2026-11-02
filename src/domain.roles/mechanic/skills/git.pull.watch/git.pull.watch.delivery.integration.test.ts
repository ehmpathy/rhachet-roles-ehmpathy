import * as fs from 'fs';
import * as path from 'path';
import { given, then, useThen, when } from 'test-fns';

import {
  genWatchTestScene,
  SKILL_DIR,
  type WatchScene,
} from './__test_utils__/genWatchTestScene';
import { getAllWatchDaemonPids } from './__test_utils__/getAllWatchDaemonPids';
import { waitForWatch } from './__test_utils__/waitForWatch';

/**
 * .what = alert delivery: a busy clone holds the alert, a lost token pauses
 *         the watch loud, a clone in another repo is reached by serial, and a
 *         call the skill cannot serve is refused with its fix
 * .why  = vision demo cases 7, 8, 13 and invariants F6, F7, F8; entries E7
 */
jest.setTimeout(400_000);

const SERIAL_A = 'a1a1a1a1-0000-4000-8000-00000000000a';
const SERIAL_C = 'c3c3c3c3-0000-4000-8000-00000000000c';

/**
 * .what = an open pr in one repo of the store, with one in-progress check
 */
const setPrOpen = (input: {
  scene: WatchScene;
  repo: string;
  pr: string;
}): void =>
  input.scene.setStore((store) => {
    const { repo, pr } = input;
    store.github.prs[`${repo}#${pr}`] = {
      state: 'open',
      merged: false,
      headSha: `sha-${pr}`,
      closedBy: null,
    };
    store.github.checks[`sha-${pr}`] = [];
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

describe('git.pull.watch delivery', () => {
  given(
    '[case7] an alert due while the clone is busy, at a modal, then free',
    () => {
      const scene = genWatchTestScene({
        slug: 'watch-case7',
        repos: ['surf-demo'],
        store: {},
      });
      scene.setStore((store) => {
        store.clones[scene.roots['surf-demo']!] = [
          {
            serial: SERIAL_A,
            slug: 'mechanic',
            reachState: 'LIVE',
            say: 'withheld',
          },
        ];
      });
      setPrOpen({ scene, repo: 'ehmpathy/surf-demo', pr: '1220' });
      afterAll(() => scene.stopAllDaemons());

      when(
        '[t0] test-integration fails while clone say withholds every try',
        () => {
          const result = useThen('the alert is held', async () => {
            scene.runSkill({
              verb: 'set',
              args: ['--pr', '1220', '--mode', 'apply'],
              root: scene.roots['surf-demo']!,
              serial: SERIAL_A,
            });
            await scene.waitForPrimed();
            setCheckFailed({
              scene,
              pr: '1220',
              id: 81,
              name: 'test-integration',
            });
            await waitForWatch({
              label: 'two withheld tries',
              check: () => scene.getSays().length >= 2,
              scene,
            });
            const listed = scene.runSkill({
              verb: 'get',
              args: ['--output', 'json'],
              root: scene.roots['surf-demo']!,
              serial: null,
            });
            const tree = scene.runSkill({
              verb: 'get',
              args: [],
              root: scene.roots['surf-demo']!,
              serial: null,
            });
            return {
              says: scene.getSays(),
              listed: JSON.parse(listed.stdout),
              tree,
            };
          });
          then('get marks the watch with its held count', () => {
            expect(result.tree.stdout).toContain('· 1 held');
            expect(scene.asMasked(result.tree.stdout)).toMatchSnapshot();
          });
          then('each try was withheld, and none forced', () => {
            expect(new Set(result.says.map((say) => say.verdict))).toEqual(
              new Set(['withheld']),
            );
            expect(result.says.every((say) => !say.force)).toEqual(true);
          });
          then('the alert sits in the outbox, named by get', () => {
            expect(result.listed.daemons[0].watches[0].held).toEqual(1);
          });
        },
      );

      when('[t1] the clone frees up; the next try is taken', () => {
        const result = useThen('the alert lands once', async () => {
          scene.setStore((store) => {
            store.clones[scene.roots['surf-demo']!]![0]!.say = 'released';
          });
          await waitForWatch({
            label: 'released try',
            check: () =>
              scene.getSays().some((say) => say.verdict === 'released'),
            scene,
          });
          await scene.waitForDaemonTicks({ ticks: 2 });
          return {
            says: scene.getSays().filter((say) => say.verdict === 'released'),
          };
        });
        then('the alert is delivered once, marked as held', () => {
          expect(result.says).toHaveLength(1);
          expect(result.says[0]!.text).toMatch(
            /ci failed on #1220 \(held \d+ ticks; you were busy\)/,
          );
          expect(result.says[0]!.text).toContain(
            'check: test-integration (failure)',
          );
          expect(
            scene
              .asMasked(result.says[0]!.text)
              .replace(/held \d+ ticks/, 'held <n> ticks'),
          ).toMatchSnapshot();
        });
        then('the outbox is clear', () => {
          const listed = JSON.parse(
            scene.runSkill({
              verb: 'get',
              args: ['--output', 'json'],
              root: scene.roots['surf-demo']!,
              serial: null,
            }).stdout,
          );
          expect(listed.daemons[0].watches[0].held).toEqual(0);
        });
      });
    },
  );

  given('[case7b] an alert due while clone say enqueues it mid-turn', () => {
    const scene = genWatchTestScene({
      slug: 'watch-case7b',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        {
          serial: SERIAL_A,
          slug: 'mechanic',
          reachState: 'LIVE',
          say: 'enqueued',
        },
      ];
    });
    setPrOpen({ scene, repo: 'ehmpathy/surf-demo', pr: '1220' });
    afterAll(() => scene.stopAllDaemons());

    when('[t0] a check fails', () => {
      const result = useThen('the alert is enqueued', async () => {
        scene.runSkill({
          verb: 'set',
          args: ['--pr', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        });
        await scene.waitForPrimed();
        setCheckFailed({
          scene,
          pr: '1220',
          id: 82,
          name: 'test-unit',
        });
        await waitForWatch({
          label: 'enqueued',
          check: () => scene.getSays().length > 0,
          scene,
        });
        await scene.waitForDaemonTicks({ ticks: 2 });
        return { says: scene.getSays() };
      });
      then('it is sent once and not again', () => {
        expect(result.says).toHaveLength(1);
        expect(result.says[0]!.verdict).toEqual('enqueued');
      });
    });
  });

  given('[case8] a live daemon whose token goes locked, then returns', () => {
    const scene = genWatchTestScene({
      slug: 'watch-case8',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
    });
    setPrOpen({ scene, repo: 'ehmpathy/surf-demo', pr: '1220' });
    setPrOpen({ scene, repo: 'ehmpathy/surf-demo', pr: '1221' });
    afterAll(() => scene.stopAllDaemons());

    const getSaysPaused = () =>
      scene.getSays().filter((say) => say.text.includes('paused'));

    when(
      '[t0] the clone watches two prs; then github refuses the token (401)',
      () => {
        const result = useThen('one paused alert', async () => {
          ['1220', '1221'].forEach((pr) =>
            scene.runSkill({
              verb: 'set',
              args: ['--pr', pr, '--mode', 'apply'],
              root: scene.roots['surf-demo']!,
              serial: SERIAL_A,
            }),
          );
          await scene.waitForPrimed();
          scene.setStore((store) => {
            store.github.auth = '401';
          });
          await waitForWatch({
            label: 'paused alert',
            check: () => getSaysPaused().length > 0,
            scene,
          });
          await scene.waitForDaemonTicks({ ticks: 2 });
          const listed = scene.runSkill({
            verb: 'get',
            args: [],
            root: scene.roots['surf-demo']!,
            serial: null,
          });
          return { says: getSaysPaused(), listed };
        });
        then('get marks the daemon paused, with the token state', () => {
          expect(result.listed.stdout).toContain('paused (token expired)');
          expect(scene.asMasked(result.listed.stdout)).toMatchSnapshot();
        });
        then(
          'the clone gets one paused alert that names both prs and the refill',
          () => {
            expect(result.says).toHaveLength(1);
            expect(result.says[0]!.text).toContain('github token expired');
            expect(result.says[0]!.text).toContain(
              'watches paused: #1220, #1221',
            );
            expect(result.says[0]!.text).toContain(
              'fix: a human runs `rhx keyrack fill --owner ehmpath --env prep --key EHMPATHY_SEATURTLE_GITHUB_TOKEN --refresh`',
            );
            expect(scene.asMasked(result.says[0]!.text)).toMatchSnapshot();
          },
        );
      },
    );

    when(
      '[t1] the token returns, and a failure that landed while paused is read',
      () => {
        const result = useThen('ticks resume', async () => {
          setCheckFailed({
            scene,
            pr: '1220',
            id: 91,
            name: 'test-unit',
          });
          scene.setStore((store) => {
            store.github.auth = 'ok';
          });
          await waitForWatch({
            label: 'catch-up alert',
            check: () =>
              scene.getSays().some((say) => say.text.includes('ci failed')),
            scene,
          });
          await scene.waitForDaemonTicks({ ticks: 2 });
          return { says: scene.getSays() };
        });
        then('the event from the pause alerts once', () => {
          expect(
            result.says.filter((say) => say.text.includes('ci failed')),
          ).toHaveLength(1);
        });
        then('no second paused alert was sent', () => {
          expect(
            result.says.filter((say) => say.text.includes('paused')),
          ).toHaveLength(1);
        });
      },
    );

    when('[t2] keyrack reads the token locked', () => {
      const result = useThen('a fresh paused alert', async () => {
        scene.setStore((store) => {
          store.keyrack = 'locked';
        });
        await waitForWatch({
          label: 'locked alert',
          check: () => getSaysPaused().length >= 2,
          scene,
        });
        const ghCallsBefore = scene.getGhCalls().length;
        await scene.waitForDaemonTicks({ ticks: 2 });
        return {
          says: getSaysPaused(),
          ghCallsBefore,
          ghCallsAfter: scene.getGhCalls().length,
        };
      });
      then('the alert says locked and names the unlock', () => {
        expect(result.says[1]!.text).toContain('github token locked');
        expect(result.says[1]!.text).toContain('fix: rhx keyrack unlock');
        expect(scene.asMasked(result.says[1]!.text)).toMatchSnapshot();
      });
      then('no github call is made while paused', () => {
        expect(result.ghCallsAfter).toEqual(result.ghCallsBefore);
      });
      then('the token is read with cwd at the watch repo root', () => {
        const cwds = new Set(scene.getKeyrackCalls().map((call) => call.cwd));
        expect([...cwds]).toEqual([scene.roots['surf-demo']]);
      });
    });

    when(
      '[t3] the unlock lands, but github refuses the token (401) while still paused',
      () => {
        const result = useThen('the pause names its new cause', async () => {
          scene.setStore((store) => {
            store.keyrack = 'granted';
            store.github.auth = '401';
          });
          await waitForWatch({
            label: 'expired alert after locked',
            check: () => getSaysPaused().length >= 3,
            scene,
          });
          await scene.waitForDaemonTicks({ ticks: 2 });
          const listed = scene.runSkill({
            verb: 'get',
            args: ['--output', 'json'],
            root: scene.roots['surf-demo']!,
            serial: null,
          });
          return { says: getSaysPaused(), listed: JSON.parse(listed.stdout) };
        });
        then(
          'a fresh paused alert says expired, so the clone never repeats an unlock that cannot clear it',
          () => {
            expect(result.says).toHaveLength(3);
            expect(result.says[2]!.text).toContain('github token expired');
            expect(result.says[2]!.text).toContain('--refresh');
          },
        );
        then('get shows the new cause', () => {
          expect(result.listed.daemons[0].paused).toEqual('expired');
        });
      },
    );
  });

  given('[case8b] a box whose keyrack lacks the github key', () => {
    const scene = genWatchTestScene({
      slug: 'watch-case8b',
      repos: ['surf-demo'],
      store: { keyrack: 'absent' },
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
    });
    setPrOpen({ scene, repo: 'ehmpathy/surf-demo', pr: '1220' });
    afterAll(() => scene.stopAllDaemons());

    when('[t0] the daemon spawns and reads its token', () => {
      const result = useThen('one paused alert', async () => {
        scene.runSkill({
          verb: 'set',
          args: ['--pr', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        });
        const says = await waitForWatch({
          label: 'absent alert',
          check: () => (scene.getSays().length > 0 ? scene.getSays() : null),
          scene,
        });
        return { says };
      });
      then('the alert names the human fill step, then the unlock', () => {
        expect(result.says[0]!.text).toContain('github token not filled');
        expect(result.says[0]!.text).toContain(
          'a human runs `rhx keyrack fill --owner ehmpath',
        );
        expect(result.says[0]!.text).toContain(
          'rhx keyrack unlock --owner ehmpath',
        );
        expect(scene.asMasked(result.says[0]!.text)).toMatchSnapshot();
      });
    });

    when(
      '[t1] a second clone sets its first watch while the pause holds',
      () => {
        const result = useThen('the late clone is told', async () => {
          scene.setStore((store) => {
            store.clones[scene.roots['surf-demo']!]!.push({
              serial: SERIAL_C,
              slug: 'mechanic-two',
              reachState: 'LIVE',
            });
          });
          setPrOpen({ scene, repo: 'ehmpathy/surf-demo', pr: '1222' });
          scene.runSkill({
            verb: 'set',
            args: ['--pr', '1222', '--mode', 'apply'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL_C,
          });
          await waitForWatch({
            label: 'paused alert to the late clone',
            check: () => scene.getSays().some((say) => say.serial === SERIAL_C),
            scene,
          });
          await scene.waitForDaemonTicks({ ticks: 2 });
          return { says: scene.getSays() };
        });
        then('the late clone gets one paused alert, for its own pr', () => {
          const saysC = result.says.filter((say) => say.serial === SERIAL_C);
          expect(saysC).toHaveLength(1);
          expect(saysC[0]!.text).toContain('github token not filled');
          expect(saysC[0]!.text).toContain('watches paused: #1222');
          expect(saysC[0]!.text).toMatchSnapshot();
        });
        then('the first clone is not told twice', () => {
          expect(
            result.says.filter((say) => say.serial === SERIAL_A),
          ).toHaveLength(1);
        });
      },
    );
  });

  given('[case8c] github rate-limits the token, then the limit lifts', () => {
    const scene = genWatchTestScene({
      slug: 'watch-case8c',
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
      '[t0] the clone watches the pr; then github answers 403 with a reset 25s out',
      () => {
        const result = useThen('the daemon backs off', async () => {
          scene.runSkill({
            verb: 'set',
            args: ['--pr', '1220', '--mode', 'apply'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL_A,
          });
          await scene.waitForPrimed();
          scene.setStore((store) => {
            store.github.fault = 'ratelimit';
            store.github.rateLimitReset = Math.floor(Date.now() / 1000) + 25;
          });
          await waitForWatch({
            label: 'rate limit 403',
            check: () => scene.getGhCalls().some((call) => call.status === 403),
            scene,
          });

          // github lifts the limit; a failure lands before the reset
          scene.setStore((store) => {
            store.github.fault = null;
          });
          setCheckFailed({
            scene,
            pr: '1220',
            id: 71,
            name: 'test-unit',
          });
          const ghCallsBefore = scene.getGhCalls().length;
          await scene.waitForDaemonTicks({ ticks: 2 });
          return {
            ghCallsBefore,
            ghCallsAfter: scene.getGhCalls().length,
            says: scene.getSays(),
          };
        });
        then('no github read is made before the reset', () => {
          expect(result.ghCallsAfter).toEqual(result.ghCallsBefore);
        });
        then('the limit raises no alert', () => {
          expect(result.says).toHaveLength(0);
        });
      },
    );

    when('[t1] the reset passes', () => {
      const result = useThen('reads resume', async () => {
        await waitForWatch({
          label: 'catch-up alert',
          check: () =>
            scene.getSays().some((say) => say.text.includes('ci failed')),
          scene,
        });
        await scene.waitForDaemonTicks({ ticks: 2 });
        return { says: scene.getSays() };
      });
      then('the failure that landed under the limit alerts once', () => {
        expect(result.says).toHaveLength(1);
        expect(result.says[0]!.text).toContain('check: test-unit (failure)');
      });
    });

    when('[t2] a secondary limit answers 403 with retry-after 20', () => {
      const result = useThen('the daemon backs off', async () => {
        const deniesBefore = scene
          .getGhCalls()
          .filter((call) => call.status === 403).length;
        scene.setStore((store) => {
          store.github.fault = 'secondary';
          store.github.retryAfter = 20;
        });
        await waitForWatch({
          label: 'secondary limit 403',
          check: () =>
            scene.getGhCalls().filter((call) => call.status === 403).length >
            deniesBefore,
          scene,
        });
        scene.setStore((store) => {
          store.github.fault = null;
        });
        setCheckFailed({
          scene,
          pr: '1220',
          id: 72,
          name: 'test-lint',
        });
        const ghCallsBefore = scene.getGhCalls().length;
        await scene.waitForDaemonTicks({ ticks: 2 });
        const ghCallsAfter = scene.getGhCalls().length;
        await waitForWatch({
          label: 'alert after retry-after',
          check: () =>
            scene.getSays().some((say) => say.text.includes('test-lint')),
          scene,
        });
        return { ghCallsBefore, ghCallsAfter };
      });
      then('no github read is made inside the retry-after window', () => {
        expect(result.ghCallsAfter).toEqual(result.ghCallsBefore);
      });
    });
  });

  given('[case8d] github stops answers past the note bound', () => {
    const scene = genWatchTestScene({
      slug: 'watch-case8d',
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

    const getSaysOutage = () =>
      scene.getSays().filter((say) => say.text.includes('cannot reach github'));

    when('[t0] the clone watches the pr; then no read gets a reply', () => {
      const result = useThen('one outage note', async () => {
        scene.runSkill({
          verb: 'set',
          args: ['--pr', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        });
        await scene.waitForPrimed();
        scene.setStore((store) => {
          store.github.fault = 'down';
        });
        await waitForWatch({
          label: 'outage note',
          check: () => getSaysOutage().length > 0,
          scene,
        });
        await scene.waitForDaemonTicks({ ticks: 2 });
        return { says: getSaysOutage() };
      });
      then('the clone gets one note that names the pr', () => {
        expect(result.says).toHaveLength(1);
        expect(result.says[0]!.text).toContain(
          '💥 MalfunctionError: github unreachable',
        );
        expect(result.says[0]!.text).toContain('watches held: #1220');
        expect(scene.asMasked(result.says[0]!.text)).toMatchSnapshot();
      });
    });

    when('[t1] github answers again, with a failure from the outage', () => {
      const result = useThen('reads resume', async () => {
        setCheckFailed({
          scene,
          pr: '1220',
          id: 81,
          name: 'test-unit',
        });
        scene.setStore((store) => {
          store.github.fault = null;
        });
        await waitForWatch({
          label: 'catch-up alert',
          check: () =>
            scene.getSays().some((say) => say.text.includes('ci failed')),
          scene,
        });
        await scene.waitForDaemonTicks({ ticks: 2 });
        return { says: scene.getSays() };
      });
      then('the failure alerts once', () => {
        expect(
          result.says.filter((say) => say.text.includes('ci failed')),
        ).toHaveLength(1);
      });
      then('no second outage note was sent', () => {
        expect(getSaysOutage()).toHaveLength(1);
      });
    });

    when('[t2] a later outage, github answers 502', () => {
      const result = useThen('a fresh outage note', async () => {
        scene.setStore((store) => {
          store.github.fault = 'badgateway';
        });
        await waitForWatch({
          label: 'second outage note',
          check: () => getSaysOutage().length >= 2,
          scene,
        });
        scene.setStore((store) => {
          store.github.fault = null;
        });
        return { says: getSaysOutage() };
      });
      then(
        'a 5xx counts as an outage, and the new outage earns its own note',
        () => {
          expect(result.says).toHaveLength(2);
          expect(result.says[1]!.text).toContain('watches held: #1220');
        },
      );
    });
  });

  given('[case8e] keyrack itself faults past the note bound', () => {
    const scene = genWatchTestScene({
      slug: 'watch-case8e',
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

    const getSaysTokenFault = () =>
      scene
        .getSays()
        .filter((say) => say.text.includes('cannot read its github token'));

    when(
      '[t0] the clone watches the pr; then every keyrack read faults',
      () => {
        const result = useThen('one token-fault note', async () => {
          scene.runSkill({
            verb: 'set',
            args: ['--pr', '1220', '--mode', 'apply'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL_A,
          });
          await scene.waitForPrimed();
          scene.setStore((store) => {
            store.keyrack = 'fault';
          });
          await waitForWatch({
            label: 'token-fault note',
            check: () => getSaysTokenFault().length > 0,
            scene,
          });
          const ghCallsBefore = scene.getGhCalls().length;
          await scene.waitForDaemonTicks({ ticks: 2 });
          return {
            says: getSaysTokenFault(),
            ghCallsBefore,
            ghCallsAfter: scene.getGhCalls().length,
          };
        });
        then('the clone gets one note, with the cause and the check', () => {
          expect(result.says).toHaveLength(1);
          expect(result.says[0]!.text).toContain(
            '💥 MalfunctionError: keyrack token read faulted for',
          );
          expect(result.says[0]!.text).toContain(
            'cause: stub keyrack: daemon socket refused',
          );
          expect(result.says[0]!.text).toContain('watches held: #1220');
          expect(scene.asMasked(result.says[0]!.text)).toMatchSnapshot();
        });
        then('no github read is made without a token', () => {
          expect(result.ghCallsAfter).toEqual(result.ghCallsBefore);
        });
      },
    );

    when('[t1] keyrack answers again, with a failure from the fault', () => {
      const result = useThen('reads resume', async () => {
        setCheckFailed({
          scene,
          pr: '1220',
          id: 91,
          name: 'test-unit',
        });
        scene.setStore((store) => {
          store.keyrack = 'granted';
        });
        await waitForWatch({
          label: 'catch-up alert',
          check: () =>
            scene.getSays().some((say) => say.text.includes('ci failed')),
          scene,
        });
        await scene.waitForDaemonTicks({ ticks: 2 });
        return { says: scene.getSays() };
      });
      then('the failure alerts once, and no second fault note is sent', () => {
        expect(
          result.says.filter((say) => say.text.includes('ci failed')),
        ).toHaveLength(1);
        expect(getSaysTokenFault()).toHaveLength(1);
      });
    });
  });

  given(
    '[case13] one daemon; clone A in repo X, clone C in repo Y, both @:mechanic',
    () => {
      const scene = genWatchTestScene({
        slug: 'watch-case13',
        repos: ['surf-demo', 'tide-chart'],
        store: {},
      });
      scene.setStore((store) => {
        store.clones[scene.roots['surf-demo']!] = [
          { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
        ];
        store.clones[scene.roots['tide-chart']!] = [
          { serial: SERIAL_C, slug: 'mechanic', reachState: 'LIVE' },
        ];
      });
      setPrOpen({ scene, repo: 'ehmpathy/surf-demo', pr: '1220' });
      setPrOpen({ scene, repo: 'ehmpathy/tide-chart', pr: '312' });
      afterAll(() => scene.stopAllDaemons());

      when(
        '[t0] clone A watches #1220 in X; clone C watches #312 in Y; #312 fails ci',
        () => {
          const result = useThen('the alert reaches clone C', async () => {
            scene.runSkill({
              verb: 'set',
              args: ['--pr', '1220', '--mode', 'apply'],
              root: scene.roots['surf-demo']!,
              serial: SERIAL_A,
            });
            const joined = scene.runSkill({
              verb: 'set',
              args: ['--pr', '312', '--mode', 'apply'],
              root: scene.roots['tide-chart']!,
              serial: SERIAL_C,
            });
            await scene.waitForPrimed();
            setCheckFailed({
              scene,
              pr: '312',
              id: 31,
              name: 'test-unit',
            });
            const says = await waitForWatch({
              label: 'alert to clone C',
              check: () =>
                scene.getSays().length > 0 ? scene.getSays() : null,
              scene,
            });
            await scene.waitForDaemonTicks({ ticks: 1 });
            return { joined, says: scene.getSays() };
          });
          then(
            'clone C joined the one daemon, and its watch holds repo Y root',
            () => {
              expect(result.joined.stdout).toContain('found');
              expect(getAllWatchDaemonPids({ home: scene.home })).toHaveLength(
                1,
              );
              const found = scene
                .getAllWatchRecords()
                .find((one) => one.record.pr === 312);
              expect(found!.record.repoRoot).toEqual(scene.roots['tide-chart']);
            },
          );
          then(
            'clone C gets the alert, by serial, from repo Y; clone A gets none',
            () => {
              expect(result.says).toHaveLength(1);
              expect(result.says[0]!.serial).toEqual(SERIAL_C);
              expect(result.says[0]!.cwd).toEqual(scene.roots['tide-chart']);
              expect(result.says[0]!.text).toContain('ehmpathy/tide-chart#312');
            },
          );
        },
      );

      when('[t1] clone C dies', () => {
        const result = useThen(
          'the probe of repo Y drops its watch',
          async () => {
            scene.setStore((store) => {
              store.clones[scene.roots['tide-chart']!]![0]!.reachState = 'DEAD';
            });
            await waitForWatch({
              label: 'watch of clone C dropped',
              check: () => scene.getAllWatchRecords().length === 1,
              scene,
            });
            return { records: scene.getAllWatchRecords() };
          },
        );
        then('only clone A watch stands', () => {
          expect(result.records.map((one) => one.record.cloneSerial)).toEqual([
            SERIAL_A,
          ]);
        });
      });
    },
  );

  given('[case16] calls the skill refuses (entries E7, E3)', () => {
    const scene = genWatchTestScene({
      slug: 'watch-case16',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL_A, slug: 'mechanic', reachState: 'LIVE' },
      ];
    });
    afterAll(() => scene.stopAllDaemons());

    when('[t0] a session with no clone serial sets a watch', () => {
      const result = useThen('it refuses', async () =>
        scene.runSkill({
          verb: 'set',
          args: ['--pr', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: null,
        }),
      );
      then('it exits 2, a constraint, on both streams', () => {
        expect(result.status).toEqual(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: not an enrolled clone',
        );
        expect(result.stderr).toContain('not an enrolled clone');
        expect(scene.asMasked(result.stdout)).toMatchSnapshot();
      });
      then('no daemon is spawned', () => {
        expect(getAllWatchDaemonPids({ home: scene.home })).toEqual([]);
      });
    });

    when('[t1] a clone that is not in this repo registry sets a watch', () => {
      const result = useThen('it refuses', async () =>
        scene.runSkill({
          verb: 'set',
          args: ['--pr', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_C,
        }),
      );
      then('it exits 2 and names the registry', () => {
        expect(result.status).toEqual(2);
        expect(result.stdout).toContain(
          `clone ${SERIAL_C} is absent in the registry of`,
        );
      });
    });

    when(
      '[t2] --pr is absent, --mode is not plan | apply, or an arg is unknown',
      () => {
        const result = useThen('each refuses', async () => ({
          unknownArgs: (['get', 'set', 'del'] as const).map((verb) =>
            scene.runSkill({
              verb,
              args:
                verb === 'get'
                  ? ['--wave', 'big']
                  : ['--pr', '1220', '--wave', 'big'],
              root: scene.roots['surf-demo']!,
              serial: SERIAL_A,
            }),
          ),
          unknownVerb: scene.runScript({
            path: path.join(SKILL_DIR, 'git.pull.watch.sh'),
            args: ['paddle'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL_A,
          }),
          noPr: scene.runSkill({
            verb: 'set',
            args: ['--mode', 'apply'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL_A,
          }),
          badMode: scene.runSkill({
            verb: 'set',
            args: ['--pr', '1220', '--mode', 'yolo'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL_A,
          }),
        }));
        then('each exits 2 and names the fix', () => {
          expect(result.noPr.status).toEqual(2);
          expect(result.noPr.stdout).toContain('--pr <n> is required');
          expect(result.badMode.status).toEqual(2);
          expect(result.badMode.stdout).toContain(
            '--mode must be one of: plan apply',
          );
        });
        then(
          'an unknown arg is refused by each verb, with the help command',
          () => {
            result.unknownArgs.forEach((one) => {
              expect(one.status).toEqual(2);
              expect(one.stdout).toContain(
                "✋ ConstraintError: unknown arg '--wave'",
              );
              expect(one.stdout).toContain('--help');
              expect(one.stderr).toContain("unknown arg '--wave'");
              expect(scene.asMasked(one.stdout)).toMatchSnapshot();
            });
          },
        );
        then('an unknown verb is refused, with the verbs named', () => {
          expect(result.unknownVerb.status).toEqual(2);
          expect(result.unknownVerb.stdout).toContain(
            "unknown verb 'paddle'; the verbs are get | set | del",
          );
          expect(scene.asMasked(result.unknownVerb.stdout)).toMatchSnapshot();
        });
      },
    );

    when('[t7] a value flag is bare, or swallows the next flag', () => {
      const result = useThen('each refuses', async () => ({
        bare: (['set', 'del'] as const).map((verb) =>
          scene.runSkill({
            verb,
            args: ['--pr'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL_A,
          }),
        ),
        swallow: scene.runSkill({
          verb: 'set',
          args: ['--pr', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        }),
        bareOutput: scene.runSkill({
          verb: 'get',
          args: ['--output'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        }),
      }));
      then('each exits 2, a constraint that names the flag', () => {
        [...result.bare, result.swallow].forEach((one) => {
          expect(one.status).toEqual(2);
          expect(one.stdout).toContain(
            '✋ ConstraintError: --pr needs a value',
          );
          expect(one.stderr).toContain('--pr needs a value');
        });
        expect(result.bareOutput.status).toEqual(2);
        expect(result.bareOutput.stdout).toContain('--output needs a value');
        expect(scene.asMasked(result.swallow.stdout)).toMatchSnapshot();
      });
      then('no watch is written and no daemon spawns', () => {
        expect(scene.getAllWatchRecords()).toHaveLength(0);
        expect(getAllWatchDaemonPids({ home: scene.home })).toEqual([]);
      });
    });

    when('[t8] the watch record cannot be written', () => {
      const result = useThen('it refuses', async () => {
        // a plain file where the watches dir belongs: the record write fails
        const plan = scene.runSkill({
          verb: 'set',
          args: ['--pr', '1220', '--output', 'json'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        });
        const keyDir = path.join(
          scene.getStateRoot(),
          `v=${JSON.parse(plan.stdout).daemon.key}`,
        );
        fs.mkdirSync(keyDir, { recursive: true });
        fs.writeFileSync(path.join(keyDir, 'watches'), 'not a dir');
        const out = scene.runSkill({
          verb: 'set',
          args: ['--pr', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        });
        fs.rmSync(path.join(keyDir, 'watches'));
        return out;
      });
      then(
        'it exits 1, a malfunction that names the record, cause, and fix',
        () => {
          expect(result.status).toEqual(1);
          expect(result.stdout).toContain(
            '💥 MalfunctionError: the watch record could not be written; no watch was set',
          );
          expect(result.stdout).toContain('├─ record: ');
          expect(result.stdout).toContain('cause: ');
          expect(result.stdout).toContain('🥥 did you know?');
          expect(result.stderr).toContain('could not be written');
          // one line names the failed step and its path; no raw shell error rides along
          expect(result.stdout).toContain(
            'cause: set_watch_file_atomic: could not make dir ',
          );
          expect(result.stdout).not.toContain('Not a directory');
          expect(scene.asMasked(result.stdout)).toMatchSnapshot();
        },
      );
      then('no daemon spawns', () => {
        expect(getAllWatchDaemonPids({ home: scene.home })).toEqual([]);
      });
    });

    when('[t5] the clone registry of the repo root is unreadable', () => {
      const result = useThen('it refuses', async () => {
        scene.setStore((store) => {
          store.registryFaults = [scene.roots['surf-demo']!];
        });
        const out = scene.runSkill({
          verb: 'set',
          args: ['--pr', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        });
        scene.setStore((store) => {
          store.registryFaults = [];
        });
        return out;
      });
      then('it exits 1, a malfunction, and names the registry check', () => {
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain(
          '💥 MalfunctionError: the clone registry of',
        );
        expect(result.stdout).toContain('no watch was set');
        expect(result.stdout).toContain('└─ cause: ');
        expect(result.stdout).toContain('🥥 did you know?');
        expect(result.stderr).toContain('is unreadable');
        expect(scene.asMasked(result.stdout)).toMatchSnapshot();
      });
      then('no watch is written and no daemon spawns', () => {
        expect(scene.getAllWatchRecords()).toHaveLength(0);
        expect(getAllWatchDaemonPids({ home: scene.home })).toEqual([]);
      });
    });

    when('[t3] a plan for a pr the clone did not open', () => {
      const result = useThen('it previews', async () =>
        scene.runSkill({
          verb: 'set',
          args: ['--pr', '1220'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL_A,
        }),
      );
      then('plan writes naught and names the apply command', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('would set → @:mechanic');
        expect(scene.getAllWatchRecords()).toHaveLength(0);
        expect(getAllWatchDaemonPids({ home: scene.home })).toEqual([]);
        expect(scene.asMasked(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t4] help is asked of each verb', () => {
      const result = useThen('each prints its usage', async () => ({
        helps: (['get', 'set', 'del'] as const).map((verb) =>
          scene.runSkill({
            verb,
            args: ['--help'],
            root: scene.roots['surf-demo']!,
            serial: null,
          }),
        ),
      }));
      then('each exits 0 with usage, options, and an example', () => {
        result.helps.forEach((one) => {
          expect(one.status).toEqual(0);
          expect(one.stdout).toContain('usage: git.pull.watch.');
          expect(one.stdout).toContain('options:');
          expect(one.stdout).toContain('example:');
          expect(one.stdout).toMatchSnapshot();
        });
      });
    });

    when('[t6] the dispatcher is called: help, and a verb', () => {
      const result = useThen('each runs', async () => {
        const run = (args: string[]) =>
          scene.runScript({
            path: path.join(SKILL_DIR, 'git.pull.watch.sh'),
            args,
            root: scene.roots['surf-demo']!,
            serial: null,
          });
        return {
          help: run(['--help']),
          bare: run([]),
          viaDispatch: run(['get', '--output', 'json']),
          viaSkill: scene.runSkill({
            verb: 'get',
            args: ['--output', 'json'],
            root: scene.roots['surf-demo']!,
            serial: null,
          }),
        };
      });
      then('help names each verb and an example', () => {
        expect(result.help.status).toEqual(0);
        expect(result.help.stdout).toContain('verbs:');
        expect(result.help.stdout).toContain('example:');
        expect(result.help.stdout).toMatchSnapshot();
      });
      then('a bare call is refused with the verbs named', () => {
        expect(result.bare.status).toEqual(2);
        expect(result.bare.stdout).toContain('a verb is required');
      });
      then(
        'a verb via the dispatcher runs the same code as the verb skill',
        () => {
          // the two reads land a moment apart, so a tick age may differ by a second
          const asAgeless = (text: string): string =>
            text.replace(
              /"lastTickSecondsAgo": \d+/g,
              '"lastTickSecondsAgo": 0',
            );
          expect(result.viaDispatch.status).toEqual(0);
          expect(asAgeless(result.viaDispatch.stdout)).toEqual(
            asAgeless(result.viaSkill.stdout),
          );
        },
      );
    });
  });
});
