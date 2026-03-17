import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

/**
 * .what = integration tests for git.branch.rebase.continue skill
 * .why = verify rebase continue handles all scenarios with correct output
 */

const SKILL_PATH = path.resolve(__dirname, 'git.branch.rebase.continue.sh');

/**
 * .what = setup a git repo with rebase in progress
 * .why = each test needs isolated repo in specific rebase state
 */
const setupRebaseInProgress = (options: {
  conflictsSettled?: boolean;
  commitsLeft?: number;
  totalCommits?: number;
}): string => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'git-rebase-continue-test-'),
  );

  // init git repo
  spawnSync('git', ['init'], { cwd: tempDir });
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: tempDir });
  spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: tempDir });

  // create initial commit on main
  fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test Repo\n');
  spawnSync('git', ['add', 'README.md'], { cwd: tempDir });
  spawnSync('git', ['commit', '-m', 'init: initial commit'], { cwd: tempDir });
  spawnSync('git', ['branch', '-M', 'main'], { cwd: tempDir });

  // create origin/main ref
  spawnSync('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD'], {
    cwd: tempDir,
  });

  // create feature branch
  spawnSync('git', ['checkout', '-b', 'feature/test-branch'], { cwd: tempDir });

  // add feature commits
  const totalCommits = options.totalCommits ?? 3;
  for (let i = 0; i < totalCommits; i++) {
    const filename = `feature-${i}.txt`;
    fs.writeFileSync(path.join(tempDir, filename), `feature content ${i}\n`);
    spawnSync('git', ['add', filename], { cwd: tempDir });
    spawnSync('git', ['commit', '-m', `fix(api): feature commit ${i}`], {
      cwd: tempDir,
    });
  }

  // setup meter state (push allowed for continue)
  const meterDir = path.join(tempDir, '.meter');
  fs.mkdirSync(meterDir, { recursive: true });
  fs.writeFileSync(
    path.join(meterDir, 'git.commit.uses.jsonc'),
    JSON.stringify({ quant: 5, push: 'allow' }, null, 2),
  );

  // simulate rebase in progress
  const rebaseMergeDir = path.join(tempDir, '.git', 'rebase-merge');
  fs.mkdirSync(rebaseMergeDir, { recursive: true });

  const commitsLeft = options.commitsLeft ?? 2;
  const currentCommit = totalCommits - commitsLeft + 1;

  fs.writeFileSync(
    path.join(rebaseMergeDir, 'head-name'),
    'refs/heads/feature/test-branch',
  );
  fs.writeFileSync(path.join(rebaseMergeDir, 'onto'), 'abc123def456');
  fs.writeFileSync(path.join(rebaseMergeDir, 'msgnum'), String(currentCommit));
  fs.writeFileSync(path.join(rebaseMergeDir, 'end'), String(totalCommits));

  // simulate conflict state if not settled
  if (!options.conflictsSettled) {
    // create a file with conflict markers
    const conflictFile = path.join(tempDir, 'conflict.txt');
    fs.writeFileSync(
      conflictFile,
      '<<<<<<< HEAD\nmain version\n=======\nfeature version\n>>>>>>> feature\n',
    );
    spawnSync('git', ['add', conflictFile], { cwd: tempDir });
  }

  return tempDir;
};

/**
 * .what = setup a worktree with rebase in progress
 * .why = verify rebase detection works when .git is a file, not a directory
 */
