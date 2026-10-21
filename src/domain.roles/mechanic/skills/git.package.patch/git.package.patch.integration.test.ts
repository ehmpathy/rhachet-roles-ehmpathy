import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

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
   * .what = run the skill in a dir, with an optional env override
   */
  const runSkill = (input: {
    cwd: string;
    args: string[];
    env?: Record<string, string>;
  }): { stdout: string; stderr: string; exitCode: number } => {
    const result = spawnSync('bash', [scriptPath, ...input.args], {
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
      'pnpm',
      ['install', '--config.confirmModulesPurge=false'],
      { cwd: tempDir, encoding: 'utf-8', timeout: 180_000 },
    );
    if (install.status !== 0)
      throw new Error(
        `fixture pnpm install failed: ${install.stdout}\n${install.stderr}`,
      );
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
        expect(result.stdout).toContain('would: open the edit dir');
        expect(fs.existsSync(path.join(scene.dir, EDIT_DIR_REL))).toEqual(
          false,
        );
        expect(
          asStableOutput({ stdout: result.stdout, dir: scene.dir }),
        ).toMatchSnapshot();
      });
    });

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
      then('it previews the patch + note and writes naught', () => {
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
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).toContain(`would write patch: ${PATCH_REL}`);
        expect(fs.existsSync(path.join(scene.dir, PATCH_REL))).toEqual(false);
        expect(
          asStableOutput({ stdout: result.stdout, dir: scene.dir }),
        ).toMatchSnapshot();
      });
    });

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
        expect(
          asStableOutput({ stdout: result.stdout, dir: scene.dir }),
        ).toMatchSnapshot();
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
        expect(
          asStableOutput({ stdout: result.stdout, dir: scene.dir }),
        ).toMatchSnapshot();
      });

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
        expect(result.stdout).toContain('no open edit dir');
        expect(result.stdout).toContain('rhx git.package.patch begin');
        expect(
          fs.readFileSync(path.join(scene.dir, NOTE_REL), 'utf-8'),
        ).toEqual(noteBefore);
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });
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
      then('it is refused: several versions, none open', () => {
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
        expectStableSnapshot({ result, dir: scene.dir });
      });
    });

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
              expect(
                asStableOutput({ stdout: result.stdout, dir: scene.dir })
                  .split('\n')
                  .slice(0, 5)
                  .join('\n'),
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
            expect(
              asStableOutput({ stdout: result.stdout, dir: scene.dir })
                .split('\n')
                .slice(0, 5)
                .join('\n'),
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
          expect(result.stdout).toMatchSnapshot();
        },
      );
    });
  });
});
