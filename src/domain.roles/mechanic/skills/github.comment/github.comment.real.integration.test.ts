import { spawnSync } from 'child_process';
import * as fs from 'fs';
import { ConstraintError, MalfunctionError } from 'helpful-errors';
import * as os from 'os';
import * as path from 'path';
import { getError, given, then, useThen, when } from 'test-fns';

/**
 * .what = the one real-api case for github.comment.get | set | del
 * .why  = the stub suite proves the contract against a stub gh; this case
 *         proves the stub matches github: the endpoints, the marker kept
 *         byte for byte across a POST and a PATCH, the read-back hash, the delete
 *
 * .note = the target is a closed pr in a home-org repo, so a post interrupts
 *         no open review; the pr's watchers still get one notification per
 *         run. no home-org test repo holds a pr to aim at, and the
 *         verbs need one; REPO and PR move together once one does
 * .note = each run owns a key of its own (KEY_PREFIX + a run id), so two runs
 *         at once never touch each other's comment. a run that died mid-way
 *         leaves its comment behind; the next run sweeps every prefixed key
 *         older than an hour — old enough that no live run still holds it
 * .note = the pr body PATCH runs as a round trip: append one marker line,
 *         then restore the body read before it, and prove the restored hash
 *         equals the original. a run that dies between the two leaves the
 *         marker line; the next run strips it from what it reads as original
 * .note = each live output is snapped after its volatile bytes (ids, urls,
 *         hashes, times, the run key) are masked, so the real shape is under
 *         snapshot beside the stub suite's
 * .note = every verb runs `--auth as-human`: the gh cli login of the seat
 *         that runs the suite. on a human's machine, their own login; in ci,
 *         the job's own GITHUB_TOKEN, logged into an isolated gh config dir
 *         by the workflow (.test.yml, step "gh login (isolated, …)").
 *         no login → fail loud, never skip
 */
