import { spawnSync } from 'child_process';
import { ConstraintError, MalfunctionError } from 'helpful-errors';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = integration test against the REAL github reviews endpoint the
 *         git.release review gate reads, through the real `gh` cli
 *
 * .why  = every other git.release suite fakes `gh api .../pulls/N/reviews`,
 *         each with a `.mock`/`.why`/`.real` block. this suite is where the
 *         gate's `.real` points: the real endpoint, called by the real
 *         get_pr_reviews, and the gate's verdict on what it returns
 *         (rule.require.external-contract-integration-tests).
 *
 * .note = no credential is needed, on purpose, so the suite runs on every host
 *         and in ci. it drives the real service into the lack-of-creds state
 *         the rule requires at minimum. the positive read (a real approval on
 *         a real pr) needs a repo secret, and waits in
 *         .dream/2026_09_26.add-real-gh-contract-test-for-git-release.dream.md
 */
describe('external contracts — the real reviews read behind the git.release gate', () => {
  const skillDir = __dirname;
  const repoRoot = path.join(__dirname, '../../../../..');

  /**
   * .what = run bash with the gate's files sourced; fail loud if bash or gh is absent
   * .why  = an absent cli must never read as a pass (rule.require.failfast)
   */
  const runGateBash = (input: {
    body: string;
    env: NodeJS.ProcessEnv;
  }): { stdout: string; stderr: string; exitCode: number } => {
    const which = spawnSync('which', ['gh'], { encoding: 'utf-8' }); // note: library api requires this term
    if (which.status !== 0)
      throw new ConstraintError('gh is required for this test', {
        hint: 'install gh on this host',
      });

    const prelude = [
      `source "${path.join(skillDir, 'output.sh')}"`,
      `source "${path.join(skillDir, 'git.release.operations.sh')}"`,
      `source "${path.join(skillDir, 'git.release._.guard_pr_has_human_approval.sh')}"`,
    ].join('\n');
    const result = spawnSync('bash', ['-c', `${prelude}\n${input.body}`], {
      cwd: repoRoot,
      env: input.env,
      encoding: 'utf-8', // note: library api requires this term
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 90_000,
    });
    if (result.error)
      throw new ConstraintError('bash is required for this test', {
        error: result.error.message,
        hint: 'install bash on this host',
      });
    if (result.status === null)
      throw new MalfunctionError('the gate did not exit in 90s', {
        signal: result.signal,
        hint: 'check network reach to api.github.com; gh may hang on a stalled connection',
      });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status,
    };
  };

  given('[case1] the real gh cli, with no credential at all', () => {
    // .why = GH_CONFIG_DIR at an empty dir and no GH_TOKEN / GITHUB_TOKEN is
    //        the state a host with no `gh auth login` and no keyrack token is in
    const asEnvWithoutCredential = (): NodeJS.ProcessEnv => {
      const ghConfigDir = genTempDir({ slug: 'gh-no-credential', git: false });
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        GH_CONFIG_DIR: ghConfigDir,
        TERM: 'dumb',
      };
      delete env.GH_TOKEN;
      delete env.GITHUB_TOKEN;
      return env;
    };

    when('[t0] get_pr_reviews reads a real pr of this repo', () => {
      const result = useThen('the real gh answers', () =>
        runGateBash({
          body: 'get_pr_reviews pr_number=1339',
          env: asEnvWithoutCredential(),
        }),
      );

      then('the read fails; it never returns an empty, approvable list', () => {
        expect(result.exitCode).not.toBe(0);
        expect(result.stdout.trim()).toEqual('');
      });

      then('the real cause from gh reaches stderr', () => {
        expect(result.stderr.trim()).not.toEqual('');
      });
    });

    when('[t1] the gate runs on that read', () => {
      const result = useThen('the gate decides', () =>
        runGateBash({
          body: [
            `guard_pr_has_human_approval pr_number=1339 \\`,
            `  status_json='{"title":"fix(release): refuse unreviewed","url":"https://github.com/ehmpathy/rhachet-roles-ehmpathy/pull/1339","autoMergeRequest":null}' \\`,
            `  command_line='🐚 git.release --into main --mode apply'`,
          ].join('\n'),
          env: asEnvWithoutCredential(),
        }),
      );

      then(
        'exit 1: a malfunction, never a pass and never a false refusal',
        () => {
          expect(result.exitCode).toBe(1);
        },
      );

      then('names the unread reviews on both streams', () => {
        expect(result.stdout).toContain(
          '💥 MalfunctionError: could not read the reviews on pr #1339',
        );
        expect(result.stderr).toContain(
          'could not read the reviews on pr #1339',
        );
        expect(result.stdout).not.toContain('ConstraintError');
      });
    });
  });

  given('[case2] a recorded real reviews payload from github', () => {
    // .what = three reviews as `GET /repos/ehmpathy/rhachet-roles-ehmpathy/pulls/1022/reviews`
    //         returned them on 2026-11-15, trimmed to the fields github sends that matter
    //         plus a few it sends that must be ignored; the human login is anonymized
    // .why  = the scene mocks serve reviews already flattened, so no other suite runs
    //         the shipped `--jq` filter; here it runs on the real rest shape
    const HEAD = '94357083284d5c0ae4807561b295eb2c83a0e970';
    const payloadRecorded = JSON.stringify([
      {
        id: 3001,
        node_id: 'PRR_kwDOAAAA',
        user: {
          login: 'reef-keeper',
          id: 1001,
          type: 'User',
          site_admin: false,
        },
        body: '',
        state: 'COMMENTED',
        html_url:
          'https://github.com/ehmpathy/rhachet-roles-ehmpathy/pull/1022#pullrequestreview-3001',
        author_association: 'MEMBER',
        submitted_at: '2026-11-06T13:44:22Z',
        commit_id: HEAD,
      },
      {
        id: 3002,
        node_id: 'PRR_kwDOAAAB',
        user: {
          login: 'reef-keeper',
          id: 1001,
          type: 'User',
          site_admin: false,
        },
        body: 'lgtm',
        state: 'APPROVED',
        html_url:
          'https://github.com/ehmpathy/rhachet-roles-ehmpathy/pull/1022#pullrequestreview-3002',
        author_association: 'MEMBER',
        submitted_at: '2026-11-06T13:46:29Z',
        commit_id: HEAD,
      },
      {
        id: 3003,
        node_id: 'PRR_kwDOAAAC',
        user: {
          login: 'ehm-seaturtle',
          id: 259600029,
          type: 'User',
          site_admin: false,
        },
        body: 'notes',
        state: 'COMMENTED',
        html_url:
          'https://github.com/ehmpathy/rhachet-roles-ehmpathy/pull/1022#pullrequestreview-3003',
        author_association: 'MEMBER',
        submitted_at: '2026-11-06T14:09:01Z',
        commit_id: HEAD,
      },
    ]);

    when('[t0] the shipped --jq filter and verdict run over it', () => {
      const result = useThen('the gate decides', () =>
        runGateBash({
          body: [
            `source "${path.join(skillDir, '../git.commit/keyrack.operations.sh')}"`,
            `items=$(echo "$PAYLOAD" | jq -c "$GH_REVIEW_ITEMS_JQ" | jq -s '.')`,
            `echo "$items"`,
            `is_pr_approved_by_human reviews_json="$items" head_sha="${HEAD}"`,
            `is_pr_approved_by_human reviews_json="$items" head_sha="0000000000000000000000000000000000000000"`,
          ].join('\n'),
          env: { ...process.env, PAYLOAD: payloadRecorded },
        }),
      );

      then('the filter keeps exactly the fields the gate decides on', () => {
        const items = JSON.parse(
          result.stdout.split('\n').slice(0, -3).join('\n'),
        );
        expect(items[1]).toEqual({
          login: 'reef-keeper',
          type: 'User',
          association: 'MEMBER',
          state: 'APPROVED',
          submitted_at: '2026-11-06T13:46:29Z',
          commit_id: HEAD,
        });
      });

      then(
        'a human member approval of the head is approved; of another head, not',
        () => {
          const lines = result.stdout.trim().split('\n');
          expect(lines.slice(-2)).toEqual(['true', 'false']);
          expect(result.exitCode).toBe(0);
        },
      );
    });
  });
});
