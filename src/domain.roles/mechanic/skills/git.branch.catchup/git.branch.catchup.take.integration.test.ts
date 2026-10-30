import * as fs from 'fs';
import * as path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import {
  asStableOutput,
  type CatchupScene,
  commitFiles,
  genCatchupScene,
  getConflictFiles,
  isMergeInFlight,
  moveMain,
  runCatchup,
  runGit,
} from './.test/genCatchupScene';

/**
 * .what = a scene whose catch-up merge stopped on two text conflicts
 */
const genTextConflictScene = (input: { slug: string }): CatchupScene => {
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
 * .what = a scene where main deletes a file the branch modified
 */
const genDeleteConflictScene = (input: { slug: string }): CatchupScene => {
  const scene = genCatchupScene({
    slug: input.slug,
    base: { 'src/tide.md': 'tide: base\n' },
    ahead: { 'src/tide.md': 'tide: branch\n' },
  });
  runGit({ cwd: scene.upstreamDir, args: ['pull', '-q', 'origin', 'main'] });
  runGit({ cwd: scene.upstreamDir, args: ['rm', '-q', 'src/tide.md'] });
  commitFiles({
    cwd: scene.upstreamDir,
    files: { 'src/swell.md': 'swell\n' },
    message: 'feat(src): drop tide, add swell',
  });
  runGit({ cwd: scene.upstreamDir, args: ['push', '-q', 'origin', 'main'] });
  const begin = runCatchup({ scene, args: ['begin', '--mode', 'apply'] });
  expect(begin.exitCode).toBe(2);
  return scene;
};

const readFileIn = (scene: CatchupScene, file: string): string =>
  fs.readFileSync(path.join(scene.workDir, file), 'utf-8');

const getStagedFiles = (scene: CatchupScene): string =>
  runGit({ cwd: scene.workDir, args: ['diff', '--cached', '--name-only'] });

/**
 * .what = integration tests for `git.branch.catchup take`
 * .why = proves a whole-file side pick names sides as main / branch, stages
 *        the pick, and handles a side that deleted the file
 */
describe('git.branch.catchup take', () => {
  given('[case23] a merge in flight with two text conflicts', () => {
    const scene = useBeforeAll(async () =>
      genTextConflictScene({ slug: 'catchup-take-case23' }),
    );

    when('[t0] take --whos main src/a.md', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['take', '--whos', 'main', 'src/a.md'] }),
      );

      then('exits 0; the file holds origin/main content and is staged', () => {
        expect(result.exitCode).toBe(0);
        expect(readFileIn(scene, 'src/a.md')).toBe('a: main\n');
        expect(getStagedFiles(scene)).toContain('src/a.md');
      });

      then(
        'the other file stays in conflict; the merge stays in flight',
        () => {
          expect(getConflictFiles(scene)).toBe('src/b.md');
          expect(isMergeInFlight({ scene })).toBe(true);
        },
      );

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] take --whos branch src/b.md', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['take', '--whos', 'branch', 'src/b.md'] }),
      );

      // the branch side equals HEAD, so a settled pick shows no staged diff
      then(
        "exits 0; the file holds this branch's content and leaves the conflict set",
        () => {
          expect(result.exitCode).toBe(0);
          expect(readFileIn(scene, 'src/b.md')).toBe('b: branch\n');
          expect(getConflictFiles(scene)).toBe('');
        },
      );
    });

    when('[t2] take again, with no file left in conflict', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['take', '--whos', 'main', '.'] }),
      );

      then('exits 2: no file in conflict; names continue as the move', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: no file in conflict',
        );
        expect(result.stdout).toContain('rhx git.branch.catchup continue');
      });
    });
  });

  given('[case23b] a path that matches no conflicted file', () => {
    const scene = useBeforeAll(async () =>
      genTextConflictScene({ slug: 'catchup-take-case23b' }),
    );

    when('[t0] take --whos main src/a.md src/absent.md', () => {
      const result = useBeforeAll(async () =>
        runCatchup({
          scene,
          args: ['take', '--whos', 'main', 'src/a.md', 'src/absent.md'],
        }),
      );

      then(
        'exits 2; names the unmatched path and the files in conflict',
        () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('a path matches no conflicted file');
          expect(result.stdout).toContain('src/absent.md');
        },
      );

      then('changes naught: the matched file is still in conflict', () => {
        expect(getConflictFiles(scene)).toContain('src/a.md');
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] take --whos ours src/a.md', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['take', '--whos', 'ours', 'src/a.md'] }),
      );

      then("exits 2; names main and branch, never git's pronouns", () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          '--whos must be main or branch (got: ours)',
        );
      });
    });

    when('[t2] take --whos main, with no path', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['take', '--whos', 'main'] }),
      );

      then('exits 2 on both streams: no paths given', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('✋ ConstraintError: no paths given');
        expect(result.stderr).toContain('✋ ConstraintError: no paths given');
      });

      then('changes naught: the file is still in conflict', () => {
        expect(getConflictFiles(scene)).toContain('src/a.md');
      });
    });
  });

  given('[case25] main deleted a file the branch modified', () => {
    const scene = useBeforeAll(async () =>
      genDeleteConflictScene({ slug: 'catchup-take-case25' }),
    );

    when('[t0] take --whos main src/tide.md', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['take', '--whos', 'main', 'src/tide.md'] }),
      );

      then('exits 0; the file is removed, as main has it', () => {
        expect(result.exitCode).toBe(0);
        expect(fs.existsSync(path.join(scene.workDir, 'src/tide.md'))).toBe(
          false,
        );
        expect(getConflictFiles(scene)).toBe('');
      });
    });
  });

  given(
    '[case25b] main deleted a file the branch modified; keep the branch',
    () => {
      const scene = useBeforeAll(async () =>
        genDeleteConflictScene({ slug: 'catchup-take-case25b' }),
      );

      when('[t0] take --whos branch src/tide.md', () => {
        const result = useBeforeAll(async () =>
          runCatchup({
            scene,
            args: ['take', '--whos', 'branch', 'src/tide.md'],
          }),
        );

        // the branch side equals HEAD, so a settled pick shows no staged diff
        then(
          "exits 0; the file holds the branch's content and leaves the conflict set",
          () => {
            expect(result.exitCode).toBe(0);
            expect(readFileIn(scene, 'src/tide.md')).toBe('tide: branch\n');
            expect(getConflictFiles(scene)).toBe('');
          },
        );
      });
    },
  );

  given('[case26] no merge in flight', () => {
    const scene = useBeforeAll(async () =>
      genCatchupScene({ slug: 'catchup-take-case26' }),
    );

    when('[t0] take --whos main readme.md', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['take', '--whos', 'main', 'readme.md'] }),
      );

      then('exits 2: no merge in flight', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: no merge in flight',
        );
      });
    });
  });
});
