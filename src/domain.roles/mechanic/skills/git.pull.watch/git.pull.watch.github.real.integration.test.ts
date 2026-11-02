import { spawnSync } from 'child_process';
import * as fs from 'fs';
import { ConstraintError } from 'helpful-errors';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = the daemon's github read against the real github api: an etag read,
 *         then a conditional read that github answers 304, then a bad token
 * .why  = the stub gh in the other watch suites mirrors github's contract; this
 *         suite proves the mirror holds — the 304 on a matched etag, the weak
 *         etag kept verbatim, and the 401 classification — on the real service
 * .note = read-only, on a merged pr of this public repo; the token is the ehmpath
 *         test key (keyrack env test), as the daemon reads its own (prep)
 * .note = `gh` is spied, never mocked: a shim on PATH logs each status line,
 *         then hands the call to the real gh
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
}): { stdout: string; stderr: string; status: number } => {
  const result = spawnSync(
    'bash',
    [
      '-c',
      'source "$1" && get_watch_github_resource "$2" "$3" "$4"',
      '_',
      GITHUB_SH,
      input.cache,
      ENDPOINT,
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
 * .what = the ehmpath test token: from the env, else from the unlocked keyrack
 * .why  = ci's keyrack firewall puts the key in the env; on a box, an unlock
 *         grants it to the keyrack daemon, not to the jest env, so the read
 *         mirrors the daemon's own `keyrack get --json`
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
      hint: 'locked: rhx keyrack unlock --owner ehmpath --env test · absent: a human runs rhx keyrack set --owner ehmpath --key EHMPATHY_SEATURTLE_GITHUB_TOKEN --env test --vault <vault> (ci reads it from the keyrack firewall)',
      keyrackExit: answer.status,
      keyrackStdout: (answer.stdout ?? '').trim().slice(-200),
      keyrackStderr: (answer.stderr ?? '').trim().slice(-200),
    },
  );
};

describe('git.pull.watch.github (real github)', () => {
  given('[case1] a merged pr of this repo, read twice', () => {
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
      then('the second read answers 304, and the cached body is served', () => {
        expect(result.second.status).toEqual(0);
        expect(result.statuses[1]).toMatch(/^HTTP\/\S+ 304/);
        expect(result.second.stdout).toEqual(result.first.stdout);
      });
    });
  });

  given('[case2] a token github refuses', () => {
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
  });
});
