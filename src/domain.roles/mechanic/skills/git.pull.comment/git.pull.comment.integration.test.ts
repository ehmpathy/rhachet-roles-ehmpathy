import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = integration tests for git.pull.comment.get | set | del
 * .why  = prove the contract: plan by default, keyed upsert, thread scope,
 *         author + twin refusals, read-back hash, home-org fence, auth split
 *
 * .mock = the `gh` cli is a PATH stub (a stateful node executable over a json store)
 *         and `node_modules/.bin/rhachet` is a stub keyrack that hands back a fixed
 *         token, or none
 * .why  = these cases drive states github cannot be put into on demand — a
 *         foreign-held key, a twin, a write that reads back altered, a delete that
 *         silently holds — and they count every gh call, which proves "no write"
 *         and "no gh call" claims. a real api run per case would also post to a
 *         live pr fifteen times per ci run
 * .real = git.pull.comment.real.integration.test.ts runs set → get → set (no-op) →
 *         del → get (absent) against the real github api on a home-org pr
 */
/**
 * .what = a snapshot serializer that masks every clock time as `<time>`
 * .why  = the repo's pre-commit check forbids a raw HH:MM:SS in any snapshot, so
 *         a snap can never permadrift; the stub clock's order is asserted
 *         explicitly where it matters (case13 [t1] sort), never by the snap
 */
const CLOCK_TIME = /T?\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:?\d{2})?/g;
expect.addSnapshotSerializer({
  test: (value: unknown) =>
    typeof value === 'string' && new RegExp(CLOCK_TIME.source).test(value),
  serialize: (value: string, config, indentation, depth, refs, printer) =>
    printer(
      value.replace(CLOCK_TIME, 'T<time>'),
      config,
      indentation,
      depth,
      refs,
    ),
});

