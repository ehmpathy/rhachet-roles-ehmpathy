import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { ConstraintError } from 'helpful-errors';
import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import { genTestDir, invokeHook } from './.test/invokeHook';

/**
 * .what = acceptance tests for the check-permissions PreToolUse hook, one per vision journey
 * .why = the integration suite runs the hook from src/; this suite runs the BUILT hook from
 *        the linked role (`.agent/repo=ehmpathy/role=mechanic/...`), the exact path claude
 *        code invokes — so it also proves the inventory beside the hook ships with it
 *
 * .note = vision case=1..8 map to [case1]..[case8] here. case=9 (see all, on demand) is the
 *         `rhx permissions.get` skill's journey, so it lives in permissions.get.acceptance.test.ts.
 *         [case9] here is the SOFTNUDGE mode: the advisory the built hook prints when a repo
 *         registers it with `--mode SOFTNUDGE`
 *
 * .pattern = blackbox against the linked role:
 *   1. clone the fixture repo and link the mechanic role (genTestDir)
 *   2. write the repo's .claude/settings.json allowlist
 *   3. pipe a PreToolUse payload into the linked hook; read exit code + both streams
 */

const HOOK = 'pretooluse.check-permissions.sh';

/**
 * .what = the allowlist every journey runs under
 * .why = small and fixed, so each rank is stable across runs
 */
const ALLOW = [
  'Bash(rhx:*)',
  'Bash(tree:*)',
  'Bash(git status:*)',
  'Bash(git diff:*)',
  'Bash(cat:*)',
  'Bash(jq)',
];

/**
 * .what = a linked repo with the allowlist written
 * .why = one link per journey keeps each nudge record and ledger isolated
 * .note = returns an object: useBeforeAll proxies its value, and a proxied bare string is
 *         not a string to `path.join`
 */
const genHookRepo = async (input: {
  slug: string;
  allow?: string[];
}): Promise<{ dir: string }> => {
  const dir = await genTestDir({ slug: input.slug });
  fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, '.claude', 'settings.json'),
    JSON.stringify({
      permissions: { allow: input.allow ?? ALLOW, deny: [], ask: [] },
    }),
  );
  return { dir };
};

/**
 * .what = pipe one Bash payload into the linked hook
 * .why = the shape claude code sends on PreToolUse
 * .note = the hook reads the user layer ($HOME/.claude) and the config dir
 *         ($CLAUDE_CONFIG_DIR); both are pinned so the runner's own settings never leak in
 *         (rule.require.hermetic-tests)
 */
const invokeBash = (input: { repo: string; command: string; args?: string[] }) =>
  invokeHook({
    hookName: HOOK,
    cwd: input.repo,
    args: input.args,
    env: { CLAUDE_CONFIG_DIR: undefined, HOME: '/nonexistent-home' },
    stdin: JSON.stringify({
      tool_name: 'Bash',
      tool_input: { command: input.command },
    }),
  });

/**
 * .what = the ledger rows the hook wrote in this repo
 * .why = case=5: the human reads this file to see nudged + retried demand
 */
const getLedgerRows = (input: {
  repo: string;
}): Array<Record<string, string>> => {
  const file = path.join(
    input.repo,
    '.agent/.cache/repo=ehmpathy/role=mechanic/skill=check-permissions/nudges.jsonl',
  );
  // an absent ledger is not "no rows": fail loud, so no case can pass on a ledger the hook
  // never reached
  if (!fs.existsSync(file))
    throw new ConstraintError('ledger absent for this repo', {
      file,
      hint: 'run a HARDNUDGE block in this repo first, so the hook writes the ledger',
    });
  return fs
    .readFileSync(file, 'utf-8')
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
};

