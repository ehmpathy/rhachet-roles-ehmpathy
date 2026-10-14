import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = integration tests for permissions.get.sh
 * .why = a blocked bot looks up its pre-approved commands on demand; each mode (bare,
 *        --head, --for) must render the same allowlist the check-permissions hook enforces
 * .note = integration grain: each case spawns the real skill (and, for --for, the real hook)
 *         against a temp repo with its own .claude/ settings
 */
describe('permissions.get.sh', () => {
  const scriptPath = path.join(__dirname, 'permissions.get.sh');

  // the allowlist most cases run under: small and fixed, so every render is stable
  const ALLOW = [
    'Bash(git status:*)',
    'Bash(git diff:*)',
    'Bash(git log:*)',
    'Bash(rhx:*)',
    'Bash(tree:*)',
    'Bash(cat:*)',
    'Bash(jq)',
  ];

  /**
   * .what = a temp repo with .claude/ settings (or none)
   * .why = isolates each case from the real repo's allowlist
   * .note = returns an object: useBeforeAll proxies its value
   */
  const genRepo = (input: {
    allow: string[] | null;
    allowLocal: string[] | null;
    settingsRaw: string | null;
  }): { dir: string } => {
    const dir = genTempDir({ slug: 'permissions-get', git: true });
    if (input.allow === null && input.settingsRaw === null) return { dir };
    const claudeDir = path.join(dir, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(
      path.join(claudeDir, 'settings.json'),
      input.settingsRaw ??
        JSON.stringify({
          permissions: { allow: input.allow, deny: [], ask: [] },
        }),
    );
    if (input.allowLocal)
      fs.writeFileSync(
        path.join(claudeDir, 'settings.local.json'),
        JSON.stringify({
          permissions: { allow: input.allowLocal, deny: [], ask: [] },
        }),
      );
    return { dir };
  };

  /**
   * .what = the runner's env without $CLAUDE_CONFIG_DIR, with $HOME pinned to an absent dir
   * .why = the skill and the hook it calls read the allowlist of $CLAUDE_CONFIG_DIR when set,
   *        and the user layer of $HOME/.claude; a runner inside a claude actor carries the one
   *        and a real home the other, so each case would judge against the host's lists
   */
  const asEnvHermetic = (): NodeJS.ProcessEnv => {
    const { CLAUDE_CONFIG_DIR: _runnerConfigDir, ...envRest } = process.env;
    return { ...envRest, HOME: '/nonexistent-home' };
  };

  /**
   * .what = run the skill in a repo
   */
  const runSkill = (input: {
    dir: string;
    args: string[];
  }): { stdout: string; stderr: string; exitCode: number } => {
    const result = spawnSync('bash', [scriptPath, ...input.args], {
      cwd: input.dir,
      env: asEnvHermetic(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  /**
   * .what = mask the per-run temp path, so a snapshot holds no host detail
   */
  const asSnapshotSafe = (input: { text: string; dir: string }): string =>
    input.text.split(input.dir).join('<repo>');

  /**
   * .what = mask every volatile piece of a malfunction render: the repo path, the temp role
   *         path, and the jq error text (it varies by jq version)
   */
  const asSnapshotMasked = (input: { text: string; dir: string }): string =>
    asSnapshotSafe(input)
      .replace(/\/[^\s)'`]*permissions-get-role[^\s)'`]*/g, '<role>')
      .replace(/\/[^\s)'`]*permissions-get\.[0-9a-f]+/g, '<repo>')
      .replace(
        /is not valid json \(.*?\) —/g,
        'is not valid json (<jq error>) —',
      )
      .replace(
        /unparseable: commands\.alternatives\.jsonc \(.*?\) —/g,
        'unparseable: commands.alternatives.jsonc (<jq error>) —',
      );

  given('[case1] a repo with an allowlist in both settings files', () => {
    const repo = useBeforeAll(async () =>
      genRepo({
        allow: [
          ...ALLOW,
          'Bash(git show:*)',
          'Bash(git blame:*)',
          'Bash(git ls-files:*)',
        ],
        allowLocal: ['Bash(npm run build:*)', 'Bash(git status:*)'],
        settingsRaw: null,
      }),
    );

    when('[t0] the bot runs the bare skill', () => {
      const res = useBeforeAll(async () =>
        runSkill({ dir: repo.dir, args: [] }),
      );

      then('it names both sources and the deduped total', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain('.claude/settings.json (10)');
        expect(res.stdout).toContain('.claude/settings.local.json (2)');
        expect(res.stdout).toContain('total: 11 pre-approved (dupes removed)');
      });

      then('a long head folds, and names where to see the rest', () => {
        expect(res.stdout).toContain('git (6)');
        expect(res.stdout).toContain(
          '… 1 more: rhx permissions.get --head git',
        );
      });

      then('the header owns its trunk — no blank line between them', () => {
        expect(res.stdout).toContain('🐚 permissions.get\n   ├─ sources');
      });

      then('the render matches snapshot', () => {
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t1] the bot asks for one head', () => {
      const res = useBeforeAll(async () =>
        runSkill({ dir: repo.dir, args: ['--head', 'git'] }),
      );

      then('every pattern of the head renders, unfolded', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain('[p] git ls-files');
        expect(res.stdout).not.toContain('more: rhx permissions.get');
      });

      then('the render matches snapshot', () => {
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t2] the bot asks for a head the inventory paves', () => {
      const res = useBeforeAll(async () =>
        runSkill({ dir: repo.dir, args: ['--head', 'grep'] }),
      );

      then(
        'it says the head is not allowed, and names its paved alternatives',
        () => {
          expect(res.exitCode).toBe(0);
          expect(res.stdout).toContain(
            '(none — `grep` is not on the allowlist)',
          );
          expect(res.stdout).toContain(
            "rhx grepsafe --pattern '<regex>' --path <dir>",
          );
        },
      );

      then('the render matches snapshot', () => {
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t3] the bot asks for a head with advice only', () => {
      const res = useBeforeAll(async () =>
        runSkill({ dir: repo.dir, args: ['--head', 'cd'] }),
      );

      then('the advice renders', () => {
        expect(res.stdout).toContain(
          'advice: run from the cwd; pass paths to the command instead',
        );
      });

      then('the render matches snapshot', () => {
        expect(res.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case2] the bot asks about one exact command', () => {
    const repo = useBeforeAll(async () =>
      genRepo({ allow: ALLOW, allowLocal: null, settingsRaw: null }),
    );

    when('[t0] the command is blocked', () => {
      const res = useBeforeAll(async () =>
        runSkill({ dir: repo.dir, args: ['--for', 'grep -rn reef src/'] }),
      );

      then('the hook answers: the part, and its paved alternatives', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain(
          "🐚 permissions.get --for 'grep -rn reef src/'",
        );
        expect(res.stdout).toContain('├─ blocked: grep -rn reef src/');
        expect(res.stdout).toContain('rhx grepsafe');
      });

      then(
        'a lookup carries no pave tree and no hint — it is the answer',
        () => {
          expect(res.stdout).not.toContain('🐚 pave what recurs');
          expect(res.stdout).not.toContain('🥥 did you know?');
        },
      );

      then('a lookup writes no nudge record and no ledger row', () => {
        expect(
          fs.existsSync(
            path.join(repo.dir, '.claude', 'permission.nudges.local.json'),
          ),
        ).toBe(false);
        expect(fs.existsSync(path.join(repo.dir, '.agent', '.cache'))).toBe(
          false,
        );
      });

      then('the render matches snapshot', () => {
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t1] the command is pre-approved', () => {
      const res = useBeforeAll(async () =>
        runSkill({ dir: repo.dir, args: ['--for', 'git status --short'] }),
      );

      then('the verdict says it runs with no prompt', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain(
          '└─ verdict: pre-approved — every part matches the allowlist; it runs with no prompt',
        );
      });

      then('the render matches snapshot', () => {
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t2] the command ranks more than 21 candidates', () => {
      const wide = useBeforeAll(async () =>
        genRepo({
          allow: Array.from({ length: 30 }, (_, i) => `Bash(git stash${i}:*)`),
          allowLocal: null,
          settingsRaw: null,
        }),
      );
      const res = useBeforeAll(async () =>
        runSkill({ dir: wide.dir, args: ['--for', 'git stash'] }),
      );

      then('every candidate renders — a lookup has no cap', () => {
        const candidates = res.stdout
          .split('\n')
          .filter((line) => /^\s+│\s+[├└]─ \[[ep]\] /.test(line));
        expect(candidates.length).toBeGreaterThan(21);
        expect(res.stdout).not.toContain('… and');
      });

      then('the render matches snapshot', () => {
        expect(res.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case3] edges', () => {
    when('[t0] the repo has no .claude/ dir', () => {
      const repo = useBeforeAll(async () =>
        genRepo({ allow: null, allowLocal: null, settingsRaw: null }),
      );
      const res = useBeforeAll(async () =>
        runSkill({ dir: repo.dir, args: [] }),
      );

      then('it says no allowlist applies, exit 0', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain('no .claude/ dir found');
      });

      then('the render matches snapshot', () => {
        expect(
          asSnapshotMasked({ text: res.stdout, dir: repo.dir }),
        ).toMatchSnapshot();
      });
    });

    when('[t1] settings.json is not valid json', () => {
      const repo = useBeforeAll(async () =>
        genRepo({ allow: null, allowLocal: null, settingsRaw: '{ broken' }),
      );
      const res = useBeforeAll(async () =>
        runSkill({ dir: repo.dir, args: [] }),
      );

      then('the malfunction is named on both streams, exit 1', () => {
        expect(res.exitCode).toBe(1);
        expect(res.stdout).toContain(
          '💥 MalfunctionError: .claude/settings.json is not valid json',
        );
        expect(res.stderr).toContain(
          '💥 MalfunctionError: .claude/settings.json is not valid json',
        );
      });

      then('the render matches snapshot', () => {
        expect(
          asSnapshotMasked({ text: res.stdout, dir: repo.dir }),
        ).toMatchSnapshot();
      });
    });

    when('[t2] the bot passes an unknown flag', () => {
      const repo = useBeforeAll(async () =>
        genRepo({ allow: ALLOW, allowLocal: null, settingsRaw: null }),
      );
      const res = useBeforeAll(async () =>
        runSkill({ dir: repo.dir, args: ['--surf'] }),
      );

      then('a constraint error names the flag and the usage, exit 2', () => {
        expect(res.exitCode).toBe(2);
        expect(res.stdout).toContain(
          '✋ ConstraintError: unknown argument: --surf',
        );
        expect(res.stderr).toContain(
          '✋ ConstraintError: unknown argument: --surf',
        );
        expect(res.stdout).toContain('rhx permissions.get --for');
      });

      then('the render matches snapshot', () => {
        expect(
          asSnapshotSafe({ text: res.stdout, dir: repo.dir }),
        ).toMatchSnapshot();
      });
    });

    when('[t3] the bot asks for --help', () => {
      const repo = useBeforeAll(async () =>
        genRepo({ allow: ALLOW, allowLocal: null, settingsRaw: null }),
      );
      const res = useBeforeAll(async () =>
        runSkill({ dir: repo.dir, args: ['--help'] }),
      );

      then('the usage names every mode, exit 0', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain('rhx permissions.get --head <head>');
        expect(res.stdout).toContain("rhx permissions.get --for '<command>'");
        expect(res.stdout).toMatchSnapshot();
      });
    });

    /**
     * .what = a copy of the skill in a temp role dir, with the inventory beside the hook
     *         replaced (or removed)
     * .why = the skill finds the inventory at ../inits/claude.hooks/; a broken one must be
     *        named, never read as "(none in the inventory)"
     */
    const runSkillCopy = (input: {
      inventory: string | null;
      repoDir: string;
      args: string[];
      hook?: string;
    }): { stdout: string; stderr: string; exitCode: number } => {
      const roleDir = genTempDir({ slug: 'permissions-get-role' });
      fs.mkdirSync(path.join(roleDir, 'skills'), { recursive: true });
      fs.mkdirSync(path.join(roleDir, 'inits', 'claude.hooks'), {
        recursive: true,
      });
      const skillCopy = path.join(roleDir, 'skills', 'permissions.get.sh');
      fs.copyFileSync(scriptPath, skillCopy);
      // the skill sources the render lib from the hooks dir, so the copy carries it along
      fs.copyFileSync(
        path.join(
          __dirname,
          '..',
          'inits',
          'claude.hooks',
          '_permissions.render.lib.sh',
        ),
        path.join(
          roleDir,
          'inits',
          'claude.hooks',
          '_permissions.render.lib.sh',
        ),
      );
      if (input.inventory !== null)
        fs.writeFileSync(
          path.join(
            roleDir,
            'inits',
            'claude.hooks',
            'commands.alternatives.jsonc',
          ),
          input.inventory,
        );
      if (input.hook !== undefined)
        fs.writeFileSync(
          path.join(
            roleDir,
            'inits',
            'claude.hooks',
            'pretooluse.check-permissions.sh',
          ),
          input.hook,
        );
      const result = spawnSync('bash', [skillCopy, ...input.args], {
        cwd: input.repoDir,
        env: asEnvHermetic(),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return {
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
        exitCode: result.status ?? 1,
      };
    };

    when('[t4] the inventory beside the hook is unparseable', () => {
      const repo = useBeforeAll(async () =>
        genRepo({ allow: ALLOW, allowLocal: null, settingsRaw: null }),
      );
      const res = useBeforeAll(async () =>
        runSkillCopy({
          inventory: '{ "entries": [ broken',
          repoDir: repo.dir,
          args: ['--head', 'grep'],
        }),
      );

      then(
        'the malfunction is named on both streams, exit 1 — never "(none)"',
        () => {
          // clamp: the inventory read once swallowed a parse error and printed
          //        "(none in the inventory)", a false claim that sends the bot to pave a duplicate
          expect(res.exitCode).toBe(1);
          expect(res.stdout).toContain(
            '💥 MalfunctionError: inventory file unparseable: commands.alternatives.jsonc',
          );
          expect(res.stderr).toContain(
            '💥 MalfunctionError: inventory file unparseable: commands.alternatives.jsonc',
          );
          expect(res.stdout).not.toContain('(none in the inventory)');
        },
      );

      then('the render matches snapshot', () => {
        expect(
          asSnapshotMasked({ text: res.stdout, dir: repo.dir }),
        ).toMatchSnapshot();
      });
    });

    when('[t5] the inventory beside the hook is absent', () => {
      const repo = useBeforeAll(async () =>
        genRepo({ allow: ALLOW, allowLocal: null, settingsRaw: null }),
      );
      const res = useBeforeAll(async () =>
        runSkillCopy({
          inventory: null,
          repoDir: repo.dir,
          args: ['--head', 'grep'],
        }),
      );

      then('the malfunction is named, exit 1', () => {
        expect(res.exitCode).toBe(1);
        expect(res.stdout).toContain(
          '💥 MalfunctionError: inventory file absent: commands.alternatives.jsonc',
        );
        expect(res.stdout).not.toContain('(none in the inventory)');
      });

      then('the render matches snapshot', () => {
        expect(
          asSnapshotMasked({ text: res.stdout, dir: repo.dir }),
        ).toMatchSnapshot();
      });
    });

    when(
      '[t6] the hook is absent beside the skill, and the bot asks --for',
      () => {
        const repo = useBeforeAll(async () =>
          genRepo({ allow: ALLOW, allowLocal: null, settingsRaw: null }),
        );
        const res = useBeforeAll(async () =>
          runSkillCopy({
            inventory: null,
            repoDir: repo.dir,
            args: ['--for', 'ls src'],
          }),
        );

        then(
          'the malfunction is named with its remedy, exit 1 — never a raw bash error',
          () => {
            // clamp: an absent hook once died as `bash: … No such file`, exit 127
            expect(res.exitCode).toBe(1);
            expect(res.stdout).toContain(
              '💥 MalfunctionError: check-permissions hook absent beside the skill',
            );
            expect(res.stderr).toContain('rebuild and relink the role');
            expect(res.stderr).not.toContain('No such file');
          },
        );

        then('the render matches snapshot', () => {
          expect(
            asSnapshotMasked({ text: res.stdout, dir: repo.dir }),
          ).toMatchSnapshot();
        });
      },
    );

    when('[t10] the hook fails while it answers --for', () => {
      /**
       * .mock = the check-permissions hook beside the skill, as a 3-line executable that exits 2
       * .why = under `--mode LOOKUP` the real hook turns every fault it can detect into a
       *        render and exits 0 (an unparseable inventory renders as a named malfunction,
       *        exit 0 — tried, measured). its only nonzero exit is a crash, which no input
       *        provokes from outside. this case clamps the SKILL's relay of a failed hook, so
       *        it needs a hook that fails on demand
       * .real = the real hook's crash path is clamped in
       *         `pretooluse.gates-fail-closed.integration.test.ts` (a crash past the EXIT trap
       *         names itself and exits 2); an absent real hook is `[t6]` above
       */
      const repo = useBeforeAll(async () =>
        genRepo({ allow: ALLOW, allowLocal: null, settingsRaw: null }),
      );
      const res = useBeforeAll(async () =>
        runSkillCopy({
          inventory: null,
          repoDir: repo.dir,
          args: ['--for', 'ls src'],
          hook: [
            'echo "💥 MalfunctionError: stub hook failed"',
            'echo "💥 MalfunctionError: stub hook failed" >&2',
            'exit 2',
          ].join('\n'),
        }),
      );

      then(
        "the hook's own words pass through, and the skill exits 1 (a malfunction)",
        () => {
          // a LOOKUP never blocks, so any nonzero exit from the hook is a malfunction — never
          // the hook's exit 2 relayed as though the bot's input were at fault
          expect(res.exitCode).toBe(1);
          expect(res.stdout).toContain('💥 MalfunctionError: stub hook failed');
          expect(res.stderr).toContain('💥 MalfunctionError: stub hook failed');
        },
      );
    });

    when('[t7] the bot passes an empty --head', () => {
      const repo = useBeforeAll(async () =>
        genRepo({ allow: ALLOW, allowLocal: null, settingsRaw: null }),
      );
      const res = useBeforeAll(async () =>
        runSkill({ dir: repo.dir, args: ['--head', ''] }),
      );

      then(
        'a constraint error names it, exit 2 — never a silent bare view',
        () => {
          expect(res.exitCode).toBe(2);
          expect(res.stdout).toContain(
            '✋ ConstraintError: --head needs a command head, e.g. --head git',
          );
          expect(res.stdout).not.toContain('total:');
        },
      );

      then('the render matches snapshot', () => {
        expect(
          asSnapshotMasked({ text: res.stdout, dir: repo.dir }),
        ).toMatchSnapshot();
      });
    });

    when('[t9] the repo has no .claude/ dir, and the bot asks --for', () => {
      const repo = useBeforeAll(async () =>
        genRepo({ allow: null, allowLocal: null, settingsRaw: null }),
      );
      const res = useBeforeAll(async () =>
        runSkill({ dir: repo.dir, args: ['--for', 'grep -rn reef src/'] }),
      );

      then('the hook answers that no allowlist applies, exit 0', () => {
        // the --for path asks the hook before the skill's own .claude/ check, so the hook's
        // no-.claude branch is the one that answers here
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain('no .claude/ dir found');
      });

      then('the render matches snapshot', () => {
        expect(
          asSnapshotMasked({ text: res.stdout, dir: repo.dir }),
        ).toMatchSnapshot();
      });
    });

    when('[t8] bad input with stdout and stderr both closed', () => {
      const repo = useBeforeAll(async () =>
        genRepo({ allow: ALLOW, allowLocal: null, settingsRaw: null }),
      );

      then('the skill still exits 2, its bad-input code', () => {
        // clamp: an unguarded write to a closed stream once ended the skill with the write's
        //        own code before its `exit 2` ran
        const result = spawnSync(
          'bash',
          ['-c', `exec bash "${scriptPath}" --surf 1>&- 2>&-`],
          {
            cwd: repo.dir,
            env: asEnvHermetic(),
            stdio: ['pipe', 'pipe', 'pipe'],
          },
        );
        expect(result.status).toBe(2);
      });
    });
  });
});
