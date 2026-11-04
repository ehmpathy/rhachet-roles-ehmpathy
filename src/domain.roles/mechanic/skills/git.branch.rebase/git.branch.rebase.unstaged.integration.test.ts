import { spawnSync } from 'child_process';
import * as fs from 'fs';
import { MalfunctionError } from 'helpful-errors';
import * as os from 'os';
import * as path from 'path';
import { given, then, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

/**
 * .what = integration tests for --unstaged ignore across begin, continue, abort
 * .why = a clone tree always holds unstaged ambient files it must never commit;
 *        the rebase must set them aside (never via the shared stash) and put each
 *        back byte for byte and link for link, by every exit
 */

const DISPATCHER_PATH = path.join(__dirname, 'git.branch.rebase.sh');

// the ambient files a clone tree holds unstaged
const SETTINGS = 'settings.of.repo.json';
const GROVE = 'settings.of.grove.json';
const KEPT_DIR = 'git.branch.rebase.superseded';
const LINK_TARGET_COMMITTED = '/home/seaturtle/.claude/settings.json';
const LINK_TARGET_ABSENT = '/nonexistent/turtle/.claude/settings.json';
const LINK_TARGET_FRESH = '/nonexistent/turtle/.claude/settings.fresh.json';

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
 * .what = commit one file with given content on the current branch
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
 * .what = create a bare origin and a work clone of it
 * .why = every scenario rebases against a real remote
 */
const setupOrigin = (): { workDir: string; baseDir: string } => {
  const baseDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'git-rebase-unstaged-'),
  );
  const bareDir = path.join(baseDir, 'origin.git');
  const workDir = path.join(baseDir, 'work');
  fs.mkdirSync(bareDir);
  git({ cwd: bareDir, args: ['init', '--bare', '-b', 'main'] });
  git({ cwd: baseDir, args: ['clone', bareDir, workDir] });
  configureTestGitUser({ cwd: workDir });
  git({ cwd: workDir, args: ['symbolic-ref', 'HEAD', 'refs/heads/main'] });
  return { workDir, baseDir };
};

/**
 * .what = commit the base tree on main and push it
 * .why = the ambient file, the ambient link, and the files a scenario edits
 */
const commitBase = (input: { workDir: string }): void => {
  const { workDir } = input;
  fs.writeFileSync(path.join(workDir, 'README.md'), '# reef\n');
  fs.writeFileSync(path.join(workDir, SETTINGS), '{ "hooks": "v1" }\n');
  fs.writeFileSync(
    path.join(workDir, 'package.json'),
    '{ "version": "1.0.0" }\n',
  );
  fs.writeFileSync(path.join(workDir, 'conflict.txt'), 'base\n');
  fs.writeFileSync(path.join(workDir, 'conflict2.txt'), 'base\n');
  fs.symlinkSync(LINK_TARGET_COMMITTED, path.join(workDir, GROVE));
  git({ cwd: workDir, args: ['add', '-A'] });
  git({ cwd: workDir, args: ['commit', '-m', 'init: initial commit'] });
  git({ cwd: workDir, args: ['push', '-u', 'origin', 'main'] });
};

/**
 * .what = branch feat/turtle off main with its commits
 * .why = the commits the rebase replays; the conflict ones meet main's edits
 */
const commitFeatureBranch = (input: {
  workDir: string;
  conflict: boolean;
  conflictTwice: boolean;
  featureChangesPackageJson: boolean;
}): void => {
  const { workDir } = input;
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
  if (input.conflictTwice)
    commitFile({
      cwd: workDir,
      file: 'conflict2.txt',
      content: 'feature version\n',
      message: 'feat(reef): edit second conflict file',
    });
  if (input.featureChangesPackageJson)
    commitFile({
      cwd: workDir,
      file: 'package.json',
      content: '{ "version": "1.0.1-feature" }\n',
      message: 'feat(reef): bump package version',
    });
};

/**
 * .what = move main ahead of feat/turtle and push it
 * .why = the commits the rebase lands on; flags pick which paths main touches
 */
const commitMainAhead = (input: {
  workDir: string;
  conflict: boolean;
  conflictTwice: boolean;
  mainChangesPackageJson: boolean;
  mainAddsCollideFile: boolean;
  mainDeletesReadme: boolean;
}): void => {
  const { workDir } = input;
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
  if (input.conflictTwice)
    commitFile({
      cwd: workDir,
      file: 'conflict2.txt',
      content: 'main version\n',
      message: 'chore(reef): main edits second conflict file',
    });
  if (input.mainChangesPackageJson)
    commitFile({
      cwd: workDir,
      file: 'package.json',
      content: '{ "version": "1.1.0" }\n',
      message: 'chore(release): v1.1.0',
    });
  if (input.mainAddsCollideFile)
    commitFile({
      cwd: workDir,
      file: 'collide.txt',
      content: 'main collide\n',
      message: 'chore(reef): add collide file',
    });
  if (input.mainDeletesReadme) {
    git({ cwd: workDir, args: ['rm', '-q', 'README.md'] });
    git({ cwd: workDir, args: ['commit', '-m', 'chore(reef): drop readme'] });
  }
  git({ cwd: workDir, args: ['push', 'origin', 'main'] });
};

/**
 * .what = grant push permission in a work tree
 * .why = begin refuses with no push grant
 */
const setMeterGrant = (input: { workDir: string }): void => {
  fs.mkdirSync(path.join(input.workDir, '.meter'), { recursive: true });
  fs.writeFileSync(
    path.join(input.workDir, '.meter', 'git.commit.uses.jsonc'),
    JSON.stringify({ uses: 5, push: 'allow' }, null, 2),
  );
};

/**
 * .what = setup a work repo with a real bare origin, a feature branch, and main moved ahead
 * .why = --unstaged ignore must run a real rebase to prove the round trip
 */
const setupScenario = (input: {
  conflict: boolean;
  conflictTwice?: boolean;
  mainChangesPackageJson?: boolean;
  mainAddsCollideFile?: boolean;
  featureChangesPackageJson?: boolean;
  mainDeletesReadme?: boolean;
}): { workDir: string; baseDir: string } => {
  const { workDir, baseDir } = setupOrigin();
  const conflictTwice = input.conflictTwice ?? false;
  commitBase({ workDir });
  commitFeatureBranch({
    workDir,
    conflict: input.conflict,
    conflictTwice,
    featureChangesPackageJson: input.featureChangesPackageJson ?? false,
  });
  commitMainAhead({
    workDir,
    conflict: input.conflict,
    conflictTwice,
    mainChangesPackageJson: input.mainChangesPackageJson ?? false,
    mainAddsCollideFile: input.mainAddsCollideFile ?? false,
    mainDeletesReadme: input.mainDeletesReadme ?? false,
  });
  git({ cwd: workDir, args: ['checkout', 'feat/turtle'] });
  setMeterGrant({ workDir });
  fs.writeFileSync(path.join(workDir, '.git', 'info', 'exclude'), '.meter\n');
  return { workDir, baseDir };
};

/**
 * .what = drift the ambient files the way a clone tree holds them
 * .why = a retargeted link whose target is absent, plus a regenerated file
 */
const driftAmbient = (input: { workDir: string }): void => {
  fs.unlinkSync(path.join(input.workDir, GROVE));
  fs.symlinkSync(LINK_TARGET_ABSENT, path.join(input.workDir, GROVE));
  fs.writeFileSync(
    path.join(input.workDir, SETTINGS),
    '{ "hooks": "v2-regenerated" }\n',
  );
};

/**
 * .what = install an executable git hook in the work repo
 * .why = a hook lets a test place git in a state no flag can reach
 */
const setGitHook = (input: {
  workDir: string;
  hook: string;
  body: string;
}): void => {
  const hookPath = path.join(input.workDir, '.git', 'hooks', input.hook);
  fs.writeFileSync(hookPath, `#!/bin/sh\n${input.body}\n`);
  fs.chmodSync(hookPath, 0o755);
};

/**
 * .what = run the skill via its dispatcher
 * .why = tests exercise the real entry point
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

const BEGIN_APPLY_IGNORE = ['begin', '--mode', 'apply', '--unstaged', 'ignore'];

/**
 * .what = stabilize output for snapshots
 * .why = temp paths and commit hashes change each run; coreutils error prose
 *        differs between gnu and bsd hosts, so only the tool name is kept
 */
