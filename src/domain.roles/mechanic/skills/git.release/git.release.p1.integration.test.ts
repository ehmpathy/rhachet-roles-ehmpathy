import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

import {
  writeGitCommitUsesPermission,
  writeRhachetMock,
  writeSimpleGhMock,
} from './.test/infra/mockGh';
import { genMockBinDir, genStateDir, genTempGitRepo } from './.test/infra/setupTestEnv';

// all tests use mocked gh CLI, so no remote calls - 5s timeout is plenty
jest.setTimeout(5000);

/**
 * .what = replace timing values with placeholders for snapshot stability
 * .why = timing varies between runs (0s vs 1s), causes flaky snapshots
 */
const asTimingStable = (output: string): string => {
  return (
    output
      // replace "Ns in action" and "Ns watched" patterns
      .replace(/\d+s in action/g, 'Xs in action')
      .replace(/\d+s watched/g, 'Xs watched')
      // replace "Nm Ns" duration patterns
      .replace(/\d+m\s*\d+s/g, 'Xm Ys')
      // replace standalone seconds in duration contexts
      .replace(/(\d+)s delay/g, 'Xs delay')
  );
};

const SKILL_PATH = path.resolve(
  __dirname,
  '../../../../../dist/domain.roles/mechanic/skills/git.release/git.release.sh',
);

/**
 * .what = setup a temp git repo with mock gh cli
 * .why = isolate tests from real github api
 *
 * .note = uses shared infra from .test/infra/
 */
const setupTestEnv = (
  mockResponses: Record<string, string>,
): { tempDir: string; fakeBinDir: string; cleanup: () => void } => {
  // create temp repo (stay on main, tests switch branches as needed)
  const { tempDir, cleanup } = genTempGitRepo({ branch: 'main' });
  const fakeBinDir = genMockBinDir({ tempDir });
  const stateDir = genStateDir({ tempDir });

  // write mock gh cli with simple key-value responses
  writeSimpleGhMock({ mockResponses, mockBinDir: fakeBinDir, stateDir });

  // write rhachet mock for keyrack
  writeRhachetMock({ tempDir, mockBinDir: fakeBinDir });

  // setup git.commit.uses permission for apply mode tests
  writeGitCommitUsesPermission({ tempDir });

  return { tempDir, fakeBinDir, cleanup };
};

/**
 * .what = run the skill with mock environment
 * .why = test skill behavior in isolation
 */
