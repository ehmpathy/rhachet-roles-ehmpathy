import * as fs from 'fs';
import * as path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import {
  asStableOutput,
  genCatchupScene,
  getConflictFiles,
  getHeadFacts,
  moveMain,
  readMeterUses,
  runCatchup,
  runGit,
} from './.test/genCatchupScene';
import {
  asManifest,
  genLockScene,
  LOCK_ENV_OF_PM,
  LOCK_FILE_OF_PM,
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

      when('[t2b] lock refresh again, on the settled lock', () => {
        const result = useBeforeAll(async () => {
          const lockBefore = fs.readFileSync(
            path.join(scene.workDir, 'pnpm-lock.yaml'),
            'utf-8',
          );
          const run = runCatchup({ scene, args: ['lock', 'refresh'] });
          const lockAfter = fs.readFileSync(
            path.join(scene.workDir, 'pnpm-lock.yaml'),
            'utf-8',
          );
          return { run, lockBefore, lockAfter };
        });

        then('exits 0; the lock is unchanged and still staged', () => {
          expect(result.run.exitCode).toBe(0);
          expect(result.lockAfter).toBe(result.lockBefore);
          expect(
            runGit({ cwd: scene.workDir, args: ['diff', '--name-only'] }),
          ).not.toContain('pnpm-lock.yaml');
        });

        then('matches snapshot', () => {
          expect(asStableOutput(result.run.stdout)).toMatchSnapshot();
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

  // the same journey under npm and yarn, each the real cli. yarn runs through
  // corepack where the host has no global yarn (LOCK_ENV_OF_PM)
  for (const pm of ['npm', 'yarn'] as const)
    given(
      `[case6-${pm}] a ${pm} repo: main adds dep b, the branch adds devDep b2`,
      () => {
        const lockFile = LOCK_FILE_OF_PM[pm];
        const env = LOCK_ENV_OF_PM[pm];
        const scene = useBeforeAll(async () =>
          genLockScene({
            slug: `catchup-lock-case6-${pm}`,
            pm,
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

        when(
          `[t0] begin, take --whos main ${pm}'s lock, then lock refresh`,
          () => {
            const result = useBeforeAll(async () => {
              const begin = runCatchup({
                scene,
                args: ['begin', '--mode', 'apply'],
                env,
              });
              const conflicts = getConflictFiles(scene);
              const take = runCatchup({
                scene,
                args: ['take', '--whos', 'main', lockFile],
                env,
              });
              const refresh = runCatchup({
                scene,
                args: ['lock', 'refresh'],
                env,
              });
              const lock = fs.readFileSync(
                path.join(scene.workDir, lockFile),
                'utf-8',
              );
              return { begin, conflicts, take, refresh, lock };
            });

            then(`begin stops on ${pm}'s lockfile alone`, () => {
              expect(result.begin.exitCode).toBe(2);
              expect(result.conflicts).toBe(lockFile);
            });

            then(`refresh exits 0, names ${pm}, and stages the lock`, () => {
              expect(result.take.exitCode).toBe(0);
              expect(result.refresh.exitCode).toBe(0);
              expect(result.refresh.stdout).toContain(`package manager: ${pm}`);
              expect(
                runGit({ cwd: scene.workDir, args: ['diff', '--name-only'] }),
              ).not.toContain(lockFile);
            });

            then(
              'the refreshed lock holds main dep b and the branch dep b2',
              () => {
                expect(result.lock).toContain('pkgs/b2');
                expect(result.lock).toMatch(/pkgs\/b\b/);
              },
            );

            // each pm names its own lockfile and install line
            then(
              `matches snapshot: the take and refresh renders under ${pm}`,
              () => {
                expect(asStableOutput(result.take.stdout)).toMatchSnapshot(
                  'take',
                );
                expect(asStableOutput(result.refresh.stdout)).toMatchSnapshot(
                  'refresh',
                );
              },
            );
          },
        );

        when('[t1] continue', () => {
          const result = useBeforeAll(async () =>
            runCatchup({ scene, args: ['continue'], env }),
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

  given(
    "[case6c] main's lock taken, and the package manager is gone from PATH",
    () => {
      const scene = useBeforeAll(async () => {
        const scene = genLockScene({
          slug: 'catchup-lock-case6c',
          mainManifest: asManifest({
            deps: { a: 'file:./pkgs/a', b: 'file:./pkgs/b' },
            devDeps: { c0: 'file:./pkgs/c0' },
          }),
          branchManifest: asManifest({
            deps: { a: 'file:./pkgs/a' },
            devDeps: { b2: 'file:./pkgs/b2', c0: 'file:./pkgs/c0' },
          }),
        });
        runCatchup({ scene, args: ['begin', '--mode', 'apply'] });
        runCatchup({
          scene,
          args: ['take', '--whos', 'main', 'pnpm-lock.yaml'],
        });
        return scene;
      });

      when('[t0] lock refresh, with each PATH dir that holds pnpm cut', () => {
        const result = useBeforeAll(async () => {
          const lockBefore = fs.readFileSync(
            path.join(scene.workDir, 'pnpm-lock.yaml'),
            'utf-8',
          );
          const pathSansPnpm = (process.env.PATH ?? '')
            .split(path.delimiter)
            .filter((dir) => !fs.existsSync(path.join(dir, 'pnpm')))
            .join(path.delimiter);
          const run = runCatchup({
            scene,
            args: ['lock', 'refresh'],
            env: { PATH: pathSansPnpm },
          });
          return { run, lockBefore };
        });

        then('exits 2 on both streams; names pnpm and the lockfile', () => {
          expect(result.run.exitCode).toBe(2);
          for (const stream of [result.run.stdout, result.run.stderr])
            expect(stream).toContain(
              '✋ ConstraintError: pnpm not found on PATH',
            );
          expect(result.run.stdout).toContain('lockfile: pnpm-lock.yaml');
          expect(result.run.stdout).toContain(
            'fix: install pnpm, then lock refresh again',
          );
        });

        then('the lock is untouched', () => {
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
      });

      when(
        '[t1] lock refresh, where the merged manifest names a package that is absent',
        () => {
          const result = useBeforeAll(async () => {
            const manifest = asManifest({
              deps: {
                a: 'file:./pkgs/a',
                b: 'file:./pkgs/b',
                reef: 'file:./pkgs/reef-absent',
              },
              devDeps: { b2: 'file:./pkgs/b2', c0: 'file:./pkgs/c0' },
            });
            fs.writeFileSync(
              path.join(scene.workDir, 'package.json'),
              manifest,
            );
            runGit({ cwd: scene.workDir, args: ['add', 'package.json'] });
            return runCatchup({ scene, args: ['lock', 'refresh'] });
          });

          then(
            'exits 1 on both streams: pnpm could not refresh the lockfile',
            () => {
              expect(result.exitCode).toBe(1);
              for (const stream of [result.stdout, result.stderr])
                expect(stream).toContain(
                  '💥 MalfunctionError: pnpm could not refresh the lockfile',
                );
              expect(result.stdout).toContain(
                'ran: pnpm install --lockfile-only',
              );
              expect(result.stdout).toMatch(/├─ exit: [1-9]/);
            },
          );

          then("pnpm's own words ride as output leaves", () => {
            expect(result.stdout).toContain('└─ output');
            expect(result.stdout).toMatch(/reef-absent/);
          });

          then('the merge stays in flight', () => {
            expect(
              runGit({
                cwd: scene.workDir,
                args: ['rev-parse', '-q', '--verify', 'MERGE_HEAD'],
              }),
            ).not.toBe('');
          });

          // pnpm words its own failure, and may reword it; the snap pins the frame
          then('matches snapshot, with the output leaves masked', () => {
            const frame = asStableOutput(result.stdout).split('└─ output')[0];
            expect(
              `${frame}└─ output\n      └─ <pnpm output>\n`,
            ).toMatchSnapshot();
          });
        },
      );
    },
  );

  given('[case26c] a hand merge of another branch in flight', () => {
    const scene = useBeforeAll(async () => {
      const scene = genCatchupScene({ slug: 'catchup-lock-case26c' });
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

    when('[t0] lock refresh', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['lock', 'refresh'] }),
      );

      then('exits 2 on both streams: not a catch-up; names abort', () => {
        expect(result.exitCode).toBe(2);
        for (const stream of [result.stdout, result.stderr]) {
          expect(stream).toContain('not a catch-up');
        }
        expect(result.stdout).toContain('rhx git.branch.catchup abort');
      });

      then('matches snapshot: under the lock refresh header', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case26d] a merge of origin/main in flight on main itself', () => {
    const scene = useBeforeAll(async () => {
      const scene = genCatchupScene({ slug: 'catchup-lock-case26d' });
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

    when('[t0] lock refresh', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['lock', 'refresh'] }),
      );

      then('exits 2 on both streams: will not catch up main', () => {
        expect(result.exitCode).toBe(2);
        for (const stream of [result.stdout, result.stderr]) {
          expect(stream).toContain(
            '✋ ConstraintError: will not catch up main',
          );
        }
      });

      then('matches snapshot: under the lock refresh header', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case26b] no merge in flight', () => {
    const scene = useBeforeAll(async () =>
      genCatchupScene({ slug: 'catchup-lock-case26b' }),
    );

    when('[t0] lock refresh', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['lock', 'refresh'] }),
      );

      then('exits 2 on both streams: no merge in flight', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: no merge in flight',
        );
        expect(result.stderr).toContain(
          '✋ ConstraintError: no merge in flight',
        );
      });

      then('matches snapshot: the lock refresh header', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] lock with no subcommand', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['lock'] }),
      );

      then('exits 2; names refresh as the one subcommand', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: lock needs the subcommand refresh (got: none)',
        );
        expect(result.stdout).toContain('rhx git.branch.catchup lock refresh');
      });

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case26c] a merge in flight, in a repo with no lockfile', () => {
    const scene = useBeforeAll(async () => {
      const scene = genCatchupScene({
        slug: 'catchup-lock-case26c',
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
      return scene;
    });

    when('[t0] lock refresh', () => {
      const result = useBeforeAll(async () =>
        runCatchup({ scene, args: ['lock', 'refresh'] }),
      );

      then('exits 2 on both streams; names the lockfiles it looked for', () => {
        expect(result.exitCode).toBe(2);
        for (const stream of [result.stdout, result.stderr]) {
          expect(stream).toContain('✋ ConstraintError: no lockfile found');
          expect(stream).toContain(
            'pnpm-lock.yaml, package-lock.json, yarn.lock',
          );
        }
      });

      then(
        'changes naught: the conflict stays for take or a hand settle',
        () => {
          expect(getConflictFiles(scene)).toBe('src/a.md');
        },
      );

      then('matches snapshot', () => {
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });
});
