import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

const SKILL_PATH = path.join(__dirname, 'init.declapract.upgrade.sh');

/**
 * .what = create a temp directory with git repo
 */
const createTempRepo = (options: { hasDeclapractConfig: boolean }): string => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'init-declapract-upgrade-test-'),
  );

  // init git repo with initial commit (HEAD must exist)
  spawnSync('git', ['init'], { cwd: tempDir });
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: tempDir });
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: tempDir });
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
 * .what = run the init.declapract.upgrade skill
 */
const runSkill = (options: {
  cwd: string;
  args?: string[];
  env?: Record<string, string>;
}): { stdout: string; stderr: string; status: number | null } => {
  const result = spawnSync('bash', [SKILL_PATH, ...(options.args ?? [])], {
    cwd: options.cwd,
    encoding: 'utf-8',
    env: {
      ...process.env,
      SKIP_ROUTE_BIND: '1', // skip route.bind.set (no rhachet in temp dir)
      ...options.env,
    },
  });

  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
};

describe('init.declapract.upgrade', () => {
  given('[case1] repo with declapract.use.yml', () => {
    const tempDir = createTempRepo({ hasDeclapractConfig: true });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] skill is invoked', () => {
      then('route directory is created with all files present', () => {
        const result = runSkill({ cwd: tempDir });

        // check exit code
        expect(result.status).toEqual(0);

        // check stdout contains turtle vibes
        expect(result.stdout).toContain('🐢 radical!');
        expect(result.stdout).toContain('🐚 init.declapract.upgrade');
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
        expect(files).toContain('1.upgrade.invoke.sh');
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

        // check 1.upgrade.invoke.sh has chmod 555
        const shStat = fs.statSync(path.join(routePath, '1.upgrade.invoke.sh'));
        const mode = (shStat.mode & 0o777).toString(8);
        expect(mode).toEqual('555');
      });
    });
  });

  given('[case2] repo without declapract.use.yml', () => {
    const tempDir = createTempRepo({ hasDeclapractConfig: false });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] skill is invoked', () => {
      then('exits with code 2 and shows error', () => {
        const result = runSkill({ cwd: tempDir });

        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('not a declapract repo');
      });
    });
  });

  given('[case3] pnpm not on PATH', () => {
    const tempDir = createTempRepo({ hasDeclapractConfig: true });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] skill is invoked without pnpm', () => {
      then('exits with code 2 and shows error', () => {
        // remove pnpm from PATH by set empty PATH with only essential binaries
        const result = runSkill({
          cwd: tempDir,
          env: {
            PATH: '/usr/bin:/bin', // minimal PATH without pnpm
          },
        });

        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('pnpm not found');
      });
    });
  });

  given('[case4] route already exists', () => {
    const tempDir = createTempRepo({ hasDeclapractConfig: true });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] skill is invoked twice', () => {
      then('findsert semantics - no duplicate, same route reused', () => {
        // first invocation
        const result1 = runSkill({ cwd: tempDir });
        expect(result1.status).toEqual(0);

        // count routes before second invocation
        const routesBefore = fs.readdirSync(path.join(tempDir, '.route'));

        // second invocation
        const result2 = runSkill({ cwd: tempDir });
        expect(result2.status).toEqual(0);

        // count routes after second invocation
        const routesAfter = fs.readdirSync(path.join(tempDir, '.route'));

        // same number of routes (no duplicate created)
        expect(routesAfter.length).toEqual(routesBefore.length);
      });
    });
  });
});
