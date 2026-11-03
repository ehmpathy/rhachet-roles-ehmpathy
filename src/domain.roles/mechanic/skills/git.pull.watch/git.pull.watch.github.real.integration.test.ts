import { spawnSync } from 'child_process';
import * as fs from 'fs';
import { ConstraintError } from 'helpful-errors';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = the daemon's github read against the real github api: an etag read,
 *         then a conditional read that github answers 304, then each list a tick
 *         reads (check runs, issue comments, review comments, reviews), then a bad token
 * .why  = the stub gh in the other watch suites mirrors github's contract; this
 *         suite proves the mirror holds — the 304 on a matched etag, the weak
 *         etag kept verbatim, and the 401 classification — on the real service
 * .note = read-only, on a merged pr of this public repo; the token is the ehmpath
 *         test key (keyrack env test), as the daemon reads its own (prep)
 * .note = `gh` is spied, never mocked: a shim on PATH logs each status line,
 *         then hands the call to the real gh
 * .note = live: runs only under `TEST_LIVE=github`; absent the flag each case
 *         skips by name. run it: TEST_LIVE=github npm run test:integration -- git.pull.watch.github.real
 */
const GITHUB_SH = path.join(__dirname, 'git.pull.watch.github.sh');
const ENDPOINT = 'repos/ehmpathy/rhachet-roles-ehmpathy/pulls/1180';

/**
 * .what = a PATH dir whose `gh` logs the status line of each reply, then
 *         passes the reply through untouched
 */
const genGhSpy = (input: { log: string }): string => {
  const ghReal = spawnSync('bash', ['-c', 'command -v gh'], {
    encoding: 'utf-8',
  }).stdout.trim();
  if (!ghReal)
    throw new ConstraintError('the gh cli is required for this test', {
      hint: 'install gh: https://cli.github.com',
    });
  const bin = genTempDir({ slug: 'watch-github-real-spy' });
  fs.writeFileSync(
    path.join(bin, 'gh'),
    `#!/usr/bin/env bash
out="$("${ghReal}" "$@")"; rc=$?
printf '%s\\n' "$out" | head -n 1 >>"${input.log}"
printf '%s' "$out"
exit $rc
`,
  );
  fs.chmodSync(path.join(bin, 'gh'), 0o755);
  return bin;
};

/**
 * .what = one etag read of the endpoint, via the daemon's own operation
 */
const runRead = (input: {
  cache: string;
  token: string;
  spyBin: string;
  endpoint?: string;
}): { stdout: string; stderr: string; status: number } => {
  const result = spawnSync(
    'bash',
    [
      '-c',
      'source "$1" && get_watch_github_resource "$2" "$3" "$4"',
      '_',
      GITHUB_SH,
      input.cache,
      input.endpoint ?? ENDPOINT,
      input.token,
    ],
    {
      encoding: 'utf-8',
      env: { ...process.env, PATH: `${input.spyBin}:${process.env.PATH}` },
    },
  );
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status ?? 1,
  };
};

/**
 * .what = whether the `TEST_LIVE` flag names the live github api
 * .why  = live tests run only when a named flag targets them (the three test
 *         tiers): ci never sets it, so ci needs no credential. once named, an
 *         absent token still throws: the flag is a demand for proof, never a skip
 */
const isLiveTargeted = (input: { mechanism: 'github' }): boolean =>
  (process.env.TEST_LIVE ?? '')
    .split(',')
    .map((part) => part.trim())
    .includes(input.mechanism);

/**
 * .what = the ehmpath test token: from the env, else from the unlocked keyrack
 * .why  = an unlock grants the key to the keyrack daemon, not to the jest env,
 *         so the read mirrors the daemon's own `keyrack get --json`
 */
// the repo root, five dirs above this suite, so the read holds wherever jest runs
const REPO_ROOT = path.join(__dirname, '..', '..', '..', '..', '..');

const getToken = (): string => {
  const fromEnv = process.env.EHMPATHY_SEATURTLE_GITHUB_TOKEN;
  if (fromEnv) return fromEnv;
  const answer = spawnSync(
    path.join(REPO_ROOT, 'node_modules', '.bin', 'rhachet'),
    [
      'keyrack',
      'get',
      '--key',
      'EHMPATHY_SEATURTLE_GITHUB_TOKEN',
      '--owner',
      'ehmpath',
      '--env',
      'test',
      '--json',
    ],
    { encoding: 'utf-8', cwd: REPO_ROOT }, // note: node's option name
  );
  const fromKeyrack: unknown = (() => {
    try {
      return JSON.parse(answer.stdout ?? '')?.grant?.key?.secret;
    } catch (error) {
      // only a reply that is not json reads as no grant; its stdout rides the error below
      if (!(error instanceof SyntaxError)) throw error;
      return null;
    }
  })();
  if (typeof fromKeyrack === 'string' && fromKeyrack) return fromKeyrack;
  throw new ConstraintError(
    'EHMPATHY_SEATURTLE_GITHUB_TOKEN is required for the real github read',
    {
      hint: 'TEST_LIVE=github names this live run, so the token must be at hand. locked: rhx keyrack unlock --owner ehmpath --env test · absent: a human runs rhx keyrack set --owner ehmpath --key EHMPATHY_SEATURTLE_GITHUB_TOKEN --env test --vault <vault>',
      keyrackExit: answer.status,
      keyrackStdout: (answer.stdout ?? '').trim().slice(-200),
      keyrackStderr: (answer.stderr ?? '').trim().slice(-200),
    },
  );
};

