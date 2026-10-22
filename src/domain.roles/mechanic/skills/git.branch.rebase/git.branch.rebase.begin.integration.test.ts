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
  grantHeld?: boolean;
  usesLeft?: number;
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
    uses: options.grantHeld !== false ? (options.usesLeft ?? 5) : 0,
    held: options.grantHeld !== false,
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
 * .what = attach a real bare repo as origin, with main at the fake origin/main
 * .why  = the fast-forward guards fetch and ls-remote; those need a real remote
 */
const attachBareOrigin = (tempDir: string): string => {
  const bareDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-rebase-origin-'));
  spawnSync('git', ['init', '--bare'], { cwd: bareDir });
  spawnSync('git', ['remote', 'add', 'origin', bareDir], { cwd: tempDir });

  // the bare main holds what the fake origin/main ref held
  spawnSync(
    'git',
    ['push', '--quiet', 'origin', 'refs/remotes/origin/main:refs/heads/main'],
    { cwd: tempDir },
  );
  return bareDir;
};

/**
 * .what = a PATH dir whose git fails one subcommand and passes all else to the real git
 * .why  = a remote read, a count, or a pull cannot be made to fail on a real
 *         repo in a deterministic way; this shim is the one fault it injects
 */
const genGitShimFailsOn = (input: { subcommand: string }): string => {
  const shimDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-rebase-shim-'));
  const gitReal = spawnSync('which', ['git'], {
    encoding: 'utf-8',
  }).stdout.trim();
  fs.writeFileSync(
    path.join(shimDir, 'git'),
    [
      '#!/usr/bin/env bash',
      `if [[ "$1" == "${input.subcommand}" ]]; then echo "fatal: ${input.subcommand} refused by the test shim" >&2; exit 128; fi`,
      `exec "${gitReal}" "$@"`,
      '',
    ].join('\n'),
    { mode: 0o755 },
  );
  return shimDir;
};

/**
 * .what = run git.branch.rebase.begin skill
 * .why = execute skill and capture output
 */
