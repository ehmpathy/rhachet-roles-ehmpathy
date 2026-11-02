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
 * .what = integration tests for git.pull.description get | set
 * .why  = prove the contract: plan by default, the attribution repair, the
 *         round trip converges, read-back hash, and every refusal before a write
 *
 * .mock = gh and the keyrack are stubs (see genGitPullScene for the why)
 */
describe('git.pull.description', () => {
  const FOOTER = '🐢🌊 surfed in by seaturtle[bot]';
  const HARNESS_CLAUDE_LINE =
    '🤖 Generated with [Claude Code](https://claude.com/claude-code)';
  const skill = (name: string) => path.join(__dirname, `${name}.sh`);
  const countFooters = (body: string) => body.split(FOOTER).length - 1;

  given('[case1] a body with the harness claude line and its trailer', () => {
    const body = [
      '## .what',
      '',
      'book a surf lesson at the reef',
      '',
      HARNESS_CLAUDE_LINE,
      '',
      'Co-Authored-By: Claude <noreply@anthropic.com>',
    ].join('\n');

    when('[t0] set plans it', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run(skill('git.pull.description.set'), ['--from', '@stdin'], {
          stdin: body,
        }),
      );
      then('it exits 0, writes naught, and names each repair', () => {
        expect(result.exitCode).toBe(0);
        expect(scene.getWrites()).toHaveLength(0);
        expect(result.stdout).toContain('stripped the claude code line');
        expect(result.stdout).toContain(
          'stripped the co-authored-by trailer(s)',
        );
        expect(result.stdout).toContain('appended the seaturtle footer');
        expect(result.stdout).toContain('verdict: would set (plan)');
        expect(result.stdout).toMatchSnapshot();
      });
      then(
        'it shows the body as it would land: no claude line, footer last',
        () => {
          expect(result.stdout).toContain('book a surf lesson at the reef');
          expect(result.stdout).not.toContain('Generated with');
          expect(result.stdout).not.toMatch(/co-authored-by: claude/i);
          expect(result.stdout).toMatch(
            /│ {5}---\n {3}│ {5}🐢🌊 surfed in by seaturtle\[bot\]\n/,
          );
          // the spacer after the new text sits on its own line, never glued to the footer
          expect(result.stdout).not.toMatch(/\[bot\] +│/);
        },
      );
      then('it shows the current text it would overwrite, read fresh', () => {
        expect(result.stdout).toMatch(/│ {5}surf lesson booker\n/);
        expect(result.stdout).toContain('author: ehm-seaturtle');
      });
    });

    when('[t1] set applies it', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run(
          skill('git.pull.description.set'),
          ['--from', '@stdin', '--mode', 'apply'],
          { stdin: body },
        ),
      );
      then('the pull body holds no claude line and no trailer', () => {
        expect(result.exitCode).toBe(0);
        const live = scene.getStore().prs['7']!.body;
        expect(live).not.toMatch(/claude code/i);
        expect(live).not.toContain('🤖');
        expect(live).not.toMatch(/co-authored-by/i);
      });
      then('the pull body keeps its words and ends in one footer', () => {
        const live = scene.getStore().prs['7']!.body;
        expect(live).toContain('book a surf lesson at the reef');
        expect(live.endsWith(`\n\n---\n${FOOTER}`)).toBe(true);
        expect(countFooters(live)).toBe(1);
        expect(live).toMatchSnapshot();
      });
      then('it reads back and the hash matches', () => {
        expect(result.stdout).toContain('set, read back, hash matches');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case2] get, edit, set: the round trip', () => {
    const scene = genGitPullScene(PULL_SCENE_BARE);
    when('[t0] get reads the body', () => {
      const result = useThen('it runs', async () =>
        scene.run(skill('git.pull.description.get'), []),
      );
      then('it shows the body of this branch pull, footer included', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('target: ehmpathy/surf-demo#7');
        expect(result.stdout).toContain('surf lesson booker');
        expect(result.stdout).toContain(FOOTER);
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t1] get --to a file, a section appended, set --from it', () => {
      const bodyPath = path.join(scene.tempDir, '.temp', 'body.md');
      const result = useThen('it runs', async () => {
        const get = scene.run(skill('git.pull.description.get'), [
          '--to',
          './.temp/body.md',
        ]);
        const fetched = fs.readFileSync(bodyPath, 'utf-8');
        fs.writeFileSync(
          bodyPath,
          `${fetched}\n## .limits\n\nno night lessons\n`,
        );
        const set = scene.run(skill('git.pull.description.set'), [
          '--from',
          './.temp/body.md',
          '--mode',
          'apply',
        ]);
        return { get, fetched, set };
      });
      then('get --to writes the bare body, parent dir made', () => {
        expect(result.get.exitCode).toBe(0);
        expect(result.fetched).toBe(`surf lesson booker\n\n---\n${FOOTER}\n`);
        expect(result.get.stdout).toContain('to: ./.temp/body.md');
      });
      then('the get hint names the file, and set plans first', () => {
        expect(result.get.stdout).toContain('1. edit ./.temp/body.md');
        expect(result.get.stdout).toContain(
          '2. rhx git.pull.description set --pr 7 --in ehmpathy/surf-demo --from ./.temp/body.md   # plan; add --mode apply to write',
        );
        expect(result.get.stdout).not.toContain('--output text >');
        expect(result.get.stdout).toMatchSnapshot();
      });
      then('the body holds the section and ends in one footer', () => {
        expect(result.set.exitCode).toBe(0);
        expect(result.set.stdout).toMatchSnapshot();
        const live = scene.getStore().prs['7']!.body;
        expect(live).toContain('## .limits');
        expect(live.endsWith(`\n\n---\n${FOOTER}`)).toBe(true);
        expect(countFooters(live)).toBe(1);
      });
    });
    when('[t2] the same get --to, then set --from, reruns', () => {
      const result = useThen('it runs', async () => {
        scene.run(skill('git.pull.description.get'), [
          '--to',
          './.temp/body.md',
        ]);
        const before = scene.getWrites().length;
        const set = scene.run(skill('git.pull.description.set'), [
          '--from',
          './.temp/body.md',
          '--mode',
          'apply',
        ]);
        return { set, writesNew: scene.getWrites().length - before };
      });
      then('it reports a no-op and writes naught', () => {
        expect(result.set.exitCode).toBe(0);
        expect(result.set.stdout).toContain('already there — no-op');
        expect(result.set.stdout).toMatchSnapshot();
        expect(result.writesNew).toBe(0);
        expect(countFooters(scene.getStore().prs['7']!.body)).toBe(1);
      });
    });
    when('[t3] get --output text, from the skill file direct', () => {
      const result = useThen('it runs', async () =>
        scene.run(skill('git.pull.description.get'), ['--output', 'text']),
      );
      then('it prints the bare body, no tree', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('## .limits');
        expect(result.stdout).not.toContain('heres the wave');
        expect(result.stdout).not.toContain('did you know');
        expect(result.stdout.endsWith(`${FOOTER}\n`)).toBe(true);
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t4] get --to names a path outside the repo', () => {
      const result = useThen('it runs', async () =>
        scene.run(skill('git.pull.description.get'), [
          '--to',
          '../outside-the-reef.md',
        ]),
      );
      then('it refuses before any gh call, exit 2, both streams', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          "--to must name a path inside this repo, got '../outside-the-reef.md'",
        );
        expect(result.stderr).toContain(
          '--to must name a path inside this repo',
        );
        expect(
          fs.existsSync(path.join(scene.tempDir, '..', 'outside-the-reef.md')),
        ).toBe(false);
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t5] get --to names a file git tracks', () => {
      const result = useThen('it runs', async () => {
        const tracked = path.join(scene.tempDir, 'reef-notes.md');
        fs.writeFileSync(tracked, 'the reef, as the human wrote it\n');
        spawnSync('git', ['add', 'reef-notes.md'], { cwd: scene.tempDir });
        const run = await scene.run(skill('git.pull.description.get'), [
          '--to',
          './reef-notes.md',
        ]);
        return { run, content: fs.readFileSync(tracked, 'utf-8') };
      });
      then('it refuses before any gh call, and the file is untouched', () => {
        expect(result.run.exitCode).toBe(2);
        expect(result.run.stdout).toContain(
          "--to names a file git tracks; get never overwrites one: './reef-notes.md'",
        );
        expect(result.run.stderr).toContain('--to names a file git tracks');
        expect(result.content).toBe('the reef, as the human wrote it\n');
        expect(result.run.stdout).toMatchSnapshot();
      });
    });
    when('[t6] get --to names a directory', () => {
      const result = useThen('it runs', async () => {
        const dir = path.join(scene.tempDir, 'tide-pools');
        fs.mkdirSync(dir, { recursive: true });
        const writesBefore = scene.getWrites().length;
        const run = await scene.run(skill('git.pull.description.get'), [
          '--to',
          './tide-pools',
        ]);
        return {
          run,
          isDir: fs.statSync(dir).isDirectory(),
          entries: fs.readdirSync(dir),
          writesNew: scene.getWrites().length - writesBefore,
        };
      });
      then('it refuses before any gh call, and writes no file', () => {
        expect(result.run.exitCode).toBe(2);
        expect(result.run.stdout).toContain(
          "--to names a directory, not a file: './tide-pools'",
        );
        expect(result.run.stderr).toContain('--to names a directory');
        expect(result.isDir).toBe(true);
        expect(result.entries).toEqual([]);
        expect(result.writesNew).toBe(0);
        expect(result.run.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case4] no pull to target', () => {
    when('[t0] the branch has no open pull', () => {
      const scene = genGitPullScene({
        ...PULL_SCENE_BARE,
        branch: 'surf/no-pull-here',
      });
      const result = useThen('it runs', async () =>
        scene.run(skill('git.pull.description.get'), []),
      );
      then(
        'it exits 2 and names git.commit.push, then --pr, as the fix',
        () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            "branch 'surf/no-pull-here' has no open pull",
          );
          expect(result.stdout).toContain('rhx git.commit.push --mode apply');
          expect(result.stdout).toContain('--pr <n>');
          expect(result.stdout).toMatchSnapshot();
        },
      );
    });
    when('[t1] --pr names a pull that does not exist', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('both verbs run', async () => ({
        get: scene.run(skill('git.pull.description.get'), ['--pr', '9999']),
        set: scene.run(
          skill('git.pull.description.set'),
          ['--pr', '9999', '--from', '@stdin', '--mode', 'apply'],
          { stdin: 'a body' },
        ),
      }));
      then('each exits 2, names the pull, and writes naught', () => {
        expect(result.get.exitCode).toBe(2);
        expect(result.set.exitCode).toBe(2);
        expect(result.get.stdout).toContain(
          'pull request ehmpathy/surf-demo#9999 is absent',
        );
        expect(result.set.stdout).toContain(
          'pull request ehmpathy/surf-demo#9999 is absent',
        );
        expect(result.set.stdout).toContain(
          'drop --pr to address the pull of this branch',
        );
        expect(scene.getWrites()).toHaveLength(0);
        expect(result.get.stdout).toMatchSnapshot();
        expect(result.set.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case5] the credential is unusable', () => {
    when('[t0] the keyrack holds no token', () => {
      const scene = genGitPullScene({ ...PULL_SCENE_BARE, token: null });
      const result = useThen('it runs', async () =>
        scene.run(
          skill('git.pull.description.set'),
          ['--from', '@stdin', '--mode', 'apply'],
          { stdin: 'a body' },
        ),
      );
      then('it exits 2, names the keyrack fix, and calls no gh', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('ehmpath keyrack token not available');
        expect(result.stdout).toContain('rhx keyrack');
        expect(result.stdout).toContain('--auth as-human');
        expect(scene.getCalls()).toHaveLength(0);
        expect(result.stderr).toContain('ConstraintError');
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t1] as-human, with gh logged out', () => {
      const scene = genGitPullScene({
        ...PULL_SCENE_BARE,
        store: { humanLoggedOut: true },
      });
      const result = useThen('it runs', async () =>
        scene.run(
          skill('git.pull.description.set'),
          ['--from', '@stdin', '--mode', 'apply', '--auth', 'as-human'],
          { stdin: 'a body' },
        ),
      );
      then('it exits 2, names gh auth login, and writes naught', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('gh auth login');
        expect(scene.getWrites()).toHaveLength(0);
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t3] as-human, with gh logged in, sets the human own pull', () => {
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
        scene.run(
          skill('git.pull.description.set'),
          ['--from', '@stdin', '--mode', 'apply', '--auth', 'as-human'],
          { stdin: 'kelp bed map, by tide' },
        ),
      );
      then('the body is set under the host gh login, read back', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('auth: as-human');
        expect(scene.getStore().prs['7']!.body).toBe(
          `kelp bed map, by tide\n\n---\n${FOOTER}`,
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case6] a peer pull, by number', () => {
    when('[t0] set --pr 8 applies', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run(
          skill('git.pull.description.set'),
          ['--pr', '8', '--from', '@stdin', '--mode', 'apply'],
          { stdin: `wave report sync, nightly\n\n${HARNESS_CLAUDE_LINE}` },
        ),
      );
      then('pull #8 is set and signed; pull #7 is untouched', () => {
        expect(result.exitCode).toBe(0);
        const store = scene.getStore();
        expect(store.prs['8']!.body).toBe(
          `wave report sync, nightly\n\n---\n${FOOTER}`,
        );
        expect(store.prs['7']!.body).toBe(
          `surf lesson booker\n\n---\n${FOOTER}`,
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t1] get and a plan, by number', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('both run', async () => ({
        get: scene.run(skill('git.pull.description.get'), ['--pr', '8']),
        plan: scene.run(
          skill('git.pull.description.set'),
          ['--pr', '8', '--from', '@stdin'],
          { stdin: 'wave report sync, nightly' },
        ),
      }));
      then('get names pull #8 and its body', () => {
        expect(result.get.exitCode).toBe(0);
        expect(result.get.stdout).toContain('target: ehmpathy/surf-demo#8');
        expect(result.get.stdout).toContain('wave report sync');
        expect(result.get.stdout).toMatchSnapshot();
      });
      then('the plan targets pull #8, writes naught, and hints --pr 8', () => {
        expect(result.plan.exitCode).toBe(0);
        expect(result.plan.stdout).toContain('target: ehmpathy/surf-demo#8');
        expect(result.plan.stdout).toContain('--pr 8');
        expect(scene.getWrites()).toHaveLength(0);
        expect(result.plan.stdout).toMatchSnapshot();
      });
    });
    when('[t2] get reads a pull whose body is empty', () => {
      const scene = genGitPullScene({
        ...PULL_SCENE_BARE,
        store: {
          prs: {
            '7': {
              title: 'feat(lessons): book a surf lesson',
              body: '',
              head: 'surf/book-lesson',
            },
          },
        },
      });
      const result = useThen('it runs', async () => ({
        tree: scene.run(skill('git.pull.description.get'), []),
        text: scene.run(skill('git.pull.description.get'), [
          '--output',
          'text',
        ]),
      }));
      then('the tree says the body is empty; text prints naught', () => {
        expect(result.tree.exitCode).toBe(0);
        expect(result.tree.stdout).toContain('(empty)');
        expect(result.tree.stdout).toMatchSnapshot();
        expect(result.text.exitCode).toBe(0);
        expect(result.text.stdout.trim()).toBe('');
      });
    });
  });

  given('[case7] a clean body, and a body with every marker', () => {
    when('[t0] a clean body is set', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run(
          skill('git.pull.description.set'),
          ['--pr', '8', '--from', '@stdin', '--mode', 'apply'],
          { stdin: 'tide chart for the reef' },
        ),
      );
      then('the footer is appended once', () => {
        expect(result.exitCode).toBe(0);
        expect(scene.getStore().prs['8']!.body).toBe(
          `tide chart for the reef\n\n---\n${FOOTER}`,
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when(
      '[t1] a body with the claude line, two trailers, and two footers',
      () => {
        const scene = genGitPullScene(PULL_SCENE_BARE);
        const result = useThen('it runs', async () =>
          scene.run(
            skill('git.pull.description.set'),
            ['--pr', '8', '--from', '@stdin', '--mode', 'apply'],
            {
              stdin: [
                'tide chart for the reef',
                '',
                '---',
                FOOTER,
                '',
                'Generated with Claude Code',
                'co-authored-by: Test Human <human@test.com>',
                'Co-Authored-By: Claude <noreply@anthropic.com>',
                '',
                '---',
                FOOTER,
              ].join('\n'),
            },
          ),
        );
        then('every marker goes, and one footer stands', () => {
          expect(result.exitCode).toBe(0);
          const live = scene.getStore().prs['8']!.body;
          expect(live).not.toMatch(/claude code/i);
          expect(live).not.toMatch(/co-authored-by/i);
          expect(live).toBe(`tide chart for the reef\n\n---\n${FOOTER}`);
          expect(live).toMatchSnapshot();
        });
      },
    );
  });

  given('[case8] refused before any gh call', () => {
    when('[t0] the body is empty', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run(
          skill('git.pull.description.set'),
          ['--from', '@stdin', '--mode', 'apply'],
          { stdin: '\n\n' },
        ),
      );
      then('it exits 2 and calls no gh', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('is empty');
        expect(scene.getCalls()).toHaveLength(0);
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t1] the body holds only attribution lines', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run(
          skill('git.pull.description.set'),
          ['--from', '@stdin', '--mode', 'apply'],
          { stdin: `${HARNESS_CLAUDE_LINE}\n\n---\n${FOOTER}` },
        ),
      );
      then('it exits 2 and calls no gh', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('holds no words');
        expect(scene.getCalls()).toHaveLength(0);
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t2] the body is over the 65536 cap once signed', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run(
          skill('git.pull.description.set'),
          ['--from', '@stdin', '--mode', 'apply'],
          { stdin: 'w'.repeat(65536) },
        ),
      );
      then('it exits 2 and calls no gh', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('github caps');
        expect(result.stdout).toContain('rhx git.pull.comment set --key');
        expect(result.stdout).not.toContain('two keyed comments');
        expect(scene.getCalls()).toHaveLength(0);
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t3] --from is absent', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run(skill('git.pull.description.set'), []),
      );
      then('it exits 2 and names --from', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('--from <path|@stdin> is required');
        expect(scene.getCalls()).toHaveLength(0);
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case9] the write reads back altered', () => {
    when('[t0] github holds a body other than the one sent', () => {
      const scene = genGitPullScene({
        ...PULL_SCENE_BARE,
        store: { rewrite: true },
      });
      const result = useThen('it runs', async () =>
        scene.run(
          skill('git.pull.description.set'),
          ['--from', '@stdin', '--mode', 'apply'],
          { stdin: 'a new body' },
        ),
      );
      then('it exits 1 as a malfunction, with both hashes', () => {
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('MalfunctionError');
        expect(result.stdout).toContain('read-back hash mismatch');
        expect(result.stdout).toContain('a second mismatch means github');
        expect(result.stdout).toMatchSnapshot();
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
        scene.run(
          skill('git.pull.description.set'),
          ['--from', '@stdin', '--mode', 'apply'],
          { stdin: 'a new body' },
        ),
      );
      then('it fails loud with the 403, and the body is untouched', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('✋ ConstraintError: github forbade');
        expect(result.stdout).toContain('HTTP 403');
        expect(result.stderr).toContain('HTTP 403');
        expect(scene.getStore().prs['7']!.body).toBe(
          'surf lesson booker\n\n---\n🐢🌊 surfed in by seaturtle[bot]',
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t2] the write answers 422: github refuses the body', () => {
      const scene = genGitPullScene({
        ...PULL_SCENE_BARE,
        store: {
          fail: 'gh: Validation Failed (HTTP 422)\nbody is too long (maximum is 65536 characters)',
          failMethod: 'PATCH',
        },
      });
      const result = useThen('it runs', async () =>
        scene.run(
          skill('git.pull.description.set'),
          ['--from', '@stdin', '--mode', 'apply'],
          { stdin: 'a new body' },
        ),
      );
      then('it exits 2, names the body, the detail, and the fix', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'github refused the body of ehmpathy/surf-demo#7',
        );
        expect(result.stdout).toContain('body is too long');
        expect(result.stdout).toContain('edit the body so github accepts it');
        expect(result.stderr).toContain('github refused the body');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case18] a body github holds with crlf line ends', () => {
    when('[t0] the same words are set back with lf line ends', () => {
      const scene = genGitPullScene({
        ...PULL_SCENE_BARE,
        store: {
          prs: {
            '7': {
              title: 'feat(lessons): book a surf lesson',
              body: 'surf lesson booker\r\n\r\n- adds the reef map\r\n\r\n---\r\n🐢🌊 surfed in by seaturtle[bot]',
              head: 'surf/book-lesson',
            },
          },
        },
      });
      const result = useThen('it runs', async () =>
        scene.run(
          skill('git.pull.description.set'),
          ['--from', '@stdin', '--mode', 'apply'],
          { stdin: 'surf lesson booker\n\n- adds the reef map\n' },
        ),
      );
      then('it reads as the same body: a no-op, no write', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('already there — no-op');
        expect(scene.getWrites()).toHaveLength(0);
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case19] a merged pull, by number', () => {
    when('[t0] set plans on a merged pull', () => {
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
      const result = useThen('it runs', async () =>
        scene.run(
          skill('git.pull.description.set'),
          ['--pr', '8', '--from', '@stdin'],
          { stdin: 'wave report sync, with the tide table' },
        ),
      );
      then('the plan names the state merged, not closed', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('state: merged');
        expect(result.stdout).not.toContain('state: closed');
        expect(scene.getWrites()).toHaveLength(0);
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] set applies on a merged pull', () => {
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
      const result = useThen('it runs', async () =>
        scene.run(
          skill('git.pull.description.set'),
          ['--pr', '8', '--from', '@stdin', '--mode', 'apply'],
          { stdin: 'wave report sync, with the tide table' },
        ),
      );
      then(
        'the write lands, as github allows, and the tree names merged',
        () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('state: merged');
          expect(result.stdout).toContain('set, read back, hash matches');
          expect(scene.getStore().prs['8']!.body).toContain(
            'with the tide table',
          );
          expect(scene.getWrites()).toHaveLength(1);
          expect(result.stdout).toMatchSnapshot();
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
      const result = useThen('get, plan, and apply run', async () => ({
        get: scene.run(skill('git.pull.description.get'), ['--pr', '8']),
        plan: scene.run(
          skill('git.pull.description.set'),
          ['--pr', '8', '--from', '@stdin'],
          { stdin: 'my words now' },
        ),
        apply: scene.run(
          skill('git.pull.description.set'),
          ['--pr', '8', '--from', '@stdin', '--mode', 'apply'],
          { stdin: 'my words now' },
        ),
      }));
      then('get reads it and names the author, before any set', () => {
        expect(result.get.exitCode).toBe(0);
        expect(result.get.stdout).toContain(
          `author: ${PULL_SCENE_LOGIN_FOREIGN}`,
        );
      });
      then('each exits 2, names the author, and writes naught', () => {
        expect(result.plan.exitCode).toBe(2);
        expect(result.apply.exitCode).toBe(2);
        expect(result.apply.stdout).toContain(
          `ehmpathy/surf-demo#8 was opened by ${PULL_SCENE_LOGIN_FOREIGN}`,
        );
        expect(result.apply.stdout).toContain(
          'cat ./.temp/body.md | rhx git.pull.description.set --pr 8 --from @stdin --mode plan --auth as-human',
        );
        expect(scene.getWrites()).toHaveLength(0);
        expect(scene.getStore().prs['8']!.body).toBe('wave report sync');
        expect(result.apply.stdout).toMatchSnapshot();
      });
    });
  });

  given(
    '[case13] the strip matches whole attribution lines, never prose',
    () => {
      when('[t0] a body mentions the claude phrase inside a sentence', () => {
        const scene = genGitPullScene(PULL_SCENE_BARE);
        const prose =
          'the repair replaces `Generated with Claude Code` lines with the footer';
        const result = useThen('it runs', async () =>
          scene.run(
            skill('git.pull.description.set'),
            ['--pr', '8', '--from', '@stdin', '--mode', 'apply'],
            {
              stdin: `## .what\n\n${prose}\n\na Co-authored-by: trailer leaks an email`,
            },
          ),
        );
        then(
          'the prose survives, word for word, and no strip is reported',
          () => {
            expect(result.exitCode).toBe(0);
            expect(scene.getStore().prs['8']!.body).toBe(
              `## .what\n\n${prose}\n\na Co-authored-by: trailer leaks an email\n\n---\n${FOOTER}`,
            );
            expect(result.stdout).not.toContain(
              'stripped the claude code line',
            );
            expect(result.stdout).toMatchSnapshot();
          },
        );
      });
      when('[t2] a code fence holds a run of blank lines', () => {
        const scene = genGitPullScene(PULL_SCENE_BARE);
        const fence = '```ts\nconst reef = 1;\n\n\nconst tide = 2;\n```';
        const result = useThen('it runs', async () =>
          scene.run(
            skill('git.pull.description.set'),
            ['--pr', '8', '--from', '@stdin', '--mode', 'apply'],
            { stdin: `tide chart\n\n${fence}\n\n${HARNESS_CLAUDE_LINE}` },
          ),
        );
        then(
          'the blank run is kept as written; only the claude line goes',
          () => {
            expect(result.exitCode).toBe(0);
            expect(scene.getStore().prs['8']!.body).toBe(
              `tide chart\n\n${fence}\n\n---\n${FOOTER}`,
            );
            expect(scene.getStore().prs['8']!.body).toMatchSnapshot();
          },
        );
      });
      when('[t1] a `---` rule sits above the harness claude line', () => {
        const scene = genGitPullScene(PULL_SCENE_BARE);
        const result = useThen('it runs', async () =>
          scene.run(
            skill('git.pull.description.set'),
            ['--pr', '8', '--from', '@stdin', '--mode', 'apply'],
            {
              stdin: `tide chart for the reef\n\n---\n\n${HARNESS_CLAUDE_LINE}`,
            },
          ),
        );
        then('the rule goes with the line: one rule, one footer', () => {
          expect(result.exitCode).toBe(0);
          expect(scene.getStore().prs['8']!.body).toBe(
            `tide chart for the reef\n\n---\n${FOOTER}`,
          );
          expect(result.stdout).toMatchSnapshot();
        });
      });
    },
  );

  given('[case14] the cap holds at its edge, footer included', () => {
    // github counts characters (code points); the footer counts toward the cap
    const SUFFIX_CHARS = [...`\n\n---\n${FOOTER}`].length;
    const BODY_AT_CAP = 'a'.repeat(65536 - SUFFIX_CHARS);
    when('[t0] the signed body lands at exactly 65536 characters', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run(
          skill('git.pull.description.set'),
          ['--pr', '8', '--from', '@stdin', '--mode', 'apply'],
          { stdin: BODY_AT_CAP },
        ),
      );
      then(
        'the set succeeds, and the stored body is exactly at the cap',
        () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('set, read back, hash matches');
          expect([...scene.getStore().prs['8']!.body].length).toBe(65536);
          expect(result.stdout).toMatchSnapshot();
        },
      );
    });
    when('[t1] the signed body lands one character over', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run(
          skill('git.pull.description.set'),
          ['--pr', '8', '--from', '@stdin', '--mode', 'apply'],
          { stdin: `${BODY_AT_CAP}a` },
        ),
      );
      then('it exits 2, names the count, and calls no gh', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'the body, with its seaturtle footer, holds 65537 characters',
        );
        expect(scene.getCalls()).toHaveLength(0);
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case15] the body comes from a file', () => {
    when('[t0] --from names a body file, and the set applies', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const bodyPath = scene.writeFile(
        'body.md',
        `reef map, by depth\n\n${HARNESS_CLAUDE_LINE}\n`,
      );
      const result = useThen('it runs', async () =>
        scene.run(skill('git.pull.description.set'), [
          '--pr',
          '8',
          '--from',
          bodyPath,
          '--mode',
          'apply',
        ]),
      );
      then('the file body lands, signed once, the claude line gone', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('from: ./body.md');
        expect(scene.getStore().prs['8']!.body).toBe(
          `reef map, by depth\n\n---\n${FOOTER}`,
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t1] --from names a file that is absent', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run(skill('git.pull.description.set'), [
          '--from',
          './absent.md',
          '--mode',
          'apply',
        ]),
      );
      then('it exits 2, names the path, and calls no gh', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain("--from './absent.md' is not a file");
        expect(scene.getCalls()).toHaveLength(0);
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case16] a closed pull, by number', () => {
    when('[t0] set --pr 8 applies to a closed pull', () => {
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
        scene.run(
          skill('git.pull.description.set'),
          ['--pr', '8', '--from', '@stdin', '--mode', 'apply'],
          { stdin: 'wave report sync, archived' },
        ),
      );
      then('the set works on any state, as github allows', () => {
        expect(result.exitCode).toBe(0);
        expect(scene.getStore().prs['8']!.body).toBe(
          `wave report sync, archived\n\n---\n${FOOTER}`,
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case10] the verbs dispatch as `git.pull.description <verb>`', () => {
    when('[t0] get, help, and an unknown verb run via the dispatcher', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('they run', async () => ({
        get: scene.run(skill('git.pull.description'), [
          'get',
          '--output',
          'json',
        ]),
        help: scene.run(skill('git.pull.description'), ['--help']),
        unknown: scene.run(skill('git.pull.description'), ['del']),
        setHelp: scene.run(skill('git.pull.description.set'), ['--help']),
        getTo: scene.run(skill('git.pull.description'), [
          'get',
          '--output',
          'json',
          '--to',
          './.temp/tide.md',
        ]),
      }));
      then(
        'get --output json --to names the file in `to`, and writes it',
        () => {
          expect(result.getTo.exitCode).toBe(0);
          const json = JSON.parse(result.getTo.stdout);
          expect(json.to).toBe('./.temp/tide.md');
          expect(
            fs.readFileSync(
              path.join(scene.tempDir, '.temp', 'tide.md'),
              'utf-8',
            ),
          ).toBe(`${json.body}\n`);
          expect(json).toMatchSnapshot();
        },
      );
      then('get returns the body as json', () => {
        expect(result.get.exitCode).toBe(0);
        const json = JSON.parse(result.get.stdout);
        expect(json.pr).toBe(7);
        expect(json.body).toContain('surf lesson booker');
        expect(json).toMatchSnapshot();
      });
      then('help names both verbs; set --help names its flags', () => {
        expect(result.help.exitCode).toBe(0);
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
    when('[t1] set applies with --output json', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run(
          skill('git.pull.description.set'),
          [
            '--pr',
            '8',
            '--from',
            '@stdin',
            '--mode',
            'apply',
            '--output',
            'json',
          ],
          { stdin: `tide chart for the reef\n\n${HARNESS_CLAUDE_LINE}` },
        ),
      );
      then(
        'stdout is one json object: verdict, repairs, and the three hashes',
        () => {
          expect(result.exitCode).toBe(0);
          const out = JSON.parse(result.stdout);
          expect(out.mode).toBe('apply');
          expect(out.pr).toBe(8);
          expect(out.repairs).toEqual(['stripped the claude code line']);
          expect(out.sha256.readback).toBe(out.sha256.new);
          expect(out.sha256.current).not.toBe(out.sha256.new);
          expect(out).toMatchSnapshot();
        },
      );
    });
  });
});
