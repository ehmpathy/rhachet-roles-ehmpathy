import * as fs from 'fs';
import * as path from 'path';

/**
 * .what = mock gh CLI factory for git.release tests
 * .why = intercepts gh commands with controlled responses
 *
 * .note = this is the SINGLE SOURCE OF TRUTH for gh mocks
 *         all test files should use this instead of inline mocks
 *
 * features:
 * - dynamic automerge state (mark when enabled, return with-automerge state)
 * - counter-based transitions (for watch with 3+ poll cycles)
 * - retry transitions (failed → inflight after rerun)
 * - all PR list query patterns
 */

// ============================================================================
// types
// ============================================================================

export type PrState =
  | 'unfound'
  | 'inflight'
  | 'inflight:with-automerge'
  | 'passed:wout-automerge'
  | 'passed:with-automerge'
  | 'merged'
  | 'failed'
  | 'rebase:behind'
  | 'rebase:dirty';

export type TagState = 'unfound' | 'inflight' | 'passed' | 'failed';

/**
 * .what = scene config for test scenarios
 * .why = declarative specification of mock behavior
 */
export interface Scene {
  /** current git branch context */
  branch: 'feat' | 'main';
  /** feature PR state (for feat → main flow) */
  featPr?: PrState;
  /** release PR state (for main → prod flow) */
  releasePr?: PrState;
  /** tag workflow state (for tag publish flow) */
  tagWorkflows?: TagState;
  /**
   * enable counter-based transitions for watch
   * when true, mock will show 3+ poll cycles before terminal state
   */
  transitions?: boolean;
  /**
   * enable retry behavior
   * when true + failed state, rerun command is accepted
   */
  enableRetry?: boolean;
  /**
   * control whether retry succeeds (transitions to passed) or fails (stays failed)
   * default: true (retry succeeds)
   * set to false to test "retry didn't fix it" cases
   */
  retrySucceeds?: boolean;
  /**
   * explicit watch sequence for fine-grained control
   * overrides counter-based transitions
   */
  watchSequence?: Array<PrState | TagState>;
  /**
   * the title of the prior merged release PR
   * set to null to test "no prior release found" edge case
   */
  priorReleaseTitle?: string | null;
  /** custom feature branch name (default: turtle/feature-x) */
  featBranch?: string;
  /** custom feature PR title */
  featPrTitle?: string;
  /** custom release PR title */
  releasePrTitle?: string;
  /** custom release tag name */
  releaseTag?: string;
  /**
   * await freshness config for p4 tests
   * controls git merge-base --is-ancestor behavior
   */
  awaitFreshness?: 'fresh' | 'stale' | 'stale-then-fresh';
  /**
   * when release PR becomes available in await
   * 'immediate' = found on first check
   * 'after-wait' = found after poll cycles
   * 'never' = never found (timeout)
   */
  awaitReleasePr?: 'immediate' | 'after-wait' | 'never';
  /**
   * when tag becomes available in await
   * 'immediate' = found on first check
   * 'after-wait' = found after poll cycles
   * 'never' = never found (timeout)
   */
  awaitTag?: 'immediate' | 'after-wait' | 'never';
  /**
   * workflow status for release workflow on timeout
   */
  awaitWorkflowStatus?: 'failed' | 'in_progress' | 'passed' | 'not_found';
}

export interface MockGhOptions {
  featPr?: PrState;
  releasePr?: PrState;
  tagWorkflows?: TagState;
  transitions?: boolean;
  enableRetry?: boolean;
  watchSequence?: Array<PrState | TagState>;
  /**
   * .what = the title of the prior merged release PR to return for --state merged queries
   * .why = required input so tests explicitly declare what prior release exists
   * .note = set to null to test the "no prior release found" edge case
   */
  priorReleaseTitle: string | null;
}

// ============================================================================
// mock data generators
// ============================================================================

/**
 * .what = generate pr view json for a given PR state
 * .why = reusable mock data for any PR state
 */
