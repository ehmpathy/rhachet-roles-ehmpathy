import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { given, then, when } from 'test-fns';

import { createTempRepo } from './__test_utils__/createTempRepo';
import { runSkill, SKILL_PATH } from './__test_utils__/runSkill';

describe('cicd.deflake exhume', () => {
  given('[case1] requires --run argument', () => {
    /**
     * .what = test exhume without --run
     * .why = verifies error output for required argument
     */
    const tempDir = createTempRepo();

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] exhume is invoked without --run', () => {
      then('exits with code 2 and shows error', () => {
        const result = runSkill({
          cwd: tempDir,
          subcommand: 'exhume',
          args: ['--attempt', '1'],
        });

        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('--run is required');
        expect(result.stdout).toMatchSnapshot();
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case2] requires --attempt argument', () => {
    /**
     * .what = test exhume without --attempt
     * .why = verifies error output for required argument
     */
    const tempDir = createTempRepo();

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] exhume is invoked without --attempt', () => {
      then('exits with code 2 and shows error with note about attempts', () => {
        const result = runSkill({
          cwd: tempDir,
          subcommand: 'exhume',
          args: ['--run', '12345'],
        });

        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('--attempt is required');
        expect(result.stdout).toContain(
          'each attempt must be fetched explicitly',
        );
        expect(result.stdout).toMatchSnapshot();
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case3] invalid --run value', () => {
    /**
     * .what = test exhume with non-numeric run id
     * .why = verifies error output for invalid argument
     */
    const tempDir = createTempRepo();

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] exhume is invoked with non-numeric --run', () => {
      then('exits with code 2 and shows error', () => {
        const result = runSkill({
          cwd: tempDir,
          subcommand: 'exhume',
          args: ['--run', 'abc', '--attempt', '1'],
        });

        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('must be a numeric');
        expect(result.stdout).toMatchSnapshot();
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case4] shows help', () => {
    /**
     * .what = test exhume help output
     * .why = verifies help displays required args
     */
    const tempDir = createTempRepo();

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] exhume --help is invoked', () => {
      then('shows usage with required --run and --attempt', () => {
        const result = runSkill({
          cwd: tempDir,
          subcommand: 'exhume',
          args: ['--help'],
        });

        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('--run');
        expect(result.stdout).toContain('--attempt');
        expect(result.stdout).toContain('required');
        expect(result.stdout).toMatchSnapshot();
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case5] positive path with mocked gh', () => {
    /**
     * .what = test exhume with successful log fetch
     * .why = verifies output format and cache file creation
     */
    const tempDir = createTempRepo();
    const fakeBinDir = path.join(tempDir, '.fakebin');

    beforeAll(() => {
      // create fake gh cli that returns logs
      fs.mkdirSync(fakeBinDir, { recursive: true });
      fs.writeFileSync(
        path.join(fakeBinDir, 'gh'),
        `#!/bin/bash
if [[ "$1" == "auth" && "$2" == "status" ]]; then
  exit 0
fi
if [[ "$1" == "run" && "$2" == "view" ]]; then
  echo "test	Run test-workflow"
  echo "  ✕ test should pass"
  echo "  Error: expected true to be false"
  echo ""
  echo "FAIL src/example.test.ts (5.123s)"
  exit 0
fi
exit 1
`,
      );
      fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');
    });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] exhume is invoked with valid args', () => {
      then('caches logs and outputs file path', () => {
        const result = spawnSync(
          'bash',
          [SKILL_PATH, 'exhume', '--run', '12345', '--attempt', '1'],
          {
            cwd: tempDir,
            encoding: 'utf-8',
            env: {
              ...process.env,
              SKIP_ROUTE_BIND: '1',
              PATH: `${fakeBinDir}:${process.env.PATH}`,
            },
          },
        );

        expect(result.status).toEqual(0);
        expect(result.stderr).toMatchSnapshot();

        // check stdout contains turtle vibes and file reference
        expect(result.stdout).toContain('🐢');
        expect(result.stdout).toContain('cicd.deflake exhume');
        expect(result.stdout).toContain('run: 12345');
        expect(result.stdout).toContain('attempt: 1');
        expect(result.stdout).toContain('cached');
        expect(result.stdout).toContain('.cache/');
        expect(result.stdout).toContain('wreck exhumed');
        expect(result.stdout).toMatchSnapshot();

        // check cache file exists
        const cacheFile = path.join(
          tempDir,
          '.cache/repo=ehmpathy/role=mechanic/skill=cicd.deflake.exhume/run=12345.attempt=1.log',
        );
        expect(fs.existsSync(cacheFile)).toBe(true);

        // check cache file has content
        const cacheContent = fs.readFileSync(cacheFile, 'utf-8');
        expect(cacheContent).toContain('FAIL');
        expect(cacheContent).toContain('example.test.ts');
      });
    });
  });
});
