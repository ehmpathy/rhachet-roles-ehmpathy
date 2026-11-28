import { spawnSync } from 'child_process';
import * as fs from 'fs';
import { MalfunctionError } from 'helpful-errors';
import * as path from 'path';

import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { genTestDir } from './.test/invokeHook';

/**
 * .what = acceptance tests for `rhx git.package.patch`, run via rhachet against the linked role
 * .why = the crew calls the verb by name, through rhachet; the integration suite runs the shell
 *        entrypoint direct, so only this file proves rhachet finds the skill, its subcommands,
 *        and the full begin → edit → commit journey, with each render snapped at this seam
 */

const REPO_ROOT = path.join(__dirname, '..');
const UPSTREAM = 'https://github.com/jonschlinkert/is-number/issues/42';
const WHY = 'reef fix: treat a numeric string with whitespace as not a number';
const EDIT_DIR_REL = 'node_modules/.pnpm_patches/is-number@7.0.0';
const PATCH_REL = 'patches/is-number@7.0.0.patch';
const NOTE_REL = 'patches/is-number@7.0.0.patch.note.md';

/**
 * .what = install this repo's pinned pnpm into a temp tools dir
 * .why = the seal runs real pnpm, and a ci test job has node but no pnpm on PATH;
 *        the suite provisions its own (rule.forbid.bare-host-deps)
 */
const genPnpmToolsBinDir = (): string => {
  const repoPackageJson = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8'),
  ) as { packageManager: string };
  const pnpmSpec = repoPackageJson.packageManager.split('+')[0]!;
  const toolsDir = genTempDir({ slug: 'gpp-acceptance-pnpm-tools' });
  const npmPath = path.join(path.dirname(process.execPath), 'npm');
  const install = spawnSync(
    npmPath,
    ['install', '--prefix', toolsDir, pnpmSpec, '--no-audit', '--no-fund'],
    { cwd: toolsDir, encoding: 'utf-8', timeout: 180_000 },
  );
  if (install.status !== 0)
    throw new MalfunctionError('could not provision pnpm for the suite', {
      pnpmSpec,
      stderr: install.stderr ?? null,
      hint: 'check that the npm registry is reachable from this host',
    });
  return path.join(toolsDir, 'node_modules', '.bin');
};

/**
 * .what = a linked repo whose tree holds an on-disk is-number@7.0.0
 * .note = plan mode reads only the package.json files on disk, so no pnpm install is needed
 */
const genPatchRepo = async (input: { slug: string }): Promise<{ dir: string }> => {
  const dir = await genTestDir({ slug: input.slug });
  const pkgDir = path.join(dir, 'node_modules', 'is-number');
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.writeFileSync(
    path.join(pkgDir, 'package.json'),
    JSON.stringify({ name: 'is-number', version: '7.0.0' }),
  );
  return { dir };
};

/**
 * .what = a linked repo with is-number@7.0.0 installed by pnpm for real
 * .why = a seal runs `pnpm patch-commit`, which needs a real pnpm install;
 *        the role stays linked via a `link:` dependency on this repo
 */
const genSealRepo = async (input: {
  slug: string;
  pnpmBinDir: string;
}): Promise<{ dir: string }> => {
  const dir = await genTestDir({ slug: input.slug });
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify(
      {
        name: 'test-repo',
        version: '1.0.0',
        private: true,
        dependencies: {
          'rhachet-roles-ehmpathy': `link:${REPO_ROOT}`,
          'is-number': '7.0.0',
        },
      },
      null,
      2,
    ),
  );
  const install = spawnSync(
    path.join(input.pnpmBinDir, 'pnpm'),
    ['install', '--config.confirmModulesPurge=false'],
    { cwd: dir, encoding: 'utf-8', timeout: 180_000 },
  );
  if (install.status !== 0)
    throw new MalfunctionError('fixture pnpm install failed', {
      stdout: install.stdout ?? null,
      stderr: install.stderr ?? null,
      hint: 'check that the npm registry is reachable from this host',
    });
  return { dir };
};

/**
 * .what = run the verb the way a crew does: through rhachet, by skill name
 */