describe('github.comment (real github api)', () => {
  const REPO = 'ehmpathy/rhachet-roles-ehmpathy';
  const PR = '1039';
  const KEY_PREFIX = 'rhx-real-api-case-';
  const KEY = `${KEY_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const STALE_AFTER_MS = 60 * 60 * 1000;
  const repoRoot = path.join(__dirname, '../../../../..');

  /**
   * .what = confirm a gh cli login is present, or throw a loud ConstraintError
   * .why  = as-human reads only the gh login (it strips GH_TOKEN), so the
   *         case cannot run without one
   */
  const assertGhLogin = (input: { env: NodeJS.ProcessEnv }): void => {
    const {
      GH_TOKEN: _ghToken,
      GITHUB_TOKEN: _githubToken,
      ...env
    } = input.env;
    const status = spawnSync('gh', ['auth', 'status'], {
      encoding: 'utf-8',
      env,
    });
    if (status.status === 0) return;
    throw new ConstraintError('gh login required for the real-api case', {
      detail: status.stderr || status.stdout,
      hint: 'gh auth login   # on a human seat; in ci, the "gh login" step of .test.yml',
    });
  };

  /**
   * .what = the env the case runs gh under
   * .why  = ci logs the job token into an isolated gh config dir, named by
   *         GITHUB_COMMENT_REAL_API_GH_CONFIG_DIR, so no other suite sees a
   *         login; a human seat names none and runs under its own gh login
   */
  const getEnvOfCase = (): NodeJS.ProcessEnv => {
    const configDir = process.env.GITHUB_COMMENT_REAL_API_GH_CONFIG_DIR;
    if (!configDir) return process.env;
    return { ...process.env, GH_CONFIG_DIR: configDir };
  };

  /**
   * .what = run one verb against the real api under the seat's gh login
   */
  const run = (verb: 'get' | 'set' | 'del', args: string[], stdin?: string) => {
    const env = getEnvOfCase();
    assertGhLogin({ env });
    const result = spawnSync(
      'bash',
      [
        path.join(__dirname, `github.comment.${verb}.sh`),
        '--in',
        REPO,
        '--pr',
        PR,
        '--auth',
        'as-human',
        ...args,
      ],
      {
        cwd: repoRoot,
        encoding: 'utf-8',
        input: stdin ?? '',
        env,
      },
    );
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  /**
   * .what = the login the token acts as, read from the get tree's auth line
   * .why  = the sweep deletes only this login's litter, so a foreign leftover
   *         never trips the author check and turns the case red
   */
  const getLoginOfToken = (): string => {
    const read = run('get', ['--kind', 'body']);
    const login = read.stdout.match(/├─ auth: .* as (\S+)/)?.[1];
    if (!login)
      throw new MalfunctionError(
        'the login read of the real-api token failed',
        {
          exitCode: read.exitCode,
          detail: read.stderr || read.stdout,
        },
      );
    return login;
  };

  /**
   * .what = delete every prefixed comment a dead run left, older than an hour
   * .why  = a run that died between set and del must not leave litter forever
   */
  const sweepStaleKeys = () => {
    // a failed read names its gh cause, never a json parse offset
    const read = run('get', ['--output', 'json']);
    if (read.exitCode !== 0)
      throw new MalfunctionError('the sweep read of the real-api pr failed', {
        repo: REPO,
        pr: PR,
        exitCode: read.exitCode,
        detail: read.stderr || read.stdout,
      });
    const rows: {
      kind: string;
      id: number | null;
      author: string | null;
      key: string | null;
      created_at: string | null;
    }[] = JSON.parse(read.stdout);

    // sweep only this credential's litter; another author's comment is not ours to delete
    const login = getLoginOfToken();
    const stale = rows.filter(
      (row) =>
        row.kind === 'issue' &&
        (row.author === login || row.author === `${login}[bot]`) &&
        row.key?.startsWith(KEY_PREFIX) &&
        Date.now() - Date.parse(row.created_at ?? '') > STALE_AFTER_MS,
    );
    return stale.map((row) =>
      run('del', [
        '--id',
        String(row.id),
        '--kind',
        'issue',
        '--mode',
        'apply',
      ]),
    );
  };

  /**
   * .what = a live output with its volatile bytes masked
   * .why  = ids, urls, hashes, times, the run key, and the login differ per
   *         run or per seat; the shape around them is the contract the
   *         snapshot holds
   */
  const asStable = (input: { text: string }): string =>
    input.text
      .split(KEY)
      .join('<key>')
      .replace(/(auth: .* as )\S+/g, '$1<login>')
      .replace(/("author": )"[^"]*"/g, '$1"<login>"')
      .replace(/(─ author: )\S+/g, '$1<login>')
      .replace(/[0-9a-f]{64}/g, '<sha256>')
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/g, '<ts>')
      .replace(/(issuecomment-|comments\/|"id": )\d+/g, '$1<id>');

  given('[case1] a keyed comment on a home-org pr', () => {
    const bodyFirst =
      'real-api case: set → get → set (edit) → set (no-op) → del';
    const bodySecond = 'real-api case: the edited body, sent as a PATCH';
    const setArgs = [
      '--key',
      KEY,
      '--from',
      '@stdin',
      '--mode',
      'apply',
      '--output',
      'json',
    ];
    when('[t0] the full lifecycle runs', () => {
      const result = useThen('it runs', async () => {
        const sweeps = sweepStaleKeys();
        const setFirst = run('set', setArgs, bodyFirst);
        const getFirst = run('get', ['--key', KEY, '--output', 'json']);
        const setEdit = run('set', setArgs, bodySecond);
        const getEdit = run('get', ['--key', KEY, '--output', 'json']);
        const setAgain = run('set', setArgs, bodySecond);
        const del = run('del', ['--key', KEY, '--mode', 'apply']);
        const getAfter = run('get', ['--key', KEY]);
        return {
          sweeps,
          setFirst,
          getFirst,
          setEdit,
          getEdit,
          setAgain,
          del,
          getAfter,
        };
      });
      then('each stale comment from a dead run is cleared', () => {
        result.sweeps.forEach((sweep) => expect(sweep.exitCode).toBe(0));
      });
      then('set posts, and the read-back hash matches', () => {
        expect(result.setFirst.exitCode).toBe(0);
        const out = JSON.parse(result.setFirst.stdout);
        expect(out.verdict).toBe('posted, read back, hash matches');
        expect(out.sha256.readback).toBe(out.sha256.new);
      });
      then('get finds the one own comment, marker intact after a POST', () => {
        expect(result.getFirst.exitCode).toBe(0);
        const rows: { key: string; body: string; sha256: string }[] =
          JSON.parse(result.getFirst.stdout);
        expect(rows).toHaveLength(1);
        expect(rows[0]?.key).toBe(KEY);
        expect(rows[0]?.body).toBe(
          `🐢 ${bodyFirst}\n\n<!-- rhx:github.comment key=${KEY} -->`,
        );
        expect(rows[0]?.sha256).toBe(
          JSON.parse(result.setFirst.stdout).sha256.new,
        );
      });
      then(
        'set with a new body edits in place, marker intact after a PATCH',
        () => {
          expect(result.setEdit.exitCode).toBe(0);
          const out = JSON.parse(result.setEdit.stdout);
          expect(out.method).toBe('PATCH');
          expect(out.verdict).toBe('edited, read back, hash matches');
          expect(out.id).toBe(JSON.parse(result.setFirst.stdout).id);
          const rows: { key: string; body: string }[] = JSON.parse(
            result.getEdit.stdout,
          );
          expect(rows).toHaveLength(1);
          expect(rows[0]?.body).toBe(
            `🐢 ${bodySecond}\n\n<!-- rhx:github.comment key=${KEY} -->`,
          );
        },
      );
      then('set again is a no-op', () => {
        expect(result.setAgain.exitCode).toBe(0);
        expect(JSON.parse(result.setAgain.stdout).verdict).toBe(
          'already there — no-op',
        );
      });
      then('del deletes and confirms absent', () => {
        expect(result.del.exitCode).toBe(0);
        expect(result.del.stdout).toContain('deleted, confirmed absent');
      });
      then('get after del finds no comment for the key', () => {
        expect(result.getAfter.exitCode).toBe(2);
        expect(result.getAfter.stdout).toContain(`carries key '${KEY}'`);
      });
      then('the live outputs match their masked snapshot', () => {
        const outputs = {
          setFirst: result.setFirst.stdout,
          getFirst: result.getFirst.stdout,
          setEdit: result.setEdit.stdout,
          setAgain: result.setAgain.stdout,
          del: result.del.stdout,
          getAfter: result.getAfter.stdout,
        };
        expect(
          Object.fromEntries(
            Object.entries(outputs).map(([name, text]) => [
              name,
              asStable({ text }),
            ]),
          ),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case3] the pr body, edited and restored', () => {
    const BODY_MARK = '<!-- rhx real-api case: body round trip -->';
    const bodyArgs = [
      '--kind',
      'body',
      '--from',
      '@stdin',
      '--mode',
      'apply',
      '--output',
      'json',
    ];

    /**
     * .what = the body and its hash, read live, with a dead run's mark stripped
     */
    const getBodyNow = (): { body: string; sha256: string } => {
      const read = run('get', ['--kind', 'body', '--output', 'json']);
      if (read.exitCode !== 0)
        throw new MalfunctionError('the body read of the real-api pr failed', {
          exitCode: read.exitCode,
          detail: read.stderr || read.stdout,
        });
      const rows: { body: string; sha256: string }[] = JSON.parse(read.stdout);
      return { body: rows[0]?.body ?? '', sha256: rows[0]?.sha256 ?? '' };
    };

    when('[t0] the body gets one mark line, then its original back', () => {
      const result = useThen('it runs', async () => {
        const before = getBodyNow();
        const original = before.body.split(`\n\n${BODY_MARK}`).join('');
        const setMark = run('set', bodyArgs, `${original}\n\n${BODY_MARK}`);
        const marked = getBodyNow();
        const setRestore = run('set', bodyArgs, original);
        const after = getBodyNow();
        return { original, setMark, marked, setRestore, after };
      });
      then('the mark lands as a PATCH, read back, hash matches', () => {
        expect(result.setMark.exitCode).toBe(0);
        const out = JSON.parse(result.setMark.stdout);
        expect(out.method).toBe('PATCH');
        expect(out.verdict).toBe('edited, read back, hash matches');
        expect(result.marked.body).toBe(`${result.original}\n\n${BODY_MARK}`);
      });
      then('the restore puts back the original body, byte for byte', () => {
        expect(result.setRestore.exitCode).toBe(0);
        expect(result.after.body).toBe(result.original);
        expect(result.after.body).not.toContain(BODY_MARK);
      });
      then('the live outputs match their masked snapshot', () => {
        expect({
          setMark: asStable({ text: result.setMark.stdout }),
          setRestore: asStable({ text: result.setRestore.stdout }),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case2] no gh login reachable', () => {
    when('[t0] the case checks a gh config dir that holds no login', () => {
      const configDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'gh-config-empty-'),
      );
      afterAll(() => fs.rmSync(configDir, { recursive: true, force: true }));
      then(
        'it fails loud with a ConstraintError and the login hint',
        async () => {
          const error = await getError(async () =>
            assertGhLogin({
              env: { ...process.env, GH_CONFIG_DIR: configDir },
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain(
            'gh login required for the real-api case',
          );
          expect(error.message).toContain('gh auth login');
        },
      );
    });
  });
});
