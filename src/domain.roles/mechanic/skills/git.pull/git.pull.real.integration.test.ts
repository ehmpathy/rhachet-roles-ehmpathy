import { spawnSync } from 'child_process';
import { ConstraintError, MalfunctionError } from 'helpful-errors';
import * as path from 'path';
import { given, then, useThen, when } from 'test-fns';

/**
 * .what = the real-api case for git.pull.title set and git.pull.description set
 * .why  = the stub suites prove the contract against a stub gh; this case proves
 *         the pull PATCH against github itself: the payload shape, the read-back,
 *         the no-op on a rerun, and the state of a merged pull
 *
 * .note = opt-in only, never a gate (fulcrum F7): the suite names no pull of its
 *         own. the runner names one via GIT_PULL_REAL_TARGET='<owner/repo>#<n>' — a
 *         merged pull in a home-org repo that the seat's gh login opened (a set writes
 *         only a pull its own credential opened). no flag → a loud ConstraintError,
 *         and no pull is read or written. a merged title is already the squash
 *         header, so a title edit there moves no commit
 * .note = every write is undone: the title is set back through the verb, the body
 *         is restored byte for byte by a raw PATCH (the verb would sign it, so the
 *         verb cannot restore a body that lacks the footer). afterAll restores both
 *         again if a run died mid-way, and the case asserts the live pull matches
 *         its state before the run
 * .note = every verb runs `--auth as-human`: the gh cli login of the seat that runs
 *         the suite. no login → fail loud, never skip
 * .note = ci never runs this case: it writes to a live pull, and a test job holds no
 *         github write scope (jest.integration.config.ts excludes it). run it by
 *         hand, under the gh login that opened the target pull:
 *         GIT_PULL_REAL_TARGET='<owner/repo>#<n>' npx jest -c jest.integration.config.ts --testMatch '<rootDir>/src/domain.roles/mechanic/skills/git.pull/git.pull.real.integration.test.ts'
 */
