import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir } from 'test-fns';

/**
 * .what = a hermetic scene for the git.pull.title and git.pull.description verbs
 * .why  = both nouns read and write one field of one pull; one stub serves both,
 *         so the two suites cannot drift on what github answers
 *
 * .mock = the `gh` cli is a PATH stub (a node executable over a json store of
 *         pulls), and `node_modules/.bin/rhachet` is a stub keyrack
 * .why  = these cases drive states github cannot be put into on demand (a 422,
 *         a logged-out gh, a write that reads back altered), and they count every
 *         gh call, which proves "no write" claims
 * .real = no real case of its own (fulcrum F7). the shared reads (auth, viewer
 *         login, the pull lookup, a GET of the description) run against the real api
 *         in git.pull.comment.real.integration.test.ts; the pull PATCH has no real case
 */
export const PULL_SCENE_REPO = 'ehmpathy/surf-demo';
export const PULL_SCENE_LOGIN_SELF = 'ehm-seaturtle';
export const PULL_SCENE_LOGIN_HUMAN = 'surfer-kai';
export const PULL_SCENE_LOGIN_FOREIGN = 'reef-ranger';

const FAKE_GH = String.raw`#!/usr/bin/env node
const fs = require('fs');
const statePath = process.env.FAKE_GH_STATE;
const logPath = process.env.FAKE_GH_LOG;
const argv = process.argv.slice(2);
const stdin = argv.includes('--input') ? fs.readFileSync(0, 'utf-8') : null;
fs.appendFileSync(logPath, JSON.stringify({ argv, stdin, hasGhToken: process.env.GH_TOKEN !== undefined }) + '\n');
const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
const save = () => fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
// write whole before exit: process.exit drops a pipe write past 64KiB, as real gh never does.
// on EAGAIN (pipe full) it sleeps 5ms for the reader to drain; a write that never lands fails loud
// .note = the loop cursor and attempt count are a deliberate, local mutation
const writeAll = (fd, text) => {
  const buf = Buffer.from(text);
  const nap = new Int32Array(new SharedArrayBuffer(4));
  let at = 0;
  for (let tries = 0; at < buf.length; tries++) {
    if (tries > 2000) throw new Error('stub gh: write stuck on fd ' + fd + ' at byte ' + at + ' of ' + buf.length + '; hint: run the stub via spawnSync, which drains its pipes, or shrink the response under the 10s bound');
    try { at += fs.writeSync(fd, buf, at); } catch (e) { if (e.code !== 'EAGAIN') throw e; Atomics.wait(nap, 0, 0, 5); }
  }
};
const out = (v) => { writeAll(1, JSON.stringify(v)); process.exit(0); };
const fail = (msg) => { writeAll(2, msg + '\n'); process.exit(1); };
const asHuman = process.env.GH_TOKEN === undefined;
if (asHuman && state.humanLoggedOut) fail('To get started with GitHub CLI, please run:  gh auth login');
if (argv[0] !== 'api') fail('stub gh: only api');
if (argv[1] === 'graphql') out({ data: { viewer: { login: asHuman ? state.loginHuman : state.loginSelf } } });
const methodAt = argv.indexOf('--method');
const method = methodAt >= 0 ? argv[methodAt + 1] : 'GET';
if (state.fail && (!state.failMethod || state.failMethod === method)) fail(state.fail);
const endpoint = argv.slice(1).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--method' && all[i - 1] !== '--input')[0];
const base = 'repos/' + state.repo + '/';
if (!endpoint.toLowerCase().startsWith(base.toLowerCase())) fail('gh: Not Found (HTTP 404)');
const rest = endpoint.slice(base.length);
if (rest.startsWith('pulls?') && method === 'GET') {
  const query = new URLSearchParams(rest.slice('pulls?'.length));
  const owner = state.repo.split('/')[0];
  out(Object.entries(state.prs)
    .filter(([, pr]) => query.get('state') === (pr.state || 'open') && owner + ':' + pr.head === query.get('head'))
    .map(([number, pr]) => ({ number: Number(number), head: { ref: pr.head } })));
}
const parts = rest.split('/');
if (parts[0] === 'pulls' && parts.length === 2) {
  const pr = state.prs[parts[1]];
  if (!pr) fail('gh: Not Found (HTTP 404)');
  const pull = () => ({ number: Number(parts[1]), state: pr.state || 'open', title: pr.title, body: pr.body, user: { login: pr.author || state.loginSelf }, html_url: 'https://github.com/' + state.repo + '/pull/' + parts[1] });
  if (method === 'GET') out(pull());
  if (method === 'PATCH') {
    const patch = JSON.parse(stdin);
    const tamper = (v) => (state.rewrite ? v + ' (edited by a bot)' : v);
    if (patch.title !== undefined) pr.title = tamper(patch.title);
    if (patch.body !== undefined) pr.body = tamper(patch.body);
    save();
    out(pull());
  }
}
fail('stub gh: no route for ' + method + ' ' + endpoint);
`;

const FAKE_RHACHET = `#!/bin/bash
if [[ "$2" == "get" && -n "\${FAKE_KEYRACK_TOKEN:-}" ]]; then
  printf '{"grant":{"key":{"secret":"%s"}}}' "$FAKE_KEYRACK_TOKEN"
  exit 0
fi
[[ "$2" == "unlock" ]] && exit 1
echo "credential not found: EHMPATHY_SEATURTLE_GITHUB_TOKEN" >&2
exit 2
`;

