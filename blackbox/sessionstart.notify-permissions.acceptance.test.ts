import * as fs from 'fs';
import * as path from 'path';

import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import { genTestDir, invokeHook } from './.test/invokeHook';

/**
 * .what = acceptance tests for the sessionstart.notify-permissions hook
 * .why = the integration suite runs the notice from src/; this suite runs the BUILT notice from
 *        the linked role, the exact path claude code invokes at session start — so a lost file,
 *        a stale dist copy, or a broken link fails here before it drops the notice for every
 *        session
 */

const HOOK = 'sessionstart.notify-permissions.sh';

/**
 * .what = the pre-approved section of the notice, up to the auto-decide section
 * .why = the auto-decide sections are pinned by the decide-permissions suite
 */
const asPreapprovedSection = (input: { stdout: string }): string =>
  input.stdout.split('🐚 auto-decided permission prompts')[0] ?? '';

describe('sessionstart.notify-permissions.sh (acceptance)', () => {
  given('[case1] a linked repo whose settings pre-approve three heads', () => {
    // returns an object: useBeforeAll proxies its value
    const repo = useBeforeAll(async () => {
      const dir = await genTestDir({ slug: 'sn-notice' });
      fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
      fs.writeFileSync(
        path.join(dir, '.claude', 'settings.json'),
        JSON.stringify({
          permissions: {
            allow: ['Bash(git status:*)', 'Bash(git diff:*)', 'Bash(rhx:*)', 'Bash(tree:*)'],
            deny: [],
            ask: [],
          },
        }),
      );
      return { dir };
    });

    when('[t0] a session starts', () => {
      const res = useThen('the notice runs', async () =>
        invokeHook({ hookName: HOOK, cwd: repo.dir, stdin: '{}' }),
      );

      then('the notice succeeds, silent on stderr', () => {
        expect(res.code).toBe(0);
        expect(res.stderr).toBe('');
      });

      then('it counts the commands by head', () => {
        expect(res.stdout).toContain(
          '4 commands pre-approved, across 3 heads — no permission prompt for any of them',
        );
        expect(res.stdout).toContain('git (2)');
      });

      then('it points to the on-demand lookup, never the full list', () => {
        expect(res.stdout).toContain('rhx permissions.get');
        expect(res.stdout).toContain("rhx permissions.get --for '<command>'");
        expect(res.stdout).not.toContain('git status');
      });

      then('the pre-approved section matches snapshot', () => {
        expect(asPreapprovedSection({ stdout: res.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case4] a linked repo with no .claude dir', () => {
    // the built notice's early exit: no settings to read, so no notice at all
    const repo = useBeforeAll(async () => {
      const dir = await genTestDir({ slug: 'sn-no-claude' });
      fs.rmSync(path.join(dir, '.claude'), { recursive: true, force: true });
      return { dir };
    });

    when('[t0] a session starts', () => {
      const res = useThen('the notice runs', async () =>
        invokeHook({ hookName: HOOK, cwd: repo.dir, stdin: '{}' }),
      );

      then('the notice is silent on both streams, exit 0', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toBe('');
        expect(res.stderr).toBe('');
      });
    });
  });

  given('[case3] a linked repo whose two settings files are both broken', () => {
    // each broken file appends its own malfunction, joined by "; " — a `+=` slipped to `=`
    // would drop the first file in silence
    const repo = useBeforeAll(async () => {
      const dir = await genTestDir({ slug: 'sn-both-broken' });
      fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
      fs.writeFileSync(path.join(dir, '.claude', 'settings.json'), '{ broken');
      fs.writeFileSync(path.join(dir, '.claude', 'settings.local.json'), '{ also broken');
      return { dir };
    });

    when('[t0] a session starts', () => {
      const res = useThen('the notice runs', async () =>
        invokeHook({ hookName: HOOK, cwd: repo.dir, stdin: '{}' }),
      );

      then('the built notice names both files, exit 0', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toContain('.claude/settings.json');
        expect(res.stdout).toContain('.claude/settings.local.json');
      });

      then('the pre-approved section matches snapshot', () => {
        // the jq parse text varies by jq version; it is the one volatile piece
        expect(
          asPreapprovedSection({ stdout: res.stdout }).replace(
            /\(jq: [^)]*\)|\((?:parse error|jq)[^)]*\)/g,
            '(<jq error>)',
          ),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case2] a linked repo whose settings.json is not valid json', () => {
    // returns an object: useBeforeAll proxies its value
    const repo = useBeforeAll(async () => {
      const dir = await genTestDir({ slug: 'sn-broken' });
      fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
      fs.writeFileSync(path.join(dir, '.claude', 'settings.json'), '{ broken');
      fs.writeFileSync(
        path.join(dir, '.claude', 'settings.local.json'),
        JSON.stringify({ permissions: { allow: ['Bash(tree:*)'] } }),
      );
      return { dir };
    });

    when('[t0] a session starts', () => {
      const res = useThen('the notice runs', async () =>
        invokeHook({ hookName: HOOK, cwd: repo.dir, stdin: '{}' }),
      );

      then('the built notice names the broken file on both streams, exit 0', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toContain(
          '💥 MalfunctionError: .claude/settings.json is not valid json',
        );
        expect(res.stderr).toContain(
          '💥 MalfunctionError: .claude/settings.json is not valid json',
        );
        expect(res.stdout).toContain('1 command pre-approved, across 1 head');
      });

      then('the pre-approved section matches snapshot', () => {
        // the jq parse error text varies by jq version; it is the one volatile piece
        expect(
          asPreapprovedSection({ stdout: res.stdout }).replace(
            /is not valid json \(.*?\) —/,
            'is not valid json (<jq error>) —',
          ),
        ).toMatchSnapshot();
      });
    });
  });
});
