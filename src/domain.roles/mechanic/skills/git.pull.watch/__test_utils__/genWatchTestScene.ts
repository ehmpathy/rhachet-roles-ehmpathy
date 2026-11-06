import { spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import { MalfunctionError } from 'helpful-errors';
import * as path from 'path';
import { genTempDir } from 'test-fns';

import { getAllWatchDaemonPids } from './getAllWatchDaemonPids';
import { waitForWatch } from './waitForWatch';

/**
 * .what = a hermetic scene for git.pull.watch: a temp HOME, fixture repo roots,
 *         a stub `gh` on PATH, a stub `rhachet` under each repo root, and one
 *         json store both stubs read and write
 *
 * .mock = the `gh` cli and the `rhachet` cli (clone list, clone say, keyrack get)
 * .why  = a daemon test drives github and a clone into states neither can be put
 *         into on demand — a 401 mid-run, a clone at a modal, a clone that died —
 *         and counts each call, which proves "one alert, never two". a real run
 *         would bill a brain for each clone and post to a live pr
 * .real = the one seam the stubs cannot prove (a real `clone say` into a live
 *         tty) is held as a dream: .dream/v2026_11_01.feat.pr-watch-live-delivery-tier.md
 */

export const SKILL_DIR = path.join(__dirname, '..');

export interface WatchStoreRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: string | null;
  html_url: string;
  /** iso time it ended; one at or after a watch's setAt alerts on the prime tick */
  completed_at?: string;
}

export interface WatchStoreComment {
  id: number;
  body: string;
  user: { login: string; type: 'User' | 'Bot' };
  html_url: string;
  /** iso time it was posted; one at or after a watch's setAt alerts on the prime tick */
  created_at?: string;
  /** an inline review comment's file and line, as github serves them */
  path?: string;
  line?: number;
}

export interface WatchStoreReview extends WatchStoreComment {
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';
  submitted_at?: string;
}

export interface WatchStoreClone {
  serial: string;
  slug: string;
  reachState: 'LIVE' | 'DEAD' | 'DEAF';
  say?: 'released' | 'enqueued' | 'withheld' | 'unreadable';
}

export interface WatchStore {
  github: {
    token: string;
    auth: 'ok' | '401';
    /**
     * a fault every read meets: a primary rate limit (403, lifts at rateLimitReset),
     * a secondary one (403, lifts retryAfter seconds out), no reply, or a 502
     */
    fault?: 'ratelimit' | 'secondary' | 'down' | 'badgateway' | null;
    rateLimitReset?: number;
    retryAfter?: number;
    prs: Record<
      string,
      {
        state: 'open' | 'closed';
        merged: boolean;
        headSha: string;
        closedBy: string | null;
      }
    >;
    checks: Record<string, WatchStoreRun[]>;
    issueComments: Record<string, WatchStoreComment[]>;
    reviewComments: Record<string, WatchStoreComment[]>;
    reviews: Record<string, WatchStoreReview[]>;
  };
  clones: Record<string, WatchStoreClone[]>;
  /** repo roots whose `clone list` fails, as an unreadable registry would */
  registryFaults?: string[];
  /** repo roots whose `clone list` answers valid json of a shape not known (`{}`), exit 0 */
  registryShapeOdd?: string[];
  /** a stall on every `clone list`, in ms, as a slow registry read would take */
  cloneListDelayMs?: number;
  keyrack: 'granted' | 'locked' | 'absent' | 'blocked' | 'fault';
  /** a keyrack answer per repo root realpath, as a root with no manifest reads absent */
  keyrackByRoot?: Record<
    string,
    'granted' | 'locked' | 'absent' | 'blocked' | 'fault'
  >;
}

/**
 * .what = the stub gh: a node executable over the json store
 * .note = it serves `gh api -i` with an etag, a 304 on a matched If-None-Match
 *         (exit 1 + `HTTP 304`, as the real gh does), and a 401 on a bad token
 */
