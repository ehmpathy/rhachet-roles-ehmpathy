import { spawnSync } from 'child_process';

import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import * as fs from 'fs';
import { MalfunctionError } from 'helpful-errors';
import * as path from 'path';

import {
  PULL_SCENE_LOGIN_FOREIGN,
  PULL_SCENE_LOGIN_HUMAN,
  setGitPullStubInto,
} from '@src/.test/genGitPullScene';

import { genTestDir } from './.test/invokeHook';

/**
 * .what = acceptance tests for `rhx git.pull.title get|set` and
 *         `rhx git.pull.description get|set`, run via rhachet against the linked role
 * .why  = a caller reaches the verbs through rhachet, never by their file path; the
 *         manifest registration, the spaced dispatch, and stdin passage must hold
 *         on that road. the contract itself (plan, repair, round trip, ownership,
 *         refusals) is proven in the noun integration suites
 * .note = [case1] stops at --help or at an input refusal, before any gh call.
 *         [case2] walks the positive road (get, round trip, set, rerun) through
 *         rhachet against the stub gh of genGitPullScene, placed on PATH.
 *         [case3] walks the refusal critipaths; [case4] the own-branch absent
 *         pull, a peer pull set by number, and a merged pull.
 *         every journey runs under --auth as-human: the default as-ehmpath road
 *         reads its token through the linked repo's own rhachet keyrack, and a
 *         linked temp repo holds no rhachet bin, so that road fails on the absent
 *         bin (a tmp path in the cause), never on a keyrack state a test could
 *         pin. the keyrack refusals are proven at the integration grain, against
 *         the stub keyrack (git.pull case2)
 * .mock = [case2]'s gh is the PATH stub of genGitPullScene
 * .why  = a test job holds no github write scope; the stub lets the whole road run
 *         through the real rhachet dispatch on every ci run
 * .real = git.pull.real.integration.test.ts runs the same writes against github,
 *         opt-in, on a pull the runner names (fulcrum F7); never a gate
 */

/**
 * .what = run a verb the way a caller does: through rhachet, with an optional stdin
 */
const runViaRhachet = (input: {
  dir: string;
  skill: string;
  args: string[];
  stdin?: string;
  env?: NodeJS.ProcessEnv;
}): { stdout: string; stderr: string; code: number | null } => {
  // this repo's rhachet bin, the one npx walks up to from a linked temp repo; called
  // direct, since npx under a stub HOME (case2) hangs on its empty cache
  const result = spawnSync(
    path.join(__dirname, '..', 'node_modules', '.bin', 'rhachet'),
    ['run', '--skill', input.skill, ...input.args],
    {
      cwd: input.dir,
      env: input.env ?? process.env,
      input: input.stdin ?? '',
      encoding: 'utf-8', // node api param name
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60_000, // node api param name
    },
  );
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    code: result.status,
  };
};

/**
 * .what = what the caller sees, from the skill's first line on (a 🐢, ✋, or 💥
 *         header, or a help's usage line), color codes stripped
 * .why  = npx and rhachet may print before the skill; color codes vary by terminal
 */
const asSkillRender = (input: { stdout: string }): string => {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: strip ansi color codes
  const plain = input.stdout.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
  const at = plain.search(/🐢|✋|💥|^usage: /mu);
  return plain.slice(Math.max(0, at));
};

