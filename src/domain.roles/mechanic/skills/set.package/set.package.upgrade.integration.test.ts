import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

/**
 * .what = integration tests for set.package.upgrade.sh skill
 * .why = verify package upgrade with security audit
 */
describe('set.package.upgrade.sh', () => {
  const scriptPath = path.join(__dirname, 'set.package.upgrade.sh');

  /**
   * .what = create temp directory with package.json and fake package managers
   * .why = isolate tests from real repo and avoid actual installs
   */
  const createTempDir = (options?: {
    withPackageLock?: boolean;
    withPackage?: { name: string; version: string; dev?: boolean };
  }): {
    tempDir: string;
    fakeBinDir: string;
    cleanup: () => void;
  } => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'set-package-test-'));
    const fakeBinDir = path.join(tempDir, '.fakebin');
    fs.mkdirSync(fakeBinDir, { recursive: true });

    // create package.json
    const pkgJson: Record<string, unknown> = {
      name: 'test-project',
      version: '1.0.0',
      dependencies: {},
      devDependencies: {},
    };

    if (options?.withPackage) {
      const key = options.withPackage.dev ? 'devDependencies' : 'dependencies';
      (pkgJson[key] as Record<string, string>)[options.withPackage.name] =
        options.withPackage.version;
    }

    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(pkgJson, null, 2),
    );

    // create package-lock.json if requested (signals npm repo)
    if (options?.withPackageLock) {
      fs.writeFileSync(
        path.join(tempDir, 'package-lock.json'),
        JSON.stringify({ lockfileVersion: 2 }, null, 2),
      );
    }

    // create fake pnpm that writes to package.json
    fs.writeFileSync(
      path.join(fakeBinDir, 'pnpm'),
      `#!/bin/bash
if [[ "$1" == "add" ]]; then
  PKG_NAME="\${@: -1}"
  PKG_NAME="\${PKG_NAME%@*}"  # strip version
  PKG_VERSION="\${@: -1}"
  PKG_VERSION="\${PKG_VERSION##*@}"  # get version
  # check if already in devDependencies, else use dependencies
  if jq -e ".devDependencies[\\"$PKG_NAME\\"]" package.json > /dev/null 2>&1; then
    jq ".devDependencies[\\"$PKG_NAME\\"] = \\"$PKG_VERSION\\"" package.json > package.json.tmp && mv package.json.tmp package.json
  else
    jq ".dependencies[\\"$PKG_NAME\\"] = \\"$PKG_VERSION\\"" package.json > package.json.tmp && mv package.json.tmp package.json
  fi
  exit 0
fi
exit 1
`,
    );
    fs.chmodSync(path.join(fakeBinDir, 'pnpm'), '755');

    // create fake npm that writes to package.json
    fs.writeFileSync(
      path.join(fakeBinDir, 'npm'),
      `#!/bin/bash
if [[ "$1" == "install" ]]; then
  PKG="\${@: -1}"
  PKG_NAME="\${PKG%@*}"
  PKG_VERSION="\${PKG##*@}"
  # check if already in devDependencies, else use dependencies
  if jq -e ".devDependencies[\\"$PKG_NAME\\"]" package.json > /dev/null 2>&1; then
    jq ".devDependencies[\\"$PKG_NAME\\"] = \\"$PKG_VERSION\\"" package.json > package.json.tmp && mv package.json.tmp package.json
  else
    jq ".dependencies[\\"$PKG_NAME\\"] = \\"$PKG_VERSION\\"" package.json > package.json.tmp && mv package.json.tmp package.json
  fi
  exit 0
fi
# passthrough npm view for version lookup - find real npm
for NPM_PATH in /usr/local/bin/npm /usr/bin/npm /opt/homebrew/bin/npm; do
  if [[ -x "$NPM_PATH" ]]; then
    exec "$NPM_PATH" "$@"
  fi
done
# fallback - remove fake bin from PATH and retry
PATH="\${PATH#*:}" exec npm "$@"
`,
    );
    fs.chmodSync(path.join(fakeBinDir, 'npm'), '755');

    return {
      tempDir,
      fakeBinDir,
      cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }),
    };
  };

  /**
   * .what = strip dynamic content from output for stable snapshots
   * .why = paths, dates, versions change between runs
   */
  const asStableOutput = (output: string): string => {
    return output
      .replace(/\/tmp\/[^\s]+/g, '/tmp/TEMP_DIR')
      .replace(/\d+\.\d+\.\d+/g, 'X.Y.Z');
  };

  /**
   * .what = run set.package.upgrade.sh
   * .why = standardize invocation and result capture
   */
  const runSkill = (
    args: string[],
    options?: {
      cwd?: string;
      fakeBinDir?: string;
    },
  ): { stdout: string; stderr: string; exitCode: number } => {
    const env = { ...process.env };
    if (options?.fakeBinDir) {
      env.PATH = `${options.fakeBinDir}:${process.env.PATH}`;
    }

    const result = spawnSync('bash', [scriptPath, ...args], {
      cwd: options?.cwd ?? process.cwd(),
      encoding: 'utf-8', // node.js API requirement
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  given('[case1] package installed, audit passes', () => {
    when('[t0] upgrade is called', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir({
        withPackage: { name: 'test-fns', version: '1.0.0' },
      });
      afterAll(() => cleanup());

      then('exit code is 0', () => {
        const result = runSkill(['--package', 'test-fns', '--to', '2.0.0'], {
          cwd: tempDir,
          fakeBinDir,
        });
        expect(result.exitCode).toBe(0);
      });

      then('version is updated', () => {
        runSkill(['--package', 'test-fns', '--to', '2.0.0'], {
          cwd: tempDir,
          fakeBinDir,
        });
        const pkgJson = JSON.parse(
          fs.readFileSync(path.join(tempDir, 'package.json'), 'utf-8'),
        );
        expect(pkgJson.dependencies['test-fns']).toBe('2.0.0');
      });

      then('output shows success', () => {
        // use test-fns which is installed
        const result = runSkill(['--package', 'test-fns', '--to', '2.1.0'], {
          cwd: tempDir,
          fakeBinDir,
        });
        expect(result.stdout).toContain('righteous!');
        expect(result.stdout).toContain('set.package.upgrade');
      });
    });
  });

  given('[case2] audit fails', () => {
    when('[t0] upgrade is called with vulnerable version', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir({
        withPackage: { name: 'lodash', version: '4.17.20' },
      });
      afterAll(() => cleanup());

      then('exit code is 2', () => {
        const result = runSkill(['--package', 'lodash', '--to', '4.17.0'], {
          cwd: tempDir,
          fakeBinDir,
        });
        // debug: print stderr if test fails
        if (result.exitCode !== 2) {
          console.log('DEBUG stderr:', result.stderr);
          console.log('DEBUG stdout:', result.stdout);
        }
        expect(result.exitCode).toBe(2);
      });

      then('version is not changed', () => {
        runSkill(['--package', 'lodash', '--to', '4.17.0'], {
          cwd: tempDir,
          fakeBinDir,
        });
        const pkgJson = JSON.parse(
          fs.readFileSync(path.join(tempDir, 'package.json'), 'utf-8'),
        );
        expect(pkgJson.dependencies['lodash']).toBe('4.17.20');
      });

      then('output shows bummer', () => {
        const result = runSkill(['--package', 'lodash', '--to', '4.17.0'], {
          cwd: tempDir,
          fakeBinDir,
        });
        expect(result.stderr).toContain('bummer dude');
      });
    });
  });

  given('[case3] package not installed', () => {
    when('[t0] upgrade is called for non-extant package', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());

      then('exit code is 2', () => {
        const result = runSkill(['--package', 'test-fns', '--to', '2.0.0'], {
          cwd: tempDir,
          fakeBinDir,
        });
        expect(result.exitCode).toBe(2);
      });

      then('error mentions use install', () => {
        const result = runSkill(['--package', 'test-fns', '--to', '2.0.0'], {
          cwd: tempDir,
          fakeBinDir,
        });
        expect(result.stderr).toContain('set.package.install');
      });
    });
  });

  given('[case4] --package omitted', () => {
    when('[t0] upgrade is called without --package', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());

      then('exit code is 2', () => {
        const result = runSkill(['--to', '2.0.0'], {
          cwd: tempDir,
          fakeBinDir,
        });
        expect(result.exitCode).toBe(2);
      });

      then('error mentions --package', () => {
        const result = runSkill(['--to', '2.0.0'], {
          cwd: tempDir,
          fakeBinDir,
        });
        expect(result.stderr).toContain('--package');
      });
    });
  });

  given('[case5] --to omitted', () => {
    when('[t0] upgrade is called without --to', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir({
        withPackage: { name: 'test-fns', version: '1.0.0' },
      });
      afterAll(() => cleanup());

      then('exit code is 2', () => {
        const result = runSkill(['--package', 'test-fns'], {
          cwd: tempDir,
          fakeBinDir,
        });
        expect(result.exitCode).toBe(2);
      });

      then('error mentions --to', () => {
        const result = runSkill(['--package', 'test-fns'], {
          cwd: tempDir,
          fakeBinDir,
        });
        expect(result.stderr).toContain('--to');
      });
    });
  });

  given('[case6] @latest version', () => {
    when('[t0] upgrade is called with @latest', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir({
        withPackage: { name: 'test-fns', version: '1.0.0' },
      });
      afterAll(() => cleanup());

      then('exit code is 0', () => {
        const result = runSkill(['--package', 'test-fns', '--to', '@latest'], {
          cwd: tempDir,
          fakeBinDir,
        });
        expect(result.exitCode).toBe(0);
      });

      then('actual version is installed', () => {
        const result = runSkill(['--package', 'test-fns', '--to', '@latest'], {
          cwd: tempDir,
          fakeBinDir,
        });
        // should NOT contain "@latest" in output — should be expanded
        expect(result.stdout).not.toContain('@latest');
        // should contain actual version like "1." or "2."
        expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
      });
    });
  });

  /**
   * .what = snapshot tests for all output variants
   * .why = enable vibe-check in PR reviews, detect unintended output changes
   */
  given('[snapshots] output formats', () => {
    when('[t0] success and error variants', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir({
        withPackage: { name: 'test-fns', version: '1.0.0' },
      });
      afterAll(() => cleanup());

      then('success output matches snapshot', () => {
        const result = runSkill(['--package', 'test-fns', '--to', '2.0.0'], {
          cwd: tempDir,
          fakeBinDir,
        });
        expect(asStableOutput(result.stdout)).toMatchSnapshot('success');
      });

      then('absent --package error matches snapshot', () => {
        const result = runSkill(['--to', '2.0.0'], {
          cwd: tempDir,
          fakeBinDir,
        });
        expect(asStableOutput(result.stderr)).toMatchSnapshot('absent-package');
      });

      then('absent --to error matches snapshot', () => {
        const result = runSkill(['--package', 'test-fns'], {
          cwd: tempDir,
          fakeBinDir,
        });
        expect(asStableOutput(result.stderr)).toMatchSnapshot('absent-to');
      });
    });

    when('[t1] security block', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir({
        withPackage: { name: 'lodash', version: '4.17.20' },
      });
      afterAll(() => cleanup());

      then('security block output matches snapshot', () => {
        const result = runSkill(['--package', 'lodash', '--to', '4.17.4'], {
          cwd: tempDir,
          fakeBinDir,
        });
        expect(asStableOutput(result.stderr)).toMatchSnapshot('security-block');
      });
    });

    when('[t2] not installed error', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());

      then('not installed error matches snapshot', () => {
        const result = runSkill(
          ['--package', 'not-installed-pkg', '--to', '1.0.0'],
          {
            cwd: tempDir,
            fakeBinDir,
          },
        );
        expect(asStableOutput(result.stderr)).toMatchSnapshot('not-installed');
      });
    });
  });
});
