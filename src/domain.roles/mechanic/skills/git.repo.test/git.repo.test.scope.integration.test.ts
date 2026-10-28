import { spawnSync } from 'child_process';
import * as fs from 'fs';
import { MalfunctionError } from 'helpful-errors';
import * as os from 'os';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import { maskSpinnerTicks } from '../../../../.test/maskSpinnerTicks';
import { setGroveIsolation } from '../../../../.test/setGroveIsolation';

// isolate the grove: a private slot pool, so runs never queue on the box's pool
setGroveIsolation();

/**
 * .what = integration tests for git.repo.test.sh scope functionality
 * .why = verify scope filter works correctly and prevent regressions
 *
 * .note = this file tests the --scope option specifically.
 *         other CLI variants (--what types/lint/format, --timeout, etc.)
 *         are covered in git.repo.test.integration.test.ts (25 cases).
 */
describe('git.repo.test.sh scope', () => {
  const scriptPath = path.join(__dirname, 'git.repo.test.sh');
  const repoRoot = path.join(__dirname, '../../../../..');

  /**
   * .what = sanitize output for snapshots (removes dynamic values)
   * .why = pins snapshots to behavior, apart from host time, paths, and speed
   * .note = no keyrack normalizer is needed: the one keyrack case states its
   *         own refusal via a fake rhx, so the test controls that input
   */
  const sanitizeOutput = (input: { output: string }): string =>
    maskSpinnerTicks(input.output)
      .replace(/\(\d+m?s\)/g, '(Xs)') // time values
      .replace(/\d+m?s/g, 'Xs') // time without parens
      // keep the error class; drop only the ambient owner/ran frame
      .replace(
        /✋ ConstraintError: ([^\n]*)\n\s+├─ owner: [^\n]*\n\s+└─ ran: [^\n]*/g,
        '✋ ConstraintError: $1',
      )
      // collapse a run of spinner ticks to one; the count tracks host speed, not behavior
      .replace(/(^[^\n]*💤 inflight \(Xs\)\n)+/gm, '$1')
      .replace(/suites: \d+ files/g, 'suites: N files') // suites count (varies by jest version/env)
      .split(os.tmpdir())
      .join('/tmp') // temp base, which differs per host
      // temp paths; the grove's fixed fallback pool dir is a documented path, kept as is
      .replace(
        /\/tmp\/(?!rhachet\/git\.repo\.test\b)[^\s\n]+/g,
        '/tmp/__sanitized__',
      )
      .replace(/\/home\/[^\s]+\/node_modules\/.pnpm\/[^\s]+/g, '__pkg__') // absolute pnpm paths
      .replace(/ {4}at [^\n]+\n/g, '    at __stack__\n') // stack traces (4 space indent)
      .replace(/Node\.js v[\d.]+/g, 'Node.js vX.X.X') // node version
      .replace(/\[keyrack-daemon\][^\n]*\n?/g, '') // keyrack daemon output
      .trim();

  /**
   * .what = run one git command in a temp repo; fail loud on any nonzero exit
   * .why = a silent setup failure would surface later as an unrelated mismatch
   */
  const runGitOrFail = (input: { args: string[]; cwd: string }): void => {
    const result = spawnSync('git', input.args, {
      cwd: input.cwd,
      encoding: 'utf-8',
    });
    if (result.status === 0) return;
    throw new MalfunctionError('test setup failed: git command', {
      args: input.args,
      cwd: input.cwd,
      status: result.status,
      signal: result.signal,
      stderr: result.stderr,
      error: result.error?.message,
    });
  };

  /**
   * .what = the exit code of a finished skill run; fail loud if it never exited
   * .why = a spawn failure or a timeout must never read as exit 1 (malfunction)
   */
  const asExitCode = (input: {
    result: ReturnType<typeof spawnSync>;
  }): number => {
    if (input.result.status !== null) return input.result.status;
    throw new MalfunctionError('skill run did not exit', {
      signal: input.result.signal,
      error: input.result.error?.message,
      hint: 'a signal is the spawn timeout or a hang; an error is a spawn failure',
    });
  };

  /**
   * .what = the skill args for a scope case
   * .why = flag order, stacked scopes, and the optional flags live in one place
   */
  const asSkillArgs = (input: {
    what: 'unit' | 'integration';
    scopes: string[];
    mode: 'plan' | 'apply' | null;
    thorough: boolean;
  }): string[] => [
    '--what',
    input.what,
    ...input.scopes.flatMap((scope) => ['--scope', scope]),
    ...(input.mode ? ['--mode', input.mode] : []),
    ...(input.thorough ? ['--thorough'] : []),
  ];

  /**
   * .what = a fake rhx whose keyrack refuses; any other rhx call fails loud
   * .why = the keyrack refusal case states its own refusal, the same on every host
   * .mock = keyrack unlock. the case is about how the skill surfaces a refusal; a real keyrack
   *         would refuse or unlock by the host's state, so the outcome would not be the case's
   * .real = the dogfood run: this repo runs its suites via `rhx git.repo.test`, which unlocks the real keyrack; a CI case is #1191
   */
  const setFakeRhxRefusal = (input: { binDir: string }): void => {
    fs.mkdirSync(input.binDir, { recursive: true });
    fs.writeFileSync(
      path.join(input.binDir, 'rhx'),
      [
        '#!/usr/bin/env bash',
        '# .what = a keyrack that refuses, for the refusal-path case',
        'if [[ "$1" == "keyrack" ]]; then',
        '  echo "🔐 keyrack unlock"',
        '  echo "   └─ ✋ blocked: no keyrack.yml found in repo"',
        '  exit 1',
        'fi',
        '# any other rhx call sits outside this fake contract — fail loud',
        'echo "unexpected rhx call: $*" 1>&2',
        'exit 64',
      ].join('\n'),
      { mode: 0o755 },
    );
  };

  /**
   * .what = run git.repo.test.sh with arbitrary args (for --help, etc)
   * .why = drives invocations that need no fixture repo
   */
  const runRaw = (input: {
    args: string[];
  }): { stdout: string; stderr: string; exitCode: number } => {
    const result = spawnSync('bash', [scriptPath, ...input.args], {
      encoding: 'utf-8' as const,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120_000, // a hung run fails loud within a known bound
    });
    const exitCode = asExitCode({ result });
    return { stdout: result.stdout, stderr: result.stderr, exitCode };
  };

  /**
   * .what = run git.repo.test.sh in a temp git repo with jest setup
   * .why = exercises the real skill against its own hermetic fixture repo
   */
  const runWithScope = (
    args: {
      testFiles: Array<{ type: 'unit' | 'integration'; name: string }>;
      scope?: string;
      scopes?: string[];
      mode?: 'plan' | 'apply';
      thorough?: boolean;
    } & (
      | { what?: 'unit'; keyrack?: never }
      // an integration run asks keyrack; the fake is required, so no run consults the host
      | { what: 'integration'; keyrack: 'absent' }
    ),
  ): { stdout: string; stderr: string; exitCode: number } => {
    const tempDir = genTempDir({ slug: 'scope-test', git: true });
    const what = args.what ?? 'unit';

    // create package.json with jest
    // note: type: commonjs required for jest to properly parse .js test files
    // note: --verbose ensures jest outputs "Tests:" summary line for test count
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(
        {
          name: 'test-repo',
          type: 'commonjs',
          devDependencies: { jest: '30.2.0' },
          scripts: {
            'test:unit': 'jest --config jest.unit.config.js --verbose',
            'test:integration':
              'jest --config jest.integration.config.js --verbose',
          },
        },
        null,
        2,
      ),
    );

    // create jest configs
    // note: transform: {} required to disable parent repo's @swc/jest transform
    // which breaks plain JS files in temp repos with symlinked node_modules
    for (const configType of ['unit', 'integration']) {
      const testMatch =
        configType === 'unit' ? '**/*.test.js' : '**/*.integration.test.js';
      const ignorePatterns =
        configType === 'unit'
          ? `testPathIgnorePatterns: ['integration\\\\.test\\\\.js$'],`
          : '';
      fs.writeFileSync(
        path.join(tempDir, `jest.${configType}.config.js`),
        `module.exports = { testMatch: ['${testMatch}'], ${ignorePatterns} testEnvironment: 'node', transform: {} };`,
      );
    }

    // create test files
    // note: include testFile.name in the it() block name so --testNamePattern definitely matches
    // jest's full test name is: "describe-name it-name" (e.g., "myfeature myfeature test")
    // we use 'test' as the suffix so 'name://passes' patterns don't accidentally match
    // use expect(true).toBe(true) to ensure jest counts the test
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    for (const testFile of args.testFiles) {
      const suffix =
        testFile.type === 'unit' ? 'test.js' : 'integration.test.js';
      fs.writeFileSync(
        path.join(tempDir, 'src', `${testFile.name}.${suffix}`),
        `describe('${testFile.name}', () => { it('${testFile.name} test', () => { expect(true).toBe(true); }); });`,
      );
    }

    // symlink node_modules for jest to work
    fs.symlinkSync(
      path.join(repoRoot, 'node_modules'),
      path.join(tempDir, 'node_modules'),
    );

    // commit to establish git history, on a branch named main on every host
    runGitOrFail({ args: ['add', '.'], cwd: tempDir });
    runGitOrFail({ args: ['commit', '-m', 'initial'], cwd: tempDir });
    runGitOrFail({ args: ['branch', '-M', 'main'], cwd: tempDir });

    // the keyrack refusal case controls its keyrack, so the outcome holds on any host
    const binDir = path.join(tempDir, '.bin');
    if (args.keyrack === 'absent') setFakeRhxRefusal({ binDir });

    const skillArgs = asSkillArgs({
      what,
      scopes: args.scopes ?? (args.scope ? [args.scope] : []),
      mode: args.mode ?? null,
      thorough: args.thorough ?? false,
    });
    const result = spawnSync('bash', [scriptPath, ...skillArgs], {
      cwd: tempDir,
      encoding: 'utf-8' as const, // node api requires this exact string
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120_000, // a hung run fails loud within a known bound
      env:
        args.keyrack === 'absent'
          ? { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ''}` }
          : process.env,
    });
    const exitCode = asExitCode({ result });
    return { stdout: result.stdout, stderr: result.stderr, exitCode };
  };

  given('[case0] --help output', () => {
    when('[t0] --help is passed', () => {
      const result = useThen('skill executes', () =>
        runRaw({ args: ['--help'] }),
      );

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('stdout shows usage info', () => {
        expect(result.stdout).toContain('git.repo.test');
        expect(result.stdout).toContain('--what');
        expect(result.stdout).toContain('--scope');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toContain('git.repo.test');
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        // stderr carries output exactly when the run fails (rule.require.skill-output-streams)
        expect(result.stderr === '').toEqual(result.exitCode === 0);
        expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case1] scope with path:// prefix', () => {
    when('[t0] --scope path://myfeature is used', () => {
      const result = useThen('skill executes', () =>
        runWithScope({
          testFiles: [
            { type: 'unit', name: 'myfeature' },
            { type: 'unit', name: 'other' },
          ],
          scope: 'path://myfeature',
          thorough: true,
        }),
      );

      then('exit code is 0 (not malfunction)', () => {
        // exit 1 = malfunction (jest failed), exit 0 = success, exit 2 = constraint
        expect(result.exitCode).toBe(0);
      });

      then('stdout shows matched files', () => {
        expect(result.stdout).toContain('matched:');
        expect(result.stdout).not.toContain('cannot verify scope');
      });

      then('stdout shows scope', () => {
        expect(result.stdout).toContain('scope: path://myfeature');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toContain('git.repo.test');
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        // stderr carries output exactly when the run fails (rule.require.skill-output-streams)
        expect(result.stderr === '').toEqual(result.exitCode === 0);
        expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case2] scope without prefix (bare scope)', () => {
    when('[t0] --scope myfeature is used', () => {
      const result = useThen('skill executes', () =>
        runWithScope({
          testFiles: [
            { type: 'unit', name: 'myfeature' },
            { type: 'unit', name: 'other' },
          ],
          scope: 'myfeature',
          thorough: true,
        }),
      );

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('stdout shows matched: 1 files', () => {
        expect(result.stdout).toContain('matched: 1 files');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toContain('git.repo.test');
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        // stderr carries output exactly when the run fails (rule.require.skill-output-streams)
        expect(result.stderr === '').toEqual(result.exitCode === 0);
        expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case3] scope matches 0 files', () => {
    when('[t0] --scope nonexistent is used', () => {
      const result = useThen('skill executes', () =>
        runWithScope({
          testFiles: [{ type: 'unit', name: 'foo' }],
          scope: 'nonexistent',
          thorough: true,
        }),
      );

      then('exit code is 2 (constraint, not malfunction)', () => {
        // exit 2 = constraint (no matches), exit 1 = malfunction (jest failed)
        expect(result.exitCode).toBe(2);
      });

      then('stdout shows matched: 0 files', () => {
        expect(result.stdout).toContain('matched: 0 files');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toContain('git.repo.test');
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        // stderr carries output exactly when the run fails (rule.require.skill-output-streams)
        expect(result.stderr === '').toEqual(result.exitCode === 0);
        expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case4] scope with --mode apply (execution)', () => {
    when('[t0] --scope myfeature --mode apply is used', () => {
      const result = useThen('skill executes', () =>
        runWithScope({
          testFiles: [
            { type: 'unit', name: 'myfeature' },
            { type: 'unit', name: 'other' },
          ],
          scope: 'myfeature',
          mode: 'apply',
          thorough: true,
        }),
      );

      then('exit code is 0 (tests passed)', () => {
        expect(result.exitCode).toBe(0);
      });

      then('stdout shows test execution results', () => {
        expect(result.stdout).toContain('passed');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toContain('git.repo.test');
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        // stderr carries output exactly when the run fails (rule.require.skill-output-streams)
        expect(result.stderr === '').toEqual(result.exitCode === 0);
        expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case5] scope with explicit --mode plan', () => {
    when('[t0] --scope myfeature --mode plan is used', () => {
      const result = useThen('skill executes', () =>
        runWithScope({
          testFiles: [
            { type: 'unit', name: 'myfeature' },
            { type: 'unit', name: 'other' },
          ],
          scope: 'myfeature',
          mode: 'plan',
          thorough: true,
        }),
      );

      then('exit code is 0 (plan succeeded)', () => {
        expect(result.exitCode).toBe(0);
      });

      then('stdout shows scope filter', () => {
        expect(result.stdout).toContain('scope: path://myfeature');
        expect(result.stdout).toContain('matched: 1 files');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toContain('git.repo.test');
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        // stderr carries output exactly when the run fails (rule.require.skill-output-streams)
        expect(result.stderr === '').toEqual(result.exitCode === 0);
        expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case6] scope with name:// prefix (test name filter)', () => {
    when('[t0] --scope name://passes is used', () => {
      const result = useThen('skill executes', () =>
        runWithScope({
          testFiles: [
            { type: 'unit', name: 'myfeature' },
            { type: 'unit', name: 'other' },
          ],
          scope: 'name://passes',
          thorough: true,
        }),
      );

      then('exit code is 0 (not malfunction)', () => {
        // name:// scope cannot be verified at plan time, but should not error
        expect(result.exitCode).toBe(0);
      });

      then('stdout shows scope', () => {
        expect(result.stdout).toContain('scope: name://passes');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toContain('git.repo.test');
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        // stderr carries output exactly when the run fails (rule.require.skill-output-streams)
        expect(result.stderr === '').toEqual(result.exitCode === 0);
        expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case7] scope without --thorough (changedSince mode)', () => {
    when('[t0] --scope myfeature without --thorough is used', () => {
      const result = useThen('skill executes', () =>
        runWithScope({
          testFiles: [
            { type: 'unit', name: 'myfeature' },
            { type: 'unit', name: 'other' },
          ],
          scope: 'myfeature',
          thorough: false,
        }),
      );

      then('exit code is not malfunction', () => {
        expect(result.exitCode).toBe(0);
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toContain('git.repo.test');
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        // stderr carries output exactly when the run fails (rule.require.skill-output-streams)
        expect(result.stderr === '').toEqual(result.exitCode === 0);
        expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
      });
    });
  });

  given(
    '[case8] scope with --what integration (keyrack failure in temp repo)',
    () => {
      // .note = the error path of a keyrack refusal; the fake rhx states the refusal, so no host keyrack decides it
      when('[t0] --scope myfeature --what integration is used', () => {
        const result = useThen('skill executes', () =>
          runWithScope({
            testFiles: [
              { type: 'integration', name: 'myfeature' },
              { type: 'integration', name: 'other' },
            ],
            scope: 'myfeature',
            what: 'integration',
            // apply mode reaches the keyrack unlock; plan mode never does
            mode: 'apply',
            thorough: true,
            keyrack: 'absent',
          }),
        );

        then('exit code is 1 (malfunction from keyrack failure)', () => {
          // temp repo has no keyrack.yml, so integration tests fail at keyrack unlock
          // this verifies git.repo.test.sh returns exit 1 (malfunction) for keyrack errors
          expect(result.exitCode).toBe(1);
        });

        then('stdout shows keyrack error message', () => {
          expect(result.stdout).toContain('keyrack');
        });

        then('stdout matches snapshot', () => {
          expect(result.stdout).toContain('git.repo.test');
          expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
        });

        then('stderr matches snapshot', () => {
          // stderr carries output exactly when the run fails (rule.require.skill-output-streams)
          expect(result.stderr === '').toEqual(result.exitCode === 0);
          expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
        });
      });
    },
  );

  given('[case9] scope with invalid:// prefix (unknown prefix)', () => {
    when('[t0] --scope invalid://foo is used', () => {
      const result = useThen('skill executes', () =>
        runWithScope({
          testFiles: [{ type: 'unit', name: 'foo' }],
          scope: 'invalid://foo',
          thorough: true,
        }),
      );

      then('exit code is constraint (unknown prefix treated as path)', () => {
        // unknown prefixes are treated as literal path patterns
        expect(result.exitCode).toBe(2); // no files match "invalid://foo"
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toContain('git.repo.test');
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        // stderr carries output exactly when the run fails (rule.require.skill-output-streams)
        expect(result.stderr === '').toEqual(result.exitCode === 0);
        expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case10] scope with special characters', () => {
    when('[t0] --scope with dots and hyphens is used', () => {
      const result = useThen('skill executes', () =>
        runWithScope({
          testFiles: [
            { type: 'unit', name: 'my-feature.utils' },
            { type: 'unit', name: 'other' },
          ],
          scope: 'my-feature.utils',
          thorough: true,
        }),
      );

      then('exit code is not malfunction', () => {
        expect(result.exitCode).toBe(0);
      });

      then('stdout shows matched files', () => {
        expect(result.stdout).toContain('matched: 1 files');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toContain('git.repo.test');
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        // stderr carries output exactly when the run fails (rule.require.skill-output-streams)
        expect(result.stderr === '').toEqual(result.exitCode === 0);
        expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case11] scope with name:// that matches no tests at runtime', () => {
    when('[t0] --scope name://nonexistent --mode apply is used', () => {
      const result = useThen('skill executes', () =>
        runWithScope({
          testFiles: [
            { type: 'unit', name: 'myfeature' },
            { type: 'unit', name: 'other' },
          ],
          scope: 'name://nonexistent',
          mode: 'apply',
          thorough: true,
        }),
      );

      then('exit code is 2 (constraint: the name matched no tests)', () => {
        expect(result.exitCode).toBe(2);
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toContain('git.repo.test');
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        // stderr carries output exactly when the run fails (rule.require.skill-output-streams)
        expect(result.stderr === '').toEqual(result.exitCode === 0);
        expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case12] scope with path:// matching multiple files', () => {
    when('[t0] --scope path://feature matches multiple', () => {
      const result = useThen('skill executes', () =>
        runWithScope({
          testFiles: [
            { type: 'unit', name: 'feature-a' },
            { type: 'unit', name: 'feature-b' },
            { type: 'unit', name: 'other' },
          ],
          scope: 'path://feature',
          thorough: true,
        }),
      );

      then('exit code is not malfunction', () => {
        expect(result.exitCode).toBe(0);
      });

      then('stdout shows multiple matched files', () => {
        expect(result.stdout).toContain('matched: 2 files');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toContain('git.repo.test');
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        // stderr carries output exactly when the run fails (rule.require.skill-output-streams)
        expect(result.stderr === '').toEqual(result.exitCode === 0);
        expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
      });
    });
  });

  given(
    '[case13] scope with path:// matches multiple files --mode apply',
    () => {
      when('[t0] --scope path://feature --mode apply finds multiple', () => {
        const result = useThen('skill executes', () =>
          runWithScope({
            testFiles: [
              { type: 'unit', name: 'feature-a' },
              { type: 'unit', name: 'feature-b' },
              { type: 'unit', name: 'other' },
            ],
            scope: 'path://feature',
            mode: 'apply',
            thorough: true,
          }),
        );

        then('exit code is 0 (tests passed)', () => {
          expect(result.exitCode).toBe(0);
        });

        then('stdout shows test execution for multiple files', () => {
          expect(result.stdout).toContain('passed');
        });

        then('stdout matches snapshot', () => {
          expect(result.stdout).toContain('git.repo.test');
          expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
        });

        then('stderr matches snapshot', () => {
          // stderr carries output exactly when the run fails (rule.require.skill-output-streams)
          expect(result.stderr === '').toEqual(result.exitCode === 0);
          expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
        });
      });
    },
  );

  given('[case14] scope with name:// prefix --mode apply', () => {
    when('[t0] --scope name://passes --mode apply is used', () => {
      const result = useThen('skill executes', () =>
        runWithScope({
          testFiles: [
            { type: 'unit', name: 'myfeature' },
            { type: 'unit', name: 'other' },
          ],
          scope: 'name://passes',
          mode: 'apply',
          thorough: true,
        }),
      );

      then(
        'exit code is 2 (constraint: jest found files but no tests match pattern)',
        () => {
          // files found but jest --testNamePattern finds no tests = constraint
          expect(result.exitCode).toBe(2);
        },
      );

      then('stdout shows no tests matched error', () => {
        expect(result.stdout).toContain('no tests matched scope');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toContain('git.repo.test');
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        // stderr carries output exactly when the run fails (rule.require.skill-output-streams)
        expect(result.stderr === '').toEqual(result.exitCode === 0);
        expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
      });
    });
  });

  given(
    '[case15] scope with name:// prefix --mode apply that matches tests',
    () => {
      when('[t0] --scope name://myfeature --mode apply is used', () => {
        const result = useThen('skill executes', () =>
          runWithScope({
            testFiles: [
              { type: 'unit', name: 'myfeature' },
              { type: 'unit', name: 'other' },
            ],
            scope: 'name://myfeature',
            mode: 'apply',
            thorough: true,
          }),
        );

        then('exit code is 0 (test name pattern matched)', () => {
          // describe block is named 'myfeature', so name://myfeature should match
          expect(result.exitCode).toBe(0);
        });

        then('stdout shows test execution results', () => {
          expect(result.stdout).toContain('passed');
        });

        then('stdout matches snapshot', () => {
          expect(result.stdout).toContain('git.repo.test');
          expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
        });

        then('stderr matches snapshot', () => {
          // stderr carries output exactly when the run fails (rule.require.skill-output-streams)
          expect(result.stderr === '').toEqual(result.exitCode === 0);
          expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
        });
      });
    },
  );

  given('[case16] scope with invalid:// prefix --mode apply', () => {
    when('[t0] --scope invalid://foo --mode apply is used', () => {
      const result = useThen('skill executes', () =>
        runWithScope({
          testFiles: [{ type: 'unit', name: 'foo' }],
          scope: 'invalid://foo',
          mode: 'apply',
          thorough: true,
        }),
      );

      then('exit code is constraint (unknown prefix treated as path)', () => {
        // unknown prefixes are treated as literal path patterns, no files match
        expect(result.exitCode).toBe(2);
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toContain('git.repo.test');
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        // stderr carries output exactly when the run fails (rule.require.skill-output-streams)
        expect(result.stderr === '').toEqual(result.exitCode === 0);
        expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case17] scope with many files truncates display', () => {
    when('[t0] more than 21 files match scope', () => {
      // create 23 test files to exceed max_display=21
      const testFiles = Array.from({ length: 23 }, (_, i) => ({
        type: 'unit' as const,
        name: `feature-${String(i + 1).padStart(2, '0')}`,
      }));

      const result = useThen('skill executes', () =>
        runWithScope({
          testFiles,
          scope: 'feature',
          mode: 'plan',
          thorough: true,
        }),
      );

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('stdout shows truncation message', () => {
        expect(result.stdout).toContain('... (2 more, 23 total)');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toContain('git.repo.test');
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        // stderr carries output exactly when the run fails (rule.require.skill-output-streams)
        expect(result.stderr === '').toEqual(result.exitCode === 0);
        expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
      });
    });
  });

  // ######################################################################
  // scope stacking: multiple --scope flags
  // ######################################################################

  given('[case18] stacked scopes: path + name in plan mode', () => {
    when('[t0] --scope feature --scope name://passes is used', () => {
      const result = useThen('skill executes', () =>
        runWithScope({
          testFiles: [
            { type: 'unit', name: 'feature-a' },
            { type: 'unit', name: 'feature-b' },
            { type: 'unit', name: 'other' },
          ],
          scopes: ['feature', 'name://passes'],
          mode: 'plan',
          thorough: true,
        }),
      );

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('header shows both --scope flags in args', () => {
        expect(result.stdout).toContain(
          '--scope feature --scope name://passes',
        );
      });

      then('stdout shows combined scope display', () => {
        expect(result.stdout).toContain('scope: path://feature, name://passes');
      });

      then('stdout shows only files matched by path filter', () => {
        expect(result.stdout).toContain('matched: 2 files');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toContain('git.repo.test');
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        // stderr carries output exactly when the run fails (rule.require.skill-output-streams)
        expect(result.stderr === '').toEqual(result.exitCode === 0);
        expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case19] stacked scopes: path + name in apply mode', () => {
    when('[t0] --scope feature-a --scope name://feature-a --mode apply', () => {
      const result = useThen('skill executes', () =>
        runWithScope({
          testFiles: [
            { type: 'unit', name: 'feature-a' },
            { type: 'unit', name: 'feature-b' },
            { type: 'unit', name: 'other' },
          ],
          scopes: ['feature-a', 'name://feature-a'],
          mode: 'apply',
          thorough: true,
        }),
      );

      then('exit code is 0 (tests pass)', () => {
        expect(result.exitCode).toBe(0);
      });

      then('header shows both --scope flags in args', () => {
        expect(result.stdout).toContain(
          '--scope feature-a --scope name://feature-a',
        );
      });

      then('stdout shows combined scope display', () => {
        expect(result.stdout).toContain(
          'scope: path://feature-a, name://feature-a',
        );
      });

      then('stdout shows passed', () => {
        expect(result.stdout).toContain('passed');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toContain('git.repo.test');
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        // stderr carries output exactly when the run fails (rule.require.skill-output-streams)
        expect(result.stderr === '').toEqual(result.exitCode === 0);
        expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
      });
    });
  });

  given(
    '[case20] stacked scopes: path matches but name matches no tests',
    () => {
      when(
        '[t0] --scope feature --scope name://nonexistent --mode apply',
        () => {
          const result = useThen('skill executes', () =>
            runWithScope({
              testFiles: [
                { type: 'unit', name: 'feature-a' },
                { type: 'unit', name: 'other' },
              ],
              scopes: ['feature', 'name://nonexistent'],
              mode: 'apply',
              thorough: true,
            }),
          );

          then(
            'exit code is 2 (constraint: name pattern matched no tests)',
            () => {
              // jest finds files via path scope, but name pattern matches no test names
              // skill detects 0 tests ran and reports constraint error
              expect(result.exitCode).toBe(2);
            },
          );

          then('stdout shows no tests matched error', () => {
            expect(result.stdout).toContain('no tests matched scope');
          });

          then('stdout matches snapshot', () => {
            expect(result.stdout).toContain('git.repo.test');
            expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
          });

          then('stderr matches snapshot', () => {
            // stderr carries output exactly when the run fails (rule.require.skill-output-streams)
            expect(result.stderr === '').toEqual(result.exitCode === 0);
            expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
          });
        },
      );
    },
  );

  given('[case21] stacked scopes: path matches 0 files', () => {
    when('[t0] --scope nonexistent --scope name://passes is used', () => {
      const result = useThen('skill executes', () =>
        runWithScope({
          testFiles: [
            { type: 'unit', name: 'feature-a' },
            { type: 'unit', name: 'other' },
          ],
          scopes: ['nonexistent', 'name://passes'],
          mode: 'plan',
          thorough: true,
        }),
      );

      then('exit code is 2 (constraint: no files matched path)', () => {
        expect(result.exitCode).toBe(2);
      });

      then('stdout shows 0 files matched', () => {
        expect(result.stdout).toContain('matched: 0 files');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toContain('git.repo.test');
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        // stderr carries output exactly when the run fails (rule.require.skill-output-streams)
        expect(result.stderr === '').toEqual(result.exitCode === 0);
        expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case22] stacked scopes: two path scopes', () => {
    when('[t0] --scope feature --scope a is used', () => {
      const result = useThen('skill executes', () =>
        runWithScope({
          testFiles: [
            { type: 'unit', name: 'feature-a' },
            { type: 'unit', name: 'feature-b' },
            { type: 'unit', name: 'other-a' },
            { type: 'unit', name: 'other-b' },
          ],
          scopes: ['feature', 'a'],
          mode: 'plan',
          thorough: true,
        }),
      );

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('stdout shows combined scope display', () => {
        expect(result.stdout).toContain('scope: path://feature, path://a');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toContain('git.repo.test');
        expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        // stderr carries output exactly when the run fails (rule.require.skill-output-streams)
        expect(result.stderr === '').toEqual(result.exitCode === 0);
        expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case23] stacked scopes: two name scopes', () => {
    when(
      '[t0] --scope name://feature-a --scope name://passes --mode apply',
      () => {
        const result = useThen('skill executes', () =>
          runWithScope({
            testFiles: [
              { type: 'unit', name: 'feature-a' },
              { type: 'unit', name: 'feature-b' },
              { type: 'unit', name: 'other' },
            ],
            scopes: ['name://feature-a', 'name://passes'],
            mode: 'apply',
            thorough: true,
          }),
        );

        then(
          'exit code is 2 (constraint: two name patterns intersect to none)',
          () => {
            expect(result.exitCode).toBe(2);
          },
        );

        then('stdout shows combined scope display', () => {
          expect(result.stdout).toContain(
            'scope: name://feature-a, name://passes',
          );
        });

        then('stdout matches snapshot', () => {
          expect(result.stdout).toContain('git.repo.test');
          expect(sanitizeOutput({ output: result.stdout })).toMatchSnapshot();
        });

        then('stderr matches snapshot', () => {
          // stderr carries output exactly when the run fails (rule.require.skill-output-streams)
          expect(result.stderr === '').toEqual(result.exitCode === 0);
          expect(sanitizeOutput({ output: result.stderr })).toMatchSnapshot();
        });
      },
    );
  });
});