const runSkill = (
  args: string[],
  env: {
    tempDir: string;
    fakeBinDir: string;
    extraEnv?: Record<string, string>;
  },
): { stdout: string; stderr: string; status: number } => {
  // note: pass EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN via env
  // keyrack returns env var value if already set, so no real keyrack fetch needed
  const result = spawnSync('bash', [SKILL_PATH, ...args], {
    cwd: env.tempDir,
    env: {
      ...process.env,
      PATH: `${env.fakeBinDir}:${process.env.PATH}`,
      TERM: 'dumb',
      HOME: env.tempDir,
      EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token',
      GIT_RELEASE_TEST_MODE: 'true',
      ...(env.extraEnv ?? {}),
    },
    encoding: 'utf-8',
    timeout: 3000, // 3s hard limit - all mocked, should be instant
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
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          // create feature branch
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--into', 'main'], { tempDir, fakeBinDir });

          expect(asTimingStable(result.stdout)).toMatchSnapshot();
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

          const result = runSkill(['--into', 'main'], { tempDir, fakeBinDir });

          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          expect(result.status).toEqual(2); // constraint error
        } finally {
          cleanup();
        }
      });
    });

    when('[t2] on main branch with --into main', () => {
      then('ConstraintError: cannot merge main into main', () => {
        // per blueprint scene.6: --from main --into main is invalid
        // when on main branch, --from defaults to main
        // so --into main means --from main --into main → ConstraintError
        const mockResponses = {};

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          const result = runSkill(['--into', 'main'], { tempDir, fakeBinDir });

          expect(result.stderr).toContain('--from main --into main is invalid');
          expect(result.status).toEqual(2);
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
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "feat(oceans): add reef protection"}',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--into', 'main'], { tempDir, fakeBinDir });

          // should find the merged PR and show its status
          expect(result.stdout).toContain('feat(oceans): add reef protection');
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
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
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "feat(oceans): add reef protection"}',
          'pr merge': 'auto-merge enabled',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--into', 'main', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
          });

          expect(asTimingStable(result.stdout)).toMatchSnapshot();
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
            '{"statusCheckRollup": [{"conclusion": "FAILURE", "status": "COMPLETED", "name": "test-unit", "detailsUrl": "https://github.com/test/repo/actions/runs/123"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}',
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

          const result = runSkill(['--into', 'main', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
          });

          // verify duration appears in output
          expect(result.stdout).toContain('failed after');
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          // per spec: failed checks are constraint errors (exit 2)
          expect(result.status).toEqual(2);
        } finally {
          cleanup();
        }
      });
    });

    when('[t2] PR needs rebase (BEHIND)', () => {
      then('shows hold up dude vibe', () => {
        const mockResponses = {
          'pr list': '42',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "BEHIND", "state": "OPEN", "title": "feat(oceans): add reef protection"}',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--into', 'main'], { tempDir, fakeBinDir });

          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          expect(result.status).toEqual(2); // constraint error
        } finally {
          cleanup();
        }
      });
    });

    when('[t2a] PR needs rebase with conflicts (DIRTY)', () => {
      then('shows hold up dude vibe with conflicts message', () => {
        const mockResponses = {
          'pr list': '42',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "DIRTY", "state": "OPEN", "title": "feat(oceans): add reef protection"}',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--into', 'main'], { tempDir, fakeBinDir });

          // should show conflicts message
          expect(result.stdout).toContain('has conflicts');
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
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
      echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}'
    else
      # after merge attempt: MERGED (gh merged it immediately due to clean status)
      echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "feat(oceans): add reef protection"}'
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

        // keyrack.operations.sh uses absolute path: "$repo_root/node_modules/.bin/rhachet"
        const rhachetMock = `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "get" ]]; then
  echo '{"grant":{"key":{"secret":"mock-github-token"}}}'
  exit 0
fi
exit 1
`;
        // create at node_modules/.bin path (keyrack.operations.sh uses absolute path)
        const nodeModulesBinDir3 = path.join(tempDir, 'node_modules', '.bin');
        fs.mkdirSync(nodeModulesBinDir3, { recursive: true });
        fs.writeFileSync(path.join(nodeModulesBinDir3, 'rhachet'), rhachetMock);
        fs.chmodSync(path.join(nodeModulesBinDir3, 'rhachet'), '755');

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

        // setup git.commit.uses permission for apply mode
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 'infinite', push: 'allow', stage: 'allow' }),
        );

        try {
          const result = runSkill(['--into', 'main', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
          });

          // should succeed - "clean status" means PR merged
          expect(result.status).toEqual(0);

          // stdout shows success
          expect(result.stdout).toContain('cowabunga');
          expect(result.stdout).toContain('all checks passed');
          expect(result.stdout).toContain('and merged already');

          // snapshot output
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
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
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}',
          'pr merge':
            'ERROR:GraphQL: Could not enable auto-merge: not authorized',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--into', 'main', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
          });

          // debug output
          console.log('case2 t4 STDOUT:', result.stdout);
          console.log('case2 t4 STDERR:', result.stderr);
          console.log('case2 t4 STATUS:', result.status);

          // failloud: skill exits 1 (malfunction error) for actual gh errors
          expect(result.status).toEqual(1);

          // error goes to stderr (failloud)
          expect(result.stderr).toContain('not authorized');

          // stdout shows progress up to failure point
          expect(result.stdout).toContain('cowabunga');
          expect(result.stdout).toContain('all checks passed');

          // snapshots capture exact output
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          expect(result.stderr).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case3a] release to prod from main (plan mode)', () => {
    when('[t0] release PR extant', () => {
      then('shows status with hint to apply', () => {
        const mockResponses = {
          'pr list': '99',
          'pr list title': 'chore(release): v1.32.0 🎉',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "chore(release): v1.32.0 🎉"}',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          const result = runSkill(['--into', 'prod'], { tempDir, fakeBinDir });

          expect(asTimingStable(result.stdout)).toMatchSnapshot();
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

          const result = runSkill(['--into', 'prod'], { tempDir, fakeBinDir });

          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case3b] release to prod from feat (plan mode)', () => {
    when('[t0] open PR for feature branch', () => {
      then('runs --into main flow first then stops', () => {
        const mockResponses = {
          'pr list': '42',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--into', 'prod'], { tempDir, fakeBinDir });

          // should show unified prod header with feature branch content
          expect(result.stdout).toContain('git.release --into prod');
          expect(result.stdout).toContain('feat(oceans): add reef protection');
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] no PR for feature branch', () => {
      then('fails fast with push hint', () => {
        const mockResponses = {
          'pr list': '', // no pr
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--into', 'prod'], { tempDir, fakeBinDir });

          // per vision: "crickets" for no PR found (informational)
          expect(result.stdout).toContain('crickets');
          expect(result.stdout).toContain('no open branch pr');
          expect(result.stdout).toContain('git.commit.push');
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          expect(result.status).toEqual(2); // constraint error
        } finally {
          cleanup();
        }
      });
    });

    when('[t2] feature PR already merged', () => {
      then('continues to show release PR status', () => {
        // use custom mock to differentiate feature PR vs release PR lookups
        const tempDir = genTempDir({
          slug: 'git-release-feat-merged-plan',
          git: true,
        });
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });

        const ghMockContent = `#!/bin/bash
set -euo pipefail

ALL_ARGS="$*"
CMD_KEY="$1 $2"

case "$CMD_KEY" in
  "pr list")
    # detect if release PR request (has chore(release) in jq filter)
    if echo "$ALL_ARGS" | grep -q "chore(release)"; then
      # check if query ends with "| .title" vs "| .number" (shell parses quotes away)
      if echo "$ALL_ARGS" | grep -qE '\\| \\.title$'; then
        echo "chore(release): v1.33.0 🎉"
      else
        echo "99"
      fi
    else
      # feature branch PR request
      if echo "$ALL_ARGS" | grep -q "merged"; then
        echo "42"  # found via merged state lookup
      else
        echo ""  # no open PR (already merged)
      fi
    fi
    ;;
  "pr view")
    PR_NUM="$3"
    if [[ "$PR_NUM" == "42" ]]; then
      # feature branch PR - already merged
      echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "feat(oceans): add reef protection"}'
    elif [[ "$PR_NUM" == "99" ]]; then
      # release PR - checks passed
      echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "chore(release): v1.33.0 🎉"}'
    fi
    ;;
  *)
    echo "mock: unhandled gh $*" >&2
    exit 1
    ;;
esac
`;

        fs.writeFileSync(path.join(fakeBinDir, 'gh'), ghMockContent);
        fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

        // create rhachet mock for keyrack
        const rhachetMockContent = `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "get" ]]; then
  echo '{"grant":{"key":{"secret":"mock-github-token"}}}'
  exit 0
fi
echo "mock: unhandled rhachet $*" >&2
exit 1
`;
        const nodeModulesBinDir = path.join(tempDir, 'node_modules', '.bin');
        fs.mkdirSync(nodeModulesBinDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesBinDir, 'rhachet'),
          rhachetMockContent,
        );
        fs.chmodSync(path.join(nodeModulesBinDir, 'rhachet'), '755');
        fs.writeFileSync(path.join(fakeBinDir, 'rhachet'), rhachetMockContent);
        fs.chmodSync(path.join(fakeBinDir, 'rhachet'), '755');

        // init git repo
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

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });
          // create a tag for latest version display
          spawnSync('git', ['tag', 'v1.32.0'], { cwd: tempDir });

          const result = runSkill(['--into', 'prod'], { tempDir, fakeBinDir });

          // should show unified prod header
          expect(result.stdout).toContain('git.release --into prod');
          // should show feature branch section (merged)
          expect(result.stdout).toContain('feat(oceans): add reef protection');
          expect(result.stdout).toContain('merged');
          // should continue to release PR section
          expect(result.stdout).toContain('chore(release): v1.33.0');
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });

    when('[t3] feature PR merged and release PR also merged', () => {
      then('shows both merged status', () => {
        // use custom mock to differentiate feature PR vs release PR lookups
        const tempDir = genTempDir({
          slug: 'git-release-both-merged-plan',
          git: true,
        });
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });

        const ghMockContent = `#!/bin/bash
set -euo pipefail

ALL_ARGS="$*"
CMD_KEY="$1 $2"

# debug: write args to temp file
echo "$ALL_ARGS" >> /tmp/gh-mock-debug.log

case "$CMD_KEY" in
  "pr list")
    # detect if release PR request (has chore(release) in jq filter)
    if echo "$ALL_ARGS" | grep -qF "chore(release)"; then
      # release PR: no open (already merged), found via merged state lookup
      if echo "$ALL_ARGS" | grep -qF -- "--state open"; then
        echo ""  # no open release PR
      elif echo "$ALL_ARGS" | grep -qF -- "--state merged"; then
        # check if filter ends with "| .number" vs "| .title" (shell parses quotes away)
        if echo "$ALL_ARGS" | grep -qE '\\| \\.number$'; then
          echo "99"
        else
          echo "chore(release): v1.33.0"
        fi
      fi
    else
      # feature branch PR request
      if echo "$ALL_ARGS" | grep -qF -- "--state merged"; then
        echo "42"  # found via merged state lookup
      else
        echo ""  # no open PR (already merged)
      fi
    fi
    ;;
  "pr view")
    PR_NUM="$3"
    if [[ "$PR_NUM" == "42" ]]; then
      # feature branch PR - already merged
      echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "feat(oceans): add reef protection"}'
    elif [[ "$PR_NUM" == "99" ]]; then
      # release PR - also already merged
      echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "chore(release): v1.33.0"}'
    fi
    ;;
  "run list")
    # tag workflow runs for v1.33.0
    echo '[{"name": "publish.yml", "conclusion": "success", "status": "completed", "url": "https://github.com/test/repo/actions/runs/789"}]'
    ;;
  *)
    echo "mock: unhandled gh $*" >&2
    exit 1
    ;;
esac
`;

        fs.writeFileSync(path.join(fakeBinDir, 'gh'), ghMockContent);
        fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

        // create rhachet mock for keyrack
        const rhachetMockContent = `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "get" ]]; then
  echo '{"grant":{"key":{"secret":"mock-github-token"}}}'
  exit 0
fi
echo "mock: unhandled rhachet $*" >&2
exit 1
`;
        const nodeModulesBinDir = path.join(tempDir, 'node_modules', '.bin');
        fs.mkdirSync(nodeModulesBinDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesBinDir, 'rhachet'),
          rhachetMockContent,
        );
        fs.chmodSync(path.join(nodeModulesBinDir, 'rhachet'), '755');
        fs.writeFileSync(path.join(fakeBinDir, 'rhachet'), rhachetMockContent);
        fs.chmodSync(path.join(fakeBinDir, 'rhachet'), '755');

        // init git repo
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

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });
          // create tags for version display
          spawnSync('git', ['tag', 'v1.32.0'], { cwd: tempDir });
          spawnSync('git', ['tag', 'v1.33.0'], { cwd: tempDir }); // merged release tag

          const result = runSkill(['--into', 'prod'], { tempDir, fakeBinDir });

          // should show unified prod header
          expect(result.stdout).toContain('git.release --into prod');
          // should show feature branch section (merged)
          expect(result.stdout).toContain('feat(oceans): add reef protection');
          expect(result.stdout).toContain('already merged');
          // should continue to release PR section (also merged)
          expect(result.stdout).toContain('chore(release): v1.33.0');
          // should show tag status (the "third find") - note: workflow names only appear in watch mode
          expect(result.stdout).toContain('v1.33.0');
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case4a] release to prod from main (apply mode)', () => {
    when('[t0] from main: release PR extant with passed checks', () => {
      then('shows radical vibe and watches', () => {
        const mockResponses = {
          'pr list': '99',
          'pr list title': 'chore(release): v1.32.0 🎉',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "chore(release): v1.32.0 🎉"}',
          'pr merge': 'auto-merge enabled',
          'run list':
            '[{"name": "publish.yml", "conclusion": "success", "status": "completed", "url": "https://github.com/test/repo/actions/runs/789"}]',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          // create a tag matching the mock PR title version
          spawnSync('git', ['tag', 'v1.32.0'], { cwd: tempDir });

          const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
          });

          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] from main: release PR already merged', () => {
      then('watches tag workflows', () => {
        const mockResponses = {
          'pr list': '',
          'run list':
            '[{"name": "publish.yml", "conclusion": "success", "status": "completed", "url": "https://github.com/test/repo/actions/runs/789"}]',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['tag', 'v1.2.3'], { cwd: tempDir });

          const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
          });

          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });

    when('[t2] from main: tag workflow fails', () => {
      then('shows failure with retry hint', () => {
        const mockResponses = {
          'pr list': '',
          'run list':
            '[{"name": "publish.yml", "conclusion": "failure", "status": "completed", "url": "https://github.com/test/repo/actions/runs/789"}]',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['tag', 'v1.2.3'], { cwd: tempDir });

          const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
          });

          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          // per spec: failed checks are constraint errors (exit 2)
          expect(result.status).toEqual(2);
        } finally {
          cleanup();
        }
      });
    });

    when('[t3] from main: deploy.yml detected', () => {
      then('watches deploy workflow', () => {
        const mockResponses = {
          'pr list': '',
          'run list':
            '[{"name": "deploy.yml", "conclusion": "success", "status": "completed", "url": "https://github.com/test/repo/actions/runs/789"}]',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['tag', 'v1.2.3'], { cwd: tempDir });

          const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
          });

          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });

    when(
      '[t4] from main: release PR inflight (checks in progress), then merges',
      () => {
        then('watches release PR then tag workflows', () => {
          // stateful mock: first pr view shows in-progress, second shows merged
          const tempDir = genTempDir({
            slug: 'git-release-t4-inflight',
            git: true,
          });

          // initialize git repo with commit (genTempDir only runs git init)
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

          const fakeBinDir = path.join(tempDir, '.fakebin');
          fs.mkdirSync(fakeBinDir, { recursive: true });

          // mock gh with stateful behavior
          // NOTE: use tempDir for state file so it's deterministic across gh invocations
          const ghMock = `#!/bin/bash
set -e
ALL_ARGS="$*"
STATE_FILE="${tempDir}/.gh-state"
AUTOMERGE_FILE="${tempDir}/.gh-automerge"

# pr merge - track automerge state
if [[ "$ALL_ARGS" == *"pr merge"* ]]; then
  echo "true" > "$AUTOMERGE_FILE"
  echo 'auto-merge enabled'
  exit 0
fi

# track pr view calls
if [[ "$ALL_ARGS" == *"pr view"* ]]; then
  COUNT=0
  if [[ -f "$STATE_FILE" ]]; then
    COUNT=$(cat "$STATE_FILE")
  fi
  COUNT=$((COUNT + 1))
  echo "$COUNT" > "$STATE_FILE"

  # check if automerge was enabled
  AUTOMERGE_JSON='null'
  if [[ -f "$AUTOMERGE_FILE" ]]; then
    AUTOMERGE_JSON='{"enabledAt": "2024-01-01T00:00:00Z"}'
  fi

  if [[ $COUNT -le 1 ]]; then
    # first call: in progress
    echo '{"statusCheckRollup": [{"conclusion": null, "status": "IN_PROGRESS", "name": "test"}], "autoMergeRequest": '"$AUTOMERGE_JSON"', "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "chore(release): v1.32.0 🎉"}'
  else
    # subsequent calls: merged
    echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": '"$AUTOMERGE_JSON"', "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "chore(release): v1.32.0 🎉"}'
  fi
  exit 0
fi

# pr list - return release PR
if [[ "$ALL_ARGS" == *"pr list"* ]]; then
  if [[ "$ALL_ARGS" == *".title"* ]]; then
    echo 'chore(release): v1.32.0 🎉'
  else
    echo '99'
  fi
  exit 0
fi

# run list
if [[ "$ALL_ARGS" == *"run list"* ]]; then
  echo '[{"name": "publish.yml", "conclusion": "success", "status": "completed", "url": "https://github.com/test/repo/actions/runs/789"}]'
  exit 0
fi

echo "mock: unhandled gh $ALL_ARGS" >&2
exit 1
`;
          fs.writeFileSync(path.join(fakeBinDir, 'gh'), ghMock);
          fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

          // create mock rhachet at node_modules/.bin/rhachet (keyrack.operations.sh uses this path)
          const nodeModulesBinDir = path.join(tempDir, 'node_modules', '.bin');
          fs.mkdirSync(nodeModulesBinDir, { recursive: true });
          const rhachetMock = `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "get" ]]; then
  echo '{"grant":{"key":{"secret":"mock-github-token"}}}'
  exit 0
fi
echo "mock: unhandled rhachet $*" >&2
exit 1
`;
          fs.writeFileSync(
            path.join(nodeModulesBinDir, 'rhachet'),
            rhachetMock,
          );
          fs.chmodSync(path.join(nodeModulesBinDir, 'rhachet'), '755');

          // create a tag matching the PR title version
          spawnSync('git', ['tag', 'v1.32.0'], { cwd: tempDir });

          // setup git.commit.uses permission for apply mode
          const meterDir = path.join(tempDir, '.meter');
          fs.mkdirSync(meterDir, { recursive: true });
          fs.writeFileSync(
            path.join(meterDir, 'git.commit.uses.jsonc'),
            JSON.stringify({ uses: 'infinite', push: 'allow', stage: 'allow' }),
          );

          const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
            extraEnv: { GIT_RELEASE_POLL_INTERVAL: '0' },
          });

          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          expect(result.status).toEqual(0);
        });
      },
    );

    when('[t5] from main: release PR passed but no automerge', () => {
      then('adds automerge, watches merge, then watches tag', () => {
        const mockResponses = {
          'pr list': '99',
          'pr list title': 'chore(release): v1.32.0 🎉',
          // checks passed, no automerge, state OPEN initially
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "chore(release): v1.32.0 🎉"}',
          'pr merge': 'auto-merge enabled',
          'run list':
            '[{"name": "publish.yml", "conclusion": "success", "status": "completed", "url": "https://github.com/test/repo/actions/runs/789"}]',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          // create a tag matching the mock PR title version
          spawnSync('git', ['tag', 'v1.32.0'], { cwd: tempDir });

          const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
          });

          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });

    when('[t6] from main: no release PR but tag workflow in progress', () => {
      then('watches tag workflow until complete', () => {
        // stateful mock: first run list shows in-progress, second shows success
        const tempDir = genTempDir({
          slug: 'git-release-t6-tag-inflight',
          git: true,
        });

        // initialize git repo with commit (genTempDir only runs git init)
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

        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });

        // NOTE: use tempDir for state file so it's deterministic across gh invocations
        const ghMock = `#!/bin/bash
set -e
ALL_ARGS="$*"
STATE_FILE="${tempDir}/.gh-state"

# check for --limit 21 query (get_latest_merged_release_pr_info) - MUST come first
if [[ "$ALL_ARGS" == *"pr list"* ]] && [[ "$ALL_ARGS" == *"merged"* ]] && [[ "$ALL_ARGS" == *"--limit 21"* ]]; then
  # always return a prior merged release PR by default (realistic behavior)
  echo "title=chore(release): v1.2.3 🎉"
  exit 0
fi

# pr list - no release PR (other queries)
if [[ "$ALL_ARGS" == *"pr list"* ]]; then
  echo ''
  exit 0
fi

# run list - stateful
if [[ "$ALL_ARGS" == *"run list"* ]]; then
  COUNT=0
  if [[ -f "$STATE_FILE" ]]; then
    COUNT=$(cat "$STATE_FILE")
  fi
  COUNT=$((COUNT + 1))
  echo "$COUNT" > "$STATE_FILE"

  if [[ $COUNT -le 1 ]]; then
    # first call: in progress
    echo '[{"name": "publish.yml", "conclusion": null, "status": "in_progress", "url": "https://github.com/test/repo/actions/runs/789"}]'
  else
    # subsequent calls: success
    echo '[{"name": "publish.yml", "conclusion": "success", "status": "completed", "url": "https://github.com/test/repo/actions/runs/789"}]'
  fi
  exit 0
fi

echo "mock: unhandled gh $ALL_ARGS" >&2
exit 1
`;
        fs.writeFileSync(path.join(fakeBinDir, 'gh'), ghMock);
        fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

        // create mock rhachet at node_modules/.bin/rhachet (keyrack.operations.sh uses this path)
        const nodeModulesBinDir = path.join(tempDir, 'node_modules', '.bin');
        fs.mkdirSync(nodeModulesBinDir, { recursive: true });
        const rhachetMock = `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "get" ]]; then
  echo '{"grant":{"key":{"secret":"mock-github-token"}}}'
  exit 0
fi
echo "mock: unhandled rhachet $*" >&2
exit 1
`;
        fs.writeFileSync(path.join(nodeModulesBinDir, 'rhachet'), rhachetMock);
        fs.chmodSync(path.join(nodeModulesBinDir, 'rhachet'), '755');

        spawnSync('git', ['tag', 'v1.2.3'], { cwd: tempDir });

        // setup git.commit.uses permission for apply mode
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 'infinite', push: 'allow', stage: 'allow' }),
        );

        const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
          tempDir,
          fakeBinDir,
          extraEnv: { GIT_RELEASE_POLL_INTERVAL: '0' },
        });

        expect(asTimingStable(result.stdout)).toMatchSnapshot();
        expect(result.status).toEqual(0);
      });
    });

    when('[t7] from main: no release PR and no tag workflows', () => {
      then('reports latest tag with no workflows found', () => {
        const mockResponses = {
          'pr list': '',
          'run list': '[]', // no workflows
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['tag', 'v1.2.3'], { cwd: tempDir });

          const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
          });

          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          // might timeout or complete differently - let's see the snapshot
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case4b] release to prod from feat (apply mode)', () => {
    when('[t0] no PR exists', () => {
      then('fails fast with push hint', () => {
        const mockResponses = {
          'pr list': '', // no pr
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
          });

          // per vision: "crickets" for no PR found (informational)
          expect(result.stdout).toContain('crickets');
          expect(result.stdout).toContain('no open branch pr');
          expect(result.stdout).toContain('git.commit.push');
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          expect(result.status).toEqual(2); // constraint error
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] PR merges then release PR merges (full journey)', () => {
      then('runs --into main first then continues to release pr', () => {
        // stateful mock: first pr view is for feature branch (open), second is merged
        const tempDir = genTempDir({ slug: 'git-release-t5', git: true });
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });

        // counter file for stateful mock
        const counterFile = path.join(tempDir, '.gh-call-counter');
        fs.writeFileSync(counterFile, '0');

        // use dynamic timestamp so elapsed time is realistic
        const nowIso = new Date().toISOString();

        const ghMockContent = `#!/bin/bash
set -euo pipefail

COUNTER_FILE="${counterFile}"
COUNT=$(cat "$COUNTER_FILE")
NOW="${nowIso}"

CMD_KEY="$1 $2"

# capture all args to detect which PR type is requested
ALL_ARGS="$*"

case "$CMD_KEY" in
  "pr list")
    # detect if release PR request (has chore(release) in jq filter)
    if echo "$ALL_ARGS" | grep -q "chore(release)"; then
      # release PR request - check if asking for .title or .number
      if echo "$ALL_ARGS" | grep -q ".title"; then
        echo "chore(release): v1.2.3 🎉"
      else
        echo "99"
      fi
    else
      # feature branch PR request
      echo "42"
    fi
    ;;
  "pr view")
    # detect which PR via third arg (the PR number)
    PR_NUM="$3"

    if [[ "$PR_NUM" == "42" ]]; then
      # feature branch PR - use separate counter
      FEAT_COUNTER_FILE="${counterFile}.feat"
      if [[ ! -f "$FEAT_COUNTER_FILE" ]]; then echo "0" > "$FEAT_COUNTER_FILE"; fi
      FEAT_COUNT=$(cat "$FEAT_COUNTER_FILE")
      echo $((FEAT_COUNT + 1)) > "$FEAT_COUNTER_FILE"

      if [[ $FEAT_COUNT -lt 1 ]]; then
        # poll 1: checks active (2 checks)
        echo '{"statusCheckRollup": [{"conclusion": null, "status": "IN_PROGRESS", "name": "test-unit", "startedAt": "'$NOW'"}, {"conclusion": null, "status": "IN_PROGRESS", "name": "test-integration", "startedAt": "'$NOW'"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}'
      elif [[ $FEAT_COUNT -lt 2 ]]; then
        # poll 2: one check done (1 left)
        echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test-unit", "startedAt": "'$NOW'"}, {"conclusion": null, "status": "IN_PROGRESS", "name": "test-integration", "startedAt": "'$NOW'"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}'
      elif [[ $FEAT_COUNT -lt 3 ]]; then
        # poll 3: all checks done
        echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test-unit", "startedAt": "'$NOW'"}, {"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test-integration", "startedAt": "'$NOW'"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}'
      else
        # poll 4: merged
        echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "feat(oceans): add reef protection"}'
      fi
    elif [[ "$PR_NUM" == "99" ]]; then
      # release PR - use separate counter
      REL_COUNTER_FILE="${counterFile}.rel"
      if [[ ! -f "$REL_COUNTER_FILE" ]]; then echo "0" > "$REL_COUNTER_FILE"; fi
      REL_COUNT=$(cat "$REL_COUNTER_FILE")
      echo $((REL_COUNT + 1)) > "$REL_COUNTER_FILE"

      if [[ $REL_COUNT -lt 1 ]]; then
        # poll 1: active
        echo '{"statusCheckRollup": [{"conclusion": null, "status": "IN_PROGRESS", "name": "release-ci", "startedAt": "'$NOW'"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "chore(release): v1.2.3"}'
      elif [[ $REL_COUNT -lt 2 ]]; then
        # poll 2: checks done
        echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "release-ci", "startedAt": "'$NOW'"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "chore(release): v1.2.3"}'
      else
        # poll 3: merged
        echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "release-ci"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "chore(release): v1.2.3"}'
      fi
    else
      # fallback: merged state
      echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "chore(release): v1.2.3"}'
    fi
    ;;
  "pr merge")
    echo "auto-merge enabled"
    ;;
  "run list")
    # tag workflow polls
    RUN_COUNTER_FILE="${counterFile}.run"
    if [[ ! -f "$RUN_COUNTER_FILE" ]]; then
      echo "0" > "$RUN_COUNTER_FILE"
    fi
    RUN_COUNT=$(cat "$RUN_COUNTER_FILE")
    echo $((RUN_COUNT + 1)) > "$RUN_COUNTER_FILE"
    if [[ $RUN_COUNT -lt 1 ]]; then
      # poll 1: in progress
      echo '[{"name": "publish.yml", "conclusion": null, "status": "in_progress", "url": "https://github.com/test/repo/actions/runs/789"}]'
    else
      # poll 2: completed
      echo '[{"name": "publish.yml", "conclusion": "success", "status": "completed", "url": "https://github.com/test/repo/actions/runs/789"}]'
    fi
    ;;
  "run view")
    echo '{"startedAt": "'$NOW'", "updatedAt": "'$NOW'"}'
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
        // keyrack.operations.sh uses absolute path: "$repo_root/node_modules/.bin/rhachet"
        const rhachetMock = `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "get" ]]; then
  echo '{"grant":{"key":{"secret":"mock-github-token"}}}'
  exit 0
fi
exit 1
`;
        // create at node_modules/.bin path (keyrack.operations.sh uses absolute path)
        const nodeModulesBinDir = path.join(tempDir, 'node_modules', '.bin');
        fs.mkdirSync(nodeModulesBinDir, { recursive: true });
        fs.writeFileSync(path.join(nodeModulesBinDir, 'rhachet'), rhachetMock);
        fs.chmodSync(path.join(nodeModulesBinDir, 'rhachet'), '755');

        // setup git repo
        spawnSync('git', ['tag', 'v1.2.3'], { cwd: tempDir });
        spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
          cwd: tempDir,
        });

        // setup git.commit.uses permission for apply mode
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 'infinite', push: 'allow', stage: 'allow' }),
        );

        const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
          tempDir,
          fakeBinDir,
        });

        // should show unified prod header
        expect(result.stdout).toContain('git.release --into prod');
        // should show feature branch release
        expect(result.stdout).toContain('feat(oceans): add reef protection');
        // then should show release PR
        expect(result.stdout).toContain('chore(release)');
        // then should show tag workflow watch
        expect(result.stdout).toContain('v1.2.3');
        expect(asTimingStable(result.stdout)).toMatchSnapshot();
        expect(result.status).toEqual(0);
      });
    });

    when(
      '[t2] release PR merges immediately after feature PR (no automerge was set on release)',
      () => {
        then(
          'shows feature PR watch then release PR -> and merged already',
          () => {
            // scenario: feature branch PR merges normally, then when we get to release PR,
            // it has all checks passed but no automerge. when we enable automerge, gh returns
            // "clean status" error because PR is ready to merge immediately
            const tempDir = genTempDir({ slug: 'git-release-t6', git: true });
            const fakeBinDir = path.join(tempDir, '.fakebin');
            fs.mkdirSync(fakeBinDir, { recursive: true });

            // counter file for stateful mock
            const counterFile = path.join(tempDir, '.gh-call-counter');
            fs.writeFileSync(counterFile, '0');

            // use dynamic timestamp so elapsed time is realistic
            const nowIso = new Date().toISOString();

            const ghMockContent = `#!/bin/bash
set -euo pipefail

COUNTER_FILE="${counterFile}"
NOW="${nowIso}"
ALL_ARGS="$*"
CMD_KEY="$1 $2"

case "$CMD_KEY" in
  "pr list")
    # detect if release PR request (has chore(release) in jq filter)
    if echo "$ALL_ARGS" | grep -q "chore(release)"; then
      # release PR request - check if filter ends with .number or .title
      # note: both queries have .title in the middle (in select), so check for .number at the end
      if echo "$ALL_ARGS" | grep -q "| \\.number"; then
        echo "99"
      else
        echo "chore(release): v1.32.0 🎉"
      fi
    else
      # feature branch PR request
      echo "42"
    fi
    ;;
  "pr view")
    # detect which PR via 3rd arg: gh pr view PR_NUM --json ...
    PR_NUM="$3"

    if [[ "$PR_NUM" == "42" ]]; then
      # feature branch PR - use separate counter
      FEAT_COUNTER_FILE="${counterFile}.feat"
      if [[ ! -f "$FEAT_COUNTER_FILE" ]]; then echo "0" > "$FEAT_COUNTER_FILE"; fi
      FEAT_COUNT=$(cat "$FEAT_COUNTER_FILE")
      echo $((FEAT_COUNT + 1)) > "$FEAT_COUNTER_FILE"

      if [[ $FEAT_COUNT -lt 1 ]]; then
        # poll 1: checks in progress
        echo '{"statusCheckRollup": [{"conclusion": null, "status": "IN_PROGRESS", "name": "test", "startedAt": "'$NOW'"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}'
      elif [[ $FEAT_COUNT -lt 2 ]]; then
        # poll 2: checks done, automerge set
        echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test", "startedAt": "'$NOW'"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}'
      else
        # poll 3: merged
        echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "feat(oceans): add reef protection"}'
      fi
    elif [[ "$PR_NUM" == "99" ]]; then
      # release PR - use separate counter
      REL_COUNTER_FILE="${counterFile}.rel"
      if [[ ! -f "$REL_COUNTER_FILE" ]]; then echo "0" > "$REL_COUNTER_FILE"; fi
      REL_COUNT=$(cat "$REL_COUNTER_FILE")
      echo $((REL_COUNT + 1)) > "$REL_COUNTER_FILE"

      if [[ $REL_COUNT -lt 1 ]]; then
        # first call: PR is open with passed checks, NO automerge
        echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "release-ci", "startedAt": "'$NOW'"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "chore(release): v1.32.0"}'
      else
        # second call: PR is now merged (instant merge)
        echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "release-ci"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "chore(release): v1.32.0"}'
      fi
    else
      # fallback: merged state
      echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "chore(release): v1.32.0"}'
    fi
    ;;
  "pr merge")
    # detect which PR via PR number in args
    if echo "$ALL_ARGS" | grep -q "99"; then
      # release PR: simulate "clean status" error - PR is ready to merge immediately
      echo "GraphQL: Pull request is in clean status (enablePullRequestAutoMerge)" >&2
      exit 1
    else
      # feature PR: normal automerge enable
      echo "auto-merge enabled"
    fi
    ;;
  "run list")
    echo '[{"name": "publish.yml", "conclusion": "success", "status": "completed", "url": "https://github.com/test/repo/actions/runs/789"}]'
    ;;
  "run view")
    echo '{"startedAt": "'$NOW'", "updatedAt": "'$NOW'"}'
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
  echo '{"grant":{"key":{"secret":"mock-github-token"}}}'
  exit 0
