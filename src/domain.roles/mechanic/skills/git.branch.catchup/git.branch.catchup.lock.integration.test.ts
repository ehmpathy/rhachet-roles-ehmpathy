import * as fs from 'fs';
import * as path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import {
  asStableOutput,
  genCatchupScene,
  getHeadFacts,
  readMeterUses,
  runCatchup,
  runGit,
} from './.test/genCatchupScene';
import {
  asManifest,
  genLockScene,
  getConflictFiles,
} from './.test/genLockScene';

/**
 * .what = integration tests for `git.branch.catchup lock refresh`
 * .why = proves the lockfile cure: take main's lock, refresh it against the
 *        merged manifest (which restores the branch's dep), and refuse while
 *        the manifest itself is unsettled
 */
describe('git.branch.catchup lock refresh', () => {
  given(
    '[case6] main adds dep b, the branch adds devDep b2; only the lock conflicts',
    () => {
      const scene = useBeforeAll(async () =>
        genLockScene({
          slug: 'catchup-lock-case6',
          mainManifest: asManifest({
            deps: { a: 'file:./pkgs/a', b: 'file:./pkgs/b' },
            devDeps: { c0: 'file:./pkgs/c0' },
          }),
          branchManifest: asManifest({
            deps: { a: 'file:./pkgs/a' },
            devDeps: { b2: 'file:./pkgs/b2', c0: 'file:./pkgs/c0' },
          }),
        }),
      );

      when('[t0] begin --mode apply', () => {
        const result = useBeforeAll(async () =>
          runCatchup({ scene, args: ['begin', '--mode', 'apply'] }),
        );

        then('exits 2; names pnpm-lock.yaml alone', () => {
          expect(result.exitCode).toBe(2);
          expect(getConflictFiles(scene)).toBe('pnpm-lock.yaml');
        });
      });

      when('[t1] take --whos main pnpm-lock.yaml', () => {
        const result = useBeforeAll(async () =>
          runCatchup({
            scene,
            args: ['take', '--whos', 'main', 'pnpm-lock.yaml'],
          }),
        );

        then('the lock is staged and nudges lock refresh', () => {
          expect(result.exitCode).toBe(0);
          expect(getConflictFiles(scene)).toBe('');
          expect(result.stdout).toContain(
            'rhx git.branch.catchup lock refresh',
          );
        });

        then('the lock holds main content: the branch dep is absent', () => {
          const lock = fs.readFileSync(
            path.join(scene.workDir, 'pnpm-lock.yaml'),
            'utf-8',
          );
          expect(lock).toContain('pkgs/b');
          expect(lock).not.toContain('pkgs/b2');
        });

        then('matches snapshot', () => {
          expect(asStableOutput(result.stdout)).toMatchSnapshot();
        });
      });

      when('[t2] lock refresh', () => {
        const result = useBeforeAll(async () =>
          runCatchup({ scene, args: ['lock', 'refresh'] }),
        );

        then(
          'exits 0; the lock holds both deps, with the branch dep restored',
          () => {
            expect(result.exitCode).toBe(0);
            const lock = fs.readFileSync(
              path.join(scene.workDir, 'pnpm-lock.yaml'),
              'utf-8',
            );
            expect(lock).toContain('pkgs/b2');
            expect(lock).toMatch(/pkgs\/b\b/);
          },
        );

        then('the lock is staged', () => {
          expect(
            runGit({ cwd: scene.workDir, args: ['diff', '--name-only'] }),
          ).not.toContain('pnpm-lock.yaml');
        });

        then('matches snapshot', () => {
          expect(asStableOutput(result.stdout)).toMatchSnapshot();
        });
      });

      when('[t3] continue', () => {
        const result = useBeforeAll(async () =>
          runCatchup({ scene, args: ['continue'] }),
        );

        then('the merge commit lands; meter −1', () => {
          expect(result.exitCode).toBe(0);
          expect(getHeadFacts({ scene }).parents).toBe(2);
          expect(readMeterUses({ scene })).toBe(3);
        });
      });
    },
  );

  given(
    '[case6b] main and the branch both add a dep at one spot; package.json conflicts too',
    () => {
      const scene = useBeforeAll(async () =>
        genLockScene({
          slug: 'catchup-lock-case6b',
          mainManifest: asManifest({
            deps: { a: 'file:./pkgs/a', b: 'file:./pkgs/b' },
            devDeps: { c0: 'file:./pkgs/c0' },
          }),
          branchManifest: asManifest({
            deps: { a: 'file:./pkgs/a', b2: 'file:./pkgs/b2' },
            devDeps: { c0: 'file:./pkgs/c0' },
          }),
        }),
      );

      when(
        '[t0] begin, take --whos main pnpm-lock.yaml, then lock refresh',
        () => {
          const result = useBeforeAll(async () => {
            const begin = runCatchup({
              scene,
              args: ['begin', '--mode', 'apply'],
            });
            expect(begin.exitCode).toBe(2);
            expect(getConflictFiles(scene)).toContain('package.json');
            runCatchup({
              scene,
              args: ['take', '--whos', 'main', 'pnpm-lock.yaml'],
            });
            const lockBefore = fs.readFileSync(
              path.join(scene.workDir, 'pnpm-lock.yaml'),
              'utf-8',
            );
            const run = runCatchup({ scene, args: ['lock', 'refresh'] });
            return { run, lockBefore };
          });

          then(
            'exits 2; names package.json as the file to settle first',
            () => {
              expect(result.run.exitCode).toBe(2);
              expect(result.run.stdout).toContain(
                '✋ ConstraintError: a manifest is still in conflict',
              );
              expect(result.run.stdout).toContain('package.json');
              expect(result.run.stderr).toContain(
                'a manifest is still in conflict',
              );
            },
          );

          then('the lock is not regenerated', () => {
            expect(
              fs.readFileSync(
                path.join(scene.workDir, 'pnpm-lock.yaml'),
                'utf-8',
              ),
            ).toBe(result.lockBefore);
          });

          then('matches snapshot', () => {
            expect(asStableOutput(result.run.stdout)).toMatchSnapshot();
          });
        },
      );
    },
  );

  given('[case26b] no merge in flight', () => {
    const scene = useBeforeAll(async () =>
      genCatchupScene({ slug: 'catchup-lock-case26b' }),
    );

    when('[t0] lock refresh', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['lock', 'refresh'] }),
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
