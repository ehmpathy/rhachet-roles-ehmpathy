import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir } from 'test-fns';

/**
 * .what = test environment setup utilities for git.release tests
 * .why = provides reusable test infrastructure across operation and journey tests
 */

// ============================================================================
// types
// ============================================================================

export interface TestEnv {
  tempDir: string;
  skillPath: string;
  mockBinDir: string;
  stateDir: string;
  cleanup: () => void;
}

export interface RunSkillOptions {
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export interface RunSkillResult {
  stdout: string;
  stderr: string;
  status: number | null;
}

// ============================================================================
// setup functions
// ============================================================================

/**
 * .what = create a temp git repo for test isolation
 * .why = isolated environment for each test
 */
export const genTempGitRepo = (input: {
  slug?: string;
  branch?: string;
  remoteUrl?: string;
}): { tempDir: string; cleanup: () => void } => {
  const {
    slug = 'git-release-test',
    branch = 'turtle/feature-x',
    remoteUrl = 'https://github.com/test/repo',
  } = input;

  // genTempDir returns path string and auto-prunes after 7 days
  const tempDir = genTempDir({ slug, git: true });

  // configure git repo
  spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tempDir });
  spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: tempDir });
  spawnSync('git', ['remote', 'add', 'origin', remoteUrl], { cwd: tempDir });

  // create initial commit (genTempDir with git:true creates 'began' commit, but we need our own)
  fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test');
  spawnSync('git', ['add', '.'], { cwd: tempDir });
  spawnSync('git', ['commit', '-m', 'initial commit'], { cwd: tempDir });

  // create and switch to branch
  if (branch !== 'main') {
    spawnSync('git', ['checkout', '-b', branch], { cwd: tempDir });
  }

  // cleanup is a no-op since genTempDir handles prune automatically
  const cleanup = () => {
    // genTempDir prunes stale dirs automatically after 7 days
  };

  return { tempDir, cleanup };
};

/**
 * .what = create mock bin directory for PATH injection
 * .why = intercepts gh/git commands with controlled responses
 */
export const genMockBinDir = (input: {
  tempDir: string;
}): string => {
  const mockBinDir = path.join(input.tempDir, '.fakebin');
  fs.mkdirSync(mockBinDir, { recursive: true });
  return mockBinDir;
};

/**
 * .what = create state directory for mock state tracking
 * .why = enables stateful mocks (call counters, transitions)
 */
export const genStateDir = (input: {
  tempDir: string;
}): string => {
  const stateDir = path.join(input.tempDir, '.mockstate');
  fs.mkdirSync(stateDir, { recursive: true });
  return stateDir;
};

/**
 * .what = setup complete test environment
 * .why = single function to create all test infrastructure
 */
export const setupTestEnv = (input?: {
  branch?: string;
  remoteUrl?: string;
}): TestEnv => {
  const { branch, remoteUrl } = input ?? {};

  const { tempDir, cleanup } = genTempGitRepo({ branch, remoteUrl });
  const mockBinDir = genMockBinDir({ tempDir });
  const stateDir = genStateDir({ tempDir });

  // derive skill path from __dirname
  const skillPath = path.join(__dirname, '../../git.release.sh');

  return {
    tempDir,
    skillPath,
    mockBinDir,
    stateDir,
    cleanup,
  };
};

// ============================================================================
// run functions
// ============================================================================

/**
 * .what = run git.release skill with mocked environment
 * .why = consistent execution across all tests
 */
export const runSkill = (
  env: TestEnv,
  options?: RunSkillOptions,
): RunSkillResult => {
  const { args = [], env: extraEnv = {}, cwd } = options ?? {};

  const result = spawnSync('bash', [env.skillPath, ...args], {
    cwd: cwd ?? env.tempDir,
    encoding: 'utf-8',
    env: {
      ...process.env,
      PATH: `${env.mockBinDir}:${process.env.PATH}`,
      GIT_RELEASE_TEST_MODE: 'true',
      HOME: env.tempDir,
      ...extraEnv,
    },
  });

  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
};

/**
 * .what = run a decomposed operation function
 * .why = test individual operations in isolation
 */
export const runOperation = (
  env: TestEnv,
  input: {
    operation: string;
    functionName: string;
    args: string[];
  },
): RunSkillResult => {
  const skillDir = path.join(__dirname, '../..');
  const operationPath = path.join(skillDir, `git.release._.${input.operation}.sh`);
  const operationsPath = path.join(skillDir, 'git.release.operations.sh');
  const outputPath = path.join(skillDir, 'output.sh');

  // all decomposed operation files (emit_transport_status needs get_one_transport_status, etc.)
  const decomposedOps = [
    'git.release._.get_one_goal_from_input.sh',
    'git.release._.get_all_flags_from_input.sh',
    'git.release._.get_one_transport_status.sh',
    'git.release._.emit_transport_status.sh',
    'git.release._.emit_transport_watch.sh',
    'git.release._.emit_one_transport_status_exitcode.sh',
  ].map((f) => path.join(skillDir, f));

  // create a wrapper that sources all operations and calls the function
  const wrapperContent = `
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="${skillDir}"
source "${outputPath}"
source "${operationsPath}"
${decomposedOps.map((op) => `source "${op}"`).join('\n')}
${input.functionName} ${input.args.map((a) => `"${a}"`).join(' ')}
`;

  const wrapperPath = path.join(env.tempDir, '_test_wrapper.sh');
  fs.writeFileSync(wrapperPath, wrapperContent);
  fs.chmodSync(wrapperPath, '755');

  const result = spawnSync('bash', [wrapperPath], {
    cwd: env.tempDir,
    encoding: 'utf-8',
    env: {
      ...process.env,
      PATH: `${env.mockBinDir}:${process.env.PATH}`,
      GIT_RELEASE_TEST_MODE: 'true',
      HOME: env.tempDir,
    },
  });

  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
};