describe('git.pull.title and git.pull.description, via rhachet', () => {
  given('[case1] a repo with the mechanic role linked', () => {
    const scene = useBeforeAll(async () => ({
      dir: await genTestDir({ slug: 'git-pull-title-description-acceptance' }),
    }));

    when('[t0] each verb is asked for --help', () => {
      const result = useThen('they run', async () => ({
        titleGet: runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.title.get',
          args: ['--help'],
        }),
        titleSet: runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.title.set',
          args: ['--help'],
        }),
        descGet: runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.description.get',
          args: ['--help'],
        }),
        descSet: runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.description.set',
          args: ['--help'],
        }),
      }));
      then('each exits 0 and names its own usage', () => {
        expect(result.titleGet.code).toBe(0);
        expect(result.titleSet.code).toBe(0);
        expect(result.descGet.code).toBe(0);
        expect(result.descSet.code).toBe(0);
        expect(result.titleGet.stdout).toContain('usage: git.pull.title.get');
        expect(result.titleSet.stdout).toContain('usage: git.pull.title.set');
        expect(result.descGet.stdout).toContain(
          'usage: git.pull.description.get',
        );
        expect(result.descSet.stdout).toContain(
          'usage: git.pull.description.set',
        );
      });
      then('the description round trip goes through a file, never a redirect', () => {
        expect(result.descGet.stdout).toContain('--into <path>');
        expect(result.descGet.stdout).toContain(
          'rhx git.pull.description get --into ./.temp/body.md',
        );
        expect(result.descGet.stdout).not.toContain('--output text >');
      });
      then('each help is snapped', () => {
        expect({
          titleGet: asSkillRender(result.titleGet),
          titleSet: asSkillRender(result.titleSet),
          descGet: asSkillRender(result.descGet),
          descSet: asSkillRender(result.descSet),
        }).toMatchSnapshot();
      });
    });

    when('[t1] the dispatchers are called with a spaced verb, or none', () => {
      const result = useThen('they run', async () => ({
        titleSetHelp: runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.title',
          args: ['set', '--help'],
        }),
        descGetHelp: runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.description',
          args: ['get', '--help'],
        }),
        bare: runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.description',
          args: [],
        }),
      }));
      then('a known verb runs that verb', () => {
        expect(result.titleSetHelp.code).toBe(0);
        expect(result.titleSetHelp.stdout).toContain(
          'usage: git.pull.title.set',
        );
        expect(result.descGetHelp.code).toBe(0);
        expect(result.descGetHelp.stdout).toContain(
          'usage: git.pull.description.get',
        );
      });
      then('no verb refuses with exit 2 and names the verbs', () => {
        expect(result.bare.code).toBe(2);
        expect(result.bare.stdout).toContain('get | set');
        expect(asSkillRender(result.bare)).toMatchSnapshot();
      });
    });

    when('[t2] description set is piped a body of attribution lines alone', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.description.set',
          args: ['--pr', '7', '--from', '@stdin'],
          stdin:
            '🤖 Generated with [Claude Code](https://claude.com/claude-code)\n',
        }),
      );
      then('stdin reaches the verb: it is read, stripped, and refused as wordless', () => {
        expect(result.code).toBe(2);
        expect(result.stdout).toContain(
          'holds no words once its attribution lines are stripped',
        );
        expect(result.stdout).not.toContain('is empty');
        expect(result.stderr).toContain(
          "✋ ConstraintError: the body from '@stdin' holds no words once its attribution lines are stripped",
        );
        expect(asSkillRender(result)).toMatchSnapshot();
      });
    });

    when('[t3] description get --into names a path outside the repo', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.description.get',
          args: ['--pr', '7', '--into', '../outside-the-reef.md'],
        }),
      );
      then('it refuses with exit 2 and names the fix, on both streams', () => {
        expect(result.code).toBe(2);
        expect(result.stdout).toContain(
          "--into must name a path inside this repo, got '../outside-the-reef.md'",
        );
        expect(result.stderr).toContain(
          "✋ ConstraintError: --into must name a path inside this repo, got '../outside-the-reef.md'",
        );
        expect(asSkillRender(result)).toMatchSnapshot();
      });
    });

    when('[t4] a name #1035 or #996 struck is called', () => {
      const result = useThen('each runs', async () => ({
        runs: [
          'git.pr.body.set',
          'show.gh.pr.comments',
          'answer.gh.pr.comment',
        ].map((skill) => ({
          skill,
          run: runViaRhachet({ dir: scene.dir, skill, args: ['--help'] }),
        })),
      }));
      then('rhachet finds no such skill: none ships, not even as an alias', () => {
        expect(result.runs).toHaveLength(3);
        result.runs.forEach(({ skill, run }) => {
          expect(run.code).not.toBe(0);
          expect(run.stdout).not.toContain(`usage: ${skill}`);
        });
      });
      then('rhachet refuses each with exit 2 and names the absent skill', () => {
        // no snapshot: rhachet's list of available skills grows with every role skill
        result.runs.forEach(({ skill, run }) => {
          expect(run.code).toBe(2);
          expect(`${run.stdout}\n${run.stderr}`).toContain(
            `no skill "${skill}" found in any linked role`,
          );
        });
      });
    });
  });

  given('[case2] a linked repo on a branch whose pull the caller opened', () => {
    const scene = useBeforeAll(async () => {
      const dir = await genTestDir({
        slug: 'git-pull-title-description-journey',
      });
      const stub = setGitPullStubInto({
        dir,
        branch: 'surf/book-lesson',
        store: {
          prs: {
            '7': {
              title: 'feat(lessons): book a surf lesson',
              body: 'surf lesson booker\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)',
              head: 'surf/book-lesson',
              author: PULL_SCENE_LOGIN_HUMAN,
            },
          },
        },
      });
      return { dir, stub };
    });

    when('[t0] the driver walks get, edit, set, rerun, and a retitle', () => {
      const result = useThen('it runs', async () => {
        const run = (skill: string, args: string[]) =>
          runViaRhachet({
            dir: scene.dir,
            skill,
            args: [...args, '--auth', 'as-human'],
            env: scene.stub.env,
          });
        const titleGet = run('git.pull.title', ['get']);
        const descGet = run('git.pull.description', [
          'get',
          '--into',
          './.temp/body.md',
        ]);
        const bodyPath = path.join(scene.dir, '.temp', 'body.md');
        // a get that wrote no file fails loud with what the caller saw
        if (!fs.existsSync(bodyPath))
          throw new MalfunctionError('get --into wrote no file', {
            titleGet,
            descGet,
          });
        const fetched = fs.readFileSync(bodyPath, 'utf-8');
        fs.writeFileSync(bodyPath, `${fetched.trimEnd()}\n\n## .limits\n\nno night lessons\n`);
        const descPlan = run('git.pull.description', [
          'set',
          '--from',
          './.temp/body.md',
        ]);
        const writesAfterPlan = scene.stub.getWrites().length;
        const descApply = run('git.pull.description', [
          'set',
          '--from',
          './.temp/body.md',
          '--mode',
          'apply',
        ]);
        const descAgain = run('git.pull.description', [
          'set',
          '--from',
          './.temp/body.md',
          '--mode',
          'apply',
        ]);
        fs.writeFileSync(
          path.join(scene.dir, '.temp', 'title.md'),
          'feat(lessons): book a surf lesson, with limits\n',
        );
        const titleApply = run('git.pull.title', [
          'set',
          '--from',
          './.temp/title.md',
          '--mode',
          'apply',
        ]);
        return {
          titleGet,
          descGet,
          fetched,
          descPlan,
          writesAfterPlan,
          descApply,
          descAgain,
          titleApply,
          store: scene.stub.getStore(),
          writes: scene.stub.getWrites().length,
        };
      });
      then('get reads the title through rhachet', () => {
        expect(result.titleGet.code).toBe(0);
        expect(result.titleGet.stdout).toContain(
          'feat(lessons): book a surf lesson',
        );
      });
      then('get --into lands the bare body in the file', () => {
        expect(result.descGet.code).toBe(0);
        expect(result.fetched).toContain('surf lesson booker');
        expect(result.fetched).not.toContain('heres the wave');
      });
      then('the plan shows the repair and writes naught', () => {
        expect(result.descPlan.code).toBe(0);
        expect(result.descPlan.stdout).toContain('stripped the claude code line');
        expect(result.writesAfterPlan).toBe(0);
      });
      then('apply writes the signed body and reads it back', () => {
        expect(result.descApply.code).toBe(0);
        expect(result.descApply.stdout).toContain('set, read back, hash matches');
        const body = result.store.prs['7']!.body;
        expect(body).toContain('## .limits');
        expect(body).not.toContain('Generated with');
        expect(body.endsWith('🐢🌊 surfed in by seaturtle[bot]')).toBe(true);
      });
      then('a rerun is a no-op', () => {
        expect(result.descAgain.code).toBe(0);
        expect(result.descAgain.stdout).toContain('already there — no-op');
      });
      then('the retitle lands, and two writes were made in all', () => {
        expect(result.titleApply.code).toBe(0);
        expect(result.store.prs['7']!.title).toBe(
          'feat(lessons): book a surf lesson, with limits',
        );
        expect(result.writes).toBe(2);
      });
      then('each render is snapped', () => {
        expect({
          titleGet: asSkillRender(result.titleGet),
          descGet: asSkillRender(result.descGet),
          descPlan: asSkillRender(result.descPlan),
          descApply: asSkillRender(result.descApply),
          descAgain: asSkillRender(result.descAgain),
          titleApply: asSkillRender(result.titleApply),
        }).toMatchSnapshot();
      });
    });

    when('[t1] the driver asks for json, plans a retitle, and pipes the same title', () => {
      // its own scene, seeded with the state [t0] leaves, so [t1] runs alone
      const sceneOwn = useBeforeAll(async () => {
        const dir = await genTestDir({
          slug: 'git-pull-title-description-json',
        });
        const stub = setGitPullStubInto({
          dir,
          branch: 'surf/book-lesson',
          store: {
            prs: {
              '7': {
                title: 'feat(lessons): book a surf lesson, with limits',
                body: 'surf lesson booker\n\n## .limits\n\nno night lessons\n\n---\n🐢🌊 surfed in by seaturtle[bot]',
                head: 'surf/book-lesson',
                author: PULL_SCENE_LOGIN_HUMAN,
              },
            },
          },
        });
        return { dir, stub };
      });
      const result = useThen('it runs', async () => {
        const run = (skill: string, args: string[], stdin?: string) =>
          runViaRhachet({
            dir: sceneOwn.dir,
            skill,
            args: [...args, '--auth', 'as-human'],
            stdin,
            env: sceneOwn.stub.env,
          });
        const writesBefore = sceneOwn.stub.getWrites().length;
        const titleJson = run('git.pull.title', ['get', '--output', 'json']);
        const descJson = run('git.pull.description', ['get', '--output', 'json']);
        const titlePlan = run(
          'git.pull.title',
          ['set', '--from', '@stdin'],
          'feat(lessons): book a dawn patrol lesson\n',
        );
        const titleStdinNoop = run(
          'git.pull.title',
          ['set', '--from', '@stdin', '--mode', 'apply'],
          'feat(lessons): book a surf lesson, with limits\n',
        );
        return {
          titleJson,
          descJson,
          titlePlan,
          titleStdinNoop,
          writes: sceneOwn.stub.getWrites().length - writesBefore,
        };
      });
      then('json reaches the caller after rhx header lines, as the help warns', () => {
        expect(result.titleJson.code).toBe(0);
        const titleObject = JSON.parse(
          result.titleJson.stdout.slice(result.titleJson.stdout.indexOf('{')),
        );
        expect(titleObject.title).toBe(
          'feat(lessons): book a surf lesson, with limits',
        );
        expect(result.descJson.code).toBe(0);
        const descObject = JSON.parse(
          result.descJson.stdout.slice(result.descJson.stdout.indexOf('{')),
        );
        expect(descObject.body).toContain('## .limits');
      });
      then('a title plan writes naught, and a piped equal title is a no-op', () => {
        expect(result.titlePlan.code).toBe(0);
        expect(result.titlePlan.stdout).toContain('would set (plan)');
        expect(result.titleStdinNoop.code).toBe(0);
        expect(result.titleStdinNoop.stdout).toContain('already there — no-op');
        expect(result.writes).toBe(0);
      });
      then('each render is snapped; json with the rhx lines that precede it', () => {
        // biome-ignore lint/suspicious/noControlCharactersInRegex: strip ansi color codes
        const asPlain = (text: string) => text.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
        const titleStdout = asPlain(result.titleJson.stdout);
        const descStdout = asPlain(result.descJson.stdout);
        expect(
          JSON.parse(descStdout.slice(descStdout.indexOf('{'))).body,
        ).toContain('## .limits');
        expect({
          titleJsonStdout: titleStdout,
          descJsonStdout: descStdout,
          titlePlan: asSkillRender(result.titlePlan),
          titleStdinNoop: asSkillRender(result.titleStdinNoop),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case3] a linked repo where each refusal critipath is walked', () => {
    const scene = useBeforeAll(async () => {
      const dir = await genTestDir({
        slug: 'git-pull-title-description-refusals',
      });
      const stub = setGitPullStubInto({
        dir,
        branch: 'surf/book-lesson',
        store: {
          prs: {
            '7': {
              title: 'feat(lessons): book a surf lesson',
              body: 'surf lesson booker',
              head: 'surf/book-lesson',
              author: PULL_SCENE_LOGIN_HUMAN,
            },
            '8': {
              title: 'feat(reports): sync the wave report',
              body: 'wave report sync',
              head: 'surf/wave-report',
              author: PULL_SCENE_LOGIN_FOREIGN,
            },
          },
        },
      });
      return { dir, stub };
    });

    when('[t0] each refusal runs through rhachet, under --auth as-human', () => {
      const result = useThen('they run', async () => {
        const run = (skill: string, args: string[], stdin?: string) =>
          runViaRhachet({
            dir: scene.dir,
            skill,
            args: [...args, '--auth', 'as-human'],
            stdin,
            env: scene.stub.env,
          });
        const runs = {
          noPull: run('git.pull.title', ['get', '--pr', '99']),
          foreignAuthor: run('git.pull.description', [
            'set',
            '--pr',
            '8',
            '--from',
            '@stdin',
            '--mode',
            'apply',
          ], 'a body for a pull a reef ranger opened'),
          foreignOrg: run('git.pull.title', [
            'get',
            '--pr',
            '8',
            '--in',
            'seaturtlecorp/surf-demo',
          ]),
          titleEmpty: run(
            'git.pull.title',
            ['set', '--from', '@stdin', '--mode', 'apply'],
            '',
          ),
          titleMultiLine: run(
            'git.pull.title',
            ['set', '--from', '@stdin', '--mode', 'apply'],
            'feat(lessons): book\na surf lesson',
          ),
          // .note = composed at run time, so no secret-shaped literal sits in the source
          bodySecret: run(
            'git.pull.description',
            ['set', '--from', '@stdin', '--mode', 'apply'],
            `surf lesson booker\n\ndeploy key: gh${'p'}_${'k'.repeat(36)}\n`,
          ),
          bodyOverCap: run(
            'git.pull.description',
            ['set', '--from', '@stdin', '--mode', 'apply'],
            'w'.repeat(70000),
          ),
        };

        // flip the stub to a logged-out gh, for the one run that needs it
        const statePath = scene.stub.env.FAKE_GH_STATE!;
        const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
        fs.writeFileSync(statePath, JSON.stringify({ ...state, humanLoggedOut: true }));
        const loggedOut = run('git.pull.title', ['get']);
        return { runs: { ...runs, loggedOut }, writes: scene.stub.getWrites().length };
      });
      then('each exits 2 as a ConstraintError, on both streams', () => {
        Object.values(result.runs).forEach((run) => {
          expect(run.code).toBe(2);
          expect(run.stdout).toContain('✋ ConstraintError:');
          expect(run.stderr).toContain('ConstraintError');
        });
      });
      then('each names its own cause', () => {
        expect(result.runs.noPull.stdout).toContain('#99');
        expect(result.runs.foreignAuthor.stdout).toContain(
          `opened by ${PULL_SCENE_LOGIN_FOREIGN}`,
        );
        expect(result.runs.foreignOrg.stdout).toContain(
          "owner 'seaturtlecorp' is outside the home orgs",
        );
        expect(result.runs.titleEmpty.stdout).toContain(
          "the title from '@stdin' is empty",
        );
        expect(result.runs.titleMultiLine.stdout).toContain('newline');
        expect(result.runs.bodySecret.stdout).toContain(
          'shape: github token, line 3 (the value is not echoed)',
        );
        expect(result.runs.bodySecret.stdout).not.toContain(`gh${'p'}_`);
        expect(result.runs.bodyOverCap.stdout).toContain('65536');
        expect(result.runs.loggedOut.stdout).toContain('gh auth login');
      });
      then('no refusal writes to the pull', () => {
        expect(result.writes).toBe(0);
      });
      then('each refusal is snapped from the skill first line on', () => {
        expect(
          Object.fromEntries(
            Object.entries(result.runs).map(([name, run]) => [
              name,
              asSkillRender(run),
            ]),
          ),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case4] a linked repo on a fresh branch, beside peer pulls by number', () => {
    const scene = useBeforeAll(async () => {
      const dir = await genTestDir({
        slug: 'git-pull-title-description-by-number',
      });
      const stub = setGitPullStubInto({
        dir,
        branch: 'surf/no-pull-here',
        store: {
          prs: {
            '7': {
              title: 'feat(lessons): book a surf lesson',
              body: 'surf lesson booker',
              head: 'surf/book-lesson',
              author: PULL_SCENE_LOGIN_HUMAN,
            },
            '8': {
              title: 'feat(reports): sync the wave report',
              body: 'wave report sync',
              head: 'surf/wave-report',
              author: PULL_SCENE_LOGIN_HUMAN,
              merged: true,
            },
          },
        },
      });
      return { dir, stub };
    });

    when('[t0] the driver reads its own pull, then sets peer pulls by number', () => {
      const result = useThen('it runs', async () => {
        const run = (skill: string, args: string[], stdin?: string) =>
          runViaRhachet({
            dir: scene.dir,
            skill,
            args: [...args, '--auth', 'as-human'],
            stdin,
            env: scene.stub.env,
          });
        const ownAbsent = run('git.pull.title', ['get']);
        const peerSet = run(
          'git.pull.title',
          ['set', '--pr', '7', '--in', 'ehmpathy/surf-demo', '--from', '@stdin', '--mode', 'apply'],
          'feat(lessons): book a dawn patrol lesson\n',
        );
        const mergedSet = run(
          'git.pull.title',
          ['set', '--pr', '8', '--from', '@stdin', '--mode', 'apply'],
          'feat(reports): sync the wave report, hourly\n',
        );
        return {
          ownAbsent,
          peerSet,
          mergedSet,
          store: scene.stub.getStore(),
          writes: scene.stub.getWrites().length,
        };
      });
      then('no pull on the own branch refuses and teaches git.commit.push', () => {
        expect(result.ownAbsent.code).toBe(2);
        expect(result.ownAbsent.stdout).toContain(
          "branch 'surf/no-pull-here' has no open pull",
        );
        expect(result.ownAbsent.stdout).toContain('rhx git.commit.push --mode apply');
        expect(result.ownAbsent.stderr).toContain('ConstraintError');
      });
      then('a peer pull set by --pr and --in lands', () => {
        expect(result.peerSet.code).toBe(0);
        expect(result.peerSet.stdout).toContain('target: ehmpathy/surf-demo#7, title');
        expect(result.store.prs['7']!.title).toBe(
          'feat(lessons): book a dawn patrol lesson',
        );
      });
      then('a merged pull set by number lands, and the tree names merged', () => {
        expect(result.mergedSet.code).toBe(0);
        expect(result.mergedSet.stdout).toContain('state: merged');
        expect(result.store.prs['8']!.title).toBe(
          'feat(reports): sync the wave report, hourly',
        );
        expect(result.writes).toBe(2);
      });
      then('each render is snapped from the skill first line on', () => {
        expect({
          ownAbsent: asSkillRender(result.ownAbsent),
          peerSet: asSkillRender(result.peerSet),
          mergedSet: asSkillRender(result.mergedSet),
        }).toMatchSnapshot();
      });
    });

    when('[t1] the driver pipes a body with the claude line into a peer pull, then applies', () => {
      const result = useThen('it runs', async () => {
        const writesBefore = scene.stub.getWrites().length;
        const apply = runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.description',
          args: [
            'set',
            '--pr',
            '7',
            '--from',
            '@stdin',
            '--mode',
            'apply',
            '--auth',
            'as-human',
          ],
          stdin:
            'surf lesson booker, with dawn patrol\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n',
          env: scene.stub.env,
        });
        return {
          apply,
          body: scene.stub.getStore().prs['7']!.body,
          writes: scene.stub.getWrites().length - writesBefore,
        };
      });
      then('the stored body carries the seaturtle line, never the claude line', () => {
        expect(result.apply.code).toBe(0);
        expect(result.apply.stdout).toContain('stripped the claude code line');
        expect(result.body).toContain('surf lesson booker, with dawn patrol');
        expect(result.body).not.toContain('Generated with');
        expect(result.body.endsWith('🐢🌊 surfed in by seaturtle[bot]')).toBe(true);
        expect(result.writes).toBe(1);
        expect(asSkillRender(result.apply)).toMatchSnapshot();
      });
    });
  });

  given('[case5] a linked repo where github fails every read', () => {
    const scene = useBeforeAll(async () => {
      const dir = await genTestDir({
        slug: 'git-pull-title-description-read-fails',
      });
      const stub = setGitPullStubInto({
        dir,
        branch: 'surf/book-lesson',
        store: {
          prs: {
            '7': {
              title: 'feat(lessons): book a surf lesson',
              body: 'surf lesson booker',
              head: 'surf/book-lesson',
              author: PULL_SCENE_LOGIN_HUMAN,
            },
          },
          fail: 'gh: Bad Gateway (HTTP 502)',
          failMethod: 'GET',
        },
      });
      return { dir, stub };
    });

    when('[t0] title get runs through rhachet', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.title',
          args: ['get', '--pr', '7', '--auth', 'as-human'],
          env: scene.stub.env,
        }),
      );
      then('it fails loud as a MalfunctionError, exit 1, on both streams, no write', () => {
        expect(result.code).toBe(1);
        expect(result.stdout).toContain('💥 MalfunctionError:');
        expect(result.stderr).toContain('💥 MalfunctionError:');
        expect(result.stdout).toContain('HTTP 502');
        expect(scene.stub.getWrites()).toHaveLength(0);
        expect(asSkillRender(result)).toMatchSnapshot();
      });
    });
  });
});