export const genPrViewJson = (input: {
  state: PrState;
  title: string;
  nowIso?: string;
}): string => {
  const now = input.nowIso ?? new Date().toISOString();

  switch (input.state) {
    case 'unfound':
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

    case 'inflight:with-automerge':
      return JSON.stringify({
        statusCheckRollup: [
          {
            conclusion: null,
            status: 'IN_PROGRESS',
            name: 'test',
            startedAt: now,
          },
        ],
        autoMergeRequest: { enabledAt: '2024-01-01T00:00:00Z' },
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
export const genTagWorkflowJson = (input: { state: TagState }): string => {
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

// ============================================================================
// mock executable generator
// ============================================================================

/**
 * .what = generate gh mock executable
 * .why = creates a bash mock that responds to gh CLI commands
 */
export const genGhMockExecutable = (input: {
  mockBinDir: string;
  stateDir: string;
  options: MockGhOptions;
  prTitle?: string;
  releaseTitle?: string;
  tagName?: string;
}): void => {
  const {
    mockBinDir,
    stateDir,
    options,
    prTitle = 'feat(oceans): add reef protection',
    releaseTitle = 'chore(release): v1.2.3',
    tagName = 'v1.2.3',
  } = input;

  const nowIso = new Date().toISOString();

  // generate JSON for each state
  const featPrJson = options.featPr ? genPrViewJson({ state: options.featPr, title: prTitle, nowIso }) : '';
  const releasePrJson = options.releasePr ? genPrViewJson({ state: options.releasePr, title: releaseTitle, nowIso }) : '';
  const tagJson = options.tagWorkflows ? genTagWorkflowJson({ state: options.tagWorkflows }) : '[]';

  // write watch sequence to state dir if provided
  if (options.watchSequence && options.watchSequence.length > 0) {
    const sequenceFile = path.join(stateDir, 'watch_sequence.json');
    const validTagStates: TagState[] = ['unfound', 'inflight', 'passed', 'failed'];

    const sequenceData = options.watchSequence.map((state) => {
      // check if tagWorkflows is set and state is a valid tag state
      if (options.tagWorkflows !== undefined && validTagStates.includes(state as TagState)) {
        // tag sequence
        return {
          type: 'tag',
          tagJson: genTagWorkflowJson({ state: state as TagState }),
        };
      }
      // PR state - only generate tagJson if state is a valid tag state
      const isValidTagState = validTagStates.includes(state as TagState);
      return {
        type: 'pr',
        json: genPrViewJson({ state: state as PrState, title: prTitle, nowIso }),
        ...(isValidTagState ? { tagJson: genTagWorkflowJson({ state: state as TagState }) } : {}),
      };
    });
    fs.writeFileSync(sequenceFile, JSON.stringify(sequenceData));
  }

  const ghMock = `#!/bin/bash
set -euo pipefail

STATE_DIR="${stateDir}"

# increment pr view call counter (separate from other calls)
get_pr_view_count() {
  local COUNTER_FILE="\$STATE_DIR/gh_pr_view_count"
  if [[ -f "\$COUNTER_FILE" ]]; then
    cat "\$COUNTER_FILE"
  else
    echo "0"
  fi
}

increment_pr_view_count() {
  local COUNTER_FILE="\$STATE_DIR/gh_pr_view_count"
  local COUNT=\$(get_pr_view_count)
  COUNT=\$((COUNT + 1))
  echo "\$COUNT" > "\$COUNTER_FILE"
}

# handle pr list
if [[ "\$1" == "pr" && "\$2" == "list" ]]; then
  # check for get_latest_merged_release_pr_info query (--state merged with mergedAt field)
  if [[ "\$*" == *"--state merged"* ]] && [[ "\$*" == *"mergedAt"* ]]; then
    # return prior merged release PR info (required input: priorReleaseTitle)
    ${options.priorReleaseTitle !== null ? `echo "title=${options.priorReleaseTitle}"
    echo "merged_at=2024-01-01T00:00:00Z"` : `# no merged release PR found - return null format
    echo "title=null"
    echo "merged_at=null"`}
    exit 0
  fi
  if [[ "\$*" == *"chore(release)"* ]] || [[ "\$*" == *"--head main"* ]]; then
    # release PR
    ${options.releasePr === 'unfound' ? 'echo "[]"' : 'echo \'[{"number": 100, "title": "' + releaseTitle + '"}]\''}
  else
    # feature PR
    ${options.featPr === 'unfound' ? 'echo "[]"' : 'echo \'[{"number": 42, "title": "' + prTitle + '"}]\''}
  fi
  exit 0
fi

# handle pr view
if [[ "\$1" == "pr" && "\$2" == "view" ]]; then
  PR_NUM="\$3"

  # check for watch sequence
  SEQUENCE_FILE="\$STATE_DIR/watch_sequence.json"
  if [[ -f "\$SEQUENCE_FILE" ]]; then
    COUNT=\$(get_pr_view_count)
    increment_pr_view_count

    # get sequence length
    SEQ_LEN=\$(jq 'length' "\$SEQUENCE_FILE")

    # clamp to last item if past end
    if [[ \$COUNT -ge \$SEQ_LEN ]]; then
      COUNT=\$((SEQ_LEN - 1))
    fi

    # get json for this step
    JSON=\$(jq -r ".[\$COUNT].json // empty" "\$SEQUENCE_FILE")
    if [[ -n "\$JSON" ]]; then
      echo "\$JSON"
      exit 0
    fi
  fi

  # fallback to static response
  if [[ "\$PR_NUM" == "42" ]]; then
    echo '${featPrJson.replace(/'/g, "'\"'\"'")}'
  elif [[ "\$PR_NUM" == "100" ]]; then
    echo '${releasePrJson.replace(/'/g, "'\"'\"'")}'
  fi
  exit 0
fi

# handle pr merge (enable automerge)
if [[ "\$1" == "pr" && "\$2" == "merge" ]]; then
  echo "automerge enabled"
  exit 0
fi

# handle run list (tag workflows)
if [[ "\$1" == "run" && "\$2" == "list" ]]; then
  # check for watch sequence
  SEQUENCE_FILE="\$STATE_DIR/watch_sequence.json"
  if [[ -f "\$SEQUENCE_FILE" ]]; then
    COUNT=\$(get_pr_view_count)
    increment_pr_view_count

    # get sequence length
    SEQ_LEN=\$(jq 'length' "\$SEQUENCE_FILE")

    # clamp to last item if past end
    if [[ \$COUNT -ge \$SEQ_LEN ]]; then
      COUNT=\$((SEQ_LEN - 1))
    fi

    # get tagJson for this step
    TAG_JSON=\$(jq -r ".[\$COUNT].tagJson // empty" "\$SEQUENCE_FILE")
    if [[ -n "\$TAG_JSON" ]]; then
      echo "\$TAG_JSON"
      exit 0
    fi
  fi

  echo '${tagJson.replace(/'/g, "'\"'\"'")}'
  exit 0
fi

# handle workflow run (rerun)
if [[ "\$1" == "run" && "\$2" == "rerun" ]]; then
  echo "rerun triggered"
  exit 0
fi

# fallback
echo "mock gh: unknown command: \$*" >&2
exit 1
`;

  const ghPath = path.join(mockBinDir, 'gh');
  fs.writeFileSync(ghPath, ghMock);
  fs.chmodSync(ghPath, '755');
};

// ============================================================================
// comprehensive scene-based mock generator
// ============================================================================

/**
 * .what = generate gh mock from Scene config
 * .why = single source of truth for all test mocks
 *
 * features:
 * - dynamic automerge state (mark when enabled via pr merge, return with-automerge)
 * - counter-based transitions (show 3+ poll cycles before terminal state)
 * - retry transitions (failed → inflight after rerun)
 * - multi-transport flows (feat → release → tags)
 */
export const genSceneGhMock = (input: {
  scene: Scene;
  stateDir: string;
}): string => {
  const { scene, stateDir } = input;
  const nowIso = new Date().toISOString();

  // defaults
  const featPrNum = '42';
  const releasePrNum = '100';
  const featBranch = scene.featBranch ?? 'turtle/feature-x';
  const featPrTitle = scene.featPrTitle ?? 'feat(ocean): add surfboards';
  const releasePrTitle = scene.releasePrTitle ?? 'chore(release): v1.3.0';
  const releaseTag = scene.releaseTag ?? 'v1.3.0';
  const priorReleaseTitle = scene.priorReleaseTitle ?? 'chore(release): v1.3.0 🎉';

  // pre-generate all needed JSON variants
  const featPrView = scene.featPr && scene.featPr !== 'unfound'
    ? genPrViewJson({ state: scene.featPr, title: featPrTitle, nowIso })
    : '';
  const featPrViewMerged = genPrViewJson({ state: 'merged', title: featPrTitle, nowIso });
  const featPrViewPassed = genPrViewJson({
    state: scene.featPr === 'passed:with-automerge' ? 'passed:with-automerge' : 'passed:wout-automerge',
    title: featPrTitle,
    nowIso,
  });
  const featPrViewWithAutomerge = genPrViewJson({ state: 'inflight:with-automerge', title: featPrTitle, nowIso });
  const featPrViewPassedWithAutomerge = genPrViewJson({ state: 'passed:with-automerge', title: featPrTitle, nowIso });
  const featPrViewInflight = genPrViewJson({ state: 'inflight', title: featPrTitle, nowIso });

  const releasePrView = scene.releasePr && scene.releasePr !== 'unfound'
    ? genPrViewJson({ state: scene.releasePr, title: releasePrTitle, nowIso })
    : '';
  const releasePrViewMerged = genPrViewJson({ state: 'merged', title: releasePrTitle, nowIso });
  const releasePrViewPassed = genPrViewJson({
    state: scene.releasePr === 'passed:with-automerge' ? 'passed:with-automerge' : 'passed:wout-automerge',
    title: releasePrTitle,
    nowIso,
  });
  const releasePrViewWithAutomerge = genPrViewJson({ state: 'inflight:with-automerge', title: releasePrTitle, nowIso });
  const releasePrViewPassedWithAutomerge = genPrViewJson({ state: 'passed:with-automerge', title: releasePrTitle, nowIso });
  const releasePrViewInflight = genPrViewJson({ state: 'inflight', title: releasePrTitle, nowIso });

  const tagRuns = scene.tagWorkflows
    ? genTagWorkflowJson({ state: scene.tagWorkflows })
    : genTagWorkflowJson({ state: 'unfound' });
  const tagRunsPassed = genTagWorkflowJson({ state: 'passed' });
  const tagRunsInflight = genTagWorkflowJson({ state: 'inflight' });

  // check if initial states have automerge
  const featPrHasAutomerge = scene.featPr === 'passed:with-automerge' || scene.featPr === 'inflight:with-automerge';
  const releasePrHasAutomerge = scene.releasePr === 'passed:with-automerge' || scene.releasePr === 'inflight:with-automerge';

  // escape single quotes for bash
  const esc = (s: string) => s.replace(/'/g, "'\"'\"'");

  return `#!/bin/bash
set -euo pipefail

NOW="${nowIso}"
ALL_ARGS="$*"
CMD_KEY="\${1:-} \${2:-}"
STATE_DIR="${stateDir}"
ENABLE_RETRY="${scene.enableRetry ? 'true' : 'false'}"
RETRY_SUCCEEDS="${scene.retrySucceeds !== false ? 'true' : 'false'}"
TRANSITIONS_ENABLED="${scene.transitions ? 'true' : 'false'}"
FEAT_HAS_AUTOMERGE="${featPrHasAutomerge ? 'true' : 'false'}"
RELEASE_HAS_AUTOMERGE="${releasePrHasAutomerge ? 'true' : 'false'}"
AWAIT_RELEASE_PR="${scene.awaitReleasePr ?? 'never'}"

# debug: log all gh calls
echo "GH: $*" >> "$STATE_DIR/gh-debug.log"

# pre-initialize merged state for scene-specified merged PRs
${scene.featPr === 'merged' ? `touch "$STATE_DIR/merged-${featPrNum}"` : '# feat not pre-merged'}
${scene.releasePr === 'merged' ? `touch "$STATE_DIR/merged-${releasePrNum}"` : '# release not pre-merged'}

# ============================================================================
# state operations
# ============================================================================

is_merged() {
  local pr_num="$1"
  [[ -f "$STATE_DIR/merged-$pr_num" ]]
}

mark_merged() {
  local pr_num="$1"
  touch "$STATE_DIR/merged-$pr_num"
}

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

get_counter() {
  local key="$1"
  local file="$STATE_DIR/counter-$key"
  if [[ -f "$file" ]]; then
    cat "$file"
  else
    echo "0"
  fi
}

# check if rerun was triggered for a PR
was_rerun_triggered() {
  local pr_num="$1"
  [[ -f "$STATE_DIR/rerun-$pr_num" ]]
}

mark_rerun() {
  local pr_num="$1"
  touch "$STATE_DIR/rerun-$pr_num"
  # reset counter to show poll cycles after rerun
  echo "0" > "$STATE_DIR/counter-view-$pr_num"
}

# check if tag rerun was triggered
was_tag_rerun_triggered() {
  [[ -f "$STATE_DIR/rerun-tags" ]]
}

mark_tag_rerun() {
  touch "$STATE_DIR/rerun-tags"
  # reset counter to show poll cycles after rerun
  echo "0" > "$STATE_DIR/counter-tag-runs"
}

# check if PR has passed (counter >= 7 means enough polls to show "passed")
is_passed() {
  local pr_num="$1"
  if [[ "$TRANSITIONS_ENABLED" != "true" ]]; then
    return 1
  fi
  local count
  count=$(get_counter "view-$pr_num")
  [[ $count -ge 7 ]]
}

# check if automerge is enabled (initial or dynamic)
has_feat_automerge_enabled() {
  local pr_num="$1"
  [[ "$FEAT_HAS_AUTOMERGE" == "true" ]] || [[ -f "$STATE_DIR/automerge-enabled-$pr_num" ]]
}

has_release_automerge_enabled() {
  local pr_num="$1"
  [[ "$RELEASE_HAS_AUTOMERGE" == "true" ]] || [[ -f "$STATE_DIR/automerge-enabled-$pr_num" ]]
}

# check if should auto-merge (counter >= 9 means ready to merge)
should_auto_merge_feat() {
  local pr_num="$1"
  if ! has_feat_automerge_enabled "$pr_num"; then
    return 1
  fi
  if [[ "$TRANSITIONS_ENABLED" == "true" ]]; then
    local count
    count=$(get_counter "view-$pr_num")
    [[ $count -ge 9 ]] && return 0
  fi
  local count
  count=$(get_counter "view-$pr_num")
  [[ $count -ge 5 ]] && return 0
  return 1
}

should_auto_merge_release() {
  local pr_num="$1"
  if ! has_release_automerge_enabled "$pr_num"; then
    return 1
  fi
  if [[ "$TRANSITIONS_ENABLED" == "true" ]]; then
    local count
    count=$(get_counter "view-$pr_num")
    [[ $count -ge 9 ]] && return 0
  fi
  local count
  count=$(get_counter "view-$pr_num")
  [[ $count -ge 5 ]] && return 0
  return 1
}

# check if tag workflows are done
is_tag_done() {
  if [[ "$TRANSITIONS_ENABLED" != "true" ]]; then
    return 1
  fi
  local count
  count=$(get_counter "tag-runs")
  [[ $count -ge 3 ]]
}

# ============================================================================
# command handlers
# ============================================================================

case "$CMD_KEY" in
  "pr list")
    # check for get_latest_merged_release_pr_info query (--state merged with --limit 21)
    if echo "$ALL_ARGS" | grep -q "merged" && echo "$ALL_ARGS" | grep -q -- "--limit 21"; then
      ${scene.priorReleaseTitle !== null ? `echo "title=${priorReleaseTitle}"` : 'echo "title=null"'}
      exit 0
    # check if this is a feat PR query (by branch head) or release PR query (by title)
    elif echo "$ALL_ARGS" | grep -q "chore(release)"; then
      # release PR query
      # check for get_fresh_release_pr query (--json number,title,headRefOid)
      if echo "$ALL_ARGS" | grep -q -- "--json number,title,headRefOid"; then
        # return JSON format for freshness check (open PRs)
        if is_merged "${releasePrNum}"; then
          echo ""
        elif [[ "${scene.releasePr === 'unfound'}" == "true" ]]; then
          # handle await modes for unfound release PR
          if [[ "$AWAIT_RELEASE_PR" == "after-wait" ]]; then
            # use counter: first 2 polls return empty, then PR appears
            AWAIT_COUNT=$(inc_counter "await-release-pr")
            if [[ $AWAIT_COUNT -lt 3 ]]; then
              echo ""
            else
              echo '{"number":${releasePrNum},"title":"${releasePrTitle}","headRefOid":"mock_release_pr_head_sha"}'
            fi
          elif [[ "$AWAIT_RELEASE_PR" == "immediate" ]]; then
            # immediate: return PR right away
            echo '{"number":${releasePrNum},"title":"${releasePrTitle}","headRefOid":"mock_release_pr_head_sha"}'
          else
            # never: always return empty (timeout)
            echo ""
          fi
        elif [[ "${scene.featPr === undefined}" == "true" ]] || is_merged "${featPrNum}" || [[ "${scene.featPr === 'merged'}" == "true" ]]; then
          # featPr undefined = --from main scenario, skip feat PR check
          echo '{"number":${releasePrNum},"title":"${releasePrTitle}","headRefOid":"mock_release_pr_head_sha"}'
        else
          echo ""
        fi
      elif echo "$ALL_ARGS" | grep -q -- "--json number,title,mergeCommit"; then
        # return JSON format for freshness check (merged PRs)
        # use HEAD SHA so freshness check passes (test creates tag on HEAD)
        RELEASE_MERGE_SHA=$(/usr/bin/git rev-parse HEAD)
        if is_merged "${releasePrNum}"; then
          echo '{"number":${releasePrNum},"title":"${releasePrTitle}","mergeCommit":{"oid":"'"$RELEASE_MERGE_SHA"'"}}'
        elif [[ "${scene.releasePr === 'merged'}" == "true" ]]; then
          echo '{"number":${releasePrNum},"title":"${releasePrTitle}","mergeCommit":{"oid":"'"$RELEASE_MERGE_SHA"'"}}'
        else
          echo ""
        fi
      elif echo "$ALL_ARGS" | grep -q "| \\.title"; then
        # get_release_pr_title
        if is_merged "${releasePrNum}"; then
          echo "${releasePrTitle}"
        elif [[ "${scene.releasePr === 'unfound'}" == "true" ]]; then
          echo ""
        elif [[ "${scene.featPr === undefined}" == "true" ]] || is_merged "${featPrNum}" || [[ "${scene.featPr === 'merged'}" == "true" ]]; then
          # featPr undefined = --from main scenario, skip feat PR check
          echo "${releasePrTitle}"
        else
          echo ""
        fi
      else
        # get_release_pr: return PR number
        if echo "$ALL_ARGS" | grep -q "merged"; then
          if is_merged "${releasePrNum}"; then
            echo "${releasePrNum}"
          else
            ${scene.releasePr === 'merged' ? `echo "${releasePrNum}"` : 'echo ""'}
          fi
        else
          if is_merged "${releasePrNum}"; then
            echo ""
          elif [[ "${scene.releasePr === 'unfound'}" == "true" ]]; then
            echo ""
          elif [[ "${scene.featPr === undefined}" == "true" ]] || is_merged "${featPrNum}" || [[ "${scene.featPr === 'merged'}" == "true" ]]; then
            # featPr undefined = --from main scenario, skip feat PR check
            echo "${releasePrNum}"
          else
            echo ""
          fi
        fi
      fi
    elif echo "$ALL_ARGS" | grep -q -- "--head"; then
      # feat PR query by head branch
      if echo "$ALL_ARGS" | grep -q "merged"; then
        if is_merged "${featPrNum}"; then
          echo "${featPrNum}"
        else
          ${scene.featPr === 'merged' ? `echo "${featPrNum}"` : 'echo ""'}
        fi
      else
        if is_merged "${featPrNum}"; then
          echo ""
        else
          ${scene.featPr === 'merged' || scene.featPr === 'unfound' ? 'echo ""' : `echo "${featPrNum}"`}
        fi
      fi
    else
      echo ""
    fi
    ;;

  "pr view")
    PR_NUM="$3"

    # handle mergeCommit query (for await freshness check)
    if echo "$ALL_ARGS" | grep -q "mergeCommit"; then
      # check if --jq '.mergeCommit.oid' is present (extract just SHA)
      if echo "$ALL_ARGS" | grep -qF '.mergeCommit.oid'; then
        echo 'mock_merge_commit_sha_'"\$PR_NUM"
      else
        echo '{"mergeCommit":{"oid":"mock_merge_commit_sha_'"\$PR_NUM"'"}}'
      fi
      exit 0
    fi

    inc_counter "view-$PR_NUM" > /dev/null
    if [[ "$PR_NUM" == "${featPrNum}" ]]; then
      # handle retry: if rerun was triggered and scene started as failed, show poll cycles then transition
      if was_rerun_triggered "${featPrNum}" && [[ "${scene.featPr}" == "failed" ]]; then
        RETRY_COUNT=$(get_counter "view-$PR_NUM")
        if [[ $RETRY_COUNT -ge 4 ]]; then
          # after 4 polls, check if retry succeeds or fails
          if [[ "$RETRY_SUCCEEDS" == "true" ]]; then
            # transition to passed (retry success path)
            if [[ -f "$STATE_DIR/automerge-enabled-$PR_NUM" ]]; then
              echo '${esc(featPrViewPassedWithAutomerge)}'
            else
              echo '${esc(genPrViewJson({ state: 'passed:wout-automerge', title: featPrTitle, nowIso }))}'
            fi
          else
            # retry failed - return to failed state
            echo '${esc(featPrView)}'
          fi
        else
          # show inflight for retry poll cycles (RETRY_COUNT=$RETRY_COUNT)
          if [[ -f "$STATE_DIR/automerge-enabled-$PR_NUM" ]]; then
            echo '${esc(featPrViewWithAutomerge)}'
          else
            echo '${esc(featPrViewInflight)}'
          fi
        fi
        exit 0
      fi
      if is_merged "${featPrNum}"; then
        echo '${esc(featPrViewMerged)}'
      elif should_auto_merge_feat "${featPrNum}"; then
        mark_merged "${featPrNum}"
        echo '${esc(featPrViewMerged)}'
      elif is_passed "${featPrNum}"; then
        if [[ -f "$STATE_DIR/automerge-enabled-$PR_NUM" ]] && [[ "$FEAT_HAS_AUTOMERGE" != "true" ]]; then
          echo '${esc(featPrViewPassedWithAutomerge)}'
        else
          echo '${esc(featPrViewPassed)}'
        fi
      else
        if [[ -f "$STATE_DIR/automerge-enabled-$PR_NUM" ]] && [[ "$FEAT_HAS_AUTOMERGE" != "true" ]]; then
          echo '${esc(featPrViewWithAutomerge)}'
        else
          echo '${esc(featPrView)}'
        fi
      fi
    elif [[ "$PR_NUM" == "${releasePrNum}" ]]; then
      # handle retry: if rerun was triggered and scene started as failed, show poll cycles then transition
      if was_rerun_triggered "${releasePrNum}" && [[ "${scene.releasePr}" == "failed" ]]; then
        RETRY_COUNT=$(get_counter "view-$PR_NUM")
        if [[ $RETRY_COUNT -ge 4 ]]; then
          # after 4 polls, check if retry succeeds or fails
          if [[ "$RETRY_SUCCEEDS" == "true" ]]; then
            # transition to passed (retry success path)
            if [[ -f "$STATE_DIR/automerge-enabled-$PR_NUM" ]]; then
              echo '${esc(releasePrViewPassedWithAutomerge)}'
            else
              echo '${esc(genPrViewJson({ state: 'passed:wout-automerge', title: releasePrTitle, nowIso }))}'
            fi
          else
            # retry failed - return to failed state
            echo '${esc(releasePrView)}'
          fi
        else
          # show inflight for retry poll cycles
          if [[ -f "$STATE_DIR/automerge-enabled-$PR_NUM" ]]; then
            echo '${esc(releasePrViewWithAutomerge)}'
          else
            echo '${esc(releasePrViewInflight)}'
          fi
        fi
        exit 0
      fi
      if is_merged "${releasePrNum}"; then
        echo '${esc(releasePrViewMerged)}'
      elif should_auto_merge_release "${releasePrNum}"; then
        mark_merged "${releasePrNum}"
        echo '${esc(releasePrViewMerged)}'
      elif is_passed "${releasePrNum}"; then
        if [[ -f "$STATE_DIR/automerge-enabled-$PR_NUM" ]] && [[ "$RELEASE_HAS_AUTOMERGE" != "true" ]]; then
          echo '${esc(releasePrViewPassedWithAutomerge)}'
        else
          echo '${esc(releasePrViewPassed)}'
        fi
      else
        if [[ -f "$STATE_DIR/automerge-enabled-$PR_NUM" ]] && [[ "$RELEASE_HAS_AUTOMERGE" != "true" ]]; then
          echo '${esc(releasePrViewWithAutomerge)}'
        else
          echo '${esc(releasePrView)}'
        fi
      fi
    else
      echo "unknown PR: $PR_NUM" >&2
      exit 1
    fi
    ;;

  "pr merge")
    PR_NUM="$3"
    touch "$STATE_DIR/automerge-enabled-$PR_NUM"
    if [[ "$PR_NUM" == "${featPrNum}" ]]; then
      if has_feat_automerge_enabled "$PR_NUM" && is_passed "$PR_NUM"; then
        mark_merged "$PR_NUM"
      fi
    elif [[ "$PR_NUM" == "${releasePrNum}" ]]; then
      if has_release_automerge_enabled "$PR_NUM" && is_passed "$PR_NUM"; then
        mark_merged "$PR_NUM"
      fi
    fi
    echo "auto-merge enabled"
    ;;

  "run list")
    # handle release workflow status query (for await timeout diagnostics)
    if echo "$ALL_ARGS" | grep -q "release.yml"; then
      ${(() => {
        switch (scene.awaitWorkflowStatus) {
          case 'failed':
            return `echo '[{"status":"completed","conclusion":"failure","url":"https://github.com/test/repo/actions/runs/12345"}]'`;
          case 'in_progress':
            return `echo '[{"status":"in_progress","conclusion":null,"url":"https://github.com/test/repo/actions/runs/12345"}]'`;
          case 'passed':
            return `echo '[{"status":"completed","conclusion":"success","url":"https://github.com/test/repo/actions/runs/12345"}]'`;
          case 'not_found':
            return `echo '[]'`;
          default:
            // default to passed
            return `echo '[{"status":"completed","conclusion":"success","url":"https://github.com/test/repo/actions/runs/12345"}]'`;
        }
      })()}
      exit 0
    fi

    inc_counter "tag-runs" > /dev/null
    TAG_CALL_COUNT=$(get_counter "tag-runs")

    # handle retry: if rerun was triggered and scene started as failed, show poll cycles then transition
    if was_tag_rerun_triggered && [[ "${scene.tagWorkflows}" == "failed" ]]; then
      RETRY_COUNT=$TAG_CALL_COUNT
      if [[ $RETRY_COUNT -ge 4 ]]; then
        # after 4 polls, check if retry succeeds or fails
        if [[ "$RETRY_SUCCEEDS" == "true" ]]; then
          # transition to passed (retry success path)
          echo '${esc(tagRunsPassed)}'
        else
          # retry failed - return to failed state
          echo '${esc(tagRuns)}'
        fi
      else
        # show inflight for retry poll cycles
        echo '${esc(tagRunsInflight)}'
      fi
      exit 0
    fi

    # for failed state, always return failed first (so rerun can be triggered)
    # then transitions kick in only after rerun
    if [[ "${scene.tagWorkflows}" == "failed" ]]; then
      echo '${esc(tagRuns)}'
      exit 0
    fi

    # for non-failed states, use normal transition logic
    if is_tag_done; then
      echo '${esc(tagRunsPassed)}'
    elif [[ "$TRANSITIONS_ENABLED" == "true" ]] && [[ $TAG_CALL_COUNT -ge 1 ]]; then
      # after first call, show inflight then transition to passed
      if [[ $TAG_CALL_COUNT -ge 4 ]]; then
        echo '${esc(tagRunsPassed)}'
      else
        echo '${esc(tagRunsInflight)}'
      fi
    else
      echo '${esc(tagRuns)}'
    fi
    ;;

  "run view")
    if echo "$ALL_ARGS" | grep -q "jobs"; then
      echo "publish"
    else
      echo '{"startedAt": "'$NOW'", "updatedAt": "'$NOW'"}'
    fi
    ;;

  "run rerun")
    RUN_ID="\${3:-}"
    echo "rerun triggered"
    # mark rerun for retry transition logic
    if [[ "${scene.tagWorkflows}" == "failed" ]]; then
      mark_tag_rerun
    elif [[ "${scene.featPr}" == "failed" ]]; then
      mark_rerun "${featPrNum}"
    elif [[ "${scene.releasePr}" == "failed" ]]; then
      mark_rerun "${releasePrNum}"
    fi
    ;;

  "release view")
    echo '{"tagName": "${releaseTag}", "name": "${releaseTag}"}'
    ;;

  *)
    echo "mock: unhandled gh $*" >&2
    exit 1
    ;;
esac
`;
};

/**
 * .what = write scene-based gh mock to disk
 * .why = convenience wrapper that writes the mock executable
 */
export const writeSceneGhMock = (input: {
  scene: Scene;
  mockBinDir: string;
  stateDir: string;
}): void => {
  const { scene, mockBinDir, stateDir } = input;

  // write gh mock
  const ghMock = genSceneGhMock({ scene, stateDir });
  const ghPath = path.join(mockBinDir, 'gh');
  fs.writeFileSync(ghPath, ghMock);
  fs.chmodSync(ghPath, '755');

  // write git mock (for merge-base --is-ancestor freshness checks)
  const awaitFreshness = scene.awaitFreshness ?? 'fresh';
  const gitMock = `#!/bin/bash
set -euo pipefail

STATE_DIR="${stateDir}"

get_counter() {
  local key="\$1"
  local file="\$STATE_DIR/counter-\$key"
  if [[ -f "\$file" ]]; then
    cat "\$file"
  else
    echo "0"
  fi
}

inc_counter() {
  local key="\$1"
  local file="\$STATE_DIR/counter-\$key"
  local count=\$(get_counter "\$key")
  echo "\$((count + 1))" > "\$file"
}

# handle merge-base --is-ancestor (freshness check)
if [[ "\$1" == "merge-base" && "\$2" == "--is-ancestor" ]]; then
  ${(() => {
    switch (awaitFreshness) {
      case 'fresh':
        return 'exit 0  # fresh: is ancestor';
      case 'stale':
        return 'exit 1  # stale: not ancestor';
      case 'stale-then-fresh':
        return `COUNT=$(get_counter "merge-base")
  inc_counter "merge-base" > /dev/null
  if [[ $COUNT -ge 3 ]]; then
    exit 0  # now fresh
  else
    exit 1  # still stale
  fi`;
      default:
        return 'exit 0  # default: fresh';
    }
  })()}
fi

# handle rev-parse refs/tags/... (tag commit lookup)
if [[ "\$1" == "rev-parse" ]] && echo "\$*" | grep -q "refs/tags"; then
  # return a mock tag commit SHA
  echo "mock_tag_commit_sha"
  exit 0
fi

# pass through to real git
exec /usr/bin/git "\$@"
`;
  const gitPath = path.join(mockBinDir, 'git');
  fs.writeFileSync(gitPath, gitMock);
  fs.chmodSync(gitPath, '755');
};

// ============================================================================
// simple key-value mocks (for p1 tests)
// ============================================================================

/**
 * .what = generate simple key-value gh mock
 * .why = supports p1 test pattern: mockResponses[commandKey] = response
 *
 * features:
 * - command keys: "pr list", "pr view", "pr merge", "run list", etc.
 * - ERROR: prefix for exit 1 with stderr
 * - SEQUENCE: prefix for array of responses (stateful)
 * - special cases for "pr list" variants (--state open/merged, .title/.number)
 * - special cases for "run view" variants (--json jobs/startedAt)
 */
export const genSimpleGhMock = (input: {
  mockResponses: Record<string, string>;
  stateDir: string;
}): string => {
  const { mockResponses, stateDir } = input;

  // escape for bash single quotes
  const mockJson = JSON.stringify(mockResponses).replace(/'/g, "'\"'\"'");

  return `#!/bin/bash
set -euo pipefail

# mock gh cli for tests (simple key-value pattern)
MOCK_RESPONSES='${mockJson}'
STATE_DIR="${stateDir}"

# build command key from first 2 args only (e.g., "pr list", "pr view")
CMD_KEY="$1 $2"
ALL_ARGS="$*"

# distinguish "run view" subvariants by --json flag
if [[ "$CMD_KEY" == "run view" ]]; then
  if [[ "$ALL_ARGS" == *"--json jobs"* ]]; then
    CMD_KEY="run view jobs"
  elif [[ "$ALL_ARGS" == *"--json startedAt"* ]]; then
    CMD_KEY="run view duration"
  fi
fi

# handle "pr view --json mergeCommit" for and_then_await freshness checks
if [[ "$CMD_KEY" == "pr view" ]] && [[ "$ALL_ARGS" == *"--json mergeCommit"* ]]; then
  # return the actual HEAD commit SHA so freshness check works with real git
  # (the test creates a tag on HEAD, so this commit is ancestor of the tag)
  /usr/bin/git rev-parse HEAD
  exit 0
fi

# distinguish "pr list" subvariants by --state flag and --jq query
if [[ "$CMD_KEY" == "pr list" ]]; then
  # check for --limit 21 query FIRST (get_latest_merged_release_pr_info)
  if [[ "$ALL_ARGS" == *"--state merged"* ]] && [[ "$ALL_ARGS" == *"--limit 21"* ]]; then
    # always return a prior merged release PR by default (realistic behavior)
    echo "title=chore(release): v1.33.0 🎉"
    exit 0
  # check for mergeCommit query (and_then_await freshness for merged release PR)
  elif [[ "$ALL_ARGS" == *"--state merged"* ]] && [[ "$ALL_ARGS" == *"mergeCommit"* ]]; then
    # return merged release PR with actual HEAD SHA for freshness check
    HEAD_SHA=$(/usr/bin/git rev-parse HEAD)
    echo '{"number": 99, "title": "chore(release): v1.33.0", "mergeCommit": {"oid": "'"$HEAD_SHA"'"}}'
    exit 0
  elif [[ "$ALL_ARGS" == *".title"* ]]; then
    # check for "pr list title" key first, fallback to "pr list"
    RESPONSE_TITLE=$(echo "$MOCK_RESPONSES" | jq -r '.["pr list title"] // empty')
    if [[ -n "$RESPONSE_TITLE" ]]; then
      CMD_KEY="pr list title"
    fi
  elif [[ "$ALL_ARGS" == *"--state open"* ]]; then
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

  # support stateful sequences: prefix "SEQUENCE:" means array of responses
  # each call returns next item from array (or last if exhausted)
  if [[ "$RESPONSE" == SEQUENCE:* ]]; then
    SEQUENCE_JSON="\${RESPONSE#SEQUENCE:}"
    # counter file uses stateDir for isolation
    COUNTER_FILE="$STATE_DIR/counter-$(echo "$CMD_KEY" | tr ' ' '-')"
    if [[ ! -f "$COUNTER_FILE" ]]; then
      echo "0" > "$COUNTER_FILE"
    fi
    INDEX=$(cat "$COUNTER_FILE")
    ARRAY_LEN=$(echo "$SEQUENCE_JSON" | jq 'length')
    if [[ $INDEX -ge $ARRAY_LEN ]]; then
      INDEX=$((ARRAY_LEN - 1))
    fi
    echo "$((INDEX + 1))" > "$COUNTER_FILE"
    RESPONSE=$(echo "$SEQUENCE_JSON" | jq -r ".[$INDEX]")
  fi

  echo "$RESPONSE"
  exit 0
fi

# fallback for unhandled commands
echo "mock: unhandled gh $*" >&2
exit 1
`;
};

/**
 * .what = write simple key-value gh mock to disk
 * .why = convenience wrapper for p1 tests
 */
export const writeSimpleGhMock = (input: {
  mockResponses: Record<string, string>;
  mockBinDir: string;
  stateDir: string;
}): void => {
  const { mockResponses, mockBinDir, stateDir } = input;
  const ghMock = genSimpleGhMock({ mockResponses, stateDir });
  const ghPath = path.join(mockBinDir, 'gh');
  fs.writeFileSync(ghPath, ghMock);
  fs.chmodSync(ghPath, '755');
};

/**
 * .what = write rhachet keyrack mock to disk
 * .why = keyrack.operations.sh requires rhachet at node_modules/.bin/rhachet
 *
 * .note = creates mock at both:
 *   - tempDir/node_modules/.bin/rhachet (keyrack.operations.sh absolute path)
 *   - mockBinDir/rhachet (PATH-based fallback)
 */
export const writeRhachetMock = (input: {
  tempDir: string;
  mockBinDir: string;
}): void => {
  const { tempDir, mockBinDir } = input;

  const rhachetMock = `#!/bin/bash
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
  fs.writeFileSync(path.join(nodeModulesBinDir, 'rhachet'), rhachetMock);
  fs.chmodSync(path.join(nodeModulesBinDir, 'rhachet'), '755');

  // also create in mockBinDir for PATH-based lookups
  fs.writeFileSync(path.join(mockBinDir, 'rhachet'), rhachetMock);
  fs.chmodSync(path.join(mockBinDir, 'rhachet'), '755');
};

/**
 * .what = setup git.commit.uses permission for apply mode tests
 * .why = apply mode requires push permission
 */
export const writeGitCommitUsesPermission = (input: {
  tempDir: string;
}): void => {
  const { tempDir } = input;
  const meterDir = path.join(tempDir, '.meter');
  fs.mkdirSync(meterDir, { recursive: true });
  fs.writeFileSync(
    path.join(meterDir, 'git.commit.uses.jsonc'),
    JSON.stringify({ uses: 'infinite', push: 'allow', stage: 'allow' }),
  );
};