const FAKE_GH = String.raw`#!/usr/bin/env node
const fs = require('fs');
const crypto = require('crypto');
const state = JSON.parse(fs.readFileSync(process.env.FAKE_WATCH_STATE, 'utf-8'));
const argv = process.argv.slice(2);
const log = (status) => fs.appendFileSync(process.env.FAKE_WATCH_GH_LOG, JSON.stringify({ argv, token: process.env.GH_TOKEN ?? null, status }) + '\n');
if (argv[0] !== 'api') { log('refused'); process.stderr.write('stub gh: only api\n'); process.exit(1); }
const rest = argv.slice(1);
const withHeaders = rest.includes('-i');
const at = rest.indexOf('-H');
const ifNone = at >= 0 ? rest[at + 1].replace(/^If-None-Match: /, '') : null;
const endpoint = rest.filter((a, i) => !a.startsWith('-') && rest[i - 1] !== '--method' && rest[i - 1] !== '-H')[0];
const notFound = () => { log(404); if (withHeaders) process.stdout.write('HTTP/2.0 404 Not Found\n\n{}'); process.stderr.write('gh: Not Found (HTTP 404)\n'); process.exit(1); };
if (state.github.fault === 'down') { log('down'); process.stderr.write('dial tcp: lookup api.github.com: no such host\n'); process.exit(1); }
if (state.github.fault === 'ratelimit') {
  log(403);
  if (withHeaders) process.stdout.write('HTTP/2.0 403 Forbidden\nX-Ratelimit-Remaining: 0\nX-Ratelimit-Reset: ' + state.github.rateLimitReset + '\n\n{"message":"API rate limit exceeded"}');
  process.stderr.write('gh: API rate limit exceeded (HTTP 403)\n');
  process.exit(1);
}
if (state.github.fault === 'secondary') {
  log(403);
  if (withHeaders) process.stdout.write('HTTP/2.0 403 Forbidden\nRetry-After: ' + state.github.retryAfter + '\n\n{"message":"You have exceeded a secondary rate limit"}');
  process.stderr.write('gh: You have exceeded a secondary rate limit (HTTP 403)\n');
  process.exit(1);
}
if (state.github.fault === 'badgateway') {
  log(502);
  if (withHeaders) process.stdout.write('HTTP/2.0 502 Bad Gateway\n\n{"message":"Server Error"}');
  process.stderr.write('gh: Server Error (HTTP 502)\n');
  process.exit(1);
}
if (state.github.auth === '401' || process.env.GH_TOKEN !== state.github.token) {
  log(401);
  if (withHeaders) process.stdout.write('HTTP/2.0 401 Unauthorized\nContent-Type: application/json\n\n{"message":"Bad credentials"}');
  process.stderr.write('gh: Bad credentials (HTTP 401)\n');
  process.exit(1);
}
const [route] = endpoint.split('?');
const m = route.match(/^repos\/([^/]+\/[^/]+)\/(.*)$/);
if (!m) notFound();
const repo = m[1];
const parts = m[2].split('/');
const key = (n) => repo + '#' + n;
const prOf = (n) => { const pr = state.github.prs[key(n)]; if (!pr) notFound(); return pr; };
let body;
if (parts[0] === 'pulls' && parts.length === 2) { const pr = prOf(parts[1]); body = { number: Number(parts[1]), state: pr.state, merged: pr.merged, head: { sha: pr.headSha } }; }
else if (parts[0] === 'commits' && parts[2] === 'check-runs') { const runs = state.github.checks[parts[1]] || []; body = { total_count: runs.length, check_runs: runs }; }
else if (parts[0] === 'issues' && parts[2] === 'comments') { prOf(parts[1]); body = state.github.issueComments[key(parts[1])] || []; }
else if (parts[0] === 'pulls' && parts[2] === 'comments') { prOf(parts[1]); body = state.github.reviewComments[key(parts[1])] || []; }
else if (parts[0] === 'pulls' && parts[2] === 'reviews') { prOf(parts[1]); body = state.github.reviews[key(parts[1])] || []; }
else if (parts[0] === 'issues' && parts.length === 2) { const pr = prOf(parts[1]); body = { number: Number(parts[1]), state: pr.state, closed_by: pr.closedBy ? { login: pr.closedBy } : null }; }
else notFound();
// a list past one page: --paginate reads it whole; a plain read gets page one and a next link
// check-runs pages its object's check_runs list, as github does
const pagedRuns = !Array.isArray(body) && Array.isArray(body.check_runs) && body.check_runs.length > 100;
const paged = (Array.isArray(body) && body.length > 100) || pagedRuns;
if (paged && rest.includes('--paginate')) { log('paginate'); process.stdout.write(JSON.stringify(body)); process.exit(0); }
const linkNext = paged ? 'Link: <https://api.github.com/' + route + '?per_page=100&page=2>; rel="next"\n' : '';
if (paged) body = pagedRuns ? { ...body, check_runs: body.check_runs.slice(0, 100) } : body.slice(0, 100);
const text = JSON.stringify(body);
const etag = (parts[2] === 'check-runs' ? 'W/' : '') + '"' + crypto.createHash('sha256').update(text).digest('hex').slice(0, 16) + '"';
if (ifNone && ifNone === etag) {
  log(304);
  if (withHeaders) process.stdout.write('HTTP/2.0 304 Not Modified\nEtag: ' + etag + '\n\n');
  process.stderr.write('gh: HTTP 304\n');
  process.exit(1);
}
log(200);
if (withHeaders) process.stdout.write('HTTP/2.0 200 OK\nContent-Type: application/json\nEtag: ' + etag + '\n' + linkNext + '\n');
process.stdout.write(text);
process.exit(0);
`;