describe('pretooluse.check-permissions.sh (acceptance)', () => {
  given('[case1] a compound whose second part has a paved alternative', () => {
    const repo = useBeforeAll(async () => genHookRepo({ slug: 'cp-alt' }));

    when("[t0] the bot runs `git diff --stat && grep -rln 'reef' src/`", () => {
      const res = useThen('the hook runs', async () =>
        invokeBash({ repo: repo.dir, command: "git diff --stat && grep -rln 'reef' src/" }),
      );

      then('the gate blocks (exit 2)', () => {
        expect(res.code).toBe(2);
      });

      then('the grep part names its paved alternatives, and the split tip renders', () => {
        expect(res.stderr).toContain("blocked: grep -rln 'reef' src/");
        // the wish's own example: both paved homes for a grep, named
        expect(res.stderr).toContain('rhx grepsafe');
        expect(res.stderr).toContain('rhx git.repo.get lines');
        expect(res.stderr).toContain('tip: a compound runs only if every part is paved');
        expect(res.stderr).not.toContain('blocked: git diff --stat');
      });

      then('the render matches snapshot', () => {
        expect(res.stderr).toMatchSnapshot();
      });
    });

    when('[t1] the bot reruns the paved alternative', () => {
      const res = useThen('the hook runs', async () =>
        invokeBash({ repo: repo.dir, command: 'rhx grepsafe --pattern reef --path src/' }),
      );

      then('the command passes, silent', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toBe('');
        expect(res.stderr).toBe('');
      });

      then('the silent pass matches snapshot', () => {
        expect({ code: res.code, stdout: res.stdout, stderr: res.stderr }).toMatchSnapshot();
      });
    });

    when('[t2] a 3-part compound where every part has a paved alternative', () => {
      const res = useThen('the hook runs', async () =>
        invokeBash({
          repo: repo.dir,
          command: 'ls src && grep -rn reef . && sed -n 1,2p package.json',
        }),
      );

      then('all three parts block, each with its own alternatives', () => {
        expect(res.code).toBe(2);
        expect(res.stderr).toContain('this command is not paved (3 parts)');
        expect(res.stderr).toContain('─ paved alternatives for `ls`');
        expect(res.stderr).toContain('─ paved alternatives for `grep`');
        expect(res.stderr).toContain('─ paved alternatives for `sed`');
        // no part is paved alone, so a split helps no part: the split tip stays silent
        expect(res.stderr).not.toContain('tip: a compound runs only if');
      });

      then('the render matches snapshot', () => {
        expect(res.stderr).toMatchSnapshot();
      });
    });

    when('[t3] a 3-part compound that mixes an alternative, a novel part, and a paved part', () => {
      const res = useThen('the hook runs', async () =>
        invokeBash({
          repo: repo.dir,
          command: 'ls src && python3 -c "print(1)" && git status',
        }),
      );

      then('only the two unpaved parts block, each with its own kind of answer', () => {
        expect(res.code).toBe(2);
        expect(res.stderr).toContain('this command is not paved (2 parts)');
        expect(res.stderr).toContain('─ paved alternatives for `ls`');
        expect(res.stderr).toContain('blocked: python3 -c "print(1)"');
        expect(res.stderr).toContain('no paved path fits this part');
        expect(res.stderr).not.toContain('blocked: git status');
      });

      then('the render matches snapshot', () => {
        expect(res.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case2] a typo of a paved command', () => {
    const repo = useBeforeAll(async () => genHookRepo({ slug: 'cp-typo' }));

    when('[t0] the bot runs `gti status`', () => {
      const res = useThen('the hook runs', async () =>
        invokeBash({ repo: repo.dir, command: 'gti status' }),
      );

      then('the nearest paved pattern is offered first, with the marker key', () => {
        expect(res.code).toBe(2);
        expect(res.stderr).toContain('did you mean?');
        expect(res.stderr.indexOf('[p] git status')).toBeGreaterThan(-1);
        expect(res.stderr.indexOf('[p] git status')).toBeLessThan(
          res.stderr.indexOf('[p] git diff'),
        );
        expect(res.stderr).toContain('key: [e] = the whole part must match exactly');
      });

      then('the render matches snapshot', () => {
        expect(res.stderr).toMatchSnapshot();
      });
    });

    when('[t1] the bot runs `grpsf wave` (the letters of `grepsafe`, in order)', () => {
      // the vision's fzf demo, under the grant the mechanic role ships: `Bash(rhx grepsafe:*)`
      // .note = a repo with only the `rhx:*` blanket holds no `grepsafe` word for the fzf tier
      //         to find; the role's own permissions grant it by name, so a real repo does
      const res = useThen('the hook runs', async () => {
        const fresh = await genHookRepo({
          slug: 'cp-typo-fzf',
          allow: [...ALLOW, 'Bash(rhx grepsafe:*)'],
        });
        return invokeBash({ repo: fresh.dir, command: 'grpsf wave' });
      });

      then('the fzf tier offers `rhx grepsafe`', () => {
        expect(res.code).toBe(2);
        expect(res.stderr).toContain('[p] rhx grepsafe');
      });

      then('the render matches snapshot', () => {
        expect(res.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case3] a novel command with no paved path', () => {
    const repo = useBeforeAll(async () => genHookRepo({ slug: 'cp-novel' }));

    when('[t0] the bot runs `python3 -c "print(1)"`', () => {
      const res = useThen('the hook runs', async () =>
        invokeBash({ repo: repo.dir, command: 'python3 -c "print(1)"' }),
      );

      then('the block pushes the bot to pave a skill', () => {
        expect(res.code).toBe(2);
        expect(res.stderr).toContain('no paved path fits this part');
        expect(res.stderr).toContain('🐚 pave what recurs');
        expect(res.stderr).toContain('where? always start in .agent/repo=.this/role=any/skills/');
      });

      then('the render matches snapshot', () => {
        expect(res.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case4] the bot busts through with one unchanged retry', () => {
    const repo = useBeforeAll(async () => genHookRepo({ slug: 'cp-retry' }));

    when('[t0] the bot runs the same blocked command twice', () => {
      const res = useThen('the hook runs twice', async () => {
        const first = await invokeBash({ repo: repo.dir, command: 'grep -rn wave .' });
        const second = await invokeBash({ repo: repo.dir, command: 'grep -rn wave .' });
        return { first, second };
      });

      then('the first attempt blocks', () => {
        expect(res.first.code).toBe(2);
        expect(res.first.stderr).toContain('rhx grepsafe');
        expect(res.first.stderr).toContain(
          '3. need this exact command once? retry it unchanged — that interrupts the human to ask',
        );
      });

      then('the first block render matches snapshot', () => {
        expect(res.first.stderr).toMatchSnapshot();
      });

      then('the retry goes to the human as an ask that names what was offered', () => {
        expect(res.second.code).toBe(0);
        expect(res.second.stderr).toBe('');
        const output = JSON.parse(res.second.stdout);
        expect(output.hookSpecificOutput.permissionDecision).toBe('ask');
        expect(output.hookSpecificOutput.permissionDecisionReason).toContain(
          'grep: paved alternative offered — rhx grepsafe',
        );
      });

      then('the ask payload matches snapshot', () => {
        expect(res.second.stdout).toMatchSnapshot();
      });
    });

    when('[t1] the bot retries a novel command unchanged', () => {
      // a fresh repo: the retry window holds one record per repo
      const res = useThen('the hook runs twice', async () => {
        const fresh = await genHookRepo({ slug: 'cp-retry-novel' });
        const first = await invokeBash({ repo: fresh.dir, command: 'du -sh dist' });
        const second = await invokeBash({ repo: fresh.dir, command: 'du -sh dist' });
        return { first, second };
      });

      then('the ask reason says no paved path fits', () => {
        expect(res.first.code).toBe(2);
        expect(res.second.code).toBe(0);
        const output = JSON.parse(res.second.stdout);
        expect(output.hookSpecificOutput.permissionDecision).toBe('ask');
        expect(output.hookSpecificOutput.permissionDecisionReason).toContain(
          'du: no paved path fits',
        );
      });

      then('the ask payload matches snapshot', () => {
        expect(res.second.stdout).toMatchSnapshot();
      });
    });

    when('[t2] the ledger cannot be written, and the bot retries', () => {
      // a file where the cache dir belongs: every ledger write fails
      const res = useThen('the hook runs twice', async () => {
        const fresh = await genHookRepo({ slug: 'cp-retry-noledger' });
        fs.rmSync(path.join(fresh.dir, '.agent', '.cache'), { recursive: true, force: true });
        fs.writeFileSync(path.join(fresh.dir, '.agent', '.cache'), 'a file');
        const first = await invokeBash({ repo: fresh.dir, command: 'du -sh dist' });
        const second = await invokeBash({ repo: fresh.dir, command: 'du -sh dist' });
        return { dir: fresh.dir, first, second };
      });

      then('the first attempt still blocks, and names the loss', () => {
        expect(res.first.code).toBe(2);
        expect(res.first.stderr).toContain(
          '💥 MalfunctionError: the nudge ledger row could not be written',
        );
      });

      then('the retry still reaches the human, and the reason notes the row was not recorded', () => {
        expect(res.second.code).toBe(0);
        const output = JSON.parse(res.second.stdout);
        expect(output.hookSpecificOutput.permissionDecision).toBe('ask');
        expect(output.hookSpecificOutput.permissionDecisionReason).toContain(
          '💥 MalfunctionError: the ledger row could not be written',
        );
        expect(output.hookSpecificOutput.permissionDecisionReason).toContain(
          'the ask still goes to the human',
        );
      });

      then('the ask payload matches snapshot', () => {
        // masked: the temp repo path, and mkdir's own text (it varies by platform)
        expect(
          res.second.stdout
            .split(res.dir)
            .join('<repo>')
            .replace(/mkdir: [^)]*\)/g, 'mkdir: <error>)'),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case5] the human reads the ledger', () => {
    const repo = useBeforeAll(async () => genHookRepo({ slug: 'cp-ledger' }));

    when('[t0] a novel command is blocked, then retried', () => {
      // an object, not a bare array: useThen proxies its value
      const ledger = useThen('the hook runs twice', async () => {
        await invokeBash({ repo: repo.dir, command: 'du -sh dist' });
        await invokeBash({ repo: repo.dir, command: 'du -sh dist' });
        return { rows: getLedgerRows({ repo: repo.dir }) };
      });

      then('the ledger holds a nudged row, then a retried row, for the same part', () => {
        expect(ledger.rows.map((row) => row.verdict)).toEqual(['nudged', 'retried']);
        expect(ledger.rows[0]).toMatchObject({ part: 'du -sh dist', head: 'du', kind: 'novel' });
        expect(ledger.rows[1]).toMatchObject({ part: 'du -sh dist', head: 'du', kind: 'novel' });
      });

      then('each row stamps an iso utc time', () => {
        for (const row of ledger.rows)
          expect(row.at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      });

      then('the ledger the human reads matches snapshot (the clock masked)', () => {
        // the `at` stamp is the one volatile field; it is asserted above, then masked here
        expect(
          ledger.rows.map((row) => ({ ...row, at: '<at>' })),
        ).toMatchSnapshot();
      });
    });

    when('[t1] an alt part and a typo part are each blocked, then retried', () => {
      // the other two row kinds, through the built hook: `alt` (an inventory answer) and
      // `typo` (a near paved pattern)
      const ledger = useThen('the hook runs four times', async () => {
        const fresh = await genHookRepo({ slug: 'cp-ledger-kinds' });
        await invokeBash({ repo: fresh.dir, command: 'ls src' });
        await invokeBash({ repo: fresh.dir, command: 'ls src' });
        await invokeBash({ repo: fresh.dir, command: 'gti status' });
        await invokeBash({ repo: fresh.dir, command: 'gti status' });
        return { rows: getLedgerRows({ repo: fresh.dir }) };
      });

      then('each kind writes its nudged row, then its retried row', () => {
        expect(
          ledger.rows.map((row) => [row.head, row.kind, row.verdict]),
        ).toEqual([
          ['ls', 'alt', 'nudged'],
          ['ls', 'alt', 'retried'],
          ['gti', 'typo', 'nudged'],
          ['gti', 'typo', 'retried'],
        ]);
      });
    });
  });

  given('[case6] a single part with a paved alternative', () => {
    const repo = useBeforeAll(async () => genHookRepo({ slug: 'cp-single' }));

    when('[t0] the bot runs `jq .scripts package.json`', () => {
      const res = useThen('the hook runs', async () =>
        invokeBash({ repo: repo.dir, command: 'jq .scripts package.json' }),
      );

      then('the paved pipe form is offered, and no split tip renders', () => {
        expect(res.code).toBe(2);
        expect(res.stderr).toContain('─ paved alternatives for `jq`\n');
        expect(res.stderr).toContain('cat <file> | jq');
        expect(res.stderr).not.toContain('tip: a compound runs only if');
      });

      then('the exact `[e] jq` pattern still renders beside the offer, with the marker key', () => {
        // vision case=8: the offer must serve, never stand as the only answer
        expect(res.stderr).toContain('─ nearest paved patterns\n');
        expect(res.stderr).toContain('[e] jq');
        expect(res.stderr).toContain(
          'key: [e] = the whole part must match exactly · [p] = the part must start with it',
        );
      });

      then('the render matches snapshot', () => {
        expect(res.stderr).toMatchSnapshot();
      });
    });

    when('[t1] the bot reruns the paved pipe form', () => {
      const res = useThen('the hook runs', async () =>
        invokeBash({ repo: repo.dir, command: 'cat package.json | jq' }),
      );

      then('the command passes, silent', () => {
        expect(res.code).toBe(0);
        expect(res.stderr).toBe('');
      });

      then('the silent pass matches snapshot', () => {
        expect({ code: res.code, stdout: res.stdout, stderr: res.stderr }).toMatchSnapshot();
      });
    });
  });

  given('[case7] a command whose only near words are weak fits', () => {
    const repo = useBeforeAll(async () => genHookRepo({ slug: 'cp-weak' }));

    when('[t0] the bot runs `du -sh dist` (`diff` shares letters, not sense)', () => {
      const res = useThen('the hook runs', async () =>
        invokeBash({ repo: repo.dir, command: 'du -sh dist' }),
      );

      then('no weak fit is offered; the part is novel', () => {
        expect(res.code).toBe(2);
        expect(res.stderr).not.toContain('[p] git diff');
        expect(res.stderr).toContain('no paved path fits this part');
      });

      then('the render matches snapshot', () => {
        expect(res.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case8] a read whose head resolves to an edit tool (vision case=8, sed)', () => {
    // its own allowlist: head and tail are paved here, so the read alternative can run
    const repo = useBeforeAll(async () =>
      genHookRepo({
        slug: 'cp-sed',
        allow: [...ALLOW, 'Bash(head:*)', 'Bash(tail:*)'],
      }),
    );

    when('[t0] the bot reads a line range with `sed -n 5,7p package.json`', () => {
      const res = useThen('the hook runs', async () =>
        invokeBash({ repo: repo.dir, command: 'sed -n 5,7p package.json' }),
      );

      then('a paved read is offered beside the edit tool', () => {
        expect(res.code).toBe(2);
        expect(res.stderr).toContain('─ paved alternatives for `sed`\n');
        expect(res.stderr).toContain('rhx sedreplace');
        expect(res.stderr).toContain('head -n <last> <file> | tail -n <count>');
      });

      then('the render matches snapshot', () => {
        expect(res.stderr).toMatchSnapshot();
      });
    });

    when('[t1] the bot reruns the paved read', () => {
      const res = useThen('the hook runs', async () =>
        invokeBash({ repo: repo.dir, command: 'head -n 7 package.json | tail -n 3' }),
      );

      then('the command passes, silent', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toBe('');
        expect(res.stderr).toBe('');
      });

      then('the silent pass matches snapshot', () => {
        expect({ code: res.code, stdout: res.stdout, stderr: res.stderr }).toMatchSnapshot();
      });
    });
  });

  given('[case9] the hook registered as an advisory (--mode SOFTNUDGE)', () => {
    const repo = useBeforeAll(async () => genHookRepo({ slug: 'cp-soft' }));

    when('[t0] the bot runs `grep -rn wave .`', () => {
      const res = useThen('the hook runs', async () =>
        invokeBash({
          repo: repo.dir,
          command: 'grep -rn wave .',
          args: ['--mode', 'SOFTNUDGE'],
        }),
      );

      then('the command is not blocked (exit 0)', () => {
        expect(res.code).toBe(0);
      });

      then('the advisory names the paved alternative, on stdout', () => {
        expect(res.stdout).toContain(
          '🐚 advisory: this command is not paved (SOFTNUDGE — the command still runs)',
        );
        expect(res.stdout).toContain('rhx grepsafe');
        expect(res.stdout).toContain(
          'advisory only: the command runs as-is, and no ledger row is recorded',
        );
        expect(res.stdout).not.toContain('ConstraintError');
      });

      then('no ledger is written', () => {
        const ledger = path.join(
          repo.dir,
          '.agent/.cache/repo=ehmpathy/role=mechanic/skill=check-permissions/nudges.jsonl',
        );
        expect(fs.existsSync(ledger)).toBe(false);
      });

      then('the advisory matches snapshot', () => {
        expect(res.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case10] more near misses than the cap of 21', () => {
    // the wish's headline promise: never the ~200-line dump, at most 21 candidates
    const repo = useBeforeAll(async () =>
      genHookRepo({
        slug: 'cp-cap',
        allow: Array.from({ length: 30 }, (_, index) => `Bash(git wave${index}:*)`),
      }),
    );

    when('[t0] the bot runs `gti swell` (30 patterns share the near head `git`)', () => {
      const res = useThen('the hook runs', async () =>
        invokeBash({ repo: repo.dir, command: 'gti swell' }),
      );

      then('exactly 21 candidates render, then the overflow line', () => {
        expect(res.code).toBe(2);
        const candidates = res.stderr
          .split('\n')
          .filter((line) => /─ \[[ep]\] git wave\d+/.test(line));
        expect(candidates).toHaveLength(21);
        expect(res.stderr).toContain('… and 9 more (see all: rhx permissions.get, below)');
      });

      then('the render matches snapshot', () => {
        expect(res.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case12] a `cd` part — a head with advice, never a command', () => {
    // the vision's commonest block: `cd` has no paved command, only the advice to run from the
    // cwd and pass paths
    const repo = useBeforeAll(async () => genHookRepo({ slug: 'cp-cd' }));

    when('[t0] the bot runs `cd src && git status`', () => {
      const res = useThen('the hook runs', async () =>
        invokeBash({ repo: repo.dir, command: 'cd src && git status' }),
      );

      then('only the `cd` part blocks, and its advice renders', () => {
        expect(res.code).toBe(2);
        expect(res.stderr).toContain('blocked: cd src');
        expect(res.stderr).toContain('run from the cwd');
        expect(res.stderr).not.toContain('blocked: git status');
      });

      then('the render matches snapshot', () => {
        expect(res.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case13] a shell loop — grammar parts, never commands', () => {
    // a loop's keywords are grammar, not commands to pave: the nudge must not push the bot to
    // pave `done`, and the command inside the body still gets its own answer
    const repo = useBeforeAll(async () => genHookRepo({ slug: 'cp-loop' }));

    when('[t0] the bot runs `for f in a b; do ls "$f"; done`', () => {
      const res = useThen('the hook runs', async () =>
        invokeBash({ repo: repo.dir, command: 'for f in a b; do ls "$f"; done' }),
      );

      then('the loop parts read as grammar, and the body names its alternatives', () => {
        expect(res.code).toBe(2);
        expect(res.stderr).toContain('shell grammar, not a command');
        expect(res.stderr).toContain('tree -L 1 <dir>');
      });

      then('the ledger holds a row for the body alone — loop words are no demand', () => {
        const rows = getLedgerRows({ repo: repo.dir });
        expect(rows.map((row) => row.kind)).toEqual(['alt']);
        expect(rows[0]?.head).toEqual('ls');
      });

      then('the render matches snapshot', () => {
        expect(res.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case14] a part whose words name a dotted skill (the dot-segment tier)', () => {
    // `git release` shares two words with the segments of `rhx git.release`
    const repo = useBeforeAll(async () =>
      genHookRepo({
        slug: 'cp-dot',
        allow: [...ALLOW, 'Bash(rhx git.release:*)'],
      }),
    );

    when('[t0] the bot runs `git release --watch`', () => {
      const res = useThen('the hook runs', async () =>
        invokeBash({ repo: repo.dir, command: 'git release --watch' }),
      );

      then('the dotted skill is offered', () => {
        expect(res.code).toBe(2);
        expect(res.stderr).toContain('[p] rhx git.release');
      });

      then('the render matches snapshot', () => {
        expect(res.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case11] the repo settings cannot be parsed', () => {
    const repo = useBeforeAll(async () => {
      const fresh = await genHookRepo({ slug: 'cp-settings-broken' });
      fs.writeFileSync(path.join(fresh.dir, '.claude', 'settings.json'), '{ broken');
      return fresh;
    });

    when('[t0] the bot runs a command the broken file would have allowed', () => {
      const res = useThen('the hook runs', async () =>
        invokeBash({ repo: repo.dir, command: 'git status' }),
      );

      then('the gate holds, and the render leads with the named malfunction', () => {
        expect(res.code).toBe(2);
        expect(res.stderr).toContain('💥 MalfunctionError: settings file unparseable: .claude/settings.json');
        expect(res.stderr).toContain('repair the json in that file');
      });

      then('the render matches snapshot', () => {
        // the jq parse text varies by jq version (1.6/1.7 lead with `jq: `, later builds drop
        // it), and the temp repo path varies by run; mask both, by shape
        expect(
          res.stderr
            .replace(/(?:jq: |(?=parse error)|(?=error \(at ))[^)]*\)/g, 'jq: <error>)')
            .replace(/\/\S*\.cp-settings-broken\.[0-9a-f]+/g, '<repo>'),
        ).toMatchSnapshot();
      });
    });

    when('[t1] the hook is registered as an advisory (--mode SOFTNUDGE)', () => {
      const res = useThen('the hook runs', async () =>
        invokeBash({
          repo: repo.dir,
          command: 'git status',
          args: ['--mode', 'SOFTNUDGE'],
        }),
      );

      then('the command still runs, and the malfunction reaches stderr too', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toContain('💥 MalfunctionError: settings file unparseable: .claude/settings.json');
        expect(res.stderr).toContain('💥 MalfunctionError: settings file unparseable: .claude/settings.json');
      });
    });
  });

  given('[case15] the nudge record holds no valid json', () => {
    const repo = useBeforeAll(async () => {
      const fresh = await genHookRepo({ slug: 'cp-record-broken' });
      fs.writeFileSync(
        path.join(fresh.dir, '.claude', 'permission.nudges.local.json'),
        '{ broken',
      );
      return fresh;
    });

    when('[t0] the bot runs an unpaved command', () => {
      const res = useThen('the hook runs', async () =>
        invokeBash({ repo: repo.dir, command: 'du -sh dist' }),
      );

      then('the block holds, and the record malfunction is named', () => {
        expect(res.code).toBe(2);
        expect(res.stderr).toContain('💥 MalfunctionError: ');
        expect(res.stderr).toContain('the nudge record could not be read');
        expect(res.stderr).toContain('blocked: du -sh dist');
      });
    });
  });

  given('[case16] a branch and a case — grammar parts, never commands', () => {
    // closers (`fi`, `done`, `esac`) and a case header render as grammar; an `if` / `while`
    // keyword is dropped, and its condition (`true`, `false`) keys as the command it is
    const repo = useBeforeAll(async () => genHookRepo({ slug: 'cp-branch' }));

    when('[t0] the bot runs an if-branch, a while-loop, and a case', () => {
      const res = useThen('the hook runs', async () =>
        invokeBash({
          repo: repo.dir,
          command:
            'if true; then ls; fi; while false; do ls; done; case wave in tide) ls ;; esac',
        }),
      );

      then('no grammar word is named a command to pave', () => {
        expect(res.code).toBe(2);
        expect(res.stderr).toContain('shell grammar, not a command');
        expect(res.stderr).not.toMatch(/blocked: (fi|done|esac)\n[^\n]*no paved path fits/);
      });

      then('a branch body keys on its command, not on `then` / `do`', () => {
        expect(res.stderr).toMatch(/blocked: then ls\n[^\n]*paved alternatives for `ls`/);
        expect(res.stderr).toMatch(/blocked: do ls\n[^\n]*paved alternatives for `ls`/);
      });

      then('the render matches snapshot', () => {
        expect(res.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case17] a part that only assigns a variable', () => {
    const repo = useBeforeAll(async () => genHookRepo({ slug: 'cp-assign' }));

    when('[t0] the bot runs `WAVE=big && git status`', () => {
      const res = useThen('the hook runs', async () =>
        invokeBash({ repo: repo.dir, command: 'WAVE=big && git status' }),
      );

      then('the assignment blocks as a sane part, with no crash', () => {
        expect(res.code).toBe(2);
        expect(res.stderr).toContain('blocked: WAVE=big');
        expect(res.stderr).not.toContain('blocked: git status');
        expect(res.stderr).not.toContain('bad subscript');
      });

      then('the render matches snapshot', () => {
        expect(res.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case19] the built hook ships without its inventory beside it', () => {
    /**
     * .mock = the hook's location: the BUILT hook and every `*.lib.sh` and `*.operations.sh` beside it, copied byte
     *         for byte out of the linked role into a dir that lacks the inventory. no file is
     *         rewritten; only the inventory is left behind
     * .why = the linked role is a symlink into this repo's `dist/`, shared by every suite and
     *        the live session. to delete the inventory there would break each other run
     * .real = every other journey in this suite runs the linked hook in place via `invokeHook`;
     *         the inventory-absent render itself is clamped at integration grain (`[case35]`, the inventory file)
     */
    const scene = useBeforeAll(async () => {
      const repo = await genHookRepo({ slug: 'cp-no-inventory' });
      const builtDir = path.join(
        repo.dir,
        '.agent/repo=ehmpathy/role=mechanic/inits/claude.hooks',
      );
      const copyDir = path.join(repo.dir, '.hook-without-inventory');
      fs.mkdirSync(copyDir);
      fs.readdirSync(builtDir)
        .filter(
          (name) =>
            name === HOOK ||
            (name.startsWith('_') && name.endsWith('.lib.sh')) ||
            name.endsWith('.operations.sh'),
        )
        .forEach((name) =>
          fs.copyFileSync(path.join(builtDir, name), path.join(copyDir, name)),
        );
      return { repo: repo.dir, hook: path.join(copyDir, HOOK) };
    });

    when('[t0] the bot runs an unpaved command', () => {
      const res = useThen('the hook runs', async () => {
        // pin the user layer and drop the config dir, so the runner's own settings never leak in
        const { CLAUDE_CONFIG_DIR: _configDirOfRunner, ...envOfRunner } = process.env;
        const result = spawnSync('bash', [scene.hook], {
          cwd: scene.repo,
          encoding: 'utf-8',
          env: { ...envOfRunner, HOME: '/nonexistent-home' },
          input: JSON.stringify({
            tool_name: 'Bash',
            tool_input: { command: 'du -sh dist' },
          }),
        });
        return { code: result.status ?? 1, stderr: result.stderr ?? '' };
      });

      then('the block holds, and the absent inventory is named', () => {
        expect(res.code).toBe(2);
        expect(res.stderr).toContain('inventory file absent: commands.alternatives.jsonc');
        expect(res.stderr).toContain('no paved path known — the inventory could not be read');
        expect(res.stderr).not.toContain('no paved path fits this part');
      });

      then('the render matches snapshot', () => {
        expect(res.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case20] a lookalike binary under a single-word prefix (`Bash(rhx:*)`)', () => {
    // a prefix matches at a word boundary only: `rhx:*` paves `rhx foo`, never `rhxploit`
    const repo = useBeforeAll(async () => genHookRepo({ slug: 'cp-lookalike' }));

    when('[t0] the bot runs `rhxploit --reef`', () => {
      const res = useThen('the hook runs', async () =>
        invokeBash({ repo: repo.dir, command: 'rhxploit --reef' }),
      );

      then('the gate blocks it', () => {
        expect(res.code).toBe(2);
        expect(res.stderr).toContain('blocked: rhxploit --reef');
      });
    });

    when('[t1] the bot runs `rhx grepsafe --pattern wave`', () => {
      const res = useThen('the hook runs', async () =>
        invokeBash({ repo: repo.dir, command: 'rhx grepsafe --pattern wave' }),
      );

      then('the paved command still passes, silent', () => {
        expect(res.code).toBe(0);
        expect(res.stderr).toBe('');
      });
    });
  });

  given('[case18] a rich part beside a light one, under the cap of 21', () => {
    // a fixed ceil(21/2) split would starve the rich part at 11; the light part's spare goes to it
    const repo = useBeforeAll(async () =>
      genHookRepo({
        slug: 'cp-budget',
        allow: Array.from({ length: 30 }, (_, index) => `Bash(git wave${index}:*)`),
      }),
    );

    when('[t0] the bot runs `gti swell && du -sh dist`', () => {
      const res = useThen('the hook runs', async () =>
        invokeBash({ repo: repo.dir, command: 'gti swell && du -sh dist' }),
      );

      then('the rich part gets more than an even split, and the total stays at most 21', () => {
        expect(res.code).toBe(2);
        const candidates = res.stderr
          .split('\n')
          .filter((line) => /─ \[[ep]\] git wave\d+/.test(line));
        expect(candidates.length).toBeGreaterThan(11);
        expect(candidates.length).toBeLessThanOrEqual(21);
      });

      then('the render matches snapshot', () => {
        expect(res.stderr).toMatchSnapshot();
      });
    });
  });
});
