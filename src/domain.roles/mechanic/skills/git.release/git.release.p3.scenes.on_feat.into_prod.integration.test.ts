import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

import { type Scene, writeSceneGhMock } from './.test/infra/mockGh';

/**
 * .what = p3 journey tests: scene.2 - on feat branch, --into prod
 * .why = exhaustive coverage of feat → prod flow per spec tree
 * .spec.tree = git.release.spec.tree.md
 * .note = this chains through all 3 transports: feat PR → release PR → tags
 *
 * state enumeration:
 * - rows 1-21: feat PR terminal states (7 states × 3 modes = 21)
 * - rows 22-42: feat PR merged → release PR states (7 states × 3 modes = 21)
 * - rows 43-54: feat PR merged → release PR merged → tag states (4 states × 3 modes = 12)
 * total: 54 snapshots
 */

// mock I/O takes real time (~200ms per poll), so longer tests need headroom
jest.setTimeout(15000);

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

  // create a release tag for version detection
  // note: must match the version in release PR title (chore(release): v1.3.0)
  spawnSync('git', ['tag', 'v1.3.0'], { cwd: tempDir });

  // setup feat branch
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
    timeout: 12000, // mock I/O takes real time (~200ms per poll), allow up to 12s
  });

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status ?? 1,
  };
};

// ============================================================================
// scene.2: on feat branch, --into prod
// ============================================================================

