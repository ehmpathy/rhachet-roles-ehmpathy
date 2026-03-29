import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = p4 integration tests: and_then_await with commit-based freshness
 * .why = exhaustive coverage of await behavior per test matrix
 *
 * test matrix:
 *   - cases 1-4: found scenarios (immediate + after wait, release-pr + tag)
 *   - cases 5-10: stale rejection scenarios
 *   - cases 11-18: timeout with workflow status variants
 */

// tests use mocked gh/git, 5s timeout is plenty
jest.setTimeout(5000);

// ============================================================================
// test infrastructure
// ============================================================================

const SKILL_DIR = path.join(
  __dirname,
  '../../../../../dist/domain.roles/mechanic/skills/git.release',
);

const asTimeStable = (output: string): string => {
  return output
    .replace(/\d+s in await/g, 'Xs in await')
    .replace(/after \d+s/g, 'after Xs');
};

interface MockConfig {
  /** gh pr list response for release PR lookup */
  prListResponse?: string;
  /** sequence of pr list responses (for poll evolution) */
  prListSequence?: string[];
  /** exit code for git merge-base --is-ancestor (0=fresh, 1=stale) */
  ancestorExitCode?: number;
  /** sequence of ancestor exit codes (for stale → fresh evolution) */
  ancestorSequence?: number[];
  /** tag commit sha returned by git rev-parse */
  tagCommit?: string;
  /** sequence of tag commits (for poll evolution) */
  tagSequence?: string[];
  /** workflow status for release-please lookup */
  workflowStatus?: 'failed' | 'in_progress' | 'passed' | 'not_found';
}

