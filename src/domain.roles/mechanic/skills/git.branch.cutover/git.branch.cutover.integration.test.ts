import { spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';
import { seedTestSponsor } from '@src/.test/seedTestSponsor';

/**
 * .what = integration tests for git.branch.cutover
 * .why = the verb moves real work between branches; every demo case of the
 *        vision (plan, carry, conflict, abort, refusals) must hold against a
 *        real repo with a real origin
 */
describe('git.branch.cutover', () => {
  const scriptPath = path.join(__dirname, 'git.branch.cutover.sh');

  /**
   * .what = run git in a dir; throw loud on failure
   */
  const git = (dir: string, args: string[]): string => {
    const result = spawnSync('git', args, { cwd: dir, encoding: 'utf-8' });
    if (result.status !== 0)
      throw new Error(
        `git ${args.join(' ')} failed in ${dir}: ${result.stderr ?? ''}`,
      );
    return (result.stdout ?? '').trim();
  };

  /**
   * .what = write a file, stage it, commit it; return the new sha
   */
  const commitFile = (
    dir: string,
    input: { file: string; content: string; subject: string },
  ): string => {
    fs.mkdirSync(path.dirname(path.join(dir, input.file)), { recursive: true });
    fs.writeFileSync(path.join(dir, input.file), input.content);
    git(dir, ['add', input.file]);
    git(dir, ['commit', '-q', '-m', input.subject]);
    return git(dir, ['rev-parse', 'HEAD']);
  };

  type CommitSpec = { file: string; content: string; subject: string };

  const FEATURE_COMMITS: CommitSpec[] = [
    {
      file: 'src/wave.ts',
      content: 'export const wave = 1;\n',
      subject: 'feat(wave): add wave report',
    },
    {
      file: 'src/swell.ts',
      content: 'export const swell = 2;\n',
      subject: 'cont(wave): add swell height',
    },
    {
      file: 'src/tide.ts',
      content: 'export const tide = 3;\n',
      subject: 'cont(wave): add tide window',
    },
  ];

  const MAIN_COMMITS_REEF: CommitSpec[] = [
    {
      file: 'src/reef.ts',
      content: 'export const reef = 0;\n',
      subject: 'feat(reef): add reef map',
    },
  ];

  const MAIN_COMMITS_SQUASHED: CommitSpec[] = [
    {
      file: 'src/wave.ts',
      content: 'export const wave = 1;\n',
      subject: 'feat(wave): add wave report (#12)',
    },
    ...MAIN_COMMITS_REEF,
  ];

  /**
   * .what = a scene: a bare origin, a clone on a feature branch, a temp HOME
   * .why = every case runs against real git, with origin/main ahead of the
   *        local view so the fetch is proven
   */
  const genScene = (input: {
    slug: string;
    featureCommits: CommitSpec[];
    mainCommits?: CommitSpec[];
    quota?: number | null;
  }) => {
    const originDir = genTempDir({ slug: `${input.slug}-origin`, git: false });
    git(originDir, ['init', '-q', '--bare', '-b', 'main']);

    const repoDir = genTempDir({ slug: input.slug, git: true });
    const homeDir = genTempDir({ slug: `${input.slug}-home`, git: false });
    configureTestGitUser({ cwd: repoDir });
    git(repoDir, ['config', 'commit.gpgsign', 'false']);
    git(repoDir, ['branch', '-M', 'main']);

    // seed the reef
    fs.writeFileSync(path.join(repoDir, '.gitignore'), '.meter/\n');
    fs.mkdirSync(path.join(repoDir, '.agent'), { recursive: true });
    fs.writeFileSync(
      path.join(repoDir, '.agent', 'keyrack.yml'),
      'org: ehmpathy\n',
    );
    fs.writeFileSync(path.join(repoDir, 'readme.md'), '# reef\n');
    git(repoDir, ['add', '.gitignore', '.agent/keyrack.yml', 'readme.md']);
    git(repoDir, ['commit', '-q', '-m', 'chore(seed): seed the reef']);
    const seedSha = git(repoDir, ['rev-parse', 'HEAD']);
    git(repoDir, ['remote', 'add', 'origin', originDir]);
    git(repoDir, ['push', '-q', 'origin', 'main']);

    // main moves on, on origin only; the local view stays at the seed
    const mainShas = (input.mainCommits ?? []).map((spec) =>
      commitFile(repoDir, spec),
    );
    if (mainShas.length) {
      git(repoDir, ['push', '-q', 'origin', 'main']);
      git(repoDir, ['reset', '-q', '--hard', seedSha]);
      git(repoDir, ['update-ref', 'refs/remotes/origin/main', seedSha]);
    }

    // the feature branch
    git(repoDir, ['checkout', '-q', '-b', 'turtle/wave-report']);
    const featureShas = input.featureCommits.map((spec) =>
      commitFile(repoDir, spec),
    );

    // the meter: org allowed, local quota
    const globalMeterDir = path.join(
      homeDir,
      '.rhachet',
      'storage',
      'repo=ehmpathy',
      'role=mechanic',
      '.meter',
    );
    fs.mkdirSync(globalMeterDir, { recursive: true });
    fs.writeFileSync(
      path.join(globalMeterDir, 'git.branch.uses.org.jsonc'),
      JSON.stringify({ orgs: { '@all': 'allowed' } }, null, 2),
    );
    const quota = input.quota === undefined ? 3 : input.quota;
    if (quota !== null) {
      fs.mkdirSync(path.join(repoDir, '.meter'), { recursive: true });
      fs.writeFileSync(
        path.join(repoDir, '.meter', 'git.branch.uses.jsonc'),
        JSON.stringify({ uses: quota }),
      );
    }

    return { repoDir, originDir, homeDir, seedSha, mainShas, featureShas };
  };
  type Scene = ReturnType<typeof genScene>;

  /**
   * .what = run the cutover verb within a scene
   */
  const runCutover = (scene: Scene, args: string[]) => {
    const result = spawnSync('bash', [scriptPath, ...args], {
      cwd: scene.repoDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, HOME: scene.homeDir },
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  /**
   * .what = grant the commit meter a scene needs to commit and push after a cutover
   * .why = the seam tests run the real git.commit skills on the new branch;
   *        they read their own meter, org allowance, and sponsor
   */
  const grantCommitQuota = (scene: Scene) => {
    fs.writeFileSync(
      path.join(scene.repoDir, '.meter', 'git.commit.uses.jsonc'),
      JSON.stringify({ uses: 2, push: 'allow' }),
    );
    fs.writeFileSync(
      path.join(
        scene.homeDir,
        '.rhachet',
        'storage',
        'repo=ehmpathy',
        'role=mechanic',
        '.meter',
        'git.commit.uses.org.jsonc',
      ),
      JSON.stringify({ orgs: { ehmpathy: 'allowed' } }, null, 2),
    );
    seedTestSponsor({ cwd: scene.repoDir });
  };

  /**
   * .what = run a git.commit skill within a scene
   */
  const runCommitSkill = (
    scene: Scene,
    input: { skill: string; args: string[]; stdin: string },
  ) => {
    const result = spawnSync(
      'bash',
      [path.join(__dirname, '..', 'git.commit', input.skill), ...input.args],
      {
        cwd: scene.repoDir,
        encoding: 'utf-8',
        input: input.stdin,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, HOME: scene.homeDir },
      },
    );
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  /**
   * .what = mask shas so snapshots hold across runs
   */
  const asSnapshotSafe = (text: string): string =>
    text
      .replace(/\b[0-9a-f]{40}\b/g, '<sha40>')
      .replace(/\b[0-9a-f]{7}\b/g, '<sha>');

  /**
   * .what = mask shas and the scene's temp paths
   * .why = refusals name the cutover dir and lock files by full path
   */
  const asSnapshotSafeIn = (
    scene: { repoDir: string; homeDir: string },
    text: string,
  ): string =>
    asSnapshotSafe(
      text
        .split(scene.repoDir)
        .join('<repo>')
        .split(scene.homeDir)
        .join('<home>')
        // git prints the resolved temp dir, which may differ from the scene's form
        .replace(/\/\S*?\/\.temp\/[^\s/]+/g, '<repo>'),
    )
      .replace(/pid \d+/g, 'pid <pid>')
      // a source line number shifts with every edit above it; the step names the site
      .replace(/\(line \d+\)/g, '(line <n>)');

  const getQuota = (scene: Scene) =>
    JSON.parse(
      fs.readFileSync(
        path.join(scene.repoDir, '.meter', 'git.branch.uses.jsonc'),
        'utf-8',
      ),
    ).uses;
  const getBranch = (scene: Scene) =>
    git(scene.repoDir, ['symbolic-ref', '--short', 'HEAD']);
  const getStatus = (scene: Scene) =>
    spawnSync('git', ['status', '--porcelain'], {
      cwd: scene.repoDir,
      encoding: 'utf-8',
    }).stdout.trimEnd();
  const getSubjects = (scene: Scene, ref: string) =>
    git(scene.repoDir, ['log', '--format=%s', ref]).split('\n');
  const hasBranch = (scene: Scene, branch: string) =>
    spawnSync('git', ['show-ref', '-q', '--verify', `refs/heads/${branch}`], {
      cwd: scene.repoDir,
    }).status === 0;
  const hasUpstream = (scene: Scene, branch: string) =>
    spawnSync(
      'git',
      ['rev-parse', '--abbrev-ref', '--symbolic-full-name', `${branch}@{u}`],
      { cwd: scene.repoDir },
    ).status === 0;
  const getCutoverRefs = (scene: Scene) =>
    spawnSync('git', ['for-each-ref', 'refs/worktree/cutover/'], {
      cwd: scene.repoDir,
      encoding: 'utf-8',
    }).stdout.trim();

  /**
   * .what = a scene whose second pick conflicts with origin/main
   */
  const genConflictScene = (slug: string) =>
    genScene({
      slug,
      featureCommits: [
        FEATURE_COMMITS[0]!,
        {
          file: 'src/band.ts',
          content: 'export const band = "feature";\n',
          subject: 'cont(wave): add band of swell',
        },
      ],
      mainCommits: [
        {
          file: 'src/band.ts',
          content: 'export const band = "main";\n',
          subject: 'feat(band): add band on main',
        },
      ],
    });

  given('[case1] a plan with two picks and a dirty tree', () => {
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case1',
        featureCommits: FEATURE_COMMITS,
        mainCommits: MAIN_COMMITS_REEF,
      });
      fs.writeFileSync(path.join(scene.repoDir, 'readme.md'), '# reef v2\n');
      fs.writeFileSync(path.join(scene.repoDir, 'notes.md'), 'tide notes\n');
      return scene;
    });

    when('[t0] begin with --mode plan (the default)', () => {
      then('it previews the cutover and changes naught', () => {
        const headBefore = git(scene.repoDir, ['rev-parse', 'HEAD']);
        const result = runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.featureShas[1]!,
          '--pick',
          scene.featureShas[2]!,
        ]);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('heres the wave');
        expect(result.stdout).toContain('picks (2, in order)');
        expect(result.stdout).toContain('add wave report');
        expect(result.stdout).toContain('notes.md');
        expect(getBranch(scene)).toEqual('turtle/wave-report');
        expect(git(scene.repoDir, ['rev-parse', 'HEAD'])).toEqual(headBefore);
        expect(hasBranch(scene, 'turtle/wave-report-v2')).toBe(false);
        expect(getQuota(scene)).toEqual(3);
        expect(getStatus(scene)).toContain(' M readme.md');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case2] a single pick carried onto a fresh main', () => {
    const scene = useBeforeAll(async () =>
      genScene({
        slug: 'cutover-case2',
        featureCommits: FEATURE_COMMITS,
        mainCommits: MAIN_COMMITS_REEF,
      }),
    );

    when('[t0] begin --mode apply with one pick', () => {
      then('the new branch holds main plus the pick', () => {
        const sourceBefore = git(scene.repoDir, ['rev-parse', 'HEAD']);
        const result = runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.featureShas[0]!,
          '--mode',
          'apply',
        ]);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous');
        expect(getBranch(scene)).toEqual('turtle/wave-report-v2');
        expect(getSubjects(scene, 'HEAD')).toEqual([
          'feat(wave): add wave report',
          'feat(reef): add reef map',
          'chore(seed): seed the reef',
          ...getSubjects(scene, scene.seedSha).slice(1),
        ]);
        expect(
          git(scene.repoDir, ['rev-parse', 'refs/heads/turtle/wave-report']),
        ).toEqual(sourceBefore);
        expect(getQuota(scene)).toEqual(2);
        expect(getCutoverRefs(scene)).toEqual('');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case3] an ordered multi-pick', () => {
    const scene = useBeforeAll(async () =>
      genScene({
        slug: 'cutover-case3',
        featureCommits: FEATURE_COMMITS,
        mainCommits: MAIN_COMMITS_REEF,
      }),
    );

    when('[t0] picks named in reverse order', () => {
      const result = useBeforeAll(async () =>
        runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.featureShas[2]!,
          '--pick',
          scene.featureShas[1]!,
          '--mode',
          'apply',
        ]),
      );

      then('the picks land in the order named', () => {
        expect(result.exitCode).toBe(0);
        expect(getSubjects(scene, 'HEAD').slice(0, 3)).toEqual([
          'cont(wave): add swell height',
          'cont(wave): add tide window',
          'feat(reef): add reef map',
        ]);
      });

      then('the author is kept and the committer is the bot', () => {
        const people = git(scene.repoDir, [
          'log',
          '-1',
          '--format=%an <%ae> | %cn <%ce>',
        ]);
        expect(people).toEqual(
          'Test Human <human@test.com> | seaturtle[bot] <seaturtle@ehmpath.com>',
        );
      });

      then('the report lists each pick in order, old → new', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('picks (2, in order)');
        const tideAt = result.stdout.indexOf('cont(wave): add tide window ✓');
        const swellAt = result.stdout.indexOf('cont(wave): add swell height ✓');
        expect(tideAt).toBeGreaterThan(-1);
        expect(swellAt).toBeGreaterThan(tideAt);
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case4] the nheuron cutover: main holds a squash of the feat', () => {
    const scene = useBeforeAll(async () =>
      genScene({
        slug: 'cutover-case4',
        featureCommits: FEATURE_COMMITS,
        mainCommits: MAIN_COMMITS_SQUASHED,
      }),
    );

    when('[t0] the cont commits are picked onto fresh main', () => {
      const result = useBeforeAll(async () =>
        runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.featureShas[1]!,
          '--pick',
          scene.featureShas[2]!,
          '--mode',
          'apply',
        ]),
      );

      then('the cutover lands and lists the feat left behind', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('add wave report');
        expect(result.stdout).toContain('via squash');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('the new branch holds the squash plus the two picks', () => {
        expect(getSubjects(scene, 'HEAD').slice(0, 4)).toEqual([
          'cont(wave): add tide window',
          'cont(wave): add swell height',
          'feat(reef): add reef map',
          'feat(wave): add wave report (#12)',
        ]);
      });

      then('the new branch has no upstream', () => {
        expect(hasUpstream(scene, 'turtle/wave-report-v2')).toBe(false);
        expect(
          spawnSync('git', ['config', 'branch.turtle/wave-report-v2.merge'], {
            cwd: scene.repoDir,
          }).status,
        ).not.toBe(0);
      });

      then('naught is pushed: origin holds no new branch', () => {
        expect(
          git(scene.originDir, [
            'for-each-ref',
            '--format=%(refname)',
            'refs/heads/',
          ]).split('\n'),
        ).toEqual(['refs/heads/main']);
      });

      then('the source branch is neither moved nor deleted', () => {
        expect(
          git(scene.repoDir, ['rev-parse', 'refs/heads/turtle/wave-report']),
        ).toEqual(scene.featureShas[2]);
      });
    });

    // the seam the wish exists for: after the cutover, a feat leads again
    when('[t1] the mechanic commits a feat via git.commit.set', () => {
      const result = useBeforeAll(async () => {
        grantCommitQuota(scene);
        fs.writeFileSync(
          path.join(scene.repoDir, 'src', 'forecast.ts'),
          'export const forecast = 4;\n',
        );
        git(scene.repoDir, ['add', 'src/forecast.ts']);
        return runCommitSkill(scene, {
          skill: 'git.commit.set.sh',
          // the branch name signals neither fix nor feat, so a feat is promised
          args: [
            '-m',
            '@stdin',
            '--mode',
            'apply',
            '--promise',
            'is-netnew-behavior',
          ],
          stdin:
            'feat(wave): add wave forecast\n\n- forecast after the cutover\n',
        });
      });

      then(
        'the commit is accepted: no prior behavioral commit blocks it',
        () => {
          expect(result.stdout).toContain('righteous');
          expect(result.exitCode).toBe(0);
          expect(getSubjects(scene, 'HEAD')[0]).toEqual(
            'feat(wave): add wave forecast',
          );
          expect(getBranch(scene)).toEqual('turtle/wave-report-v2');
        },
      );
    });

    when('[t2] the mechanic plans the push via git.commit.push', () => {
      const result = useBeforeAll(async () =>
        runCommitSkill(scene, {
          skill: 'git.commit.push.sh',
          args: ['--mode', 'plan'],
          stdin: '',
        }),
      );

      then('the push targets origin/<new branch>, never main', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('push: origin/turtle/wave-report-v2');
        expect(result.stdout).not.toContain('push: origin/main');
        expect(result.stdout).toContain('title: feat(wave): add wave forecast');
      });
    });
  });

  given('[case5] uncommitted work rides along', () => {
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case5',
        featureCommits: FEATURE_COMMITS,
        mainCommits: MAIN_COMMITS_REEF,
      });
      fs.writeFileSync(path.join(scene.repoDir, 'readme.md'), '# reef v2\n');
      fs.writeFileSync(path.join(scene.repoDir, 'notes.md'), 'tide notes\n');
      const notesBefore = fs.statSync(path.join(scene.repoDir, 'notes.md'));
      fs.writeFileSync(
        path.join(scene.repoDir, '.meter', 'tide.log'),
        'ignored tide log\n',
      );
      return { ...scene, notesBefore };
    });

    when(
      '[t0] begin --mode apply with a tracked edit and an untracked file',
      () => {
        const result = useBeforeAll(async () =>
          runCutover(scene, [
            'begin',
            '--from',
            '@main',
            '--into',
            'turtle/wave-report-v2',
            '--pick',
            scene.featureShas[0]!,
            '--mode',
            'apply',
          ]),
        );

        then('the tracked edit is carried, unstaged', () => {
          expect(result.exitCode).toBe(0);
          expect(
            fs.readFileSync(path.join(scene.repoDir, 'readme.md'), 'utf-8'),
          ).toEqual('# reef v2\n');
          expect(getStatus(scene)).toContain(' M readme.md');
          expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
        });

        then('the untracked file is never touched', () => {
          const notesAfter = fs.statSync(path.join(scene.repoDir, 'notes.md'));
          expect(notesAfter.ino).toEqual(scene.notesBefore.ino);
          expect(notesAfter.mtimeMs).toEqual(scene.notesBefore.mtimeMs);
          expect(getStatus(scene)).toContain('?? notes.md');
        });

        then('a gitignored file is never cleaned', () => {
          expect(
            fs.readFileSync(
              path.join(scene.repoDir, '.meter', 'tide.log'),
              'utf-8',
            ),
          ).toEqual('ignored tide log\n');
        });

        then('no park refs and no stash are left behind', () => {
          expect(getCutoverRefs(scene)).toEqual('');
          expect(git(scene.repoDir, ['stash', 'list'])).toEqual('');
        });
      },
    );
  });

  given('[case6] a pick conflicts, then is settled', () => {
    const scene = useBeforeAll(async () => genConflictScene('cutover-case6'));

    when('[t0] begin --mode apply', () => {
      then('it halts with exit 2 and names continue + abort', () => {
        const result = runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.featureShas[0]!,
          '--pick',
          scene.featureShas[1]!,
          '--mode',
          'apply',
        ]);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('hang tight');
        expect(result.stdout).toContain('rhx git.branch.cutover continue');
        expect(result.stdout).toContain('rhx git.branch.cutover abort');
        expect(getBranch(scene)).toEqual('turtle/wave-report-v2');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] continue before the conflict is settled', () => {
      then('it refuses, since files are still in conflict', () => {
        const result = runCutover(scene, ['continue']);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('still in conflict');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] the conflict is settled and staged, then continue', () => {
      then('the cutover finishes and spends one unit only', () => {
        fs.writeFileSync(
          path.join(scene.repoDir, 'src', 'band.ts'),
          'export const band = "both";\n',
        );
        git(scene.repoDir, ['add', 'src/band.ts']);
        const result = runCutover(scene, ['continue']);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('righteous');
        expect(getSubjects(scene, 'HEAD').slice(0, 3)).toEqual([
          'cont(wave): add band of swell',
          'feat(wave): add wave report',
          'feat(band): add band on main',
        ]);
        expect(getQuota(scene)).toEqual(2);
        expect(getStatus(scene)).toEqual('');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case7] a halted cutover is aborted', () => {
    const scene = useBeforeAll(async () => {
      const scene = genConflictScene('cutover-case7');
      fs.writeFileSync(path.join(scene.repoDir, 'readme.md'), '# reef v2\n');
      git(scene.repoDir, ['add', 'readme.md']);
      fs.appendFileSync(
        path.join(scene.repoDir, '.agent', 'keyrack.yml'),
        '# tide\n',
      );
      return scene;
    });

    when('[t0] begin halts, then abort', () => {
      const halt = useBeforeAll(async () =>
        runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.featureShas[1]!,
          '--mode',
          'apply',
        ]),
      );

      then('the begin halted', () => {
        expect(halt.exitCode).toBe(2);
      });

      then('abort returns to the source, with the stage split intact', () => {
        const result = runCutover(scene, ['abort']);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('paddled back');
        expect(getBranch(scene)).toEqual('turtle/wave-report');
        expect(hasBranch(scene, 'turtle/wave-report-v2')).toBe(false);
        expect(getStatus(scene)).toContain('M  readme.md');
        expect(getStatus(scene)).toContain(' M .agent/keyrack.yml');
        expect(getCutoverRefs(scene)).toEqual('');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case8] the --into name is taken', () => {
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case8',
        featureCommits: FEATURE_COMMITS,
      });
      git(scene.repoDir, ['branch', 'turtle/taken']);
      git(scene.repoDir, [
        'push',
        '-q',
        'origin',
        'HEAD:refs/heads/turtle/far',
      ]);
      return scene;
    });

    when('[t0] --into names a local branch', () => {
      then('it refuses and names where the branch lives', () => {
        const result = runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/taken',
        ]);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('already exists');
        expect(result.stdout).toContain('local: yes');
        expect(result.stdout).toContain('turtle/taken-v2');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] --into names a branch on origin only', () => {
      then('it refuses and names origin', () => {
        const result = runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/far',
        ]);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('local: no');
        expect(result.stdout).toContain('origin: yes');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case9] the carry of tracked edits conflicts', () => {
    const genCarryScene = (slug: string) => {
      const scene = genScene({
        slug,
        featureCommits: FEATURE_COMMITS,
        mainCommits: [
          {
            file: 'readme.md',
            content: '# reef, from main\n',
            subject: 'docs(readme): retitle the reef',
          },
        ],
      });
      fs.writeFileSync(
        path.join(scene.repoDir, 'readme.md'),
        '# reef, from the tree\n',
      );
      return scene;
    };
    const applyArgs = [
      'begin',
      '--from',
      '@main',
      '--into',
      'turtle/wave-report-v2',
      '--mode',
      'apply',
    ];

    when('[t0] begin halts on the carry, then it is settled', () => {
      const scene = useBeforeAll(async () =>
        genCarryScene('cutover-case9-continue'),
      );

      then('begin halts with exit 2', () => {
        const result = runCutover(scene, applyArgs);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('hang tight');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('continue after the settle leaves the edit unstaged', () => {
        fs.writeFileSync(
          path.join(scene.repoDir, 'readme.md'),
          '# reef, settled\n',
        );
        git(scene.repoDir, ['add', 'readme.md']);
        const result = runCutover(scene, ['continue']);
        expect(result.exitCode).toBe(0);
        expect(getStatus(scene)).toEqual(' M readme.md');
        expect(getCutoverRefs(scene)).toEqual('');
      });
    });

    when('[t1] begin halts on the carry, then abort', () => {
      const scene = useBeforeAll(async () =>
        genCarryScene('cutover-case9-abort'),
      );

      then('abort restores the tracked edit on the source', () => {
        expect(runCutover(scene, applyArgs).exitCode).toBe(2);
        const result = runCutover(scene, ['abort']);
        expect(result.exitCode).toBe(0);
        expect(getBranch(scene)).toEqual('turtle/wave-report');
        expect(
          fs.readFileSync(path.join(scene.repoDir, 'readme.md'), 'utf-8'),
        ).toEqual('# reef, from the tree\n');
        expect(hasBranch(scene, 'turtle/wave-report-v2')).toBe(false);
        expect(result.stdout).toContain('restored from park');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case10] a pick whose change is already on the base', () => {
    const scene = useBeforeAll(async () =>
      genScene({
        slug: 'cutover-case10',
        featureCommits: FEATURE_COMMITS,
        mainCommits: MAIN_COMMITS_SQUASHED,
      }),
    );

    when('[t0] plan with a squashed pick, a repeat, and an ancestor', () => {
      then('each is marked to drop, with its reason', () => {
        const result = runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.featureShas[0]!,
          '--pick',
          scene.featureShas[1]!,
          '--pick',
          scene.featureShas[1]!,
          '--pick',
          scene.seedSha,
        ]);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('will drop');
        expect(result.stdout).toContain('named twice');
        expect(result.stdout).toContain('already on origin/main');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] apply with the squashed pick', () => {
      then('the empty pick is dropped and reported', () => {
        const result = runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.featureShas[0]!,
          '--mode',
          'apply',
        ]);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('already on origin/main');
        expect(getSubjects(scene, 'HEAD')[0]).toEqual(
          'feat(reef): add reef map',
        );
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case11] another operation is in flight', () => {
    when('[t0] a cutover is halted', () => {
      const scene = useBeforeAll(async () => {
        const scene = genConflictScene('cutover-case11-cutover');
        runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.featureShas[1]!,
          '--mode',
          'apply',
        ]);
        return scene;
      });

      then('a second begin refuses and names continue + abort', () => {
        const result = runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/other',
        ]);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('already in flight');
        expect(result.stdout).toContain('add band of swell');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] a rebase is halted', () => {
      const scene = useBeforeAll(async () => {
        const scene = genConflictScene('cutover-case11-rebase');
        spawnSync('git', ['rebase', 'origin/main'], {
          cwd: scene.repoDir,
          encoding: 'utf-8',
        });
        git(scene.repoDir, ['fetch', '-q', 'origin']);
        spawnSync('git', ['rebase', 'origin/main'], {
          cwd: scene.repoDir,
          encoding: 'utf-8',
        });
        return scene;
      });

      then('begin refuses and names the rebase', () => {
        const result = runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/other',
        ]);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('a rebase is already in flight');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case12] an untracked file would collide', () => {
    when('[t0] the base adds a file the tree holds untracked', () => {
      const scene = useBeforeAll(async () => {
        const scene = genScene({
          slug: 'cutover-case12-base',
          featureCommits: FEATURE_COMMITS,
          mainCommits: MAIN_COMMITS_REEF,
        });
        fs.writeFileSync(
          path.join(scene.repoDir, 'src', 'reef.ts'),
          'my own reef\n',
        );
        return scene;
      });

      then('begin refuses and the file is untouched', () => {
        const result = runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--mode',
          'apply',
        ]);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('untracked files would be overwritten');
        expect(result.stdout).toContain('src/reef.ts');
        expect(
          fs.readFileSync(path.join(scene.repoDir, 'src', 'reef.ts'), 'utf-8'),
        ).toEqual('my own reef\n');
        expect(getBranch(scene)).toEqual('turtle/wave-report');
        expect(getQuota(scene)).toEqual(3);
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] a pick adds a file the tree holds untracked', () => {
      const scene = useBeforeAll(async () => {
        const scene = genScene({
          slug: 'cutover-case12-pick',
          featureCommits: FEATURE_COMMITS,
        });
        git(scene.repoDir, [
          'checkout',
          '-q',
          '-b',
          'turtle/side',
          scene.seedSha,
        ]);
        const sideSha = commitFile(scene.repoDir, {
          file: 'src/shell.ts',
          content: 'export const shell = 4;\n',
          subject: 'feat(shell): add shell',
        });
        git(scene.repoDir, ['checkout', '-q', 'turtle/wave-report']);
        fs.writeFileSync(
          path.join(scene.repoDir, 'src', 'shell.ts'),
          'my own shell\n',
        );
        return { ...scene, sideSha };
      });

      then('begin refuses and names the file', () => {
        const result = runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.sideSha,
        ]);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('src/shell.ts');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case13] --from @tree', () => {
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case13',
        featureCommits: FEATURE_COMMITS,
      });
      fs.writeFileSync(path.join(scene.repoDir, 'readme.md'), '# reef v2\n');
      return scene;
    });

    when('[t0] --pick rides with @tree', () => {
      then('it refuses', () => {
        const result = runCutover(scene, [
          'begin',
          '--from',
          '@tree',
          '--into',
          'turtle/reef-shoals',
          '--pick',
          scene.featureShas[0]!,
        ]);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('--pick is refused with --from @tree');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] --from is absent', () => {
      then('it refuses and lists the three forms', () => {
        const result = runCutover(scene, [
          'begin',
          '--into',
          'turtle/reef-shoals',
        ]);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('--from is required');
        expect(result.stdout).toContain('--from @main');
        expect(result.stdout).toContain('--from @tree');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] begin --mode apply', () => {
      then('it stacks on HEAD and leaves the edit in place', () => {
        const headBefore = git(scene.repoDir, ['rev-parse', 'HEAD']);
        const result = runCutover(scene, [
          'begin',
          '--from',
          '@tree',
          '--into',
          'turtle/reef-shoals',
          '--mode',
          'apply',
        ]);
        expect(result.exitCode).toBe(0);
        expect(getBranch(scene)).toEqual('turtle/reef-shoals');
        expect(git(scene.repoDir, ['rev-parse', 'HEAD'])).toEqual(headBefore);
        expect(getStatus(scene)).toEqual(' M readme.md');
        expect(hasUpstream(scene, 'turtle/reef-shoals')).toBe(false);
        expect(getQuota(scene)).toEqual(2);
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case14] --from a named branch', () => {
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case14',
        featureCommits: FEATURE_COMMITS,
      });
      git(scene.repoDir, [
        'push',
        '-q',
        'origin',
        `${scene.seedSha}:refs/heads/release/v2`,
      ]);
      return scene;
    });

    when('[t0] --from release/v2, which origin holds', () => {
      then('the plan cuts from origin/release/v2', () => {
        const result = runCutover(scene, [
          'begin',
          '--from',
          'release/v2',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.featureShas[0]!,
        ]);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('origin/release/v2');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] --from a branch origin lacks', () => {
      then('it refuses', () => {
        const result = runCutover(scene, [
          'begin',
          '--from',
          'release/v9',
          '--into',
          'turtle/wave-report-v2',
        ]);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('--from release/v9 is not on origin');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case16] the commit level the new branch will enforce', () => {
    const scene = useBeforeAll(async () =>
      genScene({ slug: 'cutover-case16', featureCommits: FEATURE_COMMITS }),
    );

    when('[t0] apply --into a feat branch, with no bind', () => {
      then('the report infers feat from the name', () => {
        const result = runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'feat/wave-report-v2',
          '--mode',
          'apply',
        ]);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          'commit level: feat (inferred from the name) — feat leads',
        );
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] apply with an explicit fix bind in this worktree', () => {
      then('the report names the bind over the name', () => {
        fs.mkdirSync(path.join(scene.repoDir, '.branch', '.bind'), {
          recursive: true,
        });
        fs.writeFileSync(
          path.join(scene.repoDir, '.branch', '.bind', 'git.commit.level'),
          'fix',
        );
        fs.writeFileSync(path.join(scene.repoDir, 'readme.md'), '# reef v3\n');
        const result = runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'feat/wave-report-v3',
          '--mode',
          'apply',
        ]);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          'commit level: fix (explicit bind) — fix leads',
        );
        // the next-step hint must lead with a type the branch accepts
        expect(result.stdout).toContain("printf 'fix(scope): ...'");
        expect(result.stdout).not.toContain("printf 'feat(scope)");
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case17] origin holds master, not main', () => {
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case17',
        featureCommits: FEATURE_COMMITS,
      });
      git(scene.repoDir, [
        'push',
        '-q',
        'origin',
        `${scene.seedSha}:refs/heads/master`,
      ]);
      git(scene.originDir, ['symbolic-ref', 'HEAD', 'refs/heads/master']);
      git(scene.repoDir, ['push', '-q', 'origin', '--delete', 'main']);
      return scene;
    });

    when('[t0] begin --from @main', () => {
      then('the plan cuts from origin/master', () => {
        const result = runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.featureShas[0]!,
        ]);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('base: origin/master @');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case18] the source is a detached HEAD', () => {
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case18',
        featureCommits: FEATURE_COMMITS,
        mainCommits: MAIN_COMMITS_REEF,
      });
      git(scene.repoDir, ['checkout', '-q', '--detach']);
      return scene;
    });

    when('[t0] begin --mode plan', () => {
      then('the source is reported as a sha alone', () => {
        const result = runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.featureShas[0]!,
        ]);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).not.toContain('turtle/wave-report @');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] begin --mode apply', () => {
      then('the cutover lands on the new branch', () => {
        const result = runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.featureShas[0]!,
          '--mode',
          'apply',
        ]);
        expect(result.exitCode).toBe(0);
        expect(getBranch(scene)).toEqual('turtle/wave-report-v2');
        expect(getSubjects(scene, 'HEAD').slice(0, 2)).toEqual([
          'feat(wave): add wave report',
          'feat(reef): add reef map',
        ]);
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case19] the cut itself fails after preflight passed', () => {
    // .why = a ref lock held by another git process lets every preflight pass
    //        (a lock is not a ref), then fails `git branch` at the cut. the
    //        cutover must back out loud, spend no unit, and leave no state
    //        that would block the next begin
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case19',
        featureCommits: FEATURE_COMMITS,
        mainCommits: MAIN_COMMITS_REEF,
      });
      fs.writeFileSync(path.join(scene.repoDir, 'readme.md'), '# reef v2\n');
      fs.writeFileSync(
        path.join(
          scene.repoDir,
          '.git',
          'refs',
          'heads',
          'turtle',
          'wave-report-v2.lock',
        ),
        '',
      );
      return scene;
    });

    when('[t0] begin --mode apply', () => {
      const result = useBeforeAll(async () =>
        runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.featureShas[0]!,
          '--mode',
          'apply',
        ]),
      );

      then('it fails loud as a malfunction', () => {
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain(
          'the cut of turtle/wave-report-v2 failed; naught changed',
        );
        expect(result.stderr).toContain('the cut of turtle/wave-report-v2');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('no unit is spent', () => {
        expect(getQuota(scene)).toEqual(3);
      });

      then('the source, its tracked edit, and no leftovers remain', () => {
        expect(getBranch(scene)).toEqual('turtle/wave-report');
        expect(hasBranch(scene, 'turtle/wave-report-v2')).toBe(false);
        expect(
          fs.readFileSync(path.join(scene.repoDir, 'readme.md'), 'utf-8'),
        ).toEqual('# reef v2\n');
        expect(getCutoverRefs(scene)).toEqual('');
        expect(fs.existsSync(path.join(scene.repoDir, '.git', 'cutover'))).toBe(
          false,
        );
      });
    });
  });

  given('[case20] an @tree apply was killed after its cut', () => {
    // .why = @tree parks naught: its tracked edits live only in the worktree.
    //        an abort after a crash must switch back without a reset, or it
    //        destroys the very edits the cutover promised to keep.
    // .note = no clean failure exists after the @tree cut, so the scene lays
    //         down what a killed apply leaves: the branch cut + checked out,
    //         and the state file at phase "picks", in the shape begin writes
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case20',
        featureCommits: FEATURE_COMMITS,
      });
      fs.writeFileSync(path.join(scene.repoDir, 'readme.md'), '# reef v2\n');
      git(scene.repoDir, ['checkout', '-q', '--no-track', '-b', 'turtle/reef']);
      const cutoverDir = path.join(scene.repoDir, '.git', 'cutover');
      fs.mkdirSync(cutoverDir, { recursive: true });
      fs.writeFileSync(
        path.join(cutoverDir, 'state.json'),
        JSON.stringify({
          schema: 1,
          into: 'turtle/reef',
          source_name: 'turtle/wave-report',
          source_sha: scene.featureShas[2],
          base_kind: '@tree',
          base_label: 'HEAD',
          base_sha: scene.featureShas[2],
          phase: 'picks',
          halt: '',
          pick_index: 0,
          picks: [],
          tracked: [' M readme.md'],
          untracked: [],
          left_behind: [],
        }),
      );
      return scene;
    });

    when('[t0] abort', () => {
      const result = useBeforeAll(async () => runCutover(scene, ['abort']));

      then('it returns to the source branch', () => {
        expect(result.exitCode).toBe(0);
        expect(getBranch(scene)).toEqual('turtle/wave-report');
        expect(hasBranch(scene, 'turtle/reef')).toBe(false);
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('the uncommitted tracked edit survives', () => {
        expect(
          fs.readFileSync(path.join(scene.repoDir, 'readme.md'), 'utf-8'),
        ).toEqual('# reef v2\n');
        expect(getStatus(scene)).toContain(' M readme.md');
      });
    });
  });

  given('[case15] the itemized refusals', () => {
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case15',
        featureCommits: FEATURE_COMMITS,
        quota: null,
      });
      git(scene.repoDir, [
        'checkout',
        '-q',
        '-b',
        'turtle/side',
        scene.seedSha,
      ]);
      commitFile(scene.repoDir, {
        file: 'src/shell.ts',
        content: 'export const shell = 4;\n',
        subject: 'feat(shell): add shell',
      });
      git(scene.repoDir, [
        'checkout',
        '-q',
        '-b',
        'turtle/merged',
        'turtle/wave-report',
      ]);
      git(scene.repoDir, [
        'merge',
        '-q',
        '--no-ff',
        '-m',
        'merge side',
        'turtle/side',
      ]);
      const mergeSha = git(scene.repoDir, ['rev-parse', 'HEAD']);
      git(scene.repoDir, ['checkout', '-q', 'turtle/wave-report']);
      return { ...scene, mergeSha };
    });
    const baseArgs = [
      'begin',
      '--from',
      '@main',
      '--into',
      'turtle/wave-report-v2',
    ];

    when('[t0] --pick names an unknown sha', () => {
      then('it refuses', () => {
        const result = runCutover(scene, [...baseArgs, '--pick', 'deadbeef']);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('does not hold');
        expect(result.stdout).toContain('deadbeef');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] --pick names a merge commit', () => {
      then('it refuses', () => {
        const result = runCutover(scene, [
          ...baseArgs,
          '--pick',
          scene.mergeSha,
        ]);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('merge commit');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] --pick names a range', () => {
      then('it refuses', () => {
        const result = runCutover(scene, [...baseArgs, '--pick', 'main..HEAD']);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('is a range');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] no quota is granted', () => {
      then('apply refuses and plan still runs', () => {
        const apply = runCutover(scene, [...baseArgs, '--mode', 'apply']);
        expect(apply.exitCode).toBe(2);
        expect(apply.stdout).toContain('no cutover quota set');
        expect(apply.stderr).toContain('no cutover quota set');
        expect(getBranch(scene)).toEqual('turtle/wave-report');
        // the refusal releases the claim, so no state blocks the next begin
        expect(fs.existsSync(path.join(scene.repoDir, '.git', 'cutover'))).toBe(
          false,
        );
        const plan = runCutover(scene, baseArgs);
        expect(plan.exitCode).toBe(0);
        expect(asSnapshotSafe(apply.stdout)).toMatchSnapshot();
        expect(asSnapshotSafe(plan.stdout)).toMatchSnapshot();
      });
    });

    when('[t4] continue or abort with no cutover in flight', () => {
      then('each refuses and names begin', () => {
        const cont = runCutover(scene, ['continue']);
        expect(cont.exitCode).toBe(2);
        expect(cont.stdout).toContain('begin');
        const abort = runCutover(scene, ['abort']);
        expect(abort.exitCode).toBe(2);
        expect(abort.stdout).toContain('begin');
        expect(asSnapshotSafe(cont.stdout)).toMatchSnapshot();
        expect(asSnapshotSafe(abort.stdout)).toMatchSnapshot();
      });
    });

    when('[t5] no subcommand', () => {
      then('it refuses with usage', () => {
        const result = runCutover(scene, []);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('begin');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t6] --into is absent', () => {
      then('it refuses', () => {
        const result = runCutover(scene, ['begin', '--from', '@main']);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('--into is required');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case21] a human asks for help', () => {
    const scene = useBeforeAll(async () =>
      genScene({ slug: 'cutover-case21', featureCommits: FEATURE_COMMITS }),
    );

    when('[t0] begin --help', () => {
      then('it teaches the flags, with copy-paste examples', () => {
        const result = runCutover(scene, ['begin', '--help']);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('usage: git.branch.cutover begin');
        expect(result.stdout).toContain('examples:');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] continue --help and abort --help', () => {
      then('each says what it does, with an example', () => {
        const cont = runCutover(scene, ['continue', '--help']);
        const abort = runCutover(scene, ['abort', '--help']);
        expect(cont.exitCode).toBe(0);
        expect(abort.exitCode).toBe(0);
        expect(cont.stdout).toContain('rhx git.branch.cutover continue');
        expect(abort.stdout).toContain('rhx git.branch.cutover abort');
        expect(`${cont.stdout}\n${abort.stdout}`).toMatchSnapshot();
      });
    });
  });

  given(
    '[case22] a pick committed, then the process died before its state write',
    () => {
      // .why = land_settled_pick commits, then records that it landed. a kill
      //        between the two leaves state at the conflict halt while the
      //        commit stands. the resume must report it landed, never dropped,
      //        and must not commit it twice
      // .note = the scene settles the conflict and makes the commit by hand,
      //         exactly as the killed process would have, then resumes
      const scene = useBeforeAll(async () =>
        genConflictScene('cutover-case22'),
      );

      when('[t0] begin halts, the pick is committed, then continue', () => {
        const halt = useBeforeAll(async () =>
          runCutover(scene, [
            'begin',
            '--from',
            '@main',
            '--into',
            'turtle/wave-report-v2',
            '--pick',
            scene.featureShas[0]!,
            '--pick',
            scene.featureShas[1]!,
            '--mode',
            'apply',
          ]),
        );
        const result = useBeforeAll(async () => {
          fs.writeFileSync(
            path.join(scene.repoDir, 'src', 'band.ts'),
            'export const band = "both";\n',
          );
          git(scene.repoDir, ['add', 'src/band.ts']);
          git(scene.repoDir, [
            'commit',
            '-q',
            '--no-verify',
            '-C',
            scene.featureShas[1]!,
          ]);
          return runCutover(scene, ['continue']);
        });

        then('the begin halted on the conflict', () => {
          expect(halt.exitCode).toBe(2);
        });

        then(
          'continue finishes and reports the pick landed, not dropped',
          () => {
            expect(result.exitCode).toBe(0);
            expect(result.stdout).not.toContain('dropped');
            expect(result.stdout).toContain('cont(wave): add band of swell ✓');
            expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
          },
        );

        then('the pick is committed once, not twice', () => {
          expect(getSubjects(scene, 'HEAD').slice(0, 3)).toEqual([
            'cont(wave): add band of swell',
            'feat(wave): add wave report',
            'feat(band): add band on main',
          ]);
        });
      });
    },
  );

  given('[case23] two begins race for one worktree', () => {
    // .why = the in-flight check is a read; two begins can both pass it. the
    //        state claim is the gate: of two claims, exactly one succeeds
    // .note = a race cannot be timed in a test, so the claim is driven
    //         directly, twice, as the two racers would drive it
    const scene = useBeforeAll(async () =>
      genScene({ slug: 'cutover-case23', featureCommits: FEATURE_COMMITS }),
    );

    when('[t0] the state is claimed twice', () => {
      const result = useBeforeAll(async () =>
        spawnSync(
          'bash',
          [
            '-c',
            [
              `source "${path.join(__dirname, 'git.branch.cutover.operations.sh')}"`,
              `set_state_json_exclusive '{"into":"turtle/first"}' && echo "first: claimed"`,
              `set_state_json_exclusive '{"into":"turtle/second"}' || echo "second: refused"`,
              `get_state '.into'`,
            ].join('\n'),
          ],
          { cwd: scene.repoDir, encoding: 'utf-8' },
        ),
      );

      then('the first claims, the second is refused', () => {
        expect(result.stdout).toContain('first: claimed');
        expect(result.stdout).toContain('second: refused');
      });

      then('the state holds the first claim, unchanged', () => {
        expect(result.stdout.trim().split('\n').pop()).toEqual('turtle/first');
      });
    });
  });

  given(
    '[case24] the carry finished, then the process died before the state cleared',
    () => {
      // .why = continue refuses a cutover with no halt and names abort. abort
      //        resets the worktree, then lays the park back down. if the park
      //        dropped with the carry, a kill before the state cleared leaves
      //        abort to reset the carried edits with no copy left
      // .note = the scene halts on a carry conflict, settles it, then runs the
      //         carry finish alone, as a continue killed right after it would
      const scene = useBeforeAll(async () => {
        const scene = genScene({
          slug: 'cutover-case24',
          featureCommits: FEATURE_COMMITS,
          mainCommits: [
            {
              file: 'readme.md',
              content: '# reef, from main\n',
              subject: 'docs(readme): retitle the reef',
            },
          ],
        });
        fs.writeFileSync(
          path.join(scene.repoDir, 'readme.md'),
          '# reef, from the tree\n',
        );
        return scene;
      });

      when(
        '[t0] begin halts on the carry, the carry finishes, then abort',
        () => {
          const halt = useBeforeAll(async () =>
            runCutover(scene, [
              'begin',
              '--from',
              '@main',
              '--into',
              'turtle/wave-report-v2',
              '--mode',
              'apply',
            ]),
          );
          const result = useBeforeAll(async () => {
            fs.writeFileSync(
              path.join(scene.repoDir, 'readme.md'),
              '# reef, settled\n',
            );
            git(scene.repoDir, ['add', 'readme.md']);
            spawnSync(
              'bash',
              [
                '-c',
                `source "${path.join(__dirname, 'git.branch.cutover.operations.sh')}"\nfinish_carry`,
              ],
              { cwd: scene.repoDir },
            );
            return runCutover(scene, ['abort']);
          });

          then('the begin halted on the carry', () => {
            expect(halt.exitCode).toBe(2);
          });

          then(
            'abort returns to the source with the original edit restored',
            () => {
              expect(result.exitCode).toBe(0);
              expect(getBranch(scene)).toEqual('turtle/wave-report');
              expect(
                fs.readFileSync(path.join(scene.repoDir, 'readme.md'), 'utf-8'),
              ).toEqual('# reef, from the tree\n');
              expect(result.stdout).toContain('restored from park');
              expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
            },
          );

          then('no park refs or state remain', () => {
            expect(getCutoverRefs(scene)).toEqual('');
            expect(
              fs.existsSync(path.join(scene.repoDir, '.git', 'cutover')),
            ).toBe(false);
          });
        },
      );
    },
  );

  given('[case25] the dispatcher and the argument parsers', () => {
    const scene = useBeforeAll(async () =>
      genScene({ slug: 'cutover-case25', featureCommits: FEATURE_COMMITS }),
    );

    when('[t0] help', () => {
      then('it lists the subcommands, with examples', () => {
        const result = runCutover(scene, ['help']);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('begin');
        expect(result.stdout).toContain('continue');
        expect(result.stdout).toContain('abort');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] --help with no subcommand', () => {
      then('it lists the subcommands, as help does', () => {
        const result = runCutover(scene, ['--help']);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toEqual(runCutover(scene, ['help']).stdout);
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] an unknown subcommand', () => {
      then('it refuses with the usage nested in one tree', () => {
        const result = runCutover(scene, ['sprout']);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('unknown subcommand: sprout');
        expect(result.stderr).toContain('unknown subcommand: sprout');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t3] each subcommand gets an unknown argument', () => {
      then('each refuses and names its usage', () => {
        const begin = runCutover(scene, ['begin', '--bogus']);
        const cont = runCutover(scene, ['continue', '--bogus']);
        const abort = runCutover(scene, ['abort', '--bogus']);
        for (const result of [begin, cont, abort]) {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('unknown argument: --bogus');
        }
        expect(cont.stdout).toContain('usage: rhx git.branch.cutover continue');
        expect(abort.stdout).toContain('usage: rhx git.branch.cutover abort');
        expect(
          [begin.stdout, cont.stdout, abort.stdout].join('\n'),
        ).toMatchSnapshot();
      });
    });

    when('[t4] a flag is given no value', () => {
      then('it refuses and names the flag', () => {
        const result = runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          '--pick',
        ]);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('--into needs a value');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t5] --into is not a valid branch name', () => {
      then('it refuses and names a valid shape', () => {
        const result = runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle..reef',
        ]);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          '--into turtle..reef is not a valid branch name',
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t6] --from is not @main, @tree, or a valid branch name', () => {
      then('it refuses', () => {
        const result = runCutover(scene, [
          'begin',
          '--from',
          'turtle..reef',
          '--into',
          'turtle/wave-report-v2',
        ]);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          '--from turtle..reef is not @main, @tree, or a valid branch name',
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t7] each subcommand runs outside a git repo', () => {
      then('each refuses and names where to run it', () => {
        const bareDir = genTempDir({
          slug: 'cutover-case25-nogit',
          git: false,
        });
        const runOutside = (args: string[]) => {
          const result = spawnSync('bash', [scriptPath, ...args], {
            cwd: bareDir,
            encoding: 'utf-8',
            env: {
              ...process.env,
              HOME: scene.homeDir,
              GIT_CEILING_DIRECTORIES: path.dirname(bareDir),
            },
          });
          return { stdout: result.stdout ?? '', exitCode: result.status ?? 1 };
        };
        const begin = runOutside([
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/x',
        ]);
        const cont = runOutside(['continue']);
        const abort = runOutside(['abort']);
        for (const result of [begin, cont, abort]) {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            '✋ ConstraintError: not in a git repository',
          );
        }
        expect(
          [begin.stdout, cont.stdout, abort.stdout].join('\n'),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case26] origin cannot supply a base', () => {
    const baseArgs = [
      'begin',
      '--from',
      '@main',
      '--into',
      'turtle/wave-report-v2',
    ];

    when('[t0] there is no origin remote', () => {
      const scene = useBeforeAll(async () => {
        const scene = genScene({
          slug: 'cutover-case26-noorigin',
          featureCommits: FEATURE_COMMITS,
        });
        git(scene.repoDir, ['remote', 'remove', 'origin']);
        return scene;
      });

      then('it refuses and names @tree as the way without origin', () => {
        const result = runCutover(scene, baseArgs);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('no origin remote to cut --from @main');
        expect(result.stdout).toContain('--from @tree');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] origin holds neither main nor master', () => {
      const scene = useBeforeAll(async () => {
        const scene = genScene({
          slug: 'cutover-case26-nomain',
          featureCommits: FEATURE_COMMITS,
        });
        git(scene.repoDir, ['push', '-q', 'origin', 'main:refs/heads/trunk']);
        git(scene.originDir, ['symbolic-ref', 'HEAD', 'refs/heads/trunk']);
        git(scene.originDir, ['update-ref', '-d', 'refs/heads/main']);
        return scene;
      });

      then('it refuses and names --from <branch>', () => {
        const result = runCutover(scene, baseArgs);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'origin has no main or master branch to cut --from @main',
        );
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] the fetch of the base fails', () => {
      // .why = a lock on the local copy of origin/main lets ls-remote pass,
      //        then fails the fetch that would refresh it
      const scene = useBeforeAll(async () => {
        const scene = genScene({
          slug: 'cutover-case26-fetch',
          featureCommits: FEATURE_COMMITS,
          mainCommits: MAIN_COMMITS_REEF,
        });
        const lockDir = path.join(
          scene.repoDir,
          '.git',
          'refs',
          'remotes',
          'origin',
        );
        fs.mkdirSync(lockDir, { recursive: true });
        fs.writeFileSync(path.join(lockDir, 'main.lock'), '');
        return scene;
      });

      then('it fails loud as a malfunction, and changes naught', () => {
        const result = runCutover(scene, baseArgs);
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain(
          '💥 MalfunctionError: could not fetch origin/main',
        );
        expect(result.stderr).toContain('could not fetch origin/main');
        expect(getBranch(scene)).toEqual('turtle/wave-report');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] unmerged files sit in the index, with no op in flight', () => {
      // .why = a merge conflict with its MERGE_HEAD removed leaves unmerged
      //        entries that no foreign-op check would catch
      const scene = useBeforeAll(async () => {
        const scene = genScene({
          slug: 'cutover-case26-unmerged',
          featureCommits: FEATURE_COMMITS,
        });
        git(scene.repoDir, [
          'checkout',
          '-q',
          '-b',
          'turtle/rival',
          scene.seedSha,
        ]);
        commitFile(scene.repoDir, {
          file: 'src/wave.ts',
          content: 'export const wave = 9;\n',
          subject: 'feat(wave): a rival wave',
        });
        git(scene.repoDir, ['checkout', '-q', 'turtle/wave-report']);
        spawnSync('git', ['merge', '-q', 'turtle/rival'], {
          cwd: scene.repoDir,
        });
        fs.rmSync(path.join(scene.repoDir, '.git', 'MERGE_HEAD'));
        return scene;
      });

      then('it refuses and names each unmerged file', () => {
        const result = runCutover(scene, baseArgs);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('unmerged files sit in the index');
        expect(result.stdout).toContain('src/wave.ts');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case27] a peer cutover verb holds the worktree lock', () => {
    // .why = continue and abort read the state, then mutate it and the
    //        worktree. a second live verb would interleave those writes; the
    //        lock lets one run at a time, and a dead holder never strands it
    const scene = useBeforeAll(async () => {
      const scene = genConflictScene('cutover-case27');
      const halt = runCutover(scene, [
        'begin',
        '--from',
        '@main',
        '--into',
        'turtle/wave-report-v2',
        '--pick',
        scene.featureShas[1]!,
        '--mode',
        'apply',
      ]);
      if (halt.exitCode !== 2)
        throw new Error(`case27 setup: begin did not halt: ${halt.stdout}`);
      return scene;
    });
    const lockFile = () => path.join(scene.repoDir, '.git', 'cutover.lock');
    const asPidSafe = (text: string) =>
      asSnapshotSafe(
        text
          .replace(/pid \d+/g, 'pid <pid>')
          .replace(/lock: \S*cutover\.lock/g, 'lock: <repo>/.git/cutover.lock'),
      );

    when('[t0] a live process holds the lock', () => {
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

      then('continue and abort each refuse, and change naught', () => {
        const stateBefore = fs.readFileSync(
          path.join(scene.repoDir, '.git', 'cutover', 'state.json'),
          'utf-8',
        );
        const cont = runCutover(scene, ['continue']);
        const abort = runCutover(scene, ['abort']);
        for (const result of [cont, abort]) {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            'another cutover verb runs in this worktree right now',
          );
          expect(result.stdout).toContain(`held by: pid ${holder.pid}`);
        }
        expect(getBranch(scene)).toEqual('turtle/wave-report-v2');
        expect(
          fs.readFileSync(
            path.join(scene.repoDir, '.git', 'cutover', 'state.json'),
            'utf-8',
          ),
        ).toEqual(stateBefore);
        expect(fs.readFileSync(lockFile(), 'utf-8')).toEqual(`${holder.pid}\n`);
        expect(asPidSafe(cont.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] the holder of the lock is dead', () => {
      then('abort reclaims the lock, undoes the cutover, and frees it', () => {
        const dead = spawnSync('true');
        fs.writeFileSync(lockFile(), `${dead.pid}\n`);
        const result = runCutover(scene, ['abort']);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('paddled back');
        expect(getBranch(scene)).toEqual('turtle/wave-report');
        expect(fs.existsSync(lockFile())).toBe(false);
      });
    });
  });

  given('[case28] an abort is killed after it restored the edits', () => {
    // .why = abort lays the parked edits back, then clears state and park.
    //        a kill between the two must never leave a state that sends a
    //        rerun of abort to reset the edits it just restored
    //
    // .mock = a git shim on PATH execs the real git for every call, except
    //         the first park-ref delete, where it kill -9s the abort itself
    // .why  = a kill at one exact instant cannot be scheduled from outside;
    //         the shim is the only way to land it between two git calls
    const scene = useBeforeAll(async () => {
      const scene = genConflictScene('cutover-case28');
      fs.writeFileSync(path.join(scene.repoDir, 'readme.md'), '# reef v2\n');
      const halt = runCutover(scene, [
        'begin',
        '--from',
        '@main',
        '--into',
        'turtle/wave-report-v2',
        '--pick',
        scene.featureShas[1]!,
        '--mode',
        'apply',
      ]);
      if (halt.exitCode !== 2)
        throw new Error(`case28 setup: begin did not halt: ${halt.stdout}`);
      return scene;
    });

    when(
      '[t0] the abort dies at its first park-ref delete, then reruns',
      () => {
        const outcome = useBeforeAll(async () => {
          const binDir = genTempDir({ slug: 'cutover-case28-bin', git: false });
          const realGit = spawnSync('which', ['git'], {
            encoding: 'utf-8',
          }).stdout.trim();
          fs.writeFileSync(
            path.join(binDir, 'git'),
            [
              '#!/usr/bin/env bash',
              'if [[ "$1" == "update-ref" && "$2" == "-d" && "$3" == refs/worktree/cutover/* ]]; then',
              '  kill -9 "$PPID"',
              '  exit 1',
              'fi',
              'exec "$REAL_GIT" "$@"',
              '',
            ].join('\n'),
          );
          fs.chmodSync(path.join(binDir, 'git'), '755');
          const killed = spawnSync('bash', [scriptPath, 'abort'], {
            cwd: scene.repoDir,
            encoding: 'utf-8',
            env: {
              ...process.env,
              HOME: scene.homeDir,
              PATH: `${binDir}:${process.env.PATH}`,
              REAL_GIT: realGit,
            },
          });
          const editAfterKill = fs.readFileSync(
            path.join(scene.repoDir, 'readme.md'),
            'utf-8',
          );
          const rerun = runCutover(scene, ['abort']);
          return { killed, editAfterKill, rerun };
        });

        then('the kill landed mid-abort', () => {
          expect(outcome.killed.signal).toEqual('SIGKILL');
          expect(outcome.editAfterKill).toEqual('# reef v2\n');
        });

        then('the rerun finds no cutover, and the edit survives', () => {
          expect(outcome.rerun.exitCode).toBe(2);
          expect(outcome.rerun.stdout).toContain(
            'no cutover is in flight to abort',
          );
          expect(
            fs.readFileSync(path.join(scene.repoDir, 'readme.md'), 'utf-8'),
          ).toEqual('# reef v2\n');
          expect(getBranch(scene)).toEqual('turtle/wave-report');
          expect(asSnapshotSafe(outcome.rerun.stdout)).toMatchSnapshot();
        });
      },
    );
  });

  given('[case29] continue resumes at a pick whose replay never began', () => {
    // .why = a kill after one pick lands, before the next pick's replay
    //        begins, leaves the cursor on a pick with no settled work.
    //        continue must replay it, never drop it as empty
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case29',
        featureCommits: [
          FEATURE_COMMITS[0]!,
          {
            file: 'src/band.ts',
            content: 'export const band = "feature";\n',
            subject: 'cont(wave): add band of swell',
          },
          FEATURE_COMMITS[2]!,
        ],
        mainCommits: [
          {
            file: 'src/band.ts',
            content: 'export const band = "main";\n',
            subject: 'feat(band): add band on main',
          },
        ],
      });
      const halt = runCutover(scene, [
        'begin',
        '--from',
        '@main',
        '--into',
        'turtle/wave-report-v2',
        '--pick',
        scene.featureShas[1]!,
        '--pick',
        scene.featureShas[2]!,
        '--mode',
        'apply',
      ]);
      if (halt.exitCode !== 2)
        throw new Error(`case29 setup: begin did not halt: ${halt.stdout}`);

      // the band pick is settled and landed by hand
      fs.writeFileSync(
        path.join(scene.repoDir, 'src', 'band.ts'),
        'export const band = "both";\n',
      );
      git(scene.repoDir, ['add', 'src/band.ts']);
      git(scene.repoDir, ['commit', '-q', '-C', scene.featureShas[1]!]);

      // the state a kill leaves: band landed, the cursor on tide, the halt
      // not yet cleared, tide's replay never begun
      const stateFile = path.join(
        scene.repoDir,
        '.git',
        'cutover',
        'state.json',
      );
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      state.picks[0].status = 'landed';
      state.picks[0].new = git(scene.repoDir, ['rev-parse', 'HEAD']);
      state.pick_index = 1;
      fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
      return scene;
    });

    when('[t0] continue', () => {
      const result = useBeforeAll(async () => runCutover(scene, ['continue']));

      then('the unbegun pick is replayed, not dropped', () => {
        expect(result.exitCode).toBe(0);
        expect(getSubjects(scene, 'HEAD').slice(0, 2)).toEqual([
          'cont(wave): add tide window',
          'cont(wave): add band of swell',
        ]);
        expect(result.stdout).not.toContain('already on');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case30] a peer holds the cutover quota lock', () => {
    // .why = the gate and the spend read the quota, then write it less one;
    //        a peer writer mid-flight must make the apply refuse, never race it
    const scene = useBeforeAll(async () =>
      genScene({ slug: 'cutover-case30', featureCommits: FEATURE_COMMITS }),
    );
    const meterLockFile = () =>
      path.join(scene.repoDir, '.meter', 'git.branch.uses.lock');

    when('[t0] begin --mode apply while a live peer holds it', () => {
      const holder = useBeforeAll(async () => {
        const proc = spawn('sleep', ['60'], {
          detached: true,
          stdio: 'ignore',
        });
        proc.unref();
        fs.writeFileSync(meterLockFile(), `${proc.pid}\n`);
        return { pid: proc.pid! };
      });
      afterAll(() => {
        process.kill(holder.pid);
        fs.rmSync(meterLockFile(), { force: true });
      });

      then('it refuses as busy and changes naught', () => {
        const result = runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--mode',
          'apply',
        ]);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('the cutover quota is busy');
        expect(asSnapshotSafeIn(scene, result.stdout)).toMatchSnapshot();
        expect(getBranch(scene)).toEqual('turtle/wave-report');
        expect(hasBranch(scene, 'turtle/wave-report-v2')).toBe(false);
        expect(getQuota(scene)).toEqual(3);
        expect(fs.existsSync(path.join(scene.repoDir, '.git', 'cutover'))).toBe(
          false,
        );
      });
    });
  });

  /**
   * .what = a halted cutover whose source carried one tracked edit
   * .why = cases 31-33 each need a live park to inspect or to lose
   */
  const genHaltedWithParkScene = (slug: string) => {
    const scene = genConflictScene(slug);
    fs.writeFileSync(path.join(scene.repoDir, 'readme.md'), '# reef v2\n');
    const halt = runCutover(scene, [
      'begin',
      '--from',
      '@main',
      '--into',
      'turtle/wave-report-v2',
      '--pick',
      scene.featureShas[1]!,
      '--mode',
      'apply',
    ]);
    if (halt.exitCode !== 2)
      throw new Error(`${slug} setup: begin did not halt: ${halt.stdout}`);
    if (!getCutoverRefs(scene))
      throw new Error(`${slug} setup: no park was made`);
    return scene;
  };

  /**
   * .what = delete the park of a halted cutover, as a loss would
   */
  const delPark = (scene: Scene) => {
    for (const leaf of ['tree', 'index'])
      git(scene.repoDir, ['update-ref', '-d', `refs/worktree/cutover/${leaf}`]);
  };

  given('[case31] a peer worktree of a halted cutover', () => {
    // .why = the state is per worktree; the park must be too, or a begin in a
    //        peer worktree, into the same name, could overwrite or delete it
    const scene = useBeforeAll(async () =>
      genHaltedWithParkScene('cutover-case31'),
    );

    when('[t0] the peer reads every ref', () => {
      const peerRefs = useBeforeAll(async () => {
        const peerDir = path.join(
          genTempDir({ slug: 'cutover-case31-peer', git: false }),
          'peer',
        );
        git(scene.repoDir, ['worktree', 'add', '-q', '--detach', peerDir]);
        return {
          refs: git(peerDir, ['for-each-ref', '--format=%(refname)']),
        };
      });

      then('the park is not visible from the peer', () => {
        expect(peerRefs.refs).toContain('refs/heads/main');
        expect(peerRefs.refs).not.toContain('cutover');
      });

      then('the park is visible from its own worktree', () => {
        expect(getCutoverRefs(scene)).toContain('refs/worktree/cutover/tree');
      });
    });
  });

  given('[case32] abort finds the state expects a park git lacks', () => {
    // .why = the state is the record; a lost park is a loss to report, never
    //        a license to reset a worktree whose edits have no other copy
    const scene = useBeforeAll(async () => {
      const scene = genHaltedWithParkScene('cutover-case32');
      delPark(scene);
      return scene;
    });

    when('[t0] abort', () => {
      const result = useBeforeAll(async () => runCutover(scene, ['abort']));

      then('it fails loud as a malfunction, before any reset', () => {
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain(
          'the park of tracked edits is absent; abort stops before any reset',
        );
        expect(result.stderr).toContain('the park of tracked edits is absent');
        expect(asSnapshotSafeIn(scene, result.stdout)).toMatchSnapshot();
      });

      then(
        'the cutover stays as it was: on the new branch, still in flight',
        () => {
          expect(getBranch(scene)).toEqual('turtle/wave-report-v2');
          expect(hasBranch(scene, 'turtle/wave-report-v2')).toBe(true);
          expect(
            fs.existsSync(
              path.join(scene.repoDir, '.git', 'cutover', 'state.json'),
            ),
          ).toBe(true);
        },
      );
    });
  });

  given('[case33] continue finds the state expects a park git lacks', () => {
    // .why = a carry with no park must never report the edits as carried
    const scene = useBeforeAll(async () => {
      const scene = genHaltedWithParkScene('cutover-case33');
      fs.writeFileSync(
        path.join(scene.repoDir, 'src', 'band.ts'),
        'export const band = "both";\n',
      );
      git(scene.repoDir, ['add', 'src/band.ts']);
      delPark(scene);
      return scene;
    });

    when('[t0] continue', () => {
      const result = useBeforeAll(async () => runCutover(scene, ['continue']));

      then('it fails loud and says the edits cannot be laid back down', () => {
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain(
          'the park that held the edits is absent',
        );
        expect(result.stdout).not.toContain('✓ carried');
        expect(result.stdout).not.toContain('safe: the edits stay parked');
        expect(asSnapshotSafeIn(scene, result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case34] an orphan park sits under the --into name', () => {
    // .why = a cutover killed after its state cleared leaves its park refs. a
    //        later begin into that name, from a clean tree, must carry naught
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case34',
        featureCommits: FEATURE_COMMITS,
      });

      // a stale park: a commit whose change no begin of this cutover made
      fs.writeFileSync(path.join(scene.repoDir, 'readme.md'), '# stale park\n');
      git(scene.repoDir, ['add', 'readme.md']);
      const tree = git(scene.repoDir, ['write-tree']);
      const stale = git(scene.repoDir, [
        'commit-tree',
        tree,
        '-p',
        'HEAD',
        '-m',
        'cutover park: stale',
      ]);
      git(scene.repoDir, ['reset', '-q', '--hard', 'HEAD']);
      for (const leaf of ['tree', 'index'])
        git(scene.repoDir, [
          'update-ref',
          `refs/worktree/cutover/${leaf}`,
          stale,
        ]);
      return scene;
    });

    when('[t0] begin --mode apply from a clean tree', () => {
      const result = useBeforeAll(async () =>
        runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--mode',
          'apply',
        ]),
      );

      then('the stale park carries naught, and is cleared', () => {
        expect(result.exitCode).toBe(0);
        expect(getStatus(scene)).toEqual('');
        expect(
          fs.readFileSync(path.join(scene.repoDir, 'readme.md'), 'utf-8'),
        ).toEqual('# reef\n');
        expect(getCutoverRefs(scene)).toEqual('');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case35] a halted state written under another schema', () => {
    // .why = a halt can outlive a role upgrade; a verb must never act on a
    //        state whose shape it does not know
    const scene = useBeforeAll(async () => {
      const scene = genHaltedWithParkScene('cutover-case35');
      const stateFile = path.join(
        scene.repoDir,
        '.git',
        'cutover',
        'state.json',
      );
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      delete state.schema;
      fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
      return scene;
    });

    when('[t0] continue and abort', () => {
      const outcome = useBeforeAll(async () => ({
        cont: runCutover(scene, ['continue']),
        abort: runCutover(scene, ['abort']),
      }));

      then('each refuses loud, names the schema, and changes naught', () => {
        for (const result of [outcome.cont, outcome.abort]) {
          expect(result.exitCode).toBe(1);
          expect(result.stdout).toContain(
            'the cutover state was written under another schema',
          );
          expect(result.stdout).toContain('schema: absent (this role reads 1)');
          expect(asSnapshotSafeIn(scene, result.stdout)).toMatchSnapshot();
        }
        expect(getBranch(scene)).toEqual('turtle/wave-report-v2');
        expect(getCutoverRefs(scene)).not.toEqual('');
      });
    });
  });

  /**
   * .what = settle the band conflict of a halted cutover, and stage it
   */
  const setBandSettled = (scene: Scene) => {
    fs.writeFileSync(
      path.join(scene.repoDir, 'src', 'band.ts'),
      'export const band = "both";\n',
    );
    git(scene.repoDir, ['add', 'src/band.ts']);
  };

  given('[case36] HEAD moved off the new branch of a halted cutover', () => {
    // .why = the state can outlive the session; a continue elsewhere would
    //        land the picks onto other work, and an abort would reset it
    const scene = useBeforeAll(async () => {
      const scene = genHaltedWithParkScene('cutover-case36');
      setBandSettled(scene);
      git(scene.repoDir, ['symbolic-ref', 'HEAD', 'refs/heads/main']);
      return scene;
    });

    when('[t0] continue and abort', () => {
      const outcome = useBeforeAll(async () => ({
        cont: runCutover(scene, ['continue']),
        abort: runCutover(scene, ['abort']),
      }));

      then('each refuses, names where HEAD is, and changes naught', () => {
        for (const result of [outcome.cont, outcome.abort]) {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            'HEAD is not where this cutover left it',
          );
          expect(result.stdout).toContain('expected: turtle/wave-report-v2');
          expect(result.stdout).toContain('found: main');
        }
        expect(getBranch(scene)).toEqual('main');
        expect(hasBranch(scene, 'turtle/wave-report-v2')).toBe(true);
        expect(getCutoverRefs(scene)).not.toEqual('');
        expect(asSnapshotSafe(outcome.abort.stdout)).toMatchSnapshot();
        expect(asSnapshotSafe(outcome.cont.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case37] the new branch of a halted cutover was pushed', () => {
    // .why = abort deletes the new branch; a branch on a remote may hold
    //        work a peer already pulled, so abort must never delete it
    const scene = useBeforeAll(async () => {
      const scene = genHaltedWithParkScene('cutover-case37');
      git(scene.repoDir, ['push', '-q', 'origin', 'turtle/wave-report-v2']);
      return scene;
    });

    when('[t0] abort', () => {
      const result = useBeforeAll(async () => runCutover(scene, ['abort']));

      then('it refuses, names the remote ref, and deletes naught', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'turtle/wave-report-v2 is on a remote, and abort deletes only an unpushed branch',
        );
        expect(result.stdout).toContain('found: origin/turtle/wave-report-v2');
        expect(asSnapshotSafeIn(scene, result.stdout)).toMatchSnapshot();
        expect(hasBranch(scene, 'turtle/wave-report-v2')).toBe(true);
        expect(getBranch(scene)).toEqual('turtle/wave-report-v2');
      });
    });
  });

  given('[case38] the new branch holds a commit the cutover never made', () => {
    // .why = a human who commits by hand mid-halt adds work abort would drop
    const scene = useBeforeAll(async () => {
      const scene = genHaltedWithParkScene('cutover-case38');
      setBandSettled(scene);
      git(scene.repoDir, ['commit', '-q', '-m', 'feat(band): settle by hand']);
      return scene;
    });

    when('[t0] abort', () => {
      const result = useBeforeAll(async () => runCutover(scene, ['abort']));

      then('it refuses, names the commit, and deletes naught', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'holds a commit this cutover never recorded, so abort would drop it',
        );
        expect(result.stdout).toContain('feat(band): settle by hand');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
        expect(hasBranch(scene, 'turtle/wave-report-v2')).toBe(true);
        expect(getSubjects(scene, 'turtle/wave-report-v2')[0]).toEqual(
          'feat(band): settle by hand',
        );
      });
    });
  });

  given('[case39] the commit of a clean pick fails', () => {
    // .why = errexit is off under an `||`; a failed commit must still fail
    //        the verb loud, never report the pick as landed
    //
    // .mock = a git shim on PATH execs the real git for every call, except
    //         `git commit`, which it fails
    // .why  = a commit that fails on demand (a full disk, a broken hook
    //         path) cannot be made in a temp repo; the shim is the one way
    const scene = useBeforeAll(async () =>
      genScene({
        slug: 'cutover-case39',
        featureCommits: FEATURE_COMMITS,
        mainCommits: MAIN_COMMITS_REEF,
      }),
    );

    when('[t0] begin --mode apply, then abort without the shim', () => {
      const outcome = useBeforeAll(async () => {
        const binDir = genTempDir({ slug: 'cutover-case39-bin', git: false });
        const realGit = spawnSync('which', ['git'], {
          encoding: 'utf-8',
        }).stdout.trim();
        fs.writeFileSync(
          path.join(binDir, 'git'),
          [
            '#!/usr/bin/env bash',
            'if [[ "$1" == "commit" ]]; then',
            '  echo "fatal: unable to write new index file" >&2',
            '  exit 128',
            'fi',
            'exec "$REAL_GIT" "$@"',
            '',
          ].join('\n'),
        );
        fs.chmodSync(path.join(binDir, 'git'), '755');
        const failed = spawnSync(
          'bash',
          [
            scriptPath,
            'begin',
            '--from',
            '@main',
            '--into',
            'turtle/wave-report-v2',
            '--pick',
            scene.featureShas[0]!,
            '--mode',
            'apply',
          ],
          {
            cwd: scene.repoDir,
            encoding: 'utf-8',
            env: {
              ...process.env,
              HOME: scene.homeDir,
              PATH: `${binDir}:${process.env.PATH}`,
              REAL_GIT: realGit,
            },
          },
        );
        const stateKept = fs.existsSync(
          path.join(scene.repoDir, '.git', 'cutover', 'state.json'),
        );
        const abort = runCutover(scene, ['abort']);
        return {
          failed: {
            stdout: failed.stdout ?? '',
            stderr: failed.stderr ?? '',
            exitCode: failed.status ?? 1,
          },
          stateKept,
          abort,
        };
      });

      then(
        'begin fails loud as a malfunction and reports no landed pick',
        () => {
          expect(outcome.failed.exitCode).toBe(1);
          expect(outcome.failed.stdout).toContain('an unexpected step failed');
          expect(outcome.failed.stdout).not.toContain('righteous');
          expect(outcome.failed.stdout).not.toContain('✓');
          expect(outcome.failed.stderr).toContain('an unexpected step failed');
          expect(outcome.stateKept).toBe(true);
          expect(
            asSnapshotSafeIn(scene, outcome.failed.stdout),
          ).toMatchSnapshot();
        },
      );

      then('abort undoes it: back on the source, the new branch gone', () => {
        expect(outcome.abort.exitCode).toBe(0);
        expect(getBranch(scene)).toEqual('turtle/wave-report');
        expect(hasBranch(scene, 'turtle/wave-report-v2')).toBe(false);
        expect(getStatus(scene)).toEqual('');
      });
    });
  });

  given('[case40] the next moves after a pick of a feat', () => {
    // .why = git.commit.set refuses a second feat, and git.commit.push refuses
    //        a HEAD the seaturtle did not author; the hints must name what works
    when('[t0] a tracked edit rides along', () => {
      const scene = useBeforeAll(async () => {
        const scene = genScene({
          slug: 'cutover-case40-edit',
          featureCommits: FEATURE_COMMITS,
          mainCommits: MAIN_COMMITS_REEF,
        });
        fs.writeFileSync(path.join(scene.repoDir, 'readme.md'), '# reef v2\n');
        return scene;
      });
      const result = useBeforeAll(async () =>
        runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.featureShas[0]!,
          '--mode',
          'apply',
        ]),
      );

      then('the report names cont: as the lead, by the picked feat', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          'commit level: set by "feat(wave): add wave report" — the next commit leads with cont:',
        );
        expect(result.stdout).toContain("printf 'cont(scope): ...'");
        expect(result.stdout).not.toContain("printf 'feat(scope): ...'");
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('git.commit.set accepts the hinted cont: commit', () => {
        grantCommitQuota(scene);
        git(scene.repoDir, ['add', 'readme.md']);
        const commit = runCommitSkill(scene, {
          skill: 'git.commit.set.sh',
          args: ['-m', '@stdin', '--mode', 'apply'],
          stdin: 'cont(wave): refresh the reef readme\n\n- after the cutover\n',
        });
        expect(commit.exitCode).toBe(0);
        expect(getSubjects(scene, 'HEAD')[0]).toEqual(
          'cont(wave): refresh the reef readme',
        );
      });
    });

    when('[t1] no edit rides along, so a human-authored pick is HEAD', () => {
      const scene = useBeforeAll(async () =>
        genScene({
          slug: 'cutover-case40-bare',
          featureCommits: FEATURE_COMMITS,
          mainCommits: MAIN_COMMITS_REEF,
        }),
      );
      const result = useBeforeAll(async () =>
        runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.featureShas[0]!,
          '--mode',
          'apply',
        ]),
      );

      then(
        'the hint says git.commit.push will refuse, and names a human push',
        () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('rhx git.commit.push will refuse it');
          expect(result.stdout).toContain(
            'git push -u origin turtle/wave-report-v2',
          );
          expect(result.stdout).not.toContain(
            'rhx git.commit.push --mode apply',
          );
          expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
        },
      );

      then('git.commit.push does refuse that HEAD', () => {
        grantCommitQuota(scene);
        const push = runCommitSkill(scene, {
          skill: 'git.commit.push.sh',
          args: ['--mode', 'apply'],
          stdin: '',
        });
        expect(push.exitCode).toBe(2);
        expect(push.stdout).toContain('HEAD commit not authored by');
      });
    });
  });

  given('[case41] the filesystem refuses the cutover lock file', () => {
    // .why = a link that fails with no lock present is no contention; it must
    //        read as a malfunction, never as a busy peer to wait out
    //
    // .mock = an `ln` shim on PATH that always fails
    // .why  = a filesystem with no hard links cannot be made in a temp dir
    const scene = useBeforeAll(async () =>
      genScene({ slug: 'cutover-case41', featureCommits: FEATURE_COMMITS }),
    );

    when('[t0] begin --mode apply', () => {
      const result = useBeforeAll(async () => {
        const binDir = genTempDir({ slug: 'cutover-case41-bin', git: false });
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
        const out = spawnSync(
          'bash',
          [
            scriptPath,
            'begin',
            '--from',
            '@main',
            '--into',
            'turtle/wave-report-v2',
            '--mode',
            'apply',
          ],
          {
            cwd: scene.repoDir,
            encoding: 'utf-8',
            env: {
              ...process.env,
              HOME: scene.homeDir,
              PATH: `${binDir}:${process.env.PATH}`,
            },
          },
        );
        return { stdout: out.stdout ?? '', exitCode: out.status ?? 1 };
      });

      then(
        'it fails loud as a malfunction, not busy, and changes naught',
        () => {
          expect(result.exitCode).toBe(1);
          expect(result.stdout).toContain('lock file could not be made');
          expect(result.stdout).toContain('Operation not permitted');
          expect(result.stdout).not.toContain('busy');
          expect(getBranch(scene)).toEqual('turtle/wave-report');
          expect(getQuota(scene)).toEqual(3);
          expect(asSnapshotSafeIn(scene, result.stdout)).toMatchSnapshot();
        },
      );
    });
  });

  /**
   * .what = commit a staged file with the lead type the report hinted
   * .why = the seam the wish exists for: the hint must name a type
   *        git.commit.set accepts, in every shape of cutover
   */
  const runHintedCommit = (scene: Scene, report: string, file: string) => {
    const lead = /printf '(\w+)\(scope\)/.exec(report)?.[1];
    if (!lead) throw new Error(`no commit hint in the report: ${report}`);
    grantCommitQuota(scene);
    git(scene.repoDir, ['add', file]);
    const promise = lead === 'feat' ? ['--promise', 'is-netnew-behavior'] : [];
    const result = runCommitSkill(scene, {
      skill: 'git.commit.set.sh',
      args: ['-m', '@stdin', '--mode', 'apply', ...promise],
      stdin: `${lead}(wave): ride the hint\n\n- after the cutover\n`,
    });
    return { lead, ...result };
  };

  given('[case42] a halt in a tree with no stage grant', () => {
    // .why = the settle step stages via git.stage.add, which reads its own
    //        grant; the halt must say so, and say that abort refunds naught
    const scene = useBeforeAll(async () => {
      const scene = genConflictScene('cutover-case42');
      return scene;
    });

    when('[t0] begin halts, then the human grants stage', () => {
      const outcome = useBeforeAll(async () => {
        const halt = runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.featureShas[1]!,
          '--mode',
          'apply',
        ]);
        fs.writeFileSync(
          path.join(scene.repoDir, '.meter', 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 0, push: 'block', stage: 'allow' }),
        );
        fs.writeFileSync(
          path.join(scene.repoDir, 'src', 'band.ts'),
          'export const band = "both";\n',
        );
        const stage = spawnSync(
          'bash',
          [
            path.join(__dirname, '..', 'git.stage', 'git.stage.add.sh'),
            'src/band.ts',
          ],
          {
            cwd: scene.repoDir,
            encoding: 'utf-8',
            env: { ...process.env, HOME: scene.homeDir },
          },
        );
        const cont = runCutover(scene, ['continue']);
        return { halt, stage, cont };
      });

      then('the halt names the absent stage grant and the spent unit', () => {
        expect(outcome.halt.exitCode).toBe(2);
        expect(outcome.halt.stdout).toContain(
          'stage: ✋ no stage grant, so rhx git.stage.add will refuse',
        );
        expect(outcome.halt.stdout).toContain(
          'git.commit.uses set --quant N --push allow|block --stage allow',
        );
        expect(outcome.halt.stdout).toContain(
          'quota: the cutover unit is spent; abort refunds none',
        );
        expect(asSnapshotSafe(outcome.halt.stdout)).toMatchSnapshot();
      });

      then('the printed settle step works once granted', () => {
        expect(outcome.stage.status).toBe(0);
        expect(outcome.cont.exitCode).toBe(0);
        expect(getSubjects(scene, 'HEAD')[0]).toEqual(
          'cont(wave): add band of swell',
        );
      });
    });
  });

  given('[case43] an aborted cutover and its unit', () => {
    const scene = useBeforeAll(async () => genConflictScene('cutover-case43'));

    when('[t0] begin halts, then abort', () => {
      const outcome = useBeforeAll(async () => {
        const halt = runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.featureShas[1]!,
          '--mode',
          'apply',
        ]);
        const locksAfterHalt = {
          meter: fs.existsSync(
            path.join(scene.repoDir, '.meter', 'git.branch.uses.lock'),
          ),
          cutover: fs.existsSync(
            path.join(scene.repoDir, '.git', 'cutover.lock'),
          ),
        };
        const abort = runCutover(scene, ['abort']);
        return { halt, abort, locksAfterHalt };
      });

      then('the halt leaves no lock behind, so a grant need not wait', () => {
        expect(outcome.locksAfterHalt).toEqual({
          meter: false,
          cutover: false,
        });
      });

      then('abort says the unit stays spent, and it does', () => {
        expect(outcome.halt.exitCode).toBe(2);
        expect(outcome.abort.exitCode).toBe(0);
        expect(outcome.abort.stdout).toContain(
          'quota: the cutover unit stays spent; abort refunds none',
        );
        expect(getQuota(scene)).toEqual(2);
        expect(asSnapshotSafe(outcome.abort.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] the same begin is run again', () => {
      const rerun = useBeforeAll(async () =>
        runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.featureShas[1]!,
          '--mode',
          'apply',
        ]),
      );

      then('it starts clean and halts at the same pick', () => {
        expect(rerun.exitCode).toBe(2);
        expect(rerun.stdout).toContain('halted: a pick conflicts');
        expect(rerun.stdout).not.toContain('already in flight');
        expect(getBranch(scene)).toEqual('turtle/wave-report-v2');
      });
    });
  });

  given('[case44] tracked edits beyond a modify', () => {
    // .why = a staged-new file must land tracked, not untracked; a delete
    //        must stay a delete
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case44',
        featureCommits: FEATURE_COMMITS,
        mainCommits: MAIN_COMMITS_REEF,
      });
      fs.writeFileSync(path.join(scene.repoDir, 'tide.md'), 'tide chart\n');
      git(scene.repoDir, ['add', 'tide.md']);
      fs.rmSync(path.join(scene.repoDir, 'readme.md'));
      return scene;
    });

    when('[t0] begin --mode apply', () => {
      const result = useBeforeAll(async () =>
        runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--mode',
          'apply',
        ]),
      );

      then('the new file stays tracked, and the delete stays a delete', () => {
        expect(result.exitCode).toBe(0);
        expect(
          fs.readFileSync(path.join(scene.repoDir, 'tide.md'), 'utf-8'),
        ).toEqual('tide chart\n');
        expect(fs.existsSync(path.join(scene.repoDir, 'readme.md'))).toBe(
          false,
        );
        expect(getStatus(scene)).toContain(' A tide.md');
        expect(getStatus(scene)).not.toContain('?? tide.md');
        expect(getStatus(scene)).toContain(' D readme.md');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given(
    '[case45] an untracked file beyond the plain case would collide',
    () => {
      when(
        '[t0] the base adds a path the tree holds as an ignored file',
        () => {
          const scene = useBeforeAll(async () => {
            const scene = genScene({
              slug: 'cutover-case45-ignored',
              featureCommits: FEATURE_COMMITS,
              mainCommits: [
                {
                  file: 'build/reef.js',
                  content: 'export const reef = 0;\n',
                  subject: 'feat(build): add the reef build',
                },
              ],
            });
            fs.appendFileSync(
              path.join(scene.repoDir, '.git', 'info', 'exclude'),
              'build/\n',
            );
            fs.mkdirSync(path.join(scene.repoDir, 'build'), {
              recursive: true,
            });
            fs.writeFileSync(
              path.join(scene.repoDir, 'build', 'reef.js'),
              'my own build\n',
            );
            return scene;
          });

          then('begin refuses, and the ignored file is untouched', () => {
            const result = runCutover(scene, [
              'begin',
              '--from',
              '@main',
              '--into',
              'turtle/wave-report-v2',
              '--mode',
              'apply',
            ]);
            expect(result.exitCode).toBe(2);
            expect(result.stdout).toContain(
              'untracked files would be overwritten',
            );
            expect(result.stdout).toContain('build/reef.js');
            expect(
              fs.readFileSync(
                path.join(scene.repoDir, 'build', 'reef.js'),
                'utf-8',
              ),
            ).toEqual('my own build\n');
            expect(getBranch(scene)).toEqual('turtle/wave-report');
            expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
          });
        },
      );

      when(
        '[t1] the base adds a non-ascii path the tree holds untracked',
        () => {
          const scene = useBeforeAll(async () => {
            const scene = genScene({
              slug: 'cutover-case45-quoted',
              featureCommits: FEATURE_COMMITS,
              mainCommits: [
                {
                  file: 'café.md',
                  content: 'the reef café\n',
                  subject: 'docs(cafe): add the café',
                },
              ],
            });
            fs.writeFileSync(
              path.join(scene.repoDir, 'café.md'),
              'my own café\n',
            );
            return scene;
          });

          then('begin refuses with a clean refusal that names the path', () => {
            const result = runCutover(scene, [
              'begin',
              '--from',
              '@main',
              '--into',
              'turtle/wave-report-v2',
              '--mode',
              'apply',
            ]);
            expect(result.exitCode).toBe(2);
            expect(result.stdout).toContain(
              'untracked files would be overwritten',
            );
            expect(result.stdout).toContain('café.md');
            expect(
              fs.readFileSync(path.join(scene.repoDir, 'café.md'), 'utf-8'),
            ).toEqual('my own café\n');
            expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
          });
        },
      );

      when(
        '[t2] the untracked file is renamed aside, then begin reruns',
        () => {
          const scene = useBeforeAll(async () => {
            const scene = genScene({
              slug: 'cutover-case45-rename',
              featureCommits: FEATURE_COMMITS,
              mainCommits: MAIN_COMMITS_REEF,
            });
            fs.writeFileSync(
              path.join(scene.repoDir, 'src', 'reef.ts'),
              'my own reef\n',
            );
            return scene;
          });

          then('the rerun lands, and the renamed file is kept', () => {
            const args = [
              'begin',
              '--from',
              '@main',
              '--into',
              'turtle/wave-report-v2',
              '--mode',
              'apply',
            ];
            expect(runCutover(scene, args).exitCode).toBe(2);
            fs.renameSync(
              path.join(scene.repoDir, 'src', 'reef.ts'),
              path.join(scene.repoDir, 'src', 'reef.mine.ts'),
            );
            const rerun = runCutover(scene, args);
            expect(rerun.exitCode).toBe(0);
            expect(getBranch(scene)).toEqual('turtle/wave-report-v2');
            expect(
              fs.readFileSync(
                path.join(scene.repoDir, 'src', 'reef.mine.ts'),
                'utf-8',
              ),
            ).toEqual('my own reef\n');
          });
        },
      );
    },
  );

  given('[case46] --from @tree, planned then applied', () => {
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case46',
        featureCommits: FEATURE_COMMITS,
      });
      fs.writeFileSync(path.join(scene.repoDir, 'readme.md'), '# reef v2\n');
      return scene;
    });

    when('[t0] begin, plan mode', () => {
      const result = useBeforeAll(async () =>
        runCutover(scene, [
          'begin',
          '--from',
          '@tree',
          '--into',
          'turtle/reef-shoals',
        ]),
      );

      then('the plan says it stacks on HEAD and changes naught', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('(HEAD; stacked, all history kept)');
        expect(result.stdout).toContain('stay in place, still uncommitted');
        expect(getBranch(scene)).toEqual('turtle/wave-report');
        expect(getQuota(scene)).toEqual(3);
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] begin --mode apply, then the hinted commit', () => {
      const outcome = useBeforeAll(async () => {
        const report = runCutover(scene, [
          'begin',
          '--from',
          '@tree',
          '--into',
          'turtle/reef-shoals',
          '--mode',
          'apply',
        ]);
        return {
          report,
          commit: runHintedCommit(scene, report.stdout, 'readme.md'),
        };
      });

      then('git.commit.set accepts the hinted lead type', () => {
        expect(outcome.report.exitCode).toBe(0);
        expect(outcome.commit.lead).toEqual('cont');
        expect(outcome.commit.exitCode).toBe(0);
        expect(getSubjects(scene, 'HEAD')[0]).toEqual(
          'cont(wave): ride the hint',
        );
      });
    });
  });

  given('[case47] --from a named branch, applied', () => {
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case47',
        featureCommits: FEATURE_COMMITS,
      });
      git(scene.repoDir, [
        'push',
        '-q',
        'origin',
        `${scene.seedSha}:refs/heads/release/v2`,
      ]);
      fs.writeFileSync(path.join(scene.repoDir, 'readme.md'), '# reef v2\n');
      return scene;
    });

    when(
      '[t0] begin --from release/v2 --mode apply, then the hinted commit',
      () => {
        const outcome = useBeforeAll(async () => {
          const report = runCutover(scene, [
            'begin',
            '--from',
            'release/v2',
            '--into',
            'turtle/wave-report-v2',
            '--pick',
            scene.featureShas[0]!,
            '--mode',
            'apply',
          ]);
          return {
            report,
            commit: runHintedCommit(scene, report.stdout, 'readme.md'),
          };
        });

        then('the new branch sits on origin/release/v2 plus the pick', () => {
          expect(outcome.report.exitCode).toBe(0);
          expect(outcome.report.stdout).toContain('base: origin/release/v2');
          expect(
            git(scene.repoDir, ['rev-parse', 'turtle/wave-report-v2~2']),
          ).toEqual(scene.seedSha);
          expect(hasUpstream(scene, 'turtle/wave-report-v2')).toBe(false);
          expect(asSnapshotSafe(outcome.report.stdout)).toMatchSnapshot();
        });

        then('git.commit.set accepts the hinted lead type', () => {
          expect(outcome.commit.lead).toEqual('cont');
          expect(outcome.commit.exitCode).toBe(0);
        });
      },
    );
  });

  given('[case48] the source is main itself', () => {
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case48',
        featureCommits: [],
        mainCommits: MAIN_COMMITS_REEF,
      });
      git(scene.repoDir, ['checkout', '-q', 'main']);
      fs.writeFileSync(path.join(scene.repoDir, 'readme.md'), '# reef v2\n');
      return scene;
    });

    when('[t0] begin --from @main --mode apply, then the hinted commit', () => {
      const outcome = useBeforeAll(async () => {
        const mainBefore = git(scene.repoDir, ['rev-parse', 'main']);
        const report = runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/reef-v2',
          '--mode',
          'apply',
        ]);
        return {
          mainBefore,
          report,
          commit: runHintedCommit(scene, report.stdout, 'readme.md'),
        };
      });

      then('the edit rides onto the new branch, and main is untouched', () => {
        expect(outcome.report.exitCode).toBe(0);
        expect(getBranch(scene)).toEqual('turtle/reef-v2');
        expect(git(scene.repoDir, ['rev-parse', 'main'])).toEqual(
          outcome.mainBefore,
        );
        expect(asSnapshotSafe(outcome.report.stdout)).toMatchSnapshot();
      });

      then('git.commit.set accepts the hinted feat', () => {
        expect(outcome.commit.lead).toEqual('feat');
        expect(outcome.commit.exitCode).toBe(0);
      });
    });
  });

  given(
    '[case49] a foreign git operation other than rebase is in flight',
    () => {
      // .note = a bisect has no continue or abort: `git bisect reset` is its
      //        one settle verb, so its refusal names that line alone
      const OPS = [
        {
          op: 'merge',
          marker: 'MERGE_HEAD',
          settle: ['git merge --continue', 'git merge --abort'],
        },
        {
          op: 'cherry-pick',
          marker: 'CHERRY_PICK_HEAD',
          settle: ['git cherry-pick --continue', 'git cherry-pick --abort'],
        },
        {
          op: 'revert',
          marker: 'REVERT_HEAD',
          settle: ['git revert --continue', 'git revert --abort'],
        },
        { op: 'bisect', marker: 'BISECT_LOG', settle: ['git bisect reset'] },
      ];
      OPS.map(({ op, marker, settle }, i) =>
        when(`[t${i}] a ${op} is in flight`, () => {
          const scene = useBeforeAll(async () => {
            const scene = genScene({
              slug: `cutover-case49-${op}`,
              featureCommits: FEATURE_COMMITS,
            });
            // .note = the marker git itself leaves while the op is halted
            fs.writeFileSync(
              path.join(scene.repoDir, '.git', marker),
              `${scene.featureShas[0]}\n`,
            );
            return scene;
          });

          then('begin refuses, names the op, and names its settle pair', () => {
            const result = runCutover(scene, [
              'begin',
              '--from',
              '@main',
              '--into',
              'turtle/other',
              '--mode',
              'apply',
            ]);
            expect(result.exitCode).toBe(2);
            expect(result.stdout).toContain(`a ${op} is already in flight`);
            for (const line of settle) expect(result.stdout).toContain(line);
            expect(result.stdout).not.toContain('git bisect --');
            expect(getBranch(scene)).toEqual('turtle/wave-report');
            expect(getQuota(scene)).toEqual(3);
            expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
          });
        }),
      );
    },
  );

  given('[case50] a long-stale source leaves many commits behind', () => {
    // .why = a branch stale for months can leave hundreds behind; the list
    //        names the first twenty, then the count and how to see the rest
    const scene = useBeforeAll(async () =>
      genScene({
        slug: 'cutover-case50',
        featureCommits: Array.from({ length: 23 }, (_, i) => ({
          file: `src/swell${i}.ts`,
          content: `export const swell${i} = ${i};\n`,
          subject: `cont(wave): add swell ${i}`,
        })),
      }),
    );

    when('[t0] begin, plan mode, with no picks', () => {
      const result = useBeforeAll(async () =>
        runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
        ]),
      );

      then('twenty are named, then the rest are counted', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          'left behind on turtle/wave-report (23, not picked)',
        );
        expect(result.stdout).toContain('add swell 19');
        expect(result.stdout).not.toContain('add swell 20');
        expect(result.stdout).toMatch(
          /… and 3 more: git log --oneline \w+\.\.\w+/,
        );
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('it says how to carry a left-behind commit', () => {
        expect(result.stdout).toContain(
          'to carry a left-behind commit, name it: --pick <sha> (repeatable, applied in order)',
        );
      });
    });
  });

  /**
   * .what = a dir with a git shim that fails one call and execs the real
   *         git for every other
   *
   * .mock = git, for exactly the call `failWhen` matches
   * .why  = a ref write, a commit, or a checkout that fails on demand (a
   *         stale lock, a full disk, a hook) cannot be made in a temp repo;
   *         the shim is the one way to reach those failure paths
   */
  const genGitShimBin = (input: { slug: string; failWhen: string }) => {
    const binDir = genTempDir({ slug: `${input.slug}-bin`, git: false });
    fs.writeFileSync(
      path.join(binDir, 'git'),
      [
        '#!/usr/bin/env bash',
        `if ${input.failWhen}; then`,
        '  echo "fatal: cannot lock ref: unable to create lock file" >&2',
        '  exit 128',
        'fi',
        'exec "$REAL_GIT" "$@"',
        '',
      ].join('\n'),
    );
    fs.chmodSync(path.join(binDir, 'git'), '755');
    return binDir;
  };
  const runCutoverWithBin = (scene: Scene, binDir: string, args: string[]) => {
    const result = spawnSync('bash', [scriptPath, ...args], {
      cwd: scene.repoDir,
      encoding: 'utf-8',
      env: {
        ...process.env,
        HOME: scene.homeDir,
        PATH: `${binDir}:${process.env.PATH}`,
        REAL_GIT: spawnSync('which', ['git'], {
          encoding: 'utf-8',
        }).stdout.trim(),
      },
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };
  const hasStateFile = (scene: Scene) =>
    fs.existsSync(path.join(scene.repoDir, '.git', 'cutover', 'state.json'));

  given('[case51] the park refs cannot be written', () => {
    // .why = inv-10: the reset may run only over a park git can name. a ref
    //        write that fails under an `if !` would pass unseen, and the
    //        reset would leave the edits as a dangle only
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case51',
        featureCommits: FEATURE_COMMITS,
        mainCommits: MAIN_COMMITS_REEF,
      });
      fs.writeFileSync(path.join(scene.repoDir, 'readme.md'), '# reef v2\n');
      return scene;
    });

    when('[t0] begin --mode apply, and update-ref of the park fails', () => {
      const result = useBeforeAll(async () =>
        runCutoverWithBin(
          scene,
          genGitShimBin({
            slug: 'cutover-case51',
            failWhen:
              '[[ "$1" == "update-ref" && "$2" == "refs/worktree/cutover/tree" ]]',
          }),
          [
            'begin',
            '--from',
            '@main',
            '--into',
            'turtle/wave-report-v2',
            '--pick',
            scene.featureShas[0]!,
            '--mode',
            'apply',
          ],
        ),
      );

      then('it fails loud as a malfunction, before any reset', () => {
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain(
          'the park refs could not be written; naught changed, the edits stay in the worktree',
        );
        expect(result.stderr).toContain('the park refs could not be written');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('the edits stay in the worktree, and naught else moved', () => {
        expect(getStatus(scene)).toEqual(' M readme.md');
        expect(
          fs.readFileSync(path.join(scene.repoDir, 'readme.md'), 'utf-8'),
        ).toEqual('# reef v2\n');
        expect(getBranch(scene)).toEqual('turtle/wave-report');
        expect(hasBranch(scene, 'turtle/wave-report-v2')).toBe(false);
        expect(getCutoverRefs(scene)).toEqual('');
        expect(hasStateFile(scene)).toBe(false);
        expect(getQuota(scene)).toEqual(3);
      });
    });
  });

  given('[case52] the source branch changed under a halted cutover', () => {
    // .why = abort lays the park back over the source as it stood. a source
    //        that moved would take the park as a reversal of the move; a
    //        source that is gone leaves abort no branch to return to
    when('[t0] a peer commit moved the source, then abort', () => {
      const scene = useBeforeAll(async () => {
        const scene = genHaltedWithParkScene('cutover-case52-moved');
        // a peer worktree commit lands on the source: a child of its tip
        const tip = git(scene.repoDir, ['rev-parse', 'turtle/wave-report']);
        const tree = git(scene.repoDir, ['rev-parse', `${tip}^{tree}`]);
        const moved = git(scene.repoDir, [
          'commit-tree',
          tree,
          '-p',
          tip,
          '-m',
          'cont(wave): a peer commit',
        ]);
        git(scene.repoDir, [
          'update-ref',
          'refs/heads/turtle/wave-report',
          moved,
        ]);
        return { ...scene, moved };
      });
      const result = useBeforeAll(async () => runCutover(scene, ['abort']));

      then('it refuses, names both tips, and changes naught', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'the source branch turtle/wave-report moved since the cutover began, so abort would undo that move',
        );
        expect(result.stdout).toContain('cont(wave): a peer commit');
        expect(result.stdout).toContain('git branch turtle/wave-report.moved');
        expect(getBranch(scene)).toEqual('turtle/wave-report-v2');
        expect(hasBranch(scene, 'turtle/wave-report-v2')).toBe(true);
        expect(git(scene.repoDir, ['rev-parse', 'turtle/wave-report'])).toEqual(
          scene.moved,
        );
        expect(hasStateFile(scene)).toBe(true);
        expect(getCutoverRefs(scene)).not.toEqual('');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] the source was deleted, then abort, then restored', () => {
      const scene = useBeforeAll(async () => {
        const scene = genHaltedWithParkScene('cutover-case52-gone');
        git(scene.repoDir, ['branch', '-D', 'turtle/wave-report']);
        return scene;
      });
      const outcome = useBeforeAll(async () => {
        const refused = runCutover(scene, ['abort']);
        git(scene.repoDir, [
          'branch',
          'turtle/wave-report',
          scene.featureShas[1]!,
        ]);
        const undone = runCutover(scene, ['abort']);
        return { refused, undone };
      });

      then(
        'the first abort refuses, names the restore, and changes naught',
        () => {
          expect(outcome.refused.exitCode).toBe(2);
          expect(outcome.refused.stdout).toContain(
            'the source branch turtle/wave-report is gone, so abort has no branch to return to',
          );
          expect(outcome.refused.stdout).toContain(
            `git branch turtle/wave-report ${scene.featureShas[1]!}`,
          );
          expect(asSnapshotSafe(outcome.refused.stdout)).toMatchSnapshot();
        },
      );

      then('once restored, abort undoes the whole cutover', () => {
        expect(outcome.undone.exitCode).toBe(0);
        expect(getBranch(scene)).toEqual('turtle/wave-report');
        expect(hasBranch(scene, 'turtle/wave-report-v2')).toBe(false);
        expect(getStatus(scene)).toEqual(' M readme.md');
        expect(hasStateFile(scene)).toBe(false);
      });
    });
  });

  given('[case53] the wrong settle verb for the halt in flight', () => {
    // .why = a cutover halt and a rebase halt both leave conflicts; the verb
    //        a mechanic reaches for names the verb that owns the halt
    when('[t0] a cutover is halted, and the rebase verbs run', () => {
      const scene = useBeforeAll(async () =>
        genHaltedWithParkScene('cutover-case53-cutover'),
      );
      const outcome = useBeforeAll(async () => ({
        runs: ['continue', 'abort', 'take'].map((verb) =>
          spawnSync(
            'bash',
            [
              path.join(
                __dirname,
                '..',
                'git.branch.rebase',
                `git.branch.rebase.${verb}.sh`,
              ),
              ...(verb === 'take' ? ['--whos', 'theirs', 'src/band.ts'] : []),
            ],
            {
              cwd: scene.repoDir,
              encoding: 'utf-8',
              env: { ...process.env, HOME: scene.homeDir },
            },
          ),
        ),
      }));

      then(
        'each says no rebase is in flight and names the cutover verbs',
        () => {
          for (const result of outcome.runs) {
            expect(result.stdout).toContain('error: no rebase in progress');
            expect(result.stdout).toContain(
              'a cutover is in flight here; settle it with its own verb',
            );
            expect(result.stdout).toContain('rhx git.branch.cutover continue');
            expect(result.stdout).toContain('rhx git.branch.cutover abort');
          }
          expect(hasStateFile(scene)).toBe(true);
          expect(outcome.runs[0]!.stdout).toMatchSnapshot();
        },
      );
    });

    when('[t1] a rebase is halted, and the cutover verbs run', () => {
      const scene = useBeforeAll(async () => {
        const scene = genScene({
          slug: 'cutover-case53-rebase',
          featureCommits: FEATURE_COMMITS,
        });
        // .note = the dir git itself leaves while a rebase is halted
        fs.mkdirSync(path.join(scene.repoDir, '.git', 'rebase-merge'));
        return scene;
      });
      const outcome = useBeforeAll(async () => ({
        cont: runCutover(scene, ['continue']),
        abort: runCutover(scene, ['abort']),
      }));

      then('each refuses and names the rebase verbs', () => {
        for (const [verb, result] of Object.entries({
          continue: outcome.cont,
          abort: outcome.abort,
        })) {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            `no cutover is in flight to ${verb}; a rebase is`,
          );
          expect(result.stdout).toContain('rhx git.branch.rebase continue');
          expect(result.stdout).toContain('rhx git.branch.rebase abort');
        }
        expect(outcome.cont.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case54] --into nests with a branch that stands', () => {
    // .why = git keeps refs as paths: feat/foo and feat/foo/v2 cannot both
    //        be. a clash must refuse as a caller fix in preflight, never
    //        fail at the cut as a malfunction after the meter gate
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case54',
        featureCommits: FEATURE_COMMITS,
      });
      git(scene.repoDir, [
        'push',
        '-q',
        'origin',
        `${scene.seedSha}:refs/heads/shoal/east`,
      ]);
      return scene;
    });
    const CASES = [
      {
        into: 'turtle/wave-report/v2',
        hit: 'local: turtle/wave-report',
        beside: 'turtle/wave-report-v2',
      },
      { into: 'turtle', hit: 'local: turtle/wave-report', beside: 'turtle-v2' },
      { into: 'shoal', hit: 'origin: shoal/east', beside: 'shoal-v2' },
    ];
    CASES.map(({ into, hit, beside }, i) =>
      when(`[t${i}] begin --into ${into}`, () => {
        const result = useBeforeAll(async () =>
          runCutover(scene, [
            'begin',
            '--from',
            '@main',
            '--into',
            into,
            '--mode',
            'apply',
          ]),
        );

        then(
          'it refuses in preflight, names the clash, and spends naught',
          () => {
            expect(result.exitCode).toBe(2);
            expect(result.stdout).toContain(
              `--into ${into} nests with a branch that already stands`,
            );
            expect(result.stdout).toContain(hit);
            expect(result.stdout).toContain(`e.g. --into ${beside}`);
            expect(getBranch(scene)).toEqual('turtle/wave-report');
            expect(getQuota(scene)).toEqual(3);
            expect(hasStateFile(scene)).toBe(false);
            if (i === 0) expect(result.stdout).toMatchSnapshot();
          },
        );
      }),
    );
  });

  given('[case55] the first-draft flags of #528, with no subcommand', () => {
    // .why = #528 and #504 spelled it `--to X --cherry-pick sha`; a caller
    //        who copies them gets the paved command back, not "unknown"
    const scene = useBeforeAll(async () =>
      genScene({ slug: 'cutover-case55', featureCommits: FEATURE_COMMITS }),
    );

    when('[t0] --to and --cherry-pick, no begin', () => {
      const result = useBeforeAll(async () =>
        runCutover(scene, [
          '--to',
          'turtle/wave-report-v2',
          '--cherry-pick',
          'a1b2c3d',
        ]),
      );

      then('it refuses and hands back the translated begin', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'a flag came before the subcommand: --to',
        );
        expect(result.stdout).toContain(
          'rhx git.branch.cutover begin --from @main --into turtle/wave-report-v2 --pick a1b2c3d',
        );
        expect(result.stderr).toContain('a flag came before the subcommand');
        expect(getBranch(scene)).toEqual('turtle/wave-report');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case56] two picks carry one patch under two shas', () => {
    // .why = the second replays empty because the first carried it; the
    //        report must not credit the base with a change it lacks
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case56',
        featureCommits: [
          {
            file: 'src/tide.ts',
            content: 'export const tide = "high";\n',
            subject: 'feat(tide): add tide',
          },
        ],
        mainCommits: MAIN_COMMITS_REEF,
      });
      // undo it, then make the same change again: a twin patch, a new sha
      git(scene.repoDir, ['revert', '--no-edit', 'HEAD']);
      const twin = commitFile(scene.repoDir, {
        file: 'src/tide.ts',
        content: 'export const tide = "high";\n',
        subject: 'cont(tide): add tide again',
      });
      return { ...scene, twin };
    });

    when('[t0] begin picks the first and the twin', () => {
      const result = useBeforeAll(async () =>
        runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/tide-v2',
          '--pick',
          scene.featureShas[0]!,
          '--pick',
          scene.twin,
          '--mode',
          'apply',
        ]),
      );

      then('the twin drops, credited to the earlier pick', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(
          'an earlier pick already carried its change',
        );
        expect(result.stdout).not.toContain(
          'its change is already on origin/main',
        );
        expect(getSubjects(scene, 'turtle/tide-v2')[0]).toEqual(
          'feat(tide): add tide',
        );
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given(
    '[case57] a halt in a tree whose mechanic ops are blocked globally',
    () => {
      // .why = git.stage.add refuses on the global blocker before the stage
      //        grant; the halt must not say "stage ok" where stage.add refuses
      const scene = useBeforeAll(async () => {
        const scene = genConflictScene('cutover-case57');
        fs.writeFileSync(
          path.join(scene.repoDir, '.meter', 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 2, push: 'allow', stage: 'allow' }),
        );
        fs.writeFileSync(
          path.join(
            scene.homeDir,
            '.rhachet',
            'storage',
            'repo=ehmpathy',
            'role=mechanic',
            '.meter',
            'git.commit.uses.jsonc',
          ),
          JSON.stringify({ blocked: true }),
        );
        return scene;
      });

      when('[t0] begin halts on the conflict', () => {
        const result = useBeforeAll(async () =>
          runCutover(scene, [
            'begin',
            '--from',
            '@main',
            '--into',
            'turtle/wave-report-v2',
            '--pick',
            scene.featureShas[1]!,
            '--mode',
            'apply',
          ]),
        );

        then('the halt names the global blocker as the stage gate', () => {
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain(
            'stage: ✋ mechanic ops are blocked globally, so rhx git.stage.add will refuse',
          );
          expect(result.stdout).toContain('git.commit.uses allow --global');
          expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
        });
      });
    },
  );

  given('[case58] a post-checkout hook fails after the switch ran', () => {
    // .why = a failed hook becomes the checkout's exit code though HEAD
    //        already moved; begin must drive on, never back out against a
    //        HEAD that sits on the new branch
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case58',
        featureCommits: FEATURE_COMMITS,
        mainCommits: MAIN_COMMITS_REEF,
      });
      fs.writeFileSync(path.join(scene.repoDir, 'readme.md'), '# reef v2\n');
      const hook = path.join(scene.repoDir, '.git', 'hooks', 'post-checkout');
      fs.writeFileSync(hook, '#!/usr/bin/env bash\nexit 1\n');
      fs.chmodSync(hook, '755');
      return scene;
    });

    when('[t0] begin --mode apply', () => {
      const result = useBeforeAll(async () =>
        runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.featureShas[0]!,
          '--mode',
          'apply',
        ]),
      );

      then('the cutover lands on the new branch, edits carried', () => {
        expect(result.exitCode).toBe(0);
        expect(getBranch(scene)).toEqual('turtle/wave-report-v2');
        expect(getSubjects(scene, 'turtle/wave-report-v2')[0]).toEqual(
          FEATURE_COMMITS[0]!.subject,
        );
        expect(getStatus(scene)).toEqual(' M readme.md');
        expect(hasStateFile(scene)).toBe(false);
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case59] tracked edits that change a mode and a symlink', () => {
    // .why = this repo is mostly executable shell skills: `chmod +x` is the
    //        likely real edit. a carry must keep the mode and the link target
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case59',
        featureCommits: FEATURE_COMMITS,
        mainCommits: MAIN_COMMITS_REEF,
      });
      fs.symlinkSync('readme.md', path.join(scene.repoDir, 'reef.link'));
      git(scene.repoDir, ['add', 'reef.link']);
      git(scene.repoDir, ['commit', '-q', '-m', 'cont(reef): add a link']);
      fs.chmodSync(path.join(scene.repoDir, 'readme.md'), '755');
      fs.unlinkSync(path.join(scene.repoDir, 'reef.link'));
      fs.symlinkSync('.gitignore', path.join(scene.repoDir, 'reef.link'));
      return scene;
    });

    when(
      '[t0] begin --from @main --mode apply, the link carried as a pick',
      () => {
        const result = useBeforeAll(async () =>
          runCutover(scene, [
            'begin',
            '--from',
            '@main',
            '--into',
            'turtle/wave-report-v2',
            '--pick',
            git(scene.repoDir, ['rev-parse', 'HEAD']),
            '--mode',
            'apply',
          ]),
        );

        then('the mode and the link target ride along', () => {
          expect(result.exitCode).toBe(0);
          expect(getStatus(scene)).toEqual(' M readme.md\n M reef.link');
          expect(
            fs.statSync(path.join(scene.repoDir, 'readme.md')).mode & 0o111,
          ).not.toEqual(0);
          expect(
            fs.readlinkSync(path.join(scene.repoDir, 'reef.link')),
          ).toEqual('.gitignore');
          expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
        });
      },
    );
  });

  given('[case61] an apply was killed after its cut, before its switch', () => {
    // .why = begin spends its unit once the switch lands; an abort from
    //        phase "cut" must not claim a unit was spent
    // .note = the scene lays down what such a kill leaves: the new branch
    //         cut, HEAD still on the source, the state at phase "cut"
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case61',
        featureCommits: FEATURE_COMMITS,
      });
      git(scene.repoDir, [
        'branch',
        '--no-track',
        'turtle/wave-report-v2',
        scene.seedSha,
      ]);
      const cutoverDir = path.join(scene.repoDir, '.git', 'cutover');
      fs.mkdirSync(cutoverDir, { recursive: true });
      fs.writeFileSync(
        path.join(cutoverDir, 'state.json'),
        JSON.stringify({
          schema: 1,
          into: 'turtle/wave-report-v2',
          source_name: 'turtle/wave-report',
          source_sha: scene.featureShas[2],
          base_kind: '@main',
          base_label: 'origin/main',
          base_sha: scene.seedSha,
          phase: 'cut',
          halt: '',
          pick_index: 0,
          picks: [],
          tracked: [],
          untracked: [],
          left_behind: [],
        }),
      );
      return scene;
    });

    when('[t0] abort', () => {
      const result = useBeforeAll(async () => runCutover(scene, ['abort']));

      then('it undoes the cut and says no unit was spent', () => {
        expect(result.exitCode).toBe(0);
        expect(getBranch(scene)).toEqual('turtle/wave-report');
        expect(hasBranch(scene, 'turtle/wave-report-v2')).toBe(false);
        expect(result.stdout).toContain(
          'quota: no unit was spent; the cutover stopped before its switch',
        );
        expect(result.stdout).not.toContain('stays spent');
        expect(getQuota(scene)).toEqual(3);
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case62] the same begin reruns after the cutover finished', () => {
    // .why = a retry after a tool timeout must learn the cutover is done,
    //        never be steered to cut a second branch and spend a second unit
    const scene = useBeforeAll(async () =>
      genScene({
        slug: 'cutover-case62',
        featureCommits: FEATURE_COMMITS,
        mainCommits: MAIN_COMMITS_REEF,
      }),
    );

    when('[t0] begin --mode apply, then the same again', () => {
      const outcome = useBeforeAll(async () => {
        const args = [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.featureShas[0]!,
          '--mode',
          'apply',
        ];
        const first = runCutover(scene, args);
        const rerun = runCutover(scene, args);
        return { first, rerun };
      });

      then(
        'the rerun refuses and says a prior cutover may have finished',
        () => {
          expect(outcome.first.exitCode).toBe(0);
          expect(outcome.rerun.exitCode).toBe(2);
          expect(outcome.rerun.stdout).toContain(
            'HEAD is on turtle/wave-report-v2 already: a prior cutover may have finished',
          );
          expect(outcome.rerun.stdout).not.toContain(
            '--into turtle/wave-report-v2-v2',
          );
          expect(getQuota(scene)).toEqual(2);
          expect(asSnapshotSafe(outcome.rerun.stdout)).toMatchSnapshot();
        },
      );
    });
  });

  given('[case60] a cutover run inside a linked worktree', () => {
    // .why = the state, the lock, and the park live in the worktree's own
    //        git dir; the main worktree must see none of them
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case60',
        featureCommits: FEATURE_COMMITS,
        mainCommits: MAIN_COMMITS_REEF,
      });
      const linkedDir = path.join(
        genTempDir({ slug: 'cutover-case60-linked', git: false }),
        'tree',
      );
      git(scene.repoDir, ['checkout', '-q', 'main']);
      git(scene.repoDir, [
        'worktree',
        'add',
        '-q',
        linkedDir,
        'turtle/wave-report',
      ]);
      fs.mkdirSync(path.join(linkedDir, '.meter'), { recursive: true });
      fs.writeFileSync(
        path.join(linkedDir, '.meter', 'git.branch.uses.jsonc'),
        JSON.stringify({ uses: 3 }),
      );
      fs.writeFileSync(path.join(linkedDir, 'readme.md'), '# reef v2\n');
      return { ...scene, linkedDir };
    });

    when('[t0] begin --mode apply in the linked worktree', () => {
      const result = useBeforeAll(async () => {
        const out = spawnSync(
          'bash',
          [
            scriptPath,
            'begin',
            '--from',
            '@main',
            '--into',
            'turtle/wave-report-v2',
            '--pick',
            scene.featureShas[0]!,
            '--mode',
            'apply',
          ],
          {
            cwd: scene.linkedDir,
            encoding: 'utf-8',
            env: { ...process.env, HOME: scene.homeDir },
          },
        );
        return { stdout: out.stdout ?? '', exitCode: out.status ?? 1 };
      });

      then('the linked worktree lands on the new branch, edits carried', () => {
        expect(result.exitCode).toBe(0);
        expect(
          git(scene.linkedDir, ['symbolic-ref', '--short', 'HEAD']),
        ).toEqual('turtle/wave-report-v2');
        expect(
          fs.readFileSync(path.join(scene.linkedDir, 'readme.md'), 'utf-8'),
        ).toEqual('# reef v2\n');
        expect(asSnapshotSafeIn(scene, result.stdout)).toMatchSnapshot();
      });

      then('the main worktree is untouched', () => {
        expect(getBranch(scene)).toEqual('main');
        expect(getStatus(scene)).toEqual('');
        expect(getCutoverRefs(scene)).toEqual('');
        expect(hasStateFile(scene)).toBe(false);
      });
    });
  });

  given('[case63] a cutover interrupted after its switch, with no halt', () => {
    // .why = a kill, a full disk, or a failed step after the switch leaves
    //        no halt. continue must drive it home; abort would discard the
    //        landed work, and a redo would cost a second human-granted unit
    when('[t0] the commit of a pick fails, then continue', () => {
      const scene = useBeforeAll(async () => {
        const scene = genScene({
          slug: 'cutover-case63-pick',
          featureCommits: FEATURE_COMMITS,
          mainCommits: MAIN_COMMITS_REEF,
        });
        fs.writeFileSync(path.join(scene.repoDir, 'readme.md'), '# reef v2\n');
        return scene;
      });
      const outcome = useBeforeAll(async () => {
        const failed = runCutoverWithBin(
          scene,
          genGitShimBin({
            slug: 'cutover-case63-pick',
            failWhen: '[[ "$1" == "commit" ]]',
          }),
          [
            'begin',
            '--from',
            '@main',
            '--into',
            'turtle/wave-report-v2',
            '--pick',
            scene.featureShas[0]!,
            '--mode',
            'apply',
          ],
        );
        const stateKept = hasStateFile(scene);
        const cont = runCutover(scene, ['continue']);
        return { failed, stateKept, cont };
      });

      then('the failure keeps the state and names continue', () => {
        expect(outcome.failed.exitCode).toBe(1);
        expect(outcome.stateKept).toBe(true);
        expect(outcome.failed.stdout).toContain(
          'resume, once the cause is cleared: rhx git.branch.cutover continue',
        );
      });

      then('continue lands the pick and carries the edit', () => {
        expect(outcome.cont.exitCode).toBe(0);
        expect(getSubjects(scene, 'turtle/wave-report-v2')[0]).toEqual(
          FEATURE_COMMITS[0]!.subject,
        );
        expect(getStatus(scene)).toEqual(' M readme.md');
        expect(hasStateFile(scene)).toBe(false);
        expect(getCutoverRefs(scene)).toEqual('');
        expect(getQuota(scene)).toEqual(2);
        expect(asSnapshotSafe(outcome.cont.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] the carry fails, then continue', () => {
      const scene = useBeforeAll(async () => {
        const scene = genScene({
          slug: 'cutover-case63-carry',
          featureCommits: FEATURE_COMMITS,
          mainCommits: MAIN_COMMITS_REEF,
        });
        fs.writeFileSync(path.join(scene.repoDir, 'readme.md'), '# reef v2\n');
        return scene;
      });
      const outcome = useBeforeAll(async () => {
        const failed = runCutoverWithBin(
          scene,
          genGitShimBin({
            slug: 'cutover-case63-carry',
            failWhen:
              '[[ "$1" == "cherry-pick" && "$3" == "refs/worktree/cutover/tree" ]]',
          }),
          [
            'begin',
            '--from',
            '@main',
            '--into',
            'turtle/wave-report-v2',
            '--pick',
            scene.featureShas[0]!,
            '--mode',
            'apply',
          ],
        );
        const cont = runCutover(scene, ['continue']);
        return { failed, cont };
      });

      then('continue lays the parked edit down and finishes', () => {
        expect(outcome.failed.exitCode).toBe(1);
        expect(outcome.cont.exitCode).toBe(0);
        expect(
          fs.readFileSync(path.join(scene.repoDir, 'readme.md'), 'utf-8'),
        ).toEqual('# reef v2\n');
        expect(getStatus(scene)).toEqual(' M readme.md');
        expect(getSubjects(scene, 'turtle/wave-report-v2')[0]).toEqual(
          FEATURE_COMMITS[0]!.subject,
        );
        expect(hasStateFile(scene)).toBe(false);
        expect(getQuota(scene)).toEqual(2);
      });
    });
  });

  given('[case64] a settled file is staged with its conflict markers', () => {
    // .why = continue lands what is staged; markers would commit as settled
    const scene = useBeforeAll(async () => {
      const scene = genConflictScene('cutover-case64');
      const halt = runCutover(scene, [
        'begin',
        '--from',
        '@main',
        '--into',
        'turtle/wave-report-v2',
        '--pick',
        scene.featureShas[1]!,
        '--mode',
        'apply',
      ]);
      if (halt.exitCode !== 2)
        throw new Error(`case64 setup: begin did not halt: ${halt.stdout}`);
      git(scene.repoDir, ['add', 'src/band.ts']);
      return scene;
    });

    when('[t0] continue, then settle for real and continue again', () => {
      const outcome = useBeforeAll(async () => {
        const refused = runCutover(scene, ['continue']);
        const headAfterRefusal = getSubjects(scene, 'HEAD')[0];
        fs.writeFileSync(
          path.join(scene.repoDir, 'src', 'band.ts'),
          'export const band = "both";\n',
        );
        git(scene.repoDir, ['add', 'src/band.ts']);
        const landed = runCutover(scene, ['continue']);
        return { refused, headAfterRefusal, landed };
      });

      then('the first continue refuses and names the file', () => {
        expect(outcome.refused.exitCode).toBe(2);
        expect(outcome.refused.stdout).toContain(
          'staged files still hold conflict markers',
        );
        expect(outcome.refused.stdout).toContain('src/band.ts');
        expect(outcome.headAfterRefusal).toEqual(
          'feat(band): add band on main',
        );
        expect(asSnapshotSafe(outcome.refused.stdout)).toMatchSnapshot();
      });

      then('the settled continue lands the pick', () => {
        expect(outcome.landed.exitCode).toBe(0);
        expect(getSubjects(scene, 'HEAD')[0]).toEqual(
          'cont(wave): add band of swell',
        );
      });
    });
  });

  given('[case65] a pick deletes a file the base changed', () => {
    // .why = a modify/delete conflict settles by removal; the paved stage
    //        verb must record a delete, or the caller needs a raw git rm
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case65',
        featureCommits: FEATURE_COMMITS,
        mainCommits: [
          {
            file: 'readme.md',
            content: '# reef, from main\n',
            subject: 'docs(readme): retitle the reef',
          },
        ],
      });
      git(scene.repoDir, ['rm', '-q', 'readme.md']);
      git(scene.repoDir, ['commit', '-q', '-m', 'cont(reef): drop the readme']);
      const dropSha = git(scene.repoDir, ['rev-parse', 'HEAD']);
      grantCommitQuota(scene);
      fs.writeFileSync(
        path.join(scene.repoDir, '.meter', 'git.commit.uses.jsonc'),
        JSON.stringify({ uses: 2, push: 'allow', stage: 'allow' }),
      );
      return { ...scene, dropSha };
    });

    when(
      '[t0] begin halts, the file is removed and staged, then continue',
      () => {
        const outcome = useBeforeAll(async () => {
          const halt = runCutover(scene, [
            'begin',
            '--from',
            '@main',
            '--into',
            'turtle/wave-report-v2',
            '--pick',
            scene.dropSha,
            '--mode',
            'apply',
          ]);
          fs.rmSync(path.join(scene.repoDir, 'readme.md'), { force: true });
          const stage = spawnSync(
            'bash',
            [
              path.join(__dirname, '..', 'git.stage', 'git.stage.add.sh'),
              'readme.md',
            ],
            {
              cwd: scene.repoDir,
              encoding: 'utf-8',
              env: { ...process.env, HOME: scene.homeDir },
            },
          );
          const cont = runCutover(scene, ['continue']);
          return { halt, stage, cont };
        });

        then('the halt says the pick deletes the file', () => {
          expect(outcome.halt.exitCode).toBe(2);
          expect(outcome.halt.stdout).toContain(
            'readme.md (the pick deletes it; keep it, or rhx rmsafe it)',
          );
          expect(asSnapshotSafe(outcome.halt.stdout)).toMatchSnapshot();
        });

        then('git.stage.add stages the delete', () => {
          expect(outcome.stage.status).toBe(0);
        });

        then('continue lands the pick with the file gone', () => {
          expect(outcome.cont.exitCode).toBe(0);
          expect(getSubjects(scene, 'HEAD')[0]).toEqual(
            'cont(reef): drop the readme',
          );
          expect(fs.existsSync(path.join(scene.repoDir, 'readme.md'))).toBe(
            false,
          );
        });
      },
    );
  });

  given('[case66] a plan while cutovers are blocked globally', () => {
    // .why = the plan's quota line must name the gate's own reason and lift,
    //        not a generic "no cutover granted"
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case66',
        featureCommits: FEATURE_COMMITS,
      });
      fs.writeFileSync(
        path.join(
          scene.homeDir,
          '.rhachet',
          'storage',
          'repo=ehmpathy',
          'role=mechanic',
          '.meter',
          'git.branch.uses.jsonc',
        ),
        JSON.stringify({ blocked: true }),
      );
      return scene;
    });

    when('[t0] begin in plan mode', () => {
      const result = useBeforeAll(async () =>
        runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
        ]),
      );

      then('the quota line names the global block and its lift', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('quota: ✋ apply will refuse:');
        expect(result.stdout).toContain('rhx git.branch.uses allow --global');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case67] an untracked file appears mid-halt where a pick adds', () => {
    // .why = inv-0 holds past begin: continue must refuse before the replay
    //        meets an untracked file at a path a later pick adds
    const scene = useBeforeAll(async () => {
      const scene = genConflictScene('cutover-case67');
      const halt = runCutover(scene, [
        'begin',
        '--from',
        '@main',
        '--into',
        'turtle/wave-report-v2',
        '--pick',
        scene.featureShas[1]!,
        '--pick',
        scene.featureShas[0]!,
        '--mode',
        'apply',
      ]);
      if (halt.exitCode !== 2)
        throw new Error(`case67 setup: begin did not halt: ${halt.stdout}`);
      fs.writeFileSync(
        path.join(scene.repoDir, 'src', 'band.ts'),
        'export const band = "both";\n',
      );
      git(scene.repoDir, ['add', 'src/band.ts']);
      fs.mkdirSync(
        path.dirname(path.join(scene.repoDir, FEATURE_COMMITS[0]!.file)),
        { recursive: true },
      );
      fs.writeFileSync(
        path.join(scene.repoDir, FEATURE_COMMITS[0]!.file),
        'a sea turtle note\n',
      );
      return scene;
    });

    when('[t0] continue', () => {
      const result = useBeforeAll(async () => runCutover(scene, ['continue']));

      then('it refuses, names the file, and leaves it untouched', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'untracked files sit where continue would write',
        );
        expect(result.stdout).toContain(FEATURE_COMMITS[0]!.file);
        expect(
          fs.readFileSync(
            path.join(scene.repoDir, FEATURE_COMMITS[0]!.file),
            'utf-8',
          ),
        ).toEqual('a sea turtle note\n');
        expect(hasStateFile(scene)).toBe(true);
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given(
    '[case68] origin holds a branch whose path ends in the --into name',
    () => {
      // .why = abort refuses only a pushed --into; origin/feat/<into> is a
      //        different branch, and must not read as a push of <into>
      const scene = useBeforeAll(async () => {
        const scene = genConflictScene('cutover-case68');
        git(scene.repoDir, [
          'push',
          '-q',
          'origin',
          'HEAD:refs/heads/feat/turtle/wave-report-v2',
        ]);
        git(scene.repoDir, ['fetch', '-q', 'origin']);
        const halt = runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.featureShas[1]!,
          '--mode',
          'apply',
        ]);
        if (halt.exitCode !== 2)
          throw new Error(`case68 setup: begin did not halt: ${halt.stdout}`);
        return scene;
      });

      when('[t0] abort', () => {
        const result = useBeforeAll(async () => runCutover(scene, ['abort']));

        then('abort undoes the cutover', () => {
          expect(result.exitCode).toBe(0);
          expect(result.stdout).not.toContain('is on a remote');
          expect(getBranch(scene)).toEqual('turtle/wave-report');
          expect(hasBranch(scene, 'turtle/wave-report-v2')).toBe(false);
        });
      });
    },
  );

  given('[case69] rhachet passthrough args before the subcommand', () => {
    const scene = useBeforeAll(async () =>
      genScene({
        slug: 'cutover-case69',
        featureCommits: FEATURE_COMMITS,
        mainCommits: MAIN_COMMITS_REEF,
      }),
    );
    const PASSTHROUGH = [
      '--skill',
      'git.branch.cutover',
      '--repo',
      'ehmpathy',
      '--role',
      'mechanic',
    ];

    when('[t0] begin, as rhx invokes it', () => {
      then('the passthrough args are ignored and the plan renders', () => {
        const result = runCutover(scene, [
          ...PASSTHROUGH,
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.featureShas[1]!,
        ]);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('heres the wave');
        expect(result.stdout).toContain('picks (1, in order)');
        expect(getQuota(scene)).toEqual(3);
      });
    });

    when('[t1] continue, as rhx invokes it, with no cutover in flight', () => {
      then('it reaches the continue guard, not the dispatcher', () => {
        const result = runCutover(scene, [...PASSTHROUGH, 'continue']);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).not.toContain('unknown subcommand');
        expect(result.stdout).not.toContain('a flag came before');
        expect(result.stdout).toContain('no cutover');
      });
    });
  });
  /**
   * .what = write a bash shim for a cli onto a temp PATH dir; return the dir
   * .why = some faults land only at one exact step of an apply; a shim on
   *        PATH is the only way to land them there from outside
   */
  const genShimBin = (input: { slug: string; cli: string; body: string[] }) => {
    const binDir = genTempDir({ slug: input.slug, git: false });
    fs.writeFileSync(
      path.join(binDir, input.cli),
      ['#!/usr/bin/env bash', ...input.body, ''].join('\n'),
    );
    fs.chmodSync(path.join(binDir, input.cli), '755');
    return binDir;
  };
  const getRealBin = (cli: string) =>
    spawnSync('which', [cli], { encoding: 'utf-8' }).stdout.trim();
  const runCutoverWithShim = (
    scene: Scene,
    args: string[],
    shim: { binDir: string; env: Record<string, string> },
  ) => {
    const result = spawnSync('bash', [scriptPath, ...args], {
      cwd: scene.repoDir,
      encoding: 'utf-8',
      env: {
        ...process.env,
        HOME: scene.homeDir,
        PATH: `${shim.binDir}:${process.env.PATH}`,
        ...shim.env,
      },
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  given('[case70] a tracked edit to a file a left-behind commit adds', () => {
    // .why = the carry halts on an edit to a file the new branch lacks, and
    //        that halt costs a unit. the plan must foresee it and name the
    //        commit that adds the file; the halt must not blame the new branch
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case70',
        featureCommits: FEATURE_COMMITS,
        mainCommits: MAIN_COMMITS_REEF,
      });
      fs.writeFileSync(
        path.join(scene.repoDir, FEATURE_COMMITS[0]!.file),
        'export const wave = 9;\n',
      );
      return scene;
    });
    const BEGIN = ['begin', '--from', '@main', '--into', 'turtle/wave-v2'];

    when('[t0] plan, without a pick of the commit that adds the file', () => {
      then('it warns that the carry will halt, and names the commit', () => {
        const result = runCutover(scene, [
          ...BEGIN,
          '--pick',
          scene.featureShas[1]!,
        ]);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('carry will halt (1)');
        expect(result.stdout).toContain(
          `${FEATURE_COMMITS[0]!.file} (added by ${scene.featureShas[0]!.slice(0, 7)}`,
        );
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] plan, with a pick of the commit that adds the file', () => {
      then('it warns of no carry halt', () => {
        const result = runCutover(scene, [
          ...BEGIN,
          '--pick',
          scene.featureShas[0]!,
        ]);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).not.toContain('carry will halt');
      });
    });

    when('[t2] apply, without the pick', () => {
      const result = useBeforeAll(async () =>
        runCutover(scene, [
          ...BEGIN,
          '--pick',
          scene.featureShas[1]!,
          '--mode',
          'apply',
        ]),
      );

      then('the carry halts, and says the new branch lacks the file', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          `${FEATURE_COMMITS[0]!.file} (the new branch lacks it; a commit not picked adds it`,
        );
        expect(result.stdout).not.toContain('the new branch deleted it');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case71] a repo that signs every commit', () => {
    // .why = a human's commit.gpgsign must not fail the bot's replay or park;
    //        the bot holds no key of the human's
    const scene = useBeforeAll(async () => {
      const scene = genScene({
        slug: 'cutover-case71',
        featureCommits: FEATURE_COMMITS,
        mainCommits: MAIN_COMMITS_REEF,
      });
      git(scene.repoDir, ['config', 'commit.gpgsign', 'true']);
      git(scene.repoDir, ['config', 'gpg.program', '/bin/false']);
      fs.writeFileSync(path.join(scene.repoDir, 'readme.md'), '# reef v2\n');
      return scene;
    });

    when('[t0] apply with one pick and a tracked edit', () => {
      const result = useBeforeAll(async () =>
        runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-v2',
          '--pick',
          scene.featureShas[1]!,
          '--mode',
          'apply',
        ]),
      );

      then('the pick lands and the edit carries, unsigned', () => {
        expect(result.exitCode).toBe(0);
        expect(getBranch(scene)).toEqual('turtle/wave-v2');
        expect(git(scene.repoDir, ['log', '-1', '--format=%s'])).toEqual(
          FEATURE_COMMITS[1]!.subject,
        );
        expect(
          fs.readFileSync(path.join(scene.repoDir, 'readme.md'), 'utf-8'),
        ).toEqual('# reef v2\n');
        expect(getQuota(scene)).toEqual(2);
      });
    });
  });

  given('[case72] a tracked edit saved while the apply runs', () => {
    // .why = inv-10: the reset may erase only what the park holds. an edit
    //        saved after the preflight view, or after the park, must never
    //        be reset away
    //
    // .mock = a git shim on PATH execs the real git for every call, and
    //         writes a tracked edit at one exact step
    // .why  = a peer editor's save cannot be scheduled from outside
    const genEditShim = (slug: string, trigger: string) =>
      genShimBin({
        slug,
        cli: 'git',
        body: [
          `if ${trigger} && [[ ! -e "$EDIT_MARK" ]]; then`,
          '  touch "$EDIT_MARK"',
          '  "$REAL_GIT" "$@"; rc=$?',
          '  printf "# reef v9\\n" > readme.md',
          '  exit "$rc"',
          'fi',
          'exec "$REAL_GIT" "$@"',
        ],
      });

    when(
      '[t0] the edit lands after the preflight view, before the claim',
      () => {
        const outcome = useBeforeAll(async () => {
          const scene = genScene({
            slug: 'cutover-case72-t0',
            featureCommits: FEATURE_COMMITS,
            mainCommits: MAIN_COMMITS_REEF,
          });
          const binDir = genEditShim(
            'cutover-case72-t0-bin',
            '[[ "$1" == "cherry" ]]',
          );
          const result = runCutoverWithShim(
            scene,
            [
              'begin',
              '--from',
              '@main',
              '--into',
              'turtle/wave-v2',
              '--pick',
              scene.featureShas[1]!,
              '--mode',
              'apply',
            ],
            {
              binDir,
              env: {
                REAL_GIT: getRealBin('git'),
                EDIT_MARK: path.join(binDir, 'edited'),
              },
            },
          );
          return {
            scene,
            result,
            marked: fs.existsSync(path.join(binDir, 'edited')),
          };
        });

        then('the edit is parked and carried, never reset', () => {
          expect(outcome.marked).toBe(true);
          expect(outcome.result.exitCode).toBe(0);
          expect(getBranch(outcome.scene)).toEqual('turtle/wave-v2');
          expect(
            fs.readFileSync(
              path.join(outcome.scene.repoDir, 'readme.md'),
              'utf-8',
            ),
          ).toEqual('# reef v9\n');
        });
      },
    );

    when('[t1] the edit lands after the park, before the reset', () => {
      const outcome = useBeforeAll(async () => {
        const scene = genScene({
          slug: 'cutover-case72-t1',
          featureCommits: FEATURE_COMMITS,
          mainCommits: MAIN_COMMITS_REEF,
        });
        fs.writeFileSync(path.join(scene.repoDir, 'notes.md'), 'tide\n');
        git(scene.repoDir, ['add', 'notes.md']);
        const binDir = genEditShim(
          'cutover-case72-t1-bin',
          '[[ "$1" == "update-ref" && "$2" == "refs/worktree/cutover/index" ]]',
        );
        const result = runCutoverWithShim(
          scene,
          [
            'begin',
            '--from',
            '@main',
            '--into',
            'turtle/wave-v2',
            '--pick',
            scene.featureShas[1]!,
            '--mode',
            'apply',
          ],
          {
            binDir,
            env: {
              REAL_GIT: getRealBin('git'),
              EDIT_MARK: path.join(binDir, 'edited'),
            },
          },
        );
        return {
          scene,
          result,
          marked: fs.existsSync(path.join(binDir, 'edited')),
        };
      });

      then('the cut backs out, and every edit stays in place', () => {
        expect(outcome.marked).toBe(true);
        expect(outcome.result.exitCode).toBe(2);
        expect(outcome.result.stdout).toContain(
          'tracked edits changed while the cutover ran',
        );
        expect(getBranch(outcome.scene)).toEqual('turtle/wave-report');
        expect(hasBranch(outcome.scene, 'turtle/wave-v2')).toBe(false);
        expect(hasStateFile(outcome.scene)).toBe(false);
        expect(getQuota(outcome.scene)).toEqual(3);
        expect(
          fs.readFileSync(
            path.join(outcome.scene.repoDir, 'readme.md'),
            'utf-8',
          ),
        ).toEqual('# reef v9\n');
        expect(
          fs.readFileSync(
            path.join(outcome.scene.repoDir, 'notes.md'),
            'utf-8',
          ),
        ).toEqual('tide\n');
        expect(asSnapshotSafe(outcome.result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case73] the meter lock file cannot be made', () => {
    // .why = a fault deep in the meter exits the process; the claim it held
    //        must not outlive it, or the next begin reads "already in flight"
    //
    // .mock = an `ln` shim on PATH that fails for the meter lock alone
    // .why  = a filesystem that refuses one hard link cannot be staged in a
    //         temp dir; the cutover lock beside it must still take
    const scene = useBeforeAll(async () =>
      genScene({
        slug: 'cutover-case73',
        featureCommits: FEATURE_COMMITS,
        mainCommits: MAIN_COMMITS_REEF,
      }),
    );

    when('[t0] apply under the fault, then apply again without it', () => {
      const outcome = useBeforeAll(async () => {
        const binDir = genShimBin({
          slug: 'cutover-case73-bin',
          cli: 'ln',
          body: [
            'for arg in "$@"; do',
            '  if [[ "$arg" == *git.branch.uses.lock ]]; then',
            '    echo "ln: failed to create hard link: Operation not permitted" >&2',
            '    exit 1',
            '  fi',
            'done',
            'exec "$REAL_LN" "$@"',
          ],
        });
        const args = [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-v2',
          '--pick',
          scene.featureShas[1]!,
          '--mode',
          'apply',
        ];
        const faulted = runCutoverWithShim(scene, args, {
          binDir,
          env: { REAL_LN: getRealBin('ln') },
        });
        const stateAfterFault = hasStateFile(scene);
        const rerun = runCutover(scene, args);
        return { faulted, stateAfterFault, rerun };
      });

      then('the fault renders as a malfunction and drops the claim', () => {
        expect(outcome.faulted.exitCode).toBe(1);
        expect(outcome.faulted.stdout).toContain(
          'the quota lock file could not be made',
        );
        expect(outcome.stateAfterFault).toBe(false);
      });

      then('the rerun cuts over, with no in-flight refusal', () => {
        expect(outcome.rerun.exitCode).toBe(0);
        expect(outcome.rerun.stdout).not.toContain('already in flight');
        expect(getBranch(scene)).toEqual('turtle/wave-v2');
        expect(getQuota(scene)).toEqual(2);
      });
    });
  });

  given('[case74] a stale upstream config for the --into name', () => {
    // .why = inv-7: the new branch has no upstream. `--no-track` sets none,
    //        but leaves a [branch "<into>"] section from a branch of that
    //        name deleted earlier, which git reads as the upstream
    const genStaleScene = (slug: string) => {
      const scene = genScene({
        slug,
        featureCommits: FEATURE_COMMITS,
        mainCommits: MAIN_COMMITS_REEF,
      });
      git(scene.repoDir, ['config', 'branch.turtle/wave-v2.remote', 'origin']);
      git(scene.repoDir, [
        'config',
        'branch.turtle/wave-v2.merge',
        'refs/heads/main',
      ]);
      return scene;
    };
    const getUpstreamRc = (scene: Scene) =>
      spawnSync(
        'git',
        ['rev-parse', '--abbrev-ref', 'turtle/wave-v2@{upstream}'],
        { cwd: scene.repoDir, encoding: 'utf-8' },
      ).status;
    const getBranchConfig = (scene: Scene) =>
      spawnSync(
        'git',
        ['config', '--get-regexp', '^branch\\.turtle/wave-v2\\.'],
        { cwd: scene.repoDir, encoding: 'utf-8' },
      ).stdout;

    when('[t0] apply --from @main', () => {
      const scene = useBeforeAll(async () =>
        genStaleScene('cutover-case74-main'),
      );
      const result = useBeforeAll(async () =>
        runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-v2',
          '--mode',
          'apply',
        ]),
      );

      then('the new branch resolves no upstream, as the report says', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('no upstream');
        expect(getBranch(scene)).toEqual('turtle/wave-v2');
        expect(getUpstreamRc(scene)).not.toBe(0);
        expect(getBranchConfig(scene)).toEqual('');
      });
    });

    when('[t1] apply --from @tree', () => {
      const scene = useBeforeAll(async () =>
        genStaleScene('cutover-case74-tree'),
      );
      const result = useBeforeAll(async () =>
        runCutover(scene, [
          'begin',
          '--from',
          '@tree',
          '--into',
          'turtle/wave-v2',
          '--mode',
          'apply',
        ]),
      );

      then('the new branch resolves no upstream, as the report says', () => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('no upstream');
        expect(getBranch(scene)).toEqual('turtle/wave-v2');
        expect(getUpstreamRc(scene)).not.toBe(0);
        expect(getBranchConfig(scene)).toEqual('');
      });
    });
  });

  given(
    '[case75] an abort is killed after its switch back to the source',
    () => {
      // .why = F20: abort switches back to the source before it clears the
      //        state. a rerun after a kill there must finish the undo, never
      //        refuse "HEAD is not where this cutover left it", and never
      //        reset the edits a prior run already laid back
      //
      // .mock = a git shim on PATH execs the real git for every call, except
      //         one, where it kill -9s the abort itself
      // .why  = a kill at one exact instant cannot be scheduled from outside
      const genHaltedScene = (slug: string) => {
        const scene = genConflictScene(slug);
        fs.writeFileSync(path.join(scene.repoDir, 'readme.md'), '# reef v2\n');
        const halt = runCutover(scene, [
          'begin',
          '--from',
          '@main',
          '--into',
          'turtle/wave-report-v2',
          '--pick',
          scene.featureShas[1]!,
          '--mode',
          'apply',
        ]);
        if (halt.exitCode !== 2)
          throw new Error(`${slug} setup: begin did not halt: ${halt.stdout}`);
        return scene;
      };
      const runAbortKilledAt = (
        scene: Scene,
        slug: string,
        trigger: string,
      ) => {
        const binDir = genShimBin({
          slug,
          cli: 'git',
          body: [
            `if ${trigger}; then`,
            '  kill -9 "$PPID"',
            '  exit 1',
            'fi',
            'exec "$REAL_GIT" "$@"',
          ],
        });
        const killed = spawnSync('bash', [scriptPath, 'abort'], {
          cwd: scene.repoDir,
          encoding: 'utf-8',
          env: {
            ...process.env,
            HOME: scene.homeDir,
            PATH: `${binDir}:${process.env.PATH}`,
            REAL_GIT: getRealBin('git'),
          },
        });
        return {
          killed,
          branchAfterKill: getBranch(scene),
          stateAfterKill: hasStateFile(scene),
          editAfterKill: fs.readFileSync(
            path.join(scene.repoDir, 'readme.md'),
            'utf-8',
          ),
          rerun: runCutover(scene, ['abort']),
        };
      };

      when('[t0] the kill lands at the park restore, then abort reruns', () => {
        const scene = useBeforeAll(async () =>
          genHaltedScene('cutover-case75-t0'),
        );
        const outcome = useBeforeAll(async () =>
          runAbortKilledAt(
            scene,
            'cutover-case75-t0-bin',
            '[[ "$1" == "read-tree" && "$2" == "-m" && "$3" == "-u" ]]',
          ),
        );

        then(
          'the kill landed after the switch back, before the restore',
          () => {
            expect(outcome.killed.signal).toEqual('SIGKILL');
            expect(outcome.branchAfterKill).toEqual('turtle/wave-report');
            expect(outcome.stateAfterKill).toBe(true);
            expect(outcome.editAfterKill).not.toEqual('# reef v2\n');
          },
        );

        then(
          'the rerun finishes the undo: edit back, branch gone, state gone',
          () => {
            expect(outcome.rerun.exitCode).toBe(0);
            expect(outcome.rerun.stdout).not.toContain('HEAD is not where');
            expect(getBranch(scene)).toEqual('turtle/wave-report');
            expect(
              fs.readFileSync(path.join(scene.repoDir, 'readme.md'), 'utf-8'),
            ).toEqual('# reef v2\n');
            expect(hasBranch(scene, 'turtle/wave-report-v2')).toBe(false);
            expect(hasStateFile(scene)).toBe(false);
          },
        );
      });

      when('[t1] the kill lands after the restore, then abort reruns', () => {
        const scene = useBeforeAll(async () =>
          genHaltedScene('cutover-case75-t1'),
        );
        const outcome = useBeforeAll(async () =>
          runAbortKilledAt(
            scene,
            'cutover-case75-t1-bin',
            '[[ "$1" == "branch" && " $* " == *" -D "* ]]',
          ),
        );

        then(
          'the kill landed with the edit laid back and the state kept',
          () => {
            expect(outcome.killed.signal).toEqual('SIGKILL');
            expect(outcome.branchAfterKill).toEqual('turtle/wave-report');
            expect(outcome.stateAfterKill).toBe(true);
            expect(outcome.editAfterKill).toEqual('# reef v2\n');
          },
        );

        then('the rerun keeps the restored edit, and clears the rest', () => {
          expect(outcome.rerun.exitCode).toBe(0);
          expect(
            fs.readFileSync(path.join(scene.repoDir, 'readme.md'), 'utf-8'),
          ).toEqual('# reef v2\n');
          expect(getBranch(scene)).toEqual('turtle/wave-report');
          expect(hasBranch(scene, 'turtle/wave-report-v2')).toBe(false);
          expect(hasStateFile(scene)).toBe(false);
        });
      });
    },
  );

  given('[case76] a --from spelled as a remote-track ref or as HEAD', () => {
    // .why = the vision writes the base as origin/main; a caller who types
    //        it, or HEAD, must get the form they meant, not a push hint
    const scene = useBeforeAll(async () =>
      genScene({
        slug: 'cutover-case76',
        featureCommits: FEATURE_COMMITS,
        mainCommits: MAIN_COMMITS_REEF,
      }),
    );
    const runFrom = (from: string) =>
      runCutover(scene, ['begin', '--from', from, '--into', 'turtle/wave-v2']);

    when('[t0] --from origin/main', () => {
      const result = useBeforeAll(async () => runFrom('origin/main'));
      then('it refuses, and points to @main', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('drop the origin/ prefix');
        expect(result.stdout).toContain('--from @main');
        expect(result.stdout).not.toContain('push origin/main');
        expect(asSnapshotSafeIn(scene, result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] --from origin/release/v2', () => {
      const result = useBeforeAll(async () => runFrom('origin/release/v2'));
      then('it refuses, and points to the bare branch name', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('fix: --from release/v2');
      });
    });

    when('[t2] --from HEAD', () => {
      const result = useBeforeAll(async () => runFrom('HEAD'));
      then('it refuses, and points to @tree', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('fix: --from @tree');
        expect(asSnapshotSafeIn(scene, result.stdout)).toMatchSnapshot();
      });
    });
  });
});