/**
 * .what = the stub rhachet: clone list, clone say, keyrack get, over the store
 * .note = the registry is keyed by the realpath of the cwd, as rhachet's is (R1);
 *         a say records what it was handed and answers with the clone's cue
 */
const FAKE_RHACHET = String.raw`#!/usr/bin/env node
const fs = require('fs');
const state = JSON.parse(fs.readFileSync(process.env.FAKE_WATCH_STATE, 'utf-8'));
const argv = process.argv.slice(2);
const cwd = fs.realpathSync(process.cwd());
const clones = state.clones[cwd] || [];
const out = (v, code) => { process.stdout.write(JSON.stringify(v, null, 2) + '\n'); process.exit(code); };
const err = (v, code) => { process.stderr.write(JSON.stringify(v, null, 2) + '\n'); process.exit(code); };
if (argv[0] === 'clone' && argv[1] === 'list' && state.cloneListDelayMs) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, state.cloneListDelayMs);
if (argv[0] === 'clone' && argv[1] === 'list' && (state.registryFaults || []).includes(cwd)) { process.stderr.write('stub rhachet: registry unreadable\n'); process.exit(1); }
if (argv[0] === 'clone' && argv[1] === 'list' && (state.registryShapeOdd || []).includes(cwd)) out({}, 0);
if (argv[0] === 'clone' && argv[1] === 'list') out({ actors: [{ exid: 'repo=ambient', clones: clones.map((c) => ({ serial: c.serial, slug: c.slug, reachState: c.reachState })) }] }, 0);
if (argv[0] === 'clone' && argv[1] === 'say') {
  const serial = argv[2].replace(/^@:/, '');
  const text = fs.readFileSync(0, 'utf-8');
  const clone = clones.find((c) => c.serial === serial);
  const verdict = !clone ? 'unknown' : clone.reachState === 'DEAD' ? 'dead' : (clone.say || 'released');
  fs.appendFileSync(process.env.FAKE_WATCH_SAY_LOG, JSON.stringify({ serial, cwd, text, verdict, force: argv.includes('--force') }) + '\n');
  if (verdict === 'released' || verdict === 'enqueued') out({ delivered: true, verdict, reason: null, probe: 'full', serial, slug: clone.slug }, 0);
  if (verdict === 'dead') err({ class: 'ConstraintError', message: 'the clone is dead', hint: 'enroll a fresh clone', reachState: 'DEAD', reachCause: 'DEAD-same-host', metadata: {} }, 2);
  if (verdict === 'unknown') err({ class: 'ConstraintError', message: 'no clone at @:' + serial, hint: null, reachState: null, reachCause: null, metadata: {} }, 2);
  const klass = verdict === 'withheld' ? 'ConstraintError' : 'MalfunctionError';
  err({ class: klass, message: 'the say was ' + verdict, hint: null, reachState: null, reachCause: null, metadata: { delivered: false, verdict, reason: verdict === 'withheld' ? 'modal-holds-focus' : 'feed-faulted' } }, verdict === 'withheld' ? 2 : 1);
}
if (argv[0] === 'keyrack' && argv[1] === 'get') {
  fs.appendFileSync(process.env.FAKE_WATCH_KEYRACK_LOG, JSON.stringify({ argv, cwd }) + '\n');
  const keyrack = (state.keyrackByRoot || {})[cwd] || state.keyrack;
  if (keyrack === 'fault') { process.stderr.write('stub keyrack: daemon socket refused\n'); process.exit(1); }
  if (keyrack === 'granted') out({ status: 'granted', grant: { slug: 'ehmpathy.prep.EHMPATHY_SEATURTLE_GITHUB_TOKEN', key: { secret: state.github.token } } }, 0);
  out({ status: keyrack, slug: 'ehmpathy.prep.EHMPATHY_SEATURTLE_GITHUB_TOKEN' }, 2);
}
process.stderr.write('stub rhachet: unknown command ' + argv.join(' ') + '\n');
process.exit(1);
`;

