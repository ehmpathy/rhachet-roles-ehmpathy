import { spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { given, then, when } from 'test-fns';

import {
  asSkillExitStatus,
  SKILL_SPAWN_TIMEOUT_MS,
} from './.test/infra/asSkillExitStatus';
import {
  writeGitCommitUsesPermission,
  writeRhachetMock,
  writeSimpleGhMock,
} from './.test/infra/mockGh';
import {
  genMockBinDir,
  genStateDir,
  genTempGitRepo,
} from './.test/infra/setupTestEnv';
import { asSnapshotReadyWithAnsi } from './.test/infra/snapshotOps';

/**
 * .what = integration tests for the git.release comment gate
 * .why  = prove apply refuses while a pr comment waits on an answer, names each
 *         row and the verb that answers it, and that no flag skips the refusal
 *
 * .mock = the `gh` cli is a PATH stub (a key-value node executable over a state dir,
 *         `writeSimpleGhMock`), `rhachet` is a stub keyrack (`writeRhachetMock`), and
 *         the repo is a temp git repo (`genTempGitRepo`)
 * .why  = these cases drive states github cannot be put into on demand — a comment
 *         read that fails at the gate or mid-watch, a disable that github refuses,
 *         a graphql page that names no pull request, a comment that lands between
 *         two polls — and they count every gh call, which proves "automerge never
 *         added" claims. a real api run per case would also flip automerge on a
 *         live pr forty times per ci run
 * .real = git.release.p9.comment_gate.real.integration.test.ts reads the live
 *         comments and thread states and runs the real `--disable-auto` against a
 *         home-org pr (run by hand: a ci test job lacks the write scope)
 */
jest.setTimeout(150000);

const SKILL_PATH = path.resolve(
  __dirname,
  '../../../../../dist/domain.roles/mechanic/skills/git.release/git.release.sh',
);

// pr view responses: checks passed or inflight, automerge unfound or found
const PR_PASSED_WOUT_AUTOMERGE =
  '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(reef): add tide sensor"}';
const PR_INFLIGHT_WOUT_AUTOMERGE =
  '{"statusCheckRollup": [{"conclusion": "", "status": "IN_PROGRESS", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(reef): add tide sensor"}';
const PR_INFLIGHT_WITH_AUTOMERGE =
  '{"statusCheckRollup": [{"conclusion": "", "status": "IN_PROGRESS", "name": "test"}], "autoMergeRequest": {"enabledAt": "2026-10-01T00:00:00Z"}, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(reef): add tide sensor"}';
const PR_MERGED =
  '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "MERGED", "title": "feat(reef): add tide sensor"}';

// comment fixtures: a reviewer, the robot's signed answers, a bot
const REVIEW_ASK = {
  id: 801,
  user: { login: 'commander' },
  created_at: '2026-10-01T01:00:00Z',
  in_reply_to_id: null,
  path: 'src/reef/getTide.ts',
  line: 42,
  html_url: 'https://github.com/ehmpathy/reef/pull/42#discussion_r801',
  body: 'why not a findsert here? a retry would double the tide',
};
const REVIEW_ANSWER = {
  id: 802,
  user: { login: 'ehm-seaturtle' },
  created_at: '2026-10-01T02:00:00Z',
  in_reply_to_id: 801,
  path: 'src/reef/getTide.ts',
  line: 42,
  html_url: 'https://github.com/ehmpathy/reef/pull/42#discussion_r802',
  body: '🐢 swapped to findsert\n\n<!-- rhx:git.pull.comment key=answer -->',
};
const REVIEW_ASK_AGAIN = {
  id: 803,
  user: { login: 'commander' },
  created_at: '2026-10-01T03:00:00Z',
  in_reply_to_id: 801,
  path: 'src/reef/getTide.ts',
  line: 42,
  html_url: 'https://github.com/ehmpathy/reef/pull/42#discussion_r803',
  body: 'and the test for the retry?',
};
const REVIEW_HAND_REPLY = {
  id: 804,
  user: { login: 'human' },
  created_at: '2026-10-01T02:00:00Z',
  in_reply_to_id: 801,
  path: 'src/reef/getTide.ts',
  line: 42,
  html_url: 'https://github.com/ehmpathy/reef/pull/42#discussion_r804',
  body: 'good call, fixed',
};
const REVIEW_BOT = {
  id: 805,
  user: { login: 'coderabbit[bot]' },
  created_at: '2026-10-01T01:10:00Z',
  in_reply_to_id: null,
  path: 'src/reef/getTide.ts',
  line: 40,
  html_url: 'https://github.com/ehmpathy/reef/pull/42#discussion_r805',
  body: 'consider a guard for an empty tide list',
};
const ISSUE_ASK = {
  id: 6407563822,
  user: { login: 'commander' },
  created_at: '2026-10-01T01:30:00Z',
  html_url: 'https://github.com/ehmpathy/reef/pull/42#issuecomment-6407563822',
  body: 'also: the readme still names the old flag',
};
const ISSUE_STATUS = {
  id: 6407563900,
  user: { login: 'ehm-seaturtle' },
  created_at: '2026-10-01T04:00:00Z',
  html_url: 'https://github.com/ehmpathy/reef/pull/42#issuecomment-6407563900',
  body: '🐢 status: all green\n\n<!-- rhx:git.pull.comment key=status -->',
};
const ISSUE_ANSWER = {
  id: 6407563901,
  user: { login: 'ehm-seaturtle' },
  created_at: '2026-10-01T04:10:00Z',
  html_url: 'https://github.com/ehmpathy/reef/pull/42#issuecomment-6407563901',
  body: '🐢 readme now names the new flag\n\n<!-- rhx:git.pull.comment key=answer-6407563822 -->',
};
const ISSUE_BOT = {
  id: 6407563999,
  user: { login: 'rhelease[bot]' },
  created_at: '2026-10-01T05:00:00Z',
  html_url: 'https://github.com/ehmpathy/reef/pull/42#issuecomment-6407563999',
  body: '🐢 released at v1.2.3',
};

/**
 * .what = the graphql reviewThreads page for a set of threads
 * .why = the gate reads each thread's resolution from graphql
 */
const asThreadsPage = (
  threads: { isResolved: boolean; ids: number[] }[],
): string =>
  JSON.stringify({
    data: {
      repository: {
        pullRequest: {
          reviewThreads: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: threads.map((t) => ({
              isResolved: t.isResolved,
              comments: { nodes: t.ids.map((id) => ({ databaseId: id })) },
            })),
          },
        },
      },
    },
  });

