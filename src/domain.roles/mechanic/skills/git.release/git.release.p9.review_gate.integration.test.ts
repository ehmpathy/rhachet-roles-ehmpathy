import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

import {
  asSkillExitStatus,
  SKILL_SPAWN_TIMEOUT_MS,
} from './.test/infra/asSkillExitStatus';
import {
  type ReviewFixture,
  type Scene,
  writeSceneGhMock,
} from './.test/infra/mockGh';
import { asSnapshotReadyWithAnsi } from './.test/infra/snapshotOps';

/**
 * .what = p9: apply refuses a feature pr with no human approval
 * .why = clamps ehmpathy/rhachet-roles-ehmpathy#1339 — sdk-aws-lambda#79
 *        merged with zero reviews via `git.release --into prod --apply --dirty allow`
 * .vision = .behavior/v2026_11_15.fix-release-refuses-unreviewed-pr/1.vision.yield.md
 */

jest.setTimeout(150000);

const SKILL_PATH = path.join(
  __dirname,
  '../../../../../dist/domain.roles/mechanic/skills/git.release/git.release.sh',
);

// ============================================================================
// review fixtures
// ============================================================================

const review = (input: Partial<ReviewFixture>): ReviewFixture => ({
  login: 'reef-keeper',
  type: 'User',
  association: 'MEMBER',
  state: 'APPROVED',
  submitted_at: '2026-01-01T00:00:00Z',
  ...input,
});

const REVIEWS_NONE: ReviewFixture[] = [];

// ============================================================================
// test infrastructure
// ============================================================================

const setupScene = (input: {
  scene: Scene;
  slug: string;
}): { tempDir: string; fakeBinDir: string; stateDir: string } => {
  const tempDir = genTempDir({ slug: input.slug, git: true });
  const fakeBinDir = path.join(tempDir, '.fakebin');
  fs.mkdirSync(fakeBinDir, { recursive: true });
  const stateDir = path.join(tempDir, '.mock-state');
  fs.mkdirSync(stateDir, { recursive: true });

  writeSceneGhMock({ scene: input.scene, mockBinDir: fakeBinDir, stateDir });

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
  spawnSync('git', ['tag', 'v1.2.3'], { cwd: tempDir });
  spawnSync('git', ['checkout', '-b', 'turtle/feature-x'], { cwd: tempDir });

  // commit quota granted: the gate must hold even with infinite uses
  const meterDir = path.join(tempDir, '.meter');
  fs.mkdirSync(meterDir, { recursive: true });
  fs.writeFileSync(
    path.join(meterDir, 'git.commit.uses.jsonc'),
    JSON.stringify({ uses: 'infinite', push: 'allow', stage: 'allow' }),
  );

  return { tempDir, fakeBinDir, stateDir };
};

const runSkill = (
  args: string[],
  env: { tempDir: string; fakeBinDir: string; stateDir: string },
): { stdout: string; stderr: string; status: number; ghCalls: string[] } => {
  const result = spawnSync('bash', [SKILL_PATH, ...args], {
    cwd: env.tempDir,
    env: {
      ...process.env,
      PATH: /* .mock = gh, git, rhachet — contract in .test/infra/mockGh.ts */ `${env.fakeBinDir}:${process.env.PATH}`,
      TERM: 'dumb',
      HOME: env.tempDir,
      EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token',
      GIT_RELEASE_TEST_MODE: 'true',
    },
    encoding: 'utf-8',
    timeout: SKILL_SPAWN_TIMEOUT_MS,
  });

  const debugLog = path.join(env.stateDir, 'gh-debug.log');
  const ghCalls = fs.existsSync(debugLog)
    ? fs.readFileSync(debugLog, 'utf-8').split('\n').filter(Boolean)
    : [];

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: asSkillExitStatus({ result, timeoutMs: SKILL_SPAWN_TIMEOUT_MS }),
    ghCalls,
  };
};

/** .what = true if the skill asked github to merge (auto or direct) */
const isMergeCalled = (ghCalls: string[]): boolean =>
  ghCalls.some(
    (call) =>
      call.startsWith('GH: pr merge') && !call.includes('--disable-auto'),
  );

const isDisableCalled = (ghCalls: string[]): boolean =>
  ghCalls.some((call) => call.includes('--disable-auto'));

const isReviewReadCalled = (ghCalls: string[]): boolean =>
  ghCalls.some(
    (call) => call.startsWith('GH: api') && call.includes('/reviews'),
  );

