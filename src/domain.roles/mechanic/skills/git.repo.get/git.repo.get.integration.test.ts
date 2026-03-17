import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

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
      spawnSync('git', ['init'], { cwd: repoPath });
      spawnSync('git', ['add', '.'], { cwd: repoPath });
      spawnSync('git', ['commit', '-m', 'initial'], { cwd: repoPath });
      spawnSync('git', ['checkout', '-b', 'main'], { cwd: repoPath });
      spawnSync(
        'git',
        ['remote', 'add', 'origin', `https://github.com/${repo}.git`],
        { cwd: repoPath },
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
   * .what = helper to run git.repo.get.sh with custom HOME
   * .why = standardize invocation and result capture
   */
  const runSkill = (
    args: string,
    env: { HOME: string },
  ): { stdout: string; stderr: string; exitCode: number } => {
    const result = spawnSync(
      'bash',
      [scriptPath, ...args.split(' ').filter(Boolean)],
      {
        cwd: process.cwd(),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000,
        env: {
          ...process.env,
          HOME: env.HOME,
        },
      },
    );

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
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
});
