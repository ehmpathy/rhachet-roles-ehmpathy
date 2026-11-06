import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genTestDir } from './.test/invokeHook';

/**
 * .what = acceptance tests for `rhx git.branch.cutover`, run via rhachet against the linked role
 * .why  = a caller reaches the cutover through rhachet, never by its file path; each critical
 *         journey (plan, apply, halt and settle, abort) must hold at that entry, not only when
 *         the skill file is run by path
 */

/**
 * .what = run the skill the way a caller does: through rhachet, with a temp HOME
 */
const runViaRhachet = (input: {
  dir: string;
  home: string;
  args: string[];
}): { stdout: string; stderr: string; code: number | null } => {
  const result = spawnSync(
    'npx',
    ['rhachet', 'run', '--skill', 'git.branch.cutover', ...input.args],
    {
      cwd: input.dir,
      encoding: 'utf-8', // node api param name
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, HOME: input.home },
      timeout: 120_000, // node api param name; a hang guard
    },
  );
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    code: result.status,
  };
};

/**
 * .what = run git in a dir; throw on failure
 */
const git = (dir: string, args: string[]): string => {
  const result = spawnSync('git', args, { cwd: dir, encoding: 'utf-8' }); // node api param name
  if (result.status !== 0)
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return (result.stdout ?? '').trim();
};

/**
 * .what = commit one file in a dir; return the new sha
 */
const setFileCommitted = (input: {
  dir: string;
  file: string;
  content: string;
  subject: string;
}): string => {
  fs.mkdirSync(path.dirname(path.join(input.dir, input.file)), {
    recursive: true,
  });
  fs.writeFileSync(path.join(input.dir, input.file), input.content);
  git(input.dir, ['add', '--', input.file]);
  git(input.dir, ['commit', '-q', '--no-verify', '-m', input.subject]);
  return git(input.dir, ['rev-parse', 'HEAD']);
};

/**
 * .what = a linked repo with an origin one commit ahead on main, a feature branch of three
 *         commits, a granted quota, and a temp HOME
 * .why  = the nheuron shape: main moved on, and the feature's work must ride onto it. the
 *         `band` commit on main and on the feature collide, so a pick of it halts
 */
