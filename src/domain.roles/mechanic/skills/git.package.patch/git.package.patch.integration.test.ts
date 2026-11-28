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
 * .what = integration tests for git.package.patch (set, get, del, and the uses meter)
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
    executable?: string;
  }): { stdout: string; stderr: string; exitCode: number } => {
    const result = spawnSync(
      'bash',
      [input.executable ?? scriptPath, ...input.args],
      {
        cwd: input.cwd,
        encoding: 'utf-8',
        input: input.stdin ?? '',
        env: {
          ...process.env,
          PATH: `${tools.binDir}${path.delimiter}${process.env.PATH ?? ''}`,
          ...input.env,
        },
        timeout: 180_000,
      },
    );
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

    when('[t0] set (open) runs in plan mode', () => {
      then('it previews the edit dir and changes naught', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['set', '--package', 'is-number'],
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
      '[t0.1] set (seal) runs before any begin, for a never-sealed package',
      () => {
        then('it is refused as no open edit dir, exit 2, and names set', () => {
          const result = runSkill({
            cwd: scene.dir,
            args: [
              'set',
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
            'rhx git.package.patch set --package is-number@7.0.0 --mode apply',
          );
          expect(fs.existsSync(path.join(scene.dir, PATCH_REL))).toEqual(false);
          expectStableSnapshot({ result, dir: scene.dir });
        });
      },
    );

    when('[t1] set (open) runs in apply mode', () => {
      then('it opens the edit dir inside the tree', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['set', '--package', 'is-number', '--mode', 'apply'],
        });
        expect(result.exitCode).toEqual(0);
        expect(
          fs.existsSync(path.join(scene.dir, EDIT_DIR_REL, 'package.json')),
        ).toEqual(true);
        // the seal hint is paste-ready: it seals, not a plan that changes naught
        expect(result.stdout).toContain(
          "rhx git.package.patch set --package is-number@7.0.0 --why '<why>' --upstream '<issue-url>' --mode apply",
        );
        expect(
          asStableOutput({ stdout: result.stdout, dir: scene.dir }),
        ).toMatchSnapshot();
      });
    });

    when('[t2] set (open) runs in apply mode again', () => {
      then('it reuses the open dir and leaves edits untouched', () => {
        editIsNumber({ dir: scene.dir });
        const result = runSkill({
          cwd: scene.dir,
          args: ['set', '--package', 'is-number', '--mode', 'apply'],
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

    when('[t3] set (seal) runs in plan mode', () => {
      const result = useThen('it exits 0', async () =>
        runSkill({
          cwd: scene.dir,
          args: [
            'set',
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
            `rhx git.package.patch set --package is-number@7.0.0 --why '${WHY}' --upstream ${UPSTREAM} --mode apply`,
          );
          expect(result.stdout).not.toContain("'<why>'");
        },
      );
    });

    when(
      '[t3.1] set (seal) runs in plan mode with a why that holds a quote',
      () => {
        then('the why stays one pasteable arg', () => {
          const result = runSkill({
            cwd: scene.dir,
            args: [
              'set',
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

    when('[t4] set (seal) runs in apply mode', () => {
      const result = useBeforeAll(async () =>
        runSkill({
          cwd: scene.dir,
          args: [
            'set',
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

    when('[t5] set (seal) reruns with the same note', () => {
      then('it is a no-op', () => {
        const before = fs.readFileSync(
          path.join(scene.dir, PATCH_REL),
          'utf-8',
        );
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'set',
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
      '[t5.1] set (seal) reruns with the same why piped via --why @stdin',
      () => {
        then('it reads the why from stdin, and is a no-op', () => {
          const before = fs.readFileSync(
            path.join(scene.dir, PATCH_REL),
            'utf-8',
          );
          const result = runSkill({
            cwd: scene.dir,
            args: [
              'set',
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

    when('[t6] set (seal) runs with --why absent', () => {
      then('it is refused with ConstraintError, exit 2', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['set', '--package', 'is-number', '--upstream', UPSTREAM],
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

    when('[t6.1] set (seal) runs with a --why that spans two lines', () => {
      then(
        'it is refused with ConstraintError, exit 2, so no note line is forged',
        () => {
          const result = runSkill({
            cwd: scene.dir,
            args: [
              'set',
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

    when('[t6.2] set (seal) runs with --why still the placeholder', () => {
      then('it is refused with ConstraintError, exit 2', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'set',
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

    when('[t7] set (seal) runs with --upstream absent', () => {
      then('it is refused with ConstraintError, exit 2', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['set', '--package', 'is-number', '--why', WHY],
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

    when('[t8] set (seal) runs with an --upstream that is not a link', () => {
      then('it is refused with ConstraintError, exit 2', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'set',
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

    when('[t9] set (seal) runs with no git identity', () => {
      then('it is refused with ConstraintError, exit 2', () => {
        const unset = spawnSync('git', ['config', '--unset', 'user.name'], {
          cwd: scene.dir,
        });
        expect(unset.status).toEqual(0);
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'set',
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

    when(
      '[t9.1] set (seal) runs with a git identity that spans two lines',
      () => {
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
                'set',
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
      },
    );

    when('[t10] set (open) runs with an --edit-dir outside the tree', () => {
      then('an absolute path under the os tmp dir is refused', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'set',
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
            'set',
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
            'set',
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

    when('[t11] set (seal) runs with an --edit-dir outside the tree', () => {
      then('it is refused with ConstraintError, exit 2', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'set',
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
      then('set (open) refuses -g', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['set', '--package', 'is-number', '-g'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('unknown flag -g');
        expect(result.stdout).toContain(
          '└─ rhx git.package.patch set --package is-number --mode apply',
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
            args: ['set', '-g', '--package', 'is-number', '--mode', 'apply'],
          });
          expect(result.exitCode).toEqual(2);
          expect(result.stdout).toContain('unknown flag -g');
          expect(result.stdout).toContain(
            '└─ rhx git.package.patch set --package is-number --mode apply',
          );
        },
      );

      then('set (seal) refuses -g', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'set',
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

    when('[t13] set (open) names a package that is not installed', () => {
      then('it is refused and names set.package.install', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['set', '--package', 'is-odd'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('is-odd is not installed');
        expect(result.stdout).toContain('rhx set.package.install');
        expectStableSnapshot({ result, dir: scene.dir });
      });

      then('set (seal) refuses it the same way', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'set',
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
      '[t13.5] set (open) names a package the manifest declares, in a tree not yet installed',
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
              args: ['set', '--package', 'is-odd'],
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
              args: ['set', '--package', 'is-number'],
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

    when('[t13.1] set (open) names a version that is not installed', () => {
      then('it is refused and names the installed versions', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['set', '--package', 'is-number@9.9.9'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('is-number@9.9.9 is not installed');
        expect(result.stdout).toContain('name an installed version: 7.0.0');
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t13.2] --mode is neither plan nor apply', () => {
      then('set (open) refuses it', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['set', '--package', 'is-number', '--mode', 'yolo'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('--mode must be plan or apply');
        expectStableSnapshot({ result, dir: scene.dir });
      });

      then('set (seal) refuses it', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'set',
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

    when('[t13.3] set (seal) runs with --package absent', () => {
      then('it is refused and names the full command', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['set', '--why', WHY, '--upstream', UPSTREAM],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('--package is required');
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t13.4] set (seal) names a version that is not installed', () => {
      then('it is refused and names the installed versions', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'set',
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

    when(
      '[t14] set (seal) reruns on a sealed patch with a different why',
      () => {
        then('it is refused, the note is untouched, and begin is named', () => {
          const noteBefore = fs.readFileSync(
            path.join(scene.dir, NOTE_REL),
            'utf-8',
          );
          const result = runSkill({
            cwd: scene.dir,
            args: [
              'set',
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
          expect(result.stdout).toContain('rhx git.package.patch set');
          expect(
            fs.readFileSync(path.join(scene.dir, NOTE_REL), 'utf-8'),
          ).toEqual(noteBefore);
          expectStableSnapshot({ result, dir: scene.dir });
        });
      },
    );

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
              args: ['set', '--package', 'is-number', '--mode', 'apply'],
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
                'set',
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

    when('[t16] set (open) plans while the edit dir is still open', () => {
      then('it previews a reuse, over the prior patch', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['set', '--package', 'is-number'],
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
      '[t17] set (seal) plans while the edit dir is open over the prior patch',
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
                'set',
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
      then('set (open) is refused before any path is built, exit 2', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['set', '--package', '../reef-escape'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: --package is not a valid package name',
        );
        expectStableSnapshot({ result, dir: scene.dir });
      });

      then('set (seal) is refused before any path is built, exit 2', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'set',
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

      then('set (open) refuses to reuse it, exit 2', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['set', '--package', 'is-number', '--edit-dir', scratch.rel],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('it is not an edit dir');
        expectStableSnapshot({ result, dir: scene.dir });
      });

      then(
        'set (seal) refuses to seal it, and the dir survives, exit 2',
        () => {
          const result = runSkill({
            cwd: scene.dir,
            args: [
              'set',
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
        },
      );
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

      then('set (open) refuses to reuse it, exit 2', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['set', '--package', 'is-number', '--edit-dir', odd.rel],
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

      then(
        'set (seal) refuses to seal it, and the dir survives, exit 2',
        () => {
          const result = runSkill({
            cwd: scene.dir,
            args: [
              'set',
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
        },
      );
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

      then(
        'set (open) refuses it, so no edit can reach the shared store',
        () => {
          const result = runSkill({
            cwd: scene.dir,
            args: [
              'set',
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
        },
      );

      then('set (seal) refuses it, and the live install survives', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'set',
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

      then('set (open) refuses it, exit 2', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['set', '--package', 'is-number', '--edit-dir', broken.rel],
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
                'set',
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

    when('[t0] set (open) names a bare package', () => {
      then('it is refused and lists the installed versions', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['set', '--package', 'is-number'],
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

    when('[t1] set (open) names a version', () => {
      then('it plans with that version', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['set', '--package', 'is-number@6.0.0'],
        });
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).toContain('package: is-number@6.0.0');
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when(
      '[t1.1] set (seal) names a bare package and no edit dir is open',
      () => {
        then('it is refused, lists the versions, and names set', () => {
          const result = runSkill({
            cwd: scene.dir,
            args: [
              'set',
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
            'rhx git.package.patch set --package is-number@7.0.0 --mode apply',
          );
          expectStableSnapshot({ result, dir: scene.dir });
        });
      },
    );

    when(
      '[t1.2] set (seal) names a bare package through a custom --edit-dir that was never opened',
      () => {
        then(
          'it is refused: no open edit dir, and begin is named with the dir',
          () => {
            const result = runSkill({
              cwd: scene.dir,
              args: [
                'set',
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
              'rhx git.package.patch set --package is-number --edit-dir reef-never --mode apply',
            );
            expect(fs.existsSync(path.join(scene.dir, 'reef-never'))).toEqual(
              false,
            );
            expectStableSnapshot({ result, dir: scene.dir });
          },
        );
      },
    );

    when('[t2] set (open) applies the named version', () => {
      then('it opens that version, not the other', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['set', '--package', 'is-number@6.0.0', '--mode', 'apply'],
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

    when('[t3] set (seal) applies with no edits made', () => {
      then('it is refused: no edits to seal, and no note is written', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'set',
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
          args: ['set', '--package', 'is-number@6.0.0', '--mode', 'apply'],
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
            'set',
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

    when('[t5] set (seal) names a version the edit dir does not hold', () => {
      then('it is refused and names the version the dir holds', () => {
        // clamp: commit once trusted the dir over --package and sealed 6.0.0 as asked-for 7.0.0
        const opened = runSkill({
          cwd: scene.dir,
          args: [
            'set',
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
            'set',
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

    when('[t6] set (seal) names a package the edit dir does not hold', () => {
      then('it is refused and names the package the dir holds', () => {
        const opened = runSkill({
          cwd: scene.dir,
          args: [
            'set',
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
            'set',
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
          args: ['set', '--package', 'is-number@7.0.0', '--mode', 'apply'],
        });
        const openSix = runSkill({
          cwd: scene.dir,
          args: ['set', '--package', 'is-number@6.0.0', '--mode', 'apply'],
        });
        expect(openSeven.exitCode).toEqual(0);
        expect(openSix.exitCode).toEqual(0);
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'set',
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
                'set',
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
              "rhx git.package.patch set --package is-number@7.0.0 --why '<why>' --upstream '<issue-url>' --edit-dir reef-seal --mode apply",
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
                'set',
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
        'set',
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
                'set',
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
              "rhx git.package.patch set --package is-number@7.0.0 --why '<why>' --upstream '<issue-url>' --edit-dir reef-seal --mode apply",
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

      when('[t1] the crew reruns the exact same set', () => {
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
      when(`[t0] set (open) runs beside ${lockfile}`, () => {
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
            args: ['set', '--package', 'is-number'],
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

    when('[t0] set (open) runs', () => {
      then('it is refused as pnpm-only', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['set', '--package', 'is-number'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('pnpm patch is pnpm-only');
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t1] set (seal) runs', () => {
      then('it is refused as pnpm-only', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'set',
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
      then('set (open) is refused', () => {
        const result = runSkill({
          cwd: scene.outside,
          args: ['set', '--package', 'is-number'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('not inside a git repo');
        expectStableSnapshot({ result, dir: scene.outside });
      });

      then('set (seal) is refused', () => {
        const result = runSkill({
          cwd: scene.outside,
          args: [
            'set',
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
      then('set (open) is refused', () => {
        const result = runSkill({
          cwd: scene.bare,
          args: ['set', '--package', 'is-number'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('the git root holds no package.json');
        expectStableSnapshot({ result, dir: scene.bare });
      });

      then('set (seal) is refused', () => {
        const result = runSkill({
          cwd: scene.bare,
          args: [
            'set',
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

      then('set (open) is refused, and naught lands outside', () => {
        const result = runSkill({
          cwd: linked.dir,
          args: ['set', '--package', 'is-number', '--mode', 'apply'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain(
          'the edit dir must sit inside the tree',
        );
        expect(fs.readdirSync(linked.outside)).toEqual([]);
        expectStableSnapshot({ result, dir: linked.dir });
      });

      then('set (seal) is refused, and naught lands outside', () => {
        const result = runSkill({
          cwd: linked.dir,
          args: [
            'set',
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

      then('set (open) reports a malfunction, exit 1', () => {
        const result = runSkill({
          cwd: broken.dir,
          args: ['set', '--package', 'is-number'],
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

      then('set (open) is refused before any write, exit 2', () => {
        const result = runSkill({
          cwd: hoisted.dir,
          args: ['set', '--package', 'is-number', '--mode', 'apply'],
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

      then('set (seal) is refused, and the manifest is unchanged', () => {
        const pkgBefore = fs.readFileSync(
          path.join(hoisted.dir, 'package.json'),
          'utf-8',
        );
        const result = runSkill({
          cwd: hoisted.dir,
          args: [
            'set',
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

        then('set (open) is refused before any write, exit 2', () => {
          const result = runSkill({
            cwd: hoistedYaml.dir,
            args: ['set', '--package', 'is-number', '--mode', 'apply'],
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

      then('set (open) is refused before any write, exit 2', () => {
        const result = runSkill({
          cwd: hoistedNote.dir,
          args: ['set', '--package', 'is-number', '--mode', 'apply'],
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
          args: ['set', '--package', 'is-odd', '--mode', 'apply'],
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
            'set',
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
            args: ['set', '--package', 'is-number@7.0.0', '--mode', 'apply'],
          });
          expect(opened.exitCode).toEqual(0);
          editIsNumber({ dir: scene.dir });
          // CI=true makes a bare pnpm install frozen; the seal's lockfile settle must still land
          const sealed = runSkill({
            cwd: scene.dir,
            args: [
              'set',
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
      '[t0] set (seal) seals while package.json names a dependency no registry holds',
      () => {
        const result = useThen('the seal fails, exit 1', () => {
          const opened = runSkill({
            cwd: scene.dir,
            args: ['set', '--package', 'is-number', '--mode', 'apply'],
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
              'set',
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
          expect(result.stdout).toContain('then rerun this set');
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
        'set',
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
            args: ['set', '--package', 'is-number', '--mode', 'apply'],
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
              args: ['set', '--package', 'is-number', '--mode', 'apply'],
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
      then('set (open) and commit both refuse it, exit 2', () => {
        const opened = runSkill({
          cwd: scene.dir,
          args: ['set', '--package', 'is-number', '--edit-dir', 'patches'],
        });
        expect(opened.stdout).toContain('the patches dir');
        expect(opened.exitCode).toEqual(2);
        const sealed = runSkill({
          cwd: scene.dir,
          args: [
            'set',
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
        then(
          'set (open) refuses it at the bound, exit 2, before any mkdir',
          () => {
            const outside = path.join(
              os.tmpdir(),
              `reef-absent-${Date.now()}-${process.pid}`,
            );
            fs.symlinkSync(outside, path.join(scene.dir, 'reef-link'));
            const opened = runSkill({
              cwd: scene.dir,
              args: [
                'set',
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
          },
        );
      },
    );

    when("[t2] an open edit dir's package.json name carries a newline", () => {
      then('set (open) refuses it, exit 2, and prints no raw name', () => {
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
          args: ['set', '--package', 'is-number', '--edit-dir', 'reef-hostile'],
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
            args: ['set', '--package', 'is-number', '--edit-dir', 'a>b\\c'],
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
              args: ['set', '--package', 'is-number'],
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
      'set',
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
      '[t0] set (seal) seals while pnpm writes no lockfile',
      () => {
        const result = useThen('the seal ends in a malfunction, exit 1', () => {
          const opened = runSkill({
            cwd: scene.dir,
            args: ['set', '--package', 'is-number', '--mode', 'apply'],
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
          expect(result.stdout).toContain('then rerun this same set');
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

    when('[t1] the crew drops lockfile=false and reruns the same set', () => {
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
    });
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
        '[t0] set (open) names a package on disk that pnpm never installed',
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
                args: ['set', '--package', 'reef-ghost', '--mode', 'apply'],
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

      when('[t1] set (seal) seals while the patches dir is a file', () => {
        then(
          'pnpm patch-commit fails, and the verb reports a malfunction, exit 1',
          () => {
            const opened = runSkill({
              cwd: scene.dir,
              args: ['set', '--package', 'is-number', '--mode', 'apply'],
            });
            expect(opened.exitCode).toEqual(0);
            editIsNumber({ dir: scene.dir });
            fs.writeFileSync(path.join(scene.dir, 'patches'), 'not a dir\n');
            const result = runSkill({
              cwd: scene.dir,
              args: [
                'set',
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
            args: ['set', '--package', '@types/is-number', '--mode', 'apply'],
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
              'set',
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
        then(
          'set (seal) reports a malfunction, exit 1, and writes no note',
          () => {
            // t1 left the is-number edit dir open
            fs.writeFileSync(
              path.join(scene.dir, EDIT_DIR_REL, 'package.json'),
              '{ not json',
            );
            const result = runSkill({
              cwd: scene.dir,
              args: [
                'set',
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
            expect(fs.existsSync(path.join(scene.dir, NOTE_REL))).toEqual(
              false,
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
      });

      const sealArgs = [
        'set',
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
                'fix the cause, then rerun this set to write it',
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

      when('[t5] the crew reruns the same set', () => {
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
        expect(result.stdout).toContain('use one of: set, get, del, help');
        expect(result.stderr).toContain('unknown subcommand: drop');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t3] a flag is given with no value', () => {
      then('set (open) refuses loud, never a silent exit', () => {
        const result = runSkill({
          cwd: __dirname,
          args: ['set', '--package'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('--package is required');
        expect(result.stdout).toMatchSnapshot();
      });

      then('set (seal) refuses loud, never a silent exit', () => {
        const result = runSkill({
          cwd: __dirname,
          args: ['set', '--package', 'is-number', '--why'],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('--why is required');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t4] a subcommand help is asked for', () => {
      then(
        'set --help names both phases and each flag, required or optional, with defaults',
        () => {
          const result = runSkill({
            cwd: __dirname,
            args: ['set', '--help'],
          });
          expect(result.exitCode).toEqual(0);
          expect(result.stdout).toContain('open   no --why, no --upstream');
          expect(result.stdout).toContain('seal   --why + --upstream');
          expect(result.stdout).toContain('--package    (required)');
          expect(result.stdout).toContain('--why        (seal)');
          expect(result.stdout).toContain('--upstream   (seal)');
          expect(result.stdout).toContain('--edit-dir   (optional)');
          expect(result.stdout).toContain('plan (default)');
          expect(result.stdout).toContain('└─ examples');
          expect(result.stdout).toContain('--why @stdin --upstream https://');
          expect(result.stdout).toMatchSnapshot();
        },
      );

      then('get --help names --when and each state', () => {
        const result = runSkill({ cwd: __dirname, args: ['get', '--help'] });
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).toContain('--when   (optional) hook.onStop');
        expect(result.stdout).toContain('underapplied');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * .what = run the provisioned pnpm in a dir
   * .why = the lifecycle cases drive the install the way an upgrade would
   */
  const runPnpm = (input: {
    cwd: string;
    args: string[];
    env?: Record<string, string>;
  }): { stdout: string; stderr: string; exitCode: number } => {
    const result = spawnSync(path.join(tools.binDir, 'pnpm'), input.args, {
      cwd: input.cwd,
      encoding: 'utf-8',
      env: { ...process.env, ...input.env },
      timeout: 180_000,
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  /**
   * .what = run the mechanic's onStop hook in a dir, as claude code would
   */
  const runStopHook = (input: {
    cwd: string;
  }): { stdout: string; stderr: string; exitCode: number } => {
    const hookPath = path.join(
      __dirname,
      '../../inits/claude.hooks/stop.git-package-patch.sh',
    );
    const result = spawnSync('bash', [hookPath], {
      cwd: input.cwd,
      encoding: 'utf-8',
      input: '{"hook_event_name":"Stop"}',
      env: {
        ...process.env,
        PATH: `${tools.binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
      timeout: 60_000,
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  given(
    '[case10] a sealed patch on is-number@6.0.0, then an upgrade past it',
    () => {
      const scene = useBeforeAll(async () => ({
        dir: genPnpmRepo({
          slug: 'git-package-patch-lifecycle',
          dependencies: { 'is-number': '6.0.0' },
        }),
      }));
      const PATCH_LIFE_REL = 'patches/is-number@6.0.0.patch';

      when('[t0] the patch is opened, edited, and sealed', () => {
        const sealed = useThen('the seal exits 0', async () => {
          const opened = runSkill({
            cwd: scene.dir,
            args: ['set', '--package', 'is-number', '--mode', 'apply'],
          });
          if (opened.exitCode !== 0)
            throw new MalfunctionError('begin is-number@6.0.0 failed', {
              stdout: opened.stdout,
            });
          const file = path.join(scene.dir, EDIT_DIR_V6_REL, 'index.js');
          fs.writeFileSync(
            file,
            `${fs.readFileSync(file, 'utf-8')}\n// reef patch: local fix\n`,
          );
          return runSkill({
            cwd: scene.dir,
            args: [
              'set',
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
        });

        then('the seal writes the upgrade-safe keys', () => {
          expect(sealed.exitCode).toEqual(0);
          expect(sealed.stdout).toContain('├─ upgrade-safe: yes');
          const workspace = fs.readFileSync(
            path.join(scene.dir, 'pnpm-workspace.yaml'),
            'utf-8',
          );
          expect(workspace).toContain('allowUnusedPatches: true');
          expect(workspace).toContain('ignorePatchFailures: true');
          expectStableSnapshot({ result: sealed, dir: scene.dir });
        });

        then('a frozen install under CI=true still lands', () => {
          const frozen = runPnpm({
            cwd: scene.dir,
            args: ['install', '--frozen-lockfile'],
            env: { CI: 'true' },
          });
          expect(frozen.exitCode).toEqual(0);
        });
      });

      when('[t1] get runs while the patch applies', () => {
        then(
          'by hand, it exits 0 and names the patch applied, with its note',
          () => {
            const result = runSkill({ cwd: scene.dir, args: ['get'] });
            expect(result.exitCode).toEqual(0);
            expect(result.stdout).toContain('├─ is-number@6.0.0: applied');
            expect(result.stdout).toContain(`patch: ${PATCH_LIFE_REL}`);
            expect(result.stdout).toContain(`why: ${WHY}`);
            expect(result.stdout).toContain(`upstream: ${UPSTREAM}`);
            expect(result.stdout).toContain('└─ upgrade-safe: yes');
            expectStableSnapshot({ result, dir: scene.dir });
          },
        );
      });

      when('[t2] the onStop hook runs while the patch applies', () => {
        then('the onStop hook is silent', () => {
          const result = runStopHook({ cwd: scene.dir });
          expect(result.exitCode).toEqual(0);
          expect(result.stdout).toEqual('');
        });
      });

      when(
        '[t2.1] the upgrade-safe keys are stripped, and the package is upgraded',
        () => {
          then(
            'the stale patch fails the install (the clamp the keys cure)',
            () => {
              const workspacePath = path.join(scene.dir, 'pnpm-workspace.yaml');
              const workspace = fs.readFileSync(workspacePath, 'utf-8');
              fs.writeFileSync(
                workspacePath,
                workspace
                  .split('\n')
                  .filter(
                    (line) =>
                      !line.startsWith('allowUnusedPatches:') &&
                      !line.startsWith('ignorePatchFailures:'),
                  )
                  .join('\n'),
              );
              const result = runPnpm({
                cwd: scene.dir,
                args: ['add', 'is-number@7.0.0'],
              });
              fs.writeFileSync(workspacePath, workspace);
              expect(result.exitCode).not.toEqual(0);
            },
          );
        },
      );

      when('[t3] the package is upgraded past the patched version', () => {
        then('the install lands, with no patch failure', () => {
          const result = runPnpm({
            cwd: scene.dir,
            args: ['add', 'is-number@7.0.0'],
          });
          expect(result.exitCode).toEqual(0);
        });
      });

      when('[t4] get runs after the upgrade', () => {
        then(
          'by hand, it exits 2 and names the stale patch with its repair',
          () => {
            const result = runSkill({ cwd: scene.dir, args: ['get'] });
            expect(result.exitCode).toEqual(2);
            expect(result.stdout).toContain('├─ is-number@6.0.0: underapplied');
            expect(result.stdout).toContain(
              'rhx git.package.patch set --package is-number@7.0.0 --mode apply',
            );
            expect(result.stdout).toContain(
              'rhx git.package.patch del --package is-number@6.0.0 --mode apply',
            );
            expect(result.stderr).toContain('✋ ConstraintError');
            expectStableSnapshot({ result, dir: scene.dir });
          },
        );

        then(
          'the onStop hook nudges with the repair, and lets the stop through',
          () => {
            const result = runStopHook({ cwd: scene.dir });
            expect(result.exitCode).toEqual(0);
            expect(result.stdout).toContain(
              '🐢 heads up, a local patch needs repair',
            );
            expect(result.stdout).toContain(
              'rhx git.package.patch del --package is-number@6.0.0 --mode apply',
            );
            expectStableSnapshot({ result, dir: scene.dir });
          },
        );
      });

      when('[t5] del runs in plan mode', () => {
        then('it names what it would retire, and changes naught', () => {
          const result = runSkill({
            cwd: scene.dir,
            args: ['del', '--package', 'is-number'],
          });
          expect(result.exitCode).toEqual(0);
          expect(result.stdout).toContain(
            'would drop entry: patchedDependencies[is-number@6.0.0] in pnpm-workspace.yaml',
          );
          expect(fs.existsSync(path.join(scene.dir, PATCH_LIFE_REL))).toEqual(
            true,
          );
          expectStableSnapshot({ result, dir: scene.dir });
        });
      });

      when('[t6] del runs in apply mode', () => {
        const result = useThen('it exits 0', async () =>
          runSkill({
            cwd: scene.dir,
            args: ['del', '--package', 'is-number', '--mode', 'apply'],
          }),
        );

        then('the entry, the patch, and the note are gone', () => {
          expect(result.exitCode).toEqual(0);
          expect(fs.existsSync(path.join(scene.dir, PATCH_LIFE_REL))).toEqual(
            false,
          );
          expect(
            fs.existsSync(path.join(scene.dir, `${PATCH_LIFE_REL}.note.md`)),
          ).toEqual(false);
          expect(
            fs.readFileSync(
              path.join(scene.dir, 'pnpm-workspace.yaml'),
              'utf-8',
            ),
          ).not.toContain('patchedDependencies');
          expect(
            fs.readFileSync(path.join(scene.dir, 'pnpm-lock.yaml'), 'utf-8'),
          ).not.toContain(PATCH_LIFE_REL);
          expectStableSnapshot({ result, dir: scene.dir });
        });
      });

      when('[t7] del runs again, and get after it', () => {
        then('del is a no-op', () => {
          const result = runSkill({
            cwd: scene.dir,
            args: ['del', '--package', 'is-number', '--mode', 'apply'],
          });
          expect(result.exitCode).toEqual(0);
          expect(result.stdout).toContain(
            'no patch for is-number; naught changed',
          );
        });

        then('get names no patch', () => {
          const result = runSkill({ cwd: scene.dir, args: ['get'] });
          expect(result.exitCode).toEqual(0);
          expect(result.stdout).toContain('└─ patches: none');
        });
      });
    },
  );

  given(
    '[case11] an installed is-number@7.0.0 with one patch in each stale state, and no upgrade-safe keys',
    () => {
      /**
       * .what = a patch whose added line is the last line of the installed file
       * .why  = it reverse-applies to 7.0.0, so 7.0.0 already holds the change
       */
      const asPatchHeldBy = (input: { content: string }): string => {
        const body = input.content.replace(/\n$/, '').split('\n');
        const context = body.slice(0, -1);
        return [
          'diff --git a/index.js b/index.js',
          '--- a/index.js',
          '+++ b/index.js',
          `@@ -1,${context.length} +1,${body.length} @@`,
          ...context.map((line) => ` ${line}`),
          `+${body[body.length - 1]}`,
          '',
        ].join('\n');
      };
      const PATCH_HUNK_FAILS = [
        'diff --git a/index.js b/index.js',
        '--- a/index.js',
        '+++ b/index.js',
        '@@ -1,1 +1,2 @@',
        ' // a reef line this file never held',
        '+// reef patch',
        '',
      ].join('\n');

      const scene = useBeforeAll(async () => {
        const dir = genPnpmRepo({
          slug: 'git-package-patch-stale-states',
          dependencies: { 'is-number': '7.0.0' },
        });
        const installed = fs.readFileSync(
          path.join(dir, 'node_modules/is-number/index.js'),
          'utf-8',
        );
        fs.mkdirSync(path.join(dir, 'patches'), { recursive: true });
        fs.writeFileSync(
          path.join(dir, 'patches/is-number@6.0.0.patch'),
          asPatchHeldBy({ content: installed }),
        );
        fs.writeFileSync(
          path.join(dir, 'patches/is-number@7.0.0.patch'),
          PATCH_HUNK_FAILS,
        );
        fs.writeFileSync(
          path.join(dir, 'patches/left-pad@1.3.0.patch'),
          PATCH_HUNK_FAILS,
        );
        fs.writeFileSync(
          path.join(dir, 'patches/kind-of@6.0.3.patch'),
          PATCH_HUNK_FAILS,
        );
        fs.writeFileSync(
          path.join(dir, 'pnpm-workspace.yaml'),
          [
            'patchedDependencies:',
            '  is-number@6.0.0: patches/is-number@6.0.0.patch',
            '  is-number@7.0.0: patches/is-number@7.0.0.patch',
            '  is-odd@3.0.1: patches/is-odd@3.0.1.patch',
            '',
          ].join('\n'),
        );
        const packageJson = JSON.parse(
          fs.readFileSync(path.join(dir, 'package.json'), 'utf-8'),
        ) as Record<string, unknown>;
        fs.writeFileSync(
          path.join(dir, 'package.json'),
          JSON.stringify(
            {
              ...packageJson,
              pnpm: {
                patchedDependencies: {
                  'left-pad@1.3.0': 'patches/left-pad@1.3.0.patch',
                },
              },
            },
            null,
            2,
          ),
        );
        return { dir };
      });

      when('[t0] get runs', () => {
        then(
          'it exits 2 and names each stale state with its repair, and the absent upgrade-safe keys',
          () => {
            const result = runSkill({ cwd: scene.dir, args: ['get'] });
            expect(result.exitCode).toEqual(2);
            expect(result.stdout).toContain('├─ is-number@6.0.0: obsolete');
            expect(result.stdout).toContain('├─ is-number@7.0.0: underapplied');
            expect(result.stdout).toContain(
              'a hunk no longer fits the installed is-number@7.0.0',
            );
            expect(result.stdout).toContain('├─ is-odd@3.0.1: unbacked');
            expect(result.stdout).toContain('├─ left-pad@1.3.0: unused');
            expect(result.stdout).toContain('├─ kind-of@6.0.3: unrecorded');
            expect(result.stdout).toContain('└─ upgrade-safe: no');
            expect(result.stdout).toContain(
              'repair: add allowUnusedPatches: true + ignorePatchFailures: true to pnpm-workspace.yaml',
            );
            expect(result.stdout).toContain('entry: package.json');
            expect(result.stdout).toContain('entry: none');
            expect(result.stdout).toContain('note: absent');
            expectStableSnapshot({ result, dir: scene.dir });
          },
        );
      });

      when('[t3] del names a bare package with two patches', () => {
        then('it is refused, exit 2, and both are named', () => {
          const result = runSkill({
            cwd: scene.dir,
            args: ['del', '--package', 'is-number', '--mode', 'apply'],
          });
          expect(result.exitCode).toEqual(2);
          expect(result.stdout).toContain('patched: is-number@6.0.0');
          expect(result.stdout).toContain('patched: is-number@7.0.0');
          expectStableSnapshot({ result, dir: scene.dir });
        });
      });

      when('[t4] del retires the unrecorded patch file', () => {
        then(
          'the file goes, the upgrade-safe keys land, and no install runs',
          () => {
            const result = runSkill({
              cwd: scene.dir,
              args: ['del', '--package', 'kind-of', '--mode', 'apply'],
            });
            expect(result.exitCode).toEqual(0);
            expect(
              fs.existsSync(
                path.join(scene.dir, 'patches/kind-of@6.0.3.patch'),
              ),
            ).toEqual(false);
            expect(result.stdout).toContain('pnpm-workspace.yaml');
            expect(result.stdout).not.toContain('pnpm-lock.yaml');
            expectStableSnapshot({ result, dir: scene.dir });
          },
        );
      });

      when('[t5] del retires the unbacked entry, by version', () => {
        then(
          'pnpm-workspace.yaml drops it and keeps the others, and its reinstall lands past the stale ones',
          () => {
            const result = runSkill({
              cwd: scene.dir,
              args: ['del', '--package', 'is-odd@3.0.1', '--mode', 'apply'],
            });
            expect(result.exitCode).toEqual(0);
            const workspace = fs.readFileSync(
              path.join(scene.dir, 'pnpm-workspace.yaml'),
              'utf-8',
            );
            expect(workspace).not.toContain('is-odd');
            expect(workspace).toContain(
              'is-number@7.0.0: patches/is-number@7.0.0.patch',
            );
            expect(workspace).toContain('allowUnusedPatches: true');
            expectStableSnapshot({ result, dir: scene.dir });
          },
        );
      });

      when('[t6] del retires the package.json entry', () => {
        then('package.json drops its emptied pnpm field', () => {
          const result = runSkill({
            cwd: scene.dir,
            args: ['del', '--package', 'left-pad', '--mode', 'apply'],
          });
          expect(result.exitCode).toEqual(0);
          const packageJson = JSON.parse(
            fs.readFileSync(path.join(scene.dir, 'package.json'), 'utf-8'),
          ) as Record<string, unknown>;
          expect(packageJson.pnpm).toBeUndefined();
          expect(
            fs.existsSync(path.join(scene.dir, 'patches/left-pad@1.3.0.patch')),
          ).toEqual(false);
        });
      });
    },
  );

  given('[case12] a repo with no patch at all', () => {
    const scene = useBeforeAll(async () => ({
      dir: genOnDiskRepo({ slug: 'git-package-patch-no-patch' }),
    }));

    when('[t0] get runs by hand and via the onStop hook', () => {
      then('by hand, it exits 0 and names no patch', () => {
        const result = runSkill({ cwd: scene.dir, args: ['get'] });
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).toContain('└─ patches: none');
      });

      then('the hook is silent and exits 0', () => {
        const result = runStopHook({ cwd: scene.dir });
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).toEqual('');
      });
    });

    when('[t1] the hook runs outside any git repo', () => {
      then('it is silent and exits 0', () => {
        const result = runStopHook({ cwd: os.tmpdir() });
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).toEqual('');
      });
    });
  });

  given('[case13] a gated package (rhachet-roles-bhrain) on disk', () => {
    const USES_PATH = path.join(__dirname, 'git.package.patch.uses.sh');
    const GATED = 'rhachet-roles-bhrain';
    const GRANT_WHY = 'hold the review guard quiet until bhrain#88 ships';
    const AS_CLONE = { __I_AM_HUMAN: '' };
    const AS_HUMAN = { __I_AM_HUMAN: 'true' };
    const scene = useBeforeAll(async () => {
      const dir = genOnDiskRepo({ slug: 'git-package-patch-gated' });
      const pkgDir = path.join(dir, 'node_modules', GATED);
      fs.mkdirSync(pkgDir, { recursive: true });
      fs.writeFileSync(
        path.join(pkgDir, 'package.json'),
        JSON.stringify({ name: GATED, version: '1.0.0' }),
      );
      return {
        dir,
        meter: path.join(dir, '.meter/git.package.patch.uses.jsonc'),
      };
    });
    const readMeter = (): {
      packages: Record<string, { allowed: boolean; why?: string; at: string }>;
    } => JSON.parse(fs.readFileSync(scene.meter, 'utf-8'));

    when('[t0] a clone asks to allow it', () => {
      then('it is refused, and no meter is written', () => {
        const result = runSkill({
          cwd: scene.dir,
          executable: USES_PATH,
          args: ['allow', '--package', GATED, '--why', GRANT_WHY],
          env: AS_CLONE,
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('ConstraintError');
        expect(result.stdout).not.toContain('MalfunctionError');
        expect(fs.existsSync(scene.meter)).toEqual(false);
      });
    });

    when('[t1] set (open) names it with no grant', () => {
      then('it is refused with the upstream and the grant as the fix', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['set', '--package', GATED],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain(
          `${GATED} grades or gates this tree; a clone never patches it here without a human's grant`,
        );
        expect(result.stdout).toContain(`--into ehmpathy/${GATED}`);
        expect(result.stdout).toContain(
          `└─ rhx git.package.patch.uses allow --package ${GATED} --why '<why>'`,
        );
        expect(result.stderr).toContain('grades or gates this tree');
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t2] set (seal) names it with no grant', () => {
      then('it is refused the same way', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: [
            'set',
            '--package',
            GATED,
            '--why',
            WHY,
            '--upstream',
            UPSTREAM,
          ],
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('grades or gates this tree');
      });
    });

    when('[t3] a human allows it with no --why', () => {
      then('it is refused, and no meter is written', () => {
        const result = runSkill({
          cwd: scene.dir,
          executable: USES_PATH,
          args: ['allow', '--package', GATED],
          env: AS_HUMAN,
        });
        expect(result.stdout).toContain('--why is required');
        expect(result.exitCode).toEqual(2);
        expect(fs.existsSync(scene.meter)).toEqual(false);
      });
    });

    when('[t4] a human allows it with a version', () => {
      then('it is refused; a grant names the package bare', () => {
        const result = runSkill({
          cwd: scene.dir,
          executable: USES_PATH,
          args: ['allow', '--package', `${GATED}@1.0.0`, '--why', GRANT_WHY],
          env: AS_HUMAN,
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain('--package names a package bare');
        expect(fs.existsSync(scene.meter)).toEqual(false);
      });
    });

    when('[t5] a human allows an ungated package', () => {
      then('it is refused; the package needs no grant', () => {
        const result = runSkill({
          cwd: scene.dir,
          executable: USES_PATH,
          args: ['allow', '--package', 'is-number', '--why', GRANT_WHY],
          env: AS_HUMAN,
        });
        expect(result.exitCode).toEqual(2);
        expect(result.stdout).toContain(
          'is-number is not gated, so it needs no grant',
        );
      });
    });

    when('[t6] a human allows it with a why', () => {
      then('the grant lands in a gitignored meter', () => {
        const result = runSkill({
          cwd: scene.dir,
          executable: USES_PATH,
          args: ['allow', '--package', GATED, '--why', GRANT_WHY],
          env: AS_HUMAN,
        });
        expect(result.exitCode).toEqual(0);
        expect(readMeter().packages[GATED]).toMatchObject({
          allowed: true,
          why: GRANT_WHY,
        });
        expect(
          fs.readFileSync(path.join(scene.dir, '.meter/.gitignore'), 'utf-8'),
        ).toContain('*');
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t7] get runs', () => {
      then('it names each gated package and its grant', () => {
        const result = runSkill({
          cwd: scene.dir,
          executable: USES_PATH,
          args: ['get'],
        });
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).toContain(`${GATED}: granted: ${GRANT_WHY}`);
        expect(result.stdout).toContain('rhachet: blocked (no grant)');
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t8] set (open) names it after the grant', () => {
      then('it is admitted, and the plan names the grant', () => {
        const result = runSkill({
          cwd: scene.dir,
          args: ['set', '--package', GATED],
        });
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).toContain(
          `├─ grant: a human admits this gated package: ${GRANT_WHY}`,
        );
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

    when('[t9] a human blocks it again', () => {
      then(
        'the grant is withdrawn, its why kept, and begin refuses again',
        () => {
          const blocked = runSkill({
            cwd: scene.dir,
            executable: USES_PATH,
            args: ['block', '--package', GATED],
            env: AS_HUMAN,
          });
          expect(blocked.exitCode).toEqual(0);
          expect(readMeter().packages[GATED]).toMatchObject({
            allowed: false,
            why: GRANT_WHY,
          });
          const result = runSkill({
            cwd: scene.dir,
            args: ['set', '--package', GATED],
          });
          expect(result.exitCode).toEqual(2);
          expect(result.stdout).toContain('grades or gates this tree');
        },
      );
    });

    when('[t10] the meter is not json', () => {
      then(
        'set (open) fails loud as a malfunction, never as "no grant"',
        () => {
          fs.writeFileSync(scene.meter, '{ reef: ');
          const result = runSkill({
            cwd: scene.dir,
            args: ['set', '--package', GATED],
          });
          expect(result.exitCode).toEqual(1);
          expect(result.stdout).toContain(
            '💥 MalfunctionError: the grant meter .meter/git.package.patch.uses.jsonc cannot be read',
          );
        },
      );
    });
  });

  given(
    '[case14] a sealed patch on is-number@7.0.0, whose installed copy then gets an edit in place',
    () => {
      const INSTALL_PATH = path.join(
        __dirname,
        '../set.package/set.package.install.sh',
      );
      const scene = useBeforeAll(async () => {
        const dir = genPnpmRepo({
          slug: 'git-package-patch-install-guard',
          dependencies: { 'is-number': '7.0.0' },
        });
        const opened = runSkill({
          cwd: dir,
          args: ['set', '--package', 'is-number', '--mode', 'apply'],
        });
        if (opened.exitCode !== 0)
          throw new MalfunctionError('begin is-number@7.0.0 failed', {
            stdout: opened.stdout,
          });
        editIsNumber({ dir });
        const sealed = runSkill({
          cwd: dir,
          args: [
            'set',
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
        if (sealed.exitCode !== 0)
          throw new MalfunctionError('seal is-number@7.0.0 failed', {
            stdout: sealed.stdout,
          });
        const installed = path.join(dir, 'node_modules/is-number/index.js');
        return {
          dir,
          installed,
          sealedContent: fs.readFileSync(installed, 'utf-8'),
        };
      });

      /**
       * .what = replace the installed copy's index.js with new content
       * .why  = pnpm hardlinks a package's files from its global cache; an
       *         in-place write would edit the cache, so unlink first
       */
      const setInstalledContent = (input: { content: string }): void => {
        fs.rmSync(scene.installed);
        fs.writeFileSync(scene.installed, input.content);
      };

      /**
       * .what = run set.package.install in the scene, with pnpm on PATH
       */
      const runInstall = (): {
        stdout: string;
        stderr: string;
        exitCode: number;
      } =>
        runSkill({
          cwd: scene.dir,
          executable: INSTALL_PATH,
          args: [
            '--package',
            'is-odd',
            '--at',
            '3.0.1',
            '--for',
            'prod',
            '--reason',
            'reef check: an odd wave count',
          ],
        });

      when('[t0] the installed copy carries an edit its patch lacks', () => {
        const result = useThen('install runs', async () => {
          setInstalledContent({
            content: `${scene.sealedContent}\n// reef edit: never sealed\n`,
          });
          return runInstall();
        });

        then('it exits 2 and names the unsaved file', () => {
          expect(result.exitCode).toEqual(2);
          expect(result.stdout).toContain('unsaved edits');
          expect(result.stdout).toContain('is-number@7.0.0');
          expect(result.stdout).toContain('index.js');
          expect(result.stderr).toContain(
            'a patched installed copy has an edit its patch lacks',
          );
        });

        then('the hint names the seal path', () => {
          expect(result.stdout).toContain(
            'rhx git.package.patch set --package is-number@7.0.0 --mode apply',
          );
        });

        then('naught is written: no new dep, the edit kept', () => {
          const pkgJson = JSON.parse(
            fs.readFileSync(path.join(scene.dir, 'package.json'), 'utf-8'),
          );
          expect(pkgJson.dependencies['is-odd']).toBeUndefined();
          expect(fs.readFileSync(scene.installed, 'utf-8')).toContain(
            '// reef edit: never sealed',
          );
        });

        then('the render matches its snapshot', () => {
          expectStableSnapshot({ result, dir: scene.dir });
        });
      });

      when('[t1] the installed copy matches its patch again', () => {
        const result = useThen('install runs', async () => {
          setInstalledContent({ content: scene.sealedContent });
          return runInstall();
        });

        then('the guard lets it through', () => {
          expect(result.stdout).not.toContain('unsaved edits');
          expect(result.stdout).not.toContain('MalfunctionError');
        });
      });
    },
  );
});