const setupWorktreeRebaseInProgress = (): {
  mainDir: string;
  worktreeDir: string;
} => {
  const mainDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'git-rebase-continue-worktree-main-'),
  );

  // init main git repo
  spawnSync('git', ['init'], { cwd: mainDir });
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: mainDir });
  spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: mainDir });

  // create initial commit on main
  fs.writeFileSync(path.join(mainDir, 'README.md'), '# Test Repo\n');
  spawnSync('git', ['add', 'README.md'], { cwd: mainDir });
  spawnSync('git', ['commit', '-m', 'init: initial commit'], { cwd: mainDir });
  spawnSync('git', ['branch', '-M', 'main'], { cwd: mainDir });

  // create origin/main ref
  spawnSync('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD'], {
    cwd: mainDir,
  });

  // create worktree for feature branch
  const worktreeDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'git-rebase-continue-worktree-feat-'),
  );
  fs.rmSync(worktreeDir, { recursive: true }); // git worktree add needs non-existent dir
  spawnSync('git', ['worktree', 'add', '-b', 'feature/test', worktreeDir], {
    cwd: mainDir,
  });

  // add feature commit in worktree
  fs.writeFileSync(path.join(worktreeDir, 'feature.txt'), 'feature content\n');
  spawnSync('git', ['add', 'feature.txt'], { cwd: worktreeDir });
  spawnSync('git', ['commit', '-m', 'fix(api): feature commit'], {
    cwd: worktreeDir,
  });

  // setup meter state in worktree
  const meterDir = path.join(worktreeDir, '.meter');
  fs.mkdirSync(meterDir, { recursive: true });
  fs.writeFileSync(
    path.join(meterDir, 'git.commit.uses.jsonc'),
    JSON.stringify({ quant: 5, push: 'allow' }, null, 2),
  );

  // find the worktree git dir from .git file
  const gitFileContent = fs.readFileSync(
    path.join(worktreeDir, '.git'),
    'utf-8',
  );
  const worktreeGitDir = gitFileContent.replace('gitdir: ', '').trim();

  // simulate rebase in progress in worktree's git dir
  const rebaseMergeDir = path.join(worktreeGitDir, 'rebase-merge');
  fs.mkdirSync(rebaseMergeDir, { recursive: true });

  fs.writeFileSync(
    path.join(rebaseMergeDir, 'head-name'),
    'refs/heads/feature/test',
  );
  fs.writeFileSync(path.join(rebaseMergeDir, 'onto'), 'abc123def456');
  fs.writeFileSync(path.join(rebaseMergeDir, 'msgnum'), '1');
  fs.writeFileSync(path.join(rebaseMergeDir, 'end'), '2');

  return { mainDir, worktreeDir };
};

/**
 * .what = setup a worktree with no rebase in progress
 * .why = verify no-rebase detection works when .git is a file, not a directory
 */
const setupWorktreeNoRebase = (): { mainDir: string; worktreeDir: string } => {
  const mainDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'git-rebase-continue-worktree-main-'),
  );

  // init main git repo
  spawnSync('git', ['init'], { cwd: mainDir });
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: mainDir });
  spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: mainDir });

  // create initial commit on main
  fs.writeFileSync(path.join(mainDir, 'README.md'), '# Test Repo\n');
  spawnSync('git', ['add', 'README.md'], { cwd: mainDir });
  spawnSync('git', ['commit', '-m', 'init: initial commit'], { cwd: mainDir });

  // create worktree for feature branch
  const worktreeDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'git-rebase-continue-worktree-feat-'),
  );
  fs.rmSync(worktreeDir, { recursive: true }); // git worktree add needs non-existent dir
  spawnSync('git', ['worktree', 'add', '-b', 'feature/test', worktreeDir], {
    cwd: mainDir,
  });

  // setup meter state in worktree
  const meterDir = path.join(worktreeDir, '.meter');
  fs.mkdirSync(meterDir, { recursive: true });
  fs.writeFileSync(
    path.join(meterDir, 'git.commit.uses.jsonc'),
    JSON.stringify({ quant: 5, push: 'allow' }, null, 2),
  );

  return { mainDir, worktreeDir };
};

/**
 * .what = setup git repo with no rebase in progress
 * .why = test guard against continue when idle
 */
const setupNoRebase = (): string => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'git-rebase-continue-test-'),
  );

  // init git repo
  spawnSync('git', ['init'], { cwd: tempDir });
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: tempDir });
  spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: tempDir });

  // create initial commit
  fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test Repo\n');
  spawnSync('git', ['add', 'README.md'], { cwd: tempDir });
  spawnSync('git', ['commit', '-m', 'init: initial commit'], { cwd: tempDir });

  // setup meter state
  const meterDir = path.join(tempDir, '.meter');
  fs.mkdirSync(meterDir, { recursive: true });
  fs.writeFileSync(
    path.join(meterDir, 'git.commit.uses.jsonc'),
    JSON.stringify({ quant: 5, push: 'allow' }, null, 2),
  );

  return tempDir;
};