const genCutoverScene = async (input: { slug: string }) => {
  const dir = await genTestDir({ slug: input.slug });
  const home = genTempDir({ slug: `${input.slug}-home`, git: false });
  const origin = genTempDir({ slug: `${input.slug}-origin`, git: false });

  // the origin, and a seed that keeps the linked role's files out of git status
  git(origin, ['init', '-q', '--bare', '-b', 'main']);
  git(dir, ['config', 'commit.gpgsign', 'false']);
  git(dir, ['branch', '-M', 'main']);
  fs.writeFileSync(
    path.join(dir, '.gitignore'),
    // `.claude` with no slash: the linked role's `.claude` is a symlink, which a `dir/` pattern skips
    'node_modules/\n.agent/\n.claude\n.log/\n.meter/\n.rhachet/\n',
  );
  git(dir, ['add', '.gitignore']);
  git(dir, ['commit', '-q', '--no-verify', '-m', 'chore(seed): seed the reef']);
  const seed = git(dir, ['rev-parse', 'HEAD']);
  git(dir, ['remote', 'add', 'origin', origin]);
  git(dir, ['push', '-q', 'origin', 'main']);

  // main moves on, on origin alone
  setFileCommitted({
    dir,
    file: 'src/band.ts',
    content: 'export const band = "main";\n',
    subject: 'feat(band): add band on main',
  });
  git(dir, ['push', '-q', 'origin', 'main']);
  git(dir, ['reset', '-q', '--hard', seed]);
  git(dir, ['update-ref', 'refs/remotes/origin/main', seed]);

  // the stale feature branch
  git(dir, ['checkout', '-q', '-b', 'turtle/wave-report']);
  const shaWave = setFileCommitted({
    dir,
    file: 'src/wave.ts',
    content: 'export const wave = 1;\n',
    subject: 'feat(wave): add wave report',
  });
  const shaBand = setFileCommitted({
    dir,
    file: 'src/band.ts',
    content: 'export const band = "feature";\n',
    subject: 'cont(wave): add band of swell',
  });
  const shaTide = setFileCommitted({
    dir,
    file: 'src/tide.ts',
    content: 'export const tide = 3;\n',
    subject: 'cont(wave): add tide window',
  });

  // the quota: the org allowed in HOME, a local grant in the repo
  fs.mkdirSync(path.join(dir, '.agent'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.agent', 'keyrack.yml'), 'org: ehmpathy\n');
  const meterDirGlobal = path.join(
    home,
    '.rhachet',
    'storage',
    'repo=ehmpathy',
    'role=mechanic',
    '.meter',
  );
  fs.mkdirSync(meterDirGlobal, { recursive: true });
  fs.writeFileSync(
    path.join(meterDirGlobal, 'git.branch.uses.org.jsonc'),
    JSON.stringify({ orgs: { '@all': 'allowed' } }),
  );
  fs.mkdirSync(path.join(dir, '.meter'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, '.meter', 'git.branch.uses.jsonc'),
    JSON.stringify({ uses: 5 }),
  );

  return { dir, home, origin, shas: { shaWave, shaBand, shaTide } };
};

/**
 * .what = mask shas, temp paths, and the fixture's git author so a snapshot holds across runs
 */
const asSnapshotSafe = (input: { dir: string; text: string }): string =>
  input.text
    .split(input.dir)
    .join('<repo>')
    .replace(/HEAD is authored by [^,]+,/g, 'HEAD is authored by <fixture author>,')
    .replace(/rescue\/[0-9a-f]{40}/g, 'rescue/<tree>')
    .replace(/\b[0-9a-f]{40}\b/g, '<sha40>')
    .replace(/\b[0-9a-f]{7}\b/g, '<sha>');

describe('git.branch.cutover (acceptance)', () => {
  given('[case1] a repo with the mechanic role linked', () => {
    const scene = useBeforeAll(async () => ({
      dir: await genTestDir({ slug: 'cutover-acceptance' }),
      home: genTempDir({ slug: 'cutover-acceptance-home', git: false }),
    }));

    when('[t0] the caller asks for help', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: scene.dir, home: scene.home, args: ['help'] }),
      );

      then('the usage renders, at exit 0, with each subcommand', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toContain('begin');
        expect(res.stdout).toContain('continue');
        expect(res.stdout).toContain('abort');
        expect(res.stdout).not.toContain('unknown subcommand');
        expect(res.stdout).toMatchSnapshot();
      });
    });

    when('[t1] the caller continues with no cutover in flight', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: scene.dir, home: scene.home, args: ['continue'] }),
      );

      then('it reaches the continue guard, not the dispatcher', () => {
        expect(res.code).toBe(2);
        expect(res.stdout).toContain('no cutover');
        expect(res.stdout).not.toContain('unknown subcommand');
        expect(res.stdout).not.toContain('a flag came before');
        expect(res.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case2] a stale branch whose work must ride onto fresh main', () => {
    const scene = useBeforeAll(async () =>
      genCutoverScene({ slug: 'cutover-acceptance-carry' }),
    );
    const begin = (extra: string[]) => [
      'begin',
      '--from',
      '@main',
      '--into',
      'turtle/wave-report-v2',
      '--pick',
      scene.shas.shaWave,
      '--pick',
      scene.shas.shaTide,
      ...extra,
    ];

    when('[t0] the caller previews the cutover, with a tracked edit', () => {
      const res = useBeforeAll(async () => {
        fs.writeFileSync(path.join(scene.dir, 'src', 'wave.ts'), 'export const wave = 2;\n');
        return runViaRhachet({ dir: scene.dir, home: scene.home, args: begin([]) });
      });

      then('the plan names base, picks, and the edit, and changes naught', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toContain('begin --mode plan');
        expect(res.stdout).toContain('into: turtle/wave-report-v2 (new, no upstream)');
        expect(res.stdout).toContain('M src/wave.ts');
        expect(git(scene.dir, ['symbolic-ref', '--short', 'HEAD'])).toEqual(
          'turtle/wave-report',
        );
        expect(asSnapshotSafe({ dir: scene.dir, text: res.stdout })).toMatchSnapshot();
      });
    });

    when('[t1] the caller applies it', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({
          dir: scene.dir,
          home: scene.home,
          args: begin(['--mode', 'apply']),
        }),
      );

      then('the new branch holds main plus both picks, and the edit rides along', () => {
        expect(res.code).toBe(0);
        expect(git(scene.dir, ['symbolic-ref', '--short', 'HEAD'])).toEqual(
          'turtle/wave-report-v2',
        );
        expect(
          git(scene.dir, ['log', '--format=%s', 'origin/main..HEAD']).split('\n'),
        ).toEqual(['cont(wave): add tide window', 'feat(wave): add wave report']);
        expect(fs.readFileSync(path.join(scene.dir, 'src', 'band.ts'), 'utf-8')).toEqual(
          'export const band = "main";\n',
        );
        expect(fs.readFileSync(path.join(scene.dir, 'src', 'wave.ts'), 'utf-8')).toEqual(
          'export const wave = 2;\n',
        );
      });

      then('the new branch tracks no upstream', () => {
        const upstream = spawnSync(
          'git',
          ['rev-parse', '--abbrev-ref', '--symbolic-full-name', 'turtle/wave-report-v2@{u}'],
          { cwd: scene.dir, encoding: 'utf-8' }, // node api param name
        );
        expect(upstream.status).not.toBe(0);
      });

      then('the apply spends one unit of the cutover quota', () => {
        const meter = JSON.parse(
          fs.readFileSync(path.join(scene.dir, '.meter', 'git.branch.uses.jsonc'), 'utf-8'),
        );
        expect(meter.uses).toEqual(4);
        expect(res.stdout).toContain('quota: 1 spent, 4 left');
      });

      then('the report matches its snapshot', () => {
        expect(asSnapshotSafe({ dir: scene.dir, text: res.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case3] a pick that conflicts with main', () => {
    const scene = useBeforeAll(async () =>
      genCutoverScene({ slug: 'cutover-acceptance-halt' }),
    );

    when('[t0] the caller applies a cutover that picks the conflicted commit', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({
          dir: scene.dir,
          home: scene.home,
          args: [
            'begin',
            '--from',
            '@main',
            '--into',
            'turtle/wave-report-v2',
            '--pick',
            scene.shas.shaBand,
            '--mode',
            'apply',
          ],
        }),
      );

      then('it halts at exit 2 and names the file, continue, and abort', () => {
        expect(res.code).toBe(2);
        expect(res.stdout).toContain('halted: a pick conflicts');
        expect(res.stdout).toContain('src/band.ts');
        expect(res.stdout).toContain('rhx git.branch.cutover continue');
        expect(res.stdout).toContain('rhx git.branch.cutover abort');
        expect(asSnapshotSafe({ dir: scene.dir, text: res.stdout })).toMatchSnapshot();
      });
    });

    when('[t1] the caller continues before the settle', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: scene.dir, home: scene.home, args: ['continue'] }),
      );

      then('it refuses and names the file still in conflict', () => {
        expect(res.code).toBe(2);
        expect(res.stdout).toContain('files are still in conflict');
        expect(asSnapshotSafe({ dir: scene.dir, text: res.stdout })).toMatchSnapshot();
      });
    });

    when('[t2] the caller settles, stages, and continues', () => {
      const res = useBeforeAll(async () => {
        fs.writeFileSync(
          path.join(scene.dir, 'src', 'band.ts'),
          'export const band = "settled";\n',
        );
        git(scene.dir, ['add', 'src/band.ts']);
        return runViaRhachet({ dir: scene.dir, home: scene.home, args: ['continue'] });
      });

      then('the cutover finishes with the settled pick on top of main', () => {
        expect(res.code).toBe(0);
        expect(git(scene.dir, ['log', '-1', '--format=%s'])).toEqual(
          'cont(wave): add band of swell',
        );
        expect(fs.readFileSync(path.join(scene.dir, 'src', 'band.ts'), 'utf-8')).toEqual(
          'export const band = "settled";\n',
        );
        expect(asSnapshotSafe({ dir: scene.dir, text: res.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case4] a halted cutover the caller undoes', () => {
    const scene = useBeforeAll(async () => {
      const scene = await genCutoverScene({ slug: 'cutover-acceptance-abort' });
      fs.writeFileSync(path.join(scene.dir, 'src/wave.ts'), 'export const wave = 2;\n');
      const halt = runViaRhachet({
        dir: scene.dir,
        home: scene.home,
        args: [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.shas.shaBand,
          '--mode',
          'apply',
        ],
      });
      if (halt.code !== 2)
        throw new Error(`case4 setup: begin did not halt: ${halt.stdout}`);
      return scene;
    });

    when('[t0] the caller aborts', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: scene.dir, home: scene.home, args: ['abort'] }),
      );

      then('the caller is back on the source, edit restored, new branch gone', () => {
        expect(res.code).toBe(0);
        expect(git(scene.dir, ['symbolic-ref', '--short', 'HEAD'])).toEqual(
          'turtle/wave-report',
        );
        expect(fs.readFileSync(path.join(scene.dir, 'src/wave.ts'), 'utf-8')).toEqual(
          'export const wave = 2;\n',
        );
        expect(git(scene.dir, ['status', '--porcelain', '--', 'src/wave.ts'])).toEqual(
          'M src/wave.ts',
        );
        expect(res.stdout).toContain('M src/wave.ts');
        expect(
          git(scene.dir, ['branch', '--list', 'turtle/wave-report-v2']),
        ).toEqual('');
        expect(asSnapshotSafe({ dir: scene.dir, text: res.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case5] a tracked edit that cannot carry onto main', () => {
    // .why = the carry halt is a second halt shape, apart from a pick conflict:
    //        main's band.ts differs from the one the edit was made against
    const scene = useBeforeAll(async () => {
      const scene = await genCutoverScene({ slug: 'cutover-acceptance-carry' });
      fs.writeFileSync(
        path.join(scene.dir, 'src', 'band.ts'),
        'export const band = "edited";\n',
      );
      return scene;
    });

    when('[t0] the caller applies a cutover that carries the edit', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({
          dir: scene.dir,
          home: scene.home,
          args: [
            'begin',
            '--from',
            '@main',
            '--into',
            'turtle/wave-report-v2',
            '--pick',
            scene.shas.shaWave,
            '--mode',
            'apply',
          ],
        }),
      );

      then('it halts at exit 2 on the carry, and names where the edit is held', () => {
        expect(res.code).toBe(2);
        expect(res.stdout).toContain('the carry of tracked edits conflicts');
        expect(res.stdout).toContain('safe:');
        expect(asSnapshotSafe({ dir: scene.dir, text: res.stdout })).toMatchSnapshot();
      });
    });

    when('[t1] the caller aborts from the carry halt', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: scene.dir, home: scene.home, args: ['abort'] }),
      );

      then('the caller is back on the source with the edit intact, new branch gone', () => {
        expect(res.code).toBe(0);
        expect(git(scene.dir, ['symbolic-ref', '--short', 'HEAD'])).toEqual(
          'turtle/wave-report',
        );
        expect(
          fs.readFileSync(path.join(scene.dir, 'src', 'band.ts'), 'utf-8'),
        ).toEqual('export const band = "edited";\n');
        expect(
          git(scene.dir, ['branch', '--list', 'turtle/wave-report-v2']),
        ).toEqual('');
        expect(asSnapshotSafe({ dir: scene.dir, text: res.stdout })).toMatchSnapshot();
      });
    });
  });
});
