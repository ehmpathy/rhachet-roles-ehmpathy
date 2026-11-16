import { spawnSync } from 'child_process';
import * as fs from 'fs';
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

  // .what = run title set with the title piped in via --from @stdin
  const runSet = (
    scene: ReturnType<typeof genGitPullScene>,
    input: { title: string; args: string[] },
  ) =>
    scene.run(
      skill('git.pull.title.set'),
      ['--from', '@stdin', ...input.args],
      {
        stdin: input.title,
      },
    );

  // .what = write a file into the scene repo, its parent dir made if absent
  const setSceneFile = (
    scene: ReturnType<typeof genGitPullScene>,
    input: { rel: string; text: string },
  ) => {
    const abs = path.join(scene.tempDir, input.rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, input.text);
  };

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
        runSet(scene, { title: TITLE_NEW, args: [] }),
      );
      then('it exits 0, writes naught, and names the apply command', () => {
        expect(result.exitCode).toBe(0);
        expect(scene.getWrites()).toHaveLength(0);
        expect(result.stdout).toContain(
          'old: feat(lessons): book a surf lesson',
        );
        expect(result.stdout).toContain(`new: ${TITLE_NEW}`);
        expect(result.stdout).toContain('verdict: would set (plan)');
        expect(result.stdout).toContain('--mode apply');
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t2] set applies it', () => {
      const result = useThen('it runs', async () =>
        runSet(scene, { title: TITLE_NEW, args: ['--mode', 'apply'] }),
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
        const run = runSet(scene, {
          title: TITLE_NEW,
          args: ['--mode', 'apply'],
        });
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

  given(
    '[case3b] the round trip through a file: get --into, edit, set --from',
    () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      when('[t0] get writes the bare title into a file', () => {
        const result = useThen('it runs', async () =>
          scene.run(skill('git.pull.title.get'), [
            '--into',
            './.temp/title.md',
          ]),
        );
        then('the file holds the bare title; the hint names the set', () => {
          expect(result.exitCode).toBe(0);
          expect(
            fs.readFileSync(
              path.join(scene.tempDir, '.temp/title.md'),
              'utf-8',
            ),
          ).toBe('feat(lessons): book a surf lesson\n');
          expect(result.stdout).toContain('into: ./.temp/title.md');
          expect(result.stdout).toContain(
            'rhx git.pull.title set --from ./.temp/title.md   # plan',
          );
          expect(result.stdout).not.toContain('--which 7');
          expect(result.stdout).toMatchSnapshot();
        });
      });
      when('[t1] the file is edited and set --from it applies', () => {
        const result = useThen('it runs', async () => {
          setSceneFile(scene, {
            rel: '.temp/title.md',
            text: `${TITLE_NEW}\n`,
          });
          return scene.run(skill('git.pull.title.set'), [
            '--from',
            './.temp/title.md',
            '--mode',
            'apply',
          ]);
        });
        then('the pull holds the edited title, read back', () => {
          expect(result.exitCode).toBe(0);
          expect(scene.getStore().prs['7']!.title).toBe(TITLE_NEW);
          expect(result.stdout).toContain('set, read back, matches');
          expect(result.stdout).toMatchSnapshot();
        });
      });
      when('[t2] --into names a file git tracks', () => {
        const result = useThen('it runs', async () => {
          setSceneFile(scene, {
            rel: 'reef-title.md',
            text: 'the reef title\n',
          });
          spawnSync('git', ['add', 'reef-title.md'], { cwd: scene.tempDir });
          return scene.run(skill('git.pull.title.get'), [
            '--into',
            './reef-title.md',
          ]);
        });
        then('it exits 2 before any gh call and names the paved file', () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('--into names a file git tracks');
          expect(result.stdout).toContain('--into ./.temp/title.md');
          expect(result.stdout).toMatchSnapshot();
        });
      });
    },
  );

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
        runSet(scene, {
          title: TITLE_NEW,
          args: ['--mode', 'apply', '--auth', 'as-human'],
        }),
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
    when('[t0] set --which 8 applies', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('it runs', async () =>
        runSet(scene, {
          title: 'feat(reports): sync the wave report nightly',
          args: ['--which', '8', '--mode', 'apply'],
        }),
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
    when('[t1] set --which 8 applies to a closed pull', () => {
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
        runSet(scene, {
          title: 'feat(reports): sync the wave report, archived',
          args: ['--which', '8', '--mode', 'apply'],
        }),
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
    when('[t0] --which names a pull that does not exist', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('both verbs run', async () => ({
        get: scene.run(skill('git.pull.title.get'), ['--which', '9999']),
        set: runSet(scene, {
          title: 'x',
          args: ['--which', '9999', '--mode', 'apply'],
        }),
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
    when('[t0] the title is empty, absent, two lines, or not a file', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('each runs', async () => ({
        empty: runSet(scene, { title: '  ', args: [] }),
        absent: scene.run(skill('git.pull.title.set'), []),
        twoLines: runSet(scene, {
          title: 'feat(reef): map\nthe kelp beds',
          args: [],
        }),
        notFile: scene.run(skill('git.pull.title.set'), [
          '--from',
          './.temp/absent.md',
        ]),
        titleFlag: scene.run(skill('git.pull.title.set'), [
          '--title',
          TITLE_NEW,
        ]),
      }));
      then('each exits 2 and calls no gh', () => {
        expect(result.empty.exitCode).toBe(2);
        expect(result.empty.stdout).toContain(
          "the title from '@stdin' is empty",
        );
        expect(result.absent.exitCode).toBe(2);
        expect(result.absent.stdout).toContain('--from <path|@stdin>');
        expect(result.twoLines.exitCode).toBe(2);
        expect(result.twoLines.stdout).toContain('holds a newline');
        expect(result.notFile.exitCode).toBe(2);
        expect(result.notFile.stdout).toContain(
          "--from './.temp/absent.md' is not a file",
        );
        expect(scene.getCalls()).toHaveLength(0);
        expect(result.empty.stdout).toMatchSnapshot();
        expect(result.absent.stdout).toMatchSnapshot();
        expect(result.twoLines.stdout).toMatchSnapshot();
        expect(result.notFile.stdout).toMatchSnapshot();
      });
      then('--title is no flag: the title comes --from, as a body does', () => {
        expect(result.titleFlag.exitCode).toBe(2);
        expect(result.titleFlag.stdout).toContain("unknown arg '--title'");
      });
    });
  });

  given('[case20] a title that holds a secret-shaped value', () => {
    // .note = each value is composed at run time, so no secret-shaped literal sits in the source
    const CASES: { description: string; secret: string; shape: string }[] = [
      {
        description: 'a github token',
        secret: `gh${'p'}_${'k'.repeat(36)}`,
        shape: 'github token',
      },
      {
        description: 'an aws access key',
        secret: `AK${'IA'}${'Q'.repeat(16)}`,
        shape: 'aws access key',
      },
    ];
    CASES.forEach((thisCase, index) =>
      when(`[t${index}] the title holds ${thisCase.description}`, () => {
        const scene = genGitPullScene(PULL_SCENE_BARE);
        const result = useThen('plan and apply run', async () => ({
          plan: runSet(scene, {
            title: `fix(reef): rotate ${thisCase.secret}`,
            args: [],
          }),
          apply: runSet(scene, {
            title: `fix(reef): rotate ${thisCase.secret}`,
            args: ['--mode', 'apply'],
          }),
          calls: scene.getCalls().length,
        }));
        then(
          'each exits 2 before any gh call, names the shape, never the value',
          () => {
            [result.plan, result.apply].forEach((run) => {
              expect(run.exitCode).toBe(2);
              expect(run.stdout).toContain('holds a secret-shaped value');
              expect(run.stdout).toContain(`shape: ${thisCase.shape}, line 1`);
              expect(run.stdout).not.toContain(thisCase.secret);
              expect(run.stderr).toContain('ConstraintError');
            });
            expect(result.calls).toBe(0);
            expect(scene.getStore().prs['7']!.title).toBe(
              'feat(lessons): book a surf lesson',
            );
            expect(result.apply.stdout).toMatchSnapshot();
          },
        );
      }),
    );
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
        runSet(scene, { title: 't'.repeat(300), args: ['--mode', 'apply'] }),
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
        runSet(scene, { title: 't'.repeat(300), args: [] }),
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
        plan: runSet(scene, {
          title: 'feat(reports): mine now',
          args: ['--which', '8'],
        }),
        apply: runSet(scene, {
          title: 'feat(reports): mine now',
          args: ['--which', '8', '--mode', 'apply'],
        }),
      }));
      then('each exits 2, names the author, and writes naught', () => {
        expect(result.plan.exitCode).toBe(2);
        expect(result.apply.exitCode).toBe(2);
        expect(result.apply.stdout).toContain(
          `ehmpathy/surf-demo#8 was opened by ${PULL_SCENE_LOGIN_FOREIGN}`,
        );
        expect(result.apply.stdout).toContain('pipe the same title in again');
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
        runSet(scene, { title: TITLE_NEW, args: ['--mode', 'apply'] }),
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
    const TITLE_TICKS = "fix(lessons): book kai's lesson via `rhx booklesson`";
    when(
      '[t0] set applies a title with backticks and a quote from stdin',
      () => {
        const scene = genGitPullScene(PULL_SCENE_BARE);
        const result = useThen('it runs', async () =>
          runSet(scene, {
            title: `${TITLE_TICKS}\n`,
            args: ['--mode', 'apply'],
          }),
        );
        then('the title is set as piped, read back', () => {
          expect(result.exitCode).toBe(0);
          expect(scene.getStore().prs['7']!.title).toBe(TITLE_TICKS);
          expect(result.stdout).toContain('set, read back, matches');
          expect(result.stdout).toMatchSnapshot();
        });
      },
    );
    when('[t1] set plans it', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('it runs', async () =>
        runSet(scene, { title: TITLE_TICKS, args: [] }),
      );
      then('the apply hint pipes the title in again', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          'cat ./.temp/title.md | rhx git.pull.title.set --from @stdin --mode apply',
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
        runSet(scene, { title: TITLE_NEW, args: ['--mode', 'apply'] }),
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
    when('[t2] set applies with --output json', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('it runs', async () =>
        runSet(scene, {
          title: TITLE_NEW,
          args: ['--mode', 'apply', '--output', 'json'],
        }),
      );
      then('stdout is one json object with the old, new, and read-back', () => {
        expect(result.exitCode).toBe(0);
        const out = JSON.parse(result.stdout);
        expect(out.mode).toBe('apply');
        expect(out.pr).toBe(7);
        expect(out.title).toEqual({
          old: 'feat(lessons): book a surf lesson',
          new: TITLE_NEW,
          readback: TITLE_NEW,
        });
        expect(out).toMatchSnapshot();
      });
    });
  });

  given('[case13] a title passed with blanks at its ends', () => {
    const scene = genGitPullScene(PULL_SCENE_BARE);
    when('[t0] set applies it', () => {
      const result = useThen('it runs', async () =>
        runSet(scene, { title: `  ${TITLE_NEW}  `, args: ['--mode', 'apply'] }),
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
        runSet(scene, { title: `  ${TITLE_NEW}  `, args: ['--mode', 'apply'] }),
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
        plan: runSet(scene, { title: TITLE_NEW, args: ['--which', '8'] }),
        apply: runSet(scene, {
          title: TITLE_NEW,
          args: ['--which', '8', '--mode', 'apply'],
        }),
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
        runSet(scene, { title: TITLE_NEW, args: ['--mode', 'apply'] }),
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
        expect(result.setHelp.stdout).toContain('--from <path|@stdin>');
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
