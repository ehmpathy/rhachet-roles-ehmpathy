import * as fs from 'fs';
import * as path from 'path';
import { given, then, useThen, when } from 'test-fns';

import { genWatchTestScene } from '../../skills/git.pull.watch/__test_utils__/genWatchTestScene';
import { waitForWatch } from '../../skills/git.pull.watch/__test_utils__/waitForWatch';

/**
 * .what = the prompt hook prints each pr-watch alert the daemon could not say
 *         into its clone, once, and `get` names why the alert waits
 * .why  = `clone say` refuses some clones for good (a screen it cannot read);
 *         with no other door, such a clone never hears its pr
 */
/**
 * .mock = github (`gh api`), the clone registry and `clone say` (`rhachet`), and
 *         the keyrack token read answer from genWatchTestScene stub bins on PATH;
 *         the hook, the skill, the daemon, and the filesystem run for real
 * .why  = a clone screen that `clone say` can never read cannot be forced on the
 *         real rhachet on demand
 * .real = skills/git.pull.watch/git.pull.watch.rhachet.real.integration.test.ts
 */
jest.setTimeout(400_000);

const SERIAL = 'a1a1a1a1-0000-4000-8000-00000000000a';
const SERIAL_OTHER = 'c3c3c3c3-0000-4000-8000-00000000000c';
const HOOK = path.join(__dirname, 'userpromptsubmit.git-pull-watch.sh');

