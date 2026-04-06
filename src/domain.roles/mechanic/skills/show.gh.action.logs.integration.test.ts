import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

/**
 * .what = integration tests for show.gh.action.logs.sh
 * .why = verify log fetch handles github api delays and error responses
 */
describe('show.gh.action.logs.sh', () => {
  const scriptPath = path.join(__dirname, 'show.gh.action.logs.sh');

  /**
   * .what = helper to set up a temp git repo with mocked gh cli
   * .why = reduces boilerplate and enables gh api response simulation
   */
  const setupTempRepo = (args: { branch?: string; ghMock: string }): string => {
    const tempDir = genTempDir({
      slug: 'show-gh-action-logs-test',
      git: true,
    });

    // configure git user
    configureTestGitUser({ cwd: tempDir });

    // create branch if specified
    if (args.branch) {
      spawnSync('git', ['checkout', '-b', args.branch], { cwd: tempDir });
    }

    // create fake bin dir with gh mock
    const fakeBinDir = path.join(tempDir, '.fakebin');
    fs.mkdirSync(fakeBinDir, { recursive: true });
    fs.writeFileSync(path.join(fakeBinDir, 'gh'), args.ghMock);
    fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

    return tempDir;
  };

  /**
   * .what = run show.gh.action.logs in the given temp dir with mocked gh
   * .why = consistent invocation across test cases
   */
  const runScript = (args: {
    tempDir: string;
    scriptArgs: string[];
  }): { stdout: string; stderr: string; exitCode: number } => {
    const fakeBinDir = path.join(args.tempDir, '.fakebin');

    // note: BufferEncoding is a TypeScript type name, not a gerund
    const result = spawnSync('bash', [scriptPath, ...args.scriptArgs], {
      cwd: args.tempDir,
      encoding: 'utf-8' as BufferEncoding,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PATH: `${fakeBinDir}:${process.env.PATH}`,
        GH_PAGER: '',
        RETRY_DELAY: '0', // skip sleep in tests
        RETRY_LIMIT: '5', // cap retries in tests
      },
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  given('[case1] logs are immediately available', () => {
    when('[t0] api returns logs on first attempt', () => {
      then('shows logs without retry message', () => {
        const tempDir = setupTempRepo({
          branch: 'feature/test',
          ghMock: `#!/bin/bash
case "$*" in
  "auth status")
    exit 0
    ;;
  "run list"*)
    echo '[{"databaseId":123,"workflowName":"test","status":"completed","conclusion":"failure","createdAt":"2024-01-01T00:00:00Z"}]'
    ;;
  "repo view"*)
    echo '{"nameWithOwner":"test/repo"}'
    ;;
  *"actions/runs/123/jobs"*)
    echo '[{"id":456,"name":"test-unit","conclusion":"failure"}]'
    ;;
  *"actions/jobs/456/logs"*)
    echo "FAIL src/test.ts"
    echo "  expected 1 to equal 2"
    echo "PASS other test"
    ;;
  *)
    echo "unhandled: $*" >&2
    exit 1
    ;;
esac
`,
        });

        const result = runScript({
          tempDir,
          scriptArgs: ['--flow', 'test'],
        });

        expect(result.stdout).toContain('FAIL src/test.ts');
        expect(result.stdout).toContain('expected 1 to equal 2');
        expect(result.stdout).not.toContain('logs not ready');
        expect(result.exitCode).toBe(0);
      });
    });
  });

  given('[case2] logs are delayed (github slow)', () => {
    when('[t0] api returns error then succeeds', () => {
      then('retries and eventually shows logs', () => {
        // create state file to track call count
        const tempDir = setupTempRepo({
          branch: 'feature/test',
          ghMock: `#!/bin/bash
STATE_FILE="$PWD/.gh-call-count"

case "$*" in
  "auth status")
    exit 0
    ;;
  "run list"*)
    echo '[{"databaseId":123,"workflowName":"test","status":"completed","conclusion":"failure","createdAt":"2024-01-01T00:00:00Z"}]'
    ;;
  "repo view"*)
    echo '{"nameWithOwner":"test/repo"}'
    ;;
  *"actions/runs/123/jobs"*)
    echo '[{"id":456,"name":"test-unit","conclusion":"failure"}]'
    ;;
  *"actions/jobs/456/logs"*)
    # track call count
    if [ -f "$STATE_FILE" ]; then
      COUNT=$(cat "$STATE_FILE")
    else
      COUNT=0
    fi
    COUNT=$((COUNT + 1))
    echo "$COUNT" > "$STATE_FILE"

    # fail first 2 attempts, succeed on 3rd
    if [ "$COUNT" -lt 3 ]; then
      echo "HTTP 404: job is still active" >&2
      exit 1
    fi
    echo "FAIL src/delayed.ts"
    echo "  assertion failed"
    echo "PASS done"
    ;;
  *)
    echo "unhandled: $*" >&2
    exit 1
    ;;
esac
`,
        });

        const result = runScript({
          tempDir,
          scriptArgs: ['--flow', 'test'],
        });

        expect(result.stdout).toContain('logs not ready');
        expect(result.stdout).toContain('FAIL src/delayed.ts');
        expect(result.exitCode).toBe(0);
      });
    });
  });

  given('[case3] logs never become available', () => {
    when('[t0] api keeps return error', () => {
      then('shows malfunction error after max retries', () => {
        const tempDir = setupTempRepo({
          branch: 'feature/test',
          ghMock: `#!/bin/bash
case "$*" in
  "auth status")
    exit 0
    ;;
  "run list"*)
    echo '[{"databaseId":123,"workflowName":"test","status":"completed","conclusion":"failure","createdAt":"2024-01-01T00:00:00Z"}]'
    ;;
  "repo view"*)
    echo '{"nameWithOwner":"test/repo"}'
    ;;
  *"actions/runs/123/jobs"*)
    echo '[{"id":456,"name":"test-unit","conclusion":"failure"}]'
    ;;
  *"actions/jobs/456/logs"*)
    # always return error
    echo "HTTP 404: job is still active"
    exit 1
    ;;
  *)
    echo "unhandled: $*" >&2
    exit 1
    ;;
esac
`,
        });

        const result = runScript({
          tempDir,
          scriptArgs: ['--flow', 'test'],
        });

        expect(result.stdout).toContain('logs not ready');
        expect(result.stdout).toContain('💥 logs unavailable after');
        expect(result.stdout).toContain('gh run view 123 --log-failed');
        expect(result.exitCode).toBe(0); // continues to next job, does not fail
      });
    });
  });

  given('[case4] constraint errors', () => {
    when('[t0] --flow not provided', () => {
      then('shows constraint error with stophand', () => {
        const tempDir = setupTempRepo({
          branch: 'feature/test',
          ghMock: `#!/bin/bash
exit 0
`,
        });

        const result = runScript({
          tempDir,
          scriptArgs: [],
        });

        expect(result.stdout).toContain('✋ error: --flow is required');
        expect(result.exitCode).toBe(2);
      });
    });

    when('[t1] no runs found for branch', () => {
      then('shows constraint error', () => {
        const tempDir = setupTempRepo({
          branch: 'feature/empty',
          ghMock: `#!/bin/bash
case "$*" in
  "auth status")
    exit 0
    ;;
  "run list"*)
    echo '[]'
    ;;
  *)
    exit 0
    ;;
esac
`,
        });

        const result = runScript({
          tempDir,
          scriptArgs: ['--flow', 'test'],
        });

        expect(result.stdout).toContain('✋ no runs found');
        expect(result.exitCode).toBe(2);
      });
    });
  });

  given('[case5] not authenticated', () => {
    when('[t0] gh auth status fails', () => {
      then('shows constraint error', () => {
        const tempDir = setupTempRepo({
          branch: 'feature/test',
          ghMock: `#!/bin/bash
case "$*" in
  "auth status")
    exit 1
    ;;
  *)
    exit 0
    ;;
esac
`,
        });

        const result = runScript({
          tempDir,
          scriptArgs: ['--flow', 'test'],
        });

        expect(result.stdout).toContain('✋ error: not authenticated');
        expect(result.exitCode).toBe(2);
      });
    });
  });
});
