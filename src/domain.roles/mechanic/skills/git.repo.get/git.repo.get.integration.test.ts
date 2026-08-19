import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

/**
 * .what = integration tests for git.repo.get skill
 * .why = verify repos, files, and lines subcommands work correctly
 */
describe('git.repo.get.sh', () => {
  const scriptPath = path.join(__dirname, 'git.repo.get.sh');

  /**
   * .what = create a temp directory with fake git repos
   * .why = portable tests that don't depend on user's actual repos
   */
  const genTempDir = (): {
    tempDir: string;
    homeDir: string;
    gitRoot: string;
    cleanup: () => void;
  } => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'git-repo-get-test-'),
    );
    const homeDir = path.join(tempDir, 'home');
    const gitRoot = path.join(homeDir, 'git');

    // create fake repos with different name lengths for alignment testing
    const repos = [
      'testorg/short',
      'testorg/medium-name',
      'testorg/very-long-repo-name',
      'testorg/a',
      'otherorg/another-repo',
    ];

    for (const repo of repos) {
      const repoPath = path.join(gitRoot, repo);
      fs.mkdirSync(path.join(repoPath, '.git'), { recursive: true });

      // create some files
      fs.writeFileSync(path.join(repoPath, 'README.md'), '# Test Repo\n');
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ name: repo.split('/')[1] }, null, 2),
      );

      // create src directory with test files
      fs.mkdirSync(path.join(repoPath, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'src', 'index.ts'),
        'export const hello = "world";\n',
      );
      fs.writeFileSync(
        path.join(repoPath, 'src', 'utils.ts'),
        'export const add = (a: number, b: number) => a + b;\n',
      );

      // init as git repo with origin/main
      //
      // .note = no `config --global safe.directory` is set. git's
      //         dubious-ownership check only fires when the repo is owned by
      //         a different user than the caller, and this fixture is created
      //         by the test process itself — so it never fires. to set it
      //         anyway reached the HUMAN'S ~/.gitconfig, which both mutated
      //         their machine and made two suites contend for one config lock
      //         when jest ran them in parallel (rule.require.hermetic-tests).
      runGit(['init'], repoPath);
      configureTestGitUser({ cwd: repoPath });
      runGit(['add', '.'], repoPath);
      runGit(['commit', '-m', 'initial'], repoPath);
      runGit(['checkout', '-B', 'main'], repoPath);
      runGit(
        ['remote', 'add', 'origin', `https://github.com/${repo}.git`],
        repoPath,
      );
      // create origin/main ref
      spawnSync('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD'], {
        cwd: repoPath,
      });
    }

    return {
      tempDir,
      homeDir,
      gitRoot,
      cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }),
    };
  };

  /**
   * .what = run a git command in the fixture, and fail loud if it did not work
   * .why = a fixture that half-built produces a downstream assertion failure
   *        that misreads as a skill defect. surface the real cause here
   *        instead (rule.require.failfast).
   */
  const runGit = (args: string[], cwd: string): void => {
    const result = spawnSync('git', args, { cwd, encoding: 'utf-8' });
    if (result.status !== 0)
      throw new Error(
        `test fixture could not run \`git ${args.join(' ')}\` in ${cwd}` +
          ` (exit ${result.status}): ${result.stderr ?? ''}`,
      );
  };

  /**
   * .what = add a worktree to a fixture repo, with an uncommitted edit
   * .why = proves --tree reads INFLIGHT state (uncommitted edits included),
   *        which is the whole point of the flag. the worktree is placed at
   *        an off-convention path on purpose, to prove lookup goes through
   *        `git worktree list` rather than a path pattern.
   */
  const genWorktree = (input: {
    gitRoot: string;
    repo: string;
    branch: string;
    worktreeDirName: string;
  }): { worktreePath: string } => {
    const repoPath = path.join(input.gitRoot, input.repo);
    const worktreePath = path.join(
      input.gitRoot,
      input.repo.split('/')[0]!,
      '_worktrees',
      input.worktreeDirName,
    );

    runGit(['worktree', 'add', '-b', input.branch, worktreePath], repoPath);

    // uncommitted edit — visible ONLY via the live worktree, never via any ref
    fs.writeFileSync(
      path.join(worktreePath, 'src', 'index.ts'),
      'export const hello = "world";\nexport const inflightOnly = "wip";\n',
    );

    return { worktreePath };
  };

  /**
   * .what = a dir that holds a `git` stub which fails on ONE subcommand
   * .why = the rethrows in this skill exist so a broken git operation cannot
   *        render as an honest "crickets... found: 0". that branch is
   *        unreachable with a healthy git, so the only way to give those
   *        clamps teeth is to break git for one call (howto.mock-cli-via-path).
   *
   * .note = the stub delegates every other invocation to the REAL git, found
   *         once up front. a bare `exec git` would find the stub again and
   *         spin forever.
   */
  const genGitStub = (input: {
    tempDir: string;
    failOn: string;
  }): { pathPrefix: string } => {
    const found = spawnSync('which', ['git'], { encoding: 'utf-8' });
    if (found.status !== 0)
      throw new Error('test fixture could not locate the real git on PATH');
    const gitReal = (found.stdout ?? '').trim();

    const pathPrefix = path.join(input.tempDir, `stub-${input.failOn}`);
    fs.mkdirSync(pathPrefix, { recursive: true });

    const stub = [
      '#!/usr/bin/env bash',
      'for arg in "$@"; do',
      `  if [[ "$arg" == "${input.failOn}" ]]; then`,
      `    echo "stub: simulated git ${input.failOn} failure" >&2`,
      '    exit 3',
      '  fi',
      'done',
      `exec ${gitReal} "$@"`,
      '',
    ].join('\n');

    const stubPath = path.join(pathPrefix, 'git');
    fs.writeFileSync(stubPath, stub);
    fs.chmodSync(stubPath, 0o755);

    return { pathPrefix };
  };

  /**
   * .what = helper to run git.repo.get.sh with custom HOME
   * .why = standardize invocation and result capture
   *
   * .note = --refresh off is added by default because test repos use fake
   *         remote URLs. tests that explicitly want to test refresh behavior
   *         can pass options.refresh = 'on'.
   */
  const runSkill = (
    args: string,
    env: { HOME: string; PATH?: string },
    options?: { refresh?: 'on' | 'off' },
  ): { stdout: string; stderr: string; exitCode: number } => {
    const refreshFlag = options?.refresh === 'on' ? '' : '--refresh off';
    const fullArgs = `${args} ${refreshFlag}`.trim();

    const result = spawnSync(
      'bash',
      [scriptPath, ...fullArgs.split(' ').filter(Boolean)],
      {
        cwd: process.cwd(),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000,
        env: {
          ...process.env,
          HOME: env.HOME,
          ...(env.PATH ? { PATH: env.PATH } : {}),
        },
      },
    );

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  /**
   * .what = swap the per-run temp git root for a stable token
   * .why = several --tree errors print absolute paths (the worktree list, the
   *        `git -C <path> worktree list` hint, the clone target), and that root
   *        differs on every run. those renders were held by `toContain` alone
   *        on the grounds that a snapshot could not survive the churn — true of
   *        a RAW snapshot, but the hook test one file over had already solved
   *        it with this exact swap. so the renders stayed unreviewable for a
   *        reason a seam next door disproved (rule.require.snapshots).
   *
   * .note = both the temp root and its physical target are swapped, since the
   *         skill canonicalizes some paths and prints others as handed to it.
   */
  const redactTempRoot = (text: string, homeDir: string): string => {
    const gitRoot = path.join(homeDir, 'git');
    return text
      .split(fs.realpathSync(gitRoot))
      .join('<gitroot>')
      .split(gitRoot)
      .join('<gitroot>');
  };

  // repos subcommand tests
  given('[case1] repos with local clones', () => {
    when('[t0] --repos testorg/*', () => {
      then('lists repos with aligned names and matches snapshot', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill('repos --repos testorg/*', { HOME: homeDir });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('(local)');
          expect(result.stdout).toContain('far out');
          expect(result.stdout).toContain('~/git/');
          expect(result.stdout).toMatch(/found: \d+ repos/);
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case2] repos with no matches', () => {
    when('[t0] --repos nonexistent-org/*', () => {
      then('shows crickets header and matches snapshot', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill('repos --repos nonexistent-org-xyz-12345/*', {
            HOME: homeDir,
          });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('crickets');
          expect(result.stdout).toContain('found: 0 repos');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case3] repos with repo name glob', () => {
    when('[t0] --repos *-repo*', () => {
      then('matches repos by name pattern and matches snapshot', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill('repos --repos *-repo*', { HOME: homeDir });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('another-repo');
          expect(result.stdout).toContain('very-long-repo-name');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case4] repos across orgs', () => {
    when('[t0] --repos */*', () => {
      then('shows all repos from all orgs with alignment', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill('repos --repos */*', { HOME: homeDir });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('testorg');
          expect(result.stdout).toContain('otherorg');
          // verify alignment: all paths should start at same column
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  // files subcommand tests
  given('[case5] files in local repo', () => {
    when('[t0] --in testorg/short', () => {
      then('lists files with turtle header and matches snapshot', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill('files --in testorg/short', {
            HOME: homeDir,
          });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('far out');
          expect(result.stdout).toContain('(local)');
          expect(result.stdout).toMatch(/found: \d+ files/);
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case6] files with path filter', () => {
    when('[t0] --paths *.ts', () => {
      then('shows only ts files and matches snapshot', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill('files --in testorg/short --paths src/*.ts', {
            HOME: homeDir,
          });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('.ts');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case7] files in unknown repo', () => {
    when('[t0] --in unknown/repo', () => {
      then('shows bummer dude error and matches snapshot', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill(
            'files --in unknown-org-xyz/unknown-repo-abc',
            {
              HOME: homeDir,
            },
          );

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('bummer dude');
          expect(result.stdout).toContain('repo not found');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  // lines subcommand tests - search mode
  given('[case8] lines search in local repo', () => {
    when('[t0] --words pattern', () => {
      then('shows matches with context and matches snapshot', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill('lines --in testorg/short --words hello', {
            HOME: homeDir,
          });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('far out');
          expect(result.stdout).toContain('>'); // match marker
          expect(result.stdout).toContain('radius: 21');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case9] lines search with custom radius', () => {
    when('[t0] --radius 3', () => {
      then('shows 3 lines radius and matches snapshot', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill(
            'lines --in testorg/short --words hello --radius 3',
            { HOME: homeDir },
          );

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('radius: 3');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case10] lines search with no matches', () => {
    when('[t0] --words nonexistent pattern', () => {
      then('shows crickets header and matches snapshot', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill(
            'lines --in testorg/short --words NonExistentPatternXyz12345',
            { HOME: homeDir },
          );

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('crickets');
          expect(result.stdout).toContain('found: 0 matches');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  // lines subcommand tests - read mode
  given('[case11] lines read file', () => {
    when('[t0] --paths src/index.ts (no --words)', () => {
      then('shows full file content and matches snapshot', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill(
            'lines --in testorg/short --paths src/index.ts',
            {
              HOME: homeDir,
            },
          );

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('far out');
          expect(result.stdout).toMatch(/\d+ lines/);
          expect(result.stdout).toContain('1:');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case12] lines read nonexistent file', () => {
    when('[t0] --paths nonexistent.ts', () => {
      then('shows crickets header and matches snapshot', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill(
            'lines --in testorg/short --paths nonexistent-file-xyz.ts',
            { HOME: homeDir },
          );

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('crickets');
          expect(result.stdout).toContain('found: 0 files');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  // multi-repo files
  given('[case13] files across repos', () => {
    when('[t0] --repos with --words', () => {
      then('searches files with content across repos', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill('files --repos testorg/* --words hello', {
            HOME: homeDir,
          });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('far out');
          expect(result.stdout).toContain('repos: testorg/*');
          expect(result.stdout).toContain('words: hello');
          expect(result.stdout).toContain('files in');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] --words only (defaults to */*)', () => {
      then('searches all repos for content', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill('files --words hello', { HOME: homeDir });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('far out');
          expect(result.stdout).toContain('repos: */*');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  // multi-repo lines
  given('[case14] lines across repos', () => {
    when('[t0] --repos with --words', () => {
      then('searches lines across repos', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill('lines --repos testorg/* --words hello', {
            HOME: homeDir,
          });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('far out');
          expect(result.stdout).toContain('repos: testorg/*');
          expect(result.stdout).toContain('words: hello');
          expect(result.stdout).toContain('matches in');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] --words only (defaults to */*)', () => {
      then('searches all repos for pattern', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill('lines --words hello', { HOME: homeDir });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('far out');
          expect(result.stdout).toContain('repos: */*');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });

    when('[t2] no matches in multi-repo', () => {
      then('shows crickets', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill(
            'lines --repos testorg/* --words NonExistentXyz123',
            { HOME: homeDir },
          );

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('crickets');
          expect(result.stdout).toContain('found: 0 matches');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  // default behavior
  given('[case15] repos without --repos flag', () => {
    when('[t0] no --repos specified', () => {
      then('defaults to */* and lists all repos', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill('repos', { HOME: homeDir });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('far out');
          expect(result.stdout).toContain('repos: */*');
          expect(result.stdout).toContain('found: 5 repos');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  // error cases
  given('[case16] absent required flags', () => {
    when('[t0] files without --in', () => {
      then('exits with error and matches snapshot', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill('files', { HOME: homeDir });

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('--in flag is required');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] lines without --in or --repos', () => {
      then('exits with error and matches snapshot', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill('lines', { HOME: homeDir });

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('--in or --repos flag is required');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });

    when('[t2] lines without --paths or --words', () => {
      then('exits with error and matches snapshot', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill('lines --in testorg/short', {
            HOME: homeDir,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('--paths is required for read mode');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  // regex patterns with pipe
  given('[case17] regex patterns with pipe', () => {
    when('[t0] --words with alternation pattern', () => {
      then('matches either pattern', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          // hello is in index.ts, add is in utils.ts
          const result = runSkill('files --repos testorg/* --words hello|add', {
            HOME: homeDir,
          });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('far out');
          expect(result.stdout).toContain('words: hello|add');
          // should find both index.ts (has hello) and utils.ts (has add)
          expect(result.stdout).toContain('index.ts');
          expect(result.stdout).toContain('utils.ts');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] lines search with alternation pattern', () => {
      then('shows matches for either pattern', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill(
            'lines --in testorg/short --words hello|add',
            { HOME: homeDir },
          );

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('far out');
          expect(result.stdout).toContain('words: hello|add');
          expect(result.stdout).toContain('2 matches');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case18] rhachet passthrough args', () => {
    when('[t0] --repo --role --skill args are passed', () => {
      then('they are ignored and skill works', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill(
            '--repo testorg --role mechanic --skill git.repo.get repos --repos short',
            { HOME: homeDir },
          );

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('short');
        } finally {
          cleanup();
        }
      });
    });
  });

  // --ref flag tests
  given('[case19] lines with custom --ref', () => {
    when('[t0] --ref HEAD is specified', () => {
      then('searches at HEAD ref', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill(
            'lines --in testorg/short --words hello --ref HEAD',
            { HOME: homeDir },
          );

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('far out');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  // --help flag
  given('[case20] --help flag', () => {
    when('[t0] --help is passed', () => {
      then('shows usage and exits 0', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill('--help', { HOME: homeDir });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('usage:');
          expect(result.stdout).toContain('subcommands:');
          expect(result.stdout).toContain('options:');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] -h is passed', () => {
      then('shows usage and exits 0', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill('-h', { HOME: homeDir });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('usage:');
        } finally {
          cleanup();
        }
      });
    });
  });

  // unknown argument error
  given('[case21] unknown argument', () => {
    when('[t0] --unknown-flag is passed', () => {
      then('exits with error 2 and shows message', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill('repos --unknown-flag value', {
            HOME: homeDir,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('unknown argument');
          expect(result.stdout).toContain('--unknown-flag');
        } finally {
          cleanup();
        }
      });
    });
  });

  // unknown subcommand error
  given('[case22] unknown subcommand', () => {
    when('[t0] invalid subcommand is passed', () => {
      then('exits with error 2 and shows message', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill('invalidcmd', { HOME: homeDir });

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('unknown argument');
          expect(result.stdout).toContain('invalidcmd');
        } finally {
          cleanup();
        }
      });
    });
  });

  // no subcommand error
  given('[case23] no subcommand', () => {
    when('[t0] only flags are passed without subcommand', () => {
      then('exits with error 2', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill('--repos testorg/*', { HOME: homeDir });

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('no subcommand specified');
        } finally {
          cleanup();
        }
      });
    });
  });

  // --tree flag: peek at inflight worktree state
  given('[case25] lines read with --tree (inflight state)', () => {
    when('[t0] --tree names a worktree with an uncommitted edit', () => {
      then('shows the UNCOMMITTED content and labels it inflight', () => {
        const { homeDir, gitRoot, cleanup } = genTempDir();
        try {
          genWorktree({
            gitRoot,
            repo: 'testorg/short',
            branch: 'feat/inflight',
            worktreeDirName: 'short.vlad.feat-inflight',
          });

          const result = runSkill(
            'lines --in testorg/short --tree feat/inflight --paths src/index.ts',
            { HOME: homeDir },
          );

          expect(result.exitCode).toBe(0);
          // the uncommitted edit is visible — this is the whole point
          expect(result.stdout).toContain('inflightOnly');
          // and it is unmistakably labeled as inflight, never as latest
          expect(result.stdout).toContain('tree: feat/inflight (inflight)');
          expect(result.stdout).not.toContain('ref: origin/main');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] no --tree on the same file', () => {
      then('shows the committed content only, labeled with the ref', () => {
        const { homeDir, gitRoot, cleanup } = genTempDir();
        try {
          genWorktree({
            gitRoot,
            repo: 'testorg/short',
            branch: 'feat/inflight',
            worktreeDirName: 'short.vlad.feat-inflight',
          });

          const result = runSkill(
            'lines --in testorg/short --paths src/index.ts',
            { HOME: homeDir },
          );

          expect(result.exitCode).toBe(0);
          // the uncommitted edit must NOT leak into the latest view
          expect(result.stdout).not.toContain('inflightOnly');
          expect(result.stdout).toContain('ref: origin/main');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case26] lines search with --tree', () => {
    when('[t0] --words matches text only in the uncommitted edit', () => {
      then('finds it in the worktree', () => {
        const { homeDir, gitRoot, cleanup } = genTempDir();
        try {
          genWorktree({
            gitRoot,
            repo: 'testorg/short',
            branch: 'feat/inflight',
            worktreeDirName: 'short.vlad.feat-inflight',
          });

          const result = runSkill(
            'lines --in testorg/short --tree feat/inflight --words inflightOnly',
            { HOME: homeDir },
          );

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('inflightOnly');
          expect(result.stdout).toContain('tree: feat/inflight (inflight)');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case27] files with --tree', () => {
    when('[t0] --tree is specified', () => {
      then('lists the worktree files and labels inflight', () => {
        const { homeDir, gitRoot, cleanup } = genTempDir();
        try {
          genWorktree({
            gitRoot,
            repo: 'testorg/short',
            branch: 'feat/inflight',
            worktreeDirName: 'short.vlad.feat-inflight',
          });

          const result = runSkill(
            'files --in testorg/short --tree feat/inflight',
            { HOME: homeDir },
          );

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('src/index.ts');
          expect(result.stdout).toContain('tree: feat/inflight (inflight)');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });

    when(
      '[t1] --tree names the worktree DIRECTORY instead of the branch',
      () => {
        then('still finds it (lookup is via git worktree list)', () => {
          const { homeDir, gitRoot, cleanup } = genTempDir();
          try {
            genWorktree({
              gitRoot,
              repo: 'testorg/short',
              branch: 'feat/inflight',
              worktreeDirName: 'short.vlad.feat-inflight',
            });

            const result = runSkill(
              'files --in testorg/short --tree short.vlad.feat-inflight',
              { HOME: homeDir },
            );

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('src/index.ts');
          } finally {
            cleanup();
          }
        });
      },
    );
  });

  given('[case31] a BRAND-NEW file in the worktree (untracked)', () => {
    when('[t0] the file is not in the index at all', () => {
      then('--tree still lists it and searches it, but skips ignored', () => {
        const { homeDir, gitRoot, cleanup } = genTempDir();
        try {
          const { worktreePath } = genWorktree({
            gitRoot,
            repo: 'testorg/short',
            branch: 'feat/inflight',
            worktreeDirName: 'short.vlad.feat-inflight',
          });

          // a file that exists ONLY on disk — the most inflight state there is
          fs.writeFileSync(
            path.join(worktreePath, 'src', 'brandNew.ts'),
            'export const brandNewSymbol = "fresh";\n',
          );

          // and one the repo has asked git to ignore
          fs.writeFileSync(
            path.join(worktreePath, '.gitignore'),
            'scratch.local\n',
          );
          fs.writeFileSync(
            path.join(worktreePath, 'scratch.local'),
            'export const brandNewSymbol = "scratch";\n',
          );

          const listed = runSkill(
            'files --in testorg/short --tree feat/inflight',
            { HOME: homeDir },
          );
          expect(listed.exitCode).toBe(0);
          expect(listed.stdout).toContain('src/brandNew.ts');
          expect(listed.stdout).not.toContain('scratch.local');
          expect(listed.stdout).toMatchSnapshot();

          const searched = runSkill(
            'lines --in testorg/short --tree feat/inflight --words brandNewSymbol',
            { HOME: homeDir },
          );
          expect(searched.exitCode).toBe(0);
          expect(searched.stdout).toContain('src/brandNew.ts');
          expect(searched.stdout).not.toContain('scratch.local');
          expect(searched.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] the same repo is read WITHOUT --tree', () => {
      then('the brand-new file is absent — it lives in no ref', () => {
        const { homeDir, gitRoot, cleanup } = genTempDir();
        try {
          const { worktreePath } = genWorktree({
            gitRoot,
            repo: 'testorg/short',
            branch: 'feat/inflight',
            worktreeDirName: 'short.vlad.feat-inflight',
          });
          fs.writeFileSync(
            path.join(worktreePath, 'src', 'brandNew.ts'),
            'export const brandNewSymbol = "fresh";\n',
          );

          const result = runSkill('files --in testorg/short', {
            HOME: homeDir,
          });

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('ref: origin/main');
          expect(result.stdout).not.toContain('brandNew.ts');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });

    when('[t2] the gitignored file is asked for by --paths directly', () => {
      then('read mode refuses it too — one flag, one sense', () => {
        const { homeDir, gitRoot, cleanup } = genTempDir();
        try {
          const { worktreePath } = genWorktree({
            gitRoot,
            repo: 'testorg/short',
            branch: 'feat/inflight',
            worktreeDirName: 'short.vlad.feat-inflight',
          });

          fs.writeFileSync(
            path.join(worktreePath, '.gitignore'),
            'scratch.local\n',
          );
          fs.writeFileSync(
            path.join(worktreePath, 'scratch.local'),
            'API_TOKEN=SCRATCHSECRET\n',
          );

          // the file list and the search both hide this file (t0). read
          // mode must agree, or it becomes the way around both of them
          const result = runSkill(
            'lines --in testorg/short --tree feat/inflight --paths scratch.local',
            { HOME: homeDir },
          );

          expect(result.stdout).not.toContain('SCRATCHSECRET');
          expect(result.stderr).not.toContain('SCRATCHSECRET');
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('gitignored');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });

    // .why = the positive twin of t2, and the one untracked path with no clamp.
    //        t0 proves the file LIST and the SEARCH reach an untracked file; t2
    //        proves read mode refuses a gitignored one. between them sat the
    //        case nobody pinned: read mode that serves an untracked-but-not-
    //        ignored file's CONTENT. that is the whole reason a caller reaches
    //        for --tree — to read work that lives in no ref yet — so a
    //        regression that made read mode index-only would defeat the flag
    //        while t0 and t2 both stayed green.
    // .why = the guard read mode applies is `check-ignore`, NOT an index
    //        lookup, and this pins that distinction. were it ever tightened to
    //        "must be tracked", the untracked read would break and only this
    //        clamp would notice.
    when('[t3] the untracked file is read by --paths directly', () => {
      then('read mode serves it — untracked is inflight, not absent', () => {
        const { homeDir, gitRoot, cleanup } = genTempDir();
        try {
          const { worktreePath } = genWorktree({
            gitRoot,
            repo: 'testorg/short',
            branch: 'feat/inflight',
            worktreeDirName: 'short.vlad.feat-inflight',
          });

          fs.writeFileSync(
            path.join(worktreePath, 'src', 'brandNew.ts'),
            'export const brandNewSymbol = "fresh";\n',
          );

          const result = runSkill(
            'lines --in testorg/short --tree feat/inflight --paths src/brandNew.ts',
            { HOME: homeDir },
          );

          expect(result.exitCode).toBe(0);
          // the content of a file that lives in no ref at all
          expect(result.stdout).toContain('brandNewSymbol');
          // and it must be labeled inflight, never mistaken for latest
          expect(result.stdout).toContain('tree: feat/inflight (inflight)');
          expect(result.stdout).not.toContain('ref: origin/main');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case28] --tree that matched no worktree', () => {
    when('[t0] an unknown tree name is given', () => {
      then('fails loud and names the fix', () => {
        const { homeDir, gitRoot, cleanup } = genTempDir();
        try {
          genWorktree({
            gitRoot,
            repo: 'testorg/short',
            branch: 'feat/inflight',
            worktreeDirName: 'short.vlad.feat-inflight',
          });

          const result = runSkill(
            'files --in testorg/short --tree no-such-tree-xyz',
            { HOME: homeDir },
          );

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('bummer dude');
          expect(result.stdout).toContain(
            'no worktree named "no-such-tree-xyz"',
          );
          // names the fix: shows what IS available
          expect(result.stdout).toContain('worktrees found:');
          expect(result.stdout).toContain('feat/inflight');
          expect(result.stdout).toContain('worktree list');
          // the worktree list and the `git -C <path>` hint both carry the temp
          // root, so the render is redacted rather than left unreviewable
          expect(redactTempRoot(result.stdout, homeDir)).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case30] --tree on a repo with no local clone', () => {
    when('[t0] the repo resolves cloud-only', () => {
      then('fails loud — worktrees only exist locally', () => {
        const { tempDir, homeDir, cleanup } = genTempDir();
        try {
          // stub `gh` so the repo resolves as cloud without a network call
          const shimDir = path.join(tempDir, 'shim-bin');
          fs.mkdirSync(shimDir, { recursive: true });
          fs.writeFileSync(
            path.join(shimDir, 'gh'),
            "#!/usr/bin/env bash\necho 'https://github.com/cloudorg/cloud-repo'\n",
            { mode: 0o755 },
          );

          const result = runSkill(
            'files --in cloudorg/cloud-repo --tree feat/whatever',
            { HOME: homeDir, PATH: `${shimDir}:${process.env.PATH}` },
          );

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('bummer dude');
          expect(result.stdout).toContain('--tree requires a local clone');
          // .why = the tree the caller named must be echoed, as it is in every
          //        neighbor --tree failure. this was the one render that had
          //        dropped it, so the field is clamped rather than left to the
          //        snapshot alone — a resnap would swallow its removal.
          expect(result.stdout).toContain('tree: feat/whatever');
          // names the fix: how to get a local clone
          expect(result.stdout).toContain('gh repo clone cloudorg/cloud-repo');
          // the clone target names the temp git root, so redact and snapshot
          expect(redactTempRoot(result.stdout, homeDir)).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case32] --tree combined with --ref', () => {
    when('[t0] both source selectors are passed', () => {
      then('fails loud rather than silently pick one', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill(
            'lines --in testorg/short --paths src/index.ts --ref origin/main --tree feat/inflight',
            { HOME: homeDir },
          );

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            '--tree cannot be combined with --ref',
          );
          // names both alternatives, so the caller can pick deliberately
          expect(result.stdout).toContain('# committed');
          expect(result.stdout).toContain('# inflight');
          // snapshot: this error is user-faced output, and holds no
          // temp paths, so a reviewer can eyeball it in the diff
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case29] --tree combined with --repos', () => {
    when('[t0] both flags are passed', () => {
      then('fails loud, since a worktree belongs to one repo', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill(
            'lines --repos testorg/* --words hello --tree feat/inflight',
            { HOME: homeDir },
          );

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            '--tree cannot be combined with --repos',
          );
          expect(result.stdout).toContain('--in <org>/<repo>');
          // snapshot: user-faced error output, and free of temp paths
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  // .why = --tree with no --in is the fourth conflict, and the one that hid
  //        behind the other three. --in absent + --words present trips an
  //        extant default-fill (REPOS_GLOB="*/*") in both cmd_lines and
  //        cmd_files, which routes into the multi-repo path — and neither
  //        multi path reads TREE_NAME at all. so the caller's inflight request
  //        was dropped with no error, no warn, no label: an ordinary
  //        origin/main search rendered as though it were what was asked for.
  //
  // .why = that is the exact hazard the whole wish exists to close (a caller
  //        reasons about a source they did not select), arrived at from the
  //        inside. both call sites are pinned, since each carries its own copy
  //        of the default-fill and could regress independently.
  given('[case37] --tree with no --in to name its repo', () => {
    when('[t0] lines --tree --words, with no --in', () => {
      then('fails loud rather than silently drop the tree', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill('lines --words hello --tree feat/inflight', {
            HOME: homeDir,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('--tree requires --in');
          expect(result.stdout).toContain('--in <org>/<repo>');
          // the tree must never be silently honored as a plain multi search
          expect(result.stdout).not.toContain('found:');
          // snapshot: user-faced error output, and free of temp paths
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] files --tree --words, with no --in', () => {
      then('fails loud too, since cmd_files has its own default-fill', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill('files --words hello --tree feat/inflight', {
            HOME: homeDir,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('--tree requires --in');
          expect(result.stdout).not.toContain('found:');
        } finally {
          cleanup();
        }
      });
    });
  });

  // .why = fail_git_in_tree has THREE call sites, and only the search one was
  //        clamped (case36). the other two rethrows were added in the same
  //        pass but never exercised, so they were indistinguishable from
  //        unfixed: a broken git would render "crickets... found: 0" and
  //        nobody would know. this repo's own rule.require.clamp-edge-cases
  //        calls a clamp with no teeth worse than absent, so both are pinned
  //        here with the same PATH-stub technique used for block_unverifiable.
  //
  // .note = snapshotted through the redactTempRoot seam, not raw. the render
  //         embeds the per-run temp worktree path, so the raw text would be red
  //         on every run; the redacted form is stable and is what gets pinned.
  //         same seam as case28/30/34.
  given('[case38] git itself fails partway through a --tree read', () => {
    when('[t0] `git ls-files` fails while the tree is listed', () => {
      then('rethrows rather than render an honest-looking empty list', () => {
        const { tempDir, homeDir, gitRoot, cleanup } = genTempDir();
        try {
          genWorktree({
            gitRoot,
            repo: 'testorg/short',
            branch: 'feat/inflight',
            worktreeDirName: 'short.vlad.feat-inflight',
          });
          const { pathPrefix } = genGitStub({ tempDir, failOn: 'ls-files' });

          const result = runSkill(
            'files --in testorg/short --tree feat/inflight',
            { HOME: homeDir, PATH: `${pathPrefix}:${process.env.PATH ?? ''}` },
          );

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('could not list the files of');
          // the whole point: a broken read must never look like an empty one
          expect(result.stdout).not.toContain('crickets');
          expect(result.stdout).not.toContain('found: 0');
          // .why = `tree:` must name what the caller asked for, as it does in
          //        every other render; the path git ran against is its own
          //        labeled fact. the snapshot is what surfaced the collision
          expect(result.stdout).toContain('tree: feat/inflight');
          expect(result.stdout).toContain('path: ');
          expect(redactTempRoot(result.stdout, homeDir)).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] `git worktree list` fails while the tree is found', () => {
      then('reports a repo fault, not a bad --tree name', () => {
        const { tempDir, homeDir, gitRoot, cleanup } = genTempDir();
        try {
          genWorktree({
            gitRoot,
            repo: 'testorg/short',
            branch: 'feat/inflight',
            worktreeDirName: 'short.vlad.feat-inflight',
          });
          const { pathPrefix } = genGitStub({ tempDir, failOn: 'worktree' });

          const result = runSkill(
            'files --in testorg/short --tree feat/inflight',
            { HOME: homeDir, PATH: `${pathPrefix}:${process.env.PATH ?? ''}` },
          );

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('could not list the worktrees of');
          // .why = the name IS valid here; only the enumeration broke. to
          //        blame the caller's --tree would send them to fix a name
          //        that was never wrong (rule.require.errors-name-the-fix)
          expect(result.stdout).not.toContain('no worktree named');
          expect(result.stdout).not.toContain('crickets');
          // .why = here the path git ran against is the REPO's, not the
          //        tree's — so the old single `tree: <path>` line was not
          //        merely ambiguous, it pointed at the wrong place
          expect(result.stdout).toContain('tree: feat/inflight');
          expect(result.stdout).toContain('path: ');
          expect(redactTempRoot(result.stdout, homeDir)).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  // .why = the branch-before-dirname priority was documented but, until i012,
  //        checked per entry — so an EARLIER worktree's dir name beat a LATER
  //        worktree's branch name. every other case builds one worktree, which
  //        cannot express the ambiguity, so the fix was correct-by-inspection
  //        only. this constructs the exact collision it was built to settle.
  given('[case39] two worktrees where one name means both things', () => {
    when('[t0] an earlier dir name equals a later branch name', () => {
      then('the branch match wins, as the priority promises', () => {
        const { homeDir, gitRoot, cleanup } = genTempDir();
        try {
          // the collided name. worktree A CARRIES it as its dir name and is
          // added first; worktree B HOLDS it as its branch and is added second
          const collision = 'feat/ambiguous'.replace('/', '-');

          // A — added first, so it is the earlier entry. its DIR name collides
          genWorktree({
            gitRoot,
            repo: 'testorg/short',
            branch: 'feat/decoy',
            worktreeDirName: collision,
          });

          // B — added second, so it is the later entry. its BRANCH collides
          const { worktreePath: pathByBranch } = genWorktree({
            gitRoot,
            repo: 'testorg/short',
            branch: collision,
            worktreeDirName: 'short.vlad.by-branch',
          });

          // mark B, so the render names which tree was actually read
          fs.writeFileSync(
            path.join(pathByBranch, 'src', 'index.ts'),
            'export const chosenByBranch = true;\n',
          );

          const result = runSkill(
            `lines --in testorg/short --tree ${collision} --paths src/index.ts`,
            { HOME: homeDir },
          );

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('chosenByBranch');
          // the earlier dir-name match must NOT have won
          expect(result.stdout).not.toContain('inflightOnly');
        } finally {
          cleanup();
        }
      });
    });
  });

  // .note = this render carries no per-run temp path — only the repo slug, the
  //         tree name, and the path the caller typed — so it is pinned raw.
  //         the cases whose render DOES embed a worktree path (case28/30/34/38)
  //         run through the redactTempRoot seam instead. every case here is
  //         pinned; which seam applies is decided per render, not per case.
  //
  // .why = worth stated plainly HERE, because this is the most sensitive
  //        test in the file: it proves the sanctioned cross-repo tool cannot
  //        be turned into a way to read any path on the host.
  // .why = the tree-mode twin of case12 (a ref read of an absent file), and the
  //        one that MUST NOT behave like it. a ref read may fairly answer empty
  //        — the path is simply not in that ref. a filesystem read knows the
  //        difference between absent and empty, so it fails loud instead
  //        (rule.forbid.failhide). the branch that draws that line had no test:
  //        a typo'd filename is the most ordinary way a human meets it.
  given('[case40] --tree --paths names a file the tree cannot serve', () => {
    when('[t0] the file is absent from the worktree', () => {
      then('fails loud — never an empty read dressed as a clean one', () => {
        const { homeDir, gitRoot, cleanup } = genTempDir();
        try {
          genWorktree({
            gitRoot,
            repo: 'testorg/short',
            branch: 'feat/inflight',
            worktreeDirName: 'short.vlad.feat-inflight',
          });

          const result = runSkill(
            'lines --in testorg/short --tree feat/inflight --paths src/absent-file-xyz.ts',
            { HOME: homeDir },
          );

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            '--paths named a file that tree cannot serve',
          );
          // the failure must not wear the empty-result costume
          expect(result.stdout).not.toContain('crickets');
          expect(result.stdout).not.toContain('found: 0');
          // and it must name the fix: how to see what the tree DOES serve
          expect(result.stdout).toContain(
            'rhx git.repo.get files --in testorg/short --tree feat/inflight',
          );
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] --paths names a directory rather than a file', () => {
      then('fails loud too — a directory is not a readable file', () => {
        const { homeDir, gitRoot, cleanup } = genTempDir();
        try {
          genWorktree({
            gitRoot,
            repo: 'testorg/short',
            branch: 'feat/inflight',
            worktreeDirName: 'short.vlad.feat-inflight',
          });

          const result = runSkill(
            'lines --in testorg/short --tree feat/inflight --paths src',
            { HOME: homeDir },
          );

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            '--paths named a file that tree cannot serve',
          );
          expect(result.stdout).not.toContain('crickets');
        } finally {
          cleanup();
        }
      });
    });
  });

  // .why = the third point on the line case40 draws. case40 proved an ABSENT
  //        file fails loud instead of an empty read; this proves the mirror —
  //        a file that IS there but holds no bytes reads as found, not as a
  //        miss. an empty file is ordinary and valid (a stub, a placeholder,
  //        a truncated log), and the guard that catches absence lets it
  //        through, so it fell to the same `-z "$content"` branch and rendered
  //        "crickets — found: 0 files". that is a found file dressed as an
  //        absent one — rule.forbid.failhide, from the other direction.
  given(
    '[case41] --tree --paths names a file that is present but empty',
    () => {
      when('[t0] the file exists in the worktree with zero bytes', () => {
        then('reads as found, never as a miss', () => {
          const { homeDir, gitRoot, cleanup } = genTempDir();
          try {
            genWorktree({
              gitRoot,
              repo: 'testorg/short',
              branch: 'feat/inflight',
              worktreeDirName: 'short.vlad.feat-inflight',
            });

            // an empty, tracked-shaped source file — valid, and zero bytes
            const treeDir = path.join(
              gitRoot,
              'testorg',
              '_worktrees',
              'short.vlad.feat-inflight',
            );
            fs.writeFileSync(path.join(treeDir, 'src', 'empty-stub.ts'), '');

            const result = runSkill(
              'lines --in testorg/short --tree feat/inflight --paths src/empty-stub.ts',
              { HOME: homeDir },
            );

            expect(result.exitCode).toBe(0);
            // the file WAS found; the count must say so
            expect(result.stdout).toContain('found: 1 file');
            // and it must not wear the miss costume
            expect(result.stdout).not.toContain('crickets');
            expect(result.stdout).not.toContain('found: 0');
            // the emptiness is stated, not implied by an absent body
            expect(result.stdout).toContain('the file is empty');
            expect(result.stdout).toMatchSnapshot();
          } finally {
            cleanup();
          }
        });
      });
    },
  );

  given('[case34] --paths that tries to escape the worktree', () => {
    when('[t0] --paths walks up out of the tree with ../', () => {
      then(
        'refuses — the sanctioned tool is not a way to read the host',
        () => {
          const { tempDir, homeDir, gitRoot, cleanup } = genTempDir();
          try {
            genWorktree({
              gitRoot,
              repo: 'testorg/short',
              branch: 'feat/inflight',
              worktreeDirName: 'short.vlad.feat-inflight',
            });

            // a file OUTSIDE the worktree, with content that must never surface
            const secretPath = path.join(tempDir, 'outside-secret.txt');
            fs.writeFileSync(secretPath, 'TOPSECRET-do-not-leak\n');

            // walk up from the worktree to reach it
            const pathOutside = path.relative(
              path.join(
                gitRoot,
                'testorg',
                '_worktrees',
                'short.vlad.feat-inflight',
              ),
              secretPath,
            );

            const result = runSkill(
              `lines --in testorg/short --tree feat/inflight --paths ${pathOutside}`,
              { HOME: homeDir },
            );

            // the content must NOT appear, whatever the exit code
            expect(result.stdout).not.toContain('TOPSECRET');
            expect(result.stderr).not.toContain('TOPSECRET');
            // and it must fail loud rather than quietly read empty
            expect(result.exitCode).toBe(2);
            expect(result.stdout).toContain('outside the worktree');
            // a refusal a human reads under suspicion deserves the visual
            // proof, not just a substring probe
            expect(redactTempRoot(result.stdout, homeDir)).toMatchSnapshot();
          } finally {
            cleanup();
          }
        },
      );
    });

    when('[t1] an absolute path outside the tree', () => {
      then('refuses that too', () => {
        const { tempDir, homeDir, gitRoot, cleanup } = genTempDir();
        try {
          genWorktree({
            gitRoot,
            repo: 'testorg/short',
            branch: 'feat/inflight',
            worktreeDirName: 'short.vlad.feat-inflight',
          });

          const secretPath = path.join(tempDir, 'outside-secret.txt');
          fs.writeFileSync(secretPath, 'TOPSECRET-do-not-leak\n');

          const result = runSkill(
            `lines --in testorg/short --tree feat/inflight --paths ${secretPath}`,
            { HOME: homeDir },
          );

          expect(result.stdout).not.toContain('TOPSECRET');
          expect(result.exitCode).toBe(2);
        } finally {
          cleanup();
        }
      });
    });

    when('[t2] a normal path within the tree', () => {
      then('still reads fine — the guard is not over-broad', () => {
        const { homeDir, gitRoot, cleanup } = genTempDir();
        try {
          genWorktree({
            gitRoot,
            repo: 'testorg/short',
            branch: 'feat/inflight',
            worktreeDirName: 'short.vlad.feat-inflight',
          });

          const result = runSkill(
            'lines --in testorg/short --tree feat/inflight --paths src/index.ts',
            { HOME: homeDir },
          );

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('export const hello');
        } finally {
          cleanup();
        }
      });
    });

    /**
     * .what = a symlink INSIDE the tree that points outside it
     * .why = t0 and t1 both escape lexically — a `../` segment and a `/` at
     *        the front are visible in the string itself, so a naive prefix
     *        compare would catch them and look sufficient. this one does
     *        not: the path is repo-relative and holds no `..`, so it passes
     *        every lexical test and escapes only once the filesystem
     *        expands the link. it is the sole case that proves the guard
     *        resolves symlinks (realpath -m) rather than merely inspects
     *        the string — the exact boundary the guard exists for.
     */
    when('[t3] a symlink inside the tree points outside it', () => {
      then('refuses — containment is checked after expansion', () => {
        const { tempDir, homeDir, gitRoot, cleanup } = genTempDir();
        try {
          const { worktreePath } = genWorktree({
            gitRoot,
            repo: 'testorg/short',
            branch: 'feat/inflight',
            worktreeDirName: 'short.vlad.feat-inflight',
          });

          const secretPath = path.join(tempDir, 'outside-secret.txt');
          fs.writeFileSync(secretPath, 'TOPSECRET-do-not-leak\n');

          // an innocent-shaped, repo-relative path — no `..`, no `/` in front
          fs.symlinkSync(secretPath, path.join(worktreePath, 'src', 'leak.ts'));

          const result = runSkill(
            'lines --in testorg/short --tree feat/inflight --paths src/leak.ts',
            { HOME: homeDir },
          );

          expect(result.stdout).not.toContain('TOPSECRET');
          expect(result.stderr).not.toContain('TOPSECRET');
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('outside the worktree');
        } finally {
          cleanup();
        }
      });
    });
  });

  /**
   * .what = a BINARY file, read through --tree
   * .why = the --tree read is the one path that reads raw bytes off disk;
   *        every other source goes through git, which knows a blob from a
   *        text file. so this is the one mode that can hand a terminal a
   *        stream of control bytes dressed as source lines. the case pins
   *        which of the two it does, so the answer cannot drift unnoticed.
   */
  given('[case42] a binary file in the tree', () => {
    when('[t0] the binary is read by --paths through --tree', () => {
      then('refuses rather than render bytes as source lines', () => {
        const { homeDir, gitRoot, cleanup } = genTempDir();
        try {
          const { worktreePath } = genWorktree({
            gitRoot,
            repo: 'testorg/short',
            branch: 'feat/inflight',
            worktreeDirName: 'short.vlad.feat-inflight',
          });

          // NUL bytes are what make it binary — and what a shell command
          // substitution silently drops, so a naive read renders a file
          // that is not the file on disk
          fs.writeFileSync(
            path.join(worktreePath, 'src', 'logo.png'),
            Buffer.from([0x00, 0x01, 0x02, 0x42, 0x49, 0x4e, 0x00, 0xff]),
          );

          const result = runSkill(
            'lines --in testorg/short --tree feat/inflight --paths src/logo.png',
            { HOME: homeDir },
          );

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('binary');
          expect(redactTempRoot(result.stdout, homeDir)).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] the tree also holds normal text files', () => {
      then('the binary guard does not touch them', () => {
        const { homeDir, gitRoot, cleanup } = genTempDir();
        try {
          const { worktreePath } = genWorktree({
            gitRoot,
            repo: 'testorg/short',
            branch: 'feat/inflight',
            worktreeDirName: 'short.vlad.feat-inflight',
          });

          fs.writeFileSync(
            path.join(worktreePath, 'src', 'logo.png'),
            Buffer.from([0x00, 0x01, 0x02, 0x42, 0x49, 0x4e, 0x00, 0xff]),
          );

          const result = runSkill(
            'lines --in testorg/short --tree feat/inflight --paths src/index.ts',
            { HOME: homeDir },
          );

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('inflightOnly');
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case35] --tree names the branch of the repo main clone', () => {
    when('[t0] that main clone has an uncommitted edit on disk', () => {
      then('reads it — the main clone is a tree like any other', () => {
        const { homeDir, gitRoot, cleanup } = genTempDir();
        try {
          // `git worktree list` reports the MAIN clone as its first entry,
          // so --tree reaches it too. that closes the "debug the peer's
          // real disk state" usecase the vision listed as unserved
          const mainClonePath = path.join(gitRoot, 'testorg', 'short');
          fs.writeFileSync(
            path.join(mainClonePath, 'src', 'index.ts'),
            'export const hello = "world";\nexport const dirtyInMainClone = 1;\n',
          );

          const result = runSkill(
            'lines --in testorg/short --tree main --paths src/index.ts',
            { HOME: homeDir },
          );

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('dirtyInMainClone');
          // and it is labeled inflight, never mistaken for latest
          expect(result.stdout).toContain('tree: main');
          expect(result.stdout).not.toContain('ref: origin/main');
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] the same file is read without --tree', () => {
      then('the committed state only — the dirty edit is absent', () => {
        const { homeDir, gitRoot, cleanup } = genTempDir();
        try {
          const mainClonePath = path.join(gitRoot, 'testorg', 'short');
          fs.writeFileSync(
            path.join(mainClonePath, 'src', 'index.ts'),
            'export const hello = "world";\nexport const dirtyInMainClone = 1;\n',
          );

          const result = runSkill(
            'lines --in testorg/short --paths src/index.ts',
            { HOME: homeDir },
          );

          expect(result.exitCode).toBe(0);
          expect(result.stdout).not.toContain('dirtyInMainClone');
          expect(result.stdout).toContain('ref: origin/main');
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case36] a --words pattern git grep cannot compile', () => {
    when('[t0] the search runs against a tree', () => {
      then('rethrows the git failure rather than render crickets', () => {
        const { homeDir, gitRoot, cleanup } = genTempDir();
        try {
          genWorktree({
            gitRoot,
            repo: 'testorg/short',
            branch: 'feat/inflight',
            worktreeDirName: 'short.vlad.feat-inflight',
          });

          // an unclosed bracket is not a valid ERE, so git grep exits >1.
          // that is a real failure, and it must NOT flatten into the same
          // "crickets..." an honest zero-match search renders — otherwise a
          // broken search reads as a clean miss (rule.forbid.failhide)
          const result = runSkill(
            "lines --in testorg/short --tree feat/inflight --words '[unclosed'",
            { HOME: homeDir },
          );

          expect(result.exitCode).not.toBe(0);
          expect(result.stdout).not.toContain('crickets');
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] the same search runs through the files subcommand', () => {
      then('rethrows there too — both tree searches must fail alike', () => {
        const { homeDir, gitRoot, cleanup } = genTempDir();
        try {
          // .why = `files --tree --words` reaches git grep through a DIFFERENT
          //        call site than `lines --tree --words` (t0). a fix applied to
          //        one and missed on the other leaves half the flag failhidden,
          //        and the two renders would disagree for one input
          genWorktree({
            gitRoot,
            repo: 'testorg/short',
            branch: 'feat/inflight',
            worktreeDirName: 'short.vlad.feat-inflight',
          });

          const result = runSkill(
            "files --in testorg/short --tree feat/inflight --words '[unclosed'",
            { HOME: homeDir },
          );

          expect(result.exitCode).not.toBe(0);
          expect(result.stdout).not.toContain('crickets');
          // and it wears the same turtle frame as every other failure here
          expect(result.stdout).toContain('could not search this tree');
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case33] --tree on the repos subcommand', () => {
    when('[t0] --tree is passed to a repo enumeration', () => {
      then('fails loud rather than silently drop it', () => {
        const { homeDir, cleanup } = genTempDir();
        try {
          const result = runSkill('repos --tree feat/inflight', {
            HOME: homeDir,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            '--tree has no sense on the repos subcommand',
          );
          // names the fix: the two subcommands --tree DOES serve
          expect(result.stdout).toContain('git.repo.get files --in');
          expect(result.stdout).toContain('git.repo.get lines --in');
          // snapshot: user-faced error output, and free of temp paths
          expect(result.stdout).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  // GIT_REPO_ROOT override
  given('[case24] GIT_REPO_ROOT env override', () => {
    when('[t0] custom root is set', () => {
      then('uses custom root instead of ~/git', () => {
        const { tempDir, cleanup } = genTempDir();
        const customRoot = path.join(tempDir, 'custom-git-root');
        fs.mkdirSync(path.join(customRoot, 'myorg', 'myrepo', '.git'), {
          recursive: true,
        });
        fs.writeFileSync(
          path.join(customRoot, 'myorg', 'myrepo', 'test.txt'),
          'custom root test',
        );
        // init git
        spawnSync('git', ['init'], {
          cwd: path.join(customRoot, 'myorg', 'myrepo'),
        });
        configureTestGitUser({ cwd: path.join(customRoot, 'myorg', 'myrepo') });
        spawnSync('git', ['add', '.'], {
          cwd: path.join(customRoot, 'myorg', 'myrepo'),
        });
        spawnSync('git', ['commit', '-m', 'init'], {
          cwd: path.join(customRoot, 'myorg', 'myrepo'),
        });
        spawnSync('git', ['checkout', '-B', 'main'], {
          cwd: path.join(customRoot, 'myorg', 'myrepo'),
        });
        spawnSync('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD'], {
          cwd: path.join(customRoot, 'myorg', 'myrepo'),
        });

        try {
          const result = spawnSync(
            'bash',
            [scriptPath, 'repos', '--repos', 'myorg/*'],
            {
              cwd: process.cwd(),
              encoding: 'utf-8',
              stdio: ['pipe', 'pipe', 'pipe'],
              timeout: 30000,
              env: {
                ...process.env,
                HOME: tempDir,
                GIT_REPO_ROOT: customRoot,
              },
            },
          );

          expect(result.status).toBe(0);
          expect(result.stdout).toContain('myrepo');
          expect(result.stdout).toContain('custom-git-root');
        } finally {
          cleanup();
        }
      });
    });
  });
});
