/**
 * .spec.tree = git.release.spec.tree.md
 * .note = scene 3: on feat branch, --from main (skips feat PR, releases from main)
 *         scene 4: --from main --into main (ConstraintError)
 *
 * scene 3 state enumeration (14 state rows × 3 modes = 42 base):
 * - release PR unfound (rows 1-3): no release PR, show latest tag
 * - release PR unfound + tags inflight (rows 2a-2c): no release PR, tag workflows in progress
 * - release PR unfound + tags failed (rows 2d-2f): no release PR, tag workflows failed
 * - release PR inflight (rows 4-6): checks in progress
 * - release PR inflight:with-automerge (rows 7-9): inflight with automerge enabled
 * - release PR passed:wout (rows 10-12): checks passed, no automerge
 * - release PR passed:with (rows 13-15): checks passed, automerge enabled
 * - release PR failed (rows 16-18): checks failed
 * - release PR rebase:behind (rows 19-21): needs rebase
 * - release PR rebase:dirty (rows 22-24): has conflicts
 * - release PR merged + tags (rows 25-36): 4 tag states × 3 modes = 12
 * - retry: failed (rows 16r-18r): 3 retry tests
 * - retry: tags failed (rows 34r-36r): 3 retry tests
 *
 * scene 3 total: 42 base + 6 retry = 48 snapshots
 *
 * scene 4: 1 error case = 1 snapshot
 *
 * total: 49 snapshots
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

import { type Scene, writeSceneGhMock } from './.test/infra/mockGh';

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
  scene: Omit<Scene, 'featPr'>;
  slug: string;
}): { tempDir: string; fakeBinDir: string; cleanup: () => void } => {
  const tempDir = genTempDir({ slug: input.slug, git: true });
  const fakeBinDir = path.join(tempDir, '.fakebin');
  fs.mkdirSync(fakeBinDir, { recursive: true });

  const stateDir = path.join(tempDir, '.mock-state');
  fs.mkdirSync(stateDir, { recursive: true });

  // --from main skips feat PR, so we set featPr: undefined
  writeSceneGhMock({
    scene: { ...input.scene, featPr: undefined },
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

  // setup feat branch (but --from main will skip it)
  spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], { cwd: tempDir });

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

const setupTempGitRepo = (slug: string): { tempDir: string } => {
  const tempDir = genTempDir({ slug, git: true });

  // configure git
  configureTestGitUser({ cwd: tempDir });
  spawnSync('git', ['checkout', '-b', 'main'], { cwd: tempDir });
  spawnSync('git', ['commit', '--allow-empty', '-m', 'initial'], {
    cwd: tempDir,
  });

  return { tempDir };
};

const runSkill = (
  args: string[],
  env: { tempDir: string; fakeBinDir?: string },
): { stdout: string; stderr: string; status: number } => {
  const result = spawnSync('bash', [SKILL_PATH, ...args], {
    cwd: env.tempDir,
    env: {
      ...process.env,
      PATH: env.fakeBinDir
        ? `${env.fakeBinDir}:${process.env.PATH}`
        : process.env.PATH,
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
// scene.3: on feat branch, --from main (skips feat PR)
// ============================================================================

describe('git.release.p3.scenes.on_feat.from_main', () => {
  describe('scene.3: on feat branch, --from main (skips feat PR)', () => {
    // ========================================================================
    // PART 1: release PR states (rows 1-21)
    // ========================================================================

    // ------------------------------------------------------------------------
    // rows 1-3: release PR unfound
    // ------------------------------------------------------------------------
    given('[row-1] release PR: unfound', () => {
      const scene: Scene = {
        branch: 'feat',
        releasePr: 'unfound',
      };

      when('[plan] --from main', () => {
        then('exit 0: no release PR found', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-unfound-plan',
          });
          try {
            const result = runSkill(['--from', 'main'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --from main --watch', () => {
        then('exit 0: no release PR found', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-unfound-watch',
          });
          try {
            const result = runSkill(['--from', 'main', '--watch'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --from main --apply', () => {
        then('exit 0: no release PR found', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-unfound-apply',
          });
          try {
            const result = runSkill(['--from', 'main', '--apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ------------------------------------------------------------------------
    // rows 2a-2c: release PR unfound + tags inflight
    // ------------------------------------------------------------------------
    given('[row-2a] release PR: unfound, tags: inflight', () => {
      const scene: Scene = {
        branch: 'feat',
        releasePr: 'unfound',
        tagWorkflows: 'inflight',
      };

      when('[plan] --from main', () => {
        then('exit 0: no release PR, tags inflight', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-unfound-tags-inflight-plan',
          });
          try {
            const result = runSkill(['--from', 'main'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --from main --watch', () => {
        then('exit 0: watch tags to completion', () => {
          const sceneWithTransition: Scene = {
            ...scene,
            transitions: true,
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: sceneWithTransition,
            slug: 'p3-s3-rpr-unfound-tags-inflight-watch',
          });
          try {
            const result = runSkill(['--from', 'main', '--watch'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --from main --apply', () => {
        then('exit 0: watch tags to completion', () => {
          const sceneWithTransition: Scene = {
            ...scene,
            transitions: true,
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: sceneWithTransition,
            slug: 'p3-s3-rpr-unfound-tags-inflight-apply',
          });
          try {
            const result = runSkill(['--from', 'main', '--apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ------------------------------------------------------------------------
    // rows 2d-2f: release PR unfound + tags failed
    // ------------------------------------------------------------------------
    given('[row-2d] release PR: unfound, tags: failed', () => {
      const scene: Scene = {
        branch: 'feat',
        releasePr: 'unfound',
        tagWorkflows: 'failed',
      };

      when('[plan] --from main', () => {
        then('exit 0: no release PR, tags failed (informational)', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-unfound-tags-failed-plan',
          });
          try {
            const result = runSkill(['--from', 'main'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --from main --watch', () => {
        then('exit 2: tags failed', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-unfound-tags-failed-watch',
          });
          try {
            const result = runSkill(['--from', 'main', '--watch'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            // tags failed = exit 2 (consistent with row-34 behavior)
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --from main --apply', () => {
        then('exit 2: tags failed', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-unfound-tags-failed-apply',
          });
          try {
            const result = runSkill(['--from', 'main', '--apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            // tags failed = exit 2 (consistent with row-34 behavior)
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ------------------------------------------------------------------------
    // rows 4-6: release PR inflight
    // ------------------------------------------------------------------------
    given('[row-4] release PR: inflight', () => {
      when('[plan] --from main', () => {
        then('exit 0: show progress', () => {
          const scene: Scene = {
            branch: 'feat',
            releasePr: 'inflight',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-inflight-plan',
          });
          try {
            const result = runSkill(['--from', 'main'], {
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

      when('[watch] --from main --watch with transitions', () => {
        then('exit 0: watch cycles then passed', () => {
          const scene: Scene = {
            branch: 'feat',
            releasePr: 'inflight',
            transitions: true,
            tagWorkflows: 'passed',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-inflight-watch',
          });
          try {
            const result = runSkill(['--from', 'main', '--watch'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --from main --apply with transitions', () => {
        then('exit 0: watch, merge, then tags', () => {
          const scene: Scene = {
            branch: 'feat',
            releasePr: 'inflight',
            transitions: true,
            tagWorkflows: 'passed',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-inflight-apply',
          });
          try {
            const result = runSkill(['--from', 'main', '--apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ------------------------------------------------------------------------
    // rows 7-9: release PR inflight:with-automerge
    // ------------------------------------------------------------------------
    given('[row-7] release PR: inflight:with-automerge', () => {
      const scene: Scene = {
        branch: 'feat',
        releasePr: 'inflight:with-automerge',
      };

      when('[plan] --from main', () => {
        then('exit 0: inflight, automerge found', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-inflight-with-plan',
          });
          try {
            const result = runSkill(['--from', 'main'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('in progress');
            expect(result.stdout).toContain('automerge');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --from main --watch', () => {
        then('exit 0: watch to passed, automerge found', () => {
          const sceneWithTransition: Scene = {
            ...scene,
            transitions: true,
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: sceneWithTransition,
            slug: 'p3-s3-rpr-inflight-with-watch',
          });
          try {
            const result = runSkill(['--from', 'main', '--watch'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --from main --apply', () => {
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
              slug: 'p3-s3-rpr-inflight-with-apply',
            });
            try {
              const result = runSkill(['--from', 'main', '--apply'], {
                tempDir,
                fakeBinDir,
              });
              expect(asTimeStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          },
        );
      });
    });

    // ------------------------------------------------------------------------
    // rows 10-12: release PR passed:wout-automerge
    // ------------------------------------------------------------------------
    given('[row-10] release PR: passed:wout-automerge', () => {
      const scene: Scene = {
        branch: 'feat',
        releasePr: 'passed:wout-automerge',
      };

      when('[plan] --from main', () => {
        then('exit 0: passed, hint apply', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-passed-wout-plan',
          });
          try {
            const result = runSkill(['--from', 'main'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('passed');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --from main --watch', () => {
        then('exit 0: passed (no watch needed)', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-passed-wout-watch',
          });
          try {
            const result = runSkill(['--from', 'main', '--watch'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --from main --apply', () => {
        then('exit 0: automerge added, merged, then tags', () => {
          const sceneWithTags: Scene = {
            ...scene,
            tagWorkflows: 'passed',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: sceneWithTags,
            slug: 'p3-s3-rpr-passed-wout-apply',
          });
          try {
            const result = runSkill(['--from', 'main', '--apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ------------------------------------------------------------------------
    // rows 13-15: release PR passed:with-automerge
    // ------------------------------------------------------------------------
    given('[row-13] release PR: passed:with-automerge', () => {
      const scene: Scene = {
        branch: 'feat',
        releasePr: 'passed:with-automerge',
      };

      when('[plan] --from main', () => {
        then('exit 0: passed, automerge found', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-passed-with-plan',
          });
          try {
            const result = runSkill(['--from', 'main'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('passed');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --from main --watch', () => {
        then('exit 0: watch then merged', () => {
          const sceneWithTags: Scene = {
            ...scene,
            tagWorkflows: 'passed',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: sceneWithTags,
            slug: 'p3-s3-rpr-passed-with-watch',
          });
          try {
            const result = runSkill(['--from', 'main', '--watch'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --from main --apply', () => {
        then('exit 0: automerge found, merged, then tags', () => {
          const sceneWithTags: Scene = {
            ...scene,
            tagWorkflows: 'passed',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: sceneWithTags,
            slug: 'p3-s3-rpr-passed-with-apply',
          });
          try {
            const result = runSkill(['--from', 'main', '--apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ------------------------------------------------------------------------
    // rows 16-18: release PR failed
    // ------------------------------------------------------------------------
    given('[row-16] release PR: failed', () => {
      const scene: Scene = {
        branch: 'feat',
        releasePr: 'failed',
      };

      when('[plan] --from main', () => {
        then('exit 2: failed, hint retry', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-failed-plan',
          });
          try {
            const result = runSkill(['--from', 'main'], {
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

      when('[watch] --from main --watch', () => {
        then('exit 2: failed, hint retry', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-failed-watch',
          });
          try {
            const result = runSkill(['--from', 'main', '--watch'], {
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

      when('[apply] --from main --apply', () => {
        then('exit 2: failed, hint retry', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-failed-apply',
          });
          try {
            const result = runSkill(['--from', 'main', '--apply'], {
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

    // ------------------------------------------------------------------------
    // rows 19-21: release PR rebase:behind
    // ------------------------------------------------------------------------
    given('[row-19] release PR: rebase:behind', () => {
      const scene: Scene = {
        branch: 'feat',
        releasePr: 'rebase:behind',
      };

      when('[plan] --from main', () => {
        then('exit 2: needs rebase', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-behind-plan',
          });
          try {
            const result = runSkill(['--from', 'main'], {
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

      when('[watch] --from main --watch', () => {
        then('exit 2: needs rebase', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-behind-watch',
          });
          try {
            const result = runSkill(['--from', 'main', '--watch'], {
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

      when('[apply] --from main --apply', () => {
        then('exit 2: needs rebase', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-behind-apply',
          });
          try {
            const result = runSkill(['--from', 'main', '--apply'], {
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

    // ------------------------------------------------------------------------
    // rows 22-24: release PR rebase:dirty
    // ------------------------------------------------------------------------
    given('[row-22] release PR: rebase:dirty', () => {
      const scene: Scene = {
        branch: 'feat',
        releasePr: 'rebase:dirty',
      };

      when('[plan] --from main', () => {
        then('exit 2: needs rebase with conflicts', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-dirty-plan',
          });
          try {
            const result = runSkill(['--from', 'main'], {
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

      when('[watch] --from main --watch', () => {
        then('exit 2: needs rebase with conflicts', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-dirty-watch',
          });
          try {
            const result = runSkill(['--from', 'main', '--watch'], {
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

      when('[apply] --from main --apply', () => {
        then('exit 2: needs rebase with conflicts', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-dirty-apply',
          });
          try {
            const result = runSkill(['--from', 'main', '--apply'], {
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
    // PART 2: release PR merged → tag states (rows 25-36)
    // ========================================================================

    // ------------------------------------------------------------------------
    // rows 25-27: release PR merged, tags unfound
    // ------------------------------------------------------------------------
    given('[row-25] release PR: merged, tags: unfound', () => {
      const scene: Scene = {
        branch: 'feat',
        releasePr: 'merged',
        tagWorkflows: 'unfound',
      };

      when('[plan] --from main', () => {
        then('exit 0: merged, no tag workflows', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-tags-unfound-plan',
          });
          try {
            const result = runSkill(['--from', 'main'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --from main --watch', () => {
        then('exit 0: merged, no tag workflows', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-tags-unfound-watch',
          });
          try {
            const result = runSkill(['--from', 'main', '--watch'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --from main --apply', () => {
        then('exit 0: merged, no tag workflows', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-tags-unfound-apply',
          });
          try {
            const result = runSkill(['--from', 'main', '--apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ------------------------------------------------------------------------
    // rows 28-30: release PR merged, tags inflight
    // ------------------------------------------------------------------------
    given('[row-28] release PR: merged, tags: inflight', () => {
      when('[plan] --from main', () => {
        then('exit 0: merged, tag workflows in progress', () => {
          const scene: Scene = {
            branch: 'feat',
            releasePr: 'merged',
            tagWorkflows: 'inflight',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-tags-inflight-plan',
          });
          try {
            const result = runSkill(['--from', 'main'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --from main --watch with transitions', () => {
        then('exit 0: watch tag workflows', () => {
          const scene: Scene = {
            branch: 'feat',
            releasePr: 'merged',
            tagWorkflows: 'inflight',
            transitions: true,
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-tags-inflight-watch',
          });
          try {
            const result = runSkill(['--from', 'main', '--watch'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --from main --apply with transitions', () => {
        then('exit 0: watch tag workflows', () => {
          const scene: Scene = {
            branch: 'feat',
            releasePr: 'merged',
            tagWorkflows: 'inflight',
            transitions: true,
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-tags-inflight-apply',
          });
          try {
            const result = runSkill(['--from', 'main', '--apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ------------------------------------------------------------------------
    // rows 31-33: release PR merged, tags passed
    // ------------------------------------------------------------------------
    given('[row-31] release PR: merged, tags: passed', () => {
      const scene: Scene = {
        branch: 'feat',
        releasePr: 'merged',
        tagWorkflows: 'passed',
      };

      when('[plan] --from main', () => {
        then('exit 0: all done', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-tags-passed-plan',
          });
          try {
            const result = runSkill(['--from', 'main'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --from main --watch', () => {
        then('exit 0: all done', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-tags-passed-watch',
          });
          try {
            const result = runSkill(['--from', 'main', '--watch'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --from main --apply', () => {
        then('exit 0: all done', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-tags-passed-apply',
          });
          try {
            const result = runSkill(['--from', 'main', '--apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ------------------------------------------------------------------------
    // rows 34-36: release PR merged, tags failed
    // ------------------------------------------------------------------------
    given('[row-34] release PR: merged, tags: failed', () => {
      const scene: Scene = {
        branch: 'feat',
        releasePr: 'merged',
        tagWorkflows: 'failed',
      };

      when('[plan] --from main', () => {
        then('exit 0: informational (tags failed)', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-tags-failed-plan',
          });
          try {
            const result = runSkill(['--from', 'main'], {
              tempDir,
              fakeBinDir,
            });
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --from main --watch', () => {
        then('exit 2: tags failed', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-tags-failed-watch',
          });
          try {
            const result = runSkill(['--from', 'main', '--watch'], {
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

      when('[apply] --from main --apply', () => {
        then('exit 2: tags failed', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-tags-failed-apply',
          });
          try {
            const result = runSkill(['--from', 'main', '--apply'], {
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
    // PART 3: retry tests (rows 16r-18r, 34r-36r)
    // ========================================================================

    // ------------------------------------------------------------------------
    // rows 16r-18r: release PR failed + retry
    // ------------------------------------------------------------------------
    given('[row-16r] release PR: failed + retry', () => {
      const scene: Scene = {
        branch: 'feat',
        releasePr: 'failed',
        enableRetry: true,
        retrySucceeds: false, // retry triggers but checks still fail
      };

      when('[plan+retry] --from main --retry', () => {
        then('exit 0: rerun triggered, hint watch', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-failed-retry-plan',
          });
          try {
            const result = runSkill(['--from', 'main', '--retry'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('rerun');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch+retry] --from main --watch --retry', () => {
        then('exit 2: rerun triggered then watch (still failed)', () => {
          // note: retry triggers rerun but doesn't wait for completion
          // failed is a terminal state, so watch exits immediately
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-failed-retry-watch',
          });
          try {
            const result = runSkill(['--from', 'main', '--watch', '--retry'], {
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

      when('[apply+retry] --from main --apply --retry', () => {
        then('exit 2: rerun triggered then apply (still failed)', () => {
          // note: retry triggers rerun but doesn't wait for completion
          // failed is a terminal state, so apply exits immediately
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-rpr-failed-retry-apply',
          });
          try {
            const result = runSkill(['--from', 'main', '--apply', '--retry'], {
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

    // ------------------------------------------------------------------------
    // rows 34r-36r: release PR merged, tags failed + retry
    // ------------------------------------------------------------------------
    given('[row-34r] release PR: merged, tags: failed + retry', () => {
      const scene: Scene = {
        branch: 'feat',
        releasePr: 'merged',
        tagWorkflows: 'failed',
        enableRetry: true,
        retrySucceeds: false, // retry triggers but tag workflows still fail
      };

      when('[plan+retry] --from main --retry', () => {
        then('exit 0: rerun triggered for tags', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s3-tags-failed-retry-plan',
          });
          try {
            const result = runSkill(['--from', 'main', '--retry'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('rerun');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch+retry] --from main --watch --retry', () => {
        then(
          'exit 2: tags failed (retry hint only, no actual tag rerun)',
          () => {
            // no transitions: retry doesn't actually rerun tags, so they stay failed
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'p3-s3-tags-failed-retry-watch',
            });
            try {
              const result = runSkill(
                ['--from', 'main', '--watch', '--retry'],
                {
                  tempDir,
                  fakeBinDir,
                },
              );
              expect(asTimeStable(result.stdout)).toMatchSnapshot();
              // tag retry shows hint but doesn't trigger gh run rerun for tags
              // watch sees failed tags and exits 2
              expect(result.status).toEqual(2);
            } finally {
              cleanup();
            }
          },
        );
      });

      when('[apply+retry] --from main --apply --retry', () => {
        then(
          'exit 2: tags failed (retry hint only, no actual tag rerun)',
          () => {
            // no transitions: retry doesn't actually rerun tags, so they stay failed
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'p3-s3-tags-failed-retry-apply',
            });
            try {
              const result = runSkill(
                ['--from', 'main', '--apply', '--retry'],
                {
                  tempDir,
                  fakeBinDir,
                },
              );
              expect(asTimeStable(result.stdout)).toMatchSnapshot();
              // tag retry shows hint but doesn't trigger gh run rerun for tags
              // apply/watch sees failed tags and exits 2
              expect(result.status).toEqual(2);
            } finally {
              cleanup();
            }
          },
        );
      });
    });
  });

  // ==========================================================================
  // scene.4: --from main --into main (ConstraintError)
  // ==========================================================================
  describe('scene.4: --from main --into main (invalid)', () => {
    given('[error] --from main --into main', () => {
      when('rhx git.release --from main --into main', () => {
        then('ConstraintError: cannot merge main into main', () => {
          const { tempDir } = setupTempGitRepo('p3-s4-error');
          const result = runSkill(['--from', 'main', '--into', 'main'], {
            tempDir,
          });
          expect(result.stderr).toContain('--from main --into main is invalid');
          expect(result.stderr).toContain("you're already on main");
          expect(result.status).toEqual(2);
          expect(result.stderr).toMatchSnapshot();
        });
      });
    });
  });
});