fi
exit 1
`;
            const nodeModulesBinDir = path.join(
              tempDir,
              'node_modules',
              '.bin',
            );
            fs.mkdirSync(nodeModulesBinDir, { recursive: true });
            fs.writeFileSync(
              path.join(nodeModulesBinDir, 'rhachet'),
              rhachetMock,
            );
            fs.chmodSync(path.join(nodeModulesBinDir, 'rhachet'), '755');

            // setup git repo on feature branch with tag version that matches mock PR title
            spawnSync('git', ['tag', 'v1.32.0'], { cwd: tempDir });
            spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
              cwd: tempDir,
            });

            // setup git.commit.uses permission for apply mode
            const meterDir = path.join(tempDir, '.meter');
            fs.mkdirSync(meterDir, { recursive: true });
            fs.writeFileSync(
              path.join(meterDir, 'git.commit.uses.jsonc'),
              JSON.stringify({
                uses: 'infinite',
                push: 'allow',
                stage: 'allow',
              }),
            );

            const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
              tempDir,
              fakeBinDir,
            });

            // should show feature branch watch
            expect(result.stdout).toContain(
              'feat(oceans): add reef protection',
            );
            // should show release PR with instant merge
            expect(result.stdout).toContain('chore(release)');
            expect(result.stdout).toContain('-> and merged already');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);

            fs.rmSync(tempDir, { recursive: true, force: true });
          },
        );
      },
    );

    when('[t3] feature PR already merged (not part of current run)', () => {
      then('proceeds directly to release PR', () => {
        // scenario: feature branch PR was merged separately (by another mechanic, manually, etc)
        // when we run --into prod, it should skip to release PR immediately
        const tempDir = genTempDir({
          slug: 'git-release-feat-merged',
          git: true,
        });
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });

        const counterFile = path.join(tempDir, '.gh-call-counter');
        fs.writeFileSync(counterFile, '0');

        const nowIso = new Date().toISOString();

        const ghMockContent = `#!/bin/bash
