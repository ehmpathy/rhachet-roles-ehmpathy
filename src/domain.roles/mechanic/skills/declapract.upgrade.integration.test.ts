import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

const SKILL_PATH = path.join(__dirname, 'declapract.upgrade.sh');

/**
 * .what = create a temp directory with git repo
 */
const createTempRepo = (options: { hasDeclapractConfig: boolean }): string => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'declapract-upgrade-test-'),
  );

  // init git repo with initial commit (HEAD must exist)
  spawnSync('git', ['init'], { cwd: tempDir });
  configureTestGitUser({ cwd: tempDir });
  fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
  spawnSync('git', ['add', '.gitkeep'], { cwd: tempDir });
  spawnSync('git', ['commit', '-m', 'init'], { cwd: tempDir });

  // create declapract.use.yml if requested
  if (options.hasDeclapractConfig) {
    fs.writeFileSync(
      path.join(tempDir, 'declapract.use.yml'),
      'declared:\n  - package: declapract-typescript-ehmpathy\n',
    );
  }

  return tempDir;
};

/**
 * .what = run the declapract.upgrade skill with subcommand
 */
const runSkill = (options: {
  cwd: string;
  subcommand?: string;
  args?: string[];
  env?: Record<string, string>;
}): { stdout: string; stderr: string; status: number | null } => {
  const allArgs = options.subcommand
    ? [options.subcommand, ...(options.args ?? [])]
    : (options.args ?? []);

  const result = spawnSync('bash', [SKILL_PATH, ...allArgs], {
    cwd: options.cwd,
    encoding: 'utf-8',
    env: {
      ...process.env,
      SKIP_ROUTE_BIND: '1', // skip route.bind.set (no rhachet in temp dir)
      SKIP_PNPM_CHECK: '1', // skip pnpm check (CI may not have pnpm in PATH)
      ...options.env,
    },
  });

  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
};

