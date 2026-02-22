import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = integration tests for pretooluse.check-permissions.sh hook
 * .why = verify the hook correctly identifies allowed vs disallowed commands
 *        and provides appropriate guidance with HARDNUDGE/SOFTNUDGE modes
 */
describe('pretooluse.check-permissions.sh', () => {
  const scriptPath = path.join(__dirname, 'pretooluse.check-permissions.sh');

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

      then('npx jest src/foo.test.ts matches npx jest:*', () => {
        const result = runHook({
          command: 'npx jest src/foo.test.ts',
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
        expect(result.stderr).toContain('BLOCKED');
      });

      then('&& with disallowed first part blocks', () => {
        const result = runHook({
          command: 'curl http://evil.com && ls /foo',
          settings: standardSettings,
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });

      then('&& chain with disallowed third part blocks', () => {
        const result = runHook({
          command: 'ls /a && cat /b && wget http://bad',
          settings: standardSettings,
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });

      then('; with disallowed second part blocks', () => {
        const result = runHook({
          command: 'npm run test:unit ; curl http://evil.com',
          settings: standardSettings,
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });

      then('|| with disallowed first part blocks', () => {
        const result = runHook({
          command: 'dangerous-cmd || ls /foo',
          settings: standardSettings,
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
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

      then('echo multiline | cat is allowed (pipe not split)', () => {
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
      then('rm -rf / shows BLOCKED message', () => {
        const result = runHook({
          command: 'rm -rf /',
          settings: standardSettings,
          clearNudges: true,
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('BLOCKED');
      });

      then('shows available patterns in block message', () => {
        const result = runHook({
          command: 'npx prettier --write .',
          settings: standardSettings,
          clearNudges: true,
        });
        expect(result.stderr).toContain('[p]: npm run test');
      });

      then('shows guidance about pre-approved permissions', () => {
        const result = runHook({
          command: 'git status',
          settings: standardSettings,
          clearNudges: true,
        });
        expect(result.stderr).toContain('pre-approved permissions');
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
        expect(results.first.stderr).toContain('BLOCKED');
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
      then('second attempt is silent (exit 0)', () => {
        const results = runHookTwice({
          command: 'dangerous-cmd-2',
          settings: standardSettings,
        });
        expect(results.second.exitCode).toBe(0);
        expect(results.second.stdout).toBe('');
        expect(results.second.stderr).toBe('');
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
      then('shows warning message but exits 0', () => {
        const result = runHook({
          command: 'softnudge-test-cmd',
          settings: standardSettings,
          flags: '--mode SOFTNUDGE',
          clearNudges: true,
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('not covered by existing pre-approved');
      });

      then('does NOT return hookSpecificOutput JSON', () => {
        const result = runHook({
          command: 'softnudge-test-cmd',
          settings: standardSettings,
          flags: '--mode SOFTNUDGE',
          clearNudges: true,
        });
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

        const nudgesPath = path.join(claudeDir, 'permission.nudges.local.json');
        if (fs.existsSync(nudgesPath)) {
          const nudges = JSON.parse(fs.readFileSync(nudgesPath, 'utf-8'));
          expect(nudges['softnudge-no-record']).toBeUndefined();
        }
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
        expect(result.stderr).toContain('BLOCKED');
      });

      then('blocked message shows patterns from both files', () => {
        const result = runHook({
          command: 'rm -rf /',
          settings: { allow: ['Bash(npm run test:*)', 'Bash(cat:*)'] },
          settingsLocal: { allow: ['Bash(git status:*)', 'Bash(ls:*)'] },
          clearNudges: true,
        });
        expect(result.stderr).toContain('[p]: npm run test');
        expect(result.stderr).toContain('[p]: git status');
      });
    });

    when('[t1] duplicate patterns are deduplicated', () => {
      then('duplicate pattern appears only once in output', () => {
        const result = runHook({
          command: 'unknown-cmd',
          settings: { allow: ['Bash(npm run test:*)', 'Bash(cat:*)'] },
          settingsLocal: {
            allow: ['Bash(npm run test:*)', 'Bash(git status:*)'],
          },
          clearNudges: true,
        });
        const matches = result.stderr.match(/npm run test/g) ?? [];
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
      });
    });
  });
});
