import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

const SKILL_PATH = path.resolve(
  __dirname,
  '../../../../../dist/domain.roles/mechanic/skills/git.release/git.release.sh',
);

/**
 * .what = setup a temp git repo with mock gh cli
 * .why = isolate tests from real github api
 */
const setupTestEnv = (
  mockResponses: Record<string, string>,
): { tempDir: string; fakeBinDir: string; cleanup: () => void } => {
  const tempDir = genTempDir({ slug: 'git-release-test', git: true });
  const fakeBinDir = path.join(tempDir, '.fakebin');
  fs.mkdirSync(fakeBinDir, { recursive: true });

  // create mock gh cli
  // use first 2 args as key: "pr list", "pr view", "pr merge", "run list", "run rerun"
  // special case for "run view" which has subvariants: --json jobs vs --json startedAt
  const ghMockContent = `#!/bin/bash
set -euo pipefail

# mock gh cli for tests
MOCK_RESPONSES='${JSON.stringify(mockResponses).replace(/'/g, "'\"'\"'")}'

# build command key from first 2 args only (e.g., "pr list", "pr view")
CMD_KEY="$1 $2"

# distinguish "run view" subvariants by --json flag
if [[ "$CMD_KEY" == "run view" ]]; then
  ALL_ARGS="$*"
  if [[ "$ALL_ARGS" == *"--json jobs"* ]]; then
    CMD_KEY="run view jobs"
  elif [[ "$ALL_ARGS" == *"--json startedAt"* ]]; then
    CMD_KEY="run view duration"
  fi
fi

# distinguish "pr list" subvariants by --state flag
if [[ "$CMD_KEY" == "pr list" ]]; then
  ALL_ARGS="$*"
  if [[ "$ALL_ARGS" == *"--state open"* ]]; then
    # check for "pr list open" key first, fallback to "pr list"
    RESPONSE_OPEN=$(echo "$MOCK_RESPONSES" | jq -r '.["pr list open"] // empty')
    if [[ -n "$RESPONSE_OPEN" ]]; then
      CMD_KEY="pr list open"
    fi
  elif [[ "$ALL_ARGS" == *"--state merged"* ]]; then
    # check for "pr list merged" key first, fallback to "pr list"
    RESPONSE_MERGED=$(echo "$MOCK_RESPONSES" | jq -r '.["pr list merged"] // empty')
    if [[ -n "$RESPONSE_MERGED" ]]; then
      CMD_KEY="pr list merged"
    fi
  fi
fi

# lookup response
RESPONSE=$(echo "$MOCK_RESPONSES" | jq -r --arg key "$CMD_KEY" '.[$key] // empty')

if [[ -n "$RESPONSE" ]]; then
  # support error responses: prefix "ERROR:" means exit 1 with message to stderr
  if [[ "$RESPONSE" == ERROR:* ]]; then
    echo "\${RESPONSE#ERROR:}" >&2
    exit 1
  fi
  echo "$RESPONSE"
  exit 0
fi

# fallback for unhandled commands
echo "mock: unhandled gh $*" >&2
exit 1
`;

  fs.writeFileSync(path.join(fakeBinDir, 'gh'), ghMockContent);
  fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

  // create mock rhachet keyrack
  const rhachetMockContent = `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "get" ]]; then
  echo "mock-github-token"
  exit 0
fi
echo "mock: unhandled rhachet $*" >&2
exit 1
`;

  fs.writeFileSync(path.join(fakeBinDir, 'rhachet'), rhachetMockContent);
  fs.chmodSync(path.join(fakeBinDir, 'rhachet'), '755');

  // init git repo in temp dir
  spawnSync('git', ['init'], { cwd: tempDir });
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: tempDir });
  spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: tempDir });
  spawnSync('git', ['commit', '--allow-empty', '-m', 'initial'], {
    cwd: tempDir,
  });
  spawnSync('git', ['branch', '-M', 'main'], { cwd: tempDir });

  // create remote tracking
  spawnSync(
    'git',
    ['remote', 'add', 'origin', 'https://github.com/test/repo'],
    {
      cwd: tempDir,
    },
  );
  spawnSync(
    'git',
    ['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main'],
    {
      cwd: tempDir,
    },
  );

  return {
    tempDir,
    fakeBinDir,
    cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }),
  };
};

