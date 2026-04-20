import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

import { type Scene, writeSceneGhMock } from './.test/infra/mockGh';

/**
 * .what = p3 journey tests: scene.5 - on main branch, --into prod (default)
 * .why = exhaustive coverage of main → prod flow per spec tree
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
  enableRetry?: boolean;
}): { tempDir: string; fakeBinDir: string; cleanup: () => void } => {
  const tempDir = genTempDir({ slug: input.slug, git: true });
  const fakeBinDir = path.join(tempDir, '.fakebin');
  fs.mkdirSync(fakeBinDir, { recursive: true });

  const stateDir = path.join(tempDir, '.mock-state');
  fs.mkdirSync(stateDir, { recursive: true });

  writeSceneGhMock({
    scene: { ...input.scene, enableRetry: input.enableRetry },
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

  // create a release tag (must match releaseTag in genGhMockExecutable)
  spawnSync('git', ['tag', 'v1.3.0'], { cwd: tempDir });

  // setup main branch
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
// scene.5: on main branch, --into prod (default)
// ============================================================================

describe('git.release.p3.scenes.on_main.into_prod', () => {
  describe('scene.5: on main, into prod', () => {
    // ========================================================================
    // rows 1-3: release PR unfound
    // ========================================================================
    given('[row-1] release PR: unfound', () => {
      const scene: Scene = { branch: 'main', releasePr: 'unfound' };

      when('[plan] no flags', () => {
        then('exit 0: no release PR found', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-unfound-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('no open release pr');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --watch', () => {
        then('exit 0: no release PR found', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-unfound-watch',
          });
          try {
            const result = runSkill(['--watch'], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('no open release pr');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --apply', () => {
        then('exit 0: no release PR found', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-unfound-apply',
          });
          try {
            const result = runSkill(['--apply'], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('no open release pr');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ========================================================================
    // rows 2a-2c: release PR unfound + tags:inflight
    // ========================================================================
    given('[row-2a] release PR: unfound + tags:inflight', () => {
      const scene: Scene = {
        branch: 'main',
        releasePr: 'unfound',
        tagWorkflows: 'inflight',
      };

      when('[plan] no flags', () => {
        then('exit 0: no release PR, tags inflight', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-unfound-tags-inflight-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('no open release pr');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --watch', () => {
        then('exit 1: no release PR (poll timeout)', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-unfound-tags-inflight-watch',
          });
          try {
            const result = runSkill(['--watch'], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('no open release pr');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            // exit 1 = malfunction (timeout while polling)
            expect(result.status).toEqual(1);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --apply', () => {
        then('exit 1: no release PR (poll timeout)', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-unfound-tags-inflight-apply',
          });
          try {
            const result = runSkill(['--apply'], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('no open release pr');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            // exit 1 = malfunction (timeout while polling)
            expect(result.status).toEqual(1);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ========================================================================
    // rows 2d-2f: release PR unfound + tags:failed
    // ========================================================================
    given('[row-2d] release PR: unfound + tags:failed', () => {
      const scene: Scene = {
        branch: 'main',
        releasePr: 'unfound',
        tagWorkflows: 'failed',
      };

      when('[plan] no flags', () => {
        then('exit 0: no release PR, tags failed', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-unfound-tags-failed-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('no open release pr');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --watch', () => {
        then('exit 2: no release PR (no target to watch)', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-unfound-tags-failed-watch',
          });
          try {
            const result = runSkill(['--watch'], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('no open release pr');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --apply', () => {
        then('exit 2: no release PR (no target to apply)', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-unfound-tags-failed-apply',
          });
          try {
            const result = runSkill(['--apply'], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('no open release pr');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ========================================================================
    // rows 4-6: release PR inflight
    // ========================================================================
    given('[row-4] release PR: inflight', () => {
      when('[plan] no flags', () => {
        then('exit 0: show progress', () => {
          const scene: Scene = { branch: 'main', releasePr: 'inflight' };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-inflight-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('in progress');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --watch with transitions', () => {
        then('exit 0: watch cycles then passed', () => {
          const scene: Scene = {
            branch: 'main',
            releasePr: 'inflight',
            transitions: true,
            tagWorkflows: 'passed',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-inflight-watch',
          });
          try {
            const result = runSkill(['--watch'], { tempDir, fakeBinDir });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            // should watch and pass, but no automerge so won't merge
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --apply with transitions', () => {
        then('exit 0: watch, merge, then tags', () => {
          const scene: Scene = {
            branch: 'main',
            releasePr: 'inflight',
            transitions: true,
            tagWorkflows: 'passed',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-inflight-apply',
          });
          try {
            const result = runSkill(['--apply'], { tempDir, fakeBinDir });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ========================================================================
    // rows 7-9: release PR inflight:with-automerge
    // ========================================================================
    given('[row-7] release PR: inflight:with-automerge', () => {
      const scene: Scene = {
        branch: 'main',
        releasePr: 'inflight:with-automerge',
      };

      when('[plan] no flags', () => {
        then('exit 0: inflight, automerge found', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-inflight-with-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('in progress');
            expect(result.stdout).toContain('automerge');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --watch with transitions', () => {
        then('exit 0: watch to passed, automerge found', () => {
          const sceneWithTransition: Scene = {
            ...scene,
            transitions: true,
            tagWorkflows: 'passed',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: sceneWithTransition,
            slug: 'p3-s5-rpr-inflight-with-watch',
          });
          try {
            const result = runSkill(['--watch'], { tempDir, fakeBinDir });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --apply with transitions', () => {
        then(
          'exit 0: watch to merged (automerge already found), then tags',
          () => {
            const sceneWithTags: Scene = {
              ...scene,
              transitions: true,
              tagWorkflows: 'passed',
            };
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene: sceneWithTags,
              slug: 'p3-s5-rpr-inflight-with-apply',
            });
            try {
              const result = runSkill(['--apply'], { tempDir, fakeBinDir });
              expect(asTimeStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          },
        );
      });
    });

    // ========================================================================
    // rows 10-12: release PR passed:wout-automerge
    // ========================================================================
    given('[row-10] release PR: passed:wout-automerge', () => {
      const scene: Scene = {
        branch: 'main',
        releasePr: 'passed:wout-automerge',
      };

      when('[plan] no flags', () => {
        then('exit 0: passed, hint apply', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-passed-wout-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('passed');
            expect(result.stdout).toContain('automerge');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --watch', () => {
        then('exit 0: passed (no watch needed)', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-passed-wout-watch',
          });
          try {
            const result = runSkill(['--watch'], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('passed');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --apply', () => {
        then('exit 0: automerge added, merged', () => {
          const sceneApply: Scene = {
            branch: 'main',
            releasePr: 'passed:wout-automerge',
            tagWorkflows: 'passed',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: sceneApply,
            slug: 'p3-s5-rpr-passed-wout-apply',
          });
          try {
            const result = runSkill(['--apply'], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('automerge');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ========================================================================
    // rows 10-12: release PR passed:with-automerge
    // ========================================================================
    given('[row-10] release PR: passed:with-automerge', () => {
      when('[plan] no flags', () => {
        then('exit 0: passed, automerge found', () => {
          const scene: Scene = {
            branch: 'main',
            releasePr: 'passed:with-automerge',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-passed-with-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('passed');
            expect(result.stdout).toContain('automerge');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --watch', () => {
        then('exit 0: watch then merged', () => {
          const scene: Scene = {
            branch: 'main',
            releasePr: 'passed:with-automerge',
            tagWorkflows: 'passed',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-passed-with-watch',
          });
          try {
            const result = runSkill(['--watch'], { tempDir, fakeBinDir });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --apply', () => {
        then('exit 0: automerge found, merged', () => {
          const scene: Scene = {
            branch: 'main',
            releasePr: 'passed:with-automerge',
            tagWorkflows: 'passed',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-passed-with-apply',
          });
          try {
            const result = runSkill(['--apply'], { tempDir, fakeBinDir });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ========================================================================
    // rows 13-15: release PR failed
    // ========================================================================
    given('[row-13] release PR: failed', () => {
      const scene: Scene = { branch: 'main', releasePr: 'failed' };

      when('[plan] no flags', () => {
        then('exit 2: failed, hint retry', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-failed-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('failed');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --watch', () => {
        then('exit 2: failed, hint retry', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-failed-watch',
          });
          try {
            const result = runSkill(['--watch'], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('failed');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --apply', () => {
        then('exit 2: failed, hint retry', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-failed-apply',
          });
          try {
            const result = runSkill(['--apply'], { tempDir, fakeBinDir });
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
    // rows 16-18: release PR rebase:behind
    // ========================================================================
    given('[row-16] release PR: rebase:behind', () => {
      const scene: Scene = { branch: 'main', releasePr: 'rebase:behind' };

      when('[plan] no flags', () => {
        then('exit 2: needs rebase', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-rebase-behind-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('rebase');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --watch', () => {
        then('exit 2: needs rebase', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-rebase-behind-watch',
          });
          try {
            const result = runSkill(['--watch'], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('rebase');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --apply', () => {
        then('exit 2: needs rebase', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-rebase-behind-apply',
          });
          try {
            const result = runSkill(['--apply'], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('rebase');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ========================================================================
    // rows 19-21: release PR rebase:dirty
    // ========================================================================
    given('[row-19] release PR: rebase:dirty', () => {
      const scene: Scene = { branch: 'main', releasePr: 'rebase:dirty' };

      when('[plan] no flags', () => {
        then('exit 2: needs rebase with conflicts', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-rebase-dirty-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('rebase');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --watch', () => {
        then('exit 2: needs rebase with conflicts', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-rebase-dirty-watch',
          });
          try {
            const result = runSkill(['--watch'], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('rebase');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --apply', () => {
        then('exit 2: needs rebase with conflicts', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-rebase-dirty-apply',
          });
          try {
            const result = runSkill(['--apply'], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('rebase');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ========================================================================
    // rows 22-24: release PR merged, tags unfound
    // ========================================================================
    given('[row-22] release PR: merged, tags: unfound', () => {
      const scene: Scene = {
        branch: 'main',
        releasePr: 'merged',
        tagWorkflows: 'unfound',
      };

      when('[plan] no flags', () => {
        then('exit 0: merged, no tag workflows', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-merged-tags-unfound-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('merged');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --watch', () => {
        then('exit 0: merged, no tag workflows', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-merged-tags-unfound-watch',
          });
          try {
            const result = runSkill(['--watch'], { tempDir, fakeBinDir });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --apply', () => {
        then('exit 0: merged, no tag workflows', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-merged-tags-unfound-apply',
          });
          try {
            const result = runSkill(['--apply'], { tempDir, fakeBinDir });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ========================================================================
    // rows 25-27: release PR merged, tags inflight
    // ========================================================================
    given('[row-25] release PR: merged, tags: inflight', () => {
      when('[plan] no flags', () => {
        then('exit 0: merged, tag workflows in progress', () => {
          const scene: Scene = {
            branch: 'main',
            releasePr: 'merged',
            tagWorkflows: 'inflight',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-merged-tags-inflight-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('merged');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --watch with transitions', () => {
        then('exit 0: watch tag workflows', () => {
          const scene: Scene = {
            branch: 'main',
            releasePr: 'merged',
            tagWorkflows: 'inflight',
            transitions: true,
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-merged-tags-inflight-watch',
          });
          try {
            const result = runSkill(['--watch'], { tempDir, fakeBinDir });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --apply with transitions', () => {
        then('exit 0: watch tag workflows', () => {
          const scene: Scene = {
            branch: 'main',
            releasePr: 'merged',
            tagWorkflows: 'inflight',
            transitions: true,
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-merged-tags-inflight-apply',
          });
          try {
            const result = runSkill(['--apply'], { tempDir, fakeBinDir });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ========================================================================
    // rows 28-30: release PR merged, tags passed
    // ========================================================================
    given('[row-28] release PR: merged, tags: passed', () => {
      const scene: Scene = {
        branch: 'main',
        releasePr: 'merged',
        tagWorkflows: 'passed',
      };

      when('[plan] no flags', () => {
        then('exit 0: all done', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-merged-tags-passed-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --watch', () => {
        then('exit 0: all done', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-merged-tags-passed-watch',
          });
          try {
            const result = runSkill(['--watch'], { tempDir, fakeBinDir });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --apply', () => {
        then('exit 0: all done', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-merged-tags-passed-apply',
          });
          try {
            const result = runSkill(['--apply'], { tempDir, fakeBinDir });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ========================================================================
    // rows 31-33: release PR merged, tags failed
    // ========================================================================
    given('[row-31] release PR: merged, tags: failed', () => {
      const scene: Scene = {
        branch: 'main',
        releasePr: 'merged',
        tagWorkflows: 'failed',
      };

      when('[plan] no flags', () => {
        then('exit 0: informational (tags failed)', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-merged-tags-failed-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            // plan mode for tags is informational
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --watch', () => {
        then('exit 2: tags failed', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-merged-tags-failed-watch',
          });
          try {
            const result = runSkill(['--watch'], { tempDir, fakeBinDir });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --apply', () => {
        then('exit 2: tags failed', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-merged-tags-failed-apply',
          });
          try {
            const result = runSkill(['--apply'], { tempDir, fakeBinDir });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ========================================================================
    // retry tests: release PR failed
    // ========================================================================
    given('[retry] release PR: failed', () => {
      when('[plan+retry] --retry', () => {
        then('exit 0: failed, rerun triggered (informational)', () => {
          const scene: Scene = {
            branch: 'main',
            releasePr: 'failed',
            enableRetry: true,
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-failed-retry-plan',
            enableRetry: true,
          });
          try {
            const result = runSkill(['--retry'], { tempDir, fakeBinDir });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            // plan mode with retry is informational (rerun triggered)
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch+retry] --watch --retry', () => {
        then('exit 2: failed, rerun triggered', () => {
          const scene: Scene = {
            branch: 'main',
            releasePr: 'failed',
            enableRetry: true,
            retrySucceeds: false, // retry triggers but checks still fail
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-failed-retry-watch',
            enableRetry: true,
          });
          try {
            const result = runSkill(['--watch', '--retry'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply+retry] --apply --retry', () => {
        then('exit 2: failed, rerun triggered', () => {
          const scene: Scene = {
            branch: 'main',
            releasePr: 'failed',
            enableRetry: true,
            retrySucceeds: false, // retry triggers but checks still fail
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-failed-retry-apply',
            enableRetry: true,
          });
          try {
            const result = runSkill(['--apply', '--retry'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ========================================================================
    // retry tests: tags failed
    // ========================================================================
    given('[retry] release PR: merged, tags: failed', () => {
      when('[plan+retry] --retry', () => {
        then('exit 0: merged, tags failed, rerun triggered', () => {
          const scene: Scene = {
            branch: 'main',
            releasePr: 'merged',
            tagWorkflows: 'failed',
            enableRetry: true,
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-merged-tags-failed-retry-plan',
            enableRetry: true,
          });
          try {
            const result = runSkill(['--retry'], { tempDir, fakeBinDir });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            // plan mode with retry is informational
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch+retry] --watch --retry', () => {
        then('exit 2: merged, tags failed, rerun triggered', () => {
          const scene: Scene = {
            branch: 'main',
            releasePr: 'merged',
            tagWorkflows: 'failed',
            enableRetry: true,
            retrySucceeds: false, // retry triggers but tag workflows still fail
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-merged-tags-failed-retry-watch',
            enableRetry: true,
          });
          try {
            const result = runSkill(['--watch', '--retry'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply+retry] --apply --retry', () => {
        then('exit 2: merged, tags failed, rerun triggered', () => {
          const scene: Scene = {
            branch: 'main',
            releasePr: 'merged',
            tagWorkflows: 'failed',
            transitions: true, // enable transition logic for retry watch
            enableRetry: true,
            retrySucceeds: false, // retry triggers but tag workflows still fail
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-rpr-merged-tags-failed-retry-apply',
            enableRetry: true,
          });
          try {
            const result = runSkill(['--apply', '--retry'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ========================================================================
    // edge case: no prior release found in last 21 PRs
    // THIS IS THE ONLY TEST THAT SHOULD SHOW "latest: not found in last 20 prs"
    // ========================================================================
    given('[edge] no prior release found', () => {
      const scene: Scene = {
        branch: 'main',
        releasePr: 'unfound', // no open release PR
        priorReleaseTitle: null, // no prior release PR found in history
      };

      when('[plan] no flags', () => {
        then('exit 0: shows "latest: not found" hint', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s5-edge-no-prior-release-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            // should show "not found in last 21 prs" hint
            expect(result.stdout).toContain('not found in last 21 prs');
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });
  });
});