export interface WatchSay {
  serial: string;
  cwd: string;
  text: string;
  verdict: string;
  force: boolean;
}

export interface WatchRecordFound {
  key: string;
  path: string;
  record: {
    repo: string;
    pr: number;
    cloneSerial: string;
    cloneSlug: string;
    repoRoot: string;
    primed: boolean;
    ended?: string;
    cursors: Record<string, unknown>;
  };
}

export interface WatchScene {
  home: string;
  storeDir: string;
  fakeBin: string;
  roots: Record<string, string>;
  getStore: () => WatchStore;
  setStore: (mutate: (store: WatchStore) => void) => void;
  getSays: () => WatchSay[];
  getGhCalls: () => {
    argv: string[];
    token: string | null;
    status: number | string;
  }[];
  getKeyrackCalls: () => { argv: string[]; cwd: string }[];
  getStateRoot: () => string;
  getAllWatchRecords: () => WatchRecordFound[];
  getDiagnostics: () => string;
  waitForDaemonTicks: (input: { ticks: number }) => Promise<void>;
  waitForPrimed: () => Promise<void>;
  runSkill: (input: {
    verb: 'get' | 'set' | 'del';
    args: string[];
    root: string;
    serial: string | null;
    skillDir?: string;
  }) => { stdout: string; stderr: string; status: number };
  runScript: (input: {
    path: string;
    args: string[];
    root: string;
    serial: string | null;
    /** an executable that may never exit on its own (a daemon) is killed past this bound */
    timeoutMs?: number;
  }) => { stdout: string; stderr: string; status: number };
  runSkillAsync: (input: {
    verb: 'get' | 'set' | 'del';
    args: string[];
    root: string;
    serial: string | null;
  }) => Promise<{ stdout: string; stderr: string; status: number }>;
  asMasked: (text: string) => string;
  stopAllDaemons: () => void;
}

/**
 * .what = a hermetic scene with the named repo roots
 * .note = each root is a git repo with a github origin of `ehmpathy/<name>`
 *         and a stub rhachet in its node_modules/.bin
 */
