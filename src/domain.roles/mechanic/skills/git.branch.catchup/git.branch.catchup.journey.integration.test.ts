import * as fs from 'fs';
import * as path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import {
  getConflictFiles,
  getHeadFacts,
  isMergeInFlight,
  readMeterUses,
  runCatchup,
  runGit,
} from './.test/genCatchupScene';
import { asManifest, genLockScene } from './.test/genLockScene';

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
        const result = useBeforeAll(async () => {
          const headBefore = getHeadFacts({ scene }).sha;
          const run = runCatchup({ scene, args: ['begin'] });
          return { run, headBefore };
        });

        then('exits 0 with a preview; meter 4 → 3 shown', () => {
          expect(result.run.exitCode).toBe(0);
          expect(result.run.stdout).toContain('behind: 1 commit');
          expect(result.run.stdout).toContain('left: 4 → 3');
        });

        then('HEAD, tree, and meter unchanged; no merge started', () => {
          expect(getHeadFacts({ scene }).sha).toBe(result.headBefore);
          expect(
            runGit({ cwd: scene.workDir, args: ['status', '--porcelain'] }),
          ).toBe('');
          expect(readMeterUses({ scene })).toBe(4);
          expect(isMergeInFlight({ scene })).toBe(false);
        });
      });

      when('[t1] begin --mode apply', () => {
        const result = useBeforeAll(async () =>
          runCatchup({ scene, args: ['begin', '--mode', 'apply'] }),
        );

        then('exits 2; names both conflicted files; merge in flight', () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('pnpm-lock.yaml');
          expect(result.stdout).toContain('src/spot.test.ts');
          expect(getConflictFiles(scene).split('\n').sort()).toEqual([
            'pnpm-lock.yaml',
            'src/spot.test.ts',
          ]);
          expect(isMergeInFlight({ scene })).toBe(true);
        });

        then('meter unchanged: a conflicted merge never commits', () => {
          expect(readMeterUses({ scene })).toBe(4);
        });
      });

      when('[t2] the test file settled by hand and staged; continue', () => {
        const result = useBeforeAll(async () => {
          fs.writeFileSync(
            path.join(scene.workDir, 'src/spot.test.ts'),
            'test: main + branch\n',
          );
          runGit({ cwd: scene.workDir, args: ['add', 'src/spot.test.ts'] });
          return runCatchup({ scene, args: ['continue'] });
        });

        then('exits 2; names only pnpm-lock.yaml; meter unchanged', () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('1 file still in conflict');
          expect(result.stdout).toContain('pnpm-lock.yaml');
          expect(result.stdout).not.toContain('src/spot.test.ts');
          expect(readMeterUses({ scene })).toBe(4);
        });
      });

      when('[t3] take --whos main pnpm-lock.yaml', () => {
        const result = useBeforeAll(async () =>
          runCatchup({
            scene,
            args: ['take', '--whos', 'main', 'pnpm-lock.yaml'],
          }),
        );

        then(
          'exits 0; the lock leaves the conflict set; nudges a refresh',
          () => {
            expect(result.exitCode).toBe(0);
            expect(getConflictFiles(scene)).toBe('');
            expect(result.stdout).toContain(
              'rhx git.branch.catchup lock refresh',
            );
          },
        );
      });

      when('[t4] lock refresh', () => {
        const result = useBeforeAll(async () =>
          runCatchup({ scene, args: ['lock', 'refresh'] }),
        );

        then('exits 0; the lock holds main deps and the branch bump', () => {
          expect(result.exitCode).toBe(0);
          const lock = fs.readFileSync(
            path.join(scene.workDir, 'pnpm-lock.yaml'),
            'utf-8',
          );
          expect(lock).toContain('pkgs/b2');
          expect(lock).toMatch(/pkgs\/b\b/);
        });
      });

      when('[t5] continue', () => {
        const result = useBeforeAll(async () => {
          const run = runCatchup({ scene, args: ['continue'] });
          return { run, head: getHeadFacts({ scene }) };
        });

        then('exits 0; HEAD is a 2-parent merge commit; meter 4 → 3', () => {
          expect(result.run.exitCode).toBe(0);
          expect(result.head.parents).toBe(2);
          expect(readMeterUses({ scene })).toBe(3);
        });

        then('seaturtle author; sponsor trailer; tree clean', () => {
          expect(result.head.author).toBe(
            'seaturtle[bot] <seaturtle@ehmpath.com>',
          );
          expect(result.head.message).toMatch(
            /Co-authored-by: Test Human <human@test\.com>$/,
          );
          expect(isMergeInFlight({ scene })).toBe(false);
          expect(
            runGit({ cwd: scene.workDir, args: ['status', '--porcelain'] }),
          ).toBe('');
        });

        then('names the plain push as the next move', () => {
          expect(result.run.stdout).toContain(
            'rhx git.commit.push --mode apply',
          );
        });
      });

      // a push with no --force refuses a non-fast-forward; git.commit.push needs a github pr
      when('[t6] a plain push, no force', () => {
        const result = useBeforeAll(async () => {
          const remoteBefore = runGit({
            cwd: scene.workDir,
            args: ['rev-parse', `origin/${scene.branch}`],
          });
          runGit({
            cwd: scene.workDir,
            args: ['push', '-q', 'origin', scene.branch],
          });
          return {
            remoteBefore,
            remote: runGit({
              cwd: scene.workDir,
              args: ['rev-parse', `origin/${scene.branch}`],
            }),
          };
        });

        then(
          'origin holds the merge commit; the prior head is its ancestor',
          () => {
            expect(result.remote).toBe(getHeadFacts({ scene }).sha);
            expect(
              runGit({
                cwd: scene.workDir,
                args: [
                  'rev-list',
                  '--count',
                  `${result.remote}..${result.remoteBefore}`,
                ],
              }),
            ).toBe('0');
          },
        );
      });

      when('[t7] begin --mode apply again', () => {
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
