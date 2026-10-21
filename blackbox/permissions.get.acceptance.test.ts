import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestDir } from './.test/invokeHook';
import { setFixtureLayoutOld } from './.test/setFixtureLayoutOld';
import { writeFixtureFile } from './.test/writeFixtureFile';

/**
 * .what = acceptance tests for `rhx permissions.get`, run via rhachet against the linked role
 * .why = the nudge's move 1 tells a blocked bot to run this exact command; rhachet must find
 *        it, it must find the hook beside it in the linked role, and it must answer
 */

/**
 * .what = a linked repo with an allowlist written
 * .note = returns an object: useBeforeAll proxies its value
 */
const genSkillRepo = async (input: { slug: string }): Promise<{ dir: string }> => {
  const dir = await genTestDir({ slug: input.slug });
  setFixtureLayoutOld({ dir });
  writeFixtureFile({
    dir,
    relPath: '.claude/settings.json',
    content: JSON.stringify({
      permissions: {
        allow: ['Bash(rhx:*)', 'Bash(tree:*)', 'Bash(git status:*)', 'Bash(git diff:*)'],
        deny: [],
        ask: [],
      },
    }),
  });
  return { dir };
};

/**
 * .what = run the skill the way the nudge tells the bot to: through rhachet
 * .note = the skill reads the user layer ($HOME/.claude) and the config dir ($CLAUDE_CONFIG_DIR);
 *         both are pinned so the runner's own settings never leak in (rule.require.hermetic-tests).
 *         HOME points at an empty dir in the repo, and npm keeps the runner's cache, so npx still runs
 */
