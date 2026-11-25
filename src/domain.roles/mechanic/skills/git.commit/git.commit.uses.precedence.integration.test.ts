import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = exhaustive precedence matrix tests for git.commit.uses
 * .why = verify that precedence order (global > org > local) is correctly enforced
 *
 * precedence order (highest to lowest):
 *   1. global blocked = always blocked (overrides all)
 *   2. org config = overrides local
 *   3. local config = base level
 *
 * legend:
 *   ✓ = allowed
 *   ✗ = blocked
 *   ∅ = unset
 *
 * for each combination, we test whether git.commit.push can proceed.
 */
describe('git.commit.uses precedence matrix', () => {
  const pushScriptPath = path.join(__dirname, 'git.commit.push.sh');

  /**
   * .what = run git.commit.push with full global/org/local setup
   * .why = test actual precedence behavior via push command
   */
  const runPushWithPrecedence = (args: {
    globalState?: 'blocked' | 'allowed';
    orgState?:
      | { org: string; state: 'blocked' | 'allowed' }
      | { orgs: Record<string, string> }
      | '@all-blocked'
      | '@all-allowed';
    localState?: { uses: number; held: boolean };
    keyrackOrg: string;
    keyrackRaw?: string | null; // keyrack.yml verbatim, over keyrackOrg; null = no file
  }): {
    stdout: string;
    stderr: string;
    exitCode: number;
    tempDir: string;
    tempHome: string;
  } => {
    const tempDir = genTempDir({ slug: 'precedence-test', git: true });
    const tempHome = genTempDir({ slug: 'precedence-home', git: false });

    // create .agent/keyrack.yml with org
    const agentDir = path.join(tempDir, '.agent');
    fs.mkdirSync(agentDir, { recursive: true });
    if (args.keyrackRaw !== null)
      fs.writeFileSync(
        path.join(agentDir, 'keyrack.yml'),
        args.keyrackRaw ?? `org: ${args.keyrackOrg}\n`,
      );

    // create global state if provided
    const globalMeterDir = path.join(
      tempHome,
      '.rhachet',
      'storage',
      'repo=ehmpathy',
      'role=mechanic',
      '.meter',
    );
    if (args.globalState) {
      fs.mkdirSync(globalMeterDir, { recursive: true });
      fs.writeFileSync(
        path.join(globalMeterDir, 'git.commit.uses.jsonc'),
        JSON.stringify({ blocked: args.globalState === 'blocked' }, null, 2),
      );
    }

    // create org state if provided
    if (args.orgState) {
      fs.mkdirSync(globalMeterDir, { recursive: true });
      let orgsObj: Record<string, string> = {};
      if (args.orgState === '@all-blocked') {
        orgsObj = { '@all': 'blocked' };
      } else if (args.orgState === '@all-allowed') {
        orgsObj = { '@all': 'allowed' };
      } else if ('orgs' in args.orgState) {
        orgsObj = args.orgState.orgs;
      } else {
        orgsObj = { [args.orgState.org]: args.orgState.state };
      }
      fs.writeFileSync(
        path.join(globalMeterDir, 'git.commit.uses.org.jsonc'),
        JSON.stringify({ orgs: orgsObj }, null, 2),
      );
    }

    // create local state if provided
    if (args.localState) {
      const meterDir = path.join(tempDir, '.meter');
      fs.mkdirSync(meterDir, { recursive: true });
      fs.writeFileSync(
        path.join(meterDir, 'git.commit.uses.jsonc'),
        JSON.stringify(args.localState, null, 2),
      );
    }

    // create branch and commit for push to work
    spawnSync('git', ['checkout', '-b', 'turtle/feature'], { cwd: tempDir });
    fs.writeFileSync(path.join(tempDir, 'file.txt'), 'content');
    spawnSync('git', ['add', 'file.txt'], { cwd: tempDir });
    spawnSync(
      'git',
      [
        '-c',
        'user.name=seaturtle[bot]',
        '-c',
        'user.email=seaturtle@ehmpath.com',
        'commit',
        '-m',
        'feat: test commit',
      ],
      { cwd: tempDir },
    );

    const result = spawnSync('bash', [pushScriptPath, '--mode', 'plan'], {
      cwd: tempDir,
      encoding: 'utf-8' as const,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        HOME: tempHome,
      },
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      tempDir,
      tempHome,
    };
  };

  /**
   * .what = helper to determine expected behavior
   * .why = documents precedence rules in code
   */
  const getExpectedBehavior = (args: {
    global: 'blocked' | 'allowed' | 'unset';
    org: 'blocked' | 'allowed' | 'unset';
    local: 'allowed' | 'blocked' | 'unset';
  }): 'blocked' | 'allowed' => {
    // rule 1: global blocked overrides all
    if (args.global === 'blocked') return 'blocked';

    // rule 2: org config is checked next
    if (args.org === 'blocked') return 'blocked';
    if (args.org === 'allowed') {
      // org allowed, check local
      if (args.local === 'blocked' || args.local === 'unset') return 'blocked';
      return 'allowed';
    }

    // rule 3: org unset, check local
    // note: with org unset, push is blocked due to no org config
    if (args.org === 'unset') return 'blocked';

    // fallback
    return 'blocked';
  };

  // ================================================================
  // GLOBAL BLOCKED cases - should ALWAYS block regardless of org/local
  // ================================================================

  given('[global=blocked, org=allowed, local=allowed]', () => {
    when('[t0] push is attempted', () => {
      then('blocked by global', () => {
        const result = runPushWithPrecedence({
          globalState: 'blocked',
          orgState: { org: 'ehmpathy', state: 'allowed' },
          localState: { uses: 3, held: true },
          keyrackOrg: 'ehmpathy',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('commits blocked globally');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[global=blocked, org=allowed, local=blocked]', () => {
    when('[t0] push is attempted', () => {
      then('blocked by global', () => {
        const result = runPushWithPrecedence({
          globalState: 'blocked',
          orgState: { org: 'ehmpathy', state: 'allowed' },
          localState: { uses: 0, held: false },
          keyrackOrg: 'ehmpathy',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('commits blocked globally');
      });
    });
  });

  given('[global=blocked, org=allowed, local=unset]', () => {
    when('[t0] push is attempted', () => {
      then('blocked by global', () => {
        const result = runPushWithPrecedence({
          globalState: 'blocked',
          orgState: { org: 'ehmpathy', state: 'allowed' },
          localState: undefined,
          keyrackOrg: 'ehmpathy',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('commits blocked globally');
      });
    });
  });

  given('[global=blocked, org=blocked, local=allowed]', () => {
    when('[t0] push is attempted', () => {
      then('blocked by global (not by org)', () => {
        const result = runPushWithPrecedence({
          globalState: 'blocked',
          orgState: { org: 'ehmpathy', state: 'blocked' },
          localState: { uses: 3, held: true },
          keyrackOrg: 'ehmpathy',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('commits blocked globally');
      });
    });
  });

  given('[global=blocked, org=unset, local=allowed]', () => {
    when('[t0] push is attempted', () => {
      then('blocked by global', () => {
        const result = runPushWithPrecedence({
          globalState: 'blocked',
          orgState: undefined,
          localState: { uses: 3, held: true },
          keyrackOrg: 'ehmpathy',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('commits blocked globally');
      });
    });
  });

  // ================================================================
  // ORG BLOCKED cases - should block when global is not blocked
  // ================================================================

  given('[global=unset, org=blocked, local=allowed]', () => {
    when('[t0] push is attempted', () => {
      then('blocked by org', () => {
        const result = runPushWithPrecedence({
          globalState: undefined,
          orgState: { org: 'ehmpathy', state: 'blocked' },
          localState: { uses: 3, held: true },
          keyrackOrg: 'ehmpathy',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('commits blocked for org ehmpathy');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[global=unset, org=@all-blocked, local=allowed]', () => {
    when('[t0] push is attempted', () => {
      then('blocked by @all default', () => {
        const result = runPushWithPrecedence({
          globalState: undefined,
          orgState: '@all-blocked',
          localState: { uses: 3, held: true },
          keyrackOrg: 'ehmpathy',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('commits blocked for org ehmpathy');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  // ================================================================
  // ORG ALLOWED + LOCAL variations
  // ================================================================

  given('[global=unset, org=allowed, local=allowed]', () => {
    when('[t0] push is attempted', () => {
      then('allowed - shows plan', () => {
        const result = runPushWithPrecedence({
          globalState: undefined,
          orgState: { org: 'ehmpathy', state: 'allowed' },
          localState: { uses: 3, held: true },
          keyrackOrg: 'ehmpathy',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('heres the wave');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[global=unset, org=allowed, local=blocked]', () => {
    when('[t0] push is attempted', () => {
      then('blocked by the revoked local grant', () => {
        const result = runPushWithPrecedence({
          globalState: undefined,
          orgState: { org: 'ehmpathy', state: 'allowed' },
          localState: { uses: 0, held: false },
          keyrackOrg: 'ehmpathy',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('no commit grant held');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[global=unset, org=allowed, local=unset]', () => {
    when('[t0] push is attempted', () => {
      then('blocked - no local quota', () => {
        const result = runPushWithPrecedence({
          globalState: undefined,
          orgState: { org: 'ehmpathy', state: 'allowed' },
          localState: undefined,
          keyrackOrg: 'ehmpathy',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('no commit grant held');
      });
    });
  });

  given('[global=unset, org=@all-allowed, local=allowed]', () => {
    when('[t0] push is attempted', () => {
      then('allowed via @all default', () => {
        const result = runPushWithPrecedence({
          globalState: undefined,
          orgState: '@all-allowed',
          localState: { uses: 3, held: true },
          keyrackOrg: 'ehmpathy',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('heres the wave');
      });
    });
  });

  // ================================================================
  // ORG UNSET cases - should block due to absent org config
  // ================================================================

  given('[global=unset, org=unset, local=allowed]', () => {
    when('[t0] push is attempted', () => {
      then('blocked - org config required', () => {
        const result = runPushWithPrecedence({
          globalState: undefined,
          orgState: undefined,
          localState: { uses: 3, held: true },
          keyrackOrg: 'ehmpathy',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: no org config for ehmpathy',
        );
        expect(result.stdout).toContain(
          '└─ git.commit.uses allow --org ehmpathy',
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  // ================================================================
  // KEYRACK ORG LISTS — every listed org must allow
  // ================================================================

  given('[keyrack org: lists several orgs, every one allowed]', () => {
    when('[t0] push is attempted', () => {
      then('allowed - shows plan', () => {
        const result = runPushWithPrecedence({
          orgState: { orgs: { ahbode: 'allowed', bhanya: 'allowed' } },
          localState: { uses: 3, push: 'allow' },
          keyrackOrg: '[ahbode, bhanya]',
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('heres the wave');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[keyrack org: lists several orgs, the second blocked]', () => {
    when('[t0] push is attempted with a flow list', () => {
      then('blocked - names the blocked org and its allow', () => {
        const result = runPushWithPrecedence({
          orgState: { orgs: { ahbode: 'allowed', bhanya: 'blocked' } },
          localState: { uses: 3, push: 'allow' },
          keyrackOrg: '[ahbode, bhanya]',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('commits blocked for org bhanya');
        expect(result.stdout).toContain('every listed org must allow');
        expect(result.stdout).toContain('git.commit.uses allow --org bhanya');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] push is attempted with a block list', () => {
      then('blocked - names the blocked org', () => {
        const result = runPushWithPrecedence({
          orgState: { orgs: { ahbode: 'allowed', bhanya: 'blocked' } },
          localState: { uses: 3, push: 'allow' },
          keyrackOrg: '',
          keyrackRaw: 'org:\n  - ahbode\n  - bhanya\n',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('commits blocked for org bhanya');
        expect(result.stdout).toContain('git.commit.uses allow --org bhanya');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[keyrack org: cannot be read]', () => {
    when('[t0] org: is an empty list', () => {
      then('blocked - shows what it read, names no org allow', () => {
        const result = runPushWithPrecedence({
          orgState: '@all-allowed',
          localState: { uses: 3, push: 'allow' },
          keyrackOrg: '[]',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('org: lists no org');
        expect(result.stdout).toContain('org: read as:');
        expect(result.stdout).not.toContain('allow --org');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] keyrack.yml is absent', () => {
      then('blocked - names the keyrack fix, no org allow', () => {
        const result = runPushWithPrecedence({
          orgState: '@all-allowed',
          localState: { uses: 3, push: 'allow' },
          keyrackOrg: '',
          keyrackRaw: null,
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('.agent/keyrack.yml not found');
        expect(result.stdout).not.toContain('allow --org');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  // ================================================================
  // SUMMARY MATRIX
  // ================================================================
  // | global  | org      | local    | result  | reason                      |
  // |---------|----------|----------|---------|-----------------------------|
  // | blocked | allowed  | allowed  | blocked | global overrides            |
  // | blocked | allowed  | blocked  | blocked | global overrides            |
  // | blocked | allowed  | unset    | blocked | global overrides            |
  // | blocked | blocked  | allowed  | blocked | global overrides            |
  // | blocked | unset    | allowed  | blocked | global overrides            |
  // | unset   | blocked  | allowed  | blocked | org blocks                  |
  // | unset   | @all-blk | allowed  | blocked | @all default blocks         |
  // | unset   | allowed  | allowed  | allowed | all levels allow            |
  // | unset   | allowed  | blocked  | blocked | local grant revoked         |
  // | unset   | allowed  | unset    | blocked | no local quota              |
  // | unset   | @all-alw | allowed  | allowed | @all default + local allow  |
  // | unset   | unset    | allowed  | blocked | no org config               |
  // ================================================================
});