set -euo pipefail

COUNTER_FILE="${counterFile}"
NOW="${nowIso}"
ALL_ARGS="$*"
CMD_KEY="$1 $2"

case "$CMD_KEY" in
  "pr list")
    # detect if release PR request (has chore(release) in jq filter)
    if echo "$ALL_ARGS" | grep -q "chore(release)"; then
      # check if filter asks for .title or .number
      if echo "$ALL_ARGS" | grep -q ".title"; then
        echo "chore(release): v1.32.0 🎉"
      else
        echo "99"
      fi
    else
      # feature branch PR request - return merged PR in merged state lookup
      if echo "$ALL_ARGS" | grep -q "merged"; then
        echo "42"
      else
        # no open PR
        echo ""
      fi
    fi
    ;;
  "pr view")
    PR_NUM="$3"
    if [[ "$PR_NUM" == "42" ]]; then
      # feature branch PR - already merged
      echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "feat(oceans): add reef protection"}'
    elif [[ "$PR_NUM" == "99" ]]; then
      # release PR - use counter for state transitions
      REL_COUNTER_FILE="${counterFile}.rel"
      if [[ ! -f "$REL_COUNTER_FILE" ]]; then echo "0" > "$REL_COUNTER_FILE"; fi
      REL_COUNT=$(cat "$REL_COUNTER_FILE")
      echo $((REL_COUNT + 1)) > "$REL_COUNTER_FILE"

      if [[ $REL_COUNT -lt 1 ]]; then
        # poll 1: checks in progress
        echo '{"statusCheckRollup": [{"conclusion": null, "status": "IN_PROGRESS", "name": "release-ci", "startedAt": "'$NOW'"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "chore(release): v1.32.0 🎉"}'
      elif [[ $REL_COUNT -lt 2 ]]; then
        # poll 2: checks done, automerge enabled
        echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "release-ci", "startedAt": "'$NOW'"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "chore(release): v1.32.0 🎉"}'
      else
        # poll 3: merged
        echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "release-ci"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "chore(release): v1.32.0 🎉"}'
      fi
    else
      echo '{"statusCheckRollup": [], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "chore(release): v1.32.0 🎉"}'
    fi
    ;;
  "pr merge")
    echo "auto-merge enabled"
    ;;
  "run list")
    echo '[{"name": "publish.yml", "conclusion": "success", "status": "completed", "url": "https://github.com/test/repo/actions/runs/789"}]'
    ;;
  "run view")
    echo '{"startedAt": "'$NOW'", "updatedAt": "'$NOW'"}'
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
  echo '{"grant":{"key":{"secret":"mock-github-token"}}}'
  exit 0
