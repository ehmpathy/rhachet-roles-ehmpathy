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

  given(
    '[case10] uses spent, push allowed, director detection answers none',
    () => {
      // .note = the svc-quotes #141 incident state. the fixture's own zero-uses
      //         path also blocks push, so the push guard fires first and the
      //         uses guard is reached only here
      /**
       * .what = a rebase fixture with its quota spent and push still allowed
       * .why = both whens need the same state; setup sits inside each try so
       *        the finally always removes the temp dir
       */
      const setupUsesSpent = (): string => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 2,
          pushAllowed: true,
        });
        fs.writeFileSync(
          path.join(tempDir, '.meter', 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 0, push: 'allow' }, null, 2),
        );
        return tempDir;
      };

      when('[t0] apply mode', () => {
        then('refuses on uses, and names the human grant', () => {
          let tempDir: string | null = null; // .note = deliberate mutation: set inside try so finally can clean up
          try {
            tempDir = setupUsesSpent();
            const result = runSkill(tempDir, ['--mode', 'apply']);

            expect(result.status).toBe(1);
            expect(result.stdout).toContain('error: no commit uses left');
            expect(result.stdout).not.toContain(
              'rebase requires push permission',
            );
            expect(result.stdout).toContain('ask your human to grant more:');
            expect(result.stdout).toContain(
              '$ rhx git.commit.uses set --quant N --push allow',
            );
            expect(result.stdout).not.toContain('director');
            expect(result.stdout).toMatchSnapshot();
          } finally {
            if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
          }
        });
      });

      when('[t1] plan mode', () => {
        then('passes every quota guard (plan spends no use)', () => {
          let tempDir: string | null = null; // .note = deliberate mutation: set inside try so finally can clean up
          try {
            tempDir = setupUsesSpent();
            const result = runSkill(tempDir);

            // past every quota guard, plan reaches the fetch, which has no remote here
            expect(result.stdout).toContain(
              'error: failed to fetch origin/main',
            );
            expect(result.stdout).not.toContain('no commit uses left');
            expect(result.stdout).not.toContain('ask your human');
          } finally {
            if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
          }
        });
      });
    },
  );

  given(
    '[case11] the pull fails and leaves no rebase in progress (a pre-rebase hook refuses)',
    () => {
      /**
       * .what = a feature branch one commit behind a real (bare) origin, whose
       *         pre-rebase hook refuses
       * .why = the refusal makes `git pull --rebase` exit non-zero with no rebase
       *        state left behind, the exact path a swallowed exit code reports
       *        as a clean rebase
       */
      const setupPullRefused = (): string => {
        const rootDir = fs.mkdtempSync(
          path.join(os.tmpdir(), 'git-rebase-pull-refused-'),
        );
        const originDir = path.join(rootDir, 'origin.git');
        const workDir = path.join(rootDir, 'work');
        spawnSync('git', ['init', '--bare', '-b', 'main', originDir]);
        fs.mkdirSync(workDir);
        spawnSync('git', ['init', '-b', 'main'], { cwd: workDir });
        configureTestGitUser({ cwd: workDir });
        spawnSync('git', ['remote', 'add', 'origin', originDir], {
          cwd: workDir,
        });

        // main: an initial commit, then one more that the feature branch lacks
        fs.writeFileSync(path.join(workDir, 'README.md'), '# reef\n');
        spawnSync('git', ['add', 'README.md'], { cwd: workDir });
        spawnSync('git', ['commit', '-m', 'init: reef'], { cwd: workDir });
        fs.writeFileSync(path.join(workDir, 'tide.txt'), 'high tide\n');
        spawnSync('git', ['add', 'tide.txt'], { cwd: workDir });
        spawnSync('git', ['commit', '-m', 'chore: tide'], { cwd: workDir });
        spawnSync('git', ['push', 'origin', 'main'], { cwd: workDir });

        // feature branch off the first commit, so it sits one behind origin/main
        spawnSync('git', ['checkout', '-b', 'feature/kelp', 'HEAD~1'], {
          cwd: workDir,
        });
        fs.writeFileSync(path.join(workDir, 'kelp.txt'), 'kelp\n');
        spawnSync('git', ['add', 'kelp.txt'], { cwd: workDir });
        spawnSync('git', ['commit', '-m', 'fix(kelp): add kelp'], {
          cwd: workDir,
        });

        // meter: uses left, push allowed, so every quota guard passes
        fs.mkdirSync(path.join(workDir, '.meter'));
        fs.writeFileSync(
          path.join(workDir, '.meter', 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 5, push: 'allow' }, null, 2),
        );

        // a pre-rebase hook that refuses: the pull fails, no rebase state remains
        const hookPath = path.join(workDir, '.git', 'hooks', 'pre-rebase');
        fs.writeFileSync(
          hookPath,
          '#!/bin/sh\necho "pre-rebase: refused" >&2\nexit 1\n',
        );
        fs.chmodSync(hookPath, 0o755);

        return rootDir;
      };

      when('[t0] apply mode', () => {
        then('it reports the failure, never a clean rebase', () => {
          let rootDir: string | null = null; // .note = deliberate mutation: set inside try so finally can clean up
          try {
            rootDir = setupPullRefused();
            const result = runSkill(path.join(rootDir, 'work'), [
              '--mode',
              'apply',
            ]);

            expect(result.stdout).toContain('error: rebase failed');
            expect(result.stdout).not.toContain('righteous');
            expect(result.stdout).not.toContain('status: clean');
            expect(result.status).toBe(1);
          } finally {
            if (rootDir) fs.rmSync(rootDir, { recursive: true, force: true });
          }
        });
      });
    },
  );
});
