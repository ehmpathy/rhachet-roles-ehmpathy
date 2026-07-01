/**
 * .what = dedicated suite for the --from main "--why" guard
 * .why  = a non-human on a feature branch must articulate --why to use
 *         --from main; otherwise the skill blocks (exit 2) and steers them to
 *         --into prod. this suite exhaustively covers the guard truth table.
 *
 * truth table:
 *   | branch | human | --why        | outcome        |
 *   |--------|-------|--------------|----------------|
 *   | feat   | no    | (absent)     | BLOCKED exit 2 |
 *   | feat   | no    | "reason"     | allowed        |
 *   | feat   | no    | "   " (ws)   | BLOCKED exit 2 |
 *   | feat   | yes   | (absent)     | allowed        |
 *   | main   | no    | (absent)     | allowed (skip) |
 *
 * the guard fires early (before gh calls), so BLOCKED cases never touch the
 * mock. allowed cases proceed through the full flow against the gh mock.
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

import { type Scene, writeSceneGhMock } from './.test/infra/mockGh';
import { asSnapshotReadyWithAnsi } from './.test/infra/snapshotOps';

// all tests use mocked gh CLI, so no remote calls - 5s timeout is plenty
jest.setTimeout(5000);

const SKILL_PATH = path.join(
  __dirname,
  '../../../../../dist/domain.roles/mechanic/skills/git.release/git.release.sh',
);

// a clean scene where the full --from main flow completes with exit 0
const sceneAllDone: Omit<Scene, 'featPr'> = {
  branch: 'feat',
  releasePr: 'merged',
  tagWorkflows: 'passed',
};

const setupScene = (input: {
  scene: Omit<Scene, 'featPr'>;
  slug: string;
  checkoutFeatureBranch: boolean;
}): { tempDir: string; fakeBinDir: string; cleanup: () => void } => {
  const tempDir = genTempDir({ slug: input.slug, git: true });
  const fakeBinDir = path.join(tempDir, '.fakebin');
  fs.mkdirSync(fakeBinDir, { recursive: true });

  const stateDir = path.join(tempDir, '.mock-state');
  fs.mkdirSync(stateDir, { recursive: true });

  // --from main skips feat PR, so featPr is undefined
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
    {
      cwd: tempDir,
    },
  );
  spawnSync(
    'git',
    ['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main'],
    { cwd: tempDir },
  );

  // create a release tag (must match releaseTag in genGhMockExecutable)
  spawnSync('git', ['tag', 'v1.3.0'], { cwd: tempDir });

  // optionally move onto a feature branch; else pin the current branch to "main"
  // so it matches the default branch (origin/HEAD) and the guard skips correctly
  if (input.checkoutFeatureBranch) {
    spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], { cwd: tempDir });
  } else {
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
  env: { tempDir: string; fakeBinDir: string; human: boolean },
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
      // only mark human when the case explicitly tests a human caller
      ...(env.human ? { __I_AM_HUMAN: 'true' } : {}),
    },
    encoding: 'utf-8',
    timeout: 10000,
  });

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status ?? 1,
  };
};

describe('git.release.p7.from_main.why_guard', () => {
  given('[case1] non-human on a feature branch, --from main, no --why', () => {
    when('[t0] rhx git.release --from main --into prod', () => {
      then('blocks with exit 2 and steers to --into prod', () => {
        const { tempDir, fakeBinDir, cleanup } = setupScene({
          scene: sceneAllDone,
          slug: 'p7-blocked-no-why',
          checkoutFeatureBranch: true,
        });
        try {
          const result = runSkill(['--from', 'main', '--into', 'prod'], {
            tempDir,
            fakeBinDir,
            human: false,
          });
          expect(result.status).toEqual(2);
          expect(result.stdout).toContain('--from main needs a --why');
          expect(result.stdout).toContain('rhx git.release --into prod');
          // failure must also reach stderr (rule.require.skill-output-streams)
          expect(result.stderr).toContain('--from main needs a --why');
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  given(
    '[case2] non-human on a feature branch, --from main, --why "reason"',
    () => {
      when(
        '[t0] rhx git.release --from main --into prod --why "<reason>"',
        () => {
          then('allows the release (not blocked)', () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene: sceneAllDone,
              slug: 'p7-allowed-with-why',
              checkoutFeatureBranch: true,
            });
            try {
              const result = runSkill(
                [
                  '--from',
                  'main',
                  '--into',
                  'prod',
                  '--why',
                  'release-please pr stuck, manual recovery',
                ],
                { tempDir, fakeBinDir, human: false },
              );
              expect(result.status).toEqual(0);
              expect(result.stdout).not.toContain('--from main needs a --why');
              expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
            } finally {
              cleanup();
            }
          });
        },
      );
    },
  );

  given(
    '[case3] non-human on a feature branch, --from main, whitespace --why',
    () => {
      when('[t0] rhx git.release --from main --into prod --why "   "', () => {
        then('blocks with exit 2 (empty articulation does not count)', () => {
          const { tempDir, fakeBinDir, cleanup } = setupScene({
            scene: sceneAllDone,
            slug: 'p7-blocked-whitespace-why',
            checkoutFeatureBranch: true,
          });
          try {
            const result = runSkill(
              ['--from', 'main', '--into', 'prod', '--why', '   '],
              { tempDir, fakeBinDir, human: false },
            );
            expect(result.status).toEqual(2);
            expect(result.stdout).toContain('--from main needs a --why');
            // failure must also reach stderr (rule.require.skill-output-streams)
            expect(result.stderr).toContain('--from main needs a --why');
            expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
          } finally {
            cleanup();
          }
        });
      });
    },
  );

  given('[case4] human on a feature branch, --from main, no --why', () => {
    when('[t0] rhx git.release --from main --into prod (human/TTY)', () => {
      then('allows the release (humans are not gated)', () => {
        const { tempDir, fakeBinDir, cleanup } = setupScene({
          scene: sceneAllDone,
          slug: 'p7-allowed-human',
          checkoutFeatureBranch: true,
        });
        try {
          const result = runSkill(['--from', 'main', '--into', 'prod'], {
            tempDir,
            fakeBinDir,
            human: true,
          });
          expect(result.status).toEqual(0);
          expect(result.stdout).not.toContain('--from main needs a --why');
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case5] non-human ON main, --from main, no --why', () => {
    when(
      '[t0] rhx git.release --from main --into prod (already on main)',
      () => {
        then(
          'allows the release (guard skipped — no feature branch to skip)',
          () => {
            const { tempDir, fakeBinDir, cleanup } = setupScene({
              scene: { ...sceneAllDone, branch: 'main' },
              slug: 'p7-allowed-on-main',
              checkoutFeatureBranch: false,
            });
            try {
              const result = runSkill(['--from', 'main', '--into', 'prod'], {
                tempDir,
                fakeBinDir,
                human: false,
              });
              expect(result.status).toEqual(0);
              expect(result.stdout).not.toContain('--from main needs a --why');
              expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
            } finally {
              cleanup();
            }
          },
        );
      },
    );
  });

  given('[case6] --why supplied WITHOUT --from main (inert)', () => {
    when('[t0] rhx git.release --why "<reason>" on a feature branch', () => {
      then('--why is accepted and the guard is skipped (never fires)', () => {
        const { tempDir, fakeBinDir, cleanup } = setupScene({
          scene: sceneAllDone,
          slug: 'p7-why-without-from-main',
          checkoutFeatureBranch: true,
        });
        try {
          // no --from main: the guard must not apply, and --why must parse cleanly
          const result = runSkill(['--why', 'inert reason'], {
            tempDir,
            fakeBinDir,
            human: false,
          });
          // guard must NOT fire — there is no --from main
          expect(result.stdout).not.toContain('--from main needs a --why');
          // --why must be a recognized arg, never an unknown-argument error
          expect(result.stdout).not.toContain('unknown argument');
          expect(result.stderr).not.toContain('unknown argument');
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });
});