fi
exit 1
`;
        const nodeModulesBinDir = path.join(tempDir, 'node_modules', '.bin');
        fs.mkdirSync(nodeModulesBinDir, { recursive: true });
        fs.writeFileSync(path.join(nodeModulesBinDir, 'rhachet'), rhachetMock);
        fs.chmodSync(path.join(nodeModulesBinDir, 'rhachet'), '755');

        // tag version must match mock PR title version
        spawnSync('git', ['tag', 'v1.32.0'], { cwd: tempDir });
        spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
          cwd: tempDir,
        });

        // setup git.commit.uses permission for apply mode
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 'infinite', push: 'allow', stage: 'allow' }),
        );

        const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
          tempDir,
          fakeBinDir,
        });

        // should show feature branch as already merged
        expect(result.stdout).toContain('feat(oceans): add reef protection');
        expect(result.stdout).toContain('merged');
        // should proceed to release PR
        expect(result.stdout).toContain('chore(release)');
        expect(asTimingStable(result.stdout)).toMatchSnapshot();
        expect(result.status).toEqual(0);

        fs.rmSync(tempDir, { recursive: true, force: true });
      });
    });

    when('[t4] feature PR checks still in progress', () => {
      then('watches and waits for checks to pass before continuing', () => {
        // scenario: feature PR checks are still running, skill watches until they complete
        const tempDir = genTempDir({
          slug: 'git-release-feat-progress',
          git: true,
        });
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });

        const counterFile = path.join(tempDir, '.gh-call-counter');
        fs.writeFileSync(counterFile, '0');

        const nowIso = new Date().toISOString();

        const ghMockContent = `#!/bin/bash
set -euo pipefail

COUNTER_FILE="${counterFile}"
NOW="${nowIso}"
ALL_ARGS="$*"
CMD_KEY="$1 $2"

case "$CMD_KEY" in
  "pr list")
    if echo "$ALL_ARGS" | grep -q "chore(release)"; then
      if echo "$ALL_ARGS" | grep -q ".title"; then
        echo "chore(release): v1.32.0 🎉"
      else
        echo "99"
      fi
    else
      echo "42"
    fi
    ;;
  "pr view")
    PR_NUM="$3"
    if [[ "$PR_NUM" == "42" ]]; then
      # feature branch PR - starts in progress, transitions through polls
      FEAT_COUNTER_FILE="${counterFile}.feat"
      if [[ ! -f "$FEAT_COUNTER_FILE" ]]; then echo "0" > "$FEAT_COUNTER_FILE"; fi
      FEAT_COUNT=$(cat "$FEAT_COUNTER_FILE")
      echo $((FEAT_COUNT + 1)) > "$FEAT_COUNTER_FILE"

      if [[ $FEAT_COUNT -lt 1 ]]; then
        # poll 1: checks still in progress (3 checks)
        echo '{"statusCheckRollup": [{"conclusion": null, "status": "IN_PROGRESS", "name": "test-unit", "startedAt": "'$NOW'"}, {"conclusion": null, "status": "IN_PROGRESS", "name": "test-integration", "startedAt": "'$NOW'"}, {"conclusion": null, "status": "IN_PROGRESS", "name": "lint", "startedAt": "'$NOW'"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}'
      elif [[ $FEAT_COUNT -lt 2 ]]; then
        # poll 2: some checks done, some in progress
        echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test-unit", "startedAt": "'$NOW'"}, {"conclusion": null, "status": "IN_PROGRESS", "name": "test-integration", "startedAt": "'$NOW'"}, {"conclusion": "SUCCESS", "status": "COMPLETED", "name": "lint", "startedAt": "'$NOW'"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}'
      elif [[ $FEAT_COUNT -lt 3 ]]; then
        # poll 3: all checks done
        echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test-unit", "startedAt": "'$NOW'"}, {"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test-integration", "startedAt": "'$NOW'"}, {"conclusion": "SUCCESS", "status": "COMPLETED", "name": "lint", "startedAt": "'$NOW'"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}'
      else
        # poll 4: merged
        echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "feat(oceans): add reef protection"}'
      fi
    elif [[ "$PR_NUM" == "99" ]]; then
      REL_COUNTER_FILE="${counterFile}.rel"
      if [[ ! -f "$REL_COUNTER_FILE" ]]; then echo "0" > "$REL_COUNTER_FILE"; fi
      REL_COUNT=$(cat "$REL_COUNTER_FILE")
      echo $((REL_COUNT + 1)) > "$REL_COUNTER_FILE"

      if [[ $REL_COUNT -lt 1 ]]; then
        echo '{"statusCheckRollup": [{"conclusion": null, "status": "IN_PROGRESS", "name": "release-ci", "startedAt": "'$NOW'"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "chore(release): v1.32.0 🎉"}'
      elif [[ $REL_COUNT -lt 2 ]]; then
        echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "release-ci", "startedAt": "'$NOW'"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "chore(release): v1.32.0 🎉"}'
      else
        echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "release-ci"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "chore(release): v1.32.0 🎉"}'
      fi
    else
      echo '{"statusCheckRollup": [], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "chore(release): v1.32.0 🎉"}'
    fi
    ;;
  "pr merge")
    echo "auto-merge enabled"
    ;;
  "run list")
    echo '[{"name": "publish.yml", "conclusion": "success", "status": "completed", "url": "https://github.com/test/repo/actions/runs/789"}]'
    ;;
  "run view")
    echo '{"startedAt": "'$NOW'", "updatedAt": "'$NOW'"}'
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
  echo '{"grant":{"key":{"secret":"mock-github-token"}}}'
  exit 0
fi
exit 1
`;
        const nodeModulesBinDir = path.join(tempDir, 'node_modules', '.bin');
        fs.mkdirSync(nodeModulesBinDir, { recursive: true });
        fs.writeFileSync(path.join(nodeModulesBinDir, 'rhachet'), rhachetMock);
        fs.chmodSync(path.join(nodeModulesBinDir, 'rhachet'), '755');

        // tag version must match mock PR title version
        spawnSync('git', ['tag', 'v1.32.0'], { cwd: tempDir });
        spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
          cwd: tempDir,
        });

        // setup git.commit.uses permission for apply mode
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 'infinite', push: 'allow', stage: 'allow' }),
        );

        const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
          tempDir,
          fakeBinDir,
        });

        // should show progress through watch
        expect(result.stdout).toContain('feat(oceans): add reef protection');
        expect(result.stdout).toContain('in progress');
        expect(result.stdout).toContain('chore(release)');
        expect(asTimingStable(result.stdout)).toMatchSnapshot();
        expect(result.status).toEqual(0);

        fs.rmSync(tempDir, { recursive: true, force: true });
      });
    });
  });

  given('[case5] retry behavior', () => {
    when('[t0] --retry without --apply (retry-only)', () => {
      then('reruns failed workflows and exits success without watch', () => {
        // mock includes separate responses for step name vs duration (Gap 5)
        const mockResponses = {
          'pr list': '42',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "FAILURE", "status": "COMPLETED", "name": "test-unit", "detailsUrl": "https://github.com/test/repo/actions/runs/123"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}',
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

          // note: --retry alone (no --apply or --watch) triggers rerun and exits 0
          // per blueprint: user monitors separately with --watch
          const result = runSkill(['--into', 'main', '--retry'], {
            tempDir,
            fakeBinDir,
          });

          console.log('DEBUG STDOUT:', result.stdout);
          console.log('DEBUG STDERR:', result.stderr);
          console.log('DEBUG STATUS:', result.status);

          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          // retry was triggered successfully — exit 0 (use --watch to monitor)
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] --retry with failed tag workflows', () => {
      then('reruns failed tag workflows', () => {
        // base mock responses - run list will be overridden with stateful mock
        const mockResponses = {
          'pr list': '',
          'run rerun': 'rerun triggered',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['tag', 'v1.2.3'], { cwd: tempDir });

          // create stateful mock for run list: in_progress first, then failure
          const counterFile = path.join(tempDir, '.run-list-counter');
          fs.writeFileSync(counterFile, '0');

          // override gh mock with stateful run list
          // sequence: failure (retry check) → in_progress (watch poll 1) → failure (watch poll 2)
          const ghMockPath = path.join(fakeBinDir, 'gh');
          const statefulGhMock = `#!/bin/bash
set -euo pipefail

CMD_KEY="$1 $2"

if [[ "$CMD_KEY" == "run list" ]]; then
  COUNTER_FILE="${counterFile}"
  COUNT=$(cat "$COUNTER_FILE")
  NEW_COUNT=$((COUNT + 1))
  echo "$NEW_COUNT" > "$COUNTER_FILE"

  if [[ "$COUNT" -eq 0 ]]; then
    # first call (retry check): failure → triggers rerun
    echo '[{"name": "publish.yml", "conclusion": "failure", "status": "completed", "url": "https://github.com/test/repo/actions/runs/789"}]'
  elif [[ "$COUNT" -eq 1 ]]; then
    # second call (watch poll 1): in progress → shows 💤 line
    echo '[{"name": "publish.yml", "conclusion": null, "status": "in_progress", "url": "https://github.com/test/repo/actions/runs/789"}]'
  else
    # third call (watch poll 2): failure → shows failure tree
    echo '[{"name": "publish.yml", "conclusion": "failure", "status": "completed", "url": "https://github.com/test/repo/actions/runs/789"}]'
  fi
  exit 0
