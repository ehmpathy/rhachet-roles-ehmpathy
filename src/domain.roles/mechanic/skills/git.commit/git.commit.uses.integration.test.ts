import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import { seedTestSponsor } from '../../../../.test/seedTestSponsor';
import { spawnInPty } from '../../../../.test/spawnInPty';

/**
 * .what = integration tests for git.commit.uses.sh
 * .why = verify quota management works correctly for all modes and edge cases
 */
describe('git.commit.uses.sh', () => {
  const scriptPath = path.join(__dirname, 'git.commit.uses.sh');

  const runInTempGitRepo = (args: {
    args: string[];
    meterState?: { uses: number | string; push: string; stage?: string };
    // default false — a fresh tree has no sponsor, which is what the nudge is for
    sponsorBound?: boolean;
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'git-commit-uses-test', git: true });

    // create .meter directory and state if provided
    if (args.meterState) {
      const meterDir = path.join(tempDir, '.meter');
      fs.mkdirSync(meterDir, { recursive: true });
      fs.writeFileSync(
        path.join(meterDir, 'git.commit.uses.jsonc'),
        JSON.stringify(args.meterState, null, 2),
      );
    }

    // optionally bind a sponsor, so the nudge stays quiet
    //
    // .why = via the shared helper, never an inline write. this WAS an inline
    //        copy, and it had already drifted: the state gained a `source`
    //        field and only the helper learned about it. one state file wants
    //        one writer, or the shape is true in two places and current in one.
    if (args.sponsorBound) seedTestSponsor({ cwd: tempDir });

    const result = spawnSync('bash', [scriptPath, ...args.args], {
      cwd: tempDir,
      encoding: 'utf-8' as const,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, __I_AM_HUMAN: 'true' },
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      tempDir,
    };
  };

  /**
   * .what = run command with isolated HOME for global storage tests
   * .why = prevents tests from affecting real global state
   */
  const runWithGlobalStorage = (args: {
    args: string[];
    meterState?: { uses: number | string; push: string; stage?: string };
    globalBlocker?: boolean;
    globalBlockerRaw?: string;
    // default false — a fresh tree has no sponsor, which is what the nudge is for
    sponsorBound?: boolean;
  }): {
    stdout: string;
    stderr: string;
    exitCode: number;
    tempDir: string;
    tempHome: string;
    globalMeterFile: string;
  } => {
    const tempDir = genTempDir({ slug: 'git-commit-uses-test', git: true });
    const tempHome = genTempDir({ slug: 'git-commit-uses-home', git: false });
    const globalMeterDir = path.join(
      tempHome,
      '.rhachet',
      'storage',
      'repo=ehmpathy',
      'role=mechanic',
      '.meter',
    );
    const globalMeterFile = path.join(globalMeterDir, 'git.commit.uses.jsonc');

    // create local .meter directory and state if provided
    if (args.meterState) {
      const meterDir = path.join(tempDir, '.meter');
      fs.mkdirSync(meterDir, { recursive: true });
      fs.writeFileSync(
        path.join(meterDir, 'git.commit.uses.jsonc'),
        JSON.stringify(args.meterState, null, 2),
      );
    }

    // create global blocker if requested
    if (args.globalBlocker) {
      fs.mkdirSync(globalMeterDir, { recursive: true });
      fs.writeFileSync(
        globalMeterFile,
        JSON.stringify({ blocked: true }, null, 2),
      );
    }

    // .why = a byte-for-byte write, for the present-and-unparseable case that
    //        `globalBlocker: true` cannot express — a corrupt file is not a
    //        blocker state, it is the absence of a readable one.
    if (args.globalBlockerRaw !== undefined) {
      fs.mkdirSync(globalMeterDir, { recursive: true });
      fs.writeFileSync(globalMeterFile, args.globalBlockerRaw);
    }

    // optionally bind a sponsor, so the nudge stays quiet — via the shared
    // helper, never an inline write (see the note on `runInTempGitRepo`)
    if (args.sponsorBound) seedTestSponsor({ cwd: tempDir });

    const result = spawnSync('bash', [scriptPath, ...args.args], {
      cwd: tempDir,
      encoding: 'utf-8' as const,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, HOME: tempHome, __I_AM_HUMAN: 'true' },
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      tempDir,
      tempHome,
      globalMeterFile,
    };
  };

  given('[case1] set --quant N --push block', () => {
    when('[t0] setting 3 uses with push blocked', () => {
      // .why = one spawn, two assertions. both `then` blocks read a different
      //        facet of the SAME grant, so a re-run per `then` would pay a
      //        subprocess plus a git init to observe a result already in hand
      //        (rule.forbid.redundant-expensive-operations).
      const result = useThen('the grant lands', () =>
        runInTempGitRepo({
          args: ['set', '--quant', '3', '--push', 'block'],
        }),
      );

      then('outputs gnarly with granted count', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 gnarly! thanks human!');
        expect(result.stdout).toContain('granted: 3');
        expect(result.stdout).toContain('push: blocked');
        expect(result.stdout).toMatchSnapshot();
      });

      then('state file is created', () => {
        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        expect(fs.existsSync(stateFile)).toBe(true);

        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe(3);
        expect(state.push).toBe('block');
      });
    });
  });

  given('[case2] set --quant N --push allow', () => {
    when('[t0] setting 1 use with push allowed', () => {
      then('outputs radical', () => {
        const result = runInTempGitRepo({
          args: ['set', '--quant', '1', '--push', 'allow'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 radical!');
        expect(result.stdout).toContain('granted: 1');
        expect(result.stdout).toContain('push: allowed');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case3] set --quant 0 (revoke)', () => {
    when('[t0] revoking all uses', () => {
      // .why = one spawn, two assertions. both `then` blocks read a different
      //        facet of the SAME revoke, so a re-run per `then` would pay a
      //        subprocess plus a git init to observe a result already in hand
      //        (rule.forbid.redundant-expensive-operations).
      const result = useThen('the revoke lands', () =>
        runInTempGitRepo({
          args: ['set', '--quant', '0', '--push', 'block'],
        }),
      );

      then('outputs groovy break time with tip', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 groovy, break time');
        expect(result.stdout).toContain('git.commit.uses set');
        expect(result.stdout).toContain('├─ revoked');
        expect(result.stdout).toContain('tip:');
        expect(result.stdout).toContain(
          "'rhx git.commit.uses del' does the same",
        );
        expect(result.stdout).toMatchSnapshot();
      });

      then('state file shows 0 uses', () => {
        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe(0);
      });
    });
  });

  given('[case3b] set --quant 0 --push allow (push-only mode)', () => {
    when('[t0] push-only access granted', () => {
      // .why = one spawn, two assertions. both `then` blocks read a different
      //        facet of the SAME grant, so a re-run per `then` would pay a
      //        subprocess plus a git init to observe a result already in hand
      //        (rule.forbid.redundant-expensive-operations).
      const result = useThen('the push-only grant lands', () =>
        runInTempGitRepo({
          args: ['set', '--quant', '0', '--push', 'allow'],
        }),
      );

      then('outputs push only mode without tip', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('let it ride');
        expect(result.stdout).toContain('commits: 0');
        expect(result.stdout).toContain('push: allowed');
        expect(result.stdout).not.toContain('tip:');
        expect(result.stdout).toMatchSnapshot();
      });

      then('state file shows 0 uses and push allow', () => {
        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe(0);
        expect(state.push).toBe('allow');
      });
    });
  });

  given('[case3c] set --quant 0 without --push (defaults to block)', () => {
    when('[t0] revoke without explicit push flag', () => {
      then('defaults to block and shows revoked with tip', () => {
        const result = runInTempGitRepo({
          args: ['set', '--quant', '0'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('revoked');
        expect(result.stdout).toContain('tip:');
        expect(result.stdout).toContain(
          "'rhx git.commit.uses del' does the same",
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case3d] del command (revoke shortcut)', () => {
    when('[t0] del with quota present', () => {
      // .why = one spawn, two assertions. both `then` blocks read a different
      //        facet of the SAME del, so a re-run per `then` would pay a
      //        subprocess plus a git init to observe a result already in hand
      //        (rule.forbid.redundant-expensive-operations).
      const result = useThen('the del lands', () =>
        runInTempGitRepo({
          args: ['del'],
          meterState: { uses: 3, push: 'allow' },
        }),
      );

      then('shows revoked without tip', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 groovy, break time');
        expect(result.stdout).toContain('git.commit.uses del');
        expect(result.stdout).toContain('└─ revoked');
        expect(result.stdout).not.toContain('tip:');
        expect(result.stdout).toMatchSnapshot();
      });

      then('state file shows 0 uses and push block', () => {
        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe(0);
        expect(state.push).toBe('block');
      });
    });

    when('[t1] del without quota (idempotent)', () => {
      then('succeeds and shows revoked', () => {
        const result = runInTempGitRepo({
          args: ['del'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 groovy, break time');
        expect(result.stdout).toContain('git.commit.uses del');
        expect(result.stdout).toContain('revoked');
        expect(result.stdout).not.toContain('tip:');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case3e] del with rhachet passthrough args', () => {
    when('[t0] rhachet passes --skill --repo --role before del', () => {
      then('del is recognized after passthrough args', () => {
        // rhachet passes args like: --skill git.commit.uses --repo ehmpathy --role mechanic del
        const result = runInTempGitRepo({
          args: [
            '--skill',
            'git.commit.uses',
            '--repo',
            'ehmpathy',
            '--role',
            'mechanic',
            'del',
          ],
          meterState: { uses: 3, push: 'allow' },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('git.commit.uses del');
        expect(result.stdout).toContain('revoked');
      });
    });
  });

  given('[case4] set without --push', () => {
    when('[t0] --push flag is missing', () => {
      then('exits with error', () => {
        const result = runInTempGitRepo({
          args: ['set', '--quant', '3'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('--push allow|block is required');
      });
    });
  });

  given('[case5] get shows remaining', () => {
    when('[t0] state exists with 2 uses', () => {
      then('outputs lets check the meter with remaining', () => {
        const result = runWithGlobalStorage({
          args: ['get'],
          meterState: { uses: 2, push: 'allow' },
          globalBlocker: true,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 lets check the meter...');
        expect(result.stdout).toContain('left: 2');
        expect(result.stdout).toContain('push: allowed');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case6] get with 0 uses and push allow (push-only mode)', () => {
    when('[t0] state exists with 0 uses and push allow', () => {
      then('shows push allowed for push-only use case', () => {
        const result = runWithGlobalStorage({
          args: ['get'],
          meterState: { uses: 0, push: 'allow' },
          globalBlocker: true,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('left: 0');
        expect(result.stdout).toContain('push: allowed');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case7] get when no state file', () => {
    when('[t0] no .meter/git.commit.uses.jsonc exists', () => {
      then('shows no quota set', () => {
        const result = runWithGlobalStorage({
          args: ['get'],
          globalBlocker: true,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 lets check the meter...');
        expect(result.stdout).toContain('no quota set');
        expect(result.stdout).toContain(
          'git.commit.uses set --quant N --push allow|block',
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  // ========================================
  // global blocker tests
  // ========================================

  given('[case8] block --global', () => {
    when('[t0] no global blocker yet', () => {
      then('creates global blocker file', () => {
        const result = runWithGlobalStorage({
          args: ['block', '--global'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 groovy, bond fire time');
        expect(result.stdout).toContain('commits blocked globally');
        expect(fs.existsSync(result.globalMeterFile)).toBe(true);

        const state = JSON.parse(
          fs.readFileSync(result.globalMeterFile, 'utf-8'),
        );
        expect(state.blocked).toBe(true);
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] global blocker already active', () => {
      then('overwrites blocker (idempotent)', () => {
        const result = runWithGlobalStorage({
          args: ['block', '--global'],
          globalBlocker: true,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('commits blocked globally');
        expect(fs.existsSync(result.globalMeterFile)).toBe(true);
      });
    });
  });

  given('[case9] allow --global', () => {
    when('[t0] global blocker is active', () => {
      then('removes global blocker file', () => {
        const result = runWithGlobalStorage({
          args: ['allow', '--global'],
          globalBlocker: true,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 shell yeah, back in the water!');
        expect(result.stdout).toContain('commits resumed globally');
        expect(fs.existsSync(result.globalMeterFile)).toBe(false);
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] no global blocker', () => {
      then('succeeds (idempotent)', () => {
        const result = runWithGlobalStorage({
          args: ['allow', '--global'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('commits resumed globally');
        expect(fs.existsSync(result.globalMeterFile)).toBe(false);
      });
    });

    when('[t2] no sponsor is bound to the tree', () => {
      /**
       * .what = `allow --global` is a quota grant, same as a local `set` —
       *         so it owes the same "no sponsor bound" nudge.
       *
       * .why = this closes the gap `enroll-impl-behavior-intent` (i035
       *        r010) named: the nudge lived ONLY on `set`'s local arm, so a
       *        tree that inherits its quota from a global grant got zero
       *        forewarning and hit the sponsor refusal cold on its first
       *        commit — untested, until now.
       */
      then('nudges to bind one', () => {
        const result = runWithGlobalStorage({
          args: ['allow', '--global'],
          sponsorBound: false,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('no sponsor is bound to this tree');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t3] a sponsor is already bound to the tree', () => {
      then('stays quiet', () => {
        const result = runWithGlobalStorage({
          args: ['allow', '--global'],
          sponsorBound: true,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).not.toContain('no sponsor is bound');
        // .why = the sponsor-bound `allow --global` render is a distinct
        //        caller-visible variant that only ever had a `not.toContain`
        //        guard — a partial-text assert cannot prove the rest of the
        //        tree still renders correctly.
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case10] get --global', () => {
    when('[t0] global blocker is active', () => {
      then('shows blocked', () => {
        const result = runWithGlobalStorage({
          args: ['get', '--global'],
          globalBlocker: true,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('global: blocked');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] no global blocker', () => {
      then('shows not blocked', () => {
        const result = runWithGlobalStorage({
          args: ['get', '--global'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('global: not blocked');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] the global blocker file is present and UNPARSEABLE', () => {
      /**
       * 🔴 .what = the corrupt render on the MOST authoritative read there is
       *
       * .why = `get --global` is what a human runs to learn the truth about the
       *        global blocker. it rendered the corrupt note from its own inline
       *        copy of five `echo` lines, and the twin surface (`get`, clamped
       *        at [case19][t3]) rendered the same note from another copy.
       *        ⇒ only ONE of the two was covered, so a reword or a dropped
       *        remedy line here would have shipped green and left the two reads
       *        of one file disagreed about how to repair it.
       *
       * ⇒ both now render through `print_global_corrupt_note`, and this case is
       *        what keeps the second call site honest rather than assumed.
       */
      const result = useThen('get still exits 0', () =>
        runWithGlobalStorage({
          args: ['get', '--global'],
          globalBlockerRaw: '{ this is not json',
        }),
      );

      then('it reads as BLOCKED, never as permissive', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('global: blocked (file corrupt)');
      });

      then('it names the FILE and both remedy commands', () => {
        // .why = "corrupt" alone sends the human nowhere. the note is the whole
        //        difference between an alarm and an action
        //        (rule.require.errors-name-the-fix).
        //
        // .why = the `~` form, never `$HOME` — the real path holds a per-run
        //        temp dir under test (rule.require.hermetic-tests).
        expect(result.stdout).toContain(
          '~/.rhachet/storage/repo=ehmpathy/role=mechanic/.meter/git.commit.uses.jsonc',
        );
        expect(result.stdout).toContain('$ cat ');

        // 🔴 .why `rm -r` and NOT `git.commit.uses allow --global` = the corrupt
        //        state this note renders spans three shapes, and one of them is
        //        a DIRECTORY at the path. `allow --global` runs `rm -f`, which
        //        cannot remove a directory, so it REFUSES on that shape — the
        //        printed fix would hand the human a second refusal.
        //
        // ⇒ `rm -r` is the one command that holds for every shape the gate
        //   classifies, and it is what the ORG twin already printed for the
        //   identical job. the two notes now agree (rule.require.ubiqlang).
        expect(result.stdout).toContain('$ rm -r ');
        expect(result.stdout).not.toContain('allow --global');
      });

      then('🔴 it renders BYTE-IDENTICALLY to its twin surface', () => {
        // 🔴 .why = the teeth for the SHARED leaf. two copies of one note can
        //        drift silently; one leaf cannot. this compares the note as
        //        rendered here against the same note rendered by `get`, so a
        //        future re-inline of either copy goes red rather than green.
        const twin = runWithGlobalStorage({
          args: ['get'],
          meterState: { uses: 3, push: 'allow' },
          globalBlockerRaw: '{ this is not json',
        });
        const noteOf = (out: string): string =>
          out.slice(out.indexOf('   the global blocker file cannot be read:'));

        expect(noteOf(result.stdout)).toBe(noteOf(twin.stdout));
      });

      then('the whole render is pinned', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  // ========================================
  // local block/allow commands
  // ========================================

  given('[case11] block (local)', () => {
    when('[t0] quota present', () => {
      then('sets quota to 0 (alias for del)', () => {
        const result = runWithGlobalStorage({
          args: ['block'],
          meterState: { uses: 5, push: 'allow' },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('🐢 groovy, break time');
        expect(result.stdout).toContain('git.commit.uses del');
        expect(result.stdout).toContain('revoked');

        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe(0);
        expect(state.push).toBe('block');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case12] allow (local)', () => {
    when('[t0] no quota present', () => {
      then('grants unlimited quota with push allowed', () => {
        const result = runWithGlobalStorage({
          args: ['allow'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain("🐢 radical! let's ride!");
        expect(result.stdout).toContain('granted: unlimited');
        expect(result.stdout).toContain('push: allowed');

        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe('infinite');
        expect(state.push).toBe('allow');
        expect(state.stage).toBe('allow');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  // ========================================
  // --stage option tests
  // ========================================

  given('[case14] set --stage allow', () => {
    when('[t0] stage permission granted explicitly', () => {
      then('state shows stage: allow', () => {
        const result = runInTempGitRepo({
          args: ['set', '--quant', '5', '--push', 'allow', '--stage', 'allow'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('stage: allowed');

        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.stage).toBe('allow');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case15] set --stage block', () => {
    when('[t0] stage permission blocked explicitly', () => {
      then('state shows stage: block', () => {
        const result = runInTempGitRepo({
          args: ['set', '--quant', '5', '--push', 'allow', '--stage', 'block'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('stage: blocked');

        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.stage).toBe('block');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case16] set without --stage (default)', () => {
    when('[t0] stage not specified', () => {
      then('state shows stage: block (default)', () => {
        const result = runInTempGitRepo({
          args: ['set', '--quant', '5', '--push', 'allow'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('stage: blocked');

        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.stage).toBe('block');
      });
    });
  });

  given('[case17] del resets stage', () => {
    when('[t0] del after stage was allowed', () => {
      then('state shows stage: block (via revoked state)', () => {
        const result = runInTempGitRepo({
          args: ['del'],
          meterState: { uses: 5, push: 'allow', stage: 'allow' },
        });

        expect(result.exitCode).toBe(0);

        const stateFile = path.join(
          result.tempDir,
          '.meter',
          'git.commit.uses.jsonc',
        );
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        expect(state.uses).toBe(0);
        expect(state.push).toBe('block');
        expect(state.stage).toBe('block');
      });
    });
  });

  given('[case18] get with stage permission', () => {
    when('[t0] state has stage: allow', () => {
      then('get displays stage: allowed', () => {
        const result = runWithGlobalStorage({
          args: ['get'],
          meterState: { uses: 3, push: 'allow', stage: 'allow' },
          globalBlocker: true,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('stage: allowed');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] state has stage: block', () => {
      then('get displays stage: blocked', () => {
        const result = runWithGlobalStorage({
          args: ['get'],
          meterState: { uses: 3, push: 'allow', stage: 'block' },
          globalBlocker: true,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('stage: blocked');
      });
    });

    when('[t2] state has no stage field (legacy)', () => {
      then('get displays stage: blocked (default)', () => {
        const result = runWithGlobalStorage({
          args: ['get'],
          meterState: { uses: 3, push: 'allow' },
          globalBlocker: true,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('stage: blocked');
      });
    });
  });

  // ========================================
  // get with global awareness
  // ========================================

  given('[case19] get shows local + global state', () => {
    when('[t0] local quota present and global blocked', () => {
      then('shows local meter and global blocked', () => {
        const result = runWithGlobalStorage({
          args: ['get'],
          meterState: { uses: 3, push: 'allow' },
          globalBlocker: true,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('left: 3');
        expect(result.stdout).toContain('push: allowed');
        expect(result.stdout).toContain('global: blocked');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] local quota present and global not blocked', () => {
      then('shows local meter without global line', () => {
        const result = runWithGlobalStorage({
          args: ['get'],
          meterState: { uses: 3, push: 'allow' },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('left: 3');
        expect(result.stdout).toContain('push: allowed');
        expect(result.stdout).not.toContain('global:');
      });
    });

    when('[t2] no local quota and global blocked', () => {
      then('shows no quota set and global blocked', () => {
        const result = runWithGlobalStorage({
          args: ['get'],
          globalBlocker: true,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('no quota set');
        expect(result.stdout).toContain('global: blocked');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t3] the global blocker file is present and UNPARSEABLE', () => {
      const result = useThen('get still exits 0', () =>
        runWithGlobalStorage({
          args: ['get'],
          meterState: { uses: 3, push: 'allow' },
          globalBlockerRaw: '{ this is not json',
        }),
      );

      then('it reads as BLOCKED, never as permissive', () => {
        // 🔴 .why = the read USED to swallow jq's non-zero exit, so a damaged
        //        permission file rendered with no `global:` line at all —
        //        indistinguishable from a host where commits are freely
        //        allowed. a malfunction reported as a permission, and it
        //        failed in the OPEN direction (rule.forbid.failhide).
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('global: blocked (file corrupt)');
      });

      then('it names the CORRUPTION, never a plain block', () => {
        // .why = "blocked" alone would send the human to `uses allow --global`,
        //        which writes a fresh file and hides the damage rather than
        //        reports it. the label is what separates the two remedies
        //        (rule.require.errors-name-the-fix).
        expect(result.stdout).not.toMatch(/global: blocked$/m);
      });

      then('🔴 it names the FILE, so the human can act on it', () => {
        // 🔴 .why = the render named the damage and stopped one step short of
        //        the file. the path is host-dependent and printed nowhere else
        //        on this read path, so a human who ran `get` could neither
        //        `cat` nor clear the very file the render was about
        //        (rule.require.errors-name-the-fix).
        //
        // ⇒ the label assert above passes with or without this line, which is
        //        why it needs its own teeth: the defect ADDS no wrong output,
        //        it OMITS the one fact that makes the alarm actionable.
        //
        // .why = the `~` form, never `$HOME` — the real path holds a per-run
        //        temp dir under test, so an absolute assert would pin a value
        //        that changes every run (rule.require.hermetic-tests).
        expect(result.stdout).toContain(
          '~/.rhachet/storage/repo=ehmpathy/role=mechanic/.meter/git.commit.uses.jsonc',
        );
      });

      then('the whole render is pinned', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t4] no local quota and the global blocker file is corrupt', () => {
      // .why = [t2] proves no-quota+blocked, [t3] proves quota+corrupt — but
      //        this THIRD composition (no quota AND a corrupt global file)
      //        is the exact state a fresh, ungranted tree with a damaged
      //        global blocker renders, and it was never itself exercised.
      then('shows no quota set and the corrupt note, never a raw crash', () => {
        const result = runWithGlobalStorage({
          args: ['get'],
          globalBlockerRaw: '{ this is not json',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('no quota set');
        expect(result.stdout).toContain('global: blocked (file corrupt)');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  // ========================================
  // TTY guard for human-only mutations
  // ========================================

  given('[case20] TTY guard for local mutations', () => {
    /**
     * .what = run command WITHOUT the test bypass to verify TTY check
     * .why = mutations must be blocked when stdin is not a TTY
     */
    const runWithoutTtyBypass = (args: {
      args: string[];
    }): {
      stdout: string;
      stderr: string;
      exitCode: number;
      tempDir: string;
    } => {
      const tempDir = genTempDir({
        slug: 'git-commit-uses-tty-test',
        git: true,
      });

      // run without __I_AM_HUMAN to trigger the TTY check
      const result = spawnSync('bash', [scriptPath, ...args.args], {
        cwd: tempDir,
        encoding: 'utf-8' as const,
        stdio: ['pipe', 'pipe', 'pipe'],
        // no __I_AM_HUMAN
      });

      return {
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
        exitCode: result.status ?? 1,
        tempDir,
      };
    };

    when('[t0] set is called from non-TTY', () => {
      then('blocks with human-only error', () => {
        const result = runWithoutTtyBypass({
          args: ['set', '--quant', '3', '--push', 'block'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('only humans can run this command');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] del is called from non-TTY', () => {
      then('blocks with human-only error', () => {
        const result = runWithoutTtyBypass({
          args: ['del'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('only humans can run this command');
      });
    });

    when('[t2] block is called from non-TTY', () => {
      then('blocks with human-only error', () => {
        const result = runWithoutTtyBypass({
          args: ['block'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('only humans can run this command');
      });
    });

    when('[t3] allow is called from non-TTY', () => {
      then('blocks with human-only error', () => {
        const result = runWithoutTtyBypass({
          args: ['allow'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('only humans can run this command');
      });
    });

    when('[t4] get is called from non-TTY', () => {
      then('succeeds (get is not a mutation)', () => {
        const result = runWithoutTtyBypass({
          args: ['get'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('no quota set');
      });
    });
  });

  // ========================================
  // org-level permission tests
  // ========================================

  /**
   * .what = run command with org state file
   * .why = tests org-level permission management
   */
  const runWithOrgStorage = (args: {
    args: string[];
    orgState?: Record<string, string>;
    // default false — a fresh tree has no sponsor, which is what the nudge is for
    sponsorBound?: boolean;
  }): {
    stdout: string;
    stderr: string;
    exitCode: number;
    tempDir: string;
    tempHome: string;
    orgStateFile: string;
  } => {
    const tempDir = genTempDir({ slug: 'git-commit-uses-org-test', git: true });
    const tempHome = genTempDir({
      slug: 'git-commit-uses-org-home',
      git: false,
    });
    const globalMeterDir = path.join(
      tempHome,
      '.rhachet',
      'storage',
      'repo=ehmpathy',
      'role=mechanic',
      '.meter',
    );
    const orgStateFile = path.join(globalMeterDir, 'git.commit.uses.org.jsonc');

    // create org state if provided
    if (args.orgState) {
      fs.mkdirSync(globalMeterDir, { recursive: true });
      fs.writeFileSync(
        orgStateFile,
        JSON.stringify({ orgs: args.orgState }, null, 2),
      );
    }

    // optionally bind a sponsor, so the nudge stays quiet — via the shared
    // helper, never an inline write (see the note on `runInTempGitRepo`)
    if (args.sponsorBound) seedTestSponsor({ cwd: tempDir });

    const result = spawnSync('bash', [scriptPath, ...args.args], {
      cwd: tempDir,
      encoding: 'utf-8' as const,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, HOME: tempHome, __I_AM_HUMAN: 'true' },
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      tempDir,
      tempHome,
      orgStateFile,
    };
  };

  given('[case31] the SHARED actor guard, under a REAL pseudo-terminal', () => {
    /**
     * 🔴 .why = `[case20]`, `[case21]`, and `[case30]` each prove
     *        `guard_actor_is_human_via_stdin` REFUSES a clone. not one proves
     *        it ACCEPTS a human, because `spawnSync` pipes stdin — so its
     *        accept branch is reached in this suite only via `__I_AM_HUMAN`.
     *
     *        ⇒ this guard is the SECOND of the two predicates (`-t 0` here,
     *        `-t 2 || -t 1 || -t 0` in `sponsor.sh`), and THREE skills source
     *        it. a regression in it would silently hand every `uses` mutation
     *        to a clone, and the suite would stay green on the escape hatch.
     */
    when('[t0] a human at a terminal grants a quota, escape DISABLED', () => {
      const scene = useThen('the grant lands', async () => {
        const tempDir = genTempDir({ slug: 'uses-pty-accept', git: true });
        const result = await spawnInPty({
          command: 'bash',
          args: [scriptPath, 'set', '--quant', '3', '--push', 'block'],
          cwd: tempDir,
          env: { __I_AM_HUMAN: '' },
        });
        return { ...result, tempDir };
      });

      then('🔴 the guard ACCEPTS a real tty — exit 0, no escape hatch', () => {
        expect(scene.timedOut).toBe(false);
        expect(scene.exitCode).toBe(0);
        expect(scene.output).not.toContain('only humans can run this command');

        // .why = the pty stream is its OWN caller-visible render — a merged
        //        stdout+stderr surface no piped test ever observes. a
        //        `not.toContain` proves ONE line is absent and proves naught
        //        about the tree around it, so a pty-specific artifact (a
        //        prompt echo, a doubled header, a stray byte) would ship
        //        green. the two volatile classes a pty adds are MASKED,
        //        never carved out, per
        //        rule.require.contract-snapshot-exhaustiveness:
        //          1. CR — a pty terminates lines `\r\n`, a pipe `\n`
        //          2. the temp dir — a fresh path per run
        const masked = scene.output
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '')
          .split(scene.tempDir)
          .join('<TEMP DIR>');
        expect(masked).toMatchSnapshot();
      });

      then('the quota is on disk', () => {
        const state = JSON.parse(
          fs.readFileSync(
            path.join(scene.tempDir, '.meter', 'git.commit.uses.jsonc'),
            'utf-8',
          ),
        );
        expect(state.uses).toBe(3);
      });

      then('the sponsor nudge still fires at a terminal', () => {
        // .why = the nudge is what makes the bind discoverable at the one
        //        moment a human is provably present. a human AT A TTY is
        //        exactly that moment, and it had never been observed there.
        expect(scene.output).toContain('no sponsor is bound');
      });
    });
  });

  given('[case22] allow --org ehmpathy', () => {
    when('[t0] no org config', () => {
      then('creates org state with ehmpathy allowed', () => {
        const result = runWithOrgStorage({
          args: ['allow', '--org', 'ehmpathy'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('shell yeah');
        expect(result.stdout).toContain('ehmpathy: allowed');
        expect(fs.existsSync(result.orgStateFile)).toBe(true);

        const state = JSON.parse(fs.readFileSync(result.orgStateFile, 'utf-8'));
        expect(state.orgs.ehmpathy).toBe('allowed');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] org was blocked', () => {
      then('updates to allowed', () => {
        const result = runWithOrgStorage({
          args: ['allow', '--org', 'ehmpathy'],
          orgState: { ehmpathy: 'blocked' },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('ehmpathy: allowed');

        const state = JSON.parse(fs.readFileSync(result.orgStateFile, 'utf-8'));
        expect(state.orgs.ehmpathy).toBe('allowed');
      });
    });

    when('[t2] no sponsor is bound to the tree', () => {
      /**
       * .what = `allow --org` is a quota grant too — the same nudge coverage
       *         gap as `--global` (i035 r010, finding 2).
       */
      then('nudges to bind one', () => {
        const result = runWithOrgStorage({
          args: ['allow', '--org', 'ehmpathy'],
          sponsorBound: false,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('no sponsor is bound to this tree');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t3] a sponsor is already bound to the tree', () => {
      then('stays quiet', () => {
        const result = runWithOrgStorage({
          args: ['allow', '--org', 'ehmpathy'],
          sponsorBound: true,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).not.toContain('no sponsor is bound');
        // .why = the sponsor-bound `allow --org` render is a distinct
        //        caller-visible variant that only ever had a `not.toContain`
        //        guard — a partial-text assert cannot prove the rest of the
        //        tree still renders correctly.
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case23] block --org ehmpathy', () => {
    when('[t0] org was allowed', () => {
      then('updates to blocked', () => {
        const result = runWithOrgStorage({
          args: ['block', '--org', 'ehmpathy'],
          orgState: { ehmpathy: 'allowed' },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('groovy, bond fire time');
        expect(result.stdout).toContain('ehmpathy: blocked');

        const state = JSON.parse(fs.readFileSync(result.orgStateFile, 'utf-8'));
        expect(state.orgs.ehmpathy).toBe('blocked');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case24] allow --org @all', () => {
    when('[t0] orgs had mixed states', () => {
      then('resets all and sets @all to allowed', () => {
        const result = runWithOrgStorage({
          args: ['allow', '--org', '@all'],
          orgState: { ehmpathy: 'blocked', ahbode: 'allowed' },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('reset: all orgs');
        expect(result.stdout).toContain('@all: allowed');

        const state = JSON.parse(fs.readFileSync(result.orgStateFile, 'utf-8'));
        expect(state.orgs).toEqual({ '@all': 'allowed' });
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case25] block --org @all', () => {
    when('[t0] orgs had mixed states', () => {
      then('resets all and sets @all to blocked', () => {
        const result = runWithOrgStorage({
          args: ['block', '--org', '@all'],
          orgState: { ehmpathy: 'allowed', ahbode: 'blocked' },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('reset: all orgs');
        expect(result.stdout).toContain('@all: blocked');

        const state = JSON.parse(fs.readFileSync(result.orgStateFile, 'utf-8'));
        expect(state.orgs).toEqual({ '@all': 'blocked' });
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case26] del --org ehmpathy', () => {
    when('[t0] org has config', () => {
      then('removes org config, defers to @all', () => {
        const result = runWithOrgStorage({
          args: ['del', '--org', 'ehmpathy'],
          orgState: { '@all': 'blocked', ehmpathy: 'allowed' },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous');
        expect(result.stdout).toContain('ehmpathy: removed');
        expect(result.stdout).toContain('inherits from @all');

        const state = JSON.parse(fs.readFileSync(result.orgStateFile, 'utf-8'));
        expect(state.orgs.ehmpathy).toBeUndefined();
        expect(state.orgs['@all']).toBe('blocked');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] del --org @all', () => {
      then('errors - cannot delete @all', () => {
        const result = runWithOrgStorage({
          args: ['del', '--org', '@all'],
          orgState: { '@all': 'allowed' },
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('cannot delete @all');
      });
    });
  });

  given('[case27] get --org', () => {
    when('[t0] orgs have config', () => {
      then('shows all org configs', () => {
        const result = runWithOrgStorage({
          args: ['get', '--org'],
          orgState: { '@all': 'blocked', ehmpathy: 'allowed' },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('lets check the meter');
        expect(result.stdout).toContain('@all: blocked');
        expect(result.stdout).toContain('ehmpathy: allowed');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] no org config', () => {
      then('shows no org configs set', () => {
        const result = runWithOrgStorage({
          args: ['get', '--org'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('no org configs set');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] a NAMED org, against an absent org meter', () => {
      then(
        '🔴 it reads `unset` — the same word a present-but-empty file gets',
        () => {
          // 🔴 .why this row = the arm used to carry its own `[[ ! -f ]]` early
          //        exit, so ONE state — *this org is not configured* — rendered
          //        two ways, decided by an incidental property of OTHER orgs:
          //          file absent          → `no org configs set`
          //          file present, empty  → `ehmpathy: unset`
          //        ⇒ a human who ran the same command twice, and configured an
          //        unrelated org in between, saw the answer to THEIR question
          //        change (rule.forbid.ambiguous-labels).
          //
          // ⇒ the early exit is gone; the hoisted guard seeds the skeleton and
          //   this arm reads the capture, so both paths now answer `unset`.
          const absent = runWithOrgStorage({
            args: ['get', '--org', 'ehmpathy'],
          });
          expect(absent.exitCode).toBe(0);
          expect(absent.stdout).toContain('ehmpathy: unset');
          expect(absent.stdout).not.toContain('no org configs set');

          // the present-but-empty twin, which already read this way
          const empty = runWithOrgStorage({
            args: ['get', '--org', 'ehmpathy'],
            orgState: {},
          });
          expect(empty.exitCode).toBe(0);
          expect(empty.stdout).toContain('ehmpathy: unset');
        },
      );
    });
  });

  given('[case28] get --org ehmpathy', () => {
    when('[t0] org has explicit config', () => {
      then('shows org config', () => {
        const result = runWithOrgStorage({
          args: ['get', '--org', 'ehmpathy'],
          orgState: { ehmpathy: 'allowed' },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('ehmpathy: allowed');
      });
    });

    when('[t1] org unset but @all set', () => {
      then('shows inherited from @all', () => {
        const result = runWithOrgStorage({
          args: ['get', '--org', 'ehmpathy'],
          orgState: { '@all': 'blocked' },
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('ehmpathy: blocked (from @all)');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case29] typo protection: all vs @all', () => {
    when('[t0] user types "all" instead of "@all"', () => {
      then('suggests @all', () => {
        const result = runWithOrgStorage({
          args: ['block', '--org', 'all'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('bummer dude');
        expect(result.stdout).toContain('did you mean @all');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] user types "ALL" instead of "@all"', () => {
      then('suggests @all', () => {
        const result = runWithOrgStorage({
          args: ['allow', '--org', 'ALL'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('did you mean @all');
      });
    });
  });

  /**
   * .what = the org name is DATA, never part of the jq program
   *
   * 🔴 .why = the allow/block/del/get paths built their jq program by string
   *        interpolation — `jq ".orgs[\"$ORG_NAME\"] = \"allowed\""`. an org
   *        name that carries a `"` therefore CLOSED that string and the rest
   *        parsed as jq, so one command could write a key it never named.
   *
   * ⚠️ .why it is not merely cosmetic = the render reports the name the human
   *        typed, so the collateral write is SILENT. a human who pastes an org
   *        name from a config is told "allowed" for that name while a DIFFERENT
   *        org's permission flips underneath.
   *
   * .clamp = `[t0]` writes the key it names and no other; `[t1]` is the
   *        counter-clamp — an ordinary name still round-trips, so the repair is
   *        not a blanket refusal of every org whose name is unusual.
   */
  given('[case32] an org name that carries jq syntax', () => {
    // closes the interpolated string, then sets a SECOND key
    const orgWithJqSyntax = 'x"] = "blocked" | .orgs["collateral';

    when('[t0] allow is called with it', () => {
      then('it writes only the key it was given', () => {
        const result = runWithOrgStorage({
          args: ['allow', '--org', orgWithJqSyntax],
          orgState: { ehmpathy: 'allowed' },
        });

        expect(result.exitCode).toBe(0);

        const state = JSON.parse(fs.readFileSync(result.orgStateFile, 'utf-8'));

        // 🔴 the whole value of the clamp: no key the human never typed
        expect(state.orgs.collateral).toBeUndefined();
        expect(state.orgs.x).toBeUndefined();

        // the literal name IS the key, and the neighbour is untouched
        expect(state.orgs[orgWithJqSyntax]).toBe('allowed');
        expect(state.orgs.ehmpathy).toBe('allowed');
      });
    });

    when('[t1] an ordinary org name is used', () => {
      then('it still round-trips — the counter-clamp', () => {
        const result = runWithOrgStorage({
          args: ['allow', '--org', 'ahbode'],
          orgState: { '@all': 'blocked' },
        });

        expect(result.exitCode).toBe(0);

        const state = JSON.parse(fs.readFileSync(result.orgStateFile, 'utf-8'));
        expect(state.orgs.ahbode).toBe('allowed');
        expect(state.orgs['@all']).toBe('blocked');
      });
    });
  });

  /**
   * 🔴 .what = the two `get` DISPLAY surfaces must agree with the GATE
   *
   * 🔴 .why = `check_global_blocker` — the gate every commit passes — was
   *        hardened against a 0-byte file and a directory-at-the-path. the two
   *        surfaces a human READS were not, so a gate and its own display began
   *        to disagree about one file: the commit refused, and `get` said
   *        `global: not blocked`.
   *
   * ⚠️ .why the two shapes, and only these two = each reaches the wrong answer
   *        by a DIFFERENT route, so a repair can close one and miss the other:
   *          · 0-byte  — jq exits 0 with an empty capture, so the `"true"`
   *                      compare is false and the parse reads as authoritative
   *          · directory — `-f` is a regular-file test, so it reads as ABSENT
   *
   * .why the extant corrupt cases do not cover it = `[case10][t2]` and
   *        `[case19][t3]` seed `'{ this is not json'`, on which jq exits
   *        NON-zero. that is the one damaged shape the old read caught.
   *
   * .clamp = 5 rows. four attacks across two surfaces, plus a counter-clamp so
   *        the repair is not a blanket refusal of every global meter file.
   */
  given('[case33] the global meter is damaged, and a human runs get', () => {
    // .why = the scene runs once to mint an isolated HOME, then the file is
    //        damaged, then the real read runs against that same HOME. a
    //        directory cannot be expressed through `globalBlockerRaw`, which
    //        writes bytes (rule.require.hermetic-tests keeps HOME isolated).
    const getAgainstDamaged = (input: {
      args: string[];
      damage: (meterFile: string) => void;
    }): {
      stdout: string;
      stderr: string;
      exitCode: number;
      meterFile: string;
    } => {
      const scene = runWithGlobalStorage({
        args: input.args,
        globalBlockerRaw: '{}',
      });

      input.damage(scene.globalMeterFile);

      const after = spawnSync('bash', [scriptPath, ...input.args], {
        cwd: scene.tempDir,
        encoding: 'utf-8' as const, // note: library api requires this term
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, HOME: scene.tempHome, __I_AM_HUMAN: 'true' },
      });

      return {
        stdout: after.stdout ?? '',
        stderr: after.stderr ?? '',
        exitCode: after.status ?? 1,
        meterFile: scene.globalMeterFile,
      };
    };

    const asDirectory = (meterFile: string): void => {
      fs.rmSync(meterFile, { force: true });
      fs.mkdirSync(meterFile, { recursive: true });
    };

    when('[t0] a 0-byte file, read by get --global', () => {
      then('it reads as BLOCKED, never as permissive', () => {
        const result = runWithGlobalStorage({
          args: ['get', '--global'],
          globalBlockerRaw: '',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('global: blocked (file corrupt)');
        expect(result.stdout).not.toContain('global: not blocked');
      });
    });

    when('[t1] a 0-byte file, read by get', () => {
      then('it reads as BLOCKED, never as permissive', () => {
        const result = runWithGlobalStorage({
          args: ['get'],
          meterState: { uses: 3, push: 'allow' },
          globalBlockerRaw: '',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('global: blocked (file corrupt)');
      });
    });

    when('[t2] a DIRECTORY at the path, read by get --global', () => {
      then('it reads as BLOCKED, never as absent', () => {
        const result = getAgainstDamaged({
          args: ['get', '--global'],
          damage: asDirectory,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('global: blocked (file corrupt)');
        expect(result.stdout).not.toContain('global: not blocked');
      });
    });

    when('[t3] a DIRECTORY at the path, read by get', () => {
      then('it reads as BLOCKED, never as absent', () => {
        const result = getAgainstDamaged({
          args: ['get'],
          damage: asDirectory,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('global: blocked (file corrupt)');
      });
    });

    when('[t4] a well-formed PERMISSIVE file', () => {
      then(
        '🔴 both surfaces still read NOT blocked — the counter-clamp',
        () => {
          // 🔴 .why = the repair moved both renders onto the shared gate, and a
          //        gate that refused every input would pass all four rows above
          //        while it paused the whole fleet. this row is what tells a
          //        hardened read from a blanket one.
          const global = runWithGlobalStorage({
            args: ['get', '--global'],
            globalBlockerRaw: '{"blocked": false}',
          });
          expect(global.exitCode).toBe(0);
          expect(global.stdout).toContain('global: not blocked');
          expect(global.stdout).not.toContain('corrupt');

          const local = runWithGlobalStorage({
            args: ['get'],
            meterState: { uses: 3, push: 'allow' },
            globalBlockerRaw: '{"blocked": false}',
          });
          expect(local.exitCode).toBe(0);
          expect(local.stdout).not.toContain('corrupt');
        },
      );
    });

    when(
      '[t5] a DIRECTORY at the path, and a human runs allow --global',
      () => {
        then('🔴 it REFUSES — it never reports a clear it did not make', () => {
          // 🔴 .why this row exists at all = `allow --global` is the command the
          //        corrupt-file refusals PRINT as their remedy. it guarded its
          //        delete with `-f`, so a DIRECTORY fell straight past to the
          //        render and it announced `commits resumed globally` while the
          //        blocker still halted every commit in the fleet.
          //
          // ⇒ the human is told to run it, runs it, is told it worked, and their
          //   next commit refuses for the reason they were told was cleared
          //   (rule.forbid.failhide).
          const result = getAgainstDamaged({
            args: ['allow', '--global'],
            damage: asDirectory,
          });

          // a damaged host path is a MALFUNCTION (exit 1), not bad caller
          // input (exit 2) — the same class guard_org_meter_is_readable and
          // refuse_set_state_damaged both exit 1 for, elsewhere in the family
          expect(result.exitCode).toBe(1);
          expect(result.stdout).not.toContain('commits resumed globally');
          expect(result.stdout).toContain(
            'the global blocker path is not a file',
          );

          // the remedy must name the path, since only a human can clear it
          expect(result.stdout).toContain('rm -r');

          // a refusal rides both streams (rule.require.skill-output-streams)
          expect(result.stderr).toContain(
            'the global blocker path is not a file',
          );

          // 🔴 the state half. an exit code proves the render; this proves the
          //    directory is still there, so the claim it makes is true
          expect(fs.statSync(result.meterFile).isDirectory()).toBe(true);

          // 🔴 .why the snapshot BESIDE the assertions = the four expects above
          //    pin the tokens that carry the contract and say no word about the
          //    prose around them — the path line, the two command lines, the
          //    blank line that separates them. this is the render a human meets
          //    after a corrupt-file refusal sent them here, so a reflow that
          //    buried the `rm -r` would keep every assertion green.
          //    ⇒ assertions for the contract, snapshot for the shape.
          //    (rule.require.snapshots, rule.require.snap-review-on-skill-change)
          expect(result.stdout).toMatchSnapshot();
        });
      },
    );

    when(
      '[t6] an ORDINARY blocker file, and a human runs allow --global',
      () => {
        then('🔴 it still clears — the refusal is not blanket', () => {
          // the counter-clamp. a guard that refused every present file would
          // pass [t5] and leave the fleet with no way to resume at all
          const scene = runWithGlobalStorage({
            args: ['allow', '--global'],
            globalBlockerRaw: '{"blocked": true}',
          });

          expect(scene.exitCode).toBe(0);
          expect(scene.stdout).toContain('commits resumed globally');
          expect(fs.existsSync(scene.globalMeterFile)).toBe(false);
        });
      },
    );

    when('[t7] a well-formed object whose `.blocked` leaf is a STRING', () => {
      then('🔴 it reads as BLOCKED, though the SHAPE is legal', () => {
        // 🔴 .why this row = every row above damages the file at the TOP level
        //        — 0 bytes, a directory, unparseable bytes. each one trips a
        //        shape gate. this file is a parseable object, so a shape-only
        //        gate waves it through, and the value read then yields the
        //        string `not really`, whose compare against `"true"` is false.
        //
        // ⇒ the fleet-wide pause switch would report PERMISSIVE on a file no
        //   human wrote on purpose. a gate that types the container and not
        //   the leaf it reads has the priority backwards.
        const global = runWithGlobalStorage({
          args: ['get', '--global'],
          globalBlockerRaw: '{"blocked": "not really"}',
        });
        expect(global.exitCode).toBe(0);
        expect(global.stdout).toContain('global: blocked (file corrupt)');
        expect(global.stdout).not.toContain('global: not blocked');

        // the local surface reads the same leaf through the same gate
        const local = runWithGlobalStorage({
          args: ['get'],
          meterState: { uses: 3, push: 'allow' },
          globalBlockerRaw: '{"blocked": "not really"}',
        });
        expect(local.exitCode).toBe(0);
        expect(local.stdout).toContain('global: blocked (file corrupt)');
      });
    });

    when('[t8] an object with NO `.blocked` key at all', () => {
      then('🔴 it reads as NOT blocked — the leaf gate is not blanket', () => {
        // the counter-clamp for [t7]. an absent `.blocked` is legal and means
        // "not blocked" — a bare `{}` is a healthy file, and [case33][t4]'s
        // own scene writes exactly that. a leaf gate that demanded the key be
        // PRESENT would pass [t7] and pause the fleet on every healthy host.
        const result = runWithGlobalStorage({
          args: ['get', '--global'],
          globalBlockerRaw: '{}',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('global: not blocked');
        expect(result.stdout).not.toContain('corrupt');
      });
    });
  });

  given('[case37] the ORG meter is damaged, and a human MUTATES it', () => {
    /**
     * 🔴 .what = the WRITE surfaces of the org meter, against a file that will
     *         not parse. the read surface (`get --org`) was gated first and
     *         alone, so a skill refused politely on one arm and crashed with
     *         jq's raw parse text on the other three — one file, two verdicts.
     *
     * 🔴 .why a mutation must REFUSE rather than overwrite = `allow --org x`
     *        read the file, edited it, and wrote it back. on bytes it could not
     *        parse, the read yields naught and the write lays down a fresh
     *        skeleton ⇒ a human who meant to ADD one org silently DROPS every
     *        org already named there (rule.require.safe-by-default).
     */
    const orgMeterPath = (home: string) =>
      path.join(
        home,
        '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
        'git.commit.uses.org.jsonc',
      );

    const mutateAgainstDamaged = (input: {
      args: string[];
      bytes: string;
    }): { stdout: string; stderr: string; exitCode: number; after: string } => {
      const scene = runWithGlobalStorage({
        args: ['get', '--org'],
        meterState: { uses: 3, push: 'allow' },
      });

      const meterFile = orgMeterPath(scene.tempHome);
      fs.mkdirSync(path.dirname(meterFile), { recursive: true });
      fs.writeFileSync(meterFile, input.bytes);

      const run = spawnSync('bash', [scriptPath, ...input.args], {
        cwd: scene.tempDir,
        encoding: 'utf-8' as const, // note: library api requires this term
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, HOME: scene.tempHome, __I_AM_HUMAN: 'true' },
      });

      return {
        stdout: run.stdout ?? '',
        stderr: run.stderr ?? '',
        exitCode: run.status ?? 1,
        after: fs.readFileSync(meterFile, 'utf-8'),
      };
    };

    when('[t0] allow --org against a file that will not parse', () => {
      then('🔴 it REFUSES, and the prior bytes are untouched', () => {
        const damaged = '{ "orgs": { "ehmpathy": "allo';
        const result = mutateAgainstDamaged({
          args: ['allow', '--org', 'ahbode'],
          bytes: damaged,
        });

        // 🔴 the clamp. this arm died on jq's own words, with no file named
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('org meter file corrupt');
        expect(result.stderr).toContain('org meter file corrupt');
        expect(result.stdout).toContain('git.commit.uses.org.jsonc');

        // 🔴 .why the whole render is PINNED, never only its phrases = this is
        //        a blocked-state a human reads to learn why their commits are
        //        refused. a `toContain` on four phrases says naught about the
        //        prose order, the blank lines, or whether the remedy list still
        //        holds both commands — so a dropped remedy line would ship
        //        green (rule.forbid.friction-hazards: every blocked state snapped).
        expect(result.stdout).toMatchSnapshot();

        // 🔴 the state half — the write must NOT have happened
        expect(result.after).toBe(damaged);
      });
    });

    when('[t1] block --org against a 0-byte file', () => {
      then('🔴 it REFUSES too — the write arms share one gate', () => {
        const result = mutateAgainstDamaged({
          args: ['block', '--org', 'ahbode'],
          bytes: '',
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('org meter file corrupt');
        expect(result.after).toBe('');
      });
    });

    when('[t2] allow --org against a WELL-FORMED file', () => {
      then('🔴 it still writes — the gate is not blanket', () => {
        // the counter-clamp. a gate that refused every present file would pass
        // both rows above and leave no way to configure an org at all
        const result = mutateAgainstDamaged({
          args: ['allow', '--org', 'ahbode'],
          bytes: '{ "orgs": { "ehmpathy": "allowed" } }',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).not.toContain('corrupt');

        // 🔴 and the PRIOR org survives, which is the harm [t0] guards against
        const after = JSON.parse(result.after);
        expect(after.orgs.ahbode).toBe('allowed');
        expect(after.orgs.ehmpathy).toBe('allowed');
      });
    });

    when('[t3] get --org against a file that will not parse', () => {
      then(
        '🔴 the READ arm refuses too — the guard is above the dispatch',
        () => {
          // 🔴 .why this row = the guard was hoisted above the dispatch precisely
          //        so all four arms share it, and the clamps covered only the two
          //        WRITE arms. ⇒ the claim "all four arms" rested on a read of
          //        the code rather than on a test, and the read arm is the one a
          //        human reaches FIRST when they are told the org meter is
          //        corrupt.
          const result = mutateAgainstDamaged({
            args: ['get', '--org'],
            bytes: '{ "orgs": { "ehmpathy": "allo',
          });

          expect(result.exitCode).toBe(1);
          expect(result.stdout).toContain('org meter file corrupt');
          expect(result.stderr).toContain('org meter file corrupt');

          // the header names the arm the human actually ran
          expect(result.stdout).toContain('git.commit.uses get --org');
          expect(result.stdout).toMatchSnapshot();
        },
      );
    });

    when('[t4] the file parses, but `.orgs` is not an object', () => {
      then('🔴 refuses as corrupt, never a raw jq crash', () => {
        // 🔴 .why this row = the top-level gate only checked
        //        `type == "object"` on the WHOLE file. `{"orgs": "x"}`
        //        passes that gate, so `get_org_state`'s
        //        `.orgs[$org] // "unset"` then indexed a STRING with a
        //        string key — a jq type error, raw under
        //        `set -euo pipefail`, with no file named and no remedy.
        const result = mutateAgainstDamaged({
          args: ['get', '--org'],
          bytes: '{ "orgs": "x" }',
        });

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('org meter file corrupt');
        expect(result.stderr).toContain('org meter file corrupt');
        expect(result.stdout).not.toContain('Cannot index string');
      });
    });
  });

  given('[case30] TTY guard for org mutations', () => {
    const runOrgWithoutTtyBypass = (args: {
      args: string[];
    }): {
      stdout: string;
      stderr: string;
      exitCode: number;
    } => {
      const tempDir = genTempDir({
        slug: 'git-commit-uses-org-tty-test',
        git: true,
      });
      const tempHome = genTempDir({
        slug: 'git-commit-uses-org-tty-home',
        git: false,
      });

      const result = spawnSync('bash', [scriptPath, ...args.args], {
        cwd: tempDir,
        encoding: 'utf-8' as const,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, HOME: tempHome },
        // no __I_AM_HUMAN
      });

      return {
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
        exitCode: result.status ?? 1,
      };
    };

    when('[t0] allow --org is called from non-TTY', () => {
      then('blocks with human-only error', () => {
        const result = runOrgWithoutTtyBypass({
          args: ['allow', '--org', 'ehmpathy'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('only humans can run this command');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] block --org is called from non-TTY', () => {
      then('blocks with human-only error', () => {
        const result = runOrgWithoutTtyBypass({
          args: ['block', '--org', 'ehmpathy'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('only humans can run this command');
      });
    });

    when('[t2] del --org is called from non-TTY', () => {
      then('blocks with human-only error', () => {
        const result = runOrgWithoutTtyBypass({
          args: ['del', '--org', 'ehmpathy'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('only humans can run this command');
      });
    });

    when('[t3] get --org is called from non-TTY', () => {
      then('succeeds (get is not a mutation)', () => {
        const result = runOrgWithoutTtyBypass({
          args: ['get', '--org'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('no org configs set');
      });
    });
  });

  given('[case21] TTY guard for global mutations', () => {
    const runGlobalWithoutTtyBypass = (args: {
      args: string[];
    }): {
      stdout: string;
      stderr: string;
      exitCode: number;
      tempDir: string;
      tempHome: string;
    } => {
      const tempDir = genTempDir({
        slug: 'git-commit-uses-tty-test',
        git: true,
      });
      const tempHome = genTempDir({
        slug: 'git-commit-uses-tty-home',
        git: false,
      });

      const result = spawnSync('bash', [scriptPath, ...args.args], {
        cwd: tempDir,
        encoding: 'utf-8' as const,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, HOME: tempHome },
        // no __I_AM_HUMAN
      });

      return {
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
        exitCode: result.status ?? 1,
        tempDir,
        tempHome,
      };
    };

    when('[t0] block --global is called from non-TTY', () => {
      // .why = both `then`s below observe the SAME refusal — one facet is
      //        stdout, the other stderr
      //        (rule.forbid.redundant-expensive-operations).
      const result = useThen('the refusal fires', () =>
        runGlobalWithoutTtyBypass({
          args: ['block', '--global'],
        }),
      );

      then('blocks with human-only error', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('only humans can run this command');
        expect(result.stdout).toContain('--global');
        expect(result.stdout).toMatchSnapshot();
      });

      then('🔴 the refusal rides BOTH streams', () => {
        // 🔴 .why = a refusal is a FAILURE, and a failure rides both streams
        //        (rule.require.skill-output-streams). the shared actor guard
        //        wrote to stdout alone, so a permission denial went unseen
        //        by a log aggregator and by any parent process that reads
        //        stderr — an unauditable denial on the quota-grant surface.
        //
        // 🔴 .why this assert is OWED = stdout stays preserved BYTE-FOR-BYTE
        //        by the fix, so every extant assert and snapshot here stays
        //        green with or without it. the repair ADDS bytes to a stream
        //        no test read before, and an addition no test reads is a
        //        repair that can vanish in a refactor
        //        (rule.require.clamp-edge-cases).
        //
        // ⚠️ .note = this clamps the STREAMS half only. the guard's PREDICATE
        //        (`-t 0` alone, vs the three streams `git.commit.sponsor`
        //        reads) is a question about who may grant commit authority,
        //        and it stays with the council — F12 ask 4b.
        expect(result.stderr).toContain('only humans can run this command');
      });
    });

    when('[t1] allow --global is called from non-TTY', () => {
      then('blocks with human-only error', () => {
        const result = runGlobalWithoutTtyBypass({
          args: ['allow', '--global'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('only humans can run this command');
      });
    });

    when('[t2] get --global is called from non-TTY', () => {
      then('succeeds (get is not a mutation)', () => {
        const result = runGlobalWithoutTtyBypass({
          args: ['get', '--global'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('not blocked');
      });
    });
  });

  given('[caseSponsorNudge] a quota is granted on a tree', () => {
    when('[t0] no sponsor is bound', () => {
      // .why = both `then`s below observe the SAME grant call
      //        (rule.forbid.redundant-expensive-operations).
      const result = useThen('the quota is granted', () =>
        runInTempGitRepo({
          args: ['set', '--quant', '5', '--push', 'allow'],
        }),
      );

      then('nudges toward the bind, and still exits 0', () => {
        // .why = a commit needs BOTH a quota and a sponsor, and this is the one
        //        act where a human is provably present. but a sponsor is
        //        required to COMMIT, never to GRANT — so the nudge carries no
        //        mandatory load and the grant stands on its own.
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('granted: 5');
        expect(result.stdout).toContain('🥥 did you know?');
        expect(result.stdout).toContain('no sponsor is bound to this tree');
        expect(result.stdout).toMatchSnapshot();
      });

      then('the nudge lists all three value forms', () => {
        // .why = a coconut is an OPTIONAL next move, so unlike a mandatory
        //        refusal it may name @me — the human reads it at a tty they
        //        already hold, and can judge which form fits their grove.
        expect(result.stdout).toContain('--who @stdin');
        expect(result.stdout).toContain('--who "Name <email>"');
        expect(result.stdout).toContain('--who @me');
      });
    });

    when('[t1] a sponsor is already bound', () => {
      then('stays quiet', () => {
        const result = runInTempGitRepo({
          args: ['set', '--quant', '5', '--push', 'allow'],
          sponsorBound: true,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('granted: 5');
        expect(result.stdout).not.toContain('🥥 did you know?');
        // .why = the sponsor-bound grant render is a distinct caller-visible
        //        variant (default success with no nudge) that only ever had
        //        a `not.toContain` guard — a partial-text assert cannot
        //        prove the rest of the tree still renders correctly.
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] the quota is revoked', () => {
      then('stays quiet — a revoke needs no sponsor', () => {
        const result = runInTempGitRepo({
          args: ['set', '--quant', '0', '--push', 'block'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).not.toContain('🥥 did you know?');
        // .why = the revoke arm of the nudge branch is its own caller-visible
        //        render. a `not.toContain` guard proves the coconut is absent
        //        and proves naught about the tree around it, so a drop or a
        //        reword of the revoke tree would ship green.
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t3] the sponsor state file is present and unusable', () => {
      /**
       * .why = a THIRD nudge variant, and it had no test. the branch renders
       *        a distinct coconut when the state file will not read, so a
       *        typo or a wrong argument count in it would ship green.
       *
       * .why = the render matters more than most: a corrupt file that got
       *        the "bind a sponsor" coconut would send the human to write a
       *        value that is already there, and the next commit would refuse
       *        again for the same unreported reason
       *        (rule.require.errors-name-the-fix).
       */
      const runWithCorruptSponsor = (raw: string) => {
        const tempDir = genTempDir({ slug: 'git-commit-uses-test', git: true });
        const meterDir = path.join(tempDir, '.meter');
        fs.mkdirSync(meterDir, { recursive: true });
        fs.writeFileSync(path.join(meterDir, 'git.commit.sponsor.jsonc'), raw);

        const result = spawnSync(
          'bash',
          [scriptPath, 'set', '--quant', '5', '--push', 'allow'],
          {
            cwd: tempDir,
            encoding: 'utf-8' as const, // note: library api requires this term
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, __I_AM_HUMAN: 'true' },
          },
        );
        return {
          stdout: result.stdout ?? '',
          exitCode: result.status ?? 1,
        };
      };

      // .why = both `then`s below observe the SAME corrupt-sponsor grant call
      //        (rule.forbid.redundant-expensive-operations). the third `then`
      //        in this `when` uses a DIFFERENT fixture, so it keeps its own
      //        call.
      const corruptResult = useThen(
        'the grant runs against a corrupt file',
        () => runWithCorruptSponsor('{ "sponsor": { "name": "Ada'),
      );

      then('nudges toward the FILE, never toward a re-bind', () => {
        expect(corruptResult.exitCode).toBe(0);
        expect(corruptResult.stdout).toContain('granted: 5');
        expect(corruptResult.stdout).toContain('🥥 did you know?');
        expect(corruptResult.stdout).toContain(
          'the sponsor state file is corrupt',
        );
        // 🔴 the clamp: the wrong branch would print this instead
        expect(corruptResult.stdout).not.toContain(
          'no sponsor is bound to this tree',
        );
        expect(corruptResult.stdout).toContain(
          'cat .meter/git.commit.sponsor.jsonc',
        );
        expect(corruptResult.stdout).toContain('rhx git.commit.sponsor del');
        expect(corruptResult.stdout).toMatchSnapshot();
      });

      then('🔴 it shows the BIND it promises, never just the clear', () => {
        // 🔴 .why = the nudge once promised "clear it, then bind afresh" and
        //        printed the clear with no bind, so a human who followed it
        //        was left at a cleared tree with the second half of the
        //        sentence undiscoverable (rule.require.errors-name-the-fix).
        //
        // ⇒ .why = the same incomplete-remedy class the mandatory refusals in
        //        `set.sh` / `sponsor.sh` were already repaired for. it survived
        //        on the one surface that WARNS about the state rather than
        //        refuses on it — which is why no extant assert caught it: they
        //        all graded what the nudge SAYS, and the gap was in what it
        //        SHOWS.
        //
        // .why = every printed bind must work on EVERY grove, so `@me` is
        //        asserted ABSENT: it reads the host's own session, which on a
        //        cloud grove is the clone's. a fourth step that refuses is the
        //        trap the vision's r6 rule closes.
        expect(corruptResult.stdout).toContain(
          "printf 'Name <email>' | rhx git.commit.sponsor set --who @stdin",
        );
        expect(corruptResult.stdout).toContain(
          'rhx git.commit.sponsor set --who "Name <email>"',
        );
        expect(corruptResult.stdout).not.toContain('--who @me');
      });

      then('🔴 no hint line fakes a sub-header with a final colon', () => {
        // 🔴 .why = `print_coconut_hint` renders a FLAT list of peers and has
        //        no sub-header primitive, so a hint that ends in `:` reads as
        //        a parent of the lines below it — a nest the renderer cannot
        //        draw, and the reader then mis-groups the remedy.
        //
        //        ⇒ measured: the `del` line shipped as
        //        `# clear it, then bind afresh:` while every peer comment in
        //        this file (`# reserve for YOUR OWN work`) described only the
        //        one line it sat on.
        //
        // .why ASSERTED over the WHOLE coconut, never the one line = the
        //        hazard is the shape, not this instance of it. a future hint
        //        added to any arm inherits the clamp for free.
        const coconut = corruptResult.stdout.slice(
          corruptResult.stdout.indexOf('🥥'),
        );
        const hintLines = coconut
          .split('\n')
          .filter((line) => /^\s+[├└]─ /.test(line));
        expect(hintLines.length).toBeGreaterThan(0);
        expect(
          hintLines.filter((line) => line.trimEnd().endsWith(':')),
        ).toEqual([]);
      });

      then(
        'a file that PARSES but names no sponsor nudges the same way',
        () => {
          // .why = the shape-invalid twin. a parse-only check would call this
          //        an UNBOUND tree and print the re-bind coconut.
          const result = runWithCorruptSponsor('{ "sponsor": {} }');

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('the sponsor state file is corrupt');
          expect(result.stdout).not.toContain(
            'no sponsor is bound to this tree',
          );
          // .why = the truncated-json twin above pins its whole render, and
          //        this one asserted by phrase alone. the two states share one
          //        code path — `read_sponsor_state` returns status 1 either
          //        way — so the renders SHOULD be byte-identical, and only a
          //        snapshot on both proves it stays that way.
          expect(result.stdout).toMatchSnapshot();
        },
      );
    });
  });
});