describe('userpromptsubmit.git-pull-watch.sh', () => {
  given('[case1] a clone whose screen clone say refuses, for good', () => {
    const scene = genWatchTestScene({
      slug: 'watch-prompt',
      repos: ['surf-demo'],
      store: {},
      env: { GIT_PULL_WATCH_HELD_NAMED_TICKS: '2' },
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        {
          serial: SERIAL,
          slug: 'mechanic',
          reachState: 'LIVE',
          say: 'withheld',
        },
      ];
      store.github.prs['ehmpathy/surf-demo#1220'] = {
        state: 'open',
        merged: false,
        headSha: 'sha-1220',
        closedBy: null,
      };
      store.github.checks['sha-1220'] = [];
    });
    afterAll(() => scene.stopAllDaemons());

    // the held alerts of this clone, as the daemon wrote them
    // .note = match `*.json` alone, as the hook's glob does: a write lands as
    //         `<entry>.json.tmp.<pid>.<rand>` then moves, so a temp file is half a write
    const getHeld = (): { tries: number; cause?: string; text: string }[] => {
      const outboxes = fs
        .readdirSync(scene.getStateRoot())
        .map((dir) => path.join(scene.getStateRoot(), dir, 'outbox'))
        .filter((dir) => fs.existsSync(dir));
      return outboxes.flatMap((dir) =>
        fs
          .readdirSync(dir)
          .filter(
            (name) =>
              name.includes(`.clone=${SERIAL}.`) && name.endsWith('.json'),
          )
          .map((name) =>
            JSON.parse(fs.readFileSync(path.join(dir, name), 'utf-8')),
          ),
      );
    };
    const runHook = (serial: string | null) =>
      scene.runScript({
        path: HOOK,
        args: [],
        root: scene.roots['surf-demo']!,
        serial,
      });

    when('[t0] a peer comments, and the daemon cannot say it', () => {
      const result = useThen('the alert waits, named', async () => {
        scene.runSkill({
          verb: 'set',
          args: ['--which', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL,
        });
        await scene.waitForPrimed();
        scene.setStore((store) => {
          store.github.issueComments['ehmpathy/surf-demo#1220'] = [
            {
              id: 901,
              body: 'so where are we at?',
              user: { login: 'surfer-kai', type: 'User' },
              html_url:
                'https://github.com/ehmpathy/surf-demo/pull/1220#issuecomment-901',
            },
          ];
        });
        await waitForWatch({
          label: 'alert held past the named bound',
          check: () => getHeld().some((one) => one.tries >= 2),
          scene,
        });

        // plant half a write, as a temp file looks before its mv: no reader may count it
        const decoys = fs
          .readdirSync(scene.getStateRoot())
          .map((dir) => path.join(scene.getStateRoot(), dir, 'outbox'))
          .filter((dir) => fs.existsSync(dir))
          .map((dir) =>
            path.join(
              dir,
              `ehmpathy.surf-demo.pr=1220.clone=${SERIAL}.1700000000.42.7.json.tmp.42.7`,
            ),
          );
        decoys.forEach((decoy) => fs.writeFileSync(decoy, '{"tries":'));
        const listedTree = scene.runSkill({
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
        const held = getHeld();
        decoys.forEach((decoy) => fs.rmSync(decoy, { force: true }));
        return { held, listedTree, listedJson, decoys };
      });
      then('a temp file mid-write is never read as an alert', () => {
        expect(result.decoys.length).toBeGreaterThan(0);
        expect(result.held).toHaveLength(1);
        expect(result.listedJson.daemons[0].watches[0].held).toEqual(1);
      });
      then('the held alert carries the refusal cause', () => {
        expect(result.held).toHaveLength(1);
        expect(result.held[0]!.cause).toEqual('the say was withheld');
      });
      then('get names the held count, its ticks, and its cause', () => {
        expect(result.listedTree.stdout).toMatch(
          /· 1 held, \d+ ticks: the say was withheld/,
        );
        expect(result.listedTree.stdout).toContain(
          'the clone hears it at its next prompt',
        );
        const watch = result.listedJson.daemons[0].watches[0];
        expect(watch.held).toEqual(1);
        expect(watch.heldTicks).toBeGreaterThanOrEqual(2);
        expect(watch.heldCause).toEqual('the say was withheld');
      });
    });

    when('[t1] a prompt in another clone', () => {
      const result = useThen('the hook runs', async () => ({
        none: runHook(null),
        other: runHook(SERIAL_OTHER),
        held: getHeld(),
      }));
      then('it says naught, and the alert still waits', () => {
        expect(result.none.status).toEqual(0);
        expect(result.none.stdout).toEqual('');
        expect(result.other.status).toEqual(0);
        expect(result.other.stdout).toEqual('');
        expect(result.held).toHaveLength(1);
      });
    });

    when('[t2] the next prompt in the refused clone', () => {
      const result = useThen('the hook prints the held alert', async () => {
        const hook = runHook(SERIAL);
        const heldAfter = getHeld();
        // a few more ticks: the daemon must not revive what the hook cleared
        await scene.waitForDaemonTicks({ ticks: 3 });
        return { hook, heldAfter, heldLater: getHeld() };
      });
      then('it prints the alert once, with why it waited', () => {
        expect(result.hook.status).toEqual(0);
        expect(result.hook.stdout).toContain('so where are we at?');
        expect(
          result.hook.stdout.split('so where are we at?').length - 1,
        ).toEqual(1);
        expect(result.hook.stdout).toMatch(
          /held \d+ ticks; clone say refused: the say was withheld/,
        );
        expect(
          scene
            .asMasked(result.hook.stdout)
            .replace(/held \d+ ticks/, 'held <n> ticks'),
        ).toMatchSnapshot();
      });
      then('the alert is cleared, and stays cleared', () => {
        expect(result.heldAfter).toHaveLength(0);
        expect(result.heldLater).toHaveLength(0);
      });
    });

    when('[t3] the prompt after that', () => {
      const result = useThen('the hook runs', async () => runHook(SERIAL));
      then('it says naught: each alert prints once', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toEqual('');
      });
    });

    when(
      '[t4] a member opens a review thread, and the daemon cannot say it',
      () => {
        const result = useThen(
          'the next prompt prints the held reply task',
          async () => {
            scene.setStore((store) => {
              store.github.reviewComments['ehmpathy/surf-demo#1220'] = [
                {
                  id: 902,
                  body: 'why a 30 min cap?',
                  user: { login: 'surfer-kai', type: 'User' },
                  author_association: 'MEMBER',
                  html_url:
                    'https://github.com/ehmpathy/surf-demo/pull/1220#discussion_r902',
                  // github serves every review comment with its path and line
                  path: 'src/tide.ts',
                  line: 12,
                },
              ];
            });
            await waitForWatch({
              label: 'reply task held',
              check: () =>
                getHeld().some(
                  // the hook prints only what is held past the named bound, as [t0] waits
                  (one) => one.text.includes('reply task') && one.tries >= 2,
                ),
              scene,
            });
            return runHook(SERIAL);
          },
        );
        then(
          'the held mark asks for a check of the thread first, as the daemon route does',
          () => {
            expect(result.status).toEqual(0);
            // a relay or the web may have answered while the task waited
            expect(result.stdout).toMatch(
              /reply task on #1220 \(held \d+ ticks; clone say refused: the say was withheld; check each thread first, you may have answered it\)/,
            );
            expect(
              scene
                .asMasked(result.stdout)
                .replace(/held \d+ ticks/, 'held <n> ticks'),
            ).toMatchSnapshot();
          },
        );
      },
    );

    when(
      '[t5] two members open threads in one read, and the daemon cannot say it',
      () => {
        const result = useThen(
          'the next prompt prints the held reply tasks',
          async () => {
            scene.setStore((store) => {
              store.github.reviewComments['ehmpathy/surf-demo#1220']!.push(
                ...[903, 904].map((id) => ({
                  id,
                  body: id === 903 ? 'why poll here?' : 'and the docs?',
                  user: { login: 'surfer-kai', type: 'User' as const },
                  author_association: 'MEMBER' as const,
                  html_url: `https://github.com/ehmpathy/surf-demo/pull/1220#discussion_r${id}`,
                  path: 'src/tide.ts',
                  line: 12,
                })),
              );
            });
            await waitForWatch({
              label: 'two reply tasks held',
              check: () =>
                getHeld().some(
                  (one) => one.text.includes('2 reply tasks') && one.tries >= 2,
                ),
              scene,
            });
            return runHook(SERIAL);
          },
        );
        then('the plural mark asks for a check of each thread first', () => {
          expect(result.status).toEqual(0);
          expect(result.stdout).toMatch(
            /2 reply tasks on #1220 \(held \d+ ticks; clone say refused: the say was withheld; check each thread first, you may have answered it\)/,
          );
          expect(
            scene
              .asMasked(result.stdout)
              .replace(/held \d+ ticks/, 'held <n> ticks'),
          ).toMatchSnapshot();
        });
      },
    );
  });
});