/**
 * .what = a temp repo with a key-value gh mock, on a feat branch or on main
 * .why = isolate each case from the real github api; main reaches the release pr
 */
const setupTestEnv = (
  mockResponses: Record<string, string>,
  on: 'feat' | 'main',
): {
  tempDir: string;
  fakeBinDir: string;
  stateDir: string;
  cleanup: () => void;
} => {
  const { tempDir, cleanup } = genTempGitRepo({ branch: 'main' });
  const fakeBinDir = genMockBinDir({ tempDir });
  const stateDir = genStateDir({ tempDir });
  writeSimpleGhMock({ mockResponses, mockBinDir: fakeBinDir, stateDir });
  writeRhachetMock({ tempDir, mockBinDir: fakeBinDir });
  writeGitCommitUsesPermission({ tempDir });
  if (on === 'feat')
    spawnSync('git', ['checkout', '-b', 'turtle/tide-sensor'], {
      cwd: tempDir,
    });
  return { tempDir, fakeBinDir, stateDir, cleanup };
};

/**
 * .what = run git.release against the mock
 * .why = observe stdout, stderr, and the exit code as a caller does
 */
const runSkill = (
  args: string[],
  env: {
    tempDir: string;
    fakeBinDir: string;
    extraEnv: Record<string, string>;
  },
): { stdout: string; stderr: string; status: number } => {
  const result = spawnSync('bash', [SKILL_PATH, ...args], {
    cwd: env.tempDir,
    env: {
      ...process.env,
      PATH: /* .mock = gh, rhachet — contract in .test/infra/mockGh.ts */ `${env.fakeBinDir}:${process.env.PATH}`,
      TERM: 'dumb',
      HOME: env.tempDir,
      EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token',
      GIT_RELEASE_TEST_MODE: 'true',
      ...env.extraEnv,
    },
    encoding: 'utf-8',
    timeout: SKILL_SPAWN_TIMEOUT_MS,
  });
  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: asSkillExitStatus({ result, timeoutMs: SKILL_SPAWN_TIMEOUT_MS }),
  };
};

/**
 * .what = run one case end to end: setup, run, cleanup
 * .why = each case reads as its mock and its assertions alone
 */
const runCase = (
  mockResponses: Record<string, string>,
  args: string[],
  on: 'feat' | 'main' = 'feat',
  extraEnv: Record<string, string> = {},
): {
  stdout: string;
  stderr: string;
  status: number;
  wasAutomergeDisabled: boolean;
} => {
  const { tempDir, fakeBinDir, stateDir, cleanup } = setupTestEnv(
    mockResponses,
    on,
  );
  try {
    const result = runSkill(args, { tempDir, fakeBinDir, extraEnv });
    const wasAutomergeDisabled = fs.existsSync(
      path.join(stateDir, 'automerge-disabled'),
    );
    return { ...result, wasAutomergeDisabled };
  } finally {
    cleanup();
  }
};

/**
 * .what = run git.release, then send it a signal once its watch polls
 * .why = a watch a robot runs most often ends by a killed call, not the cap;
 *        the output after the signal is the behavior under test
 */
const runCaseThenSignal = async (
  mockResponses: Record<string, string>,
  args: string[],
  signal: NodeJS.Signals,
): Promise<{ stdout: string; stderr: string; code: number | null }> => {
  const { tempDir, fakeBinDir, cleanup } = setupTestEnv(mockResponses, 'feat');
  try {
    return await new Promise((done, fail) => {
      const child = spawn('bash', [SKILL_PATH, ...args], {
        cwd: tempDir,
        env: {
          ...process.env,
          PATH: /* .mock = gh, rhachet — contract in .test/infra/mockGh.ts */ `${fakeBinDir}:${process.env.PATH}`,
          TERM: 'dumb',
          HOME: tempDir,
          EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token',
          GIT_RELEASE_TEST_MODE: 'true',
        },
      });
      const chunks = { stdout: '', stderr: '' };
      const state = { signaled: false };
      child.stdout.on('data', (data: Buffer) => {
        chunks.stdout += data.toString();
        // the first poll line proves the watch loop runs
        if (!state.signaled && chunks.stdout.includes('💤')) {
          state.signaled = true;
          child.kill(signal);
        }
      });
      child.stderr.on('data', (data: Buffer) => {
        chunks.stderr += data.toString();
      });
      child.on('error', fail);
      child.on('close', (code) => done({ ...chunks, code }));
    });
  } finally {
    cleanup();
  }
};

