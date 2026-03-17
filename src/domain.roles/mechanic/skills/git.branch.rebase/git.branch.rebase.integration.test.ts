import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

/**
 * .what = integration tests for git.branch.rebase dispatcher skill
 * .why = verify dispatcher routes to subskills and handles errors
 */

const SKILL_PATH = path.join(__dirname, 'git.branch.rebase.sh');

/**
 * .what = setup minimal git repo for dispatcher tests
 * .why = dispatcher needs .meter state for subskill permission checks
 */
const setupMinimalRepo = (options?: { pushAllowed?: boolean }): string => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-rebase-disp-'));

  // init git repo
  spawnSync('git', ['init'], { cwd: tempDir });
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: tempDir });
  spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: tempDir });

  // create initial commit
  fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test\n');
  spawnSync('git', ['add', 'README.md'], { cwd: tempDir });
  spawnSync('git', ['commit', '-m', 'init'], { cwd: tempDir });
  spawnSync('git', ['branch', '-M', 'main'], { cwd: tempDir });

  // create origin/main ref
  spawnSync('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD'], {
    cwd: tempDir,
  });

  // create feature branch
  spawnSync('git', ['checkout', '-b', 'feature/test'], { cwd: tempDir });

  // setup meter state
  const meterDir = path.join(tempDir, '.meter');
  fs.mkdirSync(meterDir, { recursive: true });
  fs.writeFileSync(
    path.join(meterDir, 'git.commit.uses.jsonc'),
    JSON.stringify({
      quant: options?.pushAllowed !== false ? 5 : 0,
      push: options?.pushAllowed !== false ? 'allow' : 'block',
    }),
  );

  return tempDir;
};

describe('git.branch.rebase.sh', () => {
  given('[case1] help subcommand', () => {
    when('[t0] invoked with help', () => {
      then('shows usage with exit 0', () => {
        const result = spawnSync('bash', [SKILL_PATH, 'help'], {
          encoding: 'utf-8',
        });
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('subcommands');
        expect(result.stdout).toContain('begin');
        expect(result.stdout).toContain('continue');
        expect(result.stdout).toContain('abort');
      });
    });
  });

  given('[case2] help flags', () => {
    when('[t0] invoked with --help', () => {
      then('shows usage', () => {
        const result = spawnSync('bash', [SKILL_PATH, '--help'], {
          encoding: 'utf-8',
        });
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('subcommands');
      });
    });

    when('[t1] invoked with -h', () => {
      then('shows usage', () => {
        const result = spawnSync('bash', [SKILL_PATH, '-h'], {
          encoding: 'utf-8',
        });
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('subcommands');
      });
    });
  });

  given('[case3] no subcommand', () => {
    when('[t0] invoked without subcommand', () => {
      then('shows error and subcommands, exits non-zero', () => {
        const result = spawnSync('bash', [SKILL_PATH], {
          encoding: 'utf-8',
        });
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain('subcommand required');
        expect(result.stdout).toContain('subcommands');
      });
    });
  });

  given('[case4] unknown subcommand', () => {
    when('[t0] invoked with invalid', () => {
      then('shows error with subcommand name, exits non-zero', () => {
        const result = spawnSync('bash', [SKILL_PATH, 'invalid'], {
          encoding: 'utf-8',
        });
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain('unknown subcommand: invalid');
        expect(result.stdout).toContain('subcommands');
      });
    });
  });

  given('[case5] dispatch to begin', () => {
    when('[t0] invoked with begin --mode plan', () => {
      then('dispatches to git.branch.rebase.begin.sh', () => {
        const tempDir = setupMinimalRepo({ pushAllowed: false });
        try {
          const result = spawnSync(
            'bash',
            [SKILL_PATH, 'begin', '--mode', 'plan'],
            {
              cwd: tempDir,
              encoding: 'utf-8',
            },
          );
          // exits 1 because push not allowed, but proves dispatch worked
          expect(result.status).toEqual(1);
          expect(result.stdout).toContain('rebase requires push permission');
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case6] dispatch to continue', () => {
    when('[t0] invoked with continue', () => {
      then('dispatches to git.branch.rebase.continue.sh', () => {
        const tempDir = setupMinimalRepo();
        try {
          const result = spawnSync('bash', [SKILL_PATH, 'continue'], {
            cwd: tempDir,
            encoding: 'utf-8',
          });
          // exits 1 because no rebase in progress, but proves dispatch worked
          expect(result.status).toEqual(1);
          expect(result.stdout).toContain('no rebase in progress');
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case7] dispatch to abort', () => {
    when('[t0] invoked with abort', () => {
      then('dispatches to git.branch.rebase.abort.sh', () => {
        const tempDir = setupMinimalRepo();
        try {
          const result = spawnSync('bash', [SKILL_PATH, 'abort'], {
            cwd: tempDir,
            encoding: 'utf-8',
          });
          // exits 1 because no rebase in progress, but proves dispatch worked
          expect(result.status).toEqual(1);
          expect(result.stdout).toContain('no rebase in progress');
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case8] rhachet arg passthrough', () => {
    when('[t0] rhachet args come before subcommand', () => {
      then('filters rhachet args and finds subcommand', () => {
        const result = spawnSync(
          'bash',
          [
            SKILL_PATH,
            '--skill',
            'git.branch.rebase',
            '--repo',
            'ehmpathy',
            '--role',
            'mechanic',
            'help',
          ],
          {
            encoding: 'utf-8',
          },
        );
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('subcommands');
      });
    });
  });

  given('[case9] arg passthrough to subskill', () => {
    when('[t0] args after subcommand are passed through', () => {
      then('subskill receives the args', () => {
        const tempDir = setupMinimalRepo({ pushAllowed: false });
        try {
          // pass --mode plan to begin - it should receive it
          const result = spawnSync(
            'bash',
            [SKILL_PATH, 'begin', '--mode', 'plan'],
            {
              cwd: tempDir,
              encoding: 'utf-8',
            },
          );
          // the error message proves begin was called (checking push permission)
          expect(result.stdout).toContain('rebase requires push permission');
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });
});
