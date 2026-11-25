import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import {
  asStableOutput,
  type CatchupScene,
  genCatchupScene,
  getHeadFacts,
  isMergeInFlight,
  moveMain,
  readMeterUses,
  runCatchup,
  runGit,
  setCommitMsgHookToReject,
  writeMeter,
} from './.test/genCatchupScene';

/**
 * .what = a scene whose catch-up merge stopped on two conflicted files
 */
const genConflictScene = (input: { slug: string }): CatchupScene => {
  const scene = genCatchupScene({
    slug: input.slug,
    base: { 'src/a.md': 'a: base\n', 'src/b.md': 'b: base\n' },
    ahead: { 'src/a.md': 'a: branch\n', 'src/b.md': 'b: branch\n' },
  });
  moveMain({
    scene,
    files: { 'src/a.md': 'a: main\n', 'src/b.md': 'b: main\n' },
    message: 'feat(src): edit a and b',
  });
  const begin = runCatchup({ scene, args: ['begin', '--mode', 'apply'] });
  expect(begin.exitCode).toBe(2);
  return scene;
};

/**
 * .what = settle one conflicted file by hand, then stage it
 */
const settleFile = (input: {
  scene: CatchupScene;
  file: string;
  content: string;
}): void => {
  fs.writeFileSync(path.join(input.scene.workDir, input.file), input.content);
  runGit({ cwd: input.scene.workDir, args: ['add', input.file] });
};

/**
 * .what = drop the sponsor bind, and point git config at a clone, so no
 *         human answers for the commit
 */
const removeSponsor = (input: { scene: CatchupScene }): void => {
  fs.rmSync(
    path.join(input.scene.workDir, '.meter', 'git.commit.sponsor.jsonc'),
  );
  runGit({
    cwd: input.scene.workDir,
    args: ['config', 'user.name', 'seaturtle[bot]'],
  });
  runGit({
    cwd: input.scene.workDir,
    args: ['config', 'user.email', 'seaturtle@ehmpath.com'],
  });
};

/**
 * .what = integration tests for `git.branch.catchup continue`
 * .why = proves the conflict path finishes through the same commit step as a
 *        clean begin, and that a refused gate never loses settled work
 */
