import * as fs from 'fs';
import * as path from 'path';

/**
 * .what = mock git CLI with passthrough for git.release tests
 * .why = intercepts specific git commands while others pass to real git
 */

// ============================================================================
// types
// ============================================================================

export interface MockGitOptions {
  branch?: string;
  defaultBranch?: string;
  /**
   * await freshness config
   * 'fresh' = merge-base --is-ancestor returns 0
   * 'stale' = merge-base --is-ancestor returns 1
   * 'stale-then-fresh' = first N calls return 1, then 0
   */
  awaitFreshness?: 'fresh' | 'stale' | 'stale-then-fresh';
  /**
   * number of stale checks before fresh (for stale-then-fresh)
   */
  staleThenFreshCount?: number;
  /**
   * tag commit SHA to return for rev-parse refs/tags/...
   * null = tag not found
   */
  tagCommit?: string | null;
  /**
   * sequence of tag commits (for poll evolution)
   * null entries = tag not found
   */
  tagSequence?: Array<string | null>;
}

// ============================================================================
// mock executable generator
// ============================================================================

/**
 * .what = generate git mock executable with passthrough
 * .why = mocks branch/status while other commands pass to real git
 */
export const genGitMockExecutable = (input: {
  mockBinDir: string;
  stateDir?: string;
  options: MockGitOptions;
}): void => {
  const { mockBinDir, stateDir, options } = input;
  const {
    branch = 'turtle/feature-x',
    defaultBranch = 'main',
    awaitFreshness = 'fresh',
    staleThenFreshCount = 2,
    tagCommit = null,
    tagSequence,
  } = options;

  // write tag sequence to state dir if provided
  const stateDirPath = stateDir ?? mockBinDir;
  if (tagSequence) {
    fs.mkdirSync(stateDirPath, { recursive: true });
    fs.writeFileSync(
      path.join(stateDirPath, 'tag_sequence.json'),
      JSON.stringify(tagSequence),
    );
  }

  const gitMock = `#!/bin/bash

STATE_DIR="${stateDirPath}"

# counter helper
get_counter() {
  local key="\$1"
  local file="\$STATE_DIR/counter-\$key"
  if [[ -f "\$file" ]]; then cat "\$file"; else echo "0"; fi
}
inc_counter() {
  local key="\$1"
  local file="\$STATE_DIR/counter-\$key"
  local count=\$(get_counter "\$key")
  echo "\$((count + 1))" > "\$file"
  echo "\$((count + 1))"
}

# handle symbolic-ref (for branch detection)
if [[ "\$1" == "symbolic-ref" ]]; then
  if [[ "\$2" == "refs/remotes/origin/HEAD" ]]; then
    # get_default_branch queries this
    echo "refs/remotes/origin/${defaultBranch}"
  else
    # get_current_branch (via rev-parse) or other queries
    echo "refs/heads/${branch}"
  fi
  exit 0
fi

# handle rev-parse --abbrev-ref HEAD
if [[ "\$1" == "rev-parse" && "\$2" == "--abbrev-ref" && "\$3" == "HEAD" ]]; then
  echo "${branch}"
  exit 0
fi

# handle remote show origin (default branch detection)
if [[ "\$1" == "remote" && "\$2" == "show" ]]; then
  echo "HEAD branch: ${defaultBranch}"
  exit 0
fi

# note: git status --porcelain passes through to real git
# tests create real dirty state and expect real detection

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
  if [[ $COUNT -ge ${staleThenFreshCount} ]]; then
    exit 0  # now fresh
  else
    exit 1  # still stale
  fi`;
      default:
        return 'exit 0';
    }
  })()}
fi

# handle fetch --tags (for tag lookup)
if [[ "\$1" == "fetch" && "\$2" == "--tags" ]]; then
  exit 0
fi

# handle rev-parse refs/tags/... (tag commit lookup)
if [[ "\$1" == "rev-parse" ]] && echo "\$*" | grep -q "refs/tags"; then
  SEQ_FILE="\$STATE_DIR/tag_sequence.json"
  if [[ -f "\$SEQ_FILE" ]]; then
    COUNT=\$(get_counter "tag-lookup")
    inc_counter "tag-lookup" > /dev/null
    SEQ_LEN=\$(jq 'length' "\$SEQ_FILE")
    if [[ \$COUNT -ge \$SEQ_LEN ]]; then COUNT=\$((SEQ_LEN - 1)); fi
    RESULT=\$(jq -r ".[\$COUNT] // empty" "\$SEQ_FILE")
    if [[ -z "\$RESULT" || "\$RESULT" == "null" ]]; then
      echo "fatal: ambiguous argument" >&2
      exit 128
    fi
    echo "\$RESULT"
    exit 0
  fi
  ${tagCommit ? `echo "${tagCommit}"; exit 0` : 'echo "fatal: ambiguous argument" >&2; exit 128'}
fi

# pass through to real git
exec /usr/bin/git "\$@"
`;

  const gitPath = path.join(mockBinDir, 'git');
  fs.writeFileSync(gitPath, gitMock);
  fs.chmodSync(gitPath, '755');
};
