import { spawnSync } from 'child_process';
import * as fs from 'fs';
import { ConstraintError, MalfunctionError } from 'helpful-errors';
import * as os from 'os';
import * as path from 'path';
import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

/**
 * .what = acceptance journeys for `git.branch.rebase --unstaged ignore`, via the built skill
 * .why = a clone tree always holds unstaged ambient files; the shipped dist skill must set them
 *        aside, rebase, and put each back by every exit a clone walks
 */

// the built dispatcher, the artifact a clone runs
const DISPATCHER_PATH = path.join(
  process.cwd(),
  'dist/domain.roles/mechanic/skills/git.branch.rebase/git.branch.rebase.sh',
);

// the ambient files a clone tree holds unstaged, at the path a clone holds them
const AMBIENT_DIR = '.agent/.actors/actor.via.repo=ambient/brain/.claude';
const SETTINGS = `${AMBIENT_DIR}/settings.of.repo.json`;
const GROVE = `${AMBIENT_DIR}/settings.of.grove.json`;
const LINK_TARGET_COMMITTED = '/home/seaturtle/.claude/settings.json';
const LINK_TARGET_ABSENT = '/nonexistent/turtle/.claude/settings.json';
const SETTINGS_DRIFT = '{ "hooks": "v2-regenerated" }\n';

// the files an install rewrites in a clone tree, beside the ambient ones
const LOCKFILE = 'pnpm-lock.yaml';
const LOCKFILE_BASE = "lockfileVersion: '9.0'\nreef: 1.0.0\n";
const INSTALL_DRIFT_PACKAGE = '{ "version": "1.0.0", "dev": "relinked" }\n';
const INSTALL_DRIFT_LOCKFILE =
  "lockfileVersion: '9.0'\nreef: 1.0.0\nsettings: { autoInstallPeers: true }\n";

// main's release of the install files, as `git show` reads them back (trimmed)
const MAIN_PACKAGE_JSON = '{ "version": "1.1.0" }';
const MAIN_LOCKFILE = "lockfileVersion: '9.0'\nreef: 1.1.0";

/**
 * .what = rewrite the files an install touches, as `pnpm install` does in a clone tree
 * .why = a clone tree holds install drift beside the ambient drift; both must be set aside
 */
const driftInstall = (input: { workDir: string }): void => {
  fs.writeFileSync(
    path.join(input.workDir, 'package.json'),
    INSTALL_DRIFT_PACKAGE,
  );
  fs.writeFileSync(path.join(input.workDir, LOCKFILE), INSTALL_DRIFT_LOCKFILE);
};

/**
 * .what = run a git command in a dir, fail loud on error
 * .why = setup must never silently half-build a scenario
 */
const git = (input: { cwd: string; args: string[] }): string => {
  const result = spawnSync('git', input.args, {
    cwd: input.cwd,
    encoding: 'utf-8',
  });
  if (result.status !== 0)
    throw new MalfunctionError(`git ${input.args.join(' ')} failed`, {
      cwd: input.cwd,
      output: result.stderr || result.stdout,
      hint: 'check that git is installed and the temp dir is writable',
    });
  return result.stdout.trim();
};

/**
 * .what = commit one file on the current branch
 * .why = scenarios build history file by file
 */
const commitFile = (input: {
  cwd: string;
  file: string;
  content: string;
  message: string;
}): void => {
  fs.writeFileSync(path.join(input.cwd, input.file), input.content);
  git({ cwd: input.cwd, args: ['add', input.file] });
  git({ cwd: input.cwd, args: ['commit', '-m', input.message] });
};

/**
 * .what = build a work clone of a bare origin: main moved ahead of feat/turtle, ambient drift unstaged
 * .why = every journey rebases a real tree against a real remote, the way a clone meets it
 */
