import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

import { type Scene, writeSceneGhMock } from './.test/infra/mockGh';

/**
 * .what = p5 watch behavior tests
 *
 * .why = prove watch correctly handles all transport/state combinations:
 *        - feature-pr, release-pr, release-tag
 *        - inflight (with transitions), passed, merged, failed
 *
 * .note = uses Scene-based mock with transitions: true for poll cycles
 */

jest.setTimeout(5000);

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

describe('git.release.p5.watch', () => {
  describe('feature-pr watch', () => {
    given('[case1] pr exists, checks inflight', () => {
      when('[t0] --watch is called', () => {
        then('it polls until checks pass and pr merges', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: {
              branch: 'feat',
              featPr: 'inflight',
              priorReleaseTitle: 'chore(release): v1.2.3',
              transitions: true,
            },
            slug: 'p5-feat-inflight',
          });

          try {
            const result = runScript({
              args: ['--watch'],
              cwd: tempDir,
              fakeBinDir,
            });

            expect(result.status).toBe(0);
            expect(result.stdout).toContain("let's watch");
            expect(result.stdout).toContain('done!');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
          } finally {
            cleanup();
          }
        });
      });
    });

    given('[case2] pr exists, checks passed, no automerge', () => {
      when('[t0] --watch is called', () => {
        then('it exits with done immediately', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: {
              branch: 'feat',
              featPr: 'passed:wout-automerge',
              priorReleaseTitle: 'chore(release): v1.2.3',
            },
            slug: 'p5-feat-passed-noam',
          });

          try {
            const result = runScript({
              args: ['--watch'],
              cwd: tempDir,
              fakeBinDir,
            });

            expect(result.status).toBe(0);
            expect(result.stdout).toContain('done!');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
          } finally {
            cleanup();
          }
        });
      });
    });

    given('[case3] pr exists, already merged', () => {
      when('[t0] --watch is called', () => {
        then('it exits with already merged immediately', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: {
              branch: 'feat',
              featPr: 'merged',
              priorReleaseTitle: 'chore(release): v1.2.3',
            },
            slug: 'p5-feat-merged',
          });

          try {
            const result = runScript({
              args: ['--watch'],
              cwd: tempDir,
              fakeBinDir,
            });

            expect(result.status).toBe(0);
            expect(result.stdout).toContain('already merged');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
          } finally {
            cleanup();
          }
        });
      });
    });

    given('[case4] pr exists, checks failed', () => {
      when('[t0] --watch is called', () => {
        then('it exits with failed status', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: {
              branch: 'feat',
              featPr: 'failed',
              priorReleaseTitle: 'chore(release): v1.2.3',
            },
            slug: 'p5-feat-failed',
          });

          try {
            const result = runScript({
              args: ['--watch'],
              cwd: tempDir,
              fakeBinDir,
            });

            expect(result.status).toBe(2);
            expect(result.stdout).toContain('failed');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
          } finally {
            cleanup();
          }
        });
      });
    });
  });

  describe('release-pr watch', () => {
    given('[case5] release pr exists, checks inflight', () => {
      when('[t0] --watch --into prod is called on main', () => {
        then('it polls until checks pass and pr merges', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: {
              branch: 'main',
              releasePr: 'inflight',
              priorReleaseTitle: 'chore(release): v1.2.3',
              transitions: true,
            },
            slug: 'p5-rel-inflight',
          });

          try {
            const result = runScript({
              args: ['--watch', '--into', 'prod'],
              cwd: tempDir,
              fakeBinDir,
            });

            expect(result.status).toBe(0);
            expect(result.stdout).toContain("let's watch");
            expect(result.stdout).toContain('done!');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
          } finally {
            cleanup();
          }
        });
      });
    });

    given('[case6] release pr exists, already merged', () => {
      when('[t0] --watch --into prod is called on main', () => {
        then('it proceeds to tag watch and exits done', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: {
              branch: 'main',
              releasePr: 'merged',
              tagWorkflows: 'passed',
              priorReleaseTitle: 'chore(release): v1.2.3',
            },
            slug: 'p5-rel-merged',
          });

          try {
            const result = runScript({
              args: ['--watch', '--into', 'prod'],
              cwd: tempDir,
              fakeBinDir,
            });

            expect(result.status).toBe(0);
            expect(result.stdout).toContain('done!');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
          } finally {
            cleanup();
          }
        });
      });
    });

    given('[case7] release pr exists, checks failed', () => {
      when('[t0] --watch --into prod is called on main', () => {
        then('it exits with failed status', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: {
              branch: 'main',
              releasePr: 'failed',
              priorReleaseTitle: 'chore(release): v1.2.3',
            },
            slug: 'p5-rel-failed',
          });

          try {
            const result = runScript({
              args: ['--watch', '--into', 'prod'],
              cwd: tempDir,
              fakeBinDir,
            });

            expect(result.status).toBe(2);
            expect(result.stdout).toContain('failed');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
          } finally {
            cleanup();
          }
        });
      });
    });
  });

  describe('release-tag watch', () => {
    given('[case8] tag workflows inflight', () => {
      when('[t0] --watch --into prod --from main is called', () => {
        then('it polls until workflows complete', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: {
              branch: 'main',
              releasePr: 'merged',
              tagWorkflows: 'inflight',
              priorReleaseTitle: 'chore(release): v1.2.3',
              transitions: true,
            },
            slug: 'p5-tag-inflight',
          });

          try {
            const result = runScript({
              args: ['--watch', '--into', 'prod', '--from', 'main'],
              cwd: tempDir,
              fakeBinDir,
            });

            expect(result.status).toBe(0);
            expect(result.stdout).toContain("let's watch");
            expect(result.stdout).toContain('done!');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
          } finally {
            cleanup();
          }
        });
      });
    });

    given('[case9] tag workflows already passed', () => {
      when('[t0] --watch --into prod --from main is called', () => {
        then('it exits with done immediately', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: {
              branch: 'main',
              releasePr: 'merged',
              tagWorkflows: 'passed',
              priorReleaseTitle: 'chore(release): v1.2.3',
            },
            slug: 'p5-tag-passed',
          });

          try {
            const result = runScript({
              args: ['--watch', '--into', 'prod', '--from', 'main'],
              cwd: tempDir,
              fakeBinDir,
            });

            expect(result.status).toBe(0);
            expect(result.stdout).toContain('done!');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
          } finally {
            cleanup();
          }
        });
      });
    });

    given('[case10] tag workflows failed', () => {
      when('[t0] --watch --into prod --from main is called', () => {
        then('it exits with failed status', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: {
              branch: 'main',
              releasePr: 'merged',
              tagWorkflows: 'failed',
              priorReleaseTitle: 'chore(release): v1.2.3',
            },
            slug: 'p5-tag-failed',
          });

          try {
            const result = runScript({
              args: ['--watch', '--into', 'prod', '--from', 'main'],
              cwd: tempDir,
              fakeBinDir,
            });

            expect(result.status).toBe(2);
            expect(result.stdout).toContain('failed');
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
          } finally {
            cleanup();
          }
        });
      });
    });

    given('[case11] tag starts unfound then appears with transitions', () => {
      when('[t0] --watch --into prod --from main is called', () => {
        then('it transitions through inflight to done', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: {
              branch: 'main',
              releasePr: 'merged',
              // unfound initially, transitions: true will make it appear
              tagWorkflows: 'unfound',
              priorReleaseTitle: 'chore(release): v1.2.3',
              transitions: true,
            },
            slug: 'p5-tag-await',
          });

          try {
            const result = runScript({
              args: ['--watch', '--into', 'prod', '--from', 'main'],
              cwd: tempDir,
              fakeBinDir,
            });

            // mock transitions unfound → inflight → passed via counter
            // verify successful completion
            expect(result.stdout).toContain('done!');
            expect(result.status).toBe(0);
            expect(asTimeStable(result.stdout)).toMatchSnapshot();
          } finally {
            cleanup();
          }
        });
      });
    });
  });
});
