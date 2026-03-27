import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = v2 test suite for git.release with full spec matrix coverage
 * .why = systematic coverage of all state combinations per git.release.spec.md
 */

// all tests use mocked gh CLI, so no remote calls - 5s timeout is plenty
jest.setTimeout(5000);

// ============================================================================
// types
// ============================================================================

/**
 * PR states per spec
 */
type PrState =
  | 'unfound'
  | 'inflight'
  | 'passed:wout-automerge'
  | 'passed:with-automerge'
  | 'merged'
  | 'failed'
  | 'rebase:behind'
  | 'rebase:dirty';

/**
 * tag workflow states per spec
 */
type TagState = 'unfound' | 'inflight' | 'passed' | 'failed';

/**
 * scene definition for test setup
 */
interface Scene {
  /** which branch we're on */
  branch: 'main' | 'feat';
  /** feature PR state (only relevant when branch=feat) */
  featPr?: PrState;
  /** release PR state (only relevant for --into prod) */
  releasePr?: PrState;
  /** tag workflow state (only relevant when release PR merged) */
  tagWorkflows?: TagState;
  /**
   * enable counter-based state transitions for E2E tests
   * when true, inflight → passed → merged after N calls
   */
  transitions?: boolean;
}

// ============================================================================
// domain operations for mock generation
// ============================================================================

/**
 * .what = generate pr view json for a given PR state
 * .why = reusable mock data for any PR state
 */
const genPrViewJson = (input: {
  state: PrState;
  title: string;
  nowIso?: string;
}): string => {
  const now = input.nowIso ?? new Date().toISOString();

  switch (input.state) {
    case 'unfound':
      // unfound means no PR exists - this is handled at pr list level
      return '';

    case 'inflight':
      return JSON.stringify({
        statusCheckRollup: [
          {
            conclusion: null,
            status: 'IN_PROGRESS',
            name: 'test',
            startedAt: now,
          },
        ],
        autoMergeRequest: null,
        mergeStateStatus: 'BLOCKED',
        state: 'OPEN',
        title: input.title,
      });

    case 'passed:wout-automerge':
      return JSON.stringify({
        statusCheckRollup: [
          { conclusion: 'SUCCESS', status: 'COMPLETED', name: 'test' },
        ],
        autoMergeRequest: null,
        mergeStateStatus: 'CLEAN',
        state: 'OPEN',
        title: input.title,
      });

    case 'passed:with-automerge':
      return JSON.stringify({
        statusCheckRollup: [
          { conclusion: 'SUCCESS', status: 'COMPLETED', name: 'test' },
        ],
        autoMergeRequest: { enabledAt: '2024-01-01T00:00:00Z' },
        mergeStateStatus: 'CLEAN',
        state: 'OPEN',
        title: input.title,
      });

    case 'merged':
      return JSON.stringify({
        statusCheckRollup: [
          { conclusion: 'SUCCESS', status: 'COMPLETED', name: 'test' },
        ],
        autoMergeRequest: null,
        mergeStateStatus: 'CLEAN',
        state: 'MERGED',
        title: input.title,
      });

    case 'failed':
      return JSON.stringify({
        statusCheckRollup: [
          {
            conclusion: 'FAILURE',
            status: 'COMPLETED',
            name: 'test',
            detailsUrl: 'https://github.com/test/repo/actions/runs/123',
          },
        ],
        autoMergeRequest: null,
        mergeStateStatus: 'CLEAN',
        state: 'OPEN',
        title: input.title,
      });

    case 'rebase:behind':
      return JSON.stringify({
        statusCheckRollup: [
          { conclusion: 'SUCCESS', status: 'COMPLETED', name: 'test' },
        ],
        autoMergeRequest: null,
        mergeStateStatus: 'BEHIND',
        state: 'OPEN',
        title: input.title,
      });

    case 'rebase:dirty':
      return JSON.stringify({
        statusCheckRollup: [
          { conclusion: 'SUCCESS', status: 'COMPLETED', name: 'test' },
        ],
        autoMergeRequest: null,
        mergeStateStatus: 'DIRTY',
        state: 'OPEN',
        title: input.title,
      });

    default:
      throw new Error(`unknown PR state: ${input.state}`);
  }
};

/**
 * .what = generate tag workflow run list json for a given state
 * .why = reusable mock data for tag workflow states
 */
const genTagWorkflowJson = (input: { state: TagState }): string => {
  switch (input.state) {
    case 'unfound':
      return '[]';

    case 'inflight':
      return JSON.stringify([
        {
          name: 'publish.yml',
          conclusion: null,
          status: 'in_progress',
          url: 'https://github.com/test/repo/actions/runs/789',
        },
      ]);

    case 'passed':
      return JSON.stringify([
        {
          name: 'publish.yml',
          conclusion: 'success',
          status: 'completed',
          url: 'https://github.com/test/repo/actions/runs/789',
        },
      ]);

    case 'failed':
      return JSON.stringify([
        {
          name: 'publish.yml',
          conclusion: 'failure',
          status: 'completed',
          url: 'https://github.com/test/repo/actions/runs/789',
        },
      ]);

    default:
      throw new Error(`unknown tag state: ${input.state}`);
  }
};

/**
 * .what = generate gh cli mock executable for a scene
 * .why = single source of truth for mock generation
 *
 * note: mock is stateful - when `pr merge` is called, it marks the PR as merged
 *       subsequent `pr view` calls return MERGED state
 */
