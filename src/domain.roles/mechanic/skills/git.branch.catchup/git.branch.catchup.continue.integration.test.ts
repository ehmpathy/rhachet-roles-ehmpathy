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

      then('says to settle it, stage it, then continue again', () => {
        expect(result.stdout).toContain(
          'settle it, rhx git.stage.add it, then continue again',
        );
      });

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
    });
  });

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
