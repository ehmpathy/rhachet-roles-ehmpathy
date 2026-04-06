import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

import { type Scene, writeSceneGhMock } from './.test/infra/mockGh';

/**
 * .what = p3 journey tests: scene.7 - on main branch, --from feat-branch
 * .why = exhaustive coverage of feat → main flow when invoked from main
 * .spec.tree = git.release.spec.tree.md
 * .note = if test cases diverge from spec tree, update the tree or fix the tests
 */

// all tests use mocked gh CLI, so no remote calls - 5s timeout is plenty
jest.setTimeout(5000);

// ============================================================================
// test infrastructure
// ============================================================================

const SKILL_PATH = path.join(
  __dirname,
  '../../../../../dist/domain.roles/mechanic/skills/git.release/git.release.sh',
);

const asTimeStable = (output: string): string => {
  return output
    .replace(/\d+s in action/g, 'Xs in action')
    .replace(/\d+s watched/g, 'Xs watched')
    .replace(/\d+m\s*\d+s/g, 'Xm Ys')
    .replace(/(\d+)s delay/g, 'Xs delay');
};

const setupScene = (input: {
  scene: Scene;
  slug: string;
}): { tempDir: string; fakeBinDir: string; cleanup: () => void } => {
  const tempDir = genTempDir({ slug: input.slug, git: true });
  const fakeBinDir = path.join(tempDir, '.fakebin');
  fs.mkdirSync(fakeBinDir, { recursive: true });

  const stateDir = path.join(tempDir, '.mock-state');
  fs.mkdirSync(stateDir, { recursive: true });

  // use shared mock infra
  writeSceneGhMock({
    scene: input.scene,
    mockBinDir: fakeBinDir,
    stateDir,
  });

  const rhachetMock = `#!/bin/bash
if [[ "$1" == "keyrack" && "$2" == "get" ]]; then
  echo '{"grant":{"key":{"secret":"mock-github-token"}}}'
  exit 0
fi
echo "mock: unhandled rhachet $*" >&2
exit 1
`;
  const nodeModulesBinDir = path.join(tempDir, 'node_modules', '.bin');
  fs.mkdirSync(nodeModulesBinDir, { recursive: true });
  fs.writeFileSync(path.join(nodeModulesBinDir, 'rhachet'), rhachetMock, {
    mode: 0o755,
  });
  fs.writeFileSync(path.join(fakeBinDir, 'rhachet'), rhachetMock, {
    mode: 0o755,
  });

  configureTestGitUser({ cwd: tempDir });
  spawnSync(
    'git',
    ['remote', 'add', 'origin', 'https://github.com/test/repo'],
    { cwd: tempDir },
  );
  spawnSync(
    'git',
    ['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main'],
    { cwd: tempDir },
  );

  spawnSync('git', ['tag', 'v1.2.3'], { cwd: tempDir });

  // scene 7: always on main branch
  spawnSync('git', ['branch', '-M', 'main'], { cwd: tempDir });

  const meterDir = path.join(tempDir, '.meter');
  fs.mkdirSync(meterDir, { recursive: true });
  fs.writeFileSync(
    path.join(meterDir, 'git.commit.uses.jsonc'),
    JSON.stringify({ uses: 'infinite', push: 'allow', stage: 'allow' }),
  );

  return {
    tempDir,
    fakeBinDir,
    cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }),
  };
};

