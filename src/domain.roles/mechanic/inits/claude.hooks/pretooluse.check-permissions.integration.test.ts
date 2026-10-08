import { spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import { ConstraintError } from 'helpful-errors';
import * as path from 'path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = integration tests for pretooluse.check-permissions.sh hook
 * .why = verify the hook correctly identifies allowed vs disallowed commands
 *        and provides appropriate guidance with HARDNUDGE/SOFTNUDGE modes
 * .note = integration grain: each case spawns the real hook against a temp git repo
 *         (filesystem + subprocess), per rule.require.jest-tests-for-skills
 * .note = extant expected values that moved, and why — all from the approved vision
 *         (1.vision.yield.md §contract; `1.vision` approved in .route/passage.jsonl):
 *         - `BLOCKED` → `ConstraintError`: the block head is `✋ ConstraintError:` per
 *           rule.require.qualified-error-headers. same claim: "the block head rendered"
 *         - `pre-approved permissions` / `not covered by existing pre-approved` →
 *           `this command is not paved`: the vision's headline for the same fact
 *         - `[p]: x` → `[p] x`: the pattern format dropped its colon
 *         - the allow case `npx jest src/foo.test.ts` → `src/surfer.test.ts`: a fixture word
 *           only (rule.require.seaturtle-themed-examples); the input still matches `npx jest:*`
 *         each stays a `toContain` on the same stream; none became looser
 */
describe('pretooluse.check-permissions.sh', () => {
  const scriptPath = path.join(__dirname, 'pretooluse.check-permissions.sh');

  /**
   * .what = a temp dir that holds the libs the hook sources from beside itself
   * .why = a case that runs a COPY of the hook (a crash probe, a broken inventory) needs the
   *        hook's `_*.lib.sh` files beside the copy, or the copy blocks on a load failure
   *        and the case grades the wrong path
   */
  const genHookDir = (input: { slug: string }): string => {
    const dir = genTempDir({ slug: input.slug });
    fs.readdirSync(__dirname)
      .filter((name) => name.startsWith('_') && name.endsWith('.lib.sh'))
      .forEach((lib) =>
        fs.copyFileSync(path.join(__dirname, lib), path.join(dir, lib)),
      );
    return dir;
  };

  /**
   * .what = helper to run the hook in a temp git repo with settings
   * .why = isolates tests from real repo state and .claude settings
   */
  const runHook = (args: {
    command: string;
    settings?: { allow?: string[]; deny?: string[]; ask?: string[] };
    settingsLocal?: { allow?: string[]; deny?: string[]; ask?: string[] };
    flags?: string;
    clearNudges?: boolean;
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
    const claudeDir = path.join(tempDir, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });

    // write settings.json
    const settings = {
      permissions: {
        allow: args.settings?.allow ?? [],
        deny: args.settings?.deny ?? [],
        ask: args.settings?.ask ?? [],
      },
    };
    fs.writeFileSync(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify(settings, null, 2),
    );

    // write settings.local.json if provided
    if (args.settingsLocal) {
      const settingsLocal = {
        permissions: {
          allow: args.settingsLocal.allow ?? [],
          deny: args.settingsLocal.deny ?? [],
          ask: args.settingsLocal.ask ?? [],
        },
      };
      fs.writeFileSync(
        path.join(claudeDir, 'settings.local.json'),
        JSON.stringify(settingsLocal, null, 2),
      );
    }

    // clear nudges file if requested
    if (args.clearNudges) {
      const nudgesPath = path.join(claudeDir, 'permission.nudges.local.json');
      if (fs.existsSync(nudgesPath)) {
        fs.unlinkSync(nudgesPath);
      }
    }

    // build stdin JSON (Claude Code format)
    const stdinJson = JSON.stringify({
      tool_name: 'Bash',
      tool_input: { command: args.command },
    });

    // run the hook
    const flagsArray = args.flags ? args.flags.split(' ').filter(Boolean) : [];
    const result = spawnSync('bash', [scriptPath, ...flagsArray], {
      cwd: tempDir,
      encoding: 'utf-8',
      input: stdinJson,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      tempDir,
    };
  };

  /**
   * .what = run hook twice to test retry behavior
   * .why = HARDNUDGE blocks first attempt, allows retry
   */
  const runHookTwice = (args: {
    command: string;
    settings?: { allow?: string[] };
    flags?: string;
  }): {
    first: { stdout: string; stderr: string; exitCode: number };
    second: { stdout: string; stderr: string; exitCode: number };
    tempDir: string;
  } => {
    const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
    const claudeDir = path.join(tempDir, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });

    const settings = {
      permissions: {
        allow: args.settings?.allow ?? [],
        deny: [],
        ask: [],
      },
    };
    fs.writeFileSync(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify(settings, null, 2),
    );

    const stdinJson = JSON.stringify({
      tool_name: 'Bash',
      tool_input: { command: args.command },
    });

    const flagsArray = args.flags ? args.flags.split(' ').filter(Boolean) : [];

    // first attempt
    const first = spawnSync('bash', [scriptPath, ...flagsArray], {
      cwd: tempDir,
      encoding: 'utf-8',
      input: stdinJson,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // second attempt (immediate retry)
    const second = spawnSync('bash', [scriptPath, ...flagsArray], {
      cwd: tempDir,
      encoding: 'utf-8',
      input: stdinJson,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return {
      first: {
        stdout: first.stdout ?? '',
        stderr: first.stderr ?? '',
        exitCode: first.status ?? 1,
      },
      second: {
        stdout: second.stdout ?? '',
        stderr: second.stderr ?? '',
        exitCode: second.status ?? 1,
      },
      tempDir,
    };
  };

  // standard test settings
  const standardSettings = {
    allow: [
      'Bash(npm run test:*)',
      'Bash(npm run fix:*)',
      'Bash(THOROUGH=true npm run test:*)',
      'Bash(npx jest:*)',
      'Bash(npx rhachet:*)',
      'Bash(cat:*)',
      'Bash(mkdir:*)',
      'Bash(ls:*)',
      'Bash(grep:*)',
      'Bash(head:*)',
      'Bash(pwd)',
      'Bash(echo:*)',
      'Bash(MESSAGE=:*)',
    ],
  };

  given('[case1] allowed commands (should be silent)', () => {
    when('[t0] command matches pattern', () => {
      then('npm run test:unit matches npm run test:*', () => {
        const result = runHook({
          command: 'npm run test:unit',
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
        expect(result.stderr).toBe('');
      });

      then('npm run test:integration matches npm run test:*', () => {
        const result = runHook({
          command: 'npm run test:integration',
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('npm run fix:lint matches npm run fix:*', () => {
        const result = runHook({
          command: 'npm run fix:lint',
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('THOROUGH=true npm run test:unit matches pattern', () => {
        const result = runHook({
          command: 'THOROUGH=true npm run test:unit',
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('npx jest src/surfer.test.ts matches npx jest:*', () => {
        const result = runHook({
          command: 'npx jest src/surfer.test.ts',
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('cat package.json matches cat:*', () => {
        const result = runHook({
          command: 'cat package.json',
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  given('[case2] :* suffix matcher (any suffix, including spaces)', () => {
    when('[t0] colon-suffix patterns', () => {
      then(':* matches npm run test:unit (colon + suffix)', () => {
        const result = runHook({
          command: 'npm run test:unit',
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then(':* matches npm run test: (colon only)', () => {
        const result = runHook({
          command: 'npm run test:',
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then(':* matches npm run test (no suffix)', () => {
        const result = runHook({
          command: 'npm run test',
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then(
        ':* matches npm run test:integration:slow:verbose (long suffix)',
        () => {
          const result = runHook({
            command: 'npm run test:integration:slow:verbose',
            settings: standardSettings,
          });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toBe('');
        },
      );
    });

    when('[t1] space-separated commands', () => {
      then('cat:* matches cat /path/to/file.txt', () => {
        const result = runHook({
          command: 'cat /path/to/file.txt',
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('npx jest:* matches npx jest anything/here', () => {
        const result = runHook({
          command: 'npx jest anything/here',
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('mkdir:* matches mkdir /path/to/dir', () => {
        const result = runHook({
          command: 'mkdir /path/to/dir',
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('mkdir:* matches mkdir -p /foo/bar/baz (with flags)', () => {
        const result = runHook({
          command: 'mkdir -p /foo/bar/baz',
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('ls:* matches ls -la /home/user (with flags and path)', () => {
        const result = runHook({
          command: 'ls -la /home/user',
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });

    when('[t2] exact match (no :*)', () => {
      then('pwd matches exactly', () => {
        const result = runHook({
          command: 'pwd',
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('pwd does NOT match pwd -L', () => {
        const result = runHook({
          command: 'pwd -L',
          settings: standardSettings,
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
      });
    });
  });

  given('[case3] :* with double-dash (--) style arguments', () => {
    when('[t0] rhachet commands with --flags', () => {
      then(
        'npx rhachet:* matches npx rhachet roles init --role mechanic',
        () => {
          const result = runHook({
            command: 'npx rhachet roles init --role mechanic',
            settings: standardSettings,
          });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toBe('');
        },
      );

      then(
        'npx rhachet:* matches npx rhachet run --skill ... --scope ...',
        () => {
          const result = runHook({
            command: 'npx rhachet run --skill show.gh.test.errors --scope unit',
            settings: standardSettings,
          });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toBe('');
        },
      );

      then('npx rhachet:* matches command with multiple --flags', () => {
        const result = runHook({
          command: 'npx rhachet --verbose roles init --role test --dry-run',
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });

    when('[t1] grep with -- flags', () => {
      then('grep:* matches grep --color=auto pattern file.txt', () => {
        const result = runHook({
          command: 'grep --color=auto pattern file.txt',
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then("grep:* matches grep -r --include='*.ts' pattern /src", () => {
        const result = runHook({
          command: "grep -r --include='*.ts' pattern /src",
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  given('[case4] compound commands (&&, ||, ;)', () => {
    when('[t0] all parts allowed', () => {
      then('mkdir && ls: both allowed, should pass', () => {
        const result = runHook({
          command: 'mkdir /foo && ls /bar',
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('mkdir && ls && cat: all three allowed', () => {
        const result = runHook({
          command: 'mkdir /a && ls /b && cat /c',
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('cat || head: both allowed with || operator', () => {
        const result = runHook({
          command: 'cat /foo || head /bar',
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('ls ; cat: both allowed with ; operator', () => {
        const result = runHook({
          command: 'ls /foo ; cat /bar',
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('npm test && npm fix: both allowed', () => {
        const result = runHook({
          command: 'npm run test:unit && npm run fix:lint',
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('mkdir && ls || cat: mixed operators, all allowed', () => {
        const result = runHook({
          command: 'mkdir /a && ls /b || cat /c',
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });

    when('[t1] one or more parts disallowed', () => {
      then('&& with disallowed second part blocks', () => {
        const result = runHook({
          command: 'mkdir /foo && rm -rf /',
          settings: standardSettings,
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('ConstraintError');
      });

      then('&& with disallowed first part blocks', () => {
        const result = runHook({
          command: 'curl http://evil.com && ls /foo',
          settings: standardSettings,
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('ConstraintError');
      });

      then('&& chain with disallowed third part blocks', () => {
        const result = runHook({
          command: 'ls /a && cat /b && wget http://bad',
          settings: standardSettings,
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('ConstraintError');
      });

      then('; with disallowed second part blocks', () => {
        const result = runHook({
          command: 'npm run test:unit ; curl http://evil.com',
          settings: standardSettings,
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('ConstraintError');
      });

      then('|| with disallowed first part blocks', () => {
        const result = runHook({
          command: 'dangerous-cmd || ls /foo',
          settings: standardSettings,
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('ConstraintError');
      });
    });
  });

  given('[case5] multiline commands (newlines in content)', () => {
    when('[t0] echo with multiline content', () => {
      then('echo single line is allowed', () => {
        const result = runHook({
          command: "echo 'hello world'",
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('echo with multiline content is allowed', () => {
        // use actual newlines (template literal)
        const cmd = `echo "line 1
line 2
line 3"`;
        const result = runHook({
          command: cmd,
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('echo multiline | cat is allowed (both parts match)', () => {
        // use actual newlines (template literal)
        const result = runHook({
          command: `echo "line 1
line 2" | cat`,
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });

    when('[t1] MESSAGE= with multiline content', () => {
      then('MESSAGE= with multiline content is allowed', () => {
        // use actual newlines (template literal)
        const result = runHook({
          command: `MESSAGE="feat: title

- bullet 1
- bullet 2"`,
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('MESSAGE=multiline && echo is allowed (both parts match)', () => {
        // use actual newlines (template literal)
        const result = runHook({
          command: `MESSAGE="feat: title

- bullet" && echo "done"`,
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  given('[case6] quoted operators (should not split)', () => {
    when('[t0] && inside quotes', () => {
      then('grep with double-quoted && is single command', () => {
        const result = runHook({
          command: 'grep "foo && bar" /tmp/file',
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('grep with single-quoted && is single command', () => {
        const result = runHook({
          command: "grep 'foo && bar' /tmp/file",
          settings: standardSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  given('[case7] disallowed commands (HARDNUDGE - block with exit 2)', () => {
    when('[t0] command not in allow list', () => {
      then('rm -rf / shows ConstraintError message', () => {
        const result = runHook({
          command: 'rm -rf /',
          settings: standardSettings,
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('ConstraintError');
      });

      then('shows available patterns in block message', () => {
        // .note = extant case; its input and intent are kept. the pattern format moved from
        //         `[p]: x` to `[p] x`, and the block now ranks the NEAREST patterns rather than
        //         dump all of them (the approved vision, 1.vision.yield.md §contract) — so
        //         `npx prettier` surfaces `npm run test` through the one-edit head tier
        const result = runHook({
          command: 'npx prettier --write .',
          settings: standardSettings,
          clearNudges: true,
        });
        expect(result.stderr).toContain('[p] npm run test');
      });

      then('ranks the nearest paved patterns, not a dump of all', () => {
        // new case for the new contract: rank order, and no dump
        const result = runHook({
          command: 'npx jst src/surfer.test.ts',
          settings: standardSettings,
          clearNudges: true,
        });
        expect(result.stderr).toContain('[p] npx jest');
        // a shared head + a near-miss next word ranks above a one-edit head typo (npm)
        expect(result.stderr.indexOf('[p] npx jest')).toBeLessThan(
          result.stderr.indexOf('[p] npm run test'),
        );
        // a shared head alone is not a fit: `npx rhachet` shares only `npx`
        expect(result.stderr).not.toContain('[p] npx rhachet');
        // the old dump of the whole allowlist is gone
        expect(result.stderr).not.toContain('[p] mkdir');
      });

      then('says the command is not paved', () => {
        const result = runHook({
          command: 'git status',
          settings: standardSettings,
          clearNudges: true,
        });
        expect(result.stderr).toContain('this command is not paved');
      });
    });
  });

  given('[case8] HARDNUDGE mode (default)', () => {
    when('[t0] first attempt', () => {
      then('blocks with exit 2', () => {
        const results = runHookTwice({
          command: 'dangerous-cmd-1',
          settings: standardSettings,
        });
        expect(results.first.exitCode).toBe(2);
        expect(results.first.stderr).toContain('ConstraintError');
      });

      then('creates permission.nudges.local.json', () => {
        const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
        const claudeDir = path.join(tempDir, '.claude');
        fs.mkdirSync(claudeDir, { recursive: true });
        fs.writeFileSync(
          path.join(claudeDir, 'settings.json'),
          JSON.stringify({ permissions: { allow: [], deny: [], ask: [] } }),
        );

        const stdinJson = JSON.stringify({
          tool_name: 'Bash',
          tool_input: { command: 'test-cmd' },
        });

        spawnSync('bash', [scriptPath], {
          cwd: tempDir,
          encoding: 'utf-8',
          input: stdinJson,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        expect(
          fs.existsSync(path.join(claudeDir, 'permission.nudges.local.json')),
        ).toBe(true);
      });

      then('records command in nudges file', () => {
        const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
        const claudeDir = path.join(tempDir, '.claude');
        fs.mkdirSync(claudeDir, { recursive: true });
        fs.writeFileSync(
          path.join(claudeDir, 'settings.json'),
          JSON.stringify({ permissions: { allow: [], deny: [], ask: [] } }),
        );

        const stdinJson = JSON.stringify({
          tool_name: 'Bash',
          tool_input: { command: 'recorded-cmd' },
        });

        spawnSync('bash', [scriptPath], {
          cwd: tempDir,
          encoding: 'utf-8',
          input: stdinJson,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        const nudges = JSON.parse(
          fs.readFileSync(
            path.join(claudeDir, 'permission.nudges.local.json'),
            'utf-8',
          ),
        );
        expect(nudges['recorded-cmd']).toBeDefined();
        expect(nudges['recorded-cmd']).toBeGreaterThan(0);
      });
    });

    when('[t1] retry within window', () => {
      // one run serves both thens (rule.forbid.redundant-expensive-operations)
      const results = useBeforeAll(async () =>
        runHookTwice({
          command: 'dangerous-cmd-2',
          settings: standardSettings,
        }),
      );

      then('second attempt is silent (exit 0)', () => {
        // the extant case, kept: the retry is permitted (exit 0) and says naught on stderr.
        // .note = its third assertion, `stdout` === '', is retired, not weakened: the wisher
        //         approved the vision (1.vision.yield.md, case=4.bust-through; approval in
        //         .route/passage.jsonl for 1.vision) that makes the retry hand the human an
        //         `ask` on stdout. the new behavior has its own then below.
        expect(results.second.exitCode).toBe(0);
        expect(results.second.stderr).toBe('');
      });

      then('second attempt hands off to the human via ask', () => {
        // new behavior (vision case=4.bust-through): the ask names what the bot was offered
        const output = JSON.parse(results.second.stdout);
        expect(output.hookSpecificOutput.hookEventName).toBe('PreToolUse');
        expect(output.hookSpecificOutput.permissionDecision).toBe('ask');
        expect(output.hookSpecificOutput.permissionDecisionReason).toContain(
          'retried after a nudge',
        );
      });
    });

    when('[t2] --window 0 forces block on every attempt', () => {
      then('retry still blocks', () => {
        const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
        const claudeDir = path.join(tempDir, '.claude');
        fs.mkdirSync(claudeDir, { recursive: true });
        fs.writeFileSync(
          path.join(claudeDir, 'settings.json'),
          JSON.stringify({ permissions: { allow: [], deny: [], ask: [] } }),
        );

        const stdinJson = JSON.stringify({
          tool_name: 'Bash',
          tool_input: { command: 'window-test' },
        });

        // first attempt
        spawnSync('bash', [scriptPath, '--window', '0'], {
          cwd: tempDir,
          encoding: 'utf-8',
          input: stdinJson,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        // second attempt with --window 0
        const second = spawnSync('bash', [scriptPath, '--window', '0'], {
          cwd: tempDir,
          encoding: 'utf-8',
          input: stdinJson,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        expect(second.status).toBe(2);
      });
    });
  });

  given('[case9] SOFTNUDGE mode', () => {
    when('[t0] --mode SOFTNUDGE', () => {
      // one run serves every then below (rule.forbid.redundant-expensive-operations)
      const result = useBeforeAll(async () =>
        runHook({
          command: 'softnudge-test-cmd',
          settings: standardSettings,
          flags: '--mode SOFTNUDGE',
          clearNudges: true,
        }),
      );

      then('shows warning message but exits 0', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('this command is not paved');
      });

      then('the footer promises no retry, prompt, or ledger row', () => {
        // clamp: the SOFTNUDGE body once reused the HARDNUDGE footer, which claimed the
        //        human would be asked and the ledger would record — neither is true here
        expect(result.stdout).toContain(
          'advisory only: the command runs as-is, and no ledger row is recorded',
        );
        expect(result.stdout).not.toContain('the human will be asked');
      });

      then('the head reads as an advisory, never as a block', () => {
        // clamp (5.3 peer review): the advisory once opened with `✋ ConstraintError:`, the
        //        head that means "blocked, exit 2" — for a command that runs (exit 0)
        expect(result.stdout).toContain(
          '🐚 advisory: this command is not paved',
        );
        expect(result.stdout).not.toContain('ConstraintError');
      });

      then('does NOT return hookSpecificOutput JSON', () => {
        // should be plain text, not JSON
        expect(() => {
          const parsed = JSON.parse(result.stdout);
          return parsed.hookSpecificOutput !== undefined;
        }).toThrow();
      });

      then('does not record commands in nudges file', () => {
        const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
        const claudeDir = path.join(tempDir, '.claude');
        fs.mkdirSync(claudeDir, { recursive: true });
        fs.writeFileSync(
          path.join(claudeDir, 'settings.json'),
          JSON.stringify({ permissions: { allow: [], deny: [], ask: [] } }),
        );

        const stdinJson = JSON.stringify({
          tool_name: 'Bash',
          tool_input: { command: 'softnudge-no-record' },
        });

        spawnSync('bash', [scriptPath, '--mode', 'SOFTNUDGE'], {
          cwd: tempDir,
          encoding: 'utf-8',
          input: stdinJson,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        // SOFTNUDGE exits before the record is ever touched, so the file must not exist;
        // an `if exists` guard here would pass without any check
        const nudgesPath = path.join(claudeDir, 'permission.nudges.local.json');
        expect(fs.existsSync(nudgesPath)).toBe(false);
      });
    });
  });

  given('[case10] union of settings.json and settings.local.json', () => {
    when('[t0] patterns from both files', () => {
      then('pattern from settings.json works', () => {
        const result = runHook({
          command: 'npm run test:unit',
          settings: { allow: ['Bash(npm run test:*)', 'Bash(cat:*)'] },
          settingsLocal: { allow: ['Bash(git status:*)', 'Bash(ls:*)'] },
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('pattern from settings.local.json works', () => {
        const result = runHook({
          command: 'git status',
          settings: { allow: ['Bash(npm run test:*)', 'Bash(cat:*)'] },
          settingsLocal: { allow: ['Bash(git status:*)', 'Bash(ls:*)'] },
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('command in neither file is blocked', () => {
        const result = runHook({
          command: 'rm -rf /',
          settings: { allow: ['Bash(npm run test:*)', 'Bash(cat:*)'] },
          settingsLocal: { allow: ['Bash(git status:*)', 'Bash(ls:*)'] },
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('ConstraintError');
      });

      then('blocked message ranks patterns from both files', () => {
        // .note = extant case; its intent (both settings files feed the rendered patterns) is
        //         kept. the old input `rm -rf /` passed only because the block dumped every
        //         pattern; the approved vision (1.vision.yield.md §contract, "list up to 21
        //         candidates") replaced the dump with a rank, so each file's pattern renders
        //         only for a near-miss. `npm run tset` (settings.json) and `git stats`
        //         (settings.local.json) are those near-misses
        const result = runHook({
          command: 'npm run tset && git stats',
          settings: { allow: ['Bash(npm run test:*)', 'Bash(cat:*)'] },
          settingsLocal: { allow: ['Bash(git status:*)', 'Bash(ls:*)'] },
          clearNudges: true,
        });
        expect(result.stderr).toContain('[p] npm run test');
        expect(result.stderr).toContain('[p] git status');
      });
    });

    when('[t1] duplicate patterns are deduplicated', () => {
      then('duplicate pattern appears only once in output', () => {
        // .note = extant case; its intent (a pattern in both files renders once) is kept.
        //         the input moved from `unknown-cmd` to a near-miss of the duplicated pattern,
        //         because the block no longer dumps every pattern (the approved vision) — so
        //         `unknown-cmd` renders no pattern at all, and the dedupe would go untested
        const result = runHook({
          command: 'npm run tset',
          settings: { allow: ['Bash(npm run test:*)', 'Bash(cat:*)'] },
          settingsLocal: {
            allow: ['Bash(npm run test:*)', 'Bash(git status:*)'],
          },
          clearNudges: true,
        });
        const matches = result.stderr.match(/\[p\] npm run test/g) ?? [];
        expect(matches.length).toBe(1);
      });
    });

    when('[t2] settings.local.json is absent', () => {
      then('works with only settings.json', () => {
        const result = runHook({
          command: 'npm run test:unit',
          settings: { allow: ['Bash(npm run test:*)'] },
          // no settingsLocal
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  // settings that include rhx and git.commit.set patterns for pipe testing
  const pipeTestSettings = {
    allow: [
      ...standardSettings.allow,
      'Bash(rhx:*)',
      'Bash(rhx git.commit.set:*)',
      'Bash(npx rhachet run --skill git.commit.set:*)',
    ],
  };

  given('[case20] piped echo commands with git.commit.set', () => {
    when('[t0] echo pipe to rhx git.commit.set', () => {
      then('echo "msg" | rhx git.commit.set -m @stdin → exit 0', () => {
        const result = runHook({
          command: 'echo "fix: msg" | rhx git.commit.set -m @stdin',
          settings: pipeTestSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });

    when('[t1] echo multiline pipe to rhx', () => {
      then('echo multiline | rhx git.commit.set → exit 0', () => {
        const cmd = `echo "fix: summary

- bullet 1
- bullet 2" | rhx git.commit.set -m @stdin`;
        const result = runHook({
          command: cmd,
          settings: pipeTestSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });

    when('[t2] variable assignment + echo pipe', () => {
      then(
        'MESSAGE="msg" && echo "$MESSAGE" | rhx git.commit.set → exit 0',
        () => {
          const result = runHook({
            command:
              'MESSAGE="fix: msg" && echo "$MESSAGE" | rhx git.commit.set -m @stdin',
            settings: pipeTestSettings,
          });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toBe('');
        },
      );
    });

    when('[t3] echo pipe to npx rhachet variant', () => {
      then(
        'echo "msg" | npx rhachet run --skill git.commit.set → exit 0',
        () => {
          const result = runHook({
            command:
              'echo "fix: msg" | npx rhachet run --skill git.commit.set -m @stdin',
            settings: pipeTestSettings,
          });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toBe('');
        },
      );
    });
  });

  given('[case21] unicode and special characters in piped messages', () => {
    when('[t0] echo with unicode in header', () => {
      then('echo with unicode (➜) passes', () => {
        const result = runHook({
          command:
            'echo "fix: add feature ➜ complete" | rhx git.commit.set -m @stdin',
          settings: pipeTestSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });

    when('[t1] echo with brackets and parens', () => {
      then('echo with [] and () passes', () => {
        const result = runHook({
          command:
            'echo "fix(scope): update [config] items" | rhx git.commit.set -m @stdin',
          settings: pipeTestSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });

    when('[t2] echo with backticks and quotes', () => {
      then('echo with backticks and nested quotes passes', () => {
        const result = runHook({
          command: `echo "fix: update \\\`config\\\` to use 'new' value" | rhx git.commit.set -m @stdin`,
          settings: pipeTestSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });

    when('[t3] echo with Co-authored-by trailer', () => {
      then('echo with Co-authored-by in body passes', () => {
        const cmd = `echo "fix: update config

- changed option

Co-authored-by: Human <human@example.com>" | rhx git.commit.set -m @stdin`;
        const result = runHook({
          command: cmd,
          settings: pipeTestSettings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  /**
   * .what = TDD test: pipes must split and each segment verified
   * .why = security: dangerous middle commands in pipes should block
   */
  given('[case22] pipe split verification (TDD)', () => {
    const limitedSettings = {
      allow: ['Bash(echo:*)', 'Bash(cat:*)'],
    };

    when('[t0] dangerous command hidden in pipe middle', () => {
      then('echo | dangerous-cmd | cat should block on middle segment', () => {
        const result = runHook({
          command: 'echo "safe" | dangerous-cmd | cat',
          settings: limitedSettings,
          clearNudges: true,
        });
        // MUST block because dangerous-cmd is not allowed
        // if this passes (exit 0), pipes NOT split correctly
        expect(result.exitCode).toBe(2);
      });
    });

    when('[t1] two allowed commands in pipe', () => {
      then('echo | cat should pass when both allowed', () => {
        const result = runHook({
          command: 'echo "hello" | cat',
          settings: limitedSettings,
          clearNudges: true,
        });
        // should pass because both echo and cat are allowed
        expect(result.exitCode).toBe(0);
      });
    });

    when('[t2] dangerous command at pipe end', () => {
      then('echo | dangerous-cmd should block', () => {
        const result = runHook({
          command: 'echo "safe" | dangerous-cmd',
          settings: limitedSettings,
          clearNudges: true,
        });
        // MUST block because dangerous-cmd is not allowed
        expect(result.exitCode).toBe(2);
      });
    });
  });

  given('[case23] the rule walk scales with 500 rules', () => {
    // 🔴 this case counts WORK, never wall-clock time. a duration bound measures the box, and
    //    it went red exactly when the box was busy — the one condition it existed to grade.
    //    the invariant that matters is that the walk over the allowlist forks no process per
    //    rule: so the hook runs at 50 rules and at 500 under a PATH shim that tallies every
    //    exec, and the two tallies must match. a per-rule fork shows up as a 10x gap on an
    //    idle box and a loaded one alike.
    const TALLIED_TOOLS = [
      'jq',
      'grep',
      'sed',
      'awk',
      'tr',
      'cut',
      'sort',
      'uniq',
      'head',
      'tail',
      'wc',
      'cat',
      'date',
      'mkdir',
      'mktemp',
      'mv',
      'rm',
      'sha256sum',
      'basename',
      'dirname',
      'git',
      'realpath',
      'readlink',
      'printf',
      'env',
      'tee',
    ];

    /**
     * .what = run the hook against N rules under an exec-tally shim
     */
    const runWithExecTally = (input: {
      ruleCount: number;
      command: string;
    }): { exitCode: number; stderr: string; execs: string[] } => {
      const tempDir = genTempDir({ slug: 'permissions-hook-walk', git: true });
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });

      // rules: a mix of prefix and exact patterns, plus the one real match
      const rules = Array.from({ length: input.ruleCount / 2 }, (_, i) => [
        `Bash(surf-prefix-${i}:*)`,
        `Bash(tide-exact-${i})`,
      ]).flat();
      rules.push('Bash(git status:*)');
      fs.writeFileSync(
        path.join(claudeDir, 'settings.json'),
        JSON.stringify({ permissions: { allow: rules, deny: [], ask: [] } }),
      );

      // one shim per tool that is on PATH: tally the name, then exec the real binary
      const shimDir = path.join(tempDir, 'shim');
      const tallyFile = path.join(tempDir, 'tally.txt');
      fs.mkdirSync(shimDir, { recursive: true });
      fs.writeFileSync(tallyFile, '');
      TALLIED_TOOLS.forEach((tool) => {
        const real = spawnSync('bash', ['-c', `command -v ${tool}`], {
          encoding: 'utf-8',
        }).stdout.trim();
        if (!real.startsWith('/')) return; // a builtin or an absent tool: no exec to tally
        const shim = path.join(shimDir, tool);
        fs.writeFileSync(
          shim,
          `#!/bin/sh\nprintf '%s\\n' ${tool} >> "${tallyFile}"\nexec "${real}" "$@"\n`,
        );
        fs.chmodSync(shim, 0o755);
      });

      const result = spawnSync('bash', [scriptPath], {
        cwd: tempDir,
        encoding: 'utf-8',
        input: JSON.stringify({
          tool_name: 'Bash',
          tool_input: { command: input.command },
        }),
        env: { ...process.env, PATH: `${shimDir}:${process.env.PATH ?? ''}` },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return {
        exitCode: result.status ?? 1,
        stderr: result.stderr ?? '',
        execs: fs
          .readFileSync(tallyFile, 'utf-8')
          .split('\n')
          .filter((line) => line.length > 0),
      };
    };

    when('[t0] an allowed command matches', () => {
      const tallies = useBeforeAll(async () => ({
        at50: runWithExecTally({ ruleCount: 50, command: 'git status' }),
        at500: runWithExecTally({ ruleCount: 500, command: 'git status' }),
      }));

      then('the hook permits at both sizes', () => {
        expect(tallies.at50.exitCode).toBe(0);
        expect(tallies.at500.exitCode).toBe(0);
      });

      then('the tally is not vacuous — the shim saw the hook run', () => {
        expect(tallies.at50.execs.length).toBeGreaterThan(0);
      });

      then('500 rules cost exactly the execs 50 rules cost', () => {
        expect(tallies.at500.execs.length).toEqual(tallies.at50.execs.length);
      });
    });

    when('[t1] a disallowed command blocks', () => {
      const tallies = useBeforeAll(async () => ({
        at50: runWithExecTally({
          ruleCount: 50,
          command: 'curl http://example.com',
        }),
        at500: runWithExecTally({
          ruleCount: 500,
          command: 'curl http://example.com',
        }),
      }));

      then('the hook blocks at both sizes', () => {
        expect(tallies.at50.exitCode).toBe(2);
        expect(tallies.at500.exitCode).toBe(2);
        expect(tallies.at500.stderr).toContain('ConstraintError');
      });

      then('500 rules cost exactly the execs 50 rules cost', () => {
        expect(tallies.at500.execs.length).toEqual(tallies.at50.execs.length);
      });
    });
  });

  given('[case11] edge cases', () => {
    when('[t0] empty command', () => {
      then('produces no output', () => {
        const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
        const claudeDir = path.join(tempDir, '.claude');
        fs.mkdirSync(claudeDir, { recursive: true });
        fs.writeFileSync(
          path.join(claudeDir, 'settings.json'),
          JSON.stringify({ permissions: { allow: [], deny: [], ask: [] } }),
        );

        const stdinJson = JSON.stringify({
          tool_name: 'Bash',
          tool_input: { command: '' },
        });

        const result = spawnSync('bash', [scriptPath], {
          cwd: tempDir,
          encoding: 'utf-8',
          input: stdinJson,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        expect(result.status).toBe(0);
        expect(result.stdout).toBe('');
      });
    });

    when('[t1] missing command field', () => {
      then('produces no output', () => {
        const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
        const claudeDir = path.join(tempDir, '.claude');
        fs.mkdirSync(claudeDir, { recursive: true });
        fs.writeFileSync(
          path.join(claudeDir, 'settings.json'),
          JSON.stringify({ permissions: { allow: [], deny: [], ask: [] } }),
        );

        const stdinJson = JSON.stringify({
          tool_name: 'Bash',
          tool_input: {},
        });

        const result = spawnSync('bash', [scriptPath], {
          cwd: tempDir,
          encoding: 'utf-8',
          input: stdinJson,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        expect(result.status).toBe(0);
        expect(result.stdout).toBe('');
      });
    });

    when('[t2] empty stdin', () => {
      then('exits with error (code 2)', () => {
        const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
        const claudeDir = path.join(tempDir, '.claude');
        fs.mkdirSync(claudeDir, { recursive: true });
        fs.writeFileSync(
          path.join(claudeDir, 'settings.json'),
          JSON.stringify({ permissions: { allow: [], deny: [], ask: [] } }),
        );

        const result = spawnSync('bash', [scriptPath], {
          cwd: tempDir,
          encoding: 'utf-8',
          input: '',
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        expect(result.status).toBe(2);
        expect(result.stderr).toContain('💥 MalfunctionError:');
      });
    });
  });

  /**
   * .what = strip // comments from jsonc, outside of strings only
   * .why = the role's jsonc files carry comments that JSON.parse rejects
   */
  const asJsonFromJsonc = (input: { content: string }): unknown => {
    const src = input.content;
    // .note = deliberate mutation: a char scan with a string-state flag; both bindings
    //         stay local to this pure transform and never escape it
    let out = '';
    let inString = false;
    for (let i = 0; i < src.length; i++) {
      const char = src[i];
      if (inString) {
        out += char;
        if (char === '\\') {
          out += src[i + 1] ?? '';
          i++;
          continue;
        }
        if (char === '"') inString = false;
        continue;
      }
      if (char === '"') {
        inString = true;
        out += char;
        continue;
      }
      if (char === '/' && src[i + 1] === '/') {
        while (i < src.length && src[i] !== '\n') i++;
        out += '\n';
        continue;
      }
      // a close bracket outside a string drops a trailing comma before it
      if (char === '}' || char === ']') out = out.replace(/,(\s*)$/, '$1');
      out += char;
    }
    return JSON.parse(out);
  };

  /**
   * .what = the ledger path the hook appends to, under a repo root
   */
  const getLedgerPath = (input: { repoRoot: string }): string =>
    path.join(
      input.repoRoot,
      '.agent/.cache/repo=ehmpathy/role=mechanic/skill=check-permissions/nudges.jsonl',
    );

  /**
   * .what = read the ledger rows the hook wrote
   */
  const getLedgerRows = (input: {
    repoRoot: string;
  }): Array<{
    at: string;
    part: string;
    head: string;
    kind: string;
    verdict: string;
  }> => {
    // an absent ledger is not "no rows": fail loud, so no case can pass on a
    // ledger the hook never reached
    const ledgerPath = getLedgerPath(input);
    if (!fs.existsSync(ledgerPath))
      throw new ConstraintError('ledger absent for this repo', {
        ledgerPath,
        hint: 'run a HARDNUDGE block in this repo first, so the hook writes the ledger',
      });
    return fs
      .readFileSync(ledgerPath, 'utf-8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  };

  given('[case30] blocked parts carry their paved alternatives', () => {
    when('[t0] a compound whose second part is grep', () => {
      const result = useBeforeAll(async () =>
        runHook({
          command: "git diff --stat && grep -rln 'blocklist' src/",
          settings: { allow: ['Bash(git diff:*)', 'Bash(rhx:*)'] },
          clearNudges: true,
        }),
      );

      then('exits 2 with a qualified header', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain(
          '✋ ConstraintError: this command is not paved',
        );
      });

      then('names only the blocked part', () => {
        expect(result.stderr).toContain("blocked: grep -rln 'blocklist' src/");
        expect(result.stderr).not.toContain('blocked: git diff');
      });

      then('offers the grep inventory alternatives', () => {
        expect(result.stderr).toContain('paved alternatives for `grep`');
        expect(result.stderr).toContain('rhx grepsafe');
        expect(result.stderr).toContain('rhx git.repo.get lines');
      });

      then('tips that the other part is paved alone', () => {
        expect(result.stderr).toContain('tip: a compound runs only if');
      });

      then('the render matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t1] a compound with three blocked parts, all alt', () => {
      const result = useBeforeAll(async () =>
        runHook({
          command: 'cd src && ls && grep -rn blocklist .',
          settings: { allow: ['Bash(rhx:*)', 'Bash(tree:*)'] },
          clearNudges: true,
        }),
      );

      then('names all three parts in one render', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('(3 parts)');
        expect(result.stderr).toContain('blocked: cd src');
        expect(result.stderr).toContain('blocked: ls');
        expect(result.stderr).toContain('blocked: grep -rn blocklist .');
      });

      then(
        'an advice-only head renders its advice, never an empty alternatives list',
        () => {
          // clamp: an empty alternatives field once collapsed under tab-split and
          //        shifted the advice into the alternatives slot
          expect(result.stderr).toContain(
            '   ├─ blocked: cd src\n   ├─ run from the cwd; pass paths to the command instead\n',
          );
          expect(result.stderr).not.toContain('paved alternatives for `cd`');
        },
      );

      then('each part carries its own answer', () => {
        expect(result.stderr).toContain('run from the cwd');
        expect(result.stderr).toContain('tree -L 1');
        expect(result.stderr).toContain('rhx grepsafe');
      });

      then(
        'the pave philosophy and the three moves render (no novel part)',
        () => {
          expect(result.stderr).toContain('🐚 pave what recurs');
          expect(result.stderr).toContain('🥥 did you know?\n');
          expect(result.stderr).toContain(
            "1. see all pre-approved commands: rhx permissions.get --for 'cd src && ls && grep -rn blocklist .'",
          );
          expect(result.stderr).toContain(
            '2. a need that recurs deserves a paved rhx skill — pave it',
          );
        },
      );
    });

    when('[t2] a compound with an alt part and a novel part', () => {
      const result = useBeforeAll(async () =>
        runHook({
          command: 'cd src && python3 -c "print(1)"',
          settings: { allow: ['Bash(rhx:*)'] },
          clearNudges: true,
        }),
      );

      then('the novel part reads no paved path fits', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('(2 parts)');
        expect(result.stderr).toContain('no paved path fits this part');
      });

      then('the pave philosophy renders, with where to pave', () => {
        expect(result.stderr).toContain('🐚 pave what recurs');
        expect(result.stderr).toContain(
          'where? always start in .agent/repo=.this/role=any/skills/',
        );
      });

      then('the render matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t3] a ranked pattern repeats an inventory alternative', () => {
      then('the command renders once, in its inventory form', () => {
        // clamp: the vision's contract dedupes; `grep` once rendered both
        //        `rhx grepsafe --pattern …` (inventory) and `[p] rhx grepsafe` (rank)
        const result = runHook({
          command: 'grep -rn blocklist src/',
          settings: { allow: ['Bash(rhx grepsafe:*)'] },
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain("rhx grepsafe --pattern '<regex>'");
        expect(result.stderr).not.toContain('[p] rhx grepsafe');
      });
    });

    when('[t4] the head is shared by unrelated paved patterns', () => {
      then(
        'a shared head alone does not rank; the relevant example does',
        () => {
          // clamp: one shared `git` once ranked every git pattern under `git commit`
          const result = runHook({
            command: 'git commit -m "fix"',
            settings: {
              allow: [
                'Bash(cat:*)',
                'Bash(gh issue list:*)',
                'Bash(git blame:*)',
                'Bash(git status:*)',
                'Bash(rhx git.branch.rebase:*)',
                'Bash(echo $MESSAGE | rhx git.commit.set -m @stdin)',
              ],
            },
            clearNudges: true,
          });
          // clamp: a 3-letter fzf subsequence (g…i…t) once matched every git.* skill
          expect(result.stderr).not.toContain('git.branch.rebase');
          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('rhx git.commit.set -m @stdin');
          expect(result.stderr).not.toContain('[p] git blame');
          expect(result.stderr).not.toContain('[p] git status');
          // clamp: 2 edits on a 3-letter head once matched `cat` and `gh` as typos of `git`
          expect(result.stderr).not.toContain('[p] cat');
          expect(result.stderr).not.toContain('[p] gh issue list');
        },
      );
    });

    when('[t5] a VAR=value prefix before the head', () => {
      then('the inventory keys on the command after the prefix', () => {
        const result = runHook({
          command: 'SURF=1 npm test',
          settings: { allow: ['Bash(rhx:*)'] },
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('paved alternatives for `npm test`');
        expect(result.stderr).toContain('rhx git.repo.test');
      });
    });
  });

  given('[case31] a typo of a paved command', () => {
    when('[t0] the head has an adjacent swap', () => {
      const result = useBeforeAll(async () =>
        runHook({
          command: 'gti status',
          settings: {
            allow: [
              'Bash(gh issue status:*)',
              'Bash(gh pr status:*)',
              'Bash(git diff:*)',
              'Bash(git status:*)',
            ],
          },
          clearNudges: true,
        }),
      );

      then('asks did you mean, with git status first', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('did you mean?');
        const firstHit = result.stderr
          .split('\n')
          .find((line) => line.includes('[p] '));
        expect(firstHit).toContain('[p] git status');
      });

      then('the render matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t1] the head holds the letters of a paved word, in order', () => {
      then('the fzf tier ranks that pattern', () => {
        const result = runHook({
          command: 'grpsf wave',
          settings: { allow: ['Bash(rhx grepsafe:*)', 'Bash(tree:*)'] },
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('[p] rhx grepsafe');
        expect(result.stderr).not.toContain('[p] tree');
      });
    });
  });

  given('[case32] a novel command', () => {
    when('[t0] the head has no alternative and no tier match', () => {
      const result = useBeforeAll(async () =>
        runHook({
          command: 'python3 -c "import json"',
          settings: { allow: ['Bash(rhx:*)', 'Bash(tree:*)'] },
          clearNudges: true,
        }),
      );

      then('declares no paved path fits, with no candidate', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('no paved path fits this part');
        expect(result.stderr).not.toContain('[p] ');
      });

      then('pushes the pave move', () => {
        expect(result.stderr).toContain('🐚 pave what recurs');
        expect(result.stderr).toContain(
          'a need that recurs deserves a paved rhx skill',
        );
      });

      then('the render matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t1] a two-letter head sits two edits from a paved head', () => {
      then('the weak fit is withheld', () => {
        const result = runHook({
          command: 'du -sh dist',
          settings: { allow: ['Bash(diff:*)'] },
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('no paved path fits this part');
        expect(result.stderr).not.toContain('[p] diff');
      });
    });
  });

  given('[case33] the candidate cap', () => {
    when('[t0] more than 21 patterns are near the blocked command', () => {
      then('at most 21 candidates render, with an overflow count', () => {
        const allow = Array.from(
          { length: 40 },
          (_, i) => `Bash(git stash${i}:*)`,
        );
        const result = runHook({
          command: 'git stash',
          settings: { allow },
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
        const candidates = result.stderr
          .split('\n')
          .filter((line) => line.includes('[p] git stash'));
        expect(candidates.length).toBeLessThanOrEqual(21);
        expect(candidates.length).toBeGreaterThan(0);
        expect(result.stderr).toContain('… and 19 more');
      });
    });
  });

  given('[case34] the nudge ledger', () => {
    when('[t0] a first attempt blocks', () => {
      then('one nudged row lands per blocked part', () => {
        const result = runHook({
          command: 'cd src && grep -rn x .',
          settings: { allow: ['Bash(rhx:*)'] },
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
        const rows = getLedgerRows({ repoRoot: result.tempDir });
        expect(rows).toHaveLength(2);
        expect(rows.map((row) => row.head)).toEqual(['cd', 'grep']);
        expect(rows.every((row) => row.kind === 'alt')).toBe(true);
        expect(rows.every((row) => row.verdict === 'nudged')).toBe(true);
        expect(rows[0]?.at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      });

      then('the stamp is true UTC, even when the host zone is not', () => {
        // clamp: the stamp once carried a Z suffix over local time. the test
        //        runner may itself run in UTC, so force a non-UTC zone here.
        const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
        fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
        fs.writeFileSync(
          path.join(tempDir, '.claude', 'settings.json'),
          JSON.stringify({ permissions: { allow: [], deny: [], ask: [] } }),
        );
        // the stamp has whole-second precision, so the lower bound drops the millis
        const msBefore = Math.floor(Date.now() / 1000) * 1000;
        spawnSync('bash', [scriptPath], {
          cwd: tempDir,
          encoding: 'utf-8',
          env: { ...process.env, TZ: 'Asia/Kolkata' },
          input: JSON.stringify({
            tool_name: 'Bash',
            tool_input: { command: 'python3 -c "print(1)"' },
          }),
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        const msAfter = Date.now();
        const rows = getLedgerRows({ repoRoot: tempDir });
        expect(rows).toHaveLength(1);
        const msStamp = Date.parse(rows[0]?.at ?? '');
        expect(msStamp).toBeGreaterThanOrEqual(msBefore);
        expect(msStamp).toBeLessThanOrEqual(msAfter);
      });
    });

    when('[t1] the bot retries within the window', () => {
      then('a retried row follows the nudged row', () => {
        const results = runHookTwice({
          command: 'python3 -c "print(1)"',
          settings: { allow: ['Bash(rhx:*)'] },
        });
        expect(results.first.exitCode).toBe(2);
        expect(results.second.exitCode).toBe(0);
        const rows = getLedgerRows({ repoRoot: results.tempDir });
        expect(rows.map((row) => row.verdict)).toEqual(['nudged', 'retried']);
        expect(rows[1]?.kind).toBe('novel');
      });

      then('the ask reason says what the bot was offered', () => {
        const results = runHookTwice({
          command: 'grep -rn x .',
          settings: { allow: ['Bash(rhx:*)'] },
        });
        const reason = JSON.parse(results.second.stdout).hookSpecificOutput
          .permissionDecisionReason;
        expect(reason).toContain('retried after a nudge');
        expect(reason).toContain('grep: paved alternative offered');
        expect(reason).toContain('rhx grepsafe');
        expect(reason).toContain('the ledger records this ask');
      });

      then(
        'an advice-only head is named as advice, never as an alternative',
        () => {
          // clamp (5.3 review): `cd` has prose advice and no command; the reason once
          // called it a "paved alternative", which read as if a command were offered
          const results = runHookTwice({
            command: 'cd src',
            settings: { allow: ['Bash(rhx:*)'] },
          });
          const reason = JSON.parse(results.second.stdout).hookSpecificOutput
            .permissionDecisionReason;
          expect(reason).toContain('cd: advice offered — run from the cwd');
          expect(reason).not.toContain('cd: paved alternative offered');
        },
      );
    });

    when('[t2] the ledger path cannot be written', () => {
      /**
       * .what = a temp repo whose ledger dir is blocked by a plain file
       * .why = mkdir fails, so the ledger write fails, deterministically
       */
      const genBlockedLedgerRepo = (): string => {
        const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
        fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
        fs.writeFileSync(
          path.join(tempDir, '.claude', 'settings.json'),
          JSON.stringify({
            permissions: { allow: ['Bash(rhx:*)'], deny: [], ask: [] },
          }),
        );
        fs.mkdirSync(path.join(tempDir, '.agent'), { recursive: true });
        fs.writeFileSync(path.join(tempDir, '.agent', '.cache'), 'a file');
        return tempDir;
      };
      const stdinJson = JSON.stringify({
        tool_name: 'Bash',
        tool_input: { command: 'python3 -c "print(1)"' },
      });

      then('the block still holds, and the loss is loud', () => {
        const tempDir = genBlockedLedgerRepo();
        const result = spawnSync('bash', [scriptPath], {
          cwd: tempDir,
          encoding: 'utf-8',
          input: stdinJson,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        expect(result.status).toBe(2);
        expect(result.stderr).toContain('this command is not paved');
        expect(result.stderr).toContain(
          '💥 MalfunctionError: the nudge ledger row could not be written',
        );
        // the cause is named, not swallowed: mkdir's own error rides the line
        expect(result.stderr).toContain('mkdir:');
      });

      then(
        'a retry still reaches the human, and the reason notes the loss',
        () => {
          const tempDir = genBlockedLedgerRepo();
          spawnSync('bash', [scriptPath], {
            cwd: tempDir,
            encoding: 'utf-8',
            input: stdinJson,
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          const second = spawnSync('bash', [scriptPath], {
            cwd: tempDir,
            encoding: 'utf-8',
            input: stdinJson,
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          expect(second.status).toBe(0);
          const output = JSON.parse(second.stdout ?? '');
          expect(output.hookSpecificOutput.permissionDecision).toBe('ask');
          expect(output.hookSpecificOutput.permissionDecisionReason).toContain(
            'the ledger row could not be written',
          );

          // the whole ask payload a human meets, masked for the temp repo and mkdir's text
          expect(
            asSnapshotSafe({
              text: JSON.stringify(output, null, 2),
              tempDir,
            }),
          ).toMatchSnapshot();
        },
      );
    });

    when('[t3] SOFTNUDGE advises after a block in the same repo', () => {
      then('the ledger holds the block row and no SOFTNUDGE row', () => {
        // a HARDNUDGE block first proves the ledger exists and is reachable, so
        // "no SOFTNUDGE row" cannot pass on a ledger the hook never reached
        const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
        fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
        fs.writeFileSync(
          path.join(tempDir, '.claude', 'settings.json'),
          JSON.stringify({
            permissions: { allow: ['Bash(rhx:*)'], deny: [], ask: [] },
          }),
        );
        const asStdin = (command: string): string =>
          JSON.stringify({ tool_name: 'Bash', tool_input: { command } });
        const blocked = spawnSync('bash', [scriptPath], {
          cwd: tempDir,
          encoding: 'utf-8',
          input: asStdin('python3 -c "print(1)"'),
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        const advised = spawnSync('bash', [scriptPath, '--mode', 'SOFTNUDGE'], {
          cwd: tempDir,
          encoding: 'utf-8',
          input: asStdin('python3 -c "print(2)"'),
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        expect(blocked.status).toBe(2);
        expect(advised.status).toBe(0);
        const rows = getLedgerRows({ repoRoot: tempDir });
        expect(rows.map((row) => row.part)).toEqual(['python3 -c "print(1)"']);
      });
    });
  });

  given('[case35] the inventory file', () => {
    const inventory = asJsonFromJsonc({
      content: fs.readFileSync(
        path.join(__dirname, 'commands.alternatives.jsonc'),
        'utf-8',
      ),
    }) as {
      entries: Array<{
        heads: string[];
        alternatives: string[];
        advice?: string;
      }>;
    };
    const permissions = asJsonFromJsonc({
      content: fs.readFileSync(
        path.join(__dirname, '..', 'init.claude.permissions.jsonc'),
        'utf-8',
      ),
    }) as { permissions: { allow: string[] } };
    // each paved row as the hook matches it: `cmd:*` is a prefix, all else must match exactly
    const pavedRows = permissions.permissions.allow
      .filter((entry) => entry.startsWith('Bash('))
      .map((entry) => entry.replace(/^Bash\(/, '').replace(/\)$/, ''))
      .map((entry) =>
        entry.endsWith(':*')
          ? { text: entry.replace(/:\*$/, ''), prefix: true }
          : { text: entry, prefix: false },
      );
    const isPaved = (segment: string): boolean =>
      pavedRows.some((row) =>
        row.prefix ? segment.startsWith(row.text) : segment === row.text,
      );

    when('[t0] each alternative is checked against the role allowlist', () => {
      then('every alternative segment is paved, as the hook matches it', () => {
        // clamp: this guard once checked `startsWith` for every row, so an exact-only row
        //        (`jq`) let a longer segment (`jq .scripts <file>`) pass here while the hook
        //        would block it — the offer would not serve
        const unpaved = inventory.entries
          .flatMap((entry) => entry.alternatives)
          .flatMap((alternative) => alternative.split(' | '))
          .map((segment) => segment.trim())
          .filter((segment) => segment !== 'cmd')
          .filter((segment) => !isPaved(segment));
        expect(unpaved).toEqual([]);
      });

      then('an exact-only row never paves a longer segment', () => {
        expect(isPaved('jq')).toBe(true);
        expect(isPaved("jq '.scripts' <file>")).toBe(false);
      });

      then('every entry offers an alternative or an advice', () => {
        const empty = inventory.entries.filter(
          (entry) => entry.alternatives.length === 0 && !entry.advice,
        );
        expect(empty).toEqual([]);
      });

      then('a double slash inside a value survives the loader intact', () => {
        // clamp: the loader once stripped `//.*` from every line, so a value like a url
        //        was silently cut short. only whole-line comments are stripped now
        const hookDir = genHookDir({ slug: 'permissions-hook-copy' });
        const hookCopy = path.join(hookDir, 'pretooluse.check-permissions.sh');
        fs.copyFileSync(scriptPath, hookCopy);
        fs.writeFileSync(
          path.join(hookDir, 'commands.alternatives.jsonc'),
          [
            '{',
            '  // a whole-line comment is stripped',
            '  "entries": [',
            '    { "heads": ["grep"], "alternatives": ["rhx grepsafe --pattern \'https://surf.example//waves\'"] }',
            '  ]',
            '}',
          ].join('\n'),
        );
        const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
        fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
        fs.writeFileSync(
          path.join(tempDir, '.claude', 'settings.json'),
          JSON.stringify({ permissions: { allow: [], deny: [], ask: [] } }),
        );
        const result = spawnSync('bash', [hookCopy], {
          cwd: tempDir,
          encoding: 'utf-8',
          input: JSON.stringify({
            tool_name: 'Bash',
            tool_input: { command: 'grep -rn wave .' },
          }),
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        expect(result.status).toBe(2);
        expect(result.stderr).toContain(
          "rhx grepsafe --pattern 'https://surf.example//waves'",
        );
        expect(result.stderr).not.toContain('MalfunctionError');
      });
    });

    when('[t1] the inventory file beside the hook is unparseable', () => {
      then('the block still holds, and the malfunction is named', () => {
        const hookDir = genHookDir({ slug: 'permissions-hook-copy' });
        const hookCopy = path.join(hookDir, 'pretooluse.check-permissions.sh');
        fs.copyFileSync(scriptPath, hookCopy);
        fs.writeFileSync(
          path.join(hookDir, 'commands.alternatives.jsonc'),
          '{ "entries": [ { "heads": ["grep"',
        );
        const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
        fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
        fs.writeFileSync(
          path.join(tempDir, '.claude', 'settings.json'),
          JSON.stringify({ permissions: { allow: [], deny: [], ask: [] } }),
        );
        const result = spawnSync('bash', [hookCopy], {
          cwd: tempDir,
          encoding: 'utf-8',
          input: JSON.stringify({
            tool_name: 'Bash',
            tool_input: { command: 'grep -rn x .' },
          }),
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        expect(result.status).toBe(2);
        expect(result.stderr).toContain(
          '💥 MalfunctionError: inventory file unparseable',
        );
        // the cause is named, not swallowed: jq's parse error rides the line
        expect(result.stderr).toMatch(
          /unparseable: commands\.alternatives\.jsonc \(jq: /,
        );
        expect(
          asSnapshotSafe({ text: result.stderr, tempDir }),
        ).toMatchSnapshot();
      });
    });

    when('[t2] the inventory file is absent beside the hook', () => {
      then('the block still holds, and the malfunction is named', () => {
        const hookDir = genHookDir({ slug: 'permissions-hook-copy' });
        const hookCopy = path.join(hookDir, 'pretooluse.check-permissions.sh');
        fs.copyFileSync(scriptPath, hookCopy);
        const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
        fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
        fs.writeFileSync(
          path.join(tempDir, '.claude', 'settings.json'),
          JSON.stringify({ permissions: { allow: [], deny: [], ask: [] } }),
        );
        const result = spawnSync('bash', [hookCopy], {
          cwd: tempDir,
          encoding: 'utf-8',
          input: JSON.stringify({
            tool_name: 'Bash',
            tool_input: { command: 'grep -rn x .' },
          }),
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        expect(result.status).toBe(2);
        expect(result.stderr).toContain(
          '💥 MalfunctionError: inventory file absent',
        );
      });
    });
  });

  given('[case36] a crash on the block path', () => {
    when(
      '[t0] the hook exits with an unexpected code after the allow check',
      () => {
        then('the gate fails closed: exit 2, with the crash named', () => {
          // clamp: claude code reads every exit except 2 as "permitted", so a runtime
          //        error on the block path once opened the gate (a bad array subscript
          //        exited 1). inject a crash into a copy of the hook to prove the trap holds.
          const hookDir = genHookDir({ slug: 'permissions-hook-crash' });
          const hookCopy = path.join(
            hookDir,
            'pretooluse.check-permissions.sh',
          );
          const marker = "# the hook's own dir, for the inventory file";
          const hookSource = fs.readFileSync(scriptPath, 'utf-8');
          expect(hookSource).toContain(marker);
          fs.writeFileSync(
            hookCopy,
            hookSource.replace(marker, `exit 7\n${marker}`),
          );
          const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
          fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
          fs.writeFileSync(
            path.join(tempDir, '.claude', 'settings.json'),
            JSON.stringify({ permissions: { allow: [], deny: [], ask: [] } }),
          );
          const result = spawnSync('bash', [hookCopy], {
            cwd: tempDir,
            encoding: 'utf-8',
            input: JSON.stringify({
              tool_name: 'Bash',
              tool_input: { command: 'python3 -c "print(1)"' },
            }),
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          expect(result.status).toBe(2);
          expect(result.stderr).toContain(
            '💥 MalfunctionError: check-permissions hook crashed (exit 7)',
          );
        });
      },
    );

    when('[t1] the same crash, with stdout and stderr both closed', () => {
      then(
        'the gate still fails closed: exit 2, never a write error code',
        () => {
          // clamp: the trap's diagnostic write once failed on a closed stream, which ended the
          //        shell with the write's code before the trap's `exit 2` ran — fail open
          const hookDir = genHookDir({ slug: 'permissions-hook-crash-closed' });
          const hookCopy = path.join(
            hookDir,
            'pretooluse.check-permissions.sh',
          );
          const marker = "# the hook's own dir, for the inventory file";
          const hookSource = fs.readFileSync(scriptPath, 'utf-8');
          expect(hookSource).toContain(marker);
          fs.writeFileSync(
            hookCopy,
            hookSource.replace(marker, `exit 7\n${marker}`),
          );
          const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
          fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
          fs.writeFileSync(
            path.join(tempDir, '.claude', 'settings.json'),
            JSON.stringify({ permissions: { allow: [], deny: [], ask: [] } }),
          );
          const result = spawnSync(
            'bash',
            ['-c', `exec bash "${hookCopy}" 1>&- 2>&-`],
            {
              cwd: tempDir,
              encoding: 'utf-8',
              input: JSON.stringify({
                tool_name: 'Bash',
                tool_input: { command: 'python3 -c "print(1)"' },
              }),
              stdio: ['pipe', 'pipe', 'pipe'],
            },
          );
          expect(result.status).toBe(2);
        },
      );
    });
  });

  given('[case37] an exact allowlist entry', () => {
    when('[t0] the blocked command shares the exact entry as its head', () => {
      then('the exact entry ranks as the nearest paved pattern', () => {
        // `[e] jq` matches only the bare word, so every real `jq <filter> <file>`
        // blocks; the rank must still name `jq` as what was meant
        const result = runHook({
          command: "jq '.permissions' settings.json",
          settings: { allow: ['Bash(jq)', 'Bash(tree:*)'] },
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('[e] jq');
        expect(result.stderr).not.toContain('[p] tree');
      });
    });
  });

  given('[case38] a crash inside the allow check', () => {
    when('[t0] the part scan exits with an unexpected code', () => {
      then('the gate fails closed: exit 2, never a silent pass', () => {
        // clamp: the allow check once read ANY nonzero exit as "all allowed"
        //        (`|| exit 0`), so a crash there let the command through
        const hookDir = genHookDir({ slug: 'permissions-hook-crash' });
        const hookCopy = path.join(hookDir, 'pretooluse.check-permissions.sh');
        const marker = '  local found=1';
        const hookSource = fs.readFileSync(scriptPath, 'utf-8');
        expect(hookSource.split(marker)).toHaveLength(2); // the marker is unique
        fs.writeFileSync(
          hookCopy,
          hookSource.replace(marker, `  exit 7\n${marker}`),
        );
        const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
        fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
        fs.writeFileSync(
          path.join(tempDir, '.claude', 'settings.json'),
          JSON.stringify({
            permissions: { allow: ['Bash(git status:*)'], deny: [], ask: [] },
          }),
        );
        const result = spawnSync('bash', [hookCopy], {
          cwd: tempDir,
          encoding: 'utf-8',
          input: JSON.stringify({
            tool_name: 'Bash',
            tool_input: { command: 'python3 -c "print(1)"' },
          }),
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        expect(result.status).toBe(2);
        expect(result.stderr).toContain(
          '💥 MalfunctionError: check-permissions hook crashed (exit 7)',
        );
      });
    });
  });

  /**
   * .what = run a copy of the hook (source possibly edited) in a fresh temp repo
   * .why = the timeout, crash, and malfunction paths need a hook whose source or
   *        neighbors differ from the shipped one; the real file stays untouched
   */
  const runHookCopy = (input: {
    hookSource: string;
    command: string | null;
    allow: string[];
    flags: string[];
    withInventory: boolean;
    prepare: ((scene: { tempDir: string }) => void) | null;
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const hookDir = genHookDir({ slug: 'permissions-hook-copy' });
    const hookCopy = path.join(hookDir, 'pretooluse.check-permissions.sh');
    fs.writeFileSync(hookCopy, input.hookSource);
    if (input.withInventory)
      fs.copyFileSync(
        path.join(__dirname, 'commands.alternatives.jsonc'),
        path.join(hookDir, 'commands.alternatives.jsonc'),
      );
    const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
    fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, '.claude', 'settings.json'),
      JSON.stringify({
        permissions: { allow: input.allow, deny: [], ask: [] },
      }),
    );
    input.prepare?.({ tempDir });
    const result = spawnSync('bash', [hookCopy, ...input.flags], {
      cwd: tempDir,
      encoding: 'utf-8',
      input:
        input.command === null
          ? ''
          : JSON.stringify({
              tool_name: 'Bash',
              tool_input: { command: input.command },
            }),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      tempDir,
    };
  };

  /**
   * .what = mask the volatile bits of a render so its snapshot is stable
   * .why = temp paths change per run, and jq / mkdir error text varies by version and
   *        platform; the structure around them is what the snapshot must pin
   */
  const asSnapshotSafe = (input: { text: string; tempDir: string }): string => {
    const masked = input.text
      .split(input.tempDir)
      .join('<repo>')
      // the hook may print the temp repo — or the hook-copy dir — under another form of
      // its path; mask both temp slugs by shape (`permissions-hook`, `permissions-hook-copy`)
      .replace(/\/\S*\.permissions-hook(?:-copy)?\.[0-9a-f]+/g, '<repo>')
      // a bash error names the hook's line, which moves with every edit to the hook
      .replace(/: line \d+:/g, ': line <n>:')
      .replace(/jq: [^)]*\)/g, 'jq: <error>)')
      .replace(/mkdir: [^)]*\)/g, 'mkdir: <error>)');

    // a host path that slipped every mask fails loud, never lands in a snapshot
    // .why = clamp (5.3 peer review): a hook-copy path once escaped the mask and was committed
    if (masked.includes('genTempDir') || masked.includes(process.cwd()))
      throw new ConstraintError('a host path escaped the snapshot mask', {
        masked,
        hint: 'extend asSnapshotSafe to mask this path shape',
      });
    return masked;
  };

  const hookSourceLive = fs.readFileSync(scriptPath, 'utf-8');

  given(
    '[case39] the hook edges: timeout, flags, a clock that stepped back, a bare assignment',
    () => {
      when('[t0] the allow check runs out of time', () => {
        then('the gate fails closed with a named malfunction', () => {
          const result = runHookCopy({
            hookSource: hookSourceLive.replace(
              'FAILFAST_TIMEOUT=4',
              'FAILFAST_TIMEOUT=0',
            ),
            command: 'git status',
            allow: ['Bash(git status:*)'],
            flags: [],
            withInventory: true,
            prepare: null,
          });
          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain(
            '💥 MalfunctionError: permission check exceeded 0s timeout',
          );
        });
      });

      when('[t1] the hook is asked for --help', () => {
        then('it prints usage with every flag and exits 0', () => {
          const result = runHookCopy({
            hookSource: hookSourceLive,
            command: null,
            allow: [],
            flags: ['--help'],
            withInventory: true,
            prepare: null,
          });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('--mode HARDNUDGE');
          expect(result.stdout).toContain('--mode SOFTNUDGE');
          expect(result.stdout).toContain('--window <n>');
          expect(result.stdout).toMatchSnapshot();
        });
      });

      when(
        '[t2] the hook starts slow (host load), then checks a paved command',
        () => {
          then(
            'the startup is not charged to the failfast budget; the command passes',
            () => {
              // clamp: the budget once counted from process start, so a loaded host timed out
              //        a trivial allowed command (a false block)
              const result = runHookCopy({
                hookSource: hookSourceLive.replace(
                  'STDIN_INPUT=$(cat)',
                  'STDIN_INPUT=$(cat)\nsleep 5',
                ),
                command: 'git status',
                allow: ['Bash(git status:*)'],
                flags: [],
                withInventory: true,
                prepare: null,
              });
              expect(result.exitCode).toBe(0);
              expect(result.stderr).toBe('');
            },
          );
        },
      );

      when('[t3] the hook is registered with an unknown flag', () => {
        then('the flag is named loud and the gate holds', () => {
          const result = runHookCopy({
            hookSource: hookSourceLive,
            command: 'git status',
            allow: ['Bash(git status:*)'],
            flags: ['--windo', '30'],
            withInventory: true,
            prepare: null,
          });
          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain(
            '💥 MalfunctionError: check-permissions hook got an unknown flag: --windo',
          );
        });
      });

      when(
        '[t4] the nudge record holds a stamp from the future (a clock that stepped back)',
        () => {
          then('the command is a first attempt, never a retry', () => {
            const command = 'python3 -c "print(1)"';
            const result = runHookCopy({
              hookSource: hookSourceLive,
              command,
              allow: [],
              flags: [],
              withInventory: true,
              prepare: ({ tempDir }) =>
                fs.writeFileSync(
                  path.join(tempDir, '.claude', 'permission.nudges.local.json'),
                  JSON.stringify({
                    [command]: Math.floor(Date.now() / 1000) + 3600,
                  }),
                ),
            });
            expect(result.exitCode).toBe(2);
            expect(result.stdout).not.toContain('permissionDecision');
            expect(result.stderr).toContain('this command is not paved');
          });
        },
      );

      when('[t5] a compound part is a bare `VAR=value` with no command', () => {
        then('the part is nudged as novel, and the hook does not crash', () => {
          // .note = a live defect: the empty head was an associative-array subscript,
          //         which crashed the block path (the EXIT trap held the gate closed)
          const result = runHookCopy({
            hookSource: hookSourceLive,
            command: 'F=src/surfer.ts && python3 "$F"',
            allow: [],
            flags: [],
            withInventory: true,
            prepare: null,
          });
          expect(result.exitCode).toBe(2);
          expect(result.stderr).not.toContain('crashed');
          expect(result.stderr).toContain('F=src/surfer.ts');
          expect(
            asSnapshotSafe({ text: result.stderr, tempDir: result.tempDir }),
          ).toMatchSnapshot();
        });
      });
    },
  );

  given('[case40] every caller-faced render, snapped', () => {
    // .note = the render is the hook's contract: the bot reads the block, the human reads
    //         the ask reason. each variant is snapped with only its volatile bits masked
    const variants: Array<{
      slug: string;
      command: string | null;
      allow: string[];
      flags: string[];
      hookSource: string;
      withInventory: boolean;
      prepare: ((scene: { tempDir: string }) => void) | null;
      stream: 'stdout' | 'stderr';
    }> = [
      {
        slug: 'compound, all alt (cd, ls, grep)',
        command: 'cd src && ls && grep -rn blocklist .',
        allow: ['Bash(rhx:*)', 'Bash(tree:*)'],
        flags: [],
        hookSource: hookSourceLive,
        withInventory: true,
        prepare: null,
        stream: 'stderr',
      },
      {
        slug: 'VAR=value prefix before a two-word head',
        command: 'SURF=1 npm test',
        allow: ['Bash(rhx:*)'],
        flags: [],
        hookSource: hookSourceLive,
        withInventory: true,
        prepare: null,
        stream: 'stderr',
      },
      {
        slug: 'shared head + dot-segment tier (git commit)',
        command: 'git commit -m "fix"',
        allow: [
          'Bash(cat:*)',
          'Bash(git blame:*)',
          'Bash(rhx git.branch.rebase:*)',
          'Bash(echo $MESSAGE | rhx git.commit.set -m @stdin)',
        ],
        flags: [],
        hookSource: hookSourceLive,
        withInventory: true,
        prepare: null,
        stream: 'stderr',
      },
      {
        slug: 'ranked hit deduped against the inventory (grep)',
        command: 'grep -rn blocklist src/',
        allow: ['Bash(rhx grepsafe:*)'],
        flags: [],
        hookSource: hookSourceLive,
        withInventory: true,
        prepare: null,
        stream: 'stderr',
      },
      {
        slug: 'fzf tier (grpsf)',
        command: 'grpsf wave',
        allow: ['Bash(rhx grepsafe:*)', 'Bash(tree:*)'],
        flags: [],
        hookSource: hookSourceLive,
        withInventory: true,
        prepare: null,
        stream: 'stderr',
      },
      {
        slug: 'weak fit withheld (du)',
        command: 'du -sh dist',
        allow: ['Bash(diff:*)'],
        flags: [],
        hookSource: hookSourceLive,
        withInventory: true,
        prepare: null,
        stream: 'stderr',
      },
      {
        slug: 'exact entry (jq)',
        command: "jq '.permissions' settings.json",
        allow: ['Bash(jq)', 'Bash(tree:*)'],
        flags: [],
        hookSource: hookSourceLive,
        withInventory: true,
        prepare: null,
        stream: 'stderr',
      },
      {
        slug: 'the 21 cap with overflow',
        command: 'git stash',
        allow: Array.from({ length: 40 }, (_, i) => `Bash(git stash${i}:*)`),
        flags: [],
        hookSource: hookSourceLive,
        withInventory: true,
        prepare: null,
        stream: 'stderr',
      },
      {
        slug: 'SOFTNUDGE advisory',
        command: 'python3 -c "print(1)"',
        allow: ['Bash(rhx:*)'],
        flags: ['--mode', 'SOFTNUDGE'],
        hookSource: hookSourceLive,
        withInventory: true,
        prepare: null,
        stream: 'stdout',
      },
      {
        slug: 'malfunction: empty stdin',
        command: null,
        allow: [],
        flags: [],
        hookSource: hookSourceLive,
        withInventory: true,
        prepare: null,
        stream: 'stderr',
      },
      {
        slug: 'malfunction: inventory absent',
        command: 'grep -rn x .',
        allow: [],
        flags: [],
        hookSource: hookSourceLive,
        withInventory: false,
        prepare: null,
        stream: 'stderr',
      },
      {
        slug: 'malfunction: ledger path blocked',
        command: 'python3 -c "print(1)"',
        allow: ['Bash(rhx:*)'],
        flags: [],
        hookSource: hookSourceLive,
        withInventory: true,
        prepare: ({ tempDir }) => {
          fs.mkdirSync(path.join(tempDir, '.agent'), { recursive: true });
          fs.writeFileSync(path.join(tempDir, '.agent', '.cache'), 'a file');
        },
        stream: 'stderr',
      },
      {
        slug: 'malfunction: crash on the block path',
        command: 'python3 -c "print(1)"',
        allow: [],
        flags: [],
        hookSource: hookSourceLive.replace(
          "# the hook's own dir, for the inventory file",
          "exit 7\n# the hook's own dir, for the inventory file",
        ),
        withInventory: true,
        prepare: null,
        stream: 'stderr',
      },
      {
        slug: 'malfunction: allow check timeout',
        command: 'git status',
        allow: ['Bash(git status:*)'],
        flags: [],
        hookSource: hookSourceLive.replace(
          'FAILFAST_TIMEOUT=4',
          'FAILFAST_TIMEOUT=0',
        ),
        withInventory: true,
        prepare: null,
        stream: 'stderr',
      },
      {
        slug: 'malfunction: unknown flag',
        command: 'git status',
        allow: ['Bash(git status:*)'],
        flags: ['--windo', '30'],
        hookSource: hookSourceLive,
        withInventory: true,
        prepare: null,
        stream: 'stderr',
      },
      {
        slug: 'malfunction: settings file unparseable',
        command: 'git status',
        allow: [],
        flags: [],
        hookSource: hookSourceLive,
        withInventory: true,
        prepare: ({ tempDir }) =>
          fs.writeFileSync(
            path.join(tempDir, '.claude', 'settings.json'),
            '{ "permissions": { "allow": ["Bash(git status:*)"] ',
          ),
        stream: 'stderr',
      },
    ];

    variants.forEach((variant, index) => {
      when(`[t${index}] ${variant.slug}`, () => {
        then('the render matches snapshot', () => {
          const result = runHookCopy({
            hookSource: variant.hookSource,
            command: variant.command,
            allow: variant.allow,
            flags: variant.flags,
            withInventory: variant.withInventory,
            prepare: variant.prepare,
          });
          const text =
            variant.stream === 'stdout' ? result.stdout : result.stderr;
          expect(text.length).toBeGreaterThan(0);
          // a timeout render is a load artifact everywhere but its own variant; never snap it
          expect(text.includes('permission check exceeded')).toBe(
            variant.slug === 'malfunction: allow check timeout',
          );
          expect(
            asSnapshotSafe({ text, tempDir: result.tempDir }),
          ).toMatchSnapshot();
        });
      });
    });

    when(`[t${variants.length}] the retry ask payload`, () => {
      then('the ask JSON matches snapshot', () => {
        const results = runHookTwice({
          command: 'cd src && grep -rn x . && python3 -c "print(1)"',
          settings: { allow: ['Bash(rhx:*)'] },
        });
        expect(results.second.exitCode).toBe(0);
        expect(
          JSON.stringify(JSON.parse(results.second.stdout), null, 2),
        ).toMatchSnapshot();
      });
    });
  });

  given(
    '[case41] the vision journeys: the paved rerun, and the mixed-kind center',
    () => {
      // .note = each `when` is one `[tn]` from a vision experience case (1.vision.experience.*)
      const pavedSettings = {
        allow: ['Bash(rhx:*)', 'Bash(tree:*)'],
      };

      when('[t0] the bot reruns the offered alternative (case=1 [t1])', () => {
        then('the paved grepsafe call passes, silent', () => {
          const result = runHook({
            command: 'rhx grepsafe --pattern blocklist --path src/',
            settings: pavedSettings,
          });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toBe('');
          expect(result.stderr).toBe('');
        });
      });

      when('[t1] the bot reruns the offered tree view (case=6 [t1])', () => {
        then('the paved tree call passes, silent', () => {
          const result = runHook({
            command: 'tree -L 1 src/domain.roles/mechanic/inits/',
            settings: pavedSettings,
          });
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toBe('');
          expect(result.stderr).toBe('');
        });
      });

      when(
        '[t2] the bot typos an rhx skill name (case=2 [t2], the rhx boundary)',
        () => {
          then(
            'the paved rhx prefix passes it; rhx itself owns the skill-name typo',
            () => {
              const result = runHook({
                command: 'rhx grepsaf --pattern wave',
                settings: pavedSettings,
              });
              expect(result.exitCode).toBe(0);
              expect(result.stderr).toBe('');
            },
          );
        },
      );

      when(
        '[t3] a 3-part compound mixes two alt parts and one novel part (case=1 [t3])',
        () => {
          const result = useBeforeAll(async () =>
            runHook({
              command: 'cd src && ls && python3 -c "print(1)"',
              settings: pavedSettings,
            }),
          );

          then('every part is named, each with its own kind', () => {
            expect(result.exitCode).toBe(2);
            expect(result.stderr).toContain('(3 parts)');
            expect(result.stderr).toContain('run from the cwd');
            expect(result.stderr).toContain('tree -L 1 <dir>');
            expect(result.stderr).toContain('no paved path fits this part');
          });

          then('the ledger holds two alt rows and one novel row', () => {
            const rows = getLedgerRows({ repoRoot: result.tempDir });
            expect(rows.map((row) => row.kind)).toEqual([
              'alt',
              'alt',
              'novel',
            ]);
            expect(rows.every((row) => row.verdict === 'nudged')).toBe(true);
          });

          then('the render matches snapshot', () => {
            expect(
              asSnapshotSafe({ text: result.stderr, tempDir: result.tempDir }),
            ).toMatchSnapshot();
          });
        },
      );
    },
  );

  given('[case42] a settings file that is not valid json', () => {
    when(
      '[t0] the command is blocked because the allowlist could not be read',
      () => {
        then(
          'the malfunction names the file and the parse error, and the block holds',
          () => {
            const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
            fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
            fs.writeFileSync(
              path.join(tempDir, '.claude', 'settings.json'),
              '{ "permissions": { "allow": ["Bash(git status:*)"] ',
            );
            const result = spawnSync('bash', [scriptPath], {
              cwd: tempDir,
              encoding: 'utf-8',
              input: JSON.stringify({
                tool_name: 'Bash',
                tool_input: { command: 'git status' },
              }),
              stdio: ['pipe', 'pipe', 'pipe'],
            });
            expect(result.status).toBe(2);
            expect(result.stderr).toMatch(
              /💥 MalfunctionError: settings file unparseable: settings\.json \(jq: /,
            );
            expect(result.stderr).toContain('the allowlist could not be read');
            // clamp (5.3 peer review): an unreadable allowlist is not evidence that no paved
            // path exists — the part says so, never a confident "no paved path fits"
            expect(result.stderr).toContain(
              'no paved path known — the allowlist could not be read',
            );
            expect(result.stderr).not.toContain('no paved path fits this part');
          },
        );
      },
    );

    when(
      '[t1] a settings file is valid json of the wrong shape (allow is a string)',
      () => {
        then(
          'the malfunction still names the file, never a blind block',
          () => {
            // clamp (i010 l3): the probe once ran a syntax-only `jq empty`, so a valid-json file
            //        whose `allow` was a string passed the probe, while the allow path's own
            //        program failed on it in silence — every command blocked with no cause named
            const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
            fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
            fs.writeFileSync(
              path.join(tempDir, '.claude', 'settings.json'),
              JSON.stringify({ permissions: { allow: ['Bash(rhx:*)'] } }),
            );
            fs.writeFileSync(
              path.join(tempDir, '.claude', 'settings.local.json'),
              JSON.stringify({ permissions: { allow: 'Bash(git status:*)' } }),
            );
            const result = spawnSync('bash', [scriptPath], {
              cwd: tempDir,
              encoding: 'utf-8',
              input: JSON.stringify({
                tool_name: 'Bash',
                tool_input: { command: 'git status' },
              }),
              stdio: ['pipe', 'pipe', 'pipe'],
            });
            expect(result.status).toBe(2);
            expect(result.stderr).toMatch(
              /💥 MalfunctionError: settings file unparseable: settings\.local\.json \(jq: /,
            );
            expect(result.stderr).toContain(
              'no paved path known — the allowlist could not be read',
            );
          },
        );
      },
    );
  });

  given('[case43] a command whose text is a sentinel word', () => {
    // clamp: the allow check once answered "allowed" with the same words it used for data,
    //        so a command that WAS the word `__ALL_ALLOWED__` passed the gate (fail open)
    when('[t0] the command is exactly __ALL_ALLOWED__', () => {
      then('it is blocked, never passed', () => {
        const result = runHook({
          command: '__ALL_ALLOWED__',
          settings: { allow: ['Bash(rhx:*)'] },
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain(
          '✋ ConstraintError: this command is not paved',
        );
        expect(
          asSnapshotSafe({ text: result.stderr, tempDir: result.tempDir }),
        ).toMatchSnapshot();
      });
    });

    when('[t1] the command is exactly __FAILFAST_TIMEOUT__', () => {
      then('it is nudged as a command, not misread as a timeout', () => {
        const result = runHook({
          command: '__FAILFAST_TIMEOUT__',
          settings: { allow: ['Bash(rhx:*)'] },
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain(
          '✋ ConstraintError: this command is not paved',
        );
        expect(result.stderr).not.toContain('timeout');
        expect(
          asSnapshotSafe({ text: result.stderr, tempDir: result.tempDir }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case44] the ledger rows the vision names, per kind', () => {
    // .note = each `when` is one ledger then-clause from a vision experience case
    when('[t0] a typo of a paved head (case=2 [t0])', () => {
      then('the row records kind typo', () => {
        const result = runHook({
          command: 'gti status',
          settings: { allow: ['Bash(git status:*)'] },
        });
        expect(result.exitCode).toBe(2);
        const rows = getLedgerRows({ repoRoot: result.tempDir });
        expect(rows.map((row) => row.kind)).toEqual(['typo']);
      });
    });

    when('[t1] a single alt part (case=6 [t0])', () => {
      then('the row records kind alt, head ls, verdict nudged', () => {
        const result = runHook({
          command: 'ls src',
          settings: { allow: ['Bash(tree:*)', 'Bash(rhx:*)'] },
        });
        const rows = getLedgerRows({ repoRoot: result.tempDir });
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
          kind: 'alt',
          head: 'ls',
          verdict: 'nudged',
        });
      });
    });

    when('[t2] a compound of three alt parts (case=1 [t2])', () => {
      then('the ledger gains three rows, all alt', () => {
        const result = runHook({
          command: 'cd src && ls && grep -rn blocklist .',
          settings: { allow: ['Bash(tree:*)', 'Bash(rhx:*)'] },
        });
        const rows = getLedgerRows({ repoRoot: result.tempDir });
        expect(rows.map((row) => row.kind)).toEqual(['alt', 'alt', 'alt']);
      });
    });

    when('[t3] any row (case=5 [t0])', () => {
      then(
        'it carries at, part, head, kind, verdict — and no field beyond them',
        () => {
          const result = runHook({
            command: 'python3 -c "print(1)"',
            settings: { allow: ['Bash(rhx:*)'] },
          });
          const rows = getLedgerRows({ repoRoot: result.tempDir });
          expect(Object.keys(rows[0] ?? {}).sort()).toEqual([
            'at',
            'head',
            'kind',
            'part',
            'verdict',
          ]);
        },
      );
    });
  });

  given('[case45] a nudge record or payload the hook cannot parse', () => {
    when('[t0] the nudge record holds broken json', () => {
      then(
        'the block holds, and the record malfunction is named with its remedy',
        () => {
          const result = runHookCopy({
            hookSource: hookSourceLive,
            command: 'python3 -c "print(1)"',
            allow: [],
            flags: [],
            withInventory: true,
            prepare: ({ tempDir }) =>
              fs.writeFileSync(
                path.join(tempDir, '.claude', 'permission.nudges.local.json'),
                '{ "python3',
              ),
          });
          expect(result.exitCode).toBe(2);
          expect(result.stderr).toMatch(
            /💥 MalfunctionError: the nudge record could not be read \(.*permission\.nudges\.local\.json: jq: /,
          );
          expect(result.stderr).toContain(
            'delete the file and the hook recreates it',
          );
          expect(
            asSnapshotSafe({ text: result.stderr, tempDir: result.tempDir }),
          ).toMatchSnapshot();
        },
      );
    });

    when('[t1] the PreToolUse payload is not valid json', () => {
      then('the gate holds (exit 2), never a silent permit', () => {
        // clamp: a payload jq could not parse once yielded an empty command, and the
        //        empty-command guard then permitted the call (fail open)
        const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
        fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
        fs.writeFileSync(
          path.join(tempDir, '.claude', 'settings.json'),
          JSON.stringify({ permissions: { allow: [], deny: [], ask: [] } }),
        );
        const result = spawnSync('bash', [scriptPath], {
          cwd: tempDir,
          encoding: 'utf-8',
          input: '{ "tool_name": "Bash", "tool_input": { "command": ',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        expect(result.status).toBe(2);
        expect(result.stderr).toContain(
          '💥 MalfunctionError: PreToolUse payload is not valid json',
        );
        expect(
          asSnapshotSafe({ text: result.stderr, tempDir }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case46] many clones block at once in one repo', () => {
    when('[t0] twelve hooks append to the ledger concurrently', () => {
      then('every row lands whole: one per hook, each parses', async () => {
        const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
        fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
        fs.writeFileSync(
          path.join(tempDir, '.claude', 'settings.json'),
          JSON.stringify({
            permissions: { allow: ['Bash(rhx:*)'], deny: [], ask: [] },
          }),
        );
        // each row is a few hundred bytes, so a torn write would show as a bad line
        // .note = the command stays ~260 chars: the allow check splits a compound char by char,
        //         so twelve ~800-char checks at once on a loaded host exceed the failfast budget
        //         (fail-closed, but then no row is written and this case no longer tests rows)
        // .note = each child's stderr is kept and asserted: every hook must reach the nudge
        //         (never a malfunction path), or a missed row would hide behind exit 2
        const runOne = (
          index: number,
        ): Promise<{ code: number | null; stderr: string }> =>
          new Promise((settle, fail) => {
            const child = spawn('bash', [scriptPath], {
              cwd: tempDir,
              stdio: ['pipe', 'ignore', 'pipe'],
            });
            const chunks: string[] = [];
            child.stderr.on('data', (chunk) => chunks.push(String(chunk)));
            // a spawn failure never fires 'close'; fail so it is named, never a silent hang
            child.on('error', (error) => fail(error));
            child.on('close', (code) =>
              settle({ code, stderr: chunks.join('') }),
            );
            child.stdin.end(
              JSON.stringify({
                tool_name: 'Bash',
                tool_input: {
                  command: `python3 -c "print(${index})" # ${'wave '.repeat(50)}`,
                },
              }),
            );
          });
        const results = await Promise.all(
          Array.from({ length: 12 }, (_, index) => runOne(index)),
        );
        expect(results.map((result) => result.code)).toEqual(Array(12).fill(2));
        expect(
          results.filter((result) =>
            result.stderr.includes('MalfunctionError'),
          ),
        ).toEqual([]);
        const rows = getLedgerRows({ repoRoot: tempDir });
        expect(rows).toHaveLength(12);
        expect(rows.every((row) => row.verdict === 'nudged')).toBe(true);
      });
    });
  });

  given(
    '[case47] an exact pattern whose argument value holds the head letters in order',
    () => {
      // clamp: the fzf tier once scanned every word of a pattern, so `sort` matched the
      //        quoted argument `'path://src/domain.operations/surfer'` and ranked an
      //        unrelated test command as "did you mean?"
      const argumentHeavyAllow = [
        "Bash(rhx git.repo.test --what unit --scope 'path://src/domain.operations/surfer')",
      ];

      when('[t0] the bot runs `sort`', () => {
        then('no argument value is offered as a fit; the part is novel', () => {
          const result = runHook({
            command: 'sort src/waves.txt',
            settings: { allow: argumentHeavyAllow },
          });
          expect(result.exitCode).toBe(2);
          expect(result.stderr).not.toContain('git.repo.test');
          expect(result.stderr).toContain('no paved path fits this part');
        });
      });

      when(
        '[t1] the head is an in-order slip of a command word (`rpotst` → `git.repo.test`)',
        () => {
          then('the fzf tier still finds the command word', () => {
            const result = runHook({
              command: 'rpotst --what unit',
              settings: { allow: ['Bash(rhx git.repo.test:*)'] },
            });
            expect(result.exitCode).toBe(2);
            expect(result.stderr).toContain('[p] rhx git.repo.test');
          });
        },
      );
    },
  );

  given(
    '[case48] the wisher rulings on F8 (record race) and F11 (both streams)',
    () => {
      when(
        '[t0] twelve distinct commands are first attempted at once in one repo',
        () => {
          then(
            'the nudge record holds every one — no clone drops another',
            async () => {
              // clamp: the record was an unlocked read → merge → replace, so concurrent first
              //        attempts dropped each other's entries (one more block per lost entry)
              const tempDir = genTempDir({
                slug: 'permissions-hook',
                git: true,
              });
              fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
              fs.writeFileSync(
                path.join(tempDir, '.claude', 'settings.json'),
                JSON.stringify({
                  permissions: { allow: [], deny: [], ask: [] },
                }),
              );
              const commands = Array.from(
                { length: 12 },
                (_, index) => `python3 -c "print(${index})"`,
              );
              // .note = each child's stderr is kept: a record write that failed out loud
              //         must show here, not hide behind exit 2
              const runOne = (
                command: string,
              ): Promise<{ code: number | null; stderr: string }> =>
                new Promise((settle, fail) => {
                  const child = spawn('bash', [scriptPath], {
                    cwd: tempDir,
                    stdio: ['pipe', 'ignore', 'pipe'],
                  });
                  const chunks: string[] = [];
                  child.stderr.on('data', (chunk) =>
                    chunks.push(String(chunk)),
                  );
                  // a spawn failure never fires 'close'; fail so it is named, never a silent hang
                  child.on('error', (error) => fail(error));
                  child.on('close', (code) =>
                    settle({ code, stderr: chunks.join('') }),
                  );
                  child.stdin.end(
                    JSON.stringify({
                      tool_name: 'Bash',
                      tool_input: { command },
                    }),
                  );
                });
              const results = await Promise.all(commands.map(runOne));
              expect(
                results
                  .map((result) => result.stderr)
                  .filter((stderr) => stderr.includes('MalfunctionError')),
              ).toEqual([]);
              expect(results.map((result) => result.code)).toEqual(
                Array(12).fill(2),
              );
              const record = JSON.parse(
                fs.readFileSync(
                  path.join(tempDir, '.claude', 'permission.nudges.local.json'),
                  'utf-8',
                ),
              );
              expect(Object.keys(record).sort()).toEqual([...commands].sort());
              expect(
                fs.existsSync(
                  path.join(
                    tempDir,
                    '.claude',
                    'permission.nudges.local.json.lock',
                  ),
                ),
              ).toBe(false);
            },
          );
        },
      );

      when('[t1] a lock was left behind by a crashed holder', () => {
        then('the next hook takes it over and records the attempt', () => {
          const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
          fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
          fs.writeFileSync(
            path.join(tempDir, '.claude', 'settings.json'),
            JSON.stringify({ permissions: { allow: [], deny: [], ask: [] } }),
          );
          // a lock whose holder pid no longer runs (4194305 exceeds linux's pid_max limit)
          const lockDir = path.join(
            tempDir,
            '.claude',
            'permission.nudges.local.json.lock',
          );
          fs.mkdirSync(lockDir);
          fs.writeFileSync(path.join(lockDir, 'pid'), '4194305\n');
          const result = spawnSync('bash', [scriptPath], {
            cwd: tempDir,
            encoding: 'utf-8',
            input: JSON.stringify({
              tool_name: 'Bash',
              tool_input: { command: 'python3 -c "print(1)"' },
            }),
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          expect(result.status).toBe(2);
          expect(result.stderr).not.toContain('MalfunctionError');
          const record = JSON.parse(
            fs.readFileSync(
              path.join(tempDir, '.claude', 'permission.nudges.local.json'),
              'utf-8',
            ),
          );
          expect(Object.keys(record)).toEqual(['python3 -c "print(1)"']);
        });
      });

      when('[t2] a command is blocked', () => {
        then(
          'the block render reaches stdout and stderr both, identically',
          () => {
            const result = runHook({
              command: 'python3 -c "print(1)"',
              settings: { allow: ['Bash(rhx:*)'] },
            });
            expect(result.exitCode).toBe(2);
            expect(result.stdout).toContain(
              '✋ ConstraintError: this command is not paved',
            );
            expect(result.stdout).toEqual(result.stderr);
          },
        );
      });

      when('[t3] the hook malfunctions (empty stdin)', () => {
        then('the malfunction reaches stdout and stderr both', () => {
          const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
          fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
          const result = spawnSync('bash', [scriptPath], {
            cwd: tempDir,
            encoding: 'utf-8',
            input: '',
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          expect(result.status).toBe(2);
          expect(result.stdout).toContain('💥 MalfunctionError');
          expect(result.stdout).toEqual(result.stderr);
        });
      });

      when('[t4] a retry is handed to the human', () => {
        then('stdout holds only the ask json', () => {
          const results = runHookTwice({
            command: 'python3 -c "print(1)"',
            settings: { allow: ['Bash(rhx:*)'] },
          });
          expect(results.second.exitCode).toBe(0);
          expect(
            JSON.parse(results.second.stdout).hookSpecificOutput
              .permissionDecision,
          ).toBe('ask');
        });
      });
    },
  );

  given(
    '[case49] the record lock fails closed; the cap is shared across parts',
    () => {
      const lockName = 'permission.nudges.local.json.lock';
      const command = 'python3 -c "print(1)"';

      when('[t0] the lock cannot be made (a read-only .claude dir)', () => {
        then('the block holds and the lock malfunction is named', () => {
          let claudeDir = '';
          const result = runHookCopy({
            hookSource: hookSourceLive,
            command,
            allow: [],
            flags: [],
            withInventory: true,
            prepare: ({ tempDir }) => {
              claudeDir = path.join(tempDir, '.claude');
              fs.writeFileSync(
                path.join(claudeDir, 'permission.nudges.local.json'),
                '{}',
              );
              fs.chmodSync(claudeDir, 0o555);
            },
          });
          fs.chmodSync(claudeDir, 0o755);
          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain(
            '💥 MalfunctionError: the nudge record lock could not be made',
          );
          expect(
            asSnapshotSafe({ text: result.stderr, tempDir: result.tempDir }),
          ).toMatchSnapshot();
        });
      });

      when('[t1] a live holder never releases the lock', () => {
        then(
          'the wait is bounded, the block holds, and the stuck lock is named',
          () => {
            // the jest process itself is the live holder; the wait bound is cut to 0.5s
            const result = runHookCopy({
              hookSource: hookSourceLive.replace(
                'ATTEMPT_LOCK_LIVE_TRIES=40',
                'ATTEMPT_LOCK_LIVE_TRIES=10',
              ),
              command,
              allow: [],
              flags: [],
              withInventory: true,
              prepare: ({ tempDir }) => {
                const lockDir = path.join(tempDir, '.claude', lockName);
                fs.mkdirSync(lockDir);
                fs.writeFileSync(path.join(lockDir, 'pid'), `${process.pid}\n`);
              },
            });
            expect(result.exitCode).toBe(2);
            expect(result.stderr).toContain(
              '💥 MalfunctionError: the nudge record lock stayed held',
            );
            expect(
              asSnapshotSafe({ text: result.stderr, tempDir: result.tempDir }),
            ).toMatchSnapshot();
          },
        );
      });

      when('[t3] a live holder, at the shipped wait bound', () => {
        then(
          'the hook gives up the stamp and blocks well inside its 10s registered timeout',
          () => {
            // 🔴 a hook the harness kills never reaches its EXIT trap, and claude code reads a
            //    killed PreToolUse hook as a permit. the wait once ran 30s against a 10s
            //    timeout, so lock contention could open the gate. the shipped bound, unpatched
            const startedAt = Date.now();
            const result = runHookCopy({
              hookSource: hookSourceLive,
              command,
              allow: [],
              flags: [],
              withInventory: true,
              prepare: ({ tempDir }) => {
                const lockDir = path.join(tempDir, '.claude', lockName);
                fs.mkdirSync(lockDir);
                fs.writeFileSync(path.join(lockDir, 'pid'), `${process.pid}\n`);
              },
            });
            const elapsedMs = Date.now() - startedAt;
            expect(result.exitCode).toBe(2);
            expect(result.stderr).toContain(
              '💥 MalfunctionError: the nudge record lock stayed held',
            );
            // .note = the bound is the kill window less a margin for host load (the old wait ran
            //         30s); a full parallel suite measured 6.5s here
            expect(elapsedMs).toBeLessThan(8500);
          },
        );
      });

      when(
        '[t2] a holder died between mkdir and its pid write (no pid file)',
        () => {
          then(
            'the lock is taken over after the grace, and the attempt is recorded',
            () => {
              // the grace is cut from ~5s to ~0.25s
              let recordPath = '';
              const result = runHookCopy({
                hookSource: hookSourceLive.replace(
                  'if [[ $nopid -ge 100 ]]; then',
                  'if [[ $nopid -ge 5 ]]; then',
                ),
                command,
                allow: [],
                flags: [],
                withInventory: true,
                prepare: ({ tempDir }) => {
                  recordPath = path.join(
                    tempDir,
                    '.claude',
                    'permission.nudges.local.json',
                  );
                  fs.mkdirSync(path.join(tempDir, '.claude', lockName));
                },
              });
              expect(result.exitCode).toBe(2);
              expect(result.stderr).not.toContain('MalfunctionError');
              expect(
                Object.keys(JSON.parse(fs.readFileSync(recordPath, 'utf-8'))),
              ).toEqual([command]);
            },
          );
        },
      );

      when(
        '[t4] an orphaned lock cannot be removed (a stray file, no pid)',
        () => {
          then(
            'the take-over failure is named at once, never read as a live holder',
            () => {
              // the grace is cut from ~5s to ~0.25s; a stray file makes rmdir fail with no pid
              const result = runHookCopy({
                hookSource: hookSourceLive.replace(
                  'if [[ $nopid -ge 100 ]]; then',
                  'if [[ $nopid -ge 5 ]]; then',
                ),
                command,
                allow: [],
                flags: [],
                withInventory: true,
                prepare: ({ tempDir }) => {
                  const lockDir = path.join(tempDir, '.claude', lockName);
                  fs.mkdirSync(lockDir);
                  fs.writeFileSync(path.join(lockDir, 'surfboard.wax'), 'wax');
                },
              });
              expect(result.exitCode).toBe(2);
              expect(result.stderr).toContain(
                '💥 MalfunctionError: the nudge record lock could not be taken over',
              );
              expect(result.stderr).not.toContain('stayed held');
              expect(
                asSnapshotSafe({
                  text: result.stderr,
                  tempDir: result.tempDir,
                }),
              ).toMatchSnapshot();
            },
          );
        },
      );

      when(
        '[t3] two blocked parts each rank dozens of candidates (case=1 [t2]/[t3])',
        () => {
          then(
            'the total across parts stays at 21, with one overflow line',
            () => {
              const result = runHook({
                command: 'git stash && git stasj',
                settings: {
                  allow: Array.from(
                    { length: 40 },
                    (_, i) => `Bash(git stash${i}:*)`,
                  ),
                },
              });
              expect(result.exitCode).toBe(2);
              const candidates = result.stderr
                .split('\n')
                .filter((line) => /^\s+│\s+[├└]─\s+\[[ep]\] /.test(line));
              expect(candidates).toHaveLength(21);
              expect(result.stderr).toMatch(/… and \d+ more/);
              // the shared-cap split across two parts is its own render; pin it
              expect(
                asSnapshotSafe({
                  text: result.stderr,
                  tempDir: result.tempDir,
                }),
              ).toMatchSnapshot();
            },
          );
        },
      );
    },
  );

  given('[case50] failures the record create and SOFTNUDGE must name', () => {
    when(
      '[t0] the record is absent and cannot be created (a read-only .claude)',
      () => {
        then(
          'the block holds and the create failure is named, never swallowed',
          () => {
            let claudeDir = '';
            const result = runHookCopy({
              hookSource: hookSourceLive,
              command: 'python3 -c "print(1)"',
              allow: [],
              flags: [],
              withInventory: true,
              prepare: ({ tempDir }) => {
                claudeDir = path.join(tempDir, '.claude');
                fs.chmodSync(claudeDir, 0o555);
              },
            });
            fs.chmodSync(claudeDir, 0o755);
            expect(result.exitCode).toBe(2);
            expect(result.stderr).toContain(
              '💥 MalfunctionError: the nudge record could not be created',
            );
            expect(
              asSnapshotSafe({ text: result.stderr, tempDir: result.tempDir }),
            ).toMatchSnapshot();
          },
        );
      },
    );

    when('[t1] SOFTNUDGE runs without its inventory file', () => {
      const result = useBeforeAll(async () =>
        runHookCopy({
          hookSource: hookSourceLive,
          command: 'grep -rn wave .',
          allow: [],
          flags: ['--mode', 'SOFTNUDGE'],
          withInventory: false,
          prepare: null,
        }),
      );

      then('the malfunction reaches stdout and stderr both', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          '💥 MalfunctionError: inventory file absent',
        );
        expect(result.stderr).toContain(
          '💥 MalfunctionError: inventory file absent',
        );
      });

      then(
        'the advisory leads with the caveat, and claims no false "no paved path"',
        () => {
          // clamp (5.3 peer review): the caveat once came last, under a confident
          //        "no paved path fits" that an unreadable inventory caused
          const text = result.stdout;
          expect(
            text.indexOf('💥 MalfunctionError: inventory file absent'),
          ).toBeLessThan(text.indexOf('├─ blocked:'));
          expect(text).toContain(
            'no paved path known — the inventory could not be read',
          );
          expect(text).not.toContain('no paved path fits this part');
          expect(
            asSnapshotSafe({ text: result.stdout, tempDir: result.tempDir }),
          ).toMatchSnapshot();
        },
      );
    });

    when('[t2] the hook is registered with a mistyped --mode', () => {
      then(
        'the value is named loud and the gate holds, never a silent HARDNUDGE',
        () => {
          const result = runHookCopy({
            hookSource: hookSourceLive,
            command: 'git status',
            allow: ['Bash(git status:*)'],
            flags: ['--mode', 'SOFTNUDGE2'],
            withInventory: true,
            prepare: null,
          });
          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain(
            "got --mode 'SOFTNUDGE2' — expected HARDNUDGE, SOFTNUDGE, or LOOKUP",
          );
          expect(
            asSnapshotSafe({ text: result.stderr, tempDir: result.tempDir }),
          ).toMatchSnapshot();
        },
      );
    });

    when('[t3] the hook is registered with a non-numeric --window', () => {
      then(
        'the value is named loud and the gate holds, never a silent 0s window',
        () => {
          const result = runHookCopy({
            hookSource: hookSourceLive,
            command: 'git status',
            allow: ['Bash(git status:*)'],
            flags: ['--window', '6O'],
            withInventory: true,
            prepare: null,
          });
          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain(
            "got --window '6O' — expected whole seconds",
          );
          expect(
            asSnapshotSafe({ text: result.stderr, tempDir: result.tempDir }),
          ).toMatchSnapshot();
        },
      );
    });
  });

  given('[case51] vision then-clauses asserted directly', () => {
    when('[t0] a single blocked part (case=6 [t0])', () => {
      // one hook run, read by every then below
      const result = useBeforeAll(async () =>
        runHook({
          command: 'ls src',
          settings: { allow: ['Bash(tree:*)', 'Bash(rhx:*)'] },
        }),
      );

      then('no split tip renders — there is no other part to name', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stderr).not.toContain('tip: a compound runs only if');
      });

      then('the single-part render matches snapshot', () => {
        expect(
          asSnapshotSafe({ text: result.stderr, tempDir: result.tempDir }),
        ).toMatchSnapshot();
      });

      then('the 🥥 hint closes on the move the reader makes', () => {
        // clamp (5.3 peer review): the hint once closed on a consequence; the coconut-hint
        //        anatomy puts the actionable line last
        const hint = result.stderr.split('🥥 did you know?')[1] ?? '';
        const lines = hint.split('\n').filter((line) => line.trim().length > 0);
        expect(lines.at(-1)).toContain(
          '└─ 3. need this exact command once? retry it unchanged — that interrupts the human to ask',
        );
      });
    });

    when('[t2] the blocked command holds single quotes', () => {
      const result = useBeforeAll(async () =>
        runHook({
          command: "grep -rln 'reef' src/",
          settings: { allow: ['Bash(rhx:*)'] },
        }),
      );

      then('the see-all move quotes it so it pastes and runs as-is', () => {
        // clamp: a bare '...' wrap would end the word at the first inner quote
        expect(result.stderr).toContain(
          "1. see all pre-approved commands: rhx permissions.get --for 'grep -rln '\\''reef'\\'' src/'",
        );
      });

      then('the quoted word reads back as the exact command', () => {
        const hintLine =
          result.stderr
            .split('\n')
            .find((line) => line.includes('rhx permissions.get --for')) ?? '';
        const word = hintLine.split('--for ')[1] ?? '';
        const echoed = spawnSync('bash', ['-c', `printf '%s' ${word}`], {
          encoding: 'utf-8',
        });
        expect(echoed.stdout).toBe("grep -rln 'reef' src/");
      });
    });

    when(
      '[t3] a long head sits two deletions from a short pattern head',
      () => {
        const result = useBeforeAll(async () =>
          runHook({
            command: 'chmod +x src/surfer.sh',
            settings: {
              allow: ['Bash(cmd | rhx teesafe waves.txt)', 'Bash(rhx:*)'],
            },
          }),
        );

        then('the short head is withheld — no "did you mean? cmd"', () => {
          // clamp (live 2026-10-04): `chmod` → `[e] cmd | rhx teesafe waves.txt` was offered as a
          //        typo; the edit budget of the long word let two deletions through
          // .note = `cmd` is the live pair itself, never a placeholder: it sits two deletions
          //         from `chmod`. a themed word would not reproduce the defect
          expect(result.exitCode).toBe(2);
          expect(result.stderr).not.toContain('did you mean?');
          expect(result.stderr).not.toContain('cmd | rhx teesafe');
          expect(result.stderr).toContain('no paved path fits this part');
        });
      },
    );

    when('[t1] a weak fit is withheld (case=7 [t0])', () => {
      then('the ledger row records { kind: novel, head: du }', () => {
        const result = runHook({
          command: 'du -sh dist',
          settings: { allow: ['Bash(diff:*)'] },
        });
        const rows = getLedgerRows({ repoRoot: result.tempDir });
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ kind: 'novel', head: 'du' });
      });
    });
  });

  given('[case52] needs the live 5.3 walk found unmet', () => {
    // .note = both came from this hook, live, on the route's own session: the offer named a
    //         pattern that could not serve the need, and the bot tried again blind
    when(
      '[t0] the bot filters json with jq (`[e] jq` paves only a bare jq)',
      () => {
        then(
          'the paved pipe form is offered, not a bare `[e] jq` alone',
          () => {
            const result = runHook({
              command: 'jq .scripts package.json',
              settings: { allow: ['Bash(jq)', 'Bash(cat:*)'] },
              clearNudges: true,
            });
            expect(result.exitCode).toBe(2);
            expect(result.stderr).toContain('─ paved alternatives for `jq`\n');
            expect(result.stderr).toContain('cat <file> | jq');
            expect(
              asSnapshotSafe({ text: result.stderr, tempDir: result.tempDir }),
            ).toMatchSnapshot();
          },
        );
      },
    );

    when('[t1] the bot reads a line range with sed -n', () => {
      then('a paved read is offered beside the edit tool', () => {
        const result = runHook({
          command: 'sed -n 150,320p waves.txt',
          settings: { allow: ['Bash(head:*)', 'Bash(tail:*)'] },
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('rhx sedreplace');
        expect(result.stderr).toContain(
          'head -n <last> <file> | tail -n <count>',
        );
        expect(
          asSnapshotSafe({ text: result.stderr, tempDir: result.tempDir }),
        ).toMatchSnapshot();
      });
    });

    when('[t2] a ranked pattern renders with its [e] or [p] marker', () => {
      then('the block carries the marker key, once', () => {
        const result = runHook({
          command: 'gti status',
          settings: { allow: ['Bash(git status:*)', 'Bash(jq)'] },
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('[p] git status');
        const keys =
          result.stderr.match(
            /key: \[e\] = the whole part must match exactly/g,
          ) ?? [];
        expect(keys).toHaveLength(1);
        expect(
          asSnapshotSafe({ text: result.stderr, tempDir: result.tempDir }),
        ).toMatchSnapshot();
      });
    });

    when('[t3] no pattern renders (a novel part)', () => {
      then('no marker key renders — there is no marker to explain', () => {
        const result = runHook({
          command: 'python3 -c "print(1)"',
          settings: { allow: ['Bash(tree:*)'] },
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).not.toContain('key: [e]');
        expect(
          asSnapshotSafe({ text: result.stderr, tempDir: result.tempDir }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case53] a global flag before the subcommand', () => {
    // .note = a flag between the head and the subcommand shifts every later word one slot,
    //         so the shared-lead tier once matched no pattern and rendered the part as novel
    const allow = [
      'Bash(git log:*)',
      'Bash(git status:*)',
      'Bash(npm run test:*)',
    ];

    when(
      '[t0] the bot runs `git -C . log --oneline -20` (a flag that takes a value)',
      () => {
        then(
          'the gate still blocks, and the paved subcommand is offered with the flag named',
          () => {
            const result = runHook({
              command: 'git -C . log --oneline -20',
              settings: { allow },
              clearNudges: true,
            });
            expect(result.exitCode).toBe(2);
            expect(result.stderr).toContain('did you mean?');
            expect(result.stderr).toContain('[p] git log');
            expect(result.stderr).toContain(
              '`-C .` sits before the subcommand, so no paved prefix fits as written',
            );
            expect(result.stderr).not.toContain('no paved path fits this part');
            expect(
              asSnapshotSafe({ text: result.stderr, tempDir: result.tempDir }),
            ).toMatchSnapshot();
          },
        );
      },
    );

    when(
      '[t1] the bot runs `git --no-pager log` (a flag that takes no value)',
      () => {
        then('the bare view lines up, and names the one flag', () => {
          const result = runHook({
            command: 'git --no-pager log',
            settings: { allow },
            clearNudges: true,
          });
          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('[p] git log');
          expect(result.stderr).toContain(
            '`--no-pager` sits before the subcommand',
          );
        });
      },
    );

    when(
      '[t2] the bot runs `npm --prefix surf run test` (a long flag with a value)',
      () => {
        then('the whole paved prefix is offered', () => {
          const result = runHook({
            command: 'npm --prefix surf run test',
            settings: { allow },
            clearNudges: true,
          });
          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('[p] npm run test');
          expect(result.stderr).toContain(
            '`--prefix surf` sits before the subcommand',
          );
        });
      },
    );

    when('[t3] the subcommand after the flag fits no pattern', () => {
      then(
        'no fit is invented: the part stays novel, with no flag advice',
        () => {
          const result = runHook({
            command: 'git -C . frobnicate',
            settings: { allow },
            clearNudges: true,
          });
          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('no paved path fits this part');
          expect(result.stderr).not.toContain('sits before the subcommand');
        },
      );
    });

    when(
      '[t4] a flag on a command whose head is paved by the inventory (`ls -l src`)',
      () => {
        then('it still keys on `ls`; the flag view adds no advice', () => {
          const result = runHook({
            command: 'ls -l src',
            settings: { allow: ['Bash(tree:*)'] },
            clearNudges: true,
          });
          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('paved alternatives for `ls`');
          expect(result.stderr).not.toContain('sits before the subcommand');
        });
      },
    );
  });

  given('[case57] the render lib is absent beside the hook', () => {
    // 🔴 the hook sources _permissions.render.lib.sh ahead of its EXIT trap. claude code reads
    //    any exit but 2 as a permit, so a load failure must block, loud, by itself
    when('[t0] a copy of the hook runs with no lib beside it', () => {
      then(
        'it blocks (exit 2) and names the absent lib on both streams',
        () => {
          const hookDir = genTempDir({ slug: 'permissions-hook-nolib' });
          const hookCopy = path.join(
            hookDir,
            'pretooluse.check-permissions.sh',
          );
          fs.copyFileSync(scriptPath, hookCopy);
          const tempDir = genTempDir({ slug: 'permissions-hook', git: true });
          fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
          fs.writeFileSync(
            path.join(tempDir, '.claude', 'settings.json'),
            JSON.stringify({ permissions: { allow: ['Bash(ls:*)'] } }),
          );
          const result = spawnSync('bash', [hookCopy], {
            cwd: tempDir,
            encoding: 'utf-8',
            input: JSON.stringify({
              tool_name: 'Bash',
              tool_input: { command: 'ls' },
            }),
          });
          expect(result.status).toBe(2);
          expect(result.stderr).toContain(
            '💥 MalfunctionError: check-permissions could not load',
          );
          expect(result.stdout).toContain('_permissions.render.lib.sh');
        },
      );
    });
  });

  given('[case56] the candidate budget and the rank tie-break', () => {
    // 30 exact rows that all share the head and flag of the blocked part, so the rank has far
    // more near misses than one part's fair share of the 21 cap
    const RICH = Array.from(
      { length: 30 },
      (_, i) => `Bash(rhx surf.wave.ride --board b${i})`,
    );
    const asCandidateLines = (input: {
      stderr: string;
      head: string;
    }): string[] =>
      input.stderr
        .split('\n')
        .filter((line) => /\[[ep]\] /.test(line) && line.includes(input.head));

    when('[t0] a light part (advice only) sits beside a rich part', () => {
      // .note = the `cd` part shows advice and no candidate. its fair share once went
      //         unused while the rich part was cut to 11 of 21
      then('the rich part takes the share the light part left unused', () => {
        const result = runHook({
          command: 'cd foo && rhx surf.wave.ride --board z',
          settings: { allow: RICH },
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
        const shown = asCandidateLines({
          stderr: result.stderr,
          head: 'rhx surf.wave.ride',
        });
        expect(shown.length).toBeGreaterThan(11);
        expect(shown.length).toBeLessThanOrEqual(21);
      });
    });

    when('[t1] two rich parts sit side by side', () => {
      then(
        'each keeps its fair share, and the total stays at 21 or less',
        () => {
          const result = runHook({
            command:
              'rhx surf.wave.ride --board z && rhx surf.wave.ride --board y',
            settings: { allow: RICH },
            clearNudges: true,
          });
          const shown = asCandidateLines({
            stderr: result.stderr,
            head: 'rhx surf.wave.ride',
          });
          expect(shown.length).toBeLessThanOrEqual(21);
          expect(result.stderr).toContain('… and ');
        },
      );
    });

    when('[t2] two rows score the same', () => {
      // .why = a tie breaks alphabetically (the allowlist union is sorted), so the render is
      //        stable for one allowlist set however its rows are ordered or split across files
      const asOrder = (input: { allow: string[] }): string[] =>
        asCandidateLines({
          stderr: runHook({
            command: 'rhx reef.tide',
            settings: { allow: input.allow },
            clearNudges: true,
          }).stderr,
          head: 'rhx reef.tide',
        });

      then(
        'the alphabetically first row ranks first, in either file order',
        () => {
          const forward = asOrder({
            allow: ['Bash(rhx reef.tide1:*)', 'Bash(rhx reef.tide2:*)'],
          });
          const backward = asOrder({
            allow: ['Bash(rhx reef.tide2:*)', 'Bash(rhx reef.tide1:*)'],
          });
          expect(forward.length).toBe(2);
          expect(forward).toEqual(backward);
          expect(forward[0]).toContain('reef.tide1');
        },
      );
    });
  });

  given('[case55] an escaped quote inside a double-quoted argument', () => {
    // .note = the splitter once ignored backslashes, so `\"` closed the double-quoted span
    //         and the `|` after it split one paved call into two parts — a false block
    when('[t0] a paved call holds `"a|\\"b|c"`', () => {
      then('it stays one part and permits', () => {
        const result = runHook({
          command: 'rhx grepsafe --pattern "a|\\"b|c" --path src',
          settings: { allow: ['Bash(rhx grepsafe:*)'] },
          clearNudges: true,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stderr).not.toContain('not paved');
      });
    });

    when('[t1] an escaped pipe sits outside any quotes', () => {
      then('the `\\|` is a literal, never a split', () => {
        const result = runHook({
          command: 'rhx grepsafe --pattern a\\|b --path src',
          settings: { allow: ['Bash(rhx grepsafe:*)'] },
          clearNudges: true,
        });
        expect(result.exitCode).toBe(0);
      });
    });

    when('[t2] a real pipe follows the quoted span', () => {
      then('the split still happens at the real pipe', () => {
        const result = runHook({
          command: 'rhx grepsafe --pattern "a\\"b" --path src | sed -n 1p',
          settings: { allow: ['Bash(rhx grepsafe:*)'] },
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('blocked: sed -n 1p');
        expect(result.stderr).not.toContain('blocked: rhx grepsafe');
      });
    });
  });

  given('[case54] a shell loop or branch, split on `;`', () => {
    // .note = the `;` split hands a loop body over as `do tail -4 f`; it once keyed on `do`,
    //         and the `for …` / `done` parts were pushed to "pave it"
    when('[t0] the bot runs `for r in a b; do tail -4 "$r.md"; done`', () => {
      then(
        'the body keys on its command; the loop words render as grammar, not novel',
        () => {
          const result = runHook({
            command: 'for r in a b; do tail -4 "$r.md"; done',
            settings: { allow: ['Bash(tail:*)'] },
            clearNudges: true,
          });
          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain(
            'this command is not paved (3 parts)',
          );
          expect(result.stderr).toContain('blocked: do tail -4 "$r.md"');
          expect(result.stderr).toContain('[p] tail');
          expect(
            result.stderr.match(/shell grammar, not a command/g) ?? [],
          ).toHaveLength(2);
          expect(result.stderr).not.toContain('no paved path fits this part');
          expect(
            asSnapshotSafe({ text: result.stderr, tempDir: result.tempDir }),
          ).toMatchSnapshot();
        },
      );
    });

    when(
      '[t1] the bot runs an if-branch: `if grep -q wave f; then cat f; fi`',
      () => {
        then('each branch keys on its command; `fi` renders as grammar', () => {
          const result = runHook({
            command: 'if grep -q wave f; then cat f; fi',
            settings: { allow: ['Bash(cat:*)'] },
            clearNudges: true,
          });
          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('paved alternatives for `grep`');
          expect(result.stderr).toContain('[p] cat');
          expect(result.stderr).toContain('blocked: fi');
          expect(result.stderr).toContain('shell grammar, not a command');
        });
      },
    );

    when('[t2] the bot retries the loop unchanged', () => {
      then(
        'the ask reason names the loop words as grammar, never as unpaved commands',
        () => {
          const result = runHookTwice({
            command: 'for r in a b; do tail -4 "$r.md"; done',
            settings: { allow: ['Bash(tail:*)'] },
          });
          expect(result.second.exitCode).toBe(0);
          const reason = JSON.parse(result.second.stdout).hookSpecificOutput
            .permissionDecisionReason;
          expect(reason).toContain('for: shell grammar, not a command');
          expect(reason).toContain('done: shell grammar, not a command');
          expect(reason).toContain(
            'tail: nearest paved pattern offered — [p] tail',
          );
        },
      );
    });
  });

  given(
    '[case58] a long compound of unpaved parts, against a full allowlist',
    () => {
      // 🔴 a hook the harness kills never reaches its EXIT trap, and claude code reads a killed
      //    PreToolUse hook as a permit. the candidate search ran once per blocked part with no
      //    time bound, so a long enough compound could outrun the 10s registered timeout
      const allow = Array.from(
        { length: 200 },
        (_, i) => `Bash(reef${i} tide${i} --swell:*)`,
      );
      const command = Array.from(
        { length: 150 },
        (_, i) => `kelp${i} --drift ${i}`,
      ).join(' ; ');
      // .note = only the allow check's own bound is lifted, so a loaded host cannot fail the
      //         allow check closed before the search this case clamps; the search budget and
      //         the whole-hook deadline stay as shipped, and they alone must stop it in time
      const hookSource = fs
        .readFileSync(scriptPath, 'utf-8')
        .replace('FAILFAST_TIMEOUT=4', 'FAILFAST_TIMEOUT=60');

      when('[t0] the shipped search budget and deadline meet it', () => {
        then(
          'it blocks well inside its 10s registered timeout, and names the parts it left unsearched',
          () => {
            const startedAt = Date.now();
            const result = runHookCopy({
              hookSource,
              command,
              allow,
              flags: [],
              withInventory: true,
              prepare: null,
            });
            const elapsedMs = Date.now() - startedAt;
            expect(result.exitCode).toBe(2);
            expect(result.stderr).toContain('blocked: kelp0 --drift 0');
            expect(result.stderr).toContain(
              'not searched — the candidate search ran out of time before this part',
            );
            // .note = with the search unbounded, this compound took ~135s on the author's host;
            //         the bound is the 10s kill window less a margin for host load
            expect(elapsedMs).toBeLessThan(9500);
          },
        );
      });
    },
  );

  given('[case59] a blocked part longer than the ledger part cap', () => {
    // a pasted heredoc must not bloat the ledger: one row keeps at most LEDGER_PART_CAP chars
    const longPart = `du ${'reef'.repeat(400)}`;

    when('[t0] the bot runs it', () => {
      then('the ledger row keeps the first 1024 chars of the part', () => {
        const result = runHook({ command: longPart });
        expect(result.exitCode).toBe(2);
        const ledger = fs
          .readFileSync(
            path.join(
              result.tempDir,
              '.agent/.cache/repo=ehmpathy/role=mechanic/skill=check-permissions/nudges.jsonl',
            ),
            'utf-8',
          )
          .trim()
          .split('\n')
          .map((line) => JSON.parse(line));
        expect(ledger).toHaveLength(1);
        expect(ledger[0].part).toEqual(longPart.slice(0, 1024));
      });
    });
  });

  given('[case60] a compound of grammar parts alone', () => {
    // a grammar part is no command, so no demand: an all-grammar block writes no row, and no
    // blank line either
    when('[t0] the bot runs `done; fi`', () => {
      then('the block holds, and the ledger gains no row', () => {
        const result = runHook({ command: 'done; fi' });
        expect(result.exitCode).toBe(2);
        const ledgerPath = path.join(
          result.tempDir,
          '.agent/.cache/repo=ehmpathy/role=mechanic/skill=check-permissions/nudges.jsonl',
        );
        const ledger = fs.existsSync(ledgerPath)
          ? fs.readFileSync(ledgerPath, 'utf-8')
          : '';
        expect(ledger).toEqual('');
      });
    });
  });

  given('[case61] a single-word prefix pattern and a lookalike binary', () => {
    // 🔴 `Bash(rhx:*)` once matched any command whose text began `rhx` — `rhxploit` too, a
    //    different binary. a prefix matches only at a word boundary now, as the decider does
    const settings = { allow: ['Bash(rhx:*)'] };

    when('[t0] the bot runs `rhxploit --reef`', () => {
      then('the gate blocks it', () => {
        const result = runHook({ command: 'rhxploit --reef', settings });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('blocked: rhxploit --reef');
      });
    });

    when('[t1] the bot runs `rhx grepsafe --pattern wave`', () => {
      then('the paved command still passes, silent', () => {
        const result = runHook({
          command: 'rhx grepsafe --pattern wave',
          settings,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stderr).toBe('');
      });
    });

    when('[t2] the bot runs a bare `rhx`', () => {
      then('the bare head still passes, silent', () => {
        const result = runHook({ command: 'rhx', settings });
        expect(result.exitCode).toBe(0);
        expect(result.stderr).toBe('');
      });
    });
  });

  given(
    '[case62] earlier phases already spent most of the 10s kill window',
    () => {
      // 🔴 each phase once fit only its own budget (allow check 4s, search 3s, lock ~2s), so
      //    together they could stack toward the 10s kill, which the harness reads as a permit.
      //    the late phases now check a whole-hook deadline. the copy is told it started earlier
      const hookSourceAged = (input: { seconds: number }): string =>
        fs
          .readFileSync(scriptPath, 'utf-8')
          .replace(
            "printf -v HOOK_STARTED_AT '%(%s)T' -1",
            `printf -v HOOK_STARTED_AT '%(%s)T' -1; HOOK_STARTED_AT=$(( HOOK_STARTED_AT - ${input.seconds} ))`,
          );

      when('[t0] 7s have passed when the search would start', () => {
        then('the part is left unsearched, never ranked', () => {
          const result = runHookCopy({
            hookSource: hookSourceAged({ seconds: 7 }),
            command: 'gti status',
            allow: ['Bash(git status:*)'],
            flags: [],
            withInventory: true,
            prepare: null,
          });
          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain(
            'not searched — the candidate search ran out of time',
          );
          expect(result.stderr).not.toContain('did you mean?');
        });
      });

      when(
        '[t1] 9s have passed when the nudge record lock is held by a live process',
        () => {
          then(
            'the wait gives up at once, the block holds, and the deadline is named',
            () => {
              const startedAt = Date.now();
              const result = runHookCopy({
                hookSource: hookSourceAged({ seconds: 9 }),
                command: 'du -sh dist',
                allow: [],
                flags: [],
                withInventory: true,
                prepare: ({ tempDir }) => {
                  const lockDir = path.join(
                    tempDir,
                    '.claude',
                    'permission.nudges.local.json.lock',
                  );
                  fs.mkdirSync(lockDir);
                  fs.writeFileSync(
                    path.join(lockDir, 'pid'),
                    `${process.pid}\n`,
                  );
                },
              });
              expect(result.exitCode).toBe(2);
              expect(result.stderr).toContain(
                "the nudge record lock stayed held past the hook's deadline",
              );
              expect(Date.now() - startedAt).toBeLessThan(1500);
            },
          );
        },
      );
    },
  );

  given('[case63] a head the inventory knows is never fzf-ranked', () => {
    // 🔴 found on the live 5.3 walk: `grep` is an in-order subsequence of `git.repo.test`
    //    (g·it, r·e·p·o), so a plain grep ranked 19 `rhx git.repo.test …` rows of noise. a known
    //    tool is what the bot meant, not a slip; `[case47][t1]` keeps the slip (`rpotst`) path
    const settings = {
      allow: [
        'Bash(rhx git.repo.test:*)',
        'Bash(rhx git.repo.test --what unit)',
        'Bash(rhx grepsafe:*)',
      ],
    };

    when('[t0] the bot runs `grep -rln reef src/`', () => {
      then('no git.repo.test pattern is offered', () => {
        const result = runHook({ command: 'grep -rln reef src/', settings });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('rhx grepsafe');
        expect(result.stderr).not.toContain('git.repo.test');
      });
    });

    when(
      '[t1] the bot runs `grpsf wave` (letters of one name, in order)',
      () => {
        then('the fzf tier still finds grepsafe', () => {
          const result = runHook({ command: 'grpsf wave', settings });
          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('[p] rhx grepsafe');
        });
      },
    );
  });
});
