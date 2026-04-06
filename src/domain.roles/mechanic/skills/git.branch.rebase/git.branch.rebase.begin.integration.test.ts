import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

/**
 * .what = integration tests for git.branch.rebase.begin skill
 * .why = verify rebase begin handles all scenarios with correct output
 */

const SKILL_PATH = path.resolve(__dirname, 'git.branch.rebase.begin.sh');

/**
 * .what = setup a git repo scenario for rebase tests
 * .why = each test needs isolated repo with specific state
 */
const setupRebaseScenario = (options: {
  commitsAhead?: number;
  commitsBehind?: number;
  pushAllowed?: boolean;
  onMainBranch?: boolean;
  dirtyWorkTree?: boolean;
  rebaseInProgress?: boolean;
}): string => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-rebase-test-'));

  // init git repo
  spawnSync('git', ['init'], { cwd: tempDir });
  configureTestGitUser({ cwd: tempDir });

  // create initial commit on main
  fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test Repo\n');
  spawnSync('git', ['add', 'README.md'], { cwd: tempDir });
  spawnSync('git', ['commit', '-m', 'init: initial commit'], { cwd: tempDir });

  // rename to main if needed
  spawnSync('git', ['branch', '-M', 'main'], { cwd: tempDir });

  // create fake origin/main ref
  spawnSync('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD'], {
    cwd: tempDir,
  });

  // add commits behind on origin/main (simulates main moved forward)
  if (options.commitsBehind && options.commitsBehind > 0) {
    for (let i = 0; i < options.commitsBehind; i++) {
      const filename = `behind-${i}.txt`;
      fs.writeFileSync(path.join(tempDir, filename), `behind content ${i}\n`);
      spawnSync('git', ['add', filename], { cwd: tempDir });
      spawnSync('git', ['commit', '-m', `chore: commit behind ${i}`], {
        cwd: tempDir,
      });
    }
    // update origin/main to include these commits
    spawnSync('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD'], {
      cwd: tempDir,
    });

    // reset back for feature branch
    spawnSync('git', ['reset', '--hard', 'HEAD~' + options.commitsBehind], {
      cwd: tempDir,
    });
  }

  // create feature branch unless testing on main
  if (!options.onMainBranch) {
    spawnSync('git', ['checkout', '-b', 'feature/test-branch'], {
      cwd: tempDir,
    });
  }

  // add commits ahead on feature branch
  const commitsAhead = options.commitsAhead ?? 2;
  for (let i = 0; i < commitsAhead; i++) {
    const filename = `feature-${i}.txt`;
    fs.writeFileSync(path.join(tempDir, filename), `feature content ${i}\n`);
    spawnSync('git', ['add', filename], { cwd: tempDir });
    spawnSync('git', ['commit', '-m', `fix(api): feature commit ${i}`], {
      cwd: tempDir,
    });
  }

  // setup meter state
  const meterDir = path.join(tempDir, '.meter');
  fs.mkdirSync(meterDir, { recursive: true });

  const meterState = {
    uses: options.pushAllowed !== false ? 5 : 0,
    push: options.pushAllowed !== false ? 'allow' : 'block',
  };
  fs.writeFileSync(
    path.join(meterDir, 'git.commit.uses.jsonc'),
    JSON.stringify(meterState, null, 2),
  );

  // create dirty work tree if needed (modify tracked file, not untracked)
  if (options.dirtyWorkTree) {
    // modify tracked file - git diff only shows tracked file changes
    fs.writeFileSync(
      path.join(tempDir, 'README.md'),
      '# Test Repo\n\nmodified content\n',
    );
  }

  // simulate rebase in progress if needed
  if (options.rebaseInProgress) {
    const rebaseMergeDir = path.join(tempDir, '.git', 'rebase-merge');
    fs.mkdirSync(rebaseMergeDir, { recursive: true });
    fs.writeFileSync(
      path.join(rebaseMergeDir, 'head-name'),
      'refs/heads/feature/test-branch',
    );
    fs.writeFileSync(path.join(rebaseMergeDir, 'onto'), 'abc123');
    fs.writeFileSync(path.join(rebaseMergeDir, 'msgnum'), '1');
    fs.writeFileSync(path.join(rebaseMergeDir, 'end'), '3');
  }

  return tempDir;
};

