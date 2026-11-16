import { spawnSync } from 'child_process';
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
    titleSet: scene.run(
      skill('title', 'set'),
      ['--from', '@stdin', '--mode', 'apply', ...argsShared],
      { stdin: 'feat(reef): map the kelp beds' },
    ),
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
      });
      then(
        'each verb names itself in its fix, so each render is snapped',
        () => {
          expect(result.verbs.titleGet.stdout).toContain(
            'rhx git.pull.title.get --which <n>',
          );
          expect(result.verbs.descriptionSet.stdout).toContain(
            'rhx git.pull.description.set --which <n>',
          );
          expect({
            titleGet: result.verbs.titleGet.stdout,
            titleSet: result.verbs.titleSet.stdout,
            descriptionGet: result.verbs.descriptionGet.stdout,
            descriptionSet: result.verbs.descriptionSet.stdout,
          }).toMatchSnapshot();
        },
      );
    });
    when('[t1] each of the four verbs runs under --output json', () => {
      const scene = genGitPullScene({
        ...PULL_SCENE_BARE,
        branch: 'surf/no-pull-here',
      });
      const result = useThen('they run', async () => ({
        verbs: runFourVerbs(scene, ['--output', 'json']),
      }));
      then(
        'each exits 2 with one json refusal on stdout and the tree on stderr',
        () => {
          Object.values(result.verbs).forEach((run) => {
            expect(run.exitCode).toBe(2);
            const refusal = JSON.parse(run.stdout);
            expect(refusal.error.class).toBe('ConstraintError');
            expect(refusal.error.message).toContain(
              "branch 'surf/no-pull-here' has no open pull",
            );
            expect(run.stderr).toContain('✋ ConstraintError:');
          });
          expect(scene.getWrites()).toHaveLength(0);
          expect({
            titleGet: JSON.parse(result.verbs.titleGet.stdout),
            titleSet: JSON.parse(result.verbs.titleSet.stdout),
            descriptionGet: JSON.parse(result.verbs.descriptionGet.stdout),
            descriptionSet: JSON.parse(result.verbs.descriptionSet.stdout),
          }).toMatchSnapshot();
        },
      );
    });
  });

  given('[case1b] each verb refuses bad input before any gh call', () => {
    const CASES: { description: string; args: string[]; words: string }[] = [
      {
        description: 'an unknown arg',
        args: ['--reef'],
        words: "unknown arg '--reef'",
      },
      {
        description: 'a flag with no value',
        args: ['--which'],
        words: '--which needs a value',
      },
      {
        description: 'a non-numeric --which',
        args: ['--which', 'seven'],
        words: "--which must be a pull request number, got 'seven'",
      },
      {
        description: 'a bad --auth',
        args: ['--auth', 'as-robot'],
        words: '--auth must be',
      },
      {
        description: 'a bad --output',
        args: ['--output', 'yaml'],
        words: '--output must be',
      },
    ];
    CASES.forEach((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}`, () => {
        const scene = genGitPullScene(PULL_SCENE_BARE);
        const result = useThen('they run', async () => ({
          verbs: runFourVerbs(scene, thisCase.args),
          calls: scene.getCalls().length,
        }));
        then(
          'each exits 2, names the input, on both streams, no gh call',
          () => {
            Object.values(result.verbs).forEach((run) => {
              expect(run.exitCode).toBe(2);
              expect(run.stdout).toContain('✋ ConstraintError:');
              expect(run.stdout).toContain(thisCase.words);
              expect(run.stderr).toContain('ConstraintError');
            });
            expect(result.calls).toBe(0);
            expect({
              titleGet: result.verbs.titleGet.stdout,
              titleSet: result.verbs.titleSet.stdout,
              descriptionGet: result.verbs.descriptionGet.stdout,
              descriptionSet: result.verbs.descriptionSet.stdout,
            }).toMatchSnapshot();
          },
        );
      }),
    );
    when('[t5] --output text on a set verb (text is a get output)', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('they run', async () => {
        const verbs = runFourVerbs(scene, ['--output', 'text']);
        return {
          titleSet: verbs.titleSet,
          descriptionSet: verbs.descriptionSet,
        };
      });
      then('each set exits 2 and names tree or json', () => {
        [result.titleSet, result.descriptionSet].forEach((run) => {
          expect(run.exitCode).toBe(2);
          expect(run.stdout).toContain(
            "--output must be tree or json, got 'text'",
          );
        });
        expect({
          titleSet: result.titleSet.stdout,
          descriptionSet: result.descriptionSet.stdout,
        }).toMatchSnapshot();
      });
    });
    when('[t6] the cwd is on a detached HEAD, with no --which', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('they run', async () => {
        spawnSync('git', ['commit', '--allow-empty', '-m', 'tide'], {
          cwd: scene.tempDir,
        });
        spawnSync('git', ['checkout', '--detach'], { cwd: scene.tempDir });
        return { verbs: runFourVerbs(scene, []) };
      });
      then('each exits 2 and names the detached HEAD', () => {
        Object.values(result.verbs).forEach((run) => {
          expect(run.exitCode).toBe(2);
          expect(run.stdout).toContain('detached HEAD');
        });
        expect(scene.getWrites()).toHaveLength(0);
        expect({
          titleGet: result.verbs.titleGet.stdout,
          titleSet: result.verbs.titleSet.stdout,
          descriptionGet: result.verbs.descriptionGet.stdout,
          descriptionSet: result.verbs.descriptionSet.stdout,
        }).toMatchSnapshot();
      });
    });
    when('[t7] the branch has two open pulls, with no --which', () => {
      const scene = genGitPullScene({
        ...PULL_SCENE_BARE,
        store: {
          prs: {
            '7': {
              title: 'feat(lessons): book a surf lesson',
              body: 'surf lesson booker',
              head: 'surf/book-lesson',
            },
            '9': {
              title: 'feat(lessons): book a reef tour',
              body: 'reef tour booker',
              head: 'surf/book-lesson',
            },
          },
        },
      });
      const result = useThen('they run', async () => ({
        verbs: runFourVerbs(scene, []),
      }));
      then('each exits 2, lists both pulls, and writes naught', () => {
        Object.values(result.verbs).forEach((run) => {
          expect(run.exitCode).toBe(2);
          expect(run.stdout).toContain('has 2 open pulls');
          expect(run.stdout).toContain('7, 9');
        });
        expect(scene.getWrites()).toHaveLength(0);
        expect({
          titleGet: result.verbs.titleGet.stdout,
          titleSet: result.verbs.titleSet.stdout,
          descriptionGet: result.verbs.descriptionGet.stdout,
          descriptionSet: result.verbs.descriptionSet.stdout,
        }).toMatchSnapshot();
      });
    });
    when('[t8] title set names --from as its last arg, with no value', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run(skill('title', 'set'), ['--mode', 'plan', '--from']),
      );
      then('it exits 2 and names the absent value, no gh call', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('--from needs a value');
        expect(scene.getCalls()).toHaveLength(0);
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t9] each verb takes its flags in the --flag=value form', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('they run', async () => {
        fs.mkdirSync(path.join(scene.tempDir, '.temp'), { recursive: true });
        fs.writeFileSync(
          path.join(scene.tempDir, '.temp', 'kelp.md'),
          'kelp bed map, by tide\n',
        );
        fs.writeFileSync(
          path.join(scene.tempDir, '.temp', 'title.md'),
          'feat(reef): map the kelp beds\n',
        );
        return {
          titleGet: scene.run(skill('title', 'get'), [
            '--which=7',
            '--output=json',
          ]),
          titleSet: scene.run(skill('title', 'set'), [
            '--which=7',
            '--from=./.temp/title.md',
            '--mode=plan',
          ]),
          descriptionGet: scene.run(skill('description', 'get'), [
            '--which=7',
            '--output=json',
          ]),
          descriptionSet: scene.run(skill('description', 'set'), [
            '--which=7',
            '--from=./.temp/kelp.md',
            '--mode=plan',
          ]),
        };
      });
      then(
        'each parses the = form as the spaced form, and writes naught',
        () => {
          expect(result.titleGet.exitCode).toBe(0);
          expect(JSON.parse(result.titleGet.stdout).pr).toBe(7);
          expect(result.titleSet.exitCode).toBe(0);
          expect(result.titleSet.stdout).toContain(
            'new: feat(reef): map the kelp beds',
          );
          expect(result.titleSet.stdout).toContain('would set (plan)');
          expect(result.descriptionGet.exitCode).toBe(0);
          expect(JSON.parse(result.descriptionGet.stdout).pr).toBe(7);
          expect(result.descriptionSet.exitCode).toBe(0);
          expect(result.descriptionSet.stdout).toContain(
            'from: ./.temp/kelp.md',
          );
          expect(result.descriptionSet.stdout).toContain('would set (plan)');
          expect(scene.getWrites()).toHaveLength(0);
          expect({
            titleSet: result.titleSet.stdout,
            descriptionSet: result.descriptionSet.stdout,
          }).toMatchSnapshot();
        },
      );
    });
  });

  given('[case2c] github fails a read', () => {
    when('[t0] every GET answers a server error (HTTP 502)', () => {
      const scene = genGitPullScene({
        ...PULL_SCENE_BARE,
        store: {
          fail: 'gh: Bad Gateway (HTTP 502)',
          failMethod: 'GET',
        },
      });
      const result = useThen('they run', async () => ({
        verbs: runFourVerbs(scene, []),
      }));
      then(
        'each fails loud as a MalfunctionError, exit 1, and writes naught',
        () => {
          Object.values(result.verbs).forEach((run) => {
            expect(run.exitCode).toBe(1);
            expect(run.stdout).toContain('💥 MalfunctionError:');
            expect(run.stdout).toContain('HTTP 502');
            expect(run.stderr).toContain('MalfunctionError');
          });
          expect(scene.getWrites()).toHaveLength(0);
          expect({
            titleGet: result.verbs.titleGet.stdout,
            titleSet: result.verbs.titleSet.stdout,
            descriptionGet: result.verbs.descriptionGet.stdout,
            descriptionSet: result.verbs.descriptionSet.stdout,
          }).toMatchSnapshot();
        },
      );
    });
    when('[t1] every GET answers bad credentials (HTTP 401)', () => {
      const scene = genGitPullScene({
        ...PULL_SCENE_BARE,
        store: {
          fail: 'gh: Bad credentials (HTTP 401)',
          failMethod: 'GET',
        },
      });
      const result = useThen('they run', async () => ({
        verbs: runFourVerbs(scene, []),
      }));
      then(
        'each refuses as a ConstraintError, exit 2, and names the token fix',
        () => {
          Object.values(result.verbs).forEach((run) => {
            expect(run.exitCode).toBe(2);
            expect(run.stdout).toContain(
              '✋ ConstraintError: github refused the credential',
            );
            expect(run.stdout).toContain('rhx keyrack fill');
          });
          expect(scene.getWrites()).toHaveLength(0);
          expect({
            titleGet: result.verbs.titleGet.stdout,
            titleSet: result.verbs.titleSet.stdout,
            descriptionGet: result.verbs.descriptionGet.stdout,
            descriptionSet: result.verbs.descriptionSet.stdout,
          }).toMatchSnapshot();
        },
      );
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
    when('[t0b] the keyrack holds no token, under --output json', () => {
      const scene = genGitPullScene({ ...PULL_SCENE_BARE, token: null });
      const result = useThen('they run', async () => ({
        verbs: runFourVerbs(scene, ['--output', 'json']),
      }));
      then('each prints one json refusal, exit 2, and calls no gh', () => {
        Object.values(result.verbs).forEach((run) => {
          expect(run.exitCode).toBe(2);
          const out = JSON.parse(run.stdout);
          expect(out.error.class).toBe('ConstraintError');
          expect(out.error.message).toContain(
            'ehmpath keyrack token not available',
          );
        });
        expect(scene.getCalls()).toHaveLength(0);
        expect({
          titleSet: JSON.parse(result.verbs.titleSet.stdout),
          descriptionGet: JSON.parse(result.verbs.descriptionGet.stdout),
        }).toMatchSnapshot();
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
    when('[t0] --in names the home-org repo, with --which 8', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('both sets run', async () => ({
        title: scene.run(
          skill('title', 'set'),
          [
            '--in',
            'ehmpathy/surf-demo',
            '--which',
            '8',
            '--from',
            '@stdin',
            '--mode',
            'apply',
          ],
          { stdin: 'feat(reports): sync the wave report, via --in' },
        ),
        description: scene.run(
          skill('description', 'set'),
          [
            '--in',
            'ehmpathy/surf-demo',
            '--which',
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
        verbs: runFourVerbs(scene, [
          '--in',
          'seaturtlecorp/reef',
          '--which',
          '8',
        ]),
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
    when(
      '[t2] --in names an owner outside the home orgs, under --output json',
      () => {
        const scene = genGitPullScene(PULL_SCENE_BARE);
        const result = useThen('the four verbs run', async () => ({
          verbs: runFourVerbs(scene, [
            '--in',
            'seaturtlecorp/reef',
            '--which',
            '8',
            '--output',
            'json',
          ]),
        }));
        then(
          'each exits 2 at the fence with one json refusal, and calls no gh',
          () => {
            Object.values(result.verbs).forEach((run) => {
              expect(run.exitCode).toBe(2);
              const refusal = JSON.parse(run.stdout);
              expect(refusal.error.class).toBe('ConstraintError');
              expect(refusal.error.message).toContain(
                "owner 'seaturtlecorp' is outside the home orgs",
              );
              expect(run.stderr).toContain('✋ ConstraintError:');
            });
            expect(scene.getCalls()).toHaveLength(0);
            expect({
              titleGet: JSON.parse(result.verbs.titleGet.stdout),
              titleSet: JSON.parse(result.verbs.titleSet.stdout),
              descriptionGet: JSON.parse(result.verbs.descriptionGet.stdout),
              descriptionSet: JSON.parse(result.verbs.descriptionSet.stdout),
            }).toMatchSnapshot();
          },
        );
      },
    );
  });

  given('[case5] the dispatcher routes set, as it routes get', () => {
    when('[t0] `git.pull.<noun> set` runs, with its value flags', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const dispatcher = (noun: string) =>
        path.join(__dirname, '..', `git.pull.${noun}`, `git.pull.${noun}.sh`);
      const result = useThen('both sets run via the dispatcher', async () => ({
        title: scene.run(
          dispatcher('title'),
          ['set', '--which', '8', '--from', '@stdin', '--mode', 'apply'],
          { stdin: 'feat(reports): sync the wave report, dispatched' },
        ),
        description: scene.run(
          dispatcher('description'),
          ['set', '--which', '8', '--from', '@stdin', '--mode', 'apply'],
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
        title: scene.run(
          skill('title', 'set'),
          ['--which', '8', '--from', '@stdin', '--output', 'json'],
          { stdin: 'feat(reports): sync the wave report, planned' },
        ),
        description: scene.run(
          skill('description', 'set'),
          ['--which', '8', '--from', '@stdin', '--output', 'json'],
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
          '--which',
          '8',
        ]),
        description: scene.run(skill('description', 'get'), [
          '--in',
          'ehmpathy/surf-demo',
          '--which',
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
            '--which',
            '--in',
            '--auth',
            '--output tree|json|text',
            '--into <path>',
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
        expect(out).toMatchSnapshot();
      });
    });
    when('[t1] the title set already reads so', () => {
      const scene = genGitPullScene(PULL_SCENE_BARE);
      const result = useThen('it runs', async () => ({
        set: scene.run(
          skill('title', 'set'),
          ['--from', '@stdin', '--mode', 'apply', '--output', 'json'],
          { stdin: scene.getStore().prs['7']!.title },
        ),
        writes: scene.getWrites().length,
      }));
      then('the json reports the no-op, with no read-back', () => {
        expect(result.set.exitCode).toBe(0);
        const out = JSON.parse(result.set.stdout);
        expect(out.verdict).toBe('already there — no-op');
        expect(out.title.readback).toBeNull();
        expect(result.writes).toBe(0);
        expect(out).toMatchSnapshot();
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