const setupJourney = (input: {
  conflict: boolean;
  mainChangesPackageJson: boolean;
  mainChangesLockfile: boolean;
}): { workDir: string; baseDir: string } => {
  // fail fast if the built skill is absent
  if (!fs.existsSync(DISPATCHER_PATH))
    throw new ConstraintError('built dispatcher absent', {
      path: DISPATCHER_PATH,
      hint: 'run: npm run build',
    });

  // a bare origin and a work clone
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-rebase-accept-'));
  const bareDir = path.join(baseDir, 'origin.git');
  const workDir = path.join(baseDir, 'work');
  fs.mkdirSync(bareDir);
  git({ cwd: bareDir, args: ['init', '--bare', '-b', 'main'] });
  git({ cwd: baseDir, args: ['clone', bareDir, workDir] });
  configureTestGitUser({ cwd: workDir });
  git({ cwd: workDir, args: ['symbolic-ref', 'HEAD', 'refs/heads/main'] });

  // the base tree: the ambient file, the ambient link, and the files main or the branch edit
  fs.writeFileSync(path.join(workDir, 'README.md'), '# reef\n');
  fs.mkdirSync(path.join(workDir, AMBIENT_DIR), { recursive: true });
  fs.writeFileSync(path.join(workDir, SETTINGS), '{ "hooks": "v1" }\n');
  fs.writeFileSync(
    path.join(workDir, 'package.json'),
    '{ "version": "1.0.0" }\n',
  );
  fs.writeFileSync(path.join(workDir, LOCKFILE), LOCKFILE_BASE);
  fs.writeFileSync(path.join(workDir, 'conflict.txt'), 'base\n');
  fs.symlinkSync(LINK_TARGET_COMMITTED, path.join(workDir, GROVE));
  git({ cwd: workDir, args: ['add', '-A'] });
  git({ cwd: workDir, args: ['commit', '-m', 'init: initial commit'] });
  git({ cwd: workDir, args: ['push', '-u', 'origin', 'main'] });

  // the branch the clone works on
  git({ cwd: workDir, args: ['checkout', '-b', 'feat/turtle'] });
  commitFile({
    cwd: workDir,
    file: 'feature.txt',
    content: 'feature\n',
    message: 'feat(reef): add feature',
  });
  if (input.conflict)
    commitFile({
      cwd: workDir,
      file: 'conflict.txt',
      content: 'feature version\n',
      message: 'feat(reef): edit conflict file',
    });

  // main moves ahead
  git({ cwd: workDir, args: ['checkout', 'main'] });
  commitFile({
    cwd: workDir,
    file: 'main-1.txt',
    content: 'main 1\n',
    message: 'chore(reef): main commit',
  });
  if (input.conflict)
    commitFile({
      cwd: workDir,
      file: 'conflict.txt',
      content: 'main version\n',
      message: 'chore(reef): main edits conflict file',
    });
  if (input.mainChangesPackageJson)
    commitFile({
      cwd: workDir,
      file: 'package.json',
      content: '{ "version": "1.1.0" }\n',
      message: 'chore(release): v1.1.0',
    });
  if (input.mainChangesLockfile)
    commitFile({
      cwd: workDir,
      file: LOCKFILE,
      content: "lockfileVersion: '9.0'\nreef: 1.1.0\n",
      message: 'chore(deps): bump reef lock',
    });
  git({ cwd: workDir, args: ['push', 'origin', 'main'] });
  git({ cwd: workDir, args: ['checkout', 'feat/turtle'] });

  // grant push, keep the meter out of the tree
  fs.mkdirSync(path.join(workDir, '.meter'), { recursive: true });
  fs.writeFileSync(
    path.join(workDir, '.meter', 'git.commit.uses.jsonc'),
    JSON.stringify({ uses: 5, push: 'allow' }, null, 2),
  );
  fs.writeFileSync(path.join(workDir, '.git', 'info', 'exclude'), '.meter\n');

  // the ambient drift a clone tree holds: a retargeted link to an absent target, a regenerated file
  fs.unlinkSync(path.join(workDir, GROVE));
  fs.symlinkSync(LINK_TARGET_ABSENT, path.join(workDir, GROVE));
  fs.writeFileSync(path.join(workDir, SETTINGS), SETTINGS_DRIFT);
  return { workDir, baseDir };
};

/**
 * .what = run the built skill via its dispatcher
 * .why = acceptance exercises the shipped artifact as a clone calls it
 */
