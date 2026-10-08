import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = integration tests for permissions.nudges.sh
 * .why = the skill is the one reader of the nudge ledger; the `--why` escalation and every
 *        pave decision read their evidence through it, so its counts must be exact
 */
describe('permissions.nudges.sh', () => {
  const scriptPath = path.join(__dirname, 'permissions.nudges.sh');
  const LEDGER_REL =
    '.agent/.cache/repo=ehmpathy/role=mechanic/skill=check-permissions/nudges.jsonl';

  /**
   * .what = run the skill in a temp git repo whose ledger holds the given lines
   * .note = `lines: null` writes no ledger at all
   */
  const runSkill = (input: {
    lines: string[] | null;
    args: string[];
  }): { stdout: string; stderr: string; exitCode: number } => {
    const dir = genTempDir({ slug: 'permissions-nudges', git: true });
    if (input.lines !== null) {
      fs.mkdirSync(path.dirname(path.join(dir, LEDGER_REL)), {
        recursive: true,
      });
      fs.writeFileSync(
        path.join(dir, LEDGER_REL),
        `${input.lines.join('\n')}\n`,
      );
    }
    const result = spawnSync('bash', [scriptPath, ...input.args], {
      cwd: dir,
      encoding: 'utf-8',
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  const asRow = (input: {
    head: string;
    kind: string;
    verdict: string;
  }): string =>
    JSON.stringify({
      at: '2026-10-07T00:00:00Z',
      part: `${input.head} reef`,
      head: input.head,
      kind: input.kind,
      verdict: input.verdict,
    });

  const LEDGER = [
    asRow({ head: 'sort', kind: 'novel', verdict: 'nudged' }),
    asRow({ head: 'sort', kind: 'novel', verdict: 'nudged' }),
    asRow({ head: 'sort', kind: 'novel', verdict: 'retried' }),
    asRow({ head: 'grep', kind: 'alt', verdict: 'nudged' }),
    asRow({ head: 'grep', kind: 'alt', verdict: 'nudged' }),
    asRow({ head: 'grep', kind: 'alt', verdict: 'retried' }),
    asRow({ head: 'grep', kind: 'alt', verdict: 'nudged' }),
    asRow({ head: 'tide', kind: 'novel', verdict: 'nudged' }),
  ];

  given('[case1] a ledger with nudges and retries', () => {
    when('[t0] the summary is asked for', () => {
      const result = useBeforeAll(async () =>
        runSkill({ lines: LEDGER, args: [] }),
      );

      then('it exits 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('it counts every part, and every retried row', () => {
        expect(result.stdout).toContain('nudged parts: 8');
        expect(result.stdout).toContain('retried through to a human: 2 (25%)');
      });

      then('the heads with no paved path rank by count', () => {
        const section =
          result.stdout.split('heads with no paved path')[1] ?? '';
        expect(section.indexOf('sort (3)')).toBeLessThan(
          section.indexOf('tide (1)'),
        );
        expect(section.split('heads nudged most')[0]).not.toContain('grep');
      });

      then('the whole report is snapshotted', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] --top 1 is asked for', () => {
      then('each list holds one head', () => {
        const result = runSkill({ lines: LEDGER, args: ['--top', '1'] });
        expect(result.stdout).toContain('sort (3)');
        expect(result.stdout).not.toContain('tide (1)');
      });
    });
  });

  given('[case2] a ledger with an unreadable row', () => {
    when('[t0] the summary is asked for', () => {
      then('the bad row is named and counted out, never fatal', () => {
        const result = runSkill({
          lines: [...LEDGER, '{ not json'],
          args: [],
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('💥 unreadable rows: 1');
        expect(result.stdout).toContain('nudged parts: 8');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case3] no ledger yet', () => {
    when('[t0] the summary is asked for', () => {
      then('it says none are recorded, and exits 0', () => {
        const result = runSkill({ lines: null, args: [] });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('no nudge recorded yet');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case4] a bad --top', () => {
    when('[t0] --top is not a positive whole number', () => {
      then('it names the fix on both streams, and exits 2', () => {
        const result = runSkill({ lines: LEDGER, args: ['--top', 'many'] });
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('✋ ConstraintError: --top');
        expect(result.stderr).toContain('✋ ConstraintError: --top');
        expect(result.stderr).toEqual(result.stdout);
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case5] a row whose verdict the hook never writes', () => {
    when('[t0] the summary is asked for', () => {
      // .why = the ledger contract is `verdict: nudged|retried`. a row from an older build
      //        (e.g. `bustthrough`) must stay visible, yet never inflate the retried share —
      //        the `--why` escalation reads that share as its trigger
      then(
        'it lists the verdict, and counts only `retried` as passed through',
        () => {
          const result = runSkill({
            lines: [
              ...LEDGER,
              asRow({ head: 'grep', kind: 'alt', verdict: 'bustthrough' }),
            ],
            args: [],
          });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('bustthrough (1)');
          expect(result.stdout).toContain(
            'retried through to a human: 2 (22%)',
          );
          expect(result.stdout).toMatchSnapshot();
        },
      );
    });
  });

  given(
    '[case7] an older ledger whose rows hold shell keywords as novel heads',
    () => {
      // 🔴 found on the live 5.3 walk: this repo's real ledger listed `do`, `done`, `for` under
      //    "heads with no paved path (pave these)". the hook writes no grammar row now, but a ledger
      //    written before that keeps them; the pave list must never ask a human to pave `done`
      when('[t0] the summary is asked for', () => {
        then(
          'no shell keyword is in the pave list; the real heads still are',
          () => {
            const result = runSkill({
              lines: [
                ...LEDGER,
                asRow({ head: 'done', kind: 'novel', verdict: 'nudged' }),
                asRow({ head: 'for', kind: 'novel', verdict: 'nudged' }),
                asRow({ head: 'fi', kind: 'novel', verdict: 'nudged' }),
              ],
              args: [],
            });
            expect(result.exitCode).toBe(0);
            const paveList = (
              result.stdout.split('heads with no paved path')[1] ?? ''
            ).split('heads nudged most')[0];
            expect(paveList).toContain('sort (3)');
            expect(paveList).not.toMatch(/─ (done|for|fi) \(/);
          },
        );
      });
    },
  );

  given('[case6] the render lib is absent beside the skill', () => {
    when('[t0] a copy of the skill runs alone', () => {
      then(
        'it names the class and the lib on both streams, and exits 1',
        () => {
          const dir = genTempDir({
            slug: 'permissions-nudges-nolib',
            git: true,
          });
          const scriptCopy = path.join(dir, 'permissions.nudges.sh');
          fs.copyFileSync(scriptPath, scriptCopy);
          const result = spawnSync('bash', [scriptCopy], {
            cwd: dir,
            encoding: 'utf-8',
          });
          expect(result.status).toBe(1);
          expect(result.stdout).toContain('💥 MalfunctionError');
          expect(result.stdout).toContain('_permissions.render.lib.sh');
          expect(result.stderr).toContain('💥 MalfunctionError');
          // .note = masked by pattern: the temp dir resolves through a symlink
          expect(
            result.stdout.replace(
              /\/\S*\/\.\.\/inits\//,
              '<skill-dir>/../inits/',
            ),
          ).toMatchSnapshot();
        },
      );
    });
  });
});
