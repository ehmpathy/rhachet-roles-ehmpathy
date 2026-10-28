import { spawn } from 'child_process';
import { createHash } from 'crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { asWriteJson } from './asWriteJson';
import { genHookTempCwd } from './genHookTempCwd';
import { runHookIn } from './runHookIn';

/**
 * .what = the guarantees of _hardnudge.lib.sh, proven through BOTH hooks that source it
 * .why = the lib is the one place the HARDNUDGE window, lock, and stamp live. each
 *        case runs against each hook, so a hook that stops to source the lib — or
 *        sources a stale copy — goes red here, never only in its own suite.
 */
describe('_hardnudge.lib.sh', () => {
  /**
   * .what = the two hooks that source the lib, each with a write that trips it
   * .note = the nudge file names stay separate per hook, so a gerund retry can
   *         never permit a blocklisted term
   */
  const HOOKS = [
    {
      name: 'pretooluse.forbid-terms.blocklist.sh',
      nudgeFileName: 'terms.blocklist.nudges.local.json',
      content: 'normalize the reef',
    },
    {
      name: 'pretooluse.forbid-terms.gerunds.sh',
      nudgeFileName: 'terms.gerunds.nudges.local.json',
      content: 'the surfer was paddling out',
    },
  ];

  /**
   * .what = the nudge key the lib derives for a file path
   * .why = a record seeded by hand must land on the key the hook reads
   */
  const asNudgeKey = (input: { filePath: string }): string =>
    createHash('sha256').update(input.filePath).digest('hex');

  /**
   * .what = run one hook, async, so several can race on one nudge file
   */
  const runHookAsync = (input: {
    hookPath: string;
    json: unknown;
    cwd: string;
  }): Promise<{ exitCode: number; stderr: string }> =>
    new Promise((resolve) => {
      const child = spawn('bash', [input.hookPath], { cwd: input.cwd });
      const chunks: string[] = [];
      child.stderr.on('data', (chunk) => chunks.push(String(chunk)));
      child.on('close', (code) =>
        resolve({ exitCode: code ?? 1, stderr: chunks.join('') }),
      );
      child.stdin.end(JSON.stringify(input.json));
    });

  HOOKS.forEach((hook) => {
    const hookPath = path.join(__dirname, hook.name);

    given(`[case1] ${hook.name}: the wall clock stepped back`, () => {
      // 🔴 a record stamped in the FUTURE gives a negative elapsed. the window
      //    check once read `elapsed < window`, which a negative value passes, so
      //    a clock that stepped back held the gate OPEN for that path until the
      //    clock caught up. a negative elapsed is no proof of a recent attempt.
      // .note = the dream it closes: hardnudge-window-keyed-to-a-wall-clock
      when('[t0] the path holds a record one hour ahead of now', () => {
        const scene = useBeforeAll(async () => {
          const cwd = genHookTempCwd({
            slug: 'hardnudge-clock',
            nudgeFileName: null,
          });
          const filePath = 'wave.md';
          const future = Math.floor(Date.now() / 1000) + 3600;
          writeFileSync(
            path.join(cwd, '.claude', hook.nudgeFileName),
            JSON.stringify({
              [asNudgeKey({ filePath })]: {
                time: future,
                path: filePath,
                terms: [],
              },
            }),
          );
          const result = runHookIn({
            hookPath,
            json: asWriteJson({ filePath, content: hook.content }),
            cwd,
          });
          const record = JSON.parse(
            readFileSync(
              path.join(cwd, '.claude', hook.nudgeFileName),
              'utf-8',
            ),
          )[asNudgeKey({ filePath })];
          return { result, record, future };
        });

        then('the hook exits 2 — the write blocks', () => {
          expect(scene.result.exitCode).toEqual(2);
          expect(scene.result.stderr).toContain('✋ ConstraintError');
        });

        then('the stamp restarts the clock at now', () => {
          expect(scene.record.time).toBeLessThan(scene.future);
        });
      });
    });

    given(
      `[case2] ${hook.name}: many first writes race on one nudge file`,
      () => {
        // 🔴 each first write reads the nudge file, adds its record, and moves the
        //    result back. two at once, unlocked, let the later move erase the
        //    earlier record — and that path's deliberate retry then re-blocks.
        when('[t0] twelve hooks stamp twelve paths at once', () => {
          const scene = useBeforeAll(async () => {
            const cwd = genHookTempCwd({
              slug: 'hardnudge-race',
              nudgeFileName: hook.nudgeFileName,
            });
            const filePaths = Array.from(
              { length: 12 },
              (_, index) => `wave-${index}.md`,
            );
            const results = await Promise.all(
              filePaths.map((filePath) =>
                runHookAsync({
                  hookPath,
                  json: asWriteJson({ filePath, content: hook.content }),
                  cwd,
                }),
              ),
            );
            const records = JSON.parse(
              readFileSync(
                path.join(cwd, '.claude', hook.nudgeFileName),
                'utf-8',
              ),
            );
            return { cwd, filePaths, results, records };
          });

          then('every hook blocks', () => {
            expect(scene.results.map((result) => result.exitCode)).toEqual(
              scene.filePaths.map(() => 2),
            );
          });

          then('every path holds its record — none was erased', () => {
            // .why = each absent path carries its hook's stderr, where the lib names the cause
            //        of a lost stamp (a wait past the cap, a lock taken over)
            const absent = scene.filePaths
              .map((filePath, index) => ({
                filePath,
                stderr: scene.results[index]?.stderr ?? '',
              }))
              .filter(
                ({ filePath }) => !scene.records[asNudgeKey({ filePath })],
              );
            expect(absent).toEqual([]);
          });

          then('no lock is left behind', () => {
            expect(
              existsSync(
                path.join(scene.cwd, '.claude', `${hook.nudgeFileName}.lock`),
              ),
            ).toEqual(false);
          });
        });
      },
    );

    given(`[case6] ${hook.name}: a live holder keeps the lock for 4s`, () => {
      // 🔴 a waiter gave up its stamp after ~2s on a LIVE holder. a full suite on a
      //    loaded box can serialize twelve writers past that, and each one past it
      //    loses its stamp, as the race case above checks. the wait now spans the
      //    hook's own budget
      when('[t0] a first write arrives while the lock is held', () => {
        const scene = useBeforeAll(async () => {
          const cwd = genHookTempCwd({
            slug: 'hardnudge-held',
            nudgeFileName: hook.nudgeFileName,
          });
          const lockDir = path.join(
            cwd,
            '.claude',
            `${hook.nudgeFileName}.lock`,
          );

          // a live holder: take the lock, mark it with its pid, hold 4s, release
          const holder = spawn('bash', [
            '-c',
            `mkdir "${lockDir}" && echo $$ > "${lockDir}/pid" && sleep 4 && rm -f "${lockDir}/pid" && rmdir "${lockDir}"`,
          ]);
          const holderDone = new Promise((resolve) =>
            holder.on('close', resolve),
          );
          while (!existsSync(path.join(lockDir, 'pid')))
            await new Promise((resolve) => setTimeout(resolve, 20));

          const filePath = 'wave-held.md';
          const result = await runHookAsync({
            hookPath,
            json: asWriteJson({ filePath, content: hook.content }),
            cwd,
          });
          await holderDone;
          const records = JSON.parse(
            readFileSync(
              path.join(cwd, '.claude', hook.nudgeFileName),
              'utf-8',
            ),
          );
          return { result, record: records[asNudgeKey({ filePath })] ?? null };
        });

        then('the hook exits 2 — the write blocks', () => {
          expect(scene.result.exitCode).toEqual(2);
        });

        then('the stamp lands once the holder releases', () => {
          expect({
            stamped: scene.record !== null,
            gaveUp: scene.result.stderr.includes('past the wait'),
            stderr: scene.result.stderr,
          }).toEqual({
            stamped: true,
            gaveUp: false,
            stderr: scene.result.stderr,
          });
        });
      });
    });

    given(`[case3] ${hook.name}: a crashed hook left its lock behind`, () => {
      // .why = a lock that outlives its hook must not freeze the stamp forever;
      //        after ~1s it counts as stale and is taken over once
      when('[t0] a first write runs beside the stale lock', () => {
        const scene = useBeforeAll(async () => {
          const cwd = genHookTempCwd({
            slug: 'hardnudge-stale-lock',
            nudgeFileName: hook.nudgeFileName,
          });
          mkdirSync(path.join(cwd, '.claude', `${hook.nudgeFileName}.lock`));
          const filePath = 'wave.md';
          const result = runHookIn({
            hookPath,
            json: asWriteJson({ filePath, content: hook.content }),
            cwd,
          });
          const records = JSON.parse(
            readFileSync(
              path.join(cwd, '.claude', hook.nudgeFileName),
              'utf-8',
            ),
          );
          return { cwd, filePath, result, records };
        });

        then('the hook blocks, with no lock warn', () => {
          expect(scene.result.exitCode).toEqual(2);
          expect(scene.result.stderr).not.toContain('MalfunctionError');
        });

        then('the stamp lands, so the retry will pass', () => {
          expect(
            scene.records[asNudgeKey({ filePath: scene.filePath })],
          ).toBeDefined();
        });

        then('the lock is released after', () => {
          expect(
            existsSync(
              path.join(scene.cwd, '.claude', `${hook.nudgeFileName}.lock`),
            ),
          ).toEqual(false);
        });
      });
    });

    given(`[case5] ${hook.name}: a LIVE hook holds the lock`, () => {
      // 🔴 the lock once took over any lock older than ~1s, alive or not. under load a
      //    live holder's read-modify-write outlasts that, the waiter stole its lock, and
      //    two writers raced on the record. now a lock is taken over only from a holder
      //    whose pid is gone; a live holder is waited out, then the stamp is given up.
      // .note = the holder pid is this test process: alive for the whole run
      when(
        '[t0] a first write runs beside a lock marked with a live pid',
        () => {
          const scene = useBeforeAll(async () => {
            const cwd = genHookTempCwd({
              slug: 'hardnudge-live-lock',
              nudgeFileName: hook.nudgeFileName,
            });
            const lockDir = path.join(
              cwd,
              '.claude',
              `${hook.nudgeFileName}.lock`,
            );
            mkdirSync(lockDir);
            writeFileSync(path.join(lockDir, 'pid'), `${process.pid}\n`);
            const result = runHookIn({
              hookPath,
              json: asWriteJson({ filePath: 'wave.md', content: hook.content }),
              cwd,
            });
            return { lockDir, result };
          });

          then('the hook blocks — the verdict never waits on the lock', () => {
            expect(scene.result.exitCode).toEqual(2);
            expect(scene.result.stderr).toContain('✋ ConstraintError');
          });

          then(
            'the stamp is given up, and the warn names the live holder',
            () => {
              expect(scene.result.stderr).toContain(
                'its lock stayed held by a live hook past the wait',
              );
            },
          );

          then("the live holder's lock is never stolen", () => {
            expect(existsSync(path.join(scene.lockDir, 'pid'))).toEqual(true);
            expect(
              readFileSync(path.join(scene.lockDir, 'pid'), 'utf-8'),
            ).toEqual(`${process.pid}\n`);
          });
        },
      );
    });

    given(`[case4] ${hook.name}: the lib is absent beside the hook`, () => {
      // 🔴 a hook that cannot load its lib must block, loud. claude code reads
      //    any PreToolUse exit but 2 as a permit, so a quiet failure here would
      //    open the gate for every write.
      when('[t0] a hook copy runs with no lib beside it', () => {
        const scene = useBeforeAll(async () => {
          const dir = genTempDir({ slug: 'hardnudge-nolib' });
          mkdirSync(path.join(dir, '.claude'), { recursive: true });
          copyFileSync(hookPath, path.join(dir, hook.name));
          return runHookIn({
            hookPath: path.join(dir, hook.name),
            json: asWriteJson({ filePath: 'wave.md', content: 'calm seas' }),
            cwd: dir,
          });
        });

        then('the hook exits 2', () => {
          expect(scene.exitCode).toEqual(2);
        });

        then('stderr names the class and the absent lib', () => {
          expect(scene.stderr).toContain('💥 MalfunctionError');
          expect(scene.stderr).toContain('_hardnudge.lib.sh');
        });

        then('the whole refusal matches snapshot', () => {
          // .note = masked by pattern: the temp dir resolves through a symlink
          expect(
            scene.stderr.replace(
              /\/\S*\/_hardnudge\.lib\.sh/,
              '<hook-dir>/_hardnudge.lib.sh',
            ),
          ).toMatchSnapshot();
        });
      });
    });
  });
});
