import * as path from 'path';
import { given, then, useThen, when } from 'test-fns';

import {
  genGitPullScene,
  PULL_SCENE_BARE,
  PULL_SCENE_LOGIN_FOREIGN,
  PULL_SCENE_LOGIN_HUMAN,
} from '@src/.test/genGitPullScene';

/**
 * .what = integration tests for git.pull.title get | set
 * .why  = prove the contract: plan by default, apply reads back, a rerun is a
 *         no-op, and every refusal lands before a write
 *
 * .mock = gh and the keyrack are stubs (see genGitPullScene for the why)
 */
describe('git.pull.title', () => {
  const skill = (name: string) => path.join(__dirname, `${name}.sh`);
  const TITLE_NEW = 'feat(lessons): book a surf lesson, with a reef map';

  given('[case3] a driver retitles its own pull', () => {
    const scene = genGitPullScene(PULL_SCENE_BARE);
    when('[t0] get reads the title', () => {
      const result = useThen('it runs', async () => ({
        tree: scene.run(skill('git.pull.title.get'), []),
        text: scene.run(skill('git.pull.title.get'), ['--output', 'text']),
      }));
      then('the tree names the pull and its title', () => {
        expect(result.tree.exitCode).toBe(0);
        expect(result.tree.stdout).toContain('target: ehmpathy/surf-demo#7');
        expect(result.tree.stdout).toContain(
          'title: feat(lessons): book a surf lesson',
        );
        expect(result.tree.stdout).toMatchSnapshot();
      });
      then('--output text prints the bare title', () => {
        expect(result.text.stdout).toBe('feat(lessons): book a surf lesson\n');
        expect(result.text.stdout).toMatchSnapshot();
      });
    });
    when('[t1] set plans the new title', () => {
      const result = useThen('it runs', async () =>
        scene.run(skill('git.pull.title.set'), ['--title', TITLE_NEW]),
      );
      then('it exits 0, writes naught, and names the apply command', () => {
        expect(result.exitCode).toBe(0);
        expect(scene.getWrites()).toHaveLength(0);
        expect(result.stdout).toContain('verdict: would set (plan)');
        expect(result.stdout).toContain('--mode apply');
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t2] set applies it', () => {
      const result = useThen('it runs', async () =>
        scene.run(skill('git.pull.title.set'), [
          '--title',
          TITLE_NEW,
          '--mode',
          'apply',
        ]),
      );
      then('the pull holds the new title, read back', () => {
        expect(result.exitCode).toBe(0);
        expect(scene.getStore().prs['7']!.title).toBe(TITLE_NEW);
        expect(result.stdout).toContain('set, read back, matches');
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t3] the same set reruns', () => {
      const result = useThen('it runs', async () => {
        const before = scene.getWrites().length;
        const run = scene.run(skill('git.pull.title.set'), [
          '--title',
          TITLE_NEW,
          '--mode',
          'apply',
        ]);
        return { ...run, writesNew: scene.getWrites().length - before };
      });
      then('it reports a no-op and writes naught', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('already there — no-op');
        expect(result.writesNew).toBe(0);
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case5] as-human, with gh logged in', () => {
    when('[t0] set applies the title to the human own pull', () => {
      const scene = genGitPullScene({
        ...PULL_SCENE_BARE,
        store: {
          prs: {
            '7': {
              title: 'feat(lessons): book a surf lesson',
              body: 'surf lesson booker',
              head: 'surf/book-lesson',
              author: PULL_SCENE_LOGIN_HUMAN,
            },
          },
        },
      });
      const result = useThen('it runs', async () =>
        scene.run(skill('git.pull.title.set'), [
          '--title',
          TITLE_NEW,
          '--mode',
          'apply',
          '--auth',
          'as-human',
        ]),
      );
      then('the title is set under the host gh login, read back', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('auth: as-human');
        expect(scene.getStore().prs['7']!.title).toBe(TITLE_NEW);
        expect(scene.getWrites().every((call) => !call.hasGhToken)).toBe(true);
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case6] a peer pull, by number', () => {
    when('[t0] set --pr 8 applies', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run(skill('git.pull.title.set'), [
          '--pr',
          '8',
          '--title',
          'feat(reports): sync the wave report nightly',
          '--mode',
          'apply',
        ]),
      );
      then('pull #8 is retitled; pull #7 is untouched', () => {
        expect(result.exitCode).toBe(0);
        const store = scene.getStore();
        expect(store.prs['8']!.title).toBe(
          'feat(reports): sync the wave report nightly',
        );
        expect(store.prs['7']!.title).toBe('feat(lessons): book a surf lesson');
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t1] set --pr 8 applies to a closed pull', () => {
      const scene = genGitPullScene({
        ...PULL_SCENE_BARE,
        store: {
          prs: {
            '8': {
              title: 'feat(reports): sync the wave report',
              body: 'wave report sync',
              head: 'surf/wave-report',
              state: 'closed',
            },
          },
        },
      });
      const result = useThen('it runs', async () =>
        scene.run(skill('git.pull.title.set'), [
          '--pr',
          '8',
          '--title',
          'feat(reports): sync the wave report, archived',
          '--mode',
          'apply',
        ]),
      );
      then('the set works on any state, as github allows', () => {
        expect(result.exitCode).toBe(0);
        expect(scene.getStore().prs['8']!.title).toBe(
          'feat(reports): sync the wave report, archived',
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case4] no pull to target', () => {
    when('[t0] --pr names a pull that does not exist', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('both verbs run', async () => ({
        get: scene.run(skill('git.pull.title.get'), ['--pr', '9999']),
        set: scene.run(skill('git.pull.title.set'), [
          '--pr',
          '9999',
          '--title',
          'x',
          '--mode',
          'apply',
        ]),
      }));
      then('each exits 2, names the pull, and writes naught', () => {
        expect(result.get.exitCode).toBe(2);
        expect(result.set.exitCode).toBe(2);
        expect(result.set.stdout).toContain(
          'pull request ehmpathy/surf-demo#9999 is absent',
        );
        expect(scene.getWrites()).toHaveLength(0);
        expect(result.get.stdout).toMatchSnapshot();
        expect(result.set.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case8] refused before any gh call', () => {
    when('[t0] the title is empty, absent, or two lines', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('each runs', async () => ({
        empty: scene.run(skill('git.pull.title.set'), ['--title', '  ']),
        absent: scene.run(skill('git.pull.title.set'), []),
        twoLines: scene.run(skill('git.pull.title.set'), [
          '--title',
          'feat(reef): map\nthe kelp beds',
        ]),
      }));
      then('each exits 2 and calls no gh', () => {
        expect(result.empty.exitCode).toBe(2);
        expect(result.empty.stdout).toContain('the title is empty');
        expect(result.absent.exitCode).toBe(2);
        expect(result.absent.stdout).toContain('--title');
        expect(result.twoLines.exitCode).toBe(2);
        expect(result.twoLines.stdout).toContain('holds a newline');
        expect(scene.getCalls()).toHaveLength(0);
        expect(result.empty.stdout).toMatchSnapshot();
        expect(result.absent.stdout).toMatchSnapshot();
        expect(result.twoLines.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case11] github refuses the title (422)', () => {
    when('[t0] the write answers 422', () => {
      const scene = genGitPullScene({
        ...PULL_SCENE_BARE,
        store: {
          fail: 'gh: Validation Failed (HTTP 422)\ntitle is too long (maximum is 256 characters)',
          failMethod: 'PATCH',
        },
      });
      const result = useThen('it runs', async () =>
        scene.run(skill('git.pull.title.set'), [
          '--title',
          't'.repeat(300),
          '--mode',
          'apply',
        ]),
      );
      then('it exits 2, names the title, and the fix', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'github refused the title of ehmpathy/surf-demo#7',
        );
        expect(result.stdout).toContain('title is too long');
        expect(result.stdout).toContain('shorten or reword the title');
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t1] the same long title runs under plan', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run(skill('git.pull.title.set'), ['--title', 't'.repeat(300)]),
      );
      then(
        'the plan passes: the cap is github own, read only on write (fulcrum F8)',
        () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('verdict: would set (plan)');
          expect(scene.getWrites()).toHaveLength(0);
        },
      );
    });
  });

  given('[case17] a pull its credential did not open', () => {
    when('[t0] set runs on a pull another login opened', () => {
      const scene = genGitPullScene({
        ...PULL_SCENE_BARE,
        store: {
          prs: {
            '8': {
              title: 'feat(reports): sync the wave report',
              body: 'wave report sync',
              head: 'surf/wave-report',
              author: PULL_SCENE_LOGIN_FOREIGN,
            },
          },
        },
      });
      const result = useThen('plan and apply run', async () => ({
        plan: scene.run(skill('git.pull.title.set'), [
          '--pr',
          '8',
          '--title',
          'feat(reports): mine now',
        ]),
        apply: scene.run(skill('git.pull.title.set'), [
          '--pr',
          '8',
          '--title',
          'feat(reports): mine now',
          '--mode',
          'apply',
        ]),
      }));
      then('each exits 2, names the author, and writes naught', () => {
        expect(result.plan.exitCode).toBe(2);
        expect(result.apply.exitCode).toBe(2);
        expect(result.apply.stdout).toContain(
          `ehmpathy/surf-demo#8 was opened by ${PULL_SCENE_LOGIN_FOREIGN}`,
        );
        expect(scene.getWrites()).toHaveLength(0);
        expect(scene.getStore().prs['8']!.title).toBe(
          'feat(reports): sync the wave report',
        );
        expect(result.apply.stdout).toMatchSnapshot();
      });
    });
    when('[t1] set runs as-ehmpath on the human own pull', () => {
      const scene = genGitPullScene({
        ...PULL_SCENE_BARE,
        store: {
          prs: {
            '7': {
              title: 'feat(lessons): book a surf lesson',
              body: 'surf lesson booker',
              head: 'surf/book-lesson',
              author: PULL_SCENE_LOGIN_HUMAN,
            },
          },
        },
      });
      const result = useThen('it runs', async () =>
        scene.run(skill('git.pull.title.set'), [
          '--title',
          TITLE_NEW,
          '--mode',
          'apply',
        ]),
      );
      then('it exits 2 and names the --auth as-human command', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('--mode plan --auth as-human');
        expect(scene.getWrites()).toHaveLength(0);
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case18] a title a shell would mangle, via @stdin', () => {
    const TITLE_TICKS = 'fix(lessons): book via `rhx booklesson`';
    when('[t0] set applies a title with backticks from stdin', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run(
          skill('git.pull.title.set'),
          ['--title', '@stdin', '--mode', 'apply'],
          { stdin: `${TITLE_TICKS}\n` },
        ),
      );
      then('the title is set as piped, read back', () => {
        expect(result.exitCode).toBe(0);
        expect(scene.getStore().prs['7']!.title).toBe(TITLE_TICKS);
        expect(result.stdout).toContain('set, read back, matches');
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t1] set plans it', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run(skill('git.pull.title.set'), ['--title', '@stdin'], {
          stdin: TITLE_TICKS,
        }),
      );
      then('the apply hint pipes the title in again', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          'cat ./.temp/title.txt | rhx git.pull.title.set --title @stdin --mode apply',
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case12] the less-trod paths of set', () => {
    when('[t0] github stores a title other than the one sent', () => {
      const scene = genGitPullScene({
        ...PULL_SCENE_BARE,
        store: { rewrite: true },
      });
      const result = useThen('it runs', async () =>
        scene.run(skill('git.pull.title.set'), [
          '--title',
          TITLE_NEW,
          '--mode',
          'apply',
        ]),
      );
      then('it exits 1 as a malfunction that names both titles', () => {
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('💥 MalfunctionError:');
        expect(result.stdout).toContain(TITLE_NEW);
        expect(result.stdout).toContain(`${TITLE_NEW} (edited by a bot)`);
        expect(result.stderr).toContain('MalfunctionError');
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t1] the title holds an apostrophe, under plan', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run(skill('git.pull.title.set'), [
          '--title',
          "fix(lessons): kai's board size",
        ]),
      );
      then('the apply hint quotes it so a paste runs as is', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          `rhx git.pull.title.set --title 'fix(lessons): kai'\\''s board size' --mode apply`,
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t2] set applies with --output json', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run(skill('git.pull.title.set'), [
          '--title',
          TITLE_NEW,
          '--mode',
          'apply',
          '--output',
          'json',
        ]),
      );
      then(
        'stdout is one json object with the before, after, and read-back',
        () => {
          expect(result.exitCode).toBe(0);
          const out = JSON.parse(result.stdout);
          expect(out.mode).toBe('apply');
          expect(out.pr).toBe(7);
          expect(out.title).toEqual({
            current: 'feat(lessons): book a surf lesson',
            new: TITLE_NEW,
            readback: TITLE_NEW,
          });
          expect(out).toMatchSnapshot();
        },
      );
    });
  });

  given('[case13] a title passed with blanks at its ends', () => {
    const scene = genGitPullScene(PULL_SCENE_BARE);
    when('[t0] set applies it', () => {
      const result = useThen('it runs', async () =>
        scene.run(skill('git.pull.title.set'), [
          '--title',
          `  ${TITLE_NEW}  `,
          '--mode',
          'apply',
        ]),
      );
      then('the title is stored trimmed and reads back equal', () => {
        expect(result.exitCode).toBe(0);
        expect(scene.getStore().prs['7']!.title).toBe(TITLE_NEW);
        expect(result.stdout).toContain('set, read back, matches');
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t1] the same padded title is set again', () => {
      const result = useThen('it runs', async () =>
        scene.run(skill('git.pull.title.set'), [
          '--title',
          `  ${TITLE_NEW}  `,
          '--mode',
          'apply',
        ]),
      );
      then('it converges: a no-op, snapped', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('already there — no-op');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case19] a merged pull, and a write github refuses', () => {
    when('[t0] set runs on a merged pull, by number', () => {
      const scene = genGitPullScene({
        ...PULL_SCENE_BARE,
        store: {
          prs: {
            '8': {
              title: 'feat(reports): sync the wave report',
              body: 'wave report sync',
              head: 'surf/wave-report',
              merged: true,
            },
          },
        },
      });
      const result = useThen('plan and apply run', async () => ({
        plan: scene.run(skill('git.pull.title.set'), [
          '--pr',
          '8',
          '--title',
          TITLE_NEW,
        ]),
        apply: scene.run(skill('git.pull.title.set'), [
          '--pr',
          '8',
          '--title',
          TITLE_NEW,
          '--mode',
          'apply',
        ]),
      }));
      then('the plan names the state merged, not closed', () => {
        expect(result.plan.exitCode).toBe(0);
        expect(result.plan.stdout).toContain('state: merged');
        expect(result.plan.stdout).not.toContain('state: closed');
        expect(result.plan.stdout).toMatchSnapshot();
      });
      then('the write lands, as github allows on a merged pull', () => {
        expect(result.apply.exitCode).toBe(0);
        expect(scene.getStore().prs['8']!.title).toBe(TITLE_NEW);
        expect(result.apply.stdout).toContain('state: merged');
        expect(result.apply.stdout).toMatchSnapshot();
      });
    });
    when('[t1] the write answers 403: the token may read, not write', () => {
      const scene = genGitPullScene({
        ...PULL_SCENE_BARE,
        store: {
          fail: 'gh: Resource not accessible by integration (HTTP 403)',
          failMethod: 'PATCH',
        },
      });
      const result = useThen('it runs', async () =>
        scene.run(skill('git.pull.title.set'), [
          '--title',
          TITLE_NEW,
          '--mode',
          'apply',
        ]),
      );
      then('it fails loud with the 403, and the title is untouched', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('✋ ConstraintError: github forbade');
        expect(result.stdout).toContain('HTTP 403');
        expect(result.stderr).toContain('HTTP 403');
        expect(scene.getStore().prs['7']!.title).toBe(
          'feat(lessons): book a surf lesson',
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case10] the verbs dispatch as `git.pull.title <verb>`', () => {
    when('[t0] get, help, and an unknown verb run via the dispatcher', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('they run', async () => ({
        get: scene.run(skill('git.pull.title'), ['get', '--output', 'json']),
        help: scene.run(skill('git.pull.title'), ['--help']),
        unknown: scene.run(skill('git.pull.title'), ['del']),
        setHelp: scene.run(skill('git.pull.title.set'), ['--help']),
      }));
      then('get returns the title as json', () => {
        expect(result.get.exitCode).toBe(0);
        const json = JSON.parse(result.get.stdout);
        expect(json.title).toBe('feat(lessons): book a surf lesson');
        expect(json).toMatchSnapshot();
      });
      then('help names both verbs; set --help names its flags', () => {
        expect(result.help.stdout).toContain('get | set');
        expect(result.setHelp.stdout).toContain("--title '<title>'");
        expect(result.setHelp.stdout).toMatchSnapshot();
      });
      then('an unknown verb exits 2', () => {
        expect(result.unknown.exitCode).toBe(2);
        expect(result.unknown.stdout).toContain("unknown verb 'del'");
        expect(result.unknown.stdout).toMatchSnapshot();
      });
    });
  });
});
