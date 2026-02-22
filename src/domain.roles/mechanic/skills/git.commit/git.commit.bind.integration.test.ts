import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = integration tests for git.commit.bind.sh
 * .why = verify level set/get/del works correctly
 */
describe('git.commit.bind.sh', () => {
  const scriptPath = path.join(__dirname, 'git.commit.bind.sh');

  const runInTempGitRepo = (args: {
    bindArgs: string[];
    bindLevel?: string;
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'git-commit-bind-test', git: true });

    // pre-seed a bound level if provided
    if (args.bindLevel) {
      const bindDir = path.join(tempDir, '.branch', '.bind');
      fs.mkdirSync(bindDir, { recursive: true });
      fs.writeFileSync(path.join(bindDir, 'git.commit.level'), args.bindLevel);
    }

    const result = spawnSync('bash', [scriptPath, ...args.bindArgs], {
      cwd: tempDir,
      encoding: 'utf-8', // note: library api requires this term
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      tempDir,
    };
  };

  given('[case1] set --level fix', () => {
    when('[t0] level set to fix', () => {
      then('outputs sweet with bound level', () => {
        const result = runInTempGitRepo({
          bindArgs: ['set', '--level', 'fix'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('sweet! level bound');
        expect(result.stdout).toContain('level: fix');
        expect(result.stdout).toMatchSnapshot();
      });

      then('state file is created with fix', () => {
        const result = runInTempGitRepo({
          bindArgs: ['set', '--level', 'fix'],
        });

        const levelFile = path.join(
          result.tempDir,
          '.branch',
          '.bind',
          'git.commit.level',
        );
        expect(fs.existsSync(levelFile)).toBe(true);
        expect(fs.readFileSync(levelFile, 'utf-8').trim()).toBe('fix');
      });
    });
  });

  given('[case2] set --level feat', () => {
    when('[t0] level set to feat', () => {
      then('outputs sweet with bound level', () => {
        const result = runInTempGitRepo({
          bindArgs: ['set', '--level', 'feat'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('sweet! level bound');
        expect(result.stdout).toContain('level: feat');
        expect(result.stdout).toMatchSnapshot();
      });

      then('state file is created with feat', () => {
        const result = runInTempGitRepo({
          bindArgs: ['set', '--level', 'feat'],
        });

        const levelFile = path.join(
          result.tempDir,
          '.branch',
          '.bind',
          'git.commit.level',
        );
        expect(fs.existsSync(levelFile)).toBe(true);
        expect(fs.readFileSync(levelFile, 'utf-8').trim()).toBe('feat');
      });
    });
  });

  given('[case3] get', () => {
    when('[t0] level is bound to fix', () => {
      then('shows bound level', () => {
        const result = runInTempGitRepo({
          bindArgs: ['get'],
          bindLevel: 'fix',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('level: fix');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] no level is bound', () => {
      then('shows (none)', () => {
        const result = runInTempGitRepo({
          bindArgs: ['get'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('level: (none)');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case4] del', () => {
    when('[t0] level was bound', () => {
      then('removes the level file', () => {
        const result = runInTempGitRepo({
          bindArgs: ['del'],
          bindLevel: 'fix',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('groovy, level cleared');
        expect(result.stdout).toContain('level: (none)');

        const levelFile = path.join(
          result.tempDir,
          '.branch',
          '.bind',
          'git.commit.level',
        );
        expect(fs.existsSync(levelFile)).toBe(false);
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] no level was bound', () => {
      then('succeeds gracefully', () => {
        const result = runInTempGitRepo({
          bindArgs: ['del'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('level: (none)');
      });
    });
  });

  given('[case5] set --level with invalid value', () => {
    when('[t0] level is chore', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          bindArgs: ['set', '--level', 'chore'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain("--level must be 'feat' or 'fix'");
      });
    });
  });

  given('[case6] no subcommand', () => {
    when('[t0] no subcommand provided', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          bindArgs: [],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('subcommand is required');
      });
    });
  });

  given('[case7] set without --level', () => {
    when('[t0] set but no --level flag', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          bindArgs: ['set'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('--level is required for set');
      });
    });
  });
});
