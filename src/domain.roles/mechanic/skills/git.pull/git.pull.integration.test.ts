import * as fs from 'fs';
import * as path from 'path';
import { given, then, useThen, when } from 'test-fns';

import { genGitPullScene, PULL_SCENE_BARE } from '@src/.test/genGitPullScene';

/**
 * .what = integration tests across the git.pull.* family: title and description
 * .why  = the four verbs share one ops file (git.pull.operations.sh); a refusal
 *         that lives there must read alike from each verb, so it is proven here,
 *         once, rather than in either noun's suite
 *
 * .mock = gh and the keyrack are stubs (see genGitPullScene for the why)
 */
describe('git.pull', () => {
  const skill = (noun: string, verb: string) =>
    path.join(
      __dirname,
      '..',
      `git.pull.${noun}`,
      `git.pull.${noun}.${verb}.sh`,
    );

  // .what = run each of the four verbs, with the args each needs to reach the pull lookup
  const runFourVerbs = (
    scene: ReturnType<typeof genGitPullScene>,
    argsShared: string[],
  ) => ({
    titleGet: scene.run(skill('title', 'get'), argsShared),
    titleSet: scene.run(skill('title', 'set'), [
      '--title',
      'feat(reef): map the kelp beds',
      '--mode',
      'apply',
      ...argsShared,
    ]),
    descriptionGet: scene.run(skill('description', 'get'), argsShared),
    descriptionSet: scene.run(
      skill('description', 'set'),
      ['--from', '@stdin', '--mode', 'apply', ...argsShared],
      { stdin: 'kelp bed map, by tide' },
    ),
  });

  given('[case1] the branch has no open pull', () => {
    when('[t0] each of the four verbs runs', () => {
      const scene = genGitPullScene({
        ...PULL_SCENE_BARE,
        branch: 'surf/no-pull-here',
      });
      const result = useThen('they run', async () => ({
        verbs: runFourVerbs(scene, []),
      }));
      then('each exits 2, names the branch and the fix, writes naught', () => {
        Object.values(result.verbs).forEach((run) => {
          expect(run.exitCode).toBe(2);
          expect(run.stdout).toContain(
            "branch 'surf/no-pull-here' has no open pull",
          );
          expect(run.stdout).toContain('rhx git.commit.push --mode apply');
        });
        expect(scene.getWrites()).toHaveLength(0);
        expect(result.verbs.titleSet.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case2] the credential is unusable', () => {
    when('[t0] the keyrack holds no token', () => {
      const scene = genGitPullScene({ ...PULL_SCENE_BARE, token: null });
      const result = useThen('they run', async () => ({
        verbs: runFourVerbs(scene, []),
      }));
      then('each exits 2, names the keyrack fix, and calls no gh', () => {
        Object.values(result.verbs).forEach((run) => {
          expect(run.exitCode).toBe(2);
          expect(run.stdout).toContain('ehmpath keyrack token not available');
        });
        expect(scene.getCalls()).toHaveLength(0);
        expect(result.verbs.titleGet.stdout).toMatchSnapshot();
      });
    });
    when('[t1] as-human, with gh logged out', () => {
      const scene = genGitPullScene({
        ...PULL_SCENE_BARE,
        store: { humanLoggedOut: true },
      });
      const result = useThen('they run', async () => ({
        verbs: runFourVerbs(scene, ['--auth', 'as-human']),
      }));
      then('each exits 2, names gh auth login, and writes naught', () => {
        Object.values(result.verbs).forEach((run) => {
          expect(run.exitCode).toBe(2);
          expect(run.stdout).toContain('gh auth login');
        });
        expect(scene.getWrites()).toHaveLength(0);
        expect(result.verbs.titleGet.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case4] --in names the repo', () => {
    when('[t0] --in names the home-org repo, with --pr 8', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('both sets run', async () => ({
        title: scene.run(skill('title', 'set'), [
          '--in',
          'ehmpathy/surf-demo',
          '--pr',
          '8',
          '--title',
          'feat(reports): sync the wave report, via --in',
          '--mode',
          'apply',
        ]),
        description: scene.run(
          skill('description', 'set'),
          [
            '--in',
            'ehmpathy/surf-demo',
            '--pr',
            '8',
            '--from',
            '@stdin',
            '--mode',
            'apply',
          ],
          { stdin: 'wave report sync, via --in' },
        ),
      }));
      then('each lands on pull #8 of the named repo', () => {
        expect(result.title.exitCode).toBe(0);
        expect(result.description.exitCode).toBe(0);
        expect(result.title.stdout).toContain('target: ehmpathy/surf-demo#8');
        const pr = scene.getStore().prs['8']!;
        expect(pr.title).toBe('feat(reports): sync the wave report, via --in');
        expect(pr.body.startsWith('wave report sync, via --in')).toBe(true);
        expect(
          scene
            .getWrites()
            .every((call) =>
              call.argv.includes('repos/ehmpathy/surf-demo/pulls/8'),
            ),
        ).toBe(true);
        expect(result.title.stdout).toMatchSnapshot();
        expect(result.description.stdout).toMatchSnapshot();
      });
    });
    when('[t1] --in names an owner outside the home orgs', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('the four verbs run', async () => ({
        verbs: runFourVerbs(scene, ['--in', 'seaturtlecorp/reef', '--pr', '8']),
      }));
      then('each exits 2 at the fence and calls no gh', () => {
        Object.values(result.verbs).forEach((run) => {
          expect(run.exitCode).toBe(2);
          expect(run.stdout).toContain(
            "owner 'seaturtlecorp' is outside the home orgs",
          );
        });
        expect(scene.getCalls()).toHaveLength(0);
        expect(result.verbs.titleSet.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case5] the dispatcher routes set, as it routes get', () => {
    when('[t0] `git.pull.<noun> set` runs, with its value flags', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const dispatcher = (noun: string) =>
        path.join(__dirname, '..', `git.pull.${noun}`, `git.pull.${noun}.sh`);
      const result = useThen('both sets run via the dispatcher', async () => ({
        title: scene.run(dispatcher('title'), [
          'set',
          '--pr',
          '8',
          '--title',
          'feat(reports): sync the wave report, dispatched',
          '--mode',
          'apply',
        ]),
        description: scene.run(
          dispatcher('description'),
          ['set', '--pr', '8', '--from', '@stdin', '--mode', 'apply'],
          { stdin: 'wave report sync, dispatched' },
        ),
      }));
      then('each write lands, as the dotted form would', () => {
        expect(result.title.exitCode).toBe(0);
        expect(result.description.exitCode).toBe(0);
        const pr = scene.getStore().prs['8']!;
        expect(pr.title).toBe(
          'feat(reports): sync the wave report, dispatched',
        );
        expect(pr.body.startsWith('wave report sync, dispatched')).toBe(true);
        expect(result.title.stdout).toContain('set, read back, matches');
        expect(result.title.stdout).toMatchSnapshot();
        expect(result.description.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case6] the less-trod contract paths of each noun', () => {
    const dispatcher = (noun: string) =>
      path.join(__dirname, '..', `git.pull.${noun}`, `git.pull.${noun}.sh`);
    when('[t0] each set plans with --output json', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('both plans run', async () => ({
        title: scene.run(skill('title', 'set'), [
          '--pr',
          '8',
          '--title',
          'feat(reports): sync the wave report, planned',
          '--output',
          'json',
        ]),
        description: scene.run(
          skill('description', 'set'),
          ['--pr', '8', '--from', '@stdin', '--output', 'json'],
          { stdin: 'wave report sync, planned' },
        ),
      }));
      then('each is one json object: plan, would set, no read-back', () => {
        const title = JSON.parse(result.title.stdout);
        expect(title.mode).toBe('plan');
        expect(title.verdict).toBe('would set (plan)');
        expect(title.title.readback).toBeNull();
        const description = JSON.parse(result.description.stdout);
        expect(description.mode).toBe('plan');
        expect(description.verdict).toBe('would set (plan)');
        expect(description.sha256.readback).toBeNull();
        expect(scene.getWrites()).toHaveLength(0);
        expect(title).toMatchSnapshot();
        expect(description).toMatchSnapshot();
      });
    });
    when('[t1] each get names the repo via --in', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('both gets run', async () => ({
        title: scene.run(skill('title', 'get'), [
          '--in',
          'ehmpathy/surf-demo',
          '--pr',
          '8',
        ]),
        description: scene.run(skill('description', 'get'), [
          '--in',
          'ehmpathy/surf-demo',
          '--pr',
          '8',
        ]),
      }));
      then('each reads pull #8 of the named repo', () => {
        expect(result.title.exitCode).toBe(0);
        expect(result.title.stdout).toContain(
          'target: ehmpathy/surf-demo#8, title',
        );
        expect(result.title.stdout).toContain(
          'url: https://github.com/ehmpathy/surf-demo/pull/8',
        );
        expect(result.description.exitCode).toBe(0);
        expect(result.description.stdout).toContain(
          'target: ehmpathy/surf-demo#8, description',
        );
        expect(result.title.stdout).toMatchSnapshot();
      });
    });
    when('[t2] each dispatcher runs with no verb', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('both run', async () => ({
        title: scene.run(dispatcher('title'), []),
        description: scene.run(dispatcher('description'), []),
      }));
      then('each exits 2 and names the verbs', () => {
        [result.title, result.description].forEach((run) => {
          expect(run.exitCode).toBe(2);
          expect(run.stdout).toContain('a verb is required');
        });
        expect(scene.getCalls()).toHaveLength(0);
        expect(result.title.stdout).toMatchSnapshot();
      });
    });
    when('[t3] each get and each noun shows its --help', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('each help runs', async () => ({
        titleGet: scene.run(skill('title', 'get'), ['--help']),
        descriptionGet: scene.run(skill('description', 'get'), ['--help']),
        titleNoun: scene.run(dispatcher('title'), ['--help']),
        descriptionNoun: scene.run(dispatcher('description'), ['--help']),
      }));
      then('each get help names every flag', () => {
        [result.titleGet, result.descriptionGet].forEach((run) => {
          expect(run.exitCode).toBe(0);
          [
            '--pr',
            '--in',
            '--auth',
            '--output tree|json|text',
            '--help',
          ].forEach((flag) => expect(run.stdout).toContain(flag));
        });
        expect(result.titleGet.stdout).toMatchSnapshot();
        expect(result.descriptionGet.stdout).toMatchSnapshot();
      });
      then('each noun help names both verbs', () => {
        expect(result.titleNoun.stdout).toContain('get | set');
        expect(result.descriptionNoun.stdout).toContain('get | set');
        expect(result.titleNoun.stdout).toMatchSnapshot();
        expect(result.descriptionNoun.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case7] a no-op set, as json', () => {
    when('[t0] the description set already reads so', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run(
          skill('description', 'set'),
          ['--from', '@stdin', '--mode', 'apply', '--output', 'json'],
          {
            stdin:
              'surf lesson booker\n\n---\n🐢🌊 surfed in by seaturtle[bot]',
          },
        ),
      );
      then('the json reports no repairs, as the tree does', () => {
        expect(result.exitCode).toBe(0);
        const out = JSON.parse(result.stdout);
        expect(out.verdict).toBe('already there — no-op');
        expect(out.repairs).toEqual([]);
        expect(scene.getWrites()).toHaveLength(0);
      });
    });
  });

  given('[case3] a get under --output text is refused', () => {
    when('[t0] each get runs on a branch with no open pull', () => {
      const scene = genGitPullScene({
        ...PULL_SCENE_BARE,
        branch: 'surf/no-pull-here',
      });
      const result = useThen('they run', async () => ({
        title: scene.run(skill('title', 'get'), ['--output', 'text']),
        description: scene.run(skill('description', 'get'), [
          '--output',
          'text',
        ]),
      }));
      then('each exits 2, so a pipe can tell a refusal from a field', () => {
        expect(result.title.exitCode).toBe(2);
        expect(result.description.exitCode).toBe(2);
      });
      then('the refusal reads on both streams, with its class and fix', () => {
        [result.title, result.description].forEach((run) => {
          expect(run.stdout).toContain('✋ ConstraintError:');
          expect(run.stderr).toContain('✋ ConstraintError:');
          expect(run.stdout).toContain(
            "branch 'surf/no-pull-here' has no open pull",
          );
        });
        expect(result.title.stdout).toMatchSnapshot();
        expect(result.description.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case9] a write verb that skips the ownership guard', () => {
    when(
      '[t0] the shared writer is called with no check_pull_by_self pass',
      () => {
        const scene = genGitPullScene(PULL_SCENE_BARE);
        const result = useThen('it runs', async () => {
          const entry = path.join(scene.tempDir, 'unguarded-write.sh');
          fs.writeFileSync(
            entry,
            [
              'set -euo pipefail',
              `source ${JSON.stringify(path.join(__dirname, 'git.pull.operations.sh'))}`,
              'COMMENT_REPO=ehmpathy/surf-demo',
              'COMMENT_PR=7',
              "printf 'kelp' > ./value.txt",
              "set_one_gh_pull_field title 7 ./value.txt 'shorten it'",
            ].join('\n'),
          );
          const run = scene.run(entry, []);
          return { run, writes: scene.getWrites().length };
        });
        then(
          'it fails loud as a malfunction and never reaches the PATCH',
          () => {
            expect(result.run.exitCode).toBe(1);
            expect(result.run.stdout).toContain('💥 MalfunctionError:');
            expect(result.run.stdout).toContain(
              'no ownership pass for ehmpathy/surf-demo#7',
            );
            expect(result.writes).toBe(0);
          },
        );
      },
    );
  });
});
