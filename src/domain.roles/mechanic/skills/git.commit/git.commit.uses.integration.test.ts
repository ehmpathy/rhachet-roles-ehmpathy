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

  given('[case1] set --allow N --push block', () => {
    when('[t0] setting 3 uses with push blocked', () => {
      then('outputs gnarly with granted count', () => {
        const result = runInTempGitRepo({
          args: ['set', '--allow', '3', '--push', 'block'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 gnarly! thanks human!');
        expect(result.stdout).toContain('granted: 3');
        expect(result.stdout).toContain('push: blocked');
      });

      then('state file is created', () => {
        const result = runInTempGitRepo({
          args: ['set', '--allow', '3', '--push', 'block'],
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

  given('[case2] set --allow N --push allow', () => {
    when('[t0] setting 1 use with push allowed', () => {
      then('outputs radical', () => {
        const result = runInTempGitRepo({
          args: ['set', '--allow', '1', '--push', 'allow'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 radical!');
        expect(result.stdout).toContain('granted: 1');
        expect(result.stdout).toContain('push: allowed');
      });
    });
  });

  given('[case3] set --allow 0 (revoke)', () => {
    when('[t0] revoking all uses', () => {
      then('outputs groovy break time', () => {
        const result = runInTempGitRepo({
          args: ['set', '--allow', '0', '--push', 'block'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 groovy, break time');
        expect(result.stdout).toContain('revoked');
      });

      then('state file shows 0 uses', () => {
        const result = runInTempGitRepo({
          args: ['set', '--allow', '0', '--push', 'block'],
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

  given('[case4] set without --push', () => {
    when('[t0] --push flag is missing', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          args: ['set', '--allow', '3'],
        });

        expect(result.exitCode).toBe(1);
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
      });
    });
  });

  given('[case6] get with 0 uses shows push blocked', () => {
    when('[t0] state exists with 0 uses and push allow', () => {
      then('push shows blocked since commit halts before push', () => {
        const result = runInTempGitRepo({
          args: ['get'],
          meterState: { uses: 0, push: 'allow' },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('left: 0');
        expect(result.stdout).toContain('push: blocked');
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
          'git.commit.uses set --allow N --push allow|block',
        );
      });
    });
  });
});