const asStableOutput = (output: string): string =>
  output
    .replace(/\/tmp\/git-rebase-unstaged-[^/\s]+/g, '/tmp/TEST_REPO')
    .replace(/\b[0-9a-f]{7,40}\b/g, 'HASH123')
    .replace(/\[K/g, '')
    .replace(/[‘’]/g, "'")
    .replace(/^\s*│\s*hint:.*\n/gm, '')
    .replace(/^\s*│\s*Could not apply .*\n/gm, '')
    .replace(
      /(?:fatal|error): The pre-rebase hook/g,
      'fatal: The pre-rebase hook',
    )
    .replace(
      /Another git process seems to be .*(?:\n[ │]*(?:an editor opened|are terminated|may have crashed|remove the file manually).*)*/g,
      'Another git process holds the index lock',
    )
    .replace(
      /(─ (?:error: )?|│ {2})(mkdir|cp|rm): .*$/gm,
      '$1$2: <host error text>',
    );

const getStorePath = (input: { workDir: string }): string =>
  path.join(input.workDir, '.git', 'git.branch.rebase.aside');

const readLinkTarget = (input: { workDir: string; file: string }): string =>
  fs.readlinkSync(path.join(input.workDir, input.file));

const isLink = (input: { workDir: string; file: string }): boolean =>
  fs.lstatSync(path.join(input.workDir, input.file)).isSymbolicLink();

const readFile = (input: { workDir: string; file: string }): string =>
  fs.readFileSync(path.join(input.workDir, input.file), 'utf-8');

describe('git.branch.rebase --unstaged', () => {
  given(
    '[case1] a tree with an unstaged broken symlink retarget and an unstaged file edit (the clamp)',
    () => {
      when('[t0] begin --mode apply --unstaged ignore', () => {
        then('the rebase completes and both paths read back identical', () => {
          const { workDir, baseDir } = setupScenario({ conflict: false });
          try {
            driftAmbient({ workDir });
            const result = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

            // the rebase completed onto origin/main
            expect(result.status).toBe(0);
            expect(
              git({
                cwd: workDir,
                args: ['merge-base', '--is-ancestor', 'origin/main', 'HEAD'],
              }),
            ).toBe('');

            // the link is still a link, to the same absent target
            expect(isLink({ workDir, file: GROVE })).toBe(true);
            expect(readLinkTarget({ workDir, file: GROVE })).toBe(
              LINK_TARGET_ABSENT,
            );
            expect(fs.existsSync(LINK_TARGET_ABSENT)).toBe(false);

            // the file reads back byte for byte
            expect(readFile({ workDir, file: SETTINGS })).toBe(
              '{ "hooks": "v2-regenerated" }\n',
            );

            // no unstaged edit entered a rebased commit
            const rebasedFiles = git({
              cwd: workDir,
              args: ['diff', '--name-only', 'origin/main', 'HEAD'],
            });
            expect(rebasedFiles).toBe('feature.txt');

            // the store is gone, and the stash stack was never touched
            expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
            expect(git({ cwd: workDir, args: ['stash', 'list'] })).toBe('');

            expect(result.stdout).toContain('set aside, put back');
            expect(asStableOutput(result.stdout)).toMatchSnapshot();
          } finally {
            fs.rmSync(baseDir, { recursive: true, force: true });
          }
        });
      });

      when('[t1] begin --mode apply with no --unstaged flag', () => {
        then(
          'it refuses, exit 2, names both paths and the cure, on both streams',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: false });
            try {
              driftAmbient({ workDir });
              const headBefore = git({
                cwd: workDir,
                args: ['rev-parse', 'HEAD'],
              });
              const result = runRebase({
                workDir,
                args: ['begin', '--mode', 'apply'],
              });

              expect(result.status).toBe(2);
              expect(result.stdout).toContain(
                '✋ ConstraintError: unstaged changes found',
              );
              expect(result.stdout).toContain(GROVE);
              expect(result.stdout).toContain(SETTINGS);
              // the cure keeps the mode the caller ran, so a paste applies, not plans
              expect(result.stdout).toContain(
                'rhx git.branch.rebase begin --mode apply --unstaged ignore',
              );
              expect(result.stdout).not.toContain('stash');
              expect(result.stderr).toContain(
                '✋ ConstraintError: unstaged changes found',
              );

              // tree and HEAD untouched
              expect(git({ cwd: workDir, args: ['rev-parse', 'HEAD'] })).toBe(
                headBefore,
              );
              expect(readLinkTarget({ workDir, file: GROVE })).toBe(
                LINK_TARGET_ABSENT,
              );
              expect(asStableOutput(result.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      });
    },
  );

  given('[case2] a tree with unstaged edits', () => {
    when('[t0] begin --unstaged include', () => {
      then('it refuses, exit 2, and names the commit-first cure', () => {
        const { workDir, baseDir } = setupScenario({ conflict: false });
        try {
          driftAmbient({ workDir });
          const result = runRebase({
            workDir,
            args: ['begin', '--mode', 'apply', '--unstaged', 'include'],
          });
          expect(result.status).toBe(2);
          expect(result.stdout).toContain(
            '--unstaged include cannot apply to a rebase',
          );
          expect(result.stdout).toContain('git.commit.set');
          expect(result.stderr).toContain('ConstraintError');
          expect(asStableOutput(result.stdout)).toMatchSnapshot();
        } finally {
          fs.rmSync(baseDir, { recursive: true, force: true });
        }
      });
    });

    when('[t1] begin --unstaged ignore in plan mode', () => {
      then('it lists the paths it would set aside and touches naught', () => {
        const { workDir, baseDir } = setupScenario({ conflict: false });
        try {
          driftAmbient({ workDir });
          const result = runRebase({
            workDir,
            args: ['begin', '--unstaged', 'ignore'],
          });
          expect(result.status).toBe(0);
          expect(result.stdout).toContain('would set aside, then put back');
          expect(result.stdout).toContain(GROVE);
          expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
          expect(readLinkTarget({ workDir, file: GROVE })).toBe(
            LINK_TARGET_ABSENT,
          );
          expect(asStableOutput(result.stdout)).toMatchSnapshot();
        } finally {
          fs.rmSync(baseDir, { recursive: true, force: true });
        }
      });
    });

    when('[t2] begin --unstaged bogus', () => {
      then('it refuses the value, exit 2', () => {
        const { workDir, baseDir } = setupScenario({ conflict: false });
        try {
          const result = runRebase({
            workDir,
            args: ['begin', '--unstaged', 'bogus'],
          });
          expect(result.status).toBe(2);
          expect(result.stdout).toContain(
            "--unstaged must be 'ignore' or 'include'",
          );
          expect(asStableOutput(result.stdout)).toMatchSnapshot();
        } finally {
          fs.rmSync(baseDir, { recursive: true, force: true });
        }
      });
    });

    when('[t3] continue --unstaged include', () => {
      then('it refuses the value, exit 2: continue takes ignore only', () => {
        const { workDir, baseDir } = setupScenario({ conflict: false });
        try {
          const cont = runRebase({
            workDir,
            args: ['continue', '--unstaged', 'include'],
          });
          expect(cont.status).toBe(2);
          expect(cont.stdout).toContain('--unstaged');
          expect(cont.stdout).toContain('ignore');
          expect(asStableOutput(cont.stdout)).toMatchSnapshot();
        } finally {
          fs.rmSync(baseDir, { recursive: true, force: true });
        }
      });
    });

    when('[t4] abort --unstaged include', () => {
      then('it refuses the value, exit 2: abort takes ignore only', () => {
        const { workDir, baseDir } = setupScenario({ conflict: false });
        try {
          const abort = runRebase({
            workDir,
            args: ['abort', '--unstaged', 'include'],
          });
          expect(abort.status).toBe(2);
          expect(abort.stdout).toContain('--unstaged');
          expect(abort.stdout).toContain('ignore');
          expect(asStableOutput(abort.stdout)).toMatchSnapshot();
        } finally {
          fs.rmSync(baseDir, { recursive: true, force: true });
        }
      });
    });

    when('[t5] begin --help', () => {
      then('it names --unstaged ignore and shows an example', () => {
        const { workDir, baseDir } = setupScenario({ conflict: false });
        try {
          const begin = runRebase({ workDir, args: ['begin', '--help'] });
          expect(begin.status).toBe(0);
          expect(begin.stdout).toContain(
            'rhx git.branch.rebase begin --mode apply --unstaged ignore',
          );
          expect(begin.stdout).toContain('refused when unstaged edits exist');
          expect(begin.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(baseDir, { recursive: true, force: true });
        }
      });
    });

    when('[t6] continue --help', () => {
      then('it names --unstaged ignore and shows an example', () => {
        const { workDir, baseDir } = setupScenario({ conflict: false });
        try {
          const cont = runRebase({ workDir, args: ['continue', '--help'] });
          expect(cont.status).toBe(0);
          expect(cont.stdout).toContain('--unstaged ignore');
          expect(cont.stdout).toContain(
            'rhx git.branch.rebase continue --unstaged ignore',
          );
          expect(cont.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(baseDir, { recursive: true, force: true });
        }
      });
    });

    when('[t7] abort --help', () => {
      then('it names --unstaged ignore and shows an example', () => {
        const { workDir, baseDir } = setupScenario({ conflict: false });
        try {
          const abort = runRebase({ workDir, args: ['abort', '--help'] });
          expect(abort.status).toBe(0);
          expect(abort.stdout).toContain(
            'rhx git.branch.rebase abort --unstaged ignore',
          );
          expect(abort.stdout).toMatchSnapshot();
        } finally {
          fs.rmSync(baseDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case3] a tree with staged content', () => {
    when('[t0] begin --unstaged ignore', () => {
      then('it refuses before any set-aside, exit 2', () => {
        const { workDir, baseDir } = setupScenario({ conflict: false });
        try {
          fs.writeFileSync(path.join(workDir, 'README.md'), '# reef staged\n');
          git({ cwd: workDir, args: ['add', 'README.md'] });
          const result = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });
          expect(result.status).toBe(2);
          expect(result.stdout).toContain(
            '✋ ConstraintError: staged changes found',
          );
          expect(result.stdout).toContain('README.md');
          expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
          expect(
            git({ cwd: workDir, args: ['diff', '--cached', '--name-only'] }),
          ).toBe('README.md');
          expect(asStableOutput(result.stdout)).toMatchSnapshot();
        } finally {
          fs.rmSync(baseDir, { recursive: true, force: true });
        }
      });
    });
  });

  given('[case4] a conflicted rebase with ambient drift held aside', () => {
    when(
      '[t0] begin stops on the conflict, then continue after the conflict is settled',
      () => {
        then('the rebase completes and both paths read back identical', () => {
          const { workDir, baseDir } = setupScenario({ conflict: true });
          try {
            driftAmbient({ workDir });
            const stop = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });
            expect(stop.status).toBe(1);
            expect(stop.stdout).toContain(
              'held aside until continue or abort puts them back',
            );
            expect(stop.stdout).toContain('rhx git.branch.rebase continue');
            expect(stop.stdout).toContain('rhx git.branch.rebase abort');
            expect(fs.existsSync(getStorePath({ workDir }))).toBe(true);
            expect(asStableOutput(stop.stdout)).toMatchSnapshot();

            fs.writeFileSync(path.join(workDir, 'conflict.txt'), 'settled\n');
            git({ cwd: workDir, args: ['add', 'conflict.txt'] });
            const done = runRebase({ workDir, args: ['continue'] });

            expect(done.status).toBe(0);
            expect(isLink({ workDir, file: GROVE })).toBe(true);
            expect(readLinkTarget({ workDir, file: GROVE })).toBe(
              LINK_TARGET_ABSENT,
            );
            expect(readFile({ workDir, file: SETTINGS })).toBe(
              '{ "hooks": "v2-regenerated" }\n',
            );
            expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
            expect(
              git({
                cwd: workDir,
                args: ['diff', '--name-only', 'origin/main', 'HEAD'],
              }),
            ).toBe('conflict.txt\nfeature.txt');
            expect(asStableOutput(done.stdout)).toMatchSnapshot();
          } finally {
            fs.rmSync(baseDir, { recursive: true, force: true });
          }
        });
      },
    );

    when('[t1] begin stops on the conflict, then abort', () => {
      then(
        'the branch returns to its pre-rebase head and both paths read back identical',
        () => {
          const { workDir, baseDir } = setupScenario({ conflict: true });
          try {
            driftAmbient({ workDir });
            const headBefore = git({
              cwd: workDir,
              args: ['rev-parse', 'HEAD'],
            });
            runRebase({ workDir, args: BEGIN_APPLY_IGNORE });
            const done = runRebase({ workDir, args: ['abort'] });

            expect(done.status).toBe(0);
            expect(git({ cwd: workDir, args: ['rev-parse', 'HEAD'] })).toBe(
              headBefore,
            );
            expect(readLinkTarget({ workDir, file: GROVE })).toBe(
              LINK_TARGET_ABSENT,
            );
            expect(readFile({ workDir, file: SETTINGS })).toBe(
              '{ "hooks": "v2-regenerated" }\n',
            );
            expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
            expect(asStableOutput(done.stdout)).toMatchSnapshot();
          } finally {
            fs.rmSync(baseDir, { recursive: true, force: true });
          }
        },
      );
    });

    when(
      '[t2] a held path is edited again while the conflict waits, then continue',
      () => {
        then(
          'the held copy supersedes the fresh edit, and the output names it',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: true });
            try {
              driftAmbient({ workDir });
              runRebase({ workDir, args: BEGIN_APPLY_IGNORE });
              fs.writeFileSync(
                path.join(workDir, SETTINGS),
                '{ "hooks": "v3-fresh" }\n',
              );
              fs.writeFileSync(path.join(workDir, 'conflict.txt'), 'settled\n');
              git({ cwd: workDir, args: ['add', 'conflict.txt'] });
              const done = runRebase({ workDir, args: ['continue'] });

              expect(done.status).toBe(0);
              expect(readFile({ workDir, file: SETTINGS })).toBe(
                '{ "hooks": "v2-regenerated" }\n',
              );
              expect(done.stdout).toContain('superseded by the held copy');
              expect(done.stdout).toContain(SETTINGS);
              expect(asStableOutput(done.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      },
    );

    when(
      '[t3] a path NOT held is edited while the conflict waits, then continue',
      () => {
        then(
          'continue refuses with the cure; with --unstaged ignore it completes and keeps the edit',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: true });
            try {
              driftAmbient({ workDir });
              runRebase({ workDir, args: BEGIN_APPLY_IGNORE });
              fs.writeFileSync(
                path.join(workDir, 'README.md'),
                '# reef fresh\n',
              );
              fs.writeFileSync(path.join(workDir, 'conflict.txt'), 'settled\n');
              git({ cwd: workDir, args: ['add', 'conflict.txt'] });

              const refused = runRebase({ workDir, args: ['continue'] });
              expect(refused.status).toBe(2);
              expect(refused.stdout).toContain('README.md');
              expect(refused.stdout).toContain(
                'rhx git.branch.rebase continue --unstaged ignore',
              );
              expect(refused.stderr).toContain('ConstraintError');
              expect(readFile({ workDir, file: 'README.md' })).toBe(
                '# reef fresh\n',
              );
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(true); // held copies stay aside
              expect(asStableOutput(refused.stdout)).toMatchSnapshot();

              const done = runRebase({
                workDir,
                args: ['continue', '--unstaged', 'ignore'],
              });
              expect(done.status).toBe(0);
              expect(readFile({ workDir, file: 'README.md' })).toBe(
                '# reef fresh\n',
              );
              expect(readFile({ workDir, file: SETTINGS })).toBe(
                '{ "hooks": "v2-regenerated" }\n',
              );
              expect(readLinkTarget({ workDir, file: GROVE })).toBe(
                LINK_TARGET_ABSENT,
              );
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
              expect(done.stdout).toContain('README.md');
              expect(asStableOutput(done.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      },
    );

    when(
      '[t4] a path NOT held is edited while the conflict waits, then abort',
      () => {
        then(
          'abort refuses with the cure; with --unstaged ignore it restores and keeps the edit',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: true });
            try {
              driftAmbient({ workDir });
              const headBefore = git({
                cwd: workDir,
                args: ['rev-parse', 'HEAD'],
              });
              runRebase({ workDir, args: BEGIN_APPLY_IGNORE });
              fs.writeFileSync(
                path.join(workDir, 'README.md'),
                '# reef fresh\n',
              );

              const refused = runRebase({ workDir, args: ['abort'] });
              expect(refused.status).toBe(2);
              expect(refused.stdout).toContain(
                'rhx git.branch.rebase abort --unstaged ignore',
              );
              // refused before git rebase --abort ran: the rebase still waits
              expect(
                fs.existsSync(path.join(workDir, '.git', 'rebase-merge')),
              ).toBe(true);
              expect(readFile({ workDir, file: 'README.md' })).toBe(
                '# reef fresh\n',
              );
              expect(asStableOutput(refused.stdout)).toMatchSnapshot();

              const done = runRebase({
                workDir,
                args: ['abort', '--unstaged', 'ignore'],
              });
              expect(done.status).toBe(0);
              expect(git({ cwd: workDir, args: ['rev-parse', 'HEAD'] })).toBe(
                headBefore,
              );
              expect(readFile({ workDir, file: 'README.md' })).toBe(
                '# reef fresh\n',
              );
              expect(readFile({ workDir, file: SETTINGS })).toBe(
                '{ "hooks": "v2-regenerated" }\n',
              );
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
              expect(done.stdout).toContain('README.md');
              expect(asStableOutput(done.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      },
    );
  });

  given('[case5] main changed a path that also holds an unstaged edit', () => {
    when('[t0] begin --mode apply --unstaged ignore', () => {
      then(
        'the held copy reads back, and the output flags the path with its fix',
        () => {
          const { workDir, baseDir } = setupScenario({
            conflict: false,
            mainChangesPackageJson: true,
          });
          try {
            fs.writeFileSync(
              path.join(workDir, 'package.json'),
              '{ "version": "1.0.0-upgrade" }\n',
            );
            const result = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });
            expect(result.status).toBe(0);
            expect(readFile({ workDir, file: 'package.json' })).toBe(
              '{ "version": "1.0.0-upgrade" }\n',
            );
            expect(result.stdout).toContain('main also changed these paths');
            expect(result.stdout).toContain(
              'git checkout HEAD -- package.json',
            );
            expect(asStableOutput(result.stdout)).toMatchSnapshot();
          } finally {
            fs.rmSync(baseDir, { recursive: true, force: true });
          }
        },
      );
    });
  });

  given(
    '[case6] paths still set aside with no rebase in progress (a prior run died)',
    () => {
      when('[t0] begin, continue, then abort', () => {
        then(
          'begin and continue refuse and name abort; abort puts the paths back',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: true });
            try {
              driftAmbient({ workDir });
              runRebase({ workDir, args: BEGIN_APPLY_IGNORE });
              git({ cwd: workDir, args: ['rebase', '--abort'] }); // the skill never ran its put-back

              const begin = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });
              expect(begin.status).toBe(2);
              expect(begin.stdout).toContain(
                'paths are still set aside from a prior run',
              );
              expect(begin.stdout).toContain('rhx git.branch.rebase abort');
              expect(asStableOutput(begin.stdout)).toMatchSnapshot();

              const plan = runRebase({
                workDir,
                args: ['begin', '--unstaged', 'ignore'],
              });
              expect(plan.status).toBe(2);
              expect(plan.stdout).toContain(
                'paths are still set aside from a prior run',
              );

              const cont = runRebase({ workDir, args: ['continue'] });
              expect(cont.status).toBe(2);
              expect(cont.stdout).toContain('rhx git.branch.rebase abort');
              expect(asStableOutput(cont.stdout)).toMatchSnapshot();

              const abort = runRebase({ workDir, args: ['abort'] });
              expect(abort.status).toBe(0);
              expect(readLinkTarget({ workDir, file: GROVE })).toBe(
                LINK_TARGET_ABSENT,
              );
              expect(readFile({ workDir, file: SETTINGS })).toBe(
                '{ "hooks": "v2-regenerated" }\n',
              );
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
              expect(asStableOutput(abort.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      });
    },
  );

  given(
    '[case7] the rebase fails to start (an untracked file sits where main adds one)',
    () => {
      when('[t0] begin --mode apply --unstaged ignore', () => {
        then(
          'it puts the held paths back at once, deletes the store, and refuses as a constraint (exit 2)',
          () => {
            const { workDir, baseDir } = setupScenario({
              conflict: false,
              mainAddsCollideFile: true,
            });
            try {
              driftAmbient({ workDir });
              fs.writeFileSync(
                path.join(workDir, 'collide.txt'),
                'local untracked\n',
              );
              const result = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });
              expect(result.status).toBe(2);
              expect(result.stdout).toContain(
                '✋ ConstraintError: rebase blocked: a local file sits where main writes one',
              );
              expect(result.stdout).toContain('collide.txt');
              expect(result.stderr).toContain('ConstraintError');
              expect(readLinkTarget({ workDir, file: GROVE })).toBe(
                LINK_TARGET_ABSENT,
              );
              expect(readFile({ workDir, file: SETTINGS })).toBe(
                '{ "hooks": "v2-regenerated" }\n',
              );
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
              expect(asStableOutput(result.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      });
    },
  );

  given('[case8] an unstaged deletion and an unstaged mode change', () => {
    when('[t0] begin --mode apply --unstaged ignore', () => {
      then('the deletion stays absent and the mode reads back', () => {
        const { workDir, baseDir } = setupScenario({ conflict: false });
        try {
          fs.unlinkSync(path.join(workDir, 'README.md'));
          fs.chmodSync(path.join(workDir, 'package.json'), 0o755);
          const result = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });
          expect(result.status).toBe(0);
          expect(fs.existsSync(path.join(workDir, 'README.md'))).toBe(false);
          expect(
            fs.statSync(path.join(workDir, 'package.json')).mode & 0o777,
          ).toBe(0o755);
          expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
          expect(asStableOutput(result.stdout)).toMatchSnapshot();
        } finally {
          fs.rmSync(baseDir, { recursive: true, force: true });
        }
      });
    });
  });

  given(
    '[case9] main changed a held path, the rebase stops, and the path is edited again',
    () => {
      when('[t0] the conflict is settled, then continue', () => {
        then(
          'the held copy reads back; the output names the superseded edit and flags main',
          () => {
            const { workDir, baseDir } = setupScenario({
              conflict: true,
              mainChangesPackageJson: true,
            });
            try {
              fs.writeFileSync(
                path.join(workDir, 'package.json'),
                '{ "version": "1.0.0-upgrade" }\n',
              );
              const stop = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });
              expect(stop.status).toBe(1);
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(true);

              // a session hook regenerates the held path while the conflict waits
              fs.writeFileSync(
                path.join(workDir, 'package.json'),
                '{ "version": "1.0.0-fresh" }\n',
              );
              fs.writeFileSync(path.join(workDir, 'conflict.txt'), 'settled\n');
              git({ cwd: workDir, args: ['add', 'conflict.txt'] });
              const done = runRebase({ workDir, args: ['continue'] });

              expect(done.status).toBe(0);
              expect(readFile({ workDir, file: 'package.json' })).toBe(
                '{ "version": "1.0.0-upgrade" }\n',
              );
              expect(done.stdout).toContain('superseded by the held copy');
              expect(done.stdout).toContain('main also changed these paths');
              expect(done.stdout).toContain('package.json');
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
              expect(asStableOutput(done.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      });

      when('[t1] abort instead', () => {
        then(
          'the held copy reads back, and the output names the superseded edit',
          () => {
            const { workDir, baseDir } = setupScenario({
              conflict: true,
              mainChangesPackageJson: true,
            });
            try {
              fs.writeFileSync(
                path.join(workDir, 'package.json'),
                '{ "version": "1.0.0-upgrade" }\n',
              );
              const headBefore = git({
                cwd: workDir,
                args: ['rev-parse', 'HEAD'],
              });
              runRebase({ workDir, args: BEGIN_APPLY_IGNORE });
              fs.writeFileSync(
                path.join(workDir, 'package.json'),
                '{ "version": "1.0.0-fresh" }\n',
              );
              const done = runRebase({ workDir, args: ['abort'] });

              expect(done.status).toBe(0);
              expect(git({ cwd: workDir, args: ['rev-parse', 'HEAD'] })).toBe(
                headBefore,
              );
              expect(readFile({ workDir, file: 'package.json' })).toBe(
                '{ "version": "1.0.0-upgrade" }\n',
              );
              expect(done.stdout).toContain('superseded by the held copy');
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
              expect(asStableOutput(done.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      });
    },
  );

  given('[case10] the store cannot be created (a file blocks its path)', () => {
    when('[t0] begin --mode apply --unstaged ignore', () => {
      then(
        'it fails loud as a malfunction, exit 1, and touches no path',
        () => {
          const { workDir, baseDir } = setupScenario({ conflict: false });
          try {
            driftAmbient({ workDir });
            fs.writeFileSync(getStorePath({ workDir }), 'not a dir\n');
            const headBefore = git({
              cwd: workDir,
              args: ['rev-parse', 'HEAD'],
            });
            const result = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

            expect(result.status).toBe(1);
            expect(result.stdout).toContain(
              '💥 MalfunctionError: cannot create the set-aside store',
            );
            expect(result.stderr).toContain('MalfunctionError');
            expect(result.stdout).not.toContain('another run holds paths');
            expect(git({ cwd: workDir, args: ['rev-parse', 'HEAD'] })).toBe(
              headBefore,
            );
            expect(readLinkTarget({ workDir, file: GROVE })).toBe(
              LINK_TARGET_ABSENT,
            );
            expect(readFile({ workDir, file: SETTINGS })).toBe(
              '{ "hooks": "v2-regenerated" }\n',
            );
            expect(asStableOutput(result.stdout)).toMatchSnapshot();
          } finally {
            fs.rmSync(baseDir, { recursive: true, force: true });
          }
        },
      );
    });
  });

  given(
    '[case11] a put-back fails partway (a held copy cannot be read back)',
    () => {
      when(
        '[t0] continue completes the rebase, then abort recovers once the copy is restored',
        () => {
          then(
            'continue fails loud with the path and its error, keeps the store; abort puts back only what is left',
            () => {
              const { workDir, baseDir } = setupScenario({ conflict: true });
              try {
                driftAmbient({ workDir });
                runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

                // the held copy of one path is moved off while the conflict waits
                const heldCopy = path.join(
                  getStorePath({ workDir }),
                  'tree',
                  SETTINGS,
                );
                fs.renameSync(heldCopy, `${heldCopy}.moved`);
                fs.writeFileSync(
                  path.join(workDir, 'conflict.txt'),
                  'settled\n',
                );
                git({ cwd: workDir, args: ['add', 'conflict.txt'] });
                const failed = runRebase({ workDir, args: ['continue'] });

                expect(failed.status).toBe(1);
                expect(failed.stdout).toContain(
                  '💥 MalfunctionError: put-back failed for these paths',
                );
                expect(failed.stdout).toContain(SETTINGS);
                expect(failed.stdout).toContain('error: ');
                expect(failed.stderr).toContain('MalfunctionError');
                expect(fs.existsSync(getStorePath({ workDir }))).toBe(true);
                expect(asStableOutput(failed.stdout)).toMatchSnapshot();

                // the other path was put back; a human edits it after the failed run
                expect(readLinkTarget({ workDir, file: GROVE })).toBe(
                  LINK_TARGET_ABSENT,
                );
                fs.unlinkSync(path.join(workDir, GROVE));
                fs.symlinkSync(LINK_TARGET_FRESH, path.join(workDir, GROVE));

                // restore the copy, then recover
                fs.renameSync(`${heldCopy}.moved`, heldCopy);
                const recovered = runRebase({ workDir, args: ['abort'] });

                expect(recovered.status).toBe(0);
                expect(readFile({ workDir, file: SETTINGS })).toBe(
                  '{ "hooks": "v2-regenerated" }\n',
                );
                // a path already put back is skipped: the later edit stands
                expect(readLinkTarget({ workDir, file: GROVE })).toBe(
                  LINK_TARGET_FRESH,
                );
                expect(recovered.stdout).not.toContain(GROVE);
                expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
                expect(asStableOutput(recovered.stdout)).toMatchSnapshot();
              } finally {
                fs.rmSync(baseDir, { recursive: true, force: true });
              }
            },
          );
        },
      );
    },
  );

  given(
    '[case12] the rebase stops mid-replay with no conflict (an untracked file blocks a pick)',
    () => {
      when('[t0] begin stops, then continue once the block is cleared', () => {
        then(
          'the store stays through the stop, and continue puts both paths back',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: false });
            try {
              driftAmbient({ workDir });

              // once rebase checks out main, an untracked feature.txt blocks the pick that adds it
              setGitHook({
                workDir,
                hook: 'post-checkout',
                body: [
                  '[ "$3" = "1" ] || exit 0',
                  'echo "untracked blocker" > feature.txt',
                  'rm -f "$0"',
                ].join('\n'),
              });
              const stop = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

              expect(stop.status).toBe(1);
              expect(stop.stdout).toContain('stopped (no conflict)');
              expect(stop.stdout).not.toContain('├─ conflict');
              expect(
                fs.existsSync(path.join(workDir, '.git', 'rebase-merge')),
              ).toBe(true);
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(true);
              expect(asStableOutput(stop.stdout)).toMatchSnapshot();

              fs.unlinkSync(path.join(workDir, 'feature.txt'));
              const done = runRebase({ workDir, args: ['continue'] });

              expect(done.status).toBe(0);
              expect(asStableOutput(done.stdout)).toMatchSnapshot();
              expect(readLinkTarget({ workDir, file: GROVE })).toBe(
                LINK_TARGET_ABSENT,
              );
              expect(readFile({ workDir, file: SETTINGS })).toBe(
                '{ "hooks": "v2-regenerated" }\n',
              );
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
              expect(
                git({
                  cwd: workDir,
                  args: ['diff', '--name-only', 'origin/main', 'HEAD'],
                }),
              ).toBe('feature.txt');
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      });

      when('[t1] continue before the block is cleared', () => {
        then(
          'the rebase stays in progress, and the held paths stay aside and are named',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: false });
            try {
              driftAmbient({ workDir });
              setGitHook({
                workDir,
                hook: 'post-checkout',
                body: [
                  '[ "$3" = "1" ] || exit 0',
                  'echo "untracked blocker" > feature.txt',
                  'rm -f "$0"',
                ].join('\n'),
              });
              runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

              // .note = the status line over git's refusal is fulcrum F11's, left to its own pr
              const early = runRebase({ workDir, args: ['continue'] });

              expect(early.stdout).toContain('status: in progress');
              expect(early.stdout).toContain(
                'held aside until continue or abort puts them back',
              );
              expect(early.stdout).toContain(SETTINGS);
              expect(
                fs.existsSync(path.join(workDir, '.git', 'rebase-merge')),
              ).toBe(true);
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(true);
              expect(asStableOutput(early.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      });
    },
  );

  given(
    '[case13] a concurrent run claims the store while begin fetches',
    () => {
      when('[t0] begin --mode apply --unstaged ignore', () => {
        then(
          'begin refuses, exit 2, touches no path; abort then clears the unfilled store',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: false });
            try {
              driftAmbient({ workDir });

              // make origin/main stale, so begin's fetch moves it and fires the hook
              const mainInit = git({
                cwd: workDir,
                args: ['rev-list', '--max-parents=0', 'origin/main'],
              });
              git({
                cwd: workDir,
                args: ['update-ref', 'refs/remotes/origin/main', mainInit],
              });
              setGitHook({
                workDir,
                hook: 'reference-transaction',
                body: 'mkdir -p "$(git rev-parse --absolute-git-dir)/git.branch.rebase.aside"',
              });
              const headBefore = git({
                cwd: workDir,
                args: ['rev-parse', 'HEAD'],
              });
              const result = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

              expect(result.status).toBe(2);
              expect(result.stdout).toContain(
                '✋ ConstraintError: another run holds paths aside in this worktree',
              );
              expect(result.stderr).toContain('ConstraintError');
              expect(git({ cwd: workDir, args: ['rev-parse', 'HEAD'] })).toBe(
                headBefore,
              );
              expect(readLinkTarget({ workDir, file: GROVE })).toBe(
                LINK_TARGET_ABSENT,
              );
              expect(readFile({ workDir, file: SETTINGS })).toBe(
                '{ "hooks": "v2-regenerated" }\n',
              );
              expect(asStableOutput(result.stdout)).toMatchSnapshot();

              // the concurrent claim died unfilled: abort clears it, no path touched
              fs.unlinkSync(
                path.join(workDir, '.git', 'hooks', 'reference-transaction'),
              );
              const cleared = runRebase({ workDir, args: ['abort'] });
              expect(cleared.status).toBe(0);
              expect(cleared.stdout).toContain(
                'an empty set-aside store cleared',
              );
              expect(asStableOutput(cleared.stdout)).toMatchSnapshot();
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
              expect(readFile({ workDir, file: SETTINGS })).toBe(
                '{ "hooks": "v2-regenerated" }\n',
              );
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      });
    },
  );

  given('[case14] a clean tree (no unstaged edits)', () => {
    ['include', 'ignore'].forEach((flag, index) =>
      when(`[t${index}] begin --mode apply --unstaged ${flag}`, () => {
        then(
          'the flag is a no-op: the rebase completes as with no flag',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: false });
            try {
              const result = runRebase({
                workDir,
                args: ['begin', '--mode', 'apply', '--unstaged', flag],
              });
              expect(result.status).toBe(0);
              expect(result.stdout).toContain('status: clean');
              expect(result.stdout).not.toContain('unstaged (set aside)');
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
              expect(
                git({
                  cwd: workDir,
                  args: ['merge-base', '--is-ancestor', 'origin/main', 'HEAD'],
                }),
              ).toBe('');
              expect(asStableOutput(result.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      }),
    );
  });

  given(
    '[case15] two worktrees of one repo, one with paths held aside mid-conflict',
    () => {
      when(
        '[t0] the other worktree runs begin --mode apply --unstaged ignore',
        () => {
          then(
            'it rebases cleanly with its own store; the first worktree store is untouched',
            () => {
              const { workDir, baseDir } = setupScenario({ conflict: true });
              try {
                // the first worktree stops on a conflict, paths held aside
                driftAmbient({ workDir });
                runRebase({ workDir, args: BEGIN_APPLY_IGNORE });
                const firstStore = getStorePath({ workDir });
                const firstPaths = fs.readFileSync(
                  path.join(firstStore, 'paths'),
                  'utf-8',
                );

                // a second worktree on a branch with no conflict commit
                const wtDir = path.join(baseDir, 'wt');
                git({
                  cwd: workDir,
                  args: [
                    'worktree',
                    'add',
                    '-b',
                    'feat/wt',
                    wtDir,
                    'feat/turtle~1',
                  ],
                });
                setMeterGrant({ workDir: wtDir });
                driftAmbient({ workDir: wtDir });
                const result = runRebase({
                  workDir: wtDir,
                  args: BEGIN_APPLY_IGNORE,
                });

                // the second worktree was not refused by the first one's store
                expect(result.status).toBe(0);
                expect(result.stdout).toContain('set aside, put back');
                expect(asStableOutput(result.stdout)).toMatchSnapshot();
                expect(readLinkTarget({ workDir: wtDir, file: GROVE })).toBe(
                  LINK_TARGET_ABSENT,
                );
                expect(readFile({ workDir: wtDir, file: SETTINGS })).toBe(
                  '{ "hooks": "v2-regenerated" }\n',
                );

                // its store lived under its own git dir, now gone
                const wtGitDir = git({
                  cwd: wtDir,
                  args: ['rev-parse', '--absolute-git-dir'],
                });
                expect(wtGitDir).toContain(path.join('.git', 'worktrees'));
                expect(
                  fs.existsSync(path.join(wtGitDir, 'git.branch.rebase.aside')),
                ).toBe(false);

                // the first worktree's store is whole
                expect(
                  fs.readFileSync(path.join(firstStore, 'paths'), 'utf-8'),
                ).toBe(firstPaths);
                expect(
                  fs.existsSync(path.join(firstStore, 'tree', SETTINGS)),
                ).toBe(true);
              } finally {
                fs.rmSync(baseDir, { recursive: true, force: true });
              }
            },
          );
        },
      );
    },
  );

  given('[case16] a branch already up to date, with ambient drift', () => {
    when('[t0] begin --mode apply --unstaged ignore', () => {
      then('it exits before any set-aside; the tree is untouched', () => {
        const { workDir, baseDir } = setupScenario({ conflict: false });
        try {
          git({ cwd: workDir, args: ['rebase', 'origin/main'] });
          driftAmbient({ workDir });
          const result = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

          expect(result.status).toBe(0);
          expect(result.stdout).toContain('already up to date');
          expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
          expect(readLinkTarget({ workDir, file: GROVE })).toBe(
            LINK_TARGET_ABSENT,
          );
          expect(readFile({ workDir, file: SETTINGS })).toBe(
            '{ "hooks": "v2-regenerated" }\n',
          );
          expect(asStableOutput(result.stdout)).toMatchSnapshot();
        } finally {
          fs.rmSync(baseDir, { recursive: true, force: true });
        }
      });
    });
  });

  given(
    '[case17] a held path is edited again, and continue stops on a second conflict',
    () => {
      when('[t0] continue, then continue again once settled', () => {
        then(
          'the second stop names the superseded edit; the last continue puts both paths back',
          () => {
            const { workDir, baseDir } = setupScenario({
              conflict: true,
              conflictTwice: true,
            });
            try {
              driftAmbient({ workDir });
              const first = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });
              expect(first.status).toBe(1);

              // the held path regenerates; the first conflict is settled
              fs.writeFileSync(
                path.join(workDir, SETTINGS),
                '{ "hooks": "v3-fresh" }\n',
              );
              fs.writeFileSync(path.join(workDir, 'conflict.txt'), 'settled\n');
              git({ cwd: workDir, args: ['add', 'conflict.txt'] });
              const second = runRebase({ workDir, args: ['continue'] });

              expect(second.status).toBe(1);
              expect(second.stdout).toContain('conflict2.txt');
              expect(second.stdout).toContain(
                'a fresh edit at these held paths was superseded by the held copy',
              );
              expect(second.stdout).toContain(SETTINGS);
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(true);
              expect(asStableOutput(second.stdout)).toMatchSnapshot();

              // the superseded edit is kept, not lost
              expect(
                fs.readFileSync(
                  path.join(
                    workDir,
                    '.git',
                    'git.branch.rebase.superseded',
                    SETTINGS,
                  ),
                  'utf-8',
                ),
              ).toBe('{ "hooks": "v3-fresh" }\n');

              fs.writeFileSync(
                path.join(workDir, 'conflict2.txt'),
                'settled\n',
              );
              git({ cwd: workDir, args: ['add', 'conflict2.txt'] });
              const done = runRebase({ workDir, args: ['continue'] });

              expect(done.status).toBe(0);
              expect(asStableOutput(done.stdout)).toMatchSnapshot();
              expect(readFile({ workDir, file: SETTINGS })).toBe(
                '{ "hooks": "v2-regenerated" }\n',
              );
              expect(readLinkTarget({ workDir, file: GROVE })).toBe(
                LINK_TARGET_ABSENT,
              );
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      });
    },
  );

  given(
    '[case18] the rebase fails to start for a cause other than a file in the way (a pre-rebase hook refuses)',
    () => {
      when('[t0] begin --mode apply --unstaged ignore', () => {
        then(
          'it puts the held paths back at once, deletes the store, and fails as a malfunction (exit 1)',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: false });
            try {
              driftAmbient({ workDir });
              setGitHook({ workDir, hook: 'pre-rebase', body: 'exit 1' });
              const result = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

              expect(result.status).toBe(1);
              expect(result.stdout).toContain(
                '💥 MalfunctionError: rebase failed to start',
              );
              expect(result.stdout).not.toContain('ConstraintError');
              expect(result.stderr).toContain('MalfunctionError');
              expect(result.stdout).toContain('set aside, put back');
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
              expect(readLinkTarget({ workDir, file: GROVE })).toBe(
                LINK_TARGET_ABSENT,
              );
              expect(readFile({ workDir, file: SETTINGS })).toBe(
                '{ "hooks": "v2-regenerated" }\n',
              );
              expect(asStableOutput(result.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      });
    },
  );

  given(
    '[case19] a set-aside step fails (another git process holds the index lock)',
    () => {
      when(
        '[t0] begin --mode apply --unstaged ignore, then abort once the lock is gone',
        () => {
          then(
            'begin fails loud, exit 1, store kept, tree untouched; abort puts back and clears the store',
            () => {
              const { workDir, baseDir } = setupScenario({ conflict: false });
              try {
                driftAmbient({ workDir });

                // make origin/main stale, so begin's fetch moves it and fires the hook
                const mainInit = git({
                  cwd: workDir,
                  args: ['rev-list', '--max-parents=0', 'origin/main'],
                });
                git({
                  cwd: workDir,
                  args: ['update-ref', 'refs/remotes/origin/main', mainInit],
                });
                setGitHook({
                  workDir,
                  hook: 'reference-transaction',
                  body: 'touch "$(git rev-parse --absolute-git-dir)/index.lock"',
                });
                const headBefore = git({
                  cwd: workDir,
                  args: ['rev-parse', 'HEAD'],
                });
                const result = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

                expect(result.status).toBe(1);
                expect(result.stdout).toContain(
                  '💥 MalfunctionError: cannot reset the paths set aside',
                );
                expect(result.stdout).toContain('index.lock');
                expect(result.stderr).toContain('MalfunctionError');
                expect(fs.existsSync(getStorePath({ workDir }))).toBe(true);
                expect(git({ cwd: workDir, args: ['rev-parse', 'HEAD'] })).toBe(
                  headBefore,
                );
                expect(readLinkTarget({ workDir, file: GROVE })).toBe(
                  LINK_TARGET_ABSENT,
                );
                expect(readFile({ workDir, file: SETTINGS })).toBe(
                  '{ "hooks": "v2-regenerated" }\n',
                );
                expect(asStableOutput(result.stdout)).toMatchSnapshot();

                // the other git process ends; abort puts back what the store holds
                fs.unlinkSync(
                  path.join(workDir, '.git', 'hooks', 'reference-transaction'),
                );
                fs.unlinkSync(path.join(workDir, '.git', 'index.lock'));
                const recovered = runRebase({ workDir, args: ['abort'] });

                expect(recovered.status).toBe(0);
                expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
                expect(readLinkTarget({ workDir, file: GROVE })).toBe(
                  LINK_TARGET_ABSENT,
                );
                expect(readFile({ workDir, file: SETTINGS })).toBe(
                  '{ "hooks": "v2-regenerated" }\n',
                );
                expect(asStableOutput(recovered.stdout)).toMatchSnapshot();
              } finally {
                fs.rmSync(baseDir, { recursive: true, force: true });
              }
            },
          );
        },
      );
    },
  );

  given(
    '[case20] an empty store remains (a run was killed after its claim, before its first write)',
    () => {
      when('[t0] begin, continue, then abort', () => {
        then(
          'begin and continue refuse, exit 2, and say the store is empty; abort clears it',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: false });
            try {
              driftAmbient({ workDir });
              fs.mkdirSync(getStorePath({ workDir }));

              const begin = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });
              expect(begin.status).toBe(2);
              expect(begin.stdout).toContain(
                '✋ ConstraintError: an empty set-aside store remains from a prior run',
              );
              expect(begin.stderr).toContain('ConstraintError');
              expect(asStableOutput(begin.stdout)).toMatchSnapshot();

              const cont = runRebase({ workDir, args: ['continue'] });
              expect(cont.status).toBe(2);
              expect(cont.stdout).toContain(
                'no rebase in progress, but an empty set-aside store remains',
              );
              expect(asStableOutput(cont.stdout)).toMatchSnapshot();

              const cleared = runRebase({ workDir, args: ['abort'] });
              expect(cleared.status).toBe(0);
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
              expect(readFile({ workDir, file: SETTINGS })).toBe(
                '{ "hooks": "v2-regenerated" }\n',
              );
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      });
    },
  );

  given(
    '[case21] a put-back fails at begin after a clean rebase (a held copy moved off)',
    () => {
      when(
        '[t0] begin --mode apply --unstaged ignore, then abort once the copy is restored',
        () => {
          then(
            'begin fails loud, exit 1, store kept; abort puts back what is left',
            () => {
              const { workDir, baseDir } = setupScenario({ conflict: false });
              try {
                driftAmbient({ workDir });

                // once the rebase lands, the held copy of one path is moved off
                setGitHook({
                  workDir,
                  hook: 'post-rewrite',
                  body: `mv "$(git rev-parse --absolute-git-dir)/git.branch.rebase.aside/tree/${SETTINGS}" "$(git rev-parse --absolute-git-dir)/${SETTINGS}.moved"`,
                });
                const failed = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

                expect(failed.status).toBe(1);
                expect(failed.stdout).toContain(
                  '💥 MalfunctionError: put-back failed for these paths',
                );
                expect(failed.stdout).toContain(SETTINGS);
                expect(failed.stderr).toContain('MalfunctionError');
                expect(fs.existsSync(getStorePath({ workDir }))).toBe(true);
                expect(asStableOutput(failed.stdout)).toMatchSnapshot();

                // restore the copy, then recover
                fs.unlinkSync(
                  path.join(workDir, '.git', 'hooks', 'post-rewrite'),
                );
                fs.renameSync(
                  path.join(workDir, '.git', `${SETTINGS}.moved`),
                  path.join(getStorePath({ workDir }), 'tree', SETTINGS),
                );
                const recovered = runRebase({ workDir, args: ['abort'] });

                expect(recovered.status).toBe(0);
                expect(readFile({ workDir, file: SETTINGS })).toBe(
                  '{ "hooks": "v2-regenerated" }\n',
                );
                expect(readLinkTarget({ workDir, file: GROVE })).toBe(
                  LINK_TARGET_ABSENT,
                );
                expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
              } finally {
                fs.rmSync(baseDir, { recursive: true, force: true });
              }
            },
          );
        },
      );
    },
  );

  given(
    '[case22] a put-back fails at abort mid-rebase (a held copy moved off)',
    () => {
      when('[t0] abort, then abort again once the copy is restored', () => {
        then(
          'the first abort rewinds the branch but fails loud, exit 1, store kept; the second puts back what is left',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: true });
            try {
              driftAmbient({ workDir });
              const headBefore = git({
                cwd: workDir,
                args: ['rev-parse', 'HEAD'],
              });
              runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

              const heldCopy = path.join(
                getStorePath({ workDir }),
                'tree',
                SETTINGS,
              );
              fs.renameSync(heldCopy, `${heldCopy}.moved`);
              const failed = runRebase({ workDir, args: ['abort'] });

              expect(failed.status).toBe(1);
              expect(failed.stdout).toContain(
                '💥 MalfunctionError: put-back failed for these paths',
              );
              expect(failed.stderr).toContain('MalfunctionError');
              expect(git({ cwd: workDir, args: ['rev-parse', 'HEAD'] })).toBe(
                headBefore,
              );
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(true);
              expect(asStableOutput(failed.stdout)).toMatchSnapshot();

              fs.renameSync(`${heldCopy}.moved`, heldCopy);
              const recovered = runRebase({ workDir, args: ['abort'] });

              expect(recovered.status).toBe(0);
              expect(readFile({ workDir, file: SETTINGS })).toBe(
                '{ "hooks": "v2-regenerated" }\n',
              );
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      });
    },
  );

  given(
    '[case23] continue leaves a fresh unstaged edit mid-rebase (a post-commit hook writes one)',
    () => {
      when('[t0] continue, with a held path also edited again', () => {
        then(
          'continue refuses, exit 2, names the edit and the superseded held path',
          () => {
            const { workDir, baseDir } = setupScenario({
              conflict: true,
              conflictTwice: true,
            });
            try {
              driftAmbient({ workDir });
              runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

              // the next commit writes a tracked file that the pick after it edits
              setGitHook({
                workDir,
                hook: 'post-commit',
                body: ['echo "hook edit" > conflict2.txt', 'rm -f "$0"'].join(
                  '\n',
                ),
              });
              fs.writeFileSync(
                path.join(workDir, SETTINGS),
                '{ "hooks": "v3-fresh" }\n',
              );
              fs.writeFileSync(path.join(workDir, 'conflict.txt'), 'settled\n');
              git({ cwd: workDir, args: ['add', 'conflict.txt'] });
              const result = runRebase({ workDir, args: ['continue'] });

              expect(result.status).toBe(2);
              expect(result.stdout).toContain(
                '✋ ConstraintError: unstaged changes block continue',
              );
              expect(result.stdout).toContain('conflict2.txt');
              expect(result.stdout).toContain(
                'a fresh edit at these held paths was superseded by the held copy',
              );
              expect(result.stderr).toContain('ConstraintError');
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(true);
              expect(asStableOutput(result.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      });
    },
  );

  given(
    '[case24] a held path is in conflict, settled with take, then continue (the clone journey)',
    () => {
      when(
        "[t0] begin stops on package.json, take main's side (--whos ours in a rebase), continue",
        () => {
          then(
            'continue puts the held copy back over the taken version and flags main',
            () => {
              const { workDir, baseDir } = setupScenario({
                conflict: false,
                mainChangesPackageJson: true,
                featureChangesPackageJson: true,
              });
              try {
                fs.writeFileSync(
                  path.join(workDir, 'package.json'),
                  '{ "version": "1.0.1-local" }\n',
                );
                const stop = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });
                expect(stop.status).toBe(1);
                expect(stop.stdout).toContain('package.json');
                expect(asStableOutput(stop.stdout)).toMatchSnapshot();

                const take = runRebase({
                  workDir,
                  args: ['take', '--whos', 'ours', 'package.json'],
                });
                expect(take.status).toBe(0);
                const done = runRebase({ workDir, args: ['continue'] });

                expect(done.status).toBe(0);
                expect(readFile({ workDir, file: 'package.json' })).toBe(
                  '{ "version": "1.0.1-local" }\n',
                );
                expect(done.stdout).toContain(
                  "⚠️ main also changed these paths; your held copy reverts main's change there",
                );
                expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
                expect(asStableOutput(done.stdout)).toMatchSnapshot();
              } finally {
                fs.rmSync(baseDir, { recursive: true, force: true });
              }
            },
          );
        },
      );
    },
  );

  given('[case25] an unstaged edit at a non-ascii path', () => {
    when('[t0] begin --mode apply --unstaged ignore', () => {
      then('the path is set aside and reads back byte for byte', () => {
        const { workDir, baseDir } = setupScenario({ conflict: false });
        try {
          commitFile({
            cwd: workDir,
            file: 'café.txt',
            content: 'reef café\n',
            message: 'feat(reef): add café notes',
          });
          fs.writeFileSync(
            path.join(workDir, 'café.txt'),
            'reef café, edited\n',
          );
          const result = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

          expect(result.status).toBe(0);
          expect(result.stdout).toContain('café.txt');
          expect(readFile({ workDir, file: 'café.txt' })).toBe(
            'reef café, edited\n',
          );
          expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
          expect(asStableOutput(result.stdout)).toMatchSnapshot();
        } finally {
          fs.rmSync(baseDir, { recursive: true, force: true });
        }
      });
    });
  });

  given(
    '[case26] an edit lands while begin fetches (after the first unstaged read)',
    () => {
      when('[t0] begin --mode apply --unstaged ignore', () => {
        then(
          'the late edit is set aside too, the rebase completes, and it reads back',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: false });
            try {
              driftAmbient({ workDir });

              // make origin/main stale, so begin's fetch moves it and fires the hook
              const mainInit = git({
                cwd: workDir,
                args: ['rev-list', '--max-parents=0', 'origin/main'],
              });
              git({
                cwd: workDir,
                args: ['update-ref', 'refs/remotes/origin/main', mainInit],
              });
              setGitHook({
                workDir,
                hook: 'reference-transaction',
                body: [
                  'echo "# reef, late edit" > README.md',
                  'rm -f "$0"',
                ].join('\n'),
              });
              const result = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

              expect(result.status).toBe(0);
              expect(result.stdout).toContain('README.md');
              expect(readFile({ workDir, file: 'README.md' })).toBe(
                '# reef, late edit\n',
              );
              expect(readFile({ workDir, file: SETTINGS })).toBe(
                '{ "hooks": "v2-regenerated" }\n',
              );
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
              expect(asStableOutput(result.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      });
    },
  );

  given(
    '[case27] a held path is edited after a prior run died, then abort recovers',
    () => {
      when('[t0] abort, with no rebase in progress', () => {
        then(
          'the held copy is put back, and the later edit is kept and named, not lost',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: true });
            try {
              driftAmbient({ workDir });
              runRebase({ workDir, args: BEGIN_APPLY_IGNORE });
              git({ cwd: workDir, args: ['rebase', '--abort'] }); // the skill never ran its put-back

              // the clone edits a held path before it recovers
              fs.writeFileSync(
                path.join(workDir, SETTINGS),
                '{ "hooks": "v3-later" }\n',
              );
              const abort = runRebase({ workDir, args: ['abort'] });

              expect(abort.status).toBe(0);
              expect(readFile({ workDir, file: SETTINGS })).toBe(
                '{ "hooks": "v2-regenerated" }\n',
              );
              expect(
                readFile({ workDir, file: `.git/${KEPT_DIR}/${SETTINGS}` }),
              ).toBe('{ "hooks": "v3-later" }\n');
              expect(abort.stdout).toContain(
                'a fresh edit at these held paths was superseded by the held copy',
              );
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
              expect(asStableOutput(abort.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      });
    },
  );

  given('[case28] a hook edits a held path while begin rebases', () => {
    when('[t0] begin --mode apply --unstaged ignore', () => {
      then(
        'the held copy is put back, and the hook edit is kept and named, not lost',
        () => {
          const { workDir, baseDir } = setupScenario({ conflict: false });
          try {
            driftAmbient({ workDir });
            setGitHook({
              workDir,
              hook: 'post-rewrite',
              body: `echo '{ "hooks": "v3-hook" }' > "${SETTINGS}"`,
            });
            const result = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

            expect(result.status).toBe(0);
            expect(readFile({ workDir, file: SETTINGS })).toBe(
              '{ "hooks": "v2-regenerated" }\n',
            );
            expect(
              readFile({ workDir, file: `.git/${KEPT_DIR}/${SETTINGS}` }),
            ).toBe('{ "hooks": "v3-hook" }\n');
            expect(result.stdout).toContain(
              'a fresh edit at these held paths was superseded by the held copy',
            );
            expect(readLinkTarget({ workDir, file: GROVE })).toBe(
              LINK_TARGET_ABSENT,
            );
            expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
            expect(asStableOutput(result.stdout)).toMatchSnapshot();
          } finally {
            fs.rmSync(baseDir, { recursive: true, force: true });
          }
        },
      );
    });
  });

  given('[case29] main deletes a path the clone holds aside', () => {
    when('[t0] begin --mode apply --unstaged ignore', () => {
      then(
        'the edit reads back untracked, flagged, and the hint names a paved delete, not a checkout from HEAD',
        () => {
          const { workDir, baseDir } = setupScenario({
            conflict: false,
            mainDeletesReadme: true,
          });
          try {
            fs.writeFileSync(
              path.join(workDir, 'README.md'),
              '# reef, held edit\n',
            );
            const result = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

            expect(result.status).toBe(0);
            expect(readFile({ workDir, file: 'README.md' })).toBe(
              '# reef, held edit\n',
            );
            expect(result.stdout).toContain('main also changed these paths');
            expect(result.stdout).toContain('rhx rmsafe --literal README.md');
            expect(result.stdout).not.toContain(
              'git checkout HEAD -- README.md',
            );
            expect(asStableOutput(result.stdout)).toMatchSnapshot();
          } finally {
            fs.rmSync(baseDir, { recursive: true, force: true });
          }
        },
      );
    });
  });

  given(
    '[case30] an unstaged typechange each way (a link now a file, a file now a link)',
    () => {
      when('[t0] begin --mode apply --unstaged ignore', () => {
        then('each path reads back as the type it held', () => {
          const { workDir, baseDir } = setupScenario({ conflict: false });
          try {
            fs.unlinkSync(path.join(workDir, GROVE));
            fs.writeFileSync(
              path.join(workDir, GROVE),
              '{ "grove": "file" }\n',
            );
            fs.unlinkSync(path.join(workDir, 'README.md'));
            fs.symlinkSync(LINK_TARGET_ABSENT, path.join(workDir, 'README.md'));
            const result = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

            expect(result.status).toBe(0);
            expect(isLink({ workDir, file: GROVE })).toBe(false);
            expect(readFile({ workDir, file: GROVE })).toBe(
              '{ "grove": "file" }\n',
            );
            expect(isLink({ workDir, file: 'README.md' })).toBe(true);
            expect(readLinkTarget({ workDir, file: 'README.md' })).toBe(
              LINK_TARGET_ABSENT,
            );
            expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
            expect(asStableOutput(result.stdout)).toMatchSnapshot();
          } finally {
            fs.rmSync(baseDir, { recursive: true, force: true });
          }
        });
      });
    },
  );

  given(
    '[case32] a held path regenerates to the same bytes as its held copy while the conflict waits',
    () => {
      when('[t0] the conflict is settled, then continue', () => {
        then(
          'the regeneration is no edit: not reported as superseded, and naught is kept',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: true });
            try {
              driftAmbient({ workDir });
              runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

              // a session hook regenerates the ambient file to the bytes it held
              fs.writeFileSync(
                path.join(workDir, SETTINGS),
                '{ "hooks": "v2-regenerated" }\n',
              );
              fs.writeFileSync(path.join(workDir, 'conflict.txt'), 'settled\n');
              git({ cwd: workDir, args: ['add', 'conflict.txt'] });
              const done = runRebase({ workDir, args: ['continue'] });

              expect(done.status).toBe(0);
              expect(done.stdout).not.toContain('superseded');
              expect(readFile({ workDir, file: SETTINGS })).toBe(
                '{ "hooks": "v2-regenerated" }\n',
              );
              expect(
                fs.existsSync(path.join(workDir, '.git', KEPT_DIR, SETTINGS)),
              ).toBe(false);
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
              expect(asStableOutput(done.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      });
    },
  );

  given(
    '[case31] an unstaged edit at the nested ambient path shape (a dir name with =)',
    () => {
      when('[t0] begin --mode apply --unstaged ignore', () => {
        then(
          'the nested path is set aside and reads back byte for byte',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: false });
            try {
              const nested = `.agent/.actors/actor.via.repo=ambient/brain/.claude/${SETTINGS}`;
              fs.mkdirSync(path.dirname(path.join(workDir, nested)), {
                recursive: true,
              });
              commitFile({
                cwd: workDir,
                file: nested,
                content: '{ "hooks": "v1" }\n',
                message: 'feat(reef): add nested ambient file',
              });
              fs.writeFileSync(
                path.join(workDir, nested),
                '{ "hooks": "v2-nested" }\n',
              );
              const result = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

              expect(result.status).toBe(0);
              expect(result.stdout).toContain(nested);
              expect(readFile({ workDir, file: nested })).toBe(
                '{ "hooks": "v2-nested" }\n',
              );
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
              expect(asStableOutput(result.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      });
    },
  );

  given(
    '[case33] a clean tree (no store) meets the stop and start-failure renders',
    () => {
      when('[t0] the rebase stops mid-replay with no conflict', () => {
        then(
          'the stop names continue alone as the next step, with no unstaged branch',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: false });
            try {
              setGitHook({
                workDir,
                hook: 'post-checkout',
                body: [
                  '[ "$3" = "1" ] || exit 0',
                  'echo "untracked blocker" > feature.txt',
                  'rm -f "$0"',
                ].join('\n'),
              });
              const stop = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

              expect(stop.status).toBe(1);
              expect(stop.stdout).toContain('stopped (no conflict)');
              expect(stop.stdout).toContain('rhx git.branch.rebase continue');
              expect(stop.stdout).not.toContain('unstaged (set aside)');
              expect(stop.stdout).not.toContain('rhx git.branch.rebase abort');
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
              expect(asStableOutput(stop.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      });

      when('[t1] a local file sits where main writes one', () => {
        then(
          'it refuses as a constraint (exit 2), with no unstaged branch',
          () => {
            const { workDir, baseDir } = setupScenario({
              conflict: false,
              mainAddsCollideFile: true,
            });
            try {
              fs.writeFileSync(
                path.join(workDir, 'collide.txt'),
                'local untracked\n',
              );
              const result = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

              expect(result.status).toBe(2);
              expect(result.stdout).toContain(
                '✋ ConstraintError: rebase blocked: a local file sits where main writes one',
              );
              expect(result.stdout).not.toContain('unstaged (set aside)');
              expect(result.stderr).toContain('ConstraintError');
              expect(asStableOutput(result.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      });

      when('[t2] a pre-rebase hook refuses', () => {
        then(
          'it fails as a malfunction (exit 1), with no unstaged branch',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: false });
            try {
              setGitHook({ workDir, hook: 'pre-rebase', body: 'exit 1' });
              const result = runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

              expect(result.status).toBe(1);
              expect(result.stdout).toContain(
                '💥 MalfunctionError: rebase failed to start',
              );
              expect(result.stdout).not.toContain('unstaged (set aside)');
              expect(result.stderr).toContain('MalfunctionError');
              expect(asStableOutput(result.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      });
    },
  );

  given(
    '[case34] git cannot abort while paths are held aside (another git process holds the index lock)',
    () => {
      when('[t0] abort, then abort again once the lock is gone', () => {
        then(
          'the first abort fails loud, exit 1, and names the held paths and the kept store; the second puts them back',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: true });
            try {
              driftAmbient({ workDir });
              runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

              // another git process holds the index lock while the clone aborts
              const lockPath = path.join(workDir, '.git', 'index.lock');
              fs.writeFileSync(lockPath, '');
              const failed = runRebase({ workDir, args: ['abort'] });

              expect(failed.status).toBe(1);
              expect(failed.stdout).toContain(
                '💥 MalfunctionError: abort failed',
              );
              expect(failed.stdout).toContain('still held aside');
              expect(failed.stdout).toContain(SETTINGS);
              expect(failed.stdout).toContain('store kept: ');
              expect(failed.stderr).toContain('MalfunctionError');
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(true);
              expect(asStableOutput(failed.stdout)).toMatchSnapshot();

              // the lock clears, and abort runs again
              fs.unlinkSync(lockPath);
              const recovered = runRebase({ workDir, args: ['abort'] });

              expect(recovered.status).toBe(0);
              expect(readLinkTarget({ workDir, file: GROVE })).toBe(
                LINK_TARGET_ABSENT,
              );
              expect(readFile({ workDir, file: SETTINGS })).toBe(
                '{ "hooks": "v2-regenerated" }\n',
              );
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
              expect(asStableOutput(recovered.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      });
    },
  );

  given(
    '[case35] a fresh edit at a held path, then git cannot abort (its orig-head is unreadable)',
    () => {
      when('[t0] abort, then abort again once orig-head is restored', () => {
        then(
          'the first abort fails loud, exit 1, names the superseded edit beside the held paths; the second puts them back',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: true });
            try {
              driftAmbient({ workDir });
              runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

              // a session regenerates a held path while the conflict waits
              fs.writeFileSync(
                path.join(workDir, SETTINGS),
                '{ "hooks": "v3-fresh" }\n',
              );

              // git's own abort cannot read where to return to
              const origHeadPath = path.join(
                workDir,
                '.git',
                'rebase-merge',
                'orig-head',
              );
              const origHead = fs.readFileSync(origHeadPath, 'utf-8');
              fs.writeFileSync(origHeadPath, 'not-a-commit\n');
              const failed = runRebase({ workDir, args: ['abort'] });

              expect(failed.status).toBe(1);
              expect(failed.stdout).toContain(
                '💥 MalfunctionError: abort failed',
              );
              expect(failed.stdout).toContain('still held aside');
              expect(failed.stdout).toContain(
                'a fresh edit at these held paths was superseded by the held copy',
              );
              expect(
                readFile({ workDir, file: `.git/${KEPT_DIR}/${SETTINGS}` }),
              ).toBe('{ "hooks": "v3-fresh" }\n');
              expect(failed.stderr).toContain('MalfunctionError');
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(true);
              expect(asStableOutput(failed.stdout)).toMatchSnapshot();

              // orig-head is restored, and abort runs again
              fs.writeFileSync(origHeadPath, origHead);
              const recovered = runRebase({ workDir, args: ['abort'] });
              expect(recovered.status).toBe(0);
              expect(readFile({ workDir, file: SETTINGS })).toBe(
                '{ "hooks": "v2-regenerated" }\n',
              );
              expect(readLinkTarget({ workDir, file: GROVE })).toBe(
                LINK_TARGET_ABSENT,
              );
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(false);
              expect(asStableOutput(recovered.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      });
    },
  );

  given('[case36] a set-aside step fails mid-conflict, under continue', () => {
    when(
      '[t0] a fresh edit at a path not held cannot be set aside (a file sits where its store dir goes)',
      () => {
        then(
          'continue --unstaged ignore fails loud, exit 1, names the path, and keeps the store',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: true });
            try {
              // main holds a nested file, so the stopped tree holds it too
              git({ cwd: workDir, args: ['checkout', 'main'] });
              fs.mkdirSync(path.join(workDir, 'docs'));
              commitFile({
                cwd: workDir,
                file: 'docs/reef.md',
                content: '# reef docs\n',
                message: 'docs(reef): add docs',
              });
              git({ cwd: workDir, args: ['push', 'origin', 'main'] });
              git({ cwd: workDir, args: ['checkout', 'feat/turtle'] });
              driftAmbient({ workDir });
              runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

              // a fresh edit at a path not held, and a file where its store dir goes
              fs.writeFileSync(
                path.join(workDir, 'docs', 'reef.md'),
                '# reef docs, fresh\n',
              );
              fs.writeFileSync(
                path.join(getStorePath({ workDir }), 'tree', 'docs'),
                'blocker\n',
              );
              fs.writeFileSync(path.join(workDir, 'conflict.txt'), 'settled\n');
              git({ cwd: workDir, args: ['add', 'conflict.txt'] });
              const result = runRebase({
                workDir,
                args: ['continue', '--unstaged', 'ignore'],
              });

              expect(result.status).toBe(1);
              expect(result.stdout).toContain(
                '💥 MalfunctionError: cannot set aside docs/reef.md',
              );
              expect(result.stderr).toContain('MalfunctionError');
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(true);
              expect(readFile({ workDir, file: 'docs/reef.md' })).toBe(
                '# reef docs, fresh\n',
              );
              expect(asStableOutput(result.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      },
    );

    when(
      '[t1] a fresh edit at a held path cannot be kept (a file sits where the superseded dir goes)',
      () => {
        then(
          'continue fails loud, exit 1, names the path, and leaves the fresh edit in place',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: true });
            try {
              driftAmbient({ workDir });
              runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

              // a fresh edit at a held path, and a file where the kept dir goes
              fs.writeFileSync(
                path.join(workDir, SETTINGS),
                '{ "hooks": "v3-fresh" }\n',
              );
              fs.writeFileSync(
                path.join(workDir, '.git', KEPT_DIR),
                'blocker\n',
              );
              fs.writeFileSync(path.join(workDir, 'conflict.txt'), 'settled\n');
              git({ cwd: workDir, args: ['add', 'conflict.txt'] });
              const result = runRebase({ workDir, args: ['continue'] });

              expect(result.status).toBe(1);
              expect(result.stdout).toContain(
                `💥 MalfunctionError: cannot keep the fresh edit at ${SETTINGS}`,
              );
              expect(result.stderr).toContain('MalfunctionError');
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(true);
              expect(readFile({ workDir, file: SETTINGS })).toBe(
                '{ "hooks": "v3-fresh" }\n',
              );
              expect(asStableOutput(result.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      },
    );

    when(
      '[t2] the fresh edits at held paths cannot be reset (another git process holds the index lock)',
      () => {
        then(
          'continue fails loud, exit 1, keeps the fresh edit first, and keeps the store',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: true });
            try {
              driftAmbient({ workDir });
              runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

              // a fresh edit at a held path, while another git process holds the index lock
              fs.writeFileSync(
                path.join(workDir, SETTINGS),
                '{ "hooks": "v3-fresh" }\n',
              );
              fs.writeFileSync(path.join(workDir, 'conflict.txt'), 'settled\n');
              git({ cwd: workDir, args: ['add', 'conflict.txt'] });
              fs.writeFileSync(path.join(workDir, '.git', 'index.lock'), '');
              const result = runRebase({ workDir, args: ['continue'] });

              expect(result.status).toBe(1);
              expect(result.stdout).toContain(
                '💥 MalfunctionError: cannot reset the fresh edits at held paths',
              );
              expect(result.stdout).toContain('index.lock');
              expect(result.stderr).toContain('MalfunctionError');
              expect(
                readFile({ workDir, file: `.git/${KEPT_DIR}/${SETTINGS}` }),
              ).toBe('{ "hooks": "v3-fresh" }\n');
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(true);
              expect(asStableOutput(result.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      },
    );
  });

  given('[case37] a set-aside step fails mid-conflict, under abort', () => {
    when(
      '[t0] a fresh edit at a path not held cannot be set aside (a file sits where its store dir goes)',
      () => {
        then(
          'abort --unstaged ignore fails loud, exit 1, names the path, keeps the store, and git never aborts',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: true });
            try {
              // main holds a nested file, so the stopped tree holds it too
              git({ cwd: workDir, args: ['checkout', 'main'] });
              fs.mkdirSync(path.join(workDir, 'docs'));
              commitFile({
                cwd: workDir,
                file: 'docs/reef.md',
                content: '# reef docs\n',
                message: 'docs(reef): add docs',
              });
              git({ cwd: workDir, args: ['push', 'origin', 'main'] });
              git({ cwd: workDir, args: ['checkout', 'feat/turtle'] });
              driftAmbient({ workDir });
              runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

              // a fresh edit at a path not held, and a file where its store dir goes
              fs.writeFileSync(
                path.join(workDir, 'docs', 'reef.md'),
                '# reef docs, fresh\n',
              );
              fs.writeFileSync(
                path.join(getStorePath({ workDir }), 'tree', 'docs'),
                'blocker\n',
              );
              const result = runRebase({
                workDir,
                args: ['abort', '--unstaged', 'ignore'],
              });

              expect(result.status).toBe(1);
              expect(result.stdout).toContain(
                '💥 MalfunctionError: cannot set aside docs/reef.md',
              );
              expect(result.stderr).toContain('MalfunctionError');
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(true);
              expect(
                fs.existsSync(path.join(workDir, '.git', 'rebase-merge')),
              ).toBe(true);
              expect(readFile({ workDir, file: 'docs/reef.md' })).toBe(
                '# reef docs, fresh\n',
              );
              expect(asStableOutput(result.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      },
    );

    when(
      '[t1] a fresh edit at a held path cannot be kept (a file sits where the superseded dir goes)',
      () => {
        then(
          'abort fails loud, exit 1, names the path, leaves the fresh edit, and git never aborts',
          () => {
            const { workDir, baseDir } = setupScenario({ conflict: true });
            try {
              driftAmbient({ workDir });
              runRebase({ workDir, args: BEGIN_APPLY_IGNORE });

              // a fresh edit at a held path, and a file where the kept dir goes
              fs.writeFileSync(
                path.join(workDir, SETTINGS),
                '{ "hooks": "v3-fresh" }\n',
              );
              fs.writeFileSync(
                path.join(workDir, '.git', KEPT_DIR),
                'blocker\n',
              );
              const result = runRebase({ workDir, args: ['abort'] });

              expect(result.status).toBe(1);
              expect(result.stdout).toContain(
                `💥 MalfunctionError: cannot keep the fresh edit at ${SETTINGS}`,
              );
              expect(result.stderr).toContain('MalfunctionError');
              expect(fs.existsSync(getStorePath({ workDir }))).toBe(true);
              expect(
                fs.existsSync(path.join(workDir, '.git', 'rebase-merge')),
              ).toBe(true);
              expect(readFile({ workDir, file: SETTINGS })).toBe(
                '{ "hooks": "v3-fresh" }\n',
              );
              expect(asStableOutput(result.stdout)).toMatchSnapshot();
            } finally {
              fs.rmSync(baseDir, { recursive: true, force: true });
            }
          },
        );
      },
    );
  });
});
