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
    const getHeld = (): { tries: number; cause?: string; text: string }[] => {
      const outboxes = fs
        .readdirSync(scene.getStateRoot())
        .map((dir) => path.join(scene.getStateRoot(), dir, 'outbox'))
        .filter((dir) => fs.existsSync(dir));
      return outboxes.flatMap((dir) =>
        fs
          .readdirSync(dir)
          // an entry mid-write is a `<entry>.tmp.<pid>.<n>` file beside it; only whole entries count
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
        return { held: getHeld(), listedTree, listedJson };
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
  });
});
