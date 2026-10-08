import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestDir } from './.test/invokeHook';

/**
 * .what = acceptance tests for `rhx permissions.nudges`, run via rhachet against the linked role
 * .why = the sponsor reads the accrued ledger through this one command; rhachet must find it,
 *        it must find the render lib beside the hooks in the linked role, and it must answer
 */

const LEDGER_REL =
  '.agent/.cache/repo=ehmpathy/role=mechanic/skill=check-permissions/nudges.jsonl';

/**
 * .what = a linked repo, with a ledger written when rows are given
 * .note = returns an object: useBeforeAll proxies its value
 */
const genLedgerRepo = async (input: {
  slug: string;
  rows: object[];
}): Promise<{ dir: string }> => {
  const dir = await genTestDir({ slug: input.slug });
  if (input.rows.length === 0) return { dir };
  const ledger = path.join(dir, LEDGER_REL);
  fs.mkdirSync(path.dirname(ledger), { recursive: true });
  fs.writeFileSync(
    ledger,
    input.rows.map((row) => JSON.stringify(row)).join('\n') + '\n',
  );
  return { dir };
};

/**
 * .what = run the skill the way the sponsor does: through rhachet
 */
const runViaRhachet = (input: {
  dir: string;
  args: string[];
}): { stdout: string; stderr: string; code: number } => {
  const result = spawnSync(
    'npx',
    ['rhachet', 'run', '--skill', 'permissions.nudges', ...input.args],
    { cwd: input.dir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
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

describe('permissions.nudges (acceptance)', () => {
  given('[case1] a linked repo whose ledger holds nudges and a retry', () => {
    const repo = useBeforeAll(async () =>
      genLedgerRepo({
        slug: 'pn-linked',
        rows: [
          { at: '2026-10-07T10:00:00Z', part: 'python3 -c 1', head: 'python3', kind: 'novel', verdict: 'nudged' },
          { at: '2026-10-07T10:00:09Z', part: 'python3 -c 1', head: 'python3', kind: 'novel', verdict: 'retried' },
          { at: '2026-10-07T10:01:00Z', part: 'ls src', head: 'ls', kind: 'alt', verdict: 'nudged' },
        ],
      }),
    );

    when('[t0] the sponsor runs `rhx permissions.nudges`', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: repo.dir, args: [] }),
      );

      then('it answers with the counts and the pave list', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toContain('nudged parts: 3');
        expect(res.stdout).toContain('retried through to a human: 1 (33%)');
        expect(res.stdout).toContain('python3 (2)');
      });

      then('it names how to report a head upstream (the wish: report upstream)', () => {
        expect(res.stdout).toContain(
          "rhx radio.task.push --via gh.issues --into ehmpathy/rhachet-roles-ehmpathy --title 'pave: <head>'",
        );
      });

      then('the render matches snapshot', () => {
        expect(asSkillRender({ stdout: res.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case2] a linked repo with no ledger yet', () => {
    const repo = useBeforeAll(async () =>
      genLedgerRepo({ slug: 'pn-empty', rows: [] }),
    );

    when('[t0] the sponsor runs `rhx permissions.nudges`', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: repo.dir, args: [] }),
      );

      then('it says none are recorded, and exits 0', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toContain('no nudge recorded yet');
      });

      then('the render matches snapshot', () => {
        expect(asSkillRender({ stdout: res.stdout })).toMatchSnapshot();
      });
    });
  });
});
