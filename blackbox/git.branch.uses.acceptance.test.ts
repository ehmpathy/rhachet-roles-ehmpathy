import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genTestDir } from './.test/invokeHook';

/**
 * .what = acceptance tests for `rhx git.branch.uses`, run via rhachet against the linked role
 * .why  = the meter gates every cutover apply; a human grants, reads, and revokes it through
 *         rhachet, so each journey must hold at that entry
 */

/**
 * .what = run the skill the way a caller does: through rhachet, with a temp HOME
 * .note = `__I_AM_HUMAN` is the skill family's test door past its human guard; a test runs
 *         with no terminal on stdin. `human: false` closes the door to prove the guard
 */
const runViaRhachet = (input: {
  dir: string;
  home: string;
  args: string[];
  human: boolean;
}): { stdout: string; stderr: string; code: number | null } => {
  const result = spawnSync(
    'npx',
    ['rhachet', 'run', '--skill', 'git.branch.uses', ...input.args],
    {
      cwd: input.dir,
      encoding: 'utf-8', // node api param name
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        HOME: input.home,
        __I_AM_HUMAN: input.human ? 'true' : '',
      },
      timeout: 60_000, // node api param name; a hang guard
    },
  );
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    code: result.status,
  };
};

/**
 * .what = mask temp paths so a snapshot holds across runs
 */
const asSnapshotSafe = (input: {
  dir: string;
  home: string;
  text: string;
}): string =>
  input.text.split(input.dir).join('<repo>').split(input.home).join('<home>');

describe('git.branch.uses (acceptance)', () => {
  given('[case1] a linked repo of the ehmpathy org', () => {
    const scene = useBeforeAll(async () => {
      const dir = await genTestDir({ slug: 'branch-uses-acceptance' });
      const home = genTempDir({ slug: 'branch-uses-acceptance-home', git: false });
      fs.mkdirSync(path.join(dir, '.agent'), { recursive: true });
      fs.writeFileSync(path.join(dir, '.agent', 'keyrack.yml'), 'org: ehmpathy\n');
      return { dir, home };
    });
    const run = (args: string[], human = true) =>
      runViaRhachet({ dir: scene.dir, home: scene.home, args, human });
    const snap = (text: string) =>
      asSnapshotSafe({ dir: scene.dir, home: scene.home, text });
    const readMeterLocal = () =>
      JSON.parse(
        fs.readFileSync(path.join(scene.dir, '.meter', 'git.branch.uses.jsonc'), 'utf-8'),
      );

    when('[t0] a human grants two cutovers', () => {
      const res = useBeforeAll(async () => run(['set', '--quant', '2']));

      then('it grants them and writes the local meter', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toContain('granted: 2');
        expect(readMeterLocal()).toEqual({ uses: 2 });
        expect(snap(res.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] anyone reads the quota', () => {
      const res = useBeforeAll(async () => run(['get'], false));

      then('it shows the grant, with no human needed', () => {
        expect(res.code).toBe(0);
        expect(snap(res.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] a mechanic, not a human, tries to grant', () => {
      const res = useBeforeAll(async () => run(['set', '--quant', '9'], false));

      then('it refuses at exit 2 and leaves the grant as it was', () => {
        expect(res.code).toBe(2);
        expect(readMeterLocal()).toEqual({ uses: 2 });
        expect(snap(res.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] a human allows the org', () => {
      const res = useBeforeAll(async () => run(['allow', '--org', 'ehmpathy']));

      then('it writes the org file in HOME', () => {
        expect(res.code).toBe(0);
        expect(
          fs.existsSync(
            path.join(
              scene.home,
              '.rhachet',
              'storage',
              'repo=ehmpathy',
              'role=mechanic',
              '.meter',
              'git.branch.uses.org.jsonc',
            ),
          ),
        ).toBe(true);
        expect(snap(res.stdout)).toMatchSnapshot();
      });
    });

    when('[t4] a human blocks all cutovers globally', () => {
      const res = useBeforeAll(async () => run(['block', '--global']));

      then('it records the global blocker', () => {
        expect(res.code).toBe(0);
        expect(snap(res.stdout)).toMatchSnapshot();
      });
    });

    when('[t5] a human lifts the global blocker', () => {
      const res = useBeforeAll(async () => run(['allow', '--global']));

      then('it lifts the blocker', () => {
        expect(res.code).toBe(0);
        expect(snap(res.stdout)).toMatchSnapshot();
      });
    });

    when('[t6] a human revokes the local grant', () => {
      const res = useBeforeAll(async () => run(['del']));

      then('it revokes the grant', () => {
        expect(res.code).toBe(0);
        expect(snap(res.stdout)).toMatchSnapshot();
      });
    });

    when('[t7] anyone reads the quota after the revoke', () => {
      const res = useBeforeAll(async () => run(['get'], false));

      then('it reads as no grant', () => {
        expect(res.code).toBe(0);
        expect(snap(res.stdout)).toMatchSnapshot();
      });
    });
  });
});
