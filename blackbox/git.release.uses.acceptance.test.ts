import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestDir } from './.test/invokeHook';
import { setFixtureFile } from './.test/setFixtureFile';

/**
 * .what = acceptance tests for `rhx git.release.uses`, run via rhachet against the linked role
 * .why = the release meter is a new contract a human types by name; rhachet must find the
 *        shipped skill, and the skill must find the commit family's readers beside it
 */

/**
 * .what = run the skill the way a human does: through rhachet
 * .note = HOME is pinned inside the fixture, so no run reads the runner's own meters
 * .note = `human` sets the __I_AM_HUMAN marker the guard honors in place of a tty
 */
const runViaRhachet = (input: {
  dir: string;
  args: string[];
  human?: boolean;
}): { stdout: string; stderr: string; code: number } => {
  const {
    CLAUDE_CONFIG_DIR: _configDirOmitted,
    __I_AM_HUMAN: _humanOmitted,
    ...envRunner
  } = process.env;
  const homeHermetic = path.join(input.dir, '.home-hermetic');
  fs.mkdirSync(homeHermetic, { recursive: true });
  const result = spawnSync(
    'npx',
    ['rhachet', 'run', '--skill', 'git.release.uses', ...input.args],
    {
      cwd: input.dir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      // a human run carries the marker the tty guard honors; a robot run never does
      env: {
        ...envRunner,
        HOME: homeHermetic,
        ...(input.human ? { __I_AM_HUMAN: 'true' } : {}),
      },
    },
  );
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    code: result.status ?? 1,
  };
};

/**
 * .what = the skill's own render, from its 🐢 line on (the rhachet run banner varies)
 */
const asSkillRender = (input: { stdout: string }): string =>
  input.stdout.slice(Math.max(0, input.stdout.indexOf('🐢')));

describe('git.release.uses (acceptance)', () => {
  given('[case1] a linked repo that names its org', () => {
    const repo = useBeforeAll(async () => {
      const dir = await genTestDir({ slug: 'gru-linked' });
      setFixtureFile({
        dir,
        relPath: '.agent/keyrack.yml',
        content: 'org: ehmpathy\n',
      });
      return { dir };
    });

    when('[t0] any actor runs `rhx git.release.uses get`', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: repo.dir, args: ['get'] }),
      );

      then('the shipped skill reads all three levels as blocked', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toContain('🐚 git.release.uses');
        expect(res.stdout).toContain('local: unset (blocked)');
        expect(res.stdout).toContain('org: blocked');
        expect(res.stdout).toContain('global: not blocked');
        expect(asSkillRender({ stdout: res.stdout })).toMatchSnapshot();
      });
    });

    when('[t1] a robot runs `rhx git.release.uses set --quant 1`', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: repo.dir, args: ['set', '--quant', '1'] }),
      );

      then('it refuses, exit 2, and writes no release stamp', () => {
        expect(res.code).toBe(2);
        expect(res.stdout).toContain('ConstraintError: no terminal on this command');
        expect(res.stderr).toContain('ConstraintError: no terminal on this command');
        expect(
          fs.existsSync(path.join(repo.dir, '.meter', 'git.release.uses.jsonc')),
        ).toBe(false);
        expect(asSkillRender({ stdout: res.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case2] a human walks the release meter through its grants', () => {
    const repo = useBeforeAll(async () => {
      const dir = await genTestDir({ slug: 'gru-human' });
      setFixtureFile({
        dir,
        relPath: '.agent/keyrack.yml',
        content: 'org: ehmpathy\n',
      });
      return { dir };
    });
    const stampPath = () =>
      path.join(repo.dir, '.meter', 'git.release.uses.jsonc');

    when('[t0] the human allows releases for the org', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({
          dir: repo.dir,
          args: ['allow', '--org', 'ehmpathy'],
          human: true,
        }),
      );
      then('the org grant lands, exit 0', () => {
        expect(res.code).toBe(0);
        expect(asSkillRender({ stdout: res.stdout })).toMatchSnapshot();
      });
    });

    when('[t1] the human stamps one release, then any actor reads it', () => {
      const res = useBeforeAll(async () => ({
        stamped: runViaRhachet({
          dir: repo.dir,
          args: ['set', '--quant', '1'],
          human: true,
        }),
        got: runViaRhachet({ dir: repo.dir, args: ['get'] }),
      }));
      then('the stamp says ship it, and get reads can ship now', () => {
        expect(res.stamped.code).toBe(0);
        expect(res.stamped.stdout).toContain('ship it');
        expect(JSON.parse(fs.readFileSync(stampPath(), 'utf-8'))).toEqual({
          uses: 1,
        });
        expect(res.got.stdout).toContain('local: 1 left');
        expect(res.got.stdout).toContain('verdict: can ship now');
        expect(asSkillRender({ stdout: res.stamped.stdout })).toMatchSnapshot();
        expect(asSkillRender({ stdout: res.got.stdout })).toMatchSnapshot();
      });
    });

    when('[t2] the human allows unlimited releases', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: repo.dir, args: ['allow'], human: true }),
      );
      then('the stamp is unlimited', () => {
        expect(res.code).toBe(0);
        expect(JSON.parse(fs.readFileSync(stampPath(), 'utf-8'))).toEqual({
          uses: 'infinite',
        });
        expect(asSkillRender({ stdout: res.stdout })).toMatchSnapshot();
      });
    });

    when('[t3] the human blocks releases globally, then any actor reads it', () => {
      const res = useBeforeAll(async () => ({
        blocked: runViaRhachet({
          dir: repo.dir,
          args: ['block', '--global'],
          human: true,
        }),
        got: runViaRhachet({ dir: repo.dir, args: ['get'] }),
      }));
      then('the global blocker wins over the local stamp', () => {
        expect(res.blocked.code).toBe(0);
        expect(res.got.stdout).toContain('verdict: blocked by global');
        expect(asSkillRender({ stdout: res.blocked.stdout })).toMatchSnapshot();
        expect(asSkillRender({ stdout: res.got.stdout })).toMatchSnapshot();
      });
    });

    when('[t4] the human lifts the global blocker', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({
          dir: repo.dir,
          args: ['allow', '--global'],
          human: true,
        }),
      );
      then('releases resume globally', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toContain('releases resumed globally');
        expect(asSkillRender({ stdout: res.stdout })).toMatchSnapshot();
      });
    });

    when('[t5] the human blocks the tree, then revokes it', () => {
      const res = useBeforeAll(async () => ({
        blocked: runViaRhachet({ dir: repo.dir, args: ['block'], human: true }),
        revoked: runViaRhachet({ dir: repo.dir, args: ['del'], human: true }),
        got: runViaRhachet({ dir: repo.dir, args: ['get'] }),
      }));
      then('the stamp is revoked to zero, and get reads it blocked by local', () => {
        expect(res.blocked.code).toBe(0);
        expect(res.revoked.code).toBe(0);
        expect(JSON.parse(fs.readFileSync(stampPath(), 'utf-8'))).toEqual({
          uses: 0,
        });
        expect(res.got.stdout).toContain('local: 0 left');
        expect(res.got.stdout).toContain('verdict: blocked by local');
        expect(asSkillRender({ stdout: res.blocked.stdout })).toMatchSnapshot();
        expect(asSkillRender({ stdout: res.revoked.stdout })).toMatchSnapshot();
        expect(asSkillRender({ stdout: res.got.stdout })).toMatchSnapshot();
      });
    });
  });
});
