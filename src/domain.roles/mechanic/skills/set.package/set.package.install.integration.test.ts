import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

/**
 * .what = integration tests for set.package.install.sh skill
 * .why = verify package install with security audit and reason documentation
 */
describe('set.package.install.sh', () => {
  const scriptPath = path.join(__dirname, 'set.package.install.sh');

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
  DEV_FLAG=""
  if [[ "$*" == *"-D"* ]]; then
    DEV_FLAG=".devDependencies"
  else
    DEV_FLAG=".dependencies"
  fi
  jq "$DEV_FLAG[\\"$PKG_NAME\\"] = \\"$PKG_VERSION\\"" package.json > package.json.tmp && mv package.json.tmp package.json
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
  DEV_FLAG=""
  if [[ "$*" == *"--save-dev"* ]]; then
    DEV_FLAG=".devDependencies"
  else
    DEV_FLAG=".dependencies"
  fi
  jq "$DEV_FLAG[\\"$PKG_NAME\\"] = \\"$PKG_VERSION\\"" package.json > package.json.tmp && mv package.json.tmp package.json
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
      .replace(/\/home\/[^\s]+\/.route/g, '.route')
      .replace(/v\d{4}_\d{2}_\d{2}\.package\.install/g, 'vDATE.package.install')
      .replace(/\d+\.\d+\.\d+/g, 'X.Y.Z');
  };

  /**
   * .what = run set.package.install.sh
   * .why = standardize invocation and result capture
   */
  const runSkill = (
    args: string[],
    options?: {
      cwd?: string;
      fakeBinDir?: string;
      stdin?: string;
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
      input: options?.stdin,
      env,
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  given('[case1] all flags valid, audit passes', () => {
    when('[t0] install is called', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());

      then('exit code is 0', () => {
        const result = runSkill(
          [
            '--package',
            'test-fns',
            '--at',
            '1.0.0',
            '--for',
            'prod',
            '--reason',
            'test reason',
          ],
          { cwd: tempDir, fakeBinDir },
        );
        expect(result.exitCode).toBe(0);
      });

      then('reason file is created', () => {
        runSkill(
          [
            '--package',
            'test-fns',
            '--at',
            '1.0.0',
            '--for',
            'prod',
            '--reason',
            'test reason',
          ],
          { cwd: tempDir, fakeBinDir },
        );

        // .route/v{date}.package.install/3.reason.for_{pkg}.v1.i1.md
        const routeBase = path.join(tempDir, '.route');
        expect(fs.existsSync(routeBase)).toBe(true);

        const versionDirs = fs.readdirSync(routeBase);
        expect(versionDirs.length).toBeGreaterThan(0);

        const versionDir = path.join(routeBase, versionDirs[0]!);
        const reasonFiles = fs
          .readdirSync(versionDir)
          .filter((f) => f.includes('reason'));
        expect(reasonFiles.length).toBe(1);
      });

      then('package is in package.json', () => {
        runSkill(
          [
            '--package',
            'test-fns',
            '--at',
            '1.0.0',
            '--for',
            'prod',
            '--reason',
            'test reason',
          ],
          { cwd: tempDir, fakeBinDir },
        );
        const pkgJson = JSON.parse(
          fs.readFileSync(path.join(tempDir, 'package.json'), 'utf-8'),
        );
        expect(pkgJson.dependencies['test-fns']).toBeDefined();
      });

      then('output shows success', () => {
        const result = runSkill(
          [
            '--package',
            'zod',
            '--at',
            '3.22.4',
            '--for',
            'prod',
            '--reason',
            'another test',
          ],
          { cwd: tempDir, fakeBinDir },
        );
        expect(result.stdout).toContain('shell yeah!');
        expect(result.stdout).toContain('set.package.install');
      });
    });
  });

  given('[case2] audit fails (known vulnerable pkg)', () => {
    when('[t0] install is called with vulnerable package', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());

      then('exit code is 2', () => {
        const result = runSkill(
          [
            '--package',
            'lodash',
            '--at',
            '4.17.0',
            '--for',
            'prod',
            '--reason',
            'test',
          ],
          { cwd: tempDir, fakeBinDir },
        );
        expect(result.exitCode).toBe(2);
      });

      then('no reason file is created', () => {
        const routeDirs = fs
          .readdirSync(tempDir)
          .filter((f) => f.startsWith('.route'));
        expect(routeDirs.length).toBe(0);
      });

      then('output shows bummer', () => {
        const result = runSkill(
          [
            '--package',
            'lodash',
            '--at',
            '4.17.0',
            '--for',
            'prod',
            '--reason',
            'test',
          ],
          { cwd: tempDir, fakeBinDir },
        );
        expect(result.stderr).toContain('bummer dude');
      });
    });
  });

  given('[case3] package already installed', () => {
    when('[t0] install is called for extant package', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir({
        withPackage: { name: 'test-fns', version: '1.0.0' },
      });
      afterAll(() => cleanup());

      then('exit code is 2', () => {
        const result = runSkill(
          [
            '--package',
            'test-fns',
            '--at',
            '2.0.0',
            '--for',
            'prod',
            '--reason',
            'upgrade',
          ],
          { cwd: tempDir, fakeBinDir },
        );
        expect(result.exitCode).toBe(2);
      });

      then('error mentions use upgrade', () => {
        const result = runSkill(
          [
            '--package',
            'test-fns',
            '--at',
            '2.0.0',
            '--for',
            'prod',
            '--reason',
            'upgrade',
          ],
          { cwd: tempDir, fakeBinDir },
        );
        expect(result.stderr).toContain('set.package.upgrade');
      });
    });
  });

  given('[case4] --package omitted', () => {
    when('[t0] install is called without --package', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());

      then('exit code is 2', () => {
        const result = runSkill(
          ['--at', '1.0.0', '--for', 'prod', '--reason', 'test'],
          { cwd: tempDir, fakeBinDir },
        );
        expect(result.exitCode).toBe(2);
      });

      then('error mentions --package', () => {
        const result = runSkill(
          ['--at', '1.0.0', '--for', 'prod', '--reason', 'test'],
          { cwd: tempDir, fakeBinDir },
        );
        expect(result.stderr).toContain('--package');
      });
    });
  });

  given('[case5] --at omitted', () => {
    when('[t0] install is called without --at', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());

      then('exit code is 2', () => {
        const result = runSkill(
          ['--package', 'test-fns', '--for', 'prod', '--reason', 'test'],
          { cwd: tempDir, fakeBinDir },
        );
        expect(result.exitCode).toBe(2);
      });

      then('error mentions --at', () => {
        const result = runSkill(
          ['--package', 'test-fns', '--for', 'prod', '--reason', 'test'],
          { cwd: tempDir, fakeBinDir },
        );
        expect(result.stderr).toContain('--at');
      });
    });
  });

  given('[case6] --for omitted', () => {
    when('[t0] install is called without --for', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());

      then('exit code is 2', () => {
        const result = runSkill(
          ['--package', 'test-fns', '--at', '1.0.0', '--reason', 'test'],
          { cwd: tempDir, fakeBinDir },
        );
        expect(result.exitCode).toBe(2);
      });

      then('error mentions --for', () => {
        const result = runSkill(
          ['--package', 'test-fns', '--at', '1.0.0', '--reason', 'test'],
          { cwd: tempDir, fakeBinDir },
        );
        expect(result.stderr).toContain('--for');
      });
    });
  });

  given('[case7] --reason omitted', () => {
    when('[t0] install is called without --reason', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());

      then('exit code is 2', () => {
        const result = runSkill(
          ['--package', 'test-fns', '--at', '1.0.0', '--for', 'prod'],
          { cwd: tempDir, fakeBinDir },
        );
        expect(result.exitCode).toBe(2);
      });

      then('error mentions --reason', () => {
        const result = runSkill(
          ['--package', 'test-fns', '--at', '1.0.0', '--for', 'prod'],
          { cwd: tempDir, fakeBinDir },
        );
        expect(result.stderr).toContain('--reason');
      });
    });
  });

  given('[case8] --for invalid value', () => {
    when('[t0] install is called with invalid --for', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());

      then('exit code is 2', () => {
        const result = runSkill(
          [
            '--package',
            'test-fns',
            '--at',
            '1.0.0',
            '--for',
            'invalid',
            '--reason',
            'test',
          ],
          { cwd: tempDir, fakeBinDir },
        );
        expect(result.exitCode).toBe(2);
      });

      then('error mentions prod or prep', () => {
        const result = runSkill(
          [
            '--package',
            'test-fns',
            '--at',
            '1.0.0',
            '--for',
            'invalid',
            '--reason',
            'test',
          ],
          { cwd: tempDir, fakeBinDir },
        );
        expect(result.stderr).toContain('prod');
        expect(result.stderr).toContain('prep');
      });
    });
  });

  given('[case8b] --for dev (common mistake)', () => {
    when('[t0] install is called with --for dev', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());

      then('exit code is 2', () => {
        const result = runSkill(
          [
            '--package',
            'test-fns',
            '--at',
            '1.0.0',
            '--for',
            'dev',
            '--reason',
            'test',
          ],
          { cwd: tempDir, fakeBinDir },
        );
        expect(result.exitCode).toBe(2);
      });

      then('error suggests --for prep', () => {
        const result = runSkill(
          [
            '--package',
            'test-fns',
            '--at',
            '1.0.0',
            '--for',
            'dev',
            '--reason',
            'test',
          ],
          { cwd: tempDir, fakeBinDir },
        );
        expect(result.stderr).toContain('--for prep');
        expect(result.stderr).toContain('prep = prepare');
      });
    });
  });

  given('[case9] @latest version', () => {
    when('[t0] install is called with @latest', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());

      then('exit code is 0', () => {
        const result = runSkill(
          [
            '--package',
            'test-fns',
            '--at',
            '@latest',
            '--for',
            'prod',
            '--reason',
            'test',
          ],
          { cwd: tempDir, fakeBinDir },
        );
        expect(result.exitCode).toBe(0);
      });

      then('actual version is in output', () => {
        const result = runSkill(
          [
            '--package',
            'zod',
            '--at',
            '@latest',
            '--for',
            'prep',
            '--reason',
            'test',
          ],
          { cwd: tempDir, fakeBinDir },
        );
        // should NOT contain "@latest" in output — should be expanded
        expect(result.stdout).not.toContain('@latest');
        // should contain actual version like "3." or "4."
        expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
      });
    });
  });

  given('[case10] inline reason', () => {
    when('[t0] install is called with inline reason', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());

      then('reason text is in file', () => {
        runSkill(
          [
            '--package',
            'test-fns',
            '--at',
            '1.0.0',
            '--for',
            'prod',
            '--reason',
            'this is my inline reason',
          ],
          { cwd: tempDir, fakeBinDir },
        );

        // .route/v{date}.package.install/3.reason.for_{pkg}.v1.i1.md
        const routeBase = path.join(tempDir, '.route');
        const versionDirs = fs.readdirSync(routeBase);
        const versionDir = path.join(routeBase, versionDirs[0]!);
        const reasonFiles = fs
          .readdirSync(versionDir)
          .filter((f) => f.includes('reason'));
        const content = fs.readFileSync(
          path.join(versionDir, reasonFiles[0]!),
          'utf-8',
        );

        expect(content).toContain('this is my inline reason');
      });
    });
  });

  given('[case11] @stdin reason', () => {
    when('[t0] install is called with @stdin reason', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());

      then('stdin content is in file', () => {
        runSkill(
          [
            '--package',
            'test-fns',
            '--at',
            '1.0.0',
            '--for',
            'prod',
            '--reason',
            '@stdin',
          ],
          {
            cwd: tempDir,
            fakeBinDir,
            stdin: 'this is stdin reason content\nwith multiple lines',
          },
        );

        // .route/v{date}.package.install/3.reason.for_{pkg}.v1.i1.md
        const routeBase = path.join(tempDir, '.route');
        const versionDirs = fs.readdirSync(routeBase);
        const versionDir = path.join(routeBase, versionDirs[0]!);
        const reasonFiles = fs
          .readdirSync(versionDir)
          .filter((f) => f.includes('reason'));
        const content = fs.readFileSync(
          path.join(versionDir, reasonFiles[0]!),
          'utf-8',
        );

        expect(content).toContain('this is stdin reason content');
        expect(content).toContain('with multiple lines');
      });
    });
  });

  given('[case12] npm repo (package-lock.json extant)', () => {
    when('[t0] install is called in npm repo', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir({
        withPackageLock: true,
      });
      afterAll(() => cleanup());

      then('npm is used', () => {
        const result = runSkill(
          [
            '--package',
            'test-fns',
            '--at',
            '1.0.0',
            '--for',
            'prod',
            '--reason',
            'test',
          ],
          { cwd: tempDir, fakeBinDir },
        );
        expect(result.stdout).toContain('npm');
      });
    });
  });

  given('[case13] pnpm repo (no package-lock.json)', () => {
    when('[t0] install is called in pnpm repo', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());

      then('pnpm is used', () => {
        const result = runSkill(
          [
            '--package',
            'test-fns',
            '--at',
            '1.0.0',
            '--for',
            'prod',
            '--reason',
            'test',
          ],
          { cwd: tempDir, fakeBinDir },
        );
        expect(result.stdout).toContain('pnpm');
      });
    });
  });

  given('[case14] rhachet passthrough args', () => {
    when('[t0] rhachet args are passed', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());

      then('they are ignored and skill works', () => {
        const result = runSkill(
          [
            '--repo',
            'ehmpathy',
            '--role',
            'mechanic',
            '--skill',
            'set.package.install',
            '--package',
            'test-fns',
            '--at',
            '1.0.0',
            '--for',
            'prod',
            '--reason',
            'test',
          ],
          { cwd: tempDir, fakeBinDir },
        );
        expect(result.exitCode).toBe(0);
      });
    });
  });

  /**
   * .what = snapshot tests for all output variants
   * .why = enable vibe-check in PR reviews, detect unintended output changes
   */
  given('[snapshots] output formats', () => {
    when('[t0] all output variants', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir({
        withPackage: { name: 'extant-pkg', version: '1.0.0' },
      });
      afterAll(() => cleanup());

      then('success output matches snapshot', () => {
        const result = runSkill(
          [
            '--package',
            'test-fns',
            '--at',
            '1.0.0',
            '--for',
            'prod',
            '--reason',
            'test',
          ],
          { cwd: tempDir, fakeBinDir },
        );
        expect(asStableOutput(result.stdout)).toMatchSnapshot('success');
      });

      then('security block output matches snapshot', () => {
        const result = runSkill(
          [
            '--package',
            'lodash',
            '--at',
            '4.17.4',
            '--for',
            'prod',
            '--reason',
            'test',
          ],
          { cwd: tempDir, fakeBinDir },
        );
        expect(asStableOutput(result.stderr)).toMatchSnapshot('security-block');
      });

      then('already installed error matches snapshot', () => {
        const result = runSkill(
          [
            '--package',
            'extant-pkg',
            '--at',
            '2.0.0',
            '--for',
            'prod',
            '--reason',
            'test',
          ],
          { cwd: tempDir, fakeBinDir },
        );
        expect(asStableOutput(result.stderr)).toMatchSnapshot(
          'already-installed',
        );
      });

      then('absent --package error matches snapshot', () => {
        const result = runSkill(
          ['--at', '1.0.0', '--for', 'prod', '--reason', 'test'],
          { cwd: tempDir, fakeBinDir },
        );
        expect(asStableOutput(result.stderr)).toMatchSnapshot('absent-package');
      });

      then('absent --at error matches snapshot', () => {
        const result = runSkill(
          ['--package', 'test-fns', '--for', 'prod', '--reason', 'test'],
          { cwd: tempDir, fakeBinDir },
        );
        expect(asStableOutput(result.stderr)).toMatchSnapshot('absent-at');
      });

      then('absent --for error matches snapshot', () => {
        const result = runSkill(
          ['--package', 'test-fns', '--at', '1.0.0', '--reason', 'test'],
          { cwd: tempDir, fakeBinDir },
        );
        expect(asStableOutput(result.stderr)).toMatchSnapshot('absent-for');
      });

      then('absent --reason error matches snapshot', () => {
        const result = runSkill(
          ['--package', 'test-fns', '--at', '1.0.0', '--for', 'prod'],
          { cwd: tempDir, fakeBinDir },
        );
        expect(asStableOutput(result.stderr)).toMatchSnapshot('absent-reason');
      });

      then('invalid --for error matches snapshot', () => {
        const result = runSkill(
          [
            '--package',
            'test-fns',
            '--at',
            '1.0.0',
            '--for',
            'invalid',
            '--reason',
            'test',
          ],
          { cwd: tempDir, fakeBinDir },
        );
        expect(asStableOutput(result.stderr)).toMatchSnapshot('invalid-for');
      });

      then('--for dev error matches snapshot', () => {
        const result = runSkill(
          [
            '--package',
            'test-fns',
            '--at',
            '1.0.0',
            '--for',
            'dev',
            '--reason',
            'test',
          ],
          { cwd: tempDir, fakeBinDir },
        );
        expect(asStableOutput(result.stderr)).toMatchSnapshot('for-dev-error');
      });
    });
  });
});
