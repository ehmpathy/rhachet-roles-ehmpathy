import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

import { type Scene, writeSceneGhMock } from './.test/infra/mockGh';

/**
 * .what = p3 journey tests: scene.1 - on feat branch, --into main (default)
 * .why = exhaustive coverage of feat → main flow per spec tree
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

  if (input.scene.branch === 'feat') {
    spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], { cwd: tempDir });
  } else if (input.scene.branch === 'main') {
    spawnSync('git', ['branch', '-M', 'main'], { cwd: tempDir });
  }

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
// scene.1: on feat branch, --into main (default)
// ============================================================================

describe('git.release.p3.scenes.on_feat.into_main', () => {
  describe('scene.1: on feat branch, into main', () => {
    // ========================================================================
    // row 1-3: unfound
    // ========================================================================
    given('[row-1] feat PR: unfound', () => {
      const scene: Scene = { branch: 'feat', featPr: 'unfound' };

      when('[plan] no flags', () => {
        then('exit 2: crickets, hint push', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s1-unfound-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('crickets');
            expect(result.stdout).toContain('no open branch pr');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --watch', () => {
        then('exit 2: crickets, hint push', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s1-unfound-watch',
          });
          try {
            const result = runSkill(['--watch'], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('crickets');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(2);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --apply', () => {
        then('exit 2: crickets, hint push', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s1-unfound-apply',
          });
          try {
            const result = runSkill(['--apply'], { tempDir, fakeBinDir });
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
      when('[plan] no flags', () => {
        then('exit 0: show progress', () => {
          const scene: Scene = { branch: 'feat', featPr: 'inflight' };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s1-inflight-plan',
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

      when('[watch] --watch', () => {
        then('watch cycles then result', () => {
          const scene: Scene = {
            branch: 'feat',
            featPr: 'inflight',
            transitions: true,
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s1-inflight-watch',
          });
          try {
            const result = runSkill(['--watch'], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('in progress');
            expect(result.stdout).toContain("let's watch");
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --apply', () => {
        then('watch cycles then merged', () => {
          const scene: Scene = {
            branch: 'feat',
            featPr: 'inflight',
            transitions: true,
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s1-inflight-apply',
          });
          try {
            const result = runSkill(['--apply'], { tempDir, fakeBinDir });
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
      const scene: Scene = { branch: 'feat', featPr: 'passed:wout-automerge' };

      when('[plan] no flags', () => {
        then('exit 0: passed, hint apply', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s1-passed-wout-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('all checks passed');
            expect(result.stdout).toContain('automerge unfound');
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
            slug: 'p3-s1-passed-wout-watch',
          });
          try {
            const result = runSkill(['--watch'], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('all checks passed');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --apply', () => {
        then('exit 0: automerge added then merged', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s1-passed-wout-apply',
          });
          try {
            const result = runSkill(['--apply'], { tempDir, fakeBinDir });
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
      const scene: Scene = { branch: 'feat', featPr: 'passed:with-automerge' };

      when('[plan] no flags', () => {
        then('exit 0: passed, automerge found', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s1-passed-with-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('all checks passed');
            expect(result.stdout).toContain('automerge enabled');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --watch', () => {
        then('exit 0: watch then merged', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s1-passed-with-watch',
          });
          try {
            const result = runSkill(['--watch'], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('all checks passed');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --apply', () => {
        then('exit 0: automerge found then merged', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s1-passed-with-apply',
          });
          try {
            const result = runSkill(['--apply'], { tempDir, fakeBinDir });
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
      const scene: Scene = { branch: 'feat', featPr: 'failed' };

      when('[plan] no flags', () => {
        then('exit 2: failed, hint retry', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s1-failed-plan',
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
            slug: 'p3-s1-failed-watch',
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
            slug: 'p3-s1-failed-apply',
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
    // row 16-18: failed with --retry
    // ========================================================================
    given('[row-16] feat PR: failed with --retry', () => {
      when('[plan+retry] --retry', () => {
        then('exit 0: rerun triggered, hint watch', () => {
          const scene: Scene = {
            branch: 'feat',
            featPr: 'failed',
            enableRetry: true,
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s1-failed-retry-plan',
          });
          try {
            const result = runSkill(['--retry'], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('rerun');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            // --retry without --watch exits 0 once rerun triggered (per p1 case5 t0)
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch+retry] --retry --watch', () => {
        then('exit 0: rerun triggered, watch poll cycles, then passed', () => {
          const scene: Scene = {
            branch: 'feat',
            featPr: 'failed',
            enableRetry: true,
            transitions: true,
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s1-failed-retry-watch',
          });
          try {
            const result = runSkill(['--retry', '--watch'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('rerun');
            // after retry, should show poll cycles then pass
            expect(result.stdout).toContain("let's watch");
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            // retry succeeds, checks pass, exit 0
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply+retry] --retry --apply', () => {
        then('exit 0: rerun triggered, watch poll cycles, then merged', () => {
          const scene: Scene = {
            branch: 'feat',
            featPr: 'failed',
            enableRetry: true,
            transitions: true,
          };
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s1-failed-retry-apply',
          });
          try {
            const result = runSkill(['--retry', '--apply'], {
              tempDir,
              fakeBinDir,
            });
            expect(result.stdout).toContain('rerun');
            // after retry, should show poll cycles then merge
            expect(result.stdout).toContain("let's watch");
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            // retry succeeds, automerge added, merged, exit 0
            expect(result.status).toEqual(0);
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
      const scene: Scene = { branch: 'feat', featPr: 'rebase:behind' };

      when('[plan] no flags', () => {
        then('exit 2: needs rebase', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s1-rebase-behind-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('needs rebase');
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
            slug: 'p3-s1-rebase-behind-watch',
          });
          try {
            const result = runSkill(['--watch'], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('needs rebase');
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
            slug: 'p3-s1-rebase-behind-apply',
          });
          try {
            const result = runSkill(['--apply'], { tempDir, fakeBinDir });
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
      const scene: Scene = { branch: 'feat', featPr: 'rebase:dirty' };

      when('[plan] no flags', () => {
        then('exit 2: needs rebase with conflicts', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s1-rebase-dirty-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('needs rebase');
            expect(result.stdout).toContain('conflict');
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
            slug: 'p3-s1-rebase-dirty-watch',
          });
          try {
            const result = runSkill(['--watch'], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('needs rebase');
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
            slug: 'p3-s1-rebase-dirty-apply',
          });
          try {
            const result = runSkill(['--apply'], { tempDir, fakeBinDir });
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
      const scene: Scene = { branch: 'feat', featPr: 'merged' };

      when('[plan] no flags', () => {
        then('exit 0: already merged', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s1-merged-plan',
          });
          try {
            const result = runSkill([], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('already merged');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[watch] --watch', () => {
        then('exit 0: already merged', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s1-merged-watch',
          });
          try {
            const result = runSkill(['--watch'], { tempDir, fakeBinDir });
            expect(result.stdout).toContain('already merged');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
            expect(result.status).toEqual(0);
          } finally {
            cleanup();
          }
        });
      });

      when('[apply] --apply', () => {
        then('exit 0: already merged', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene,
            slug: 'p3-s1-merged-apply',
          });
          try {
            const result = runSkill(['--apply'], { tempDir, fakeBinDir });
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