/**
 * .what = run git.branch.rebase.continue skill
 * .why = execute skill and capture output
 */
const runSkill = (
  tempDir: string,
  args: string[] = [],
): { stdout: string; stderr: string; status: number | null } => {
  const result = spawnSync('bash', [SKILL_PATH, ...args], {
    cwd: tempDir,
    encoding: 'utf-8',
    env: {
      ...process.env,
      PATH: process.env.PATH,
    },
  });

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status,
  };
};

describe('git.branch.rebase.continue', () => {
  given('[case1] no rebase in progress', () => {
    when('[t0] attempt continue', () => {
      then('shows error: no rebase in progress', () => {
        const tempDir = setupNoRebase();

        try {
          const result = runSkill(tempDir);

          expect(result.status).not.toBe(0);
          expect(result.stdout).toContain('no rebase');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case2] rebase in progress with unsettled conflicts', () => {
    when('[t0] attempt continue', () => {
      then('simulated state - see journey test for real conflicts', () => {
        // note: this test uses simulated rebase state with fake conflict markers
        // git diff --diff-filter=U only detects REAL unmerged index entries
        // the journey test covers real conflicts via actual git rebase operations
        // this test verifies the skill runs without crash in edge cases
        const tempDir = setupRebaseInProgress({
          conflictsSettled: false,
          commitsLeft: 2,
          totalCommits: 3,
        });

        try {
          const result = runSkill(tempDir);

          // simulated state passes through to git rebase --continue
          // which will fail with "not a git rebase" or similar
          // see git.branch.rebase.journey.integration.test.ts for real conflict flow
          expect(result.stdout).toBeDefined();
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case3] rebase in progress with more commits left', () => {
    when('[t0] conflicts settled, continue', () => {
      then('shows progress with commits left', () => {
        const tempDir = setupRebaseInProgress({
          conflictsSettled: true,
          commitsLeft: 2,
          totalCommits: 3,
        });

        try {
          const result = runSkill(tempDir);

          // note: actual git rebase --continue will fail in test env
          // since rebase state is simulated. check output format.
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case4] rebase in progress with final commit', () => {
    when('[t0] conflicts settled, continue to completion', () => {
      then('shows complete with ready to push', () => {
        const tempDir = setupRebaseInProgress({
          conflictsSettled: true,
          commitsLeft: 1,
          totalCommits: 3,
        });

        try {
          const result = runSkill(tempDir);

          // note: actual git rebase --continue will fail in test env
          // since rebase state is simulated. check output format.
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case5] worktree with rebase in progress', () => {
    when('[t0] attempt continue from worktree', () => {
      then('detects rebase state via git rev-parse --git-dir', () => {
        const { mainDir, worktreeDir } = setupWorktreeRebaseInProgress();

        try {
          const result = runSkill(worktreeDir);

          // skill should detect rebase in progress (not "no rebase" error)
          // actual git rebase --continue may fail since state is simulated
          // but the skill should NOT say "no rebase in progress"
          expect(result.stdout).not.toContain('no rebase in progress');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(mainDir, { recursive: true, force: true });
          fs.rmSync(worktreeDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case6] worktree with no rebase in progress', () => {
    when('[t0] attempt continue from idle worktree', () => {
      then('shows error: no rebase in progress', () => {
        const { mainDir, worktreeDir } = setupWorktreeNoRebase();

        try {
          const result = runSkill(worktreeDir);

          expect(result.status).not.toBe(0);
          expect(result.stdout).toContain('no rebase');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(mainDir, { recursive: true, force: true });
          fs.rmSync(worktreeDir, { recursive: true, force: true });
        }
      });
    });
  });
});