describe('git.pull.watch.github (real github)', () => {
  given.runIf(isLiveTargeted({ mechanism: 'github' }))(
    '[case1] a merged pr of this repo, read twice (TEST_LIVE=github)',
    () => {
      when('[t0] the pr is read, then read again with its etag', () => {
        const result = useThen('both reads run', async () => {
          const token = getToken();
          const cache = genTempDir({ slug: 'watch-github-real-cache' });
          const log = path.join(cache, 'gh.status.log');
          const spyBin = genGhSpy({ log });
          const first = runRead({ cache, token, spyBin });
          const etag = fs.readFileSync(
            path.join(cache, `${ENDPOINT.replace(/[/?=&]/g, '_')}.etag`),
            'utf-8',
          );
          const second = runRead({ cache, token, spyBin });
          return {
            first,
            second,
            etag,
            statuses: fs.readFileSync(log, 'utf-8').trim().split('\n'),
          };
        });
        then('the first read answers 200 with the pr body and an etag', () => {
          expect(result.first.status).toEqual(0);
          expect(result.statuses[0]).toMatch(/^HTTP\/\S+ 200/);
          expect(JSON.parse(result.first.stdout).number).toEqual(1180);
          expect(result.etag).toMatch(/^(W\/)?"[^"]+"$/);
        });
        then(
          'the second read answers 304, and the cached body is served',
          () => {
            expect(result.second.status).toEqual(0);
            expect(result.statuses[1]).toMatch(/^HTTP\/\S+ 304/);
            expect(result.second.stdout).toEqual(result.first.stdout);
          },
        );
      });
    },
  );

  given.runIf(isLiveTargeted({ mechanism: 'github' }))(
    '[case3] each list the daemon reads for one pr (TEST_LIVE=github)',
    () => {
      when(
        '[t0] the checks of its head, its comments, and its reviews are read',
        () => {
          const result = useThen('each read runs', async () => {
            const token = getToken();
            const cache = genTempDir({ slug: 'watch-github-real-lists' });
            const log = path.join(cache, 'gh.status.log');
            const spyBin = genGhSpy({ log });
            const read = (endpoint: string) =>
              runRead({ cache, token, spyBin, endpoint });
            const pull = JSON.parse(read(ENDPOINT).stdout);
            const base = 'repos/ehmpathy/rhachet-roles-ehmpathy';
            // the same endpoints, with the same query, the daemon's tick reads
            const checksAt = `${base}/commits/${pull.head.sha}/check-runs?per_page=100`;
            const checks = read(checksAt);
            const checksAgain = read(checksAt);
            return {
              checks,
              checksAgain,
              issueComments: read(`${base}/issues/1180/comments?per_page=100`),
              reviewComments: read(`${base}/pulls/1180/comments?per_page=100`),
              reviews: read(`${base}/pulls/1180/reviews?per_page=100`),
              statuses: fs.readFileSync(log, 'utf-8').trim().split('\n'),
            };
          });
          then(
            'the check runs list is object-shaped, with the fields the diff reads',
            () => {
              expect(result.checks.status).toEqual(0);
              const body = JSON.parse(result.checks.stdout);
              expect(typeof body.total_count).toEqual('number');
              expect(body.check_runs.length).toBeGreaterThan(0);
              body.check_runs.forEach((run: Record<string, unknown>) => {
                expect(run).toEqual(
                  expect.objectContaining({
                    id: expect.any(Number),
                    name: expect.any(String),
                    status: expect.any(String),
                    html_url: expect.any(String),
                  }),
                );
                expect(run).toHaveProperty('conclusion');
              });
            },
          );
          then(
            'a second read of the check runs answers 304, its body served whole',
            () => {
              expect(result.statuses[2]).toMatch(/^HTTP\/\S+ 304/);
              expect(result.checksAgain.stdout).toEqual(result.checks.stdout);
            },
          );
          then(
            'each comment and review list is an array of the rows the diff reads',
            () => {
              [
                result.issueComments,
                result.reviewComments,
                result.reviews,
              ].forEach((one) => {
                expect(one.status).toEqual(0);
                expect(Array.isArray(JSON.parse(one.stdout))).toEqual(true);
              });
              const rows = [
                ...JSON.parse(result.issueComments.stdout),
                ...JSON.parse(result.reviewComments.stdout),
                ...JSON.parse(result.reviews.stdout),
              ];
              expect(rows.length).toBeGreaterThan(0);
              rows.forEach((row: Record<string, unknown>) => {
                expect(row).toEqual(
                  expect.objectContaining({
                    id: expect.any(Number),
                    html_url: expect.any(String),
                    user: expect.objectContaining({
                      login: expect.any(String),
                      type: expect.any(String),
                    }),
                  }),
                );
              });
              JSON.parse(result.reviews.stdout).forEach(
                (review: Record<string, unknown>) => {
                  expect(review.state).toEqual(expect.any(String));
                },
              );
            },
          );
        },
      );
    },
  );

  given.runIf(isLiveTargeted({ mechanism: 'github' }))(
    '[case2] a token github refuses (TEST_LIVE=github)',
    () => {
      when('[t0] the pr is read with it', () => {
        const result = useThen('the read runs', async () => {
          const cache = genTempDir({ slug: 'watch-github-real-badtoken' });
          return runRead({
            cache,
            token: 'ghp_not_a_real_token_for_the_watch_test',
            spyBin: genGhSpy({ log: path.join(cache, 'gh.status.log') }),
          });
        });
        then(
          'it returns 3, so the daemon pauses rather than retries blind',
          () => {
            expect(result.status).toEqual(3);
          },
        );
      });
    },
  );
});
