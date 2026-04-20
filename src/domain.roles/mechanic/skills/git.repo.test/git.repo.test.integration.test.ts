import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = integration tests for git.repo.test.sh skill
 * .why = verify lint enforcement works correctly with proper exit codes and output
 */
describe('git.repo.test.sh', () => {
  const scriptPath = path.join(__dirname, 'git.repo.test.sh');

  // repo root for symlink to node_modules (required for jest --listTests)
  const repoRoot = path.join(__dirname, '../../../../..');

  /**
   * .what = run git.repo.test.sh in a temp git repo
   * .why = isolates tests from real repo state
   */
  const runInTempGitRepo = (args: {
    packageJson?: object | null;
    eslintConfig?: object | null;
    sourceFiles?: Record<string, string>;
    jestConfigs?: Array<'unit' | 'integration' | 'acceptance'>;
    testFiles?: Array<{
      type: 'unit' | 'integration' | 'acceptance';
      name: string;
    }>;
    symlinkNodeModules?: boolean;
    testTypesScript?: string;
    testFormatScript?: string;
    testLintScript?: string;
    testUnitScript?: string;
    testIntegrationScript?: string;
    testAcceptanceScript?: string;
    gitRepoTestArgs: string[];
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'git-repo-test', git: true });

    // create package.json
    if (args.packageJson !== null) {
      const pkgJson = args.packageJson ?? {
        name: 'test-repo',
        scripts: {
          ...(args.testTypesScript && { 'test:types': args.testTypesScript }),
          ...(args.testFormatScript && {
            'test:format': args.testFormatScript,
          }),
          ...(args.testLintScript && { 'test:lint': args.testLintScript }),
          ...(args.testUnitScript && { 'test:unit': args.testUnitScript }),
          ...(args.testIntegrationScript && {
            'test:integration': args.testIntegrationScript,
          }),
          ...(args.testAcceptanceScript && {
            'test:acceptance': args.testAcceptanceScript,
          }),
        },
      };
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(pkgJson, null, 2),
      );
    }

    // create eslint config
    if (args.eslintConfig !== null) {
      const eslintConfig = args.eslintConfig ?? {
        rules: {
          'no-unused-vars': 'error',
        },
      };
      fs.writeFileSync(
        path.join(tempDir, '.eslintrc.json'),
        JSON.stringify(eslintConfig, null, 2),
      );
    }

    // create jest config files
    if (args.jestConfigs) {
      for (const configType of args.jestConfigs) {
        // use .js files to skip ts-jest compilation overhead
        // unit uses *.test.js but excludes *.integration.test.js and *.acceptance.test.js
        // integration/acceptance use their specific suffix
        const testMatch =
          configType === 'unit' ? '**/*.test.js' : `**/*.${configType}.test.js`;
        // unit must exclude other test types to avoid overlap
        const testPathIgnorePatterns =
          configType === 'unit'
            ? `testPathIgnorePatterns: ['.integration.test.js', '.acceptance.test.js'],`
            : '';
        // minimal config: no transforms, no test environment overhead
        const configContent = `
module.exports = {
  testMatch: ['${testMatch}'],
  ${testPathIgnorePatterns}
  transform: {},
  testEnvironment: 'node',
};
`;
        fs.writeFileSync(
          path.join(tempDir, `jest.${configType}.config.ts`),
          configContent,
        );
      }
    }

    // create test files for scope filtering tests
    if (args.testFiles) {
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      for (const testFile of args.testFiles) {
        // use .js to skip ts-jest compilation overhead
        const suffix =
          testFile.type === 'unit' ? 'test.js' : `${testFile.type}.test.js`;
        const filePath = path.join(
          tempDir,
          'src',
          `${testFile.name}.${suffix}`,
        );
        fs.writeFileSync(
          filePath,
          `describe('${testFile.name}', () => { it('passes', () => {}); });\n`,
        );
      }
    }

    // symlink node_modules for jest --listTests to work
    if (args.symlinkNodeModules) {
      fs.symlinkSync(
        path.join(repoRoot, 'node_modules'),
        path.join(tempDir, 'node_modules'),
      );
    }

    // create source files
    if (args.sourceFiles) {
      for (const [filePath, content] of Object.entries(args.sourceFiles)) {
        const fullPath = path.join(tempDir, filePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
      }
    }

    // run git.repo.test.sh
    const result = spawnSync('bash', [scriptPath, ...args.gitRepoTestArgs], {
      cwd: tempDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      tempDir,
    };
  };

  /**
   * .what = sanitize stdout for snapshot stability
   * .why = temp dir paths, timestamps, and elapsed times change between runs
   */
  const sanitizeOutput = (stdout: string): string =>
    stdout
      .replace(/\/tmp\/[^\s]+/g, '/tmp/TEMP_DIR')
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z/g, 'ISOTIME')
      // mask elapsed times: (0s), (5s), (123s) -> (Xs)
      .replace(/\((\d+)s\)/g, '(Xs)')
      // mask time stats: time: 2s -> time: Xs
      .replace(/time: \d+s/g, 'time: Xs');

  given('[case1] lint passes', () => {
    when('[t0] `rhx git.repo.test --what lint` is run', () => {
      then('exit code is 0', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/valid.js': 'const x = 1;\nconsole.log(x);\n',
          },
          testLintScript: 'echo "lint passed"',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(result.exitCode).toBe(0);
      });

      then(
        'stdout shows turtle success summary (per rule.require.skill-output-streams)',
        () => {
          const result = runInTempGitRepo({
            sourceFiles: {
              'src/valid.js': 'const x = 1;\nconsole.log(x);\n',
            },
            testLintScript: 'echo "lint passed"',
            gitRepoTestArgs: ['--what', 'lint'],
          });

          // success: output to stdout only (per rule)
          // progressive output starts with "lets ride..." header
          expect(result.stdout).toContain('lets ride');
          expect(result.stdout).toContain('git.repo.test --what lint');
        },
      );

      then('stdout shows status: passed', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/valid.js': 'const x = 1;\nconsole.log(x);\n',
          },
          testLintScript: 'echo "lint passed"',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(result.stdout).toContain('🎉 passed');
      });

      then('stdout does NOT show log path (no log on success)', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/valid.js': 'const x = 1;\nconsole.log(x);\n',
          },
          testLintScript: 'echo "lint passed"',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(result.stdout).not.toContain('.stdout.log');
      });

      then('no log file is created on success', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/valid.js': 'const x = 1;\nconsole.log(x);\n',
          },
          testLintScript: 'echo "lint passed"',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        const logDir = path.join(
          result.tempDir,
          '.log/role=mechanic/skill=git.repo.test/what=lint',
        );
        if (fs.existsSync(logDir)) {
          const logFiles = fs
            .readdirSync(logDir)
            .filter((f) => f.endsWith('.stdout.log'));
          expect(logFiles.length).toBe(0);
        }
      });

      then(
        'stderr is empty on success (per rule.require.skill-output-streams)',
        () => {
          const result = runInTempGitRepo({
            sourceFiles: {
              'src/valid.js': 'const x = 1;\nconsole.log(x);\n',
            },
            testLintScript: 'echo "lint passed"',
            gitRepoTestArgs: ['--what', 'lint'],
          });

          expect(result.stderr).toBe('');
        },
      );

      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/valid.js': 'const x = 1;\nconsole.log(x);\n',
          },
          testLintScript: 'echo "lint passed"',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        // success output goes to stdout
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case2] lint fails', () => {
    when('[t0] `rhx git.repo.test --what lint` is run', () => {
      then('exit code is 2', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/broken.js': 'const unused = 1;\n',
          },
          testLintScript: 'echo "3 errors, 4 warnings" && exit 1',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(result.exitCode).toBe(2);
      });

      then('stderr shows turtle failure summary', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/broken.js': 'const unused = 1;\n',
          },
          testLintScript: 'echo "3 errors, 4 warnings" && exit 1',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(result.stderr).toContain('bummer dude');
        expect(result.stderr).toContain('git.repo.test --what lint');
      });

      then('stderr shows status: failed', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/broken.js': 'const unused = 1;\n',
          },
          testLintScript: 'echo "3 errors, 4 warnings" && exit 1',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(result.stderr).toContain('✋ failed');
      });

      then('stderr shows defect count', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/broken.js': 'const unused = 1;\n',
          },
          testLintScript: 'echo "3 errors, 4 warnings" && exit 1',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(result.stderr).toContain('defects: 3');
      });

      then('stderr shows log path', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/broken.js': 'const unused = 1;\n',
          },
          testLintScript: 'echo "3 errors, 4 warnings" && exit 1',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(result.stderr).toContain(
          '.log/role=mechanic/skill=git.repo.test/',
        );
      });

      then('stderr shows tip to try npm run fix', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/broken.js': 'const unused = 1;\n',
          },
          testLintScript: 'echo "3 errors, 4 warnings" && exit 1',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(result.stderr).toContain('npm run fix');
      });

      then('stdout has progressive output (header + summary)', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/broken.js': 'const unused = 1;\n',
          },
          testLintScript: 'echo "3 errors, 4 warnings" && exit 1',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        // failure: both stdout and stderr have output (per rule)
        expect(result.stdout).toContain('lets ride');
        expect(result.stdout).toContain('✋ failed');
      });

      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/broken.js': 'const unused = 1;\n',
          },
          testLintScript: 'echo "3 errors, 4 warnings" && exit 1',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case3] npm error (malfunction)', () => {
    when('[t0] `rhx git.repo.test --what lint` is run', () => {
      then('exit code is 1', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/file.js': 'const x = 1;\n',
          },
          testLintScript: 'echo "npm ERR! command not found" >&2 && exit 127',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(result.exitCode).toBe(1);
      });

      then('stderr contains error', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/file.js': 'const x = 1;\n',
          },
          testLintScript: 'echo "npm ERR! command not found" >&2 && exit 127',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(result.stderr).toContain('npm ERR!');
      });

      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/file.js': 'const x = 1;\n',
          },
          testLintScript: 'echo "npm ERR! command not found" >&2 && exit 127',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case4] no package.json', () => {
    when('[t0] `rhx git.repo.test --what lint` is run', () => {
      then('exit code is 2', () => {
        const result = runInTempGitRepo({
          packageJson: null,
          eslintConfig: null,
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(result.exitCode).toBe(2);
      });

      then('stderr explains absent package.json', () => {
        const result = runInTempGitRepo({
          packageJson: null,
          eslintConfig: null,
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(result.stderr).toContain('no package.json');
      });

      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          packageJson: null,
          eslintConfig: null,
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case5] log directory findsert', () => {
    when('[t0] `rhx git.repo.test --what lint` is run', () => {
      then('log directory is created', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/valid.js': 'const x = 1;\nconsole.log(x);\n',
          },
          testLintScript: 'echo "lint passed"',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        const logDir = path.join(
          result.tempDir,
          '.log/role=mechanic/skill=git.repo.test/what=lint',
        );
        expect(fs.existsSync(logDir)).toBe(true);
      });

      then('.gitignore is created in log directory', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/valid.js': 'const x = 1;\nconsole.log(x);\n',
          },
          testLintScript: 'echo "lint passed"',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        const gitignorePath = path.join(
          result.tempDir,
          '.log/role=mechanic/skill=git.repo.test/what=lint/.gitignore',
        );
        expect(fs.existsSync(gitignorePath)).toBe(true);
      });

      then('.gitignore contains self-ignore pattern', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/valid.js': 'const x = 1;\nconsole.log(x);\n',
          },
          testLintScript: 'echo "lint passed"',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        const gitignorePath = path.join(
          result.tempDir,
          '.log/role=mechanic/skill=git.repo.test/what=lint/.gitignore',
        );
        const content = fs.readFileSync(gitignorePath, 'utf-8');
        expect(content).toContain('*');
      });
    });
  });

  given('[case6] log file content (only on errors)', () => {
    when('[t0] lint has errors', () => {
      then('log file is created and contains full npm stdout', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/broken.js': 'const unused = 1;\n',
          },
          testLintScript: 'echo "3 errors, 4 warnings\nline2\nline3" && exit 1',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        const logDir = path.join(
          result.tempDir,
          '.log/role=mechanic/skill=git.repo.test/what=lint',
        );
        const logFiles = fs
          .readdirSync(logDir)
          .filter((f) => f.endsWith('.stdout.log'));
        expect(logFiles.length).toBeGreaterThan(0);

        const logContent = fs.readFileSync(
          path.join(logDir, logFiles[0]!),
          'utf-8',
        );
        expect(logContent).toContain('3 errors');
      });
    });
  });

  given('[case7] argument validation', () => {
    when('[t0] --what is omitted', () => {
      then('exit code is 2', () => {
        const result = runInTempGitRepo({
          gitRepoTestArgs: [],
        });

        expect(result.exitCode).toBe(2);
      });

      then('stderr shows error about --what required', () => {
        const result = runInTempGitRepo({
          gitRepoTestArgs: [],
        });

        expect(result.stderr).toContain('--what is required');
      });

      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          gitRepoTestArgs: [],
        });

        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] --what has unsupported value', () => {
      then('exit code is 2', () => {
        const result = runInTempGitRepo({
          gitRepoTestArgs: ['--what', 'foobar'],
        });

        expect(result.exitCode).toBe(2);
      });

      then('stderr shows error about invalid --what value', () => {
        const result = runInTempGitRepo({
          gitRepoTestArgs: ['--what', 'foobar'],
        });

        expect(result.stderr).toContain("invalid --what value 'foobar'");
        expect(result.stderr).toContain(
          'valid values: types | format | lint | unit | integration | acceptance | all',
        );
      });

      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          gitRepoTestArgs: ['--what', 'foobar'],
        });

        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case8] not in git repo', () => {
    when('[t0] run outside any git repo', () => {
      then('exit code is 2 and shows error', () => {
        const tempDir = genTempDir({ slug: 'no-git-repo' });

        fs.writeFileSync(
          path.join(tempDir, 'package.json'),
          JSON.stringify({ name: 'test', scripts: { 'test:lint': 'echo ok' } }),
        );

        const result = spawnSync('bash', [scriptPath, '--what', 'lint'], {
          cwd: tempDir,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        expect(result.status).toBe(2);
        expect(result.stderr).toContain('not in a git repository');
      });

      then('output matches snapshot', () => {
        const tempDir = genTempDir({ slug: 'no-git-repo' });

        fs.writeFileSync(
          path.join(tempDir, 'package.json'),
          JSON.stringify({ name: 'test', scripts: { 'test:lint': 'echo ok' } }),
        );

        const result = spawnSync('bash', [scriptPath, '--what', 'lint'], {
          cwd: tempDir,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        expect(sanitizeOutput(result.stderr ?? '')).toMatchSnapshot();
      });
    });
  });

  given('[case9] no test:lint script in package.json', () => {
    when('[t0] `rhx git.repo.test --what lint` is run (default)', () => {
      then('exit code is 2 (constraint)', () => {
        const result = runInTempGitRepo({
          packageJson: { name: 'test-repo', scripts: {} },
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(result.exitCode).toBe(2);
      });

      then('stderr shows error about absent command', () => {
        const result = runInTempGitRepo({
          packageJson: { name: 'test-repo', scripts: {} },
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(result.stderr).toContain("no 'test:lint' command");
      });

      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          packageJson: { name: 'test-repo', scripts: {} },
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when(
      '[t1] `rhx git.repo.test --what lint --when hook.onStop` is run',
      () => {
        then('exit code is 0 (silent success)', () => {
          const result = runInTempGitRepo({
            packageJson: { name: 'test-repo', scripts: {} },
            gitRepoTestArgs: ['--what', 'lint', '--when', 'hook.onStop'],
          });

          expect(result.exitCode).toBe(0);
        });

        then('stdout is empty (silent)', () => {
          const result = runInTempGitRepo({
            packageJson: { name: 'test-repo', scripts: {} },
            gitRepoTestArgs: ['--what', 'lint', '--when', 'hook.onStop'],
          });

          expect(result.stdout).toBe('');
        });

        then('stderr is empty (silent)', () => {
          const result = runInTempGitRepo({
            packageJson: { name: 'test-repo', scripts: {} },
            gitRepoTestArgs: ['--what', 'lint', '--when', 'hook.onStop'],
          });

          expect(result.stderr).toBe('');
        });
      },
    );
  });

  given('[case10] lint exits with non-zero (warnings or errors)', () => {
    when('[t0] lint exits with code 1', () => {
      then('exit code is 2 (failure)', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/file.js': 'const x = 1;\n',
          },
          testLintScript: 'echo "4 warnings" && exit 1',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(result.exitCode).toBe(2);
      });

      then('stderr shows failure summary', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/file.js': 'const x = 1;\n',
          },
          testLintScript: 'echo "4 warnings" && exit 1',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(result.stderr).toContain('bummer dude');
        expect(result.stderr).toContain('✋ failed');
      });

      then('log file is created (failure persists logs)', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/file.js': 'const x = 1;\n',
          },
          testLintScript: 'echo "4 warnings" && exit 1',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        const logDir = path.join(
          result.tempDir,
          '.log/role=mechanic/skill=git.repo.test/what=lint',
        );
        expect(fs.existsSync(logDir)).toBe(true);
        const logFiles = fs
          .readdirSync(logDir)
          .filter((f) => f.endsWith('.stdout.log'));
        expect(logFiles.length).toBeGreaterThan(0);
      });

      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/file.js': 'const x = 1;\n',
          },
          testLintScript: 'echo "4 warnings" && exit 1',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case11] types passes', () => {
    when('[t0] `rhx git.repo.test --what types` is run', () => {
      then('exit code is 0', () => {
        const result = runInTempGitRepo({
          testTypesScript: 'echo "types ok"',
          gitRepoTestArgs: ['--what', 'types'],
        });

        expect(result.exitCode).toBe(0);
      });

      then('stdout shows success summary', () => {
        const result = runInTempGitRepo({
          testTypesScript: 'echo "types ok"',
          gitRepoTestArgs: ['--what', 'types'],
        });

        expect(result.stdout).toContain('lets ride');
        expect(result.stdout).toContain('🎉 passed');
      });

      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          testTypesScript: 'echo "types ok"',
          gitRepoTestArgs: ['--what', 'types'],
        });

        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case12] types fails', () => {
    when('[t0] `rhx git.repo.test --what types` is run', () => {
      then('exit code is 2', () => {
        const result = runInTempGitRepo({
          testTypesScript: 'echo "TS2322: Type error" && exit 1',
          gitRepoTestArgs: ['--what', 'types'],
        });

        expect(result.exitCode).toBe(2);
      });

      then('stderr shows failure summary', () => {
        const result = runInTempGitRepo({
          testTypesScript: 'echo "TS2322: Type error" && exit 1',
          gitRepoTestArgs: ['--what', 'types'],
        });

        expect(result.stderr).toContain('bummer dude');
        expect(result.stderr).toContain('failed');
      });

      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          testTypesScript: 'echo "TS2322: Type error" && exit 1',
          gitRepoTestArgs: ['--what', 'types'],
        });

        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case13] format passes', () => {
    when('[t0] `rhx git.repo.test --what format` is run', () => {
      then('exit code is 0', () => {
        const result = runInTempGitRepo({
          testFormatScript: 'echo "format ok"',
          gitRepoTestArgs: ['--what', 'format'],
        });

        expect(result.exitCode).toBe(0);
      });

      then('stdout shows success summary', () => {
        const result = runInTempGitRepo({
          testFormatScript: 'echo "format ok"',
          gitRepoTestArgs: ['--what', 'format'],
        });

        expect(result.stdout).toContain('lets ride');
        expect(result.stdout).toContain('🎉 passed');
      });

      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          testFormatScript: 'echo "format ok"',
          gitRepoTestArgs: ['--what', 'format'],
        });

        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case14] format fails', () => {
    when('[t0] `rhx git.repo.test --what format` is run', () => {
      then('exit code is 2', () => {
        const result = runInTempGitRepo({
          testFormatScript: 'echo "formatting error" && exit 1',
          gitRepoTestArgs: ['--what', 'format'],
        });

        expect(result.exitCode).toBe(2);
      });

      then('stderr shows failure summary', () => {
        const result = runInTempGitRepo({
          testFormatScript: 'echo "formatting error" && exit 1',
          gitRepoTestArgs: ['--what', 'format'],
        });

        expect(result.stderr).toContain('bummer dude');
        expect(result.stderr).toContain('failed');
      });

      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          testFormatScript: 'echo "formatting error" && exit 1',
          gitRepoTestArgs: ['--what', 'format'],
        });

        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case15] no test:types command in package.json', () => {
    when('[t0] `rhx git.repo.test --what types` is run (default)', () => {
      then('exit code is 2 (constraint)', () => {
        const result = runInTempGitRepo({
          packageJson: { name: 'test-repo', scripts: {} },
          gitRepoTestArgs: ['--what', 'types'],
        });

        expect(result.exitCode).toBe(2);
      });

      then('stderr shows error about absent command', () => {
        const result = runInTempGitRepo({
          packageJson: { name: 'test-repo', scripts: {} },
          gitRepoTestArgs: ['--what', 'types'],
        });

        expect(result.stderr).toContain("no 'test:types' command");
      });
    });

    when(
      '[t1] `rhx git.repo.test --what types --when hook.onStop` is run',
      () => {
        then('exit code is 0 (silent success)', () => {
          const result = runInTempGitRepo({
            packageJson: { name: 'test-repo', scripts: {} },
            gitRepoTestArgs: ['--what', 'types', '--when', 'hook.onStop'],
          });

          expect(result.exitCode).toBe(0);
        });

        then('stdout is empty (silent)', () => {
          const result = runInTempGitRepo({
            packageJson: { name: 'test-repo', scripts: {} },
            gitRepoTestArgs: ['--what', 'types', '--when', 'hook.onStop'],
          });

          expect(result.stdout).toBe('');
        });

        then('stderr is empty (silent)', () => {
          const result = runInTempGitRepo({
            packageJson: { name: 'test-repo', scripts: {} },
            gitRepoTestArgs: ['--what', 'types', '--when', 'hook.onStop'],
          });

          expect(result.stderr).toBe('');
        });
      },
    );
  });

  given('[case16] no test:format command in package.json', () => {
    when('[t0] `rhx git.repo.test --what format` is run (default)', () => {
      then('exit code is 2 (constraint)', () => {
        const result = runInTempGitRepo({
          packageJson: { name: 'test-repo', scripts: {} },
          gitRepoTestArgs: ['--what', 'format'],
        });

        expect(result.exitCode).toBe(2);
      });

      then('stderr shows error about absent command', () => {
        const result = runInTempGitRepo({
          packageJson: { name: 'test-repo', scripts: {} },
          gitRepoTestArgs: ['--what', 'format'],
        });

        expect(result.stderr).toContain("no 'test:format' command");
      });
    });

    when(
      '[t1] `rhx git.repo.test --what format --when hook.onStop` is run',
      () => {
        then('exit code is 0 (silent success)', () => {
          const result = runInTempGitRepo({
            packageJson: { name: 'test-repo', scripts: {} },
            gitRepoTestArgs: ['--what', 'format', '--when', 'hook.onStop'],
          });

          expect(result.exitCode).toBe(0);
        });

        then('stdout is empty (silent)', () => {
          const result = runInTempGitRepo({
            packageJson: { name: 'test-repo', scripts: {} },
            gitRepoTestArgs: ['--what', 'format', '--when', 'hook.onStop'],
          });

          expect(result.stdout).toBe('');
        });

        then('stderr is empty (silent)', () => {
          const result = runInTempGitRepo({
            packageJson: { name: 'test-repo', scripts: {} },
            gitRepoTestArgs: ['--what', 'format', '--when', 'hook.onStop'],
          });

          expect(result.stderr).toBe('');
        });
      },
    );
  });

  given('[case17] comma-separated --what values', () => {
    when('[t0] `rhx git.repo.test --what types,format` is run', () => {
      then('exit code is 0 (all pass)', () => {
        const result = runInTempGitRepo({
          testTypesScript: 'echo "types ok"',
          testFormatScript: 'echo "format ok"',
          gitRepoTestArgs: ['--what', 'types,format'],
        });

        expect(result.exitCode).toBe(0);
      });

      then('stdout shows both test sections', () => {
        const result = runInTempGitRepo({
          testTypesScript: 'echo "types ok"',
          testFormatScript: 'echo "format ok"',
          gitRepoTestArgs: ['--what', 'types,format'],
        });

        expect(result.stdout).toContain('git.repo.test --what types');
        expect(result.stdout).toContain('git.repo.test --what format');
      });

      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          testTypesScript: 'echo "types ok"',
          testFormatScript: 'echo "format ok"',
          gitRepoTestArgs: ['--what', 'types,format'],
        });

        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] first type fails', () => {
      then('exit code is 2 (stops at first failure)', () => {
        const result = runInTempGitRepo({
          testTypesScript: 'echo "type error" && exit 1',
          testFormatScript: 'echo "format ok"',
          gitRepoTestArgs: ['--what', 'types,format'],
        });

        expect(result.exitCode).toBe(2);
      });

      then('stdout shows only first test section', () => {
        const result = runInTempGitRepo({
          testTypesScript: 'echo "type error" && exit 1',
          testFormatScript: 'echo "format ok"',
          gitRepoTestArgs: ['--what', 'types,format'],
        });

        expect(result.stdout).toContain('git.repo.test --what types');
        expect(result.stdout).not.toContain('git.repo.test --what format');
      });
    });
  });

  given('[case18] invalid type in comma-separated list', () => {
    when('[t0] `rhx git.repo.test --what types,invalid` is run', () => {
      then('exit code is 2', () => {
        const result = runInTempGitRepo({
          testTypesScript: 'echo "types ok"',
          gitRepoTestArgs: ['--what', 'types,invalid'],
        });

        expect(result.exitCode).toBe(2);
      });

      then('stderr shows error about invalid type', () => {
        const result = runInTempGitRepo({
          testTypesScript: 'echo "types ok"',
          gitRepoTestArgs: ['--what', 'types,invalid'],
        });

        expect(result.stderr).toContain("invalid type 'invalid'");
      });
    });
  });

  given('[case19] --scope matches 0 files', () => {
    when(
      '[t0] `rhx git.repo.test --what unit --scope nonexistent-pattern-xyz` is run',
      () => {
        const result = useThen('command executes', () =>
          runInTempGitRepo({
            jestConfigs: ['unit'],
            testUnitScript: 'jest --config jest.unit.config.ts',
            symlinkNodeModules: true,
            gitRepoTestArgs: [
              '--what',
              'unit',
              '--scope',
              'nonexistent-pattern-xyz-12345',
            ],
          }),
        );

        then('exit code is 2 (constraint)', () => {
          expect(result.exitCode).toBe(2);
        });

        then('stdout shows scope matched 0 files', () => {
          expect(result.stdout).toContain('matched: 0 files');
        });

        then('stderr shows constraint error about no tests matched', () => {
          expect(result.stderr).toContain('status: constraint');
          expect(result.stderr).toContain(
            "no tests matched scope 'nonexistent-pattern-xyz-12345'",
          );
        });

        then(
          'output does NOT show inflight timer (failfast before timer start)',
          () => {
            // should NOT have timer output since we failfast before timer start
            expect(result.stdout).not.toContain('inflight');
          },
        );

        then('output matches snapshot', () => {
          expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
          expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
        });
      },
    );

    when(
      '[t1] `rhx git.repo.test --what unit --scope another-nonexistent` is run',
      () => {
        then('completes quickly with 0 matches', () => {
          // verify failfast is fast (< 5s) for 0 matches
          const start = Date.now();
          const result = runInTempGitRepo({
            jestConfigs: ['unit'],
            testUnitScript: 'jest --config jest.unit.config.ts',
            symlinkNodeModules: true,
            gitRepoTestArgs: [
              '--what',
              'unit',
              '--scope',
              'another-nonexistent-xyz-12345',
            ],
          });
          const elapsed = Date.now() - start;

          expect(result.exitCode).toBe(2);
          expect(elapsed).toBeLessThan(5000);
        });
      },
    );
  });

  given('[case20] --scope matches some files', () => {
    when(
      '[t0] `rhx git.repo.test --what unit --scope myfeature` is run',
      () => {
        const result = useThen('command executes', () =>
          runInTempGitRepo({
            jestConfigs: ['unit'],
            testUnitScript: 'jest --config jest.unit.config.ts',
            testFiles: [{ type: 'unit', name: 'myfeature' }],
            symlinkNodeModules: true,
            gitRepoTestArgs: ['--what', 'unit', '--scope', 'myfeature'],
          }),
        );

        then('stdout shows matched files count > 0', () => {
          // should show matched count (myfeature test file matches)
          expect(result.stdout).toMatch(/matched: [1-9]\d* files/);
        });

        then('output shows inflight timer (test actually runs)', () => {
          // should have timer output since test runs
          expect(result.stdout).toContain('inflight');
        });
      },
    );
  });

  given('[case21] jest config file absent', () => {
    when(
      '[t0] `rhx git.repo.test --what unit` is run without jest.unit.config.ts',
      () => {
        then('exit code is 2 (constraint)', () => {
          const result = runInTempGitRepo({
            packageJson: {
              name: 'test-repo',
              scripts: {
                'test:unit': 'jest',
              },
            },
            // no jest.unit.config.ts created
            gitRepoTestArgs: ['--what', 'unit'],
          });

          expect(result.exitCode).toBe(2);
        });

        then('stdout shows config file not found error', () => {
          const result = runInTempGitRepo({
            packageJson: {
              name: 'test-repo',
              scripts: {
                'test:unit': 'jest',
              },
            },
            gitRepoTestArgs: ['--what', 'unit'],
          });

          expect(result.stdout).toContain('jest.unit.config.ts not found');
          expect(result.stdout).toContain('status: constraint');
        });

        then('stderr shows same error (per output streams rule)', () => {
          const result = runInTempGitRepo({
            packageJson: {
              name: 'test-repo',
              scripts: {
                'test:unit': 'jest',
              },
            },
            gitRepoTestArgs: ['--what', 'unit'],
          });

          expect(result.stderr).toContain('jest.unit.config.ts not found');
        });

        then('output matches snapshot', () => {
          const result = runInTempGitRepo({
            packageJson: {
              name: 'test-repo',
              scripts: {
                'test:unit': 'jest',
              },
            },
            gitRepoTestArgs: ['--what', 'unit'],
          });

          expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        });
      },
    );

    when(
      '[t1] `rhx git.repo.test --what integration` is run without jest.integration.config.ts',
      () => {
        then('exit code is 2 and mentions integration config', () => {
          const result = runInTempGitRepo({
            packageJson: {
              name: 'test-repo',
              scripts: {
                'test:integration': 'jest',
              },
            },
            gitRepoTestArgs: ['--what', 'integration'],
          });

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            'jest.integration.config.ts not found',
          );
        });
      },
    );

    when(
      '[t2] `rhx git.repo.test --what lint` is run (no config needed)',
      () => {
        then('does NOT failfast for absent config (lint uses eslint)', () => {
          const result = runInTempGitRepo({
            packageJson: {
              name: 'test-repo',
              scripts: {
                'test:lint': 'echo "lint passed"',
              },
            },
            gitRepoTestArgs: ['--what', 'lint'],
          });

          // lint should pass (no jest config required)
          expect(result.exitCode).toBe(0);
          expect(result.stdout).not.toContain('config.ts not found');
        });
      },
    );
  });

  given('[case22] --timeout flag', () => {
    when(
      '[t0] `rhx git.repo.test --what lint --timeout 1` with slow command',
      () => {
        then('exit code is 1 (malfunction) when timeout exceeded', () => {
          const result = runInTempGitRepo({
            packageJson: {
              name: 'test-repo',
              scripts: {
                'test:lint': 'sleep 5',
              },
            },
            gitRepoTestArgs: ['--what', 'lint', '--timeout', '1'],
          });

          expect(result.exitCode).toBe(1);
        });

        then('stdout shows timeout message', () => {
          const result = runInTempGitRepo({
            packageJson: {
              name: 'test-repo',
              scripts: {
                'test:lint': 'sleep 5',
              },
            },
            gitRepoTestArgs: ['--what', 'lint', '--timeout', '1'],
          });

          expect(result.stdout).toContain('timeout');
          expect(result.stdout).toContain('1s');
        });

        then('output matches snapshot', () => {
          const result = runInTempGitRepo({
            packageJson: {
              name: 'test-repo',
              scripts: {
                'test:lint': 'sleep 5',
              },
            },
            gitRepoTestArgs: ['--what', 'lint', '--timeout', '1'],
          });

          expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        });
      },
    );

    when(
      '[t1] `rhx git.repo.test --what lint --timeout 10` with fast command',
      () => {
        then('completes normally when under timeout', () => {
          const result = runInTempGitRepo({
            packageJson: {
              name: 'test-repo',
              scripts: {
                'test:lint': 'echo "fast lint"',
              },
            },
            gitRepoTestArgs: ['--what', 'lint', '--timeout', '10'],
          });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).not.toContain('timeout');
        });
      },
    );
  });

  given('[case23] --scope filtering with jest configs', () => {
    when('[t0] `rhx git.repo.test --what unit --scope cpsafe` is run', () => {
      // fixture: unit test file named cpsafe that matches scope
      const result = useThen('command executes', () =>
        runInTempGitRepo({
          eslintConfig: null,
          jestConfigs: ['unit'],
          testUnitScript: 'jest --config jest.unit.config.ts',
          testFiles: [{ type: 'unit', name: 'cpsafe' }],
          symlinkNodeModules: true,
          gitRepoTestArgs: ['--what', 'unit', '--scope', 'cpsafe'],
        }),
      );

      then('stdout shows scope and matched files for unit tests', () => {
        expect(result.stdout).toContain('scope: cpsafe');
        expect(result.stdout).toContain('matched: 1 files');
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] `rhx git.repo.test --what unit --scope other` is run', () => {
      // fixture: multiple unit test files, scope matches one
      const result = useThen('command executes', () =>
        runInTempGitRepo({
          eslintConfig: null,
          jestConfigs: ['unit'],
          testUnitScript: 'jest --config jest.unit.config.ts',
          testFiles: [
            { type: 'unit', name: 'foo' },
            { type: 'unit', name: 'bar' },
            { type: 'unit', name: 'other' },
          ],
          symlinkNodeModules: true,
          gitRepoTestArgs: ['--what', 'unit', '--scope', 'other'],
        }),
      );

      then('stdout shows scope matches only one file', () => {
        expect(result.stdout).toContain('scope: other');
        expect(result.stdout).toContain('matched: 1 files');
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] `rhx git.repo.test --what unit --scope xyz` is run', () => {
      // fixture: unit tests exist but none match scope
      const result = useThen('command executes', () =>
        runInTempGitRepo({
          eslintConfig: null,
          jestConfigs: ['unit'],
          testUnitScript: 'jest --config jest.unit.config.ts',
          testFiles: [
            { type: 'unit', name: 'foo' },
            { type: 'unit', name: 'bar' },
          ],
          symlinkNodeModules: true,
          gitRepoTestArgs: ['--what', 'unit', '--scope', 'nonexistent-xyz'],
        }),
      );

      then('stdout shows scope matched 0 files', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('scope: nonexistent-xyz');
        expect(result.stdout).toContain('matched: 0 files');
      });

      then('stdout matches snapshot', () => {
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when(
      '[t3] unit config only matches unit test files, not integration files',
      () => {
        // fixture: both unit and integration files exist, but unit config only sees *.test.ts
        const result = useThen('command executes', () =>
          runInTempGitRepo({
            eslintConfig: null,
            jestConfigs: ['unit'],
            testUnitScript: 'jest --config jest.unit.config.ts',
            testFiles: [
              { type: 'unit', name: 'myfeature' }, // myfeature.test.ts
              { type: 'integration', name: 'myfeature' }, // myfeature.integration.test.ts
              { type: 'integration', name: 'myfeature.extra' }, // myfeature.extra.integration.test.ts
            ],
            symlinkNodeModules: true,
            gitRepoTestArgs: ['--what', 'unit', '--scope', 'myfeature'],
          }),
        );

        then('unit config only matches unit test file', () => {
          expect(result.stdout).toContain('scope: myfeature');
          // should find only 1 file (myfeature.test.ts), not the integration files
          expect(result.stdout).toContain('matched: 1 files');
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
