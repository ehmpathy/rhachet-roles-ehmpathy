import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

import { type Scene, writeSceneGhMock } from './.test/infra/mockGh';

/**
 * .what = p6 timing accuracy tests
 *
 * .why = verify "in action" shows actual CI duration (completedAt - startedAt),
 *        not elapsed wall-clock time (now - startedAt)
 *
 * .note = positive tests verify correct duration from timestamps
 *         negative tests verify graceful fallback when timestamps missing
 */

jest.setTimeout(5000);

const SKILL_PATH = path.join(
  __dirname,
  '../../../../../dist/domain.roles/mechanic/skills/git.release/git.release.sh',
);

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

  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: tempDir });
  spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: tempDir });
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
    cleanup: () => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    },
  };
};

const runScript = (input: {
  args: string[];
  cwd: string;
  fakeBinDir: string;
}): { stdout: string; stderr: string; status: number } => {
  const result = spawnSync('bash', [SKILL_PATH, ...input.args], {
    cwd: input.cwd,
    encoding: 'utf-8',
    env: {
      ...process.env,
      GIT_RELEASE_TEST_MODE: 'true',
      PATH: `${input.fakeBinDir}:${process.env.PATH}`,
    },
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status ?? 1,
  };
};

describe('git.release.p6.timing', () => {
  describe('positive: accurate duration from timestamps', () => {
    given('[case1] PR inflight then merges with known timestamps', () => {
      when('[t0] --watch is called', () => {
        then('it shows duration from completedAt - startedAt, not now - startedAt', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: {
              branch: 'feat',
              featPr: 'inflight',
              priorReleaseTitle: 'chore(release): v1.2.3',
              transitions: true,
            },
            slug: 'p6-timing-positive-pr',
          });

          try {
            const result = runScript({
              args: ['--watch'],
              cwd: tempDir,
              fakeBinDir,
            });

            expect(result.status).toBe(0);
            // mock sets completedAt = startedAt + 60s, so duration should be ~1m
            // if it showed now - startedAt, it would be ~0s (since test runs fast)
            expect(result.stdout).toContain('done!');
            expect(result.stdout).toMatch(/1m.*in action/);
          } finally {
            cleanup();
          }
        });
      });
    });

    given('[case2] tag workflow completed with known timestamps', () => {
      when('[t0] --watch --into prod --from main is called', () => {
        then('it shows duration from updatedAt - startedAt', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: {
              branch: 'main',
              releasePr: 'merged',
              tagWorkflows: 'passed',
              priorReleaseTitle: 'chore(release): v1.2.3',
            },
            slug: 'p6-timing-positive-tag',
          });

          try {
            const result = runScript({
              args: ['--watch', '--into', 'prod', '--from', 'main'],
              cwd: tempDir,
              fakeBinDir,
            });

            expect(result.status).toBe(0);
            // mock sets updatedAt = startedAt + 60s for completed runs
            // the "done!" line should show ~1m in action, not ~0s
            expect(result.stdout).toContain('done!');
            expect(result.stdout).toContain('publish.yml');
            // verify it's the mock duration, not wall-clock time
            // by check the output contains "1m" (60s from mock)
            expect(result.stdout).toMatch(/1m.*in action/);
          } finally {
            cleanup();
          }
        });
      });
    });

    given('[case3] PR checks done without automerge', () => {
      when('[t0] --watch is called', () => {
        then('it shows accurate duration for completed checks', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: {
              branch: 'feat',
              featPr: 'passed:wout-automerge',
              priorReleaseTitle: 'chore(release): v1.2.3',
            },
            slug: 'p6-timing-positive-noam',
          });

          try {
            const result = runScript({
              args: ['--watch'],
              cwd: tempDir,
              fakeBinDir,
            });

            expect(result.status).toBe(0);
            expect(result.stdout).toContain('done!');
            // should show ~1m in action from mock timestamps
            expect(result.stdout).toMatch(/1m.*in action/);
          } finally {
            cleanup();
          }
        });
      });
    });
  });

  describe('negative: graceful fallback when timestamps absent', () => {
    given('[case4] already merged PR (no active checks)', () => {
      when('[t0] --watch is called', () => {
        then('it gracefully handles already merged state', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: {
              branch: 'feat',
              featPr: 'merged',
              priorReleaseTitle: 'chore(release): v1.2.3',
            },
            slug: 'p6-timing-negative-merged',
          });

          try {
            const result = runScript({
              args: ['--watch'],
              cwd: tempDir,
              fakeBinDir,
            });

            // should not crash and report already merged
            expect(result.status).toBe(0);
            expect(result.stdout).toContain('already merged');
          } finally {
            cleanup();
          }
        });
      });
    });

    given('[case5] tag watch with grace period (no runs yet)', () => {
      when('[t0] --watch --into prod --from main is called with no initial runs', () => {
        then('it gracefully handles absent timestamps in grace period', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: {
              branch: 'main',
              releasePr: 'merged',
              // unfound with transitions will go through grace period
              tagWorkflows: 'unfound',
              priorReleaseTitle: 'chore(release): v1.2.3',
              transitions: true,
            },
            slug: 'p6-timing-negative-grace',
          });

          try {
            const result = runScript({
              args: ['--watch', '--into', 'prod', '--from', 'main'],
              cwd: tempDir,
              fakeBinDir,
            });

            // should complete successfully even with transitions
            expect(result.status).toBe(0);
            expect(result.stdout).toContain('done!');
          } finally {
            cleanup();
          }
        });
      });
    });
  });
});