const runViaRhachet = (input: {
  dir: string;
  args: string[];
}): { stdout: string; stderr: string; code: number } => {
  // drop the runner's config dir and pin HOME inside the fixture, so the runner's own user
  // layer ($HOME/.claude) never leaks in (rule.require.hermetic-tests)
  const { CLAUDE_CONFIG_DIR: _configDirOmitted, ...envRunner } = process.env;
  const homeHermetic = path.join(input.dir, '.home-hermetic');
  fs.mkdirSync(homeHermetic, { recursive: true });
  const result = spawnSync(
    'npx',
    ['rhachet', 'run', '--skill', 'permissions.get', ...input.args],
    {
      cwd: input.dir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...envRunner,
        HOME: homeHermetic,
        npm_config_cache:
          process.env.npm_config_cache ?? path.join(os.homedir(), '.npm'),
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
  input.stdout.slice(Math.max(0, input.stdout.indexOf('🐢 heres the wave')));

describe('permissions.get (acceptance)', () => {
  given('[case1] a linked repo with an allowlist', () => {
    const repo = useBeforeAll(async () => genSkillRepo({ slug: 'pg-linked' }));

    when("[t0] the bot runs move 1: `rhx permissions.get --for 'ls src'`", () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: repo.dir, args: ['--for', 'ls src'] }),
      );

      then('the hook beside the skill answers: blocked, with paved alternatives', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toContain("🐚 permissions.get --for 'ls src'");
        expect(res.stdout).toContain('├─ blocked: ls src');
        expect(res.stdout).toContain('tree -L 1 <dir>');
      });

      then('the lookup writes no nudge record', () => {
        expect(
          fs.existsSync(
            path.join(repo.dir, '.claude', 'permission.nudges.local.json'),
          ),
        ).toBe(false);
      });

      then('the lookup writes no ledger row', () => {
        // the vision's lookup contract: no nudge record AND no ledger row — a lookup is not
        // demand, so it must never inflate what `rhx permissions.nudges` reports
        expect(
          fs.existsSync(
            path.join(
              repo.dir,
              '.agent/.cache/repo=ehmpathy/role=mechanic/skill=check-permissions/nudges.jsonl',
            ),
          ),
        ).toBe(false);
      });

      then('the render matches snapshot', () => {
        expect(asSkillRender({ stdout: res.stdout })).toMatchSnapshot();
      });
    });

    when('[t1] the bot runs the bare skill', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: repo.dir, args: [] }),
      );

      then('every head renders, grouped', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toContain('total: 4 pre-approved (dupes removed)');
        expect(res.stdout).toContain('git (2)');
      });

      then('the render matches snapshot', () => {
        expect(asSkillRender({ stdout: res.stdout })).toMatchSnapshot();
      });
    });

    when('[t2] the bot runs `rhx permissions.get --head grep`', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: repo.dir, args: ['--head', 'grep'] }),
      );

      then('the inventory beside the hook supplies the paved alternatives', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toContain("rhx grepsafe --pattern '<regex>' --path <dir>");
      });

      then('the render matches snapshot', () => {
        expect(asSkillRender({ stdout: res.stdout })).toMatchSnapshot();
      });
    });

    when("[t3] the bot asks about a pre-approved command: `rhx permissions.get --for 'git status'`", () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: repo.dir, args: ['--for', 'git status'] }),
      );

      then('the hook beside the skill answers: pre-approved', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toContain(
          'verdict: pre-approved — every part matches the allowlist; it runs with no prompt',
        );
        expect(res.stdout).not.toContain('blocked:');
      });

      then('the render matches snapshot', () => {
        expect(asSkillRender({ stdout: res.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case3] `--for` answers as the hook does, for each verdict shape', () => {
    // `--for` asks the hook itself (--mode LOOKUP), so the two cannot disagree; each shape is
    // proven through the linked role, not only the `alt` and pre-approved ones
    const repo = useBeforeAll(async () => genSkillRepo({ slug: 'pg-parity' }));

    when("[t0] a typo: `rhx permissions.get --for 'gti status'`", () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: repo.dir, args: ['--for', 'gti status'] }),
      );

      then('the lookup offers the near paved pattern', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toContain('did you mean?');
        expect(res.stdout).toContain('git status');
      });
    });

    when("[t1] a novel command: `rhx permissions.get --for 'du -sh dist'`", () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: repo.dir, args: ['--for', 'du -sh dist'] }),
      );

      then('the lookup says no paved path fits', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toContain('no paved path fits');
      });
    });

    when("[t2] a compound: `rhx permissions.get --for 'ls src && git status'`", () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: repo.dir, args: ['--for', 'ls src && git status'] }),
      );

      then('only the unpaved part is named, with its alternatives', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toContain('blocked: ls src');
        expect(res.stdout).not.toContain('blocked: git status');
      });
    });
  });

  given('[case4] more near misses than the block path\'s cap of 21', () => {
    // the lookup's promise: every candidate ranked, no cap — the inverse of the block's 21
    const repo = useBeforeAll(async () => {
      const fresh = await genSkillRepo({ slug: 'pg-nocap' });
      writeFixtureFile({
        dir: fresh.dir,
        relPath: '.claude/settings.json',
        content: JSON.stringify({
          permissions: {
            allow: Array.from({ length: 30 }, (_, index) => `Bash(git wave${index}:*)`),
            deny: [],
            ask: [],
          },
        }),
      });
      return fresh;
    });

    when("[t0] the bot runs `rhx permissions.get --for 'gti swell'`", () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: repo.dir, args: ['--for', 'gti swell'] }),
      );

      then('all 30 candidates render, with no overflow line', () => {
        expect(res.code).toBe(0);
        const candidates = res.stdout
          .split('\n')
          .filter((line) => /─ \[[ep]\] git wave\d+/.test(line));
        expect(candidates).toHaveLength(30);
        expect(res.stdout).not.toContain('more (see all');
      });
    });
  });

  given('[case5] a linked repo with no .claude dir', () => {
    const repo = useBeforeAll(async () => {
      const fresh = await genSkillRepo({ slug: 'pg-no-claude' });
      fs.rmSync(path.join(fresh.dir, '.claude'), { recursive: true, force: true });
      return fresh;
    });

    when('[t0] the bot runs the bare skill', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: repo.dir, args: [] }),
      );

      then('the skill says no allowlist was found', () => {
        expect(res.stdout).toContain('no .claude/ dir found');
      });
    });

    when("[t1] the bot runs `rhx permissions.get --for 'ls src'`", () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: repo.dir, args: ['--for', 'ls src'] }),
      );

      then('the hook answers that no allowlist applies, exit 0', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toContain('no .claude/ dir found');
      });
    });
  });

  given('[case2] a linked repo whose settings.json cannot be parsed', () => {
    const repo = useBeforeAll(async () => {
      const fresh = await genSkillRepo({ slug: 'pg-broken' });
      writeFixtureFile({ dir: fresh.dir, relPath: '.claude/settings.json', content: '{ broken' });
      return fresh;
    });

    when('[t0] the bot runs the bare skill', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: repo.dir, args: [] }),
      );

      then('the lookup names the broken file on both streams', () => {
        expect(res.stdout).toContain('💥 MalfunctionError: ');
        expect(res.stdout).toContain('settings.json');
        expect(res.stderr).toContain('💥 MalfunctionError: ');
      });

      then("the real jq's parse cause is named, not dropped", () => {
        // no mock here: the host's own jq parses the broken file. the snapshot below masks
        // the cause's TEXT (it varies by jq version), so this pins that a cause is present
        expect(res.stdout).toMatch(/\(jq: [^)]+\)|\((?:parse error|jq)[^)]+\)/);
      });

      then('the malfunction matches snapshot', () => {
        // the jq parse text varies by jq version; it is the one volatile piece
        expect(
          res.stdout
            .slice(Math.max(0, res.stdout.indexOf('💥')))
            .replace(/\(jq: [^)]*\)|\((?:parse error|jq)[^)]*\)/g, '(<jq error>)'),
        ).toMatchSnapshot();
      });
    });
  });
});