const runViaRhachet = (input: {
  dir: string;
  args: string[];
  pnpmBinDir?: string;
}): { stdout: string; stderr: string; code: number } => {
  const result = spawnSync(
    'npx',
    ['rhachet', 'run', '--skill', 'git.package.patch', ...input.args],
    {
      cwd: input.dir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PATH: input.pnpmBinDir
          ? `${input.pnpmBinDir}${path.delimiter}${process.env.PATH ?? ''}`
          : process.env.PATH,
      },
      timeout: 300_000,
    },
  );
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    code: result.status ?? 1,
  };
};

/**
 * .what = strip the parts of output that vary per run (temp paths, dates, patch hashes)
 * .note = color codes are stripped too: rhachet and pnpm color only where they detect no ci
 */
const asStableOutput = (input: { stdout: string; dir: string }): string =>
  input.stdout
    // biome-ignore lint/suspicious/noControlCharactersInRegex: the ansi escape is the target
    .replace(/\u001b\[[0-9;]*m/g, '')
    .split(fs.realpathSync(input.dir))
    .join('<repo>')
    .split(input.dir)
    .join('<repo>')
    .replace(/_patch_hash=[0-9a-f]+/g, '')
    .replace(/\d{4}-\d{2}-\d{2}/g, '<date>');

describe('git.package.patch (acceptance)', () => {
  given('[case1] a linked repo with is-number@7.0.0 on disk', () => {
    const repo = useBeforeAll(async () => genPatchRepo({ slug: 'gpp-linked' }));

    when('[t0] the crew runs `rhx git.package.patch set --package is-number`', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: repo.dir, args: ['set', '--package', 'is-number'] }),
      );

      then('rhachet finds the verb, and begin plans the edit dir, exit 0', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toContain('🐚 git.package.patch set');
        expect(res.stdout).toContain('package: is-number@7.0.0');
        expect(res.stdout).toContain('would open edit dir: ');
        expect(res.stdout).toContain('mode: plan (naught changed)');
        expect(asStableOutput({ stdout: res.stdout, dir: repo.dir })).toMatchSnapshot();
      });

      then('the plan writes naught', () => {
        expect(
          fs.existsSync(path.join(repo.dir, 'node_modules', '.pnpm_patches')),
        ).toBe(false);
      });
    });

    when('[t1] the crew runs commit with no --why', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({
          dir: repo.dir,
          args: [
            'set',
            '--package',
            'is-number',
            '--upstream',
            'https://github.com/ehmpathy/rhachet-roles-ehmpathy/issues/926',
          ],
        }),
      );

      then('it is refused as a constraint, exit 2, on both streams', () => {
        expect(res.code).toBe(2);
        expect(res.stdout).toContain('✋ ConstraintError');
        expect(res.stdout).toContain('--why');
        expect(res.stderr).toContain('✋ ConstraintError');
        expect(asStableOutput({ stdout: res.stdout, dir: repo.dir })).toMatchSnapshot();
      });
    });

    when('[t1.1] the crew runs commit with no --upstream', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({
          dir: repo.dir,
          args: ['set', '--package', 'is-number', '--why', WHY],
        }),
      );

      then('it is refused as a constraint, exit 2, on both streams', () => {
        expect(res.code).toBe(2);
        expect(res.stdout).toContain('✋ ConstraintError: --upstream is required');
        expect(res.stderr).toContain('✋ ConstraintError: --upstream is required');
        expect(asStableOutput({ stdout: res.stdout, dir: repo.dir })).toMatchSnapshot();
      });
    });

    when('[t1.2] the crew runs commit before any set', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({
          dir: repo.dir,
          args: ['set', '--package', 'is-number', '--why', WHY, '--upstream', UPSTREAM],
        }),
      );

      then('it is refused: no open edit dir, and begin is the named next step', () => {
        expect(res.code).toBe(2);
        expect(res.stdout).toContain(`✋ ConstraintError: no open edit dir at ${EDIT_DIR_REL}`);
        expect(res.stdout).toContain(
          'rhx git.package.patch set --package is-number@7.0.0 --mode apply',
        );
        expect(res.stderr).toContain('no open edit dir');
        expect(asStableOutput({ stdout: res.stdout, dir: repo.dir })).toMatchSnapshot();
      });

      then('its stderr, as rhachet hands it back, matches snapshot', () => {
        // rhachet frames a refusal on stderr with its own trailer; snap it once, so the frame is reviewable
        expect(res.stderr).toContain('✋ ConstraintError: no open edit dir');
        expect(asStableOutput({ stdout: res.stderr, dir: repo.dir })).toMatchSnapshot();
      });
    });

    when('[t1.3] the crew passes a global flag, -g', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({
          dir: repo.dir,
          args: ['set', '--package', 'is-number', '-g'],
        }),
      );

      then('it is refused as an unknown flag, exit 2, on both streams', () => {
        expect(res.code).toBe(2);
        expect(res.stdout).toContain('unknown flag -g');
        expect(res.stderr).toContain('unknown flag -g');
        expect(asStableOutput({ stdout: res.stdout, dir: repo.dir })).toMatchSnapshot();
      });
    });

    when('[t2] the crew runs `rhx git.package.patch help`', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: repo.dir, args: ['help'] }),
      );

      then('the help names every subcommand, exit 0', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toContain('set    open an edit dir; with --why + --upstream, seal it');
        expect(res.stdout).toContain('get    each patch: apply state');
        expect(res.stdout).toContain('del    retire a patch');
        expect(res.stdout).toContain('help   show this usage');
        expect(asStableOutput({ stdout: res.stdout, dir: repo.dir })).toMatchSnapshot();
      });
    });
  });

  given('[case2] a linked repo with is-number@7.0.0 installed by pnpm', () => {
    const tools = useBeforeAll(async () => ({ binDir: genPnpmToolsBinDir() }));
    const repo = useBeforeAll(async () =>
      genSealRepo({ slug: 'gpp-linked-seal', pnpmBinDir: tools.binDir }),
    );

    when('[t0] the crew opens, edits, and seals a patch through rhachet', () => {
      const opened = useThen('begin opens the edit dir, exit 0', async () => {
        const res = runViaRhachet({
          dir: repo.dir,
          args: ['set', '--package', 'is-number', '--mode', 'apply'],
          pnpmBinDir: tools.binDir,
        });
        expect(res.code).toBe(0);
        return res;
      });

      const sealed = useThen('commit seals the patch, exit 0', async () => {
        expect(opened.code).toBe(0);
        const file = path.join(repo.dir, EDIT_DIR_REL, 'index.js');
        fs.writeFileSync(
          file,
          `${fs.readFileSync(file, 'utf-8')}\n// reef patch: local fix\n`,
        );
        const res = runViaRhachet({
          dir: repo.dir,
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
          pnpmBinDir: tools.binDir,
        });
        expect(res.code).toBe(0);
        return res;
      });

      then('the patch lands in the tree with the edit, and its note', () => {
        expect(
          fs.readFileSync(path.join(repo.dir, PATCH_REL), 'utf-8'),
        ).toContain('reef patch: local fix');
        const note = fs.readFileSync(path.join(repo.dir, NOTE_REL), 'utf-8');
        expect(note).toContain(`- why: ${WHY}`);
        expect(note).toContain(`- upstream: ${UPSTREAM}`);
      });

      then('the edit dir is removed', () => {
        expect(fs.existsSync(path.join(repo.dir, EDIT_DIR_REL))).toBe(false);
      });

      then('the begin and seal renders match snapshot', () => {
        expect(asStableOutput({ stdout: opened.stdout, dir: repo.dir })).toMatchSnapshot();
        expect(asStableOutput({ stdout: sealed.stdout, dir: repo.dir })).toMatchSnapshot();
      });
    });

    when('[t1] the crew reruns the same commit after the seal', () => {
      const rerun = useThen('the rerun exits 0', async () => {
        const res = runViaRhachet({
          dir: repo.dir,
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
          pnpmBinDir: tools.binDir,
        });
        expect(res.code).toBe(0);
        return res;
      });

      then('it is a no-op: already sealed, naught changed', () => {
        expect(rerun.stdout).toContain('already sealed with this note; naught changed');
        expect(
          fs.readFileSync(path.join(repo.dir, PATCH_REL), 'utf-8'),
        ).toContain('reef patch: local fix');
        expect(asStableOutput({ stdout: rerun.stdout, dir: repo.dir })).toMatchSnapshot();
      });
    });

    when('[t2] the crew names an --edit-dir outside the tree', () => {
      const refused = useThen('it is refused, exit 2', async () => {
        const res = runViaRhachet({
          dir: repo.dir,
          args: [
            'set',
            '--package',
            'is-number',
            '--edit-dir',
            '../reef-outside',
            '--mode',
            'apply',
          ],
          pnpmBinDir: tools.binDir,
        });
        expect(res.code).toBe(2);
        return res;
      });

      then('it names the inside-tree rule on both streams, and opens naught', () => {
        expect(refused.stdout).toContain(
          '✋ ConstraintError: --edit-dir must sit inside the tree',
        );
        expect(refused.stderr).toContain('--edit-dir must sit inside the tree');
        expect(
          fs.existsSync(path.join(repo.dir, '..', 'reef-outside')),
        ).toBe(false);
        expect(asStableOutput({ stdout: refused.stdout, dir: repo.dir })).toMatchSnapshot();
      });
    });

    when('[t3] a rebase drops the lockfile record, and the same commit reruns', () => {
      const rerun = useThen('it is refused, exit 2', async () => {
        const lockPath = path.join(repo.dir, 'pnpm-lock.yaml');
        const lockBefore = fs.readFileSync(lockPath, 'utf-8');
        fs.writeFileSync(
          lockPath,
          lockBefore
            .split('\n')
            .filter((line) => !line.includes(`path: ${PATCH_REL}`))
            .join('\n'),
        );
        const res = runViaRhachet({
          dir: repo.dir,
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
          pnpmBinDir: tools.binDir,
        });
        fs.writeFileSync(lockPath, lockBefore);
        expect(res.code).toBe(2);
        return res;
      });

      then('it names the lost record and pnpm install, never "already sealed"', () => {
        expect(rerun.stdout).toContain('the lockfile record is absent');
        expect(rerun.stdout).toContain('run pnpm install');
        expect(rerun.stdout).not.toContain('already sealed');
        expect(rerun.stderr).toContain('the lockfile record is absent');
        expect(asStableOutput({ stdout: rerun.stdout, dir: repo.dir })).toMatchSnapshot();
      });
    });
  });

  given('[case3] a linked repo whose is-number pnpm never installed', () => {
    const tools = useBeforeAll(async () => ({ binDir: genPnpmToolsBinDir() }));
    const repo = useBeforeAll(async () => genPatchRepo({ slug: 'gpp-linked-uninstalled' }));

    when('[t0] the crew opens an edit dir in apply mode', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({
          dir: repo.dir,
          args: ['set', '--package', 'is-number', '--mode', 'apply'],
          pnpmBinDir: tools.binDir,
        }),
      );

      then('pnpm fails under the verb: a malfunction, exit 1, on both streams', () => {
        expect(res.code).toBe(1);
        expect(res.stdout).toContain('💥 MalfunctionError: pnpm patch failed');
        expect(res.stderr).toContain('💥 MalfunctionError: pnpm patch failed');
      });

      then('the malfunction render, on both streams as rhachet hands it back, matches snapshot', () => {
        // pnpm's own detail varies by pnpm version and host; mask it, as the integration suite does
        const asMaskedDetail = (text: string): string =>
          asStableOutput({ stdout: text, dir: repo.dir }).replace(
            /(└─ detail\n)[\s\S]*?(\n\n|$)/,
            '$1      <pnpm detail>\n$2',
          );
        expect(res.stdout).toContain('└─ detail');
        expect(asMaskedDetail(res.stdout)).toMatchSnapshot();
        expect(asMaskedDetail(res.stderr)).toMatchSnapshot();
      });
    });
  });
});
