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
 *         and in ci. case1 drives the real gh into the lack-of-creds state;
 *         case3 reads a real approval on a real pr of this public repo, with
 *         no credential, and runs the gate's filter and verdict over it. the
 *         one read left unproven live is gh's own authed call (it needs the
 *         repo secret EHMPATHY_SEATURTLE_GITHUB_TOKEN, absent in ci); it waits in
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
            `echo "approved on head: $(is_pr_approved_by_human reviews_json="$items" head_sha="${HEAD}")"`,
            `echo "approved on a head the review does not cover: $(is_pr_approved_by_human reviews_json="$items" head_sha="0000000000000000000000000000000000000000")"`,
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
          expect(lines.slice(-2)).toEqual([
            'approved on head: true',
            'approved on a head the review does not cover: false',
          ]);
          expect(result.exitCode).toBe(0);
        },
      );

      then('the frozen-payload transcript matches the snapshot', () => {
        // the payload is frozen, so the filtered items + verdicts are stable;
        // submitted_at is masked (the timestamp hook forbids raw stamps in
        // snapshots) and pinned exact by the toEqual above
        expect(
          result.stdout.replace(
            /"submitted_at": "[^"]+"/g,
            '"submitted_at": "<masked>"',
          ),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case3] the live reviews of a merged pr of this public repo', () => {
    // .what = a real GET of the real endpoint, then the shipped --jq filter and
    //         verdict over the live payload
    // .why  = proves the success shape github sends today (user.login,
    //         user.type, author_association, state, commit_id) still yields an
    //         approval; a rename upstream turns this red, where case2 replays
    //         a frozen string
    // .note = this repo is public, so the reviews endpoint answers with no
    //         credential. a token, where the host has one, only lifts the rate
    //         limit; ci holds none (EHMPATHY_SEATURTLE_GITHUB_TOKEN is absent
    //         there). pr #1022 is merged, so its reviews no longer change
    const PR = 1022;
    const HEAD = '94357083284d5c0ae4807561b295eb2c83a0e970';

    /**
     * .what = fetch the live reviews json; fail loud on any non-200
     * .why  = a rate limit or outage must never read as a pass
     */
    const fetchReviewsLive = async (): Promise<string> => {
      const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? null;
      const response = await fetch(
        `https://api.github.com/repos/ehmpathy/rhachet-roles-ehmpathy/pulls/${PR}/reviews?per_page=100`,
        {
          headers: {
            accept: 'application/vnd.github+json',
            'user-agent': 'rhachet-roles-ehmpathy.git.release.contract-test',
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
        },
      );
      const body = await response.text();
      if (response.status !== 200)
        throw new MalfunctionError('the live reviews read did not answer 200', {
          status: response.status,
          body: body.slice(0, 300),
          hint: 'a 403 with "rate limit" means the unauthenticated quota (60/hr per ip) ran out; retry later, or export GH_TOKEN',
        });
      return body;
    };

    when(
      '[t0] the shipped --jq filter and verdict run over the live payload',
      () => {
        const result = useThen('the gate decides on live data', async () => {
          const payloadLive = await fetchReviewsLive();
          return runGateBash({
            body: [
              `source "${path.join(skillDir, '../git.commit/keyrack.operations.sh')}"`,
              `items=$(echo "$PAYLOAD" | jq -c "$GH_REVIEW_ITEMS_JQ" | jq -s '.')`,
              `echo "$items"`,
              `echo "approved on head: $(is_pr_approved_by_human reviews_json="$items" head_sha="${HEAD}")"`,
              `echo "approved on a head the review does not cover: $(is_pr_approved_by_human reviews_json="$items" head_sha="0000000000000000000000000000000000000000")"`,
            ].join('\n'),
            env: { ...process.env, PAYLOAD: payloadLive },
          });
        });

        then('every live item carries each field the gate decides on', () => {
          const items: Array<Record<string, unknown>> = JSON.parse(
            result.stdout.split('\n').slice(0, -3).join('\n'),
          );
          expect(items.length).toBeGreaterThan(0);
          items.forEach((item) => {
            expect(Object.keys(item).sort()).toEqual(
              [
                'association',
                'commit_id',
                'login',
                'state',
                'submitted_at',
                'type',
              ].sort(),
            );
            expect(typeof item.state).toEqual('string');
            expect(typeof item.association).toEqual('string');
            expect(item.commit_id).toMatch(/^[0-9a-f]{40}$/);
          });
        });

        then('a live human approval exists on the merged head', () => {
          const items: Array<Record<string, unknown>> = JSON.parse(
            result.stdout.split('\n').slice(0, -3).join('\n'),
          );
          expect(
            items.some(
              (item) =>
                item.state === 'APPROVED' &&
                item.type === 'User' &&
                item.commit_id === HEAD,
            ),
          ).toBe(true);
        });

        then('the gate approves that head, and refuses any other head', () => {
          const lines = result.stdout.trim().split('\n');
          expect(lines.slice(-2)).toEqual([
            'approved on head: true',
            'approved on a head the review does not cover: false',
          ]);
          expect(result.exitCode).toBe(0);
        });

        then('the verdict tail matches the snapshot', () => {
          // the live items may grow; the verdicts on a merged head may not
          // a header names the live source, so the snap says which pr answered
          const lines = result.stdout.trim().split('\n');
          expect(
            [
              `pr #${PR} (live reviews, head ${HEAD.slice(0, 7)})`,
              ...lines.slice(-2),
            ].join('\n'),
          ).toMatchSnapshot();
        });
      },
    );

    when('[t1] the live pr is read where get_pr_head_sha reads it', () => {
      // .why = get_pr_head_sha runs `--jq '.head.sha'` on GET /pulls/N; the
      //        gate, the pin, and the lease all trust that one field
      const result = useThen('the live pr answers', async () => {
        const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? null;
        const response = await fetch(
          `https://api.github.com/repos/ehmpathy/rhachet-roles-ehmpathy/pulls/${PR}`,
          {
            headers: {
              accept: 'application/vnd.github+json',
              'user-agent': 'rhachet-roles-ehmpathy.git.release.contract-test',
              ...(token ? { authorization: `Bearer ${token}` } : {}),
            },
          },
        );
        const body = await response.text();
        if (response.status !== 200)
          throw new MalfunctionError('the live pr read did not answer 200', {
            status: response.status,
            body: body.slice(0, 300),
            hint: 'a 403 with "rate limit" means the unauthenticated quota (60/hr per ip) ran out; retry later, or export GH_TOKEN',
          });
        return runGateBash({
          body: `echo "$PAYLOAD" | jq -r '.head.sha'`,
          env: { ...process.env, PAYLOAD: body },
        });
      });

      then('.head.sha is the 40-hex head the approval covers', () => {
        expect(result.stdout.trim()).toEqual(HEAD);
        expect(result.exitCode).toBe(0);
      });
    });
  });
});
