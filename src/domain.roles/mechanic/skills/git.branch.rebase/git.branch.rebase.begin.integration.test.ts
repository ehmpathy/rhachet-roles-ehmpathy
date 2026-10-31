import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

/**
 * .what = integration tests for git.branch.rebase.begin skill
 * .why = verify rebase begin handles all scenarios with correct output
 */

const SKILL_PATH = path.resolve(__dirname, 'git.branch.rebase.begin.sh');

/**
 * .what = setup a git repo scenario for rebase tests
 * .why = each test needs isolated repo with specific state
 * .note = the origin is a real bare repo inside the temp dir (excluded from
 *         git), so the skill's fetch and pull reach it and one rmSync cleans
 *         both; withOrigin: false leaves no remote, for the no-origin refusal
 */
const setupRebaseScenario = (options: {
  commitsAhead?: number;
  commitsBehind?: number;
  pushAllowed?: boolean;
  onMainBranch?: boolean;
  dirtyWorkTree?: boolean;
  rebaseInProgress?: boolean;
  withOrigin?: boolean;
}): string => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-rebase-test-'));
  const withOrigin = options.withOrigin ?? true;

  // init git repo on main
  spawnSync('git', ['init', '-b', 'main'], { cwd: tempDir });
  configureTestGitUser({ cwd: tempDir });

  // create initial commit on main
  fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test Repo\n');
  spawnSync('git', ['add', 'README.md'], { cwd: tempDir });
  spawnSync('git', ['commit', '-m', 'init: initial commit'], { cwd: tempDir });

  // a real bare origin, inside the temp dir and excluded from the work tree
  if (withOrigin) {
    const originDir = path.join(tempDir, '.origin.git');
    spawnSync('git', ['init', '--bare', '-b', 'main', originDir]);
    fs.appendFileSync(
      path.join(tempDir, '.git', 'info', 'exclude'),
      '.origin.git/\n',
    );
    spawnSync('git', ['remote', 'add', 'origin', originDir], {
      cwd: tempDir,
    });
    spawnSync('git', ['push', 'origin', 'main'], { cwd: tempDir });
  }

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
    // push these commits to origin/main
    if (withOrigin)
      spawnSync('git', ['push', 'origin', 'main'], { cwd: tempDir });

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

/**
 * .what = the skill's stdout with its volatile values masked
 * .why = commit shas change with each commit's timestamp and the temp dir is
 *        random; a snapshot must pin the frame, not those values
 */
const asStableOutput = (input: { stdout: string; tempDir: string }): string =>
  input.stdout
    .split(input.tempDir)
    .join('<tempdir>')
    .replace(/\b[0-9a-f]{7,40}\b/g, '<sha>');

