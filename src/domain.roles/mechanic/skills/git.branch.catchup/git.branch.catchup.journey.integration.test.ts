import * as fs from 'fs';
import * as path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import {
  getHeadFacts,
  isMergeInFlight,
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
 * .what = the full catch-up journey, end to end, in one temp repo
 * .why = proves the wish's outcome: a branch behind main, CONFLICTING on its
 *        lock and a test file, levels with main by one merge commit through
 *        paved verbs alone, then pushes plain with no force
 */
describe('git.branch.catchup journey', () => {
  given(
    '[case7] a pushed branch, CONFLICTING with main on the lock and a test file',
    () => {
      const scene = useBeforeAll(async () => {
        const scene = genLockScene({
          slug: 'catchup-journey-case7',
          base: { 'src/spot.test.ts': 'test: base\n' },
          mainManifest: asManifest({
            deps: { a: 'file:./pkgs/a', b: 'file:./pkgs/b' },
            devDeps: { c0: 'file:./pkgs/c0' },
          }),
          mainFiles: { 'src/spot.test.ts': 'test: main\n' },
          branchManifest: asManifest({
            deps: { a: 'file:./pkgs/a' },
            devDeps: { b2: 'file:./pkgs/b2', c0: 'file:./pkgs/c0' },
          }),
          branchFiles: { 'src/spot.test.ts': 'test: branch\n' },
        });

        // push the branch commit, so the final push proves a plain fast-forward
        runGit({
          cwd: scene.workDir,
          args: ['push', '-q', 'origin', scene.branch],
        });
        return scene;
      });

      when('[t0] begin (plan)', () => {
        const result = useBeforeAll(async () =>
          runCatchup({ scene, args: ['begin'] }),
        );

        then('exits 0 with a preview; no merge started', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('behind: 1 commit');
          expect(isMergeInFlight({ scene })).toBe(false);
        });
      });

      when('[t1] begin --mode apply', () => {
        const result = useBeforeAll(async () =>
          runCatchup({ scene, args: ['begin', '--mode', 'apply'] }),
        );

        then('exits 2; names both conflicted files', () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('pnpm-lock.yaml');
          expect(result.stdout).toContain('src/spot.test.ts');
          expect(getConflictFiles(scene).split('\n').sort()).toEqual([
            'pnpm-lock.yaml',
            'src/spot.test.ts',
          ]);
        });
      });

      when('[t2] continue, too soon', () => {
        const result = useBeforeAll(async () =>
          runCatchup({ scene, args: ['continue'] }),
        );

        then('exits 2: 2 files still in conflict', () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('2 files still in conflict');
        });
      });

      when('[t3] take --whos main pnpm-lock.yaml, then lock refresh', () => {
        const result = useBeforeAll(async () => ({
          take: runCatchup({
            scene,
            args: ['take', '--whos', 'main', 'pnpm-lock.yaml'],
          }),
          lock: runCatchup({ scene, args: ['lock', 'refresh'] }),
        }));

        then('both exit 0; the lock holds both deps', () => {
          expect(result.take.exitCode).toBe(0);
          expect(result.lock.exitCode).toBe(0);
          const lock = fs.readFileSync(
            path.join(scene.workDir, 'pnpm-lock.yaml'),
            'utf-8',
          );
          expect(lock).toContain('pkgs/b2');
          expect(lock).toMatch(/pkgs\/b\b/);
        });
      });

      when(
        '[t4] the test file settled by hand and staged, then continue',
        () => {
          const result = useBeforeAll(async () => {
            fs.writeFileSync(
              path.join(scene.workDir, 'src/spot.test.ts'),
              'test: main + branch\n',
            );
            runGit({ cwd: scene.workDir, args: ['add', 'src/spot.test.ts'] });
            return runCatchup({ scene, args: ['continue'] });
          });

          then('exits 0; HEAD is a 2-parent merge commit; meter −1', () => {
            expect(result.exitCode).toBe(0);
            expect(getHeadFacts({ scene }).parents).toBe(2);
            expect(readMeterUses({ scene })).toBe(3);
          });

          then('names the plain push as the next move', () => {
            expect(result.stdout).toContain('rhx git.commit.push --mode apply');
          });
        },
      );

      when('[t5] a plain push, no force', () => {
        const result = useBeforeAll(async () => {
          runGit({
            cwd: scene.workDir,
            args: ['push', '-q', 'origin', scene.branch],
          });
          return {
            remote: runGit({
              cwd: scene.workDir,
              args: ['rev-parse', `origin/${scene.branch}`],
            }),
          };
        });

        then('origin holds the merge commit; the push fast-forwarded', () => {
          expect(result.remote).toBe(getHeadFacts({ scene }).sha);
        });
      });

      when('[t6] begin again', () => {
        const result = useBeforeAll(async () =>
          runCatchup({ scene, args: ['begin', '--mode', 'apply'] }),
        );

        then('exits 0: already level; meter unchanged', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('already level');
          expect(readMeterUses({ scene })).toBe(3);
        });
      });
    },
  );
});