const setupMocks = (input: {
  tempDir: string;
  config: MockConfig;
}): { fakeBinDir: string; stateDir: string } => {
  const fakeBinDir = path.join(input.tempDir, '.fakebin');
  const stateDir = path.join(input.tempDir, '.mock-state');
  fs.mkdirSync(fakeBinDir, { recursive: true });
  fs.mkdirSync(stateDir, { recursive: true });

  // write sequences to state files
  if (input.config.prListSequence) {
    fs.writeFileSync(
      path.join(stateDir, 'pr_list_sequence.json'),
      JSON.stringify(input.config.prListSequence),
    );
  }
  if (input.config.ancestorSequence) {
    fs.writeFileSync(
      path.join(stateDir, 'ancestor_sequence.json'),
      JSON.stringify(input.config.ancestorSequence),
    );
  }
  if (input.config.tagSequence) {
    fs.writeFileSync(
      path.join(stateDir, 'tag_sequence.json'),
      JSON.stringify(input.config.tagSequence),
    );
  }

  // workflow status JSON
  let workflowJson = '[]';
  if (input.config.workflowStatus === 'failed') {
    workflowJson = JSON.stringify([
      {
        status: 'completed',
        conclusion: 'failure',
        url: 'https://github.com/test/repo/actions/runs/12345',
      },
    ]);
  } else if (input.config.workflowStatus === 'in_progress') {
    workflowJson = JSON.stringify([
      {
        status: 'in_progress',
        conclusion: null,
        url: 'https://github.com/test/repo/actions/runs/12345',
      },
    ]);
  } else if (input.config.workflowStatus === 'passed') {
    workflowJson = JSON.stringify([
      {
        status: 'completed',
        conclusion: 'success',
        url: 'https://github.com/test/repo/actions/runs/12345',
      },
    ]);
  }

  // gh mock
  const ghMock = `#!/bin/bash
set -euo pipefail

STATE_DIR="${stateDir}"
ALL_ARGS="$*"

# counter for sequences
get_counter() {
  local key="$1"
  local file="$STATE_DIR/counter-$key"
  if [[ -f "$file" ]]; then cat "$file"; else echo "0"; fi
}
inc_counter() {
  local key="$1"
  local file="$STATE_DIR/counter-$key"
  local count=$(get_counter "$key")
  echo "$((count + 1))" > "$file"
  echo "$((count + 1))"
}

# pr list --state open (for release PR lookup)
if [[ "$1" == "pr" && "$2" == "list" ]] && echo "$ALL_ARGS" | grep -q "state open"; then
  SEQ_FILE="$STATE_DIR/pr_list_sequence.json"
  if [[ -f "$SEQ_FILE" ]]; then
    COUNT=$(get_counter "pr_list")
    inc_counter "pr_list" > /dev/null
    SEQ_LEN=$(jq 'length' "$SEQ_FILE")
    if [[ $COUNT -ge $SEQ_LEN ]]; then COUNT=$((SEQ_LEN - 1)); fi
    jq -r ".[$COUNT]" "$SEQ_FILE"
  else
    echo '${input.config.prListResponse ?? ''}'
  fi
  exit 0
fi

# run list --workflow release-please.yml (for timeout diagnostics)
if [[ "$1" == "run" && "$2" == "list" ]] && echo "$ALL_ARGS" | grep -q "release-please"; then
  echo '${workflowJson}'
  exit 0
fi

echo "mock gh: unknown command: $*" >&2
exit 1
`;
  fs.writeFileSync(path.join(fakeBinDir, 'gh'), ghMock, { mode: 0o755 });

  // git mock
  const gitMock = `#!/bin/bash
set -euo pipefail

STATE_DIR="${stateDir}"
ALL_ARGS="$*"

# counter for sequences
get_counter() {
  local key="$1"
  local file="$STATE_DIR/counter-$key"
  if [[ -f "$file" ]]; then cat "$file"; else echo "0"; fi
}
inc_counter() {
  local key="$1"
  local file="$STATE_DIR/counter-$key"
  local count=$(get_counter "$key")
  echo "$((count + 1))" > "$file"
  echo "$((count + 1))"
}

# merge-base --is-ancestor (freshness check)
if [[ "\${1:-}" == "merge-base" && "\${2:-}" == "--is-ancestor" ]]; then
  SEQ_FILE="$STATE_DIR/ancestor_sequence.json"
  if [[ -f "$SEQ_FILE" ]]; then
    COUNT=$(get_counter "ancestor")
    inc_counter "ancestor" > /dev/null
    SEQ_LEN=$(jq 'length' "$SEQ_FILE")
    if [[ $COUNT -ge $SEQ_LEN ]]; then COUNT=$((SEQ_LEN - 1)); fi
    EXIT_CODE=$(jq -r ".[$COUNT]" "$SEQ_FILE")
    exit $EXIT_CODE
  fi
  exit ${input.config.ancestorExitCode ?? 0}
fi

# fetch --tags
if [[ "\${1:-}" == "fetch" && "\${2:-}" == "--tags" ]]; then
  exit 0
fi

# rev-parse refs/tags/$tag (tag lookup)
if [[ "\${1:-}" == "rev-parse" ]] && echo "$ALL_ARGS" | grep -q "refs/tags"; then
  SEQ_FILE="$STATE_DIR/tag_sequence.json"
  if [[ -f "$SEQ_FILE" ]]; then
    COUNT=$(get_counter "tag")
    inc_counter "tag" > /dev/null
    SEQ_LEN=$(jq 'length' "$SEQ_FILE")
    if [[ $COUNT -ge $SEQ_LEN ]]; then COUNT=$((SEQ_LEN - 1)); fi
    RESULT=$(jq -r ".[$COUNT]" "$SEQ_FILE")
    if [[ "$RESULT" == "null" || "$RESULT" == "" ]]; then
      exit 1
    fi
    echo "$RESULT"
    exit 0
  fi
  if [[ -n "${input.config.tagCommit ?? ''}" ]]; then
    echo "${input.config.tagCommit ?? ''}"
    exit 0
  fi
  exit 1
fi

# fallback to real git for other commands
exec /usr/bin/git "$@"
`;
  fs.writeFileSync(path.join(fakeBinDir, 'git'), gitMock, { mode: 0o755 });

  return { fakeBinDir, stateDir };
};

