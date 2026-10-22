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
 */
const runViaRhachet = (input: {
  dir: string;
  args: string[];
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
      env: { ...envRunner, HOME: homeHermetic },
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
        expect(res.stdout).toContain('left: unset (blocked)');
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
        expect(
          fs.existsSync(path.join(repo.dir, '.meter', 'git.release.uses.jsonc')),
        ).toBe(false);
      });
    });
  });
});
