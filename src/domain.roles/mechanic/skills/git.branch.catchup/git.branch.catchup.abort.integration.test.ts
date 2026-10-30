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
          expect(result.stdout).toContain('settlements: discarded');
          expect(
            fs.readFileSync(path.join(ctx.scene.workDir, 'src/a.md'), 'utf-8'),
          ).toBe('a: branch\n');
        },
      );
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
    });
  });
});
