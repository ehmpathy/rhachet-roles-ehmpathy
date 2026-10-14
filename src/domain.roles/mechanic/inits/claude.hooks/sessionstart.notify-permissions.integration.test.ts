import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = integration tests for sessionstart.notify-permissions.sh
 * .why = the boot notice shows each pre-approved head with a count, from both settings files,
 *        and points to `rhx permissions.get` — the full list scrolls out of context, the lookup
 *        does not
 * .note = the auto-decide sections of the notice are pinned in
 *         permissionrequest.decide-permissions.integration.test.ts (case11)
 */
describe('sessionstart.notify-permissions.sh', () => {
  const scriptPath = path.join(__dirname, 'sessionstart.notify-permissions.sh');

  /**
   * .what = run the notice in a temp repo with the given settings files
   * .note = returns an object: useBeforeAll proxies its value
   */
  const runNotice = (input: {
    settings: string | null;
    settingsLocal: string | null;
  }): { stdout: string; stderr: string; exitCode: number } => {
    const dir = genTempDir({ slug: 'sessionstart-notice' });
    if (input.settings !== null || input.settingsLocal !== null)
      fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
    if (input.settings !== null)
      fs.writeFileSync(
        path.join(dir, '.claude', 'settings.json'),
        input.settings,
      );
    if (input.settingsLocal !== null)
      fs.writeFileSync(
        path.join(dir, '.claude', 'settings.local.json'),
        input.settingsLocal,
      );
    // .why = the notice reads its allowlist from $CLAUDE_CONFIG_DIR when set, and its user layer
    //        from $HOME/.claude; a runner inside a claude actor carries the one and a real home
    //        the other, so drop the first and pin the second, or the notice reads the host's lists
    const { CLAUDE_CONFIG_DIR: _runnerConfigDir, ...envRunner } = process.env;
    const result = spawnSync('bash', [scriptPath], {
      cwd: dir,
      env: { ...envRunner, HOME: '/nonexistent-home' },
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // the temp repo path changes per run, and the hook may print it resolved past the temp
    // symlink; mask it by its slug shape so a snapshot pins only the structure
    const asTempDirMasked = (text: string): string =>
      text
        .split(dir)
        .join('<repo>')
        .replace(/\/\S*\.sessionstart-notice\.[0-9a-f]+/g, '<repo>');
    return {
      stdout: asTempDirMasked(result.stdout ?? ''),
      stderr: asTempDirMasked(result.stderr ?? ''),
      exitCode: result.status ?? 1,
    };
  };

  /**
   * .what = the pre-approved section of the notice, up to the auto-decide section
   */
  const asPreapprovedSection = (input: { stdout: string }): string =>
    input.stdout.split('🐚 auto-decided permission prompts')[0] ?? '';

  given('[case1] both settings files hold Bash permissions', () => {
    when('[t0] a session starts', () => {
      const res = useBeforeAll(async () =>
        runNotice({
          settings: JSON.stringify({
            permissions: {
              allow: ['Bash(git status:*)', 'Bash(git diff:*)', 'Bash(rhx:*)'],
            },
          }),
          settingsLocal: JSON.stringify({
            permissions: { allow: ['Bash(git status:*)', 'Bash(tree:*)'] },
          }),
        }),
      );

      then('it counts the union, deduped, by head', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain(
          '4 commands pre-approved, across 3 heads — no permission prompt for any of them',
        );
        expect(res.stdout).toContain('│  ├─ git (2)');
        expect(res.stdout).toContain('│  └─ tree (1)');
      });

      then('it never lists the patterns themselves', () => {
        expect(res.stdout).not.toContain('git status');
      });

      then('it points to the on-demand lookup', () => {
        expect(res.stdout).toContain("rhx permissions.get --for '<command>'");
      });

      then('the pre-approved section matches snapshot', () => {
        expect(asPreapprovedSection({ stdout: res.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case2] settings.json is not valid json', () => {
    when('[t0] a session starts', () => {
      const res = useBeforeAll(async () =>
        runNotice({
          settings: '{ broken',
          settingsLocal: JSON.stringify({
            permissions: { allow: ['Bash(tree:*)'] },
          }),
        }),
      );

      then('the broken file is named, never dropped in silence', () => {
        // clamp: the notice once read each file with `2>/dev/null || true`, so a broken
        //        settings.json vanished from the count with no word of why
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain(
          '💥 MalfunctionError: .claude/settings.json is not valid json',
        );
      });

      then('the malfunction reaches stderr too', () => {
        // clamp: the malfunction once reached stdout only, so a stream consumer saw silence
        expect(res.stderr).toContain(
          '💥 MalfunctionError: .claude/settings.json is not valid json',
        );
      });

      then('the readable file still counts', () => {
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

  given('[case3] no .claude dir', () => {
    when('[t0] a session starts', () => {
      const res = useBeforeAll(async () =>
        runNotice({ settings: null, settingsLocal: null }),
      );

      then('the notice is silent, exit 0', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toBe('');
      });

      then('the silent pass matches snapshot', () => {
        expect({
          code: res.exitCode,
          stdout: res.stdout,
          stderr: res.stderr,
        }).toMatchSnapshot();
      });
    });
  });

  given('[case4] both settings files are not valid json', () => {
    when('[t0] a session starts', () => {
      const res = useBeforeAll(async () =>
        runNotice({ settings: '{ broken', settingsLocal: '{ also broken' }),
      );

      then('both broken files are named, neither erases the other', () => {
        // clamp: the malfunction was once assigned, not appended, so the second broken
        //        file erased the first and the reader was told only one was broken
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain('.claude/settings.json is not valid json');
        expect(res.stdout).toContain(
          '.claude/settings.local.json is not valid json',
        );
      });

      then('the pre-approved section matches snapshot', () => {
        // the jq parse error text varies by jq version; it is the one volatile piece
        expect(
          asPreapprovedSection({ stdout: res.stdout }).replace(
            /is not valid json \(.*?\)/g,
            'is not valid json (<jq error>)',
          ),
        ).toMatchSnapshot();
      });
    });
  });
});
