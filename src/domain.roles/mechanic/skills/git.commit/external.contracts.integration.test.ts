import { spawnSync } from 'child_process';
import { ConstraintError } from 'helpful-errors';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = integration tests against the REAL external services the git.commit
 *         skills cross — the github api (through the real `gh` cli), the
 *         keyrack (through the real `rhachet` cli), and the git remote
 *
 * .why  = every other git.commit and git.release suite fakes these boundaries,
 *         each with a `.mock`/`.why`/`.real` block. this suite is where those
 *         `.real` fields point: the one place each service is called for real
 *         and its live response is checked against what the skills parse
 *         (rule.require.external-contract-integration-tests).
 *
 * .note = no credential is needed, on purpose, so the suite runs on every host
 *         and in ci. each case reaches the real service in a state any host can
 *         reach: a public read, or the lack-of-creds refusal the rule requires
 *         at minimum. the fakes elsewhere stand in only for states a real
 *         service cannot be driven into on demand. a repo's visibility is
 *         answered only to a credential, so its positive read waits on a test
 *         credential in ci (.dream/2026_11_18.real-visibility-read-with-a-ci-token.dream.md)
 */
describe('external contracts — the real services the git.commit skills cross', () => {
  const keyrackOpsPath = path.join(__dirname, 'keyrack.operations.sh');
  const repoRoot = path.join(__dirname, '../../../../..');

  /**
   * .what = run a real cli; fail loud if the cli is not on this host
   * .why  = an absent cli must never read as a pass (rule.require.failfast)
   */
  const runReal = (input: {
    command: string;
    args: string[];
    env: NodeJS.ProcessEnv;
    cwd: string;
  }): { stdout: string; stderr: string; exitCode: number } => {
    const result = spawnSync(input.command, input.args, {
      cwd: input.cwd,
      env: input.env,
      encoding: 'utf-8', // note: library api requires this term
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60_000,
    });
    if (result.error)
      throw new ConstraintError(`${input.command} is required for this test`, {
        error: result.error.message,
        hint: `install ${input.command} on this host`,
      });
    if (result.status === null)
      throw new ConstraintError(`${input.command} did not exit in 60s`, {
        signal: result.signal,
      });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status,
    };
  };

  given('[case1] the real gh cli, with no credential at all', () => {
    when(
      '[t0] it lists prs on a real public repo, as git.commit.push does',
      () => {
        // .why = GH_CONFIG_DIR at an empty dir and no GH_TOKEN / GITHUB_TOKEN is
        //        exactly the state `run_gh` leaves under as-human on a host with
        //        no `gh auth login` — the lack-of-creds case the rule requires
        const ghConfigDir = genTempDir({
          slug: 'gh-no-credential',
          git: false,
        });
        const env: NodeJS.ProcessEnv = {
          ...process.env,
          GH_CONFIG_DIR: ghConfigDir,
        };
        delete env.GH_TOKEN;
        delete env.GITHUB_TOKEN;

        const result = useThen('the real gh answers', () =>
          runReal({
            command: 'gh',
            args: [
              'pr',
              'list',
              '--repo',
              'ehmpathy/rhachet-roles-ehmpathy',
              '--limit',
              '1',
              '--json',
              'number',
            ],
            env,
            cwd: repoRoot,
          }),
        );

        then(
          'the real github refuses — it never answers without a credential',
          () => {
            expect(result.exitCode).not.toBe(0);
          },
        );

        then(
          '🔴 is_gh_auth_failure matches the live refusal — the guide fires',
          () => {
            // .why = the pr-open guide gates on gh's freeform text. a gh release
            //        that rewords its auth error would silence the guide; this
            //        clamp runs the matcher on the text gh emits today, so a
            //        reword goes red here rather than silent in the field
            const judged = spawnSync(
              'bash',
              [
                '-c',
                `source "${keyrackOpsPath}"; is_gh_auth_failure "$GH_OUT"`,
              ],
              {
                env: { ...process.env, GH_OUT: result.stdout + result.stderr },
                encoding: 'utf-8', // note: library api requires this term
              },
            );
            expect(judged.status).toBe(0);
          },
        );
      },
    );
  });

  given('[case2] the real keyrack, asked for a key it does not hold', () => {
    when(
      '[t0] keyrack get runs with --json, as fetch_github_token does',
      () => {
        // .why = a key no manifest declares is absent on every host — the
        //        keyrack's lack-of-creds answer, reachable with no secret
        const result = useThen('the real keyrack answers', () =>
          runReal({
            command: path.join(repoRoot, 'node_modules', '.bin', 'rhachet'),
            args: [
              'keyrack',
              'get',
              '--key',
              'EHMPATHY_ABSENT_CONTRACT_PROBE',
              '--env',
              'test',
              '--json',
            ],
            env: process.env,
            cwd: repoRoot,
          }),
        );

        then('it exits non-zero — fetch_github_token reads no token', () => {
          // .why = fetch_github_token parses the token only when the get exits
          //        0; a non-zero exit routes it to the unlock fallback
          expect(result.exitCode).not.toBe(0);
        });

        then('its json names the key absent, and carries no grant', () => {
          // .why = the success shape fetch_github_token reads is
          //        `.grant.key.secret`; the refusal must carry no such field, so
          //        a failed get can never be read as a token
          const answer = JSON.parse(result.stdout);
          expect(answer.status).toBe('absent');
          expect(answer.slug).toContain('EHMPATHY_ABSENT_CONTRACT_PROBE');
          expect(answer.grant).toBeUndefined();
          expect(answer.fix).toContain('rhx keyrack set');
        });
      },
    );
  });

  given(
    '[case4] the real repo visibility read, which gates pr text into a public repo',
    () => {
      // .what = each family's real reader, run through the real gh against a real public repo
      // .why  = every gate suite stubs this read with a fixed visibility; here the
      //         live refusals are parsed by the same functions the skills call, so a
      //         gh change that let a failed read pass as private goes red here
      const pullOpsPath = path.join(
        __dirname,
        '../git.pull.comment/git.pull.comment.operations.sh',
      );
      const commitOpsPath = path.join(__dirname, 'git.commit.operations.sh');
      const REPO = 'ehmpathy/rhachet-roles-ehmpathy';

      // .what = an env with no gh login and no ambient token: no credential at all
      const genEnvWithNoCredential = (): NodeJS.ProcessEnv => {
        const env: NodeJS.ProcessEnv = {
          ...process.env,
          GH_CONFIG_DIR: genTempDir({
            slug: 'gh-visibility-no-login',
            git: false,
          }),
        };
        delete env.GH_TOKEN;
        delete env.GITHUB_TOKEN;
        return env;
      };

      // .what = the comment family's reader: `gh api repos/<o>/<n> --jq .visibility`
      const readViaPull = (input: {
        auth: 'as-ehmpath' | 'as-human';
        token: string;
        env: NodeJS.ProcessEnv;
      }) => {
        const result = runReal({
          command: 'bash',
          args: [
            '-c',
            'source "$1"; COMMENT_AUTH="$2"; COMMENT_TOKEN="$3"; COMMENT_REPO="$4"; set_repo_visibility; printf "%s\\n%s\\n" "$REPO_VISIBILITY" "$REPO_VISIBILITY_CAUSE"',
            'reader',
            pullOpsPath,
            input.auth,
            input.token,
            REPO,
          ],
          env: input.env,
          cwd: repoRoot,
        });
        const [visibility, cause] = result.stdout.split('\n');
        return { exitCode: result.exitCode, visibility, cause };
      };

      // .what = the push family's reader: `gh repo view --json nameWithOwner,visibility`,
      //         run in a repo whose origin is the real public repo, as git.commit.push runs it
      const readViaPush = (input: {
        auth: 'as-ehmpath' | 'as-human';
        token: string;
        env: NodeJS.ProcessEnv;
      }) => {
        const cwd = genTempDir({ slug: 'gh-visibility-push', git: true });
        spawnSync(
          'git',
          ['remote', 'add', 'origin', `https://github.com/${REPO}.git`],
          { cwd },
        );
        const result = runReal({
          command: 'bash',
          args: [
            '-c',
            'source "$1"; set_pr_repo_visibility auth="$2" token="$3"; printf "%s\\n%s\\n%s\\n" "$PR_REPO" "$PR_REPO_VISIBILITY" "$PR_REPO_VISIBILITY_CAUSE"',
            'reader',
            commitOpsPath,
            input.auth,
            input.token,
          ],
          env: input.env,
          cwd,
        });
        const [repo, visibility, cause] = result.stdout.split('\n');
        return { exitCode: result.exitCode, repo, visibility, cause };
      };

      when('[t0] both readers run with no credential at all', () => {
        const result = useThen('the real github refuses each read', () => {
          const env = genEnvWithNoCredential();
          return {
            pull: readViaPull({ auth: 'as-human', token: '', env }),
            push: readViaPush({ auth: 'as-human', token: '', env }),
          };
        });

        then(
          'each reads unreadable, with the cause gh gave, so the gate holds as public',
          () => {
            expect(result.pull.visibility).toEqual('unreadable');
            expect(result.pull.cause).not.toEqual('');
            expect(result.push.visibility).toEqual('unreadable');
            expect(result.push.cause).not.toEqual('');
            // the push reader still names the repo, from the origin remote
            expect(result.push.repo).toEqual(REPO);
          },
        );
      });

      when('[t1] both readers run with a revoked token, as-ehmpath', () => {
        const result = useThen('the real github answers 401', () => {
          const env = genEnvWithNoCredential();
          const token = `ghp_${'0'.repeat(36)}`;
          return {
            pull: readViaPull({ auth: 'as-ehmpath', token, env }),
            push: readViaPush({ auth: 'as-ehmpath', token, env }),
          };
        });

        then('each reads unreadable, with the bad-credential cause', () => {
          expect(result.pull.visibility).toEqual('unreadable');
          expect(result.pull.cause).toMatch(/401|bad credentials/i);
          expect(result.push.visibility).toEqual('unreadable');
          expect(result.push.cause).toMatch(/401|bad credentials/i);
        });
      });
    },
  );

  given('[case3] the real git remote, read in public', () => {
    when('[t0] ls-remote reads the default branch of a real repo', () => {
      const result = useThen('the real remote answers', () =>
        runReal({
          command: 'git',
          args: [
            'ls-remote',
            'https://github.com/ehmpathy/rhachet-roles-ehmpathy.git',
            'refs/heads/main',
          ],
          env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
          cwd: repoRoot,
        }),
      );

      then('it answers with a sha for refs/heads/main', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(/^[0-9a-f]{40}\trefs\/heads\/main$/m);
      });
    });
  });
});
