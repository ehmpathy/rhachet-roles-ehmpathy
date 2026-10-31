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
} from './.test/genCatchupScene';

/**
 * .what = a scene whose catch-up merge stopped on a conflict, and the HEAD
 *         from before begin
 */
const genConflictScene = (input: {
  slug: string;
}): { scene: CatchupScene; headBefore: string } => {
  const scene = genCatchupScene({
    slug: input.slug,
    base: { 'src/a.md': 'a: base\n' },
    ahead: { 'src/a.md': 'a: branch\n' },
  });
  moveMain({
    scene,
    files: { 'src/a.md': 'a: main\n' },
    message: 'feat(src): edit a',
  });
  const headBefore = getHeadFacts({ scene }).sha;
  const begin = runCatchup({ scene, args: ['begin', '--mode', 'apply'] });
  expect(begin.exitCode).toBe(2);
  return { scene, headBefore };
};

/**
 * .what = integration tests for `git.branch.catchup abort`
 * .why = proves the clean exit: HEAD, index, and tree back to before begin,
 *        no meter spend, and a loud refusal when idle
 */
describe('git.branch.catchup abort', () => {
  given('[case3] a merge in flight with unsettled conflicts', () => {
    const ctx = useBeforeAll(async () =>
      genConflictScene({ slug: 'catchup-abort-case3' }),
    );

    when('[t0] abort', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene: ctx.scene, args: ['abort'] }),
      );

      then('exits 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('HEAD equals the pre-merge HEAD; no MERGE_HEAD; tree clean', () => {
        expect(getHeadFacts({ scene: ctx.scene }).sha).toBe(ctx.headBefore);
        expect(isMergeInFlight({ scene: ctx.scene })).toBe(false);
        expect(
          runGit({ cwd: ctx.scene.workDir, args: ['status', '--porcelain'] }),
        ).toBe('');
      });

      then('meter unchanged, and the output says no spend', () => {
        expect(readMeterUses({ scene: ctx.scene })).toBe(4);
        expect(result.stdout).toContain('left: 4 (no spend)');
      });

      then('names no settlement: none was made', () => {
        expect(result.stdout).not.toContain('settlements discarded');
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case3b] a merge in flight, every conflict settled and staged', () => {
    const ctx = useBeforeAll(async () => {
      const ctx = genConflictScene({ slug: 'catchup-abort-case3b' });
      fs.writeFileSync(
        path.join(ctx.scene.workDir, 'src/a.md'),
        'a: settled\n',
      );
      runGit({ cwd: ctx.scene.workDir, args: ['add', 'src/a.md'] });
      return ctx;
    });

    when('[t0] abort', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene: ctx.scene, args: ['abort'] }),
      );

      then(
        'restores the pre-merge state and says the settlements were discarded',
        () => {
          expect(result.exitCode).toBe(0);
          expect(getHeadFacts({ scene: ctx.scene }).sha).toBe(ctx.headBefore);
          expect(result.stdout).toContain('settlements discarded');
          expect(result.stdout).toContain('src/a.md');
          expect(
            fs.readFileSync(path.join(ctx.scene.workDir, 'src/a.md'), 'utf-8'),
          ).toBe('a: branch\n');
        },
      );

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given(
    '[case3c] a merge in flight, one conflict settled by take, one still open',
    () => {
      const ctx = useBeforeAll(async () => {
        const scene = genCatchupScene({
          slug: 'catchup-abort-case3c',
          base: { 'src/a.md': 'a: base\n', 'src/b.md': 'b: base\n' },
          ahead: { 'src/a.md': 'a: branch\n', 'src/b.md': 'b: branch\n' },
        });
        moveMain({
          scene,
          files: { 'src/a.md': 'a: main\n', 'src/b.md': 'b: main\n' },
          message: 'feat(src): edit a and b',
        });
        const headBefore = getHeadFacts({ scene }).sha;
        const begin = runCatchup({ scene, args: ['begin', '--mode', 'apply'] });
        expect(begin.exitCode).toBe(2);
        const take = runCatchup({
          scene,
          args: ['take', '--whos', 'main', 'src/a.md'],
        });
        expect(take.exitCode).toBe(0);
        return { scene, headBefore };
      });

      when('[t0] abort', () => {
        const result = useBeforeAll(async () =>
          runCatchup({ scene: ctx.scene, args: ['abort'] }),
        );

        then('restores the pre-merge state', () => {
          expect(result.exitCode).toBe(0);
          expect(getHeadFacts({ scene: ctx.scene }).sha).toBe(ctx.headBefore);
          expect(isMergeInFlight({ scene: ctx.scene })).toBe(false);
        });

        then('names the settled file it discarded, not the open one', () => {
          expect(result.stdout).toContain('settlements discarded');
          expect(result.stdout).toContain('src/a.md');
          expect(result.stdout).not.toContain('src/b.md');
        });

        then('matches snapshot', () => {
          expect(asStableOutput(result.stdout)).toMatchSnapshot();
        });
      });
    },
  );

  given('[case3d] an unsettled conflict on a non-ASCII path', () => {
    const scene = useBeforeAll(async () => {
      const scene = genCatchupScene({
        slug: 'catchup-abort-case3d',
        base: { 'src/café.md': 'café: base\n' },
        ahead: { 'src/café.md': 'café: branch\n' },
      });
      moveMain({
        scene,
        files: { 'src/café.md': 'café: main\n' },
        message: 'feat(src): edit café',
      });
      const begin = runCatchup({ scene, args: ['begin', '--mode', 'apply'] });
      expect(begin.exitCode).toBe(2);
      expect(begin.stdout).toContain('src/café.md');
      return scene;
    });

    when('[t0] abort', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['abort'] }),
      );

      then(
        'backs out, and names no settlement: the file was never settled',
        () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).not.toContain('settlements discarded');
          expect(isMergeInFlight({ scene })).toBe(false);
        },
      );

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case3e] a hand merge of another branch in flight', () => {
    const ctx = useBeforeAll(async () => {
      const scene = genCatchupScene({ slug: 'catchup-abort-case3e' });
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
      const headBefore = getHeadFacts({ scene }).sha;
      runGit({
        cwd: scene.workDir,
        args: ['merge', '--no-ff', '--no-commit', 'turtle/other'],
      });
      expect(isMergeInFlight({ scene })).toBe(true);
      return { scene, headBefore };
    });

    when('[t0] abort: the one way out that begin and continue name', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene: ctx.scene, args: ['abort'] }),
      );

      then('exits 0; HEAD back to before the merge; tree clean', () => {
        expect(result.exitCode).toBe(0);
        expect(getHeadFacts({ scene: ctx.scene }).sha).toBe(ctx.headBefore);
        expect(isMergeInFlight({ scene: ctx.scene })).toBe(false);
        expect(
          runGit({ cwd: ctx.scene.workDir, args: ['status', '--porcelain'] }),
        ).toBe('');
      });

      then('claims no begin it never saw, and names no settlement', () => {
        expect(result.stdout).toContain('(as before the merge)');
        expect(result.stdout).not.toContain('before begin');
        expect(result.stdout).not.toContain('settlements discarded');
      });

      then('meter unchanged', () => {
        expect(readMeterUses({ scene: ctx.scene })).toBe(4);
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case3f] a merge of origin/main in flight on main itself', () => {
    const ctx = useBeforeAll(async () => {
      const scene = genCatchupScene({ slug: 'catchup-abort-case3f' });
      moveMain({
        scene,
        files: { 'docs/a.md': 'a\n' },
        message: 'feat(docs): add a',
      });
      runGit({ cwd: scene.workDir, args: ['fetch', '-q', 'origin'] });
      runGit({ cwd: scene.workDir, args: ['checkout', '-q', 'main'] });
      const headBefore = getHeadFacts({ scene }).sha;
      runGit({
        cwd: scene.workDir,
        args: ['merge', '--no-ff', '--no-commit', 'origin/main'],
      });
      expect(isMergeInFlight({ scene })).toBe(true);
      return { scene, headBefore };
    });

    when('[t0] abort', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene: ctx.scene, args: ['abort'] }),
      );

      then('exits 0; main back to before the merge; no commit on main', () => {
        expect(result.exitCode).toBe(0);
        expect(getHeadFacts({ scene: ctx.scene }).sha).toBe(ctx.headBefore);
        expect(isMergeInFlight({ scene: ctx.scene })).toBe(false);
        expect(result.stdout).toContain('(as before the merge)');
      });

      then('meter unchanged', () => {
        expect(readMeterUses({ scene: ctx.scene })).toBe(4);
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case28] no merge in flight', () => {
    const scene = useBeforeAll(async () =>
      genCatchupScene({ slug: 'catchup-abort-case28' }),
    );

    when('[t0] abort', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['abort'] }),
      );

      then('exits 2: no merge in flight, never a silent no-op', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: no merge in flight',
        );
        expect(result.stderr).toContain(
          '✋ ConstraintError: no merge in flight',
        );
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });
});
