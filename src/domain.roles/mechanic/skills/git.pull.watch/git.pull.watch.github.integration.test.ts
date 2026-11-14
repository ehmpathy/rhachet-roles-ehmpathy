import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = the yield floor of the daemon's github read: a reply whose quota left
 *         sits below 10% of the limit holds the poll until the reset
 * .why  = the daemon's token is the clones' own account; the poll must never
 *         spend the last of the bucket their own gh work needs
 * .note = the floor returns 4, the rate-limit code; the daemon's hold on 4 (every
 *         read held to the reset, cursors held) is proven in the faults suite
 */
const GITHUB_SH = path.join(__dirname, 'git.pull.watch.github.sh');
const ENDPOINT = 'repos/ehmpathy/surf-demo/pulls/1220';
const RESET = 1893456000;

/**
 * .what = one read of the endpoint through a stub gh that answers with the
 *         given status line and rate limit headers
 * .mock = gh, as github's `gh api -i` reply: the status line, headers, a body
 * .why  = the floor reads only the headers of a reply; a real quota cannot be
 *         driven to a chosen level on demand
 * .real = git.pull.watch.github.real.integration.test.ts (TEST_LIVE=github)
 */
const runRead = (input: {
  status: '200 OK' | '304 Not Modified';
  headers: string[];
  env?: Record<string, string>;
}): { stdout: string; stderr: string; code: number; until: string | null } => {
  const dir = genTempDir({ slug: 'watch-github-floor' });
  const bin = path.join(dir, 'bin');
  const cache = path.join(dir, 'cache');
  fs.mkdirSync(bin, { recursive: true });
  // a 304 needs a cached body and etag to serve
  if (input.status === '304 Not Modified') {
    const stem = ENDPOINT.replace(/[/?=&]/g, '_');
    fs.mkdirSync(cache, { recursive: true });
    fs.writeFileSync(path.join(cache, `${stem}.json`), '{"number":1220}');
    fs.writeFileSync(path.join(cache, `${stem}.etag`), '"e1"');
  }
  const reply = [
    `HTTP/2.0 ${input.status}`,
    ...input.headers,
    'Etag: "e1"',
    '',
    input.status === '200 OK' ? '{"number":1220}' : '',
  ].join('\n');
  const replyFile = path.join(dir, 'reply.txt');
  fs.writeFileSync(replyFile, reply);
  fs.writeFileSync(
    path.join(bin, 'gh'),
    `#!/usr/bin/env bash\ncat "${replyFile}"\n${input.status === '304 Not Modified' ? 'exit 1' : 'exit 0'}\n`,
  );
  fs.chmodSync(path.join(bin, 'gh'), 0o755);
  const result = spawnSync(
    'bash',
    [
      '-c',
      'source "$1" && get_watch_github_resource "$2" "$3" "$4"',
      '_',
      GITHUB_SH,
      cache,
      ENDPOINT,
      'ghs_fake_token',
    ],
    {
      encoding: 'utf-8',
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, ...input.env },
    },
  );
  const untilFile = path.join(cache, 'ratelimit.until');
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    code: result.status ?? 1,
    until: fs.existsSync(untilFile)
      ? fs.readFileSync(untilFile, 'utf-8').trim()
      : null,
  };
};

const quota = (left: number): string[] => [
  'X-Ratelimit-Limit: 5000',
  `X-Ratelimit-Remaining: ${left}`,
  `X-Ratelimit-Reset: ${RESET}`,
];

describe('git.pull.watch.github yield floor', () => {
  given(
    '[case1] a 200 whose quota left sits below the floor (400 of 5000)',
    () => {
      when('[t0] the pr is read', () => {
        const result = runRead({ status: '200 OK', headers: quota(400) });
        then('it returns 4, so the daemon holds every read', () => {
          expect(result.code).toEqual(4);
          expect(result.stderr).toContain('below the yield floor (10%)');
        });
        then('the hold lifts at the reset', () => {
          expect(result.until).toEqual(String(RESET));
        });
      });
    },
  );

  given('[case2] a 304 whose quota left sits below the floor', () => {
    when('[t0] the pr is read', () => {
      const result = runRead({
        status: '304 Not Modified',
        headers: quota(499),
      });
      then('it returns 4 as well; a free read still sees the floor', () => {
        expect(result.code).toEqual(4);
        expect(result.until).toEqual(String(RESET));
      });
    });
  });

  given('[case3] a 200 whose quota left sits at the floor or above', () => {
    when('[t0] the quota left is exactly 10% (500 of 5000)', () => {
      const result = runRead({ status: '200 OK', headers: quota(500) });
      then('the read serves its body, with no hold', () => {
        expect(result.code).toEqual(0);
        expect(JSON.parse(result.stdout).number).toEqual(1220);
        expect(result.until).toEqual(null);
      });
    });
    when('[t1] a 304 with quota to spare (4000 of 5000)', () => {
      const result = runRead({
        status: '304 Not Modified',
        headers: quota(4000),
      });
      then('the cached body is served, with no hold', () => {
        expect(result.code).toEqual(0);
        expect(JSON.parse(result.stdout).number).toEqual(1220);
        expect(result.until).toEqual(null);
      });
    });
  });

  given('[case4] a reply with no rate limit headers', () => {
    when('[t0] the pr is read', () => {
      const result = runRead({ status: '200 OK', headers: [] });
      then('the floor never fires on an absent header', () => {
        expect(result.code).toEqual(0);
        expect(result.until).toEqual(null);
      });
    });
  });

  given('[case5] the floor set by GIT_PULL_WATCH_QUOTA_FLOOR_PERCENT', () => {
    when('[t0] the floor is 0 and the quota left is 400 of 5000', () => {
      const result = runRead({
        status: '200 OK',
        headers: quota(400),
        env: { GIT_PULL_WATCH_QUOTA_FLOOR_PERCENT: '0' },
      });
      then('the read serves its body', () => {
        expect(result.code).toEqual(0);
      });
    });
  });
});
