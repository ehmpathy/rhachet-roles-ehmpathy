import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import {
  type CatchupScene,
  genCatchupScene,
  getConflictFiles,
  getHeadFacts,
  isMergeInFlight,
  moveMain,
  readMeterUses,
  runGit,
} from '@src/domain.roles/mechanic/skills/git.branch.catchup/.test/genCatchupScene';
import {
  asManifest,
  genLockScene,
} from '@src/domain.roles/mechanic/skills/git.branch.catchup/.test/genLockScene';

import { genTestDir } from './.test/invokeHook';

/**
 * .what = acceptance tests for `rhx git.branch.catchup`, run via rhachet against the linked role
 * .why  = a caller reaches the verb through rhachet, never by its file path; the manifest
 *         registration, the subcommand dispatch, and each journey (clean, conflict, lockfile,
 *         abort) must hold on that road. the full cell grid (every gate, every edge) is proven in
 *         the git.branch.catchup.*.integration.test.ts suites
 * .note = the journeys fetch from a bare origin on disk; catchup's real github fetch is
 *         begin [case7c], and the real push belongs to git.commit.push
 */

/**
 * .what = run the verb the way a caller does: through rhachet
 * .note = a scene with a hermetic HOME keeps the real npm cache, so npx stays fast
 */
const runViaRhachet = (input: {
  dir: string;
  args: string[];
  home?: string;
  skill?: string;
}): { stdout: string; stderr: string; code: number | null } => {
  const result = spawnSync(
    'npx',
    ['rhachet', 'run', '--skill', input.skill ?? 'git.branch.catchup', ...input.args],
    {
      cwd: input.dir,
      encoding: 'utf-8', // node api param name
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60_000, // node api param name
      env: input.home
        ? {
            ...process.env,
            HOME: input.home,
            npm_config_cache: path.join(os.homedir(), '.npm'),
          }
        : process.env,
    },
  );
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    code: result.status,
  };
};

/**
 * .what = what the caller sees, from the skill's first header on, color codes stripped
 * .why  = npx and rhachet may print before the skill; color codes vary by terminal
 */
const asSkillRender = (input: { stdout: string }): string => {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: strip ansi color codes
  const plain = input.stdout.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
  const at = plain.search(/🐢|✋|💥/u);
  return plain.slice(Math.max(0, at));
};

/**
 * .what = a render stable across runs: shas and temp paths masked
 */
