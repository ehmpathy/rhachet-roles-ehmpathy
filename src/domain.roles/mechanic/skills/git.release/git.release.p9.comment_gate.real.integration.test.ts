import { spawnSync } from 'child_process';
import * as fs from 'fs';
import { ConstraintError } from 'helpful-errors';
import * as os from 'os';
import * as path from 'path';
import { given, then, useThen, when } from 'test-fns';

/**
 * .what = the real-api case for the comment gate's own gh calls
 * .why  = the p9 stub suite proves the gate against a stub gh; this case
 *         proves the communicators it rests on against github itself: the
 *         paginated comment lists, the graphql reviewThreads read with gh's
 *         {owner}/{repo} fill in -F values, and the disable that converges
 *
 * .note = the communicators are sourced and called directly, at the grain
 *         where the external contract lives. cwd = this repo's root, so gh
 *         fills {owner}/{repo} from its origin, as a real release run does
 * .note = the target is a merged pr with review threads, so the read is
 *         stable and the disable can only ever be a no-op: a merged pr holds
 *         no automerge to turn off. a live enable → disable on an open pr is
 *         not run: an enabled automerge can merge the pr before the disable
 * .note = ci never runs this case: it aims a --disable-auto at a live pr, and
 *         a test job holds no github write scope (jest.integration.config.ts
 *         excludes it). run it by hand, under a gh login:
 *         npx jest -c jest.integration.config.ts --testMatch '<rootDir>/src/domain.roles/mechanic/skills/git.release/git.release.p9.comment_gate.real.integration.test.ts'
 */
describe('git.release comment gate (real github api)', () => {
  const PR = '1143';
  const repoRoot = path.join(__dirname, '../../../../..');
  const opsPath = path.join(__dirname, 'git.release.operations.sh');

  /**
   * .what = confirm gh holds a credential, or throw a loud ConstraintError
   */
  const assertGhAuth = (): void => {
    const status = spawnSync('gh', ['auth', 'status'], { encoding: 'utf-8' });
    if (status.status === 0) return;
    throw new ConstraintError('gh auth required for the real-api case', {
      detail: status.stderr || status.stdout,
      hint: 'gh auth login',
    });
  };

  /**
   * .what = source the operations and call one communicator, live
   */
  const callOperation = (input: {
    operation: 'get_all_pr_comment_rows' | 'disable_automerge';
    env: NodeJS.ProcessEnv;
  }) => {
    const result = spawnSync(
      'bash',
      ['-c', 'source "$1"; shift; "$@"', '_', opsPath, input.operation, PR],
      {
        cwd: repoRoot,
        encoding: 'utf-8',
        env: { ...input.env, SKILL_DIR: __dirname },
      },
    );
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  given('[case1] a merged home-org pr with review threads', () => {
    when('[t0] the gate reads its comment rows', () => {
      const result = useThen('it reads', async () => {
        assertGhAuth();
        return callOperation({
          operation: 'get_all_pr_comment_rows',
          env: process.env,
        });
      });
      then('the read succeeds', () => {
        expect(result.stderr).toEqual('');
        expect(result.exitCode).toEqual(0);
      });
      then(
        'both lists arrive: the issue comment and every review comment',
        () => {
          const rows: { kind: string }[] = JSON.parse(result.stdout);
          expect(rows.filter((row) => row.kind === 'issue').length).toEqual(1);
          expect(rows.filter((row) => row.kind === 'review').length).toEqual(
            16,
          );
        },
      );
      then(
        'the graphql read named the pull request: gh filled {owner}/{repo}',
        () => {
          // the reader fails closed on a page with no pull request, so exit 0
          // over review rows proves the placeholders resolved to this repo
          const rows: { kind: string; thread: string | null }[] = JSON.parse(
            result.stdout,
          );
          const threads = rows
            .filter((row) => row.kind === 'review')
            .map((row) => row.thread);
          expect(threads.length).toBeGreaterThan(0);
          threads.forEach((thread) =>
            expect(['open', 'resolved']).toContain(thread),
          );
        },
      );
      then(
        'the live row shape is snapped, so a drift from the p9 fixtures shows in review',
        () => {
          // body omitted: long prose, and its bytes + sha256 already pin it
          // thread omitted: a human can close a thread on github at any time; the then above asserts its shape
          // author masked: a real login never lands in a snapshot; a bot keeps its name,
          //   and each row's `key` still tells an answer from an ask
          // created_at masked: a timestamp in a snapshot drifts; its presence is the shape
          const rows: {
            body: string;
            author: string;
            thread: string;
            created_at: string;
          }[] = JSON.parse(result.stdout);
          expect(rows.every((row) => !!row.created_at)).toEqual(true);
          expect(
            rows.map(
              ({
                body: _body,
                thread: _thread,
                created_at: _createdAt,
                author,
                ...rest
              }) => ({
                ...rest,
                author: author.endsWith('[bot]') ? author : '<login>',
                created_at: '<timestamp>',
              }),
            ),
          ).toMatchSnapshot();
        },
      );
    });

    when('[t1] the gate disables automerge, already off', () => {
      const result = useThen('it disables', async () => {
        assertGhAuth();
        return callOperation({
          operation: 'disable_automerge',
          env: process.env,
        });
      });
      then('it converges: exit 0, gh quiet', () => {
        expect(result.exitCode).toEqual(0);
        expect(result.stderr).toEqual('');
      });
    });
  });

  given('[case2] no gh credential reachable', () => {
    const configDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'gh-config-empty-'),
    );
    afterAll(() => fs.rmSync(configDir, { recursive: true, force: true }));
    const {
      GH_TOKEN: _ghToken,
      GITHUB_TOKEN: _githubToken,
      ...envBare
    } = process.env;
    const envNoAuth = { ...envBare, GH_CONFIG_DIR: configDir };

    when('[t0] the gate reads its comment rows', () => {
      then('it fails loud and closed, with gh words on stderr', () => {
        const result = callOperation({
          operation: 'get_all_pr_comment_rows',
          env: envNoAuth,
        });
        expect(result.exitCode).not.toEqual(0);
        expect(result.stdout).toEqual('');
        expect(result.stderr).not.toEqual('');
      });
    });

    when('[t1] the gate disables automerge', () => {
      then('it fails loud, never a silent success', () => {
        const result = callOperation({
          operation: 'disable_automerge',
          env: envNoAuth,
        });
        expect(result.exitCode).not.toEqual(0);
        expect(result.stderr).not.toEqual('');
      });
    });
  });
});