const runSkill = (
  tempDir: string,
  args: string[] = [],
  options: {
    globalBlocker?: boolean;
    globalBlockerRaw?: string;
    pathPrefix?: string;
  } = {},
): { stdout: string; stderr: string; status: number | null } => {
  // isolate HOME: begin reads the host-wide commit blocker under HOME, so a
  // blocker on the host must never leak into a case
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'git-rebase-home-'));
  if (options.globalBlocker || options.globalBlockerRaw !== undefined) {
    const globalMeterDir = path.join(
      tempHome,
      '.rhachet',
      'storage',
      'repo=ehmpathy',
      'role=mechanic',
      '.meter',
    );
    fs.mkdirSync(globalMeterDir, { recursive: true });
    fs.writeFileSync(
      path.join(globalMeterDir, 'git.commit.uses.jsonc'),
      options.globalBlockerRaw ?? JSON.stringify({ blocked: true }),
    );
  }
  const result = spawnSync('bash', [SKILL_PATH, ...args], {
    cwd: tempDir,
    encoding: 'utf-8',
    env: {
      ...process.env,
      PATH: options.pathPrefix
        ? `${options.pathPrefix}:${process.env.PATH}`
        : process.env.PATH,
      HOME: tempHome,
    },
  });
  fs.rmSync(tempHome, { recursive: true, force: true });

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
          grantHeld: true,
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
          grantHeld: true,
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
          grantHeld: true,
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

        // a real origin, so the fetch lands and the rebase meets the conflict
        const bareDir = attachBareOrigin(tempDir);

        try {
          const result = runSkill(tempDir, ['--mode', 'apply']);

          // the halt names the conflict, the file, and the next two moves
          expect(result.status).not.toBe(0);
          expect(result.stdout).toContain('└─ status: conflict');
          expect(result.stdout).toContain('conflict.txt');
          expect(result.stdout).toContain(
            'settle the conflicts in the files above, stage them, then continue',
          );
          expect(result.stdout).toContain('└─ rhx git.branch.rebase continue');
          expect(result.stderr).toContain('└─ status: conflict');
          // git's own half is host text, and shas vary per run: mask both
          expect(
            result.stdout
              .replace(
                /(└─ git\.output\n {6}├─\n {6}│\n)(?: {6}│ {2}.*\n)+/,
                '$1      │  <git output>\n',
              )
              .replace(/\b[0-9a-f]{7,40}\b/g, '<sha>'),
          ).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
          fs.rmSync(bareDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case4b] the global commit kill switch is on', () => {
    when('[t0] apply on a live grant', () => {
      then('exit 2: a human-set global block halts the rebase too', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 2,
          commitsBehind: 1,
        });

        try {
          const result = runSkill(tempDir, ['--mode', 'apply'], {
            globalBlocker: true,
          });

          expect(result.status).toBe(2);
          expect(result.stdout).toContain('ConstraintError: globally blocked');
          expect(result.stderr).toContain('globally blocked');
          expect(result.stdout).toContain('git.commit.uses allow --global');
          expect(result.stdout).toMatchSnapshot();
          expect(result.stderr).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case4] no commit grant held', () => {
    when('[t0] attempt rebase after a revoke', () => {
      then('shows error: no commit grant on this tree', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 2,
          grantHeld: false,
        });

        try {
          const result = runSkill(tempDir);

          expect(result.status).toBe(2);
          expect(result.stdout).toContain('hold up dude');
          expect(result.stdout).toContain('no commit grant on this tree');
          expect(result.stderr).toContain('no commit grant on this tree');
          expect(result.stdout).toContain('git.commit.uses set --quant N');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });

    when('[t1] apply on a held grant with zero uses left', () => {
      then(
        'the grant check passes: a rebase rides the held grant, spends no use (F9)',
        () => {
          const tempDir = setupRebaseScenario({
            commitsAhead: 2,
            commitsBehind: 1,
            grantHeld: true,
            usesLeft: 0,
          });

          // a real origin, so the rebase actually runs (the wish's incident)
          const bareDir = attachBareOrigin(tempDir);

          try {
            const result = runSkill(tempDir, ['--mode', 'apply']);

            // the rebase lands on a held grant at 0 left
            expect(result.status).toBe(0);
            expect(result.stdout).not.toContain('no commit uses left');
            expect(result.stdout).not.toContain('no commit grant');
            expect(result.stdout).not.toContain('ConstraintError');
            expect(
              spawnSync(
                'git',
                ['merge-base', '--is-ancestor', 'origin/main', 'HEAD'],
                { cwd: tempDir },
              ).status,
            ).toBe(0);

            // and spends no use
            expect(
              JSON.parse(
                fs.readFileSync(
                  path.join(tempDir, '.meter', 'git.commit.uses.jsonc'),
                  'utf-8',
                ),
              ).uses,
            ).toBe(0);
          } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
            fs.rmSync(bareDir, { recursive: true, force: true });
          }
        },
      );
    });

    when('[t2] plan on a held grant with zero uses left', () => {
      then('the grant check passes (plan is free)', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 2,
          grantHeld: true,
          usesLeft: 0,
        });

        try {
          const result = runSkill(tempDir);

          expect(result.stdout).not.toContain('no commit grant');
          expect(result.stdout).not.toContain('no commit uses left');
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
          grantHeld: true,
          onMainBranch: true,
        });

        try {
          const result = runSkill(tempDir);

          expect(result.status).toBe(2);
          expect(result.stdout).toContain('✋ ConstraintError');
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
          grantHeld: true,
          dirtyWorkTree: true,
        });

        try {
          const result = runSkill(tempDir);

          expect(result.status).toBe(2);
          expect(result.stdout).toContain('✋ ConstraintError');
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
          grantHeld: true,
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
          grantHeld: true,
          rebaseInProgress: true,
        });

        try {
          const result = runSkill(tempDir);

          expect(result.status).toBe(2);
          expect(result.stdout).toContain('✋ ConstraintError');
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
          grantHeld: true,
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
          grantHeld: true,
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

  given('[case10] the commit quota file is damaged', () => {
    when('[t0] attempt rebase', () => {
      then('refuses as a malfunction on both streams', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 2,
          grantHeld: true,
        });
        fs.writeFileSync(
          path.join(tempDir, '.meter', 'git.commit.uses.jsonc'),
          '{ "uses": 3, "pu',
        );

        try {
          const result = runSkill(tempDir, ['--mode', 'apply']);

          expect(result.status).toBe(1);
          expect(result.stdout).toContain(
            '💥 MalfunctionError: commit quota file corrupt',
          );
          expect(result.stderr).toContain(
            '💥 MalfunctionError: commit quota file corrupt',
          );
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given(
    '[case11] zero commits ahead, main moved forward, a real origin',
    () => {
      when('[t0] plan mode', () => {
        then('previews a fast-forward', () => {
          const tempDir = setupRebaseScenario({
            commitsAhead: 0,
            commitsBehind: 2,
            grantHeld: true,
          });
          const bareDir = attachBareOrigin(tempDir);

          try {
            const result = runSkill(tempDir);

            expect(result.status).toBe(0);
            expect(result.stdout).toContain('shape: fast-forward');

            // mask commit shas: they vary with the commit time
            expect(
              result.stdout.replace(/\b[0-9a-f]{7,}\b(?= chore)/g, '<sha>'),
            ).toMatchSnapshot();
          } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
            fs.rmSync(bareDir, { recursive: true, force: true });
          }
        });
      });

      when('[t1] the branch remote cannot be read', () => {
        then('fails closed as a malfunction on both streams', () => {
          const tempDir = setupRebaseScenario({
            commitsAhead: 0,
            commitsBehind: 2,
            grantHeld: true,
          });
          const bareDir = attachBareOrigin(tempDir);
          const shimDir = genGitShimFailsOn({ subcommand: 'ls-remote' });

          try {
            const result = runSkill(tempDir, [], { pathPrefix: shimDir });

            expect(result.status).toBe(1);
            expect(result.stdout).toContain(
              '💥 MalfunctionError: could not read origin/feature/test-branch',
            );
            expect(result.stderr).toContain(
              '💥 MalfunctionError: could not read origin/feature/test-branch',
            );
            expect(result.stdout).toMatchSnapshot();
          } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
            fs.rmSync(bareDir, { recursive: true, force: true });
            fs.rmSync(shimDir, { recursive: true, force: true });
          }
        });
      });

      when('[t2] the branch remote holds a commit this tree lacks', () => {
        then('refuses the fast-forward as a constraint', () => {
          const tempDir = setupRebaseScenario({
            commitsAhead: 0,
            commitsBehind: 2,
            grantHeld: true,
          });
          const bareDir = attachBareOrigin(tempDir);

          // push one commit to origin/feature/test-branch, then drop it locally
          fs.writeFileSync(
            path.join(tempDir, 'remote-only.txt'),
            'only remote\n',
          );
          spawnSync('git', ['add', 'remote-only.txt'], { cwd: tempDir });
          spawnSync('git', ['commit', '-m', 'fix(api): remote only'], {
            cwd: tempDir,
          });
          spawnSync(
            'git',
            ['push', '--quiet', 'origin', 'HEAD:feature/test-branch'],
            {
              cwd: tempDir,
            },
          );
          spawnSync('git', ['reset', '--hard', 'HEAD~1'], { cwd: tempDir });

          try {
            const result = runSkill(tempDir);

            expect(result.status).toBe(2);
            expect(result.stdout).toContain(
              'origin/feature/test-branch holds commits this tree lacks: 1',
            );
            expect(result.stderr).toContain('✋ ConstraintError');
            expect(result.stdout).toMatchSnapshot();
          } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
            fs.rmSync(bareDir, { recursive: true, force: true });
          }
        });
      });
    },
  );

  given('[case12] the skill hits a malfunction past its guards', () => {
    when('[t0] the global blocker file is damaged', () => {
      then('refuses as a malfunction on both streams', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 2,
          commitsBehind: 1,
        });

        try {
          const result = runSkill(tempDir, ['--mode', 'apply'], {
            globalBlockerRaw: '{ "blocked": tr',
          });

          expect(result.status).toBe(1);
          expect(result.stdout).toContain(
            '💥 MalfunctionError: global blocker file corrupt',
          );
          expect(result.stderr).toContain(
            '💥 MalfunctionError: global blocker file corrupt',
          );
          expect(result.stdout).toMatchSnapshot();
          expect(result.stderr).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });

    when('[t1] origin holds neither main nor master', () => {
      then('refuses as a malfunction on both streams', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 2,
          commitsBehind: 1,
        });
        spawnSync('git', ['update-ref', '-d', 'refs/remotes/origin/main'], {
          cwd: tempDir,
        });

        try {
          const result = runSkill(tempDir);

          expect(result.status).toBe(1);
          expect(result.stdout).toContain(
            '💥 MalfunctionError: no main or master branch found on origin',
          );
          expect(result.stderr).toContain(
            '💥 MalfunctionError: no main or master branch found on origin',
          );
          expect(result.stdout).toMatchSnapshot();
          expect(result.stderr).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });

    when('[t2] the count of commits behind cannot be read', () => {
      then('fails closed as a malfunction on both streams', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 2,
          commitsBehind: 1,
        });
        const bareDir = attachBareOrigin(tempDir);
        const shimDir = genGitShimFailsOn({ subcommand: 'rev-list' });

        try {
          const result = runSkill(tempDir, [], { pathPrefix: shimDir });

          expect(result.status).toBe(1);
          expect(result.stdout).toContain(
            '💥 MalfunctionError: could not count commits behind origin/main',
          );
          expect(result.stderr).toContain(
            '💥 MalfunctionError: could not count commits behind origin/main',
          );
          expect(result.stdout).toContain('git fetch origin main');
          expect(result.stdout).toMatchSnapshot();
          expect(result.stderr).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
          fs.rmSync(bareDir, { recursive: true, force: true });
          fs.rmSync(shimDir, { recursive: true, force: true });
        }
      });
    });

    when('[t3] the rebase fails with no conflict', () => {
      then('names the malfunction and shows the git output', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 2,
          commitsBehind: 1,
        });
        const bareDir = attachBareOrigin(tempDir);
        const shimDir = genGitShimFailsOn({ subcommand: 'pull' });

        try {
          const result = runSkill(tempDir, ['--mode', 'apply'], {
            pathPrefix: shimDir,
          });

          expect(result.status).toBe(1);
          expect(result.stdout).toContain('💥 MalfunctionError: rebase failed');
          expect(result.stderr).toContain('💥 MalfunctionError: rebase failed');
          expect(result.stdout).toContain('pull refused by the test shim');
          expect(result.stdout).toMatchSnapshot();
          expect(result.stderr).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
          fs.rmSync(bareDir, { recursive: true, force: true });
          fs.rmSync(shimDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case13] a call the skill does not know how to read', () => {
    const usages = [
      {
        slug: 'an unknown mode',
        args: ['--mode', 'bogus'],
        message:
          "✋ ConstraintError: unknown mode 'bogus' (valid modes: plan, apply)",
      },
      {
        slug: 'an unknown argument',
        args: ['--bogus'],
        message: '✋ ConstraintError: unknown argument: --bogus',
      },
    ];
    usages.forEach((usage, index) => {
      when(`[t${index}] begin is called with ${usage.slug}`, () => {
        then('exit 2, the refusal rides both streams, before any fetch', () => {
          // no origin is attached: a refusal that reached the fetch would fail it
          const tempDir = setupRebaseScenario({
            commitsAhead: 2,
            commitsBehind: 1,
          });

          try {
            const result = runSkill(tempDir, usage.args);

            expect(result.status).toBe(2);
            expect(result.stdout).toContain(usage.message);
            expect(result.stderr).toContain(usage.message);
            expect(result.stdout).not.toContain('fetch');
            expect(result.stdout).toMatchSnapshot();
          } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        });
      });
    });
  });
});