const asStableRender = (input: { stdout: string }): string =>
  asSkillRender(input)
    .replace(/\b[0-9a-f]{7,40}\b/g, 'HASH123')
    .replace(/\/[^\s']*\.temp\/(?:[^\s'/]+\/)*?\d{4}-\d{2}-\d{2}T[^\s'/]+/g, '/TEMP');

/**
 * .what = the gitignore of a clone with the role linked: the link artifacts stay untracked
 */
const LINKED_GITIGNORE = '.meter\nnode_modules\n.claude\n.agent/*\n!.agent/keyrack.yml\n';

/**
 * .what = link the mechanic role into a clone, the way a caller's repo holds it
 * .why  = runs before the base commit, as genTestDir does: the link edits .gitignore,
 *         and the base commit must hold that edit for a clean tree
 */
const linkMechanicRole = (input: { cwd: string }): void => {
  fs.mkdirSync(path.join(input.cwd, 'node_modules'), { recursive: true });
  fs.symlinkSync(
    path.join(__dirname, '..'),
    path.join(input.cwd, 'node_modules/rhachet-roles-ehmpathy'),
  );
  execSync('npx rhachet roles link --role mechanic', { cwd: input.cwd, stdio: 'pipe' });
  for (const name of ['settings.json', 'settings.of.grove.json'])
    fs.rmSync(path.join(input.cwd, '.claude', name), { force: true });
};

/**
 * .what = a pushed feature branch behind a moved main, in a clone with the mechanic role linked
 * .why  = the journeys need both halves at once: a real origin to fetch and push, and the
 *         role linked the way a caller's repo holds it
 */
const genLinkedCatchupScene = (input: {
  slug: string;
  base: Record<string, string>;
  ahead: Record<string, string>;
  main: Record<string, string>;
}): CatchupScene => {
  const scene = genCatchupScene({
    slug: input.slug,
    base: {
      '.gitignore': LINKED_GITIGNORE,
      'package.json': fs.readFileSync(
        path.join(__dirname, '.test/fixtures/repo-with-role/package.json'),
        'utf-8',
      ),
      ...input.base,
    },
    ahead: input.ahead,
    beforeBaseCommit: linkMechanicRole,
  });

  // main moves
  moveMain({ scene, files: input.main, message: 'feat(docs): the main change' });
  return scene;
};

describe('git.branch.catchup, via rhachet', () => {
  given('[case1] a repo with the mechanic role linked, on its default branch', () => {
    const scene = useBeforeAll(async () => {
      const dir = await genTestDir({ slug: 'git-branch-catchup-acceptance' });

      // pin the default branch: git init names it from the host's init.defaultBranch
      execSync('git branch -M main', { cwd: dir, stdio: 'pipe' });
      return { dir };
    });

    when('[t0] the verb is asked for help', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({ dir: scene.dir, args: ['help'] }),
      );
      then('exits 0 and names every subcommand', () => {
        expect(result.code).toBe(0);
        for (const sub of ['begin', 'take', 'lock', 'continue', 'abort'])
          expect(result.stdout).toContain(sub);
      });
      then('matches snapshot', () => {
        expect(asSkillRender(result)).toMatchSnapshot();
      });
    });

    when('[t1] begin, plan mode, on the default branch', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({ dir: scene.dir, args: ['begin'] }),
      );
      then('refuses with exit 2: it never merges into main or master', () => {
        expect(result.code).toBe(2);
        expect(result.stdout).toMatch(
          /✋ ConstraintError: will not merge into (main|master)/,
        );
        expect(result.stderr).toContain('ConstraintError');
      });
      then('matches snapshot', () => {
        expect(asSkillRender(result)).toMatchSnapshot();
      });
    });

    when('[t2] continue, with no merge in flight', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({ dir: scene.dir, args: ['continue'] }),
      );
      then('refuses with exit 2 on both streams and names begin', () => {
        expect(result.code).toBe(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: no merge in flight',
        );
        expect(result.stdout).toContain('rhx git.branch.catchup begin');
        expect(result.stderr).toContain('✋ ConstraintError: no merge in flight');
      });
      then('matches snapshot', () => {
        expect(asSkillRender(result)).toMatchSnapshot();
      });
    });
  });

  given('[case2] a pushed branch behind main, with no overlap', () => {
    const scene = useBeforeAll(async () =>
      genLinkedCatchupScene({
        slug: 'git-branch-catchup-acceptance-clean',
        base: {},
        ahead: { 'src/spot.ts': 'export const spot = "pipeline";\n' },
        main: { 'docs/tides.md': '# tides\n' },
      }),
    );

    when('[t0] begin, plan mode', () => {
      const result = useThen('it runs', async () => {
        const headBefore = getHeadFacts({ scene }).sha;
        const run = runViaRhachet({ dir: scene.workDir, args: ['begin'], home: scene.homeDir });
        return { run, headBefore };
      });
      then('exits 0 with a preview; HEAD and meter unchanged', () => {
        expect(result.run.code).toBe(0);
        expect(result.run.stdout).toContain('behind: 1 commit');
        expect(getHeadFacts({ scene }).sha).toBe(result.headBefore);
        expect(readMeterUses({ scene })).toBe(4);
        expect(isMergeInFlight({ scene })).toBe(false);
      });
      then('matches snapshot', () => {
        expect(asStableRender(result.run)).toMatchSnapshot();
      });
    });

    when('[t1] begin --mode apply', () => {
      const result = useThen('it runs', async () => {
        const run = runViaRhachet({
          dir: scene.workDir,
          args: ['begin', '--mode', 'apply'],
          home: scene.homeDir,
        });
        return { run, head: getHeadFacts({ scene }) };
      });
      then('exits 0; HEAD is a 2-parent merge commit; meter 4 → 3', () => {
        expect(result.run.code).toBe(0);
        expect(result.head.parents).toBe(2);
        expect(readMeterUses({ scene })).toBe(3);
      });
      then('seaturtle author, sponsor trailer, tree clean', () => {
        expect(result.head.author).toBe('seaturtle[bot] <seaturtle@ehmpath.com>');
        expect(result.head.message).toMatch(/Co-authored-by: Test Human <human@test\.com>$/);
        expect(runGit({ cwd: scene.workDir, args: ['status', '--porcelain'] })).toBe('');
      });
      then('names the plain push as the next move', () => {
        expect(result.run.stdout).toContain('rhx git.commit.push --mode apply');
      });
      then('matches snapshot', () => {
        expect(asStableRender(result.run)).toMatchSnapshot();
      });
    });

    when('[t2] begin --mode apply again', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({
          dir: scene.workDir,
          args: ['begin', '--mode', 'apply'],
          home: scene.homeDir,
        }),
      );
      then('exits 0: already level; meter unchanged', () => {
        expect(result.code).toBe(0);
        expect(result.stdout).toContain('already level');
        expect(readMeterUses({ scene })).toBe(3);
      });
      then('matches snapshot', () => {
        expect(asStableRender(result)).toMatchSnapshot();
      });
    });

    // the handoff the merge names: a plain push, planned through rhachet with no github write
    when('[t3] git.commit.push, plan mode', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({
          dir: scene.workDir,
          args: ['--mode', 'plan'],
          home: scene.homeDir,
          skill: 'git.commit.push',
        }),
      );
      then('exits 0; plans a push of the branch, no force', () => {
        expect(result.code).toBe(0);
        expect(result.stdout).toContain(scene.branch);
        expect(result.stdout).not.toContain('--force');
      });
      then('matches snapshot', () => {
        expect(asStableRender(result)).toMatchSnapshot();
      });
    });
  });

  given('[case3] a pushed branch that conflicts with main on one file', () => {
    const scene = useBeforeAll(async () =>
      genLinkedCatchupScene({
        slug: 'git-branch-catchup-acceptance-conflict',
        base: { 'src/spot.md': 'spot: base\n' },
        ahead: { 'src/spot.md': 'spot: branch\n' },
        main: { 'src/spot.md': 'spot: main\n' },
      }),
    );

    when('[t0] begin --mode apply', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({
          dir: scene.workDir,
          args: ['begin', '--mode', 'apply'],
          home: scene.homeDir,
        }),
      );
      then('exits 2 on both streams; names the file; merge in flight; meter unchanged', () => {
        expect(result.code).toBe(2);
        expect(result.stdout).toContain('src/spot.md');
        expect(result.stderr).toContain('src/spot.md');
        expect(getConflictFiles(scene)).toBe('src/spot.md');
        expect(isMergeInFlight({ scene })).toBe(true);
        expect(readMeterUses({ scene })).toBe(4);
      });
      then('matches snapshot', () => {
        expect(asStableRender(result)).toMatchSnapshot();
      });
    });

    when('[t1] take --whos main src/spot.md', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({
          dir: scene.workDir,
          args: ['take', '--whos', 'main', 'src/spot.md'],
          home: scene.homeDir,
        }),
      );
      then("exits 0; the file holds main's side and leaves the conflict set", () => {
        expect(result.code).toBe(0);
        expect(getConflictFiles(scene)).toBe('');
        expect(fs.readFileSync(path.join(scene.workDir, 'src/spot.md'), 'utf-8')).toBe(
          'spot: main\n',
        );
      });
      then('matches snapshot', () => {
        expect(asStableRender(result)).toMatchSnapshot();
      });
    });

    when('[t2] continue', () => {
      const result = useThen('it runs', async () => {
        const run = runViaRhachet({
          dir: scene.workDir,
          args: ['continue'],
          home: scene.homeDir,
        });
        return { run, head: getHeadFacts({ scene }) };
      });
      then('exits 0; HEAD is a 2-parent merge commit; meter 4 → 3; no merge in flight', () => {
        expect(result.run.code).toBe(0);
        expect(result.head.parents).toBe(2);
        expect(readMeterUses({ scene })).toBe(3);
        expect(isMergeInFlight({ scene })).toBe(false);
      });
      then('matches snapshot', () => {
        expect(asStableRender(result.run)).toMatchSnapshot();
      });
    });
  });

  // the critipath settle: edit by hand, stage through the paved verb the conflict render names
  given('[case3b] a pushed branch that conflicts with main, settled by hand', () => {
    const scene = useBeforeAll(async () =>
      genLinkedCatchupScene({
        slug: 'git-branch-catchup-acceptance-hand-settle',
        base: { 'src/spot.md': 'spot: base\n' },
        ahead: { 'src/spot.md': 'spot: branch\n' },
        main: { 'src/spot.md': 'spot: main\n' },
      }),
    );

    when('[t0] begin --mode apply', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({
          dir: scene.workDir,
          args: ['begin', '--mode', 'apply'],
          home: scene.homeDir,
        }),
      );
      then('exits 2; names rhx git.stage.add as the settle', () => {
        expect(result.code).toBe(2);
        expect(result.stdout).toContain('settle each file:  rhx git.stage.add <file>');
        expect(getConflictFiles(scene)).toBe('src/spot.md');
      });
      then('matches snapshot', () => {
        expect(asStableRender(result)).toMatchSnapshot();
      });
    });

    when('[t1] the file edited by hand, then rhx git.stage.add src/spot.md', () => {
      const result = useThen('it runs', async () => {
        fs.writeFileSync(path.join(scene.workDir, 'src/spot.md'), 'spot: main + branch\n');
        return runViaRhachet({
          dir: scene.workDir,
          args: ['src/spot.md'],
          home: scene.homeDir,
          skill: 'git.stage.add',
        });
      });
      then('exits 0; the file leaves the conflict set; the merge stays in flight', () => {
        expect(result.code).toBe(0);
        expect(getConflictFiles(scene)).toBe('');
        expect(isMergeInFlight({ scene })).toBe(true);
      });
      then('matches snapshot', () => {
        expect(asStableRender(result)).toMatchSnapshot();
      });
    });

    when('[t2] continue', () => {
      const result = useThen('it runs', async () => {
        const run = runViaRhachet({
          dir: scene.workDir,
          args: ['continue'],
          home: scene.homeDir,
        });
        return { run, head: getHeadFacts({ scene }) };
      });
      then('exits 0; a 2-parent merge commit holds the hand settle; meter 4 → 3', () => {
        expect(result.run.code).toBe(0);
        expect(result.head.parents).toBe(2);
        expect(readMeterUses({ scene })).toBe(3);
        expect(fs.readFileSync(path.join(scene.workDir, 'src/spot.md'), 'utf-8')).toBe(
          'spot: main + branch\n',
        );
      });
      then('matches snapshot', () => {
        expect(asStableRender(result.run)).toMatchSnapshot();
      });
    });
  });

  given('[case3c] a pushed branch behind main, with an uncommitted edit', () => {
    const scene = useBeforeAll(async () => {
      const scene = genLinkedCatchupScene({
        slug: 'git-branch-catchup-acceptance-dirty',
        base: { 'src/spot.md': 'spot: base\n' },
        ahead: { 'src/spot.md': 'spot: branch\n' },
        main: { 'docs/tides.md': '# tides\n' },
      });
      fs.writeFileSync(path.join(scene.workDir, 'src/spot.md'), 'spot: wip\n');
      return scene;
    });

    when('[t0] begin --mode apply', () => {
      const result = useThen('it runs', async () => {
        const headBefore = getHeadFacts({ scene }).sha;
        const run = runViaRhachet({
          dir: scene.workDir,
          args: ['begin', '--mode', 'apply'],
          home: scene.homeDir,
        });
        return { run, headBefore };
      });
      then('exits 2 on both streams; names the file; no merge started; meter unchanged', () => {
        expect(result.run.code).toBe(2);
        expect(result.run.stdout).toContain('src/spot.md');
        expect(result.run.stderr).toContain('ConstraintError');
        expect(getHeadFacts({ scene }).sha).toBe(result.headBefore);
        expect(isMergeInFlight({ scene })).toBe(false);
        expect(readMeterUses({ scene })).toBe(4);
      });
      then('matches snapshot', () => {
        expect(asStableRender(result.run)).toMatchSnapshot();
      });
    });
  });

  given('[case4] a conflicted merge in flight, then abort', () => {
    const scene = useBeforeAll(async () => {
      const scene = genLinkedCatchupScene({
        slug: 'git-branch-catchup-acceptance-abort',
        base: { 'src/spot.md': 'spot: base\n' },
        ahead: { 'src/spot.md': 'spot: branch\n' },
        main: { 'src/spot.md': 'spot: main\n' },
      });
      const headBefore = getHeadFacts({ scene }).sha;
      const begin = runViaRhachet({
        dir: scene.workDir,
        args: ['begin', '--mode', 'apply'],
        home: scene.homeDir,
      });
      return { ...scene, headBefore, beginCode: begin.code };
    });

    when('[t0] abort', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({ dir: scene.workDir, args: ['abort'], home: scene.homeDir }),
      );
      then('the merge was in flight before, and abort exits 0', () => {
        expect(scene.beginCode).toBe(2);
        expect(result.code).toBe(0);
      });
      then('HEAD is back where it began; tree clean; meter unchanged', () => {
        expect(getHeadFacts({ scene }).sha).toBe(scene.headBefore);
        expect(isMergeInFlight({ scene })).toBe(false);
        expect(runGit({ cwd: scene.workDir, args: ['status', '--porcelain'] })).toBe('');
        expect(readMeterUses({ scene })).toBe(4);
      });
      then('matches snapshot', () => {
        expect(asStableRender(result)).toMatchSnapshot();
      });
    });
  });

  // the #1021 journey, in its order: begin, continue too soon, take the lock, refresh, continue,
  // begin again. the push that follows belongs to git.commit.push
  given('[case5] a pushed branch whose pnpm lockfile conflicts with main', () => {
    // main adds dep b; the branch adds devDep b2: the manifest merges clean, the lock does not.
    // each manifest names the linked role, since rhachet finds roles through the deps
    const ROLE_DEP = { 'rhachet-roles-ehmpathy': 'link:./node_modules/rhachet-roles-ehmpathy' };
    const scene = useBeforeAll(async () =>
      genLockScene({
        slug: 'git-branch-catchup-acceptance-lock',
        pm: 'pnpm',
        base: { '.gitignore': LINKED_GITIGNORE },
        baseManifest: asManifest({
          deps: { ...ROLE_DEP, a: 'file:./pkgs/a' },
          devDeps: { c0: 'file:./pkgs/c0' },
        }),
        mainManifest: asManifest({
          deps: { ...ROLE_DEP, a: 'file:./pkgs/a', b: 'file:./pkgs/b' },
          devDeps: { c0: 'file:./pkgs/c0' },
        }),
        branchManifest: asManifest({
          deps: { ...ROLE_DEP, a: 'file:./pkgs/a' },
          devDeps: { b2: 'file:./pkgs/b2', c0: 'file:./pkgs/c0' },
        }),
        beforeBaseCommit: linkMechanicRole,
      }),
    );

    when('[t0] begin --mode apply', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({
          dir: scene.workDir,
          args: ['begin', '--mode', 'apply'],
          home: scene.homeDir,
        }),
      );
      then('exits 2 on both streams; the lockfile is the one conflict; names lock refresh', () => {
        expect(result.code).toBe(2);
        expect(getConflictFiles(scene)).toBe('pnpm-lock.yaml');
        expect(result.stdout).toContain(
          '├─ a lockfile is refreshed, not merged\n      │  ├─ rhx git.branch.catchup take --whos main pnpm-lock.yaml\n      │  └─ rhx git.branch.catchup lock refresh',
        );
        expect(result.stderr).toContain('✋ ConstraintError: merge stopped on conflicts');
      });
      then('matches snapshot', () => {
        expect(asStableRender(result)).toMatchSnapshot();
      });
    });

    when('[t1] continue, too soon: the lockfile is still in conflict', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({
          dir: scene.workDir,
          args: ['continue'],
          home: scene.homeDir,
        }),
      );
      then('exits 2 on both streams; names the file; merge in flight; meter unchanged', () => {
        expect(result.code).toBe(2);
        expect(result.stdout).toContain('✋ ConstraintError: 1 file still in conflict');
        expect(result.stderr).toContain('✋ ConstraintError: 1 file still in conflict');
        expect(result.stdout).toContain('pnpm-lock.yaml');
        expect(isMergeInFlight({ scene })).toBe(true);
        expect(readMeterUses({ scene })).toBe(4);
      });
      then('matches snapshot', () => {
        expect(asStableRender(result)).toMatchSnapshot();
      });
    });

    when('[t2] take --whos main pnpm-lock.yaml', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({
          dir: scene.workDir,
          args: ['take', '--whos', 'main', 'pnpm-lock.yaml'],
          home: scene.homeDir,
        }),
      );
      then('exits 0; the conflict set is empty; names lock refresh', () => {
        expect(result.code).toBe(0);
        expect(getConflictFiles(scene)).toBe('');
        expect(result.stdout).toContain('lock refresh');
      });
      then('matches snapshot', () => {
        expect(asStableRender(result)).toMatchSnapshot();
      });
    });

    when('[t3] lock refresh', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({
          dir: scene.workDir,
          args: ['lock', 'refresh'],
          home: scene.homeDir,
        }),
      );
      then('exits 0; the refreshed lock holds both sides and is staged', () => {
        expect(result.code).toBe(0);
        expect(result.stdout).toContain('package manager: pnpm');
        const lock = fs.readFileSync(path.join(scene.workDir, 'pnpm-lock.yaml'), 'utf-8');
        expect(lock).toContain('pkgs/b');
        expect(lock).toContain('pkgs/b2');
        expect(
          runGit({ cwd: scene.workDir, args: ['diff', '--name-only'] }),
        ).not.toContain('pnpm-lock.yaml');
      });
      then('matches snapshot', () => {
        expect(asStableRender(result)).toMatchSnapshot();
      });
    });

    when('[t4] continue', () => {
      const result = useThen('it runs', async () => {
        const run = runViaRhachet({
          dir: scene.workDir,
          args: ['continue'],
          home: scene.homeDir,
        });
        return { run, head: getHeadFacts({ scene }) };
      });
      then('exits 0; HEAD is a 2-parent merge commit; meter 4 → 3', () => {
        expect(result.run.code).toBe(0);
        expect(result.head.parents).toBe(2);
        expect(readMeterUses({ scene })).toBe(3);
        expect(isMergeInFlight({ scene })).toBe(false);
      });
      then('names the plain push as the next move', () => {
        expect(result.run.stdout).toContain('rhx git.commit.push --mode apply');
      });
      then('matches snapshot', () => {
        expect(asStableRender(result.run)).toMatchSnapshot();
      });
    });

    when('[t5] begin --mode apply again', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({
          dir: scene.workDir,
          args: ['begin', '--mode', 'apply'],
          home: scene.homeDir,
        }),
      );
      then('exits 0: already level; meter unchanged', () => {
        expect(result.code).toBe(0);
        expect(result.stdout).toContain('already level');
        expect(readMeterUses({ scene })).toBe(3);
      });
      then('matches snapshot', () => {
        expect(asStableRender(result)).toMatchSnapshot();
      });
    });
  });
});
