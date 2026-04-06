import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = recursively list directory tree for debug output
 * .why = makes it easy to see file state before/after each step
 */
const treeDir = (dir: string, indent = ''): string => {
  if (!fs.existsSync(dir)) return `${indent}(not found: ${dir})\n`;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let result = '';
  entries.forEach((entry, i) => {
    const isLast = i === entries.length - 1;
    const prefix = isLast ? '└── ' : '├── ';
    const childIndent = isLast ? '    ' : '│   ';
    if (entry.isDirectory()) {
      result += `${indent}${prefix}${entry.name}/\n`;
      result += treeDir(path.join(dir, entry.name), indent + childIndent);
    } else if (entry.isSymbolicLink()) {
      const target = fs.readlinkSync(path.join(dir, entry.name));
      result += `${indent}${prefix}${entry.name} -> ${target}\n`;
    } else {
      result += `${indent}${prefix}${entry.name}\n`;
    }
  });
  return result;
};

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

  given('[case3] key configuration findsert roundtrip', () => {
    // strip tokens that could leak from host env
    const {
      GITHUB_TOKEN: _gt,
      EHMPATHY_SEATURTLE_GITHUB_TOKEN: _est,
      ...envClean
    } = process.env;

    when('[t0] key is set and then init is run again', () => {
      then('second run detects key is configured (no prompt)', async () => {
        // clone fixtures
        const tempHome = genTempDir({
          slug: 'keyrack-home',
          clone: path.join(__dirname, '__test_assets__/keyrack-home'),
        });
        const tempRepo = genTempDir({
          slug: 'keyrack-repo',
          git: true,
          clone: path.join(__dirname, '__test_assets__/keyrack-repo'),
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
        });

        console.log('=== INITIAL STATE ===');
        console.log('tempHome:\n' + treeDir(tempHome));

        // clear daemon cache for ehmpath owner to ensure fresh state
        spawnSync(
          './node_modules/.bin/rhachet',
          ['keyrack', 'relock', '--owner', 'ehmpath'],
          {
            cwd: tempRepo,
            encoding: 'utf-8',
            env: { ...envClean, HOME: tempHome },
          },
        );

        // first run - key not set yet, keyrack set via stdin
        const first = runInit({
          home: tempHome,
          cwd: tempRepo,
          stdin: 'test-fixture-secret',
        });

        console.log('=== FIRST RUN ===');
        console.log('stdout:', first.stdout);
        console.log('stderr:', first.stderr);
        console.log('exit:', first.exitCode);
        console.log('tempHome after:\n' + treeDir(tempHome));

        expect(first.stdout).toContain('keyrack: init for owner ehmpath');
        expect(first.stdout).toContain('fill keys from keyrack.yml');
        expect(first.stdout).toContain('keyrack fill complete');
        expect(first.exitCode).toBe(0);

        // unlock to verify key was stored
        const unlockResult = spawnSync(
          './node_modules/.bin/rhachet',
          [
            'keyrack',
            'unlock',
            '--owner',
            'ehmpath',
            '--prikey',
            path.join(tempHome, '.ssh/ehmpath'),
            '--env',
            'all',
          ],
          {
            cwd: tempRepo,
            encoding: 'utf-8',
            env: { ...envClean, HOME: tempHome },
          },
        );
        console.log('=== UNLOCK ===');
        console.log('stdout:', unlockResult.stdout);
        console.log('stderr:', unlockResult.stderr);
        console.log('exit:', unlockResult.status);

        // get to verify key value
        const getResult = spawnSync(
          './node_modules/.bin/rhachet',
          [
            'keyrack',
            'get',
            '--owner',
            'ehmpath',
            '--key',
            'EHMPATHY_SEATURTLE_GITHUB_TOKEN',
            '--env',
            'all',
            '--allow-dangerous',
          ],
          {
            cwd: tempRepo,
            encoding: 'utf-8',
            env: { ...envClean, HOME: tempHome },
          },
        );
        console.log('=== GET ===');
        console.log('stdout:', getResult.stdout);
        console.log('stderr:', getResult.stderr);
        console.log('exit:', getResult.status);

        // relock to clear daemon cache before second run
        const relockResult = spawnSync(
          './node_modules/.bin/rhachet',
          ['keyrack', 'relock', '--owner', 'ehmpath'],
          {
            cwd: tempRepo,
            encoding: 'utf-8',
            env: { ...envClean, HOME: tempHome },
          },
        );
        console.log('=== RELOCK ===');
        console.log('stdout:', relockResult.stdout);
        console.log('stderr:', relockResult.stderr);
        console.log('exit:', relockResult.status);

        // second run - must detect key is already set (findsert idempotency)
        const second = runInit({ home: tempHome, cwd: tempRepo });

        console.log('=== SECOND RUN ===');
        console.log('stdout:', second.stdout);
        console.log('stderr:', second.stderr);
        console.log('exit:', second.exitCode);
        console.log('tempHome after:\n' + treeDir(tempHome));

        expect(second.stdout).toContain('found vaulted');
        expect(second.stdout).not.toContain('set the key');
        expect(second.exitCode).toBe(0);
      });
    });

    when('[t1] --refresh <key> is passed for a configured key', () => {
      then('it forces re-prompt for that key only', async () => {
        // clone fixtures
        const tempHome = genTempDir({
          slug: 'keyrack-home',
          clone: path.join(__dirname, '__test_assets__/keyrack-home'),
        });
        const tempRepo = genTempDir({
          slug: 'keyrack-repo',
          git: true,
          clone: path.join(__dirname, '__test_assets__/keyrack-repo'),
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
        });

        // clear daemon cache
        spawnSync(
          './node_modules/.bin/rhachet',
          ['keyrack', 'relock', '--owner', 'ehmpath'],
          {
            cwd: tempRepo,
            encoding: 'utf-8',
            env: { ...envClean, HOME: tempHome },
          },
        );

        // first run - configure key
        const first = runInit({
          home: tempHome,
          cwd: tempRepo,
          stdin: 'first-secret',
        });
        expect(first.exitCode).toBe(0);
        expect(first.stdout).toContain('fill keys from keyrack.yml');

        // relock before refresh
        spawnSync(
          './node_modules/.bin/rhachet',
          ['keyrack', 'relock', '--owner', 'ehmpath'],
          {
            cwd: tempRepo,
            encoding: 'utf-8',
            env: { ...envClean, HOME: tempHome },
          },
        );

        // refresh run - should force re-prompt
        const refresh = runInit({
          home: tempHome,
          cwd: tempRepo,
          stdin: 'refreshed-secret',
          extraArgs: ['--refresh', 'EHMPATHY_SEATURTLE_GITHUB_TOKEN'],
        });

        console.log('=== REFRESH RUN ===');
        console.log('stdout:', refresh.stdout);
        console.log('stderr:', refresh.stderr);
        console.log('exit:', refresh.exitCode);

        expect(refresh.stdout).toContain('fill keys from keyrack.yml');
        expect(refresh.exitCode).toBe(0);
      });
    });

    when('[t2] --refresh @all is passed', () => {
      then('it forces re-prompt for all keys', async () => {
        // clone fixtures
        const tempHome = genTempDir({
          slug: 'keyrack-home',
          clone: path.join(__dirname, '__test_assets__/keyrack-home'),
        });
        const tempRepo = genTempDir({
          slug: 'keyrack-repo',
          git: true,
          clone: path.join(__dirname, '__test_assets__/keyrack-repo'),
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
        });

        // clear daemon cache
        spawnSync(
          './node_modules/.bin/rhachet',
          ['keyrack', 'relock', '--owner', 'ehmpath'],
          {
            cwd: tempRepo,
            encoding: 'utf-8',
            env: { ...envClean, HOME: tempHome },
          },
        );

        // first run - configure key
        const first = runInit({
          home: tempHome,
          cwd: tempRepo,
          stdin: 'first-secret',
        });
        expect(first.exitCode).toBe(0);

        // relock before refresh
        spawnSync(
          './node_modules/.bin/rhachet',
          ['keyrack', 'relock', '--owner', 'ehmpath'],
          {
            cwd: tempRepo,
            encoding: 'utf-8',
            env: { ...envClean, HOME: tempHome },
          },
        );

        // refresh @all - should force re-prompt for all keys
        const refresh = runInit({
          home: tempHome,
          cwd: tempRepo,
          stdin: 'refreshed-secret',
          extraArgs: ['--refresh', '@all'],
        });

        console.log('=== REFRESH @all RUN ===');
        console.log('stdout:', refresh.stdout);
        console.log('stderr:', refresh.stderr);
        console.log('exit:', refresh.exitCode);

        expect(refresh.stdout).toContain('fill keys from keyrack.yml');
        expect(refresh.exitCode).toBe(0);
      });
    });
  });
});
