import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = every PreToolUse gate fails closed when it crashes
 * .why = claude code reads any PreToolUse exit but 2 as a permit. a gate that dies on an
 *        unbound var, a bad subscript, or a failed command under `set -e` exits 1 — and lets the
 *        very call it guards through, in silence. each gate installs an EXIT trap that turns any
 *        exit but 0 or 2 into a named `💥 MalfunctionError` and exit 2
 * .note = the gate list is read from disk, so a new `pretooluse.*.sh` gate that lacks the trap
 *         fails here the day it lands
 */
describe('pretooluse gates fail closed on a crash', () => {
  const hooksDir = __dirname;
  const GATES = fs
    .readdirSync(hooksDir)
    .filter((name) => name.startsWith('pretooluse.') && name.endsWith('.sh'))
    .sort();

  /**
   * .what = copy a gate, inject a crash (`exit 7`) right after its trap, and run it
   * .why = a crash past the trap is the exact shape a real defect takes; the copy keeps the
   *        shipped file untouched
   */
  const runCrashedCopy = (input: {
    gate: string;
  }): {
    exitCode: number;
    stdout: string;
    stderr: string;
    injected: boolean;
  } => {
    const source = fs.readFileSync(path.join(hooksDir, input.gate), 'utf-8');
    const lines = source.split('\n');
    const trapIndex = lines.findIndex(
      (line) => line.startsWith('trap ') && line.trimEnd().endsWith(' EXIT'),
    );
    if (trapIndex < 0)
      return { exitCode: -1, stdout: '', stderr: '', injected: false };
    const crashed = [
      ...lines.slice(0, trapIndex + 1),
      'exit 7',
      ...lines.slice(trapIndex + 1),
    ];
    const dir = genTempDir({ slug: 'gate-crash', git: true });
    const copyPath = path.join(dir, input.gate);
    fs.writeFileSync(copyPath, crashed.join('\n'));
    // a gate sources its libs from beside itself, so the copy carries them along
    fs.readdirSync(hooksDir)
      .filter((name) => name.startsWith('_') && name.endsWith('.lib.sh'))
      .forEach((lib) =>
        fs.copyFileSync(path.join(hooksDir, lib), path.join(dir, lib)),
      );
    const result = spawnSync('bash', [copyPath], {
      cwd: dir,
      encoding: 'utf-8',
      input: JSON.stringify({
        tool_name: 'Bash',
        tool_input: { command: 'tree -L 1 src' },
      }),
    });
    return {
      exitCode: result.status ?? 1,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      injected: true,
    };
  };

  given('[case1] the gates on disk', () => {
    when('[t0] the gate list is collected', () => {
      then('there are gates to check, so the suite is not vacuous', () => {
        expect(GATES.length).toBeGreaterThanOrEqual(10);
        expect(GATES).toContain('pretooluse.check-permissions.sh');
      });
    });
  });

  given('[case2] each gate crashes past its trap', () => {
    GATES.forEach((gate) => {
      when(`[t0] ${gate} exits 7`, () => {
        then(
          'it carries an EXIT trap, blocks (exit 2), and names the crash on stderr',
          () => {
            const result = runCrashedCopy({ gate });
            expect(result.injected).toBe(true);
            expect(result.exitCode).toBe(2);
            expect(result.stderr).toContain('💥 MalfunctionError:');
            expect(result.stderr).toContain('crashed (exit 7)');
          },
        );
      });
    });
  });

  given('[case3] each gate source, read statically', () => {
    // .why = every error a human reads opens with its class (`✋ ConstraintError:` or
    //        `💥 MalfunctionError:`), per rule.require.qualified-error-headers. a gate that
    //        prints `🛑 BLOCKED:` or `ERROR:` makes the reader re-derive who must act.
    // .note = comment lines are skipped, so a note that cites the old openers stays legal
    const UNQUALIFIED = ['🛑', 'BLOCKED:', 'ERROR:', 'WARN:', '⚠️ '];
    const asUnqualifiedLines = (input: { source: string }): string[] =>
      input.source
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('#'))
        .filter((line) => UNQUALIFIED.some((opener) => line.includes(opener)));

    when('[t0] the check reads a known old opener', () => {
      then('the check is not vacuous — it flags the opener', () => {
        expect(
          asUnqualifiedLines({
            source: 'echo "🛑 BLOCKED: no surf today" >&2',
          }),
        ).toHaveLength(1);
      });
    });

    [...GATES, '_hardnudge.lib.sh'].forEach((gate) => {
      when(`[t1] ${gate} is read`, () => {
        then('no emitted line opens with an unqualified header', () => {
          const source = fs.readFileSync(path.join(hooksDir, gate), 'utf-8');
          expect(asUnqualifiedLines({ source })).toEqual([]);
        });
      });
    });
  });
});
