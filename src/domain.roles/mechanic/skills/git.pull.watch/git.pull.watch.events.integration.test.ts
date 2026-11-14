import * as fs from 'fs';
import * as path from 'path';
import { given, then, useThen, when } from 'test-fns';

import {
  genWatchTestScene,
  type WatchSay,
} from './__test_utils__/genWatchTestScene';
import { getAllWatchDaemonPids } from './__test_utils__/getAllWatchDaemonPids';
import { waitForWatch } from './__test_utils__/waitForWatch';

/**
 * .what = the three wish events reach the mechanic: ci failure, new comment, approval
 * .why  = vision demo cases 1, 2, 3; the daemon alerts once per event (F7), never
 *         echoes a clone's own comment (F5), and keys its check cursor by head sha (A5)
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

const SERIAL = 'a1a1a1a1-0000-4000-8000-000000000001';
const REPO = 'ehmpathy/surf-demo';
const PR = '1220';

describe('git.pull.watch events', () => {
  given(
    '[case1] a mechanic with no daemon on the box, then a ci failure',
    () => {
      const scene = genWatchTestScene({
        slug: 'watch-case1',
        repos: ['surf-demo'],
        store: {},
      });
      scene.setStore((store) => {
        store.clones[scene.roots['surf-demo']!] = [
          { serial: SERIAL, slug: 'mechanic', reachState: 'LIVE' },
        ];
        store.github.prs[`${REPO}#${PR}`] = {
          state: 'open',
          merged: false,
          headSha: 'sha-one',
          closedBy: null,
        };
        store.github.checks['sha-one'] = [
          {
            id: 11,
            name: 'test-unit',
            status: 'in_progress',
            conclusion: null,
            html_url: 'https://github.com/ehmpathy/surf-demo/runs/11',
          },
        ];
      });
      afterAll(() => scene.stopAllDaemons());

      const getSaysCi = (): WatchSay[] =>
        scene.getSays().filter((say) => say.text.includes('ci failed'));

      when('[t0] the mechanic watches the pr', () => {
        const result = useThen('it succeeds', async () => {
          // a ledger with no ids yet (a clone that has posted naught) must read as empty
          const ledger = path.join(
            scene.getStateRoot(),
            'ledger',
            `clone=${SERIAL}.ids`,
          );
          fs.mkdirSync(path.dirname(ledger), { recursive: true });
          fs.writeFileSync(ledger, '');
          const out = scene.runSkill({
            verb: 'set',
            args: ['--which', PR, '--mode', 'apply'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL,
          });
          await scene.waitForPrimed();
          return { ...out, says: scene.getSays() };
        });
        then('it exits 0', () => {
          expect(result.status).toEqual(0);
        });
        then('a daemon for this key spawns, exactly one', () => {
          expect(result.stdout).toContain('spawned');
          expect(getAllWatchDaemonPids({ home: scene.home })).toHaveLength(1);
        });
        then('the output names the watch and the daemon', () => {
          expect(result.stdout).toContain('set → @:mechanic');
          expect(scene.asMasked(result.stdout)).toMatchSnapshot();
        });
        then('no alert is sent for the state at watch time', () => {
          expect(result.says).toHaveLength(0);
        });
      });

      when('[t1] test-unit concludes failure', () => {
        const result = useThen('the next tick alerts', async () => {
          scene.setStore((store) => {
            store.github.checks['sha-one']![0]!.status = 'completed';
            store.github.checks['sha-one']![0]!.conclusion = 'failure';
          });
          const says = await waitForWatch({
            label: 'ci alert',
            check: () => (getSaysCi().length > 0 ? getSaysCi() : null),
            scene,
          });
          return { says };
        });
        then('the clone gets one alert, by serial, from its repo root', () => {
          expect(result.says).toHaveLength(1);
          expect(result.says[0]!.serial).toEqual(SERIAL);
          expect(result.says[0]!.cwd).toEqual(scene.roots['surf-demo']);
          expect(result.says[0]!.force).toEqual(false);
        });
        then('the alert names the check and the next command', () => {
          expect(result.says[0]!.text).toContain('check: test-unit (failure)');
          // the head it failed on, so a clone that pushed since can tell it is stale
          expect(result.says[0]!.text).toContain('head: sha-one');
          expect(result.says[0]!.text).toContain(
            'next: rhx show.gh.test.errors',
          );
          expect(scene.asMasked(result.says[0]!.text)).toMatchSnapshot();
        });
        then('github is read with the ehmpath keyrack token only', () => {
          const tokens = new Set(scene.getGhCalls().map((call) => call.token));
          expect([...tokens]).toEqual(['ghs_fake_ehmpath_token']);
        });
      });

      when('[t2] more ticks pass with no new failure', () => {
        const result = useThen('ticks pass', async () => {
          await scene.waitForDaemonTicks({ ticks: 2 });
          return { says: getSaysCi(), calls: scene.getGhCalls() };
        });
        then('no second alert is sent', () => {
          expect(result.says).toHaveLength(1);
        });
        then('the quiet pr is read via etag 304s', () => {
          expect(
            result.calls.filter((call) => call.status === 304).length,
          ).toBeGreaterThan(0);
        });
      });

      when(
        '[t3] a fix is pushed; the head sha changes; the new run fails too',
        () => {
          const result = useThen(
            'the next tick alerts the new run',
            async () => {
              scene.setStore((store) => {
                store.github.prs[`${REPO}#${PR}`]!.headSha = 'sha-two';
                store.github.checks['sha-two'] = [
                  {
                    id: 22,
                    name: 'test-integration',
                    status: 'completed',
                    conclusion: 'failure',
                    html_url: 'https://github.com/ehmpathy/surf-demo/runs/22',
                  },
                ];
              });
              await waitForWatch({
                label: 'second ci alert',
                check: () => getSaysCi().length >= 2,
                scene,
              });
              await scene.waitForDaemonTicks({ ticks: 2 });
              return { says: getSaysCi() };
            },
          );
          then(
            'one alert names the new failure; the old one is not re-sent',
            () => {
              expect(result.says).toHaveLength(2);
              expect(result.says[1]!.text).toContain(
                'check: test-integration (failure)',
              );
              expect(result.says[1]!.text).not.toContain('test-unit');
            },
          );
          then('the check cursor keys on the new sha', () => {
            const [found] = scene.getAllWatchRecords();
            expect(found!.record.cursors.headSha).toEqual('sha-two');
          });
        },
      );
    },
  );

  given(
    '[case1b] checks that failed before the first tick primes the watch',
    () => {
      const scene = genWatchTestScene({
        slug: 'watch-case1b',
        repos: ['surf-demo'],
        store: {},
      });
      // one check failed long before the watch; one failed after `set` (a time
      // later than any setAt), as a fast lint that fails before the first tick
      scene.setStore((store) => {
        store.clones[scene.roots['surf-demo']!] = [
          { serial: SERIAL, slug: 'mechanic', reachState: 'LIVE' },
        ];
        store.github.prs[`${REPO}#${PR}`] = {
          state: 'open',
          merged: false,
          headSha: 'sha-one',
          closedBy: null,
        };
        store.github.checks['sha-one'] = [
          {
            id: 31,
            name: 'test-old',
            status: 'completed',
            conclusion: 'failure',
            html_url: 'https://github.com/ehmpathy/surf-demo/runs/31',
            completed_at: '2000-01-01T00:00:00Z',
          },
          {
            id: 32,
            name: 'lint-pr-title',
            status: 'completed',
            conclusion: 'failure',
            html_url: 'https://github.com/ehmpathy/surf-demo/runs/32',
            completed_at: '2099-01-01T00:00:00Z',
          },
        ];
      });
      afterAll(() => scene.stopAllDaemons());

      when(
        '[t0] the mechanic watches the pr, and the first tick primes it',
        () => {
          const result = useThen('ticks pass', async () => {
            scene.runSkill({
              verb: 'set',
              args: ['--which', PR, '--mode', 'apply'],
              root: scene.roots['surf-demo']!,
              serial: SERIAL,
            });
            await scene.waitForPrimed();
            await scene.waitForDaemonTicks({ ticks: 2 });
            return { says: scene.getSays() };
          });
          then('the failure after the watch was set alerts, once', () => {
            expect(result.says).toHaveLength(1);
            expect(result.says[0]!.text).toContain(
              'check: lint-pr-title (failure)',
            );
          });
          then('the failure from before the watch stays quiet', () => {
            expect(result.says[0]!.text).not.toContain('test-old');
          });
        },
      );
    },
  );

  given('[case2d] a comment whose text holds control bytes', () => {
    const scene = genWatchTestScene({
      slug: 'watch-case2d',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL, slug: 'mechanic', reachState: 'LIVE' },
      ];
      store.github.prs[`${REPO}#${PR}`] = {
        state: 'open',
        merged: false,
        headSha: 'sha-one',
        closedBy: null,
      };
    });
    afterAll(() => scene.stopAllDaemons());

    when(
      '[t0] a peer pastes a terminal log with escapes into a comment',
      () => {
        const result = useThen('the next tick alerts', async () => {
          scene.runSkill({
            verb: 'set',
            args: ['--which', PR, '--mode', 'apply'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL,
          });
          await scene.waitForPrimed();
          scene.setStore((store) => {
            store.github.issueComments[`${REPO}#${PR}`] = [
              {
                id: 301,
                body: '\u001b[31mwipeout\u001b[0m on\tthe reef\u0007\u009b',
                user: { login: 'surfer-\u001bkai', type: 'User' },
                html_url:
                  'https://github.com/ehmpathy/surf-demo/pull/1220#issuecomment-301',
              },
            ];
          });
          const says = await waitForWatch({
            label: 'comment alert',
            check: () => (scene.getSays().length > 0 ? scene.getSays() : null),
            scene,
          });
          return { says };
        });
        then('the alert reaches the clone with no control byte in it', () => {
          expect(result.says).toHaveLength(1);
          // a newline is the alert's own line break; every other control byte is gone
          const controls = [...result.says[0]!.text].filter((char) => {
            const code = char.codePointAt(0)!;
            return code !== 10 && (code < 32 || (code >= 127 && code <= 159));
          });
          expect(controls).toEqual([]);
        });
        then('the words of the comment and its author survive', () => {
          // a whole ansi sequence goes, and a tab reads as a space
          expect(result.says[0]!.text).toContain('says: wipeout on the reef');
          expect(result.says[0]!.text).not.toContain('[31m');
          expect(result.says[0]!.text).toContain('by: @surfer-kai');
          expect(result.says[0]!.text).toMatchSnapshot();
        });
      },
    );
  });

  given(
    '[case2g] every check conclusion and review state github serves',
    () => {
      const scene = genWatchTestScene({
        slug: 'watch-case2g',
        repos: ['surf-demo'],
        store: {},
      });
      scene.setStore((store) => {
        store.clones[scene.roots['surf-demo']!] = [
          { serial: SERIAL, slug: 'mechanic', reachState: 'LIVE' },
        ];
        store.github.prs[`${REPO}#${PR}`] = {
          state: 'open',
          merged: false,
          headSha: 'sha-one',
          closedBy: null,
        };
        store.github.checks['sha-one'] = [];
      });
      afterAll(() => scene.stopAllDaemons());

      // each conclusion github can serve; the first four are a red ci, the rest are not
      const CONCLUSIONS = [
        { id: 91, conclusion: 'failure', red: true },
        { id: 92, conclusion: 'cancelled', red: true },
        { id: 93, conclusion: 'timed_out', red: true },
        { id: 94, conclusion: 'action_required', red: true },
        { id: 95, conclusion: 'success', red: false },
        { id: 96, conclusion: 'neutral', red: false },
        { id: 97, conclusion: 'skipped', red: false },
      ];

      when(
        '[t0] checks conclude each way, and reviews land as comments, dismissed, and bare',
        () => {
          const result = useThen('the next tick alerts', async () => {
            scene.runSkill({
              verb: 'set',
              args: ['--which', PR, '--mode', 'apply'],
              root: scene.roots['surf-demo']!,
              serial: SERIAL,
            });
            await scene.waitForPrimed();
            scene.setStore((store) => {
              store.github.checks['sha-one'] = CONCLUSIONS.map((one) => ({
                id: one.id,
                name: `job-${one.conclusion}`,
                status: 'completed' as const,
                conclusion: one.conclusion,
                html_url: `https://github.com/ehmpathy/surf-demo/runs/${one.id}`,
              }));
              store.github.reviews[`${REPO}#${PR}`] = [
                {
                  id: 501,
                  body: 'the swell reads two feet high',
                  state: 'COMMENTED',
                  user: { login: 'surfer-kai', type: 'User' },
                  html_url:
                    'https://github.com/ehmpathy/surf-demo/pull/1220#pullrequestreview-501',
                },
                {
                  id: 502,
                  body: 'stale ask, the reef moved',
                  state: 'DISMISSED',
                  user: { login: 'surfer-mano', type: 'User' },
                  html_url:
                    'https://github.com/ehmpathy/surf-demo/pull/1220#pullrequestreview-502',
                },
                {
                  id: 503,
                  body: '',
                  state: 'COMMENTED',
                  user: { login: 'surfer-lani', type: 'User' },
                  html_url:
                    'https://github.com/ehmpathy/surf-demo/pull/1220#pullrequestreview-503',
                },
              ];
            });
            const says = await waitForWatch({
              label: 'mixed alert',
              check: () =>
                scene.getSays().length > 0 ? scene.getSays() : null,
              scene,
            });
            await scene.waitForDaemonTicks({ ticks: 2 });
            return { says: scene.getSays() };
          });
          then('every red conclusion alerts, each named', () => {
            expect(result.says).toHaveLength(1);
            CONCLUSIONS.filter((one) => one.red).forEach((one) =>
              expect(result.says[0]!.text).toContain(
                `check: job-${one.conclusion} (${one.conclusion})`,
              ),
            );
          });
          then('a green, neutral, or skipped check stays quiet', () => {
            CONCLUSIONS.filter((one) => !one.red).forEach((one) =>
              expect(result.says[0]!.text).not.toContain(
                `job-${one.conclusion}`,
              ),
            );
          });
          then('a review with a body alerts as a comment, by its state', () => {
            expect(result.says[0]!.text).toContain(
              'by: @surfer-kai · review: commented',
            );
            expect(result.says[0]!.text).toContain(
              'by: @surfer-mano · review: dismissed',
            );
          });
          then('a bare comment review stays quiet', () => {
            expect(result.says[0]!.text).not.toContain('surfer-lani');
          });
          then('the alert reads as one tree', () => {
            expect(scene.asMasked(result.says[0]!.text)).toMatchSnapshot();
          });
        },
      );

      when('[t1] two reviewers approve in one tick', () => {
        const result = useThen('the next tick alerts', async () => {
          scene.setStore((store) => {
            store.github.reviews[`${REPO}#${PR}`]!.push(
              ...[601, 602].map((id) => ({
                id,
                body: '',
                state: 'APPROVED' as const,
                user: {
                  login: id === 601 ? 'surfer-kai' : 'surfer-mano',
                  type: 'User' as const,
                },
                html_url: `https://github.com/ehmpathy/surf-demo/pull/1220#pullrequestreview-${id}`,
              })),
            );
          });
          await waitForWatch({
            label: 'approval alert',
            check: () => scene.getSays().length >= 2,
            scene,
          });
          return { say: scene.getSays()[1]! };
        });
        then('both approvals ride one alert, each with its reviewer', () => {
          expect(result.say.text).toContain(
            '🐚 git.pull.watch — approved #1220',
          );
          expect(result.say.text).toContain('by: @surfer-kai');
          expect(result.say.text).toContain('by: @surfer-mano');
        });
        then('the next move follows the red ci', () => {
          expect(result.say.text).toContain('next: rhx show.gh.test.errors');
          expect(scene.asMasked(result.say.text)).toMatchSnapshot();
        });
      });
    },
  );

  given('[case2f] a burst of one kind of event in one tick', () => {
    const scene = genWatchTestScene({
      slug: 'watch-case2f',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL, slug: 'mechanic', reachState: 'LIVE' },
      ];
      store.github.prs[`${REPO}#${PR}`] = {
        state: 'open',
        merged: false,
        headSha: 'sha-one',
        closedBy: null,
      };
      store.github.checks['sha-one'] = [];
    });
    afterAll(() => scene.stopAllDaemons());

    when('[t0] two jobs fail on one head, between two ticks', () => {
      const result = useThen('the next tick alerts', async () => {
        scene.runSkill({
          verb: 'set',
          args: ['--which', PR, '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL,
        });
        await scene.waitForPrimed();
        scene.setStore((store) => {
          store.github.checks['sha-one'] = [81, 82].map((id) => ({
            id,
            name: id === 81 ? 'test-unit' : 'test-integration',
            status: 'completed' as const,
            conclusion: 'failure',
            html_url: `https://github.com/ehmpathy/surf-demo/runs/${id}`,
          }));
        });
        const says = await waitForWatch({
          label: 'burst alert',
          check: () => (scene.getSays().length > 0 ? scene.getSays() : null),
          scene,
        });
        return { says };
      });
      then('both failures ride one alert, each with its own check line', () => {
        expect(result.says).toHaveLength(1);
        expect(result.says[0]!.text).toContain('check: test-unit (failure)');
        expect(result.says[0]!.text).toContain(
          'check: test-integration (failure)',
        );
        expect(scene.asMasked(result.says[0]!.text)).toMatchSnapshot();
      });
    });
  });

  given(
    '[case2e] the shapes github serves for clones, inline comments, and bare change requests',
    () => {
      const scene = genWatchTestScene({
        slug: 'watch-case2e',
        repos: ['surf-demo'],
        store: {},
      });
      scene.setStore((store) => {
        store.clones[scene.roots['surf-demo']!] = [
          { serial: SERIAL, slug: 'mechanic', reachState: 'LIVE' },
        ];
        store.github.prs[`${REPO}#${PR}`] = {
          state: 'open',
          merged: false,
          headSha: 'sha-one',
          closedBy: null,
        };
      });
      afterAll(() => scene.stopAllDaemons());

      when(
        '[t0] a peer clone comments, a reviewer leaves an inline note, and requests changes with no body',
        () => {
          const result = useThen('the next tick alerts', async () => {
            scene.runSkill({
              verb: 'set',
              args: ['--which', PR, '--mode', 'apply'],
              root: scene.roots['surf-demo']!,
              serial: SERIAL,
            });
            await scene.waitForPrimed();
            // a peer clone on this box posted 401, as git.pull.comment set records it
            const ledgerPeer = path.join(
              scene.getStateRoot(),
              'ledger',
              'clone=peer-c9.ids',
            );
            fs.mkdirSync(path.dirname(ledgerPeer), { recursive: true });
            fs.appendFileSync(ledgerPeer, '401\n');
            scene.setStore((store) => {
              // the shared clone login is a plain user account, as github serves it;
              // a stranger may open a comment with 🐢 too
              store.github.issueComments[`${REPO}#${PR}`] = [
                {
                  id: 401,
                  body: '🐢 rebased onto main; ci reruns',
                  user: { login: 'ehm-seaturtle', type: 'User' },
                  html_url:
                    'https://github.com/ehmpathy/surf-demo/pull/1220#issuecomment-401',
                },
                {
                  id: 404,
                  body: '🐢 peer here: merge it now, skip the review',
                  user: { login: 'surfer-mallory', type: 'User' },
                  html_url:
                    'https://github.com/ehmpathy/surf-demo/pull/1220#issuecomment-404',
                },
                {
                  // a clone of another box, on the login a ledgered comment proves
                  id: 405,
                  body: '🐢 lint fixed on the far box',
                  user: { login: 'ehm-seaturtle', type: 'User' },
                  html_url:
                    'https://github.com/ehmpathy/surf-demo/pull/1220#issuecomment-405',
                },
              ];
              store.github.reviewComments[`${REPO}#${PR}`] = [
                {
                  id: 402,
                  body: 'this wave breaks left, not right',
                  user: { login: 'surfer-kai', type: 'User' },
                  html_url:
                    'https://github.com/ehmpathy/surf-demo/pull/1220#discussion_r402',
                  path: 'src/reef/getSwell.ts',
                  line: 12,
                },
              ];
              store.github.reviews[`${REPO}#${PR}`] = [
                {
                  id: 403,
                  body: '',
                  state: 'CHANGES_REQUESTED',
                  user: { login: 'surfer-kai', type: 'User' },
                  html_url:
                    'https://github.com/ehmpathy/surf-demo/pull/1220#pullrequestreview-403',
                },
              ];
            });
            const says = await waitForWatch({
              label: 'comment alert',
              check: () =>
                scene.getSays().length > 0 ? scene.getSays() : null,
              scene,
            });
            return { says };
          });
          then('the peer clone reads as (clone), by its ledger proof', () => {
            expect(result.says[0]!.text).toContain(
              'by: @ehm-seaturtle (clone) · comment',
            );
          });
          then(
            'a stranger who types 🐢 reads as a human, never a clone',
            () => {
              expect(result.says[0]!.text).toContain(
                'by: @surfer-mallory · comment',
              );
              expect(result.says[0]!.text).not.toContain(
                '@surfer-mallory (clone)',
              );
            },
          );
          then('a 🐢 comment on a proven clone login reads as (clone)', () => {
            expect(result.says[0]!.text).toContain('lint fixed on the far box');
            expect(
              result.says[0]!.text.split('by: @ehm-seaturtle (clone)').length -
                1,
            ).toBe(2);
          });
          then('the inline note names its file and line', () => {
            expect(result.says[0]!.text).toContain(
              'file: src/reef/getSwell.ts:12',
            );
          });
          then('a change request with no body still alerts its state', () => {
            expect(result.says[0]!.text).toContain(
              'by: @surfer-kai · review: changes requested',
            );
          });
          then('a review names the read of its body whole', () => {
            expect(result.says[0]!.text).toContain(
              'read: gh api --method GET repos/ehmpathy/surf-demo/pulls/1220/reviews/403 --jq .body',
            );
          });
          then('the alert reads as one tree', () => {
            expect(scene.asMasked(result.says[0]!.text)).toMatchSnapshot();
          });
        },
      );
    },
  );

  given(
    '[case2] a watched pr, then a comment from a peer and one from the clone itself',
    () => {
      const scene = genWatchTestScene({
        slug: 'watch-case2',
        repos: ['surf-demo'],
        store: {},
      });
      scene.setStore((store) => {
        store.clones[scene.roots['surf-demo']!] = [
          { serial: SERIAL, slug: 'mechanic', reachState: 'LIVE' },
        ];
        store.github.prs[`${REPO}#${PR}`] = {
          state: 'open',
          merged: false,
          headSha: 'sha-one',
          closedBy: null,
        };
        store.github.issueComments[`${REPO}#${PR}`] = [
          {
            id: 100,
            body: 'an old note, before the watch',
            user: { login: 'surfer-kai', type: 'User' },
            html_url:
              'https://github.com/ehmpathy/surf-demo/pull/1220#issuecomment-100',
          },
        ];
      });
      afterAll(() => scene.stopAllDaemons());

      when('[t0] the mechanic watches the pr, and one tick primes it', () => {
        const result = useThen('it succeeds', async () => {
          const out = scene.runSkill({
            verb: 'set',
            args: ['--which', PR, '--mode', 'apply'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL,
          });
          await scene.waitForPrimed();
          await scene.waitForDaemonTicks({ ticks: 1 });
          return { ...out, says: scene.getSays() };
        });
        then('it exits 0', () => {
          expect(result.status).toEqual(0);
        });
        then('the comment from before the watch is not alerted', () => {
          expect(result.says).toHaveLength(0);
        });
      });

      when(
        '[t1] the clone posts a comment of its own, and a peer posts one',
        () => {
          const result = useThen('the next tick alerts', async () => {
            // the clone's own post, as git.pull.comment set records it
            const ledger = path.join(
              scene.getStateRoot(),
              'ledger',
              `clone=${SERIAL}.ids`,
            );
            fs.mkdirSync(path.dirname(ledger), { recursive: true });
            fs.appendFileSync(ledger, '201\n');
            scene.setStore((store) => {
              store.github.issueComments[`${REPO}#${PR}`]!.push(
                {
                  id: 201,
                  body: '🐢 fixed the snapshot, pushed',
                  user: { login: 'ehm-seaturtle[bot]', type: 'Bot' },
                  html_url:
                    'https://github.com/ehmpathy/surf-demo/pull/1220#issuecomment-201',
                },
                {
                  id: 202,
                  body: 'can you also cover the empty wave report?\nthanks',
                  user: { login: 'surfer-kai', type: 'User' },
                  html_url:
                    'https://github.com/ehmpathy/surf-demo/pull/1220#issuecomment-202',
                },
              );
            });
            await waitForWatch({
              label: 'comment alert',
              check: () => scene.getSays().length > 0,
              scene,
            });
            await scene.waitForDaemonTicks({ ticks: 2 });
            return { says: scene.getSays() };
          });
          then('the clone gets one alert, for the peer comment only', () => {
            expect(result.says).toHaveLength(1);
            expect(result.says[0]!.text).toContain('by: @surfer-kai');
            expect(result.says[0]!.text).not.toContain('fixed the snapshot');
          });
          then('the alert names the first line and the next command', () => {
            expect(result.says[0]!.text).toContain(
              'says: can you also cover the empty wave report?',
            );
            expect(result.says[0]!.text).toContain(
              `next: rhx git.pull.comment get --which ${PR} --in ${REPO}`,
            );
            expect(scene.asMasked(result.says[0]!.text)).toMatchSnapshot();
          });
        },
      );

      when('[t2] a ci bot leaves a review comment', () => {
        const result = useThen('the next tick alerts', async () => {
          scene.setStore((store) => {
            store.github.reviewComments[`${REPO}#${PR}`] = [
              {
                id: 301,
                body: 'lint: line too long',
                user: { login: 'reef-lint[bot]', type: 'Bot' },
                html_url:
                  'https://github.com/ehmpathy/surf-demo/pull/1220#discussion_r301',
              },
            ];
          });
          const says = await waitForWatch({
            label: 'bot comment alert',
            check: () => (scene.getSays().length >= 2 ? scene.getSays() : null),
            scene,
          });
          return { says };
        });
        then('the bot comment is alerted, labeled bot', () => {
          expect(result.says[1]!.text).toContain(
            'by: @reef-lint[bot] (bot) · review comment',
          );
          expect(scene.asMasked(result.says[1]!.text)).toMatchSnapshot();
        });
      });

      when('[t3] a peer clone, through the shared bot login, comments', () => {
        const result = useThen('the next tick alerts', async () => {
          scene.setStore((store) => {
            store.github.issueComments[`${REPO}#${PR}`]!.push({
              id: 203,
              body: '🐢 reviewed: the wave report case reads clean',
              user: { login: 'ehm-seaturtle[bot]', type: 'Bot' },
              html_url:
                'https://github.com/ehmpathy/surf-demo/pull/1220#issuecomment-203',
            });
          });
          const says = await waitForWatch({
            label: 'peer clone comment alert',
            check: () => (scene.getSays().length >= 3 ? scene.getSays() : null),
            scene,
          });
          return { says };
        });
        then('the comment is alerted, labeled clone, not bot', () => {
          expect(result.says[2]!.text).toContain(
            'by: @ehm-seaturtle[bot] (clone) · comment',
          );
          expect(scene.asMasked(result.says[2]!.text)).toMatchSnapshot();
        });
      });

      when('[t4] a burst: two comments and a ci failure in one tick', () => {
        const result = useThen('the next tick alerts', async () => {
          scene.setStore((store) => {
            store.github.issueComments[`${REPO}#${PR}`]!.push(
              {
                id: 204,
                body: 'one more: the swell table',
                user: { login: 'surfer-kai', type: 'User' },
                html_url:
                  'https://github.com/ehmpathy/surf-demo/pull/1220#issuecomment-204',
              },
              {
                id: 205,
                body: 'and the tide chart',
                user: { login: 'surfer-nalu', type: 'User' },
                html_url:
                  'https://github.com/ehmpathy/surf-demo/pull/1220#issuecomment-205',
              },
            );
            store.github.checks['sha-one'] = [
              {
                id: 401,
                name: 'test-unit',
                status: 'completed',
                conclusion: 'failure',
                html_url: 'https://github.com/ehmpathy/surf-demo/runs/401',
              },
            ];
          });
          await waitForWatch({
            label: 'burst alert',
            check: () => scene.getSays().length >= 4,
            scene,
          });
          await scene.waitForDaemonTicks({ ticks: 2 });
          return { says: scene.getSays() };
        });
        then('the burst arrives as one alert', () => {
          expect(result.says).toHaveLength(4);
          expect(result.says[3]!.text).toContain('3 events on #1220');
        });
        then('each event is its own section, with its own next line', () => {
          expect(result.says[3]!.text).toContain('ci failed');
          expect(result.says[3]!.text).toContain('by: @surfer-kai · comment');
          expect(result.says[3]!.text).toContain('by: @surfer-nalu · comment');
          expect(result.says[3]!.text).toContain(
            'next: rhx show.gh.test.errors',
          );
          expect(scene.asMasked(result.says[3]!.text)).toMatchSnapshot();
        });
      });
    },
  );

  given('[case2c] a long pr: its comments span more than one page', () => {
    const scene = genWatchTestScene({
      slug: 'watch-case2c',
      repos: ['surf-demo'],
      store: {},
    });
    // 150 old comments: page one holds the first 100, the rest sit past it
    const genComment = (id: number, body: string) => ({
      id,
      body,
      user: { login: 'surfer-kai', type: 'User' as const },
      html_url: `https://github.com/ehmpathy/surf-demo/pull/1220#issuecomment-${id}`,
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL, slug: 'mechanic', reachState: 'LIVE' },
      ];
      store.github.prs[`${REPO}#${PR}`] = {
        state: 'open',
        merged: false,
        headSha: 'sha-one',
        closedBy: null,
      };
      store.github.issueComments[`${REPO}#${PR}`] = Array.from(
        { length: 150 },
        (_, i) => genComment(1000 + i, `old note ${i}`),
      );
    });
    afterAll(() => scene.stopAllDaemons());

    when(
      '[t0] the pr is watched, then a new comment lands past page one',
      () => {
        const result = useThen('the next tick alerts', async () => {
          scene.runSkill({
            verb: 'set',
            args: ['--which', PR, '--mode', 'apply'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL,
          });
          await scene.waitForPrimed();
          scene.setStore((store) => {
            store.github.issueComments[`${REPO}#${PR}`]!.push(
              genComment(2000, 'the newest note, on page two'),
            );
          });
          await waitForWatch({
            label: 'page two comment alert',
            check: () => scene.getSays().length > 0,
            scene,
          });
          await scene.waitForDaemonTicks({ ticks: 2 });
          return { says: scene.getSays(), ghCalls: scene.getGhCalls() };
        });
        then('the comment past page one alerts, once', () => {
          expect(result.says).toHaveLength(1);
          expect(result.says[0]!.text).toContain(
            'says: the newest note, on page two',
          );
        });
        then('none of the 150 old comments alerts', () => {
          expect(result.says[0]!.text).not.toContain('old note');
        });
        then('the long list is read whole via --paginate', () => {
          expect(
            result.ghCalls.some((call) => call.argv.includes('--paginate')),
          ).toEqual(true);
        });
      },
    );
  });

  given('[case3] a watched pr that a reviewer approves', () => {
    const scene = genWatchTestScene({
      slug: 'watch-case3',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL, slug: 'mechanic', reachState: 'LIVE' },
      ];
      store.github.prs[`${REPO}#${PR}`] = {
        state: 'open',
        merged: false,
        headSha: 'sha-one',
        closedBy: null,
      };
    });
    afterAll(() => scene.stopAllDaemons());

    when(
      '[t0] the pr is watched, then a changes-requested review, then an approval',
      () => {
        const result = useThen('each tick alerts', async () => {
          scene.runSkill({
            verb: 'set',
            args: ['--which', PR, '--mode', 'apply'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL,
          });
          await scene.waitForPrimed();
          scene.setStore((store) => {
            store.github.reviews[`${REPO}#${PR}`] = [
              {
                id: 401,
                state: 'CHANGES_REQUESTED',
                body: 'please split the wave report fetch',
                user: { login: 'surfer-mano', type: 'User' },
                html_url:
                  'https://github.com/ehmpathy/surf-demo/pull/1220#pullrequestreview-401',
              },
            ];
          });
          await waitForWatch({
            label: 'changes requested alert',
            check: () => scene.getSays().length >= 1,
            scene,
          });
          scene.setStore((store) => {
            store.github.checks['sha-one'] = [
              {
                id: 501,
                name: 'test-unit',
                status: 'completed',
                conclusion: 'success',
                html_url: 'https://github.com/ehmpathy/surf-demo/runs/501',
              },
            ];
            store.github.reviews[`${REPO}#${PR}`]!.push({
              id: 402,
              state: 'APPROVED',
              body: '',
              user: { login: 'surfer-mano', type: 'User' },
              html_url:
                'https://github.com/ehmpathy/surf-demo/pull/1220#pullrequestreview-402',
            });
          });
          await waitForWatch({
            label: 'approval alert',
            check: () => scene.getSays().length >= 2,
            scene,
          });
          await scene.waitForDaemonTicks({ ticks: 2 });
          return { says: scene.getSays() };
        });
        then(
          'a changes-requested review rides as a comment, with its state',
          () => {
            expect(result.says[0]!.text).toContain('review: changes requested');
            expect(result.says[0]!.text).toContain(
              'says: please split the wave report fetch',
            );
            expect(scene.asMasked(result.says[0]!.text)).toMatchSnapshot();
          },
        );
        then(
          'the approval alert names the reviewer, ci passed, and the release command',
          () => {
            expect(result.says[1]!.text).toContain(
              `🐢 shell yeah!\n\n🐚 git.pull.watch — approved #${PR}`,
            );
            expect(result.says[1]!.text).toContain('by: @surfer-mano');
            expect(result.says[1]!.text).toContain('ci: passed');
            expect(result.says[1]!.text).toContain(
              'next: rhx git.release --mode apply',
            );
            expect(scene.asMasked(result.says[1]!.text)).toMatchSnapshot();
          },
        );
        then('each event alerts once', () => {
          expect(result.says).toHaveLength(2);
        });
      },
    );

    when('[t1] a push turns ci red, then a second reviewer approves', () => {
      const result = useThen('the next tick alerts', async () => {
        scene.setStore((store) => {
          store.github.checks['sha-one']![0]!.conclusion = 'failure';
          store.github.reviews[`${REPO}#${PR}`]!.push({
            id: 403,
            state: 'APPROVED',
            body: '',
            user: { login: 'surfer-nalu', type: 'User' },
            html_url:
              'https://github.com/ehmpathy/surf-demo/pull/1220#pullrequestreview-403',
          });
        });
        await waitForWatch({
          label: 'approval on red',
          check: () =>
            scene.getSays().some((say) => say.text.includes('@surfer-nalu')),
          scene,
        });
        return {
          say: scene.getSays().find((say) => say.text.includes('@surfer-nalu')),
        };
      });
      then('the approval shows ci failed and points to the errors', () => {
        expect(result.say!.text).toContain('ci: failed');
        expect(result.say!.text).toContain('next: rhx show.gh.test.errors');
        expect(scene.asMasked(result.say!.text)).toMatchSnapshot();
      });
    });

    when(
      '[t2] a push starts fresh ci, and a reviewer approves before it ends',
      () => {
        const result = useThen('the next tick alerts', async () => {
          scene.setStore((store) => {
            store.github.prs[`${REPO}#${PR}`]!.headSha = 'sha-two';
            store.github.checks['sha-two'] = [
              {
                id: 601,
                name: 'test-unit',
                status: 'in_progress',
                conclusion: null,
                html_url: 'https://github.com/ehmpathy/surf-demo/runs/601',
              },
            ];
            store.github.reviews[`${REPO}#${PR}`]!.push({
              id: 404,
              state: 'APPROVED',
              body: '',
              user: { login: 'surfer-kai', type: 'User' },
              html_url:
                'https://github.com/ehmpathy/surf-demo/pull/1220#pullrequestreview-404',
            });
          });
          await waitForWatch({
            label: 'approval before ci ends',
            check: () =>
              scene.getSays().some((say) => say.text.includes('@surfer-kai')),
            scene,
          });
          return {
            say: scene
              .getSays()
              .find((say) => say.text.includes('@surfer-kai')),
          };
        });
        then(
          'the approval shows ci in progress and points to the watch (F23)',
          () => {
            expect(result.say!.text).toContain('ci: in progress');
            expect(result.say!.text).toContain('next: rhx git.release --watch');
            expect(scene.asMasked(result.say!.text)).toMatchSnapshot();
          },
        );
      },
    );

    when('[t3] a push whose head has no checks, then an approval', () => {
      const result = useThen('the next tick alerts', async () => {
        scene.setStore((store) => {
          store.github.prs[`${REPO}#${PR}`]!.headSha = 'sha-three';
          store.github.checks['sha-three'] = [];
          store.github.reviews[`${REPO}#${PR}`]!.push({
            id: 405,
            state: 'APPROVED',
            body: '',
            user: { login: 'surfer-pua', type: 'User' },
            html_url:
              'https://github.com/ehmpathy/surf-demo/pull/1220#pullrequestreview-405',
          });
        });
        await waitForWatch({
          label: 'approval with no checks',
          check: () =>
            scene.getSays().some((say) => say.text.includes('@surfer-pua')),
          scene,
        });
        return {
          say: scene.getSays().find((say) => say.text.includes('@surfer-pua')),
        };
      });
      then('the approval shows no checks and points to the watch', () => {
        expect(result.say!.text).toContain('ci: no checks');
        expect(result.say!.text).toContain('next: rhx git.release --watch');
        expect(scene.asMasked(result.say!.text)).toMatchSnapshot();
      });
    });
  });
});
