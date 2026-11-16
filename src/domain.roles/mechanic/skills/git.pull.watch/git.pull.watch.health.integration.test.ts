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

    when('[t2] #1221 answers 404 each tick', () => {
      const result = useThen('the ticks pass', async () => {
        const saysBefore = scene.getSays().length;
        scene.setStore((store) => {
          store.github.faultByPr = { [`${REPO}#1221`]: 'notfound' };
        });
        await scene.waitForDaemonTicks({ ticks: 6 });
        const listed = JSON.parse(
          scene.runSkill({
            verb: 'get',
            args: ['--output', 'json'],
            root: scene.roots['surf-demo']!,
            serial: null,
          }).stdout,
        );
        scene.setStore((store) => {
          store.github.faultByPr = {};
        });
        return { listed, saysNew: scene.getSays().length - saysBefore };
      });
      then('get shows the 404 on its row', () => {
        const rows = result.listed.daemons[0].watches;
        const gone = rows.find((row: { pr: number }) => row.pr === 1221);
        expect(gone.readFault.rc).toEqual(1);
        expect(gone.readFault.cause).toContain('404');
      });
      then(
        'no note is sent for it; what it should say waits on the commander',
        () => {
          expect(result.saysNew).toEqual(0);
        },
      );
    });
  });
});