export const genWatchTestScene = (input: {
  slug: string;
  repos: string[];
  store: Partial<WatchStore>;
}): WatchScene => {
  const home = fs.realpathSync(
    genTempDir({ slug: `${input.slug}-home`, git: false }),
  );
  const storeDir = path.join(home, '.fakestore');
  fs.mkdirSync(storeDir, { recursive: true });
  const fakeBin = path.join(storeDir, 'bin');
  fs.mkdirSync(fakeBin, { recursive: true });
  fs.writeFileSync(path.join(fakeBin, 'gh'), FAKE_GH);
  fs.chmodSync(path.join(fakeBin, 'gh'), '755');

  // the repo roots, each a git repo with its own stub rhachet
  const roots: Record<string, string> = {};
  input.repos.forEach((name) => {
    const root = fs.realpathSync(
      genTempDir({ slug: `${input.slug}-${name}`, git: true }),
    );
    spawnSync(
      'git',
      ['remote', 'add', 'origin', `git@github.com:ehmpathy/${name}.git`],
      { cwd: root },
    );
    const nodeBin = path.join(root, 'node_modules', '.bin');
    fs.mkdirSync(nodeBin, { recursive: true });
    fs.writeFileSync(path.join(nodeBin, 'rhachet'), FAKE_RHACHET);
    fs.chmodSync(path.join(nodeBin, 'rhachet'), '755');
    roots[name] = root;
  });

  // the store
  const statePath = path.join(storeDir, 'state.json');
  const sayLog = path.join(storeDir, 'says.jsonl');
  const ghLog = path.join(storeDir, 'gh.jsonl');
  const keyrackLog = path.join(storeDir, 'keyrack.jsonl');
  const store: WatchStore = {
    github: {
      token: 'ghs_fake_ehmpath_token',
      auth: 'ok',
      prs: {},
      checks: {},
      issueComments: {},
      reviewComments: {},
      reviews: {},
      ...(input.store.github ?? {}),
    },
    clones: input.store.clones ?? {},
    keyrack: input.store.keyrack ?? 'granted',
  };
  fs.writeFileSync(statePath, JSON.stringify(store, null, 2));
  [sayLog, ghLog, keyrackLog].forEach((file) => fs.writeFileSync(file, ''));

  const readLines = <T>(file: string): T[] =>
    fs
      .readFileSync(file, 'utf-8')
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as T);

  const getStore = (): WatchStore =>
    JSON.parse(fs.readFileSync(statePath, 'utf-8')) as WatchStore;
  const setStore = (mutate: (store: WatchStore) => void): void => {
    const next = getStore();
    mutate(next);
    const tmp = `${statePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2));
    fs.renameSync(tmp, statePath);
  };

  // the state root comes from the skill's own operation, so the scene reads where the skill writes
  const stateRoot = spawnSync(
    'bash',
    [
      '-c',
      'source "$1" && get_watch_state_root',
      '_',
      path.join(SKILL_DIR, 'git.pull.watch.operations.sh'),
    ],
    { encoding: 'utf-8', env: { ...process.env, HOME: home } },
  ).stdout.trim();
  if (!stateRoot.startsWith(home))
    throw new MalfunctionError('the watch state root is not under the home', {
      stateRoot,
      home,
    });
  const getStateRoot = (): string => stateRoot;

  // the env every skill call and its daemon inherit
  const asEnv = (serial: string | null): NodeJS.ProcessEnv => {
    const {
      RHACHET_CLONE_SERIAL: _serial,
      EHMPATHY_SEATURTLE_GITHUB_TOKEN: _token,
      GH_TOKEN: _ghToken,
      GITHUB_TOKEN: _githubToken,
      ...rest
    } = process.env;
    return {
      ...rest,
      HOME: home,
      PATH: `${fakeBin}:${process.env.PATH}`,
      GIT_PULL_WATCH_TICK_SECONDS: '1',
      GIT_PULL_WATCH_UNREACHABLE_NOTE_SECONDS: '4',
      FAKE_WATCH_STATE: statePath,
      FAKE_WATCH_SAY_LOG: sayLog,
      FAKE_WATCH_GH_LOG: ghLog,
      FAKE_WATCH_KEYRACK_LOG: keyrackLog,
      ...(serial ? { RHACHET_CLONE_SERIAL: serial } : {}),
    };
  };

  const runScript: WatchScene['runScript'] = (call) => {
    const result = spawnSync('bash', [call.path, ...call.args], {
      cwd: call.root,
      env: asEnv(call.serial),
      ...(call.timeoutMs ? { timeout: call.timeoutMs } : {}),
    });
    return {
      stdout: result.stdout?.toString() ?? '',
      stderr: result.stderr?.toString() ?? '',
      status: result.status ?? 1,
    };
  };

  const runSkill: WatchScene['runSkill'] = (call) =>
    runScript({
      path: path.join(
        call.skillDir ?? SKILL_DIR,
        `git.pull.watch.${call.verb}.sh`,
      ),
      args: call.args,
      root: call.root,
      serial: call.serial,
    });

  const runSkillAsync: WatchScene['runSkillAsync'] = (call) =>
    new Promise((done) => {
      const child = spawn(
        'bash',
        [path.join(SKILL_DIR, `git.pull.watch.${call.verb}.sh`), ...call.args],
        { cwd: call.root, env: asEnv(call.serial) },
      );
      // .note = deliberate mutation: a stream arrives in chunks, gathered here until close
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => {
        stdout += String(chunk);
      });
      child.stderr.on('data', (chunk) => {
        stderr += String(chunk);
      });
      child.on('close', (code) => done({ stdout, stderr, status: code ?? 1 }));
    });

  // mask what varies per run: temp paths, keys, pids, clock ages
  const asMasked = (text: string): string =>
    Object.entries(roots)
      .reduce(
        (masked, [name, root]) =>
          masked
            .split(root)
            .join(`<root:${name}>`)
            .split(path.basename(root))
            .join(`<root:${name}>`),
        text,
      )
      .split(home)
      .join('<home>')
      .replace(/\d+\.\d+\.\d+\+[0-9a-f]{8}/g, '<key>')
      .replace(/pid \d+/g, 'pid <pid>')
      .replace(/\d+s ago/g, '<n>s ago')
      // the same, in a json render
      .replace(/"pid": \d+/g, '"pid": "<pid>"')
      .replace(/"lastTickSecondsAgo": \d+/g, '"lastTickSecondsAgo": "<n>"');

  // every watch record on the machine, with its key
  const getAllWatchRecords = (): WatchRecordFound[] => {
    const root = getStateRoot();
    if (!fs.existsSync(root)) return [];
    return fs
      .readdirSync(root)
      .filter((name) => name.startsWith('v='))
      .flatMap((name) => {
        const dir = path.join(root, name, 'watches');
        if (!fs.existsSync(dir)) return [];
        return fs
          .readdirSync(dir)
          .filter((file) => file.endsWith('.json'))
          .map((file) => ({
            key: name.slice(2),
            path: path.join(dir, file),
            record: JSON.parse(
              fs.readFileSync(path.join(dir, file), 'utf-8'),
            ) as WatchRecordFound['record'],
          }));
      });
  };

  // what a failed wait shows: each key's daemon log and records, and the stub logs
  const getDiagnostics = (): string => {
    const root = getStateRoot();
    const keys = fs.existsSync(root)
      ? fs.readdirSync(root).filter((name) => name.startsWith('v='))
      : [];
    const perKey = keys.map((name) => {
      const log = path.join(root, name, 'daemon.log');
      return [
        `== ${name}/daemon.log`,
        fs.existsSync(log) ? fs.readFileSync(log, 'utf-8') : '(absent)',
      ].join('\n');
    });
    return [
      ...perKey,
      `== records\n${JSON.stringify(getAllWatchRecords(), null, 2)}`,
      `== says\n${fs.readFileSync(sayLog, 'utf-8')}`,
      `== gh (last 10)\n${fs.readFileSync(ghLog, 'utf-8').split('\n').slice(-11).join('\n')}`,
      `== daemons\n${getAllWatchDaemonPids({ home }).join(', ')}`,
    ].join('\n\n');
  };

  // the ticks each key's daemon has done, by key
  const getTicksByKey = (): Record<string, number> => {
    const root = getStateRoot();
    if (!fs.existsSync(root)) return {};
    return Object.fromEntries(
      fs
        .readdirSync(root)
        .filter((name) => name.startsWith('v='))
        .map((name) => {
          const file = path.join(root, name, 'daemon.ticks');
          const count = fs.existsSync(file)
            ? Number(fs.readFileSync(file, 'utf-8').trim() || '0')
            : 0;
          return [name, count];
        }),
    );
  };

  // a key whose daemon lives (its pid record is present)
  const isKeyLive = (name: string): boolean =>
    fs.existsSync(path.join(getStateRoot(), name, 'daemon.pid'));

  // wait until each live daemon has done n more whole ticks
  // .why = a claim of absence ("no second alert") needs ticks to pass first
  const waitForDaemonTicks = async (call: { ticks: number }): Promise<void> => {
    const before = getTicksByKey();
    const keys = Object.keys(before).filter(isKeyLive);
    await waitForWatch({
      label: `${call.ticks} daemon ticks`,
      check: () => {
        const now = getTicksByKey();
        return keys.every(
          (key) =>
            !isKeyLive(key) ||
            (now[key] ?? 0) >= (before[key] ?? 0) + call.ticks,
        );
      },
      timeoutMs: 60_000 + call.ticks * 20_000,
      scene: self,
    });
  };

  // wait until every watch record is primed by its first tick
  const waitForPrimed = async (): Promise<void> => {
    await waitForWatch({
      label: 'every watch primed',
      check: () => {
        const found = getAllWatchRecords();
        return found.length > 0 && found.every((one) => one.record.primed);
      },
      scene: self,
    });
  };

  // stop every daemon this scene spawned, by its pid record
  const stopAllDaemons = (): void => {
    getAllWatchDaemonPids({ home }).forEach((pid) => {
      try {
        process.kill(pid, 'SIGKILL');
      } catch (error) {
        // a daemon that already left needs no stop
        if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
      }
    });
  };

  const self: WatchScene = {
    home,
    storeDir,
    fakeBin,
    roots,
    getStore,
    setStore,
    getSays: () => readLines(sayLog),
    getGhCalls: () => readLines(ghLog),
    getKeyrackCalls: () => readLines(keyrackLog),
    getStateRoot,
    getAllWatchRecords,
    getDiagnostics,
    waitForDaemonTicks,
    waitForPrimed,
    runSkill,
    runScript,
    runSkillAsync,
    asMasked,
    stopAllDaemons,
  };
  return self;
};
