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
  MOCK_FEAT_HEAD_SHA,
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
 *
 * .mock = gh (and git push, rhachet keyrack), via a fake bin on PATH
 *         (writeSceneGhMock in .test/infra/mockGh.ts); the skill itself is real
 * .why  = each case needs a pr state github cannot be made to hold on demand
 *         (a robot approval, a stale approval, a push mid-watch, a review read
 *         that fails), and a real --apply would merge a real pr: the very harm
 *         this gate exists to stop
 * .real = git.release.external.contracts.integration.test.ts: the real gh
 *         reviews read with no credential (fails closed), and a live read of
 *         a real approval on a real pr through the shipped --jq filter +
 *         verdict. the live merge pin against a moved head needs a sandbox
 *         write grant a human holds; it is itemized as fulcrum F13
 */

jest.setTimeout(150000);

const SKILL_PATH = path.join(
  __dirname,
  '../../../../../dist/domain.roles/mechanic/skills/git.release/git.release.sh',
);

// ============================================================================
// review fixtures
// ============================================================================

/**
 * .what = one review, a human member's approval of the current head unless overridden
 * .why  = each case states only the field it varies
 */
const review = (input: Partial<ReviewFixture>): ReviewFixture => ({
  login: 'reef-keeper',
  type: 'User',
  association: 'MEMBER',
  state: 'APPROVED',
  submitted_at: '2026-01-01T00:00:00Z',
  commit_id: MOCK_FEAT_HEAD_SHA,
  ...input,
});

const REVIEWS_NONE: ReviewFixture[] = [];

/** .what = a commit the pr held before its current head */
const SHA_OLDER = '0ldc0de00ldc0de00ldc0de00ldc0de00ldc0de0';

// ============================================================================
// test infrastructure
// ============================================================================

/**
 * .what = a temp feature-branch repo with a scene gh mock and a granted commit quota
 * .why  = every case runs the real skill against one fixed pr #42 scene;
 *         the quota is infinite so the gate is proven to hold regardless
 */
const setupScene = (input: {
  scene: Scene;
  slug: string;
}): {
  tempDir: string;
  fakeBinDir: string;
  stateDir: string;
  cleanup: () => void;
} => {
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

  const cleanup = () => fs.rmSync(tempDir, { recursive: true, force: true });

  return { tempDir, fakeBinDir, stateDir, cleanup };
};

/**
 * .what = run the built skill in a scene; collect output, exit, and gh calls
 * .why  = the gh call log is how a case proves naught was merged
 */