fi

if [[ "$CMD_KEY" == "run rerun" ]]; then
  echo "rerun triggered"
  exit 0
fi

# check for --limit 21 query (get_latest_merged_release_pr_info) - MUST come first
if [[ "$CMD_KEY" == "pr list" ]] && [[ "$*" == *"merged"* ]] && [[ "$*" == *"--limit 21"* ]]; then
  # always return a prior merged release PR by default (realistic behavior)
  echo "title=chore(release): v1.2.3 🎉"
  exit 0
fi

if [[ "$CMD_KEY" == "pr list" ]]; then
  echo ""
  exit 0
fi

echo "mock: unhandled gh $*" >&2
exit 1
`;
          fs.writeFileSync(ghMockPath, statefulGhMock);
          fs.chmodSync(ghMockPath, '755');

          const result = runSkill(
            ['--into', 'prod', '--mode', 'apply', '--retry'],
            {
              tempDir,
              fakeBinDir,
              extraEnv: { GIT_RELEASE_POLL_INTERVAL: '0.1' },
            },
          );

          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          // still fails because workflow still shows failure
          // per spec: failed checks are constraint errors (exit 2)
          expect(result.status).toEqual(2);
        } finally {
          cleanup();
        }
      });
    });

    when(
      '[t2] --retry with failed tag workflows, 3+ poll cycles before failure',
      () => {
        then('shows 3+ sleep cycles then still fails', () => {
          // tests the scenario where retry triggers rerun but checks still fail after watch
          const mockResponses = {
            'pr list': '',
            'run rerun': 'rerun triggered',
          };

          const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

          try {
            spawnSync('git', ['tag', 'v1.2.3'], { cwd: tempDir });

            // create stateful mock for run list with 4 poll cycles before failure
            const counterFile = path.join(tempDir, '.run-list-counter');
            fs.writeFileSync(counterFile, '0');

            const ghMockPath = path.join(fakeBinDir, 'gh');
            const statefulGhMock = `#!/bin/bash
set -euo pipefail

CMD_KEY="$1 $2"

if [[ "$CMD_KEY" == "run list" ]]; then
  COUNTER_FILE="${counterFile}"
  COUNT=$(cat "$COUNTER_FILE")
  NEW_COUNT=$((COUNT + 1))
  echo "$NEW_COUNT" > "$COUNTER_FILE"

  if [[ "$COUNT" -lt 2 ]]; then
    # first two calls (status check + show_failed_tag_runs_in_status): failure → triggers rerun
    echo '[{"name": "publish.yml", "conclusion": "failure", "status": "completed", "url": "https://github.com/test/repo/actions/runs/789"}]'
  elif [[ "$COUNT" -lt 9 ]]; then
    # calls 2-8 (watch polls): in progress → shows 💤 lines (need extra buffer for multiple calls per poll)
    echo '[{"name": "publish.yml", "conclusion": null, "status": "in_progress", "url": "https://github.com/test/repo/actions/runs/789"}]'
  else
    # call 9+ (final poll): failure again → retry did not help
    echo '[{"name": "publish.yml", "conclusion": "failure", "status": "completed", "url": "https://github.com/test/repo/actions/runs/789"}]'
  fi
  exit 0
fi

if [[ "$CMD_KEY" == "run rerun" ]]; then
  echo "rerun triggered"
  exit 0
fi

# check for --limit 21 query (get_latest_merged_release_pr_info) - MUST come first
if [[ "$CMD_KEY" == "pr list" ]] && [[ "$*" == *"merged"* ]] && [[ "$*" == *"--limit 21"* ]]; then
  echo "title=chore(release): v1.2.3 🎉"
  exit 0
fi

if [[ "$CMD_KEY" == "pr list" ]]; then
  echo ""
  exit 0
fi

echo "mock: unhandled gh $*" >&2
exit 1
`;
            fs.writeFileSync(ghMockPath, statefulGhMock);
            fs.chmodSync(ghMockPath, '755');

            const result = runSkill(
              ['--into', 'prod', '--mode', 'apply', '--retry'],
              {
                tempDir,
                fakeBinDir,
                extraEnv: { GIT_RELEASE_POLL_INTERVAL: '0.1' },
              },
            );

            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            // verify we see 3+ poll cycles in output (💤 lines)
            const pollLines = result.stdout
              .split('\n')
              .filter((line: string) => line.includes('💤'));
            expect(pollLines.length).toBeGreaterThanOrEqual(3);
            // still fails because workflow still shows failure after retry
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      },
    );
  });

  given('[case6] boundary conditions', () => {
    when('[t0] keyrack locked', () => {
      then('shows unlock instructions', () => {
        const mockResponses = {
          'pr list': '42',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          // override rhachet mock to return exit 1 (locked)
          // keyrack.operations.sh uses "$repo_root/node_modules/.bin/rhachet"
          const rhachetPath = path.join(
            tempDir,
            'node_modules',
            '.bin',
            'rhachet',
          );
          fs.writeFileSync(rhachetPath, '#!/bin/bash\nexit 1');
          fs.chmodSync(rhachetPath, '755');

          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          // custom runSkill without EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN
          // so keyrack locked scenario is actually tested
          const result = spawnSync(
            'bash',
            [SKILL_PATH, '--into', 'main', '--mode', 'apply'],
            {
              cwd: tempDir,
              env: {
                ...process.env,
                PATH: `${fakeBinDir}:${process.env.PATH}`,
                TERM: 'dumb',
                HOME: tempDir,
                EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: '', // explicitly empty
              },
              encoding: 'utf-8',
            },
          );

          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          expect(result.status).toEqual(1);
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case7] argument validation', () => {
    when('[t0] --into invalid value', () => {
      then('shows error and exits 2', () => {
        const { tempDir, fakeBinDir, cleanup } = setupTestEnv({});

        try {
          const result = runSkill(['--into', 'invalid'], {
            tempDir,
            fakeBinDir,
          });

          expect(result.stderr).toContain("--into must be 'main' or 'prod'");
          expect(result.stderr).toMatchSnapshot();
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
          const result = runSkill(['--into', 'main', '--mode', 'invalid'], {
            tempDir,
            fakeBinDir,
          });

          expect(result.stderr).toContain("--mode must be 'plan' or 'apply'");
          expect(result.stderr).toMatchSnapshot();
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
          const result = spawnSync('bash', [SKILL_PATH, '--into', 'main'], {
            cwd: tempDir,
            env: {
              ...process.env,
              PATH: `${fakeBinDir}:${process.env.PATH}`,
              TERM: 'dumb',
            },
            encoding: 'utf-8',
          });

          expect(result.stderr).toContain('not in a git repository');
          expect(result.stderr).toMatchSnapshot();
          expect(result.status).toEqual(2);
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });

    when('[t3] no arguments (defaults to --into main)', () => {
      then('defaults to --into main and shows status', () => {
        const mockResponses = {
          'pr list': '42',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}',
        };
        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          // create feature branch to test --into main behavior
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill([], { tempDir, fakeBinDir });

          // should default to --into main behavior
          expect(result.stdout).toContain('git.release --into main');
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          expect(result.status).toEqual(0);
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

          expect(result.stdout).toContain('--into main');
          expect(result.stdout).toContain('--into prod');
          expect(result.stdout).toContain('--retry');
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });

    when('[t5] multiple release PRs (ambiguous)', () => {
      then('fails fast with error message', () => {
        const tempDir = genTempDir({
          slug: 'git-release-ambiguous',
          git: true,
        });
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });

        // mock gh to return multiple release PRs
        // note: the jq filter has both .title (in select) and .number (final extraction)
        // we check for "| .title'" (jq ends with .title) to distinguish get_release_pr_title from get_release_pr
        const ghMock = `#!/bin/bash
set -euo pipefail
CMD_KEY="$1 $2"
ALL_ARGS="$*"

case "$CMD_KEY" in
  "pr list")
    if echo "$ALL_ARGS" | grep -q "chore(release)"; then
      # return multiple PRs (ambiguous)
      # check if jq ends with .title (get_release_pr_title) vs .number (get_release_pr)
      if echo "$ALL_ARGS" | grep -q "| \\.title'"; then
        echo "chore(release): v1.32.0 🎉"
        echo "chore(release): v1.31.0 🎉"
      else
        echo "99"
        echo "98"
      fi
    else
      echo "42"
    fi
    ;;
  "pr view")
    # should never reach here if fail-fast works
    echo '{"statusCheckRollup": [], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}'
    ;;
  *)
    echo "mock: unhandled $*" >&2
    exit 1
    ;;