describe('git.pull.title + git.pull.description (real github api)', () => {
  /**
   * .what = the pull the runner named, as repo and number, or a loud refusal
   * .why  = a live write must aim where a human chose, never at a pull this file names
   */
  const getTargetFromFlag = (): { repo: string; pr: string } => {
    const flag = process.env.GIT_PULL_REAL_TARGET ?? '';
    const match = flag.match(/^([\w.-]+\/[\w.-]+)#(\d+)$/);
    if (match) return { repo: match[1]!, pr: match[2]! };
    throw new ConstraintError(
      'the real-api case needs a named target: GIT_PULL_REAL_TARGET',
      {
        got: flag || '(unset)',
        hint: "GIT_PULL_REAL_TARGET='<owner/repo>#<n>'   # a merged home-org pull your gh login opened",
      },
    );
  };
  const { repo: REPO, pr: PR } = getTargetFromFlag();
  const RUN = `rhx-real-case-${Date.now().toString(36)}`;
  const FOOTER = '🐢🌊 surfed in by seaturtle[bot]';
  const skillsDir = path.join(__dirname, '..');
  const repoRoot = path.join(__dirname, '../../../../..');

  /**
   * .what = the env with GH_TOKEN and GITHUB_TOKEN dropped
   * .why  = as-human reads only the gh login; a raw call here must act as the same seat
   */
  const asEnvOfLogin = (): NodeJS.ProcessEnv => {
    const {
      GH_TOKEN: _ghToken,
      GITHUB_TOKEN: _githubToken,
      ...env
    } = process.env;
    return env;
  };

  /**
   * .what = confirm a gh cli login is present, or throw a loud ConstraintError
   */
  const assertGhLogin = (): void => {
    const status = spawnSync('gh', ['auth', 'status'], {
      encoding: 'utf-8',
      env: asEnvOfLogin(),
    });
    if (status.status === 0) return;
    throw new ConstraintError('gh login required for the real-api case', {
      detail: status.stderr || status.stdout,
      hint: 'gh auth login   # under the login that opened the target pull',
    });
  };

  /**
   * .what = the live title and body of the target pull, read raw from github
   * .why  = the truth the verbs are judged against, read apart from the verbs
   */
  const getPullLive = (): { title: string; body: string } => {
    const read = spawnSync('gh', ['api', `repos/${REPO}/pulls/${PR}`], {
      encoding: 'utf-8',
      env: asEnvOfLogin(),
    });
    if (read.status !== 0)
      throw new MalfunctionError('the raw read of the target pull failed', {
        repo: REPO,
        pr: PR,
        detail: read.stderr || read.stdout,
      });
    const pull: { title: string; body: string | null } = JSON.parse(
      read.stdout,
    );
    return { title: pull.title, body: pull.body ?? '' };
  };

  /**
   * .what = write the title and body of the target pull raw, to restore them
   * .why  = the verb signs a body; a restore must put back the exact prior bytes
   */
  const setPullLive = (input: { title: string; body: string }): void => {
    const write = spawnSync(
      'gh',
      ['api', '--method', 'PATCH', `repos/${REPO}/pulls/${PR}`, '--input', '-'],
      {
        encoding: 'utf-8',
        env: asEnvOfLogin(),
        input: JSON.stringify(input),
      },
    );
    if (write.status !== 0)
      throw new MalfunctionError('the raw restore of the target pull failed', {
        repo: REPO,
        pr: PR,
        detail: write.stderr || write.stdout,
      });
  };

  /**
   * .what = run one set verb against the real api under the seat's gh login
   */
  const run = (
    noun: 'title' | 'description',
    args: string[],
    stdin?: string,
  ) => {
    assertGhLogin();
    const result = spawnSync(
      'bash',
      [
        path.join(skillsDir, `git.pull.${noun}`, `git.pull.${noun}.set.sh`),
        '--in',
        REPO,
        '--pr',
        PR,
        '--auth',
        'as-human',
        '--mode',
        'apply',
        '--output',
        'json',
        ...args,
      ],
      {
        cwd: repoRoot,
        encoding: 'utf-8',
        input: stdin ?? '',
        env: process.env,
      },
    );
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  /**
   * .what = a live json output with its volatile bytes masked, then parsed
   * .why  = the run id, hashes, the login, and the prior title differ per run;
   *         the shape around them is the contract the snapshot holds
   */
  const asStableJson = (input: { text: string; title: string }): unknown =>
    JSON.parse(
      input.text
        .split(RUN)
        .join('<run>')
        .split(input.title)
        .join('<title>')
        .split(REPO)
        .join('<repo>')
        .replace(/(#|\/pull\/)\d+/g, '$1<pr>')
        .replace(/("pr": )\d+/g, '$1"<pr>"')
        .replace(/("author": )"[^"]*"/g, '$1"<login>"')
        .replace(/[0-9a-f]{64}/g, '<sha256>'),
    );

  // the pull as it stood before any write, so every exit path can put it back
  const pullBefore = getPullLive();
  afterAll(() => {
    const pullNow = getPullLive();
    if (pullNow.title === pullBefore.title && pullNow.body === pullBefore.body)
      return;
    setPullLive(pullBefore);
  });

  given('[case1] the title of a merged pull this login opened', () => {
    const titleNew = `${pullBefore.title} · ${RUN}`;
    when('[t0] set to a new title, then set back, then set back again', () => {
      const result = useThen('it runs', async () => {
        const setNew = run('title', ['--title', titleNew]);
        const liveNew = getPullLive();
        const setBack = run('title', ['--title', pullBefore.title]);
        const setAgain = run('title', ['--title', pullBefore.title]);
        const liveEnd = getPullLive();
        return { setNew, liveNew, setBack, setAgain, liveEnd };
      });
      then('set writes the new title and reads it back', () => {
        expect(result.setNew.exitCode).toBe(0);
        const out = JSON.parse(result.setNew.stdout);
        expect(out.verdict).toBe('set, read back, matches');
        expect(out.state).toBe('merged');
        expect(out.title.readback).toBe(titleNew);
      });
      then('github holds the new title', () => {
        expect(result.liveNew.title).toBe(titleNew);
      });
      then('set back restores the prior title through the verb', () => {
        expect(result.setBack.exitCode).toBe(0);
        expect(JSON.parse(result.setBack.stdout).verdict).toBe(
          'set, read back, matches',
        );
      });
      then('set again is a no-op', () => {
        expect(result.setAgain.exitCode).toBe(0);
        expect(JSON.parse(result.setAgain.stdout).verdict).toBe(
          'already there — no-op',
        );
      });
      then('the live title ends as it began', () => {
        expect(result.liveEnd.title).toBe(pullBefore.title);
      });
      then('the live outputs match their masked snapshot', () => {
        expect({
          setNew: asStableJson({
            text: result.setNew.stdout,
            title: pullBefore.title,
          }),
          setAgain: asStableJson({
            text: result.setAgain.stdout,
            title: pullBefore.title,
          }),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case2] the body of a merged pull this login opened', () => {
    const bodyNew = `real-api case: a body set through the verb, then restored raw\n\nrun: ${RUN}\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)`;
    when('[t0] set to a new body, then set again, then restored raw', () => {
      const result = useThen('it runs', async () => {
        const setNew = run('description', ['--from', '@stdin'], bodyNew);
        const liveNew = getPullLive();
        const setAgain = run('description', ['--from', '@stdin'], bodyNew);
        setPullLive(pullBefore);
        const liveEnd = getPullLive();
        return { setNew, liveNew, setAgain, liveEnd };
      });
      then('set writes the body and the read-back hash matches', () => {
        expect(result.setNew.exitCode).toBe(0);
        const out = JSON.parse(result.setNew.stdout);
        expect(out.verdict).toBe('set, read back, hash matches');
        expect(out.state).toBe('merged');
        expect(out.sha256.readback).toBe(out.sha256.new);
      });
      then('github holds the signed body: claude line gone, one footer', () => {
        expect(result.liveNew.body).toContain(`run: ${RUN}`);
        expect(result.liveNew.body).not.toContain('Generated with');
        expect(result.liveNew.body.trimEnd().endsWith(FOOTER)).toBe(true);
        expect(result.liveNew.body.split(FOOTER)).toHaveLength(2);
      });
      then('set again is a no-op', () => {
        expect(result.setAgain.exitCode).toBe(0);
        expect(JSON.parse(result.setAgain.stdout).verdict).toBe(
          'already there — no-op',
        );
      });
      then('the live body ends as it began, byte for byte', () => {
        expect(result.liveEnd.body).toBe(pullBefore.body);
        expect(result.liveEnd.title).toBe(pullBefore.title);
      });
      then('the live outputs match their masked snapshot', () => {
        expect({
          setNew: asStableJson({
            text: result.setNew.stdout,
            title: pullBefore.title,
          }),
          setAgain: asStableJson({
            text: result.setAgain.stdout,
            title: pullBefore.title,
          }),
        }).toMatchSnapshot();
      });
    });
  });
});