/**
 * .what = run the skill with mock environment
 * .why = test skill behavior in isolation
 */
const runSkill = (
  args: string[],
  env: { tempDir: string; fakeBinDir: string },
): { stdout: string; stderr: string; status: number } => {
  const result = spawnSync('bash', [SKILL_PATH, ...args], {
    cwd: env.tempDir,
    env: {
      ...process.env,
      PATH: `${env.fakeBinDir}:${process.env.PATH}`,
      TERM: 'dumb',
      HOME: env.tempDir,
    },
    encoding: 'utf-8',
  });

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status ?? 1,
  };
};

describe('git.release', () => {
  given('[case1] release to main (plan mode)', () => {
    when('[t0] feature branch with open PR', () => {
      then('shows status tree with hint to apply', () => {
        const mockResponses = {
          // jq-processed result: '.[0].number // empty' returns just the number
          'pr list': '42',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN"}',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          // create feature branch
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--to', 'main'], { tempDir, fakeBinDir });

          expect(result.stdout).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] feature branch with no PR', () => {
      then('shows crickets vibe with hint to push', () => {
        const mockResponses = {
          // jq-processed result: '.[0].number // empty' returns empty for empty array
          'pr list': '',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--to', 'main'], { tempDir, fakeBinDir });

          expect(result.stdout).toMatchSnapshot();
          expect(result.status).toEqual(2); // constraint error
        } finally {
          cleanup();
        }
      });
    });

    when('[t2] on main branch with release PR', () => {
      then('shows release PR status', () => {
        const mockResponses = {
          // jq-processed: returns PR number for release PR
          'pr list': '99',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "OPEN"}',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          const result = runSkill(['--to', 'main'], { tempDir, fakeBinDir });

          expect(result.stdout).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });

    when('[t3] feature branch with merged PR (fallback lookup)', () => {
      then('shows status for merged PR', () => {
        // Gap 2: test merged PR fallback - no open PR, but merged PR extant
        const mockResponses = {
          // no open PR, but merged PR extant
          'pr list open': '',
          'pr list merged': '42',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "MERGED"}',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--to', 'main'], { tempDir, fakeBinDir });

          // should find the merged PR and show its status
          expect(result.stdout).toContain('turtle/feature-x');
          expect(result.stdout).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case2] release to main (apply mode)', () => {
    when('[t0] PR with all checks passed', () => {
      then('shows cowabunga vibe and enables automerge', () => {
        const mockResponses = {
          'pr list': '42',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "MERGED"}',
          'pr merge': 'auto-merge enabled',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--to', 'main', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
          });

          expect(result.stdout).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] PR with failed checks', () => {
      then('shows bummer vibe with failure links', () => {
        // mock includes separate responses for step name vs duration (Gap 5)
        const mockResponses = {
          'pr list': '42',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "FAILURE", "status": "COMPLETED", "name": "test-unit", "detailsUrl": "https://github.com/test/repo/actions/runs/123"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN"}',
          // "run view jobs" returns jq-processed step name
          'run view jobs': 'Run jest tests',
          // "run view duration" returns JSON for startedAt/updatedAt
          'run view duration':
            '{"startedAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:02:34Z"}',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--to', 'main', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
          });

          // verify duration appears in output
          expect(result.stdout).toContain('failed after');
          expect(result.stdout).toMatchSnapshot();
          expect(result.status).toEqual(1);
        } finally {
          cleanup();
        }
      });
    });

    when('[t2] PR needs rebase', () => {
      then('shows hold up dude vibe', () => {
        const mockResponses = {
          'pr list': '42',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "BEHIND", "state": "OPEN"}',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--to', 'main'], { tempDir, fakeBinDir });

          expect(result.stdout).toMatchSnapshot();
          expect(result.status).toEqual(2); // constraint error
        } finally {
          cleanup();
        }
      });
    });

    when('[t3] automerge returns clean status (PR ready to merge)', () => {
      then('handles gracefully: merges and succeeds', () => {
        // "clean status" means PR is ready to merge NOW - not an error
        // we need stateful mock: first pr view shows OPEN, after merge shows MERGED
        const tempDir = genTempDir({
          slug: 'git-release-clean-status',
          git: true,
        });
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });

        const counterFile = path.join(tempDir, '.gh-call-counter');
        fs.writeFileSync(counterFile, '0');

        const ghMockContent = `#!/bin/bash
set -euo pipefail

COUNTER_FILE="${counterFile}"
COUNT=$(cat "$COUNTER_FILE")

CMD_KEY="$1 $2"

case "$CMD_KEY" in
  "pr list")
    echo "42"
    ;;
  "pr view")
    echo $((COUNT + 1)) > "$COUNTER_FILE"
    if [[ $COUNT -lt 1 ]]; then
      # first call: OPEN
      echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN"}'
    else
      # after merge attempt: MERGED (gh merged it immediately due to clean status)
      echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "MERGED"}'
    fi
    ;;
  "pr merge")
    # "clean status" error - PR can merge immediately
    echo "GraphQL: Pull request is in clean status (enablePullRequestAutoMerge)" >&2
    exit 1
    ;;
  *)
    echo "mock: unhandled gh $*" >&2
    exit 1
    ;;
esac
`;

        fs.writeFileSync(path.join(fakeBinDir, 'gh'), ghMockContent);
        fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

        const rhachetMock = `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "get" ]]; then
  echo "mock-token"
  exit 0
fi
exit 1
`;
        fs.writeFileSync(path.join(fakeBinDir, 'rhachet'), rhachetMock);
        fs.chmodSync(path.join(fakeBinDir, 'rhachet'), '755');

        spawnSync('git', ['init'], { cwd: tempDir });
        spawnSync('git', ['config', 'user.email', 'test@test.com'], {
          cwd: tempDir,
        });
        spawnSync('git', ['config', 'user.name', 'Test User'], {
          cwd: tempDir,
        });
        spawnSync('git', ['commit', '--allow-empty', '-m', 'initial'], {
          cwd: tempDir,
        });
        spawnSync('git', ['branch', '-M', 'main'], { cwd: tempDir });
        spawnSync(
          'git',
          ['remote', 'add', 'origin', 'https://github.com/test/repo'],
          { cwd: tempDir },
        );
        spawnSync(
          'git',
          [
            'symbolic-ref',
            'refs/remotes/origin/HEAD',
            'refs/remotes/origin/main',
          ],
          { cwd: tempDir },
        );
        spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
          cwd: tempDir,
        });

        try {
          const result = runSkill(['--to', 'main', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
          });

          // should succeed - "clean status" means PR merged
          expect(result.status).toEqual(0);

          // stdout shows success
          expect(result.stdout).toContain('cowabunga');
          expect(result.stdout).toContain('all checks passed');
          expect(result.stdout).toContain('merged already');

          // snapshot output
          expect(result.stdout).toMatchSnapshot();
          // stderr should NOT contain the GraphQL error (we suppressed it)
          expect(result.stderr).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });

    when('[t4] automerge fails with actual error', () => {
      then('failloud: gh error goes to stderr, exits 1', () => {
        // actual gh error (not "clean status") should still fail
        const mockResponses = {
          'pr list': '42',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN"}',
          'pr merge':
            'ERROR:GraphQL: Could not enable auto-merge: not authorized',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--to', 'main', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
          });

          // failloud: skill exits 1 (malfunction error) for actual gh errors
          expect(result.status).toEqual(1);

          // error goes to stderr (failloud)
          expect(result.stderr).toContain('not authorized');

          // stdout shows progress up to failure point
          expect(result.stdout).toContain('cowabunga');
          expect(result.stdout).toContain('all checks passed');

          // snapshots capture exact output
          expect(result.stdout).toMatchSnapshot();
          expect(result.stderr).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case3] release to prod (plan mode)', () => {
    when('[t0] release PR extant', () => {
      then('shows status with hint to apply', () => {
        const mockResponses = {
          'pr list': '99',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN"}',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          const result = runSkill(['--to', 'prod'], { tempDir, fakeBinDir });

          expect(result.stdout).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] no release pr', () => {
      then('shows latest tag status', () => {
        const mockResponses = {
          'pr list': '',
          'run list':
            '[{"name": "publish.yml", "conclusion": "success", "status": "completed", "url": "https://github.com/test/repo/actions/runs/456"}]',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          // create a tag
          spawnSync('git', ['tag', 'v1.2.0'], { cwd: tempDir });

          const result = runSkill(['--to', 'prod'], { tempDir, fakeBinDir });

          expect(result.stdout).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });

    when('[t2] feature branch with open pr', () => {
      then('runs --to main flow first then stops', () => {
        const mockResponses = {
          'pr list': '42',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN"}',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--to', 'prod'], { tempDir, fakeBinDir });

          // should show --to main plan output (not prod)
          expect(result.stdout).toContain('git.release --to main');
          expect(result.stdout).not.toContain('--to prod');
          expect(result.stdout).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });

    when('[t3] feature branch without pr', () => {
      then('fails fast with push hint', () => {
        const mockResponses = {
          'pr list': '', // no pr
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--to', 'prod'], { tempDir, fakeBinDir });

          expect(result.stdout).toContain('hold up dude');
          expect(result.stdout).toContain('no open pr');
          expect(result.stdout).toContain('git.commit.push');
          expect(result.stdout).toMatchSnapshot();
          expect(result.status).toEqual(2); // constraint error
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case4] release to prod (apply mode)', () => {
    when('[t0] release PR extant with passed checks', () => {
      then('shows radical vibe and watches', () => {
        const mockResponses = {
          'pr list': '99',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "MERGED"}',
          'pr merge': 'auto-merge enabled',
          'run list':
            '[{"name": "publish.yml", "conclusion": "success", "status": "completed", "url": "https://github.com/test/repo/actions/runs/789"}]',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          // create a tag for the watch to find
          spawnSync('git', ['tag', 'v1.2.3'], { cwd: tempDir });

          const result = runSkill(['--to', 'prod', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
          });

          expect(result.stdout).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] release PR already merged', () => {
      then('watches tag workflows', () => {
        const mockResponses = {
          'pr list': '',
          'run list':
            '[{"name": "publish.yml", "conclusion": "success", "status": "completed", "url": "https://github.com/test/repo/actions/runs/789"}]',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['tag', 'v1.2.3'], { cwd: tempDir });

          const result = runSkill(['--to', 'prod', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
          });

          expect(result.stdout).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });

    when('[t2] tag workflow fails', () => {
      then('shows failure with retry hint', () => {
        const mockResponses = {
          'pr list': '',
          'run list':
            '[{"name": "publish.yml", "conclusion": "failure", "status": "completed", "url": "https://github.com/test/repo/actions/runs/789"}]',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['tag', 'v1.2.3'], { cwd: tempDir });

          const result = runSkill(['--to', 'prod', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
          });

          expect(result.stdout).toMatchSnapshot();
          expect(result.status).toEqual(1);
        } finally {
          cleanup();
        }
      });
    });

    when('[t3] deploy.yml detected', () => {
      then('watches deploy workflow', () => {
        const mockResponses = {
          'pr list': '',
          'run list':
            '[{"name": "deploy.yml", "conclusion": "success", "status": "completed", "url": "https://github.com/test/repo/actions/runs/789"}]',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['tag', 'v1.2.3'], { cwd: tempDir });

          const result = runSkill(['--to', 'prod', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
          });

          expect(result.stdout).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });

    when('[t4] feature branch without pr', () => {
      then('fails fast with push hint', () => {
        const mockResponses = {
          'pr list': '', // no pr
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--to', 'prod', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
          });

          expect(result.stdout).toContain('hold up dude');
          expect(result.stdout).toContain('no open pr');
          expect(result.stdout).toContain('git.commit.push');
          expect(result.stdout).toMatchSnapshot();
          expect(result.status).toEqual(2); // constraint error
        } finally {
          cleanup();
        }
      });
    });

    when('[t5] feature branch with pr that merges', () => {
      then('runs --to main first then continues to release pr', () => {
        // stateful mock: first pr view is for feature branch (open), second is merged
        const tempDir = genTempDir({ slug: 'git-release-t5', git: true });
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });

        // counter file for stateful mock
        const counterFile = path.join(tempDir, '.gh-call-counter');
        fs.writeFileSync(counterFile, '0');

        const ghMockContent = `#!/bin/bash
set -euo pipefail

COUNTER_FILE="${counterFile}"
COUNT=$(cat "$COUNTER_FILE")

CMD_KEY="$1 $2"

case "$CMD_KEY" in
  "pr list")
    # first call: return feature branch pr (42)
    # after merge: return release pr (99)
    if [[ $COUNT -lt 3 ]]; then
      echo "42"
    else
      echo "99"
    fi
    ;;
  "pr view")
    echo $((COUNT + 1)) > "$COUNTER_FILE"
    if [[ $COUNT -lt 2 ]]; then
      # feature branch pr - open then merged
      if [[ $COUNT -lt 1 ]]; then
        echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN"}'
      else
        echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "MERGED"}'
      fi
    else
      # release pr - merged
      echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "MERGED"}'
    fi
    ;;
  "pr merge")
    echo "auto-merge enabled"
    ;;
  "run list")
    echo '[{"name": "publish.yml", "conclusion": "success", "status": "completed", "url": "https://github.com/test/repo/actions/runs/789"}]'
    ;;
  "run view")
    echo '{"startedAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z"}'
    ;;
  *)
    echo "mock: unhandled gh $*" >&2
    exit 1
    ;;
esac
`;
        fs.writeFileSync(path.join(fakeBinDir, 'gh'), ghMockContent);
        fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

        // mock rhachet keyrack
        const rhachetMock = `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "get" ]]; then
  echo "mock-token"
  exit 0
fi
exit 1
`;
        fs.writeFileSync(path.join(fakeBinDir, 'rhachet'), rhachetMock);
        fs.chmodSync(path.join(fakeBinDir, 'rhachet'), '755');

        // setup git repo
        spawnSync('git', ['tag', 'v1.2.3'], { cwd: tempDir });
        spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
          cwd: tempDir,
        });

        const result = runSkill(['--to', 'prod', '--mode', 'apply'], {
          tempDir,
          fakeBinDir,
        });

        // should show --to main flow first
        expect(result.stdout).toContain('git.release --to main');
        // then should show tag workflow watch
        expect(result.stdout).toContain('v1.2.3');
        expect(result.stdout).toMatchSnapshot();
        expect(result.status).toEqual(0);
      });
    });
  });

  given('[case5] retry behavior', () => {
    when('[t0] --retry with failed PR checks', () => {
      then('reruns failed workflows', () => {
        // mock includes separate responses for step name vs duration (Gap 5)
        const mockResponses = {
          'pr list': '42',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "FAILURE", "status": "COMPLETED", "name": "test-unit", "detailsUrl": "https://github.com/test/repo/actions/runs/123"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN"}',
          // "run view jobs" returns jq-processed step name
          'run view jobs': 'Run jest tests',
          // "run view duration" returns JSON for startedAt/updatedAt
          'run view duration':
            '{"startedAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:02:34Z"}',
          'run rerun': 'rerun triggered',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(
            ['--to', 'main', '--mode', 'apply', '--retry'],
            { tempDir, fakeBinDir },
          );

          expect(result.stdout).toMatchSnapshot();
          // still fails because checks are still failed after rerun trigger
          expect(result.status).toEqual(1);
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] --retry with failed tag workflows', () => {
      then('reruns failed tag workflows', () => {
        const mockResponses = {
          'pr list': '',
          'run list':
            '[{"name": "publish.yml", "conclusion": "failure", "status": "completed", "url": "https://github.com/test/repo/actions/runs/789"}]',
          'run rerun': 'rerun triggered',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['tag', 'v1.2.3'], { cwd: tempDir });

          const result = runSkill(
            ['--to', 'prod', '--mode', 'apply', '--retry'],
            { tempDir, fakeBinDir },
          );

          expect(result.stdout).toMatchSnapshot();
          // still fails because workflow still shows failure
          expect(result.status).toEqual(1);
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case6] boundary conditions', () => {
    when('[t0] keyrack locked', () => {
      then('shows unlock instructions', () => {
        const mockResponses = {
          'pr list': '42',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN"}',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          // override rhachet mock to return empty (locked)
          fs.writeFileSync(
            path.join(fakeBinDir, 'rhachet'),
            '#!/bin/bash\nexit 1',
          );
          fs.chmodSync(path.join(fakeBinDir, 'rhachet'), '755');

          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--to', 'main', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
          });

          expect(result.stdout).toMatchSnapshot();
          expect(result.status).toEqual(1);
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case7] argument validation', () => {
    when('[t0] --to invalid value', () => {
      then('shows error and exits 2', () => {
        const { tempDir, fakeBinDir, cleanup } = setupTestEnv({});

        try {
          const result = runSkill(['--to', 'invalid'], { tempDir, fakeBinDir });

          expect(result.stderr).toContain("--to must be 'main' or 'prod'");
          expect(result.status).toEqual(2);
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] --mode invalid value', () => {
      then('shows error and exits 2', () => {
        const { tempDir, fakeBinDir, cleanup } = setupTestEnv({});

        try {
          const result = runSkill(['--to', 'main', '--mode', 'invalid'], {
            tempDir,
            fakeBinDir,
          });

          expect(result.stderr).toContain("--mode must be 'plan' or 'apply'");
          expect(result.status).toEqual(2);
        } finally {
          cleanup();
        }
      });
    });

    when('[t2] not in git repo', () => {
      then('shows error and exits 2', () => {
        const tempDir = genTempDir({ slug: 'not-git', git: false });
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });

        try {
          const result = spawnSync('bash', [SKILL_PATH, '--to', 'main'], {
            cwd: tempDir,
            env: {
              ...process.env,
              PATH: `${fakeBinDir}:${process.env.PATH}`,
              TERM: 'dumb',
            },
            encoding: 'utf-8',
          });

          expect(result.stderr).toContain('not in a git repository');
          expect(result.status).toEqual(2);
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });

    when('[t3] missing --to argument', () => {
      then('shows error and exits 2', () => {
        const { tempDir, fakeBinDir, cleanup } = setupTestEnv({});

        try {
          const result = runSkill([], { tempDir, fakeBinDir });

          expect(result.stderr).toContain('--to is required');
          expect(result.status).toEqual(2);
        } finally {
          cleanup();
        }
      });
    });

    when('[t4] --help flag', () => {
      then('shows usage and exits 0', () => {
        const { tempDir, fakeBinDir, cleanup } = setupTestEnv({});

        try {
          const result = runSkill(['--help'], { tempDir, fakeBinDir });

          expect(result.stdout).toContain('--to main');
          expect(result.stdout).toContain('--to prod');
          expect(result.stdout).toContain('--retry');
          expect(result.stdout).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case8] watch loop internals', () => {
    when('[t0] checks in progress', () => {
      then('shows progress status', () => {
        const mockResponses = {
          'pr list': '42',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": null, "status": "IN_PROGRESS", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN"}',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          // plan mode shows current status without watch
          const result = runSkill(['--to', 'main'], { tempDir, fakeBinDir });

          expect(result.stdout).toContain('in progress');
          expect(result.stdout).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] apply mode with poll progress', () => {
      then('shows sleep lines before completion', () => {
        const tempDir = genTempDir({
          slug: 'git-release-poll-test',
          git: true,
        });
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });

        // create counter file for stateful mock
        const counterFile = path.join(tempDir, '.gh-call-counter');
        fs.writeFileSync(counterFile, '0');

        // generate dynamic timestamps for "in action" time (Gap 10)
        // startedAt should be "now" so in_action matches watched time
        const nowIso = new Date().toISOString();

        // create stateful mock gh cli that transitions from in-progress to merged
        const ghMockContent = `#!/bin/bash
set -euo pipefail

COUNTER_FILE="${counterFile}"
COUNT=$(cat "$COUNTER_FILE")

# build command key from first 2 args
CMD_KEY="$1 $2"

case "$CMD_KEY" in
  "pr list")
    echo "42"
    ;;
  "pr view")
    # increment counter
    echo $((COUNT + 1)) > "$COUNTER_FILE"
    if [[ $COUNT -lt 2 ]]; then
      # first 2 calls: in progress with automerge enabled (startedAt = now for "in action" time)
      echo '{"statusCheckRollup": [{"conclusion": null, "status": "IN_PROGRESS", "name": "test-unit", "startedAt": "${nowIso}"}, {"conclusion": null, "status": "IN_PROGRESS", "name": "test-integration", "startedAt": "${nowIso}"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "OPEN"}'
    elif [[ $COUNT -lt 3 ]]; then
      # third call: one done, one in progress
      echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test-unit", "startedAt": "${nowIso}"}, {"conclusion": null, "status": "IN_PROGRESS", "name": "test-integration", "startedAt": "${nowIso}"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "OPEN"}'
    else
      # subsequent calls: merged
      echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test-unit", "startedAt": "${nowIso}"}, {"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test-integration", "startedAt": "${nowIso}"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "MERGED"}'
    fi
    ;;
  "pr merge")
    echo "auto-merge enabled"
    ;;
  "run view")
    echo '{"startedAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:02:34Z"}'
    ;;
  *)
    echo "mock: unhandled gh $*" >&2
    exit 1
    ;;
esac
`;

        fs.writeFileSync(path.join(fakeBinDir, 'gh'), ghMockContent);
        fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

        // create mock rhachet keyrack
        const rhachetMockContent = `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "get" ]]; then
  echo "mock-github-token"
  exit 0
fi
echo "mock: unhandled rhachet $*" >&2
exit 1
`;
        fs.writeFileSync(path.join(fakeBinDir, 'rhachet'), rhachetMockContent);
        fs.chmodSync(path.join(fakeBinDir, 'rhachet'), '755');

        // init git repo
        spawnSync('git', ['init'], { cwd: tempDir });
        spawnSync('git', ['config', 'user.email', 'test@test.com'], {
          cwd: tempDir,
        });
        spawnSync('git', ['config', 'user.name', 'Test User'], {
          cwd: tempDir,
        });
        spawnSync('git', ['commit', '--allow-empty', '-m', 'initial'], {
          cwd: tempDir,
        });
        spawnSync('git', ['branch', '-M', 'main'], { cwd: tempDir });
        spawnSync(
          'git',
          ['remote', 'add', 'origin', 'https://github.com/test/repo'],
          { cwd: tempDir },
        );
        spawnSync(
          'git',
          [
            'symbolic-ref',
            'refs/remotes/origin/HEAD',
            'refs/remotes/origin/main',
          ],
          { cwd: tempDir },
        );
        spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
          cwd: tempDir,
        });

        try {
          // apply mode with watch - should show poll progress
          const result = spawnSync(
            'bash',
            [SKILL_PATH, '--to', 'main', '--mode', 'apply'],
            {
              cwd: tempDir,
              env: {
                ...process.env,
                PATH: `${fakeBinDir}:${process.env.PATH}`,
                TERM: 'dumb',
                HOME: tempDir,
                // shorter poll interval for test
                GIT_RELEASE_POLL_INTERVAL: '1',
              },
              /* eslint-disable-next-line @typescript-eslint/naming-convention */
              encoding: 'utf-8',
            },
          );

          // should show poll lines
          expect(result.stdout).toContain('💤');
          expect(result.stdout).toContain('in action');
          expect(result.stdout).toContain('watched');
          expect(result.stdout).toContain('✨ done!');
          expect(result.stdout).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });

    when('[t2] rebase required mid-watch (race condition)', () => {
      then('failloud rebase hint and exits 2', () => {
        // race condition: PR passes initial rebase check, checks pass, but
        // another PR merges while we watch — now this PR needs rebase
        const tempDir = genTempDir({
          slug: 'git-release-rebase-race',
          git: true,
        });
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });

        // counter file for stateful mock
        const counterFile = path.join(tempDir, '.gh-call-counter');
        fs.writeFileSync(counterFile, '0');

        // stateful mock: CLEAN at first, transitions to BEHIND mid-watch
        const ghMockContent = `#!/bin/bash
set -euo pipefail

COUNTER_FILE="${counterFile}"
COUNT=$(cat "$COUNTER_FILE")

CMD_KEY="$1 $2"

case "$CMD_KEY" in
  "pr list")
    echo "42"
    ;;
  "pr view")
    echo $((COUNT + 1)) > "$COUNTER_FILE"
    if [[ $COUNT -lt 2 ]]; then
      # first 2 calls: checks in progress, CLEAN (no rebase required)
      echo '{"statusCheckRollup": [{"conclusion": null, "status": "IN_PROGRESS", "name": "test"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "OPEN"}'
    else
      # after 2nd poll: another PR merged, now BEHIND (needs rebase)
      echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "BEHIND", "state": "OPEN"}'
    fi
    ;;
  "pr merge")
    echo "auto-merge enabled"
    ;;
  *)
    echo "mock: unhandled gh $*" >&2
    exit 1
    ;;
esac
`;

        fs.writeFileSync(path.join(fakeBinDir, 'gh'), ghMockContent);
        fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

        // mock rhachet keyrack
        const rhachetMockContent = `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "get" ]]; then
  echo "mock-github-token"
  exit 0
fi
exit 1
`;
        fs.writeFileSync(path.join(fakeBinDir, 'rhachet'), rhachetMockContent);
        fs.chmodSync(path.join(fakeBinDir, 'rhachet'), '755');

        // init git repo
        spawnSync('git', ['init'], { cwd: tempDir });
        spawnSync('git', ['config', 'user.email', 'test@test.com'], {
          cwd: tempDir,
        });
        spawnSync('git', ['config', 'user.name', 'Test User'], {
          cwd: tempDir,
        });
        spawnSync('git', ['commit', '--allow-empty', '-m', 'initial'], {
          cwd: tempDir,
        });
        spawnSync('git', ['branch', '-M', 'main'], { cwd: tempDir });
        spawnSync(
          'git',
          ['remote', 'add', 'origin', 'https://github.com/test/repo'],
          { cwd: tempDir },
        );
        spawnSync(
          'git',
          [
            'symbolic-ref',
            'refs/remotes/origin/HEAD',
            'refs/remotes/origin/main',
          ],
          { cwd: tempDir },
        );
        spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
          cwd: tempDir,
        });

        try {
          const result = spawnSync(
            'bash',
            [SKILL_PATH, '--to', 'main', '--mode', 'apply'],
            {
              cwd: tempDir,
              env: {
                ...process.env,
                PATH: `${fakeBinDir}:${process.env.PATH}`,
                TERM: 'dumb',
                HOME: tempDir,
                // shorter poll interval for test
                GIT_RELEASE_POLL_INTERVAL: '1',
              },
              /* eslint-disable-next-line @typescript-eslint/naming-convention */
              encoding: 'utf-8',
            },
          );

          // should detect rebase requirement mid-watch and failfast
          expect(result.stdout).toContain('needs rebase');
          expect(result.stdout).toContain('another PR merged');
          expect(result.stdout).toMatchSnapshot();
          // exit 2 = constraint error (user must rebase)
          expect(result.status).toEqual(2);
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });

    when('[t3] both failed and progress checks (Gap 4)', () => {
      then('shows both failed and progress status', () => {
        // Gap 4: when some checks fail and others are still in progress,
        // both should be shown (not just failures)
        const mockResponses = {
          'pr list': '42',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "FAILURE", "status": "COMPLETED", "name": "test-unit", "detailsUrl": "https://github.com/test/repo/actions/runs/123"}, {"conclusion": null, "status": "IN_PROGRESS", "name": "test-integration"}, {"conclusion": null, "status": "IN_PROGRESS", "name": "lint"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN"}',
          'run view jobs': 'Run jest tests',
          'run view duration':
            '{"startedAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:02:34Z"}',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          // plan mode shows current status
          const result = runSkill(['--to', 'main'], { tempDir, fakeBinDir });

          // should show BOTH failed and progress (Gap 9 fix: progress inside failure block)
          expect(result.stdout).toContain('check(s) failed');
          expect(result.stdout).toContain('check(s) still in progress');
          expect(result.stdout).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });
  });
});
