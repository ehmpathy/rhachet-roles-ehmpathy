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
 * .what = run git.branch.rebase.begin skill
 * .why = execute skill and capture output
 */
const runSkill = (
  tempDir: string,
  args: string[] = [],
  options: { globalBlocker?: boolean } = {},
): { stdout: string; stderr: string; status: number | null } => {
  // isolate HOME: begin reads the host-wide commit blocker under HOME, so a
  // blocker on the host must never leak into a case
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'git-rebase-home-'));
  if (options.globalBlocker) {
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
      JSON.stringify({ blocked: true }),
    );
  }
  const result = spawnSync('bash', [SKILL_PATH, ...args], {
    cwd: tempDir,
    encoding: 'utf-8',
    env: {
      ...process.env,
      PATH: process.env.PATH,
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
  // .note = cases 1, 2, 3, 7 and 9 hold no origin remote, so each meets the
  //         fetch failure; the real preview, conflict and up-to-date renders
  //         are pinned against a real origin in the unstaged and acceptance suites
  given(
    '[case1] feature branch ahead and behind, no origin remote to fetch',
    () => {
      when('[t0] plan mode (default)', () => {
        then(
          'the fetch fails as a malfunction, exit 1, and the retry keeps plan mode',
          () => {
            const tempDir = setupRebaseScenario({
              commitsAhead: 3,
              commitsBehind: 2,
              grantHeld: true,
            });

            try {
              const result = runSkill(tempDir);

              expect(result.status).toBe(1);
              expect(result.stdout).toContain(
                '💥 MalfunctionError: failed to fetch origin/main',
              );
              expect(result.stdout).toContain(
                'rhx git.branch.rebase begin --mode plan',
              );
              expect(result.stderr).toContain('MalfunctionError');
              expect(result.stdout).toMatchSnapshot();
            } finally {
              fs.rmSync(tempDir, { recursive: true, force: true });
            }
          },
        );
      });
    },
  );

  given(
    '[case2] feature branch ready to rebase, no origin remote to fetch',
    () => {
      when('[t0] apply mode attempts rebase', () => {
        then(
          'the fetch fails as a malfunction, exit 1, and the retry keeps apply mode',
          () => {
            const tempDir = setupRebaseScenario({
              commitsAhead: 2,
              commitsBehind: 0,
              grantHeld: true,
            });

            try {
              const result = runSkill(tempDir, ['--mode', 'apply']);

              expect(result.status).toBe(1);
              expect(result.stdout).toContain(
                '💥 MalfunctionError: failed to fetch origin/main',
              );
              expect(result.stdout).toContain(
                'rhx git.branch.rebase begin --mode apply',
              );
              expect(result.stderr).toContain('MalfunctionError');
              expect(result.stdout).toMatchSnapshot();
            } finally {
              fs.rmSync(tempDir, { recursive: true, force: true });
            }
          },
        );
      });
    },
  );

  given('[case3] branches that conflict, no origin remote to fetch', () => {
    when('[t0] apply mode', () => {
      then(
        'the fetch fails before the rebase starts, exit 1, branch untouched',
        () => {
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
          fs.writeFileSync(
            path.join(tempDir, 'conflict.txt'),
            'main version\n',
          );
          spawnSync('git', ['add', 'conflict.txt'], { cwd: tempDir });
          spawnSync('git', ['commit', '-m', 'fix: main conflict file'], {
            cwd: tempDir,
          });
          spawnSync('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD'], {
            cwd: tempDir,
          });
          spawnSync('git', ['checkout', 'feature/test-branch'], {
            cwd: tempDir,
          });

          try {
            const result = runSkill(tempDir, ['--mode', 'apply']);

            expect(result.status).toBe(1);
            expect(result.stdout).toContain(
              '💥 MalfunctionError: failed to fetch origin/main',
            );
            expect(
              fs.existsSync(path.join(tempDir, '.git', 'rebase-merge')),
            ).toBe(false);
            expect(result.stdout).toMatchSnapshot();
          } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        },
      );
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
            grantHeld: true,
            usesLeft: 0,
          });

          try {
            const result = runSkill(tempDir, ['--mode', 'apply']);

            // the grant gate passes; the fetch then fails here (no real remote)
            expect(result.stdout).not.toContain('no commit uses left');
            expect(result.stdout).not.toContain('no commit grant');
            expect(result.stdout).not.toContain('ConstraintError');
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
          expect(result.stdout).toContain('hold up dude');
          expect(result.stdout).toContain('unstaged');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case7] branch already up to date, no origin remote to fetch', () => {
    when('[t0] attempt rebase', () => {
      then(
        'the fetch fails as a malfunction, exit 1, before the up-to-date check',
        () => {
          const tempDir = setupRebaseScenario({
            commitsAhead: 0,
            commitsBehind: 0,
            grantHeld: true,
          });

          try {
            const result = runSkill(tempDir);

            expect(result.status).toBe(1);
            expect(result.stdout).toContain(
              '💥 MalfunctionError: failed to fetch origin/main',
            );
            expect(result.stdout).toMatchSnapshot();
          } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        },
      );
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

          // past the uses check, the fetch fails: this repo holds no origin remote
          expect(result.status).toBe(1);
          expect(result.stdout).toContain('failed to fetch origin/main');
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

          // past the uses check, the fetch fails: this repo holds no origin remote
          expect(result.status).toBe(1);
          expect(result.stdout).toContain('failed to fetch origin/main');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case10] no commit quota file', () => {
    when('[t0] attempt rebase', () => {
      then(
        'it refuses as a constraint, exit 2, and names the grant command',
        () => {
          const tempDir = setupRebaseScenario({
            commitsAhead: 2,
            grantHeld: true,
          });
          fs.rmSync(path.join(tempDir, '.meter'), {
            recursive: true,
            force: true,
          });

          try {
            const result = runSkill(tempDir);

            expect(result.status).toBe(2);
            expect(result.stdout).toContain(
              '✋ ConstraintError: no commit quota set',
            );
            expect(result.stdout).toContain(
              'rhx git.commit.uses set --quant N --push allow',
            );
            expect(result.stderr).toContain('ConstraintError');
            expect(result.stdout).toMatchSnapshot();
          } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        },
      );
    });
  });

  given('[case11] push allowed but no commit uses left', () => {
    when('[t0] apply mode', () => {
      then(
        'it refuses as a constraint, exit 2, and names the grant command',
        () => {
          const tempDir = setupRebaseScenario({
            commitsAhead: 2,
            grantHeld: true,
          });
          fs.writeFileSync(
            path.join(tempDir, '.meter', 'git.commit.uses.jsonc'),
            JSON.stringify({ uses: 0, push: 'allow' }, null, 2),
          );

          try {
            const result = runSkill(tempDir, ['--mode', 'apply']);

            expect(result.status).toBe(2);
            expect(result.stdout).toContain(
              '✋ ConstraintError: no commit uses left',
            );
            expect(result.stdout).toContain(
              'rhx git.commit.uses set --quant N --push allow',
            );
            expect(result.stderr).toContain('ConstraintError');
            expect(result.stdout).toMatchSnapshot();
          } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        },
      );
    });
  });

  given('[case12] origin holds neither main nor master', () => {
    when('[t0] attempt rebase', () => {
      then('it fails as a malfunction, exit 1, on both streams', () => {
        const tempDir = setupRebaseScenario({
          commitsAhead: 2,
          grantHeld: true,
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
          expect(result.stderr).toContain('MalfunctionError');
          expect(result.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case13] the fetch fails under --unstaged ignore', () => {
    when('[t0] apply mode with --unstaged ignore and a dirty tree', () => {
      then(
        'it fails before any path is set aside, and the retry keeps --unstaged ignore',
        () => {
          const tempDir = setupRebaseScenario({
            commitsAhead: 2,
            grantHeld: true,
            dirtyWorkTree: true,
          });

          try {
            const result = runSkill(tempDir, [
              '--mode',
              'apply',
              '--unstaged',
              'ignore',
            ]);

            expect(result.status).toBe(1);
            expect(result.stdout).toContain(
              '💥 MalfunctionError: failed to fetch origin/main',
            );
            expect(result.stdout).toContain(
              'rhx git.branch.rebase begin --mode apply --unstaged ignore',
            );
            expect(
              fs.readFileSync(path.join(tempDir, 'README.md'), 'utf-8'),
            ).toEqual('# Test Repo\n\nmodified content\n');
            expect(
              fs.existsSync(
                path.join(tempDir, '.git', 'git.branch.rebase.aside'),
              ),
            ).toBe(false);
            expect(result.stderr).toContain('MalfunctionError');
            expect(result.stdout).toMatchSnapshot();
          } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        },
      );
    });
  });

  given('[case14] an invalid --mode', () => {
    // one when per shape: a wrong value, and the flag with no value
    [
      { slug: 'a bogus value', args: ['--mode', 'bogus'] },
      { slug: 'no value', args: ['--mode'] },
    ].forEach((variant, index) => {
      when(`[t${index}] --mode with ${variant.slug}`, () => {
        then(
          'it refuses before any act, exit 2, names the valid values, on both streams',
          () => {
            const tempDir = setupRebaseScenario({
              commitsAhead: 2,
              grantHeld: true,
            });

            try {
              const result = runSkill(tempDir, variant.args);

              expect(result.status).toBe(2);
              expect(result.stdout).toContain('✋ ConstraintError');
              expect(result.stdout).toContain('--mode');
              expect(result.stdout).toContain('plan');
              expect(result.stdout).toContain('apply');
              expect(result.stderr).toContain('ConstraintError');
              expect(result.stdout).toMatchSnapshot();
            } finally {
              fs.rmSync(tempDir, { recursive: true, force: true });
            }
          },
        );
      });
    });
  });
});