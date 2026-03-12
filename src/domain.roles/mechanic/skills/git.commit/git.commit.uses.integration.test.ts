import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = integration tests for git.commit.uses.sh
 * .why = verify quota management works correctly for all modes and edge cases
 */
describe('git.commit.uses.sh', () => {
  const scriptPath = path.join(__dirname, 'git.commit.uses.sh');

  const runInTempGitRepo = (args: {
    args: string[];
    meterState?: { uses: number; push: string };
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'git-commit-uses-test', git: true });

    // create .meter directory and state if provided
    if (args.meterState) {
      const meterDir = path.join(tempDir, '.meter');
      fs.mkdirSync(meterDir, { recursive: true });
      fs.writeFileSync(
        path.join(meterDir, 'git.commit.uses.jsonc'),
        JSON.stringify(args.meterState, null, 2),
      );
    }

    const result = spawnSync('bash', [scriptPath, ...args.args], {
      cwd: tempDir,
      encoding: 'utf-8' as const,
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
   * .what = run command with isolated HOME for global storage tests
   * .why = prevents tests from affecting real global state
   */
  const runWithGlobalStorage = (args: {
    args: string[];
    meterState?: { uses: number; push: string };
    globalBlocker?: boolean;
  }): {
    stdout: string;
    stderr: string;
    exitCode: number;
    tempDir: string;
    tempHome: string;
    globalMeterFile: string;
  } => {
    const tempDir = genTempDir({ slug: 'git-commit-uses-test', git: true });
    const tempHome = genTempDir({ slug: 'git-commit-uses-home', git: false });
    const globalMeterDir = path.join(
      tempHome,
      '.rhachet',
      'storage',
      'repo=ehmpathy',
      'role=mechanic',
      '.meter',
    );
    const globalMeterFile = path.join(globalMeterDir, 'git.commit.uses.jsonc');

    // create local .meter directory and state if provided
    if (args.meterState) {
      const meterDir = path.join(tempDir, '.meter');
      fs.mkdirSync(meterDir, { recursive: true });
      fs.writeFileSync(
        path.join(meterDir, 'git.commit.uses.jsonc'),
        JSON.stringify(args.meterState, null, 2),
      );
    }

    // create global blocker if requested
    if (args.globalBlocker) {
      fs.mkdirSync(globalMeterDir, { recursive: true });
      fs.writeFileSync(
        globalMeterFile,
        JSON.stringify({ blocked: true }, null, 2),
      );
    }

    const result = spawnSync('bash', [scriptPath, ...args.args], {
      cwd: tempDir,
      encoding: 'utf-8' as const,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, HOME: tempHome },
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      tempDir,
      tempHome,
      globalMeterFile,
    };
  };

  given('[case1] set --quant N --push block', () => {
    when('[t0] setting 3 uses with push blocked', () => {
      then('outputs gnarly with granted count', () => {
        const result = runInTempGitRepo({
          args: ['set', '--quant', '3', '--push', 'block'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 gnarly! thanks human!');
        expect(result.stdout).toContain('granted: 3');
        expect(result.stdout).toContain('push: blocked');
        expect(result.stdout).toMatchSnapshot();
      });

      then('state file is created', () => {
        const result = runInTempGitRepo({
          args: ['set', '--quant', '3', '--push', 'block'],
        });

        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        expect(fs.existsSync(stateFile)).toBe(true);

        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe(3);
        expect(state.push).toBe('block');
      });
    });
  });

  given('[case2] set --quant N --push allow', () => {
    when('[t0] setting 1 use with push allowed', () => {
      then('outputs radical', () => {
        const result = runInTempGitRepo({
          args: ['set', '--quant', '1', '--push', 'allow'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 radical!');
        expect(result.stdout).toContain('granted: 1');
        expect(result.stdout).toContain('push: allowed');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case3] set --quant 0 (revoke)', () => {
    when('[t0] revoking all uses', () => {
      then('outputs groovy break time with tip', () => {
        const result = runInTempGitRepo({
          args: ['set', '--quant', '0', '--push', 'block'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 groovy, break time');
        expect(result.stdout).toContain('git.commit.uses set');
        expect(result.stdout).toContain('├─ revoked');
        expect(result.stdout).toContain('tip:');
        expect(result.stdout).toContain(
          "'rhx git.commit.uses del' does the same",
        );
        expect(result.stdout).toMatchSnapshot();
      });

      then('state file shows 0 uses', () => {
        const result = runInTempGitRepo({
          args: ['set', '--quant', '0', '--push', 'block'],
        });

        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe(0);
      });
    });
  });

  given('[case3b] set --quant 0 --push allow (push-only mode)', () => {
    when('[t0] push-only access granted', () => {
      then('outputs push only mode without tip', () => {
        const result = runInTempGitRepo({
          args: ['set', '--quant', '0', '--push', 'allow'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('let it ride');
        expect(result.stdout).toContain('commits: 0');
        expect(result.stdout).toContain('push: allowed');
        expect(result.stdout).not.toContain('tip:');
        expect(result.stdout).toMatchSnapshot();
      });

      then('state file shows 0 uses and push allow', () => {
        const result = runInTempGitRepo({
          args: ['set', '--quant', '0', '--push', 'allow'],
        });

        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe(0);
        expect(state.push).toBe('allow');
      });
    });
  });

  given('[case3c] set --quant 0 without --push (defaults to block)', () => {
    when('[t0] revoke without explicit push flag', () => {
      then('defaults to block and shows revoked with tip', () => {
        const result = runInTempGitRepo({
          args: ['set', '--quant', '0'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('revoked');
        expect(result.stdout).toContain('tip:');
        expect(result.stdout).toContain(
          "'rhx git.commit.uses del' does the same",
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case3d] del command (revoke shortcut)', () => {
    when('[t0] del with quota present', () => {
      then('shows revoked without tip', () => {
        const result = runInTempGitRepo({
          args: ['del'],
          meterState: { uses: 3, push: 'allow' },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 groovy, break time');
        expect(result.stdout).toContain('git.commit.uses del');
        expect(result.stdout).toContain('└─ revoked');
        expect(result.stdout).not.toContain('tip:');
        expect(result.stdout).toMatchSnapshot();
      });

      then('state file shows 0 uses and push block', () => {
        const result = runInTempGitRepo({
          args: ['del'],
          meterState: { uses: 3, push: 'allow' },
        });

        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe(0);
        expect(state.push).toBe('block');
      });
    });

    when('[t1] del without quota (idempotent)', () => {
      then('succeeds and shows revoked', () => {
        const result = runInTempGitRepo({
          args: ['del'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 groovy, break time');
        expect(result.stdout).toContain('git.commit.uses del');
        expect(result.stdout).toContain('revoked');
        expect(result.stdout).not.toContain('tip:');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case3e] del with rhachet passthrough args', () => {
    when('[t0] rhachet passes --skill --repo --role before del', () => {
      then('del is recognized after passthrough args', () => {
        // rhachet passes args like: --skill git.commit.uses --repo ehmpathy --role mechanic del
        const result = runInTempGitRepo({
          args: [
            '--skill',
            'git.commit.uses',
            '--repo',
            'ehmpathy',
            '--role',
            'mechanic',
            'del',
          ],
          meterState: { uses: 3, push: 'allow' },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('git.commit.uses del');
        expect(result.stdout).toContain('revoked');
      });
    });
  });

  given('[case4] set without --push', () => {
    when('[t0] --push flag is missing', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          args: ['set', '--quant', '3'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('--push allow|block is required');
      });
    });
  });

  given('[case5] get shows remaining', () => {
    when('[t0] state exists with 2 uses', () => {
      then('outputs lets check the meter with remaining', () => {
        const result = runInTempGitRepo({
          args: ['get'],
          meterState: { uses: 2, push: 'allow' },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 lets check the meter...');
        expect(result.stdout).toContain('left: 2');
        expect(result.stdout).toContain('push: allowed');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case6] get with 0 uses and push allow (push-only mode)', () => {
    when('[t0] state exists with 0 uses and push allow', () => {
      then('shows push allowed for push-only use case', () => {
        const result = runInTempGitRepo({
          args: ['get'],
          meterState: { uses: 0, push: 'allow' },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('left: 0');
        expect(result.stdout).toContain('push: allowed');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case7] get when no state file', () => {
    when('[t0] no .meter/git.commit.uses.jsonc exists', () => {
      then('shows no quota set', () => {
        const result = runInTempGitRepo({
          args: ['get'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 lets check the meter...');
        expect(result.stdout).toContain('no quota set');
        expect(result.stdout).toContain(
          'git.commit.uses set --quant N --push allow|block',
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  // ========================================
  // global blocker tests
  // ========================================

  given('[case8] block --global', () => {
    when('[t0] no global blocker yet', () => {
      then('creates global blocker file', () => {
        const result = runWithGlobalStorage({
          args: ['block', '--global'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 groovy, bond fire time');
        expect(result.stdout).toContain('commits blocked globally');
        expect(fs.existsSync(result.globalMeterFile)).toBe(true);

        const state = JSON.parse(
          fs.readFileSync(result.globalMeterFile, 'utf-8'),
        );
        expect(state.blocked).toBe(true);
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] global blocker already active', () => {
      then('overwrites blocker (idempotent)', () => {
        const result = runWithGlobalStorage({
          args: ['block', '--global'],
          globalBlocker: true,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('commits blocked globally');
        expect(fs.existsSync(result.globalMeterFile)).toBe(true);
      });
    });
  });

  given('[case9] allow --global', () => {
    when('[t0] global blocker is active', () => {
      then('removes global blocker file', () => {
        const result = runWithGlobalStorage({
          args: ['allow', '--global'],
          globalBlocker: true,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 shell yeah, back in the water!');
        expect(result.stdout).toContain('commits resumed globally');
        expect(fs.existsSync(result.globalMeterFile)).toBe(false);
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] no global blocker', () => {
      then('succeeds (idempotent)', () => {
        const result = runWithGlobalStorage({
          args: ['allow', '--global'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('commits resumed globally');
        expect(fs.existsSync(result.globalMeterFile)).toBe(false);
      });
    });
  });

  given('[case10] get --global', () => {
    when('[t0] global blocker is active', () => {
      then('shows blocked', () => {
        const result = runWithGlobalStorage({
          args: ['get', '--global'],
          globalBlocker: true,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('global: blocked');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] no global blocker', () => {
      then('shows not blocked', () => {
        const result = runWithGlobalStorage({
          args: ['get', '--global'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('global: not blocked');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  // ========================================
  // local block/allow commands
  // ========================================

  given('[case11] block (local)', () => {
    when('[t0] quota present', () => {
      then('sets quota to 0 (alias for del)', () => {
        const result = runWithGlobalStorage({
          args: ['block'],
          meterState: { uses: 5, push: 'allow' },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 groovy, break time');
        expect(result.stdout).toContain('git.commit.uses del');
        expect(result.stdout).toContain('revoked');

        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe(0);
        expect(state.push).toBe('block');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case12] allow (local)', () => {
    when('[t0] no quota present', () => {
      then('grants unlimited quota with push allowed', () => {
        const result = runWithGlobalStorage({
          args: ['allow'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain("🐢 radical! let's ride!");
        expect(result.stdout).toContain('granted: unlimited');
        expect(result.stdout).toContain('push: allowed');

        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe(999999);
        expect(state.push).toBe('allow');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  // ========================================
  // get with global awareness
  // ========================================

  given('[case13] get shows local + global state', () => {
    when('[t0] local quota present and global blocked', () => {
      then('shows local meter and global blocked', () => {
        const result = runWithGlobalStorage({
          args: ['get'],
          meterState: { uses: 3, push: 'allow' },
          globalBlocker: true,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('left: 3');
        expect(result.stdout).toContain('push: allowed');
        expect(result.stdout).toContain('global: blocked');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] local quota present and global not blocked', () => {
      then('shows local meter without global line', () => {
        const result = runWithGlobalStorage({
          args: ['get'],
          meterState: { uses: 3, push: 'allow' },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('left: 3');
        expect(result.stdout).toContain('push: allowed');
        expect(result.stdout).not.toContain('global:');
      });
    });

    when('[t2] no local quota and global blocked', () => {
      then('shows no quota set and global blocked', () => {
        const result = runWithGlobalStorage({
          args: ['get'],
          globalBlocker: true,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('no quota set');
        expect(result.stdout).toContain('global: blocked');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });
});
