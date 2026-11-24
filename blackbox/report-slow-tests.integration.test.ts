import { genTempDir, given, then, useThen, when } from 'test-fns';

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * .what = run `.github/workflows/report-slow-tests.sh` on a jest --json report
 * .why = the ci shards call it after each run; its exit code gates the shard
 */
const runReport = (input: {
  report: unknown;
}): { code: number | null; stdout: string; summary: string } => {
  const dir = genTempDir({ slug: 'report-slow-tests' });
  const reportPath = path.join(dir, 'jest-results.json');
  const summaryPath = path.join(dir, 'summary.md');
  fs.writeFileSync(reportPath, JSON.stringify(input.report));
  const result = spawnSync(
    'bash',
    [
      path.join(
        __dirname,
        '..',
        '.github',
        'workflows',
        'report-slow-tests.sh',
      ),
      reportPath,
    ],
    {
      env: { ...process.env, GITHUB_STEP_SUMMARY: summaryPath },
      encoding: 'utf-8', // node api param name
    },
  );
  return {
    code: result.status,
    stdout: result.stdout ?? '',
    summary: fs.existsSync(summaryPath)
      ? fs.readFileSync(summaryPath, 'utf-8')
      : '',
  };
};

// jest's own status word for a skipped test
const STATUS_SKIPPED = 'pending';

describe('report-slow-tests.sh', () => {
  given('[case1] a shard whose only file had every test skipped', () => {
    when('[t0] the report runs', () => {
      const result = useThen('it runs', async () =>
        runReport({
          report: {
            testResults: [
              {
                name: '/w/brief.condense.integration.test.ts',
                startTime: 0,
                endTime: 0,
                assertionResults: [
                  { status: STATUS_SKIPPED },
                  { status: STATUS_SKIPPED },
                ],
              },
            ],
          },
        }),
      );
      then('it exits 0 and says no test ran', () => {
        expect(result.code).toBe(0);
        expect(result.summary).toContain('no test ran in 1 test files');
      });
    });
  });

  given(
    '[case2] a shard whose file ran, yet carries no duration fields',
    () => {
      when('[t0] the report runs', () => {
        const result = useThen('it runs', async () =>
          runReport({
            report: {
              testResults: [
                {
                  name: '/w/wave.integration.test.ts',
                  assertionResults: [{ status: 'passed' }],
                },
              ],
            },
          }),
        );
        then('it fails loud on the schema drift', () => {
          expect(result.code).toBe(1);
          expect(result.stdout).toContain(
            'parsed 0 durations from 1 test files that ran',
          );
        });
      });
    },
  );

  given('[case3] a shard whose file ran in 12s', () => {
    when('[t0] the report runs', () => {
      const result = useThen('it runs', async () =>
        runReport({
          report: {
            testResults: [
              {
                name: '/w/wave.integration.test.ts',
                startTime: 1000,
                endTime: 13000,
                assertionResults: [{ status: 'passed' }],
              },
            ],
          },
        }),
      );
      then('it exits 0 and ranks the file', () => {
        expect(result.code).toBe(0);
        expect(result.summary).toContain(
          '| 12s | /w/wave.integration.test.ts |',
        );
        expect(result.stdout).toContain(
          '::notice file=/w/wave.integration.test.ts::test duration: 12s',
        );
      });
    });
  });

  given('[case4] an empty shard', () => {
    when('[t0] the report runs', () => {
      const result = useThen('it runs', async () =>
        runReport({ report: { testResults: [] } }),
      );
      then('it exits 0 and says the shard was empty', () => {
        expect(result.code).toBe(0);
        expect(result.summary).toContain('0 test files');
      });
    });
  });
});
