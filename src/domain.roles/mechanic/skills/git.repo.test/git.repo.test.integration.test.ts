import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = integration tests for git.repo.test.sh skill
 * .why = verify lint enforcement works correctly with proper exit codes and output
 */
describe('git.repo.test.sh', () => {
  const scriptPath = path.join(__dirname, 'git.repo.test.sh');

  /**
   * .what = run git.repo.test.sh in a temp git repo
   * .why = isolates tests from real repo state
   */
  const runInTempGitRepo = (args: {
    packageJson?: object | null;
    eslintConfig?: object | null;
    sourceFiles?: Record<string, string>;
    testLintScript?: string;
    gitRepoTestArgs: string[];
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'git-repo-test', git: true });

    // create package.json
    if (args.packageJson !== null) {
      const pkgJson = args.packageJson ?? {
        name: 'test-repo',
        scripts: {
          'test:lint': args.testLintScript ?? 'eslint src/',
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
   * .why = temp dir paths and timestamps change between runs
   */
  const sanitizeOutput = (stdout: string): string =>
    stdout
      .replace(/\/tmp\/[^\s]+/g, '/tmp/TEMP_DIR')
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z/g, 'ISOTIME');

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

      then('stdout shows turtle success summary', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/valid.js': 'const x = 1;\nconsole.log(x);\n',
          },
          testLintScript: 'echo "lint passed"',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(result.stdout).toContain('cowabunga');
        expect(result.stdout).toContain('git.repo.test --what lint');
      });

      then('stdout shows status: passed', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/valid.js': 'const x = 1;\nconsole.log(x);\n',
          },
          testLintScript: 'echo "lint passed"',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(result.stdout).toContain('status: passed');
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
          '.log/role=mechanic/skill=git.repo.test',
        );
        if (fs.existsSync(logDir)) {
          const logFiles = fs
            .readdirSync(logDir)
            .filter((f) => f.endsWith('.stdout.log'));
          expect(logFiles.length).toBe(0);
        }
      });

      then('stderr is empty', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/valid.js': 'const x = 1;\nconsole.log(x);\n',
          },
          testLintScript: 'echo "lint passed"',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(result.stderr).toBe('');
      });

      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/valid.js': 'const x = 1;\nconsole.log(x);\n',
          },
          testLintScript: 'echo "lint passed"',
          gitRepoTestArgs: ['--what', 'lint'],
        });

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

        expect(result.stderr).toContain('status: failed');
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

      then('stdout is empty', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/broken.js': 'const unused = 1;\n',
          },
          testLintScript: 'echo "3 errors, 4 warnings" && exit 1',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(result.stdout).toBe('');
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

      then('stdout explains absent package.json', () => {
        const result = runInTempGitRepo({
          packageJson: null,
          eslintConfig: null,
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(result.stdout).toContain('no package.json');
      });

      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          packageJson: null,
          eslintConfig: null,
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
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
          '.log/role=mechanic/skill=git.repo.test',
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
          '.log/role=mechanic/skill=git.repo.test/.gitignore',
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
          '.log/role=mechanic/skill=git.repo.test/.gitignore',
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
          '.log/role=mechanic/skill=git.repo.test',
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

      then('stdout shows error about --what required', () => {
        const result = runInTempGitRepo({
          gitRepoTestArgs: [],
        });

        expect(result.stdout).toContain('--what is required');
      });

      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          gitRepoTestArgs: [],
        });

        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] --what has unsupported value', () => {
      then('exit code is 2', () => {
        const result = runInTempGitRepo({
          gitRepoTestArgs: ['--what', 'types'],
        });

        expect(result.exitCode).toBe(2);
      });

      then('stdout shows error about only lint supported', () => {
        const result = runInTempGitRepo({
          gitRepoTestArgs: ['--what', 'types'],
        });

        expect(result.stdout).toContain("only 'lint' is supported");
      });

      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          gitRepoTestArgs: ['--what', 'types'],
        });

        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
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
        expect(result.stdout).toContain('not in a git repository');
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

        expect(sanitizeOutput(result.stdout ?? '')).toMatchSnapshot();
      });
    });
  });

  given('[case9] warnings only (no errors)', () => {
    when('[t0] lint outputs only warnings, no errors', () => {
      then('exit code is 0 (treat as pass)', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/file.js': 'const x = 1;\n',
          },
          testLintScript: 'echo "4 warnings" && exit 1',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(result.exitCode).toBe(0);
      });

      then('stdout shows success summary', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/file.js': 'const x = 1;\n',
          },
          testLintScript: 'echo "4 warnings" && exit 1',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(result.stdout).toContain('cowabunga');
        expect(result.stdout).toContain('status: passed');
      });

      then('no log file is created', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/file.js': 'const x = 1;\n',
          },
          testLintScript: 'echo "4 warnings" && exit 1',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        const logDir = path.join(
          result.tempDir,
          '.log/role=mechanic/skill=git.repo.test',
        );
        if (fs.existsSync(logDir)) {
          const logFiles = fs
            .readdirSync(logDir)
            .filter((f) => f.endsWith('.stdout.log'));
          expect(logFiles.length).toBe(0);
        }
      });

      then('output matches snapshot', () => {
        const result = runInTempGitRepo({
          sourceFiles: {
            'src/file.js': 'const x = 1;\n',
          },
          testLintScript: 'echo "4 warnings" && exit 1',
          gitRepoTestArgs: ['--what', 'lint'],
        });

        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });
});