describe('git.branch.rebase.begin', () => {
  given('[case1] feature branch with commits ahead and behind', () => {
    when('[t0] plan mode (default)', () => {
      then('shows the preview: ahead, behind, and the meter', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 3,
          commitsBehind: 2,
          pushAllowed: true,
        });

        try {
          const result = runSkill(tempDir);

          expect(result.status).toBe(0);
          expect(result.stdout).toContain('git.branch.rebase begin');
          expect(result.stdout).toContain('ahead: 3 commits');
          expect(result.stdout).toContain('behind: 2 commits');
          expect(result.stdout).toContain('run with --mode apply to execute');
          expect(
            asStableOutput({ stdout: result.stdout, tempDir }),
          ).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case2] feature branch one commit behind origin/main', () => {
    when('[t0] apply mode attempts rebase', () => {
      then('rebases onto origin/main and shows the result', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 2,
          commitsBehind: 1,
          pushAllowed: true,
        });

        try {
          const result = runSkill(tempDir, ['--mode', 'apply']);

          expect(result.status).toBe(0);
          expect(result.stdout).toContain('git.branch.rebase begin');
          expect(result.stdout).not.toContain('conflict');
          expect(result.stdout).not.toContain('failed');
          expect(
            asStableOutput({ stdout: result.stdout, tempDir }),
          ).toMatchSnapshot();

          // the feature branch now sits on top of origin/main
          const isOnTop = spawnSync(
            'git',
            ['merge-base', '--is-ancestor', 'origin/main', 'HEAD'],
            { cwd: tempDir },
          );
          expect(isOnTop.status).toBe(0);
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case3] rebase with conflicts', () => {
    when('[t0] apply mode hits conflict', () => {
      then('shows conflict status and files', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 2,
          commitsBehind: 2,
          pushAllowed: true,
        });

        // the feature branch adds conflict.txt
        fs.writeFileSync(
          path.join(tempDir, 'conflict.txt'),
          'feature version\n',
        );
        spawnSync('git', ['add', 'conflict.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'fix: add conflict file'], {
          cwd: tempDir,
        });

        // origin/main adds the same file with other content
        spawnSync('git', ['checkout', 'main'], { cwd: tempDir });
        spawnSync('git', ['reset', '--hard', 'origin/main'], { cwd: tempDir });
        fs.writeFileSync(path.join(tempDir, 'conflict.txt'), 'main version\n');
        spawnSync('git', ['add', 'conflict.txt'], { cwd: tempDir });
        spawnSync('git', ['commit', '-m', 'fix: main conflict file'], {
          cwd: tempDir,
        });
        spawnSync('git', ['push', 'origin', 'main'], { cwd: tempDir });
        spawnSync('git', ['checkout', 'feature/test-branch'], { cwd: tempDir });

        try {
          const result = runSkill(tempDir, ['--mode', 'apply']);

          expect(result.stdout).toContain('hang tight');
          expect(result.stdout).toContain('conflict');
          expect(result.stdout).toContain('conflict.txt');
          expect(result.stdout).toContain('settle conflicts');
          expect(
            asStableOutput({ stdout: result.stdout, tempDir }),
          ).toMatchSnapshot();
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
    when('[t0] attempt rebase with zero commits ahead', () => {
      then('says there is no commit to rebase', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 0,
          commitsBehind: 0,
          pushAllowed: true,
        });

        try {
          const result = runSkill(tempDir);

          // a zero count once read as "0\n0", failed the zero test, and fell through
          expect(result.status).toBe(0);
          expect(result.stdout).toContain('already up to date');
          expect(result.stdout).toContain('git.branch.rebase begin');
          expect(result.stdout).toContain('no commits to rebase');
          expect(result.stdout).not.toContain('0\n0');
          expect(
            asStableOutput({ stdout: result.stdout, tempDir }),
          ).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });

    when('[t1] attempt rebase with commits ahead and zero behind', () => {
      then('shows up to date, with one count per line', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 2,
          commitsBehind: 0,
          pushAllowed: true,
        });

        try {
          const result = runSkill(tempDir);

          expect(result.status).toBe(0);
          expect(result.stdout).toContain('   ├─ commits: 2 (ahead)\n');
          expect(result.stdout).toContain('   └─ behind: 0\n');
          expect(result.stdout).toContain('no rebase needed');
          expect(
            asStableOutput({ stdout: result.stdout, tempDir }),
          ).toMatchSnapshot();
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
          commitsBehind: 1,
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

          // past the uses check, the apply rebases onto origin/main
          expect(result.status).toBe(0);
          expect(result.stdout).toContain('git.branch.rebase begin');
          expect(result.stdout).not.toContain('no commit uses left');
          expect(
            asStableOutput({ stdout: result.stdout, tempDir }),
          ).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });

    when('[t1] plan mode with infinite uses', () => {
      then('shows preview (plan mode is always free)', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 2,
          commitsBehind: 1,
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

          // infinite uses reach the preview
          expect(result.status).toBe(0);
          expect(result.stdout).toContain('git.branch.rebase begin');
          expect(result.stdout).toContain('behind: 1 commits\n');
          expect(result.stdout).toContain('run with --mode apply to execute');
          expect(
            asStableOutput({ stdout: result.stdout, tempDir }),
          ).toMatchSnapshot();
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
      // one fixture for both whens: neither mutates it (apply refuses before
      // any git call; plan only fetches an origin that is already current)
      const scene = useBeforeAll(async () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 2,
          commitsBehind: 1,
          pushAllowed: true,
        });
        fs.writeFileSync(
          path.join(tempDir, '.meter', 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 0, push: 'allow' }, null, 2),
        );
        return { tempDir };
      });
      afterAll(() => {
        fs.rmSync(scene.tempDir, { recursive: true, force: true });
      });

      when('[t0] apply mode', () => {
        then('refuses on uses, and names the human grant', () => {
          const result = runSkill(scene.tempDir, ['--mode', 'apply']);

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
          expect(result.stdout).not.toContain('git.crew.grant');
          expect(result.stdout).toMatchSnapshot();
        });
      });

      when('[t1] plan mode', () => {
        then('passes every quota guard (plan spends no use)', () => {
          const result = runSkill(scene.tempDir);

          // past every quota guard, plan reaches the origin and previews
          expect(result.status).toBe(0);
          expect(result.stdout).toContain('run with --mode apply to execute');
          expect(result.stdout).not.toContain('no commit uses left');
          expect(result.stdout).not.toContain('ask your human');
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
          const rootDir = setupPullRefused();
          try {
            const result = runSkill(path.join(rootDir, 'work'), [
              '--mode',
              'apply',
            ]);

            expect(result.stdout).toContain('error: rebase failed');
            expect(result.stdout).not.toContain('righteous');
            expect(result.stdout).not.toContain('status: clean');
            expect(result.status).toBe(1);
            expect(
              asStableOutput({ stdout: result.stdout, tempDir: rootDir }),
            ).toMatchSnapshot();
          } finally {
            fs.rmSync(rootDir, { recursive: true, force: true });
          }
        });
      });
    },
  );

  given('[case12] a tree with no origin remote', () => {
    when('[t0] attempt rebase', () => {
      then('refuses: no main or master on origin', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 2,
          pushAllowed: true,
          withOrigin: false,
        });

        try {
          const result = runSkill(tempDir);

          expect(result.status).not.toBe(0);
          expect(result.stdout).toContain(
            'error: no main or master branch found on origin',
          );
          expect(
            asStableOutput({ stdout: result.stdout, tempDir }),
          ).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given(
    '[case13] origin/main is known, but the origin cannot be reached',
    () => {
      when('[t0] attempt rebase', () => {
        then('refuses: failed to fetch origin/main', () => {
          const tempDir = setupRebaseScenario({
            commitsAhead: 2,
            commitsBehind: 1,
            pushAllowed: true,
          });

          // the local origin/main ref stays; the remote now points nowhere
          spawnSync(
            'git',
            ['remote', 'set-url', 'origin', path.join(tempDir, '.absent.git')],
            { cwd: tempDir },
          );

          try {
            const result = runSkill(tempDir);

            expect(result.status).toBe(1);
            expect(result.stdout).toContain(
              'error: failed to fetch origin/main',
            );
            expect(result.stdout).toContain(
              'check your network connection and try again',
            );
            expect(
              asStableOutput({ stdout: result.stdout, tempDir }),
            ).toMatchSnapshot();
          } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        });
      });
    },
  );
});