describe('git.branch.catchup continue', () => {
  given('[case2] a merge in flight with two conflicted files', () => {
    const scene = useBeforeAll(async () =>
      genConflictScene({ slug: 'catchup-continue-case2' }),
    );

    when('[t1] one file settled + staged, the other not; continue', () => {
      const result = useBeforeAll(async () => {
        settleFile({ scene, file: 'src/a.md', content: 'a: main + branch\n' });
        return runCatchup({ scene, args: ['continue'] });
      });

      then('exits 2 and names only the file still in conflict', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: 1 file still in conflict',
        );
        expect(result.stdout).toContain('src/b.md');
        expect(result.stdout).not.toContain('src/a.md');
      });

      then(
        'names how to settle, stage, and continue, each a paste-ready command',
        () => {
          expect(result.stdout).toContain(
            'settle each file:  rhx git.stage.add <file>',
          );
          expect(result.stdout).toContain(
            'then:              rhx git.branch.catchup continue',
          );
        },
      );

      then('the merge stays in flight; meter unchanged', () => {
        expect(isMergeInFlight({ scene })).toBe(true);
        expect(readMeterUses({ scene })).toBe(4);
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] every file settled and staged, then continue', () => {
      const result = useBeforeAll(async () => {
        settleFile({ scene, file: 'src/b.md', content: 'b: main + branch\n' });
        const run = runCatchup({ scene, args: ['continue'] });
        return { run, head: getHeadFacts({ scene }) };
      });

      then('exits 0', () => {
        expect(result.run.exitCode).toBe(0);
      });

      then(
        'HEAD is a 2-parent seaturtle commit with the sponsor trailer',
        () => {
          expect(result.head.parents).toBe(2);
          expect(result.head.author).toBe(
            'seaturtle[bot] <seaturtle@ehmpath.com>',
          );
          expect(result.head.message).toMatch(
            /Co-authored-by: Test Human <human@test\.com>$/,
          );
        },
      );

      then('the commit holds the settled content', () => {
        expect(
          fs.readFileSync(path.join(scene.workDir, 'src/a.md'), 'utf-8'),
        ).toBe('a: main + branch\n');
        expect(
          fs.readFileSync(path.join(scene.workDir, 'src/b.md'), 'utf-8'),
        ).toBe('b: main + branch\n');
        expect(
          runGit({ cwd: scene.workDir, args: ['status', '--porcelain'] }),
        ).toBe('');
      });

      then('meter uses decremented by exactly 1; no merge in flight', () => {
        expect(readMeterUses({ scene })).toBe(3);
        expect(isMergeInFlight({ scene })).toBe(false);
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.run.stdout)).toMatchSnapshot();
      });
    });
  });

  given(
    '[case31] a settled merge in flight, and the meter ran dry since begin',
    () => {
      const scene = useBeforeAll(async () => {
        const scene = genConflictScene({ slug: 'catchup-continue-case31' });
        settleFile({ scene, file: 'src/a.md', content: 'a: settled\n' });
        settleFile({ scene, file: 'src/b.md', content: 'b: settled\n' });
        writeMeter({ scene, uses: 0 });
        return scene;
      });

      when('[t0] continue', () => {
        const result = useBeforeAll(async () =>
          runCatchup({ scene, args: ['continue'] }),
        );

        then('exits 2 with no commit uses left, on both streams', () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            '✋ ConstraintError: no commit uses left',
          );
          expect(result.stderr).toContain(
            '✋ ConstraintError: no commit uses left',
          );
        });

        then('matches snapshot', () => {
          expect(asStableOutput(result.stdout)).toMatchSnapshot();
        });

        then('the merge stays in flight, so no settled work is lost', () => {
          expect(isMergeInFlight({ scene })).toBe(true);
          expect(
            runGit({
              cwd: scene.workDir,
              args: ['diff', '--cached', '--name-only'],
            }),
          ).toContain('src/a.md');
        });
      });

      when('[t1] a human grants more, then continue', () => {
        const result = useBeforeAll(async () => {
          writeMeter({ scene, uses: 2 });
          return runCatchup({ scene, args: ['continue'] });
        });

        then('the merge commit lands; meter −1', () => {
          expect(result.exitCode).toBe(0);
          expect(getHeadFacts({ scene }).parents).toBe(2);
          expect(readMeterUses({ scene })).toBe(1);
        });
      });
    },
  );

  given(
    '[case32] a settled merge in flight, and a commit-msg hook that refuses',
    () => {
      const scene = useBeforeAll(async () => {
        const scene = genConflictScene({ slug: 'catchup-continue-case32' });
        settleFile({ scene, file: 'src/a.md', content: 'a: settled\n' });
        settleFile({ scene, file: 'src/b.md', content: 'b: settled\n' });
        setCommitMsgHookToReject({ scene });
        return scene;
      });

      when('[t0] continue', () => {
        const result = useBeforeAll(async () => {
          const headBefore = getHeadFacts({ scene }).sha;
          const run = runCatchup({ scene, args: ['continue'] });
          return { run, headBefore };
        });

        then(
          'exits 1 with a MalfunctionError and the hook cause, on both streams',
          () => {
            expect(result.run.exitCode).toBe(1);
            for (const stream of [result.run.stdout, result.run.stderr]) {
              expect(stream).toContain(
                '💥 MalfunctionError: git commit failed; the merge stays in flight',
              );
              expect(stream).toContain('commitlint: the header was refused');
            }
          },
        );

        then('each line of the cause is its own tree leaf', () => {
          expect(result.run.stdout).toContain(
            '   │  ├─ commitlint: the header was refused\n   │  └─ commitlint: see the commit convention\n',
          );
        });

        then(
          'names fix-the-cause-then-continue, and abort, as the next moves',
          () => {
            expect(result.run.stdout).toContain(
              '├─ fix the cause above\n      ├─ then:              rhx git.branch.catchup continue',
            );
            expect(result.run.stdout).toContain(
              'rhx git.branch.catchup continue',
            );
            expect(result.run.stdout).toContain('rhx git.branch.catchup abort');
          },
        );

        then(
          'no commit; meter unchanged; the merge and its settlements stay',
          () => {
            expect(getHeadFacts({ scene }).sha).toBe(result.headBefore);
            expect(readMeterUses({ scene })).toBe(4);
            expect(isMergeInFlight({ scene })).toBe(true);
            expect(
              runGit({
                cwd: scene.workDir,
                args: ['diff', '--cached', '--name-only'],
              }),
            ).toContain('src/a.md');
          },
        );

        then('matches snapshot', () => {
          expect(asStableOutput(result.run.stdout)).toMatchSnapshot();
        });
      });

      when('[t1] the hook is fixed, then continue', () => {
        const result = useBeforeAll(async () => {
          runGit({
            cwd: scene.workDir,
            args: ['config', '--unset', 'core.hooksPath'],
          });
          return runCatchup({ scene, args: ['continue'] });
        });

        then('the merge commit lands; meter −1', () => {
          expect(result.exitCode).toBe(0);
          expect(getHeadFacts({ scene }).parents).toBe(2);
          expect(readMeterUses({ scene })).toBe(3);
        });
      });
    },
  );

  given('[case33] an unsettled merge in flight, and the meter ran dry', () => {
    const scene = useBeforeAll(async () => {
      const scene = genConflictScene({ slug: 'catchup-continue-case33' });
      writeMeter({ scene, uses: 0 });
      return scene;
    });

    when('[t0] continue', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['continue'] }),
      );

      then('the unsettled refusal speaks first', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('2 files still in conflict');
        expect(result.stdout).not.toContain('no commit uses left');
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case33b] an unsettled merge in flight, and no sponsor', () => {
    const scene = useBeforeAll(async () => {
      const scene = genConflictScene({ slug: 'catchup-continue-case33b' });
      removeSponsor({ scene });
      return scene;
    });

    when('[t0] continue', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['continue'] }),
      );

      then('the unsettled refusal speaks first, not the sponsor gate', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('2 files still in conflict');
        expect(result.stdout).not.toContain('no sponsor for this commit');
        expect(isMergeInFlight({ scene })).toBe(true);
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given(
    '[case33c] an unsettled merge in flight, and a human set the global blocker',
    () => {
      const scene = useBeforeAll(async () => {
        const scene = genConflictScene({ slug: 'catchup-continue-case33c' });
        const globalMeterDir = path.join(
          scene.homeDir,
          '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
        );
        fs.mkdirSync(globalMeterDir, { recursive: true });
        fs.writeFileSync(
          path.join(globalMeterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ blocked: true }),
        );
        return scene;
      });

      when('[t0] continue', () => {
        const result = useBeforeAll(async () =>
          runCatchup({ scene, args: ['continue'] }),
        );

        then('the unsettled refusal speaks first, not the blocker', () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('2 files still in conflict');
          expect(result.stdout).not.toContain('commits blocked globally');
          expect(isMergeInFlight({ scene })).toBe(true);
        });

        then('matches snapshot', () => {
          expect(asStableOutput(result.stdout)).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case34] a settled merge in flight, a corrupt quota, and no sponsor',
    () => {
      const scene = useBeforeAll(async () => {
        const scene = genConflictScene({ slug: 'catchup-continue-case34' });
        settleFile({ scene, file: 'src/a.md', content: 'a: settled\n' });
        settleFile({ scene, file: 'src/b.md', content: 'b: settled\n' });
        fs.writeFileSync(
          path.join(scene.workDir, '.meter', 'git.commit.uses.jsonc'),
          '{ not json',
        );
        removeSponsor({ scene });
        return scene;
      });

      when('[t0] continue', () => {
        const result = useBeforeAll(async () =>
          runCatchup({ scene, args: ['continue'] }),
        );

        then(
          'the quota read speaks before the sponsor, as in begin: exit 1',
          () => {
            expect(result.exitCode).toBe(1);
            expect(result.stdout).toContain('commit quota file corrupt');
            expect(result.stderr).toContain('commit quota file corrupt');
            expect(result.stdout).not.toContain('no sponsor for this commit');
          },
        );

        then('the merge stays in flight', () => {
          expect(isMergeInFlight({ scene })).toBe(true);
        });

        then('matches snapshot', () => {
          expect(asStableOutput(result.stdout)).toMatchSnapshot();
        });
      });
    },
  );

  given('[case35] a settled merge in flight, and no sponsor', () => {
    const scene = useBeforeAll(async () => {
      const scene = genConflictScene({ slug: 'catchup-continue-case35' });
      settleFile({ scene, file: 'src/a.md', content: 'a: settled\n' });
      settleFile({ scene, file: 'src/b.md', content: 'b: settled\n' });
      removeSponsor({ scene });
      return scene;
    });

    when('[t0] continue', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['continue'] }),
      );

      then('exits 2: no sponsor; merge in flight; meter unchanged', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('no sponsor for this commit');
        expect(result.stderr).toContain('no sponsor for this commit');
        expect(isMergeInFlight({ scene })).toBe(true);
        expect(readMeterUses({ scene })).toBe(4);
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given(
    '[case36] a settled merge in flight, and a human blocked the org',
    () => {
      const scene = useBeforeAll(async () => {
        const scene = genConflictScene({ slug: 'catchup-continue-case36' });
        settleFile({ scene, file: 'src/a.md', content: 'a: settled\n' });
        settleFile({ scene, file: 'src/b.md', content: 'b: settled\n' });
        fs.writeFileSync(
          path.join(
            scene.homeDir,
            '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter/git.commit.uses.org.jsonc',
          ),
          JSON.stringify({ orgs: { ehmpathy: 'blocked' } }),
        );
        return scene;
      });

      when('[t0] continue', () => {
        const result = useBeforeAll(async () =>
          runCatchup({ scene, args: ['continue'] }),
        );

        then('exits 2, names the human lift; merge in flight', () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('commits blocked for org ehmpathy');
          expect(result.stderr).toContain('git.commit.uses allow --org <org>');
          expect(isMergeInFlight({ scene })).toBe(true);
          expect(readMeterUses({ scene })).toBe(4);
        });

        then('matches snapshot', () => {
          expect(asStableOutput(result.stdout)).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case37] a merge in flight where one staged file still holds markers',
    () => {
      const scene = useBeforeAll(async () => {
        const scene = genConflictScene({ slug: 'catchup-continue-case37' });
        settleFile({ scene, file: 'src/a.md', content: 'a: settled\n' });
        settleFile({
          scene,
          file: 'src/b.md',
          content:
            '<<<<<<< HEAD\nb: branch\n=======\nb: main\n>>>>>>> origin/main\n',
        });
        return scene;
      });

      when('[t0] continue', () => {
        const result = useBeforeAll(async () => {
          const headBefore = getHeadFacts({ scene }).sha;
          const run = runCatchup({ scene, args: ['continue'] });
          return { run, headBefore };
        });

        then('exits 2 and names only the marked file, on both streams', () => {
          expect(result.run.exitCode).toBe(2);
          for (const stream of [result.run.stdout, result.run.stderr]) {
            expect(stream).toContain(
              '✋ ConstraintError: 1 file staged with conflict markers',
            );
            expect(stream).toContain('src/b.md');
          }
          expect(result.run.stdout).not.toContain('src/a.md');
        });

        then('no commit; meter unchanged; merge in flight', () => {
          expect(getHeadFacts({ scene }).sha).toBe(result.headBefore);
          expect(readMeterUses({ scene })).toBe(4);
          expect(isMergeInFlight({ scene })).toBe(true);
        });

        then('matches snapshot', () => {
          expect(asStableOutput(result.run.stdout)).toMatchSnapshot();
        });
      });
    },
  );

  given('[case38] a hand merge of another branch in flight', () => {
    const scene = useBeforeAll(async () => {
      const scene = genCatchupScene({ slug: 'catchup-continue-case38' });
      runGit({
        cwd: scene.workDir,
        args: ['checkout', '-q', '-b', 'turtle/other', 'main'],
      });
      fs.writeFileSync(path.join(scene.workDir, 'docs.md'), 'other\n');
      runGit({ cwd: scene.workDir, args: ['add', 'docs.md'] });
      runGit({
        cwd: scene.workDir,
        args: ['commit', '-q', '-m', 'feat(docs): other'],
      });
      runGit({ cwd: scene.workDir, args: ['checkout', '-q', scene.branch] });
      runGit({
        cwd: scene.workDir,
        args: ['merge', '--no-ff', '--no-commit', 'turtle/other'],
      });
      return scene;
    });

    when('[t0] continue', () => {
      const result = useBeforeAll(async () => {
        const headBefore = getHeadFacts({ scene }).sha;
        const run = runCatchup({ scene, args: ['continue'] });
        return { run, headBefore };
      });

      then('exits 2: the merge is not a catch-up; names abort', () => {
        expect(result.run.exitCode).toBe(2);
        expect(result.run.stdout).toContain(
          '✋ ConstraintError: the merge in flight is not a catch-up from origin/main',
        );
        expect(result.run.stderr).toContain('not a catch-up');
        expect(result.run.stdout).toContain('rhx git.branch.catchup abort');
      });

      then('no commit; meter unchanged; merge in flight', () => {
        expect(getHeadFacts({ scene }).sha).toBe(result.headBefore);
        expect(readMeterUses({ scene })).toBe(4);
        expect(isMergeInFlight({ scene })).toBe(true);
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.run.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case39] a settled merge in flight, and push is blocked', () => {
    const scene = useBeforeAll(async () => {
      const scene = genConflictScene({ slug: 'catchup-continue-case39' });
      settleFile({ scene, file: 'src/a.md', content: 'a: settled\n' });
      settleFile({ scene, file: 'src/b.md', content: 'b: settled\n' });
      writeMeter({ scene, uses: 4, push: 'block' });
      return scene;
    });

    when('[t0] continue', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['continue'] }),
      );

      then('commits, then names the push grant, not a push', () => {
        expect(result.exitCode).toBe(0);
        expect(getHeadFacts({ scene }).parents).toBe(2);
        expect(result.stdout).toContain(
          'committed; the push needs a human grant',
        );
        expect(result.stdout).not.toContain('ready to push');
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case40] a conflicted merge in flight, and stage is blocked', () => {
    const scene = useBeforeAll(async () => {
      const scene = genConflictScene({ slug: 'catchup-continue-case40' });
      writeMeter({ scene, uses: 4, stage: 'block' });
      return scene;
    });

    when('[t0] continue', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['continue'] }),
      );

      then('names the stage grant, never a git.stage.add it cannot run', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('a human grants stage first');
        expect(result.stdout).toContain('--stage allow');
        expect(result.stdout).not.toContain('rhx git.stage.add <file>');
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given(
    '[case41] main adds, clean, a doc whose lines look like markers',
    () => {
      const scene = useBeforeAll(async () => {
        const scene = genCatchupScene({
          slug: 'catchup-continue-case41',
          base: { 'src/a.md': 'a: base\n' },
          ahead: { 'src/a.md': 'a: branch\n' },
        });
        moveMain({
          scene,
          files: {
            'src/a.md': 'a: main\n',
            'docs/howto.md':
              '# how to settle a conflict\n\n<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> main\n',
          },
          message: 'feat(docs): edit a, add the conflict howto',
        });
        const begin = runCatchup({ scene, args: ['begin', '--mode', 'apply'] });
        expect(begin.exitCode).toBe(2);
        settleFile({ scene, file: 'src/a.md', content: 'a: settled\n' });
        return scene;
      });

      when('[t0] continue', () => {
        const result = useBeforeAll(async () =>
          runCatchup({ scene, args: ['continue'] }),
        );

        then('commits: only the files the merge stopped on are checked', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).not.toContain('conflict markers');
          expect(getHeadFacts({ scene }).parents).toBe(2);
          expect(readMeterUses({ scene })).toBe(3);
        });

        then('matches snapshot', () => {
          expect(asStableOutput(result.stdout)).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case43] core.commentChar is ";", and a staged file still holds markers',
    () => {
      const scene = useBeforeAll(async () => {
        const scene = genCatchupScene({
          slug: 'catchup-continue-case43',
          base: { 'src/a.md': 'a: base\n' },
          ahead: { 'src/a.md': 'a: branch\n' },
        });
        runGit({
          cwd: scene.workDir,
          args: ['config', 'core.commentChar', ';'],
        });
        moveMain({
          scene,
          files: { 'src/a.md': 'a: main\n' },
          message: 'feat(src): edit a',
        });
        const begin = runCatchup({ scene, args: ['begin', '--mode', 'apply'] });
        expect(begin.exitCode).toBe(2);
        settleFile({
          scene,
          file: 'src/a.md',
          content:
            '<<<<<<< HEAD\na: branch\n=======\na: main\n>>>>>>> origin/main\n',
        });
        return scene;
      });

      when('[t0] continue', () => {
        const result = useBeforeAll(async () => {
          const headBefore = getHeadFacts({ scene }).sha;
          const run = runCatchup({ scene, args: ['continue'] });
          return { run, headBefore };
        });

        then(
          'exits 2 and names the marked file, as with the default char',
          () => {
            expect(result.run.exitCode).toBe(2);
            expect(result.run.stdout).toContain(
              '✋ ConstraintError: 1 file staged with conflict markers',
            );
            expect(result.run.stdout).toContain('src/a.md');
          },
        );

        then('matches snapshot', () => {
          expect(asStableOutput(result.run.stdout)).toMatchSnapshot();
        });

        then('no commit; meter unchanged', () => {
          expect(getHeadFacts({ scene }).sha).toBe(result.headBefore);
          expect(readMeterUses({ scene })).toBe(4);
        });
      });
    },
  );

  given('[case42] a merge of origin/main in flight on main itself', () => {
    const scene = useBeforeAll(async () => {
      const scene = genCatchupScene({ slug: 'catchup-continue-case42' });
      moveMain({
        scene,
        files: { 'docs/a.md': 'a\n' },
        message: 'feat(docs): add a',
      });
      runGit({ cwd: scene.workDir, args: ['fetch', '-q', 'origin'] });
      runGit({ cwd: scene.workDir, args: ['checkout', '-q', 'main'] });
      runGit({
        cwd: scene.workDir,
        args: ['merge', '--no-ff', '--no-commit', 'origin/main'],
      });
      return scene;
    });

    when('[t0] continue', () => {
      const result = useBeforeAll(async () => {
        const headBefore = getHeadFacts({ scene }).sha;
        const run = runCatchup({ scene, args: ['continue'] });
        return { run, headBefore };
      });

      then('exits 2: will not catch up main, on both streams', () => {
        expect(result.run.exitCode).toBe(2);
        for (const stream of [result.run.stdout, result.run.stderr]) {
          expect(stream).toContain(
            '✋ ConstraintError: will not catch up main',
          );
        }
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.run.stdout)).toMatchSnapshot();
      });

      then('no commit on main; meter unchanged', () => {
        expect(getHeadFacts({ scene }).sha).toBe(result.headBefore);
        expect(readMeterUses({ scene })).toBe(4);
      });
    });
  });

  given('[case44] main deleted a file the branch changed', () => {
    const scene = useBeforeAll(async () => {
      const scene = genCatchupScene({
        slug: 'catchup-continue-case44',
        base: { 'src/tide.md': 'tide: base\n' },
        ahead: { 'src/tide.md': 'tide: branch\n' },
      });
      runGit({
        cwd: scene.upstreamDir,
        args: ['pull', '-q', 'origin', 'main'],
      });
      runGit({ cwd: scene.upstreamDir, args: ['rm', '-q', 'src/tide.md'] });
      runGit({
        cwd: scene.upstreamDir,
        args: ['commit', '-q', '-m', 'feat(src): drop tide'],
      });
      runGit({
        cwd: scene.upstreamDir,
        args: ['push', '-q', 'origin', 'main'],
      });
      return scene;
    });

    when('[t0] begin --mode apply', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['begin', '--mode', 'apply'] }),
      );

      then('exits 2 and labels the file as deleted on main', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'src/tide.md (deleted on main, changed on the branch)',
        );
      });

      then('names the take as the settle for a deleted file', () => {
        expect(result.stdout).toContain(
          'a deleted file holds no markers; settle it with take',
        );
      });

      then(
        'shows no hand-settle move: the one conflict holds no markers',
        () => {
          expect(result.stdout).not.toContain('remove the <<<<<<<');
          expect(result.stdout).not.toContain('rhx git.stage.add <file>');
        },
      );

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] continue, still unsettled', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['continue'] }),
      );

      then('exits 2 with the same label and cue', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'src/tide.md (deleted on main, changed on the branch)',
        );
        expect(result.stdout).toContain(
          'a deleted file holds no markers; settle it with take',
        );
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case45] the branch deleted a file main changed', () => {
    const scene = useBeforeAll(async () => {
      const scene = genCatchupScene({
        slug: 'catchup-continue-case45',
        base: { 'src/tide.md': 'tide: base\n' },
        ahead: null,
      });
      runGit({ cwd: scene.workDir, args: ['rm', '-q', 'src/tide.md'] });
      runGit({
        cwd: scene.workDir,
        args: ['commit', '-q', '-m', 'feat(src): drop tide'],
      });
      moveMain({
        scene,
        files: { 'src/tide.md': 'tide: main\n' },
        message: 'feat(src): edit tide',
      });
      const begin = runCatchup({ scene, args: ['begin', '--mode', 'apply'] });
      expect(begin.exitCode).toBe(2);
      return scene;
    });

    when('[t0] continue, still unsettled', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['continue'] }),
      );

      then('exits 2 and labels the file as deleted on the branch', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'src/tide.md (deleted on the branch, changed on main)',
        );
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given(
    '[case46] main adds a `=======` underline to a file both sides edit; the settle keeps it',
    () => {
      const scene = useBeforeAll(async () => {
        const scene = genCatchupScene({
          slug: 'catchup-continue-case46',
          base: { 'docs/tide.md': 'tide\nbody: base\n' },
          ahead: { 'docs/tide.md': 'tide\nbody: branch\n' },
        });
        moveMain({
          scene,
          files: { 'docs/tide.md': 'tide\n=======\nbody: main\n' },
          message: 'docs(tide): underline the title',
        });
        const begin = runCatchup({ scene, args: ['begin', '--mode', 'apply'] });
        expect(begin.exitCode).toBe(2);
        settleFile({
          scene,
          file: 'docs/tide.md',
          content: 'tide\n=======\nbody: main + branch\n',
        });
        return scene;
      });

      when('[t0] continue', () => {
        const result = useBeforeAll(async () => {
          const run = runCatchup({ scene, args: ['continue'] });
          return { run, head: getHeadFacts({ scene }) };
        });

        then('exits 0: the underline is the file text, not a marker', () => {
          expect(result.run.exitCode).toBe(0);
          expect(result.run.stdout).not.toContain('conflict markers');
        });

        then('the merge commit lands, meter −1', () => {
          expect(result.head.parents).toBe(2);
          expect(readMeterUses({ scene })).toBe(3);
        });

        then('matches snapshot', () => {
          expect(asStableOutput(result.run.stdout)).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case47] a settled merge, plus a staged file main never changed',
    () => {
      const scene = useBeforeAll(async () => {
        const scene = genConflictScene({ slug: 'catchup-continue-case47' });
        settleFile({ scene, file: 'src/a.md', content: 'a: main + branch\n' });
        settleFile({ scene, file: 'src/b.md', content: 'b: main + branch\n' });
        settleFile({ scene, file: 'src/other.md', content: 'other: stray\n' });
        return scene;
      });

      when('[t0] continue', () => {
        const result = useBeforeAll(async () => {
          const run = runCatchup({ scene, args: ['continue'] });
          const inCommit = runGit({
            cwd: scene.workDir,
            args: ['diff', '--name-only', 'HEAD^1', 'HEAD'],
          });
          const status = runGit({
            cwd: scene.workDir,
            args: ['status', '--porcelain', '--', 'src/other.md'],
          });
          return { run, inCommit, status, head: getHeadFacts({ scene }) };
        });

        then('exits 0; the merge commit lands', () => {
          expect(result.run.exitCode).toBe(0);
          expect(result.head.parents).toBe(2);
        });

        then('the merge commit carries only the settled files', () => {
          expect(result.inCommit).toContain('src/a.md');
          expect(result.inCommit).toContain('src/b.md');
          expect(result.inCommit).not.toContain('src/other.md');
        });

        then('the stray file stays in the tree, unstaged', () => {
          expect(result.status).toBe('?? src/other.md');
        });

        then('the result names the file it left out', () => {
          expect(result.run.stdout).toContain(
            '🌙 left out of the merge commit: origin/main did not change 1 file',
          );
          expect(result.run.stdout).toContain('src/other.md');
          expect(result.run.stdout).toContain('files: 2 merged');
        });

        then('matches snapshot', () => {
          expect(asStableOutput(result.run.stdout)).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case49] a large file: main underlines its title with `=======`, both sides edit its end',
    () => {
      const filler = Array.from({ length: 4000 }, (_, i) => `swell ${i}`).join(
        '\n',
      );
      const scene = useBeforeAll(async () => {
        const scene = genCatchupScene({
          slug: 'catchup-continue-case49',
          base: { 'docs/tide.md': `tide\n${filler}\nend: base\n` },
          ahead: { 'docs/tide.md': `tide\n${filler}\nend: branch\n` },
        });
        moveMain({
          scene,
          files: { 'docs/tide.md': `tide\n=======\n${filler}\nend: main\n` },
          message: 'docs(tide): underline the title, edit the end',
        });
        const begin = runCatchup({ scene, args: ['begin', '--mode', 'apply'] });
        expect(begin.exitCode).toBe(2);
        settleFile({
          scene,
          file: 'docs/tide.md',
          content: `tide\n=======\n${filler}\nend: main + branch\n`,
        });
        return scene;
      });

      when('[t0] continue', () => {
        const result = useBeforeAll(async () => {
          const run = runCatchup({ scene, args: ['continue'] });
          return { run, head: getHeadFacts({ scene }) };
        });

        then('exits 0: the underline is the file text, at any size', () => {
          expect(result.run.exitCode).toBe(0);
          expect(result.run.stdout).not.toContain('conflict markers');
          expect(result.head.parents).toBe(2);
        });

        then('matches snapshot: a large file leaves the render as is', () => {
          expect(asStableOutput(result.run.stdout)).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case48] MERGE_MSG holds no conflict list, and a staged file holds markers',
    () => {
      const scene = useBeforeAll(async () => {
        const scene = genCatchupScene({
          slug: 'catchup-continue-case48',
          base: { 'src/a.md': 'a: base\n' },
          ahead: { 'src/a.md': 'a: branch\n' },
        });
        moveMain({
          scene,
          files: { 'src/a.md': 'a: main\n' },
          message: 'feat(src): edit a',
        });
        const begin = runCatchup({ scene, args: ['begin', '--mode', 'apply'] });
        expect(begin.exitCode).toBe(2);
        const mergeMsg = path.join(
          scene.workDir,
          runGit({
            cwd: scene.workDir,
            args: ['rev-parse', '--git-path', 'MERGE_MSG'],
          }),
        );
        fs.writeFileSync(mergeMsg, 'Merge origin/main\n');
        settleFile({
          scene,
          file: 'src/a.md',
          content:
            '<<<<<<< HEAD\na: branch\n=======\na: main\n>>>>>>> origin/main\n',
        });
        return scene;
      });

      when('[t0] continue', () => {
        const result = useBeforeAll(async () => {
          const headBefore = getHeadFacts({ scene }).sha;
          const run = runCatchup({ scene, args: ['continue'] });
          return { run, headBefore };
        });

        then('fails closed: exits 2 and names the marked file', () => {
          expect(result.run.exitCode).toBe(2);
          expect(result.run.stdout).toContain(
            '✋ ConstraintError: 1 file staged with conflict markers',
          );
          expect(result.run.stdout).toContain('src/a.md');
        });

        then('matches snapshot', () => {
          expect(asStableOutput(result.run.stdout)).toMatchSnapshot();
        });

        then('no commit; meter unchanged', () => {
          expect(getHeadFacts({ scene }).sha).toBe(result.headBefore);
          expect(readMeterUses({ scene })).toBe(4);
        });
      });
    },
  );

  given(
    '[case50] a settled catch-up in flight, plus a stray file; the clone reaches for git.commit.set',
    () => {
      const scene = useBeforeAll(async () => {
        const scene = genConflictScene({ slug: 'catchup-continue-case50' });
        settleFile({ scene, file: 'src/a.md', content: 'a: settled\n' });
        settleFile({ scene, file: 'src/b.md', content: 'b: settled\n' });
        fs.writeFileSync(path.join(scene.workDir, 'notes.md'), 'stray\n');
        return scene;
      });

      when('[t0] git.commit.set --mode apply --unstaged include', () => {
        const result = useBeforeAll(async () => {
          const headBefore = getHeadFacts({ scene }).sha;
          const run = spawnSync(
            'bash',
            [
              path.join(__dirname, '../git.commit/git.commit.set.sh'),
              '-m',
              '@stdin',
              '--mode',
              'apply',
              '--unstaged',
              'include',
            ],
            {
              cwd: scene.workDir,
              input: 'cont(src): settle a and b\n\n- settled by hand\n',
              encoding: 'utf-8',
              env: { ...process.env, HOME: scene.homeDir },
            },
          );
          return { run, headBefore };
        });

        then('exits 2 and names catchup continue, on both streams', () => {
          expect(result.run.status).toBe(2);
          for (const stream of [result.run.stdout, result.run.stderr]) {
            expect(stream).toContain(
              'a merge is in flight; git.commit.set makes no merge commit',
            );
            expect(stream).toContain('rhx git.branch.catchup continue');
          }
        });

        then('matches snapshot', () => {
          expect(asStableOutput(result.run.stdout)).toMatchSnapshot();
        });

        then(
          'no commit; meter unchanged; the stray file stays unstaged',
          () => {
            expect(getHeadFacts({ scene }).sha).toBe(result.headBefore);
            expect(readMeterUses({ scene })).toBe(4);
            expect(isMergeInFlight({ scene })).toBe(true);
            expect(
              runGit({
                cwd: scene.workDir,
                args: ['status', '--porcelain', '--', 'notes.md'],
              }),
            ).toBe('?? notes.md');
          },
        );
      });

      // the guard runs before git.commit.set splits on mode, so plan (its default) refuses too
      when('[t1] git.commit.set, plan mode (its default)', () => {
        const result = useBeforeAll(async () =>
          spawnSync(
            'bash',
            [
              path.join(__dirname, '../git.commit/git.commit.set.sh'),
              '-m',
              '@stdin',
            ],
            {
              cwd: scene.workDir,
              input: 'cont(src): settle a and b\n\n- settled by hand\n',
              encoding: 'utf-8',
              env: { ...process.env, HOME: scene.homeDir },
            },
          ),
        );

        then('exits 2 and names catchup continue, on both streams', () => {
          expect(result.status).toBe(2);
          for (const stream of [result.stdout, result.stderr]) {
            expect(stream).toContain(
              'a merge is in flight; git.commit.set makes no merge commit',
            );
            expect(stream).toContain('rhx git.branch.catchup continue');
          }
          expect(isMergeInFlight({ scene })).toBe(true);
        });

        then('matches snapshot', () => {
          expect(asStableOutput(result.stdout)).toMatchSnapshot();
        });
      });
    },
  );

  given('[case27] no merge in flight', () => {
    const scene = useBeforeAll(async () =>
      genCatchupScene({ slug: 'catchup-continue-case27' }),
    );

    when('[t0] continue', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['continue'] }),
      );

      then('exits 2: no merge in flight, never a silent no-op', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: no merge in flight',
        );
        expect(result.stderr).toContain(
          '✋ ConstraintError: no merge in flight',
        );
        expect(result.stdout).toContain('rhx git.branch.catchup begin');
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });
});
