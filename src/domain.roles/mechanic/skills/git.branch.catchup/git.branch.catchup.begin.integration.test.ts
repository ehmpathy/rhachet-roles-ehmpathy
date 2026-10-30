import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import {
  asStableOutput,
  genCatchupScene,
  getHeadFacts,
  isMergeInFlight,
  moveMain,
  readMeterUses,
  runCatchup,
  runGit,
} from './.test/genCatchupScene';

/**
 * .what = integration tests for `git.branch.catchup begin`
 * .why = proves the vision's begin cells against a real bare origin:
 *        clean merge, zero-ahead, conflict stop, level no-op, and each gate
 */
describe('git.branch.catchup begin', () => {
  given(
    '[case1] a feature branch 3 behind origin/main, no overlap in files',
    () => {
      const scene = useBeforeAll(async () => {
        const scene = genCatchupScene({ slug: 'catchup-begin-case1' });
        moveMain({
          scene,
          files: { 'docs/a.md': 'a\n' },
          message: 'feat(docs): add a',
        });
        moveMain({
          scene,
          files: { 'docs/b.md': 'b\n' },
          message: 'feat(docs): add b',
        });
        moveMain({
          scene,
          files: { 'docs/c.md': 'c\n' },
          message: 'feat(docs): add c',
        });
        return scene;
      });

      when('[t0] begin, plan mode (default)', () => {
        const result = useBeforeAll(async () => {
          const headBefore = getHeadFacts({ scene }).sha;
          const run = runCatchup({ scene, args: ['begin'] });
          return { run, headBefore };
        });

        then('exits 0', () => {
          expect(result.run.exitCode).toBe(0);
        });

        then('opens with how and from what', () => {
          expect(result.run.stdout).toContain(
            'catch up via merge (no rewrite) from origin/main',
          );
        });

        then('lists the 3 commits behind and the header to come', () => {
          expect(result.run.stdout).toContain('behind: 3 commits');
          expect(result.run.stdout).toContain('feat(docs): add a');
          expect(result.run.stdout).toContain('feat(docs): add c');
          expect(result.run.stdout).toContain(
            'header: cont(branch): merge origin/main into turtle/feat-wave-report',
          );
        });

        then('shows the meter would go 4 → 3', () => {
          expect(result.run.stdout).toContain('left: 4 → 3');
        });

        then(
          'makes no commit; HEAD and meter unchanged; no merge in flight',
          () => {
            expect(getHeadFacts({ scene }).sha).toBe(result.headBefore);
            expect(readMeterUses({ scene })).toBe(4);
            expect(isMergeInFlight({ scene })).toBe(false);
          },
        );

        then('matches snapshot', () => {
          expect(asStableOutput(result.run.stdout)).toMatchSnapshot();
        });
      });

      when('[t1] begin --mode apply', () => {
        const result = useBeforeAll(async () => {
          const headBefore = getHeadFacts({ scene }).sha;
          const run = runCatchup({ scene, args: ['begin', '--mode', 'apply'] });
          return { run, headBefore, head: getHeadFacts({ scene }) };
        });

        then('exits 0', () => {
          expect(result.run.exitCode).toBe(0);
        });

        then('HEAD is a 2-parent commit: old HEAD and origin/main', () => {
          expect(result.head.parents).toBe(2);
          const parents = runGit({
            cwd: scene.workDir,
            args: ['log', '-1', '--format=%P'],
          }).split(' ');
          expect(parents[0]).toBe(result.headBefore);
          expect(parents[1]).toBe(
            runGit({ cwd: scene.workDir, args: ['rev-parse', 'origin/main'] }),
          );
        });

        then(
          'author is seaturtle[bot]; message ends with the sponsor trailer',
          () => {
            expect(result.head.author).toBe(
              'seaturtle[bot] <seaturtle@ehmpath.com>',
            );
            expect(result.head.message).toContain(
              'cont(branch): merge origin/main into turtle/feat-wave-report',
            );
            expect(result.head.message).toMatch(
              /Co-authored-by: Test Human <human@test\.com>$/,
            );
          },
        );

        then('meter uses decremented by exactly 1', () => {
          expect(readMeterUses({ scene })).toBe(3);
        });

        then('the tree is clean; no merge in flight', () => {
          expect(isMergeInFlight({ scene })).toBe(false);
          expect(
            runGit({ cwd: scene.workDir, args: ['status', '--porcelain'] }),
          ).toBe('');
        });

        then('nudges the plain push', () => {
          expect(result.run.stdout).toContain(
            'rhx git.commit.push --mode apply',
          );
        });

        then('matches snapshot', () => {
          expect(asStableOutput(result.run.stdout)).toMatchSnapshot();
        });
      });

      when('[t2] git push after the catch-up', () => {
        const result = useBeforeAll(async () => {
          const remoteBefore = runGit({
            cwd: scene.workDir,
            args: ['rev-parse', `origin/${scene.branch}`],
          });
          runGit({
            cwd: scene.workDir,
            args: ['push', '-q', 'origin', scene.branch],
          });
          return { remoteBefore };
        });

        then('the remote branch moves by fast-forward', () => {
          const ancestry = spawnSync(
            'git',
            ['merge-base', '--is-ancestor', result.remoteBefore, 'HEAD'],
            { cwd: scene.workDir },
          );
          expect(ancestry.status).toBe(0);
        });
      });

      when('[t3] begin --mode apply again, right after the merge', () => {
        const result = useBeforeAll(async () => {
          const headBefore = getHeadFacts({ scene }).sha;
          const run = runCatchup({ scene, args: ['begin', '--mode', 'apply'] });
          return { run, headBefore };
        });

        then('already level: no-op, idempotent', () => {
          expect(result.run.exitCode).toBe(0);
          expect(result.run.stdout).toContain('already level');
          expect(getHeadFacts({ scene }).sha).toBe(result.headBefore);
          expect(readMeterUses({ scene })).toBe(3);
        });
      });
    },
  );

  given(
    '[case1b] a feature branch with 0 commits ahead and 2 behind origin/main',
    () => {
      const scene = useBeforeAll(async () => {
        const scene = genCatchupScene({
          slug: 'catchup-begin-case1b',
          ahead: null,
        });
        moveMain({
          scene,
          files: { 'docs/a.md': 'a\n' },
          message: 'feat(docs): add a',
        });
        moveMain({
          scene,
          files: { 'docs/b.md': 'b\n' },
          message: 'feat(docs): add b',
        });
        return scene;
      });

      when('[t0] begin --mode apply', () => {
        const result = useBeforeAll(async () => {
          const run = runCatchup({ scene, args: ['begin', '--mode', 'apply'] });
          return { run, head: getHeadFacts({ scene }) };
        });

        then('HEAD is a 2-parent seaturtle commit, not a fast-forward', () => {
          expect(result.run.exitCode).toBe(0);
          expect(result.head.parents).toBe(2);
          expect(result.head.author).toBe(
            'seaturtle[bot] <seaturtle@ehmpath.com>',
          );
        });
      });
    },
  );

  given(
    '[case2] a feature branch and origin/main that both edit the same two files',
    () => {
      const scene = useBeforeAll(async () => {
        const scene = genCatchupScene({
          slug: 'catchup-begin-case2',
          base: { 'src/a.md': 'a: base\n', 'src/b.md': 'b: base\n' },
          ahead: { 'src/a.md': 'a: branch\n', 'src/b.md': 'b: branch\n' },
        });
        moveMain({
          scene,
          files: { 'src/a.md': 'a: main\n', 'src/b.md': 'b: main\n' },
          message: 'feat(src): edit a and b',
        });
        return scene;
      });

      when('[t0] begin --mode apply', () => {
        const result = useBeforeAll(async () => {
          const headBefore = getHeadFacts({ scene }).sha;
          const run = runCatchup({ scene, args: ['begin', '--mode', 'apply'] });
          return { run, headBefore };
        });

        then('exits 2 with ConstraintError', () => {
          expect(result.run.exitCode).toBe(2);
          expect(result.run.stdout).toContain(
            '✋ ConstraintError: merge stopped on conflicts',
          );
        });

        then('stdout and stderr both list both conflicted files', () => {
          for (const stream of [result.run.stdout, result.run.stderr]) {
            expect(stream).toContain('src/a.md');
            expect(stream).toContain('src/b.md');
          }
        });

        then('the next steps name stage.add, take, continue, and abort', () => {
          expect(result.run.stdout).toContain('rhx git.stage.add <file>');
          expect(result.run.stdout).toContain(
            'rhx git.branch.catchup take --whos main|branch <file>',
          );
          expect(result.run.stdout).toContain(
            'rhx git.branch.catchup continue',
          );
          expect(result.run.stdout).toContain('rhx git.branch.catchup abort');
        });

        then('a merge stays in flight; no commit made; meter unchanged', () => {
          expect(isMergeInFlight({ scene })).toBe(true);
          expect(getHeadFacts({ scene }).sha).toBe(result.headBefore);
          expect(readMeterUses({ scene })).toBe(4);
        });

        then('matches snapshot', () => {
          expect(asStableOutput(result.run.stdout)).toMatchSnapshot();
        });
      });

      when('[t1] begin --mode apply again, with the merge in flight', () => {
        const result = useBeforeAll(async () =>
          runCatchup({ scene, args: ['begin', '--mode', 'apply'] }),
        );

        then(
          'refuses: a merge is already in flight; names continue and abort',
          () => {
            expect(result.exitCode).toBe(2);
            expect(result.stdout).toContain(
              '✋ ConstraintError: a merge is already in flight',
            );
            expect(result.stdout).toContain('rhx git.branch.catchup continue');
            expect(result.stdout).toContain('rhx git.branch.catchup abort');
          },
        );
      });
    },
  );

  given('[case2b] a conflict while the grant blocks stage', () => {
    const scene = useBeforeAll(async () => {
      const scene = genCatchupScene({
        slug: 'catchup-begin-case2b',
        base: { 'src/a.md': 'a: base\n' },
        ahead: { 'src/a.md': 'a: branch\n' },
        stage: 'block',
      });
      moveMain({
        scene,
        files: { 'src/a.md': 'a: main\n' },
        message: 'feat(src): edit a',
      });
      return scene;
    });

    when('[t0] begin --mode apply', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['begin', '--mode', 'apply'] }),
      );

      then('the next steps name the human grant for stage', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'rhx git.commit.uses set --quant N --push allow --stage allow',
        );
      });
    });
  });

  given('[case4a] HEAD on main', () => {
    const scene = useBeforeAll(async () => {
      const scene = genCatchupScene({ slug: 'catchup-begin-case4a' });
      runGit({ cwd: scene.workDir, args: ['checkout', '-q', 'main'] });
      return scene;
    });

    when('[t0] begin (plan)', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['begin'] }),
      );

      then('exits 2 with ConstraintError on both streams', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: will not merge into main',
        );
        expect(result.stderr).toContain(
          '✋ ConstraintError: will not merge into main',
        );
      });

      then('the fix names the worktree of the feature branch', () => {
        expect(result.stdout).toContain(
          'run it from the worktree of your feature branch',
        );
        expect(result.stdout).not.toContain('git checkout');
        expect(result.stdout).not.toContain('git switch');
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] begin --mode apply', () => {
      const result = useBeforeAll(async () => {
        const headBefore = getHeadFacts({ scene }).sha;
        const run = runCatchup({ scene, args: ['begin', '--mode', 'apply'] });
        return { run, headBefore };
      });

      then('exits 2; no merge; HEAD unchanged', () => {
        expect(result.run.exitCode).toBe(2);
        expect(isMergeInFlight({ scene })).toBe(false);
        expect(getHeadFacts({ scene }).sha).toBe(result.headBefore);
      });
    });
  });

  given('[case4b] unstaged edits in the tree', () => {
    const scene = useBeforeAll(async () => {
      const scene = genCatchupScene({ slug: 'catchup-begin-case4b' });
      moveMain({
        scene,
        files: { 'docs/a.md': 'a\n' },
        message: 'feat(docs): add a',
      });
      fs.writeFileSync(
        path.join(scene.workDir, 'readme.md'),
        '# wave report, edited\n',
      );
      return scene;
    });

    when('[t0] begin (plan)', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['begin'] }),
      );

      then(
        'exits 0; previews; flags apply will refuse, with the file named',
        () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('behind: 1 commit\n');
          expect(result.stdout).toContain(
            '⚠️ apply will refuse: uncommitted changes',
          );
          expect(result.stdout).toContain('readme.md');
        },
      );

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] begin --mode apply', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['begin', '--mode', 'apply'] }),
      );

      then('exits 2; names the dirty file; no merge started', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: uncommitted changes in the tree',
        );
        expect(result.stdout).toContain('readme.md');
        expect(isMergeInFlight({ scene })).toBe(false);
      });

      then('stdout and stderr both carry the header and the fix', () => {
        for (const stream of [result.stdout, result.stderr]) {
          expect(stream).toContain('uncommitted changes in the tree');
          expect(stream).toContain('rhx git.stage.add <files>');
          expect(stream).toContain('rhx git.commit.set -m @stdin --mode apply');
        }
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given(
    '[case4b2] staged-only edits in the tree (the gap the rebase guard leaves open)',
    () => {
      const scene = useBeforeAll(async () => {
        const scene = genCatchupScene({ slug: 'catchup-begin-case4b2' });
        moveMain({
          scene,
          files: { 'docs/a.md': 'a\n' },
          message: 'feat(docs): add a',
        });
        fs.writeFileSync(
          path.join(scene.workDir, 'readme.md'),
          '# wave report, staged\n',
        );
        runGit({ cwd: scene.workDir, args: ['add', 'readme.md'] });
        return scene;
      });

      when('[t0] begin --mode apply', () => {
        const result = useBeforeAll(async () =>
          runCatchup({ scene, args: ['begin', '--mode', 'apply'] }),
        );

        then('exits 2; names the staged file; no merge started', () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('uncommitted changes in the tree');
          expect(result.stdout).toContain('readme.md');
          expect(isMergeInFlight({ scene })).toBe(false);
        });
      });
    },
  );

  given('[case4c] meter uses = 0', () => {
    const scene = useBeforeAll(async () => {
      const scene = genCatchupScene({ slug: 'catchup-begin-case4c', uses: 0 });
      moveMain({
        scene,
        files: { 'docs/a.md': 'a\n' },
        message: 'feat(docs): add a',
      });
      return scene;
    });

    when('[t0] begin (plan)', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['begin'] }),
      );

      then('exits 0; previews; flags no commit uses left', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          '⚠️ apply will refuse: no commit uses left',
        );
        expect(result.stdout).toContain(
          'rhx git.commit.uses set --quant N --push allow',
        );
      });
    });

    when('[t1] begin --mode apply', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['begin', '--mode', 'apply'] }),
      );

      then('exits 2; no merge started; meter unchanged', () => {
        expect(result.exitCode).toBe(2);
        expect(isMergeInFlight({ scene })).toBe(false);
        expect(readMeterUses({ scene })).toBe(0);
      });

      then(
        'stdout and stderr both carry the header and the human command',
        () => {
          for (const stream of [result.stdout, result.stderr]) {
            expect(stream).toContain('✋ ConstraintError: no commit uses left');
            expect(stream).toContain('git.commit.uses set --quant N');
          }
        },
      );

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case4d] meter uses = "infinite"', () => {
    const scene = useBeforeAll(async () => {
      const scene = genCatchupScene({
        slug: 'catchup-begin-case4d',
        uses: 'infinite',
      });
      moveMain({
        scene,
        files: { 'docs/a.md': 'a\n' },
        message: 'feat(docs): add a',
      });
      return scene;
    });

    when('[t0] begin --mode apply', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['begin', '--mode', 'apply'] }),
      );

      then('merges; meter stays "infinite"', () => {
        expect(result.exitCode).toBe(0);
        expect(getHeadFacts({ scene }).parents).toBe(2);
        expect(readMeterUses({ scene })).toBe('infinite');
        expect(result.stdout).toContain('left: unlimited');
      });
    });
  });

  given('[case4e] no quota granted at all', () => {
    const scene = useBeforeAll(async () => {
      const scene = genCatchupScene({
        slug: 'catchup-begin-case4e',
        uses: null,
      });
      moveMain({
        scene,
        files: { 'docs/a.md': 'a\n' },
        message: 'feat(docs): add a',
      });
      return scene;
    });

    when('[t0] begin (plan)', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['begin'] }),
      );

      then('exits 0; flags no commit quota set', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          '⚠️ apply will refuse: no commit quota set',
        );
      });
    });

    when('[t1] begin --mode apply', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['begin', '--mode', 'apply'] }),
      );

      then('exits 2 with no commit quota set; no merge started', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: no commit quota set',
        );
        expect(isMergeInFlight({ scene })).toBe(false);
      });
    });
  });

  given('[case4f] a human set the global blocker', () => {
    const scene = useBeforeAll(async () => {
      const scene = genCatchupScene({ slug: 'catchup-begin-case4f' });
      moveMain({
        scene,
        files: { 'docs/a.md': 'a\n' },
        message: 'feat(docs): add a',
      });
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

    when('[t0] begin (plan)', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['begin'] }),
      );

      then('refuses in plan too: exit 2, names the human lift', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('git.commit.uses allow --global');
        expect(result.stderr).toContain('git.commit.uses allow --global');
      });
    });
  });

  given('[case4g] no sponsor bound, and git config names a clone', () => {
    const scene = useBeforeAll(async () => {
      const scene = genCatchupScene({ slug: 'catchup-begin-case4g' });
      moveMain({
        scene,
        files: { 'docs/a.md': 'a\n' },
        message: 'feat(docs): add a',
      });
      fs.rmSync(path.join(scene.workDir, '.meter', 'git.commit.sponsor.jsonc'));
      runGit({
        cwd: scene.workDir,
        args: ['config', 'user.name', 'seaturtle[bot]'],
      });
      runGit({
        cwd: scene.workDir,
        args: ['config', 'user.email', 'seaturtle@ehmpath.com'],
      });
      return scene;
    });

    when('[t0] begin (plan)', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['begin'] }),
      );

      then('refuses in plan too: exit 2, no sponsor for this commit', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('no sponsor for this commit');
        expect(result.stdout).toContain('rhx git.commit.sponsor set');
      });
    });
  });

  given('[case5] a feature branch that already contains origin/main', () => {
    const scene = useBeforeAll(async () =>
      genCatchupScene({ slug: 'catchup-begin-case5' }),
    );

    when('[t0] begin (plan)', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['begin'] }),
      );

      then('exits 0; prints already level', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('already level');
        expect(result.stdout).toContain('behind: 0');
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] begin --mode apply', () => {
      const result = useBeforeAll(async () => {
        const headBefore = getHeadFacts({ scene }).sha;
        const run = runCatchup({ scene, args: ['begin', '--mode', 'apply'] });
        return { run, headBefore };
      });

      then('exits 0; already level; HEAD and meter unchanged', () => {
        expect(result.run.exitCode).toBe(0);
        expect(result.run.stdout).toContain('already level');
        expect(getHeadFacts({ scene }).sha).toBe(result.headBefore);
        expect(readMeterUses({ scene })).toBe(4);
      });
    });
  });

  given('[case6] a rebase in flight', () => {
    const scene = useBeforeAll(async () => {
      const scene = genCatchupScene({
        slug: 'catchup-begin-case6',
        base: { 'src/a.md': 'a: base\n' },
        ahead: { 'src/a.md': 'a: branch\n' },
      });
      moveMain({
        scene,
        files: { 'src/a.md': 'a: main\n' },
        message: 'feat(src): edit a',
      });
      runGit({ cwd: scene.workDir, args: ['fetch', '-q', 'origin', 'main'] });
      // the conflict leaves the rebase in flight, by design
      const rebase = spawnSync('git', ['rebase', 'origin/main'], {
        cwd: scene.workDir,
      });
      expect(rebase.status).not.toBe(0);
      return scene;
    });

    when('[t0] begin (plan)', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['begin'] }),
      );

      then(
        'refuses in plan too: a rebase detaches HEAD; names its exits',
        () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            '✋ ConstraintError: a rebase is in flight',
          );
          expect(result.stdout).toContain('rhx git.branch.rebase continue');
          expect(result.stdout).toContain('rhx git.branch.rebase abort');
        },
      );
    });

    when('[t1] begin --mode apply', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['begin', '--mode', 'apply'] }),
      );

      then('exits 2; a rebase is in flight', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: a rebase is in flight',
        );
      });
    });
  });

  given('[case7] a fetch that fails', () => {
    const scene = useBeforeAll(async () => {
      const scene = genCatchupScene({ slug: 'catchup-begin-case7' });
      runGit({
        cwd: scene.workDir,
        args: [
          'remote',
          'set-url',
          'origin',
          path.join(scene.baseDir, 'absent.git'),
        ],
      });
      return scene;
    });

    when('[t0] begin (plan)', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['begin'] }),
      );

      then('exits 1 with MalfunctionError on both streams', () => {
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain(
          '💥 MalfunctionError: could not fetch origin/main',
        );
        expect(result.stderr).toContain(
          '💥 MalfunctionError: could not fetch origin/main',
        );
      });
    });
  });

  given('[case8] a branch with more commits behind than the plan lists', () => {
    const scene = useBeforeAll(async () => {
      const scene = genCatchupScene({ slug: 'catchup-begin-case8' });
      for (const n of Array.from({ length: 12 }, (_, i) => i + 1)) {
        moveMain({
          scene,
          files: { [`docs/${n}.md`]: `${n}\n` },
          message: `feat(docs): add ${n}`,
        });
      }
      return scene;
    });

    when('[t0] begin (plan)', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['begin'] }),
      );

      then('lists 10 and summarizes the rest', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('behind: 12 commits');
        expect(result.stdout).toContain('… and 2 more');
      });
    });
  });
});