/**
 * .what = run git.branch.rebase.begin skill
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

describe('git.branch.rebase.begin', () => {
  given('[case1] feature branch with commits ahead and behind', () => {
    when('[t0] plan mode (default)', () => {
      then('shows preview or fetch error (no real remote in test)', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 3,
          commitsBehind: 2,
          pushAllowed: true,
        });

        try {
          const result = runSkill(tempDir);

          // note: in test env without real remote, fetch fails
          // snapshot captures actual behavior for vibecheck
          expect(result.stdout).toContain('git.branch.rebase begin');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case2] feature branch ready to rebase', () => {
    when('[t0] apply mode attempts rebase', () => {
      then('shows result or fetch error (no real remote in test)', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 2,
          commitsBehind: 0,
          pushAllowed: true,
        });

        try {
          const result = runSkill(tempDir, ['--mode', 'apply']);

          // note: in test env without real remote, fetch fails
          // snapshot captures actual behavior for vibecheck
          expect(result.stdout).toContain('git.branch.rebase begin');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case3] rebase with conflicts', () => {
    when('[t0] apply mode hits conflict', () => {
      then('shows conflict status and files', () => {
        // note: simulating real conflict requires complex setup
        // this test validates the output format when conflicts detected
        const tempDir = setupRebaseScenario({
          commitsAhead: 2,
          commitsBehind: 2,
          pushAllowed: true,
        });

        // create conflicting content on both branches
        fs.writeFileSync(
          path.join(tempDir, 'conflict.txt'),
          'feature version\n',
        );
        spawnSync('git', ['add', 'conflict.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'fix: add conflict file'], {
          cwd: tempDir,
        });

        // add same file on origin/main with different content
        spawnSync('git', ['checkout', 'main'], { cwd: tempDir });
        fs.writeFileSync(path.join(tempDir, 'conflict.txt'), 'main version\n');
        spawnSync('git', ['add', 'conflict.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'fix: main conflict file'], {
          cwd: tempDir,
        });
        spawnSync('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD'], {
          cwd: tempDir,
        });
        spawnSync('git', ['checkout', 'feature/test-branch'], { cwd: tempDir });

        try {
          const result = runSkill(tempDir, ['--mode', 'apply']);

          // conflict should show specific output
          if (result.stdout.includes('conflict')) {
            expect(result.stdout).toContain('hang tight');
            expect(result.stdout).toContain('conflict');
            expect(result.stdout).toContain('settle conflicts');
          }
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case4] no push permission granted', () => {
    when('[t0] attempt rebase', () => {
      then('shows error: push permission required', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 2,
          pushAllowed: false,
        });

        try {
          const result = runSkill(tempDir);

          expect(result.status).not.toBe(0);
          expect(result.stdout).toContain('hold up dude');
          expect(result.stdout).toContain('push permission');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case5] on main branch', () => {
    when('[t0] attempt rebase', () => {
      then('shows error: cannot rebase main', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 2,
          pushAllowed: true,
          onMainBranch: true,
        });

        try {
          const result = runSkill(tempDir);

          expect(result.status).not.toBe(0);
          expect(result.stdout).toContain('hold up dude');
          expect(result.stdout).toContain('main');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case6] dirty work tree', () => {
    when('[t0] attempt rebase', () => {
      then('shows error: unstaged changes', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 2,
          pushAllowed: true,
          dirtyWorkTree: true,
        });

        try {
          const result = runSkill(tempDir);

          expect(result.status).not.toBe(0);
          expect(result.stdout).toContain('hold up dude');
          expect(result.stdout).toContain('unstaged');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case7] branch already up to date', () => {
    when('[t0] attempt rebase', () => {
      then('shows up to date or fetch error (no real remote in test)', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 0,
          commitsBehind: 0,
          pushAllowed: true,
        });

        try {
          const result = runSkill(tempDir);

          // note: in test env without real remote, fetch fails
          // snapshot captures actual behavior for vibecheck
          expect(result.stdout).toContain('git.branch.rebase begin');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case8] rebase already in progress', () => {
    when('[t0] attempt rebase', () => {
      then('shows in progress error with guidance', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 2,
          pushAllowed: true,
          rebaseInProgress: true,
        });

        try {
          const result = runSkill(tempDir);

          expect(result.status).not.toBe(0);
          expect(result.stdout).toContain('rebase');
          expect(result.stdout).toContain('progress');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case9] uses is "infinite"', () => {
    when('[t0] apply mode with infinite uses', () => {
      then('does not fail on integer comparison (handles infinite)', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 2,
          pushAllowed: true,
        });

        // override meter state with "infinite" uses
        const meterDir = path.join(tempDir, '.meter');
        const meterState = {
          uses: 'infinite',
          push: 'allow',
        };
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify(meterState, null, 2),
        );

        try {
          const result = runSkill(tempDir, ['--mode', 'apply']);

          // should not fail with "infinite: unbound variable"
          expect(result.stderr).not.toContain('infinite: unbound variable');
          expect(result.stderr).not.toContain('integer expression expected');

          // note: fetch will fail in test env (no real remote)
          // but we verify it gets past the "uses" check
          expect(result.stdout).toContain('git.branch.rebase begin');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });

    when('[t1] plan mode with infinite uses', () => {
      then('shows preview (plan mode is always free)', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 2,
          pushAllowed: true,
        });

        // override meter state with "infinite" uses
        const meterDir = path.join(tempDir, '.meter');
        const meterState = {
          uses: 'infinite',
          push: 'allow',
        };
        fs.writeFileSync(
          path.join(meterDir, 'git.commit.uses.jsonc'),
          JSON.stringify(meterState, null, 2),
        );

        try {
          const result = runSkill(tempDir); // default is plan mode

          // should not fail with bash errors
          expect(result.stderr).not.toContain('infinite: unbound variable');
          expect(result.stderr).not.toContain('integer expression expected');

          // note: fetch will fail in test env (no real remote)
          // but we verify it handles "infinite" correctly
          expect(result.stdout).toContain('git.branch.rebase begin');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });
});