const run = (input: { scene: Scene; slug: string; args: string[] }) =>
  runSkill(input.args, setupScene({ scene: input.scene, slug: input.slug }));

// ============================================================================
// tests
// ============================================================================

describe('git.release.p9.review_gate', () => {
  given('[case1] feature pr #42, checks passed, no reviews', () => {
    const scene: Scene = {
      branch: 'feat',
      featPr: 'passed:wout-automerge',
      featPrReviews: REVIEWS_NONE,
    };

    when('[t0] --into main --apply', () => {
      then(
        'exit 2, names the pr, says a human approval is owed, naught merged',
        () => {
          const result = run({
            scene,
            slug: 'p9-c1-t0',
            args: ['--into', 'main', '--apply'],
          });
          expect(result.status).toEqual(2);
          expect(result.stdout).toContain(
            '✋ ConstraintError: pr #42 has no approval from a human',
          );
          expect(result.stderr).toContain(
            'pr #42 has no approval from a human',
          );
          expect(isMergeCalled(result.ghCalls)).toBe(false);
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        },
      );
    });

    when('[t1] --into prod --apply --dirty allow', () => {
      then('exit 2; --dirty allow does not lift; naught merged', () => {
        const result = run({
          scene,
          slug: 'p9-c1-t1',
          args: ['--into', 'prod', '--apply', '--dirty', 'allow'],
        });
        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('pr #42 has no approval from a human');
        expect(isMergeCalled(result.ghCalls)).toBe(false);
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] --into main --mode apply (no --watch)', () => {
      then('exit 2; naught merged', () => {
        const result = run({
          scene,
          slug: 'p9-c1-t2',
          args: ['--into', 'main', '--mode', 'apply'],
        });
        expect(result.status).toEqual(2);
        expect(isMergeCalled(result.ghCalls)).toBe(false);
      });
    });

    when('[t3] --into main --apply --watch', () => {
      then('exit 2; naught merged', () => {
        const result = run({
          scene,
          slug: 'p9-c1-t3',
          args: ['--into', 'main', '--apply', '--watch'],
        });
        expect(result.status).toEqual(2);
        expect(isMergeCalled(result.ghCalls)).toBe(false);
      });
    });

    when('[t4] --into prod --apply --retry', () => {
      then('exit 2; --retry does not lift; naught merged', () => {
        const result = run({
          scene,
          slug: 'p9-c1-t4',
          args: ['--into', 'prod', '--apply', '--retry'],
        });
        expect(result.status).toEqual(2);
        expect(isMergeCalled(result.ghCalls)).toBe(false);
      });
    });
  });

  given(
    '[case2] feature pr #42, checks passed, a human member approved',
    () => {
      when('[t0] --into main --apply', () => {
        then('automerge enabled; merges as before; exit 0', () => {
          const result = run({
            scene: { branch: 'feat', featPr: 'passed:wout-automerge' },
            slug: 'p9-c2-t0',
            args: ['--into', 'main', '--apply'],
          });
          expect(result.status).toEqual(0);
          expect(result.stdout).not.toContain('no approval from a human');
          expect(isMergeCalled(result.ghCalls)).toBe(true);
          expect(isDisableCalled(result.ghCalls)).toBe(false);
        });
      });
    },
  );

  given('[case3] only bots, robots, or outsiders approved', () => {
    const cases: Array<{
      slug: string;
      desc: string;
      reviews: ReviewFixture[];
    }> = [
      {
        slug: 'p9-c3-bot',
        desc: 'app bot (type Bot, [bot] login)',
        reviews: [
          review({
            login: 'ehm-a-seaturtle[bot]',
            type: 'Bot',
            association: 'NONE',
          }),
        ],
      },
      {
        slug: 'p9-c3-robot',
        desc: 'clone robot account (type User, MEMBER, on the roster)',
        reviews: [review({ login: 'ehm-seaturtle' })],
      },
      {
        slug: 'p9-c3-outsider',
        desc: 'outsider human on a public repo (association NONE)',
        reviews: [review({ login: 'drive-by-surfer', association: 'NONE' })],
      },
      {
        slug: 'p9-c3-contributor',
        desc: 'past contributor with no current role',
        reviews: [review({ login: 'old-wave', association: 'CONTRIBUTOR' })],
      },
    ];

    cases.forEach((thisCase) => {
      when(`[t0] --apply, approved by ${thisCase.desc}`, () => {
        then('exit 2; naught merged', () => {
          const result = run({
            scene: {
              branch: 'feat',
              featPr: 'passed:wout-automerge',
              featPrReviews: thisCase.reviews,
            },
            slug: thisCase.slug,
            args: ['--into', 'main', '--apply'],
          });
          expect(result.status).toEqual(2);
          expect(result.stdout).toContain(
            'pr #42 has no approval from a human',
          );
          expect(isMergeCalled(result.ghCalls)).toBe(false);
        });
      });
    });
  });

  given('[case4] no reviews, plan and watch modes', () => {
    const scene: Scene = {
      branch: 'feat',
      featPr: 'passed:wout-automerge',
      featPrReviews: REVIEWS_NONE,
    };

    when('[t0] plan (no flags)', () => {
      then('exit 0; no review read; no refusal', () => {
        const result = run({ scene, slug: 'p9-c4-t0', args: [] });
        expect(result.status).toEqual(0);
        expect(result.stdout).not.toContain('no approval from a human');
        expect(isReviewReadCalled(result.ghCalls)).toBe(false);
      });
    });

    when('[t1] --watch', () => {
      then('no review read; no refusal; naught merged', () => {
        const result = run({ scene, slug: 'p9-c4-t1', args: ['--watch'] });
        expect(result.stdout).not.toContain('no approval from a human');
        expect(isReviewReadCalled(result.ghCalls)).toBe(false);
        expect(isMergeCalled(result.ghCalls)).toBe(false);
      });
    });
  });

  given('[case5] the review read fails', () => {
    when('[t0] --apply, no automerge on', () => {
      then('exit 1; MalfunctionError; naught merged', () => {
        const result = run({
          scene: {
            branch: 'feat',
            featPr: 'passed:wout-automerge',
            featPrReviews: 'read-fails',
          },
          slug: 'p9-c5-t0',
          args: ['--into', 'main', '--apply'],
        });
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain(
          '💥 MalfunctionError: could not read the reviews on pr #42',
        );
        expect(result.stderr).toContain('could not read the reviews on pr #42');
        expect(isMergeCalled(result.ghCalls)).toBe(false);
        expect(isDisableCalled(result.ghCalls)).toBe(false);
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] --apply, automerge already on', () => {
      then('automerge disabled; exit 1', () => {
        const result = run({
          scene: {
            branch: 'feat',
            featPr: 'inflight:with-automerge',
            featPrReviews: 'read-fails',
          },
          slug: 'p9-c5-t1',
          args: ['--into', 'main', '--apply'],
        });
        expect(result.status).toEqual(1);
        expect(isDisableCalled(result.ghCalls)).toBe(true);
        expect(result.stdout).toContain('automerge was on; disabled');
        expect(isMergeCalled(result.ghCalls)).toBe(false);
      });
    });
  });

  given('[case6] withdrawn, vetoed, or non-decisive reviews', () => {
    const cases: Array<{
      slug: string;
      desc: string;
      reviews: ReviewFixture[];
      expectApproved: boolean;
    }> = [
      {
        slug: 'p9-c6-cr-only',
        desc: 'CHANGES_REQUESTED only',
        reviews: [review({ state: 'CHANGES_REQUESTED' })],
        expectApproved: false,
      },
      {
        slug: 'p9-c6-withdrawn',
        desc: 'APPROVED then CHANGES_REQUESTED by the same human',
        reviews: [
          review({ state: 'APPROVED', submitted_at: '2026-01-01T00:00:00Z' }),
          review({
            state: 'CHANGES_REQUESTED',
            submitted_at: '2026-01-02T00:00:00Z',
          }),
        ],
        expectApproved: false,
      },
      {
        slug: 'p9-c6-withdrawn-unsorted',
        desc: 'APPROVED then CHANGES_REQUESTED, listed out of order',
        reviews: [
          review({
            state: 'CHANGES_REQUESTED',
            submitted_at: '2026-01-02T00:00:00Z',
          }),
          review({ state: 'APPROVED', submitted_at: '2026-01-01T00:00:00Z' }),
        ],
        expectApproved: false,
      },
      {
        slug: 'p9-c6-dismissed',
        desc: 'APPROVED then DISMISSED',
        reviews: [
          review({ state: 'APPROVED', submitted_at: '2026-01-01T00:00:00Z' }),
          review({ state: 'DISMISSED', submitted_at: '2026-01-02T00:00:00Z' }),
        ],
        expectApproved: false,
      },
      {
        slug: 'p9-c6-commented-only',
        desc: 'COMMENTED only',
        reviews: [review({ state: 'COMMENTED' })],
        expectApproved: false,
      },
      {
        slug: 'p9-c6-veto',
        desc: 'human-a APPROVED + human-b CHANGES_REQUESTED',
        reviews: [
          review({ login: 'reef-keeper', state: 'APPROVED' }),
          review({ login: 'tide-watcher', state: 'CHANGES_REQUESTED' }),
        ],
        expectApproved: false,
      },
      {
        slug: 'p9-c6-approved-later-comment',
        desc: 'APPROVED then a later COMMENTED by the same human',
        reviews: [
          review({ state: 'APPROVED', submitted_at: '2026-01-01T00:00:00Z' }),
          review({ state: 'COMMENTED', submitted_at: '2026-01-02T00:00:00Z' }),
        ],
        expectApproved: true,
      },
      {
        slug: 'p9-c6-approved-plus-comment',
        desc: 'human-a APPROVED + human-b COMMENTED',
        reviews: [
          review({ login: 'reef-keeper', state: 'APPROVED' }),
          review({ login: 'tide-watcher', state: 'COMMENTED' }),
        ],
        expectApproved: true,
      },
      {
        slug: 'p9-c6-robot-plus-human',
        desc: 'robot APPROVED + human member APPROVED',
        reviews: [
          review({ login: 'ehm-seaturtle' }),
          review({ login: 'reef-keeper' }),
        ],
        expectApproved: true,
      },
    ];

    cases.forEach((thisCase) => {
      when(`[t0] --apply, ${thisCase.desc}`, () => {
        then(
          thisCase.expectApproved
            ? 'proceeds to merge'
            : 'exit 2; naught merged',
          () => {
            const result = run({
              scene: {
                branch: 'feat',
                featPr: 'passed:wout-automerge',
                featPrReviews: thisCase.reviews,
              },
              slug: thisCase.slug,
              args: ['--into', 'main', '--apply'],
            });
            if (thisCase.expectApproved) {
              expect(result.status).toEqual(0);
              expect(isMergeCalled(result.ghCalls)).toBe(true);
              return;
            }
            expect(result.status).toEqual(2);
            expect(isMergeCalled(result.ghCalls)).toBe(false);
          },
        );
      });
    });
  });

  given(
    '[case7] unreviewed pr with automerge already on (an earlier run)',
    () => {
      when('[t0] --into main --apply', () => {
        then('automerge disabled, then exit 2; naught merged', () => {
          const result = run({
            scene: {
              branch: 'feat',
              featPr: 'inflight:with-automerge',
              featPrReviews: REVIEWS_NONE,
            },
            slug: 'p9-c7-t0',
            args: ['--into', 'main', '--apply'],
          });
          expect(result.status).toEqual(2);
          expect(isDisableCalled(result.ghCalls)).toBe(true);
          expect(result.stdout).toContain(
            'automerge was on; disabled, so github cannot merge it',
          );
          expect(isMergeCalled(result.ghCalls)).toBe(false);
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        });
      });

      when('[t1] --into main --apply, and the disable fails', () => {
        then('exit 1; says automerge is still on', () => {
          const result = run({
            scene: {
              branch: 'feat',
              featPr: 'inflight:with-automerge',
              featPrReviews: REVIEWS_NONE,
              disableAutoFails: true,
            },
            slug: 'p9-c7-t1',
            args: ['--into', 'main', '--apply'],
          });
          expect(result.status).toEqual(1);
          expect(result.stdout).toContain('automerge is STILL ON');
          expect(result.stdout).toContain('gh pr merge 42 --disable-auto');
          expect(isMergeCalled(result.ghCalls)).toBe(false);
        });
      });

      when('[t2] --into main --apply, approved by a human member', () => {
        then('no disable; proceeds', () => {
          const result = run({
            scene: { branch: 'feat', featPr: 'inflight:with-automerge' },
            slug: 'p9-c7-t2',
            args: ['--into', 'main', '--apply'],
          });
          expect(isDisableCalled(result.ghCalls)).toBe(false);
          expect(result.stdout).not.toContain('no approval from a human');
        });
      });
    },
  );
});