export type PullSceneStore = {
  repo: string;
  loginSelf: string;
  loginHuman: string;
  rewrite: boolean;
  humanLoggedOut: boolean;
  fail: string | null;
  failMethod: 'GET' | 'PATCH' | null;
  prs: Record<
    string,
    {
      title: string;
      body: string;
      head: string;
      state?: 'open' | 'closed';
      // the login that opened the pull; absent → loginSelf, the robot's own pull
      author?: string;
    }
  >;
};
export type PullSceneCall = {
  argv: string[];
  stdin: string | null;
  hasGhToken: boolean;
};

/**
 * .what = the scene every case starts from: pull #7 on branch surf/book-lesson,
 *         pull #8 on another branch, a keyrack token, a home-org origin
 */
export const PULL_SCENE_BARE: {
  store: Partial<PullSceneStore> | null;
  token: string | null;
  branch: string;
} = {
  store: null,
  token: 'fake-token',
  branch: 'surf/book-lesson',
};

/**
 * .what = a hermetic temp repo with the stub gh, the stub keyrack, and a store
 * .note = token null → keyrack hands back none
 */
export const genGitPullScene = (input: typeof PULL_SCENE_BARE) => {
  const tempDir = genTempDir({ slug: 'git-pull-field-test', git: true });
  const home = genTempDir({ slug: 'git-pull-field-home', git: false });

  // one home org: a clone under ~/git/ehmpathy/ with an ehmpathy origin
  const gitDir = path.join(home, 'git', 'ehmpathy', 'clone', '.git');
  fs.mkdirSync(gitDir, { recursive: true });
  fs.writeFileSync(
    path.join(gitDir, 'config'),
    `[remote "origin"]\n\turl = git@github.com:${PULL_SCENE_REPO}.git\n`,
  );

  // the cwd: a branch with a home-org origin
  spawnSync(
    'git',
    ['remote', 'add', 'origin', `git@github.com:${PULL_SCENE_REPO}.git`],
    { cwd: tempDir },
  );
  spawnSync('git', ['checkout', '-b', input.branch], { cwd: tempDir });

  // stub bins
  const fakeBin = path.join(tempDir, '.fakebin');
  fs.mkdirSync(fakeBin, { recursive: true });
  fs.writeFileSync(path.join(fakeBin, 'gh'), FAKE_GH);
  fs.chmodSync(path.join(fakeBin, 'gh'), '755');
  const nodeBin = path.join(tempDir, 'node_modules', '.bin');
  fs.mkdirSync(nodeBin, { recursive: true });
  fs.writeFileSync(path.join(nodeBin, 'rhachet'), FAKE_RHACHET);
  fs.chmodSync(path.join(nodeBin, 'rhachet'), '755');

  // the store
  const storeDir = path.join(tempDir, '.fakegh');
  fs.mkdirSync(storeDir, { recursive: true });
  const statePath = path.join(storeDir, 'state.json');
  const logPath = path.join(storeDir, 'log.jsonl');
  const store: PullSceneStore = {
    repo: PULL_SCENE_REPO,
    loginSelf: PULL_SCENE_LOGIN_SELF,
    loginHuman: PULL_SCENE_LOGIN_HUMAN,
    rewrite: false,
    humanLoggedOut: false,
    fail: null,
    failMethod: null,
    prs: {
      '7': {
        title: 'feat(lessons): book a surf lesson',
        body: 'surf lesson booker\n\n---\n🐢🌊 surfed in by seaturtle[bot]',
        head: 'surf/book-lesson',
      },
      '8': {
        title: 'feat(reports): sync the wave report',
        body: 'wave report sync',
        head: 'surf/wave-report',
      },
    },
    ...(input.store ?? {}),
  };
  fs.writeFileSync(statePath, JSON.stringify(store, null, 2));
  fs.writeFileSync(logPath, '');

  // run one skill executable against the stub, by its path
  const run = (
    skillPath: string,
    args: string[],
    opts?: { stdin?: string },
  ) => {
    const {
      EHMPATHY_SEATURTLE_GITHUB_TOKEN: _a,
      GH_TOKEN: _b,
      GITHUB_TOKEN: _c,
      ...envBase
    } = process.env;
    const result = spawnSync('bash', [skillPath, ...args], {
      cwd: tempDir,
      encoding: 'utf-8',
      input: opts?.stdin ?? '',
      env: {
        ...envBase,
        HOME: home,
        PATH: `${fakeBin}:${process.env.PATH}`,
        FAKE_GH_STATE: statePath,
        FAKE_GH_LOG: logPath,
        ...(input.token ? { FAKE_KEYRACK_TOKEN: input.token } : {}),
      },
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };
  const getStore = (): PullSceneStore =>
    JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  const getCalls = (): PullSceneCall[] =>
    fs
      .readFileSync(logPath, 'utf-8')
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line));
  const getWrites = (): PullSceneCall[] =>
    getCalls().filter(
      (call) => call.argv[call.argv.indexOf('--method') + 1] === 'PATCH',
    );
  const writeFile = (name: string, content: string): string => {
    fs.writeFileSync(path.join(tempDir, name), content);
    return `./${name}`;
  };
  return { tempDir, run, getStore, getCalls, getWrites, writeFile };
};