describe('git.release.p3.scenes.on_feat.into_prod', () => {
  describe('scene.2: on feat branch, into prod', () => {
    // ========================================================================
    // PART 1: feat PR terminal states (rows 1-21)
    // when feat PR is not merged, it blocks progress to release PR
    // ========================================================================

    // ------------------------------------------------------------------------
    // rows 1-3: feat PR unfound
    // ------------------------------------------------------------------------
    given('[row-1] feat PR: unfound', () => {
      const scene: Scene = { branch: 'feat', featPr: 'unfound' };

      when('[plan] --into prod', () => {
        then('exit 2: crickets, hint push', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-fpr-unfound-plan',
          });
          try {
            const result = runSkill(['--into', 'prod'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('no open branch pr');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --into prod --watch', () => {
        then('exit 2: crickets, hint push', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-fpr-unfound-watch',
          });
          try {
            const result = runSkill(['--into', 'prod', '--watch'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('no open branch pr');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --into prod --apply', () => {
        then('exit 2: crickets, hint push', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-fpr-unfound-apply',
          });
          try {
            const result = runSkill(['--into', 'prod', '--apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('no open branch pr');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ------------------------------------------------------------------------
    // rows 4-6: feat PR inflight
    // ------------------------------------------------------------------------
    given('[row-4] feat PR: inflight', () => {
      when('[plan] --into prod', () => {
        then('exit 0: show progress', () => {
          const scene: Scene = { branch: 'feat', featPr: 'inflight' };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-fpr-inflight-plan',
          });
          try {
            const result = runSkill(['--into', 'prod'], {
              tempDir,
              fakeBinDir,
            });
            // debug: dump state if test fails
            if (result.status !== 0 || !result.stdout.includes('in progress')) {
              const debugFile = '/tmp/git-release-row4-debug.txt';
              let debug = '=== DEBUG row-4 ===\n';
              debug += `stdout:\n${result.stdout}\n`;
              debug += `stderr:\n${result.stderr}\n`;
              const stateDir = path.join(tempDir, '.mock-state');
              const debugLog = path.join(stateDir, 'gh-debug.log');
              if (fs.existsSync(debugLog)) {
                debug += `gh-debug.log:\n${fs.readFileSync(debugLog, 'utf-8')}\n`;
              }
              // also dump the gh mock executable
              const ghMockPath = path.join(fakeBinDir, 'gh');
              debug += `gh mock:\n${fs.readFileSync(ghMockPath, 'utf-8')}\n`;
              debug += '=== END DEBUG ===\n';
              fs.writeFileSync(debugFile, debug);
            }
            expect(result.stdout).toContain('in progress');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --into prod --watch with transitions', () => {
        then('watch cycles then result', () => {
          const scene: Scene = {
            branch: 'feat',
            featPr: 'inflight',
            transitions: true,
            releasePr: 'passed:wout-automerge',
            tagWorkflows: 'passed',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-fpr-inflight-watch',
          });
          try {
            const result = runSkill(['--into', 'prod', '--watch'], {
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

      when('[apply] --into prod --apply with transitions', () => {
        then('watch cycles then merged, continue to release', () => {
          const scene: Scene = {
            branch: 'feat',
            featPr: 'inflight',
            transitions: true,
            releasePr: 'passed:wout-automerge',
            tagWorkflows: 'passed',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-fpr-inflight-apply',
          });
          try {
            const result = runSkill(['--into', 'prod', '--apply'], {
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
    // rows 7-9: feat PR passed:wout-automerge
    // ------------------------------------------------------------------------
    given('[row-7] feat PR: passed:wout-automerge', () => {
      const scene: Scene = { branch: 'feat', featPr: 'passed:wout-automerge' };

      when('[plan] --into prod', () => {
        then('exit 0: passed, hint apply', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-fpr-passed-wout-plan',
          });
          try {
            const result = runSkill(['--into', 'prod'], {
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

      when('[watch] --into prod --watch', () => {
        then('exit 0: passed (no watch needed)', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-fpr-passed-wout-watch',
          });
          try {
            const result = runSkill(['--into', 'prod', '--watch'], {
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

      when('[apply] --into prod --apply', () => {
        then('exit 0: automerge added, merged, continue to release', () => {
          const sceneWithRelease: Scene = {
            branch: 'feat',
            featPr: 'passed:wout-automerge',
            releasePr: 'passed:wout-automerge',
            tagWorkflows: 'passed',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: sceneWithRelease,
            slug: 'p3-s2-fpr-passed-wout-apply',
          });
          try {
            const result = runSkill(['--into', 'prod', '--apply'], {
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
    // rows 10-12: feat PR passed:with-automerge
    // ------------------------------------------------------------------------
    given('[row-10] feat PR: passed:with-automerge', () => {
      when('[plan] --into prod', () => {
        then('exit 0: passed, automerge found', () => {
          const scene: Scene = {
            branch: 'feat',
            featPr: 'passed:with-automerge',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-fpr-passed-with-plan',
          });
          try {
            const result = runSkill(['--into', 'prod'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('automerge');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --into prod --watch', () => {
        then('exit 0: watch then merged, continue to release', () => {
          const scene: Scene = {
            branch: 'feat',
            featPr: 'passed:with-automerge',
            releasePr: 'passed:wout-automerge',
            tagWorkflows: 'passed',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-fpr-passed-with-watch',
          });
          try {
            const result = runSkill(['--into', 'prod', '--watch'], {
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

      when('[apply] --into prod --apply', () => {
        then('exit 0: automerge found, merged, continue to release', () => {
          const scene: Scene = {
            branch: 'feat',
            featPr: 'passed:with-automerge',
            releasePr: 'passed:wout-automerge',
            tagWorkflows: 'passed',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-fpr-passed-with-apply',
          });
          try {
            const result = runSkill(['--into', 'prod', '--apply'], {
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
    // rows 13-15: feat PR failed
    // ------------------------------------------------------------------------
    given('[row-13] feat PR: failed', () => {
      const scene: Scene = { branch: 'feat', featPr: 'failed' };

      when('[plan] --into prod', () => {
        then('exit 2: failed, hint retry', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-fpr-failed-plan',
          });
          try {
            const result = runSkill(['--into', 'prod'], {
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

      when('[watch] --into prod --watch', () => {
        then('exit 2: failed, hint retry', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-fpr-failed-watch',
          });
          try {
            const result = runSkill(['--into', 'prod', '--watch'], {
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

      when('[apply] --into prod --apply', () => {
        then('exit 2: failed, hint retry', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-fpr-failed-apply',
          });
          try {
            const result = runSkill(['--into', 'prod', '--apply'], {
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
    // rows 16-18: feat PR failed with --retry (RETRY VARIANTS)
    // ------------------------------------------------------------------------
    given('[row-16r] feat PR: failed with --retry', () => {
      const scene: Scene = {
        branch: 'feat',
        featPr: 'failed',
        enableRetry: true,
        transitions: true,
      };

      when('[plan+retry] --into prod --retry', () => {
        then('exit 0: rerun triggered, hint watch', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-fpr-failed-retry-plan',
          });
          try {
            const result = runSkill(['--into', 'prod', '--retry'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('rerun');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            // --retry without --watch exits 0 once rerun triggered (per p1 case5 t0)
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch+retry] --into prod --retry --watch', () => {
        then('exit 0: rerun triggered then watch to success', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-fpr-failed-retry-watch',
          });
          try {
            const result = runSkill(['--into', 'prod', '--retry', '--watch'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('rerun');
            expect(result.stdout).toContain('left'); // poll cycles show 💤 N left
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            // after retry triggers rerun and watch completes to success, exit 0
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply+retry] --into prod --retry --apply', () => {
        then('exit 0: rerun triggered then apply to success', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-fpr-failed-retry-apply',
          });
          try {
            const result = runSkill(['--into', 'prod', '--retry', '--apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('rerun');
            expect(result.stdout).toContain('left'); // poll cycles show 💤 N left
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            // after retry triggers rerun and apply completes to success, exit 0
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ------------------------------------------------------------------------
    // rows 19-21: feat PR rebase:behind
    // ------------------------------------------------------------------------
    given('[row-19] feat PR: rebase:behind', () => {
      const scene: Scene = { branch: 'feat', featPr: 'rebase:behind' };

      when('[plan] --into prod', () => {
        then('exit 2: needs rebase', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-fpr-rebase-behind-plan',
          });
          try {
            const result = runSkill(['--into', 'prod'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('rebase');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --into prod --watch', () => {
        then('exit 2: needs rebase', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-fpr-rebase-behind-watch',
          });
          try {
            const result = runSkill(['--into', 'prod', '--watch'], {
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

      when('[apply] --into prod --apply', () => {
        then('exit 2: needs rebase', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-fpr-rebase-behind-apply',
          });
          try {
            const result = runSkill(['--into', 'prod', '--apply'], {
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
    // rows 19-21: feat PR rebase:dirty
    // ------------------------------------------------------------------------
    given('[row-19] feat PR: rebase:dirty', () => {
      const scene: Scene = { branch: 'feat', featPr: 'rebase:dirty' };

      when('[plan] --into prod', () => {
        then('exit 2: needs rebase with conflicts', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-fpr-rebase-dirty-plan',
          });
          try {
            const result = runSkill(['--into', 'prod'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('conflict');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --into prod --watch', () => {
        then('exit 2: needs rebase with conflicts', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-fpr-rebase-dirty-watch',
          });
          try {
            const result = runSkill(['--into', 'prod', '--watch'], {
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

      when('[apply] --into prod --apply', () => {
        then('exit 2: needs rebase with conflicts', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-fpr-rebase-dirty-apply',
          });
          try {
            const result = runSkill(['--into', 'prod', '--apply'], {
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
    // PART 2: feat PR merged → release PR states (rows 22-42)
    // ========================================================================

    // ------------------------------------------------------------------------
    // rows 22-24: feat PR merged, release PR unfound → awaited → found
    // ------------------------------------------------------------------------
    given(
      '[row-22] feat PR: merged, release PR: unfound (found after wait)',
      () => {
        const scene: Scene = {
          branch: 'feat',
          featPr: 'merged',
          releasePr: 'unfound',
          awaitReleasePr: 'after-wait',
          transitions: true,
        };

        when('[plan] --into prod', () => {
          then('exit 0: merged, release PR found after await', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'p3-s2-rpr-unfound-await-plan',
            });
            try {
              const result = runSkill(['--into', 'prod'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('merged');
              expect(result.stdout).toContain('and then...');
              expect(result.stdout).toContain('found!');
              expect(asTimeStable(result.stdout)).toMatchSnapshot();
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });

        when('[watch] --into prod --watch', () => {
          then(
            'exit 0: merged, release PR found after await, watch to merged',
            () => {
              const { tempDir, fakeBinDir, cleanup } = setupScene({
                scene,
                slug: 'p3-s2-rpr-unfound-await-watch',
              });
              try {
                const result = runSkill(['--into', 'prod', '--watch'], {
                  tempDir,
                  fakeBinDir,
                });
                expect(result.stdout).toContain('and then...');
                expect(result.stdout).toContain('found!');
                expect(asTimeStable(result.stdout)).toMatchSnapshot();
                expect(result.status).toEqual(0);
              } finally {
                cleanup();
              }
            },
          );
        });

        when('[apply] --into prod --apply', () => {
          then(
            'exit 0: merged, release PR found after await, apply to merged',
            () => {
              const { tempDir, fakeBinDir, cleanup } = setupScene({
                scene,
                slug: 'p3-s2-rpr-unfound-await-apply',
              });
              try {
                const result = runSkill(['--into', 'prod', '--apply'], {
                  tempDir,
                  fakeBinDir,
                });
                expect(result.stdout).toContain('and then...');
                expect(result.stdout).toContain('found!');
                expect(asTimeStable(result.stdout)).toMatchSnapshot();
                expect(result.status).toEqual(0);
              } finally {
                cleanup();
              }
            },
          );
        });
      },
    );

    // ------------------------------------------------------------------------
    // rows 22b: feat PR merged, release PR unfound → timeout (sad path)
    // ------------------------------------------------------------------------
    given('[row-22b] feat PR: merged, release PR: unfound (timeout)', () => {
      const scene: Scene = {
        branch: 'feat',
        featPr: 'merged',
        releasePr: 'unfound',
        // no awaitReleasePr = 'never' (default) = timeout
      };

      when('[plan] --into prod', () => {
        then('exit 2: merged, release PR await timeout', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-rpr-unfound-timeout-plan',
          });
          try {
            const result = runSkill(['--into', 'prod'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('merged');
            expect(result.stdout).toContain('release pr did not appear');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ------------------------------------------------------------------------
    // rows 25-27: feat PR merged, release PR inflight
    // ------------------------------------------------------------------------
    given('[row-25] feat PR: merged, release PR: inflight', () => {
      when('[plan] --into prod', () => {
        then('exit 0: show release progress', () => {
          const scene: Scene = {
            branch: 'feat',
            featPr: 'merged',
            releasePr: 'inflight',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-rpr-inflight-plan',
          });
          try {
            const result = runSkill(['--into', 'prod'], {
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

      when('[watch] --into prod --watch with transitions', () => {
        then('exit 0: watch cycles then passed', () => {
          const scene: Scene = {
            branch: 'feat',
            featPr: 'merged',
            releasePr: 'inflight',
            transitions: true,
            tagWorkflows: 'passed',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-rpr-inflight-watch',
          });
          try {
            const result = runSkill(['--into', 'prod', '--watch'], {
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

      when('[apply] --into prod --apply with transitions', () => {
        then('exit 0: watch, merge, then tags', () => {
          const scene: Scene = {
            branch: 'feat',
            featPr: 'merged',
            releasePr: 'inflight',
            transitions: true,
            tagWorkflows: 'passed',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-rpr-inflight-apply',
          });
          try {
            const result = runSkill(['--into', 'prod', '--apply'], {
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
    // rows 28-30: feat PR merged, release PR passed:wout-automerge
    // ------------------------------------------------------------------------
    given('[row-28] feat PR: merged, release PR: passed:wout-automerge', () => {
      const scene: Scene = {
        branch: 'feat',
        featPr: 'merged',
        releasePr: 'passed:wout-automerge',
      };

      when('[plan] --into prod', () => {
        then('exit 0: passed, hint apply', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-rpr-passed-wout-plan',
          });
          try {
            const result = runSkill(['--into', 'prod'], {
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

      when('[watch] --into prod --watch', () => {
        then('exit 0: passed (no watch needed)', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-rpr-passed-wout-watch',
          });
          try {
            const result = runSkill(['--into', 'prod', '--watch'], {
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

      when('[apply] --into prod --apply', () => {
        then('exit 0: automerge added, merged, then tags', () => {
          const sceneWithTags: Scene = {
            branch: 'feat',
            featPr: 'merged',
            releasePr: 'passed:wout-automerge',
            tagWorkflows: 'passed',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: sceneWithTags,
            slug: 'p3-s2-rpr-passed-wout-apply',
          });
          try {
            const result = runSkill(['--into', 'prod', '--apply'], {
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
    // rows 31-33: feat PR merged, release PR passed:with-automerge
    // ------------------------------------------------------------------------
    given('[row-31] feat PR: merged, release PR: passed:with-automerge', () => {
      when('[plan] --into prod', () => {
        then('exit 0: passed, automerge found', () => {
          const scene: Scene = {
            branch: 'feat',
            featPr: 'merged',
            releasePr: 'passed:with-automerge',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-rpr-passed-with-plan',
          });
          try {
            const result = runSkill(['--into', 'prod'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('automerge');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --into prod --watch', () => {
        then('exit 0: watch then merged', () => {
          const scene: Scene = {
            branch: 'feat',
            featPr: 'merged',
            releasePr: 'passed:with-automerge',
            tagWorkflows: 'passed',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-rpr-passed-with-watch',
          });
          try {
            const result = runSkill(['--into', 'prod', '--watch'], {
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

      when('[apply] --into prod --apply', () => {
        then('exit 0: automerge found, merged, then tags', () => {
          const scene: Scene = {
            branch: 'feat',
            featPr: 'merged',
            releasePr: 'passed:with-automerge',
            tagWorkflows: 'passed',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-rpr-passed-with-apply',
          });
          try {
            const result = runSkill(['--into', 'prod', '--apply'], {
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
    // rows 34-36: feat PR merged, release PR failed
    // ------------------------------------------------------------------------
    given('[row-34] feat PR: merged, release PR: failed', () => {
      const scene: Scene = {
        branch: 'feat',
        featPr: 'merged',
        releasePr: 'failed',
      };

      when('[plan] --into prod', () => {
        then('exit 2: failed, hint retry', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-rpr-failed-plan',
          });
          try {
            const result = runSkill(['--into', 'prod'], {
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

      when('[watch] --into prod --watch', () => {
        then('exit 2: failed, hint retry', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-rpr-failed-watch',
          });
          try {
            const result = runSkill(['--into', 'prod', '--watch'], {
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

      when('[apply] --into prod --apply', () => {
        then('exit 2: failed, hint retry', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-rpr-failed-apply',
          });
          try {
            const result = runSkill(['--into', 'prod', '--apply'], {
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
    // rows 37-39r: release PR failed with --retry (RETRY VARIANTS)
    // ------------------------------------------------------------------------
    given('[row-37r] feat PR: merged, release PR: failed with --retry', () => {
      const scene: Scene = {
        branch: 'feat',
        featPr: 'merged',
        releasePr: 'failed',
        enableRetry: true,
        transitions: true,
      };

      when('[plan+retry] --into prod --retry', () => {
        then('exit 0: rerun triggered, hint watch', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-rpr-failed-retry-plan',
          });
          try {
            const result = runSkill(['--into', 'prod', '--retry'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('rerun');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            // --retry without --watch exits 0 once rerun triggered (per p1 case5 t0)
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch+retry] --into prod --retry --watch', () => {
        then('exit 0: rerun triggered then watch to success', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-rpr-failed-retry-watch',
          });
          try {
            const result = runSkill(['--into', 'prod', '--retry', '--watch'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('rerun');
            expect(result.stdout).toContain('left'); // poll cycles show 💤 N left
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            // after retry triggers rerun and watch completes to success, exit 0
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply+retry] --into prod --retry --apply', () => {
        then('exit 0: rerun triggered then apply to success', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-rpr-failed-retry-apply',
          });
          try {
            const result = runSkill(['--into', 'prod', '--retry', '--apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('rerun');
            expect(result.stdout).toContain('left'); // poll cycles show 💤 N left
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            // after retry triggers rerun and apply completes to success, exit 0
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });
    });

    // ------------------------------------------------------------------------
    // rows 40-42: feat PR merged, release PR rebase:behind
    // ------------------------------------------------------------------------
    given('[row-40] feat PR: merged, release PR: rebase:behind', () => {
      const scene: Scene = {
        branch: 'feat',
        featPr: 'merged',
        releasePr: 'rebase:behind',
      };

      when('[plan] --into prod', () => {
        then('exit 2: needs rebase', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-rpr-rebase-behind-plan',
          });
          try {
            const result = runSkill(['--into', 'prod'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('rebase');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --into prod --watch', () => {
        then('exit 2: needs rebase', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-rpr-rebase-behind-watch',
          });
          try {
            const result = runSkill(['--into', 'prod', '--watch'], {
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

      when('[apply] --into prod --apply', () => {
        then('exit 2: needs rebase', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-rpr-rebase-behind-apply',
          });
          try {
            const result = runSkill(['--into', 'prod', '--apply'], {
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
    // rows 40-42: feat PR merged, release PR rebase:dirty
    // ------------------------------------------------------------------------
    given('[row-40] feat PR: merged, release PR: rebase:dirty', () => {
      const scene: Scene = {
        branch: 'feat',
        featPr: 'merged',
        releasePr: 'rebase:dirty',
      };

      when('[plan] --into prod', () => {
        then('exit 2: needs rebase with conflicts', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-rpr-rebase-dirty-plan',
          });
          try {
            const result = runSkill(['--into', 'prod'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('conflict');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --into prod --watch', () => {
        then('exit 2: needs rebase with conflicts', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-rpr-rebase-dirty-watch',
          });
          try {
            const result = runSkill(['--into', 'prod', '--watch'], {
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

      when('[apply] --into prod --apply', () => {
        then('exit 2: needs rebase with conflicts', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-rpr-rebase-dirty-apply',
          });
          try {
            const result = runSkill(['--into', 'prod', '--apply'], {
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
    // PART 3: feat PR merged → release PR merged → tag states (rows 43-54)
    // ========================================================================

    // ------------------------------------------------------------------------
    // rows 43-45: release PR merged, tags unfound
    // ------------------------------------------------------------------------
    given('[row-43] feat+release PR: merged, tags: unfound', () => {
      const scene: Scene = {
        branch: 'feat',
        featPr: 'merged',
        releasePr: 'merged',
        tagWorkflows: 'unfound',
      };

      when('[plan] --into prod', () => {
        then('exit 0: merged, no tag workflows', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-tags-unfound-plan',
          });
          try {
            const result = runSkill(['--into', 'prod'], {
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

      when('[watch] --into prod --watch', () => {
        then('exit 0: merged, no tag workflows', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-tags-unfound-watch',
          });
          try {
            const result = runSkill(['--into', 'prod', '--watch'], {
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

      when('[apply] --into prod --apply', () => {
        then('exit 0: merged, no tag workflows', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-tags-unfound-apply',
          });
          try {
            const result = runSkill(['--into', 'prod', '--apply'], {
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
    // rows 46-48: release PR merged, tags inflight
    // ------------------------------------------------------------------------
    given('[row-46] feat+release PR: merged, tags: inflight', () => {
      when('[plan] --into prod', () => {
        then('exit 0: merged, tag workflows in progress', () => {
          const scene: Scene = {
            branch: 'feat',
            featPr: 'merged',
            releasePr: 'merged',
            tagWorkflows: 'inflight',
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-tags-inflight-plan',
          });
          try {
            const result = runSkill(['--into', 'prod'], {
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

      when('[watch] --into prod --watch with transitions', () => {
        then('exit 0: watch tag workflows', () => {
          const scene: Scene = {
            branch: 'feat',
            featPr: 'merged',
            releasePr: 'merged',
            tagWorkflows: 'inflight',
            transitions: true,
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-tags-inflight-watch',
          });
          try {
            const result = runSkill(['--into', 'prod', '--watch'], {
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

      when('[apply] --into prod --apply with transitions', () => {
        then('exit 0: watch tag workflows', () => {
          const scene: Scene = {
            branch: 'feat',
            featPr: 'merged',
            releasePr: 'merged',
            tagWorkflows: 'inflight',
            transitions: true,
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-tags-inflight-apply',
          });
          try {
            const result = runSkill(['--into', 'prod', '--apply'], {
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
    // rows 49-51: release PR merged, tags passed
    // ------------------------------------------------------------------------
    given('[row-49] feat+release PR: merged, tags: passed', () => {
      const scene: Scene = {
        branch: 'feat',
        featPr: 'merged',
        releasePr: 'merged',
        tagWorkflows: 'passed',
      };

      when('[plan] --into prod', () => {
        then('exit 0: all done', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-tags-passed-plan',
          });
          try {
            const result = runSkill(['--into', 'prod'], {
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

      when('[watch] --into prod --watch', () => {
        then('exit 0: all done', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-tags-passed-watch',
          });
          try {
            const result = runSkill(['--into', 'prod', '--watch'], {
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

      when('[apply] --into prod --apply', () => {
        then('exit 0: all done', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-tags-passed-apply',
          });
          try {
            const result = runSkill(['--into', 'prod', '--apply'], {
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
    // rows 52-54: release PR merged, tags failed
    // ------------------------------------------------------------------------
    given('[row-52] feat+release PR: merged, tags: failed', () => {
      const scene: Scene = {
        branch: 'feat',
        featPr: 'merged',
        releasePr: 'merged',
        tagWorkflows: 'failed',
      };

      when('[plan] --into prod', () => {
        then('exit 0: informational (tags failed)', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-tags-failed-plan',
          });
          try {
            const result = runSkill(['--into', 'prod'], {
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

      when('[watch] --into prod --watch', () => {
        then('exit 2: tags failed', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-tags-failed-watch',
          });
          try {
            const result = runSkill(['--into', 'prod', '--watch'], {
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

      when('[apply] --into prod --apply', () => {
        then('exit 2: tags failed', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s2-tags-failed-apply',
          });
          try {
            const result = runSkill(['--into', 'prod', '--apply'], {
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
    // rows 55-57r: tags failed with --retry (RETRY VARIANTS)
    // ------------------------------------------------------------------------
    given(
      '[row-55r] feat+release PR: merged, tags: failed with --retry',
      () => {
        const scene: Scene = {
          branch: 'feat',
          featPr: 'merged',
          releasePr: 'merged',
          tagWorkflows: 'failed',
          enableRetry: true,
          transitions: true,
        };

        when('[plan+retry] --into prod --retry', () => {
          then('exit 0: rerun triggered, hint watch', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'p3-s2-tags-failed-retry-plan',
            });
            try {
              const result = runSkill(['--into', 'prod', '--retry'], {
                tempDir,
                fakeBinDir,
              });
              expect(result.stdout).toContain('rerun');
              expect(asTimeStable(result.stdout)).toMatchSnapshot();
              // --retry without --watch exits 0 once rerun triggered (per p1 case5 t0)
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });

        when('[watch+retry] --into prod --retry --watch', () => {
          then('exit 0: rerun triggered then watch to success', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'p3-s2-tags-failed-retry-watch',
            });
            try {
              const result = runSkill(
                ['--into', 'prod', '--retry', '--watch'],
                {
                  tempDir,
                  fakeBinDir,
                },
              );
              expect(result.stdout).toContain('rerun');
              // tag watch shows workflow name in poll cycles, not "N left"
              expect(result.stdout).toContain('publish.yml');
              expect(asTimeStable(result.stdout)).toMatchSnapshot();
              // after retry triggers rerun and watch completes to success, exit 0
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });

        when('[apply+retry] --into prod --retry --apply', () => {
          then('exit 0: rerun triggered then apply to success', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene,
              slug: 'p3-s2-tags-failed-retry-apply',
            });
            try {
              const result = runSkill(
                ['--into', 'prod', '--retry', '--apply'],
                {
                  tempDir,
                  fakeBinDir,
                },
              );
              expect(result.stdout).toContain('rerun');
              // tag watch shows workflow name in poll cycles, not "N left"
              expect(result.stdout).toContain('publish.yml');
              expect(asTimeStable(result.stdout)).toMatchSnapshot();
              // after retry triggers rerun and apply completes to success, exit 0
              expect(result.status).toEqual(0);
            } finally {
              cleanup();
            }
          });
        });
      },
    );
  });
});
