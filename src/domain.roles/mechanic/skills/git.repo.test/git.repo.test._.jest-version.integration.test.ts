import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = verify the scope file list uses the path flag of the repo's jest
 * .why = jest ≤29 names it --testPathPattern, jest ≥30 --testPathPatterns.
 *        the file count and the file list must both use the right form,
 *        or a jest 29 repo shows "matched: N files" over an empty list.
 */
describe('git.repo.test.sh jest version', () => {
  const scriptPath = path.join(__dirname, 'git.repo.test.sh');

  /**
   * .what = run plan mode with --scope in a temp repo whose fake jest
   *         accepts only the path flag of the given major version
   * .why = the defect hid in the gap between two lookups: the file count
   *        and the file list. a fake that rejects the wrong form makes the
   *        list fail exactly where real jest of that major would
   */
  const runPlanWithScope = (args: { jestVersion: string }) => {
    const tempDir = genTempDir({ slug: 'jest-version-test', git: true });
    const major = Number.parseInt(args.jestVersion, 10);
    const acceptedFlag =
      major >= 30 ? '--testPathPatterns' : '--testPathPattern';
    const rejectedFlag =
      major >= 30 ? '--testPathPattern' : '--testPathPatterns';

    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(
        {
          name: 'test-repo',
          devDependencies: { jest: args.jestVersion },
          scripts: { 'test:unit': 'jest --config jest.unit.config.js' },
        },
        null,
        2,
      ),
    );
    fs.writeFileSync(
      path.join(tempDir, 'jest.unit.config.js'),
      `module.exports = { testMatch: ['**/*.test.js'] };`,
    );
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'src', 'example.test.js'),
      `describe('example', () => { it('passes', () => {}); });`,
    );

    // fake jest: lists files only for the flag its major version accepts
    // .note = a real jest rejects an unknown cli flag, so the fake does too
    const jestBinDir = path.join(tempDir, 'node_modules', '.bin');
    fs.mkdirSync(jestBinDir, { recursive: true });
    fs.writeFileSync(
      path.join(jestBinDir, 'jest'),
      `#!/bin/bash
for arg in "$@"; do
  if [[ "$arg" == "${rejectedFlag}" ]]; then
    echo "Unrecognized CLI Parameter: ${rejectedFlag}" >&2
    exit 1
  fi
done
if [[ "$*" == *"--listTests"* ]] && [[ "$*" == *"${acceptedFlag} example"* ]]; then
  # real jest lists paths under the repo root git reports, which the skill strips
  echo "$(git rev-parse --show-toplevel)/src/example.test.js"
  exit 0
fi
exit 1
`,
    );
    fs.chmodSync(path.join(jestBinDir, 'jest'), '755');

    spawnSync('git', ['add', '.'], { cwd: tempDir });
    spawnSync('git', ['commit', '-m', 'initial'], { cwd: tempDir });

    const result = spawnSync(
      'bash',
      [scriptPath, '--what', 'unit', '--scope', 'example', '--thorough'],
      {
        cwd: tempDir,
        encoding: 'utf-8' as const, // node api requires this exact string
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30_000,
      },
    );

    return {
      stdout: result.stdout ?? '',
      exitCode: result.status ?? 1,
    };
  };

  given('[case1] a repo on jest 29', () => {
    when('[t0] plan mode runs with --scope', () => {
      const result = useThen('skill executes', () =>
        runPlanWithScope({ jestVersion: '29.3.1' }),
      );

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('the count and the file list agree', () => {
        expect(result.stdout).toContain('matched: 1 files');
        expect(result.stdout).toContain('└─ src/example.test.js');
        expect(result.stdout).not.toContain('(none)');
      });

      then('stdout matches snapshot', () => {
        // trim, as the peer suites do, so a plan tree has one shape
        expect(result.stdout.trim()).toMatchSnapshot();
      });
    });
  });

  given('[case2] a repo on jest 30', () => {
    when('[t0] plan mode runs with --scope', () => {
      const result = useThen('skill executes', () =>
        runPlanWithScope({ jestVersion: '30.2.0' }),
      );

      then('the count and the file list agree', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('matched: 1 files');
        expect(result.stdout).toContain('└─ src/example.test.js');
      });

      then('stdout matches snapshot', () => {
        // trim, as the peer suites do, so a plan tree has one shape
        expect(result.stdout.trim()).toMatchSnapshot();
      });
    });
  });
});
