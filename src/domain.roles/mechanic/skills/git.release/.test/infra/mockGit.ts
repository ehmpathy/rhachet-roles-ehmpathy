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
  isDirty?: boolean;
  defaultBranch?: string;
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
  options: MockGitOptions;
}): void => {
  const { mockBinDir, options } = input;
  const { branch = 'turtle/feature-x', isDirty = false, defaultBranch = 'main' } = options;

  const gitMock = `#!/bin/bash

# handle symbolic-ref (for branch detection)
if [[ "\$1" == "symbolic-ref" ]]; then
  echo "refs/heads/${branch}"
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

# handle status --porcelain (dirty check)
if [[ "\$1" == "status" && "\$2" == "--porcelain" ]]; then
  ${isDirty ? 'echo " M dirty.txt"' : 'echo ""'}
  exit 0
fi

# pass through to real git
exec /usr/bin/git "\$@"
`;

  const gitPath = path.join(mockBinDir, 'git');
  fs.writeFileSync(gitPath, gitMock);
  fs.chmodSync(gitPath, '755');
};