esac
`;
        fs.writeFileSync(path.join(fakeBinDir, 'gh'), ghMock);
        fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

        try {
          spawnSync('git', ['checkout', '-b', 'main'], { cwd: tempDir });

          const result = spawnSync('bash', [SKILL_PATH, '--into', 'prod'], {
            cwd: tempDir,
            env: {
              ...process.env,
              PATH: `${fakeBinDir}:${process.env.PATH}`,
              TERM: 'dumb',
            },
            encoding: 'utf-8',
          });

          expect(result.stderr).toContain('multiple release PRs found');
          expect(result.stderr).toContain('expected at most one');
          expect(result.status).toEqual(1);
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });

    when('[t6] --dirty invalid value', () => {
      then('shows error and exits 2', () => {
        const { tempDir, fakeBinDir, cleanup } = setupTestEnv({});

        try {
          const result = runSkill(['--into', 'main', '--dirty', 'invalid'], {
            tempDir,
            fakeBinDir,
          });

          expect(result.stderr).toContain("--dirty must be 'block' or 'allow'");
          expect(result.status).toEqual(2);
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case9] dirty state detection', () => {
    when(
      '[t0] apply mode with modified tracked file (default --dirty block)',
      () => {
        then('fails fast with hint to stash or use --dirty allow', () => {
          const mockResponses = {
            'pr list': '42',
            'pr view':
              '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}',
          };

          const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

          try {
            spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
              cwd: tempDir,
            });

            // create a tracked file and modify it to trigger dirty check
            fs.writeFileSync(path.join(tempDir, 'tracked.txt'), 'original');
            spawnSync('git', ['add', 'tracked.txt'], { cwd: tempDir });
            spawnSync('git', ['commit', '-m', 'add tracked file'], {
              cwd: tempDir,
            });
            fs.writeFileSync(path.join(tempDir, 'tracked.txt'), 'modified');

            const result = runSkill(['--into', 'main', '--mode', 'apply'], {
              tempDir,
              fakeBinDir,
            });

            expect(result.stdout).toContain('hold up dude');
            expect(result.stdout).toContain('uncommitted changes');
            expect(result.stdout).toContain('--dirty allow');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2); // constraint error
          } finally {
            cleanup();
          }
        });
      },
    );

    when('[t1] apply mode with modified tracked file and --dirty allow', () => {
      then('proceeds with release', () => {
        const mockResponses = {
          'pr list': '42',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "feat(oceans): add reef protection"}',
          'pr merge': 'auto-merge enabled',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          // create a tracked file and modify it
          fs.writeFileSync(path.join(tempDir, 'tracked.txt'), 'original');
          spawnSync('git', ['add', 'tracked.txt'], { cwd: tempDir });
          spawnSync('git', ['commit', '-m', 'add tracked file'], {
            cwd: tempDir,
          });
          fs.writeFileSync(path.join(tempDir, 'tracked.txt'), 'modified');

          const result = runSkill(
            ['--into', 'main', '--mode', 'apply', '--dirty', 'allow'],
            {
              tempDir,
              fakeBinDir,
            },
          );

          // should proceed despite modified tracked file
          expect(result.stdout).toContain('cowabunga');
          expect(result.stdout).not.toContain('uncommitted changes');
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });

    when('[t2] plan mode ignores dirty state', () => {
      then('does not fail (dirty check only on apply)', () => {
        const mockResponses = {
          'pr list': '42',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          // create a tracked file and modify it
          fs.writeFileSync(path.join(tempDir, 'tracked.txt'), 'original');
          spawnSync('git', ['add', 'tracked.txt'], { cwd: tempDir });
          spawnSync('git', ['commit', '-m', 'add tracked file'], {
            cwd: tempDir,
          });
          fs.writeFileSync(path.join(tempDir, 'tracked.txt'), 'modified');

          const result = runSkill(['--into', 'main'], {
            tempDir,
            fakeBinDir,
          });

          // plan mode should not check for dirty state
          expect(result.stdout).toContain('heres the wave');
          expect(result.stdout).not.toContain('uncommitted changes');
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });

    when('[t3] apply mode with clean state', () => {
      then('proceeds without dirty warning', () => {
        const mockResponses = {
          'pr list': '42',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "feat(oceans): add reef protection"}',
          'pr merge': 'auto-merge enabled',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          // no unstaged changes - clean state

          const result = runSkill(['--into', 'main', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
          });

          // should proceed without dirty warning
          expect(result.stdout).toContain('cowabunga');
          expect(result.stdout).not.toContain('unstaged changes');
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
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
            '{"statusCheckRollup": [{"conclusion": null, "status": "IN_PROGRESS", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          // plan mode shows current status without watch
          const result = runSkill(['--into', 'main'], { tempDir, fakeBinDir });

          expect(result.stdout).toContain('in progress');
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
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
      echo '{"statusCheckRollup": [{"conclusion": null, "status": "IN_PROGRESS", "name": "test-unit", "startedAt": "${nowIso}"}, {"conclusion": null, "status": "IN_PROGRESS", "name": "test-integration", "startedAt": "${nowIso}"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}'
    elif [[ $COUNT -lt 3 ]]; then
      # third call: one done, one in progress
      echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test-unit", "startedAt": "${nowIso}"}, {"conclusion": null, "status": "IN_PROGRESS", "name": "test-integration", "startedAt": "${nowIso}"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}'
    else
      # subsequent calls: merged
      echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test-unit", "startedAt": "${nowIso}"}, {"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test-integration", "startedAt": "${nowIso}"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "feat(oceans): add reef protection"}'
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
        // keyrack.operations.sh uses absolute path: "$repo_root/node_modules/.bin/rhachet"
        const rhachetMockContent = `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "get" ]]; then
  echo '{"grant":{"key":{"secret":"mock-github-token"}}}'
  exit 0
fi
echo "mock: unhandled rhachet $*" >&2
exit 1
`;
        // create at node_modules/.bin path (keyrack.operations.sh uses absolute path)
        const nodeModulesBinDir = path.join(tempDir, 'node_modules', '.bin');
        fs.mkdirSync(nodeModulesBinDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesBinDir, 'rhachet'),
          rhachetMockContent,
        );
        fs.chmodSync(path.join(nodeModulesBinDir, 'rhachet'), '755');

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

        // setup git.commit.uses permission for apply mode
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 'infinite', push: 'allow', stage: 'allow' }),
        );

        try {
          // apply mode with watch - should show poll progress
          const result = spawnSync(
            'bash',
            [SKILL_PATH, '--into', 'main', '--mode', 'apply'],
            {
              cwd: tempDir,
              env: {
                ...process.env,
                PATH: `${fakeBinDir}:${process.env.PATH}`,
                TERM: 'dumb',
                HOME: tempDir,
                EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token',
                // skip sleeps in test mode
                GIT_RELEASE_TEST_MODE: 'true',
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
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
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
      echo '{"statusCheckRollup": [{"conclusion": null, "status": "IN_PROGRESS", "name": "test"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}'
    else
      # after 2nd poll: another PR merged, now BEHIND (needs rebase)
      echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "BEHIND", "state": "OPEN", "title": "feat(oceans): add reef protection"}'
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
        // keyrack.operations.sh uses absolute path: "$repo_root/node_modules/.bin/rhachet"
        const rhachetMockContent2 = `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "get" ]]; then
  echo '{"grant":{"key":{"secret":"mock-github-token"}}}'
  exit 0
fi
exit 1
`;
        // create at node_modules/.bin path (keyrack.operations.sh uses absolute path)
        const nodeModulesBinDir2 = path.join(tempDir, 'node_modules', '.bin');
        fs.mkdirSync(nodeModulesBinDir2, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesBinDir2, 'rhachet'),
          rhachetMockContent2,
        );
        fs.chmodSync(path.join(nodeModulesBinDir2, 'rhachet'), '755');

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

        // setup git.commit.uses permission for apply mode
        const meterDir2 = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir2, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir2, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 'infinite', push: 'allow', stage: 'allow' }),
        );

        try {
          const result = spawnSync(
            'bash',
            [SKILL_PATH, '--into', 'main', '--mode', 'apply'],
            {
              cwd: tempDir,
              env: {
                ...process.env,
                PATH: `${fakeBinDir}:${process.env.PATH}`,
                TERM: 'dumb',
                HOME: tempDir,
                EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token',
                // skip sleeps in test mode
                GIT_RELEASE_TEST_MODE: 'true',
              },
              /* eslint-disable-next-line @typescript-eslint/naming-convention */
              encoding: 'utf-8',
            },
          );

          // should detect rebase requirement mid-watch and failfast
          expect(result.stdout).toContain('but, needs rebase now');
          expect(result.stdout).toContain('rhx git.branch.rebase begin');
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          // exit 2 = constraint error (user must rebase)
          expect(result.status).toEqual(2);
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });

    when('[t2a] conflicts detected mid-watch (DIRTY)', () => {
      then('failloud rebase hint with conflicts and exits 2', () => {
        // race condition with conflicts: PR passes initial check, but
        // conflicts appear mid-watch (someone pushed to main with overlapping changes)
        const tempDir = genTempDir({
          slug: 'git-release-conflict-race',
          git: true,
        });
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });

        const counterFile = path.join(tempDir, '.gh-call-counter');
        fs.writeFileSync(counterFile, '0');

        // stateful mock: CLEAN at first, transitions to DIRTY mid-watch
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
      # first 2 calls: checks in progress, CLEAN
      echo '{"statusCheckRollup": [{"conclusion": null, "status": "IN_PROGRESS", "name": "test"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}'
    else
      # after 2nd poll: conflicts appear (DIRTY)
      echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": {"enabledAt": "2024-01-01"}, "mergeStateStatus": "DIRTY", "state": "OPEN", "title": "feat(oceans): add reef protection"}'
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

        const rhachetMockContent2a = `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "get" ]]; then
  echo '{"grant":{"key":{"secret":"mock-github-token"}}}'
  exit 0