describe('declapract.upgrade', () => {
  given('[case1] init: repo with declapract.use.yml', () => {
    const tempDir = createTempRepo({ hasDeclapractConfig: true });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] init subcommand is invoked', () => {
      then('route directory is created with stones and guards (no .sh)', () => {
        const result = runSkill({ cwd: tempDir, subcommand: 'init' });

        // check exit code
        expect(result.status).toEqual(0);

        // check stdout contains turtle vibes
        expect(result.stdout).toContain('🐢 radical!');
        expect(result.stdout).toContain('🐚 declapract.upgrade init');
        expect(result.stdout).toContain('🥥 hang ten!');

        // snapshot stdout for aesthetic verification (redact date for stability)
        const stdoutStable = result.stdout.replace(
          /v\d{4}_\d{2}_\d{2}\.declapract\.upgrade/g,
          'v$DATE.declapract.upgrade',
        );
        expect(stdoutStable).toMatchSnapshot();

        // check route directory exists
        const routeDirs = fs.readdirSync(path.join(tempDir, '.route'));
        expect(routeDirs.length).toBeGreaterThan(0);
        const routeDir = routeDirs.find((d) =>
          d.includes('declapract.upgrade'),
        );
        expect(routeDir).toBeDefined();

        const routePath = path.join(tempDir, '.route', routeDir!);

        // check all files exist
        const files = fs.readdirSync(routePath);

        // stones and guards should exist
        expect(files).toContain('1.upgrade.invoke.stone');
        expect(files).toContain('2.detect.hazards.stone');
        expect(files).toContain('2.detect.hazards.guard');
        expect(files).toContain('3.1.repair.test.defects.stone');
        expect(files).toContain('3.1.repair.test.defects.guard');
        expect(files).toContain('3.2.reflect.test.defects.stone');
        expect(files).toContain('3.2.reflect.test.defects.guard');
        expect(files).toContain('3.3.repair.cicd.defects.stone');
        expect(files).toContain('3.3.repair.cicd.defects.guard');
        expect(files).toContain('3.4.reflect.cicd.defects.stone');
        expect(files).toContain('3.4.reflect.cicd.defects.guard');

        // NO .sh files should exist (key change!)
        const shFiles = files.filter((f) => f.endsWith('.sh'));
        expect(shFiles).toHaveLength(0);
      });
    });
  });

  given('[case2] init: repo without declapract.use.yml', () => {
    const tempDir = createTempRepo({ hasDeclapractConfig: false });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] init subcommand is invoked', () => {
      then('exits with code 2 and shows error', () => {
        const result = runSkill({ cwd: tempDir, subcommand: 'init' });

        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('not a declapract repo');
      });
    });
  });

  given('[case3] exec: repo with declapract.use.yml', () => {
    const tempDir = createTempRepo({ hasDeclapractConfig: true });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when(
      '[t0] exec subcommand is invoked (skip actual upgrade via env)',
      () => {
        then('starts upgrade flow', () => {
          // note: actual upgrade would fail in test env (no fnm, no declapract)
          // we just verify prereq checks pass and output starts
          const result = runSkill({
            cwd: tempDir,
            subcommand: 'exec',
            env: {
              SKIP_PNPM_CHECK: '1',
            },
          });

          // should see upgrade start message (will fail at fnm use)
          expect(result.stdout).toContain('upgrade time');
        });
      },
    );
  });

  given('[case4] exec: repo without declapract.use.yml', () => {
    const tempDir = createTempRepo({ hasDeclapractConfig: false });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] exec subcommand is invoked', () => {
      then('exits with code 2 and shows error', () => {
        const result = runSkill({ cwd: tempDir, subcommand: 'exec' });

        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('not a declapract repo');
      });
    });
  });

  given('[case5] exec: pnpm not on PATH', () => {
    const tempDir = createTempRepo({ hasDeclapractConfig: true });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] exec subcommand is invoked without pnpm', () => {
      then('exits with code 2 and shows error', () => {
        // remove pnpm from PATH by set empty PATH with only essential binaries
        const result = runSkill({
          cwd: tempDir,
          subcommand: 'exec',
          env: {
            PATH: '/usr/bin:/bin', // minimal PATH without pnpm
            SKIP_PNPM_CHECK: '', // ensure pnpm check runs for this test
          },
        });

        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('pnpm not found');
      });
    });
  });

  given('[case6] init: route already exists (idempotency)', () => {
    const tempDir = createTempRepo({ hasDeclapractConfig: true });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] init subcommand is invoked twice', () => {
      then('findsert semantics - no duplicate, same route reused', () => {
        // first invocation
        const result1 = runSkill({ cwd: tempDir, subcommand: 'init' });
        expect(result1.status).toEqual(0);

        // count routes before second invocation
        const routesBefore = fs.readdirSync(path.join(tempDir, '.route'));

        // second invocation
        const result2 = runSkill({ cwd: tempDir, subcommand: 'init' });
        expect(result2.status).toEqual(0);

        // count routes after second invocation
        const routesAfter = fs.readdirSync(path.join(tempDir, '.route'));

        // same number of routes (no duplicate created)
        expect(routesAfter.length).toEqual(routesBefore.length);
      });
    });
  });

  given('[case7] exec: works standalone (no init required)', () => {
    const tempDir = createTempRepo({ hasDeclapractConfig: true });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] exec subcommand is invoked without prior init', () => {
      then('upgrade starts without route', () => {
        // verify no .route exists
        expect(fs.existsSync(path.join(tempDir, '.route'))).toBe(false);

        // invoke exec
        const result = runSkill({
          cwd: tempDir,
          subcommand: 'exec',
          env: {
            SKIP_PNPM_CHECK: '1',
          },
        });

        // should start upgrade (will fail at fnm, but that's ok)
        expect(result.stdout).toContain('upgrade time');

        // route should still not exist (exec doesn't create route)
        expect(fs.existsSync(path.join(tempDir, '.route'))).toBe(false);
      });
    });
  });

  given('[case8] invalid subcommand', () => {
    const tempDir = createTempRepo({ hasDeclapractConfig: true });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] invalid subcommand is provided', () => {
      then('exits with code 1 and shows error', () => {
        const result = runSkill({ cwd: tempDir, subcommand: 'foo' });

        expect(result.status).toEqual(1);
        expect(result.stdout).toContain('unknown subcommand');
        expect(result.stdout).toContain('foo');
      });
    });
  });

  given('[case9] no subcommand provided', () => {
    const tempDir = createTempRepo({ hasDeclapractConfig: true });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] no subcommand is provided', () => {
      then('exits with code 1 and shows usage', () => {
        const result = runSkill({ cwd: tempDir });

        expect(result.status).toEqual(1);
        expect(result.stdout).toContain('no subcommand specified');
        expect(result.stdout).toContain('init, exec');
      });
    });
  });
});
