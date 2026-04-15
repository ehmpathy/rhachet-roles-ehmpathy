import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

import { asMaskedOutput } from './__test_utils__/asMaskedOutput';
import { createTempRepo } from './__test_utils__/createTempRepo';
import { runSkill } from './__test_utils__/runSkill';

describe('cicd.deflake detect', () => {
  given('[case1] requires --into argument', () => {
    const tempDir = createTempRepo();

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] detect subcommand is invoked without --into', () => {
      then('exits with code 2 and shows error', () => {
        const result = runSkill({ cwd: tempDir, subcommand: 'detect' });

        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('--into is required');
        expect(result.stdout).toMatchSnapshot();
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case2] positive path with --into', () => {
    const tempDir = createTempRepo();
    const fakeBinDir = path.join(tempDir, '.fakebin');

    beforeAll(() => {
      // create fake gh cli that returns empty workflow runs
      fs.mkdirSync(fakeBinDir, { recursive: true });
      fs.writeFileSync(
        path.join(fakeBinDir, 'gh'),
        `#!/bin/bash
if [[ "$1" == "auth" && "$2" == "status" ]]; then
  exit 0
fi
if [[ "$1" == "repo" && "$2" == "view" ]]; then
  echo '{"nameWithOwner":"test/repo"}'
  exit 0
fi
if [[ "$1" == "api" ]]; then
  # check if -q flag is used to extract .workflow_runs
  if [[ "$*" == *"-q"* ]]; then
    # return empty array (extracted result)
    echo '[]'
  else
    echo '{"workflow_runs":[]}'
  fi
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

    when('[t0] detect subcommand is invoked with valid --into', () => {
      then('scans and writes empty inventory', () => {
        const inventoryPath = path.join(tempDir, 'evidence.json');
        const result = runSkill({
          cwd: tempDir,
          subcommand: 'detect',
          args: ['--into', inventoryPath],
          env: { PATH: `${fakeBinDir}:${process.env.PATH}` },
        });

        expect(result.status).toEqual(0);
        expect(result.stderr).toMatchSnapshot();

        // verify inventory file was created
        expect(fs.existsSync(inventoryPath)).toBe(true);
        const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));
        expect(inventory.flakes).toEqual([]);
        expect(inventory.metadata.runs_analyzed).toBeDefined();

        // snapshot stdout (redact dynamic parts)
        expect(
          asMaskedOutput({ stdout: result.stdout, tempDir }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case3] gh auth failure', () => {
    const tempDir = createTempRepo();
    const fakeBinDir = path.join(tempDir, '.fakebin');

    beforeAll(() => {
      // create fake gh cli that fails auth check
      fs.mkdirSync(fakeBinDir, { recursive: true });
      fs.writeFileSync(
        path.join(fakeBinDir, 'gh'),
        `#!/bin/bash
if [[ "$1" == "auth" && "$2" == "status" ]]; then
  exit 1
fi
exit 0
`,
      );
      fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');
    });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] detect subcommand is invoked without auth', () => {
      then('exits with error and shows auth hint', () => {
        const inventoryPath = path.join(tempDir, 'evidence.json');
        const result = runSkill({
          cwd: tempDir,
          subcommand: 'detect',
          args: ['--into', inventoryPath],
          env: { PATH: `${fakeBinDir}:${process.env.PATH}` },
        });

        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('not authenticated');
        expect(result.stdout).toMatchSnapshot();
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case4] real GitHub API integration', () => {
    /**
     * .what = real integration test against GitHub API
     * .why = verifies external contract with real service (require.external-contract-integration-tests)
     * .note = requires gh cli to be authenticated; throws ConstraintError if not
     */
    const tempDir = createTempRepo();

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    // check auth once at given level for runIf condition
    const isGhAuthenticated = (() => {
      const authCheck = spawnSync('gh', ['auth', 'status'], {
        encoding: 'utf-8',
      });
      return authCheck.status === 0;
    })();

    when('[t0] detect is invoked against real GitHub API', () => {
      then.runIf(isGhAuthenticated)(
        'returns valid response shape from GitHub',
        () => {
          // verify we're in a repo with GitHub remote (use current repo)
          const repoRoot = spawnSync('git', ['rev-parse', '--show-toplevel'], {
            encoding: 'utf-8',
          }).stdout.trim();

          const inventoryPath = path.join(tempDir, 'evidence.json');
          const result = runSkill({
            cwd: repoRoot, // run in actual repo with GitHub remote
            subcommand: 'detect',
            args: ['--into', inventoryPath, '--days', '7'],
          });

          // verify response shape from GitHub API
          expect(result.status).toEqual(0);
          expect(result.stderr).toMatchSnapshot();

          // snapshot stdout with dynamic content redacted
          expect(
            asMaskedOutput({ stdout: result.stdout, tempDir }),
          ).toMatchSnapshot();

          expect(fs.existsSync(inventoryPath)).toBe(true);

          const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));

          // verify inventory has expected shape
          expect(inventory).toHaveProperty('flakes');
          expect(inventory).toHaveProperty('metadata');
          expect(Array.isArray(inventory.flakes)).toBe(true);
          expect(inventory.metadata).toHaveProperty('scanned_at');
          expect(inventory.metadata).toHaveProperty('days');
          expect(inventory.metadata).toHaveProperty('runs_analyzed');
          expect(inventory.metadata).toHaveProperty('retried_runs_found');
        },
      );
    });
  });

  given('[case5] --help shows detect subcommand help', () => {
    const tempDir = createTempRepo();

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] detect subcommand is invoked with --help', () => {
      then('shows detect-specific usage and options', () => {
        const result = runSkill({
          cwd: tempDir,
          subcommand: 'detect',
          args: ['--help'],
        });

        expect(result.status).toEqual(0);
        expect(result.stderr).toMatchSnapshot();
        expect(result.stdout).toContain('detect');
        expect(result.stdout).toContain('--into');
        expect(result.stdout).toContain('--days');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case6] invalid --days value', () => {
    /**
     * .what = edge case test for invalid --days argument
     * .why = verifies error output for non-numeric days value
     */
    const tempDir = createTempRepo();

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] detect is invoked with non-numeric --days', () => {
      then('exits with code 2 and shows error', () => {
        const inventoryPath = path.join(tempDir, 'evidence.json');
        const result = runSkill({
          cwd: tempDir,
          subcommand: 'detect',
          args: ['--into', inventoryPath, '--days', 'abc'],
        });

        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('must be');
        expect(result.stdout).toMatchSnapshot();
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case7] zero --days value', () => {
    /**
     * .what = edge case test for zero days
     * .why = verifies error output for boundary condition
     */
    const tempDir = createTempRepo();

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] detect is invoked with --days 0', () => {
      then('exits with code 2 and shows error', () => {
        const inventoryPath = path.join(tempDir, 'evidence.json');
        const result = runSkill({
          cwd: tempDir,
          subcommand: 'detect',
          args: ['--into', inventoryPath, '--days', '0'],
        });

        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('must be');
        expect(result.stdout).toMatchSnapshot();
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case8] positive path with flakes found', () => {
    /**
     * .what = test detect when flakes are found
     * .why = verifies output format with non-empty results (require.contract-snapshot-exhaustiveness)
     */
    const tempDir = createTempRepo();
    const fakeBinDir = path.join(tempDir, '.fakebin');

    beforeAll(() => {
      // create fake gh cli that returns workflow runs with flakes
      fs.mkdirSync(fakeBinDir, { recursive: true });
      fs.writeFileSync(
        path.join(fakeBinDir, 'gh'),
        `#!/bin/bash
if [[ "$1" == "auth" && "$2" == "status" ]]; then
  exit 0
fi
if [[ "$1" == "repo" && "$2" == "view" ]]; then
  echo '{"nameWithOwner":"test/repo"}'
  exit 0
fi
if [[ "$1" == "api" ]]; then
  # check what endpoint is called (logs must be checked before jobs since URL contains both)
  if [[ "$*" == *"/logs"* ]]; then
    echo 'FAIL src/example.test.ts'
    echo '  ✕ should work'
    echo '  Error: expect(true).toBe(false)'
    exit 0
  fi
  if [[ "$*" == *"/jobs"* ]]; then
    # gh api uses -q '.jobs' to extract the array (handles both /jobs and /attempts/1/jobs)
    if [[ "$*" == *"-q"* ]]; then
      echo '[{"id":2001,"conclusion":"failure"}]'
    else
      echo '{"jobs":[{"id":2001,"conclusion":"failure"}]}'
    fi
    exit 0
  fi
  if [[ "$*" == *"/actions/runs"* ]]; then
    # return workflow runs with run_attempt > 1 (indicates retry = flake signal)
    if [[ "$*" == *"-q"* ]]; then
      echo '[{"id":1001,"workflow_id":1,"head_sha":"abc123","head_branch":"main","run_attempt":2,"conclusion":"success","name":"test","created_at":"2026-01-01T00:00:00Z","html_url":"https://github.com/test/repo/actions/runs/1001"}]'
    else
      echo '{"workflow_runs":[{"id":1001,"workflow_id":1,"head_sha":"abc123","head_branch":"main","run_attempt":2,"conclusion":"success","name":"test","created_at":"2026-01-01T00:00:00Z","html_url":"https://github.com/test/repo/actions/runs/1001"}]}'
    fi
    exit 0
  fi
  # default
  echo '[]'
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

    when('[t0] detect finds flaky tests', () => {
      then('writes inventory with flakes and shows summary', () => {
        const inventoryPath = path.join(tempDir, 'evidence.json');
        const result = runSkill({
          cwd: tempDir,
          subcommand: 'detect',
          args: ['--into', inventoryPath],
          env: { PATH: `${fakeBinDir}:${process.env.PATH}` },
        });

        expect(result.status).toEqual(0);
        expect(result.stderr).toMatchSnapshot();

        // verify inventory has flakes
        expect(fs.existsSync(inventoryPath)).toBe(true);
        const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));
        expect(inventory.flakes.length).toBeGreaterThan(0);
        expect(inventory.metadata.retried_runs_found).toBeGreaterThan(0);

        // snapshot stdout (redact dynamic parts)
        expect(
          asMaskedOutput({ stdout: result.stdout, tempDir }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case9] negative --days value', () => {
    /**
     * .what = edge case test for negative days
     * .why = verifies error output for boundary condition
     */
    const tempDir = createTempRepo();

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] detect is invoked with --days -1', () => {
      then('exits with code 2 and shows error', () => {
        const inventoryPath = path.join(tempDir, 'evidence.json');
        const result = runSkill({
          cwd: tempDir,
          subcommand: 'detect',
          args: ['--into', inventoryPath, '--days', '-1'],
        });

        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('must be');
        expect(result.stdout).toMatchSnapshot();
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case10] gh api call failure', () => {
    /**
     * .what = test detect when gh api call fails
     * .why = verifies error path when API fails (not just auth)
     */
    const tempDir = createTempRepo();
    const fakeBinDir = path.join(tempDir, '.fakebin');

    beforeAll(() => {
      // create fake gh cli that passes auth but fails on api
      fs.mkdirSync(fakeBinDir, { recursive: true });
      fs.writeFileSync(
        path.join(fakeBinDir, 'gh'),
        `#!/bin/bash
if [[ "$1" == "auth" && "$2" == "status" ]]; then
  exit 0
fi
if [[ "$1" == "repo" && "$2" == "view" ]]; then
  echo '{"nameWithOwner":"test/repo"}'
  exit 0
fi
if [[ "$1" == "api" ]]; then
  echo '{"message":"API rate limit exceeded"}' >&2
  exit 1
fi
exit 0
`,
      );
      fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');
    });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] detect is invoked but API fails', () => {
      then('handles gracefully with empty results', () => {
        const inventoryPath = path.join(tempDir, 'evidence.json');
        const result = runSkill({
          cwd: tempDir,
          subcommand: 'detect',
          args: ['--into', inventoryPath],
          env: { PATH: `${fakeBinDir}:${process.env.PATH}` },
        });

        // detect handles api failures gracefully with empty results
        expect(result.status).toEqual(0);
        expect(result.stderr).toMatchSnapshot();

        // snapshot stdout (redact dynamic parts)
        expect(
          asMaskedOutput({ stdout: result.stdout, tempDir }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case11] not in git repo', () => {
    /**
     * .what = negative path test for detect outside git repo
     * .why = verifies error output matches init's git repo check
     */
    let nonGitDir: string;

    beforeAll(() => {
      // create temp dir that is NOT a git repo
      nonGitDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cicd-deflake-nogit-'));
    });

    afterAll(() => {
      fs.rmSync(nonGitDir, { recursive: true, force: true });
    });

    when('[t0] detect subcommand is invoked outside git repo', () => {
      then('exits with code 2 and shows error', () => {
        const inventoryPath = path.join(nonGitDir, 'evidence.json');
        const result = runSkill({
          cwd: nonGitDir,
          subcommand: 'detect',
          args: ['--into', inventoryPath],
        });

        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('not in a git repository');
        expect(result.stdout).toMatchSnapshot();
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case12] runs exist but no flakes', () => {
    /**
     * .what = test detect when runs exist but none are flaky
     * .why = covers "no flaky runs detected" output path (require.contract-snapshot-exhaustiveness)
     */
    const tempDir = createTempRepo();
    const fakeBinDir = path.join(tempDir, '.fakebin');

    beforeAll(() => {
      // create fake gh cli that returns workflow runs (all passing)
      fs.mkdirSync(fakeBinDir, { recursive: true });
      fs.writeFileSync(
        path.join(fakeBinDir, 'gh'),
        `#!/bin/bash
if [[ "$1" == "auth" && "$2" == "status" ]]; then
  exit 0
fi
if [[ "$1" == "repo" && "$2" == "view" ]]; then
  echo '{"nameWithOwner":"test/repo"}'
  exit 0
fi
if [[ "$1" == "api" ]]; then
  if [[ "$*" == *"/actions/runs"* ]]; then
    # return workflow runs - all passing (no flake pattern)
    if [[ "$*" == *"-q"* ]]; then
      echo '[{"id":1001,"workflow_id":1,"head_sha":"abc123","conclusion":"success","name":"test","created_at":"2026-01-01T00:00:00Z","html_url":"https://github.com/test/repo/actions/runs/1001"},{"id":1002,"workflow_id":1,"head_sha":"def456","conclusion":"success","name":"test","created_at":"2026-01-01T01:00:00Z","html_url":"https://github.com/test/repo/actions/runs/1002"}]'
    else
      echo '{"workflow_runs":[{"id":1001,"workflow_id":1,"head_sha":"abc123","conclusion":"success","name":"test","created_at":"2026-01-01T00:00:00Z","html_url":"https://github.com/test/repo/actions/runs/1001"},{"id":1002,"workflow_id":1,"head_sha":"def456","conclusion":"success","name":"test","created_at":"2026-01-01T01:00:00Z","html_url":"https://github.com/test/repo/actions/runs/1002"}]}'
    fi
    exit 0
  fi
  echo '[]'
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

    when('[t0] detect finds runs but no flakes', () => {
      then('writes empty inventory and shows analyzed count', () => {
        const inventoryPath = path.join(tempDir, 'evidence.json');
        const result = runSkill({
          cwd: tempDir,
          subcommand: 'detect',
          args: ['--into', inventoryPath],
          env: { PATH: `${fakeBinDir}:${process.env.PATH}` },
        });

        expect(result.status).toEqual(0);
        expect(result.stderr).toMatchSnapshot();

        // snapshot stdout (redact dynamic parts)
        expect(
          asMaskedOutput({ stdout: result.stdout, tempDir }),
        ).toMatchSnapshot();

        // verify inventory is empty but with metadata
        expect(fs.existsSync(inventoryPath)).toBe(true);
        const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));
        expect(inventory.flakes).toEqual([]);
        expect(inventory.metadata.runs_analyzed).toBeGreaterThan(0);
      });
    });
  });

  given('[case13] invalid --into path (directory)', () => {
    /**
     * .what = test detect when --into points to a directory instead of file
     * .why = covers error output for invalid destination path
     */
    const tempDir = createTempRepo();
    const fakeBinDir = path.join(tempDir, '.fakebin');

    beforeAll(() => {
      // create fake gh cli that passes auth
      fs.mkdirSync(fakeBinDir, { recursive: true });
      fs.writeFileSync(
        path.join(fakeBinDir, 'gh'),
        `#!/bin/bash
if [[ "$1" == "auth" && "$2" == "status" ]]; then
  exit 0
fi
if [[ "$1" == "repo" && "$2" == "view" ]]; then
  echo '{"nameWithOwner":"test/repo"}'
  exit 0
fi
exit 1
`,
      );
      fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

      // create a directory where the inventory should go
      fs.mkdirSync(path.join(tempDir, 'evidence-dir'), { recursive: true });
    });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] detect --into points to directory', () => {
      then('exits with error about invalid path', () => {
        const result = runSkill({
          cwd: tempDir,
          subcommand: 'detect',
          args: ['--into', path.join(tempDir, 'evidence-dir')],
          env: { PATH: `${fakeBinDir}:${process.env.PATH}` },
        });

        // should fail because --into is a directory
        expect(result.status).not.toEqual(0);
        expect(
          asMaskedOutput({ stdout: result.stderr, tempDir }),
        ).toMatchSnapshot();
        expect(
          asMaskedOutput({ stdout: result.stdout, tempDir }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case14] gh repo view fails', () => {
    /**
     * .what = test detect when gh repo view command fails
     * .why = covers error output when repo detection fails
     */
    const tempDir = createTempRepo();
    const fakeBinDir = path.join(tempDir, '.fakebin');

    beforeAll(() => {
      // create fake gh cli where repo view fails
      fs.mkdirSync(fakeBinDir, { recursive: true });
      fs.writeFileSync(
        path.join(fakeBinDir, 'gh'),
        `#!/bin/bash
if [[ "$1" == "auth" && "$2" == "status" ]]; then
  exit 0
fi
if [[ "$1" == "repo" && "$2" == "view" ]]; then
  echo "error: could not determine repository" >&2
  exit 1
fi
exit 1
`,
      );
      fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');
    });

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] detect is invoked and repo view fails', () => {
      then('exits with error about repo detection', () => {
        const inventoryPath = path.join(tempDir, 'evidence.json');
        const result = runSkill({
          cwd: tempDir,
          subcommand: 'detect',
          args: ['--into', inventoryPath],
          env: { PATH: `${fakeBinDir}:${process.env.PATH}` },
        });

        expect(result.status).not.toEqual(0);
        expect(
          asMaskedOutput({ stdout: result.stderr, tempDir }),
        ).toMatchSnapshot();
        expect(
          asMaskedOutput({ stdout: result.stdout, tempDir }),
        ).toMatchSnapshot();
      });
    });
  });
});