fi
exit 1
`;
        const nodeModulesBinDir2a = path.join(tempDir, 'node_modules', '.bin');
        fs.mkdirSync(nodeModulesBinDir2a, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesBinDir2a, 'rhachet'),
          rhachetMockContent2a,
        );
        fs.chmodSync(path.join(nodeModulesBinDir2a, 'rhachet'), '755');

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

        // setup git.commit.uses permission for apply mode
        const meterDir2a = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir2a, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir2a, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 'infinite', push: 'allow', stage: 'allow' }),
        );

        try {
          const result = spawnSync(
            'bash',
            [SKILL_PATH, '--into', 'main', '--mode', 'apply'],
            {
              cwd: tempDir,
              env: {
                ...process.env,
                PATH: `${fakeBinDir}:${process.env.PATH}`,
                TERM: 'dumb',
                HOME: tempDir,
                EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token',
                // skip sleeps in test mode
                GIT_RELEASE_TEST_MODE: 'true',
              },
              /* eslint-disable-next-line @typescript-eslint/naming-convention */
              encoding: 'utf-8',
            },
          );

          // should detect conflicts mid-watch and failfast
          expect(result.stdout).toContain('but, needs rebase now');
          expect(result.stdout).toContain('has conflicts');
          expect(result.stdout).toContain('rhx git.branch.rebase begin');
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
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
            '{"statusCheckRollup": [{"conclusion": "FAILURE", "status": "COMPLETED", "name": "test-unit", "detailsUrl": "https://github.com/test/repo/actions/runs/123"}, {"conclusion": null, "status": "IN_PROGRESS", "name": "test-integration"}, {"conclusion": null, "status": "IN_PROGRESS", "name": "lint"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}',
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
          const result = runSkill(['--into', 'main'], { tempDir, fakeBinDir });

          // should show BOTH failed and progress (Gap 9 fix: progress inside failure block)
          expect(result.stdout).toContain('check(s) failed');
          expect(result.stdout).toContain('check(s) still in progress');
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          // per spec: failed checks are constraint errors (exit 2)
          expect(result.status).toEqual(2);
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case8] --watch flag behavior', () => {
    when('[t0] --watch without --mode apply', () => {
      then('watches CI but does not enable automerge', () => {
        // --watch should watch CI complete without automerge
        // differs from --mode apply which enables automerge AND watches
        const mockResponses = {
          'pr list': '42',
          // checks complete
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--into', 'main', '--watch'], {
            tempDir,
            fakeBinDir,
          });

          // should show watch header (not apply header)
          expect(result.stdout).toContain('git.release --into main --watch');
          // should show automerge is unfound (--watch does not enable it, just reports status)
          expect(result.stdout).toContain('automerge unfound');
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] --mode apply enables automerge and watches', () => {
      then('enables automerge then watches CI', () => {
        // --mode apply should enable automerge AND watch
        // PR must return MERGED state to complete the watch loop
        // (this is --into main, so no tag workflow watch happens)
        const mockResponses = {
          'pr list': '42',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "feat(oceans): add reef protection"}',
          'pr merge': 'auto-merge enabled',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--into', 'main', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
          });

          // should show apply header (not watch header)
          expect(result.stdout).toContain(
            'git.release --into main --mode apply',
          );
          // PR returned MERGED state with checks passed, shows success
          expect(result.stdout).toContain('all checks passed');
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });

    when('[t2] --watch with checks in progress', () => {
      then('polls until checks complete (stateful mock transitions)', () => {
        // stateful mock: needs enough entries to cover:
        // 1. emit_transport_status (call 0)
        // 2. emit_transport_watch pre-check (call 1)
        // 3-5. watch loop poll iterations (calls 2-4)
        // 6. final success (call 5)
        const inProgressResponse =
          '{"statusCheckRollup": [{"conclusion": null, "status": "IN_PROGRESS", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "BLOCKED", "state": "OPEN", "title": "feat(oceans): add reef protection"}';
        const successResponse =
          '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}';

        const mockResponses = {
          'pr list': '42',
          // SEQUENCE: status, pre-check, poll1, poll2, poll3, success
          'pr view': `SEQUENCE:${JSON.stringify([inProgressResponse, inProgressResponse, inProgressResponse, inProgressResponse, inProgressResponse, successResponse])}`,
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--into', 'main', '--watch'], {
            tempDir,
            fakeBinDir,
          });

          // should show watch header and poll through progress to completion
          expect(result.stdout).toContain('git.release --into main --watch');
          expect(result.stdout).toContain('in progress');
          // watch ends with "done!" (check status was shown by emit_transport_status)
          expect(result.stdout).toContain('done!');
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          // mocks drove completion, should exit 0
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });

    when('[t2.1] --watch with checks that transition to complete', () => {
      then('polls and exits success once checks complete', () => {
        // stateful mock: needs enough in-progress calls to cover:
        // - call 0: emit_transport_status
        // - call 1: emit_transport_watch pre-check
        // - call 2-4: watch loop polls
        // - call 5+: completed
        const tempDir = genTempDir({ slug: 'git-release-t2-done', git: true });
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
    if [[ $COUNT -lt 5 ]]; then
      # calls 0-4: in progress
      echo '{"statusCheckRollup": [{"conclusion": null, "status": "IN_PROGRESS", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "BLOCKED", "state": "OPEN", "title": "feat(oceans): add reef protection"}'
    else
      # calls 5+: completed
      echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}'
    fi
    ;;
  *)
    echo "unknown command: $*" >&2
    exit 1
    ;;
esac
`;
        fs.writeFileSync(path.join(fakeBinDir, 'gh'), ghMockContent, {
          mode: 0o755,
        });

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--into', 'main', '--watch'], {
            tempDir,
            fakeBinDir,
          });

          // should show watch mode and poll then complete
          expect(result.stdout).toContain('git.release --into main --watch');
          expect(result.stdout).toContain('in progress');
          // watch ends with "done!" (check status shown by emit_transport_status)
          expect(result.stdout).toContain('done!');
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          // exits 0: checks completed
          expect(result.status).toEqual(0);
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });

    when('[t3] --mode apply with automerge already set', () => {
      then('does not re-enable automerge, watches until merged', () => {
        // automerge was set previously, so --mode apply should skip enable step
        // PR starts OPEN with automerge enabled, then transitions to MERGED after watch
        const tempDir = genTempDir({
          slug: 'git-release-automerge-set',
          git: true,
        });
        const fakeBinDir = path.join(tempDir, '.fakebin');
        fs.mkdirSync(fakeBinDir, { recursive: true });

        const counterFile = path.join(tempDir, '.gh-call-counter');
        fs.writeFileSync(counterFile, '0');

        // counter-based mock: first call OPEN with automerge, subsequent calls MERGED
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
      # first call: OPEN with automerge already enabled
      echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": {"enabledAt": "2024-01-01T00:00:00Z"}, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}'
    else
      # subsequent calls: MERGED (automerge did its job)
      echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": {"enabledAt": "2024-01-01T00:00:00Z"}, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "feat(oceans): add reef protection"}'
    fi
    ;;
  *)
    echo "mock: unhandled gh $*" >&2
    exit 1
    ;;
esac
`;

        fs.writeFileSync(path.join(fakeBinDir, 'gh'), ghMockContent);
        fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

        // keyrack mock for token fetch
        const rhachetMock = `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "get" ]]; then
  echo '{"grant":{"key":{"secret":"mock-github-token"}}}'
  exit 0
fi
exit 1
`;
        const nodeModulesBinDir = path.join(tempDir, 'node_modules', '.bin');
        fs.mkdirSync(nodeModulesBinDir, { recursive: true });
        fs.writeFileSync(path.join(nodeModulesBinDir, 'rhachet'), rhachetMock);
        fs.chmodSync(path.join(nodeModulesBinDir, 'rhachet'), '755');

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

        // setup git.commit.uses permission for apply mode
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 'infinite', push: 'allow', stage: 'allow' }),
        );

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--into', 'main', '--mode', 'apply'], {
            tempDir,
            fakeBinDir,
          });

          // should show automerge found (not added)
          expect(result.stdout).toContain('automerge enabled [found]');
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });

    when('[t4] --mode plan with --watch, no automerge', () => {
      then('watches CI and reports automerge unfound', () => {
        // plan mode with watch: does not enable automerge, just watches
        const mockResponses = {
          'pr list': '42',
          'pr view':
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}',
        };

        const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--into', 'main', '--watch'], {
            tempDir,
            fakeBinDir,
          });

          // should show watch mode
          expect(result.stdout).toContain('git.release --into main --watch');
          // should report automerge unfound (plan mode does not enable)
          expect(result.stdout).toContain('automerge unfound');
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          expect(result.status).toEqual(0);
        } finally {
          cleanup();
        }
      });
    });

    when(
      '[t5] --mode plan with --watch, automerge already set, PR open',
      () => {
        then('watches CI, shows automerge found, then merges', () => {
          // automerge was set previously, PR starts OPEN with checks passed
          // --watch reports automerge found (does not add it, just reports)
          // SEQUENCE: mock transitions OPEN → OPEN → MERGED to show full progression
          const openResponse =
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": {"enabledAt": "2024-01-01T00:00:00Z"}, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}';
          const mergedResponse =
            '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": {"enabledAt": "2024-01-01T00:00:00Z"}, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "feat(oceans): add reef protection"}';

          const mockResponses = {
            'pr list': '42',
            // SEQUENCE: emit_transport_status (OPEN) → emit_transport_watch pre-check (OPEN) → watch poll 1 (OPEN, shows "await automerge") → watch poll 2 (MERGED)
            'pr view': `SEQUENCE:${JSON.stringify([openResponse, openResponse, openResponse, mergedResponse])}`,
          };

          const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses);

          try {
            spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
              cwd: tempDir,
            });

            const result = runSkill(['--into', 'main', '--watch'], {
              tempDir,
              fakeBinDir,
            });

            // should show watch mode
            expect(result.stdout).toContain('git.release --into main --watch');
            // should show automerge found (not added, not unfound)
            expect(result.stdout).toContain('automerge enabled [found]');
            // should show full progression: await automerge → done
            expect(result.stdout).toContain('await automerge');
            expect(result.stdout).toContain('done!');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            // mock drove completion, exits 0
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      },
    );

    when('[t5.1] --watch with automerge set, PR transitions to merged', () => {
      then('polls and exits success once merged', () => {
        // stateful mock: OPEN with automerge, then MERGED
        // note: get_pr_status is called multiple times:
        //   call 0: OPEN (emit_transport_status)
        //   call 1: OPEN (emit_transport_watch pre-check)
        //   call 2: OPEN (watch loop iter 1 - shows "await automerge")
        //   call 3+: MERGED (watch loop iter 2 - shows "done!")
        const tempDir = genTempDir({ slug: 'git-release-t5-done', git: true });
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
    if [[ $COUNT -lt 3 ]]; then
      # calls 0-2: open with automerge, checks passed (call 2 shows "await automerge")
      echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": {"enabledAt": "2024-01-01T00:00:00Z"}, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(oceans): add reef protection"}'
    else
      # calls 3+: merged (shows "done!")
      echo '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": {"enabledAt": "2024-01-01T00:00:00Z"}, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "feat(oceans): add reef protection"}'
    fi
    ;;
  *)
    echo "unknown command: $*" >&2
    exit 1
    ;;
esac
`;
        fs.writeFileSync(path.join(fakeBinDir, 'gh'), ghMockContent, {
          mode: 0o755,
        });

        try {
          spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], {
            cwd: tempDir,
          });

          const result = runSkill(['--into', 'main', '--watch'], {
            tempDir,
            fakeBinDir,
          });

          // should show watch mode with automerge, poll, then done
          expect(result.stdout).toContain('git.release --into main --watch');
          expect(result.stdout).toContain('automerge enabled [found]');
          expect(result.stdout).toContain('await automerge');
          expect(result.stdout).toContain('done!');
          expect(asTimingStable(result.stdout)).toMatchSnapshot();
          // exits 0: PR merged
          expect(result.status).toEqual(0);
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });
});