const runAndThenAwait = (
  args: string[],
  env: { tempDir: string; fakeBinDir: string },
): { stdout: string; stderr: string; status: number } => {
  // inline harness: source dependencies and call and_then_await
  // quote each arg to handle spaces in values like 'artifact_display=release pr'
  const quotedArgs = args.map((arg) => `"${arg}"`).join(' ');
  const inlineScript = `
set -euo pipefail
source "${SKILL_DIR}/output.sh"
source "${SKILL_DIR}/git.release.operations.sh"
source "${SKILL_DIR}/git.release._.and_then_await.sh"
and_then_await ${quotedArgs}
exit $?
`;

  const result = spawnSync('bash', ['-c', inlineScript], {
    cwd: env.tempDir,
    env: {
      ...process.env,
      PATH: `${env.fakeBinDir}:${process.env.PATH}`,
      TERM: 'dumb',
      HOME: env.tempDir,
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
// test cases
// ============================================================================

describe('git.release.p4.and_then_await', () => {
  // ==========================================================================
  // matrix 1: found scenarios (cases 1-4)
  // ==========================================================================

  given('[case1] release-pr found immediately', () => {
    when('[t0] fresh release PR exists on first check', () => {
      then('output shows transition + blank line, exit 0', () => {
        const tempDir = genTempDir({ slug: 'p4-case1', git: true });
        const { fakeBinDir } = setupMocks({
          tempDir,
          config: {
            prListResponse: JSON.stringify({
              number: 100,
              title: 'chore(release): v1.3.0',
              headRefOid: 'fresh_commit_sha',
            }),
            ancestorExitCode: 0,
          },
        });

        const result = runAndThenAwait(
          [
            'artifact_type=release-pr',
            'artifact_display=release pr',
            'prior_merge_commit=abc123',
          ],
          { tempDir, fakeBinDir },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('🫧 and then...');
        expect(result.stdout).not.toContain('💤');
        expect(asTimeStable(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case2] release-pr found after wait', () => {
    when('[t0] release PR appears after poll cycles', () => {
      then('output shows poll lines + found, exit 0', () => {
        const tempDir = genTempDir({ slug: 'p4-case2', git: true });
        const { fakeBinDir } = setupMocks({
          tempDir,
          config: {
            // first 2 polls: empty, then PR appears
            prListSequence: [
              '',
              '',
              JSON.stringify({
                number: 100,
                title: 'chore(release): v1.3.0',
                headRefOid: 'fresh_commit_sha',
              }),
            ],
            ancestorExitCode: 0,
          },
        });

        const result = runAndThenAwait(
          [
            'artifact_type=release-pr',
            'artifact_display=release pr',
            'prior_merge_commit=abc123',
          ],
          { tempDir, fakeBinDir },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('🫧 and then...');
        expect(result.stdout).toContain('💤');
        expect(result.stdout).toContain('✨ found!');
        expect(asTimeStable(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case3] tag found immediately', () => {
    when('[t0] fresh tag exists on first check', () => {
      then('output shows transition + blank line, exit 0', () => {
        const tempDir = genTempDir({ slug: 'p4-case3', git: true });
        const { fakeBinDir } = setupMocks({
          tempDir,
          config: {
            tagCommit: 'fresh_tag_commit_sha',
            ancestorExitCode: 0,
          },
        });

        const result = runAndThenAwait(
          [
            'artifact_type=tag',
            'artifact_display=tag v1.3.0',
            'prior_merge_commit=abc123',
            'expected_tag=v1.3.0',
          ],
          { tempDir, fakeBinDir },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('🫧 and then...');
        expect(result.stdout).not.toContain('💤');
        expect(asTimeStable(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case4] tag found after wait', () => {
    when('[t0] tag appears after poll cycles', () => {
      then('output shows poll lines + found, exit 0', () => {
        const tempDir = genTempDir({ slug: 'p4-case4', git: true });
        const { fakeBinDir } = setupMocks({
          tempDir,
          config: {
            // first 2 polls: no tag, then tag appears
            tagSequence: ['null', 'null', 'fresh_tag_commit_sha'],
            ancestorExitCode: 0,
          },
        });

        const result = runAndThenAwait(
          [
            'artifact_type=tag',
            'artifact_display=tag v1.3.0',
            'prior_merge_commit=abc123',
            'expected_tag=v1.3.0',
          ],
          { tempDir, fakeBinDir },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('🫧 and then...');
        expect(result.stdout).toContain('💤');
        expect(result.stdout).toContain('✨ found!');
        expect(asTimeStable(result.stdout)).toMatchSnapshot();
      });
    });
  });

  // ==========================================================================
  // matrix 2: stale rejection scenarios (cases 5-10)
  // ==========================================================================

  given('[case5] stale release-pr rejected', () => {
    when('[t0] old PR exists but is stale', () => {
      then('stale PR is rejected, poll continues', () => {
        const tempDir = genTempDir({ slug: 'p4-case5', git: true });
        const { fakeBinDir } = setupMocks({
          tempDir,
          config: {
            // PR exists
            prListResponse: JSON.stringify({
              number: 100,
              title: 'chore(release): v1.2.9',
              headRefOid: 'stale_commit_sha',
            }),
            // stale: prior_merge_commit is NOT ancestor of PR head
            ancestorExitCode: 1,
            workflowStatus: 'passed',
          },
        });

        const result = runAndThenAwait(
          [
            'artifact_type=release-pr',
            'artifact_display=release pr',
            'prior_merge_commit=abc123',
          ],
          { tempDir, fakeBinDir },
        );

        // should timeout since PR is always stale
        expect(result.status).toBe(2);
        expect(result.stdout).toContain('💤');
        expect(result.stdout).toContain('⚓ release pr did not appear');
        expect(asTimeStable(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case6] stale release-pr then fresh appears', () => {
    when('[t0] old PR is rejected, then fresh PR appears', () => {
      then('fresh PR is accepted, exit 0', () => {
        const tempDir = genTempDir({ slug: 'p4-case6', git: true });
        const { fakeBinDir } = setupMocks({
          tempDir,
          config: {
            // PR exists on all checks
            prListResponse: JSON.stringify({
              number: 100,
              title: 'chore(release): v1.3.0',
              headRefOid: 'commit_sha',
            }),
            // first 2: stale, then fresh
            ancestorSequence: [1, 1, 0],
          },
        });

        const result = runAndThenAwait(
          [
            'artifact_type=release-pr',
            'artifact_display=release pr',
            'prior_merge_commit=abc123',
          ],
          { tempDir, fakeBinDir },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('💤');
        expect(result.stdout).toContain('✨ found!');
        expect(asTimeStable(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case7] stale release-pr then timeout', () => {
    when('[t0] PR stays stale until timeout', () => {
      then('timeout with workflow status, exit 2', () => {
        const tempDir = genTempDir({ slug: 'p4-case7', git: true });
        const { fakeBinDir } = setupMocks({
          tempDir,
          config: {
            prListResponse: JSON.stringify({
              number: 100,
              title: 'chore(release): v1.2.9',
              headRefOid: 'stale_commit_sha',
            }),
            ancestorExitCode: 1,
            workflowStatus: 'failed',
          },
        });

        const result = runAndThenAwait(
          [
            'artifact_type=release-pr',
            'artifact_display=release pr',
            'prior_merge_commit=abc123',
          ],
          { tempDir, fakeBinDir },
        );

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('⚓ release pr did not appear');
        expect(result.stdout).toContain('🔴 release-please');
        expect(result.stdout).toContain('failure');
        expect(asTimeStable(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case8] stale tag rejected', () => {
    when('[t0] old tag exists but is stale', () => {
      then('stale tag is rejected, poll continues', () => {
        const tempDir = genTempDir({ slug: 'p4-case8', git: true });
        const { fakeBinDir } = setupMocks({
          tempDir,
          config: {
            tagCommit: 'stale_tag_commit',
            ancestorExitCode: 1,
            workflowStatus: 'passed',
          },
        });

        const result = runAndThenAwait(
          [
            'artifact_type=tag',
            'artifact_display=tag v1.3.0',
            'prior_merge_commit=abc123',
            'expected_tag=v1.3.0',
          ],
          { tempDir, fakeBinDir },
        );

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('💤');
        expect(result.stdout).toContain('⚓ tag v1.3.0 did not appear');
        expect(asTimeStable(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case9] stale tag then fresh appears', () => {
    when('[t0] old tag is rejected, then fresh tag appears', () => {
      then('fresh tag is accepted, exit 0', () => {
        const tempDir = genTempDir({ slug: 'p4-case9', git: true });
        const { fakeBinDir } = setupMocks({
          tempDir,
          config: {
            tagCommit: 'tag_commit_sha',
            // first 2: stale, then fresh
            ancestorSequence: [1, 1, 0],
          },
        });

        const result = runAndThenAwait(
          [
            'artifact_type=tag',
            'artifact_display=tag v1.3.0',
            'prior_merge_commit=abc123',
            'expected_tag=v1.3.0',
          ],
          { tempDir, fakeBinDir },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('💤');
        expect(result.stdout).toContain('✨ found!');
        expect(asTimeStable(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case10] stale tag then timeout', () => {
    when('[t0] tag stays stale until timeout', () => {
      then('timeout with workflow status, exit 2', () => {
        const tempDir = genTempDir({ slug: 'p4-case10', git: true });
        const { fakeBinDir } = setupMocks({
          tempDir,
          config: {
            tagCommit: 'stale_tag_commit',
            ancestorExitCode: 1,
            workflowStatus: 'failed',
          },
        });

        const result = runAndThenAwait(
          [
            'artifact_type=tag',
            'artifact_display=tag v1.3.0',
            'prior_merge_commit=abc123',
            'expected_tag=v1.3.0',
          ],
          { tempDir, fakeBinDir },
        );

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('⚓ tag v1.3.0 did not appear');
        expect(result.stdout).toContain('🔴 release-please');
        expect(result.stdout).toContain('failure');
        expect(asTimeStable(result.stdout)).toMatchSnapshot();
      });
    });
  });

  // ==========================================================================
  // matrix 3: timeout with workflow status variants (cases 11-18)
  // ==========================================================================

  given('[case11] release-pr timeout, workflow failed', () => {
    when('[t0] timeout occurs and workflow failed', () => {
      then('shows ⚓ + 🔴 release-please + failed', () => {
        const tempDir = genTempDir({ slug: 'p4-case11', git: true });
        const { fakeBinDir } = setupMocks({
          tempDir,
          config: {
            prListResponse: '',
            workflowStatus: 'failed',
          },
        });

        const result = runAndThenAwait(
          [
            'artifact_type=release-pr',
            'artifact_display=release pr',
            'prior_merge_commit=abc123',
          ],
          { tempDir, fakeBinDir },
        );

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('⚓ release pr did not appear');
        expect(result.stdout).toContain('🔴 release-please');
        expect(result.stdout).toContain('failure');
        expect(asTimeStable(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case12] release-pr timeout, workflow in_progress', () => {
    when('[t0] timeout occurs and workflow in progress', () => {
      then('shows ⚓ + 🔴 release-please + in_progress', () => {
        const tempDir = genTempDir({ slug: 'p4-case12', git: true });
        const { fakeBinDir } = setupMocks({
          tempDir,
          config: {
            prListResponse: '',
            workflowStatus: 'in_progress',
          },
        });

        const result = runAndThenAwait(
          [
            'artifact_type=release-pr',
            'artifact_display=release pr',
            'prior_merge_commit=abc123',
          ],
          { tempDir, fakeBinDir },
        );

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('⚓ release pr did not appear');
        expect(result.stdout).toContain('🔴 release-please');
        expect(result.stdout).toContain('in_progress');
        expect(asTimeStable(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case13] release-pr timeout, workflow passed', () => {
    when('[t0] timeout occurs and workflow passed', () => {
      then('shows ⚓ + 🔴 release-please + success', () => {
        const tempDir = genTempDir({ slug: 'p4-case13', git: true });
        const { fakeBinDir } = setupMocks({
          tempDir,
          config: {
            prListResponse: '',
            workflowStatus: 'passed',
          },
        });

        const result = runAndThenAwait(
          [
            'artifact_type=release-pr',
            'artifact_display=release pr',
            'prior_merge_commit=abc123',
          ],
          { tempDir, fakeBinDir },
        );

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('⚓ release pr did not appear');
        expect(result.stdout).toContain('🔴 release-please');
        expect(result.stdout).toContain('success');
        expect(asTimeStable(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case14] release-pr timeout, workflow not found', () => {
    when('[t0] timeout occurs and workflow not found', () => {
      then('shows ⚓ + 🔴 release-please + not found', () => {
        const tempDir = genTempDir({ slug: 'p4-case14', git: true });
        const { fakeBinDir } = setupMocks({
          tempDir,
          config: {
            prListResponse: '',
            workflowStatus: 'not_found',
          },
        });

        const result = runAndThenAwait(
          [
            'artifact_type=release-pr',
            'artifact_display=release pr',
            'prior_merge_commit=abc123',
          ],
          { tempDir, fakeBinDir },
        );

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('⚓ release pr did not appear');
        expect(result.stdout).toContain('🔴 release-please');
        expect(result.stdout).toContain('not found');
        expect(asTimeStable(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case15] tag timeout, workflow failed', () => {
    when('[t0] timeout occurs and workflow failed', () => {
      then('shows ⚓ + 🔴 release-please + failed', () => {
        const tempDir = genTempDir({ slug: 'p4-case15', git: true });
        const { fakeBinDir } = setupMocks({
          tempDir,
          config: {
            tagCommit: '',
            workflowStatus: 'failed',
          },
        });

        const result = runAndThenAwait(
          [
            'artifact_type=tag',
            'artifact_display=tag v1.3.0',
            'prior_merge_commit=abc123',
            'expected_tag=v1.3.0',
          ],
          { tempDir, fakeBinDir },
        );

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('⚓ tag v1.3.0 did not appear');
        expect(result.stdout).toContain('🔴 release-please');
        expect(result.stdout).toContain('failure');
        expect(asTimeStable(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case16] tag timeout, workflow in_progress', () => {
    when('[t0] timeout occurs and workflow in progress', () => {
      then('shows ⚓ + 🔴 release-please + in_progress', () => {
        const tempDir = genTempDir({ slug: 'p4-case16', git: true });
        const { fakeBinDir } = setupMocks({
          tempDir,
          config: {
            tagCommit: '',
            workflowStatus: 'in_progress',
          },
        });

        const result = runAndThenAwait(
          [
            'artifact_type=tag',
            'artifact_display=tag v1.3.0',
            'prior_merge_commit=abc123',
            'expected_tag=v1.3.0',
          ],
          { tempDir, fakeBinDir },
        );

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('⚓ tag v1.3.0 did not appear');
        expect(result.stdout).toContain('🔴 release-please');
        expect(result.stdout).toContain('in_progress');
        expect(asTimeStable(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case17] tag timeout, workflow passed', () => {
    when('[t0] timeout occurs and workflow passed', () => {
      then('shows ⚓ + 🔴 release-please + success', () => {
        const tempDir = genTempDir({ slug: 'p4-case17', git: true });
        const { fakeBinDir } = setupMocks({
          tempDir,
          config: {
            tagCommit: '',
            workflowStatus: 'passed',
          },
        });

        const result = runAndThenAwait(
          [
            'artifact_type=tag',
            'artifact_display=tag v1.3.0',
            'prior_merge_commit=abc123',
            'expected_tag=v1.3.0',
          ],
          { tempDir, fakeBinDir },
        );

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('⚓ tag v1.3.0 did not appear');
        expect(result.stdout).toContain('🔴 release-please');
        expect(result.stdout).toContain('success');
        expect(asTimeStable(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case18] tag timeout, workflow not found', () => {
    when('[t0] timeout occurs and workflow not found', () => {
      then('shows ⚓ + 🔴 release-please + not found', () => {
        const tempDir = genTempDir({ slug: 'p4-case18', git: true });
        const { fakeBinDir } = setupMocks({
          tempDir,
          config: {
            tagCommit: '',
            workflowStatus: 'not_found',
          },
        });

        const result = runAndThenAwait(
          [
            'artifact_type=tag',
            'artifact_display=tag v1.3.0',
            'prior_merge_commit=abc123',
            'expected_tag=v1.3.0',
          ],
          { tempDir, fakeBinDir },
        );

        expect(result.status).toBe(2);
        expect(result.stdout).toContain('⚓ tag v1.3.0 did not appear');
        expect(result.stdout).toContain('🔴 release-please');
        expect(result.stdout).toContain('not found');
        expect(asTimeStable(result.stdout)).toMatchSnapshot();
      });
    });
  });
});
