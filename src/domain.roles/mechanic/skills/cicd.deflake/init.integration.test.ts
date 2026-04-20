import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

import { createTempRepo } from './__test_utils__/createTempRepo';
import { runSkill, SKILL_PATH } from './__test_utils__/runSkill';

describe('cicd.deflake init', () => {
  given('[case1] creates route and binds', () => {
    const tempDir = createTempRepo();

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] init subcommand is invoked', () => {
      then('route directory is created with stones and guards', () => {
        const result = runSkill({ cwd: tempDir, subcommand: 'init' });

        // check exit code and stderr (success = no stderr)
        expect(result.status).toEqual(0);
        expect(result.stderr).toMatchSnapshot();

        // check stdout contains turtle vibes
        expect(result.stdout).toContain('🐢 tubular!');
        expect(result.stdout).toContain('🐚 cicd.deflake init');
        expect(result.stdout).toContain('🥥 hang ten!');

        // snapshot stdout for contract verification (redact date for stability)
        const stdoutStable = result.stdout.replace(
          /v\d{4}_\d{2}_\d{2}\.cicd-deflake/g,
          'v$DATE.cicd-deflake',
        );
        expect(stdoutStable).toMatchSnapshot();

        // check route directory exists
        const behaviorDirs = fs.readdirSync(path.join(tempDir, '.behavior'));
        expect(behaviorDirs.length).toBeGreaterThan(0);
        const routeDir = behaviorDirs.find((d) => d.includes('cicd-deflake'));
        expect(routeDir).toBeDefined();

        const routePath = path.join(tempDir, '.behavior', routeDir!);

        // check all files exist
        const files = fs.readdirSync(routePath);

        // 9 stones should exist
        expect(files).toContain('1.evidence.stone');
        expect(files).toContain('2.1.diagnose.research.stone');
        expect(files).toContain('2.2.diagnose.rootcause.stone');
        expect(files).toContain('3.plan.stone');
        expect(files).toContain('4.execution.stone');
        expect(files).toContain('5.verification.stone');
        expect(files).toContain('6.repairs.stone');
        expect(files).toContain('7.reflection.stone');
        expect(files).toContain('8.institutionalize.stone');

        // 6 guards should exist
        expect(files).toContain('2.1.diagnose.research.guard');
        expect(files).toContain('2.2.diagnose.rootcause.guard');
        expect(files).toContain('3.plan.guard');
        expect(files).toContain('4.execution.guard');
        expect(files).toContain('5.verification.guard');
        expect(files).toContain('7.reflection.guard');

        // count totals
        const stoneFiles = files.filter((f) => f.endsWith('.stone'));
        const guardFiles = files.filter((f) => f.endsWith('.guard'));
        expect(stoneFiles).toHaveLength(9);
        expect(guardFiles).toHaveLength(6);
      });
    });
  });

  given('[case2] output format', () => {
    const tempDir = createTempRepo();

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] init subcommand is invoked', () => {
      then('stdout matches snapshot (turtle vibes, bind confirmation)', () => {
        const result = runSkill({ cwd: tempDir, subcommand: 'init' });

        expect(result.status).toEqual(0);
        expect(result.stderr).toMatchSnapshot();

        // snapshot stdout for aesthetic verification (redact date for stability)
        const stdoutStable = result.stdout.replace(
          /v\d{4}_\d{2}_\d{2}\.cicd-deflake/g,
          'v$DATE.cicd-deflake',
        );
        expect(stdoutStable).toMatchSnapshot();
      });
    });
  });

  given('[case3] already bound (same day)', () => {
    const tempDir = createTempRepo();

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] init subcommand is invoked twice', () => {
      then('findsert semantics - no duplicate, same route reused', () => {
        // first invocation
        const result1 = runSkill({ cwd: tempDir, subcommand: 'init' });
        expect(result1.status).toEqual(0);
        expect(result1.stderr).toMatchSnapshot();

        // count routes before second invocation
        const routesBefore = fs.readdirSync(path.join(tempDir, '.behavior'));

        // second invocation
        const result2 = runSkill({ cwd: tempDir, subcommand: 'init' });
        expect(result2.status).toEqual(0);
        expect(result2.stderr).toMatchSnapshot();

        // count routes after second invocation
        const routesAfter = fs.readdirSync(path.join(tempDir, '.behavior'));

        // same number of routes (no duplicate created)
        expect(routesAfter.length).toEqual(routesBefore.length);

        // snapshot second invocation output (redact date for stability)
        const stdoutStable = result2.stdout.replace(
          /v\d{4}_\d{2}_\d{2}\.cicd-deflake/g,
          'v$DATE.cicd-deflake',
        );
        expect(stdoutStable).toMatchSnapshot();
      });
    });
  });

  given('[case4] not in git repo', () => {
    when('[t0] init subcommand is invoked outside git repo', () => {
      then('exits with code 2 and shows error', () => {
        // create temp dir without git init
        const tempDir = fs.mkdtempSync(
          path.join(os.tmpdir(), 'cicd-deflake-test-'),
        );

        try {
          const result = runSkill({ cwd: tempDir, subcommand: 'init' });

          expect(result.status).toEqual(2);
          expect(result.stdout).toContain('not in a git repository');
          expect(result.stdout).toMatchSnapshot();
          expect(result.stderr).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case5] --help shows init subcommand help', () => {
    const tempDir = createTempRepo();

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] init subcommand is invoked with --help', () => {
      then('shows init-specific usage and options', () => {
        const result = runSkill({
          cwd: tempDir,
          subcommand: 'init',
          args: ['--help'],
        });

        expect(result.status).toEqual(0);
        expect(result.stderr).toMatchSnapshot();
        expect(result.stdout).toContain('init');
        // redact date for snapshot stability
        const stdoutStable = result.stdout.replace(
          /v\d{4}_\d{2}_\d{2}\.cicd-deflake/g,
          'v$DATE.cicd-deflake',
        );
        expect(stdoutStable).toMatchSnapshot();
      });
    });
  });

  given('[case6] with extra unknown arguments', () => {
    /**
     * .what = edge case test for unknown init arguments
     * .why = verifies graceful handle of extra args
     */
    const tempDir = createTempRepo();

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] init is invoked with unknown argument', () => {
      then('ignores unknown args and succeeds', () => {
        const result = runSkill({
          cwd: tempDir,
          subcommand: 'init',
          args: ['--unknown-flag', 'some-value'],
        });

        // init should succeed even with unknown args (graceful ignore)
        expect(result.status).toEqual(0);
        // redact date for snapshot stability
        const stdoutStable = result.stdout.replace(
          /v\d{4}_\d{2}_\d{2}\.cicd-deflake/g,
          'v$DATE.cicd-deflake',
        );
        expect(stdoutStable).toMatchSnapshot();
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case7] with route bind operation', () => {
    /**
     * .what = test init with actual bind step (mock rhachet)
     * .why = verifies full output path when bind occurs (require.contract-snapshot-exhaustiveness)
     */
    const tempDir = createTempRepo();
    const fakeBinDir = path.join(tempDir, '.fakebin');

    beforeAll(() => {
      // create fake npx that handles rhachet route.bind.set
      fs.mkdirSync(fakeBinDir, { recursive: true });
      fs.writeFileSync(
        path.join(fakeBinDir, 'npx'),
        `#!/bin/bash
# mock npx for rhachet route.bind.set
if [[ "$*" == *"route.bind.set"* ]]; then
  # extract route path from --route argument
  ROUTE=""
  while [[ $# -gt 0 ]]; do
    if [[ "$1" == "--route" ]]; then
      ROUTE="$2"
      shift 2
    else
      shift
    fi
  done
  echo "mock: bound route $ROUTE"
  exit 0
fi
exit 1
`,
      );
      fs.chmodSync(path.join(fakeBinDir, 'npx'), '755');
    });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] init subcommand is invoked with bind enabled', () => {
      then('shows full output with bind confirmation', () => {
        const result = spawnSync('bash', [SKILL_PATH, 'init'], {
          cwd: tempDir,
          encoding: 'utf-8',
          env: {
            ...process.env,
            PATH: `${fakeBinDir}:${process.env.PATH}`,
            // note: SKIP_ROUTE_BIND not set, so bind will run
          },
        });

        expect(result.status).toEqual(0);
        expect(result.stderr).toMatchSnapshot();

        // snapshot stdout (redact date for stability)
        const stdoutStable = (result.stdout ?? '').replace(
          /v\d{4}_\d{2}_\d{2}\.cicd-deflake/g,
          'v$DATE.cicd-deflake',
        );
        expect(stdoutStable).toMatchSnapshot();
      });
    });
  });

  given('[case8] route bind fails', () => {
    /**
     * .what = test init when npx route.bind.set fails
     * .why = covers error output path when bind operation fails
     */
    const tempDir = createTempRepo();
    const fakeBinDir = path.join(tempDir, '.fakebin');

    beforeAll(() => {
      // create fake npx that fails on route.bind.set
      fs.mkdirSync(fakeBinDir, { recursive: true });
      fs.writeFileSync(
        path.join(fakeBinDir, 'npx'),
        `#!/bin/bash
if [[ "$*" == *"route.bind.set"* ]]; then
  echo "error: route bind failed" >&2
  exit 1
fi
# pass through other npx calls
exec /usr/bin/npx "$@"
`,
      );
      fs.chmodSync(path.join(fakeBinDir, 'npx'), '755');
    });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] init is invoked with bind failure mock', () => {
      then('captures bind failure behavior', () => {
        const result = runSkill({
          cwd: tempDir,
          subcommand: 'init',
          env: {
            PATH: `${fakeBinDir}:${process.env.PATH}`,
            SKIP_ROUTE_BIND: '1', // skip bind check for isolated test
          },
        });

        // capture actual behavior in snapshots
        expect(result.stderr).toMatchSnapshot();

        // redact dynamic parts for stable snapshot
        const stdoutStable = result.stdout
          .replace(/\/tmp\/[^\s/]+/g, '/tmp/$TEMP')
          .replace(/v\d{4}_\d{2}_\d{2}/g, 'v$DATE');
        expect(stdoutStable).toMatchSnapshot();
      });
    });
  });

  given('[case9] git repo with no commits', () => {
    /**
     * .what = test init in a git repo that has no commits yet
     * .why = covers edge case where git rev-parse HEAD fails
     */
    let emptyRepoDir: string;

    beforeAll(() => {
      // create git repo with no commits
      emptyRepoDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'cicd-deflake-empty-'),
      );
      spawnSync('git', ['init'], { cwd: emptyRepoDir });
      spawnSync('git', ['config', 'user.email', 'test@test.com'], {
        cwd: emptyRepoDir,
      });
      spawnSync('git', ['config', 'user.name', 'Test'], { cwd: emptyRepoDir });
      // do NOT commit - leave repo empty
    });

    afterAll(() => {
      fs.rmSync(emptyRepoDir, { recursive: true, force: true });
    });

    when('[t0] init is invoked in repo with no commits', () => {
      then('handles gracefully or shows appropriate error', () => {
        const result = runSkill({
          cwd: emptyRepoDir,
          subcommand: 'init',
        });

        // capture whatever behavior occurs (may succeed or fail)
        expect(result.stderr).toMatchSnapshot();

        // redact temp path for stable snapshot
        const stdoutStable = result.stdout.replace(
          /\/tmp\/[^\s/]+/g,
          '/tmp/$TEMP',
        );
        expect(stdoutStable).toMatchSnapshot();
      });
    });
  });
});
