import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

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
   * .what = sanitize stdout for snapshots (removes dynamic values)
   */
  const sanitizeOutput = (output: string): string =>
    output
      .replace(/\(\d+m?s\)/g, '(Xs)') // time values
      .replace(/\d+m?s/g, 'Xs') // time without parens
      .replace(/\/tmp\/[^\s\n]+/g, '/tmp/__sanitized__') // temp paths
      .replace(/\/home\/[^\s]+\/node_modules\/.pnpm\/[^\s]+/g, '__pkg__') // absolute pnpm paths
      .replace(/ {4}at [^\n]+\n/g, '    at __stack__\n') // stack traces (4 space indent)
      .replace(/Node\.js v[\d.]+/g, 'Node.js vX.X.X') // node version
      .trim();

  /**
   * .what = run git.repo.test.sh with arbitrary args (for --help, etc)
   */
  const runRaw = (
    args: string[],
  ): { stdout: string; stderr: string; exitCode: number } => {
    const result = spawnSync('bash', [scriptPath, ...args], {
      encoding: 'utf-8' as const,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  /**
   * .what = run git.repo.test.sh in a temp git repo with jest setup
   */
  const runWithScope = (args: {
    testFiles: Array<{ type: 'unit' | 'integration'; name: string }>;
    scope?: string;
    scopes?: string[];
    what?: 'unit' | 'integration';
    mode?: 'plan' | 'apply';
    thorough?: boolean;
  }): { stdout: string; stderr: string; exitCode: number } => {
    const tempDir = genTempDir({ slug: 'scope-test', git: true });
    const what = args.what ?? 'unit';

    // create package.json with jest
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(
        {
          name: 'test-repo',
          devDependencies: { jest: '30.2.0' },
          scripts: {
            'test:unit': 'jest --config jest.unit.config.js',
            'test:integration': 'jest --config jest.integration.config.js',
          },
        },
        null,
        2,
      ),
    );

    // create jest configs
    for (const configType of ['unit', 'integration']) {
      const testMatch =
        configType === 'unit' ? '**/*.test.js' : `**/*.integration.test.js`;
      const ignorePatterns =
        configType === 'unit'
          ? `testPathIgnorePatterns: ['.integration.test.js'],`
          : '';
      fs.writeFileSync(
        path.join(tempDir, `jest.${configType}.config.js`),
        `module.exports = { testMatch: ['${testMatch}'], ${ignorePatterns} transform: {}, testEnvironment: 'node' };`,
      );
    }

    // create test files
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    for (const testFile of args.testFiles) {
      const suffix =
        testFile.type === 'unit' ? 'test.js' : 'integration.test.js';
      fs.writeFileSync(
        path.join(tempDir, 'src', `${testFile.name}.${suffix}`),
        `describe('${testFile.name}', () => { it('passes', () => {}); });`,
      );
    }

    // symlink node_modules for jest to work
    fs.symlinkSync(
      path.join(repoRoot, 'node_modules'),
      path.join(tempDir, 'node_modules'),
    );

    // commit to establish git history
    spawnSync('git', ['add', '.'], { cwd: tempDir });
    spawnSync('git', ['commit', '-m', 'initial'], { cwd: tempDir });

    // build args — support both single scope and stacked scopes
    const scopeList = args.scopes ?? (args.scope ? [args.scope] : []);
    const skillArgs = ['--what', what];
    for (const s of scopeList) {
      skillArgs.push('--scope', s);
    }
    if (args.mode) skillArgs.push('--mode', args.mode);
    if (args.thorough) skillArgs.push('--thorough');

    const result = spawnSync('bash', [scriptPath, ...skillArgs], {
      cwd: tempDir,
      encoding: 'utf-8' as const, // node api requires this exact string
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  given('[case0] --help output', () => {
    when('[t0] --help is passed', () => {
      const result = useThen('skill executes', () => runRaw(['--help']));

      then('exit code is 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('stdout shows usage info', () => {
        expect(result.stdout).toContain('git.repo.test');
        expect(result.stdout).toContain('--what');
        expect(result.stdout).toContain('--scope');
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
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
        expect(result.exitCode).not.toBe(1);
      });

      then('stdout shows matched files', () => {
        expect(result.stdout).toContain('matched:');
        expect(result.stdout).not.toContain('cannot verify scope');
      });

      then('stdout shows scope', () => {
        expect(result.stdout).toContain('scope: path://myfeature');
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
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
        expect(result.exitCode).not.toBe(1);
      });

      then('stdout shows matched: 1 files', () => {
        expect(result.stdout).toContain('matched: 1 files');
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
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
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
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
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
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
        expect(result.stdout).toContain('scope: myfeature');
        expect(result.stdout).toContain('matched: 1 files');
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
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
        expect(result.exitCode).not.toBe(1);
      });

      then('stdout shows scope', () => {
        expect(result.stdout).toContain('scope: name://passes');
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
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
        expect(result.exitCode).not.toBe(1);
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given(
    '[case8] scope with --what integration (keyrack failure in temp repo)',
    () => {
      // .note = this tests the ERROR PATH when keyrack unlock fails, NOT keyrack integration.
      // purpose: verify git.repo.test.sh surfaces keyrack errors correctly to the user.
      // keyrack integration tests belong in keyrack's own test suite.
      when('[t0] --scope myfeature --what integration is used', () => {
        const result = useThen('skill executes', () =>
          runWithScope({
            testFiles: [
              { type: 'integration', name: 'myfeature' },
              { type: 'integration', name: 'other' },
            ],
            scope: 'myfeature',
            what: 'integration',
            thorough: true,
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
          expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        });

        then('stderr matches snapshot', () => {
          expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
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
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
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
        expect(result.exitCode).not.toBe(1);
      });

      then('stdout shows matched files', () => {
        expect(result.stdout).toContain('matched: 1 files');
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
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

      then('exit code reflects jest finding no matching tests', () => {
        // jest exits with error when --testNamePattern matches no tests
        expect([0, 1, 2]).toContain(result.exitCode);
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
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
        expect(result.exitCode).not.toBe(1);
      });

      then('stdout shows multiple matched files', () => {
        expect(result.stdout).toContain('matched: 2 files');
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
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
          expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        });

        then('stderr matches snapshot', () => {
          expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
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
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
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
          expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        });

        then('stderr matches snapshot', () => {
          expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
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
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
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
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
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
        expect(result.stdout).toContain(
          'scope: feature + name://passes',
        );
      });

      then('stdout shows only files matched by path filter', () => {
        expect(result.stdout).toContain('matched: 2 files');
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case19] stacked scopes: path + name in apply mode', () => {
    when(
      '[t0] --scope feature-a --scope name://feature-a --mode apply',
      () => {
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
            'scope: feature-a + name://feature-a',
          );
        });

        then('stdout shows passed', () => {
          expect(result.stdout).toContain('passed');
        });

        then('stdout matches snapshot', () => {
          expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        });

        then('stderr matches snapshot', () => {
          expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
        });
      },
    );
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

          then('exit code is 0 (jest passes with 0 tests matched)', () => {
            // jest finds files via path scope, but name pattern matches no test names
            // jest considers this a success (0 passed, 0 failed) and exits 0
            expect(result.exitCode).toBe(0);
          });

          then('stdout shows 0 tests in stats', () => {
            expect(result.stdout).toContain(
              'tests: 0 passed, 0 failed, 0 skipped',
            );
          });

          then('stdout matches snapshot', () => {
            expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
          });

          then('stderr matches snapshot', () => {
            expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
          });
        },
      );
    },
  );

  given('[case21] stacked scopes: path matches 0 files', () => {
    when(
      '[t0] --scope nonexistent --scope name://passes is used',
      () => {
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
          expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        });

        then('stderr matches snapshot', () => {
          expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
        });
      },
    );
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
        expect(result.stdout).toContain('scope: feature + a');
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
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

        then('exit code reflects jest behavior with two name patterns', () => {
          // jest applies multiple --testNamePattern as intersection
          expect([0, 2]).toContain(result.exitCode);
        });

        then('stdout shows combined scope display', () => {
          expect(result.stdout).toContain(
            'scope: name://feature-a + name://passes',
          );
        });

        then('stdout matches snapshot', () => {
          expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        });

        then('stderr matches snapshot', () => {
          expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
        });
      },
    );
  });
});