const genGhMockExecutable = (input: {
  scene: Scene;
  stateDir: string;
}): string => {
  const { scene, stateDir } = input;
  const nowIso = new Date().toISOString();

  // determine PR numbers and responses
  const featPrNum = '42';
  const releasePrNum = '99';

  // feature PR responses (initial and merged)
  const featPrList = scene.featPr === 'unfound' ? '' : featPrNum;
  const featPrView =
    scene.featPr && scene.featPr !== 'unfound'
      ? genPrViewJson({
          state: scene.featPr,
          title: 'feat(oceans): add reef protection',
          nowIso,
        })
      : '';
  const featPrViewMerged = genPrViewJson({
    state: 'merged',
    title: 'feat(oceans): add reef protection',
    nowIso,
  });
  // feature PR can only auto-merge if checks passed
  // note: do NOT include `scene.transitions === true` here - for inflight PRs in
  // transitions mode, we want the counter-based logic (is_passed/should_auto_merge)
  // to drive the transition, not immediate merge when pr merge is called
  const featPrCanAutoMerge =
    scene.featPr === 'passed:wout-automerge' ||
    scene.featPr === 'passed:with-automerge' ||
    scene.featPr === 'merged';
  // feature PR passed state (for transitions)
  // preserve automerge if initial state had it
  const featPrViewPassed = genPrViewJson({
    state:
      scene.featPr === 'passed:with-automerge'
        ? 'passed:with-automerge'
        : 'passed:wout-automerge',
    title: 'feat(oceans): add reef protection',
    nowIso,
  });
  // feature PR passed state with automerge (for when automerge enabled dynamically)
  const featPrViewPassedWithAutomerge = genPrViewJson({
    state: 'passed:with-automerge',
    title: 'feat(oceans): add reef protection',
    nowIso,
  });

  // release PR responses (initial and merged)
  const releasePrList =
    !scene.releasePr || scene.releasePr === 'unfound' ? '' : releasePrNum;
  const releasePrView =
    scene.releasePr && scene.releasePr !== 'unfound'
      ? genPrViewJson({
          state: scene.releasePr,
          title: 'chore(release): v1.33.0 🎉',
          nowIso,
        })
      : '';
  const releasePrViewMerged = genPrViewJson({
    state: 'merged',
    title: 'chore(release): v1.33.0 🎉',
    nowIso,
  });
  // release PR can only auto-merge if checks passed
  // note: do NOT include `scene.transitions === true` here - for inflight PRs in
  // transitions mode, we want the counter-based logic to drive the transition
  const releasePrCanAutoMerge =
    scene.releasePr === 'passed:wout-automerge' ||
    scene.releasePr === 'passed:with-automerge' ||
    scene.releasePr === 'merged';
  // track if release PR starts as merged (needs to stay merged regardless of counters)
  const releasePrStartsMerged = scene.releasePr === 'merged';
  // release PR passed state (for transitions)
  // preserve automerge if initial state had it
  const releasePrViewPassed = genPrViewJson({
    state:
      scene.releasePr === 'passed:with-automerge'
        ? 'passed:with-automerge'
        : 'passed:wout-automerge',
    title: 'chore(release): v1.33.0 🎉',
    nowIso,
  });
  // release PR passed state with automerge (for when automerge enabled dynamically)
  const releasePrViewPassedWithAutomerge = genPrViewJson({
    state: 'passed:with-automerge',
    title: 'chore(release): v1.33.0 🎉',
    nowIso,
  });

  // tag workflow responses
  // for transitions mode, generate passed state as well
  const tagWorkflowListPassed = genTagWorkflowJson({ state: 'passed' });
  const tagWorkflowList = genTagWorkflowJson({
    state: scene.tagWorkflows ?? 'unfound',
  });

  return `#!/bin/bash
set -euo pipefail

NOW="${nowIso}"
ALL_ARGS="$*"
CMD_KEY="$1 $2"
STATE_DIR="${stateDir}"

# check if PR has been marked as merged (via pr merge command)
is_merged() {
  local pr_num="$1"
  [[ -f "$STATE_DIR/merged-$pr_num" ]]
}

# mark PR as merged
mark_merged() {
  local pr_num="$1"
  touch "$STATE_DIR/merged-$pr_num"
}

# check if automerge was enabled for a PR (via pr merge --auto)
has_automerge_enabled() {
  local pr_num="$1"
  [[ -f "$STATE_DIR/automerge-$pr_num" ]]
}

# mark automerge as enabled for a PR
mark_automerge_enabled() {
  local pr_num="$1"
  touch "$STATE_DIR/automerge-$pr_num"
}

# counter-based transitions (only when transitions=true)
TRANSITIONS_ENABLED="${scene.transitions ? 'true' : 'false'}"

# track if release PR starts as merged (stays merged regardless of counters)
RELEASE_PR_STARTS_MERGED="${releasePrStartsMerged ? 'true' : 'false'}"

# increment call counter and return current count
inc_counter() {
  local key="$1"
  local file="$STATE_DIR/counter-$key"
  local count=0
  if [[ -f "$file" ]]; then
    count=$(cat "$file")
  fi
  count=$((count + 1))
  echo "$count" > "$file"
  echo "$count"
}

# check if PR should be in passed state (after 7 view calls)
# threshold chosen to show 3+ poll cycles before checks pass
is_passed() {
  local pr_num="$1"
  if [[ "$TRANSITIONS_ENABLED" != "true" ]]; then
    return 1
  fi
  local count
  count=$(cat "$STATE_DIR/counter-view-$pr_num" 2>/dev/null || echo "0")
  [[ $count -ge 7 ]]
}

# check if PR should auto-merge (after 9 view calls in transitions mode)
# threshold must be > is_passed threshold to show passed state first
# simulates GitHub auto-merge: PR merges after automerge enabled and checks pass
should_auto_merge() {
  local pr_num="$1"
  if [[ "$TRANSITIONS_ENABLED" != "true" ]]; then
    return 1
  fi
  local count
  count=$(cat "$STATE_DIR/counter-view-$pr_num" 2>/dev/null || echo "0")
  [[ $count -ge 9 ]]
}

# check if tag workflows should appear (after 2 run list calls)
has_tag_runs() {
  if [[ "$TRANSITIONS_ENABLED" != "true" ]]; then
    return 1
  fi
  local count
  count=$(cat "$STATE_DIR/counter-run-list" 2>/dev/null || echo "0")
  [[ $count -ge 2 ]]
}

# check if tag workflows should be complete (after 4 run list calls in transitions mode)
tag_runs_complete() {
  if [[ "$TRANSITIONS_ENABLED" != "true" ]]; then
    return 1
  fi
  local count
  count=$(cat "$STATE_DIR/counter-run-list" 2>/dev/null || echo "0")
  [[ $count -ge 4 ]]
}

case "$CMD_KEY" in
  "pr list")
    # check for get_latest_merged_release_pr_info query (--state merged with --limit 21)
    if echo "$ALL_ARGS" | grep -q "merged" && echo "$ALL_ARGS" | grep -q -- "--limit 21"; then
      # return prior merged release PR (note: v1.3.0 is prior to the current v1.33.0 release)
      echo "title=chore(release): v1.3.0 🎉"
      exit 0
    fi
    # detect if release PR request (has chore(release) in jq filter)
    if echo "$ALL_ARGS" | grep -q "chore(release)"; then
      # release PR request - return empty if unfound
      if [[ -z "${releasePrList}" ]]; then
        echo ""
      elif echo "$ALL_ARGS" | grep -q "| \\.title$"; then
        # get_release_pr_title: jq ends with "| .title" (no quote - shell consumed it)
        echo "chore(release): v1.33.0 🎉"
      else
        # get_release_pr: jq ends with "| .number'" - return PR number
        echo "${releasePrList}"
      fi
    elif echo "$ALL_ARGS" | grep -q "merged"; then
      # merged PR lookup for feature branch
      if is_merged "${featPrNum}"; then
        echo "${featPrNum}"
      else
        ${scene.featPr === 'merged' ? `echo "${featPrNum}"` : 'echo ""'}
      fi
    else
      # feature branch PR request (open state)
      if is_merged "${featPrNum}"; then
        echo ""
      else
        ${scene.featPr === 'merged' ? 'echo ""' : `echo "${featPrList}"`}
      fi
    fi
    ;;
  "pr view")
    # extract PR number: gh pr view <number> --json ...
    # PR number is the 3rd argument ($3)
    PR_NUM="$3"
    # increment counter for this PR
    inc_counter "view-$PR_NUM" > /dev/null
    if [[ "$PR_NUM" == "${featPrNum}" ]]; then
      if is_merged "${featPrNum}" || should_auto_merge "${featPrNum}"; then
        echo '${featPrViewMerged.replace(/'/g, "'\"'\"'")}'
      elif is_passed "${featPrNum}"; then
        # if automerge was enabled dynamically, return passed:with-automerge
        if has_automerge_enabled "${featPrNum}"; then
          echo '${featPrViewPassedWithAutomerge.replace(/'/g, "'\"'\"'")}'
        else
          echo '${featPrViewPassed.replace(/'/g, "'\"'\"'")}'
        fi
      else
        echo '${featPrView.replace(/'/g, "'\"'\"'")}'
      fi
    elif [[ "$PR_NUM" == "${releasePrNum}" ]]; then
      # if release PR started merged, always return merged (ignore counters)
      if [[ "$RELEASE_PR_STARTS_MERGED" == "true" ]]; then
        echo '${releasePrViewMerged.replace(/'/g, "'\"'\"'")}'
      elif is_merged "${releasePrNum}" || should_auto_merge "${releasePrNum}"; then
        echo '${releasePrViewMerged.replace(/'/g, "'\"'\"'")}'
      elif is_passed "${releasePrNum}"; then
        # if automerge was enabled dynamically, return passed:with-automerge
        if has_automerge_enabled "${releasePrNum}"; then
          echo '${releasePrViewPassedWithAutomerge.replace(/'/g, "'\"'\"'")}'
        else
          echo '${releasePrViewPassed.replace(/'/g, "'\"'\"'")}'
        fi
      else
        echo '${releasePrView.replace(/'/g, "'\"'\"'")}'
      fi
    else
      echo "unknown PR: $PR_NUM" >&2
      exit 1
    fi
    ;;
  "pr merge")
    # extract PR number: gh pr merge <number> ...
    PR_NUM="$3"
    # always mark automerge as enabled (even for inflight PRs)
    mark_automerge_enabled "$PR_NUM"
    # only mark merged if checks passed (match GitHub's behavior)
    # inflight PRs enable automerge but don't merge until checks pass
    # in transitions mode, mark merged if checks have transitioned to passed
    if [[ "$PR_NUM" == "${featPrNum}" ]]; then
      if [[ "${featPrCanAutoMerge}" == "true" ]] || is_passed "$PR_NUM"; then
        mark_merged "$PR_NUM"
      fi
    elif [[ "$PR_NUM" == "${releasePrNum}" ]]; then
      if [[ "${releasePrCanAutoMerge}" == "true" ]] || is_passed "$PR_NUM"; then
        mark_merged "$PR_NUM"
      fi
    fi
    echo "auto-merge enabled"
    ;;
  "run list")
    # increment counter
    inc_counter "run-list" > /dev/null
    # in transitions mode:
    # - after 4 calls: return passed (for any state)
    # - after 2 calls with unfound: return passed (appears then completes)
    if tag_runs_complete; then
      echo '${tagWorkflowListPassed.replace(/'/g, "'\"'\"'")}'
    elif [[ "${scene.tagWorkflows ?? 'unfound'}" == "unfound" ]] && has_tag_runs; then
      echo '${tagWorkflowListPassed.replace(/'/g, "'\"'\"'")}'
    else
      echo '${tagWorkflowList.replace(/'/g, "'\"'\"'")}'
    fi
    ;;
  "run view")
    if echo "$ALL_ARGS" | grep -q "jobs"; then
      echo "test"
    else
      echo '{"startedAt": "'$NOW'", "updatedAt": "'$NOW'"}'
    fi
    ;;
  "run rerun")
    echo "rerun triggered"
    ;;
  *)
    echo "mock: unhandled gh $*" >&2
    exit 1
    ;;
esac
`;
};

