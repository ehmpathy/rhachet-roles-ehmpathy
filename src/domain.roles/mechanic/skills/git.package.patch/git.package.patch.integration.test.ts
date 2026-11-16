import { spawnSync } from 'child_process';
import * as fs from 'fs';
import { MalfunctionError } from 'helpful-errors';
import * as os from 'os';
import * as path from 'path';
import {
  genTempDir,
  given,
  then,
  useBeforeAll,
  useThen,
  useWhen,
  when,
} from 'test-fns';

/**
 * .what = integration tests for git.package.patch (begin + commit)
 * .why = the verb is pre-approved, so its bounds must hold for real: a patch
 *        lands in the tree with its note, a path outside the tree is refused,
 *        and an absent --why or --upstream is refused. real pnpm, no mocks.
 */
describe('git.package.patch.sh', () => {
  const scriptPath = path.join(__dirname, 'git.package.patch.sh');
  const UPSTREAM = 'https://github.com/jonschlinkert/is-number/issues/42';
  const WHY =
    'reef fix: treat a numeric string with whitespace as not a number';

  /**
   * .what = install this repo's pinned pnpm into a temp tools dir
   * .why = the verb runs real pnpm, and a ci test job has node but no pnpm on
   *        PATH; the suite provisions its own (rule.forbid.bare-host-deps),
   *        via the npm that ships beside this node binary
   */
  const genPnpmToolsBinDir = (): string => {
    const repoPackageJson = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, '../../../../../package.json'),
        'utf-8',
      ),
    ) as { packageManager: string };
    const pnpmSpec = repoPackageJson.packageManager.split('+')[0]!;
    const toolsDir = genTempDir({ slug: 'git-package-patch-pnpm-tools' });
    const npmPath = path.join(path.dirname(process.execPath), 'npm');
    const install = spawnSync(
      npmPath,
      ['install', '--prefix', toolsDir, pnpmSpec, '--no-audit', '--no-fund'],
      { cwd: toolsDir, encoding: 'utf-8', timeout: 180_000 },
    );
    if (install.status !== 0)
      throw new MalfunctionError('could not provision pnpm for the suite', {
        pnpmSpec,
        npmPath,
        error: install.error?.message ?? null,
        stdout: install.stdout ?? null,
        stderr: install.stderr ?? null,
        hint: 'check that the npm registry is reachable from this host',
      });
    return path.join(toolsDir, 'node_modules', '.bin');
  };
  const tools = useBeforeAll(async () => ({ binDir: genPnpmToolsBinDir() }));

  /**
   * .what = run the skill in a dir, with an optional env override
   */
  const runSkill = (input: {
    cwd: string;
    args: string[];
    env?: Record<string, string>;
    stdin?: string;
  }): { stdout: string; stderr: string; exitCode: number } => {
    const result = spawnSync('bash', [scriptPath, ...input.args], {
      cwd: input.cwd,
      encoding: 'utf-8',
      input: input.stdin ?? '',
      env: {
        ...process.env,
        PATH: `${tools.binDir}${path.delimiter}${process.env.PATH ?? ''}`,
        ...input.env,
      },
      timeout: 180_000,
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  /**
   * .what = strip the parts of output that vary per run (temp paths, dates)
   */
  const asStableOutput = (input: { stdout: string; dir: string }): string =>
    input.stdout
      .split(fs.realpathSync(input.dir))
      .join('<repo>')
      .split(input.dir)
      .join('<repo>')
      .split(fs.realpathSync(os.tmpdir()))
      .join('<tmp>')
      .split(os.tmpdir())
      .join('<tmp>')
      .replace(/reef-outside-[A-Za-z0-9]+/g, 'reef-outside-<rand>')
      // a sealed patch relinks the store dir as `<name>@<version>_patch_hash=<hex>`; whether a
      // prior step sealed one depends on which cases a scope ran, so the suffix is dropped
      .replace(/_patch_hash=[0-9a-f]+/g, '')
      .replace(/\d{4}-\d{2}-\d{2}/g, '<date>');

  /**
   * .what = snap a result's stdout, with the per-run parts masked
   */
  const expectStableSnapshot = (input: {
    result: { stdout: string };
    dir: string;
  }): void => {
    expect(
      asStableOutput({ stdout: input.result.stdout, dir: input.dir }),
    ).toMatchSnapshot();
  };

  /**
   * .what = mask the verbatim pnpm block under a malfunction's "detail" branch
   * .why  = pnpm's own words vary by version and host; the render around
   *         them is the contract, so the full render is snapped with the
   *         pnpm lines folded into one stable marker
   */
  const asMaskedPnpmDetail = (input: { stdout: string }): string => {
    const lines = input.stdout.split('\n');
    const at = lines.findIndex((line) => line.endsWith('└─ detail'));
    if (at < 0) return input.stdout;
    const tail = lines.slice(at + 1);
    const rest = tail.filter((line) => !line.startsWith('         '));
    return [
      ...lines.slice(0, at + 1),
      '         <verbatim detail>',
      ...rest,
    ].join('\n');
  };

  /**
   * .what = a temp git repo whose tree holds an on-disk is-number@7.0.0,
   *         with no pnpm install
   * .why  = the gates before pnpm read only the package.json files on disk
   */
  const genOnDiskRepo = (input: { slug: string }): string => {
    const tempDir = genTempDir({ slug: input.slug, git: true });
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'reef-fixture', version: '1.0.0', private: true }),
    );
    const pkgDir = path.join(tempDir, 'node_modules', 'is-number');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({ name: 'is-number', version: '7.0.0' }),
    );
    return tempDir;
  };

  /**
   * .what = a temp pnpm repo with the given deps installed for real
   */
  const genPnpmRepo = (input: {
    slug: string;
    dependencies: Record<string, string>;
  }): string => {
    const tempDir = genTempDir({ slug: input.slug, git: true });
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(
        {
          name: 'reef-fixture',
          version: '1.0.0',
          private: true,
          dependencies: input.dependencies,
        },
        null,
        2,
      ),
    );
    const install = spawnSync(
      path.join(tools.binDir, 'pnpm'),
      ['install', '--config.confirmModulesPurge=false'],
      { cwd: tempDir, encoding: 'utf-8', timeout: 180_000 },
    );
    if (install.status !== 0)
      throw new MalfunctionError('fixture pnpm install failed', {
        slug: input.slug,
        error: install.error?.message ?? null,
        stdout: install.stdout ?? null,
        stderr: install.stderr ?? null,
        hint: 'check that the npm registry is reachable from this host',
      });
    return tempDir;
  };

  const EDIT_DIR_REL = 'node_modules/.pnpm_patches/is-number@7.0.0';
  const PATCH_REL = 'patches/is-number@7.0.0.patch';
  const NOTE_REL = 'patches/is-number@7.0.0.patch.note.md';
  const EDIT_DIR_V6_REL = 'node_modules/.pnpm_patches/is-number@6.0.0';
  const PATCH_V6_REL = 'patches/is-number@6.0.0.patch';

  /**
   * .what = edit the opened copy of is-number so there is a diff to seal
   */
  const editIsNumber = (input: { dir: string }): void => {
    const file = path.join(input.dir, EDIT_DIR_REL, 'index.js');
    fs.writeFileSync(
      file,
      `${fs.readFileSync(file, 'utf-8')}\n// reef patch: local fix\n`,
    );
  };

  given('[case1] a pnpm repo with one installed version of is-number', () => {
    const scene = useBeforeAll(async () => ({
      dir: genPnpmRepo({
        slug: 'git-package-patch-journey',
        dependencies: { 'is-number': '7.0.0' },
      }),
    }));

    when('[t0] begin runs in plan mode', () => {
      then('it previews the edit dir and changes naught', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['begin', '--package', 'is-number'],
        });
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).toContain(`would open edit dir: ${EDIT_DIR_REL}`);
        // the plan names the edit dir once, on its would line
        expect(result.stdout).not.toContain('├─ edit dir: ');
        expect(fs.existsSync(path.join(scene.dir, EDIT_DIR_REL))).toEqual(
          false,
        );
        expect(
          asStableOutput({ stdout: result.stdout, dir: scene.dir }),
        ).toMatchSnapshot();
      });
    });

    when(
      '[t0.1] commit runs before any begin, for a never-sealed package',
      () => {
        then(
          'it is refused as no open edit dir, exit 2, and names begin',
          () => {
            const result = runSkill({
              cwd: scene.dir,
              args: [
                'commit',
                '--package',
                'is-number',
                '--why',
                WHY,
                '--upstream',
                UPSTREAM,
                '--mode',
                'apply',
              ],
            });
            expect(result.exitCode).toEqual(2);
            expect(result.stdout).toContain(
              `✋ ConstraintError: no open edit dir at ${EDIT_DIR_REL}`,
            );
            expect(result.stdout).toContain(
              'rhx git.package.patch begin --package is-number@7.0.0 --mode apply',
            );
            expect(fs.existsSync(path.join(scene.dir, PATCH_REL))).toEqual(
              false,
            );
            expectStableSnapshot({ result, dir: scene.dir });
          },
        );
      },
    );

    when('[t1] begin runs in apply mode', () => {
      then('it opens the edit dir inside the tree', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['begin', '--package', 'is-number', '--mode', 'apply'],
        });
        expect(result.exitCode).toEqual(0);
        expect(
          fs.existsSync(path.join(scene.dir, EDIT_DIR_REL, 'package.json')),
        ).toEqual(true);
        // the seal hint is paste-ready: it seals, not a plan that changes naught
        expect(result.stdout).toContain(
          "rhx git.package.patch commit --package is-number@7.0.0 --why '<why>' --upstream '<issue-url>' --mode apply",
        );
        expect(
          asStableOutput({ stdout: result.stdout, dir: scene.dir }),
        ).toMatchSnapshot();
      });
    });

    when('[t2] begin runs in apply mode again', () => {
      then('it reuses the open dir and leaves edits untouched', () => {
        editIsNumber({ dir: scene.dir });
        const result = runSkill({
          cwd: scene.dir,
          args: ['begin', '--package', 'is-number', '--mode', 'apply'],
        });
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).toContain('already open, reused');
        expect(
          fs.readFileSync(
            path.join(scene.dir, EDIT_DIR_REL, 'index.js'),
            'utf-8',
          ),
        ).toContain('reef patch: local fix');
        expect(
          asStableOutput({ stdout: result.stdout, dir: scene.dir }),
        ).toMatchSnapshot();
      });
    });

    when('[t3] commit runs in plan mode', () => {
      const result = useThen('it exits 0', async () =>
        runSkill({
          cwd: scene.dir,
          args: [
            'commit',
            '--package',
            'is-number',
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
          ],
        }),
      );

      then('it previews the patch + note and writes naught', () => {
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).toContain(`would write patch: ${PATCH_REL}`);
        expect(fs.existsSync(path.join(scene.dir, PATCH_REL))).toEqual(false);
        expectStableSnapshot({ result, dir: scene.dir });
      });

      then(
        'its rerun hint carries the given why and upstream, so the seal is one paste',
        () => {
          expect(result.stdout).toContain(
            `rhx git.package.patch commit --package is-number@7.0.0 --why '${WHY}' --upstream ${UPSTREAM} --mode apply`,
          );
          expect(result.stdout).not.toContain("'<why>'");
        },
      );
    });

    when(
      '[t3.1] commit runs in plan mode with a why that holds a quote',
      () => {
        then('the why stays one pasteable arg', () => {
          const result = runSkill({
            cwd: scene.dir,
            args: [
              'commit',
              '--package',
              'is-number',
              '--why',
              "the reef's fix",
              '--upstream',
              UPSTREAM,
            ],
          });
          expect(result.exitCode).toEqual(0);
          expect(result.stdout).toContain(
            String.raw`--why the\ reef\'s\ fix --upstream`,
          );
          expectStableSnapshot({ result, dir: scene.dir });
        });
      },
    );

    when('[t4] commit runs in apply mode', () => {
      const result = useBeforeAll(async () =>
        runSkill({
          cwd: scene.dir,
          args: [
            'commit',
            '--package',
            'is-number',
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
            '--mode',
            'apply',
          ],
        }),
      );

      then('it exits 0', () => {
        expect(result.exitCode).toEqual(0);
      });

      then('the patch lands in the tree with the edit', () => {
        const patch = fs.readFileSync(path.join(scene.dir, PATCH_REL), 'utf-8');
        expect(patch).toContain('reef patch: local fix');
      });

      then('the note records who, when, why, upstream', () => {
        const note = fs.readFileSync(path.join(scene.dir, NOTE_REL), 'utf-8');
        expect(note).toContain('# local patch: is-number@7.0.0');
        expect(note).toMatch(/- who: .+ <.+@.+>/);
        expect(note).toMatch(/- when: \d{4}-\d{2}-\d{2}/);
        expect(note).toContain(`- why: ${WHY}`);
        expect(note).toContain(`- upstream: ${UPSTREAM}`);
      });

      then(
        'the note says to drop the entry before the upgrade, not after',
        () => {
          const note = fs.readFileSync(path.join(scene.dir, NOTE_REL), 'utf-8');
          expect(note).toContain('first drop its patchedDependencies');
          expect(note.indexOf('first drop')).toBeLessThan(
            note.indexOf('then upgrade past it'),
          );
          expect(
            note
              .replace(/\d{4}-\d{2}-\d{2}/g, '<date>')
              .replace(/- who: .+/, '- who: <who>'),
          ).toMatchSnapshot();
        },
      );

      then('the patch is recorded as a patched dependency', () => {
        const pkg = fs.readFileSync(
          path.join(scene.dir, 'package.json'),
          'utf-8',
        );
        const workspace = fs.existsSync(
          path.join(scene.dir, 'pnpm-workspace.yaml'),
        )
          ? fs.readFileSync(
              path.join(scene.dir, 'pnpm-workspace.yaml'),
              'utf-8',
            )
          : '';
        expect(`${pkg}\n${workspace}`).toContain(PATCH_REL);
      });

      then('the output names the manifest that holds the entry', () => {
        expect(result.stdout).toMatch(
          /entry: patchedDependencies\[is-number@7\.0\.0\] in (package\.json|pnpm-workspace\.yaml)/,
        );
      });

      then(
        'the output names every file the seal changed, lockfile included',
        () => {
          expect(result.stdout).toContain('changed, stage all of these');
          expect(result.stdout).toContain(PATCH_REL);
          expect(result.stdout).toContain(NOTE_REL);
          expect(result.stdout).toContain('pnpm-lock.yaml');
        },
      );

      then('the lockfile records the patch, so a frozen install agrees', () => {
        const lock = fs.readFileSync(
          path.join(scene.dir, 'pnpm-lock.yaml'),
          'utf-8',
        );
        expect(lock).toContain('patchedDependencies');
        expect(lock).toContain(PATCH_REL);
      });

      then('the edit dir is removed', () => {
        expect(fs.existsSync(path.join(scene.dir, EDIT_DIR_REL))).toEqual(
          false,
        );
      });

      then('the output matches snapshot', () => {
        expect(
          asStableOutput({ stdout: result.stdout, dir: scene.dir }),
        ).toMatchSnapshot();
      });
    });

    when('[t5] commit reruns with the same note', () => {
      then('it is a no-op', () => {
        const before = fs.readFileSync(
          path.join(scene.dir, PATCH_REL),
          'utf-8',
        );
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'commit',
            '--package',
            'is-number',
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
            '--mode',
            'apply',
          ],
        });
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).toContain('already sealed with this note');
        expect(
          fs.readFileSync(path.join(scene.dir, PATCH_REL), 'utf-8'),
        ).toEqual(before);
        expect(
          asStableOutput({ stdout: result.stdout, dir: scene.dir }),
        ).toMatchSnapshot();
      });
    });

    when(
      '[t5.1] commit reruns with the same why piped via --why @stdin',
      () => {
        then('it reads the why from stdin, and is a no-op', () => {
          const before = fs.readFileSync(
            path.join(scene.dir, PATCH_REL),
            'utf-8',
          );
          const result = runSkill({
            cwd: scene.dir,
            args: [
              'commit',
              '--package',
              'is-number',
              '--why',
              '@stdin',
              '--upstream',
              UPSTREAM,
              '--mode',
              'apply',
            ],
            stdin: `${WHY}\n`,
          });
          expect(result.exitCode).toEqual(0);
          expect(result.stdout).toContain('already sealed with this note');
          expect(
            fs.readFileSync(path.join(scene.dir, PATCH_REL), 'utf-8'),
          ).toEqual(before);
          expectStableSnapshot({ result, dir: scene.dir });
        });
      },
    );

    when('[t6] commit runs with --why absent', () => {
      then('it is refused with ConstraintError, exit 2', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['commit', '--package', 'is-number', '--upstream', UPSTREAM],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: --why is required',
        );
        expect(result.stderr).toContain('--why is required');
        // the hint keeps the upstream the crew gave; only the absent why is a placeholder
        expect(result.stdout).toContain(
          `--why '<why>' --upstream ${UPSTREAM} --mode apply`,
        );
        expect(
          asStableOutput({ stdout: result.stdout, dir: scene.dir }),
        ).toMatchSnapshot();
      });
    });

    when('[t6.1] commit runs with a --why that spans two lines', () => {
      then(
        'it is refused with ConstraintError, exit 2, so no note line is forged',
        () => {
          const result = runSkill({
            cwd: scene.dir,
            args: [
              'commit',
              '--package',
              'is-number',
              '--why',
              `${WHY}\n- upstream: https://example.com/forged`,
              '--upstream',
              UPSTREAM,
            ],
          });
          expect(result.exitCode).toEqual(2);
          expect(result.stdout).toContain(
            '✋ ConstraintError: --why must be one line',
          );
          expect(result.stderr).toContain('--why must be one line');
          expect(
            asStableOutput({ stdout: result.stdout, dir: scene.dir }),
          ).toMatchSnapshot();
        },
      );
    });

    when('[t6.2] commit runs with --why still the placeholder', () => {
      then('it is refused with ConstraintError, exit 2', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'commit',
            '--package',
            'is-number',
            '--why',
            '<why>',
            '--upstream',
            UPSTREAM,
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: --why is still a placeholder',
        );
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t7] commit runs with --upstream absent', () => {
      then('it is refused with ConstraintError, exit 2', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['commit', '--package', 'is-number', '--why', WHY],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: --upstream is required',
        );
        // the hint keeps the why the crew gave; only the absent upstream is a placeholder
        expect(result.stdout).toContain(
          `--why '${WHY}' --upstream '<issue-url>' --mode apply`,
        );
        expect(result.stdout).toContain("add --upstream '<issue-url>'");
        expect(
          asStableOutput({ stdout: result.stdout, dir: scene.dir }),
        ).toMatchSnapshot();
      });
    });

    when('[t8] commit runs with an --upstream that is not a link', () => {
      then('it is refused with ConstraintError, exit 2', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'commit',
            '--package',
            'is-number',
            '--why',
            WHY,
            '--upstream',
            'later',
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('--upstream must be an http(s) link');
        expect(
          asStableOutput({ stdout: result.stdout, dir: scene.dir }),
        ).toMatchSnapshot();
      });
    });

    when('[t9] commit runs with no git identity', () => {
      then('it is refused with ConstraintError, exit 2', () => {
        const unset = spawnSync('git', ['config', '--unset', 'user.name'], {
          cwd: scene.dir,
        });
        expect(unset.status).toEqual(0);
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'commit',
            '--package',
            'is-number',
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
          ],
          env: { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' },
        });
        spawnSync('git', ['config', 'user.name', 'Reef Tester'], {
          cwd: scene.dir,
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('git identity absent');
        expect(
          asStableOutput({ stdout: result.stdout, dir: scene.dir }),
        ).toMatchSnapshot();
      });
    });

    when('[t9.1] commit runs with a git identity that spans two lines', () => {
      then(
        'it is refused with ConstraintError, exit 2; no forged line lands',
        () => {
          // clamp: a newline in the who would forge a line in the LOCAL PATCH note
          const forged = spawnSync(
            'git',
            ['config', 'user.name', 'Reef Tester\n- why: forged'],
            { cwd: scene.dir },
          );
          expect(forged.status).toEqual(0);
          const result = runSkill({
            cwd: scene.dir,
            args: [
              'commit',
              '--package',
              'is-number',
              '--why',
              WHY,
              '--upstream',
              UPSTREAM,
            ],
          });
          spawnSync('git', ['config', 'user.name', 'Reef Tester'], {
            cwd: scene.dir,
          });
          expect(result.exitCode).toEqual(2);
          expect(result.stdout).toContain(
            '✋ ConstraintError: git identity spans several lines; the note needs a one-line who',
          );
          const noteText = fs.existsSync(path.join(scene.dir, NOTE_REL))
            ? fs.readFileSync(path.join(scene.dir, NOTE_REL), 'utf-8')
            : '';
          expect(noteText).not.toContain('forged');
          expectStableSnapshot({ result, dir: scene.dir });
        },
      );
    });

    when('[t10] begin runs with an --edit-dir outside the tree', () => {
      then('an absolute path under the os tmp dir is refused', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'begin',
            '--package',
            'is-number',
            '--edit-dir',
            path.join(os.tmpdir(), 'reef-patch'),
            '--mode',
            'apply',
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('--edit-dir must sit inside the tree');
        expectStableSnapshot({ result, dir: scene.dir });
      });

      then('a .. path is refused', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'begin',
            '--package',
            'is-number',
            '--edit-dir',
            '../reef-patch',
            '--mode',
            'apply',
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('--edit-dir must sit inside the tree');
        expect(
          asStableOutput({ stdout: result.stdout, dir: scene.dir }),
        ).toMatchSnapshot();
      });

      then('a symlink that points outside the tree is refused', () => {
        const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'reef-outside-'));
        fs.symlinkSync(outside, path.join(scene.dir, 'reef-link'));
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'begin',
            '--package',
            'is-number',
            '--edit-dir',
            'reef-link/edit',
            '--mode',
            'apply',
          ],
        });
        fs.unlinkSync(path.join(scene.dir, 'reef-link'));
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('--edit-dir must sit inside the tree');
        expect(fs.readdirSync(outside)).toEqual([]);
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t11] commit runs with an --edit-dir outside the tree', () => {
      then('it is refused with ConstraintError, exit 2', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'commit',
            '--package',
            'is-number',
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
            '--edit-dir',
            os.tmpdir(),
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('--edit-dir must sit inside the tree');
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t12] a global flag is passed', () => {
      then('begin refuses -g', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['begin', '--package', 'is-number', '-g'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('unknown flag -g');
        expect(result.stdout).toContain(
          '└─ rhx git.package.patch begin --package is-number --mode apply',
        );
        expect(
          asStableOutput({ stdout: result.stdout, dir: scene.dir }),
        ).toMatchSnapshot();
      });

      then(
        'begin refuses -g given before --package, and its hint still names the package',
        () => {
          const result = runSkill({
            cwd: scene.dir,
            args: ['begin', '-g', '--package', 'is-number', '--mode', 'apply'],
          });
          expect(result.exitCode).toEqual(2);
          expect(result.stdout).toContain('unknown flag -g');
          expect(result.stdout).toContain(
            '└─ rhx git.package.patch begin --package is-number --mode apply',
          );
        },
      );

      then('commit refuses -g', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'commit',
            '--package',
            'is-number',
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
            '-g',
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('unknown flag -g');
        expect(result.stdout).toContain(
          `--package is-number --why '${WHY}' --upstream ${UPSTREAM} --mode apply`,
        );
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t13] begin names a package that is not installed', () => {
      then('it is refused and names set.package.install', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['begin', '--package', 'is-odd'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('is-odd is not installed');
        expect(result.stdout).toContain('rhx set.package.install');
        expectStableSnapshot({ result, dir: scene.dir });
      });

      then('commit refuses it the same way', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'commit',
            '--package',
            'is-odd',
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('is-odd is not installed');
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when(
      '[t13.5] begin names a package the manifest declares, in a tree not yet installed',
      () => {
        const fresh = useBeforeAll(async () => {
          const dir = genOnDiskRepo({ slug: 'git-package-patch-fresh-tree' });
          fs.writeFileSync(
            path.join(dir, 'package.json'),
            JSON.stringify({
              name: 'reef-fixture',
              version: '1.0.0',
              private: true,
              dependencies: { 'is-odd': '3.0.1' },
            }),
          );
          return { dir };
        });

        then(
          'it is refused and names pnpm install, not a new dependency',
          () => {
            const result = runSkill({
              cwd: fresh.dir,
              args: ['begin', '--package', 'is-odd'],
            });
            expect(result.exitCode).toEqual(2);
            expect(result.stdout).toContain('is-odd is not installed');
            expect(result.stdout).toContain('pnpm install');
            expect(result.stdout).not.toContain('rhx set.package.install');
            expectStableSnapshot({ result, dir: fresh.dir });
          },
        );
      },
    );

    when(
      '[t13.6] a bare name, with a stable and a newer prerelease installed',
      () => {
        const beta = useBeforeAll(async () => {
          const dir = genOnDiskRepo({ slug: 'git-package-patch-prerelease' });
          const betaDir = path.join(
            dir,
            'node_modules',
            '.pnpm',
            'is-number@8.0.0-beta.1',
            'node_modules',
            'is-number',
          );
          fs.mkdirSync(betaDir, { recursive: true });
          fs.writeFileSync(
            path.join(betaDir, 'package.json'),
            JSON.stringify({ name: 'is-number', version: '8.0.0-beta.1' }),
          );
          return { dir };
        });

        then(
          'the hint names the newest stable version, not the prerelease',
          () => {
            const result = runSkill({
              cwd: beta.dir,
              args: ['begin', '--package', 'is-number'],
            });
            expect(result.exitCode).toEqual(2);
            expect(result.stdout).toContain('several versions of is-number');
            expect(result.stdout).toContain('--package is-number@7.0.0');
            expect(result.stdout).not.toContain(
              '--package is-number@8.0.0-beta.1',
            );
            expectStableSnapshot({ result, dir: beta.dir });
          },
        );
      },
    );

    when('[t13.1] begin names a version that is not installed', () => {
      then('it is refused and names the installed versions', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['begin', '--package', 'is-number@9.9.9'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('is-number@9.9.9 is not installed');
        expect(result.stdout).toContain('name an installed version: 7.0.0');
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t13.2] --mode is neither plan nor apply', () => {
      then('begin refuses it', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['begin', '--package', 'is-number', '--mode', 'yolo'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('--mode must be plan or apply');
        expectStableSnapshot({ result, dir: scene.dir });
      });

      then('commit refuses it', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'commit',
            '--package',
            'is-number',
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
            '--mode',
            'yolo',
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('--mode must be plan or apply');
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t13.3] commit runs with --package absent', () => {
      then('it is refused and names the full command', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['commit', '--why', WHY, '--upstream', UPSTREAM],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('--package is required');
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t13.4] commit names a version that is not installed', () => {
      then('it is refused and names the installed versions', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'commit',
            '--package',
            'is-number@9.9.9',
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('is-number@9.9.9 is not installed');
        expect(result.stdout).toContain('name an installed version: 7.0.0');
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t14] commit reruns on a sealed patch with a different why', () => {
      then('it is refused, the note is untouched, and begin is named', () => {
        const noteBefore = fs.readFileSync(
          path.join(scene.dir, NOTE_REL),
          'utf-8',
        );
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'commit',
            '--package',
            'is-number',
            '--why',
            'a different motive',
            '--upstream',
            UPSTREAM,
            '--mode',
            'apply',
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain(
          'its note names another why or upstream',
        );
        expect(result.stdout).toContain(`edit ${NOTE_REL} by hand`);
        expect(result.stdout).toContain('rhx git.package.patch begin');
        expect(
          fs.readFileSync(path.join(scene.dir, NOTE_REL), 'utf-8'),
        ).toEqual(noteBefore);
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when(
      '[t15] a sealed patch is reopened, its edits reverted, and sealed with a new why',
      () => {
        then(
          'the seal is refused as empty, and the prior patch and note stand untouched',
          () => {
            const patchBefore = fs.readFileSync(
              path.join(scene.dir, PATCH_REL),
              'utf-8',
            );
            const noteBefore = fs.readFileSync(
              path.join(scene.dir, NOTE_REL),
              'utf-8',
            );
            const opened = runSkill({
              cwd: scene.dir,
              args: ['begin', '--package', 'is-number', '--mode', 'apply'],
            });
            expect(opened.exitCode).toEqual(0);
            expect(opened.stdout).toContain(
              `prior patch: ${PATCH_REL} (opens with it applied)`,
            );
            expectStableSnapshot({ result: opened, dir: scene.dir });

            // the dir opens with the prior patch applied; revert it to pristine
            const file = path.join(scene.dir, EDIT_DIR_REL, 'index.js');
            const patched = fs.readFileSync(file, 'utf-8');
            expect(patched).toContain('// reef patch: local fix');
            fs.writeFileSync(
              file,
              patched.split('\n// reef patch: local fix\n').join(''),
            );

            const result = runSkill({
              cwd: scene.dir,
              args: [
                'commit',
                '--package',
                'is-number',
                '--why',
                'a motive no edit backs',
                '--upstream',
                UPSTREAM,
                '--mode',
                'apply',
              ],
            });
            expect(result.exitCode).toEqual(2);
            expect(result.stdout).toContain('no edits to seal');
            expect(result.stdout).toContain('kept as it was, with its note');
            expect(
              fs.readFileSync(path.join(scene.dir, PATCH_REL), 'utf-8'),
            ).toEqual(patchBefore);
            expect(
              fs.readFileSync(path.join(scene.dir, NOTE_REL), 'utf-8'),
            ).toEqual(noteBefore);
            expect(
              fs.existsSync(path.join(scene.dir, `${PATCH_REL}.aside`)),
            ).toEqual(false);
            expectStableSnapshot({ result, dir: scene.dir });
          },
        );
      },
    );

    when('[t16] begin plans while the edit dir is still open', () => {
      then('it previews a reuse, over the prior patch', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['begin', '--package', 'is-number'],
        });
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).toContain('would reuse edit dir: ');
        expect(result.stdout).toContain(
          `prior patch: ${PATCH_REL} (opens with it applied)`,
        );
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when(
      '[t17] commit plans while the edit dir is open over the prior patch',
      () => {
        then(
          'it previews a re-seal of the prior patch, and changes naught',
          () => {
            const patchBefore = fs.readFileSync(
              path.join(scene.dir, PATCH_REL),
              'utf-8',
            );
            const result = runSkill({
              cwd: scene.dir,
              args: [
                'commit',
                '--package',
                'is-number',
                '--why',
                'a re-seal preview',
                '--upstream',
                UPSTREAM,
              ],
            });
            expect(result.exitCode).toEqual(0);
            expect(result.stdout).toContain(
              `prior patch: ${PATCH_REL} (re-sealed)`,
            );
            expect(
              fs.readFileSync(path.join(scene.dir, PATCH_REL), 'utf-8'),
            ).toEqual(patchBefore);
            expectStableSnapshot({ result, dir: scene.dir });
          },
        );
      },
    );

    when('[t18] --package is not a valid package name', () => {
      then('begin is refused before any path is built, exit 2', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['begin', '--package', '../reef-escape'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: --package is not a valid package name',
        );
        expectStableSnapshot({ result, dir: scene.dir });
      });

      then('commit is refused before any path is built, exit 2', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'commit',
            '--package',
            '../reef-escape',
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: --package is not a valid package name',
        );
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t19] the --edit-dir holds files but no package.json', () => {
      const scratch = useBeforeAll(async () => {
        const rel = 'reef-scratch';
        fs.mkdirSync(path.join(scene.dir, rel), { recursive: true });
        fs.writeFileSync(path.join(scene.dir, rel, 'notes.txt'), 'kelp\n');
        return { rel };
      });

      then('begin refuses to reuse it, exit 2', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['begin', '--package', 'is-number', '--edit-dir', scratch.rel],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('it is not an edit dir');
        expectStableSnapshot({ result, dir: scene.dir });
      });

      then('commit refuses to seal it, and the dir survives, exit 2', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'commit',
            '--package',
            'is-number@7.0.0',
            '--edit-dir',
            scratch.rel,
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
            '--mode',
            'apply',
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('it is not an edit dir');
        expect(
          fs.existsSync(path.join(scene.dir, scratch.rel, 'notes.txt')),
        ).toEqual(true);
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t20] the --edit-dir holds another package', () => {
      const odd = useBeforeAll(async () => {
        const rel = 'reef-odd';
        fs.mkdirSync(path.join(scene.dir, rel), { recursive: true });
        fs.writeFileSync(
          path.join(scene.dir, rel, 'package.json'),
          JSON.stringify({ name: 'is-odd', version: '3.0.1' }),
        );
        return { rel };
      });

      then('begin refuses to reuse it, exit 2', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['begin', '--package', 'is-number', '--edit-dir', odd.rel],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain(
          'the edit dir already holds is-odd@3.0.1, not is-number@7.0.0',
        );
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t21] the --edit-dir holds files git tracks', () => {
      const tracked = useBeforeAll(async () => {
        const rel = 'reef-tracked';
        fs.mkdirSync(path.join(scene.dir, rel), { recursive: true });
        fs.writeFileSync(
          path.join(scene.dir, rel, 'package.json'),
          JSON.stringify({ name: 'is-number', version: '7.0.0' }),
        );
        const add = spawnSync('git', ['add', '--', rel], {
          cwd: scene.dir,
          encoding: 'utf-8',
        });
        if (add.status !== 0)
          throw new MalfunctionError('fixture git add failed', {
            stderr: add.stderr ?? null,
          });
        return { rel };
      });

      then('commit refuses to seal it, and the dir survives, exit 2', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'commit',
            '--package',
            'is-number@7.0.0',
            '--edit-dir',
            tracked.rel,
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
            '--mode',
            'apply',
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('holds files git tracks');
        expect(
          fs.existsSync(path.join(scene.dir, tracked.rel, 'package.json')),
        ).toEqual(true);
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t22] the --edit-dir is the live install of the package', () => {
      const live = useBeforeAll(async () => {
        const pkgJson = path.join(
          scene.dir,
          'node_modules',
          'is-number',
          'package.json',
        );
        return { pkgJson, before: fs.readFileSync(pkgJson, 'utf-8') };
      });

      then('begin refuses it, so no edit can reach the shared store', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'begin',
            '--package',
            'is-number',
            '--edit-dir',
            'node_modules/is-number',
            '--mode',
            'apply',
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: --edit-dir must be a scratch dir, never the live install, the patches dir, or a broken link',
        );
        expect(fs.readFileSync(live.pkgJson, 'utf-8')).toEqual(live.before);
        expectStableSnapshot({ result, dir: scene.dir });
      });

      then('commit refuses it, and the live install survives', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'commit',
            '--package',
            'is-number@7.0.0',
            '--edit-dir',
            'node_modules/is-number',
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
            '--mode',
            'apply',
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('--edit-dir must be a scratch dir');
        expect(fs.readFileSync(live.pkgJson, 'utf-8')).toEqual(live.before);
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t23] the --edit-dir is a broken symlink', () => {
      const broken = useBeforeAll(async () => {
        const rel = 'reef-broken-link';
        fs.symlinkSync(
          path.join(scene.dir, 'reef-nowhere'),
          path.join(scene.dir, rel),
        );
        return { rel };
      });

      then('begin refuses it, exit 2', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['begin', '--package', 'is-number', '--edit-dir', broken.rel],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('--edit-dir must be a scratch dir');
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when(
      '[t24] the call carries the rhx --skill, --repo and --role flags',
      () => {
        then(
          'the dispatcher and the subskill strip them, and the call runs',
          () => {
            const result = runSkill({
              cwd: scene.dir,
              args: [
                '--skill',
                'git.package.patch',
                'begin',
                '--repo',
                'ehmpathy',
                '--role',
                'mechanic',
                '--package',
                'is-number',
              ],
            });
            expect(result.exitCode).toEqual(0);
            expect(result.stdout).toContain('package: is-number@7.0.0');
            expectStableSnapshot({ result, dir: scene.dir });
          },
        );
      },
    );
  });

  given('[case2] a pnpm repo with two installed versions of is-number', () => {
    const scene = useBeforeAll(async () => ({
      dir: genPnpmRepo({
        slug: 'git-package-patch-versions',
        dependencies: { 'is-number': '7.0.0', 'is-odd': '3.0.1' },
      }),
    }));

    when('[t0] begin names a bare package', () => {
      then('it is refused and lists the installed versions', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['begin', '--package', 'is-number'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('several versions of is-number');
        expect(result.stdout).toContain('installed: is-number@6.0.0');
        expect(result.stdout).toContain('installed: is-number@7.0.0');
        expect(
          asStableOutput({ stdout: result.stdout, dir: scene.dir }),
        ).toMatchSnapshot();
      });
    });

    when('[t1] begin names a version', () => {
      then('it plans with that version', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['begin', '--package', 'is-number@6.0.0'],
        });
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).toContain('package: is-number@6.0.0');
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t1.1] commit names a bare package and no edit dir is open', () => {
      then('it is refused, lists the versions, and names begin', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'commit',
            '--package',
            'is-number',
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain(
          'several versions of is-number are installed, and none has an open edit dir',
        );
        expect(result.stdout).toContain('installed: is-number@6.0.0');
        expect(result.stdout).toContain('installed: is-number@7.0.0');
        expect(result.stdout).toContain(
          'rhx git.package.patch begin --package is-number@7.0.0 --mode apply',
        );
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when(
      '[t1.2] commit names a bare package through a custom --edit-dir that was never opened',
      () => {
        then(
          'it is refused: no open edit dir, and begin is named with the dir',
          () => {
            const result = runSkill({
              cwd: scene.dir,
              args: [
                'commit',
                '--package',
                'is-number',
                '--edit-dir',
                'reef-never',
                '--why',
                WHY,
                '--upstream',
                UPSTREAM,
              ],
            });
            expect(result.exitCode).toEqual(2);
            expect(result.stdout).toContain(
              '✋ ConstraintError: no open edit dir at reef-never',
            );
            expect(result.stdout).toContain(
              'rhx git.package.patch begin --package is-number --edit-dir reef-never --mode apply',
            );
            expect(fs.existsSync(path.join(scene.dir, 'reef-never'))).toEqual(
              false,
            );
            expectStableSnapshot({ result, dir: scene.dir });
          },
        );
      },
    );

    when('[t2] begin applies the named version', () => {
      then('it opens that version, not the other', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['begin', '--package', 'is-number@6.0.0', '--mode', 'apply'],
        });
        expect(result.exitCode).toEqual(0);
        const pkg = JSON.parse(
          fs.readFileSync(
            path.join(scene.dir, EDIT_DIR_V6_REL, 'package.json'),
            'utf-8',
          ),
        ) as { version: string };
        expect(pkg.version).toEqual('6.0.0');
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t3] commit applies with no edits made', () => {
      then('it is refused: no edits to seal, and no note is written', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'commit',
            '--package',
            'is-number@6.0.0',
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
            '--mode',
            'apply',
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('no edits to seal');
        expect(fs.existsSync(path.join(scene.dir, PATCH_V6_REL))).toEqual(
          false,
        );
        expect(
          fs.existsSync(path.join(scene.dir, `${PATCH_V6_REL}.note.md`)),
        ).toEqual(false);
        expectStableSnapshot({ result, dir: scene.dir });
      });

      then(
        'naught changed: the edit dir stays open and no patch is recorded',
        () => {
          // clamp: a constraint refusal must leave the tree as it found it, so its fix names a live dir
          expect(
            fs.existsSync(
              path.join(scene.dir, EDIT_DIR_V6_REL, 'package.json'),
            ),
          ).toEqual(true);
          const workspace = path.join(scene.dir, 'pnpm-workspace.yaml');
          const recorded = `${fs.readFileSync(path.join(scene.dir, 'package.json'), 'utf-8')}\n${
            fs.existsSync(workspace) ? fs.readFileSync(workspace, 'utf-8') : ''
          }`;
          expect(recorded).not.toContain('is-number@6.0.0');
        },
      );
    });

    when('[t4] the named version is edited and sealed', () => {
      then('the patch lands under that version, with its note', () => {
        // the refused seal left the dir open (t3); begin reuses it
        const reopened = runSkill({
          cwd: scene.dir,
          args: ['begin', '--package', 'is-number@6.0.0', '--mode', 'apply'],
        });
        expect(reopened.exitCode).toEqual(0);
        const file = path.join(scene.dir, EDIT_DIR_V6_REL, 'index.js');
        fs.writeFileSync(
          file,
          `${fs.readFileSync(file, 'utf-8')}\n// reef patch: v6 fix\n`,
        );
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'commit',
            '--package',
            'is-number@6.0.0',
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
            '--mode',
            'apply',
          ],
        });
        expect(result.exitCode).toEqual(0);
        expect(
          fs.readFileSync(path.join(scene.dir, PATCH_V6_REL), 'utf-8'),
        ).toContain('reef patch: v6 fix');
        expect(
          fs.readFileSync(
            path.join(scene.dir, `${PATCH_V6_REL}.note.md`),
            'utf-8',
          ),
        ).toContain('# local patch: is-number@6.0.0');
        expect(
          fs.existsSync(path.join(scene.dir, 'patches/is-number@7.0.0.patch')),
        ).toEqual(false);
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t5] commit names a version the edit dir does not hold', () => {
      then('it is refused and names the version the dir holds', () => {
        // clamp: commit once trusted the dir over --package and sealed 6.0.0 as asked-for 7.0.0
        const opened = runSkill({
          cwd: scene.dir,
          args: [
            'begin',
            '--package',
            'is-number@6.0.0',
            '--edit-dir',
            'reef-edit',
            '--mode',
            'apply',
          ],
        });
        expect(opened.exitCode).toEqual(0);
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'commit',
            '--package',
            'is-number@7.0.0',
            '--edit-dir',
            'reef-edit',
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
            '--mode',
            'apply',
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain(
          'the edit dir holds is-number@6.0.0, not @7.0.0',
        );
        expect(result.stdout).toContain('--package is-number@6.0.0');
        expect(
          fs.existsSync(path.join(scene.dir, 'patches/is-number@7.0.0.patch')),
        ).toEqual(false);
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t6] commit names a package the edit dir does not hold', () => {
      then('it is refused and names the package the dir holds', () => {
        const opened = runSkill({
          cwd: scene.dir,
          args: [
            'begin',
            '--package',
            'is-odd',
            '--edit-dir',
            'odd-edit',
            '--mode',
            'apply',
          ],
        });
        expect(opened.exitCode).toEqual(0);
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'commit',
            '--package',
            'is-number',
            '--edit-dir',
            'odd-edit',
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain(
          'the edit dir holds is-odd@3.0.1, not is-number',
        );
        expect(result.stdout).toContain('--package is-odd@3.0.1');
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t7] two default edit dirs are open for one package', () => {
      then('a bare commit is refused and lists both', () => {
        const openSeven = runSkill({
          cwd: scene.dir,
          args: ['begin', '--package', 'is-number@7.0.0', '--mode', 'apply'],
        });
        const openSix = runSkill({
          cwd: scene.dir,
          args: ['begin', '--package', 'is-number@6.0.0', '--mode', 'apply'],
        });
        expect(openSeven.exitCode).toEqual(0);
        expect(openSix.exitCode).toEqual(0);
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'commit',
            '--package',
            'is-number',
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain(
          'several edit dirs are open for is-number',
        );
        expect(result.stdout).toContain(`open: ${EDIT_DIR_V6_REL}`);
        expect(result.stdout).toContain(`open: ${EDIT_DIR_REL}`);
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when(
      '[t8] a custom in-tree --edit-dir is opened, edited, and sealed with the why piped via @stdin',
      () => {
        then(
          'the patch lands, the note holds the piped why, and the dir is removed',
          () => {
            const opened = runSkill({
              cwd: scene.dir,
              args: [
                'begin',
                '--package',
                'is-number@7.0.0',
                '--edit-dir',
                'reef-seal',
                '--mode',
                'apply',
              ],
            });
            expect(opened.exitCode).toEqual(0);
            // the pasted next step must carry the custom dir, or it seals the default one
            expect(opened.stdout).toContain(
              "rhx git.package.patch commit --package is-number@7.0.0 --why '<why>' --upstream '<issue-url>' --edit-dir reef-seal --mode apply",
            );
            expect(opened.stdout).toContain('edit dir: reef-seal');
            expectStableSnapshot({ result: opened, dir: scene.dir });
            const file = path.join(scene.dir, 'reef-seal', 'index.js');
            fs.writeFileSync(
              file,
              `${fs.readFileSync(file, 'utf-8')}\n// reef patch: custom dir fix\n`,
            );
            const whyPiped = "the reef's fix (see #580) for [1] wave";
            const result = runSkill({
              cwd: scene.dir,
              stdin: `${whyPiped}\n`,
              args: [
                'commit',
                '--package',
                'is-number@7.0.0',
                '--edit-dir',
                'reef-seal',
                '--why',
                '@stdin',
                '--upstream',
                UPSTREAM,
                '--mode',
                'apply',
              ],
            });
            expect(result.exitCode).toEqual(0);
            expect(
              fs.readFileSync(path.join(scene.dir, PATCH_REL), 'utf-8'),
            ).toContain('reef patch: custom dir fix');
            expect(
              fs.readFileSync(path.join(scene.dir, NOTE_REL), 'utf-8'),
            ).toContain(`- why: ${whyPiped}`);
            expect(fs.existsSync(path.join(scene.dir, 'reef-seal'))).toEqual(
              false,
            );
            expectStableSnapshot({ result, dir: scene.dir });
          },
        );
      },
    );
  });

  given(
    '[case2b] a pnpm repo with one installed version, sealed through a custom --edit-dir',
    () => {
      const scene = useBeforeAll(async () => ({
        dir: genPnpmRepo({
          slug: 'git-package-patch-custom-rerun',
          dependencies: { 'is-number': '7.0.0' },
        }),
      }));
      const sealBare = [
        'commit',
        '--package',
        'is-number',
        '--edit-dir',
        'reef-seal',
        '--why',
        WHY,
        '--upstream',
        UPSTREAM,
        '--mode',
        'apply',
      ];

      const sealed = useWhen(
        '[t0] the crew opens reef-seal, edits it, and seals with a bare name',
        () => {
          const result = useThen('the seal lands, exit 0', () => {
            const opened = runSkill({
              cwd: scene.dir,
              args: [
                'begin',
                '--package',
                'is-number',
                '--edit-dir',
                'reef-seal',
                '--mode',
                'apply',
              ],
            });
            expect(opened.exitCode).toEqual(0);
            expect(opened.stdout).toContain(
              "rhx git.package.patch commit --package is-number@7.0.0 --why '<why>' --upstream '<issue-url>' --edit-dir reef-seal --mode apply",
            );
            const file = path.join(scene.dir, 'reef-seal', 'index.js');
            fs.writeFileSync(
              file,
              `${fs.readFileSync(file, 'utf-8')}\n// reef patch: bare rerun\n`,
            );
            // the plan hint carries the custom dir and the crew's own why + upstream
            const planned = runSkill({
              cwd: scene.dir,
              args: sealBare.slice(0, -2),
            });
            expect(planned.exitCode).toEqual(0);
            expect(planned.stdout).toContain(
              '--edit-dir reef-seal --mode apply',
            );
            expect(planned.stdout).toContain(`--upstream ${UPSTREAM}`);
            // the custom-dir begin apply and commit plan renders, pinned whole
            expectStableSnapshot({ result: opened, dir: scene.dir });
            expectStableSnapshot({ result: planned, dir: scene.dir });
            const first = runSkill({ cwd: scene.dir, args: sealBare });
            expect(first.exitCode).toEqual(0);
            return first;
          });

          then('the patch lands and the custom dir is removed', () => {
            expect(result.exitCode).toEqual(0);
            expect(fs.existsSync(path.join(scene.dir, PATCH_REL))).toEqual(
              true,
            );
            expect(fs.existsSync(path.join(scene.dir, 'reef-seal'))).toEqual(
              false,
            );
          });

          return result;
        },
      );

      when('[t1] the crew reruns the exact same commit', () => {
        then('it is the already-sealed no-op, exit 0', () => {
          expect(sealed.exitCode).toEqual(0);
          const patchBefore = fs.readFileSync(
            path.join(scene.dir, PATCH_REL),
            'utf-8',
          );
          const rerun = runSkill({ cwd: scene.dir, args: sealBare });
          expect(rerun.stdout).toContain('already sealed');
          expect(rerun.exitCode).toEqual(0);
          expect(
            fs.readFileSync(path.join(scene.dir, PATCH_REL), 'utf-8'),
          ).toEqual(patchBefore);
        });
      });
    },
  );

  given('[case3b] a yarn or bun repo', () => {
    const LOCKFILES = ['yarn.lock', 'bun.lock', 'bun.lockb'];
    LOCKFILES.map((lockfile) =>
      when(`[t0] begin runs beside ${lockfile}`, () => {
        then('it is refused as pnpm-only, and names the lockfile', () => {
          const tempDir = genTempDir({
            slug: `git-package-patch-${lockfile.replace('.', '-')}`,
            git: true,
          });
          fs.writeFileSync(
            path.join(tempDir, 'package.json'),
            '{"name":"reef"}',
          );
          fs.writeFileSync(path.join(tempDir, lockfile), '');
          const result = runSkill({
            cwd: tempDir,
            args: ['begin', '--package', 'is-number'],
          });
          expect(result.exitCode).toEqual(2);
          expect(result.stdout).toContain(
            `this repo locks with ${lockfile}; pnpm patch is pnpm-only`,
          );
          expectStableSnapshot({ result, dir: tempDir });
        });
      }),
    );
  });

  given('[case3] an npm repo', () => {
    const scene = useBeforeAll(async () => {
      const tempDir = genTempDir({ slug: 'git-package-patch-npm', git: true });
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{"name":"reef"}');
      fs.writeFileSync(path.join(tempDir, 'package-lock.json'), '{}');
      return { dir: tempDir };
    });

    when('[t0] begin runs', () => {
      then('it is refused as pnpm-only', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['begin', '--package', 'is-number'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('pnpm patch is pnpm-only');
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t1] commit runs', () => {
      then('it is refused as pnpm-only', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'commit',
            '--package',
            'is-number',
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('pnpm patch is pnpm-only');
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });
  });

  given('[case5] a dir whose repo shape the verb refuses', () => {
    const scene = useBeforeAll(async () => ({
      outside: genTempDir({ slug: 'git-package-patch-no-git', git: false }),
      bare: genTempDir({ slug: 'git-package-patch-no-pkg', git: true }),
    }));

    when('[t0] the cwd is not inside a git repo', () => {
      then('begin is refused', () => {
        const result = runSkill({
          cwd: scene.outside,
          args: ['begin', '--package', 'is-number'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('not inside a git repo');
        expectStableSnapshot({ result, dir: scene.outside });
      });

      then('commit is refused', () => {
        const result = runSkill({
          cwd: scene.outside,
          args: [
            'commit',
            '--package',
            'is-number',
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('not inside a git repo');
        expectStableSnapshot({ result, dir: scene.outside });
      });
    });

    when('[t1] the git root holds no package.json', () => {
      then('begin is refused', () => {
        const result = runSkill({
          cwd: scene.bare,
          args: ['begin', '--package', 'is-number'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('the git root holds no package.json');
        expectStableSnapshot({ result, dir: scene.bare });
      });

      then('commit is refused', () => {
        const result = runSkill({
          cwd: scene.bare,
          args: [
            'commit',
            '--package',
            'is-number',
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('the git root holds no package.json');
        expectStableSnapshot({ result, dir: scene.bare });
      });
    });

    when('[t2] the default edit dir base is a symlink out of the tree', () => {
      const linked = useBeforeAll(async () => {
        const dir = genOnDiskRepo({ slug: 'git-package-patch-linked-base' });
        const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'reef-outside-'));
        fs.symlinkSync(
          outside,
          path.join(dir, 'node_modules', '.pnpm_patches'),
        );
        return { dir, outside };
      });

      then('begin is refused, and naught lands outside', () => {
        const result = runSkill({
          cwd: linked.dir,
          args: ['begin', '--package', 'is-number', '--mode', 'apply'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain(
          'the edit dir must sit inside the tree',
        );
        expect(fs.readdirSync(linked.outside)).toEqual([]);
        expectStableSnapshot({ result, dir: linked.dir });
      });

      then('commit is refused, and naught lands outside', () => {
        const result = runSkill({
          cwd: linked.dir,
          args: [
            'commit',
            '--package',
            'is-number',
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
            '--mode',
            'apply',
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain(
          'the edit dir must sit inside the tree',
        );
        expect(fs.readdirSync(linked.outside)).toEqual([]);
        expectStableSnapshot({ result, dir: linked.dir });
      });
    });

    when('[t3] an installed package.json is malformed', () => {
      const broken = useBeforeAll(async () => {
        const dir = genOnDiskRepo({ slug: 'git-package-patch-broken-pkg' });
        fs.writeFileSync(
          path.join(dir, 'node_modules', 'is-number', 'package.json'),
          '{ not json',
        );
        return { dir };
      });

      then('begin reports a malfunction, exit 1', () => {
        const result = runSkill({
          cwd: broken.dir,
          args: ['begin', '--package', 'is-number'],
        });
        expect(result.exitCode).toEqual(1);
        expect(result.stdout).toContain(
          '💥 MalfunctionError: could not read the installed versions of is-number',
        );
        expect(result.stderr).toContain(
          'could not read the installed versions',
        );
        expect(
          asMaskedPnpmDetail({
            stdout: asStableOutput({ stdout: result.stdout, dir: broken.dir }),
          }),
        ).toMatchSnapshot();
      });
    });

    when('[t4] the repo installs with node-linker=hoisted', () => {
      const hoisted = useBeforeAll(async () => {
        const dir = genOnDiskRepo({ slug: 'git-package-patch-hoisted' });
        fs.writeFileSync(path.join(dir, '.npmrc'), 'node-linker=hoisted\n');
        return { dir };
      });

      then('begin is refused before any write, exit 2', () => {
        const result = runSkill({
          cwd: hoisted.dir,
          args: ['begin', '--package', 'is-number', '--mode', 'apply'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: this repo installs with node-linker=hoisted',
        );
        expect(
          fs.existsSync(
            path.join(hoisted.dir, 'node_modules', '.pnpm_patches'),
          ),
        ).toEqual(false);
        expectStableSnapshot({ result, dir: hoisted.dir });
      });

      then('commit is refused, and the manifest is unchanged', () => {
        const pkgBefore = fs.readFileSync(
          path.join(hoisted.dir, 'package.json'),
          'utf-8',
        );
        const result = runSkill({
          cwd: hoisted.dir,
          args: [
            'commit',
            '--package',
            'is-number',
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
            '--mode',
            'apply',
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: this repo installs with node-linker=hoisted',
        );
        expect(
          fs.readFileSync(path.join(hoisted.dir, 'package.json'), 'utf-8'),
        ).toEqual(pkgBefore);
        expectStableSnapshot({ result, dir: hoisted.dir });
      });
    });

    when(
      '[t5] the repo declares nodeLinker: hoisted in pnpm-workspace.yaml',
      () => {
        const hoistedYaml = useBeforeAll(async () => {
          const dir = genOnDiskRepo({ slug: 'git-package-patch-hoisted-yaml' });
          fs.writeFileSync(
            path.join(dir, 'pnpm-workspace.yaml'),
            'nodeLinker: hoisted # metro needs a flat tree\n',
          );
          return { dir };
        });

        then('begin is refused before any write, exit 2', () => {
          const result = runSkill({
            cwd: hoistedYaml.dir,
            args: ['begin', '--package', 'is-number', '--mode', 'apply'],
          });
          expect(result.exitCode).toEqual(2);
          expect(result.stdout).toContain(
            '✋ ConstraintError: this repo installs with node-linker=hoisted',
          );
          expect(result.stdout).toContain('issues/772');
          expect(
            fs.existsSync(
              path.join(hoistedYaml.dir, 'node_modules', '.pnpm_patches'),
            ),
          ).toEqual(false);
        });
      },
    );

    when('[t6] the .npmrc hoisted line carries a trail comment', () => {
      const hoistedNote = useBeforeAll(async () => {
        const dir = genOnDiskRepo({ slug: 'git-package-patch-hoisted-note' });
        fs.writeFileSync(
          path.join(dir, '.npmrc'),
          'node-linker=hoisted # metro needs a flat tree\n',
        );
        return { dir };
      });

      then('begin is refused before any write, exit 2', () => {
        const result = runSkill({
          cwd: hoistedNote.dir,
          args: ['begin', '--package', 'is-number', '--mode', 'apply'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: this repo installs with node-linker=hoisted',
        );
      });
    });
  });

  given(
    '[case8] a pnpm repo whose package.json already records a patch for another package',
    () => {
      const ODD_PATCH_REL = 'patches/is-odd@3.0.1.patch';
      const ODD_MARK = '// reef patch: prior is-odd fix';
      const scene = useBeforeAll(async () => {
        const dir = genPnpmRepo({
          slug: 'git-package-patch-prior-entry',
          dependencies: { 'is-number': '7.0.0', 'is-odd': '3.0.1' },
        });

        // seal a prior patch for is-odd through the verb
        const opened = runSkill({
          cwd: dir,
          args: ['begin', '--package', 'is-odd', '--mode', 'apply'],
        });
        if (opened.exitCode !== 0)
          throw new MalfunctionError('fixture: begin is-odd failed', {
            stdout: opened.stdout,
          });
        const oddFile = path.join(
          dir,
          'node_modules/.pnpm_patches/is-odd@3.0.1/index.js',
        );
        fs.writeFileSync(
          oddFile,
          `${fs.readFileSync(oddFile, 'utf-8')}\n${ODD_MARK}\n`,
        );
        const sealed = runSkill({
          cwd: dir,
          args: [
            'commit',
            '--package',
            'is-odd',
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
            '--mode',
            'apply',
          ],
        });
        if (sealed.exitCode !== 0)
          throw new MalfunctionError('fixture: commit is-odd failed', {
            stdout: sealed.stdout,
          });

        // move the entry into package.json#pnpm.patchedDependencies, the older home
        fs.rmSync(path.join(dir, 'pnpm-workspace.yaml'), { force: true });
        const pkgPath = path.join(dir, 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as Record<
          string,
          unknown
        >;
        fs.writeFileSync(
          pkgPath,
          JSON.stringify(
            {
              ...pkg,
              pnpm: { patchedDependencies: { 'is-odd@3.0.1': ODD_PATCH_REL } },
            },
            null,
            2,
          ),
        );
        const install = spawnSync(
          path.join(tools.binDir, 'pnpm'),
          ['install', '--config.confirmModulesPurge=false'],
          { cwd: dir, encoding: 'utf-8', timeout: 180_000 },
        );
        if (install.status !== 0)
          throw new MalfunctionError('fixture: reinstall failed', {
            stdout: install.stdout,
            stderr: install.stderr,
          });
        return { dir };
      });

      when('[t0] a second package is patched and sealed', () => {
        const result = useThen('the seal succeeds', () => {
          // is-odd@3.0.1 pulls is-number@6.0.0, so the version is named
          const opened = runSkill({
            cwd: scene.dir,
            args: ['begin', '--package', 'is-number@7.0.0', '--mode', 'apply'],
          });
          expect(opened.exitCode).toEqual(0);
          editIsNumber({ dir: scene.dir });
          // CI=true makes a bare pnpm install frozen; the seal's lockfile settle must still land
          const sealed = runSkill({
            cwd: scene.dir,
            args: [
              'commit',
              '--package',
              'is-number@7.0.0',
              '--why',
              WHY,
              '--upstream',
              UPSTREAM,
              '--mode',
              'apply',
            ],
            env: { CI: 'true' },
          });
          if (sealed.exitCode !== 0)
            throw new MalfunctionError('commit is-number failed', {
              stdout: sealed.stdout,
            });
          return sealed;
        });

        then('the prior patch still applies in node_modules', () => {
          const oddLive = fs.readFileSync(
            path.join(scene.dir, 'node_modules/is-odd/index.js'),
            'utf-8',
          );
          expect(oddLive).toContain(ODD_MARK);
        });

        then(
          'the lockfile records both patches, so a frozen install agrees',
          () => {
            const lock = fs.readFileSync(
              path.join(scene.dir, 'pnpm-lock.yaml'),
              'utf-8',
            );
            expect(lock).toContain(`path: ${ODD_PATCH_REL}`);
            expect(lock).toContain(`path: ${PATCH_REL}`);
          },
        );

        then('the new patch applies in node_modules too', () => {
          const numberLive = fs.readFileSync(
            path.join(scene.dir, 'node_modules/is-number/index.js'),
            'utf-8',
          );
          expect(numberLive).toContain('reef patch: local fix');
        });

        then('the output names the manifest that holds the new entry', () => {
          expect(result.stdout).toMatch(
            /entry: patchedDependencies\[is-number@7\.0\.0\] in (package\.json|pnpm-workspace\.yaml)/,
          );
          // which manifest pnpm writes varies by pnpm version; mask it, snap the rest live
          expect(
            asStableOutput({ stdout: result.stdout, dir: scene.dir }).replace(
              /\] in (package\.json|pnpm-workspace\.yaml)/,
              '] in <manifest>',
            ),
          ).toMatchSnapshot();
        });
      });
    },
  );

  given('[case7] a pnpm repo whose seal install fails after the write', () => {
    const scene = useBeforeAll(async () => ({
      dir: genPnpmRepo({
        slug: 'git-package-patch-install-fails',
        dependencies: { 'is-number': '7.0.0' },
      }),
    }));

    when(
      '[t0] commit seals while package.json names a dependency no registry holds',
      () => {
        const result = useThen('the seal fails, exit 1', () => {
          const opened = runSkill({
            cwd: scene.dir,
            args: ['begin', '--package', 'is-number', '--mode', 'apply'],
          });
          expect(opened.exitCode).toEqual(0);
          editIsNumber({ dir: scene.dir });

          // the install pnpm runs after its write must fail: a dependency no registry holds
          const pkgPath = path.join(scene.dir, 'package.json');
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
            dependencies: Record<string, string>;
          };
          fs.writeFileSync(
            pkgPath,
            JSON.stringify(
              {
                ...pkg,
                dependencies: {
                  ...pkg.dependencies,
                  'reef-kelp-not-on-any-registry-zz9': '1.0.0',
                },
              },
              null,
              2,
            ),
          );
          const sealed = runSkill({
            cwd: scene.dir,
            args: [
              'commit',
              '--package',
              'is-number',
              '--why',
              WHY,
              '--upstream',
              UPSTREAM,
              '--mode',
              'apply',
            ],
          });
          expect(sealed.exitCode).toEqual(1);
          return sealed;
        });

        then(
          'no manifest entry is left that points at an absent patch file',
          () => {
            const manifests = ['package.json', 'pnpm-workspace.yaml']
              .map((name) => path.join(scene.dir, name))
              .filter((file) => fs.existsSync(file))
              .map((file) => fs.readFileSync(file, 'utf-8'));
            const recorded = manifests.some((text) => text.includes(PATCH_REL));
            const present = fs.existsSync(path.join(scene.dir, PATCH_REL));
            expect({ recorded, present: recorded ? present : true }).toEqual({
              recorded,
              present: true,
            });
          },
        );

        then('the output says the patch is kept, and names the rerun', () => {
          expect(result.stdout).toContain(
            `${PATCH_REL} is kept so the entry holds`,
          );
          expect(result.stdout).toContain('then rerun this commit');
          expect(result.stderr).toContain('MalfunctionError');
        });

        then('the note is not written, and the edit dir stays open', () => {
          expect(fs.existsSync(path.join(scene.dir, NOTE_REL))).toEqual(false);
          expect(fs.existsSync(path.join(scene.dir, EDIT_DIR_REL))).toEqual(
            true,
          );
        });

        then('the output matches snapshot', () => {
          expect(
            asMaskedPnpmDetail({
              stdout: asStableOutput({ stdout: result.stdout, dir: scene.dir }),
            }),
          ).toMatchSnapshot();
        });
      },
    );
  });

  given(
    '[case7c] a sealed patch whose manifest or lockfile record a rebase dropped',
    () => {
      const scene = useBeforeAll(async () => ({
        dir: genPnpmRepo({
          slug: 'git-package-patch-record-lost',
          dependencies: { 'is-number': '7.0.0' },
        }),
      }));
      const sealCmd = [
        'commit',
        '--package',
        'is-number',
        '--why',
        WHY,
        '--upstream',
        UPSTREAM,
        '--mode',
        'apply',
      ];
      const lockPath = (): string => path.join(scene.dir, 'pnpm-lock.yaml');

      const sealed = useWhen('[t0] the crew seals a patch', () => {
        const result = useThen('the seal lands, exit 0', () => {
          const opened = runSkill({
            cwd: scene.dir,
            args: ['begin', '--package', 'is-number', '--mode', 'apply'],
          });
          expect(opened.exitCode).toEqual(0);
          editIsNumber({ dir: scene.dir });
          const first = runSkill({ cwd: scene.dir, args: sealCmd });
          expect(first.exitCode).toEqual(0);
          return first;
        });
        then('the lockfile records the patch', () => {
          expect(result.exitCode).toEqual(0);
          expect(fs.readFileSync(lockPath(), 'utf-8')).toContain(
            `path: ${PATCH_REL}`,
          );
        });
        return result;
      });

      when(
        '[t1] the lockfile record is dropped, and the same commit reruns',
        () => {
          then('it refuses, exit 2, and names pnpm install', () => {
            expect(sealed.exitCode).toEqual(0);
            const lockBefore = fs.readFileSync(lockPath(), 'utf-8');
            fs.writeFileSync(
              lockPath(),
              lockBefore
                .split('\n')
                .filter((line) => !line.includes(`path: ${PATCH_REL}`))
                .join('\n'),
            );
            const rerun = runSkill({ cwd: scene.dir, args: sealCmd });
            fs.writeFileSync(lockPath(), lockBefore);
            expect(rerun.stdout).toContain('the lockfile record is absent');
            expect(rerun.stdout).toContain('run pnpm install');
            expect(rerun.stdout).not.toContain('already sealed');
            expect(rerun.exitCode).toEqual(2);
            expectStableSnapshot({ result: rerun, dir: scene.dir });
          });
        },
      );

      when('[t2] the manifest entry is dropped', () => {
        const stripped = useBeforeAll(async () => {
          expect(sealed.exitCode).toEqual(0);
          const manifestPath = path.join(scene.dir, 'package.json');
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          const { pnpm: _pnpm, ...manifestRest } = manifest;
          fs.writeFileSync(manifestPath, JSON.stringify(manifestRest, null, 2));
          const workspacePath = path.join(scene.dir, 'pnpm-workspace.yaml');
          if (fs.existsSync(workspacePath))
            fs.writeFileSync(
              workspacePath,
              fs
                .readFileSync(workspacePath, 'utf-8')
                .split('\n')
                .filter(
                  (line) =>
                    !line.includes(PATCH_REL) &&
                    !line.includes('patchedDependencies'),
                )
                .join('\n'),
            );
          // a comment that names the path is no entry
          fs.appendFileSync(
            workspacePath,
            `\n# reef note: ${PATCH_REL} awaits its upstream fix\n`,
          );
          return { done: true };
        });

        then(
          'a rerun of the same commit refuses, exit 2, and names the entry',
          () => {
            expect(stripped.done).toEqual(true);
            const rerun = runSkill({ cwd: scene.dir, args: sealCmd });
            expect(rerun.stdout).toContain('the entry record is absent');
            expect(rerun.stdout).toContain(
              `restore the patchedDependencies entry "is-number@7.0.0": "${PATCH_REL}"`,
            );
            expect(rerun.exitCode).toEqual(2);
            expectStableSnapshot({ result: rerun, dir: scene.dir });
          },
        );

        then(
          'begin refuses too, so a pristine reopen cannot drop the edits',
          () => {
            expect(stripped.done).toEqual(true);
            const reopen = runSkill({
              cwd: scene.dir,
              args: ['begin', '--package', 'is-number', '--mode', 'apply'],
            });
            expect(reopen.stdout).toContain(
              'no patchedDependencies entry names it',
            );
            expect(reopen.exitCode).toEqual(2);
            expect(fs.existsSync(path.join(scene.dir, EDIT_DIR_REL))).toEqual(
              false,
            );
            expectStableSnapshot({ result: reopen, dir: scene.dir });
          },
        );
      });
    },
  );

  given('[case9] hostile --edit-dir inputs, on an on-disk tree', () => {
    const scene = useBeforeAll(async () => ({
      dir: genOnDiskRepo({ slug: 'git-package-patch-hostile-dirs' }),
    }));

    when('[t0] --edit-dir names the patches dir', () => {
      then('begin and commit both refuse it, exit 2', () => {
        const opened = runSkill({
          cwd: scene.dir,
          args: ['begin', '--package', 'is-number', '--edit-dir', 'patches'],
        });
        expect(opened.stdout).toContain('the patches dir');
        expect(opened.exitCode).toEqual(2);
        const sealed = runSkill({
          cwd: scene.dir,
          args: [
            'commit',
            '--package',
            'is-number',
            '--edit-dir',
            'patches',
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
          ],
        });
        expect(sealed.stdout).toContain('the patches dir');
        expect(sealed.exitCode).toEqual(2);
        expectStableSnapshot({ result: opened, dir: scene.dir });
        expectStableSnapshot({ result: sealed, dir: scene.dir });
      });
    });

    when(
      '[t1] --edit-dir sits below a broken link that leads out of the tree',
      () => {
        then('begin refuses it at the bound, exit 2, before any mkdir', () => {
          const outside = path.join(
            os.tmpdir(),
            `reef-absent-${Date.now()}-${process.pid}`,
          );
          fs.symlinkSync(outside, path.join(scene.dir, 'reef-link'));
          const opened = runSkill({
            cwd: scene.dir,
            args: [
              'begin',
              '--package',
              'is-number',
              '--edit-dir',
              'reef-link/child',
              '--mode',
              'apply',
            ],
          });
          expect(opened.stdout).toContain(
            '--edit-dir must sit inside the tree',
          );
          expect(opened.exitCode).toEqual(2);
          expect(fs.existsSync(outside)).toEqual(false);
          expect(
            asStableOutput({ stdout: opened.stdout, dir: scene.dir }).replace(
              /reef-absent-\d+-\d+/g,
              'reef-absent-<rand>',
            ),
          ).toMatchSnapshot();
        });
      },
    );

    when("[t2] an open edit dir's package.json name carries a newline", () => {
      then('begin refuses it, exit 2, and prints no raw name', () => {
        const dir = path.join(scene.dir, 'reef-hostile');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(
          path.join(dir, 'package.json'),
          JSON.stringify({
            name: 'is-number\nrhx reef-wipe --all',
            version: '7.0.0',
          }),
        );
        const opened = runSkill({
          cwd: scene.dir,
          args: [
            'begin',
            '--package',
            'is-number',
            '--edit-dir',
            'reef-hostile',
          ],
        });
        expect(opened.stdout).toContain('is not a package spec');
        expect(opened.stdout).not.toContain('reef-wipe');
        expect(opened.exitCode).toEqual(2);
        expectStableSnapshot({ result: opened, dir: scene.dir });
      });
    });

    when('[t3] --edit-dir holds shell metachars', () => {
      then(
        'the paste-ready hint quotes them, so a paste names the same dir',
        () => {
          const opened = runSkill({
            cwd: scene.dir,
            args: ['begin', '--package', 'is-number', '--edit-dir', 'a>b\\c'],
          });
          expect(opened.exitCode).toEqual(0);
          expect(opened.stdout).toContain("--edit-dir 'a>b\\c'");
          expect(opened.stdout).not.toContain('--edit-dir a>b');
          expectStableSnapshot({ result: opened, dir: scene.dir });
        },
      );
    });

    when(
      '[t4] an installed package.json carries a version that is no version',
      () => {
        then(
          'the verb never prints it, and lists only the real version',
          () => {
            const crafted = path.join(
              scene.dir,
              'node_modules/.pnpm/is-number@reef/node_modules/is-number',
            );
            fs.mkdirSync(crafted, { recursive: true });
            fs.writeFileSync(
              path.join(crafted, 'package.json'),
              JSON.stringify({
                name: 'is-number',
                version: '7.0.1\nrhx reef-wipe --all',
              }),
            );
            const opened = runSkill({
              cwd: scene.dir,
              args: ['begin', '--package', 'is-number'],
            });
            expect(opened.stdout).not.toContain('reef-wipe');
            expect(opened.stdout).toContain('package: is-number@7.0.0');
            expect(opened.exitCode).toEqual(0);
            expectStableSnapshot({ result: opened, dir: scene.dir });
          },
        );
      },
    );
  });

  given('[case7b] a pnpm repo whose .npmrc sets lockfile=false', () => {
    const scene = useBeforeAll(async () => ({
      dir: genPnpmRepo({
        slug: 'git-package-patch-no-lockfile',
        dependencies: { 'is-number': '7.0.0' },
      }),
    }));
    const sealCmd = [
      'commit',
      '--package',
      'is-number',
      '--why',
      WHY,
      '--upstream',
      UPSTREAM,
      '--mode',
      'apply',
    ];

    const failed = useWhen(
      '[t0] commit seals while pnpm writes no lockfile',
      () => {
        const result = useThen('the seal ends in a malfunction, exit 1', () => {
          const opened = runSkill({
            cwd: scene.dir,
            args: ['begin', '--package', 'is-number', '--mode', 'apply'],
          });
          expect(opened.exitCode).toEqual(0);
          editIsNumber({ dir: scene.dir });
          fs.writeFileSync(path.join(scene.dir, '.npmrc'), 'lockfile=false\n');
          const sealed = runSkill({ cwd: scene.dir, args: sealCmd });
          expect(sealed.exitCode).toEqual(1);
          return sealed;
        });

        then('the output names the cause and the rerun', () => {
          expect(result.stdout).toContain(
            'pnpm-lock.yaml does not record it after a reinstall',
          );
          expect(result.stdout).toContain('is lockfile=false set?');
          expect(result.stdout).toContain('then rerun this same commit');
          expect(result.stderr).toContain('MalfunctionError');
          expect(
            asMaskedPnpmDetail({
              stdout: asStableOutput({ stdout: result.stdout, dir: scene.dir }),
            }),
          ).toMatchSnapshot();
        });

        then('the edit dir stays open, and no note is written', () => {
          expect(fs.existsSync(path.join(scene.dir, EDIT_DIR_REL))).toEqual(
            true,
          );
          expect(fs.existsSync(path.join(scene.dir, NOTE_REL))).toEqual(false);
        });

        return result;
      },
    );

    when(
      '[t1] the crew drops lockfile=false and reruns the same commit',
      () => {
        const rerun = useThen('the seal completes, exit 0', () => {
          expect(failed.exitCode).toEqual(1);
          fs.rmSync(path.join(scene.dir, '.npmrc'));
          const sealed = runSkill({ cwd: scene.dir, args: sealCmd });
          expect(sealed.exitCode).toEqual(0);
          return sealed;
        });

        then('the patch, its note, and its lockfile record all land', () => {
          expect(rerun.exitCode).toEqual(0);
          expect(fs.existsSync(path.join(scene.dir, PATCH_REL))).toEqual(true);
          expect(fs.existsSync(path.join(scene.dir, NOTE_REL))).toEqual(true);
          expect(
            fs.readFileSync(path.join(scene.dir, 'pnpm-lock.yaml'), 'utf-8'),
          ).toContain(`path: ${PATCH_REL}`);
          expectStableSnapshot({ result: rerun, dir: scene.dir });
        });
      },
    );
  });

  given(
    '[case6] a pnpm repo where pnpm itself fails, and a scoped package',
    () => {
      const scene = useBeforeAll(async () => ({
        dir: genPnpmRepo({
          slug: 'git-package-patch-pnpm-fails',
          dependencies: { 'is-number': '7.0.0', '@types/is-number': '7.0.5' },
        }),
      }));

      when(
        '[t0] begin names a package on disk that pnpm never installed',
        () => {
          then(
            'pnpm patch fails, and the verb reports a malfunction, exit 1',
            () => {
              // a hand-placed package.json passes the on-disk version lookup; pnpm's lockfile lacks it
              const ghost = path.join(scene.dir, 'node_modules', 'reef-ghost');
              fs.mkdirSync(ghost, { recursive: true });
              fs.writeFileSync(
                path.join(ghost, 'package.json'),
                JSON.stringify({ name: 'reef-ghost', version: '1.0.0' }),
              );
              const result = runSkill({
                cwd: scene.dir,
                args: ['begin', '--package', 'reef-ghost', '--mode', 'apply'],
              });
              expect(result.exitCode).toEqual(1);
              expect(result.stdout).toContain(
                '💥 MalfunctionError: pnpm patch failed',
              );
              expect(result.stderr).toContain('pnpm patch failed');
              expect(result.stdout).toContain('└─ detail');
              expect(
                asMaskedPnpmDetail({
                  stdout: asStableOutput({
                    stdout: result.stdout,
                    dir: scene.dir,
                  }),
                }),
              ).toMatchSnapshot();
            },
          );
        },
      );

      when('[t1] commit seals while the patches dir is a file', () => {
        then(
          'pnpm patch-commit fails, and the verb reports a malfunction, exit 1',
          () => {
            const opened = runSkill({
              cwd: scene.dir,
              args: ['begin', '--package', 'is-number', '--mode', 'apply'],
            });
            expect(opened.exitCode).toEqual(0);
            editIsNumber({ dir: scene.dir });
            fs.writeFileSync(path.join(scene.dir, 'patches'), 'not a dir\n');
            const result = runSkill({
              cwd: scene.dir,
              args: [
                'commit',
                '--package',
                'is-number',
                '--why',
                WHY,
                '--upstream',
                UPSTREAM,
                '--mode',
                'apply',
              ],
            });
            fs.rmSync(path.join(scene.dir, 'patches'));
            expect(result.exitCode).toEqual(1);
            expect(result.stdout).toContain(
              '💥 MalfunctionError: pnpm patch-commit failed',
            );
            expect(fs.existsSync(path.join(scene.dir, NOTE_REL))).toEqual(
              false,
            );
            expect(result.stdout).toContain('└─ detail');
            expect(
              asMaskedPnpmDetail({
                stdout: asStableOutput({
                  stdout: result.stdout,
                  dir: scene.dir,
                }),
              }),
            ).toMatchSnapshot();
          },
        );
      });

      when('[t2] a scoped package is opened and sealed', () => {
        then('the patch and note land under the flat scoped name', () => {
          const opened = runSkill({
            cwd: scene.dir,
            args: ['begin', '--package', '@types/is-number', '--mode', 'apply'],
          });
          expect(opened.exitCode).toEqual(0);
          expect(opened.stdout).toContain('package: @types/is-number@7.0.5');
          const file = path.join(
            scene.dir,
            'node_modules/.pnpm_patches/@types/is-number@7.0.5/index.d.ts',
          );
          fs.writeFileSync(
            file,
            `${fs.readFileSync(file, 'utf-8')}\n// reef patch: scoped\n`,
          );
          const result = runSkill({
            cwd: scene.dir,
            args: [
              'commit',
              '--package',
              '@types/is-number',
              '--why',
              WHY,
              '--upstream',
              UPSTREAM,
              '--mode',
              'apply',
            ],
          });
          expect(result.exitCode).toEqual(0);
          expect(
            fs.readFileSync(
              path.join(scene.dir, 'patches/@types__is-number@7.0.5.patch'),
              'utf-8',
            ),
          ).toContain('reef patch: scoped');
          expect(
            fs.readFileSync(
              path.join(
                scene.dir,
                'patches/@types__is-number@7.0.5.patch.note.md',
              ),
              'utf-8',
            ),
          ).toContain('# local patch: @types/is-number@7.0.5');
          expectStableSnapshot({ result, dir: scene.dir });
        });
      });

      when('[t3] the open edit dir holds a malformed package.json', () => {
        then('commit reports a malfunction, exit 1, and writes no note', () => {
          // t1 left the is-number edit dir open
          fs.writeFileSync(
            path.join(scene.dir, EDIT_DIR_REL, 'package.json'),
            '{ not json',
          );
          const result = runSkill({
            cwd: scene.dir,
            args: [
              'commit',
              '--package',
              'is-number',
              '--why',
              WHY,
              '--upstream',
              UPSTREAM,
              '--mode',
              'apply',
            ],
          });
          expect(result.exitCode).toEqual(1);
          expect(result.stdout).toContain(
            "💥 MalfunctionError: the edit dir's package.json cannot be read",
          );
          expect(fs.existsSync(path.join(scene.dir, NOTE_REL))).toEqual(false);
          expect(
            asMaskedPnpmDetail({
              stdout: asStableOutput({ stdout: result.stdout, dir: scene.dir }),
            }),
          ).toMatchSnapshot();
        });
      });

      const sealArgs = [
        'commit',
        '--package',
        'is-number',
        '--why',
        WHY,
        '--upstream',
        UPSTREAM,
        '--mode',
        'apply',
      ];

      const failed = useWhen(
        '[t4] the patch lands but its note cannot be written',
        () => {
          const result = useThen('the seal ends in a malfunction', () => {
            // undo t3's breakage with the pristine package.json, then block the note path with a dir
            fs.copyFileSync(
              path.join(scene.dir, 'node_modules/is-number/package.json'),
              path.join(scene.dir, EDIT_DIR_REL, 'package.json'),
            );
            fs.mkdirSync(path.join(scene.dir, NOTE_REL), { recursive: true });
            const sealed = runSkill({ cwd: scene.dir, args: sealArgs });
            fs.rmdirSync(path.join(scene.dir, NOTE_REL));
            return sealed;
          });

          then(
            'commit reports a malfunction, exit 1, and keeps the edit dir open',
            () => {
              expect(result.exitCode).toEqual(1);
              expect(result.stdout).toContain(
                '💥 MalfunctionError: the patch landed but its note could not be written',
              );
              expect(result.stdout).toContain(
                'fix the cause, then rerun this commit to write it',
              );
              expect(fs.existsSync(path.join(scene.dir, PATCH_REL))).toEqual(
                true,
              );
              expect(fs.existsSync(path.join(scene.dir, EDIT_DIR_REL))).toEqual(
                true,
              );
              expect(
                asMaskedPnpmDetail({
                  stdout: asStableOutput({
                    stdout: result.stdout,
                    dir: scene.dir,
                  }),
                }),
              ).toMatchSnapshot();
            },
          );

          return result;
        },
      );

      when('[t5] the crew reruns the same commit', () => {
        const result = useThen('the rerun exits 0', () => {
          expect(failed.exitCode).toEqual(1);
          return runSkill({ cwd: scene.dir, args: sealArgs });
        });

        then('it re-seals the patch and writes the note', () => {
          expect(result.exitCode).toEqual(0);
          expect(result.stdout).toContain(`patch: ${PATCH_REL} (re-sealed)`);
          expect(
            fs.readFileSync(path.join(scene.dir, NOTE_REL), 'utf-8'),
          ).toContain(`- why: ${WHY}`);
          expect(
            fs.existsSync(path.join(scene.dir, `${PATCH_REL}.aside`)),
          ).toEqual(false);
          expectStableSnapshot({ result, dir: scene.dir });
        });
      });
    },
  );

  given('[case4] the dispatcher', () => {
    when('[t0] no subcommand is given', () => {
      then('it is refused and names the subcommands', () => {
        const result = runSkill({ cwd: __dirname, args: [] });
        expect(`${result.stdout}${result.stderr}`).toContain(
          'subcommand required',
        );
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] help is asked for', () => {
      then('it shows usage', () => {
        const result = runSkill({ cwd: __dirname, args: ['--help'] });
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] an unknown subcommand is given', () => {
      then('it is refused and names the valid ones', () => {
        const result = runSkill({ cwd: __dirname, args: ['drop'] });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('unknown subcommand: drop');
        expect(result.stdout).toContain('begin, commit, help');
        expect(result.stderr).toContain('unknown subcommand: drop');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t3] a flag is given with no value', () => {
      then('begin refuses loud, never a silent exit', () => {
        const result = runSkill({
          cwd: __dirname,
          args: ['begin', '--package'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('--package is required');
        expect(result.stdout).toMatchSnapshot();
      });

      then('commit refuses loud, never a silent exit', () => {
        const result = runSkill({
          cwd: __dirname,
          args: ['commit', '--package', 'is-number', '--why'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('--why is required');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t4] a subcommand help is asked for', () => {
      then(
        'begin --help shows each flag, required or optional, with defaults',
        () => {
          const result = runSkill({
            cwd: __dirname,
            args: ['begin', '--help'],
          });
          expect(result.exitCode).toEqual(0);
          expect(result.stdout).toContain('--package    (required)');
          expect(result.stdout).toContain('--edit-dir   (optional)');
          expect(result.stdout).toContain('plan (default)');
          expect(result.stdout).toContain(
            '└─ rhx git.package.patch begin --package rhachet@1.48.1 --mode apply',
          );
          expect(result.stdout).toMatchSnapshot();
        },
      );

      then(
        'commit --help shows each flag, required or optional, with defaults',
        () => {
          const result = runSkill({
            cwd: __dirname,
            args: ['commit', '--help'],
          });
          expect(result.exitCode).toEqual(0);
          expect(result.stdout).toContain('--why        (required)');
          expect(result.stdout).toContain('--upstream   (required)');
          expect(result.stdout).toContain('plan (default)');
          expect(result.stdout).toContain('└─ examples');
          expect(result.stdout).toContain('--why @stdin --upstream https://');
          expect(result.stdout).toMatchSnapshot();
        },
      );
    });
  });
});