const runSkill = (input: {
  args: string[];
  env: { tempDir: string; fakeBinDir: string; stateDir: string };
  envExtra: Record<string, string>;
}): { stdout: string; stderr: string; status: number; ghCalls: string[] } => {
  const { args, env } = input;
  const result = spawnSync('bash', [SKILL_PATH, ...args], {
    cwd: env.tempDir,
    env: {
      ...process.env,
      ...input.envExtra,
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

/**
 * .what = true if the skill asked github to merge (auto or direct)
 * .why  = `pr merge --disable-auto` turns a merge off, so it is excluded
 */
const isMergeCalled = (ghCalls: string[]): boolean =>
  ghCalls.some(
    (call) =>
      call.startsWith('GH: pr merge') && !call.includes('--disable-auto'),
  );

/**
 * .what = true if the skill asked github to turn automerge off
 * .why  = proves an automerge an earlier run left on was disarmed
 */
const isDisableCalled = (ghCalls: string[]): boolean =>
  ghCalls.some((call) => call.includes('--disable-auto'));

/**
 * .what = true if the skill read the reviews of any pr
 * .why  = proves plan and watch never touch the gate
 */
const isReviewReadCalled = (ghCalls: string[]): boolean =>
  ghCalls.some(
    (call) => call.startsWith('GH: api') && call.includes('/reviews'),
  );

/**
 * .what = every merge call (auto or direct) the skill made on one named pr
 * .why  = proves which head, if any, the merge was pinned to
 */
const getMergeCallsForPr = (input: {
  ghCalls: string[];
  prNumber: number;
}): string[] =>
  input.ghCalls.filter(
    (call) =>
      call.startsWith(`GH: pr merge ${input.prNumber}`) &&
      !call.includes('--disable-auto'),
  );

/**
 * .what = true if the skill read the reviews of one named pr
 * .why  = proves the gate reads the feature pr, not another
 */
const isReviewReadCalledForPr = (input: {
  ghCalls: string[];
  prNumber: number;
}): boolean =>
  input.ghCalls.some(
    (call) =>
      call.startsWith('GH: api') &&
      call.includes(`/pulls/${input.prNumber}/reviews`),
  );

/**
 * .what = set up a scene, run the skill once, then remove the temp repo
 * .why  = one call per case; no temp repo outlives its case
 */
const run = (input: {
  scene: Scene;
  slug: string;
  args: string[];
  envExtra?: Record<string, string>;
}) => {
  const scene = setupScene({ scene: input.scene, slug: input.slug });
  try {
    return runSkill({
      args: input.args,
      env: scene,
      envExtra: input.envExtra ?? {},
    });
  } finally {
    scene.cleanup();
  }
};

// ============================================================================
// tests
// ============================================================================

describe('git.release.p9.review_gate', () => {
  given('[case0] the incident replay, in one repo (E0)', () => {
    when(
      '[t0] route complete, --into prod --apply --dirty allow on an unreviewed pr; then a human approves; then the same command again',
      () => {
        then(
          'the first run is refused with naught merged; the re-run ships to prod',
          () => {
            const sceneProd: Scene = {
              branch: 'feat',
              featPr: 'inflight',
              transitions: true,
              releasePr: 'passed:wout-automerge',
              tagWorkflows: 'passed',
            };
            const args = ['--into', 'prod', '--apply', '--dirty', 'allow'];
            const env = setupScene({
              scene: { ...sceneProd, featPrReviews: REVIEWS_NONE },
              slug: 'p9-c0-t0',
            });
            try {
              // the incident: an unreviewed pr, a lift flag, a commit quota
              const refused = runSkill({ args, env, envExtra: {} });
              expect(refused.status).toEqual(2);
              expect(refused.stdout).toContain(
                '✋ ConstraintError: pr #42 has no approval from a human',
              );
              expect(isMergeCalled(refused.ghCalls)).toBe(false);

              // the human approves on github: the same pr now holds an approval
              const stateDirAfter = path.join(env.tempDir, '.mock-state-after');
              fs.mkdirSync(stateDirAfter, { recursive: true });
              writeSceneGhMock({
                scene: sceneProd,
                mockBinDir: env.fakeBinDir,
                stateDir: stateDirAfter,
              });

              // the clone re-runs the same command; it ships
              const shipped = runSkill({
                args,
                env: { ...env, stateDir: stateDirAfter },
                envExtra: {},
              });
              expect(shipped.status).toEqual(0);
              expect(shipped.stdout).not.toContain('no approval from a human');
              expect(
                getMergeCallsForPr({ ghCalls: shipped.ghCalls, prNumber: 42 }),
              ).toHaveLength(1);
              expect(shipped.stdout).toContain('publish.yml');
              expect(
                asSnapshotReadyWithAnsi(
                  `${refused.stdout}\n--- after the human approves ---\n\n${shipped.stdout}`,
                ),
              ).toMatchSnapshot();
            } finally {
              env.cleanup();
            }
          },
        );
      },
    );
  });

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
          expect(result.stdout).toContain('why: no reviews yet');
          expect(result.stderr).toContain(
            'pr #42 has no approval from a human',
          );
          expect(result.stdout).toContain(
            'ask your human to review: https://github.com/ehmpathy/surf-shop/pull/42',
          );
          expect(
            isReviewReadCalledForPr({ ghCalls: result.ghCalls, prNumber: 42 }),
          ).toBe(true);
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
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] --into main --apply --watch', () => {
      then('exit 2; naught merged; no watch poll begins', () => {
        const result = run({
          scene,
          slug: 'p9-c1-t3',
          args: ['--into', 'main', '--apply', '--watch'],
        });
        expect(result.status).toEqual(2);
        expect(isMergeCalled(result.ghCalls)).toBe(false);
        expect(result.stdout).not.toContain("let's watch");
        expect(result.stdout).not.toContain('💤');
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
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
        expect(result.stdout).toContain('pr #42 has no approval from a human');
        expect(isMergeCalled(result.ghCalls)).toBe(false);
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
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
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        });
      });
    },
  );

  given('[case3] only bots, robots, or outsiders approved', () => {
    const cases: Array<{
      slug: string;
      desc: string;
      reviews: ReviewFixture[];
      expectCause: string;
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
        expectCause:
          'why: the approval by @ehm-a-seaturtle[bot] does not count: it is a bot',
      },
      {
        slug: 'p9-c3-bot-login-only',
        desc: 'a [bot] login that reads type User, MEMBER, off the roster',
        reviews: [review({ login: 'kelp-sync[bot]', type: 'User' })],
        expectCause:
          'why: the approval by @kelp-sync[bot] does not count: it is a bot',
      },
      {
        slug: 'p9-c3-robot',
        desc: 'clone robot account (type User, MEMBER, on the roster)',
        reviews: [review({ login: 'ehm-seaturtle' })],
        expectCause:
          'why: the approval by @ehm-seaturtle does not count: it is a robot account',
      },
      {
        slug: 'p9-c3-outsider',
        desc: 'outsider human on a public repo (association NONE)',
        reviews: [review({ login: 'drive-by-surfer', association: 'NONE' })],
        expectCause:
          'why: the approval by @drive-by-surfer does not count: no authority on the repo (association: none)',
      },
      {
        slug: 'p9-c3-contributor',
        desc: 'past contributor with no current role',
        reviews: [review({ login: 'old-wave', association: 'CONTRIBUTOR' })],
        expectCause:
          'why: the approval by @old-wave does not count: no authority on the repo (association: contributor)',
      },
    ];

    cases.forEach((thisCase, index) => {
      when(`[t${index}] --apply, approved by ${thisCase.desc}`, () => {
        then(
          'exit 2; names why the approval does not count; naught merged',
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
            expect(result.status).toEqual(2);
            expect(result.stdout).toContain(
              'pr #42 has no approval from a human',
            );
            expect(result.stdout).toContain(thisCase.expectCause);
            expect(isMergeCalled(result.ghCalls)).toBe(false);
            expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
          },
        );
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
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] --watch', () => {
      then('no review read; no refusal; naught merged', () => {
        const result = run({ scene, slug: 'p9-c4-t1', args: ['--watch'] });
        expect(result.stdout).not.toContain('no approval from a human');
        expect(isReviewReadCalled(result.ghCalls)).toBe(false);
        expect(isMergeCalled(result.ghCalls)).toBe(false);
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
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
        expect(result.stdout).toContain(
          '💥 MalfunctionError: could not read the reviews on pr #42',
        );
        expect(result.stdout).toContain('automerge disabled on pr #42');
        expect(isMergeCalled(result.ghCalls)).toBe(false);
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] --apply, automerge already on, and the disable fails', () => {
      then('exit 1; says automerge is still on; names the hand fix', () => {
        const result = run({
          scene: {
            branch: 'feat',
            featPr: 'inflight:with-automerge',
            featPrReviews: 'read-fails',
            disableAutoFails: true,
          },
          slug: 'p9-c5-t2',
          args: ['--into', 'main', '--apply'],
        });
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain(
          '💥 MalfunctionError: could not read the reviews on pr #42',
        );
        expect(result.stdout).toContain('automerge is still on');
        expect(result.stdout).toContain('gh pr merge 42 --disable-auto');
        expect(result.stderr).toContain('automerge is still on');
        expect(isDisableCalled(result.ghCalls)).toBe(true);
        expect(isMergeCalled(result.ghCalls)).toBe(false);
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] plan (no flags)', () => {
      then(
        'exit 0; plan never reads reviews, so the fault cannot block it',
        () => {
          const result = run({
            scene: {
              branch: 'feat',
              featPr: 'passed:wout-automerge',
              featPrReviews: 'read-fails',
            },
            slug: 'p9-c5-t3',
            args: ['--into', 'main'],
          });
          expect(result.status).toEqual(0);
          expect(isReviewReadCalled(result.ghCalls)).toBe(false);
          expect(result.stdout).not.toContain('MalfunctionError');
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        },
      );
    });
  });

  given('[case6] withdrawn, vetoed, stale, or non-decisive reviews', () => {
    // .note = expectCause null means the gate approves; a string is the `why:` it must name
    const cases: Array<{
      slug: string;
      desc: string;
      reviews: ReviewFixture[];
      expectCause: string | null;
    }> = [
      {
        slug: 'p9-c6-cr-only',
        desc: 'CHANGES_REQUESTED only',
        reviews: [review({ state: 'CHANGES_REQUESTED' })],
        expectCause:
          'why: changes requested by @reef-keeper; address them, then ask for a fresh review',
      },
      {
        slug: 'p9-c6-stale',
        desc: 'APPROVED on an older commit than the head',
        reviews: [review({ commit_id: SHA_OLDER })],
        expectCause:
          'why: the approval by @reef-keeper is on an older commit (approved 0ldc0de, head feedc0d); the head needs a fresh review',
      },
      {
        slug: 'p9-c6-stale-then-fresh',
        desc: 'APPROVED on an older commit, then APPROVED on the head',
        reviews: [
          review({
            commit_id: SHA_OLDER,
            submitted_at: '2026-01-01T00:00:00Z',
          }),
          review({ submitted_at: '2026-01-02T00:00:00Z' }),
        ],
        expectCause: null,
      },
      {
        slug: 'p9-c6-stale-plus-fresh',
        desc: 'human-a APPROVED an older commit + human-b APPROVED the head',
        reviews: [
          review({ login: 'reef-keeper', commit_id: SHA_OLDER }),
          review({ login: 'tide-watcher' }),
        ],
        expectCause: null,
      },
      {
        slug: 'p9-c6-dismissed-alone',
        desc: 'DISMISSED alone (github rewrites the approval in place)',
        reviews: [review({ state: 'DISMISSED' })],
        expectCause: 'why: the review by @reef-keeper was dismissed',
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
        expectCause:
          'why: changes requested by @reef-keeper; address them, then ask for a fresh review',
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
        expectCause:
          'why: changes requested by @reef-keeper; address them, then ask for a fresh review',
      },
      {
        slug: 'p9-c6-dismissed',
        desc: 'APPROVED then DISMISSED',
        reviews: [
          review({ state: 'APPROVED', submitted_at: '2026-01-01T00:00:00Z' }),
          review({ state: 'DISMISSED', submitted_at: '2026-01-02T00:00:00Z' }),
        ],
        expectCause: 'why: the review by @reef-keeper was dismissed',
      },
      {
        slug: 'p9-c6-commented-only',
        desc: 'COMMENTED only',
        reviews: [review({ state: 'COMMENTED' })],
        expectCause: 'why: only comments so far; a comment is not an approval',
      },
      {
        slug: 'p9-c6-veto',
        desc: 'human-a APPROVED + human-b CHANGES_REQUESTED',
        reviews: [
          review({ login: 'reef-keeper', state: 'APPROVED' }),
          review({ login: 'tide-watcher', state: 'CHANGES_REQUESTED' }),
        ],
        expectCause:
          'why: changes requested by @tide-watcher; address them, then ask for a fresh review',
      },
      {
        slug: 'p9-c6-approved-later-comment',
        desc: 'APPROVED then a later COMMENTED by the same human',
        reviews: [
          review({ state: 'APPROVED', submitted_at: '2026-01-01T00:00:00Z' }),
          review({ state: 'COMMENTED', submitted_at: '2026-01-02T00:00:00Z' }),
        ],
        expectCause: null,
      },
      {
        slug: 'p9-c6-approved-plus-comment',
        desc: 'human-a APPROVED + human-b COMMENTED',
        reviews: [
          review({ login: 'reef-keeper', state: 'APPROVED' }),
          review({ login: 'tide-watcher', state: 'COMMENTED' }),
        ],
        expectCause: null,
      },
      {
        slug: 'p9-c6-robot-plus-human',
        desc: 'robot APPROVED + human member APPROVED',
        reviews: [
          review({ login: 'ehm-seaturtle' }),
          review({ login: 'reef-keeper' }),
        ],
        expectCause: null,
      },
      {
        slug: 'p9-c6-ghost-plus-human',
        desc: 'a deleted account COMMENTED + human member APPROVED',
        reviews: [
          review({
            login: null,
            type: null,
            association: 'NONE',
            state: 'COMMENTED',
          }),
          review({ login: 'reef-keeper' }),
        ],
        expectCause: null,
      },
      {
        slug: 'p9-c6-owner',
        desc: 'a human OWNER APPROVED',
        reviews: [review({ login: 'reef-founder', association: 'OWNER' })],
        expectCause: null,
      },
      {
        slug: 'p9-c6-collaborator',
        desc: 'a human COLLABORATOR APPROVED',
        reviews: [
          review({ login: 'kelp-friend', association: 'COLLABORATOR' }),
        ],
        expectCause: null,
      },
      {
        slug: 'p9-c6-ghost-only',
        desc: 'only a deleted account APPROVED',
        reviews: [review({ login: null, type: null, association: 'MEMBER' })],
        expectCause:
          'why: the approval by a deleted account does not count: the account was deleted',
      },
    ];

    cases.forEach((thisCase, index) => {
      when(`[t${index}] --apply, ${thisCase.desc}`, () => {
        then(
          thisCase.expectCause === null
            ? 'proceeds to merge'
            : 'exit 2; names the cause; naught merged',
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
            if (thisCase.expectCause === null) {
              expect(result.status).toEqual(0);
              expect(isMergeCalled(result.ghCalls)).toBe(true);
              expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
              return;
            }
            expect(result.status).toEqual(2);
            expect(result.stdout).toContain(thisCase.expectCause);
            expect(isMergeCalled(result.ghCalls)).toBe(false);
            expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
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
            'automerge disabled on pr #42, so a later push cannot merge unreviewed',
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
          expect(result.stdout).toContain(
            '💥 MalfunctionError: could not disable automerge on pr #42',
          );
          expect(result.stdout).toContain(
            'pr #42 has no approval from a human, so it must not merge',
          );
          expect(result.stdout).toContain('automerge is still on');
          expect(result.stdout).toContain('gh pr merge 42 --disable-auto');
          expect(result.stderr).toContain(
            'could not disable automerge on pr #42',
          );
          expect(isMergeCalled(result.ghCalls)).toBe(false);
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
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
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        });
      });
    },
  );

  given('[case8] the gate against other pr states', () => {
    when('[t0] checks failed, no reviews, --into main --apply', () => {
      then(
        'the gate fires first: exit 2, the refusal names the red checks too',
        () => {
          const result = run({
            scene: {
              branch: 'feat',
              featPr: 'failed',
              featPrReviews: REVIEWS_NONE,
            },
            slug: 'p9-c8-t0',
            args: ['--into', 'main', '--apply'],
          });
          expect(result.status).toEqual(2);
          expect(result.stdout).toContain(
            '✋ ConstraintError: pr #42 has no approval from a human',
          );
          expect(result.stdout).toMatch(/├─ ⚓ \d+ check\(s\) failed too/);
          expect(result.stdout).toContain(
            '└─ fix the failed checks (rhx show.gh.test.errors), then ask your human to review:',
          );
          expect(isMergeCalled(result.ghCalls)).toBe(false);
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        },
      );
    });

    when(
      '[t0a] an explicit --from <feature branch>, no reviews, --into main --apply',
      () => {
        then(
          'the gate fires the same: exit 2, the refusal echoes --from',
          () => {
            // .why = an explicit --from names the feature path too; no
            //        spelling of the source may route around the gate
            const result = run({
              scene: {
                branch: 'feat',
                featPr: 'passed:wout-automerge',
                featPrReviews: REVIEWS_NONE,
              },
              slug: 'p9-c8-t0a',
              args: ['--from', 'turtle/feature-x', '--into', 'main', '--apply'],
            });
            expect(result.status).toEqual(2);
            expect(result.stdout).toContain(
              '✋ ConstraintError: pr #42 has no approval from a human',
            );
            expect(result.stdout).toContain('--from turtle/feature-x');
            expect(isMergeCalled(result.ghCalls)).toBe(false);
            expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
          },
        );
      },
    );

    when('[t1] already merged, no reviews, --into main --apply', () => {
      then('naught left to gate: no review read, no refusal', () => {
        const result = run({
          scene: {
            branch: 'feat',
            featPr: 'merged',
            featPrReviews: REVIEWS_NONE,
          },
          slug: 'p9-c8-t1',
          args: ['--into', 'main', '--apply'],
        });
        expect(isReviewReadCalled(result.ghCalls)).toBe(false);
        expect(result.stdout).not.toContain('no approval from a human');
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case9] --into prod: the release pr is not gated (F1)', () => {
    when(
      '[t0] feature pr #42 approved, release pr #100 with zero reviews, --into prod --apply',
      () => {
        then(
          'merges through to prod; the reviews of #100 are never read',
          () => {
            // .why = the scene mock answers reviews only for #42; a gate on
            //        #100 would read none and refuse, so exit 0 proves it is ungated
            const result = run({
              scene: {
                branch: 'feat',
                featPr: 'inflight',
                transitions: true,
                releasePr: 'passed:wout-automerge',
                tagWorkflows: 'passed',
              },
              slug: 'p9-c9-t0',
              args: ['--into', 'prod', '--apply'],
            });
            expect(result.status).toEqual(0);
            expect(
              isReviewReadCalledForPr({
                ghCalls: result.ghCalls,
                prNumber: 42,
              }),
            ).toBe(true);
            expect(
              isReviewReadCalledForPr({
                ghCalls: result.ghCalls,
                prNumber: 100,
              }),
            ).toBe(false);
            expect(result.stdout).not.toContain('no approval from a human');

            // the feature merge is pinned to the gated head; the release merge is not
            const featMerges = getMergeCallsForPr({
              ghCalls: result.ghCalls,
              prNumber: 42,
            });
            expect(featMerges).toHaveLength(1);
            expect(featMerges[0]).toContain(
              `--match-head-commit ${MOCK_FEAT_HEAD_SHA}`,
            );
            const releaseMerges = getMergeCallsForPr({
              ghCalls: result.ghCalls,
              prNumber: 100,
            });
            expect(releaseMerges.length).toBeGreaterThan(0);
            expect(
              releaseMerges.some((call) =>
                call.includes('--match-head-commit'),
              ),
            ).toBe(false);
            expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
          },
        );
      },
    );

    when(
      '[t1] the repo refuses automerge (free tier), --into prod --apply',
      () => {
        then(
          'the release pr falls back to a direct merge, unpinned; the tree names it',
          () => {
            // .why = the release pr passes @unpinned; its fallback must stay
            //        unpinned, or every prod release on a free-tier repo stalls
            const result = run({
              scene: {
                branch: 'feat',
                featPr: 'passed:wout-automerge',
                releasePr: 'passed:wout-automerge',
                tagWorkflows: 'passed',
                automergeUnavailable: true,
              },
              slug: 'p9-c9-t1',
              args: ['--into', 'prod', '--apply'],
            });
            expect(result.status).toEqual(0);
            const releaseMerges = getMergeCallsForPr({
              ghCalls: result.ghCalls,
              prNumber: 100,
            });
            expect(releaseMerges).toHaveLength(2);
            expect(releaseMerges[0]).toContain('--auto');
            expect(releaseMerges[1]).not.toContain('--auto');
            releaseMerges.forEach((call) =>
              expect(call).not.toContain('--match-head-commit'),
            );
            const featMerges = getMergeCallsForPr({
              ghCalls: result.ghCalls,
              prNumber: 42,
            });
            featMerges.forEach((call) =>
              expect(call).toContain(
                `--match-head-commit ${MOCK_FEAT_HEAD_SHA}`,
              ),
            );
            expect(result.stdout).toContain('merged directly [direct]');
            expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
          },
        );
      },
    );
  });

  given('[case10] a caller marked as human (F4: no exemption)', () => {
    when('[t0] __I_AM_HUMAN=true, no reviews, --into main --apply', () => {
      then('exit 2; the human marker does not lift the gate', () => {
        const result = run({
          scene: {
            branch: 'feat',
            featPr: 'passed:wout-automerge',
            featPrReviews: REVIEWS_NONE,
          },
          slug: 'p9-c10-t0',
          args: ['--into', 'main', '--apply'],
          envExtra: { __I_AM_HUMAN: 'true' },
        });
        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('why: no reviews yet');
        expect(isMergeCalled(result.ghCalls)).toBe(false);
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case11] the merge is pinned to the head the gate judged', () => {
    when('[t0] approved, no push after the gate, --into main --apply', () => {
      then('the merge carries --match-head-commit <head>; merged', () => {
        const result = run({
          scene: { branch: 'feat', featPr: 'passed:wout-automerge' },
          slug: 'p9-c11-t0',
          args: ['--into', 'main', '--apply'],
        });
        expect(result.status).toEqual(0);
        const featMerges = getMergeCallsForPr({
          ghCalls: result.ghCalls,
          prNumber: 42,
        });
        expect(featMerges).toHaveLength(1);
        expect(featMerges[0]).toContain(
          `--match-head-commit ${MOCK_FEAT_HEAD_SHA}`,
        );
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });

    when(
      '[t1] approved, then a push moves the head before the merge, --into main --apply',
      () => {
        then('exit 2; the merge is refused; naught merged', () => {
          // .why = an unpinned merge would ship the pushed commit, which no
          //        human approved; the pin makes github refuse it
          const result = run({
            scene: {
              branch: 'feat',
              featPr: 'passed:wout-automerge',
              featPrHeadAtMerge: 'pushedc0de0pushedc0de0pushedc0de0pushed0',
            },
            slug: 'p9-c11-t1',
            args: ['--into', 'main', '--apply'],
          });
          expect(result.status).toEqual(2);
          expect(result.stdout).toContain(
            '✋ ConstraintError: the head of pr #42 moved after the review gate read it; naught was merged',
          );
          expect(result.stdout).toContain(
            `why: the approval covers ${MOCK_FEAT_HEAD_SHA.slice(0, 7)}; github refused the merge of any other head`,
          );
          expect(result.stdout).toContain(
            're-run, and the gate judges the new head',
          );
          expect(result.stderr).toContain('moved after the review gate');
          expect(result.stdout).not.toContain('automerge enabled');
          expect(result.stdout).not.toContain('done!');
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        });
      },
    );

    when('[t2] the moved head with --retry, --into main --apply', () => {
      then('exit 2; --retry does not lift the refusal', () => {
        const result = run({
          scene: {
            branch: 'feat',
            featPr: 'passed:wout-automerge',
            featPrHeadAtMerge: 'pushedc0de0pushedc0de0pushedc0de0pushed0',
          },
          slug: 'p9-c11-t2',
          args: ['--into', 'main', '--apply', '--retry'],
        });
        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('moved after the review gate');
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] the head read fails, --into main --apply', () => {
      then('exit 1; names the head read as the fault; naught merged', () => {
        const result = run({
          scene: {
            branch: 'feat',
            featPr: 'passed:wout-automerge',
            featPrHeadReadFails: true,
          },
          slug: 'p9-c11-t3',
          args: ['--into', 'main', '--apply'],
        });
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain(
          '💥 MalfunctionError: could not read the head commit of pr #42',
        );
        expect(result.stderr).toContain('could not read the head commit');
        expect(isMergeCalled(result.ghCalls)).toBe(false);
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });

    when(
      '[t4] the repo refuses automerge (free tier), approved, --into main --apply',
      () => {
        then('the direct-merge fallback carries the same pin; merged', () => {
          // .why = the fallback is a second merge call; a pin dropped there
          //        would ship any head on a free-tier repo
          const result = run({
            scene: {
              branch: 'feat',
              featPr: 'passed:wout-automerge',
              automergeUnavailable: true,
            },
            slug: 'p9-c11-t4',
            args: ['--into', 'main', '--apply'],
          });
          expect(result.status).toEqual(0);
          const featMerges = getMergeCallsForPr({
            ghCalls: result.ghCalls,
            prNumber: 42,
          });
          expect(featMerges).toHaveLength(2);
          expect(featMerges[0]).toContain('--auto');
          expect(featMerges[1]).not.toContain('--auto');
          featMerges.forEach((call) =>
            expect(call).toContain(`--match-head-commit ${MOCK_FEAT_HEAD_SHA}`),
          );
          expect(result.stdout).toContain(
            'automerge unavailable on this repo; merged directly [direct]',
          );
          expect(result.stdout).not.toContain('automerge enabled [added]');
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        });
      },
    );

    when(
      '[t5] free tier, and a push moves the head before the direct merge, --into main --apply',
      () => {
        then('exit 2; the direct merge is refused; naught merged', () => {
          const result = run({
            scene: {
              branch: 'feat',
              featPr: 'passed:wout-automerge',
              automergeUnavailable: true,
              featPrHeadAtMerge: 'pushedc0de0pushedc0de0pushedc0de0pushed0',
            },
            slug: 'p9-c11-t5',
            args: ['--into', 'main', '--apply'],
          });
          expect(result.status).toEqual(2);
          const featMerges = getMergeCallsForPr({
            ghCalls: result.ghCalls,
            prNumber: 42,
          });
          expect(featMerges).toHaveLength(2);
          expect(featMerges[1]).not.toContain('--auto');
          expect(featMerges[1]).toContain(
            `--match-head-commit ${MOCK_FEAT_HEAD_SHA}`,
          );
          expect(result.stdout).toContain(
            '✋ ConstraintError: the head of pr #42 moved after the review gate read it; naught was merged',
          );
          expect(result.stderr).toContain('moved after the review gate');
          expect(result.stdout).not.toContain('done!');
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        });
      },
    );
  });

  given(
    '[case12] the apply watch holds an automerge lease on the gated head',
    () => {
      when(
        '[t0] a push moves the head after automerge is armed, --into main --apply',
        () => {
          then('the watch disarms automerge and refuses; exit 2', () => {
            const result = run({
              scene: {
                branch: 'feat',
                featPr: 'inflight',
                transitions: true,
                featPrHeadMovesAfterReads: 1,
              },
              slug: 'p9-c12-t0',
              args: ['--into', 'main', '--apply'],
            });
            expect(result.status).toEqual(2);
            expect(result.stdout).toContain(
              '✋ ConstraintError: the head of pr #42 moved after the review gate read it',
            );
            expect(result.stdout).toContain(
              'why: the approval covers feedc0d; the head is now b0a7c0d',
            );
            expect(result.stderr).toContain(
              '✋ ConstraintError: the head of pr #42 moved after the review gate read it',
            );
            expect(result.stdout).toContain('automerge disabled');
            expect(isDisableCalled(result.ghCalls)).toBe(true);
            expect(result.stdout).not.toContain('done!');
            expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
          });
        },
      );

      when(
        '[t0a] a push moves the head after automerge is armed, and the disable fails',
        () => {
          then(
            'exit 1, not 2: the stuck automerge outranks the refusal',
            () => {
              const result = run({
                scene: {
                  branch: 'feat',
                  featPr: 'inflight',
                  transitions: true,
                  featPrHeadMovesAfterReads: 1,
                  disableAutoFails: true,
                },
                slug: 'p9-c12-t0a',
                args: ['--into', 'main', '--apply'],
              });
              expect(result.status).toEqual(1);
              expect(result.stdout).toContain(
                '✋ ConstraintError: the head of pr #42 moved after the review gate read it',
              );
              expect(result.stdout).toContain(
                '💥 MalfunctionError: automerge is still on for pr #42 and could not be disabled',
              );
              expect(result.stdout).toContain(
                'disable it by hand now: gh pr merge 42 --disable-auto',
              );
              expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
            },
          );
        },
      );

      when(
        '[t1] checks go red after automerge is armed, --into main --apply',
        () => {
          then(
            'the watch disarms automerge, so a fix pushed later cannot merge unreviewed; exit 2',
            () => {
              const result = run({
                scene: {
                  branch: 'feat',
                  featPr: 'inflight',
                  transitions: true,
                  featPrFailsAfterViews: 3,
                },
                slug: 'p9-c12-t1',
                args: ['--into', 'main', '--apply'],
              });
              expect(result.status).toEqual(2);
              expect(result.stdout).toContain('check(s) failed');
              expect(result.stdout).toContain(
                'automerge disabled on pr #42, so a later push cannot merge unreviewed',
              );
              expect(isDisableCalled(result.ghCalls)).toBe(true);
              expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
            },
          );
        },
      );

      when(
        '[t2] checks go red after automerge is armed, and the disarm fails',
        () => {
          then('exit 1; says automerge is still on; names the hand fix', () => {
            const result = run({
              scene: {
                branch: 'feat',
                featPr: 'inflight',
                transitions: true,
                featPrFailsAfterViews: 3,
                disableAutoFails: true,
              },
              slug: 'p9-c12-t2',
              args: ['--into', 'main', '--apply'],
            });
            expect(result.status).toEqual(1);
            expect(result.stdout).toContain(
              '💥 MalfunctionError: automerge is still on for pr #42 and could not be disabled',
            );
            expect(result.stdout).toContain(
              '└─ disable it by hand now: gh pr merge 42 --disable-auto',
            );
            expect(result.stdout).not.toContain('⚠️');
            expect(result.stderr).toContain(
              '💥 MalfunctionError: automerge is still on for pr #42',
            );
            expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
          });
        },
      );

      when('[t3] --watch alone, automerge already on, checks go red', () => {
        then('no lease: the watch writes naught and exits 2 as today', () => {
          const result = run({
            scene: {
              branch: 'feat',
              featPr: 'inflight:with-automerge',
              transitions: true,
              featPrFailsAfterViews: 3,
            },
            slug: 'p9-c12-t3',
            args: ['--into', 'main', '--watch'],
          });
          expect(result.status).toEqual(2);
          expect(isDisableCalled(result.ghCalls)).toBe(false);
          expect(isReviewReadCalled(result.ghCalls)).toBe(false);
          expect(result.stdout).not.toContain('automerge disabled');
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        });
      });

      when(
        '[t4] checks stay in progress past the watch timeout, --into main --apply',
        () => {
          then(
            'the watch disarms automerge before the timeout exit; exit 2',
            () => {
              const result = run({
                scene: {
                  branch: 'feat',
                  featPr: 'inflight',
                  featPrStaysInflight: true,
                },
                slug: 'p9-c12-t4',
                args: ['--into', 'main', '--apply'],
                envExtra: { GIT_RELEASE_WATCH_TIMEOUT_SECONDS: '20' },
              });
              expect(result.status).toEqual(2);
              expect(result.stdout).toContain('timeout');
              expect(result.stdout).toContain(
                'automerge disabled on pr #42, so a later push cannot merge unreviewed',
              );
              expect(isDisableCalled(result.ghCalls)).toBe(true);
              expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
            },
          );
        },
      );

      when(
        '[t5] the status read fails right after automerge is armed, --into main --apply',
        () => {
          then(
            'exit 1; MalfunctionError on both streams; the exit trap disarms',
            () => {
              const result = run({
                scene: {
                  branch: 'feat',
                  featPr: 'passed:wout-automerge',
                  featPrViewBreaksAfterViews: 1,
                },
                slug: 'p9-c12-t5',
                args: ['--into', 'main', '--apply'],
              });
              expect(result.status).toEqual(1);
              expect(result.stdout).toContain(
                '💥 MalfunctionError: automerge enabled on pr #42, then its status could not be read',
              );
              expect(result.stderr).toContain(
                '💥 MalfunctionError: automerge enabled on pr #42, then its status could not be read',
              );
              expect(isMergeCalled(result.ghCalls)).toBe(true);
              expect(isDisableCalled(result.ghCalls)).toBe(true);
              expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
            },
          );
        },
      );

      when(
        '[t6] the head read fails on a watch poll, --into main --apply',
        () => {
          then('exit 1; MalfunctionError names the head read; disarmed', () => {
            const result = run({
              scene: {
                branch: 'feat',
                featPr: 'inflight',
                transitions: true,
                featPrHeadReadBreaksAfterReads: 1,
              },
              slug: 'p9-c12-t6',
              args: ['--into', 'main', '--apply'],
            });
            expect(result.status).toEqual(1);
            expect(result.stdout).toContain(
              '💥 MalfunctionError: could not read the head commit of pr #42',
            );
            expect(result.stderr).toContain(
              '💥 MalfunctionError: could not read the head commit of pr #42',
            );
            expect(isDisableCalled(result.ghCalls)).toBe(true);
            expect(result.stdout).not.toContain('done!');
            expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
          });
        },
      );

      when(
        '[t7] the reviews re-read fails on a watch poll, --into main --apply',
        () => {
          then(
            'exit 1; MalfunctionError names the reviews re-read; disarmed',
            () => {
              const result = run({
                scene: {
                  branch: 'feat',
                  featPr: 'inflight',
                  transitions: true,
                  featPrReviewsReadBreaksAfterReads: 1,
                },
                slug: 'p9-c12-t7',
                args: ['--into', 'main', '--apply'],
              });
              expect(result.status).toEqual(1);
              expect(result.stdout).toContain(
                '💥 MalfunctionError: could not re-read the reviews of pr #42',
              );
              expect(result.stderr).toContain(
                '💥 MalfunctionError: could not re-read the reviews of pr #42',
              );
              expect(isDisableCalled(result.ghCalls)).toBe(true);
              expect(result.stdout).not.toContain('done!');
              expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
            },
          );
        },
      );
    },
  );

  given(
    '[case13] the lease is bound to the process, not to a list of exits',
    () => {
      when('[t0] gh breaks on a watch poll after automerge is armed', () => {
        then('the run aborts non-zero and the exit trap disarms', () => {
          const result = run({
            scene: {
              branch: 'feat',
              featPr: 'inflight',
              transitions: true,
              featPrViewBreaksAfterViews: 2,
            },
            slug: 'p9-c13-t0',
            args: ['--into', 'main', '--apply'],
          });
          expect(result.status).not.toEqual(0);
          expect(isMergeCalled(result.ghCalls)).toBe(true);
          expect(isDisableCalled(result.ghCalls)).toBe(true);
          expect(result.stdout).toContain(
            'could not read the status of pr #42 before the first poll',
          );
          expect(result.stdout).toContain(
            'automerge disabled on pr #42, so a later push cannot merge unreviewed',
          );
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        });
      });

      when('[t0a] gh breaks on a poll inside the watch loop', () => {
        then('exit 1, the mid-watch line, and the exit trap disarms', () => {
          // .why = the in-loop status read is a second site; the pre-loop
          //        read in [t0] does not reach it
          const result = run({
            scene: {
              branch: 'feat',
              featPr: 'inflight',
              transitions: true,
              featPrViewBreaksAfterViews: 3,
            },
            slug: 'p9-c13-t0a',
            args: ['--into', 'main', '--apply'],
          });
          expect(result.status).toEqual(1);
          expect(isMergeCalled(result.ghCalls)).toBe(true);
          expect(isDisableCalled(result.ghCalls)).toBe(true);
          expect(result.stdout).toContain(
            '💥 MalfunctionError: could not read the status of pr #42 mid-watch',
          );
          expect(result.stderr).toContain(
            'could not read the status of pr #42 mid-watch',
          );
          expect(result.stdout).not.toContain('before the first poll');
          expect(result.stdout).toContain(
            'automerge disabled on pr #42, so a later push cannot merge unreviewed',
          );
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        });
      });

      when(
        '[t1] automerge already armed, checks red, no --retry, --into main --apply',
        () => {
          then('exit 2 before any watch, and the exit trap disarms', () => {
            const result = run({
              scene: {
                branch: 'feat',
                featPr: 'inflight:with-automerge',
                featPrFailsAfterViews: 0,
              },
              slug: 'p9-c13-t1',
              args: ['--into', 'main', '--apply'],
            });
            expect(result.status).toEqual(2);
            expect(result.stdout).toContain('check(s) failed');
            expect(isDisableCalled(result.ghCalls)).toBe(true);
            expect(result.stdout).toContain('automerge disabled on pr #42');
            expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
          });
        },
      );

      [
        { signal: 'INT', exitCode: 130, label: 'ctrl-c (SIGINT)' },
        { signal: 'TERM', exitCode: 143, label: 'a harness timeout (SIGTERM)' },
        { signal: 'HUP', exitCode: 129, label: 'a closed terminal (SIGHUP)' },
      ].forEach(({ signal, exitCode, label }, index) =>
        when(
          `[t2.${index}] ${label} mid-watch after automerge is armed`,
          () => {
            then('the signal trap disarms before the run dies', () => {
              // .why = no signal a human or harness sends may leave automerge armed
              const scene = setupScene({
                scene: {
                  branch: 'feat',
                  featPr: 'inflight',
                  transitions: true,
                  // each view sleeps 3s, so the signal lands inside the post-arm read
                  featPrViewSleepSeconds: 3,
                },
                slug: `p9-c13-t2-${signal.toLowerCase()}`,
              });
              try {
                // .note = the wrapper waits for the merge call in the gh log,
                //         then signals the run's whole process group, as a
                //         terminal does on ctrl-c; `set -m` gives the run its
                //         own group, so the wrapper keeps the pipe open while
                //         the trap writes. no fixed timer: host speed cannot
                //         land the signal before the arm
                const result = spawnSync(
                  'bash',
                  [
                    '-c',
                    [
                      'set -m',
                      'bash "$0" --into main --apply &',
                      'pid=$!',
                      'for _ in $(seq 1 600); do',
                      '  if grep "^GH: pr merge" "$GH_LOG" 2>/dev/null | grep -qv -- "--disable-auto"; then break; fi',
                      '  sleep 0.1',
                      'done',
                      'sleep 1',
                      'kill -s "$SIG" -- "-$pid"',
                      'wait "$pid"',
                    ].join('\n'),
                    SKILL_PATH,
                  ],
                  {
                    cwd: scene.tempDir,
                    env: {
                      ...process.env,
                      PATH: /* .mock = gh, git, rhachet — contract in .test/infra/mockGh.ts */ `${scene.fakeBinDir}:${process.env.PATH}`,
                      TERM: 'dumb',
                      HOME: scene.tempDir,
                      EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token',
                      GIT_RELEASE_TEST_MODE: 'true',
                      GH_LOG: path.join(scene.stateDir, 'gh-debug.log'),
                      SIG: signal,
                    },
                    encoding: 'utf-8',
                    timeout: SKILL_SPAWN_TIMEOUT_MS,
                  },
                );
                const debugLog = path.join(scene.stateDir, 'gh-debug.log');
                const ghCalls = fs
                  .readFileSync(debugLog, 'utf-8')
                  .split('\n')
                  .filter(Boolean);
                expect(result.status).toEqual(exitCode);
                expect(isMergeCalled(ghCalls)).toBe(true);
                expect(isDisableCalled(ghCalls)).toBe(true);
                expect(result.stdout).toContain(
                  `🌴 interrupted (SIG${signal}); disable automerge on pr #42 before exit...`,
                );
                expect(result.stdout).toContain(
                  '🌴 automerge disabled on pr #42, so a later push cannot merge unreviewed',
                );
                // .note = the tree before the signal depends on host speed, so
                //         the snapshot holds only the tail from the trap on
                const stdoutFromTrap = result.stdout.slice(
                  result.stdout.indexOf('🌴 interrupted'),
                );
                expect(
                  asSnapshotReadyWithAnsi(stdoutFromTrap),
                ).toMatchSnapshot();
              } finally {
                scene.cleanup();
              }
            });
          },
        ),
      );
    },
  );

  given(
    '[case14] the lease re-judges the verdict each poll, not only the head',
    () => {
      when(
        '[t0] the human requests changes mid-watch, on the same head',
        () => {
          then('the watch disarms automerge and refuses; exit 2', () => {
            const result = run({
              scene: {
                branch: 'feat',
                featPr: 'inflight',
                transitions: true,
                featPrReviewsAfterGate: [
                  review({ state: 'APPROVED' }),
                  review({
                    state: 'CHANGES_REQUESTED',
                    submitted_at: '2026-01-02T00:00:00Z',
                  }),
                ],
              },
              slug: 'p9-c14-t0',
              args: ['--into', 'main', '--apply'],
            });
            expect(result.status).toEqual(2);
            expect(result.stdout).toContain(
              '✋ ConstraintError: pr #42 lost its human approval after the review gate',
            );
            expect(result.stdout).toContain('why: ');
            expect(result.stderr).toContain(
              '✋ ConstraintError: pr #42 lost its human approval after the review gate',
            );
            expect(isMergeCalled(result.ghCalls)).toBe(true);
            expect(isDisableCalled(result.ghCalls)).toBe(true);
            expect(result.stdout).not.toContain('done!');
            expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
          });
        },
      );

      when('[t1] the approval is dismissed mid-watch', () => {
        then('the watch disarms automerge and refuses; exit 2', () => {
          const result = run({
            scene: {
              branch: 'feat',
              featPr: 'inflight',
              transitions: true,
              featPrReviewsAfterGate: [review({ state: 'DISMISSED' })],
            },
            slug: 'p9-c14-t1',
            args: ['--into', 'main', '--apply'],
          });
          expect(result.status).toEqual(2);
          expect(result.stdout).toContain(
            'pr #42 lost its human approval after the review gate',
          );
          expect(result.stdout).toContain('was dismissed');
          expect(isDisableCalled(result.ghCalls)).toBe(true);
          expect(result.stdout).not.toContain('done!');
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        });
      });

      when('[t2] every review vanishes mid-watch', () => {
        then('an empty review set is no approval: disarmed, exit 2', () => {
          const result = run({
            scene: {
              branch: 'feat',
              featPr: 'inflight',
              transitions: true,
              featPrReviewsAfterGate: [],
            },
            slug: 'p9-c14-t2',
            args: ['--into', 'main', '--apply'],
          });
          expect(result.status).toEqual(2);
          expect(result.stdout).toContain('lost its human approval');
          expect(result.stdout).toContain(
            'why: the reviews on pr #42 are gone; the approval the gate saw no longer exists',
          );
          expect(result.stdout).not.toContain('no reviews yet');
          expect(isDisableCalled(result.ghCalls)).toBe(true);
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        });
      });

      when(
        '[t3] the approval is dismissed mid-watch, and the disable fails',
        () => {
          then(
            'exit 1, not 2: the stuck automerge outranks the refusal',
            () => {
              const result = run({
                scene: {
                  branch: 'feat',
                  featPr: 'inflight',
                  transitions: true,
                  featPrReviewsAfterGate: [review({ state: 'DISMISSED' })],
                  disableAutoFails: true,
                },
                slug: 'p9-c14-t3',
                args: ['--into', 'main', '--apply'],
              });
              expect(result.status).toEqual(1);
              expect(result.stdout).toContain(
                'pr #42 lost its human approval after the review gate',
              );
              expect(result.stdout).toContain(
                '💥 MalfunctionError: automerge is still on for pr #42 and could not be disabled',
              );
              expect(result.stdout).toContain(
                'disable it by hand now: gh pr merge 42 --disable-auto',
              );
              expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
            },
          );
        },
      );
    },
  );

  given(
    '[case15] a clone meets the refusal and reads its own brief (E24)',
    () => {
      // .why = a brief that says "no approval to seek" invites a workaround;
      //        the briefs the clone boots must say stop and hand the pr up
      const BRIEFS_DIR = path.join(
        __dirname,
        '../../../../../dist/domain.roles/mechanic/briefs/practices/work.flow/release',
      );
      const readBrief = (input: { name: string }): string =>
        fs.readFileSync(path.join(BRIEFS_DIR, input.name), 'utf-8');

      when(
        '[t0] the booted .min of the release confidence rule is read',
        () => {
          then('it names the refusal, says stop, and forbids a retry', () => {
            const brief = readBrief({
              name: 'rule.require.git-release-confidence.md.min',
            });
            expect(brief).toContain('no approval from a human');
            expect(brief).toContain('stop, hand the pr url to your human');
            expect(brief).toContain('no retry, no reflag');
            expect(brief).toContain(
              'route around a review gate refusal = blocker',
            );
          });
        },
      );

      when('[t1] the full release confidence rule is read', () => {
        then('it says stop, hand up the url, and re-run once approved', () => {
          const brief = readBrief({
            name: 'rule.require.git-release-confidence.md',
          });
          expect(brief).toContain('stop. hand the pr url to your human');
          expect(brief).toContain(
            'once the human approves, re-run the same command',
          );
          expect(brief).toContain(
            'retry, reflag, or route around a review-gate refusal = blocker',
          );
        });
      });

      when('[t2] the git.release howto is read', () => {
        then(
          'its review gate usecase says stop and that no flag lifts it',
          () => {
            const brief = readBrief({ name: 'howto.git-release.[lesson].md' });
            expect(brief).toContain('## .usecase 3: the review gate refuses');
            expect(brief).toContain(
              'stop; hand the url to your human and say a review is owed',
            );
            expect(brief).toContain(
              'do not retry or reflag; no flag lifts the gate',
            );
          },
        );
      });
    },
  );
});