const runRebase = (input: {
  workDir: string;
  args: string[];
}): { stdout: string; stderr: string; status: number | null } => {
  const result = spawnSync('bash', [DISPATCHER_PATH, ...input.args], {
    cwd: input.workDir,
    encoding: 'utf-8',
    env: { ...process.env, GIT_EDITOR: 'true' },
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
};

/**
 * .what = stabilize output for snapshots
 * .why = temp paths and commit hashes change each run
 */
const asStableOutput = (output: string): string =>
  output
    .replace(/\/tmp\/git-rebase-accept-[^/\s]+/g, '/tmp/TEST_REPO')
    .replace(/\b[0-9a-f]{7,40}\b/g, 'HASH123')
    .replace(/\[K/g, '')
    .replace(/[‘’]/g, "'")
    .replace(/^\s*│\s*hint:.*\n/gm, '')
    .replace(/^\s*│\s*Could not apply .*\n/gm, '')
    .replace(/(?:fatal|error): The pre-rebase hook/g, 'fatal: The pre-rebase hook')
    .replace(
      /Another git process seems to be .*(?:\n[ │]*(?:an editor opened|are terminated|may have crashed|remove the file manually).*)*/g,
      'Another git process holds the index lock',
    );

const getStorePath = (input: { workDir: string }): string =>
  path.join(input.workDir, '.git', 'git.branch.rebase.aside');

const readLinkTarget = (input: { workDir: string }): string =>
  fs.readlinkSync(path.join(input.workDir, GROVE));

const readFile = (input: { workDir: string; file: string }): string =>
  fs.readFileSync(path.join(input.workDir, input.file), 'utf-8');

describe('git.branch.rebase --unstaged (acceptance, built skill)', () => {
  given('[journey1] a clean rebase with ambient drift', () => {
    const scene = useBeforeAll(async () =>
      setupJourney({
        conflict: false,
        mainChangesPackageJson: false,
        mainChangesLockfile: false,
      }),
    );
    afterAll(() => fs.rmSync(scene.baseDir, { recursive: true, force: true }));

    when('[t0] begin --mode apply with no --unstaged flag', () => {
      const result = useThen('it runs', async () =>
        runRebase({
          workDir: scene.workDir,
          args: ['begin', '--mode', 'apply'],
        }),
      );
      then('it refuses, exit 2, names both paths and the cure', () => {
        expect(result.status).toBe(2);
        expect(result.stdout).toContain(
          '✋ ConstraintError: unstaged changes found',
        );
        expect(result.stdout).toContain(GROVE);
        expect(result.stdout).toContain(SETTINGS);
        expect(result.stdout).toContain(
          'rhx git.branch.rebase begin --mode apply --unstaged ignore',
        );
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] begin --unstaged ignore in plan mode', () => {
      const result = useThen('it runs', async () =>
        runRebase({
          workDir: scene.workDir,
          args: ['begin', '--unstaged', 'ignore'],
        }),
      );
      then('it lists the paths it would set aside and touches naught', () => {
        expect(result.status).toBe(0);
        expect(result.stdout).toContain('would set aside, then put back');
        expect(fs.existsSync(getStorePath({ workDir: scene.workDir }))).toBe(
          false,
        );
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] begin --mode apply --unstaged ignore', () => {
      const result = useThen('it runs', async () =>
        runRebase({
          workDir: scene.workDir,
          args: ['begin', '--mode', 'apply', '--unstaged', 'ignore'],
        }),
      );
      then('the rebase completes and both paths read back identical', () => {
        expect(result.status).toBe(0);
        expect(readLinkTarget({ workDir: scene.workDir })).toBe(
          LINK_TARGET_ABSENT,
        );
        expect(readFile({ workDir: scene.workDir, file: SETTINGS })).toBe(
          SETTINGS_DRIFT,
        );
        expect(
          git({
            cwd: scene.workDir,
            args: ['diff', '--name-only', 'origin/main', 'HEAD'],
          }),
        ).toBe('feature.txt');
        expect(fs.existsSync(getStorePath({ workDir: scene.workDir }))).toBe(
          false,
        );
        expect(git({ cwd: scene.workDir, args: ['stash', 'list'] })).toBe('');
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given(
    '[journey2] a conflicted rebase with ambient drift, settled and continued',
    () => {
      const scene = useBeforeAll(async () =>
        setupJourney({
          conflict: true,
          mainChangesPackageJson: false,
          mainChangesLockfile: false,
        }),
      );
      afterAll(() =>
        fs.rmSync(scene.baseDir, { recursive: true, force: true }),
      );

      when('[t0] begin --mode apply --unstaged ignore', () => {
        const result = useThen('it runs', async () =>
          runRebase({
            workDir: scene.workDir,
            args: ['begin', '--mode', 'apply', '--unstaged', 'ignore'],
          }),
        );
        then('it stops on the conflict and holds the paths aside', () => {
          expect(result.status).toBe(1);
          expect(result.stdout).toContain('conflict.txt');
          expect(fs.existsSync(getStorePath({ workDir: scene.workDir }))).toBe(
            true,
          );
          expect(asStableOutput(result.stdout)).toMatchSnapshot();
        });
      });

      when('[t1] the conflict is settled, then continue', () => {
        const result = useThen('it runs', async () => {
          fs.writeFileSync(
            path.join(scene.workDir, 'conflict.txt'),
            'settled\n',
          );
          git({ cwd: scene.workDir, args: ['add', 'conflict.txt'] });
          return runRebase({ workDir: scene.workDir, args: ['continue'] });
        });
        then('the rebase completes and both paths read back identical', () => {
          expect(result.status).toBe(0);
          expect(readLinkTarget({ workDir: scene.workDir })).toBe(
            LINK_TARGET_ABSENT,
          );
          expect(readFile({ workDir: scene.workDir, file: SETTINGS })).toBe(
            SETTINGS_DRIFT,
          );
          expect(fs.existsSync(getStorePath({ workDir: scene.workDir }))).toBe(
            false,
          );

          // the pr diff holds the branch's own work, and no ambient file
          expect(
            git({
              cwd: scene.workDir,
              args: ['diff', '--name-only', 'origin/main', 'HEAD'],
            }),
          ).toBe('conflict.txt\nfeature.txt');
          expect(asStableOutput(result.stdout)).toMatchSnapshot();
        });
      });
    },
  );

  given('[journey3] a conflicted rebase with ambient drift, aborted', () => {
    const scene = useBeforeAll(async () => {
      const setup = setupJourney({
        conflict: true,
        mainChangesPackageJson: false,
        mainChangesLockfile: false,
      });
      const headBefore = git({
        cwd: setup.workDir,
        args: ['rev-parse', 'HEAD'],
      });
      return { ...setup, headBefore };
    });
    afterAll(() => fs.rmSync(scene.baseDir, { recursive: true, force: true }));

    when('[t0] begin --mode apply --unstaged ignore', () => {
      const result = useThen('it runs', async () =>
        runRebase({
          workDir: scene.workDir,
          args: ['begin', '--mode', 'apply', '--unstaged', 'ignore'],
        }),
      );
      then('it stops on the conflict and holds the paths aside', () => {
        expect(result.status).toBe(1);
        expect(result.stdout).toContain('conflict.txt');
        expect(result.stdout).toContain('rhx git.branch.rebase abort');
        expect(fs.existsSync(getStorePath({ workDir: scene.workDir }))).toBe(
          true,
        );
      });
    });

    when('[t1] abort', () => {
      const result = useThen('it runs', async () =>
        runRebase({ workDir: scene.workDir, args: ['abort'] }),
      );
      then('HEAD is as before and both paths read back identical', () => {
        expect(result.status).toBe(0);
        expect(git({ cwd: scene.workDir, args: ['rev-parse', 'HEAD'] })).toBe(
          scene.headBefore,
        );
        expect(readLinkTarget({ workDir: scene.workDir })).toBe(
          LINK_TARGET_ABSENT,
        );
        expect(readFile({ workDir: scene.workDir, file: SETTINGS })).toBe(
          SETTINGS_DRIFT,
        );
        expect(fs.existsSync(getStorePath({ workDir: scene.workDir }))).toBe(
          false,
        );
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[journey4] main changed a path the clone holds unstaged', () => {
    const scene = useBeforeAll(async () => {
      const setup = setupJourney({
        conflict: false,
        mainChangesPackageJson: true,
        mainChangesLockfile: false,
      });
      fs.writeFileSync(
        path.join(setup.workDir, 'package.json'),
        '{ "version": "1.0.0-upgrade" }\n',
      );
      return setup;
    });
    afterAll(() => fs.rmSync(scene.baseDir, { recursive: true, force: true }));

    when('[t0] begin --mode apply --unstaged ignore', () => {
      const result = useThen('it runs', async () =>
        runRebase({
          workDir: scene.workDir,
          args: ['begin', '--mode', 'apply', '--unstaged', 'ignore'],
        }),
      );
      then(
        'the held copy reads back, and the output flags the path with its fix',
        () => {
          expect(result.status).toBe(0);
          expect(
            readFile({ workDir: scene.workDir, file: 'package.json' }),
          ).toBe('{ "version": "1.0.0-upgrade" }\n');
          expect(result.stdout).toContain('main also changed these paths');

          // the commit holds main's release, untouched; the held copy stays out of the index
          expect(
            git({ cwd: scene.workDir, args: ['show', 'HEAD:package.json'] }),
          ).toBe(MAIN_PACKAGE_JSON);
          expect(
            git({
              cwd: scene.workDir,
              args: ['diff', '--cached', '--name-only'],
            }),
          ).toBe('');
          expect(git({ cwd: scene.workDir, args: ['stash', 'list'] })).toBe('');
          expect(result.stdout).toContain('package.json');
          expect(asStableOutput(result.stdout)).toMatchSnapshot();
        },
      );
    });
  });

  given(
    '[journey5] an install rewrote package.json and pnpm-lock.yaml beside the actor drift',
    () => {
      const scene = useBeforeAll(async () => {
        const setup = setupJourney({
          conflict: false,
          mainChangesPackageJson: false,
          mainChangesLockfile: false,
        });
        driftInstall({ workDir: setup.workDir });
        return setup;
      });
      afterAll(() =>
        fs.rmSync(scene.baseDir, { recursive: true, force: true }),
      );

      when('[t0] begin --mode apply with no --unstaged flag', () => {
        const result = useThen('it runs', async () =>
          runRebase({
            workDir: scene.workDir,
            args: ['begin', '--mode', 'apply'],
          }),
        );
        then('it refuses, exit 2, and names all four paths', () => {
          expect(result.status).toBe(2);
          expect(result.stdout).toContain('package.json');
          expect(result.stdout).toContain(LOCKFILE);
          expect(result.stdout).toContain(GROVE);
          expect(result.stdout).toContain(SETTINGS);
          expect(asStableOutput(result.stdout)).toMatchSnapshot();
        });
      });

      when('[t1] begin --mode apply --unstaged ignore', () => {
        const result = useThen('it runs', async () =>
          runRebase({
            workDir: scene.workDir,
            args: ['begin', '--mode', 'apply', '--unstaged', 'ignore'],
          }),
        );
        then(
          'the rebase passes, and the install files and the actor drift read back identical',
          () => {
            expect(result.status).toBe(0);
            expect(
              readFile({ workDir: scene.workDir, file: 'package.json' }),
            ).toBe(INSTALL_DRIFT_PACKAGE);
            expect(readFile({ workDir: scene.workDir, file: LOCKFILE })).toBe(
              INSTALL_DRIFT_LOCKFILE,
            );
            expect(readLinkTarget({ workDir: scene.workDir })).toBe(
              LINK_TARGET_ABSENT,
            );
            expect(readFile({ workDir: scene.workDir, file: SETTINGS })).toBe(
              SETTINGS_DRIFT,
            );
            expect(
              git({
                cwd: scene.workDir,
                args: ['diff', '--name-only', 'origin/main', 'HEAD'],
              }),
            ).toBe('feature.txt');
            expect(
              fs.existsSync(getStorePath({ workDir: scene.workDir })),
            ).toBe(false);
            expect(git({ cwd: scene.workDir, args: ['stash', 'list'] })).toBe(
              '',
            );
            expect(asStableOutput(result.stdout)).toMatchSnapshot();
          },
        );
      });
    },
  );

  given(
    '[journey6] an install rewrote package.json and pnpm-lock.yaml, and main released new versions of both',
    () => {
      const scene = useBeforeAll(async () => {
        const setup = setupJourney({
          conflict: false,
          mainChangesPackageJson: true,
          mainChangesLockfile: true,
        });
        driftInstall({ workDir: setup.workDir });
        return setup;
      });
      afterAll(() =>
        fs.rmSync(scene.baseDir, { recursive: true, force: true }),
      );

      when('[t0] begin --mode apply --unstaged ignore', () => {
        const result = useThen('it runs', async () =>
          runRebase({
            workDir: scene.workDir,
            args: ['begin', '--mode', 'apply', '--unstaged', 'ignore'],
          }),
        );
        then(
          'the rebase passes, the held copies read back, and both install files are flagged with the fix',
          () => {
            expect(result.status).toBe(0);
            expect(
              readFile({ workDir: scene.workDir, file: 'package.json' }),
            ).toBe(INSTALL_DRIFT_PACKAGE);
            expect(readFile({ workDir: scene.workDir, file: LOCKFILE })).toBe(
              INSTALL_DRIFT_LOCKFILE,
            );
            expect(readLinkTarget({ workDir: scene.workDir })).toBe(
              LINK_TARGET_ABSENT,
            );
            expect(result.stdout).toContain('main also changed these paths');
            expect(
              git({ cwd: scene.workDir, args: ['rev-parse', 'HEAD~1'] }),
            ).toBe(
              git({ cwd: scene.workDir, args: ['rev-parse', 'origin/main'] }),
            );

            // the commit holds main's release of both files; the held copies stay out of the index
            expect(
              git({ cwd: scene.workDir, args: ['show', 'HEAD:package.json'] }),
            ).toBe(MAIN_PACKAGE_JSON);
            expect(
              git({ cwd: scene.workDir, args: ['show', `HEAD:${LOCKFILE}`] }),
            ).toBe(MAIN_LOCKFILE);
            expect(
              git({
                cwd: scene.workDir,
                args: ['diff', '--cached', '--name-only'],
              }),
            ).toBe('');
            expect(git({ cwd: scene.workDir, args: ['stash', 'list'] })).toBe(
              '',
            );
            expect(
              fs.existsSync(getStorePath({ workDir: scene.workDir })),
            ).toBe(false);
            expect(asStableOutput(result.stdout)).toMatchSnapshot();
          },
        );
      });
    },
  );

  // a fresh edit at a path NOT held lands while the conflict waits; `--unstaged ignore` joins it
  (['continue', 'abort'] as const).forEach((subcommand, index) => {
    given(
      `[journey${index + 7}] a fresh edit at a path not held while the conflict waits, then ${subcommand} --unstaged ignore`,
      () => {
        const scene = useBeforeAll(async () => {
          const setup = setupJourney({
            conflict: true,
            mainChangesPackageJson: false,
            mainChangesLockfile: false,
          });
          const headBefore = git({
            cwd: setup.workDir,
            args: ['rev-parse', 'HEAD'],
          });
          runRebase({
            workDir: setup.workDir,
            args: ['begin', '--mode', 'apply', '--unstaged', 'ignore'],
          });
          fs.writeFileSync(
            path.join(setup.workDir, 'README.md'),
            '# reef, fresh edit\n',
          );
          if (subcommand === 'continue') {
            fs.writeFileSync(
              path.join(setup.workDir, 'conflict.txt'),
              'settled\n',
            );
            git({ cwd: setup.workDir, args: ['add', 'conflict.txt'] });
          }
          const headStopped = git({
            cwd: setup.workDir,
            args: ['rev-parse', 'HEAD'],
          });
          return { ...setup, headBefore, headStopped };
        });
        afterAll(() =>
          fs.rmSync(scene.baseDir, { recursive: true, force: true }),
        );

        when(`[t0] ${subcommand} with no --unstaged flag`, () => {
          const result = useThen('it runs', async () =>
            runRebase({ workDir: scene.workDir, args: [subcommand] }),
          );
          then(
            'it refuses before git acts, exit 2, and names the cure on the same command',
            () => {
              expect(result.status).toBe(2);
              expect(result.stdout).toContain(
                '✋ ConstraintError: unstaged changes found at paths not set aside',
              );
              expect(result.stdout).toContain('README.md');
              expect(result.stdout).toContain(
                `rhx git.branch.rebase ${subcommand} --unstaged ignore`,
              );
              expect(result.stderr).toContain('ConstraintError');

              // git never acted: the conflict still waits, at the same HEAD
              expect(
                fs.existsSync(path.join(scene.workDir, '.git', 'rebase-merge')),
              ).toBe(true);
              expect(
                git({ cwd: scene.workDir, args: ['rev-parse', 'HEAD'] }),
              ).toBe(scene.headStopped);
              expect(
                readFile({ workDir: scene.workDir, file: 'README.md' }),
              ).toBe('# reef, fresh edit\n');
              expect(
                fs.existsSync(getStorePath({ workDir: scene.workDir })),
              ).toBe(true);
              expect(asStableOutput(result.stdout)).toMatchSnapshot();
            },
          );
        });

        when(`[t1] ${subcommand} --unstaged ignore`, () => {
          const result = useThen('it runs', async () =>
            runRebase({
              workDir: scene.workDir,
              args: [subcommand, '--unstaged', 'ignore'],
            }),
          );
          then(
            'the fresh edit joins the store, and every path reads back identical',
            () => {
              expect(result.status).toBe(0);
              expect(result.stdout).toContain('README.md');
              expect(
                readFile({ workDir: scene.workDir, file: 'README.md' }),
              ).toBe('# reef, fresh edit\n');
              expect(readLinkTarget({ workDir: scene.workDir })).toBe(
                LINK_TARGET_ABSENT,
              );
              expect(readFile({ workDir: scene.workDir, file: SETTINGS })).toBe(
                SETTINGS_DRIFT,
              );
              expect(
                fs.existsSync(getStorePath({ workDir: scene.workDir })),
              ).toBe(false);

              // continue lands the branch's work; abort restores the pre-rebase HEAD
              if (subcommand === 'continue')
                expect(
                  git({
                    cwd: scene.workDir,
                    args: ['diff', '--name-only', 'origin/main', 'HEAD'],
                  }),
                ).toBe('conflict.txt\nfeature.txt');
              if (subcommand === 'abort')
                expect(
                  git({ cwd: scene.workDir, args: ['rev-parse', 'HEAD'] }),
                ).toBe(scene.headBefore);
              expect(asStableOutput(result.stdout)).toMatchSnapshot();
            },
          );
        });
      },
    );
  });

  given(
    '[journey9] a session hook regenerates a held ambient file while the conflict waits; the clone settles via take',
    () => {
      const scene = useBeforeAll(async () =>
        setupJourney({
          conflict: true,
          mainChangesPackageJson: false,
          mainChangesLockfile: false,
        }),
      );
      afterAll(() =>
        fs.rmSync(scene.baseDir, { recursive: true, force: true }),
      );

      when('[t0] begin --mode apply --unstaged ignore', () => {
        const result = useThen('it runs', async () =>
          runRebase({
            workDir: scene.workDir,
            args: ['begin', '--mode', 'apply', '--unstaged', 'ignore'],
          }),
        );
        then('it stops on the conflict and holds the paths aside', () => {
          expect(result.status).toBe(1);
          expect(fs.existsSync(getStorePath({ workDir: scene.workDir }))).toBe(
            true,
          );
        });
      });

      when('[t1] take --whos theirs conflict.txt', () => {
        const result = useThen('it runs', async () => {
          // the session hook regenerates the held ambient file to new bytes
          fs.writeFileSync(
            path.join(scene.workDir, SETTINGS),
            '{ "hooks": "v3-session" }\n',
          );
          return runRebase({
            workDir: scene.workDir,
            args: ['take', '--whos', 'theirs', 'conflict.txt'],
          });
        });
        then('the conflict is settled and staged', () => {
          expect(result.status).toBe(0);
          expect(
            git({
              cwd: scene.workDir,
              args: ['diff', '--name-only', '--diff-filter=U'],
            }),
          ).toBe('');
          expect(asStableOutput(result.stdout)).toMatchSnapshot();
        });
      });

      when('[t2] continue', () => {
        const result = useThen('it runs', async () =>
          runRebase({ workDir: scene.workDir, args: ['continue'] }),
        );
        then(
          'the held copy supersedes the regeneration, which is kept and named, not lost',
          () => {
            expect(result.status).toBe(0);
            expect(result.stdout).toContain(
              'a fresh edit at these held paths was superseded by the held copy',
            );
            expect(readFile({ workDir: scene.workDir, file: SETTINGS })).toBe(
              SETTINGS_DRIFT,
            );
            expect(
              readFile({
                workDir: scene.workDir,
                file: `.git/git.branch.rebase.superseded/${SETTINGS}`,
              }),
            ).toBe('{ "hooks": "v3-session" }\n');
            expect(readLinkTarget({ workDir: scene.workDir })).toBe(
              LINK_TARGET_ABSENT,
            );
            expect(
              fs.existsSync(getStorePath({ workDir: scene.workDir })),
            ).toBe(false);
            expect(
              git({
                cwd: scene.workDir,
                args: ['diff', '--name-only', 'origin/main', 'HEAD'],
              }),
            ).toBe('conflict.txt\nfeature.txt');
            expect(asStableOutput(result.stdout)).toMatchSnapshot();
          },
        );
      });
    },
  );

  given(
    '[journey10] main released a held package.json, and the install rewrites it again while the conflict waits',
    () => {
      const scene = useBeforeAll(async () => {
        const setup = setupJourney({
          conflict: true,
          mainChangesPackageJson: true,
          mainChangesLockfile: false,
        });
        driftInstall({ workDir: setup.workDir });
        runRebase({
          workDir: setup.workDir,
          args: ['begin', '--mode', 'apply', '--unstaged', 'ignore'],
        });

        // the install runs again mid-conflict and rewrites the held package.json
        fs.writeFileSync(
          path.join(setup.workDir, 'package.json'),
          '{ "version": "1.1.0", "dev": "relinked-again" }\n',
        );
        fs.writeFileSync(path.join(setup.workDir, 'conflict.txt'), 'settled\n');
        git({ cwd: setup.workDir, args: ['add', 'conflict.txt'] });
        return setup;
      });
      afterAll(() =>
        fs.rmSync(scene.baseDir, { recursive: true, force: true }),
      );

      when('[t0] continue', () => {
        const result = useThen('it runs', async () =>
          runRebase({ workDir: scene.workDir, args: ['continue'] }),
        );
        then(
          "the held copy reads back, the fresh edit is kept, and main's change is flagged with its fix",
          () => {
            expect(result.status).toBe(0);
            expect(
              readFile({ workDir: scene.workDir, file: 'package.json' }),
            ).toBe(INSTALL_DRIFT_PACKAGE);
            expect(result.stdout).toContain(
              'a fresh edit at these held paths was superseded by the held copy',
            );
            expect(result.stdout).toContain('main also changed these paths');
            expect(
              readFile({
                workDir: scene.workDir,
                file: '.git/git.branch.rebase.superseded/package.json',
              }),
            ).toBe('{ "version": "1.1.0", "dev": "relinked-again" }\n');

            // the commit holds main's release; neither the held nor the fresh copy reaches the index
            expect(
              git({ cwd: scene.workDir, args: ['show', 'HEAD:package.json'] }),
            ).toBe(MAIN_PACKAGE_JSON);
            expect(
              git({
                cwd: scene.workDir,
                args: ['diff', '--cached', '--name-only'],
              }),
            ).toBe('');
            expect(
              fs.existsSync(getStorePath({ workDir: scene.workDir })),
            ).toBe(false);
            expect(asStableOutput(result.stdout)).toMatchSnapshot();
          },
        );
      });
    },
  );

  given('[journey12] a clean tree, no --unstaged flag', () => {
    const scene = useBeforeAll(async () => {
      const setup = setupJourney({
        conflict: false,
        mainChangesPackageJson: false,
        mainChangesLockfile: false,
      });

      // a tree with no drift: restore the ambient pair to its committed state
      git({ cwd: setup.workDir, args: ['checkout', '--', GROVE, SETTINGS] });
      return setup;
    });
    afterAll(() => fs.rmSync(scene.baseDir, { recursive: true, force: true }));

    when('[t0] begin --mode apply', () => {
      const result = useThen('it runs', async () =>
        runRebase({
          workDir: scene.workDir,
          args: ['begin', '--mode', 'apply'],
        }),
      );
      then('the rebase completes, with no set-aside and no store', () => {
        expect(result.status).toBe(0);
        expect(result.stdout).not.toContain('unstaged (set aside)');
        expect(
          git({
            cwd: scene.workDir,
            args: ['diff', '--name-only', 'origin/main', 'HEAD'],
          }),
        ).toBe('feature.txt');
        expect(
          git({ cwd: scene.workDir, args: ['status', '--porcelain'] }),
        ).toBe('');
        expect(fs.existsSync(getStorePath({ workDir: scene.workDir }))).toBe(
          false,
        );
        expect(asStableOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[journey13] each subcommand asked for --help', () => {
    // one when per subcommand: each help render ships in dist
    ['begin', 'continue', 'take', 'abort', 'lock'].forEach(
      (subcommand, index) => {
        when(`[t${index}] ${subcommand} --help`, () => {
          const result = useThen('it runs', async () =>
            runRebase({ workDir: process.cwd(), args: [subcommand, '--help'] }),
          );
          then('the built skill answers with its own usage, exit 0', () => {
            expect(result.status).toBe(0);
            expect(result.stdout).toContain(`git.branch.rebase ${subcommand}`);
            expect(result.stdout).toContain('usage');
            expect(asStableOutput(result.stdout)).toMatchSnapshot();
          });
        });
      },
    );
  });

  given(
    '[journey11] the held package.json is itself the conflict file; the clone settles it via take',
    () => {
      const scene = useBeforeAll(async () => {
        const setup = setupJourney({
          conflict: false,
          mainChangesPackageJson: true,
          mainChangesLockfile: false,
        });

        // the branch edits package.json too, so main's release bump conflicts with it
        commitFile({
          cwd: setup.workDir,
          file: 'package.json',
          content: '{ "version": "1.0.0", "reef": "feature" }\n',
          message: 'feat(reef): name the reef in package.json',
        });
        driftInstall({ workDir: setup.workDir });
        return setup;
      });
      afterAll(() =>
        fs.rmSync(scene.baseDir, { recursive: true, force: true }),
      );

      when('[t0] begin --mode apply --unstaged ignore', () => {
        const result = useThen('it runs', async () =>
          runRebase({
            workDir: scene.workDir,
            args: ['begin', '--mode', 'apply', '--unstaged', 'ignore'],
          }),
        );
        then(
          'it stops on package.json, with the install copy held aside',
          () => {
            expect(result.status).toBe(1);
            expect(result.stdout).toContain('package.json');
            expect(
              git({
                cwd: scene.workDir,
                args: ['diff', '--name-only', '--diff-filter=U'],
              }),
            ).toBe('package.json');
            expect(
              fs.existsSync(getStorePath({ workDir: scene.workDir })),
            ).toBe(true);
            expect(asStableOutput(result.stdout)).toMatchSnapshot();
          },
        );
      });

      when("[t1] take main's side (--whos ours in a rebase)", () => {
        const result = useThen('it runs', async () =>
          runRebase({
            workDir: scene.workDir,
            args: ['take', '--whos', 'ours', 'package.json'],
          }),
        );
        then('the conflict is settled and staged', () => {
          expect(result.status).toBe(0);
          expect(
            git({
              cwd: scene.workDir,
              args: ['diff', '--name-only', '--diff-filter=U'],
            }),
          ).toBe('');
          expect(asStableOutput(result.stdout)).toMatchSnapshot();
        });
      });

      when('[t2] continue', () => {
        const result = useThen('it runs', async () =>
          runRebase({ workDir: scene.workDir, args: ['continue'] }),
        );
        then(
          'the held install copy reads back over the taken version, and main is flagged with its fix',
          () => {
            expect(result.status).toBe(0);
            expect(
              readFile({ workDir: scene.workDir, file: 'package.json' }),
            ).toBe(INSTALL_DRIFT_PACKAGE);
            expect(readFile({ workDir: scene.workDir, file: LOCKFILE })).toBe(
              INSTALL_DRIFT_LOCKFILE,
            );
            expect(readLinkTarget({ workDir: scene.workDir })).toBe(
              LINK_TARGET_ABSENT,
            );
            expect(result.stdout).toContain('main also changed these paths');

            // the commit holds main's package.json, as taken; the install copy stays unstaged
            expect(
              git({
                cwd: scene.workDir,
                args: ['show', 'HEAD:package.json'],
              }),
            ).toBe(MAIN_PACKAGE_JSON);
            expect(
              git({ cwd: scene.workDir, args: ['show', `HEAD:${LOCKFILE}`] }),
            ).toBe(LOCKFILE_BASE.trim());
            expect(
              git({
                cwd: scene.workDir,
                args: ['diff', '--cached', '--name-only'],
              }),
            ).toBe('');
            expect(git({ cwd: scene.workDir, args: ['stash', 'list'] })).toBe(
              '',
            );
            expect(
              fs.existsSync(getStorePath({ workDir: scene.workDir })),
            ).toBe(false);
            expect(asStableOutput(result.stdout)).toMatchSnapshot();
          },
        );
      });
    },
  );
});