describe('git.pull.comment', () => {
  const LOGIN_SELF = 'ehm-seaturtle';
  const LOGIN_HUMAN = 'surfer-kai';
  const REPO = 'ehmpathy/surf-demo';

  /**
   * .what = the stub gh: a node executable over a json store
   * .note = pages of 2, so a list read without --paginate misses rows
   */
  const FAKE_GH = String.raw`#!/usr/bin/env node
const fs = require('fs');
const statePath = process.env.FAKE_GH_STATE;
const logPath = process.env.FAKE_GH_LOG;
const argv = process.argv.slice(2);
const stdin = argv.includes('--input') ? fs.readFileSync(0, 'utf-8') : null;
fs.appendFileSync(logPath, JSON.stringify({
  argv,
  stdin,
  hasGhToken: process.env.GH_TOKEN !== undefined,
  hasGithubToken: process.env.GITHUB_TOKEN !== undefined,
  ghToken: process.env.GH_TOKEN === undefined ? null : process.env.GH_TOKEN,
}) + '\n');
const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
const save = () => fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
const out = (v) => { process.stdout.write(JSON.stringify(v)); process.exit(0); };
const notFound = () => { process.stderr.write('gh: Not Found (HTTP 404)\n'); process.exit(1); };
const login = process.env.GH_TOKEN === undefined ? state.loginHuman : state.loginSelf;
if (argv[0] !== 'api') { process.stderr.write('stub gh: only api\n'); process.exit(1); }
// the whoami fails only when asked by name: a logged-out gh fails here first
if (argv[1] === 'graphql' && state.fail && state.failMethod === 'GRAPHQL') { process.stderr.write(state.fail + '\n'); process.exit(1); }
// review threads: one thread per root review comment; a root in state.resolved reads resolved
if (argv[1] === 'graphql' && argv.some((a) => a.includes('reviewThreads'))) {
  const prArg = argv.find((a) => a.startsWith('pr='));
  const pr = Number(prArg ? prArg.slice(3) : 0);
  const reviews = state.comments.filter((c) => c.kind === 'review' && c.pr === pr);
  const roots = reviews.filter((c) => !c.in_reply_to_id);
  const nodes = roots.map((root) => ({
    isResolved: (state.resolved || []).includes(root.id),
    comments: { nodes: reviews.filter((c) => c.id === root.id || c.in_reply_to_id === root.id).map((c) => ({ databaseId: c.id })) },
  }));
  out({ data: { repository: { pullRequest: { reviewThreads: { pageInfo: { hasNextPage: false, endCursor: null }, nodes } } } } });
}
if (argv[1] === 'graphql') out({ data: { viewer: { login } } });
const methodAt = argv.indexOf('--method');
const method = methodAt >= 0 ? argv[methodAt + 1] : 'GET';
// a failure github would raise: an auth refusal, a 403, a 422, a 5xx — on every rest call, or on one method
if (state.fail && (!state.failMethod || state.failMethod === method)) { process.stderr.write(state.fail + '\n'); process.exit(1); }
const paginate = argv.includes('--paginate');
const endpoint = argv.slice(1).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--method' && all[i - 1] !== '--input')[0];
const repo = state.repo;
const tick = () => { state.clock += 1; return '2026-10-24T00:00:' + String(state.clock).padStart(2, '0') + 'Z'; };
const view = (c) => ({
  id: c.id, body: c.body, user: { login: c.author }, created_at: c.created_at,
  html_url: 'https://github.com/' + repo + '/pull/' + c.pr + '#' + (c.kind === 'issue' ? 'issuecomment-' : 'discussion_r') + c.id,
  ...(c.kind === 'issue'
    ? { issue_url: 'https://api.github.com/repos/' + repo + '/issues/' + c.pr }
    : { pull_request_url: 'https://api.github.com/repos/' + repo + '/pulls/' + c.pr, in_reply_to_id: c.in_reply_to_id }),
});
const pages = (rows) => {
  const all = [];
  for (let i = 0; i < rows.length; i += 2) all.push(rows.slice(i, i + 2));
  if (all.length === 0) all.push([]);
  if (!paginate) out(all[0]);
  process.stdout.write(all.map((p) => JSON.stringify(p)).join('\n'));
  process.exit(0);
};
const bodyIn = () => {
  const body = JSON.parse(stdin).body;
  return state.rewrite ? body + ' (edited by a bot)' : body;
};
const write = (c) => { c.body = bodyIn(); save(); out(view(c)); };
const create = (fields) => {
  state.nextId += 1;
  const c = { id: state.nextId, author: login, created_at: tick(), ...fields, body: bodyIn() };
  // a write github answers but never holds: dropWrite; a reply with no id: noId
  if (!state.dropWrite) state.comments.push(c);
  save();
  if (state.noId) { const { id, ...rest } = view(c); out(rest); }
  out(view(c));
};
const base = 'repos/' + repo + '/';
// github owners and repo names are case-blind, so the stub's are too
if (!endpoint.toLowerCase().startsWith(base.toLowerCase())) notFound();
const rest = endpoint.slice(base.length).split('/');
const find = (kind, id) => state.comments.find((c) => c.kind === kind && c.id === Number(id));
const one = (kind, id) => {
  const c = find(kind, id);
  if (!c) notFound();
  if (method === 'GET') out(view(c));
  if (method === 'PATCH') write(c);
  if (method === 'DELETE') {
    if (!state.holdDelete) state.comments = state.comments.filter((x) => x !== c);
    save();
    process.exit(0);
  }
};
// github answers 404 for the comments of a pr that does not exist
const listOf = (kind, pr) => {
  if (!state.prs[pr]) notFound();
  return state.comments.filter((c) => c.kind === kind && c.pr === Number(pr)).map(view);
};
if (rest[0] === 'issues' && rest[1] === 'comments') one('issue', rest[2]);
if (rest[0] === 'pulls' && rest[1] === 'comments') one('review', rest[2]);
if (rest[0] === 'issues' && rest[2] === 'comments') {
  if (!state.prs[rest[1]]) notFound();
  if (method === 'GET') pages(listOf('issue', rest[1]));
  if (method === 'POST') create({ kind: 'issue', pr: Number(rest[1]) });
}
if (rest[0] === 'pulls' && rest[2] === 'comments' && rest.length === 3 && method === 'GET') pages(listOf('review', rest[1]));
// github threads a reply under the thread root, even a reply to a reply
if (rest[0] === 'pulls' && rest[2] === 'comments' && rest[4] === 'replies' && method === 'POST') {
  const target = find('review', rest[3]);
  if (!target || target.pr !== Number(rest[1])) notFound();
  create({ kind: 'review', pr: Number(rest[1]), in_reply_to_id: target.in_reply_to_id ?? target.id });
}
if (rest[0] === 'pulls' && rest.length === 2) {
  const pr = state.prs[rest[1]];
  if (!pr) notFound();
  const pull = () => ({ number: Number(rest[1]), title: pr.title, body: pr.body, user: { login: pr.author }, created_at: pr.created_at, html_url: 'https://github.com/' + repo + '/pull/' + rest[1] });
  if (method === 'GET') out(pull());
  // a pull PATCH carries the field it sets: title, body, or both
  if (method === 'PATCH') {
    const patch = JSON.parse(stdin);
    if (patch.title !== undefined) pr.title = state.rewrite ? patch.title + ' (edited by a bot)' : patch.title;
    if (patch.body !== undefined) pr.body = bodyIn();
    save();
    out(pull());
  }
}
process.stderr.write('stub gh: no route for ' + method + ' ' + endpoint + '\n');
process.exit(1);
`;

  /**
   * .what = the stub keyrack: hands back FAKE_KEYRACK_TOKEN, or refuses
   */
  const FAKE_RHACHET = `#!/bin/bash
if [[ "$2" == "get" && -n "\${FAKE_KEYRACK_TOKEN:-}" ]]; then
  printf '{"grant":{"key":{"secret":"%s"}}}' "$FAKE_KEYRACK_TOKEN"
  exit 0
fi
[[ "$2" == "unlock" ]] && exit 1
echo "credential not found: EHMPATHY_SEATURTLE_GITHUB_TOKEN" >&2
exit 2
`;

  type Comment = {
    id: number;
    kind: 'issue' | 'review';
    pr: number;
    author: string;
    body: string;
    created_at: string;
    in_reply_to_id?: number;
  };
  type Store = {
    repo: string;
    loginSelf: string;
    loginHuman: string;
    clock: number;
    nextId: number;
    rewrite: boolean;
    holdDelete: boolean;
    dropWrite: boolean;
    noId: boolean;
    fail: string | null;
    failMethod: 'POST' | 'PATCH' | 'DELETE' | 'GRAPHQL' | null;
    resolved: number[];
    prs: Record<
      string,
      { title: string; body: string; author: string; created_at: string }
    >;
    comments: Comment[];
  };
  type Call = {
    argv: string[];
    stdin: string | null;
    hasGhToken: boolean;
    hasGithubToken: boolean;
    ghToken: string | null;
  };

  /**
   * .what = a keyed body, the way set writes it
   */
  const asKeyedBody = (input: { text: string; key: string }): string =>
    `🐢 ${input.text}\n\n<!-- rhx:git.pull.comment key=${input.key} -->`;

  /**
   * .what = the scene input every case starts from: no comments, the default
   *         store, a keyrack token, and a home-org origin
   * .why  = each case spreads this and overrides only what it varies, so every
   *         scene attribute is explicit, never an absent key
   */
  const SCENE_BARE: {
    comments: Comment[];
    store: Partial<Store> | null;
    token: string | null;
    origin: string | null;
  } = {
    comments: [],
    store: null,
    token: 'fake-token',
    origin: `git@github.com:${REPO}.git`,
  };

  /**
   * .what = a hermetic temp repo with the stub gh, the stub keyrack, and a store
   * .note = token null → keyrack hands back none; origin null → no git remote
   */
  const genScene = (input: typeof SCENE_BARE) => {
    const tempDir = genTempDir({ slug: 'git-pull-comment-test', git: true });
    const home = genTempDir({ slug: 'git-pull-comment-home', git: false });
    if (input.origin)
      spawnSync('git', ['remote', 'add', 'origin', input.origin], {
        cwd: tempDir,
      });

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
    const store: Store = {
      repo: REPO,
      loginSelf: LOGIN_SELF,
      loginHuman: LOGIN_HUMAN,
      clock: 10,
      nextId: 5000,
      rewrite: false,
      holdDelete: false,
      dropWrite: false,
      noId: false,
      fail: null,
      failMethod: null,
      resolved: [],
      prs: {
        '7': {
          title: 'feat(lessons): book a surf lesson',
          body: 'surf lesson booker',
          author: LOGIN_HUMAN,
          created_at: '2026-10-24T00:00:01Z',
        },
        '8': {
          title: 'feat(reports): sync the wave report',
          body: 'wave report sync',
          author: LOGIN_HUMAN,
          created_at: '2026-10-24T00:00:02Z',
        },
      },
      comments: input.comments,
      ...(input.store ?? {}),
    };
    fs.writeFileSync(statePath, JSON.stringify(store, null, 2));
    fs.writeFileSync(logPath, '');

    // run any git.pull.* skill executable against the stub, by its path
    const runSkill = (
      skillPath: string,
      args: string[],
      opts?: { stdin?: string; env?: Record<string, string> },
    ) => {
      const {
        EHMPATHY_SEATURTLE_GITHUB_TOKEN: _a,
        GH_TOKEN: _b,
        GITHUB_TOKEN: _c,
        ...envBase
      } = process.env;
      const token = input.token;
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
          ...(token ? { FAKE_KEYRACK_TOKEN: token } : {}),
          ...opts?.env,
        },
      });
      return {
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
        exitCode: result.status ?? 1,
      };
    };
    // run one comment verb
    const run = (
      verb: 'get' | 'set' | 'del',
      args: string[],
      opts?: { stdin?: string; env?: Record<string, string> },
    ) =>
      runSkill(path.join(__dirname, `git.pull.comment.${verb}.sh`), args, opts);
    // run one skill of this dir by name, e.g. the git.pull.comment dispatcher
    const runPull = (
      skill: string,
      args: string[],
      opts?: { stdin?: string; env?: Record<string, string> },
    ) => runSkill(path.join(__dirname, `${skill}.sh`), args, opts);
    const getStore = (): Store =>
      JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    const getCalls = (): Call[] =>
      fs
        .readFileSync(logPath, 'utf-8')
        .split('\n')
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line));
    // .note = the graphql whoami is a read, though graphql rides on POST
    const getWrites = (): Call[] =>
      getCalls().filter(
        (call) =>
          call.argv[1] !== 'graphql' &&
          ['POST', 'PATCH', 'DELETE'].includes(
            call.argv[call.argv.indexOf('--method') + 1] ?? '',
          ),
      );
    const writeFile = (name: string, content: string): string => {
      fs.writeFileSync(path.join(tempDir, name), content);
      return `./${name}`;
    };
    return {
      tempDir,
      run,
      runPull,
      getStore,
      getCalls,
      getWrites,
      writeFile,
    };
  };

  /**
   * .what = a seed comment
   */
  const genComment = (input: Partial<Comment> & { id: number }): Comment => ({
    kind: 'issue',
    pr: 7,
    author: LOGIN_SELF,
    // the default seed is one the robot wrote: set opens every body with 🐢
    body: '🐢 hang ten',
    created_at: `2026-10-24T00:00:0${input.id % 10}Z`,
    ...input,
  });

  given('[case1] plan is the default, on set and on del', () => {
    const scene = genScene({
      ...SCENE_BARE,
      comments: [
        genComment({
          id: 101,
          body: asKeyedBody({ text: 'old status', key: 'old-status' }),
        }),
      ],
    });
    when('[t0] set --key plans a new comment', () => {
      const result = useThen('it runs', async () =>
        scene.run('set', [
          '--pr',
          '7',
          '--key',
          'status',
          '--from',
          scene.writeFile('status.md', 'waves are up\n'),
        ]),
      );
      then('it exits 0 and says it would post', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('verdict: would post (plan');
        expect(result.stdout).toMatchSnapshot();
      });
      then('it writes naught', () => {
        expect(scene.getWrites()).toEqual([]);
      });
    });
    when('[t1] del --key plans a delete', () => {
      const result = useThen('it runs', async () =>
        scene.run('del', ['--pr', '7', '--key', 'old-status']),
      );
      then('it exits 0 and says it would delete', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('would delete issue comment 101');
        expect(result.stdout).toMatchSnapshot();
      });
      then('it writes naught, and the comment stands', () => {
        expect(scene.getWrites()).toEqual([]);
        expect(scene.getStore().comments.map((c) => c.id)).toEqual([101]);
      });
    });
    when('[t2] set and del plan with --output json', () => {
      const result = useThen('they run', async () => ({
        set: scene.run('set', [
          '--pr',
          '7',
          '--key',
          'status',
          '--from',
          scene.writeFile('status.md', 'waves are up\n'),
          '--output',
          'json',
        ]),
        del: scene.run('del', [
          '--pr',
          '7',
          '--key',
          'old-status',
          '--output',
          'json',
        ]),
      }));
      then('each exits 0 with a parseable plan, and writes naught', () => {
        expect(result.set.exitCode).toBe(0);
        expect(result.del.exitCode).toBe(0);
        const setPlan = JSON.parse(result.set.stdout);
        const delPlan = JSON.parse(result.del.stdout);
        expect(setPlan.mode).toBe('plan');
        expect(setPlan.method).toBe('POST');
        expect(setPlan.verdict).toContain('would post');
        expect(delPlan.mode).toBe('plan');
        expect(delPlan.id).toBe(101);
        expect(delPlan.verdict).toContain('would delete');
        expect(scene.getWrites()).toEqual([]);
        expect({ set: setPlan, del: delPlan }).toMatchSnapshot();
      });
    });
  });

  given('[case2] apply posts the exact body', () => {
    when('[t0] the text lacks the 🐢 prefix', () => {
      const scene = genScene(SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run('set', [
          '--pr',
          '7',
          '--key',
          'status',
          '--from',
          scene.writeFile('status.md', 'waves are up\n\n'),
          '--mode',
          'apply',
        ]),
      );
      then('it posts 🐢 + text + the key marker, read back', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('posted, read back, hash matches');
        expect(scene.getStore().comments[0]?.body).toEqual(
          asKeyedBody({ text: 'waves are up', key: 'status' }),
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t1] the text already opens with 🐢', () => {
      const scene = genScene(SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run(
          'set',
          [
            '--pr',
            '7',
            '--key',
            'status',
            '--from',
            '@stdin',
            '--mode',
            'apply',
          ],
          { stdin: '🐢 waves are up' },
        ),
      );
      then('the prefix is not doubled', () => {
        expect(result.exitCode).toBe(0);
        expect(scene.getStore().comments[0]?.body).toEqual(
          asKeyedBody({ text: 'waves are up', key: 'status' }),
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when(
      '[t2] the text carries a stale marker, as a body piped back from get does',
      () => {
        const scene = genScene(SCENE_BARE);
        const result = useThen('it runs', async () =>
          scene.run(
            'set',
            [
              '--pr',
              '7',
              '--key',
              'status',
              '--from',
              '@stdin',
              '--mode',
              'apply',
            ],
            { stdin: asKeyedBody({ text: 'waves are up', key: 'old-key' }) },
          ),
        );
        then('the stale marker is dropped; the one marker names --key', () => {
          expect(result.exitCode).toBe(0);
          expect(scene.getStore().comments[0]?.body).toEqual(
            asKeyedBody({ text: 'waves are up', key: 'status' }),
          );
          expect(result.stdout).toMatchSnapshot();
        });
      },
    );
  });

  given('[case3] a reply posts to the thread replies endpoint', () => {
    const scene = genScene({
      ...SCENE_BARE,
      comments: [
        genComment({
          id: 201,
          kind: 'review',
          author: LOGIN_HUMAN,
          body: 'why foamboard?',
        }),
        genComment({
          id: 202,
          kind: 'review',
          author: LOGIN_HUMAN,
          body: 'nit: name',
        }),
        genComment({
          id: 203,
          kind: 'review',
          author: LOGIN_HUMAN,
          body: 'nit: typo',
        }),
      ],
    });
    when('[t0] set --reply-to 203 --key answer --mode apply', () => {
      const result = useThen('it runs', async () =>
        scene.run('set', [
          '--pr',
          '7',
          '--reply-to',
          '203',
          '--key',
          'answer',
          '--from',
          scene.writeFile('answer.md', 'fixed the typo'),
          '--mode',
          'apply',
        ]),
      );
      then('it POSTs to pulls/7/comments/203/replies', () => {
        expect(result.exitCode).toBe(0);
        const writes = scene.getWrites();
        expect(writes).toHaveLength(1);
        expect(writes[0]?.argv).toContain(
          `repos/${REPO}/pulls/7/comments/203/replies`,
        );
        expect(result.stdout).toMatchSnapshot();
      });
      then('it reads the reply back by id', () => {
        const reads = scene.getCalls().map((call) => call.argv.join(' '));
        expect(reads).toContain(
          `api --method GET repos/${REPO}/pulls/comments/5001`,
        );
      });
      then('it lists the thread with --paginate', () => {
        const lists = scene
          .getCalls()
          .filter((call) =>
            call.argv.includes(`repos/${REPO}/pulls/7/comments`),
          );
        expect(lists.length).toBeGreaterThan(0);
        lists.forEach((call) => expect(call.argv).toContain('--paginate'));
      });
      then('the reply sits in thread 203', () => {
        const reply = scene.getStore().comments.find((c) => c.id === 5001);
        expect(reply?.in_reply_to_id).toBe(203);
      });
    });
    when('[t1] the reply target is absent, or sits on another pr', () => {
      const elsewhere = genScene({
        ...SCENE_BARE,
        comments: [
          genComment({
            id: 211,
            kind: 'review',
            pr: 8,
            author: LOGIN_HUMAN,
            body: 'on the other pr',
          }),
        ],
      });
      const result = useThen('they run', async () => ({
        absent: elsewhere.run('set', [
          '--pr',
          '7',
          '--reply-to',
          '999',
          '--key',
          'answer',
          '--from',
          elsewhere.writeFile('a.md', 'a'),
          '--mode',
          'apply',
        ]),
        otherPr: elsewhere.run('set', [
          '--pr',
          '7',
          '--reply-to',
          '211',
          '--key',
          'answer',
          '--from',
          elsewhere.writeFile('a.md', 'a'),
          '--mode',
          'apply',
        ]),
      }));
      then('each exits 2, names the target, writes naught', () => {
        expect(result.absent.exitCode).toBe(2);
        expect(result.absent.stdout).toContain(
          `no review comment 999 on ${REPO} for --reply-to`,
        );
        expect(result.otherPr.exitCode).toBe(2);
        expect(result.otherPr.stdout).toContain(
          `review comment 211 is not on ${REPO}#7`,
        );
        expect(elsewhere.getWrites()).toEqual([]);
        expect({
          absent: result.absent.stdout,
          otherPr: result.otherPr.stdout,
        }).toMatchSnapshot();
      });
    });
  });

  given(
    '[case4] a key upserts: absent → POST, differs → PATCH, same → no-op',
    () => {
      const scene = genScene(SCENE_BARE);
      const apply = (text: string) =>
        scene.run('set', [
          '--pr',
          '7',
          '--key',
          'status',
          '--from',
          scene.writeFile('status.md', text),
          '--mode',
          'apply',
        ]);
      when('[t0] the key is absent', () => {
        const result = useThen('it runs', async () => apply('round 1'));
        then('it POSTs', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('endpoint: POST');
          expect(scene.getStore().comments).toHaveLength(1);
          expect(result.stdout).toMatchSnapshot();
        });
      });
      when('[t1] the key holds a different body', () => {
        const result = useThen('it runs', async () => apply('round 2'));
        then('it PATCHes the same comment in place', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain(
            `endpoint: PATCH repos/${REPO}/issues/comments/5001`,
          );
          expect(scene.getStore().comments).toHaveLength(1);
          expect(scene.getStore().comments[0]?.body).toContain('round 2');
          expect(result.stdout).toMatchSnapshot();
        });
      });
      when('[t2] the key already holds this body', () => {
        const result = useThen('it runs', async () => {
          const before = scene.getWrites().length;
          const run = apply('round 2');
          return { ...run, writesNew: scene.getWrites().length - before };
        });
        then('it is a no-op, with no write', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('already there — no-op');
          expect(result.stdout).toContain('endpoint: none (no-op;');
          expect(result.writesNew).toBe(0);
          expect(result.stdout).toMatchSnapshot();
        });
      });
      when('[t3] a plan for a body that differs', () => {
        const result = useThen('it runs', async () => {
          const before = scene.getWrites().length;
          const run = scene.run('set', [
            '--pr',
            '7',
            '--key',
            'status',
            '--from',
            scene.writeFile('status.md', 'round 3'),
          ]);
          return { ...run, writesNew: scene.getWrites().length - before };
        });
        then('it shows both hashes and would edit, and writes naught', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('verdict: would edit (plan)');
          expect(result.stdout).toContain('current');
          expect(result.writesNew).toBe(0);
          expect(result.stdout).toMatchSnapshot();
        });
      });
    },
  );

  given('[case5] a reply key ignores a match in another thread', () => {
    const scene = genScene({
      ...SCENE_BARE,
      comments: [
        genComment({
          id: 301,
          kind: 'review',
          author: LOGIN_HUMAN,
          body: 'why?',
        }),
        genComment({
          id: 302,
          kind: 'review',
          author: LOGIN_HUMAN,
          body: 'how?',
        }),
        genComment({
          id: 303,
          kind: 'review',
          in_reply_to_id: 301,
          body: asKeyedBody({ text: 'because', key: 'answer' }),
        }),
      ],
    });
    when('[t0] set --reply-to 302 --key answer --mode apply', () => {
      const result = useThen('it runs', async () =>
        scene.run('set', [
          '--pr',
          '7',
          '--reply-to',
          '302',
          '--key',
          'answer',
          '--from',
          scene.writeFile('answer.md', 'like so'),
          '--mode',
          'apply',
        ]),
      );
      then('it POSTs a new reply in thread 302, and leaves 303 as is', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('pulls/7/comments/302/replies');
        const store = scene.getStore();
        expect(store.comments.find((c) => c.id === 303)?.body).toContain(
          'because',
        );
        expect(store.comments.find((c) => c.id === 5001)?.in_reply_to_id).toBe(
          302,
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t1] del --reply-to 302 --key answer --mode apply', () => {
      const result = useThen('it runs', async () =>
        scene.run('del', [
          '--pr',
          '7',
          '--reply-to',
          '302',
          '--key',
          'answer',
          '--mode',
          'apply',
        ]),
      );
      then('it deletes the keyed reply in thread 302, and leaves 303', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('deleted, confirmed absent');
        expect(result.stdout).toContain(
          `endpoint: DELETE repos/${REPO}/pulls/comments/5001`,
        );
        const ids = scene.getStore().comments.map((c) => c.id);
        expect(ids).not.toContain(5001);
        expect(ids).toContain(303);
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t2] set --reply-to 303, a reply, with the body 303 holds', () => {
      const result = useThen('it runs', async () => {
        const before = scene.getWrites().length;
        const run = scene.run('set', [
          '--pr',
          '7',
          '--reply-to',
          '303',
          '--key',
          'answer',
          '--from',
          scene.writeFile('answer.md', 'because'),
          '--mode',
          'apply',
        ]);
        return { ...run, writesNew: scene.getWrites().length - before };
      });
      then(
        'it scopes the key to the thread root 301, finds 303, and is a no-op',
        () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('already there — no-op');
          expect(result.writesNew).toBe(0);
          expect(
            scene.getStore().comments.filter((c) => c.in_reply_to_id === 301),
          ).toHaveLength(1);
          expect(result.stdout).toMatchSnapshot();
        },
      );
    });
    when('[t3] get --key answer --reply-to 303, a reply', () => {
      const result = useThen('it runs', async () =>
        scene.run('get', [
          '--pr',
          '7',
          '--key',
          'answer',
          '--reply-to',
          '303',
          '--output',
          'json',
        ]),
      );
      then('it reads the keyed reply of thread root 301', () => {
        expect(result.exitCode).toBe(0);
        const rows: { id: number }[] = JSON.parse(result.stdout);
        expect(rows.map((row) => row.id)).toEqual([303]);
        expect(rows).toMatchSnapshot();
      });
    });
  });

  given('[case6] a key held by another author refuses', () => {
    const scene = genScene({
      ...SCENE_BARE,
      comments: [
        genComment({
          id: 401,
          author: LOGIN_HUMAN,
          body: asKeyedBody({ text: 'mine', key: 'status' }),
        }),
      ],
    });
    when('[t0] set --key status --mode apply as-ehmpath', () => {
      const result = useThen('it runs', async () =>
        scene.run('set', [
          '--pr',
          '7',
          '--key',
          'status',
          '--from',
          scene.writeFile('status.md', 'not yours'),
          '--mode',
          'apply',
        ]),
      );
      then(
        'it exits 2, names the author and the --auth fix, writes naught',
        () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(`held by ${LOGIN_HUMAN}`);
          expect(result.stdout).toContain('--auth as-human');
          expect(result.stderr).toContain('ConstraintError');
          expect(scene.getWrites()).toEqual([]);
          expect(result.stdout).toMatchSnapshot();
        },
      );
    });
    when('[t1] get --key status reads a key another author holds', () => {
      const result = useThen('it runs', async () =>
        scene.run('get', ['--pr', '7', '--key', 'status']),
      );
      then('it exits 2 and names the holder, never "absent"', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(`held by ${LOGIN_HUMAN}`);
        expect(result.stdout).toContain(
          'rhx git.pull.comment.get --pr 7 --in ehmpathy/surf-demo --id 401 --kind issue',
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t2] del --key status --mode apply as-ehmpath', () => {
      const result = useThen('it runs', async () =>
        scene.run('del', ['--pr', '7', '--key', 'status', '--mode', 'apply']),
      );
      then(
        'it exits 2, names the holder and the --auth fix, deletes naught',
        () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(`held by ${LOGIN_HUMAN}`);
          expect(result.stdout).toContain(
            `rhx git.pull.comment.del --pr 7 --in ehmpathy/surf-demo --id 401 --kind issue --auth as-human   # if ${LOGIN_HUMAN} is that login: plan, then add --mode apply`,
          );
          expect(scene.getWrites()).toEqual([]);
          expect(result.stdout).toMatchSnapshot();
        },
      );
    });
    when('[t3] del --id 401 --kind issue --mode apply as-ehmpath', () => {
      const result = useThen('it runs', async () =>
        scene.run('del', [
          '--pr',
          '7',
          '--id',
          '401',
          '--kind',
          'issue',
          '--mode',
          'apply',
        ]),
      );
      then(
        'it exits 2: the comment is by another author; deletes naught',
        () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(`is by ${LOGIN_HUMAN}`);
          expect(result.stdout).toContain(
            `rhx git.pull.comment.del --pr 7 --in ehmpathy/surf-demo --id 401 --kind issue --auth as-human   # if ${LOGIN_HUMAN} is that login: plan, then add --mode apply; else only ${LOGIN_HUMAN} can delete it`,
          );
          expect(scene.getWrites()).toEqual([]);
          expect(scene.getStore().comments.map((c) => c.id)).toEqual([401]);
          expect(result.stdout).toMatchSnapshot();
        },
      );
    });
  });

  given('[case7] two own matches on one key refuse', () => {
    const scene = genScene({
      ...SCENE_BARE,
      comments: [
        genComment({
          id: 501,
          body: asKeyedBody({ text: 'one', key: 'status' }),
        }),
        genComment({
          id: 502,
          body: asKeyedBody({ text: 'two', key: 'status' }),
        }),
      ],
    });
    when('[t0] set --key status --mode apply', () => {
      const result = useThen('it runs', async () =>
        scene.run('set', [
          '--pr',
          '7',
          '--key',
          'status',
          '--from',
          scene.writeFile('status.md', 'three'),
          '--mode',
          'apply',
        ]),
      );
      then('it exits 2, names both ids, writes naught', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('501');
        expect(result.stdout).toContain('502');
        expect(result.stdout).toContain(
          'rhx git.pull.comment.del --pr 7 --in ehmpathy/surf-demo --id 502 --kind issue',
        );
        expect(scene.getWrites()).toEqual([]);
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t1] del --key status --mode apply', () => {
      const result = useThen('it runs', async () =>
        scene.run('del', ['--pr', '7', '--key', 'status', '--mode', 'apply']),
      );
      then('it exits 2, names both ids, deletes neither', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('501');
        expect(result.stdout).toContain(
          'rhx git.pull.comment.del --pr 7 --in ehmpathy/surf-demo --id 502 --kind issue --mode apply',
        );
        expect(scene.getWrites()).toEqual([]);
        expect(scene.getStore().comments.map((c) => c.id)).toEqual([501, 502]);
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t2] get --key status', () => {
      const result = useThen('it runs', async () =>
        scene.run('get', ['--pr', '7', '--key', 'status']),
      );
      then('it exits 2 and names both ids, as set and del do', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain("key 'status' matches 2 comments");
        expect(result.stdout).toContain(
          'rhx git.pull.comment.del --pr 7 --in ehmpathy/surf-demo --id 502 --kind issue --mode apply',
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t3] a foreign comment quotes the marker mid-body', () => {
      const sceneQuote = genScene({
        ...SCENE_BARE,
        comments: [
          genComment({
            id: 511,
            author: 'kelp-forest-fan',
            body: 'try this:\n<!-- rhx:git.pull.comment key=tide -->\nthen paddle out',
          }),
        ],
      });
      const result = useThen('get and set run', async () => ({
        get: sceneQuote.run('get', ['--pr', '7', '--key', 'tide']),
        set: sceneQuote.run('set', [
          '--pr',
          '7',
          '--key',
          'tide',
          '--from',
          sceneQuote.writeFile('tide.md', 'high tide at noon'),
        ]),
      }));
      then('the mid-body marker claims no key: never "held by"', () => {
        expect(result.get.exitCode).toBe(2);
        expect(result.get.stdout).toContain("no comment carries key 'tide'");
        expect(result.set.exitCode).toBe(0);
        expect(result.set.stdout).toContain('would post (plan)');
        [result.get, result.set].forEach((one) =>
          expect(one.stdout).not.toContain('held by'),
        );
        expect({
          get: result.get.stdout,
          set: result.set.stdout,
        }).toMatchSnapshot();
      });
    });
    when('[t4] two own replies hold one key in one review thread', () => {
      const answer = asKeyedBody({ text: 'answer', key: 'answer' });
      const sceneThread = genScene({
        ...SCENE_BARE,
        comments: [
          genComment({ id: 521, kind: 'review', author: LOGIN_HUMAN }),
          genComment({
            id: 522,
            kind: 'review',
            in_reply_to_id: 521,
            body: answer,
          }),
          genComment({
            id: 523,
            kind: 'review',
            in_reply_to_id: 521,
            body: answer,
          }),
        ],
      });
      const thread = ['--pr', '7', '--key', 'answer', '--reply-to', '521'];
      const result = useThen('get, set, and del run', async () => ({
        get: sceneThread.run('get', thread),
        set: sceneThread.run('set', [
          ...thread,
          '--from',
          sceneThread.writeFile('answer.md', 'a new answer'),
          '--mode',
          'apply',
        ]),
        del: sceneThread.run('del', [...thread, '--mode', 'apply']),
        writes: sceneThread.getWrites().length,
      }));
      then(
        'each refuses the thread twin and names the newest review reply',
        () => {
          [result.get, result.set, result.del].forEach((one) => {
            expect(one.exitCode).toBe(2);
            expect(one.stdout).toContain("key 'answer' matches 2 comments");
            expect(one.stdout).toContain(
              'rhx git.pull.comment.del --pr 7 --in ehmpathy/surf-demo --id 523 --kind review --mode apply',
            );
          });
          expect(result.writes).toBe(0);
          expect({
            get: result.get.stdout,
            set: result.set.stdout,
            del: result.del.stdout,
          }).toMatchSnapshot();
        },
      );
    });
  });

  given(
    '[case8] set refuses before any gh call: no target, no file, no text',
    () => {
      const scene = genScene(SCENE_BARE);
      when('[t0] set --from with no target', () => {
        const result = useThen('it runs', async () =>
          scene.run('set', [
            '--pr',
            '7',
            '--from',
            scene.writeFile('status.md', 'unkeyed'),
            '--mode',
            'apply',
          ]),
        );
        then('it exits 2 before any gh call', () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('a new comment needs --key');
          expect(scene.getCalls()).toEqual([]);
          expect(result.stdout).toMatchSnapshot();
        });
      });
      when('[t1] --from names a file that is absent', () => {
        const result = useThen('it runs', async () =>
          scene.run('set', [
            '--pr',
            '7',
            '--key',
            'status',
            '--from',
            './absent.md',
          ]),
        );
        then('it exits 2, names the path, calls no gh', () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain("--from './absent.md' is not a file");
          expect(result.stderr).toContain('ConstraintError');
          expect(scene.getCalls()).toEqual([]);
          expect(result.stdout).toMatchSnapshot();
        });
      });
      when('[t2] --from @stdin carries only whitespace', () => {
        const result = useThen('it runs', async () =>
          scene.run(
            'set',
            ['--pr', '7', '--key', 'status', '--from', '@stdin'],
            {
              stdin: '\r\n\n',
            },
          ),
        );
        then('it exits 2 as an empty body, calls no gh', () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain("the body from '@stdin' is empty");
          expect(scene.getCalls()).toEqual([]);
          expect(result.stdout).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case9] del converges: absent is a no-op, present is deleted and confirmed',
    () => {
      const scene = genScene({
        ...SCENE_BARE,
        comments: [
          genComment({
            id: 601,
            kind: 'review',
            in_reply_to_id: 600,
            body: '🐢 twin',
          }),
        ],
      });
      when('[t0] del an id that is absent', () => {
        const result = useThen('it runs', async () =>
          scene.run('del', [
            '--pr',
            '7',
            '--id',
            '999',
            '--kind',
            'review',
            '--mode',
            'apply',
          ]),
        );
        then('it exits 0 as a no-op, with no DELETE', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('absent — no-op');
          expect(scene.getWrites()).toEqual([]);
          expect(result.stdout).toMatchSnapshot();
        });
      });
      when('[t1] del an id that is present', () => {
        const result = useThen('it runs', async () =>
          scene.run('del', [
            '--pr',
            '7',
            '--id',
            '601',
            '--kind',
            'review',
            '--mode',
            'apply',
          ]),
        );
        then('it DELETEs, confirms absent, exits 0', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('deleted, confirmed absent');
          expect(scene.getStore().comments).toEqual([]);
          const after = scene.getCalls().map((call) => call.argv.join(' '));
          expect(after.slice(-2)).toEqual([
            `api --method DELETE repos/${REPO}/pulls/comments/601`,
            `api --method GET repos/${REPO}/pulls/comments/601`,
          ]);
          expect(result.stdout).toMatchSnapshot();
        });
      });
      when('[t2] a delete that github holds', () => {
        const held = genScene({
          ...SCENE_BARE,
          comments: [genComment({ id: 602, body: '🐢 sticky' })],
          store: { holdDelete: true },
        });
        const result = useThen('it runs', async () =>
          held.run('del', [
            '--pr',
            '7',
            '--id',
            '602',
            '--kind',
            'issue',
            '--mode',
            'apply',
          ]),
        );
        then('it exits 1, still present', () => {
          expect(result.exitCode).toBe(1);
          expect(result.stdout).toContain('MalfunctionError');
          expect(result.stdout).toContain('still present after DELETE');
          expect(result.stdout).toMatchSnapshot();
        });
      });
      when('[t3] del an id on a pr the credential cannot see', () => {
        const result = useThen('it runs', async () =>
          scene.run('del', [
            '--pr',
            '9',
            '--id',
            '999',
            '--kind',
            'issue',
            '--mode',
            'apply',
          ]),
        );
        then(
          'it exits 2, never "absent — no-op", since the 404 proves naught',
          () => {
            expect(result.exitCode).toBe(2);
            expect(result.stdout).not.toContain('absent — no-op');
            expect(result.stdout).toContain(
              `pull request ${REPO}#9 is absent, or ${LOGIN_SELF} (as-ehmpath) cannot see it`,
            );
            expect(result.stdout).toMatchSnapshot();
          },
        );
      });
      when('[t4] del a key no comment carries', () => {
        const result = useThen('it runs', async () => {
          const before = scene.getWrites().length;
          const run = scene.run('del', [
            '--pr',
            '7',
            '--key',
            'absent-key',
            '--mode',
            'apply',
          ]);
          return { ...run, writesNew: scene.getWrites().length - before };
        });
        then('it exits 0 as a no-op, with no DELETE', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('absent — no-op');
          expect(result.writesNew).toBe(0);
          expect(result.stdout).toMatchSnapshot();
        });
      });
      when('[t5] set and del a key on a pr the credential cannot see', () => {
        const result = useThen('they run', async () => ({
          writesBefore: scene.getWrites().length,
          set: scene.run('set', [
            '--pr',
            '9',
            '--key',
            'status',
            '--from',
            scene.writeFile('status.md', 'waves are up'),
            '--mode',
            'apply',
          ]),
          del: scene.run('del', [
            '--pr',
            '9',
            '--key',
            'status',
            '--mode',
            'apply',
          ]),
        }));
        then(
          'each exits 2 and names the visibility, never a malfunction',
          () => {
            [result.set, result.del].forEach((one) => {
              expect(one.exitCode).toBe(2);
              expect(one.stdout).toContain(
                `pull request ${REPO}#9 is absent, or ${LOGIN_SELF} (as-ehmpath) cannot see it`,
              );
              expect(one.stdout).not.toContain('MalfunctionError');
            });
            expect(scene.getWrites()).toHaveLength(result.writesBefore);
            expect({
              set: result.set.stdout,
              del: result.del.stdout,
            }).toMatchSnapshot();
          },
        );
      });
      when(
        '[t6] get, and set by key, on a pr the credential cannot see',
        () => {
          const result = useThen('they run', async () => ({
            writesBefore: scene.getWrites().length,
            get: scene.run('get', ['--pr', '9']),
            setKey: scene.run('set', [
              '--pr',
              '9',
              '--key',
              'status',
              '--from',
              scene.writeFile('status.md', 'a new status'),
              '--mode',
              'apply',
            ]),
          }));
          then('each exits 2 with the one visibility message', () => {
            [result.get, result.setKey].forEach((one) => {
              expect(one.exitCode).toBe(2);
              expect(one.stdout).toContain(
                `pull request ${REPO}#9 is absent, or ${LOGIN_SELF} (as-ehmpath) cannot see it`,
              );
            });
            expect(scene.getWrites()).toHaveLength(result.writesBefore);
            expect({
              get: result.get.stdout,
              setKey: result.setKey.stdout,
            }).toMatchSnapshot();
          });
        },
      );
      when(
        '[t7] a wrong --kind, or a --reply-to thread that does not exist',
        () => {
          const result = useThen('they run', async () => {
            const sceneSwap = genScene({
              ...SCENE_BARE,
              comments: [genComment({ id: 1301, body: 'still here' })],
            });
            const swapped = ['--pr', '7', '--id', '1301', '--kind', 'review'];
            return {
              delSwap: sceneSwap.run('del', [...swapped, '--mode', 'apply']),
              getSwap: sceneSwap.run('get', swapped),
              setSwap: sceneSwap.run('set', [
                ...swapped,
                '--from',
                sceneSwap.writeFile('edit.md', 'new text'),
                '--mode',
                'apply',
              ]),
              delThread: sceneSwap.run('del', [
                '--pr',
                '7',
                '--key',
                'status',
                '--reply-to',
                '123456',
                '--mode',
                'apply',
              ]),
              getThread: sceneSwap.run('get', [
                '--pr',
                '7',
                '--key',
                'status',
                '--reply-to',
                '123456',
              ]),
              writes: sceneSwap.getWrites().length,
              kept: sceneSwap.getStore().comments.map((c) => c.id),
            };
          });
          then(
            'a wrong --kind exits 2 and names the right kind, never "absent — no-op"',
            () => {
              [result.delSwap, result.getSwap, result.setSwap].forEach(
                (one) => {
                  expect(one.exitCode).toBe(2);
                  expect(one.stdout).toContain(
                    `no review comment 1301, but issue comment 1301 sits on ${REPO}#7`,
                  );
                  expect(one.stdout).toContain('pass --kind issue');
                  expect(one.stdout).not.toContain('absent — no-op');
                },
              );
            },
          );
          then('an absent --reply-to thread exits 2 on del and get', () => {
            [result.delThread, result.getThread].forEach((one) => {
              expect(one.exitCode).toBe(2);
              expect(one.stdout).toContain(
                `no review comment 123456 on ${REPO} for --reply-to`,
              );
              expect(one.stdout).not.toContain('absent — no-op');
            });
          });
          then('naught is written, and the comment stands', () => {
            expect(result.writes).toBe(0);
            expect(result.kept).toEqual([1301]);
          });
          then('each refusal is snapped', () => {
            expect({
              delSwap: result.delSwap.stdout,
              getSwap: result.getSwap.stdout,
              setSwap: result.setSwap.stdout,
              delThread: result.delThread.stdout,
              getThread: result.getThread.stdout,
            }).toMatchSnapshot();
          });
        },
      );
    },
  );

  given('[case10] a read-back hash mismatch fails as a malfunction', () => {
    const scene = genScene({ ...SCENE_BARE, store: { rewrite: true } });
    when('[t0] github stores a different body than the one posted', () => {
      const result = useThen('it runs', async () =>
        scene.run('set', [
          '--pr',
          '7',
          '--key',
          'status',
          '--from',
          scene.writeFile('status.md', 'waves are up'),
          '--mode',
          'apply',
        ]),
      );
      then('it exits 1 and names both hashes', () => {
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('read-back hash mismatch');
        expect(result.stdout).toMatch(/posted sha256: +[0-9a-f]{64}/);
        expect(result.stdout).toMatch(/read-back sha256: [0-9a-f]{64}/);
        expect(result.stderr).toContain('MalfunctionError');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given(
    '[case11] every verb checks its input before any gh call, and shows --help',
    () => {
      const scene = genScene(SCENE_BARE);
      when('[t0] get, set, del each get --id with no --kind', () => {
        const result = useThen('they run', async () => ({
          get: scene.run('get', ['--pr', '7', '--id', '101']),
          set: scene.run('set', [
            '--pr',
            '7',
            '--id',
            '101',
            '--from',
            scene.writeFile('a.md', 'a'),
          ]),
          del: scene.run('del', ['--pr', '7', '--id', '101']),
        }));
        then(
          'each exits 2, says the kind is never guessed, calls no gh',
          () => {
            [result.get, result.set, result.del].forEach((one) => {
              expect(one.exitCode).toBe(2);
              expect(one.stdout).toContain('the kind is never guessed');
            });
            expect(scene.getCalls()).toEqual([]);
            expect({
              get: result.get.stdout,
              set: result.set.stdout,
              del: result.del.stdout,
            }).toMatchSnapshot();
          },
        );
      });
      when('[t1] get, set, del each get --help', () => {
        const result = useThen('they run', async () => ({
          get: scene.run('get', ['--help']),
          set: scene.run('set', ['--help']),
          del: scene.run('del', ['-h']),
        }));
        then('each exits 0 with usage, inputs, an example; calls no gh', () => {
          [result.get, result.set, result.del].forEach((one) => {
            expect(one.exitCode).toBe(0);
            expect(one.stdout).toContain('usage: rhx git.pull.comment.');
            expect(one.stdout).toContain('--auth');
            expect(one.stdout).toContain('example: rhx git.pull.comment.');
          });
          expect(scene.getCalls()).toEqual([]);
          expect({
            get: result.get.stdout,
            set: result.set.stdout,
            del: result.del.stdout,
          }).toMatchSnapshot();
        });
      });
      when('[t2] each check meets a bad input', () => {
        const bare = genScene({ ...SCENE_BARE, origin: null });
        const result = useThen('they run', async () => ({
          pr: scene.run('get', ['--pr', 'seven']),
          key: scene.run('del', ['--pr', '7', '--key', 'Round 2']),
          mode: scene.run('del', [
            '--pr',
            '7',
            '--key',
            'status',
            '--mode',
            'go',
          ]),
          output: scene.run('get', ['--pr', '7', '--output', 'yaml']),
          auth: scene.run('get', ['--pr', '7', '--auth', 'as-robot']),
          idAndKey: scene.run('del', [
            '--pr',
            '7',
            '--id',
            '101',
            '--kind',
            'issue',
            '--key',
            'status',
          ]),
          noRepo: bare.run('get', ['--pr', '7']),
        }));
        then(
          'each exits 2 with a ConstraintError and a fix; calls no gh',
          () => {
            Object.values(result).forEach((one) => {
              expect(one.exitCode).toBe(2);
              expect(one.stdout).toContain('✋ ConstraintError:');
              expect(one.stdout).toContain('🥥 did you know?');
              expect(one.stderr).toContain('ConstraintError');
            });
            expect(scene.getCalls()).toEqual([]);
            expect(bare.getCalls()).toEqual([]);
            expect(
              Object.fromEntries(
                Object.entries(result).map(([name, one]) => [name, one.stdout]),
              ),
            ).toMatchSnapshot();
          },
        );
      });
      when('[t3] each verb meets a flag set it cannot use', () => {
        const body = scene.writeFile('b.md', 'b');
        const result = useThen('they run', async () => ({
          getUnknownArg: scene.run('get', ['--pr', '7', '--wave']),
          getIdAndKey: scene.run('get', [
            '--pr',
            '7',
            '--id',
            '1',
            '--kind',
            'issue',
            '--key',
            'status',
          ]),
          getReplyNoKey: scene.run('get', ['--pr', '7', '--reply-to', '5']),
          getReplyNotNumber: scene.run('get', [
            '--pr',
            '7',
            '--key',
            'answer',
            '--reply-to',
            'x',
          ]),
          getKindNoId: scene.run('get', ['--pr', '7', '--kind', 'issue']),
          getBodyWithKey: scene.run('get', [
            '--pr',
            '7',
            '--kind',
            'body',
            '--key',
            'status',
          ]),
          getIdNotNumber: scene.run('get', [
            '--pr',
            '7',
            '--id',
            'abc',
            '--kind',
            'issue',
          ]),
          setUnknownArg: scene.run('set', ['--pr', '7', '--wave']),
          setNoFrom: scene.run('set', ['--pr', '7', '--key', 'status']),
          setKindNoId: scene.run('set', [
            '--pr',
            '7',
            '--kind',
            'issue',
            '--from',
            body,
          ]),
          setBodyWithKey: scene.run('set', [
            '--pr',
            '7',
            '--kind',
            'body',
            '--key',
            'status',
            '--from',
            body,
          ]),
          setIdWithKey: scene.run('set', [
            '--pr',
            '7',
            '--id',
            '1',
            '--kind',
            'issue',
            '--key',
            'status',
            '--from',
            body,
          ]),
          setKeyWithKind: scene.run('set', [
            '--pr',
            '7',
            '--key',
            'status',
            '--kind',
            'issue',
            '--from',
            body,
          ]),
          setReplyNotNumber: scene.run('set', [
            '--pr',
            '7',
            '--key',
            'answer',
            '--reply-to',
            'x',
            '--from',
            body,
          ]),
          delUnknownArg: scene.run('del', ['--pr', '7', '--wave']),
          delIdWithReply: scene.run('del', [
            '--pr',
            '7',
            '--id',
            '1',
            '--kind',
            'issue',
            '--reply-to',
            '5',
          ]),
          delKindNoId: scene.run('del', ['--pr', '7', '--kind', 'issue']),
          delNoTarget: scene.run('del', ['--pr', '7']),
          delReplyNotNumber: scene.run('del', [
            '--pr',
            '7',
            '--key',
            'answer',
            '--reply-to',
            'x',
          ]),
        }));
        then(
          'each exits 2 with a ConstraintError and a fix; calls no gh',
          () => {
            Object.values(result).forEach((one) => {
              expect(one.exitCode).toBe(2);
              expect(one.stdout).toContain('✋ ConstraintError:');
              expect(one.stdout).toContain('🥥 did you know?');
              expect(one.stderr).toContain('ConstraintError');
            });
            expect(scene.getCalls()).toEqual([]);
            expect(
              Object.fromEntries(
                Object.entries(result).map(([name, one]) => [name, one.stdout]),
              ),
            ).toMatchSnapshot();
          },
        );
      });
      when('[t4] a refusal under --output json', () => {
        const result = useThen('they run', async () => ({
          pr: scene.run('get', ['--pr', 'seven', '--output', 'json']),
          key: scene.run('del', [
            '--pr',
            '7',
            '--key',
            'Round 2',
            '--output',
            'json',
          ]),
        }));
        then(
          'stdout holds one json error object; stderr holds the tree',
          () => {
            [result.pr, result.key].forEach((one) => {
              expect(one.exitCode).toBe(2);
              const parsed: {
                error: { class: string; message: string; fixes: string[] };
              } = JSON.parse(one.stdout);
              expect(parsed.error.class).toBe('ConstraintError');
              expect(parsed.error.fixes).toHaveLength(1);
              expect(one.stderr).toContain('✋ ConstraintError:');
            });
            expect(scene.getCalls()).toEqual([]);
            expect({
              pr: JSON.parse(result.pr.stdout),
              key: JSON.parse(result.key.stdout),
            }).toMatchSnapshot();
          },
        );
      });
      when('[t5] a --flag at the end of the line, with no value', () => {
        const result = useThen('they run', async () => ({
          get: scene.run('get', ['--pr']),
          set: scene.run('set', ['--pr', '7', '--key', 'status', '--from']),
          del: scene.run('del', ['--pr', '7', '--key', 'status', '--mode']),
        }));
        then(
          'each exits 2, names the flag, and calls no gh; never a silent exit 1',
          () => {
            expect(result.get.stdout).toContain('--pr needs a value');
            expect(result.set.stdout).toContain('--from needs a value');
            expect(result.del.stdout).toContain('--mode needs a value');
            [result.get, result.set, result.del].forEach((one) => {
              expect(one.exitCode).toBe(2);
              expect(one.stderr).toContain('ConstraintError');
            });
            expect(scene.getCalls()).toEqual([]);
            expect({
              get: result.get.stdout,
              set: result.set.stdout,
              del: result.del.stdout,
            }).toMatchSnapshot();
          },
        );
      });
      when(
        '[t6] a --flag followed by a --flag, and the --flag=value form',
        () => {
          const result = useThen('they run', async () => ({
            swallowed: scene.run('get', ['--pr', '--kind', 'body']),
            unknownLast: scene.run('set', [
              '--pr',
              '7',
              '--key',
              'status',
              '--apply',
            ]),
            getEquals: scene.run('get', ['--pr=7', '--kind=body']),
            setEquals: scene.run('set', [
              '--pr=7',
              '--key=status',
              `--from=${scene.writeFile('status.md', 'surf is up')}`,
              '--mode=plan',
            ]),
          }));
          then('a --flag never swallows the next --flag as its value', () => {
            expect(result.swallowed.exitCode).toBe(2);
            expect(result.swallowed.stdout).toContain('--pr needs a value');
            expect(result.swallowed.stdout).toMatchSnapshot();
          });
          then(
            'an unknown --flag reads "unknown arg", never "needs a value"',
            () => {
              expect(result.unknownLast.exitCode).toBe(2);
              expect(result.unknownLast.stdout).toContain(
                "unknown arg '--apply'",
              );
              expect(result.unknownLast.stdout).not.toContain('needs a value');
              expect(result.unknownLast.stdout).toMatchSnapshot();
            },
          );
          then('--flag=value parses the same as --flag value', () => {
            expect(result.getEquals.exitCode).toBe(0);
            expect(result.getEquals.stdout).toContain('surf lesson booker');
            expect(result.setEquals.exitCode).toBe(0);
            expect(result.setEquals.stdout).toContain('would post (plan)');
            expect({
              getEquals: result.getEquals.stdout,
              setEquals: result.setEquals.stdout,
            }).toMatchSnapshot();
          });
        },
      );
    },
  );

  given('[case12] the target fences: the pr, and the home orgs', () => {
    when('[t0] an --id that sits on another pr', () => {
      const scene = genScene({
        ...SCENE_BARE,
        comments: [genComment({ id: 701, pr: 8 })],
      });
      const result = useThen('it runs', async () =>
        scene.run('set', [
          '--pr',
          '7',
          '--id',
          '701',
          '--kind',
          'issue',
          '--from',
          scene.writeFile('a.md', 'moved'),
          '--mode',
          'apply',
        ]),
      );
      then('it exits 2 and writes naught', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          `issue comment 701 is not on ${REPO}#7`,
        );
        expect(scene.getWrites()).toEqual([]);
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t1] --in names an owner outside the home orgs', () => {
      const scene = genScene(SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run('get', ['--pr', '7', '--in', 'seaturtlecorp/reef']),
      );
      then('it exits 2, names the allowlist, calls no gh', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          "owner 'seaturtlecorp' is outside the home orgs",
        );
        expect(result.stdout).toContain(
          'allowed: ehmpathy · whodisio · ahbode · uladkasach',
        );
        expect(scene.getCalls()).toEqual([]);
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t2] the cwd origin sits outside the home orgs', () => {
      const scene = genScene({
        ...SCENE_BARE,
        origin: 'https://github.com/seaturtlecorp/reef.git',
      });
      const result = useThen('it runs', async () =>
        scene.run('del', ['--pr', '7', '--key', 'status']),
      );
      then('it exits 2 and calls no gh', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain("owner 'seaturtlecorp'");
        expect(scene.getCalls()).toEqual([]);
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t3] --in names a home org in other case', () => {
      const scene = genScene(SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run('get', ['--pr', '7', '--in', 'Ehmpathy/surf-demo']),
      );
      then(
        'the fence lets it through, since github owners are case-blind',
        () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).not.toContain('outside the home orgs');
          expect(scene.getCalls().length).toBeGreaterThan(0);
          expect(result.stdout).toMatchSnapshot();
        },
      );
    });
    // set --id edits a known comment on the pr; [t4]..[t7] share one scene
    {
      const scene = genScene({
        ...SCENE_BARE,
        comments: [
          genComment({
            id: 711,
            body: asKeyedBody({ text: 'old status', key: 'status' }),
          }),
          genComment({ id: 712, author: LOGIN_HUMAN, body: 'mine' }),
        ],
      });
      const setById = (input: { id: string; text: string }) =>
        scene.run('set', [
          '--pr',
          '7',
          '--id',
          input.id,
          '--kind',
          'issue',
          '--from',
          scene.writeFile('edit.md', input.text),
          '--mode',
          'apply',
        ]);
      when('[t4] the comment is own, and the body differs', () => {
        const result = useThen('it runs', async () =>
          setById({ id: '711', text: 'new status' }),
        );
        then('it PATCHes that id, and keeps its key marker', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain(
            `endpoint: PATCH repos/${REPO}/issues/comments/711`,
          );
          expect(result.stdout).toContain('edited, read back, hash matches');
          expect(
            scene.getStore().comments.find((c) => c.id === 711)?.body,
          ).toEqual(asKeyedBody({ text: 'new status', key: 'status' }));
          expect(result.stdout).toMatchSnapshot();
        });
      });
      when('[t5] the comment already says this', () => {
        const result = useThen('it runs', async () => {
          const before = scene.getWrites().length;
          const run = setById({ id: '711', text: 'new status' });
          return { ...run, writesNew: scene.getWrites().length - before };
        });
        then('it is a no-op', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('already there — no-op');
          expect(result.writesNew).toBe(0);
          expect(result.stdout).toMatchSnapshot();
        });
      });
      when('[t6] the comment is by another author', () => {
        const result = useThen('it runs', async () => {
          const before = scene.getWrites().length;
          const run = setById({ id: '712', text: 'not yours' });
          return { ...run, writesNew: scene.getWrites().length - before };
        });
        then('it exits 2, names the author, writes naught', () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            `issue comment 712 is by ${LOGIN_HUMAN}`,
          );
          expect(result.stdout).toContain(
            `rerun with --auth as-human   # if ${LOGIN_HUMAN} is that login`,
          );
          expect(result.writesNew).toBe(0);
          expect(result.stdout).toMatchSnapshot();
        });
      });
      when('[t7] the id is absent', () => {
        const result = useThen('it runs', async () =>
          setById({ id: '799', text: 'ghost' }),
        );
        then('it exits 2 and names the list command', () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            `no issue comment 799 on ${REPO} to edit`,
          );
          expect(result.stdout).toMatchSnapshot();
        });
      });
    }
  });

  given(
    '[case13] get --pr reads the body, the issue rows, and the review rows',
    () => {
      const scene = genScene({
        ...SCENE_BARE,
        comments: [
          genComment({
            id: 801,
            author: LOGIN_HUMAN,
            body: 'lgtm?',
            created_at: '2026-10-24T00:00:03Z',
          }),
          genComment({
            id: 802,
            body: asKeyedBody({ text: 'status', key: 'status' }),
            created_at: '2026-10-24T00:00:05Z',
          }),
          genComment({
            id: 803,
            author: LOGIN_HUMAN,
            body: 'one more',
            created_at: '2026-10-24T00:00:07Z',
          }),
          genComment({
            id: 804,
            kind: 'review',
            author: LOGIN_HUMAN,
            body: 'why foamboard?',
            created_at: '2026-10-24T00:00:04Z',
          }),
          genComment({
            id: 805,
            kind: 'review',
            in_reply_to_id: 804,
            body: '🐢 beginners',
            created_at: '2026-10-24T00:00:06Z',
          }),
        ],
      });
      when('[t0] get --pr 7', () => {
        const result = useThen('it runs', async () =>
          scene.run('get', ['--pr', '7']),
        );
        then('it shows all six rows, every page', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain(
            'counts: 1 pr description, 3 issue comments, 2 review comments',
          );
          expect(result.stdout).toContain('key=status');
          expect(result.stdout).toContain('reply-to=804');
          expect(result.stdout).toMatchSnapshot();
        });
      });
      when('[t1] get --pr 7 --output json', () => {
        const result = useThen('it runs', async () =>
          scene.run('get', ['--pr', '7', '--output', 'json']),
        );
        then('the rows sort body first, then by created time', () => {
          expect(result.exitCode).toBe(0);
          const rows: { kind: string; id: number | null }[] = JSON.parse(
            result.stdout,
          );
          expect(rows.map((row) => row.id)).toEqual([
            null,
            801,
            804,
            802,
            805,
            803,
          ]);
          expect(rows[0]?.kind).toBe('body');
          expect(rows).toMatchSnapshot();
        });
      });
      when('[t2] get --pr 7 --key status', () => {
        const result = useThen('it runs', async () =>
          scene.run('get', [
            '--pr',
            '7',
            '--key',
            'status',
            '--output',
            'json',
          ]),
        );
        then('it returns the one own keyed row', () => {
          expect(result.exitCode).toBe(0);
          const rows: { id: number; key: string }[] = JSON.parse(result.stdout);
          expect(rows).toHaveLength(1);
          expect(rows[0]).toMatchObject({ id: 802, key: 'status' });
          expect(rows).toMatchSnapshot();
        });
      });
      when('[t3] get --pr 7 --id 805 --kind review', () => {
        const result = useThen('it runs', async () =>
          scene.run('get', ['--pr', '7', '--id', '805', '--kind', 'review']),
        );
        then('it shows the one row, with its thread', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain(
            'counts: 0 pr description, 0 issue comments, 1 review comments',
          );
          expect(result.stdout).toContain('review comment 805');
          expect(result.stdout).toContain('reply-to=804');
          expect(result.stdout).toMatchSnapshot();
        });
      });
      when('[t4] get --pr 7 --id 999 --kind issue, an absent id', () => {
        const result = useThen('it runs', async () =>
          scene.run('get', ['--pr', '7', '--id', '999', '--kind', 'issue']),
        );
        then('it exits 2 and names the list command', () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(`no issue comment 999 on ${REPO}`);
          expect(result.stdout).toContain('rhx git.pull.comment.get --pr 7');
          expect(result.stdout).toMatchSnapshot();
        });
      });
      when('[t5] get --pr 7 --key absent-key, a key no comment carries', () => {
        const result = useThen('it runs', async () =>
          scene.run('get', ['--pr', '7', '--key', 'absent-key']),
        );
        then('it exits 2 and names the list command, with the repo', () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            `no comment carries key 'absent-key' on ${REPO}#7`,
          );
          expect(result.stdout).toContain(
            `rhx git.pull.comment.get --pr 7 --in ${REPO}   # lists every row`,
          );
          expect(result.stdout).toMatchSnapshot();
        });
      });
      when(
        '[t7] get --in --auth as-human for an absent key, from the cwd of another repo',
        () => {
          const elsewhere = genScene({
            ...SCENE_BARE,
            token: null,
            origin: 'https://github.com/ehmpathy/other-reef.git',
          });
          const result = useThen('it runs', async () =>
            elsewhere.run('get', [
              '--pr',
              '7',
              '--in',
              REPO,
              '--key',
              'absent-key',
              '--auth',
              'as-human',
            ]),
          );
          then(
            'the fix names --in and --auth as-human, so a copy reaches the same target as the same login',
            () => {
              expect(result.exitCode).toBe(2);
              expect(result.stdout).toContain(
                `rhx git.pull.comment.get --pr 7 --in ${REPO} --auth as-human   # lists every row`,
              );
              expect(result.stdout).toMatchSnapshot();
            },
          );
        },
      );
      when('[t6] get --key answer --reply-to, scoped to one thread', () => {
        const threads = genScene({
          ...SCENE_BARE,
          comments: [
            genComment({
              id: 901,
              kind: 'review',
              author: LOGIN_HUMAN,
              body: 'why?',
            }),
            genComment({
              id: 902,
              kind: 'review',
              author: LOGIN_HUMAN,
              body: 'how?',
            }),
            genComment({
              id: 903,
              kind: 'review',
              in_reply_to_id: 901,
              body: asKeyedBody({ text: 'because', key: 'answer' }),
            }),
            genComment({
              id: 904,
              kind: 'review',
              in_reply_to_id: 902,
              body: asKeyedBody({ text: 'like so', key: 'answer' }),
            }),
          ],
        });
        const result = useThen('it runs', async () =>
          threads.run('get', [
            '--pr',
            '7',
            '--key',
            'answer',
            '--reply-to',
            '902',
            '--output',
            'json',
          ]),
        );
        then('it returns the keyed reply of thread 902 alone', () => {
          expect(result.exitCode).toBe(0);
          const rows: { id: number; in_reply_to: number }[] = JSON.parse(
            result.stdout,
          );
          expect(rows.map((row) => row.id)).toEqual([904]);
          expect(rows[0]?.in_reply_to).toBe(902);
          expect(rows).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case14] the pr description is no comment: set and del refuse it; the verbs dispatch as `git.pull.comment <verb>`',
    () => {
      const scene = genScene(SCENE_BARE);
      when('[t2] comment del --kind body', () => {
        const result = useThen('it runs', async () =>
          scene.run('del', ['--pr', '7', '--kind', 'body']),
        );
        then(
          'it exits 2: github offers no delete; the fix names the github ui',
          () => {
            expect(result.exitCode).toBe(2);
            expect(result.stdout).toContain(
              'github offers no delete for a pr description',
            );
            expect(result.stdout).toContain(
              'edit the pr description in the github ui',
            );
            expect(result.stdout).toMatchSnapshot();
          },
        );
      });
      when('[t4] comment set --kind body', () => {
        const result = useThen('it runs', async () => {
          const before = scene.getWrites().length;
          const run = scene.run('set', [
            '--pr',
            '7',
            '--kind',
            'body',
            '--from',
            scene.writeFile('pr.md', 'a new description'),
            '--mode',
            'apply',
          ]);
          return { ...run, writesNew: scene.getWrites().length - before };
        });
        then(
          'it exits 2: comment set writes comments only; the fix names the github ui',
          () => {
            expect(result.exitCode).toBe(2);
            expect(result.stdout).toContain('the pr description is no comment');
            expect(result.stdout).toContain(
              'edit the pr description in the github ui',
            );
            expect(result.writesNew).toBe(0);
            expect(result.stdout).toMatchSnapshot();
          },
        );
      });
      when('[t7] the verbs run as `git.pull.comment <verb>`', () => {
        const result = useThen('they run', async () => ({
          commentGet: scene.runPull('git.pull.comment', ['get', '--pr', '8']),
          commentGetDotted: scene.run('get', ['--pr', '8']),
          bare: scene.runPull('git.pull.comment', []),
          unknown: scene.runPull('git.pull.comment', ['put', '--pr', '7']),
          help: scene.runPull('git.pull.comment', ['--help']),
          verbHelp: scene.runPull('git.pull.comment', ['del', '--help']),
        }));
        then('the verb form and the dotted form print one output', () => {
          expect(result.commentGet.exitCode).toBe(0);
          expect(result.commentGet.stdout).toBe(result.commentGetDotted.stdout);
          expect(result.verbHelp.exitCode).toBe(0);
          expect(result.verbHelp.stdout).toContain(
            'usage: rhx git.pull.comment.del',
          );
        });
        then('an absent or unknown verb exits 2 and names the verbs', () => {
          expect(result.bare.exitCode).toBe(2);
          expect(result.bare.stdout).toContain('a verb is required');
          expect(result.unknown.exitCode).toBe(2);
          expect(result.unknown.stdout).toContain(
            "unknown verb 'put'; the verbs are get | set | del",
          );
          expect(result.help.exitCode).toBe(0);
          expect({
            bare: result.bare.stdout,
            unknown: result.unknown.stdout,
            help: result.help.stdout,
          }).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case18] del deletes only what the robot wrote; a human comment is refused',
    () => {
      const scene = genScene({
        ...SCENE_BARE,
        comments: [
          // typed by a human under the same login: no 🐢
          genComment({ id: 1801, body: 'thanks, will look tomorrow' }),
          // written by git.pull.comment.set: opens with 🐢
          genComment({ id: 1802, body: '🐢 fixed in the next push' }),
          // another author
          genComment({ id: 1803, author: LOGIN_HUMAN, body: 'please rename' }),
          // a review comment by the same login, typed by a human
          genComment({
            id: 1804,
            kind: 'review',
            body: 'nit: a space at the line end',
          }),
        ],
      });
      const del = (id: number, kind: 'issue' | 'review') =>
        scene.run('del', [
          '--pr',
          '7',
          '--id',
          String(id),
          '--kind',
          kind,
          '--mode',
          'apply',
        ]);
      when('[t0] del each, under --mode apply', () => {
        const result = useThen('they run', async () => {
          const human = del(1801, 'issue');
          const humanReview = del(1804, 'review');
          const foreign = del(1803, 'issue');
          const writesAfterRefusals = scene.getWrites().length;
          const robot = del(1802, 'issue');
          return {
            human,
            humanReview,
            foreign,
            robot,
            writesAfterRefusals,
            ids: scene.getStore().comments.map((c) => c.id),
          };
        });
        then(
          'a human-typed comment by the same login exits 2, no DELETE',
          () => {
            [result.human, result.humanReview].forEach((one) => {
              expect(one.exitCode).toBe(2);
              expect(one.stdout).toContain("is a human's comment");
              expect(one.stderr).toContain("is a human's comment");
            });
            expect(result.writesAfterRefusals).toBe(0);
          },
        );
        then('another author comment exits 2, no DELETE', () => {
          expect(result.foreign.exitCode).toBe(2);
          expect(result.foreign.stdout).toContain(
            `issue comment 1803 is by ${LOGIN_HUMAN}`,
          );
        });
        then('the 🐢 comment the robot wrote is deleted and confirmed', () => {
          expect(result.robot.exitCode).toBe(0);
          expect(result.robot.stdout).toContain('deleted, confirmed absent');
          expect(result.ids).toEqual([1801, 1803, 1804]);
          expect({
            human: result.human.stdout,
            humanReview: result.humanReview.stdout,
            robot: result.robot.stdout,
          }).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case19] get reads every review thread, open and resolved, and names which',
    () => {
      const scene = genScene({
        ...SCENE_BARE,
        store: { resolved: [1901] },
        comments: [
          genComment({
            id: 1901,
            kind: 'review',
            author: LOGIN_HUMAN,
            body: 'resolved: rename this',
          }),
          genComment({
            id: 1902,
            kind: 'review',
            author: LOGIN_SELF,
            body: '🐢 renamed',
            in_reply_to_id: 1901,
          }),
          genComment({
            id: 1903,
            kind: 'review',
            author: LOGIN_HUMAN,
            body: 'open: why this default?',
          }),
          genComment({ id: 1904, author: LOGIN_HUMAN, body: 'top-level ask' }),
        ],
      });
      when('[t0] get --pr 7, tree and json', () => {
        const result = useThen('they run', async () => ({
          tree: scene.run('get', ['--pr', '7']),
          json: scene.run('get', ['--pr', '7', '--output', 'json']),
        }));
        then('each review row names its thread: resolved or open', () => {
          expect(result.json.exitCode).toBe(0);
          const rows: {
            id: number | null;
            kind: string;
            thread: string | null;
          }[] = JSON.parse(result.json.stdout);
          const threadOf = (id: number) =>
            rows.find((row) => row.id === id)?.thread;
          expect(threadOf(1901)).toBe('resolved');
          expect(threadOf(1902)).toBe('resolved');
          expect(threadOf(1903)).toBe('open');
          expect(threadOf(1904)).toBeNull();
          expect(rows.filter((row) => row.kind === 'review')).toHaveLength(3);
        });
        then('the tree shows both states', () => {
          expect(result.tree.exitCode).toBe(0);
          expect(result.tree.stdout).toContain('thread=resolved');
          expect(result.tree.stdout).toContain('thread=open');
          expect(result.tree.stdout).toMatchSnapshot();
        });
      });
    },
  );

  given('[case15] auth: as-ehmpath needs a token; as-human strips them', () => {
    when('[t0] as-ehmpath with no token reachable', () => {
      const scene = genScene({ ...SCENE_BARE, token: null });
      const result = useThen('it runs', async () =>
        scene.run('get', ['--pr', '7']),
      );
      then('it exits 2, names both fixes, calls no gh', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('ehmpath keyrack token not available');
        expect(result.stdout).toContain(
          'rhx keyrack unlock --owner ehmpath --env prep',
        );
        expect(result.stdout).toContain('--auth as-human');
        expect(scene.getCalls()).toEqual([]);
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t1] as-ehmpath with the token', () => {
      const scene = genScene(SCENE_BARE);
      const result = useThen('it runs', async () =>
        scene.run('get', ['--pr', '7', '--kind', 'body']),
      );
      then('gh runs with GH_TOKEN set to the keyrack token', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          `as-ehmpath (ehmpath keyrack) as ${LOGIN_SELF}`,
        );
        const calls = scene.getCalls();
        expect(calls.length).toBeGreaterThan(0);
        calls.forEach((call) => expect(call.ghToken).toBe('fake-token'));
        expect(result.stdout).toMatchSnapshot();
      });
    });
    when('[t2] as-human, with stray tokens in the shell', () => {
      const scene = genScene({ ...SCENE_BARE, token: null });
      const result = useThen('it runs', async () =>
        scene.run(
          'get',
          ['--pr', '7', '--kind', 'body', '--auth', 'as-human'],
          { env: { GH_TOKEN: 'stray', GITHUB_TOKEN: 'stray' } },
        ),
      );
      then(
        'gh runs with GH_TOKEN and GITHUB_TOKEN unset, under the human login',
        () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain(
            `as-human (gh cli login, fallback) as ${LOGIN_HUMAN}`,
          );
          const calls = scene.getCalls();
          expect(calls.length).toBeGreaterThan(0);
          calls.forEach((call) => {
            expect(call.hasGhToken).toBe(false);
            expect(call.hasGithubToken).toBe(false);
          });
          expect(result.stdout).toMatchSnapshot();
        },
      );
    });
    when('[t3] github fails the call: 401, 403, a rate limit, a 5xx', () => {
      const runWithFail = (fail: string, extra: string[]) =>
        genScene({ ...SCENE_BARE, store: { fail } }).run('get', [
          '--pr',
          '7',
          '--kind',
          'body',
          ...extra,
        ]);
      const result = useThen('they run', async () => ({
        unauthorized: runWithFail('gh: Bad credentials (HTTP 401)', []),
        forbidden: runWithFail(
          'gh: Resource not accessible by integration (HTTP 403)',
          [],
        ),
        rateLimited: runWithFail(
          'gh: API rate limit exceeded for user ID 1 (HTTP 403)',
          [],
        ),
        serverError: runWithFail('gh: Server Error (HTTP 502)', []),
        unauthorizedJson: runWithFail('gh: Bad credentials (HTTP 401)', [
          '--output',
          'json',
        ]),
      }));
      then('a credential refusal or a 403 is exit 2 with a fix', () => {
        expect(result.unauthorized.exitCode).toBe(2);
        expect(result.unauthorized.stdout).toContain(
          'github refused the credential (as-ehmpath)',
        );
        expect(result.unauthorized.stdout).toContain(
          'rhx keyrack fill --owner ehmpath --env prep --key EHMPATHY_SEATURTLE_GITHUB_TOKEN --refresh',
        );
        expect(result.unauthorized.stdout).toContain(
          'rerun with --auth as-human',
        );
        expect(result.forbidden.exitCode).toBe(2);
        expect(result.forbidden.stdout).toContain('github forbade');
      });
      then(
        'a rate limit or a 5xx is exit 1, a malfunction a retry may help',
        () => {
          [result.rateLimited, result.serverError].forEach((one) => {
            expect(one.exitCode).toBe(1);
            expect(one.stdout).toContain('💥 MalfunctionError:');
            expect(one.stderr).toContain('MalfunctionError');
          });
        },
      );
      then('under --output json, the refusal is one json object', () => {
        expect(result.unauthorizedJson.exitCode).toBe(2);
        const parsed: { error: { class: string } } = JSON.parse(
          result.unauthorizedJson.stdout,
        );
        expect(parsed.error.class).toBe('ConstraintError');
      });
      then('each refusal is snapped', () => {
        expect({
          unauthorized: result.unauthorized.stdout,
          forbidden: result.forbidden.stdout,
          rateLimited: result.rateLimited.stdout,
          serverError: result.serverError.stdout,
          unauthorizedJson: JSON.parse(result.unauthorizedJson.stdout),
        }).toMatchSnapshot();
      });
    });
    when(
      '[t4] an app token: the login and its comments differ by [bot]',
      () => {
        // a ghs_ app token can read its viewer as 'slug' while its comments read 'slug[bot]', or the reverse
        const keyed = asKeyedBody({ text: 'bot status', key: 'status' });
        const result = useThen('they run', async () => {
          const authorBot = genScene({
            ...SCENE_BARE,
            comments: [
              genComment({
                id: 1101,
                author: `${LOGIN_SELF}[bot]`,
                body: keyed,
              }),
            ],
          });
          const viewerBot = genScene({
            ...SCENE_BARE,
            comments: [
              genComment({ id: 1102, author: LOGIN_SELF, body: keyed }),
            ],
            store: { loginSelf: `${LOGIN_SELF}[bot]` },
          });
          const setSame = (scene: ReturnType<typeof genScene>) => {
            const run = scene.run('set', [
              '--pr',
              '7',
              '--key',
              'status',
              '--from',
              scene.writeFile('status.md', 'bot status'),
              '--mode',
              'apply',
            ]);
            return { ...run, writes: scene.getWrites().length };
          };
          return {
            authorBot: setSame(authorBot),
            viewerBot: setSame(viewerBot),
          };
        });
        then(
          'the key matches as own both ways: a no-op, never a foreign refusal',
          () => {
            [result.authorBot, result.viewerBot].forEach((one) => {
              expect(one.exitCode).toBe(0);
              expect(one.stdout).toContain('already there — no-op');
              expect(one.stdout).not.toContain('held by');
              expect(one.writes).toBe(0);
            });
            expect({
              authorBot: result.authorBot.stdout,
              viewerBot: result.viewerBot.stdout,
            }).toMatchSnapshot();
          },
        );
      },
    );
    when('[t5] as-ehmpath with a token in the env, none in keyrack', () => {
      const scene = genScene({ ...SCENE_BARE, token: null });
      const result = useThen('it runs', async () =>
        scene.run('get', ['--pr', '7', '--kind', 'body'], {
          env: { EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'env-token' },
        }),
      );
      then('gh runs with GH_TOKEN set to the env token', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          `as-ehmpath (env EHMPATHY_SEATURTLE_GITHUB_TOKEN) as ${LOGIN_SELF}`,
        );
        const calls = scene.getCalls();
        expect(calls.length).toBeGreaterThan(0);
        calls.forEach((call) => expect(call.ghToken).toBe('env-token'));
        expect(result.stdout).toMatchSnapshot();
      });
      then(
        'a refused env token names the env var, never a keyrack unlock',
        () => {
          const refused = genScene({
            ...SCENE_BARE,
            token: null,
            store: { fail: 'gh: Bad credentials (HTTP 401)' },
          }).run('get', ['--pr', '7', '--kind', 'body'], {
            env: { EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'stale-token' },
          });
          expect(refused.exitCode).toBe(2);
          expect(refused.stdout).toContain(
            'unset EHMPATHY_SEATURTLE_GITHUB_TOKEN, then rerun',
          );
          expect(refused.stdout).not.toContain('rhx keyrack');
          expect(refused.stdout).toMatchSnapshot();
        },
      );
    });
    when('[t6] github fails a write: POST 422, PATCH 404, DELETE 404', () => {
      const own = genComment({
        id: 1201,
        author: LOGIN_SELF,
        body: asKeyedBody({ text: 'old status', key: 'status' }),
      });
      const result = useThen('they run', async () => {
        const postScene = genScene({
          ...SCENE_BARE,
          store: {
            fail: 'gh: Validation Failed (HTTP 422)',
            failMethod: 'POST',
          },
        });
        const post = postScene.run('set', [
          '--pr',
          '7',
          '--key',
          'status',
          '--from',
          postScene.writeFile('status.md', 'new status'),
          '--mode',
          'apply',
        ]);
        const patchScene = genScene({
          ...SCENE_BARE,
          comments: [own],
          store: { fail: 'gh: Not Found (HTTP 404)', failMethod: 'PATCH' },
        });
        const patch = patchScene.run('set', [
          '--pr',
          '7',
          '--key',
          'status',
          '--from',
          patchScene.writeFile('status.md', 'new status'),
          '--mode',
          'apply',
        ]);
        const delScene = genScene({
          ...SCENE_BARE,
          comments: [own],
          store: { fail: 'gh: Not Found (HTTP 404)', failMethod: 'DELETE' },
        });
        const del = delScene.run('del', [
          '--pr',
          '7',
          '--id',
          '1201',
          '--kind',
          'issue',
          '--mode',
          'apply',
        ]);
        return { post, patch, del };
      });
      then('a POST 422 is exit 2 and points at the detail', () => {
        expect(result.post.exitCode).toBe(2);
        expect(result.post.stdout).toContain(
          'github refused the payload on POST',
        );
        expect(result.post.stdout).toContain('detail: gh: Validation Failed');
      });
      then('a PATCH 404 is exit 2 and names the target', () => {
        expect(result.patch.exitCode).toBe(2);
        expect(result.patch.stdout).toContain('github answered 404 on PATCH');
      });
      then('a DELETE 404 converges: exit 0, a no-op', () => {
        expect(result.del.exitCode).toBe(0);
        expect(result.del.stdout).toContain(
          'absent — no-op (gone before the DELETE)',
        );
      });
      then('each is snapped', () => {
        expect({
          post: result.post.stdout,
          patch: result.patch.stdout,
          del: result.del.stdout,
        }).toMatchSnapshot();
      });
    });
    when('[t7] a body over github cap of 65536 characters', () => {
      const scene = genScene(SCENE_BARE);
      const result = useThen('it runs in plan and apply', async () => {
        const from = scene.writeFile('huge.md', '🌊'.repeat(65600));
        const run = (mode: string) =>
          scene.run('set', [
            '--pr',
            '7',
            '--key',
            'status',
            '--from',
            from,
            '--mode',
            mode,
          ]);
        return {
          plan: run('plan'),
          apply: run('apply'),
          writes: scene.getWrites().length,
        };
      });
      then('plan and apply each exit 2 before any write', () => {
        [result.plan, result.apply].forEach((one) => {
          expect(one.exitCode).toBe(2);
          expect(one.stdout).toContain(
            'github caps a comment or pr description at 65536',
          );
        });
        expect(result.writes).toBe(0);
        expect({
          plan: result.plan.stdout,
          apply: result.apply.stdout,
        }).toMatchSnapshot();
      });
    });
    when(
      '[t8] as-human writes: a thread reply, the mirror refusal, a thread-foreign key, logged out',
      () => {
        const root = genComment({
          id: 531,
          kind: 'review',
          author: LOGIN_HUMAN,
        });
        const result = useThen('they run', async () => {
          // a thread reply under the human's own gh login, then a re-run
          const sceneReply = genScene({
            ...SCENE_BARE,
            token: null,
            comments: [root],
          });
          const reply = [
            '--pr',
            '7',
            '--reply-to',
            '531',
            '--key',
            'answer',
            '--from',
            sceneReply.writeFile('answer.md', 'cowabunga, fixed'),
            '--auth',
            'as-human',
            '--mode',
            'apply',
          ];
          const posted = sceneReply.run('set', reply);
          const again = sceneReply.run('set', reply);
          const replyStore = sceneReply.getStore();
          const replyCalls = sceneReply.getCalls();

          // the bot holds the key, and the human asks for it
          const sceneMirror = genScene({
            ...SCENE_BARE,
            token: null,
            comments: [
              genComment({
                id: 541,
                author: LOGIN_SELF,
                body: asKeyedBody({ text: 'bot status', key: 'status' }),
              }),
            ],
          });
          const mirror = sceneMirror.run('set', [
            '--pr',
            '7',
            '--key',
            'status',
            '--from',
            sceneMirror.writeFile('status.md', 'human status'),
            '--auth',
            'as-human',
            '--mode',
            'apply',
          ]);

          // the human holds a reply key in a thread, and the bot asks for it
          const sceneThread = genScene({
            ...SCENE_BARE,
            comments: [
              root,
              genComment({
                id: 532,
                kind: 'review',
                author: LOGIN_HUMAN,
                in_reply_to_id: 531,
                body: asKeyedBody({ text: 'human answer', key: 'answer' }),
              }),
            ],
          });
          const threadForeign = sceneThread.run('set', [
            '--pr',
            '7',
            '--reply-to',
            '531',
            '--key',
            'answer',
            '--from',
            sceneThread.writeFile('answer.md', 'bot answer'),
            '--mode',
            'apply',
          ]);

          // as-human with gh logged out
          const loggedOut = genScene({
            ...SCENE_BARE,
            token: null,
            store: {
              fail: 'To get started with GitHub CLI, please run:  gh auth login',
              failMethod: 'GRAPHQL',
            },
          }).run('get', ['--pr', '7', '--auth', 'as-human']);

          return {
            posted,
            again,
            replyStore,
            replyCalls,
            mirror,
            mirrorWrites: sceneMirror.getWrites().length,
            threadForeign,
            threadWrites: sceneThread.getWrites().length,
            loggedOut,
          };
        });
        then(
          'the reply posts under the human login, in the thread, with the 🐢 and the key',
          () => {
            expect(result.posted.exitCode).toBe(0);
            expect(result.posted.stdout).toContain(
              `as-human (gh cli login, fallback) as ${LOGIN_HUMAN}`,
            );
            const made = result.replyStore.comments.find((c) => c.id !== 531);
            expect(made?.author).toBe(LOGIN_HUMAN);
            expect(made?.in_reply_to_id).toBe(531);
            expect(made?.body.startsWith('🐢 cowabunga, fixed')).toBe(true);
            expect(made?.body).toContain(
              '<!-- rhx:git.pull.comment key=answer -->',
            );
            result.replyCalls.forEach((call) =>
              expect(call.hasGhToken).toBe(false),
            );
          },
        );
        then('a re-run under the same login is a no-op', () => {
          expect(result.again.exitCode).toBe(0);
          expect(result.again.stdout).toContain('already there — no-op');
          expect(result.replyStore.comments).toHaveLength(2);
        });
        then(
          'a bot-held key refuses the human and names --auth as-ehmpath',
          () => {
            expect(result.mirror.exitCode).toBe(2);
            expect(result.mirror.stdout).toContain(`held by ${LOGIN_SELF}`);
            expect(result.mirror.stdout).toContain('--auth as-ehmpath');
            expect(result.mirrorWrites).toBe(0);
          },
        );
        then(
          'a human-held thread key refuses the bot and names the review reply',
          () => {
            expect(result.threadForeign.exitCode).toBe(2);
            expect(result.threadForeign.stdout).toContain(
              `held by ${LOGIN_HUMAN}`,
            );
            expect(result.threadForeign.stdout).toContain(
              '--id 532 --kind review --auth as-human',
            );
            expect(result.threadWrites).toBe(0);
          },
        );
        then('logged out, as-human names gh auth login', () => {
          expect(result.loggedOut.exitCode).toBe(2);
          expect(result.loggedOut.stdout).toContain(
            'github refused the credential (as-human)',
          );
          expect(result.loggedOut.stdout).toContain('gh auth login');
        });
        then('each output is snapped', () => {
          expect({
            posted: result.posted.stdout,
            again: result.again.stdout,
            mirror: result.mirror.stdout,
            threadForeign: result.threadForeign.stdout,
            loggedOut: result.loggedOut.stdout,
          }).toMatchSnapshot();
        });
      },
    );
  });

  given('[case16] the apply json, the keyed tree reads, and the edges', () => {
    when(
      '[t0] set, then del, then del again, each under --mode apply --output json',
      () => {
        const scene = genScene(SCENE_BARE);
        const result = useThen('they run', async () => {
          const set = scene.run('set', [
            '--pr',
            '7',
            '--key',
            'status',
            '--from',
            scene.writeFile('status.md', 'waves are up\n'),
            '--mode',
            'apply',
            '--output',
            'json',
          ]);
          const del = scene.run('del', [
            '--pr',
            '7',
            '--key',
            'status',
            '--mode',
            'apply',
            '--output',
            'json',
          ]);
          const again = scene.run('del', [
            '--pr',
            '7',
            '--key',
            'status',
            '--mode',
            'apply',
            '--output',
            'json',
          ]);
          return { set, del, again };
        });
        then('set names the new id, its url, and the read-back hash', () => {
          expect(result.set.exitCode).toBe(0);
          const out = JSON.parse(result.set.stdout);
          expect(out.mode).toBe('apply');
          expect(out.method).toBe('POST');
          expect(out.id).toBe(5001);
          expect(out.url).toContain('issuecomment-5001');
          expect(out.sha256.readback).toBe(out.sha256.new);
        });
        then('del names the id it deleted, confirmed absent', () => {
          expect(result.del.exitCode).toBe(0);
          const out = JSON.parse(result.del.stdout);
          expect(out.mode).toBe('apply');
          expect(out.id).toBe(5001);
          expect(out.verdict).toContain('deleted, confirmed absent');
          expect(scene.getStore().comments).toEqual([]);
        });
        then('del again is a no-op, with a null id and endpoint', () => {
          expect(result.again.exitCode).toBe(0);
          const out = JSON.parse(result.again.stdout);
          expect(out.verdict).toContain('no-op');
          expect(out.id).toBeNull();
        });
        then('each json is snapped', () => {
          expect({
            set: JSON.parse(result.set.stdout),
            del: JSON.parse(result.del.stdout),
            again: JSON.parse(result.again.stdout),
          }).toMatchSnapshot();
        });
      },
    );
    when('[t1] get --key, and get --key --reply-to, in the tree render', () => {
      const scene = genScene({
        ...SCENE_BARE,
        comments: [
          genComment({
            id: 161,
            body: asKeyedBody({ text: 'waves are up', key: 'status' }),
          }),
          genComment({ id: 162, kind: 'review', author: LOGIN_HUMAN }),
          genComment({
            id: 163,
            kind: 'review',
            in_reply_to_id: 162,
            body: asKeyedBody({ text: 'fixed in 3a1f', key: 'answer' }),
          }),
        ],
      });
      const result = useThen('they run', async () => ({
        key: scene.run('get', ['--pr', '7', '--key', 'status']),
        reply: scene.run('get', [
          '--pr',
          '7',
          '--key',
          'answer',
          '--reply-to',
          '162',
        ]),
      }));
      then('each names its target and its one row', () => {
        expect(result.key.exitCode).toBe(0);
        expect(result.key.stdout).toContain('top-level comment key=status');
        expect(result.key.stdout).toContain('issue comment 161');
        expect(result.reply.exitCode).toBe(0);
        expect(result.reply.stdout).toContain(
          'reply to review comment 162, key=answer',
        );
        expect(result.reply.stdout).toContain('review comment 163');
        expect({
          key: result.key.stdout,
          reply: result.reply.stdout,
        }).toMatchSnapshot();
      });
    });
    when('[t2] get on a pr with an empty description and no comments', () => {
      const scene = genScene({
        ...SCENE_BARE,
        store: {
          prs: {
            '9': {
              title: 'chore(empty): a pull with no description',
              body: '',
              author: LOGIN_HUMAN,
              created_at: '2026-10-24T00:00:03Z',
            },
          },
        },
      });
      const result = useThen('it runs', async () =>
        scene.run('get', ['--pr', '9']),
      );
      then(
        'it counts the description alone, and marks its text (empty)',
        () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain(
            '1 pr description, 0 issue comments, 0 review comments',
          );
          expect(result.stdout).toContain('(empty)');
          expect(result.stdout).toMatchSnapshot();
        },
      );
    });
    when('[t3] the graphql viewer answers with no login', () => {
      const scene = genScene({ ...SCENE_BARE, store: { loginSelf: '' } });
      const result = useThen('it runs', async () =>
        scene.run('get', ['--pr', '7']),
      );
      then('it fails as a malfunction, exit 1, before any rest call', () => {
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain(
          '💥 MalfunctionError: graphql viewer returned no login',
        );
        expect(
          scene.getCalls().filter((call) => call.argv[1] !== 'graphql'),
        ).toEqual([]);
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given(
    '[case17] a review comment edited in place, and two writes gone astray',
    () => {
      /**
       * .what = the PATCH calls of a scene, by endpoint
       */
      const getPatchEndpoints = (calls: Call[]): string[] =>
        calls
          .filter(
            (call) => call.argv[call.argv.indexOf('--method') + 1] === 'PATCH',
          )
          .map(
            (call) =>
              call.argv
                .slice(1)
                .filter(
                  (a, i, all) =>
                    !a.startsWith('--') &&
                    all[i - 1] !== '--method' &&
                    all[i - 1] !== '--input',
                )[0] ?? '',
          );

      when('[t0] a keyed reply whose text differs is set again', () => {
        const scene = genScene({
          ...SCENE_BARE,
          comments: [
            genComment({ id: 171, kind: 'review', author: LOGIN_HUMAN }),
            genComment({
              id: 172,
              kind: 'review',
              in_reply_to_id: 171,
              body: asKeyedBody({ text: 'fixed in 3a1f', key: 'answer' }),
            }),
          ],
        });
        const result = useThen('it runs', async () =>
          scene.run('set', [
            '--pr',
            '7',
            '--reply-to',
            '171',
            '--key',
            'answer',
            '--from',
            scene.writeFile('answer.md', 'fixed in 9c2e\n'),
            '--mode',
            'apply',
          ]),
        );
        then('it PATCHes the reply in place and reads it back', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('edited, read back, hash matches');
          expect(getPatchEndpoints(scene.getCalls())).toEqual([
            `repos/${REPO}/pulls/comments/172`,
          ]);
          expect(scene.getStore().comments.map((c) => c.id)).toEqual([
            171, 172,
          ]);
          expect(
            scene.getStore().comments.find((c) => c.id === 172)?.body,
          ).toEqual(asKeyedBody({ text: 'fixed in 9c2e', key: 'answer' }));
          expect(result.stdout).toMatchSnapshot();
        });
      });
      when(
        '[t1] set --id --kind review --mode apply edits a known review comment',
        () => {
          const scene = genScene({
            ...SCENE_BARE,
            comments: [
              genComment({ id: 173, kind: 'review', body: '🐢 old note' }),
            ],
          });
          const result = useThen('it runs', async () =>
            scene.run('set', [
              '--pr',
              '7',
              '--id',
              '173',
              '--kind',
              'review',
              '--from',
              scene.writeFile('note.md', 'new note\n'),
              '--mode',
              'apply',
            ]),
          );
          then('it PATCHes the review endpoint and reads it back', () => {
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('edited, read back, hash matches');
            expect(getPatchEndpoints(scene.getCalls())).toEqual([
              `repos/${REPO}/pulls/comments/173`,
            ]);
            expect(scene.getStore().comments[0]?.body).toEqual('🐢 new note');
            expect(result.stdout).toMatchSnapshot();
          });
        },
      );
      when('[t2] github answers a POST with no id', () => {
        const scene = genScene({ ...SCENE_BARE, store: { noId: true } });
        const result = useThen('it runs', async () =>
          scene.run('set', [
            '--pr',
            '7',
            '--key',
            'status',
            '--from',
            scene.writeFile('status.md', 'waves are up\n'),
            '--mode',
            'apply',
          ]),
        );
        then(
          'it fails as a malfunction, names the state, and says a rerun converges',
          () => {
            expect(result.exitCode).toBe(1);
            expect(result.stdout).toContain('returned no id');
            expect(result.stdout).toContain('state: the write may have landed');
            expect(result.stdout).toContain('rerun the same command');
            expect(result.stdout).toMatchSnapshot();
          },
        );
      });
      when('[t3] github answers a POST yet never holds the comment', () => {
        const scene = genScene({ ...SCENE_BARE, store: { dropWrite: true } });
        const result = useThen('it runs', async () =>
          scene.run('set', [
            '--pr',
            '7',
            '--key',
            'status',
            '--from',
            scene.writeFile('status.md', 'waves are up\n'),
            '--mode',
            'apply',
          ]),
        );
        then(
          'it fails as a malfunction on the read-back, and says a rerun converges',
          () => {
            expect(result.exitCode).toBe(1);
            expect(result.stdout).toContain('the write is absent on read-back');
            expect(result.stdout).toContain('rerun the same command');
            expect(result.stdout).toMatchSnapshot();
          },
        );
      });
    },
  );
});
