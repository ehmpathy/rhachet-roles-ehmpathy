import { spawnSync } from 'child_process';
import * as fs from 'fs';
import { ConstraintError } from 'helpful-errors';
import * as os from 'os';
import * as path from 'path';
import { given, then, useBeforeAll, useThen, when } from 'test-fns';

/**
 * .what = integration tests for set.package.install.sh skill
 * .why = verify package install with security audit and reason documentation
 */
describe('set.package.install.sh', () => {
  const scriptPath = path.join(__dirname, 'set.package.install.sh');

  /**
   * .what = create temp directory with package.json and fake package managers
   * .why = isolate tests from real repo and avoid actual installs
   *
   * .mock = the install leg: `pnpm add`, `npm install`, and `npm view <pkg> version`
   * .why  = most cases grade the skill's own contract (flag checks, the reason
   *         file, the output), which a real install would slow by seconds per
   *         run and tie to the registry's latest versions
   * .real = the audit leg is never faked: every case posts to the live npm
   *         advisory api (case2 proves a real block). the install leg runs real
   *         in [case15], with no fake bins
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

    // create fake pnpm that writes to package.json (add) and passes through other cmds
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
# passthrough for other commands (e.g., view) — find real pnpm outside fakebin
REAL_PNPM=$(PATH="\${PATH#*:}" command -v pnpm 2>/dev/null || echo "")
if [[ -n "$REAL_PNPM" ]]; then
  exec "$REAL_PNPM" "$@"
fi
exit 1
`,
    );
    fs.chmodSync(path.join(fakeBinDir, 'pnpm'), '755');

    // create fake npm that writes to package.json and mocks view for version lookup
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
# mock npm view for version lookup (hermetic test - no network)
if [[ "$1" == "view" && "$3" == "version" ]]; then
  echo "99.0.0"
  exit 0
fi
# passthrough for non-install commands — find real npm outside fakebin
REAL_NPM=$(PATH="\${PATH#*:}" command -v npm 2>/dev/null || echo "")
if [[ -n "$REAL_NPM" ]]; then
  exec "$REAL_NPM" "$@"
fi
exit 1
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
   * .what = provision the repo's pinned pnpm into a bin dir, via corepack
   * .why = the ci test jobs install no pnpm, so a bare host pnpm is a host dep
   *        (rule.forbid.bare-host-deps); corepack ships with node and fetches
   *        the exact version this repo's package.json pins
   */
  const genPnpmBinDir = (input: { tempDir: string }): string => {
    // read the pin from this repo's package.json, never a magic version
    const repoPkg = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, '../../../../../package.json'),
        'utf-8',
      ),
    );
    const pnpmPinned: string = repoPkg.packageManager ?? '';
    if (!/^pnpm@\d+\.\d+\.\d+$/.test(pnpmPinned))
      throw new ConstraintError(
        'genPnpmBinDir: package.json packageManager is not a pnpm pin',
        {
          packageManager: pnpmPinned,
          hint: "pin pnpm in package.json, e.g. packageManager: 'pnpm@10.24.0'",
        },
      );

    // write a pnpm shim that runs the pinned version, with no prompt and no auto-pin
    const binDir = path.join(input.tempDir, '.pnpmbin');
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(
      path.join(binDir, 'pnpm'),
      [
        '#!/bin/bash',
        'export COREPACK_ENABLE_DOWNLOAD_PROMPT=0',
        'export COREPACK_ENABLE_AUTO_PIN=0',
        `exec corepack ${pnpmPinned} "$@"`,
        '',
      ].join('\n'),
    );
    fs.chmodSync(path.join(binDir, 'pnpm'), '755');
    return binDir;
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
      const result = useThen('it runs', async () =>
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
        ),
      );

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('reason file is created', () => {
        // .route/v{date}.package.install/3.reason.for_{pkg}.yield.md
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
        const pkgJson = JSON.parse(
          fs.readFileSync(path.join(tempDir, 'package.json'), 'utf-8'),
        );
        expect(pkgJson.dependencies['test-fns']).toBeDefined();
      });

      then('output shows success', () => {
        expect(result.stdout).toContain('shell yeah!');
        expect(result.stdout).toContain('set.package.install');
      });
    });

    // .note = the second package was zod@3.22.4, which now carries a live high
    //         advisory (GHSA-mrhx-c7xc-m3w5), so the skill blocks it, correctly;
    //         type-fns@1.21.0 keeps the scenario with an input whose audit passes
    when(
      '[t1] a second package is installed into a project that holds one',
      () => {
        const { tempDir, fakeBinDir, cleanup } = createTempDir();
        afterAll(() => cleanup());
        const result = useThen('both run', async () => {
          const first = runSkill(
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
          const second = runSkill(
            [
              '--package',
              'type-fns',
              '--at',
              '1.21.0',
              '--for',
              'prod',
              '--reason',
              'test reason',
            ],
            { cwd: tempDir, fakeBinDir },
          );
          return { first, second };
        });

        then('the second install exits 0 and shows success', () => {
          expect(result.first.exitCode).toBe(0);
          expect(result.second.exitCode).toBe(0);
          expect(result.second.stdout).toContain('shell yeah!');
          expect(result.second.stdout).toContain('set.package.install');
        });

        then('both packages are in package.json', () => {
          const pkgJson = JSON.parse(
            fs.readFileSync(path.join(tempDir, 'package.json'), 'utf-8'),
          );
          expect(pkgJson.dependencies['test-fns']).toBeDefined();
          expect(pkgJson.dependencies['type-fns']).toBeDefined();
        });
      },
    );
  });

  given('[case2] audit fails (known vulnerable pkg)', () => {
    when('[t0] install is called with vulnerable package', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());
      const result = useThen('it runs', async () =>
        runSkill(
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
        ),
      );

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('no reason file is created', () => {
        const routeDirs = fs
          .readdirSync(tempDir)
          .filter((f) => f.startsWith('.route'));
        expect(routeDirs.length).toBe(0);
      });

      then('output shows bummer', () => {
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
      const result = useThen('it runs', async () =>
        runSkill(
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
        ),
      );

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('error mentions use upgrade', () => {
        expect(result.stderr).toContain('set.package.upgrade');
        expect(result.stdout).toContain('set.package.upgrade'); // a refusal rides both streams
      });
    });
  });

  given('[case4] --package omitted', () => {
    when('[t0] install is called without --package', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());
      const result = useThen('it runs', async () =>
        runSkill(['--at', '1.0.0', '--for', 'prod', '--reason', 'test'], {
          cwd: tempDir,
          fakeBinDir,
        }),
      );

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('error mentions --package', () => {
        expect(result.stderr).toContain('--package');
      });
    });
  });

  given('[case5] --at omitted', () => {
    when('[t0] install is called without --at', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());
      const result = useThen('it runs', async () =>
        runSkill(
          ['--package', 'test-fns', '--for', 'prod', '--reason', 'test'],
          {
            cwd: tempDir,
            fakeBinDir,
          },
        ),
      );

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('error mentions --at', () => {
        expect(result.stderr).toContain('--at');
      });
    });
  });

  given('[case6] --for omitted', () => {
    when('[t0] install is called without --for', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());
      const result = useThen('it runs', async () =>
        runSkill(
          ['--package', 'test-fns', '--at', '1.0.0', '--reason', 'test'],
          {
            cwd: tempDir,
            fakeBinDir,
          },
        ),
      );

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('error mentions --for', () => {
        expect(result.stderr).toContain('--for');
      });
    });
  });

  given('[case7] --reason omitted', () => {
    when('[t0] install is called without --reason', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());
      const result = useThen('it runs', async () =>
        runSkill(['--package', 'test-fns', '--at', '1.0.0', '--for', 'prod'], {
          cwd: tempDir,
          fakeBinDir,
        }),
      );

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('error mentions --reason', () => {
        expect(result.stderr).toContain('--reason');
      });
    });
  });

  given('[case8] --for invalid value', () => {
    when('[t0] install is called with invalid --for', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());
      const result = useThen('it runs', async () =>
        runSkill(
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
        ),
      );

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('error mentions prod or prep', () => {
        expect(result.stderr).toContain('prod');
        expect(result.stderr).toContain('prep');
      });
    });
  });

  given('[case8b] --for dev (common mistake)', () => {
    when('[t0] install is called with --for dev', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());
      const result = useThen('it runs', async () =>
        runSkill(
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
        ),
      );

      then('exit code is 2', () => {
        expect(result.exitCode).toBe(2);
      });

      then('error suggests --for prep', () => {
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

        // .route/v{date}.package.install/3.reason.for_{pkg}.yield.md
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

        // .route/v{date}.package.install/3.reason.for_{pkg}.yield.md
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

  // .note = a package-lock repo, so the skill takes its npm path: npm ships with
  //         node on every host, while the ci test shards restore node_modules
  //         from cache and set up no pnpm
  given('[case15] a real install, no fake package managers', () => {
    when(
      '[t0] install is called with the real npm on PATH, in a package-lock repo',
      () => {
        const { tempDir, cleanup } = createTempDir({ withPackageLock: true });
        afterAll(() => cleanup());
        const result = useThen('it runs', async () =>
          runSkill(
            [
              '--package',
              'type-fns',
              '--at',
              '1.21.0',
              '--for',
              'prod',
              '--reason',
              'the real install leg',
            ],
            { cwd: tempDir },
          ),
        );

        then('exit code is 0, and the output says so', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('shell yeah!');
        });

        then(
          'the registry delivered the asked version into node_modules',
          () => {
            const installed = JSON.parse(
              fs.readFileSync(
                path.join(tempDir, 'node_modules', 'type-fns', 'package.json'),
                'utf-8',
              ),
            );
            expect(installed.version).toBe('1.21.0');
          },
        );

        then('package.json declares it as a prod dependency', () => {
          const pkgJson = JSON.parse(
            fs.readFileSync(path.join(tempDir, 'package.json'), 'utf-8'),
          );
          expect(pkgJson.dependencies['type-fns']).toContain('1.21.0');
        });
      },
    );
  });

  /**
   * .what = clamp: the audit's registry call is bounded and retried on a fresh connection
   * .why = an unbounded call that met a stalled connection hung the skill past the 300s test
   *        bound (rule.require.clamp-edge-cases)
   * .mock = curl, via a fake on PATH
   *         .why = a stalled connection, or a malformed registry body, cannot be provoked on
   *                demand against the real registry; the fake answers as curl does on a
   *                timeout (exit 28, empty body), or with the body a case names
   *         .real = every other case in this suite audits against the real registry
   */
  const setFakeCurl = (input: {
    fakeBinDir: string;
    timeoutsBeforeAnswer: number;
    answer?: string; // the body the registry returns once it answers; default = no advisories
  }): { callsLog: string } => {
    const callsLog = path.join(input.fakeBinDir, 'curl.calls.log');
    fs.writeFileSync(
      path.join(input.fakeBinDir, 'curl'),
      `#!/bin/bash
echo "$*" | tr '\\n' ' ' >> "${callsLog}"
echo >> "${callsLog}"
CALLS=$(wc -l < "${callsLog}")
if [[ $CALLS -le ${input.timeoutsBeforeAnswer} ]]; then
  exit 28
fi
echo '${input.answer ?? '{}'}'
`,
    );
    fs.chmodSync(path.join(input.fakeBinDir, 'curl'), '755');
    return { callsLog };
  };

  given('[case15] the audit connection stalls once', () => {
    when('[t0] install is called', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());
      const { callsLog } = setFakeCurl({ fakeBinDir, timeoutsBeforeAnswer: 1 });

      then('the retry succeeds, and each attempt is bounded', () => {
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
        expect(result.exitCode).toBe(0);
        const calls = fs.readFileSync(callsLog, 'utf-8').trim().split('\n');
        expect(calls).toHaveLength(2);
        for (const call of calls) expect(call).toContain('--max-time');
      });
    });
  });

  given('[case16] the audit connection stalls on every attempt', () => {
    when('[t0] install is called', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());
      const { callsLog } = setFakeCurl({
        fakeBinDir,
        timeoutsBeforeAnswer: 99,
      });

      then(
        'the audit fails closed after three attempts as a malfunction on both streams, and naught installs',
        () => {
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
          expect(result.exitCode).toBe(1); // a network fault is a malfunction, not a caller constraint
          expect(result.stdout).toContain('💥 MalfunctionError');
          expect(result.stdout).toContain('network error');
          expect(result.stderr).toContain('network error');
          expect(result.stdout).not.toContain('vulnerabilities'); // never reads as a vulnerable verdict
          expect(
            fs.readFileSync(callsLog, 'utf-8').trim().split('\n'),
          ).toHaveLength(3);
          const pkgJson = JSON.parse(
            fs.readFileSync(path.join(tempDir, 'package.json'), 'utf-8'),
          );
          expect(pkgJson.dependencies['test-fns']).toBeUndefined();
          expect(asStableOutput(result.stdout)).toMatchSnapshot(
            'network-error',
          );
        },
      );
    });
  });

  // the two other causes the audit cannot run: a body that is not json, and json that is
  // not an advisory map. each fails closed as a malfunction, on both streams
  const auditFaults = [
    {
      slug: 'invalid-response',
      answer: 'not json',
      cause: 'invalid response from the registry',
    },
    {
      slug: 'unparsable-response',
      answer: '"an advisory string, not a map"',
      cause: 'registry response could not be parsed',
    },
  ];
  given(
    '[case17] the registry answers with a body the audit cannot read',
    () => {
      auditFaults.forEach((fault, index) => {
        when(`[t${index}] the body is ${fault.slug}`, () => {
          const { tempDir, fakeBinDir, cleanup } = createTempDir();
          afterAll(() => cleanup());
          setFakeCurl({
            fakeBinDir,
            timeoutsBeforeAnswer: 0,
            answer: fault.answer,
          });

          then(
            'the audit fails closed as a malfunction on both streams',
            () => {
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
              expect(result.exitCode).toBe(1);
              expect(result.stdout).toContain(`💥 MalfunctionError`);
              expect(result.stdout).toContain(fault.cause);
              expect(result.stderr).toContain(fault.cause);
              expect(asStableOutput(result.stdout)).toMatchSnapshot(fault.slug);
            },
          );
        });
      });
    },
  );

  given('[case18] an argument the skill does not know', () => {
    when('[t0] install is called with --bogus', () => {
      then(
        'exit 2, a ConstraintError in the family frame on both streams',
        () => {
          const result = runSkill(['--package', 'test-fns', '--bogus', 'x']);
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            '✋ ConstraintError: unknown argument: --bogus',
          );
          expect(result.stderr).toContain(
            '✋ ConstraintError: unknown argument: --bogus',
          );
          expect(result.stdout).toMatchSnapshot();
        },
      );
    });
  });

  given('[case19] a host with no jq', () => {
    when('[t0] install is called', () => {
      // a PATH that holds only what the skill needs before its dependency check
      const { tempDir, cleanup } = createTempDir();
      afterAll(() => cleanup());
      const binDir = path.join(tempDir, '.bin-wout-jq');
      fs.mkdirSync(binDir, { recursive: true });
      fs.symlinkSync(
        spawnSync('which', ['dirname'], { encoding: 'utf-8' }).stdout.trim(), // node.js API requirement
        path.join(binDir, 'dirname'),
      );

      then(
        'exit 2, a ConstraintError in the family frame on both streams',
        () => {
          const result = spawnSync(
            '/bin/bash',
            [
              scriptPath,
              '--package',
              'test-fns',
              '--at',
              '1.0.0',
              '--for',
              'prod',
              '--reason',
              'test',
            ],
            {
              cwd: tempDir,
              encoding: 'utf-8',
              env: { ...process.env, PATH: binDir },
            }, // node.js API requirement
          );
          expect(result.status).toBe(2);
          expect(result.stdout).toContain(
            '✋ ConstraintError: jq is required but not installed',
          );
          expect(result.stderr).toContain(
            '✋ ConstraintError: jq is required but not installed',
          );
          expect(result.stdout).toMatchSnapshot();
        },
      );
    });
  });

  /**
   * .what = overwrite one tool on the fake PATH with the body a case names
   * .mock = npm / pnpm, via a fake on PATH
   *         .why = an unresolved dist-tag and a failed add cannot be provoked on demand
   *                against the real registry or package manager
   *         .real = the audit in [case21] still calls the real registry
   */
  const setFakeTool = (input: {
    fakeBinDir: string;
    tool: string;
    body: string;
  }): void => {
    const target = path.join(input.fakeBinDir, input.tool);
    fs.writeFileSync(target, `#!/bin/bash\n${input.body}\n`);
    fs.chmodSync(target, '755');
  };

  given('[case20] a dist-tag the registry does not know', () => {
    when('[t0] install is called with --at @nonesuch', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());
      setFakeTool({ fakeBinDir, tool: 'npm', body: 'exit 1' });

      then('exit 2, the unexpanded tag named on both streams', () => {
        const result = runSkill(
          [
            '--package',
            'test-fns',
            '--at',
            '@nonesuch',
            '--for',
            'prod',
            '--reason',
            'test',
          ],
          { cwd: tempDir, fakeBinDir },
        );
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('could not expand version: @nonesuch');
        expect(result.stderr).toContain('could not expand version: @nonesuch');
        expect(asStableOutput(result.stdout)).toMatchSnapshot('expand-failed');
      });
    });
  });

  given('[case21] the package manager fails the add', () => {
    when('[t0] install is called', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir();
      afterAll(() => cleanup());
      setFakeTool({
        fakeBinDir,
        tool: 'pnpm',
        body: 'echo "ERR_PNPM_FETCH_404  GET https://registry.npmjs.org/test-fns: Not Found" >&2; exit 1',
      });

      then('the failure is named on both streams, with the cause', () => {
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
        expect(result.exitCode).not.toBe(0);
        expect(result.stdout).toContain('install failed');
        expect(result.stderr).toContain('install failed');
        expect(result.stdout).toContain('ERR_PNPM_FETCH_404');
        expect(asStableOutput(result.stdout)).toMatchSnapshot('install-failed');
      });
    });
  });

  given(
    '[case22] the real registry and the real package manager, no fakes',
    () => {
      when(
        '[t0] install is called with --at @latest for a dependency-free package',
        () => {
          const { tempDir, cleanup } = createTempDir();
          afterAll(() => cleanup());

          // no fakes: real npm view, real registry audit, real pnpm add (the pinned pnpm, via corepack)
          const pnpmBinDir = genPnpmBinDir({ tempDir });
          const scene = useBeforeAll(async () => {
            const result = runSkill(
              [
                '--package',
                'is-number',
                '--at',
                '@latest',
                '--for',
                'prod',
                '--reason',
                'real registry',
              ],
              { cwd: tempDir, fakeBinDir: pnpmBinDir },
            );
            const pkgJson = JSON.parse(
              fs.readFileSync(path.join(tempDir, 'package.json'), 'utf-8'),
            );
            const versionDeclared: string =
              pkgJson.dependencies['is-number'] ?? 'absent';
            return {
              result,
              versionPinned: versionDeclared.replace(/^[\^~]/, ''),
            };
          });

          then('exit 0', () => {
            expect(scene.result.exitCode).toBe(0);
          });

          then(
            'the dist-tag expands to a concrete semver in package.json',
            () => {
              expect(scene.versionPinned).toMatch(/^\d+\.\d+\.\d+$/);
            },
          );

          then('the package lands in node_modules at that version', () => {
            const installed = JSON.parse(
              fs.readFileSync(
                path.join(tempDir, 'node_modules', 'is-number', 'package.json'),
                'utf-8',
              ),
            );
            expect(installed.version).toEqual(scene.versionPinned);
          });

          then('the output matches snapshot', () => {
            expect(asStableOutput(scene.result.stdout)).toMatchSnapshot(
              'real-registry',
            );
          });
        },
      );
    },
  );

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

      then('@latest success output matches snapshot', () => {
        const result = runSkill(
          [
            '--package',
            'type-fns',
            '--at',
            '@latest',
            '--for',
            'prep',
            '--reason',
            'test',
          ],
          { cwd: tempDir, fakeBinDir },
        );
        expect(result.exitCode).toBe(0);
        expect(asStableOutput(result.stdout)).toMatchSnapshot('latest');
      });

      then('@stdin reason success output matches snapshot', () => {
        const result = runSkill(
          [
            '--package',
            'uuid-fns',
            '--at',
            '1.0.0',
            '--for',
            'prod',
            '--reason',
            '@stdin',
          ],
          { cwd: tempDir, fakeBinDir, stdin: 'reason from stdin' },
        );
        expect(result.exitCode).toBe(0);
        expect(asStableOutput(result.stdout)).toMatchSnapshot('stdin-reason');
      });
    });
  });
});
