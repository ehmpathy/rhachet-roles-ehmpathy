import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = integration tests for keyrack.ehmpath.sh init
 * .why = verify the init is idempotent (findsert pattern works)
 */
describe('keyrack.ehmpath.sh', () => {
  const scriptPath = path.join(__dirname, 'keyrack.ehmpath.sh');

  /**
   * .what = helper to run the init in isolated environment
   * .why = uses custom HOME so each test gets fresh ssh key + keyrack
   */
  const runInit = (args: {
    home: string;
    cwd: string;
    stdin?: string;
    extraArgs?: string[];
  }): { stdout: string; stderr: string; exitCode: number } => {
    // strip tokens that could leak from host env into isolated keyrack
    const {
      GITHUB_TOKEN: _gt,
      EHMPATHY_SEATURTLE_GITHUB_TOKEN: _est,
      ...envClean
    } = process.env;

    const scriptArgs = args.extraArgs ?? [];
    const result = spawnSync('bash', [scriptPath, ...scriptArgs], {
      cwd: args.cwd,
      encoding: 'utf-8',
      input: args.stdin,
      env: {
        ...envClean,
        HOME: args.home,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  given('[case1] fresh environment (no ssh key, no keyrack)', () => {
    when('[t0] init is run first time', () => {
      then('it creates ssh key and keyrack', async () => {
        const tempHome = genTempDir({ slug: 'keyrack-home' });
        const tempRepo = genTempDir({
          slug: 'keyrack-repo',
          git: true,
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
        });

        const result = runInit({ home: tempHome, cwd: tempRepo });

        // should succeed (or fail at key config step which requires interactive input)
        // we verify it reaches the key configuration step
        expect(result.stdout).toContain('findsert ehmpath keyrack host');
        expect(result.stdout).toContain('ssh key: create passwordless key');
        expect(result.stdout).toContain('keyrack: init for owner ehmpath');

        // verify files were created
        expect(fs.existsSync(path.join(tempHome, '.ssh/ehmpath'))).toBe(true);
        expect(fs.existsSync(path.join(tempHome, '.ssh/ehmpath.pub'))).toBe(
          true,
        );
        expect(
          fs.existsSync(
            path.join(tempHome, '.rhachet/keyrack/keyrack.host.ehmpath.age'),
          ),
        ).toBe(true);
      });
    });
  });

  given('[case2] environment with ssh key and keyrack already present', () => {
    when('[t0] init is run twice', () => {
      then(
        'second run detects resources are already present (findsert)',
        async () => {
          const tempHome = genTempDir({ slug: 'keyrack-home' });
          const tempRepo = genTempDir({
            slug: 'keyrack-repo',
            git: true,
            symlink: [{ at: 'node_modules', to: 'node_modules' }],
          });

          // first run - creates everything
          const first = runInit({ home: tempHome, cwd: tempRepo });
          expect(first.stdout).toContain('ssh key: create passwordless key');

          // second run - should detect resources are present
          const second = runInit({ home: tempHome, cwd: tempRepo });
          expect(second.stdout).toContain('ssh key: found at');
          expect(second.stdout).toContain('keyrack: found at');
          expect(second.stdout).not.toContain('ssh key: create');
          expect(second.stdout).not.toContain('keyrack: init for owner');
        },
      );
    });
  });

});
