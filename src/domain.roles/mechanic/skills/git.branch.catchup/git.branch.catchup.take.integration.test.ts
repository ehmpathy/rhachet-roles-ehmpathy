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
  writeMeter,
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

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
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
        expect(result.stderr).toContain(
          '✋ ConstraintError: no file in conflict',
        );
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
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
          expect(result.stdout).toContain(
            'note: paths are read from the repo root, wherever take runs',
          );
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
        expect(result.stderr).toContain(
          '--whos must be main or branch (got: ours)',
        );
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
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

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] take with an unknown flag', () => {
      const result = useBeforeAll(async () =>
        runCatchup({
          scene,
          args: ['take', '--whos', 'main', '--force', 'src/a.md'],
        }),
      );

      then(
        'exits 2 on both streams: an unknown flag, never a path to match',
        () => {
          expect(result.exitCode).toBe(2);
          for (const stream of [result.stdout, result.stderr])
            expect(stream).toContain(
              '✋ ConstraintError: unknown argument: --force',
            );
          expect(result.stdout).not.toContain('matches no conflicted file');
          expect(getConflictFiles(scene)).toContain('src/a.md');
        },
      );

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
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

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
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

        then('matches snapshot', () => {
          expect(asStableOutput(result.stdout)).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case23c] conflicts on two files where one name holds the other',
    () => {
      const scene = useBeforeAll(async () => {
        const scene = genCatchupScene({
          slug: 'catchup-take-case23c',
          base: { 'x y.txt': 'xy: base\n', x: 'x: base\n' },
          ahead: { 'x y.txt': 'xy: branch\n', x: 'x: branch\n' },
        });
        moveMain({
          scene,
          files: { 'x y.txt': 'xy: main\n', x: 'x: main\n' },
          message: 'feat(src): edit x and x y',
        });
        const begin = runCatchup({ scene, args: ['begin', '--mode', 'apply'] });
        expect(begin.exitCode).toBe(2);
        return scene;
      });

      when("[t0] take --whos main 'x y.txt' x", () => {
        const result = useBeforeAll(async () =>
          runCatchup({
            scene,
            args: ['take', '--whos', 'main', 'x y.txt', 'x'],
          }),
        );

        then('exits 0 and takes both files, none skipped', () => {
          expect(result.exitCode).toBe(0);
          expect(readFileIn(scene, 'x y.txt')).toBe('xy: main\n');
          expect(readFileIn(scene, 'x')).toBe('x: main\n');
          expect(getConflictFiles(scene)).toBe('');
        });

        then('matches snapshot: the spaced name renders whole', () => {
          expect(asStableOutput(result.stdout)).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case23g] a conflict on a bracketed path, as a route dir holds',
    () => {
      const scene = useBeforeAll(async () => {
        const scene = genCatchupScene({
          slug: 'catchup-take-case23g',
          base: { 'app/[id]/page.tsx': 'page: base\n' },
          ahead: { 'app/[id]/page.tsx': 'page: branch\n' },
        });
        moveMain({
          scene,
          files: { 'app/[id]/page.tsx': 'page: main\n' },
          message: 'feat(app): edit the page',
        });
        const begin = runCatchup({ scene, args: ['begin', '--mode', 'apply'] });
        expect(begin.exitCode).toBe(2);
        return scene;
      });

      when(
        '[t0] take --whos main app/[id]/page.tsx, by name as printed',
        () => {
          const result = useBeforeAll(async () =>
            runCatchup({
              scene,
              args: ['take', '--whos', 'main', 'app/[id]/page.tsx'],
            }),
          );

          then(
            'exits 0; the file holds main and leaves the conflict set',
            () => {
              expect(result.exitCode).toBe(0);
              expect(readFileIn(scene, 'app/[id]/page.tsx')).toBe(
                'page: main\n',
              );
              expect(getConflictFiles(scene)).toBe('');
            },
          );

          then('matches snapshot: the bracketed name renders raw', () => {
            expect(asStableOutput(result.stdout)).toMatchSnapshot();
          });
        },
      );
    },
  );

  given(
    '[case23f] conflicts on a non-ASCII path and a glob-shaped path',
    () => {
      const scene = useBeforeAll(async () => {
        const scene = genCatchupScene({
          slug: 'catchup-take-case23f',
          base: { 'src/café.md': 'café: base\n', 'src/a[1].md': 'a1: base\n' },
          ahead: {
            'src/café.md': 'café: branch\n',
            'src/a[1].md': 'a1: branch\n',
          },
        });
        moveMain({
          scene,
          files: { 'src/café.md': 'café: main\n', 'src/a[1].md': 'a1: main\n' },
          message: 'feat(src): edit café and a1',
        });
        const begin = runCatchup({ scene, args: ['begin', '--mode', 'apply'] });
        expect(begin.exitCode).toBe(2);
        return scene;
      });

      when('[t0] take --whos main src/café.md', () => {
        const result = useBeforeAll(async () =>
          runCatchup({
            scene,
            args: ['take', '--whos', 'main', 'src/café.md'],
          }),
        );

        then('exits 0: the raw name matches its conflict', () => {
          expect(result.exitCode).toBe(0);
          expect(readFileIn(scene, 'src/café.md')).toBe('café: main\n');
        });

        then(
          'matches snapshot: the non-ASCII name renders raw, never quoted',
          () => {
            expect(asStableOutput(result.stdout)).toMatchSnapshot();
          },
        );
      });

      when('[t1] take --whos branch .', () => {
        const result = useBeforeAll(async () =>
          runCatchup({ scene, args: ['take', '--whos', 'branch', '.'] }),
        );

        then(
          'exits 0 and takes the glob-shaped path as one literal file',
          () => {
            expect(result.exitCode).toBe(0);
            expect(readFileIn(scene, 'src/a[1].md')).toBe('a1: branch\n');
            expect(getConflictFiles(scene)).toBe('');
          },
        );

        then(
          'matches snapshot: the glob-shaped name renders as one file',
          () => {
            expect(asStableOutput(result.stdout)).toMatchSnapshot();
          },
        );
      });
    },
  );

  given('[case23e] take run from a subdirectory', () => {
    const scene = useBeforeAll(async () =>
      genTextConflictScene({ slug: 'catchup-take-case23e' }),
    );

    when('[t0] take --whos main . from src/', () => {
      const result = useBeforeAll(async () =>
        runCatchup({
          scene,
          args: ['take', '--whos', 'main', '.'],
          subdir: 'src',
        }),
      );

      then('exits 0 and takes every conflict, as from the root', () => {
        expect(result.exitCode).toBe(0);
        expect(readFileIn(scene, 'src/a.md')).toBe('a: main\n');
        expect(readFileIn(scene, 'src/b.md')).toBe('b: main\n');
        expect(getConflictFiles(scene)).toBe('');
      });

      then('the settled list names paths from the repo root, not cwd', () => {
        expect(result.stdout).toContain('src/a.md ✓');
        expect(result.stdout).toContain('src/b.md ✓');
        expect(result.stdout).not.toMatch(/─ (\.\/)?a\.md ✓/);
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case26c] a hand merge of another branch in flight', () => {
    const scene = useBeforeAll(async () => {
      const scene = genCatchupScene({ slug: 'catchup-take-case26c' });
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

    when('[t0] take --whos main docs.md', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['take', '--whos', 'main', 'docs.md'] }),
      );

      then('exits 2 on both streams: not a catch-up; names abort', () => {
        expect(result.exitCode).toBe(2);
        for (const stream of [result.stdout, result.stderr]) {
          expect(stream).toContain('not a catch-up');
        }
        expect(result.stdout).toContain('rhx git.branch.catchup abort');
        expect(isMergeInFlight({ scene })).toBe(true);
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case23d] a conflict left, and stage is blocked', () => {
    const scene = useBeforeAll(async () => {
      const scene = genTextConflictScene({ slug: 'catchup-take-case23d' });
      writeMeter({ scene, uses: 4, stage: 'block' });
      return scene;
    });

    when('[t0] take --whos main src/a.md', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['take', '--whos', 'main', 'src/a.md'] }),
      );

      then('names the stage grant for the rest, never git.stage.add', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('a human grants stage');
        expect(result.stdout).toContain('--stage allow');
        expect(result.stdout).not.toContain('rhx git.stage.add');
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

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

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });
});