const runSkill = (
  args: string[],
  env: { tempDir: string; fakeBinDir: string },
): { stdout: string; stderr: string; status: number } => {
  const result = spawnSync('bash', [SKILL_PATH, ...args], {
    cwd: env.tempDir,
    env: {
      ...process.env,
      PATH: `${env.fakeBinDir}:${process.env.PATH}`,
      TERM: 'dumb',
      HOME: env.tempDir,
      EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token',
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
// scene.7: on main branch, --from feat-branch
// ============================================================================

describe('git.release.p3.scenes.on_main.from_feat', () => {
  describe('scene.7: on main branch, --from feat-branch', () => {
    // always pass --from turtle/feature-x since we're on main
    const featBranch = 'turtle/feature-x';

    // ========================================================================
    // row 1-3: unfound
    // ========================================================================
    given('[row-1] feat PR: unfound', () => {
      const scene: Scene = { branch: 'main', featPr: 'unfound' };

      when('[plan] --from feat-branch', () => {
        then('exit 2: crickets, hint push', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-unfound-plan',
          });
          try {
            const result = runSkill(['--from', featBranch], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('crickets');
            expect(result.stdout).toContain('no open branch pr');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --from feat-branch --watch', () => {
        then('exit 2: crickets, hint push', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-unfound-watch',
          });
          try {
            const result = runSkill(['--from', featBranch, '--watch'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('crickets');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --from feat-branch --apply', () => {
        then('exit 2: crickets, hint push', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-unfound-apply',
          });
          try {
            const result = runSkill(['--from', featBranch, '--apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('crickets');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ========================================================================
    // row 4-6: inflight
    // ========================================================================
    given('[row-4] feat PR: inflight', () => {
      when('[plan] --from feat-branch', () => {
        then('exit 0: show progress', () => {
          const scene: Scene = { branch: 'main', featPr: 'inflight' };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-inflight-plan',
          });
          try {
            const result = runSkill(['--from', featBranch], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('in progress');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --from feat-branch --watch with transitions', () => {
        then('watch cycles then result', () => {
          const scene: Scene = {
            branch: 'main',
            featPr: 'inflight',
            transitions: true,
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-inflight-watch',
          });
          try {
            const result = runSkill(['--from', featBranch, '--watch'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('in progress');
            expect(result.stdout).toContain("let's watch");
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --from feat-branch --apply with transitions', () => {
        then('watch cycles then merged', () => {
          const scene: Scene = {
            branch: 'main',
            featPr: 'inflight',
            transitions: true,
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-inflight-apply',
          });
          try {
            const result = runSkill(['--from', featBranch, '--apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('in progress');
            expect(result.stdout).toContain("let's watch");
            expect(result.stdout).toContain('done!');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ========================================================================
    // row 7-9: passed:wout-automerge
    // ========================================================================
    given('[row-7] feat PR: passed:wout-automerge', () => {
      const scene: Scene = { branch: 'main', featPr: 'passed:wout-automerge' };

      when('[plan] --from feat-branch', () => {
        then('exit 0: passed, hint apply', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-passed-wout-plan',
          });
          try {
            const result = runSkill(['--from', featBranch], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('all checks passed');
            expect(result.stdout).toContain('automerge unfound');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --from feat-branch --watch', () => {
        then('exit 0: passed (no watch needed)', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-passed-wout-watch',
          });
          try {
            const result = runSkill(['--from', featBranch, '--watch'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('all checks passed');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --from feat-branch --apply', () => {
        then('exit 0: automerge added then merged', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-passed-wout-apply',
          });
          try {
            const result = runSkill(['--from', featBranch, '--apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('automerge enabled');
            expect(result.stdout).toContain('added');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ========================================================================
    // row 10-12: passed:with-automerge
    // ========================================================================
    given('[row-10] feat PR: passed:with-automerge', () => {
      const scene: Scene = { branch: 'main', featPr: 'passed:with-automerge' };

      when('[plan] --from feat-branch', () => {
        then('exit 0: passed, automerge found', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-passed-with-plan',
          });
          try {
            const result = runSkill(['--from', featBranch], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('all checks passed');
            expect(result.stdout).toContain('automerge enabled');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --from feat-branch --watch', () => {
        then('exit 0: watch then merged', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-passed-with-watch',
          });
          try {
            const result = runSkill(['--from', featBranch, '--watch'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('all checks passed');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --from feat-branch --apply', () => {
        then('exit 0: automerge found then merged', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-passed-with-apply',
          });
          try {
            const result = runSkill(['--from', featBranch, '--apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('automerge enabled');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ========================================================================
    // row 13-15: failed
    // ========================================================================
    given('[row-13] feat PR: failed', () => {
      const scene: Scene = { branch: 'main', featPr: 'failed' };

      when('[plan] --from feat-branch', () => {
        then('exit 2: failed, hint retry', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-failed-plan',
          });
          try {
            const result = runSkill(['--from', featBranch], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('failed');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --from feat-branch --watch', () => {
        then('exit 2: failed, hint retry', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-failed-watch',
          });
          try {
            const result = runSkill(['--from', featBranch, '--watch'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('failed');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --from feat-branch --apply', () => {
        then('exit 2: failed, hint retry', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-failed-apply',
          });
          try {
            const result = runSkill(['--from', featBranch, '--apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('failed');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ========================================================================
    // row 16-18: failed with --retry
    // ========================================================================
    given('[row-16] feat PR: failed with --retry', () => {
      when('[plan+retry] --from feat-branch --retry', () => {
        then('exit 0: rerun triggered (informational)', () => {
          const scene: Scene = {
            branch: 'main',
            featPr: 'failed',
            enableRetry: true,
            retrySucceeds: false, // retry triggers but checks still fail
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-failed-retry-plan',
          });
          try {
            const result = runSkill(['--from', featBranch, '--retry'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('rerun');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            // plan mode with --retry triggers rerun and exits 0 (informational)
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch+retry] --from feat-branch --retry --watch', () => {
        then('exit 2: rerun triggered then watch', () => {
          const scene: Scene = {
            branch: 'main',
            featPr: 'failed',
            enableRetry: true,
            retrySucceeds: false, // retry triggers but checks still fail
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-failed-retry-watch',
          });
          try {
            const result = runSkill(
              ['--from', featBranch, '--retry', '--watch'],
              {
                tempDir,
                fakeBinDir,
              },
            );
            expect(result.stdout).toContain('rerun');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply+retry] --from feat-branch --retry --apply', () => {
        then('exit 2: rerun triggered then apply', () => {
          const scene: Scene = {
            branch: 'main',
            featPr: 'failed',
            enableRetry: true,
            retrySucceeds: false, // retry triggers but checks still fail
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-failed-retry-apply',
          });
          try {
            const result = runSkill(
              ['--from', featBranch, '--retry', '--apply'],
              {
                tempDir,
                fakeBinDir,
              },
            );
            expect(result.stdout).toContain('rerun');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ========================================================================
    // row 19-21: rebase:behind
    // ========================================================================
    given('[row-19] feat PR: rebase:behind', () => {
      const scene: Scene = { branch: 'main', featPr: 'rebase:behind' };

      when('[plan] --from feat-branch', () => {
        then('exit 2: needs rebase', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-rebase-behind-plan',
          });
          try {
            const result = runSkill(['--from', featBranch], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('needs rebase');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --from feat-branch --watch', () => {
        then('exit 2: needs rebase', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-rebase-behind-watch',
          });
          try {
            const result = runSkill(['--from', featBranch, '--watch'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('needs rebase');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --from feat-branch --apply', () => {
        then('exit 2: needs rebase', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-rebase-behind-apply',
          });
          try {
            const result = runSkill(['--from', featBranch, '--apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('needs rebase');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ========================================================================
    // row 22-24: rebase:dirty
    // ========================================================================
    given('[row-22] feat PR: rebase:dirty', () => {
      const scene: Scene = { branch: 'main', featPr: 'rebase:dirty' };

      when('[plan] --from feat-branch', () => {
        then('exit 2: needs rebase with conflicts', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-rebase-dirty-plan',
          });
          try {
            const result = runSkill(['--from', featBranch], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('needs rebase');
            expect(result.stdout).toContain('conflict');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --from feat-branch --watch', () => {
        then('exit 2: needs rebase with conflicts', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-rebase-dirty-watch',
          });
          try {
            const result = runSkill(['--from', featBranch, '--watch'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('needs rebase');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --from feat-branch --apply', () => {
        then('exit 2: needs rebase with conflicts', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-rebase-dirty-apply',
          });
          try {
            const result = runSkill(['--from', featBranch, '--apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('needs rebase');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ========================================================================
    // row 25-27: merged
    // ========================================================================
    given('[row-25] feat PR: merged', () => {
      const scene: Scene = { branch: 'main', featPr: 'merged' };

      when('[plan] --from feat-branch', () => {
        then('exit 0: already merged', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-merged-plan',
          });
          try {
            const result = runSkill(['--from', featBranch], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('already merged');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --from feat-branch --watch', () => {
        then('exit 0: already merged', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-merged-watch',
          });
          try {
            const result = runSkill(['--from', featBranch, '--watch'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('already merged');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --from feat-branch --apply', () => {
        then('exit 0: already merged', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s7-merged-apply',
          });
          try {
            const result = runSkill(['--from', featBranch, '--apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('already merged');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });
  });
});
