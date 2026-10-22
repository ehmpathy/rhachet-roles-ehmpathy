import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

/**
 * .what = integration tests for git.release.uses.sh
 * .why = the release meter is the one gate on a ship; prove each level
 *        reads and writes its own file, fails closed, and needs a human
 */
describe('git.release.uses.sh', () => {
  const scriptPath = path.join(__dirname, 'git.release.uses.sh');

  /**
   * .what = a temp repo + a temp HOME, so no run reads or writes the runner's meters
   */
  const genScene = (input: {
    org: string | null;
    localRaw: string | null;
  }): { repo: string; home: string; meterDir: string } => {
    const repo = genTempDir({ slug: 'git-release-uses-repo', git: true });
    const home = genTempDir({ slug: 'git-release-uses-home', git: false });
    if (input.org !== null) {
      fs.mkdirSync(path.join(repo, '.agent'), { recursive: true });
      fs.writeFileSync(
        path.join(repo, '.agent', 'keyrack.yml'),
        `org: ${input.org}\n`,
      );
    }
    if (input.localRaw !== null) {
      fs.mkdirSync(path.join(repo, '.meter'), { recursive: true });
      fs.writeFileSync(
        path.join(repo, '.meter', 'git.release.uses.jsonc'),
        input.localRaw,
      );
    }
    const meterDir = path.join(
      home,
      '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
    );
    return { repo, home, meterDir };
  };

  const run = (input: {
    scene: { repo: string; home: string };
    args: string[];
    human: boolean;
  }): { stdout: string; stderr: string; exitCode: number } => {
    const humanEnv: Record<string, string> = input.human
      ? { __I_AM_HUMAN: 'true' }
      : {};
    const { __I_AM_HUMAN: _humanOmitted, ...envRunner } = process.env;
    const result = spawnSync('bash', [scriptPath, ...input.args], {
      cwd: input.scene.repo,
      encoding: 'utf-8' as const,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...envRunner, HOME: input.scene.home, ...humanEnv },
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  given('[case1] a fresh tree with no release grant at any level', () => {
    const scene = useBeforeAll(async () =>
      genScene({ org: 'ehmpathy', localRaw: null }),
    );

    when('[t0] any actor runs get', () => {
      const res = useThen('get runs', async () =>
        run({ scene, args: ['get'], human: false }),
      );

      then('it reads every level as blocked, exit 0', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain('left: unset (blocked)');
        expect(res.stdout).toContain('org: blocked');
        expect(res.stdout).toContain('global: not blocked');
      });

      then('the verdict names every level that blocks', () => {
        expect(res.stdout).toContain('verdict: blocked by local + org');
      });

      then('the render matches snapshot', () => {
        expect(res.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case2] a human grants releases on the tree', () => {
    const scene = useBeforeAll(async () =>
      genScene({ org: 'ehmpathy', localRaw: null }),
    );

    when('[t0] set --quant 1', () => {
      const res = useThen('set runs', async () =>
        run({ scene, args: ['set', '--quant', '1'], human: true }),
      );

      then(
        'the render names the org level that still blocks, never "ship it"',
        () => {
          expect(res.stdout).toContain('still blocked: org');
          expect(res.stdout).toContain('git.release.uses get');
          expect(res.stdout).not.toContain('ship it');
        },
      );

      then('the grant lands in its own file, and only there', () => {
        expect(res.exitCode).toBe(0);
        const local = path.join(scene.repo, '.meter', 'git.release.uses.jsonc');
        expect(JSON.parse(fs.readFileSync(local, 'utf-8'))).toEqual({
          uses: 1,
        });
        expect(
          fs.existsSync(
            path.join(scene.repo, '.meter', 'git.commit.uses.jsonc'),
          ),
        ).toBe(false);
      });

      then('the render matches snapshot', () => {
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t1] get after the grant', () => {
      const res = useThen('get runs', async () =>
        run({ scene, args: ['get'], human: false }),
      );

      then('it shows one release left', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain('left: 1');
        expect(res.stdout).toContain('verdict: blocked by org');
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t2] allow', () => {
      const res = useThen('allow runs', async () =>
        run({ scene, args: ['allow'], human: true }),
      );

      then('the quota is unlimited', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain('releases: unlimited');
        const local = path.join(scene.repo, '.meter', 'git.release.uses.jsonc');
        expect(JSON.parse(fs.readFileSync(local, 'utf-8'))).toEqual({
          uses: 'infinite',
        });
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t3] block', () => {
      const res = useThen('block runs', async () =>
        run({ scene, args: ['block'], human: true }),
      );

      then('the quota is revoked to zero', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain('releases: revoked');
        const local = path.join(scene.repo, '.meter', 'git.release.uses.jsonc');
        expect(JSON.parse(fs.readFileSync(local, 'utf-8'))).toEqual({
          uses: 0,
        });
      });

      then('the render matches snapshot', () => {
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t4] set --quant 2, then del', () => {
      const res = useThen('del runs', async () => {
        run({ scene, args: ['set', '--quant', '2'], human: true });
        return run({ scene, args: ['del'], human: true });
      });

      then('del revokes to zero, and the render matches snapshot', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain('releases: revoked');
        const local = path.join(scene.repo, '.meter', 'git.release.uses.jsonc');
        expect(JSON.parse(fs.readFileSync(local, 'utf-8'))).toEqual({
          uses: 0,
        });
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t5] set --quant 0', () => {
      const res = useThen('set 0 runs', async () =>
        run({ scene, args: ['set', '--quant', '0'], human: true }),
      );

      then('it revokes, and the render matches snapshot', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain('releases: revoked');
        expect(res.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case2b] a directory sits at the local release meter path', () => {
    const scene = useBeforeAll(async () => {
      const fresh = genScene({ org: 'ehmpathy', localRaw: null });
      fs.mkdirSync(path.join(fresh.repo, '.meter', 'git.release.uses.jsonc'), {
        recursive: true,
      });
      return fresh;
    });

    when('[t0] a human runs set --quant 1', () => {
      const res = useThen('set runs', async () =>
        run({ scene, args: ['set', '--quant', '1'], human: true }),
      );

      then('it refuses as a malfunction, never a false grant', () => {
        expect(res.exitCode).toBe(1);
        expect(res.stdout).toContain('release quota file corrupt');
        expect(res.stdout).not.toContain('radical');
        expect(res.stdout).toContain('rm -r .meter/git.release.uses.jsonc');
        expect(res.stdout).not.toContain('git.release.uses del');
        expect(res.stderr).toContain('release quota file corrupt');
        expect(
          fs
            .statSync(path.join(scene.repo, '.meter', 'git.release.uses.jsonc'))
            .isDirectory(),
        ).toBe(true);
        expect(res.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case3] a robot tries each write form', () => {
    const scene = useBeforeAll(async () =>
      genScene({ org: 'ehmpathy', localRaw: null }),
    );
    const forms: string[][] = [
      ['set', '--quant', '1'],
      ['allow'],
      ['block'],
      ['del'],
      ['allow', '--global'],
      ['block', '--global'],
      ['allow', '--org', 'ehmpathy'],
      ['block', '--org', '@all'],
    ];

    forms.forEach((args) => {
      when(`[t0] ${args.join(' ')} with no tty`, () => {
        const res = useThen('the write runs', async () =>
          run({ scene, args, human: false }),
        );

        then('it refuses, exit 2, and writes no meter file', () => {
          expect(res.exitCode).toBe(2);
          expect(
            fs.existsSync(
              path.join(scene.repo, '.meter', 'git.release.uses.jsonc'),
            ),
          ).toBe(false);
          expect(
            fs.existsSync(path.join(scene.meterDir, 'git.release.uses.jsonc')),
          ).toBe(false);
          expect(
            fs.existsSync(
              path.join(scene.meterDir, 'git.release.uses.org.jsonc'),
            ),
          ).toBe(false);
          expect(res.stdout).toMatchSnapshot();
        });
      });
    });
  });

  given('[case4] a damaged local release quota', () => {
    const shapes: { slug: string; raw: string }[] = [
      { slug: '0-byte', raw: '' },
      { slug: 'unparseable', raw: '{ broken' },
      { slug: 'string uses', raw: '{"uses": "1"}' },
      { slug: 'negative uses', raw: '{"uses": -1}' },
    ];

    shapes.forEach((shape) => {
      when(`[t0] get on a ${shape.slug} file`, () => {
        const res = useThen('get runs', async () =>
          run({
            scene: genScene({ org: 'ehmpathy', localRaw: shape.raw }),
            args: ['get'],
            human: false,
          }),
        );

        then(
          'it refuses as a malfunction, on both streams, and names the file',
          () => {
            expect(res.exitCode).toBe(1);
            expect(res.stdout).toContain('release quota file corrupt');
            expect(res.stdout).toContain('.meter/git.release.uses.jsonc');
            expect(res.stderr).toContain('release quota file corrupt');
            expect(res.stdout).toMatchSnapshot();
          },
        );
      });
    });
  });

  given('[case5] the global release blocker', () => {
    const scene = useBeforeAll(async () =>
      genScene({ org: 'ehmpathy', localRaw: null }),
    );

    when('[t0] a human blocks releases globally', () => {
      const res = useThen('block --global runs', async () =>
        run({ scene, args: ['block', '--global'], human: true }),
      );

      then(
        'the blocker lands in the release file, never the commit file',
        () => {
          expect(res.exitCode).toBe(0);
          expect(res.stdout).toContain('releases blocked globally');
          expect(
            JSON.parse(
              fs.readFileSync(
                path.join(scene.meterDir, 'git.release.uses.jsonc'),
                'utf-8',
              ),
            ),
          ).toEqual({
            blocked: true,
          });
          expect(
            fs.existsSync(path.join(scene.meterDir, 'git.commit.uses.jsonc')),
          ).toBe(false);
        },
      );

      then('the render matches snapshot', () => {
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t1] get reads it', () => {
      const res = useThen('get runs', async () =>
        run({ scene, args: ['get'], human: false }),
      );

      then('global reads blocked', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain('global: blocked');
        expect(res.stdout).not.toContain('file corrupt');
      });

      then('the render matches snapshot', () => {
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t1b] get --global reads the global level alone', () => {
      const res = useThen('get --global runs', async () =>
        run({ scene, args: ['get', '--global'], human: false }),
      );

      then('it renders the release tree, blocked, never the commit one', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain('git.release.uses get --global');
        expect(res.stdout).not.toContain('git.commit.uses');
        expect(res.stdout).not.toContain('file corrupt');
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t2] a human lifts it', () => {
      const res = useThen('allow --global runs', async () =>
        run({ scene, args: ['allow', '--global'], human: true }),
      );

      then('the release blocker is gone', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain('releases resumed globally');
        expect(
          fs.existsSync(path.join(scene.meterDir, 'git.release.uses.jsonc')),
        ).toBe(false);
      });

      then('the render matches snapshot', () => {
        expect(res.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case6] a damaged global release blocker', () => {
    const scene = useBeforeAll(async () => {
      const fresh = genScene({ org: 'ehmpathy', localRaw: '{"uses": 1}' });
      fs.mkdirSync(fresh.meterDir, { recursive: true });
      fs.writeFileSync(path.join(fresh.meterDir, 'git.release.uses.jsonc'), '');
      return fresh;
    });

    when('[t0] get reads it', () => {
      const res = useThen('get runs', async () =>
        run({ scene, args: ['get'], human: false }),
      );

      then('it fails closed and names the release file', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain('global: blocked (file corrupt)');
        expect(res.stdout).toContain('git.release.uses.jsonc');
        expect(res.stdout).toContain('every release is blocked');
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t1] get --global reads it', () => {
      const res = useThen('get --global runs', async () =>
        run({ scene, args: ['get', '--global'], human: false }),
      );

      then('it fails closed and names the release file', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain('git.release.uses get --global');
        expect(res.stdout).toContain('git.release.uses.jsonc');
        expect(res.stdout).not.toContain('git.commit.uses.jsonc');
        expect(res.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case6b] a directory sits at the global release blocker path', () => {
    const scene = useBeforeAll(async () => {
      const fresh = genScene({ org: 'ehmpathy', localRaw: null });
      fs.mkdirSync(path.join(fresh.meterDir, 'git.release.uses.jsonc'), {
        recursive: true,
      });
      return fresh;
    });

    when('[t0] a human lifts the global blocker', () => {
      const res = useThen('allow --global runs', async () =>
        run({ scene, args: ['allow', '--global'], human: true }),
      );

      then('it refuses as a malfunction and names the release path', () => {
        expect(res.exitCode).toBe(1);
        expect(res.stdout).toContain('MalfunctionError');
        expect(res.stderr).toContain('MalfunctionError');
        expect(res.stdout).toContain('git.release.uses allow --global');
        expect(res.stdout).toContain('git.release.uses.jsonc');
        expect(res.stdout).toContain('releases stay blocked');
        expect(
          fs
            .statSync(path.join(scene.meterDir, 'git.release.uses.jsonc'))
            .isDirectory(),
        ).toBe(true);
        expect(res.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case7] the org release permission', () => {
    const scene = useBeforeAll(async () =>
      genScene({ org: 'ehmpathy', localRaw: null }),
    );

    when('[t0] a human allows releases for the org', () => {
      const res = useThen('allow --org runs', async () =>
        run({ scene, args: ['allow', '--org', 'ehmpathy'], human: true }),
      );

      then(
        'the org grant lands in the release org file, never the commit one',
        () => {
          expect(res.exitCode).toBe(0);
          expect(
            JSON.parse(
              fs.readFileSync(
                path.join(scene.meterDir, 'git.release.uses.org.jsonc'),
                'utf-8',
              ),
            ),
          ).toEqual({ orgs: { ehmpathy: 'allowed' } });
          expect(
            fs.existsSync(
              path.join(scene.meterDir, 'git.commit.uses.org.jsonc'),
            ),
          ).toBe(false);
        },
      );

      then('the grant names no commit sponsor nudge', () => {
        expect(res.stdout).not.toContain('sponsor');
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t1] get reads it', () => {
      const res = useThen('get runs', async () =>
        run({ scene, args: ['get'], human: false }),
      );

      then('org reads allowed', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain('org: allowed');
        expect(res.stdout).toContain('verdict: blocked by local');
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t1b] a human stamps the tree, then get reads it', () => {
      const res = useThen('set, then get run', async () => {
        await run({ scene, args: ['set', '--quant', '1'], human: true });
        const got = await run({ scene, args: ['get'], human: false });

        // restore the unset tree the later cases read
        fs.rmSync(path.join(scene.repo, '.meter', 'git.release.uses.jsonc'));
        return got;
      });

      then('every level allows, so the verdict reads can ship now', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain('verdict: can ship now');
      });
    });

    when('[t2] get --org reads the org level alone', () => {
      const res = useThen('get --org runs', async () =>
        run({ scene, args: ['get', '--org'], human: false }),
      );

      then('it names the org grant, and the render matches snapshot', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain('ehmpathy');
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t3] a human blocks releases for the org', () => {
      const res = useThen('block --org runs', async () =>
        run({ scene, args: ['block', '--org', 'ehmpathy'], human: true }),
      );

      then(
        'the block lands in the release org file, never the commit one',
        () => {
          expect(res.exitCode).toBe(0);
          expect(
            JSON.parse(
              fs.readFileSync(
                path.join(scene.meterDir, 'git.release.uses.org.jsonc'),
                'utf-8',
              ),
            ),
          ).toEqual({ orgs: { ehmpathy: 'blocked' } });
          expect(
            fs.existsSync(
              path.join(scene.meterDir, 'git.commit.uses.org.jsonc'),
            ),
          ).toBe(false);
          expect(res.stdout).toMatchSnapshot();
        },
      );
    });

    when('[t4] get reads the block', () => {
      const res = useThen('get runs', async () =>
        run({ scene, args: ['get'], human: false }),
      );

      then('org reads blocked', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain('org: blocked');
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t5] a human removes the org entry', () => {
      const res = useThen('del --org runs', async () =>
        run({ scene, args: ['del', '--org', 'ehmpathy'], human: true }),
      );

      then(
        'the entry leaves the release org file, and the render snaps',
        () => {
          expect(res.exitCode).toBe(0);
          expect(res.stdout).toContain('git.release.uses del --org ehmpathy');
          expect(
            JSON.parse(
              fs.readFileSync(
                path.join(scene.meterDir, 'git.release.uses.org.jsonc'),
                'utf-8',
              ),
            ).orgs,
          ).not.toHaveProperty('ehmpathy');
          expect(
            fs.existsSync(
              path.join(scene.meterDir, 'git.commit.uses.org.jsonc'),
            ),
          ).toBe(false);
          expect(res.stdout).toMatchSnapshot();
        },
      );
    });

    when('[t6] a human tries to remove @all', () => {
      const res = useThen('del --org @all runs', async () =>
        run({ scene, args: ['del', '--org', '@all'], human: true }),
      );

      then('it refuses as a constraint on both streams', () => {
        expect(res.exitCode).toBe(2);
        expect(res.stdout).toContain('ConstraintError');
        expect(res.stderr).toContain('ConstraintError');
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t7] a human allows releases for @all', () => {
      const res = useThen('allow --org @all runs', async () =>
        run({ scene, args: ['allow', '--org', '@all'], human: true }),
      );

      then('@all lands in the release org file, never the commit one', () => {
        expect(res.exitCode).toBe(0);
        expect(
          JSON.parse(
            fs.readFileSync(
              path.join(scene.meterDir, 'git.release.uses.org.jsonc'),
              'utf-8',
            ),
          ).orgs['@all'],
        ).toEqual('allowed');
        expect(
          fs.existsSync(path.join(scene.meterDir, 'git.commit.uses.org.jsonc')),
        ).toBe(false);
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t8] a human blocks releases for @all', () => {
      const res = useThen('block --org @all runs', async () =>
        run({ scene, args: ['block', '--org', '@all'], human: true }),
      );

      then('@all reads blocked in the release org file', () => {
        expect(res.exitCode).toBe(0);
        expect(
          JSON.parse(
            fs.readFileSync(
              path.join(scene.meterDir, 'git.release.uses.org.jsonc'),
              'utf-8',
            ),
          ).orgs['@all'],
        ).toEqual('blocked');
        expect(
          fs.existsSync(path.join(scene.meterDir, 'git.commit.uses.org.jsonc')),
        ).toBe(false);
        expect(res.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case7b] a damaged release org file', () => {
    const scene = useBeforeAll(async () => {
      const fresh = genScene({ org: 'ehmpathy', localRaw: '{"uses": 1}' });
      fs.mkdirSync(fresh.meterDir, { recursive: true });
      fs.writeFileSync(
        path.join(fresh.meterDir, 'git.release.uses.org.jsonc'),
        '{ broken',
      );
      return fresh;
    });

    when('[t0] get reads it', () => {
      const res = useThen('get runs', async () =>
        run({ scene, args: ['get'], human: false }),
      );

      then('org fails closed and names the release org file', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain('org: blocked');
        expect(res.stdout).toContain('git.release.uses.org.jsonc');
        expect(res.stdout).not.toContain('git.commit.uses.org.jsonc');
        expect(res.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case8] a human types a commit-meter field', () => {
    const scene = useBeforeAll(async () =>
      genScene({ org: 'ehmpathy', localRaw: null }),
    );

    when('[t0] set --quant 1 --push allow', () => {
      const res = useThen('set runs', async () =>
        run({
          scene,
          args: ['set', '--quant', '1', '--push', 'allow'],
          human: true,
        }),
      );

      then('it refuses and names the commit meter', () => {
        expect(res.exitCode).toBe(2);
        expect(res.stdout).toContain('--push is not a release field');
        expect(res.stdout).toContain('git.commit.uses set --quant N');
        expect(res.stdout).toMatchSnapshot();
        expect(
          fs.existsSync(
            path.join(scene.repo, '.meter', 'git.release.uses.jsonc'),
          ),
        ).toBe(false);
      });
    });

    when('[t1] set --quant 1 --stage allow', () => {
      const res = useThen('set runs', async () =>
        run({
          scene,
          args: ['set', '--quant', '1', '--stage', 'allow'],
          human: true,
        }),
      );

      then('it refuses and names the commit meter', () => {
        expect(res.exitCode).toBe(2);
        expect(res.stdout).toContain('--stage is not a release field');
        expect(res.stdout).toContain('git.commit.uses set --quant N');
        expect(res.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case8b] a human types a malformed command', () => {
    const scene = useBeforeAll(async () =>
      genScene({ org: 'ehmpathy', localRaw: null }),
    );

    const MALFORMED = [
      {
        slug: 'an unknown option',
        args: ['get', '--reef'],
        headline: 'ConstraintError: unknown option: --reef',
      },
      {
        slug: 'no command',
        args: [],
        headline: 'ConstraintError: command required',
      },
      {
        slug: 'set with no --quant',
        args: ['set'],
        headline: 'ConstraintError: --quant N is required',
      },
      {
        slug: 'set with a bogus --quant',
        args: ['set', '--quant', 'lots'],
        headline:
          "ConstraintError: --quant must be a non-negative integer or 'infinite'",
      },
    ];

    MALFORMED.forEach((form, index) => {
      when(`[t${index}] ${form.slug}`, () => {
        const res = useThen('the command runs', async () =>
          run({ scene, args: form.args, human: true }),
        );

        then(
          'it refuses on both streams with exit 2, and writes no stamp',
          () => {
            expect(res.exitCode).toBe(2);
            expect(res.stdout).toContain(form.headline);
            expect(res.stderr).toContain(form.headline);
            expect(
              fs.existsSync(
                path.join(scene.repo, '.meter', 'git.release.uses.jsonc'),
              ),
            ).toBe(false);
          },
        );

        then('the render matches snapshot', () => {
          expect(res.stdout).toMatchSnapshot();
        });
      });
    });
  });

  given('[case8c] a tree with no keyrack.yml to name its org', () => {
    const scene = useBeforeAll(async () =>
      genScene({ org: null, localRaw: '{"uses": 1}' }),
    );

    when('[t0] get reads the org level', () => {
      const res = useThen('get runs', async () =>
        run({ scene, args: ['get'], human: false }),
      );

      then('org reads blocked, and names the absent keyrack.yml', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain('org: blocked');
        expect(res.stdout).toContain('keyrack.yml not found');
      });

      then('the render matches snapshot', () => {
        expect(res.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case9] any actor asks for help', () => {
    const scene = useBeforeAll(async () =>
      genScene({ org: 'ehmpathy', localRaw: null }),
    );

    when('[t0] --help', () => {
      const res = useThen('help runs', async () =>
        run({ scene, args: ['--help'], human: false }),
      );

      then('it names usage, inputs, and examples, exit 0', () => {
        expect(res.exitCode).toBe(0);
        expect(res.stdout).toContain('usage:');
        expect(res.stdout).toContain('--quant N');
        expect(res.stdout).toContain('examples:');
        expect(res.stdout).toContain(
          'git.commit.uses allow && git.release.uses block',
        );
      });

      then('the render matches snapshot', () => {
        expect(res.stdout).toMatchSnapshot();
      });
    });
  });
});
