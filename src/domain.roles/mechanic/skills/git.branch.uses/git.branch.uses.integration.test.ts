import { spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = integration tests for the git.branch.uses meter
 * .why = the meter gates every cutover apply; its grants, its three
 *        levels, and its damage refusals must hold, and it must never
 *        touch the commit meter's files
 */
describe('git.branch.uses', () => {
  const scriptPath = path.join(__dirname, 'git.branch.uses.sh');
  const operationsPath = path.join(__dirname, 'git.branch.uses.operations.sh');

  /**
   * .what = a sandbox: a temp repo with an org, and a temp HOME
   */
  const genSandbox = (input: { org: string }) => {
    const repoDir = genTempDir({ slug: 'branch-uses-repo', git: true });
    const homeDir = genTempDir({ slug: 'branch-uses-home', git: false });
    fs.mkdirSync(path.join(repoDir, '.agent'), { recursive: true });
    fs.writeFileSync(
      path.join(repoDir, '.agent', 'keyrack.yml'),
      `org: ${input.org}\n`,
    );
    const globalMeterDir = path.join(
      homeDir,
      '.rhachet',
      'storage',
      'repo=ehmpathy',
      'role=mechanic',
      '.meter',
    );
    return { repoDir, homeDir, globalMeterDir };
  };

  /**
   * .what = run the meter skill within a sandbox
   */
  const runMeter = (input: {
    sandbox: ReturnType<typeof genSandbox>;
    args: string[];
    human?: boolean;
    binDir?: string;
  }) => {
    const result = spawnSync('bash', [scriptPath, ...input.args], {
      cwd: input.sandbox.repoDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        HOME: input.sandbox.homeDir,
        __I_AM_HUMAN: input.human === false ? '' : 'true',
        ...(input.binDir
          ? { PATH: `${input.binDir}:${process.env.PATH}` }
          : {}),
      },
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  /**
   * .what = run the shared gate (and spend, if it passes) within a sandbox
   * .why = the gate is what the cutover verb calls; this proves it alone
   */
  const runGate = (input: { sandbox: ReturnType<typeof genSandbox> }) => {
    const result = spawnSync(
      'bash',
      [
        '-c',
        `source "${operationsPath}" && guard_branch_uses_granted cmd="git.branch.cutover begin" && spend_branch_use && echo GATE_PASSED`,
      ],
      {
        cwd: input.sandbox.repoDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, HOME: input.sandbox.homeDir },
      },
    );
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  const readLocalMeter = (sandbox: ReturnType<typeof genSandbox>) =>
    JSON.parse(
      fs.readFileSync(
        path.join(sandbox.repoDir, '.meter', 'git.branch.uses.jsonc'),
        'utf-8',
      ),
    );

  const writeLocalMeter = (
    sandbox: ReturnType<typeof genSandbox>,
    raw: string,
  ) => {
    fs.mkdirSync(path.join(sandbox.repoDir, '.meter'), { recursive: true });
    fs.writeFileSync(
      path.join(sandbox.repoDir, '.meter', 'git.branch.uses.jsonc'),
      raw,
    );
  };

  const writeOrgMeter = (
    sandbox: ReturnType<typeof genSandbox>,
    orgs: Record<string, string>,
  ) => {
    fs.mkdirSync(sandbox.globalMeterDir, { recursive: true });
    fs.writeFileSync(
      path.join(sandbox.globalMeterDir, 'git.branch.uses.org.jsonc'),
      JSON.stringify({ orgs }, null, 2),
    );
  };

  given('[case1] a human grants a local quota', () => {
    const sandbox = useBeforeAll(async () => genSandbox({ org: 'ehmpathy' }));

    when('[t0] set --quant 2', () => {
      then('it grants two cutovers', () => {
        const result = runMeter({ sandbox, args: ['set', '--quant', '2'] });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('granted: 2');
        expect(readLocalMeter(sandbox)).toEqual({ uses: 2 });
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] get', () => {
      then('it shows two left', () => {
        const result = runMeter({ sandbox, args: ['get'] });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('left: 2');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] allow', () => {
      then('it grants unlimited', () => {
        const result = runMeter({ sandbox, args: ['allow'] });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('granted: unlimited');
        expect(readLocalMeter(sandbox)).toEqual({ uses: 'infinite' });
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t3] del', () => {
      then('it revokes the quota', () => {
        const result = runMeter({ sandbox, args: ['del'] });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('revoked');
        expect(readLocalMeter(sandbox)).toEqual({ uses: 0 });
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t4] the commit meter is checked after all of the above', () => {
      then('no commit meter file was written', () => {
        expect(
          fs.existsSync(
            path.join(sandbox.repoDir, '.meter', 'git.commit.uses.jsonc'),
          ),
        ).toBe(false);
      });
    });
  });

  given('[case2] no quota is set', () => {
    const sandbox = useBeforeAll(async () => genSandbox({ org: 'ehmpathy' }));

    when('[t0] get', () => {
      then('it says no quota, and names how to get one', () => {
        const result = runMeter({ sandbox, args: ['get'] });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('no quota set');
        expect(result.stdout).toContain('rhx git.branch.uses set --quant N');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case3] a robot tries to grant itself a quota', () => {
    const sandbox = useBeforeAll(async () => genSandbox({ org: 'ehmpathy' }));

    when('[t0] set --quant 5 without a human at the terminal', () => {
      then('it refuses, and writes no meter', () => {
        const result = runMeter({
          sandbox,
          args: ['set', '--quant', '5'],
          human: false,
        });
        expect(result.exitCode).toBe(2);
        expect(
          fs.existsSync(
            path.join(sandbox.repoDir, '.meter', 'git.branch.uses.jsonc'),
          ),
        ).toBe(false);
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] get without a human at the terminal', () => {
      then('it answers — a read needs no human', () => {
        const result = runMeter({ sandbox, args: ['get'], human: false });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case4] bad set input', () => {
    const sandbox = useBeforeAll(async () => genSandbox({ org: 'ehmpathy' }));

    when('[t0] set with no --quant', () => {
      then('it refuses with exit 2', () => {
        const result = runMeter({ sandbox, args: ['set'] });
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: --quant N is required',
        );
        expect(result.stderr).toContain('✋ ConstraintError:');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] set --quant lots', () => {
      then('it refuses with exit 2', () => {
        const result = runMeter({ sandbox, args: ['set', '--quant', 'lots'] });
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('non-negative integer');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] set --push allow', () => {
      then('it refuses: the branch meter has no push axis', () => {
        const result = runMeter({
          sandbox,
          args: ['set', '--quant', '1', '--push', 'allow'],
        });
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('unknown option: --push');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case5] the local meter file is damaged', () => {
    when('[t0] the file is truncated', () => {
      then('get refuses by name with exit 1', () => {
        const sandbox = genSandbox({ org: 'ehmpathy' });
        writeLocalMeter(sandbox, '{ "uses": 3');
        const result = runMeter({ sandbox, args: ['get'] });
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain(
          '💥 MalfunctionError: cutover quota file corrupt',
        );
        expect(result.stdout).toContain('rhx git.branch.uses del');
        expect(result.stderr).toContain('💥 MalfunctionError:');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] the file is empty', () => {
      then('get refuses by name with exit 1', () => {
        const sandbox = genSandbox({ org: 'ehmpathy' });
        writeLocalMeter(sandbox, '');
        const result = runMeter({ sandbox, args: ['get'] });
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('💥 MalfunctionError:');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] uses is negative', () => {
      then('get refuses by name with exit 1', () => {
        const sandbox = genSandbox({ org: 'ehmpathy' });
        writeLocalMeter(sandbox, '{ "uses": -1 }');
        const result = runMeter({ sandbox, args: ['get'] });
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('💥 MalfunctionError:');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case6] the global level', () => {
    const sandbox = useBeforeAll(async () => genSandbox({ org: 'ehmpathy' }));

    when('[t0] block --global', () => {
      then('it writes the branch global file, never the commit one', () => {
        const result = runMeter({ sandbox, args: ['block', '--global'] });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('git.branch.uses block --global');
        expect(result.stdout).toContain('cutovers blocked globally');
        expect(
          fs.existsSync(
            path.join(sandbox.globalMeterDir, 'git.branch.uses.jsonc'),
          ),
        ).toBe(true);
        expect(
          fs.existsSync(
            path.join(sandbox.globalMeterDir, 'git.commit.uses.jsonc'),
          ),
        ).toBe(false);
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] get --global', () => {
      then('it reads the branch global file', () => {
        const result = runMeter({ sandbox, args: ['get', '--global'] });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('global: blocked');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] allow --global', () => {
      then('it lifts the blocker, with no sponsor nudge', () => {
        const result = runMeter({ sandbox, args: ['allow', '--global'] });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('cutovers resumed globally');
        expect(result.stdout).not.toContain('sponsor');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case7] the org level', () => {
    const sandbox = useBeforeAll(async () => genSandbox({ org: 'ehmpathy' }));

    when('[t0] allow --org ehmpathy', () => {
      then('it writes the branch org file, with no sponsor nudge', () => {
        const result = runMeter({
          sandbox,
          args: ['allow', '--org', 'ehmpathy'],
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('git.branch.uses allow --org ehmpathy');
        expect(result.stdout).not.toContain('sponsor');
        expect(
          JSON.parse(
            fs.readFileSync(
              path.join(sandbox.globalMeterDir, 'git.branch.uses.org.jsonc'),
              'utf-8',
            ),
          ),
        ).toEqual({ orgs: { ehmpathy: 'allowed' } });
        expect(
          fs.existsSync(
            path.join(sandbox.globalMeterDir, 'git.commit.uses.org.jsonc'),
          ),
        ).toBe(false);
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] get --org ehmpathy', () => {
      then('it reads allowed', () => {
        const result = runMeter({
          sandbox,
          args: ['get', '--org', 'ehmpathy'],
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('ehmpathy: allowed');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case8] the gate a cutover apply passes through', () => {
    when('[t0] the global level is blocked', () => {
      then('it refuses with exit 2 and names the lift', () => {
        const sandbox = genSandbox({ org: 'ehmpathy' });
        fs.mkdirSync(sandbox.globalMeterDir, { recursive: true });
        fs.writeFileSync(
          path.join(sandbox.globalMeterDir, 'git.branch.uses.jsonc'),
          JSON.stringify({ blocked: true }),
        );
        writeOrgMeter(sandbox, { ehmpathy: 'allowed' });
        writeLocalMeter(sandbox, '{ "uses": 2 }');
        const result = runGate({ sandbox });
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('cutovers blocked globally');
        expect(result.stdout).toContain('rhx git.branch.uses allow --global');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] a blocked COMMIT meter does not block a cutover', () => {
      then('the gate passes', () => {
        const sandbox = genSandbox({ org: 'ehmpathy' });
        fs.mkdirSync(sandbox.globalMeterDir, { recursive: true });
        fs.writeFileSync(
          path.join(sandbox.globalMeterDir, 'git.commit.uses.jsonc'),
          JSON.stringify({ blocked: true }),
        );
        writeOrgMeter(sandbox, { ehmpathy: 'allowed' });
        writeLocalMeter(sandbox, '{ "uses": 2 }');
        const result = runGate({ sandbox });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('GATE_PASSED');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] the org is not configured', () => {
      then('it refuses with exit 2 and names the org allow', () => {
        const sandbox = genSandbox({ org: 'ehmpathy' });
        writeLocalMeter(sandbox, '{ "uses": 2 }');
        const result = runGate({ sandbox });
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('rhx git.branch.uses allow --org');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t3] the org is blocked via @all', () => {
      then('it refuses with exit 2', () => {
        const sandbox = genSandbox({ org: 'ehmpathy' });
        writeOrgMeter(sandbox, { '@all': 'blocked' });
        writeLocalMeter(sandbox, '{ "uses": 2 }');
        const result = runGate({ sandbox });
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('cutovers blocked for org ehmpathy');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t4] no local quota', () => {
      then('it refuses with exit 2 and names the grant', () => {
        const sandbox = genSandbox({ org: 'ehmpathy' });
        writeOrgMeter(sandbox, { '@all': 'allowed' });
        const result = runGate({ sandbox });
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('no cutover quota set');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t5] the local quota is spent', () => {
      then('it refuses with exit 2', () => {
        const sandbox = genSandbox({ org: 'ehmpathy' });
        writeOrgMeter(sandbox, { '@all': 'allowed' });
        writeLocalMeter(sandbox, '{ "uses": 0 }');
        const result = runGate({ sandbox });
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('no cutover uses left');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t6] the local quota is damaged', () => {
      then('it refuses with exit 1', () => {
        const sandbox = genSandbox({ org: 'ehmpathy' });
        writeOrgMeter(sandbox, { '@all': 'allowed' });
        writeLocalMeter(sandbox, '[]');
        const result = runGate({ sandbox });
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('cutover quota file corrupt');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t7] two cutovers are granted', () => {
      then('one pass spends exactly one', () => {
        const sandbox = genSandbox({ org: 'ehmpathy' });
        writeOrgMeter(sandbox, { '@all': 'allowed' });
        writeLocalMeter(sandbox, '{ "uses": 2 }');
        const result = runGate({ sandbox });
        expect(result.exitCode).toBe(0);
        expect(readLocalMeter(sandbox)).toEqual({ uses: 1 });
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t8] unlimited is granted', () => {
      then('a pass spends none', () => {
        const sandbox = genSandbox({ org: 'ehmpathy' });
        writeOrgMeter(sandbox, { '@all': 'allowed' });
        writeLocalMeter(sandbox, '{ "uses": "infinite" }');
        const result = runGate({ sandbox });
        expect(result.exitCode).toBe(0);
        expect(readLocalMeter(sandbox)).toEqual({ uses: 'infinite' });
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t9] the global blocker file is damaged', () => {
      then(
        'it refuses as a malfunction with exit 1 and names the repair',
        () => {
          const sandbox = genSandbox({ org: 'ehmpathy' });
          fs.mkdirSync(sandbox.globalMeterDir, { recursive: true });
          fs.writeFileSync(
            path.join(sandbox.globalMeterDir, 'git.branch.uses.jsonc'),
            '{ "blocked": tr',
          );
          writeOrgMeter(sandbox, { ehmpathy: 'allowed' });
          writeLocalMeter(sandbox, '{ "uses": 2 }');
          const result = runGate({ sandbox });
          expect(result.exitCode).toBe(1);
          expect(result.stdout).toContain('💥 MalfunctionError:');
          expect(result.stderr).toContain('💥 MalfunctionError:');
          expect(result.stdout).toContain(
            'the global blocker file cannot be read',
          );
          expect(readLocalMeter(sandbox)).toEqual({ uses: 2 });
          expect(
            result.stdout.replace(sandbox.homeDir, '<home>'),
          ).toMatchSnapshot();
        },
      );
    });
  });

  given('[case9] the branch meter slug is left exported in the shell', () => {
    const sandbox = useBeforeAll(async () => genSandbox({ org: 'ehmpathy' }));

    when('[t0] the commit meter blocks globally', () => {
      then('it writes the commit global file, never the branch one', () => {
        const result = spawnSync(
          'bash',
          [
            path.join(__dirname, '..', 'git.commit', 'git.commit.uses.sh'),
            'block',
            '--global',
          ],
          {
            cwd: sandbox.repoDir,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
              ...process.env,
              HOME: sandbox.homeDir,
              __I_AM_HUMAN: 'true',
              METER_SLUG: 'git.branch.uses',
              METER_NOUN: 'cutover',
            },
          },
        );
        expect(result.status).toBe(0);
        expect(String(result.stdout)).toContain('commits blocked globally');
        expect(String(result.stdout)).toMatchSnapshot();
        expect(
          fs.existsSync(
            path.join(sandbox.globalMeterDir, 'git.commit.uses.jsonc'),
          ),
        ).toBe(true);
        expect(
          fs.existsSync(
            path.join(sandbox.globalMeterDir, 'git.branch.uses.jsonc'),
          ),
        ).toBe(false);
      });
    });
  });

  given('[case10] a human asks for help', () => {
    const sandbox = useBeforeAll(async () => genSandbox({ org: 'ehmpathy' }));

    when('[t0] --help', () => {
      then('it teaches every command, with a copy-paste example', () => {
        const result = runMeter({ sandbox, args: ['--help'] });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('usage: git.branch.uses set --quant N');
        expect(result.stdout).toContain('examples:');
        expect(result.stdout).toContain('rhx git.branch.uses get');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case11] the local revoke variants and the parser refusals', () => {
    const sandbox = useBeforeAll(async () => genSandbox({ org: 'ehmpathy' }));

    when('[t0] block, with no --global', () => {
      then('it revokes the local quota', () => {
        runMeter({ sandbox, args: ['set', '--quant', '2'] });
        const result = runMeter({ sandbox, args: ['block'] });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('git.branch.uses block');
        expect(result.stdout).toContain('revoked');
        expect(readLocalMeter(sandbox)).toEqual({ uses: 0 });
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] set --quant 0', () => {
      then('it revokes, and names del as the same act', () => {
        runMeter({ sandbox, args: ['set', '--quant', '2'] });
        const result = runMeter({ sandbox, args: ['set', '--quant', '0'] });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('revoked');
        expect(result.stdout).toContain('rhx git.branch.uses del');
        expect(readLocalMeter(sandbox)).toEqual({ uses: 0 });
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] no command', () => {
      then('it refuses and names the commands', () => {
        const result = runMeter({ sandbox, args: [] });
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('command required');
        expect(result.stderr).toContain('command required');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t3] an unknown option', () => {
      then('it refuses and names the option', () => {
        const result = runMeter({ sandbox, args: ['get', '--bogus'] });
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('unknown option: --bogus');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t4] an unknown command', () => {
      then('it refuses and names the command', () => {
        const result = runMeter({ sandbox, args: ['sprout'] });
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('sprout');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case12] the quota path holds a dir, not a file', () => {
    // .why = a `mv -f temp dir` moves the temp into the dir and exits 0; the
    //        grant would claim success while the gate still reads damage
    const sandbox = useBeforeAll(async () => {
      const sandbox = genSandbox({ org: 'ehmpathy' });
      fs.mkdirSync(
        path.join(sandbox.repoDir, '.meter', 'git.branch.uses.jsonc'),
        { recursive: true },
      );
      return sandbox;
    });

    when('[t0] set --quant 2', () => {
      then('it fails loud, claims no grant, and names the repair', () => {
        const result = runMeter({ sandbox, args: ['set', '--quant', '2'] });
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain(
          '💥 MalfunctionError: the quota path is not a file',
        );
        expect(result.stderr).toContain('the quota path is not a file');
        expect(result.stdout).not.toContain('granted');
        expect(result.stdout).toContain('rhx git.branch.uses set --quant 2');
        expect(
          fs.readdirSync(
            path.join(sandbox.repoDir, '.meter', 'git.branch.uses.jsonc'),
          ),
        ).toEqual([]);
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case13] one writer of the quota at a time', () => {
    // .why = a grant and a cutover's spend each read the quota, then write it;
    //        the meter lock lets each see the other's write, so none is lost
    const sandbox = useBeforeAll(async () => {
      const sandbox = genSandbox({ org: 'ehmpathy' });
      fs.mkdirSync(path.join(sandbox.repoDir, '.meter'), { recursive: true });
      fs.writeFileSync(
        path.join(sandbox.repoDir, '.meter', 'git.branch.uses.jsonc'),
        JSON.stringify({ uses: 1 }),
      );
      return sandbox;
    });
    const lockFile = () =>
      path.join(sandbox.repoDir, '.meter', 'git.branch.uses.lock');

    when('[t0] a live peer holds the meter lock', () => {
      const holder = useBeforeAll(async () => {
        const proc = spawn('sleep', ['60'], {
          detached: true,
          stdio: 'ignore',
        });
        proc.unref();
        fs.writeFileSync(lockFile(), `${proc.pid}\n`);
        return { pid: proc.pid! };
      });
      afterAll(() => {
        process.kill(holder.pid);
        fs.rmSync(lockFile(), { force: true });
      });

      then('set refuses as busy and writes naught', () => {
        const result = runMeter({ sandbox, args: ['set', '--quant', '5'] });
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('the cutover quota is busy');
        expect(result.stderr).toContain('the cutover quota is busy');
        expect(readLocalMeter(sandbox).uses).toEqual(1);
        expect(fs.readFileSync(lockFile(), 'utf-8')).toEqual(`${holder.pid}\n`);
      });
    });

    when('[t1] the holder of the meter lock is dead', () => {
      then('set reclaims the lock, writes, and frees it', () => {
        const dead = spawnSync('true');
        fs.writeFileSync(lockFile(), `${dead.pid}\n`);
        const result = runMeter({ sandbox, args: ['set', '--quant', '5'] });
        expect(result.exitCode).toBe(0);
        expect(readLocalMeter(sandbox).uses).toEqual(5);
        expect(fs.existsSync(lockFile())).toBe(false);
      });
    });

    when('[t2] a spend meets a quota already at zero', () => {
      then('the quota stays at zero, never below', () => {
        fs.writeFileSync(
          path.join(sandbox.repoDir, '.meter', 'git.branch.uses.jsonc'),
          JSON.stringify({ uses: 0 }),
        );
        const result = spawnSync(
          'bash',
          ['-c', `source "${operationsPath}" && spend_branch_use`],
          {
            cwd: sandbox.repoDir,
            encoding: 'utf-8',
            env: { ...process.env, HOME: sandbox.homeDir },
          },
        );
        expect(result.status).toBe(0);
        expect(readLocalMeter(sandbox).uses).toEqual(0);
      });
    });
  });

  given('[case14] a lock whose holder can no longer be told apart', () => {
    // .why = after a crash or a reboot, a lock's pid may now name a stranger,
    //        and a kill mid-reclaim strands the reclaim gate. neither may
    //        hold the meter shut forever
    const sandbox = useBeforeAll(async () => {
      const sandbox = genSandbox({ org: 'ehmpathy' });
      fs.mkdirSync(path.join(sandbox.repoDir, '.meter'), { recursive: true });
      fs.writeFileSync(
        path.join(sandbox.repoDir, '.meter', 'git.branch.uses.jsonc'),
        JSON.stringify({ uses: 1 }),
      );
      return sandbox;
    });
    const lockFile = () =>
      path.join(sandbox.repoDir, '.meter', 'git.branch.uses.lock');

    when(
      '[t0] the pid is live, but its start time is not the one recorded',
      () => {
        const stranger = useBeforeAll(async () => {
          const proc = spawn('sleep', ['60'], {
            detached: true,
            stdio: 'ignore',
          });
          proc.unref();
          fs.writeFileSync(
            lockFile(),
            `${proc.pid} Mon Jan  1 00:00:00 2001\n`,
          );
          return { pid: proc.pid! };
        });
        afterAll(() => {
          process.kill(stranger.pid);
        });

        then(
          'set reads the holder as gone, reclaims, writes, and frees it',
          () => {
            const result = runMeter({ sandbox, args: ['set', '--quant', '4'] });
            expect(result.exitCode).toBe(0);
            expect(readLocalMeter(sandbox).uses).toEqual(4);
            expect(fs.existsSync(lockFile())).toBe(false);
          },
        );
      },
    );

    when('[t1] a dead holder, and a reclaim gate stranded long ago', () => {
      then('set clears the stale gate, reclaims, and writes', () => {
        const dead = spawnSync('true');
        fs.writeFileSync(lockFile(), `${dead.pid}\n`);
        const gate = `${lockFile()}.reclaim`;
        fs.mkdirSync(gate);
        const longAgo = new Date(Date.now() - 5 * 60 * 1000);
        fs.utimesSync(gate, longAgo, longAgo);
        const result = runMeter({ sandbox, args: ['set', '--quant', '6'] });
        expect(result.exitCode).toBe(0);
        expect(readLocalMeter(sandbox).uses).toEqual(6);
        expect(fs.existsSync(gate)).toBe(false);
        expect(fs.existsSync(lockFile())).toBe(false);
      });
    });
  });

  given('[case15] the filesystem refuses the lock file itself', () => {
    // .why = a link that fails with no lock present is no contention: no wait
    //        will clear it, so it must read as a malfunction, never as busy
    //
    // .mock = an `ln` shim on PATH that always fails
    // .why  = a filesystem with no hard links cannot be made on demand in a
    //         temp dir; the shim is the one way to make the link fail alone
    const sandbox = useBeforeAll(async () => {
      const sandbox = genSandbox({ org: 'ehmpathy' });
      fs.mkdirSync(path.join(sandbox.repoDir, '.meter'), { recursive: true });
      fs.writeFileSync(
        path.join(sandbox.repoDir, '.meter', 'git.branch.uses.jsonc'),
        JSON.stringify({ uses: 1 }),
      );
      const binDir = genTempDir({ slug: 'branch-uses-case15-bin', git: false });
      fs.writeFileSync(
        path.join(binDir, 'ln'),
        [
          '#!/usr/bin/env bash',
          'echo "ln: failed to create hard link: Operation not permitted" >&2',
          'exit 1',
          '',
        ].join('\n'),
      );
      fs.chmodSync(path.join(binDir, 'ln'), '755');
      return { ...sandbox, binDir };
    });

    when('[t0] set --quant 4', () => {
      then(
        'it fails loud as a malfunction, not busy, and writes naught',
        () => {
          const result = runMeter({
            sandbox,
            args: ['set', '--quant', '4'],
            binDir: sandbox.binDir,
          });
          expect(result.exitCode).toBe(1);
          expect(result.stdout).toContain(
            'the quota lock file could not be made',
          );
          expect(result.stdout).toContain('Operation not permitted');
          expect(result.stdout).not.toContain('busy');
          expect(result.stderr).toContain(
            'the quota lock file could not be made',
          );
          expect(readLocalMeter(sandbox).uses).toEqual(1);
        },
      );
    });
  });

  given('[case16] rhachet passthrough args before the subcommand', () => {
    const sandbox = useBeforeAll(async () => genSandbox({ org: 'ehmpathy' }));
    const PASSTHROUGH = [
      '--skill',
      'git.branch.uses',
      '--repo',
      'ehmpathy',
      '--role',
      'mechanic',
    ];

    when('[t0] set --quant 1, as rhx invokes it', () => {
      then('the passthrough args are ignored and the grant lands', () => {
        const result = runMeter({
          sandbox,
          args: [...PASSTHROUGH, 'set', '--quant', '1'],
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('granted: 1');
        expect(readLocalMeter(sandbox)).toEqual({ uses: 1 });
      });
    });

    when('[t1] get, as rhx invokes it', () => {
      then('it shows the grant', () => {
        const result = runMeter({ sandbox, args: [...PASSTHROUGH, 'get'] });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('left: 1');
      });
    });
  });
});