describe('git.release.p9.comment_gate', () => {
  given('[case1] a pr with one unanswered review thread', () => {
    const mockResponses = {
      'pr list': '42',
      'pr view': PR_PASSED_WOUT_AUTOMERGE,
      'api review comments': JSON.stringify([REVIEW_ASK]),
      'api graphql': asThreadsPage([{ isResolved: false, ids: [801] }]),
      // the gate must refuse before any automerge call
      'pr merge auto':
        'ERROR:automerge must not be enabled while a comment waits',
    };

    when('[t0] apply', () => {
      then('refuses, exit 2, and names the thread and the verbs', () => {
        const result = runCase(mockResponses, ['--into', 'main', '--apply']);
        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('💬 1 comment(s) unanswered');
        expect(result.stdout).toContain(
          'review 801 · src/reef/getTide.ts:42 · @commander',
        );
        expect(result.stdout).toContain(
          '✋ ConstraintError: release blocked until each comment has an answer',
        );
        expect(result.stdout).toContain(
          'rhx git.pull.comment set --pr 42 --reply-to 801 --key answer-801 --from <file>',
        );
        expect(result.stdout).not.toContain("let's watch");
        expect(result.stderr).toContain('✋ ConstraintError');
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        // the refusal rides stderr too: snap it, so its shape is reviewed
        expect(asSnapshotReadyWithAnsi(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] apply with --retry', () => {
      then('still refuses, exit 2: no flag skips the gate', () => {
        const result = runCase(mockResponses, [
          '--into',
          'main',
          '--apply',
          '--retry',
        ]);
        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('✋ ConstraintError');
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] apply --into prod', () => {
      then('refuses at the feat pr, exit 2', () => {
        const result = runCase(mockResponses, ['--into', 'prod', '--apply']);
        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('✋ ConstraintError');
        expect(result.stdout).not.toContain('and then');
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] plan', () => {
      then('shows the row and the hint, exit 0', () => {
        const result = runCase(mockResponses, ['--into', 'main']);
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('💬 1 comment(s) unanswered');
        expect(result.stdout).toContain(
          '--apply will refuse until each comment has an answer',
        );
        // the automerge line never invites the --apply the hint says will refuse
        expect(result.stdout).toContain(
          'automerge unfound — held until each comment has an answer',
        );
        expect(result.stdout).not.toContain('use --apply to add');
        expect(result.stdout).not.toContain('ConstraintError');
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t4] watch, automerge unfound', () => {
      then('reports, never mutates automerge, exit per checks', () => {
        const result = runCase(mockResponses, ['--into', 'main', '--watch']);
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('💬 1 comment(s) unanswered');
        expect(result.stdout).not.toContain('use --apply to add');
        expect(result.wasAutomergeDisabled).toEqual(false);
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t5] apply with a flag a driver might hope skips the gate', () => {
      then('each is refused as unknown, exit 2, before any release act', () => {
        const bypasses = ['--force', '--skip-comments', '--no-comment-gate'];
        const results = bypasses.map((flag) =>
          runCase(mockResponses, ['--into', 'main', '--apply', flag]),
        );
        expect(results.map((r) => r.status)).toEqual([2, 2, 2]);
        results.forEach((r, i) => {
          expect(r.stdout).toContain(
            `✋ ConstraintError: unknown argument: ${bypasses[i]}`,
          );
          expect(r.stderr).toContain('✋ ConstraintError: unknown argument');
          expect(r.stdout).not.toContain("let's watch");
        });
        expect(asSnapshotReadyWithAnsi(results[0]!.stdout)).toMatchSnapshot();
      });
      then(
        'a typo is refused plain, with no word of a gate it never tried to skip',
        () => {
          const result = runCase(mockResponses, ['--into', 'main', '--wach']);
          expect(result.status).toEqual(2);
          expect(result.stdout).toContain(
            '✋ ConstraintError: unknown argument: --wach',
          );
          expect(result.stdout).not.toContain('no flag skips the comment gate');
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        },
      );
    });

    when(
      '[t6] apply with --dirty allow, the one flag that loosens a gate',
      () => {
        then('still refuses on the comment, exit 2', () => {
          const result = runCase(mockResponses, [
            '--into',
            'main',
            '--apply',
            '--dirty',
            'allow',
          ]);
          expect(result.status).toEqual(2);
          expect(result.stdout).toContain(
            '✋ ConstraintError: release blocked until each comment has an answer',
          );
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        });
      },
    );
  });

  given('[case2] a pr whose every thread holds a signed answer', () => {
    const mockResponses = {
      'pr list': '42',
      'pr view': `SEQUENCE:${JSON.stringify([
        PR_PASSED_WOUT_AUTOMERGE,
        PR_MERGED,
      ])}`,
      'pr merge': 'auto-merge enabled',
      'api review comments': JSON.stringify([REVIEW_ASK, REVIEW_ANSWER]),
      'api graphql': asThreadsPage([{ isResolved: false, ids: [801, 802] }]),
    };

    when('[t0] apply', () => {
      then('passes the gate and enables automerge, exit 0', () => {
        const result = runCase(mockResponses, ['--into', 'main', '--apply']);
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('💬 all comments answered');
        expect(result.stdout).toContain('🌴 automerge enabled');
        expect(result.stdout).not.toContain('ConstraintError');
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case3] a pr whose only thread is resolved, with no reply', () => {
    when('[t0] apply', () => {
      then('passes the gate, exit 0', () => {
        const result = runCase(
          {
            'pr list': '42',
            'pr view': `SEQUENCE:${JSON.stringify([
              PR_PASSED_WOUT_AUTOMERGE,
              PR_MERGED,
            ])}`,
            'pr merge': 'auto-merge enabled',
            'api review comments': JSON.stringify([REVIEW_ASK]),
            'api graphql': asThreadsPage([{ isResolved: true, ids: [801] }]),
          },
          ['--into', 'main', '--apply'],
        );
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('💬 all comments answered');
      });
    });
  });

  given('[case4] a pr whose only comment is a bot release note', () => {
    when('[t0] apply', () => {
      then('passes the gate, exit 0', () => {
        const result = runCase(
          {
            'pr list': '42',
            'pr view': `SEQUENCE:${JSON.stringify([
              PR_PASSED_WOUT_AUTOMERGE,
              PR_MERGED,
            ])}`,
            'pr merge': 'auto-merge enabled',
            'api issue comments': JSON.stringify([ISSUE_BOT]),
          },
          ['--into', 'main', '--apply'],
        );
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('💬 all comments answered');
      });
    });

    when('[t1] a bot opens a review thread, with no reply', () => {
      then('the bot thread never blocks, exit 0', () => {
        const result = runCase(
          {
            'pr list': '42',
            'pr view': `SEQUENCE:${JSON.stringify([
              PR_PASSED_WOUT_AUTOMERGE,
              PR_MERGED,
            ])}`,
            'pr merge': 'auto-merge enabled',
            'api review comments': JSON.stringify([REVIEW_BOT]),
            'api graphql': asThreadsPage([{ isResolved: false, ids: [805] }]),
          },
          ['--into', 'main', '--apply'],
        );
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('💬 all comments answered');
        expect(result.stdout).not.toContain('review 805');
      });
    });

    when('[t2] the pr holds no comment at all', () => {
      then('says there is none to answer, never that each has one', () => {
        const result = runCase(
          {
            'pr list': '42',
            'pr view': `SEQUENCE:${JSON.stringify([
              PR_PASSED_WOUT_AUTOMERGE,
              PR_MERGED,
            ])}`,
            'pr merge': 'auto-merge enabled',
            'api issue comments': '[]',
            'api review comments': '[]',
          },
          ['--into', 'main', '--apply'],
        );
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('💬 no comments to answer');
        expect(result.stdout).not.toContain('all comments answered');
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case5] a top-level issue comment', () => {
    when('[t0] only an unrelated keyed robot comment follows it', () => {
      then('refuses, and the row names the exact answer key', () => {
        const result = runCase(
          {
            'pr list': '42',
            'pr view': PR_PASSED_WOUT_AUTOMERGE,
            'api issue comments': JSON.stringify([ISSUE_ASK, ISSUE_STATUS]),
          },
          ['--into', 'main', '--apply'],
        );
        expect(result.status).toEqual(2);
        expect(result.stdout).toContain(
          'issue 6407563822 · @commander · "also: the readme still names the old flag"',
        );
        expect(result.stdout).toContain(
          'rhx git.pull.comment set --pr 42 --key answer-6407563822 --from <file>',
        );
        // an issue comment has no resolved state, so that cure is never offered
        expect(result.stdout).not.toContain('resolved on github');
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] a signed answer keyed answer-<its id> follows it', () => {
      then('passes the gate, exit 0', () => {
        const result = runCase(
          {
            'pr list': '42',
            'pr view': `SEQUENCE:${JSON.stringify([
              PR_PASSED_WOUT_AUTOMERGE,
              PR_MERGED,
            ])}`,
            'pr merge': 'auto-merge enabled',
            'api issue comments': JSON.stringify([
              ISSUE_ASK,
              ISSUE_STATUS,
              ISSUE_ANSWER,
            ]),
          },
          ['--into', 'main', '--apply'],
        );
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('💬 all comments answered');
      });
    });
  });

  given('[case6] a re-asked thread, after one answer', () => {
    when('[t0] apply', () => {
      then(
        'refuses, and the row names a key new to this ask, so the answer posts fresh rather than edits the old one',
        () => {
          const result = runCase(
            {
              'pr list': '42',
              'pr view': PR_PASSED_WOUT_AUTOMERGE,
              'api review comments': JSON.stringify([
                REVIEW_ASK,
                REVIEW_ANSWER,
                REVIEW_ASK_AGAIN,
              ]),
              'api graphql': asThreadsPage([
                { isResolved: false, ids: [801, 802, 803] },
              ]),
            },
            ['--into', 'main', '--apply'],
          );
          expect(result.status).toEqual(2);
          expect(result.stdout).toContain('review 803');
          expect(result.stdout).toContain(
            '--reply-to 803 --key answer-803 --from <file>',
          );
          expect(result.stdout).not.toContain('--key answer --from'); // the prior answer's key
          expect(result.stdout).toContain('answered once, then asked again');
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        },
      );
    });
  });

  given('[case7] a thread answered by hand, unsigned', () => {
    when('[t0] apply', () => {
      then('refuses: an unsigned reply is no answer', () => {
        const result = runCase(
          {
            'pr list': '42',
            'pr view': PR_PASSED_WOUT_AUTOMERGE,
            'api review comments': JSON.stringify([
              REVIEW_ASK,
              REVIEW_HAND_REPLY,
            ]),
            'api graphql': asThreadsPage([
              { isResolved: false, ids: [801, 804] },
            ]),
          },
          ['--into', 'main', '--apply'],
        );
        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('review 804');
        expect(result.stdout).toContain('@human');
        // the row says why a reply in the thread does not clear it
        expect(result.stdout).toContain(
          'a reply with no 🐢 signature — only a signed answer, or a resolved thread, clears it',
        );
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case8] automerge already on, and a comment waits', () => {
    const mockResponses = {
      'pr list': '42',
      'pr view': PR_INFLIGHT_WITH_AUTOMERGE,
      'api review comments': JSON.stringify([REVIEW_ASK]),
      'api graphql': asThreadsPage([{ isResolved: false, ids: [801] }]),
    };

    when('[t0] apply', () => {
      then('disables automerge, refuses, exit 2', () => {
        const result = runCase(mockResponses, ['--into', 'main', '--apply']);
        expect(result.status).toEqual(2);
        expect(result.wasAutomergeDisabled).toEqual(true);
        expect(result.stdout).toContain(
          '🌴 automerge disabled [removed] — 1 comment(s) unanswered',
        );
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] watch', () => {
      then('disables automerge, refuses, exit 2', () => {
        const result = runCase(mockResponses, ['--into', 'main', '--watch']);
        expect(result.status).toEqual(2);
        expect(result.wasAutomergeDisabled).toEqual(true);
        expect(result.stdout).toContain('✋ ConstraintError');
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] plan', () => {
      then(
        'never mutates, exit 0, and says plainly that github will merge past the comments',
        () => {
          const result = runCase(mockResponses, ['--into', 'main']);
          expect(result.status).toEqual(0);
          expect(result.wasAutomergeDisabled).toEqual(false);
          expect(result.stdout).toContain('💬 1 comment(s) unanswered');
          expect(result.stdout).toContain(
            'github will merge past 1 comment(s) unanswered once checks pass',
          );
          expect(result.stdout).toContain(
            'hint: --watch or --apply turns automerge off',
          );
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        },
      );
    });

    when('[t3] apply, and the disable fails', () => {
      then('malfunction, exit 1, never a silent pass', () => {
        const result = runCase(
          {
            ...mockResponses,
            'pr merge disable':
              'ERROR:GraphQL: Resource not accessible by integration (HTTP 403)',
          },
          ['--into', 'main', '--apply'],
        );
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain(
          '💥 MalfunctionError: could not disable automerge while 1 comment(s) unanswered',
        );
        expect(result.stdout).toContain(
          'turn it off now: gh pr merge 42 --disable-auto',
        );
        expect(result.stderr).toContain('💥 MalfunctionError');
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });

    when(
      '[t4] apply, the disable fails, and automerge already reads off',
      () => {
        then(
          'converges: the refusal stands at exit 2, never a false malfunction',
          () => {
            const result = runCase(
              {
                ...mockResponses,
                'pr merge disable':
                  'ERROR:GraphQL: Pull request is not set to auto-merge (disablePullRequestAutoMerge)',
                'pr view automerge': 'false',
              },
              ['--into', 'main', '--apply'],
            );
            expect(result.status).toEqual(2);
            expect(result.stdout).toContain('✋ ConstraintError');
            expect(result.stdout).not.toContain('💥 MalfunctionError');
            expect(result.stderr).not.toContain('not set to auto-merge');
            expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
          },
        );
      },
    );
  });

  given('[case9] a reviewer comments mid-watch', () => {
    when(
      '[t0] apply passes the gate, then a poll finds the new comment',
      () => {
        then('the poll disables automerge and refuses, exit 2', () => {
          const result = runCase(
            {
              'pr list': '42',
              'pr view': `SEQUENCE:${JSON.stringify([
                PR_INFLIGHT_WOUT_AUTOMERGE,
                PR_INFLIGHT_WITH_AUTOMERGE,
              ])}`,
              'pr merge': 'auto-merge enabled',
              'api review comments': `SEQUENCE:${JSON.stringify([
                '[]',
                JSON.stringify([REVIEW_ASK]),
              ])}`,
              'api graphql': asThreadsPage([{ isResolved: false, ids: [801] }]),
            },
            ['--into', 'main', '--apply'],
          );
          expect(result.status).toEqual(2);
          expect(result.wasAutomergeDisabled).toEqual(true);
          // the gate read found no comment yet; the poll finds the new one
          expect(result.stdout).toContain('💬 no comments to answer');
          expect(result.stdout).toContain(
            '🌴 automerge disabled [removed] — 1 comment(s) unanswered',
          );
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        });
      },
    );
  });

  given('[case10] the comment read fails', () => {
    const mockResponses = {
      'pr list': '42',
      'pr view': PR_PASSED_WOUT_AUTOMERGE,
      'api issue comments': 'ERROR:gh: API rate limit exceeded (HTTP 403)',
      'pr merge auto': 'ERROR:automerge must not be enabled on a failed read',
    };

    when('[t0] apply', () => {
      then('malfunction, exit 1, never a silent all-answered', () => {
        const result = runCase(mockResponses, ['--into', 'main', '--apply']);
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain(
          '💥 MalfunctionError: could not read pr comments',
        );
        expect(result.stdout).toContain('rate limit resets');
        expect(result.stdout).not.toContain('all comments answered');
        expect(result.stderr).toContain('💥 MalfunctionError');
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        // the malfunction rides stderr too: snap it, so its shape is reviewed
        expect(asSnapshotReadyWithAnsi(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] plan', () => {
      then('the same malfunction, exit 1', () => {
        const result = runCase(mockResponses, ['--into', 'main']);
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain('💥 MalfunctionError');
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] the thread read names no pull request', () => {
      then('malfunction, exit 1, never every thread defaulted to open', () => {
        const result = runCase(
          {
            'pr list': '42',
            'pr view': PR_PASSED_WOUT_AUTOMERGE,
            'api review comments': JSON.stringify([REVIEW_ASK]),
            'api graphql': JSON.stringify({ data: { repository: null } }),
            'pr merge auto':
              'ERROR:automerge must not be enabled on a failed read',
          },
          ['--into', 'main', '--apply'],
        );
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain(
          '💥 MalfunctionError: could not read pr comments',
        );
        expect(result.stdout).not.toContain('✋ ConstraintError');
        expect(result.stderr).toContain(
          'github found no pull request #42 for the review thread read',
        );
        // plain words: no raw response envelope reaches the human
        expect(result.stdout).not.toContain('{"data"');
        expect(result.stdout).toContain(
          'if it fails again, confirm the pr exists: gh pr view 42',
        );
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        expect(asSnapshotReadyWithAnsi(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t3] the read is refused for its credential (HTTP 401)', () => {
      then('the fix names the token scope, exit 1', () => {
        const result = runCase(
          {
            ...mockResponses,
            'api issue comments': 'ERROR:gh: Bad credentials (HTTP 401)',
          },
          ['--into', 'main', '--apply'],
        );
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain(
          'detail: gh: Bad credentials (HTTP 401)',
        );
        expect(result.stdout).toContain(
          'fix: give the token read access to pull requests and issues of this repo; see its scopes: gh auth status',
        );
        expect(result.stdout).not.toContain('rate limit');
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t4] the read fails with no words from gh', () => {
      then('the detail names the exit code, and the fix is a rerun', () => {
        const result = runCase(
          { ...mockResponses, 'api issue comments': 'ERROR:' },
          ['--into', 'main', '--apply'],
        );
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain(
          'detail: gh command failed with exit code 1',
        );
        expect(result.stdout).toContain(
          'fix: rerun the same command: the comment read is safe to repeat',
        );
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case11] checks failed, and a comment waits', () => {
    // pr view: failed at the gate read, passed on each later read (the rerun went green)
    const PR_FAILED_WOUT_AUTOMERGE =
      '{"statusCheckRollup": [{"conclusion": "FAILURE", "status": "COMPLETED", "name": "test-unit", "detailsUrl": "https://github.com/test/repo/actions/runs/123"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(reef): add tide sensor"}';
    const mockResponses = {
      'pr list': '42',
      'pr view': `SEQUENCE:${JSON.stringify([
        PR_FAILED_WOUT_AUTOMERGE,
        PR_PASSED_WOUT_AUTOMERGE,
      ])}`,
      'run view jobs': 'Run jest tests',
      'run view duration':
        '{"startedAt": "2026-10-01T00:00:00Z", "updatedAt": "2026-10-01T00:02:34Z"}',
      'run rerun': 'rerun triggered',
      'api review comments': JSON.stringify([REVIEW_ASK]),
      'api graphql': asThreadsPage([{ isResolved: false, ids: [801] }]),
    };

    when('[t0] apply with --retry', () => {
      then(
        'reruns the checks, then refuses on the comment, exit 2: retry never carries apply past the gate',
        () => {
          const result = runCase(mockResponses, [
            '--into',
            'main',
            '--apply',
            '--retry',
          ]);
          expect(result.status).toEqual(2);
          expect(result.stdout).toContain('👌 rerun triggered');
          expect(result.stdout).toContain(
            '✋ ConstraintError: release blocked until each comment has an answer',
          );
          expect(result.stdout).not.toContain('🌴 automerge enabled');
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        },
      );
    });

    when('[t1] apply, no retry', () => {
      then('shows the check hints, then the comment refusal, exit 2', () => {
        const result = runCase(mockResponses, ['--into', 'main', '--apply']);
        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('hint: use --retry');
        expect(result.stdout).toContain('✋ ConstraintError');
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case12] on main, the release pr holds an unanswered comment', () => {
    // .note = no 'pr list title' key: the simple mock routes any jq that names `.title`
    //         to it, the number lookup included, so the release pr would read as its title
    const mockResponses = {
      'pr list': '99',
      'pr view':
        '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "chore(release): v1.3.0 🎉"}',
      // the comment sits on the release pr, so its link names #99
      'api issue comments': JSON.stringify([
        {
          ...ISSUE_ASK,
          html_url:
            'https://github.com/ehmpathy/reef/pull/99#issuecomment-6407563822',
        },
      ]),
      'pr merge auto': 'ERROR:automerge must not be enabled past the gate',
    };

    when('[t0] apply --into prod', () => {
      then('refuses at the release pr, exit 2, never enables automerge', () => {
        const result = runCase(
          mockResponses,
          ['--into', 'prod', '--apply'],
          'main',
        );
        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('chore(release): v1.3.0');
        expect(result.stdout).toContain(
          '✋ ConstraintError: release blocked until each comment has an answer',
        );
        expect(result.stdout).toContain('--pr 99 --key answer-6407563822');
        expect(result.stdout).toContain('/pull/99#issuecomment-6407563822');
        expect(result.stdout).not.toContain('/pull/42');
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case13] the comment read fails while automerge is on', () => {
    const READ_FAILS = 'ERROR:gh: HTTP 502: Bad Gateway';

    when('[t0] apply', () => {
      then(
        'fails closed: turns automerge off, then malfunction, exit 1',
        () => {
          const result = runCase(
            {
              'pr list': '42',
              'pr view': PR_INFLIGHT_WITH_AUTOMERGE,
              'api issue comments': READ_FAILS,
            },
            ['--into', 'main', '--apply'],
          );
          expect(result.status).toEqual(1);
          expect(result.wasAutomergeDisabled).toEqual(true);
          expect(result.stdout).toContain(
            '💥 MalfunctionError: could not read pr comments',
          );
          expect(result.stdout).toContain(
            'automerge: disabled [removed], so github cannot merge past an unread comment',
          );
          expect(result.stderr).toContain('💥 MalfunctionError');
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        },
      );
    });

    when('[t1] plan', () => {
      then(
        'never mutates; names that automerge is still on and the command that turns it off',
        () => {
          const result = runCase(
            {
              'pr list': '42',
              'pr view': PR_INFLIGHT_WITH_AUTOMERGE,
              'api issue comments': READ_FAILS,
            },
            ['--into', 'main'],
          );
          expect(result.status).toEqual(1);
          expect(result.wasAutomergeDisabled).toEqual(false);
          expect(result.stdout).toContain(
            'automerge: still on — github may merge past an unread comment',
          );
          // the urgent move sits under fix:, where a driver scans for it
          expect(result.stdout).toContain(
            'fix: turn it off now: gh pr merge 42 --disable-auto\n',
          );
          expect(result.stdout).toContain('└─ then: rerun');
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        },
      );
    });

    when('[t2] apply, and the disable fails too', () => {
      then('malfunction, exit 1, with the command to turn it off', () => {
        const result = runCase(
          {
            'pr list': '42',
            'pr view': PR_INFLIGHT_WITH_AUTOMERGE,
            'api issue comments': READ_FAILS,
            'pr merge disable':
              'ERROR:GraphQL: Resource not accessible by integration (HTTP 403)',
          },
          ['--into', 'main', '--apply'],
        );
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain(
          'automerge: still on, and the disable failed',
        );
        expect(result.stdout).toContain(
          'fix: turn it off now: gh pr merge 42 --disable-auto\n',
        );
        expect(result.stdout).toContain('└─ then: rerun');
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] watch, and a later poll read fails', () => {
      then(
        'the poll fails closed: turns automerge off, then malfunction, exit 1',
        () => {
          const result = runCase(
            {
              'pr list': '42',
              'pr view': PR_INFLIGHT_WITH_AUTOMERGE,
              'api issue comments': `SEQUENCE:${JSON.stringify(['[]', READ_FAILS])}`,
            },
            ['--into', 'main', '--watch'],
          );
          expect(result.status).toEqual(1);
          expect(result.wasAutomergeDisabled).toEqual(true);
          // the gate read found no comment; the later poll read fails
          expect(result.stdout).toContain('💬 no comments to answer');
          expect(result.stdout).toContain(
            'automerge: disabled [removed], so github cannot merge past an unread comment',
          );
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        },
      );
    });

    when('[t4] watch, a poll finds a comment, and the disable fails', () => {
      then('malfunction, exit 1, with the command to turn it off', () => {
        const result = runCase(
          {
            'pr list': '42',
            'pr view': PR_INFLIGHT_WITH_AUTOMERGE,
            'api issue comments': `SEQUENCE:${JSON.stringify(['[]', JSON.stringify([ISSUE_ASK])])}`,
            'pr merge disable':
              'ERROR:GraphQL: Resource not accessible by integration (HTTP 403)',
          },
          ['--into', 'main', '--watch'],
        );
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain(
          '💥 MalfunctionError: could not disable automerge while 1 comment(s) unanswered',
        );
        expect(result.stdout).toContain(
          'turn it off now: gh pr merge 42 --disable-auto',
        );
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case14] several comments wait, of each shape', () => {
    const REVIEW_SUGGESTION_OUTDATED = {
      id: 805,
      user: { login: 'commander' },
      created_at: '2026-10-01T00:30:00Z',
      in_reply_to_id: null,
      path: 'src/reef/setSensor.ts',
      line: null,
      html_url: 'https://github.com/ehmpathy/reef/pull/42#discussion_r805',
      body: '```suggestion\nconst sensor = genSensor({ reef });\n```',
    };
    const ISSUE_QUOTED = {
      ...ISSUE_ASK,
      id: 6407563830,
      html_url:
        'https://github.com/ehmpathy/reef/pull/42#issuecomment-6407563830',
      body: 'the readme says "tide" where it means "swell"',
    };

    when('[t0] apply', () => {
      then(
        'one row per comment, each with its own exact answer, exit 2',
        () => {
          const result = runCase(
            {
              'pr list': '42',
              'pr view': PR_PASSED_WOUT_AUTOMERGE,
              'api review comments': JSON.stringify([
                REVIEW_SUGGESTION_OUTDATED,
                REVIEW_ASK,
              ]),
              'api issue comments': JSON.stringify([ISSUE_QUOTED]),
              'api graphql': asThreadsPage([
                { isResolved: false, ids: [805] },
                { isResolved: false, ids: [801] },
              ]),
            },
            ['--into', 'main', '--apply'],
          );
          expect(result.status).toEqual(2);
          expect(result.stdout).toContain('💬 3 comment(s) unanswered');
          expect(result.stdout).toContain(
            'review 805 · src/reef/setSensor.ts · @commander · "suggestion: const sensor = genSensor({ reef });"',
          );
          expect(result.stdout).toContain(
            `"the readme says 'tide' where it means 'swell'"`,
          );
          expect(result.stdout).toContain('--reply-to 805 --key answer-805');
          expect(result.stdout).toContain('--key answer-6407563830');
          // each row links to its own comment
          expect(result.stdout).toContain('#issuecomment-6407563830');
          expect(result.stdout).toContain('#discussion_r805');
          expect(result.stdout).toContain('#discussion_r801');
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        },
      );
    });
  });

  given('[case15] the pr already merged, with a comment unanswered', () => {
    when('[t0] apply', () => {
      then('reports the merge, reads no comments, exit 0', () => {
        const result = runCase(
          {
            'pr list': '42',
            'pr view': PR_MERGED,
            'api issue comments': JSON.stringify([ISSUE_ASK]),
          },
          ['--into', 'main', '--apply'],
        );
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('already merged');
        expect(result.stdout).not.toContain('💬');
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case16] the pr needs a rebase, and a comment waits', () => {
    const PR_BEHIND =
      '{"statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED", "name": "test"}], "autoMergeRequest": null, "mergeStateStatus": "BEHIND", "state": "OPEN", "title": "feat(reef): add tide sensor"}';

    when('[t0] apply', () => {
      then('shows the rebase, then the comment refusal last, exit 2', () => {
        const result = runCase(
          {
            'pr list': '42',
            'pr view': PR_BEHIND,
            'api issue comments': JSON.stringify([ISSUE_ASK]),
          },
          ['--into', 'main', '--apply'],
        );
        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('needs rebase');
        expect(result.stdout).toContain(
          '└─ ✋ ConstraintError: release blocked until each comment has an answer',
        );
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] apply, and the rebase has conflicts (DIRTY)', () => {
      then('shows the conflict, then the comment refusal last, exit 2', () => {
        const result = runCase(
          {
            'pr list': '42',
            'pr view': PR_BEHIND.replace('"BEHIND"', '"DIRTY"'),
            'api issue comments': JSON.stringify([ISSUE_ASK]),
          },
          ['--into', 'main', '--apply'],
        );
        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('needs rebase, has conflicts');
        expect(result.stdout).toContain(
          '└─ ✋ ConstraintError: release blocked until each comment has an answer',
        );
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case17] plan, with checks failed and a comment unanswered', () => {
    const PR_FAILED =
      '{"statusCheckRollup": [{"conclusion": "FAILURE", "status": "COMPLETED", "name": "test-unit", "detailsUrl": "https://github.com/test/repo/actions/runs/123"}], "autoMergeRequest": null, "mergeStateStatus": "CLEAN", "state": "OPEN", "title": "feat(reef): add tide sensor"}';

    when('[t0] plan', () => {
      then(
        'shows both, the check hints then the apply warn, never refuses, exit 2 for the checks',
        () => {
          const result = runCase(
            {
              'pr list': '42',
              'pr view': PR_FAILED,
              'run view jobs': 'Run jest tests',
              'run view duration':
                '{"startedAt": "2026-10-01T00:00:00Z", "updatedAt": "2026-10-01T00:02:34Z"}',
              'api issue comments': JSON.stringify([ISSUE_ASK]),
            },
            ['--into', 'main'],
          );
          expect(result.status).toEqual(2);
          expect(result.stdout).toContain('💬 1 comment(s) unanswered');
          expect(asSnapshotReadyWithAnsi(result.stdout)).toContain(
            '├─ [dim]hint: use rhx show.gh.test.errors',
          );
          // the apply warn still ends the tree, beside the check hints
          expect(asSnapshotReadyWithAnsi(result.stdout)).toContain(
            '└─ [dim]hint: --apply will refuse until each comment has an answer',
          );
          expect(result.stdout).not.toContain('✋ ConstraintError');
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        },
      );
    });
  });

  given('[case18] the watch times out while checks still run', () => {
    // a short timeout: the test clock advances 5s per poll and stops at 100 polls
    const TIMEOUT_ENV = { GIT_RELEASE_WATCH_TIMEOUT: '30' };

    when('[t0] watch, automerge on, every comment answered', () => {
      then(
        'exit 2, and says automerge stays on with no gate, plus the command that turns it off',
        () => {
          const result = runCase(
            {
              'pr list': '42',
              'pr view': PR_INFLIGHT_WITH_AUTOMERGE,
              'api review comments': JSON.stringify([
                REVIEW_ASK,
                REVIEW_ANSWER,
              ]),
              'api graphql': asThreadsPage([
                { isResolved: false, ids: [801, 802] },
              ]),
            },
            ['--into', 'main', '--watch'],
            'feat',
            TIMEOUT_ENV,
          );
          expect(result.status).toEqual(2);
          expect(result.wasAutomergeDisabled).toEqual(false);
          expect(result.stdout).toContain('⏰ timeout after 30s');
          expect(result.stdout).toContain(
            'automerge: still on — github merges once checks pass, and no gate reads a comment that lands after this exit',
          );
          expect(result.stdout).toContain('gh pr merge 42 --disable-auto');
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        },
      );
    });

    when('[t1] watch, automerge off', () => {
      then('exit 2, and the timeout line alone', () => {
        const result = runCase(
          {
            'pr list': '42',
            'pr view': PR_INFLIGHT_WOUT_AUTOMERGE,
          },
          ['--into', 'main', '--watch'],
          'feat',
          TIMEOUT_ENV,
        );
        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('└─ ⏰ timeout after 30s');
        expect(result.stdout).not.toContain('automerge: still on');
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case20] the watch is stopped by a signal mid-run', () => {
    when(
      '[t0] watch, automerge on, every comment answered, then SIGTERM',
      () => {
        then(
          'says automerge stays on with no gate, names the command, exits 143',
          async () => {
            const result = await runCaseThenSignal(
              {
                'pr list': '42',
                'pr view': PR_INFLIGHT_WITH_AUTOMERGE,
                'api review comments': JSON.stringify([
                  REVIEW_ASK,
                  REVIEW_ANSWER,
                ]),
                'api graphql': asThreadsPage([
                  { isResolved: false, ids: [801, 802] },
                ]),
              },
              ['--into', 'main', '--watch'],
              'SIGTERM',
            );
            expect(result.code).toEqual(143);
            expect(result.stdout).toContain(
              '🛑 watch stopped before the merge',
            );
            expect(result.stdout).toContain(
              'automerge: still on — github merges once checks pass, and no gate reads a comment that lands after this exit',
            );
            expect(result.stdout).toContain('gh pr merge 42 --disable-auto');
            expect(result.stderr).toContain(
              '🛑 watch stopped before the merge',
            );
            expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
          },
        );
      },
    );

    when('[t1] watch, automerge off, then SIGINT', () => {
      then('the stop line alone, exits 130', async () => {
        const result = await runCaseThenSignal(
          {
            'pr list': '42',
            'pr view': PR_INFLIGHT_WOUT_AUTOMERGE,
          },
          ['--into', 'main', '--watch'],
          'SIGINT',
        );
        expect(result.code).toEqual(130);
        expect(result.stdout).toContain('🛑 watch stopped before the merge');
        expect(result.stdout).not.toContain('automerge: still on');
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] a stop lands before the first poll reads the pr', () => {
      then('the automerge state reads unread, never a silent "off"', () => {
        // the watch seeds its state as unknown; this pins what that state prints,
        // under the trunk a watch prints above it, so the snap shows its depth
        const outputPath = path.join(path.dirname(SKILL_PATH), 'output.sh');
        const result = spawnSync(
          'bash',
          [
            '-c',
            'source "$1"; echo "🌊 release: feat(reef): add tide sensor"; echo "   └─ 🥥 let\'s watch"; print_watch_stopped 42 unknown',
            '_',
            outputPath,
          ],
          { encoding: 'utf-8' },
        );
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('🛑 watch stopped before the merge');
        expect(result.stdout).toContain(
          'automerge: unread — this watch stopped before its first poll',
        );
        expect(result.stdout).toContain('gh pr merge 42 --disable-auto');
        expect(result.stderr).toContain('automerge: unread');
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case19] the unanswered comment sits on the second page', () => {
    // page 1 holds an ask and its answer; page 2 holds the re-ask. only a
    // read that walks every page (--paginate) sees that the thread waits
    const mockResponses = {
      'pr list': '42',
      'pr view': PR_PASSED_WOUT_AUTOMERGE,
      'api review comments': `PAGES:${JSON.stringify([
        [REVIEW_ASK, REVIEW_ANSWER],
        [REVIEW_ASK_AGAIN],
      ])}`,
      'api graphql': asThreadsPage([
        { isResolved: false, ids: [801, 802, 803] },
      ]),
      'pr merge auto':
        'ERROR:automerge must not be enabled while a comment waits',
    };

    when('[t0] apply', () => {
      then('refuses on the page 2 row, exit 2', () => {
        const result = runCase(mockResponses, ['--into', 'main', '--apply']);
        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('💬 1 comment(s) unanswered');
        expect(result.stdout).toContain('review 803');
        expect(result.stdout).toContain('resolved on github');
        expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
      });
    });

    when(
      '[t1] the resolved thread is named only on the second graphql page',
      () => {
        // page 1 names an unrelated thread; page 2 marks 801's thread resolved.
        // a read that stops at page 1 defaults 801 to open, and refuses
        then('every thread page is walked: 801 reads resolved, exit 0', () => {
          const result = runCase(
            {
              'pr list': '42',
              'pr view': `SEQUENCE:${JSON.stringify([
                PR_PASSED_WOUT_AUTOMERGE,
                PR_MERGED,
              ])}`,
              'pr merge': 'auto-merge enabled',
              'api review comments': JSON.stringify([REVIEW_ASK]),
              'api graphql': `PAGES:[${asThreadsPage([
                { isResolved: false, ids: [900] },
              ])},${asThreadsPage([{ isResolved: true, ids: [801] }])}]`,
            },
            ['--into', 'main', '--apply'],
          );
          expect(result.status).toEqual(0);
          expect(result.stdout).toContain('💬 all comments answered');
          expect(result.stdout).not.toContain('✋ ConstraintError');
          expect(result.stdout).not.toContain('review 801');
          expect(asSnapshotReadyWithAnsi(result.stdout)).toMatchSnapshot();
        });
      },
    );
  });
});
