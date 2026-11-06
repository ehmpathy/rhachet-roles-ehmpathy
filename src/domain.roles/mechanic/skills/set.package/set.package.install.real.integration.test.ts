import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { given, then, useThen, when } from 'test-fns';

/**
 * .what = the live audit block of set.package.install, against the real npm advisory api
 * .why  = proves the skill reads the real registry's answer shape and blocks on it
 *
 * .note = excluded from the default integration run (jest.integration.config.ts testMatch),
 *         so registry drift cannot redden ci; run it by hand, by name:
 *           npx jest -c jest.integration.config.ts --testMatch '<rootDir>/src/domain.roles/mechanic/skills/set.package/set.package.install.real.integration.test.ts'
 *         ruled in fulcrum F25 (director, 2026-11-04)
 */
describe('set.package.install.sh (real registry)', () => {
  const scriptPath = path.join(__dirname, 'set.package.install.sh');

  /**
   * .what = a temp npm project with no fake bins, so both legs run live
   */
  const genTempProject = (): { tempDir: string; cleanup: () => void } => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'set-package-real-'));
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(
        {
          name: 'test-project',
          version: '1.0.0',
          dependencies: {},
          devDependencies: {},
        },
        null,
        2,
      ),
    );
    fs.writeFileSync(
      path.join(tempDir, 'package-lock.json'),
      JSON.stringify({ lockfileVersion: 2 }, null, 2),
    );
    return {
      tempDir,
      cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }),
    };
  };

  /**
   * .what = mask the run-specific and registry-owned parts of a live audit block
   * .why = paths and versions vary per run; the count and rows are the registry's to revise
   */
  const asMaskedLiveBlock = (output: string): string =>
    output
      .replace(/\/tmp\/[^\s]+/g, '/tmp/TEMP_DIR')
      .replace(/\/home\/[^\s]+\/.route/g, '.route')
      .replace(/v\d{4}_\d{2}_\d{2}\.package\.install/g, 'vDATE.package.install')
      .replace(/\d+\.\d+\.\d+/g, 'X.Y.Z')
      .replace(/FAILED \(\d+ vulnerabilities\)/, 'FAILED (<N> vulnerabilities)')
      .replace(
        /(^ *[├└]─ (low|moderate|high|critical): .*\n?)+/m,
        (rows) =>
          `${rows.match(/^ */)?.[0] ?? ''}└─ <advisory rows, owned by the registry>\n`,
      );

  // lodash 4.17.0 carries long-published advisories, so the live registry blocks it
  given('[case1] a real block, no fake curl', () => {
    when('[t0] install is called for a known vulnerable version', () => {
      const { tempDir, cleanup } = genTempProject();
      afterAll(() => cleanup());
      const result = useThen('it runs', async () => {
        const run = spawnSync(
          'bash',
          [
            scriptPath,
            '--package',
            'lodash',
            '--at',
            '4.17.0',
            '--for',
            'prod',
            '--reason',
            'the real audit block',
          ],
          {
            cwd: tempDir,
            encoding: 'utf-8', // node.js api requirement
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );
        return {
          stdout: run.stdout ?? '',
          stderr: run.stderr ?? '',
          exitCode: run.status ?? 1,
        };
      });

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('the output reports the live advisories, one row each', () => {
        expect(result.stderr).toMatch(
          /audit: FAILED \([1-9]\d* vulnerabilities\)/,
        );
        expect(result.stderr).toMatch(
          /[├└]─ (low|moderate|high|critical): .*lodash/i,
        );
      });

      then('the live block render matches its snapshot, rows masked', () => {
        expect(asMaskedLiveBlock(result.stderr)).toMatchSnapshot();
      });

      then('naught is installed and package.json is unchanged', () => {
        const pkgJson = JSON.parse(
          fs.readFileSync(path.join(tempDir, 'package.json'), 'utf-8'),
        );
        expect(pkgJson.dependencies.lodash).toBeUndefined();
        expect(
          fs.existsSync(path.join(tempDir, 'node_modules', 'lodash')),
        ).toBe(false);
      });
    });
  });
});
