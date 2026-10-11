import { spawnSync } from 'child_process';
import { chmodSync, mkdirSync, writeFileSync } from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = a gate that cannot parse its stdin fails OPEN, loud — whatever code jq exits with
 * .why = these gates once allowlisted jq's parse-error codes (2, 5). a jq release that exits
 *        4 fell through to the "unexpected failure" branch and blocked every tool call in the
 *        session. the jq program is a fixed literal that always compiles, so any nonzero
 *        status is a parse error; the gates now test not-success, never a code list.
 * .note = jq is stubbed on PATH to exit a chosen code, so this clamp holds across every
 *         future jq rather than only the one on this host
 */
describe('pretooluse gates · jq parse errors fail open, loud', () => {
  const GATES = [
    'pretooluse.forbid-cross-repo-access.sh',
    'pretooluse.forbid-shouted-readme.sh',
  ];
  const JQ_CODES = [2, 4, 5, 9];

  /**
   * .what = a dir whose `jq` exits the given code, to prepend to PATH
   *
   * .mock = jq, as a stub on PATH that drains stdin and exits a chosen code
   * .why = the defect this clamps lives in the codes a FUTURE jq may exit (a release that
   *        exits 4 once blocked every tool call). the host's jq exits one code for a parse
   *        error, so only a stub can walk 2, 4, 5, and 9 on one host
   * .real = `[case2]` below runs each gate against the host's REAL jq with the same
   *         unparseable stdin
   */
  const genJqStubDir = (input: { code: number }): string => {
    const dir = genTempDir({ slug: `jq-stub-${input.code}` });
    mkdirSync(path.join(dir, 'bin'), { recursive: true });
    const stub = path.join(dir, 'bin', 'jq');
    writeFileSync(stub, `#!/bin/sh\ncat >/dev/null\nexit ${input.code}\n`);
    chmodSync(stub, 0o755);
    return path.join(dir, 'bin');
  };

  GATES.forEach((gate) => {
    given(`[case1] ${gate} reads its stdin with a jq that fails`, () => {
      JQ_CODES.forEach((code) => {
        when(`[t0] jq exits ${code}`, () => {
          const result = useBeforeAll(async () => {
            const stubDir = genJqStubDir({ code });
            const spawned = spawnSync('bash', [path.join(__dirname, gate)], {
              encoding: 'utf-8',
              input: '{ not json',
              env: { ...process.env, PATH: `${stubDir}:${process.env.PATH}` },
            });
            return {
              exitCode: spawned.status ?? 1,
              stdout: spawned.stdout ?? '',
              stderr: spawned.stderr ?? '',
            };
          });

          then('the gate permits the call (exit 0)', () => {
            expect(result.exitCode).toEqual(0);
          });

          then(
            'it names the malfunction and the jq code on both streams',
            () => {
              expect(result.stderr).toContain('💥 MalfunctionError:');
              expect(result.stderr).toContain(`jq exit ${code}`);
              expect(result.stdout).toContain('💥 MalfunctionError:');
            },
          );

          then('the whole render matches snapshot', () => {
            expect({
              stdout: result.stdout,
              stderr: result.stderr,
            }).toMatchSnapshot();
          });
        });
      });
    });

    given(`[case2] ${gate} reads its stdin with the host's real jq`, () => {
      when('[t0] the stdin is unparseable', () => {
        const result = useBeforeAll(async () => {
          const spawned = spawnSync('bash', [path.join(__dirname, gate)], {
            encoding: 'utf-8',
            input: '{ not json',
          });
          return {
            exitCode: spawned.status ?? 1,
            stdout: spawned.stdout ?? '',
            stderr: spawned.stderr ?? '',
          };
        });

        then(
          'the gate permits the call (exit 0), the malfunction named',
          () => {
            expect(result.exitCode).toEqual(0);
            expect(result.stderr).toContain('💥 MalfunctionError:');
            expect(result.stderr).toMatch(/jq exit \d+/);
            expect(result.stdout).toContain('💥 MalfunctionError:');
          },
        );
      });
    });
  });
});