// ============================================================================
// test infrastructure
// ============================================================================

const SKILL_PATH = path.join(
  __dirname,
  '../../../../../dist/domain.roles/mechanic/skills/git.release/git.release.sh',
);

/**
 * .what = replace timing values with placeholders for snapshot stability
 * .why = timing varies between runs (0s vs 1s), causing flaky snapshots
 */
const asTimingStable = (output: string): string => {
  return output
    .replace(/\d+s in action/g, 'Xs in action')
    .replace(/\d+s watched/g, 'Xs watched')
    .replace(/\d+m\s*\d+s/g, 'Xm Ys')
    .replace(/(\d+)s delay/g, 'Xs delay');
};

/**
 * .what = setup test environment for a scene
 * .why = reusable test setup across all cases
 */
const setupScene = (input: {
  scene: Scene;
  slug: string;
}): { tempDir: string; fakeBinDir: string; cleanup: () => void } => {
  const tempDir = genTempDir({ slug: input.slug, git: true });
  const fakeBinDir = path.join(tempDir, '.fakebin');
  fs.mkdirSync(fakeBinDir, { recursive: true });

  // create state directory for mock (tracks state transitions like PR merges)
  const stateDir = path.join(tempDir, '.mock-state');
  fs.mkdirSync(stateDir, { recursive: true });

  // create gh mock
  const ghMock = genGhMockExecutable({ scene: input.scene, stateDir });
  fs.writeFileSync(path.join(fakeBinDir, 'gh'), ghMock, { mode: 0o755 });

  // create rhachet mock for keyrack
  const rhachetMock = `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "get" ]]; then
  echo '{"grant":{"key":{"secret":"mock-github-token"}}}'
  exit 0
fi
echo "mock: unhandled rhachet $*" >&2
exit 1
`;
  const nodeModulesBinDir = path.join(tempDir, 'node_modules', '.bin');
  fs.mkdirSync(nodeModulesBinDir, { recursive: true });
  fs.writeFileSync(path.join(nodeModulesBinDir, 'rhachet'), rhachetMock, {
    mode: 0o755,
  });
  fs.writeFileSync(path.join(fakeBinDir, 'rhachet'), rhachetMock, {
    mode: 0o755,
  });

  // setup git repo
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: tempDir });
  spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: tempDir });
  spawnSync(
    'git',
    ['remote', 'add', 'origin', 'https://github.com/test/repo'],
    { cwd: tempDir },
  );
  spawnSync(
    'git',
    ['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main'],
    { cwd: tempDir },
  );

  // create tag for prod tests (must match mock PR title version: chore(release): v1.33.0)
  spawnSync('git', ['tag', 'v1.33.0'], { cwd: tempDir });

  // set up branch per scene
  if (input.scene.branch === 'feat') {
    // checkout feature branch
    spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], { cwd: tempDir });
  } else if (input.scene.branch === 'main') {
    // ensure current branch is main (genTempDir may create master)
    spawnSync('git', ['branch', '-M', 'main'], { cwd: tempDir });
  }

  // setup git.commit.uses permission for apply mode
  const meterDir = path.join(tempDir, '.meter');
  fs.mkdirSync(meterDir, { recursive: true });
  fs.writeFileSync(
    path.join(meterDir, 'git.commit.uses.jsonc'),
    JSON.stringify({ uses: 'infinite', push: 'allow', stage: 'allow' }),
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
      EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN: 'fake-token',
      GIT_RELEASE_TEST_MODE: 'true',
    },
    encoding: 'utf-8',
    timeout: 3000,
  });

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status ?? 1,
  };
};

// ============================================================================
// test suite: to main, from feat
// ============================================================================

