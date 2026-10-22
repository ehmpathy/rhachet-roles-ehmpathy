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

    // create fake pnpm that writes to package.json (add) and passes through other cmds
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
# passthrough for other commands (e.g., view) — find real pnpm outside fakebin
REAL_PNPM=$(PATH="\${PATH#*:}" command -v pnpm 2>/dev/null || echo "")
if [[ -n "$REAL_PNPM" ]]; then
  exec "$REAL_PNPM" "$@"
fi
exit 1
`,
    );
    fs.chmodSync(path.join(fakeBinDir, 'pnpm'), '755');

    // create fake npm that writes to package.json (install) and mocks view for version lookup
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
# mock npm view for version lookup (hermetic test - no network)
if [[ "$1" == "view" && "$3" == "version" ]]; then
  echo "99.0.0"
  exit 0
fi
# passthrough for other commands — find real npm outside fakebin
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

      then('version tag is expanded', () => {
        const result = runSkill(['--package', 'test-fns', '--to', '@latest'], {
          cwd: tempDir,
          fakeBinDir,
        });
        // should NOT contain "@latest" in output — should be expanded to semver
        expect(result.stdout).not.toContain('@latest');
        // should contain an actual version (either from mock or real npm)
        expect(result.stdout).toMatch(/to: \d+\.\d+\.\d+/);
      });
    });
  });

  /**
   * .what = overwrite one tool on the fake PATH with the body a case names
   * .mock = curl / npm / pnpm, via a fake on PATH
   *         .why = a stalled registry, an unresolved dist-tag, and a failed add cannot be
   *                provoked on demand against the real registry or package manager
   *         .real = cases 1–6 audit against the real registry
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

  given('[case7] the audit connection stalls on every attempt', () => {
    when('[t0] upgrade is called', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir({
        withPackage: { name: 'test-fns', version: '1.0.0' },
      });
      afterAll(() => cleanup());
      const callsLog = path.join(fakeBinDir, 'curl.calls.log');
      setFakeTool({
        fakeBinDir,
        tool: 'curl',
        body: `echo "$*" | tr '\\n' ' ' >> "${callsLog}"\necho >> "${callsLog}"\nexit 28`,
      });

      then(
        'the audit fails closed as a malfunction on both streams, and naught upgrades',
        () => {
          const result = runSkill(['--package', 'test-fns', '--to', '2.0.0'], {
            cwd: tempDir,
            fakeBinDir,
          });
          expect(result.exitCode).toBe(1);

          // the retry is bounded: three attempts, each capped by --max-time
          const calls = fs.readFileSync(callsLog, 'utf-8').trim().split('\n');
          expect(calls).toHaveLength(3);
          for (const call of calls) expect(call).toContain('--max-time');
          expect(result.stdout).toContain(
            '💥 MalfunctionError: security audit could not run',
          );
          expect(result.stderr).toContain(
            '💥 MalfunctionError: security audit could not run',
          );
          const pkgJson = JSON.parse(
            fs.readFileSync(path.join(tempDir, 'package.json'), 'utf-8'),
          );
          expect(pkgJson.dependencies['test-fns']).toBe('1.0.0');
          expect(asStableOutput(result.stdout)).toMatchSnapshot(
            'network-error',
          );
        },
      );
    });
  });

  given('[case8] an argument the skill does not know', () => {
    when('[t0] upgrade is called with --bogus', () => {
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

  given('[case9] a dist-tag the registry does not know', () => {
    when('[t0] upgrade is called with --to @nonesuch', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir({
        withPackage: { name: 'test-fns', version: '1.0.0' },
      });
      afterAll(() => cleanup());
      setFakeTool({ fakeBinDir, tool: 'npm', body: 'exit 1' });

      then('exit 2, the unexpanded tag named on both streams', () => {
        const result = runSkill(
          ['--package', 'test-fns', '--to', '@nonesuch'],
          {
            cwd: tempDir,
            fakeBinDir,
          },
        );
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('could not expand version: @nonesuch');
        expect(result.stderr).toContain('could not expand version: @nonesuch');
        expect(asStableOutput(result.stdout)).toMatchSnapshot('expand-failed');
      });
    });
  });

  given('[case10] the package manager fails the add', () => {
    when('[t0] upgrade is called', () => {
      const { tempDir, fakeBinDir, cleanup } = createTempDir({
        withPackage: { name: 'test-fns', version: '1.0.0' },
      });
      afterAll(() => cleanup());
      setFakeTool({ fakeBinDir, tool: 'pnpm', body: 'exit 1' });

      then('the failure is named on both streams', () => {
        const result = runSkill(['--package', 'test-fns', '--to', '2.0.0'], {
          cwd: tempDir,
          fakeBinDir,
        });
        expect(result.exitCode).not.toBe(0);
        expect(result.stdout).toContain('upgrade failed');
        expect(result.stderr).toContain('upgrade failed');
        expect(asStableOutput(result.stdout)).toMatchSnapshot('upgrade-failed');
      });
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
    '[case11] the registry answers with a body the audit cannot read',
    () => {
      auditFaults.forEach((fault, index) => {
        when(`[t${index}] the body is ${fault.slug}`, () => {
          const { tempDir, fakeBinDir, cleanup } = createTempDir({
            withPackage: { name: 'test-fns', version: '1.0.0' },
          });
          afterAll(() => cleanup());
          setFakeTool({
            fakeBinDir,
            tool: 'curl',
            body: `echo '${fault.answer}'`,
          });

          then(
            'the audit fails closed as a malfunction on both streams, and naught upgrades',
            () => {
              const result = runSkill(
                ['--package', 'test-fns', '--to', '2.0.0'],
                { cwd: tempDir, fakeBinDir },
              );
              expect(result.exitCode).toBe(1);
              expect(result.stdout).toContain(
                `💥 MalfunctionError: security audit could not run (${fault.cause})`,
              );
              expect(result.stderr).toContain(fault.cause);
              const pkgJson = JSON.parse(
                fs.readFileSync(path.join(tempDir, 'package.json'), 'utf-8'),
              );
              expect(pkgJson.dependencies['test-fns']).toBe('1.0.0');
              expect(asStableOutput(result.stdout)).toMatchSnapshot(fault.slug);
            },
          );
        });
      });
    },
  );

  given('[case12] a host with no jq', () => {
    when('[t0] upgrade is called', () => {
      // a PATH that holds only what the skill needs before its dependency check
      const { tempDir, cleanup } = createTempDir({
        withPackage: { name: 'test-fns', version: '1.0.0' },
      });
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
            [scriptPath, '--package', 'test-fns', '--to', '2.0.0'],
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