describe('git.release.p2', () => {
  describe('to main, from feat', () => {
    given('[case-feat-unfound] feature PR unfound', () => {
      const scene: Scene = { branch: 'feat', featPr: 'unfound' };

      when('[t0] plan mode', () => {
        then('exit 2: hint push', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'feat-unfound-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('crickets');
            expect(result.stdout).toContain('no open branch pr');
            expect(result.stdout).toContain('git.commit.push');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[t1] apply mode', () => {
        then('exit 2: hint push', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'feat-unfound-apply',
          });
          try {
            const result = runSkill(['--mode', 'apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('crickets');
            expect(result.stdout).toContain('no open branch pr');
            expect(result.stdout).toContain('git.commit.push');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });
    });

    given('[case-feat-inflight] feature PR inflight', () => {
      when('[t0] plan mode', () => {
        then('exit 0: show progress', () => {
          const scene: Scene = { branch: 'feat', featPr: 'inflight' };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'feat-inflight-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('in progress');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[t1] apply mode', () => {
        then('watch checks then merge (transitions enabled)', () => {
          // transitions: true enables stateful mock that progresses:
          // inflight → passed → merged after N calls
          const scene: Scene = {
            branch: 'feat',
            featPr: 'inflight',
            transitions: true,
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'feat-inflight-apply',
          });
          try {
            const result = runSkill(['--mode', 'apply'], {
              tempDir,
              fakeBinDir,
            });
            // should show progression: in progress → passed → merged
            expect(result.stdout).toContain('in progress');
            expect(result.stdout).toContain('done!');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            // transitions drove completion, exit 0
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    given(
      '[case-feat-passed-wout-automerge] feature PR passed, no automerge',
      () => {
        const scene: Scene = {
          branch: 'feat',
          featPr: 'passed:wout-automerge',
        };

        when('[t0] plan mode', () => {
          then('exit 0: hint apply', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'feat-passed-wout-plan',
            });
            try {
              const result = runSkill([], { tempDir, fakeBinDir });
              expect(result.stdout).toContain('passed');
              expect(result.stdout).toContain('--apply');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });

        when('[t1] apply mode', () => {
          then('add automerge, watch until merged or timeout', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'feat-passed-wout-apply',
            });
            try {
              const result = runSkill(['--mode', 'apply'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('automerge');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              // spec: "add automerge, watch → exit 0"
              // watch exits 0 because checks passed (even if not merged yet)
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });
      },
    );

    given(
      '[case-feat-passed-with-automerge] feature PR passed, automerge set',
      () => {
        when('[t0] plan mode', () => {
          then('exit 0: show automerge status', () => {
            const scene: Scene = {
              branch: 'feat',
              featPr: 'passed:with-automerge',
            };
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'feat-passed-with-plan',
            });
            try {
              const result = runSkill([], { tempDir, fakeBinDir });
              expect(result.stdout).toContain('automerge');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });

        when('[t1] apply mode', () => {
          then('watch then merge (transitions enabled)', () => {
            // transitions: true makes mock transition to MERGED after a few polls
            const scene: Scene = {
              branch: 'feat',
              featPr: 'passed:with-automerge',
              transitions: true,
            };
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'feat-passed-with-apply',
            });
            try {
              const result = runSkill(['--mode', 'apply'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('automerge');
              expect(result.stdout).toContain('done!');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              // transitions drove completion, exit 0
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });
      },
    );

    given('[case-feat-merged] feature PR merged', () => {
      const scene: Scene = { branch: 'feat', featPr: 'merged' };

      when('[t0] plan mode', () => {
        then('exit 0: show merged', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'feat-merged-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('merged');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[t1] apply mode', () => {
        then('exit 0: show merged', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'feat-merged-apply',
          });
          try {
            const result = runSkill(['--mode', 'apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('merged');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    given('[case-feat-failed] feature PR failed', () => {
      const scene: Scene = { branch: 'feat', featPr: 'failed' };

      when('[t0] plan mode', () => {
        then('exit 2: show failures (constraint)', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'feat-failed-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('failed');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            // per spec: failed checks are constraint errors (exit 2)
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[t1] apply mode', () => {
        then('exit 2: show failures', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'feat-failed-apply',
          });
          try {
            const result = runSkill(['--mode', 'apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('failed');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            // per spec: failed checks are constraint errors (exit 2)
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });
    });

    given('[case-feat-rebase-behind] feature PR needs rebase (behind)', () => {
      const scene: Scene = { branch: 'feat', featPr: 'rebase:behind' };

      when('[t0] plan mode', () => {
        then('exit 2: hint rebase', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'feat-rebase-behind-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('rebase');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[t1] apply mode', () => {
        then('exit 2: hint rebase', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'feat-rebase-behind-apply',
          });
          try {
            const result = runSkill(['--mode', 'apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('rebase');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });
    });

    given(
      '[case-feat-rebase-dirty] feature PR needs rebase with conflicts',
      () => {
        const scene: Scene = { branch: 'feat', featPr: 'rebase:dirty' };

        when('[t0] plan mode', () => {
          then('exit 2: hint rebase with conflicts', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'feat-rebase-dirty-plan',
            });
            try {
              const result = runSkill([], { tempDir, fakeBinDir });
              expect(result.stdout).toContain('rebase');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(2);
            } finally {
              cleanup();
            }
          });
        });

        when('[t1] apply mode', () => {
          then('exit 2: hint rebase with conflicts', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'feat-rebase-dirty-apply',
            });
            try {
              const result = runSkill(['--mode', 'apply'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('rebase');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(2);
            } finally {
              cleanup();
            }
          });
        });
      },
    );
  });

  // ============================================================================
  // test suite: to prod, from main
  // ============================================================================

  describe('to prod, from main', () => {
    given(
      '[case-main-unfound-unfound] release PR unfound, tag workflows unfound',
      () => {
        const scene: Scene = {
          branch: 'main',
          releasePr: 'unfound',
          tagWorkflows: 'unfound',
        };

        when('[t0] plan mode', () => {
          then('exit 0: show latest tag', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'main-unfound-unfound-plan',
            });
            try {
              const result = runSkill(['--into', 'prod'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('v1.33.0');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });

        when('[t1] apply mode', () => {
          then('exit 0: show latest tag, no workflows', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'main-unfound-unfound-apply',
            });
            try {
              const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('v1.33.0');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });
      },
    );

    given(
      '[case-main-unfound-inflight] release PR unfound, tag workflows inflight',
      () => {
        when('[t0] plan mode', () => {
          then('exit 0: show latest tag', () => {
            const scene: Scene = {
              branch: 'main',
              releasePr: 'unfound',
              tagWorkflows: 'inflight',
            };
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'main-unfound-inflight-plan',
            });
            try {
              const result = runSkill(['--into', 'prod'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('v1.33.0');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });

        when('[t1] apply mode', () => {
          then('watch tags until complete (transitions enabled)', () => {
            // transitions: true makes mock transition tag workflows to passed
            const scene: Scene = {
              branch: 'main',
              releasePr: 'unfound',
              tagWorkflows: 'inflight',
              transitions: true,
            };
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'main-unfound-inflight-apply',
            });
            try {
              const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('v1.33.0');
              expect(result.stdout).toContain('done!');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              // transitions drove completion, exit 0
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });
      },
    );

    given(
      '[case-main-unfound-passed] release PR unfound, tag workflows passed',
      () => {
        const scene: Scene = {
          branch: 'main',
          releasePr: 'unfound',
          tagWorkflows: 'passed',
        };

        when('[t0] plan mode', () => {
          then('exit 0: show latest tag', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'main-unfound-passed-plan',
            });
            try {
              const result = runSkill(['--into', 'prod'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('v1.33.0');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });

        when('[t1] apply mode', () => {
          then('exit 0: tags passed', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'main-unfound-passed-apply',
            });
            try {
              const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('v1.33.0');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });
      },
    );

    given(
      '[case-main-unfound-failed] release PR unfound, tag workflows failed',
      () => {
        const scene: Scene = {
          branch: 'main',
          releasePr: 'unfound',
          tagWorkflows: 'failed',
        };

        when('[t0] plan mode', () => {
          then('exit 0: show latest tag', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'main-unfound-failed-plan',
            });
            try {
              const result = runSkill(['--into', 'prod'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('v1.33.0');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });

        when('[t1] apply mode', () => {
          then('exit 2: tag failure (constraint), hint retry', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'main-unfound-failed-apply',
            });
            try {
              const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('failed');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              // per spec: failed checks are constraint errors (exit 2)
              expect(result.status).toEqual(2);
            } finally {
              cleanup();
            }
          });
        });
      },
    );

    given('[case-main-inflight] release PR inflight', () => {
      when('[t0] plan mode', () => {
        then('exit 0: show progress', () => {
          const scene: Scene = {
            branch: 'main',
            releasePr: 'inflight',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'main-inflight-plan',
          });
          try {
            const result = runSkill(['--into', 'prod'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('in progress');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[t1] apply mode', () => {
        then('watch PR then continue to tags (transitions enabled)', () => {
          // transitions: true makes mock transition to passed → merged → tag workflows
          const scene: Scene = {
            branch: 'main',
            releasePr: 'inflight',
            transitions: true,
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'main-inflight-apply',
          });
          try {
            const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('in progress');
            expect(result.stdout).toContain('done!');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            // transitions drove completion, exit 0
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    given(
      '[case-main-passed-wout-automerge] release PR passed, no automerge',
      () => {
        const scene: Scene = {
          branch: 'main',
          releasePr: 'passed:wout-automerge',
          tagWorkflows: 'passed', // complete flow after merge
        };

        when('[t0] plan mode', () => {
          then('exit 0: hint apply', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'main-passed-wout-plan',
            });
            try {
              const result = runSkill(['--into', 'prod'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('passed');
              expect(result.stdout).toContain('--apply');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });

        when('[t1] apply mode', () => {
          then('add automerge, watch, continue to tags', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'main-passed-wout-apply',
            });
            try {
              const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('automerge');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              // spec: "add automerge, watch → continue to tags"
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });
      },
    );

    given(
      '[case-main-passed-with-automerge] release PR passed, automerge set',
      () => {
        when('[t0] plan mode', () => {
          then('exit 0: show automerge', () => {
            const scene: Scene = {
              branch: 'main',
              releasePr: 'passed:with-automerge',
            };
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'main-passed-with-plan',
            });
            try {
              const result = runSkill(['--into', 'prod'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('automerge');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });

        when('[t1] apply mode', () => {
          then('watch then continue to tags (transitions enabled)', () => {
            // transitions: true makes mock transition to merged → tag workflows
            const scene: Scene = {
              branch: 'main',
              releasePr: 'passed:with-automerge',
              transitions: true,
            };
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'main-passed-with-apply',
            });
            try {
              const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('automerge');
              expect(result.stdout).toContain('done!');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              // transitions drove completion, exit 0
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });
      },
    );

    given(
      '[case-main-merged-unfound] release PR merged, tag workflows unfound',
      () => {
        const scene: Scene = {
          branch: 'main',
          releasePr: 'merged',
          tagWorkflows: 'unfound',
        };

        when('[t0] plan mode', () => {
          then('exit 0: show merged', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'main-merged-unfound-plan',
            });
            try {
              const result = runSkill(['--into', 'prod'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('merged');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });

        when('[t1] apply mode', () => {
          then('exit 0: no tag workflows', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'main-merged-unfound-apply',
            });
            try {
              const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('merged');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });
      },
    );

    given(
      '[case-main-merged-inflight] release PR merged, tag workflows inflight',
      () => {
        when('[t0] plan mode', () => {
          then('exit 0: show merged', () => {
            const scene: Scene = {
              branch: 'main',
              releasePr: 'merged',
              tagWorkflows: 'inflight',
            };
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'main-merged-inflight-plan',
            });
            try {
              const result = runSkill(['--into', 'prod'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('merged');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });

        when('[t1] apply mode', () => {
          then('watch tags until complete (transitions enabled)', () => {
            // transitions: true makes mock transition tag workflows to passed
            const scene: Scene = {
              branch: 'main',
              releasePr: 'merged',
              tagWorkflows: 'inflight',
              transitions: true,
            };
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'main-merged-inflight-apply',
            });
            try {
              const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('merged');
              expect(result.stdout).toContain('done!');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              // transitions drove completion, exit 0
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });
      },
    );

    given(
      '[case-main-merged-passed] release PR merged, tag workflows passed',
      () => {
        const scene: Scene = {
          branch: 'main',
          releasePr: 'merged',
          tagWorkflows: 'passed',
        };

        when('[t0] plan mode', () => {
          then('exit 0: show merged', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'main-merged-passed-plan',
            });
            try {
              const result = runSkill(['--into', 'prod'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('merged');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });

        when('[t1] apply mode', () => {
          then('exit 0: tags passed', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'main-merged-passed-apply',
            });
            try {
              const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('merged');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });
      },
    );

    given(
      '[case-main-merged-failed] release PR merged, tag workflows failed',
      () => {
        const scene: Scene = {
          branch: 'main',
          releasePr: 'merged',
          tagWorkflows: 'failed',
        };

        when('[t0] plan mode', () => {
          then('exit 0: show merged', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'main-merged-failed-plan',
            });
            try {
              const result = runSkill(['--into', 'prod'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('merged');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });

        when('[t1] apply mode', () => {
          then('exit 2: tag failure (constraint), hint retry', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'main-merged-failed-apply',
            });
            try {
              const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('failed');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              // per spec: failed checks are constraint errors (exit 2)
              expect(result.status).toEqual(2);
            } finally {
              cleanup();
            }
          });
        });
      },
    );

    given('[case-main-failed] release PR failed', () => {
      const scene: Scene = {
        branch: 'main',
        releasePr: 'failed',
      };

      when('[t0] plan mode', () => {
        then('exit 2: show failures', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'main-failed-plan',
          });
          try {
            const result = runSkill(['--into', 'prod'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('failed');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            // per spec: failed checks are constraint errors (exit 2)
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[t1] apply mode', () => {
        then('exit 2: show failures', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'main-failed-apply',
          });
          try {
            const result = runSkill(['--into', 'prod', '--mode', 'apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('failed');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            // per spec: failed checks are constraint errors (exit 2)
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });
    });
  });

  // ============================================================================
  // --from main flag tests
  // ============================================================================

  describe('--from main behavior', () => {
    given(
      '[case-from-main-on-feat] on feature branch, --from main skips feat PR',
      () => {
        // we're on feat branch but --from main should release from main
        const scene: Scene = {
          branch: 'feat',
          featPr: 'inflight', // feat PR in progress but irrelevant
          releasePr: 'passed:wout-automerge', // release PR ready
          tagWorkflows: 'passed', // tag workflows complete successfully
        };

        when('[t0] plan mode with --from main --into prod', () => {
          then('shows release PR status, not feat PR', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'from-main-on-feat-plan',
            });
            try {
              const result = runSkill(['--from', 'main', '--into', 'prod'], {
                tempDir,
                fakeBinDir,
              });
              // should show release PR, not feat PR inflight message
              expect(result.stdout).toContain('chore(release)');
              expect(result.stdout).not.toContain('in progress');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });

        when('[t1] apply mode with --from main --into prod', () => {
          then('applies release PR, ignores feat PR', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'from-main-on-feat-apply',
            });
            try {
              const result = runSkill(
                ['--from', 'main', '--into', 'prod', '--mode', 'apply'],
                { tempDir, fakeBinDir },
              );
              // should apply release, exit 0 (merged)
              expect(result.stdout).toContain('chore(release)');
              expect(result.stdout).toContain('automerge enabled [added]');
              expect(result.stdout).not.toContain('in progress'); // feat PR ignored
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });
      },
    );

    given(
      '[case-from-branch-valid] --from <branch> specifies branch to release',
      () => {
        // scene.7: --from <branch> releases that branch to main (or prod if --into prod)
        // valid - allows release of a specific branch from any location
        const scene: Scene = {
          branch: 'main', // on main, but release a different branch
          featPr: 'passed:wout-automerge', // the "other" branch has a PR
        };

        when(
          '[t0] --from other --into main (release other branch to main)',
          () => {
            then('exit 0: releases the specified branch', () => {
              const { tempDir, fakeBinDir, cleanup } = setupScene({
                scene,
                slug: 'from-branch-valid',
              });
              try {
                const result = runSkill(['--from', 'other', '--into', 'main'], {
                  tempDir,
                  fakeBinDir,
                });
                // should show status for the "other" branch (mocked as featPr)
                expect(result.stdout).toContain('release:');
                expect(asTimingStable(result.stdout)).toMatchSnapshot();
                expect(result.status).toEqual(0);
              } finally {
                cleanup();
              }
            });
          },
        );
      },
    );

    given(
      '[case-from-main-on-main] on main branch, --from main is redundant but valid',
      () => {
        // when already on main, --from main should work identically to without flag
        const scene: Scene = {
          branch: 'main',
          releasePr: 'passed:wout-automerge',
          tagWorkflows: 'passed', // complete flow after merge
        };

        when('[t0] plan mode with --from main --into prod', () => {
          then('shows release PR status (same as without --from)', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'from-main-on-main-plan',
            });
            try {
              const result = runSkill(['--from', 'main', '--into', 'prod'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('chore(release)');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });

        when('[t1] apply mode with --from main --into prod', () => {
          then('applies release PR (same as without --from)', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'from-main-on-main-apply',
            });
            try {
              const result = runSkill(
                ['--from', 'main', '--into', 'prod', '--mode', 'apply'],
                { tempDir, fakeBinDir },
              );
              expect(result.stdout).toContain('chore(release)');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });
      },
    );

    given(
      '[case-from-main-to-main] --from main with --into main (invalid)',
      () => {
        // --from main --into main is invalid: you can't release main to main
        const scene: Scene = {
          branch: 'feat',
          featPr: 'inflight',
        };

        when('[t0] --from main --into main', () => {
          then('exit 2: already on main', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'from-main-to-main',
            });
            try {
              const result = runSkill(['--from', 'main', '--into', 'main'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stderr).toContain('already on main');
              expect(result.stderr).toMatchSnapshot();
              expect(result.status).toEqual(2);
            } finally {
              cleanup();
            }
          });
        });
      },
    );

    // ========================================================================
    // --from main with different release PR states (matrix coverage)
    // ========================================================================

    given(
      '[case-from-main-release-unfound] --from main with no release PR',
      () => {
        const scene: Scene = {
          branch: 'feat',
          featPr: 'inflight', // should be ignored
          releasePr: 'unfound',
          tagWorkflows: 'unfound',
        };

        when('[t0] plan mode', () => {
          then('shows latest tag (skips feat PR)', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'from-main-release-unfound-plan',
            });
            try {
              const result = runSkill(['--from', 'main', '--into', 'prod'], {
                tempDir,
                fakeBinDir,
              });
              // latest tag from mock is v1.33.0
              expect(result.stdout).toContain('v1.33.0');
              expect(result.stdout).not.toContain('in progress');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });

        when('[t1] apply mode', () => {
          then('shows latest tag, no workflows', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'from-main-release-unfound-apply',
            });
            try {
              const result = runSkill(
                ['--from', 'main', '--into', 'prod', '--mode', 'apply'],
                { tempDir, fakeBinDir },
              );
              // latest tag from mock is v1.33.0
              expect(result.stdout).toContain('v1.33.0');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });
      },
    );

    given(
      '[case-from-main-release-inflight] --from main with release PR inflight',
      () => {
        when('[t0] plan mode', () => {
          then('shows progress (skips feat PR)', () => {
            const scene: Scene = {
              branch: 'feat',
              featPr: 'passed:wout-automerge', // should be ignored
              releasePr: 'inflight',
            };
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'from-main-release-inflight-plan',
            });
            try {
              const result = runSkill(['--from', 'main', '--into', 'prod'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('in progress');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });

        when('[t1] apply mode', () => {
          then('watches PR then continues (transitions enabled)', () => {
            // transitions: true makes mock transition to passed → merged → tag workflows
            const scene: Scene = {
              branch: 'feat',
              featPr: 'passed:wout-automerge', // should be ignored
              releasePr: 'inflight',
              transitions: true,
            };
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'from-main-release-inflight-apply',
            });
            try {
              const result = runSkill(
                ['--from', 'main', '--into', 'prod', '--mode', 'apply'],
                { tempDir, fakeBinDir },
              );
              expect(result.stdout).toContain('in progress');
              expect(result.stdout).toContain('done!');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              // transitions drove completion, exit 0
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });
      },
    );

    given(
      '[case-from-main-release-failed] --from main with release PR failed',
      () => {
        const scene: Scene = {
          branch: 'feat',
          featPr: 'passed:with-automerge', // should be ignored
          releasePr: 'failed',
        };

        when('[t0] plan mode', () => {
          then('exit 2: shows failures (skips feat PR)', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'from-main-release-failed-plan',
            });
            try {
              const result = runSkill(['--from', 'main', '--into', 'prod'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('failed');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              // per spec: failed checks are constraint errors (exit 2)
              expect(result.status).toEqual(2);
            } finally {
              cleanup();
            }
          });
        });

        when('[t1] apply mode', () => {
          then('exit 2: shows failures', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'from-main-release-failed-apply',
            });
            try {
              const result = runSkill(
                ['--from', 'main', '--into', 'prod', '--mode', 'apply'],
                { tempDir, fakeBinDir },
              );
              expect(result.stdout).toContain('failed');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              // per spec: failed checks are constraint errors (exit 2)
              expect(result.status).toEqual(2);
            } finally {
              cleanup();
            }
          });
        });
      },
    );

    given(
      '[case-from-main-release-merged] --from main with release PR already merged',
      () => {
        const scene: Scene = {
          branch: 'feat',
          featPr: 'inflight', // should be ignored
          releasePr: 'merged',
          tagWorkflows: 'passed',
        };

        when('[t0] plan mode', () => {
          then('shows merged status (skips feat PR)', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'from-main-release-merged-plan',
            });
            try {
              const result = runSkill(['--from', 'main', '--into', 'prod'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('merged');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });

        when('[t1] apply mode', () => {
          then('shows tags passed', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'from-main-release-merged-apply',
            });
            try {
              const result = runSkill(
                ['--from', 'main', '--into', 'prod', '--mode', 'apply'],
                { tempDir, fakeBinDir },
              );
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });
      },
    );
  });

  // ============================================================================
  // permission requirements tests
  // ============================================================================

  describe('permission requirements', () => {
    given('[case-perm-no-local] apply mode without local permission', () => {
      const scene: Scene = { branch: 'feat', featPr: 'passed:wout-automerge' };

      when('[t0] apply without .meter/git.commit.uses.jsonc', () => {
        then('exit 2: hint permission', () => {
          // use setupScene for proper git config, then remove permission file
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'perm-no-local',
          });

          // remove the permission file that setupScene creates
          const meterFile = path.join(tempDir, '.meter/git.commit.uses.jsonc');
          fs.rmSync(meterFile, { force: true });

          try {
            const result = runSkill(['--mode', 'apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('git.commit.uses');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });
    });

    given('[case-perm-global-blocked] apply mode with global blocker', () => {
      const scene: Scene = { branch: 'feat', featPr: 'passed:wout-automerge' };

      when('[t0] apply with global blocker set', () => {
        then('exit 2: hint global blocker', () => {
          // use setupScene for proper git config
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'perm-global-blocked',
          });

          // setup global blocker in the test's HOME directory (tempDir)
          // runSkill sets HOME=tempDir, so the skill looks here
          const globalDir = path.join(
            tempDir,
            '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
          );
          fs.mkdirSync(globalDir, { recursive: true });
          const globalFile = path.join(
            globalDir,
            'git.commit.uses.global.jsonc',
          );
          fs.writeFileSync(globalFile, JSON.stringify({ blocked: true }));

          try {
            const result = runSkill(['--mode', 'apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('blocked globally');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });
    });

    given(
      '[case-perm-plan-no-check] plan mode does not check permissions',
      () => {
        const scene: Scene = {
          branch: 'feat',
          featPr: 'passed:wout-automerge',
        };

        when('[t0] plan without .meter/git.commit.uses.jsonc', () => {
          then('exit 0: plan proceeds without permission check', () => {
            // use setupScene for proper git config, then remove permission file
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'perm-plan-no-check',
            });

            // remove the permission file that setupScene creates
            const meterFile = path.join(
              tempDir,
              '.meter/git.commit.uses.jsonc',
            );
            fs.rmSync(meterFile, { force: true });

            try {
              const result = runSkill([], { tempDir, fakeBinDir }); // plan mode (default)
              expect(result.stdout).toContain('passed');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });
      },
    );
  });

  // ==========================================================================
  // --watch flag behavior (spec: --watch flag behavior)
  // ==========================================================================

  describe('--watch flag behavior', () => {
    given(
      '[case-watch-passed-no-automerge] checks passed, no automerge',
      () => {
        const scene: Scene = {
          branch: 'feat',
          featPr: 'passed:wout-automerge',
        };

        when('[t0] --watch flag used', () => {
          then('exit 0: reports automerge unfound', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'watch-passed-no-am',
            });

            try {
              const result = runSkill(['--watch'], { tempDir, fakeBinDir });
              expect(result.stdout).toContain('--watch');
              expect(result.stdout).toContain('automerge unfound');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });
      },
    );

    given(
      '[case-watch-passed-with-automerge] checks passed, automerge set',
      () => {
        when('[t0] --watch flag used', () => {
          then('polls until merged (transitions enabled)', () => {
            // transitions: true makes mock transition to MERGED after a few polls
            const scene: Scene = {
              branch: 'feat',
              featPr: 'passed:with-automerge',
              transitions: true,
            };
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'watch-passed-with-am',
            });

            try {
              const result = runSkill(['--watch'], { tempDir, fakeBinDir });
              expect(result.stdout).toContain('--watch');
              expect(result.stdout).toContain('automerge enabled [found]');
              expect(result.stdout).toContain('done!');
              expect(asTimingStable(result.stdout)).toMatchSnapshot();
              // transitions drove completion, exit 0
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });
      },
    );

    given('[case-watch-failed] checks failed', () => {
      const scene: Scene = {
        branch: 'feat',
        featPr: 'failed',
      };

      when('[t0] --watch flag used', () => {
        then('exit 2: shows failures immediately', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'watch-failed',
          });

          try {
            const result = runSkill(['--watch'], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('--watch');
            expect(result.stdout).toContain('failed');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });
    });

    given('[case-watch-merged] PR already merged', () => {
      const scene: Scene = {
        branch: 'feat',
        featPr: 'merged',
      };

      when('[t0] --watch flag used', () => {
        then('exit 0: shows merged immediately', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'watch-merged',
          });

          try {
            const result = runSkill(['--watch'], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('--watch');
            expect(result.stdout).toContain('merged');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });
  });

  // ==========================================================================
  // dirty state detection (spec: dirty state detection)
  // ==========================================================================

  describe('dirty state detection', () => {
    given('[case-dirty-plan] dirty worktree with plan mode', () => {
      const scene: Scene = {
        branch: 'feat',
        featPr: 'passed:wout-automerge',
      };

      when('[t0] plan mode (default)', () => {
        then('exit 0: dirty check ignored in plan mode', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'dirty-plan',
          });

          // create dirty state
          fs.writeFileSync(path.join(tempDir, 'tracked.txt'), 'original');
          spawnSync('git', ['add', 'tracked.txt'], { cwd: tempDir });
          spawnSync('git', ['commit', '-m', 'add tracked'], { cwd: tempDir });
          fs.writeFileSync(path.join(tempDir, 'tracked.txt'), 'modified');

          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('passed');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    given('[case-dirty-watch] dirty worktree with --watch mode', () => {
      const scene: Scene = {
        branch: 'feat',
        featPr: 'passed:wout-automerge',
      };

      when('[t0] --watch mode', () => {
        then('exit 0: dirty check ignored in watch mode', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'dirty-watch',
          });

          // create dirty state
          fs.writeFileSync(path.join(tempDir, 'tracked.txt'), 'original');
          spawnSync('git', ['add', 'tracked.txt'], { cwd: tempDir });
          spawnSync('git', ['commit', '-m', 'add tracked'], { cwd: tempDir });
          fs.writeFileSync(path.join(tempDir, 'tracked.txt'), 'modified');

          try {
            const result = runSkill(['--watch'], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('--watch');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    given('[case-dirty-apply] dirty worktree with apply mode', () => {
      const scene: Scene = {
        branch: 'feat',
        featPr: 'passed:wout-automerge',
      };

      when('[t0] apply mode (default --dirty block)', () => {
        then('exit 2: hints stash or --dirty allow', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'dirty-apply',
          });

          // create dirty state
          fs.writeFileSync(path.join(tempDir, 'tracked.txt'), 'original');
          spawnSync('git', ['add', 'tracked.txt'], { cwd: tempDir });
          spawnSync('git', ['commit', '-m', 'add tracked'], { cwd: tempDir });
          fs.writeFileSync(path.join(tempDir, 'tracked.txt'), 'modified');

          try {
            const result = runSkill(['--mode', 'apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('uncommitted changes');
            expect(result.stdout).toContain('--dirty allow');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[t1] apply mode with --dirty allow', () => {
        then('exit 0: proceeds normally', () => {
          const sceneMerged: Scene = {
            branch: 'feat',
            featPr: 'merged', // use merged to avoid watch loop
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: sceneMerged,
            slug: 'dirty-apply-allow',
          });

          // create dirty state
          fs.writeFileSync(path.join(tempDir, 'tracked.txt'), 'original');
          spawnSync('git', ['add', 'tracked.txt'], { cwd: tempDir });
          spawnSync('git', ['commit', '-m', 'add tracked'], { cwd: tempDir });
          fs.writeFileSync(path.join(tempDir, 'tracked.txt'), 'modified');

          try {
            const result = runSkill(['--mode', 'apply', '--dirty', 'allow'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('merged');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });
  });

  // ==========================================================================
  // argument validation (spec: argument validation)
  // ==========================================================================

  describe('argument validation', () => {
    given('[case-arg-to-invalid] --into invalid value', () => {
      when('[t0] --into invalid', () => {
        then('exit 2: shows error message', () => {
          const tempDir = genTempDir({ slug: 'arg-to-invalid', git: true });
          const fakeBinDir = path.join(tempDir, '.fakebin');
          fs.mkdirSync(fakeBinDir, { recursive: true });

          try {
            const result = spawnSync(
              'bash',
              [SKILL_PATH, '--into', 'invalid'],
              {
                cwd: tempDir,
                env: {
                  ...process.env,
                  PATH: `${fakeBinDir}:${process.env.PATH}`,
                  TERM: 'dumb',
                },
                encoding: 'utf-8',
              },
            );
            expect(result.stderr).toContain("--into must be 'main' or 'prod'");
            expect(result.stderr).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        });
      });
    });

    given('[case-arg-mode-invalid] --mode invalid value', () => {
      when('[t0] --mode invalid', () => {
        then('exit 2: shows error message', () => {
          const tempDir = genTempDir({ slug: 'arg-mode-invalid', git: true });
          const fakeBinDir = path.join(tempDir, '.fakebin');
          fs.mkdirSync(fakeBinDir, { recursive: true });

          try {
            const result = spawnSync(
              'bash',
              [SKILL_PATH, '--mode', 'invalid'],
              {
                cwd: tempDir,
                env: {
                  ...process.env,
                  PATH: `${fakeBinDir}:${process.env.PATH}`,
                  TERM: 'dumb',
                },
                encoding: 'utf-8',
              },
            );
            expect(result.stderr).toContain("--mode must be 'plan' or 'apply'");
            expect(result.stderr).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        });
      });
    });

    given('[case-arg-dirty-invalid] --dirty invalid value', () => {
      when('[t0] --dirty invalid', () => {
        then('exit 2: shows error message', () => {
          const tempDir = genTempDir({ slug: 'arg-dirty-invalid', git: true });
          const fakeBinDir = path.join(tempDir, '.fakebin');
          fs.mkdirSync(fakeBinDir, { recursive: true });

          try {
            const result = spawnSync(
              'bash',
              [SKILL_PATH, '--dirty', 'invalid'],
              {
                cwd: tempDir,
                env: {
                  ...process.env,
                  PATH: `${fakeBinDir}:${process.env.PATH}`,
                  TERM: 'dumb',
                },
                encoding: 'utf-8',
              },
            );
            expect(result.stderr).toContain(
              "--dirty must be 'block' or 'allow'",
            );
            expect(result.stderr).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        });
      });
    });

    given('[case-arg-not-git] not in git repo', () => {
      when('[t0] run outside git repo', () => {
        then('exit 2: shows error message', () => {
          const tempDir = genTempDir({ slug: 'arg-not-git', git: false });
          const fakeBinDir = path.join(tempDir, '.fakebin');
          fs.mkdirSync(fakeBinDir, { recursive: true });

          try {
            const result = spawnSync('bash', [SKILL_PATH], {
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
    });

    given('[case-arg-help] --help flag', () => {
      when('[t0] --help', () => {
        then('exit 0: shows usage', () => {
          const tempDir = genTempDir({ slug: 'arg-help', git: true });
          const fakeBinDir = path.join(tempDir, '.fakebin');
          fs.mkdirSync(fakeBinDir, { recursive: true });

          try {
            const result = spawnSync('bash', [SKILL_PATH, '--help'], {
              cwd: tempDir,
              env: {
                ...process.env,
                PATH: `${fakeBinDir}:${process.env.PATH}`,
                TERM: 'dumb',
              },
              encoding: 'utf-8',
            });
            expect(result.stdout).toContain('--into main');
            expect(result.stdout).toContain('--into prod');
            expect(result.stdout).toContain('--mode');
            expect(result.stdout).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        });
      });
    });

    given('[case-arg-defaults] no arguments', () => {
      when('[t0] run with no args', () => {
        then('exit 0: defaults to --into main', () => {
          const scene: Scene = {
            branch: 'feat',
            featPr: 'passed:wout-automerge',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'arg-defaults',
          });

          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('git.release --into main');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });
  });

  // ==========================================================================
  // retry behavior (spec: retry behavior)
  // ==========================================================================

  describe('retry behavior', () => {
    given('[case-retry-failed-pr] --retry with failed PR checks', () => {
      when('[t0] --retry flag used', () => {
        then('exit 0: reruns failed workflows', () => {
          const tempDir = genTempDir({ slug: 'retry-failed-pr', git: true });
          const fakeBinDir = path.join(tempDir, '.fakebin');
          fs.mkdirSync(fakeBinDir, { recursive: true });

          // mock gh CLI with failed checks and run rerun support
          const ghMock = `#!/bin/bash
set -euo pipefail
CMD_KEY="$1 $2"
case "$CMD_KEY" in
  "pr list")
    echo "42"
    ;;
  "pr view")
    echo '{"statusCheckRollup": [{"conclusion": "FAILURE", "status": "COMPLETED", "name": "test-unit", "detailsUrl": "https://github.com/test/repo/actions/runs/123"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat: test"}'
    ;;
  "run view")
    if echo "$*" | grep -q "jq"; then
      echo "Run jest tests"
    else
      echo '{"startedAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:02:34Z"}'
    fi
    ;;
  "run rerun")
    echo "rerun triggered"
    ;;
  *)
    echo "mock: unhandled $*" >&2
    exit 1
    ;;
esac
`;
          fs.writeFileSync(path.join(fakeBinDir, 'gh'), ghMock);
          fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

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
              [SKILL_PATH, '--into', 'main', '--retry'],
              {
                cwd: tempDir,
                env: {
                  ...process.env,
                  PATH: `${fakeBinDir}:${process.env.PATH}`,
                  TERM: 'dumb',
                  HOME: tempDir,
                },
                encoding: 'utf-8',
              },
            );
            expect(result.stdout).toContain('rerun');
            expect(asTimingStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        });
      });
    });
  });
});
